/* ==========================================================================
   Happy Moms — profile, settings, and data control
   The mission analysis is explicit that the mother stays in control of her
   information, so everything destructive or exportable lives on this page:
   export, import, sample data, and a full delete.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var el = HM.dom.el;

  var FIELDS = [
    { id: "name", label: "What should we call you?", type: "text", placeholder: "First name, or leave blank", hint: "Used for greetings and the header of your visit notes." },
    { id: "dueDate", label: "Estimated due date", type: "date", hint: "This drives your week count, trimester, and coverage." },
    { id: "providerName", label: "Provider or practice", type: "text", placeholder: "Dr. Rivera, Northside OB", hint: "Appears on your visit notes so the page is clearly addressed." },
    { id: "lastVisit", label: "Date of last prenatal visit", type: "date", hint: "Sets the interval for the since-last-visit summary." },
    { id: "nextAppointment", label: "Next appointment", type: "date", hint: "Shown on Today so you know what you are preparing for." },
    { id: "supportPerson", label: "Support person", type: "text", placeholder: "Partner, sister, friend", hint: "Named on shared puzzle results. Nothing is sent to them automatically." },
    { id: "birthDate", label: "Baby's birth date", type: "date", hint: "Only needed for postpartum mode.", postpartumOnly: true }
  ];

  var nodes = {};

  /* ------------------------------------------------------------------ form */

  function renderForm(state) {
    var host = document.getElementById("profileForm");
    host.innerHTML = "";

    FIELDS.forEach(function (f) {
      if (f.postpartumOnly && !state.profile.postpartum) return;

      var wrap = el("div", { class: "field" + (f.type === "text" && f.id === "name" ? "" : "") });
      wrap.appendChild(el("label", { for: "pf-" + f.id, text: f.label }));

      var input = el("input", {
        type: f.type,
        id: "pf-" + f.id,
        name: f.id,
        placeholder: f.placeholder || ""
      });
      input.value = state.profile[f.id] || "";

      if (f.id === "dueDate" || f.id === "birthDate") {
        input.addEventListener("change", function () { previewGestation(); });
      }

      wrap.appendChild(input);
      wrap.appendChild(el("p", { class: "field-hint", text: f.hint }));
      host.appendChild(wrap);
    });

    /* Postpartum switch */
    var switchWrap = el("div", { class: "switch-row full" });
    var toggle = el("input", { type: "checkbox", id: "pf-postpartum" });
    toggle.checked = !!state.profile.postpartum;
    toggle.addEventListener("change", function () {
      HM.store.update(function (s) { s.profile.postpartum = toggle.checked; });
      render();
      HM.dom.toast(toggle.checked ? "Fourth trimester mode on" : "Pregnancy mode on");
    });
    switchWrap.appendChild(toggle);
    switchWrap.appendChild(el("div", {}, [
      el("label", { for: "pf-postpartum", text: "Fourth trimester mode" }),
      el("p", {
        class: "field-hint",
        text: "Switches week counting to weeks postpartum and reframes check-ins around recovery. " +
          "Your history is kept either way."
      })
    ]));
    host.appendChild(switchWrap);
  }

  function previewGestation() {
    var host = document.getElementById("gestationPreview");
    var dueInput = document.getElementById("pf-dueDate");
    var birthInput = document.getElementById("pf-birthDate");
    var postpartum = document.getElementById("pf-postpartum");

    var probe = {
      dueDate: dueInput ? dueInput.value : "",
      birthDate: birthInput ? birthInput.value : "",
      postpartum: postpartum ? postpartum.checked : false
    };

    var g = HM.gestation.of(probe);

    if (!g.known) {
      host.innerHTML = '<p class="small muted" style="margin:0">Enter a due date to see your current week.</p>';
      return;
    }

    if (g.postpartum) {
      host.innerHTML = '<span class="pill pill-week">' + HM.dom.escapeHtml(g.label) + "</span>";
      return;
    }

    var warn = "";
    if (g.week < 0 || g.week > 45) {
      warn = '<p class="small" style="margin:10px 0 0;color:var(--warn-ink)">That date puts you outside a ' +
        "normal pregnancy range. Worth double-checking.</p>";
    }

    host.innerHTML =
      '<span class="pill pill-week">Week ' + g.week + ", day " + g.day + "</span> " +
      '<span class="pill">' + HM.dom.escapeHtml(g.phase) + "</span> " +
      '<span class="pill">' + (g.daysToDue >= 0 ? g.daysToDue + " days to go" : Math.abs(g.daysToDue) + " days past due") + "</span>" +
      warn;
  }

  function saveForm() {
    var updates = {};
    FIELDS.forEach(function (f) {
      var input = document.getElementById("pf-" + f.id);
      if (input) updates[f.id] = input.value;
    });

    HM.store.update(function (s) {
      Object.keys(updates).forEach(function (k) { s.profile[k] = updates[k]; });
    });

    HM.dom.toast("Profile saved");
    render();
  }

  /* -------------------------------------------------------------- baseline */

  function renderBaseline(state) {
    var host = document.getElementById("baselineBlock");
    var baseline = state.profile.baseline;

    if (!baseline) {
      host.innerHTML =
        '<p class="panel-sub" style="margin-top:0">Your baseline is a one-time, six-question snapshot ' +
        "of where you are starting. Trends read against it.</p>" +
        '<a class="btn btn-primary btn-sm" href="quiz.html">Take the baseline check-in</a>';
      return;
    }

    host.innerHTML =
      '<div class="kv-grid">' +
        '<div class="kv"><dt>Baseline score</dt><dd>' + baseline.total + "<small style=\"font-size:0.7rem\"> of 18</small></dd></div>" +
        '<div class="kv"><dt>Taken</dt><dd style="font-size:0.95rem;font-family:var(--font-body)">' +
          HM.dom.escapeHtml(HM.dates.formatDate(baseline.takenOn, "long")) + "</dd></div>" +
      "</div>" +
      '<p class="small muted" style="margin:14px 0 12px">' + HM.dom.escapeHtml(baseline.label || "") + "</p>" +
      '<a class="btn btn-quiet btn-sm" href="quiz.html">Retake baseline</a>';
  }

  /* ------------------------------------------------------------------ data */

  function dataItem(title, description, buttonLabel, handler, danger) {
    return el("div", { class: "data-item" }, [
      el("div", {}, [
        el("h4", { text: title }),
        el("p", { text: description })
      ]),
      el("button", {
        type: "button",
        class: "btn btn-sm " + (danger ? "btn-danger" : "btn-quiet"),
        onclick: handler
      }, [buttonLabel])
    ]);
  }

  function exportData() {
    var state = HM.store.load();
    var payload = JSON.stringify(state, null, 2);
    var name = "happy-moms-data-" + HM.dates.todayKey() + ".json";
    HM.dom.download(name, payload, "application/json");
    HM.dom.toast("Exported " + name);
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== "object" || !("checkins" in parsed)) {
          HM.dom.toast("That file does not look like a Happy Moms export");
          return;
        }
        HM.store.save(HM.store.migrate(parsed));
        HM.dom.toast("Data restored from file");
        render();
      } catch (err) {
        HM.dom.toast("Could not read that file");
      }
    };
    reader.readAsText(file);
  }

  function renderData(state) {
    var host = document.getElementById("dataList");
    var entryCount = Object.keys(state.checkins || {}).length;
    var puzzleCount = Object.keys(state.puzzle || {}).length;
    var questionCount = (state.questions || []).length;

    host.innerHTML = "";

    host.appendChild(el("div", { class: "kv-grid", style: "margin-bottom:22px" }, [
      el("div", { class: "kv", html: "<dt>Check-ins</dt><dd>" + entryCount + "</dd>" }),
      el("div", { class: "kv", html: "<dt>Puzzle days</dt><dd>" + puzzleCount + "</dd>" }),
      el("div", { class: "kv", html: "<dt>Questions</dt><dd>" + questionCount + "</dd>" }),
      el("div", {
        class: "kv",
        html: "<dt>Stored</dt><dd style=\"font-size:0.95rem;font-family:var(--font-body)\">" +
          (HM.store.available ? "This browser" : "Not saving") + "</dd>"
      })
    ]));

    host.appendChild(dataItem(
      "Export everything",
      "Downloads a JSON file with your profile, check-ins, questions, and puzzle history. Keep it as a backup, or move to another device.",
      "Download JSON",
      exportData
    ));

    var importRow = dataItem(
      "Restore from a file",
      "Replaces what is in this browser with the contents of a Happy Moms export.",
      "Choose file",
      function () { document.getElementById("importInput").click(); }
    );
    host.appendChild(importRow);

    if (HM.sample.isLoaded(state)) {
      host.appendChild(dataItem(
        "Sample data is on",
        "Three weeks of demo entries are mixed into your history. Removing them leaves anything you entered yourself untouched.",
        "Remove sample data",
        function () {
          HM.sample.clear();
          HM.dom.toast("Sample data removed");
          render();
        }
      ));
    } else {
      host.appendChild(dataItem(
        "Load sample data",
        "Adds three weeks of demo check-ins so trends and visit notes have something to show. Useful for a walkthrough.",
        "Load sample data",
        function () {
          HM.sample.load();
          HM.dom.toast("Sample data loaded");
          render();
        }
      ));
    }
  }

  function renderDanger() {
    var host = document.getElementById("dangerZone");
    host.innerHTML =
      "<h3>Delete everything</h3>" +
      "<p>Clears your profile, every check-in, your questions, and puzzle history from this browser. " +
      "This cannot be undone, and there is no copy on a server to restore from. Export first if you " +
      "want to keep a record.</p>" +
      '<button type="button" class="btn btn-danger btn-sm" id="wipeBtn">Delete all my data</button>';

    document.getElementById("wipeBtn").addEventListener("click", function () {
      var ok = window.confirm(
        "Delete all Happy Moms data in this browser?\n\n" +
        "Profile, check-ins, questions, and puzzle history will be removed. This cannot be undone."
      );
      if (!ok) return;
      HM.store.reset();
      HM.dom.toast("All data deleted");
      render();
    });
  }

  function renderTheme(state) {
    var host = document.getElementById("themeChoice");
    host.innerHTML = "";

    [
      { id: "auto", label: "Match my device" },
      { id: "light", label: "Light" },
      { id: "dark", label: "Dark" }
    ].forEach(function (opt) {
      host.appendChild(el("button", {
        type: "button",
        class: "metric-btn" + (state.settings.theme === opt.id ? " active" : ""),
        "aria-pressed": String(state.settings.theme === opt.id),
        onclick: function () {
          HM.store.update(function (s) { s.settings.theme = opt.id; });
          HM.theme.apply(opt.id);
          render();
        }
      }, [opt.label]));
    });
  }

  /* ------------------------------------------------------------------ init */

  function render() {
    var state = HM.store.load();
    renderForm(state);
    previewGestation();
    renderBaseline(state);
    renderData(state);
    renderTheme(state);
  }

  function init() {
    if (!document.getElementById("profileForm")) return;

    nodes.save = document.getElementById("saveProfile");
    nodes.save.addEventListener("click", saveForm);

    var importInput = document.getElementById("importInput");
    importInput.addEventListener("change", function () {
      if (importInput.files && importInput.files[0]) importData(importInput.files[0]);
      importInput.value = "";
    });

    renderDanger();
    render();
  }

  HM.profile = { init: init, render: render };
  HM.dom.ready(init);
})(window.HM);
