/* Prediction inputs (need N-10): each variable is built from the right
   source, missing answers stay missing, and nothing from after the birth
   is used. Examples A and B match the worked examples in the design notes. */
module.exports = function (HM, t) {
  const R = HM.risk;
  const today = new Date(2026, 9, 19); // 19 October 2026
  const key = (offset) => HM.dates.toKey(HM.dates.addDays(today, offset));

  function checkins(days, entry) {
    const out = {};
    for (let i = 0; i < days; i++) out[key(-i)] = Object.assign({ date: key(-i) }, entry);
    return out;
  }

  // ---- Example B: several strong factors, every input answered
  const b = R.features({
    profile: { dueDate: key(70) },
    riskProfile: {
      priorDepression: "yes", priorPpd: "yes", supportLevel: 1,
      lifeEvents: ["moved", "jobLoss"], pregnancyComplications: []
    },
    screenings: [
      { instrument: "EPDS", phase: "pregnancy", takenOn: key(-50), total: 8, anxiety3A: 3 },
      { instrument: "EPDS", phase: "pregnancy", takenOn: key(-9), total: 16, anxiety3A: 6 }
    ],
    checkins: checkins(10, { mood: 2, sleepHours: 5, sleepQuality: 2 })
  }, today).values;

  t.equal("N-10 inputs: latest mood check score", b.epds_total_latest, 16);
  t.equal("N-10 inputs: highest mood check score", b.epds_max, 16);
  t.equal("N-10 inputs: anxiety sub-score comes from the latest check", b.epds_anxiety_3a, 6);
  t.check("N-10 inputs: history answers become 1", b.prior_depression === 1 && b.prior_ppd === 1);
  t.equal("N-10 inputs: support level", b.support_level, 1);
  t.equal("N-10 inputs: life events are counted", b.life_events_count, 2);
  t.check("N-10 inputs: 'none' complications become 0, not missing",
    b.preeclampsia === 0 && b.prenatal_hospital === 0 && b.preeclampsia_missing === 0);
  t.check("N-10 inputs: 14-day averages from daily check-ins",
    b.mood_mean_14d === 2 && b.sleep_hours_mean_14d === 5 && b.sleep_quality_mean_14d === 2);
  t.check("N-10 inputs: nothing missing when everything is answered",
    Object.keys(b).filter((k) => k.endsWith("_missing")).every((k) => b[k] === 0));
  t.equal("N-10 inputs: there are twelve inputs", R.catalog.length, 12);
  t.check("N-10 inputs: every catalog entry is a built input",
    R.catalog.every((c) => c.name in b && (c.name + "_missing") in b));

  // ---- Example A: little answered yet
  const a = R.features({
    profile: { dueDate: key(70) },
    riskProfile: { priorDepression: "skip", priorPpd: "first" },
    screenings: [],
    checkins: checkins(5, { mood: 4, sleepHours: 6.5, sleepQuality: 4 })
  }, today).values;

  t.check("N-10 inputs: 'prefer not to say' is missing, not 'no'",
    a.prior_depression === null && a.prior_depression_missing === 1);
  t.check("N-10 inputs: a first pregnancy counts as no earlier PPD", a.prior_ppd === 0 && a.prior_ppd_missing === 0);
  t.check("N-10 inputs: unanswered questions are missing",
    a.support_level === null && a.life_events_count === null && a.preeclampsia === null);
  t.check("N-10 inputs: no mood check yet leaves its scores missing",
    a.epds_total_latest === null && a.epds_total_latest_missing === 1);
  t.check("N-10 inputs: averages need at least 7 logged days in 14",
    a.mood_mean_14d === null && a.mood_mean_14d_missing === 1);

  // ---- caps and edge cases
  const capped = R.features({
    riskProfile: { lifeEvents: ["moved", "jobLoss", "money", "bereavement", "illness"] }
  }, today).values;
  t.equal("N-10 inputs: life events are capped at 3", capped.life_events_count, 3);
  t.equal("N-10 inputs: 'none of these' counts as 0 events",
    R.features({ riskProfile: { lifeEvents: [] } }, today).values.life_events_count, 0);
  t.check("N-10 inputs: an empty state builds without errors",
    R.features({}, today).values.epds_total_latest === null);

  // ---- StR7.10: only information from before the birth
  const birth = key(-14);
  const after = R.features({
    profile: { postpartum: true, birthDate: birth },
    riskProfile: { pregnancyComplications: ["preeclampsia"] },
    screenings: [
      { instrument: "EPDS", phase: "pregnancy", takenOn: key(-20), total: 9, anxiety3A: 2 },
      { instrument: "EPDS", phase: "postpartum", takenOn: key(-1), total: 20, anxiety3A: 7 }
    ],
    checkins: Object.assign(
      checkins(14, { mood: 1, sleepHours: 3.5, sleepQuality: 1 }),
      (() => {
        const before = {};
        for (let i = 15; i < 29; i++) before[key(-i)] = { date: key(-i), mood: 4, sleepHours: 6.5, sleepQuality: 4 };
        return before;
      })()
    )
  }, today);
  t.equal("N-10 risk is estimated before delivery: cutoff is the day before birth", after.asOf, key(-15));
  t.equal("N-10 risk is estimated before delivery: postpartum mood checks are left out", after.values.epds_total_latest, 9);
  t.equal("N-10 risk is estimated before delivery: check-ins after birth are left out", after.values.mood_mean_14d, 4);
  t.equal("N-10 inputs: preeclampsia flag", after.values.preeclampsia, 1);

  // ---- storage
  t.check("N-10 older saved data gains an empty About you profile",
    HM.store.migrate({ checkins: {} }).riskProfile === null);
};
