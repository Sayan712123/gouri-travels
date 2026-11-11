/* ---------------------------------------------------------------
 * Gouri Travels — shared public-site helpers
 * ------------------------------------------------------------- */
(function () {
  const cfg = window.GT_CONFIG || {};

  /* ================= demo data =================
   * Supabase কনফিগার করা না থাকলে সাইটটি এই নমুনা ডেটা দিয়ে চলে,
   * যাতে GitHub Pages-এ পেজগুলো খালি/ভাঙা না দেখায়।
   * config.js-এ Project URL ও anon key বসালেই আসল ডেটা চালু হবে।
   * ============================================ */
  function demoDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  const DEMO_SEED = [
    {
      slug: "darjeeling-gangtok-5d",
      title: "Darjeeling & Gangtok",
      destination: "West Bengal, Sikkim",
      summary: "চা-বাগান, টয় ট্রেন আর কাঞ্চনজঙ্ঘার সূর্যোদয় — একসাথে ৫ দিনের আরামদায়ক ট্রিপ।",
      description: "দার্জিলিং, টাইগার হিল, বাতাসিয়া লুপ ও গ্যাংটকের মঠ — সব মিলিয়ে একটি ক্লাসিক হিমালয় ভ্রমণ। আরামদায়ক হোটেল, প্রাইভেট গাড়ি ও স্থানীয় গাইড সহ।",
      duration_days: 5,
      price_per_person: 12500,
      seats_total: 24,
      seats_booked: 19,
      offset: 20,
      cover_image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=70",
      highlights: ["টাইগার হিল সূর্যোদয়", "দার্জিলিং হিমালয়ান রেলওয়ে", "সোমগো লেক", "এমজি মার্গ, গ্যাংটক"],
      itinerary: [
        { day: 1, title: "দার্জিলিং পৌঁছানো", detail: "NJP / বাগডোগরা থেকে পিকআপ ও হোটেলে ট্রান্সফার।" },
        { day: 2, title: "দার্জিলিং দর্শন", detail: "টাইগার হিল, বাতাসিয়া লুপ, হিমালয়ান চিড়িয়াখানা ও চা-বাগান।" },
        { day: 3, title: "গ্যাংটক যাত্রা", detail: "তিস্তার পাশ ধরে মনোরম ড্রাইভ, সন্ধ্যায় এমজি মার্গ।" },
        { day: 4, title: "সোমগো লেক ও বাবা মন্দির", detail: "পারমিট সহ সারাদিনের ভ্রমণ।" },
        { day: 5, title: "প্রত্যাবর্তন", detail: "NJP / বাগডোগরায় ড্রপ।" },
      ],
    },
    {
      slug: "digha-shankarpur-3d",
      title: "Digha & Shankarpur Beach Break",
      destination: "Digha, West Bengal",
      summary: "সমুদ্রের হাওয়া, টাটকা মাছ আর শান্ত সৈকত — পরিবারের জন্য পারফেক্ট উইকএন্ড।",
      description: "বঙ্গোপসাগরের তীরে তিনটি সহজ দিন — সি-ফেসিং হোটেল, দিঘার সৈকত এবং শান্ত শঙ্করপুর মাছ ধরার বন্দর।",
      duration_days: 3,
      price_per_person: 5400,
      seats_total: 30,
      seats_booked: 22,
      offset: 12,
      cover_image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=70",
      highlights: ["সি-ফেসিং থাকার ব্যবস্থা", "শঙ্করপুর সৈকত", "মেরিন অ্যাকুরিয়াম", "স্থানীয় সামুদ্রিক খাবার"],
      itinerary: [
        { day: 1, title: "পৌঁছানো ও সৈকতে সন্ধ্যা", detail: "চেক-ইন ও নিউ দিঘা সৈকতে সূর্যাস্ত।" },
        { day: 2, title: "শঙ্করপুর ও তালসারি", detail: "নৌকা ভ্রমণ ও লাল কাঁকড়ার সৈকত।" },
        { day: 3, title: "প্রত্যাবর্তন", detail: "সকালের নাস্তা ও ফেরার ট্রান্সফার।" },
      ],
    },
    {
      slug: "puri-konark-4d",
      title: "Puri & Konark Heritage",
      destination: "Puri, Odisha",
      summary: "জগন্নাথ মন্দির, চন্দ্রভাগা সৈকত আর কোণার্কের সূর্য মন্দির।",
      description: "পুরীকে ঘিরে একটি ভক্তিমূলক ও ঐতিহ্যবাহী ভ্রমণ — আরামদায়ক থাকা, মন্দির দর্শনে সহায়তা ও গাইড সহ কোণার্ক ভ্রমণ।",
      duration_days: 4,
      price_per_person: 8900,
      seats_total: 26,
      seats_booked: 14,
      offset: 30,
      cover_image_url: "https://images.unsplash.com/photo-1620766165457-a8025baa82e0?auto=format&fit=crop&w=1200&q=70",
      highlights: ["জগন্নাথ মন্দির দর্শন", "কোণার্ক সূর্য মন্দির", "চন্দ্রভাগা সৈকত", "চিলিকা লেগুন"],
      itinerary: [
        { day: 1, title: "পুরী পৌঁছানো", detail: "চেক-ইন ও সন্ধ্যায় আরতি।" },
        { day: 2, title: "পুরী ও চিলিকা", detail: "মন্দির দর্শন ও চিলিকা ডলফিন পয়েন্ট।" },
        { day: 3, title: "কোণার্ক ভ্রমণ", detail: "সূর্য মন্দির, চন্দ্রভাগা ও রামচণ্ডী।" },
        { day: 4, title: "প্রত্যাবর্তন", detail: "ভুবনেশ্বরে ফেরার ট্রান্সফার।" },
      ],
    },
    {
      slug: "meghalaya-6d",
      title: "Meghalaya — Abode of Clouds",
      destination: "Shillong, Cherrapunji, Dawki",
      summary: "লিভিং রুট ব্রিজ, স্বচ্ছ ডাওকি নদী আর পৃথিবীর সবচেয়ে বেশি বৃষ্টির জায়গা।",
      description: "শিলং, চেরাপুঞ্জি ও ডাওকি জুড়ে ছয় দিন — জলপ্রপাত, রুট-ব্রিজ ট্রেক এবং উমঙ্গট নদীতে নৌকা ভ্রমণ।",
      duration_days: 6,
      price_per_person: 21500,
      seats_total: 18,
      seats_booked: 11,
      offset: 40,
      cover_image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=70",
      highlights: ["ডাবল-ডেকার রুট ব্রিজ", "ডাওকি নৌকা ভ্রমণ", "নোহকালিকাই জলপ্রপাত", "মলিনং গ্রাম"],
      itinerary: [
        { day: 1, title: "গুয়াহাটি থেকে শিলং", detail: "উমিয়াম লেক স্টপ ও পুলিশ বাজারে সন্ধ্যার হাঁটা।" },
        { day: 2, title: "শিলং লোকাল", detail: "এলিফ্যান্ট ফলস, শিলং পিক ও ডন বস্কো মিউজিয়াম।" },
        { day: 3, title: "শিলং থেকে চেরাপুঞ্জি", detail: "নোহকালিকাই ও সেভেন সিস্টার্স জলপ্রপাত।" },
        { day: 4, title: "রুট ব্রিজ ট্রেক", detail: "নংরিয়াট ডাবল-ডেকার ব্রিজ ট্রেক।" },
        { day: 5, title: "ডাওকি ও মলিনং", detail: "উমঙ্গট নদীতে নৌকা ও পরিষ্কার গ্রাম।" },
        { day: 6, title: "প্রত্যাবর্তন", detail: "গুয়াহাটিতে ফেরার ড্রাইভ।" },
      ],
    },
    {
      slug: "kashmir-7d",
      title: "Kashmir Valley Grand Tour",
      destination: "Srinagar, Gulmarg, Pahalgam",
      summary: "ডাল লেকের হাউসবোট, গুলমার্গের গন্ডোলা আর পহেলগামের সবুজ মাঠ।",
      description: "সাত দিনের কাশ্মীর ভ্রমণ — ডাল লেকে শিকারা রাইড, এক রাত হাউসবোটে, গুলমার্গ গন্ডোলা এবং পহেলগামের বেটাব ভ্যালি।",
      duration_days: 7,
      price_per_person: 32500,
      seats_total: 16,
      seats_booked: 9,
      offset: 55,
      cover_image_url: "https://images.unsplash.com/photo-1566837945700-30057527ade0?auto=format&fit=crop&w=1200&q=70",
      highlights: ["ডাল লেক শিকারা", "হাউসবোটে রাত", "গুলমার্গ গন্ডোলা", "পহেলগাম বেটাব ভ্যালি"],
      itinerary: [
        { day: 1, title: "শ্রীনগর পৌঁছানো", detail: "হাউসবোটে চেক-ইন ও শিকারা রাইড।" },
        { day: 2, title: "মুঘল গার্ডেন", detail: "নিশাত, শালিমার ও চশমে শাহি।" },
        { day: 3, title: "গুলমার্গ", detail: "গন্ডোলা রাইড ও তুষার খেলা।" },
        { day: 4, title: "পহেলগাম", detail: "বেটাব ভ্যালি ও আরু ভ্যালি।" },
        { day: 5, title: "সোনমার্গ", detail: "গ্লেসিয়ার ও পাইন বন।" },
        { day: 6, title: "দোদপথর", detail: "ফুলের মাঠ ও গুজ্জর বসতি।" },
        { day: 7, title: "প্রত্যাবর্তন", detail: "শ্রীনগর এয়ারপোর্টে ড্রপ।" },
      ],
    },
    {
      slug: "andaman-6d",
      title: "Andaman Islands Escape",
      destination: "Port Blair, Havelock",
      summary: "নীল জলের দ্বীপ, রাধানগর সৈকত আর স্কুবা ডাইভিং।",
      description: "পোর্ট ব্লেয়ার ও হ্যাভলক জুড়ে ছয় দিন — সেলুলার জেল, রাধানগর সৈকত, এলিফ্যান্ট বিচ এবং প্রবাল দ্বীপে স্নরকেলিং।",
      duration_days: 6,
      price_per_person: 28900,
      seats_total: 20,
      seats_booked: 13,
      offset: 65,
      cover_image_url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=70",
      highlights: ["সেলুলার জেল", "রাধানগর সৈকত", "এলিফ্যান্ট বিচ", "স্নরকেলিং ও স্কুবা"],
      itinerary: [
        { day: 1, title: "পোর্ট ব্লেয়ার", detail: "কর্পিন'স কোভ সৈকত ও লাইট অ্যান্ড সাউন্ড শো।" },
        { day: 2, title: "হ্যাভলক যাত্রা", detail: "ফেরি ও রাধানগর সৈকতে সূর্যাস্ত।" },
        { day: 3, title: "এলিফ্যান্ট বিচ", detail: "স্নরকেলিং ও সমুদ্র সৈকত।" },
        { day: 4, title: "নীল দ্বীপ", detail: "স্কুবা ডাইভিং ও প্রবাল।" },
        { day: 5, title: "পোর্ট ব্লেয়ার ফেরা", detail: "সেলুলার জেল ও আবেরডিন বাজার।" },
        { day: 6, title: "প্রত্যাবর্তন", detail: "এয়ারপোর্টে ড্রপ।" },
      ],
    },
  ];

  function buildDemoTrips() {
    return DEMO_SEED.map(function (t, i) {
      const trip = Object.assign({}, t);
      delete trip.offset;
      trip.id = "demo-" + (i + 1);
      trip.departure_date = demoDate(t.offset);
      trip.return_date = demoDate(t.offset + t.duration_days - 1);
      trip.is_active = true;
      return trip;
    });
  }

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
    if (!window.gtClient) {
      const demo = buildDemoTrips();
      return limit ? demo.slice(0, limit) : demo;
    }
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
    if (!window.gtClient) {
      return buildDemoTrips().find((t) => t.slug === slug) || null;
    }
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
      "🔧 <strong>ডেমো মোড</strong> — Supabase এখনো কনফিগার করা হয়নি, তাই নমুনা ট্রিপ দেখানো হচ্ছে। <code>js/config.js</code>-এ Project URL ও anon key বসালেই আসল ডেটা চালু হবে।";
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
    buildDemoTrips,
  };
})();
