import type { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";

export const NotFoundPage: FC = () => {
  const { pathname } = useLocation();
  usePageTitle("not found");
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 rounded-lg border border-coder-smoke bg-coder-cinder p-10 text-center">
      <div className="font-mono text-7xl font-semibold tracking-tight text-coder-neutral-200">
        404
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-coder-neutral-100">
          That page isn&apos;t part of this scan report.
        </h1>
        <p className="text-sm text-coder-neutral-400">
          We couldn&apos;t find{" "}
          <span className="rounded bg-coder-smoke/60 px-1.5 py-0.5 font-mono text-xs text-coder-neutral-200">
            {pathname}
          </span>
          . It may have moved, been renamed, or never existed.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
        <Link to="/" className="text-coder-sky hover:underline">
          Latest scan
        </Link>
        <Link to="/history" className="text-coder-sky hover:underline">
          Scan history
        </Link>
        <a
          href={`${import.meta.env.BASE_URL}latest.json`}
          className="text-coder-sky hover:underline"
        >
          Raw JSON
        </a>
        <a
          href="https://github.com/coder/coder-skill-scanner"
          className="text-coder-sky hover:underline"
          rel="noopener noreferrer"
          target="_blank"
        >
          Source
        </a>
      </div>
    </div>
  );
};
