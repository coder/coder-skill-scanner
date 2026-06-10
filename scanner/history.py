"""Build a manifest of historical scan snapshots in the published Pages tree.

The scanner workflow drops each scheduled run at
``pages/history/<YYYY-MM-DD>/<HHMMZ>.json`` and keeps a rolling window. GH
Pages does not expose a directory listing, so the React app cannot guess
which snapshots exist. ``index_history`` walks the on-disk tree and writes a
sibling ``pages/history/index.json`` with every snapshot's stamp, generation
timestamp, and verdict summary.
"""

from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path
from typing import Any

# Matches "<YYYY-MM-DD>T<HH-MM>Z" timestamps embedded in snapshot filenames.
STAMP_RE = re.compile(r"^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}Z)\.json$")


def _safe_summary(report: dict[str, Any]) -> dict[str, Any] | None:
    summary = report.get("summary")
    if not isinstance(summary, dict):
        return None
    return summary


def index_history(history_dir: Path) -> dict[str, Any]:
    """Scan ``history_dir`` and return the manifest payload.

    The manifest lists every snapshot, newest first. Each entry records the
    relative path the frontend should fetch, the stamp embedded in the
    filename, and the snapshot's ``generated_at`` and ``summary``.
    """
    entries: list[dict[str, Any]] = []
    if history_dir.is_dir():
        for snap in sorted(history_dir.glob("*/*.json")):
            m = STAMP_RE.match(snap.name)
            if not m:
                continue
            try:
                with snap.open(encoding="utf-8") as fh:
                    report = json.load(fh)
            except (OSError, json.JSONDecodeError):
                continue
            if not isinstance(report, dict):
                continue
            stamp = m.group(1)
            entry: dict[str, Any] = {
                "stamp": stamp,
                "generated_at": report.get("generated_at", ""),
                "path": f"history/{snap.parent.name}/{snap.name}",
            }
            summary = _safe_summary(report)
            if summary is not None:
                entry["summary"] = summary
            entries.append(entry)

    # Newest first by generated_at, falling back to stamp lexical order which
    # is the same as time order for the ISO format we use.
    entries.sort(key=lambda e: (e.get("generated_at", ""), e.get("stamp", "")), reverse=True)

    return {
        "generated_at": dt.datetime.now(dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "entries": entries,
    }
