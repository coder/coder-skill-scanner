"""Tests for catalogue enumeration."""

from __future__ import annotations

from pathlib import Path

from scanner import enumerate as enumerate_mod


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_in_tree_walks_skill_directories(tmp_path):
    _write(
        tmp_path / ".agents" / "skills" / "coder-modules" / "SKILL.md",
        "---\nname: coder-modules\ndescription: y\n---\n# Modules\n",
    )
    _write(
        tmp_path / ".agents" / "skills" / "coder-templates" / "SKILL.md",
        "---\nname: coder-templates\ndescription: y\n---\n# Templates\n",
    )

    rows = enumerate_mod.enumerate_in_tree(
        tmp_path,
        namespace="coder",
        base_path=".agents/skills",
        catalogue_repo="coder/registry",
        catalogue_ref="main",
    )
    assert [r["slug"] for r in rows] == ["coder-modules", "coder-templates"]
    for row in rows:
        assert row["namespace"] == "coder"
        assert row["source_repo"] == "coder/registry"
        assert row["source_ref"] == "main"
        assert row["skill_path"].startswith(".agents/skills/")


def test_in_tree_ignores_directories_without_skill_md(tmp_path):
    _write(
        tmp_path / ".agents" / "skills" / "real" / "SKILL.md",
        "---\nname: real\ndescription: y\n---\n# Real\n",
    )
    (tmp_path / ".agents" / "skills" / "empty").mkdir(parents=True)

    rows = enumerate_mod.enumerate_in_tree(
        tmp_path,
        namespace="coder",
        base_path=".agents/skills",
        catalogue_repo="coder/registry",
        catalogue_ref="main",
    )
    assert [r["slug"] for r in rows] == ["real"]


def test_in_tree_rejects_invalid_slug_names(tmp_path):
    # Underscores and uppercase are not valid skill slugs.
    _write(
        tmp_path / ".agents" / "skills" / "Bad_Name" / "SKILL.md",
        "---\nname: x\ndescription: y\n---\n",
    )
    _write(
        tmp_path / ".agents" / "skills" / "good" / "SKILL.md",
        "---\nname: good\ndescription: y\n---\n",
    )

    rows = enumerate_mod.enumerate_in_tree(
        tmp_path,
        namespace="coder",
        base_path=".agents/skills",
        catalogue_repo="coder/registry",
        catalogue_ref="main",
    )
    assert [r["slug"] for r in rows] == ["good"]


def test_in_tree_returns_empty_when_base_missing(tmp_path):
    rows = enumerate_mod.enumerate_in_tree(
        tmp_path,
        namespace="coder",
        base_path=".agents/skills",
        catalogue_repo="coder/registry",
        catalogue_ref="main",
    )
    assert rows == []


def test_external_sources_parses_readme_frontmatter(tmp_path):
    readme = tmp_path / "registry" / "coder" / "skills" / "README.md"
    _write(
        readme,
        "---\n"
        "icon: ../../../.icons/coder.svg\n"
        "sources:\n"
        "  - repo: coder/skills@main\n"
        "    skills:\n"
        "      setup:\n"
        "        display_name: Setup\n"
        "      modules:\n"
        "        display_name: Modules\n"
        "---\n"
        "# Coder Skills\n",
    )

    rows = enumerate_mod.enumerate_external_sources(
        tmp_path, readme_glob="registry/*/skills/README.md"
    )
    assert {(r["namespace"], r["slug"]) for r in rows} == {
        ("coder", "setup"),
        ("coder", "modules"),
    }
    for row in rows:
        assert row["source_repo"] == "coder/skills"
        assert row["source_ref"] == "main"
        assert row["skill_path"].startswith("skills/")


def test_external_sources_defaults_ref_when_not_specified(tmp_path):
    readme = tmp_path / "registry" / "anyone" / "skills" / "README.md"
    _write(
        readme,
        """---
sources:
  - repo: anyone/things
    skills:
      x:
        display_name: X
---
""",
    )
    rows = enumerate_mod.enumerate_external_sources(
        tmp_path, readme_glob="registry/*/skills/README.md"
    )
    assert rows == [
        {
            "namespace": "anyone",
            "slug": "x",
            "source_repo": "anyone/things",
            "source_ref": "main",
            "skill_path": "skills/x",
        }
    ]


def test_enumerate_all_dedupes_with_external_sources_winning(tmp_path, default_config):
    # In-tree declares "coder-modules".
    _write(
        tmp_path / ".agents" / "skills" / "coder-modules" / "SKILL.md",
        "---\nname: coder-modules\ndescription: y\n---\n",
    )
    # External-sources also declares it. The external entry must win.
    readme = tmp_path / "registry" / "coder" / "skills" / "README.md"
    _write(
        readme,
        """---
sources:
  - repo: coder/skills@main
    skills:
      coder-modules:
        display_name: Modules
---
""",
    )

    rows = enumerate_mod.enumerate_all(tmp_path, config=default_config)
    assert len(rows) == 1
    assert rows[0]["source_repo"] == "coder/skills"
    assert rows[0]["skill_path"] == "skills/coder-modules"


def test_enumerate_all_emits_sorted_rows(tmp_path, default_config):
    for slug in ["zebra", "alpha", "mango"]:
        _write(
            tmp_path / ".agents" / "skills" / slug / "SKILL.md",
            f"---\nname: {slug}\ndescription: y\n---\n",
        )

    rows = enumerate_mod.enumerate_all(tmp_path, config=default_config)
    assert [r["slug"] for r in rows] == ["alpha", "mango", "zebra"]
