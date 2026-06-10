import * as Tooltip from "@radix-ui/react-tooltip";
import { InfoIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { SKILLSPECTOR_RULES } from "../../lib/skillspectorRules.generated";

interface RuleBadgeProps {
  id: string;
  /** Optional severity, rendered to the right of the ID. */
  severity?: string;
  /** Optional count of times the rule fired. */
  count?: number;
  className?: string;
}

const SEVERITY_TONE: Record<string, string> = {
  critical: "text-verdict-malicious",
  high: "text-verdict-malicious",
  medium: "text-verdict-suspicious",
  low: "text-coder-neutral-300",
  info: "text-coder-neutral-400",
};

function severityClass(sev?: string): string {
  if (!sev) return "text-coder-neutral-400";
  return SEVERITY_TONE[sev.toLowerCase()] ?? "text-coder-neutral-400";
}

function TooltipBody({
  rule,
}: {
  rule: { id: string; category: string; description: string } | undefined;
}): ReactNode {
  if (!rule) {
    return (
      <>
        <div className="text-coder-neutral-100">{`Unknown rule`}</div>
        <div className="mt-1 text-xs text-coder-neutral-400">
          Not in the bundled SkillSpector catalogue. Re-run
          {" "}
          <code className="font-mono">scripts/gen_rule_catalog.py</code>{" "}
          after upgrading.
        </div>
      </>
    );
  }
  return (
    <>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-coder-neutral-100">{rule.id}</span>
        {rule.category && (
          <span className="text-xs text-coder-neutral-400">{rule.category}</span>
        )}
      </div>
      <div className="mt-1.5 text-xs leading-relaxed text-coder-neutral-300">
        {rule.description}
      </div>
    </>
  );
}

export const RuleBadge: FC<RuleBadgeProps> = ({
  id,
  severity,
  count,
  className,
}) => {
  const rule = SKILLSPECTOR_RULES[id];
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-coder-smoke bg-coder-smoke/30 px-2 py-0.5 text-xs",
            "transition-colors hover:border-coder-smoke-lighter hover:bg-coder-smoke/60",
            className,
          )}
          tabIndex={0}
        >
          <span className="font-mono font-medium text-coder-neutral-100">
            {id}
          </span>
          {rule?.category && (
            <span className="hidden text-coder-neutral-400 sm:inline">
              {rule.category}
            </span>
          )}
          {severity && (
            <span className={cn("font-mono", severityClass(severity))}>
              {severity}
            </span>
          )}
          {typeof count === "number" && (
            <span className="font-mono text-coder-neutral-300">
              &times;{count}
            </span>
          )}
          <InfoIcon
            aria-hidden
            className="size-3 text-coder-neutral-500"
          />
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-sm rounded-md border border-coder-smoke bg-coder-neutral-black p-3 shadow-lg"
        >
          <TooltipBody rule={rule} />
          <Tooltip.Arrow className="fill-coder-smoke" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
