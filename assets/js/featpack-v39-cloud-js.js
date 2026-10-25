
/* ══════════════════════════════════════════════════════════════════════
   v39 — CLOUD MESSAGING + SUPABASE AUTO-CONNECT
   • Connects to Supabase even when its library finishes loading after the
     app started (before, sbClient stayed null for the whole visit).
   • Real accounts (not demo logins): every message sent is stored in the
     Supabase `messages` table, and messages for you are pulled in every
     REFRESH_SECONDS seconds — instantly when Supabase Realtime is on.
     Conversations are also kept on the device so they survive a reload.
     Demo logins keep the built-in practice conversations and auto-replies.
   • Admin → 🩺 System Health gets a "Cloud messaging" line.
   Setup: run admin-account/supabase-setup.sql in the Supabase SQL editor.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const REFRESH_SECONDS = Number(window.TW_MSG_REFRESH_SECONDS) || 10;
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const sb = () => (typeof sbClient !== 'undefined' && sbClient) ? sbClient : null;
  const keyOf = u => u ? (u.dataKey || String(u.email || '').toLowerCase()) : '';
  const isRealUser = () => { const u = me(); return !!(u && !u.isDemo && !u.isAdmin && ['teen', 'parent', 'employer'].includes(u.type) && /@/.test(String(u.email || ''))); };
  const fmtTime = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); };
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const avatars = { employer: '🏢', teen: '🧑', parent: '👪', admin: '🛡️' };
  const toast = (m, t) => { try { showToast(m, t || 'info'); } catch (e) {} };
  const modalOpen = () => !!document.getElementById('msgModal')?.classList.contains('open');
  let lastError = '';

  /* 1. connect even when the Supabase library arrives late */
  function ensureClient() {
    if (sb()) return true;
    try {
      if (window.supabase && typeof SUPABASE_URL !== 'undefined' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.dispatchEvent(new CustomEvent('tw-supabase-ready'));
        return true;
      }
    } catch (e) { console.warn('Supabase connect failed:', e); }
    return false;
  }
  window._twEnsureSupabase = ensureClient;
  (function waitForSdk(n) { if (ensureClient() || n >= 60) return; setTimeout(() => waitForSdk(n + 1), 500); })(0);

  /* 2. conversations kept on this device, per account */
  const storeKey = () => 'tw_' + keyOf(me()).replace(/[^a-z0-9]/gi, '_') + '_cloud_msgs';
  let store = { msgs: [], lastAt: null };
  const seen = new Set();
  function loadStore() { try { const s = JSON.parse(localStorage.getItem(storeKey()) || 'null'); store = (s && Array.isArray(s.msgs)) ? { msgs: s.msgs, lastAt: s.lastAt || null } : { msgs: [], lastAt: null }; } catch (e) { store = { msgs: [], lastAt: null }; } }
  function saveStore() { try { localStorage.setItem(storeKey(), JSON.stringify({ msgs: store.msgs.slice(-1000), lastAt: store.lastAt })); } catch (e) {} }
  function remember(r) { seen.add(String(r.id)); store.msgs.push(r); if (!store.lastAt || String(r.created_at) > String(store.lastAt)) store.lastAt = r.created_at; }

  /* 3. contacts (the in-app chat list) */
  const SEED = {};
  try { Object.keys(MSG_CONTACTS).forEach(t => { SEED[t] = MSG_CONTACTS[t].map(c => ({ ...c, messages: c.messages.map(m => ({ ...m })) })); }); } catch (e) {}
  function restoreSeeds() { try { Object.keys(SEED).forEach(t => { MSG_CONTACTS[t] = SEED[t].map(c => ({ ...c, messages: c.messages.map(m => ({ ...m })) })); }); } catch (e) {} }
  function contactsList() { const u = me(); if (!u) return []; if (!MSG_CONTACTS[u.type]) MSG_CONTACTS[u.type] = []; return MSG_CONTACTS[u.type]; }
  function liveList() { try { return (me() && msgCurrentRole === me().type && Array.isArray(msgAllContacts)) ? msgAllContacts : null; } catch (e) { return null; } }
  function findContact(key, name) {
    const list = contactsList(); const n = String(name || '').trim().toLowerCase();
    return list.find(c => key && c.cloudKey === key) || list.find(c => n && String(c.name || '').trim().toLowerCase() === n) || null;
  }
  function ensureContact(key, name, role) {
    let c = findContact(key, name);
    if (!c) {
      c = { id: 'cloud-' + (key ? slug(key) : 'name-' + slug(name)) + '-' + Date.now().toString(36), name: name || key || 'Unknown', avatar: avatars[role] || '🏢', role: role || 'employer', jobTitle: '', unread: 0, messages: [], cloudKey: key || '' };
      contactsList().unshift(c);
      const live = liveList(); if (live && !live.includes(c)) live.unshift(c);
    } else if (key && !c.cloudKey) c.cloudKey = key;
    return c;
  }
  function addToContact(r) {
    const u = me(); const mine = r.from_key === keyOf(u);
    const otherKey = mine ? (r.to_key || '') : r.from_key;
    const otherName = mine ? (r.to_name || r.to_key) : (r.from_name || r.from_key);
    const otherRole = mine ? (r.to_role || '') : (r.from_role || '');
    const c = ensureContact(otherKey, otherName, otherRole || (u.type === 'employer' ? 'teen' : 'employer'));
    c._cloudIds = c._cloudIds || new Set();
    if (c._cloudIds.has(String(r.id))) return { c, added: false, mine };
    c._cloudIds.add(String(r.id));
    c.messages.push({ from: mine ? 'me' : 'them', text: r.text, time: fmtTime(r.created_at), encrypted: false, cloudId: r.id });
    return { c, added: true, mine };
  }
  function refreshUi() {
    try {
      if (modalOpen()) {
        const live = liveList();
        if (live) { contactsList().forEach(c => { if (!live.includes(c)) live.unshift(c); }); }
        renderMsgContactList(document.getElementById('msg-search-input')?.value || '');
        if (msgActiveContactId) renderMsgBubbles(msgActiveContactId);
      }
      updateMsgBadge();
    } catch (e) {}
  }

  /* 4. pulling messages from the cloud */
  let fetching = false;
  async function fetchNew(initial) {
    const client = sb(); const u = me();
    if (!client || !u || !isRealUser() || fetching) return;
    fetching = true;
    const k = keyOf(u), nm = String(u.name || '').trim(), since = initial ? null : store.lastAt;
    const rows = [];
    const run = async b => { if (since) b = b.gte('created_at', since); const { data, error } = await b.order('created_at', { ascending: true }).limit(300); if (error) throw error; (data || []).forEach(r => rows.push(r)); };
    try {
      await run(client.from('messages').select('*').eq('to_key', k));
      await run(client.from('messages').select('*').eq('from_key', k));
      if (nm) await run(client.from('messages').select('*').is('to_key', null).ilike('to_name', nm));
      lastError = '';
    } catch (e) { lastError = String(e && e.message || e); console.warn('Cloud messages:', lastError); fetching = false; return; }
    const byId = {}; rows.forEach(r => { if (!seen.has(String(r.id))) byId[String(r.id)] = r; });
    const fresh = Object.values(byId).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const incoming = [];
    fresh.forEach(r => { remember(r); const { c, added, mine } = addToContact(r); if (added && !mine) incoming.push(c); });
    if (fresh.length) saveStore();
    if (incoming.length) {
      const active = modalOpen() ? msgActiveContactId : null;
      const names = [];
      incoming.forEach(c => { if (c.id !== active) { c.unread = (c.unread || 0) + 1; if (!names.includes(c.name)) names.push(c.name); } });
      if (names.length) toast('💬 New message from ' + names.join(', '), 'info');
      try { window.RT?.publish?.('message-received', { from: names[0] || '' }); } catch (e) {}
    }
    if (fresh.length) refreshUi();
    fetching = false;
  }

  /* 5. sending: after the normal send (safety filter, limits), store it in the cloud */
  const dir = { at: 0, map: {} };
  async function lookupByName(name) {
    const client = sb(); const n = String(name || '').trim().toLowerCase(); if (!client || !n) return null;
    if (Date.now() - dir.at > 60000) {
      try {
        const { data } = await client.from('user_data').select('email,value').eq('key', 'account_profile').limit(2000);
        dir.map = {};
        (data || []).forEach(r => { try { const v = JSON.parse(r.value || '{}'); const key = String(v.name || '').trim().toLowerCase(); if (key) (dir.map[key] = dir.map[key] || []).push({ key: r.email, role: v.type || '' }); } catch (e) {} });
        dir.at = Date.now();
      } catch (e) {}
    }
    const hits = dir.map[n] || [];
    return hits.length === 1 ? hits[0] : null;   // several accounts with that name → deliver by name to all of them
  }
  function friendly(err) {
    const m = String(err && err.message || err || '');
    if (/does not exist|42P01|schema cache/i.test(m)) return 'the messages table is missing in Supabase (run supabase-setup.sql)';
    if (/policy|permission|42501/i.test(m)) return 'the Supabase table rules block it (re-run supabase-setup.sql)';
    if (/fetch|network|Failed to/i.test(m)) return 'no connection';
    return m || 'unknown error';
  }
  async function pushToCloud(c, m) {
    const u = me(), client = sb();
    let toKey = c.cloudKey || '', toRole = c.role || '';
    if (!toKey) { const hit = await lookupByName(c.name); if (hit) { toKey = hit.key; c.cloudKey = toKey; if (hit.role) toRole = hit.role; } }
    const row = { from_key: keyOf(u), from_name: u.name || u.email, from_role: u.type, to_key: toKey || null, to_name: c.name, to_role: toRole || null, text: m.text };
    const { data, error } = await client.from('messages').insert([row]).select();
    if (error) { lastError = String(error.message || error); console.warn('Cloud send failed:', lastError); toast('⚠️ Message kept on this device but not delivered: ' + friendly(error), 'error'); return; }
    const saved = (data && data[0]) || { ...row, id: 'local-' + Date.now(), created_at: new Date().toISOString() };
    m.cloudId = saved.id;
    c._cloudIds = c._cloudIds || new Set(); c._cloudIds.add(String(saved.id));
    remember(saved); saveStore();
  }
  const _oSend = window.sendMsg;
  window.sendMsg = async function (contactId) {
    const live = liveList() || [];
    const c = live.find(x => x.id === contactId) || contactsList().find(x => x.id === contactId);
    const before = c ? c.messages.length : 0;
    const r = _oSend ? await _oSend.apply(this, arguments) : undefined;
    try {
      if (c && isRealUser() && sb() && c.messages.length > before) {
        const m = c.messages[c.messages.length - 1];
        if (m && m.from === 'me' && !m.blocked && !m.cloudId) await pushToCloud(c, m);
      }
    } catch (e) { console.warn('Cloud send failed:', e); }
    return r;
  };
  // Real accounts with the cloud on get real replies, not the demo auto-reply
  const _oAuto = window.generateAutoReply;
  window.generateAutoReply = function () { if (isRealUser() && sb()) return null; return _oAuto ? _oAuto.apply(this, arguments) : null; };
  // The old realtime hook subscribed to tables that do not exist and toasted on our own sends; this block replaces it
  window.startRealtimeUpdates = function () {};

  /* 6. start / stop with sign-in and sign-out */
  let timer = null, channel = null, running = false;
  const onVis = () => { if (document.visibilityState === 'visible') fetchNew(false); };
  function start() {
    stop();
    if (!isRealUser() || !sb()) return;
    running = true;
    loadStore(); seen.clear();
    const u = me(); MSG_CONTACTS[u.type] = [];                 // real conversations only (demo ones come back on sign-out)
    const live = liveList(); if (live) live.length = 0;
    store.msgs.forEach(r => { seen.add(String(r.id)); addToContact(r); });
    refreshUi();
    fetchNew(!store.lastAt);
    timer = setInterval(() => { if (document.visibilityState !== 'hidden') fetchNew(false); }, REFRESH_SECONDS * 1000);
    document.addEventListener('visibilitychange', onVis);
    try { channel = sb().channel('tw-cloud-messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchNew(false)).subscribe(); } catch (e) { channel = null; }
  }
  function stop() {
    if (timer) clearInterval(timer); timer = null;
    document.removeEventListener('visibilitychange', onVis);
    try { if (channel) { sb()?.removeChannel?.(channel); channel.unsubscribe?.(); } } catch (e) {} channel = null;
    if (running) { running = false; restoreSeeds(); }
    seen.clear(); store = { msgs: [], lastAt: null };
  }
  const _oLaunch = window.launchDashboard;
  window.launchDashboard = function () { const r = _oLaunch ? _oLaunch.apply(this, arguments) : undefined; setTimeout(() => { try { start(); } catch (e) { console.warn('cloud messages start failed', e); } }, 300); return r; };
  const _oLogout = window.doLogout;
  window.doLogout = function () { try { stop(); } catch (e) {} return _oLogout ? _oLogout.apply(this, arguments) : undefined; };
  window.addEventListener('tw-supabase-ready', () => { if (!running && isRealUser()) setTimeout(start, 200); });
  window._twCloudMessages = { refresh: () => fetchNew(false), status: () => ({ connected: !!sb(), running, stored: store.msgs.length, lastError, refreshSeconds: REFRESH_SECONDS }) };

  /* 7. admin health line */
  const _oHealth = window.adminRunHealthCheck;
  window.adminRunHealthCheck = async function () {
    const r = _oHealth ? await _oHealth.apply(this, arguments) : undefined;
    try {
      const el = document.getElementById('adm-health-list'); if (!el) return r;
      let status = 'warn', note = 'Supabase not connected — messages stay on each device';
      if (sb()) {
        const { error } = await sb().from('messages').select('id').limit(1);
        if (!error) { status = 'ok'; note = 'table found · refresh every ' + REFRESH_SECONDS + 's'; }
        else { status = 'error'; note = 'table missing or blocked — run admin-account/supabase-setup.sql'; }
      }
      el.querySelector('[data-tw-cloud]')?.remove();
      const row = document.createElement('div'); row.className = 'adm-health-item'; row.setAttribute('data-tw-cloud', '1');
      row.innerHTML = '<div class="adm-health-status ' + status + '"></div><div class="adm-health-label">Cloud messaging</div><div class="adm-health-note">' + note.replace(/</g, '&lt;') + '</div>';
      el.appendChild(row);
    } catch (e) {}
    return r;
  };
})();
