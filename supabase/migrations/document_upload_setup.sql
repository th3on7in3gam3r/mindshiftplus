-- ── RUN THIS IN YOUR SUPABASE SQL EDITOR ─────────────────────────────────────
-- Document Upload Setup for MindShift Wellness Clinic Patient Portal

-- 1. Fix portal_documents RLS policies to allow patient uploads
drop policy if exists "Own documents" on portal_documents;
drop policy if exists "Own documents read" on portal_documents;
drop policy if exists "Own documents insert" on portal_documents;
drop policy if exists "Own documents delete" on portal_documents;
drop policy if exists "Clinician reads documents" on portal_documents;

create policy "Patients read own documents" on portal_documents
  for select using (auth.uid() = patient_id);

create policy "Patients upload documents" on portal_documents
  for insert with check (auth.uid() = patient_id);

create policy "Patients delete own documents" on portal_documents
  for delete using (auth.uid() = patient_id);

create policy "Clinician reads all documents" on portal_documents
  for select using (true);

-- 2. Create Supabase Storage bucket for patient documents
-- (Run this separately if the bucket doesn't exist yet)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  true,
  10485760, -- 10MB max file size
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- 3. Storage bucket RLS policies
drop policy if exists "Patients upload own files" on storage.objects;
drop policy if exists "Patients read own files" on storage.objects;
drop policy if exists "Patients delete own files" on storage.objects;
drop policy if exists "Clinician reads all files" on storage.objects;

create policy "Patients upload own files" on storage.objects
  for insert with check (
    bucket_id = 'patient-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Patients read own files" on storage.objects
  for select using (
    bucket_id = 'patient-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Patients delete own files" on storage.objects
  for delete using (
    bucket_id = 'patient-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Clinician reads all patient files" on storage.objects
  for select using (
    bucket_id = 'patient-documents'
  );

create policy "Public read patient documents" on storage.objects
  for select using (bucket_id = 'patient-documents');
