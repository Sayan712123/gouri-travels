/* ---------------------------------------------------------------
 * Gouri Travels — admin panel
 *
 * Auth      : Supabase Auth (email/password + Google OAuth), same project
 *             as before. Access is limited to emails in public.admins.
 * Content   : the whole public site is one JSON document stored in
 *             public.settings under the key "site_content". This panel
 *             edits that document and writes it back.
 * Enquiries : read from public.enquiries when that table exists.
 * ------------------------------------------------------------- */
(function () {
  "use strict";

  var cfg = window.GT_ADMIN_CONFIG || {};
  var CONTENT_KEY = cfg.CONTENT_KEY || "site_content";
  var sb = null;
  var C = null;            // the content document being edited
  var user = null;
  var dirty = false;
  var currentTab = "home";

  /* ---------------- small helpers ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, obj);
  }

  function setPath(obj, path, val) {
    var parts = path.split(".");
    var o = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (o[parts[i]] == null || typeof o[parts[i]] !== "object") o[parts[i]] = {};
      o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = val;
  }

  function note(msg, kind) {
    var el = $("#save-note");
    if (!el) return;
    el.textContent = msg;
    el.className = "save-note " + (kind || "ok");
    el.classList.remove("hidden");
    clearTimeout(note._t);
    note._t = setTimeout(function () { el.classList.add("hidden"); }, 5000);
  }

  function warn(msg) {
    var el = $("#admin-warning");
    if (!el) return;
    if (!msg) { el.classList.add("hidden"); el.innerHTML = ""; return; }
    el.innerHTML = msg;
    el.classList.remove("hidden");
  }

  function markDirty() { dirty = true; }

  /* ---------------- auth ---------------- */
  function showLogin() {
    $("#login-view").classList.remove("hidden");
    $("#dash-view").classList.add("hidden");
  }

  function showDash() {
    $("#login-view").classList.add("hidden");
    $("#dash-view").classList.remove("hidden");
    $("#admin-email").textContent = (user && user.email) || "admin";
  }

  function loginAlert(msg, kind) {
    var el = $("#login-alert");
    if (!el) return;
    el.innerHTML = msg ? '<div class="alert alert--' + (kind || "error") + '">' + esc(msg) + "</div>" : "";
  }

  /* Access rule: an email listed in public.admins is always allowed.
   * If that table is empty (or unreadable) any signed-in account is
   * allowed, so the panel can never lock the owner out on a fresh
   * project. Add your email to public.admins to restrict it. */
  function isAdminEmail(email) {
    if (!email) return Promise.resolve(false);
    return sb
      .from("admins")
      .select("email")
      .then(function (r) {
        if (r.error) return true;                 // table missing → don't block
        var rows = r.data || [];
        if (!rows.length) return true;            // no allow-list yet → don't block
        var me = String(email).toLowerCase();
        return rows.some(function (x) {
          return String(x.email || "").toLowerCase() === me;
        });
      });
  }

  function afterSignIn(session) {
    user = session && session.user ? session.user : null;
    if (!user) { showLogin(); return; }
    isAdminEmail(user.email).then(function (ok) {
      if (!ok) {
        sb.auth.signOut();
        showLogin();
        loginAlert(
          "This account (" + user.email + ") is not an admin. Add the email to the admins table in Supabase, then sign in again.",
          "error"
        );
        return;
      }
      showDash();
      loadContent();
    });
  }

  function wireAuth() {
    var form = $("#login-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = $("#email").value.trim();
        var pass = $("#password").value;
        if (!email || !pass) { loginAlert("Enter your email and password."); return; }
        var btn = $("#login-btn");
        btn.disabled = true;
        btn.textContent = "Signing in…";
        sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
          btn.disabled = false;
          btn.textContent = "Login";
          if (r.error) { loginAlert(r.error.message); return; }
          loginAlert("");
          afterSignIn(r.data.session);
        });
      });
    }

    var g = $("#google-btn");
    if (g) {
      g.addEventListener("click", function () {
        sb.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: location.origin + location.pathname },
        });
      });
    }

    var out = $("#logout-btn");
    if (out) {
      out.addEventListener("click", function () {
        if (dirty && !confirm("You have unsaved changes. Log out anyway?")) return;
        sb.auth.signOut().then(function () { location.reload(); });
      });
    }
  }

  /* ---------------- content load / save ---------------- */
  function loadContent() {
    warn("");
    sb.from("settings")
      .select("value")
      .eq("key", CONTENT_KEY)
      .then(function (r) {
        if (r.error) { warn("Could not read the content: " + esc(r.error.message)); return; }
        if (r.data && r.data.length && r.data[0].value) {
          try {
            C = JSON.parse(r.data[0].value);
          } catch (e) {
            warn("The stored content is not valid JSON: " + esc(e.message));
            return;
          }
        } else {
          // first run — seed from the copy shipped with the site
          return fetch("../content.json", { cache: "no-store" })
            .then(function (x) { return x.json(); })
            .then(function (seed) {
              C = seed;
              warn(
                "No saved content yet. The editor was filled from the site's built-in content — " +
                "press <strong>Save changes</strong> to publish it to Supabase."
              );
            });
        }
      })
      .then(function () {
        if (!C) return;
        normalise();
        fillAll();
        dirty = false;
      });
  }

  function normalise() {
    C.hero = C.hero || {};
    C.hero.slides = C.hero.slides || [];
    C.welcome = C.welcome || {};
    C.welcome.paragraphs = C.welcome.paragraphs || [];
    C.stats = C.stats || [];
    C.tours = C.tours || [];
    C.gallery = C.gallery || [];
    C.contact = C.contact || {};
    C.contact.blocks = C.contact.blocks || [];
    C.footer = C.footer || {};
    C.footer.phones = C.footer.phones || [];
  }

  function saveContent() {
    if (!C) return;
    var btn = $("#save-btn");
    btn.disabled = true;
    btn.textContent = "Saving…";
    var payload = JSON.stringify(C);
    sb.from("settings")
      .upsert({ key: CONTENT_KEY, value: payload }, { onConflict: "key" })
      .then(function (r) {
        btn.disabled = false;
        btn.textContent = "💾 Save changes";
        if (r.error) {
          showSaveBlocked(r.error.message);
          return;
        }
        dirty = false;
        note("Saved. The public site shows this on the next page load.", "ok");
      });
  }

  /* Saving needs an admins row: the settings table only accepts writes from
   * public.is_admin(). When that is missing we say exactly what to run and
   * offer the edited document as a file, so the work is never lost. */
  function showSaveBlocked(msg) {
    var el = $("#save-note");
    if (!el) return;
    el.className = "save-note err";
    el.classList.remove("hidden");
    el.innerHTML =
      "<strong>Supabase refused the save.</strong> " + esc(msg) + "<br><br>" +
      "The <code>settings</code> table only accepts writes from an admin, and your email is not in " +
      "the <code>admins</code> table yet." +
      '<div class="toolbar" style="margin-top:12px">' +
      '<button class="btn btn--sm" id="claim-admin" type="button">Make me an admin</button>' +
      '<button class="btn btn--ghost btn--sm" id="dl-content" type="button">Download content.json</button>' +
      "</div>" +
      '<p class="muted" style="margin:10px 0 0">If that is refused, the admins table already has rows — ' +
      "open the <strong>Supabase</strong> tab and add your email there, or run " +
      "<code>npm run supabase:setup</code>.</p>";

    var claim = $("#claim-admin");
    if (claim) {
      claim.addEventListener("click", function () {
        var email = (user && user.email) || "";
        if (!email) return;
        claim.disabled = true;
        claim.textContent = "Adding…";
        sb.from("admins")
          .insert({ email: email })
          .then(function (r) {
            claim.disabled = false;
            claim.textContent = "Make me an admin";
            if (r.error) {
              note("Could not add you: " + r.error.message, "err");
              return;
            }
            note("You are now an admin. Press Save changes again.", "ok");
            el.classList.add("hidden");
          });
      });
    }

    var dl = $("#dl-content");
    if (dl) {
      dl.addEventListener("click", function () {
        var blob = new Blob([JSON.stringify(C, null, 1)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "content.json";
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      });
    }
  }

  /* ---------------- generic bindings ---------------- */
  function fillAll() {
    $$("[data-bind]").forEach(function (el) {
      var path = el.getAttribute("data-bind");
      var v = getPath(C, path);
      if (el.getAttribute("data-list") === "1") {
        el.value = Array.isArray(v) ? v.join("\n") : v == null ? "" : String(v);
      } else {
        el.value = v == null ? "" : String(v);
      }
    });
    renderStats();
    renderGallery();
    renderContact();
    renderPhones();
    renderTours();
  }

  function wireBindings() {
    $$("[data-bind]").forEach(function (el) {
      el.addEventListener("input", function () {
        var path = el.getAttribute("data-bind");
        var val = el.value;
        if (el.getAttribute("data-list") === "1") {
          val = val.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
        }
        setPath(C, path, val);
        markDirty();
      });
    });
  }

  /* ---------------- repeatable editors ---------------- */
  function rowShell(inner, onRemove) {
    var row = document.createElement("div");
    row.className = "rep-row";
    row.innerHTML = inner + '<button class="rep-del" type="button" title="Remove">×</button>';
    row.querySelector(".rep-del").addEventListener("click", onRemove);
    return row;
  }

  function renderStats() {
    var host = $("#stats-editor");
    if (!host) return;
    host.innerHTML = "";
    C.stats.forEach(function (s, i) {
      var row = rowShell(
        '<label class="fld"><span>Number</span><input type="number" value="' + esc(s.num) + '"></label>' +
        '<label class="fld"><span>Label</span><input type="text" value="' + esc(s.label) + '"></label>',
        function () { C.stats.splice(i, 1); markDirty(); renderStats(); }
      );
      var inputs = row.querySelectorAll("input");
      inputs[0].addEventListener("input", function () { s.num = Number(this.value) || 0; markDirty(); });
      inputs[1].addEventListener("input", function () { s.label = this.value; markDirty(); });
      host.appendChild(row);
    });
  }

  function renderGallery() {
    var host = $("#gallery-editor");
    if (!host) return;
    host.innerHTML = "";
    C.gallery.forEach(function (g, i) {
      var row = rowShell(
        '<label class="fld"><span>Image</span><input type="text" value="' + esc(g.image) + '"></label>' +
        '<label class="fld"><span>Caption</span><input type="text" value="' + esc(g.title) + '"></label>',
        function () { C.gallery.splice(i, 1); markDirty(); renderGallery(); }
      );
      var inputs = row.querySelectorAll("input");
      inputs[0].addEventListener("input", function () { g.image = this.value; markDirty(); });
      inputs[1].addEventListener("input", function () { g.title = this.value; markDirty(); });
      host.appendChild(row);
    });
  }

  function renderContact() {
    var host = $("#contact-editor");
    if (!host) return;
    host.innerHTML = "";
    C.contact.blocks.forEach(function (b, i) {
      var row = rowShell(
        '<label class="fld"><span>Title</span><input type="text" value="' + esc(b.title) + '"></label>' +
        '<label class="fld fld--wide"><span>Body (HTML allowed)</span><textarea rows="4">' + esc(b.html) + "</textarea></label>",
        function () { C.contact.blocks.splice(i, 1); markDirty(); renderContact(); }
      );
      var t = row.querySelector("input");
      var a = row.querySelector("textarea");
      t.addEventListener("input", function () { b.title = this.value; markDirty(); });
      a.addEventListener("input", function () { b.html = this.value; markDirty(); });
      host.appendChild(row);
    });
  }

  function renderPhones() {
    var host = $("#phones-editor");
    if (!host) return;
    host.innerHTML = "";
    C.footer.phones.forEach(function (p, i) {
      var row = rowShell(
        '<label class="fld"><span>Label</span><input type="text" value="' + esc(p.label) + '"></label>' +
        '<label class="fld"><span>tel: link</span><input type="text" value="' + esc(p.tel) + '"></label>',
        function () { C.footer.phones.splice(i, 1); markDirty(); renderPhones(); }
      );
      var inputs = row.querySelectorAll("input");
      inputs[0].addEventListener("input", function () { p.label = this.value; markDirty(); });
      inputs[1].addEventListener("input", function () { p.tel = this.value; markDirty(); });
      host.appendChild(row);
    });
  }

  function wireAddButtons() {
    $$("[data-add]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = btn.getAttribute("data-add");
        if (kind === "stats") C.stats.push({ num: 0, label: "NEW" });
        if (kind === "gallery") C.gallery.push({ image: "images/tour-65.jpg", title: "New photo" });
        if (kind === "contact") C.contact.blocks.push({ title: "New block", html: "" });
        if (kind === "phones") C.footer.phones.push({ label: "", tel: "" });
        markDirty();
        fillAll();
      });
    });
  }

  /* ---------------- tours ---------------- */
  function renderTours() {
    var body = $("#tours-body");
    if (!body) return;
    body.innerHTML = "";
    C.tours.forEach(function (t, i) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td><img class="thumb" src="' + esc(t.image) + '" alt=""></td>' +
        "<td><strong>" + esc(t.title) + "</strong></td>" +
        "<td><code>" + esc(t.id) + "</code></td>" +
        "<td>" + (t.blocks || []).length + "</td>" +
        '<td><button class="btn btn--ghost btn--sm" data-edit="' + i + '">Edit</button> ' +
        '<button class="btn btn--ghost btn--sm" data-del="' + i + '">Delete</button></td>';
      tr.querySelector("[data-edit]").addEventListener("click", function () { openTour(i); });
      tr.querySelector("[data-del]").addEventListener("click", function () {
        if (!confirm('Delete "' + t.title + '"?')) return;
        C.tours.splice(i, 1);
        markDirty();
        renderTours();
      });
      body.appendChild(tr);
    });
  }

  var editingIndex = -1;

  function blocksToText(blocks) {
    return (blocks || [])
      .map(function (b) {
        if (b.t === "subhead") return "## " + b.text;
        if (b.t === "day") return "[" + b.num + "] " + b.text;
        if (b.t === "list") return (b.items || []).map(function (x) { return "- " + x; }).join("\n");
        if (b.t === "para") return b.text;
        return "";
      })
      .join("\n");
  }

  function textToBlocks(text) {
    var out = [];
    var list = null;
    String(text || "").split("\n").forEach(function (raw) {
      var line = raw.trim();
      if (!line) { list = null; return; }
      if (line.indexOf("## ") === 0) {
        out.push({ t: "subhead", text: line.slice(3).trim() });
        list = null;
      } else if (/^\[[^\]]+\]/.test(line)) {
        var m = line.match(/^\[([^\]]+)\]\s*(.*)$/);
        out.push({ t: "day", num: m[1].trim(), text: m[2].trim() });
        list = null;
      } else if (line.indexOf("- ") === 0) {
        if (!list) { list = { t: "list", items: [] }; out.push(list); }
        list.items.push(line.slice(2).trim());
      } else {
        out.push({ t: "para", text: line });
        list = null;
      }
    });
    return out;
  }

  function openTour(i) {
    editingIndex = i;
    var t = i >= 0 ? C.tours[i] : { id: "", title: "", image: "", blocks: [] };
    $("#modal-title").textContent = i >= 0 ? "Edit tour" : "New tour";
    $("#modal-body").innerHTML =
      '<div class="form-grid">' +
      '<label class="fld"><span>Title</span><input id="m-title" type="text" value="' + esc(t.title) + '"></label>' +
      '<label class="fld"><span>ID (used in the URL: #/tour-ID)</span><input id="m-id" type="text" value="' + esc(t.id) + '"></label>' +
      '<label class="fld fld--wide"><span>Cover image</span><input id="m-image" type="text" value="' + esc(t.image) + '"></label>' +
      '<label class="fld fld--wide"><span>Body — one item per line:<br>' +
      "<code>## Heading</code> · <code>[Day 1] text</code> · <code>- bullet</code> · plain line = paragraph</span>" +
      '<textarea id="m-blocks" rows="16">' + esc(blocksToText(t.blocks)) + "</textarea></label>" +
      "</div>";
    $("#modal").classList.add("on");
  }

  function closeModal() { $("#modal").classList.remove("on"); }

  function saveTour() {
    var title = $("#m-title").value.trim();
    var id = $("#m-id").value.trim();
    var image = $("#m-image").value.trim();
    var blocks = textToBlocks($("#m-blocks").value);
    if (!title) { alert("A title is required."); return; }
    if (!id) id = String(Date.now()).slice(-6);
    var clash = C.tours.some(function (t, k) { return String(t.id) === id && k !== editingIndex; });
    if (clash) { alert("Another tour already uses the ID " + id + "."); return; }

    var rec = { id: id, title: title, image: image, blocks: blocks };
    if (editingIndex >= 0) C.tours[editingIndex] = rec;
    else C.tours.push(rec);
    markDirty();
    closeModal();
    renderTours();
  }

  /* ---------------- enquiries ---------------- */
  function loadEnquiries() {
    var body = $("#enq-body");
    var noteEl = $("#enq-note");
    if (!body) return;
    body.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
    noteEl.classList.add("hidden");

    sb.from("enquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(function (r) {
        if (r.error) {
          body.innerHTML = "";
          noteEl.innerHTML =
            "<strong>The enquiries table is not available yet.</strong><br>" +
            "Supabase answered: <code>" + esc(r.error.message) + "</code><br><br>" +
            "Open the <strong>Supabase</strong> tab and press <strong>Check tables</strong> — " +
            "it shows what is missing and gives you the one command that creates it.";
          noteEl.classList.remove("hidden");
          return;
        }
        var rows = r.data || [];
        if (!rows.length) {
          body.innerHTML = '<tr><td colspan="6">No enquiries yet.</td></tr>';
          return;
        }
        body.innerHTML = rows
          .map(function (e) {
            var when = e.created_at ? new Date(e.created_at).toLocaleString("en-IN") : "—";
            return (
              "<tr><td>" + esc(when) + "</td><td>" + esc(e.name) + "</td><td>" + esc(e.phone) +
              "</td><td>" + esc(e.email) + "</td><td>" + esc(e.message) + "</td><td>" +
              esc(e.status || "new") + "</td></tr>"
            );
          })
          .join("");
      });
  }

  /* ---------------- supabase tab ---------------- */
  function sbCfg() {
    return {
      url: (cfg.SUPABASE_URL || "").replace(/\/+$/, ""),
      key: cfg.SUPABASE_ANON_KEY || "",
    };
  }

  function sbResult(html, kind) {
    var el = $("#sb-result");
    if (!el) return;
    el.innerHTML = html ? '<div class="alert alert--' + (kind || "ok") + '">' + html + "</div>" : "";
  }

  function sbState(text, kind) {
    var el = $("#sb-state");
    if (!el) return;
    el.textContent = text;
    el.className = "tag" + (kind ? " tag--" + kind : "");
  }

  function fillSupabaseForm() {
    var c = sbCfg();
    if ($("#sb-url")) $("#sb-url").value = c.url;
    if ($("#sb-key")) $("#sb-key").value = c.key;
    if ($("#sb-admin-email") && user && user.email) $("#sb-admin-email").value = user.email;
  }

  /* Probe a project with a plain REST call — no client needed, so it also
   * works for a project the panel is not currently connected to. */
  function probe(url, key) {
    var base = String(url || "").replace(/\/+$/, "");
    if (!/^https?:\/\//.test(base)) {
      return Promise.reject(new Error("The project URL must start with https://"));
    }
    if (!key) return Promise.reject(new Error("The anon key is empty."));

    var h = { apikey: key, Authorization: "Bearer " + key };
    return fetch(base + "/rest/v1/settings?select=key&limit=1", { headers: h, cache: "no-store" })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) {
          throw new Error("The key was rejected (HTTP " + r.status + "). Check the anon key.");
        }
        if (r.status === 404) {
          throw new Error("Reached the project, but the settings table is missing. Run the database setup below.");
        }
        if (!r.ok) throw new Error("HTTP " + r.status + " from " + base);
        return r.json();
      })
      .then(function (rows) {
        return fetch(base + "/rest/v1/rpc/is_admin", {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json" }, h),
          body: "{}",
        }).then(function (r2) {
          return { rows: rows, hasHelper: r2.ok };
        });
      });
  }

  function testConnection() {
    var url = $("#sb-url").value.trim();
    var key = $("#sb-key").value.trim();
    var btn = $("#sb-test");
    btn.disabled = true;
    btn.textContent = "Testing…";
    sbState("checking…");
    sbResult("");

    probe(url, key)
      .then(function (res) {
        sbState("connected", "ok");
        sbResult(
          "<strong>Connection successful.</strong><br>" +
            "Project: <code>" + esc(url) + "</code><br>" +
            "<code>settings</code> table: reachable · " +
            (res.hasHelper
              ? "<code>is_admin()</code>: present"
              : "<code>is_admin()</code>: <strong>missing</strong> — run the database setup below") +
            "<br><br>Press <strong>Save connection</strong> to use this project.",
          "ok"
        );
      })
      .catch(function (e) {
        sbState("failed", "warn");
        sbResult("<strong>Could not connect.</strong> " + esc(e.message), "error");
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = "⚡ Test connection";
      });
  }

  function saveConnection() {
    var url = $("#sb-url").value.trim().replace(/\/+$/, "");
    var key = $("#sb-key").value.trim();
    if (!url || !key) { sbResult("Both the project URL and the anon key are required.", "error"); return; }

    var btn = $("#sb-save");
    btn.disabled = true;
    btn.textContent = "Saving…";

    probe(url, key)
      .then(function () {
        try {
          localStorage.setItem("gt_sb_config", JSON.stringify({ SUPABASE_URL: url, SUPABASE_ANON_KEY: key }));
        } catch (e) {}
        cfg.SUPABASE_URL = url;
        cfg.SUPABASE_ANON_KEY = key;
        sb = window.supabase.createClient(url, key);
        sbState("connected", "ok");
        sbResult(
          "<strong>Saved.</strong> This browser now uses <code>" + esc(url) + "</code> for both the " +
            "admin panel and the public site. Reloading…",
          "ok"
        );
        setTimeout(function () { location.reload(); }, 1200);
      })
      .catch(function (e) {
        sbResult("<strong>Not saved.</strong> " + esc(e.message), "error");
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = "💾 Save connection";
      });
  }

  function resetConnection() {
    if (!confirm("Forget the saved connection and go back to the built-in project?")) return;
    try { localStorage.removeItem("gt_sb_config"); } catch (e) {}
    location.reload();
  }

  function checkSchema() {
    var host = $("#sb-schema");
    if (!host) return;
    var c = sbCfg();
    host.innerHTML = '<p class="muted">Checking…</p>';
    var h = { apikey: c.key, Authorization: "Bearer " + c.key };
    var tables = ["settings", "admins", "enquiries"];

    Promise.all(
      tables.map(function (t) {
        return fetch(c.url + "/rest/v1/" + t + "?select=*&limit=1", { headers: h, cache: "no-store" })
          .then(function (r) { return { t: t, ok: r.ok, status: r.status }; })
          .catch(function () { return { t: t, ok: false, status: 0 }; });
      })
    ).then(function (rows) {
      var missing = rows.filter(function (r) { return !r.ok; });
      host.innerHTML =
        '<div class="repeat">' +
        rows
          .map(function (r) {
            return (
              '<div class="rep-row" style="grid-template-columns:1fr auto;align-items:center">' +
              "<div><strong>" + esc(r.t) + "</strong> <span class=\"muted\">table</span></div>" +
              '<span class="tag ' + (r.ok ? "tag--ok" : "tag--warn") + '">' +
              (r.ok ? "present" : "missing") + "</span></div>"
            );
          })
          .join("") +
        "</div>" +
        (missing.length
          ? '<div class="alert alert--warn">' + missing.length +
            " table(s) missing — run the setup below.</div>"
          : '<div class="alert alert--ok">All tables are present.</div>');
    });
  }

  function copyText(text, btn, label) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = "✓ Copied";
      setTimeout(function () { btn.textContent = old || label; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallback(); });
    } else fallback();

    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  function loadSetupSql() {
    var pre = $("#sb-sql");
    if (!pre) return;
    fetch("../supabase/setup.sql", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (txt) { pre.textContent = txt; pre.dataset.sql = txt; })
      .catch(function (e) {
        pre.textContent = "Could not load supabase/setup.sql (" + e.message + ").";
      });
  }

  /* Add the signed-in user's email to public.admins. The setup SQL ships a
   * bootstrap policy that allows exactly this while the table is empty, so
   * the very first admin can claim the panel without the SQL editor. */
  function addAdmin(email) {
    var host = $("#sb-admins");
    if (!email) { if (host) host.innerHTML = '<div class="alert alert--error">Enter an email first.</div>'; return; }
    if (host) host.innerHTML = '<p class="muted">Adding…</p>';

    sb.from("admins")
      .insert({ email: email })
      .then(function (r) {
        if (r.error) {
          var msg = r.error.message || "";
          var hint = /duplicate|already exists/i.test(msg)
            ? "That email is already an admin."
            : /row-level security|policy/i.test(msg)
            ? "Supabase refused the insert. Either the admins table already has rows (so the " +
              "bootstrap policy no longer applies) or the setup SQL has not been run yet. " +
              "Run the database setup below, or add the email from the SQL editor."
            : msg;
          if (host) host.innerHTML = '<div class="alert alert--error">' + esc(hint) + "</div>";
          return;
        }
        if (host) host.innerHTML = '<div class="alert alert--ok">Added <strong>' + esc(email) + "</strong> as an admin.</div>";
        listAdmins();
      });
  }

  function listAdmins() {
    var host = $("#sb-admins");
    if (!host) return;
    sb.from("admins")
      .select("email")
      .then(function (r) {
        if (r.error) {
          host.innerHTML =
            '<div class="alert alert--warn">Could not read the admins table: ' + esc(r.error.message) + "</div>";
          return;
        }
        var rows = r.data || [];
        if (!rows.length) {
          host.innerHTML =
            '<div class="alert alert--warn">The admins table is empty. Add your email above — ' +
            "until then anyone who signs in can edit the site.</div>";
          return;
        }
        host.innerHTML =
          '<div class="repeat">' +
          rows
            .map(function (x) {
              return (
                '<div class="rep-row" style="grid-template-columns:1fr auto;align-items:center">' +
                "<div>" + esc(x.email) + "</div>" +
                '<span class="tag tag--ok">admin</span></div>'
              );
            })
            .join("") +
          "</div>";
      });
  }

  function wireSupabaseTab() {
    fillSupabaseForm();
    loadSetupSql();

    var t = $("#sb-test");
    if (t) t.addEventListener("click", testConnection);
    var s = $("#sb-save");
    if (s) s.addEventListener("click", saveConnection);
    var r = $("#sb-reset");
    if (r) r.addEventListener("click", resetConnection);
    var cs = $("#sb-check-schema");
    if (cs) cs.addEventListener("click", checkSchema);

    var cc = $("#sb-copy-cmd");
    if (cc) cc.addEventListener("click", function () { copyText("npm run supabase:setup", cc); });
    var cq = $("#sb-copy-sql");
    if (cq) {
      cq.addEventListener("click", function () {
        var pre = $("#sb-sql");
        copyText((pre && pre.dataset.sql) || (pre && pre.textContent) || "", cq);
      });
    }

    var aa = $("#sb-add-admin");
    if (aa) aa.addEventListener("click", function () { addAdmin($("#sb-admin-email").value.trim()); });
    var la = $("#sb-list-admins");
    if (la) la.addEventListener("click", listAdmins);

    /* show the live state of the current connection */
    probe(sbCfg().url, sbCfg().key)
      .then(function () { sbState("connected", "ok"); })
      .catch(function () { sbState("not connected", "warn"); });
  }

  /* ---------------- tabs ---------------- */
  var TITLES = {
    home: ["Home page", "Hero banner, welcome text and statistics."],
    tours: ["Tours", "Add, edit or remove tour packages and their itineraries."],
    gallery: ["Gallery", "Photos shown on the gallery page."],
    contact: ["Contact", "Address blocks and the enquiry form details."],
    footer: ["Footer", "Address, phone numbers and the subscribe box."],
    enquiries: ["Enquiries", "Messages submitted through the contact form."],
    supabase: ["Supabase", "Connection, database setup and admin access."],
  };

  function showTab(name) {
    currentTab = name;
    $$(".sidebar a[data-tab]").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-tab") === name);
    });
    $$("[data-pane]").forEach(function (p) {
      p.classList.toggle("hidden", p.getAttribute("data-pane") !== name);
    });
    var meta = TITLES[name] || ["", ""];
    $("#pane-title").textContent = meta[0];
    $("#pane-sub").textContent = meta[1];
    if (name === "enquiries") loadEnquiries();
    if (name === "supabase") { fillSupabaseForm(); listAdmins(); }
  }

  function wireTabs() {
    $$(".sidebar a[data-tab]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        showTab(a.getAttribute("data-tab"));
      });
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    if (!window.supabase || !cfg.SUPABASE_URL) {
      loginAlert("Supabase is not configured. Check admin/js/config.js.");
      return;
    }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

    wireAuth();
    wireTabs();
    wireBindings();
    wireAddButtons();
    wireSupabaseTab();

    $("#save-btn").addEventListener("click", saveContent);
    $("#reload-btn").addEventListener("click", function () {
      if (dirty && !confirm("Discard unsaved changes?")) return;
      loadContent();
    });
    $("#new-tour-btn").addEventListener("click", function () { openTour(-1); });
    $("#modal-save").addEventListener("click", saveTour);
    $$("[data-modal-close]").forEach(function (b) { b.addEventListener("click", closeModal); });
    $("#modal").addEventListener("click", function (e) {
      if (e.target === $("#modal")) closeModal();
    });
    var enq = $("#enq-reload");
    if (enq) enq.addEventListener("click", loadEnquiries);

    window.addEventListener("beforeunload", function (e) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    });

    sb.auth.getSession().then(function (r) {
      var s = r.data ? r.data.session : null;
      if (s) afterSignIn(s);
      else showLogin();
    });

    sb.auth.onAuthStateChange(function (evt, session) {
      if (evt === "SIGNED_OUT") showLogin();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
