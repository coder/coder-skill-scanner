# AGENTS.md

`coder/coder-skill-scanner` is a periodic, GitHub-Actions-as-SaaS security
scanner for agent skills declared in the [Coder registry](https://github.com/coder/registry).
This file is the contributor and agent guide for working in this repo.

## What lives here

Read [README.md](./README.md) first for the architecture. The short version:

- `config.yaml` is the only user-facing surface. Catalogue source,
  scanner pins, verdict thresholds, publish destinations.
- `schema/report.schema.json` is the contract the registry site reads
  against. Bumping it is a coordinated, versioned change.
- `scripts/` will hold the enumerate, scan, combine, and publish steps
  (added in follow-up PRs).
- `.github/workflows/scan.yaml` is the scheduled scanner (also follow-up).

## Foundational rules

- Doing it right is better than doing it fast.
- Tedious, systematic work is often the correct solution. Do not abandon
  an approach because it is repetitive; abandon it only if it is
  technically wrong.
- Honesty is a core value. Push back on bad ideas with reasoning.

## Code style

- Pin every action and external CLI by commit SHA.
- Bash scripts MUST be ShellCheck-clean against `.shellcheckrc` and
  prettier-clean against `prettier-plugin-sh`.
- No emdash (U+2014), no endash (U+2013), no ` -- ` punctuation in code,
  comments, strings, or markdown. Use commas, semicolons, or periods.
- Commit format: `type(scope): message`. Scopes are real paths (e.g.,
  `fix(scripts/scan-clamav.sh): ...`).
- PR titles follow the same format.

## Workflow conventions

- Default branch is `main`.
- Direct pushes to `main` are reserved for the initial bootstrap and
  for the `publish-release` / `publish-pages` Actions jobs. Everything
  else lands via PR.
- The scanner workflow's only elevated permission is `contents: write`
  for the release publisher and `pages: write` + `id-token: write` for
  the Pages deployer. Audit changes to those jobs carefully.

## Local dev

- `make lint` runs ShellCheck and `prettier --check` over `scripts/`
  (target added with the scripts in PR 2).
- `make schema` validates `schema/report.schema.json` against the
  metaschema and against fixture reports in `testdata/`.
- `make self-test` runs the full pipeline against `testdata/fixture-*`
  (target added in PR 2). No network calls; uses local upstream
  fixtures.

## Schema versioning

`schema/report.schema.json` is v1.0.0. Backward-compatible additions
bump the minor. Anything that changes the shape of an existing field
or removes a field is a major and ships as a parallel
`latest-v2.json` with a coordinated `coder/registry-server` proxy
cutover. Never break the v1 URL.

## Failure surface

When the scheduled scan fails, `JasonEtco/create-an-issue` opens or
updates a single rolling tracker labelled `scanner-down`. Do not close
that issue unless the underlying problem is fixed; closing without a
fix means the next run will reopen.

## Decision log

Material decisions and tradeoffs get written down in
`.github/decisions/<NNN>-<topic>.md` (directory added when the first
decision lands). For this bootstrap:

- VirusTotal Public API is excluded (commercial-use restriction).
  ClamAV fills the malware-signature slot. See README and Plan v2.
- SkillSpector runs in `--no-llm` static mode for the periodic scan.
  LLM mode is opt-in for ad-hoc analysis.
- Publishing uses GitHub Releases (canonical) + GitHub Pages via
  `actions/deploy-pages` (public read path). No hand-committed
  gh-pages branch.

## What this repo does NOT do

- Block any registry deploy. The catalogue ships independently. The
  scanner publishes findings the site can show; it never gates.
- Scan private repos. Catalogue source repos must be public.
- Upload files to any third-party scanner. ClamAV runs locally on the
  runner; SkillSpector runs locally on the runner. No files leave the
  runner unless the scanner explicitly opts in.

## Local configuration

These files may be gitignored, read manually if not auto-loaded.

@AGENTS.local.md
