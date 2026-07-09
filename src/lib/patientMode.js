import { supabase } from "./supabase";
import { getAppointments, getMessages } from "./clinicApi";

const MODE_KEY = "ms_home_mode";
const PORTAL_PAGE_KEY = "ms_portal_page";

export function getHomeModePreference() {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === "clinic" || v === "wellness" || v === "auto") return v;
  } catch { /* ignore */ }
  return "auto";
}

export function setHomeModePreference(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch { /* ignore */ }
}

export function openPortalPage(setPage, portalSubPage = "dashboard") {
  try {
    if (portalSubPage && portalSubPage !== "dashboard") {
      sessionStorage.setItem(PORTAL_PAGE_KEY, portalSubPage);
    }
  } catch { /* ignore */ }
  setPage("portal");
}

export function consumePortalPageIntent() {
  try {
    const sub = sessionStorage.getItem(PORTAL_PAGE_KEY);
    if (sub) sessionStorage.removeItem(PORTAL_PAGE_KEY);
    return sub || null;
  } catch {
    return null;
  }
}

export async function fetchClinicPatientContext(userId) {
  if (!userId) {
    return {
      isClinicPatient: false,
      chart: null,
      mrn: null,
      upcoming: [],
      nextAppointment: null,
      unreadCount: 0,
      appointmentCount: 0,
    };
  }

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 6, 0).toISOString();

  const [chartRes, appointments, messages, intakeRes] = await Promise.all([
    supabase.from("ehr_charts").select("id, mrn, full_name, status").eq("patient_id", userId).maybeSingle(),
    getAppointments(from, to, userId).catch(() => []),
    getMessages(userId).catch(() => []),
    supabase.from("intake_submissions").select("id, status").eq("patient_id", userId).limit(1),
  ]);

  const chart = chartRes.data ?? null;
  const appts = Array.isArray(appointments) ? appointments : [];
  const msgs = Array.isArray(messages) ? messages : [];
  const intakes = intakeRes.data ?? [];

  const isClinicPatient = !!chart || appts.length > 0 || intakes.length > 0 || msgs.length > 0;

  const upcoming = appts
    .filter((a) => !["cancelled", "completed", "archived"].includes(a.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const unreadCount = msgs.filter((m) => !m.read && m.sender_role === "clinic").length;

  return {
    isClinicPatient,
    chart,
    mrn: chart?.mrn ?? null,
    upcoming,
    nextAppointment: upcoming[0] ?? null,
    unreadCount,
    appointmentCount: appts.length,
  };
}

export function resolveHomeMode(preference, context, isClinician) {
  if (isClinician) return "wellness";
  if (preference === "clinic") return "clinic";
  if (preference === "wellness") return "wellness";
  return context?.isClinicPatient ? "clinic" : "wellness";
}
