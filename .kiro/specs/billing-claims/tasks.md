# Implementation Plan: Billing & Claims (Phase 5)

## Overview

Implement the full billing lifecycle on top of the existing React 19 + Vite + Supabase stack. Work proceeds bottom-up: database migration → data-access layer → EHR UI components → Portal UI component → integration into existing pages.

## Tasks

- [x] 1. Create the Supabase migration for billing data
  - Create `supabase/migrations/billing_claims.sql`
  - Define `billing_claims` table with all columns from the design: `id`, `patient_id`, `chart_id`, `appointment_id` (nullable), `note_id` (nullable), `cpt_codes` (jsonb), `claim_status` (text with CHECK constraint), `service_date`, all four money columns (integer cents), `submitted_at`, `paid_at`, `notes`, `created_by`, `created_at`, `updated_at`
  - Add `ALTER TABLE ehr_notes ADD COLUMN IF NOT EXISTS cpt_codes jsonb DEFAULT '[]'`
  - Enable RLS on `billing_claims`
  - Add `clinicians_full_access` policy (FOR ALL, checks `clinician_roles` membership)
  - Add `patients_read_own` policy (FOR SELECT, `patient_id = auth.uid()`)
  - Add indexes: `idx_billing_claims_patient_id`, `idx_billing_claims_chart_id`, `idx_billing_claims_status`, `idx_billing_claims_service_date` (DESC)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

- [x] 2. Implement `src/lib/billingDb.js` — constants and pure utility functions
  - Export `CPT_CODES` array with all 10 required codes and descriptions (90791, 90792, 90832, 90834, 90837, 90847, 90853, 99213, 99214, 99215)
  - Implement `formatCents(cents)` → `"$120.00"` string
  - Implement `parseDollars(str)` → integer cents; clamp negative input to 0
  - Implement `filterCptCodes(query)` — case-insensitive substring match on `code` or `description`; empty query returns full list
  - Implement `computePatientBalance(claims)` — sum of `(patient_responsibility_cents - copay_collected_cents)` for all claims where `claim_status !== "paid"`
  - Implement `validateFinancials(claim)` — return warning string if `amount_paid_insurance_cents + patient_responsibility_cents > amount_billed_cents`; return error string if `claim_status === "paid"` and both `amount_paid_insurance_cents` and `copay_collected_cents` are zero; return `null` otherwise
  - _Requirements: 3.2, 3.3, 3.4, 3.6, 4.1, 8.1, 8.2_

  - [ ]* 2.1 Write property test for P7: cents formatting round-trip
    - **Property 7: For any non-negative integer cents, `parseDollars(formatCents(n).slice(1)) === n`**
    - Use `fc.integer({ min: 0, max: 10_000_000 })`
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 2.2 Write property test for P8: financial over-allocation validation
    - **Property 8: `validateFinancials` returns non-null when `paid_insurance + patient_responsibility > billed`, and null when ≤ billed**
    - Use `fc.tuple(fc.nat(), fc.nat(), fc.nat())` with filter
    - **Validates: Requirements 3.4**

  - [ ]* 2.3 Write property test for P9: paid status requires non-zero payment
    - **Property 9: `validateFinancials({ ...claim, claim_status: "paid" })` returns non-null when both payment fields are zero**
    - **Validates: Requirements 3.6**

  - [ ]* 2.4 Write property test for P10: patient balance computation
    - **Property 10: `computePatientBalance(claims)` equals manual sum of `(patient_responsibility_cents - copay_collected_cents)` for non-paid claims**
    - Use `fc.array(fc.record({ claim_status: fc.constantFrom("draft","submitted","accepted","denied","paid"), patient_responsibility_cents: fc.nat(), copay_collected_cents: fc.nat() }))`
    - **Validates: Requirements 4.1**

  - [ ]* 2.5 Write property test for P12: CPT filter correctness
    - **Property 12: Every item returned by `filterCptCodes(q)` contains `q` as a case-insensitive substring in `code` or `description`; no matching item is omitted**
    - Use `fc.string()` as query
    - **Validates: Requirements 8.2**

  - [ ]* 2.6 Write property test for P11: CPT code list completeness
    - **Property 11: `CPT_CODES` contains an entry for each of the 10 required codes with a non-empty description**
    - **Validates: Requirements 8.1**

