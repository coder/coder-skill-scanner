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
  { icon: typeof ShieldAlertIcon; chipClass: string; text: string }
> = {
  clean: {
    icon: CheckCircle2Icon,
    chipClass: "bg-verdict-clean-bg text-verdict-clean",
    text: "passed every scanner without flagged findings",
  },
  suspicious: {
    icon: AlertTriangleIcon,
    chipClass: "bg-verdict-suspicious-bg text-verdict-suspicious",
    text: "needs human review",
  },
  malicious: {
    icon: ShieldAlertIcon,
    chipClass: "bg-verdict-malicious-bg text-verdict-malicious",
    text: "should not be installed",
  },
  unknown: {
    icon: HelpCircleIcon,
    chipClass: "bg-verdict-unknown-bg text-verdict-unknown",
    text: "could not be assessed in this run",
  },
};

function formatRecommendation(raw: string | undefined): string {
  if (!raw) return "";
  // SkillSpector emits values like "DO_NOT_INSTALL", "SAFE", "REVIEW".
  return raw.replace(/_/g, " ").toLowerCase();
}

function thresholdSentence(
  verdict: Verdict,
  risk: number,
  malicious_at: number,
  suspicious_at: number,
): string | null {
  if (verdict === "malicious") {
    return `Risk score ${risk} is at or above the malicious threshold (${malicious_at}).`;
  }
  if (verdict === "suspicious") {
    return `Risk score ${risk} is at or above the suspicious threshold (${suspicious_at}), but below the malicious cutoff (${malicious_at}).`;
  }
  if (verdict === "clean") {
    return `Risk score ${risk} is below the suspicious cutoff (${suspicious_at}).`;
  }
  return null;
}

export const VerdictExplanation: FC<VerdictExplanationProps> = ({
  skill,
  malicious_at = 75,
  suspicious_at = 40,
  className,
}) => {
  const ss = skill.scanners?.skillspector ?? {};
  const tone = VERDICT_TONE[skill.verdict];
  const Icon = tone.icon;

  const risk = ss.risk_score ?? 0;
  const severity = ss.risk_severity ?? "info";
  const recommendation = formatRecommendation(ss.risk_recommendation);

  const categories = useMemo(
    () => groupByCategory(ss.findings_by_rule ?? []),
    [ss.findings_by_rule],
  );
  const totalFindings = categories.reduce(
    (sum, c) => sum + c.totalCount,
    0,
  );

  const headline = thresholdSentence(
    skill.verdict,
    risk,
    malicious_at,
    suspicious_at,
  );

  // The reasons array from the scanner is short and machine-shaped. We show
  // it under "Verdict triggers" so the source of truth stays visible but the
  // narrative leads.
  const machineReasons = skill.reasons ?? [];

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "flex items-start gap-3 rounded-md border border-coder-smoke/70 p-3",
          tone.chipClass,
        )}
      >
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="text-sm leading-relaxed">
          <span className="font-medium capitalize">{skill.verdict}.</span>{" "}
          <span className="text-coder-neutral-200">
            SkillSpector scored this skill {risk} (
            <span className="font-mono">{severity}</span>) and says it{" "}
            {tone.text}.
            {recommendation && (
              <>
                {" "}
                Its recommendation is{" "}
                <span className="font-mono text-coder-neutral-100">
                  {recommendation}
                </span>
                .
              </>
            )}
          </span>
        </div>
      </div>

      {headline && (
        <p className="text-sm text-coder-neutral-300">{headline}</p>
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
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-coder-neutral-400">
            What SkillSpector found
            <span className="ml-1.5 font-mono normal-case tracking-normal text-coder-neutral-500">
              ({totalFindings} {totalFindings === 1 ? "finding" : "findings"} across{" "}
              {categories.length}{" "}
              {categories.length === 1 ? "category" : "categories"})
            </span>
          </div>
          <ul className="space-y-3">
            {categories.map((cat) => (
              <li key={cat.category}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-sm font-medium text-coder-neutral-100">
                    {cat.category}
                  </div>
                  <div className="font-mono text-xs text-coder-neutral-500">
                    {cat.totalCount}{" "}
                    {cat.totalCount === 1 ? "finding" : "findings"}
                  </div>
                </div>
                <ul className="mt-1 space-y-1.5">
                  {cat.rules.map((rule) => (
                    <li
                      key={rule.id}
                      className="text-xs leading-relaxed text-coder-neutral-300"
                    >
                      <span className="font-mono font-medium text-coder-neutral-100">
                        {rule.id}
                      </span>{" "}
                      <span className="font-mono text-coder-neutral-500">
                        &times;{rule.count}
                      </span>{" "}
                      {rule.description ? (
                        rule.description
                      ) : (
                        <span className="text-coder-neutral-500">
                          (no description in the bundled catalogue)
                        </span>
                      )}
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
