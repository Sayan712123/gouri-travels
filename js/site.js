/* ---------------------------------------------------------------
 * Gouri Travels — public site data layer
 *
 * এই ফাইলটি ব্যবহারকারীর বিদ্যমান Supabase প্রজেক্টের আসল স্কিমার
 * সাথে কথা বলে:
 *
 *   trips     : id, title, from_place, to_place, trip_date, trip_time,
 *               price, boarding, details, thumb, photos[], seats, open,
 *               created_at, kind, vehicle_name, cars, per_car
 *   seats     : trip_id, label, status, name, phone, held_until,
 *               ticket, note, created_at
 *   settings  : key, value
 *   admins    : email
 *   view      : seat_status (trip_id, label, status)
 *   rpc       : hold_seats, my_bookings, get_ticket, is_admin
 *   storage   : trip-photos (public)
 *
 * details ফিল্ডে সেকশন থাকে: ##ov ##hl ##it ##inc ##exc ##pol ##meal ##cl ##days
 * ------------------------------------------------------------- */
window.GT = window.GT || {};

(function () {
  var cfg = window.GT_CONFIG || {};
  var sb = window.gtClient || null;
  var BUCKET = cfg.STORAGE_BUCKET || "trip-photos";

  var S = {
    trips: [],
    seats: {},
    settings: {},
    user: null,
    admin: false,
    loaded: false,
  };

  /* ---------------- i18n shortcut ---------------- */
  function t(key, fallback) {
    if (window.GT_I18N) return window.GT_I18N.t(key, fallback);
    return fallback !== undefined ? fallback : key;
  }

  /* ---------------- small helpers ---------------- */
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function inr(n) {
    var v = Number(n || 0);
    return "\u20b9" + v.toLocaleString("en-IN");
  }

  function prettyDate(d) {
    if (!d) return "\u2014";
    var dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function lines(s) {
    return String(s == null ? "" : s)
      .split("\n")
      .map(function (x) { return x.trim(); })
      .filter(Boolean);
  }

  /* ---------------- details section parser ---------------- */
  var KEYS = ["ov", "hl", "it", "inc", "exc", "pol", "meal", "cl", "days"];

  function parseDetails(d) {
    var o = { ov: "", hl: "", it: "", inc: "", exc: "", pol: "", meal: "", cl: "", days: "" };
    if (!d) return o;
    var p = String(d).split(/^##(ov|hl|it|inc|exc|pol|meal|cl|days)\s*$/m);
    o.ov = (p[0] || "").trim();
    for (var i = 1; i < p.length; i += 2) o[p[i]] = (p[i + 1] || "").trim();
    return o;
  }

  function packDetails(o) {
    return KEYS.map(function (k) { return "##" + k + "\n" + (o[k] || ""); }).join("\n");
  }

  function daysOf(trip) {
    var d = parseDetails(trip && trip.details);
    try {
      var a = JSON.parse(d.days || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function closeAt(trip) {
    var c = parseDetails(trip && trip.details).cl;
    if (!c) return null;
    var dt = new Date(String(c).replace(" ", "T"));
    return isNaN(dt.getTime()) ? null : dt;
  }

  function isClosed(trip) {
    var d = closeAt(trip);
    return !!d && d.getTime() < Date.now();
  }

  /* ---------------- seat helpers ---------------- */
  function taken(trip) {
    return Object.keys(S.seats[trip.id] || {}).length;
  }

  function seatsLeft(trip) {
    return Math.max(0, Number(trip.seats || 0) - taken(trip));
  }

  function seatLabels(trip) {
    var n = Number(trip.seats || 0);
    var out = [];
    if (trip.kind === "train") {
      for (var i = 1; i <= n; i++) out.push("T" + i);
      return out;
    }
    if (trip.kind === "scorpio") {
      var cars = Number(trip.cars || 1);
      var per = Number(trip.per_car || 7);
      for (var c = 1; c <= cars; c++) {
        for (var q = 1; q <= per; q++) out.push("C" + c + "S" + q);
      }
      return out;
    }
    var letters = ["A", "B", "C", "D"];
    var rows = Math.ceil(n / 4);
    for (var r = 0; r < rows; r++) {
      for (var k = 0; k < 4; k++) {
        if (out.length < n) out.push(letters[k] + (r + 1));
      }
    }
    return out;
  }

  function prettyLabel(l) {
    var m = /^C(\d+)S(\d+)$/.exec(l);
    if (m) return t("book.car", "Car") + " " + m[1] + " \u00b7 " + t("book.package", "Package") + " " + m[2];
    return l;
  }

  /* ---------------- presentation ---------------- */
  function kindTag(trip) {
    if (trip.kind === "train") return "\ud83d\ude86 " + t("adm.train", "Train");
    if (trip.kind === "scorpio") {
      return "\ud83d\ude99 " + escapeHtml(String(trip.vehicle_name || "Scorpio")).toUpperCase();
    }
    return "\ud83d\ude8c " + t("adm.bus", "Bus");
  }

  function route(trip) {
    var a = trip.from_place || "";
    var b = trip.to_place || "";
    if (a && b) return escapeHtml(a) + " \u2192 " + escapeHtml(b);
    return escapeHtml(b || a || "");
  }

  function tripCard(trip) {
    var left = seatsLeft(trip);
    var img = trip.thumb || (trip.photos && trip.photos[0]) || "";
    var closed = isClosed(trip);
    var badge;
    if (closed) badge = '<span class="badge badge--muted">' + t("trip.closed") + "</span>";
    else if (!trip.open) badge = '<span class="badge badge--muted">' + t("trip.soon") + "</span>";
    else if (left <= 0) badge = '<span class="badge badge--muted">' + t("trip.noSeats") + "</span>";
    else badge = '<span class="badge">' + left + " " + t("trip.seatsLeftPill") + "</span>";

    var href = "trip.html?id=" + encodeURIComponent(trip.id);
    return (
      '<article class="trip-card">' +
      '<a class="trip-card__media" href="' + href + '">' +
      (img
        ? '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(trip.title) + '" loading="lazy" />'
        : '<div class="trip-card__ph"></div>') +
      badge +
      "</a>" +
      '<div class="trip-card__body">' +
      '<div class="trip-card__kind">' + kindTag(trip) + "</div>" +
      '<h3><a href="' + href + '">' + escapeHtml(trip.title) + "</a></h3>" +
      '<p class="trip-card__route">' + route(trip) + "</p>" +
      '<div class="trip-card__meta"><span>\ud83d\udcc5 ' + prettyDate(trip.trip_date) +
      (trip.trip_time ? " \u00b7 " + escapeHtml(trip.trip_time) : "") + "</span></div>" +
      '<div class="trip-card__foot">' +
      '<div class="price">' + inr(trip.price) + ' <small>/ ' + t("book.package", "package") + "</small></div>" +
      '<a class="btn btn--sm" href="' + href + '">' + t("trip.book") + "</a>" +
      "</div></div></article>"
    );
  }

  function skeletonCards(n) {
    var h = "";
    for (var i = 0; i < n; i++) {
      h +=
        '<div class="trip-card trip-card--sk"><div class="trip-card__media"></div>' +
        '<div class="trip-card__body"><div class="sk sk--t"></div><div class="sk sk--s"></div><div class="sk sk--s"></div></div></div>';
    }
    return h;
  }

  function toast(msg, type) {
    var d = document.createElement("div");
    d.className = "gt-toast" + (type === "error" ? " gt-toast--err" : "");
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2600);
  }

  /* ---------------- data loading ---------------- */
  async function load() {
    if (!sb) throw new Error("Supabase is not configured");
    var ses = (await sb.auth.getSession()).data.session;
    var user = ses ? ses.user : null;
    var admin = false;
    if (user) {
      try {
        var r = await sb.rpc("is_admin");
        admin = r.data === true;
      } catch (e) { /* ignore */ }
    }

    var res = await Promise.all([
      sb.from("trips").select("*").order("created_at", { ascending: false }),
      sb.from(admin ? "seats" : "seat_status").select("*"),
      sb.from("settings").select("*"),
    ]);

    var err = res[0].error || res[1].error || res[2].error;
    if (err) throw err;

    S.user = user;
    S.admin = admin;
    S.trips = res[0].data || [];

    S.seats = {};
    (res[1].data || []).forEach(function (r) {
      if (r.status === "held" && r.held_until && new Date(r.held_until) < new Date()) return;
      (S.seats[r.trip_id] = S.seats[r.trip_id] || {})[r.label] = r;
    });

    S.settings = {};
    (res[2].data || []).forEach(function (r) { S.settings[r.key] = r.value; });

    S.loaded = true;
    return S;
  }

  async function fetchTrips(limit) {
    if (!S.loaded) await load();
    var list = S.trips.slice();
    return limit ? list.slice(0, limit) : list;
  }

  async function fetchTripBySlug(key) {
    if (!S.loaded) await load();
    if (!key) return null;
    var byId = S.trips.filter(function (x) { return x.id === key; })[0];
    if (byId) return byId;
    var norm = String(key).toLowerCase();
    return (
      S.trips.filter(function (x) {
        var s = String(x.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return s === norm;
      })[0] || null
    );
  }

  function getSetting(k) {
    return S.settings[k];
  }

  function state() {
    return S;
  }

  /* ---------------- auth ---------------- */
  async function signInWithGoogle() {
    if (!sb) return;
    var back = location.origin + location.pathname + location.search;
    var r = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: back } });
    if (r.error) toast(r.error.message, "error");
  }

  async function signOut() {
    if (!sb) return;
    await sb.auth.signOut();
    location.reload();
  }

  /* ---------------- booking ---------------- */
  async function holdSeats(tripId, labels, name, phone) {
    if (!sb) throw new Error("Supabase is not configured");
    var r = await sb.rpc("hold_seats", {
      p_trip: tripId,
      p_labels: labels,
      p_name: name,
      p_phone: phone,
    });
    if (r.error) throw r.error;
    if (r.data === "login") {
      var e = new Error("login");
      e.code = "login";
      throw e;
    }
    return r.data;
  }

  async function myBookings() {
    if (!sb) return [];
    var r = await sb.rpc("my_bookings");
    if (r.error) throw r.error;
    return r.data || [];
  }

  async function getTicket(code) {
    if (!sb) return null;
    var r = await sb.rpc("get_ticket", { p_code: code });
    if (r.error) throw r.error;
    return r.data;
  }

  /* ---------------- links ---------------- */
  function waLink(msg) {
    var n = String(S.settings.wa || "").replace(/\D/g, "");
    return "https://wa.me/" + n + (msg ? "?text=" + encodeURIComponent(msg) : "");
  }

  function upiLink(amount, note) {
    var id = S.settings.upi;
    if (!id) return "";
    var name = S.settings.upi_name || cfg.BRAND_NAME || "Gouri Travels";
    return (
      "upi://pay?pa=" + encodeURIComponent(id) +
      "&pn=" + encodeURIComponent(name) +
      "&am=" + encodeURIComponent(amount) +
      "&cu=INR" +
      "&tn=" + encodeURIComponent(note || "Trip booking")
    );
  }

  /* ---------------- brand binding ---------------- */
  function applyBrand() {
    var brand = S.settings.brand || cfg.BRAND_NAME || "Gouri Travels";
    document.querySelectorAll("[data-brand]").forEach(function (el) { el.textContent = brand; });
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

    var phone = S.settings.phone || "";
    document.querySelectorAll("[data-phone]").forEach(function (el) {
      if (phone) { el.textContent = phone; el.setAttribute("href", "tel:" + phone); }
    });
    document.querySelectorAll("[data-whatsapp]").forEach(function (el) {
      el.setAttribute("href", waLink(t("contact.waIntro", "Hi, I want to know about your trips")));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    });
  }

  /* ---------------- exports ---------------- */
  window.GT = Object.assign(window.GT, {
    t: t,
    state: state,
    load: load,
    fetchTrips: fetchTrips,
    fetchTripBySlug: fetchTripBySlug,
    getSetting: getSetting,
    tripCard: tripCard,
    skeletonCards: skeletonCards,
    escapeHtml: escapeHtml,
    inr: inr,
    prettyDate: prettyDate,
    lines: lines,
    parseDetails: parseDetails,
    packDetails: packDetails,
    daysOf: daysOf,
    closeAt: closeAt,
    isClosed: isClosed,
    taken: taken,
    seatsLeft: seatsLeft,
    seatLabels: seatLabels,
    prettyLabel: prettyLabel,
    kindTag: kindTag,
    route: route,
    toast: toast,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    holdSeats: holdSeats,
    myBookings: myBookings,
    getTicket: getTicket,
    waLink: waLink,
    upiLink: upiLink,
    applyBrand: applyBrand,
    bucket: BUCKET,
  });
})();
