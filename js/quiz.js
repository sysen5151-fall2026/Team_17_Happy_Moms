/* Happy Moms — Wellness Check-In quiz logic
   A short, friendly, front-end-only questionnaire. Nothing is transmitted
   anywhere; this is informational and not a substitute for medical advice. */

const QUIZ_QUESTIONS = [
  {
    id: "nutrition",
    title: "Nourishment",
    question: "How would you describe your meals on a typical day?",
    options: [
      { text: "Balanced plates with plenty of fruit, veg, protein, and whole grains", points: 3 },
      { text: "Pretty good, though I sometimes skip meals or reach for convenience food", points: 2 },
      { text: "I eat what's easy — cravings and schedule usually decide for me", points: 1 },
      { text: "I'm honestly not sure what a balanced pregnancy plate looks like", points: 0 },
    ],
    feedback: {
      great: "Your plate is doing a lot of the work already — keep layering in folate-rich greens, iron, and calcium.",
      good: "Small swaps, like adding a fruit or protein to snacks, can round things out nicely.",
      focus: "Nutrition is one of the biggest levers for a healthy pregnancy — our Nourishment tips are a gentle place to start.",
    },
  },
  {
    id: "hydration",
    title: "Hydration",
    question: "How much water do you drink most days?",
    options: [
      { text: "8+ glasses — I carry a water bottle everywhere", points: 3 },
      { text: "4–7 glasses, but I forget when I'm busy", points: 2 },
      { text: "A few cups, mostly coffee or tea", points: 1 },
      { text: "I rarely think about it", points: 0 },
    ],
    feedback: {
      great: "Wonderful — steady hydration supports amniotic fluid, digestion, and energy levels.",
      good: "You're close. Try keeping a bottle within arm's reach to build the habit further.",
      focus: "Dehydration can sneak up during pregnancy. A few reminders throughout the day can make a big difference.",
    },
  },
  {
    id: "movement",
    title: "Movement",
    question: "How often do you move your body (walks, prenatal yoga, swimming, etc.)?",
    options: [
      { text: "Most days — gentle movement is part of my routine", points: 3 },
      { text: "A couple of times a week", points: 2 },
      { text: "Rarely, life gets in the way", points: 1 },
      { text: "I haven't started and I'm not sure what's safe", points: 0 },
    ],
    feedback: {
      great: "Beautiful consistency — movement like this supports mood, sleep, and an easier delivery.",
      good: "A couple of sessions is a great base — even 10-minute walks on other days can help.",
      focus: "Gentle, doctor-approved movement can ease so many pregnancy symptoms. Our Movement tips cover safe ways to start.",
    },
  },
  {
    id: "sleep",
    title: "Rest & Sleep",
    question: "How rested do you feel most mornings?",
    options: [
      { text: "Well-rested — I get 7–9 hours and wind down before bed", points: 3 },
      { text: "Okay, though I wake up during the night", points: 2 },
      { text: "Tired most days, sleep feels inconsistent", points: 1 },
      { text: "Exhausted — rest feels out of reach right now", points: 0 },
    ],
    feedback: {
      great: "Great rest is a real achievement in pregnancy — your body and baby both benefit.",
      good: "Night waking is common. A wind-down routine and side-sleeping support can smooth things out.",
      focus: "Rest matters as much as nutrition. Our Rest & Sleep tips share gentle ways to reclaim it.",
    },
  },
  {
    id: "mind",
    title: "Emotional Wellbeing",
    question: "How supported and calm do you feel emotionally these days?",
    options: [
      { text: "Grounded — I have people to talk to and ways to decompress", points: 3 },
      { text: "Mostly good, with some anxious or overwhelmed days", points: 2 },
      { text: "I'm often stressed and don't have much outlet for it", points: 1 },
      { text: "I've been feeling low or anxious more often than not", points: 0 },
    ],
    feedback: {
      great: "Your emotional foundation sounds strong — that steadiness benefits you and baby alike.",
      good: "Ups and downs are completely normal. Naming them to someone you trust can lighten the load.",
      focus: "You deserve support. Please consider talking with your care provider — our Emotional Wellbeing tips can help too.",
    },
  },
  {
    id: "care",
    title: "Prenatal Care",
    question: "Where do you stand with prenatal appointments and screenings?",
    options: [
      { text: "Up to date and I have questions ready for my next visit", points: 3 },
      { text: "On track, though I sometimes forget to ask things", points: 2 },
      { text: "I've missed a visit or two", points: 1 },
      { text: "I haven't scheduled prenatal care yet", points: 0 },
    ],
    feedback: {
      great: "Fantastic — consistent prenatal care is one of the strongest predictors of a healthy pregnancy.",
      good: "You're nearly there. Keeping a running list of questions helps you get the most from each visit.",
      focus: "It's never too late to book a visit. Our Prenatal Care tips walk through what to expect and ask.",
    },
  },
];

