# Prompt log

Provenance record for AI-assisted work on this repository (lab manual, "The Prompt Log").
One entry per significant generation, written when the work is done. Entries are never
reconstructed from memory: where the record is thin, the gap is stated instead.

**Fields per entry:** date · who generated · assistant and model · model entities and
requirement IDs the prompt was built from · the prompt or a stable reference to it · files
produced · reviewer and what they changed or rejected · assumptions the assistant made, and
their disposition (promoted to a requirement, corrected, or removed).

Search for **[TEAM — HUMAN ONLY]** to find every field that no session record can supply,
because only a team member knows the answer. Nothing else in this file is left blank.

## How the review fields below were filled in

The review and disposition fields were completed on October 6, 2026 from the record of a
*second*, local session — Claude Code in VS Code, model `claude-opus-5` — in which the
patches from the authoring session were read, applied and tested. That session is cited
below as **the applying session**. It is a different session from the one that generated the
patches, so it can attest to what was checked at apply time and to what the repository
verifiably contains, and it cannot attest to anything a human did outside it. Those fields
carry **[TEAM — HUMAN ONLY]**.

**Claude was used for every commit in this repository, run by Max Starvaggi** (stated by him
on October 6, 2026). Every entry in this log is therefore AI-assisted work; there is no
unassisted baseline to compare against.

Three kinds of evidence appear below, and the difference matters when reading any field:

- **Repository-verifiable:** provable from the committed files, the test suite or git. Cited
  with a file, test name or commit SHA.
- **Applying-session record:** what was checked when a patch was applied. Cited as *the
  applying session*.
- **Member testimony:** stated by a team member, with no artifact behind it. Always labelled
  *Source: stated by …* with a date.

Each "Disposition" cell additionally records two different things, kept apart on purpose:

- **In effect:** what the committed code, tests and docs verifiably do today.
- **Ratification:** whether a stakeholder or the team has actually endorsed it. "Open"
  means the assumption is live in the product but nobody has yet signed off on it.

---

## Gap: September 14 – October 5, 2026 (not logged at the time)

This log was started on October 6, 2026. Work before that date was not logged when it was
done. The commits are listed below so the gap is visible. The team adds only what members
actually remember, and writes "not recorded" where nobody does.

| Date | Commit | What it changed |
| --- | --- | --- |
| Sep 14 | `b960202` Initial commit of README | README, 2 lines |
| Sep 14 | `9f5e004` Initial example code | 10 files, 2,552 lines added |
| Sep 29 | `e08d169` Overhauled app based on new design direction from the mission business analysis | 48 files, 8,694 lines added, 785 removed |
| Sep 29 | `7b2ebb9` Styling updates | 5 files, 127 lines added, 37 removed |

**Assistant and operator — answered.** *Source: stated by Max Starvaggi, October 6, 2026.*
**Claude was used for the previous commits in this repository, run by Max Starvaggi.** That covers
the four commits above and the two from October 6 recorded as E-001 and E-002. No commit was
written without AI assistance, so this log's scope is the whole history, not only the entries
below.

**What the repository itself records about AI use: nothing.** No commit in the history
carries a `Co-Authored-By` trailer or any other AI attribution, so git alone does not show
which tool was involved or who ran it. The statement above is therefore member testimony
rather than a repository artifact, and it is labelled as such on purpose: the three evidence
classes are kept apart throughout this log. Trailers cannot be added to the existing commits
without rewriting history, so they should be added going forward instead.

The applying session had no part in the pre-October work and holds no record of it, so the
remaining questions are answerable only by the team.

**[TEAM — HUMAN ONLY]** Questions 1 and 2 are answered above. For each commit, answer what
you know of the rest:

3. Which Claude surface and model? (claude.ai chat, Claude Code, an IDE extension; and the
   model if the session page still shows it.) The October work used Claude Code; whether the
   September work did is not recorded.
4. What was it asked to do, in general terms? Was it one broad request for the whole app, or
   several smaller ones? `e08d169` adds 8,694 lines across 48 files in a single commit, so
   this matters most there.
5. Which model artifacts or documents did the prompt include, if any (OpsCon, needs,
   requirements, the mission analysis)? The commit message for `e08d169` cites "the mission
   business analysis", which suggests it was in the prompt — confirm or correct that.
6. Who reviewed the output, and what did they change or throw away? If a commit went in
   unreviewed, write that.
7. Anything nobody remembers: write "not recorded".

---

## E-001 — Walking skeleton trace and External AI Service stub

