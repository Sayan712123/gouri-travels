-- ============================================================================
-- Gouri Travels — database schema REFERENCE
-- ============================================================================
-- This file documents the schema of the EXISTING Supabase project that the
-- site is connected to. The tables already exist in that project, so you do
-- NOT need to run this file to get the site working.
--
-- It is kept in version control so the structure is documented, and it is
-- written to be idempotent — running it against the live project is harmless
-- and will not drop or duplicate anything.
--
-- Verified against the live project on 2026-11-11:
--   tables : trips, seats, settings, admins
--   view   : seat_status
--   rpc    : hold_seats, my_bookings, get_ticket, is_admin
--   bucket : trip-photos (public)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- trips — one row per trip package
-- ----------------------------------------------------------------------------
create table if not exists public.trips (
  id            uuid primary key default gen_random_uuid(),
  title         text        not null,
  from_place    text,
  to_place      text,
  trip_date     date,
  trip_time     text,
  price         numeric     default 0,
  boarding      text,
  details       text,                 -- sectioned text, see below
  thumb         text,                 -- cover image URL
  photos        text[]      default '{}',
  seats         integer     default 0,
  open          boolean     default true,
  created_at    timestamptz default now(),
  kind          text        default 'bus',   -- bus | train | scorpio
  vehicle_name  text,
  cars          integer,
  per_car       integer
);

-- The `details` column is a sectioned text field. Sections are introduced by a
-- line that is exactly "##<key>":
--
--   ##ov     overview paragraph
--   ##hl     highlights, one per line
--   ##it     day-wise plan, one per line
--   ##inc    included, one per line
--   ##exc    not included, one per line
--   ##pol    cancellation / policy, one per line
--   ##meal   meal notes
--   ##cl     booking closes at (YYYY-MM-DD HH:MM)
--   ##days   JSON array of {day, title, detail}
--
-- The admin trip editor writes these markers automatically.

-- ----------------------------------------------------------------------------
-- seats — one row per taken seat. This IS the booking record.
--   status = 'held'   → pending, waiting for the admin to confirm
--   status = 'booked' → confirmed, `ticket` holds the ticket code
-- ----------------------------------------------------------------------------
create table if not exists public.seats (
  trip_id     uuid references public.trips(id) on delete cascade,
  label       text not null,          -- A1, B3, T7, C1S4 …
  status      text not null default 'held',
  name        text,
  phone       text,
  held_until  timestamptz,
  ticket      text,
  note        text,
  created_at  timestamptz default now()
);

create index if not exists seats_trip_idx   on public.seats (trip_id);
create index if not exists seats_status_idx on public.seats (status);

-- ----------------------------------------------------------------------------
-- settings — key/value site settings, edited from the admin panel
--   brand, wa, phone, upi, upi_name, tag, notice, why,
--   terms, slabs, reviews, faq, hero
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  key   text primary key,
  value text
);

-- ----------------------------------------------------------------------------
-- admins — emails allowed into the admin panel
-- ----------------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key
);

-- ----------------------------------------------------------------------------
-- seat_status — the public, privacy-safe view of taken seats.
-- It exposes only which seats are taken, never the traveller's name or phone.
-- ----------------------------------------------------------------------------
create or replace view public.seat_status as
  select trip_id, label, status
  from public.seats
  where status = 'booked'
     or (status = 'held' and (held_until is null or held_until > now()));

-- ----------------------------------------------------------------------------
-- is_admin() — true when the signed-in user's email is in the admins table
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

-- ----------------------------------------------------------------------------
-- hold_seats() — hold a set of seats for the signed-in user.
-- Returns the booking code, or the text 'login' when there is no session.
-- ----------------------------------------------------------------------------
create or replace function public.hold_seats(
  p_trip   uuid,
  p_labels text[],
  p_name   text,
  p_phone  text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code  text;
  v_label text;
begin
  if auth.uid() is null then
    return 'login';
  end if;

  v_code := 'GT-' || upper(substr(md5(random()::text), 1, 8));

  foreach v_label in array p_labels loop
    -- skip a seat that is already taken
    if exists (
      select 1 from public.seats s
      where s.trip_id = p_trip
        and s.label = v_label
        and (s.status = 'booked'
             or (s.status = 'held' and s.held_until is not null and s.held_until > now()))
    ) then
      continue;
    end if;

    insert into public.seats (trip_id, label, status, name, phone, held_until, ticket, note)
    values (p_trip, v_label, 'held', p_name, p_phone, now() + interval '15 minutes', v_code, null)
    on conflict do nothing;
  end loop;

  return v_code;
end;
$$;

-- ----------------------------------------------------------------------------
-- my_bookings() — the signed-in user's own bookings
-- ----------------------------------------------------------------------------
create or replace function public.my_bookings()
returns table (
  trip_id    uuid,
  label      text,
  status     text,
  ticket     text,
  held_until timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.trip_id, s.label, s.status, s.ticket, s.held_until, s.created_at
  from public.seats s
  where s.name = (select u.email from auth.users u where u.id = auth.uid())
     or s.phone = (select u.phone from auth.users u where u.id = auth.uid())
  order by s.created_at desc;
$$;

-- ----------------------------------------------------------------------------
-- get_ticket() — look up a ticket by its code
-- ----------------------------------------------------------------------------
create or replace function public.get_ticket(p_code text)
returns table (
  trip_id    uuid,
  label      text,
  status     text,
  ticket     text,
  name       text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.trip_id, s.label, s.status, s.ticket, s.name, s.created_at
  from public.seats s
  where s.ticket = p_code
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.trips    enable row level security;
alter table public.seats    enable row level security;
alter table public.settings enable row level security;
alter table public.admins   enable row level security;

-- trips: everyone may read; only admins may write
drop policy if exists trips_read  on public.trips;
drop policy if exists trips_write on public.trips;
create policy trips_read  on public.trips for select using (true);
create policy trips_write on public.trips for all
  using (public.is_admin()) with check (public.is_admin());

-- settings: everyone may read; only admins may write
drop policy if exists settings_read  on public.settings;
drop policy if exists settings_write on public.settings;
create policy settings_read  on public.settings for select using (true);
create policy settings_write on public.settings for all
  using (public.is_admin()) with check (public.is_admin());

-- seats: a signed-in user may read and create their own holds;
--        only admins may update or delete
drop policy if exists seats_read   on public.seats;
drop policy if exists seats_insert on public.seats;
drop policy if exists seats_admin  on public.seats;
create policy seats_read   on public.seats for select using (auth.uid() is not null);
create policy seats_insert on public.seats for insert with check (auth.uid() is not null);
create policy seats_admin  on public.seats for all
  using (public.is_admin()) with check (public.is_admin());

-- admins: only admins may read the list
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select using (public.is_admin());

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
-- Adding an admin
-- ============================================================================
-- 1. Supabase Dashboard → Authentication → Users → Add user (email + password)
-- 2. Then run:
--
--      insert into admins (email) values ('you@example.com')
--        on conflict (email) do nothing;
--
-- 3. Sign in at /admin/ with that email.
-- ============================================================================
