# Requirements Document

## Introduction

Phase 5 — Billing & Claims adds a full billing lifecycle to MindShift Wellness Clinic's React + Vite + Supabase web app. It covers CPT code attachment to appointments and visit notes, insurance claim creation and status tracking, session-level financial data (amount billed, amount paid, patient responsibility, copay), and payment status per patient. Clinicians access a billing dashboard inside the EHR (per-patient and aggregate views). Patients access a read-only billing summary inside the Patient Portal. All data lives in Supabase (new tables with RLS), accessed through a new `billingDb.js` library. No external payment processor is in scope for this phase.

---

## Glossary

- **Billing_System**: The Phase 5 billing and claims module as a whole.
- **Claim**: A record representing a single insurance claim for one clinical encounter, linked to an appointment and/or visit note.
- **Claim_Status**: The lifecycle state of a Claim — one of: `draft`, `submitted`, `accepted`, `denied`, `paid`.
- **CPT_Code**: A Current Procedural Terminology code (e.g., 90837, 90834) attached to an appointment or visit note to describe the service rendered.
- **Session_Billing**: The financial record for a single clinical session: amount billed, amount paid by insurance, patient responsibility, and copay collected.
- **Patient_Balance**: The sum of all outstanding patient responsibility amounts across a patient's Session_Billing records.
- **EHR_Billing_Dashboard**: The clinician-facing billing view inside the EHR patient chart (new "Billing" tab) and an aggregate billing view on the EHR dashboard.
- **Portal_Billing_Summary**: The patient-facing read-only billing view inside the Patient Portal (new "Billing" nav item).
- **Clinician**: An authenticated user with a row in `clinician_roles` (Kenneth Mutegyeki PMHNP-BC or Rachel Nakkazi PMHNP-BC) or an admin email.
- **Patient**: An authenticated Supabase user with a row in `patient_profiles` and/or `ehr_charts`.
- **billingDb**: The new `src/lib/billingDb.js` module that encapsulates all Supabase billing queries.

---

## Requirements

### Requirement 1: CPT Code Attachment

**User Story:** As a clinician, I want to attach one or more CPT codes to an appointment or visit note, so that I can accurately document the services rendered for billing purposes.

#### Acceptance Criteria

1. WHEN a clinician opens a visit note form in the EHR, THE Billing_System SHALL display a CPT code picker that allows selecting one or more CPT codes from a predefined list of common psychiatric CPT codes (minimum: 90791, 90837, 90834, 90832, 90847, 90853, 99213, 99214).
2. WHEN a clinician saves a visit note with CPT codes attached, THE Billing_System SHALL persist the CPT codes as a JSONB array on the `ehr_notes` record.
3. WHEN a clinician opens an existing signed or unsigned visit note, THE Billing_System SHALL display the currently attached CPT codes.
4. THE Billing_System SHALL allow a clinician to attach CPT codes to an appointment record independently of a visit note.
5. WHEN a CPT code is attached to a visit note, THE Billing_System SHALL automatically pre-populate the associated Claim's CPT codes if a Claim is created for that note.
6. IF a clinician attempts to save a visit note without any CPT code, THEN THE Billing_System SHALL display a non-blocking warning indicating that no CPT code is attached, but SHALL still allow saving.

---

### Requirement 2: Insurance Claim Creation and Management

**User Story:** As a clinician, I want to create and manage insurance claims per patient encounter, so that I can track the billing lifecycle from draft to payment.

#### Acceptance Criteria

1. WHEN a clinician creates a new Claim from the EHR_Billing_Dashboard, THE Billing_System SHALL require linking the Claim to either an appointment or a visit note (or both).
2. THE Billing_System SHALL assign a default Claim_Status of `draft` to every newly created Claim.
3. WHEN a clinician updates a Claim's status, THE Billing_System SHALL accept exactly one of the following values: `draft`, `submitted`, `accepted`, `denied`, `paid`.
4. WHEN a Claim's status is changed to `submitted`, THE Billing_System SHALL record the submission timestamp in the `submitted_at` field.
5. WHEN a Claim's status is changed to `paid`, THE Billing_System SHALL record the payment timestamp in the `paid_at` field.
6. THE Billing_System SHALL allow a clinician to add free-text notes to any Claim (e.g., denial reason, payer reference number).
7. WHEN a clinician deletes a Claim with status `draft`, THE Billing_System SHALL permanently remove the Claim record.
8. IF a clinician attempts to delete a Claim with status other than `draft`, THEN THE Billing_System SHALL reject the deletion and display an error message stating that only draft claims may be deleted.
9. THE Billing_System SHALL display all Claims for a patient in the EHR_Billing_Dashboard, ordered by service date descending.

