import type { FC } from "react";
import { ErrorState, LoadingState } from "../components/State/State";
import { KPI } from "../components/KPI/KPI";
import { MetaStrip } from "../components/MetaStrip/MetaStrip";
import { SkillTable } from "../components/SkillTable/SkillTable";
import { useLatestReport } from "../lib/query";
import { usePageTitle } from "../lib/usePageTitle";
import { type Verdict, type VerdictCounts, VERDICTS } from "../types/report";

const VERDICT_HINTS: Record<Verdict, string> = {
  clean: "passed every scanner",
  suspicious: "flagged, review",
  malicious: "do not install",
  unknown: "scanner could not decide",
};

function counts(input: Partial<VerdictCounts> | undefined): VerdictCounts {
  return {
    clean: input?.clean ?? 0,
    suspicious: input?.suspicious ?? 0,
    malicious: input?.malicious ?? 0,
    unknown: input?.unknown ?? 0,
  };
}

export const OverviewPage: FC = () => {
  const { data, isLoading, error } = useLatestReport();

  usePageTitle();

  if (isLoading) return <LoadingState />;
  if (error || !data) {
    return (
      <ErrorState error={error}>
        <div className="mt-2 text-xs text-coder-neutral-400">
          Try fetching the{" "}
          <a
            className="text-coder-sky hover:underline"
            href={`${import.meta.env.BASE_URL}latest.json`}
          >
            raw JSON report
          </a>{" "}
          directly.
        </div>
      </ErrorState>
    );
  }

  const v = counts(data.summary?.verdicts);
  const total = data.summary?.total_skills ?? data.skills?.length ?? 0;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-coder-neutral-100">
          Skill scan results
        </h1>
        <p className="max-w-2xl text-sm text-coder-neutral-400">
          Verdicts and risk scores for every skill published in the Coder
          registry. Re-scanned every 6 hours. Open data, reproducible from{" "}
          <a
            className="text-coder-sky hover:underline"
            href="https://github.com/coder/coder-skill-scanner"
            rel="noopener noreferrer"
          >
            this repo
          </a>
          .
        </p>
      </div>

      <MetaStrip report={data} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {VERDICTS.map((name) => (
          <KPI
            key={name}
            label={name}
            value={v[name]}
            verdict={name}
            hint={VERDICT_HINTS[name]}
          />
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-coder-neutral-400">
              Skills
            </h2>
            <p className="text-xs text-coder-neutral-500">
              {total} {total === 1 ? "skill" : "skills"} in this run. Click a
              row to see its full report.
            </p>
          </div>
        </div>
        <SkillTable skills={data.skills ?? []} />
      </section>
    </div>
  );
};
