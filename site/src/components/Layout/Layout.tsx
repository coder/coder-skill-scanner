import type { FC } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { cn } from "../../lib/cn";

type NavItem = {
  to: string;
  label: string;
  /** Match exactly (used on the "/" route to avoid matching every page). */
  end?: boolean;
};

const primaryNav: NavItem[] = [
  { to: "/", label: "Latest Scan", end: true },
  { to: "/history", label: "History" },
];

type UtilityLink = {
  href: string;
  label: string;
  /** Anchor for an external destination. */
  external?: boolean;
};

const utilityNav: UtilityLink[] = [
  { href: "/latest.json", label: "Raw JSON" },
  { href: "/schema.json", label: "Schema" },
  { href: "https://github.com/coder/coder-skill-scanner", label: "GitHub", external: true },
  { href: "https://registry.coder.com", label: "Registry", external: true },
];

const footerLinks: UtilityLink[] = [
  { href: "/latest.json", label: "Raw JSON" },
  { href: "/schema.json", label: "Schema (v1)" },
  { href: "/history", label: "History" },
  { href: "https://github.com/coder/coder-skill-scanner", label: "Source", external: true },
  {
    href: "https://github.com/coder/coder-skill-scanner/blob/main/LICENSE",
    label: "Apache-2.0",
    external: true,
  },
];

const utilityLinkClass =
  "rounded-md px-2.5 py-1.5 text-xs text-coder-neutral-400 transition-colors hover:bg-coder-smoke/60 hover:text-coder-neutral-100";

export const Layout: FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-coder-neutral-black text-coder-neutral-100">
      {/* Skip link: invisible until focused, lets keyboard users bypass
          the brand image and nav. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-coder-sky focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:text-coder-neutral-black"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-20 border-b border-coder-smoke bg-coder-neutral-black/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-80"
            aria-label="Coder Skill Scanner home"
          >
            <img
              src="/logo.png"
              alt="Coder Skill Scanner"
              /* The source image is 2048x139 (aspect ~14.7). Without a
                 max-width it renders ~412px wide at h-7, overflowing
                 narrow viewports. Cap to ~55% of the viewport width
                 on mobile so brand + nav both fit. */
              className="h-7 w-auto max-w-[55vw] sm:max-w-none"
            />
          </Link>

          <nav
            aria-label="Primary"
            className="flex items-center gap-1 text-sm"
          >
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-2.5 py-1.5 transition-colors sm:px-3",
                    isActive
                      ? "bg-coder-smoke text-coder-neutral-100"
                      : "text-coder-neutral-400 hover:bg-coder-smoke/60 hover:text-coder-neutral-100",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Utility nav is duplicated in the footer; hide on small
              screens so the brand and primary nav have room. */}
          <nav
            aria-label="Utility"
            className="hidden items-center gap-1 md:flex"
          >
            {utilityNav.map((item) => (
              <a
                key={item.href}
                className={utilityLinkClass}
                href={item.href}
                {...(item.external
                  ? { rel: "noopener noreferrer", target: "_blank" }
                  : {})}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10"
      >
        <Outlet />
      </main>

      <footer className="border-t border-coder-smoke">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-5 text-xs text-coder-neutral-500 sm:px-6">
          <span>Coder Skill Scanner</span>
          {footerLinks.map((item) => (
            <a
              key={item.href}
              className="hover:text-coder-neutral-100"
              href={item.href}
              {...(item.external
                ? { rel: "noopener noreferrer", target: "_blank" }
                : {})}
            >
              {item.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
};
