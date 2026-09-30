# Happy Moms

A pregnancy wellness tracking and appointment preparation web app, built by Team New
Edition (Team 17) for SYSEN 5151 at Cornell.

Quick daily check-ins build a longitudinal wellness record. The app turns that record
into trends and a one-page summary the mother can choose to share with her OB/GYN. A
guardrailed assistant answers everyday questions from vetted content, a daily word
puzzle keeps the habit going, and anything urgent is routed to a provider or a crisis
line rather than answered.

Static site, no build step, no server, no accounts. It runs on GitHub Pages free tier
and stores everything in the visitor's own browser.

---

## Contents

- [Running it](#running-it)
- [Deploying to GitHub Pages](#deploying-to-github-pages)
- [What is in the app](#what-is-in-the-app)
- [Project structure](#project-structure)
- [How the pieces fit](#how-the-pieces-fit)
- [The data model](#the-data-model)
- [Maintaining the content](#maintaining-the-content)
- [The safety rules](#the-safety-rules)
- [Tests](#tests)
- [Known limits](#known-limits)
- [Team](#team)

---

## Running it

Open `index.html` in a browser. That is the whole setup: no install, no compile step.

For a closer match to how it behaves when deployed, serve the folder over HTTP:

```
python -m http.server 8000      # then open http://localhost:8000
```

To run the tests you need Node and one dev dependency:

```
npm install      # jsdom, used only by the page test suite
npm test
```

## Deploying to GitHub Pages

1. Push to GitHub.
2. Repository **Settings** → **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and
   the `/ (root)` folder, then **Save**.
4. The site appears at `https://<user>.github.io/<repo>/` within a minute or two.

`.nojekyll` is committed so Pages serves the files as-is. `404.html` is picked up
automatically as the custom not-found page. Nothing else is required, and there is no
workflow to maintain.

After a first deploy, update `repoUrl` and `contactEmail` in `js/hm-config.js` so the
contact page and footer point somewhere real.

## What is in the app

| Page | File | What it does |
| --- | --- | --- |
| Home | `index.html` | What the project is, the research behind it, where the boundary sits |
| Today | `app.html` | Dashboard: current week, whether today is logged, recent observations |
| Daily check-in | `checkin.html` | Seven-step micro-survey, about thirty seconds |
| Trends | `trends.html` | Charts, continuity of capture, weekly averages, observations |
| Visit notes | `summary.html` | One-page provider summary, copy / download / print |
| Assistant | `assistant.html` | Guardrailed Q&A over vetted content |
| Daily puzzle | `puzzle.html` | Five-letter pregnancy word game, shareable result |
| Wellness tips | `tips.html` | 45 sourced cards, filterable and saveable |
| Baseline | `quiz.html` | One-time six-question baseline profile |
| Profile and data | `profile.html` | Due date, provider, theme, export / import / delete |
| Urgent help | `crisis.html` | Warning signs and crisis lines, written in plain HTML |
| About | `about.html` | Mission, scope boundary, stakeholders, roadmap |
| Contact | `contact.html` | Feedback and issue reporting |

## Project structure

```
├── *.html                 one file per page, each a thin shell
├── css/
│   ├── style.css          design tokens, both themes, page chrome, charts
│   └── app.css            app components: tiles, check-in, chat, puzzle, sheet
├── js/
│   ├── hm-config.js       site config: contact, repo, sources, crisis lines
│   ├── hm-core.js         storage, dates, gestation maths, stats, DOM helpers
│   ├── hm-chrome.js       header, nav, footer, theme, rendered on every page
│   ├── hm-content.js      ALL wellness content lives here
│   ├── hm-charts.js       hand-authored SVG charts, no library
│   ├── hm-insights.js     trends, coverage, observations
│   ├── hm-sample.js       demo data for walkthroughs
│   ├── hm-app.js          Today
│   ├── hm-checkin.js      daily check-in flow
│   ├── hm-trends.js       trends page
│   ├── hm-summary.js      visit notes and text export
│   ├── hm-assistant.js    red-flag screening and retrieval
│   ├── hm-puzzle.js       word game
│   ├── hm-profile.js      profile, settings, data controls
│   ├── hm-tips.js         tip library rendering
│   ├── quiz.js            baseline questionnaire
│   └── main.js            public-page behaviour
├── tests/                 node test suites, see below
├── assets/                favicon and app icons
├── manifest.webmanifest   installable web app metadata
└── .nojekyll              tells GitHub Pages to serve files untouched
```

## How the pieces fit

Every page is a thin shell. It declares two attributes on `<body>`, drops in two empty
containers, and loads the modules it needs:

```html
<body data-shell="app" data-page="trends">
  <header id="siteHeader"></header>
  <main class="app-main"> ... mount points ... </main>
  <footer id="siteFooter"></footer>
```

`hm-chrome.js` fills the header and footer, so navigation is edited in exactly one
place rather than in thirteen HTML files. `data-shell` picks the public or in-app
navigation; `data-page` marks the current link.

Script order matters, since these are plain scripts sharing one `HM` namespace rather
than modules. In `<head>`: config, core, chrome. At the end of `<body>`: content,
charts, insights, sample, then the page's own module.

Each page module follows the same shape: find its mount point, return quietly if it is
not there, render from storage, re-render after any change.

## The data model

Everything lives under one `localStorage` key, `happymoms.v1`:

```js
{
  schema: 1,
  profile:   { name, dueDate, birthDate, postpartum, providerName,
               lastVisit, nextAppointment, supportPerson, baseline },
  checkins:  { "2026-09-29": { mood, energy, sleepHours, sleepQuality, nausea,
                               water, activity, symptoms[], urgent[], note } },
  questions: [ { id, text, createdAt, asked } ],
  puzzle:    { "2026-09-29": { word, guesses[], status } },
  favorites: [ tipId ],
  settings:  { theme, sampleData }
}
```

Read and write through `HM.store`, never `localStorage` directly:

```js
const state = HM.store.load();
HM.store.update((s) => { s.profile.name = "Ada"; });
```

`HM.store.migrate()` merges saved data onto a fresh blank state, so **adding a field is
safe**: give it a default in `blankState()` in `hm-core.js` and existing saved data
picks it up on next load. Removing or renaming a field is not automatic; bump `schema`
and handle it in `migrate()` if that day comes.

Gestational age is derived, never stored. `HM.gestation.of(profile)` counts back from
the due date on the standard convention that the due date is 40 weeks 0 days.

## Maintaining the content

All wellness content is data in `js/hm-content.js`. None of it requires touching
markup or CSS.

**Add a tip card** — append to `tips`. It appears on the tips page, in the daily card
rotation, and in symptom matching:

```js
{
  id: "t-newthing",            // unique, prefix t-
  topic: "rest",               // must match an id in `topics`
  title: "Short imperative",
  body: "Two or three sentences of practical guidance.",
  source: "acog",              // key from HM.config.sources
  forSymptoms: ["insomnia"]    // optional: surfaces after matching check-ins
}
```

**Add an assistant answer** — append to `kb`. Keywords are matched against the
question; multi-word phrases score higher than single words:

```js
{
  id: "kb-newtopic",
  topic: "comfort",
  title: "What the answer is about",
  keywords: ["phrase people type", "another phrase", "word"],
  answer: "25 to 130 words. General practice only. Send anything specific to the provider.",
  source: "nichd",
  related: ["t-newthing"]      // optional tip ids
}
```

**Add a puzzle word** — append to `puzzleWords`. Five letters, uppercase, with a note
that teaches something:

```js
{ word: "NURSE", note: "One line worth knowing, shown when the puzzle is solved." }
```

**Change a warning sign** — edit `urgentSigns` (the check-in list) and `redFlags` (the
phrases the assistant screens for). Keep them in step: a sign people can log should
also be a phrase the assistant intercepts.

**Change the check-in questions** — edit `checkin`. Changing an existing question's
`id` orphans previously logged data for it, so prefer adding over renaming. If you add
a numeric question, add it to `metrics` in `hm-insights.js` too, and it will chart and
summarise itself.

Run `npm test` after any content edit. The content suite catches unknown source keys,
duplicate ids, wrong-length puzzle words, broken tip references, and language that
crosses into diagnosing or prescribing.

## The safety rules

These are the constraints the mission analysis set, and the code enforces them:

1. **No diagnosis, no prescribing, no dosing.** Content describes general practice.
   Anything specific goes to the provider. The medication answer deliberately refuses
   to clear any drug.
2. **Warning signs are screened first.** `hm-assistant.js` checks every question
   against `redFlags` *before* the knowledge base is consulted. A hit routes to urgent
   help and no answer is given, even if the question also mentions an ordinary topic.
3. **Nothing is generated.** Answers are written in advance and retrieved. The app
   cannot invent content or drift off source.
4. **Every claim is attributed.** Tips and answers name a source organization, and the
   interface links it.
5. **Trends describe, they do not interpret.** `hm-insights.js` reports what was
   logged. It never labels a pattern as a condition.
6. **The user controls her data.** No transmission, no account, no health-record
   integration. Export and delete are one click each.
7. **`crisis.html` is plain HTML.** It must keep working if scripts fail, so do not
   make its phone numbers depend on JavaScript.

## Tests

```
npm test                    # everything
node tests/run.js content   # one suite
node tests/run.js --quiet   # failures only
HM_TRACE=1 node tests/run.js   # stack traces
```

| Suite | Covers |
| --- | --- |
| `core` | gestation maths, date helpers, streaks, storage migration |
| `content` | ids, sources, references, puzzle words, non-prescriptive language |
| `assistant` | 21 escalation cases, 20 ordinary questions, retrieval routing |
| `insights` | coverage, series, deltas, observations, chart edge cases, puzzle scoring |
| `pages` | loads all 14 pages in jsdom, checks rendering, clicks through a check-in |

The logic suites need nothing installed. The page suite needs jsdom and is skipped with
a note when it is missing.

## Known limits

Consequences of running with no backend, all of them deliberate:

- **No sync.** Data lives in one browser on one device. Clearing site data clears the
  history, which is why export exists.
- **No partner access.** Sharing means copying, printing, or downloading something
  yourself. A partner view needs accounts and a server.
- **No reminders.** Push notifications need a service worker and a push service.
- **No live language model.** An API key cannot be shipped in a static site. The
  assistant retrieves pre-written answers instead, which is also the safer default.
- **No offline mode.** No service worker is registered, so the app needs a connection
  to load. Once loaded, everything runs locally.

## Team

SYSEN 5151, Foundations of Systems Engineering · Cornell University, College of
Engineering · Fall 2026 · Professor Clifford Whitcomb

Team New Edition (Team 17). Confirm your GitHub access by adding your name here:

- Max Starvaggi

---

> **Not medical advice.** Happy Moms provides general wellness information and
> self-tracking tools. Content is paraphrased from public guidance by ACOG, the NIH,
> the FDA, and the CDC, and is pending clinical review. It does not diagnose, treat, or
> prescribe, and it is not a substitute for care from a licensed provider.
