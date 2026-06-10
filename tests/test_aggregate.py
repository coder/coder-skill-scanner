"""Tests for the aggregation step."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scanner import aggregate


def _skill_report(slug: str, verdict: str = "clean", risk: int = 5) -> dict:
    return {
        "namespace": "coder",
        "slug": slug,
        "source_repo": "coder/registry",
        "source_ref": "main",
        "source_sha": "0" * 40,
        "skill_path": f".agents/skills/{slug}",
        "scanned_at": "2026-01-01T00:00:00Z",
        "verdict": verdict,
        "reasons": [] if verdict == "clean" else [f"risk_score={risk}"],
        "scanners": {
            "skillspector": {
                "crashed": False,
                "json_missing": False,
                "risk_score": risk,
                "risk_severity": "info" if verdict == "clean" else "high",
                "risk_recommendation": "",
                "findings_by_severity": {},
                "findings_by_rule": [],
            }
        },
        "artifacts": {},
    }


def _run_meta() -> dict:
    return {
        "owner": "coder",
        "repo": "coder-skill-scanner",
        "workflow": "scan",
        "run_id": 42,
        "run_url": "https://github.com/coder/coder-skill-scanner/actions/runs/42",
        "head_sha": "f" * 40,
    }


def _catalogue_meta() -> dict:
    return {"owner": "coder", "repo": "registry", "ref": "main", "sha": "1" * 40}


def test_aggregate_counts_verdicts():
    report = aggregate.aggregate(
        skills=[
            _skill_report("a", "clean", 5),
            _skill_report("b", "suspicious", 50),
            _skill_report("c", "malicious", 80),
            _skill_report("d", "unknown", 0),
            _skill_report("e", "clean", 10),
        ],
        scanner_run=_run_meta(),
        catalogue=_catalogue_meta(),
        skillspector_pin="skillspector @ git+...",
        skillspector_args=["--no-llm"],
    )
    assert report["summary"]["skills_scanned"] == 5
    assert report["summary"]["verdicts"] == {
        "clean": 2,
        "suspicious": 1,
        "malicious": 1,
        "unknown": 1,
    }


def test_aggregate_orders_skills_by_namespace_then_slug():
    skills = [
        _skill_report("zebra"),
        _skill_report("alpha"),
        _skill_report("mango"),
    ]
    report = aggregate.aggregate(
        skills=skills,
        scanner_run=_run_meta(),
        catalogue=_catalogue_meta(),
    )
    assert [s["slug"] for s in report["skills"]] == ["alpha", "mango", "zebra"]


def test_aggregate_validates_against_schema():
    # Build the schema path relative to the repo root.
    schema_path = Path(__file__).resolve().parent.parent / "schema" / "report.schema.json"
    schema = aggregate.load_schema(schema_path)

    report = aggregate.aggregate(
        skills=[_skill_report("a")],
        scanner_run=_run_meta(),
        catalogue=_catalogue_meta(),
        skillspector_pin="skillspector @ git+...",
        skillspector_args=["--no-llm"],
    )
    aggregate.validate_report(report, schema)


def test_aggregate_validate_rejects_unknown_field():
    schema_path = Path(__file__).resolve().parent.parent / "schema" / "report.schema.json"
    schema = aggregate.load_schema(schema_path)

    report = aggregate.aggregate(
        skills=[_skill_report("a")],
        scanner_run=_run_meta(),
        catalogue=_catalogue_meta(),
    )
    report["bogus_extra_field"] = "should not be allowed"

    with pytest.raises(Exception):  # noqa: B017
        aggregate.validate_report(report, schema)


def test_load_skill_reports_reads_all_skill_json(tmp_path):
    (tmp_path / "skill-coder-a").mkdir()
    (tmp_path / "skill-coder-b").mkdir()
    (tmp_path / "skill-coder-a" / "skill.json").write_text(
        json.dumps(_skill_report("a")), encoding="utf-8"
    )
    (tmp_path / "skill-coder-b" / "skill.json").write_text(
        json.dumps(_skill_report("b")), encoding="utf-8"
    )

    loaded = aggregate.load_skill_reports(tmp_path)
    assert {r["slug"] for r in loaded} == {"a", "b"}
