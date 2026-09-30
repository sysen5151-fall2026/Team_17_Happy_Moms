/* ==========================================================================
   Happy Moms — guardrailed wellness assistant

   How the guardrails work, in order:
     1. Every question is screened against the red-flag list first. A hit
        routes to urgent help and the knowledge base is never consulted.
     2. Otherwise the question is matched against a fixed library of answers
        written in advance by the team. Nothing is generated at run time, so
        the assistant cannot invent an answer or drift off source.
     3. No match returns an honest "not covered" reply rather than a guess.

   This is the MVP shape described in the mission analysis: approved content
   first, with a language model reserved for later phases behind the same
   guardrails.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var el = HM.dom.el;
  var nodes = {};

  var SUGGESTIONS = [
    "How much caffeine is okay?",
    "What helps with heartburn at night?",
    "Is it safe to fly at 30 weeks?",
    "Which fish should I avoid?",
    "What sleep position is best?",
    "How much water should I drink?",
    "Can I keep going to the gym?",
    "What can you not help with?"
  ];

  /* ------------------------------------------------------------ guardrails */

  function normalise(text) {
    return " " + String(text).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim() + " ";
  }

  /* Returns the matching red-flag group, or null. */
  function screenForRedFlags(text) {
    var hay = normalise(text);
    for (var i = 0; i < HM.content.redFlags.length; i++) {
      var group = HM.content.redFlags[i];
      for (var j = 0; j < group.patterns.length; j++) {
        if (hay.indexOf(" " + group.patterns[j] + " ") !== -1 ||
            hay.indexOf(" " + group.patterns[j]) !== -1) {
          return { category: group.category, matched: group.patterns[j] };
        }
      }
    }
    return null;
  }

  /* Keyword scoring over the fixed library. Longer phrase matches count for
     more, so "morning sickness" beats a stray "sick". */
  function findAnswer(text) {
    var hay = normalise(text);
    var best = null;
    var bestScore = 0;

    HM.content.kb.forEach(function (entry) {
      var score = 0;
      entry.keywords.forEach(function (kw) {
        var needle = normalise(kw).trim();
        if (!needle) return;
        if (hay.indexOf(" " + needle + " ") !== -1 || hay.indexOf(" " + needle) !== -1) {
          score += needle.indexOf(" ") !== -1 ? 3 : 2;
        }
      });
      /* A word from the title is a weak signal, enough to break ties. */
      normalise(entry.title).trim().split(" ").forEach(function (word) {
        if (word.length > 4 && hay.indexOf(" " + word) !== -1) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    });

    return bestScore >= 2 ? best : null;
  }

  /* ---------------------------------------------------------------- render */

  function addUserMessage(text) {
    nodes.log.appendChild(el("div", { class: "msg msg-user", text: text }));
    scrollLog();
  }

  function sourceBadge(sourceKey) {
    var s = HM.config.sources[sourceKey];
    if (!s) return null;
    return el("a", {
      class: "source-badge",
      href: s.url,
      target: "_blank",
      rel: "noopener noreferrer",
      title: "Informed by " + s.name
    }, ["Informed by " + s.short]);
  }

  function addAnswer(entry) {
    var body = el("div", { class: "msg msg-bot" });
    body.appendChild(el("h4", { text: entry.title }));
    body.appendChild(el("p", { text: entry.answer }));

    var foot = el("div", { class: "msg-foot" });
    var badge = sourceBadge(entry.source);
    if (badge) foot.appendChild(badge);

    foot.appendChild(el("button", {
      type: "button",
      class: "msg-action",
      onclick: function () {
        HM.store.update(function (s) {
          s.questions.push({
            id: HM.dom.uid(),
            text: "About " + entry.title.toLowerCase() + ": ",
            createdAt: new Date().toISOString(),
            asked: false
          });
        });
        HM.dom.toast("Added to your provider questions");
      }
    }, ["Ask my provider about this"]));

    (entry.related || []).slice(0, 2).forEach(function (tipId) {
      var tip = HM.content.tipById(tipId);
      if (!tip) return;
      foot.appendChild(el("a", {
        class: "msg-action",
        href: "tips.html?topic=" + tip.topic,
        text: tip.title
      }));
    });

    body.appendChild(foot);
    nodes.log.appendChild(body);
    scrollLog();

    HM.store.update(function (s) {
      s.assistant.push({ query: entry.id, entryId: entry.id, at: new Date().toISOString() });
      if (s.assistant.length > 50) s.assistant = s.assistant.slice(-50);
    });
  }

  function addRedFlag(flag) {
    var mental = flag.category === "mental";
    var body = el("div", { class: "msg msg-bot msg-urgent" });

    body.appendChild(el("h4", { text: mental ? "Please reach out now" : "This needs a provider, not an app" }));

    body.appendChild(el("p", {
      text: mental
        ? "What you described is something to talk through with a person, right now. The 988 " +
          "Suicide and Crisis Lifeline is free, confidential, and open 24 hours. If you are in " +
          "immediate danger, call 911."
        : "What you described is on the list of pregnancy warning signs, and it is not something " +
          "this assistant will try to answer. Call your provider now, or go to labor and delivery " +
          "or an emergency room if it is severe. Trust yourself here: providers would much rather " +
          "hear from you and find nothing wrong."
    }));

    var row = el("div", { class: "row" });
    if (mental) {
      row.appendChild(el("a", { class: "btn btn-primary btn-sm", href: "tel:988", text: "Call or text 988" }));
      row.appendChild(el("a", { class: "btn btn-quiet btn-sm", href: "sms:741741", text: "Text HOME to 741741" }));
    } else {
      row.appendChild(el("a", { class: "btn btn-primary btn-sm", href: "crisis.html", text: "Open urgent help" }));
      row.appendChild(el("a", { class: "btn btn-quiet btn-sm", href: "tel:911", text: "Call 911" }));
    }
    body.appendChild(row);

    nodes.log.appendChild(body);
    scrollLog();
  }

  function addNoMatch(text) {
    var body = el("div", { class: "msg msg-bot" });
    body.appendChild(el("h4", { text: "Not something I cover" }));
    body.appendChild(el("p", {
      text: "I only answer from a fixed library of general pregnancy wellness topics, and nothing " +
        "in it matches that closely enough to answer honestly. Rather than guess, here is the " +
        "better route: save it as a question for your provider, or browse the wellness tips."
    }));

    var foot = el("div", { class: "msg-foot" });
    foot.appendChild(el("button", {
      type: "button",
      class: "msg-action",
      onclick: function () {
        HM.store.update(function (s) {
          s.questions.push({
            id: HM.dom.uid(),
            text: text,
            createdAt: new Date().toISOString(),
            asked: false
          });
        });
        HM.dom.toast("Saved as a question for your provider");
      }
    }, ["Save this as a provider question"]));
    foot.appendChild(el("a", { class: "msg-action", href: "tips.html", text: "Browse wellness tips" }));
    body.appendChild(foot);

    nodes.log.appendChild(body);
    scrollLog();
  }

  function scrollLog() {
    nodes.log.scrollTop = nodes.log.scrollHeight;
  }

  /* ------------------------------------------------------------------ flow */

  function ask(text) {
    var trimmed = String(text || "").trim();
    if (!trimmed) return;

    addUserMessage(trimmed);

    var flag = screenForRedFlags(trimmed);
    if (flag) {
      addRedFlag(flag);
      return;
    }

    var entry = findAnswer(trimmed);
    if (entry) addAnswer(entry);
    else addNoMatch(trimmed);
  }

  function renderSuggestions() {
    nodes.suggestions.innerHTML = "";
    SUGGESTIONS.forEach(function (text) {
      nodes.suggestions.appendChild(el("button", {
        type: "button",
        class: "suggest-btn",
        onclick: function () { ask(text); }
      }, [text]));
    });
  }

  function renderTopicCloud() {
    var host = document.getElementById("topicCloud");
    if (!host) return;
    host.innerHTML = "";
    HM.content.kb.forEach(function (entry) {
      if (entry.topic === "about") return;
      host.appendChild(el("button", {
        type: "button",
        class: "suggest-btn",
        onclick: function () {
          addUserMessage(entry.title);
          addAnswer(entry);
        }
      }, [entry.title]));
    });
  }

  function greet() {
    var body = el("div", { class: "msg msg-bot" });
    body.appendChild(el("h4", { text: "Before we start" }));
    body.appendChild(el("p", {
      text: "I answer from a small library of general pregnancy wellness topics, written in advance " +
        "and informed by ACOG, NIH, FDA, and CDC guidance. I cannot diagnose anything, read your " +
        "check-ins, or tell you whether a medication is safe for you."
    }));
    body.appendChild(el("p", {
      text: "Anything urgent goes straight to your provider. Ask me about caffeine, sleep, food " +
        "safety, exercise, travel, everyday discomforts, or what to expect at visits."
    }));
    nodes.log.appendChild(body);
  }

  function init() {
    nodes.log = document.getElementById("chatLog");
    if (!nodes.log) return;

    nodes.suggestions = document.getElementById("chatSuggestions");
    nodes.form = document.getElementById("chatForm");
    nodes.input = document.getElementById("chatInput");

    nodes.form.addEventListener("submit", function (e) {
      e.preventDefault();
      ask(nodes.input.value);
      nodes.input.value = "";
    });

    greet();
    renderSuggestions();
    renderTopicCloud();

    /* Let the Today page or a tip deep-link a question in. */
    var params = new URLSearchParams(window.location.search);
    var q = params.get("q");
    if (q) ask(q);
  }

  HM.assistant = {
    init: init,
    ask: ask,
    screenForRedFlags: screenForRedFlags,
    findAnswer: findAnswer
  };
  HM.dom.ready(init);
})(window.HM);
