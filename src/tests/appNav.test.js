import { describe, it, expect } from "vitest";
import { parseAppRoute, buildAppPath } from "../lib/appNav";

describe("appNav", () => {
  it("maps clinical EHR paths", () => {
    expect(parseAppRoute({ pathname: "/clinical/ehr/billing-settings", search: "" })).toEqual({
      page: "ehr",
      ehrView: "billing-settings",
      ehrChartId: null,
    });
    expect(parseAppRoute({ pathname: "/clinical/ehr", search: "" })).toEqual({
      page: "ehr",
      ehrView: "dashboard",
      ehrChartId: null,
    });
    expect(parseAppRoute({ pathname: "/clinical/ehr/chart", search: "?chart=abc-123" })).toEqual({
      page: "ehr",
      ehrView: "chart",
      ehrChartId: "abc-123",
    });
  });

  it("maps other app pages", () => {
    expect(parseAppRoute({ pathname: "/clinical", search: "" }).page).toBe("clinical");
    expect(parseAppRoute({ pathname: "/clinical/scribe", search: "" }).page).toBe("ai-scribe");
    expect(parseAppRoute({ pathname: "/home", search: "" }).page).toBe("dashboard");
    expect(parseAppRoute({ pathname: "/auth/confirm", search: "" }).page).toBe("auth-confirm");
    expect(parseAppRoute({ pathname: "/auth/reset-password", search: "" }).page).toBe("auth-reset");
  });

  it("builds paths for navigation", () => {
    expect(buildAppPath("ehr", { ehrView: "schedule" })).toBe("/clinical/ehr/schedule");
    expect(buildAppPath("ehr", { ehrView: "chart", ehrChartId: "x" })).toBe("/clinical/ehr/chart?chart=x");
    expect(buildAppPath("clinical")).toBe("/clinical");
    expect(buildAppPath("auth-reset")).toBe("/auth/reset-password");
    expect(buildAppPath("auth-confirm")).toBe("/auth/confirm");
  });
});
