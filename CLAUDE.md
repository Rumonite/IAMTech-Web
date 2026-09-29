# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

IAMTech repair site: landing (`/`), booking (`/book/`), admin (`/admin/`), backed by Supabase. First build is done; see `docs/PLAN.md` for decisions and the remaining checklist, and `docs/DEVELOPMENT.md` for architecture, env vars, database security, and admin setup.

## Documentation

The client wants changes and codebase information documented as Markdown in `docs/`. Keep `docs/PLAN.md` current, log each change in `docs/CHANGELOG.md`, and describe architecture/setup in `docs/DEVELOPMENT.md`. The root `README.md` only lists features: update it when features change, and keep progress notes out of it. No docs may include user account details (emails, passwords).

## Commands

- `npm run dev` — Vite dev server with HMR (`npm run dev -- --host` to reach it from a phone on the LAN)
- `npm run build` — type-check (`tsc -b`) then production build to `dist/`
- `npm run lint` — Oxlint (not ESLint); config in `.oxlintrc.json`
- `npm run preview` — serve the built `dist/`
- `npm run check` — assert-based self-checks (`scripts/check-slots.ts`, `scripts/check-uuid.ts`)

There is no test runner; keep checks as small node scripts in `scripts/`.

## Structure and conventions

- Entries: `index.html`, `book/index.html`, `admin/index.html` (listed in `vite.config.ts`). Each sets `data-page` on `#root`; `src/main.tsx` lazy-imports the matching `src/pages/*.tsx` default export.
- Business data the client may change lives only in `src/lib/business.ts`.
- Database changes: edit `supabase/schema.sql` and apply as a new Supabase migration; security is enforced by RLS, not the frontend.
- TypeScript uses project references: `tsconfig.app.json` covers `src/`, `tsconfig.node.json` covers `vite.config.ts`. Both are `noEmit`; Vite does the transpiling.
- Compiler flags that shape how code must be written:
  - `verbatimModuleSyntax` — type-only imports must use `import type`.
  - `erasableSyntaxOnly` — no `enum`, `namespace`, or constructor parameter properties.
  - `allowImportingTsExtensions` — local imports include the extension (`import App from './App.tsx'`).
  - `noUnusedLocals` / `noUnusedParameters` — unused code fails `npm run build`.
- Phones and in-app browsers: use `uuid()` and `copyText()` from `src/lib/browser.ts`, not `crypto.randomUUID` or `navigator.clipboard` directly (they fail over plain http and in some in-app browsers).
- Styling: Tailwind CSS v4 utilities in markup. Theme colors/fonts and shared classes (`.btn*`, `.panel`, `.field`, `.input`, `.link`, `.modal`, `.chip`, `.tone-<status>`) live in `src/index.css`; dialogs, confirmations and toasts use `src/components/ui.tsx`. Every state-changing action goes through `Confirm` and reports its result with `Toast`.
- Assets: files in `public/` are served from the root (e.g. `/logo.webp`).
- Lint rules enforced: `react/rules-of-hooks` (error) and `react/only-export-components` (warn, for Fast Refresh — keep component files exporting only components, constants allowed).
