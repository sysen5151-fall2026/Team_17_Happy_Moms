/* Gestation maths, date helpers, streaks, and storage migration. */
module.exports = function (HM, t) {
  const ref = new Date(2026, 8, 29); // 29 September 2026

  // ---- gestational age is counted back from the due date (40w0d at the EDD)
  const g = HM.gestation.of({ dueDate: "2026-12-25" }, ref);
  t.equal("87 days until the due date", g.daysToDue, 87);
  t.equal("gestational week", g.week, 27);
  t.equal("gestational day", g.day, 4);
  t.equal("trimester", g.trimester, 2);
  t.equal("phase name", g.phase, "Second trimester");

  const atDue = HM.gestation.of({ dueDate: "2026-09-29" }, ref);
  t.equal("40w0d on the due date", atDue.week + "w" + atDue.day + "d", "40w0d");
  t.equal("due date is third trimester", atDue.trimester, 3);

  const late = HM.gestation.of({ dueDate: "2026-09-26" }, ref);
  t.check("past the due date sets overdue", late.overdue === true);

  // 210 days out is 10 weeks along, which is the first trimester
  const early = HM.gestation.of({ dueDate: HM.dates.toKey(HM.dates.addDays(ref, 210)) }, ref);
  t.equal("ten weeks along", early.week, 10);
  t.equal("week 10 is the first trimester", early.trimester, 1);

  // the boundary itself: week 14 starts the second trimester
  const boundary = HM.gestation.of({ dueDate: HM.dates.toKey(HM.dates.addDays(ref, 182)) }, ref);
  t.equal("week 14 is the second trimester", boundary.week + ":" + boundary.trimester, "14:2");

  const pp = HM.gestation.of({ postpartum: true, birthDate: "2026-09-01" }, ref);
  t.equal("postpartum label", pp.label, "Week 4 postpartum");
  t.equal("postpartum trimester", pp.trimester, 4);

  t.check("no due date is reported as unknown", HM.gestation.of({}, ref).known === false);

  // ---- dates
  t.equal("days between two dates", HM.dates.daysBetween("2026-09-01", "2026-09-29"), 28);
  t.equal("key round trip", HM.dates.toKey(HM.dates.fromKey("2026-03-07")), "2026-03-07");
  t.equal("adding a day crosses the month", HM.dates.toKey(HM.dates.addDays("2026-01-31", 1)), "2026-02-01");
  t.equal("leap day", HM.dates.toKey(HM.dates.addDays("2028-02-28", 1)), "2028-02-29");
  t.equal("recentKeys length", HM.dates.recentKeys(5).length, 5);
  t.check("recentKeys ends today", HM.dates.recentKeys(5)[4] === HM.dates.todayKey());

  // ---- stats
  t.equal("mean", HM.stats.round(HM.stats.mean([3, 4, 5, 4]), 2), 4);
  t.check("mean of nothing is null", HM.stats.mean([]) === null);
  t.equal("mean ignores non-numbers", HM.stats.round(HM.stats.mean([2, null, "x", 4]), 1), 3);

  const today = HM.dates.todayKey();
  const back = (n) => HM.dates.toKey(HM.dates.addDays(new Date(), -n));

  t.equal("streak of three", HM.stats.streak({ [today]: {}, [back(1)]: {}, [back(2)]: {} }), 3);
  t.equal("streak of one", HM.stats.streak({ [today]: {} }), 1);
  t.equal("yesterday still counts", HM.stats.streak({ [back(1)]: {}, [back(2)]: {} }), 2);
  t.equal("a gap breaks the streak", HM.stats.streak({ [today]: {}, [back(3)]: {} }), 1);
  t.equal("no entries, no streak", HM.stats.streak({}), 0);

  // ---- storage
  const migrated = HM.store.migrate({
    profile: { dueDate: "2027-01-01" },
    checkins: { "2026-09-01": { mood: 4 } }
  });
  t.equal("migration keeps the due date", migrated.profile.dueDate, "2027-01-01");
  t.equal("migration fills in new settings", migrated.settings.theme, "light");
  t.equal("migration keeps check-ins", Object.keys(migrated.checkins).length, 1);
  t.check("migration adds missing collections", Array.isArray(migrated.questions) && Array.isArray(migrated.favorites));
  t.check("migration adds the lastVisit field", "lastVisit" in migrated.profile);

  HM.store.update((s) => { s.profile.name = "Ada"; });
  t.equal("update writes through", HM.store.load().profile.name, "Ada");
  HM.store.reset();
  t.equal("reset clears the profile", HM.store.load().profile.name, "");

  // ---- escaping
  t.equal("html escaping", HM.dom.escapeHtml('<b>"x"</b>'), "&lt;b&gt;&quot;x&quot;&lt;/b&gt;");
};
