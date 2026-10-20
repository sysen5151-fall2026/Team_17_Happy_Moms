/* ==========================================================================
   Happy Moms — About you and prediction inputs (Postpartum Depression tab)
   Renders the About you questions, saves each answer as it is tapped, and
   shows every prediction input with its current value. Inputs come from
   HM.risk.features(); this file is only the screen.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var el = HM.dom.el;
  var nodes = {};

  function profile() {
    return Object.assign(HM.risk.blankProfile(), HM.store.load().riskProfile || {});
  }

  function save(mutator) {
    HM.store.update(function (s) {
      var rp = Object.assign(HM.risk.blankProfile(), s.riskProfile || {});
      mutator(rp);
      rp.updatedAt = HM.dates.todayKey();
      s.riskProfile = rp;
    });
    nodes.saved.textContent = "Saved.";
    render();
  }

  /* ------------------------------------------------------------- form */

  function optionButton(label, pressed, onclick) {
    return el("button", {
      type: "button",
      class: "metric-btn" + (pressed ? " active" : ""),
      "aria-pressed": String(pressed),
      onclick: onclick
    }, [label]);
  }

  function renderQuestion(q, rp) {
    var answer = rp[q.id];
    var group = el("div", { class: "metric-switch risk-options", role: "group", "aria-labelledby": "rq-" + q.id });

    q.options.forEach(function (opt) {
      var pressed = q.multi
        ? Array.isArray(answer) && answer.indexOf(opt.value) !== -1
        : answer === opt.value;
      group.appendChild(optionButton(opt.label, pressed, function () {
        save(function (p) {
          if (!q.multi) {
            p[q.id] = opt.value;
            return;
          }
          var list = Array.isArray(p[q.id]) ? p[q.id].slice() : [];
          var at = list.indexOf(opt.value);
          if (at === -1) list.push(opt.value);
          else list.splice(at, 1);
          p[q.id] = list;
        });
      }));
    });

    /* A multi-choice question needs an explicit "none", or an untouched
       question and a "none of these" answer would look the same. */
    if (q.multi) {
      var none = Array.isArray(answer) && answer.length === 0;
      group.appendChild(optionButton("None of these", none, function () {
        save(function (p) { p[q.id] = []; });
      }));
    }

    return el("div", { class: "risk-q" }, [
      el("p", { class: "risk-label", id: "rq-" + q.id, text: q.label }),
      q.hint ? el("p", { class: "field-hint", style: "margin:0 0 10px", text: q.hint }) : null,
      group
    ]);
  }

  function renderForm() {
    var rp = profile();
    nodes.form.innerHTML = "";
    HM.risk.questions.forEach(function (q) { nodes.form.appendChild(renderQuestion(q, rp)); });
  }

  /* ----------------------------------------------------------- inputs */

  function formatValue(item, value) {
    if (value === null || value === undefined) return el("span", { class: "muted", text: "Not yet" });
    if (item.unit === "yes/no") return el("span", { text: value ? "Yes" : "No" });
    var suffix = item.unit === "hours" ? " h" : item.unit.indexOf("of ") === 0 ? " " + item.unit : "";
    return el("span", { class: "inputs-num", text: value + suffix });
  }

  function renderInputs() {
    var f = HM.risk.features(HM.store.load());
    nodes.body.innerHTML = "";
    var have = 0;

    HM.risk.catalog.forEach(function (item) {
      var value = f.values[item.name];
      if (value !== null) have++;
      nodes.body.appendChild(el("tr", {}, [
        el("td", {}, [
          el("span", { class: "inputs-label", text: item.label }),
          el("code", { class: "inputs-var", text: item.name })
        ]),
        el("td", {}, [formatValue(item, value)]),
        el("td", { text: item.source }),
        el("td", { text: item.measures })
      ]));
    });

    var parts = [have + " of " + HM.risk.catalog.length + " inputs filled in."];
    if (f.checkinsLogged < HM.risk.limits.trendMinLogged) {
      parts.push("The 14-day averages need at least " + HM.risk.limits.trendMinLogged +
        " daily check-ins in the last 14 days (you have " + f.checkinsLogged + ").");
    }
    if (!f.latestCheckOn) parts.push("The mood check scores fill in after your first mood check.");
    nodes.meta.textContent = parts.join(" ");
  }

  function render() {
    renderForm();
    renderInputs();
  }

  function init() {
    if (!document.getElementById("riskForm") || nodes.form) return;
    nodes.form = document.getElementById("riskForm");
    nodes.saved = document.getElementById("riskSaved");
    nodes.body = document.getElementById("inputsBody");
    nodes.meta = document.getElementById("inputsMeta");
    render();
  }

  HM.riskForm = { init: init, render: render };
  HM.dom.ready(init);
})(window.HM);
