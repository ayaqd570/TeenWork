// delete-account: the logic, kept apart from Deno.serve so the tests can run it in Node too.
//
// Actions (POST JSON):
//   { action: "self", key }                    Authorization: Bearer <the person's Supabase access token>
//       The person deletes their own account (their password was checked by the app just before,
//       by signing in again). Everything goes now: their user_data rows, messages, links in other
//       people's rows, and their sign-in (or just this account, when the email has other accounts).
//   { action: "close", key, adminPassword }    the TeenWork admin closes an account.
//       What other people can see goes now (profile, job posts, applications, chats, links, codes).
//       The person's own records (hours, money, lessons…) stay KEEP_DAYS days so they can sign in
//       and download them; then "purge" deletes the rest.
//   { action: "purge" }                        deletes what is left of accounts closed by the admin
//       more than KEEP_DAYS days ago. Needs no password: it only touches accounts already closed.
//   { ping: true }                             { ok, ready } without doing anything.
// Every closed account gets a row in public.closed_accounts (key, type, closed_by, closed_at,
// purge_after, purged_at). The app reads that table to hide closed accounts everywhere and to tell
// people an account they worked with was closed. Only this function can write it.

export type Env = { url: string; serviceKey: string; anonKey: string; adminSalt: string; adminHash: string; origin: string; adminEmail?: string };
type Row = { email: string; key: string; value: string };
type Json = Record<string, unknown>;

export const KEEP_DAYS = 30;
const ROLES = ["teen", "parent", "employer"];
// rows other people see (or that link other people to this account)
const PUBLIC_KEYS = ["account_profile", "emp_profile", "link_code", "contacts", "linked_teens"];
const PUBLIC_PREFIXES = ["job_post:", "job_app:", "code:", "consent:", "link_request:", "found_shift:"];
// the admin's own settings live under the admin email too (plan_settings): deleting a teen/parent/employer
// account on that email must never take them
const ADMIN_KEYS = ["plan_settings"];
export const ADMIN_EMAIL = "ayaquarrierdraper@gmail.com";

const low = (s: unknown) => String(s ?? "").trim().toLowerCase();
export const validKey = (k: unknown) => typeof k === "string" && k.length <= 254 && /^[^\s@#,()"*]+@[^\s@#,()"*]+\.[^\s@#,()"*]+(#\d{1,3})?$/.test(k);
const emailOfKey = (k: string) => k.split("#")[0];
const slotOfKey = (k: string) => (k.includes("#") ? parseInt(k.split("#")[1], 10) || 1 : 1);
const parse = (v: unknown) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };

