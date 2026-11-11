# Gouri Travels — Trip Booking Website

A complete trip-booking website for **Gouri Travels**: a public site (browse trips, pick seats, book),
an admin panel (manage bookings, trips and site settings), and a Supabase backend.

**Live site:** https://sayan712123.github.io/gouri-travels/
**Admin panel:** https://sayan712123.github.io/gouri-travels/admin/

---

## What's inside

```
index.html            Home — hero slider, search, featured trips, reviews
trips.html            All trips with filters (duration / budget) and search
trip.html             Trip detail — overview, highlights, day-wise plan, seat count
booking.html          Booking — Google sign-in, seat picker, hold seats, ticket
contact.html          Contact — message opens in WhatsApp
css/styles.css        Public site styles (responsive, Hind Siliguri for Bangla)

admin/index.html      Admin login (email+password or Google)
admin/dashboard.html  Dashboard — bookings, trips CRUD, site settings
admin/css/admin.css   Admin styles
admin/js/admin.js     Admin logic

js/config.js          Supabase Project URL + anon key  ← edit this
js/i18n.js            English / বাংলা dictionary + language toggle engine
js/supabase-client.js Shared Supabase client
js/site.js            Public data layer (schema adapter)

supabase/schema.sql   Reference copy of the live database schema
docs/SETUP.md         Detailed setup + troubleshooting
.env.example          Environment variable template
```

---

## Backend — the existing Supabase project

This site is wired to the **existing** Supabase project (the same one the earlier site used).
The connection details live in two files and are already filled in:

| File | Keys |
|---|---|
| `js/config.js` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `admin/js/config.js` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |

> The **anon / public** key is meant to be in browser code — Row Level Security protects the data.
> Never put the `service_role` key in these files.

### Database schema (as it exists today)

| Table | Columns |
|---|---|
| `trips` | `id`, `title`, `from_place`, `to_place`, `trip_date`, `trip_time`, `price`, `boarding`, `details`, `thumb`, `photos[]`, `seats`, `open`, `created_at`, `kind`, `vehicle_name`, `cars`, `per_car` |
| `seats` | `trip_id`, `label`, `status` (`held` / `booked`), `name`, `phone`, `held_until`, `ticket`, `note`, `created_at` |
| `settings` | `key`, `value` |
| `admins` | `email` |

**View:** `seat_status` (`trip_id`, `label`, `status`) — the public, privacy-safe view of taken seats.
**RPC:** `hold_seats(p_trip, p_labels, p_name, p_phone)`, `my_bookings()`, `get_ticket(p_code)`, `is_admin()`.
**Storage:** `trip-photos` (public bucket) — trip covers, galleries and hero images.

### How the code maps onto that schema

The original code expected `bookings`, `enquiries`, `slug`, `price_per_person`, `duration_days`,
`cover_image_url`, `itinerary[]` and `highlights[]` — **none of which exist** in the live database.
`js/site.js` and `admin/js/admin.js` are now schema adapters that translate:

| Old (non-existent) | Now uses |
|---|---|
| `bookings` table | `seats` rows (`status: held` → pending, `booked` → confirmed) |
| `enquiries` table | Contact form opens WhatsApp (no table exists) |
| `slug` | `id` (URL is `trip.html?id=…`; a title-slug fallback also works) |
| `price_per_person` | `price` |
| `cover_image_url` | `thumb` |
| `highlights[]` | `details` → `##hl` section |
| `itinerary[]` | `details` → `##days` (JSON) or `##it` (lines) |
| `description` / `summary` | `details` → `##ov` section |
| `seats_total` | `seats` |
| `departure_date` | `trip_date` |

The `details` column is a sectioned text field:

```
##ov      overview paragraph
##hl      highlights, one per line
##it      day-wise plan, one per line
##inc     included, one per line
##exc     not included, one per line
##pol     cancellation / policy, one per line
##meal    meal notes
##cl      booking closes at (YYYY-MM-DD HH:MM)
##days    JSON array of {day, title, detail}
```

---

## Bilingual site (English / বাংলা)

- The site **opens in English** by default (`DEFAULT_LANG: "en"` in `js/config.js`).
- A **EN / বাংলা** toggle sits in the header of every public page and in the admin panel.
- The choice is saved in `localStorage` under `gt_lang`, so it follows the visitor from page to page.
- All copy lives in `js/i18n.js`. To add a string, add the same key to both the `en` and `bn` blocks
  and put `data-i18n="your.key"` on the element (or `data-i18n-ph` for placeholders,
  `data-i18n-html` for markup, `data-i18n-aria` for aria-labels).

---

## Booking flow

1. Visitor opens `booking.html`, picks a trip.
2. **Google sign-in is required** — the `hold_seats` RPC returns `"login"` for anonymous users,
   and RLS only lets a signed-in user write to `seats`.
3. They pick seats from the live seat map (free / your pick / on hold / booked).
4. `hold_seats` holds the seats for 15 minutes and returns a booking code.
5. The visitor sends the booking on WhatsApp; the admin confirms it in the dashboard,
   which flips the seat to `booked` and issues a ticket code.

---

## Admin panel

Sign in at `/admin/` with an email that exists in the `admins` table.

- **Bookings** — every `seats` row, with search and status filter. Confirm (issues a ticket code)
  or cancel (deletes the hold).
- **Trips** — create / edit / hide / delete trips. The editor writes the `details` sections for you.
- **Settings** — brand name, WhatsApp number, phone, UPI id, notice banner, terms, deduction slabs,
  reviews, FAQ and hero slider images. These drive the public site live.

### Adding an admin

1. Supabase Dashboard → **Authentication → Users → Add user** (set an email + password).
2. Then in the SQL editor:

```sql
insert into admins (email) values ('you@example.com');
```

3. Sign in at `/admin/`. `is_admin()` checks the signed-in email against this table.

---

## Run locally

```bash
python3 -m http.server 5173
# open http://localhost:5173
```

Any static server works. There is no build step.

---

## Deploy

### GitHub Pages (current setup)

The site is served from the repository root on the `main` branch.

1. Repo → **Settings → Pages**
2. Source: **Deploy from a branch** · Branch: **main** · Folder: **/ (root)**
3. Save. The site appears at `https://<user>.github.io/gouri-travels/`.

`.nojekyll` is committed so folders starting with `_` are served, and every link is relative,
so the site works correctly under the `/gouri-travels/` sub-path.

### Netlify / Vercel

- Publish directory: `.` (repository root)
- No build command

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Trips don't load | Check `SUPABASE_URL` / `SUPABASE_ANON_KEY` in `js/config.js` |
| "Sign in with Google" does nothing | Add your Pages URL to Supabase → Authentication → URL Configuration → Redirect URLs |
| Admin login says "not an admin" | The signed-in email is missing from the `admins` table |
| Seats won't hold | The visitor is not signed in — `hold_seats` requires a session |
| Bangla text looks wrong | The Hind Siliguri font is loaded from Google Fonts; check the network tab |

---

## Security notes

- Only the **anon** key is committed. The `service_role` key is never used in the browser.
- RLS protects every table: the public can read `trips`, `settings` and the `seat_status` view,
  but only signed-in users can hold seats, and only admins can write trips and settings.
- `admin/` is marked `noindex, nofollow`.
