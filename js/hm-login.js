/* ==========================================================================
   Happy Moms — login page
   Switches between the log-in and create-account forms, hands them to
   HM.auth, and returns the visitor to the page that sent them here.
   ========================================================================== */
window.HM = window.HM || {};

(function (HM) {
  "use strict";

  var nodes = {};

  function param(name) {
    var match = new RegExp("[?&]" + name + "=([^&#]*)").exec(window.location.search);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function nextPage() {
    return HM.auth.safeNext(param("next"));
  }

  function showError(message) {
    nodes.notice.hidden = true;
    nodes.error.textContent = message;
    nodes.error.hidden = !message;
  }

  function showNotice(message) {
    nodes.error.hidden = true;
    nodes.notice.textContent = message;
    nodes.notice.hidden = !message;
  }

  function selectTab(which) {
    var signup = which === "signup";
    nodes.loginForm.hidden = signup;
    nodes.signupForm.hidden = !signup;
    nodes.tabLogin.classList.toggle("active", !signup);
    nodes.tabSignup.classList.toggle("active", signup);
    nodes.tabLogin.setAttribute("aria-selected", String(!signup));
    nodes.tabSignup.setAttribute("aria-selected", String(signup));
    nodes.title.textContent = signup ? "Create your account" : "Welcome back";
    nodes.lede.textContent = signup
      ? "One account per person. Your check-ins are kept separate from anyone else using this browser."
      : "Log in to see your check-ins, trends, and visit notes.";
    showError("");
    var first = (signup ? nodes.signupForm : nodes.loginForm).querySelector("input");
    if (first && nodes.ready) first.focus();
  }

  /* Disables the button while the password is hashed, which takes a moment. */
  function submit(form, action, values) {
    var button = form.querySelector("button[type=submit]");
    var label = button.textContent;
    button.disabled = true;
    button.textContent = "Please wait…";
    showError("");

    return action(values)
      .then(function () {
        HM.navigate(nextPage());
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : "Something went wrong. Please try again.");
        button.disabled = false;
        button.textContent = label;
      });
  }

  function value(id) {
    return document.getElementById(id).value;
  }

  function renderSignedIn(user) {
    nodes.forms.hidden = true;
    nodes.signedIn.hidden = false;
    document.getElementById("authWho").textContent =
      "Signed in as " + (user.name ? user.name + " (" + user.email + ")" : user.email) + ".";
    document.getElementById("authContinue").setAttribute("href", nextPage());
    document.getElementById("authSwitch").addEventListener("click", function () {
      HM.auth.logOut();
      HM.navigate("login.html?out=1");
    });
  }

  function init() {
    if (!document.getElementById("loginForm") || nodes.forms) return;

    nodes.forms = document.getElementById("authForms");
    nodes.signedIn = document.getElementById("authSignedIn");
    nodes.loginForm = document.getElementById("loginForm");
    nodes.signupForm = document.getElementById("signupForm");
    nodes.tabLogin = document.getElementById("tabLogin");
    nodes.tabSignup = document.getElementById("tabSignup");
    nodes.title = document.getElementById("authTitle");
    nodes.lede = document.getElementById("authLede");
    nodes.error = document.getElementById("authError");
    nodes.notice = document.getElementById("authNotice");

    var user = HM.auth.current();
    if (user) {
      renderSignedIn(user);
      return;
    }

    nodes.tabLogin.addEventListener("click", function () { selectTab("login"); });
    nodes.tabSignup.addEventListener("click", function () { selectTab("signup"); });

    nodes.loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      submit(nodes.loginForm, HM.auth.logIn, {
        email: value("loginEmail"),
        password: value("loginPassword"),
        remember: document.getElementById("loginRemember").checked
      });
    });

    nodes.signupForm.addEventListener("submit", function (event) {
      event.preventDefault();
      submit(nodes.signupForm, HM.auth.signUp, {
        name: value("signupName"),
        email: value("signupEmail"),
        password: value("signupPassword"),
        confirm: value("signupConfirm"),
        remember: document.getElementById("signupRemember").checked
      });
    });

    /* With no accounts yet in this browser, creating one is the likely step. */
    selectTab(param("mode") === "signup" || !HM.auth.hasAccounts() ? "signup" : "login");

    if (param("out")) showNotice("You have been logged out.");
    else if (param("next")) showNotice("Log in to continue.");

    if (!HM.auth.cryptoReady()) {
      showError(HM.auth.insecureMessage());
    }

    nodes.ready = true;
  }

  HM.login = { init: init };
  HM.dom.ready(init);
})(window.HM);
