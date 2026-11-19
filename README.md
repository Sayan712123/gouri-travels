# Gouri Travels — Trip Booking Website

A complete trip-booking website for **Gouri Travels**: a public site (browse trips, pick seats, book),
an admin panel (manage bookings, trips and site settings), and a Supabase backend.

**Live site:** https://sayan712123.github.io/gouri-travels/
**Admin panel:** https://sayan712123.github.io/gouri-travels/admin/

---

## What's inside

```
index.html            The whole public site — a single self-contained file
                      (#/ home, #/tourpackage, #/gallery, #/contact, #/tour-<id>)
                      CSS, JS, fonts and every photo are embedded.

content.json          Fallback content, used when Supabase is unreachable

assets/               Brand logos (light/dark), favicons, app icons

admin/index.html      Admin panel — login + 7 tabs (one page)
admin/css/admin.css   Admin styles (light + dark theme)
admin/js/admin.js     Admin logic
admin/js/config.js    Supabase Project URL + anon key  ← edit this

js/config.js          Supabase Project URL + anon key for the public site
js/site.js            Renders every page from the site_content row
js/images.js          Embedded photos
js/theme.js           Light/dark theme switch + first-visit intro animation

supabase/setup.sql    One-shot database setup (tables, RLS, storage)
supabase/schema.sql   Reference copy of the live database schema
scripts/supabase-setup.mjs   Terminal setup script (npm run supabase:setup)
package.json          npm scripts for the setup script
docs/SETUP.md         Detailed setup + troubleshooting
.env.example          Environment variable template
```

> The public site used to be five separate pages (`index`, `trips`, `trip`, `booking`,
> `contact`) sharing `css/styles.css` and `js/site.js`. It has been replaced by the
> single-file build above. Those files are gone, so `trips.html`, `booking.html` and
> friends now return 404 — the equivalent views live at the `#/` routes in `index.html`.
> The admin panel is unchanged and still works against Supabase.

---

## Brand, theme and language

**Colours** — the admin panel uses the brand gradient: magenta `#EC1C5A` → orange `#FF7A3D`
on a near-black (`#0A090B`) brand background. The single-file public site carries its own
palette inside `index.html`, matched to the same brand. Admin colours live in the CSS
variables at the top of `admin/css/admin.css`.

**Themes** — the header has a sun/moon toggle in the admin panel.
Dark is the default; the visitor's choice is stored in `localStorage` under `gt_theme` and is
re-applied before the first paint, so there is no flash of the wrong theme. The logo swaps
automatically: the white wordmark (`logo-full-dark.png`) on dark, the dark wordmark
(`logo-full-light.png`) on light.

**Intro animation** — the first time a visitor opens the admin panel in a session, a splash screen
fades and scales the logo in over a magenta/orange glow, then lifts the curtain. It is shown
once per session (`sessionStorage: gt_intro_seen`), can be skipped by clicking or pressing Esc,
and is skipped entirely for visitors with `prefers-reduced-motion`.

**Language** — English is the default; the EN / বাংলা toggle in the header switches every page
and the choice is stored in `localStorage` under `gt_lang`.

---

## Backend — the existing Supabase project

This site is wired to the **existing** Supabase project (the same one the earlier site used).
The connection details live in two files and are already filled in:

| File | Keys |
|---|---|
| `js/config.js` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public site) |
| `admin/js/config.js` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (admin panel) |

Both files read a saved override from `localStorage` (`gt_sb_config`) first, so the
**Admin → Supabase** tab can point the whole site at a different project without a rebuild.

### Connecting from the admin panel

`/admin/` → **Supabase** tab:

- **Project URL** and **Anon / publishable key** are pre-filled with the current project.
- **Test connection** probes the project with a plain REST call and reports whether
  `settings` is reachable and `is_admin()` exists.
- **Save connection** stores the values in this browser and reloads — the public site
  then reads from the same project.
- **Reset to default** forgets the override.

### Connecting from the terminal

```bash
npm install          # once — installs the `pg` driver
npm run supabase:setup
```

That creates the tables, the `is_admin()` helper, the RLS policies and the
`trip-photos` storage bucket. It is idempotent — running it twice is harmless.

