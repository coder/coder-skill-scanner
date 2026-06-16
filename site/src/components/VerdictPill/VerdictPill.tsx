import type { FC } from "react";
import { cn } from "../../lib/cn";
import type { Verdict } from "../../types/report";

const VARIANTS: Record<Verdict, string> = {
  clean:
    "bg-verdict-clean-bg text-verdict-clean border-verdict-clean/60",
  suspicious:
    "bg-verdict-suspicious-bg text-verdict-suspicious border-verdict-suspicious/60",
  malicious:
    "bg-verdict-malicious-bg text-verdict-malicious border-verdict-malicious/60",
  unknown:
    "bg-verdict-unknown-bg text-verdict-unknown border-verdict-unknown/60",
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
} as const;

type Size = keyof typeof SIZE_CLASSES;

interface VerdictPillProps {
  verdict: Verdict;
  size?: Size;
  className?: string;
}

export const VerdictPill: FC<VerdictPillProps> = ({
  verdict,
  size = "md",
  className,
}) => {
  // The large size carries the verdict at the top of the skill detail
  // header; title-case reads as a label rather than a noun-in-a-sentence.
  const label = size === "lg" ? capitalize(verdict) : verdict;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide",
        SIZE_CLASSES[size],
        VARIANTS[verdict],
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full bg-current"
      />
      {label}
    </span>
  );
};

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
