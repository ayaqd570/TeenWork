// Supabase Edge Function: groq-chat
// Forwards TeenWork AI requests to Groq using a server-side key, so the keys
// are never inside the HTML file. The page sends { plan: 'free'|'pro', model,
// messages, max_tokens, temperature }; this function picks the key for that plan.
//
// Before anything reaches Groq, what the person wrote goes through OpenAI's free
// Moderation check (../_shared/message-guard.ts). Hate, harassment, self-harm or
// sexual content gets a short safety reply instead, and Groq is never called.
//
// Secrets: GROQ_KEY_FREE, GROQ_KEY_PRO, OPENAI_API_KEY (optional ALLOWED_ORIGIN).
// Without OPENAI_API_KEY the safety check is skipped and requests go to Groq as before.
// Deploy with JWT checking off (the app does not use Supabase Auth sessions).

import { checkMessage, type GuardResult } from "../_shared/message-guard.ts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const KEYS: Record<string, string | undefined> = {
  free: Deno.env.get("GROQ_KEY_FREE"),
  pro: Deno.env.get("GROQ_KEY_PRO"),
};
// Models available on this Groq account. Any other model name the page sends
// (including old Llama names) falls back to DEFAULT_MODEL.
const DEFAULT_MODEL = "openai/gpt-oss-20b";
const ALLOWED_MODELS = new Set([
  "openai/gpt-oss-20b",
]);
const MIN_TOKENS = 600; // gpt-oss spends some tokens reasoning before it answers
const MAX_TOKENS_CAP = 2000;
const MAX_MESSAGE_CHARS = 20000;
// The off-the-app phrase filter is for chat between people. It stays off here so a teen can
// still ask the AI coach things like "my boss wants to pay me cash, is that OK?".
const POLICY_FILTER_FOR_AI = false;

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

// Shaped like a Groq reply, so every AI button in the app shows the safety note as the answer.
function blockedReply(g: GuardResult) {
  return {
    id: "teenwork-blocked",
    object: "chat.completion",
    model: "teenwork-safety",
    choices: [{ index: 0, message: { role: "assistant", content: `🛡️ ${g.title}. ${g.message}` }, finish_reason: "content_filter" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    teenwork_blocked: { layer: g.layer, reason: g.reason, rule: g.rule, categories: g.categories },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { message: "POST only" } }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: { message: "Bad JSON" } }, 400); }

  const plan = body?.plan === "pro" ? "pro" : "free";
  const key = KEYS[plan];
  if (!key) return json({ error: { message: `No Groq key configured for the ${plan} plan` } }, 500);

  const model = ALLOWED_MODELS.has(body?.model) ? body.model : DEFAULT_MODEL;
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || !messages.length) return json({ error: { message: "messages required" } }, 400);
  const totalChars = messages.reduce((n: number, m: any) => n + String(m?.content ?? "").length, 0);
  if (totalChars > MAX_MESSAGE_CHARS) return json({ error: { message: "Prompt too long" } }, 413);

  // Safety check on what the person wrote (not the app's own system prompts) before Groq sees it.
  const userText = messages
    .filter((m: any) => m?.role !== "system" && m?.role !== "assistant")
    .map((m: any) => String(m?.content ?? ""))
    .join("\n\n");
  const guard = await checkMessage(userText, { policy: POLICY_FILTER_FOR_AI, openaiKey: Deno.env.get("OPENAI_API_KEY") ?? "" });
  if (!guard.allowed) {
    console.log("groq-chat blocked before Groq:", guard.layer, guard.rule ?? (guard.categories ?? []).join(","));
    return json(blockedReply(guard));
  }

  const requested = Number(body?.max_tokens) || 1000;
  const payload: Record<string, unknown> = {
    model,
    messages: messages.map((m: any) => ({ role: m?.role === "system" ? "system" : m?.role === "assistant" ? "assistant" : "user", content: String(m?.content ?? "") })),
    max_tokens: Math.min(Math.max(requested, MIN_TOKENS), MAX_TOKENS_CAP),
    temperature: typeof body?.temperature === "number" ? body.temperature : 0.7,
  };
  if (model.startsWith("openai/gpt-oss")) payload.reasoning_effort = "low";

  const upstream = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  // Pass Groq's reply through unchanged (the page reads .choices[0].message.content or .error.message).
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
