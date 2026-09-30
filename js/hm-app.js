/* ==========================================================================
   Happy Moms — Today
   The landing screen inside the app: where you are in pregnancy, whether
   today is logged, what has shifted lately, and the quickest way into
   everything else.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var el = HM.dom.el;

  function greeting(name) {
    var hour = new Date().getHours();
    var part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return name ? part + ", " + name : part;
  }

  function tile(label, value, unit, note, spark) {
    var children = [
      el("div", { class: "tile-label", text: label }),
      el("div", { class: "tile-value", html: HM.dom.escapeHtml(value) + (unit ? "<small>" + HM.dom.escapeHtml(unit) + "</small>" : "") })
    ];
    if (note) children.push(el("div", { class: "tile-note", text: note }));
    if (spark) children.push(el("div", { class: "tile-spark", html: spark }));
    return el("div", { class: "tile" }, children);
  }

  function quickLink(href, icon, title, sub) {
    return el("a", { class: "quick-link", href: href }, [
      el("span", { html: HM.chrome.icon(icon) }),
      el("span", {}, [
        el("span", { text: title }),
        el("span", { class: "qs", text: sub })
      ])
    ]);
  }

  function renderHeader(state, view) {
    var host = document.getElementById("appHeader");
    var g = view.gestation;

    var sub;
    if (!g.known) {
      sub = "Add your due date to see your week and start tracking trends.";
    } else if (g.postpartum) {
      sub = g.label + ". Check-ins now cover postpartum recovery.";
    } else if (g.overdue) {
      sub = "Past your due date by " + Math.abs(g.daysToDue) + " day" + (Math.abs(g.daysToDue) === 1 ? "" : "s") + ".";
    } else {
      sub = g.daysToDue + " day" + (g.daysToDue === 1 ? "" : "s") + " until your due date, " +
        HM.dates.formatDate(g.dueDate, "long") + ".";
    }

    host.innerHTML = "";
    host.appendChild(el("div", {}, [
      el("h1", { text: greeting(state.profile.name) }),
      el("p", { text: sub })
    ]));

    var pills = el("div", { class: "app-head-actions" });
    if (g.known) {
      pills.appendChild(el("span", {
        class: "pill pill-week",
        text: g.postpartum ? g.label : "Week " + g.week + " · " + g.phase
      }));
    }
    if (HM.sample.isLoaded(state)) {
      pills.appendChild(el("span", { class: "pill pill-sample", text: "Sample data on" }));
    }
    host.appendChild(pills);
  }

  function renderTodayCard(state, view) {
    var host = document.getElementById("todayCard");
    host.innerHTML = "";

    if (view.done) {
      var entry = view.entry;
      var moodQ = HM.content.checkin.filter(function (q) { return q.id === "mood"; })[0];
      var moodWord = entry.mood ? (moodQ.captions[entry.mood - 1] || "") : "logged";

      host.appendChild(el("h2", { text: "Today is logged" }));
      host.appendChild(el("p", {
        text: "Mood: " + moodWord.toLowerCase() + ". You can change today's answers any time."
      }));
      host.appendChild(el("div", { class: "row" }, [
        el("span", {
          class: "today-done",
          html: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Done for today'
        }),
        el("a", { class: "btn btn-quiet btn-sm", href: "checkin.html", text: "Edit today" }),
        el("a", { class: "btn btn-quiet btn-sm", href: "trends.html", text: "See trends" })
      ]));
      return;
    }

    host.appendChild(el("h2", { text: "Ready for today's check-in?" }));
    host.appendChild(el("p", {
      text: "Seven quick taps on mood, sleep, and how your body feels. It builds the record " +
        "your provider reads at your next visit."
    }));
    host.appendChild(el("div", { class: "row" }, [
      el("a", { class: "btn btn-primary", href: "checkin.html", text: "Start check-in" }),
      el("a", { class: "btn btn-quiet btn-sm", href: "puzzle.html", text: "Play today's puzzle" })
    ]));
  }

  function renderTiles(state, view) {
    var host = document.getElementById("appTiles");
    host.innerHTML = "";

    var streak = view.streak;
    var coverage = view.coverage;
    var mood7 = HM.stats.round(HM.insights.average(state, "mood", 7), 1);
    var sleep7 = HM.stats.round(HM.insights.average(state, "sleepHours", 7), 1);

    var moodSpark = HM.charts.spark(view.moodSeries.map(function (p) { return p.value; }), {
      domain: [1, 5],
      ariaLabel: "Mood over the last 14 days"
    });

    host.appendChild(tile("Check-in streak", streak, streak === 1 ? " day" : " days",
      streak === 0 ? "Start one today" : null));

    host.appendChild(tile("Weeks covered", coverage.percent, "%",
      coverage.weeksWithEntry + " of " + coverage.weeksTracked + " weeks tracked"));

    host.appendChild(tile("Mood, 7-day average", mood7 === null ? "—" : mood7,
      mood7 === null ? "" : " of 5", null, moodSpark));

    host.appendChild(tile("Sleep, 7-day average", sleep7 === null ? "—" : sleep7,
      sleep7 === null ? "" : " h", sleep7 === null ? "No sleep logged yet" : null));
  }

  function renderObservations(state) {
    var host = document.getElementById("appObservations");
    var obs = HM.insights.observations(state).slice(0, 4);
    host.innerHTML = "";

    obs.forEach(function (o) {
      host.appendChild(el("div", { class: "obs-item obs-" + o.kind }, [
        el("span", { class: "dot", "aria-hidden": "true" }),
        el("span", { text: o.text })
      ]));
    });
  }

  function renderQuickLinks(state) {
    var host = document.getElementById("appQuick");
    var puzzleToday = (state.puzzle || {})[HM.dates.todayKey()];
    var puzzleSub = !puzzleToday ? "Not played yet"
      : puzzleToday.status === "won" ? "Solved in " + puzzleToday.guesses.length
      : puzzleToday.status === "lost" ? "Better luck tomorrow" : "In progress";

    var openQuestions = (state.questions || []).filter(function (q) { return !q.asked; }).length;

    host.innerHTML = "";
    host.appendChild(quickLink("puzzle.html", "grid", "Daily puzzle", puzzleSub));
    host.appendChild(quickLink("assistant.html", "chat", "Wellness assistant", "Ask a vetted question"));
    host.appendChild(quickLink("summary.html", "notes", "Visit notes",
      openQuestions ? openQuestions + " question" + (openQuestions === 1 ? "" : "s") + " saved" : "Build a provider summary"));
    host.appendChild(quickLink("trends.html", "chart", "Trends", "Charts and observations"));
    host.appendChild(quickLink("tips.html", "leaf", "Wellness tips", HM.content.tips.length + " cards"));
    host.appendChild(quickLink("profile.html", "user", "Profile and data", "Due date, export, delete"));
  }

  function renderDailyTip(state) {
    var host = document.getElementById("appTip");
    var key = HM.dates.todayKey();
    var g = HM.gestation.of(state.profile);

    /* Bias the daily card toward the current trimester when we know it. */
    var pool = HM.content.tips;
    if (g.known && !g.postpartum) {
      var preferred = g.trimester === 1 ? ["nutrition", "comfort", "care"]
        : g.trimester === 2 ? ["movement", "nutrition", "care"]
        : ["rest", "comfort", "care"];
      var narrowed = pool.filter(function (t) { return preferred.indexOf(t.topic) !== -1; });
      if (narrowed.length) pool = narrowed;
    }

    var tip = pool[HM.content.dailyIndex(key, pool.length)];
    var source = HM.config.sources[tip.source];

    host.innerHTML =
      '<div class="tile-label">Today’s card · ' + HM.dom.escapeHtml(topicLabel(tip.topic)) + "</div>" +
      "<h3 style=\"font-size:1.2rem;margin:8px 0 8px\">" + HM.dom.escapeHtml(tip.title) + "</h3>" +
      "<p>" + HM.dom.escapeHtml(tip.body) + "</p>" +
      '<div class="row" style="justify-content:space-between">' +
        '<a class="source-badge" href="' + source.url + '" target="_blank" rel="noopener noreferrer">' +
        HM.dom.escapeHtml(source.short) + "</a>" +
        '<a class="link" style="font-size:0.87rem;font-weight:600;color:var(--color-rose-deep)" href="tips.html?topic=' +
        tip.topic + '">More like this</a>' +
      "</div>";
  }

  function topicLabel(topicId) {
    var t = HM.content.topics.filter(function (x) { return x.id === topicId; })[0];
    return t ? t.label : topicId;
  }

  function renderSetupBanner(state) {
    var host = document.getElementById("appSetup");
    var hasProfile = !!state.profile.dueDate || state.profile.postpartum;
    var hasData = Object.keys(state.checkins || {}).length > 0;

    if (hasProfile && hasData) {
      host.hidden = true;
      return;
    }

    host.hidden = false;
    var parts = [];
    if (!hasProfile) {
      parts.push('<div><strong>Add your due date</strong> to unlock week tracking, ' +
        'coverage, and visit notes. It takes one field. <a href="profile.html">Open profile</a></div>');
    } else if (!hasData) {
      parts.push('<div><strong>No entries yet.</strong> Your first check-in takes a few seconds. ' +
        'Want to see how the app looks with history? <button type="button" class="msg-action" id="loadSample">Load sample data</button></div>');
    }
    host.className = "banner banner-info";
    host.innerHTML = parts.join("");

    var btn = document.getElementById("loadSample");
    if (btn) {
      btn.addEventListener("click", function () {
        HM.sample.load();
        HM.dom.toast("Sample data loaded");
        render();
      });
    }
  }

  function render() {
    var state = HM.store.load();
    var view = HM.insights.today(state);

    renderSetupBanner(state);
    renderHeader(state, view);
    renderTodayCard(state, view);
    renderTiles(state, view);
    renderObservations(state);
    renderQuickLinks(state);
    renderDailyTip(state);
  }

  function init() {
    if (!document.getElementById("appHeader")) return;
    render();
  }

  HM.app = { init: init, render: render };
  HM.dom.ready(init);
})(window.HM);
