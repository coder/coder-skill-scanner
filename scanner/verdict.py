"""Per-skill verdict evaluation.

The verdict primitive in v1 is SkillSpector's ``risk_score`` (0-100). The
scanner is designed to grow more scanner inputs (gitleaks, Semgrep, etc.)
without changing this module's interface; a new scanner adds a branch
inside ``evaluate``. Thresholds live in ``config.yaml`` so policy is
data, reviewable in one place.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

VERDICT_CLEAN = "clean"
VERDICT_SUSPICIOUS = "suspicious"
VERDICT_MALICIOUS = "malicious"
VERDICT_UNKNOWN = "unknown"


@dataclass(frozen=True)
class Verdict:
    verdict: str
    reasons: list[str]


def evaluate(
    *,
    skillspector: dict[str, Any] | None,
    config: dict[str, Any],
    catalogue_drift: bool = False,
) -> Verdict:
    """Combine per-scanner outputs into a single verdict and reasons.

    ``skillspector`` is the parsed summary dict produced by
    ``combine.summarize_skillspector``. ``config`` is the loaded
    ``config.yaml``. ``catalogue_drift`` is True when the catalogue
    declared this skill slug but it does not exist upstream.

    The order is malicious > suspicious > unknown > clean. The first
    rule that fires wins.
    """
    if catalogue_drift:
        return Verdict(VERDICT_UNKNOWN, ["catalogue declared this slug but it is missing upstream"])

    if skillspector is None or skillspector.get("crashed") or skillspector.get("json_missing"):
        return Verdict(VERDICT_UNKNOWN, ["skillspector did not produce parseable output"])

    thresholds = config.get("verdict") or {}
    # Defaults match config.yaml. Keep these in sync with
    # docs/CALIBRATION.md and VerdictExplanation.tsx's defaults.
    malicious_at = int(thresholds.get("malicious_risk_score", 81))
    suspicious_at = int(thresholds.get("suspicious_risk_score", 51))

    risk = int(skillspector.get("risk_score", 0))

    if risk >= malicious_at:
        return Verdict(
            VERDICT_MALICIOUS,
            [f"skillspector risk_score={risk} >= malicious threshold {malicious_at}"],
        )
    if risk >= suspicious_at:
        return Verdict(
            VERDICT_SUSPICIOUS,
            [f"skillspector risk_score={risk} >= suspicious threshold {suspicious_at}"],
        )
    return Verdict(VERDICT_CLEAN, [])
