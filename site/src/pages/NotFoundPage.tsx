import type { FC } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";

export const NotFoundPage: FC = () => {
  usePageTitle("not found");
  return (
    <div className="mx-auto max-w-md rounded-lg border border-coder-smoke bg-coder-cinder p-8 text-center">
      <div className="font-mono text-5xl font-semibold text-coder-neutral-200">
        404
      </div>
      <p className="mt-3 text-sm text-coder-neutral-400">
        That path doesn&apos;t exist in this report.
      </p>
      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <Link to="/" className="text-coder-sky hover:underline">
          Back to the latest scan
        </Link>
        <Link
          to="/history"
          className="text-xs text-coder-neutral-400 hover:text-coder-neutral-100"
        >
          or browse the scan history
        </Link>
      </div>
    </div>
  );
};