| Field | Entry |
| --- | --- |
| Date | October 6, 2026 |
| Generated by | Max Starvaggi |
| Assistant and model | Claude, in a Claude Code session on claude.ai. The authoring session reported its configured model as `claude-opus-5-5`; the applying session ran `claude-opus-5`. **[TEAM — HUMAN ONLY]** confirm the authoring model id from the session page, since the two do not match |
| Built from | Canvas submission §1–§4; UC-P1 (13 steps); actions UC.1.22–UC.1.26; asset C.6 External AI Service; StR4.1, StR4.2, StR6.2; lab manual §1.4, §2.5, §3.5; Milestone 1 checks and Student Package rubric |
| Prompt | "Milestone_1_Canvas_Submission is my work in progress. Looking at the student package, milestone checks, and lab manual (if there are any references to this assignment) create for me the walking skeleton (area 5) and model to product linkage (area 6)" |
| Stable reference | Chat and artifact: https://claude.ai/chat/08baddc0-7879-4482-850c-41eb5fee8832?artifact=15f58fe1-e5dc-4f7a-a89e-c4fc76ecb622 · the authoring session also cited https://claude.ai/code/session_018EZabgGvkn2wBsu5rRNyTm · patch file `0001-Milestone-1-UC-P1-walking-skeleton-trace-and-Externa.patch` (305 lines), which is the artifact that was actually applied. **Correction, Oct 6:** this field previously also cited a `Co-Authored-By: Claude` commit trailer as the stable reference. The work landed as commit `0a53331`, which carries no such trailer, so that citation pointed at nothing. The patch file and the chat link are the durable references instead |
| Files produced | `js/hm-external-ai-service.js` (new stub); `js/hm-summary.js` (`requestSummary()` and UC-P1 step comments); `summary.html` (script tag); `tests/pages.test.js` (three UC-P1 checks); `docs/walking-skeleton.md`; `docs/traceability.md` |
| Reviewer and changes | Reviewed at apply time by the applying session (Claude Code, `claude-opus-5`), with Max Starvaggi driving. Checks performed, in order: read the patch in full before applying; `git apply --check` (clean); `git apply`; `npm test` → **326 passed, 0 failed**, including the three new checks `UC-P1 step 9`, `UC-P1 step 10`, `UC-P1 step 11 / StR6.2`; confirmed `var current` exists at `js/hm-summary.js:13`, so the new `current.generatedBy` field is valid; confirmed `summary.html` is the only page that loads `hm-summary.js` or `hm-external-ai-service.js`, so no other page needed the new script tag. **Nothing in the patch was changed or rejected.** One defect was raised and resolved before the commit: `traceability.md` and `walking-skeleton.md` also existed as byte-identical drafts at the repository root (only CRLF vs LF differed); the root copies were dropped and only the `docs/` copies were committed, in `0a53331`. **Not verified by the applying session, and so still open:** whether the 13-step call list was compared against the Innoslate sequence diagram itself. The step numbering and action IDs were taken from the patch on trust, not checked against the model. **[TEAM — HUMAN ONLY]** who checked the step list against Figure 2.2, if anyone? |

**Assumptions the assistant made, and their disposition:**

| # | Assumption | Disposition |
| --- | --- | --- |
| A1 | The C.6 stub returns no text, and the system falls back to composing the summary itself | **In effect and test-locked.** `requestSummary()` in `js/hm-summary.js` takes the fallback whenever `summaryText` is null; the test `UC-P1 step 10` fails if it stops doing so. Since promoted to a specification, not just code: `SPEC.md` §4.1 lists five conditions under which a reply is rejected and the composer runs. **Ratification: open** — no stakeholder requirement yet covers fallback-on-failure. StR4.1 and StR4.2 require that a summary be generated and be faithful to the entries; neither says what happens when C.6 fails. **Candidate action:** add a StR for graceful degradation under N-7, or record the five rules in §4.1 as derived requirements |
| A2 | Browser storage stands in for the modeled user database | **In effect.** `HM.store` in `js/hm-core.js` writes one `localStorage` key, `happymoms.v1`. Documented twice in `docs/walking-skeleton.md`: the participants table marks it "Real, substituted", and "Stubbed on purpose" gives the rationale — on-device storage supports StR5.1 (no disclosure without her action) and StR6.1 (no EHR integration). **Ratification: open, and the evidence is thin** — this is an architecture decision carried only in a prose paragraph. `docs/decisions/` does not exist, so there is no ADR. **Candidate action:** write it up as ADR 0001 before Milestone 2, where a server-side store is reconsidered |
| A3 | UC-P1 step 11 ("present one-page labeled summary") is a new action to add to the model | **Not done.** `docs/walking-skeleton.md` still marks step 11 "new action (to add to the model)", so the product has a step the Innoslate model does not. The behaviour exists and is tested (`UC-P1 step 11 / StR6.2`); the model counterpart does not. **Ratification: open.** **Candidate action:** add the action under UC.1 in Innoslate and give it an ID, or justify in writing why presentation is not a modeled action |
| A4 | Capabilities with no dedicated requirement (trends, questions list, puzzle sharing) are kept and logged as gaps, not removed | **In effect.** All three still ship. The gaps are recorded in two places: G-2 and G-3 in `docs/traceability.md`, and O-5 in `SPEC.md`, both due Oct 18. **Ratification: open** — logging a gap is not a decision to keep the feature. The choice is still live: write a requirement for each, or cut it. **[TEAM — HUMAN ONLY]** decide per capability by Oct 18 |