- [x] 3. Implement `src/lib/billingDb.js` — Supabase query functions
  - Import `supabase` from `./supabase` (consistent with `ehrDb.js` pattern)
  - Implement `getClaims(patientId)` — SELECT from `billing_claims` WHERE `patient_id = patientId` ORDER BY `service_date DESC`; return `{ data, error }`
  - Implement `getAggregateClaims({ statusFilter, limit })` — SELECT all claims (clinician-only), optional WHERE `claim_status = statusFilter`, ORDER BY `service_date DESC`, LIMIT `limit`; return `{ data, error }`
  - Implement `createClaim(payload)` — validate that `appointment_id` or `note_id` is present; INSERT with `claim_status: "draft"` forced regardless of payload; return `{ data, error }`
  - Implement `updateClaim(id, patch)` — validate `claim_status` is in valid enum if present; set `submitted_at = now()` when transitioning to `"submitted"`, `paid_at = now()` when transitioning to `"paid"`; UPDATE and return `{ data, error }`
  - Implement `deleteClaim(id)` — fetch claim first; return `{ error: "Only draft claims may be deleted." }` if `claim_status !== "draft"`; otherwise DELETE; return `{ error }`
  - Implement `getMyBilling(patientId)` — SELECT from `billing_claims` WHERE `patient_id = patientId` ORDER BY `service_date DESC`; return `{ data, error }`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 2.9, 7.6_

  - [ ]* 3.1 Write property test for P3: new claims always have draft status
    - **Property 3: For any valid claim creation payload, the resulting `claim_status` is `"draft"` (test `createClaim` logic in isolation by checking the payload mutation)**
    - **Validates: Requirements 2.2**

  - [ ]* 3.2 Write property test for P5: non-draft claims cannot be deleted
    - **Property 5: `deleteClaim` called on a claim with status in `{"submitted","accepted","denied","paid"}` returns a non-null error and does not call Supabase DELETE**
    - **Validates: Requirements 2.8**

- [ ] 4. Checkpoint — Ensure all `billingDb.js` tests pass
  - Run `npm test` and confirm all property tests and unit tests in `src/tests/` pass. Ask the user if any test failures arise.

- [-] 5. Implement `src/components/ehr/EHRBilling.jsx` — `CptPicker` and `BalanceSummary`
  - Create `EHRBilling.jsx` with a named export `CptPicker` and a named export `BalanceSummary`
  - `CptPicker`: multi-select picker backed by `CPT_CODES`; renders a search input using `filterCptCodes`; selected codes shown as removable chips displaying both code and description; accepts `value` (array of CptCode) and `onChange` props
  - `BalanceSummary`: displays `computePatientBalance(claims)` formatted via `formatCents`; amber/red color when balance > 0; "No Balance Due" indicator when balance ≤ 0
  - Use `EhrCard`, `EhrBtn`, `EhrBadge`, `EhrInput` from `EHRUI.jsx`; respect `--ehr-*` CSS variables
  - _Requirements: 4.2, 4.3, 4.4, 5.2, 8.2, 8.3, 8.4_

- [-] 6. Implement `src/components/ehr/EHRBilling.jsx` — `ClaimForm`, `ClaimRow`, `ClaimList`
  - `ClaimForm`: create/edit form with fields for `service_date`, `cpt_codes` (uses `CptPicker`), `amount_billed_cents`, `amount_paid_insurance_cents`, `patient_responsibility_cents`, `copay_collected_cents` (all dollar inputs converted via `parseDollars`/`formatCents`), `claim_status` selector, free-text `notes`; calls `validateFinancials` and shows warning/error inline; blocks save when `validateFinancials` returns an error for paid status; accepts `claim` (optional, for edit), `onSaved`, `onCancel` props
  - `ClaimRow`: expandable row showing service date, CPT code badges, billed amount, status badge; expanded state shows all financial fields and timestamps; edit button (hidden for paid claims); delete button (draft only)
  - `ClaimList`: renders `ClaimRow` list sorted by `service_date` desc; empty state when no claims; "New Claim" button at top
  - Status badge color coding: `draft`=gray, `submitted`=blue, `accepted`=teal, `denied`=red/rose, `paid`=green
  - _Requirements: 2.3, 2.6, 2.7, 2.8, 2.9, 3.1, 3.3, 3.4, 3.5, 3.6, 5.3, 5.4, 5.5_

