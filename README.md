# coder-skill-scanner

Periodic, GitHub-Actions-as-SaaS security scanner for agent skills declared
in the [Coder registry](https://github.com/coder/registry) catalogue.

Every 6 hours, the scheduled workflow in this repo:

1. Enumerates every skill in `coder/registry` (both the in-tree
   `.agents/skills/` format and the future external-sources format).
2. Shallow-clones each source repo.
3. Runs [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) over
   the upstream content. The scheduled scan runs SkillSpector's LLM
   semantic pass when the workflow's LLM credential secret is
   configured, and falls back to `--no-llm` static-only mode otherwise.
4. Builds a per-skill verdict (`clean`, `suspicious`, `malicious`,
   `unknown`) from `risk_score` plus the thresholds in `config.yaml`.
5. Builds the React SPA in `site/` and ships it together with
   `latest.json`, `schema.json`, and a rolling history of prior
   snapshots to GitHub Pages. Also publishes a versioned GitHub Release
   for archival.

The public site is the same React app that registry-server hosts at
`registry.coder.com`, scoped down to scan results. Same Vite, Tailwind,
Radix, react-router-dom, and tanstack-query stack.

The registry site reads the public report through a small proxy endpoint
in `coder/registry-server` (separate PR) and shows a per-skill badge.
The registry's deploys are not gated on the scan result.

## Reading the latest report

Stable URLs, no auth required:

+ Public site: `https://coder.github.io/coder-skill-scanner/`
+ Per-skill detail: `https://coder.github.io/coder-skill-scanner/skills/<namespace>/<slug>`
+ Run history: `https://coder.github.io/coder-skill-scanner/history`
+ CDN-cached JSON: `https://coder.github.io/coder-skill-scanner/latest.json`
+ Tagged release: `https://github.com/coder/coder-skill-scanner/releases/latest/download/latest.json`
+ Schema: `https://coder.github.io/coder-skill-scanner/schema.json` (v1)
+ Per-scan history (JSON): `https://coder.github.io/coder-skill-scanner/history/index.json`

## Running locally

Requires Python 3.12+, Node 22+ (via `mise`), pnpm, and `git`.

```bash
make install   # creates .venv, installs scanner + dev deps
make test      # ruff + pytest
make schema    # validate report schema is a valid JSON Schema

# Smoke-test the enumerator against a local catalogue checkout:
.venv/bin/scanner enumerate --clone-dir /path/to/coder-registry

# Run the React site against a local pages tree. In two terminals:
make site-install
cd /path/to/pages && python3 -m http.server 8765   # serve scanner output
make site-dev                                       # vite proxies :5173 -> :8765
```

Vite's dev proxy (see `site/vite.config.ts`) forwards `latest.json`,
`schema.json`, and `history/*.json` to the static server, so the React
app sees real scanner output without CORS shenanigans. SPA routes such
as `/skills/coder/setup` stay client-side.

## Repo layout

```text
.
|-- config.yaml                # the only user-facing knob
|-- schema/report.schema.json  # v1 report contract
|-- scanner/                   # Python module (CLI + enumerate + combine + aggregate + history)
|-- tests/                     # pytest, no on-disk fixtures
|-- site/                      # React SPA (Vite + Tailwind + Radix + react-router-dom)
|-- pyproject.toml
|-- Makefile
|-- mise.toml                  # pinned Python + Node versions
|-- AGENTS.md                  # contributor + agent conventions
`-- .github/
    |-- workflows/
    |   |-- ci.yaml            # validate config + schema + ruff + pytest + site lint/test/build
    |   |-- scan.yaml          # the scheduled scanner; also builds and publishes the SPA
    |   `-- prune.yaml         # weekly release retention pruner
    |-- ISSUE_TEMPLATE/
    |   `-- scanner-down.md    # single rolling tracker
    `-- dependabot.yml         # weekly pip + github-actions bumps
```

No `scripts/` directory. No `testdata/` directory. No committed sample
reports. Runtime data lives in workflow artifacts, Releases, and Pages,
not in the repo.

## Forking for your own catalogue

This scanner is data-driven. To run it against a different registry:

1. Fork `coder/coder-skill-scanner`.
2. Edit `config.yaml`'s `catalogue.registry_repo` block.
3. Configure GitHub Pages on your fork (Settings, Pages, source:
   "GitHub Actions").
4. Set Actions workflow permissions to "Read and write" so the
   publish-release job can create releases.
5. To enable the LLM semantic pass, set the credential secret matching
   `config.yaml`'s `scanners.skillspector.llm.provider` on your fork
   (for the default `anthropic` provider, `ANTHROPIC_API_KEY`), AND
   confirm `.github/workflows/scan.yaml` exports that secret into the
   SkillSpector step. Static-only mode (without the secret) is the
   default and works out of the box.
6. Enable Actions.

No source changes required for catalogue changes.

## Verdict policy

Today's policy lives in `config.yaml`:

```yaml
verdict:
  malicious_risk_score: 81
  suspicious_risk_score: 51
```

SkillSpector's `risk_score` (0-100) is the only input. The thresholds
are aligned to SkillSpector's own `HIGH` and `CRITICAL` bands.

The architecture keeps room for additional scanners (gitleaks, Semgrep,
VirusTotal Premium, etc.); adding one is a new module under `scanner/`,
a new threshold field here, and a minor schema bump.

## Failure tracking

When any scheduled run fails, `JasonEtco/create-an-issue` opens or
updates a single rolling tracker labelled `scanner-down`. If the
`SLACK_WEBHOOK_URL` secret is set, a Slack alert is also posted.

## License

Apache-2.0. See [LICENSE](./LICENSE).
