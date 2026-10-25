const MODELS = new Set(['openai/gpt-oss-20b']);
// The site's addresses. ALLOWED_ORIGIN (comma-separated) can add more; it never removes these.
const SITE_ORIGINS = ['https://teenwork.ayaqd.com', 'https://ayaqdteenwork.netlify.app'];
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+--ayaqdteenwork\.netlify\.app$/;

export function allowedOrigin(env, origin) {
  const extra = String(env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const origins = [...SITE_ORIGINS, ...extra];
  return origin && (origins.includes(origin) || PREVIEW_ORIGIN.test(origin)) ? origin : origins[0];
}

// The visitor's address, hashed, so demo limits can count per visitor without keeping the address itself.
async function visitorKey(req, env) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';
  const salt = env.DEMO_SALT || env.SUPABASE_SERVICE_ROLE_KEY || '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tw-demo|' + ip + '|' + salt));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function makeHandler(env, fetchImpl = fetch, checkMessage = async () => ({ allowed: true })) {
  return async (req) => {
    const cors = {
      'Access-Control-Allow-Origin': allowedOrigin(env, req.headers.get('origin')),
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-teenwork-demo',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    };
    const json = (body, status = 200) => new Response(JSON.stringify(body), {
      status, headers: { ...cors, 'Content-Type': 'application/json' },
    });
    const error = (message, status) => json({ error: { message } }, status);
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return error('POST only', 405);
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) return error('AI service is not configured.', 503);
    // Demos are empty practice accounts with no sign-in. They get the Free key and a small daily allowance
    // per visitor (and for all demos together), counted in the database like signed-in quotas.
    const demo = req.headers.get('x-teenwork-demo') === '1';
    const authorization = req.headers.get('authorization') || '';
    if (!demo && !/^Bearer\s+\S+$/i.test(authorization)) return error('Please sign in to use AI features.', 401);
    try {
      let user = null, plan = 'free';
      if (!demo) {
        // Validate with Supabase Auth; never trust a decoded, unverified JWT or user_metadata.
        const auth = await fetchImpl(`${env.SUPABASE_URL}/auth/v1/user`, {
          headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization },
          signal: AbortSignal.timeout(10000),
        });
        if (!auth.ok) return error('Please sign in again to use AI features.', auth.status >= 500 ? 503 : 401);
        user = await auth.json();
        if (!user.id) return error('Please sign in again.', 401);
        plan = user.app_metadata?.tw_ai_plan === 'pro' ? 'pro' : 'free';
      }
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
      if (demo && maxTokens > 1000) return error('Invalid generation settings.', 400);
      // Atomic database quota survives function restarts and concurrent isolates. Fail closed.
      const quota = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/rpc/${demo ? 'tw_consume_demo_ai_quota' : 'tw_consume_ai_quota'}`, {
        method: 'POST',
        headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(demo ? { p_client: await visitorKey(req, env) } : { p_user_id: user.id, p_plan: plan }),
        signal: AbortSignal.timeout(10000),
      });
      if (!quota.ok) return error('AI usage checks are temporarily unavailable.', 503);
      if (await quota.json() !== true) {
        return error(demo ? 'The demo has used its AI for today. Make a free account to keep using AI.' : 'AI request limit reached. Please try again later.', 429);
      }
      // Preserve the live function's moderation before any request reaches Groq.
      const userText = body.messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n');
      const guard = await checkMessage(userText, { policy: false, openaiKey: env.OPENAI_API_KEY || '', fetchFn: fetchImpl });
      if (!guard.allowed) return json({
        id: 'teenwork-blocked', object: 'chat.completion', model: 'teenwork-safety',
        choices: [{ index: 0, message: { role: 'assistant', content: `🛡️ ${guard.title}. ${guard.message}` }, finish_reason: 'content_filter' }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        teenwork_blocked: { layer: guard.layer, reason: guard.reason, rule: guard.rule, categories: guard.categories },
      });
      const upstream = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: MODELS.has(body.model) ? body.model : 'openai/gpt-oss-20b',
          messages: body.messages.map(({role, content}) => ({role, content})), max_tokens: Math.max(600, maxTokens), temperature, reasoning_effort: 'low' }),
        signal: AbortSignal.timeout(45000),
      });
      if (!upstream.ok) return error('The AI provider is temporarily unavailable. Please try again later.', upstream.status === 429 ? 429 : 502);
      return new Response(upstream.body, { headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch {
      return error('AI service is temporarily unavailable. Please try again later.', 503);
    }
  };
}
