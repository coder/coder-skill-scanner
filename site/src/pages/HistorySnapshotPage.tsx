import type { FC } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import { ErrorState, LoadingState } from "../components/State/State";
import { KPI } from "../components/KPI/KPI";
import { MetaStrip } from "../components/MetaStrip/MetaStrip";
import { SkillTable } from "../components/SkillTable/SkillTable";
import { useHistoryIndex, useHistorySnapshot } from "../lib/query";
import { type Verdict, type VerdictCounts, VERDICTS } from "../types/report";

function counts(input: Partial<VerdictCounts> | undefined): VerdictCounts {
  return {
    clean: input?.clean ?? 0,
    suspicious: input?.suspicious ?? 0,
    malicious: input?.malicious ?? 0,
    unknown: input?.unknown ?? 0,
  };
}

export const HistorySnapshotPage: FC = () => {
  const params = useParams<{ stamp: string }>();
  const stamp = params.stamp ?? "";

  const index = useHistoryIndex();
  const entry = index.data?.entries.find((e) => e.stamp === stamp);
  const snap = useHistorySnapshot(stamp, entry?.path);

  if (index.isLoading || snap.isLoading) return <LoadingState />;
  if (index.error) return <ErrorState error={index.error} />;
  if (!entry) {
    return (
      <div className="space-y-4">
        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-xs text-coder-neutral-400 hover:text-coder-sky"
        >
          <ArrowLeftIcon className="size-3.5" /> All runs
        </Link>
        <div className="rounded-lg border border-coder-smoke bg-coder-cinder p-8 text-center text-sm text-coder-neutral-300">
          No snapshot at{" "}
          <span className="font-mono text-coder-neutral-100">{stamp}</span>.
        </div>
      </div>
    );
  }
  if (snap.error || !snap.data) return <ErrorState error={snap.error} />;

  const v = counts(snap.data.summary?.verdicts);
  const total =
    snap.data.summary?.total_skills ?? snap.data.skills?.length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-xs text-coder-neutral-400 hover:text-coder-sky"
        >
          <ArrowLeftIcon className="size-3.5" /> All runs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-coder-neutral-100">
          Snapshot{" "}
          <span className="font-mono text-coder-neutral-300">{stamp}</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-coder-neutral-400">
          Archived report. Skills can also be browsed at{" "}
          <Link className="text-coder-sky hover:underline" to="/">
            the current scan
          </Link>
          .
        </p>
      </div>

      <MetaStrip report={snap.data} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {VERDICTS.map((name: Verdict) => (
          <KPI key={name} label={name} value={v[name]} verdict={name} />
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-coder-neutral-400">
          Skills ({total})
        </h2>
        <SkillTable
          skills={snap.data.skills ?? []}
          detailLinkBase={`/history/${stamp}/skills`}
        />
      </section>
    </div>
  );
};
