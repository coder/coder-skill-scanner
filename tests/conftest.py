"""Shared pytest fixtures for the scanner test suite."""

from __future__ import annotations

from typing import Any

import pytest


@pytest.fixture
def default_config() -> dict[str, Any]:
    """A minimal valid config with the v1 verdict thresholds."""
    return {
        "catalogue": {
            "registry_repo": {"owner": "coder", "repo": "registry", "ref": "main"},
            "formats": {
                "in_tree": {
                    "enabled": True,
                    "namespace": "coder",
                    "base_path": ".agents/skills",
                },
                "external_sources": {
                    "enabled": True,
                    "readme_glob": "registry/*/skills/README.md",
                },
            },
        },
        "scanners": {
            "skillspector": {
                "enabled": True,
                "pin": "skillspector @ git+https://github.com/NVIDIA/SkillSpector.git@abc",
                "flags": ["--no-llm"],
            },
        },
        "verdict": {
            "malicious_risk_score": 81,
            "suspicious_risk_score": 51,
        },
    }


@pytest.fixture
def clean_skillspector_json() -> dict[str, Any]:
    """SkillSpector output for a known-clean skill.

    Uses SkillSpector's actual JSON shape: top-level ``skill``,
    ``risk_assessment``, ``components``, ``issues``, ``metadata`` blocks,
    with severities in upper case.
    """
    return {
        "skill": {"name": "coder/example", "path": ".agents/skills/example"},
        "risk_assessment": {
            "score": 5,
            "severity": "INFO",
            "recommendation": "SAFE",
        },
        "components": {},
        "issues": [],
        "metadata": {"scanner": "skillspector"},
    }


@pytest.fixture
def suspicious_skillspector_json() -> dict[str, Any]:
    """SkillSpector output that should land in the suspicious band."""
    return {
        "skill": {"name": "coder/example", "path": ".agents/skills/example"},
        "risk_assessment": {
            "score": 60,
            "severity": "HIGH",
            "recommendation": "DO_NOT_INSTALL",
        },
        "components": {},
        "issues": [
            {
                "id": "P3",
                "category": "External Transmission",
                "severity": "HIGH",
                "confidence": 0.8,
                "location": {"file": "SKILL.md", "start_line": 1, "end_line": None},
            },
            {
                "id": "P3",
                "category": "External Transmission",
                "severity": "HIGH",
                "confidence": 0.8,
                "location": {"file": "SKILL.md", "start_line": 12, "end_line": None},
            },
            {
                "id": "TM1",
                "category": "Tool Chaining",
                "severity": "MEDIUM",
                "confidence": 0.6,
                "location": {"file": "SKILL.md", "start_line": 20, "end_line": None},
            },
        ],
        "metadata": {"scanner": "skillspector"},
    }


@pytest.fixture
def malicious_skillspector_json() -> dict[str, Any]:
    """SkillSpector output that should be flagged malicious by v1 thresholds.

    Mirrors what we observe on a real malicious-skill scan: score=100,
    severity=CRITICAL, recommendation=DO_NOT_INSTALL.
    """
    return {
        "skill": {"name": "coder/example", "path": ".agents/skills/example"},
        "risk_assessment": {
            "score": 85,
            "severity": "CRITICAL",
            "recommendation": "DO_NOT_INSTALL",
        },
        "components": {},
        "issues": [
            {
                "id": "P1",
                "category": "Instruction Override",
                "severity": "HIGH",
                "confidence": 0.9,
                "location": {"file": "SKILL.md", "start_line": 3, "end_line": None},
            },
            {
                "id": "P5",
                "category": "Harmful Content",
                "severity": "CRITICAL",
                "confidence": 0.95,
                "location": {"file": "SKILL.md", "start_line": 18, "end_line": None},
            },
        ],
        "metadata": {"scanner": "skillspector"},
    }
