# Setup guide — Gouri Travels

This project runs against an **existing** Supabase project. Nothing needs to be created from
scratch — the connection details are already in the code. This guide covers what to check,
how to add an admin, and how to deploy.

---

## 1. Supabase connection

Two files hold the credentials, and both are already filled in:

```
js/config.js          → SUPABASE_URL, SUPABASE_ANON_KEY
admin/js/config.js    → SUPABASE_URL, SUPABASE_ANON_KEY
```

Find the values in the Supabase Dashboard under **Project Settings → API**:

- **Project URL** → `SUPABASE_URL`
- **anon / public** key → `SUPABASE_ANON_KEY`

> Use the **anon** key only. The `service_role` key bypasses Row Level Security and must never
> appear in browser code.

If you ever need to point the site at a different project, change the two values in **both** files
and push. Nothing else needs editing.

---

## 2. Database schema

The live database already contains:

| Table | Purpose |
|---|---|
| `trips` | Trip packages |
| `seats` | One row per taken seat — this is the booking record |
| `settings` | Key/value site settings |
| `admins` | Emails allowed into the admin panel |

Plus the `seat_status` view and the `hold_seats`, `my_bookings`, `get_ticket`, `is_admin` functions.

`supabase/schema.sql` in this repo is a **reference copy** of that schema, kept so the structure is
documented in version control. You do **not** need to run it — the tables already exist. It is
written to be idempotent, so running it again is harmless if you want to be sure.

### `trips.details` — the sectioned text field

The trip editor and the public trip page both read and write this one column:

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

You never have to type the markers by hand — the admin trip editor writes them for you.

---

## 3. Create an admin user

1. Supabase Dashboard → **Authentication → Users → Add user**
   Enter an email and a password (or use "Send invite").
2. Supabase Dashboard → **SQL Editor**, run:

```sql
insert into admins (email) values ('you@example.com');
```

3. Open `/admin/` and sign in with that email and password.

`is_admin()` compares the signed-in user's email against the `admins` table, so the email must match
exactly. If you sign in with Google instead, use the same email address.

---

## 4. Google sign-in

Google is used in two places:

- **Public booking page** — required before seats can be held (`hold_seats` returns `"login"`
  for anonymous visitors, and RLS only allows signed-in writes to `seats`).
- **Admin login** — an alternative to email + password.

To enable it:

1. Supabase Dashboard → **Authentication → Providers → Google** → enable, and paste your
   Google OAuth **Client ID** and **Client Secret**.
2. In the Google Cloud Console, add the Supabase callback URL as an authorised redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Supabase Dashboard → **Authentication → URL Configuration**:
   - **Site URL**: `https://sayan712123.github.io/gouri-travels/`
   - **Redirect URLs**: add
     `https://sayan712123.github.io/gouri-travels/**`
     and `http://localhost:5173/**` for local testing.

Without step 3 the Google button will bounce back to the wrong page.

---

## 5. Run locally

```bash
python3 -m http.server 5173
```

Open <http://localhost:5173>. There is no build step and no dependencies to install.

---

## 6. Deploy to GitHub Pages

1. Push to the `main` branch.
2. Repo → **Settings → Pages**
3. **Source:** Deploy from a branch · **Branch:** `main` · **Folder:** `/ (root)`
4. Save. The site goes live at `https://<user>.github.io/gouri-travels/`.

The repo already contains `.nojekyll` and uses relative links throughout, so the site works
correctly under the `/gouri-travels/` sub-path.

---

## 7. Language toggle

- Default language is **English** (`DEFAULT_LANG` in `js/config.js`).
- The **EN / বাং** switch is in the header of every page and in the admin panel.
- The choice is stored in `localStorage` (`gt_lang`) and persists across pages and visits.
- All strings live in `js/i18n.js` under the `en` and `bn` blocks.

To add a string:

```html
<span data-i18n="my.key"></span>
<input data-i18n-ph="my.placeholder" />
<div data-i18n-html="my.markup"></div>
<button data-i18n-aria="my.label"></button>
```

Then add `"my.key"` to both language blocks.

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Trips don't load | Wrong `SUPABASE_URL` or `SUPABASE_ANON_KEY` in `js/config.js` |
| Google button does nothing | Redirect URL missing in Supabase → Authentication → URL Configuration |
| "This account is not an admin" | The signed-in email is not in the `admins` table |
| Seats won't hold | Visitor is not signed in — `hold_seats` needs a session |
| Booking confirm fails | The signed-in admin's email is not in `admins` (RLS blocks the update) |
| Bangla renders in a fallback font | Google Fonts blocked — check the network tab |
| 404 on a sub-page | Links must stay relative; the site is served from a sub-path |
