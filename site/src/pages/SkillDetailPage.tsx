import { type FC, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  FileTextIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { ErrorState, LoadingState } from "../components/State/State";
import { MetaStrip } from "../components/MetaStrip/MetaStrip";
import { RiskBar } from "../components/RiskBar/RiskBar";
import { Sparkline } from "../components/Sparkline/Sparkline";
import { VerdictPill } from "../components/VerdictPill/VerdictPill";
import {
  useHistoryIndex,
  useLatestReport,
} from "../lib/query";
import { sourceRepoUrl, truncSha } from "../lib/format";
import type { SkillEntry } from "../types/report";
import { useHistorySparkline } from "../lib/useHistorySparkline";

interface Section {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const Section: FC<Section> = ({ title, children, icon }) => (
  <section className="rounded-lg border border-coder-smoke bg-coder-cinder">
    <header className="flex items-center gap-2 border-b border-coder-smoke px-4 py-2.5 text-xs uppercase tracking-wider text-coder-neutral-400">
      {icon}
      <span className="font-medium">{title}</span>
    </header>
    <div className="px-4 py-3 text-sm text-coder-neutral-200">{children}</div>
  </section>
);

function findSkill(
  skills: SkillEntry[] | undefined,
  namespace: string,
  slug: string,
): SkillEntry | undefined {
  return skills?.find((s) => s.namespace === namespace && s.slug === slug);
}

export const SkillDetailPage: FC = () => {
  const params = useParams<{ namespace: string; slug: string }>();
  const namespace = params.namespace ?? "";
  const slug = params.slug ?? "";
  const fullName = `${namespace}/${slug}`;

  const latest = useLatestReport();
  const historyIndex = useHistoryIndex();

  const sparklinePoints = useHistorySparkline(
    historyIndex.data,
    namespace,
    slug,
  );

  const skill = useMemo(
    () => findSkill(latest.data?.skills, namespace, slug),
    [latest.data, namespace, slug],
  );

  if (latest.isLoading) return <LoadingState />;
  if (latest.error || !latest.data) {
    return <ErrorState error={latest.error} />;
  }

  if (!skill) {
    return (
      <div className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-coder-neutral-400 hover:text-coder-sky"
        >
          <ArrowLeftIcon className="size-3.5" /> All skills
        </Link>
        <div className="rounded-lg border border-coder-smoke bg-coder-cinder p-8 text-center text-sm text-coder-neutral-300">
          No skill named{" "}
          <span className="font-mono text-coder-neutral-100">{fullName}</span>{" "}
          in this run.
        </div>
      </div>
    );
  }

  const ss = skill.scanners?.skillspector ?? {};
  const findingsBySev = ss.findings_by_severity ?? {};
  const findingsByRule = ss.findings_by_rule ?? [];
  const totalFindings = Object.values(findingsBySev).reduce(
    (a, b) => a + b,
    0,
  );
  const srcHref = sourceRepoUrl(
    skill.source_repo,
    skill.source_ref,
    skill.skill_path,
  );
  const reasons = skill.reasons ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-coder-neutral-400 hover:text-coder-sky"
        >
          <ArrowLeftIcon className="size-3.5" /> All skills
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-coder-neutral-100">
            {fullName}
          </h1>
          <VerdictPill verdict={skill.verdict} size="lg" />
        </div>
        {skill.skill_path && (
          <div className="mt-1 font-mono text-xs text-coder-neutral-500">
            {skill.skill_path}
          </div>
        )}
      </div>

      <MetaStrip report={latest.data} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-coder-smoke bg-coder-cinder p-4 md:col-span-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-coder-neutral-400">
            Risk score
          </div>
          <div className="mt-2 flex items-center gap-4">
            <RiskBar
              score={ss.risk_score ?? 0}
              verdict={skill.verdict}
              size="md"
              showLabel={false}
            />
            <span className="font-mono text-3xl font-semibold tabular-nums text-coder-neutral-100">
              {ss.risk_score ?? 0}
            </span>
            <span className="font-mono text-xs text-coder-neutral-400">
              severity: {ss.risk_severity ?? "info"}
            </span>
          </div>
          {ss.risk_recommendation && (
            <div className="mt-3 text-xs text-coder-neutral-400">
              recommendation:{" "}
              <span className="font-mono text-coder-neutral-200">
                {ss.risk_recommendation}
              </span>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-coder-smoke bg-coder-cinder p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-coder-neutral-400">
            Score over time
          </div>
          <div className="mt-2 flex items-center gap-3">
            <Sparkline points={sparklinePoints} />
          </div>
          <div className="mt-2 text-xs text-coder-neutral-500">
            {sparklinePoints.length === 0
              ? "history will populate after a few scheduled runs"
              : `last ${sparklinePoints.length} runs`}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section
          title="Reasons"
          icon={<ShieldAlertIcon className="size-3.5" />}
        >
          {reasons.length === 0 ? (
            <div className="text-xs text-coder-neutral-500">
              No flagged reasons.
            </div>
          ) : (
            <ul className="space-y-1 text-sm">
              {reasons.map((r, i) => (
                <li key={i} className="text-coder-neutral-200">
                  {r}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Source">
          <div className="space-y-1.5 font-mono text-xs text-coder-neutral-300">
            <div>
              <span className="text-coder-neutral-500">repo: </span>
              <a
                href={`https://github.com/${skill.source_repo}`}
                className="text-coder-sky hover:underline"
              >
                {skill.source_repo}
              </a>
            </div>
            <div>
              <span className="text-coder-neutral-500">ref: </span>
              {skill.source_ref}
            </div>
            {skill.source_sha && (
              <div>
                <span className="text-coder-neutral-500">sha: </span>
                {truncSha(skill.source_sha)}
              </div>
            )}
            <div className="pt-1">
              <a
                href={srcHref}
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-coder-sky hover:underline"
              >
                Open at this commit <ExternalLinkIcon className="size-3" />
              </a>
            </div>
          </div>
        </Section>

        <Section title="Findings by severity">
          {Object.keys(findingsBySev).length === 0 ? (
            <div className="text-xs text-coder-neutral-500">
              No findings reported.
            </div>
          ) : (
            <ul className="space-y-1 font-mono text-xs">
              {Object.entries(findingsBySev)
                .sort()
                .map(([k, v]) => (
                  <li
                    key={k}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-coder-neutral-200">{k}</span>
                    <span className="tabular-nums text-coder-neutral-400">
                      {v}
                    </span>
                  </li>
                ))}
              <li className="mt-1 flex items-center justify-between border-t border-coder-smoke pt-1 text-coder-neutral-400">
                <span>total</span>
                <span className="tabular-nums">{totalFindings}</span>
              </li>
            </ul>
          )}
        </Section>

        <Section title="Findings by rule">
          {findingsByRule.length === 0 ? (
            <div className="text-xs text-coder-neutral-500">
              No rules triggered.
            </div>
          ) : (
            <ul className="space-y-1 font-mono text-xs">
              {findingsByRule.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-coder-neutral-200">{f.id}</span>
                  <span className="text-coder-neutral-400">
                    {f.severity} &times; {f.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {(skill.artifacts?.skillspector_json ||
          skill.artifacts?.skillspector_sarif) && (
          <Section
            title="Raw scanner artifacts"
            icon={<FileTextIcon className="size-3.5" />}
          >
            <ul className="space-y-1 font-mono text-xs">
              {skill.artifacts?.skillspector_json && (
                <li>
                  <span className="text-coder-neutral-500">JSON: </span>
                  <span className="text-coder-neutral-200">
                    {skill.artifacts.skillspector_json}
                  </span>
                </li>
              )}
              {skill.artifacts?.skillspector_sarif && (
                <li>
                  <span className="text-coder-neutral-500">SARIF: </span>
                  <span className="text-coder-neutral-200">
                    {skill.artifacts.skillspector_sarif}
                  </span>
                </li>
              )}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
};
