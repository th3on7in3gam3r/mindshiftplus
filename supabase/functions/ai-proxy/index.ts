import {
  forbiddenOriginResponse,
  handleCorsPreflight,
  jsonWithCors,
} from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  const forbidden = forbiddenOriginResponse(req);
  if (forbidden) return forbidden;

  try {
    const { system, messages, max_tokens = 1000 } = await req.json();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens,
        system,
        messages,
      }),
    });

    const data = await res.json();
    return jsonWithCors(req, data);
  } catch (e) {
    return jsonWithCors(req, { error: e.message }, 500);
  }
});
