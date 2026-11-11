/* ---------------------------------------------------------------
 * Gouri Travels — site configuration
 *
 * এই ফাইলে ব্যবহারকারীর বিদ্যমান (existing) Supabase প্রজেক্টের
 * Project URL ও anon/public key বসানো আছে।
 *
 *   Project URL      → Supabase Dashboard → Project Settings → API
 *   anon public key  → একই পেজের "anon / public" key
 *
 * anon key ব্রাউজারে থাকা স্বাভাবিক — RLS পলিসি ডেটা সুরক্ষিত রাখে।
 * service_role key কখনোই এখানে বসাবেন না।
 * ------------------------------------------------------------- */
window.GT_CONFIG = {
  /* ---- বিদ্যমান Supabase প্রজেক্ট (আগের সাইট থেকেই নেওয়া) ---- */
  SUPABASE_URL: "https://kjoynpeidivqqanwfsno.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_-zosCdXmn_UzfvHMeXSXLw_smvznBnY",

  /* ---- ব্র্যান্ড ---- */
  BRAND_NAME: "Gouri Travels",
  SITE_URL: "https://sayan712123.github.io/gouri-travels",

  /* ---- ভাষা: পেজ প্রথমে ইংরেজিতে খুলবে ---- */
  DEFAULT_LANG: "en",

  /* ---- Supabase Storage bucket (ছবির জন্য) ---- */
  STORAGE_BUCKET: "trip-photos",
};
