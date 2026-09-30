/* ==========================================================================
   Happy Moms — core runtime
   Storage, date/gestation math, small stats helpers, DOM utilities.
   All data lives in this browser only. There is no server and no account.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var STORAGE_KEY = "happymoms.v1";
  var memoryFallback = null; // used when localStorage is unavailable

  /* ---------------------------------------------------------------- state */

  function blankState() {
    return {
      schema: 1,
      createdAt: new Date().toISOString(),
      profile: {
        name: "",
        dueDate: "",          // "YYYY-MM-DD"
        birthDate: "",        // set when postpartum mode is on
        postpartum: false,
        supportPerson: "",
        providerName: "",
        lastVisit: "",         // anchors the "since last visit" summary range
        nextAppointment: "",
        baseline: null        // { takenOn, total, answers: { id: points } }
      },
      checkins: {},           // { "YYYY-MM-DD": { ...entry } }
      questions: [],          // [{ id, text, createdAt, asked }]
      puzzle: {},             // { "YYYY-MM-DD": { word, guesses, status } }
      favorites: [],          // saved tip ids
      assistant: [],          // [{ query, entryId, at }]
      settings: { theme: "light", sampleData: false }
    };
  }

  function canUseStorage() {
    try {
      var k = "__hm_test__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch (err) {
      return false;
    }
  }

  var storageOk = canUseStorage();

  /* Merge saved data onto a blank state so newly added fields always exist. */
  function migrate(saved) {
    var base = blankState();
    var out = Object.assign(base, saved || {});
    out.profile = Object.assign(blankState().profile, (saved && saved.profile) || {});
    out.settings = Object.assign(blankState().settings, (saved && saved.settings) || {});
    out.checkins = (saved && saved.checkins) || {};
    out.questions = (saved && saved.questions) || [];
    out.puzzle = (saved && saved.puzzle) || {};
    out.favorites = (saved && saved.favorites) || [];
    out.assistant = (saved && saved.assistant) || [];
    out.schema = 1;
    return out;
  }

  function load() {
    if (!storageOk) {
      if (!memoryFallback) memoryFallback = blankState();
      return memoryFallback;
    }
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return blankState();
      return migrate(JSON.parse(raw));
    } catch (err) {
      console.warn("Happy Moms: saved data could not be read, starting fresh.", err);
      return blankState();
    }
  }

  function save(state) {
    if (!storageOk) {
      memoryFallback = state;
      return false;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.warn("Happy Moms: data could not be saved.", err);
      return false;
    }
  }

  /* Read-modify-write in one call: HM.store.update(function (state) { ... }) */
  function update(mutator) {
    var state = load();
    var result = mutator(state);
    var target = result === undefined ? state : result;
    save(target);
    return target;
  }

  function reset() {
    if (storageOk) {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
    }
    memoryFallback = blankState();
    return blankState();
  }

  HM.store = {
    key: STORAGE_KEY,
    available: storageOk,
    blank: blankState,
    migrate: migrate,
    load: load,
    save: save,
    update: update,
    reset: reset
  };

  /* ---------------------------------------------------------------- dates */

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function toKey(date) {
    var d = date instanceof Date ? date : new Date(date);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function fromKey(key) {
    var parts = String(key).split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function todayKey() { return toKey(new Date()); }

  function addDays(date, days) {
    var d = date instanceof Date ? new Date(date.getTime()) : fromKey(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function daysBetween(a, b) {
    var d1 = a instanceof Date ? a : fromKey(a);
    var d2 = b instanceof Date ? b : fromKey(b);
    var ms = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate()) -
             Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    return Math.round(ms / 86400000);
  }

  function formatDate(value, style) {
    var d = value instanceof Date ? value : fromKey(value);
    var opts = style === "long"
      ? { month: "long", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric" };
    return d.toLocaleDateString(undefined, opts);
  }

  /* Last N day keys, oldest first, ending today. */
  function recentKeys(days) {
    var out = [];
    for (var i = days - 1; i >= 0; i--) out.push(toKey(addDays(new Date(), -i)));
    return out;
  }

  HM.dates = {
    toKey: toKey,
    fromKey: fromKey,
    todayKey: todayKey,
    addDays: addDays,
    daysBetween: daysBetween,
    formatDate: formatDate,
    recentKeys: recentKeys
  };

  /* ------------------------------------------------------------ gestation */

  /* Standard convention: 40 weeks 0 days of gestation at the estimated due
     date, so week and day are counted back from the due date. */
  function gestation(profile, refDate) {
    var ref = refDate || new Date();
    var p = profile || {};

    if (p.postpartum && p.birthDate) {
      var weeksPost = Math.max(0, Math.floor(daysBetween(p.birthDate, ref) / 7));
      return {
        known: true,
        postpartum: true,
        weeksPostpartum: weeksPost,
        trimester: 4,
        label: "Week " + weeksPost + " postpartum",
        phase: "Fourth trimester"
      };
    }

    if (!p.dueDate) {
      return { known: false, postpartum: false, trimester: 0, label: "Due date not set", phase: "" };
    }

    var daysToDue = daysBetween(ref, p.dueDate);
    var totalDays = 280 - daysToDue;
    var week = Math.floor(totalDays / 7);
    var day = ((totalDays % 7) + 7) % 7;
    var trimester = week < 14 ? 1 : (week < 28 ? 2 : 3);

    return {
      known: true,
      postpartum: false,
      week: week,
      day: day,
      totalDays: totalDays,
      daysToDue: daysToDue,
      dueDate: p.dueDate,
      trimester: trimester,
      overdue: daysToDue < 0,
      label: "Week " + week + ", day " + day,
      phase: trimester === 1 ? "First trimester" : trimester === 2 ? "Second trimester" : "Third trimester"
    };
  }

  /* Gestational week number for a past date, used for coverage math. */
  function weekOfDate(profile, dateKey) {
    var g = gestation(profile, fromKey(dateKey));
    if (!g.known || g.postpartum) return null;
    return g.week;
  }

  HM.gestation = { of: gestation, weekOfDate: weekOfDate };

  /* ---------------------------------------------------------------- stats */

  function numbers(list) {
    return (list || []).filter(function (v) {
      return typeof v === "number" && !isNaN(v);
    });
  }

  function mean(list) {
    var n = numbers(list);
    if (!n.length) return null;
    return n.reduce(function (a, b) { return a + b; }, 0) / n.length;
  }

  function round(value, places) {
    if (value === null || value === undefined || isNaN(value)) return null;
    var f = Math.pow(10, places || 0);
    return Math.round(value * f) / f;
  }

  /* Consecutive days with a check-in, counting back from today. Today being
     empty does not break the streak until the whole day has passed. */
  function streak(checkins) {
    var map = checkins || {};
    var count = 0;
    var cursor = new Date();
    if (!map[toKey(cursor)]) cursor = addDays(cursor, -1);
    while (map[toKey(cursor)]) {
      count++;
      cursor = addDays(cursor, -1);
    }
    return count;
  }

  HM.stats = { mean: mean, round: round, streak: streak, numbers: numbers };

  /* ------------------------------------------------------------------ dom */

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var value = attrs[k];
      if (value === null || value === undefined) return;
      if (k === "class") node.className = value;
      else if (k === "html") node.innerHTML = value;
      else if (k === "text") node.textContent = value;
      else if (k.indexOf("on") === 0 && typeof value === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), value);
      } else {
        node.setAttribute(k, value);
      }
    });
    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* Brief status message pinned to the bottom of the screen. */
  function toast(message) {
    var host = document.getElementById("hmToast");
    if (!host) {
      host = el("div", { id: "hmToast", class: "hm-toast", role: "status", "aria-live": "polite" });
      document.body.appendChild(host);
    }
    host.textContent = message;
    host.classList.add("visible");
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function () {
      host.classList.remove("visible");
    }, 2800);
  }

  function legacyCopy(text) {
    try {
      var ta = el("textarea", { style: "position:fixed;top:0;left:0;opacity:0" });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(function () { return true; })
        .catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  HM.dom = {
    ready: ready,
    el: el,
    escapeHtml: escapeHtml,
    uid: uid,
    toast: toast,
    copyText: copyText,
    download: download
  };
})(window.HM);
