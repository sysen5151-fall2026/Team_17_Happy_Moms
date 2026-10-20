/* ==========================================================================
   Happy Moms — mood check page
   Walks through the ten EPDS items one at a time, then routes the result.
   The self-harm item is checked the moment it is answered, and urgent help
   is shown before any score (requirement StR7.3). Scoring lives in
   hm-screening.js; this file is only the screen.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var el = HM.dom.el;
  var S = HM.screening;
  var nodes = {};
  var state = { answers: [], step: 0, saved: null };

  var BAND_LABELS = {
    below: "Lower range",
    positive: "Talk at your next visit",
    call: "Talk with your provider soon",
    urgent: "Urgent help shown"
  };

  function show(view) {
    ["intro", "form", "urgent", "result"].forEach(function (name) {
      nodes[name].hidden = name !== view;
    });
    if (nodes.shell.scrollIntoView) nodes.shell.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------------------------------------------------------------- intro */

  function renderHistory() {
    var past = (HM.store.load().screenings || []).slice(-5).reverse();
    if (!past.length) {
      nodes.history.hidden = true;
      return;
    }
    nodes.history.hidden = false;
    nodes.history.innerHTML = "";
    nodes.history.appendChild(el("h3", { class: "tile-label", text: "Your recent mood checks" }));
    var list = el("ul", {});
    past.forEach(function (s) {
      list.appendChild(el("li", {}, [
        el("span", { text: HM.dates.formatDate(s.takenOn, "long") }),
        el("span", { class: "pill mc-band-" + s.band, text: BAND_LABELS[s.band] || s.band })
      ]));
    });
    nodes.history.appendChild(list);
  }

  /* ---------------------------------------------------------------- items */

  function renderStep() {
    var item = S.items[state.step];
    nodes.step.innerHTML = "";
    nodes.step.appendChild(el("h2", { class: "ci-question", id: "mcQuestion", text: item.text }));

    var group = el("div", { class: "choice-list", role: "group", "aria-labelledby": "mcQuestion" });
    item.options.forEach(function (label, index) {
      var selected = state.answers[state.step] === index;
      group.appendChild(el("button", {
        type: "button",
        class: "choice-btn" + (selected ? " selected" : ""),
        "aria-pressed": String(selected),
        onclick: function () { choose(index); }
      }, [
        el("span", { text: label }),
        el("span", {
          class: "tick",
          html: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
        })
      ]));
    });
    nodes.step.appendChild(group);

    var n = state.step + 1;
    nodes.bar.style.width = (n / S.items.length) * 100 + "%";
    nodes.progressLabel.textContent = "Question " + n + " of " + S.items.length;
    nodes.back.disabled = state.step === 0;
  }

  function choose(index) {
    state.answers[state.step] = index;
    renderStep();
    if (state.step < S.items.length - 1) {
      window.setTimeout(function () {
        state.step += 1;
        renderStep();
      }, 180);
    } else {
      finish();
    }
  }

  function back() {
    if (state.step > 0) {
      state.step -= 1;
      renderStep();
    }
  }

  /* --------------------------------------------------------------- finish */

  /* Saved before anything is shown, so leaving the page from the urgent
     screen still keeps the record. */
  function finish() {
    var profile = HM.store.load().profile;
    var rec = S.record(state.answers, profile, new Date(), "self");
    if (!rec) return;

    HM.store.update(function (s) {
      s.screenings = s.screenings || [];
      if (state.saved) {
        s.screenings = s.screenings.filter(function (x) { return x.id !== state.saved.id; });
      }
      s.screenings.push(rec);
    });
    state.saved = rec;
    if (HM.riskForm) HM.riskForm.render();

    if (S.needsUrgentHelp(state.answers)) {
      renderContacts();
      show("urgent");
    } else {
      renderResult(rec);
      show("result");
    }
  }

  function renderContacts() {
    nodes.contacts.innerHTML = "";
    HM.config.crisis.filter(function (c) { return c.action; }).forEach(function (c) {
      nodes.contacts.appendChild(el("li", {}, [
        el("div", {}, [
          el("strong", { text: c.name }),
          el("p", { class: "small", text: c.detail })
        ]),
        el("a", { class: "btn btn-primary btn-sm", href: c.action, text: c.label })
      ]));
    });
  }

  function renderResult(rec) {
    var msg = S.messages[rec.band];
    nodes.resultTitle.textContent = msg.title;
    nodes.resultBody.textContent = msg.body;

    var lines = [
      el("span", { class: "mc-score-num", text: rec.total + " of 30" }),
      el("span", { class: "small muted", text: "EPDS score. Scores of " + S.cutoffs.positive +
        " or more are usually followed up with a provider." })
    ];
    if (rec.band === "urgent") {
      var rest = S.score(rec.answers).totalBand;
      lines.push(el("p", { class: "small", style: "margin:8px 0 0",
        text: "Apart from question 10: " + S.messages[rest].title.toLowerCase() + "." }));
    }
    nodes.score.innerHTML = "";
    lines.forEach(function (node) { nodes.score.appendChild(node); });
  }

  /* ----------------------------------------------------------------- init */

  function start() {
    state.step = 0;
    show("form");
    renderStep();
  }

  function init() {
    if (!document.getElementById("mcShell") || nodes.shell) return;
    nodes.shell = document.getElementById("mcShell");
    nodes.intro = document.getElementById("mcIntro");
    nodes.form = document.getElementById("mcForm");
    nodes.urgent = document.getElementById("mcUrgent");
    nodes.result = document.getElementById("mcResult");
    nodes.history = document.getElementById("mcHistory");
    nodes.step = document.getElementById("mcStep");
    nodes.bar = document.getElementById("mcBar");
    nodes.progressLabel = document.getElementById("mcProgressLabel");
    nodes.back = document.getElementById("mcBack");
    nodes.contacts = document.getElementById("mcContacts");
    nodes.resultTitle = document.getElementById("mcResultTitle");
    nodes.resultBody = document.getElementById("mcResultBody");
    nodes.score = document.getElementById("mcScore");

    document.getElementById("mcStart").addEventListener("click", start);
    nodes.back.addEventListener("click", back);
    document.getElementById("mcContinue").addEventListener("click", function () {
      renderResult(state.saved);
      show("result");
    });
    document.getElementById("mcAgain").addEventListener("click", start);

    renderHistory();
  }

  HM.moodCheck = { init: init, choose: choose };
  HM.dom.ready(init);
})(window.HM);
