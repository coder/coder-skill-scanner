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

| Skill                  | SkillSpector score | Verdict     |
|------------------------|-------------------:|-------------|
| `coder/coder-modules`  | 0                  | `clean`     |
| `coder/coder-templates`| 0                  | `clean`     |
| `coder/modules`        | 0                  | `clean`     |
| `coder/templates`      | 10                 | `clean`     |
| `coder/setup`          | 100                | `malicious` |

The previous thresholds (40/75) produced the same outcome for these
five inputs. The change does not silence any signal that was firing
today; it raises the bar that future skills must clear before being
called out.

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
- We observe a real-world skill that lands in an obviously wrong
  bucket (false positive or false negative). Open a tracking issue,
  link it from this doc, and adjust with evidence in the next PR.
