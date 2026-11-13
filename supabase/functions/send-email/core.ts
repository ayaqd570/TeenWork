// send-email: the logic, kept apart from Deno.serve so the tests can run it in Node too.
// Sends TeenWork's emails to people (welcome, parent link, consent, letters…) through Resend
// (resend.com) with a server-side key, so the key is never in the page.
// Emails TO the TeenWork team (Help & Support, school partnerships, sign-up notices) go through
// EmailJS in the app instead (Aya, 2026-11-06: "use resend for sending, emailjs for receiving").
//
// The page sends { to, subject, html, reply_to?, from_name? } (one recipient).
// { ping: true } only reports whether the function is set up; it sends nothing.
//
// Production rules (2026-11-06), so the open function can't be used to send phishing from the
// TeenWork address once a real domain is verified:
//   • Signed in (Authorization: Bearer <the person's Supabase access token>): links may only point to
//     the TeenWork site (SITE_URL) or be mailto: links; any other link is turned into plain text.
//     Limit: EMAIL_MAX_PER_USER_HOUR (default 20) per signed-in person.
//   • Not signed in (the publishable key): every link is turned into plain text.
//     Limit: EMAIL_MAX_PER_SENDER_HOUR (default 15) per IP address.
//   • Always: no images, scripts, forms or iframes; one valid recipient; subject without line breaks;
//     HTML ≤ 200 KB; 8 an hour per recipient (60 for team inboxes); 95 a day in all.
//
// Secrets (Supabase dashboard → Edge Functions → Secrets, never in a file):
//   RESEND_API_KEY   re_...  (required)
//   RESEND_FROM      e.g. hello@ayaqd.com, an address on a domain verified in Resend.
//                    Unset = Resend's test sender onboarding@resend.dev, which only delivers to the
//                    email address the Resend account was made with.
// Optional: SITE_URL (default https://teenwork.ayaqd.com), TEAM_EMAILS (comma list), EMAIL_MAX_PER_DAY,
//   EMAIL_MAX_PER_SENDER_HOUR, EMAIL_MAX_PER_USER_HOUR, EMAIL_MAX_PER_RECIPIENT_HOUR, ALLOWED_ORIGIN.
// Needs the email_send_log table + tw_email_reserve / tw_email_finish (migration 20261015_email_send_log.sql).

export type Env = {
  url: string; serviceKey: string; anonKey: string;
  resendKey: string; resendFrom: string; site: string; origin: string;
  team: string; maxDay: number; maxIpHour: number; maxUserHour: number; maxToHour: number;
};

const RESEND_URL = "https://api.resend.com/emails";
export const TEST_SENDER = "onboarding@resend.dev";
const MAX_HTML = 200_000;
const EMAIL_RE = /^[^\s@<>,;:"()\[\]\\]+@[^\s@<>,;:"()\[\]\\]+\.[A-Za-z]{2,}$/;
export const DEFAULT_TEAM = "ayaquarrierdraper@gmail.com,aqdteenwork@gmail.com";

export function isEmail(s: unknown): s is string { return typeof s === "string" && s.length <= 254 && EMAIL_RE.test(s); }

