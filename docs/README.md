# IAMTech Web

Marketing site and appointment booking for IAMTech phone and laptop repair.

- `/` — landing page (hero, services, hours, contact)
- `/book/` — customers pick a date and a free time slot and submit their details
- `/book/?id=<booking id>` — the customer's repair ticket: progress, quote, where to pay the downpayment, or decline the quote
- `/admin/` — staff sign in to quote, confirm, cancel, or mark appointments done (reached from the "Staff login" link in the header)

## Stack

React 19 + TypeScript, built with Vite 8 as a **multi-page app** (no router). Data and login are **Supabase** (Postgres + Auth); the only runtime dependency besides React is `@supabase/supabase-js`. Styling is **Tailwind CSS v4** through `@tailwindcss/vite` (build time only).

### Styling

- `src/index.css` imports Tailwind and defines the theme in `@theme`: colors (`void`, `panel`, `raised`, `line`, `mist`, `silver`, `chrome`, `volt`, `plasma`, `danger`, and one per status), fonts (`font-display` = Chakra Petch, `font-sans` = Instrument Sans, loaded from Google Fonts in each HTML entry), and two animations. Use them as normal utilities, e.g. `bg-panel text-chrome border-line`.
- Shared classes there: `.btn` with `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-lg`; `.panel`, `.field` (label wrapper), `.input`, `.link`, `.modal`, `.chip`.
- Status colors: add `tone-<status>` (e.g. `tone-quoted`) to an element to set `--tone`, then use `chip`, `border-(--tone)` or `bg-(--tone)/12` inside it.
- `src/components/ui.tsx`: `Modal` (native `<dialog>`: Esc, close button, backdrop click), `Confirm` (confirmation dialog, driven by an `Ask` object), `Toast` (popover, so it shows above open dialogs).

## Layout

```
index.html, book/index.html, admin/index.html   HTML entries; each sets <div id="root" data-page="…">
src/main.tsx               shared entry: lazy-loads the page named by data-page and mounts it
src/pages/Home.tsx         landing page
src/pages/Book.tsx         booking form + customer repair ticket
src/pages/Admin.tsx        login + repair queue (status tabs, detail modal)
src/components/Layout.tsx  header, footer
src/components/ui.tsx      Modal, Confirm, Toast
src/lib/business.ts        contact details, GCash account, downpayment rate, services, opening hours, slot length, slotsFor()
src/lib/format.ts          peso amounts, ticket numbers, dates and times
src/lib/supabase.ts        Supabase client
src/index.css              Tailwind theme and shared classes
supabase/schema.sql        database schema, RLS policies, taken_slots() function
src/lib/browser.ts         fallbacks for phones and in-app browsers: uuid(), copyText()
scripts/check-slots.ts     self-check for slotsFor() (npm run check)
scripts/check-uuid.ts      self-check for the uuid() fallback (npm run check)
public/logo.webp           original logo (source for the files below)
public/logo-800.webp       home page logo
public/logo-96.webp        header logo and favicon
public/apple-touch-icon.png  icon iPhones show for bookmarks
```

**Editing business details:** everything the client may change (phone, email, address, GCash account, services, hours, slot length) lives in `src/lib/business.ts`. After changing hours, update the expectations in `scripts/check-slots.ts` and run `npm run check`.

## Setup

```sh
npm install
cp .env.example .env.local   # then fill in the key, see below
npm run dev
```

