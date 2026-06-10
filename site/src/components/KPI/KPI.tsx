import type { FC } from "react";
import { cn } from "../../lib/cn";
import type { Verdict } from "../../types/report";

const RAIL: Record<Verdict, string> = {
  clean: "before:bg-verdict-clean",
  suspicious: "before:bg-verdict-suspicious",
  malicious: "before:bg-verdict-malicious",
  unknown: "before:bg-verdict-unknown",
};

interface KPIProps {
  label: string;
  value: number | string;
  verdict?: Verdict;
  hint?: string;
}

export const KPI: FC<KPIProps> = ({ label, value, verdict, hint }) => {
  const isZero = typeof value === "number" && value === 0;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-coder-smoke bg-coder-cinder p-4",
        "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-coder-smoke-lighter",
        verdict ? RAIL[verdict] : undefined,
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-coder-neutral-400">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-3xl font-semibold tabular-nums",
          // A loud "0" reads as a failure on cards where zero is good
          // news (no malicious findings). Mute zeros so non-zero values
          // do the visual work.
          isZero ? "text-coder-neutral-500" : "text-coder-neutral-100",
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-coder-neutral-500">{hint}</div>
      )}
    </div>
  );
};
