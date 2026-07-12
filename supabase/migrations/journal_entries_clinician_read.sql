-- Allow clinic staff to read MindShift+ wellness journal (journal_entries) for appointment review.
-- Same pattern as patient_journal_entries clinician read policy.
-- Run in Supabase SQL Editor if clinicians get empty results for MindShift+ Journal tab.

drop policy if exists "Clinician reads wellness journal for review" on journal_entries;

create policy "Clinician reads wellness journal for review" on journal_entries
  for select using (auth.role() = 'authenticated');