const RESULT_BANDS = [
  {
    min: 15,
    label: "Radiant & On Track",
    message:
      "You're building thoughtful, sustainable habits across the board. Keep listening to your body and celebrating the small wins.",
  },
  {
    min: 9,
    label: "Building Healthy Momentum",
    message:
      "You're doing many things right, with a few areas ready for gentle attention. Small, consistent changes go a long way.",
  },
  {
    min: 0,
    label: "Let's Strengthen Your Routine",
    message:
      "Pregnancy is a lot to navigate — you don't have to do it alone. Explore our tips and consider sharing this check-in with your provider.",
  },
];

(function initQuiz() {
  const stepsContainer = document.getElementById("quizSteps");
  if (!stepsContainer) return; // not on the quiz page

  const progressBar = document.getElementById("quizProgressBar");
  const progressLabel = document.getElementById("quizProgressLabel");
  const prevBtn = document.getElementById("quizPrev");
  const nextBtn = document.getElementById("quizNext");
  const quizForm = document.getElementById("quizForm");
  const resultsEl = document.getElementById("quizResults");
  const restartBtn = document.getElementById("quizRestart");

  const answers = new Array(QUIZ_QUESTIONS.length).fill(null);
  let current = 0;

  function buildSteps() {
    QUIZ_QUESTIONS.forEach((q, index) => {
      const step = document.createElement("div");
      step.className = "quiz-step" + (index === 0 ? " active" : "");
      step.setAttribute("data-step", String(index));

      const heading = document.createElement("h3");
      heading.textContent = q.question;
      step.appendChild(heading);

      const optionsWrap = document.createElement("div");
      optionsWrap.className = "quiz-options";

      q.options.forEach((opt, optIndex) => {
        const label = document.createElement("label");
        label.className = "quiz-option";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = `q-${q.id}`;
        input.value = String(opt.points);
        input.setAttribute("data-question-index", String(index));

        input.addEventListener("change", () => {
          answers[index] = opt.points;
          optionsWrap
            .querySelectorAll(".quiz-option")
            .forEach((el) => el.classList.remove("selected"));
          label.classList.add("selected");
          nextBtn.disabled = false;
        });

        const span = document.createElement("span");
        span.textContent = opt.text;

        label.appendChild(input);
        label.appendChild(span);
        optionsWrap.appendChild(label);

        if (optIndex === 0) {
          /* no-op, just keeping structure clear */
        }
      });

      step.appendChild(optionsWrap);
      stepsContainer.appendChild(step);
    });
  }

  function updateProgress() {
    const pct = ((current + 1) / QUIZ_QUESTIONS.length) * 100;
    progressBar.style.width = pct + "%";
    progressLabel.textContent = `Question ${current + 1} of ${QUIZ_QUESTIONS.length}`;
  }

  function showStep(index) {
    document.querySelectorAll(".quiz-step").forEach((el, i) => {
      el.classList.toggle("active", i === index);
    });
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === QUIZ_QUESTIONS.length - 1 ? "See my results" : "Next";
    nextBtn.disabled = answers[index] === null;
    updateProgress();
  }

  function bandFor(score) {
    return RESULT_BANDS.find((b) => score >= b.min) || RESULT_BANDS[RESULT_BANDS.length - 1];
  }

  function tagFor(points) {
    if (points >= 3) return { cls: "great", label: "Thriving" };
    if (points >= 2) return { cls: "good", label: "On track" };
    return { cls: "focus", label: "Focus area" };
  }

  function renderResults() {
    const total = answers.reduce((sum, v) => sum + (v || 0), 0);
    const band = bandFor(total);

    document.getElementById("resultBadge").textContent = `${total}/18`;
    document.getElementById("resultLabel").textContent = band.label;
    document.getElementById("resultMessage").textContent = band.message;

    const breakdown = document.getElementById("resultBreakdown");
    breakdown.innerHTML = "";

    QUIZ_QUESTIONS.forEach((q, i) => {
      const points = answers[i] || 0;
      const tag = tagFor(points);
      const key = points >= 3 ? "great" : points >= 2 ? "good" : "focus";

      const item = document.createElement("div");
      item.className = "result-item";
      item.innerHTML = `
        <div class="result-item-head">
          <span>${q.title}</span>
          <span class="tag ${tag.cls}">${tag.label}</span>
        </div>
        <p>${q.feedback[key]}</p>
      `;
      breakdown.appendChild(item);
    });

    quizForm.classList.remove("active");
    quizForm.style.display = "none";
    resultsEl.classList.add("active");
  }

  prevBtn.addEventListener("click", () => {
    if (current > 0) {
      current -= 1;
      showStep(current);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (answers[current] === null) return;

    if (current < QUIZ_QUESTIONS.length - 1) {
      current += 1;
      showStep(current);
    } else {
      renderResults();
    }
  });

  restartBtn.addEventListener("click", () => {
    answers.fill(null);
    current = 0;
    document
      .querySelectorAll(".quiz-option")
      .forEach((el) => el.classList.remove("selected"));
    document
      .querySelectorAll(".quiz-option input")
      .forEach((el) => (el.checked = false));
    resultsEl.classList.remove("active");
    quizForm.style.display = "";
    quizForm.classList.add("active");
    showStep(0);
  });

  buildSteps();
  showStep(0);
})();
