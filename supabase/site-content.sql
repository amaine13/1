-- Editable text and photos for the public site.
-- Run once in the Supabase SQL Editor.
-- Uses the existing is_site_admin() function from early-reader-setup.sql.

create table if not exists public.site_content (
  key text primary key,
  kind text not null default 'text' check (kind in ('text', 'image')),
  value text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();

alter table public.site_content enable row level security;

drop policy if exists "Anyone can read site content" on public.site_content;
create policy "Anyone can read site content"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert site content" on public.site_content;
create policy "Admins can insert site content"
  on public.site_content for insert
  to authenticated
  with check (public.is_site_admin());

drop policy if exists "Admins can update site content" on public.site_content;
create policy "Admins can update site content"
  on public.site_content for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- Photo uploads. Create the bucket if it does not exist.
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view site images" on storage.objects;
create policy "Public can view site images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-images');

drop policy if exists "Admins can upload site images" on storage.objects;
create policy "Admins can upload site images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-images' and public.is_site_admin());

drop policy if exists "Admins can update site images" on storage.objects;
create policy "Admins can update site images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-images' and public.is_site_admin())
  with check (bucket_id = 'site-images' and public.is_site_admin());
