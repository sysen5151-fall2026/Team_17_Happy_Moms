/* ==========================================================================
   Happy Moms — shared chrome
   Renders the header, navigation, and footer for every page from one place,
   and applies the saved colour theme before the page paints.

   Each page sets data attributes on <body>:
     data-shell="site" | "app"   which navigation to render
     data-page="home"            which link is the current page
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  /* ---------------------------------------------------------------- theme */

  /* Light unless the reader has chosen otherwise. A first visit gets light even
     on a dark device; "auto" only comes back once it is picked in the profile. */
  function storedTheme() {
    try {
      var raw = window.localStorage.getItem(HM.store.key);
      if (!raw) return "light";
      var parsed = JSON.parse(raw);
      return (parsed.settings && parsed.settings.theme) || "light";
    } catch (err) {
      return "light";
    }
  }

  /* The attribute is always written, including for "auto", because the
     stylesheet scopes its prefers-color-scheme block to data-theme="auto". */
  function applyTheme(theme) {
    var resolved = theme === "dark" || theme === "auto" ? theme : "light";
    document.documentElement.setAttribute("data-theme", resolved);
  }

  function effectiveTheme() {
    var explicit = document.documentElement.getAttribute("data-theme");
    if (explicit === "light" || explicit === "dark") return explicit;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark" : "light";
  }

  function toggleTheme() {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    HM.store.update(function (state) { state.settings.theme = next; });
    var btns = document.querySelectorAll(".theme-toggle");
    Array.prototype.forEach.call(btns, function (b) { paintThemeButton(b); });
    HM.dom.toast(next === "dark" ? "Dark theme on" : "Light theme on");
  }

  function paintThemeButton(btn) {
    var dark = effectiveTheme() === "dark";
    btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    btn.setAttribute("title", dark ? "Switch to light theme" : "Switch to dark theme");
    btn.innerHTML = dark
      ? '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.7A8.5 8.5 0 1 1 9.3 3.5a7 7 0 0 0 11.2 11.2z"/></svg>';
  }

  /* Apply immediately, before the body renders, to avoid a flash. The .js
     class also switches on the scroll-reveal animation, so content stays
     visible if scripts are blocked or fail to load. */
  applyTheme(storedTheme());
  document.documentElement.classList.add("js");

  HM.theme = { apply: applyTheme, toggle: toggleTheme, effective: effectiveTheme };

  /* ---------------------------------------------------------------- paths */

  /* Pages sit at two levels: index.html at the site root, every other page in
     html/. The chrome is rendered on both, so links are built rather than
     hardcoded.

     Relative, never root-absolute: a GitHub Pages project site is served from
     https://user.github.io/<repo>/, where a link to /html/app.html would miss
     the repository segment entirely and 404. Relative paths also survive
     file:// and any sub-path deployment.

     Each page states its distance from the root in data-root on <body>. The
     body does not exist yet when this file runs in <head>, so the prefix is
     read at render time rather than at load. */
  function rootPrefix() {
    var body = document.body;
    var declared = body && body.getAttribute("data-root");
    if (declared !== null && declared !== undefined) return declared;

    /* Fallback for a page that forgot the attribute: look at the folder the
       current document sits in. */
    var parts = window.location.pathname.split("/");
    return parts[parts.length - 2] === "html" ? "../" : "";
  }

  /* A page that lives in html/. */
  function pageHref(file) {
    return rootPrefix() ? file : "html/" + file;
  }

  /* A file that lives at the site root, such as index.html. */
  function rootHref(file) {
    return rootPrefix() + file;
  }

  HM.paths = {
    prefix: rootPrefix,
    page: pageHref,
    root: rootHref,
    home: function () { return rootHref("index.html"); }
  };

  /* ------------------------------------------------------------ nav model */

  var BRAND_SVG =
    '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#c98a93"/>' +
    '<path d="M32 46c-9-6-16-13-16-21a10 10 0 0 1 16-8 10 10 0 0 1 16 8c0 8-7 15-16 21z" fill="#fdf8f3"/></svg>';

  /* `file` is the bare file name; the href is resolved per page at render
     time. `atRoot` marks the one page that is not in html/. */
  var SITE_LINKS = [
    { page: "home", file: "index.html", atRoot: true, label: "Home" },
    { page: "tips", file: "tips.html", label: "Wellness tips" },
    { page: "about", file: "about.html", label: "About" },
    { page: "contact", file: "contact.html", label: "Contact" }
  ];

  var APP_LINKS = [
    { page: "app", file: "app.html", label: "Today", icon: "home" },
    { page: "checkin", file: "checkin.html", label: "Check-in", icon: "check" },
    { page: "trends", file: "trends.html", label: "Trends", icon: "chart" },
    { page: "summary", file: "summary.html", label: "Visit notes", icon: "notes" },
    { page: "assistant", file: "assistant.html", label: "Assistant", icon: "chat" },
    { page: "puzzle", file: "puzzle.html", label: "Daily puzzle", icon: "grid" },
    { page: "tips", file: "tips.html", label: "Tips", icon: "leaf" },
    { page: "profile", file: "profile.html", label: "Profile", icon: "user" }
  ];

  function linkHref(entry) {
    return entry.atRoot ? rootHref(entry.file) : pageHref(entry.file);
  }

  var ICONS = {
    home: '<path d="M4 11l8-6.5 8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/>',
    check: '<path d="M4.5 12.5l4.5 4.5 10-10"/>',
    chart: '<path d="M4 19V6M4 19h16M8 16v-5M12 16V8M16 16v-7"/>',
    notes: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    chat: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5V14a2.5 2.5 0 0 1-2.5 2.5H9l-5 4z"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    leaf: '<path d="M5 19c7-1 12-6 13-14-8 1-13 6-14 14z"/><path d="M6 18c2-4 5-7 9-9"/>',
    user: '<circle cx="12" cy="8.5" r="3.7"/><path d="M5 20c1.4-3.6 4-5.3 7-5.3s5.6 1.7 7 5.3"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || "") + "</svg>";
  }

  /* --------------------------------------------------------------- render */

  function headerHtml(shell, page) {
    var links = shell === "app" ? APP_LINKS : SITE_LINKS;
    var navHtml = links.map(function (l) {
      var current = l.page === page ? ' aria-current="page"' : "";
      return '<a href="' + linkHref(l) + '"' + current + ">" + HM.dom.escapeHtml(l.label) + "</a>";
    }).join("");

    var cta = shell === "app"
      ? '<a class="btn btn-primary btn-sm" href="' + pageHref("checkin.html") + '">Daily check-in</a>'
      : '<a class="btn btn-primary btn-sm" href="' + pageHref("app.html") + '">Open the app</a>';

    return '' +
      '<div class="nav">' +
        '<a href="' + (shell === "app" ? pageHref("app.html") : rootHref("index.html")) + '" class="brand">' + BRAND_SVG + " Happy Moms</a>" +
        '<nav class="nav-links" aria-label="Primary">' + navHtml + "</nav>" +
        '<div class="nav-cta">' +
          '<a class="urgent-link" href="' + pageHref("crisis.html") + '" title="Urgent help and warning signs">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4.5l8 14H4z"/><path d="M12 10v4M12 16.6v.2"/></svg>' +
            "<span>Urgent help</span>" +
          "</a>" +
          '<button type="button" class="theme-toggle" aria-label="Switch theme"></button>' +
          cta +
          '<button class="nav-toggle" type="button" aria-label="Toggle menu" aria-expanded="false">' +
            "<span></span><span></span><span></span>" +
          "</button>" +
        "</div>" +
      "</div>";
  }

  /* Bottom tab bar, app pages only, phone sized screens. */
  function tabBarHtml(page) {
    var items = APP_LINKS.slice(0, 6).map(function (l) {
      var current = l.page === page ? ' class="current" aria-current="page"' : "";
      return '<a href="' + linkHref(l) + '"' + current + ">" + icon(l.icon) +
        "<span>" + HM.dom.escapeHtml(l.label) + "</span></a>";
    }).join("");
    return '<nav class="tab-bar" aria-label="App sections">' + items + "</nav>";
  }

  function footerHtml() {
    var cfg = HM.config;
    var sourceLinks = Object.keys(cfg.sources).map(function (k) {
      var s = cfg.sources[k];
      return '<li><a href="' + s.url + '" target="_blank" rel="noopener noreferrer">' +
        HM.dom.escapeHtml(s.short) + "</a></li>";
    }).join("");

    return '' +
      '<div class="container">' +
        '<div class="footer-grid">' +
          "<div>" +
            '<div class="footer-brand">' + BRAND_SVG + " Happy Moms</div>" +
            "<p>Low-effort wellness tracking and appointment preparation for expecting mothers. " +
            "Your entries stay on this device.</p>" +
            '<p class="footer-meta">v' + HM.dom.escapeHtml(cfg.version) + " &middot; " +
            HM.dom.escapeHtml(cfg.course.team) + "</p>" +
          "</div>" +
          '<div class="footer-col">' +
            "<h5>The app</h5>" +
            "<ul>" +
              '<li><a href="' + pageHref("app.html") + '">Today</a></li>' +
              '<li><a href="' + pageHref("checkin.html") + '">Daily check-in</a></li>' +
              '<li><a href="' + pageHref("trends.html") + '">Trends</a></li>' +
              '<li><a href="' + pageHref("summary.html") + '">Visit notes</a></li>' +
              '<li><a href="' + pageHref("puzzle.html") + '">Daily puzzle</a></li>' +
            "</ul>" +
          "</div>" +
          '<div class="footer-col">' +
            "<h5>Learn</h5>" +
            "<ul>" +
              '<li><a href="' + pageHref("tips.html") + '">Wellness tips</a></li>' +
              '<li><a href="' + pageHref("assistant.html") + '">Wellness assistant</a></li>' +
              '<li><a href="' + pageHref("quiz.html") + '">Baseline check-in</a></li>' +
              '<li><a href="' + pageHref("about.html") + '">About the project</a></li>' +
              '<li><a href="' + pageHref("contact.html") + '">Contact and feedback</a></li>' +
            "</ul>" +
          "</div>" +
          '<div class="footer-col">' +
            "<h5>Sources</h5>" +
            "<ul>" + sourceLinks + "</ul>" +
            '<p class="footer-meta">Content is paraphrased general guidance, pending clinical review.</p>' +
          "</div>" +
        "</div>" +
        '<div class="footer-note">' +
          "<strong>Not medical advice.</strong> " + HM.dom.escapeHtml(cfg.disclaimer) +
          ' For warning signs and crisis lines, see <a href="' + pageHref("crisis.html") + '">urgent help</a>.' +
        "</div>" +
        '<div class="footer-bottom">' +
          "<span>&copy; <span id=\"year\"></span> Happy Moms &middot; " +
          HM.dom.escapeHtml(cfg.course.number) + " " + HM.dom.escapeHtml(cfg.course.term) + "</span>" +
          '<div class="legal-links">' +
            '<a href="' + pageHref("profile.html") + '#data">Your data</a>' +
            '<a href="' + cfg.repoUrl + '" target="_blank" rel="noopener noreferrer">Source code</a>' +
          "</div>" +
        "</div>" +
      "</div>";
  }

  function wireNavToggle() {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (!toggle || !links) return;
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    Array.prototype.forEach.call(links.querySelectorAll("a"), function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function storageWarning() {
    if (HM.store.available) return "";
    return '<div class="banner banner-warn" role="status">This browser is blocking local storage, ' +
      "so entries will not be saved after you close the tab. Private browsing is the usual cause.</div>";
  }

  function render() {
    var body = document.body;
    var shell = body.getAttribute("data-shell") || "site";
    var page = body.getAttribute("data-page") || "";

    var header = document.getElementById("siteHeader");
    if (header) {
      header.className = "site-header";
      header.innerHTML = headerHtml(shell, page);
    }

    var footer = document.getElementById("siteFooter");
    if (footer) {
      footer.className = "site-footer";
      footer.innerHTML = footerHtml();
    }

    if (shell === "app") {
      body.insertAdjacentHTML("beforeend", tabBarHtml(page));
      body.classList.add("has-tab-bar");
    }

    var warn = storageWarning();
    if (warn) {
      var main = document.querySelector("main");
      if (main) main.insertAdjacentHTML("afterbegin", warn);
    }

    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();

    Array.prototype.forEach.call(document.querySelectorAll(".theme-toggle"), function (btn) {
      paintThemeButton(btn);
      btn.addEventListener("click", toggleTheme);
    });

    wireNavToggle();
  }

  HM.chrome = { render: render, icon: icon };

  HM.dom.ready(render);
})(window.HM);
