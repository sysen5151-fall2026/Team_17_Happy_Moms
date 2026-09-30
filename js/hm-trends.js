/* ==========================================================================
   Happy Moms — trends
   Charts and plain observations over the logged history. Everything here is
   descriptive: it reports what was entered, never what it might mean.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var el = HM.dom.el;

  var view = { metric: "mood", days: 30 };

  /* ----------------------------------------------------------- top metrics */

  function renderSummaryTiles(state) {
    var host = document.getElementById("trendTiles");
    var coverage = HM.insights.coverage(state);
    var entries = HM.insights.entries(state);
    var streak = HM.stats.streak(state.checkins);

    var perWeek = coverage.weeksTracked
      ? HM.stats.round(coverage.totalEntries / coverage.weeksTracked, 1)
      : 0;

    host.innerHTML = "";

    host.appendChild(el("div", { class: "tile", style: "display:flex;gap:18px;align-items:center" }, [
      el("div", {
        html: HM.charts.ring(coverage.percent, {
          caption: "weeks covered",
          ariaLabel: "Wellness capture continuity: " + coverage.percent + " percent of tracked weeks have at least one entry"
        })
      }),
      el("div", {}, [
        el("div", { class: "tile-label", text: "Continuity of capture" }),
        el("div", { class: "tile-note", style: "margin-top:2px", text: coverage.weeksWithEntry + " of " + coverage.weeksTracked + " weeks have at least one entry." }),
        el("div", { class: "tile-note", text: "This is the measure the project tracks for engagement." })
      ])
    ]));

    var stats = el("div", { class: "tile-grid", style: "grid-column:span 1" });
    [
      { label: "Total check-ins", value: coverage.totalEntries, note: entries.length ? "Since " + HM.dates.formatDate(entries[0].date, "long") : "No entries yet" },
      { label: "Current streak", value: streak + (streak === 1 ? " day" : " days"), note: null },
      { label: "Entries per week", value: perWeek, note: "Average across tracked weeks" }
    ].forEach(function (s) {
      stats.appendChild(el("div", { class: "tile" }, [
        el("div", { class: "tile-label", text: s.label }),
        el("div", { class: "tile-value", text: String(s.value) }),
        s.note ? el("div", { class: "tile-note", text: s.note }) : null
      ]));
    });
    host.appendChild(stats);
  }

  /* ------------------------------------------------------------ line chart */

  function renderMetricSwitch(state) {
    var host = document.getElementById("metricSwitch");
    host.innerHTML = "";
    HM.insights.metrics.forEach(function (m) {
      host.appendChild(el("button", {
        type: "button",
        class: "metric-btn" + (m.id === view.metric ? " active" : ""),
        "aria-pressed": String(m.id === view.metric),
        onclick: function () {
          view.metric = m.id;
          renderMetricSwitch(state);
          renderChart(state);
        }
      }, [m.label]));
    });
  }

  function renderRangeSwitch(state) {
    var host = document.getElementById("rangeSwitch");
    host.innerHTML = "";
    [14, 30, 90].forEach(function (days) {
      host.appendChild(el("button", {
        type: "button",
        class: "metric-btn" + (days === view.days ? " active" : ""),
        "aria-pressed": String(days === view.days),
        onclick: function () {
          view.days = days;
          renderRangeSwitch(state);
          renderChart(state);
        }
      }, [days + " days"]));
    });
  }

  function renderChart(state) {
    var host = document.getElementById("trendChart");
    var m = HM.insights.metric(view.metric);
    var series = HM.insights.series(state, view.metric, view.days);
    var logged = series.filter(function (p) { return p.value !== null; });

    if (logged.length < 2) {
      host.innerHTML = '<div class="empty"><h3>Not enough entries in this range</h3>' +
        "<p>Two or more check-ins in the selected window will draw a line here.</p></div>";
      return;
    }

    var avg = HM.stats.round(HM.stats.mean(logged.map(function (p) { return p.value; })), 1);
    var d = HM.insights.delta(state, view.metric);

    var unitText = m.unit === "of 5" ? "" : " " + m.unit;
    var changeText = "";
    if (d.comparable && d.change !== null) {
      var better = m.direction === "higherBetter" ? d.change > 0 : d.change < 0;
      changeText = (d.change === 0 ? "level with" : (d.change > 0 ? "up" : "down") +
        " " + Math.abs(HM.stats.round(d.change, 1)) + unitText + " from") + " the previous week" +
        (d.change === 0 ? "" : "") + (better ? "" : "");
    }

    host.innerHTML =
      '<div class="row" style="justify-content:space-between;align-items:baseline;margin-bottom:6px">' +
        "<div><span class=\"tile-label\">" + HM.dom.escapeHtml(m.label) + " over " + view.days + " days</span>" +
        "<div class=\"tile-value\" style=\"font-size:1.5rem\">" + avg + "<small>average" + HM.dom.escapeHtml(unitText) + "</small></div></div>" +
        (changeText ? '<span class="pill">' + HM.dom.escapeHtml(changeText) + "</span>" : "") +
      "</div>" +
      HM.charts.line(series, {
        domain: m.domain,
        accent: "var(--chart-1)",
        ariaLabel: m.label + " for the last " + view.days + " days, averaging " + avg + " " + m.unit
      }) +
      '<div class="chart-legend"><span><i></i>' + HM.dom.escapeHtml(m.label) +
      "</span><span>Gaps are days without a check-in</span></div>";
  }

  /* -------------------------------------------------------------- symptoms */

  function renderSymptoms(state) {
    var host = document.getElementById("symptomChart");
    var counts = HM.insights.symptomCounts(state, view.days);

    if (!counts.length) {
      host.innerHTML = '<div class="empty"><p style="margin:0">No symptoms logged in this window.</p></div>';
      return;
    }

    host.innerHTML = HM.charts.bars(
      counts.slice(0, 8).map(function (c) { return { label: c.label, value: c.count }; }),
      { accent: "var(--chart-2)", ariaLabel: "Symptom counts over the last " + view.days + " days" }
    ) + '<p class="small muted" style="margin:12px 0 0">Days logged with each symptom in the last ' +
      view.days + " days. Anything recurring is worth raising at your next visit.</p>";
  }

  /* -------------------------------------------------------- weekly rollup */

  function weekBuckets(state) {
    var profile = state.profile || {};
    var entries = HM.insights.entries(state);
    var buckets = {};

    entries.forEach(function (e) {
      var week = HM.gestation.weekOfDate(profile, e.date);
      var key, label;
      if (week === null) {
        var monday = HM.dates.fromKey(e.date);
        monday = HM.dates.addDays(monday, -((monday.getDay() + 6) % 7));
        key = HM.dates.toKey(monday);
        label = "Week of " + HM.dates.formatDate(key);
      } else {
        key = "w" + String(week).padStart(3, "0");
        label = "Week " + week;
      }
      if (!buckets[key]) buckets[key] = { label: label, entries: [] };
      buckets[key].entries.push(e);
    });

    return Object.keys(buckets).sort().map(function (k) { return buckets[k]; });
  }

  function renderWeekTable(state) {
    var host = document.getElementById("weekTable");
    var buckets = weekBuckets(state).slice(-8).reverse();

    if (!buckets.length) {
      host.innerHTML = "";
      return;
    }

    function avg(entries, id) {
      var v = HM.stats.mean(entries.map(function (e) {
        return typeof e[id] === "number" ? e[id] : null;
      }));
      return v === null ? "—" : HM.stats.round(v, 1);
    }

    var rows = buckets.map(function (b) {
      var symptomDays = b.entries.filter(function (e) { return (e.symptoms || []).length; }).length;
      return "<tr>" +
        "<td>" + HM.dom.escapeHtml(b.label) + "</td>" +
        "<td>" + b.entries.length + "</td>" +
        "<td>" + avg(b.entries, "mood") + "</td>" +
        "<td>" + avg(b.entries, "energy") + "</td>" +
        "<td>" + avg(b.entries, "sleepHours") + "</td>" +
        "<td>" + avg(b.entries, "nausea") + "</td>" +
        "<td>" + symptomDays + "</td>" +
        "</tr>";
    }).join("");

    host.innerHTML =
      '<div class="table-scroll"><table class="week-table">' +
        "<thead><tr><th>Week</th><th>Entries</th><th>Mood</th><th>Energy</th>" +
        "<th>Sleep (h)</th><th>Nausea</th><th>Symptom days</th></tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table></div>";
  }

  /* ---------------------------------------------------------- observations */

  function renderObservations(state) {
    var host = document.getElementById("trendObservations");
    var obs = HM.insights.observations(state);
    host.innerHTML = "";
    obs.forEach(function (o) {
      host.appendChild(el("div", { class: "obs-item obs-" + o.kind }, [
        el("span", { class: "dot", "aria-hidden": "true" }),
        el("span", { text: o.text })
      ]));
    });
  }

  function renderUrgent(state) {
    var host = document.getElementById("urgentHistory");
    var events = HM.insights.urgentEvents(state, 90);

    if (!events.length) {
      host.hidden = true;
      return;
    }

    host.hidden = false;
    host.innerHTML =
      '<div class="panel-head"><h2>Urgent signs you marked</h2></div>' +
      '<p class="panel-sub">These appear at the top of your visit notes. If any is happening now, ' +
      'call your provider or open <a href="crisis.html" style="text-decoration:underline">urgent help</a>.</p>' +
      '<div class="obs-list">' + events.map(function (ev) {
        return '<div class="obs-item obs-urgent"><span class="dot"></span><span>' +
          HM.dom.escapeHtml(HM.dates.formatDate(ev.date, "long")) + ": " +
          HM.dom.escapeHtml(ev.signs.join(", ")) + "</span></div>";
      }).join("") + "</div>";
  }

  /* ------------------------------------------------------------ empty state */

  function renderEmpty(state) {
    var host = document.getElementById("trendEmpty");
    var body = document.getElementById("trendBody");
    var count = Object.keys(state.checkins || {}).length;

    if (count >= 2) {
      host.hidden = true;
      body.hidden = false;
      return false;
    }

    host.hidden = false;
    body.hidden = true;
    host.innerHTML =
      '<div class="empty"><h3>Trends need a couple of check-ins first</h3>' +
      "<p>Log two or more days and this page fills in with charts, weekly averages, " +
      "and plain observations you can take to an appointment.</p>" +
      '<div class="row"><a class="btn btn-primary" href="checkin.html">Do today’s check-in</a>' +
      '<button type="button" class="btn btn-quiet" id="trendSample">Load sample data</button></div></div>';

    var btn = document.getElementById("trendSample");
    if (btn) {
      btn.addEventListener("click", function () {
        HM.sample.load();
        HM.dom.toast("Sample data loaded");
        render();
      });
    }
    return true;
  }

  function render() {
    var state = HM.store.load();
    if (renderEmpty(state)) return;

    renderSummaryTiles(state);
    renderRangeSwitch(state);
    renderMetricSwitch(state);
    renderChart(state);
    renderSymptoms(state);
    renderWeekTable(state);
    renderObservations(state);
    renderUrgent(state);
  }

  function init() {
    if (!document.getElementById("trendChart")) return;
    render();
  }

  HM.trends = { init: init, render: render };
  HM.dom.ready(init);
})(window.HM);
