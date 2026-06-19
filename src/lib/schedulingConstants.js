// Clinic weekly schedule — Mon/Thu evenings, Fri/Sat all day; closed Sun/Tue/Wed
export const AVAIL_DAYS = [1, 4, 5, 6];
export const OFF_DAYS = [0, 2, 3];
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const AVAIL_SUMMARY = "Available: Mon & Thu evenings · Fri & Sat all day";
export const OFF_SUMMARY = "Closed: Sun, Tue & Wed";

export const SLOTS_BY_DOW = {
  1: ["6:00 PM", "7:00 PM"],
  4: ["6:00 PM", "7:00 PM"],
  5: ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"],
  6: ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"],
};

export const DEFAULT_AVAILABILITY_SLOTS = [
  { day_of_week: 1, start_time: "18:00", end_time: "20:00", slot_duration_minutes: 60, location: "Milford", is_active: true },
  { day_of_week: 4, start_time: "18:00", end_time: "20:00", slot_duration_minutes: 60, location: "Milford", is_active: true },
  { day_of_week: 5, start_time: "08:00", end_time: "17:00", slot_duration_minutes: 60, location: "Milford", is_active: true },
  { day_of_week: 6, start_time: "08:00", end_time: "17:00", slot_duration_minutes: 60, location: "Milford", is_active: true },
];

export function dayOfWeekFromDateStr(dateStr) {
  return new Date(`${dateStr}T12:00:00`).getDay();
}

export function isAvailableDayOfWeek(dow) {
  return AVAIL_DAYS.includes(dow);
}

export function isOffDayOfWeek(dow) {
  return OFF_DAYS.includes(dow);
}

export function isAvailableDateStr(dateStr) {
  return isAvailableDayOfWeek(dayOfWeekFromDateStr(dateStr));
}
