# Happy Moms — Specification

**Status:** Draft v0.1 · Milestone 1 · October 6, 2026
**Source of truth:** the Innoslate model (needs N-1 to N-9, stakeholder requirements StR1.1 to StR6.2).
To change anything here, change the model first, then update this file.
**How this file is used:** every prompt that generates code for this project includes this file
and the model artifact the change traces to (lab manual §3.5). Code that traces to nothing
here is out of scope.

Related: [`docs/walking-skeleton.md`](docs/walking-skeleton.md) (primary use case, step by step) ·
[`docs/traceability.md`](docs/traceability.md) (every capability mapped to the model).

---

## 1. System of interest

Happy Moms is a web-based pregnancy wellness platform. An expecting mother does quick daily
check-ins, reads sourced wellness tips, plays a daily puzzle, and asks a guardrailed assistant
everyday questions. Between prenatal visits, the check-ins build a record that the system turns
into a one-page summary she can choose to share with her OB/GYN.

**Inside the boundary:** baseline profile and check-ins, engagement activities and tips,
assistant behavior and guardrails, trend review, appointment-summary generation.

**Outside the boundary:** clinical care (diagnosis, prescribing, treatment), emergency and
crisis services (the system only points to them), the External AI Service, the user's device,
and provider health-record systems. The system never diagnoses or prescribes.

---

## 2. Needs, requirements and acceptance criteria

Each requirement reads "The Happy Moms system shall…". Numeric values are preliminary until
validation. **Check** names the existing test in `npm test`, or the test still to write
(named for the need ID, per lab §3.5).

**Status:** ✅ automated check exists · ◐ partly checked, or checked by review · ☐ test still to write

### N-1 Low-effort daily tracking
*Expecting mothers need to record their daily physical and emotional wellness with minimal time and effort.* (PN-1)

| Req | Requirement | Acceptance criterion | Check | Status |
| --- | --- | --- | --- | --- |
| StR1.1 | Allow an Expecting Mother to complete a daily wellness check-in in 15 seconds or less. | Representative users complete a standard check-in in ≤ 15 s in usability testing. | Flow: "check-in reaches its saved screen", "check-in wrote an entry". Timing: usability test, to run | ◐ |

### N-2 Reliable everyday answers
*Expecting mothers need quick access to reliable, non-clinical answers to everyday pregnancy wellness questions from trusted medical sources.* (PN-2)

| Req | Requirement | Acceptance criterion | Check | Status |
| --- | --- | --- | --- | --- |
| StR3.1 | Base 100% of wellness information and assistant responses on approved sources (ACOG, FDA, NIH). | Review of the response set shows 100% grounded in ACOG, FDA or NIH. | "every tip names a known source", "every answer names a known source". See open issue O-1 (CDC) | ◐ |
| StR3.2 | Respond to a user wellness question within 5 seconds. | Each test question answered within ≤ 5 s. | To write: `N-2 assistant answers within 5 seconds` | ☐ |

### N-3 An organized account for the next visit
*Expecting mothers need a clear, organized account of how they have felt since their last prenatal visit to share with their provider.* (PN-3)

| Req | Requirement | Acceptance criterion | Check | Status |
| --- | --- | --- | --- | --- |
| StR4.1 | Generate, on request, an appointment summary of the wellness entries logged since the user's last visit. | The generated summary incorporates the applicable entries since the previous visit. | "summary text includes averages", "coverage counts every entry". To write: `N-3 summary counts every entry since lastVisit` | ◐ |
| StR4.2 | Produce appointment summaries that agree with 100% of the underlying logged entries in verification testing. | Comparison with source records shows 100% agreement. | "symptoms are counted", "delta arithmetic is consistent". To write: `N-3 summary values match source entries` | ◐ |

### N-4 Control over who sees her information
*Expecting mothers need to control who can see their health information and when.* (PN-4)

| Req | Requirement | Acceptance criterion | Check | Status |
| --- | --- | --- | --- | --- |
| StR5.1 | Share a user's health information with another person only after the user's explicit authorization. | Across defined sharing scenarios, zero disclosures without explicit authorization. | By design: no network calls; sharing only through Copy, Download, Print or Share. To write: `N-4 no request leaves the browser` | ◐ |
| StR5.2 | Allow an Expecting Mother to revoke sharing or delete her account at any time. | Revocation and deletion scenarios succeed in 100% of validation trials. | "the delete control is present". To write: `N-4 delete removes all stored data` | ◐ |

### N-5 Engaging enough to keep using
*Expecting mothers need wellness tracking to be engaging enough to sustain use throughout pregnancy.* (PN-5)

