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

  /* ================= demo mode =================
   * Supabase কনফিগার করা না থাকলে অ্যাডমিন প্যানেল নমুনা ডেটা দিয়ে
   * ড্যাশবোর্ড দেখায় (শুধু প্রিভিউ — কোনো ডেটা বদলায় না)।
   * ============================================ */
  const DEMO = {
    trips: [
      { id: "demo-1", title: "Darjeeling & Gangtok", slug: "darjeeling-gangtok-5d", destination: "West Bengal, Sikkim", duration_days: 5, price_per_person: 12500, seats_total: 24, seats_booked: 19, departure_date: "2026-12-01", is_active: true },
      { id: "demo-2", title: "Digha & Shankarpur Beach Break", slug: "digha-shankarpur-3d", destination: "Digha, West Bengal", duration_days: 3, price_per_person: 5400, seats_total: 30, seats_booked: 22, departure_date: "2026-11-23", is_active: true },
      { id: "demo-3", title: "Puri & Konark Heritage", slug: "puri-konark-4d", destination: "Puri, Odisha", duration_days: 4, price_per_person: 8900, seats_total: 26, seats_booked: 14, departure_date: "2026-12-11", is_active: true },
      { id: "demo-4", title: "Meghalaya — Abode of Clouds", slug: "meghalaya-6d", destination: "Shillong, Cherrapunji, Dawki", duration_days: 6, price_per_person: 21500, seats_total: 18, seats_booked: 11, departure_date: "2026-12-21", is_active: true },
      { id: "demo-5", title: "Kashmir Valley Grand Tour", slug: "kashmir-7d", destination: "Srinagar, Gulmarg, Pahalgam", duration_days: 7, price_per_person: 32500, seats_total: 16, seats_booked: 9, departure_date: "2027-01-05", is_active: true },
      { id: "demo-6", title: "Andaman Islands Escape", slug: "andaman-6d", destination: "Port Blair, Havelock", duration_days: 6, price_per_person: 28900, seats_total: 20, seats_booked: 13, departure_date: "2027-01-15", is_active: true },
    ],
    bookings: [
      { id: "b1", booking_code: "GT-2401", full_name: "Suman Mondal", phone: "+91 98300 11223", email: "suman@example.com", travellers: 4, travel_date: "2026-12-01", pickup_point: "Shiyalda Station", total_amount: 50000, status: "confirmed", created_at: "2026-11-09T10:20:00Z", trips: { title: "Darjeeling & Gangtok", slug: "darjeeling-gangtok-5d" } },
      { id: "b2", booking_code: "GT-2402", full_name: "Priya Das", phone: "+91 90070 44556", email: "priya@example.com", travellers: 2, travel_date: "2026-11-23", pickup_point: "Bandel", total_amount: 10800, status: "pending", created_at: "2026-11-10T14:05:00Z", trips: { title: "Digha & Shankarpur Beach Break", slug: "digha-shankarpur-3d" } },
      { id: "b3", booking_code: "GT-2403", full_name: "Arindam Bose", phone: "+91 98311 77889", email: null, travellers: 6, travel_date: "2026-12-21", pickup_point: "Howrah", total_amount: 129000, status: "pending", created_at: "2026-11-11T06:40:00Z", trips: { title: "Meghalaya — Abode of Clouds", slug: "meghalaya-6d" } },
      { id: "b4", booking_code: "GT-2404", full_name: "Rina Ghosh", phone: "+91 90730 22110", email: "rina@example.com", travellers: 3, travel_date: "2026-12-11", pickup_point: "Bandel", total_amount: 26700, status: "completed", created_at: "2026-11-05T09:15:00Z", trips: { title: "Puri & Konark Heritage", slug: "puri-konark-4d" } },
    ],
    enquiries: [
      { id: "e1", name: "Sayan Ghosh", phone: "+91 90000 12345", email: "sayan@example.com", message: "কাশ্মীর ট্রিপে ডিসেম্বরের শেষে সিট আছে কি? ৪ জনের জন্য খরচ জানতে চাই।", is_read: false, created_at: "2026-11-11T05:30:00Z" },
      { id: "e2", name: "Moumita Sen", phone: "+91 98300 99887", email: null, message: "আন্দামান প্যাকেজে স্কুবা ডাইভিং কি অন্তর্ভুক্ত?", is_read: true, created_at: "2026-11-10T11:00:00Z" },
    ],
  };

  function demoBanner() {
    return (
      '<div class="alert alert--warn"><strong>🔧 ডেমো মোড — শুধু প্রিভিউ।</strong><br>' +
      "Supabase কনফিগার করা হয়নি, তাই নমুনা ডেটা দেখানো হচ্ছে এবং কোনো পরিবর্তন সেভ হবে না। " +
      "<code>admin/js/config.js</code>-এ Project URL ও anon key বসালেই আসল ডেটা চালু হবে।</div>"
    );
  }

  /* ================= auth ================= */
  async function requireSession() {
    if (!client) {
      return { demo: true, user: { email: "demo@gouritravels.in" } };
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
    if (client) await client.auth.signOut();
    location.replace("index.html");
  }

  /* ================= login page ================= */
  function initLogin() {
    const form = $("#login-form");
    if (!form) return;
    const alertBox = $("#login-alert");
    const btn = $("#login-btn");

    if (!client) {
      alertBox.innerHTML = demoBanner();
      btn.textContent = "ডেমো ড্যাশবোর্ড দেখুন";
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        location.href = "dashboard.html";
      });
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
    if (!client) {
      state.bookings = DEMO.bookings.slice();
      state.trips = DEMO.trips.slice();
      state.enquiries = DEMO.enquiries.slice();
      return;
    }
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
    if (!client) return toast("ডেমো মোড — পরিবর্তন সেভ হয় না।", "error");
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
      if (!client) return toast("ডেমো মোড — পরিবর্তন সেভ হয় না।", "error");
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

    $("#admin-email").textContent = session.user.email || "admin";

    if (session.demo) {
      $("#admin-warning").innerHTML = demoBanner();
      $("#admin-warning").classList.remove("hidden");
    }

    const admin = session.demo ? true : await isAdmin();

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
        if (!client) return toast("ডেমো মোড — পরিবর্তন সেভ হয় না।", "error");
        const trip = state.trips.find((x) => x.id === t.dataset.tripToggle);
        const { error } = await client.from("trips").update({ is_active: !trip.is_active }).eq("id", trip.id);
        if (error) return toast(error.message, "error");
        await refresh();
        return toast(trip.is_active ? "ট্রিপ হাইড করা হয়েছে" : "ট্রিপ পাবলিশ হয়েছে", "ok");
      }
      if (t.dataset.tripDel) {
        if (!client) return toast("ডেমো মোড — পরিবর্তন সেভ হয় না।", "error");
        if (!confirm("এই ট্রিপটি ডিলিট করবেন? এটি ফেরানো যাবে না।")) return;
        const { error } = await client.from("trips").delete().eq("id", t.dataset.tripDel);
        if (error) return toast(error.message, "error");
        await refresh();
        return toast("ট্রিপ ডিলিট হয়েছে", "ok");
      }
      if (t.dataset.enqRead) {
        if (!client) return toast("ডেমো মোড — পরিবর্তন সেভ হয় না।", "error");
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
