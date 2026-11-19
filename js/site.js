/* ---------------------------------------------------------------
 * Gouri Travels — public site renderer
 *
 * Every page is built from content.json, which the admin panel writes
 * to Supabase (settings key "site_content"). Nothing here is hard-coded,
 * so an edit in /admin/ shows up on the public site on the next load.
 * ------------------------------------------------------------- */
(function () {
  "use strict";

  var IMG = window.GT_IMG || {};
  var CONTENT = null;
  var view = document.getElementById("view");
  var current = null;

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function resolve(key) {
    if (!key) return key;
    var k = String(key).replace(/^\.?\//, "");
    if (/^(data:|https?:|mailto:|tel:|#)/.test(k)) return k;
    var bare = k.replace(/^images\//, "");
    if (IMG[bare]) return IMG[bare];
    var stem = bare.replace(/\.[a-z0-9]+$/i, "");
    if (IMG[stem]) return IMG[stem];
    return k;
  }

  function hydrate(root) {
    if (!root) return;
    var i, el;
    var imgs = root.querySelectorAll("img[src]");
    for (i = 0; i < imgs.length; i++) {
      el = imgs[i];
      var s = el.getAttribute("src");
      var r = resolve(s);
      if (r !== s) el.setAttribute("src", r);
    }
    var fulls = root.querySelectorAll("[data-full]");
    for (i = 0; i < fulls.length; i++) {
      var d = fulls[i].getAttribute("data-full");
      var rd = resolve(d);
      if (rd !== d) fulls[i].setAttribute("data-full", rd);
    }
  }

  var ARROW =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function pill(text) {
    return '<h1 class="pill">' + ARROW + " " + esc(text) + "</h1>";
  }

  /* ---------------- page builders ---------------- */
  function cardGrid(list) {
    return (
      '<div class="cards">' +
      list
        .map(function (t) {
          return (
            '<a class="card" href="#/tour-' + esc(t.id) + '">' +
            '<img src="' + esc(t.image) + '" alt="' + esc(t.title) + '">' +
            '<span class="cap">' + esc(t.title) + "</span></a>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function buildHome(c) {
    var h = c.hero || {};
    var slides = (h.slides || [])
      .map(function (src, i) {
        return (
          '<div class="slide' + (i === 0 ? " on" : "") + '">' +
          '<img src="' + esc(src) + '" alt="' + esc(h.caption || "") + '"' +
          (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + "></div>"
        );
      })
      .join("");

    var dots = (h.slides || [])
      .map(function (_, i) {
        return '<button class="' + (i === 0 ? "on" : "") + '" aria-label="Slide ' + (i + 1) + '"></button>';
      })
      .join("");

    var w = c.welcome || {};
    var paras = (w.paragraphs || []).map(function (p) {
      return "<p>" + p + "</p>";
    }).join("");

    var stats = (c.stats || [])
      .map(function (s) {
        return (
          '<div class="stat"><i><svg viewBox="0 0 24 24" width="34" height="34" fill="none" ' +
          'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z"/></svg></i>' +
          '<div class="num" data-target="' + Number(s.num || 0) + '">0</div>' +
          "<strong>" + esc(s.label) + "</strong></div>"
        );
      })
      .join("");

    return (
      '<section class="hero"><div class="hero-track">' + slides +
      '<div class="hero-caption"><h2>' + esc(h.caption || "") + "</h2>" +
      '<a class="btn-ghost" href="#/tourpackage">View Tours ' + ARROW + "</a></div>" +
      '<button class="hero-arrow prev" aria-label="Previous slide"><svg viewBox="0 0 24 24" width="20" height="20" ' +
      'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M15 18l-6-6 6-6"/></svg></button>' +
      '<button class="hero-arrow next" aria-label="Next slide"><svg viewBox="0 0 24 24" width="20" height="20" ' +
      'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 18l6-6-6-6"/></svg></button>' +
      '<div class="hero-dots">' + dots + "</div></div></section>" +

      '<section class="section"><div class="container">' + pill(w.title || "Welcome To Our Website") +
      '<div class="welcome-grid"><div class="welcome-copy">' + paras + "</div>" +
      '<div class="welcome-photo"><div class="badge-est"><b>' + esc(w.sinceYear || "") + "</b><span>" +
      esc(w.sinceLabel || "Since") + '</span></div><img src="' + esc(w.photo || "") + '" alt="' +
      esc(c.brand || "Gouri Travels") + '"></div></div></div></section>' +

      '<section class="section" style="padding-top:0"><div class="container">' +
      '<h2 class="pill">' + ARROW + " Upcoming Tours</h2>" + cardGrid(c.tours || []) +
      "</div></section>" +

      '<section class="stats"><div class="container"><div class="stats-grid">' + stats +
      "</div></div></section>"
    );
  }

  function buildTourPackage(c) {
    return (
      '<div class="page-top"></div><section class="section"><div class="container">' +
      pill("Tour Packages") +
      '<p class="lead">Handpicked domestic and international departures from Kolkata &mdash; ' +
      "every package can be customised to your dates, hotel category and budget.</p>" +
      cardGrid(c.tours || []) +
      "</div></section>"
    );
  }

  function buildGallery(c) {
    var items = (c.gallery || [])
      .map(function (g) {
        return (
          '<button class="gal-item" data-full="' + esc(g.image) + '" data-title="' + esc(g.title) + '">' +
          '<img src="' + esc(g.image) + '" alt="' + esc(g.title) + '" loading="lazy">' +
          '<span class="cap">' + esc(g.title) + "</span></button>"
        );
      })
      .join("");
    return (
      '<div class="page-top"></div><section class="section"><div class="container">' +
      pill("Photo Gallery") +
      '<p class="lead">Moments from our tours across India and abroad. Click any photo to view it larger.</p>' +
      '<div class="gal-grid">' + items + "</div></div></section>"
    );
  }

  function buildContact(c) {
    var blocks = (c.contact && c.contact.blocks ? c.contact.blocks : [])
      .map(function (b) {
        return '<div class="contact-block"><h3>' + esc(b.title) + "</h3><p>" + b.html + "</p></div>";
      })
      .join("");

    var mail = esc(c.enquiryEmail || "");
    var tel = esc(c.enquiryPhoneTel || "");
    var phone = esc(c.enquiryPhone || "");

    return (
      '<div class="page-top"></div><section class="section"><div class="container">' +
      '<div class="contact-grid"><div>' + pill("Contact Details") + blocks + "</div><div>" +
      pill("Enquire Us") +
      '<form id="enquiryForm" novalidate>' +
      '<div class="form-row"><label for="f-name">Name</label>' +
      '<input type="text" id="f-name" name="name" placeholder="Your name" autocomplete="name" required></div>' +
      '<div class="form-row"><label for="f-address">Address</label>' +
      '<textarea id="f-address" name="address" rows="2" placeholder="Your address" autocomplete="street-address" required></textarea></div>' +
      '<div class="form-row"><label for="f-phone">Contact No.</label>' +
      '<input type="tel" id="f-phone" name="phone" placeholder="10 digit mobile number" inputmode="numeric" maxlength="10" required></div>' +
      '<div class="form-row"><label for="f-email">Email</label>' +
      '<input type="email" id="f-email" name="email" placeholder="you@example.com" autocomplete="email"></div>' +
      '<div class="form-row"><label for="f-message">Message</label>' +
      '<textarea id="f-message" name="message" rows="3" placeholder="Tell us where you would like to go"></textarea></div>' +
      '<button type="submit" class="btn-submit">Submit</button>' +
      '<p class="form-note">Submitting opens your own email app with the details filled in, addressed to ' +
      mail + ".</p>" +
      '<div class="form-msg" id="formMsg">Your email app should now be open with your enquiry. ' +
      'If nothing happened, please write to <a href="mailto:' + mail + '">' + mail + "</a> or call " +
      phone + ".</div></form></div></div></div></section>"
    );
  }

  function buildTour(c, id) {
    var t = null;
    for (var i = 0; i < (c.tours || []).length; i++) {
      if (String(c.tours[i].id) === String(id)) { t = c.tours[i]; break; }
    }
    if (!t) return null;

    var body = (t.blocks || [])
      .map(function (b) {
        if (b.t === "subhead") return '<div class="subhead">' + esc(b.text) + "</div>";
        if (b.t === "day")
          return '<div class="day"><div class="dnum">' + esc(b.num) + '</div><div class="dtxt">' +
            esc(b.text) + "</div></div>";
        if (b.t === "list")
          return '<ul class="inc">' + (b.items || []).map(function (x) {
            return "<li>" + esc(x) + "</li>";
          }).join("") + "</ul>";
        if (b.t === "para") return "<p>" + esc(b.text) + "</p>";
        return "";
      })
      .join("");

    var tel = esc(c.enquiryPhoneTel || "");
    var phone = esc(c.enquiryPhone || "");

    return (
      '<div class="page-top"></div><section class="section"><div class="container">' +
      '<h1 class="pill" style="text-transform:uppercase">' + ARROW + " " + esc(t.title) + "</h1>" +
      '<div class="detail-wrap"><div class="detail-body">' +
      '<img class="detail-hero" src="' + esc(t.image) + '" alt="' + esc(t.title) + '">' +
      body +
      '<div style="clear:both"></div>' +
      '<a class="back-link" href="#/tourpackage"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" ' +
      'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M19 12H5M11 18l-6-6 6-6"/></svg> Back to Tour Packages</a></div>' +
      '<aside class="side-card"><h3>Enquire about this tour</h3>' +
      "<p>Tell us your preferred dates and number of travellers &mdash; we will send a customised quote.</p>" +
      '<a class="btn" href="tel:' + tel + '">Call ' + phone + "</a>" +
      '<a class="btn alt" href="#/contact">Send an Enquiry</a>' +
      '<p style="margin:16px 0 0;font-size:13px">Hotel Raj Palace desk: 9836905770<br>' +
      "Landline: 033 &ndash; 48098671</p></aside></div></div></section>"
    );
  }

  /* ---------------- footer ---------------- */
  function paintFooter(c) {
    var f = c.footer || {};
    var host = document.querySelector(".footernav");
    if (!host) return;

    var phones = (f.phones || [])
      .map(function (p) {
        return '<a href="tel:' + esc(p.tel) + '">' + p.label + "</a>";
      })
      .join(", ");

    var addrIcon =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>' +
      '<circle cx="12" cy="10" r="3"/></svg>';
    var phoneIcon =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 ' +
      '19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 ' +
      '2.1L8.1 9.9a16 16 0 006 6l1.3-1.2a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/></svg>';
    var mailIcon =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/>' +
      '<path d="M22 6l-10 7L2 6"/></svg>';

    host.innerHTML =
      '<div class="container"><div class="footer-grid">' +
      "<div><h4>Quick Links</h4><ul>" +
      '<li><a href="#/">Home</a></li><li><a href="#/tourpackage">Tour Package</a></li>' +
      '<li><a href="#/gallery">Gallery</a></li><li><a href="#/contact">Contact Us</a></li></ul></div>' +
      "<div><h4>Reach Us</h4>" +
      '<div class="addr">' + addrIcon + "<div>" + (f.address || "") + "</div></div>" +
      '<div class="addr">' + phoneIcon + "<div>" + phones + "</div></div>" +
      '<div class="addr">' + mailIcon + '<div><a href="mailto:' + esc(f.email || "") + '">' +
      esc(f.email || "") + "</a></div></div></div>" +
      "<div><h4>Subscribe Now</h4>" +
      '<p style="margin:0 0 12px;color:#bdb7b7">' + esc(f.subscribeText || "") + "</p>" +
      '<form class="sub-form" id="subForm" novalidate>' +
      '<input type="email" name="subEmail" placeholder="Enter your email" aria-label="Email address" required>' +
      "<button type=\"submit\">Subscribe</button></form>" +
      '<p class="sub-note" id="subNote">' + esc(f.subscribeNote || "") + "</p></div>" +
      "</div></div>" +
      '<div class="copyright">' + (f.copyright || "") +
      '<a href="admin/" style="color:inherit;text-decoration:underline">Admin Panel</a>' +
      ' &nbsp;|&nbsp; Powered By <a href="http://devinfotech.in/" target="_blank" rel="noopener">Sayan</a></div>';
  }

  /* ---------------- router ---------------- */
  function routeFromHash() {
    var h = (location.hash || "").replace(/^#\/?/, "").replace(/\/+$/, "");
    return h || "home";
  }

  function navFor(route) {
    if (route === "home") return "home";
    if (route === "tourpackage") return "tourpackage";
    if (route === "gallery") return "gallery";
    if (route === "contact") return "contact";
    if (/^tour-/.test(route)) return "tourpackage";
    return "";
  }

  function paintNav(route) {
    var key = navFor(route);
    var links = document.querySelectorAll(".nav a");
    for (var i = 0; i < links.length; i++) {
      var href = (links[i].getAttribute("href") || "").replace(/^#\//, "");
      if (href === "") href = "home";
      links[i].classList.toggle("active", href === key);
    }
    var mob = document.querySelectorAll(".mobile-bar a");
    for (var j = 0; j < mob.length; j++) {
      var mh = (mob[j].getAttribute("href") || "").replace(/^#\//, "");
      if (mh === "") mh = "home";
      mob[j].classList.toggle("active", mh === key);
    }
  }

  function render() {
    if (!CONTENT) return;
    var route = routeFromHash();
    var html = null;
    var title = "Gouri Travels | Tour Operator in Kolkata";

    if (route === "home") html = buildHome(CONTENT);
    else if (route === "tourpackage") { html = buildTourPackage(CONTENT); title = "Tour Packages | Gouri Travels"; }
    else if (route === "gallery") { html = buildGallery(CONTENT); title = "Photo Gallery | Gouri Travels"; }
    else if (route === "contact") { html = buildContact(CONTENT); title = "Contact Us | Gouri Travels"; }
    else if (/^tour-/.test(route)) {
      html = buildTour(CONTENT, route.replace(/^tour-/, ""));
      if (html) {
        var t = null;
        for (var i = 0; i < CONTENT.tours.length; i++) {
          if (String(CONTENT.tours[i].id) === route.replace(/^tour-/, "")) { t = CONTENT.tours[i]; break; }
        }
        if (t) title = t.title + " | Gouri Travels";
      }
    }

    if (!html) { route = "home"; html = buildHome(CONTENT); }
    if (current === route) return;

    var oldLb = document.getElementById("lightbox");
    if (oldLb) oldLb.classList.remove("on");
    if (window.__heroTimer) { clearInterval(window.__heroTimer); window.__heroTimer = null; }

    view.innerHTML = html;
    hydrate(view);

    document.title = title;
    paintNav(route);
    current = route;

    var nav = document.querySelector(".nav");
    if (nav) nav.classList.remove("open");
    document.body.classList.remove("is-nav-open");
    window.scrollTo(0, 0);

    afterRender();
  }

  /* ---------------- per-render wiring ---------------- */
  function afterRender() {
    var hdr = document.querySelector(".site-header");
    var hero = document.querySelector(".hero");
    if (hdr) {
      if (hero) {
        var onScroll = function () {
          if (window.scrollY > hero.offsetHeight - 90) hdr.classList.add("is-stuck");
          else hdr.classList.remove("is-stuck");
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      } else {
        hdr.classList.remove("is-stuck");
      }
    }

    var tgl = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav");
    if (tgl && nav && !tgl.__wired) {
      tgl.__wired = true;
      tgl.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        tgl.setAttribute("aria-expanded", open ? "true" : "false");
        document.body.classList.toggle("is-nav-open", open);
      });
    }

    /* carousel */
    var slides = Array.prototype.slice.call(document.querySelectorAll(".hero .slide"));
    if (slides.length) {
      var dots = Array.prototype.slice.call(document.querySelectorAll(".hero-dots button"));
      var idx = 0, timer = null;
      var show = function (n) {
        idx = (n + slides.length) % slides.length;
        slides.forEach(function (s, k) { s.classList.toggle("on", k === idx); });
        dots.forEach(function (d, k) { d.classList.toggle("on", k === idx); });
      };
      var stop = function () { if (timer) clearInterval(timer); };
      var start = function () {
        stop();
        timer = setInterval(function () { show(idx + 1); }, 5500);
        window.__heroTimer = timer;
      };
      dots.forEach(function (d, k) { d.onclick = function () { show(k); start(); }; });
      var p = document.querySelector(".hero-arrow.prev");
      var nx = document.querySelector(".hero-arrow.next");
      if (p) p.onclick = function () { show(idx - 1); start(); };
      if (nx) nx.onclick = function () { show(idx + 1); start(); };
      show(0); start();
    }

    /* counters */
    var nums = Array.prototype.slice.call(document.querySelectorAll(".num[data-target]"));
    if (nums.length) {
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            var el = e.target;
            var target = parseInt(el.getAttribute("data-target"), 10);
            var t0 = null;
            function step(ts) {
              if (!t0) t0 = ts;
              var pr = Math.min((ts - t0) / 1600, 1);
              el.textContent = Math.floor(target * (1 - Math.pow(1 - pr, 3))).toLocaleString("en-IN");
              if (pr < 1) requestAnimationFrame(step);
              else el.textContent = target.toLocaleString("en-IN");
            }
            requestAnimationFrame(step);
            io.unobserve(el);
          });
        }, { threshold: 0.4 });
        nums.forEach(function (n) { n.textContent = "0"; io.observe(n); });
      } else {
        nums.forEach(function (n) {
          n.textContent = parseInt(n.getAttribute("data-target"), 10).toLocaleString("en-IN");
        });
      }
    }

    /* lightbox */
    var lb = document.getElementById("lightbox");
    if (lb) {
      var lbImg = lb.querySelector("img");
      var lbCap = lb.querySelector(".lb-cap");
      var close = function () { lb.classList.remove("on"); lbImg.removeAttribute("src"); };
      Array.prototype.slice.call(document.querySelectorAll(".gal-item")).forEach(function (it) {
        it.onclick = function () {
          lbImg.src = it.getAttribute("data-full") || "";
          lbCap.textContent = it.getAttribute("data-title") || "";
          lb.classList.add("on");
        };
      });
      lb.onclick = function (e) {
        if (e.target === lb || (e.target.classList && e.target.classList.contains("lb-close"))) close();
      };
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    }

    /* subscribe */
    var sub = document.getElementById("subForm");
    if (sub) {
      sub.onsubmit = function (e) {
        e.preventDefault();
        var inp = sub.querySelector("input");
        var note = document.getElementById("subNote");
        var v = inp ? inp.value.trim() : "";
        if (!v || v.indexOf("@") < 1) {
          if (note) { note.textContent = "Please enter a valid email address."; note.style.color = "#ff8a80"; }
          return;
        }
        var addr = (CONTENT && CONTENT.enquiryEmail) || "gouritravels146@gmail.com";
        window.location.href = "mailto:" + addr +
          "?subject=" + encodeURIComponent("Newsletter subscription") +
          "&body=" + encodeURIComponent("Please add this address to the Gouri Travels mailing list: " + v);
        if (note) {
          note.textContent = "Your email app should now be open \u2014 send the message to complete your subscription.";
          note.style.color = "#bdb7b7";
        }
      };
    }

    /* enquiry */
    var form = document.getElementById("enquiryForm");
    if (form) {
      form.onsubmit = function (e) {
        e.preventDefault();
        var g = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ""; };
        var body = "Name: " + g("name") + "\nAddress: " + g("address") +
          "\nContact No.: " + g("phone") + "\nEmail: " + g("email") +
          "\n\nMessage:\n" + g("message");
        var addr = (CONTENT && CONTENT.enquiryEmail) || "gouritravels146@gmail.com";
        window.location.href = "mailto:" + addr +
          "?subject=" + encodeURIComponent("Website enquiry from " + g("name")) +
          "&body=" + encodeURIComponent(body);
        var msg = document.getElementById("formMsg");
        if (msg) msg.classList.add("on");
      };
    }
  }

  /* ---------------- content sources ---------------- */
  /* 1. Supabase settings row (written by the admin panel) — preferred
   * 2. content.json shipped with the site — fallback, so the site never
   *    goes blank if Supabase is unreachable or the row is missing. */
  function fromSupabase() {
    var cfg = window.GT_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return Promise.reject(new Error("no config"));
    var url = cfg.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/settings" +
      "?key=eq." + encodeURIComponent(cfg.CONTENT_KEY || "site_content") + "&select=value";
    return fetch(url, {
      headers: {
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY,
      },
      cache: "no-store",
    })
      .then(function (r) {
        if (!r.ok) throw new Error("supabase " + r.status);
        return r.json();
      })
      .then(function (rows) {
        if (!rows || !rows.length || !rows[0].value) throw new Error("no content row");
        var c = JSON.parse(rows[0].value);
        if (!c || !c.tours) throw new Error("bad content");
        return c;
      });
  }

  function fromFile() {
    return fetch("content.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("content.json " + r.status);
      return r.json();
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    fromSupabase()
      .catch(function () { return fromFile(); })
      .then(function (c) {
        CONTENT = c;
        paintFooter(c);
        window.addEventListener("hashchange", render);
        render();
      })
      .catch(function (err) {
        view.innerHTML =
          '<section class="section"><div class="container">' +
          '<h1 class="pill">Content unavailable</h1>' +
          "<p>The site content could not be loaded (" + esc(err.message) + "). " +
          "Please refresh, or open the admin panel to check the content.</p></div></section>";
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
