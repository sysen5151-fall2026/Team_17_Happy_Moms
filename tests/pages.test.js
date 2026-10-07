/* Loads every page in a headless DOM, runs its real scripts, and checks that
   it renders and behaves. Needs jsdom:  npm install
   Skipped automatically when jsdom is not installed. */
const fs = require("fs");
const path = require("path");
const { ROOT } = require("./harness");

module.exports = {
  needsJsdom: true,

  run: async function (t) {
    const { JSDOM, VirtualConsole } = require("jsdom");
    /* index.html and 404.html sit at the repo root, because GitHub Pages
       only serves a custom 404 from there. Every other page is in html/. */
    const rootPages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort();
    const subPages = fs.existsSync(path.join(ROOT, "html"))
      ? fs.readdirSync(path.join(ROOT, "html")).filter((f) => f.endsWith(".html")).sort()
        .map((f) => "html/" + f)
      : [];
    const pages = rootPages.concat(subPages);

    /* Page names in this suite are repo-relative, so a page in html/ is
       addressed as "html/app.html". */
    const P = (file) => (rootPages.includes(file) ? file : "html/" + file);

    /* A realistic saved state: three weeks of entries, one urgent marking,
       one free-text note, one saved question. */
    function seed() {
      const key = (d) => d.toISOString().slice(0, 10);
      const now = new Date();
      const checkins = {};
      for (let i = 0; i < 12; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        checkins[key(d)] = {
          date: key(d), mood: 3 + (i % 3), energy: 2 + (i % 3), sleepHours: 6.5,
          sleepQuality: 3, nausea: 2, water: 7, activity: 30,
          symptoms: i % 2 ? ["backPain"] : ["heartburn", "insomnia"],
          urgent: i === 3 ? ["severeHeadache"] : [],
          note: i === 5 ? "Rough night, woke up three times." : ""
        };
      }
      const due = new Date(now);
      due.setDate(due.getDate() + 90);
      return {
        schema: 1,
        createdAt: now.toISOString(),
        profile: {
          name: "Test", dueDate: key(due), birthDate: "", postpartum: false,
          supportPerson: "", providerName: "Dr. Test", lastVisit: "",
          nextAppointment: "", baseline: null
        },
        checkins,
        questions: [{ id: "q1", text: "Is this normal?", createdAt: "", asked: false }],
        puzzle: {}, favorites: [], assistant: [],
        settings: { theme: "auto", sampleData: false }
      };
    }

    function loadPage(file, saved) {
      return new Promise((resolve) => {
        const errors = [];
        const vc = new VirtualConsole();
        vc.on("jsdomError", (e) => errors.push(e.message));
        vc.on("error", (...a) => errors.push(a.join(" ")));

        const dom = new JSDOM(fs.readFileSync(path.join(ROOT, file), "utf8"), {
          url: "https://example.org/" + file,   // keeps relative paths honest
          runScripts: "dangerously",
          pretendToBeVisual: true,
          virtualConsole: vc,
          beforeParse(window) {
            window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {} }));
            window.scrollTo = () => {};
            window.print = () => {};
            window.HTMLElement.prototype.scrollIntoView = () => {};
            if (saved) window.localStorage.setItem("happymoms.v1", JSON.stringify(saved));
          }
        });

        const { window } = dom;

        /* jsdom will not fetch local scripts, so run them in document order. */
        const scripts = [...window.document.querySelectorAll("script[src]")]
          .map((s) => s.getAttribute("src"))
          .filter((src) => src && !/^https?:/.test(src));

        try {
          const pageDir = path.dirname(path.join(ROOT, file));
          scripts.forEach((src) => window.eval(fs.readFileSync(path.resolve(pageDir, src), "utf8")));
          window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
        } catch (err) {
          errors.push("THREW: " + err.message);
        }

        setTimeout(() => resolve({ window, errors }), 60);
      });
    }

    // ---------- every page loads clean, empty and with history
    for (const file of pages) {
      for (const [label, saved] of [["no data", null], ["with history", seed()]]) {
        const { window, errors } = await loadPage(file, saved);
        t.check(file + " loads with " + label, errors.length === 0, errors.slice(0, 2).join(" | "));

        const header = window.document.getElementById("siteHeader");
        if (header) t.check(file + " renders the header (" + label + ")", header.innerHTML.includes("Happy Moms"));

        const footer = window.document.getElementById("siteFooter");
        if (footer) t.check(file + " renders the footer (" + label + ")", footer.innerHTML.includes("Not medical advice"));

        window.close();
      }
    }

    // ---------- links
    const missing = [];
    pages.forEach((file) => {
      const html = fs.readFileSync(path.join(ROOT, file), "utf8");
      const pageDir = path.dirname(path.join(ROOT, file));
      [...html.matchAll(/\shref="([^"]+)"/g)].map((m) => m[1])
        .concat([...html.matchAll(/\ssrc="([^"]+)"/g)].map((m) => m[1]))
        .forEach((href) => {
          if (/^(https?:|mailto:|tel:|sms:|#|data:)/.test(href)) return;
          if (href.startsWith("/")) {
            /* Root-absolute paths break on a project site served from
               /<repo>/, so they are a failure even when the file exists. */
            missing.push(file + " -> " + href + " (root-absolute)");
            return;
          }
          const target = href.split("#")[0].split("?")[0];
          if (target && !fs.existsSync(path.resolve(pageDir, target))) {
            missing.push(file + " -> " + target);
          }
        });
    });
    t.check("every internal link and script resolves", missing.length === 0, missing.join(", "));

    /* The chrome builds its links from data-root, so a page that omits it is
       relying on a URL-sniffing fallback rather than stating the truth. */
    const rootless = [];
    pages.forEach((file) => {
      const html = fs.readFileSync(path.join(ROOT, file), "utf8");
      const declared = (html.match(/<body[^>]*\sdata-root="([^"]*)"/) || [])[1];
      const expected = file.includes("/") ? "../" : "";
      if (declared === undefined) rootless.push(file + " (absent)");
      else if (declared !== expected) rootless.push(file + ' (="' + declared + '", want "' + expected + '")');
    });
    t.check("every page declares its distance from the site root", rootless.length === 0, rootless.join(", "));

    {
      /* The chrome renders on pages at two different depths, and it has to
         produce a different prefix for each. Checking only one depth would
         miss exactly the breakage that moving pages into html/ causes, so
         both shells are checked at both levels. */
      const fromEachLevel = [
        "index.html",        // site shell, repo root
        "404.html",          // site shell, repo root
        P("app.html"),       // app shell, one level down
        P("about.html")      // site shell, one level down
      ];

      for (const file of fromEachLevel) {
        const { window } = await loadPage(file, seed());
        const fromDir = path.dirname(path.join(ROOT, file));
        const bad = [...new Set([...window.document.querySelectorAll("a[href]")]
          .map((a) => a.getAttribute("href"))
          .filter((h) => h && !/^(https?:|mailto:|tel:|sms:|#)/.test(h))
          .map((h) => h.split("#")[0].split("?")[0])
          .filter(Boolean))]
          .filter((h) => h.startsWith("/") || !fs.existsSync(path.resolve(fromDir, h)));
        t.check("links built at runtime resolve from " + file, bad.length === 0, bad.join(", "));
        window.close();
      }
    }

    // ---------- each page actually renders its content
    const renders = [
      [P("app.html"), (w) => w.document.getElementById("appTiles").children.length >= 4, "Today shows its tiles"],
      [P("app.html"), (w) => w.document.getElementById("appQuick").children.length >= 6, "Today shows quick links"],
      [P("app.html"), (w) => w.document.getElementById("appObservations").children.length > 0, "Today shows observations"],
      [P("checkin.html"), (w) => w.document.querySelectorAll("#ciSteps .scale-btn").length === 5, "Check-in shows a five-point scale"],
      [P("checkin.html"), (w) => w.document.getElementById("ciProgressLabel").textContent.includes("of 7"), "Check-in is seven steps"],
      [P("trends.html"), (w) => w.document.getElementById("trendChart").innerHTML.includes("<svg"), "Trends draws a chart"],
      [P("trends.html"), (w) => w.document.getElementById("metricSwitch").children.length === 7, "Trends offers every measure"],
      [P("trends.html"), (w) => w.document.getElementById("weekTable").innerHTML.includes("<table"), "Trends builds the weekly table"],
      [P("trends.html"), (w) => !w.document.getElementById("urgentHistory").hidden, "Trends surfaces urgent markings"],
      [P("summary.html"), (w) => w.document.getElementById("sheet").innerHTML.includes("Averages for this interval"), "Visit notes show averages"],
      [P("summary.html"), (w) => w.document.getElementById("sheet").innerHTML.includes("Flagged for discussion"), "Visit notes lead with urgent signs"],
      [P("summary.html"), (w) => w.document.getElementById("questionList").children.length >= 1, "Visit notes list saved questions"],
      [P("assistant.html"), (w) => w.document.getElementById("chatLog").children.length >= 1, "Assistant explains itself first"],
      [P("assistant.html"), (w) => w.document.getElementById("topicCloud").children.length >= 25, "Assistant lists its topics"],
      [P("puzzle.html"), (w) => w.document.querySelectorAll("#pzBoard .pz-tile").length === 30, "Puzzle draws six rows of five"],
      [P("puzzle.html"), (w) => w.document.querySelectorAll("#pzKeyboard .pz-key").length === 28, "Puzzle draws a keyboard"],
      [P("tips.html"), (w) => w.document.querySelectorAll("#tipGrid .tip-card").length === w.HM.content.tips.length, "Tips renders every card"],
      [P("tips.html"), (w) => !w.document.getElementById("tipForYou").hidden, "Tips matches recent check-ins"],
      [P("profile.html"), (w) => w.document.querySelectorAll("#profileForm input").length >= 7, "Profile renders its fields"],
      [P("profile.html"), (w) => w.document.getElementById("gestationPreview").innerHTML.includes("Week"), "Profile previews the week"],
      [P("quiz.html"), (w) => w.document.querySelectorAll("#quizSteps .quiz-option").length === 24, "Baseline quiz renders every option"],
      [P("crisis.html"), (w) => w.document.querySelectorAll('a[href^="tel:"]').length >= 3, "Urgent help lists phone numbers"],
      [P("index.html"), (w) => w.document.querySelectorAll(".quick-link").length >= 6, "Home page lists the features"]
    ];

    for (const [file, fn, label] of renders) {
      const { window, errors } = await loadPage(file, seed());
      let ok = false;
      try { ok = !!fn(window); } catch (e) { errors.push(e.message); }
      t.check(label, ok, errors.slice(0, 1).join(""));
      window.close();
    }

    // ---------- assistant behaviour in a real page
    {
      const { window } = await loadPage(P("assistant.html"), seed());
      const log = window.document.getElementById("chatLog");
      window.HM.assistant.ask("how much caffeine can I have");
      t.check("assistant answers an everyday question", log.innerHTML.includes("Caffeine"));
      t.check("assistant shows where the answer came from", log.innerHTML.includes("Informed by ACOG"));
      window.HM.assistant.ask("I am bleeding heavily");
      t.check("assistant escalates a warning sign", log.innerHTML.includes("msg-urgent"));
      t.check("escalation offers a real route to help",
        log.innerHTML.includes("crisis.html") || log.innerHTML.includes("911"));
      window.close();
    }

    // ---------- a full check-in, tapped through
    {
      const { window } = await loadPage(P("checkin.html"), null);
      const doc = window.document;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const scale = (i) => doc.querySelectorAll("#ciSteps .scale-btn")[i].click();
      const choice = (i) => doc.querySelectorAll("#ciSteps .choice-btn")[i].click();

      scale(3); await wait(260);          // mood, auto-advances
      scale(3); await wait(260);          // energy, auto-advances
      choice(2); scale(3);                // sleep hours and quality
      doc.getElementById("ciNext").click();
      scale(1); await wait(260);          // nausea, auto-advances
      choice(2); choice(6);               // water and movement
      t.check("a two-part step waits for both answers", !doc.getElementById("ciNext").disabled);
      doc.getElementById("ciNext").click();
      doc.querySelectorAll("#ciSteps .chip")[0].click();
      doc.getElementById("ciNext").click();
      doc.getElementById("ciNext").click();

      t.check("check-in reaches its saved screen", doc.getElementById("ciDone").classList.contains("active"));

      const stored = JSON.parse(window.localStorage.getItem("happymoms.v1"));
      const entry = stored.checkins[Object.keys(stored.checkins)[0]];
      t.check("check-in wrote an entry", !!entry);
      t.check("check-in stored the mood that was tapped", entry && entry.mood === 4, entry && String(entry.mood));
      t.check("check-in stored the symptom that was tapped",
        entry && Array.isArray(entry.symptoms) && entry.symptoms.length === 1);
      window.close();
    }

    // ---------- the puzzle plays and persists
    {
      const { window } = await loadPage(P("puzzle.html"), seed());
      const HM = window.HM;
      const answer = HM.puzzle.wordForDate(HM.dates.todayKey()).word;
      answer.split("").forEach((ch) => {
        window.document.querySelector('#pzKeyboard .pz-key[aria-label="' + ch + '"]').click();
      });
      window.document.querySelector('#pzKeyboard .pz-key[aria-label="Submit guess"]').click();

      t.check("solving reveals the result panel", !window.document.getElementById("pzResult").hidden);
      t.check("the result teaches the word's note",
        window.document.getElementById("pzResult").innerHTML.includes(answer));
      const saved = JSON.parse(window.localStorage.getItem("happymoms.v1")).puzzle;
      t.check("the day's result is saved", Object.values(saved)[0].status === "won");
      window.close();
    }

    // ---------- the exported summary text
    {
      const { window } = await loadPage(P("summary.html"), seed());
      const HM = window.HM;
      const state = HM.store.load();
      const range = HM.summary.resolveRange(state, "30");
      const text = HM.summary.buildText(state, range, HM.summary.statsFor(state, range));

      t.check("summary text is titled", text.includes("PATIENT-GENERATED, NON-DIAGNOSTIC WELLNESS SUMMARY"));
      t.check("summary text leads with urgent signs", text.includes("FLAGGED FOR DISCUSSION"));
      t.check("summary text includes averages", text.includes("AVERAGES FOR THIS INTERVAL"));
      t.check("summary text includes saved questions", text.includes("QUESTIONS I WANT TO ASK"));
      t.check("summary text carries the disclaimer", /not a diagnosis/i.test(text));
      t.check("summary text has no placeholder values",
        !text.includes("undefined") && !text.includes("NaN") && !text.includes("null"));
      window.close();
    }

    // ---------- UC-P1 walking skeleton: every modeled participant is visited
    {
      const { window } = await loadPage(P("summary.html"), seed());
      const HM = window.HM;
      t.check("UC-P1 step 9: summary request reaches the External AI Service (C.6) stub",
        HM.externalAIService && HM.externalAIService.isStub && HM.externalAIService.calls >= 1);
      t.check("UC-P1 step 10: a stubbed reply falls back to the system composer",
        /fallback composer/.test(HM.summary.generatedBy()));
      t.check("UC-P1 step 11 / StR6.2: presented summary is labelled patient-generated and non-diagnostic",
        /Patient-generated/.test(window.document.getElementById("sheet").innerHTML) &&
        /non-diagnostic/.test(window.document.getElementById("sheet").innerHTML));
      window.close();
    }

    // ---------- profile editing and the theme toggle
    {
      const { window } = await loadPage(P("profile.html"), seed());
      window.document.getElementById("pf-name").value = "Ada";
      window.document.getElementById("saveProfile").click();
      t.check("profile edits are saved",
        JSON.parse(window.localStorage.getItem("happymoms.v1")).profile.name === "Ada");
      t.check("the delete control is present",
        window.document.getElementById("dangerZone").innerHTML.includes("Delete all my data"));
      window.close();
    }

    {
      const { window } = await loadPage(P("app.html"), seed());
      window.document.querySelector(".theme-toggle").click();
      const stamped = window.document.documentElement.getAttribute("data-theme");
      t.check("the theme toggle stamps the document", stamped === "dark" || stamped === "light", String(stamped));
      t.check("the theme choice is remembered",
        JSON.parse(window.localStorage.getItem("happymoms.v1")).settings.theme === stamped);
      window.close();
    }
  }
};
