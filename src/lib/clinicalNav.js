/** Deep-link clinicians from Admin Dashboard → EHR or Patient Portal sections. */

const EHR_VIEW_KEY = "ms_ehr_view";
const EHR_SCHEDULE_DATE_KEY = "ms_ehr_schedule_date";

export function openEHRSchedule(setPage, dateStr) {
  try {
    sessionStorage.setItem(EHR_VIEW_KEY, "schedule");
    if (dateStr) sessionStorage.setItem(EHR_SCHEDULE_DATE_KEY, dateStr);
    else sessionStorage.removeItem(EHR_SCHEDULE_DATE_KEY);
  } catch { /* ignore */ }
  setPage("ehr");
}

export function consumeEHRIntent() {
  try {
    const view = sessionStorage.getItem(EHR_VIEW_KEY);
    const scheduleDate = sessionStorage.getItem(EHR_SCHEDULE_DATE_KEY);
    sessionStorage.removeItem(EHR_VIEW_KEY);
    sessionStorage.removeItem(EHR_SCHEDULE_DATE_KEY);
    return {
      view: view || null,
      scheduleDate: scheduleDate || null,
    };
  } catch {
    return { view: null, scheduleDate: null };
  }
}
