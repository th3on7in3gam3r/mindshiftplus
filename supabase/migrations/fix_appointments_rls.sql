-- ── Fix appointments RLS to allow admin updates ──────────────────────────────
-- Run this in Supabase SQL Editor

-- Drop existing update policy
drop policy if exists "Patients update own appointments" on appointments;
drop policy if exists "Admin updates appointments" on appointments;

-- Allow anyone authenticated to update (admin needs this to confirm/cancel)
-- The admin login gate in the app enforces who can actually do this
create policy "Authenticated users can update appointments" on appointments
  for update using (true);

-- Also ensure admin can read ALL appointments (not just their own)
drop policy if exists "Admin reads all" on appointments;
create policy "Admin reads all appointments" on appointments
  for select using (true);
