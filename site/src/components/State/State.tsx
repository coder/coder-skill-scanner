import type { FC, ReactNode } from "react";
import { Loader2Icon } from "lucide-react";
import { cn } from "../../lib/cn";

interface StateProps {
  className?: string;
  children?: ReactNode;
}

export const LoadingState: FC<StateProps> = ({ className, children }) => (
  <div
    className={cn(
      "flex items-center gap-2 rounded-lg border border-coder-smoke bg-coder-cinder p-6 text-sm text-coder-neutral-400",
      className,
    )}
  >
    <Loader2Icon className="size-4 animate-spin text-coder-sky" />
    {children ?? "Loading report..."}
  </div>
);

interface ErrorStateProps extends StateProps {
  error: unknown;
}

export const ErrorState: FC<ErrorStateProps> = ({
  className,
  error,
  children,
}) => {
  const msg =
    error instanceof Error ? error.message : String(error ?? "Unknown error");
  return (
    <div
      className={cn(
        "rounded-lg border border-verdict-malicious/40 bg-verdict-malicious-bg p-6 text-sm text-coder-neutral-200",
        className,
      )}
    >
      <div className="font-medium text-verdict-malicious">
        Couldn&apos;t load report
      </div>
      <div className="mt-1 font-mono text-xs text-coder-neutral-400">{msg}</div>
      {children}
    </div>
  );
};
