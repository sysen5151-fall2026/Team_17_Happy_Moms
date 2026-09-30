/* Trend maths, coverage, sample data, puzzle scoring, and chart output. */
module.exports = function (HM, t) {
  // ---------- sample data drives most of what follows
  HM.sample.load();
  const state = HM.store.load();

  t.check("sample sets a due date", !!state.profile.dueDate, state.profile.dueDate);
  t.check("sample creates three weeks of entries", Object.keys(state.checkins).length >= 15,
    Object.keys(state.checkins).length + " entries");
  t.check("sample leaves gaps, as real use does",
    Object.keys(state.checkins).length < 21, "some days skipped");

  const g = HM.gestation.of(state.profile);
  t.check("sample lands in a plausible week", g.week > 20 && g.week < 32, "week " + g.week);

  // ---------- coverage: numerator and denominator use the same buckets
  const cov = HM.insights.coverage(state);
  t.check("coverage is a percentage", cov.percent > 0 && cov.percent <= 100, cov.percent + "%");
  t.check("weeks with an entry never exceed weeks tracked",
    cov.weeksWithEntry <= cov.weeksTracked, cov.weeksWithEntry + "/" + cov.weeksTracked);
  t.check("coverage counts every entry", cov.totalEntries === Object.keys(state.checkins).length);

  // ---------- series
  const mood = HM.insights.series(state, "mood", 14);
  t.check("series has one point per day", mood.length === 14);
  t.check("missed days become gaps, not zeros", mood.some((p) => p.value === null));
  t.check("series values stay inside the scale",
    mood.every((p) => p.value === null || (p.value >= 1 && p.value <= 5)));

  const sleep = HM.insights.average(state, "sleepHours", 14);
  t.check("sleep average is plausible", sleep > 3 && sleep < 10, sleep.toFixed(2) + " h");

  const delta = HM.insights.delta(state, "energy");
  t.check("week-over-week comparison is available", delta.comparable);
  t.check("delta arithmetic is consistent",
    Math.abs((delta.current - delta.previous) - delta.change) < 1e-9);

  // ---------- symptoms
  const symptoms = HM.insights.symptomCounts(state, 14);
  t.check("symptoms are counted", symptoms.length > 0,
    symptoms.slice(0, 3).map((s) => s.label + ":" + s.count).join(", "));
  t.check("symptom labels are resolved for display", symptoms.every((s) => s.label !== s.value));
  t.check("symptoms are ordered by frequency",
    symptoms.every((s, i) => i === 0 || symptoms[i - 1].count >= s.count));

  // ---------- observations
  const obs = HM.insights.observations(state);
  t.check("observations are produced", obs.length > 0, obs.length + " statements");
  t.check("observation kinds are known",
    obs.every((o) => ["good", "watch", "urgent", "info"].includes(o.kind)));
  t.check("observations read as sentences",
    obs.every((o) => /[.!]$/.test(o.text.trim())));

  // ---------- urgent entries are surfaced and lead the list
  HM.store.update((s) => {
    const key = HM.dates.toKey(HM.dates.addDays(new Date(), -1));
    s.checkins[key] = Object.assign(s.checkins[key] || { date: key }, { urgent: ["bleeding"], symptoms: [] });
  });
  const withUrgent = HM.store.load();
  const events = HM.insights.urgentEvents(withUrgent, 30);
  t.check("urgent markings are found", events.length >= 1);
  t.check("urgent codes resolve to labels", events[0].signs[0] === "Vaginal bleeding", events[0].signs[0]);
  t.check("urgent observations come first", HM.insights.observations(withUrgent)[0].kind === "urgent");

  // ---------- clearing sample data keeps anything the user entered
  const todayKey = HM.dates.todayKey();
  HM.store.update((s) => { s.checkins[todayKey] = { date: todayKey, mood: 5, symptoms: [], urgent: [] }; });
  HM.sample.clear();
  const after = HM.store.load();
  t.check("a real entry survives clearing the sample", !!after.checkins[todayKey]);
  t.check("sample entries are gone", Object.values(after.checkins).every((e) => !e.sample),
    Object.keys(after.checkins).length + " left");
  t.check("sample questions are gone", after.questions.every((q) => !q.sample));
  t.check("the sample flag is cleared", HM.sample.isLoaded(after) === false);

  // ---------- empty state must not throw or mislead
  HM.store.reset();
  const empty = HM.store.load();
  t.check("no data means zero coverage", HM.insights.coverage(empty).percent === 0);
  const emptyObs = HM.insights.observations(empty);
  t.check("no data yields one informational note",
    emptyObs.length === 1 && emptyObs[0].kind === "info");

  // ---------- charts survive real and degenerate input
  const svgOk = (svg) => svg.startsWith("<svg") && svg.endsWith("</svg>") && !svg.includes("NaN") && !svg.includes("undefined");
  t.check("line chart renders", svgOk(HM.charts.line(mood, { domain: [1, 5], ariaLabel: "Mood" })));
  t.check("line chart carries an accessible label",
    HM.charts.line(mood, { ariaLabel: "Mood over 14 days" }).includes('aria-label="Mood over 14 days"'));
  t.check("line chart with no data renders",
    svgOk(HM.charts.line([{ label: "a", value: null }, { label: "b", value: null }], {})));
  t.check("line chart with one point renders",
    svgOk(HM.charts.line([{ label: "a", value: 3 }], { domain: [1, 5] })));
  t.check("line chart with a flat series renders",
    svgOk(HM.charts.line([{ label: "a", value: 3 }, { label: "b", value: 3 }], {})));
  t.check("bar chart renders", svgOk(HM.charts.bars([{ label: "Back pain", value: 4 }], {})));
  t.check("bar chart with a zero value renders", svgOk(HM.charts.bars([{ label: "None", value: 0 }], {})));
  t.check("ring renders", svgOk(HM.charts.ring(62, { caption: "weeks" })));
  t.check("ring clamps out-of-range input", svgOk(HM.charts.ring(140, {})) && HM.charts.ring(140, {}).includes("100%"));
  t.check("sparkline renders", svgOk(HM.charts.spark([1, 2, 3, 4], { domain: [1, 5] })));
  t.check("sparkline with one point degrades gracefully", svgOk(HM.charts.spark([3], {})));

  // ---------- puzzle scoring, including repeated letters
  t.equal("exact match", HM.puzzle.score("WATER", "WATER").join(","), "correct,correct,correct,correct,correct");
  t.equal("no overlap", HM.puzzle.score("XXXXX", "WATER").join(","), "absent,absent,absent,absent,absent");
  /* SEEDS against SLEEP: the S is green, the E at index 2 is green and eats
     one of the answer's two E's, leaving the E at index 1 yellow. The second
     S has nothing left to match, so it is grey. */
  t.equal("a repeated letter is only credited as often as it appears",
    HM.puzzle.score("SEEDS", "SLEEP").join(","), "correct,present,correct,absent,absent");

  /* One guessed letter, two in the answer: both are credited. */
  t.equal("two copies in the answer credit two in the guess",
    HM.puzzle.score("EERIE", "SLEEP").join(","), "present,present,absent,absent,absent");
  /* RIVET against WATER: E lines up at index 3, R and T are in the answer
     but misplaced, I and V are not there at all. */
  t.equal("letters in the answer but the wrong place",
    HM.puzzle.score("RIVET", "WATER").join(","), "present,absent,absent,correct,present");

  const word = HM.puzzle.wordForDate("2026-09-29");
  t.check("the daily word is five letters", /^[A-Z]{5}$/.test(word.word), word.word);
  t.check("the daily word is stable", HM.puzzle.wordForDate("2026-09-29").word === word.word);
  t.check("the word changes the next day", HM.puzzle.wordForDate("2026-09-30").word !== word.word);
};
