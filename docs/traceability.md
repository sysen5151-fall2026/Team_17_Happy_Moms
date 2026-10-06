# Model-to-product traceability (Milestone 1)

Every user-facing capability in the repository, traced to the Innoslate model: use case,
stakeholder requirement, need. Use cases are numbered as in the Use Case Diagram (UC.1–UC.13);
requirements and needs follow the Canvas submission (§3.5, §4.1).

**Status key:** Traced = has a modeled counterpart. Gap = the code and model disagree,
or the code has no counterpart. Each gap has an action at the bottom.

## Capabilities

| # | Capability | Code | Use case / action | Requirement | Need | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Baseline profile (due date, last visit, provider) | `profile.html`, `js/hm-profile.js` | UC.1; UC.1.1–UC.1.4 | supports StR4.1 (sets the "since last visit" interval) | N-3 | Traced |
| 2 | Baseline wellness snapshot | `quiz.html`, `js/quiz.js` | UC.1; UC.1.3 | none | N-1 | Traced to UC; no requirement |
| 3 | Daily check-in | `checkin.html`, `js/hm-checkin.js` | UC.2; UC.1.9, UC.1.11 | StR1.1 | N-1 | Gap G-1 (timing) |
| 4 | Today dashboard | `app.html`, `js/hm-app.js` | UC.2, UC.3 entry point | StR1.1, StR1.2 | N-1, N-5 | Traced |
| 5 | Urgent signs in the check-in → urgent help | `hm-checkin.js` `renderUrgentBlock()` | UC.13; UC.1.27–UC.1.29 | StR2.1 | N-6 | Traced |
| 6 | Urgent help page, linked from every page header | `crisis.html`, `js/hm-chrome.js` | UC.13 | StR2.2 (1 action from any screen) | N-6 | Traced |
| 7 | Trends and charts | `trends.html`, `js/hm-trends.js`, `js/hm-insights.js`, `js/hm-charts.js` | UC.3 | none directly | N-3 | Gap G-2 |
| 8 | Visit notes (appointment summary) | `summary.html`, `js/hm-summary.js` | UC.8, UC.9; UC.1.22–UC.1.26 | StR4.1, StR4.2, StR4.3, StR6.2 | N-3, N-7, N-9 | Traced (UC-P1, see `walking-skeleton.md`) |
| 9 | Summary generation by the External AI Service | `js/hm-external-ai-service.js` (stub) | UC.1.23, UC.1.24 | StR4.1, StR4.2 | N-3, N-7 | Traced; stubbed |
| 10 | Copy / download / print / share the summary | `hm-summary.js` `wireActions()` | UC.9; UC.1.25 | StR5.1, StR6.1 | N-4, N-9 | Traced |
| 11 | "Questions I want to ask" list on the summary | `hm-summary.js` `renderQuestions()` | none | none | closest: PN-3 / N-3 | Gap G-3 (orphan) |
| 12 | Guardrailed assistant | `assistant.html`, `js/hm-assistant.js`, `kb` and `redFlags` in `js/hm-content.js` | UC.4 | StR3.1, StR3.2, StR3.3; red-flag routing StR2.1 | N-2, N-8, N-6 | Gap G-4 (no AI) |
| 13 | Wellness tip cards | `tips.html`, `js/hm-tips.js` | UC.5 | StR3.1, StR1.2 | N-2, N-5 | Traced |
| 14 | Daily word puzzle | `puzzle.html`, `js/hm-puzzle.js` | UC.6 | StR1.2 | N-5 | Traced |
| 15 | Share puzzle result (score grid only, no health data) | `hm-puzzle.js` `shareText()` | none (closest UC.10) | none | none | Gap G-3 (orphan) |
| 16 | Mental-wellness signs (self-harm, cannot cope) | `urgentSigns` and `redFlags` in `hm-content.js` | UC.7 (partly) | StR2.1 | N-6 | Traced; UC.7 screening not built |
| 17 | Export, import, delete all data | `hm-profile.js` `exportData()`, `importData()` | none | StR5.2 | N-4 | Traced to requirement |
| 18 | Sample data | `js/hm-sample.js` | UC-P1 step 7 (demo) | none | none | Test-data stub for the demo |
| 19 | Home, About, Contact, 404, theme toggle, install manifest | `index.html`, `about.html`, `contact.html`, `404.html`, `hm-chrome.js`, `manifest.webmanifest` | none | none | none | Project-site presentation, not SoI functions |

**Modeled but not built (deliberate, off the primary path):** UC.10 and UC.11 support-person
review and input, UC.12 coordinator onboarding (README "Known limits: no partner access").

## Gaps and actions

| ID | Gap | Action | Owner | Due |
| --- | --- | --- | --- | --- |
| G-1 | StR1.1 says a check-in takes 15 s or less; `index.html` and `puzzle.html` say "about thirty seconds" | Time five check-ins; fix the copy, or revise StR1.1 with rationale | | Oct 7 (before class) |
| G-2 | UC.3 Review Trends has no stakeholder requirement | Add a StR under N-3 (or trace UC.3 to StR4.1 as a supporting function) in Innoslate | | Oct 18 |
| G-3 | Two capabilities have no model counterpart: the questions list and puzzle-result sharing | Add a requirement for each under N-3 / N-5, or remove them | | Oct 18 |
| G-4 | Model: C.6 runs the assistant. Product: pre-written answers, no AI call | Record as an architecture decision (`docs/decisions/0002-assistant-retrieval.md`); either add a C.6 stub to the assistant path or update the model | | Oct 18 |
| G-5 | StR6.2 wording is "patient-generated"; the summary says "Patient-reported" | Align the label text or the requirement | | Oct 7 |
| G-6 | Lab §1.4/§3.5 files missing: `SPEC.md`, `docs/context.md`, `docs/prompt-log.md`, `docs/environment.md`, ADR 0001; tests are not named for need IDs | Add from the Canvas submission (needs, StRs, acceptance criteria); rename tests to carry need IDs | | Oct 18 |
| G-7 | Directories are named for technology (`js/`, `css/`), not boundary elements | Revisit at the Chapter 6 audit | | Milestone 2 |
| G-8 | README does not open with the OpsCon narrative copied from the model (lab §1.4) | Paste the Canvas §2.1 OpsCon text as the README's first section | | Oct 7 |
