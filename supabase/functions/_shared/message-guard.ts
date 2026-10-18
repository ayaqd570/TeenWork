// Shared message safety check for TeenWork Edge Functions (check-message, groq-chat).
//
//   Layer 1 – policy filter: fast regex scan for people trying to take work, pay, hours or
//             contact off TeenWork ("off the app", "pay cash", "text my cell", "dont log",
//             "add to calendar", …). No network call, runs in well under a millisecond.
//   Layer 2 – OpenAI Moderation (free): blocks hate, harassment, self-harm and sexual content.
//             Needs the OPENAI_API_KEY secret. If the key is missing or OpenAI can't be reached
//             the message is allowed (fail open) unless failClosed is set.
//
// Layer 1 runs first, so a message it blocks never costs a network call.

export type GuardRule = "off_platform" | "private_contact" | "off_app_payment" | "hidden_hours" | "private_scheduling";

export type GuardResult = {
  allowed: boolean;
  layer?: "policy" | "moderation";
  reason?: "policy_violation" | "harmful_content" | "check_unavailable";
  rule?: GuardRule;            // Layer 1 rule that matched
  categories?: string[];       // Layer 2 OpenAI categories that caused the block
  title?: string;              // short heading to show the sender
  message?: string;            // one or two sentences to show the sender
  moderation: "passed" | "flagged" | "skipped" | "error"; // what Layer 2 did
};

export type GuardOptions = {
  policy?: boolean;            // run Layer 1 (default true)
  moderation?: boolean;        // run Layer 2 (default true)
  openaiKey?: string;          // OPENAI_API_KEY; no key = Layer 2 skipped
  failClosed?: boolean;        // block when Layer 2 can't run because of an error (default false)
  timeoutMs?: number;          // Layer 2 time limit (default 4000)
  fetchFn?: typeof fetch;      // for tests
};

export const MODERATION_URL = "https://api.openai.com/v1/moderations";
export const MODERATION_MODEL = "omni-moderation-latest";
// OpenAI category families that block a message ("sexual" also covers "sexual/minors", etc.).
export const BLOCKED_FAMILIES = ["hate", "harassment", "self-harm", "sexual"];

// ── Layer 1: normalising ─────────────────────────────────────────────────────

const LOOKALIKES: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "ⅼ": "l",
};
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i", "|": "l" };
const isLetter = (c: string | undefined) => !!c && c >= "a" && c <= "z";

