/* ==========================================================================
   Happy Moms — content library
   Every piece of user-facing wellness content lives here: check-in questions,
   tip cards, the assistant knowledge base, urgent-symptom rules, and puzzle
   words. Adding content means adding an object to one of these arrays.

   Content rules for maintainers:
   - Describe general wellness practice only. No diagnosis, no dosing, no
     "this is safe for you" claims. Anything specific goes to the provider.
   - Every tip and knowledge-base entry names a source organization.
   - Anything acute belongs in urgentSigns / redFlags, never in an answer.
   ========================================================================== */
window.HM = window.HM || {};

HM.content = (function () {
  "use strict";

  /* ------------------------------------------------------- daily check-in */
  /* Scale questions are stored 1-5. `direction` tells the trend code which
     way is an improvement so charts and summaries read correctly. */
  var checkin = [
    {
      id: "mood",
      type: "scale",
      label: "How is your mood today?",
      direction: "higherBetter",
      emojis: ["😞", "😕", "😐", "🙂", "😄"],
      captions: ["Very low", "Low", "Okay", "Good", "Great"]
    },
    {
      id: "energy",
      type: "scale",
      label: "How is your energy?",
      direction: "higherBetter",
      emojis: ["🔋", "🔋", "⚡", "⚡", "✨"],
      captions: ["Running empty", "Low", "Middling", "Good", "Plenty"]
    },
    {
      id: "sleepHours",
      type: "choice",
      label: "Roughly how much sleep did you get?",
      unit: "hours",
      direction: "higherBetter",
      options: [
        { value: 3.5, label: "Under 4 hours" },
        { value: 5, label: "4 to 5 hours" },
        { value: 6.5, label: "6 to 7 hours" },
        { value: 8.5, label: "8 hours or more" }
      ]
    },
    {
      id: "sleepQuality",
      type: "scale",
      label: "How restful did that sleep feel?",
      direction: "higherBetter",
      captions: ["Not at all", "A little", "Okay", "Good", "Very restful"]
    },
    {
      id: "nausea",
      type: "scale",
      label: "Any nausea or queasiness?",
      direction: "lowerBetter",
      captions: ["None", "Mild", "Noticeable", "Rough", "Severe"]
    },
    {
      id: "water",
      type: "choice",
      label: "Water so far today?",
      unit: "cups",
      direction: "higherBetter",
      options: [
        { value: 1, label: "0 to 2 cups" },
        { value: 4, label: "3 to 5 cups" },
        { value: 7, label: "6 to 8 cups" },
        { value: 10, label: "9 or more cups" }
      ]
    },
    {
      id: "activity",
      type: "choice",
      label: "Movement today?",
      unit: "minutes",
      direction: "higherBetter",
      options: [
        { value: 0, label: "Rest day" },
        { value: 15, label: "A short walk or stretch" },
        { value: 30, label: "About 30 minutes" },
        { value: 50, label: "45 minutes or more" }
      ]
    },
    {
      id: "symptoms",
      type: "multi",
      label: "Anything else going on today?",
      hint: "Tap anything that applies. Leave it blank if you feel fine.",
      options: [
        { value: "headache", label: "Headache" },
        { value: "backPain", label: "Back pain" },
        { value: "heartburn", label: "Heartburn" },
        { value: "constipation", label: "Constipation" },
        { value: "swelling", label: "Swollen feet or ankles" },
        { value: "legCramps", label: "Leg cramps" },
        { value: "lightheaded", label: "Lightheaded" },
        { value: "insomnia", label: "Trouble sleeping" },
        { value: "breathless", label: "Winded easily" },
        { value: "pelvicPressure", label: "Pelvic pressure" },
        { value: "tightening", label: "Occasional tightening" },
        { value: "anxious", label: "Anxious" },
        { value: "lowMood", label: "Low mood" },
        { value: "aversions", label: "Food aversions" },
        { value: "frequentUrination", label: "Bathroom trips" }
      ]
    },
    {
      id: "note",
      type: "text",
      label: "Anything you want to remember at your next visit?",
      placeholder: "Optional. A sentence is plenty.",
      optional: true
    }
  ];

  /* Labels for symptom codes, used by trends and the summary. */
  var symptomLabels = {};
  checkin.forEach(function (q) {
    if (q.id === "symptoms") {
      q.options.forEach(function (o) { symptomLabels[o.value] = o.label; });
    }
  });

  /* ------------------------------------------------------- urgent signs */
  /* Shown on the check-in as a separate, explicitly urgent list, and used by
     the assistant to intercept questions. These mirror the maternal warning
     signs published by ACOG and the CDC Hear Her campaign. */
  var urgentSigns = [
    { value: "bleeding", label: "Vaginal bleeding", category: "medical" },
    { value: "fluidLeak", label: "Fluid leaking or water breaking", category: "medical" },
    { value: "severeHeadache", label: "Severe or persistent headache", category: "medical" },
    { value: "visionChanges", label: "Blurry vision or seeing spots", category: "medical" },
    { value: "severeAbdominalPain", label: "Severe belly or upper abdominal pain", category: "medical" },
    { value: "fever", label: "Fever of 100.4°F (38°C) or higher", category: "medical" },
    { value: "lessMovement", label: "Baby moving less than usual", category: "medical" },
    { value: "faceSwelling", label: "Sudden swelling of face or hands", category: "medical" },
    { value: "chestPain", label: "Chest pain or trouble breathing", category: "medical" },
    { value: "persistentVomiting", label: "Cannot keep fluids down", category: "medical" },
    { value: "calfPain", label: "Pain or swelling in one calf", category: "medical" },
    { value: "regularContractions", label: "Regular contractions before 37 weeks", category: "medical" },
    { value: "selfHarm", label: "Thoughts of harming myself", category: "mental" },
    { value: "cannotCope", label: "Feeling unable to cope", category: "mental" }
  ];

  var urgentLabels = {};
  urgentSigns.forEach(function (s) { urgentLabels[s.value] = s.label; });

  /* --------------------------------------------------------- tip cards */
  var topics = [
    { id: "nutrition", label: "Nourishment" },
    { id: "hydration", label: "Hydration" },
    { id: "movement", label: "Movement" },
    { id: "rest", label: "Rest & sleep" },
    { id: "mind", label: "Emotional wellbeing" },
    { id: "care", label: "Prenatal care" },
    { id: "comfort", label: "Common discomforts" },
    { id: "safety", label: "Everyday safety" }
  ];

  var tips = [
    // Nourishment
    { id: "t-produce", topic: "nutrition", title: "Fill half your plate with produce", body: "Fruits and vegetables bring fiber, folate, and steady energy. Frozen and canned count, and they keep longer.", source: "nichd" },
    { id: "t-protein", topic: "nutrition", title: "Pair carbohydrates with protein", body: "Adding protein or a healthy fat to a snack slows the energy crash that follows carbohydrates on their own.", source: "nichd" },
    { id: "t-folate", topic: "nutrition", title: "Take a daily prenatal vitamin", body: "Prenatal vitamins cover folic acid and iron, which are hard to get consistently from food alone. Ask your provider which one fits you.", source: "cdc" },
    { id: "t-smallmeals", topic: "nutrition", title: "Smaller meals, more often", body: "Five or six small meals often sit better than three large ones, especially with nausea or heartburn.", source: "acog", forSymptoms: ["heartburn"] },
    { id: "t-fish", topic: "nutrition", title: "Choose lower-mercury fish", body: "Federal advice is 8 to 12 ounces a week of lower-mercury fish such as salmon, sardines, tilapia, or canned light tuna, while avoiding shark, swordfish, king mackerel, tilefish, and bigeye tuna.", source: "fda" },
    { id: "t-foodsafety", topic: "nutrition", title: "Skip the listeria risks", body: "Unpasteurized milk and soft cheeses, cold deli meats, and refrigerated smoked fish carry listeria risk. Heating deli meat until steaming removes it.", source: "fda" },
    { id: "t-caffeine", topic: "nutrition", title: "Keep caffeine modest", body: "Many providers suggest staying under about 200 mg a day, roughly one 12-ounce cup of coffee. Remember tea, soda, and chocolate add up.", source: "acog" },
    { id: "t-noalcohol", topic: "nutrition", title: "No amount of alcohol is known to be safe", body: "Public health guidance is to avoid alcohol entirely during pregnancy. If stopping feels hard, your provider can help without judgment.", source: "cdc" },

    // Hydration
    { id: "t-waterreach", topic: "hydration", title: "Keep water within arm's reach", body: "A bottle at your desk and beside the bed removes the decision. Most guidance lands around 8 to 12 cups a day.", source: "acog" },
    { id: "t-flavor", topic: "hydration", title: "Flavor it when plain water turns you off", body: "Citrus, frozen berries, cucumber, or mint make water drinkable again during a queasy stretch.", source: "nichd" },
    { id: "t-thirstcues", topic: "hydration", title: "Know the low-fluid signs", body: "Dark urine, headache, dizziness, and sluggishness can all point to needing more fluids. Persistent symptoms deserve a call to your provider.", source: "nichd", forSymptoms: ["headache", "lightheaded"] },
    { id: "t-constipation", topic: "hydration", title: "Fluids plus fiber for constipation", body: "Water, fiber, and gentle movement together work better than any one alone. Ask your provider before adding a supplement.", source: "acog", forSymptoms: ["constipation"] },

    // Movement
    { id: "t-150", topic: "movement", title: "Aim for about 150 minutes a week", body: "Standard guidance for an uncomplicated pregnancy is roughly 150 minutes of moderate activity a week, which splits neatly into 20 to 30 minutes most days.", source: "acog" },
    { id: "t-walk", topic: "movement", title: "Walking counts, and it adds up", body: "Ten or fifteen minutes after a meal supports circulation, digestion, and mood. Two or three short walks equal one long one.", source: "acog" },
    { id: "t-yoga", topic: "movement", title: "Stretch what pregnancy tightens", body: "Prenatal yoga and simple hip, hamstring, and shoulder stretches ease the load as posture shifts. Skip deep twists and lying flat on your back later on.", source: "nichd", forSymptoms: ["backPain", "pelvicPressure"] },
    { id: "t-swim", topic: "movement", title: "Water takes the weight off", body: "Swimming and water walking support your joints and can feel like relief in the third trimester.", source: "acog" },
    { id: "t-pelvicfloor", topic: "movement", title: "Pelvic floor work travels well", body: "Pelvic floor exercises need no equipment and can be done sitting. Ask your provider or a pelvic floor therapist how to do them correctly.", source: "nichd" },
    { id: "t-clearance", topic: "movement", title: "Get clearance, then listen to your body", body: "Confirm your exercise plan with your provider, especially with bleeding, high blood pressure, or a preterm labor history. Stop and call if a symptom is new or sharp.", source: "acog" },

    // Rest and sleep
    { id: "t-side", topic: "rest", title: "Sleep on your side later in pregnancy", body: "From around the middle of pregnancy, side-sleeping supports blood flow better than lying flat on your back. Either side works.", source: "nichd" },
    { id: "t-pillows", topic: "rest", title: "Build a pillow setup", body: "One pillow between the knees and one under the belly takes strain off the low back and hips.", source: "nichd", forSymptoms: ["backPain", "insomnia"] },
    { id: "t-winddown", topic: "rest", title: "Give sleep a runway", body: "Dim lights, screens away, and the same order of operations each night signal your body that rest is coming.", source: "nichd", forSymptoms: ["insomnia"] },
    { id: "t-heartburnnight", topic: "rest", title: "Elevate for nighttime heartburn", body: "Propping your upper body and leaving two to three hours between the last meal and bed reduces reflux at night.", source: "acog", forSymptoms: ["heartburn"] },
    { id: "t-nap", topic: "rest", title: "Nap without guilt", body: "Short daytime rest makes up for broken nights. Twenty to thirty minutes avoids the groggy wake-up.", source: "nichd" },

    // Emotional wellbeing
    { id: "t-name", topic: "mind", title: "Name the feeling out loud", body: "Saying or writing what you feel makes it smaller and easier to bring to an appointment.", source: "nichd", forSymptoms: ["anxious", "lowMood"] },
    { id: "t-circle", topic: "mind", title: "Pick your two people", body: "A short list of people you can text on a hard day beats a long list you never use.", source: "nichd" },
    { id: "t-breathe", topic: "mind", title: "Two minutes of slow breathing", body: "Longer exhales than inhales, repeated for a couple of minutes, settle the body quickly and cost nothing.", source: "nichd", forSymptoms: ["anxious"] },
    { id: "t-screening", topic: "mind", title: "Mood changes are worth reporting", body: "Persistent sadness, anxiety, or numbness is common and treatable. Providers screen for it because it responds well to support.", source: "acog", forSymptoms: ["lowMood", "anxious"] },

    // Prenatal care
    { id: "t-visits", topic: "care", title: "Keep the appointment rhythm", body: "Visit spacing tightens as you progress, often monthly early on and weekly near the end. Missing one is worth rescheduling right away.", source: "acog" },
    { id: "t-questionlist", topic: "care", title: "Keep a running question list", body: "Questions arrive at 2 a.m. and vanish in the exam room. Add them to your list the moment you think of them.", source: "acog" },
    { id: "t-screenings", topic: "care", title: "Ask what is coming next", body: "Each trimester has its own screenings. Asking what is scheduled and why makes the results easier to understand.", source: "nichd" },
    { id: "t-vaccines", topic: "care", title: "Ask about flu and Tdap", body: "Both are routinely recommended during pregnancy and pass protection to your baby. Your provider will confirm the right timing.", source: "cdc" },
    { id: "t-dental", topic: "care", title: "Keep the dentist appointment", body: "Routine cleanings are encouraged during pregnancy, and gum inflammation is more common now. Mention you are pregnant when booking.", source: "acog" },
    { id: "t-support", topic: "care", title: "Bring someone if you can", body: "A second set of ears catches what you miss and makes it easier to ask the follow-up question.", source: "nichd" },

    // Common discomforts
    { id: "t-nausea", topic: "comfort", title: "Working with morning sickness", body: "Small frequent snacks, something dry before getting up, cold foods over hot, and ginger help many people. Ask your provider if you cannot keep fluids down.", source: "acog", forSymptoms: [] },
    { id: "t-legcramps", topic: "comfort", title: "Leg cramps at night", body: "Stretching your calves before bed, staying hydrated, and changing position often can reduce them.", source: "nichd", forSymptoms: ["legCramps"] },
    { id: "t-swellingtip", topic: "comfort", title: "Everyday swelling", body: "Feet up, left side when resting, compression socks, and less time standing all help. Sudden swelling of the face or hands is different and needs a call.", source: "acog", forSymptoms: ["swelling"] },
    { id: "t-backpain", topic: "comfort", title: "Back pain basics", body: "Supportive shoes, lifting with your legs, a warm compress, and strengthening your hips and core take pressure off the low back.", source: "acog", forSymptoms: ["backPain"] },
    { id: "t-braxton", topic: "comfort", title: "Tightening that comes and goes", body: "Irregular tightening that eases with rest and water is common in later pregnancy. Regular, intensifying contractions before 37 weeks need a call.", source: "acog", forSymptoms: ["tightening"] },
    { id: "t-lightheaded", topic: "comfort", title: "Standing up slowly", body: "Blood pressure shifts in pregnancy make quick position changes dizzying. Rise in stages and eat regularly. Fainting deserves a call.", source: "nichd", forSymptoms: ["lightheaded"] },

    // Everyday safety
    { id: "t-heat", topic: "safety", title: "Skip hot tubs and saunas", body: "Raising your core temperature is the concern, so hot tubs, saunas, and hot yoga are usually off the list. A warm bath is fine.", source: "acog" },
    { id: "t-litter", topic: "safety", title: "Hand off the cat litter", body: "Cat litter can carry toxoplasmosis. If you must do it, use gloves and wash your hands well afterward.", source: "cdc" },
    { id: "t-meds", topic: "safety", title: "Check before any medication", body: "That includes over-the-counter products, supplements, and herbal remedies. Your provider or pharmacist can check your specific list.", source: "fda" },
    { id: "t-travel", topic: "safety", title: "Travel with a plan", body: "Air travel is generally fine in an uncomplicated pregnancy until around 36 weeks. Walk hourly, hydrate, keep your seatbelt low, and check airline rules.", source: "acog" },
    { id: "t-seatbelt", topic: "safety", title: "Seatbelt below the bump", body: "Lap belt under the belly and across the hips, shoulder strap between the breasts and to the side of the bump.", source: "nichd" },
    { id: "t-smoking", topic: "safety", title: "Help exists for quitting", body: "Stopping smoking, vaping, or other substance use at any point in pregnancy helps. Providers can connect you with support that works.", source: "cdc" }
  ];

  /* ------------------------------------------- assistant knowledge base */
  /* Retrieval only. Keywords are matched against the question; the answer is
     written in advance, so nothing is generated at run time. */
  var kb = [
    { id: "kb-nausea", topic: "comfort", title: "Morning sickness", keywords: ["nausea", "nauseous", "morning sickness", "queasy", "vomit", "throw up", "sick to my stomach"], answer: "Nausea is most common in the first trimester and often eases by the middle of pregnancy. Small frequent snacks, something dry before you get out of bed, cold foods rather than hot, and ginger help many people. If you cannot keep fluids down for a day, or you are losing weight, contact your provider, because that needs treatment.", source: "acog", related: ["t-nausea", "t-smallmeals"] },
    { id: "kb-caffeine", topic: "nutrition", title: "Caffeine", keywords: ["caffeine", "coffee", "espresso", "tea", "soda", "energy drink", "matcha"], answer: "Many providers advise keeping caffeine under about 200 mg a day, which is roughly one 12-ounce cup of coffee. Tea, soda, chocolate, and some energy drinks add to the total, and energy drinks often contain other stimulants worth avoiding. Your provider can tell you what fits your situation.", source: "acog", related: ["t-caffeine"] },
    { id: "kb-alcohol", topic: "safety", title: "Alcohol", keywords: ["alcohol", "wine", "beer", "drink", "cocktail", "champagne"], answer: "No amount of alcohol has been shown to be safe during pregnancy, so public health guidance is to avoid it entirely. If you drank before you knew you were pregnant, tell your provider rather than worrying alone. If cutting back feels hard, that is a common and treatable thing to raise with them.", source: "cdc", related: ["t-noalcohol"] },
    { id: "kb-fish", topic: "nutrition", title: "Fish and mercury", keywords: ["fish", "sushi", "mercury", "tuna", "salmon", "shrimp", "seafood"], answer: "Federal advice is 8 to 12 ounces per week of lower-mercury fish such as salmon, sardines, tilapia, cod, or canned light tuna. Avoid shark, swordfish, king mackerel, tilefish, and bigeye tuna. Raw fish carries a separate infection risk, so cooked is the usual recommendation during pregnancy.", source: "fda", related: ["t-fish"] },
    { id: "kb-deli", topic: "nutrition", title: "Deli meat and soft cheese", keywords: ["deli", "lunch meat", "cold cuts", "cheese", "brie", "feta", "queso", "listeria", "charcuterie", "hot dog"], answer: "Listeria is the concern with cold deli meats, refrigerated paté and smoked fish, and cheeses made from unpasteurized milk. Heating deli meat until it is steaming removes the risk, and cheeses labeled pasteurized are generally considered fine. Check the label rather than the cheese type alone.", source: "fda", related: ["t-foodsafety"] },
    { id: "kb-heartburn", topic: "comfort", title: "Heartburn", keywords: ["heartburn", "reflux", "acid", "indigestion", "burning chest"], answer: "Heartburn is common as pregnancy progresses. Smaller meals, staying upright for two to three hours after eating, propping your upper body at night, and identifying trigger foods all help. Ask your provider before using any antacid or acid reducer, since they will tell you which ones fit your situation.", source: "acog", related: ["t-heartburnnight", "t-smallmeals"] },
    { id: "kb-constipation", topic: "comfort", title: "Constipation", keywords: ["constipation", "constipated", "bowel", "hard stool", "cannot go"], answer: "Pregnancy hormones and iron supplements both slow digestion. More fluids, more fiber, and gentle daily movement work best together. If that is not enough, ask your provider before starting a stool softener or fiber supplement.", source: "acog", related: ["t-constipation"] },
    { id: "kb-sleepposition", topic: "rest", title: "Sleep position", keywords: ["sleep position", "sleep on my back", "side sleeping", "left side", "back sleeping", "position"], answer: "From around the middle of pregnancy onward, side-sleeping is recommended over lying flat on your back, because the weight of the uterus can press on a major blood vessel. Either side is fine. If you wake up on your back, just roll to your side; brief periods are not considered a problem.", source: "nichd", related: ["t-side", "t-pillows"] },
    { id: "kb-insomnia", topic: "rest", title: "Trouble sleeping", keywords: ["insomnia", "cannot sleep", "trouble sleeping", "awake at night", "sleepless", "waking up"], answer: "Broken sleep is one of the most common pregnancy complaints. A consistent wind-down, a cool dark room, screens away an hour before bed, and a pillow setup that supports your belly and knees all help. Persistent insomnia is worth raising at your next visit, since it affects everything else.", source: "nichd", related: ["t-winddown", "t-pillows", "t-nap"] },
    { id: "kb-exercise", topic: "movement", title: "Exercise and safe activity", keywords: ["exercise", "workout", "gym", "run", "running", "lift", "weights", "safe activity", "yoga", "pilates", "swim"], answer: "For an uncomplicated pregnancy, about 150 minutes of moderate activity a week is the usual target, and walking, swimming, stationary cycling, and prenatal yoga all count. Avoid contact sports, activities with a fall risk, scuba diving, and lying flat on your back for long stretches later on. Confirm your plan with your provider, and stop and call if you have bleeding, leaking fluid, chest pain, or contractions.", source: "acog", related: ["t-150", "t-clearance", "t-yoga"] },
    { id: "kb-hottub", topic: "safety", title: "Hot tubs, saunas, and heat", keywords: ["hot tub", "sauna", "steam room", "hot yoga", "overheating", "jacuzzi", "hot bath"], answer: "Raising your core body temperature is the concern, so hot tubs, saunas, steam rooms, and hot yoga are generally advised against, particularly in the first trimester. A warm bath where you are not overheating is different and usually fine. In hot weather, hydrate and take shade breaks.", source: "acog", related: ["t-heat"] },
    { id: "kb-medication", topic: "safety", title: "Medications and supplements", keywords: ["medication", "medicine", "tylenol", "acetaminophen", "ibuprofen", "advil", "pill", "supplement", "herbal", "antibiotic", "allergy medicine"], answer: "This is the one area where general information is not enough: whether a specific medication or supplement fits your pregnancy depends on your history, your stage, and your dose. Keep a list of everything you take, including vitamins and herbal products, and have your provider or pharmacist review it. Do not stop a prescribed medication on your own.", source: "fda", related: ["t-meds"] },
    { id: "kb-prenatal", topic: "nutrition", title: "Prenatal vitamins and folic acid", keywords: ["prenatal vitamin", "folic acid", "folate", "iron", "calcium", "vitamin", "dha", "supplement"], answer: "Prenatal vitamins exist to cover the nutrients that are hard to hit from food alone, especially folic acid, which supports early neural development, and iron. Public health guidance is 400 micrograms of folic acid daily for anyone who could become pregnant, often higher during pregnancy. Which product and dose fits you is a question for your provider.", source: "cdc", related: ["t-folate"] },
    { id: "kb-water", topic: "hydration", title: "How much water", keywords: ["water", "hydration", "how much water", "fluids", "drink", "dehydrated", "thirsty"], answer: "Common guidance during pregnancy is 8 to 12 cups of fluid a day, more in heat or with activity. Urine that stays pale is a decent everyday signal. Headaches, dizziness, and dark urine can point to needing more, and persistent symptoms are worth a call.", source: "acog", related: ["t-waterreach", "t-thirstcues"] },
    { id: "kb-weight", topic: "care", title: "Weight gain", keywords: ["weight", "gaining", "weight gain", "pounds", "kilos", "too much weight", "not gaining"], answer: "Recommended ranges differ a lot depending on your starting point, whether you are carrying more than one baby, and your health history, which is why there is no single number worth quoting. Your provider tracks this at visits and will tell you if anything needs attention. Steady habits matter more than any individual week on the scale.", source: "acog", related: [] },
    { id: "kb-movement", topic: "care", title: "Baby movement and kick counts", keywords: ["kick", "kicks", "movement", "not moving", "fetal movement", "kick count", "baby moving"], answer: "Most people notice a pattern in the third trimester, and many providers suggest picking a time each day when the baby is usually active and noticing movements. One common approach is looking for ten movements within two hours. Fewer movements than usual is never something to wait out: call your provider the same day.", source: "acog", related: [] },
    { id: "kb-braxton", topic: "comfort", title: "Braxton Hicks versus labor", keywords: ["braxton", "contraction", "contractions", "tightening", "cramping", "labor", "am i in labor"], answer: "Practice tightening tends to be irregular, does not get stronger, and often eases with rest, water, or a change of position. Labor contractions come at regular intervals, get longer and stronger, and keep going regardless of what you do. Regular contractions before 37 weeks, or any contractions with bleeding or leaking fluid, need a call right away.", source: "acog", related: ["t-braxton"] },
    { id: "kb-swelling", topic: "comfort", title: "Swelling", keywords: ["swelling", "swollen", "edema", "feet", "ankles", "puffy", "rings"], answer: "Gradual swelling in the feet and ankles is very common, especially late in the day and in heat. Elevating your feet, resting on your left side, compression socks, and less standing all help. Sudden swelling in your face or hands, or swelling with a headache or vision changes, is a different situation and needs a prompt call.", source: "acog", related: ["t-swellingtip"] },
    { id: "kb-backpain", topic: "comfort", title: "Back and hip pain", keywords: ["back pain", "backache", "hip pain", "sciatica", "pelvic pain", "sore back", "round ligament"], answer: "As posture and ligaments change, back and hip pain are common. Supportive shoes, warm compresses, side-sleeping with a pillow between the knees, and hip and core strengthening all help, and a physical therapist who works with pregnancy can be a good referral. Severe pain, pain with fever, or pain with bleeding needs a call.", source: "acog", related: ["t-backpain", "t-yoga"] },
    { id: "kb-headache", topic: "comfort", title: "Headaches", keywords: ["headache", "migraine", "head hurts", "head pain"], answer: "Ordinary headaches in pregnancy often trace back to fluids, sleep, hunger, caffeine changes, or tension, and those are worth addressing first. A severe or persistent headache, especially with vision changes, upper belly pain, or sudden swelling, can signal a blood pressure problem and needs an urgent call. Check with your provider before taking anything for pain.", source: "acog", related: ["t-thirstcues"] },
    { id: "kb-mood", topic: "mind", title: "Mood, anxiety, and stress", keywords: ["anxiety", "anxious", "depressed", "depression", "mood", "sad", "crying", "stress", "overwhelmed", "panic"], answer: "Mood shifts are expected, and persistent anxiety or low mood is both common and treatable. Naming it to someone you trust, protecting sleep, gentle movement, and time outdoors all help at the everyday level. If it lasts more than a couple of weeks or gets in the way of daily life, tell your provider, who screens for exactly this. If you are having thoughts of harming yourself, call or text 988 now.", source: "acog", related: ["t-name", "t-breathe", "t-screening"] },
    { id: "kb-travel", topic: "safety", title: "Travel and flying", keywords: ["travel", "fly", "flying", "flight", "airplane", "road trip", "vacation", "trip"], answer: "In an uncomplicated pregnancy, flying is generally considered fine until around 36 weeks, though airline rules vary and some require a letter later on. On any long trip, walk about every hour, keep fluids up, and wear your seatbelt low across your hips. Talk with your provider first if you have any pregnancy complications or are traveling somewhere with limited medical care.", source: "acog", related: ["t-travel", "t-seatbelt"] },
    { id: "kb-litter", topic: "safety", title: "Cats, gardening, and toxoplasmosis", keywords: ["cat", "litter", "litter box", "toxoplasmosis", "gardening", "soil", "pet"], answer: "Cat litter and garden soil can carry toxoplasmosis, so the usual advice is to hand litter duty to someone else and wear gloves when gardening, washing your hands afterward. You do not need to rehome your cat. Indoor cats fed commercial food are lower risk.", source: "cdc", related: ["t-litter"] },
    { id: "kb-beauty", topic: "safety", title: "Hair dye, nails, and skincare", keywords: ["hair dye", "highlights", "salon", "nails", "acrylic", "botox", "retinol", "skincare", "sunscreen", "tattoo"], answer: "Hair coloring and nail services are generally considered low risk, and good ventilation is the usual advice. Some skincare ingredients, notably retinoids and high-dose salicylic acid, are typically avoided in pregnancy. Bring the specific product list to your provider, since that is a fast conversation with a clear answer.", source: "fda", related: [] },
    { id: "kb-work", topic: "safety", title: "Work, standing, and lifting", keywords: ["work", "job", "standing all day", "lifting", "shift", "desk", "chemicals at work"], answer: "Many pregnancies continue normally through a full work schedule. Long stretches of standing, heavy lifting, night shifts, and chemical or radiation exposure are worth reviewing with your provider, who can write accommodations if needed. Short frequent breaks, compression socks, and a footrest help with standing and desk work alike.", source: "cdc", related: [] },
    { id: "kb-sex", topic: "care", title: "Sex during pregnancy", keywords: ["sex", "intimacy", "intercourse", "libido"], answer: "In an uncomplicated pregnancy, sex is generally considered safe, and interest going up or down is normal. Your provider may advise against it in specific situations, such as placenta previa, a history of preterm labor, or unexplained bleeding. Bleeding, pain, or leaking fluid afterward is worth a call.", source: "acog", related: [] },
    { id: "kb-visits", topic: "care", title: "Prenatal visit schedule and screenings", keywords: ["appointment", "visit", "schedule", "screening", "test", "ultrasound", "glucose", "how often"], answer: "A typical schedule is about every four weeks early on, every two to three weeks in the later second trimester, then weekly toward the end, with screenings grouped by trimester. Asking what is scheduled next and why makes results much easier to follow. Bring your question list, and bring someone with you if you can.", source: "acog", related: ["t-visits", "t-screenings", "t-questionlist"] },
    { id: "kb-vaccines", topic: "care", title: "Vaccines in pregnancy", keywords: ["vaccine", "vaccination", "flu shot", "tdap", "covid", "rsv", "immunization", "shot"], answer: "Flu and Tdap vaccines are routinely recommended during pregnancy and pass protection to your baby, and others such as RSV and COVID-19 vaccines are recommended in specific windows. Timing matters, so confirm the schedule with your provider. Live vaccines are generally deferred until after delivery.", source: "cdc", related: ["t-vaccines"] },
    { id: "kb-labor", topic: "care", title: "Signs labor may be starting", keywords: ["labor signs", "water broke", "waters", "mucus plug", "bloody show", "early labor", "going into labor", "hospital bag"], answer: "Common signs include regular contractions that get stronger and closer together, a low steady backache, the mucus plug passing, and fluid leaking. Your provider will give you specific instructions for when to call or come in, often framed as contraction timing. If your water breaks, you have bleeding, or you are under 37 weeks with regular contractions, call right away.", source: "acog", related: [] },
    { id: "kb-postpartum", topic: "mind", title: "The first weeks after birth", keywords: ["postpartum", "after birth", "fourth trimester", "recovery", "baby blues", "breastfeeding", "nursing"], answer: "The weeks after birth bring their own recovery, and brief tearfulness in the first two weeks is common. Feelings that deepen or last longer, or any thoughts of harming yourself or your baby, need prompt help rather than patience. Postpartum Support International runs a helpline at 1-800-944-4773, and your postpartum visit is a good place to raise anything at all.", source: "acog", related: [] },
    { id: "kb-scope", topic: "about", title: "What this assistant can and cannot do", keywords: ["what can you do", "help", "how does this work", "who are you", "are you a doctor", "ai", "diagnose"], answer: "This assistant answers from a small library of general pregnancy wellness topics written in advance by the Happy Moms team and reviewed against public guidance from ACOG, the NIH, the FDA, and the CDC. It does not generate answers, does not read your check-in data, and cannot diagnose, interpret symptoms, or advise on your medications. For anything specific to you, your provider is the right stop, and urgent symptoms go straight to the urgent-help page.", source: "acog", related: [] }
  ];

  /* ---------------------------------------------- assistant red flags */
  /* Matched before the knowledge base. A hit routes the user to urgent help
     instead of answering the question. */
  var redFlags = [
    { category: "mental", patterns: ["kill myself", "suicidal", "suicide", "end my life", "hurt myself", "harm myself", "self harm", "harming my baby", "hurt my baby", "do not want to be here", "overdose"] },
    { category: "medical", patterns: ["bleeding", "blood", "hemorrhage", "spotting heavily", "soaked pad"] },
    { category: "medical", patterns: ["water broke", "water breaking", "fluid leaking", "leaking fluid", "gush of fluid"] },
    { category: "medical", patterns: ["baby not moving", "not moving", "no movement", "stopped moving", "less movement", "fewer kicks", "no kicks"] },
    { category: "medical", patterns: ["severe headache", "worst headache", "headache and vision", "seeing spots", "blurry vision", "blurred vision", "vision changes"] },
    { category: "medical", patterns: ["severe pain", "severe abdominal", "severe cramping", "sharp pain in my belly", "upper abdominal pain", "shoulder pain"] },
    { category: "medical", patterns: ["chest pain", "trouble breathing", "cannot breathe", "short of breath suddenly", "heart racing"] },
    { category: "medical", patterns: ["fever", "temperature of 101", "temperature of 102", "chills and fever"] },
    { category: "medical", patterns: ["cannot keep fluids", "cannot stop vomiting", "vomiting blood", "throwing up blood", "not peed"] },
    { category: "medical", patterns: ["contractions before 37", "preterm labor", "regular contractions", "contractions every"] },
    { category: "medical", patterns: ["swollen face", "swelling in my face", "sudden swelling", "swollen hands"] },
    { category: "medical", patterns: ["fainted", "passed out", "seizure", "convulsion"] },
    { category: "medical", patterns: ["pain in one leg", "calf pain", "swollen calf", "red warm leg"] },
    { category: "medical", patterns: ["fell", "car accident", "hit in the stomach", "trauma to my belly"] }
  ];

  /* ---------------------------------------------------- daily puzzle */
  /* Five-letter words on a pregnancy-wellness theme, each paired with a
     one-line note so solving teaches something small. */
  var puzzleWords = [
    { word: "DOULA", note: "A doula offers non-medical labor support, separate from your clinical care team." },
    { word: "WATER", note: "Guidance during pregnancy lands around 8 to 12 cups of fluid a day." },
    { word: "FOLIC", note: "Folic acid supports early neural development, which is why it leads most prenatal vitamins." },
    { word: "SLEEP", note: "Side-sleeping is recommended over lying flat on your back later in pregnancy." },
    { word: "PULSE", note: "A resting heart rate that runs higher than usual is a normal pregnancy change." },
    { word: "BIRTH", note: "A birth plan is a set of preferences, not a contract, and flexibility is part of it." },
    { word: "NURSE", note: "Labor and delivery nurses handle most of your monitoring once you are admitted." },
    { word: "LABOR", note: "Regular contractions that get stronger and closer together are the hallmark of true labor." },
    { word: "BELLY", note: "Seatbelts go low across the hips, under the belly, not across it." },
    { word: "HEART", note: "Blood volume rises substantially in pregnancy, which is why fatigue is so common." },
    { word: "FETUS", note: "Clinical notes use embryo through week 10 and fetus from week 11 onward." },
    { word: "BEANS", note: "Beans deliver iron, fiber, and folate at once, which is a rare combination." },
    { word: "BERRY", note: "Berries bring fiber and vitamin C, and frozen ones count just as much." },
    { word: "GRAIN", note: "Whole grains hold their fiber, which helps with the constipation pregnancy often brings." },
    { word: "SNACK", note: "Small frequent snacks often settle nausea better than three full meals." },
    { word: "JUICE", note: "Choose pasteurized juice during pregnancy; unpasteurized carries an infection risk." },
    { word: "MELON", note: "Wash melon rinds before cutting, since listeria can ride on the outside." },
    { word: "PEACH", note: "Rinse all fresh produce under running water, even when you plan to peel it." },
    { word: "OLIVE", note: "Olive oil is a simple way to add the healthy fat that helps nutrients absorb." },
    { word: "SALAD", note: "Prewashed bagged greens are fine; rinse loose greens yourself before eating." },
    { word: "BROTH", note: "Warm broth counts toward fluids and often goes down easily on a queasy day." },
    { word: "HONEY", note: "Honey is fine for you in pregnancy, but never for a baby under one year old." },
    { word: "DAIRY", note: "Choose pasteurized dairy; unpasteurized milk and soft cheeses carry listeria risk." },
    { word: "FRUIT", note: "Fruit before a sweet craving often satisfies it with fiber attached." },
    { word: "GREEN", note: "Dark leafy greens carry folate, iron, and calcium together." },
    { word: "LEMON", note: "A slice of lemon makes water drinkable again during a nausea stretch." },
    { word: "MANGO", note: "Vitamin C from fruit helps your body absorb iron from plants at the same meal." },
    { word: "SEEDS", note: "Pumpkin and chia seeds add iron and fiber to yogurt or oatmeal in seconds." },
    { word: "WHEAT", note: "Whole wheat over refined keeps the fiber that helps digestion stay regular." },
    { word: "WALKS", note: "Two or three ten-minute walks add up the same as one long one." },
    { word: "SWIMS", note: "Water supports your weight, which is why swimming often feels best late in pregnancy." },
    { word: "RELAX", note: "Longer exhales than inhales settle the nervous system in about two minutes." },
    { word: "QUIET", note: "A consistent wind-down routine signals your body that sleep is coming." },
    { word: "PEACE", note: "Naming a worry out loud usually makes it smaller and easier to bring to a visit." },
    { word: "VISIT", note: "Visit spacing tightens as you progress, often reaching weekly near the end." },
    { word: "CHART", note: "You can request your own prenatal records; they belong to you." },
    { word: "NOTES", note: "Questions written down at 2 a.m. are the ones you still have at the appointment." },
    { word: "SCANS", note: "Ultrasound timing varies by pregnancy; ask what is scheduled next and why." },
    { word: "TESTS", note: "Each trimester carries its own screenings, grouped by what they can detect when." },
    { word: "WEEKS", note: "Pregnancy is counted in weeks and days, with 40 weeks 0 days at the due date." },
    { word: "MONTH", note: "Clinicians count weeks rather than months because screening windows are week-based." },
    { word: "HAPPY", note: "Mood swings are expected; persistent low mood is common and treatable." },
    { word: "MOODS", note: "Providers screen for mood changes at visits because they respond well to support." },
    { word: "SMILE", note: "Keep your dental cleanings; gum inflammation is more common in pregnancy." },
    { word: "LAUGH", note: "Pelvic floor exercises help with the leaking that laughing can bring on." },
    { word: "TRUST", note: "Any symptom that worries you is worth a call, even if it turns out to be nothing." },
    { word: "HOPES", note: "Writing down what you want from birth makes it easier to talk through with your team." },
    { word: "KICKS", note: "Fewer movements than usual is never something to wait out. Call the same day." },
    { word: "NAMES", note: "You do not have to share the name. Boundaries with family are part of planning too." },
    { word: "CRIBS", note: "A firm flat surface with no soft bedding is the safe sleep standard for newborns." },
    { word: "SOCKS", note: "Compression socks help with the everyday ankle swelling of later pregnancy." },
    { word: "TWINS", note: "Twin pregnancies follow a different visit schedule and different weight guidance." },
    { word: "NIGHT", note: "Waking at night is nearly universal in the third trimester, and naps are legitimate." },
    { word: "LIGHT", note: "Morning daylight helps anchor a sleep cycle that pregnancy keeps disrupting." },
    { word: "FIBER", note: "Fiber plus fluids plus movement beats any one of the three alone for constipation." },
    { word: "VITAL", note: "Blood pressure at every visit is how providers catch preeclampsia early." },
    { word: "BLOOD", note: "Iron needs rise in pregnancy, which is why anemia screening is routine." },
    { word: "SPINE", note: "Lifting with your legs and supportive shoes take real load off your low back." },
    { word: "LUNGS", note: "Feeling winded on stairs is common as the uterus presses upward late in pregnancy." },
    { word: "NERVE", note: "Carpal tunnel symptoms are common in pregnancy and usually ease after delivery." },
    { word: "SUGAR", note: "Glucose screening around the middle of pregnancy checks for gestational diabetes." },
    { word: "PLANS", note: "A hospital bag packed by 36 weeks removes one decision from an unpredictable day." }
  ];

  return {
    checkin: checkin,
    symptomLabels: symptomLabels,
    urgentSigns: urgentSigns,
    urgentLabels: urgentLabels,
    topics: topics,
    tips: tips,
    kb: kb,
    redFlags: redFlags,
    puzzleWords: puzzleWords,

    /* Helpers used by several pages. */
    tipById: function (id) {
      return tips.filter(function (t) { return t.id === id; })[0] || null;
    },
    tipsForTopic: function (topicId) {
      return tips.filter(function (t) { return t.topic === topicId; });
    },
    tipsForSymptom: function (symptom) {
      return tips.filter(function (t) {
        return (t.forSymptoms || []).indexOf(symptom) !== -1;
      });
    },
    /* Deterministic daily pick so everyone shares the same day's content. */
    dailyIndex: function (dateKey, length) {
      var seed = 0;
      var str = String(dateKey);
      for (var i = 0; i < str.length; i++) {
        seed = (seed * 31 + str.charCodeAt(i)) % 100000;
      }
      return seed % length;
    }
  };
})();
