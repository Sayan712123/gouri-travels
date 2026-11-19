-- ============================================================================
-- Gouri Travels — one-shot Supabase setup
-- ============================================================================
-- Creates everything the site needs:
--   tables  : admins, enquiries, settings
--   helper  : is_admin()
--   RLS     : read/write policies for each table
--   storage : trip-photos bucket (public read, admin write)
--
-- Safe to run more than once — every statement is idempotent.
--
-- Run it either way:
--   1. terminal :  npm run supabase:setup
--   2. dashboard:  Supabase → SQL Editor → paste this file → Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- settings — key/value store. The whole public site lives in the row whose
-- key is "site_content" (a JSON document written by the admin panel).
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  key   text primary key,
  value text
);

-- ----------------------------------------------------------------------------
-- admins — the emails allowed to save changes
-- ----------------------------------------------------------------------------
create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz default now()
);

-- older projects may have the table without created_at
alter table public.admins add column if not exists created_at timestamptz default now();

-- ----------------------------------------------------------------------------
-- enquiries — messages from the public contact form
-- ----------------------------------------------------------------------------
create table if not exists public.enquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  phone      text,
  email      text,
  address    text,
  message    text,
  status     text default 'new',
  created_at timestamptz default now()
);

alter table public.enquiries add column if not exists address text;
alter table public.enquiries add column if not exists status text default 'new';

create index if not exists enquiries_created_idx on public.enquiries (created_at desc);

-- ----------------------------------------------------------------------------
-- is_admin() — true when the signed-in user's email is in public.admins
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- admins_is_empty() — used only by the bootstrap policy below. It has to be a
-- security-definer function: a policy that queries its own table directly
-- would recurse forever.
create or replace function public.admins_is_empty()
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (select 1 from public.admins);
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.settings  enable row level security;
alter table public.admins    enable row level security;
alter table public.enquiries enable row level security;

-- settings: the public may read; only admins may write
drop policy if exists settings_read  on public.settings;
drop policy if exists settings_write on public.settings;
create policy settings_read  on public.settings for select using (true);
create policy settings_write on public.settings for all
  using (public.is_admin()) with check (public.is_admin());

-- admins: only admins may read the list
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select using (public.is_admin());

-- admins bootstrap: while the table is still empty, a signed-in user may add
-- exactly their own email. This is what lets the first admin claim the panel
-- without touching the SQL editor. Once one row exists the policy stops
-- matching, so it cannot be abused afterwards.
drop policy if exists admins_bootstrap on public.admins;
create policy admins_bootstrap on public.admins for insert
  with check (
    public.admins_is_empty()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- admins: an admin may add or remove other admins
drop policy if exists admins_write on public.admins;
create policy admins_write on public.admins for all
  using (public.is_admin()) with check (public.is_admin());

-- enquiries: anyone may submit a message; only admins may read or change them
drop policy if exists enquiries_insert on public.enquiries;
drop policy if exists enquiries_admin  on public.enquiries;
create policy enquiries_insert on public.enquiries for insert with check (true);
create policy enquiries_admin  on public.enquiries for all
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Storage — public bucket for trip photos
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', true)
on conflict (id) do nothing;

drop policy if exists trip_photos_read  on storage.objects;
drop policy if exists trip_photos_write on storage.objects;
create policy trip_photos_read on storage.objects for select
  using (bucket_id = 'trip-photos');
create policy trip_photos_write on storage.objects for all
  using (bucket_id = 'trip-photos' and public.is_admin())
  with check (bucket_id = 'trip-photos' and public.is_admin());

-- ============================================================================
-- Done. Sign in at /admin/ and the panel will let you claim admin access.
-- ============================================================================
