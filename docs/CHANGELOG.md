# Changelog

## 2026-09-29 — Client contact details and admin account

- Contact phone `0965 553 3389` (SMS and WhatsApp only, so no `tel:` call links) and email `ampolconcepcion88@gmail.com` in `src/lib/business.ts`; shown on the home page and in the footer. WhatsApp link assumes a Philippine number (`+63`).
- Booking page messages say "message us by SMS or WhatsApp" instead of "call us".
- Created the client's admin account (`ampolconcepcion88@gmail.com`) in Supabase.

## 2026-09-29 — Admin login link

- Header (all pages) has a "Log in" link to `/admin/`, which shows the sign-in form and then the appointments dashboard.
- Created the first admin account in Supabase (`app_metadata.role = 'admin'`).

## 2026-09-29 — First build

- Replaced the Vite template with the IAMTech site: landing page (`/`), booking page (`/book/`), admin page (`/admin/`).
- Vite multi-page build; one shared entry (`src/main.tsx`) lazy-loads each page.
- Dark theme from the logo (near-black, blue → purple). Logo renamed to `public/logo.webp` and used as the favicon.
- Business details, services, hours, and slot generation in `src/lib/business.ts` (placeholders until the client supplies real values), with `npm run check` self-check.
- Supabase: `appointments` table, double-booking protection, RLS (public insert-only, admin read/update via `app_metadata.role = 'admin'`), `taken_slots()` function. Applied to the project as migration `appointments`; source in `supabase/schema.sql`.
- Added `@supabase/supabase-js`. Env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Docs: `docs/README.md` (architecture, setup, admin user, deploy).
