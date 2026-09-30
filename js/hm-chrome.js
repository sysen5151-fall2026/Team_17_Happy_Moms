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

  function storedTheme() {
    try {
      var raw = window.localStorage.getItem(HM.store.key);
      if (!raw) return "auto";
      var parsed = JSON.parse(raw);
      return (parsed.settings && parsed.settings.theme) || "auto";
    } catch (err) {
      return "auto";
    }
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }

  function effectiveTheme() {
    var explicit = document.documentElement.getAttribute("data-theme");
    if (explicit) return explicit;
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

  /* ------------------------------------------------------------ nav model */

  var BRAND_SVG =
    '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#c98a93"/>' +
    '<path d="M32 46c-9-6-16-13-16-21a10 10 0 0 1 16-8 10 10 0 0 1 16 8c0 8-7 15-16 21z" fill="#fdf8f3"/></svg>';

  var SITE_LINKS = [
    { page: "home", href: "index.html", label: "Home" },
    { page: "tips", href: "tips.html", label: "Wellness tips" },
    { page: "about", href: "about.html", label: "About" },
    { page: "contact", href: "contact.html", label: "Contact" }
  ];

  var APP_LINKS = [
    { page: "app", href: "app.html", label: "Today", icon: "home" },
    { page: "checkin", href: "checkin.html", label: "Check-in", icon: "check" },
    { page: "trends", href: "trends.html", label: "Trends", icon: "chart" },
    { page: "summary", href: "summary.html", label: "Visit notes", icon: "notes" },
    { page: "assistant", href: "assistant.html", label: "Assistant", icon: "chat" },
    { page: "puzzle", href: "puzzle.html", label: "Daily puzzle", icon: "grid" },
    { page: "tips", href: "tips.html", label: "Tips", icon: "leaf" },
    { page: "profile", href: "profile.html", label: "Profile", icon: "user" }
  ];

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
      return '<a href="' + l.href + '"' + current + ">" + HM.dom.escapeHtml(l.label) + "</a>";
    }).join("");

    var cta = shell === "app"
      ? '<a class="btn btn-primary btn-sm" href="checkin.html">Daily check-in</a>'
      : '<a class="btn btn-primary btn-sm" href="app.html">Open the app</a>';

    return '' +
      '<div class="nav">' +
        '<a href="' + (shell === "app" ? "app.html" : "index.html") + '" class="brand">' + BRAND_SVG + " Happy Moms</a>" +
        '<nav class="nav-links" aria-label="Primary">' + navHtml + "</nav>" +
        '<div class="nav-cta">' +
          '<a class="urgent-link" href="crisis.html" title="Urgent help and warning signs">' +
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
      return '<a href="' + l.href + '"' + current + ">" + icon(l.icon) +
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
              '<li><a href="app.html">Today</a></li>' +
              '<li><a href="checkin.html">Daily check-in</a></li>' +
              '<li><a href="trends.html">Trends</a></li>' +
              '<li><a href="summary.html">Visit notes</a></li>' +
              '<li><a href="puzzle.html">Daily puzzle</a></li>' +
            "</ul>" +
          "</div>" +
          '<div class="footer-col">' +
            "<h5>Learn</h5>" +
            "<ul>" +
              '<li><a href="tips.html">Wellness tips</a></li>' +
              '<li><a href="assistant.html">Wellness assistant</a></li>' +
              '<li><a href="quiz.html">Baseline check-in</a></li>' +
              '<li><a href="about.html">About the project</a></li>' +
              '<li><a href="contact.html">Contact and feedback</a></li>' +
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
          ' For warning signs and crisis lines, see <a href="crisis.html">urgent help</a>.' +
        "</div>" +
        '<div class="footer-bottom">' +
          "<span>&copy; <span id=\"year\"></span> Happy Moms &middot; " +
          HM.dom.escapeHtml(cfg.course.number) + " " + HM.dom.escapeHtml(cfg.course.term) + "</span>" +
          '<div class="legal-links">' +
            '<a href="profile.html#data">Your data</a>' +
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
