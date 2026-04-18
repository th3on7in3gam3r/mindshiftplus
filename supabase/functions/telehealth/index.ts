import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Pure helper: compute endDate as scheduledAt + 24 hours.
 * Exported for property-based testing (Property 4).
 */
export function computeEndDate(scheduledAt: string): string {
  return new Date(new Date(scheduledAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const WHEREBY_API_KEY = Deno.env.get("WHEREBY_API_KEY");
  if (!WHEREBY_API_KEY) {
    return new Response(
      JSON.stringify({ error: "WHEREBY_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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

    return new Response(
      JSON.stringify({ telehealth_url, status: "confirmed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