Environment variables (`.env.local`, gitignored; set the same two in the hosting dashboard):

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Project URL, e.g. `https://eqngknbqlzrowzqlroge.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API keys → publishable key (`sb_publishable_…`) |

The publishable key is public by design; all protection is enforced in the database.

## Commands

- `npm run dev` — dev server (`npm run dev -- --host` to open it from a phone, see Mobile)
- `npm run build` — type-check and build to `dist/`
- `npm run lint` — Oxlint
- `npm run check` — self-checks for slot generation and the uuid fallback
- `npm run preview` — serve `dist/`

## Database and security

Schema is in `supabase/schema.sql` (applied to the project as migrations `appointments`, `quotes_and_downpayment`, and `decline_quote_gcash_only`). Table `appointments` holds one row per booking.

### Booking flow

Admin tabs use the client's words; one differs from the database value: **Accepted** = `confirmed`.

1. Customer fills in the form, reviews a summary, and confirms: status **pending**. They land on their repair ticket `/book/?id=<id>`.
2. Admin opens the booking, enters a price (the modal previews the downpayment) and confirms **Send quote**: status **quoted**. The database computes `downpayment` as 20% of `price` (generated column), so it can't be set wrong. Admin uses **Text link** (opens SMS with the link filled in, on phones) or **Copy link** to send the customer their ticket.
3. Customer sends the downpayment to the GCash account in `GCASH` (`src/lib/business.ts`) and submits the reference number. Or they **decline the quote**: status **declined**, the slot is freed, and it shows under the admin's Cancelled tab. Declining isn't offered once a reference is submitted (there's money to refund, so they message the shop).
4. Admin checks the reference in GCash and confirms **Confirm payment**: status **confirmed** (Accepted). The balance is paid at the shop.
5. After the repair: **Mark done**. **Cancel appointment** is available until then (refunds are manual); cancelling frees the slot.

Every action asks for confirmation first (cancel and decline are marked as dangerous and focus the safe choice) and shows a message after it succeeds or fails.

The slot stays reserved while pending or quoted. To change the downpayment rate, change `0.2` in the `downpayment` column (new migration) and `DOWNPAYMENT_RATE` in `src/lib/business.ts` (used for the page text and the admin preview).

### Security

- **No double-booking:** a unique index on `slot_start` (ignoring cancelled and declined rows) makes the database reject a second booking of the same slot, even if two people submit at once. The booking page shows "that time was just booked" and reloads free slots.
- **Public (anon) can only insert** a `pending` booking for a future time. It cannot read, change, or delete any appointment.
- **Free slots:** `taken_slots(from_ts, to_ts)` returns only booked times (no customer data), so the booking page can hide them.
- **Booking link:** the id is a random UUID made in the customer's browser, known only to them and the admin. `booking(id)` returns that booking's time, device, status, and price (no contact details). `submit_payment(id, method, ref)` works only while the booking is `quoted` and sets only the payment fields (method must be `gcash`). `decline_quote(id)` works only while `quoted` with no reference submitted. Anon inserts cannot set price or payment fields.
- **Stale admin actions:** admin updates only apply if the booking is still in the status the admin was looking at; otherwise nothing changes and the admin sees "changed in the meantime".
- **Admin:** only a signed-in user whose `app_metadata.role` is `admin` can read and update appointments. `app_metadata` can only be set with the service role, so even if someone manages to sign up, they see nothing.

### Admin accounts

| Email | Who |
|-------|-----|
| `ampolconcepcion88@gmail.com` | Client (business owner) |
| `mitzignacio2252@gmail.com` | Developer |

Passwords are not stored in the repo. Change a password in Supabase → Authentication → Users. The client's initial password was shared in chat and is weak; change it before launch.

### Creating another admin user

1. Supabase dashboard → Authentication → Sign In / Providers: turn **off** "Allow new users to sign up".
2. Authentication → Users → Add user → create the admin's email and password (auto-confirm).
3. SQL editor:
   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
   where email = 'ADMIN_EMAIL_HERE';
   ```
4. Sign in at `/admin/` (sign out and in again if already signed in, so the new role is in the session).

### Time zones

Slots are generated in the visitor's browser time zone and stored as `timestamptz`. This is correct as long as customers book from the same time zone as the shop.

## Mobile

- **Testing on a phone:** run `npm run dev -- --host`, then open the `Network` address it prints (e.g. `http://192.168.100.27:5173`) on a phone on the same Wi-Fi. Windows may ask to allow Node.js through the firewall; allow it on private networks.
- **Plain http and in-app browsers:** over the LAN the page is plain `http`, and customers often open their link inside Messenger or Facebook. Both can block newer browser features, so `src/lib/browser.ts` has fallbacks: `uuid()` for new booking ids (`crypto.randomUUID` needs HTTPS) and `copyText()` for Copy buttons (the Clipboard API is sometimes missing). The toast falls back to a plain box on phones without the popover API (iOS before 17). Tailwind v4 itself needs iOS 16.4+ / Chrome 111+.
- **Phone layout:** customer pages are checked at 320, 360, 390 and 414 px wide: no sideways scrolling, and buttons are at least 32 px tall (the GCash number, Decline quote and Copy link are full buttons, not text links). On phones narrower than 352 px the header hides the "IAMTech" name next to the logo so the menu fits on one line.
- After replacing `public/logo.webp`, regenerate the smaller logo and icon files from it at the same sizes.

## Deploy (Netlify or Vercel)

Connect the GitHub repo. Build command `npm run build`, publish directory `dist`. Add the two environment variables. No rewrite rules are needed: `/book/` and `/admin/` are real HTML files.
