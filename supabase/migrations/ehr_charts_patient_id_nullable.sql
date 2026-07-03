-- Allow EHR charts without a linked portal account (walk-ins / manual charts).
-- patient_id can be linked later via MindShift Admin → Patient Lookup.
ALTER TABLE ehr_charts ALTER COLUMN patient_id DROP NOT NULL;
