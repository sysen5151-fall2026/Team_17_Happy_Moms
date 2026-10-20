/* ==========================================================================
   Happy Moms — local accounts
   Sign up, log in, and log out, entirely in this browser. There is still no
   server: accounts live in localStorage next to the data they unlock, and
   each account's data is kept under its own storage key.

   Passwords are never stored. A salted PBKDF2-SHA256 hash is kept instead,
   computed with the browser's Web Crypto API. This keeps a shared device's
   other users out of the app; it does not encrypt the data at rest.

   Load order matters: this file runs before hm-core.js, which reads the
   session to decide which storage key holds the signed-in user's data.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var ACCOUNTS_KEY = "happymoms.accounts";
  var SESSION_KEY = "happymoms.session";
  var DATA_PREFIX = "happymoms.v1";
  var ITERATIONS = 150000;

  /* App pages anyone can open signed out. Urgent help must never sit behind
     a login, and the tips are general reading with nothing personal in them. */
  var PUBLIC_APP_PAGES = ["crisis", "tips"];

  /* ------------------------------------------------------------- storage */

  function readJson(storage, key) {
    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function removeKey(storage, key) {
    try { storage.removeItem(key); } catch (err) { /* ignore */ }
  }

  function accounts() {
    var saved = readJson(window.localStorage, ACCOUNTS_KEY);
    return saved && Array.isArray(saved.users) ? saved : { version: 1, users: [] };
  }

  function saveAccounts(list) {
    return writeJson(window.localStorage, ACCOUNTS_KEY, list);
  }

  function findByEmail(email) {
    var wanted = normalizeEmail(email);
    return accounts().users.filter(function (u) { return u.email === wanted; })[0] || null;
  }

  function findById(id) {
    return accounts().users.filter(function (u) { return u.id === id; })[0] || null;
  }

  function dataKey(id) {
    return DATA_PREFIX + "." + id;
  }

  /* ------------------------------------------------------------- session */

  /* A session in sessionStorage ends with the tab; "keep me signed in" puts
     it in localStorage instead. Either way it must still match an account. */
  function current() {
    var s = readJson(window.sessionStorage, SESSION_KEY) || readJson(window.localStorage, SESSION_KEY);
    if (!s || !s.id) return null;
    var user = findById(s.id);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name };
  }

  function startSession(user, remember) {
    var s = { id: user.id, at: new Date().toISOString() };
    endSession();
    writeJson(remember ? window.localStorage : window.sessionStorage, SESSION_KEY, s);
  }

  function endSession() {
    removeKey(window.sessionStorage, SESSION_KEY);
    removeKey(window.localStorage, SESSION_KEY);
  }

  /* ------------------------------------------------------------- hashing */

  function cryptoReady() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
  }

  function toHex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (b) {
      return (b < 16 ? "0" : "") + b.toString(16);
    }).join("");
  }

  function fromHex(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }

  function hashPassword(password, saltHex, iterations) {
    var subtle = window.crypto.subtle;
    /* Started inside a promise so any failure reaches the form as a message. */
    return Promise.resolve()
      .then(function () {
        var encoded = new TextEncoder().encode(password);
        return subtle.importKey("raw", encoded, "PBKDF2", false, ["deriveBits"]);
      })
      .then(function (key) {
        return subtle.deriveBits(
          { name: "PBKDF2", salt: fromHex(saltHex), iterations: iterations, hash: "SHA-256" },
          key,
          256
        );
      })
      .then(toHex);
  }

  function randomHex(bytes) {
    var arr = new Uint8Array(bytes);
    window.crypto.getRandomValues(arr);
    return toHex(arr);
  }

  /* ---------------------------------------------------------- validation */

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function fail(message) {
    return Promise.reject(new Error(message));
  }

  /* ------------------------------------------------------------- actions */

  /* Data saved before accounts existed sits under the bare key. The first
     account created in this browser adopts it, so nobody loses a history by
     signing up. */
  function seedData(user, isFirst) {
    var key = dataKey(user.id);
    var legacy = isFirst ? readJson(window.localStorage, DATA_PREFIX) : null;
    var state = legacy || (HM.store ? HM.store.blank() : { profile: {} });
    if (HM.store) state = HM.store.migrate(state);
    if (!state.profile.name && user.name) state.profile.name = user.name;
    writeJson(window.localStorage, key, state);
    if (legacy) removeKey(window.localStorage, DATA_PREFIX);
  }

  function signUp(opts) {
    var name = String(opts.name || "").trim();
    var email = normalizeEmail(opts.email);
    var password = String(opts.password || "");

    if (!cryptoReady()) return fail(insecureMessage());
    if (!validEmail(email)) return fail("Enter a valid email address.");
    if (password.length < 8) return fail("Use a password of at least 8 characters.");
    if (opts.confirm !== undefined && opts.confirm !== password) return fail("The two passwords do not match.");
    if (findByEmail(email)) return fail("An account with that email already exists in this browser. Log in instead.");

    var salt = randomHex(16);
    return hashPassword(password, salt, ITERATIONS).then(function (hash) {
      /* Checked again: another sign-up may have finished while this hashed. */
      if (findByEmail(email)) throw new Error("An account with that email already exists in this browser. Log in instead.");
      var list = accounts();
      var isFirst = list.users.length === 0;
      var user = {
        id: "u" + randomHex(8),
        email: email,
        name: name,
        salt: salt,
        hash: hash,
        iterations: ITERATIONS,
        createdAt: new Date().toISOString()
      };
      list.users.push(user);
      if (!saveAccounts(list)) throw new Error("This browser is blocking storage, so an account cannot be saved.");
      seedData(user, isFirst);
      startSession(user, !!opts.remember);
      return { id: user.id, email: user.email, name: user.name };
    });
  }

  function logIn(opts) {
    var email = normalizeEmail(opts.email);
    var password = String(opts.password || "");
    var generic = "That email and password do not match an account in this browser.";

    if (!cryptoReady()) return fail(insecureMessage());
    if (!email || !password) return fail("Enter your email and password.");

    var user = findByEmail(email);
    if (!user) return fail(generic);

    return hashPassword(password, user.salt, user.iterations || ITERATIONS).then(function (hash) {
      if (hash !== user.hash) throw new Error(generic);
      startSession(user, !!opts.remember);
      return { id: user.id, email: user.email, name: user.name };
    });
  }

  function logOut() {
    endSession();
  }

  /* Removes the account and everything stored under it. */
  function deleteAccount() {
    var me = current();
    if (!me) return false;
    var list = accounts();
    list.users = list.users.filter(function (u) { return u.id !== me.id; });
    saveAccounts(list);
    removeKey(window.localStorage, dataKey(me.id));
    endSession();
    return true;
  }

  function insecureMessage() {
    return "This browser only allows secure sign-in over https or localhost. " +
      "Open the app at http://localhost:8000 (python3 -m http.server 8000) instead.";
  }

  /* ---------------------------------------------------------- navigation */

  function rootPrefix() {
    var declared = document.body && document.body.getAttribute("data-root");
    if (declared !== null && declared !== undefined) return declared;
    var parts = window.location.pathname.split("/");
    return parts[parts.length - 2] === "html" ? "../" : "";
  }

  function loginHref(next) {
    var base = rootPrefix() ? "login.html" : "html/login.html";
    return next ? base + "?next=" + encodeURIComponent(next) : base;
  }

  /* Only a bare page name in html/ is accepted as a return target, so a
     crafted link cannot bounce someone off to another site after login. */
  function safeNext(value) {
    var v = String(value || "");
    return /^[a-z0-9-]+\.html(#[A-Za-z0-9_-]*)?$/.test(v) && v !== "login.html" ? v : "app.html";
  }

  /* Overridable so tests can observe navigation without performing it. */
  HM.navigate = HM.navigate || function (url) { window.location.replace(url); };

  function needsLogin() {
    var body = document.body;
    if (!body || body.getAttribute("data-shell") !== "app") return false;
    return PUBLIC_APP_PAGES.indexOf(body.getAttribute("data-page")) === -1;
  }

  /* Signed-out visitors to a private app page go to the login page, which
     sends them back afterwards. The stylesheet hides the page in the
     meantime, keyed off the class set here, so nothing flashes. */
  function guard() {
    if (current() || !needsLogin()) return;
    var parts = window.location.pathname.split("/");
    var here = (parts[parts.length - 1] || "app.html") + (window.location.hash || "");
    HM.navigate(loginHref(here));
  }

  if (!current()) document.documentElement.classList.add("hm-signed-out");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", guard);
  } else {
    guard();
  }

  HM.auth = {
    current: current,
    signUp: signUp,
    logIn: logIn,
    logOut: logOut,
    deleteAccount: deleteAccount,
    dataKey: dataKey,
    loginHref: loginHref,
    safeNext: safeNext,
    cryptoReady: cryptoReady,
    insecureMessage: insecureMessage,
    hasAccounts: function () { return accounts().users.length > 0; },
    publicPages: PUBLIC_APP_PAGES,
    keys: { accounts: ACCOUNTS_KEY, session: SESSION_KEY, prefix: DATA_PREFIX }
  };
})(window.HM);
