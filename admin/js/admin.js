/* ---------------------------------------------------------------
 * Gouri Travels — admin panel logic
 *
 * বিদ্যমান Supabase স্কিমা অনুযায়ী:
 *   trips    : id, title, from_place, to_place, trip_date, trip_time,
 *              price, boarding, details, thumb, photos[], seats, open,
 *              created_at, kind, vehicle_name, cars, per_car
 *   seats    : trip_id, label, status, name, phone, held_until, ticket, note
 *   settings : key, value
 *   admins   : email
 *   rpc      : is_admin, hold_seats
 *
 * বুকিং = seats টেবিলের সারি (status: held / booked)
 * ------------------------------------------------------------- */
(function () {
  var cfg = window.GT_ADMIN_CONFIG || {};
  var sb = null;
  var S = { trips: [], seats: [], settings: {}, user: null, admin: false };
  var currentTab = "bookings";

  function t(key, fallback) {
    if (window.GT_I18N) return window.GT_I18N.t(key, fallback);
    return fallback !== undefined ? fallback : key;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function inr(n) {
    return "\u20b9" + Number(n || 0).toLocaleString("en-IN");
  }

  function prettyDate(d) {
    if (!d) return "\u2014";
    var dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function lines(s) {
    return String(s == null ? "" : s).split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
  }

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

  function toast(msg, type) {
    var d = document.createElement("div");
    d.className = "gt-toast" + (type === "error" ? " gt-toast--err" : "");
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2800);
  }

  function $(id) { return document.getElementById(id); }

  /* ---------------- auth ---------------- */
  async function initClient() {
    if (!window.supabase) throw new Error("supabase-js not loaded");
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    window.gtAdminClient = sb;
  }

  async function isAdmin() {
    if (!sb) return false;
    try {
      var r = await sb.rpc("is_admin");
      return r.data === true;
    } catch (e) {
      return false;
    }
  }

  /* ---------------- login page ---------------- */
  async function bootLogin() {
    await initClient();
    var form = $("login-form");
    var alertBox = $("login-alert");
    var btn = $("login-btn");
    var gbtn = $("google-btn");

    var ses = (await sb.auth.getSession()).data.session;
    if (ses && ses.user) {
      if (await isAdmin()) { location.href = "dashboard.html"; return; }
      alertBox.innerHTML =
        '<div class="alert alert--warn"><strong>' + t("adm.notAdmin") + "</strong>" + t("adm.notAdminMsg") + "</div>";
    }

    if (gbtn) {
      gbtn.addEventListener("click", async function () {
        var r = await sb.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: location.origin + location.pathname.replace(/index\.html$/, "") + "dashboard.html",
          },
        });
        if (r.error) alertBox.innerHTML = '<div class="alert alert--err">' + esc(r.error.message) + "</div>";
      });
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      alertBox.innerHTML = "";
      btn.disabled = true;
      var old = btn.textContent;
      btn.textContent = t("adm.loading");
      var r = await sb.auth.signInWithPassword({
        email: form.email.value.trim(),
        password: form.password.value,
      });
      btn.disabled = false;
      btn.textContent = old;
      if (r.error) {
        alertBox.innerHTML = '<div class="alert alert--err">' + esc(r.error.message) + "</div>";
        return;
      }
      if (!(await isAdmin())) {
        alertBox.innerHTML =
          '<div class="alert alert--warn"><strong>' + t("adm.notAdmin") + "</strong>" + t("adm.notAdminMsg") + "</div>";
        await sb.auth.signOut();
        return;
      }
      location.href = "dashboard.html";
    });
  }

  /* ---------------- dashboard ---------------- */
  async function bootDashboard() {
    await initClient();
    var ses = (await sb.auth.getSession()).data.session;
    if (!ses || !ses.user) { location.href = "index.html"; return; }
    S.user = ses.user;
    S.admin = await isAdmin();
    if (!S.admin) {
      var w = $("admin-warning");
      w.className = "alert alert--warn";
      w.innerHTML = "<strong>" + t("adm.needAdmin") + "</strong>" + t("adm.needAdminMsg");
      return;
    }

    $("admin-email").textContent = S.user.email || "";

    $("logout-btn").addEventListener("click", async function () {
      await sb.auth.signOut();
      location.href = "index.html";
    });
    $("refresh-btn").addEventListener("click", function () { reload(); });
    $("new-trip-btn").addEventListener("click", function () { openTripModal(null); });

    document.querySelectorAll("[data-tab]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        switchTab(a.getAttribute("data-tab"));
      });
    });

    $("booking-search").addEventListener("input", renderBookings);
    $("booking-status").addEventListener("change", renderBookings);

    var expBtn = $("export-btn");
    if (expBtn) expBtn.addEventListener("click", exportBookingsCsv);

    document.querySelectorAll("[data-modal-close]").forEach(function (b) {
      b.addEventListener("click", function () { closeModal(); });
    });
    $("modal").addEventListener("click", function (e) {
      if (e.target === $("modal")) closeModal();
    });

    document.addEventListener("gt:langchange", function () { renderAll(); });

    await reload();
  }

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll("[data-tab]").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-tab") === tab);
    });
    document.querySelectorAll("[data-pane]").forEach(function (p) {
      p.classList.toggle("hidden", p.getAttribute("data-pane") !== tab);
    });
  }

  async function reload() {
    try {
      var res = await Promise.all([
        sb.from("trips").select("*").order("created_at", { ascending: false }),
        sb.from("seats").select("*"),
        sb.from("settings").select("*"),
      ]);
      var err = res[0].error || res[1].error || res[2].error;
      if (err) throw err;
      S.trips = res[0].data || [];
      S.seats = res[1].data || [];
      S.settings = {};
      (res[2].data || []).forEach(function (r) { S.settings[r.key] = r.value; });
      renderAll();
    } catch (e) {
      toast(t("adm.errLoad") + ": " + e.message, "error");
    }
  }

  function renderAll() {
    renderStats();
    renderBookings();
    renderTrips();
    renderSettings();
  }

  function tripById(id) {
    return S.trips.filter(function (x) { return x.id === id; })[0] || null;
  }

  function renderStats() {
    var held = S.seats.filter(function (s) { return s.status === "held"; });
    var booked = S.seats.filter(function (s) { return s.status === "booked"; });
    var revenue = 0;
    booked.forEach(function (s) {
      var tr = tripById(s.trip_id);
      if (tr) revenue += Number(tr.price || 0);
    });
    $("stat-bookings").textContent = S.seats.length;
    $("stat-pending").textContent = held.length;
    $("stat-confirmed").textContent = booked.length;
    $("stat-revenue").textContent = inr(revenue);
    $("stat-trips").textContent = S.trips.filter(function (x) { return x.open; }).length;
    $("stat-total-trips").textContent = S.trips.length;
  }

  function renderBookings() {
    var body = $("bookings-body");
    if (!body) return;
    var q = ($("booking-search").value || "").toLowerCase();
    var st = $("booking-status").value;

    var rows = S.seats.slice().sort(function (a, b) {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

    if (st !== "all") rows = rows.filter(function (r) { return r.status === st; });
    if (q) {
      rows = rows.filter(function (r) {
        return (
          String(r.ticket || "").toLowerCase().indexOf(q) !== -1 ||
          String(r.name || "").toLowerCase().indexOf(q) !== -1 ||
          String(r.phone || "").toLowerCase().indexOf(q) !== -1 ||
          String(r.label || "").toLowerCase().indexOf(q) !== -1
        );
      });
    }

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7" class="muted">' + t("adm.noBookings") + "</td></tr>";
      return;
    }

    body.innerHTML = rows.map(function (r) {
      var tr = tripById(r.trip_id);
      var title = tr ? tr.title : "\u2014";
      var price = tr ? Number(tr.price || 0) : 0;
      var badge = r.status === "booked"
        ? '<span class="tag tag--ok">' + t("adm.booked") + "</span>"
        : '<span class="tag tag--warn">' + t("adm.held") + "</span>";
      var actions = r.status === "booked"
        ? '<button class="btn btn--ghost btn--xs" data-act="cancel" data-id="' + r.id + '">' + t("adm.cancel") + "</button>"
        : '<button class="btn btn--xs" data-act="confirm" data-id="' + r.id + '">' + t("adm.confirm") + "</button>" +
          ' <button class="btn btn--ghost btn--xs" data-act="cancel" data-id="' + r.id + '">' + t("adm.cancel") + "</button>";
      return (
        "<tr>" +
        "<td><code>" + esc(r.ticket || "\u2014") + "</code></td>" +
        "<td>" + esc(r.name || "\u2014") + '<br><span class="muted">' + esc(r.phone || "") + "</span></td>" +
        "<td>" + esc(title) + '<br><span class="muted">' + esc(r.label || "") + "</span></td>" +
        "<td>1</td>" +
        "<td>" + inr(price) + "</td>" +
        "<td>" + badge + "</td>" +
        "<td>" + actions + "</td>" +
        "</tr>"
      );
    }).join("");

    body.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-id");
        if (b.getAttribute("data-act") === "confirm") confirmSeat(id);
        else cancelSeat(id);
      });
    });
  }

  /* export the currently filtered booking list as a CSV file */
  function exportBookingsCsv() {
    var q = ($("booking-search").value || "").toLowerCase();
    var st = $("booking-status").value;

    var rows = S.seats.slice().sort(function (a, b) {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    if (st !== "all") rows = rows.filter(function (r) { return r.status === st; });
    if (q) {
      rows = rows.filter(function (r) {
        return (
          String(r.ticket || "").toLowerCase().indexOf(q) !== -1 ||
          String(r.name || "").toLowerCase().indexOf(q) !== -1 ||
          String(r.phone || "").toLowerCase().indexOf(q) !== -1 ||
          String(r.label || "").toLowerCase().indexOf(q) !== -1
        );
      });
    }

    if (!rows.length) { toast(t("adm.noBookings"), "error"); return; }

    function cell(v) {
      var s = String(v == null ? "" : v).replace(/"/g, '""');
      return '"' + s + '"';
    }

    var head = ["Ticket", "Name", "Phone", "Trip", "Seat", "Status", "Amount", "Booked at"];
    var out = [head.map(cell).join(",")];

    rows.forEach(function (r) {
      var tr = tripById(r.trip_id);
      out.push([
        cell(r.ticket || ""),
        cell(r.name || ""),
        cell(r.phone || ""),
        cell(tr ? tr.title : ""),
        cell(r.label || ""),
        cell(r.status === "booked" ? "Confirmed" : "Pending"),
        cell(tr ? Number(tr.price || 0) : 0),
        cell(r.created_at || "")
      ].join(","));
    });

    // BOM so Excel opens the Bangla text correctly
    var blob = new Blob(["\ufeff" + out.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gouri-bookings-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    toast(t("adm.exported"));
  }

  async function confirmSeat(id) {
    var code = "GT-" + Math.random().toString(36).slice(2, 10).toUpperCase();
    var r = await sb.from("seats").update({ status: "booked", ticket: code, held_until: null }).eq("id", id);
    if (r.error) { toast(t("adm.errSave") + ": " + r.error.message, "error"); return; }
    toast(t("adm.confirmedOk"));
    await reload();
  }

  async function cancelSeat(id) {
    var r = await sb.from("seats").delete().eq("id", id);
    if (r.error) { toast(t("adm.errDel") + ": " + r.error.message, "error"); return; }
    toast(t("adm.cancelledOk"));
    await reload();
  }

  function renderTrips() {
    var body = $("trips-body");
    if (!body) return;
    if (!S.trips.length) {
      body.innerHTML = '<tr><td colspan="7" class="muted">' + t("adm.noTrips") + "</td></tr>";
      return;
    }
    body.innerHTML = S.trips.map(function (tr) {
      var booked = S.seats.filter(function (s) { return s.trip_id === tr.id && s.status === "booked"; }).length;
      var held = S.seats.filter(function (s) { return s.trip_id === tr.id && s.status === "held"; }).length;
      return (
        "<tr>" +
        "<td><strong>" + esc(tr.title) + '</strong><br><span class="muted">' + esc(tr.from_place || "") + " \u2192 " + esc(tr.to_place || "") + "</span></td>" +
        "<td>" + esc(tr.to_place || "\u2014") + "</td>" +
        "<td>" + prettyDate(tr.trip_date) + "</td>" +
        "<td>" + inr(tr.price) + "</td>" +
        "<td>" + booked + " / " + (tr.seats || 0) + (held ? ' <span class="tag tag--warn">+' + held + "</span>" : "") + "</td>" +
        "<td>" + (tr.open ? '<span class="tag tag--ok">' + t("trip.open") + "</span>" : '<span class="tag">' + t("trip.soon") + "</span>") + "</td>" +
        "<td>" +
        '<button class="btn btn--ghost btn--xs" data-trip-edit="' + tr.id + '">' + t("adm.edit") + "</button> " +
        '<button class="btn btn--ghost btn--xs" data-trip-toggle="' + tr.id + '">' + (tr.open ? t("adm.hide") : t("adm.show")) + "</button> " +
        '<button class="btn btn--ghost btn--xs" data-trip-del="' + tr.id + '">' + t("adm.delete") + "</button>" +
        "</td></tr>"
      );
    }).join("");

    body.querySelectorAll("[data-trip-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openTripModal(b.getAttribute("data-trip-edit")); });
    });
    body.querySelectorAll("[data-trip-toggle]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var tr = tripById(b.getAttribute("data-trip-toggle"));
        if (!tr) return;
        var r = await sb.from("trips").update({ open: !tr.open }).eq("id", tr.id);
        if (r.error) { toast(t("adm.errSave"), "error"); return; }
        await reload();
      });
    });
    body.querySelectorAll("[data-trip-del]").forEach(function (b) {
      b.addEventListener("click", async function () {
        if (!confirm(t("adm.delConfirm") + " " + t("adm.areYouSure"))) return;
        var r = await sb.from("trips").delete().eq("id", b.getAttribute("data-trip-del"));
        if (r.error) { toast(t("adm.errDel") + ": " + r.error.message, "error"); return; }
        toast(t("adm.tripDeleted"));
        await reload();
      });
    });
  }

  /* ---------------- trip modal ---------------- */
  function openTripModal(id) {
    var tr = id ? tripById(id) : null;
    var d = parseDetails(tr ? tr.details : "");
    $("modal-title").textContent = tr ? t("adm.editTripTitle") : t("adm.newTripTitle");

    $("modal-body").innerHTML =
      '<div class="form-grid">' +
      field("f-title", t("adm.title"), tr ? tr.title : "", "text", true) +
      field("f-from", t("adm.from"), tr ? tr.from_place : "", "text") +
      field("f-to", t("adm.to"), tr ? tr.to_place : "", "text") +
      field("f-date", t("adm.date"), tr ? tr.trip_date : "", "date") +
      field("f-time", t("adm.time"), tr ? tr.trip_time : "", "text") +
      field("f-price", t("adm.price"), tr ? tr.price : "", "number") +
      field("f-seats", t("adm.seats"), tr ? tr.seats : 40, "number") +
      field("f-boarding", t("adm.boarding"), tr ? tr.boarding : "", "text") +
      '<div class="field"><label>' + t("adm.kind") + "</label><select id=\"f-kind\">" +
      ["bus", "train", "scorpio"].map(function (k) {
        return '<option value="' + k + '"' + ((tr && tr.kind === k) || (!tr && k === "bus") ? " selected" : "") + ">" + t("adm." + k) + "</option>";
      }).join("") +
      "</select></div>" +
      field("f-vehicle", t("adm.vehicle"), tr ? tr.vehicle_name : "", "text") +
      field("f-cars", t("adm.cars"), tr && tr.cars ? tr.cars : 1, "number") +
      field("f-percar", t("adm.perCar"), tr && tr.per_car ? tr.per_car : 7, "number") +
      field("f-thumb", t("adm.cover"), tr ? tr.thumb : "", "text") +
      '<div class="field field--full"><label>' + t("adm.gallery") + '</label><textarea id="f-photos" rows="3">' + esc(tr && tr.photos ? tr.photos.join("\n") : "") + "</textarea></div>" +
      '<div class="field field--full"><label>' + t("adm.overview") + '</label><textarea id="f-ov" rows="3">' + esc(d.ov) + "</textarea></div>" +
      '<div class="field field--full"><label>' + t("adm.highlights") + '</label><textarea id="f-hl" rows="4">' + esc(d.hl) + "</textarea></div>" +
      '<div class="field field--full"><label>' + t("adm.included") + '</label><textarea id="f-inc" rows="3">' + esc(d.inc) + "</textarea></div>" +
      '<div class="field field--full"><label>' + t("adm.excluded") + '</label><textarea id="f-exc" rows="3">' + esc(d.exc) + "</textarea></div>" +
      '<div class="field field--full"><label>' + t("adm.policy") + '</label><textarea id="f-pol" rows="3">' + esc(d.pol) + "</textarea></div>" +
      '<div class="field field--full"><label>' + t("adm.bookingCloses") + '</label><input id="f-cl" type="text" value="' + esc(d.cl) + '" placeholder="2026-11-25 18:00" /></div>' +
      "</div>";

    $("modal-foot").innerHTML =
      '<button class="btn btn--ghost" data-modal-close>' + t("adm.close") + "</button>" +
      '<button class="btn" id="save-trip">' + t("adm.save") + "</button>";

    $("modal").classList.add("is-open");
    $("modal-foot").querySelectorAll("[data-modal-close]").forEach(function (b) {
      b.addEventListener("click", closeModal);
    });
    $("save-trip").addEventListener("click", function () { saveTrip(tr); });
  }

  function field(id, label, value, type, required) {
    return (
      '<div class="field"><label for="' + id + '">' + label + (required ? " *" : "") + "</label>" +
      '<input id="' + id + '" type="' + type + '" value="' + esc(value == null ? "" : value) + '" /></div>'
    );
  }

  function closeModal() {
    $("modal").classList.remove("is-open");
  }

  async function saveTrip(existing) {
    var title = $("f-title").value.trim();
    if (!title) { toast(t("adm.errTitle"), "error"); return; }

    var prev = existing ? parseDetails(existing.details) : { it: "", meal: "", days: "[]" };

    var details = packDetails({
      ov: $("f-ov").value.trim(),
      hl: $("f-hl").value.trim(),
      it: prev.it,
      inc: $("f-inc").value.trim(),
      exc: $("f-exc").value.trim(),
      pol: $("f-pol").value.trim(),
      meal: prev.meal,
      cl: $("f-cl").value.trim(),
      days: prev.days,
    });

    var payload = {
      title: title,
      from_place: $("f-from").value.trim(),
      to_place: $("f-to").value.trim(),
      trip_date: $("f-date").value || null,
      trip_time: $("f-time").value.trim(),
      price: Number($("f-price").value) || 0,
      seats: Number($("f-seats").value) || 0,
      boarding: $("f-boarding").value.trim(),
      kind: $("f-kind").value,
      vehicle_name: $("f-vehicle").value.trim(),
      cars: Number($("f-cars").value) || 1,
      per_car: Number($("f-percar").value) || 7,
      thumb: $("f-thumb").value.trim(),
      photos: lines($("f-photos").value),
      details: details,
      open: existing ? existing.open : true,
    };

    var r = existing
      ? await sb.from("trips").update(payload).eq("id", existing.id)
      : await sb.from("trips").insert(payload);

    if (r.error) { toast(t("adm.errSave") + ": " + r.error.message, "error"); return; }
    toast(t("adm.tripSaved"));
    closeModal();
    await reload();
  }

  /* ---------------- settings ---------------- */
  var SETTING_FIELDS = [
    ["brand", "adm.settings"],
    ["wa", "adm.wa"],
    ["phone", "adm.phone"],
    ["upi", "adm.upi"],
    ["upi_name", "adm.upiName"],
    ["tag", "adm.tag"],
    ["notice", "adm.notice"],
    ["why", "adm.why"],
    ["terms", "adm.terms"],
    ["slabs", "adm.slabs"],
    ["reviews", "adm.reviews"],
    ["faq", "adm.faq"],
    ["hero", "adm.hero"],
  ];

  function renderSettings() {
    var host = $("settings-form");
    if (!host) return;
    host.innerHTML = SETTING_FIELDS.map(function (f) {
      var v = S.settings[f[0]] || "";
      var big = v.length > 60 || v.indexOf("\n") !== -1;
      return (
        '<div class="field field--full"><label>' + t(f[1]) + "</label>" +
        (big
          ? '<textarea data-setting="' + f[0] + '" rows="4">' + esc(v) + "</textarea>"
          : '<input data-setting="' + f[0] + '" type="text" value="' + esc(v) + '" />') +
        "</div>"
      );
    }).join("") + '<button class="btn" id="save-settings">' + t("adm.saveSettings") + "</button>";

    $("save-settings").addEventListener("click", saveSettings);
  }

  async function saveSettings() {
    var rows = [];
    document.querySelectorAll("[data-setting]").forEach(function (el) {
      rows.push({ key: el.getAttribute("data-setting"), value: el.value });
    });
    var r = await sb.from("settings").upsert(rows, { onConflict: "key" });
    if (r.error) { toast(t("adm.errSave") + ": " + r.error.message, "error"); return; }
    toast(t("adm.settingsSaved"));
    await reload();
  }

  /* ---------------- boot ---------------- */
  window.GT_ADMIN = { bootLogin: bootLogin, bootDashboard: bootDashboard, reload: reload };

  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("login-form")) bootLogin();
    else if (document.getElementById("dashboard-root")) bootDashboard();
  });
})();
