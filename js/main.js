/* ==========================================================================
   Happy Moms — marketing page behaviour
   Small things the public pages need. Navigation, the footer, and the theme
   toggle live in hm-chrome.js; the app pages have their own modules.
   ========================================================================== */
window.HM = window.HM || {};

HM.dom.ready(function () {
  "use strict";

  /* Fill in values from hm-config.js so contact details live in one place:
       <a data-config-href="repoUrl" data-config-suffix="/issues">
       <span data-config="contactEmail">                                */
  Array.prototype.forEach.call(document.querySelectorAll("[data-config]"), function (node) {
    var value = HM.config[node.getAttribute("data-config")];
    if (value) node.textContent = value;
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-config-href]"), function (node) {
    var value = HM.config[node.getAttribute("data-config-href")];
    if (!value) return;
    var suffix = node.getAttribute("data-config-suffix") || "";
    var prefix = node.getAttribute("data-config-prefix") || "";
    node.href = prefix + value + suffix;
  });

  /* Reveal on scroll. Sections start visible and animate only as a nicety,
     so the page still reads correctly if the observer never fires. */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    Array.prototype.forEach.call(revealEls, function (el) { observer.observe(el); });
  } else {
    Array.prototype.forEach.call(revealEls, function (el) { el.classList.add("in-view"); });
  }

  /* Contact form. There is no backend on GitHub Pages, so this validates and
     confirms locally and tells the user plainly to use email instead. */
  var contactForm = document.querySelector(".contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var email = document.getElementById("email");
      var message = document.getElementById("message");

      if (email && !email.value.trim()) {
        email.focus();
        HM.dom.toast("An email address lets us reply");
        return;
      }
      if (message && !message.value.trim()) {
        message.focus();
        HM.dom.toast("Add a message first");
        return;
      }

      var success = document.querySelector(".form-success");
      if (success) {
        success.classList.add("active");
        success.setAttribute("role", "status");
      }

      /* Hand the text to the user's mail client so the message is not lost. */
      var mailLink = document.getElementById("mailtoFallback");
      if (mailLink && message) {
        var subject = encodeURIComponent("Happy Moms feedback");
        var body = encodeURIComponent(message.value.trim());
        mailLink.href = "mailto:" + HM.config.contactEmail + "?subject=" + subject + "&body=" + body;
        mailLink.hidden = false;
      }

      contactForm.reset();
    });
  }
});
