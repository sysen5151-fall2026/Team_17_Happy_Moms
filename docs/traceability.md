# Model-to-product traceability (Milestone 1)

Every user-facing capability in the repository, traced to the Innoslate model: use case,
stakeholder requirement, need. Use cases are numbered as in the Use Case Diagram (UC.1–UC.13);
requirements and needs follow the Canvas submission (§3.5, §4.1).

**Status key:** Traced = has a modeled counterpart. Gap = the code and model disagree,
or the code has no counterpart. Each gap has an action at the bottom.

## Capabilities

| # | Capability | Code | Use case / action | Requirement | Need | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Baseline profile (due date, last visit, provider) | `html/profile.html`, `js/hm-profile.js` | UC.1; UC.1.1–UC.1.4 | supports StR4.1 (sets the "since last visit" interval) | N-3 | Traced |
| 2 | Baseline wellness snapshot | `html/quiz.html`, `js/quiz.js` | UC.1; UC.1.3 | none | N-1 | Traced to UC; no requirement |
| 3 | Daily check-in | `html/checkin.html`, `js/hm-checkin.js` | UC.2; UC.1.9, UC.1.11 | StR1.1 | N-1 | Gap G-1 (timing) |
| 4 | Today dashboard | `html/app.html`, `js/hm-app.js` | UC.2, UC.3 entry point | StR1.1, StR1.2 | N-1, N-5 | Traced |
| 5 | Urgent signs in the check-in → urgent help | `hm-checkin.js` `renderUrgentBlock()` | UC.13; UC.1.27–UC.1.29 | StR2.1 | N-6 | Traced |
| 6 | Urgent help page, linked from every page header | `html/crisis.html`, `js/hm-chrome.js` | UC.13 | StR2.2 (1 action from any screen) | N-6 | Traced |
| 7 | Trends and charts | `html/trends.html`, `js/hm-trends.js`, `js/hm-insights.js`, `js/hm-charts.js` | UC.3 | none directly | N-3 | Gap G-2 |
| 8 | Visit notes (appointment summary) | `html/summary.html`, `js/hm-summary.js` | UC.8, UC.9; UC.1.22–UC.1.26 | StR4.1, StR4.2, StR4.3, StR6.2 | N-3, N-7, N-9 | Traced (UC-P1, see `walking-skeleton.md`) |
| 9 | Summary generation by the External AI Service | `js/hm-external-ai-service.js` (stub) | UC.1.23, UC.1.24 | StR4.1, StR4.2 | N-3, N-7 | Traced; stubbed |
| 10 | Copy / download / print / share the summary | `hm-summary.js` `wireActions()` | UC.9; UC.1.25 | StR5.1, StR6.1 | N-4, N-9 | Traced |
| 11 | "Questions I want to ask" list on the summary | `hm-summary.js` `renderQuestions()` | none | none | closest: PN-3 / N-3 | Gap G-3 (orphan) |
| 12 | Guardrailed assistant | `html/assistant.html`, `js/hm-assistant.js`, `kb` and `redFlags` in `js/hm-content.js` | UC.4 | StR3.1, StR3.2, StR3.3; red-flag routing StR2.1 | N-2, N-8, N-6 | Gap G-4 (no AI) |
| 13 | Wellness tip cards | `html/tips.html`, `js/hm-tips.js` | UC.5 | StR3.1, StR1.2 | N-2, N-5 | Traced |
| 14 | Daily word puzzle | `html/puzzle.html`, `js/hm-puzzle.js` | UC.6 | StR1.2 | N-5 | Traced |
| 15 | Share puzzle result (score grid only, no health data) | `hm-puzzle.js` `shareText()` | none (closest UC.10) | none | none | Gap G-3 (orphan) |
| 16 | Mental-wellness signs (self-harm, cannot cope) | `urgentSigns` and `redFlags` in `hm-content.js` | UC.7 (partly) | StR2.1 | N-6 | Traced; UC.7 screening not built |
| 17 | Export, import, delete all data | `hm-profile.js` `exportData()`, `importData()` | none | StR5.2 | N-4 | Traced to requirement |
| 18 | Sample data | `js/hm-sample.js` | UC-P1 step 7 (demo) | none | none | Test-data stub for the demo |
| 19 | Home, About, Contact, 404, theme toggle, install manifest | `index.html`, `html/about.html`, `html/contact.html`, `404.html`, `hm-chrome.js`, `manifest.webmanifest` | none | none | none | Project-site presentation, not SoI functions |

**Modeled but not built (deliberate, off the primary path):** UC.10 and UC.11 support-person
review and input, UC.12 coordinator onboarding (README "Known limits: no partner access").

## F.3.3 Maintain Wellness History — function to code (Milestone 2)

The function hierarchy row by row, for the one function taken to code this milestone.
Entry point and use case: `docs/route-table.md`. Interface of the internal flows:
`contracts/api-v1.yaml`. Tests: `tests/test_functional_requirements.py`, run in CI by
`.github/workflows/tests.yml`.

