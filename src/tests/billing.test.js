// Feature: billing-claims
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import {
  CPT_CODES,
  formatCents,
  parseDollars,
  filterCptCodes,
  computePatientBalance,
  validateFinancials,
  buildClaimPayloadFromNote,
  icd10FromNoteAndChart,
  resolveRenderingProvider,
  superbillNumber,
  placeOfServiceLabel,
  createClaim,
  deleteClaim,
  updateClaim,
  DEFAULT_BILLING_SETTINGS,
  normalizeInsurancePayers,
  payerCategoryLabel,
  insurancePayerOptions,
} from "../lib/billingDb.js";

// ── UNIT TESTS ─────────────────────────────────────────────────────────────────

describe("formatCents", () => {
  it("formats 0 as $0.00", () => {
    expect(formatCents(0)).toBe("$0.00");
  });

  it("formats 12050 as $120.50", () => {
    expect(formatCents(12050)).toBe("$120.50");
  });

  it("formats 100 as $1.00", () => {
    expect(formatCents(100)).toBe("$1.00");
  });
});

describe("parseDollars", () => {
  it("parses '120.50' to 12050", () => {
    expect(parseDollars("120.50")).toBe(12050);
  });

  it("returns 0 for empty string", () => {
    expect(parseDollars("")).toBe(0);
  });

  it("returns 0 for null", () => {
    expect(parseDollars(null)).toBe(0);
  });

  it("clamps negative values to 0", () => {
    expect(parseDollars("-5.00")).toBe(0);
  });
});

describe("computePatientBalance", () => {
  it("returns 0 for empty array", () => {
    expect(computePatientBalance([])).toBe(0);
  });

  it("excludes paid claims", () => {
    const claims = [
      { claim_status: "paid", patient_responsibility_cents: 5000, copay_collected_cents: 5000 },
      { claim_status: "draft", patient_responsibility_cents: 3000, copay_collected_cents: 1000 },
    ];
    expect(computePatientBalance(claims)).toBe(2000);
  });

  it("sums all non-paid claims", () => {
    const claims = [
      { claim_status: "submitted", patient_responsibility_cents: 2000, copay_collected_cents: 500 },
      { claim_status: "accepted", patient_responsibility_cents: 1000, copay_collected_cents: 0 },
    ];
    expect(computePatientBalance(claims)).toBe(2500);
  });
});

describe("validateFinancials", () => {
  it("returns null when amounts are equal", () => {
    expect(
      validateFinancials({
        amount_billed_cents: 10000,
        amount_paid_insurance_cents: 7000,
        patient_responsibility_cents: 3000,
        copay_collected_cents: 0,
        claim_status: "accepted",
      })
    ).toBeNull();
  });

  it("returns warning when insurance + patient_responsibility > billed", () => {
    const result = validateFinancials({
      amount_billed_cents: 10000,
      amount_paid_insurance_cents: 8000,
      patient_responsibility_cents: 5000,
      copay_collected_cents: 0,
      claim_status: "accepted",
    });
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });

  it("returns error for paid status with zero payments", () => {
    const result = validateFinancials({
      amount_billed_cents: 10000,
      amount_paid_insurance_cents: 0,
      patient_responsibility_cents: 5000,
      copay_collected_cents: 0,
      claim_status: "paid",
    });
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });
});

describe("filterCptCodes", () => {
  it("returns full list for empty query", () => {
    expect(filterCptCodes("")).toHaveLength(CPT_CODES.length);
  });

  it("returns full list for null query", () => {
    expect(filterCptCodes(null)).toHaveLength(CPT_CODES.length);
  });

  it("matches by code", () => {
    const result = filterCptCodes("90837");
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("90837");
  });

  it("matches case-insensitively by description", () => {
    const result = filterCptCodes("GROUP");
    expect(result.some((c) => c.code === "90853")).toBe(true);
  });
});

// ── PROPERTY-BASED TESTS ───────────────────────────────────────────────────────

