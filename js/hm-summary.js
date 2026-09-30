/* ==========================================================================
   Happy Moms — visit notes
   Turns the logged interval into a one-page, patient-reported summary the
   mother can hand to her provider. She decides whether to share it: nothing
   here is transmitted anywhere, and there is no link to any health record.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var el = HM.dom.el;
  var current = { rangeId: "sinceVisit", text: "", range: null };

  /* ---------------------------------------------------------------- ranges */

  function resolveRange(state, rangeId) {
    var today = HM.dates.todayKey();
    var entries = HM.insights.entries(state);
    var earliest = entries.length ? entries[0].date : today;
    var start;

    if (rangeId === "all") {
      start = earliest;
    } else if (rangeId === "sinceVisit" && state.profile.lastVisit) {
      start = state.profile.lastVisit;
    } else if (rangeId === "sinceVisit") {
      start = HM.dates.toKey(HM.dates.addDays(new Date(), -28));
    } else {
      start = HM.dates.toKey(HM.dates.addDays(new Date(), -(Number(rangeId) - 1)));
    }

    if (start < earliest) start = earliest;

    return {
      id: rangeId,
      start: start,
      end: today,
      days: HM.dates.daysBetween(start, today) + 1,
      label: rangeId === "all" ? "All logged history"
        : rangeId === "sinceVisit" ? "Since last visit"
        : "Last " + rangeId + " days"
    };
  }

  function statsFor(state, range) {
    var keys = HM.insights.rangeKeys(range.start, range.end);
    var entries = HM.insights.entriesBetween(state, range.start, range.end);

    var metrics = HM.insights.metrics.map(function (m) {
      var values = HM.insights.values(state, m.id, keys);
      return {
        id: m.id,
        label: m.label,
        unit: m.unit,
        count: values.length,
        mean: values.length ? HM.stats.round(HM.stats.mean(values), 1) : null,
        min: values.length ? Math.min.apply(null, values) : null,
        max: values.length ? Math.max.apply(null, values) : null
      };
    });

    var symptomCounts = {};
    var urgent = [];
    var notes = [];

    entries.forEach(function (e) {
      (e.symptoms || []).forEach(function (s) {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      });
      if ((e.urgent || []).length) {
        urgent.push({
          date: e.date,
          signs: e.urgent.map(function (u) { return HM.content.urgentLabels[u] || u; })
        });
      }
      if (e.note && String(e.note).trim()) {
        notes.push({ date: e.date, note: String(e.note).trim() });
      }
    });

    var symptoms = Object.keys(symptomCounts).map(function (k) {
      return { label: HM.content.symptomLabels[k] || k, count: symptomCounts[k] };
    }).sort(function (a, b) { return b.count - a.count; });

    return {
      entries: entries,
      daysLogged: entries.length,
      daysInRange: keys.length,
      metrics: metrics,
      symptoms: symptoms,
      urgent: urgent.reverse(),
      notes: notes.reverse()
    };
  }

  /* ------------------------------------------------------------- rendering */

  function metricLine(m) {
    if (m.mean === null) return null;
    var unit = m.unit === "of 5" ? " of 5" : " " + m.unit;
    return m.label + ": average " + m.mean + unit +
      " (range " + HM.stats.round(m.min, 1) + " to " + HM.stats.round(m.max, 1) +
      ", " + m.count + " day" + (m.count === 1 ? "" : "s") + " logged)";
  }

  function renderSheet(state, range, data) {
    var host = document.getElementById("sheet");
    var g = HM.gestation.of(state.profile);
    var name = state.profile.name || "Patient-reported wellness log";

    var sections = [];

    /* Urgent first: it is the one thing a provider must not miss. */
    if (data.urgent.length) {
      sections.push(
        '<div class="sheet-section">' +
          "<h3>Flagged for discussion</h3>" +
          '<div class="banner banner-alert" style="margin:0 0 10px">' +
            "<div>The following were marked as urgent signs during this interval.</div></div>" +
          "<ul>" + data.urgent.map(function (u) {
            return "<li><strong>" + HM.dom.escapeHtml(HM.dates.formatDate(u.date, "long")) +
              ":</strong> " + HM.dom.escapeHtml(u.signs.join(", ")) + "</li>";
          }).join("") + "</ul>" +
        "</div>"
      );
    }

    /* Averages */
    var kvs = data.metrics.filter(function (m) { return m.mean !== null; }).map(function (m) {
      return '<div class="kv"><dt>' + HM.dom.escapeHtml(m.label) + "</dt><dd>" + m.mean +
        (m.unit === "of 5" ? "" : " <small style=\"font-size:0.7rem\">" + HM.dom.escapeHtml(m.unit) + "</small>") +
        "</dd></div>";
    }).join("");

    sections.push(
      '<div class="sheet-section">' +
        "<h3>Averages for this interval</h3>" +
        (kvs ? '<dl class="kv-grid">' + kvs + "</dl>"
             : '<p class="muted small">No numeric entries in this range.</p>') +
      "</div>"
    );

    /* Observations */
    var obs = HM.insights.observations(state).filter(function (o) { return o.kind !== "info"; });
    if (obs.length) {
      sections.push(
        '<div class="sheet-section">' +
          "<h3>What changed</h3>" +
          "<ul>" + obs.map(function (o) {
            return "<li>" + HM.dom.escapeHtml(o.text) + "</li>";
          }).join("") + "</ul>" +
        "</div>"
      );
    }

    /* Symptoms */
    if (data.symptoms.length) {
      sections.push(
        '<div class="sheet-section">' +
          "<h3>Symptoms logged</h3>" +
          "<ul>" + data.symptoms.map(function (s) {
            return "<li>" + HM.dom.escapeHtml(s.label) + " on " + s.count + " day" +
              (s.count === 1 ? "" : "s") + "</li>";
          }).join("") + "</ul>" +
        "</div>"
      );
    }

    /* Free-text notes */
    if (data.notes.length) {
      sections.push(
        '<div class="sheet-section">' +
          "<h3>Notes I wrote during the interval</h3>" +
          "<ul>" + data.notes.map(function (n) {
            return "<li><strong>" + HM.dom.escapeHtml(HM.dates.formatDate(n.date)) + ":</strong> " +
              HM.dom.escapeHtml(n.note) + "</li>";
          }).join("") + "</ul>" +
        "</div>"
      );
    }

    /* Questions */
    var open = (state.questions || []).filter(function (q) { return !q.asked; });
    sections.push(
      '<div class="sheet-section">' +
        "<h3>Questions I want to ask</h3>" +
        (open.length
          ? "<ul>" + open.map(function (q) {
              return "<li>" + HM.dom.escapeHtml(q.text) + "</li>";
            }).join("") + "</ul>"
          : '<p class="muted small">No questions saved yet. Add them below and they will appear here.</p>') +
      "</div>"
    );

    host.innerHTML =
      '<div class="sheet-head">' +
        "<h2>" + HM.dom.escapeHtml(name) + "</h2>" +
        '<div class="meta">' +
          (g.known ? HM.dom.escapeHtml(g.postpartum ? g.label : "Week " + g.week + ", day " + g.day + " · " + g.phase) + " &middot; " : "") +
          HM.dom.escapeHtml(HM.dates.formatDate(range.start, "long")) + " to " +
          HM.dom.escapeHtml(HM.dates.formatDate(range.end, "long")) + " &middot; " +
          data.daysLogged + " of " + data.daysInRange + " days logged" +
        "</div>" +
        (state.profile.providerName
          ? '<div class="meta">For: ' + HM.dom.escapeHtml(state.profile.providerName) + "</div>" : "") +
      "</div>" +
      sections.join("") +
      '<div class="sheet-foot">' +
        "Patient-reported wellness log generated by Happy Moms on " +
        HM.dom.escapeHtml(HM.dates.formatDate(HM.dates.todayKey(), "long")) + ". " +
        "Self-reported entries only. Not a diagnosis, not a medical record, and not reviewed by a clinician. " +
        "Wellness content in this app is paraphrased from ACOG, NIH, FDA, and CDC guidance." +
      "</div>";
  }

  /* ---------------------------------------------------------- plain text */

  function buildText(state, range, data) {
    var g = HM.gestation.of(state.profile);
    var lines = [];

    lines.push("HAPPY MOMS - PATIENT-REPORTED WELLNESS SUMMARY");
    lines.push("");
    if (state.profile.name) lines.push("Name: " + state.profile.name);
    if (g.known) {
      lines.push("Stage: " + (g.postpartum ? g.label : "Week " + g.week + ", day " + g.day + " (" + g.phase + ")"));
      if (!g.postpartum) lines.push("Estimated due date: " + HM.dates.formatDate(g.dueDate, "long"));
    }
    if (state.profile.providerName) lines.push("Provider: " + state.profile.providerName);
    lines.push("Interval: " + HM.dates.formatDate(range.start, "long") + " to " + HM.dates.formatDate(range.end, "long"));
    lines.push("Days logged: " + data.daysLogged + " of " + data.daysInRange);
    lines.push("");

    if (data.urgent.length) {
      lines.push("FLAGGED FOR DISCUSSION");
      data.urgent.forEach(function (u) {
        lines.push("  - " + HM.dates.formatDate(u.date, "long") + ": " + u.signs.join(", "));
      });
      lines.push("");
    }

    lines.push("AVERAGES FOR THIS INTERVAL");
    var any = false;
    data.metrics.forEach(function (m) {
      var line = metricLine(m);
      if (line) { lines.push("  - " + line); any = true; }
    });
    if (!any) lines.push("  - No numeric entries in this range.");
    lines.push("");

    var obs = HM.insights.observations(state).filter(function (o) { return o.kind !== "info"; });
    if (obs.length) {
      lines.push("WHAT CHANGED");
      obs.forEach(function (o) { lines.push("  - " + o.text); });
      lines.push("");
    }

    if (data.symptoms.length) {
      lines.push("SYMPTOMS LOGGED");
      data.symptoms.forEach(function (s) {
        lines.push("  - " + s.label + " on " + s.count + " day" + (s.count === 1 ? "" : "s"));
      });
      lines.push("");
    }

    if (data.notes.length) {
      lines.push("NOTES I WROTE");
      data.notes.forEach(function (n) {
        lines.push("  - " + HM.dates.formatDate(n.date) + ": " + n.note);
      });
      lines.push("");
    }

    var open = (state.questions || []).filter(function (q) { return !q.asked; });
    lines.push("QUESTIONS I WANT TO ASK");
    if (open.length) {
      open.forEach(function (q) { lines.push("  - " + q.text); });
    } else {
      lines.push("  - (none saved)");
    }
    lines.push("");

    lines.push("Generated by Happy Moms on " + HM.dates.formatDate(HM.dates.todayKey(), "long") + ".");
    lines.push("Self-reported wellness entries only. Not a diagnosis, not a medical record,");
    lines.push("and not reviewed by a clinician. Wellness content is paraphrased from ACOG,");
    lines.push("NIH, FDA, and CDC guidance.");

    return lines.join("\n");
  }

  /* --------------------------------------------------------------- actions */

  function renderRangeButtons(state) {
    var host = document.getElementById("rangeSwitch");
    host.innerHTML = "";
    [
      { id: "sinceVisit", label: "Since last visit" },
      { id: "14", label: "Last 14 days" },
      { id: "30", label: "Last 30 days" },
      { id: "all", label: "All history" }
    ].forEach(function (r) {
      host.appendChild(el("button", {
        type: "button",
        class: "metric-btn" + (r.id === current.rangeId ? " active" : ""),
        "aria-pressed": String(r.id === current.rangeId),
        onclick: function () {
          current.rangeId = r.id;
          render();
        }
      }, [r.label]));
    });
  }

  function renderQuestions(state) {
    var host = document.getElementById("questionList");
    var questions = state.questions || [];
    host.innerHTML = "";

    if (!questions.length) {
      host.appendChild(el("p", {
        class: "small muted",
        text: "Nothing saved yet. Questions arrive at odd hours and vanish in the exam room, so add them as you think of them."
      }));
    }

    questions.forEach(function (q) {
      var item = el("div", { class: "question-item" + (q.asked ? " asked" : "") });

      var box = el("input", {
        type: "checkbox",
        id: "q-" + q.id,
        "aria-label": "Mark as asked: " + q.text
      });
      box.checked = !!q.asked;
      box.addEventListener("change", function () {
        HM.store.update(function (s) {
          s.questions.forEach(function (row) {
            if (row.id === q.id) row.asked = box.checked;
          });
        });
        render();
      });

      item.appendChild(box);
      item.appendChild(el("p", { text: q.text }));
      item.appendChild(el("button", {
        type: "button",
        class: "icon-btn",
        "aria-label": "Delete question",
        title: "Delete",
        html: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        onclick: function () {
          HM.store.update(function (s) {
            s.questions = s.questions.filter(function (row) { return row.id !== q.id; });
          });
          render();
        }
      }));

      host.appendChild(item);
    });
  }

  function wireActions() {
    document.getElementById("copyBtn").addEventListener("click", function () {
      HM.dom.copyText(current.text).then(function (ok) {
        HM.dom.toast(ok ? "Summary copied to clipboard" : "Copy failed, try downloading instead");
      });
    });

    document.getElementById("downloadBtn").addEventListener("click", function () {
      var name = "happy-moms-visit-notes-" + HM.dates.todayKey() + ".txt";
      HM.dom.download(name, current.text, "text/plain");
      HM.dom.toast("Downloaded " + name);
    });

    document.getElementById("printBtn").addEventListener("click", function () {
      window.print();
    });

    var shareBtn = document.getElementById("shareBtn");
    if (navigator.share) {
      shareBtn.hidden = false;
      shareBtn.addEventListener("click", function () {
        navigator.share({
          title: "Happy Moms visit notes",
          text: current.text
        }).catch(function () { /* the user dismissed the sheet */ });
      });
    }

    var form = document.getElementById("addQuestionForm");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("questionInput");
      var text = input.value.trim();
      if (!text) return;
      HM.store.update(function (s) {
        s.questions.push({
          id: HM.dom.uid(),
          text: text,
          createdAt: new Date().toISOString(),
          asked: false
        });
      });
      input.value = "";
      render();
      HM.dom.toast("Question saved");
    });
  }

  function render() {
    var state = HM.store.load();
    var range = resolveRange(state, current.rangeId);
    var data = statsFor(state, range);

    current.range = range;
    current.text = buildText(state, range, data);

    renderRangeButtons(state);

    var empty = document.getElementById("summaryEmpty");
    var body = document.getElementById("summaryBody");

    if (!Object.keys(state.checkins || {}).length) {
      empty.hidden = false;
      body.hidden = true;
      empty.innerHTML =
        '<div class="empty"><h3>Nothing to summarise yet</h3>' +
        "<p>Visit notes are built from your check-ins. One entry is enough to start, " +
        "and a couple of weeks makes for a genuinely useful page.</p>" +
        '<div class="row"><a class="btn btn-primary" href="checkin.html">Do a check-in</a>' +
        '<button type="button" class="btn btn-quiet" id="summarySample">Load sample data</button></div></div>';
      var btn = document.getElementById("summarySample");
      if (btn) {
        btn.addEventListener("click", function () {
          HM.sample.load();
          HM.dom.toast("Sample data loaded");
          render();
        });
      }
      renderQuestions(state);
      return;
    }

    empty.hidden = true;
    body.hidden = false;
    renderSheet(state, range, data);
    renderQuestions(state);
  }

  function init() {
    if (!document.getElementById("sheet")) return;
    wireActions();
    render();
  }

  HM.summary = { init: init, render: render, buildText: buildText, resolveRange: resolveRange, statsFor: statsFor };
  HM.dom.ready(init);
})(window.HM);
