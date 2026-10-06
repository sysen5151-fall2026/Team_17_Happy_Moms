# Walking skeleton — UC-P1

**Use case:** UC-P1 Expecting Mother Prepares and Shares an Appointment Summary
(Canvas submission §2.3; Innoslate sequence view, Figure 2.2).
**Why this one:** it delivers the system's main value (quick check-ins turned into a
concise summary the mother can share) and traces to needs N-1, N-3, N-4, N-7 and N-9.
**Live build:** https://sysen5151-fall2026.github.io/Team_17_Happy_Moms/

This file is the sequence diagram transcribed as a numbered list of calls, as the lab
manual (§2.5) asks for. Participant names are the asset names from the Innoslate model.

## Participants

| Model asset | ID | Where it lives in the product | Real or stub |
| --- | --- | --- | --- |
| Expecting Mother | C.1 | The person using the browser | Real (outside the SoI) |
| Happy Moms System, front end | C.3 | One HTML page per screen (`app.html`, `profile.html`, `quiz.html`, `checkin.html`, `summary.html`) | Real |
| Happy Moms System, application services | C.3 | `js/hm-*.js` modules on the shared `HM` namespace | Real |
| Happy Moms System, user data store | C.3 | `HM.store` in `js/hm-core.js`, one browser `localStorage` key `happymoms.v1` | Real, substituted: browser storage stands in for the modeled database (no server at this stage) |
| External AI Service | C.6 | `js/hm-external-ai-service.js` | **Stub**: returns a fixed response shape, no model call |
| OB/GYN Provider | C.4 | Receives a printout, PDF or text the mother hands over herself | External, outside the boundary; nothing to build |

## Call list

| # | From → To | Message (model) | Action | Code | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Mother → System | Initiates the application | UC.1.1 | `index.html` "Open the app" → `app.html` (`js/hm-app.js`) | Real |
| 2 | System → Mother | Requests baseline wellness information | UC.1.2 | `hm-app.js` `renderSetupBanner()` prompts "Add your due date" when no profile exists | Real |
| 3 | Mother → System | Provides baseline wellness (gestational week, baseline notes) | UC.1.3 | `profile.html` due date and last-visit fields (`js/hm-profile.js`); `quiz.html` six-question baseline (`js/quiz.js`). Gestational week is derived from the due date by `HM.gestation.of()` | Real |
| 4 | System → data store | Stores the user profile | UC.1.4 | `HM.store.update()` writes `profile{}` (`js/hm-core.js`) | Real |
| 5 | Mother → System | Completes a daily wellness check-in | UC.1.9 | `checkin.html`, `js/hm-checkin.js`, seven-step `FLOW` | Real |
| 6 | System → data store | Records wellness information in the longitudinal record | UC.1.11 | `hm-checkin.js` `save()` writes `checkins[date]` | Real |
| 7 | Mother | Repeats 5–6 between visits | UC.1.9, UC.1.11 | Real use, or for the demo `HM.sample.load()` seeds 21 days of entries (`js/hm-sample.js`) | Test-data stub for the demo |
| 8 | Mother → System | Requests a summary for the period since her last visit | UC.1.22 | `summary.html`; `hm-summary.js` `resolveRange("sinceVisit")` starts at `profile.lastVisit` (28 days if not set) | Real |
| 9 | System → External AI Service | Sends the logged entries | UC.1.23 | `hm-summary.js` `requestSummary()` → `HM.externalAIService.generateAppointmentSummary({ interval, entries })` | Real call to a stub |
| 10 | External AI Service → System | Generates the appointment summary | UC.1.24 | `js/hm-external-ai-service.js` returns `{ status: "stub", summaryText: null }` | **Stub** |
| 11 | System → Mother | Presents a one-page summary labeled patient-generated and non-diagnostic | new action (to add to the model) | With no generated text, `buildText()` / `renderSheet()` compose it from the entries; `@media print` in `css/style.css` keeps it to one page; footer reads "Patient-reported wellness log … Not a diagnosis" | Real (fallback composer) |
| 12 | Mother | Reviews and explicitly authorizes sharing | UC.1.25 | "Copy as text", "Download .txt", "Print or save as PDF", "Share" (`wireActions()`). Nothing leaves the device without one of these | Real |
| 13 | Mother → OB/GYN Provider | Provider receives the shared summary | UC.1.26 | Outside the SoI. No EHR link (StR6.1) | External |

## How to run the path

1. Open the live build (or `python -m http.server 8000` and go to `http://localhost:8000`).
2. **Open the app** → **Profile**: set a due date and a last-visit date → **Save**. Optionally take the baseline in `quiz.html`.
3. **Check in**: tap through the seven steps.
4. To simulate weeks of entries, use **Load sample data** (Today or Visit notes).
5. **Visit notes** → **Since last visit** → the one-page sheet appears.
6. **Print or save as PDF** (or **Download .txt**): this is what reaches the provider.

Automated: `npm test`. The checks named `UC-P1 step 9`, `UC-P1 step 10` and
`UC-P1 step 11 / StR6.2` in `tests/pages.test.js` confirm that the summary request passes
through the External AI Service stub and comes back labeled.

## Stubbed on purpose, and why (in model terms)

- **External AI Service (C.6).** It sits outside the SoI boundary. The team does not
  build or train it, and the model contract (prompt, response schema, guardrails) is not
  specified yet. The stub returns no text, so the system takes the fallback path, which
  is the same behavior the contract will require when the real service fails.
- **Data store.** The model's database is realized as browser storage. This keeps every
  record on the mother's device, which supports StR5.1 (no disclosure without her
  action) and StR6.1 (no EHR integration). A server-side store is a later architecture
  decision.
- **Repeated check-ins (step 7).** Sample data stands in for three weeks of real use so
  the full path can be shown in one minute.

## Live demo script (about 2 minutes 20 seconds)

1. **SoI (20 s).** "Happy Moms turns 15-second daily check-ins into a one-page,
   non-diagnostic summary that an expecting mother chooses to share with her OB/GYN."
2. **Skeleton (1 min).** Profile → check-in → load sample data → Visit notes → Since last
   visit → Print or save as PDF. Point at the stub: open `js/hm-external-ai-service.js`.
3. **Trace one need (1 min).** PN-3 ("walk into my appointment with clear notes") →
   N-3 → StR4.1 ("generate, on request, an appointment summary of the entries logged
   since the user's last visit") → UC-P1 step 8 / UC.1.22 → `resolveRange("sinceVisit")`
   in `js/hm-summary.js`, which reads `profile.lastVisit`.
