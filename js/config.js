/* ---------------------------------------------------------------
 * Gouri Travels — public site configuration
 *
 * Same Supabase project as the admin panel. The anon (publishable) key
 * is safe to ship: every table is protected by row level security, so
 * this key can only read what the public is allowed to read.
 *
 *   SUPABASE_URL      → Project Settings → API → Project URL
 *   SUPABASE_ANON_KEY → the anon / publishable key on the same page
 *
 * Never put the service_role key here.
 *
 * The admin panel can change these at runtime (Admin → Supabase). The
 * values it saves live in this browser's localStorage under
 * "gt_sb_config" and override the defaults below, so the public site
 * follows whatever project the admin connected to.
 * ------------------------------------------------------------- */
(function () {
  var DEFAULTS = {
    SUPABASE_URL: "https://kjoynpeidivqqanwfsno.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_-zosCdXmn_UzfvHMeXSXLw_smvznBnY",
    CONTENT_KEY: "site_content",
  };

  var saved = null;
  try {
    saved = JSON.parse(localStorage.getItem("gt_sb_config") || "null");
  } catch (e) {
    saved = null;
  }

  window.GT_CONFIG = {
    SUPABASE_URL: (saved && saved.SUPABASE_URL) || DEFAULTS.SUPABASE_URL,
    SUPABASE_ANON_KEY: (saved && saved.SUPABASE_ANON_KEY) || DEFAULTS.SUPABASE_ANON_KEY,
    CONTENT_KEY: DEFAULTS.CONTENT_KEY,
  };
  window.GT_CONFIG_DEFAULTS = DEFAULTS;
})();
