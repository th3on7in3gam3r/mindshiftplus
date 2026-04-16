-- ── RUN ONLY THIS IN SUPABASE SQL EDITOR ─────────────────────────────────────
-- Only the two missing tables that are causing 404 errors

-- 1. Disclaimer acceptances
create table if not exists disclaimer_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  version text not null default '1.0',
  accepted_at timestamptz default now(),
  unique(user_id, version)
);
alter table disclaimer_acceptances enable row level security;
drop policy if exists "Own disclaimer" on disclaimer_acceptances;
create policy "Own disclaimer" on disclaimer_acceptances
  for all using (auth.uid() = user_id);

-- 2. Patient journal entries
create table if not exists patient_journal_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references auth.users(id) on delete cascade not null,
  title text,
  body text not null,
  mood text,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table patient_journal_entries enable row level security;
drop policy if exists "Own journal entries" on patient_journal_entries;
drop policy if exists "Clinician reads journal for appointment review" on patient_journal_entries;
create policy "Own journal entries" on patient_journal_entries
  for all using (auth.uid() = patient_id);
create policy "Clinician reads journal for appointment review" on patient_journal_entries
  for select using (true);

-- 3. Allow patients to insert their own documents
drop policy if exists "Own documents" on portal_documents;
create policy "Own documents read" on portal_documents
  for select using (auth.uid() = patient_id);
create policy "Own documents insert" on portal_documents
  for insert with check (auth.uid() = patient_id);
create policy "Own documents delete" on portal_documents
  for delete using (auth.uid() = patient_id);
-- Clinician can read all documents
drop policy if exists "Clinician reads documents" on portal_documents;
create policy "Clinician reads documents" on portal_documents
  for select using (true);
