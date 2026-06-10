# coder-skill-scanner

Periodic, GitHub-Actions-as-SaaS security scanner for agent skills declared
in the [Coder registry](https://github.com/coder/registry) catalogue.

Every 6 hours, the scheduled workflow in this repo:

1. Enumerates every skill in `coder/registry` (both the in-tree
   `.agents/skills/` format and the future external-sources format).
2. Shallow-clones each source repo.
3. Runs [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) in
   `--no-llm` static mode over the upstream content.
4. Builds a per-skill verdict (`clean`, `suspicious`, `malicious`,
   `unknown`) from `risk_score` plus the thresholds in `config.yaml`.
5. Publishes a versioned report as a GitHub Release asset and a public
   `latest.json` to GitHub Pages.

The registry site reads the public report through a small proxy endpoint
in `coder/registry-server` (separate PR) and shows a per-skill badge.
The registry's deploys are not gated on the scan result.

## Reading the latest report

Stable URLs, no auth required:

- CDN-cached JSON: `https://coder.github.io/coder-skill-scanner/latest.json`
- Tagged release: `https://github.com/coder/coder-skill-scanner/releases/latest/download/latest.json`
- Schema: `https://coder.github.io/coder-skill-scanner/schema.json` (v1)
- Per-scan history: `https://coder.github.io/coder-skill-scanner/history/`

## Running locally

Requires Python 3.12+ and `git`. `mise.toml` pins the right Python if you
use `mise`.

```bash
make install   # creates .venv, installs scanner + dev deps
make test      # ruff + pytest
make schema    # validate report schema is a valid JSON Schema

# Smoke-test the enumerator against a local catalogue checkout:
.venv/bin/scanner enumerate --clone-dir /path/to/coder-registry
```

## Repo layout

```text
.
|-- config.yaml                # the only user-facing knob
|-- schema/report.schema.json  # v1 report contract
|-- scanner/                   # Python module (CLI + enumerate + combine + aggregate)
|-- tests/                     # pytest, no on-disk fixtures
|-- pyproject.toml
|-- Makefile
|-- mise.toml                  # pinned Python version
|-- AGENTS.md                  # contributor + agent conventions
`-- .github/
    |-- workflows/
    |   |-- ci.yaml            # validate config + schema + ruff + pytest
    |   |-- scan.yaml          # the scheduled scanner
    |   `-- prune.yaml         # weekly release retention pruner
    |-- ISSUE_TEMPLATE/
    |   `-- scanner-down.md    # single rolling tracker
    `-- dependabot.yml         # weekly pip + github-actions bumps
```

No `scripts/` directory. No `testdata/` directory. Runtime data lives in
Releases and Pages, not in the repo.

## Forking for your own catalogue

This scanner is data-driven. To run it against a different registry:

1. Fork `coder/coder-skill-scanner`.
2. Edit `config.yaml`'s `catalogue.registry_repo` block.
3. Configure GitHub Pages on your fork (Settings, Pages, source:
   "GitHub Actions").
4. Set Actions workflow permissions to "Read and write" so the
   publish-release job can create releases.
5. Enable Actions.

No source changes required for catalogue changes.

## Verdict policy

Today's policy lives in `config.yaml`:

```yaml
verdict:
  malicious_risk_score: 75
  suspicious_risk_score: 40
```

SkillSpector's `risk_score` (0-100) is the only input. The architecture
keeps room for additional scanners (gitleaks, Semgrep, VirusTotal
Premium, etc.); adding one is a new module under `scanner/`, a new
threshold field here, and a minor schema bump.

## Failure tracking

When any scheduled run fails, `JasonEtco/create-an-issue` opens or
updates a single rolling tracker labelled `scanner-down`. If the
`SLACK_WEBHOOK_URL` secret is set, a Slack alert is also posted.

## License

Apache-2.0. See [LICENSE](./LICENSE).
