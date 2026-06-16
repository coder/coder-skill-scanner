"""Catalogue enumeration.

Walks the cloned ``coder/registry`` catalogue and emits one matrix entry
per declared skill. Two formats are supported:

- **In-tree** (current production): walks ``<base_path>/<slug>/SKILL.md``
  and emits one row per slug. The source repo is the catalogue itself.
- **External-sources** (future, after coder/registry-server#442 lands):
  walks ``registry/<ns>/skills/README.md``, parses the YAML frontmatter
  for ``sources[].repo`` plus ``sources[].skills.<slug>`` overrides. The
  source repo is the external repo declared in the README.

Both can be enabled at the same time. ``enumerate_all`` deduplicates by
``(namespace, slug)`` so a slug that appears in both formats is scanned
once with the external-sources entry winning.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

# Skill slug pattern matches the catalogue convention (lowercase alphanum
# with hyphens, must start and end alphanumeric).
SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")

# ``sources[].repo`` value: ``owner/repo`` or ``owner/repo@ref``.
SOURCE_RE = re.compile(r"^([a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+)(?:@([a-zA-Z0-9_./-]+))?$")


def _is_valid_slug(name: str) -> bool:
    return bool(SLUG_RE.match(name))


def enumerate_in_tree(
    repo_root: Path,
    *,
    namespace: str,
    base_path: str,
    catalogue_repo: str,
    catalogue_ref: str,
) -> list[dict[str, str]]:
    """Walk ``repo_root/<base_path>/<slug>/SKILL.md`` and return matrix entries."""
    skills_dir = repo_root / base_path
    if not skills_dir.is_dir():
        return []

    rows: list[dict[str, str]] = []
    for entry in sorted(skills_dir.iterdir()):
        if not entry.is_dir():
            continue
        if not _is_valid_slug(entry.name):
            continue
        if not (entry / "SKILL.md").is_file():
            continue

        rows.append(
            {
                "namespace": namespace,
                "slug": entry.name,
                "source_repo": catalogue_repo,
                "source_ref": catalogue_ref,
                "skill_path": f"{base_path}/{entry.name}",
            }
        )
    return rows


def _parse_frontmatter(text: str) -> dict[str, Any] | None:
    """Pull out the YAML frontmatter between the first two ``---`` fences."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    end = None
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end = i
            break
    if end is None:
        return None
    body = "\n".join(lines[1:end])
    parsed = yaml.safe_load(body)
    return parsed if isinstance(parsed, dict) else None


def enumerate_external_sources(
    repo_root: Path,
    *,
    readme_glob: str,
) -> list[dict[str, str]]:
    """Walk ``registry/<ns>/skills/README.md`` files and return matrix entries.

    The YAML frontmatter under each README declares one or more
    ``sources[].repo`` strings with per-skill overrides keyed by slug.
    Each slug in each source becomes one matrix entry.
    """
    rows: list[dict[str, str]] = []
    for readme in sorted(repo_root.glob(readme_glob)):
        if not readme.is_file():
            continue
        parts = readme.relative_to(repo_root).parts
        if len(parts) < 4 or parts[0] != "registry" or parts[2] != "skills":
            # Path shape must be registry/<ns>/skills/README.md.
            continue
        namespace = parts[1]

        text = readme.read_text(encoding="utf-8")
        frontmatter = _parse_frontmatter(text)
        if not frontmatter:
            continue

        sources = frontmatter.get("sources")
        if not isinstance(sources, list):
            continue

        for source in sources:
            if not isinstance(source, dict):
                continue
            repo_spec = source.get("repo")
            if not isinstance(repo_spec, str):
                continue
            match = SOURCE_RE.match(repo_spec)
            if not match:
                continue
            source_repo = match.group(1)
            source_ref = match.group(2) or "main"

            skills_map = source.get("skills")
            if not isinstance(skills_map, dict):
                continue

            for slug in sorted(skills_map.keys()):
                if not isinstance(slug, str) or not _is_valid_slug(slug):
                    continue
                rows.append(
                    {
                        "namespace": namespace,
                        "slug": slug,
                        "source_repo": source_repo,
                        "source_ref": source_ref,
                        "skill_path": f"skills/{slug}",
                    }
                )
    return rows


def enumerate_all(repo_root: Path, *, config: dict[str, Any]) -> list[dict[str, str]]:
    """Run all enabled enumeration formats and dedupe by (namespace, slug).

    External-sources entries take precedence when both formats name the
    same slug, because external-sources is the richer declaration.
    """
    cat = config.get("catalogue") or {}
    formats = cat.get("formats") or {}
    rr = cat.get("registry_repo") or {}
    catalogue_repo = f"{rr.get('owner')}/{rr.get('repo')}"
    catalogue_ref = rr.get("ref", "main")

    rows: list[dict[str, str]] = []

    in_tree_cfg = formats.get("in_tree") or {}
    if in_tree_cfg.get("enabled"):
        rows.extend(
            enumerate_in_tree(
                repo_root,
                namespace=in_tree_cfg.get("namespace", "coder"),
                base_path=in_tree_cfg.get("base_path", ".agents/skills"),
                catalogue_repo=catalogue_repo,
                catalogue_ref=catalogue_ref,
            )
        )

    ext_cfg = formats.get("external_sources") or {}
    if ext_cfg.get("enabled"):
        ext_rows = enumerate_external_sources(
            repo_root,
            readme_glob=ext_cfg.get("readme_glob", "registry/*/skills/README.md"),
        )
        # External-sources entries win when slugs overlap.
        seen = {(r["namespace"], r["slug"]) for r in ext_rows}
        rows = [r for r in rows if (r["namespace"], r["slug"]) not in seen]
        rows.extend(ext_rows)

    # Final dedupe in case the same (ns, slug) appears in one format twice.
    deduped: dict[tuple[str, str], dict[str, str]] = {}
    for row in rows:
        key = (row["namespace"], row["slug"])
        deduped[key] = row
    return sorted(deduped.values(), key=lambda r: (r["namespace"], r["slug"]))
