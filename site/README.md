# Coder Skill Scanner site

React app that renders the public scan results. Mirrors the tooling in
`coder/registry-server`'s `cmd/main/site/`: Vite, TypeScript, React 18,
Tailwind 4, Radix primitives, React Router, TanStack Query, Storybook,
Vitest.

## Local development

```sh
pnpm install
pnpm dev
```

The app fetches `latest.json`, `schema.json`, and `history/index.json` from
the same origin. For local development against a real scanner run, point
the app at a generated `pages/` tree:

```sh
# In one terminal: generate a real report into /tmp/scan-local/pages.
cd ..
bash run.sh   # writes /tmp/scan-local/pages

# In another terminal: serve that tree on a static origin.
cd /tmp/scan-local/pages && python3 -m http.server 8765

# Run vite pointing at it.
cd $OLDPWD/site
VITE_REPORT_BASE=http://localhost:8765 pnpm dev
```

`pnpm dev` serves on `0.0.0.0:5173`. In a Coder workspace, port-forward
5173 to view it.

## Other scripts

```sh
pnpm lint          # eslint
pnpm lint-types    # tsc --noEmit
pnpm test          # vitest watch
pnpm test:ci       # vitest run (CI)
pnpm storybook     # local component dev at :6006
pnpm build         # production build into ./dist
```

## Build artifacts

`pnpm build` writes static files to `dist/`. The scanner workflow copies
those into the `pages/` tree alongside `latest.json`, `schema.json`, and
`history/`, then deploys via `actions/deploy-pages`. GH Pages serves the
React SPA from the repo's Pages site URL.
