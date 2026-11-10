// billing: TeenWork Pro payments with Stripe. The logic, kept apart from Deno.serve so the tests can
// run it in Node too. Talks to Stripe's REST API directly (no SDK).
//
// From the app (POST JSON, Authorization: Bearer <the person's Supabase access token>):
//   { action: "ping" }                         { ok, configured, mode, prices, webhook } (no sign-in needed)
//   { action: "checkout", plan, account_key, return_view }
//        plan = "teen_pro" | "employer_pro". Starts a Stripe Checkout subscription for the signed-in
//        person and answers { ok, url } (the app sends the person there). account_key = the TeenWork
//        account that gets Pro (the email, or email#2 for an extra account on the same email).
//   { action: "portal", return_view }          { ok, url } of Stripe's billing page (change card, cancel).
//   { action: "status" }                       { ok, plan, status, current_period_end, cancel_at_period_end }
// From Stripe: POST /functions/v1/billing/webhook with a Stripe-Signature header. Checked with
//   STRIPE_WEBHOOK_SECRET; checkout.session.completed and customer.subscription.* turn Pro on or off.
//
// What "Pro" means on the server once a subscription is active (or trialing / past_due while Stripe retries):
//   • auth app_metadata tw_plan = "pro" and tw_ai_plan = "pro" (groq-chat gives the Pro AI allowance);
//     only the service role can write app_metadata, so nobody can give it to themselves.
//   • user_data row (email = account_key, key = "plan") = "pro", which the app's plan limits read.
//   • public.tw_billing keeps one row per person (Stripe customer, subscription, status, period end).
// When the subscription ends (canceled, unpaid, incomplete_expired) all three go back to "free".
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY            sk_test_… while testing, sk_live_… for real payments (or a restricted rk_ key)
//   STRIPE_WEBHOOK_SECRET        whsec_… from the webhook endpoint in Stripe
//   STRIPE_PRICE_TEEN_PRO        price_… of the Teen Pro monthly price (optional with a live key: LIVE_PRICES below)
//   STRIPE_PRICE_EMPLOYER_PRO    price_… of the Employer Pro monthly price (same)
//   SITE_URL (optional)          default https://teenwork.ayaqd.com
//   ALLOWED_ORIGIN (optional)    default *

export type Env = {
  url: string; serviceKey: string; anonKey: string; origin: string; site: string;
  stripeKey: string; webhookSecret: string; prices: { teen_pro: string; employer_pro: string };
};
type Json = Record<string, any>;

export const PLANS = ["teen_pro", "employer_pro"] as const;
export type Plan = typeof PLANS[number];
export const PRO_STATUSES = ["active", "trialing", "past_due"];
const STRIPE = "https://api.stripe.com/v1";
export const TOLERANCE_S = 300;

const low = (s: unknown) => String(s ?? "").trim().toLowerCase();
export const validKey = (k: unknown) => typeof k === "string" && k.length <= 254 && /^[^\s@#,()"*]+@[^\s@#,()"*]+\.[^\s@#,()"*]+(#\d{1,3})?$/.test(k);
const emailOfKey = (k: string) => k.split("#")[0];
const validView = (v: unknown) => typeof v === "string" && /^[a-z0-9-]{1,40}$/.test(v) ? v : "";

// Stripe wants form encoding: { a: { b: 1 }, c: [ { d: 2 } ] } → a[b]=1&c[0][d]=2
export function formEncode(obj: Json, prefix = ""): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => {
      if (item && typeof item === "object") parts.push(formEncode(item, `${key}[${i}]`));
      else parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
    });
    else if (typeof v === "object") parts.push(formEncode(v, key));
    else parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return parts.filter(Boolean).join("&");
}

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}
// Stripe-Signature: t=1700000000,v1=<hex>[,v1=…]. The signed payload is `${t}.${raw body}`.
export async function verifyStripeSignature(raw: string, header: string | null, secret: string, nowS = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = Number(parts.find((p) => p[0] === "t")?.[1]);
  const sigs = parts.filter((p) => p[0] === "v1").map((p) => p[1] ?? "");
  if (!Number.isFinite(t) || !sigs.length || Math.abs(nowS - t) > TOLERANCE_S) return false;
  const expected = await hmacHex(secret, `${t}.${raw}`);
  return sigs.some((s) => safeEqual(s, expected));
}

