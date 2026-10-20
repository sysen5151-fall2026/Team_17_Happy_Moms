/* Mood screening (UC.7, need N-10): EPDS scoring against hand-scored
   vectors, self-harm routing, result bands, and wording. */
const fs = require("fs");
const path = require("path");
const { ROOT } = require("./harness");

module.exports = function (HM, t) {
  const S = HM.screening;

  /* Answers are option indexes, 0 = top option. Items 1, 2, 4 score the
     index; items 3 and 5-10 score 3 minus the index. Each vector below was
     scored by hand from the published key. */
  const vectors = [
    { name: "lowest possible score", a: [0, 0, 3, 0, 3, 3, 3, 3, 3, 3], total: 0, anx: 0, item10: 0, band: "below" },
    { name: "every bottom option", a: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], total: 9, anx: 3, item10: 0, band: "below" },
    { name: "one below the positive cutoff", a: [1, 1, 1, 1, 1, 1, 3, 3, 3, 3], total: 9, anx: 5, item10: 0, band: "below" },
    { name: "exactly the positive cutoff", a: [1, 1, 1, 1, 1, 1, 2, 3, 3, 3], total: 10, anx: 5, item10: 0, band: "positive" },
    { name: "one below the call cutoff", a: [1, 1, 1, 1, 1, 1, 1, 2, 3, 3], total: 12, anx: 5, item10: 0, band: "positive" },
    { name: "exactly the call cutoff", a: [1, 1, 1, 1, 1, 1, 1, 1, 3, 3], total: 13, anx: 5, item10: 0, band: "call" },
    { name: "every top option", a: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 21, anx: 6, item10: 3, band: "urgent" },
    { name: "highest possible score", a: [3, 3, 0, 3, 0, 0, 0, 0, 0, 0], total: 30, anx: 9, item10: 3, band: "urgent" },
    { name: "low total but item 10 'hardly ever'", a: [0, 0, 3, 0, 3, 3, 3, 3, 3, 2], total: 1, anx: 0, item10: 1, band: "urgent" }
  ];

  // ---- StR7.2: scoring follows the published key
  const wrong = vectors.filter((v) => {
    const r = S.score(v.a);
    return !r || r.total !== v.total || r.anxiety3A !== v.anx || r.item10 !== v.item10 || r.band !== v.band;
  }).map((v) => v.name + " -> " + JSON.stringify(S.score(v.a)));
  t.check("N-10 EPDS scoring matches the key (" + vectors.length + " hand-scored vectors)", wrong.length === 0, wrong.join(" | "));

  t.equal("N-10 the EPDS has ten items", S.items.length, 10);
  t.check("N-10 every item has four answers", S.items.every((i) => i.options.length === 4));
  t.equal("N-10 items 3 and 5-10 are reverse-scored",
    S.items.filter((i) => i.reverse).map((i) => i.n).join(","), "3,5,6,7,8,9,10");
  t.check("N-10 cutoffs follow the design doc", S.cutoffs.positive === 10 && S.cutoffs.call === 13);

  // ---- a partial or malformed EPDS has no score
  t.check("N-10 nine answers are not scored", S.score([0, 0, 0, 0, 0, 0, 0, 0, 0]) === null);
  t.check("N-10 a skipped answer is not scored", S.score([0, 0, null, 0, 0, 0, 0, 0, 0, 0]) === null);
  t.check("N-10 an out-of-range answer is not scored", S.score([0, 0, 4, 0, 0, 0, 0, 0, 0, 0]) === null);
  t.check("N-10 a fractional answer is not scored", S.score([0, 0, 1.5, 0, 0, 0, 0, 0, 0, 0]) === null);

  // ---- StR7.3: the self-harm item routes on its own, before any total
  const only10 = (i) => { const a = []; a[9] = i; return a; };
  t.check("N-10 self-harm answer routes to urgent help: 'Yes, quite often'", S.needsUrgentHelp(only10(0)));
  t.check("N-10 self-harm answer routes to urgent help: 'Sometimes'", S.needsUrgentHelp(only10(1)));
  t.check("N-10 self-harm answer routes to urgent help: 'Hardly ever'", S.needsUrgentHelp(only10(2)));
  t.check("N-10 'Never' does not route to urgent help", !S.needsUrgentHelp(only10(3)));
  t.check("N-10 urgent routing needs only item 10, not a full score", S.score(only10(1)) === null && S.needsUrgentHelp(only10(1)));
  t.equal("N-10 an urgent result still reports what the total alone suggests",
    S.score([0, 0, 3, 0, 3, 3, 3, 3, 3, 2]).totalBand, "below");

  // ---- StR7.4: a high total recommends the provider
  t.check("N-10 high score recommends the provider",
    /provider soon/i.test(S.messages.call.body) &&
    /provider/i.test(S.messages.positive.title + " " + S.messages.positive.body));
  t.check("N-10 a sparse answer list is not scored", S.score(only10(3)) === null);
  t.check("N-10 urgent message offers 988", /988/.test(S.messages.urgent.body));
  t.check("N-10 a lower score is not presented as all clear", /doesn't rule anything out/i.test(S.messages.below.body));

  // ---- StR7.6: no diagnosis, risk level, or medicine advice in screening copy
  const copy = [
    ...Object.values(S.messages).flatMap((m) => [m.title, m.body]),
    fs.readFileSync(path.join(ROOT, "html", "mood-check.html"), "utf8"),
    fs.readFileSync(path.join(ROOT, "js", "hm-moodcheck.js"), "utf8")
  ].join("\n");
  const banned = [
    { re: /\byou (?:have|likely have|may have|probably have)\b[^.]{0,30}\bdepression\b/i, why: "diagnoses" },
    { re: /\bhigh[- ]risk\b/i, why: "risk label" },
    { re: /\byour risk\b/i, why: "risk label" },
    { re: /\b\d+(?:\.\d+)?\s?%/, why: "percentage" },
    { re: /\byou(?:'re| are) fine\b/i, why: "false reassurance" },
    { re: /\byou should (?:take|stop|start)\b/i, why: "medicine advice" }
  ];
  const offenders = banned.filter((b) => b.re.test(copy)).map((b) => b.why + " " + b.re);
  t.check("N-10 screening copy does not diagnose", offenders.length === 0, offenders.join(", "));

  // ---- the saved record matches the design doc's data contract
  const profile = { dueDate: HM.dates.toKey(HM.dates.addDays(new Date(2026, 9, 19), 98)) };
  const rec = S.record([1, 1, 1, 1, 1, 1, 2, 3, 3, 3], profile, new Date(2026, 9, 19));
  t.check("N-10 a record carries the score and band", rec && rec.total === 10 && rec.band === "positive" && rec.instrument === "EPDS");
  t.check("N-10 a record keeps raw answers for re-scoring", rec && rec.answers.join("") === "1111112333");
  t.check("N-10 a record notes the gestational week", rec && rec.phase === "pregnancy" && rec.week === 26, rec && rec.week);
  t.check("N-10 results stay off visit notes by default", rec && rec.shareOnNotes === false);
  t.check("N-10 an incomplete check makes no record", S.record([0, 0, 0], profile) === null);

  const migrated = HM.store.migrate({ checkins: {}, profile: {} });
  t.check("N-10 older saved data gains an empty screenings list", Array.isArray(migrated.screenings) && migrated.screenings.length === 0);
};
