/* ==========================================================================
   Happy Moms — sample data
   Fills the app with three weeks of plausible entries so the team can demo
   trends and visit notes without waiting three weeks. Clearly labelled in the
   interface, and removable in one click from the profile page.
   ========================================================================== */
window.HM = window.HM || {};

HM.sample = (function () {
  "use strict";

  /* Deterministic pseudo-random so a demo looks the same each time. */
  function seeded(seed) {
    var value = seed;
    return function () {
      value = (value * 1103515245 + 12345) % 2147483648;
      return value / 2147483648;
    };
  }

  function pick(rand, list) {
    return list[Math.floor(rand() * list.length)];
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function build(days) {
    var rand = seeded(20260929);
    var total = days || 21;
    var checkins = {};

    for (var i = total - 1; i >= 0; i--) {
      var key = HM.dates.toKey(HM.dates.addDays(new Date(), -i));

      /* Skip a couple of days so coverage and streaks look real. */
      if (i === 4 || i === 11 || i === 17) continue;

      var drift = (total - i) / total;            // later days trend a little tireder
      var mood = clamp(Math.round(3.4 + rand() * 1.4 - drift * 0.5), 1, 5);
      var energy = clamp(Math.round(3.5 + rand() * 1.2 - drift * 0.9), 1, 5);
      var sleepHours = pick(rand, [5, 6.5, 6.5, 6.5, 8.5, 5, 6.5]);
      var sleepQuality = clamp(Math.round(sleepHours >= 8 ? 4.3 : sleepHours >= 6 ? 3.4 : 2.3), 1, 5);
      var nausea = clamp(Math.round(2.2 - drift + rand() * 1.1), 1, 5);
      var water = pick(rand, [4, 7, 7, 7, 10, 4]);
      var activity = pick(rand, [0, 15, 15, 30, 30, 50]);

      var symptoms = [];
      if (rand() < 0.45) symptoms.push("backPain");
      if (rand() < 0.3) symptoms.push("heartburn");
      if (rand() < 0.25) symptoms.push("insomnia");
      if (rand() < 0.2) symptoms.push("swelling");
      if (rand() < 0.15) symptoms.push("headache");
      if (rand() < 0.15) symptoms.push("anxious");
      if (rand() < 0.12) symptoms.push("legCramps");

      var note = "";
      if (i === 2) note = "Back pain worse after a long day standing at work.";
      if (i === 8) note = "Woke up three times to use the bathroom, could not get back to sleep.";
      if (i === 15) note = "Felt much better on the days I got a walk in.";

      checkins[key] = {
        date: key,
        mood: mood,
        energy: energy,
        sleepHours: sleepHours,
        sleepQuality: sleepQuality,
        nausea: nausea,
        water: water,
        activity: activity,
        symptoms: symptoms,
        urgent: [],
        note: note,
        createdAt: new Date().toISOString(),
        sample: true
      };
    }

    return checkins;
  }

  /* Writes sample profile, check-ins, and questions over the current state. */
  function load() {
    var dueDate = HM.dates.toKey(HM.dates.addDays(new Date(), 91)); // ~27 weeks along
    return HM.store.update(function (state) {
      state.profile.name = state.profile.name || "Sample";
      state.profile.dueDate = dueDate;
      state.profile.providerName = state.profile.providerName || "Dr. Sample (demo)";
      state.profile.nextAppointment = HM.dates.toKey(HM.dates.addDays(new Date(), 9));
      state.profile.supportPerson = state.profile.supportPerson || "Sample partner";
      state.checkins = Object.assign(build(21), state.checkins);
      state.questions = state.questions.concat([
        { id: HM.dom.uid(), text: "Is the back pain I have been logging normal at this stage?", createdAt: new Date().toISOString(), asked: false, sample: true },
        { id: HM.dom.uid(), text: "What can I take for heartburn at night?", createdAt: new Date().toISOString(), asked: false, sample: true }
      ]);
      state.settings.sampleData = true;
    });
  }

  /* Removes only the sample rows, keeping anything the user entered. */
  function clear() {
    return HM.store.update(function (state) {
      Object.keys(state.checkins).forEach(function (key) {
        if (state.checkins[key] && state.checkins[key].sample) delete state.checkins[key];
      });
      state.questions = state.questions.filter(function (q) { return !q.sample; });
      state.settings.sampleData = false;
    });
  }

  function isLoaded(state) {
    return !!(state && state.settings && state.settings.sampleData);
  }

  return { load: load, clear: clear, isLoaded: isLoaded, build: build };
})();
