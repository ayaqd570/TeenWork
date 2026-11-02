/* ══════════════════════════════════════════════════════════════════════
   url-views-v50 — the page address follows the screen (2026-10-20)
   Aya: "when a user switches views or clicks a specific job, update the
   URL using query parameters (like ?view=jobs) without reloading … if the
   page is refreshed, load the correct view instead of resetting to the
   home screen."
   • Every screen has its own address, written with history.pushState (no
     reload): ?view=login, ?view=pricing, ?view=jobs, ?view=applied,
     ?view=approvals, ?view=post-job, ?view=verification,
     ?view=admin&tab=accounts … The homepage stays plain "/".
   • Find Jobs: clicking a job card (anywhere but its buttons) picks it:
     a green outline and ?view=jobs&job=<id>. After a refresh the list
     scrolls back to that job; a job that's gone gets a short note.
   • Refresh: the app opens the same screen. Until now a refresh also
     signed people out, so this tab remembers who was signed in
     (sessionStorage "tw_url_session": the account key and type, never a
     password) and signs that account back in from this device's saved
     copy, the same way an offline sign-in works. It's for this tab only,
     for up to 12 hours after the tab was last open, and it ends with Sign
     out. A refresh on the homepage or Sign In still signs out, like before.
     The admin comes back to the admin panel; a demo starts a new empty
     demo of the same kind (demos still keep nothing).
   • Back / Forward move between screens. A dashboard address with nobody
     signed in (a new tab, a shared link, after Sign out) opens Sign In
     and goes there after signing in. A screen the account type can't open
     falls back to that account's first screen.
   Hooks: nothing is wrapped. A watcher on page / section classes (the way
   calendar-first-open-v44 and clean-menu-v43 follow the screen) writes
   the address; sections open through clean-menu's menu buttons, so the
   menu, draws and tab-refresh hooks run as if tapped. navfix-js replaces
   window.switchDashTab after the dashboard opens, so a restored section
   is re-opened a few times in the first 2.6 s unless the person taps
   first. Other query parameters in the address are kept.
   window.twUrlViews = { state, parse, go, picked }
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twUrlViews50) return;
  window.__twUrlViews50 = true;

  const MARK = 'tw_url_session';      // sessionStorage: who to sign back in after a refresh (this tab only)
  const NEXT = 'tw_url_next';         // sessionStorage: where to go after signing in
  const MAX_AGE = 12 * 3600 * 1000;
  const ROLES = ['teen', 'parent', 'employer'];
  const PUBLIC = ['login', 'signup', 'pricing', 'school', 'safety-lab'];
  const AUTH = ['login', 'signup'];
  // section id → address name (anything not listed uses its id)
  const SLUGS = {
    teen: {
      'ttab-browse': 'jobs', 'ttab-map': 'job-map', 'ttab-applications': 'applied', 'ttab-tracker': 'tracker',
      'ttab-worklog': 'work-log', 'ttab-calendar': 'schedule', 'ttab-earnings': 'earnings', 'ttab-savings': 'savings',
      'ttab-resume': 'profile', 'ttab-portfolio': 'portfolio', 'ttab-references': 'references', 'ttab-letters': 'letters',
      'ttab-badges': 'badges', 'ttab-leaderboard': 'leaderboard', 'ttab-ai': 'ai-coach', 'ttab-lessons': 'lessons',
      'ttab-firstjob': 'first-job', 'ttab-qa': 'questions', 'ttab-stories': 'stories'
    },
    parent: {
      'ptab-overview': 'home', 'ptab-approvals': 'approvals', 'ptab-controls': 'controls', 'ptab-notifications': 'alerts',
      'ptab-trusted': 'trusted-employers', 'ptab-teens': 'my-teens', 'ptab-ratings': 'ratings', 'ptab-weekly': 'weekly-summary',
      'ptab-savings': 'savings'
    },
    employer: {
      'etab-post': 'post-job', 'etab-applicants': 'applicants', 'etab-active': 'active-jobs', 'etab-schedule': 'schedule',
      'etab-bulkmsg': 'bulk-message', 'etab-ai': 'ai-tools', 'etab-analytics': 'analytics', 'etab-reviews': 'reviews',
      'etab-letters': 'letters', 'etab-bgcheck': 'verification', 'etab-profile': 'company-profile'
    }
  };
  const FIRST = { teen: 'ttab-browse', parent: 'ptab-overview', employer: 'etab-post' };
  const APPLY_RE = /(?:^|[^A-Za-z0-9_$])teenApply\(\s*'?([0-9A-Za-z_-]+)/;

  const $ = id => document.getElementById(id);
  const lexUser = () => { try { return typeof currentUser !== 'undefined' ? currentUser : null; } catch (e) { return null; } };
  const me = () => window.currentUser || lexUser();
  function setUser(u) { try { currentUser = u; } catch (e) {} window.currentUser = u; }
  const later = (fn, ms) => setTimeout(() => { try { fn(); } catch (e) { console.warn('url-views-v50:', e); } }, ms || 0);
  const toast = (m, t) => { try { showToast(m, t || 'info'); } catch (e) {} };
  const isOn = el => !!el && el.classList.contains('active');
  const low = s => String(s == null ? '' : s).trim().toLowerCase();
  const slugText = s => low(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const ssGet = k => { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // who is signed in, in the terms a refresh needs
  function kindOf(u) {
    if (!u) return null;
    if (u.isAdmin && u.type === 'admin') return 'admin';
    if (ROLES.indexOf(u.type) < 0 || !/@/.test(String(u.email || ''))) return null;
    let sandbox = false;
    try { sandbox = typeof window._twIsDemoSandboxUser === 'function' && window._twIsDemoSandboxUser(u); } catch (e) {}
    if (sandbox || u.isDemo || /\.demo$/i.test(String(u.email || ''))) return 'demo';
    return 'real';
  }
  const keyOf = u => low(u && (u.dataKey || u.email));

  /* ── 1. the address ──────────────────────────────────────────────── */
  function clean(v, max) { v = String(v == null ? '' : v).trim(); return /^[A-Za-z0-9_-]+$/.test(v) ? v.slice(0, max || 48) : ''; }
  function parse() {
    let q;
    try { q = new URLSearchParams(location.search); } catch (e) { return { view: '', tab: '', job: '' }; }
    return { view: low(clean(q.get('view'))), tab: low(clean(q.get('tab'))), job: clean(q.get('job'), 40) };
  }
  const same = (a, b) => (a.view || '') === (b.view || '') && (a.tab || '') === (b.tab || '') && (a.job || '') === (b.job || '');
  function urlFor(s) {
    let rest = '';
    try { const q = new URLSearchParams(location.search); ['view', 'tab', 'job'].forEach(k => q.delete(k)); rest = q.toString(); } catch (e) {}
    const own = [];
    if (s.view) own.push('view=' + encodeURIComponent(s.view));
    if (s.view && s.tab) own.push('tab=' + encodeURIComponent(s.tab));
    if (s.view && s.job) own.push('job=' + encodeURIComponent(s.job));
    const qs = own.concat(rest ? [rest] : []).join('&');
    return location.pathname + (qs ? '?' + qs : '') + (s.view ? '' : location.hash);   // the homepage keeps #safety etc.
  }
  function write(s, mode) {
    if (same(s, parse())) return false;
    try { history[mode === 'push' ? 'pushState' : 'replaceState']({ twView: s.view || '' }, '', urlFor(s)); return true; }
    catch (e) { return false; }   // some previews don't allow it; the app works as before
  }

  /* ── 2. what is on screen ────────────────────────────────────────── */
  function slugFor(role, id) { return id === 'verify' ? 'verification' : (SLUGS[role] && SLUGS[role][id]) || id; }
  function idFor(role, slug) {
    if (!slug) return null;
    const map = SLUGS[role] || {};
    const hit = Object.keys(map).filter(id => map[id] === slug)[0];
    if (!hit && slug === 'verification') return role === 'teen' && $('page-verify') ? 'verify' : null;   // the teen Verification page
    const id = hit || (/^[pte]tab-[a-z0-9-]+$/.test(slug) ? slug : null);
    const pg = $('page-' + role), el = id && $(id);
    return el && pg && pg.contains(el) && el.classList.contains('tab-panel') ? id : null;
  }
  function isDashSlug(slug) {
    if (!slug) return false;
    if (slug === 'verification' || /^[pte]tab-[a-z0-9-]+$/.test(slug)) return true;
    return ROLES.some(r => Object.keys(SLUGS[r]).some(id => SLUGS[r][id] === slug));
  }
  function activePanel(role) {
    const pg = $('page-' + role); if (!pg) return null;
    const p = pg.querySelector('.tab-panel.active');
    return p && p.id ? p.id : null;
  }
  function adminTabSlug(panel) {
    const b = panel.querySelector('.adm-tab.active');
    return b ? slugText(b.textContent) : '';
  }
  let picked = null;                  // the job picked in Find Jobs (its id)
  function current() {
    const u = me(), panel = $('tw-admin-panel');
    if (panel && u && u.isAdmin) return { view: 'admin', tab: adminTabSlug(panel) };
    const lock = $('parent-lock-overlay');
    if (lock && u && u.type === 'teen' && getComputedStyle(lock).display !== 'none') return { view: slugFor('teen', FIRST.teen) };   // "link a parent" sits in front of Find Jobs
    const act = document.querySelector('.page.active');
    if (!act) return null;
    const id = act.id.replace(/^page-/, '');
    if (id === 'landing') return { view: '' };
    if (PUBLIC.indexOf(id) >= 0) return { view: id };
    if (id === 'admin') return u && u.isAdmin ? { view: 'admin' } : null;
    if (id === 'verify') return u && u.type === 'teen' ? { view: 'verification' } : null;
    if (ROLES.indexOf(id) >= 0) {
      if (!u || u.type !== id) return null;
      const pid = activePanel(id); if (!pid) return null;
      const s = { view: slugFor(id, pid) };
      if (pid === 'ttab-browse' && picked) s.job = picked;
      return s;
    }
    return null;                                                   // "check your email" and other in-between screens
  }

  /* ── 3. who to sign back in after a refresh (this tab only) ──────── */
  let seenUser = '';
  function keepMark() {
    const u = me(), k = kindOf(u);
    if (k) {
      const m = { v: 1, kind: k, t: u.type, k: k === 'real' ? keyOf(u) : '', at: Date.now() };
      seenUser = k + ':' + m.k + ':' + m.t;
      ssSet(MARK, m);
    } else if (seenUser) {             // someone was signed in on this page and now nobody is: they signed out
      seenUser = '';
      ssSet(MARK, null);
      ssSet(NEXT, null);
    }
  }
  function readMark() {
    const m = ssGet(MARK);
    if (!m || m.v !== 1 || !(Date.now() - Number(m.at) < MAX_AGE)) { if (m) ssSet(MARK, null); return null; }
    return m;
  }
  function hideAutoTour() {
    // a refreshed demo starts over, but its app tour was already shown in this tab
    try { const u = me(); if (u && u.email) localStorage.setItem('tw_tour34_' + u.email, '1'); } catch (e) {}
    later(() => { if ($('tw34-tour') && typeof window.tourSkip === 'function') window.tourSkip(); }, 700);
  }
  function restoreSession(m) {
    if (!m) return false;
    try {
      if (m.kind === 'demo') {
        if (ROLES.indexOf(m.t) < 0 || typeof window.twStartDemo !== 'function') return false;
        window.twStartDemo(m.t);
        hideAutoTour();
        return kindOf(me()) === 'demo';
      }
      if (m.kind === 'admin') {
        if (typeof window.launchAdminPanel !== 'function' || typeof ADMIN_EMAIL === 'undefined') return false;
        // v51: only while this browser is still signed in to Supabase as the admin (checked again online below)
        if (typeof window._twStoredAdminSession !== 'function' || !window._twStoredAdminSession()) return false;
        setUser({ name: 'Admin', email: String(ADMIN_EMAIL).toLowerCase(), type: 'admin', emailVerified: true, isAdmin: true });
        try { window._loadUserDarkPref && window._loadUserDarkPref(); } catch (e) {}
        window.launchAdminPanel();
        // null: signed out or not the admin, so close the panel. undefined: offline, so leave it (the server checks anyway).
        if (typeof window._twAdminToken === 'function') window._twAdminToken(15000).then(t => {
          const u = me();
          if (t === null && u && u.isAdmin && typeof window.doLogout === 'function') window.doLogout();
        });
        return !!$('tw-admin-panel');
      }
      if (m.kind === 'real') {
        if (typeof window._twLocalAccounts !== 'function' || typeof window._twLoginLocalAccount !== 'function') return false;
        const all = window._twLocalAccounts() || {}, rec = all[m.k];
        if (!rec || rec.type !== m.t) return false;
        try { if (window._twClosed && window._twClosed.has(m.k)) return false; } catch (e) {}
        const acct = Object.assign({}, rec, { _key: m.k, slot: rec.slot || (m.k.indexOf('#') >= 0 ? (parseInt(m.k.split('#')[1], 10) || 1) : 1) });
        const ok = window._twLoginLocalAccount(acct);
        // the sign-in log (Admin → Security) shows this as a refresh, not a new sign-in
        try {
          const log = JSON.parse(localStorage.getItem('tw_signin_log') || '[]');
          if (ok && log[0] && log[0].event === 'login' && low(log[0].email) === low(rec.email)) { log[0].event = 'page-refresh'; localStorage.setItem('tw_signin_log', JSON.stringify(log)); }
        } catch (e) {}
        return !!ok && kindOf(me()) === 'real';
      }
    } catch (e) { console.warn('url-views-v50: restore', e); }
    return false;
  }

  /* ── 4. opening a screen from the address ────────────────────────── */
  let applying = true;                // true until the first look at the address, and while one is being applied
  let applyFrom = 0, pinSeq = 0, lastGesture = 0;
  const tookOver = since => lastGesture > since;
  function menuButton(id) { return document.querySelector('#twm-side [data-twm="' + id + '"]'); }
  function openSection(role, id) {
    if (id === 'verify') { if (!isOn($('page-verify')) && typeof window.showVerifyPage === 'function') window.showVerifyPage(); return; }
    const pg = $('page-' + role), panel = $(id);
    if (!pg || !panel) return;
    if (!isOn(pg)) {
      if (typeof window.gotoPage === 'function') window.gotoPage(role);
      else { document.querySelectorAll('.page.active').forEach(p => p.classList.remove('active')); pg.classList.add('active'); }
    }
    try { if (window.twCleanMenu && typeof window.twCleanMenu.sync === 'function') window.twCleanMenu.sync(); } catch (e) {}
    const b = menuButton(id);
    if (b && !b.hidden) { b.click(); return; }   // the menu's own path: draws, menu highlight, section hooks
    try { if (typeof window.switchDashTab === 'function') window.switchDashTab(null, id); } catch (e) {}
    pg.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p === panel));
  }
  function shownId(role) { return isOn($('page-verify')) ? 'verify' : isOn($('page-' + role)) ? activePanel(role) : null; }
  function blocked() {
    const lock = $('parent-lock-overlay');
    return (lock && getComputedStyle(lock).display !== 'none') || !!$('tw34-tour');
  }
  // navfix and the dashboard's own start-up open the first section after a moment; hold the asked-for one
  function pin(role, id, job) {
    const token = ++pinSeq, since = Date.now();
    picked = id === 'ttab-browse' && job ? job : null;
    const hold = () => {
      if (token !== pinSeq) return;
      if (tookOver(since)) { soon(); return; }                         // record() hands control back
      const u = me();
      if (!u || u.type !== role || blocked()) return;
      if (shownId(role) !== id) openSection(role, id);
      paintPicks();
    };
    hold();
    [120, 350, 800, 1500, 2600].forEach(ms => later(hold, ms));
    later(() => { if (token === pinSeq) { applying = false; record(); } }, 2700);
    if (picked) seekJob(picked, token);
  }
  function openAdminTab(slug) {
    const panel = $('tw-admin-panel'); if (!panel || !slug) return false;
    const b = [...panel.querySelectorAll('.adm-tab')].filter(x => slugText(x.textContent) === slug)[0];
    if (b) { if (!b.classList.contains('active')) b.click(); return true; }
    return false;
  }
  function closeAdmin() {
    const panel = $('tw-admin-panel');
    if (panel) panel.remove();
  }
  function done(ms) { const token = pinSeq; later(() => { if (token === pinSeq) { applying = false; record(); } }, ms == null ? 60 : ms); }
  function toLogin(t, why) {
    ssSet(NEXT, { view: t.view, tab: t.tab || '', job: t.job || '' });
    closeAdmin();
    if (typeof window.gotoPage === 'function') window.gotoPage('login');
    if (why) toast(why, 'info');
    write({ view: 'login' }, 'replace');
  }
  function go(t, how) {
    applying = true; applyFrom = Date.now(); ++pinSeq;
    t = { view: t.view || '', tab: t.tab || '', job: t.job || '' };
    try { if (window.twCleanMenu && window.twCleanMenu.close) window.twCleanMenu.close(true); } catch (e) {}
    if (!t.view) {                                                    // the homepage
      closeAdmin();
      if (!isOn($('page-landing')) && typeof window.gotoPage === 'function') window.gotoPage('landing');
      return done();
    }
    if (PUBLIC.indexOf(t.view) >= 0) {
      closeAdmin();
      const pg = $('page-' + t.view);
      if (pg && !isOn(pg) && typeof window.gotoPage === 'function') window.gotoPage(t.view);
      if (t.view === 'safety-lab') later(() => { if (typeof window.renderSafetyLab === 'function') window.renderSafetyLab(); }, 150);
      write({ view: t.view }, 'replace');
      return done();
    }
    const wantsAdmin = t.view === 'admin';
    if (!wantsAdmin && !isDashSlug(t.view)) {                         // an address this app doesn't know
      if (!kindOf(me())) { write({ view: '' }, 'replace'); return done(); }
      t = { view: '__first', tab: '', job: '' };
    }
    let u = me();
    if (!kindOf(u)) { if (restoreSession(readMark())) u = me(); else ssSet(MARK, null); }
    if (!kindOf(u)) { toLogin(t, how === 'load' || how === 'pop' ? '🔒 Please sign in to open that page.' : ''); return done(); }
    if (u.isAdmin) {                                                  // the admin's only screen is the admin panel
      if (!$('tw-admin-panel') && typeof window.launchAdminPanel === 'function') window.launchAdminPanel();
      if (!(wantsAdmin && t.tab && openAdminTab(t.tab))) later(() => { if (wantsAdmin && t.tab) openAdminTab(t.tab); }, 150);
      return done(300);
    }
    const role = u.type;
    closeAdmin();
    const id = (t.view !== '__first' && !wantsAdmin && idFor(role, t.view)) || FIRST[role];
    pin(role, id, id === 'ttab-browse' ? t.job : '');
  }

  /* ── 5. Find Jobs: picking a job ─────────────────────────────────── */
  function cardJobId(card) {
    if (card.dataset.twuJob) return card.dataset.twuJob;
    let id = '';
    const b = card.querySelector('[onclick*="teenApply("]'), m = b ? APPLY_RE.exec(b.getAttribute('onclick') || '') : null;
    if (m) id = m[1];
    else {                                                            // cards without an Apply button (age-locked)
      const title = ((card.querySelector('.browse-title') || {}).textContent || '').trim();
      let list = [];
      try { list = typeof browsableJobs !== 'undefined' ? browsableJobs : []; } catch (e) {}
      const hits = title ? list.filter(j => j && String(j.title || '').trim() === title) : [];
      if (hits.length === 1 && hits[0].id != null) id = clean(hits[0].id, 40);
    }
    if (id) card.dataset.twuJob = id;
    return id;
  }
  function cards() { const list = $('browse-jobs-list'); return list ? [...list.querySelectorAll('.browse-card')] : []; }
  function paintPicks() {
    let hit = null;
    cards().forEach(c => {
      const on = !!picked && cardJobId(c) === picked;
      if (on !== c.classList.contains('twu-picked')) c.classList.toggle('twu-picked', on);
      if (on) { hit = c; if (c.getAttribute('aria-current') !== 'true') c.setAttribute('aria-current', 'true'); }
      else if (c.hasAttribute('aria-current')) c.removeAttribute('aria-current');
    });
    return hit;
  }
  // after a refresh the job list fills in over a few seconds (the shared job board loads from the cloud)
  function seekJob(job, token) {
    const since = Date.now();
    const look = () => {
      if (token !== pinSeq || picked !== job) return;
      const u = me();
      if (!u || u.type !== 'teen' || !isOn($('ttab-browse'))) { if (Date.now() - since < 3000) later(look, 300); return; }
      const card = paintPicks();
      if (card) { if (!tookOver(since)) { try { card.scrollIntoView({ block: 'center' }); } catch (e) {} } return; }
      if (Date.now() - since < 10000) { later(look, 300); return; }
      picked = null;
      toast('That job isn\'t on the list anymore.', 'info');
      write(current() || { view: 'jobs' }, 'replace');
    };
    later(look, 200);
  }
  document.addEventListener('click', e => {
    const t = e.target, card = t && t.closest ? t.closest('#browse-jobs-list .browse-card') : null;
    if (!card || t.closest('button,a,input,select,textarea,label,summary,[role="button"],.twr-panel')) return;
    try { if (String(window.getSelection ? window.getSelection() : '').trim()) return; } catch (e2) {}   // picking out text
    const u = me(); if (!u || u.type !== 'teen') return;
    const id = cardJobId(card); if (!id || id === picked) return;
    picked = id;
    ++pinSeq; applying = false;
    paintPicks();
    record();
  });
  let listObs = null, listT = 0;
  function watchList() {
    const list = $('browse-jobs-list'); if (!list || listObs) return;
    listObs = new MutationObserver(() => { if (listT || !picked) return; listT = setTimeout(() => { listT = 0; paintPicks(); }, 60); });
    listObs.observe(list, { childList: true, subtree: true });
  }

  /* ── 6. writing the address as the screen changes ────────────────── */
  function record() {
    if (applying) {
      if (!(applyFrom && tookOver(applyFrom))) return;
      applying = false; ++pinSeq;                                     // the person tapped: their screen wins
    }
    keepMark();
    const s = current();
    if (!s) return;
    if (s.view !== 'jobs') picked = null;
    if (s.view === '') ssSet(NEXT, null);                            // back on the homepage: no "go there after signing in"
    const next = ssGet(NEXT), k = kindOf(me());
    if (next && k && s.view && PUBLIC.indexOf(s.view) < 0) {          // just signed in from an address that needed it
      ssSet(NEXT, null);
      if (!same(next, s)) { go(next, 'next'); return; }
    }
    const was = parse();
    if (same(s, was)) return;
    let mode = Date.now() - lastGesture < 1500 ? 'push' : 'replace';
    if (AUTH.indexOf(was.view) >= 0 && s.view && PUBLIC.indexOf(s.view) < 0) mode = 'replace';   // Back after signing in skips the sign-in form
    write(s, mode);
  }
  let queued = 0;
  function soon() { if (queued) return; queued = setTimeout(() => { queued = 0; try { record(); } catch (e) { console.warn('url-views-v50:', e); } }, 60); }
  function relevant(muts) {
    for (let i = 0; i < muts.length; i++) {
      const m = muts[i], t = m.target;
      if (m.type === 'childList') { if (t === document.body) return true; continue; }
      const cl = t && t.classList;
      if (cl && (cl.contains('page') || cl.contains('tab-panel') || cl.contains('adm-tab-panel') || cl.contains('adm-tab'))) return true;
    }
    return false;
  }
  const mark = () => { lastGesture = Date.now(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, mark, { capture: true, passive: true }));
  window.addEventListener('popstate', () => { try { go(parse(), 'pop'); } catch (e) { console.warn('url-views-v50: back', e); applying = false; } });

  const CSS = [
    '#browse-jobs-list .browse-card{cursor:pointer}',
    '#browse-jobs-list .browse-card.twu-picked{border-color:var(--green,#2d6a4f);box-shadow:0 0 0 3px var(--green-pale,#d8f3dc),0 6px 20px rgba(0,0,0,.08)}',
    'html.twu-boot #page-landing.active{visibility:hidden}'
  ].join('\n');
  function addStyle() {
    if ($('url-views-v50-style')) return;
    const st = document.createElement('style'); st.id = 'url-views-v50-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }
  addStyle();
  // a refresh on a dashboard address shouldn't flash the homepage first
  const first = parse();
  const dashAddress = t => !!t.view && (t.view === 'admin' || isDashSlug(t.view));
  if (dashAddress(first) && readMark()) {
    document.documentElement.classList.add('twu-boot');
    setTimeout(() => document.documentElement.classList.remove('twu-boot'), 2500);
  }

  function boot() {
    if (window.__twUrlViewsBooted) return;
    window.__twUrlViewsBooted = true;
    new MutationObserver(muts => { if (relevant(muts)) soon(); })
      .observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
    watchList();
    setInterval(() => { watchList(); if (!applying) record(); }, 2000);
    const t = parse();
    if (!dashAddress(t)) ssSet(MARK, null);   // a refresh on the homepage or Sign In signs out, like before
    try {
      if (t.view) go(t, 'load');
      else { applying = false; record(); }
    } catch (e) { console.warn('url-views-v50: start', e); applying = false; }
    later(() => document.documentElement.classList.remove('twu-boot'), 0);
  }
  // after every block has set itself up (they finish on DOMContentLoaded)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => later(boot, 30));
  else later(boot, 30);

  window.twUrlViews = { state: () => current(), parse, go: t => go(t || parse(), 'api'), picked: () => picked };
})();
