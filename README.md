# Gouri Travels — ট্রিপ বুকিং ওয়েবসাইট

পাবলিক সাইট + অ্যাডমিন প্যানেল + Supabase স্কিমা — সব একসাথে।

🌐 **লাইভ সাইট:** https://sayan712123.github.io/gouri-travels/
🔐 **অ্যাডমিন প্যানেল:** https://sayan712123.github.io/gouri-travels/admin/

---

## 📁 ফোল্ডার স্ট্রাকচার

GitHub Pages সরাসরি **রিপোর রুট** থেকে সাইট চালায়, তাই পাবলিক সাইটের ফাইলগুলো রুটে রাখা হয়েছে:

```
gouri-travels/
├── index.html              ← হোমপেজ
├── trips.html              ← সব ট্রিপ + ফিল্টার
├── trip.html               ← ট্রিপ ডিটেইল (?slug=...)
├── booking.html            ← বুকিং ফর্ম
├── contact.html            ← যোগাযোগ / এনকোয়ারি
├── css/styles.css          ← পাবলিক সাইটের স্টাইল
├── js/
│   ├── config.js           ← ⚠️ আপনার Supabase URL + anon key এখানে
│   ├── supabase-client.js  ← Supabase ক্লায়েন্ট
│   └── site.js             ← শেয়ার্ড হেল্পার + ডেমো ডেটা
├── admin/
│   ├── index.html          ← অ্যাডমিন লগইন
│   ├── dashboard.html      ← ড্যাশবোর্ড
│   ├── css/admin.css
│   └── js/
│       ├── config.js       ← ⚠️ একই Supabase URL + anon key
│       └── admin.js
├── supabase/schema.sql     ← টেবিল + RLS + স্টোরেজ + ডেমো ট্রিপ
├── docs/SETUP.md           ← বিস্তারিত সেটআপ গাইড
├── .nojekyll               ← GitHub Pages-এ Jekyll বন্ধ রাখে
└── .env.example
```

---

## 🚀 ধাপ ১ — Supabase কনফিগার করুন

আপনার Supabase প্রজেক্ট **অলরেডি আছে** ধরে নিয়ে:

1. **Supabase Dashboard → Project Settings → API** খুলুন।
2. দুটি মান কপি করুন:
   - **Project URL** → যেমন `https://abcdefgh.supabase.co`
   - **anon / public** key → `eyJhbGciOi...` দিয়ে শুরু হওয়া লম্বা স্ট্রিং

3. এই দুটি মান **দুটি ফাইলে** বসান (একই মান, দুই জায়গায়):

   **`js/config.js`**
   ```js
   window.GT_CONFIG = {
     SUPABASE_URL: "https://abcdefgh.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi...",
     ...
   };
   ```

   **`admin/js/config.js`**
   ```js
   window.GT_ADMIN_CONFIG = {
     SUPABASE_URL: "https://abcdefgh.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi...",
     BRAND_NAME: "Gouri Travels",
   };
   ```

4. **স্কিমা চালান** (একবারই লাগে): Supabase Dashboard → **SQL Editor** → New query → `supabase/schema.sql` ফাইলের পুরো কনটেন্ট পেস্ট করে **Run**।
   এটি তৈরি করবে: `trips`, `bookings`, `enquiries`, `admins` টেবিল, `is_admin()` হেল্পার, সম্পূর্ণ RLS পলিসি, `trip-images` স্টোরেজ বাকেট এবং ৬টি ডেমো ট্রিপ। স্ক্রিপ্টটি **idempotent** — বারবার চালালেও সমস্যা নেই।

> ⚠️ **`service_role` key কখনোই `config.js`-এ বসাবেন না।** শুধু `anon` key — এটাই ব্রাউজারে থাকার জন্য নিরাপদ, কারণ RLS ডেটা সুরক্ষিত রাখে।

> 💡 **ডেমো মোড:** উপরের দুটি মান বসানো না থাকলে সাইটটি নমুনা ট্রিপ দিয়ে চলবে (বুকিং সেভ হবে না) — শুধু প্রিভিউয়ের জন্য। মান বসালেই আসল ডেটা চালু হবে।

---

## 🔐 ধাপ ২ — অ্যাডমিন ইউজার তৈরি করুন

1. Supabase Dashboard → **Authentication → Users → Add user** → ইমেইল ও পাসওয়ার্ড দিন (Auto Confirm User চালু রাখুন)।
2. সেই ইউজারের **UID** কপি করুন।
3. **SQL Editor**-এ চালান:

```sql
insert into public.admins (user_id, email)
values ('এখানে-ইউজারের-UID-পেস্ট-করুন', 'admin@example.com');
```

4. এখন https://sayan712123.github.io/gouri-travels/admin/ এ গিয়ে ওই ইমেইল/পাসওয়ার্ড দিয়ে লগইন করুন।

---

## 🌐 ধাপ ৩ — GitHub Pages (অলরেডি চালু)

