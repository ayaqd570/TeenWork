
/* ═══════════════════════════════════════════════════════════════════
   v44 · TESTER ACCOUNTS  (2026-10-16, Aya's request)
   "allow unlimited accounts with ayaquarrierdraper@gmail.com email and
    they dont require parent linking so i can test app"
   Tester emails = ayaquarrierdraper@gmail.com and ayaqdteenwork@gmail.com
   (added 2026-10-30, Aya: "let ayaqdteenwork@gmail.com have unlimited
   acounts"), each with every Gmail spelling that lands in the same inbox:
   name+anything@gmail.com, dots anywhere before the @, and @googlemail.com.
   • Same email: no limit on how many accounts it can own, and no admin
     Email Rule is needed. Extra accounts share that email's password, and
     sign-in shows the "Which account?" list (which now scrolls).
   • +name addresses are separate emails, so each one is its own Supabase
     user with its own password. Best when making lots of accounts.
   • Teen tester accounts skip the "Link a parent" screen and limited mode:
     applying, messaging and logging work are open. Linking a parent still
     works from Profile, to test it. While no parent is linked, a tester's
     job applications go straight to the employer.
   • A "🧪 Tester" pill shows in the dashboard header.
   Tester accounts are otherwise real accounts: no sample data, saved in
   the cloud like everyone else's. Demo logins and the admin are unchanged.
   apply-tester-accounts.py also makes three one-line edits that call into
   this block: the parent-link gate in launchDashboard, isLimited() in the
   v35 linking script, and the per-email account limit in doSignup.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twTester44) return;
  window.__twTester44 = true;

  const TESTER_INBOXES = ['ayaquarrierdraper@gmail.com', 'ayaqdteenwork@gmail.com'];
  const ROLES = ['teen', 'parent', 'employer'];
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);

  // The inbox an address really reaches. Gmail ignores dots and anything after "+".
  function inboxOf(email) {
    let e = String(email || '').trim().toLowerCase().split('#')[0];   // "email#2" = an extra account's data key
    const at = e.lastIndexOf('@');
    if (at < 1) return '';
    let local = e.slice(0, at), dom = e.slice(at + 1);
    if (dom === 'gmail.com' || dom === 'googlemail.com') { local = local.split('+')[0].replace(/\./g, ''); dom = 'gmail.com'; }
    return local + '@' + dom;
  }
  const TESTERS = TESTER_INBOXES.map(inboxOf);
  const isTesterEmail = email => { const i = inboxOf(email); return !!i && TESTERS.includes(i); };
  const isTesterUser = u => !!(u && !u.isAdmin && !u.isDemo && ROLES.includes(u.type) && isTesterEmail(u.email));
  window._twIsTesterEmail = isTesterEmail;
  window._twIsTesterUser = isTesterUser;

  /* ── 1. No limit on accounts per tester email ───────────────────── */
  // doSignup asks this before it lets an email own a second account (the admin's Email Rules).
  // The limit itself is lifted by the one-line doSignup edit (Infinity for tester emails).
  const _oMulti = window._twEmailAllowsMultiple;
  if (typeof _oMulti === 'function') window._twEmailAllowsMultiple = function (email) { return isTesterEmail(email) || _oMulti.apply(this, arguments); };
  // Supabase keeps one user per email, so extra accounts share its password. A different password
  // on a device whose copies of this email are all in the cloud would quietly make a device-only
  // account; say "use the same password" instead.
  const _oCloudSignUp = window._twCloudSignUp;
  if (typeof _oCloudSignUp === 'function') window._twCloudSignUp = async function (email) {
    const r = await _oCloudSignUp.apply(this, arguments);
    if (r && r.status === 'local' && r.why === 'not-in-cloud' && isTesterEmail(email)) {
      const mine = (typeof window._twAccountsForEmail === 'function' ? window._twAccountsForEmail(email) : []).filter(a => a.hash);
      if (mine.length && mine.every(a => a.cloud)) return { status: 'exists', why: 'password' };
    }
    return r;
  };

  /* ── 2. No parent link needed ───────────────────────────────────── */
  // The lock screen and limited mode are skipped by the two one-line edits. Applications still
  // wait for a parent's OK when the tester has linked one, so that flow can be tested too.
  function linkStatus(u) {
    let l = null;
    try { l = (JSON.parse(localStorage.getItem('tw_parent_links') || '{}') || {})[String(u.email || '').toLowerCase()] || null; } catch (e) {}
    return ((l || u.parentLinked || {}).status) || 'none';
  }
  const testerTeenWithoutParent = () => { const u = me(); return isTesterUser(u) && u.type === 'teen' && linkStatus(u) !== 'approved'; };

  function wrapApply() {
    const o = window.teenApply;   // wrapped once, at load; later wrappers (v35 gates) sit on top of this one
    if (typeof o !== 'function' || o.__tw44) return;
    const w = function () {
      if (!testerTeenWithoutParent()) return o.apply(this, arguments);
      let list = null; try { list = demoJobs; } catch (e) {}
      const before = Array.isArray(list) ? list.slice() : null;
      const _toast = window.showToast;
      if (typeof _toast === 'function') window.showToast = function (msg) {
        const a = [].slice.call(arguments);
        if (/parent/i.test(String(msg)) && /review|approv/i.test(String(msg))) a[0] = '✅ Application sent to the employer. Tester account, so no parent approval is needed.';
        return _toast.apply(this, a);
      };
      let r;
      try { r = o.apply(this, arguments); } finally { if (typeof _toast === 'function') window.showToast = _toast; }
      if (before) {
        let n = 0;
        list.forEach(j => { if (j && before.indexOf(j) < 0 && j.status === 'pending-approval') { j.status = 'applied'; j.parentApproved = true; j.testerNoParent = true; n++; } });
        if (n) ['renderTeenApplications', 'renderAllApplications', 'renderBrowseJobs'].forEach(f => { try { if (typeof window[f] === 'function') window[f](); } catch (e) {} });
      }
      return r;
    };
    w.__tw44 = true;
    window.teenApply = w;
  }
  wrapApply();

  /* ── 3. Show that it's a tester account ─────────────────────────── */
  const st = document.createElement('style');
  st.id = 'tw44-tester-style';
  st.textContent =
    '.tw44-pill{display:inline-flex;align-items:center;gap:4px;margin-left:10px;vertical-align:middle;background:#ede9fe;color:#5b21b6;border:1.5px solid #c4b5fd;border-radius:999px;padding:2px 10px;font-family:"DM Sans",sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.02em;white-space:nowrap}' +
    '.tw44-note{background:#ede9fe;color:#4c1d95;border-radius:10px;padding:9px 12px;font-size:.84rem;line-height:1.5;margin:0 0 10px}' +
    'html.dark .tw44-pill{background:#2e1065;color:#ddd6fe;border-color:#6d28d9}' +
    'html.dark .tw44-note{background:#2e1065;color:#ddd6fe}' +
    // one email can now own many accounts: let the "Which account?" list scroll
    '#tw-acct-chooser > div{max-height:calc(100vh - 2.4rem);max-height:calc(100dvh - 2.4rem);overflow-y:auto}';
  document.head.appendChild(st);

  function decorate() {
    const u = me(), tester = isTesterUser(u);
    document.querySelectorAll('.tw44-pill').forEach(p => { if (!tester || !p.closest('#page-' + u.type)) p.remove(); });
    if (!tester) { document.querySelectorAll('.tw44-note').forEach(n => n.remove()); return; }
    const h1 = document.querySelector('#page-' + u.type + ' .dash-header h1');
    if (h1 && !h1.querySelector('.tw44-pill')) {
      const p = document.createElement('span');
      p.className = 'tw44-pill';
      p.title = 'Tester account: as many as you like on this email, and no parent link needed.';
      p.textContent = '🧪 Tester';
      h1.appendChild(p);
    }
    const card = u.type === 'teen' ? document.getElementById('tw-link-card') : null;
    if (card && !card.querySelector('.tw44-note')) {
      const n = document.createElement('div');
      n.className = 'tw44-note';
      n.textContent = "🧪 Tester account: you don't need a parent link. You can still link one here to test it.";
      const h3 = card.querySelector('h3');
      if (h3 && h3.nextSibling) card.insertBefore(n, h3.nextSibling); else card.appendChild(n);
    }
  }

  const _oLaunch = window.launchDashboard;
  if (typeof _oLaunch === 'function') window.launchDashboard = function () {
    const r = _oLaunch.apply(this, arguments);
    [0, 120, 800, 1800].forEach(ms => setTimeout(() => { try { decorate(); } catch (e) {} }, ms));
    return r;
  };
  setInterval(() => { try { decorate(); } catch (e) {} }, 1500);

  window._twTester = { inboxOf, isTesterEmail, isTesterUser, inboxes: TESTER_INBOXES.slice() };
})();
