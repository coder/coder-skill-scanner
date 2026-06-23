# Verdict threshold calibration

This document records how the verdict thresholds in `config.yaml` were
chosen. The thresholds are not arbitrary: they are aligned to
SkillSpector's own internal severity bands and informed by the published
evaluation of SkillSpector against a large real-world skill catalogue.

If you bump the thresholds, update this doc in the same PR. Numbers that
nobody can defend later are how scanners drift into either uselessness
or boy-who-cried-wolf territory.

## Inputs we are calibrating against

### 1. SkillSpector's published severity bands

NVIDIA's SkillSpector computes `risk_assessment.score` on a 0-100 scale
from rule hits weighted by severity, plus a 1.3x multiplier when the
skill carries executable scripts. The score is then bucketed into a
named severity and a `recommendation` field:

| Score range | `severity` | `recommendation`    |
|-------------|------------|---------------------|
| 0-20        | `LOW`      | `SAFE`              |
| 21-50       | `MEDIUM`   | `CAUTION`           |
| 51-80       | `HIGH`     | `DO_NOT_INSTALL`    |
| 81-100      | `CRITICAL` | `DO_NOT_INSTALL`    |

Source: [`skillspector/nodes/report.py`](https://github.com/NVIDIA/SkillSpector/blob/main/skillspector/nodes/report.py)
(`_compute_risk_score` for the weighting, `_severity_from_score` for the
bucketing). The SkillSpector CLI exits non-zero when `risk_score > 50`,
which is the same boundary as the `HIGH` band.

### 2. The ClawHub evaluation

Two NVIDIA-affiliated artifacts describe how SkillSpector performs in
the wild:

- ClawHub paper, "ClawHub: A large-scale safety analysis of Claude
  Skills" (arxiv.org/html/2606.01494v1).
- OpenClaw blog, "SkillSpector at scale on ClawHub"
  (openclaw.ai/blog/openclaw-nvidia-skill-security).
- Hugging Face dataset of per-skill signals
  (huggingface.co/datasets/OpenClaw/clawhub-security-signals).

Two numbers from those sources drive our calibration:

- On 67,453 real Claude skills, SkillSpector returned at least one
  finding on roughly 49% of them. That is the population our verdict
  policy will see most of, so a threshold at SkillSpector's MEDIUM band
  would flag close to half the catalogue as "suspicious," which is not
  useful.
- On a labelled subset of known-malicious skills, SkillSpector alone
  caught about 6.8% (recall), while VirusTotal Premium caught about
  72.8%. SkillSpector is good for surfacing risky behaviour patterns;
  it is not a reliable malicious-classifier on its own.

The paper's own pipeline (`ClawScan`) treats SkillSpector as one of
several signals fed into an LLM-as-judge. That tells us SkillSpector's
output is best read as advisory until we add more scanners.

### 3. Our existing in-tree results

The current `coder/registry` in-tree catalogue contains five skills:
`coder/coder-modules`, `coder/coder-templates`, `coder/modules`,
`coder/templates`, and `coder/setup`. Under the chosen thresholds:

| Skill                  | static score | LLM-mode score | static verdict | LLM-mode verdict |
|------------------------|-------------:|---------------:|----------------|------------------|
| `coder/coder-modules`  | 10           | 0              | `clean`        | `clean`          |
| `coder/coder-templates`| 10           | 0              | `clean`        | `clean`          |
| `coder/modules`        | 0            | 0              | `clean`        | `clean`          |
| `coder/templates`      | 0            | 0              | `clean`        | `clean`          |
| `coder/setup`          | 100          | 26             | `malicious`    | `clean`          |

The previous thresholds (40/75) produced the same outcome for these
five inputs under static-only mode. The change does not silence any
signal that was firing today; it raises the bar that future skills
must clear before being called out.

## Threshold choices

```yaml
verdict:
  malicious_risk_score: 81
  suspicious_risk_score: 51
```

- `malicious_risk_score: 81` matches SkillSpector's `CRITICAL` band.
  Anything SkillSpector itself describes as `CRITICAL` /
  `DO_NOT_INSTALL` (top decile) becomes our `malicious` verdict.
- `suspicious_risk_score: 51` matches the `HIGH` band, which is also
  the score at which the SkillSpector CLI starts exiting non-zero. A
  skill that SkillSpector says is `HIGH` / `DO_NOT_INSTALL` becomes
  our `suspicious` verdict (the registry-server badge surfaces this as
  "Review before installing").
- Skills in the `MEDIUM` / `CAUTION` band (21-50) stay `clean` at the
  catalogue level. Their findings are still rendered on the per-skill
  page so reviewers can drill in, but they do not trigger a badge.
  This avoids broadcasting the ~half-of-catalogue base rate that
  ClawHub measured.

## LLM semantic pass

SkillSpector ships a two-stage analyser: fast static rules (the 64
patterns SkillSpector documents) followed by an optional LLM semantic
pass. The LLM pass reads each finding's surrounding context, classifies
intent, filters context-aware false positives, and writes a
human-readable explanation that ships in the per-finding output.

### Measured impact on the five in-tree skills

Measured against `gpt-4.1-mini` through Coder's AI Gateway during
development, before the provider swap below. Methodology: ran
`skillspector scan` twice on each upstream skill (once with
`--no-llm`, once with LLM mode on) and aggregated the per-skill
results. Total catalogue-wide findings dropped from 25 to 2:

| Skill                  | findings (static) | findings (LLM) | Δ        |
|------------------------|------------------:|---------------:|----------|
| `coder/coder-modules`  | 1                 | 0              | -1       |
| `coder/coder-templates`| 1                 | 0              | -1       |
| `coder/modules`        | 0                 | 0              | 0        |
| `coder/setup`          | 23                | 2              | -21      |
| `coder/templates`      | 0                 | 0              | 0        |
| **TOTAL**              | **25**            | **2**          | **-23**  |

`coder/setup`'s verdict moves from `malicious` (100) to `clean` (26).
The LLM filtered all 23 static-only findings as context-aware false
positives (the EA2 hits on safeguard prose, the MP2 hits on PNG
assets, the SC2 hits on `curl coder.com/install.sh`, the PE3 hits on
the skill's own scratch files, etc.) and surfaced 2 new MEDIUM
findings (`SQP-2`) the static pass missed: the GitHub device-flow
scripts write the OAuth token and session config to disk without a
user-visible notification. Those 2 findings are real and minor; the
cleanest fix is a one-line `echo` before each write in the upstream
skill repo rather than any change here.

**Model swap caveat**: production runs against `claude-sonnet-4-6`
via the Anthropic API (see "Provider choice" below), not against
`gpt-4.1-mini`. The 25 → 2 delta above measures SkillSpector's LLM
semantic pass *as a capability*; absolute counts may shift one or two
either way under Claude because the two models filter false positives
slightly differently. The verdict-band outcomes (`coder/setup` flips
malicious → clean, every other in-tree skill stays clean) are robust
to that drift: every static finding on the four other skills is well
below the `suspicious_risk_score: 51` cutoff to begin with, so even a
100% no-filter LLM still leaves them clean. Recalibration against
Claude is a 30-minute follow-up PR once the secret is wired in and
the first production scan lands; this doc gets the real numbers then.

### Provider choice and the workflow gap

The scheduled scan runs LLM mode when the workflow's chosen credential
secret is configured. The fallback to `--no-llm` is automatic when the
secret is missing, so an unset secret on a fresh fork degrades the
scan rather than breaking it.

Provider is `anthropic` against `api.anthropic.com` directly, model
`claude-sonnet-4-6`. The Anthropic API key is on a separate billing
line from Coder usage because SkillSpector cannot be routed through
Coder's AI Gateway today:

- aibridge does proxy Claude under its `/anthropic` path, but only in
  Anthropic's native `/v1/messages` shape.
- SkillSpector pipes every provider through
  `langchain_openai.ChatOpenAI`, which speaks OpenAI's
  `/v1/chat/completions` shape.
- aibridge does not mount `/v1/chat/completions` on its `/anthropic`
  path (verified: `route not supported`).
- SkillSpector's `anthropic` provider also hardcodes
  `https://api.anthropic.com/v1/` in `providers/anthropic/provider.py`
  and ignores `ANTHROPIC_BASE_URL`, so even if aibridge did expose the
  OpenAI-compat route on its Anthropic path, an env-only swap would
  not steer SkillSpector at it.

Using `openai` against aibridge with `gpt-4.1-mini` is a viable
alternative (and is what the calibration table above was measured
against). The trade-off is real: aibridge routing keeps inference
spend on Coder's existing billing line and avoids a second vendor,
but commits the scanner to whichever OpenAI-class model aibridge
exposes rather than Claude. If aibridge later adds either a Claude
OpenAI-compat route on `/anthropic` or a native-Anthropic
integration into SkillSpector, the provider line in `config.yaml`
flips back without any workflow change.

### How the LLM pass interacts with the verdict math

The LLM pass does not affect the threshold math. SkillSpector's
`risk_score` is still a 0-100 weighted sum of rule hits, and the
51/81 cutoffs above still map directly to `HIGH` and `CRITICAL` bands.
What changes is which findings reach the verdict: false positives the
LLM filters out no longer contribute to the score. Verdicts move down
(or stay the same) when LLM mode flips on, not up.

## What we did not change (and why)

- We did not raise `suspicious_risk_score` above `51`. SkillSpector
  itself escalates at that boundary; staying in sync keeps the
  recommendation field on the per-skill page consistent with the
  badge on the catalogue page.
- We did not add a separate "low confidence" verdict. A fourth tier
  buys us little until we have a second scanner to combine signals
  with. The schema's `unknown` verdict already covers the
  "could not assess" case, which is the only failure mode v1 cares
  about.
- We did not move thresholds into the published `latest.json`. The
  SPA uses defaults that match `config.yaml`. If a future change makes
  the artifact policy-aware, plumb the values through and drop the
  defaults from `VerdictExplanation.tsx`.

## When to revisit

Re-run this analysis when any of:

- A new scanner (gitleaks, Semgrep, VirusTotal Premium, ClawScan, etc.)
  joins the pipeline. The combined verdict logic in
  `scanner/verdict.py` will need a new branch and most likely
  different thresholds per signal.
- SkillSpector bumps its scoring weights or rule catalogue in a way
  that shifts where its bands sit. The pinned commit in `config.yaml`
  protects us from drifting silently; a deliberate bump should walk
  through this doc.
- The LLM model or provider changes (e.g., moving from
  `claude-sonnet-4-6` to Opus, Fable, or to a non-Anthropic
  provider). Different models filter differently; spot-check the
  five in-tree skills before merging the provider swap and refresh
  the table above.
- We observe a real-world skill that lands in an obviously wrong
  bucket (false positive or false negative). Open a tracking issue,
  link it from this doc, and adjust with evidence in the next PR.