---

## E-002 — SPEC.md first draft

| Field | Entry |
| --- | --- |
| Date | October 6, 2026 |
| Generated by | Max Starvaggi |
| Assistant and model | Claude, same session as E-001 |
| Built from | Needs N-1 to N-9 and PN-1 to PN-9, StR1.1 to StR6.2 with acceptance criteria (Canvas §3.5 and §4.1, copied, not rewritten); the data model in `js/hm-core.js` and `js/hm-content.js`; lab manual §3.5 |
| Prompt | "I applied the patch, write me a new 6 and draft spec.md for me to drop into my project" |
| Stable reference | Session and artifact links as in E-001. Unlike E-001 and E-003, this output did not arrive as a patch file, so no patch artifact exists for it; the committed file is the only copy in the repository |
| Files produced | `SPEC.md` (233 lines, committed alone as `df212d6`) |
| Reviewer and changes | **No review is on record, and the applying session cannot supply one.** `SPEC.md` was not produced, read or applied in the applying session: it was already committed as `df212d6` when that session resumed, between applying patch 0001 and patch 0002. The applying session has since read §4 only, while filling in this log. So, unlike E-001 and E-003, this file has had **no verified test run, no diff review, and no second pair of eyes** recorded anywhere. It is also the one file here that states requirements and acceptance criteria, which makes the omission the most consequential of the three. **[TEAM — HUMAN ONLY]** who read `SPEC.md` before it was committed, and what did they change? If it went in unreviewed, write that — it is the honest answer and it is also the strongest argument for the review action below. **Action:** review §2 against the Canvas submission line by line, since §2 claims to copy needs and StRs verbatim and nobody has confirmed that it does |

**Assumptions the assistant made, and their disposition:**

