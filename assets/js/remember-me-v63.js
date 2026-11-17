/* ══════════════════════════════════════════════════════════════════════
   remember-me-v63 — stay signed in when you come back (2026-11-17)
   Aya: "make teenwork remember you so you dont always have to sign in if
   you leave and come back quickly maybe have a remember me botten also".
   • Sign In has a "Remember me for 30 days" box. It starts OFF every time,
     because teens often use shared and school computers.
   • Box off: leave TeenWork (close the tab, go to another site, restart the
     browser) and come back within 30 minutes of when TeenWork was last
     open, and you are still signed in. After that, you sign in again.
   • Box on: this browser keeps you signed in for 30 days from that sign-in.
   • Coming back on the homepage or the Sign In address opens your
     dashboard; any other address (a dashboard section, Pricing …) opens as
     usual, already signed in. url-views-v50 does the signing back in, from
     this device's saved copy of the account, the same way a refresh does.
   • Sign out ends it at once on this browser (every open TeenWork tab).
     Signing out now ends only this device's Supabase sign-in (scope
     "local"); before, it also ended every other device's, which would have
     undone "Remember me" there.
   • Safety checks: an account kept in the cloud only comes back while this
     browser is still signed in to Supabase as that same email, and then
     Supabase is asked whether that sign-in is still good. If it isn't (signed
     out, password changed, account removed), the person is signed out and
     asked to sign in again. Offline, the saved copy keeps working.
   • When nobody comes back (the time ran out, or no one was remembered),
     this browser's leftover Supabase sign-in is dropped, so an old sign-in
     doesn't sit on a shared computer.
   • Demos are never remembered (they keep nothing). The admin is, and the
     admin panel still needs the admin's own Supabase sign-in.
   Storage: localStorage "tw_remember" = { v:1, kind:'real'|'admin',
   k: account key ('' for the admin), t: type, long: box ticked,
   at: when they signed in, seen: when a TeenWork tab last had them open }.
   Never a password or a token.
   window.twRememberMe = { peek, take, restored, failed, forgetCloud, mark }
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.twRememberMe) return;

  var KEY = 'tw_remember';
  var SHORT = 30 * 60 * 1000;            // box off: come back within 30 minutes
  var LONG = 30 * 24 * 3600 * 1000;      // box on: 30 days from signing in
  var BEAT = 60 * 1000;                  // an open tab says "still here" this often
  var TRY_FOR = 10 * 60 * 1000;          // a Sign In press counts for a sign-in that finishes within this
  var ROLES = ['teen', 'parent', 'employer'];

  function $(id) { return document.getElementById(id); }
  function low(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  function me() {
    var u = window.currentUser;
    if (u) return u;
    try { return typeof currentUser !== 'undefined' ? currentUser : null; } catch (e) { return null; }
  }
  function toast(m, t) { try { showToast(m, t || 'info'); } catch (e) {} }

  // who is signed in: 'real' | 'admin' | 'demo' | null (same rules as url-views-v50)
  function kindOf(u) {
    if (!u) return null;
    if (u.isAdmin && u.type === 'admin') return 'admin';
    if (ROLES.indexOf(u.type) < 0 || !/@/.test(String(u.email || ''))) return null;
    var sandbox = false;
    try { sandbox = typeof window._twIsDemoSandboxUser === 'function' && window._twIsDemoSandboxUser(u); } catch (e) {}
    if (sandbox || u.isDemo || u.twDemo || /\.demo$/i.test(String(u.email || ''))) return 'demo';
    return 'real';
  }
  function keyOf(u) { return low(u && (u.dataKey || u.email)); }
  function idOf(u) { var k = kindOf(u); return k ? k + ':' + (k === 'real' ? keyOf(u) : '') + ':' + u.type : ''; }
  function markId(m) { return m ? m.kind + ':' + (m.kind === 'real' ? low(m.k) : '') + ':' + m.t : ''; }

  /* ── 1. the mark ─────────────────────────────────────────────────── */
  function read() { try { var m = JSON.parse(localStorage.getItem(KEY) || 'null'); return m && m.v === 1 ? m : null; } catch (e) { return null; } }
  function write(m) { try { if (m) localStorage.setItem(KEY, JSON.stringify(m)); else localStorage.removeItem(KEY); } catch (e) {} }
  function live(m, now) {
    now = now || Date.now();
    if (!m || (m.kind !== 'real' && m.kind !== 'admin')) return false;
    if (m.kind === 'real' ? (!m.k || ROLES.indexOf(m.t) < 0) : m.t !== 'admin') return false;
    var at = Number(m.at), seen = Number(m.seen);
    if (!(at > 0) || !(seen >= at) || seen > now + 5 * 60 * 1000) return false;   // a clock far ahead: start over
    return m.long ? now - at < LONG : now - seen < SHORT;
  }
  // a still-good mark, without changing anything (the address code uses it to avoid flashing the homepage)
  function peek() { var m = read(); return live(m) ? m : null; }

  // The Supabase sign-in this browser keeps (supabase-js saves it as sb-<project>-auth-token)
  function storedSession() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (/^sb-[a-z0-9]+-auth-token$/.test(k)) {
          var s = JSON.parse(localStorage.getItem(k) || 'null');
          if (s && s.refresh_token) return s;
        }
      }
    } catch (e) {}
    return null;
  }
  function deviceCopy(k) { try { return (typeof window._twLocalAccounts === 'function' && window._twLocalAccounts()[k]) || null; } catch (e) { return null; } }

  // The mark to sign back in with, or null. A mark that is over (or can't be trusted) is removed.
  function take() {
    var m = read();
    if (!m) return null;
    if (!live(m)) { write(null); return null; }
    if (m.kind === 'real') {
      var rec = deviceCopy(m.k);
      if (!rec || rec.type !== m.t) { write(null); return null; }
      if (rec.cloud === true) {          // a cloud account: this browser must still be signed in to Supabase as it
        var s = storedSession();
        if (!s || low(s.user && s.user.email) !== low(rec.email)) { write(null); return null; }
      }
    }
    return { v: 1, kind: m.kind, k: m.kind === 'real' ? low(m.k) : '', t: m.t, at: Number(m.at), via: 'remember' };
  }

  /* ── 2. Supabase: sign-out ends only this device, and checks ─────── */
  function sbc() { try { return (typeof sbClient !== 'undefined' && sbClient) ? sbClient : null; } catch (e) { return null; } }
  function patchSignOut() {
    var c = sbc(), a = c && c.auth;
    if (!a || typeof a.signOut !== 'function' || a.signOut.__twLocal) return;
    var orig = a.signOut;
    var local = function (opts) { return orig.call(a, Object.assign({ scope: 'local' }, opts || {})); };
    local.__twLocal = true;
    try { a.signOut = local; } catch (e) {}
  }
  async function client(ms) {
    try { if (typeof window._twCloudClient === 'function') { var c = await window._twCloudClient(ms); if (c) { patchSignOut(); return c; } } } catch (e) {}
    return sbc();
  }
  function safe(f) { try { return Promise.resolve(f()).catch(function (e) { return { data: null, error: e || { message: 'network error' } }; }); } catch (e) { return Promise.resolve({ data: null, error: e }); } }
  function offline(e) { return !!e && (e.name === 'AuthRetryableFetchError' || e.status === 0 || /fetch|network|timed? ?out|connect|load failed/i.test(String(e.message || e))); }
  function refused(e) {
    if (!e || offline(e)) return false;
    var code = String(e.code || '');
    return e.status === 401 || e.status === 403 || ['session_not_found', 'bad_jwt', 'user_not_found', 'refresh_token_not_found', 'refresh_token_already_used'].indexOf(code) >= 0 ||
      /refresh token|session.*(not found|expired|missing)|invalid jwt/i.test(String(e.message || ''));
  }

  // After a cloud account came back: is this browser's Supabase sign-in still good, and theirs?
  async function verify(u) {
    var id = idOf(u), want = low(u.email), rec = deviceCopy(keyOf(u));
    if (!rec || rec.cloud !== true) return;           // kept on this device only: nothing in the cloud to ask
    var c = await client(10000);
    if (!c || !c.auth || idOf(me()) !== id) return;
    var r = await safe(function () { return c.auth.getSession(); });
    if (idOf(me()) !== id) return;
    var s = r && r.data && r.data.session;
    if (!s) { if (r && r.error && !refused(r.error)) return; return end(u); }
    if (low(s.user && s.user.email) !== want) return end(u);
    if (typeof c.auth.getUser !== 'function') return;
    var g = await safe(function () { return c.auth.getUser(); });
    if (idOf(me()) !== id) return;
    if (g && g.error && refused(g.error)) return end(u);
  }
  function end(u) {
    if (idOf(me()) !== idOf(u)) return;
    write(null);
    try { window.doLogout(); } catch (e) {}
    setTimeout(function () {
      try { gotoPage('login'); } catch (e) {}
      try { showAlert('li-alert', '🔒 For your safety, please sign in again.', 'info'); } catch (e) {}
    }, 60);
  }

  // Nobody came back on this page load: drop this browser's leftover Supabase sign-in.
  var tried = false;          // someone pressed Sign In or Create Account on this page
  async function forgetCloud() {
    if (!storedSession()) return;
    var c = await client(10000);
    if (!c || !c.auth || typeof c.auth.signOut !== 'function') return;
    if (me() || tried || peek() || window.__twDemoSandbox || !storedSession()) return;   // signing in, or another tab just did
    try { await c.auth.signOut({ scope: 'local' }); } catch (e) {}
  }

  /* ── 3. the box on Sign In ───────────────────────────────────────── */
  var CSS = [
    '.tw63-remember{margin:.2rem 0 .9rem;align-items:flex-start}',
    '.tw63-remember input[type=checkbox]{width:20px;height:20px;margin-top:1px}',
    '.tw63-remember label{cursor:pointer}',
    '.tw63-remember strong{display:block;color:var(--text);font-size:.92rem;font-weight:700}',
    '.tw63-remember .tw63-hint{display:block;font-size:.8rem;line-height:1.45}',
    'html.twu-boot #page-login.active{visibility:hidden}'
  ].join('\n');
  function addStyle() {
    if ($('tw63-remember-style') || !document.head) return;
    var st = document.createElement('style'); st.id = 'tw63-remember-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }
  addStyle();                 // now, so a sign-back-in on the Sign In address doesn't flash the form
  function addBox() {
    addStyle();
    if ($('li-remember')) return;
    var pw = $('li-password'), card = pw && pw.closest('.auth-card'), btn = card && card.querySelector('.form-submit');
    if (!btn) return;
    var row = document.createElement('div');
    row.className = 'terms-check tw63-remember';
    row.innerHTML = '<input type="checkbox" id="li-remember" aria-describedby="li-remember-hint">' +
      '<label for="li-remember"><strong>Remember me for 30 days</strong>' +
      '<span class="tw63-hint" id="li-remember-hint">Leave this off on a shared or school computer. Without it, you stay signed in for 30 minutes after you leave.</span></label>';
    btn.parentNode.insertBefore(row, btn);
  }
  var lastTry = null;         // the last Sign In press on this page: { long, at }
  function pressed() { var b = $('li-remember'); lastTry = { long: !!(b && b.checked), at: Date.now() }; tried = true; }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#page-login .form-submit')) pressed();
    else if (t.closest('#signup-btn')) { tried = true; lastTry = null; }   // a new account starts with 30 minutes
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.id === 'li-password') pressed();
  }, true);

  /* ── 4. following sign-in and sign-out ───────────────────────────── */
  var cur = '';               // the account signed in on this tab (kind:key:type), '' for nobody
  function shown(k) {
    if (k === 'admin') return !!$('tw-admin-panel');
    return !!document.querySelector('#page-teen.active,#page-parent.active,#page-employer.active,#page-verify.active');
  }
  function signedIn(u, k) {
    var now = Date.now(), m = read(), id = idOf(u);
    var press = lastTry && now - lastTry.at < TRY_FOR ? lastTry : null;
    lastTry = null;
    if (!press && m && markId(m) === id && live(m, now)) { m.seen = now; write(m); return; }   // came back, or a refresh: keep how long it lasts
    write({ v: 1, kind: k, k: k === 'real' ? keyOf(u) : '', t: u.type, long: !!(press && press.long), at: now, seen: now });
  }
  function signedOut(id) {
    var m = read();
    if (m && markId(m) === id) write(null);
    lastTry = null;
    var b = $('li-remember'); if (b) b.checked = false;     // the next person starts with the box off
  }
  function tick() {
    patchSignOut();
    var u = me();
    if (!u) { if (cur) { signedOut(cur); cur = ''; } return; }
    var k = kindOf(u);
    if (k !== 'real' && k !== 'admin') { if (cur) { signedOut(cur); cur = ''; } return; }   // a demo took over
    var id = idOf(u);
    if (id === cur || !shown(k)) return;   // (first sign-in on a device briefly uses a stand-in user while it loads data)
    cur = id;
    signedIn(u, k);
  }
  function beat() {
    if (!cur) return;
    var m = read();
    if (!m || markId(m) !== cur) return;   // ended in another tab, or another account took over: leave it
    m.seen = Date.now();
    write(m);
  }
  // Signed out in another tab (or its time ran out there): sign this tab out too.
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY || e.newValue || !cur) return;
    var old = null; try { old = JSON.parse(e.oldValue || 'null'); } catch (x) {}
    if (!old || markId(old) !== cur) return;
    try { window.doLogout(); } catch (x) {}
    toast('You signed out of TeenWork in another tab.', 'info');
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') beat(); });
  window.addEventListener('pagehide', beat);
  window.addEventListener('tw-supabase-ready', patchSignOut);

  /* ── 5. called by url-views-v50 when it signs someone back in ────── */
  function restored(u) {
    var id = idOf(u), m = read();
    if (!id) return;
    if (m && markId(m) === id) { m.seen = Date.now(); write(m); }
    cur = id;
    if (kindOf(u) === 'real') verify(u).catch(function () {});
  }
  function failed() { write(null); }

  function boot() {
    addBox();
    tick();
    setInterval(tick, 1000);
    setInterval(beat, BEAT);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.twRememberMe = { peek: peek, take: take, restored: restored, failed: failed, forgetCloud: forgetCloud, mark: read, SHORT: SHORT, LONG: LONG };
})();
