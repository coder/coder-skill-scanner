import type { FC } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { sourceRepoUrl, truncSha } from "../../lib/format";
import { type SkillEntry, type Verdict } from "../../types/report";
import { VerdictPill } from "../VerdictPill/VerdictPill";
import { RiskBar } from "../RiskBar/RiskBar";

interface SkillTableProps {
  skills: SkillEntry[];
  detailLinkBase?: string;
  className?: string;
}

function verdictRank(v: Verdict): number {
  // Severity-descending: most-attention-needed at the top of the table.
  // Catalogue drift ("unknown") ranks above clean because "we don't know"
  // is more interesting than "we checked and it's fine".
  const ORDER: Verdict[] = ["malicious", "suspicious", "unknown", "clean"];
  const i = ORDER.indexOf(v);
  return i === -1 ? ORDER.length : i;
}

function sortSkills(skills: SkillEntry[]): SkillEntry[] {
  return skills.slice().sort((a, b) => {
    const cv = verdictRank(a.verdict) - verdictRank(b.verdict);
    if (cv !== 0) return cv;
    const ar = a.scanners?.skillspector?.risk_score ?? 0;
    const br = b.scanners?.skillspector?.risk_score ?? 0;
    if (br !== ar) return br - ar;
    return `${a.namespace}/${a.slug}`.localeCompare(`${b.namespace}/${b.slug}`);
  });
}

const SEVERITY_TONE: Record<string, string> = {
  critical: "text-verdict-malicious",
  high: "text-verdict-malicious",
  medium: "text-verdict-suspicious",
  low: "text-coder-neutral-300",
  info: "text-coder-neutral-500",
};

function severityClass(sev?: string): string {
  if (!sev) return "text-coder-neutral-500";
  return SEVERITY_TONE[sev.toLowerCase()] ?? "text-coder-neutral-400";
}

export const SkillTable: FC<SkillTableProps> = ({
  skills,
  detailLinkBase = "/skills",
  className,
}) => {
  const sorted = sortSkills(skills);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-coder-smoke bg-coder-cinder p-8 text-center text-sm text-coder-neutral-400">
        No skills in this report.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-coder-smoke bg-coder-cinder",
        className,
      )}
    >
      <table className="w-full text-sm">
        <thead className="border-b border-coder-smoke bg-coder-cinder text-[11px] uppercase tracking-wider text-coder-neutral-400">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Skill</th>
            <th className="px-4 py-3 text-left font-medium">Verdict</th>
            <th className="px-4 py-3 text-left font-medium">Risk</th>
            <th className="px-4 py-3 text-left font-medium">Severity</th>
            <th className="px-4 py-3 text-left font-medium">Findings</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">
              Source
            </th>
            <th className="px-4 py-3 text-right font-medium" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const ss = s.scanners?.skillspector ?? {};
            const risk = ss.risk_score ?? 0;
            const sev = ss.risk_severity ?? "info";
            const findCount = Object.values(
              ss.findings_by_severity ?? {},
            ).reduce((a, b) => a + b, 0);
            const srcHref = sourceRepoUrl(
              s.source_repo,
              s.source_sha,
              s.skill_path,
            );
            const detailHref = `${detailLinkBase}/${s.namespace}/${s.slug}`;
            return (
              <tr
                key={`${s.namespace}/${s.slug}`}
                className="border-t border-coder-smoke/60 transition-colors hover:bg-coder-smoke/30"
              >
                <td className="px-4 py-3">
                  <Link
                    to={detailHref}
                    className="font-medium text-coder-neutral-100 hover:text-coder-sky hover:underline"
                  >
                    {s.namespace}/{s.slug}
                  </Link>
                  {s.skill_path && (
                    <div className="font-mono text-[11px] text-coder-neutral-500">
                      {s.skill_path}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <VerdictPill verdict={s.verdict} />
                </td>
                <td className="px-4 py-3">
                  <RiskBar score={risk} verdict={s.verdict} />
                </td>
                <td className={cn("px-4 py-3 font-mono text-xs", severityClass(sev))}>
                  {sev}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {findCount === 0 ? (
                    <span className="text-coder-neutral-500">none</span>
                  ) : (
                    <span className="text-coder-neutral-200">{findCount}</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 font-mono text-xs md:table-cell">
                  <a
                    href={srcHref}
                    rel="noopener noreferrer"
                    className="text-coder-neutral-400 hover:text-coder-sky"
                  >
                    {s.source_repo}@{truncSha(s.source_sha) || s.source_ref}
                  </a>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={detailHref}
                    aria-label={`Open details for ${s.namespace}/${s.slug}`}
                    className="inline-flex size-7 items-center justify-center rounded-md text-coder-neutral-400 hover:bg-coder-smoke hover:text-coder-neutral-100"
                  >
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
