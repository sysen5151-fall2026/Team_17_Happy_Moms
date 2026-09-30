/* ==========================================================================
   Happy Moms — insights engine
   Turns stored check-ins into counts, averages, series, and plain-language
   observations. Shared by the Today page, Trends, and the visit notes so all
   three always agree.

   Everything here is descriptive: it reports what was logged. It never
   interprets a pattern as a condition, and never recommends treatment.
   ========================================================================== */
window.HM = window.HM || {};

HM.insights = (function () {
  "use strict";

  /* Metrics that produce a number worth charting. */
  var metrics = [
    { id: "mood", label: "Mood", unit: "of 5", domain: [1, 5], direction: "higherBetter", threshold: 0.6 },
    { id: "energy", label: "Energy", unit: "of 5", domain: [1, 5], direction: "higherBetter", threshold: 0.6 },
    { id: "sleepHours", label: "Sleep", unit: "hours", domain: [0, 10], direction: "higherBetter", threshold: 0.8 },
    { id: "sleepQuality", label: "Sleep quality", unit: "of 5", domain: [1, 5], direction: "higherBetter", threshold: 0.6 },
    { id: "nausea", label: "Nausea", unit: "of 5", domain: [1, 5], direction: "lowerBetter", threshold: 0.6 },
    { id: "water", label: "Water", unit: "cups", domain: [0, 12], direction: "higherBetter", threshold: 1.5 },
    { id: "activity", label: "Movement", unit: "minutes", domain: [0, 60], direction: "higherBetter", threshold: 8 }
  ];

  function metric(id) {
    return metrics.filter(function (m) { return m.id === id; })[0] || null;
  }

  /* ------------------------------------------------------------- selection */

  /* All check-ins as an array, oldest first. */
  function entries(state) {
    var map = (state && state.checkins) || {};
    return Object.keys(map).sort().map(function (key) {
      var entry = Object.assign({}, map[key]);
      entry.date = key;
      return entry;
    });
  }

  function entriesBetween(state, startKey, endKey) {
    return entries(state).filter(function (e) {
      return e.date >= startKey && e.date <= endKey;
    });
  }

  /* Day keys from start to end inclusive. */
  function rangeKeys(startKey, endKey) {
    var out = [];
    var cursor = HM.dates.fromKey(startKey);
    var end = HM.dates.fromKey(endKey);
    while (cursor <= end) {
      out.push(HM.dates.toKey(cursor));
      cursor = HM.dates.addDays(cursor, 1);
    }
    return out;
  }

  /* --------------------------------------------------------------- series */

  /* One point per day over the last `days` days, null where nothing logged. */
  function series(state, metricId, days) {
    var map = (state && state.checkins) || {};
    return HM.dates.recentKeys(days).map(function (key) {
      var entry = map[key];
      var value = entry && typeof entry[metricId] === "number" ? entry[metricId] : null;
      return { label: HM.dates.formatDate(key), value: value, date: key };
    });
  }

  function values(state, metricId, dayKeys) {
    var map = (state && state.checkins) || {};
    return dayKeys.map(function (key) {
      var entry = map[key];
      return entry && typeof entry[metricId] === "number" ? entry[metricId] : null;
    }).filter(function (v) { return v !== null; });
  }

  function average(state, metricId, days) {
    return HM.stats.mean(values(state, metricId, HM.dates.recentKeys(days)));
  }

  /* This week against the week before it. */
  function delta(state, metricId) {
    var recent = HM.dates.recentKeys(14);
    var prevKeys = recent.slice(0, 7);
    var thisKeys = recent.slice(7);
    var prev = HM.stats.mean(values(state, metricId, prevKeys));
    var now = HM.stats.mean(values(state, metricId, thisKeys));
    var prevCount = values(state, metricId, prevKeys).length;
    var nowCount = values(state, metricId, thisKeys).length;
    return {
      metricId: metricId,
      previous: prev,
      current: now,
      change: (prev === null || now === null) ? null : now - prev,
      previousCount: prevCount,
      currentCount: nowCount,
      comparable: prevCount >= 3 && nowCount >= 3
    };
  }

  /* ------------------------------------------------------------- coverage */

  /* The continuity measure from the mission analysis: share of gestational
     weeks since tracking began that carry at least one entry.

     Numerator and denominator are bucketed the same way on purpose. Counting
     entry weeks by gestational week but the span by calendar week lets the
     numerator exceed the denominator, because 21 tracked days can straddle
     four gestational weeks. */
  function coverage(state) {
    var all = entries(state);
    if (!all.length) {
      return { percent: 0, weeksWithEntry: 0, weeksTracked: 0, totalEntries: 0 };
    }

    var profile = (state && state.profile) || {};
    var firstKey = all[0].date;
    var todayKey = HM.dates.todayKey();

    function bucketOf(dateKey) {
      var week = HM.gestation.weekOfDate(profile, dateKey);
      /* Without a due date, fall back to weeks since tracking started. */
      return week === null
        ? Math.floor(HM.dates.daysBetween(firstKey, dateKey) / 7)
        : week;
    }

    /* Every gestational week the tracked span touches, entry or not. */
    var trackedBuckets = {};
    rangeKeys(firstKey, todayKey).forEach(function (key) {
      trackedBuckets[bucketOf(key)] = true;
    });

    var entryBuckets = {};
    all.forEach(function (e) { entryBuckets[bucketOf(e.date)] = true; });

    var weeksTracked = Math.max(1, Object.keys(trackedBuckets).length);
    var weeksWithEntry = Math.min(Object.keys(entryBuckets).length, weeksTracked);

    return {
      percent: Math.min(100, Math.round((weeksWithEntry / weeksTracked) * 100)),
      weeksWithEntry: weeksWithEntry,
      weeksTracked: weeksTracked,
      totalEntries: all.length
    };
  }

  /* ------------------------------------------------------------- symptoms */

  function symptomCounts(state, days) {
    var keys = HM.dates.recentKeys(days);
    var map = (state && state.checkins) || {};
    var counts = {};
    keys.forEach(function (key) {
      var entry = map[key];
      if (!entry || !entry.symptoms) return;
      entry.symptoms.forEach(function (s) { counts[s] = (counts[s] || 0) + 1; });
    });
    return Object.keys(counts).map(function (value) {
      return {
        value: value,
        label: HM.content.symptomLabels[value] || value,
        count: counts[value]
      };
    }).sort(function (a, b) { return b.count - a.count; });
  }

  /* Urgent signs the user marked, newest first. */
  function urgentEvents(state, days) {
    var keys = HM.dates.recentKeys(days).slice().reverse();
    var map = (state && state.checkins) || {};
    var out = [];
    keys.forEach(function (key) {
      var entry = map[key];
      if (!entry || !entry.urgent || !entry.urgent.length) return;
      out.push({
        date: key,
        signs: entry.urgent.map(function (u) { return HM.content.urgentLabels[u] || u; }),
        codes: entry.urgent.slice()
      });
    });
    return out;
  }

  function notes(state, days) {
    var keys = HM.dates.recentKeys(days).slice().reverse();
    var map = (state && state.checkins) || {};
    var out = [];
    keys.forEach(function (key) {
      var entry = map[key];
      if (entry && entry.note && String(entry.note).trim()) {
        out.push({ date: key, note: String(entry.note).trim() });
      }
    });
    return out;
  }

  /* ---------------------------------------------------------- observations */

  function describeChange(m, d) {
    var unit = m.unit === "of 5" ? "" : " " + m.unit;
    var now = HM.stats.round(d.current, 1);
    var was = HM.stats.round(d.previous, 1);
    var direction = d.change > 0 ? "up from" : "down from";
    return m.label + " averaged " + now + unit + " over the last 7 days, " +
      direction + " " + was + unit + " the week before.";
  }

  /* Plain observations, ordered by how much a reader would care. */
  function observations(state) {
    var out = [];
    var all = entries(state);

    if (all.length < 3) {
      out.push({
        kind: "info",
        text: "A few more daily check-ins will make trends and visit notes worth reading. " +
          "Three days is enough to start seeing a pattern."
      });
      return out;
    }

    /* Urgent markings always come first. */
    urgentEvents(state, 30).forEach(function (event) {
      out.push({
        kind: "urgent",
        text: "You marked " + event.signs.join(" and ").toLowerCase() + " on " +
          HM.dates.formatDate(event.date, "long") +
          ". Bring this up with your provider, and use urgent help if it is happening now."
      });
    });

    /* Metric shifts week over week. */
    metrics.forEach(function (m) {
      var d = delta(state, m.id);
      if (!d.comparable || d.change === null) return;
      if (Math.abs(d.change) < m.threshold) return;
      var improving = m.direction === "higherBetter" ? d.change > 0 : d.change < 0;
      out.push({ kind: improving ? "good" : "watch", text: describeChange(m, d) });
    });

    /* Repeating symptoms. */
    symptomCounts(state, 14).forEach(function (s) {
      if (s.count < 3) return;
      out.push({
        kind: "watch",
        text: s.label + " logged on " + s.count + " of the last 14 days."
      });
    });

    /* Steady habits are worth naming too. */
    var waterAvg = average(state, "water", 7);
    if (waterAvg !== null && waterAvg >= 7) {
      out.push({ kind: "good", text: "Water held around " + HM.stats.round(waterAvg, 1) + " cups a day this week." });
    }
    var activityAvg = average(state, "activity", 7);
    if (activityAvg !== null && activityAvg >= 20) {
      out.push({
        kind: "good",
        text: "Movement averaged " + Math.round(activityAvg) + " minutes a day, which is on pace with the " +
          "150 minutes a week that general guidance suggests."
      });
    }

    var streak = HM.stats.streak(state.checkins);
    if (streak >= 3) {
      out.push({ kind: "good", text: streak + " days of check-ins in a row." });
    }

    if (out.length === 0) {
      out.push({
        kind: "info",
        text: "Nothing has shifted much in the last two weeks. Steady is a good place to be."
      });
    }

    return out;
  }

  /* Everything the Today page needs in one call. */
  function today(state) {
    var key = HM.dates.todayKey();
    var entry = (state.checkins || {})[key] || null;
    var g = HM.gestation.of(state.profile);
    return {
      dateKey: key,
      entry: entry,
      done: !!entry,
      gestation: g,
      streak: HM.stats.streak(state.checkins),
      coverage: coverage(state),
      moodSeries: series(state, "mood", 14)
    };
  }

  return {
    metrics: metrics,
    metric: metric,
    entries: entries,
    entriesBetween: entriesBetween,
    rangeKeys: rangeKeys,
    series: series,
    values: values,
    average: average,
    delta: delta,
    coverage: coverage,
    symptomCounts: symptomCounts,
    urgentEvents: urgentEvents,
    notes: notes,
    observations: observations,
    today: today
  };
})();
