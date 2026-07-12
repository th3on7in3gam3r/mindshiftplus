-- Allow clinic staff to upload documents for patients (Admin Dashboard → Patient Documents)
-- Run in Supabase SQL Editor after document_upload_setup.sql

drop policy if exists "Clinician upload documents" on portal_documents;
create policy "Clinician upload documents" on portal_documents
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "Clinician upload patient files" on storage.objects;
create policy "Clinician upload patient files" on storage.objects
  for insert with check (
    bucket_id = 'patient-documents'
    and auth.role() = 'authenticated'
  );
