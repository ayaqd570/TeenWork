
/* ═══════════════════════════════════════════════════════════════════
   v47 · CONTACTS AND PEOPLE SEARCH  (2026-10-18)
   Aya: "make it so you have all contacts and can add new ones · search all
   app users and auto add one when you apply for job and add parents".
   • Every real account keeps a contact list, saved to the account
     (user_data "contacts"), so it is the same on every device. Contacts show
     in 💬 Messages even before anyone has written.
   • Added on their own:
       teen      → the employer of every job they apply to, and their linked parent(s)
       parent    → their linked teens, and the employers of their teens' applications
       employer  → teens whose application reached them (after the parent's OK),
                   and the parent who approved it
   • ➕ Add in Messages, or typing 2+ letters in the search box, finds people
     on TeenWork by name and shows only names and roles (no email, phone or
     address). Parents and employers can't find teens in search: a teen
     becomes their contact only through a job application or a parent link.
     Tester accounts (🧪) and real accounts never see each other in search.
     Closed accounts never show.
   • A contact you added yourself can be removed while you haven't written
     to each other yet.
   • Real accounts never get the sample chats (Mike's Landscaping, Sarah
     Chen…), even when the cloud is offline. Names from other accounts are
     made inert before they reach the chat header.
   Demo logins keep the sample chats exactly as before.
   window._twContacts = { list, add, remove, sync, search, dropClosed }
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twContacts47) return;
  window.__twContacts47 = true;

  const ROLES = ['teen', 'parent', 'employer'];
  const HOW = ['manual', 'job', 'parent', 'applicant'];
  const ROLE_LABEL = { teen: 'Teen', parent: 'Parent', employer: 'Employer' };
  const AVATAR = { employer: '🏢', teen: '🧑', parent: '👪' };
  const SEED_IDS = ['mikes', 'sarah', 'hendersons', 'parent-jamie', 'alex-j', 'jamie-r', 'mikes-p', 'alex-teen'];
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const isReal = u => !!(u && !isDemoUser(u) && !u.isAdmin && ROLES.includes(u.type) && /@/.test(String(u.email || '')));
  const low = s => String(s == null ? '' : s).trim().toLowerCase();
  const own = u => (u ? String(u.dataKey || u.email || '') : '');
  const keyOf = u => low(own(u));
  const emailOf = u => low(u && u.email);
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, t) => { try { showToast(m, t || 'info'); } catch (e) {} };
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const readJSON = (k, d) => { try { const v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch (e) { return d; } };
  const parse = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; } };
  const later = (fn, ms) => setTimeout(() => { try { const r = fn(); if (r && r.catch) r.catch(e => console.warn('contacts-v47:', e)); } catch (e) { console.warn('contacts-v47:', e); } }, ms || 0);
  const cacheKey = (u, k) => 'tw_' + own(u).replace(/[^a-z0-9]/gi, '_') + '_' + k;
  // Text from other accounts ends up in the chat's HTML and onclick handlers: no tags, quotes, entities or backslashes
  const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\s]+/g, ' ').replace(/'/g, '’').replace(/"/g, '”')
    .replace(/&/g, ' and ').replace(/[<>`\\]/g, '').replace(/ {2,}/g, ' ').trim().slice(0, max || 60);
  const validKey = k => /^[^\s@'"<>`\\]+@[^\s@'"<>`\\]+\.[^\s@'"<>`\\]+(#\d{1,3})?$/.test(k) && k.length <= 160;
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); }
  function prune(arr, bad) { if (!Array.isArray(arr)) return 0; let n = 0; for (let i = arr.length - 1; i >= 0; i--) if (bad(arr[i])) { arr.splice(i, 1); n++; } return n; }
  const isTesterEmail = e => { try { return !!(typeof window._twIsTesterEmail === 'function' && window._twIsTesterEmail(e)); } catch (x) { return false; } };
  const isTesterUser = u => { try { return !!(typeof window._twIsTesterUser === 'function' && window._twIsTesterUser(u)); } catch (x) { return false; } };
  const isClosed = k => { try { return !!(window._twClosed && window._twClosed.has(k)); } catch (e) { return false; } };
  const APPS = () => { try { return typeof demoJobs !== 'undefined' ? demoJobs : []; } catch (e) { return []; } };

  /* ── cloud (user_data) ──────────────────────────────────────────── */
  async function client() {
    try { if (typeof _twCloudClient === 'function') return await _twCloudClient(3000); } catch (e) {}
    try { return (typeof sbClient !== 'undefined' && sbClient) || null; } catch (e) { return null; }
  }
  async function rows(build) {
    const c = await client(); if (!c) return null;
    try { const r = await build(c.from('user_data').select('email,key,value')); return r && !r.error ? (r.data || []) : null; } catch (e) { return null; }
  }
  async function put(email, key, value) {
    const c = await client(); if (!c || !email) return false;
    try { const r = await c.from('user_data').upsert({ email, key, value: JSON.stringify(value), updated_at: new Date().toISOString() }, { onConflict: 'email,key' }); return !(r && r.error); } catch (e) { return false; }
  }

  /* ── the contact list ───────────────────────────────────────────── */
  // item { key, name, role, job, how: manual|job|parent|applicant, at, removed }
  // On this device it lives in <account>_contacts_local; in the cloud in the user_data row "contacts".
  function normItem(x) {
    if (!x || typeof x.key !== 'string') return null;
    const key = low(x.key); if (!validKey(key)) return null;
    return { key, name: clean(x.name, 60), role: ROLES.includes(x.role) ? x.role : '', job: clean(x.job, 80), how: HOW.includes(x.how) ? x.how : 'manual', at: Number(x.at) || 0, removed: !!x.removed };
  }
  const normList = v => (v && Array.isArray(v.list) ? v.list : []).map(normItem).filter(Boolean);
  const localKey = u => cacheKey(u, 'contacts_local');
  const loadList = u => normList(readJSON(localKey(u), null));
  function merge(a, b) {
    const by = new Map();
    a.concat(b).forEach(it => {
      const cur = by.get(it.key);
      if (!cur || it.at > cur.at) by.set(it.key, Object.assign({}, it, { name: it.name || (cur && cur.name) || '', role: it.role || (cur && cur.role) || '', job: it.job || (cur && cur.job) || '' }));
      else { if (!cur.name && it.name) cur.name = it.name; if (!cur.role && it.role) cur.role = it.role; if (!cur.job && it.job) cur.job = it.job; }
    });
    return [...by.values()].sort((x, y) => x.at - y.at);
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function saveList(u, list, push) {
    const v = { list: list.slice(-500), updatedAt: Date.now() };
    lsSet(localKey(u), JSON.stringify(v));
    if (push === false) return;
    lsSet(cacheKey(u, 'contacts_unsent'), '1');
    put(own(u), 'contacts', v).then(ok => { if (ok) lsSet(cacheKey(u, 'contacts_unsent'), null); });
  }
  const current = u => loadList(u).filter(it => !it.removed && !isClosed(it.key) && it.key !== keyOf(u));

  // Adds or refreshes contacts. Auto-added ones (job, parent, applicant) always come back.
  function upsert(u, items) {
    if (!isReal(u)) return false;
    const list = loadList(u), mine = keyOf(u), mail = emailOf(u);
    let changed = false;
    items.forEach(raw => {
      const it = normItem(Object.assign({ at: Date.now() }, raw));
      if (!it || it.key === mine || (it.key === mail && !String(mine).includes('#')) || isClosed(it.key)) return;
      const cur = list.find(x => x.key === it.key);
      if (!cur) { list.push(it); changed = true; return; }
      const next = Object.assign({}, cur);
      if (cur.removed) { next.removed = false; next.how = it.how; }
      else if (cur.how === 'manual' && it.how !== 'manual') next.how = it.how;
      if (it.name && it.name !== cur.name) next.name = it.name;
      if (it.role && it.role !== cur.role) next.role = it.role;
      if (it.job && it.job !== cur.job && (!cur.job || raw.fresh)) next.job = it.job;   // a new application names its job; syncs never flip between jobs
      if (!same(next, cur)) { next.at = Date.now(); Object.assign(cur, next); changed = true; }
    });
    if (changed) { saveList(u, list); showInChat(u); }
    return changed;
  }
  function removeContact(u, key) {
    if (!isReal(u)) return false;
    key = low(key);
    const list = loadList(u), cur = list.find(x => x.key === key);
    if (!cur || cur.removed || cur.how !== 'manual') return false;
    cur.removed = true; cur.at = Date.now();
    saveList(u, list);
    chatLists(u).forEach(l => prune(l, c => c && c._tw47c && low(c.cloudKey) === key && !(c.messages || []).length));
    refreshChat();
    return true;
  }

  /* ── people on TeenWork (the account_profile rows) ───────────────── */
  const DIR = { at: 0, list: [], p: null, miss: '' };
  function loadDir(force) {
    if (!force && DIR.at && Date.now() - DIR.at < 60000) return Promise.resolve(DIR.list);
    if (DIR.p) return DIR.p;
    DIR.p = (async () => {
      const got = await rows(q => q.eq('key', 'account_profile').limit(5000));
      if (got) {
        DIR.list = got.map(r => {
          const v = parse(r.value) || {}, key = low(r.email);
          return { key, name: clean(v.name, 60), role: ROLES.includes(v.type) ? v.type : '', deleted: !!v.deleted, test: isTesterEmail(key.split('#')[0]) };
        }).filter(p => validKey(p.key) && p.role && p.name && !p.deleted);
        DIR.at = Date.now();
      }
      return DIR.list;
    })();
    DIR.p.then(() => { DIR.p = null; }, () => { DIR.p = null; });
    return DIR.p;
  }
  const dirGet = key => DIR.list.find(p => p.key === key) || null;
  // who may find whom: never yourself or a closed account; testers and real accounts stay apart;
  // parents and employers only meet teens through a job or a parent link
  function findable(u, p) {
    if (!p || p.key === keyOf(u) || isClosed(p.key)) return false;
    if (!!p.test !== isTesterUser(u)) return false;
    if (u.type !== 'teen' && p.role === 'teen') return false;
    return true;
  }
  async function search(text) {
    const u = me(), q = low(text); if (!isReal(u) || q.length < 2) return [];
    await loadDir();
    return DIR.list.filter(p => findable(u, p) && low(p.name).includes(q)).slice(0, 20).map(p => ({ key: p.key, name: p.name, role: p.role }));
  }

  /* ── contacts in 💬 Messages ────────────────────────────────────── */
  let SEEDS = null, stripped = false;
  try { SEEDS = {}; Object.keys(MSG_CONTACTS).forEach(t => { SEEDS[t] = MSG_CONTACTS[t].map(c => Object.assign({}, c, { messages: (c.messages || []).map(m => Object.assign({}, m)) })); }); } catch (e) { SEEDS = null; }
  function chatLists(u) {
    const out = [];
    try { if (!Array.isArray(MSG_CONTACTS[u.type])) MSG_CONTACTS[u.type] = []; out.push(MSG_CONTACTS[u.type]); } catch (e) {}
    try { if (msgCurrentRole === u.type && Array.isArray(msgAllContacts) && !out.includes(msgAllContacts)) out.push(msgAllContacts); } catch (e) {}
    return out;
  }
  const modalOpen = () => !!($('msgModal') && $('msgModal').classList.contains('open'));
  function refreshChat() {
    try {
      if (modalOpen()) {
        try { if (typeof msgActiveContactId !== 'undefined' && msgActiveContactId && !(msgAllContacts || []).some(c => c.id === msgActiveContactId)) msgActiveContactId = null; } catch (e) {}
        renderMsgContactList(($('msg-search-input') || {}).value || '');
      }
      updateMsgBadge();
    } catch (e) {}
  }
  function showInChat(u) {
    if (!isReal(u) || me() !== u) return false;
    const lists = chatLists(u); if (!lists.length) return false;
    let changed = false;
    // the sample conversations never belong to a real account
    lists.forEach(l => { if (prune(l, c => c && SEED_IDS.includes(c.id) && !c.cloudKey)) { changed = true; stripped = true; } });
    const want = current(u);
    want.forEach(it => {
      let c = null;
      for (const l of lists) { c = l.find(x => x && x.cloudKey && low(x.cloudKey) === it.key); if (c) break; }
      if (!c && it.name) for (const l of lists) { c = l.find(x => x && !x.cloudKey && low(x.name) === low(it.name)); if (c) break; }
      if (!c) {
        c = { id: 'ct-' + slug(it.key) + '-' + hash(it.key), name: it.name || 'TeenWork member', avatar: AVATAR[it.role] || '👤', role: it.role || 'employer', jobTitle: it.job || '', unread: 0, messages: [], cloudKey: it.key, _tw47c: true };
        changed = true;
      } else {
        if (!c.cloudKey) { c.cloudKey = it.key; changed = true; }
        if (!c.jobTitle && it.job) { c.jobTitle = it.job; changed = true; }
        if (c._tw47c && it.name && c.name !== it.name) { c.name = it.name; changed = true; }
      }
      lists.forEach(l => { if (!l.includes(c)) { l.push(c); changed = true; } });
    });
    // contacts that were removed or closed: drop our empty chat entries
    lists.forEach(l => { if (prune(l, c => c && c._tw47c && !(c.messages || []).length && !want.some(it => it.key === low(c.cloudKey)))) changed = true; });
    if (changed) refreshChat();
    return changed;
  }

  // The base chat header writes the contact's name and job as HTML; names from other accounts are made inert first
  const _oOpenChat = window.openMsgChat;
  if (typeof _oOpenChat === 'function') window.openMsgChat = function (id) {
    const u = me();
    let c = null;
    try { c = (msgAllContacts || []).find(x => x && x.id === id) || null; } catch (e) {}
    if (c && isReal(u)) {
      if (/[<>&"'`\\]/.test(String(c.name || ''))) c.name = clean(c.name, 60) || 'TeenWork member';
      if (/[<>&"'`\\]/.test(String(c.jobTitle || ''))) c.jobTitle = clean(c.jobTitle, 80);
    }
    const r = _oOpenChat.apply(this, arguments);
    try { if (c && isReal(u)) chatHeader(u, c); } catch (e) {}
    return r;
  };
  function chatHeader(u, c) {
    const info = document.querySelector('#msg-main-area .msg-header-info'); if (!info) return;
    const it = c.cloudKey ? loadList(u).find(x => x.key === low(c.cloudKey) && !x.removed) : null;
    const old = info.querySelector('.tw47c-remove'); if (old) old.remove();
    if (!it || it.how !== 'manual' || (c.messages || []).length) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tw47c-remove'; b.textContent = 'Remove from contacts';
    b.setAttribute('data-tw47c-remove', it.key);
    info.appendChild(b);
  }

  /* ── search inside 💬 Messages ───────────────────────────────────── */
  const _oRender = window.renderMsgContactList;
  if (typeof _oRender === 'function') window.renderMsgContactList = function (filter) {
    const r = _oRender.apply(this, arguments);
    try { people(String(filter || '')); } catch (e) {}
    return r;
  };
  function inChat(u) { const s = new Set(); chatLists(u).forEach(l => l.forEach(c => { if (c && c.cloudKey) s.add(low(c.cloudKey)); })); return s; }
  function people(filter) {
    const u = me(), box = $('msg-contacts-list'); if (!box) return;
    const old = box.querySelector('.tw47c-people'); if (old) old.remove();
    if (!isReal(u)) return;
    const q = low(filter);
    const sec = document.createElement('div'); sec.className = 'tw47c-people';
    if (q.length < 2) {
      if (!q && !current(u).length && !box.querySelector('.msg-contact')) {
        sec.innerHTML = '<p class="tw47c-empty">No contacts yet. ' + (u.type === 'teen' ? 'Employers you apply to and your linked parent are added here on their own.' : u.type === 'parent' ? 'Your linked teens and their employers are added here on their own.' : 'Teens who apply to your jobs are added here once their parent says OK.') + ' Type a name above to find people on TeenWork.</p>';
        box.appendChild(sec);
      }
      return;
    }
    if (!DIR.at) {
      sec.innerHTML = '<div class="tw47c-h">People on TeenWork</div><p class="tw47c-empty">Searching…</p>';
      box.appendChild(sec);
      loadDir().then(() => { if (low(($('msg-search-input') || {}).value) === q && DIR.at) renderMsgContactList(($('msg-search-input') || {}).value); });
      return;
    }
    const have = inChat(u);
    const hits = DIR.list.filter(p => findable(u, p) && !have.has(p.key) && low(p.name).includes(q)).slice(0, 8);
    // someone who just signed up isn't in a list loaded a minute ago: look again once for a search with no match
    const again = Date.now() - DIR.at > 60000 || (!hits.length && Date.now() - DIR.at > 5000 && DIR.miss !== q);
    if (again) { DIR.miss = q; loadDir(true).then(() => { if (low(($('msg-search-input') || {}).value) === q) renderMsgContactList(($('msg-search-input') || {}).value); }); }
    sec.innerHTML = '<div class="tw47c-h">People on TeenWork</div>' + (hits.length
      ? hits.map(p => '<div class="tw47c-person"><div class="msg-contact-avatar ' + (p.role === 'teen' ? '' : esc(p.role)) + '">' + (AVATAR[p.role] || '👤') + '</div>' +
          '<div class="msg-contact-info"><div class="msg-contact-name">' + esc(p.name) + '</div><div class="msg-contact-preview">' + esc(ROLE_LABEL[p.role] || '') + '</div></div>' +
          '<button type="button" class="tw47c-add" data-tw47c-add="' + esc(p.key) + '">➕ Add</button></div>').join('')
      : '<p class="tw47c-empty">No one else on TeenWork matches “' + esc(filter.trim().slice(0, 40)) + '”.' + (u.type !== 'teen' ? ' Teens show up as contacts once they apply to your job or link to you as their parent.' : '') + '</p>');
    box.appendChild(sec);
  }
  function addFromSearch(key) {
    const u = me(); if (!isReal(u)) return;
    const p = dirGet(low(key));
    if (!p || !findable(u, p)) { toast('That person can\'t be added.', 'error'); return; }
    upsert(u, [{ key: p.key, name: p.name, role: p.role, how: 'manual' }]);
    showInChat(u);
    const inp = $('msg-search-input'); if (inp) inp.value = '';
    let c = null; chatLists(u).some(l => (c = l.find(x => x && low(x.cloudKey) === p.key)));
    renderMsgContactList('');
    if (c) { try { openMsgChat(c.id); } catch (e) {} }
    toast('➕ ' + p.name + ' was added to your contacts.', 'success');
  }
  function headButton() {
    const h = document.querySelector('#msgModal .msg-sidebar-head h3'); if (!h) return;
    let b = $('tw47c-addbtn');
    if (!isReal(me())) { if (b) b.style.display = 'none'; return; }
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'tw47c-addbtn'; b.title = 'Find people on TeenWork and add them'; b.textContent = '➕ Add'; h.classList.add('tw47c-h3'); h.appendChild(b); }
    b.style.display = '';
    const inp = $('msg-search-input'); if (inp) inp.placeholder = 'Search contacts or find people…';
  }
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-tw47c-add]');
    if (add) { e.preventDefault(); e.stopPropagation(); addFromSearch(add.getAttribute('data-tw47c-add')); return; }
    const rm = e.target.closest('[data-tw47c-remove]');
    if (rm) {
      e.preventDefault();
      if (removeContact(me(), rm.getAttribute('data-tw47c-remove'))) {
        const area = $('msg-main-area'); if (area) area.innerHTML = '<div class="tw47c-gone">Removed from your contacts.</div>';
        toast('Removed from your contacts.', 'info');
      }
      return;
    }
    if (e.target.closest('#tw47c-addbtn')) {
      const inp = $('msg-search-input'); if (!inp) return;
      inp.focus();
      if (low(inp.value).length < 2) toast('Type a name to find people on TeenWork.', 'info');
    }
  });

  const _oOpen = window.openMsgModal;
  if (typeof _oOpen === 'function') window.openMsgModal = function () {
    const u = me();
    if (isReal(u)) { try { showInChat(u); } catch (e) {} }
    const r = _oOpen.apply(this, arguments);
    try { headButton(); } catch (e) {}
    if (isReal(u)) { later(() => showInChat(u), 0); later(() => sync(u), 50); loadDir(); }
    return r;
  };

  /* ── added on their own ─────────────────────────────────────────── */
  function teenLink(u) {
    const l = readJSON('tw_parent_links', {})[emailOf(u)];
    return (l && l.status) ? l : readJSON(cacheKey(u, 'parent_link'), null) || u.parentLinked || null;
  }
  function linkedTeens() { try { return (window._twRealData && window._twRealData.linkedTeens()) || []; } catch (e) { return []; } }
  function myJobIds() { try { return ((window._twJobBoard && window._twJobBoard.myJobs()) || []).map(j => j && j.id).filter(id => typeof id === 'number' && isFinite(id)); } catch (e) { return []; } }
  const appJob = v => (v && v.job) || {};
  let syncing = false, lastSync = 0;
  async function sync(u, force) {
    u = u || me();
    if (!isReal(u) || syncing || (!force && Date.now() - lastSync < 20000)) return;
    syncing = true; lastSync = Date.now();
    try {
      const found = [];
      const [cloud] = await Promise.all([rows(q => q.eq('email', own(u)).eq('key', 'contacts')), loadDir()]);
      if (me() !== u) return;
      // the copy saved from other devices
      if (cloud) {
        const local = loadList(u), cl = cloud[0] ? normList(parse(cloud[0].value)) : [];
        const merged = merge(local, cl);
        if (!same(merged, local)) saveList(u, merged, false);
        if (!same(merged, cl) || lsGet(cacheKey(u, 'contacts_unsent'))) saveList(u, merged);
      }
      if (u.type === 'teen') {
        const l = teenLink(u);
        if (l && l.status === 'approved') {
          const main = low(l.parentEmail);
          [...new Set([main].concat(Array.isArray(l.parents) ? l.parents.map(low) : []))].filter(Boolean)
            .forEach(e => found.push({ key: e, name: e === main ? l.parentName : '', role: 'parent', how: 'parent' }));
        }
        const apps = await rows(q => q.eq('email', own(u)).like('key', 'job_app:%'));
        (apps || []).forEach(r => { const v = parse(r.value) || {}; if (v.employerKey) found.push({ key: v.employerKey, name: appJob(v).employer, role: 'employer', job: appJob(v).title, how: 'job' }); });
        APPS().forEach(j => { if (j && j._jb && j.employerKey) found.push({ key: j.employerKey, name: j.employer, role: 'employer', job: j.title, how: 'job' }); });
      } else if (u.type === 'parent') {
        const teens = linkedTeens().filter(t => t && t.key);
        teens.forEach(t => found.push({ key: t.key, name: t.name, role: 'teen', how: 'parent' }));
        if (teens.length) {
          const apps = await rows(q => q.in('email', teens.map(t => t.key)).like('key', 'job_app:%'));
          (apps || []).forEach(r => { const v = parse(r.value) || {}; if (v.employerKey) found.push({ key: v.employerKey, name: appJob(v).employer, role: 'employer', job: appJob(v).title, how: 'job' }); });
        }
      } else if (u.type === 'employer') {
        const ids = myJobIds();
        if (ids.length) {
          const apps = await rows(q => q.in('key', ids.map(id => 'job_app:' + id)));
          (apps || []).forEach(r => {
            const v = parse(r.value) || {};
            if (low(v.employerKey) !== keyOf(u) || !['applied', 'hired', 'passed'].includes(v.status)) return;   // only after the parent's OK
            found.push({ key: r.email, name: v.teenName, role: 'teen', job: appJob(v).title, how: 'applicant' });
            if (v.parentEmail) found.push({ key: v.parentEmail, name: v.parentName, role: 'parent', job: appJob(v).title, how: 'applicant' });
          });
        }
      }
      if (me() !== u) return;
      // the name each person uses now, when TeenWork knows it
      found.forEach(f => { const p = dirGet(low(f.key)); if (p && p.name) f.name = p.name; if (p && p.role && !f.role) f.role = p.role; });
      upsert(u, found);
      showInChat(u);
    } finally { syncing = false; }
  }

  // Applying adds the employer right away
  ['teenApply', 'applyToJob'].forEach(n => {
    const o = window[n]; if (typeof o !== 'function') return;
    window[n] = function () {
      const u = me(), apps = APPS(), before = apps.slice();
      const r = o.apply(this, arguments);
      const after = () => {
        if (!isReal(u) || u.type !== 'teen' || me() !== u) return;
        const items = apps.filter(j => before.indexOf(j) < 0 && j && j.employerKey).map(j => ({ key: j.employerKey, name: (dirGet(low(j.employerKey)) || {}).name || j.employer, role: 'employer', job: j.title, how: 'job', fresh: true }));
        if (items.length) upsert(u, items);
      };
      try { if (r && typeof r.then === 'function') r.then(after, () => {}); else after(); } catch (e) {}
      return r;
    };
  });
  // A parent link adds the parent (teen side) or the teen (parent side) as soon as this device sees it
  ['twCheckApproval', 'checkParentLinkApproval'].forEach(n => {
    const o = window[n]; if (typeof o !== 'function') return;
    window[n] = function () {
      const r = o.apply(this, arguments);
      const u = me(); if (isReal(u)) { const go = () => later(() => sync(u, true), 300); if (r && typeof r.then === 'function') r.then(go, go); else go(); }
      return r;
    };
  });

  /* ── closed accounts (called by the accounts block) ──────────────── */
  function dropClosed(u, note) {
    if (!isReal(u) || me() !== u) return;
    const list = loadList(u), gone = list.filter(it => isClosed(it.key));
    if (!gone.length) return;
    gone.forEach(it => { if (!it.removed && typeof note === 'function') { try { note(it.key, it.name, it.role, it.job); } catch (e) {} } });
    saveList(u, list.filter(it => !isClosed(it.key)));
    showInChat(u);
  }

  /* ── wiring ──────────────────────────────────────────────────────── */
  const _oLaunch = window.launchDashboard;
  if (typeof _oLaunch === 'function') window.launchDashboard = function () {
    const r = _oLaunch.apply(this, arguments);
    const u = me();
    if (isReal(u)) {
      // the cloud chat block starts 300 ms after sign-in and clears the chat list, so contacts go back in after it
      [900, 3000].forEach(ms => later(() => { if (me() === u) showInChat(u); }, ms));
      later(() => { if (me() === u) return sync(u, true); }, 2600);
    }
    later(headButton, 0);
    return r;
  };
  window.addEventListener('tw-supabase-ready', () => { const u = me(); if (isReal(u)) { later(() => { if (me() === u) showInChat(u); }, 800); later(() => { if (me() === u) return sync(u, true); }, 1500); } });
  const _oLogout = window.doLogout;
  if (typeof _oLogout === 'function') window.doLogout = function () {
    const r = _oLogout.apply(this, arguments);
    DIR.at = 0; DIR.list = []; lastSync = 0;
    // demo logins get the sample chats back if a real account emptied them
    if (stripped && SEEDS) { try { Object.keys(SEEDS).forEach(t => { if (!(MSG_CONTACTS[t] || []).some(c => c && SEED_IDS.includes(c.id))) MSG_CONTACTS[t] = SEEDS[t].map(c => Object.assign({}, c, { messages: c.messages.map(m => Object.assign({}, m)) })); }); } catch (e) {} stripped = false; }
    try { const b = $('tw47c-addbtn'); if (b) b.style.display = 'none'; } catch (e) {}
    return r;
  };
  setInterval(() => { const u = me(); if (isReal(u) && document.visibilityState !== 'hidden') { showInChat(u); sync(u); } }, 60000);

  /* ── styles ──────────────────────────────────────────────────────── */
  const css = document.createElement('style'); css.id = 'contacts-v47-css';
  css.textContent =
    '.msg-sidebar-head h3.tw47c-h3{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '#tw47c-addbtn{font-family:inherit;font-size:.72rem;font-weight:700;border:1.5px solid var(--green,#2d6a4f);color:var(--green,#2d6a4f);background:var(--card,#fff);border-radius:999px;padding:3px 10px;cursor:pointer;line-height:1.4}' +
    '#tw47c-addbtn:hover{background:var(--green,#2d6a4f);color:#fff}' +
    '.tw47c-people{border-top:1px solid var(--border,#e5e5e5)}' +
    '.tw47c-h{font-size:.68rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#667);padding:.7rem 1rem .3rem}' +
    '.tw47c-person{display:flex;align-items:center;gap:10px;padding:8px 1rem;border-bottom:1px solid var(--border,#eee)}' +
    '.tw47c-person .msg-contact-info{flex:1;min-width:0}' +
    '.tw47c-add{flex-shrink:0;font-family:inherit;font-size:.72rem;font-weight:700;border:none;background:var(--green,#2d6a4f);color:#fff;border-radius:8px;padding:5px 9px;cursor:pointer}' +
    '.tw47c-empty{padding:.6rem 1rem 1rem;font-size:.78rem;color:var(--muted,#667);line-height:1.5;margin:0}' +
    '.tw47c-remove{display:inline-block;margin-top:3px;font-family:inherit;font-size:.68rem;border:none;background:none;color:var(--muted,#667);text-decoration:underline;cursor:pointer;padding:0}' +
    '.tw47c-gone{display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted,#667);font-size:.9rem;padding:2rem}';
  document.head.appendChild(css);

  window._twContacts = {
    list: () => { const u = me(); return isReal(u) ? current(u).map(it => Object.assign({}, it)) : []; },
    add: (key, how) => { const u = me(), p = dirGet(low(key)); return !!(p && findable(u, p) && upsert(u, [{ key: p.key, name: p.name, role: p.role, how: how || 'manual' }])); },
    remove: key => removeContact(me(), key),
    sync: () => sync(me(), true),
    search, dropClosed, showInChat: () => showInChat(me()), loadDir,
  };
})();
