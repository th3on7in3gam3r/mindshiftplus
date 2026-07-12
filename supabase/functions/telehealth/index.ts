import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  forbiddenOriginResponse,
  handleCorsPreflight,
  jsonWithCors,
} from "../_shared/cors.ts";

/**
 * Pure helper: compute endDate as scheduledAt + 24 hours.
 * Exported for property-based testing (Property 4).
 */
export function computeEndDate(scheduledAt: string): string {
  return new Date(new Date(scheduledAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
}

async function createWherebyRoom(apiKey: string, scheduledAt: string): Promise<string | null> {
  // Whereby rejects endDate in the past — use now when refreshing old/expired appointments.
  const startMs = Math.max(new Date(scheduledAt).getTime(), Date.now());
  const endDate = new Date(startMs + 24 * 60 * 60 * 1000).toISOString();
  const wherebyRes = await fetch("https://api.whereby.dev/v1/meetings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      endDate,
      roomMode: "group",
      isLocked: false,
      fields: ["hostRoomUrl"],
    }),
  });

  if (!wherebyRes.ok) {
    const errText = await wherebyRes.text();
    console.error("Whereby API error:", wherebyRes.status, errText);
    throw new Error(`Whereby API ${wherebyRes.status}: ${errText.slice(0, 200)}`);
  }

  const wherebyData = await wherebyRes.json();
  return wherebyData.hostRoomUrl ?? wherebyData.roomUrl ?? null;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  const forbidden = forbiddenOriginResponse(req);
  if (forbidden) return forbidden;

  const WHEREBY_API_KEY = Deno.env.get("WHEREBY_API_KEY");
  if (!WHEREBY_API_KEY) {
    return jsonWithCors(req, { error: "WHEREBY_API_KEY is not configured" }, 500);
  }

  try {
    const body = await req.json();
    const {
      mode,
      appointmentId,
      scheduledAt,
      patientId,
      patientName,
      patientEmail,
      providerName,
    } = body;

    const startAt = scheduledAt || new Date().toISOString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const telehealth_url = await createWherebyRoom(WHEREBY_API_KEY, startAt);

    if (!telehealth_url) {
      return jsonWithCors(req, { error: "Failed to create Whereby room" }, 502);
    }

    // ── Instant session (MindShift Scribe — no prior appointment) ───────────
    if (mode === "instant") {
      if (!patientId) {
        return jsonWithCors(req, { error: "patientId is required for instant telehealth" }, 400);
      }

      let resolvedEmail: string | null = patientEmail ?? null;
      if (!resolvedEmail) {
        const { data: userData } = await supabase.auth.admin.getUserById(patientId);
        resolvedEmail = userData?.user?.email ?? null;
      }

      const { data: appt, error: insertErr } = await supabase
        .from("appointments")
        .insert({
          patient_id: patientId,
          name: patientName || "Patient",
          email: resolvedEmail,
          appointment_type: "telehealth",
          scheduled_at: startAt,
          status: "confirmed",
          telehealth_url,
          provider_name: providerName || "Kenneth Mutegyeki, PMHNP-BC",
          location: "Telehealth (Video)",
          notes: "Instant telehealth session started from MindShift Scribe",
          duration_minutes: 60,
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Instant appointment insert error:", insertErr);
        return jsonWithCors(req, { error: insertErr.message }, 500);
      }

      return jsonWithCors(req, {
        telehealth_url,
        appointmentId: appt?.id,
        patientEmail: resolvedEmail,
        status: "confirmed",
      });
    }

    // ── Existing appointment confirmation ───────────────────────────────────
    if (!appointmentId) {
      return jsonWithCors(req, { telehealth_url, status: "confirmed" });
    }

    await supabase
      .from("appointments")
      .update({ telehealth_url, status: "confirmed" })
      .eq("id", appointmentId);

    return jsonWithCors(req, { telehealth_url, status: "confirmed" });
  } catch (e) {
    return jsonWithCors(req, { error: e.message }, 500);
  }
});
