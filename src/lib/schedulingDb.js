import { supabase } from "./supabase";

// ── AVAILABILITY ───────────────────────────────────────────────────────────────
export async function getAvailability() {
  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .eq("is_active", true)
    .order("day_of_week");
  return { data, error };
}

export async function upsertAvailability(clinicianId, slots) {
  // Delete existing and re-insert
  await supabase.from("availability").delete().eq("clinician_id", clinicianId);
  if (!slots.length) return { error: null };
  const { error } = await supabase.from("availability").insert(
    slots.map(s => ({ ...s, clinician_id: clinicianId }))
  );
  return { error };
}

// ── BLOCKED TIMES ──────────────────────────────────────────────────────────────
export async function getBlockedTimes(from, to) {
  const { data, error } = await supabase
    .from("blocked_times")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date");
  return { data, error };
}

export async function addBlockedTime(clinicianId, block) {
  const { data, error } = await supabase
    .from("blocked_times")
    .insert({ clinician_id: clinicianId, ...block })
    .select().single();
  return { data, error };
}

export async function removeBlockedTime(id) {
  const { error } = await supabase.from("blocked_times").delete().eq("id", id);
  return { error };
}

// ── APPOINTMENTS (scheduling) ──────────────────────────────────────────────────
export async function getAllAppointments(from, to) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .gte("scheduled_at", from)
    .lte("scheduled_at", to)
    .order("scheduled_at");
  return { data, error };
}

export async function bookPublicAppointment(details) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      ...details,
      status: "pending",
      is_public: true,
      patient_id: null,
    })
    .select().single();
  return { data, error };
}

export async function updateAppointmentStatus(id, status) {
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);
  return { error };
}

// ── SLOT GENERATION ────────────────────────────────────────────────────────────
// Given availability rules, blocked times, and existing appointments,
// generate available slots for a given date
export function generateSlots(date, availability, blockedTimes, existingAppointments) {
  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const dayAvail = availability.filter(a => a.day_of_week === dayOfWeek && a.is_active);
  if (!dayAvail.length) return [];

  const slots = [];

  for (const avail of dayAvail) {
    const duration = avail.slot_duration_minutes || 60;
    let [sh, sm] = avail.start_time.split(":").map(Number);
    const [eh, em] = avail.end_time.split(":").map(Number);
    const endMins = eh * 60 + em;

    while (sh * 60 + sm + duration <= endMins) {
      const slotStart = `${String(sh).padStart(2,"0")}:${String(sm).padStart(2,"0")}`;
      const slotEnd = addMinutes(slotStart, duration);
      const slotDatetime = `${date}T${slotStart}:00`;

      // Check if blocked
      const isBlocked = blockedTimes.some(b => {
        if (b.date !== date) return false;
        if (b.all_day) return true;
        return timeOverlaps(slotStart, slotEnd, b.start_time?.slice(0,5), b.end_time?.slice(0,5));
      });

      // Check if already booked
      const isBooked = existingAppointments.some(a => {
        if (!a.scheduled_at) return false;
        const aDate = a.scheduled_at.slice(0, 10);
        const aTime = a.scheduled_at.slice(11, 16);
        if (aDate !== date) return false;
        if (["cancelled"].includes(a.status)) return false;
        const aDuration = a.duration_minutes || 60;
        const aEnd = addMinutes(aTime, aDuration);
        return timeOverlaps(slotStart, slotEnd, aTime, aEnd);
      });

      if (!isBlocked && !isBooked) {
        slots.push({
          time: slotStart,
          datetime: slotDatetime,
          location: avail.location,
          duration,
          label: formatTime(slotStart),
        });
      }

      // Advance
      sm += duration;
      sh += Math.floor(sm / 60);
      sm = sm % 60;
    }
  }

  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

function addMinutes(time, mins) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}

function timeOverlaps(s1, e1, s2, e2) {
  return s1 < e2 && e1 > s2;
}

function formatTime(time) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}
