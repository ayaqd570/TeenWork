const MODELS = new Set(['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b']);

export function makeHandler(env, fetchImpl = fetch) {
  const cors = {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://ayaqdteenwork.netlify.app',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  });
  const error = (message, status) => json({ error: { message } }, status);
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return error('POST only', 405);
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) return error('AI service is not configured.', 503);
    const authorization = req.headers.get('authorization') || '';
    if (!/^Bearer\s+\S+$/i.test(authorization)) return error('Please sign in to use AI features.', 401);
    try {
      // Validate with Supabase Auth; never trust a decoded, unverified JWT or user_metadata.
      const auth = await fetchImpl(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization },
        signal: AbortSignal.timeout(10000),
      });
      if (!auth.ok) return error('Please sign in again to use AI features.', auth.status >= 500 ? 503 : 401);
      const user = await auth.json();
      if (!user.id) return error('Please sign in again.', 401);
      const plan = user.app_metadata?.tw_ai_plan === 'pro' ? 'pro' : 'free';
      const key = plan === 'pro' ? env.GROQ_KEY_PRO : env.GROQ_KEY_FREE;
      if (!key) return error('AI service is not configured for this plan.', 503);
      // Bound the stream before parsing to avoid allocating an unbounded request body.
      const reader = req.body?.getReader();
      if (!reader) return error('messages required', 400);
      let size = 0; const chunks = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 100000) { await reader.cancel(); return error('Request too large.', 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let body;
      try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return error('Bad JSON', 400); }
      if (!body || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 50 ||
          body.messages.some(m => !m || typeof m.content !== 'string' || !['system', 'assistant', 'user'].includes(m.role))) {
        return error('Provide 1–50 valid messages.', 400);
      }
      if (body.messages.reduce((n, m) => n + m.content.length, 0) > 20000) return error('Prompt too long', 413);
      const maxTokens = body.max_tokens ?? 1000;
      const temperature = body.temperature ?? 0.7;
      if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 2000 ||
          !Number.isFinite(temperature) || temperature < 0 || temperature > 2) return error('Invalid generation settings.', 400);
      // Atomic database quota survives function restarts and concurrent isolates. Fail closed.
      const quota = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/rpc/tw_consume_ai_quota`, {
        method: 'POST',
        headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_user_id: user.id, p_plan: plan }),
        signal: AbortSignal.timeout(10000),
      });
      if (!quota.ok) return error('AI usage checks are temporarily unavailable.', 503);
      if (await quota.json() !== true) return error('AI request limit reached. Please try again later.', 429);
      const upstream = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: MODELS.has(body.model) ? body.model : 'llama-3.3-70b-versatile',
          messages: body.messages.map(({role, content}) => ({role, content})), max_tokens: maxTokens, temperature }),
        signal: AbortSignal.timeout(45000),
      });
      if (!upstream.ok) return error('The AI provider is temporarily unavailable. Please try again later.', upstream.status === 429 ? 429 : 502);
      return new Response(upstream.body, { headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch {
      return error('AI service is temporarily unavailable. Please try again later.', 503);
    }
  };
}
