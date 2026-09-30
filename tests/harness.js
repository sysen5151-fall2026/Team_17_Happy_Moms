/* ==========================================================================
   Test harness
   The app modules are plain browser scripts that attach to window.HM. This
   builds a throwaway DOM-ish global environment so they can be loaded and
   exercised in Node with no browser and no build step.
   ========================================================================== */
const path = require("path");

const ROOT = path.join(__dirname, "..");

const MODULE_ORDER = [
  "hm-config",
  "hm-core",
  "hm-content",
  "hm-charts",
  "hm-insights",
  "hm-sample",
  "hm-assistant",
  "hm-puzzle"
];

function stubElement() {
  return {
    setAttribute() {},
    getAttribute() { return null; },
    appendChild() {},
    removeChild() {},
    addEventListener() {},
    select() {},
    click() {},
    insertAdjacentHTML() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    innerHTML: "",
    textContent: "",
    scrollTop: 0,
    scrollHeight: 0,
    hidden: false,
    children: []
  };
}

/* Fresh globals plus freshly loaded modules, so suites cannot leak into
   each other through window.HM or localStorage. */
function makeEnv() {
  const store = {};

  global.window = global;
  global.HM = undefined;

  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };

  global.document = {
    readyState: "complete",
    addEventListener() {},
    dispatchEvent() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement: stubElement,
    createTextNode() { return {}; },
    documentElement: {
      setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
      classList: { add() {}, remove() {} }
    },
    body: Object.assign(stubElement(), { getAttribute: () => null })
  };

  global.navigator = {};
  global.matchMedia = () => ({ matches: false, addEventListener() {} });
  global.URLSearchParams = URLSearchParams;
  global.location = { search: "", hash: "" };

  MODULE_ORDER.forEach((name) => {
    const file = path.join(ROOT, "js", name + ".js");
    delete require.cache[require.resolve(file)];
    require(file);
  });

  return global.HM;
}

/* Minimal reporter. Suites call t.check(...); run.js reads the tally. */
function makeReporter(suiteName, options) {
  const quiet = options && options.quiet;
  const results = { suite: suiteName, passed: 0, failed: 0, failures: [] };

  return {
    results,
    check(label, condition, detail) {
      const ok = !!condition;
      if (ok) {
        results.passed++;
      } else {
        results.failed++;
        results.failures.push(label + (detail ? "   [" + detail + "]" : ""));
      }
      if (!quiet || !ok) {
        console.log("  " + (ok ? "pass" : "FAIL") + "  " + label +
          (detail !== undefined && detail !== null && (!ok || !quiet) ? "   " + detail : ""));
      }
    },
    equal(label, actual, expected) {
      this.check(label, String(actual) === String(expected),
        String(actual) === String(expected) ? String(actual) : "got " + actual + ", expected " + expected);
    }
  };
}

module.exports = { ROOT, makeEnv, makeReporter, stubElement };
