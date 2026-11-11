/* ---------------------------------------------------------------
 * Shared Supabase client for the public site.
 * Requires: @supabase/supabase-js v2 (UMD) loaded before this file.
 * ------------------------------------------------------------- */
(function () {
  var cfg = window.GT_CONFIG || {};

  var configured =
    !!cfg.SUPABASE_URL &&
    !!cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf("your-project-ref") === -1 &&
    cfg.SUPABASE_ANON_KEY.indexOf("your-anon-public-key") === -1;

  window.gtConfigured = !!configured;

  if (configured && window.supabase) {
    window.gtClient = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  } else {
    window.gtClient = null;
  }
})();
