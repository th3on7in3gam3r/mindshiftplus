-- Allow insurance claims for charts without a linked portal patient account
ALTER TABLE billing_claims ALTER COLUMN patient_id DROP NOT NULL;