---

### Requirement 3: Session Billing Financials

**User Story:** As a clinician, I want to record the financial details of each session, so that I can track what was billed, what insurance paid, and what the patient owes.

#### Acceptance Criteria

1. WHEN a clinician creates or edits a Claim, THE Billing_System SHALL provide fields for: amount billed (USD), amount paid by insurance (USD), patient responsibility (USD), and copay collected (USD).
2. THE Billing_System SHALL store all monetary values as integers in cents to avoid floating-point errors.
3. WHEN a clinician enters financial values, THE Billing_System SHALL display them formatted as USD currency (e.g., $120.00) in all read views.
4. WHEN a Claim's amount paid by insurance and patient responsibility are both set, THE Billing_System SHALL validate that `amount_paid_insurance + patient_responsibility ≤ amount_billed` and display a warning if the constraint is violated.
5. THE Billing_System SHALL allow a clinician to record a $0.00 copay (e.g., for patients with full insurance coverage).
6. WHEN a Claim's status is set to `paid`, THE Billing_System SHALL require that `amount_paid_insurance` or `copay_collected` is greater than zero.

---

### Requirement 4: Patient Balance Tracking

**User Story:** As a clinician, I want to see the total outstanding balance per patient, so that I can quickly identify patients with unpaid amounts.

#### Acceptance Criteria

1. THE Billing_System SHALL compute a patient's Patient_Balance as the sum of `patient_responsibility` minus `copay_collected` across all Claims for that patient where Claim_Status is not `paid`.
2. WHEN a clinician views the EHR_Billing_Dashboard for a patient, THE Billing_System SHALL display the Patient_Balance prominently at the top of the billing section.
3. WHEN a patient's Patient_Balance is greater than zero, THE Billing_System SHALL display the balance in a visually distinct style (e.g., amber/red color).
4. WHEN a patient's Patient_Balance is zero or negative, THE Billing_System SHALL display a "Paid in Full" or "No Balance Due" indicator.
5. THE Billing_System SHALL display a per-patient balance column in the aggregate EHR billing view accessible from the EHR dashboard.

---

### Requirement 5: EHR Billing Dashboard (Clinician-Facing)

**User Story:** As a clinician, I want a dedicated billing tab in each patient's EHR chart and an aggregate billing view on the EHR dashboard, so that I can manage claims and monitor billing status without leaving the EHR.

#### Acceptance Criteria

1. THE Billing_System SHALL add a "Billing" tab to the EHR patient chart tab bar (alongside Overview, Notes, Medications, Appointments, Messages, Documents, AI Assistant).
2. WHEN a clinician opens the Billing tab for a patient, THE Billing_System SHALL display: the Patient_Balance, a list of all Claims for that patient, and a button to create a new Claim.
3. WHEN a clinician clicks a Claim row in the EHR_Billing_Dashboard, THE Billing_System SHALL expand an inline detail view showing all Claim fields (CPT codes, financial amounts, status, notes, timestamps).
4. THE Billing_System SHALL allow a clinician to edit any Claim that is not in `paid` status directly from the inline detail view.
5. THE Billing_System SHALL display a Claim_Status badge for each Claim using color coding: `draft` = gray, `submitted` = blue, `accepted` = teal, `denied` = red, `paid` = green.
6. THE Billing_System SHALL add an aggregate "Billing" section to the EHR dashboard that shows: total claims by status (counts), total outstanding balance across all patients, and a list of the 10 most recent Claims across all patients.
7. WHEN a clinician views the aggregate billing section, THE Billing_System SHALL allow filtering Claims by Claim_Status.
8. THE EHR_Billing_Dashboard SHALL use the existing `--ehr-*` CSS variable theme system and respect the light/dark toggle.

---

### Requirement 6: Patient Portal Billing Summary (Patient-Facing)

**User Story:** As a patient, I want to view my billing summary in the Patient Portal, so that I can see what I owe and the status of my insurance claims without calling the clinic.

#### Acceptance Criteria

