# IAMTech — Project Plan

Status: **first build done** (2026-09-29). Waiting on client details and admin user; see "Needed from client". Update the checklist at the bottom as work lands.

## Client brief

Landing site for **IAMTech** phone and laptop repair services, with:

1. A main landing page.
2. A page where clients book repair appointments.
3. An admin page where the business reviews and manages appointments.

Documentation of changes and codebase information goes in `docs/` as Markdown.

## Decisions made

| Topic | Decision |
|-------|----------|
| Backend / storage | **Supabase** (hosted Postgres + Auth). Only new dependency: `@supabase/supabase-js`. |
| Booking model | **Date + time slot.** Fixed slots within business hours; taken slots hidden. Admin confirms/cancels. |
| Hosting | **Netlify or Vercel** (static build, auto-deploy from GitHub). |
| Routing | **Vite multi-page build**, no router library. Each page has its own HTML entry, so `/book/` and `/admin/` work on static hosts without rewrite rules. |
| Styling | Plain CSS with theme tokens in `src/index.css`. No UI library. |

## Branding

- Logo: `public/logo.webp` (1254×1254, 368 KB; also the favicon — a small resized copy would load faster).
- Theme from the logo: near-black background, electric blue → purple accents, silver/white text.
- Logo tagline: "Phone and Laptop Repair".
- **Open concern:** the logo incorporates Apple's apple silhouette. Flag trademark risk to the client before launch.

## Planned structure

```
index.html              → src/pages/Home.tsx    landing
book/index.html         → src/pages/Book.tsx    booking form
admin/index.html        → src/pages/Admin.tsx   login + appointment list
src/main.tsx            shared entry; data-page on #root picks the page
src/components/Layout.tsx  Header + Footer (shared)
src/lib/supabase.ts     client from VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
src/lib/business.ts     contact, services, hours, slotsFor() (self-check: scripts/check-slots.ts)
src/index.css           theme tokens
supabase/schema.sql     table, constraints, RLS, is_admin(), taken_slots(from_ts, to_ts)
public/logo.webp
docs/README.md          architecture, setup, env vars, deploy
docs/CHANGELOG.md       one entry per change
```

`vite.config.ts` needs `build.rollupOptions.input` listing the three HTML entries.

## Pages

- **Home:** hero with logo, services grid, hours, location/contact, "Book a repair" CTA.
- **Book:** name, phone, email, device type, issue description, native `<input type="date">`, grid of free slots for the chosen date. Confirmation message on submit.
- **Admin:** Supabase email/password login. Table of appointments filterable by date/status; actions: confirm / cancel / mark done.

## Supabase design (security lives in the DB)

- Table `appointments`: `id`, `slot_start timestamptz`, `name`, `phone`, `email`, `device`, `issue`, `status`, `created_at`.
- `status` check constraint: `pending | confirmed | cancelled | done`. Length checks on text fields.
- **Unique partial index** on `slot_start where status <> 'cancelled'` — prevents double-booking even under concurrent submits.
- **RLS:**
  - `anon` may `insert` only, and only with `status = 'pending'`.
  - Admin (`app_metadata.role = 'admin'`) may `select` and `update`. Tightened from "any authenticated user" so a stray sign-up can't read customer data.
- Public cannot read the table. A `security definer` function `taken_slots(from_ts, to_ts)` (a range, so the browser's local day boundaries are used) returns only booked `slot_start` values so the booking page can hide taken slots without exposing customer data.
- Disable public sign-ups in the Supabase dashboard; create the admin user manually and set its role (steps in `docs/README.md`).

## Deliberately skipped (add when needed)

- Email/SMS notifications — Supabase Edge Function or Resend when the client wants them.
- Captcha — add hCaptcha if spam bookings appear.
- DB-side business-hours validation of `slot_start` — admin can cancel stray bookings.

## Needed from client

- Services list (and prices, if shown), business hours, slot length, address, phone. Use placeholders until provided.
- ~~Admin email~~ done: `ampolconcepcion88@gmail.com` (also the public contact email). Contact phone `0965 553 3389`, SMS/WhatsApp only.
- Still needed: services list, business hours, slot length, address.

## Build order / checklist

- [x] 1. Theme tokens, logo rename, Header/Footer, landing page, update `index.html` title/favicon
- [x] 2. `supabase/schema.sql`, `src/lib/supabase.ts`, `src/lib/slots.ts`, booking page
- [x] 3. Admin page (login, list, status actions)
- [x] 4. `docs/README.md`, `docs/CHANGELOG.md`, update `CLAUDE.md`; verify `npm run build` and `npm run lint`
- [ ] 5. Client: real business details in `src/lib/business.ts`, admin user created, sign-ups disabled, trademark question on the logo
- [ ] 6. Deploy to Netlify/Vercel with the two env vars
