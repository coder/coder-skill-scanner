"""Per-skill combine step.

Takes the raw SkillSpector JSON output for one skill plus the loaded
``config.yaml``, summarizes the scanner result, evaluates the verdict,
and returns the per-skill report dict that the aggregator joins.
"""

from __future__ import annotations

import collections
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from . import verdict


def summarize_skillspector(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Extract the fields used downstream from a SkillSpector JSON report.

    Reads SkillSpector's actual JSON shape:

    * ``risk_assessment.{score, severity, recommendation}`` for the headline
      risk numbers. SkillSpector emits severities in upper case
      (``CRITICAL``, ``HIGH``, ``MEDIUM``, ``LOW``, ``INFO``); the report
      schema requires lower case, so they are normalized here.
    * ``issues[]`` with one entry per finding. Each issue has ``id``,
      ``severity``, and other diagnostic fields; we only need ``id`` and
      ``severity`` for the rolled-up counts that downstream consumers and
      the schema care about.

    Returns a dict with ``risk_score``, ``risk_severity``,
    ``risk_recommendation``, ``findings_by_severity``, ``findings_by_rule``,
    and the operational flags ``crashed`` and ``json_missing``.
    """
    if raw is None:
        return {"crashed": True, "json_missing": True}
    if not isinstance(raw, dict):
        return {"crashed": True, "json_missing": False}

    risk_assessment = raw.get("risk_assessment")
    if not isinstance(risk_assessment, dict):
        risk_assessment = {}

    issues = raw.get("issues") or []
    if not isinstance(issues, list):
        issues = []

    by_sev: collections.Counter[str] = collections.Counter()
    by_rule: dict[str, dict[str, Any]] = {}
    for issue in issues:
        if not isinstance(issue, dict):
            continue
        sev = str(issue.get("severity") or "info").lower()
        rule = str(issue.get("id") or "unknown")
        by_sev[sev] += 1
        slot = by_rule.setdefault(rule, {"id": rule, "severity": sev, "count": 0})
        slot["count"] += 1

    return {
        "crashed": False,
        "json_missing": False,
        "risk_score": int(risk_assessment.get("score", 0)),
        "risk_severity": str(risk_assessment.get("severity") or "info").lower(),
        "risk_recommendation": str(risk_assessment.get("recommendation") or ""),
        "findings_by_severity": dict(by_sev),
        "findings_by_rule": sorted(by_rule.values(), key=lambda r: (-r["count"], r["id"])),
    }


def combine_skill(
    *,
    matrix_entry: dict[str, str],
    skillspector_raw: dict[str, Any] | None,
    source_sha: str,
    catalogue_drift: bool,
    config: dict[str, Any],
    artifacts: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Build the per-skill report dict.

    ``matrix_entry`` carries namespace, slug, source_repo, source_ref,
    skill_path. ``skillspector_raw`` is the parsed contents of SkillSpector's
    ``--format json`` output (or None if the scan crashed). ``source_sha``
    is the resolved commit the source was cloned at. ``catalogue_drift``
    is True if the catalogue declared this slug but it does not exist
    upstream.
    """
    ss_summary = summarize_skillspector(skillspector_raw)
    decision = verdict.evaluate(
        skillspector=ss_summary,
        config=config,
        catalogue_drift=catalogue_drift,
    )

    return {
        "namespace": matrix_entry["namespace"],
        "slug": matrix_entry["slug"],
        "source_repo": matrix_entry["source_repo"],
        "source_ref": matrix_entry["source_ref"],
        "source_sha": source_sha,
        "skill_path": matrix_entry.get("skill_path", ""),
        "scanned_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "verdict": decision.verdict,
        "reasons": list(decision.reasons),
        "scanners": {"skillspector": ss_summary},
        "artifacts": dict(artifacts or {}),
    }


def load_skillspector_json(path: Path | None) -> dict[str, Any] | None:
    """Read a SkillSpector ``--format json`` output file. Returns None on any error."""
    if path is None or not path.exists():
        return None
    import json

    try:
        with path.open(encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None