সাইটটি ইতিমধ্যে লাইভ:

- **Settings → Pages → Source:** `Deploy from a branch` → Branch: **`main`** → Folder: **`/ (root)`**
- রুটে `.nojekyll` ফাইল থাকায় GitHub Pages Jekyll প্রসেসিং বাদ দিয়ে ফাইলগুলো হুবহু সার্ভ করে।
- সব লিংক **রিলেটিভ** (`css/styles.css`, `js/config.js`, `admin/index.html`) — তাই সাব-পাথে (`/gouri-travels/`) সব ঠিকঠাক লোড হয়।

**আপডেট করার পর:** `main` ব্রাঞ্চে পুশ করলেই ১–২ মিনিটে সাইট নিজে থেকে আপডেট হয়।

### নিজের ডোমেইন (যেমন gouritravels.in) লাগলে
1. **Settings → Pages → Custom domain**-এ ডোমেইন লিখুন।
2. আপনার DNS প্রোভাইডারে একটি `CNAME` রেকর্ড যোগ করুন: `www` → `sayan712123.github.io`
3. **Enforce HTTPS** টিক দিন।

---

## 💻 লোকালি চালানো

```bash
# রিপো ক্লোন করুন
git clone https://github.com/Sayan712123/gouri-travels.git
cd gouri-travels

# যেকোনো স্ট্যাটিক সার্ভার চালান
python3 -m http.server 5173
```

তারপর ব্রাউজারে খুলুন: http://localhost:5173/ (অ্যাডমিন: http://localhost:5173/admin/)

> `file://` দিয়ে সরাসরি HTML খুললে Supabase লোড নাও হতে পারে — তাই ছোট একটি সার্ভার ব্যবহার করুন।

---

## 🧩 ফিচার

**পাবলিক সাইট**
- হোমপেজ: হিরো, সার্চ বার, ফিচার্ড ট্রিপ, রিভিউ, CTA
- সব ট্রিপ: দিন/বাজেট ফিল্টার + সার্চ
- ট্রিপ ডিটেইল: হাইলাইটস, দিন-ভিত্তিক itinerary, স্টিকি বুকিং কার্ড
- বুকিং ফর্ম: লাইভ প্রাইস ক্যালকুলেশন, অটো-জেনারেটেড বুকিং কোড
- যোগাযোগ ফর্ম → অ্যাডমিন ইনবক্সে যায়
- মোবাইল-ফার্স্ট, বাংলা ফন্ট (Hind Siliguri), হোয়াইট + ব্লু থিম

**অ্যাডমিন প্যানেল**
- Supabase Auth লগইন + `is_admin()` চেক
- ৬টি স্ট্যাট কার্ড (মোট বুকিং, পেন্ডিং, কনফার্মড, আনুমানিক আয়, অ্যাক্টিভ ট্রিপ, অপঠিত মেসেজ)
- বুকিং লিস্ট: সার্চ, স্টেটাস ফিল্টার, Confirm / Cancel / View
- ট্রিপ CRUD: মোডাল ফর্ম, Hide / Show, Delete
- মেসেজ ইনবক্স: read / unread

---

## 🛠 সমস্যা হলে

| সমস্যা | সমাধান |
|---|---|
| সাইটে "ডেমো মোড" লেখা দেখাচ্ছে | `js/config.js`-এ Project URL ও anon key বসান, তারপর হার্ড রিফ্রেশ (Ctrl+Shift+R) |
| ট্রিপ লোড হচ্ছে না | `supabase/schema.sql` চালানো হয়েছে কিনা দেখুন; RLS পলিসি ঠিক আছে কিনা যাচাই করুন |
| অ্যাডমিনে "এই অ্যাকাউন্টটি অ্যাডমিন নয়" | `admins` টেবিলে আপনার UID insert করুন (ধাপ ২) |
| CSS/JS লোড হচ্ছে না | ফাইল পাথ রিলেটিভ আছে কিনা দেখুন; `.nojekyll` ফাইলটি রিপোতে আছে কিনা নিশ্চিত করুন |
| পেজ ৪০৪ দেখাচ্ছে | GitHub Pages বিল্ড শেষ হতে ১–২ মিনিট দিন; Settings → Pages-এ সোর্স `main` / `root` কিনা দেখুন |

আরও বিস্তারিত: [`docs/SETUP.md`](docs/SETUP.md)

---

## 🔒 নিরাপত্তা

- `service_role` key কোথাও কমিট করা হয়নি — শুধু `anon` key-এর প্লেসহোল্ডার আছে।
- সব টেবিলে **Row Level Security** চালু; পাবলিক শুধু অ্যাক্টিভ ট্রিপ পড়তে পারে ও বুকিং/এনকোয়ারি লিখতে পারে।
- অ্যাডমিন-শুধু অপারেশন `is_admin()` security-definer ফাংশন দিয়ে সুরক্ষিত।
- `.gitignore`-এ `.env` আছে — আসল সিক্রেট কখনো কমিট হবে না।
