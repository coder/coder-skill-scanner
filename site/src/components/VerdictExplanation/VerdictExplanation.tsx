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

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;
type SeverityKey = (typeof SEVERITY_ORDER)[number];

interface RuleItem {
  id: string;
  severity: SeverityKey;
  count: number;
  description: string;
}

interface CategoryGroup {
  category: string;
  /** Total `count` across rules in the category. */
  totalCount: number;
  /** Highest severity present; drives the card's accent color. */
  maxSeverity: SeverityKey;
  /** Tally per severity, used for the right-side summary on the card. */
  bySeverity: Record<SeverityKey, number>;
  rules: RuleItem[];
}

const SEVERITY_TONE: Record<
  SeverityKey,
  {
    /** Used for the colored left-side accent strip on the card. */
    accent: string;
    /** Severity word color in the rule header. */
    text: string;
    /** Filled dot before the rule ID. */
    dot: string;
  }
> = {
  critical: {
    accent: "bg-verdict-malicious",
    text: "text-verdict-malicious",
    dot: "bg-verdict-malicious",
  },
  high: {
    accent: "bg-verdict-malicious",
    text: "text-verdict-malicious",
    dot: "bg-verdict-malicious",
  },
  medium: {
    accent: "bg-verdict-suspicious",
    text: "text-verdict-suspicious",
    dot: "bg-verdict-suspicious",
  },
  low: {
    accent: "bg-coder-neutral-500",
    text: "text-coder-neutral-300",
    dot: "bg-coder-neutral-500",
  },
  info: {
    accent: "bg-coder-neutral-600",
    text: "text-coder-neutral-400",
    dot: "bg-coder-neutral-600",
  },
};

function severityKey(sev?: string): SeverityKey {
  const s = (sev ?? "info").toLowerCase();
  return (SEVERITY_ORDER as readonly string[]).includes(s)
    ? (s as SeverityKey)
    : "info";
}

function severityRank(s: SeverityKey): number {
  // Lower index = more severe. Mirror SEVERITY_ORDER so sort key is
  // monotonically ascending for severity-desc ordering.
  return SEVERITY_ORDER.indexOf(s);
}

function groupByCategory(findings: FindingByRule[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>();
  for (const f of findings) {
    const rule = SKILLSPECTOR_RULES[f.id];
    const category = rule?.category || "Other";
    let slot = map.get(category);
    if (!slot) {
      slot = {
        category,
        totalCount: 0,
        maxSeverity: "info",
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        rules: [],
      };
      map.set(category, slot);
    }
    const sev = severityKey(f.severity);
    slot.totalCount += f.count;
    slot.bySeverity[sev] += f.count;
    if (severityRank(sev) < severityRank(slot.maxSeverity)) {
      slot.maxSeverity = sev;
    }
    slot.rules.push({
      id: f.id,
      severity: sev,
      count: f.count,
      description: rule?.description ?? "",
    });
  }
  for (const group of map.values()) {
    // Within a category, lead with the most severe rules; break ties by
    // hit count so a louder rule edges out a quieter one at the same
    // severity. Falls back to alphabetical ID for full determinism.
    group.rules.sort((a, b) => {
      const sev = severityRank(a.severity) - severityRank(b.severity);
      if (sev !== 0) return sev;
      if (a.count !== b.count) return b.count - a.count;
      return a.id.localeCompare(b.id);
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    // Categories ordered by max severity, then by total count desc so
    // the worst clusters lead.
    const sev = severityRank(a.maxSeverity) - severityRank(b.maxSeverity);
    if (sev !== 0) return sev;
    return b.totalCount - a.totalCount;
  });
}

const VERDICT_TONE: Record<
  Verdict,
  {
    icon: typeof ShieldAlertIcon;
    chipClass: string;
    label: string;
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

function slugifyCategory(name: string): string {
  return `cat-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

interface SeverityBadgesProps {
  counts: Record<SeverityKey, number>;
}

const SeverityBadges: FC<SeverityBadgesProps> = ({ counts }) => {
  const present = SEVERITY_ORDER.filter((s) => counts[s] > 0);
  if (present.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-wider">
      {present.map((sev) => (
        <span
          key={sev}
          className={cn("inline-flex items-center gap-1", SEVERITY_TONE[sev].text)}
        >
          <span
            aria-hidden
            className={cn("size-1.5 rounded-full", SEVERITY_TONE[sev].dot)}
          />
          {counts[sev]} {sev}
        </span>
      ))}
    </div>
  );
};

interface JumpBarProps {
  categories: CategoryGroup[];
}

const JumpBar: FC<JumpBarProps> = ({ categories }) => (
  <nav
    aria-label="Findings by category"
    className="-mx-1 mb-3 flex flex-wrap gap-1 text-xs"
  >
    {categories.map((cat) => (
      <a
        key={cat.category}
        href={`#${slugifyCategory(cat.category)}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-coder-smoke bg-coder-cinder px-2.5 py-1 text-coder-neutral-300 transition-colors hover:border-coder-smoke-lighter hover:bg-coder-smoke/40 hover:text-coder-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coder-sky focus-visible:ring-offset-1 focus-visible:ring-offset-coder-cinder"
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            SEVERITY_TONE[cat.maxSeverity].dot,
          )}
        />
        <span>{cat.category}</span>
        <span className="font-mono text-coder-neutral-500">
          {cat.totalCount}
        </span>
      </a>
    ))}
  </nav>
);

interface CategoryCardProps {
  group: CategoryGroup;
}

const CategoryCard: FC<CategoryCardProps> = ({ group }) => {
  const accent = SEVERITY_TONE[group.maxSeverity];
  return (
    <article
      id={slugifyCategory(group.category)}
      className="mb-3 break-inside-avoid overflow-hidden rounded-md border border-coder-smoke bg-coder-cinder/60"
    >
      <header className="flex items-stretch">
        <span
          aria-hidden
          className={cn("w-1 shrink-0", accent.accent)}
        />
        <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2.5">
          <h4 className="text-sm font-semibold text-coder-neutral-100">
            {group.category}
          </h4>
          <SeverityBadges counts={group.bySeverity} />
        </div>
      </header>
      <ul className="divide-y divide-coder-smoke/40">
        {group.rules.map((rule) => {
          const tone = SEVERITY_TONE[rule.severity];
          return (
            <li key={rule.id} className="space-y-1 px-3 py-2.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
                <span
                  aria-hidden
                  className={cn(
                    "mb-px size-1.5 rounded-full self-center",
                    tone.dot,
                  )}
                />
                <span className="font-mono font-medium text-coder-neutral-100">
                  {rule.id}
                </span>
                <span
                  className={cn(
                    "font-mono uppercase tracking-wide",
                    tone.text,
                  )}
                >
                  {rule.severity}
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
          );
        })}
      </ul>
    </article>
  );
};

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

          {/* Show the jump bar once the list runs long enough that a
              user might want to navigate to a specific area instead of
              scrolling top-to-bottom. */}
          {categories.length >= 4 && <JumpBar categories={categories} />}

          {/* CSS multi-column layout: at md+ widths the cards flow into
              two columns and `break-inside-avoid` keeps each category
              card together. This collapses the previous tall list to
              roughly half its height without losing any information. */}
          <div className="md:columns-2 md:gap-4">
            {categories.map((cat) => (
              <CategoryCard key={cat.category} group={cat} />
            ))}
          </div>
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
