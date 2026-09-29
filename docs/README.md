# IAMTech Web

Marketing site and appointment booking for IAMTech phone and laptop repair.

- `/` — landing page (hero, services, hours, contact)
- `/book/` — customers pick a date and a free time slot and submit their details
- `/admin/` — staff sign in to view appointments and confirm, cancel, or mark them done (reached from the "Log in" link in the header)

## Stack

React 19 + TypeScript, built with Vite 8 as a **multi-page app** (no router). Data and login are **Supabase** (Postgres + Auth); the only runtime dependency besides React is `@supabase/supabase-js`. Styling is plain CSS in `src/index.css`.

## Layout

```
index.html, book/index.html, admin/index.html   HTML entries; each sets <div id="root" data-page="…">
src/main.tsx               shared entry: lazy-loads the page named by data-page and mounts it
src/pages/Home.tsx         landing page
src/pages/Book.tsx         booking form
src/pages/Admin.tsx        login + appointment table
src/components/Layout.tsx  header, footer
src/lib/business.ts        contact details, services, opening hours, slot length, slotsFor()
src/lib/supabase.ts        Supabase client
src/index.css              theme tokens and all styles
supabase/schema.sql        database schema, RLS policies, taken_slots() function
scripts/check-slots.ts     self-check for slotsFor() (npm run check)
public/logo.webp           logo, also used as favicon
```

**Editing business details:** everything the client may change (phone, email, address, services, hours, slot length) lives in `src/lib/business.ts`. After changing hours, update the expectations in `scripts/check-slots.ts` and run `npm run check`.

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

- `npm run dev` — dev server
- `npm run build` — type-check and build to `dist/`
- `npm run lint` — Oxlint
- `npm run check` — slot generation self-check
- `npm run preview` — serve `dist/`

## Database and security

Schema is in `supabase/schema.sql` (applied to the project as migration `appointments`). Table `appointments` holds one row per booking; `status` is `pending | confirmed | cancelled | done`.

- **No double-booking:** a unique index on `slot_start` (ignoring cancelled rows) makes the database reject a second booking of the same slot, even if two people submit at once. The booking page shows "that time was just booked" and reloads free slots.
- **Public (anon) can only insert** a `pending` booking for a future time. It cannot read, change, or delete any appointment.
- **Free slots:** `taken_slots(from_ts, to_ts)` returns only booked times (no customer data), so the booking page can hide them.
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

## Deploy (Netlify or Vercel)

Connect the GitHub repo. Build command `npm run build`, publish directory `dist`. Add the two environment variables. No rewrite rules are needed: `/book/` and `/admin/` are real HTML files.
