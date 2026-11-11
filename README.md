# Gouri Travels — ট্রিপ বুকিং ওয়েবসাইট

পাবলিক ট্রিপ বুকিং সাইট + অ্যাডমিন প্যানেল + Supabase ডেটাবেস স্কিমা — সব একসাথে।

- **পাবলিক সাইট** — ট্রিপ লিস্টিং, ট্রিপ ডিটেইল, বুকিং ফর্ম, কন্টাক্ট ফর্ম
- **অ্যাডমিন প্যানেল** — Supabase Auth লগইন, বুকিং ম্যানেজমেন্ট, ট্রিপ CRUD, এনকোয়ারি ইনবক্স
- **ডেটাবেস** — `supabase/schema.sql` (টেবিল, RLS পলিসি, স্টোরেজ বাকেট, সিড ডেটা)

---

## ফোল্ডার স্ট্রাকচার

```
gouri-travels/
├── public/                 # পাবলিক সাইট (স্ট্যাটিক HTML/CSS/JS)
│   ├── index.html          # হোম — হিরো, ফিচার্ড ট্রিপ, রিভিউ
│   ├── trips.html          # সব ট্রিপ + ফিল্টার
│   ├── trip.html           # একক ট্রিপ ডিটেইল (?slug=...)
│   ├── booking.html        # বুকিং ফর্ম (?trip=...)
│   ├── contact.html        # কন্টাক্ট / এনকোয়ারি
│   ├── css/styles.css
│   └── js/
│       ├── config.js       # Supabase URL + anon key এখানে বসান
│       ├── supabase-client.js
│       └── site.js
├── admin/                  # অ্যাডমিন প্যানেল
│   ├── index.html          # লগইন
│   ├── dashboard.html      # বুকিং / ট্রিপ / এনকোয়ারি
│   ├── css/admin.css
│   └── js/admin.js
├── supabase/
│   └── schema.sql          # পুরো ডেটাবেস স্কিমা
├── docs/
│   └── SETUP.md            # বিস্তারিত সেটআপ গাইড
├── .env.example
└── README.md
```

---

## ১. Supabase প্রজেক্ট তৈরি

