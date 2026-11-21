// employer-phone: an employer confirms a phone number with a code sent by text message (TeenWork v64).
// The logic, kept apart from Deno.serve so the tests can run it in Node too. Texts go through Twilio Verify
// (its REST API directly, no SDK): Twilio makes the code, sends it and checks it, so TeenWork never sees or
// stores the code, and the phone number itself is never stored either (only its last 4 digits and a keyed hash).
//
// From the app (POST JSON, Authorization: Bearer <the employer's Supabase access token>):
//   { action: "ping" }                           { ok, configured } (no sign-in needed)
//   { action: "start", account_key, phone }      texts a code to a US or Canadian number → { ok, last4 }
//   { action: "check", account_key, code }       → { ok, confirmed: true, last4 } or { ok: false, code: "wrong_code", left }
//   { action: "remove", account_key }            takes the confirmed number off the account → { ok }
// account_key = the TeenWork employer account (the email, or email#2 for an extra account on the same email); it
// must belong to the signed-in email and be an employer account.
//
// Limits (texts cost money): 5 codes a day per sign-in, 5 a day per number, PHONE_DAILY_CAP a day for all of
// TeenWork (default 50); a code works for 10 minutes and allows 5 tries; one number can confirm at most 3 accounts
// that belong to different people. Only +1 numbers (US and Canada), which also blocks expensive SMS fraud.
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   TWILIO_ACCOUNT_SID          AC… from the Twilio console
//   TWILIO_AUTH_TOKEN           the account's auth token
//   TWILIO_VERIFY_SERVICE_SID   VA… of a Verify service (Twilio console → Verify → Services → Create)
//   PHONE_HASH_SECRET           any long random text; keys the hash used to count accounts per number
//                               (if missing, TWILIO_AUTH_TOKEN is used, and rotating that token resets the count)
//   PHONE_DAILY_CAP (optional)  codes per day for all of TeenWork, default 50
//   ALLOWED_ORIGIN (optional)   default *
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

export type Env = {
  url: string; serviceKey: string; anonKey: string; origin: string;
  twilioSid: string; twilioToken: string; verifySid: string; hashSecret: string; dailyCap: number;
};
type Json = Record<string, any>;

export const CODE_MINUTES = 10;
export const MAX_CHECKS = 5;
export const PER_USER_DAY = 5;
export const PER_PHONE_DAY = 5;
export const MAX_PEOPLE_PER_PHONE = 3;
const VERIFY = "https://verify.twilio.com/v2";

const low = (s: unknown) => String(s ?? "").trim().toLowerCase();
export const validKey = (k: unknown) => typeof k === "string" && k.length <= 254 && /^[^\s@#,()"*<>]+@[^\s@#,()"*<>]+\.[^\s@#,()"*<>]+(#\d{1,3})?$/.test(k);
const emailOfKey = (k: string) => k.split("#")[0];

// A US or Canadian number in any common spelling → "+1NXXNXXXXXX", or "" when it isn't one.
// (North American numbers: area code and exchange can't start with 0 or 1; 555-01xx are fictional.)
export function normalizePhone(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s || s.length > 30 || /[^\d\s().+\-]/.test(s)) return "";
  let d = s.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  if (d.length !== 10) return "";
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) return "";
  if (/^\d{3}55501\d{2}$/.test(d)) return "";
  return "+1" + d;
}

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
export async function phoneHash(secret: string, e164: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("tw-phone:" + e164)));
}

