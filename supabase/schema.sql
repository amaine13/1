-- Early Readers: run this once in Supabase → SQL Editor → New query → Run.

create table if not exists public.readers (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  name text not null,
  email text not null,
  consent boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  source text not null default 'early-reader',
  feedback jsonb not null default '{}'::jsonb,
  feedback_updated_at timestamptz
);

create table if not exists public.chapters (
  id text primary key,
  number integer not null default 0,
  title text not null,
  html text not null,
  word_count integer
);

alter table public.readers enable row level security;
alter table public.chapters enable row level security;

drop policy if exists "readers_select_own" on public.readers;
create policy "readers_select_own"
  on public.readers for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "readers_insert_own" on public.readers;
create policy "readers_insert_own"
  on public.readers for insert
  to authenticated
  with check (
    auth.uid() = id
    and consent = true
    and source = 'early-reader'
  );

drop policy if exists "readers_update_own" on public.readers;
create policy "readers_update_own"
  on public.readers for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "chapters_read_sample" on public.chapters;
create policy "chapters_read_sample"
  on public.chapters for select
  to authenticated
  using (id in ('intro', '1', '2', '3'));
