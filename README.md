# coder-skill-scanner

Periodic, GitHub-Actions-as-SaaS security scanner for agent skills declared
in the [Coder registry](https://github.com/coder/registry) catalogue.

Every 6 hours, this repo's scheduled workflow:

1. Enumerates every skill declared in `coder/registry`.
2. Shallow-clones each source repo.
3. Runs [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector)
   (agentic risk, static mode) and [ClamAV](https://www.clamav.net)
   (malware signatures) over the upstream content.
4. Builds a per-skill verdict (`clean`, `suspicious`, `malicious`,
   `unknown`) from the scanner outputs and the policy in `config.yaml`.
5. Publishes a versioned report as a GitHub Release asset and a public
   `latest.json` to GitHub Pages.

The registry site reads the public report through a small proxy endpoint
in `coder/registry-server` and shows a per-skill scan badge. The
registry's deploys are not gated on the scan result; this is visibility,
not enforcement.

## Reading the latest report

Stable URLs (no auth required):

- Public JSON (CDN-cached):
  `https://coder.github.io/coder-skill-scanner/latest.json`
- Tagged Release:
  `https://github.com/coder/coder-skill-scanner/releases/latest/download/latest.json`
- Per-scan history:
  `https://coder.github.io/coder-skill-scanner/history/<date>/<time>.json`

The schema is defined in `schema/report.schema.json` and versioned.

## Repository layout

```text
.
|-- .github/
|   |-- workflows/
|   |   `-- ci.yaml            # lint scripts + validate config + validate schema
|   `-- ISSUE_TEMPLATE/
|       `-- scanner-down.md
|-- README.md
|-- LICENSE                    # Apache-2.0
|-- AGENTS.md                  # contributor + agent conventions
|-- config.yaml                # catalogue source, scanners, verdict policy
|-- schema/
|   `-- report.schema.json     # JSON Schema for latest.json
|-- scripts/                   # populated in subsequent PRs
`-- testdata/                  # fixtures for self-test
```

The scanner workflow itself (`scan.yaml`) is added in a follow-up PR; this
initial commit is the contract and tooling skeleton.

## Forking for your own catalogue

This scanner is data-driven. To run it against a different registry:

1. Fork `coder/coder-skill-scanner`.
2. Edit `config.yaml` to point at your catalogue and pin the scanner
   versions you want.
3. Configure GitHub Pages on your fork.
4. Enable Actions.

No source changes required for catalogue changes.

## Status

Bootstrap. The scanner workflow lands in PR 2 (SkillSpector path), PR 3
(ClamAV path), PR 4 (Pages + history pruner), PR 5 (external-sources
catalogue format once `coder/registry-server#442` ships).

## License

Apache-2.0. See [LICENSE](./LICENSE).
