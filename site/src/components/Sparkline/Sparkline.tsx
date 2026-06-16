import type { FC } from "react";
import { cn } from "../../lib/cn";

interface SparklinePoint {
  x: string;
  y: number;
}

interface SparklineProps {
  points: SparklinePoint[];
  width?: number;
  height?: number;
  className?: string;
  /** 0..100 scale for the y axis. */
  max?: number;
}

/**
 * Tiny inline sparkline rendering risk score over time.
 * No external chart library: a single SVG <path> for the line plus a
 * filled area underneath. Easy to test, zero dependencies.
 */
export const Sparkline: FC<SparklineProps> = ({
  points,
  width = 240,
  height = 56,
  max = 100,
  className,
}) => {
  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex h-14 items-center justify-center rounded-md border border-coder-smoke bg-coder-cinder text-xs text-coder-neutral-500",
          className,
        )}
        style={{ width }}
      >
        no history yet
      </div>
    );
  }

  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const n = points.length;
  const xs = (i: number) =>
    n === 1 ? pad + innerW / 2 : pad + (i / (n - 1)) * innerW;
  const ys = (v: number) =>
    pad + innerH - (Math.max(0, Math.min(max, v)) / max) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(p.y)}`)
    .join(" ");

  const areaPath =
    `M ${xs(0)} ${pad + innerH} ` +
    points.map((p, i) => `L ${xs(i)} ${ys(p.y)}`).join(" ") +
    ` L ${xs(n - 1)} ${pad + innerH} Z`;

  const last = points[n - 1]!;
  return (
    <svg
      role="img"
      aria-label={`Risk score sparkline, last value ${last.y}`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn(
        "rounded-md border border-coder-smoke bg-coder-cinder",
        className,
      )}
    >
      <path d={areaPath} fill="var(--color-coder-sky)" opacity={0.15} />
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-coder-sky)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={xs(n - 1)}
        cy={ys(last.y)}
        r={2.5}
        fill="var(--color-coder-sky)"
      />
    </svg>
  );
};
