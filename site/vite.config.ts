import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

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

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const upstream = env.VITE_REPORT_UPSTREAM || "http://localhost:8765";

  return {
    // GitHub Pages serves this site at /coder-skill-scanner/. Production
    // builds emit asset URLs relative to that base. Dev keeps the default
    // `/` so the local Vite server and its report proxy keep working.
    base: command === "build" ? "/coder-skill-scanner/" : "/",
    plugins: [react()],
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
