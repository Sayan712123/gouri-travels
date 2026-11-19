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
 * ------------------------------------------------------------- */
window.GT_CONFIG = {
  SUPABASE_URL: "https://kjoynpeidivqqanwfsno.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_-zosCdXmn_UzfvHMeXSXLw_smvznBnY",
  CONTENT_KEY: "site_content",
};
