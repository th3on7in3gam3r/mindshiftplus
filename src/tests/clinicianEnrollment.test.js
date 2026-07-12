import { describe, it, expect } from "vitest";
import { staffEnrollmentProfile, STAFF_ENROLLMENT_PROFILES } from "../lib/ehrDb";

describe("ensureClinicianEnrollment profiles", () => {
  it("maps known clinic emails to roster profiles", () => {
    expect(STAFF_ENROLLMENT_PROFILES["kmutegyeki@gmail.com"].full_name).toBe("Kenneth Mutegyeki");
    expect(STAFF_ENROLLMENT_PROFILES["rnakkazi@mindshiftwellnessclinic.org"].full_name).toBe("Rachel Nakkazi");
    expect(STAFF_ENROLLMENT_PROFILES["jerlessm@gmail.com"].is_admin).toBe(true);
  });

  it("falls back to user metadata for unknown whitelisted emails", () => {
    const profile = staffEnrollmentProfile({
      email: "newstaff@mindshiftwellnessclinic.org",
      user_metadata: { full_name: "New Person" },
    });
    expect(profile.full_name).toBe("New Person");
    expect(profile.title).toBe("Staff");
  });
});
