import type { FC } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon, ClockIcon } from "lucide-react";
import { ErrorState, LoadingState } from "../components/State/State";
import { useHistoryIndex } from "../lib/query";
import { formatUtc, relativeTime } from "../lib/format";
import { usePageTitle } from "../lib/usePageTitle";

export const HistoryPage: FC = () => {
  const { data, isLoading, error } = useHistoryIndex();

  usePageTitle("history");

  if (isLoading) return <LoadingState>Loading history index...</LoadingState>;
  if (error || !data) {
    return (
      <ErrorState error={error}>
        <div className="mt-2 text-xs text-coder-neutral-400">
          History begins populating after the first scheduled scan. The latest
          snapshot is always available as the{" "}
          <a className="text-coder-sky hover:underline" href="/latest.json">
            raw JSON report
          </a>
          .
        </div>
      </ErrorState>
    );
  }

  if (data.entries.length === 0) {
    return (
      <div className="space-y-2 rounded-lg border border-coder-smoke bg-coder-cinder p-8 text-center">
        <ClockIcon className="mx-auto size-5 text-coder-neutral-500" />
        <div className="text-sm text-coder-neutral-300">
          No history yet. Snapshots appear here as the cron runs.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-coder-neutral-100">
          Scan history
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-coder-neutral-400">
          Every scheduled run is archived as a snapshot. {data.entries.length}{" "}
          {data.entries.length === 1 ? "run" : "runs"} retained, newest first.
        </p>
      </div>

      <ul className="overflow-hidden rounded-lg border border-coder-smoke bg-coder-cinder">
        {data.entries.map((e) => {
          const v = e.summary?.verdicts;
          return (
            <li
              key={e.stamp}
              className="border-t border-coder-smoke/60 first:border-t-0"
            >
              <Link
                to={`/history/${e.stamp}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-coder-smoke/30"
              >
                <div className="flex-1">
                  <div className="font-mono text-sm text-coder-neutral-100">
                    {formatUtc(e.generated_at)}
                  </div>
                  <div className="text-xs text-coder-neutral-500">
                    {relativeTime(e.generated_at)} &middot; {e.stamp}
                  </div>
                </div>
                {v && (
                  <div className="flex gap-3 text-xs font-mono text-coder-neutral-400">
                    {v.malicious > 0 && (
                      <span className="text-verdict-malicious">
                        {v.malicious} malicious
                      </span>
                    )}
                    {v.suspicious > 0 && (
                      <span className="text-verdict-suspicious">
                        {v.suspicious} suspicious
                      </span>
                    )}
                    {v.unknown > 0 && (
                      <span className="text-verdict-unknown">
                        {v.unknown} unknown
                      </span>
                    )}
                    <span className="text-verdict-clean">
                      {v.clean} clean
                    </span>
                  </div>
                )}
                <ChevronRightIcon className="size-4 text-coder-neutral-500" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
