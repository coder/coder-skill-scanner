---
name: Scanner is down
about: Auto-opened by the scheduled scanner workflow when a run fails.
title: "[scanner-down] Scheduled scan failed"
labels: ["scanner-down"]
---

The scheduled skills scan failed. Most recent run:

{{ env.WORKFLOW_URL }}

This is a single rolling tracker. The scan workflow updates the same
open issue on every subsequent failure until it is closed. Closing
without a fix reopens (or creates) the next time the workflow fails.

Likely causes:

- `coder/registry@main` enumeration failed (catalogue unreachable,
  YAML parse error, or new format not yet supported by the enumerator).
- SkillSpector install path broke (NVIDIA/SkillSpector pinned commit
  removed, Python deps drifted, OSV.dev unreachable).
- ClamAV `freshclam` failed to refresh signatures past the
  `signature_db_age_hours` threshold.
- GitHub Pages deploy hit `actions/deploy-pages` permission issues.
- `gh release create` failed; `latest` rolling tag inconsistent.

Recovery:

1. Read the run logs.
2. If the failure is transient (third-party outage), wait one cycle.
3. If the failure persists, land a PR that fixes the underlying issue,
   then close this tracker. The next successful scan will publish a
   fresh `latest.json`.

The previous `latest` Release and `latest.json` remain in place; the
site falls back to those automatically until the next green run.
