import type { FC } from "react";
import { cn } from "../../lib/cn";
import type { Verdict } from "../../types/report";

const FILL: Record<Verdict, string> = {
  clean: "bg-verdict-clean",
  suspicious: "bg-verdict-suspicious",
  malicious: "bg-verdict-malicious",
  unknown: "bg-verdict-unknown",
};

interface RiskBarProps {
  score: number;
  verdict: Verdict;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export const RiskBar: FC<RiskBarProps> = ({
  score,
  verdict,
  showLabel = true,
  size = "sm",
  className,
}) => {
  const pct = Math.max(2, Math.min(100, Math.round(score)));
  const trackHeight = size === "md" ? "h-2" : "h-1.5";
  const trackWidth = size === "md" ? "w-32" : "w-20";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 font-mono text-xs text-coder-neutral-400",
        className,
      )}
    >
      <div
        className={cn(
          "overflow-hidden rounded-full border border-coder-smoke bg-coder-cinder",
          trackHeight,
          trackWidth,
        )}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          className={cn("block h-full", FILL[verdict])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="tabular-nums">{score}</span>}
    </div>
  );
};
