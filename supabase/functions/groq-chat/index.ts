// Supabase Edge Function: groq-chat
// Forwards TeenWork AI requests to Groq using a server-side key, so the keys
// are never inside the HTML file. The page sends { plan: 'free'|'pro', model,
// messages, max_tokens, temperature }; this function picks the key for that plan.
//
// Set the secrets once (never commit them):
//   supabase secrets set GROQ_KEY_FREE=gsk_... GROQ_KEY_PRO=gsk_...
// Deploy (the app does not use Supabase Auth sessions, so JWT checking is off):
//   supabase functions deploy groq-chat --no-verify-jwt
// Optional: set ALLOWED_ORIGIN to the site that hosts the app (e.g. https://teenwork.app)
// to stop other websites from calling this function from a browser.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const KEYS: Record<string, string | undefined> = {
  free: Deno.env.get("GROQ_KEY_FREE"),
  pro: Deno.env.get("GROQ_KEY_PRO"),
};
// Only models the app is meant to use; stops someone pointing the function at pricier models.
const ALLOWED_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-20b",
]);
const MAX_TOKENS_CAP = 2000;
const MAX_MESSAGE_CHARS = 20000;

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

  const plan = body?.plan === "pro" ? "pro" : "free";
  const key = KEYS[plan];
  if (!key) return json({ error: { message: `No Groq key configured for the ${plan} plan` } }, 500);

  const model = ALLOWED_MODELS.has(body?.model) ? body.model : "llama-3.3-70b-versatile";
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || !messages.length) return json({ error: { message: "messages required" } }, 400);
  const totalChars = messages.reduce((n: number, m: any) => n + String(m?.content ?? "").length, 0);
  if (totalChars > MAX_MESSAGE_CHARS) return json({ error: { message: "Prompt too long" } }, 413);

  const payload = {
    model,
    messages: messages.map((m: any) => ({ role: m?.role === "system" ? "system" : m?.role === "assistant" ? "assistant" : "user", content: String(m?.content ?? "") })),
    max_tokens: Math.min(Number(body?.max_tokens) || 1000, MAX_TOKENS_CAP),
    temperature: typeof body?.temperature === "number" ? body.temperature : 0.7,
  };

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
