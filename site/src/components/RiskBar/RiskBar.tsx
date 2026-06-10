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
  /**
   * Optional cutoffs (0..100) for the suspicious and malicious bands.
   * When supplied, the bar renders thin tick marks at those positions so
   * the user can see how close a score is to escalating. Defaults match
   * the policy in config.yaml and docs/CALIBRATION.md.
   */
  suspicious_at?: number;
  malicious_at?: number;
}

export const RiskBar: FC<RiskBarProps> = ({
  score,
  verdict,
  showLabel = true,
  size = "sm",
  className,
  suspicious_at = 51,
  malicious_at = 81,
}) => {
  // Render the fill at the literal score (0 stays 0) so a clean skill
  // does not get a misleading sliver. Clamp into a sane range to defend
  // against malformed input.
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const trackHeight = size === "md" ? "h-2" : "h-1.5";
  const trackWidth = size === "md" ? "w-40" : "w-28";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 font-mono text-xs text-coder-neutral-400",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-full border border-coder-smoke bg-coder-cinder",
          trackHeight,
          trackWidth,
        )}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Risk score ${score} of 100`}
      >
        <span
          aria-hidden
          className={cn("block h-full", FILL[verdict])}
          style={{ width: `${pct}%` }}
        />
        {/* Cutoff ticks: 1px verticals so users can read "how close to
            escalating" without a separate legend. */}
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-coder-neutral-500/50"
          style={{ left: `${suspicious_at}%` }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-coder-neutral-500/50"
          style={{ left: `${malicious_at}%` }}
        />
      </div>
      {showLabel && (
        <span
          className={cn(
            "tabular-nums",
            pct === 0 ? "text-coder-neutral-500" : "text-coder-neutral-300",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
};
