/* ==========================================================================
   Happy Moms — prediction inputs (need N-10)
   Turns what she has told the app into the input variables the before-
   delivery prediction uses: her About you answers, her mood checks (EPDS),
   and her daily check-ins. Pure functions over saved state.

   Design: Post_Partum/PPD_System_Design.md, sections 3 and 5. Only
   information from before the birth is used; once a birth date is set,
   anything dated on or after it is left out.

   This file builds the inputs only. The interim rule and the trained model
   that turn them into a watch level are phases 4 and 5.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  /* The About you questions. `value` is what is saved in riskProfile;
     "skip" (prefer not to say, not sure) is saved too, and becomes a missing
     input rather than a "no". */
  var QUESTIONS = [
    {
      id: "priorDepression",
      label: "Have you ever been treated for depression, or told by a professional that you had it?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "skip", label: "Not sure, or prefer not to say" }
      ]
    },
    {
      id: "priorPpd",
      label: "After an earlier pregnancy, did you have depression in the year after the birth?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "first", label: "This is my first pregnancy" },
        { value: "skip", label: "Not sure, or prefer not to say" }
      ]
    },
    {
      id: "supportLevel",
      label: "Once the baby arrives, how many people can you count on for practical help?",
      hint: "Cooking, a few hours of baby care, a lift to an appointment.",
      options: [
        { value: 0, label: "No one" },
        { value: 1, label: "One person" },
        { value: 2, label: "Two people" },
        { value: 3, label: "Three or four people" },
        { value: 4, label: "Five or more" }
      ]
    },
    {
      id: "lifeEvents",
      multi: true,
      label: "In the past 12 months, have any of these happened to you?",
      hint: "Choose any that apply, or none.",
      options: [
        { value: "moved", label: "Moved home" },
        { value: "jobLoss", label: "You or your partner lost a job or income" },
        { value: "money", label: "Serious money worries, such as trouble paying bills" },
        { value: "bereavement", label: "Someone close to you died" },
        { value: "illness", label: "You or someone close was seriously ill or hurt" },
        { value: "otherStress", label: "Another major stress" }
      ]
    },
    {
      id: "pregnancyComplications",
      multi: true,
      label: "During this pregnancy, have you had either of these?",
      hint: "Choose any that apply, or none.",
      options: [
        { value: "preeclampsia", label: "Preeclampsia" },
        { value: "prenatalHospital", label: "A hospital stay of one night or longer" }
      ]
    }
  ];

  var LIFE_EVENTS_CAP = 3;
  var TREND_DAYS = 14;
  var TREND_MIN_LOGGED = 7;

  function blankProfile() {
    return {
      updatedAt: "",
      priorDepression: null,
      priorPpd: null,
      supportLevel: null,
      lifeEvents: null,            // null = never answered, [] = answered "none"
      pregnancyComplications: null,
      shareOnNotes: false
    };
  }

  /* ----------------------------------------------------------- helpers */

  function yesNo(value) {
    if (value === "yes") return 1;
    if (value === "no" || value === "first") return 0;
    return null;
  }

  /* The last day whose information may be used. Before birth, that's the
     reference day. After birth, it's the day before the birth date. */
  function cutoffKey(profile, today) {
    var todayKey = HM.dates.toKey(today || new Date());
    if (profile && profile.birthDate) {
      var dayBefore = HM.dates.toKey(HM.dates.addDays(profile.birthDate, -1));
      return dayBefore < todayKey ? dayBefore : todayKey;
    }
    return todayKey;
  }

  function trendInputs(checkins, endKey) {
    var mood = [], hours = [], quality = [];
    for (var i = 0; i < TREND_DAYS; i++) {
      var entry = (checkins || {})[HM.dates.toKey(HM.dates.addDays(endKey, -i))];
      if (!entry) continue;
      mood.push(entry.mood);
      hours.push(entry.sleepHours);
      quality.push(entry.sleepQuality);
    }
    var enough = HM.stats.numbers(mood).length >= TREND_MIN_LOGGED;
    function avg(list) { return enough ? HM.stats.round(HM.stats.mean(list), 1) : null; }
    return {
      logged: HM.stats.numbers(mood).length,
      mood_mean_14d: avg(mood),
      sleep_hours_mean_14d: avg(hours),
      sleep_quality_mean_14d: avg(quality)
    };
  }

  /* ----------------------------------------------------------- features */

  /* Every input variable, with a 0/1 missing flag for each, as the design
     doc's feature table defines them. */
  function features(state, today) {
    var s = state || {};
    var profile = s.profile || {};
    var rp = Object.assign(blankProfile(), s.riskProfile || {});
    var endKey = cutoffKey(profile, today);

    var checks = (s.screenings || []).filter(function (x) {
      return x.instrument === "EPDS" && x.phase !== "postpartum" && x.takenOn <= endKey;
    });
    var latest = checks.length ? checks[checks.length - 1] : null;
    var maxTotal = checks.reduce(function (m, x) { return Math.max(m, x.total); }, -1);

    var complications = rp.pregnancyComplications;
    var trend = trendInputs(s.checkins, endKey);

    var values = {
      prior_depression: yesNo(rp.priorDepression),
      prior_ppd: yesNo(rp.priorPpd),
      epds_total_latest: latest ? latest.total : null,
      epds_max: latest ? maxTotal : null,
      epds_anxiety_3a: latest ? latest.anxiety3A : null,
      support_level: typeof rp.supportLevel === "number" ? rp.supportLevel : null,
      life_events_count: Array.isArray(rp.lifeEvents) ? Math.min(rp.lifeEvents.length, LIFE_EVENTS_CAP) : null,
      preeclampsia: Array.isArray(complications) ? (complications.indexOf("preeclampsia") !== -1 ? 1 : 0) : null,
      prenatal_hospital: Array.isArray(complications) ? (complications.indexOf("prenatalHospital") !== -1 ? 1 : 0) : null,
      mood_mean_14d: trend.mood_mean_14d,
      sleep_hours_mean_14d: trend.sleep_hours_mean_14d,
      sleep_quality_mean_14d: trend.sleep_quality_mean_14d
    };

    Object.keys(values).forEach(function (k) {
      values[k + "_missing"] = values[k] === null ? 1 : 0;
    });

    return {
      values: values,
      asOf: endKey,
      checkinsLogged: trend.logged,
      latestCheckOn: latest ? latest.takenOn : null
    };
  }

  /* What each input is and where its value comes from, for the inputs
     panel. Order follows the design doc's feature table. */
  var CATALOG = [
    { name: "epds_total_latest", label: "Latest mood check score", unit: "of 30", source: "Mood check", measures: "Depression in pregnancy" },
    { name: "epds_max", label: "Highest mood check score", unit: "of 30", source: "Mood check", measures: "Depression in pregnancy" },
    { name: "epds_anxiety_3a", label: "Anxiety sub-score", unit: "of 9", source: "Mood check, questions 3–5", measures: "Anxiety in pregnancy" },
    { name: "prior_depression", label: "Earlier depression", unit: "yes/no", source: "About you", measures: "History of depression" },
    { name: "prior_ppd", label: "Earlier postpartum depression", unit: "yes/no", source: "About you", measures: "History of depression" },
    { name: "support_level", label: "People to count on", unit: "0–4", source: "About you", measures: "Social support" },
    { name: "life_events_count", label: "Stressful events, past year", unit: "0–3", source: "About you", measures: "Stressful life events" },
    { name: "preeclampsia", label: "Preeclampsia", unit: "yes/no", source: "About you", measures: "Pregnancy complications" },
    { name: "prenatal_hospital", label: "Hospital stay in pregnancy", unit: "yes/no", source: "About you", measures: "Pregnancy complications" },
    { name: "mood_mean_14d", label: "Average daily mood, 14 days", unit: "1–5", source: "Daily check-in", measures: "Depression in pregnancy" },
    { name: "sleep_hours_mean_14d", label: "Average sleep, 14 days", unit: "hours", source: "Daily check-in", measures: "Sleep" },
    { name: "sleep_quality_mean_14d", label: "Average sleep quality, 14 days", unit: "1–5", source: "Daily check-in", measures: "Sleep" }
  ];

  HM.risk = {
    questions: QUESTIONS,
    catalog: CATALOG,
    blankProfile: blankProfile,
    features: features,
    cutoffKey: cutoffKey,
    limits: { lifeEventsCap: LIFE_EVENTS_CAP, trendDays: TREND_DAYS, trendMinLogged: TREND_MIN_LOGGED }
  };
})(window.HM);