| Req | Requirement | Acceptance criterion | Check | Status |
| --- | --- | --- | --- | --- |
| StR1.2 | Offer at least one interactive engagement activity each day. | ≥ 1 interactive activity available each day during the evaluation period. | "daily pick is stable for a date", "the word changes the next day", "enough words for two months without repeating" | ✅ |

### N-6 Prompt direction to crisis help
*Expecting mothers need to be directed promptly to emergency or crisis resources when something they report may be serious.* (PN-6)

| Req | Requirement | Acceptance criterion | Check | Status |
| --- | --- | --- | --- | --- |
| StR2.1 | Display crisis support contact information within 2 seconds of a user entry that meets the defined high-risk criteria. | Each clinically reviewed high-risk test input displays contact information within ≤ 2 s. | "assistant escalates a warning sign", "escalates: …" (21 cases), "escalation offers a real route to help". High-risk criteria: `urgentSigns` and `redFlags` in `js/hm-content.js`. Clinical review pending | ◐ |
| StR2.2 | Make crisis support contact information reachable within 2 user actions from any screen. | Reachable from every applicable screen in ≤ 2 user actions. | "Urgent help" link in every page header (`js/hm-chrome.js`). To write: `N-6 every page links to urgent help` | ◐ |

### N-7 A concise account the provider can read quickly
*OB/GYN Providers need a concise, accurate account of a patient's wellness trends since the last visit that can be reviewed within a brief appointment.* (PN-7)

| Req | Requirement | Acceptance criterion | Check | Status |
| --- | --- | --- | --- | --- |
| StR4.1, StR4.2 | (see N-3) | | | |
| StR4.3 | Limit each appointment summary to one page or less. | 100% of generated summaries are ≤ 1 page in the defined format. | Print stylesheet in `css/style.css`. To write: `N-7 summary prints on one page` | ☐ |

### N-8 Only vetted, non-diagnostic guidance
*OB/GYN Providers need their patients to receive only information from vetted medical sources, without diagnostic or prescriptive advice.* (PN-8)

| Req | Requirement | Acceptance criterion | Check | Status |
| --- | --- | --- | --- | --- |
| StR3.1 | (see N-2) | | | |
| StR3.3 | Limit assistant responses to non-diagnostic wellness information, with zero diagnostic or prescriptive statements in clinically reviewed test scenarios. | Clinical review of defined scenarios finds zero such statements. | "no content diagnoses or prescribes", "medication answer defers to a provider or pharmacist", "scope answer says it cannot diagnose". Clinical review pending | ◐ |

### N-9 Fits the existing visit, adds no liability
*OB/GYN Providers need patient-generated wellness information to fit into existing visits without added data entry, system integration, or clinical liability.* (PN-9)

| Req | Requirement | Acceptance criterion | Check | Status |
| --- | --- | --- | --- | --- |
| StR6.1 | Provide appointment summaries without requiring integration with a provider's electronic health record system. | Full summary workflow demonstrated with no EHR connection or data entry. | Walking skeleton demo (`docs/walking-skeleton.md`, step 13) | ✅ |
| StR6.2 | Label every appointment summary as patient-generated and non-diagnostic. | 100% of generated summaries contain both designations. | "summary text is titled", "UC-P1 step 11 / StR6.2 …" (both designations on the sheet and in the text export) | ✅ |

---

## 3. Data contract

**Source:** the Expecting Mother, through the check-in, profile and baseline screens. There is
no other data source and no server.

**Store:** the browser's `localStorage`, one key, `happymoms.v1`, schema version `1`. All reads
and writes go through `HM.store` in `js/hm-core.js`.

**Refresh cadence:** at most one check-in per calendar day. Redoing a check-in on the same day
replaces that day's entry.

### Check-in entry — `checkins["YYYY-MM-DD"]`

| Field | Type | Unit / allowed values | Required |
| --- | --- | --- | --- |
| `date` | string | `YYYY-MM-DD`, local date | yes |
| `createdAt` | string | ISO 8601 timestamp | yes |
| `mood` | integer | 1–5, higher is better | yes |
| `energy` | integer | 1–5, higher is better | yes |
| `sleepHours` | number | hours: 3.5, 5, 6.5 or 8.5 (band midpoints) | yes |
| `sleepQuality` | integer | 1–5, higher is better | yes |
| `nausea` | integer | 1–5, lower is better | yes |
| `water` | number | cups: 1, 4, 7 or 10 (band midpoints) | yes |
| `activity` | number | minutes: 0, 15, 30 or 50 | yes |
| `symptoms` | string[] | codes from the 15 everyday symptoms in `js/hm-content.js` | no (empty list) |
| `urgent` | string[] | codes from the 14 `urgentSigns` (12 medical, 2 mental) | no (empty list) |
| `note` | string | free text, one sentence suggested | no |

