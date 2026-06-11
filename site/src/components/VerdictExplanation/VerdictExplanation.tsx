import { type FC, useMemo } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  HelpCircleIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { SKILLSPECTOR_RULES } from "../../lib/skillspectorRules.generated";
import type { FindingByRule, SkillEntry, Verdict } from "../../types/report";

interface VerdictExplanationProps {
  skill: SkillEntry;
  malicious_at?: number;
  suspicious_at?: number;
  className?: string;
}

interface CategoryGroup {
  category: string;
  totalCount: number;
  rules: { id: string; severity: string; count: number; description: string }[];
}

function groupByCategory(findings: FindingByRule[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>();
  for (const f of findings) {
    const rule = SKILLSPECTOR_RULES[f.id];
    const category = rule?.category || "Other";
    let slot = map.get(category);
    if (!slot) {
      slot = { category, totalCount: 0, rules: [] };
      map.set(category, slot);
    }
    slot.totalCount += f.count;
    slot.rules.push({
      id: f.id,
      severity: f.severity,
      count: f.count,
      description: rule?.description ?? "",
    });
  }
  return Array.from(map.values())
    .map((group) => ({
      ...group,
      rules: group.rules.sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
}

const VERDICT_TONE: Record<
  Verdict,
  {
    icon: typeof ShieldAlertIcon;
    chipClass: string;
    label: string;
    /** One-sentence narrative, no data restated. The Risk score panel
     *  directly above the Reasons section already shows the score,
     *  severity, and recommendation; this chip should interpret, not
     *  restate. */
    summary: string;
  }
> = {
  clean: {
    icon: CheckCircle2Icon,
    chipClass: "bg-verdict-clean-bg text-verdict-clean",
    label: "Clean",
    summary: "SkillSpector found nothing here that needs human follow-up.",
  },
  suspicious: {
    icon: AlertTriangleIcon,
    chipClass: "bg-verdict-suspicious-bg text-verdict-suspicious",
    label: "Suspicious",
    summary:
      "SkillSpector flagged behaviors that warrant human review before installing.",
  },
  malicious: {
    icon: ShieldAlertIcon,
    chipClass: "bg-verdict-malicious-bg text-verdict-malicious",
    label: "Malicious",
    summary:
      "SkillSpector flagged enough high-severity behaviors that this skill should not be installed.",
  },
  unknown: {
    icon: HelpCircleIcon,
    chipClass: "bg-verdict-unknown-bg text-verdict-unknown",
    label: "Unknown",
    summary: "SkillSpector did not produce a usable result for this skill.",
  },
};

function thresholdSentence(
  verdict: Verdict,
  risk: number,
  malicious_at: number,
  suspicious_at: number,
): string | null {
  if (verdict === "malicious") {
    return `Score ${risk}/100 is at or above the malicious threshold of ${malicious_at}.`;
  }
  if (verdict === "suspicious") {
    return `Score ${risk}/100 sits in the suspicious band (${suspicious_at} to ${malicious_at - 1}); the malicious cutoff is ${malicious_at}.`;
  }
  if (verdict === "clean") {
    return `Score ${risk}/100 is below the suspicious cutoff of ${suspicious_at}.`;
  }
  return null;
}

export const VerdictExplanation: FC<VerdictExplanationProps> = ({
  skill,
  // Defaults match config.yaml and scanner/verdict.py. They are also
  // SkillSpector's own HIGH and CRITICAL band edges; see
  // docs/CALIBRATION.md for the calibration write-up.
  malicious_at = 81,
  suspicious_at = 51,
  className,
}) => {
  const ss = skill.scanners?.skillspector ?? {};
  const tone = VERDICT_TONE[skill.verdict];
  const Icon = tone.icon;

  const risk = ss.risk_score ?? 0;

  const categories = useMemo(
    () => groupByCategory(ss.findings_by_rule ?? []),
    [ss.findings_by_rule],
  );
  const totalFindings = categories.reduce((sum, c) => sum + c.totalCount, 0);

  const threshold = thresholdSentence(
    skill.verdict,
    risk,
    malicious_at,
    suspicious_at,
  );

  // The machine-shaped reason strings from scanner/verdict.py are the
  // ground truth for the verdict decision. Tucked into a disclosure so
  // they stay reachable for debugging without competing with the prose.
  const machineReasons = skill.reasons ?? [];

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "flex items-start gap-3 rounded-md border border-coder-smoke/70 p-3",
          tone.chipClass,
        )}
      >
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="text-sm leading-relaxed">
          <span className="font-medium">{tone.label}.</span>{" "}
          <span className="text-coder-neutral-200">{tone.summary}</span>
        </p>
      </div>

      {threshold && (
        <p className="text-sm text-coder-neutral-300">{threshold}</p>
      )}

      {categories.length === 0 && skill.verdict === "clean" && (
        <p className="text-sm text-coder-neutral-400">
          SkillSpector returned no flagged findings. The skill still ships
          with whatever capabilities its source repository declares;
          installing it remains a trust decision.
        </p>
      )}

      {categories.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-2 text-[11px] font-medium uppercase tracking-wider text-coder-neutral-400">
            <span>What SkillSpector found</span>
            <span className="font-mono normal-case tracking-normal text-coder-neutral-500">
              {"\u00b7"} {totalFindings}{" "}
              {totalFindings === 1 ? "finding" : "findings"} across{" "}
              {categories.length}{" "}
              {categories.length === 1 ? "category" : "categories"}
            </span>
          </div>
          <ul className="space-y-4">
            {categories.map((cat) => (
              <li key={cat.category}>
                <div className="flex items-baseline justify-between gap-3 border-b border-coder-smoke/60 pb-1">
                  <h4 className="text-sm font-medium text-coder-neutral-100">
                    {cat.category}
                  </h4>
                  <span className="font-mono text-xs tabular-nums text-coder-neutral-500">
                    {cat.totalCount}
                  </span>
                </div>
                <ul className="mt-2 space-y-2.5">
                  {cat.rules.map((rule) => (
                    <li key={rule.id} className="space-y-0.5">
                      <div className="flex items-baseline gap-2 text-xs">
                        <span className="font-mono font-medium text-coder-neutral-100">
                          {rule.id}
                        </span>
                        <span className="font-mono text-coder-neutral-500">
                          {"\u00b7"} {rule.count}{" "}
                          {rule.count === 1 ? "hit" : "hits"}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-coder-neutral-300">
                        {rule.description || (
                          <span className="text-coder-neutral-500">
                            (no description in the bundled rule catalogue)
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {machineReasons.length > 0 && (
        <details className="text-xs text-coder-neutral-500">
          <summary className="cursor-pointer select-none text-coder-neutral-400 hover:text-coder-neutral-200">
            Verdict trigger ({machineReasons.length})
          </summary>
          <ul className="mt-2 space-y-1 font-mono">
            {machineReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};
