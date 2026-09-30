/* ==========================================================================
   Happy Moms — site configuration
   One place to change the values the team needs to update over time.
   ========================================================================== */
window.HM = window.HM || {};

HM.config = {
  appName: "Happy Moms",
  tagline: "Pregnancy wellness tracking and appointment preparation",
  version: "0.4.0",

  /* Update these two when the repo/contact details change. */
  repoUrl: "https://github.com/maxstarvaggi/Team_17_Happy_Moms",
  contactEmail: "team17.happymoms@example.edu",

  course: {
    number: "SYSEN 5151",
    title: "Foundations of Systems Engineering",
    school: "Cornell University, College of Engineering",
    term: "Fall 2026",
    instructor: "Professor Clifford Whitcomb",
    team: "Team New Edition (Team 17)",
    members: ["Victor Brew", "Angelina Chan", "Thomas McIntyre", "Max Starvaggi"]
  },

  /* Trusted-source registry. Content on this site is paraphrased general
     wellness information informed by these organizations and is pending
     clinical review — it is not a citation of a specific publication. */
  sources: {
    acog: {
      short: "ACOG",
      name: "American College of Obstetricians and Gynecologists",
      url: "https://www.acog.org/womens-health/pregnancy"
    },
    nichd: {
      short: "NIH / NICHD",
      name: "National Institute of Child Health and Human Development",
      url: "https://www.nichd.nih.gov/health/topics/pregnancy"
    },
    fda: {
      short: "FDA",
      name: "U.S. Food and Drug Administration",
      url: "https://www.fda.gov/consumers/womens-health-topics"
    },
    cdc: {
      short: "CDC",
      name: "Centers for Disease Control and Prevention",
      url: "https://www.cdc.gov/pregnancy/"
    }
  },

  /* Crisis and urgent-help resources (United States). */
  crisis: [
    {
      name: "911 (emergency services)",
      detail: "Severe bleeding, severe abdominal pain, seizure, trouble breathing, or any life-threatening emergency.",
      action: "tel:911",
      label: "Call 911"
    },
    {
      name: "Your OB/GYN or midwife",
      detail: "Most practices have a 24-hour line for urgent pregnancy questions. Save that number in your phone.",
      action: null,
      label: "Call your provider"
    },
    {
      name: "988 Suicide & Crisis Lifeline",
      detail: "Free, confidential support 24/7 for thoughts of self-harm, hopelessness, or emotional crisis.",
      action: "tel:988",
      label: "Call or text 988"
    },
    {
      name: "Crisis Text Line",
      detail: "Text-based crisis counseling, 24/7.",
      action: "sms:741741",
      label: "Text HOME to 741741"
    },
    {
      name: "Postpartum Support International",
      detail: "Help for pregnancy and postpartum mental health, including anxiety and depression.",
      action: "tel:18009444773",
      label: "Call 1-800-944-4773"
    }
  ],

  /* Standing disclaimer used across the app. */
  disclaimer:
    "Happy Moms provides general wellness information and self-tracking tools. " +
    "It does not diagnose, treat, or prescribe, and it is not a substitute for care " +
    "from your doctor or midwife."
};