**Mechanism:** C.3.3 Wellness Records Subsystem, realized by `js/hm-records.js`. Its three
children (C.3.3.1 Check-In Ingestion Module, C.3.3.2 Data Storage Module, C.3.3.3 High Risk
Screening Module) are the three exported functions of that module, not three files: the
subsystem is one unit of code because the three steps always run together and share no
state with anything else.

**On requirement IDs.** Innoslate numbers requirements per subsystem, so the bare numbers
collide: "1.1.1" is *Accept AI Wellness Tip* for the Happy Moms System and for the Wellness
Information Subsystem, and *Accept Daily Wellness Checkin Data* for the Wellness Records
Subsystem. Code, tests and contract therefore qualify every ID with its subsystem. The
prefixes: **WRS** = Wellness Records Subsystem (C.3.3), **WIS** = Wellness Information
Subsystem (C.3.5), **HMS** = Happy Moms System (C.3). Recorded as gap G-9.

### Functions

| Function ID | Function | Mechanism | Module path | Requirement ID | Test name |
| --- | --- | --- | --- | --- | --- |
| F.3.3 | Maintain Wellness History | C.3.3 | `js/hm-records.js` → `maintainWellnessHistory()` | WRS-1.1.1, WRS-1.1.2, WRS-1.1.3, WRS-1.1.4, WRS-1.1.5, WRS-1.2.1, WRS-1.2.2 | the `test_wrs_1_1_*` and `test_wrs_1_2_*` tests, one per requirement; see the ICOM table below |
| F.3.3.1 | Ingest Check-In Data | C.3.3.1 | `js/hm-records.js` → `ingestCheckInData()` | WRS-1.4.1 | `test_wrs_1_4_1_ingest_check_in_data`, `test_wrs_1_4_1_screening_payload_carries_only_what_screening_needs` |
| F.3.3.2 | Persist Session Record | C.3.3.2 | `js/hm-records.js` → `persistSessionRecord()` (storage: `HM.store` in `js/hm-core.js`) | WRS-1.4.2 | `test_wrs_1_4_2_persist_session_record`, `test_wrs_1_4_2_re_logging_a_day_replaces_that_day_only` |
| F.3.3.3 | Screen for High Risk Alerts | C.3.3.3 | `js/hm-records.js` → `screenForHighRiskAlerts()` (criteria: `urgentSigns` in `js/hm-content.js`) | WRS-1.4.3 | `test_wrs_1_4_3_screen_for_high_risk_alerts`, `test_wrs_1_4_3_self_harm_from_the_mood_check_raises_an_alert`, `test_wrs_1_4_3_criteria_come_from_the_approved_sign_list` |

### ICOMs

Every flow on the F.3.3 IDEF0 diagram, as a named argument or a returned key. The two
internal flows have an operation each in `contracts/api-v1.yaml`.

| ICOM | Flow | Source / destination | In code | Requirement ID | Test name |
| --- | --- | --- | --- | --- | --- |
| I | Daily Wellness Checkin Data | C.1 Expecting Mother, via F.3.2 | `dailyWellnessCheckinData` argument | WRS-1.1.1 | `test_wrs_1_1_1_accept_daily_wellness_checkin_data`, `test_wrs_1_1_1_rejects_fields_that_are_not_answers` |
| I | Recorded Wellness Entry | C.3.2 Daily Check-In Subsystem | `recordedWellnessEntry` argument | WRS-1.1.2 | `test_wrs_1_1_2_accept_recorded_wellness_entry` |
| I | User Defined Custom Info | C.6 External AI Service | `userDefinedCustomInfo` argument → `entry.custom` | WRS-1.1.4 | `test_wrs_1_1_4_accept_user_defined_custom_info` |
| I | Wellness Session Record | C.3.5 Wellness Information Subsystem | `wellnessSessionRecord` argument | WRS-1.1.5, WIS-1.2.5 | `test_wrs_1_1_5_accept_wellness_session_record` |
| **C** | Summary Prompt | C.1 Expecting Mother | `summaryPrompt` argument on F.3.3.2; governs the interval, is not stored | WRS-1.1.3 | `test_wrs_1_1_3_accept_summary_prompt`, `test_wrs_1_1_3_summary_prompt_is_optional` |
| **M** | C.3.3 Wellness Records Subsystem | — | the module itself, not an argument | — | every test in the file loads and calls it |
| O | Recorded Wellness Entry | to storage and to F.3.3.2 | returned `recordedWellnessEntry` | WRS-1.4.1 | `test_wrs_1_4_1_ingest_check_in_data` |
| O | Updated Wellness History | C.3.4 Trend Analysis Subsystem | returned `updatedWellnessHistory` | WRS-1.2.2 | `test_wrs_1_2_2_provide_updated_wellness_history` |
| O | Wellness Session Record | C.3.5 Wellness Information Subsystem | returned `wellnessSessionRecord` | WRS-1.1.3 | `test_wrs_1_1_3_accept_summary_prompt` |
| O | High-Risk Alert | C.1 Expecting Mother | returned `highRiskAlert`, `null` when clear | WRS-1.2.1, StR2.1 | `test_wrs_1_2_1_provide_high_risk_alert`, `test_wrs_1_2_1_no_alert_without_a_high_risk_sign`, `test_str2_1_high_risk_crisis_display` |
| internal | Recorded Wellness Entry | F.3.3.1 → F.3.3.2 | `persistRecordedWellnessEntry` in `contracts/api-v1.yaml` | WRS-1.4.2 | `test_wrs_1_4_2_persist_session_record` |
| internal | Screening Entry Payload | F.3.3.1 → F.3.3.3 | `screenEntryPayload` in `contracts/api-v1.yaml` | WRS-1.4.3 | `test_wrs_1_4_1_screening_payload_carries_only_what_screening_needs` |

