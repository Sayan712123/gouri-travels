/* ---------------------------------------------------------------
 * Gouri Travels — admin panel configuration
 *
 * ⚠️  এখানে আপনার বিদ্যমান Supabase প্রজেক্টের দুটি মান বসান
 *     (js/config.js-এ যেগুলো দিয়েছেন, ঠিক সেগুলোই):
 *       SUPABASE_URL      → Project Settings → API → Project URL
 *       SUPABASE_ANON_KEY → একই পেজের anon / public key
 *
 * মান বসানো না থাকলে অ্যাডমিন প্যানেল "ডেমো মোড"-এ ড্যাশবোর্ড
 * দেখাবে (লগইন ছাড়া, শুধু প্রিভিউ — কোনো ডেটা বদলাবে না)।
 * ------------------------------------------------------------- */
window.GT_ADMIN_CONFIG = {
  SUPABASE_URL: "https://your-project-ref.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key",
  BRAND_NAME: "Gouri Travels",
};
