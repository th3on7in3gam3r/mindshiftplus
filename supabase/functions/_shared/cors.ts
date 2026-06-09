/** Trusted browser origins for Edge Function CORS (no wildcard). */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.mindshiftwellnessclinic.org",
  "https://mindshiftwellnessclinic.org", // apex → www redirect
  // local dev only
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

function getAllowedOrigins(): string[] {
  const fromEnv = Deno.env.get("ALLOWED_ORIGINS");
  if (!fromEnv) return DEFAULT_ALLOWED_ORIGINS;
  return fromEnv.split(",").map((o) => o.trim()).filter(Boolean);
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}

/** CORS headers for an allowed request. Returns null if Origin is present but not allowed. */
export function corsHeadersFor(req: Request): Record<string, string> | null {
  const origin = req.headers.get("Origin");
  if (origin && !isAllowedOrigin(origin)) return null;

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  const headers = corsHeadersFor(req);
  if (!headers) return new Response("Forbidden", { status: 403 });
  return new Response("ok", { headers });
}

export function forbiddenOriginResponse(req: Request): Response | null {
  if (req.headers.get("Origin") && !isAllowedOrigin(req.headers.get("Origin"))) {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export function jsonWithCors(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  const cors = corsHeadersFor(req);
  if (!cors) {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