// Lower-case plain-letter version of the text: accents, look-alike letters, zero-width
// characters and apostrophes removed, "c4sh" → "cash", "o f f  t h e  a p p" → "offtheapp".
export function normalize(text: string): string {
  let s = String(text ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200b-\u200f\u2060\ufeff\u00ad]/g, "")
    .toLowerCase()
    .replace(/[а-яёіјѕԁⅼ]/g, (c) => LOOKALIKES[c] ?? c)
    .replace(/['’‘`´]/g, "");
  // leet characters count as letters only inside a word ("c4sh", "0ff"), so "$20" and "8am" stay as they are
  const chars = [...s];
  s = chars.map((c, i) => (LEET[c] && (isLetter(chars[i - 1]) || isLetter(chars[i + 1])) ? LEET[c] : c)).join("");
  // single letters spelled out with gaps: "c a s h", "o.f.f t.h.e a.p.p"
  s = s.replace(/(?<![a-z])[a-z](?:[\s.\-_*,/]{1,3}[a-z](?![a-z])){2,}/g, (m) => m.replace(/[^a-z]/g, ""));
  return s.replace(/\s+/g, " ").trim();
}

// ── Layer 1: rules ───────────────────────────────────────────────────────────

// Patterns are written with plain spaces; each space matches any run of separators,
// including none, so "off the app", "off-the-app" and "offtheapp" all match.
const SEP = "[^a-z0-9]*";
const rx = (src: string) => new RegExp("(?<![a-z])" + src.replace(/ /g, SEP) + "(?![a-z])");
const APP = "(the |this |our )?(app|platform|site|website|teen ?work|system)";
const NOT = "(dont|do not|dont you|no need to|wont|will not|lets not|not going to|not gonna|shouldnt|should not|never|stop|without)";

type Rule = { id: GuardRule; title: string; message: string; normalized: RegExp[]; raw?: RegExp[] };

export const POLICY_RULES: Rule[] = [
  {
    id: "off_platform",
    title: "Keep it on TeenWork",
    message: "Conversations and job plans need to stay in the TeenWork app so everyone stays protected.",
    normalized: [
      rx(`(off|outside( of)?|bypass(ing)?|skip(ping)?|avoid(ing)?|cut(ting)? out|go(ing)? around|not (through|thru|via|using)) ${APP}`),
      rx("(take|move|continue|keep) (this|it|things|our|the)( (chat|conversation|convo|talk))? (offline|private|elsewhere|somewhere else|off here)"),
      rx("(talk|chat|message|text) (somewhere else|elsewhere|privately|in private|off here)"),
      rx(`(dont|do not|no need to) (tell|let|inform|notify|show) ${APP}`),
    ],
  },
  {
    id: "private_contact",
    title: "Personal contact info isn't allowed",
    message: "Please don't share or ask for phone numbers, emails or social media. Keep talking here in TeenWork.",
    normalized: [
      rx("(text|txt|call|ring|phone) (my|your|ur) (cell|cellphone|mobile|phone|number|personal|private)"),
      rx("(text|txt|call|ring|facetime|dm|message|msg|snap|whatsapp|reach|contact|hit) (me|you|u)( up)? (at|on|directly|privately|personally|instead|outside)"),
      rx("(my|your|ur) (cell|cellphone|mobile|personal|private) (number|phone|num|#|is)"),
      new RegExp(`(?<![a-z])(my|your|ur|whats ${SEP}(your|ur)) ${SEP}(phone ${SEP})?(number|digits|num)(?![a-z])(?! ?of )`),
      rx("(add|follow|find|dm|message|hit) me (up )?on (snap|snapchat|insta|instagram|ig|tiktok|discord|whatsapp|telegram|signal|kik|facebook|fb|messenger)"),
      rx("(my )?(snap|snapchat|insta|ig|discord|tiktok|telegram|kik) (is|handle|name|username|user)"),
      rx("(whatsapp|telegram|kik)"),
      rx("at (gmail|yahoo|hotmail|outlook|icloud|aol|proton ?mail)"),
      rx("(gmail|yahoo|hotmail|outlook|icloud) dot com"),
    ],
    raw: [
      /(?<!\d)(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/, // 802-555-1234, (802) 555 1234, 8025551234
      /(?<!\d)(?:\d\s){9,10}\d(?!\d)/,                                 // 8 0 2 5 5 5 1 2 3 4
      /[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}/i,         // name@example.com
    ],
  },
  {
    id: "off_app_payment",
    title: "No cash or off-the-books pay",
    message: "Pay can't be arranged in cash or off the books in chat. Hours and pay need to be on record so teens are protected.",
    normalized: [
      rx("(pay|paid|paying|pays) (you |u |me |them |him |her )?(\\d+ )?(dollars )?(in |with |by |using |all )?(cash|cash money)"),
      rx("(cash (only|in hand|payment|job|under the table)|in cash|under the table|off the books|no paperwork|no taxes|tax free|untaxed)"),
    ],
  },
  {
    id: "hidden_hours",
    title: "All hours have to be logged",
    message: "Every hour worked has to be logged in TeenWork. That keeps teens within the legal hour limits.",
    normalized: [
      new RegExp(`(?<![a-z])${NOT.replace(/ /g, SEP)}${SEP}(log|logging|record|recording|report|reporting|track|tracking)(?![a-z])(?!${SEP}(in|into|on|onto|out|off|to|back|for duty)(?![a-z]))`),
      rx(`${NOT} clock(ing)? (in|out)`),
      rx("(work|working|worked|do it|do this|help) off the clock"),
      rx("off the clock (work|hours|shift|job)"),
      rx("(hide|hiding|fudge|fake|faking|cover up|lie about|pad) (the |your |my |these |those |some |a few |extra |our )*(hours|hrs|timesheet|time sheet|timecard|time card)"),
      rx("(hours|hrs|shift|shifts|time|it|this) (wont|will not|dont|do not|doesnt|does not|shouldnt|should not) (need to )?(be )?(logged|recorded|tracked|reported|on (the )?(app|record|books|timesheet))"),
      rx("keep (it|this|that|them|the hours|these hours|those hours|the time) (off|out of) (the )?(app|books|record|records|log|logs|timesheet|system|teen ?work)"),
      rx("(unlogged|unreported|unrecorded|off the record)"),
    ],
  },
  {
    id: "private_scheduling",
    title: "Plan shifts in TeenWork",
    message: "TeenWork adds shifts to your Work Calendar for you, so please plan them here instead of on a personal calendar.",
    normalized: [
      rx("(add|put|save|stick|throw|pop) (it |this |that |me |you |them |these |those |the (shift|job|time|date|hours) )?(to|on|in|into) (my |your |ur |our |the |a )?(own |personal |private |phone |google |apple |outlook |icloud )?(calendar|calender|cal|gcal|ical|planner)"),
      rx("(calendar|cal|google|outlook) invite"),
      rx("send (you|u|me) (an |a )?(invite|invitation)"),
      rx("(schedule|book|arrange|plan|set up) (it |this |that |shifts |the shift |the job |work |things )?(privately|directly|in private|on our own|ourselves|between us)"),
    ],
  },
];

// Layer 1 on its own: the first rule that matches, or null.
export function checkPolicy(text: string): Rule | null {
  const raw = String(text ?? "").normalize("NFKC");
  const norm = normalize(text);
  for (const rule of POLICY_RULES) {
    if (rule.normalized.some((re) => re.test(norm))) return rule;
    if (rule.raw && rule.raw.some((re) => re.test(raw))) return rule;
  }
  return null;
}

// ── Layer 2: OpenAI Moderation ───────────────────────────────────────────────

export type ModerationOutcome =
  | { status: "passed" }
  | { status: "flagged"; categories: string[] }
  | { status: "skipped" }
  | { status: "error"; detail: string };

export function blockedCategories(categories: Record<string, boolean> | undefined): string[] {
  return Object.entries(categories ?? {})
    .filter(([name, on]) => on === true && BLOCKED_FAMILIES.some((f) => name === f || name.startsWith(f + "/")))
    .map(([name]) => name);
}

export async function moderate(text: string, opts: GuardOptions = {}): Promise<ModerationOutcome> {
  if (!opts.openaiKey) return { status: "skipped" };
  const doFetch = opts.fetchFn ?? fetch;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 4000);
  try {
    const res = await doFetch(MODERATION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.openaiKey}` },
      body: JSON.stringify({ model: MODERATION_MODEL, input: text }),
      signal: ctl.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !Array.isArray(data.results)) {
      return { status: "error", detail: `OpenAI ${res.status}: ${data?.error?.message ?? "unexpected reply"}` };
    }
    const hits = new Set<string>();
    for (const r of data.results) blockedCategories(r?.categories).forEach((c) => hits.add(c));
    return hits.size ? { status: "flagged", categories: [...hits] } : { status: "passed" };
  } catch (e) {
    return { status: "error", detail: ctl.signal.aborted ? "OpenAI timed out" : String((e as Error)?.message ?? e) };
  } finally {
    clearTimeout(timer);
  }
}

function moderationWording(categories: string[]): { title: string; message: string } {
  const has = (f: string) => categories.some((c) => c === f || c.startsWith(f + "/"));
  if (has("hate") || has("harassment")) {
    return { title: "This message wasn't sent", message: "It looks hurtful or harassing. Please keep things respectful on TeenWork." };
  }
  if (has("self-harm")) {
    return {
      title: "We're here for you",
      message: "It sounds like you might be going through something really hard. You can call or text 988 any time to talk with someone who cares (Suicide & Crisis Lifeline, US). If you're in danger right now, call 911.",
    };
  }
  return { title: "This message wasn't sent", message: "Sexual content isn't allowed on TeenWork." };
}

// ── Both layers ──────────────────────────────────────────────────────────────

export async function checkMessage(text: string, opts: GuardOptions = {}): Promise<GuardResult> {
  if (opts.policy !== false) {
    const rule = checkPolicy(text);
    if (rule) {
      return { allowed: false, layer: "policy", reason: "policy_violation", rule: rule.id, title: rule.title, message: rule.message, moderation: "skipped" };
    }
  }
  if (opts.moderation === false) return { allowed: true, moderation: "skipped" };

  const m = await moderate(text, opts);
  if (m.status === "flagged") {
    return { allowed: false, layer: "moderation", reason: "harmful_content", categories: m.categories, ...moderationWording(m.categories), moderation: "flagged" };
  }
  if (m.status === "error") {
    console.warn("message-guard: moderation unavailable:", m.detail);
    if (opts.failClosed) {
      return { allowed: false, layer: "moderation", reason: "check_unavailable", title: "Couldn't check this message", message: "The safety check isn't responding right now. Please try again in a minute.", moderation: "error" };
    }
  }
  return { allowed: true, moderation: m.status };
}
