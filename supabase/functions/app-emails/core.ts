// app-emails: TeenWork's occasional "get the app" reminder emails (v57, 2026-11-13).
// Aya: "have a download app button and a popup try to get users to download and send emails about sometimes".
// Aya, later the same day: "don't just end promotional stuff unless they unsubscribe". So the reminders keep
// coming every 3 weeks until the person unsubscribes (or opens TeenWork as an installed app, which is what
// they ask for). The wording takes turns between three versions so it isn't the same email every time.
// The logic lives here, apart from Deno.serve, so tests/app-emails-function.mjs can run it in Node.
//
// What it does, once a day (pg_cron calls POST {"action":"run"}, see migration 20261113_app_emails.sql):
//   • asks the database who is due (rpc tw_app_email_claim): teen / parent / employer accounts at least
//     2 days old that haven't opened TeenWork as an installed app and haven't unsubscribed. Never the admin,
//     demo / .test addresses or Aya's tester inboxes. One every 21+ days, with no limit on how many.
//     People with the fewest reminders go first, so new accounts aren't crowded out.
//     The database also refuses a second run within 20 hours, so calling this function again sends nothing.
//   • sends each one a short email through Resend from the same address as the app's other emails, with a
//     one-click unsubscribe (List-Unsubscribe headers + a link to https://teenwork.ayaqd.com/?unsub=<token>).
//   • shares the app's daily email budget (email_send_log via tw_email_reserve): reminders stop once the
//     last 24 hours hold APP_EMAILS_DAY_CAP emails of any kind (default 60), so at least 35 of the 95 a day
//     stay free for sign-up, parent and job emails. At most APP_EMAILS_PER_RUN (default 20) per run.
//   • no tracking pixels, no click tracking, only the person's first name. Teens' emails go to their own
//     address only.
//
// Other requests:
//   POST {"ping":true}            → is it set up? Sends nothing.
//   POST {"action":"preview", "role":"teen|parent|employer", "step":1|2|3…, "name":"Sam"}
//                                 → the email it would send (subject, html, text). Sends nothing.
//   GET  ?unsub=<token>           → redirects to the site's unsubscribe page (Supabase shows HTML as text).
//   POST ?unsub=<token>           → one-click unsubscribe from a mail app (RFC 8058).
//
// Secrets (the same ones send-email uses; Supabase dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY, RESEND_FROM (e.g. hello@teenwork.ayaqd.com). Nothing is sent without both, and never
//   from Resend's test sender.
// Optional: SITE_URL (default https://teenwork.ayaqd.com), APP_EMAILS_PER_RUN, APP_EMAILS_DAY_CAP,
//   APP_EMAILS_MAX_PER_PERSON (a cap on reminders per person; unset = no cap, keep going until they unsubscribe),
//   APP_EMAILS_OFF=1 (sends nothing), APP_EMAILS_SECRET (when set, "run" needs header x-tw-cron with it),
//   MAIL_POSTAL_ADDRESS (a mailing address shown in the footer; US law (CAN-SPAM) asks for one in
//   promotional email: a P.O. box is fine).
// Deploy with Verify JWT off (pg_cron calls it without a sign-in). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

export type Env = {
  url: string; serviceKey: string; resendKey: string; resendFrom: string; site: string;
  perRun: number; dayCap: number; minAgeDays: number; gapDays: number; maxPerUser: number;   // maxPerUser 0 = no cap
  off: boolean; secret: string; postal: string; pauseMs: number;
};
export type Person = { user_id: string; email: string; first_name: string | null; account_type: string | null; step: number; unsub_token: string; prev_last_at: string | null };

const RESEND_URL = "https://api.resend.com/emails";
const TEST_SENDER = "onboarding@resend.dev";
const EMAIL_RE = /^[^\s@<>,;:"()\[\]\\]+@[^\s@<>,;:"()\[\]\\]+\.[A-Za-z]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isEmail(s: unknown): s is string { return typeof s === "string" && s.length <= 254 && EMAIL_RE.test(s); }

