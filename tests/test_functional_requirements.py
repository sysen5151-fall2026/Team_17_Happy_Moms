"""Functional requirement tests for F.3.3 Maintain Wellness History.

One test per requirement the function satisfies, named for the requirement ID.
The rows that tie each ID to its module and to this file are in
``docs/traceability.md``.

Requirement IDs are qualified with the subsystem. Innoslate numbers
requirements per subsystem, so the bare numbers collide: "1.1.1" is
"Accept AI Wellness Tip" for the Happy Moms System and the Wellness
Information Subsystem, and "Accept Daily Wellness Checkin Data" for the
Wellness Records Subsystem. ``WRS-`` means the Wellness Records Subsystem
(C.3.3), which is the mechanism that performs F.3.3.

There is one implementation of F.3.3, in ``js/hm-records.js``, and these tests
drive it through ``tests/hm-records-bridge.js`` rather than reimplementing it
in Python. A failure here is a failure in the shipped code.

    python -m pytest tests/test_functional_requirements.py -v
"""

import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
BRIDGE = ROOT / "tests" / "hm-records-bridge.js"
MODULE = ROOT / "js" / "hm-records.js"


# --------------------------------------------------------------------------
# calling F.3.3


def call(fn, *args, seed=None):
    """Call one function of HM.records and return (result, store state)."""
    request = {"fn": fn, "args": list(args)}
    if seed is not None:
        request["seed"] = seed

    proc = subprocess.run(
        ["node", str(BRIDGE)],
        input=json.dumps(request),
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )
    if not proc.stdout:
        raise AssertionError(
            "the bridge produced no output (exit %s)\n%s" % (proc.returncode, proc.stderr)
        )

    payload = json.loads(proc.stdout)
    if not payload.get("ok"):
        raise AssertionError("%s failed: %s" % (fn, payload.get("error")))
    return payload["result"], payload["state"]


def a_check_in(date="2026-11-02", **overrides):
    """A complete day of check-in answers, as html/checkin.html collects them."""
    data = {
        "date": date,
        "mood": 4,
        "energy": 3,
        "sleepHours": 6.5,
        "sleepQuality": 4,
        "nausea": 2,
        "water": 7,
        "activity": 30,
        "symptoms": ["headache"],
        "urgent": [],
        "note": "",
    }
    data.update(overrides)
    return data


@pytest.fixture(scope="session", autouse=True)
def node_available():
    try:
        subprocess.run(["node", "--version"], capture_output=True, check=True)
    except (OSError, subprocess.CalledProcessError):  # pragma: no cover
        pytest.skip("node is not on PATH; F.3.3 is browser JavaScript")


# --------------------------------------------------------------------------
# input requirements


def test_wrs_1_1_1_accept_daily_wellness_checkin_data():
    """WRS-1.1.1 — accept Daily Wellness Checkin Data from the Expecting Mother."""
    data = a_check_in(mood=2, note="tired all day")
    result, state = call("maintainWellnessHistory", {"dailyWellnessCheckinData": data})

    entry = result["recordedWellnessEntry"]
    assert entry["date"] == data["date"]
    assert entry["mood"] == 2
    assert entry["note"] == "tired all day"
    assert entry["symptoms"] == ["headache"]
    # Accepted means accepted into the record, not just echoed back.
    assert state["checkins"][data["date"]]["mood"] == 2


def test_wrs_1_1_1_rejects_fields_that_are_not_answers():
    """WRS-1.1.1 — only the modeled flow is accepted.

    The sample-data loader marks its entries ``sample: true``. Nothing outside
    the check-in definition reaches storage through this input.
    """
    data = a_check_in(sample=True)
    data["injected"] = "not an answer"
    result, _ = call("maintainWellnessHistory", {"dailyWellnessCheckinData": data})

    entry = result["recordedWellnessEntry"]
    assert "sample" not in entry
    assert "injected" not in entry


def test_wrs_1_1_2_accept_recorded_wellness_entry():
    """WRS-1.1.2 — accept Recorded Wellness Entry from the Daily Check-In Subsystem.

    The second door into F.3.3: an entry C.3.2 already recorded, arriving
    without raw check-in data. It is stored and screened the same way.
    """
    entry_in = a_check_in(date="2026-10-28", urgent=["chestPain"])
    result, state = call("maintainWellnessHistory", {"recordedWellnessEntry": entry_in})

    assert state["checkins"]["2026-10-28"]["urgent"] == ["chestPain"]
    assert result["highRiskAlert"] is not None


