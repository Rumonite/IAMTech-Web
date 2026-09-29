-- IAMTech appointments schema. Applied to the Supabase project as migrations `appointments`,
-- `quotes_and_downpayment`, and `decline_quote_gcash_only`.
-- Security lives here: the browser only holds the publishable key.

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  slot_start timestamptz not null,
  name text not null check (char_length(name) between 1 and 100),
  phone text not null check (char_length(phone) between 5 and 30),
  email text not null check (char_length(email) between 3 and 200 and email like '%@%'),
  device text not null check (char_length(device) between 1 and 50),
  issue text not null check (char_length(issue) between 1 and 2000),
  -- pending (awaiting quote) -> quoted (awaiting downpayment) -> confirmed -> done.
  -- declined = customer turned down the quote; cancelled = admin cancelled. Both free the slot.
  status text not null default 'pending' check (status in ('pending', 'quoted', 'confirmed', 'declined', 'cancelled', 'done')),
  created_at timestamptz not null default now(),
  -- Quote in PHP set by admin; the 20% downpayment is derived here so it can't drift.
  price numeric(10,2) check (price > 0),
  downpayment numeric(10,2) generated always as (round(price * 0.2, 2)) stored,
  -- Customer's GCash transfer, submitted via submit_payment() and checked by admin.
  payment_method text check (payment_method = 'gcash'),
  payment_ref text check (char_length(payment_ref) between 4 and 50),
  paid_at timestamptz,
  constraint appointments_quote_has_price check (status <> 'quoted' or price is not null)
);

-- One live booking per slot, enforced even under concurrent submits.
create unique index appointments_slot_taken on public.appointments (slot_start) where status not in ('cancelled', 'declined');

alter table public.appointments enable row level security;

-- Admin = a user whose app_metadata.role is 'admin' (only settable with the service role),
-- so an accidental public sign-up still cannot read customer data.
create or replace function public.is_admin() returns boolean
language sql stable
set search_path = ''
as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) $$;

create policy "public can book future slots" on public.appointments
  for insert to anon, authenticated
  with check (status = 'pending' and slot_start > now()
    and price is null and payment_method is null and payment_ref is null and paid_at is null);

create policy "admin reads appointments" on public.appointments
  for select to authenticated using ((select public.is_admin()));

create policy "admin updates appointments" on public.appointments
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Booked slot times only (no customer data), so the booking page can hide them.
create or replace function public.taken_slots(from_ts timestamptz, to_ts timestamptz)
returns setof timestamptz
language sql stable
security definer
set search_path = ''
as $$
  select slot_start from public.appointments
  where status not in ('cancelled', 'declined') and slot_start >= from_ts and slot_start < to_ts
$$;

revoke execute on function public.taken_slots(timestamptz, timestamptz) from public;
grant execute on function public.taken_slots(timestamptz, timestamptz) to anon, authenticated;

-- The customer's booking link (/book/?id=<uuid>) is the secret: the random id is only known to
-- the customer and admin. Returns no contact details.
create or replace function public.booking(booking_id uuid)
returns table (slot_start timestamptz, device text, status text, price numeric, downpayment numeric, payment_method text, payment_ref text)
language sql stable
security definer
set search_path = ''
as $$
  select a.slot_start, a.device, a.status, a.price, a.downpayment, a.payment_method, a.payment_ref
  from public.appointments a where a.id = booking_id
$$;

-- Customer records their downpayment transfer. Only while quoted; resubmitting overwrites (typo fixes).
create or replace function public.submit_payment(booking_id uuid, method text, ref text)
returns boolean
language sql volatile
security definer
set search_path = ''
as $$
  with u as (
    update public.appointments
    set payment_method = method, payment_ref = trim(ref), paid_at = now()
    where id = booking_id and status = 'quoted'
    returning 1
  )
  select exists (select 1 from u)
$$;

-- Customer turns down the quote, freeing the slot. Not once they've sent a payment reference:
-- then there's money to refund, so they message the shop instead.
create or replace function public.decline_quote(booking_id uuid)
returns boolean
language sql volatile
security definer
set search_path = ''
as $$
  with u as (
    update public.appointments set status = 'declined'
    where id = booking_id and status = 'quoted' and payment_ref is null
    returning 1
  )
  select exists (select 1 from u)
$$;

revoke execute on function public.booking(uuid) from public;
revoke execute on function public.submit_payment(uuid, text, text) from public;
revoke execute on function public.decline_quote(uuid) from public;
grant execute on function public.booking(uuid) to anon, authenticated;
grant execute on function public.submit_payment(uuid, text, text) to anon, authenticated;
grant execute on function public.decline_quote(uuid) to anon, authenticated;
