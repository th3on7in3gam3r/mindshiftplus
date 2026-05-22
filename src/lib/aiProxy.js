/**
 * Calls the Supabase ai-proxy Edge Function (Anthropic Claude).
 * Requires VITE_AI_PROXY_URL and VITE_SUPABASE_ANON_KEY at build time.
 */
export async function callAiProxy({ system, messages, max_tokens = 1000 }) {
  const url = import.meta.env.VITE_AI_PROXY_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "VITE_AI_PROXY_URL is not set. Add it in your hosting env (e.g. Vercel) and redeploy."
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
