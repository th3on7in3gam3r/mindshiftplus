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
    const { appointmentId, scheduledAt } = await req.json();

    const endDate = computeEndDate(scheduledAt);

    // Create Supabase service-role client for DB updates
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Call Whereby API to create a meeting room
    let telehealth_url: string | null = null;

    const wherebyRes = await fetch("https://api.whereby.dev/v1/meetings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WHEREBY_API_KEY}`,
      },
      body: JSON.stringify({ endDate, roomMode: "group", isLocked: false }),
    });

    if (wherebyRes.ok) {
      const wherebyData = await wherebyRes.json();
      telehealth_url = wherebyData.roomUrl ?? null;

      // Update appointment with telehealth_url and confirmed status
      await supabase
        .from("appointments")
        .update({ telehealth_url, status: "confirmed" })
        .eq("id", appointmentId);
    } else {
      const errText = await wherebyRes.text();
      console.error("Whereby API error:", wherebyRes.status, errText);

      // Still confirm the appointment, leave telehealth_url null
      await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", appointmentId);
    }

    return jsonWithCors(req, { telehealth_url, status: "confirmed" });
  } catch (e) {
    return jsonWithCors(req, { error: e.message }, 500);
  }
});
