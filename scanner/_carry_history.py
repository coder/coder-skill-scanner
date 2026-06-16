"""Carry forward prior history snapshots from the live Pages site.

The publish-pages job runs this before the new snapshot is added so that
the deployed Pages tree keeps the rolling history window (default 90 days)
instead of resetting on every run.

If the Pages URL is unreachable or the manifest is missing (first ever
run, Pages still warming up, transient outage), this exits 0 with a
warning. The new snapshot still ships.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_BASE = "https://coder.github.io/coder-skill-scanner"
MAX_SNAPSHOTS = 120  # roughly 30 days at a 6h cadence.


def _fetch(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest)


def main(out_dir: str = "prior-history") -> int:
    base = os.environ.get("PAGES_URL") or DEFAULT_BASE
    base = base.rstrip("/")
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    index_path = out / "index.json"
    try:
        _fetch(f"{base}/history/index.json", index_path)
    except urllib.error.URLError as exc:
        print(f"no prior history manifest at {base}/history/index.json: {exc}")
        return 0
    except Exception as exc:
        print(f"failed to fetch manifest: {exc}", file=sys.stderr)
        return 0

    with index_path.open(encoding="utf-8") as fh:
        idx = json.load(fh)
    entries = idx.get("entries") or []
    print(
        f"manifest has {len(entries)} prior snapshots; "
        f"mirroring {min(MAX_SNAPSHOTS, len(entries))}"
    )

    fetched = 0
    for entry in entries[:MAX_SNAPSHOTS]:
        path = entry.get("path", "")
        if not path.startswith("history/"):
            continue
        rel = path[len("history/"):]
        dest = out / rel
        try:
            _fetch(f"{base}/{path}", dest)
            fetched += 1
        except Exception as exc:
            print(f"skip {path}: {exc}")
    print(f"mirrored {fetched} snapshots into {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
