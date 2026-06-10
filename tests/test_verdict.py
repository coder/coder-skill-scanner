"""Tests for the verdict threshold evaluator."""

from __future__ import annotations

from scanner import verdict


def test_clean_below_suspicious_threshold(default_config):
    result = verdict.evaluate(
        skillspector={"risk_score": 10, "crashed": False, "json_missing": False},
        config=default_config,
    )
    assert result.verdict == "clean"
    assert result.reasons == []


def test_suspicious_at_threshold(default_config):
    result = verdict.evaluate(
        skillspector={"risk_score": 51, "crashed": False, "json_missing": False},
        config=default_config,
    )
    assert result.verdict == "suspicious"
    assert any("51" in r for r in result.reasons)


def test_suspicious_between_thresholds(default_config):
    result = verdict.evaluate(
        skillspector={"risk_score": 70, "crashed": False, "json_missing": False},
        config=default_config,
    )
    assert result.verdict == "suspicious"


def test_malicious_at_threshold(default_config):
    result = verdict.evaluate(
        skillspector={"risk_score": 81, "crashed": False, "json_missing": False},
        config=default_config,
    )
    assert result.verdict == "malicious"


def test_unknown_when_crashed(default_config):
    result = verdict.evaluate(
        skillspector={"crashed": True, "json_missing": True},
        config=default_config,
    )
    assert result.verdict == "unknown"
    assert "skillspector" in result.reasons[0]


def test_unknown_when_skillspector_missing(default_config):
    result = verdict.evaluate(skillspector=None, config=default_config)
    assert result.verdict == "unknown"


def test_catalogue_drift_overrides_clean_signal(default_config):
    result = verdict.evaluate(
        skillspector={"risk_score": 5, "crashed": False, "json_missing": False},
        config=default_config,
        catalogue_drift=True,
    )
    assert result.verdict == "unknown"
    assert "catalogue" in result.reasons[0].lower()


def test_thresholds_can_be_overridden(default_config):
    default_config["verdict"]["suspicious_risk_score"] = 60
    result = verdict.evaluate(
        skillspector={"risk_score": 50, "crashed": False, "json_missing": False},
        config=default_config,
    )
    # With suspicious raised to 60, risk=50 should be clean.
    assert result.verdict == "clean"
