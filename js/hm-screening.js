/* ==========================================================================
   Happy Moms — mood screening (UC.7, need N-10)
   The Edinburgh Postnatal Depression Scale: its ten items, its published
   scoring key, and the routing that follows a result. Pure functions, so the
   scoring can be checked against hand-scored vectors in Node.

   Design: Post_Partum/PPD_System_Design.md, layers 0 and 1.
   EPDS: Cox JL, Holden JM, Sagovsky R. Detection of postnatal depression:
   development of the 10-item Edinburgh Postnatal Depression Scale.
   Br J Psychiatry 1987;150:782-6.

   This screens; it does not diagnose. A result only decides which next step
   to suggest, and the provider makes any clinical judgment (SPEC section 1).
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  /* Cutoffs are preliminary until clinical review (design doc O-1). The
     research paper uses 10 or more as a positive screen; 13 or more is the
     common higher cutoff for "probable depression". */
  var CUTOFFS = { positive: 10, call: 13 };

  /* Answers are stored as the option chosen, 0 = top option, so a change to
     the key or the cutoffs can re-score past checks. `reverse` items score
     3 for the top option down to 0; the others score 0 up to 3. */
  var ITEMS = [
    { n: 1, text: "I have been able to laugh and see the funny side of things", reverse: false,
      options: ["As much as I always could", "Not quite so much now", "Definitely not so much now", "Not at all"] },
    { n: 2, text: "I have looked forward with enjoyment to things", reverse: false,
      options: ["As much as I ever did", "Rather less than I used to", "Definitely less than I used to", "Hardly at all"] },
    { n: 3, text: "I have blamed myself unnecessarily when things went wrong", reverse: true,
      options: ["Yes, most of the time", "Yes, some of the time", "Not very often", "No, never"] },
    { n: 4, text: "I have been anxious or worried for no good reason", reverse: false,
      options: ["No, not at all", "Hardly ever", "Yes, sometimes", "Yes, very often"] },
    { n: 5, text: "I have felt scared or panicky for no very good reason", reverse: true,
      options: ["Yes, quite a lot", "Yes, sometimes", "No, not much", "No, not at all"] },
    { n: 6, text: "Things have been getting on top of me", reverse: true,
      options: [
        "Yes, most of the time I haven't been able to cope at all",
        "Yes, sometimes I haven't been coping as well as usual",
        "No, most of the time I have coped quite well",
        "No, I have been coping as well as ever"
      ] },
    { n: 7, text: "I have been so unhappy that I have had difficulty sleeping", reverse: true,
      options: ["Yes, most of the time", "Yes, sometimes", "Not very often", "No, not at all"] },
    { n: 8, text: "I have felt sad or miserable", reverse: true,
      options: ["Yes, most of the time", "Yes, quite often", "Not very often", "No, not at all"] },
    { n: 9, text: "I have been so unhappy that I have been crying", reverse: true,
      options: ["Yes, most of the time", "Yes, quite often", "Only occasionally", "No, never"] },
    { n: 10, text: "The thought of harming myself has occurred to me", reverse: true,
      options: ["Yes, quite often", "Sometimes", "Hardly ever", "Never"] }
  ];

  var SELF_HARM_ITEM = 10;
  var ANXIETY_ITEMS = [3, 4, 5]; // EPDS-3A subscale

  /* Points for one answer. Returns null for a missing or invalid answer. */
  function itemScore(itemIndex, optionIndex) {
    var item = ITEMS[itemIndex];
    if (!item || typeof optionIndex !== "number" || optionIndex < 0 || optionIndex > 3 ||
        Math.floor(optionIndex) !== optionIndex) {
      return null;
    }
    return item.reverse ? 3 - optionIndex : optionIndex;
  }

  /* Layer 0, run before any total: does the self-harm item need urgent help?
     Any answer other than "Never" does. Needs only that one answer, so it can
     run the moment item 10 is answered. */
  function needsUrgentHelp(answers) {
    var points = itemScore(SELF_HARM_ITEM - 1, (answers || [])[SELF_HARM_ITEM - 1]);
    return points !== null && points > 0;
  }

  function band(total, urgent) {
    if (urgent) return "urgent";
    if (total >= CUTOFFS.call) return "call";
    if (total >= CUTOFFS.positive) return "positive";
    return "below";
  }

  /* Layer 1. Requires all ten answers; returns null otherwise, because a
     partial EPDS has no validated meaning. */
  function score(answers) {
    if (!Array.isArray(answers) || answers.length !== ITEMS.length) return null;
    /* A plain loop, not map(): map skips the holes in a sparse array, which
       would let an unanswered item through as if it were answered. */
    var points = [];
    for (var i = 0; i < ITEMS.length; i++) {
      var p = itemScore(i, answers[i]);
      if (p === null) return null;
      points.push(p);
    }

    var total = points.reduce(function (a, b) { return a + b; }, 0);
    var anxiety3A = ANXIETY_ITEMS.reduce(function (sum, n) { return sum + points[n - 1]; }, 0);
    var item10 = points[SELF_HARM_ITEM - 1];
    var urgent = item10 > 0;

    return {
      total: total,
      anxiety3A: anxiety3A,
      item10: item10,
      points: points,
      band: band(total, urgent),
      /* The band the total alone gives, so an urgent result can still say
         what the rest of the answers suggest. */
      totalBand: band(total, false)
    };
  }

  /* What the result screen says for each band. Written to suggest a next
     step without naming a condition or a risk level (requirement StR7.6). */
  var MESSAGES = {
    below: {
      title: "Your answers are in the lower range",
      body: "A lower score doesn't rule anything out. If you feel unwell, or things change, tell your provider. " +
        "We'll offer this check again at your next scheduled point."
    },
    positive: {
      title: "It would help to talk with your provider",
      body: "Your answers suggest it would help to talk about how you've been feeling at your next visit. " +
        "If it feels more pressing than that, call sooner. Feelings like these are common and treatable."
    },
    call: {
      title: "Please talk with your provider soon",
      body: "Your answers suggest it would help to talk with your provider soon, ideally this week. " +
        "Feelings like these are common and treatable, and your provider can help you find support."
    },
    urgent: {
      title: "Please tell someone today",
      body: "You said the thought of harming yourself has come up. Please tell your provider today, " +
        "or call or text 988 now. You don't have to wait until your next visit."
    }
  };

  /* A saved record of one completed check, in the shape the design doc
     defines for `screenings[]`. */
  function record(answers, profile, today, trigger) {
    var result = score(answers);
    if (!result) return null;
    var date = today || new Date();
    var g = HM.gestation ? HM.gestation.of(profile || {}, date) : { known: false };
    return {
      id: "s" + (HM.dom ? HM.dom.uid() : Date.now().toString(36)),
      instrument: "EPDS",
      takenOn: HM.dates ? HM.dates.toKey(date) : "",
      phase: g.postpartum ? "postpartum" : "pregnancy",
      week: !g.known ? null : g.postpartum ? g.weeksPostpartum : g.week,
      trigger: trigger || "self",
      answers: answers.slice(),
      total: result.total,
      anxiety3A: result.anxiety3A,
      item10: result.item10,
      band: result.band,
      shareOnNotes: false
    };
  }

  HM.screening = {
    items: ITEMS,
    cutoffs: CUTOFFS,
    itemScore: itemScore,
    needsUrgentHelp: needsUrgentHelp,
    score: score,
    band: band,
    messages: MESSAGES,
    record: record,
    citation: "Edinburgh Postnatal Depression Scale. Cox JL, Holden JM, Sagovsky R. " +
      "Br J Psychiatry 1987;150:782-6."
  };
})(window.HM);
