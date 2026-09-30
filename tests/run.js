#!/usr/bin/env node
/* ==========================================================================
   Happy Moms test runner

     node tests/run.js            every suite
     node tests/run.js content    just the content suite
     node tests/run.js --quiet    failures only

   The logic suites need nothing installed. The page suite needs jsdom
   (npm install) and is skipped with a note when it is missing.
   ========================================================================== */
const { makeEnv, makeReporter } = require("./harness");

const SUITES = [
  { name: "core", file: "./core.test.js", about: "dates, gestation, streaks, storage" },
  { name: "content", file: "./content.test.js", about: "tips, answers, urgent signs, puzzle words" },
  { name: "assistant", file: "./assistant.test.js", about: "red-flag screening and retrieval" },
  { name: "insights", file: "./insights.test.js", about: "trends, coverage, charts, scoring" },
  { name: "pages", file: "./pages.test.js", about: "every page, rendered and clicked" }
];

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const wanted = args.filter((a) => !a.startsWith("--"));

(async () => {
  const selected = wanted.length
    ? SUITES.filter((s) => wanted.includes(s.name))
    : SUITES;

  if (!selected.length) {
    console.error("No matching suite. Available: " + SUITES.map((s) => s.name).join(", "));
    process.exit(2);
  }

  const totals = { passed: 0, failed: 0, skipped: 0 };
  const failedSuites = [];

  for (const suite of selected) {
    const mod = require(suite.file);
    const reporter = makeReporter(suite.name, { quiet });

    if (mod.needsJsdom) {
      try {
        require.resolve("jsdom");
      } catch (err) {
        console.log("\n" + suite.name + " — skipped (run `npm install` for jsdom)");
        totals.skipped++;
        continue;
      }
    }

    console.log("\n" + suite.name + " — " + suite.about);

    try {
      if (typeof mod === "function") {
        mod(makeEnv(), reporter);
      } else {
        await mod.run(reporter);
      }
    } catch (err) {
      reporter.check("suite ran to completion", false, err.message);
      if (process.env.HM_TRACE) console.error(err);
    }

    const r = reporter.results;
    totals.passed += r.passed;
    totals.failed += r.failed;
    if (r.failed) failedSuites.push(suite.name);
    console.log("  " + r.passed + " passed" + (r.failed ? ", " + r.failed + " FAILED" : ""));
  }

  console.log("\n" + "-".repeat(56));
  console.log(totals.passed + " passed, " + totals.failed + " failed" +
    (totals.skipped ? ", " + totals.skipped + " suite skipped" : ""));

  if (totals.failed) {
    console.log("Failing suites: " + failedSuites.join(", "));
    process.exit(1);
  }
  process.exit(0);
})();
