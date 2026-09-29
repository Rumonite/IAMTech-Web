# IAMTech — Project Plan

Status: **ready for a test deployment** (2026-09-29). Waiting on some client details; see "Needed from client". Update the checklist at the bottom as work lands.

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
| Booking model | **Date + time slot.** Fixed slots within business hours; taken slots hidden. |
| Booking flow | Booking starts **pending** → admin sets a price (**quoted**; 20% downpayment computed by the DB) → customer pays by GCash and submits the reference number on their booking link (or **declines** the quote, freeing the slot) → admin checks it and **confirms** (shown to staff as "Accepted") → **done**. Admin can cancel until done. Every action asks for confirmation and reports the result. |
| Payments | **Manual GCash transfer** with reference number, verified by admin. No gateway account or fees. Maya removed at the client's request (2026-09-29). Upgrade path: PayMongo (GCash checkout) via a Supabase Edge Function + webhook, if the client wants automatic verification. |
| Hosting | **Netlify or Vercel** (static build, auto-deploy from GitHub). |
| Routing | **Vite multi-page build**, no router library. Each page has its own HTML entry, so `/book/` and `/admin/` work on static hosts without rewrite rules. |
| Mobile | **Mobile web** for customers: mobile-first layout checked down to 320 px, large tap targets, works over plain http on the LAN and in in-app browsers such as Messenger (fallbacks in `src/lib/browser.ts`). No installable app or app-store app. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`, build-time only). Theme tokens and a few shared classes in `src/index.css`. No component library; modal, confirm and toast are small components on native `<dialog>` and popover. |

## Branding

- Logo: `public/logo.webp` (1254×1254, 368 KB, the original). Resized copies: `logo-800.webp` (home page, shown with a radial fade so the square corners melt into the page), `logo-96.webp` (header, favicon), and an Apple touch icon.
- Theme from the logo: near-black background, electric blue → purple accents, silver/white text. Fonts: Chakra Petch (headings, echoes the logo's angled lettering) and Instrument Sans (body), from Google Fonts.
- Signature element: the customer's page is a **repair ticket** (short ticket number, dashed tear line) with progress drawn as a glowing circuit trace (Requested → Quoted → Confirmed → Repaired). The home page's "How appointments work" steps use the same trace.
- Logo tagline: "Phone and Laptop Repair".
- **Open concern:** the logo incorporates Apple's apple silhouette. Flag trademark risk to the client before launch.

## Planned structure

```
index.html              → src/pages/Home.tsx    landing
book/index.html         → src/pages/Book.tsx    booking form
admin/index.html        → src/pages/Admin.tsx   login + appointment list
src/main.tsx            shared entry; data-page on #root picks the page
src/components/Layout.tsx  Header + Footer (shared)
src/components/ui.tsx   Modal, Confirm, Toast
src/lib/supabase.ts     client from VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
src/lib/business.ts     contact, GCash account, downpayment rate, services, hours, slotsFor() (self-check: scripts/check-slots.ts)
src/lib/format.ts       peso, ticket number, date/time formatting
src/index.css           Tailwind import, theme tokens, shared classes
supabase/schema.sql     table, constraints, RLS, is_admin(), taken_slots(from_ts, to_ts)
public/logo.webp, logo-800.webp, logo-96.webp, apple-touch-icon.png, gcash-qr.png
README.md               feature list
docs/DEVELOPMENT.md     architecture, setup, env vars, deploy
docs/CHANGELOG.md       one entry per change
```

`vite.config.ts` needs `build.rollupOptions.input` listing the three HTML entries.

## Pages

- **Home:** hero with logo, "How appointments work" steps, services, hours, location/contact, "Set an appointment" CTA.
- **Book:** name, phone, email, device type (tiles), issue description, native `<input type="date">`, grid of free slots. "Review appointment" shows a summary to confirm, then goes to the customer's ticket `/book/?id=<uuid>`: progress, quote, GCash number and QR (with a Save button for paying from the same phone), reference-number form, decline-quote button.
- **Wording:** customer and staff text says "appointment", never "book"/"booking" (client request, 2026-09-29). Code names and the `/book/` URL are unchanged.
- **Admin:** Supabase email/password login. Status tabs with counts (Pending, Quoted, Accepted, Done, Cancelled; Quoted also shows how many have paid), each color-coded. Compact rows; clicking one opens a modal with the details and actions: send quote (with live downpayment preview), confirm payment, mark done, cancel, copy customer link. Optional date filter; otherwise the last 30 days and everything upcoming. Reloads on window focus.

## Supabase design (security lives in the DB)

- Table `appointments`: `id`, `slot_start timestamptz`, `name`, `phone`, `email`, `device`, `issue`, `status`, `created_at`, `price`, `downpayment` (generated: 20% of price), `payment_method`, `payment_ref`, `paid_at`.
- `status` check constraint: `pending | quoted | confirmed | declined | cancelled | done`; `quoted` requires a price. `payment_method` must be `gcash`. Length checks on text fields.
- **Unique partial index** on `slot_start where status not in ('cancelled', 'declined')` — prevents double-booking even under concurrent submits.
- **RLS:**
  - `anon` may `insert` only, and only with `status = 'pending'`.
  - Admin (`app_metadata.role = 'admin'`) may `select` and `update`. Tightened from "any authenticated user" so a stray sign-up can't read customer data.
- Customer booking link: `booking(id)` returns that booking's status, time, device, and price only; `submit_payment(id, method, ref)` records a GCash reference, only while `quoted`; `decline_quote(id)` sets `declined`, only while `quoted` with no reference submitted. The random id is the secret.
- Admin status changes only apply if the row is still in the status the admin saw, so a quote the customer just declined can't be confirmed.
- Public cannot read the table. A `security definer` function `taken_slots(from_ts, to_ts)` (a range, so the browser's local day boundaries are used) returns only booked `slot_start` values so the booking page can hide taken slots without exposing customer data.
- Public sign-ups are disabled in the Supabase dashboard; admin users are created by hand and given the role (steps in `docs/DEVELOPMENT.md`).

## Deliberately skipped (add when needed)

- Email/SMS notifications — Supabase Edge Function or Resend when the client wants them. Until then admin sends the customer their link ("Copy customer link").
- Payment gateway (PayMongo) — see Payments above.
- Editing a price after quoting — cancel and rebook for now.
- Captcha — add hCaptcha if spam bookings appear.
- DB-side business-hours validation of `slot_start` — admin can cancel stray bookings.

## Needed from client

- Done: contact phone and email, address (Saddul St. Purok 7, Salay, Echague, Isabela), GCash number (same as the contact phone) and QR code.
- Still needed: services list (and prices, if shown), business hours, slot length, **registered GCash account name** (placeholder `IAMTech` in `GCASH`, `src/lib/business.ts`). Placeholders stay until provided.

## Build order / checklist

- [x] 1. Theme tokens, logo rename, Header/Footer, landing page, update `index.html` title/favicon
- [x] 2. `supabase/schema.sql`, `src/lib/supabase.ts`, `src/lib/slots.ts`, booking page
- [x] 3. Admin page (login, list, status actions)
- [x] 4. Docs, `docs/CHANGELOG.md`, update `CLAUDE.md`; verify `npm run build` and `npm run lint`
- [ ] 5. Client: remaining business details in `src/lib/business.ts` (services, hours, slot length, GCash account name), trademark question on the logo. Done: address, GCash number and QR, admin users, sign-ups disabled.
- [x] 5a. Quote + 20% downpayment flow with GCash/Maya reference numbers (migration `quotes_and_downpayment`)
- [x] 5b. Tailwind redesign, admin status tabs + detail modal, confirmations and toasts, customer can decline a quote, GCash only (migration `decline_quote_gcash_only`)
- [x] 5c. Copy link only (Text link removed), faded hero logo, no-calls line removed, mobile web fixes
- [x] 5d. Address, GCash QR on the payment step, README as feature list, account details removed from docs
- [ ] 6. Deploy to Netlify/Vercel with the two env vars
