/* The assistant's guardrails.

   The rule this suite exists to protect: a question containing a warning sign
   must never reach the knowledge base, no matter what else it mentions. */
module.exports = function (HM, t) {
  const A = HM.assistant;

  // ---- must intercept
  const urgent = [
    ["I am bleeding a lot", "medical"],
    ["there was spotting heavily this morning", "medical"],
    ["my water broke", "medical"],
    ["I have fluid leaking", "medical"],
    ["baby not moving since last night", "medical"],
    ["fewer kicks today than normal", "medical"],
    ["I have the worst headache of my life", "medical"],
    ["blurry vision and a headache", "medical"],
    ["severe abdominal pain on my right side", "medical"],
    ["chest pain and trouble breathing", "medical"],
    ["I have a fever of 102", "medical"],
    ["I cannot keep fluids down at all", "medical"],
    ["regular contractions every 5 minutes", "medical"],
    ["sudden swelling in my face and hands", "medical"],
    ["I fainted this morning", "medical"],
    ["pain in one leg that is red and warm", "medical"],
    ["I was in a car accident", "medical"],
    ["I want to kill myself", "mental"],
    ["I have been thinking about how to hurt myself", "mental"],
    ["I feel suicidal", "mental"],
    ["sometimes I want to hurt my baby", "mental"]
  ];

  urgent.forEach(([text, category]) => {
    const flag = A.screenForRedFlags(text);
    t.check("escalates: " + text, flag && flag.category === category,
      flag ? flag.category : "NOT INTERCEPTED");
  });

  t.check("a warning sign beats an ordinary topic in the same sentence",
    !!A.screenForRedFlags("I have heartburn and also some bleeding, what helps?"));
  t.check("a warning sign beats a question about sleep",
    !!A.screenForRedFlags("I cannot sleep and the baby is not moving"));

  // ---- must not intercept ordinary questions
  const ordinary = [
    "how much caffeine can I have",
    "what helps with heartburn at night",
    "is it safe to fly at 30 weeks",
    "which fish should I avoid",
    "what sleep position is best",
    "how much water should I drink",
    "can I keep going to the gym",
    "I have a mild headache from not drinking enough",
    "what should I know about prenatal vitamins",
    "can I dye my hair",
    "is a hot tub okay",
    "what about cat litter",
    "should I get the flu shot",
    "how often are prenatal visits",
    "can I still have sex",
    "what are braxton hicks",
    "my ankles are swollen at the end of the day",
    "trouble sleeping in the third trimester",
    "I feel anxious a lot lately",
    "what happens in the first weeks after birth"
  ];

  ordinary.forEach((text) => {
    t.check("answers normally: " + text, A.screenForRedFlags(text) === null);
  });

  // ---- retrieval routes to the intended entry
  const routes = [
    ["how much caffeine can I have", "kb-caffeine"],
    ["can I eat sushi", "kb-fish"],
    ["is deli meat okay", "kb-deli"],
    ["heartburn keeps me up", "kb-heartburn"],
    ["best sleep position", "kb-sleepposition"],
    ["can I take tylenol", "kb-medication"],
    ["flying at 30 weeks", "kb-travel"],
    ["is a hot tub safe", "kb-hottub"],
    ["how much water per day", "kb-water"],
    ["kick counts", "kb-movement"],
    ["what can you help with", "kb-scope"],
    ["prenatal vitamin and folic acid", "kb-prenatal"],
    ["cat litter box", "kb-litter"],
    ["flu shot and tdap", "kb-vaccines"],
    ["constipation help", "kb-constipation"],
    ["exercise and lifting weights", "kb-exercise"],
    ["I feel depressed and anxious", "kb-mood"],
    ["swollen ankles", "kb-swelling"],
    ["postpartum recovery", "kb-postpartum"],
    ["standing all day at work", "kb-work"],
    ["can I drink wine", "kb-alcohol"],
    ["how much weight should I gain", "kb-weight"]
  ];

  routes.forEach(([text, id]) => {
    const hit = A.findAnswer(text);
    t.check("routes to " + id + ": " + text, hit && hit.id === id, hit ? hit.id : "no match");
  });

  // ---- honest refusal beats a bad guess
  ["how do I fix my car", "xyzzy qwerty", "what is the capital of Peru", "recommend a movie"]
    .forEach((text) => {
      t.check("declines rather than guesses: " + text, A.findAnswer(text) === null);
    });
};
