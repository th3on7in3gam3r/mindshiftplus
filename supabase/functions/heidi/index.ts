import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  forbiddenOriginResponse,
  handleCorsPreflight,
  jsonWithCors,
} from "../_shared/cors.ts";

const CLINICIAN_EMAILS = [
  "info@mindshiftwellnessclinic.org",
  "jerlessm@gmail.com",
  "kmutegyeki@mindshiftwellnessclinic.org",
  "kmutegyeki@gmail.com",
  "rnakkazi@mindshiftwellnessclinic.org",
];

const HEIDI_JWT_URL =
  "https://registrar.api.heidihealth.com/api/v2/ml-scribe/open-api/jwt";

async function isAuthorizedClinician(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  email: string | undefined,
): Promise<boolean> {
  if (email && CLINICIAN_EMAILS.includes(email.toLowerCase())) return true;
  const { data } = await supabaseAdmin
    .from("clinician_roles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  const forbidden = forbiddenOriginResponse(req);
  if (forbidden) return forbidden;

  const HEIDI_API_KEY = Deno.env.get("HEIDI_API_KEY");
  if (!HEIDI_API_KEY) {
    return jsonWithCors(req, { error: "HEIDI_API_KEY is not configured on the server." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonWithCors(req, { error: "Not authenticated" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user?.email) {
    return jsonWithCors(req, { error: "Invalid session" }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseService);
  if (!(await isAuthorizedClinician(supabaseAdmin, user.id, user.email))) {
    return jsonWithCors(req, { error: "Clinic staff access only" }, 403);
  }

  try {
    const jwtUrl = new URL(HEIDI_JWT_URL);
    jwtUrl.searchParams.set("email", user.email);
    jwtUrl.searchParams.set("third_party_internal_id", user.id);

    const heidiRes = await fetch(jwtUrl.toString(), {
      method: "GET",
      headers: { "Heidi-Api-Key": HEIDI_API_KEY },
    });

    const heidiBody = await heidiRes.json().catch(() => ({}));
    if (!heidiRes.ok) {
      console.error("Heidi JWT error:", heidiRes.status, heidiBody);
      return jsonWithCors(
        req,
        { error: heidiBody?.detail?.msg || heidiBody?.detail || "Heidi authentication failed" },
        heidiRes.status >= 400 && heidiRes.status < 600 ? heidiRes.status : 502,
      );
    }

    return jsonWithCors(req, {
      token: heidiBody.token,
      expiration_time: heidiBody.expiration_time,
      region: Deno.env.get("HEIDI_REGION") || "US",
      widget_script_url: Deno.env.get("HEIDI_WIDGET_SCRIPT_URL") ||
        "https://registrar.widget.heidihealth.com/staging/widget/heidi.js",
    });
  } catch (e) {
    return jsonWithCors(req, { error: e instanceof Error ? e.message : "Heidi request failed" }, 500);
  }
});
