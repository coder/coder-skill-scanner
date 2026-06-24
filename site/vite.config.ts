import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "node:fs";
import path from "node:path";

/**
 * The React app expects to fetch `latest.json`, `schema.json`, and
 * `history/...` from the same origin. In production (GitHub Pages) that
 * just works because the scanner workflow drops those files alongside the
 * built SPA.
 *
 * In development, we proxy those paths to a static server (set
 * VITE_REPORT_UPSTREAM to its URL) so the React app sees real scanner
 * output without us having to embed fixtures. Defaults to a sibling
 * http.server on :8765, matching what the local `run.sh` produces.
 */
const REPORT_REGEX = /^\/(latest\.json|schema\.json|history\/.+\.json)$/;

/**
 * Resolve the production `base` path. Lookup priority:
 *   1. `VITE_BASE_PATH` env (explicit override; useful for local prod
 *      builds when you want to mimic a specific Pages deployment).
 *   2. The repo name parsed from `GITHUB_REPOSITORY` (CI default; a fork
 *      named `<owner>/<repo>` gets `/<repo>/` automatically with zero
 *      config).
 *   3. `/` (apex / local-build fallback).
 *
 * Always returns a value with leading and trailing slashes so Vite's
 * own asset URL logic does not have to special-case the input.
 */
function resolveProductionBase(): string {
  const explicit = process.env.VITE_BASE_PATH?.trim();
  if (explicit) {
    const prefixed = explicit.startsWith("/") ? explicit : `/${explicit}`;
    return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
  }
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1]?.trim();
  if (repo) return `/${repo}/`;
  return "/";
}

/**
 * Vite already substitutes `%BASE_URL%` in `index.html`, but it copies
 * everything under `public/` verbatim. This plugin runs after the build
 * finishes and substitutes the same placeholder in `dist/404.html` so
 * the GitHub Pages SPA-fallback redirect targets the right base prefix
 * regardless of which fork is publishing.
 */
function rewritePublicBaseUrl(base: string): PluginOption {
  return {
    name: "rewrite-public-base-url",
    apply: "build",
    writeBundle() {
      const targets = ["404.html"];
      for (const name of targets) {
        const file = path.resolve("dist", name);
        if (!fs.existsSync(file)) continue;
        const content = fs.readFileSync(file, "utf8");
        fs.writeFileSync(file, content.replace(/%BASE_URL%/g, base));
      }
    },
  };
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const upstream = env.VITE_REPORT_UPSTREAM || "http://localhost:8765";
  const base = command === "build" ? resolveProductionBase() : "/";

  return {
    // See `resolveProductionBase` above. Dev keeps `/` so the local Vite
    // server and its report proxy keep working without env juggling.
    base,
    plugins: [react(), rewritePublicBaseUrl(base)],
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      allowedHosts: true,
      proxy: {
        // Regex key only proxies the static report files; SPA routes such as
        // /history or /skills/<ns>/<slug> still fall through to Vite so the
        // React Router can handle them.
        [REPORT_REGEX.source]: { target: upstream, changeOrigin: true },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
