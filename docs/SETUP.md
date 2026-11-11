# Gouri Travels — বিস্তারিত সেটআপ গাইড

এই ডকুমেন্টে ধাপে ধাপে পুরো সিস্টেম চালু করার নির্দেশনা আছে।

---

## ০. যা যা লাগবে

- একটি [Supabase](https://supabase.com) অ্যাকাউন্ট (ফ্রি টিয়ার যথেষ্ট)
- একটি স্ট্যাটিক হোস্টিং (Netlify / Vercel / GitHub Pages)
- আধুনিক ব্রাউজার

কোনো Node.js বিল্ড স্টেপ নেই — পুরো সাইট প্লেইন HTML/CSS/JS।

---

## ১. Supabase প্রজেক্ট

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name: `gouri-travels`
3. Database password: শক্ত পাসওয়ার্ড (সংরক্ষণ করুন)
4. Region: `ap-south-1` (Mumbai) — ভারতের জন্য সবচেয়ে কম লেটেন্সি
5. **Create new project** → ২ মিনিট অপেক্ষা

### কী কী কপি করবেন

**Project Settings → API**

| মান | কোথায় বসবে |
|---|---|
| Project URL | `public/js/config.js` → `SUPABASE_URL` এবং `admin/js/config.js` → `SUPABASE_URL` |
| anon public key | একই দুই ফাইলে `SUPABASE_ANON_KEY` |
| service_role key | **কোথাও বসাবেন না** — শুধু লোকাল স্ক্রিপ্টে |

---

## ২. স্কিমা রান করা

1. Supabase → **SQL Editor** → **New query**
2. `supabase/schema.sql` এর পুরো কন্টেন্ট কপি-পেস্ট
3. **Run** (Ctrl/Cmd + Enter)

### যা তৈরি হবে

- `trips` — ট্রিপ প্যাকেজ (৬টি ডেমো ডেটা সহ)
- `bookings` — বুকিং রিকোয়েস্ট, অটো-জেনারেটেড `booking_code`
- `enquiries` — কন্টাক্ট ফর্ম মেসেজ
- `admins` — কে অ্যাডমিন
- `is_admin()` — RLS-এর জন্য helper ফাংশন
- `trip-images` — পাবলিক স্টোরেজ বাকেট
- সব টেবিলে RLS পলিসি

> স্ক্রিপ্টটি idempotent — ভুল হলে আবার চালাতে পারেন।

---

## ৩. কনফিগ ফাইল

### `public/js/config.js`

```js
window.GT_CONFIG = {
  SUPABASE_URL: "https://abcdefgh.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  BRAND_NAME: "Gouri Travels",
  PHONE: "+91 98765 43210",
  WHATSAPP_NUMBER: "919876543210",   // কান্ট্রি কোড সহ, + ছাড়া
  EMAIL: "hello@gouritravels.in",
  ADDRESS: "Station Road, Kolkata 700001",
  SITE_URL: "https://gouritravels.in",
};
```

### `admin/js/config.js`

```js
window.GT_ADMIN_CONFIG = {
  SUPABASE_URL: "https://abcdefgh.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  BRAND_NAME: "Gouri Travels",
};
```

> দুটো ফাইলে **একই** URL ও key বসবে।

---

## ৪. অ্যাডমিন অ্যাকাউন্ট

### ক) ইউজার তৈরি

Supabase → **Authentication → Users → Add user → Create new user**

- Email: `admin@gouritravels.in`
- Password: শক্ত পাসওয়ার্ড
- ✅ **Auto Confirm User** টিক দিন

### খ) অ্যাডমিন হিসেবে রেজিস্টার

SQL Editor-এ:

```sql
insert into public.admins (user_id, email, full_name)
select id, email, 'Gouri Travels Admin'
from auth.users
where email = 'admin@gouritravels.in'
on conflict (user_id) do nothing;
```

### গ) লগইন টেস্ট

`admin/index.html` খুলুন → ইমেইল/পাসওয়ার্ড দিন → ড্যাশবোর্ডে যাওয়া উচিত।

যদি “এই অ্যাকাউন্টটি অ্যাডমিন নয়” দেখায়, তাহলে (খ) ধাপটি আবার চালান।

---

## ৫. লোকাল ডেভেলপমেন্ট

```bash
# রিপো ক্লোন
git clone https://github.com/Sayan712123/gouri-travels.git
cd gouri-travels

# স্ট্যাটিক সার্ভার (Python)
python3 -m http.server 5173

# অথবা Node
npx serve -l 5173 .
```

- পাবলিক সাইট: <http://localhost:5173/public/>
- অ্যাডমিন: <http://localhost:5173/admin/>

> ⚠️ `file://` দিয়ে খুললে Supabase API কল ব্লক হবে — সার্ভার ব্যবহার করতেই হবে।

---

## ৬. ডিপ্লয়

### Netlify (সুপারিশকৃত)

**পাবলিক সাইট:**
1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. GitHub → `gouri-travels` সিলেক্ট
3. Build command: *(ফাঁকা)*
4. Publish directory: `public`
5. **Deploy site**

**অ্যাডমিন প্যানেল:**
1. আবার **Add new site** → একই রিপো
2. Publish directory: `admin`
3. সাইটের নাম দিন যেমন `gouri-admin`

### Vercel

```bash
npm i -g vercel
vercel --prod
# Framework: Other, Output: public
```

### GitHub Pages (শুধু পাবলিক সাইট)

Settings → Pages → Source: **Deploy from a branch** → `main` / `/public`

লাইভ URL: `https://Sayan712123.github.io/gouri-travels/`

---

## ৭. ডিপ্লয়ের পর

1. Supabase → **Authentication → URL Configuration**
   - Site URL: `https://your-site.netlify.app`
   - Redirect URLs: `https://your-site.netlify.app/**`
2. `public/js/config.js` এ `SITE_URL` আপডেট করুন
3. কাস্টম ডোমেইন যোগ করুন (Netlify → Domain settings)
4. Supabase → **Authentication → Providers → Email** এ Email confirmation চালু রাখুন

---

## ৮. দৈনন্দিন ব্যবহার

### নতুন বুকিং এলে

1. অ্যাডমিন → **বুকিং** ট্যাব
2. যাত্রীকে কল করে ডিটেইলস কনফার্ম করুন
3. **Confirm** চাপুন
4. প্রয়োজনে ট্রিপের `seats_booked` ম্যানুয়ালি বাড়ান (ট্রিপ এডিট থেকে)

### নতুন ট্রিপ যোগ করা

1. **+ নতুন ট্রিপ**
2. টাইটেল, স্লাগ (ইংরেজি, হাইফেন দিয়ে), গন্তব্য, দাম, সিট, তারিখ দিন
3. হাইলাইটস কমা দিয়ে লিখুন: `Tiger Hill, Tea garden, Toy train`
4. **সেভ করুন**

### ট্রিপ লুকানো

ট্রিপ লিস্টে **Hide** চাপুন — পাবলিক সাইট থেকে সরে যাবে, ডেটা থাকবে।

---

## ৯. সমস্যা সমাধান

| সমস্যা | কারণ | সমাধান |
|---|---|---|
| “Supabase কনফিগার করা হয়নি” | config.js এ placeholder আছে | আসল URL/key বসান |
| ট্রিপ লিস্ট খালি | RLS বা `is_active = false` | SQL Editor-এ `select * from trips;` দেখুন |
| বুকিং সেভ হয় না | RLS পলিসি মিসিং | `schema.sql` আবার রান করুন |
| অ্যাডমিন লগইনে “Invalid login” | ইউজার কনফার্ম হয়নি | Authentication → Users → Confirm |
| “এই অ্যাকাউন্টটি অ্যাডমিন নয়” | `admins` টেবিলে নেই | ধাপ ৪(খ) রান করুন |
| ছবি আপলোড হয় না | স্টোরেজ পলিসি | `schema.sql` এর storage অংশ রান করুন |

---

## ১০. ফাইল ম্যাপ

```
public/
  index.html      হোম পেজ
  trips.html      ট্রিপ লিস্ট + ফিল্টার
  trip.html       ট্রিপ ডিটেইল (?slug=)
  booking.html    বুকিং ফর্ম (?trip=)
  contact.html    কন্টাক্ট ফর্ম
  css/styles.css
  js/config.js          ← আপনার মান এখানে
  js/supabase-client.js
  js/site.js

admin/
  index.html      লগইন
  dashboard.html  বুকিং / ট্রিপ / মেসেজ
  css/admin.css
  js/config.js          ← আপনার মান এখানে
  js/admin.js

supabase/
  schema.sql      পুরো ডেটাবেস
```