def test_wrs_1_1_3_accept_summary_prompt():
    """WRS-1.1.3 — accept Summary Prompt from the Expecting Mother.

    Summary Prompt is the control on F.3.3.2, so it governs the interval the
    emitted Wellness Session Record covers and is not itself stored.
    """
    history = {
        "checkins": {
            "2026-10-20": a_check_in(date="2026-10-20"),
            "2026-10-25": a_check_in(date="2026-10-25"),
            "2026-11-01": a_check_in(date="2026-11-01"),
        }
    }
    result, state = call(
        "maintainWellnessHistory",
        {
            "dailyWellnessCheckinData": a_check_in(date="2026-11-02"),
            "summaryPrompt": {"start": "2026-10-25", "end": "2026-11-02"},
        },
        seed=history,
    )

    record = result["wellnessSessionRecord"]
    assert record["interval"] == {"start": "2026-10-25", "end": "2026-11-02"}
    assert [e["date"] for e in record["entries"]] == ["2026-10-25", "2026-11-01", "2026-11-02"]
    assert "summaryPrompt" not in state


def test_wrs_1_1_3_summary_prompt_is_optional():
    """WRS-1.1.3 — with no prompt, the record covers the day just written."""
    result, _ = call(
        "maintainWellnessHistory",
        {"dailyWellnessCheckinData": a_check_in(date="2026-11-02")},
        seed={"checkins": {"2026-10-20": a_check_in(date="2026-10-20")}},
    )
    assert result["wellnessSessionRecord"]["interval"] == {
        "start": "2026-11-02",
        "end": "2026-11-02",
    }


def test_wrs_1_1_4_accept_user_defined_custom_info():
    """WRS-1.1.4 — accept User Defined Custom Info from the External AI Service.

    Kept under ``custom`` so a value arriving from outside the boundary can
    never overwrite one of her own answers.
    """
    result, state = call(
        "maintainWellnessHistory",
        {
            "dailyWellnessCheckinData": a_check_in(mood=4),
            "userDefinedCustomInfo": {"tipShown": "rest-01", "mood": 1},
        },
    )

    entry = result["recordedWellnessEntry"]
    assert entry["custom"] == {"tipShown": "rest-01", "mood": 1}
    assert entry["mood"] == 4, "custom info must not overwrite an answer"
    assert state["checkins"][entry["date"]]["custom"]["tipShown"] == "rest-01"


def test_wrs_1_1_5_accept_wellness_session_record():
    """WRS-1.1.5 — accept Wellness Session Record from the Wellness Information Subsystem.

    C.3.5 hands the record back carrying the questions she added while
    reviewing it. Hers are kept; new ones are added; nothing is duplicated.
    """
    returned = {
        "questions": [
            {"id": "q-new", "text": "Is this headache normal?"},
            {"id": "q-known", "text": "already on the list"},
        ]
    }
    _, state = call(
        "maintainWellnessHistory",
        {
            "dailyWellnessCheckinData": a_check_in(),
            "wellnessSessionRecord": returned,
        },
        seed={"questions": [{"id": "q-known", "text": "already on the list"}]},
    )

    ids = [q["id"] for q in state["questions"]]
    assert ids.count("q-known") == 1
    assert "q-new" in ids


# --------------------------------------------------------------------------
# output requirements


def test_wrs_1_2_1_provide_high_risk_alert():
    """WRS-1.2.1 — provide High-Risk Alert to the Expecting Mother."""
    result, _ = call(
        "maintainWellnessHistory",
        {"dailyWellnessCheckinData": a_check_in(urgent=["bleeding", "severeHeadache"])},
    )

    alert = result["highRiskAlert"]
    assert alert is not None
    assert {s["value"] for s in alert["signs"]} == {"bleeding", "severeHeadache"}
    assert alert["category"] == "medical"
    # Screening, not diagnosis: an alert names signs and a route, never a condition.
    assert "diagnos" not in json.dumps(alert).lower()


def test_wrs_1_2_1_no_alert_without_a_high_risk_sign():
    """WRS-1.2.1 — an ordinary day raises nothing."""
    result, _ = call("maintainWellnessHistory", {"dailyWellnessCheckinData": a_check_in()})
    assert result["highRiskAlert"] is None


def test_wrs_1_2_2_provide_updated_wellness_history():
    """WRS-1.2.2 — provide Updated Wellness History to the Trend Analysis Subsystem."""
    seed = {
        "checkins": {
            "2026-10-30": a_check_in(date="2026-10-30"),
            "2026-10-31": a_check_in(date="2026-10-31"),
        }
    }
    result, _ = call(
        "maintainWellnessHistory",
        {"dailyWellnessCheckinData": a_check_in(date="2026-11-01")},
        seed=seed,
    )

    history = result["updatedWellnessHistory"]
    assert history["dayCount"] == 3
    assert history["firstDate"] == "2026-10-30"
    assert history["lastDate"] == "2026-11-01"
    assert history["dates"] == sorted(history["dates"]), "oldest first, for the trend window"


# --------------------------------------------------------------------------
# function requirements


