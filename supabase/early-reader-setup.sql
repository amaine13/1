-- =============================================================================
-- Who's Driving Your Bus — Early Reader (application + admin + feedback)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- This replaces the previous reader-auth / manuscript direction.
-- If you already ran the OLD early-reader-setup.sql, see the "CLEANUP"
-- section at the bottom (manual, optional).
-- =============================================================================

-- Admin allow-list (Supabase Auth users who may manage applications)
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.early_readers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  reason text,
  agreement_accepted boolean not null default false,
  agreement_accepted_at timestamptz,
  book_updates_opt_in boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  approved_at timestamptz,
  declined_at timestamptz,
  access_sent boolean not null default false,
  access_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint early_readers_email_unique unique (email)
);

create index if not exists early_readers_status_idx on public.early_readers (status);
create index if not exists early_readers_created_idx on public.early_readers (created_at desc);
create index if not exists early_readers_email_lower_idx on public.early_readers (lower(email));

create table if not exists public.early_reader_feedback (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null unique references public.early_readers(id) on delete cascade,
  email text not null,
  resonated text,
  clarity text,
  keep_reading text,
  slow_sections text,
  true_or_moving text,
  additional_comments text,
  testimonial_permission boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists early_reader_feedback_email_idx
  on public.early_reader_feedback (lower(email));

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists early_readers_set_updated_at on public.early_readers;
create trigger early_readers_set_updated_at
  before update on public.early_readers
  for each row execute function public.set_updated_at();

drop trigger if exists early_reader_feedback_set_updated_at on public.early_reader_feedback;
create trigger early_reader_feedback_set_updated_at
  before update on public.early_reader_feedback
  for each row execute function public.set_updated_at();

-- Normalize email to lowercase on write
create or replace function public.normalize_early_reader_email()
returns trigger
language plpgsql
as $$
begin
  new.email = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists early_readers_normalize_email on public.early_readers;
create trigger early_readers_normalize_email
  before insert or update of email on public.early_readers
  for each row execute function public.normalize_early_reader_email();

drop trigger if exists early_reader_feedback_normalize_email on public.early_reader_feedback;
create trigger early_reader_feedback_normalize_email
  before insert or update of email on public.early_reader_feedback
  for each row execute function public.normalize_early_reader_email();

-- =============================================================================
-- Authorization helpers
-- =============================================================================

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a where a.id = auth.uid()
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated, anon;

-- Public feedback submit (SECURITY DEFINER — does not expose applicant list)
create or replace function public.submit_early_reader_feedback(
  p_email text,
  p_resonated text default null,
  p_clarity text default null,
  p_keep_reading text default null,
  p_slow_sections text default null,
  p_true_or_moving text default null,
  p_additional_comments text default null,
  p_testimonial_permission boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_reader public.early_readers%rowtype;
  v_feedback_id uuid;
begin
  if v_email is null or v_email = '' then
    return jsonb_build_object('ok', false, 'code', 'missing_email');
  end if;

  select * into v_reader
  from public.early_readers
  where lower(email) = v_email
    and status = 'approved'
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_approved');
  end if;

  insert into public.early_reader_feedback as f (
    reader_id,
    email,
    resonated,
    clarity,
    keep_reading,
    slow_sections,
    true_or_moving,
    additional_comments,
    testimonial_permission,
    submitted_at,
    updated_at
  ) values (
    v_reader.id,
    v_email,
    nullif(trim(p_resonated), ''),
    nullif(trim(p_clarity), ''),
    nullif(trim(p_keep_reading), ''),
    nullif(trim(p_slow_sections), ''),
    nullif(trim(p_true_or_moving), ''),
    nullif(trim(p_additional_comments), ''),
    coalesce(p_testimonial_permission, false),
    now(),
    now()
  )
  on conflict (reader_id) do update set
    email = excluded.email,
    resonated = excluded.resonated,
    clarity = excluded.clarity,
    keep_reading = excluded.keep_reading,
    slow_sections = excluded.slow_sections,
    true_or_moving = excluded.true_or_moving,
    additional_comments = excluded.additional_comments,
    testimonial_permission = excluded.testimonial_permission,
    updated_at = now()
  returning id into v_feedback_id;

  return jsonb_build_object('ok', true, 'feedback_id', v_feedback_id);
end;
$$;

revoke all on function public.submit_early_reader_feedback(
  text, text, text, text, text, text, text, boolean
) from public;
grant execute on function public.submit_early_reader_feedback(
  text, text, text, text, text, text, text, boolean
) to anon, authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.admin_users enable row level security;
alter table public.early_readers enable row level security;
alter table public.early_reader_feedback enable row level security;

-- admin_users: admins can see the allow-list (optional); no public access
drop policy if exists "Admins can view admin_users" on public.admin_users;
create policy "Admins can view admin_users"
  on public.admin_users for select
  to authenticated
  using (public.is_site_admin());

-- early_readers: anonymous INSERT only (application form)
drop policy if exists "Anyone can submit early reader request" on public.early_readers;
create policy "Anyone can submit early reader request"
  on public.early_readers for insert
  to anon, authenticated
  with check (
    agreement_accepted = true
    and agreement_accepted_at is not null
    and status = 'pending'
    and access_sent = false
    and approved_at is null
    and declined_at is null
    and access_sent_at is null
  );

drop policy if exists "Admins can select early readers" on public.early_readers;
create policy "Admins can select early readers"
  on public.early_readers for select
  to authenticated
  using (public.is_site_admin());

drop policy if exists "Admins can update early readers" on public.early_readers;
create policy "Admins can update early readers"
  on public.early_readers for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- early_reader_feedback: no direct public insert/select; use RPC
-- Admins can read all feedback
drop policy if exists "Admins can select feedback" on public.early_reader_feedback;
create policy "Admins can select feedback"
  on public.early_reader_feedback for select
  to authenticated
  using (public.is_site_admin());

-- No public SELECT / UPDATE / DELETE policies on early_readers or feedback

-- =============================================================================
-- FIRST ADMIN USER (run AFTER creating the Auth user in Dashboard)
-- =============================================================================
-- 1. Authentication → Users → Add user → create with email/password
-- 2. Copy that user's UUID
-- 3. Run (replace values):
--
-- insert into public.admin_users (id, email)
-- values ('PASTE-AUTH-USER-UUID-HERE', 'you@example.com')
-- on conflict (id) do update set email = excluded.email;
--
-- Auth URL config (admin only):
--   Site URL: https://whoisdrivingyourbus.com
--   Redirect URLs:
--     https://whoisdrivingyourbus.com/admin.html
--     http://127.0.0.1:*/admin.html   (optional local)

-- =============================================================================
-- CLEANUP of OLD unfinished Early Reader direction (OPTIONAL / MANUAL)
-- Only run if you previously executed the old early-reader-setup.sql and
-- those tables are empty / unused. Do NOT run if you have real data there.
-- =============================================================================
-- drop table if exists public.reader_progress cascade;
-- drop table if exists public.reader_feedback cascade;
-- drop table if exists public.reader_content cascade;
-- drop table if exists public.reader_profiles cascade;
-- drop function if exists public.is_accepted_early_reader();
