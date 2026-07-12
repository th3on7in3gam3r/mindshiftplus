/** URL ↔ in-app page mapping so refresh and back/forward restore staff & wellness screens. */

export const EHR_VIEWS = new Set([
  "dashboard",
  "intakes",
  "chart",
  "new-chart",
  "schedule",
  "tasks",
  "messages",
  "staff-messages",
  "reports",
  "crisis",
  "giftcards",
  "invoices",
  "insurance-claims",
  "billing-settings",
]);

const PAGE_PATHS = {
  landing: "/",
  dashboard: "/home",
  clinical: "/clinical",
  ehr: "/clinical/ehr",
  "ehr-schedule": "/clinical/lookup",
  "ai-scribe": "/clinical/scribe",
  "staff-docs": "/clinical/docs",
  portal: "/portal",
  schedule: "/book",
  onboarding: "/onboarding",
  mia: "/wellness/mia",
  journal: "/wellness/journal",
  breathe: "/wellness/breathe",
  constellation: "/wellness/constellation",
  programs: "/wellness/programs",
  insights: "/wellness/insights",
  premium: "/wellness/premium",
  settings: "/settings",
};

const PATH_PAGES = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([page, path]) => [path, page])
);

/** Parse current browser location into app route state. */
export function parseAppRoute(location = window.location) {
  const { pathname, search } = location;
  const params = new URLSearchParams(search);

  if (pathname.startsWith("/clinical/ehr")) {
    const rest = pathname.slice("/clinical/ehr".length);
    const segment = rest.split("/").filter(Boolean)[0];
    const ehrView = segment && EHR_VIEWS.has(segment) ? segment : "dashboard";
    const ehrChartId = params.get("chart") || null;
    return { page: "ehr", ehrView, ehrChartId };
  }

  const page = PATH_PAGES[pathname];
  if (page) return { page, ehrView: null, ehrChartId: null };

  return { page: "landing", ehrView: null, ehrChartId: null };
}

export function getInitialAppRoute() {
  return parseAppRoute();
}

/** Build pathname + search for a route. */
export function buildAppPath(page, { ehrView = "dashboard", ehrChartId = null } = {}) {
  if (page === "ehr") {
    const base = ehrView && ehrView !== "dashboard"
      ? `/clinical/ehr/${ehrView}`
      : "/clinical/ehr";
    if (ehrView === "chart" && ehrChartId) {
      return `${base}?chart=${encodeURIComponent(ehrChartId)}`;
    }
    return base;
  }
  return PAGE_PATHS[page] ?? "/";
}

/** Update the address bar without reloading (push or replace). */
export function syncAppRoute(page, { ehrView = "dashboard", ehrChartId = null, replace = false } = {}) {
  const next = buildAppPath(page, { ehrView, ehrChartId });
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === next) return;

  const state = { page, ehrView, ehrChartId };
  if (replace) window.history.replaceState(state, "", next);
  else window.history.pushState(state, "", next);
}

export function installAppRouteListener(onRoute) {
  const handler = () => onRoute(parseAppRoute());
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}

/** EHR-only helpers (sub-views under /clinical/ehr/…). */
export function syncEhrView(view, chartId = null, { replace = false } = {}) {
  syncAppRoute("ehr", { ehrView: view, ehrChartId: chartId, replace });
}

export function getEhrRouteFromUrl() {
  const route = parseAppRoute();
  if (route.page !== "ehr") return { view: "dashboard", chartId: null };
  return { view: route.ehrView || "dashboard", chartId: route.ehrChartId };
}
