/* ---------------------------------------------------------------
 * Gouri Travels — site configuration
 *
 * ⚠️  এখানে আপনার বিদ্যমান Supabase প্রজেক্টের দুটি মান বসান:
 *     1) SUPABASE_URL      → Supabase Dashboard → Project Settings → API → Project URL
 *     2) SUPABASE_ANON_KEY → একই পেজের "anon / public" key
 *
 * anon key ব্রাউজারে থাকা স্বাভাবিক — RLS পলিসি ডেটা সুরক্ষিত রাখে।
 * service_role key কখনোই এখানে বসাবেন না।
 *
 * দুটি মান বসানো না থাকলে সাইটটি "ডেমো মোড"-এ চলবে:
 * ডেমো ট্রিপ দেখাবে, বুকিং সেভ হবে না (শুধু মেসেজ দেখাবে)।
 * ------------------------------------------------------------- */
window.GT_CONFIG = {
  SUPABASE_URL: "https://your-project-ref.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key",

  BRAND_NAME: "Gouri Travels",
  TAGLINE: "আপনার পরবর্তী যাত্রা, আমাদের দায়িত্বে",
  PHONE: "+91 90000 00000",
  WHATSAPP_NUMBER: "919000000000",
  EMAIL: "hello@gouritravels.in",
  ADDRESS: "Station Road, Kolkata, West Bengal 700001",

  /* GitHub Pages লাইভ URL */
  SITE_URL: "https://sayan712123.github.io/gouri-travels",
};
