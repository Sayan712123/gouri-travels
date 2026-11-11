-- ===============================================================
-- Gouri Travels — Supabase schema
-- Run this whole file in Supabase Dashboard -> SQL Editor -> New query
-- It is idempotent: safe to run more than once.
-- ===============================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- 1. Helper: updated_at trigger
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 2. Admins
--    A user is an admin only if their auth.users id is in this table.
--    Add yourself after signing up (see README step 5).
-- ---------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  created_at timestamptz not null default now()
);

-- Security-definer helper so RLS policies can check admin status
-- without recursing into the admins table policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------
-- 3. Trips
-- ---------------------------------------------------------------
create table if not exists public.trips (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  destination     text not null,
  summary         text,
  description     text,
  duration_days   integer not null default 1 check (duration_days > 0),
  price_per_person numeric(10, 2) not null default 0 check (price_per_person >= 0),
  seats_total     integer not null default 20 check (seats_total >= 0),
  seats_booked    integer not null default 0 check (seats_booked >= 0),
  departure_date  date,
  return_date     date,
  cover_image_url text,
  highlights      text[] not null default '{}',
  itinerary       jsonb  not null default '[]'::jsonb,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists trips_active_idx on public.trips (is_active, departure_date);

-- ---------------------------------------------------------------
-- 4. Bookings
-- ---------------------------------------------------------------
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  booking_code  text not null unique
                default ('GT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  trip_id       uuid references public.trips (id) on delete set null,
  full_name     text not null,
  phone         text not null,
  email         text,
  travellers    integer not null default 1 check (travellers between 1 and 20),
  travel_date   date,
  pickup_point  text,
  notes         text,
  total_amount  numeric(10, 2),
  status        text not null default 'pending'
                check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists bookings_status_idx  on public.bookings (status, created_at desc);
create index if not exists bookings_trip_idx    on public.bookings (trip_id);

-- ---------------------------------------------------------------
-- 5. Enquiries (contact form)
-- ---------------------------------------------------------------
create table if not exists public.enquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null,
  email      text,
  message    text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 6. updated_at triggers
-- ---------------------------------------------------------------
 drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

 drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------
alter table public.admins    enable row level security;
alter table public.trips     enable row level security;
alter table public.bookings  enable row level security;
alter table public.enquiries enable row level security;

-- admins: an admin can read the admin list; nobody can self-promote.
drop policy if exists "admins read for admins" on public.admins;
create policy "admins read for admins"
  on public.admins for select
  to authenticated
  using (public.is_admin());

-- trips: public can read active trips; admins manage everything.
drop policy if exists "trips public read" on public.trips;
create policy "trips public read"
  on public.trips for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists "trips admin insert" on public.trips;
create policy "trips admin insert"
  on public.trips for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "trips admin update" on public.trips;
create policy "trips admin update"
  on public.trips for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "trips admin delete" on public.trips;
create policy "trips admin delete"
  on public.trips for delete
  to authenticated
  using (public.is_admin());

-- bookings: anyone may create a booking; only admins may read/update/delete.
drop policy if exists "bookings public insert" on public.bookings;
create policy "bookings public insert"
  on public.bookings for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and length(trim(full_name)) > 1
    and length(trim(phone)) >= 6
  );

drop policy if exists "bookings admin read" on public.bookings;
create policy "bookings admin read"
  on public.bookings for select
  to authenticated
  using (public.is_admin());

drop policy if exists "bookings admin update" on public.bookings;
create policy "bookings admin update"
  on public.bookings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "bookings admin delete" on public.bookings;
create policy "bookings admin delete"
  on public.bookings for delete
  to authenticated
  using (public.is_admin());

-- enquiries: anyone may submit; only admins may read/update.
drop policy if exists "enquiries public insert" on public.enquiries;
create policy "enquiries public insert"
  on public.enquiries for insert
  to anon, authenticated
  with check (length(trim(name)) > 1 and length(trim(message)) > 2);

drop policy if exists "enquiries admin read" on public.enquiries;
create policy "enquiries admin read"
  on public.enquiries for select
  to authenticated
  using (public.is_admin());

drop policy if exists "enquiries admin update" on public.enquiries;
create policy "enquiries admin update"
  on public.enquiries for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------
-- 8. Storage bucket for trip cover images
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('trip-images', 'trip-images', true)
on conflict (id) do nothing;

drop policy if exists "trip images public read" on storage.objects;
create policy "trip images public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'trip-images');

drop policy if exists "trip images admin write" on storage.objects;
create policy "trip images admin write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'trip-images' and public.is_admin());

drop policy if exists "trip images admin update" on storage.objects;
create policy "trip images admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'trip-images' and public.is_admin());

drop policy if exists "trip images admin delete" on storage.objects;
create policy "trip images admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'trip-images' and public.is_admin());

-- ---------------------------------------------------------------
-- 9. Seed data (safe to re-run)
-- ---------------------------------------------------------------
insert into public.trips
  (slug, title, destination, summary, description, duration_days, price_per_person,
   seats_total, departure_date, return_date, cover_image_url, highlights, itinerary)
values
  ('darjeeling-gangtok-5d', 'Darjeeling & Gangtok', 'West Bengal, Sikkim',
   'Tea gardens, toy train and Kanchenjunga sunrise in one relaxed 5-day trip.',
   'A classic Himalayan escape covering Darjeeling, Tiger Hill, Batasia Loop and the monasteries of Gangtok. Comfortable hotels, private vehicle and a local guide throughout.',
   5, 12500, 24, current_date + 20, current_date + 24,
   'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=70',
   array['Tiger Hill sunrise', 'Darjeeling Himalayan Railway', 'Tsomgo Lake', 'MG Marg, Gangtok'],
   '[{"day":1,"title":"Arrival in Darjeeling","detail":"Pickup from NJP / Bagdogra and transfer to hotel."},{"day":2,"title":"Darjeeling sightseeing","detail":"Tiger Hill, Batasia Loop, Himalayan Zoo and tea estate."},{"day":3,"title":"Transfer to Gangtok","detail":"Scenic drive along the Teesta, evening at MG Marg."},{"day":4,"title":"Tsomgo Lake & Baba Mandir","detail":"Full-day excursion with permit assistance."},{"day":5,"title":"Departure","detail":"Drop at NJP / Bagdogra."}]'::jsonb),

  ('digha-shankarpur-3d', 'Digha & Shankarpur Beach Break', 'Digha, West Bengal',
   'Sea breeze, fresh seafood and a quiet beach weekend — perfect for families.',
   'Three easy days on the Bay of Bengal coast with a sea-facing hotel, beach time at Digha and the quieter Shankarpur fishing harbour.',
   3, 5400, 30, current_date + 12, current_date + 14,
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=70',
   array['Sea-facing stay', 'Shankarpur beach', 'Marine Aquarium', 'Local seafood'],
   '[{"day":1,"title":"Arrival & beach evening","detail":"Check-in and sunset at New Digha beach."},{"day":2,"title":"Shankarpur & Talsari","detail":"Boat ride and red crab beach visit."},{"day":3,"title":"Departure","detail":"Breakfast and return transfer."}]'::jsonb),

  ('puri-konark-4d', 'Puri & Konark Heritage', 'Puri, Odisha',
   'Jagannath temple, Chandrabhaga beach and the Sun Temple of Konark.',
   'A devotional and heritage circuit around Puri with comfortable stay, temple darshan assistance and a guided Konark visit.',
   4, 8900, 26, current_date + 30, current_date + 33,
   'https://images.unsplash.com/photo-1620766165457-a8025baa82e0?auto=format&fit=crop&w=1200&q=70',
   array['Jagannath Temple darshan', 'Konark Sun Temple', 'Chandrabhaga beach', 'Chilika lagoon stop'],
   '[{"day":1,"title":"Arrival in Puri","detail":"Check-in and evening aarti."},{"day":2,"title":"Puri & Chilika","detail":"Temple darshan and Chilika dolphin point."},{"day":3,"title":"Konark day trip","detail":"Sun Temple, Chandrabhaga and Ramachandi."},{"day":4,"title":"Departure","detail":"Return transfer to Bhubaneswar."}]'::jsonb),

  ('meghalaya-6d', 'Meghalaya — Abode of Clouds', 'Shillong, Cherrapunji, Dawki',
   'Living root bridges, crystal-clear Dawki river and the wettest place on earth.',
   'Six days across Shillong, Cherrapunji and Dawki with waterfall stops, a root-bridge trek and a boat ride on the Umngot river.',
   6, 21500, 18, current_date + 40, current_date + 45,
   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=70',
   array['Double-decker root bridge', 'Dawki boat ride', 'Nohkalikai Falls', 'Mawlynnong village'],
   '[{"day":1,"title":"Guwahati to Shillong","detail":"Umiam Lake stop and evening walk at Police Bazar."},{"day":2,"title":"Shillong local","detail":"Elephant Falls, Shillong Peak and Don Bosco museum."},{"day":3,"title":"Shillong to Cherrapunji","detail":"Nohkalikai and Seven Sisters falls."},{"day":4,"title":"Root bridge trek","detail":"Nongriat double-decker bridge trek."},{"day":5,"title":"Dawki & Mawlynnong","detail":"Umngot river boat ride and cleanest village."},{"day":6,"title":"Departure","detail":"Drive back to Guwahati."}]'::jsonb),

  ('kashmir-7d', 'Kashmir Valley Grand Tour', 'Srinagar, Gulmarg, Pahalgam',
   'Dal Lake houseboat, Gulmarg gondola and the meadows of Pahalgam.',
   'A seven-day Kashmir itinerary with a Dal Lake shikara ride, one night on a houseboat, Gulmarg gondola and the Betaab valley in Pahalgam.',
   7, 32500, 16, current_date + 55, current_date + 61,
   'https://images.unsplash.com/photo-1566837945700-30057527ade0?auto=format&fit=crop&w=1200&q=70',
   array['Dal Lake houseboat', 'Gulmarg gondola', 'Betaab Valley', 'Mughal gardens'],
   '[{"day":1,"title":"Arrival in Srinagar","detail":"Airport pickup and houseboat check-in."},{"day":2,"title":"Srinagar local","detail":"Shikara ride, Nishat and Shalimar gardens."},{"day":3,"title":"Gulmarg","detail":"Gondola ride and meadow walk."},{"day":4,"title":"Gulmarg to Pahalgam","detail":"Drive via Awantipora."},{"day":5,"title":"Pahalgam valleys","detail":"Betaab, Aru and Chandanwari."},{"day":6,"title":"Pahalgam to Srinagar","detail":"Shopping and free evening."},{"day":7,"title":"Departure","detail":"Airport drop."}]'::jsonb),

  ('andaman-6d', 'Andaman Islands Escape', 'Port Blair, Havelock, Neil Island',
   'Turquoise water, Radhanagar beach and coral reefs — island hopping done right.',
   'Six days across Port Blair, Havelock and Neil Island with ferry transfers, Cellular Jail light-and-sound show and snorkelling at Elephant Beach.',
   6, 28900, 20, current_date + 65, current_date + 70,
   'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=70',
   array['Radhanagar Beach', 'Elephant Beach snorkelling', 'Cellular Jail show', 'Neil Island natural bridge'],
   '[{"day":1,"title":"Arrival in Port Blair","detail":"Corbyn Cove and Cellular Jail show."},{"day":2,"title":"Ferry to Havelock","detail":"Radhanagar beach sunset."},{"day":3,"title":"Elephant Beach","detail":"Snorkelling and water sports."},{"day":4,"title":"Neil Island","detail":"Bharatpur beach and natural rock bridge."},{"day":5,"title":"Return to Port Blair","detail":"Ross Island and North Bay."},{"day":6,"title":"Departure","detail":"Airport drop."}]'::jsonb)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------
-- 10. Promote yourself to admin (run AFTER creating your auth user)
-- ---------------------------------------------------------------
-- insert into public.admins (user_id, email, full_name)
-- select id, email, 'Gouri Travels Admin'
-- from auth.users
-- where email = 'you@example.com'
-- on conflict (user_id) do nothing;