1. THE Billing_System SHALL add a "Billing" navigation item to the Patient Portal sidebar (alongside Appointments, Messages, Documents, etc.).
2. WHEN a patient navigates to the Portal_Billing_Summary, THE Billing_System SHALL display: the patient's current Patient_Balance, a list of all their Claims with service date, CPT codes, amount billed, amount paid by insurance, patient responsibility, and Claim_Status.
3. WHEN a patient's Patient_Balance is greater than zero, THE Billing_System SHALL display a prominent balance due notice at the top of the Portal_Billing_Summary.
4. THE Portal_Billing_Summary SHALL be read-only — patients SHALL NOT be able to create, edit, or delete Claims.
5. WHEN a patient views a Claim with status `denied`, THE Billing_System SHALL display a message directing the patient to contact the clinic.
6. THE Portal_Billing_Summary SHALL display monetary values formatted as USD currency.
7. WHEN a patient has no Claims on file, THE Billing_System SHALL display an empty state message indicating no billing records are available yet.
8. THE Portal_Billing_Summary SHALL use the existing Patient Portal design system (PortalUI components, `T` color tokens) and respect the light/dark theme.

---

### Requirement 7: Data Persistence and Security

**User Story:** As a system administrator, I want billing data stored securely in Supabase with proper row-level security, so that patients can only see their own billing data and clinicians can manage all billing data.

#### Acceptance Criteria

1. THE Billing_System SHALL store all Claim and Session_Billing data in a new `billing_claims` Supabase table with the following columns: `id` (uuid PK), `patient_id` (uuid FK → auth.users), `chart_id` (uuid FK → ehr_charts), `appointment_id` (uuid FK → appointments, nullable), `note_id` (uuid FK → ehr_notes, nullable), `cpt_codes` (jsonb, array of `{code, description}`), `claim_status` (text, default `draft`), `service_date` (date), `amount_billed_cents` (integer), `amount_paid_insurance_cents` (integer, default 0), `patient_responsibility_cents` (integer, default 0), `copay_collected_cents` (integer, default 0), `submitted_at` (timestamptz, nullable), `paid_at` (timestamptz, nullable), `notes` (text, nullable), `created_by` (uuid FK → auth.users), `created_at` (timestamptz), `updated_at` (timestamptz).
2. THE Billing_System SHALL enable Row Level Security on the `billing_claims` table.
3. WHILE a user is authenticated as a Clinician, THE Billing_System SHALL allow full CRUD access to all rows in `billing_claims`.
4. WHILE a user is authenticated as a Patient, THE Billing_System SHALL allow read-only SELECT access to rows in `billing_claims` where `patient_id = auth.uid()`.
5. IF an unauthenticated user attempts to access `billing_claims`, THEN THE Billing_System SHALL deny the request.
6. THE Billing_System SHALL provide all database interactions through the `billingDb.js` module, which SHALL use the existing `supabase` client from `src/lib/supabase.js`.
7. THE Billing_System SHALL provide a Supabase migration file at `supabase/migrations/billing_claims.sql` containing the table definition, RLS policies, and indexes.

---

### Requirement 8: CPT Code Reference Data

**User Story:** As a clinician, I want a curated list of common psychiatric CPT codes available in the picker, so that I can quickly select the correct code without memorizing codes.

#### Acceptance Criteria

1. THE Billing_System SHALL include a static CPT code reference list (defined in `billingDb.js` or a companion constants file) containing at minimum the following codes with descriptions:
   - 90791 — Psychiatric diagnostic evaluation
   - 90792 — Psychiatric diagnostic evaluation with medical services
   - 90832 — Psychotherapy, 30 min
   - 90834 — Psychotherapy, 45 min
   - 90837 — Psychotherapy, 60 min
   - 90847 — Family psychotherapy with patient present
   - 90853 — Group psychotherapy
   - 99213 — Office visit, established patient, low complexity
   - 99214 — Office visit, established patient, moderate complexity
   - 99215 — Office visit, established patient, high complexity
2. WHEN a clinician types in the CPT code picker, THE Billing_System SHALL filter the list by code number or description (case-insensitive substring match).
3. THE Billing_System SHALL allow a clinician to select multiple CPT codes for a single Claim.
4. WHEN a CPT code is selected, THE Billing_System SHALL display both the code number and its description in the selected state.