### Profile — `profile`

| Field | Type | Meaning |
| --- | --- | --- |
| `dueDate` | string `YYYY-MM-DD` | Gestational week is derived from it (due date = 40w0d); never stored |
| `lastVisit` | string `YYYY-MM-DD` | Start of the "since last visit" summary interval |
| `nextAppointment` | string `YYYY-MM-DD` | Shown on Today |
| `providerName` | string | Printed on the summary |
| `supportPerson` | string | Display only; nothing is sent to them |
| `baseline` | object or null | `{ takenOn, total (0–18), label, answers }` from the baseline quiz |

### Null and missing values

- A day without a check-in is a **gap, not a zero**. Averages use logged days only, and the
  summary reports "*n* of *m* days logged".
- If no numeric entries fall in the interval, the summary says "No numeric entries in this
  range" instead of showing averages.
- If `lastVisit` is empty, "Since last visit" covers the last 28 days.
- If `dueDate` is empty, gestational week is reported as unknown and left off the summary.
- Fields added in later versions are filled with defaults when old data loads (`migrate()`).

### When the store is unavailable

- **Storage blocked** (private mode, disabled site data): the app keeps working from memory
  for the session, and nothing is kept after the tab closes.
- **Saved data unreadable:** the app starts from a blank state and logs a console warning.
  Recovery is through the user's own export file (Profile → Export).

---

## 4. Model contract — External AI Service (C.6)

Specified now. At Milestone 1, C.6 is a stub (`js/hm-external-ai-service.js`). A real call is
implemented in Chapter 8 against this contract.

### 4.1 Appointment summary (UC-P1 steps 9–10, actions UC.1.23–UC.1.24)

**What the model is asked to do:** write a plain-language summary of the supplied check-in
entries for the stated interval. Use only the supplied entries. Do not interpret patterns as
conditions, diagnose, or suggest treatment. List any urgent signs first.

**Request**

```json
{
  "interval": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "label": "Since last visit" },
  "entries": [ { "date": "YYYY-MM-DD", "mood": 4, "...": "fields as in §3" } ]
}
```

**Response**

```json
{
  "status": "ok | stub | error",
  "summaryText": "string, or null if nothing was generated",
  "participant": "External AI Service"
}
```

**The application rejects a reply and uses its own composer (`HM.summary.buildText`) when:**

1. `status` is not `"ok"`, or `summaryText` is null or empty (the stub always returns this);
2. the text would not fit on one printed page (StR4.3);
3. the text fails the same non-diagnostic language check applied to content (StR3.3);
4. the text states a value that does not appear in the supplied entries (StR4.2);
5. no reply arrives within the time limit (to be set with StR3.2's 5 s as the reference).

Every summary shown, generated or composed, carries the patient-generated, non-diagnostic
label (StR6.2).

### 4.2 Assistant (UC.4)

**Today:** the assistant does not call C.6. Every question is screened against `redFlags`
first; a match routes to urgent help (StR2.1). Otherwise the question is matched to a fixed,
sourced answer library, and an unmatched question gets an honest "not covered" reply. See
open issue O-3.

**If C.6 is added later, it must sit behind the same rules:** red-flag screening runs before
any model call; answers are limited to approved sources and name their source (StR3.1);
nothing diagnostic or prescriptive (StR3.3); no reply within 5 s falls back to the "not
covered" reply (StR3.2).

---

## 5. Open issues

| ID | Issue | Resolution path | Due |
| --- | --- | --- | --- |
| O-1 | StR3.1 approves ACOG, FDA and NIH, but 10 tips and answers cite the CDC. | Add CDC to the approved list in the model and StR3.1, or re-source those entries. | Oct 18 |
| O-2 | ~~StR6.2 says "patient-generated"; the summary said "Patient-reported".~~ | Closed Oct 6: summary now reads "Patient-generated, non-diagnostic". | Done |
| O-3 | The model has C.6 running the assistant; the product uses a fixed answer library. | Record the decision in `docs/decisions/`; update the model or stub C.6 on the assistant path. | Oct 18 |
| O-4 | StR1.1 (≤ 15 s) is not yet measured. Site text no longer claims a time (was "about thirty seconds"). | Time five check-ins; record the median as MOE-1.1. | Oct 18 |
| O-5 | Three capabilities trace to a need and use case but no requirement: trends (UC.3), the questions-to-ask list (N-3), puzzle sharing (UC.6). | Add requirements in Innoslate, then here. | Oct 18 |
| O-6 | ☐ and ◐ checks above are not yet automated tests named by need ID. | Write them as failing tests, then make them pass. | Oct 18 |