It needs **one** of these, in a `.env` file (git-ignored) or exported in your shell:

| Option | Variables | Where to get it |
|---|---|---|
| A — database password | `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` | Project Settings → Database |
| B — connection string | `DATABASE_URL` | Project Settings → Database → Connection string → URI |
| C — access token | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` | [Account → Access tokens](https://supabase.com/dashboard/account/tokens) |

```bash
npm run supabase:check     # only report what exists, change nothing
```

No credentials? Open `/admin/` → **Supabase** → copy the SQL into the
[Supabase SQL editor](https://supabase.com/dashboard/project/_/sql/new). Same result.

### Database schema

| Table | Columns |
|---|---|
| `settings` | `key`, `value` — the whole public site is the row `key = 'site_content'` (JSON) |
| `admins` | `email`, `created_at` — who may save changes |
| `enquiries` | `id`, `name`, `phone`, `email`, `address`, `message`, `status`, `created_at` |

**RPC:** `is_admin()` — true when the signed-in user's email is in `admins`.
**Storage:** `trip-photos` (public bucket) — trip covers, galleries and hero images.

### How the public site reads content

`js/site.js` fetches the `site_content` row from `settings` on every load and renders
the whole site from it. If Supabase is unreachable it falls back to the `content.json`
shipped with the repo, so the site never goes blank. An admin save therefore shows up
on the next page load — no rebuild, no deploy.

The contact form POSTs to `enquiries`; if that fails (offline, table missing) it falls
back to opening the visitor's email app, so a message is never lost.

### Row level security

| Table | Public | Signed-in | Admin |
|---|---|---|---|
| `settings` | read | read | read + write |
| `enquiries` | insert only | insert only | read + write |
| `admins` | — | insert **own** email while the table is empty | read + write |

The "insert own email while empty" policy is what lets the first admin claim the panel
without touching the SQL editor. Once one row exists it stops matching.


### Admin panel

Sign in at `/admin/` with an email that exists in the `admins` table (or claim it from the
panel — see below). Six content tabs plus a Supabase tab:

| Tab | What it edits |
|---|---|
| **Home page** | Hero caption and slides, welcome heading/paragraphs/photo, "Since" badge, stat counters |
| **Tours** | Add / edit / delete tours — title, URL id, cover image, body (`## Heading`, `[Day 1] text`, `- bullet`, plain paragraph) |
| **Gallery** | Photos and captions |
| **Contact** | Address blocks, enquiry email and phone |
| **Footer** | Address, phone numbers, email, subscribe text, copyright |
| **Enquiries** | Messages submitted through the public contact form |
| **Supabase** | Connection, database setup, admin access |

Everything is stored as one JSON document in `settings` under the key `site_content`.

### Adding an admin

**From the panel (no SQL):** sign in, open the **Supabase** tab, type your email under
*Admin access* and press **+ Add admin**. If the save is ever refused, the error banner
offers a **Make me an admin** button that does the same thing.

**From the SQL editor:**

```sql
insert into public.admins (email) values ('you@example.com')
  on conflict (email) do nothing;
```

`is_admin()` checks the signed-in email against this table.

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
| Admin panel is empty | Open **Admin → Supabase** and press **Test connection** |
| "enquiries table is missing" | Run `npm run supabase:setup`, or paste `supabase/setup.sql` into the SQL editor |
| Save is refused (RLS) | Your email is not in `admins` — press **Make me an admin**, or add it in the Supabase tab |
| "Sign in with Google" does nothing | Add your Pages URL to Supabase → Authentication → URL Configuration → Redirect URLs |
| Admin login says "not an admin" | The signed-in email is missing from the `admins` table |
| Seats won't hold | The visitor is not signed in — `hold_seats` requires a session |
| Bangla text looks wrong | The Hind Siliguri font is loaded from Google Fonts; check the network tab |

---

## Security notes

- Only the **anon** key is committed. The `service_role` key is never used in the browser.
- RLS protects every table: the public can read `settings` and insert an enquiry, but only
  admins can write content or read the enquiry list.
- The setup script needs a database password or access token, but it only ever reads them from
  your local `.env` — they are never committed and never reach the browser.
- `admin/` is marked `noindex, nofollow`.