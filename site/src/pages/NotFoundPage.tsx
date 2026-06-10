import type { FC } from "react";
import { Link } from "react-router-dom";

export const NotFoundPage: FC = () => (
  <div className="mx-auto max-w-md rounded-lg border border-coder-smoke bg-coder-cinder p-8 text-center">
    <div className="font-mono text-5xl font-semibold text-coder-neutral-200">
      404
    </div>
    <p className="mt-3 text-sm text-coder-neutral-400">
      That path doesn&apos;t exist in this report.
    </p>
    <Link
      to="/"
      className="mt-4 inline-flex items-center text-sm text-coder-sky hover:underline"
    >
      Back to the latest scan
    </Link>
  </div>
);