| # | Assumption | Disposition |
| --- | --- | --- |
| A1 | The data contract (§3) describes what the code does today. No stakeholder chose these behaviors. | **In effect, as description not requirement.** §3 documents the `checkins[]` and `profile` shapes, null handling and store-unavailable behaviour as the code already has them. The assumption is sound as written — it is labelled descriptive — but it means §3 is *not* a source of requirements and must not be cited as one. **Ratification: not needed for the description; open for the behaviours.** Null handling and the store-unavailable path are real design choices with no requirement behind them. **Candidate action:** decide which §3 behaviours deserve requirements, and mark the rest explicitly "as-built, descriptive" |
| A2 | The five rules for rejecting an AI reply (§4.1) were proposed by the assistant, not taken from the model. The lab manual says criteria should not come from the assistant. | **In effect and unratified — this is the flagged item in this log.** The five rules govern when the product refuses C.6 output, and they are acceptance criteria in substance. Each traces to something real (1 → the stub contract; 2 → StR4.3; 3 → StR3.3; 4 → StR4.2; 5 → StR3.2's 5 s, and rule 5 openly says the limit is "to be set"). But the lab manual is explicit that criteria must not originate with the assistant, so they cannot stand as-is. **[TEAM — HUMAN ONLY] accept, revise, or remove each of the five rules, and set the rule 5 timeout.** Until that is done, treat §4.1 as a proposal, not a contract. This is the highest-priority fill-in in this file |
| A3 | The status marks (✅ / ◐ / ☐) and the named "to write" tests | **In effect, partly verified.** The applying session confirmed one mark directly: StR6.2 was raised ◐ → ✅ in patch 0002, and two passing tests back it ("summary text is titled", "UC-P1 step 11 / StR6.2"). The other marks were never checked against the suite. The ☐ and ◐ rows name tests that do not exist yet, which `SPEC.md` O-6 already admits. **Ratification: open.** **Candidate action:** for each ✅, name the test that proves it and confirm it passes; demote any ✅ that cannot be pointed at a test |
| A4 | Open issues O-1 to O-6, found by the assistant while drafting | **In effect, and three have moved.** O-2 is closed (patch 0002 aligned the label), O-4 was reworded and pushed to Oct 18, and O-6 is self-referential — it records that these very checks are not yet automated tests. O-1, O-3 and O-5 remain open at Oct 18. The issues were found by the assistant, so each needs a team member to agree it is real and own it; every Owner column in `docs/traceability.md` is still blank. **[TEAM — HUMAN ONLY] assign an owner to O-1, O-3, O-5 and O-6** |

---

## E-003 — Text fixes for StR1.1, StR6.2 and the README OpsCon

| Field | Entry |
| --- | --- |
| Date | October 6, 2026 |
| Generated by | Max Starvaggi |
| Assistant and model | Claude, same session as E-001 |
| Built from | StR1.1, StR6.2; OpsCon narrative (Canvas §2.1, copied word for word); SPEC.md O-2 and O-4; lab manual §1.4 |
| Prompt | "Give me the text fixes and specific instructions on where I need to fill in the gaps for the work-log type place" |
| Stable reference | Session and artifact links as in E-001 · patch file `0002-Milestone-1-text-fixes-and-prompt-log.patch` (358 lines), which is what was applied |
| Files produced | `index.html`, `puzzle.html`, `README.md` (check-in time wording; README now opens with the OpsCon); `js/hm-summary.js`, `summary.html`, `tests/pages.test.js` (summary labeled "Patient-generated, non-diagnostic"); `SPEC.md`, `docs/walking-skeleton.md`, `docs/traceability.md` (status updates); this log |
| Reviewer and changes | Reviewed at apply time by the applying session (Claude Code, `claude-opus-5`), with Max Starvaggi driving. Checks performed: read the patch in full; `git apply --check` (clean); `git apply`; `npm test` → **326 passed, 0 failed**, including the renamed `UC-P1 step 11 / StR6.2` check; `git diff --check` → no whitespace or line-ending damage; `git diff --stat` matched the patch's own stat exactly, confirming nothing applied partially; and a repository-wide sweep for the strings the patch set out to remove. The sweep found every surviving instance of "patient-reported" and of a check-in time claim to be deliberate — they appear only in the gap entries of `SPEC.md`, `docs/traceability.md` and this log, which quote the old wording in order to record the fix. **Nothing was changed or rejected.** One inconsistency was raised and left standing: the patch's stated goal is "no unmeasured check-in time claims", and `index.html` and `puzzle.html` now state no time at all, but `README.md:86` gained "target 15 seconds or less (StR1.1)". Citing the requirement's target is defensible, but the three files took two different approaches. **[TEAM — HUMAN ONLY]** decide whether the README should carry the target or no number, so all three agree |

**Assumptions the assistant made, and their disposition:**

| # | Assumption | Disposition |
| --- | --- | --- |
| A1 | Site text should make no time claim until the check-in is timed, so "about thirty seconds" became "seven in all" and "a few seconds" | **In effect, with one exception.** `index.html` now reads "Single taps, seven in all" and `puzzle.html` "a few seconds for the check-in", both verified by the post-apply sweep. The exception is `README.md:86`, which states the 15 s target explicitly — see the reviewer note above. The assumption is also the better of the two readings on the merits: the old copy claimed 30 s while StR1.1 requires 15 s, so the site was advertising a failure of its own requirement. **Ratification: open, and the underlying measurement is still missing.** O-4 in `SPEC.md` and G-1 in `docs/traceability.md` both now say the copy is fixed but StR1.1 remains unmeasured, due Oct 18. **Action:** time five check-ins, record the median as MOE-1.1, then restore a time claim to the site only if the median supports it |
| A2 | The code's label should change to match StR6.2, rather than StR6.2 changing to match the code | **In effect, ratified by the requirement itself, and test-locked.** StR6.2 already said "patient-generated"; only the code disagreed, so this was a defect fix and not really a choice — which is why it is the one item here that can be closed without a team decision. Changed in five places in `js/hm-summary.js` (file header, `renderSheet()` default name, sheet footer, `buildText()` title, step-11 comment) plus the `summary.html` meta description. Two tests now fail if the label regresses. Recorded closed as O-2 in `SPEC.md` and G-5 in `docs/traceability.md`. **Ratification: complete.** No further action |

---

## Other outputs from the same session (not in this repository)

The same session also drafted text for the Milestone 1 Canvas submission (Areas 5 and 6,
plus a shortened version) and a script for the walking-skeleton recording.

**The applying session can confirm nothing here.** These outputs never entered the
repository, so there is no commit, patch file or test run to point at, and the local record
ends at the repository boundary. Whether any of this text reached the Canvas submission, and
in what form, is known only to the submitter.

**[TEAM — HUMAN ONLY]** State whether and how the team used these, in light of the course
policy on AI-generated text in written submissions (lab manual, "Academic Integrity"). Answer
for each separately: the Area 5 text, the Area 6 text, the shortened version, and the
recording script. For each, say whether it was submitted as drafted, rewritten by a team
member, or not used. This is the one section where a thin answer carries academic-integrity
risk rather than only a documentation gap.
