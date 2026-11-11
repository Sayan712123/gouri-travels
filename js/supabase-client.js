/* ---------------------------------------------------------------
 * Shared Supabase client for the public site.
 * Requires: @supabase/supabase-js v2 (UMD) loaded before this file.
 * ------------------------------------------------------------- */
(function () {
  const cfg = window.GT_CONFIG || {};

  const configured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("your-project-ref") &&
    !cfg.SUPABASE_ANON_KEY.includes("your-anon-public-key");

  window.gtConfigured = !!configured;

  if (configured && window.supabase) {
    window.gtClient = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY
    );
  } else {
    window.gtClient = null;
  }
})();
