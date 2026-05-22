/**
 * Calls the Supabase ai-proxy Edge Function (Anthropic Claude).
 * Requires VITE_SUPABASE_ANON_KEY at build time.
 * Uses VITE_AI_PROXY_URL when set, otherwise derives from VITE_SUPABASE_URL.
 */
function getAiProxyUrl() {
  const explicit = import.meta.env.VITE_AI_PROXY_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/ai-proxy`;
  return "";
}

export async function callAiProxy({ system, messages, max_tokens = 1000 }) {
  const url = getAiProxyUrl();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "VITE_SUPABASE_URL or VITE_AI_PROXY_URL must be set in your hosting env and redeployed."
    );
  }
  if (!anonKey) {
    throw new Error(
      "VITE_SUPABASE_ANON_KEY is not set. Add it in your hosting env and redeploy."
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ system, messages, max_tokens }),
  });

  const text = await res.text();
  if (!text) {
    throw new Error(`AI proxy returned an empty response (HTTP ${res.status}).`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`AI proxy returned invalid JSON (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const err = data.error?.message ?? data.error ?? `HTTP ${res.status}`;
    throw new Error(typeof err === "string" ? err : JSON.stringify(err));
  }
  if (data.error) {
    throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  }

  return data.content?.find((c) => c.type === "text")?.text ?? null;
}
