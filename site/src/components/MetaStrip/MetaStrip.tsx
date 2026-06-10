import type { FC, ReactNode } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatUtc, relativeTime, truncSha } from "../../lib/format";
import type { Report } from "../../types/report";

interface MetaStripProps {
  report: Report;
  className?: string;
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <strong className="text-coder-neutral-100">{label}</strong>
      <span className="font-mono text-coder-neutral-300">{children}</span>
    </span>
  );
}

export const MetaStrip: FC<MetaStripProps> = ({ report, className }) => {
  const run = report.scanner_run ?? {};
  const cat = report.catalogue;
  const catHref = cat
    ? `https://github.com/${cat.owner}/${cat.repo}/tree/${cat.sha ?? cat.ref}`
    : undefined;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-coder-smoke bg-coder-cinder px-4 py-3 text-xs text-coder-neutral-400",
        className,
      )}
    >
      <Cell label="Last scan">
        <span title={formatUtc(report.generated_at)}>
          {relativeTime(report.generated_at)}
        </span>
      </Cell>
      <Cell label="Schema">v{report.schema_version}</Cell>
      {cat && catHref && (
        <Cell label="Catalogue">
          <a
            className="inline-flex items-center gap-1 text-coder-sky hover:underline"
            href={catHref}
            rel="noopener noreferrer"
          >
            {cat.owner}/{cat.repo}@{truncSha(cat.sha) || cat.ref}
            <ExternalLinkIcon className="size-3" />
          </a>
        </Cell>
      )}
      {run.run_id && run.run_url && (
        <Cell label="Run">
          <a
            className="inline-flex items-center gap-1 text-coder-sky hover:underline"
            href={run.run_url}
            rel="noopener noreferrer"
          >
            #{run.run_id}
            <ExternalLinkIcon className="size-3" />
          </a>
        </Cell>
      )}
    </div>
  );
};