- [ ] 7. Implement `src/components/ehr/EHRBilling.jsx` — `EHRBilling` and `EHRBillingAggregate` default/named exports
  - `EHRBilling` (default export): per-patient tab; props `{ patientId, chartId, clinician }`; loads claims via `getClaims(patientId)` on mount; renders `BalanceSummary` + `ClaimList`; wires `ClaimForm` for create/edit; calls `createClaim`, `updateClaim`, `deleteClaim` from `billingDb`; shows inline error on Supabase errors
  - `EHRBillingAggregate` (named export): dashboard section; loads via `getAggregateClaims`; shows status count summary (draft/submitted/accepted/denied/paid), total outstanding balance across all patients, list of 10 most recent claims; status filter buttons; uses `EhrCard` layout
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.8_

- [ ] 8. Implement `src/components/portal/PortalBilling.jsx`
  - Create `PortalBilling.jsx` with a default export; props `{ userId, P }`
  - Load claims via `getMyBilling(userId)` on mount
  - Render `BalanceBanner` (prominent notice when `computePatientBalance(claims) > 0`) using `Alert` from `PortalUI`
  - Render `ClaimSummaryRow` for each claim: service date, CPT code list, `amount_billed_cents` formatted, `amount_paid_insurance_cents` formatted, `patient_responsibility_cents` formatted, status badge
  - Render `DeniedClaimNotice` inline for any claim with `claim_status === "denied"` directing patient to contact clinic
  - Empty state via `EmptyState` from `PortalUI` when no claims
  - Read-only — no create/edit/delete UI
  - Use `PageHeader`, `Card`, `Badge`, `EmptyState`, `Alert`, `T` from `PortalUI.jsx`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 9. Integrate billing into `EHRPatientChart.jsx`
  - Add `{ id: "billing", label: "Billing", icon: "💰" }` to the `TABS` array (after "Documents", before "AI Assistant")
  - Add `import EHRBilling from "./EHRBilling"` at the top
  - Add `tab === "billing"` branch in the tab content section rendering `<EHRBilling patientId={chart.patient_id} chartId={chart.id} clinician={clinician} />`
  - Add `import { CptPicker } from "./EHRBilling"` and add `CptPicker` to `NoteForm`: add `cpt_codes` field to form state (default `[]`); render `<CptPicker value={form.cpt_codes} onChange={codes => setForm(f => ({ ...f, cpt_codes: codes }))} />`; the existing `upsertNote` call already spreads `form`, so `cpt_codes` will be persisted automatically
  - Add non-blocking warning in `NoteForm` when `form.cpt_codes.length === 0` on submit attempt
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 5.1_

- [ ] 10. Integrate `EHRBillingAggregate` into `EHRDashboard.jsx`
  - Add `import { EHRBillingAggregate } from "./EHRBilling"` at the top
  - Render `<EHRBillingAggregate />` below the stats grid (before the patient list / appointments two-column layout)
  - _Requirements: 5.6, 5.7_

- [ ] 11. Integrate `PortalBilling` into `Portal.jsx`
  - Add `import PortalBilling from "./PortalBilling"` at the top
  - Add `{ id: "billing", icon: "💳", label: "Billing" }` to the `NAV` array (after "Visit Notes", before "My Profile")
  - Add `{page === "billing" && <PortalBilling userId={user?.id} P={P} />}` in the pages section
  - _Requirements: 6.1_

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Run `npm test` and confirm the full test suite passes. Ask the user if any failures arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All property tests go in `src/tests/billing.test.js` using Vitest + fast-check (both already in `devDependencies`)
- Each property test file should include the comment `// Feature: billing-claims, Property N: <property text>` per the design spec
- Monetary values are always stored as integer cents; `parseDollars`/`formatCents` are the only conversion points
- `billingDb.js` follows the `{ data, error }` return convention of `ehrDb.js`
- The `createClaim` function must force `claim_status: "draft"` regardless of what the caller passes
