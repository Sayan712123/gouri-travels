/* ---------------------------------------------------------------
 * Gouri Travels — admin panel configuration
 *
 * js/config.js-এ যে মানগুলো দিয়েছেন, ঠিক সেগুলোই এখানে বসানো আছে।
 *
 *   SUPABASE_URL      → Project Settings → API → Project URL
 *   SUPABASE_ANON_KEY → একই পেজের anon / publishable key
 *
 * service_role key কখনোই এখানে বসাবেন না।
 *
 * অ্যাডমিন প্যানেলের "Supabase" ট্যাব থেকে এই মানগুলো বদলানো যায়।
 * সেভ করা মান এই ব্রাউজারের localStorage-এ "gt_sb_config" কী-তে থাকে
 * এবং নিচের ডিফল্টকে ওভাররাইড করে।
 * ------------------------------------------------------------- */
(function () {
  var DEFAULTS = {
    SUPABASE_URL: "https://kjoynpeidivqqanwfsno.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_-zosCdXmn_UzfvHMeXSXLw_smvznBnY",
    BRAND_NAME: "Gouri Travels",
    DEFAULT_LANG: "en",
    STORAGE_BUCKET: "trip-photos",
    CONTENT_KEY: "site_content",
  };

  var saved = null;
  try {
    saved = JSON.parse(localStorage.getItem("gt_sb_config") || "null");
  } catch (e) {
    saved = null;
  }

  window.GT_ADMIN_CONFIG = {
    SUPABASE_URL: (saved && saved.SUPABASE_URL) || DEFAULTS.SUPABASE_URL,
    SUPABASE_ANON_KEY: (saved && saved.SUPABASE_ANON_KEY) || DEFAULTS.SUPABASE_ANON_KEY,
    BRAND_NAME: DEFAULTS.BRAND_NAME,
    DEFAULT_LANG: DEFAULTS.DEFAULT_LANG,
    STORAGE_BUCKET: DEFAULTS.STORAGE_BUCKET,
    CONTENT_KEY: DEFAULTS.CONTENT_KEY,
  };
  window.GT_ADMIN_CONFIG_DEFAULTS = DEFAULTS;
})();
