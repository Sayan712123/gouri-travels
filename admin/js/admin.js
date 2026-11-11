/* ---------------------------------------------------------------
 * Gouri Travels — admin panel logic
 * Requires: @supabase/supabase-js v2, admin/js/config.js
 * ------------------------------------------------------------- */
(function () {
  const cfg = window.GT_ADMIN_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("your-project-ref") &&
    !cfg.SUPABASE_ANON_KEY.includes("your-anon-public-key");

  const client = configured
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  /* ================= helpers ================= */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function inr(v) {
    return "₹" + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }
  function dt(v) {
    if (!v) return "—";
    const d = new Date(v);
    if (isNaN(d)) return v;
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function dOnly(v) {
    if (!v) return "—";
    const d = new Date(v + (String(v).length === 10 ? "T00:00:00" : ""));
    if (isNaN(d)) return v;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  function toast(msg, type) {
    let el = $("#admin-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "admin-toast";
      el.style.cssText =
        "position:fixed;left:50%;bottom:26px;transform:translate(-50%,16px);background:#14201c;color:#fff;" +
        "padding:12px 20px;border-radius:999px;font-size:.87rem;font-weight:550;box-shadow:0 20px 50px -20px rgba(0,0,0,.5);" +
        "opacity:0;pointer-events:none;transition:all .25s;z-index:300;max-width:calc(100vw - 40px);text-align:center";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = type === "error" ? "#b23b3b" : type === "ok" ? "#0a4d3b" : "#14201c";
    el.style.opacity = "1";
    el.style.transform = "translate(-50%,0)";
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translate(-50%,16px)";
    }, 3600);
  }

  /* ================= auth ================= */
  async function requireSession() {
    if (!client) {
      document.body.innerHTML =
        '<div style="max-width:560px;margin:80px auto;padding:28px;font-family:Inter,sans-serif;border:1px solid #e3e9e6;border-radius:14px;background:#fff">' +
        '<h2 style="margin:0 0 10px">Supabase কনফিগার করা হয়নি</h2>' +
        '<p style="color:#4a5a54;font-size:.92rem"><code>admin/js/config.js</code> ফাইলে আপনার Project URL ও anon key বসান, তারপর পেজ রিফ্রেশ করুন।</p></div>';
      throw new Error("not configured");
    }
    const { data } = await client.auth.getSession();
    if (!data.session) {
      location.replace("index.html");
      throw new Error("no session");
    }
    return data.session;
  }

  async function isAdmin() {
    const { data, error } = await client.rpc("is_admin");
    if (error) return false;
    return data === true;
  }

  async function logout() {
    await client.auth.signOut();
    location.replace("index.html");
  }

  /* ================= login page ================= */
  function initLogin() {
    const form = $("#login-form");
    if (!form) return;
    const alertBox = $("#login-alert");
    const btn = $("#login-btn");

    if (!client) {
      alertBox.innerHTML = '<div class="alert alert--error">Supabase কনফিগার করা হয়নি — <code>admin/js/config.js</code> দেখুন।</div>';
      btn.disabled = true;
      return;
    }

    client.auth.getSession().then(({ data }) => {
      if (data.session) location.replace("dashboard.html");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      alertBox.innerHTML = "";
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> লগইন হচ্ছে…';

      const { error } = await client.auth.signInWithPassword({
        email: form.email.value.trim(),
        password: form.password.value,
      });

      btn.disabled = false;
      btn.textContent = "লগইন";

      if (error) {
        alertBox.innerHTML = '<div class="alert alert--error">' + esc(error.message) + '</div>';
        return;
      }
      location.replace("dashboard.html");
    });
  }

  /* ================= dashboard ================= */
  const state = { bookings: [], trips: [], enquiries: [], tab: "bookings" };

  async function loadAll() {
    const [b, t, e] = await Promise.all([
      client.from("bookings").select("*, trips(title, slug)").order("created_at", { ascending: false }),
      client.from("trips").select("*").order("created_at", { ascending: false }),
      client.from("enquiries").select("*").order("created_at", { ascending: false }),
    ]);
    if (b.error) throw b.error;
    if (t.error) throw t.error;
    if (e.error) throw e.error;
    state.bookings = b.data || [];
    state.trips = t.data || [];
    state.enquiries = e.data || [];
  }

  function renderStats() {
    const pending = state.bookings.filter((x) => x.status === "pending").length;
    const confirmed = state.bookings.filter((x) => x.status === "confirmed").length;
    const revenue = state.bookings
      .filter((x) => x.status === "confirmed" || x.status === "completed")
      .reduce((s, x) => s + Number(x.total_amount || 0), 0);
    const unread = state.enquiries.filter((x) => !x.is_read).length;

    $("#stat-bookings").textContent = state.bookings.length;
    $("#stat-pending").textContent = pending;
    $("#stat-confirmed").textContent = confirmed;
    $("#stat-revenue").textContent = inr(revenue);
    $("#stat-trips").textContent = state.trips.length;
    $("#stat-enquiries").textContent = unread;
  }

  function statusBadge(s) {
    return '<span class="badge badge--' + esc(s) + '">' + esc(s) + "</span>";
  }

  function renderBookings() {
    const q = ($("#booking-search") || {}).value || "";
    const filter = ($("#booking-status") || {}).value || "all";
    let rows = state.bookings.slice();
    if (filter !== "all") rows = rows.filter((r) => r.status === filter);
    if (q) {
      const s = q.toLowerCase();
      rows = rows.filter((r) =>
        [r.booking_code, r.full_name, r.phone, r.email, r.trips && r.trips.title]
          .filter(Boolean).join(" ").toLowerCase().includes(s)
      );
    }

    const body = $("#bookings-body");
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7"><div class="empty"><strong>কোনো বুকিং নেই</strong>নতুন বুকিং এলে এখানে দেখাবে।</div></td></tr>';
      return;
    }

    body.innerHTML = rows.map((r) => `
      <tr>
        <td><span class="code">${esc(r.booking_code)}</span><span class="sub">${dt(r.created_at)}</span></td>
        <td><strong>${esc(r.full_name)}</strong><span class="sub">${esc(r.phone)}${r.email ? " · " + esc(r.email) : ""}</span></td>
        <td>${esc((r.trips && r.trips.title) || "—")}<span class="sub">${dOnly(r.travel_date)}</span></td>
        <td>${r.travellers}<span class="sub">${r.pickup_point ? esc(r.pickup_point) : "—"}</span></td>
        <td>${r.total_amount != null ? inr(r.total_amount) : "—"}</td>
        <td>${statusBadge(r.status)}</td>
        <td>
          <div class="btn-row">
            ${r.status !== "confirmed" ? `<button class="btn btn--sm" data-act="confirm" data-id="${r.id}">Confirm</button>` : ""}
            ${r.status !== "cancelled" ? `<button class="btn btn--sm btn--ghost" data-act="cancel" data-id="${r.id}">Cancel</button>` : ""}
            <button class="btn btn--sm btn--ghost" data-act="view" data-id="${r.id}">View</button>
          </div>
        </td>
      </tr>`).join("");
  }

  function renderTrips() {
    const body = $("#trips-body");
    if (!state.trips.length) {
      body.innerHTML = '<tr><td colspan="6"><div class="empty"><strong>কোনো ট্রিপ নেই</strong>“নতুন ট্রিপ” বাটনে ক্লিক করে যোগ করুন।</div></td></tr>';
      return;
    }
    body.innerHTML = state.trips.map((t) => `
      <tr>
        <td><strong>${esc(t.title)}</strong><span class="sub">${esc(t.slug)}</span></td>
        <td>${esc(t.destination)}</td>
        <td>${t.duration_days} দিন</td>
        <td>${inr(t.price_per_person)}</td>
        <td>${t.seats_booked}/${t.seats_total}<span class="sub">${dOnly(t.departure_date)}</span></td>
        <td><span class="badge badge--${t.is_active ? "active" : "inactive"}">${t.is_active ? "active" : "hidden"}</span></td>
        <td>
          <div class="btn-row">
            <button class="btn btn--sm btn--ghost" data-trip-edit="${t.id}">Edit</button>
            <button class="btn btn--sm btn--ghost" data-trip-toggle="${t.id}">${t.is_active ? "Hide" : "Show"}</button>
            <button class="btn btn--sm btn--danger" data-trip-del="${t.id}">Delete</button>
          </div>
        </td>
      </tr>`).join("");
  }

  function renderEnquiries() {
    const body = $("#enquiries-body");
    if (!state.enquiries.length) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty"><strong>কোনো মেসেজ নেই</strong>কন্টাক্ট ফর্ম থেকে আসা মেসেজ এখানে দেখাবে।</div></td></tr>';
      return;
    }
    body.innerHTML = state.enquiries.map((e) => `
      <tr style="${e.is_read ? "" : "background:#fbfdfc"}">
        <td><strong>${esc(e.name)}</strong>${e.is_read ? "" : ' <span class="badge badge--pending">new</span>'}<span class="sub">${dt(e.created_at)}</span></td>
        <td>${esc(e.phone)}<span class="sub">${e.email ? esc(e.email) : "—"}</span></td>
        <td style="max-width:380px">${esc(e.message)}</td>
        <td>${e.is_read ? '<span class="badge badge--inactive">read</span>' : '<span class="badge badge--pending">unread</span>'}</td>
        <td><button class="btn btn--sm btn--ghost" data-enq-read="${e.id}">${e.is_read ? "Mark unread" : "Mark read"}</button></td>
      </tr>`).join("");
  }

  function switchTab(tab) {
    state.tab = tab;
    $$("[data-tab]").forEach((a) => a.classList.toggle("is-active", a.dataset.tab === tab));
    $$("[data-pane]").forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== tab));
    if (tab === "bookings") renderBookings();
    if (tab === "trips") renderTrips();
    if (tab === "enquiries") renderEnquiries();
  }

  /* ---------- booking actions ---------- */
  async function setBookingStatus(id, status) {
    const { error } = await client.from("bookings").update({ status }).eq("id", id);
    if (error) return toast(error.message, "error");
    const row = state.bookings.find((b) => b.id === id);
    if (row) row.status = status;
    renderStats();
    renderBookings();
    toast("বুকিং " + status, "ok");
  }

  function viewBooking(id) {
    const r = state.bookings.find((b) => b.id === id);
    if (!r) return;
    const rows = [
      ["বুকিং কোড", r.booking_code],
      ["নাম", r.full_name],
      ["ফোন", r.phone],
      ["ইমেইল", r.email || "—"],
      ["ট্রিপ", (r.trips && r.trips.title) || "—"],
      ["যাত্রার তারিখ", dOnly(r.travel_date)],
      ["যাত্রী", r.travellers],
      ["পিকআপ", r.pickup_point || "—"],
      ["মোট", r.total_amount != null ? inr(r.total_amount) : "—"],
      ["স্টেটাস", r.status],
      ["নোট", r.notes || "—"],
      ["তৈরি", dt(r.created_at)],
    ];
    $("#modal-title").textContent = "বুকিং " + r.booking_code;
    $("#modal-body").innerHTML =
      '<table style="font-size:.9rem">' +
      rows.map(([k, v]) => '<tr><th style="width:38%;background:none;text-transform:none;font-size:.82rem;letter-spacing:0;color:#7b8a84">' + esc(k) + '</th><td>' + esc(v) + '</td></tr>').join("") +
      "</table>";
    $("#modal-foot").innerHTML = '<button class="btn btn--ghost" data-modal-close>বন্ধ করুন</button>';
    $("#modal").classList.add("is-open");
  }

  /* ---------- trip form ---------- */
  function openTripForm(trip) {
    const t = trip || {};
    $("#modal-title").textContent = trip ? "ট্রিপ এডিট" : "নতুন ট্রিপ";
    $("#modal-body").innerHTML = `
      <form id="trip-form">
        <input type="hidden" name="id" value="${esc(t.id || "")}" />
        <div class="field-row">
          <div class="field"><label>টাইটেল *</label><input name="title" required value="${esc(t.title || "")}" /></div>
          <div class="field"><label>স্লাগ *</label><input name="slug" required value="${esc(t.slug || "")}" placeholder="darjeeling-5d" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>গন্তব্য *</label><input name="destination" required value="${esc(t.destination || "")}" /></div>
          <div class="field"><label>কভার ইমেজ URL</label><input name="cover_image_url" value="${esc(t.cover_image_url || "")}" placeholder="https://…" /></div>
        </div>
        <div class="field"><label>সংক্ষিপ্ত বর্ণনা</label><input name="summary" value="${esc(t.summary || "")}" /></div>
        <div class="field"><label>বিস্তারিত</label><textarea name="description">${esc(t.description || "")}</textarea></div>
        <div class="field-row field-row--3">
          <div class="field"><label>দিন *</label><input name="duration_days" type="number" min="1" required value="${t.duration_days || 1}" /></div>
          <div class="field"><label>দাম / জন *</label><input name="price_per_person" type="number" min="0" step="1" required value="${t.price_per_person || 0}" /></div>
          <div class="field"><label>মোট সিট *</label><input name="seats_total" type="number" min="0" required value="${t.seats_total || 20}" /></div>
        </div>
        <div class="field-row field-row--3">
          <div class="field"><label>ডিপার্চার</label><input name="departure_date" type="date" value="${esc(t.departure_date || "")}" /></div>
          <div class="field"><label>রিটার্ন</label><input name="return_date" type="date" value="${esc(t.return_date || "")}" /></div>
          <div class="field"><label>বুকড সিট</label><input name="seats_booked" type="number" min="0" value="${t.seats_booked || 0}" /></div>
        </div>
        <div class="field"><label>হাইলাইটস (কমা দিয়ে আলাদা)</label><input name="highlights" value="${esc((t.highlights || []).join(", "))}" /></div>
        <div class="field"><label>অ্যাক্টিভ</label><select name="is_active"><option value="true"${t.is_active !== false ? " selected" : ""}>হ্যাঁ</option><option value="false"${t.is_active === false ? " selected" : ""}>না</option></select></div>
      </form>`;
    $("#modal-foot").innerHTML =
      '<button class="btn btn--ghost" data-modal-close>বাতিল</button>' +
      '<button class="btn" id="trip-save">সেভ করুন</button>';
    $("#modal").classList.add("is-open");

    $("#trip-save").addEventListener("click", async () => {
      const f = $("#trip-form");
      if (!f.reportValidity()) return;
      const btn = $("#trip-save");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> সেভ হচ্ছে…';

      const payload = {
        title: f.title.value.trim(),
        slug: f.slug.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""),
        destination: f.destination.value.trim(),
        summary: f.summary.value.trim() || null,
        description: f.description.value.trim() || null,
        duration_days: Number(f.duration_days.value) || 1,
        price_per_person: Number(f.price_per_person.value) || 0,
        seats_total: Number(f.seats_total.value) || 0,
        seats_booked: Number(f.seats_booked.value) || 0,
        departure_date: f.departure_date.value || null,
        return_date: f.return_date.value || null,
        cover_image_url: f.cover_image_url.value.trim() || null,
        highlights: f.highlights.value.split(",").map((s) => s.trim()).filter(Boolean),
        is_active: f.is_active.value === "true",
      };

      const id = f.id.value;
      const res = id
        ? await client.from("trips").update(payload).eq("id", id)
        : await client.from("trips").insert(payload);

      btn.disabled = false;
      btn.textContent = "সেভ করুন";

      if (res.error) return toast(res.error.message, "error");
      closeModal();
      await refresh();
      toast("ট্রিপ সেভ হয়েছে", "ok");
    });
  }

  function closeModal() {
    $("#modal").classList.remove("is-open");
  }

  /* ---------- dashboard init ---------- */
  async function initDashboard() {
    const session = await requireSession();
    const admin = await isAdmin();

    $("#admin-email").textContent = session.user.email || "admin";

    if (!admin) {
      $("#admin-warning").innerHTML =
        '<div class="alert alert--warn"><strong>এই অ্যাকাউন্টটি অ্যাডমিন নয়।</strong><br>' +
        "Supabase SQL Editor-এ চালান:<br><code>insert into public.admins (user_id, email) values ('" +
        esc(session.user.id) + "', '" + esc(session.user.email || "") + "');</code></div>";
      $("#admin-warning").classList.remove("hidden");
    }

    async function refresh() {
      try {
        await loadAll();
        renderStats();
        switchTab(state.tab);
      } catch (err) {
        toast(err.message, "error");
      }
    }

    await refresh();

    $$("[data-tab]").forEach((a) =>
      a.addEventListener("click", (e) => { e.preventDefault(); switchTab(a.dataset.tab); })
    );
    $("#logout-btn").addEventListener("click", logout);
    $("#refresh-btn").addEventListener("click", refresh);
    $("#new-trip-btn").addEventListener("click", () => openTripForm(null));

    const bs = $("#booking-search");
    const bf = $("#booking-status");
    if (bs) bs.addEventListener("input", renderBookings);
    if (bf) bf.addEventListener("change", renderBookings);

    document.addEventListener("click", async (e) => {
      const t = e.target.closest("button");
      if (!t) return;

      if (t.hasAttribute("data-modal-close")) return closeModal();
      if (t.id === "modal") return closeModal();

      if (t.dataset.act === "confirm") return setBookingStatus(t.dataset.id, "confirmed");
      if (t.dataset.act === "cancel") return setBookingStatus(t.dataset.id, "cancelled");
      if (t.dataset.act === "view") return viewBooking(t.dataset.id);

      if (t.dataset.tripEdit) {
        const trip = state.trips.find((x) => x.id === t.dataset.tripEdit);
        return openTripForm(trip);
      }
      if (t.dataset.tripToggle) {
        const trip = state.trips.find((x) => x.id === t.dataset.tripToggle);
        const { error } = await client.from("trips").update({ is_active: !trip.is_active }).eq("id", trip.id);
        if (error) return toast(error.message, "error");
        await refresh();
        return toast(trip.is_active ? "ট্রিপ হাইড করা হয়েছে" : "ট্রিপ পাবলিশ হয়েছে", "ok");
      }
      if (t.dataset.tripDel) {
        if (!confirm("এই ট্রিপটি ডিলিট করবেন? এটি ফেরানো যাবে না।")) return;
        const { error } = await client.from("trips").delete().eq("id", t.dataset.tripDel);
        if (error) return toast(error.message, "error");
        await refresh();
        return toast("ট্রিপ ডিলিট হয়েছে", "ok");
      }
      if (t.dataset.enqRead) {
        const enq = state.enquiries.find((x) => x.id === t.dataset.enqRead);
        const { error } = await client.from("enquiries").update({ is_read: !enq.is_read }).eq("id", enq.id);
        if (error) return toast(error.message, "error");
        await refresh();
      }
    });

    $("#modal").addEventListener("click", (e) => {
      if (e.target.id === "modal") closeModal();
    });
  }

  /* ================= boot ================= */
  document.addEventListener("DOMContentLoaded", () => {
    if ($("#login-form")) initLogin();
    else if ($("#dashboard-root")) initDashboard();
  });

  window.GTAdmin = { client, logout };
})();
