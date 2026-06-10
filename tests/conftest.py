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
            "malicious_risk_score": 75,
            "suspicious_risk_score": 40,
        },
    }


@pytest.fixture
def clean_skillspector_json() -> dict[str, Any]:
    """SkillSpector output for a known-clean skill."""
    return {
        "risk_score": 5,
        "risk_severity": "info",
        "risk_recommendation": "no significant findings",
        "filtered_findings": [],
    }


@pytest.fixture
def suspicious_skillspector_json() -> dict[str, Any]:
    """SkillSpector output that should land in the suspicious band."""
    return {
        "risk_score": 50,
        "risk_severity": "medium",
        "risk_recommendation": "review before deploy",
        "filtered_findings": [
            {"rule_id": "P3", "severity": "error", "message": "External Transmission"},
            {"rule_id": "P3", "severity": "error", "message": "External Transmission"},
            {"rule_id": "TM1", "severity": "warning", "message": "Tool Chaining"},
        ],
    }


@pytest.fixture
def malicious_skillspector_json() -> dict[str, Any]:
    """SkillSpector output that should be flagged malicious by v1 thresholds."""
    return {
        "risk_score": 85,
        "risk_severity": "critical",
        "risk_recommendation": "do not install",
        "filtered_findings": [
            {"rule_id": "P1", "severity": "error", "message": "Instruction Override"},
            {"rule_id": "P5", "severity": "error", "message": "Harmful Content"},
        ],
    }
