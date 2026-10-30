
/* ═══════════════════════════════════════════════════════════════════
   v47 · DELETING ACCOUNTS, CLOSED ACCOUNTS, ADMIN COUNTS  (2026-10-18)
   Aya: "when acounts deleted dont show anything of it anymore but do let
   teen know and let them extract there data like money eraned" · "deleat
   acount in danger zone that requires there passowrds and so it hard to
   do" · admin Contacts listed fewer people than Accounts · "Signup
   Breakdown … this isent sinking".
   • ⚠️ Danger zone in Profile & Settings (teens), Profile (employers) and
     Controls (parents): "Delete my account" asks for the account's own
     password and the word DELETE, and offers the downloads first. The
     Supabase function delete-account then removes the account everywhere.
   • Admin → Accounts: the old device-only 🗑 Delete is gone. Each account
     has a ⚠️ Danger zone with "Set to the Free plan" and "Delete this
     account", both behind the admin password ("Set to Free" in the 💎 Plans
     tab too). An account the admin deletes disappears for everyone at once;
     the person is emailed and can sign in for 30 days ONLY to download
     their records, then everything is deleted.
   • A closed account vanishes from chats, contacts, people search, Find
     Jobs, applications and applicant lists. Teens (and parents and
     employers) who were connected to it get a one-time notice, and teens
     can download their money & hours (CSV) and all their data (JSON).
   • Admin → Activity Stats: Signups and the Signup Breakdown count the real
     accounts (cloud + this device), like Accounts and Contacts.
   Needs: table closed_accounts + Edge Function delete-account
   (/mnt/project-files/contacts-accounts/supabase). Without them nothing is
   hidden and deleting says it can't reach TeenWork; the rest still works.
   window._twClosed = { has, get, keys, load } · window._twAccounts47
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twAccounts47) return;
  window.__twAccounts47 = true;

  /* Aya's Danger zone choice (2026-10-18). false = the admin can't do it at all. */
  const ADMIN_CAN_SET_FREE = true;
  const ADMIN_CAN_DELETE = true;
  const KEEP_DAYS = 30;                       // must match KEEP_DAYS in the delete-account function

  const ROLES = ['teen', 'parent', 'employer'];
  const ROLE_NAME = { teen: 'teen', parent: 'parent', employer: 'employer' };
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const isReal = u => !!(u && !isDemoUser(u) && !u.isAdmin && ROLES.includes(u.type) && /@/.test(String(u.email || '')));
  const low = s => String(s == null ? '' : s).trim().toLowerCase();
  const own = u => (u ? String(u.dataKey || u.email || '') : '');
  const keyOf = u => low(own(u));
  const emailOf = u => low(u && u.email);
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => { try { showToast(m, t || 'info'); } catch (e) {} };
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const readJSON = (k, d) => { try { const v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch (e) { return d; } };
  const parse = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; } };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const later = (fn, ms) => setTimeout(() => { try { const r = fn(); if (r && r.catch) r.catch(e => console.warn('accounts-v47:', e)); } catch (e) { console.warn('accounts-v47:', e); } }, ms || 0);
  const cacheKey = (u, k) => 'tw_' + own(u).replace(/[^a-z0-9]/gi, '_') + '_' + k;
  const fmtDay = t => { const d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); };
  const ymd = () => new Date().toISOString().slice(0, 10);
  const JOBS = () => { try { return typeof browsableJobs !== 'undefined' ? browsableJobs : []; } catch (e) { return []; } };
  const APPS = () => { try { return typeof demoJobs !== 'undefined' ? demoJobs : []; } catch (e) { return []; } };
  const APPLICANTS = () => { try { return typeof demoApplicants !== 'undefined' ? demoApplicants : []; } catch (e) { return []; } };
  const NOTIFS = () => { try { return typeof demoNotifs !== 'undefined' ? demoNotifs : []; } catch (e) { return []; } };
  function prune(arr, bad) { if (!Array.isArray(arr)) return 0; let n = 0; for (let i = arr.length - 1; i >= 0; i--) if (bad(arr[i])) { arr.splice(i, 1); n++; } return n; }
  const localAccounts = () => { try { return _twLocalAccounts() || {}; } catch (e) { return {}; } };
  const audit = (what, detail) => { try { _twAdminAudit(what, detail); } catch (e) {} };

  async function client() {
    try { if (typeof _twCloudClient === 'function') return await _twCloudClient(3000); } catch (e) {}
    try { return (typeof sbClient !== 'undefined' && sbClient) || null; } catch (e) { return null; }
  }
  const FN = (typeof SUPABASE_URL === 'string' && /^https:/.test(SUPABASE_URL)) ? SUPABASE_URL.replace(/\/+$/, '') + '/functions/v1/delete-account' : '';
  const PUBKEY = typeof SUPABASE_KEY === 'string' ? SUPABASE_KEY : '';
  async function callFn(body, token) {
    if (!FN) return { ok: false, error: 'This copy of the app has no cloud connection.' };
    try {
      const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUBKEY, Authorization: 'Bearer ' + (token || PUBKEY) }, body: JSON.stringify(body), signal: AbortSignal.timeout ? AbortSignal.timeout(60000) : undefined });
      const d = await r.json().catch(() => null);
      if (d && typeof d === 'object') return d;
      return { ok: false, error: r.status === 404 ? 'Deleting accounts isn\'t switched on yet (the delete-account function is missing).' : 'TeenWork answered strangely (' + r.status + '). Nothing may have changed.' };
    } catch (e) { return { ok: false, offline: true, error: 'Couldn\'t reach TeenWork. Check your internet connection and try again.' }; }
  }

  /* ── closed accounts (cloud table closed_accounts) ───────────────── */
  const CL = { map: new Map(), at: 0, p: null };
  (function restore() { const c = readJSON('tw_closed_accounts', null); if (c && Array.isArray(c.list)) c.list.forEach(x => { if (x && x.key) CL.map.set(low(x.key), x); }); })();
  function loadClosed(force) {
    if (!force && CL.at && Date.now() - CL.at < 120000) return Promise.resolve(CL.map);
    if (CL.p) return CL.p;
    CL.p = (async () => {
      try {
        const c = await client(); if (!c) return CL.map;
        const r = await c.from('closed_accounts').select('key,type,closed_by,closed_at,purge_after,purged_at').limit(5000);
        if (r && !r.error && Array.isArray(r.data)) {
          const m = new Map(); r.data.forEach(x => { if (x && x.key) m.set(low(x.key), x); });
          CL.map = m; CL.at = Date.now();
          lsSet('tw_closed_accounts', JSON.stringify({ at: CL.at, list: [...m.values()] }));
        }
      } catch (e) {}
      return CL.map;
    })();
    CL.p.then(() => { CL.p = null; }, () => { CL.p = null; });
    return CL.p;
  }
  function remember(row) { CL.map.set(low(row.key), row); lsSet('tw_closed_accounts', JSON.stringify({ at: CL.at, list: [...CL.map.values()] })); }
  const isClosed = k => !!k && CL.map.has(low(k));
  window._twClosed = { has: isClosed, get: k => CL.map.get(low(k)) || null, keys: () => [...CL.map.keys()], load: loadClosed };

  /* ── downloads: money & hours (CSV) and all data (JSON) ──────────── */
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const cell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  async function moneyCSV(u) {
    const M = window._twMoneyHours;
    if (M && typeof M.sync === 'function') { try { await Promise.race([M.sync(), wait(5000)]); } catch (e) {} }
    let led = [], t = { earned: 0, withdrawn: 0, left: 0, hours: 0 };
    try { if (M) { led = M.ledger() || []; t = M.totals() || t; } } catch (e) {}
    const n = v => (Number(v) || 0).toFixed(2);
    const rows = [['TeenWork money and hours'], ['Name', u.name || ''], ['Downloaded', new Date().toLocaleString('en-US')], [],
      ['Date', 'Type', 'What', 'Hours', 'Amount ($)']];
    led.slice().reverse().forEach(e => rows.push([e.date || '', e.kind === 'earn' ? 'Earned' : 'Withdrawn', e.label || '', e.kind === 'earn' && e.hours ? e.hours : '', (e.kind === 'earn' ? '' : '-') + n(e.amount)]));
    if (!led.length) rows.push(['', '', 'Nothing logged yet', '', '']);
    rows.push([], ['Total earned', '', '', '', n(t.earned)], ['Total withdrawn', '', '', '', n(t.withdrawn)], ['Money left', '', '', '', n(t.left)], ['Hours worked', '', '', Number(t.hours) || 0, '']);
    return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n');
  }
  async function allData(u) {
    const out = { app: 'TeenWork', downloaded: new Date().toISOString(),
      account: { name: u.name || '', email: u.email || '', type: u.type || '', dob: u.dob || '', city: u.city || '', state: u.state || '' },
      saved_in_your_account: {}, saved_on_this_device: {}, messages: [] };
    const c = await client();
    if (c) {
      try { const r = await c.from('user_data').select('key,value,updated_at').eq('email', own(u)).limit(2000); ((r && r.data) || []).forEach(x => { out.saved_in_your_account[x.key] = parse(x.value); }); } catch (e) {}
      for (const col of ['from_key', 'to_key']) {
        try { const r = await c.from('messages').select('from_name,from_role,to_name,to_role,text,created_at').eq(col, keyOf(u)).limit(1000); ((r && r.data) || []).forEach(m => out.messages.push(m)); } catch (e) {}
      }
      out.messages.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    }
    let px = ''; try { px = _DB._prefix(); } catch (e) { px = cacheKey(u, ''); }
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && px && k.indexOf(px) === 0) { const v = lsGet(k); const p = parse(v); out.saved_on_this_device[k.slice(px.length)] = p == null ? v : p; } } } catch (e) {}
    const M = window._twMoneyHours;
    if (u.type === 'teen' && M) { try { out.money_and_hours = { totals: M.totals(), entries: M.ledger() }; } catch (e) {} }
    return JSON.stringify(out, null, 2);
  }
  async function downloadMoney(u) { u = u || me(); if (!u) return; download('teenwork-money-and-hours-' + ymd() + '.csv', await moneyCSV(u), 'text/csv;charset=utf-8'); toast('📥 Your money & hours were downloaded.', 'success'); }
  async function downloadAll(u) { u = u || me(); if (!u) return; download('teenwork-my-data-' + ymd() + '.json', await allData(u), 'application/json'); toast('📥 Your data was downloaded.', 'success'); }
  const dlButtons = u => (u.type === 'teen' ? '<button type="button" class="tw47-btn" data-tw47="dl-money">📥 My money &amp; hours (CSV)</button>' : '') +
    '<button type="button" class="tw47-btn" data-tw47="dl-all">📥 All my data (JSON)</button>';

  /* ── small modal helper ──────────────────────────────────────────── */
  function sheet(id, html) {
    const old = $(id); if (old) old.remove();
    const m = document.createElement('div'); m.id = id; m.className = 'tw47-ov'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="tw47-sheet">' + html + '</div>';
    document.body.appendChild(m);
    return m;
  }

  /* ── hiding closed accounts + the one-time notice ────────────────── */
  const seenKey = u => cacheKey(u, 'closed_seen');
  function teenLink(u) {
    const l = readJSON('tw_parent_links', {})[emailOf(u)];
    return (l && l.status) ? l : readJSON(cacheKey(u, 'parent_link'), null) || u.parentLinked || null;
  }
  function sweep() {
    const u = me(); if (!isReal(u) || !CL.map.size || isClosed(keyOf(u))) return;
    const seen = readJSON(seenKey(u), {});
    const found = new Map();
    const note = (k, name, role, job) => {
      k = low(k); if (!k || !isClosed(k) || seen[k]) return;
      const f = found.get(k) || { key: k, name: '', role: role || (CL.map.get(k) || {}).type || '', jobs: [] };
      if (name && !f.name) f.name = String(name);
      if (role && !f.role) f.role = role;
      if (job && f.jobs.indexOf(String(job)) < 0) f.jobs.push(String(job));
      found.set(k, f);
    };
    const redraw = [];
    try {
      const lists = [typeof MSG_CONTACTS !== 'undefined' ? MSG_CONTACTS[u.type] : null];
      try { if (msgCurrentRole === u.type && Array.isArray(msgAllContacts) && msgAllContacts !== lists[0]) lists.push(msgAllContacts); } catch (e) {}
      let n = 0;
      lists.forEach(list => { n += prune(list, c => { const k = low(c && c.cloudKey); if (k && isClosed(k)) { note(k, c.name, c.role, c.jobTitle); return true; } return false; }); });
      if (n) redraw.push('chat');
    } catch (e) {}
    if (u.type === 'teen') {
      if (prune(JOBS(), j => j && j._jb && isClosed(j.employerKey))) redraw.push('renderBrowseJobs');
      if (prune(APPS(), j => { if (j && j._jb && isClosed(j.employerKey)) { note(j.employerKey, j.employer, 'employer', j.title); return true; } return false; })) redraw.push('renderTeenApplications');
      const l = teenLink(u);
      if (l) [l.parentEmail].concat(Array.isArray(l.parents) ? l.parents : []).forEach(e => { if (e && isClosed(e)) note(e, low(e) === low(l.parentEmail) ? l.parentName : '', 'parent'); });
    }
    if (u.type === 'employer' && prune(APPLICANTS(), a => { if (a && a._jb && isClosed(a._teenKey)) { note(a._teenKey, a.name, 'teen', a.job); return true; } return false; })) redraw.push('renderEmployerDashboard', 'renderEmpKanban');
    if (u.type === 'parent') {
      let teens = []; try { teens = (window._twRealData && window._twRealData.linkedTeens()) || []; } catch (e) {}
      const gone = teens.filter(t => t && isClosed(t.key));
      if (gone.length) {
        gone.forEach(t => note(t.key, t.name, 'teen'));
        // the delete-account function already took them off this parent's cloud list; drop the device copy too
        const ck = cacheKey(u, 'linked_teens'), v = readJSON(ck, null);
        if (v && Array.isArray(v.teens)) { v.teens = v.teens.filter(t => t && !isClosed(t.key)); v.updatedAt = Date.now(); lsSet(ck, JSON.stringify(v)); }
        try { window._twRealData.syncParent(); } catch (e) {}
      }
      if (prune(APPS(), j => j && j._jb && isClosed(j._teenKey))) redraw.push('renderApprovalJobs', 'renderAllApplications');
    }
    try { if (window._twContacts && typeof window._twContacts.dropClosed === 'function') window._twContacts.dropClosed(u, note); } catch (e) {}
    redraw.forEach(n => {
      try {
        if (n === 'chat') { if ($('msgModal') && $('msgModal').classList.contains('open')) { if (typeof msgActiveContactId !== 'undefined' && msgActiveContactId && !(msgAllContacts || []).some(c => c.id === msgActiveContactId)) { msgActiveContactId = null; } renderMsgContactList(($('msg-search-input') || {}).value || ''); } try { updateMsgBadge(); } catch (e) {} }
        else if (typeof window[n] === 'function') window[n](n === 'renderApprovalJobs' ? APPS() : undefined);
      } catch (e) {}
    });
    if (!found.size) return;
    found.forEach((f, k) => { seen[k] = Date.now(); });
    lsSet(seenKey(u), JSON.stringify(seen));
    showNotice(u, [...found.values()]);
  }
  function who(f) { return f.name ? esc(f.name) : (f.role === 'employer' ? 'An employer' : f.role === 'parent' ? 'A parent' : f.role === 'teen' ? 'A teen' : 'Someone'); }
  function showNotice(u, list) {
    const items = list.map(f => '<li><b>' + who(f) + '</b>' + (f.role ? ' <span class="tw47-muted">(' + esc(ROLE_NAME[f.role] || f.role) + ')</span>' : '') + (f.jobs.length ? '<br><span class="tw47-muted">' + f.jobs.map(esc).join(' · ') + '</span>' : '') + '</li>').join('');
    const parentGone = u.type === 'teen' && list.some(f => f.role === 'parent');
    const text = u.type === 'teen'
      ? 'Their jobs, messages and contact info are gone from TeenWork. Your hours and the money you earned stay in your records, and you can download them any time.' + (parentGone ? ' <b>Link a parent again</b> in Profile &amp; Settings so you can keep applying.' : '')
      : 'Their profile, jobs, messages and contact info are gone from TeenWork.';
    sheet('tw47-note', '<button type="button" class="tw47-x" aria-label="Close" data-tw47="close">✕</button>' +
      '<h3>📭 ' + (list.length === 1 ? 'An account was closed' : list.length + ' accounts were closed') + '</h3><ul class="tw47-list">' + items + '</ul><p>' + text + '</p>' +
      '<div class="tw47-row">' + (u.type === 'teen' ? dlButtons(u) : '') + '<button type="button" class="tw47-btn pri" data-tw47="close">OK</button></div>');
    try {
      const nl = NOTIFS();
      list.forEach(f => nl.unshift({ text: '📭 ' + (f.name || who(f)) + ' closed their TeenWork account' + (f.jobs.length ? ' (' + f.jobs.join(', ') + ')' : '') + '.' + (u.type === 'teen' ? ' Your hours and money stay in your records.' : ''), time: 'Just now', read: false, type: 'account-closed' }));
      if (typeof window.renderNotifications === 'function') window.renderNotifications();
    } catch (e) {}
  }

  /* ── signed in to a closed account ───────────────────────────────── */
  async function checkMine(u) {
    if (!isReal(u)) return;
    const c = await client(); if (!c) return;
    let row = null;
    try { const r = await c.from('closed_accounts').select('key,type,closed_by,closed_at,purge_after,purged_at').eq('key', keyOf(u)).limit(1); if (r && !r.error && r.data && r.data[0]) row = r.data[0]; } catch (e) {}
    if (row && me() === u) { remember(row); showClosedScreen(u, row); }
  }
  function showClosedScreen(u, row) {
    const until = row.purge_after && !row.purged_at && new Date(row.purge_after) > new Date() ? row.purge_after : null;
    const byAdmin = row.closed_by === 'admin';
    const old = $('tw47-closed'); if (old) old.remove();
    const m = document.createElement('div'); m.id = 'tw47-closed'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="tw47-sheet"><h3>🔒 This account was closed</h3>' +
      '<p>' + (byAdmin ? 'TeenWork closed this account on ' + esc(fmtDay(row.closed_at)) + '.' : 'This account was deleted on ' + esc(fmtDay(row.closed_at)) + '.') + ' Nobody else can see its profile, jobs or messages anymore.</p>' +
      (until ? '<p>You can still download your records until <b>' + esc(fmtDay(until)) + '</b>. After that, everything left is deleted.</p><div class="tw47-row">' + dlButtons(u) + '</div>'
        : '<p>Nothing from it is kept.</p>') +
      '<p class="tw47-muted">Questions? Use Contact Support on the TeenWork home page.</p>' +
      '<div class="tw47-row">' + (until ? '<button type="button" class="tw47-btn danger" data-tw47="closed-purge">Delete everything now</button>' : '') + '<button type="button" class="tw47-btn pri" data-tw47="signout">Sign out</button></div></div>';
    document.body.appendChild(m);
  }

  /* ── ⚠️ Danger zone: a person deletes their own account ─────────── */
  function dangerHost(u) { return !u ? null : u.type === 'teen' ? $('ttab-resume') : u.type === 'employer' ? $('etab-profile') : u.type === 'parent' ? $('ptab-controls') : null; }
  function injectDanger() {
    const u = me(), host = isReal(u) ? dangerHost(u) : null;
    document.querySelectorAll('.tw47-danger').forEach(el => { if (el.parentNode !== host) el.remove(); });
    if (!host || host.querySelector('.tw47-danger')) return;
    const box = document.createElement('div'); box.className = 'tw47-danger';
    box.innerHTML = '<div class="tw47-danger-h">⚠️ Danger zone</div><p>Delete your TeenWork account and everything in it. ' +
      (u.type === 'teen' ? 'You can download your money, hours and other records first.' : 'You can download your data first.') + ' This can\'t be undone.</p>' +
      '<button type="button" class="tw47-btn danger" data-tw47="del-open">Delete my account…</button>';
    host.appendChild(box);
  }
  function openDelete() {
    const u = me(); if (!isReal(u)) return;
    const what = u.type === 'teen' ? 'Your hours, money, lessons and other records are deleted too, so download them first.'
      : u.type === 'employer' ? 'Your job posts close and teens who applied are told.' : 'Your linked teens are told and their link to you is removed.';
    const m = sheet('tw47-del', '<button type="button" class="tw47-x" aria-label="Close" data-tw47="close">✕</button>' +
      '<h3>Delete your account?</h3><p>This deletes <b>' + esc(u.name || u.email) + '</b> (' + esc(ROLE_NAME[u.type] || u.type) + ' account, ' + esc(u.email) + ') for good.</p>' +
      '<ul class="tw47-list"><li>Your profile, jobs or applications, messages and contacts are removed from TeenWork right away.</li><li>People you were connected to see that your account was closed.</li><li>' + esc(what) + '</li></ul>' +
      '<div class="tw47-row start">' + dlButtons(u) + '</div>' +
      '<label class="tw47-lbl">Your password<input type="password" id="tw47-del-pw" autocomplete="current-password"></label>' +
      '<label class="tw47-lbl">Type <b>DELETE</b> to confirm<input type="text" id="tw47-del-word" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>' +
      '<div class="tw47-msg" id="tw47-del-msg" role="status" aria-live="polite"></div>' +
      '<div class="tw47-row"><button type="button" class="tw47-btn" data-tw47="close">Keep my account</button><button type="button" class="tw47-btn danger" id="tw47-del-go" data-tw47="del-go" disabled>Delete my account forever</button></div>');
    const check = () => { $('tw47-del-go').disabled = !($('tw47-del-pw').value && $('tw47-del-word').value.trim().toUpperCase() === 'DELETE'); };
    m.querySelectorAll('input').forEach(i => i.addEventListener('input', check));
    setTimeout(() => { try { $('tw47-del-pw').focus(); } catch (e) {} }, 50);
  }
  // Check the account's own password: in the cloud (signing in again gives a fresh token for the function),
  // or the copy kept on this device for an account that only lives here.
  async function checkPassword(u, pw) {
    const all = localAccounts(), local = all[own(u)] || all[keyOf(u)] || null;
    let localOk = false;
    if (local && local.salt && local.hash) { try { localOk = (await _twHashPw(pw, local.salt)) === local.hash; } catch (e) {} }
    const deviceOnly = !!local && !local.cloud;
    const c = await client();
    if (c && c.auth && typeof c.auth.signInWithPassword === 'function') {
      let r = null; try { r = await c.auth.signInWithPassword({ email: emailOf(u), password: pw }); } catch (e) { r = { error: e }; }
      if (r && r.data && r.data.session) return { ok: true, token: r.data.session.access_token };
      const e = r && r.error, bad = e && ((typeof _twCloudErr !== 'undefined' && _twCloudErr.badLogin(e)) || /invalid login|invalid credentials/i.test(String(e.message || '')));
      if (bad && deviceOnly && localOk) return { ok: true, deviceOnly: true };
      if (bad) return { ok: false, why: 'wrong' };
      return deviceOnly && localOk ? { ok: true, deviceOnly: true } : { ok: false, why: localOk || !local ? 'offline' : 'wrong' };
    }
    return deviceOnly && localOk ? { ok: true, deviceOnly: true } : { ok: false, why: local && !localOk ? 'wrong' : 'offline' };
  }
  function wipeDevice(key) {
    key = String(key || '');
    const all = localAccounts(); let changed = false;
    Object.keys(all).forEach(k => { if (low(k) === low(key)) { delete all[k]; changed = true; } });
    if (changed) { try { _twSaveLocalAccounts(all); } catch (e) {} }
    const px = 'tw_' + key.replace(/[^a-z0-9]/gi, '_') + '_', pxl = 'tw_' + low(key).replace(/[^a-z0-9]/gi, '_') + '_';
    try { Object.keys(localStorage).forEach(k => { if (k.indexOf(px) === 0 || k.indexOf(pxl) === 0 || k === 'tw_device_address_' + low(key)) localStorage.removeItem(k); }); } catch (e) {}
  }
  function goodbyeEmail(u, admin, until) {
    try {
      if (typeof window.twSendEmail !== 'function' || !u.email) return;
      const first = esc(firstName(u.name) || 'there');
      const html = admin
        ? '<p>Hi ' + first + ',</p><p>TeenWork closed your ' + esc(ROLE_NAME[u.type] || '') + ' account (' + esc(u.email) + ') on ' + esc(fmtDay(Date.now())) + '. Nobody can see it on TeenWork anymore.</p><p>You can still sign in until <b>' + esc(fmtDay(until)) + '</b> to download your records' + (u.type === 'teen' ? ', like the money you earned and your hours' : '') + '. After that, everything is deleted.</p><p>If you think this is a mistake, just reply to this email.</p>'
        : '<p>Hi ' + first + ',</p><p>Your TeenWork ' + esc(ROLE_NAME[u.type] || '') + ' account (' + esc(u.email) + ') was deleted on ' + esc(fmtDay(Date.now())) + ', as you asked. Nothing from it is kept.</p><p>If you didn\'t do this, reply to this email right away.</p>';
      window.twSendEmail(u.email, admin ? 'Your TeenWork account was closed' : 'Your TeenWork account was deleted', html, { heading: admin ? 'Account closed' : 'Account deleted', icon: admin ? '🔒' : '👋' });
    } catch (e) {}
  }
  let deleting = false;
  async function doDelete() {
    const u = me(); if (!isReal(u) || deleting) return;
    const pw = ($('tw47-del-pw') || {}).value || '', word = (($('tw47-del-word') || {}).value || '').trim().toUpperCase();
    const msg = t => { const el = $('tw47-del-msg'); if (el) el.textContent = t; };
    if (!pw || word !== 'DELETE') { msg('Type your password and the word DELETE first.'); return; }
    deleting = true; const btn = $('tw47-del-go'); if (btn) { btn.disabled = true; btn.textContent = 'Deleting…'; }
    try {
      msg('Checking your password…');
      const v = await checkPassword(u, pw);
      if (!v.ok) { msg(v.why === 'wrong' ? 'That password isn\'t right. Nothing was deleted.' : 'You need to be online to delete your account. Nothing was deleted.'); return; }
      msg('Deleting…');
      if (v.token) {
        const res = await callFn({ action: 'self', key: keyOf(u), type: u.type }, v.token);
        if (!res.ok) { msg((res.error || 'Couldn\'t delete your account.') + ' Your account is still here.'); return; }
      } else {
        // an account that only ever lived on this device: hide its profile copy, if it ever reached the cloud
        try { const c = await client(); if (c) await c.from('user_data').upsert({ email: own(u), key: 'account_profile', value: JSON.stringify({ deleted: true, type: u.type, deletedAt: Date.now() }), updated_at: new Date().toISOString() }, { onConflict: 'email,key' }); } catch (e) {}
      }
      audit('Deleted own account', own(u));
      goodbyeEmail(u, false);
      remember({ key: keyOf(u), type: u.type, closed_by: 'self', closed_at: new Date().toISOString(), purge_after: new Date().toISOString(), purged_at: new Date().toISOString() });
      wipeDevice(own(u));
      const m = $('tw47-del'); if (m) m.remove();
      try { const c = await client(); if (c && c.auth && c.auth.signOut) await c.auth.signOut(); } catch (e) {}
      try { doLogout(); } catch (e) {}
      toast('👋 Your TeenWork account was deleted.', 'success');
    } finally { deleting = false; const b = $('tw47-del-go'); if (b) { b.textContent = 'Delete my account forever'; b.disabled = false; } }
  }
  // "Delete everything now" on the closed screen: same as deleting your own account
  async function purgeMine() {
    const u = me(); if (!u) return;
    const pw = window.prompt('Type your password to delete everything now. This can\'t be undone.');
    if (!pw) return;
    const v = await checkPassword(u, pw);
    if (!v.ok || !v.token) { toast(v.why === 'wrong' ? 'That password isn\'t right.' : 'You need to be online for this.', 'error'); return; }
    const res = await callFn({ action: 'self', key: keyOf(u), type: u.type }, v.token);
    if (!res.ok) { toast('⚠️ ' + (res.error || 'Couldn\'t delete it.'), 'error'); return; }
    wipeDevice(own(u));
    const m = $('tw47-closed'); if (m) m.remove();
    try { doLogout(); } catch (e) {}
    toast('Everything from that account was deleted.', 'success');
  }

  /* ── admin: Danger zone, confirmed with the admin's own password (v51: a Supabase sign-in, no admin password) ── */
  function askAdmin(o) {
    return new Promise(resolve => {
      const m = sheet('tw47-adm', '<button type="button" class="tw47-x" aria-label="Close" data-a="no">✕</button><h3>' + esc(o.title) + '</h3>' + (o.html || '') +
        '<label class="tw47-lbl">Your admin account password<input type="password" id="tw47-adm-pw" autocomplete="current-password"></label>' +
        (o.confirm ? '<label class="tw47-lbl">Type <b>' + esc(o.confirm) + '</b> to confirm<input type="text" id="tw47-adm-word" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="email"></label>' : '') +
        '<div class="tw47-msg" id="tw47-adm-msg" role="status" aria-live="polite"></div>' +
        '<div class="tw47-row"><button type="button" class="tw47-btn" data-a="no">Cancel</button><button type="button" class="tw47-btn danger" data-a="go">' + esc(o.go || 'Confirm') + '</button></div>');
      const done = v => { m.remove(); resolve(v); };
      m.addEventListener('click', async e => {
        const a = e.target.closest('[data-a]'); if (!a) { if (e.target === m) done(null); return; }
        if (a.getAttribute('data-a') === 'no') return done(null);
        const pw = $('tw47-adm-pw').value, say = t => { $('tw47-adm-msg').textContent = t; };
        if (o.confirm && low($('tw47-adm-word').value) !== low(o.confirm)) return say('Type ' + o.confirm + ' exactly to confirm.');
        if (!pw) return say('Type your password.');
        say('Checking…');
        let right = false; try { right = typeof _twCheckAdminPassword === 'function' ? await _twCheckAdminPassword(pw) : false; } catch (e) {}
        if (!right) return say('That password didn\'t work for the admin account (or TeenWork can\'t be reached right now).');
        done(true);
      });
      setTimeout(() => { try { $('tw47-adm-pw').focus(); } catch (e) {} }, 50);
    });
  }
  const _oSetPlan = window.twPlanAdminSet;
  if (typeof _oSetPlan === 'function') window.twPlanAdminSet = function (plan, email) {
    if (plan !== 'free') return _oSetPlan.apply(this, arguments);
    if (!ADMIN_CAN_SET_FREE) { toast('Only the person can change their own plan.', 'info'); return; }
    const self = this, args = arguments;
    const key = String(email || ($('twpl-email') && $('twpl-email').value) || '').trim().toLowerCase();
    askAdmin({ title: 'Set ' + (key || 'this account') + ' to the Free plan?', html: '<p>They lose Pro right away and get the free limits.</p>', go: 'Set to Free' })
      .then(pw => { if (pw) _oSetPlan.apply(self, args); });
  };
  const VALID_KEY = /^[^\s@#,()"*]+@[^\s@#,()"*]+\.[^\s@#,()"*]+(#\d{1,3})?$/;   // same as validKey in the delete-account function
  function cardName(card) { const n = card.querySelector('.adm39-acct-head [style*="font-weight:700"]'); return n ? n.textContent.replace(/account #\d+/, '').trim() : ''; }
  function decorateAccounts() {
    const list = $('adm39-acct-list'); if (!list) return;
    list.querySelectorAll('.adm39-acct').forEach(card => {
      const key = low(card.getAttribute('data-key'));
      if (isClosed(key)) { if (card.style.display !== 'none') card.style.display = 'none'; return; }
      card.querySelectorAll('[data-act="delete"]').forEach(b => b.remove());
      const acts = card.querySelector('.adm39-actions');
      if (acts && (ADMIN_CAN_DELETE || ADMIN_CAN_SET_FREE) && !acts.querySelector('[data-tw47-dz]')) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'adm-btn adm-btn-delete'; b.setAttribute('data-tw47-dz', '1'); b.textContent = '⚠️ Danger zone'; acts.appendChild(b);
      }
    });
    let sum = $('tw47-closed-sum');
    const closed = [...CL.map.values()];
    if (!closed.length) { if (sum) sum.remove(); return; }
    if (!sum) { sum = document.createElement('details'); sum.id = 'tw47-closed-sum'; sum.className = 'tw47-closed-sum'; list.parentNode.insertBefore(sum, list.nextSibling); }
    const html = '<summary>🗂 ' + closed.length + ' closed account' + (closed.length === 1 ? '' : 's') + ' (hidden from everyone)</summary>' +
      closed.sort((a, b) => String(b.closed_at).localeCompare(String(a.closed_at))).map(r => '<div class="tw47-closed-row"><code>' + esc(r.key) + '</code> · ' + esc(r.type || 'account') + ' · ' +
        (r.closed_by === 'admin' ? 'closed by admin ' : 'deleted by its owner ') + esc(fmtDay(r.closed_at)) +
        (r.purged_at ? ' · everything deleted' : r.purge_after ? ' · records kept for them until ' + esc(fmtDay(r.purge_after)) : '') + '</div>').join('');
    if (sum.dataset.html !== html) { const open = sum.open; sum.innerHTML = html; sum.dataset.html = html; sum.open = open; }
  }
  function toggleDanger(card) {
    let dz = card.querySelector('.tw47-dz');
    if (dz) { dz.remove(); return; }
    dz = document.createElement('div'); dz.className = 'tw47-dz';
    dz.innerHTML = '<b>⚠️ Danger zone</b><p class="tw47-muted">Each of these asks for your admin account password.</p><div class="tw47-row start">' +
      (ADMIN_CAN_SET_FREE ? '<button type="button" class="adm-btn adm-btn-mark" data-tw47-free>Set to the Free plan</button>' : '') +
      (ADMIN_CAN_DELETE ? '<button type="button" class="adm-btn adm-btn-delete" data-tw47-close>🗑 Delete this account</button>' : '') + '</div>' +
      (ADMIN_CAN_DELETE ? '<p class="tw47-muted">Deleting hides the account from everyone right away and emails them. They can sign in for ' + KEEP_DAYS + ' days only to download their records; then everything is deleted.</p>' : '');
    card.appendChild(dz);
  }
  async function adminDelete(card) {
    const key = low(card.getAttribute('data-key')), name = cardName(card), email = key.split('#')[0];
    const ok = await askAdmin({ title: 'Delete ' + (name || email) + '?', confirm: email, go: 'Delete account',
      html: '<p><code>' + esc(key) + '</code> disappears from TeenWork for everyone right away: profile, jobs, applications, chats and contacts. People connected to it are told.</p><p>They get an email and can sign in for ' + KEEP_DAYS + ' days only to download their records (like money earned); then everything is deleted.</p>' });
    if (!ok) return;
    // An account whose key isn't an email address (made offline, before the cloud) was only ever saved on
    // this device: TeenWork's server can't take it, so it is deleted here.
    const deviceOnly = () => {
      wipeDevice(key); audit('Deleted account from this device (Danger zone)', key);
      toast('🗑 Deleted from this device. It was never saved to TeenWork\'s cloud.', 'success');
      try { const r = $('adm39-acct-refresh'); if (r) r.click(); } catch (e) {}
    };
    if (!VALID_KEY.test(key)) return deviceOnly();
    toast('Deleting…', 'info');
    let token = null; try { token = typeof _twAdminToken === 'function' ? await _twAdminToken() : null; } catch (e) {}
    const res = await callFn({ action: 'close', key }, token);
    if (!res.ok && res.code === 'bad_key') return deviceOnly();
    if (!res.ok) { toast('⚠️ ' + (res.code === 'admin_only' ? 'TeenWork\'s server says this sign-in isn\'t the admin. Sign out, sign in again and pick Admin panel.' : res.error || 'Couldn\'t delete the account.'), 'error'); return; }
    const until = res.purge_after || new Date(Date.now() + KEEP_DAYS * 864e5).toISOString();
    remember({ key, type: res.type || '', closed_by: 'admin', closed_at: new Date().toISOString(), purge_after: until, purged_at: null });
    const a = localAccounts()[key] || {};
    goodbyeEmail({ email, name: name || a.name || '', type: a.type || '' }, true, until);
    wipeDevice(key);
    audit('Deleted account (Danger zone)', key);
    toast('🗑 Deleted. They can download their records until ' + fmtDay(until) + '.', 'success');
    try { const r = $('adm39-acct-refresh'); if (r) r.click(); } catch (e) {}
    try { if (typeof window.adminRefreshContacts === 'function') window.adminRefreshContacts(); } catch (e) {}
    loadClosed(true).then(decorateAccounts);
  }
  let accObs = null;
  function watchAccounts() {
    const list = $('adm39-acct-list'); if (!list) return;
    decorateAccounts();
    if (accObs && accObs.__el === list) return;
    if (accObs) accObs.disconnect();
    accObs = new MutationObserver(() => decorateAccounts()); accObs.__el = list;
    accObs.observe(list, { childList: true });
    list.addEventListener('click', e => {
      const card = e.target.closest('.adm39-acct'); if (!card) return;
      if (e.target.closest('[data-tw47-dz]')) toggleDanger(card);
      else if (e.target.closest('[data-tw47-free]')) window.twPlanAdminSet('free', card.getAttribute('data-key'));
      else if (e.target.closest('[data-tw47-close]')) adminDelete(card);
    });
  }

  /* ── admin: signups counted from the real accounts ──────────────── */
  const prof = { at: 0, list: [] };
  async function accountList() {
    const by = new Map();
    const all = localAccounts();
    Object.keys(all).forEach(k => { const a = all[k]; if (a && ROLES.includes(a.type)) by.set(low(k), a.type); });
    if (Date.now() - prof.at > 60000) {
      try {
        const c = await client();
        if (c) { const r = await c.from('user_data').select('email,value').eq('key', 'account_profile').limit(5000); if (r && !r.error) { prof.list = (r.data || []).map(x => ({ key: low(x.email), v: parse(x.value) || {} })); prof.at = Date.now(); } }
      } catch (e) {}
    }
    prof.list.forEach(x => { if (ROLES.includes(x.v.type) && !x.v.deleted) by.set(x.key, x.v.type); });
    await loadClosed();
    return [...by.entries()].filter(([k]) => !isClosed(k)).map(([key, type]) => ({ key, type }));
  }
  let statsBusy = false;
  async function fixStats() {
    if (statsBusy) return; statsBusy = true;
    try {
      const list = await accountList();
      const n = { teen: 0, parent: 0, employer: 0 }; list.forEach(a => { n[a.type]++; });
      const total = list.length;
      document.querySelectorAll('#adm-stats-row .adm-stat').forEach(s => {
        const l = s.querySelector('.adm-stat-label'), v = s.querySelector('.adm-stat-val'); if (!l || !v) return;
        const t = l.textContent.trim();
        if (t === 'Signups') { l.textContent = 'Accounts'; v.textContent = String(total); }
        else if (t === 'Page Visits' || t === 'Sessions') l.textContent = t + ' (this device)';
      });
      const bd = $('adm-signup-breakdown');
      if (bd) {
        const color = { teen: 'var(--green)', parent: 'var(--blue)', employer: 'var(--amber)' };
        bd.innerHTML = ROLES.map(t => { const pct = total ? Math.round(n[t] / total * 100) : 0;
          return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:3px"><span style="font-weight:700;text-transform:capitalize">' + t + '</span><span style="color:var(--muted)">' + n[t] + ' (' + pct + '%)</span></div>' +
            '<div style="background:var(--border);border-radius:6px;height:7px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + color[t] + ';border-radius:6px;transition:width .5s"></div></div></div>'; }).join('') +
          '<div style="font-size:.74rem;color:var(--muted);margin-top:6px">Every real account, from the cloud and this device (' + total + ' in all). Visits and sessions are counted on this device only.</div>';
      }
      document.querySelectorAll('#adm-panel-stats button[onclick^="adminResetStats"]').forEach(b => { if (!/this device/.test(b.textContent)) b.textContent = '🗑 Reset visit counts (this device)'; });
    } finally { statsBusy = false; }
  }
  const _oStats = window.adminRenderStats;
  if (typeof _oStats === 'function') window.adminRenderStats = function () { const r = _oStats.apply(this, arguments); later(fixStats, 0); return r; };

  /* ── a closed account never re-registers its profile ─────────────── */
  const _oReg = window._twRegisterAccountInCloud;
  if (typeof _oReg === 'function') window._twRegisterAccountInCloud = function (acct, key) {
    const self = this, args = arguments, k = low(key || (acct && acct.email));
    if (isClosed(k)) return;
    loadClosed().then(() => { if (!isClosed(k)) _oReg.apply(self, args); }, () => _oReg.apply(self, args));
  };

  /* ── clicks ──────────────────────────────────────────────────────── */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-tw47]'); if (!b) return;
    const a = b.getAttribute('data-tw47'), u = me();
    if (a === 'close') { const m = b.closest('.tw47-ov'); if (m) m.remove(); }
    else if (a === 'dl-money') downloadMoney(u);
    else if (a === 'dl-all') downloadAll(u);
    else if (a === 'del-open') openDelete();
    else if (a === 'del-go') doDelete();
    else if (a === 'closed-purge') purgeMine();
    else if (a === 'signout') { const m = $('tw47-closed'); if (m) m.remove(); try { doLogout(); } catch (x) {} }
  });
  document.addEventListener('mousedown', e => { if (e.target.classList && e.target.classList.contains('tw47-ov') && e.target.id !== 'tw47-adm') e.target.remove(); });

  /* ── wiring ──────────────────────────────────────────────────────── */
  const _oLaunch = window.launchDashboard;
  if (typeof _oLaunch === 'function') window.launchDashboard = function () {
    const r = _oLaunch.apply(this, arguments);
    const u = me();
    [300, 1500].forEach(ms => later(injectDanger, ms));
    if (isReal(u)) {
      later(() => checkMine(u), 700);
      later(() => loadClosed(true).then(() => { if (me() === u) sweep(); }), 1800);
      later(() => { if (me() === u) sweep(); }, 7000);
    }
    return r;
  };
  const _oLogout = window.doLogout;
  if (typeof _oLogout === 'function') window.doLogout = function () {
    ['tw47-closed', 'tw47-del', 'tw47-note'].forEach(id => { const m = $(id); if (m) m.remove(); });
    document.querySelectorAll('.tw47-danger').forEach(el => el.remove());
    return _oLogout.apply(this, arguments);
  };
  let purged = false;
  const _oAdmin = window.launchAdminPanel;
  if (typeof _oAdmin === 'function') window.launchAdminPanel = function () {
    const r = _oAdmin.apply(this, arguments);
    [200, 1200, 3000].forEach(ms => later(watchAccounts, ms));
    if (!purged) { purged = true; later(async () => { await callFn({ action: 'purge' }); await loadClosed(true); decorateAccounts(); }, 1500); }
    else later(() => loadClosed(true).then(decorateAccounts), 500);
    return r;
  };
  const _oTab = window.adminSwitchTab;
  if (typeof _oTab === 'function') window.adminSwitchTab = function (name) {
    const r = _oTab.apply(this, arguments);
    if (name === 'accounts') later(watchAccounts, 50);
    if (name === 'stats') later(fixStats, 50);
    return r;
  };
  setInterval(() => { const u = me(); if (isReal(u) && document.visibilityState !== 'hidden') loadClosed().then(() => { if (me() === u) sweep(); }); }, 60000);

  /* ── styles ──────────────────────────────────────────────────────── */
  const css = document.createElement('style'); css.id = 'accounts-v47-css';
  css.textContent =
    '.tw47-ov,#tw47-closed{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10070;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto}' +
    '#tw47-closed{background:var(--bg,#f7f7f5);z-index:10080}' +
    '.tw47-sheet{position:relative;background:var(--card,#fff);color:var(--text,#1b1b1b);border-radius:16px;padding:1.4rem 1.3rem 1.1rem;max-width:440px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.25);font-size:.9rem;line-height:1.55;margin:auto}' +
    '.tw47-sheet h3{font-family:"Fraunces",serif;font-size:1.18rem;margin:0 0 .5rem;padding-right:1.6rem}' +
    '.tw47-sheet p{margin:0 0 .65rem}' +
    '.tw47-x{position:absolute;top:8px;right:10px;border:none;background:none;font-size:1.1rem;cursor:pointer;color:var(--muted,#667);padding:4px}' +
    '.tw47-list{margin:0 0 .7rem 1.1rem;padding:0}.tw47-list li{margin-bottom:.3rem}' +
    '.tw47-muted{color:var(--muted,#667);font-size:.82rem}' +
    '.tw47-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin:.5rem 0 .2rem}.tw47-row.start{justify-content:flex-start}' +
    '.tw47-btn{border:1.5px solid var(--border,#ddd);background:var(--card,#fff);color:inherit;border-radius:9px;padding:8px 14px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.85rem}' +
    '.tw47-btn.pri{background:var(--green,#2d6a4f);border-color:var(--green,#2d6a4f);color:#fff}' +
    '.tw47-btn.danger{background:#b42318;border-color:#b42318;color:#fff}' +
    '.tw47-btn[disabled]{opacity:.5;cursor:default}' +
    '.tw47-lbl{display:block;font-size:.82rem;font-weight:700;margin:.6rem 0 0}' +
    '.tw47-lbl input{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:9px 11px;border:1.5px solid var(--border,#ddd);border-radius:9px;font:inherit;font-weight:400;background:var(--card,#fff);color:var(--text,#1b1b1b)}' +
    '.tw47-msg{min-height:1.2em;font-size:.82rem;color:#b42318;margin-top:.5rem}' +
    '.tw47-danger{margin-top:1.4rem;border:1.5px solid #f1b5ae;background:#fff6f5;border-radius:12px;padding:1rem 1.1rem;color:#5c1a14}' +
    '.tw47-danger-h{font-weight:800;color:#b42318;margin-bottom:.3rem}.tw47-danger p{font-size:.85rem;margin:0 0 .7rem;line-height:1.5}' +
    '.tw47-dz{margin-top:10px;border:1.5px dashed #f1b5ae;border-radius:10px;padding:10px 12px;background:#fff6f5;font-size:.84rem}.tw47-dz p{margin:.3rem 0}' +
    '.tw47-closed-sum{margin:10px 0;font-size:.82rem;color:var(--muted,#667)}.tw47-closed-sum summary{cursor:pointer;font-weight:700}.tw47-closed-row{padding:4px 0;border-top:1px solid var(--border,#eee)}' +
    '@media (prefers-color-scheme: dark){.tw47-danger,.tw47-dz{background:rgba(180,35,24,.12);color:inherit}}';
  document.head.appendChild(css);

  window._twAccounts47 = { sweep, loadClosed, checkMine, downloadMoney, downloadAll, moneyCSV, allData, openDelete, injectDanger, fixStats, decorateAccounts, accountList,
    settings: { ADMIN_CAN_SET_FREE, ADMIN_CAN_DELETE, KEEP_DAYS } };
})();
