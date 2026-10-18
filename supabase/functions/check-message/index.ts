// Supabase Edge Function: check-message
// The app calls this before a chat message is sent to another person. It runs both safety layers
// from ../_shared/message-guard.ts:
//   1. the policy filter (taking work, pay, hours or contact off TeenWork)
//   2. OpenAI's free Moderation check (hate, harassment, self-harm, sexual content)
//
// Request:  POST { "text": "..." }            → 200 { allowed: true, moderation }
//                                              → 200 { allowed: false, layer, reason, rule?, categories?, title, message, moderation }
//           POST { "ping": true }             → 200 { ok: true, moderation_configured }
// Secrets:  OPENAI_API_KEY (Layer 2; without it only Layer 1 runs)
//           MODERATION_FAIL_CLOSED=true (optional: block when OpenAI can't be reached; default lets the message through)
//           ALLOWED_ORIGIN (optional, same as groq-chat)
// Deploy with JWT checking off, like groq-chat (the app sends the publishable key, which is not a JWT).

import { checkMessage } from "../_shared/message-guard.ts";

const MAX_TEXT_CHARS = 4000;

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { message: "POST only" } }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: { message: "Bad JSON" } }, 400); }

  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (body?.ping) return json({ ok: true, moderation_configured: !!openaiKey });

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return json({ error: { message: "text required" } }, 400);
  if (text.length > MAX_TEXT_CHARS) return json({ error: { message: "Message too long" } }, 413);

  const result = await checkMessage(text, {
    openaiKey,
    failClosed: Deno.env.get("MODERATION_FAIL_CLOSED") === "true",
  });
  // Log what was blocked and why, never the message itself.
  if (!result.allowed) console.log("check-message blocked:", result.layer, result.rule ?? result.categories?.join(",") ?? result.reason);
  return json(result);
});
