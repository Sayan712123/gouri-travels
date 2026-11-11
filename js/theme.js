/* ---------------------------------------------------------------
 * Gouri Travels — theme (light / dark) + intro animation
 *
 * • ডিফল্ট থিম: dark (ব্র্যান্ডের কালো ব্যাকগ্রাউন্ড)
 * • ইউজারের পছন্দ localStorage-এ সেভ হয় (key: gt_theme)
 * • ইন্ট্রো অ্যানিমেশন: সেশনপ্রতি একবার (sessionStorage: gt_intro_seen)
 * • <html data-theme="dark"> লোডের শুরুতেই সেট হয়, তাই কোনো flash হয় না
 * ------------------------------------------------------------- */
(function () {
  var TKEY = "gt_theme";
  var IKEY = "gt_intro_seen";
  var root = document.documentElement;

  /* ---------------- theme ---------------- */
  function readTheme() {
    try {
      var v = localStorage.getItem(TKEY);
      if (v === "dark" || v === "light") return v;
    } catch (e) {}
    return "dark";
  }

  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    root.setAttribute("data-bs-theme", t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "dark" ? "#0a090b" : "#fbfaf9");
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      var isDark = t === "dark";
      b.setAttribute("aria-pressed", isDark ? "true" : "false");
      b.setAttribute("title", isDark ? "Light mode" : "Dark mode");
      b.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    });
  }

  function setTheme(t, persist) {
    if (t !== "dark" && t !== "light") return;
    applyTheme(t);
    if (persist !== false) {
      try { localStorage.setItem(TKEY, t); } catch (e) {}
    }
  }

  function toggleTheme() {
    setTheme(readTheme() === "dark" ? "light" : "dark", true);
  }

  /* apply immediately — before first paint */
  applyTheme(readTheme());

  window.GT_THEME = {
    get: readTheme,
    set: setTheme,
    toggle: toggleTheme
  };

  /* ---------------- path to assets/ ---------------- */
  function assetBase() {
    // find this script's own src so admin/ pages resolve ../assets/
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName("script");
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && /theme\.js/.test(all[i].src)) { s = all[i]; break; }
      }
    }
    var src = s && s.src ? s.src : "";
    var m = src.match(/^(.*\/)js\/theme\.js/);
    return m ? m[1] : "";
  }

  /* ---------------- intro animation ---------------- */
  function alreadySeen() {
    try { return sessionStorage.getItem(IKEY) === "1"; } catch (e) { return false; }
  }
  function markSeen() {
    try { sessionStorage.setItem(IKEY, "1"); } catch (e) {}
  }

  function reduceMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { return false; }
  }

  /* the splash tagline follows the chosen language */
  function tagline() {
    if (window.GT_I18N && window.GT_I18N.t) {
      var v = window.GT_I18N.t("intro.tagline", "");
      if (v) return v;
    }
    return "Journeys worth remembering";
  }

  function runIntro() {
    if (alreadySeen() || reduceMotion()) return;

    markSeen();
    document.body.classList.add("gt-intro-lock");

    var wrap = document.createElement("div");
    wrap.id = "gt-intro";
    wrap.setAttribute("role", "presentation");
    wrap.innerHTML =
      '<div class="intro-glow"></div>' +
      '<div class="intro-stack">' +
      '<img class="intro-logo" alt="Gouri Travels" src="' + assetBase() + 'assets/logo-full-dark.png" />' +
      '<div class="intro-tagline">' + tagline() + "</div>" +
      '<div class="intro-bar"></div>' +
      "</div>";

    document.body.appendChild(wrap);

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      wrap.classList.add("is-out");
      document.body.classList.remove("gt-intro-lock");
      setTimeout(function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }, 700);
    }

    // let the animation play, then lift the curtain
    setTimeout(close, 2050);

    // a click / key press skips it — never trap the visitor
    wrap.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ---------------- wiring ---------------- */
  function boot() {
    applyTheme(readTheme());

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-theme-toggle]");
      if (btn) { e.preventDefault(); toggleTheme(); }
    });

    // only the public landing pages get the splash (not the admin panel)
    var isAdmin = /\/admin\//.test(location.pathname);
    if (!isAdmin && document.body) runIntro();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
