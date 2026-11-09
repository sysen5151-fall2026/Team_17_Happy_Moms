# Route table

Lab manual Ch 6. Every entry point the product exposes, and the use case it serves.
A "route" here is a page URL: Happy Moms is a static multi-page site with no router and
no server, so the page is the entry point.

Use case IDs are from the Innoslate Use Case Diagram (UC.1–UC.13); action IDs (UC.1.n)
are the steps inside them. Function IDs are from the IDEF0 function hierarchy
(F.3.x). Requirement IDs follow `docs/traceability.md`.

**Base URL:** `https://sysen5151-fall2026.github.io/Team_17_Happy_Moms/`
Every link in the product is relative, because a GitHub Pages project site is served
from a sub-path (see prompt log E-004).

## The entry point for F.3.3

The function under review in this milestone is **F.3.3 Maintain Wellness History**. Its
entry point is the daily check-in:

| Route | Use case | Function reached | Module | Requirements |
| --- | --- | --- | --- | --- |
| [`html/checkin.html`](../html/checkin.html) | **UC.2** Expecting Mother Completes Daily Wellness Check-In (steps UC.1.9, UC.1.11, UC.1.30) | F.3.2 Capture Daily Wellness Data → **F.3.3 Maintain Wellness History** | `js/hm-checkin.js` → `js/hm-records.js` | StR1.1, StR2.1, WRS-1.1.1, WRS-1.1.4, WRS-1.2.1, WRS-1.2.2, WRS-1.4.1, WRS-1.4.2, WRS-1.4.3 |

Reading the row: the page is the only screen a mother uses to reach F.3.3. It performs
F.3.2 (collect the answers) and hands them to F.3.3 in one call,
`HM.records.maintainWellnessHistory({ dailyWellnessCheckinData })`. The page does not
decide the entry shape, does not write storage and does not judge what counts as high
risk; all three belong to C.3.3. `?date=YYYY-MM-DD` on the same route re-enters UC.2 for
a day missed within the last seven days.

F.3.3 has no route of its own, which is correct: it is an internal function with no
screen. Its outputs surface on the routes of the functions that consume them —
Updated Wellness History on `html/trends.html` (F.3.4), Wellness Session Record on
`html/summary.html` (F.3.5), High-Risk Alert in place on `html/checkin.html` and on
`html/crisis.html`.

## All routes

| Route | Use case / action | Function | Module | Notes |
| --- | --- | --- | --- | --- |
| `index.html` | none | none | — | Project site landing page, outside the SoI |
| `html/login.html` | UC.1; UC.1.1 | F.3.1.1 Authenticate User | `js/hm-login.js`, `js/hm-auth.js` | Local accounts only; decides which storage key is in use |
| `html/app.html` | UC.2, UC.3 entry point; UC.1.1, UC.1.2 | F.3 Provide Maternal Wellness Tracking | `js/hm-app.js` | Today dashboard; the hub every other route is reached from |
| `html/profile.html` | UC.1; UC.1.3, UC.1.4, UC.1.31 | F.3.1.2 Register Wellness Profile | `js/hm-profile.js` | Due date, last visit, provider; export, import, delete all data (StR5.2) |
| `html/quiz.html` | UC.1; UC.1.3 | F.3.1.2 Register Wellness Profile | `js/quiz.js` | Six-question baseline snapshot |
| **`html/checkin.html`** | **UC.2; UC.1.9, UC.1.11, UC.1.30** | **F.3.2 → F.3.3** | **`js/hm-checkin.js` → `js/hm-records.js`** | **The F.3.3 entry point, above** |
| `html/mood-check.html` | UC.7 | F.3.3.3 Screen for High Risk Alerts (**not wired**, gap G-12) | `js/hm-moodcheck.js`, `js/hm-screening.js` | EPDS mood check. It writes `screenings[]` itself and routes item 10 through `HM.screening.needsUrgentHelp()`, not through F.3.3.3. F.3.3.3 accepts `selfHarmReported` for this, but nothing calls it yet |
| `html/trends.html` | UC.3 | F.3.4 Identify Wellness Trends | `js/hm-trends.js`, `js/hm-insights.js`, `js/hm-charts.js` | Consumes Updated Wellness History |
| `html/summary.html` | UC.8, UC.9; UC.1.22–UC.1.26 | F.3.5 Provide Wellness Information | `js/hm-summary.js`, `js/hm-external-ai-service.js` (stub) | Consumes Wellness Session Record; UC-P1 (`walking-skeleton.md`) |
| `html/assistant.html` | UC.4; UC.1.14–UC.1.21 | F.3.5 Provide Wellness Information | `js/hm-assistant.js` | Retrieval over `HM.content.kb`, no model call (gap G-4) |
| `html/tips.html` | UC.5; UC.1.10, UC.1.17 | F.3.5 Provide Wellness Information | `js/hm-tips.js` | `?topic=` selects a topic |
| `html/puzzle.html` | UC.6; UC.1.12, UC.1.13 | F.3.6 Provide Engagement Activities | `js/hm-puzzle.js` | StR1.2 |
| `html/crisis.html` | UC.13; UC.1.27–UC.1.29 | F.7 Provide Emergency Crisis Support Services | `js/hm-chrome.js` (header link on every page) | StR2.2: reachable in one action from any screen |
| `html/about.html`, `html/contact.html`, `404.html` | none | none | — | Project site presentation, outside the SoI |

## Routes the model has and the product does not

| Use case | Why there is no route |
| --- | --- |
| UC.10, UC.11 Support person reviews / provides information | No partner access in this build (README "Known limits") |
| UC.12 Prenatal care coordinator supports onboarding | Off the primary path |

## What this table is checked against

`tests/pages.test.js` discovers every page in the repository, renders it in jsdom, and
fails on a link that does not resolve from the page it sits on — so a route added here
without a page, or a page added without a row, shows up as a mismatch between this table
and that suite.