def test_wrs_1_4_1_ingest_check_in_data():
    """WRS-1.4.1 — Ingest Check-In Data (F.3.3.1, mechanism C.3.3.1).

    Two outputs, as on the diagram: the Recorded Wellness Entry that goes to
    F.3.3.2, and the Screening Entry Payload that goes to F.3.3.3.
    """
    result, state = call("ingestCheckInData", a_check_in(urgent=["fever"]))

    assert set(result) == {"recordedWellnessEntry", "screeningEntryPayload"}
    assert result["recordedWellnessEntry"]["sleepHours"] == 6.5
    assert result["screeningEntryPayload"]["urgent"] == ["fever"]
    # Ingestion does not persist; F.3.3.2 does.
    assert state["checkins"] == {}


def test_wrs_1_4_1_screening_payload_carries_only_what_screening_needs():
    """WRS-1.4.1 — the payload to F.3.3.3 is the screened subset, not the entry."""
    result, _ = call("ingestCheckInData", a_check_in(note="private note", urgent=["fever"]))

    payload = result["screeningEntryPayload"]
    assert set(payload) == {"date", "urgent", "symptoms", "mood", "selfHarmReported"}
    assert "note" not in payload


def test_wrs_1_4_2_persist_session_record():
    """WRS-1.4.2 — Persist Session Record (F.3.3.2, mechanism C.3.3.2)."""
    entry = a_check_in(date="2026-11-03", mood=5)
    result, state = call("persistSessionRecord", entry, {})

    assert state["checkins"]["2026-11-03"]["mood"] == 5
    assert result["stored"] is True
    assert result["wellnessSessionRecord"]["entries"][-1]["date"] == "2026-11-03"


def test_wrs_1_4_2_re_logging_a_day_replaces_that_day_only():
    """WRS-1.4.2 — one record per day; editing a day leaves the others alone."""
    seed = {"checkins": {"2026-11-01": a_check_in(date="2026-11-01", mood=1)}}
    _, state = call(
        "persistSessionRecord", a_check_in(date="2026-11-01", mood=5), {}, seed=seed
    )

    assert len(state["checkins"]) == 1
    assert state["checkins"]["2026-11-01"]["mood"] == 5


def test_wrs_1_4_3_screen_for_high_risk_alerts():
    """WRS-1.4.3 — Screen for High Risk Alerts (F.3.3.3, mechanism C.3.3.3)."""
    clear, _ = call("screenForHighRiskAlerts", {"date": "2026-11-01", "urgent": []})
    assert clear is None

    medical, _ = call("screenForHighRiskAlerts", {"date": "2026-11-01", "urgent": ["calfPain"]})
    assert medical["category"] == "medical"

    mental, _ = call("screenForHighRiskAlerts", {"date": "2026-11-01", "urgent": ["cannotCope"]})
    assert mental["category"] == "mental"


def test_wrs_1_4_3_self_harm_from_the_mood_check_raises_an_alert():
    """WRS-1.4.3 — EPDS item 10 above "Never" is a high-risk entry too.

    The mood check (UC.7) routes through the same screening as the daily
    check-in, so there is one definition of high risk.
    """
    alert, _ = call(
        "screenForHighRiskAlerts",
        {"date": "2026-11-01", "urgent": [], "selfHarmReported": True},
    )

    assert alert is not None
    assert alert["category"] == "mental"
    assert [s["value"] for s in alert["signs"]] == ["selfHarm"]


def test_wrs_1_4_3_criteria_come_from_the_approved_sign_list():
    """WRS-1.4.3 — "clinician-approved high-risk criteria" has one definition.

    F.3.3.3 reads ``HM.content.urgentSigns`` (the ACOG / CDC Hear Her maternal
    warning signs) instead of holding its own copy, and an unrecognised code
    raises nothing.
    """
    criteria, _ = call("criteria")
    assert len(criteria) >= 14
    assert {"value": "selfHarm", "label": "Thoughts of harming myself", "category": "mental"} in criteria
    assert "HM.content.urgentSigns" in MODULE.read_text(encoding="utf-8")

    unknown, _ = call("screenForHighRiskAlerts", {"date": "2026-11-01", "urgent": ["notASign"]})
    assert unknown is None


# --------------------------------------------------------------------------
# stakeholder requirement


def test_str2_1_high_risk_crisis_display():
    """StR2.1 — crisis contact information within 2 seconds of a high-risk entry.

    What is testable here is that the route to help comes back from the same
    call that recorded the entry: no second request, no network, no await. The
    2-second figure is MOE-2.1 and is measured on a device, not here.
    """
    result, _ = call(
        "maintainWellnessHistory",
        {"dailyWellnessCheckinData": a_check_in(urgent=["selfHarm"])},
    )

    alert = result["highRiskAlert"]
    kinds = [action["kind"] for action in alert["actions"]]
    assert "provider" in kinds
    assert "crisisLine" in kinds, "a mental-health sign must offer 988"
    assert "page" in kinds
    hrefs = [a.get("href") for a in alert["actions"]]
    assert "tel:988" in hrefs
    assert "crisis.html" in hrefs


if __name__ == "__main__":  # pragma: no cover
    sys.exit(pytest.main([__file__, "-v"]))