// What a Stripe subscription means for TeenWork.
export function planFromSubscription(sub: Json, prices: Env["prices"]) {
  const item = sub?.items?.data?.[0] ?? {};
  const priceId = String(item?.price?.id ?? sub?.plan?.id ?? "");
  const kind: Plan | "" = priceId && priceId === prices.teen_pro ? "teen_pro" : priceId && priceId === prices.employer_pro ? "employer_pro" : "";
  const status = String(sub?.status ?? "");
  const pro = !!kind && PRO_STATUSES.includes(status);
  // current_period_end moved onto the subscription item in newer Stripe API versions
  const end = Number(sub?.current_period_end ?? item?.current_period_end ?? 0);
  return {
    pro, kind, status, priceId,
    current_period_end: end > 0 ? new Date(end * 1000).toISOString() : null,
    cancel_at_period_end: !!sub?.cancel_at_period_end,
  };
}

export function makeHandler(env: Env, fetchImpl: typeof fetch = fetch, now: () => number = () => Date.now()) {
  const cors = {
    "Access-Control-Allow-Origin": env.origin || "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, stripe-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const fail = (status: number, code: string, error: string) => json({ ok: false, code, error }, status);
  const svc = { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, "Content-Type": "application/json" };
  const site = (env.site || "https://teenwork.ayaqd.com").replace(/\/+$/, "");
  const configured = () => !!(env.stripeKey && (env.prices.teen_pro || env.prices.employer_pro));
  const mode = () => /^(sk|rk)_live_/.test(env.stripeKey) ? "live" : env.stripeKey ? "test" : "";

  async function stripe(method: "GET" | "POST", path: string, params?: Json) {
    const body = params && method === "POST" ? formEncode(params) : undefined;
    const qs = params && method === "GET" ? "?" + formEncode(params) : "";
    const r = await fetchImpl(`${STRIPE}${path}${qs}`, {
      method,
      headers: { Authorization: `Bearer ${env.stripeKey}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" },
      body,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data?.error?.message || `Stripe ${r.status}`), { status: r.status });
    return data;
  }
  async function rest(path: string, init: RequestInit = {}) {
    const r = await fetchImpl(`${env.url}/rest/v1/${path}`, { ...init, headers: { ...svc, ...((init.headers as Record<string, string>) ?? {}) } });
    if (!r.ok) throw new Error(`rest ${init.method ?? "GET"} ${path.split("?")[0]} ${r.status} ${(await r.text()).slice(0, 160)}`);
    return r;
  }
  async function billingRow(filter: string): Promise<Json | null> {
    const rows = await (await rest(`tw_billing?select=*&${filter}&limit=1`)).json();
    return rows?.[0] ?? null;
  }
  async function signedIn(req: Request): Promise<Json | null> {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token || token === env.anonKey || token.split(".").length !== 3) return null;
    const r = await fetchImpl(`${env.url}/auth/v1/user`, { headers: { apikey: env.anonKey || env.serviceKey, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const u = await r.json().catch(() => null);
    return u?.id ? u : null;
  }

  /* ── the webhook: Stripe tells us a subscription changed ─────────── */
  async function applySubscription(subId: string, hint: Json = {}) {
    // Always read the subscription fresh: events can arrive out of order.
    const sub = await stripe("GET", `/subscriptions/${encodeURIComponent(subId)}`);
    const p = planFromSubscription(sub, env.prices);
    const meta = { ...(hint || {}), ...(sub?.metadata || {}) };
    const customer = String(sub?.customer ?? "");
    let userId = String(meta.supabase_user_id ?? "");
    let accountKey = String(meta.account_key ?? "");
    if (!userId && customer) {
      const row = await billingRow(`stripe_customer_id=eq.${encodeURIComponent(customer)}`);
      userId = String(row?.user_id ?? ""); accountKey = accountKey || String(row?.account_key ?? "");
    }
    if (!userId) return { ignored: "no TeenWork user on this subscription" };
    const plan = p.pro ? "pro" : "free";
    await rest("tw_billing?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: userId, stripe_customer_id: customer || null, subscription_id: sub.id, account_key: validKey(accountKey) ? accountKey : null,
        plan: p.kind || null, status: p.status, price_id: p.priceId || null,
        current_period_end: p.current_period_end, cancel_at_period_end: p.cancel_at_period_end, updated_at: new Date(now()).toISOString(),
      }),
    });
    // app_metadata: only the service role can write it. GoTrue merges these keys into what is there.
    const au = await fetchImpl(`${env.url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT", headers: svc,
      body: JSON.stringify({ app_metadata: { tw_plan: plan, tw_ai_plan: plan, tw_billing_status: p.status } }),
    });
    if (!au.ok) throw new Error(`auth admin update ${au.status}`);
    if (validKey(accountKey)) {
      await rest("user_data?on_conflict=email,key", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ email: accountKey, key: "plan", value: JSON.stringify(plan), updated_at: new Date(now()).toISOString() }),
      });
    }
    return { user_id: userId, plan, status: p.status };
  }

  async function webhook(req: Request) {
    const raw = await req.text();
    if (!env.webhookSecret || !env.stripeKey) return fail(503, "not_configured", "Stripe is not set up");
    if (!(await verifyStripeSignature(raw, req.headers.get("stripe-signature"), env.webhookSecret, Math.floor(now() / 1000)))) {
      return fail(400, "bad_signature", "Stripe signature check failed");
    }
    let ev: Json;
    try { ev = JSON.parse(raw); } catch { return fail(400, "bad_request", "Bad JSON"); }
    // Each event once: a repeat (Stripe retries) is answered 200 without doing it again.
    const seen = await (await rest("tw_stripe_events?on_conflict=id", {
      method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({ id: String(ev.id), type: String(ev.type) }),
    })).json();
    if (Array.isArray(seen) && seen.length === 0) return json({ ok: true, duplicate: true });
    const obj = ev?.data?.object ?? {};
    try {
      let result: Json = { ignored: ev.type };
      if (ev.type === "checkout.session.completed" && obj.mode === "subscription" && obj.subscription) {
        result = await applySubscription(String(obj.subscription), { supabase_user_id: obj.client_reference_id || obj.metadata?.supabase_user_id, account_key: obj.metadata?.account_key });
      } else if (/^customer\.subscription\.(created|updated|deleted|paused|resumed)$/.test(String(ev.type)) && obj.id) {
        result = await applySubscription(String(obj.id));
      }
      return json({ ok: true, ...result });
    } catch (e) {
      // Let Stripe retry later: forget the event id so the retry is not skipped as a duplicate.
      try { await rest(`tw_stripe_events?id=eq.${encodeURIComponent(String(ev.id))}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }); } catch { /* ignore */ }
      return fail(500, "webhook_failed", String((e as Error)?.message ?? e));
    }
  }

  /* ── from the app ─────────────────────────────────────────────── */
  async function checkout(user: Json, body: Json) {
    const plan = String(body.plan ?? "") as Plan;
    if (!PLANS.includes(plan)) return fail(400, "bad_request", "Unknown plan");
    const price = env.prices[plan];
    if (!price) return fail(503, "not_configured", `No Stripe price set for ${plan}`);
    const email = low(user.email);
    const key = String(body.account_key ?? "").trim();
    if (!validKey(key) || low(emailOfKey(key)) !== email) return fail(403, "wrong_account", "That TeenWork account doesn't belong to this sign-in");
    const existing = await billingRow(`user_id=eq.${encodeURIComponent(user.id)}`);
    if (existing && PRO_STATUSES.includes(String(existing.status)) && existing.subscription_id) {
      return fail(409, "already_pro", "You already have a TeenWork Pro subscription. Use Manage billing to change it.");
    }
    let customer = String(existing?.stripe_customer_id ?? "");
    if (!customer) {
      const c = await stripe("POST", "/customers", { email: user.email, metadata: { supabase_user_id: user.id, account_key: key } });
      customer = String(c.id);
      await rest("tw_billing?on_conflict=user_id", {
        method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: user.id, stripe_customer_id: customer, account_key: key, status: "none", updated_at: new Date(now()).toISOString() }),
      });
    }
    const view = validView(body.return_view);
    const back = `${site}/?${view ? "view=" + view + "&" : ""}checkout=`;
    const meta = { supabase_user_id: user.id, account_key: key, plan };
    const s = await stripe("POST", "/checkout/sessions", {
      mode: "subscription",
      customer,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: "true",
      success_url: back + "success",
      cancel_url: back + "cancel",
      metadata: meta,
      subscription_data: { metadata: meta },
    });
    return json({ ok: true, url: s.url });
  }

  async function portal(user: Json, body: Json) {
    const row = await billingRow(`user_id=eq.${encodeURIComponent(user.id)}`);
    if (!row?.stripe_customer_id) return fail(404, "no_billing", "There is no TeenWork subscription on this sign-in yet");
    const view = validView(body.return_view);
    const s = await stripe("POST", "/billing_portal/sessions", { customer: row.stripe_customer_id, return_url: `${site}/${view ? "?view=" + view : ""}` });
    return json({ ok: true, url: s.url });
  }

  return async function handle(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return fail(405, "bad_request", "POST only");
    const path = new URL(req.url).pathname;
    if (/\/webhook\/?$/.test(path) || req.headers.get("stripe-signature")) return webhook(req);

    let body: Json;
    try { body = await req.json(); } catch { return fail(400, "bad_request", "Bad JSON"); }
    const action = String(body?.action ?? (body?.ping ? "ping" : ""));
    if (action === "ping") {
      return json({ ok: true, configured: configured(), mode: mode(), prices: { teen_pro: !!env.prices.teen_pro, employer_pro: !!env.prices.employer_pro }, webhook: !!env.webhookSecret });
    }
    if (!configured()) return fail(503, "not_configured", "Payments aren't set up yet");
    const user = await signedIn(req);
    if (!user) return fail(401, "sign_in", "Please sign in again first");
    try {
      if (action === "checkout") return await checkout(user, body);
      if (action === "portal") return await portal(user, body);
      if (action === "status") {
        const row = await billingRow(`user_id=eq.${encodeURIComponent(user.id)}`);
        const p = row && PRO_STATUSES.includes(String(row.status)) ? "pro" : "free";
        return json({ ok: true, plan: p, kind: row?.plan ?? null, status: row?.status ?? "none", current_period_end: row?.current_period_end ?? null, cancel_at_period_end: !!row?.cancel_at_period_end, account_key: row?.account_key ?? null, has_billing: !!row?.stripe_customer_id });
      }
      return fail(400, "bad_request", "Unknown action");
    } catch (e) {
      const status = Number((e as any)?.status) || 0;
      return fail(status >= 400 && status < 500 ? 502 : 500, "stripe_error", String((e as Error)?.message ?? e));
    }
  };
}

// The live prices in TeenWork's Stripe account: Teen Pro and Employer Pro, both $3.99 a month (Aya, 2026-11-09:
// "make employer same as teen … make pro only 3.99 a month"). The first $4.99 / $49 prices are archived.
// Price ids are not secret. They are used only with a live key; a test key needs its own STRIPE_PRICE_* secrets.
export const LIVE_PRICES = { teen_pro: "price_1UZx4YJzVYltmWpU7mSmK93f", employer_pro: "price_1UZx4ZJzVYltmWpUyAcY7DRc" };

export function envFrom(get: (k: string) => string | undefined): Env {
  const s = (k: string) => (get(k) ?? "").trim();
  const stripeKey = s("STRIPE_SECRET_KEY");
  const live = /^(sk|rk)_live_/.test(stripeKey);
  return {
    url: s("SUPABASE_URL"), serviceKey: s("SUPABASE_SERVICE_ROLE_KEY"), anonKey: s("SUPABASE_ANON_KEY"),
    origin: s("ALLOWED_ORIGIN") || "*", site: s("SITE_URL") || "https://teenwork.ayaqd.com",
    stripeKey, webhookSecret: s("STRIPE_WEBHOOK_SECRET"),
    prices: {
      teen_pro: s("STRIPE_PRICE_TEEN_PRO") || (live ? LIVE_PRICES.teen_pro : ""),
      employer_pro: s("STRIPE_PRICE_EMPLOYER_PRO") || (live ? LIVE_PRICES.employer_pro : ""),
    },
  };
}
