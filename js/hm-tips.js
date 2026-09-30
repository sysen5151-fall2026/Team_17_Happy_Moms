/* ==========================================================================
   Happy Moms — wellness tips
   Renders the tip library with topic filters, saved favourites, and deep
   links from the check-in and the assistant. Cards come from hm-content.js,
   so adding a tip is a one-object change with no markup to touch.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var el = HM.dom.el;
  var view = { topic: "all", onlyFavorites: false };

  function heartIcon(filled) {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="' + (filled ? "currentColor" : "none") +
      '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 20s-7.2-4.6-9.8-9C.6 8 1.8 4.5 5 3.4c2.1-.7 4.2.1 5.5 1.9C11.8 3.5 13.9 2.7 16 3.4c3.2 1.1 4.4 4.6 2.8 7.6C16.2 15.4 12 20 12 20z"/></svg>';
  }

  function isFavorite(state, id) {
    return (state.favorites || []).indexOf(id) !== -1;
  }

  function toggleFavorite(id) {
    HM.store.update(function (s) {
      var at = s.favorites.indexOf(id);
      if (at === -1) s.favorites.push(id);
      else s.favorites.splice(at, 1);
    });
  }

  function topicLabel(topicId) {
    var t = HM.content.topics.filter(function (x) { return x.id === topicId; })[0];
    return t ? t.label : topicId;
  }

  /* ---------------------------------------------------------------- filters */

  function renderFilters(state) {
    var host = document.getElementById("tipFilters");
    var favCount = (state.favorites || []).length;
    host.innerHTML = "";

    var options = [{ id: "all", label: "All topics" }].concat(HM.content.topics);

    options.forEach(function (t) {
      var count = t.id === "all"
        ? HM.content.tips.length
        : HM.content.tipsForTopic(t.id).length;

      host.appendChild(el("button", {
        type: "button",
        class: "tab-btn" + (view.topic === t.id && !view.onlyFavorites ? " active" : ""),
        "aria-pressed": String(view.topic === t.id && !view.onlyFavorites),
        onclick: function () {
          view.topic = t.id;
          view.onlyFavorites = false;
          render();
        }
      }, [t.label + " (" + count + ")"]));
    });

    host.appendChild(el("button", {
      type: "button",
      class: "tab-btn" + (view.onlyFavorites ? " active" : ""),
      "aria-pressed": String(view.onlyFavorites),
      onclick: function () {
        view.onlyFavorites = !view.onlyFavorites;
        render();
      }
    }, ["Saved (" + favCount + ")"]));
  }

  /* ------------------------------------------------------------------ cards */

  function renderCards(state) {
    var host = document.getElementById("tipGrid");
    var list = HM.content.tips.slice();

    if (view.onlyFavorites) {
      list = list.filter(function (t) { return isFavorite(state, t.id); });
    } else if (view.topic !== "all") {
      list = list.filter(function (t) { return t.topic === view.topic; });
    }

    host.innerHTML = "";

    if (!list.length) {
      host.appendChild(el("div", {
        class: "empty",
        style: "grid-column:1/-1",
        html: view.onlyFavorites
          ? "<h3>Nothing saved yet</h3><p>Tap the heart on any card to keep it here.</p>"
          : "<h3>No cards in this topic yet</h3><p>Pick another topic above.</p>"
      }));
      return;
    }

    list.forEach(function (tip) {
      var source = HM.config.sources[tip.source];
      var fav = isFavorite(state, tip.id);

      var card = el("article", { class: "tip-card", id: tip.id });
      card.appendChild(el("div", { class: "tile-label", text: topicLabel(tip.topic) }));
      card.appendChild(el("h3", { text: tip.title }));
      card.appendChild(el("p", { text: tip.body }));

      var foot = el("div", { class: "tip-foot" });
      foot.appendChild(el("a", {
        class: "source-badge",
        href: source.url,
        target: "_blank",
        rel: "noopener noreferrer",
        title: "Informed by " + source.name,
        text: source.short
      }));

      var favBtn = el("button", {
        type: "button",
        class: "fav-btn" + (fav ? " on" : ""),
        "aria-pressed": String(fav),
        "aria-label": (fav ? "Remove " : "Save ") + tip.title,
        html: heartIcon(fav) + "<span>" + (fav ? "Saved" : "Save") + "</span>",
        onclick: function () {
          toggleFavorite(tip.id);
          render();
        }
      });
      foot.appendChild(favBtn);

      card.appendChild(foot);
      host.appendChild(card);
    });
  }

  /* --------------------------------------------------- symptom suggestions */

  /* When recent check-ins show a recurring symptom, surface the cards that
     speak to it rather than making people hunt. */
  function renderForYou(state) {
    var host = document.getElementById("tipForYou");
    if (!host) return;

    var recurring = HM.insights.symptomCounts(state, 14).filter(function (s) {
      return s.count >= 2 && HM.content.tipsForSymptom(s.value).length;
    }).slice(0, 3);

    if (!recurring.length) {
      host.hidden = true;
      return;
    }

    host.hidden = false;
    var inner = el("div", {});
    inner.appendChild(el("div", { class: "panel-head" }, [
      el("h2", { text: "Matched to your recent check-ins" })
    ]));
    inner.appendChild(el("p", {
      class: "panel-sub",
      text: "Drawn from what you logged in the last 14 days. Nothing here is a diagnosis."
    }));

    var grid = el("div", { class: "tip-grid" });
    recurring.forEach(function (s) {
      var tip = HM.content.tipsForSymptom(s.value)[0];
      var source = HM.config.sources[tip.source];
      grid.appendChild(el("article", {
        class: "tip-card",
        html:
          '<div class="tile-label">' + HM.dom.escapeHtml(s.label) + " · " + s.count + " day" +
            (s.count === 1 ? "" : "s") + "</div>" +
          "<h3>" + HM.dom.escapeHtml(tip.title) + "</h3>" +
          "<p>" + HM.dom.escapeHtml(tip.body) + "</p>" +
          '<div class="tip-foot"><a class="source-badge" href="' + source.url +
            '" target="_blank" rel="noopener noreferrer">' + HM.dom.escapeHtml(source.short) + "</a>" +
          '<a class="msg-action" href="assistant.html?q=' + encodeURIComponent(s.label) +
            '">Ask the assistant</a></div>'
      }));
    });

    inner.appendChild(grid);
    host.innerHTML = "";
    host.appendChild(inner);
  }

  function render() {
    var state = HM.store.load();
    renderFilters(state);
    renderCards(state);
    renderForYou(state);
  }

  function init() {
    if (!document.getElementById("tipGrid")) return;

    var params = new URLSearchParams(window.location.search);
    var topic = params.get("topic");
    if (topic && HM.content.topics.some(function (t) { return t.id === topic; })) {
      view.topic = topic;
    }
    if (params.get("saved") === "1") view.onlyFavorites = true;

    render();

    /* Deep link to a single card, e.g. tips.html#t-side */
    if (window.location.hash) {
      var target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.style.borderColor = "var(--color-rose-deep)";
      }
    }
  }

  HM.tips = { init: init, render: render };
  HM.dom.ready(init);
})(window.HM);