1. [supabase.com](https://supabase.com) এ লগইন করে **New project** ক্লিক করুন।
2. নাম দিন (যেমন `gouri-travels`), ডেটাবেস পাসওয়ার্ড সেট করুন, রিজিয়ন বেছে নিন (India এর জন্য `ap-south-1` ভালো)।
3. প্রজেক্ট তৈরি হওয়ার পর **Project Settings → API** থেকে দুটো মান কপি করুন:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

> ⚠️ `service_role` key কখনো ব্রাউজারে বা Git-এ রাখবেন না।

## ২. ডেটাবেস স্কিমা চালান

1. Supabase ড্যাশবোর্ডে **SQL Editor → New query** খুলুন।
2. `supabase/schema.sql` ফাইলের **পুরো** কন্টেন্ট পেস্ট করে **Run** করুন।
3. এতে তৈরি হবে: `trips`, `bookings`, `enquiries`, `admins` টেবিল, RLS পলিসি, `trip-images` স্টোরেজ বাকেট এবং ৬টি ডেমো ট্রিপ।

## ৩. সাইটে কনফিগ বসান

`public/js/config.js` খুলে মান দুটো বসান:

```js
window.GT_CONFIG = {
  SUPABASE_URL: "https://your-project-ref.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key",
  BRAND_NAME: "Gouri Travels",
  WHATSAPP_NUMBER: "919000000000",
};
```

`admin/js/admin.js` এর উপরের দিকেও একই দুটো মান বসাতে হবে (অথবা `public/js/config.js` কে `../public/js/config.js` হিসেবে লোড করুন)।

## ৪. অ্যাডমিন ইউজার তৈরি

1. সাইট চালু করে `admin/index.html` খুলুন।
2. Supabase ড্যাশবোর্ড → **Authentication → Users → Add user** দিয়ে ইমেইল + পাসওয়ার্ড দিয়ে ইউজার বানান (Auto Confirm User টিক দিন)।
3. সেই ইউজারকে অ্যাডমিন বানাতে SQL Editor-এ চালান:

```sql
insert into public.admins (user_id, email, full_name)
select id, email, 'Gouri Travels Admin'
from auth.users
where email = 'you@example.com'
on conflict (user_id) do nothing;
```

4. এখন `admin/index.html` এ ওই ইমেইল/পাসওয়ার্ড দিয়ে লগইন করুন।

## ৫. লোকালি চালানো

কোনো বিল্ড স্টেপ নেই — শুধু একটা স্ট্যাটিক সার্ভার দরকার (ফাইল:// দিয়ে খুললে Supabase কল কাজ করবে না)।

```bash
# Python দিয়ে
python3 -m http.server 5173

# অথবা Node দিয়ে
npx serve -l 5173 .
```

তারপর খুলুন:

- পাবলিক সাইট → <http://localhost:5173/public/>
- অ্যাডমিন → <http://localhost:5173/admin/>

## ৬. পাবলিশ করার ধাপ

### অপশন A — Netlify (সবচেয়ে সহজ)

1. [netlify.com](https://netlify.com) → **Add new site → Import an existing project** → GitHub → এই রিপো সিলেক্ট করুন।
2. Build command: *(খালি রাখুন)*, Publish directory: `public`
3. **Deploy** চাপুন। সাইট লাইভ হবে `https://<name>.netlify.app` এ।
4. অ্যাডমিন প্যানেল আলাদা সাইট হিসেবে: আবার একই রিপো ইমপোর্ট করে Publish directory `admin` দিন (যেমন `gouri-admin.netlify.app`)।

### অপশন B — Vercel

```bash
npm i -g vercel
vercel --prod
```

Framework preset: **Other**, Output directory: `public`।

### অপশন C — GitHub Pages

1. রিপো → **Settings → Pages**
2. Source: **Deploy from a branch** → Branch `main`, folder `/public`
3. সাইট লাইভ হবে `https://Sayan712123.github.io/gouri-travels/`

> GitHub Pages-এ `/admin` আলাদা ফোল্ডার হিসেবে সার্ভ হয় না — অ্যাডমিনের জন্য Netlify/Vercel ব্যবহার করা ভালো।

### পাবলিশের পর করণীয়

- Supabase → **Authentication → URL Configuration** এ `Site URL` ও `Redirect URLs`-এ লাইভ ডোমেইন যোগ করুন।
- `public/js/config.js` এ `SITE_URL` লাইভ ডোমেইনে বদলান।
- কাস্টম ডোমেইন (যেমন `gouritravels.in`) যোগ করতে Netlify/Vercel এর Domain settings ব্যবহার করুন।

---

## ডেটাবেস টেবিল সংক্ষেপে

| টেবিল | কাজ | পাবলিক অ্যাক্সেস |
|---|---|---|
| `trips` | ট্রিপ প্যাকেজ | শুধু `is_active = true` পড়তে পারে |
| `bookings` | বুকিং রিকোয়েস্ট | শুধু insert (status `pending`) |
| `enquiries` | কন্টাক্ট ফর্ম | শুধু insert |
| `admins` | অ্যাডমিন লিস্ট | কেউ পড়তে পারে না (শুধু is_admin) |

সব রাইট/রিড অ্যাডমিনের জন্য `public.is_admin()` ফাংশন দিয়ে RLS-এ নিয়ন্ত্রিত।

## নিরাপত্তা নোট

- `anon` key পাবলিক, কিন্তু RLS সব ডেটা রক্ষা করে — পলিসি বদলাবেন না।
- বুকিং ফর্মে `status` সবসময় `pending` হিসেবে যায়; কনফার্ম করা যায় শুধু অ্যাডমিন প্যানেল থেকে।
- প্রোডাকশনে যাওয়ার আগে Supabase-এ **Email confirmation** চালু রাখুন।

## লাইসেন্স

MIT — Gouri Travels এর জন্য তৈরি।
