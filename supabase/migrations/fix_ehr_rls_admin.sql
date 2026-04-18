-- ── Fix EHR RLS — allow admin email users to manage all EHR tables ───────────
-- Run this in Supabase SQL Editor

-- ── ehr_charts ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinicians manage ehr_charts" ON ehr_charts;
DROP POLICY IF EXISTS "Clinicians and admins manage ehr_charts" ON ehr_charts;

CREATE POLICY "Clinicians and admins manage ehr_charts" ON ehr_charts
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );

-- ── ehr_notes ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinicians manage ehr_notes" ON ehr_notes;
DROP POLICY IF EXISTS "Clinicians and admins manage ehr_notes" ON ehr_notes;

CREATE POLICY "Clinicians and admins manage ehr_notes" ON ehr_notes
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );

-- ── ehr_medications ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinicians manage ehr_medications" ON ehr_medications;
DROP POLICY IF EXISTS "Clinicians and admins manage ehr_medications" ON ehr_medications;

CREATE POLICY "Clinicians and admins manage ehr_medications" ON ehr_medications
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );

-- ── ehr_documents ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinicians manage ehr_documents" ON ehr_documents;
DROP POLICY IF EXISTS "Clinicians and admins manage ehr_documents" ON ehr_documents;

CREATE POLICY "Clinicians and admins manage ehr_documents" ON ehr_documents
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );

-- ── intake_submissions ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinicians read all intakes" ON intake_submissions;
DROP POLICY IF EXISTS "Clinicians update intake status" ON intake_submissions;
DROP POLICY IF EXISTS "Clinicians and admins read all intakes" ON intake_submissions;
DROP POLICY IF EXISTS "Clinicians and admins update intake status" ON intake_submissions;

CREATE POLICY "Clinicians and admins read all intakes" ON intake_submissions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );

CREATE POLICY "Clinicians and admins update intake status" ON intake_submissions
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clinician_roles WHERE user_id = auth.uid())
    OR auth.email() IN (
      'info@mindshiftwellnessclinic.org',
      'jerlessm@gmail.com',
      'kmutegyeki@mindshiftwellnessclinic.org',
      'rnakkazi@mindshiftwellnessclinic.org'
    )
  );
