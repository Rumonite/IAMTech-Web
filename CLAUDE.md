# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Freshly scaffolded from the Vite `react-ts` template (React 19, TypeScript 6, Vite 8). `src/App.tsx` and `src/App.css` still contain the template demo page; no app-specific code, routing, state management, or test setup exists yet.

**Read `docs/PLAN.md` first.** It holds the client brief (IAMTech repair services: landing, booking, admin pages), the decisions already made (Supabase, time-slot booking, Vite multi-page, Netlify/Vercel), and a build checklist. Tick checklist items as they land.

## Documentation

The client wants changes and codebase information documented as Markdown in `docs/`. Keep `docs/PLAN.md` current, log each change in `docs/CHANGELOG.md`, and describe architecture/setup in `docs/README.md`.

## Commands

- `npm run dev` — Vite dev server with HMR
- `npm run build` — type-check (`tsc -b`) then production build to `dist/`
- `npm run lint` — Oxlint (not ESLint); config in `.oxlintrc.json`
- `npm run preview` — serve the built `dist/`

There is no test runner configured.

## Structure and conventions

- Entry: `index.html` → `src/main.tsx` (mounts `<App />` in `StrictMode` into `#root`) → `src/App.tsx`.
- TypeScript uses project references: `tsconfig.app.json` covers `src/`, `tsconfig.node.json` covers `vite.config.ts`. Both are `noEmit`; Vite does the transpiling.
- Compiler flags that shape how code must be written:
  - `verbatimModuleSyntax` — type-only imports must use `import type`.
  - `erasableSyntaxOnly` — no `enum`, `namespace`, or constructor parameter properties.
  - `allowImportingTsExtensions` — local imports include the extension (`import App from './App.tsx'`).
  - `noUnusedLocals` / `noUnusedParameters` — unused code fails `npm run build`.
- Assets: files in `src/assets/` are imported as modules; files in `public/` are served from the root (e.g. `public/icons.svg` is an SVG sprite referenced as `<use href="/icons.svg#github-icon">`).
- Lint rules enforced: `react/rules-of-hooks` (error) and `react/only-export-components` (warn, for Fast Refresh — keep component files exporting only components, constants allowed).
