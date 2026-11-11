/* ---------------------------------------------------------------
 * Gouri Travels — shared public-site helpers
 * ------------------------------------------------------------- */
(function () {
  const cfg = window.GT_CONFIG || {};

  /* ---------- formatting ---------- */
  function inr(value) {
    const n = Number(value || 0);
    return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }

  function prettyDate(value) {
    if (!value) return "—";
    const d = new Date(value + (String(value).length === 10 ? "T00:00:00" : ""));
    if (isNaN(d)) return value;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function seatsLeft(trip) {
    return Math.max(0, (trip.seats_total || 0) - (trip.seats_booked || 0));
  }

  /* ---------- toast ---------- */
  function toast(message, type) {
    let el = document.getElementById("gt-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "gt-toast";
      el.className = "gt-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = "gt-toast is-visible" + (type ? " gt-toast--" + type : "");
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.className = "gt-toast";
    }, 4200);
  }

  /* ---------- trip card ---------- */
  function tripCard(trip) {
    const left = seatsLeft(trip);
    const img =
      trip.cover_image_url ||
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=70";
    return `
      <article class="trip-card">
        <a class="trip-card__media" href="trip.html?slug=${encodeURIComponent(trip.slug)}">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(trip.title)}" loading="lazy" />
          <span class="trip-card__days">${trip.duration_days} দিন</span>
        </a>
        <div class="trip-card__body">
          <p class="trip-card__dest">${escapeHtml(trip.destination)}</p>
          <h3 class="trip-card__title">
            <a href="trip.html?slug=${encodeURIComponent(trip.slug)}">${escapeHtml(trip.title)}</a>
          </h3>
          <p class="trip-card__summary">${escapeHtml(trip.summary || "")}</p>
          <div class="trip-card__meta">
            <span>${prettyDate(trip.departure_date)}</span>
            <span class="dot">•</span>
            <span>${left > 0 ? left + " সিট বাকি" : "সিট শেষ"}</span>
          </div>
          <div class="trip-card__foot">
            <div class="price">
              <strong>${inr(trip.price_per_person)}</strong>
              <small>/ জন</small>
            </div>
            <a class="btn btn--sm" href="booking.html?trip=${encodeURIComponent(trip.slug)}">বুক করুন</a>
          </div>
        </div>
      </article>`;
  }

  function skeletonCards(n) {
    let out = "";
    for (let i = 0; i < n; i++) {
      out += `<div class="trip-card trip-card--skeleton"><div class="sk sk--media"></div><div class="trip-card__body"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div></div>`;
    }
    return out;
  }

  /* ---------- data ---------- */
  async function fetchTrips(limit) {
    if (!window.gtClient) return [];
    let q = window.gtClient
      .from("trips")
      .select("*")
      .eq("is_active", true)
      .order("departure_date", { ascending: true, nullsFirst: false });
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function fetchTripBySlug(slug) {
    if (!window.gtClient) return null;
    const { data, error } = await window.gtClient
      .from("trips")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /* ---------- nav ---------- */
  function initNav() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav]");
    if (toggle && nav) {
      toggle.addEventListener("click", () => nav.classList.toggle("is-open"));
    }
    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("[data-nav] a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href === path) a.classList.add("is-active");
    });
  }

  function initYear() {
    document.querySelectorAll("[data-year]").forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  function initBrand() {
    document.querySelectorAll("[data-brand]").forEach((el) => {
      el.textContent = cfg.BRAND_NAME || "Gouri Travels";
    });
    document.querySelectorAll("[data-phone]").forEach((el) => {
      el.textContent = cfg.PHONE || "";
      if (el.tagName === "A") el.href = "tel:" + String(cfg.PHONE || "").replace(/\s/g, "");
    });
    document.querySelectorAll("[data-email]").forEach((el) => {
      el.textContent = cfg.EMAIL || "";
      if (el.tagName === "A") el.href = "mailto:" + (cfg.EMAIL || "");
    });
    document.querySelectorAll("[data-whatsapp]").forEach((el) => {
      el.href = "https://wa.me/" + (cfg.WHATSAPP_NUMBER || "");
    });
  }

  function showConfigWarning() {
    if (window.gtConfigured) return;
    const bar = document.createElement("div");
    bar.className = "config-warning";
    bar.innerHTML =
      "⚠️ Supabase কনফিগার করা হয়নি — <code>public/js/config.js</code> এ আপনার Project URL ও anon key বসান।";
    document.body.prepend(bar);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    initYear();
    initBrand();
    showConfigWarning();
  });

  window.GT = {
    inr,
    prettyDate,
    escapeHtml,
    seatsLeft,
    toast,
    tripCard,
    skeletonCards,
    fetchTrips,
    fetchTripBySlug,
  };
})();
