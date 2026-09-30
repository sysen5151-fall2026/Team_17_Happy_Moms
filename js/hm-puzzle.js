/* ==========================================================================
   Happy Moms — daily puzzle
   A five-letter word game on a pregnancy-wellness theme. Everyone gets the
   same word each day, solving reveals a short note from the tip library, and
   the result can be shared with a support network. The engagement half of the
   mission analysis: the game is what brings people back to the check-in.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var el = HM.dom.el;
  var ROWS = 6;
  var COLS = 5;

  var KEY_ROWS = [
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    ["ENTER"].concat("ZXCVBNM".split("")).concat(["DEL"])
  ];

  var game = {
    dateKey: "",
    answer: "",
    note: "",
    guesses: [],
    current: "",
    status: "playing"
  };

  var nodes = {};

  /* ------------------------------------------------------------ daily word */

  function wordForDate(dateKey) {
    var list = HM.content.puzzleWords;
    return list[HM.content.dailyIndex(dateKey, list.length)];
  }

  /* ------------------------------------------------------------- scoring */

  /* Standard two-pass scoring so repeated letters behave correctly: exact
     matches are consumed first, then remaining letters can score "present". */
  function score(guess, answer) {
    var result = new Array(COLS).fill("absent");
    var pool = {};

    for (var i = 0; i < COLS; i++) {
      if (guess[i] === answer[i]) {
        result[i] = "correct";
      } else {
        pool[answer[i]] = (pool[answer[i]] || 0) + 1;
      }
    }

    for (var j = 0; j < COLS; j++) {
      if (result[j] === "correct") continue;
      var ch = guess[j];
      if (pool[ch] > 0) {
        result[j] = "present";
        pool[ch] -= 1;
      }
    }

    return result;
  }

  /* --------------------------------------------------------------- storage */

  function save() {
    HM.store.update(function (state) {
      state.puzzle[game.dateKey] = {
        word: game.answer,
        guesses: game.guesses.slice(),
        status: game.status
      };
    });
  }

  function restore() {
    var saved = (HM.store.load().puzzle || {})[game.dateKey];
    if (!saved || saved.word !== game.answer) return;
    game.guesses = (saved.guesses || []).slice();
    game.status = saved.status || "playing";
  }

  function stats() {
    var puzzles = HM.store.load().puzzle || {};
    var keys = Object.keys(puzzles).sort();
    var played = 0;
    var won = 0;

    keys.forEach(function (k) {
      var p = puzzles[k];
      if (!p || p.status === "playing") return;
      played++;
      if (p.status === "won") won++;
    });

    /* Streak of consecutive days solved, counting back from today. */
    var streak = 0;
    var cursor = new Date();
    var todayEntry = puzzles[HM.dates.toKey(cursor)];
    if (!todayEntry || todayEntry.status === "playing") cursor = HM.dates.addDays(cursor, -1);
    while (true) {
      var entry = puzzles[HM.dates.toKey(cursor)];
      if (entry && entry.status === "won") {
        streak++;
        cursor = HM.dates.addDays(cursor, -1);
      } else {
        break;
      }
    }

    return {
      played: played,
      won: won,
      winRate: played ? Math.round((won / played) * 100) : 0,
      streak: streak
    };
  }

  /* ---------------------------------------------------------------- render */

  function renderBoard() {
    nodes.board.innerHTML = "";

    for (var r = 0; r < ROWS; r++) {
      var row = el("div", { class: "pz-row" });
      var guess = game.guesses[r];
      var marks = guess ? score(guess, game.answer) : null;
      var isCurrentRow = r === game.guesses.length && game.status === "playing";

      for (var c = 0; c < COLS; c++) {
        var letter = "";
        var cls = "pz-tile";

        if (guess) {
          letter = guess[c];
          cls += " " + marks[c];
        } else if (isCurrentRow && game.current[c]) {
          letter = game.current[c];
          cls += " filled";
        }

        row.appendChild(el("div", {
          class: cls,
          role: "img",
          "aria-label": letter
            ? letter + (marks ? ", " + marks[c] : "")
            : "empty"
        }, [letter]));
      }
      nodes.board.appendChild(row);
    }
  }

  function letterStates() {
    var states = {};
    var rank = { absent: 0, present: 1, correct: 2 };

    game.guesses.forEach(function (guess) {
      var marks = score(guess, game.answer);
      guess.split("").forEach(function (ch, i) {
        var next = marks[i];
        if (!states[ch] || rank[next] > rank[states[ch]]) states[ch] = next;
      });
    });

    return states;
  }

  function renderKeyboard() {
    var states = letterStates();
    nodes.keyboard.innerHTML = "";

    KEY_ROWS.forEach(function (row) {
      var rowEl = el("div", { class: "pz-krow" });
      row.forEach(function (key) {
        var wide = key.length > 1;
        var cls = "pz-key" + (wide ? " wide" : "") + (states[key] ? " " + states[key] : "");
        rowEl.appendChild(el("button", {
          type: "button",
          class: cls,
          "aria-label": key === "DEL" ? "Delete letter" : key === "ENTER" ? "Submit guess" : key,
          onclick: function () { handleKey(key); }
        }, [key === "DEL" ? "⌫" : key]));
      });
      nodes.keyboard.appendChild(rowEl);
    });
  }

  function setStatus(message) {
    nodes.status.textContent = message || "";
  }

  function shareGrid() {
    return game.guesses.map(function (guess) {
      return score(guess, game.answer).map(function (m) {
        return m === "correct" ? "🟩" : m === "present" ? "🟨" : "⬜";
      }).join("");
    }).join("\n");
  }

  function shareText() {
    var label = game.status === "won" ? game.guesses.length + "/" + ROWS : "X/" + ROWS;
    return "Happy Moms daily puzzle · " + HM.dates.formatDate(game.dateKey) + "\n" +
      label + "\n" + shareGrid();
  }

  function renderResult() {
    if (game.status === "playing") {
      nodes.result.hidden = true;
      return;
    }

    var s = stats();
    var won = game.status === "won";

    nodes.result.hidden = false;
    nodes.result.innerHTML =
      "<h3>" + (won
        ? (game.guesses.length === 1 ? "First guess. Remarkable." : "Solved in " + game.guesses.length + ".")
        : "Out of guesses for today.") + "</h3>" +
      '<div class="word">' + HM.dom.escapeHtml(game.answer) + "</div>" +
      '<div class="pz-share-grid" aria-hidden="true">' + shareGrid().replace(/\n/g, "<br>") + "</div>" +
      '<p class="note">' + HM.dom.escapeHtml(game.note) + "</p>" +
      '<div class="row">' +
        '<button type="button" class="btn btn-primary btn-sm" id="pzShare">Copy result to share</button>' +
        '<a class="btn btn-quiet btn-sm" href="checkin.html">Do today’s check-in</a>' +
      "</div>" +
      '<div class="pz-stats">' +
        '<div class="pz-stat"><strong>' + s.played + "</strong><span>played</span></div>" +
        '<div class="pz-stat"><strong>' + s.winRate + "%</strong><span>solved</span></div>" +
        '<div class="pz-stat"><strong>' + s.streak + "</strong><span>day streak</span></div>" +
      "</div>" +
      '<p class="small muted" style="margin:16px 0 0">A new word arrives tomorrow.</p>';

    var btn = document.getElementById("pzShare");
    btn.addEventListener("click", function () {
      var text = shareText();
      if (navigator.share) {
        navigator.share({ title: "Happy Moms daily puzzle", text: text })
          .catch(function () { copyShare(text); });
      } else {
        copyShare(text);
      }
    });
  }

  function copyShare(text) {
    HM.dom.copyText(text).then(function (ok) {
      HM.dom.toast(ok ? "Result copied, ready to share" : "Could not copy on this browser");
    });
  }

  function renderAll() {
    renderBoard();
    renderKeyboard();
    renderResult();
  }

  /* ------------------------------------------------------------------ play */

  function submitGuess() {
    if (game.current.length < COLS) {
      setStatus("Five letters needed.");
      return;
    }

    var guess = game.current.toUpperCase();
    game.guesses.push(guess);
    game.current = "";

    if (guess === game.answer) {
      game.status = "won";
      setStatus("");
    } else if (game.guesses.length >= ROWS) {
      game.status = "lost";
      setStatus("");
    } else {
      setStatus(ROWS - game.guesses.length + " guess" +
        (ROWS - game.guesses.length === 1 ? "" : "es") + " left.");
    }

    save();
    renderAll();
  }

  function handleKey(key) {
    if (game.status !== "playing") return;

    if (key === "ENTER") {
      submitGuess();
      return;
    }
    if (key === "DEL") {
      game.current = game.current.slice(0, -1);
      setStatus("");
      renderBoard();
      return;
    }
    if (/^[A-Z]$/.test(key) && game.current.length < COLS) {
      game.current += key;
      setStatus("");
      renderBoard();
    }
  }

  /* ------------------------------------------------------------------ init */

  function init() {
    nodes.board = document.getElementById("pzBoard");
    if (!nodes.board) return;

    nodes.keyboard = document.getElementById("pzKeyboard");
    nodes.status = document.getElementById("pzStatus");
    nodes.result = document.getElementById("pzResult");

    game.dateKey = HM.dates.todayKey();
    var pick = wordForDate(game.dateKey);
    game.answer = pick.word;
    game.note = pick.note;

    restore();
    renderAll();

    if (game.status === "playing" && game.guesses.length) {
      setStatus(ROWS - game.guesses.length + " guesses left.");
    }

    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Enter") { e.preventDefault(); handleKey("ENTER"); }
      else if (e.key === "Backspace") { e.preventDefault(); handleKey("DEL"); }
      else if (/^[a-zA-Z]$/.test(e.key)) { handleKey(e.key.toUpperCase()); }
    });
  }

  HM.puzzle = {
    init: init,
    score: score,
    wordForDate: wordForDate,
    shareText: shareText,
    stats: stats
  };
  HM.dom.ready(init);
})(window.HM);
