"""Tests for the per-skill combine step."""

from __future__ import annotations

from scanner import combine


def _entry() -> dict[str, str]:
    return {
        "namespace": "coder",
        "slug": "example",
        "source_repo": "coder/registry",
        "source_ref": "main",
        "skill_path": ".agents/skills/example",
    }


def test_summarize_skillspector_clean(clean_skillspector_json):
    summary = combine.summarize_skillspector(clean_skillspector_json)
    assert summary["crashed"] is False
    assert summary["json_missing"] is False
    assert summary["risk_score"] == 5
    assert summary["findings_by_severity"] == {}
    assert summary["findings_by_rule"] == []


def test_summarize_skillspector_with_findings(suspicious_skillspector_json):
    summary = combine.summarize_skillspector(suspicious_skillspector_json)
    assert summary["risk_score"] == 60
    assert summary["findings_by_severity"] == {"high": 2, "medium": 1}
    # P3 has 2 hits, TM1 has 1; sorted by -count, then id.
    assert summary["findings_by_rule"][0]["id"] == "P3"
    assert summary["findings_by_rule"][0]["count"] == 2


def test_summarize_skillspector_lowercases_severity(malicious_skillspector_json):
    """SkillSpector emits UPPER CASE severities; we normalize them.

    The report schema's ``risk_severity`` enum and the convention for the
    rolled-up counters are both lower case.
    """
    allowed = {"info", "low", "medium", "high", "critical"}
    summary = combine.summarize_skillspector(malicious_skillspector_json)
    assert summary["risk_severity"] == "critical"
    # ``risk_recommendation`` keeps its original case; SkillSpector uses
    # values like ``DO_NOT_INSTALL`` and ``SAFE`` and the schema imposes
    # no enum on this field.
    assert summary["risk_recommendation"] == "DO_NOT_INSTALL"
    for rule in summary["findings_by_rule"]:
        assert rule["severity"] in allowed
    for sev in summary["findings_by_severity"]:
        assert sev in allowed


def test_summarize_skillspector_none_means_crash():
    summary = combine.summarize_skillspector(None)
    assert summary == {"crashed": True, "json_missing": True}


def test_combine_skill_clean(clean_skillspector_json, default_config):
    report = combine.combine_skill(
        matrix_entry=_entry(),
        skillspector_raw=clean_skillspector_json,
        source_sha="a" * 40,
        catalogue_drift=False,
        config=default_config,
    )
    assert report["namespace"] == "coder"
    assert report["slug"] == "example"
    assert report["source_sha"] == "a" * 40
    assert report["verdict"] == "clean"
    assert report["reasons"] == []
    assert "skillspector" in report["scanners"]


def test_combine_skill_suspicious(suspicious_skillspector_json, default_config):
    report = combine.combine_skill(
        matrix_entry=_entry(),
        skillspector_raw=suspicious_skillspector_json,
        source_sha="b" * 40,
        catalogue_drift=False,
        config=default_config,
    )
    assert report["verdict"] == "suspicious"


def test_combine_skill_malicious(malicious_skillspector_json, default_config):
    report = combine.combine_skill(
        matrix_entry=_entry(),
        skillspector_raw=malicious_skillspector_json,
        source_sha="c" * 40,
        catalogue_drift=False,
        config=default_config,
    )
    assert report["verdict"] == "malicious"


def test_combine_skill_catalogue_drift_overrides_clean(clean_skillspector_json, default_config):
    report = combine.combine_skill(
        matrix_entry=_entry(),
        skillspector_raw=clean_skillspector_json,
        source_sha="d" * 40,
        catalogue_drift=True,
        config=default_config,
    )
    assert report["verdict"] == "unknown"


def test_combine_skill_crashed_scanner(default_config):
    report = combine.combine_skill(
        matrix_entry=_entry(),
        skillspector_raw=None,
        source_sha="e" * 40,
        catalogue_drift=False,
        config=default_config,
    )
    assert report["verdict"] == "unknown"
    assert report["scanners"]["skillspector"]["crashed"] is True


def test_load_skillspector_json_missing_file(tmp_path):
    assert combine.load_skillspector_json(tmp_path / "nope.json") is None


def test_load_skillspector_json_bad_json(tmp_path):
    path = tmp_path / "broken.json"
    path.write_text("{ this is not json", encoding="utf-8")
    assert combine.load_skillspector_json(path) is None


def test_load_skillspector_json_valid(tmp_path):
    import json

    path = tmp_path / "ok.json"
    path.write_text(json.dumps({"risk_assessment": {"score": 12}}), encoding="utf-8")
    loaded = combine.load_skillspector_json(path)
    assert loaded == {"risk_assessment": {"score": 12}}