async function sha256hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function makeHandler(env: Env, fetchImpl: typeof fetch = fetch) {
  const cors = {
    "Access-Control-Allow-Origin": env.origin || "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const fail = (status: number, code: string, error: string) => json({ ok: false, code, error }, status);
  const q = encodeURIComponent;
  const svc = { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, "Content-Type": "application/json" };

  async function rest(path: string, init: RequestInit = {}) {
    const r = await fetchImpl(`${env.url}/rest/v1/${path}`, { ...init, headers: { ...svc, ...((init.headers as Record<string, string>) ?? {}) } });
    if (!r.ok) throw new Error(`rest ${init.method ?? "GET"} ${path.split("?")[0]} ${r.status} ${(await r.text()).slice(0, 160)}`);
    return r;
  }
  const select = async (filter: string): Promise<Row[]> => (await (await rest(`user_data?select=email,key,value&${filter}&limit=5000`)).json()) ?? [];
  const del = (table: string, filter: string) => rest(`${table}?${filter}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  const delRow = (r: { email: string; key: string }) => del("user_data", `email=eq.${q(r.email)}&key=eq.${q(r.key)}`);
  const setValue = (r: Row, v: unknown) => rest(`user_data?email=eq.${q(r.email)}&key=eq.${q(r.key)}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ value: JSON.stringify(v), updated_at: new Date().toISOString() }),
  });

  async function userFromToken(token: string) {
    try {
      const r = await fetchImpl(`${env.url}/auth/v1/user`, { headers: { apikey: env.anonKey || env.serviceKey, Authorization: `Bearer ${token}` } });
      if (!r.ok) return null;
      const u = await r.json();
      return u?.id ? { id: String(u.id), email: low(u.email), user_metadata: (u.user_metadata ?? {}) as Json } : null;
    } catch { return null; }
  }
  async function findAuthUser(email: string) {
    for (let page = 1; page <= 25; page++) {
      const r = await fetchImpl(`${env.url}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: svc });
      if (!r.ok) return null;
      const d = await r.json();
      const users = (Array.isArray(d) ? d : d?.users) ?? [];
      const hit = users.find((u: Json) => low(u.email) === email);
      if (hit) return { id: String(hit.id), email, user_metadata: (hit.user_metadata ?? {}) as Json };
      if (users.length < 200) return null;
    }
    return null;
  }
  // Take this one TeenWork account off the sign-in. An email can hold several accounts (key, key#2…):
  // the sign-in itself is deleted only when none is left.
  async function removeSignIn(key: string, user: { id: string; user_metadata: Json } | null) {
    if (!user) return "none";
    const meta = { ...user.user_metadata };
    const slot = slotOfKey(key);
    let extras = Array.isArray(meta.tw_accounts) ? (meta.tw_accounts as Json[]) : [];
    if (slot === 1) meta.account_type = "closed";
    else extras = extras.filter((x) => (parseInt(String(x?.slot), 10) || 0) !== slot);
    meta.tw_accounts = extras;
    const left = (ROLES.includes(String(meta.account_type)) ? 1 : 0) + extras.filter((x) => ROLES.includes(String(x?.type)) && (parseInt(String(x?.slot), 10) || 0) > 1).length;
    if (!left) {
      const r = await fetchImpl(`${env.url}/auth/v1/admin/users/${q(user.id)}`, { method: "DELETE", headers: svc });
      if (!r.ok && r.status !== 404) throw new Error(`auth delete ${r.status}`);
      try { await del("permit_checks", `user_id=eq.${q(user.id)}`); } catch { /* table may be missing */ }
      return "deleted";
    }
    const r = await fetchImpl(`${env.url}/auth/v1/admin/users/${q(user.id)}`, { method: "PUT", headers: svc, body: JSON.stringify({ user_metadata: meta }) });
    if (!r.ok) throw new Error(`auth update ${r.status}`);
    return "updated";
  }

  // Everything in other people's rows that points at this account.
  async function unlinkFromOthers(key: string, type: string) {
    const email = emailOfKey(key);
    // a teen's link request to a parent, a parent's consent for a teen (rows under the other person)
    for (const k of [`link_request:${key}`, `consent:${key}`]) await del("user_data", `key=eq.${q(k)}`);
    // teens' applications to this employer's jobs, and shifts the AI found with this employer
    const apps = await select(`key=like.job_app:*&value=like.${q(`*${key}*`)}`);
    for (const r of apps) { const v = parse(r.value); if (r.email !== key && low(v?.employerKey) === key) await delRow(r); }
    const shifts = await select(`key=like.${q(`found_shift:${key}:*`)}`);
    for (const r of shifts) if (r.email !== key && r.key.startsWith(`found_shift:${key}:`)) await delRow(r);
    // parents' lists of linked teens
    for (const r of await select(`key=eq.linked_teens&value=like.${q(`*${email}*`)}`)) {
      if (r.email === key) continue;
      const v = parse(r.value) ?? {};
      const teens = Array.isArray(v.teens) ? v.teens : [];
      const keep = teens.filter((t: Json) => low(t?.key) !== key && !(slotOfKey(key) === 1 && low(t?.email) === email && !String(t?.key ?? "").includes("#")));
      if (keep.length !== teens.length) await setValue(r, { ...v, teens: keep, updatedAt: Date.now() });
    }
    // teens' parent links, when a parent account goes
    if (type === "parent" || type === "") {
      for (const r of await select(`key=eq.parent_link&value=like.${q(`*${email}*`)}`)) {
        if (r.email === key) continue;
        const v = parse(r.value) ?? {};
        const was = (Array.isArray(v.parents) ? v.parents : []).map(low);
        if (!was.includes(email) && low(v.parentEmail) !== email) continue;
        const parents = was.filter((x: string) => x && x !== email);
        const consents = { ...(v.consents ?? {}) }; delete consents[email];
        const next = parents.length
          ? { ...v, parents, consents, parentEmail: low(v.parentEmail) === email ? parents[0] : v.parentEmail, parentName: low(v.parentEmail) === email ? "" : v.parentName, updatedAt: Date.now() }
          : { ...v, parents: [], consents, status: "unlinked", parentEmail: "", parentName: "", unlinkedAt: new Date().toISOString(), updatedAt: Date.now() };
        await setValue(r, next);
      }
    }
    // chats
    await del("messages", `from_key=eq.${q(key)}`);
    await del("messages", `to_key=eq.${q(key)}`);
  }
  const adminEmail = low(env.adminEmail || ADMIN_EMAIL);
  async function deleteOwn(key: string, all: boolean) {
    if (all) { await del("user_data", `email=eq.${q(key)}` + (key === adminEmail ? `&key=not.in.(${ADMIN_KEYS.join(",")})` : "")); return; }
    await del("user_data", `email=eq.${q(key)}&key=in.(${PUBLIC_KEYS.join(",")})`);
    for (const p of PUBLIC_PREFIXES) await del("user_data", `email=eq.${q(key)}&key=like.${q(p + "*")}`);
  }
  async function typeOf(key: string) {
    try { const r = await select(`email=eq.${q(key)}&key=eq.account_profile`); const t = low(parse(r[0]?.value)?.type); return ROLES.includes(t) ? t : ""; } catch { return ""; }
  }
  async function mark(key: string, row: Json) {
    await rest("closed_accounts?on_conflict=key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key, ...row }) });
  }

  async function purgeOne(key: string, type: string) {
    await unlinkFromOthers(key, type);
    await deleteOwn(key, true);
    const signIn = await removeSignIn(key, await findAuthUser(emailOfKey(key)));
    await mark(key, { purged_at: new Date().toISOString() });
    return signIn;
  }

  return async function handle(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return fail(405, "method", "Use POST.");
    if (!env.url || !env.serviceKey) return fail(500, "setup", "The delete-account function is not set up (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    let body: Json = {};
    try { body = await req.json(); } catch { return fail(400, "bad_json", "Send JSON."); }
    if (body.ping) return json({ ok: true, ready: true, keepDays: KEEP_DAYS });
    const action = String(body.action ?? "");
    const now = new Date();
    try {
      if (action === "purge") {
        const due = await (await rest(`closed_accounts?select=key,type&purged_at=is.null&purge_after=lt.${q(now.toISOString())}&limit=100`)).json();
        const done: string[] = [];
        for (const r of due ?? []) { if (validKey(r.key)) { await purgeOne(r.key, low(r.type)); done.push(r.key); } }
        return json({ ok: true, purged: done.length });
      }
      const key = low(body.key);
      if (!validKey(key)) return fail(400, "bad_key", "That account key isn't valid.");

      if (action === "self") {
        const token = String(req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        const user = token ? await userFromToken(token) : null;
        if (!user) return fail(401, "sign_in", "Please sign in again, then try once more.");
        if (user.email !== emailOfKey(key)) return fail(403, "not_yours", "You can only delete your own account.");
        const type = (await typeOf(key)) || low(body.type);
        await unlinkFromOthers(key, type);
        await deleteOwn(key, true);
        const signIn = await removeSignIn(key, user);
        await mark(key, { type, closed_by: "self", closed_at: now.toISOString(), purge_after: now.toISOString(), purged_at: now.toISOString() });
        return json({ ok: true, key, closed_by: "self", signIn });
      }

      if (action === "close") {
        const pw = String(body.adminPassword ?? "");
        if (!pw || !env.adminSalt || !env.adminHash || (await sha256hex(env.adminSalt + ":" + pw)) !== env.adminHash) return fail(403, "admin_password", "That isn't the admin password.");
        const type = (await typeOf(key)) || low(body.type);
        const purgeAfter = new Date(now.getTime() + KEEP_DAYS * 86_400_000).toISOString();
        await unlinkFromOthers(key, type);
        await deleteOwn(key, false);
        await mark(key, { type, closed_by: "admin", closed_at: now.toISOString(), purge_after: purgeAfter, purged_at: null });
        return json({ ok: true, key, closed_by: "admin", purge_after: purgeAfter });
      }
      return fail(400, "bad_action", "Unknown action.");
    } catch (e) {
      console.warn(`delete-account: ${String(e).slice(0, 300)}`);
      return fail(502, "failed", "Something went wrong while deleting. Some of it may be done already: please try again.");
    }
  };
}
