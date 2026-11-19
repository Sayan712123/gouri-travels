# Gouri Travels — Trip Booking Website

A complete trip-booking website for **Gouri Travels**: a public site (home, tour packages,
tour details, gallery, contact) and a single admin panel that edits every word and photo on it.

**Live site:** https://sayan712123.github.io/gouri-travels/
**Admin panel:** https://sayan712123.github.io/gouri-travels/admin/

---

## How it works

The public site is **data-driven**. All of its content — hero slides, welcome text, statistics,
the 16 tour packages with their itineraries, the gallery, contact blocks and the footer — lives in
one JSON document. That document is stored in Supabase (`settings` table, key `site_content`) and
edited through the admin panel. The site reads it on every page load, so **an edit in the admin
panel appears on the public site immediately** (no rebuild, no redeploy).

If Supabase is unreachable, the site falls back to `content.json` shipped in the repo, so it never
goes blank.

```
index.html            Public site shell — header, footer, lightbox, script tags
content.json          Fallback copy of the whole site content (also the admin's seed)
js/config.js          Supabase Project URL + anon key        ← edit this
js/images.js          Embedded base64 photos (banner, tours, gallery)
js/site.js            Renderer: reads Supabase → falls back to content.json → builds every page
js/theme.js           Light/dark theme switch (admin)

admin/index.html      The one admin panel — login + content editor
admin/css/admin.css   Admin styles (light + dark)
admin/js/admin.js     Auth + content CRUD
admin/js/config.js    Supabase Project URL + anon key        ← edit this

assets/               Brand logos (light/dark), favicons, app icons
supabase/schema.sql   Reference copy of the live database schema
docs/SETUP.md         Longer setup guide and troubleshooting
```

### Routing

The public site is a single page with hash routes:

| Route | Page |
|---|---|
| `#/` | Home |
| `#/tourpackage` | All tour packages |
| `#/tour-<id>` | One tour's detail page (e.g. `#/tour-65`) |
| `#/gallery` | Photo gallery |
| `#/contact` | Contact details + enquiry form |

---

## Admin panel

`/admin/` is the only admin page. Sign in with **email + password** or **Google**, both through
Supabase Auth on the same project the site already used.

Once signed in you get six tabs:

| Tab | What it edits |
|---|---|
| **Home page** | Hero caption and slides, welcome heading/paragraphs/photo, the "since" badge, the statistics counters |
| **Tours** | Add / edit / delete tour packages — title, URL id, cover image, and the body (headings, day-by-day itinerary, bullet lists, paragraphs) |
| **Gallery** | Photo list with captions |
| **Contact** | Address blocks and the enquiry email / phone |
| **Footer** | Address, phone numbers, email, subscribe text, copyright |
| **Enquiries** | Messages submitted through the contact form (read from the `enquiries` table) |

Press **Save changes** to write the document back to Supabase. The public site picks it up on the
next page load.

### Who can sign in

Access is controlled by the `admins` table:

- If `admins` has rows, only those email addresses may use the panel.
- If `admins` is empty, any account that can authenticate on the project may use it — so a fresh
  project can never lock the owner out.

To restrict it, add your email:

```sql
insert into public.admins (email) values ('you@example.com');
```

### Google sign-in

Google login is handled by Supabase Auth. In the Supabase dashboard:

1. **Authentication → Providers → Google** → enable it and paste your Google OAuth client ID and
   secret (from Google Cloud Console → Credentials → OAuth client → *Web application*).
2. Under **Authorized redirect URIs** in Google Cloud, add
   `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase **Authentication → URL Configuration**, set **Site URL** to
   `https://sayan712123.github.io/gouri-travels/` and add
   `https://sayan712123.github.io/gouri-travels/admin/` to **Redirect URLs**.

---

## Setup

### 1. Supabase

The project is already provisioned. If you ever need to rebuild it, run `supabase/schema.sql` in
the Supabase SQL editor. It creates `trips`, `seats`, `settings`, `admins`, the `is_admin()` helper
and the row-level-security policies.

The content document needs one row in `settings`:

```sql
insert into public.settings (key, value)
values ('site_content', '{}')
on conflict (key) do nothing;
```

The admin panel fills it in on first save (it seeds the editor from `content.json`).

### 2. Credentials

Put the same two values in **both** config files:

- `js/config.js` → `window.GT_CONFIG`
- `admin/js/config.js` → `window.GT_ADMIN_CONFIG`

```js
SUPABASE_URL:      "https://<project-ref>.supabase.co",
SUPABASE_ANON_KEY: "<anon / publishable key>",
```

Both are on **Project Settings → API**. The anon key is safe to ship — every table is protected by
RLS. **Never** put the `service_role` key in a file that ships to the browser.

### 3. Run locally

```bash
python3 -m http.server 5173
# site  → http://localhost:5173/
# admin → http://localhost:5173/admin/
```

A plain `file://` open will not work: the site fetches `content.json` and calls Supabase, both of
which need an HTTP origin.

### 4. Publish

**GitHub Pages** (current setup): push to `main`, then *Settings → Pages → Source: Deploy from a
branch → `main` / root*. The `.nojekyll` file is already there so folders starting with `_` are
served.

**Netlify / Vercel:** publish directory is the repository root; no build command.

---

## Notes

- The public site's enquiry and subscribe forms open the visitor's own email app (`mailto:`) with
  the details filled in. They do not post to a server, so nothing is stored unless the visitor
  actually sends the mail.
- The `enquiries` table is optional. If it does not exist, the Enquiries tab explains how to create
  it instead of failing.
- `js/images.js` is ~2.7 MB of base64 photos. It is cached by the browser after the first load.
