/* ==========================================================================
   Happy Moms — wellness records

   Model trace
     Function:   F.3.3  Maintain Wellness History
     Decomposes: F.3 Provide Maternal Wellness Tracking
     Mechanism:  C.3.3 Wellness Records Subsystem  (this module)
                   C.3.3.1 Check-In Ingestion Module   → ingestCheckInData
                   C.3.3.2 Data Storage Module         → persistSessionRecord
                   C.3.3.3 High Risk Screening Module  → screenForHighRiskAlerts
     Use cases:  UC.2 (Completes Daily Wellness Check-In), UC.1.11 (Records
                 Relevant Wellness Information), UC.1.30 (Screens Entry
                 Against High-Risk Criteria)

   Requirement IDs in this file are qualified with the subsystem, because
   Innoslate numbers requirements per subsystem and the bare numbers collide
   across them: WRS-1.1.1 "Accept Daily Wellness Checkin Data" of the Wellness
   Records Subsystem is a different requirement from HMS-1.1.1 and WIS-1.1.1.
   The mapping back to the model is in docs/traceability.md.

   ICOMs of F.3.3, read off the IDEF0 diagram
     Inputs    Daily Wellness Checkin Data   (from C.1 Expecting Mother)
               Recorded Wellness Entry       (from C.3.2 Daily Check-In Subsystem)
               User Defined Custom Info      (from C.6 External AI Service)
               Wellness Session Record       (from C.3.5 Wellness Information Subsystem)
     Control   Summary Prompt                (from C.1 Expecting Mother)
     Outputs   Recorded Wellness Entry, Wellness Session Record,
               Updated Wellness History, High-Risk Alert
     Mechanism C.3.3 Wellness Records Subsystem

   Every function here takes its inputs and control as named arguments and
   returns its outputs as named keys, so a call reads the way the box reads on
   the diagram. The mechanism is not an argument: it is this module.

   Nothing here renders. Storage is the one browser localStorage key owned by
   HM.store (js/hm-core.js); browser storage is substituted for the modeled
   database, as recorded in docs/walking-skeleton.md.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  /* The question ids a Recorded Wellness Entry may carry, read from the
     check-in definition rather than copied, so adding a question to
     HM.content.checkin cannot silently drop it on the way to storage. */
  function answerIds() {
    return (HM.content && HM.content.checkin ? HM.content.checkin : [])
      .map(function (q) { return q.id; });
  }

  /* The clinician-approved high-risk criteria of F.3.3.3 are the published
     maternal warning signs in HM.content.urgentSigns (ACOG, CDC Hear Her).
     Read, never copied: one list, one place to review. */
  function criteria() {
    return (HM.content && HM.content.urgentSigns) || [];
  }

  function signByValue(value) {
    return criteria().filter(function (s) { return s.value === value; })[0] || null;
  }

  function list(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  /* ------------------------------------------------------------------------
     F.3.3.1  Ingest Check-In Data                        C.3.3.1
     Satisfies WRS-1.1.1, WRS-1.1.4, WRS-1.4.1

     In   dailyWellnessCheckinData  the answers as the check-in collected them
          userDefinedCustomInfo     optional, from C.6; kept under `custom`
                                    so it can never overwrite an answer
     Out  recordedWellnessEntry     the entry in storage shape
          screeningEntryPayload     the subset F.3.3.3 screens, nothing more
     ---------------------------------------------------------------------- */
  function ingestCheckInData(dailyWellnessCheckinData, userDefinedCustomInfo) {
    var data = dailyWellnessCheckinData || {};
    var dateKey = data.date || (HM.dates ? HM.dates.todayKey() : "");

    var entry = { date: dateKey, createdAt: new Date().toISOString() };

    answerIds().forEach(function (id) {
      if (id === "symptoms" || id === "note") return;
      if (data[id] !== undefined && data[id] !== null) entry[id] = data[id];
    });

    entry.symptoms = list(data.symptoms);
    entry.urgent = list(data.urgent);
    entry.note = typeof data.note === "string" ? data.note : "";

    var custom = userDefinedCustomInfo || data.custom || null;
    if (custom) entry.custom = custom;

    return {
      recordedWellnessEntry: entry,
      screeningEntryPayload: {
        date: entry.date,
        urgent: entry.urgent.slice(),
        symptoms: entry.symptoms.slice(),
        mood: entry.mood === undefined ? null : entry.mood,
        /* Set by the mood check (HM.screening) when EPDS item 10 is above
           "Never". The daily check-in path leaves it false. */
        selfHarmReported: data.selfHarmReported === true
      }
    };
  }

  /* ------------------------------------------------------------------------
     F.3.3.2  Persist Session Record                      C.3.3.2
     Satisfies WRS-1.1.2, WRS-1.1.5, WRS-1.4.2, WRS-1.2.2

     In       recordedWellnessEntry   from F.3.3.1, or straight from C.3.2
              wellnessSessionRecord   optional, handed back by C.3.5
                                      (WRS-1.1.5); its questions are merged
     Control  summaryPrompt           governs the interval the emitted session
                                      record covers. Not stored and not
                                      consumed: with no prompt the record
                                      covers the day just written
     Out      wellnessSessionRecord   for C.3.5 Wellness Information Subsystem
              updatedWellnessHistory  for C.3.4 Trend Analysis Subsystem
     ---------------------------------------------------------------------- */
  function persistSessionRecord(recordedWellnessEntry, control) {
    var entry = recordedWellnessEntry || {};
    var opts = control || {};
    var incoming = opts.wellnessSessionRecord || null;
    var prompt = opts.summaryPrompt || null;

    var state = HM.store.update(function (s) {
      s.checkins[entry.date] = entry;
      /* WRS-1.1.5: a record handed back by C.3.5 may carry questions the
         mother added while reviewing it. Keep hers, add the new ones. */
      if (incoming && Array.isArray(incoming.questions)) {
        var known = {};
        (s.questions || []).forEach(function (q) { known[q.id] = true; });
        incoming.questions.forEach(function (q) {
          if (q && q.id && !known[q.id]) s.questions.push(q);
        });
      }
    });

    var keys = Object.keys(state.checkins || {}).sort();
    var interval = resolveInterval(prompt, keys, entry.date);
    var inRange = keys.filter(function (k) {
      return k >= interval.start && k <= interval.end;
    });

    return {
      wellnessSessionRecord: {
        interval: interval,
        entries: inRange.map(function (k) { return state.checkins[k]; }),
        questions: (state.questions || []).slice(),
        generatedAt: new Date().toISOString()
      },
      updatedWellnessHistory: {
        dates: keys,
        dayCount: keys.length,
        firstDate: keys[0] || null,
        lastDate: keys[keys.length - 1] || null,
        streak: HM.stats ? HM.stats.streak(state.checkins) : 0,
        updatedAt: new Date().toISOString()
      },
      stored: HM.store.available
    };
  }

  function resolveInterval(summaryPrompt, keys, fallbackDate) {
    if (summaryPrompt && summaryPrompt.start && summaryPrompt.end) {
      return { start: summaryPrompt.start, end: summaryPrompt.end };
    }
    if (summaryPrompt && summaryPrompt.sinceVisit) {
      return { start: summaryPrompt.sinceVisit, end: keys[keys.length - 1] || fallbackDate };
    }
    return { start: fallbackDate, end: fallbackDate };
  }

  /* ------------------------------------------------------------------------
     F.3.3.3  Screen for High Risk Alerts                 C.3.3.3
     Satisfies WRS-1.2.1, WRS-1.4.3; stakeholder requirement StR2.1

     In   screeningEntryPayload   from F.3.3.1
     Out  highRiskAlert           null when nothing meets the criteria

     Screening, not diagnosis: an alert names the signs the mother reported
     and the route to help. It never names a condition (SPEC section 1).
     ---------------------------------------------------------------------- */
  function screenForHighRiskAlerts(screeningEntryPayload) {
    var payload = screeningEntryPayload || {};
    var matched = list(payload.urgent)
      .map(signByValue)
      .filter(function (s) { return !!s; });

    var alreadyFlagged = matched.some(function (s) { return s.value === "selfHarm"; });
    if (payload.selfHarmReported === true && !alreadyFlagged) {
      var selfHarm = signByValue("selfHarm");
      if (selfHarm) matched.push(selfHarm);
    }

    if (!matched.length) return null;

    var mental = matched.some(function (s) { return s.category === "mental"; });

    return {
      raisedAt: new Date().toISOString(),
      date: payload.date || null,
      category: mental ? "mental" : "medical",
      signs: matched.map(function (s) {
        return { value: s.value, label: s.label, category: s.category };
      }),
      /* StR2.1 / StR2.2: the route to help, in the order the product shows
         it. Returned with the alert so no caller has to decide it. */
      actions: [{ kind: "provider", label: "Call your provider now" }]
        .concat(mental ? [{ kind: "crisisLine", label: "Call or text 988", href: "tel:988" }] : [])
        .concat([{ kind: "page", label: "Open urgent help", href: "crisis.html" }])
    };
  }

  /* ------------------------------------------------------------------------
     F.3.3  Maintain Wellness History                     C.3.3
     Satisfies WRS-1.1.1 to WRS-1.1.5, WRS-1.2.1, WRS-1.2.2

     One call for the whole box. The children run in the order the model's
     simulation gives: F.3.3.1, then F.3.3.2, then F.3.3.3.

     icoms  dailyWellnessCheckinData | recordedWellnessEntry   (one or other)
            userDefinedCustomInfo    (input, optional)
            wellnessSessionRecord    (input, optional)
            summaryPrompt            (control, optional)
     ---------------------------------------------------------------------- */
  function maintainWellnessHistory(icoms) {
    var io = icoms || {};
    var ingested;

    if (io.dailyWellnessCheckinData) {
      ingested = ingestCheckInData(io.dailyWellnessCheckinData, io.userDefinedCustomInfo);
    } else {
      /* WRS-1.1.2: an entry the Daily Check-In Subsystem already recorded.
         Re-ingested so there is one entry shape and one screening payload,
         whichever door the data came in through. */
      ingested = ingestCheckInData(io.recordedWellnessEntry, io.userDefinedCustomInfo);
    }

    var persisted = persistSessionRecord(ingested.recordedWellnessEntry, {
      wellnessSessionRecord: io.wellnessSessionRecord,
      summaryPrompt: io.summaryPrompt
    });

    return {
      recordedWellnessEntry: ingested.recordedWellnessEntry,
      wellnessSessionRecord: persisted.wellnessSessionRecord,
      updatedWellnessHistory: persisted.updatedWellnessHistory,
      highRiskAlert: screenForHighRiskAlerts(ingested.screeningEntryPayload),
      stored: persisted.stored
    };
  }

  HM.records = {
    functionId: "F.3.3",
    mechanismId: "C.3.3",
    maintainWellnessHistory: maintainWellnessHistory,
    ingestCheckInData: ingestCheckInData,
    persistSessionRecord: persistSessionRecord,
    screenForHighRiskAlerts: screenForHighRiskAlerts,
    criteria: criteria
  };
})(window.HM);