export function makeHandler(env: Env, fetchImpl: typeof fetch = fetch, now: () => number = () => Date.now()) {
  const cors = {
    "Access-Control-Allow-Origin": env.origin || "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const fail = (status: number, code: string, error: string, extra: Json = {}) => json({ ok: false, code, error, ...extra }, status);
  const q = encodeURIComponent;
  const svc = { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, "Content-Type": "application/json" };
  const configured = () => !!(env.twilioSid && env.twilioToken && env.verifySid && env.url && env.serviceKey);
  const iso = (ms: number) => new Date(ms).toISOString();

  async function rest(path: string, init: RequestInit = {}) {
    const r = await fetchImpl(`${env.url}/rest/v1/${path}`, { ...init, headers: { ...svc, ...((init.headers as Record<string, string>) ?? {}) } });
    if (!r.ok) throw new Error(`rest ${init.method ?? "GET"} ${path.split("?")[0]} ${r.status} ${(await r.text()).slice(0, 160)}`);
    return r;
  }
  async function phoneRow(key: string): Promise<Json | null> {
    const rows = await (await rest(`tw_employer_phone?account_key=eq.${q(key)}&select=*&limit=1`)).json();
    return rows?.[0] ?? null;
  }
  const savePhone = (row: Json) => rest("tw_employer_phone?on_conflict=account_key", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ ...row, updated_at: iso(now()) }),
  });
  async function signedIn(req: Request): Promise<Json | null> {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token || token === env.anonKey || token.split(".").length !== 3) return null;
    const r = await fetchImpl(`${env.url}/auth/v1/user`, { headers: { apikey: env.anonKey || env.serviceKey, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const u = await r.json().catch(() => null);
    return u?.id ? u : null;
  }
  // The account is an employer account: its own profile row says so, or (main account) the sign-in does.
  async function isEmployer(key: string, user: Json) {
    try {
      const rows = await (await rest(`user_data?email=eq.${q(key)}&key=eq.account_profile&select=value&limit=1`)).json();
      const v = rows?.[0]?.value ? JSON.parse(rows[0].value) : null;
      if (v && low(v.type)) return low(v.type) === "employer";
    } catch { /* fall through to the sign-in */ }
    if (!key.includes("#")) return low(user?.user_metadata?.account_type) === "employer";
    const slot = parseInt(key.split("#")[1], 10);
    const extra = (Array.isArray(user?.user_metadata?.tw_accounts) ? user.user_metadata.tw_accounts : []).find((x: Json) => (parseInt(String(x?.slot), 10) || 0) === slot);
    return low(extra?.type) === "employer";
  }
  async function twilio(path: string, form: Record<string, string>) {
    const r = await fetchImpl(`${VERIFY}/Services/${q(env.verifySid)}/${path}`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${env.twilioSid}:${env.twilioToken}`), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form).toString(),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }

  async function start(user: Json, key: string, body: Json) {
    const phone = normalizePhone(body.phone);
    if (!phone) return fail(400, "bad_phone", "Enter a 10-digit US or Canadian mobile number, like (802) 555-1234.");
    const hash = await phoneHash(env.hashSecret || env.twilioToken, phone);
    const others = await (await rest(`tw_employer_phone?confirmed_hash=eq.${hash}&select=account_key,user_id`)).json();
    const people = new Set((others ?? []).filter((r: Json) => r.account_key !== key && r.user_id !== user.id).map((r: Json) => r.user_id));
    if (people.size >= MAX_PEOPLE_PER_PHONE) return fail(409, "phone_in_use", "That number is already confirmed on several other TeenWork accounts. Use your own mobile number.");
    const cur = await phoneRow(key);
    if (cur?.confirmed_hash === hash && cur?.confirmed_at) return json({ ok: true, confirmed: true, last4: cur.confirmed_last4, already: true });
    const limit = await (await rest("rpc/tw_phone_send_ok", { method: "POST", body: JSON.stringify({ p_user: user.id, p_hash: hash, p_user_max: PER_USER_DAY, p_phone_max: PER_PHONE_DAY, p_day_max: env.dailyCap }) })).json();
    if (limit !== "ok") {
      return fail(429, limit === "day_limit" ? "busy" : "too_many", limit === "day_limit"
        ? "TeenWork has sent all the codes it can today. Please try again tomorrow."
        : "That's the most codes we can send in a day. Please try again tomorrow.");
    }
    const t = await twilio("Verifications", { To: phone, Channel: "sms" });
    if (!t.ok || !t.data?.sid) {
      const code = Number(t.data?.code) || 0;
      console.warn(`employer-phone: start ${t.status} ${code} ${String(t.data?.message ?? "").slice(0, 160)}`);
      if (code === 60200 || code === 60205 || code === 21211 || code === 21614) return fail(400, "bad_phone", "That number can't get text messages. Use a mobile number.");
      if (code === 60203 || t.status === 429) return fail(429, "too_many", "That's the most codes we can send to this number for now. Please try again later.");
      return fail(502, "send_failed", "The text couldn't be sent just now. Please try again in a few minutes.");
    }
    await savePhone({ account_key: key, user_id: user.id, pending_hash: hash, pending_last4: phone.slice(-4), pending_sid: String(t.data.sid), pending_at: iso(now()), pending_checks: 0 });
    return json({ ok: true, sent: true, last4: phone.slice(-4), minutes: CODE_MINUTES });
  }

  async function check(user: Json, key: string, body: Json) {
    const code = String(body.code ?? "").replace(/\s+/g, "");
    if (!/^\d{4,10}$/.test(code)) return fail(400, "bad_code", "Enter the number from the text message.");
    const cur = await phoneRow(key);
    const fresh = cur?.pending_sid && cur?.pending_at && now() - Date.parse(cur.pending_at) < CODE_MINUTES * 60_000;
    if (!fresh) return fail(410, "expired", "That code has run out. Send a new one.");
    if ((cur.pending_checks ?? 0) >= MAX_CHECKS) return fail(429, "expired", "Too many tries. Send a new code.");
    const tries = (cur.pending_checks ?? 0) + 1;
    await savePhone({ account_key: key, user_id: cur.user_id ?? user.id, pending_checks: tries });
    const t = await twilio("VerificationCheck", { VerificationSid: String(cur.pending_sid), Code: code });
    if (t.ok && t.data?.status === "approved") {
      const others = await (await rest(`tw_employer_phone?confirmed_hash=eq.${cur.pending_hash}&select=account_key,user_id`)).json();
      const people = new Set((others ?? []).filter((r: Json) => r.account_key !== key && r.user_id !== user.id).map((r: Json) => r.user_id));
      if (people.size >= MAX_PEOPLE_PER_PHONE) return fail(409, "phone_in_use", "That number is already confirmed on several other TeenWork accounts. Use your own mobile number.");
      await savePhone({ account_key: key, user_id: user.id, confirmed_hash: cur.pending_hash, confirmed_last4: cur.pending_last4, confirmed_at: iso(now()),
        pending_hash: null, pending_last4: null, pending_sid: null, pending_at: null, pending_checks: 0 });
      return json({ ok: true, confirmed: true, last4: cur.pending_last4 });
    }
    if (t.status === 404) {   // Twilio: the code expired, was used, or had too many tries
      await savePhone({ account_key: key, user_id: cur.user_id ?? user.id, pending_sid: null, pending_at: null });
      return fail(410, "expired", "That code has run out. Send a new one.");
    }
    if (!t.ok) {
      console.warn(`employer-phone: check ${t.status} ${t.data?.code ?? ""} ${String(t.data?.message ?? "").slice(0, 160)}`);
      return fail(502, "check_failed", "The code couldn't be checked just now. Please try again.");
    }
    return fail(400, "wrong_code", "That code doesn't match. Check the text and try again.", { left: Math.max(0, MAX_CHECKS - tries) });
  }

  return async function handle(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return fail(405, "bad_request", "POST only");
    let body: Json;
    try { body = await req.json(); } catch { return fail(400, "bad_request", "Bad JSON"); }
    const action = String(body?.action ?? (body?.ping ? "ping" : ""));
    if (action === "ping") return json({ ok: true, configured: configured() });
    if (!configured()) return fail(503, "not_configured", "Text message codes aren't switched on yet.");
    const user = await signedIn(req);
    if (!user) return fail(401, "sign_in", "Please sign in again first.");
    const key = low(body.account_key);
    if (!validKey(key)) return fail(400, "bad_key", "That account isn't valid.");
    if (emailOfKey(key) !== low(user.email)) return fail(403, "not_yours", "You can only confirm a phone number for your own account.");
    try {
      if (!(await isEmployer(key, user))) return fail(403, "not_employer", "Phone confirmation is for employer accounts.");
      if (action === "start") return await start(user, key, body);
      if (action === "check") return await check(user, key, body);
      if (action === "remove") {
        await rest(`tw_employer_phone?account_key=eq.${q(key)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        return json({ ok: true, removed: true });
      }
      return fail(400, "bad_request", "Unknown action");
    } catch (e) {
      console.warn(`employer-phone: ${String((e as Error)?.message ?? e).slice(0, 300)}`);
      if (/ 404 |PGRST20[25]|42P01|42883/.test(String(e))) return fail(503, "not_set_up", "Phone confirmation is still being set up.");
      return fail(500, "server", "Something went wrong. Please try again.");
    }
  };
}

export function envFrom(get: (k: string) => string | undefined): Env {
  const s = (k: string) => (get(k) ?? "").trim();
  const cap = parseInt(s("PHONE_DAILY_CAP"), 10);
  return {
    url: s("SUPABASE_URL"), serviceKey: s("SUPABASE_SERVICE_ROLE_KEY"), anonKey: s("SUPABASE_ANON_KEY"), origin: s("ALLOWED_ORIGIN") || "*",
    twilioSid: s("TWILIO_ACCOUNT_SID"), twilioToken: s("TWILIO_AUTH_TOKEN"), verifySid: s("TWILIO_VERIFY_SERVICE_SID"),
    hashSecret: s("PHONE_HASH_SECRET"), dailyCap: cap > 0 && cap <= 5000 ? cap : 50,
  };
}
