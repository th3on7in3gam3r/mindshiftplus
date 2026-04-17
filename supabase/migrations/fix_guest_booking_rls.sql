-- ── Fix guest booking RLS — allow unauthenticated inserts ────────────────────
-- Run this in Supabase SQL Editor

-- Drop all existing appointment policies to start clean
drop policy if exists "Own appointments"                      on appointments;
drop policy if exists "Public insert"                         on appointments;
drop policy if exists "Patients read own appointments"        on appointments;
drop policy if exists "Patients insert appointments"          on appointments;
drop policy if exists "Patients insert own appointments"      on appointments;
drop policy if exists "Patients update own appointments"      on appointments;
drop policy if exists "Public can book"                       on appointments;
drop policy if exists "Public can book appointments"          on appointments;
drop policy if exists "Admin reads all"                       on appointments;
drop policy if exists "Admin reads all appointments"          on appointments;
drop policy if exists "Authenticated users can update appointments" on appointments;

-- 1. Anyone (including unauthenticated guests) can INSERT a public booking
create policy "Guest booking insert" on appointments
  for insert
  with check (true);

-- 2. Logged-in patients can read their own appointments
create policy "Patients read own" on appointments
  for select
  using (auth.uid() = patient_id);

-- 3. Anyone can read appointments (needed for slot availability check)
create policy "Anyone reads appointments" on appointments
  for select
  using (true);

-- 4. Authenticated users can update (clinicians confirming/cancelling)
create policy "Authenticated update" on appointments
  for update
  using (auth.role() = 'authenticated');
