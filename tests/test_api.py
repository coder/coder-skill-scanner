"""Tests for the v1 public API builder."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scanner import api


def _skill(slug: str, *, verdict: str = "clean", risk: int = 5) -> dict:
    return {
        "namespace": "coder",
        "slug": slug,
        "source_repo": "coder/skills",
        "source_ref": "main",
        "source_sha": "a" * 40,
        "skill_path": f"skills/{slug}",
        "scanned_at": "2026-01-02T03:04:05Z",
        "verdict": verdict,
        "reasons": [] if verdict == "clean" else [f"risk_score={risk}"],
        "scanners": {
            "skillspector": {
                "crashed": False,
                "json_missing": False,
                "risk_score": risk,
                "risk_severity": "low" if verdict == "clean" else "high",
                "risk_recommendation": "",
                "findings_by_severity": {"medium": 1} if risk else {},
                "findings_by_rule": (
                    [{"id": "LP3", "severity": "medium", "count": 1}] if risk else []
                ),
            }
        },
        "artifacts": {},
    }


def _report(skills: list[dict]) -> dict:
    return {
        "schema_version": "1.0.0",
        "generated_at": "2026-01-02T03:04:00Z",
        "summary": {
            "namespaces": 1,
            "sources": 1,
            "skills_scanned": len(skills),
            "verdicts": {"clean": 0, "suspicious": 0, "malicious": 0, "unknown": 0},
        },
        "skills": skills,
    }


def test_skills_index_compact_shape():
    report = _report([_skill("modules", risk=21), _skill("setup", verdict="malicious", risk=100)])
    out = api.build_skills_index(report)

    assert out["schema_version"] == 1
    assert out["generated_at"] == "2026-01-02T03:04:00Z"
    assert [s["slug"] for s in out["skills"]] == ["modules", "setup"]

    first = out["skills"][0]
    assert set(first.keys()) == {
        "namespace",
        "slug",
        "verdict",
        "risk_score",
        "source_repo",
        "source_sha",
        "scanned_at",
    }
    assert first["risk_score"] == 21
    assert first["source_sha"] == "a" * 40
    assert "source_ref" not in first, "index payload must not leak mutable source_ref"


def test_skill_detail_uses_source_sha_for_tree_url():
    skill = _skill("setup", verdict="malicious", risk=87)
    detail = api.build_skill_detail(
        skill,
        public_base_url="https://example.com/scanner",
        report_url="https://example.com/scanner/latest.json",
    )

    assert detail["schema_version"] == 1
    assert detail["verdict"] == "malicious"
    assert detail["risk_severity"] == "high"
    expected_tree = f"https://github.com/coder/skills/tree/{'a' * 40}/skills/setup"
    assert detail["links"]["source_tree"] == expected_tree
    assert "main" not in detail["links"]["source_tree"], "source_tree must not pin to a mutable ref"

    badges = detail["links"]
    assert badges["status_badge_json"].endswith("/api/v1/skills/coder/setup/badge/status.json")
    assert badges["status_badge_svg"].endswith("/api/v1/skills/coder/setup/badge/status.svg")
    assert badges["score_badge_json"].endswith("/api/v1/skills/coder/setup/badge/score.json")
    assert badges["score_badge_svg"].endswith("/api/v1/skills/coder/setup/badge/score.svg")
    assert detail["links"]["report"] == "https://example.com/scanner/latest.json"


def test_history_index_attaches_absolute_report_urls():
    manifest = {
        "entries": [
            {
                "stamp": "2026-01-02T03-04Z",
                "generated_at": "2026-01-02T03:04:00Z",
                "summary": {"skills_scanned": 3},
                "path": "history/2026-01-02/2026-01-02T03-04Z.json",
            },
        ],
    }
    out = api.build_history_index(manifest, public_base_url="https://example.com/scanner")
    assert out["schema_version"] == 1
    assert len(out["entries"]) == 1
    assert (
        out["entries"][0]["report_url"]
        == "https://example.com/scanner/history/2026-01-02/2026-01-02T03-04Z.json"
    )


def test_write_api_v1_writes_full_tree(tmp_path: Path):
    report = _report(
        [
            _skill("modules", risk=21),
            _skill("setup", verdict="malicious", risk=100),
            _skill("templates", risk=0),
        ]
    )
    written = api.write_api_v1(
        report,
        output_dir=tmp_path,
        public_base_url="https://example.com/scanner",
        history_manifest={"entries": []},
    )

    # 1 (skills.json) + 3 skills * (1 detail + 4 badge files) + 1 (history.json) = 17.
    assert len(written) == 17

    # Index validates as parseable JSON, has the right schema_version.
    idx = json.loads((tmp_path / "skills.json").read_text())
    assert idx["schema_version"] == 1
    assert {s["slug"] for s in idx["skills"]} == {"modules", "setup", "templates"}

    # Per-skill JSON exists and has badge link pointing back at our base URL.
    setup_detail = json.loads((tmp_path / "skills" / "coder" / "setup.json").read_text())
    assert setup_detail["verdict"] == "malicious"

    # Badge files exist and the SVGs are well-formed strings.
    verdict_svg = (tmp_path / "skills" / "coder" / "setup" / "badge" / "status.svg").read_text()
    assert verdict_svg.startswith("<svg")
    assert verdict_svg.rstrip().endswith("</svg>")
    assert "malicious" in verdict_svg

    risk_json = json.loads(
        (tmp_path / "skills" / "coder" / "setup" / "badge" / "score.json").read_text()
    )
    assert risk_json["message"] == "100/100"
    assert risk_json["color"] == "red"

    # history.json got written when a manifest was passed.
    hist = json.loads((tmp_path / "history.json").read_text())
    assert hist["schema_version"] == 1


def test_write_api_v1_skips_history_when_not_provided(tmp_path: Path):
    report = _report([_skill("modules")])
    written = api.write_api_v1(
        report, output_dir=tmp_path, public_base_url="https://example.com/scanner"
    )
    # 1 (skills.json) + 1 * (1 detail + 4 badge files) = 6
    assert len(written) == 6
    assert not (tmp_path / "history.json").exists()


def test_write_api_v1_rejects_path_traversal_namespace(tmp_path: Path):
    report = _report([_skill("modules")])
    report["skills"][0]["namespace"] = "../evil"
    with pytest.raises(ValueError, match="unsafe namespace"):
        api.write_api_v1(
            report, output_dir=tmp_path, public_base_url="https://example.com/x"
        )


def test_write_api_v1_rejects_path_traversal_slug(tmp_path: Path):
    report = _report([_skill("modules")])
    report["skills"][0]["slug"] = "ok/../escape"
    with pytest.raises(ValueError, match="unsafe slug"):
        api.write_api_v1(
            report, output_dir=tmp_path, public_base_url="https://example.com/x"
        )