// Feature: billing-claims, Property 7: cents formatting round-trip
describe("P7: cents formatting round-trip", () => {
  it("parseDollars(formatCents(n).slice(1)) === n for any non-negative integer cents", () => {
    // Validates: Requirements 3.2, 3.3
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000 }), (n) => {
        const formatted = formatCents(n);
        expect(formatted).toMatch(/^\$\d+\.\d{2}$/);
        const parsed = parseDollars(formatted.slice(1));
        return parsed === n;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: billing-claims, Property 8: financial over-allocation validation
describe("P8: financial over-allocation validation", () => {
  it("validateFinancials returns non-null when paid_insurance + patient_responsibility > billed", () => {
    // Validates: Requirements 3.4
    fc.assert(
      fc.property(
        fc.tuple(fc.nat({ max: 100000 }), fc.nat({ max: 100000 }), fc.nat({ max: 100000 })).filter(
          ([billed, ins, resp]) => ins + resp > billed
        ),
        ([billed, ins, resp]) => {
          const result = validateFinancials({
            amount_billed_cents: billed,
            amount_paid_insurance_cents: ins,
            patient_responsibility_cents: resp,
            copay_collected_cents: 0,
            claim_status: "accepted",
          });
          return result !== null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("validateFinancials returns null when paid_insurance + patient_responsibility <= billed", () => {
    // Validates: Requirements 3.4
    fc.assert(
      fc.property(
        fc.tuple(fc.nat({ max: 100000 }), fc.nat({ max: 100000 }), fc.nat({ max: 100000 })).filter(
          ([billed, ins, resp]) => ins + resp <= billed
        ),
        ([billed, ins, resp]) => {
          const result = validateFinancials({
            amount_billed_cents: billed,
            amount_paid_insurance_cents: ins,
            patient_responsibility_cents: resp,
            copay_collected_cents: 0,
            claim_status: "accepted",
          });
          return result === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: billing-claims, Property 9: paid status requires non-zero payment
describe("P9: paid status requires non-zero payment", () => {
  it("validateFinancials returns non-null for paid claim with both payment fields zero", () => {
    // Validates: Requirements 3.6
    fc.assert(
      fc.property(
        fc.record({
          amount_billed_cents: fc.nat({ max: 100000 }),
          amount_paid_insurance_cents: fc.constant(0),
          patient_responsibility_cents: fc.nat({ max: 100000 }),
          copay_collected_cents: fc.constant(0),
        }),
        (claim) => {
          const result = validateFinancials({ ...claim, claim_status: "paid" });
          return result !== null;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: billing-claims, Property 10: patient balance computation
describe("P10: patient balance computation", () => {
  it("computePatientBalance equals manual sum of non-paid claims", () => {
    // Validates: Requirements 4.1
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            claim_status: fc.constantFrom("draft", "submitted", "accepted", "denied", "paid"),
            patient_responsibility_cents: fc.nat({ max: 100000 }),
            copay_collected_cents: fc.nat({ max: 100000 }),
          })
        ),
        (claims) => {
          const expected = claims
            .filter((c) => c.claim_status !== "paid")
            .reduce(
              (sum, c) => sum + (c.patient_responsibility_cents - c.copay_collected_cents),
              0
            );
          return computePatientBalance(claims) === expected;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: billing-claims, Property 11: CPT code list completeness
describe("P11: CPT code list completeness", () => {
  it("CPT_CODES contains all 10 required codes with non-empty descriptions", () => {
    // Validates: Requirements 8.1
    const required = ["90791", "90792", "90832", "90834", "90837", "90847", "90853", "99213", "99214", "99215"];
    fc.assert(
      fc.property(fc.constantFrom(...required), (code) => {
        const entry = CPT_CODES.find((c) => c.code === code);
        return entry !== undefined && typeof entry.description === "string" && entry.description.length > 0;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: billing-claims, Property 12: CPT filter correctness
describe("P12: CPT filter correctness", () => {
  it("every result contains query as case-insensitive substring; no matching item is omitted", () => {
    // Validates: Requirements 8.2
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), (query) => {
        const results = filterCptCodes(query);
        const q = query.toLowerCase();

        // Every returned item must match
        const allMatch = results.every(
          (c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
        );

        // No matching item should be omitted
        const expectedCount = CPT_CODES.filter(
          (c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
        ).length;

        return allMatch && results.length === expectedCount;
      }),
      { numRuns: 100 }
    );
  });
});

// ── SUPABASE QUERY FUNCTION TESTS (mocked) ─────────────────────────────────────

// Mock supabase for query function tests
vi.mock("../lib/supabase.js", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    supabase: {
      from: vi.fn(() => mockChain),
    },
  };
});

// Feature: billing-claims, Property 3: new claims default to draft when status omitted
describe("P3: new claims default to draft status", () => {
  it("createClaim defaults claim_status to draft when omitted", async () => {
    const { supabase } = await import("../lib/supabase.js");

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          patient_id: fc.uuid(),
          chart_id: fc.uuid(),
          service_date: fc.constant("2024-01-01"),
          amount_billed_cents: fc.nat({ max: 100000 }),
        }),
        async (payload) => {
          let insertedPayload = null;
          const mockChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { ...payload, claim_status: "draft" }, error: null }),
            insert: vi.fn((p) => {
              insertedPayload = p;
              return mockChain;
            }),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
          };
          supabase.from.mockReturnValue(mockChain);

          await createClaim(payload);
          return insertedPayload?.claim_status === "draft";
        }
      ),
      { numRuns: 50 }
    );
  });
});

// Feature: billing-claims, Property 5: non-draft claims cannot be deleted
describe("P5: non-draft claims cannot be deleted", () => {
  it("deleteClaim returns error for non-draft claims without calling DELETE", async () => {
    // Validates: Requirements 2.8
    const { supabase } = await import("../lib/supabase.js");

    const nonDraftStatuses = ["submitted", "accepted", "denied", "paid"];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...nonDraftStatuses),
        fc.uuid(),
        async (status, id) => {
          let deleteWasCalled = false;
          const mockChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { claim_status: status }, error: null }),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn(() => {
              deleteWasCalled = true;
              return mockChain;
            }),
          };
          supabase.from.mockReturnValue(mockChain);

          const { error } = await deleteClaim(id);
          return error !== null && error !== undefined && !deleteWasCalled;
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe("icd10FromNoteAndChart", () => {
  it("prefers note diagnoses", () => {
    const result = icd10FromNoteAndChart(
      { diagnoses: [{ code: "F41.1", label: "GAD" }] },
      { primary_diagnosis: "F32.9" }
    );
    expect(result).toEqual([{ code: "F41.1", label: "GAD" }]);
  });

  it("falls back to chart primary diagnosis", () => {
    const result = icd10FromNoteAndChart({}, { primary_diagnosis: "F32.9", primary_diagnosis_label: "Depression" });
    expect(result).toEqual([{ code: "F32.9", label: "Depression" }]);
  });
});

describe("buildClaimPayloadFromNote", () => {
  it("builds insurance claim draft from note and chart", () => {
    const payload = buildClaimPayloadFromNote({
      note: { id: "n1", note_date: "2026-07-01", cpt_codes: [{ code: "90834", description: "Psychotherapy 45 min" }], diagnoses: [] },
      chart: { id: "c1", patient_id: "p1", insurance_provider: "Aetna", insurance_member_id: "123", insurance_group: "G1", primary_diagnosis: "F41.1", primary_diagnosis_label: "GAD" },
      clinician: { user_id: "u1", full_name: "Kenneth Mutegyeki" },
      settings: DEFAULT_BILLING_SETTINGS,
    });
    expect(payload.claim_type).toBe("insurance_claim");
    expect(payload.note_id).toBe("n1");
    expect(payload.cpt_codes[0].code).toBe("90834");
    expect(payload.icd10_codes[0].code).toBe("F41.1");
    expect(payload.insurance_provider).toBe("Aetna");
    expect(payload.claim_status).toBe("draft");
  });
});

describe("superbillNumber", () => {
  it("formats superbill id", () => {
    expect(superbillNumber({ id: "abcdef12-3456-7890-abcd-ef1234567890" })).toBe("SB-ABCDEF12");
  });
});

describe("normalizeInsurancePayers", () => {
  it("returns defaults when empty", () => {
    expect(normalizeInsurancePayers([]).some((p) => p.name === "Medicare")).toBe(true);
  });

  it("trims names and keeps valid categories", () => {
    const result = normalizeInsurancePayers([{ name: "  BCBS MA  ", category: "commercial" }]);
    expect(result).toEqual([{ name: "BCBS MA", category: "commercial" }]);
  });

  it("sorts payers by category for pickers", () => {
    const opts = insurancePayerOptions([
      { name: "Aetna", category: "commercial" },
      { name: "Medicare", category: "medicare" },
    ]);
    expect(opts[0].name).toBe("Medicare");
    expect(payerCategoryLabel("medicaid")).toBe("Medicaid");
  });

  it("preserveEmpty keeps an empty save list (no default merge)", () => {
    expect(normalizeInsurancePayers([], { preserveEmpty: true })).toEqual([]);
    expect(normalizeInsurancePayers([{ name: "Jerless Insurance Company", category: "commercial" }], { preserveEmpty: true }))
      .toEqual([{ name: "Jerless Insurance Company", category: "commercial" }]);
  });
});

describe("placeOfServiceLabel", () => {
  it("returns label for known POS", () => {
    expect(placeOfServiceLabel("11")).toContain("Office");
  });
});