// "TeenWork …" display names only, so nobody can send as "Your Bank" from the TeenWork address.
export function fromName(s: unknown): string {
  const n = String(s ?? "").replace(/[^A-Za-z0-9 &'\-]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  return /^TeenWork\b/.test(n) ? n : "TeenWork";
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Is this link allowed in an email from TeenWork? Only the TeenWork site itself (and mailto:).
export function linkAllowed(href: string, site: string, signedIn: boolean): boolean {
  if (!signedIn) return false;
  const h = decode(href).trim();
  if (/^mailto:[^\s<>"]+$/i.test(h)) return true;
  try {
    const u = new URL(h), s = new URL(site);
    return u.protocol === "https:" && u.hostname === s.hostname && !u.username && !u.password && (!u.port || u.port === s.port);
  } catch { return false; }
}

// The one picture an email may show (v56): TeenWork's tree logo in the email header, and only from
// the TeenWork site itself at /email-logo.png. It is rebuilt as a fixed tag, so nothing else in the
// original <img> (other attributes, event handlers) survives.
export function logoTag(tag: string, site: string): string {
  const sm = tag.match(/\ssrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const src = sm ? decode(sm[2] ?? sm[3] ?? sm[4] ?? "").trim() : "";
  try {
    const u = new URL(src), s = new URL(site);
    const ok = u.protocol === "https:" && u.hostname === s.hostname && !u.username && !u.password &&
      (!u.port || u.port === s.port) && u.pathname === "/email-logo.png" && !u.search && !u.hash;
    if (!ok) return "";
    return `<img src="https://${s.host}/email-logo.png" width="44" height="44" alt="TeenWork tree logo" ` +
      `style="display:block;width:44px;height:44px;border:0;outline:none;text-decoration:none;border-radius:10px;">`;
  } catch { return ""; }
}

// Remove what an email never needs (scripts, forms, images other than the logo…) and turn links that
// aren't allowed into their plain text, so the TeenWork address can't carry someone else's link.
export function cleanHtml(html: string, site: string, signedIn: boolean): { html: string; removedLinks: number } {
  let removed = 0;
  let out = html
    .replace(/<(script|style|iframe|object|embed|form|svg|math|template)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|iframe|object|embed|form|input|button|textarea|select|img|svg|link|meta|base|frame|frameset|source|video|audio)\b[^>]*>/gi,
      (m: string, tag: string) => (tag.toLowerCase() === "img" ? logoTag(m, site) : ""))
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/url\s*\(/gi, "url-(")
    .replace(/(href|src)\s*=\s*(["'])\s*(javascript|data|vbscript):[^"']*\2/gi, "");
  out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi, (_m, attrs: string, label: string) => {
    const hm = attrs.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = hm ? (hm[2] ?? hm[3] ?? hm[4] ?? "") : "";
    if (href && linkAllowed(href, site, signedIn)) return `<a${attrs}>${label}</a>`;
    if (href) removed++;
    return `<span>${label}</span>`;
  });
  // a stray opening <a> without a closing tag
  out = out.replace(/<a\b[^>]*>/gi, (m) => { const hm = m.match(/\shref\s*=\s*("([^"]*)"|'([^']*)')/i); const href = hm ? (hm[2] ?? hm[3] ?? "") : ""; if (href && linkAllowed(href, site, signedIn)) return m; removed++; return "<span>"; });
  return { html: out, removedLinks: removed };
}

export function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<div[^>]*display:\s*none[^>]*>[\s\S]*?<\/div>/i, "")   // the hidden preheader
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr|li|table)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => `${label} (${href})`)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
    .replace(/&#(\d+);/g, (_m, d) => { try { return String.fromCodePoint(Number(d)); } catch { return ""; } })
    .replace(/[‌͏ ]/g, "")
    .replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function sha(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("teenwork-email:" + s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function makeHandler(env: Env, fetchImpl: typeof fetch = fetch) {
  const cors = {
    "Access-Control-Allow-Origin": env.origin || "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const fail = (status: number, code: string, error: string) => json({ ok: false, code, error }, status);

  async function rpc(fn: string, args: Record<string, unknown>): Promise<any> {
    if (!env.url || !env.serviceKey) throw new Error("no service key");
    const r = await fetchImpl(`${env.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}` },
      body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error(`${fn} ${r.status}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }

  // The signed-in person behind the request, or null for the publishable key / no token.
  async function signedInUser(req: Request): Promise<{ id: string; email: string } | null> {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token || token === env.anonKey || token.split(".").length !== 3 || !env.url) return null;
    try {
      const r = await fetchImpl(`${env.url}/auth/v1/user`, { headers: { apikey: env.anonKey || env.serviceKey, Authorization: `Bearer ${token}` } });
      if (!r.ok) return null;
      const u = await r.json();
      return u && u.id ? { id: String(u.id), email: String(u.email ?? "") } : null;
    } catch { return null; }
  }

  return async function handle(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return fail(405, "bad_request", "POST only");

    let body: any;
    try { body = await req.json(); } catch { return fail(400, "bad_request", "Bad JSON"); }

    const fromAddr = env.resendFrom || TEST_SENDER;
    const testing = fromAddr.toLowerCase() === TEST_SENDER;
    if (body?.ping) {
      return json({ ok: true, configured: !!env.resendKey, testing, from_domain: fromAddr.split("@")[1] || "", links: "teenwork-only" });
    }
    if (!env.resendKey) return fail(503, "not_configured", "RESEND_API_KEY is not set");
    if (!isEmail(fromAddr)) return fail(503, "not_configured", "RESEND_FROM is not a valid email address");

    const to = String(body?.to ?? "").trim();
    if (!isEmail(to)) return fail(400, "bad_request", "One valid recipient address is required");
    const subject = String(body?.subject ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 250) || "TeenWork";
    const rawHtml = typeof body?.html === "string" ? body.html : "";
    if (!rawHtml.trim()) return fail(400, "bad_request", "html is required");
    if (rawHtml.length > MAX_HTML) return fail(413, "bad_request", "Email is too large");
    const replyTo = String(body?.reply_to ?? "").trim();

    const user = await signedInUser(req);
    const { html } = cleanHtml(rawHtml, env.site, !!user);

    // Limits, so the function can't be used to spam people (or burn the daily Resend quota).
    const team = (env.team || DEFAULT_TEAM).toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "";
    // Signed-in people are limited per person, everyone else per IP address (same column, different prefix).
    const senderHash = user ? await sha("user:" + user.id) : (ip ? await sha("ip:" + ip) : null);
    let logId: number | null = null;
    try {
      const r = await rpc("tw_email_reserve", {
        p_ip_hash: senderHash,
        p_to_hash: await sha("to:" + to.toLowerCase()),
        p_max_ip_hour: user ? env.maxUserHour : env.maxIpHour,
        p_max_to_hour: team.includes(to.toLowerCase()) ? 60 : env.maxToHour,
        p_max_day: env.maxDay,
      });
      if (!r?.ok) return fail(429, "limit", `Send limit reached (${r?.reason ?? "unknown"})`);
      logId = r.id;
    } catch (e) {
      return fail(503, "limits_unavailable", "Send limits could not be checked: " + String((e as Error)?.message ?? e));
    }

    const payload: Record<string, unknown> = {
      from: `${fromName(body?.from_name)} <${fromAddr}>`,
      to: [to],
      subject,
      html,
      text: htmlToText(html),
      tags: [{ name: "app", value: "teenwork" }, { name: "sender", value: user ? "member" : "anon" }],
    };
    if (isEmail(replyTo)) payload.reply_to = replyTo;

    let status = 0, data: any = null;
    try {
      const upstream = await fetchImpl(RESEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.resendKey}` },
        body: JSON.stringify(payload),
      });
      status = upstream.status;
      data = await upstream.json().catch(() => null);
    } catch (e) {
      data = { message: "Could not reach Resend: " + String((e as Error)?.message ?? e) };
    }

    const ok = status >= 200 && status < 300 && !!data?.id;
    const message = String(data?.message ?? data?.error ?? (ok ? "" : "Resend error"));
    try { await rpc("tw_email_finish", { p_id: logId, p_status: ok ? "sent" : "failed", p_resend_id: ok ? data.id : null, p_error: ok ? null : `${status} ${message}` }); } catch { /* the email itself already went (or not) */ }

    if (ok) return json({ ok: true, id: data.id, testing });
    // Resend's test sender only reaches the account's own address; a domain must be verified for anyone else.
    const code = status === 403 && /testing emails|verify a domain|not verified/i.test(message) ? "testing_only"
      : status === 429 ? "resend_limit"
      : status === 401 || status === 403 ? "bad_key"
      : "resend_error";
    return fail(status >= 400 ? status : 502, code, message);
  };
}

export function envFrom(get: (k: string) => string | undefined): Env {
  const s = (k: string) => (get(k) ?? "").trim();
  const n = (k: string, d: number) => { const v = Number(s(k)); return Number.isFinite(v) && v > 0 ? v : d; };
  return {
    url: s("SUPABASE_URL"), serviceKey: s("SUPABASE_SERVICE_ROLE_KEY"), anonKey: s("SUPABASE_ANON_KEY"),
    resendKey: s("RESEND_API_KEY"), resendFrom: s("RESEND_FROM"),
    site: s("SITE_URL") || "https://teenwork.ayaqd.com", origin: s("ALLOWED_ORIGIN") || "*",
    team: s("TEAM_EMAILS") || DEFAULT_TEAM,
    maxDay: n("EMAIL_MAX_PER_DAY", 95), maxIpHour: n("EMAIL_MAX_PER_SENDER_HOUR", 15),
    maxUserHour: n("EMAIL_MAX_PER_USER_HOUR", 20), maxToHour: n("EMAIL_MAX_PER_RECIPIENT_HOUR", 8),
  };
}
