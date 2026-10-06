/* ==========================================================================
   Happy Moms — External AI Service (C.6)   *** STUB ***

   Model trace
     Asset:      C.6 External AI Service (outside the SoI boundary)
     Use case:   UC-P1 Expecting Mother Prepares and Shares an Appointment Summary
     Steps:      9  Happy Moms System sends logged entries   (action UC.1.23)
                 10 External AI Service generates the summary (action UC.1.24)
     Satisfies:  StR4.1, StR4.2 (via the system's fallback composer, see below)

   Why this is a stub
     The team does not build or train the AI model (Area 1 boundary), and the
     model contract (prompt, response schema, guardrails) is not specified yet.
     The lab manual's walking-skeleton rule is "no real model call", so this
     participant returns a hard-coded response of the agreed shape.

   Response shape (the future model contract)
     { status: "ok" | "stub" | "error",
       summaryText: string | null,   // null = nothing generated
       participant: "External AI Service" }

   When summaryText is null, the Happy Moms System falls back to its own
   deterministic composer (HM.summary.buildText). That fallback is the same
   behaviour the model contract will require when the real service fails, so
   the stub exercises the path the product must always support.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  HM.externalAIService = {
    isStub: true,
    calls: 0,

    /* UC-P1 step 10 / UC.1.24: Generate appointment summary.
       request = { interval: { start, end }, entries: [ ...logged check-ins ] } */
    generateAppointmentSummary: function (request) {
      HM.externalAIService.calls += 1;
      return {
        status: "stub",
        summaryText: null,
        participant: "External AI Service",
        entriesReceived: request && request.entries ? request.entries.length : 0
      };
    }
  };
})(window.HM);
