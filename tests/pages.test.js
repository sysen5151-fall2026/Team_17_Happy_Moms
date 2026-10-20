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

    /* Pages load signed in as this account unless a test says otherwise,
       because every private app page sends a signed-out visitor to login. */
    const TEST_USER = { id: "utest", email: "test@example.org", name: "Test", salt: "00", hash: "00", iterations: 1 };
    const DATA_KEY = "happymoms.v1." + TEST_USER.id;
    const stored = (window) => JSON.parse(window.localStorage.getItem(DATA_KEY));

    function loadPage(file, saved, opts) {
      const { signedIn = true } = opts || {};
      return new Promise((resolve) => {
        const navigated = [];
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
            /* jsdom has no SubtleCrypto or TextEncoder; lend it Node's so hashing runs. */
            if (!(window.crypto && window.crypto.subtle)) {
              Object.defineProperty(window, "crypto", { value: require("crypto").webcrypto, configurable: true });
            }
            if (!window.TextEncoder) window.TextEncoder = require("util").TextEncoder;
            /* Navigation is not implemented in jsdom, so record it instead. */
            window.HM = { navigate: (url) => navigated.push(url) };
            if (signedIn) {
              window.localStorage.setItem("happymoms.accounts", JSON.stringify({ version: 1, users: [TEST_USER] }));
              window.sessionStorage.setItem("happymoms.session", JSON.stringify({ id: TEST_USER.id }));
            }
            if (saved) window.localStorage.setItem(signedIn ? DATA_KEY : "happymoms.v1", JSON.stringify(saved));
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

        setTimeout(() => resolve({ window, errors, navigated }), 60);
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

      const saved = stored(window);
      const entry = saved.checkins[Object.keys(saved.checkins)[0]];
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
      const saved = stored(window).puzzle;
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
        stored(window).profile.name === "Ada");
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
        stored(window).settings.theme === stamped);
      window.close();
    }

    // ---------- mood check (UC.7, N-10), tapped through
    {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      async function tapThrough(window, answers) {
        window.document.getElementById("mcStart").click();
        for (const a of answers) {
          window.document.querySelectorAll("#mcStep .choice-btn")[a].click();
          await wait(220);
        }
      }

      const calm = await loadPage(P("mood-check.html"), seed());
      let doc = calm.window.document;
      t.check("N-10 the mood check opens on its introduction", !doc.getElementById("mcIntro").hidden);
      await tapThrough(calm.window, [1, 1, 1, 1, 1, 1, 1, 1, 3, 3]);
      t.check("N-10 a completed check shows its result", !doc.getElementById("mcResult").hidden &&
        doc.getElementById("mcUrgent").hidden);
      t.check("N-10 a high score shows the provider recommendation",
        /provider soon/i.test(doc.getElementById("mcResultTitle").textContent + doc.getElementById("mcResultBody").textContent));
      t.check("N-10 the result shows the score", doc.getElementById("mcScore").textContent.includes("13 of 30"));
      const savedCalm = stored(calm.window).screenings;
      t.check("N-10 the check is saved to the account", savedCalm.length === 1 && savedCalm[0].band === "call" &&
        savedCalm[0].shareOnNotes === false);
      calm.window.close();

      const urgent = await loadPage(P("mood-check.html"), seed());
      doc = urgent.window.document;
      await tapThrough(urgent.window, [0, 0, 3, 0, 3, 3, 3, 3, 3, 1]);
      t.check("N-10 self-harm answer routes to urgent help before any score",
        !doc.getElementById("mcUrgent").hidden && doc.getElementById("mcResult").hidden &&
        !doc.getElementById("mcUrgent").textContent.includes("of 30"));
      t.check("N-10 urgent help lists 988", !!doc.querySelector('#mcContacts a[href="tel:988"]'));
      t.check("N-10 an urgent check is saved before anything is shown", stored(urgent.window).screenings[0].band === "urgent");
      doc.getElementById("mcContinue").click();
      t.check("N-10 she can continue to her results afterwards", !doc.getElementById("mcResult").hidden);
      urgent.window.close();

      const today = await loadPage(P("app.html"), seed());
      t.check("N-10 Today links to the mood check",
        !!today.window.document.querySelector('#appQuick a[href="mood-check.html"]'));
      today.window.close();
    }

    // ---------- About you and prediction inputs on the same tab (N-10)
    {
      const { window } = await loadPage(P("mood-check.html"), seed());
      const doc = window.document;
      const rows = () => [...doc.querySelectorAll("#inputsBody tr")];
      const valueOf = (name) => {
        const row = rows().find((r) => r.querySelector(".inputs-var").textContent === name);
        return row ? row.children[1].textContent : "(no row)";
      };
      const tap = (question, label) => {
        const q = [...doc.querySelectorAll("#riskForm .risk-q")]
          .find((n) => n.querySelector(".risk-label").id === "rq-" + question);
        [...q.querySelectorAll("button")].find((b) => b.textContent === label).click();
      };

      t.check("N-10 the tab shows the About you questions", doc.querySelectorAll("#riskForm .risk-q").length === 5);
      t.check("N-10 the tab lists all twelve prediction inputs", rows().length === 12);
      t.equal("N-10 an unanswered input reads 'Not yet'", valueOf("prior_ppd"), "Not yet");
      const moodAvg = Number(valueOf("mood_mean_14d"));
      t.check("N-10 daily check-ins already fill the mood average", moodAvg >= 3 && moodAvg <= 5, valueOf("mood_mean_14d"));

      tap("priorPpd", "Yes");
      tap("supportLevel", "One person");
      tap("lifeEvents", "Moved home");
      tap("lifeEvents", "Serious money worries, such as trouble paying bills");
      tap("pregnancyComplications", "None of these");

      const rp = stored(window).riskProfile;
      t.check("N-10 About you answers save as they are tapped",
        rp && rp.priorPpd === "yes" && rp.supportLevel === 1 && rp.lifeEvents.length === 2 &&
        Array.isArray(rp.pregnancyComplications) && rp.pregnancyComplications.length === 0);
      t.check("N-10 the inputs update after an answer",
        valueOf("prior_ppd") === "Yes" && valueOf("support_level") === "1" &&
        valueOf("life_events_count") === "2" && valueOf("preeclampsia") === "No");

      tap("lifeEvents", "Moved home");
      t.equal("N-10 tapping an answer again removes it", valueOf("life_events_count"), "1");
      window.close();
    }

    // ---------- login
    {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));

      const gated = await loadPage(P("app.html"), null, { signedIn: false });
      t.check("a signed-out visit to a private page goes to login",
        gated.navigated[0] === "login.html?next=app.html", String(gated.navigated));
      t.check("the private page stays hidden while it redirects",
        gated.window.document.documentElement.classList.contains("hm-signed-out"));
      gated.window.close();

      for (const page of ["crisis.html", "tips.html"]) {
        const { window, navigated } = await loadPage(P(page), null, { signedIn: false });
        t.check(page + " opens without logging in", navigated.length === 0, String(navigated));
        window.close();
      }

      const home = await loadPage("index.html", null, { signedIn: false });
      t.check("the home page offers a login when signed out",
        home.window.document.getElementById("siteHeader").innerHTML.includes("login.html"));
      home.window.close();

      /* Create an account; data saved before accounts existed comes with it. */
      const { window, navigated, errors } = await loadPage(P("login.html"), seed(), { signedIn: false });
      const doc = window.document;
      t.check("with no accounts the login page opens on sign-up", !doc.getElementById("signupForm").hidden);
      doc.getElementById("signupName").value = "Ada";
      doc.getElementById("signupEmail").value = "Ada@Example.org";
      doc.getElementById("signupPassword").value = "short";
      doc.getElementById("signupConfirm").value = "short";
      doc.getElementById("signupForm").dispatchEvent(new window.Event("submit", { cancelable: true }));
      await wait(30);
      t.check("a short password is refused", !doc.getElementById("authError").hidden && navigated.length === 0);

      doc.getElementById("signupPassword").value = "correct horse";
      doc.getElementById("signupConfirm").value = "correct horse";
      doc.getElementById("signupForm").dispatchEvent(new window.Event("submit", { cancelable: true }));
      await wait(1500);
      t.check("signing up goes to the app", navigated[0] === "app.html", String(navigated) + errors.join(" | "));

      const accounts = JSON.parse(window.localStorage.getItem("happymoms.accounts"));
      const user = accounts.users[0];
      t.check("the account is saved with a normalized email", user && user.email === "ada@example.org");
      t.check("the password itself is never stored",
        !window.localStorage.getItem("happymoms.accounts").includes("correct horse") && /^[0-9a-f]{64}$/.test(user.hash));
      const adopted = JSON.parse(window.localStorage.getItem("happymoms.v1." + user.id));
      t.check("the first account adopts the data saved before accounts",
        adopted && Object.keys(adopted.checkins).length === 12 && !window.localStorage.getItem("happymoms.v1"));
      t.check("signing up starts a session", window.HM.auth.current() && window.HM.auth.current().id === user.id);
      t.check("one sign-up makes exactly one account", accounts.users.length === 1, String(accounts.users.length));

      /* Log out, then log back in, once wrongly and once properly. */
      window.HM.auth.logOut();
      t.check("logging out ends the session", window.HM.auth.current() === null);
      const wrong = await window.HM.auth.logIn({ email: "ada@example.org", password: "wrong password" })
        .then(() => false, (e) => /do not match/.test(e.message));
      t.check("a wrong password is refused", wrong && window.HM.auth.current() === null);
      const right = await window.HM.auth.logIn({ email: " ADA@example.org ", password: "correct horse" })
        .then(() => true, () => false);
      t.check("the right password logs in", right && window.HM.auth.current().id === user.id);
      const dupe = await window.HM.auth.signUp({ email: "ada@example.org", password: "another one" })
        .then(() => false, (e) => /already exists/.test(e.message));
      t.check("an email can only be registered once", dupe);
      t.check("only a page name is accepted as a return target",
        window.HM.auth.safeNext("https://evil.example/x.html") === "app.html" &&
        window.HM.auth.safeNext("summary.html") === "summary.html");

      t.check("deleting the account removes it and its data",
        window.HM.auth.deleteAccount() && !window.HM.auth.hasAccounts() &&
        !window.localStorage.getItem("happymoms.v1." + user.id));
      window.close();
    }

    {
      const { window } = await loadPage(P("profile.html"), seed());
      t.check("the profile shows who is signed in",
        window.document.getElementById("accountBlock").textContent.includes("test@example.org"));
      t.check("signed-in pages offer a log out",
        !!window.document.querySelector("#siteHeader [data-logout]"));
      window.close();
    }
  }
};
