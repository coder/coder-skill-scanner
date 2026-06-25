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

+ Public site: `https://scanner.registry.coder.com/`
+ Per-skill detail: `https://scanner.registry.coder.com/skills/<namespace>/<slug>`
+ Run history: `https://scanner.registry.coder.com/history`
+ CDN-cached JSON: `https://scanner.registry.coder.com/latest.json`
+ Tagged release: `https://github.com/coder/coder-skill-scanner/releases/latest/download/latest.json`
+ Schema: `https://scanner.registry.coder.com/schema.json` (v1)
+ Per-scan history (JSON): `https://scanner.registry.coder.com/history/index.json`

The custom domain is configured via `site/public/CNAME`; the legacy
project-page URL (`https://coder.github.io/coder-skill-scanner/`) is
still redirected by GitHub Pages but should not be used in new code.

## Public API (v1)

Under `/api/v1/`, every URL is constructible from `(namespace, slug)` alone
— no lookup against the index is required to render a badge or read a
single skill. Field names and URL shapes are committed to the `v1`
stability contract; breaking changes move to a `v2` prefix.

| URL | Shape | Use |
| --- | --- | --- |
| `/api/v1/index.json` | discovery manifest: URL templates + current `(ns, slug)` pairs | bootstrap a third-party consumer |
| `/api/v1/skills.json` | compact index of every skill | listing / cache warmer |
| `/api/v1/skills/<ns>/<slug>.json` | per-skill detail (reasons, findings, `links` block) | per-skill consumer |
| `/api/v1/skills/<ns>/<slug>/badge/status.json` | shields.io endpoint payload | `img.shields.io/endpoint?url=...` |
| `/api/v1/skills/<ns>/<slug>/badge/status.svg` | inline SVG | direct embed |
| `/api/v1/skills/<ns>/<slug>/badge/score.json` | shields.io endpoint payload | same |
| `/api/v1/skills/<ns>/<slug>/badge/score.svg` | inline SVG | direct embed |
| `/api/v1/history.json` | reshape of history with absolute report URLs | history consumer |

Two badges per skill:

+ **`status`** — the categorical scan outcome (`clean`, `suspicious`,
  `malicious`, `unknown`). Colour follows the verdict 1:1.
+ **`score`** — the numeric SkillSpector risk score (`0/100` … `100/100`).
  Colour is banded at the same 21 / 51 / 81 cutoffs the verdict policy
  uses.

Embed a status badge in a README:

```markdown
![skill scan](https://scanner.registry.coder.com/api/v1/skills/coder/setup/badge/status.svg)
```

Or via shields.io if you want their renderer:

```markdown
![skill scan](https://img.shields.io/endpoint?url=https://scanner.registry.coder.com/api/v1/skills/coder/setup/badge/status.json)
```

For a fork, swap the host: `https://<your-host>/api/v1/...`. The scanner
picks the public base URL at publish time in this order:

1. `site/public/CNAME` (the custom Pages domain, if set),
2. otherwise `$GITHUB_REPOSITORY` -> `https://<owner>.github.io/<repo>`.

So a fork that just sets a CNAME gets the right URLs everywhere without
touching workflow code.

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
|   `-- public/CNAME           # custom Pages domain (drop or change for a fork)
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
4. Optional: set a custom domain by editing `site/public/CNAME` (one
   line, the bare host). Delete the file to publish at the github.io
   project-page URL instead. Whichever you choose, DNS for the host
   needs to point at `<owner>.github.io` separately.
5. Set Actions workflow permissions to "Read and write" so the
   publish-release job can create releases.
6. To enable the LLM semantic pass, set the credential secret matching
   `config.yaml`'s `scanners.skillspector.llm.provider` on your fork
   (for the default `anthropic` provider, `ANTHROPIC_API_KEY`), AND
   confirm `.github/workflows/scan.yaml` exports that secret into the
   SkillSpector step. Static-only mode (without the secret) is the
   default and works out of the box.
7. Enable Actions.

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