const C = { green: "#2d6a4f", dark: "#1a4731", darker: "#0d2d1e", greenLight: "#52b788", greenPale: "#d8f3dc", amber: "#e76f00", amberMid: "#f49d37", bg: "#f5f0e8", card: "#fffdf7", text: "#1c1c1c", muted: "#4b5563", border: "#e2ddd4" };
const FONT = "'DM Sans',Arial,Helvetica,sans-serif";
const DISPLAY = "Fraunces,Georgia,'Times New Roman',serif";

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
// A first name we can safely print: the letters (and ' -) it starts with, at most 30 characters.
export function cleanName(s: unknown): string {
  const m = String(s ?? "").trim().match(/^[\p{L}\p{M}'’-]+/u);
  return m ? m[0].slice(0, 30) : "";
}

export function buildEmail(p: { first_name?: string | null; account_type?: string | null; step: number; unsub_token: string }, env: Pick<Env, "site" | "postal">) {
  const site = env.site.replace(/\/+$/, "");
  const name = cleanName(p.first_name);
  const hi = `Hi ${esc(name || "there")},`;
  const appLink = `${site}/?app=1`;
  const unsubLink = `${site}/?unsub=${encodeURIComponent(p.unsub_token)}`;
  const role = p.account_type === "parent" || p.account_type === "employer" ? p.account_type : "teen";
  const oneTap = role === "parent" ? "your teen&rsquo;s job requests and alerts are one tap away"
    : role === "employer" ? "new applicants and messages are one tap away"
    : "new jobs, messages and your work log are one tap away";
  // Three versions that take turns: 1st email = A, 2nd = B, 3rd = C, 4th = A again, and so on.
  const V = [
    {
      subject: "Put TeenWork on your phone 📲", heading: "Put TeenWork on your phone",
      preheader: "It’s free, there’s no app store, and it takes about 10 seconds.",
      intro: `TeenWork works great as an app on your phone. It&rsquo;s free, there&rsquo;s no app store, and it takes about 10 seconds. Then ${oneTap}.`,
      outro: "Sign in with the same email and password. It&rsquo;s the same TeenWork, so your account, jobs and messages are all there.",
    },
    {
      subject: "TeenWork is one tap away", heading: "TeenWork is one tap away",
      preheader: "Add it to your home screen so it opens like an app.",
      intro: `Quick tip: you can add TeenWork to your phone&rsquo;s home screen, so it opens like any other app. Then ${oneTap}.`,
      outro: "Sign in with the same email and password. Once you open TeenWork from your home screen, these reminders stop.",
    },
    {
      subject: "A faster way to open TeenWork", heading: "Open TeenWork in one tap",
      preheader: "No typing the address, no hunting for the tab.",
      intro: `Here&rsquo;s a shortcut: put TeenWork on your home screen and it opens in one tap, full screen, like any other app. No typing the address and no hunting for the tab. Then ${oneTap}.`,
      outro: "Already added it? Open TeenWork from your home screen and sign in once, and these reminders stop.",
    },
  ];
  const v = V[(Math.max(1, Math.floor(Number(p.step) || 1)) - 1) % V.length];
  const subject = v.subject;
  const preheader = v.preheader;
  const button = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:22px auto;"><tr><td bgcolor="${C.green}" style="border-radius:12px;background:${C.green};">` +
    `<a href="${appLink}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">&#128242; Get the TeenWork app</a></td></tr></table>`;
  const how = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;background:${C.bg};border:1px solid ${C.border};border-radius:14px;"><tr><td style="padding:14px 18px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.text};">` +
    `<b>iPhone:</b> open teenwork.ayaqd.com in Safari, tap the <b>Share</b> button, then <b>Add to Home Screen</b>.<br>` +
    `<b>Android:</b> open it in Chrome, then tap <b>Install app</b> (or the menu &#8942; &rarr; <b>Add to Home screen</b>).` +
    `</td></tr></table>`;
  const body = `<p style="margin:0 0 14px;">${hi}</p>` +
    `<p style="margin:0 0 14px;">${v.intro}</p>` +
    button + how +
    `<p style="margin:16px 0 0;">${v.outro}</p>`;
  const plain = (h: string) => h.replace(/&rsquo;/g, "'");
  const html =
    `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.bg};">${esc(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="width:100%;background:${C.bg};margin:0;padding:0;"><tr><td align="center" style="padding:28px 12px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="width:100%;max-width:600px;background:${C.card};border:1px solid ${C.border};border-radius:20px;overflow:hidden;">` +
      `<tr><td bgcolor="${C.green}" style="background:${C.green};background-image:linear-gradient(135deg,${C.green} 0%,${C.dark} 60%,${C.darker} 100%);padding:22px 28px;border-radius:20px 20px 0 0;">` +
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
          `<td style="padding-right:12px;"><img src="${site}/logo.png" width="52" height="52" alt="TeenWork tree logo" style="display:block;width:52px;height:52px;border:2px solid #24553f;border-radius:12px;background:#fffdf7;"></td>` +
          `<td style="font-family:${DISPLAY};font-size:28px;font-weight:900;line-height:1.1;color:#ffffff;">Teen<span style="color:${C.amberMid};">Work</span></td>` +
        `</tr></table></td></tr>` +
      `<tr><td height="6" style="height:6px;line-height:6px;font-size:0;background:${C.amber};background-image:linear-gradient(90deg,${C.amber} 0%,${C.amberMid} 45%,${C.greenLight} 100%);">&nbsp;</td></tr>` +
      `<tr><td style="padding:28px 30px 6px;"><h1 style="margin:0;font-family:${DISPLAY};font-size:25px;line-height:1.25;font-weight:900;color:${C.green};">${esc(v.heading)}</h1></td></tr>` +
      `<tr><td style="padding:14px 30px 28px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.text};">${body}</td></tr>` +
      `<tr><td bgcolor="${C.bg}" style="background:${C.bg};border-top:1px solid ${C.border};padding:18px 30px 22px;text-align:center;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};border-radius:0 0 20px 20px;">` +
        `<div style="font-family:${DISPLAY};font-size:15px;font-weight:900;color:${C.green};margin-bottom:4px;">&#127795; Built by a teen, for teens.</div>` +
        `You&rsquo;re getting this because you have a TeenWork account. We send a reminder like this every few weeks until you add the app or unsubscribe.<br>` +
        `<a href="${unsubLink}" style="color:${C.green};text-decoration:underline;">Unsubscribe from reminders like this</a>. You&rsquo;ll still get the emails you need, like sign-in codes and parent approvals.` +
        (env.postal ? `<br>TeenWork &middot; ${esc(env.postal)}` : "") +
      `</td></tr>` +
    `</table></td></tr></table>`;
  const text = [
    name ? `Hi ${name},` : "Hi there,",
    "",
    plain(v.intro),
    "",
    `Get the app: ${appLink}`,
    "",
    "iPhone: open teenwork.ayaqd.com in Safari, tap the Share button, then Add to Home Screen.",
    "Android: open it in Chrome, then tap Install app (or the menu, then Add to Home screen).",
    "",
    plain(v.outro),
    "",
    "--",
    "You're getting this because you have a TeenWork account. We send a reminder like this every few weeks until you add the app or unsubscribe.",
    `Unsubscribe: ${unsubLink}`,
    env.postal ? `TeenWork · ${env.postal}` : "",
  ].join("\n").trim();
  return { subject, html, text, preheader };
}

async function sha(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("teenwork-email:" + s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function makeHandler(env: Env, fetchImpl: typeof fetch = fetch) {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const fail = (status: number, code: string, error: string) => json({ ok: false, code, error }, status);
  const fromAddr = env.resendFrom;
  const configured = !!env.resendKey && isEmail(fromAddr) && fromAddr.toLowerCase() !== TEST_SENDER;

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

  async function run(): Promise<Response> {
    if (env.off) return json({ ok: true, sent: 0, off: true });
    if (!configured) return fail(503, "not_configured", "RESEND_API_KEY / RESEND_FROM are not set (or RESEND_FROM is Resend's test sender)");
    let people: Person[];
    try {
      people = (await rpc("tw_app_email_claim", {
        p_limit: env.perRun, p_min_age: `${env.minAgeDays} days`, p_gap: `${env.gapDays} days`, p_max_per_user: env.maxPerUser,
      })) ?? [];
    } catch (e) {
      return fail(503, "db", "Could not pick who is due: " + String((e as Error)?.message ?? e));
    }
    const out = { ok: true, due: people.length, sent: 0, failed: 0, put_back: 0, stopped: "" };
    const putBack = async (p: Person) => { try { await rpc("tw_app_email_unclaim", { p_user: p.user_id, p_prev_last_at: p.prev_last_at }); out.put_back++; } catch { /* they just miss this reminder */ } };
    const jobHash = await sha("job:app-emails");
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      if (out.stopped || !isEmail(p.email)) { await putBack(p); continue; }
      let logId: number | null = null;
      try {
        const r = await rpc("tw_email_reserve", { p_ip_hash: jobHash, p_to_hash: await sha("to:" + p.email.toLowerCase()), p_max_ip_hour: 1000, p_max_to_hour: 8, p_max_day: env.dayCap });
        if (!r?.ok) { if (r?.reason === "daily_limit") out.stopped = "daily_limit"; await putBack(p); continue; }
        logId = r.id;
      } catch {
        out.stopped = "limits_unavailable"; await putBack(p); continue;
      }
      const mail = buildEmail(p, env);
      const unsubPost = `${env.url}/functions/v1/app-emails?unsub=${encodeURIComponent(p.unsub_token)}`;
      let status = 0, data: any = null;
      try {
        const res = await fetchImpl(RESEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.resendKey}`, "Idempotency-Key": `app-email/${p.user_id}/step-${p.step}` },
          body: JSON.stringify({
            from: `TeenWork <${fromAddr}>`,
            to: [p.email],
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
            headers: { "List-Unsubscribe": `<${unsubPost}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
            tags: [{ name: "app", value: "teenwork" }, { name: "kind", value: "app_reminder" }, { name: "step", value: String(p.step) }],
          }),
        });
        status = res.status;
        data = await res.json().catch(() => null);
      } catch (e) {
        data = { message: "Could not reach Resend: " + String((e as Error)?.message ?? e) };
      }
      const ok = status >= 200 && status < 300 && !!data?.id;
      try { await rpc("tw_email_finish", { p_id: logId, p_status: ok ? "sent" : "failed", p_resend_id: ok ? data.id : null, p_error: ok ? null : `${status} ${String(data?.message ?? "Resend error")}` }); } catch { /* logged or not, the email went (or not) */ }
      if (ok) out.sent++;
      else {
        out.failed++;
        await putBack(p);
        if (status === 401 || status === 403 || status === 429 || status === 0 || status >= 500) out.stopped = "resend_" + (status || "unreachable");
      }
      if (i < people.length - 1 && env.pauseMs > 0) await sleep(env.pauseMs);   // Resend allows about 2 requests a second
    }
    return json(out);
  }

  return async function handle(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    const u = new URL(req.url);
    const unsub = u.searchParams.get("unsub");
    if (unsub !== null) {
      if (!UUID_RE.test(unsub)) return new Response("This unsubscribe link isn't valid.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      if (req.method === "GET") return new Response(null, { status: 302, headers: { Location: `${env.site.replace(/\/+$/, "")}/?unsub=${unsub.toLowerCase()}` } });
      if (req.method === "POST") {
        try { await rpc("tw_email_unsubscribe", { p_token: unsub.toLowerCase() }); }
        catch { return new Response("Sorry, that didn't work. Please try again later.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }); }
        return new Response("You won't get TeenWork reminder emails any more.", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    }
    if (req.method !== "POST") return fail(405, "bad_request", "POST only");
    let body: any;
    try { body = await req.json(); } catch { return fail(400, "bad_request", "Bad JSON"); }
    if (body?.ping) return json({ ok: true, configured, off: env.off, per_run: env.perRun, day_cap: env.dayCap, from_domain: (fromAddr.split("@")[1] || "") });
    if (body?.action === "preview") {
      const step = Math.min(Math.max(Math.floor(Number(body.step)) || 1, 1), 999);
      const mail = buildEmail({ first_name: body.name ?? "Sam", account_type: String(body.role || "teen"), step, unsub_token: "00000000-0000-4000-8000-000000000000" }, env);
      return json({ ok: true, ...mail });
    }
    if (body?.action === "run") {
      if (env.secret && req.headers.get("x-tw-cron") !== env.secret) return fail(401, "unauthorized", "Wrong or missing x-tw-cron");
      return await run();
    }
    return fail(400, "bad_request", "Unknown request");
  };
}

export function envFrom(get: (k: string) => string | undefined): Env {
  const s = (k: string) => (get(k) ?? "").trim();
  const n = (k: string, d: number, max: number) => { const v = Number(s(k)); return Number.isFinite(v) && v > 0 ? Math.min(v, max) : d; };
  return {
    url: s("SUPABASE_URL"), serviceKey: s("SUPABASE_SERVICE_ROLE_KEY"),
    resendKey: s("RESEND_API_KEY"), resendFrom: s("RESEND_FROM"),
    site: s("SITE_URL") || "https://teenwork.ayaqd.com",
    perRun: n("APP_EMAILS_PER_RUN", 20, 60), dayCap: n("APP_EMAILS_DAY_CAP", 60, 90),
    minAgeDays: 2, gapDays: 21, maxPerUser: n("APP_EMAILS_MAX_PER_PERSON", 0, 1000),   // 0 = no cap
    off: /^(1|true|yes|on)$/i.test(s("APP_EMAILS_OFF")), secret: s("APP_EMAILS_SECRET"), postal: s("MAIL_POSTAL_ADDRESS").slice(0, 200),
    pauseMs: 600,
  };
}
