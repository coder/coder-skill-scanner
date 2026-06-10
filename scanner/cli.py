"""Click entry point for the scanner.

Four subcommands wire up the pieces in ``scanner.enumerate``,
``scanner.combine``, and ``scanner.aggregate``. The scheduled GitHub
Actions workflow chains them; local tests invoke the same functions
directly.
"""

from __future__ import annotations

import atexit
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import click
import yaml

from . import __version__, aggregate, combine
from . import enumerate as enumerate_mod

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = REPO_ROOT / "config.yaml"
DEFAULT_SCHEMA = REPO_ROOT / "schema" / "report.schema.json"


def _load_config(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    if not isinstance(data, dict):
        raise click.ClickException(f"config at {path} did not parse as a YAML mapping")
    return data


@click.group()
@click.version_option(__version__, prog_name="coder-skill-scanner")
def main() -> None:
    """coder-skill-scanner CLI."""


@main.command("enumerate")
@click.option(
    "--config",
    "config_path",
    type=click.Path(path_type=Path, exists=True),
    default=DEFAULT_CONFIG,
    show_default=True,
)
@click.option(
    "--clone-dir",
    type=click.Path(path_type=Path),
    default=None,
    help="Use an existing catalogue checkout instead of cloning. Useful for tests.",
)
@click.option(
    "--github-output",
    is_flag=True,
    help="Emit a GitHub Actions matrix on a single line as 'matrix=<json>' instead of pretty JSON.",
)
def enumerate_cmd(config_path: Path, clone_dir: Path | None, github_output: bool) -> None:
    """Enumerate skills from the catalogue and emit a GitHub Actions matrix."""
    config = _load_config(config_path)

    if clone_dir is None:
        rr = (config.get("catalogue") or {}).get("registry_repo") or {}
        owner = rr.get("owner", "coder")
        repo = rr.get("repo", "registry")
        ref = rr.get("ref", "main")
        clone_dir = Path(tempfile.mkdtemp(prefix="catalogue-"))
        # Ensure the temp clone is removed on normal exit and on errors.
        atexit.register(shutil.rmtree, clone_dir, ignore_errors=True)
        url = f"https://github.com/{owner}/{repo}.git"
        subprocess.run(
            ["git", "clone", "--depth=1", "--branch", ref, "--single-branch", url, str(clone_dir)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        sha = subprocess.check_output(
            ["git", "-C", str(clone_dir), "rev-parse", "HEAD"], text=True
        ).strip()
    else:
        try:
            sha = subprocess.check_output(
                ["git", "-C", str(clone_dir), "rev-parse", "HEAD"],
                text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
        except (subprocess.CalledProcessError, FileNotFoundError):
            sha = "0" * 40

    rows = enumerate_mod.enumerate_all(clone_dir, config=config)
    matrix = {"include": rows}

    if github_output:
        click.echo(f"matrix={json.dumps(matrix, separators=(',', ':'))}")
        click.echo(f"catalogue_sha={sha}")
    else:
        click.echo(json.dumps({"matrix": matrix, "catalogue_sha": sha}, indent=2))


@main.command("combine")
@click.option(
    "--config",
    "config_path",
    type=click.Path(path_type=Path, exists=True),
    default=DEFAULT_CONFIG,
    show_default=True,
)
@click.option("--namespace", required=True)
@click.option("--slug", required=True)
@click.option("--source-repo", required=True)
@click.option("--source-ref", required=True)
@click.option("--source-sha", required=True)
@click.option("--skill-path", required=True)
@click.option(
    "--skillspector-json",
    "skillspector_path",
    type=click.Path(path_type=Path),
    default=None,
    help="Path to SkillSpector --format=json output. Omit when the scanner crashed.",
)
@click.option(
    "--artifact-sarif",
    default="",
    help="URL or path to the SARIF artifact for this skill.",
)
@click.option(
    "--artifact-json",
    default="",
    help="URL or path to the SkillSpector JSON artifact for this skill.",
)
@click.option("--catalogue-drift/--no-catalogue-drift", default=False)
@click.option(
    "--output",
    type=click.Path(path_type=Path),
    default=None,
    help="Write to file instead of stdout.",
)
def combine_cmd(
    config_path: Path,
    namespace: str,
    slug: str,
    source_repo: str,
    source_ref: str,
    source_sha: str,
    skill_path: str,
    skillspector_path: Path | None,
    artifact_sarif: str,
    artifact_json: str,
    catalogue_drift: bool,
    output: Path | None,
) -> None:
    """Combine one skill's scanner outputs into a per-skill report."""
    config = _load_config(config_path)
    raw = combine.load_skillspector_json(skillspector_path)

    artifacts: dict[str, str] = {}
    if artifact_sarif:
        artifacts["skillspector_sarif"] = artifact_sarif
    if artifact_json:
        artifacts["skillspector_json"] = artifact_json

    report = combine.combine_skill(
        matrix_entry={
            "namespace": namespace,
            "slug": slug,
            "source_repo": source_repo,
            "source_ref": source_ref,
            "skill_path": skill_path,
        },
        skillspector_raw=raw,
        source_sha=source_sha,
        catalogue_drift=catalogue_drift,
        config=config,
        artifacts=artifacts,
    )
    payload = json.dumps(report, indent=2) + "\n"
    if output:
        output.write_text(payload, encoding="utf-8")
    else:
        click.echo(payload, nl=False)


@main.command("aggregate")
@click.option(
    "--config",
    "config_path",
    type=click.Path(path_type=Path, exists=True),
    default=DEFAULT_CONFIG,
    show_default=True,
)
@click.option(
    "--schema",
    "schema_path",
    type=click.Path(path_type=Path, exists=True),
    default=DEFAULT_SCHEMA,
    show_default=True,
)
@click.argument(
    "skills_dir",
    type=click.Path(path_type=Path, exists=True, file_okay=False),
)
@click.option(
    "--output",
    type=click.Path(path_type=Path),
    default=None,
    help="Write to file instead of stdout.",
)
def aggregate_cmd(
    config_path: Path,
    schema_path: Path,
    skills_dir: Path,
    output: Path | None,
) -> None:
    """Aggregate per-skill reports under SKILLS_DIR into latest.json."""
    config = _load_config(config_path)
    reports = aggregate.load_skill_reports(skills_dir)

    run = {
        "owner": os.environ.get("GITHUB_REPOSITORY_OWNER", "coder"),
        "repo": os.environ.get("GITHUB_REPOSITORY", "coder/coder-skill-scanner").split("/")[-1],
        "workflow": os.environ.get("GITHUB_WORKFLOW", "scan"),
        "run_id": int(os.environ.get("GITHUB_RUN_ID", "1") or 1),
        "run_url": (
            f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/"
            f"{os.environ.get('GITHUB_REPOSITORY', 'coder/coder-skill-scanner')}/"
            f"actions/runs/{os.environ.get('GITHUB_RUN_ID', '1')}"
        ),
        "head_sha": os.environ.get("GITHUB_SHA", "0" * 40),
    }

    rr = (config.get("catalogue") or {}).get("registry_repo") or {}
    catalogue_meta = {
        "owner": rr.get("owner", "coder"),
        "repo": rr.get("repo", "registry"),
        "ref": rr.get("ref", "main"),
        "sha": os.environ.get("SCANNER_CATALOGUE_SHA", "0" * 40),
    }

    ss = (config.get("scanners") or {}).get("skillspector") or {}
    skillspector_pin = ss.get("pin", "")
    skillspector_args = ss.get("flags") or []

    report = aggregate.aggregate(
        skills=reports,
        scanner_run=run,
        catalogue=catalogue_meta,
        skillspector_args=skillspector_args,
        skillspector_pin=skillspector_pin,
    )

    schema = aggregate.load_schema(schema_path)
    aggregate.validate_report(report, schema)

    payload = json.dumps(report, indent=2) + "\n"
    if output:
        output.write_text(payload, encoding="utf-8")
    else:
        click.echo(payload, nl=False)


@main.command("validate")
@click.argument("report_path", type=click.Path(path_type=Path, exists=True))
@click.option(
    "--schema",
    "schema_path",
    type=click.Path(path_type=Path, exists=True),
    default=DEFAULT_SCHEMA,
    show_default=True,
)
def validate_cmd(report_path: Path, schema_path: Path) -> None:
    """Validate an existing latest.json against the report schema."""
    with report_path.open(encoding="utf-8") as fh:
        report = json.load(fh)
    schema = aggregate.load_schema(schema_path)
    try:
        aggregate.validate_report(report, schema)
    except Exception as exc:
        click.echo(f"validation failed: {exc}", err=True)
        sys.exit(1)
    click.echo("ok")


if __name__ == "__main__":
    main()
