"""Aggregate per-skill reports into the public ``latest.json``.

The aggregator joins every ``skill.json`` produced by ``combine`` into a
single document, attaches the run-level metadata (workflow run, catalogue
SHA, scanner versions), and validates against
``schema/report.schema.json`` before returning. The result is what the
publisher uploads to GitHub Releases and GitHub Pages.
"""

from __future__ import annotations

import collections
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import jsonschema

from . import __version__

SCHEMA_VERSION = "1.0.0"


def _empty_verdict_counts() -> dict[str, int]:
    return {"clean": 0, "suspicious": 0, "malicious": 0, "unknown": 0}


def aggregate(
    *,
    skills: list[dict[str, Any]],
    scanner_run: dict[str, Any],
    catalogue: dict[str, Any],
    catalogue_drift: list[dict[str, Any]] | None = None,
    skillspector_args: list[str] | None = None,
    skillspector_pin: str = "",
) -> dict[str, Any]:
    """Build the top-level report from per-skill rows.

    Caller is responsible for passing the right metadata; the scan
    workflow constructs ``scanner_run`` and ``catalogue`` from
    environment variables and the enumerate step's output.
    """
    namespaces = {s["namespace"] for s in skills}
    sources = {(s["source_repo"], s["source_ref"]) for s in skills}

    verdict_counts = _empty_verdict_counts()
    for s in skills:
        verdict_counts[s["verdict"]] = verdict_counts.get(s["verdict"], 0) + 1

    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "scanner_run": scanner_run,
        "catalogue": catalogue,
        "scanners": {
            "skillspector": {
                "version_pin": skillspector_pin,
                "args": list(skillspector_args or []),
            },
        },
        "summary": {
            "namespaces": len(namespaces),
            "sources": len(sources),
            "skills_scanned": len(skills),
            "verdicts": verdict_counts,
        },
        "skills": sorted(skills, key=lambda s: (s["namespace"], s["slug"])),
        "catalogue_drift": list(catalogue_drift or []),
    }


def load_skill_reports(directory: Path) -> list[dict[str, Any]]:
    """Read every ``skill.json`` under ``directory`` recursively.

    The scan workflow stages per-skill artifacts under
    ``skills/skill-<ns>-<slug>/skill.json``. Reading order is sorted by
    path so the output is reproducible.
    """
    reports: list[dict[str, Any]] = []
    for child in sorted(directory.rglob("skill.json")):
        with child.open(encoding="utf-8") as fh:
            reports.append(json.load(fh))
    return reports


def validate_report(report: dict[str, Any], schema: dict[str, Any]) -> None:
    """Raise ``jsonschema.ValidationError`` on any schema violation."""
    jsonschema.validate(instance=report, schema=schema)


def load_schema(schema_path: Path) -> dict[str, Any]:
    with schema_path.open(encoding="utf-8") as fh:
        return json.load(fh)


# Surface the bundled scanner version so the workflow can include it in
# release notes without re-parsing pyproject.toml.
def package_version() -> str:
    return __version__


# Counters are a Counter alias for the public API. Re-export so callers
# importing from ``scanner.aggregate`` do not need to also import collections.
Counter = collections.Counter