### What changed in the code for this trace

- **New** `js/hm-records.js`: C.3.3, with F.3.3 and its three children as four functions whose
  signatures are their ICOMs. Loaded by `html/checkin.html`.
- **Changed** `js/hm-checkin.js`: `save()` no longer writes `checkins[date]` itself and
  `showDone()` no longer decides whether a day is urgent. Both now come from the one
  `maintainWellnessHistory()` call. The page performs F.3.2 only.
- **Changed** `tests/harness.js`: `hm-records` added to the module load order.
- **New** `tests/hm-records-bridge.js`: lets the Python requirement tests drive the real
  browser module, so there is one implementation of F.3.3 and not a Python copy of it.
- Behavior is unchanged: `npm test` is 430 passed, 0 failed before and after.
  `tests/test_functional_requirements.py` is 23 passed.

## Gaps and actions

| ID | Gap | Action | Owner | Due |
| --- | --- | --- | --- | --- |
| G-1 | StR1.1 says a check-in takes 15 s or less; `index.html` and `html/puzzle.html` say "about thirty seconds" | Copy fixed Oct 6 (no time claim). Still to do: time five check-ins for MOE-1.1 | | Oct 18 |
| G-2 | UC.3 Review Trends has no stakeholder requirement | Add a StR under N-3 (or trace UC.3 to StR4.1 as a supporting function) in Innoslate | | Oct 18 |
| G-3 | Two capabilities have no model counterpart: the questions list and puzzle-result sharing | Add a requirement for each under N-3 / N-5, or remove them | | Oct 18 |
| G-4 | Model: C.6 runs the assistant. Product: pre-written answers, no AI call | Record as an architecture decision (`docs/decisions/0002-assistant-retrieval.md`); either add a C.6 stub to the assistant path or update the model | | Oct 18 |
| G-5 | StR6.2 wording is "patient-generated"; the summary says "Patient-reported" | Done Oct 6: label now "Patient-generated, non-diagnostic" | | Done |
| G-6 | Lab §1.4/§3.5 files missing: `SPEC.md`, `docs/context.md`, `docs/prompt-log.md`, `docs/environment.md`, ADR 0001; tests are not named for need IDs | Add from the Canvas submission (needs, StRs, acceptance criteria); rename tests to carry need IDs | | Oct 18 |
| G-7 | Directories are named for technology (`js/`, `css/`), not boundary elements | Revisit at the Chapter 6 audit | | Milestone 2 |
| G-8 | README does not open with the OpsCon narrative copied from the model (lab §1.4) | Done Oct 6: README opens with the §2.1 OpsCon text | | Done |
| G-9 | Requirement numbers are not unique across the model: `1.1.1`, `1.2.1`, `1.4.1` and others each name three different requirements, one per subsystem. An unqualified ID in a test name or a commit message is ambiguous | Code, tests and `contracts/api-v1.yaml` qualify every ID (`WRS-`, `WIS-`, `HMS-`). Still to do in Innoslate: give each subsystem's requirement branch a distinct prefix so the exported numbers are unique | | Milestone 2 |
| G-10 | On the F.3.3 IDEF0, **Wellness Session Record** is both an input (WRS-1.1.5, from the Wellness Information Subsystem) and an output of F.3.3.2 to that same subsystem. The same named flow runs both ways between the same two subsystems | Implemented as a round trip: F.3.3.2 emits the record, and accepts one handed back, merging only the questions she added. Model side: either split the two directions into differently named flows, or record the round trip explicitly | | Milestone 2 |
| G-11 | F.3.3 and its three children carry no description text in Innoslate, so the model states no acceptance criteria for them. The behavior in `js/hm-records.js` was derived from the ICOM names and the existing code, not from a specification | Write a description for F.3.3, F.3.3.1, F.3.3.2 and F.3.3.3 in Innoslate, then check `js/hm-records.js` against it | | Milestone 2 |
| G-12 | Two paths decide "is this high risk?": the daily check-in now goes through F.3.3.3, the mood check (`js/hm-moodcheck.js`, UC.7) still routes EPDS item 10 itself through `HM.screening.needsUrgentHelp()` and writes `screenings[]` directly. The criteria agree, but the decision is in two places | F.3.3.3 already accepts `selfHarmReported` for this. Route the mood check through `HM.records` as well, and decide whether `screenings[]` belongs to F.3.3.2 | | Milestone 2 |
