-- ── APPOINTMENTS TABLE ONLY ──────────────────────────────────────────────────
-- Run this in Supabase SQL Editor to fix the missing appointments

-- Drop existing policies to avoid conflicts
drop policy if exists "Own appointments" on appointments;
drop policy if exists "Public insert" on appointments;
drop policy if exists "Patients read own appointments" on appointments;
drop policy if exists "Patients insert own appointments" on appointments;
drop policy if exists "Patients update own appointments" on appointments;
drop policy if exists "Public can book appointments" on appointments;
drop policy if exists "Admin reads all appointments" on appointments;

-- Create table
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  reason text,
  provider_name text default 'Kenneth Mutegyeki, PMHNP-BC',
  appointment_type text,
  scheduled_at timestamptz,
  duration_minutes int default 60,
  location text default 'Milford',
  status text default 'pending',
  notes text,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table appointments enable row level security;

-- Policies
create policy "Patients read own appointments" on appointments
  for select using (auth.uid() = patient_id);

create policy "Patients insert appointments" on appointments
  for insert with check (auth.uid() = patient_id OR patient_id is null);

create policy "Patients update own appointments" on appointments
  for update using (auth.uid() = patient_id);

create policy "Public can book" on appointments
  for insert with check (patient_id is null and is_public = true);

-- Admin can read all
create policy "Admin reads all" on appointments
  for select using (true);

-- Index
create index if not exists idx_appointments_scheduled on appointments(scheduled_at);
create index if not exists idx_appointments_patient on appointments(patient_id);
