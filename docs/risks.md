# Product risk register

Risk IDs and entity references match the Happy Moms Innoslate model
(`Happy Moms Innoslate.xml`):

- **R1–R5** are the system-level risks modeled in Innoslate.
- **R6–R12** are product-level risks, most of them specific to the AI-assisted Q&A.

## Scoring

Likelihood (**L**) and Impact (**I**) are each rated 1–5, from Low to High.
**Score = L × I**, banded as follows:

| Level | Score |
| --- | --- |
| Low | 1–5 |
| Moderate | 6–12 |
| High | 15–25 |

## Register

| ID | Risk | Type | Innoslate cross-reference | L | I | Score | Level | Strategy | Handling |
| --- | --- | --- | --- | :---: | :---: | :---: | --- | --- | --- |
| R1 | Baseline profile incomplete or stored incorrectly | Data integrity | UC.1.1–UC.1.4; C.3.1.2 | 3 | 3 | 9 | Moderate | Mitigate | Required fields, review screen |
| R2 | Daily check-in lost or corrupted | Data integrity | UC.1.9, UC.1.11; C.3.3.2; StR4.2 | 3 | 5 | 15 | High | Mitigate | Save confirmation, retry, backups |
| R3 | Q&A returns a delayed, wrong or unsafe answer | AI – safety | UC.1.18–UC.1.21; C.5; StR3.1–StR3.3 | 4 | 4 | 16 | High | Eliminate (release 1) | Static Answer Bank for release 1; mitigate the residual risk |
| R4 | Unauthorized access to wellness data | Security | C.3.3.2; C.3.1.1; StR5.1 | 3 | 5 | 15 | High | Mitigate | Encryption, access control |
| R5 | Check-in and word game take too long, so use drops | Human factors | UC.1.9, UC.1.11, UC.1.12; StR1.1 | 2 | 4 | 8 | Moderate | Mitigate | Shorter check-in, optional game |
| R6 | Approved answers go stale without ongoing medical review | Sustainment | UC.1.20A; StR3.1; N-8 | 3 | 3 | 9 | Moderate | Mitigate | Review date on each answer, scheduled review |
| R7 | Wrong question matched; a fluent but incorrect answer is returned | AI – incorrect output | UC.1.19A; StR3.1, StR3.3 | 3 | 4 | 12 | Moderate | Mitigate | Match threshold, otherwise fallback message |
| R8 | Answer service or AI provider unavailable or slow | AI – availability | UC.1.20A; C.3.5.1; StR3.2 | 2 | 2 | 4 | Low | Mitigate | Timeout with fallback message |
| R9 | Untrusted user text bypasses screening or manipulates output | AI – untrusted input | UC.1.19A; UC.1.30; StR2.1 | 2 | 5 | 10 | Moderate | Mitigate | Sanitize input, screen before matching |
| R10 | Answer or response format changes between versions | AI – schema drift | UC.1.21A | 2 | 2 | 4 | Low | Mitigate | Schema validation on load |
| R11 | Matching library or provider SDK abandoned | AI – dependency | C.3.5.1; C.3.5.3 | 2 | 2 | 4 | Low | Mitigate | Pin versions, dependency audit |
| R12 | Health questions leave the app through an unintended path | AI – data egress | C.3.3.2; StR5.1; N-4 | 2 | 5 | 10 | Moderate | Mitigate | No third-party logging of question text |

## Summary by level

| Level | Risks |
| --- | --- |
| High | R2, R3, R4 |
| Moderate | R1, R5, R6, R7, R9, R12 |
| Low | R8, R10, R11 |
