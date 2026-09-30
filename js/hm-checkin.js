/* ==========================================================================
   Happy Moms — daily check-in
   A short tap-through survey. Single-answer steps advance on their own, so a
   full check-in takes a few seconds, which is the point: the mission analysis
   found tracking fails when it feels like data entry.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  /* Questions are grouped into steps. Grouping keeps the flow to seven taps
     rather than ten screens. */
  var FLOW = [
    { ids: ["mood"] },
    { ids: ["energy"] },
    { ids: ["sleepHours", "sleepQuality"], title: "How did you sleep?" },
    { ids: ["nausea"] },
    { ids: ["water", "activity"], title: "Water and movement" },
    { ids: ["symptoms"], urgent: true },
    { ids: ["note"] }
  ];

  var el = HM.dom.el;
  var question = {};
  HM.content.checkin.forEach(function (q) { question[q.id] = q; });

  var state = {
    dateKey: HM.dates.todayKey(),
    answers: {},
    step: 0
  };

  var nodes = {};

  /* --------------------------------------------------------------- helpers */

  function defaultAnswers() {
    return { symptoms: [], urgent: [], note: "" };
  }

  function loadAnswersFor(dateKey) {
    var saved = (HM.store.load().checkins || {})[dateKey];
    var answers = defaultAnswers();
    if (saved) {
      Object.keys(saved).forEach(function (k) { answers[k] = saved[k]; });
      answers.symptoms = (saved.symptoms || []).slice();
      answers.urgent = (saved.urgent || []).slice();
      answers.note = saved.note || "";
    }
    return answers;
  }

  function stepAnswered(index) {
    var step = FLOW[index];
    if (!step) return false;
    return step.ids.every(function (id) {
      var q = question[id];
      if (q.optional || q.type === "multi" || q.type === "text") return true;
      return state.answers[id] !== undefined && state.answers[id] !== null;
    });
  }

  function isAutoAdvance(index) {
    var step = FLOW[index];
    return step && step.ids.length === 1 &&
      (question[step.ids[0]].type === "scale" || question[step.ids[0]].type === "choice");
  }

  /* ---------------------------------------------------------------- render */

  function renderScale(q) {
    var wrap = el("div", { class: "scale-row", role: "group", "aria-label": q.label });
    for (var i = 1; i <= 5; i++) {
      (function (value) {
        var selected = state.answers[q.id] === value;
        var btn = el("button", {
          type: "button",
          class: "scale-btn" + (selected ? " selected" : ""),
          "aria-pressed": String(selected),
          onclick: function () { choose(q, value); }
        }, [
          q.emojis
            ? el("span", { class: "face", "aria-hidden": "true", text: q.emojis[value - 1] })
            : el("span", { class: "num", "aria-hidden": "true", text: String(value) }),
          el("span", { class: "cap", text: (q.captions && q.captions[value - 1]) || String(value) })
        ]);
        wrap.appendChild(btn);
      })(i);
    }
    return wrap;
  }

  function renderChoice(q) {
    var wrap = el("div", { class: "choice-list", role: "group", "aria-label": q.label });
    q.options.forEach(function (opt) {
      var selected = state.answers[q.id] === opt.value;
      wrap.appendChild(el("button", {
        type: "button",
        class: "choice-btn" + (selected ? " selected" : ""),
        "aria-pressed": String(selected),
        onclick: function () { choose(q, opt.value); }
      }, [
        el("span", { text: opt.label }),
        el("span", {
          class: "tick",
          html: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
        })
      ]));
    });
    return wrap;
  }

  function renderMulti(q) {
    var wrap = el("div", { class: "chip-grid", role: "group", "aria-label": q.label });
    q.options.forEach(function (opt) {
      var selected = state.answers.symptoms.indexOf(opt.value) !== -1;
      wrap.appendChild(el("button", {
        type: "button",
        class: "chip" + (selected ? " selected" : ""),
        "aria-pressed": String(selected),
        onclick: function (e) {
          var list = state.answers.symptoms;
          var at = list.indexOf(opt.value);
          if (at === -1) list.push(opt.value); else list.splice(at, 1);
          e.currentTarget.classList.toggle("selected");
          e.currentTarget.setAttribute("aria-pressed", String(at === -1));
        }
      }, [opt.label]));
    });
    return wrap;
  }

  function renderUrgentBlock() {
    var block = el("div", { class: "urgent-block chip-urgent-set" });
    block.appendChild(el("h3", { text: "Anything urgent today?" }));
    block.appendChild(el("p", {
      text: "These signs need a call to your provider rather than a log entry. " +
        "Marking one here only records it for your notes."
    }));

    var grid = el("div", { class: "chip-grid" });
    HM.content.urgentSigns.forEach(function (sign) {
      var selected = state.answers.urgent.indexOf(sign.value) !== -1;
      grid.appendChild(el("button", {
        type: "button",
        class: "chip" + (selected ? " selected" : ""),
        "aria-pressed": String(selected),
        onclick: function (e) {
          var list = state.answers.urgent;
          var at = list.indexOf(sign.value);
          if (at === -1) list.push(sign.value); else list.splice(at, 1);
          e.currentTarget.classList.toggle("selected");
          e.currentTarget.setAttribute("aria-pressed", String(at === -1));
          paintUrgentNotice();
        }
      }, [sign.label]));
    });
    block.appendChild(grid);

    block.appendChild(el("div", { id: "urgentNotice" }));
    return block;
  }

  function paintUrgentNotice() {
    var host = document.getElementById("urgentNotice");
    if (!host) return;
    if (!state.answers.urgent.length) {
      host.innerHTML = "";
      return;
    }
    var mental = state.answers.urgent.some(function (code) {
      return HM.content.urgentSigns.some(function (s) {
        return s.value === code && s.category === "mental";
      });
    });
    host.innerHTML =
      '<div class="row" style="margin-top:16px">' +
        '<a class="btn btn-primary btn-sm" href="crisis.html">Open urgent help</a>' +
        (mental ? '<a class="btn btn-quiet btn-sm" href="tel:988">Call or text 988</a>' : "") +
      "</div>" +
      '<p class="small" style="margin:12px 0 0">Call your provider now if this is happening. ' +
      "For a life-threatening emergency, call 911.</p>";
  }

  function renderText(q) {
    var wrap = el("div", { class: "ci-note" });
    var ta = el("textarea", {
      id: "ciNote",
      placeholder: q.placeholder || "",
      "aria-label": q.label
    });
    ta.value = state.answers.note || "";
    ta.addEventListener("input", function () { state.answers.note = ta.value; });
    wrap.appendChild(ta);
    return wrap;
  }

  function renderStep() {
    var step = FLOW[state.step];
    var host = nodes.steps;
    host.innerHTML = "";

    var stepEl = el("div", { class: "ci-step active" });

    var heading = step.title || question[step.ids[0]].label;
    stepEl.appendChild(el("h2", { class: "ci-question", text: heading }));

    var firstQ = question[step.ids[0]];
    if (firstQ.hint) stepEl.appendChild(el("p", { class: "ci-hint", text: firstQ.hint }));
    else if (isAutoAdvance(state.step)) {
      stepEl.appendChild(el("p", { class: "ci-hint", text: "Tap one and we will move along." }));
    }

    step.ids.forEach(function (id, i) {
      var q = question[id];
      if (i > 0 || step.title) {
        if (step.ids.length > 1) {
          stepEl.appendChild(el("h3", {
            class: "tile-label",
            style: "margin-top:20px",
            text: q.label
          }));
        }
      }
      if (q.type === "scale") stepEl.appendChild(renderScale(q));
      else if (q.type === "choice") stepEl.appendChild(renderChoice(q));
      else if (q.type === "multi") stepEl.appendChild(renderMulti(q));
      else if (q.type === "text") stepEl.appendChild(renderText(q));
    });

    if (step.urgent) stepEl.appendChild(renderUrgentBlock());

    host.appendChild(stepEl);
    if (step.urgent) paintUrgentNotice();

    paintProgress();
    paintNav();
  }

  function paintProgress() {
    var pct = ((state.step + 1) / FLOW.length) * 100;
    nodes.bar.style.width = pct + "%";
    nodes.progressLabel.textContent = "Step " + (state.step + 1) + " of " + FLOW.length;
  }

  function paintNav() {
    nodes.back.disabled = state.step === 0;
    var last = state.step === FLOW.length - 1;
    nodes.next.textContent = last ? "Save check-in" : "Next";
    nodes.next.disabled = !last && !stepAnswered(state.step) && !isAutoAdvance(state.step);
    nodes.skip.hidden = last || stepAnswered(state.step);
  }

  /* ----------------------------------------------------------------- flow */

  function choose(q, value) {
    state.answers[q.id] = value;
    var step = FLOW[state.step];

    /* Repaint the group so selection shows, then advance if this step is
       a single tap. */
    renderStep();

    if (isAutoAdvance(state.step) && step.ids.length === 1) {
      window.setTimeout(function () { goNext(); }, 180);
    }
  }

  function goNext() {
    if (state.step < FLOW.length - 1) {
      state.step += 1;
      renderStep();
      nodes.shell.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      save();
    }
  }

  function goBack() {
    if (state.step > 0) {
      state.step -= 1;
      renderStep();
    }
  }

  function save() {
    var entry = Object.assign({}, state.answers);
    entry.date = state.dateKey;
    entry.createdAt = new Date().toISOString();
    delete entry.sample;

    HM.store.update(function (s) {
      s.checkins[state.dateKey] = entry;
    });

    showDone(entry);
  }

  /* ----------------------------------------------------------- completion */

  function recapItem(label, value) {
    return el("div", { class: "recap-item" }, [
      el("dt", { text: label }),
      el("dd", { text: value })
    ]);
  }

  function labelFor(id, value) {
    var q = question[id];
    if (!q || value === undefined || value === null) return "Not logged";
    if (q.type === "scale") return (q.captions && q.captions[value - 1]) || String(value);
    if (q.type === "choice") {
      var match = q.options.filter(function (o) { return o.value === value; })[0];
      return match ? match.label : String(value);
    }
    return String(value);
  }

  function showDone(entry) {
    nodes.form.hidden = true;
    nodes.done.classList.add("active");

    var recap = el("dl", { class: "recap-list" }, [
      recapItem("Mood", labelFor("mood", entry.mood)),
      recapItem("Energy", labelFor("energy", entry.energy)),
      recapItem("Sleep", labelFor("sleepHours", entry.sleepHours)),
      recapItem("Nausea", labelFor("nausea", entry.nausea)),
      recapItem("Water", labelFor("water", entry.water)),
      recapItem("Movement", labelFor("activity", entry.activity))
    ]);

    var symptomText = (entry.symptoms || []).length
      ? entry.symptoms.map(function (s) { return HM.content.symptomLabels[s] || s; }).join(", ")
      : "Nothing else logged";

    var streak = HM.stats.streak(HM.store.load().checkins);

    nodes.doneBody.innerHTML = "";
    nodes.doneBody.appendChild(recap);
    nodes.doneBody.appendChild(el("p", { class: "small muted", style: "margin-top:16px", text: "Also logged: " + symptomText }));

    if ((entry.urgent || []).length) {
      nodes.doneBody.appendChild(el("div", {
        class: "banner banner-alert",
        style: "margin-top:18px;text-align:left",
        html: "<div><strong>You marked an urgent sign.</strong> Call your provider now, " +
          'and use <a href="crisis.html">urgent help</a> for crisis lines. ' +
          "This entry will appear at the top of your visit notes.</div>"
      }));
    }

    nodes.doneStreak.textContent = streak === 1
      ? "That is 1 day logged. Tomorrow makes it a streak."
      : "That is " + streak + " days in a row.";

    /* Suggest a tip that matches what was logged today. */
    var suggestion = suggestTip(entry);
    if (suggestion) {
      nodes.doneBody.appendChild(el("div", {
        class: "panel",
        style: "margin-top:20px;text-align:left",
        html: '<div class="tile-label">Might help tonight</div>' +
          "<h3 style=\"font-size:1.05rem;margin:6px 0 6px\">" + HM.dom.escapeHtml(suggestion.title) + "</h3>" +
          '<p class="small muted" style="margin-bottom:10px">' + HM.dom.escapeHtml(suggestion.body) + "</p>" +
          '<a class="link small" href="tips.html?topic=' + suggestion.topic + '" style="font-weight:600;color:var(--color-rose-deep)">More ' +
          HM.dom.escapeHtml(topicLabel(suggestion.topic).toLowerCase()) + " tips</a>"
      }));
    }
  }

  function topicLabel(topicId) {
    var t = HM.content.topics.filter(function (x) { return x.id === topicId; })[0];
    return t ? t.label : topicId;
  }

  function suggestTip(entry) {
    var candidates = [];
    (entry.symptoms || []).forEach(function (s) {
      candidates = candidates.concat(HM.content.tipsForSymptom(s));
    });
    if (!candidates.length && entry.water !== undefined && entry.water <= 4) {
      candidates = HM.content.tipsForTopic("hydration");
    }
    if (!candidates.length && entry.sleepHours !== undefined && entry.sleepHours < 6) {
      candidates = HM.content.tipsForTopic("rest");
    }
    if (!candidates.length && entry.activity !== undefined && entry.activity === 0) {
      candidates = HM.content.tipsForTopic("movement");
    }
    if (!candidates.length) candidates = HM.content.tipsForTopic("mind");
    var index = HM.content.dailyIndex(state.dateKey + candidates.length, candidates.length);
    return candidates[index] || null;
  }

  /* ------------------------------------------------------------------ init */

  function setDate(dateKey) {
    state.dateKey = dateKey;
    state.answers = loadAnswersFor(dateKey);
    state.step = 0;
    var existing = (HM.store.load().checkins || {})[dateKey];
    nodes.editing.hidden = !existing;
    renderStep();
  }

  function init() {
    nodes.shell = document.getElementById("ciShell");
    if (!nodes.shell) return;

    nodes.form = document.getElementById("ciForm");
    nodes.steps = document.getElementById("ciSteps");
    nodes.bar = document.getElementById("ciBar");
    nodes.progressLabel = document.getElementById("ciProgressLabel");
    nodes.back = document.getElementById("ciBack");
    nodes.next = document.getElementById("ciNext");
    nodes.skip = document.getElementById("ciSkip");
    nodes.done = document.getElementById("ciDone");
    nodes.doneBody = document.getElementById("ciDoneBody");
    nodes.doneStreak = document.getElementById("ciDoneStreak");
    nodes.dateInput = document.getElementById("ciDate");
    nodes.editing = document.getElementById("ciEditing");

    nodes.back.addEventListener("click", goBack);
    nodes.next.addEventListener("click", goNext);
    nodes.skip.addEventListener("click", goNext);

    /* Let people log a day they missed, within the last week. */
    var today = HM.dates.todayKey();
    nodes.dateInput.max = today;
    nodes.dateInput.min = HM.dates.toKey(HM.dates.addDays(new Date(), -7));

    var params = new URLSearchParams(window.location.search);
    var requested = params.get("date");
    var startKey = requested && requested >= nodes.dateInput.min && requested <= today ? requested : today;

    nodes.dateInput.value = startKey;
    nodes.dateInput.addEventListener("change", function () {
      var value = nodes.dateInput.value;
      if (!value || value > today || value < nodes.dateInput.min) {
        nodes.dateInput.value = state.dateKey;
        return;
      }
      setDate(value);
    });

    setDate(startKey);

    /* Number keys 1-5 answer a scale step without reaching for the mouse. */
    document.addEventListener("keydown", function (e) {
      if (nodes.form.hidden) return;
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "textarea" || tag === "input") return;
      var step = FLOW[state.step];
      if (step.ids.length === 1 && question[step.ids[0]].type === "scale") {
        var n = Number(e.key);
        if (n >= 1 && n <= 5) {
          e.preventDefault();
          choose(question[step.ids[0]], n);
        }
      }
      if (e.key === "Enter" && !nodes.next.disabled) {
        e.preventDefault();
        goNext();
      }
    });
  }

  HM.checkin = { init: init, flow: FLOW };
  HM.dom.ready(init);
})(window.HM);
