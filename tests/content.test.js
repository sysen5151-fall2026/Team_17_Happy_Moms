/* Integrity of the content library. Run this after editing hm-content.js:
   it catches a bad source key, a duplicate id, or a six-letter puzzle word
   before it reaches the page. */
module.exports = function (HM, t) {
  const C = HM.content;

  // ---- ids and references
  t.check("tip ids are unique", new Set(C.tips.map((x) => x.id)).size === C.tips.length, C.tips.length + " tips");
  t.check("knowledge base ids are unique", new Set(C.kb.map((x) => x.id)).size === C.kb.length, C.kb.length + " entries");
  t.check("every tip names a known source", C.tips.every((x) => HM.config.sources[x.source]));
  t.check("every answer names a known source", C.kb.every((x) => HM.config.sources[x.source]));
  t.check("every tip sits in a declared topic", C.tips.every((x) => C.topics.some((tp) => tp.id === x.topic)));
  t.check("tip symptom links point at real symptoms",
    C.tips.every((x) => (x.forSymptoms || []).every((s) => C.symptomLabels[s])));
  t.check("answer related-links point at real tips",
    C.kb.every((x) => (x.related || []).every((id) => C.tipById(id))));

  // ---- every topic has something in it
  C.topics.forEach((topic) => {
    t.check("topic has cards: " + topic.label, C.tipsForTopic(topic.id).length > 0,
      C.tipsForTopic(topic.id).length + " cards");
  });

  // ---- writing quality gates
  t.check("tip titles are short", C.tips.every((x) => x.title.length <= 46));
  t.check("tip bodies are substantial", C.tips.every((x) => x.body.split(/\s+/).length >= 12));
  t.check("answers are readable in a chat bubble",
    C.kb.every((x) => {
      const n = x.answer.split(/\s+/).length;
      return n >= 25 && n <= 130;
    }));
  t.check("every answer has keywords", C.kb.every((x) => x.keywords.length > 0));

  // ---- safety: content must not diagnose or prescribe
  const banned = [
    { re: /\bsafe (?:for you|to take)\b/i, why: "claims safety" },
    { re: /\byou should take\b/i, why: "prescribes" },
    { re: /\bI recommend\b/i, why: "prescribes" },
    { re: /\bdiagnos(?:e|is) you\b/i, why: "diagnoses" },
    { re: /\byou (?:have|likely have)\b[^.]{0,40}\b(?:diabetes|preeclampsia|infection|anemia|depression)\b/i, why: "diagnoses" }
  ];
  const offenders = [];
  C.tips.concat(C.kb).forEach((item) => {
    const text = item.body || item.answer;
    banned.forEach((rule) => {
      if (rule.re.test(text)) offenders.push(item.id + " (" + rule.why + ")");
    });
  });
  t.check("no content diagnoses or prescribes", offenders.length === 0, offenders.join(", "));

  // ---- the medication answer must defer rather than clear anything
  const med = C.kb.find((x) => x.id === "kb-medication");
  t.check("medication answer defers to a provider or pharmacist", /provider or pharmacist/i.test(med.answer));

  // ---- the scope answer must be honest about what this is
  const scope = C.kb.find((x) => x.id === "kb-scope");
  t.check("scope answer says nothing is generated", /does not generate/i.test(scope.answer));
  t.check("scope answer says it cannot diagnose", /cannot diagnose/i.test(scope.answer));

  // ---- mental health support is reachable from the content
  t.check("mood answer names the 988 line", C.kb.find((x) => x.id === "kb-mood").answer.includes("988"));

  // ---- urgent signs
  t.check("urgent signs have unique codes",
    new Set(C.urgentSigns.map((s) => s.value)).size === C.urgentSigns.length);
  t.check("urgent signs are categorised",
    C.urgentSigns.every((s) => s.category === "medical" || s.category === "mental"));
  t.check("mental-health signs exist", C.urgentSigns.some((s) => s.category === "mental"));
  t.check("urgent labels resolve", C.urgentSigns.every((s) => C.urgentLabels[s.value] === s.label));
  t.check("urgent signs are not mixed into the everyday symptom list",
    C.urgentSigns.every((s) => !C.symptomLabels[s.value]));

  // ---- check-in questions
  const ids = C.checkin.map((q) => q.id);
  t.check("check-in question ids are unique", new Set(ids).size === ids.length);
  t.check("scale questions carry captions",
    C.checkin.filter((q) => q.type === "scale").every((q) => q.captions && q.captions.length === 5));
  t.check("choice questions carry options",
    C.checkin.filter((q) => q.type === "choice").every((q) => q.options && q.options.length >= 2));
  t.check("numeric questions declare a direction",
    C.checkin.filter((q) => q.type === "scale" || q.type === "choice")
      .every((q) => q.direction === "higherBetter" || q.direction === "lowerBetter"));

  // ---- puzzle words
  t.check("puzzle words are five letters", C.puzzleWords.every((w) => /^[A-Z]{5}$/.test(w.word)),
    C.puzzleWords.length + " words");
  t.check("puzzle words are unique", new Set(C.puzzleWords.map((w) => w.word)).size === C.puzzleWords.length);
  t.check("every puzzle word teaches something", C.puzzleWords.every((w) => w.note && w.note.length > 20));
  t.check("enough words for two months without repeating", C.puzzleWords.length >= 60,
    C.puzzleWords.length + " words");

  // ---- daily rotation
  t.check("daily pick is stable for a date",
    C.dailyIndex("2026-09-29", 50) === C.dailyIndex("2026-09-29", 50));
  t.check("daily pick changes day to day",
    C.dailyIndex("2026-09-29", 50) !== C.dailyIndex("2026-09-30", 50));
  t.check("daily pick stays in range",
    [...Array(40)].every((_, i) => {
      const idx = C.dailyIndex("2026-10-" + String((i % 28) + 1).padStart(2, "0"), 17);
      return idx >= 0 && idx < 17;
    }));
};
