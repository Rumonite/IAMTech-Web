-- IAMTech appointments schema. Applied to the Supabase project as migration `appointments`.
-- Security lives here: the browser only holds the publishable key.

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  slot_start timestamptz not null,
  name text not null check (char_length(name) between 1 and 100),
  phone text not null check (char_length(phone) between 5 and 30),
  email text not null check (char_length(email) between 3 and 200 and email like '%@%'),
  device text not null check (char_length(device) between 1 and 50),
  issue text not null check (char_length(issue) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'done')),
  created_at timestamptz not null default now()
);

-- One live booking per slot, enforced even under concurrent submits.
create unique index appointments_slot_taken on public.appointments (slot_start) where status <> 'cancelled';

alter table public.appointments enable row level security;

-- Admin = a user whose app_metadata.role is 'admin' (only settable with the service role),
-- so an accidental public sign-up still cannot read customer data.
create or replace function public.is_admin() returns boolean
language sql stable
set search_path = ''
as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) $$;

create policy "public can book future slots" on public.appointments
  for insert to anon, authenticated
  with check (status = 'pending' and slot_start > now());

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
  where status <> 'cancelled' and slot_start >= from_ts and slot_start < to_ts
$$;

revoke execute on function public.taken_slots(timestamptz, timestamptz) from public;
grant execute on function public.taken_slots(timestamptz, timestamptz) to anon, authenticated;
