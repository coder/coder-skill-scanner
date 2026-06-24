"""Build the v1 public API surface from a generated ``latest.json``.

The v1 contract:

- ``api/v1/skills.json``                Compact index of every skill in the most
                                        recent scan: namespace, slug, verdict,
                                        risk_score, source_repo, source_sha,
                                        scanned_at. Lightweight enough to fetch
                                        on every page render.
- ``api/v1/skills/<ns>/<slug>.json``    Per-skill detail with the same fields
                                        plus reasons, findings by severity and
                                        rule, and a ``links`` object pointing
                                        at the badge endpoints and the
                                        immutable source-tree URL.
- ``api/v1/history.json``               Reshape of ``history/index.json`` into
                                        a versioned shape with absolute
                                        ``report_url`` fields so consumers do
                                        not have to know the Pages layout.

Stability: once shipped, ``v1`` field names and shapes do not change. New
optional fields are allowed. Removed or renamed fields require a ``v2`` prefix
with a deprecation window on ``v1``.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from . import badges

API_SCHEMA_VERSION = 1


def _source_tree_url(skill: dict[str, Any]) -> str:
    """Return the immutable ``github.com/<repo>/tree/<sha>/<path>`` link.

    Always uses ``source_sha`` (not ``source_ref``) so the link survives
    upstream branch movement. Falls back to the bare repo URL when the SHA is
    missing.
    """
    repo = skill.get("source_repo")
    sha = skill.get("source_sha")
    path = (skill.get("skill_path") or "").lstrip("/")
    if not repo:
        return ""
    if not sha:
        return f"https://github.com/{repo}"
    suffix = f"/{path}" if path else ""
    return f"https://github.com/{repo}/tree/{sha}{suffix}"


def _badge_links(public_base_url: str, namespace: str, slug: str) -> dict[str, str]:
    """Return the four badge URLs for a single skill."""
    root = public_base_url.rstrip("/")
    return {
        "verdict_badge_json": f"{root}/api/v1/skills/{namespace}/{slug}/badge/verdict.json",
        "verdict_badge_svg": f"{root}/api/v1/skills/{namespace}/{slug}/badge/verdict.svg",
        "risk_badge_json": f"{root}/api/v1/skills/{namespace}/{slug}/badge/risk.json",
        "risk_badge_svg": f"{root}/api/v1/skills/{namespace}/{slug}/badge/risk.svg",
    }


def _skill_index_entry(skill: dict[str, Any]) -> dict[str, Any]:
    """Compact shape for the index."""
    ss = (skill.get("scanners") or {}).get("skillspector") or {}
    return {
        "namespace": skill["namespace"],
        "slug": skill["slug"],
        "verdict": skill["verdict"],
        "risk_score": ss.get("risk_score", 0),
        "source_repo": skill.get("source_repo", ""),
        "source_sha": skill.get("source_sha", ""),
        "scanned_at": skill.get("scanned_at", ""),
    }


def build_skills_index(
    report: dict[str, Any],
    *,
    generated_at: str | None = None,
) -> dict[str, Any]:
    """Build the ``api/v1/skills.json`` payload."""
    skills = sorted(
        (_skill_index_entry(s) for s in report.get("skills", [])),
        key=lambda r: (r["namespace"], r["slug"]),
    )
    return {
        "schema_version": API_SCHEMA_VERSION,
        "generated_at": generated_at or report.get("generated_at", ""),
        "summary": report.get("summary", {}),
        "skills": skills,
    }


def build_skill_detail(
    skill: dict[str, Any],
    *,
    public_base_url: str,
    report_url: str,
) -> dict[str, Any]:
    """Build a single ``api/v1/skills/<ns>/<slug>.json`` payload."""
    ss = (skill.get("scanners") or {}).get("skillspector") or {}
    return {
        "schema_version": API_SCHEMA_VERSION,
        "namespace": skill["namespace"],
        "slug": skill["slug"],
        "verdict": skill["verdict"],
        "risk_score": ss.get("risk_score", 0),
        "risk_severity": ss.get("risk_severity", "unknown"),
        "source_repo": skill.get("source_repo", ""),
        "source_ref": skill.get("source_ref", ""),
        "source_sha": skill.get("source_sha", ""),
        "skill_path": skill.get("skill_path", ""),
        "scanned_at": skill.get("scanned_at", ""),
        "reasons": skill.get("reasons", []),
        "findings_by_severity": ss.get("findings_by_severity", {}),
        "findings_by_rule": ss.get("findings_by_rule", []),
        "links": {
            "report": report_url,
            "source_tree": _source_tree_url(skill),
            **_badge_links(public_base_url, skill["namespace"], skill["slug"]),
        },
    }


def build_history_index(
    history_manifest: dict[str, Any],
    *,
    public_base_url: str,
    generated_at: str | None = None,
) -> dict[str, Any]:
    """Reshape ``history/index.json`` into the versioned API shape."""
    root = public_base_url.rstrip("/")
    entries = []
    for entry in history_manifest.get("entries", []):
        rel = entry.get("path", "").lstrip("/")
        entries.append(
            {
                "stamp": entry.get("stamp", ""),
                "generated_at": entry.get("generated_at", ""),
                "summary": entry.get("summary", {}),
                "report_url": f"{root}/{rel}" if rel else "",
            }
        )
    return {
        "schema_version": API_SCHEMA_VERSION,
        "generated_at": generated_at or datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "entries": entries,
    }


def write_api_v1(
    report: dict[str, Any],
    *,
    output_dir: Path,
    public_base_url: str,
    history_manifest: dict[str, Any] | None = None,
) -> list[Path]:
    """Write the full v1 API tree under ``output_dir`` and return paths written."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    report_url = f"{public_base_url.rstrip('/')}/latest.json"

    skills_index = build_skills_index(report)
    skills_index_path = output_dir / "skills.json"
    skills_index_path.write_text(json.dumps(skills_index, indent=2) + "\n", encoding="utf-8")
    written.append(skills_index_path)

    for skill in report.get("skills", []):
        ns = skill["namespace"]
        slug = skill["slug"]
        detail = build_skill_detail(skill, public_base_url=public_base_url, report_url=report_url)
        detail_path = output_dir / "skills" / ns / f"{slug}.json"
        detail_path.parent.mkdir(parents=True, exist_ok=True)
        detail_path.write_text(json.dumps(detail, indent=2) + "\n", encoding="utf-8")
        written.append(detail_path)

        badge_dir = detail_path.parent / slug / "badge"
        badge_dir.mkdir(parents=True, exist_ok=True)
        verdict = skill["verdict"]
        ss = (skill.get("scanners") or {}).get("skillspector") or {}
        risk = int(ss.get("risk_score", 0))
        v_json = badge_dir / "verdict.json"
        v_json.write_text(
            json.dumps(badges.verdict_badge_json(verdict), indent=2) + "\n",
            encoding="utf-8",
        )
        written.append(v_json)
        v_svg = badge_dir / "verdict.svg"
        v_svg.write_text(badges.verdict_badge_svg(verdict), encoding="utf-8")
        written.append(v_svg)
        r_json = badge_dir / "risk.json"
        r_json.write_text(
            json.dumps(badges.risk_badge_json(risk), indent=2) + "\n",
            encoding="utf-8",
        )
        written.append(r_json)
        r_svg = badge_dir / "risk.svg"
        r_svg.write_text(badges.risk_badge_svg(risk), encoding="utf-8")
        written.append(r_svg)

    if history_manifest is not None:
        history_api = build_history_index(history_manifest, public_base_url=public_base_url)
        history_path = output_dir / "history.json"
        history_path.write_text(json.dumps(history_api, indent=2) + "\n", encoding="utf-8")
        written.append(history_path)

    return written
