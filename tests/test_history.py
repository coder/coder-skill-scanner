"""Tests for scanner.history.index_history."""

from __future__ import annotations

import json
from pathlib import Path

from scanner import history


def _snapshot(
    dir_path: Path,
    stamp: str,
    *,
    generated_at: str,
    verdicts: dict[str, int] | None = None,
    total: int | None = None,
) -> None:
    """Write a tiny snapshot file under ``<date>/<time>.json``."""
    date_part, _time_part = stamp.split("T", 1)
    snap_dir = dir_path / date_part
    snap_dir.mkdir(parents=True, exist_ok=True)
    payload: dict = {
        "schema_version": "1.0.0",
        "generated_at": generated_at,
    }
    if verdicts is not None:
        payload["summary"] = {
            "namespaces": 1,
            "sources": 1,
            "skills_scanned": total if total is not None else sum(verdicts.values()),
            "verdicts": verdicts,
        }
    (snap_dir / f"{stamp}.json").write_text(json.dumps(payload), encoding="utf-8")


def test_index_history_walks_snapshots_newest_first(tmp_path: Path) -> None:
    _snapshot(
        tmp_path,
        "2026-06-10T22-17Z",
        generated_at="2026-06-10T22:17:00Z",
        verdicts={"clean": 4, "suspicious": 0, "malicious": 1, "unknown": 0},
    )
    _snapshot(
        tmp_path,
        "2026-06-10T16-17Z",
        generated_at="2026-06-10T16:17:00Z",
        verdicts={"clean": 5, "suspicious": 0, "malicious": 0, "unknown": 0},
    )
    _snapshot(
        tmp_path,
        "2026-06-09T16-17Z",
        generated_at="2026-06-09T16:17:00Z",
        verdicts={"clean": 5, "suspicious": 0, "malicious": 0, "unknown": 0},
    )

    manifest = history.index_history(tmp_path)

    assert "generated_at" in manifest
    stamps = [e["stamp"] for e in manifest["entries"]]
    assert stamps == [
        "2026-06-10T22-17Z",
        "2026-06-10T16-17Z",
        "2026-06-09T16-17Z",
    ]
    # The frontend resolves snapshot paths relative to the pages tree, so the
    # manifest must reference them by their <date>/<time>.json subpath.
    assert manifest["entries"][0]["path"].startswith("history/2026-06-10/")
    assert manifest["entries"][0]["summary"]["verdicts"]["malicious"] == 1


def test_index_history_returns_empty_for_missing_directory(tmp_path: Path) -> None:
    missing = tmp_path / "no-such-dir"
    manifest = history.index_history(missing)
    assert manifest["entries"] == []
    assert "generated_at" in manifest


def test_index_history_skips_unrelated_files(tmp_path: Path) -> None:
    """Non-snapshot JSON files and other artefacts must not appear in the manifest."""
    (tmp_path / "2026-06-10").mkdir()
    (tmp_path / "2026-06-10" / "not-a-snapshot.txt").write_text("noise", encoding="utf-8")
    (tmp_path / "2026-06-10" / "garbled.json").write_text("{not json", encoding="utf-8")
    # Filename does not match the timestamp pattern, ignored.
    (tmp_path / "2026-06-10" / "2026-06-10-bad.json").write_text(
        json.dumps({"schema_version": "1.0.0", "generated_at": "x"}),
        encoding="utf-8",
    )
    _snapshot(
        tmp_path,
        "2026-06-10T22-17Z",
        generated_at="2026-06-10T22:17:00Z",
        verdicts={"clean": 1, "suspicious": 0, "malicious": 0, "unknown": 0},
    )

    manifest = history.index_history(tmp_path)
    assert [e["stamp"] for e in manifest["entries"]] == ["2026-06-10T22-17Z"]


def test_index_history_handles_snapshot_without_summary(tmp_path: Path) -> None:
    _snapshot(
        tmp_path,
        "2026-06-10T22-17Z",
        generated_at="2026-06-10T22:17:00Z",
    )
    manifest = history.index_history(tmp_path)
    assert len(manifest["entries"]) == 1
    assert "summary" not in manifest["entries"][0]
