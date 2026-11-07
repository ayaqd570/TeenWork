/* ═══════════════════════════════════════════════════════════════════
   parent-hours-v52 — the parent's weekly hour limit reaches the teen
   (2026-11-02). Aya said yes to "The parent's weekly-hour setting never
   reaches the teen today. Should it?"
   Before: the parent's ⏰ Weekly Hour Limit (#ctrl-max-hours) was saved
   only in the parent's own browser, so it changed nothing for the teen.
   Now:
   • A real parent's choice is saved in Supabase user_data, one row per
     linked teen (the control applies to all of the parent's linked teens):
       <parent>/hour_limit:<teen key>
         {v:1, status:'set'|'off', hours, teenKey, parentKey, parentEmail, parentName, at}
     A teen linked later gets the parent's current choice the next time
     the parent's dashboard loads.
   • The teen's app reads hour_limit:<own key> rows and counts only rows
     saved under a parent who is linked and approved on the teen's own
     parent_link (the parent-consent-v44 check), so nothing the teen does
     sets it. With two parents the lower limit counts.
   • work-rules-v52 weekTarget() uses the lowest of the legal school-week
     limit, this limit and the teen's own goal. The teen sees it as "set by
     <parent>", a family rule, not a law, and can't change it.
   • The parent's control shows what their teens actually get: "No limit
     (state law only)" until they pick a number.
   window.twParentHourLimit() → {hours, name, email, at} | null (teen side)
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twParentHours52) return;
  window.__twParentHours52 = true;

  const OPTIONS = [5, 8, 10, 12, 15, 20, 25, 30];
  const NONE = 999;
  const ROLES = ['teen', 'parent', 'employer'];
  const $ = id => document.getElementById(id);
  const me = () => { try { if (typeof currentUser !== 'undefined' && currentUser) return currentUser; } catch (e) {} return window.currentUser || null; };
  const isReal = u => !!(u && !u.isDemo && !u.isAdmin && ROLES.includes(u.type) && /@/.test(String(u.email || '')) && !/\.demo$/i.test(String(u.email || '')));
  const as = type => { const u = me(); return u && !u.isAdmin && u.type === type ? u : null; };
  const emailOf = u => String((u && u.email) || '').trim().toLowerCase();
  const rowKeyOf = u => (u ? String(u.dataKey || u.email || '') : '');
  const baseEmail = k => String(k || '').trim().toLowerCase().replace(/#\d+$/, '');
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const readJSON = (k, d) => { try { const v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch (e) { return d; } };
  const parse = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; } };
  const toast = (m, t) => { try { showToast(m, t || 'success'); } catch (e) {} };
  const later = (fn, ms) => setTimeout(() => { try { const r = fn(); if (r && r.catch) r.catch(e => console.warn('parent-hours:', e)); } catch (e) { console.warn('parent-hours:', e); } }, ms || 0);
  const validHours = n => { n = Number(n); return n > 0 && n < NONE ? Math.round(n) : null; };

  /* ── cloud (user_data), same helpers as parent-consent-v44 ──────── */
  async function client() {
    try { if (typeof _twCloudClient === 'function') return await _twCloudClient(3000); } catch (e) {}
    try { return (typeof sbClient !== 'undefined' && sbClient) || null; } catch (e) { return null; }
  }
  async function rows(build) {
    const c = await client(); if (!c) return null;
    try { const r = await build(c.from('user_data').select('email,key,value')); return r && !r.error ? (r.data || []) : null; } catch (e) { return null; }
  }
  async function put(email, key, value) {
    if (!email) return false;
    const c = await client(); if (!c) return false;
    try {
      const r = await c.from('user_data').upsert({ email, key, value: JSON.stringify(value), updated_at: new Date().toISOString() }, { onConflict: 'email,key' });
      return !(r && r.error);
    } catch (e) { return false; }
  }
  function linkParents(link) {
    if (!link || link.status !== 'approved') return [];
    return [...new Set((link.parents || []).concat(link.parentEmail ? [link.parentEmail] : []).map(baseEmail).filter(Boolean))];
  }
  const redrawTeen = () => {
    try { if (window.twWorkRules) window.twWorkRules.renderWorkLogRules(); } catch (e) {}
    try { if (typeof window.twMoneyRedraw === 'function') window.twMoneyRedraw(); } catch (e) {}
    try { const b = $('teen-state-rules-banner'); if (b && typeof window.twRenderLaborSummary === 'function') window.twRenderLaborSummary(b); } catch (e) {}
    try { if (typeof renderCalEarningsBar === 'function' && $('cal-grid')) renderCalEarningsBar(); } catch (e) {}
  };

  /* ── parent side ────────────────────────────────────────────────── */
  const choiceKey = u => 'tw52ph_choice_' + rowKeyOf(u).toLowerCase();
  let pOwner = '', pChoice = undefined, pFetchedAt = 0, pBusy = false;
  function parentTeens(u) {
    if (!u || u.type !== 'parent') return [];
    try { return ((window._twRealData && window._twRealData.linkedTeens()) || []).filter(t => t && t.key && !t.pending); } catch (e) { return []; }
  }
  // The parent's current choice: {hours|null, at} (null hours = no limit), or undefined while unknown.
  function loadChoice(u) {
    if (pOwner !== rowKeyOf(u)) { pOwner = rowKeyOf(u); pChoice = undefined; pFetchedAt = 0; }
    if (pChoice === undefined) { const c = readJSON(choiceKey(u), null); if (c && 'hours' in c) pChoice = { hours: validHours(c.hours), at: c.at || '' }; }
    return pChoice;
  }
  function remember(u, choice) { pChoice = choice; lsSet(choiceKey(u), JSON.stringify(choice)); }
  const recFor = (u, t, choice) => ({ v: 1, status: choice.hours ? 'set' : 'off', hours: choice.hours || null, teenKey: t.key, teenEmail: t.email || t.key, teenName: t.name || '',
    parentKey: rowKeyOf(u), parentEmail: emailOf(u), parentName: u.name || '', at: choice.at });
  // Make each linked teen's row match the parent's choice. Returns {ok, failed, teens}.
  async function pushAll(u, choice, existing) {
    const teens = parentTeens(u); let failed = 0;
    for (const t of teens) {
      const have = existing ? existing[t.key] : null;
      if (have && have.at === choice.at && (have.hours || null) === (choice.hours || null)) continue;
      if (!have && !choice.hours) continue;                  // nothing to switch off
      if (!(await put(rowKeyOf(u), 'hour_limit:' + t.key, recFor(u, t, choice)))) failed++;
    }
    return { ok: !failed, failed, teens };
  }
  async function refreshParent(force) {
    const u = as('parent'); if (!isReal(u) || pBusy) return;
    loadChoice(u);
    if (!force && Date.now() - pFetchedAt < 60000) return;
    pBusy = true; pFetchedAt = Date.now();
    try {
      const got = await rows(q => q.eq('email', rowKeyOf(u)).like('key', 'hour_limit:%'));
      if (!got || me() !== u) return;
      const existing = {}; let newest = null;
      got.forEach(r => {
        const v = parse(r.value); if (!v || r.key !== 'hour_limit:' + v.teenKey) return;
        existing[v.teenKey] = v;
        if (!newest || String(v.at || '') > String(newest.at || '')) newest = v;
      });
      // the newest saved row wins over this browser's copy (the parent may have changed it on another device)
      if (newest && (!pChoice || String(newest.at || '') > String(pChoice.at || ''))) remember(u, { hours: validHours(newest.hours), at: newest.at || '' });
      drawParent();
      if (pChoice) await pushAll(u, pChoice, existing);       // a teen linked since then gets it too
    } finally { pBusy = false; }
  }
  async function choose(value) {
    const u = as('parent'); if (!u) return;
    const choice = { hours: validHours(value), at: new Date().toISOString() };
    try { if (typeof parentalControls !== 'undefined') { parentalControls['max-weekly-hours'] = choice.hours || NONE; if (typeof saveUserData === 'function') saveUserData(); } } catch (e) {}
    remember(u, choice); drawParent();
    if (!isReal(u)) { toast(choice.hours ? 'Weekly limit set to ' + choice.hours + ' h.' : 'Weekly limit turned off.'); return; }
    const teens = parentTeens(u);
    if (!teens.length) { toast((choice.hours ? 'Saved: ' + choice.hours + ' h a week.' : 'Saved: no weekly limit.') + ' It will apply once you link a teen under My Teens.', 'info'); return; }
    const res = await pushAll(u, choice, null);
    const who = teens.length === 1 ? (firstName(teens[0].name) || 'your teen') : 'your teens';
    if (!res.ok) { toast('The limit couldn\'t reach ' + who + '\'s account. Check your connection and try again.', 'error'); return; }
    toast(choice.hours ? 'Weekly limit set to ' + choice.hours + ' h for ' + who + '. They\'ll see it in Work Log.' : 'Weekly limit turned off for ' + who + '. State law still applies.', 'success');
  }
  window.twParentSetHourLimit = choose;
  function drawParent() {
    const u = as('parent'), sel = $('ctrl-max-hours'); if (!u || !sel) return;
    const c = loadChoice(u), cur = c && c.hours ? c.hours : NONE;
    const opts = [NONE].concat(OPTIONS, cur !== NONE && OPTIONS.indexOf(cur) < 0 ? [cur] : []).sort((a, b) => a === NONE ? -1 : b === NONE ? 1 : a - b);
    const sig = opts.join(',');
    if (sel.dataset.tw52 !== sig) {
      sel.innerHTML = opts.map(n => `<option value="${n}">${n === NONE ? 'No limit (state law only)' : n + ' h a week'}</option>`).join('');
      sel.dataset.tw52 = sig;
    }
    if (String(sel.value) !== String(cur)) sel.value = String(cur);
    if (!sel.__tw52) {
      sel.removeAttribute('onchange');
      sel.onchange = () => { choose(sel.value); };
      sel.setAttribute('aria-label', 'Weekly hour limit for your linked teens');
      sel.style.fontSize = ''; sel.classList.add('tw52-ph-select');
      sel.__tw52 = true;
    }
    const box = sel.parentElement, help = box && box.querySelector('div > div:nth-child(2)');
    const text = 'Applies to your linked teens. They see it in Work Log and can\'t change it. If the law allows fewer hours, the law wins.';
    if (help && help.textContent !== text) help.textContent = text;
  }

  /* ── teen side ──────────────────────────────────────────────────── */
  let tState = { key: '', by: null, checkedAt: 0 };
  let tBusy = false;
  const teenLink = u => (readJSON('tw_parent_links', {}) || {})[emailOf(u)] || u.parentLinked || null;
  const lastKey = u => 'tw52ph_last_' + rowKeyOf(u).toLowerCase();
  const seenKey = u => 'tw52ph_seen_' + rowKeyOf(u).toLowerCase();
  function resetTeen(u) {
    if (tState.key === rowKeyOf(u)) return;
    tState = { key: rowKeyOf(u), by: null, checkedAt: 0 };
    const last = readJSON(lastKey(u), null);                   // what this device saw last, until the cloud answers
    if (last && validHours(last.hours) && linkParents(teenLink(u)).includes(baseEmail(last.email))) tState.by = last;
  }
  function setTeen(u, by) {
    const before = JSON.stringify(tState.by || null);
    tState.by = by;
    lsSet(lastKey(u), by ? JSON.stringify(by) : null);
    const seen = lsGet(seenKey(u)), now = by ? String(by.hours) : 'none';
    if (seen !== null && seen !== now) {
      if (by) toast('⏰ ' + (firstName(by.name) || 'Your parent') + ' set a weekly limit of ' + by.hours + ' h for you. You\'ll see it in Work Log.', 'info');
      else toast('Your parent turned off your weekly hour limit. The law and your own goal still apply.', 'info');
    }
    lsSet(seenKey(u), now);
    if (JSON.stringify(by || null) !== before) redrawTeen();
  }
  async function checkTeen() {
    const u = as('teen'); if (!isReal(u) || tBusy) return;
    resetTeen(u);
    const parents = linkParents(teenLink(u));
    tState.checkedAt = Date.now();
    if (!parents.length) { setTeen(u, null); return; }
    tBusy = true;
    try {
      const mine = rowKeyOf(u);
      const got = await rows(q => q.eq('key', 'hour_limit:' + mine));
      if (!got || me() !== u) return;
      const set = got.map(r => ({ r, v: parse(r.value) }))
        .filter(x => x.v && x.v.status === 'set' && validHours(x.v.hours) && x.v.teenKey === mine && parents.includes(baseEmail(x.r.email)) && baseEmail(x.v.parentEmail) === baseEmail(x.r.email))
        .sort((a, b) => a.v.hours - b.v.hours);
      const best = set[0] ? { hours: validHours(set[0].v.hours), name: set[0].v.parentName || set[0].v.parentEmail, email: set[0].v.parentEmail, at: set[0].v.at || '' } : null;
      setTeen(u, best);
    } finally { tBusy = false; }
  }
  window.twParentHourLimit = function () {
    const u = as('teen'); if (!isReal(u)) return null;
    resetTeen(u);
    return tState.by && validHours(tState.by.hours) ? Object.assign({}, tState.by) : null;
  };

  /* ── wiring ─────────────────────────────────────────────────────── */
  const _oLaunch = window.launchDashboard;
  if (typeof _oLaunch === 'function') window.launchDashboard = function () {
    const r = _oLaunch.apply(this, arguments);
    [300, 2500].forEach(ms => later(() => {
      const u = me(); if (!u) return;
      if (u.type === 'teen') return checkTeen();
      if (u.type === 'parent') { drawParent(); return refreshParent(true); }
    }, ms));
    return r;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    const u = me(); if (!isReal(u)) return;
    if (u.type === 'teen') later(checkTeen, 0); else if (u.type === 'parent') later(() => refreshParent(true), 0);
  });
  setInterval(() => {
    try {
      const u = me(); if (!u) return;
      if (u.type === 'parent') { drawParent(); if (isReal(u)) later(() => refreshParent(false), 0); }
      if (isReal(u) && u.type === 'teen' && !document.hidden && !tBusy && (tState.key !== rowKeyOf(u) || Date.now() - tState.checkedAt > 120000)) later(checkTeen, 0);
    } catch (e) {}
  }, 1500);

  window._twParentHours = { checkTeen, refreshParent: () => refreshParent(true), drawParent, choose, teenLimit: () => window.twParentHourLimit(), OPTIONS };
})();
