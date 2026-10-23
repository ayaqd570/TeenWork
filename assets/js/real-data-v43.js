
/* ═══════════════════════════════════════════════════════════════════
   v43 · REAL DATA ONLY FOR REAL ACCOUNTS  (2026-10-15, Aya's request)
   "There's still demo data in real accounts … don't show any fake data."
   "Parent account forgot that I linked a second teen and said I was
    linked to a fake account."
   Real teen, parent and employer accounts now see only their own data.
   Demo logins (*@teenwork.demo) keep every sample exactly as before.
   • Sample jobs, applications, applicants (Alex Johnson, Jamie Rivera,
     Sam Park) and parent notifications are removed for real accounts.
     The old v24 clean-up never ran: it emptied window.demoJobs, but the
     sample lists are not window properties.
   • Teen: profile card (age, town, skills, rating line), skills box,
     address, job and application counts, calendar totals, leaderboard,
     success stories and the Verification page use the teen's own data
     or say plainly that there's nothing yet. Skills are saved to the
     account (user_data "skills"); the home address stays on the device.
   • Parent ↔ teen links are saved per account in the cloud (user_data),
     so they show on every device and a teen's code works anywhere:
       <teen>/parent_link            status, who approved, parents[]
       <teen>/link_code              the teen's code, e.g. TEEN-K7M2QX
       <teen>/code:<CODE>            lookup row for "Link another teen"
       <parent>/linked_teens         { teens:[…], updatedAt }
       <parent email>/link_request:<teen>   a teen's link request
     Codes are now 6 characters. A code that isn't found never adds a
     placeholder teen, and the sample "Alex Johnson" teen never appears
     on a real parent account. Teens a parent linked on this device
     before v43 are kept (only ones whose saved link names this parent).
   • Parent: header, overview stats, teen card, My Teens (with Unlink),
     weekly summary, AI digest and data export use the linked teens only;
     the AI is never asked to make up a week.
   • Employer: business name and city from sign-up, profile edits saved
     to the account (user_data "emp_profile"), no sample reviews, rating,
     analytics, schedule row or worker "Alex". Paid background checks say
     "coming soon" instead of pretending to charge and pass.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twRealData43) return;
  window.__twRealData43 = true;

  const ROLES = ['teen', 'parent', 'employer'];
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const isReal = u => !!(u && !isDemoUser(u) && !u.isAdmin && ROLES.includes(u.type) && /@/.test(String(u.email || '')));
  const realAs = type => { const u = me(); return isReal(u) && u.type === type ? u : null; };
  const emailOf = u => String((u && u.email) || '').trim().toLowerCase();
  const rowKeyOf = u => (u ? String(u.dataKey || u.email || '') : '');          // the user_data "email" column _DB uses
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const readJSON = (k, d) => { try { const v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch (e) { return d; } };
  const parse = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; } };
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
  const toast = (m, t) => { try { showToast(m, t || 'success'); } catch (e) {} };
  const later = (fn, ms) => setTimeout(() => { try { const r = fn(); if (r && r.catch) r.catch(e => console.warn('real-data:', e)); } catch (e) { console.warn('real-data:', e); } }, ms || 0);
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  function ageFrom(dob) {
    if (!dob) return 0; const b = new Date(/^\d{4}-\d\d-\d\d$/.test(dob) ? dob + 'T00:00' : dob), t = new Date(); if (isNaN(b)) return 0;
    let a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    return a > 0 && a < 120 ? a : 0;
  }
  const placeOf = o => [o && o.city, o && o.state].filter(Boolean).join(', ');
  const EMPTY = (icon, title, text) => `<div data-tw-empty="1" style="text-align:center;padding:1.6rem 1rem;color:var(--muted)"><div style="font-size:2rem;margin-bottom:.5rem">${icon}</div><div style="font-weight:700;font-size:.95rem;color:var(--text);margin-bottom:.3rem">${title}</div><div style="font-size:.84rem;line-height:1.55">${text}</div></div>`;

  // Change a label, block or field for real accounts; demo logins get the original back.
  const ORIG = new WeakMap();
  const orig = (el, kind, read) => { let o = ORIG.get(el); if (!o) { o = {}; ORIG.set(el, o); } if (!(kind in o)) o[kind] = read(); return o[kind]; };
  function realText(el, real, text) { if (!el) return; const o = orig(el, 'text', () => el.textContent); const next = real ? text : o; if (el.textContent !== next) el.textContent = next; }
  function realHTML(el, real, html) {
    if (!el) return;
    const o = orig(el, 'html', () => el.innerHTML), next = real ? html : o;
    if (el._twSet === next && el._twSeen === el.innerHTML) return;
    el.innerHTML = next; el._twSet = next; el._twSeen = el.innerHTML;
  }
  function realHide(el, hide) { if (!el) return; if (hide) { el.dataset.twHidden = '1'; el.style.display = 'none'; } else if (el.dataset.twHidden) { delete el.dataset.twHidden; el.style.display = ''; } }
  function realVal(el, real, v) { if (!el || el === document.activeElement) return; const o = orig(el, 'val', () => el.getAttribute('value') || ''); el.value = real ? v : o; }
  function realSel(el, real, v) {
    if (!el || el === document.activeElement) return;
    const o = orig(el, 'sel', () => el.value);
    if (!real) { el.value = o; return; }
    const want = String(v || '').trim().toLowerCase(); if (!want) return;
    const opt = [...el.options].find(x => x.value.toLowerCase() === want || x.textContent.trim().toLowerCase() === want);
    if (opt) el.value = opt.value;
  }
  function realAttr(el, real, name, v) { if (!el) return; const o = orig(el, 'attr:' + name, () => el.getAttribute(name)); const next = real ? v : o; if (next == null) el.removeAttribute(name); else el.setAttribute(name, next); }

  /* ── cloud (user_data) ──────────────────────────────────────────── */
  async function client() {
    try { if (typeof _twCloudClient === 'function') return await _twCloudClient(3000); } catch (e) {}
    try { return (typeof sbClient !== 'undefined' && sbClient) || null; } catch (e) { return null; }
  }
  // rows(q => q.eq(...)) → array of {email,key,value} or null when offline / failed
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
  const cacheKey = (u, key) => 'tw_' + rowKeyOf(u).replace(/[^a-z0-9]/gi, '_') + '_' + key;   // where _DB keeps its copy of a row
  const cacheGet = (u, key, d) => readJSON(cacheKey(u, key), d);
  const cacheSet = (u, key, v) => lsSet(cacheKey(u, key), JSON.stringify(v));
  const saveMine = (u, key, v) => { cacheSet(u, key, v); return put(rowKeyOf(u), key, v); };

  /* ── 1. Sample lists: demo logins only ──────────────────────────── */
  const SAMPLE_APPLICANTS = (typeof demoApplicants !== 'undefined') ? JSON.parse(JSON.stringify(demoApplicants)) : [];
  const SAMPLE_PEOPLE = new Set(SAMPLE_APPLICANTS.map(a => a.name));
  const SAMPLE_TITLES = ['Lawn Mowing & Yard Cleanup', 'Dog Walking (3 dogs)', 'House Cleaning Assistant', 'Babysitting (2 kids, ages 5 & 7)',
    'Snow Shoveling Route', 'Moving Help (Light Boxes)', 'Garden Weeding & Planting', 'Pet Sitting (Cat + Rabbit)', 'Car Washing & Detailing',
    'Grocery Run & Errand Help', 'Leaf Raking & Yard Cleanup', 'Dog Walker (Golden Retriever)'];
  const SAMPLE_EMPLOYERS = /Mike's Landscaping|Sarah Chen|The Hendersons|Martinez Family|Maple Street Neighbors|Johnson Moving|Green Thumb Gardens|Davis Household|Riverside Auto|Peterson Household|Thompson Property|Kim & Chris Park/;
  const SAMPLE_NOTIF = /^(Alex applied to '|New AI job match: Snow Shoveling in Burlington|The Hendersons accepted Alex's application|New 5-star rating received from Mike's Landscaping)/;
  const DEMO_SKILLS = 'lawn care,pet sitting,snow shoveling,cleaning';
  const isSampleJob = j => !!j && typeof j.id === 'number' && j.id >= 1 && j.id <= 12;
  function isSampleNotif(n) {
    const t = String((n && n.text) || '');
    if (SAMPLE_NOTIF.test(t) || (n && isSampleJob({ id: n.jobId }))) return true;
    if ([...SAMPLE_PEOPLE].some(p => t.indexOf(p + ' was hired') === 0)) return true;
    return /\bAlex\b/.test(t) && SAMPLE_TITLES.some(x => t.indexOf(x) >= 0);
  }
  function prune(arr, bad) { if (!Array.isArray(arr)) return; for (let i = arr.length - 1; i >= 0; i--) if (bad(arr[i])) arr.splice(i, 1); }
  function useSamplesFor(u) {
    if (isReal(u)) {
      try { prune(demoJobs, isSampleJob); } catch (e) {}
      try { prune(browsableJobs, isSampleJob); } catch (e) {}
      try { prune(demoApplicants, a => a && SAMPLE_PEOPLE.has(a.name)); } catch (e) {}
      try { prune(demoNotifs, isSampleNotif); } catch (e) {}
    } else if (u) {
      // the demo login re-seeds jobs and notifications itself, but not the sample applicants
      try { if (!demoApplicants.some(a => a && SAMPLE_PEOPLE.has(a.name))) SAMPLE_APPLICANTS.forEach(a => demoApplicants.push(JSON.parse(JSON.stringify(a)))); } catch (e) {}
    }
  }

  // Messages the app writes with the sample teen's name in them ("Alex wants to apply…")
  function subjectName() {
    const u = me(); if (!u) return 'your teen';
    if (u.type === 'teen') return firstName(u.name) || 'your teen';
    if (u.type === 'parent') return pTeens.length === 1 ? (firstName(pTeens[0].name) || 'your teen') : 'your teen';
    return 'your worker';
  }
  const NAME_FIXES = [
    [/\bAlex(?='s (application|account|work)\b)/g, n => n],
    [/\bAlex(?= (wants to apply|tried to |hit the |is hired))/g, n => n],
    [/\b(allowed|blocked) for Alex\b/g, (n, m, w) => w + ' for ' + n],
  ];
  function fixNames(s) {
    const u = me();
    if (!isReal(u) || typeof s !== 'string' || s.indexOf('Alex') < 0) return s;
    const n = subjectName();
    let out = s;
    NAME_FIXES.forEach(([re, rep]) => { out = out.replace(re, (m, a) => rep(n, m, a)); });
    return out.indexOf('your ') === 0 ? 'Y' + out.slice(1) : out;
  }
  try {
    if (typeof demoNotifs !== 'undefined' && Array.isArray(demoNotifs) && !Object.prototype.hasOwnProperty.call(demoNotifs, 'unshift')) {
      Object.defineProperty(demoNotifs, 'unshift', { configurable: true, writable: true, value: function () {
        for (const n of arguments) if (n && typeof n.text === 'string') n.text = fixNames(n.text);
        return Array.prototype.unshift.apply(this, arguments);
      } });
    }
  } catch (e) {}
  const _oToast = window.showToast;
  if (typeof _oToast === 'function') window.showToast = function (msg) { const a = [].slice.call(arguments); a[0] = fixNames(a[0]); return _oToast.apply(this, a); };
  const _oPush = window.sendPushNotif;
  if (typeof _oPush === 'function') window.sendPushNotif = function (title, body) { const a = [].slice.call(arguments); a[0] = fixNames(a[0]); a[1] = fixNames(a[1]); return _oPush.apply(this, a); };
  // practice auto-replies from the sample employers are for demo logins only
  const _oAuto = window.generateAutoReply;
  window.generateAutoReply = function () { if (isReal(me())) return null; return typeof _oAuto === 'function' ? _oAuto.apply(this, arguments) : null; };

  /* ── 2. Parent ↔ teen links ─────────────────────────────────────── */
  const LS_LINKS = 'tw_parent_links', LS_REQ = 'tw_link_requests', LS_CODES = 'tw_teen_codes';
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const STRONG = /^TEEN-[A-HJ-NP-Z2-9]{6}$/;
  function newCode() {
    const a = new Uint32Array(6);
    try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 6; i++) a[i] = Math.floor(Math.random() * 4294967295); }
    let s = ''; for (let i = 0; i < 6; i++) s += CODE_CHARS[a[i] % CODE_CHARS.length];
    return 'TEEN-' + s;
  }
  function normCode(c) { c = String(c || '').toUpperCase().replace(/[\s_]+/g, ''); if (c && c.indexOf('TEEN-') !== 0) c = 'TEEN-' + c.replace(/^TEEN-?/, ''); return c; }
  const localLink = em => readJSON(LS_LINKS, {})[em] || null;
  function setLocalLink(em, data) { const m = readJSON(LS_LINKS, {}); if (data) m[em] = data; else delete m[em]; lsSet(LS_LINKS, JSON.stringify(m)); }
  const localCode = em => readJSON(LS_CODES, {})[em] || '';
  function setLocalCode(em, code) { const m = readJSON(LS_CODES, {}); m[em] = code; lsSet(LS_CODES, JSON.stringify(m)); }
  const dirtyKey = em => 'tw_link_unsent_' + em;          // a request this device couldn't send yet
  const sameLink = (a, b) => !!a && !!b && ['status', 'parentEmail', 'requestedAt', 'approvedAt', 'declinedAt', 'unlinkedAt'].every(k => String(a[k] || '') === String(b[k] || ''));
  const teenStatus = u => ((localLink(emailOf(u)) || u.parentLinked || {}).status) || 'none';
  function showCode(code) { document.querySelectorAll('.tw35-code b').forEach(b => { if (b.textContent !== code) b.textContent = code; }); }

  /* teen side */
  function applyTeenLink(u, link) {
    setLocalLink(emailOf(u), link); u.parentLinked = link;
    try { if (typeof currentUser !== 'undefined' && currentUser && currentUser !== u && emailOf(currentUser) === emailOf(u)) currentUser.parentLinked = link; } catch (e) {}
    const lock = $('parent-lock-overlay');
    if (lock && link && link.status) { lock.remove(); try { launchDashboard(); } catch (e) {} }
  }
  async function putTeenLink(u, link) {
    const v = Object.assign({}, link, { teenEmail: emailOf(u), teenName: u.name || '', code: localCode(emailOf(u)), updatedAt: Date.now() });
    cacheSet(u, 'parent_link', v);
    return put(rowKeyOf(u), 'parent_link', v);
  }
  async function sendRequest(u, link, before) {
    const em = emailOf(u), key = rowKeyOf(u);
    lsSet(dirtyKey(em), '1');
    const ok1 = await putTeenLink(u, link);
    const req = { teenKey: key, teenEmail: em, teenName: u.name || em, parentEmail: String(link.parentEmail || '').toLowerCase(), code: localCode(em), status: 'pending', at: Date.now() };
    const ok2 = await put(req.parentEmail, 'link_request:' + key, req);
    if (before && before.status === 'pending' && before.parentEmail && before.parentEmail !== link.parentEmail)
      put(String(before.parentEmail).toLowerCase(), 'link_request:' + key, Object.assign({}, req, { parentEmail: String(before.parentEmail).toLowerCase(), status: 'cancelled' }));
    if (ok1 && ok2) lsSet(dirtyKey(em), null);
  }
  // Make sure the teen's code is theirs alone in the cloud, then save it
  async function claimCode(u, code) {
    const key = rowKeyOf(u), em = emailOf(u);
    for (let i = 0; i < 6; i++) {
      if (!STRONG.test(code)) code = newCode();
      const taken = await rows(q => q.eq('key', 'code:' + code));
      if (taken === null) return '';
      if (!taken.some(r => r.email !== key)) break;
      code = newCode();
    }
    if (!(await put(key, 'code:' + code, { teenKey: key, teenEmail: em, at: Date.now() }))) return '';
    await put(key, 'link_code', code);
    cacheSet(u, 'link_code', code);
    if (localCode(em) !== code) { setLocalCode(em, code); showCode(code); }
    return code;
  }
  let teenSyncing = false;
  async function syncTeen() {
    const u = realAs('teen'); if (!u || teenSyncing) return;
    teenSyncing = true;
    try {
      const em = emailOf(u), key = rowKeyOf(u);
      const got = await rows(q => q.eq('email', key).in('key', ['parent_link', 'link_code', 'skills']));
      if (!got || me() !== u) return;
      const by = {}; got.forEach(r => { by[r.key] = parse(r.value); });
      // link code
      const cc = by.link_code;
      if (typeof cc === 'string' && STRONG.test(cc)) { cacheSet(u, 'link_code', cc); if (localCode(em) !== cc) { setLocalCode(em, cc); showCode(cc); } }
      else await claimCode(u, localCode(em));
      // parent link: the cloud copy wins, except for a request this device hasn't sent yet
      const local = localLink(em), cloud = by.parent_link;
      if (lsGet(dirtyKey(em)) && local && local.status) {
        if (local.status === 'pending') await sendRequest(u, local, null);
        else if (await putTeenLink(u, local)) lsSet(dirtyKey(em), null);
      } else if (cloud && cloud.status) {
        cacheSet(u, 'parent_link', cloud);
        if (!sameLink(local, cloud)) applyTeenLink(u, cloud);
      } else if (local && local.status) {
        await putTeenLink(u, local);                     // links saved on this device before v43
      }
      // skills saved from another device
      if (Array.isArray(by.skills) && !Array.isArray(cacheGet(u, 'skills', null))) { cacheSet(u, 'skills', by.skills); u.skills = by.skills; later(() => applyAll(true), 0); }
    } finally { teenSyncing = false; }
  }
  const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  const _oSend = window.twSendLink;
  if (typeof _oSend === 'function') window.twSendLink = function () {
    const u = realAs('teen'), em = u ? emailOf(u) : '', before = u ? localLink(em) : null;
    const r = _oSend.apply(this, arguments);
    try {
      if (u) { const after = localLink(em); if (after && after.status === 'pending' && (!before || before.requestedAt !== after.requestedAt || before.parentEmail !== after.parentEmail)) sendRequest(u, after, before); }
    } catch (e) {}
    return r;
  };
  const _oSkip = window.twSkipLink;
  if (typeof _oSkip === 'function') window.twSkipLink = function () {
    const u = realAs('teen');
    const r = _oSkip.apply(this, arguments);
    if (u) later(async () => {
      // only record "skipped" when the cloud has nothing better (a parent may already have approved)
      const got = await rows(q => q.eq('email', rowKeyOf(u)).eq('key', 'parent_link'));
      if (!got || me() !== u) return;
      const cloud = got[0] ? parse(got[0].value) : null;
      if (cloud && cloud.status && cloud.status !== 'skipped') { cacheSet(u, 'parent_link', cloud); if (!sameLink(localLink(emailOf(u)), cloud)) applyTeenLink(u, cloud); }
      else { const l = localLink(emailOf(u)); if (l && l.status === 'skipped') putTeenLink(u, l); }
    }, 0);
    return r;
  };
  ['twCheckApproval', 'checkParentLinkApproval'].forEach(n => {
    const o = window[n]; if (typeof o !== 'function') return;
    window[n] = async function () { if (realAs('teen')) { try { await withTimeout(syncTeen(), 5000); } catch (e) {} } return o.apply(this, arguments); };
  });

  /* parent side */
  let pTeens = [], pTeensAt = 0, pOwner = '';
  const reqKeys = {};                                      // teen email → their user_data key, from requests
  let parentSyncing = false, profilesAt = 0;
  function teenLabel(t) { return (t && (t.name || t.email)) || 'your teen'; }
  function syncLinkedTeensVar() {
    try {
      linkedTeens = pTeens.map(t => ({ name: teenLabel(t), age: ageFrom(t.dob) || '', city: placeOf(t), inviteCode: t.code || '', status: 'active', jobs: 0, rating: 0, avatar: '🧑', email: t.email }));
    } catch (e) {}
  }
  function saveParentTeens(u, push) {
    if (!u) return;
    pTeensAt = Date.now();
    const v = { teens: pTeens, updatedAt: pTeensAt };
    cacheSet(u, 'linked_teens', v);
    syncLinkedTeensVar();
    if (push !== false) put(rowKeyOf(u), 'linked_teens', v);
  }
  function prepareParent(u) {
    if (pOwner !== rowKeyOf(u)) { pTeens = []; pTeensAt = 0; pOwner = rowKeyOf(u); }
    const saved = cacheGet(u, 'linked_teens', null);
    if (saved && Array.isArray(saved.teens)) {
      if ((saved.updatedAt || 0) >= pTeensAt) { pTeens = saved.teens.filter(t => t && t.key); pTeensAt = saved.updatedAt || 0; }
    } else if (!pTeensAt) {
      // First time on v43: keep the teens this parent really linked on this device. The sample
      // "Alex Johnson" and the placeholder "Teen 1234" entries have no saved link, so they are dropped.
      const mine = emailOf(u), links = readJSON(LS_LINKS, {}), accts = readJSON('tw_local_accounts', {}), found = [];
      const add = (em, fallbackName, at) => {
        em = String(em || '').toLowerCase(); if (!em || found.some(t => t.email === em)) return;
        const a = accts[em] || {};
        found.push({ key: em, email: em, name: a.name || (fallbackName && fallbackName !== em ? fallbackName : '') || em, dob: a.dob || '', city: a.city || '', state: a.state || '', code: '', linkedAt: at || Date.now(), pending: true });
      };
      readJSON('tw_linked_teens', []).forEach(t => {
        const em = String((t && t.email) || '').toLowerCase(), l = em && links[em];
        if (l && l.status === 'approved' && String(l.parentEmail || '').toLowerCase() === mine) add(em, t.name, Date.parse(l.approvedAt));
      });
      readJSON(LS_REQ, []).forEach(r => {
        const l = r && links[String(r.teenEmail || '').toLowerCase()];
        if (r && r.status === 'approved' && String(r.parentEmail || '').toLowerCase() === mine && l && l.status === 'approved' && String(l.parentEmail || '').toLowerCase() === mine) add(r.teenEmail, r.teenName, r.at);
      });
      pTeens = found;
      saveParentTeens(u, false);
    }
    syncLinkedTeensVar();
  }
  function fillTeen(t, by) {
    const p = (by && by.account_profile) || {};
    if (p.name) t.name = p.name;
    if (p.dob) t.dob = p.dob;
    if (p.city != null) t.city = p.city;
    if (p.state != null) t.state = p.state;
    if (by && typeof by.link_code === 'string') t.code = by.link_code;
    if (by && Array.isArray(by.skills)) t.skills = by.skills;
  }
  // write the approval onto the teen's own cloud row (their other devices pick it up)
  async function linkTeenCloud(u, t, viaRequest) {
    const got = await rows(q => q.eq('email', t.key).in('key', ['parent_link', 'account_profile', 'link_code', 'skills']));
    if (got === null) return false;
    const by = {}; got.forEach(r => { by[r.key] = parse(r.value); });
    fillTeen(t, by);
    const pe = emailOf(u), prev = by.parent_link || {};
    const had = (prev.parents || []).concat(prev.status === 'approved' && prev.parentEmail ? [prev.parentEmail] : []).map(x => String(x).toLowerCase());
    let ok = true;
    if (!(prev.status === 'approved' && had.includes(pe))) {
      const link = Object.assign({}, prev, { status: 'approved', parentEmail: pe, parentName: u.name || '', approvedAt: new Date().toISOString(),
        parents: [...new Set(had.concat([pe]))], teenEmail: t.email, teenName: t.name || prev.teenName || '', updatedAt: Date.now() });
      delete link.unlinkedAt; delete link.declinedAt;
      ok = await put(t.key, 'parent_link', link);
    }
    if (ok) {
      delete t.pending;
      if (viaRequest || reqKeys[t.email]) put(pe, 'link_request:' + t.key, { teenKey: t.key, teenEmail: t.email, teenName: t.name || '', parentEmail: pe, code: t.code || '', status: 'approved', at: Date.now() });
    }
    if (realAs('parent') === u) saveParentTeens(u);
    return ok;
  }
  function adoptTeen(u, email, info) {
    email = String(email || '').toLowerCase(); if (!email) return null;
    const key = (info && info.key) || reqKeys[email] || email;
    let t = pTeens.find(x => x.key === key || x.email === email);
    if (!t) {
      t = { key, email, name: (info && info.name) || '', dob: '', city: '', state: '', code: (info && info.code) || '', linkedAt: Date.now(), pending: true };
      pTeens.push(t);
      saveParentTeens(u);
    }
    if (t.pending) linkTeenCloud(u, t, info && info.viaRequest).then(() => redrawParent());
    return t;
  }
  function mergeRequests(u, reqs) {
    const mine = emailOf(u), local = readJSON(LS_REQ, []); let changed = false;
    reqs.forEach(r => {
      if (!r || !r.teenEmail || String(r.parentEmail || '').toLowerCase() !== mine) return;
      const te = String(r.teenEmail).toLowerCase();
      reqKeys[te] = r.teenKey || te;
      const i = local.findIndex(x => x && String(x.teenEmail).toLowerCase() === te && String(x.parentEmail || '').toLowerCase() === mine);
      const linked = pTeens.some(t => t.key === (r.teenKey || te));
      if (r.status === 'pending' && !linked) {
        if (i < 0) { local.push({ teenEmail: te, teenName: r.teenName || te, parentEmail: mine, code: r.code || '', status: 'pending', at: r.at || Date.now() }); changed = true; }
        else if (local[i].status !== 'pending' && (r.at || 0) > (local[i].at || 0)) { Object.assign(local[i], { status: 'pending', at: r.at, teenName: r.teenName || local[i].teenName }); changed = true; }
      } else if (i >= 0 && local[i].status === 'pending' && r.status !== 'pending') { local[i].status = linked ? 'approved' : r.status; changed = true; }
    });
    if (changed) lsSet(LS_REQ, JSON.stringify(local));
  }
  async function syncParent(full) {
    const u = realAs('parent'); if (!u || parentSyncing) return;
    parentSyncing = true;
    try {
      const keys = [...new Set([rowKeyOf(u), emailOf(u)])];
      const got = await rows(q => q.in('email', keys));
      if (!got || me() !== u) return;
      const row = got.find(r => r.key === 'linked_teens' && r.email === rowKeyOf(u));
      const cloud = row && parse(row.value);
      if (cloud && Array.isArray(cloud.teens) && (cloud.updatedAt || 0) >= pTeensAt) {
        pTeens = cloud.teens.filter(t => t && t.key); pTeensAt = cloud.updatedAt || 0;
        cacheSet(u, 'linked_teens', { teens: pTeens, updatedAt: pTeensAt }); syncLinkedTeensVar();
      } else if (pTeens.length || pTeensAt) {
        put(rowKeyOf(u), 'linked_teens', { teens: pTeens, updatedAt: pTeensAt });
      }
      mergeRequests(u, got.filter(r => /^link_request:/.test(r.key)).map(r => parse(r.value)).filter(Boolean));
      for (const t of pTeens.filter(x => x.pending)) await linkTeenCloud(u, t);
      if (full || Date.now() - profilesAt > 300000) {
        profilesAt = Date.now();
        const tk = pTeens.map(t => t.key);
        const prof = tk.length ? await rows(q => q.in('email', tk).in('key', ['account_profile', 'link_code', 'skills'])) : [];
        if (prof && prof.length) {
          const by = {}; prof.forEach(r => { (by[r.email] = by[r.email] || {})[r.key] = parse(r.value); });
          const before = JSON.stringify(pTeens);
          pTeens.forEach(t => fillTeen(t, by[t.key]));
          if (JSON.stringify(pTeens) !== before) saveParentTeens(u);
        }
      }
      redrawParent();
    } finally { parentSyncing = false; }
  }
  async function linkByCode(u, raw) {
    const code = normCode(raw);
    if (!/^TEEN-[A-Z0-9]{4,8}$/.test(code)) return { ok: false, msg: 'Enter the link code from your teen\'s Profile tab. It looks like TEEN-K7M2QX.' };
    if (pTeens.some(t => t.code === code)) return { ok: false, msg: 'That teen is already linked to your account.' };
    let key = '', email = '';
    const idx = await rows(q => q.eq('key', 'code:' + code));
    if (idx && idx.length) {
      const cands = [...new Set(idx.map(r => r.email))];
      const cur = await rows(q => q.in('email', cands).in('key', ['link_code', 'account_profile']));
      const by = {}; (cur || []).forEach(r => { (by[r.email] = by[r.email] || {})[r.key] = parse(r.value); });
      const hit = cands.find(k => by[k] && by[k].link_code === code && !(by[k].account_profile && by[k].account_profile.type && by[k].account_profile.type !== 'teen'));
      if (hit) { key = hit; const ix = idx.find(r => r.email === hit); email = String((ix && parse(ix.value) || {}).teenEmail || (by[hit].account_profile || {}).email || hit.replace(/#\d+$/, '')).toLowerCase(); }
    }
    if (!key) {                                           // a teen on this device whose code isn't in the cloud yet
      const codes = readJSON(LS_CODES, {});
      const em = Object.keys(codes).find(k => codes[k] === code);
      if (em) { key = em; email = em; }
    }
    if (!key) return { ok: false, msg: idx === null ? 'You seem to be offline, so the code can\'t be checked. Try again when you\'re connected.' : 'No teen has the code ' + code + '. Check it on your teen\'s Profile tab (Parent link) and try again.' };
    if (pTeens.some(t => t.key === key)) return { ok: false, msg: 'That teen is already linked to your account.' };
    const t = { key, email, name: '', dob: '', city: '', state: '', code, linkedAt: Date.now(), pending: true };
    pTeens.push(t);
    saveParentTeens(u);
    const pe = emailOf(u);
    const l = localLink(email);                           // a teen signed in on this same device sees it right away
    if (l || readJSON(LS_CODES, {})[email]) setLocalLink(email, Object.assign({}, l || {}, { status: 'approved', parentEmail: pe, parentName: u.name || '', approvedAt: new Date().toISOString() }));
    await linkTeenCloud(u, t);
    return { ok: true, teen: t };
  }
  async function linkInvite(u, code) {
    const r = await linkByCode(u, code);
    if (r.ok) toast('✅ Linked to ' + teenLabel(r.teen) + '! They now have full access.', 'success');
    else toast(r.msg, 'info');
    redrawParent();
  }

  const _oApprove = window.twApproveLink;
  if (typeof _oApprove === 'function') window.twApproveLink = function (teenEmail) {
    const u = realAs('parent'); const e = String(teenEmail || '').toLowerCase();
    const req = u ? readJSON(LS_REQ, []).find(r => r && String(r.teenEmail).toLowerCase() === e && r.status === 'pending') : null;
    const r = _oApprove.apply(this, arguments);
    if (u) { try { adoptTeen(u, e, { name: req && req.teenName !== e ? req.teenName : '', code: req && req.code, viaRequest: true }); redrawParent(); } catch (x) {} }
    return r;
  };
  const _oDecline = window.twDeclineLink;
  if (typeof _oDecline === 'function') window.twDeclineLink = function (teenEmail) {
    const u = realAs('parent'); const e = String(teenEmail || '').toLowerCase();
    const r = _oDecline.apply(this, arguments);
    if (u) later(async () => {
      const key = reqKeys[e] || e, pe = emailOf(u);
      put(pe, 'link_request:' + key, { teenKey: key, teenEmail: e, parentEmail: pe, status: 'declined', at: Date.now() });
      const got = await rows(q => q.eq('email', key).eq('key', 'parent_link'));
      const cur = got && got[0] ? parse(got[0].value) : null;
      if (cur && cur.status === 'pending' && String(cur.parentEmail || '').toLowerCase() === pe)
        put(key, 'parent_link', Object.assign({}, cur, { status: 'declined', declinedAt: new Date().toISOString(), updatedAt: Date.now() }));
    }, 0);
    return r;
  };
  const _oLinkAnother = window.linkAnotherTeen;
  window.linkAnotherTeen = async function () {
    const u = realAs('parent');
    if (!u) return typeof _oLinkAnother === 'function' ? _oLinkAnother.apply(this, arguments) : undefined;
    const inp = $('mt-invite'), raw = inp ? inp.value : '';
    if (!String(raw).trim()) { toast('Enter your teen\'s link code first. They can find it on their Profile tab.', 'info'); return; }
    const btn = document.querySelector('[onclick^="linkAnotherTeen"]');
    if (btn) btn.disabled = true;
    try {
      const r = await linkByCode(u, raw);
      if (r.ok) { if (inp) inp.value = ''; toast('✅ Linked to ' + teenLabel(r.teen) + '! They now have full access.', 'success'); }
      else toast(r.msg, 'info');
    } finally { if (btn) btn.disabled = false; redrawParent(); }
  };
  window.twUnlinkTeen = async function (key) {
    const u = realAs('parent'); if (!u) return;
    const t = pTeens.find(x => x.key === key); if (!t) return;
    if (!confirm('Unlink ' + teenLabel(t) + ' from your account? If no other parent is linked, their account goes back to limited mode.')) return;
    pTeens = pTeens.filter(x => x !== t);
    saveParentTeens(u); redrawParent();
    const pe = emailOf(u);
    const got = await rows(q => q.eq('email', t.key).eq('key', 'parent_link'));
    const prev = got && got[0] ? parse(got[0].value) || {} : null;
    let next = null;
    if (prev) {
      const parents = (prev.parents || (prev.parentEmail ? [prev.parentEmail] : [])).map(x => String(x).toLowerCase()).filter(x => x && x !== pe);
      next = parents.length
        ? Object.assign({}, prev, { parents, parentEmail: parents[0], parentName: '', updatedAt: Date.now() })
        : Object.assign({}, prev, { status: 'unlinked', parents: [], parentEmail: '', parentName: '', unlinkedAt: new Date().toISOString(), updatedAt: Date.now() });
      await put(t.key, 'parent_link', next);
    }
    const l = localLink(t.email);
    if (l && String(l.parentEmail || '').toLowerCase() === pe) setLocalLink(t.email, next && next.status === 'approved' ? Object.assign({}, l, { parentEmail: next.parentEmail, parentName: '' }) : { status: 'unlinked', unlinkedAt: new Date().toISOString() });
    toast('Unlinked ' + teenLabel(t) + '.', 'info');
  };
  // the base code keeps one device-wide teen list and seeds a sample teen into it
  const _oSaveTeens = window.saveLinkedTeens;
  window.saveLinkedTeens = function () {
    const u = realAs('parent');
    if (!u) return typeof _oSaveTeens === 'function' ? _oSaveTeens.apply(this, arguments) : undefined;
    try { (linkedTeens || []).forEach(t => { if (t && t.email && !pTeens.some(x => x.email === String(t.email).toLowerCase())) adoptTeen(u, t.email, { name: t.name !== t.email ? t.name : '', code: t.inviteCode }); }); } catch (e) {}
    saveParentTeens(u);
  };
  const _oMulti = window.renderMultiTeens;
  window.renderMultiTeens = function () {
    const u = realAs('parent');
    if (!u) return typeof _oMulti === 'function' ? _oMulti.apply(this, arguments) : undefined;
    syncLinkedTeensVar();
    const badge = $('teen-count-badge'); if (badge) badge.textContent = pTeens.length ? plural(pTeens.length, 'Teen') : 'None yet';
    const list = $('multi-teen-list'); if (!list) return;
    list.innerHTML = !pTeens.length
      ? `<div data-tw-empty="teens" style="text-align:center;padding:1.4rem 1rem;color:var(--muted);background:var(--bg);border:1.5px dashed var(--border);border-radius:14px">
          <div style="font-size:2rem;margin-bottom:.4rem">👪</div>
          <div style="font-weight:700;color:var(--text);margin-bottom:.3rem">No teens linked yet</div>
          <div style="font-size:.84rem;line-height:1.55">Ask your teen to open <strong>Profile</strong> in their TeenWork account and read you the link code under <strong>Parent link</strong> (it looks like TEEN-K7M2QX). Enter it below. If your teen sent you a request, it shows at the top of your dashboard.</div></div>`
      : pTeens.map(t => {
        const age = ageFrom(t.dob), info = [age ? 'Age ' + age : '', placeOf(t)].filter(Boolean).join(' · ');
        return `<div data-tw-teen="${esc(t.key)}" style="background:var(--bg);border:1.5px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <div style="width:48px;height:48px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">🧑</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:.95rem">${esc(teenLabel(t))}</div>
              ${info ? `<div style="font-size:.78rem;color:var(--muted)">${esc(info)}</div>` : ''}
              ${t.code ? `<div style="font-size:.76rem;color:var(--muted);margin-top:2px">Code: <code style="background:var(--bg);border:1px solid var(--border);padding:1px 5px;border-radius:4px;font-size:.74rem">${esc(t.code)}</code></div>` : ''}
            </div>
            <span style="background:${t.pending ? 'var(--amber-pale)' : 'var(--green-pale)'};color:${t.pending ? 'var(--amber)' : 'var(--green)'};font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:10px;flex-shrink:0">${t.pending ? 'not synced yet' : 'linked'}</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
            <button class="btn-sm btn-ai" style="font-size:.75rem" onclick="switchParentTab('ptab-weekly','pdtab-weekly')">📬 Weekly summary</button>
            <button class="btn-sm btn-approve" style="font-size:.75rem" onclick="switchParentTab('ptab-approvals','pdtab-approvals')">✅ Approvals</button>
            <button class="btn-sm" style="font-size:.75rem;background:var(--red-pale);color:var(--red);border:1px solid #f5b7b1" onclick="twUnlinkTeen(decodeURIComponent('${encodeURIComponent(t.key)}'))">Unlink</button>
          </div></div>`;
      }).join('');
  };

  /* ── 3. Teen screens ────────────────────────────────────────────── */
  const SKILL_ICONS = [[/pet|dog|cat|animal/i, '🐾'], [/lawn|yard|garden|mow|leaf|leaves|rake|weed/i, '🌿'], [/snow|shovel/i, '❄️'], [/clean|wash|chore/i, '🧹'],
    [/baby|child|kid|nanny/i, '👶'], [/tutor|homework|math|reading/i, '📚'], [/tech|computer|phone/i, '💻'], [/mov|box|lift/i, '📦'], [/cook|bake|food/i, '🍳'], [/paint|art|craft/i, '🎨']];
  const splitSkills = s => (Array.isArray(s) ? s : String(s || '').split(',')).map(x => String(x).trim()).filter(Boolean).slice(0, 20);
  const aiProfileOf = u => readJSON('tw_' + (u.id || u.email) + '_ai_profile', null);
  let signupStash = null;                                  // what the sign-up form had (address, business name)
  function skillsOf(u) {
    const saved = cacheGet(u, 'skills', null);
    if (Array.isArray(saved)) return saved;
    const ai = aiProfileOf(u);
    if (ai && Array.isArray(ai.skills) && ai.skills.length && ai.skills.join(',') !== DEMO_SKILLS) return ai.skills;
    return Array.isArray(u.skills) && u.skills.join(',') !== DEMO_SKILLS ? u.skills : [];
  }
  const addrKey = u => 'tw_device_address_' + rowKeyOf(u).toLowerCase();   // never sent to the cloud: the panel promises it stays private
  const addressOf = u => readJSON(addrKey(u), null) || { street: '', zip: '', city: u.city || '', state: u.state || '' };
  function prepareTeen(u) {
    const em = emailOf(u);
    const cl = cacheGet(u, 'parent_link', null);      // pulled at sign-in by _DB.sync
    if (cl && cl.status && !lsGet(dirtyKey(em))) { if (!sameLink(localLink(em), cl)) setLocalLink(em, cl); u.parentLinked = cl; }
    const cc = cacheGet(u, 'link_code', null);
    if (typeof cc === 'string' && STRONG.test(cc)) setLocalCode(em, cc);
    else if (!STRONG.test(localCode(em))) setLocalCode(em, newCode());
    if (signupStash && signupStash.type === 'teen' && signupStash.email === em && !lsGet(addrKey(u)) && (signupStash.street || signupStash.zip))
      lsSet(addrKey(u), JSON.stringify({ street: signupStash.street, zip: signupStash.zip, city: signupStash.city || u.city || '', state: signupStash.state || u.state || '' }));
    const skills = skillsOf(u); u.skills = skills;
    // a demo session earlier in this tab leaves its sample bio, skills, jobs and points behind
    try {
      if (typeof userActivity !== 'undefined') {
        if (!Array.isArray(userActivity.skills) || !userActivity.skills.length || userActivity.skills.join(',') === DEMO_SKILLS) userActivity.skills = skills.slice();
        if (/^Hardworking 16-year-old from Burlington/.test(userActivity.bio || '')) { const ai = aiProfileOf(u); userActivity.bio = (ai && ai.bio) || ''; }
        prune(userActivity.jobsAccepted, j => j && SAMPLE_EMPLOYERS.test(String(j.employer || '')));
      }
      if (typeof teenGameState !== 'undefined' && teenGameState.points === 180 && String(teenGameState.badges) === 'first_job,first_hire,lesson_1,verified') {
        const k = s => 'tw_' + (u.id || u.email) + '_' + s, b = readJSON(k('badges'), null);
        teenGameState.badges = Array.isArray(b) ? b : []; teenGameState.points = parseInt(lsGet(k('points')), 10) || 0;
      }
    } catch (e) {}
    try { const a = addressOf(u); Object.assign(_userAddress, { street: a.street || '', zip: a.zip || '', city: a.city || u.city || '', state: a.state || u.state || '' }); } catch (e) {}
  }
  function drawSkills(u, real) {
    const box = $('profile-skills-display'); if (!box) return;
    const list = real ? skillsOf(u) : [];
    realHTML(box, real, list.length
      ? list.map(s => `<span class="skill-pill">${(SKILL_ICONS.find(([re]) => re.test(s)) || [0, '✨'])[1]} ${esc(s.replace(/\b\w/g, c => c.toUpperCase()))}</span>`).join(' ')
      : '<span style="font-size:.8rem;opacity:.8">None yet. Add your skills in Skills &amp; Tags below.</span>');
  }
  window.saveSkillsInput = function (value) {                // the skills box called this, but it was never written
    const list = splitSkills(value), u = me();
    try { if (typeof trackActivity === 'function') trackActivity('skills_update', list); } catch (e) {}
    if (!u || u.type !== 'teen') return;
    u.skills = list;
    if (!isReal(u)) return;
    cacheSet(u, 'skills', list);
    drawSkills(u, true);
    clearTimeout(window.saveSkillsInput._t);
    window.saveSkillsInput._t = setTimeout(() => { if (me() === u) put(rowKeyOf(u), 'skills', list); }, 900);
  };
  const _oAddr = window.saveProfileAddress;
  if (typeof _oAddr === 'function') window.saveProfileAddress = function () {
    const r = _oAddr.apply(this, arguments);
    const u = realAs('teen');
    if (u) { const v = id => String(($(id) || {}).value || '').trim(); lsSet(addrKey(u), JSON.stringify({ street: v('profile-address'), zip: v('profile-zip'), city: v('profile-city'), state: v('profile-state') })); }
    return r;
  };
  function ratingLine() {
    let p = document.querySelector('[data-tw-rating-line]');
    if (!p) { p = [...document.querySelectorAll('#ttab-resume .resume-card p')].find(x => /avg ·/.test(x.textContent)); if (p) p.dataset.twRatingLine = '1'; }
    return p;
  }
  function ratingText() {
    let s = null; try { s = window._twRealStats && window._twRealStats.stats(); } catch (e) {}
    const n = s ? s.totalRatings || 0 : 0, jobs = s ? s.jobsCompleted || 0 : 0;
    return (s && s.avgRating ? '⭐ ' + s.avgRating + ' avg from ' + plural(n, 'rating') : 'No ratings yet') + ' · ' + plural(jobs, 'completed job');
  }
  function panelBadge(tabId, title) {
    const head = [...document.querySelectorAll('#' + tabId + ' .panel-head')].find(h => { const h2 = h.querySelector('h2'); return h2 && (!title || h2.textContent.trim() === title); });
    return head ? head.querySelector('.badge') : null;
  }
  const openJobs = () => { try { const applied = new Set(demoJobs.map(j => j.id)); return browsableJobs.filter(j => !applied.has(j.id)); } catch (e) { return []; } };
  const realApps = () => { try { return demoJobs.filter(j => j && !isSampleJob(j)); } catch (e) { return []; } };
  function patchTeen(u, real, inputs) {
    const age = ageFrom(u.dob) || (Number(u.age) || 0);
    realText($('profile-info-display'), real, [age ? 'Age ' + age : '', placeOf(u)].filter(Boolean).join(' · ') || 'Add your town in Account Settings below');
    drawSkills(u, real);
    realText(ratingLine(), real, ratingText());
    realText(panelBadge('ttab-browse', 'Available Jobs'), real, openJobs().length + ' Open');
    realText(panelBadge('ttab-applications'), real, realApps().length + ' Total');
    if (inputs) {
      realVal($('skills-input'), real, skillsOf(u).join(', '));
      const a = addressOf(u);
      realVal($('profile-address'), real, a.street || '');
      realVal($('profile-city'), real, a.city || u.city || '');
      realVal($('profile-zip'), real, a.zip || '');
      realSel($('profile-state'), real, a.state || u.state || '');
      realVal($('acct-city'), real, u.city || '');
      realSel($('acct-state'), real, u.state || '');
      const bio = $('profile-bio-input');
      if (real && bio && !bio.value && typeof userActivity !== 'undefined' && userActivity.bio && bio !== document.activeElement) bio.value = userActivity.bio;
    }
    if (real) {
      try { if ($('cal-grid') && typeof renderCalEarningsBar === 'function') renderCalEarningsBar(); } catch (e) {}
      if ($('ttab-leaderboard') && $('ttab-leaderboard').classList.contains('active')) drawLeaderboard();
      if ($('ttab-stories') && $('ttab-stories').classList.contains('active')) drawStories();
    }
  }
  const NO_JOBS = EMPTY('🔎', 'No jobs posted near you yet', 'Check back soon. In the meantime, finish your profile and try a lesson so you\'re ready to apply.');
  const _oBrowse = window.renderBrowseJobs;
  if (typeof _oBrowse === 'function') window.renderBrowseJobs = function () {
    const r = _oBrowse.apply(this, arguments);
    try {
      const u = realAs('teen'), c = $('browse-jobs-list');
      if (u && c && !openJobs().length) c.innerHTML = NO_JOBS;
      realText(panelBadge('ttab-browse', 'Available Jobs'), !!u, openJobs().length + ' Open');
    } catch (e) {}
    return r;
  };
  const _oMatch = window.aiJobMatch;
  if (typeof _oMatch === 'function') window.aiJobMatch = function () {
    const u = realAs('teen');
    if (!u || openJobs().length) return _oMatch.apply(this, arguments);
    // no open jobs: don't ask the AI to rank an empty list (or spend the teen's AI allowance on it)
    try {
      const ua = typeof userActivity !== 'undefined' ? userActivity : {};
      const bio = ua.bio || '', skills = ua.skills || [], missing = [];
      let strength = 0;
      if (bio.length > 20) strength += 30; else missing.push('add a bio');
      if (skills.length >= 2) strength += 30; else missing.push('add more skills');
      if ((ua.jobsAccepted || []).length) strength += 20;
      if ((ua.lessonsCompleted || []).length) strength += 20;
      const badge = $('profile-strength-badge');
      if (badge) {
        badge.textContent = 'Profile: ' + (strength >= 70 ? '💪 Strong' : strength >= 40 ? '👍 Good' : '⚠️ Weak') + ' (' + strength + '%)';
        badge.style.background = strength >= 70 ? 'var(--green-pale)' : strength >= 40 ? 'var(--amber-pale)' : 'var(--red-pale)';
        badge.style.color = strength >= 70 ? 'var(--green)' : strength >= 40 ? 'var(--amber)' : 'var(--red)';
      }
      const nudge = $('ai-match-profile-nudge');
      if (nudge) { nudge.style.display = missing.length ? 'block' : 'none'; if (missing.length) nudge.innerHTML = '💡 <strong>Get ready for matches:</strong> ' + missing.join(' and ') + ' in your <a onclick="switchDashTab(null,\'ttab-resume\')" style="color:var(--amber);font-weight:700;cursor:pointer">Profile tab</a>.'; }
      const panel = $('ai-match-panel');
      if (panel) panel.innerHTML = '<p style="color:var(--muted);font-size:.85rem;margin:0">No job matches yet, because there are no open jobs near you right now. Matches show up here when jobs are posted.</p>';
    } catch (e) {}
  };
  const _oTeenApps = window.renderTeenApplications;
  if (typeof _oTeenApps === 'function') window.renderTeenApplications = function () {
    const r = _oTeenApps.apply(this, arguments);
    try {
      const u = realAs('teen'), c = $('teen-applications-list'), apps = realApps();
      if (u && c && apps.length) c.innerHTML = apps.map(j => `<div class="job-card"><div class="job-card-top"><div><div class="job-title">${esc(j.title)}</div><div class="job-employer">${esc(j.employer)} · Applied ${esc(j.applied || '')}</div></div>
        <span class="tag status-${j.status === 'pending-approval' ? 'pending' : esc(j.status)}">${j.status === 'pending-approval' ? 'Waiting for Parent Approval' : j.status === 'accepted' ? '✓ Accepted' : j.status === 'applied' ? 'Sent to employer' : 'Not approved'}</span></div>
        <div class="job-meta"><span class="tag pay">$${esc(j.pay)}${j.payType === 'hourly' ? '/hr' : ' flat'}</span><span class="tag">📍 ${esc(j.city)}</span><span class="tag">🏷 ${esc(j.type)}</span></div></div>`).join('');
      realText(panelBadge('ttab-applications'), !!u, apps.length + ' Total');
    } catch (e) {}
    return r;
  };
  const _oSaveAcct = window.saveAccountSettings;
  if (typeof _oSaveAcct === 'function') window.saveAccountSettings = function () {
    const r = _oSaveAcct.apply(this, arguments);
    later(() => applyAll(false), 0);                         // it wrote "Age 16" into the profile card
    return r;
  };
  // leaderboard: there is no shared leaderboard yet, so a real teen sees only their own row
  function drawLeaderboard() {
    const u = realAs('teen'); if (!u) return;
    const opts = readJSON('tw_lb_opts', {});
    let s = null; try { s = window._twRealStats.stats(); } catch (e) {}
    const badges = (typeof teenGameState !== 'undefined' && teenGameState.badges) ? teenGameState.badges.length : 0, hours = s ? s.totalHours : 0;
    const row = (metric, unit) => `<div style="display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;background:var(--amber-pale);border:1.5px solid var(--amber);margin-bottom:6px">
      <div style="font-size:1.3rem;width:28px;text-align:center">🥇</div><div style="font-size:1.4rem">😎</div>
      <div style="flex:1"><div style="font-weight:700;font-size:.88rem;color:var(--amber)">${esc(u.name || 'You')} (You)</div><div style="font-size:.72rem;color:var(--muted)">${esc(u.city || 'Your town')}</div></div>
      <div style="text-align:right"><div style="font-family:'Fraunces',serif;font-size:1.2rem;font-weight:900;color:var(--amber)">${metric}</div><div style="font-size:.68rem;color:var(--muted)">${unit}</div></div></div>`;
    const note = '<div style="margin-top:.6rem;font-size:.78rem;color:var(--muted);text-align:center">Rankings with other teens are coming soon. For now this shows your own count.</div>';
    const none = '<div style="padding:.9rem;background:var(--bg);border-radius:10px;font-size:.84rem;color:var(--muted);text-align:center">Opt in above to show up here.</div>';
    const bl = $('lb-badges-list'), hl = $('lb-hours-list');
    if (bl) bl.innerHTML = opts.badges ? row(badges, 'badges') + note : none;
    if (hl) hl.innerHTML = opts.hours ? row(hours + 'h', 'hours worked') + note : none;
  }
  const _oLbOpt = window.leaderboardOptToggle;
  if (typeof _oLbOpt === 'function') window.leaderboardOptToggle = function () { const r = _oLbOpt.apply(this, arguments); drawLeaderboard(); return r; };
  // success stories: the four built-in quotes are samples
  const SEED_STORY = /^(Maya, 15 · TX|James, 14 · CA|Riverbed Landscaping|Dana · Parent, VT)$/;
  function drawStories() {
    const el = $('stories-container'); if (!el || !isReal(me())) return;
    const list = readJSON('tw_success_stories', []).filter(s => s && !SEED_STORY.test(String(s.name || '')));
    el.innerHTML = list.length
      ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">${list.map(s => `<div style="background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:1rem"><div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;font-weight:700">${esc(s.role)}</div><p style="font-size:.9rem;margin:6px 0 8px;line-height:1.5">"${esc(s.quote)}"</p><div style="font-size:.78rem;color:var(--green);font-weight:700">— ${esc(s.name)}</div></div>`).join('')}</div>`
      : EMPTY('🌟', 'No member stories yet', 'Got one? Share it below and it could be featured here.');
  }
  const _oStories = window.renderStories;
  if (typeof _oStories === 'function') window.renderStories = function (containerId) {
    const r = _oStories.apply(this, arguments);
    if (containerId === 'stories-container') drawStories();
    return r;
  };

  /* ── 4. Verification page and paid checks ───────────────────────── */
  function patchVerify() {
    const u = me(); if (!u) return;
    const real = isReal(u);
    const who = u.type === 'parent' ? (pTeens[0] || { name: '', dob: '', state: '' }) : u;
    const body = $('tw-ver-body-1'); if (!body) return;
    const ins = body.querySelectorAll('input');
    const parts = String(who.name || '').trim().split(/\s+/);
    realVal(ins[0], real, parts[0] || ''); realVal(ins[1], real, parts.slice(1).join(' '));
    realVal(ins[2], real, who.dob || ''); realVal(ins[3], real, who.state || '');
    const up = body.querySelector('.tw-ver-upload');
    if (up) { realText(up, real, 'No ID uploaded'); up.classList.toggle('has-file', !real); }
    const age = ageFrom(who.dob);
    realVal($('tw-ver-age'), real, age ? String(age) : '');
    const sel = $('tw-ver-state');
    if (sel) { const o = orig(sel, 'sel', () => sel.value); if (!real) sel.value = o; else { const m = [...sel.options].find(x => x.textContent.trim().toLowerCase() === String(who.state || '').toLowerCase()); if (m) sel.value = m.value; } }
  }
  const _oVerify = window.showVerifyPage;
  if (typeof _oVerify === 'function') window.showVerifyPage = function () { const r = _oVerify.apply(this, arguments); try { patchVerify(); } catch (e) {} later(patchVerify, 120); return r; };
  try {
    if (typeof TW_Verify !== 'undefined' && TW_Verify) {
      const _oPrev = TW_Verify.previewConsentEmail, _oBGC = TW_Verify.purchaseBGC;
      TW_Verify.previewConsentEmail = function () {
        const u = me(); if (!isReal(u)) return _oPrev.apply(this, arguments);
        const name = ($('tw-ver-parent-name') || {}).value || '[Parent]';
        const teen = u.type === 'teen' ? (u.name || 'your teen') : teenLabel(pTeens[0]);
        alert(`📧 Email preview to ${name}:\n\nSubject: Action Required — TeenWork Consent for ${teen}\n\n${firstName(teen) || 'Your teen'} has created a TeenWork account and needs your consent to apply for jobs. Click the link to review and sign.\n\n[Sign Consent Form →]\n\nYou can revoke consent anytime from your parent dashboard.`);
      };
      TW_Verify.purchaseBGC = async function () {
        if (!isReal(me())) return _oBGC.apply(this, arguments);
        const box = $('tw-ver-bgc-result');
        if (box) { box.textContent = '✦ Background checks are coming soon. Nothing was charged.'; box.classList.add('show'); }
      };
    }
  } catch (e) {}
  const _oEmpBGC = window.runEmployerBGC;
  if (typeof _oEmpBGC === 'function') window.runEmployerBGC = async function () {
    if (!realAs('employer')) return _oEmpBGC.apply(this, arguments);
    try { showAlert('emp-bgc-alert', '🛡 Verified-employer background checks are coming soon. Nothing was charged.', 'info'); } catch (e) {}
  };

  /* ── 5. Parent screens ──────────────────────────────────────────── */
  function parentActivity() {
    const apps = isReal(me()) ? realApps() : (typeof demoJobs !== 'undefined' ? demoJobs : []), ratings = (typeof demoRatings !== 'undefined' ? demoRatings : []);
    const pending = parentApprovalRecords(apps), accepted = apps.filter(j => j.status === 'accepted');
    const avg = ratings.length ? (ratings.reduce((s, r) => s + (Number(r.stars) || 0), 0) / ratings.length).toFixed(1) : '';
    return { apps, pending, accepted, ratings, avg, total: apps.length + ratings.length };
  }
  const teenNames = () => pTeens.map(t => firstName(t.name) || t.email).join(', ');
  function parentHeaderHTML() {
    if (!pTeens.length) return '<strong id="parent-teen-name">No teen linked yet</strong> · <a href="#" onclick="switchParentTab(\'ptab-teens\',\'pdtab-teens\');return false" style="color:var(--green);font-weight:700">Link your teen</a>';
    if (pTeens.length === 1) { const t = pTeens[0], age = ageFrom(t.dob); return 'Monitoring <strong id="parent-teen-name">' + esc(teenLabel(t)) + '</strong>' + (age ? ' · Age ' + age : '') + (t.state ? ' · ' + esc(t.state) : ''); }
    return 'Monitoring <strong id="parent-teen-name">' + esc(teenNames()) + '</strong>';
  }
  const SMALL = 'font-size:.82rem;color:var(--muted);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.5px';
  function teenCardHTML(t, more) {
    if (!t) return `<div class="teen-profile-card"><div class="teen-avatar">👪</div><div class="teen-name" id="p-teen-name">No teen linked yet</div>
        <div class="teen-info">Ask your teen for the link code on their Profile tab, then enter it under My Teens. Or approve their request when it shows at the top of this page.</div></div>
        <button class="btn-sm btn-approve" style="margin-top:10px;width:100%" onclick="switchParentTab('ptab-teens','pdtab-teens')">🔗 Link your teen</button>`;
    const age = ageFrom(t.dob), info = [age ? 'Age ' + age : '', placeOf(t)].filter(Boolean).join(' · ');
    return `<div class="teen-profile-card"><div class="teen-avatar">🧑</div><div class="teen-name" id="p-teen-name">${esc(teenLabel(t))}</div>
        ${info ? `<div class="teen-info">${esc(info)}</div>` : ''}
        <div class="teen-info">Skills: ${t.skills && t.skills.length ? esc(t.skills.join(', ')) : 'none added yet'}</div></div>
        ${t.code ? `<div style="${SMALL}">Link Code</div><div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-family:monospace;font-size:.95rem;letter-spacing:2px">${esc(t.code)}</div>
        <div style="font-size:.76rem;color:var(--muted);margin-top:5px">Share with a second parent so they can link too</div>` : ''}
        ${more ? `<div style="font-size:.8rem;color:var(--muted);margin-top:8px">+ ${plural(more, 'more linked teen')} · <a href="#" onclick="switchParentTab('ptab-teens','pdtab-teens');return false" style="color:var(--green);font-weight:700">See My Teens</a></div>` : ''}
        <button class="btn-sm btn-ai" style="margin-top:10px;width:100%" onclick="showVerifyPage()">🛡 View Teen's Verification Status</button>`;
  }
  function patchParent(u, real) {
    realHTML(document.querySelector('#page-parent .dash-header p'), real, parentHeaderHTML());
    const a = parentActivity();
    const vals = [[a.apps.length, a.pending.length ? a.pending.length + ' pending review' : 'None yet'], [a.pending.length, a.pending.length ? 'Your action needed' : 'Nothing waiting'],
      [a.accepted.length, 'This season'], [a.avg ? a.avg + '⭐' : '—', a.ratings.length ? 'From ' + plural(a.ratings.length, 'rating') : 'No ratings yet']];
    document.querySelectorAll('#ptab-overview .stats-row .stat-card').forEach((c, i) => {
      if (!vals[i]) return;
      if (i < 2) { c.querySelector('.stat-value').textContent = String(vals[i][0]); c.querySelector('.stat-sub').textContent = vals[i][1]; }
      else { realText(c.querySelector('.stat-value'), real, String(vals[i][0])); realText(c.querySelector('.stat-sub'), real, vals[i][1]); }
    });
    let card = document.querySelector('[data-tw-teen-card]');
    if (!card) { const tc = document.querySelector('#ptab-overview .teen-profile-card'); card = tc && tc.closest('.panel-body'); if (card) card.dataset.twTeenCard = '1'; }
    if (card) {
      realHTML(card, real, teenCardHTML(pTeens[0], pTeens.length - 1));
      realText(card.closest('.panel').querySelector('.panel-head .badge'), real, pTeens.length ? 'Linked' : 'Not linked');
    }
    const allApps = $('all-applications');
    realText(allApps && allApps.closest('.panel').querySelector('.panel-head .badge'), real, a.apps.length + ' Total');
    if (real && allApps && !a.apps.length && !allApps.querySelector('[data-tw-empty]')) allApps.innerHTML = EMPTY('📋', 'No applications yet', 'When your teen applies for a job, it shows up here for you to review.');
    const nl = $('notif-list');
    if (real && nl && !demoNotifs.length && !nl.querySelector('[data-tw-empty]')) nl.innerHTML = EMPTY('🔔', 'No notifications yet', 'Your teen\'s job applications, approvals and safety alerts show up here.');
    realAttr($('mt-invite'), real, 'placeholder', 'e.g. TEEN-K7M2QX');
    const mt = $('mt-invite'), box = mt && mt.closest('#ptab-teens > .panel, #ptab-teens .panel-body') ;
    if (box) {
      const head = [...box.querySelectorAll('div')].find(d => /^➕ Link Another Teen$/i.test(d.textContent.trim()) || d.dataset.twLinkHead);
      if (head) { head.dataset.twLinkHead = '1'; realText(head, real, pTeens.length ? '➕ Link Another Teen' : '➕ Link Your Teen'); }
      const tip = [...box.querySelectorAll('p')].find(x => /^Ask your other teen to share/.test(x.textContent) || x.dataset.twLinkTip);
      if (tip) { tip.dataset.twLinkTip = '1'; realText(tip, real, 'Your teen finds their link code on their Profile tab, under Parent link.'); }
    }
    if (real) {
      const badge = $('teen-count-badge'); if (badge) badge.textContent = pTeens.length ? plural(pTeens.length, 'Teen') : 'None yet';
      if ($('ptab-teens') && $('ptab-teens').classList.contains('active')) window.renderMultiTeens();
    }
  }
  function redrawParent() { const u = realAs('parent'); if (u) { try { patchParent(u, true); } catch (e) {} } }
  const _oRPD = window.renderParentDashboard;
  if (typeof _oRPD === 'function') window.renderParentDashboard = function () {
    const r = _oRPD.apply(this, arguments);
    try { const u = me(); if (u && u.type === 'parent') patchParent(u, isReal(u)); } catch (e) {}
    return r;
  };
  function fixHired(id) { const el = $(id); if (el && isReal(me())) el.querySelectorAll('.cal-synced-badge').forEach(b => { b.textContent = fixNames(b.textContent); }); }
  ['renderApprovalJobs', 'renderAllApplications'].forEach(n => {
    const o = window[n]; if (typeof o !== 'function') return;
    window[n] = function () { const r = o.apply(this, arguments); try { fixHired(n === 'renderApprovalJobs' ? 'approval-jobs' : 'all-applications'); redrawParent(); } catch (e) {} return r; };
  });
  const _oNotifs = window.renderNotifications;
  if (typeof _oNotifs === 'function') window.renderNotifications = function () {
    if (isReal(me())) { try { prune(demoNotifs, isSampleNotif); } catch (e) {} }
    const r = _oNotifs.apply(this, arguments);
    redrawParent();
    return r;
  };
  // swap the prompt for one call to the AI, so the app's own counting and screens still apply
  async function withPrompt(prompt, fn) {
    const saved = window.callGemini; let used = false;
    if (typeof saved === 'function') window.callGemini = function () { if (used) return saved.apply(this, arguments); used = true; window.callGemini = saved; return saved.call(this, prompt); };
    try { return await fn(); } finally { if (window.callGemini !== saved && !used) window.callGemini = saved; }
  }
  function activityFacts(a) {
    return [
      '- Teen(s): ' + pTeens.map(t => teenLabel(t) + (ageFrom(t.dob) ? ' (age ' + ageFrom(t.dob) + ')' : '') + (placeOf(t) ? ', ' + placeOf(t) : '')).join('; '),
      '- Job applications: ' + a.apps.length + (a.apps.length ? ' (' + a.apps.map(j => j.title + ' at ' + j.employer + ', ' + j.status).join('; ') + ')' : ''),
      '- Waiting for parent approval: ' + a.pending.length,
      '- Accepted: ' + a.accepted.length,
      '- Ratings: ' + (a.ratings.length ? a.ratings.map(r => r.stars + '★ from ' + r.from).join(', ') : 'none'),
    ].join('\n');
  }
  const _oWeekly = window.generateWeeklySummary;
  if (typeof _oWeekly === 'function') window.generateWeeklySummary = async function () {
    const u = realAs('parent'); if (!u) return _oWeekly.apply(this, arguments);
    const a = parentActivity();
    if (pTeens.length && a.total) {
      const prompt = 'You are writing a short, warm weekly digest email from TeenWork to a parent. Use ONLY these facts and do not invent any other activity, earnings, lessons or ratings:\n' + activityFacts(a) +
        '\n\nWrite 3 short sections with emoji headers: 📊 This Week at a Glance, 💼 Job Activity, 💡 Parent Tip. Under 150 words. Sign off as "The TeenWork Team".';
      return withPrompt(prompt, () => _oWeekly.apply(this, arguments));
    }
    const out = $('weekly-summary-output'), body = $('weekly-summary-body'), dateEl = $('weekly-summary-date');
    if (!out || !body) return;
    out.style.display = 'block';
    const now = new Date(), sun = new Date(now); sun.setDate(now.getDate() - now.getDay()); const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (dateEl) dateEl.textContent = 'Week of ' + fmt(sun) + ' – ' + fmt(sat);
    body.innerHTML = !pTeens.length
      ? '📭 <strong>No teen linked yet.</strong><br><br>Link your teen in <a href="#" onclick="switchParentTab(\'ptab-teens\',\'pdtab-teens\');return false" style="color:var(--green);font-weight:700">My Teens</a> and their weekly summary will show here.'
      : '📭 <strong>Nothing to report yet for ' + esc(teenNames()) + '.</strong><br><br>When your teen applies for jobs, gets approved or receives a rating on TeenWork, this week\'s summary shows it here.';
  };
  const _oDigest = window.openParentAIDigest;
  if (typeof _oDigest === 'function') window.openParentAIDigest = async function () {
    const u = realAs('parent'); if (!u) return _oDigest.apply(this, arguments);
    const a = parentActivity();
    if (pTeens.length && a.total) {
      const prompt = 'You are writing a friendly 3-4 sentence weekly summary for a parent on TeenWork. Use ONLY these facts and do not invent anything:\n' + activityFacts(a) + '\nEnd with one specific suggestion for the parent.';
      const r = await withPrompt(prompt, () => _oDigest.apply(this, arguments));
      const sub = document.querySelector('#parent-digest-modal div[style*="font-size:.78rem"]'); if (sub) sub.textContent = teenNames() + ' · this week';
      return r;
    }
    let modal = $('parent-digest-modal');
    if (!modal) { modal = document.createElement('div'); modal.id = 'parent-digest-modal'; modal.style.cssText = 'position:fixed;inset:0;z-index:6000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:1rem'; document.body.appendChild(modal); }
    modal.innerHTML = `<div style="background:var(--card);border-radius:18px;padding:1.6rem 1.5rem;max-width:480px;width:100%;box-shadow:var(--shadow-lg);position:relative">
      <button onclick="document.getElementById('parent-digest-modal').remove()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.3rem;color:var(--muted);cursor:pointer">✕</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem"><span style="font-size:1.8rem">📋</span><div><div style="font-family:'Fraunces',serif;font-size:1.05rem;font-weight:700;color:var(--green)">AI Weekly Digest</div>
      <div style="font-size:.78rem;color:var(--muted)">${pTeens.length ? esc(teenNames()) + ' · this week' : 'No teen linked yet'}</div></div></div>
      <div style="font-size:.88rem;line-height:1.7;color:var(--text);background:var(--bg);border-radius:10px;padding:.9rem 1rem;margin-bottom:1rem">${pTeens.length ? 'Nothing to report yet. When your teen applies for jobs, gets approved or receives a rating, the digest sums it up here.' : 'Link your teen under My Teens to get a weekly digest of their TeenWork activity.'}</div>
      <button onclick="document.getElementById('parent-digest-modal').remove()" style="width:100%;background:var(--green);color:#fff;border:none;padding:10px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:700;cursor:pointer">Close</button></div>`;
  };
  const _oSummary = window.viewTeenSummary;
  window.viewTeenSummary = function () {
    if (!realAs('parent')) return typeof _oSummary === 'function' ? _oSummary.apply(this, arguments) : undefined;
    try { switchParentTab('ptab-weekly', 'pdtab-weekly'); } catch (e) {}
  };
  const _oExport = window.exportParentData;
  if (typeof _oExport === 'function') window.exportParentData = function () {
    const u = realAs('parent'); if (!u) return _oExport.apply(this, arguments);
    const a = parentActivity();
    const contacts = (typeof MSG_CONTACTS !== 'undefined' && MSG_CONTACTS.parent) ? MSG_CONTACTS.parent : [];
    const data = {
      exportDate: new Date().toISOString(),
      parent: { name: u.name || '', email: u.email },
      teens: pTeens.map(t => ({ name: t.name || '', email: t.email, dob: t.dob || '', city: t.city || '', state: t.state || '', linkCode: t.code || '', linkedAt: t.linkedAt ? new Date(t.linkedAt).toISOString() : '' })),
      applications: a.apps.map(j => ({ title: j.title, employer: j.employer, status: j.status, applied: j.applied, pay: j.pay, city: j.city })),
      ratings: a.ratings.map(r => ({ job: r.job, from: r.from, stars: r.stars, comment: r.comment })),
      notifications: (typeof demoNotifs !== 'undefined' ? demoNotifs : []).slice(0, 50),
      parentalControls: Object.assign({}, typeof parentalControls !== 'undefined' ? parentalControls : {}),
      yourMessages: contacts.map(c => ({ contact: c.name, role: c.role, messageCount: (c.messages || []).length, messages: (c.messages || []).map(m => ({ from: m.from, time: m.time, blocked: !!m.blocked })) })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'teenwork-data-export-' + Date.now() + '.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Data exported successfully!', 'success');
  };

  /* ── 6. Employer screens ────────────────────────────────────────── */
  const empProfile = u => cacheGet(u, 'emp_profile', null) || {};
  const bizName = u => empProfile(u).name || (u && u.name) || '';
  function prepareEmployer(u) {
    const s = signupStash;
    if (!cacheGet(u, 'emp_profile', null) && s && s.type === 'employer' && s.email === emailOf(u) && (s.business || s.city))
      saveMine(u, 'emp_profile', { name: s.business || '', city: s.city || '', state: s.state || '', updatedAt: Date.now() });
  }
  async function syncEmployer() {
    const u = realAs('employer'); if (!u) return;
    const got = await rows(q => q.eq('email', rowKeyOf(u)).eq('key', 'emp_profile'));
    if (!got || me() !== u) return;
    const cloud = got[0] ? parse(got[0].value) : null, local = cacheGet(u, 'emp_profile', null);
    if (cloud && (!local || (cloud.updatedAt || 0) > (local.updatedAt || 0))) { cacheSet(u, 'emp_profile', cloud); applyAll(true); }
    else if (local && !cloud) put(rowKeyOf(u), 'emp_profile', local);
  }
  const postedJobs = () => (typeof employerPostedJobs !== 'undefined' ? employerPostedJobs : []);
  const applicants = () => (typeof demoApplicants !== 'undefined' ? demoApplicants : []);
  function drawEmpProfile(u, real, inputs) {
    const p = real ? empProfile(u) : {};
    realText($('emp-profile-name-display'), real, p.name || u.name || 'Your business');
    realText($('emp-profile-loc-display'), real, [placeOf(p) ? '📍 ' + placeOf(p) : '', p.type || ''].filter(Boolean).join(' · ') || '📍 Add your town and type of work in Edit Profile');
    const verified = [...document.querySelectorAll('#etab-profile .badge.badge-green')].find(b => /Employer profile (not screened)/.test(b.textContent));
    realHide(verified, real);
    realText($('emp-profile-rating-badge'), real, 'No reviews yet');
    realText($('emp-profile-about-display'), real, p.about || 'Tell teens and parents about your business: what you do, the kind of work, and what makes it a good first job. Tap ✏️ Edit Profile.');
    const ex = $('emp-profile-expect-display'); realText(ex && ex.querySelector('p'), real, p.expect || 'Add what teens can expect: hours, pay, equipment and who they work with.');
    if (inputs) {
      realVal($('emp-edit-name'), real, p.name || u.name || '');
      const ab = $('emp-edit-about'), xp = $('emp-edit-expect');
      if (real && ab && ab !== document.activeElement) ab.value = p.about || '';
      if (real && xp && xp !== document.activeElement) xp.value = p.expect || '';
      realSel($('emp-edit-type'), real, p.type || '');
    }
  }
  function patchEmployer(u, real, inputs) {
    const posted = postedJobs(), apps = applicants();
    const vals = [[posted.length, posted.length ? 'Receiving applications' : 'No posts yet'], [apps.filter(a => !a.hired && !a.passed).length, 'This week'],
      [apps.filter(a => a.hired).length, 'This season'], ['—', 'Not enough data yet']];
    document.querySelectorAll('#etab-active .stats-row .stat-card').forEach((c, i) => {
      if (!vals[i]) return;
      realText(c.querySelector('.stat-value'), real, String(vals[i][0])); realText(c.querySelector('.stat-sub'), real, vals[i][1]);
    });
    const jl = $('employer-jobs-list');
    if (real && jl && !jl.children.length) jl.innerHTML = EMPTY('📋', 'No job posts yet', 'Use <strong>Post Job</strong> to add your first one.');
    // reviews and letters were built around one sample worker
    const endorse = $('endorsement-count-badge'); realHide(endorse && endorse.closest('.panel'), real);
    const form = $('rev-text'); realHide(form && form.closest('.panel'), real);
    const inner = $('etab-reviews-inner'); realText(inner && inner.closest('.panel').querySelector('.panel-head h2'), real, '📊 Your Workers');
    const letters = $('etab-letters');
    if (letters) {
      realHide(letters.firstElementChild, real);
      realHide(letters.querySelector('button[onclick^="toggleEmpLetterForm"]'), real);
      let intro = letters.querySelector('[data-tw-letters-intro]');
      if (!intro) { intro = [...letters.querySelectorAll('p')].find(p => /Letters you've written for this worker/.test(p.textContent)); if (intro) intro.dataset.twLettersIntro = '1'; }
      realText(intro, real, 'Letters you write for teens you hire show up here and on their profile.');
    }
    if (inputs) { realVal($('ltr-from'), real, bizName(u)); realVal($('ltr-title'), real, ''); }
    // analytics cards (the numbers are written straight into the page)
    const ana = [['—', 'Not tracked yet'], [apps.length, 'From your job posts'], ['—', 'Views → Applied'], ['—', 'From first apply']];
    document.querySelectorAll('#etab-analytics .stats-row .stat-card').forEach((c, i) => {
      if (!ana[i]) return;
      realText(c.querySelector('.stat-value'), real, String(ana[i][0])); realText(c.querySelector('.stat-sub'), real, ana[i][1]);
    });
    drawEmpProfile(u, real, inputs);
    realHide(document.querySelector('#etab-schedule button[onclick^="empAIFillSchedule"]'), real);
    // the labor-law quick question was written for Vermont; ask about the employer's own state
    const law = document.querySelector('#etab-ai button[data-tw-law]') || document.querySelector('#etab-ai button[onclick*="Vermont state child labor"]');
    if (law) {
      law.dataset.twLaw = '1';
      const st = (real && (empProfile(u).state || u.state)) || 'Vermont';
      const o = orig(law, 'attr:onclick', () => law.getAttribute('onclick'));
      realText(law, real, '📋 ' + st + ' teen labor laws');
      realAttr(law, real, 'onclick', o.replace('Vermont state', st.replace(/['"\\<>]/g, '') + ' state'));
    }
    if (real) {
      if ($('etab-analytics') && $('etab-analytics').classList.contains('active')) window.renderEmpAnalytics();
      if ($('etab-schedule') && $('etab-schedule').classList.contains('active') && typeof renderEmpSchedGrid === 'function') renderEmpSchedGrid();
      if ($('etab-profile') && $('etab-profile').classList.contains('active')) window.renderEmpProfileReviews();
    }
  }
  const _oEmpDash = window.renderEmployerDashboard;
  if (typeof _oEmpDash === 'function') window.renderEmployerDashboard = function () {
    const r = _oEmpDash.apply(this, arguments);
    try { const u = realAs('employer'), jl = $('employer-jobs-list'); if (u && jl && !jl.children.length) jl.innerHTML = EMPTY('📋', 'No job posts yet', 'Use <strong>Post Job</strong> to add your first one.'); } catch (e) {}
    return r;
  };
  const _oAna = window.renderEmpAnalytics;
  window.renderEmpAnalytics = function () {
    if (!realAs('employer')) return typeof _oAna === 'function' ? _oAna.apply(this, arguments) : undefined;
    const table = $('emp-analytics-table'), funnel = $('emp-analytics-funnel'), posted = postedJobs(), apps = applicants();
    if (table) table.innerHTML = posted.length
      ? `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.84rem"><thead><tr style="background:var(--bg)">${['Job', 'Applied', 'Hired', 'Status'].map((h, i) => `<th style="text-align:${i ? 'center' : 'left'};padding:9px 12px;font-weight:700;color:var(--muted);font-size:.74rem;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid var(--border)">${h}</th>`).join('')}</tr></thead><tbody>
        ${posted.map(j => `<tr style="border-bottom:1px solid var(--border)"><td style="padding:10px 12px;font-weight:600">${esc(j.title)}</td><td style="padding:10px 12px;text-align:center">${apps.filter(x => x.job === j.title).length}</td><td style="padding:10px 12px;text-align:center">${apps.filter(x => x.job === j.title && x.hired).length}</td><td style="padding:10px 12px;text-align:center">Active</td></tr>`).join('')}</tbody></table></div>`
      : EMPTY('📊', 'No job posts yet', 'Each job you post gets a row here with its applications and hires.');
    if (funnel) funnel.innerHTML = apps.length ? '' : EMPTY('🔽', 'No applicants yet', 'Your applicant funnel fills in as teens apply to your jobs.');
  };
  const _oProfRev = window.renderEmpProfileReviews;
  window.renderEmpProfileReviews = function () {
    const u = realAs('employer');
    if (!u) return typeof _oProfRev === 'function' ? _oProfRev.apply(this, arguments) : undefined;
    const c = $('emp-profile-review-count'); if (c) c.textContent = '0 reviews';
    realText($('emp-profile-rating-badge'), true, 'No reviews yet');
    const el = $('emp-profile-reviews-list'); if (el) el.innerHTML = EMPTY('⭐', 'No reviews yet', 'Teens you hire can review you after a job. Their reviews show up here.');
  };
  const _oProfSave = window.empProfileSave;
  window.empProfileSave = function () {
    const u = realAs('employer');
    if (!u) return typeof _oProfSave === 'function' ? _oProfSave.apply(this, arguments) : undefined;
    const v = id => String(($(id) || {}).value || '').trim(), p = empProfile(u);
    const next = Object.assign({}, p, { name: v('emp-edit-name') || p.name || u.name || '', type: v('emp-edit-type'), about: v('emp-edit-about'), expect: v('emp-edit-expect'), updatedAt: Date.now() });
    saveMine(u, 'emp_profile', next);
    drawEmpProfile(u, true, false);
    const al = $('emp-profile-save-alert'); if (al) { al.className = 'alert alert-success'; al.textContent = '✅ Profile saved!'; al.style.display = ''; }
    setTimeout(() => { try { empProfileToggleEdit(); } catch (e) {} }, 1200);
    toast('Profile updated!', 'success');
  };
  if (typeof renderEmpSchedGrid === 'function') {
    const _oSched = window.renderEmpSchedGrid;
    window.renderEmpSchedGrid = function () {
      if (!realAs('employer')) return _oSched.apply(this, arguments);
      const grid = $('emp-sched-grid'); if (!grid) return;
      try { const d = _empGetWeekDates(empWeekOffset), lbl = $('emp-cal-label'); if (lbl) lbl.textContent = _empFmtDate(d[0]) + ' – ' + _empFmtDate(d[6]); } catch (e) {}
      grid.innerHTML = `<div style="grid-column:1/-1">${EMPTY('📅', 'No shifts scheduled yet', 'When you hire a teen and agree on shifts, they show up here for you to approve.')}</div>`;
    };
  }
  const _oLetterList = window.renderEmpLetterList;
  if (typeof _oLetterList === 'function') window.renderEmpLetterList = function () {
    const r = _oLetterList.apply(this, arguments);
    try { const c = $('emp-letter-list'); if (realAs('employer') && c && /No letters written yet/.test(c.textContent)) c.innerHTML = '<p style="color:var(--muted);font-size:.85rem;font-style:italic">No letters yet. After you hire a teen, you can write them a letter of recommendation here.</p>'; } catch (e) {}
    return r;
  };

  /* ── 7. Wiring ──────────────────────────────────────────────────── */
  function applyAll(inputs) {
    const u = me(); if (!u || !ROLES.includes(u.type)) return;
    const real = isReal(u);
    try { if (u.type === 'teen') patchTeen(u, real, inputs); } catch (e) { console.warn('real-data teen:', e); }
    try { if (u.type === 'parent') patchParent(u, real); } catch (e) { console.warn('real-data parent:', e); }
    try { if (u.type === 'employer') patchEmployer(u, real, inputs); } catch (e) { console.warn('real-data employer:', e); }
  }
  const _oSignup = window.doSignup;
  if (typeof _oSignup === 'function') window.doSignup = function () {
    try {
      const v = id => String(($(id) || {}).value || '').trim();
      const type = (typeof selectedType !== 'undefined' && selectedType) || window.selectedType || '';
      const emp = type === 'employer';
      signupStash = { type, email: v('su-email').toLowerCase(), business: v('su-business'), city: v(emp ? 'su-emp-city' : 'su-city'), state: v(emp ? 'su-emp-state' : 'su-state'),
        street: emp ? '' : v('su-teen-address'), zip: emp ? '' : v('su-teen-zip') };
      if (type === 'parent' && !window.__twInvite && v('su-invite')) window.__twInvite = v('su-invite');
    } catch (e) {}
    return _oSignup.apply(this, arguments);
  };
  const _oLaunch = window.launchDashboard;
  window.launchDashboard = function () {
    const u = me();
    let invite = '';
    try {
      if (u) {
        useSamplesFor(u);
        if (isReal(u)) {
          if (u.type === 'teen') prepareTeen(u);
          else if (u.type === 'parent') { invite = window.__twInvite || ''; window.__twInvite = ''; prepareParent(u); }
          else if (u.type === 'employer') prepareEmployer(u);
        } else if (u.type === 'parent') {
          try { linkedTeens = []; } catch (e) {}           // the demo parent gets the sample teen again
        }
      }
    } catch (e) { console.warn('real-data prepare failed', e); }
    const r = typeof _oLaunch === 'function' ? _oLaunch.apply(this, arguments) : undefined;
    if (u) {
      [0, 150, 700, 1600].forEach(ms => later(() => { if (me() === u) { if (isReal(u)) useSamplesFor(u); applyAll(ms !== 150); } }, ms));
      if (isReal(u)) {
        if (u.type === 'teen') later(syncTeen, 60);
        if (u.type === 'parent') later(async () => { if (invite) await linkInvite(u, invite); await syncParent(true); }, 60);
        if (u.type === 'employer') later(syncEmployer, 60);
      }
    }
    return r;
  };
  const retab = () => { later(() => applyAll(false), 160); later(() => applyAll(false), 500); };
  ['switchDashTab', 'switchParentTab', 'switchEmployerTab'].forEach(n => {
    const o = window[n]; if (typeof o !== 'function') return;
    window[n] = function () { const r = o.apply(this, arguments); retab(); return r; };
  });
  // a parent's approval, a teen's request or an unlink made on another device
  setInterval(() => {
    const t = realAs('teen'); if (t && teenStatus(t) !== 'approved') syncTeen();
    if (realAs('parent')) syncParent(false);
  }, 20000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (realAs('teen')) syncTeen();
    if (realAs('parent')) syncParent(false);
  });

  window._twRealData = { linkedTeens: () => pTeens.map(t => Object.assign({}, t)), syncParent: () => syncParent(true), syncTeen, isReal: () => isReal(me()), newCode };
})();
