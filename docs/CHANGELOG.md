# Changelog

## 2026-09-29 — Address, GCash QR, docs layout

- Address set to Saddul St. Purok 7, Salay, Echague, Isabela. GCash number now reuses the contact phone.
- GCash QR code (`public/gcash-qr.png`) on the customer's payment step, with a "Save QR image" button so customers paying from the same phone can upload it in GCash.
- Root `README.md` now lists features only (replaces the Vite template). Technical docs moved from `docs/README.md` to `docs/DEVELOPMENT.md`. Account details (emails, password notes) removed from all docs.

## 2026-09-29 — "Appointment" instead of "book"

- All visible text uses "appointment" instead of "book"/"booking", at the client's request: header button "Set an appointment" ("Appointment" on phones), "Set an appointment" page and CTA, "Review appointment", "Set appointment", "Cancel appointment", "How appointments work", page title and description. Staff modal's "Booked" date is now "Requested".
- Code names (`Book.tsx`, `booking()` function) and the `/book/` URL are unchanged.

## 2026-09-29 — Mobile, logo fade, copy link only

- Admin booking modal: removed "Text link"; "Copy customer link" is the only way to share the link.
- Home page logo now fades into the page with a radial mask and a soft blue/purple glow, instead of showing as a square. Uses a smaller 800px copy (`logo-800.webp`, 124 KB instead of 368 KB); the header and favicon use a 96px copy (5 KB).
- Removed the "We don't take calls" line from the home page.
- Works on phones over plain http (LAN testing) and inside in-app browsers such as Messenger: booking ids fall back from `crypto.randomUUID` to `crypto.getRandomValues`, and Copy buttons fall back when the Clipboard API is blocked (new `src/lib/browser.ts`, checked by `scripts/check-uuid.ts` in `npm run check`). Toasts still show on phones without the popover API.
- Mobile web pass on the customer pages at 320–414 px: the GCash number is a card with a "Copy number" button, "Decline quote" and "Copy link" are full buttons instead of small text links, footer links have larger tap areas, and the header fits on one line on the narrowest phones. Added an Apple touch icon for iPhone bookmarks.
- Docs: phone testing with `npm run dev -- --host` (`docs/DEVELOPMENT.md`, Mobile).

## 2026-09-29 — Redesign, admin status tabs, decline quote, GCash only

- **Tailwind CSS v4** replaces the hand-written CSS (`tailwindcss`, `@tailwindcss/vite` dev dependencies). Theme tokens and shared classes in `src/index.css`; fonts Chakra Petch and Instrument Sans from Google Fonts.
- **Look:** the customer's booking page is now a repair ticket with a short ticket number and a circuit-trace progress bar (Requested, Quoted, Confirmed, Repaired). Home page adds "How booking works". Booking form uses tiles for device type and time.
- **Admin:** status tabs with counts and a color each (Pending, Quoted, Accepted, Done, Cancelled; Quoted shows how many have paid). Rows show only time, name, device and price; everything else is in a modal opened by clicking a row. Send quote shows the downpayment as you type. "Text link" opens SMS with the customer's link. The list reloads when the window regains focus. The past 30 days are now included, so Done and Cancelled aren't empty.
- **Confirmations and feedback:** booking, submitting a GCash reference, declining a quote, sending a quote, confirming payment, marking done, and cancelling all ask first and show a success or error message after. Replaces the browser's `confirm()` popups.
- **Decline quote:** customers can decline a quote on their ticket (new `declined` status; frees the slot; shown in the admin's Cancelled tab). Not offered once they've submitted a payment reference.
- **Maya removed** at the client's request: GCash only, also enforced in the database.
- Admin updates now only apply if the booking hasn't changed status in the meantime.
- Header link renamed from "Log in" to "Staff login", so customers don't think they need an account.
- Database migration `decline_quote_gcash_only`: `declined` status, `decline_quote(id)` function, slot index and `taken_slots()` ignore declined bookings, `payment_method` must be `gcash`.

## 2026-09-29 — Quotes, 20% downpayment, GCash/Maya payment

- New booking flow: pending → quoted (admin sets price) → customer pays 20% downpayment by GCash or Maya and submits the reference number → admin confirms → done.
- Database (migration `quotes_and_downpayment`): `price`, generated `downpayment` (20% of price), `payment_method`, `payment_ref`, `paid_at`; new `quoted` status; `booking(id)` and `submit_payment(id, method, ref)` functions for the customer's booking link. Anon inserts can no longer set price or payment fields.
- Booking page: after booking, the customer lands on `/book/?id=<id>`, which shows status, quote, payment instructions, and the reference-number form.
- Admin: price column, "Send quote" on pending rows, "Confirm payment" on quoted rows (warns if no reference yet), "Copy customer link" to text to the customer.
- GCash/Maya account numbers and names in `PAYMENT` (`src/lib/business.ts`) are placeholders until the client confirms them.

## 2026-09-29 — Client contact details

- Contact phone `0965 553 3389` (SMS and WhatsApp, no `tel:` call links) and contact email in `src/lib/business.ts`; shown on the home page and in the footer. WhatsApp link assumes a Philippine number (`+63`).
- Booking page messages say "message us by SMS or WhatsApp" instead of "call us".

## 2026-09-29 — Staff login link

- Header (all pages) has a "Log in" link to `/admin/`, which shows the sign-in form and then the appointments dashboard.

## 2026-09-29 — First build

- Replaced the Vite template with the IAMTech site: landing page (`/`), booking page (`/book/`), admin page (`/admin/`).
- Vite multi-page build; one shared entry (`src/main.tsx`) lazy-loads each page.
- Dark theme from the logo (near-black, blue → purple). Logo renamed to `public/logo.webp` and used as the favicon.
- Business details, services, hours, and slot generation in `src/lib/business.ts` (placeholders until the client supplies real values), with `npm run check` self-check.
- Supabase: `appointments` table, double-booking protection, RLS (public insert-only, admin read/update via `app_metadata.role = 'admin'`), `taken_slots()` function. Applied to the project as migration `appointments`; source in `supabase/schema.sql`.
- Added `@supabase/supabase-js`. Env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Docs: architecture, setup, and deploy (now `docs/DEVELOPMENT.md`).
