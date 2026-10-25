/* ══════════════════════════════════════════════════════════════════════
   demo-sandbox-v49 — empty demos that save nothing, and no AI in demos
   (2026-10-19, moved into this file 2026-10-25). Aya: "remove all demo
   data", "remove all data from all acounts also" (she chose: demo data
   only, never real accounts' data), "limit ai calls in demo mode".
   • The Teen / Parent / Employer demo is now a brand-new, empty account,
     the same screens and empty states a real new account gets. No sample
     jobs, people, chats, ratings or numbers.
   • It lives only in this tab: a throwaway address
     (demo.<role>.<id>@sandbox.teenwork.test), and a pretend Supabase in
     memory that takes the app's place while the demo is open. Nothing
     reaches the real Supabase or EmailJS (demo-guard-v49 in <head> also
     blocks them at the network level). When the demo ends (sign out, the
     home page, Sign In / Sign Up, leaving the page) this browser's storage
     is put back exactly as it was before the demo.
   • A teen demo skips parent linking (like tester accounts) so every
     screen can be tried. Demos get Pro features, like before.
   • AI: since 2026-10-21 the AI only answers a real signed-in account, so
     a demo has none. An AI button in a demo says so and offers a free
     account; automatic AI (job picks, chat scans, the skill summary) and
     the AI safety helpers are skipped quietly (posting a job still works,
     as it does whenever the AI can't be reached).
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twDemoSandbox49) return;
  window.__twDemoSandbox49 = true;

  const ROLES = ['teen', 'parent', 'employer'];
  const DOMAIN = 'sandbox.teenwork.test';
  const KEY_MARK = 'sandbox_teenwork_test';          // the address as it shows up inside storage key names
  const NAMES = { teen: 'Demo Teen', parent: 'Demo Parent', employer: 'Demo Employer' };
  const TOUR = 'tw_demo_tour_';      // + role: this browser has seen that demo's app tour (each demo has a new address)
  const KEEP = k => /^sb-/.test(k) || k.indexOf(TOUR) === 0;   // left alone when storage is put back: Supabase's own sign-in token, the tour note
  const $ = id => document.getElementById(id);
  const later = (fn, ms) => setTimeout(() => { try { fn(); } catch (e) { console.warn('demo-sandbox-v49:', e); } }, ms || 0);
  const pad = n => (n < 10 ? '0' : '') + n;
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const ADDR = new RegExp('@' + DOMAIN.replace(/\./g, '\\.') + '$', 'i');

  // The app keeps two "current user" variables (a let in the main script and window.currentUser), and
  // its Supabase client in a let as well; these reach the let versions.
  const lexUser = () => { try { return typeof currentUser !== 'undefined' ? currentUser : null; } catch (e) { return null; } };
  const me = () => window.currentUser || lexUser();
  function setUser(u) { try { currentUser = u; } catch (e) {} window.currentUser = u; }
  function getClient() { try { return typeof sbClient !== 'undefined' ? sbClient : null; } catch (e) { return null; } }
  function setClient(c) { try { sbClient = c; } catch (e) {} }
  const isSandboxUser = u => !!(u && (u.twDemo || ADDR.test(String(u.email || ''))));
  window._twIsDemoSandboxUser = isSandboxUser;

  /* ── 1. a pretend Supabase that keeps everything in memory ──────────── */
  function makeClient(email, uid) {
    const tables = {};
    let seq = 0;
    const rowsOf = t => tables[t] || (tables[t] = []);
    const copy = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
    const same = (a, b) => a === b || (a != null && b != null && String(a) === String(b));
    const likeRx = (p, f) => new RegExp('^' + String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', f);
    function test(r, f) {
      const v = r[f.col];
      switch (f.op) {
        case 'eq': return same(v, f.val);
        case 'neq': return !same(v, f.val);
        case 'in': return (f.val || []).some(x => same(v, x));
        case 'gt': return v != null && String(v) > String(f.val);
        case 'gte': return v != null && String(v) >= String(f.val);
        case 'lt': return v != null && String(v) < String(f.val);
        case 'lte': return v != null && String(v) <= String(f.val);
        case 'like': return v != null && likeRx(f.val, '').test(String(v));
        case 'ilike': return v != null && likeRx(f.val, 'i').test(String(v));
        case 'is': return f.val === null ? v == null : v === f.val;
        default: return true;
      }
    }
    const FILTERS = ['eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is'];
    function query(table) {
      const q = { mode: 'select', filters: [], payload: null, conflict: null, limit: null, one: false, order: [], returning: false, count: false, head: false };
      function run() {
        const rows = rowsOf(table), hit = r => q.filters.every(f => test(r, f));
        let out;
        if (q.mode === 'insert' || q.mode === 'upsert') {
          const keys = q.conflict ? String(q.conflict).split(',').map(s => s.trim()) : (table === 'user_data' ? ['email', 'key'] : ['id']);
          out = (Array.isArray(q.payload) ? q.payload : [q.payload]).filter(Boolean).map(it => {
            const row = Object.assign({}, it);
            if (row.id == null && table !== 'user_data') row.id = ++seq;
            if (!row.created_at) row.created_at = new Date().toISOString();
            if (q.mode === 'upsert') {
              const i = rows.findIndex(r => keys.every(k => r[k] != null && same(r[k], row[k])));
              if (i >= 0) { rows[i] = Object.assign({}, rows[i], row); return rows[i]; }
            }
            rows.push(row); return row;
          });
        } else if (q.mode === 'update') {
          out = rows.filter(hit); out.forEach(r => Object.assign(r, q.payload || {}));
        } else if (q.mode === 'delete') {
          out = rows.filter(hit);
          for (let i = rows.length - 1; i >= 0; i--) if (hit(rows[i])) rows.splice(i, 1);
        } else {
          out = rows.filter(hit);
          q.order.slice().reverse().forEach(o => out.sort((x, y) => (String(x[o.col]) < String(y[o.col]) ? -1 : String(x[o.col]) > String(y[o.col]) ? 1 : 0) * (o.asc ? 1 : -1)));
          if (q.limit != null) out = out.slice(0, q.limit);
        }
        if (q.mode !== 'select' && !q.returning) return { data: null, error: null, count: null, status: 201 };
        if (q.head) return { data: null, error: null, count: out.length };
        if (q.one) return { data: copy(out[0] || null), error: null };
        return { data: copy(out), error: null, count: q.count ? out.length : null };
      }
      const chain = new Proxy({}, { get(_, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          const p = Promise.resolve().then(() => { try { return run(); } catch (e) { return { data: null, error: { message: String(e && e.message || e) } }; } });
          return p[prop].bind(p);
        }
        if (typeof prop === 'symbol') return undefined;
        if (prop === 'select') return (cols, o) => { if (q.mode !== 'select') q.returning = true; if (o) { q.count = !!o.count; q.head = !!o.head; } return chain; };
        if (FILTERS.indexOf(prop) >= 0) return (c, v) => { q.filters.push({ op: prop, col: c, val: v }); return chain; };
        if (prop === 'match') return o => { Object.keys(o || {}).forEach(c => q.filters.push({ op: 'eq', col: c, val: o[c] })); return chain; };
        if (prop === 'order') return (c, o) => { q.order.push({ col: c, asc: !(o && o.ascending === false) }); return chain; };
        if (prop === 'limit') return n => { q.limit = n; return chain; };
        if (prop === 'single' || prop === 'maybeSingle') return () => { q.one = true; return chain; };
        if (prop === 'upsert') return (p, o) => { q.mode = 'upsert'; q.payload = p; q.conflict = o && o.onConflict; return chain; };
        if (prop === 'insert') return p => { q.mode = 'insert'; q.payload = p; return chain; };
        if (prop === 'update') return p => { q.mode = 'update'; q.payload = p; return chain; };
        if (prop === 'delete') return () => { q.mode = 'delete'; return chain; };
        return () => chain;                               // or(), not(), range(), abortSignal() …: not needed for one empty account
      } });
      return chain;
    }
    const stub = new Proxy({}, { get(_, prop) { return prop === 'then' || typeof prop === 'symbol' ? undefined : () => stub; } });   // realtime channels
    const now = new Date().toISOString();
    const user = { id: uid, email, user_metadata: {}, app_metadata: { provider: 'email' }, identities: [{ provider: 'email' }], created_at: now, email_confirmed_at: now };
    const session = { access_token: 'demo-' + uid, token_type: 'bearer', expires_in: 3600, user };
    const ok = data => Promise.resolve({ data, error: null });
    const no = () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Not available in the demo.' } });
    const auth = new Proxy({
      getSession: () => ok({ session }),
      getUser: () => ok({ user }),
      refreshSession: () => ok({ session, user }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      updateUser: a => { if (a && a.data) Object.assign(user.user_metadata, a.data); return ok({ user }); },
    }, { get(t, prop) { return own(t, prop) ? t[prop] : (typeof prop === 'symbol' ? undefined : no); } });
    return {
      __twDemo: true,
      from: query,
      rpc: () => Promise.resolve({ data: null, error: { message: 'Not available in the demo.' } }),
      channel: () => stub, removeChannel: () => Promise.resolve('ok'), removeAllChannels: () => Promise.resolve([]), getChannels: () => [],
      storage: { from: () => new Proxy({}, { get(_, p) { return typeof p === 'symbol' ? undefined : () => Promise.resolve({ data: null, error: { message: 'Not available in the demo.' } }); } }) },
      functions: { invoke: () => Promise.resolve({ data: null, error: { message: 'Not available in the demo.' } }) },
      auth,
    };
  }

  /* ── 2. storage: put it back after the demo ─────────────────────────── */
  function lsKeys() { const out = []; try { for (let i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {} return out; }
  function snapshot() { const s = Object.create(null); lsKeys().forEach(k => { try { s[k] = localStorage.getItem(k); } catch (e) {} }); return s; }
  function restore(s) {
    try {
      lsKeys().forEach(k => { if (!KEEP(k) && !(k in s)) localStorage.removeItem(k); });
      Object.keys(s).forEach(k => { if (!KEEP(k) && localStorage.getItem(k) !== s[k]) localStorage.setItem(k, s[k]); });
    } catch (e) {}
  }
  // A demo tab that was closed before it could tidy up: drop anything that names a demo address.
  function sweep() {
    lsKeys().forEach(k => {
      try {
        if (KEEP(k)) return;
        if (k.indexOf(KEY_MARK) >= 0 || k.indexOf(DOMAIN) >= 0) { localStorage.removeItem(k); return; }
        const v = localStorage.getItem(k);
        if (!v || v.indexOf('@' + DOMAIN) < 0) return;
        let j; try { j = JSON.parse(v); } catch (e) { localStorage.removeItem(k); return; }
        const bad = x => JSON.stringify(x === undefined ? null : x).indexOf('@' + DOMAIN) >= 0;
        if (Array.isArray(j)) localStorage.setItem(k, JSON.stringify(j.filter(x => !bad(x))));
        else if (j && typeof j === 'object') { Object.keys(j).forEach(p => { if (p.indexOf(DOMAIN) >= 0 || bad(j[p])) delete j[p]; }); localStorage.setItem(k, JSON.stringify(j)); }
        else localStorage.removeItem(k);
      } catch (e) {}
    });
  }
  try { sweep(); } catch (e) {}
  try { if (sessionStorage.getItem('tw_demo_open')) { sessionStorage.removeItem('tw_demo_open'); } } catch (e) {}

  /* ── 3. start and end a demo ────────────────────────────────────────── */
  let SB = null;
  const DASH = ['page-teen', 'page-parent', 'page-employer'];
  const OUT = ['page-landing', 'page-login', 'page-signup', 'page-email-sent'];   // opening one of these ends the demo

  function start(type) {
    if (ROLES.indexOf(type) < 0) return;
    if (SB) end();
    try { sweep(); } catch (e) {}
    let id = '';
    try { const a = new Uint32Array(2); crypto.getRandomValues(a); id = a[0].toString(36) + a[1].toString(36); } catch (e) { id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
    id = id.slice(0, 10);
    const email = 'demo.' + type + '.' + id + '@' + DOMAIN;
    const snap = snapshot();
    const client = makeClient(email, 'demo-' + id);
    SB = { type, email, snap, real: getClient(), client, user: null };
    window.__twDemoSandbox = { type, email };
    try { sessionStorage.setItem('tw_demo_open', '1'); } catch (e) {}
    setClient(client);

    // a clean slate, like signing in on a new device
    setUser(null);
    try { selectedType = null; } catch (e) {} window.selectedType = null;
    try { if (typeof resetSessionState === 'function') resetSessionState(); } catch (e) {}
    const u = { name: NAMES[type], email, type, emailVerified: true, city: 'Burlington', state: 'Vermont', created: new Date().toISOString(), twDemo: true };
    if (type === 'teen') { const d = new Date(); d.setFullYear(d.getFullYear() - 16); d.setMonth(d.getMonth() - 2); u.dob = ymd(d); u.age = 16; }
    if (type === 'parent') u.dob = '1985-04-15';
    SB.user = u;
    try { if (localStorage.getItem(TOUR + type)) localStorage.setItem('tw_tour34_' + email, '1'); } catch (e) {}   // the tour shows once per kind of demo, as before
    setUser(u);
    document.body.classList.add('tw49-demo');
    try { if (typeof launchDashboard === 'function') launchDashboard(); } catch (e) { console.warn('demo-sandbox-v49: launchDashboard', e); }
    const show = () => {
      if (!SB || me() !== u) return;
      const pg = $('page-' + type), act = document.querySelector('.page.active');
      // only while the app still shows the homepage, a sign-in page or another role's dashboard: once the demo is on
      // a page of its own (its dashboard, the Verification page) it is left there
      const away = !act || OUT.indexOf(act.id) >= 0 || (DASH.indexOf(act.id) >= 0 && act !== pg);
      if (pg && away && !$('parent-lock-overlay')) {
        document.querySelectorAll('.page.active').forEach(p => p.classList.remove('active'));
        pg.classList.add('active');
      }
      try { if (typeof buildNavTabs === 'function') buildNavTabs(type); } catch (e) {}
      banner();
    };
    show(); later(show, 80); later(show, 500); later(show, 1500);
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function end() {
    if (!SB) return;
    const s = SB;
    SB = null;
    window.__twDemoSandbox = null;
    if (getClient() === s.client) setClient(s.real || null);
    if (isSandboxUser(window.currentUser)) window.currentUser = null;
    if (isSandboxUser(lexUser())) { try { currentUser = null; } catch (e) {} }
    try { if ($('tw34-tour') && typeof window.tourSkip === 'function') window.tourSkip(); } catch (e) {}   // the demo's app tour doesn't follow you out
    noteTour(s);
    restore(s.snap);
    try { sessionStorage.removeItem('tw_demo_open'); } catch (e) {}
    document.body.classList.remove('tw49-demo');
    document.querySelectorAll('#tw49-demo-banner').forEach(b => b.remove());
    closeLimit();
    if (!getClient()) { try { if (typeof window._twEnsureSupabase === 'function') window._twEnsureSupabase(); } catch (e) {} }
  }

  window.twStartDemo = start;
  window.twEndDemo = end;
  window._twDemoSandbox = { start, end, get active() { return !!SB; }, get email() { return SB ? SB.email : ''; }, makeClient };

  // Every way into a demo goes here. (homepage-trust-v48 wraps window._directDemo for its toast.)
  function entry(type) { return start(type); }
  entry.__twSandbox = true;
  window._directDemo = entry;
  const demoLogin = function (type) { return window._directDemo(type); };
  demoLogin.__twSandbox = true;
  function claimDemoLogin() { if (!window.demoLogin || !window.demoLogin.__twSandbox) window.demoLogin = demoLogin; }
  claimDemoLogin();
  try { if (typeof window._drain_demoLogin === 'function') window._drain_demoLogin(demoLogin); } catch (e) {}

  // Leaving the demo: the home page, Sign In / Sign Up, another account, or the page closing.
  function noteTour(d) { try { if (d && localStorage.getItem('tw_tour34_' + d.email)) localStorage.setItem(TOUR + d.type, '1'); } catch (e) {} }
  function watch() {
    if (!SB) return;
    noteTour(SB);
    const act = document.querySelector('.page.active');
    const u = me();
    if ((act && OUT.indexOf(act.id) >= 0) || (u && !isSandboxUser(u))) { end(); return; }
    if (!u && act && DASH.indexOf(act.id) < 0) { end(); return; }
    if (getClient() !== SB.client) setClient(SB.client);     // something reconnected the real Supabase: keep the pretend one
    if (act && DASH.indexOf(act.id) >= 0) banner();
  }
  document.querySelectorAll('.page').forEach(pg => new MutationObserver(() => later(watch, 0)).observe(pg, { attributes: true, attributeFilter: ['class'] }));
  setInterval(watch, 700);
  window.addEventListener('pagehide', () => { if (SB) restore(SB.snap); });
  window.addEventListener('beforeunload', () => { if (SB) restore(SB.snap); });
  function endFirst(name) {
    const o = window[name];
    if (typeof o !== 'function' || o.__tw49) return;
    const w = function () { if (SB) end(); return o.apply(this, arguments); };
    w.__tw49 = true; window[name] = w;
  }

  // A teen demo skips parent linking, like a tester account, so every screen can be tried.
  function wrapTester() {
    const o = window._twIsTesterUser;
    if (typeof o !== 'function' || o.__tw49) return;
    const w = function (u) { return isSandboxUser(u) || o.apply(this, arguments); };
    w.__tw49 = true; window._twIsTesterUser = w;
  }

  // Email: EmailJS isn't asked to send anything from a demo.
  function wrapEmail() {
    const ej = window.emailjs;
    if (!ej || typeof ej.send !== 'function' || ej.__tw49) return;
    const send = ej.send, sendForm = ej.sendForm;
    const w = Object.assign({}, ej, {
      send: function () { if (SB) return Promise.resolve({ status: 200, text: 'OK (demo: nothing was sent)' }); return send.apply(ej, arguments); },
      sendForm: function () { if (SB) return Promise.resolve({ status: 200, text: 'OK (demo: nothing was sent)' }); return typeof sendForm === 'function' ? sendForm.apply(ej, arguments) : Promise.reject(new Error('sendForm missing')); },
      __tw49: true,
    });
    // branded-email-v41 marks its wrapper with a hidden __twBranded flag; keep it, or it wraps again and a failed Resend send is tried twice
    if (ej.__twBranded) { try { Object.defineProperty(w, '__twBranded', { value: true }); } catch (e) {} }
    try { window.emailjs = w; } catch (e) {}
  }

  /* ── 4. the demo banner ─────────────────────────────────────────────── */
  const css = `
  #tw49-demo-banner{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff7e6;border:1.5px solid #f4b740;color:#5c3b00;border-radius:14px;padding:.75rem 1rem;margin:0 0 1rem;font-size:.92rem;line-height:1.5}
  #tw49-demo-banner strong{color:#7a4700}
  #tw49-demo-banner .tx{flex:1;min-width:min(240px,100%)}
  #tw49-demo-banner button{background:var(--green);color:#fff;border:none;border-radius:10px;padding:9px 16px;font-weight:700;font-size:.9rem;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif}
  body.tw49-demo .tw-plan-pill,body.tw49-demo .tw44-pill,body.tw49-demo .tw44-note{display:none !important}
  #tw49-ai-limit{position:fixed;inset:0;z-index:99991;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:1rem;font-family:'DM Sans',system-ui,sans-serif}
  #tw49-ai-limit .box{background:var(--card,#fff);color:var(--text,#1f2937);border-radius:20px;padding:1.7rem 1.5rem;max-width:420px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.25);text-align:center}
  #tw49-ai-limit h3{font-family:Fraunces,Georgia,serif;font-size:1.3rem;color:var(--green,#2d6a4f);margin:.3rem 0 .6rem}
  #tw49-ai-limit p{font-size:.98rem;color:var(--muted,#4b5563);line-height:1.6;margin:0 0 1.2rem}
  #tw49-ai-limit button{width:100%;border-radius:12px;padding:12px 0;font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer}
  #tw49-ai-limit .go{background:var(--green,#2d6a4f);color:#fff;border:none}
  #tw49-ai-limit .stay{background:none;color:var(--muted,#4b5563);border:1.5px solid var(--border,#e5e7eb);margin-top:8px;font-weight:600}
  `;
  const st = document.createElement('style'); st.id = 'demo-sandbox-v49-css'; st.textContent = css; document.head.appendChild(st);

  function banner() {
    if (!SB) return;
    const act = document.querySelector('.page.active');
    document.querySelectorAll('#tw49-demo-banner').forEach(b => { if (!act || !act.contains(b)) b.remove(); });
    if (!act || DASH.indexOf(act.id) < 0) return;
    const dash = act.querySelector('.dashboard'); if (!dash) return;
    let b = $('tw49-demo-banner');
    const html = '<span class="tx">🧪 <strong>Demo:</strong> an empty practice account. Nothing you do here is saved or sent' +
      (SB.type === 'teen' ? ', and parent linking is skipped so you can try everything' : '') + '. <span class="ai">🤖 AI needs a free account.</span></span>' +
      '<button type="button" onclick="twEndDemo();gotoPage(\'signup\')">Make a real account</button>';
    if (!b) {
      b = document.createElement('div'); b.id = 'tw49-demo-banner'; b.setAttribute('role', 'note');
      const head = dash.querySelector('.dash-header');
      if (head && head.parentElement === dash) dash.insertBefore(b, head); else dash.insertBefore(b, dash.firstChild);
    }
    if (b._tw !== html) { b.innerHTML = html; b._tw = html; }
  }

  /* ── 5. no AI in a demo: AI answers only a real signed-in account ──── */
  // Who asked? Read from the call stack: callAI → callGemini / callClaudeAI / openAI → the feature.
  const SAFETY = ['postJob', 'openJobSafetyCheck', 'drawStep3'];                  // job compliance, a parent's job safety check, work-rules summary
  const AUTO = ['aiJobMatch', 'aiJobMatchForParent', 'renderSkillReport', 'scanMsgForJobTime', 'sendAIConfirmationMsg', '_checkEmployerTimeOverride', 'scan'];
  function callers(stack) {
    return String(stack || '').split('\n').map(l => {
      let m = /^\s*at (?:async )?(?:new )?([^\s(]+)/.exec(l);          // Chrome, Edge
      if (!m) m = /^\s*(?:async\*)?([^@\s]*)@/.exec(l);                // Firefox, Safari
      return m ? String(m[1]).split('.').pop() : '';
    }).filter(Boolean);
  }
  function kindOf(stack) {
    const names = callers(stack);
    if (names.some(n => SAFETY.indexOf(n) >= 0)) return 'safety';
    if (names.some(n => AUTO.indexOf(n) >= 0)) return 'auto';
    return 'ask';
  }
  // No colons in these: callAI passes them on inside "__AI_LIMIT__:reason:message".
  const NO_AI_MSG = "🤖 AI isn't part of the demo. Make a free account to use TeenWork's AI.";
  const QUIET_MSG = 'The demo skips automatic AI.';
  let lastBlock = '';
  // callAI asks _checkAILimit before anything is sent, so in a demo nothing reaches the AI.
  function wrapCheck() {
    const o = window._checkAILimit;
    if (typeof o !== 'function' || o.__tw49) return;
    const w = function () {
      if (SB && isSandboxUser(me())) {
        let stack = '';
        const lim = Error.stackTraceLimit;
        try { Error.stackTraceLimit = 30; stack = new Error().stack || ''; } catch (e) {} finally { try { Error.stackTraceLimit = lim; } catch (e) {} }
        if (kindOf(stack) !== 'ask') { lastBlock = 'quiet'; return { ok: false, reason: 'demo', msg: QUIET_MSG }; }
        lastBlock = 'ask'; later(showNoAI, 0);
        return { ok: false, reason: 'demo', msg: NO_AI_MSG };
      }
      return o.apply(this, arguments);
    };
    w.__tw49 = true;
    window._checkAILimit = w;
  }
  // callGemini / callClaudeAI turn that into text; make the text readable.
  const RAW = /^AI temporarily unavailable\. __AI_LIMIT__:demo:|^__AI_LIMIT_ERROR__$/;
  function wrapAsk(name) {
    const o = window[name];
    if (typeof o !== 'function' || o.__tw49) return;
    const w = async function () {
      const r = await o.apply(this, arguments);
      if (SB && typeof r === 'string' && RAW.test(r)) return (/skips automatic/.test(r) || (r === '__AI_LIMIT_ERROR__' && lastBlock === 'quiet')) ? '' : NO_AI_MSG;
      return r;
    };
    w.__tw49 = true; window[name] = w;
  }
  function closeLimit() { const m = $('tw49-ai-limit'); if (m) m.remove(); }
  function showNoAI() {
    if (!SB || $('tw49-ai-limit')) return;
    const m = document.createElement('div');
    m.id = 'tw49-ai-limit'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'tw49-ai-limit-h');
    m.innerHTML = '<div class="box"><div style="font-size:2.4rem">🤖</div>' +
      '<h3 id="tw49-ai-limit-h">AI needs a free account</h3>' +
      '<p>TeenWork\'s AI only answers signed-in accounts, so the demo can\'t use it. Make a free account to use the AI coach, cover letters and more.</p>' +
      '<button type="button" class="go">Make a free account</button><button type="button" class="stay">Keep looking around</button></div>';
    m.addEventListener('mousedown', e => { if (e.target === m) closeLimit(); });
    document.body.appendChild(m);
    m.querySelector('.go').onclick = () => { closeLimit(); end(); try { gotoPage('signup'); } catch (e) {} };
    m.querySelector('.stay').onclick = closeLimit;
    try { m.querySelector('.go').focus(); } catch (e) {}
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLimit(); }, true);

  /* ── boot ───────────────────────────────────────────────────────────── */
  function wire() {
    wrapCheck(); wrapAsk('callGemini'); wrapAsk('callClaudeAI'); wrapTester(); wrapEmail(); claimDemoLogin();
    endFirst('doLogin'); endFirst('doSignup');
  }
  wire();
  [300, 1200, 3000, 6000].forEach(ms => later(wire, ms));
  setInterval(() => { try { wire(); } catch (e) {} }, 2000);   // scripts that load or sign in later can replace these functions
})();
