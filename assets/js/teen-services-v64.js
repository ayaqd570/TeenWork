/* ═══════════════════════════════════════════════════════════════════
   v64 · TEEN SERVICE PROFILES  (2026-11-18, Aya's review, item 5:
   "Let teens list what they offer, approved by a parent, so employers can
   browse teens as well as post jobs.")
   • Teen → 🧰 Offer Services (menu group "Jobs & money", and a card on Find
     Jobs until they have a listing): what they can do, a short "about me",
     rate, when they're free, how they get there. The town comes from the
     profile. Sending it asks the teen's linked parent(s) to approve it.
   • Parent → Approvals, "Teen services": the listing exactly as employers
     will see it, then Approve / Ask for changes, and later Take it down.
     Only a parent linked and approved on the teen's own parent_link counts
     (the same rule as parent consent), never anything the teen writes.
   • Employer → 🙋 Find Teens: parent-approved listings only. Employers see
     first name, last initial, age, town and the approved text; never email,
     phone or street. "Ask … to help" sends a request (service, when, where,
     pay, note). The teen says yes, then their parent says OK, and only then
     are they added to each other's contacts so they can message in TeenWork.
   • If a teen edits a live listing, employers keep seeing the version the
     parent approved until the parent approves the new one.
   • Contact details (email, phone, links, social handles, street addresses)
     are refused in listings and requests: people meet through TeenWork.
   • Tester accounts (🧪) only see testers. A tester teen with no parent
     linked skips the parent step, like applying. Demos stay in their sandbox.
   Saved in Supabase user_data (the same open table as the job board):
     <teen>/svc_profile             { listing, listed, age, … }
     <parent>/svc_ok:<teen key>     { approved:{listing, at}|null, last:{sig, decision, note, at} }
     <teen>/svc_req:<id>            a request from an employer
     <employer>/svc_sent            { list:[{ id, teenKey, at }] } the employer's own requests
   Request status: waiting-teen → waiting-parent → accepted, or declined
   (by: teen | parent), or cancelled (by the employer).
   Watches the page instead of wrapping launchDashboard (featpack-v39-cloud-js
   wraps it last). Contacts: registers a source in window._twContactSources,
   which contacts-v47 reads on every sync.
   window.twServices = { sync, state, … } (used by tests).
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twTeenServices64) return;
  window.__twTeenServices64 = true;

  const ROLES = ['teen', 'parent', 'employer'];
  const SERVICES = [
    ['🌿', 'Yard work'], ['❄️', 'Snow shoveling'], ['🐾', 'Pet care'], ['🐕', 'Dog walking'], ['👶', 'Babysitting'],
    ['📚', 'Tutoring'], ['🧹', 'Cleaning'], ['🚗', 'Car washing'], ['💻', 'Tech help'], ['🛒', 'Errands'],
    ['📦', 'Moving & carrying'], ['🎉', 'Party & event help']];
  const WHEN = { school: 'After school', weekend: 'Weekends', evening: 'Evenings', breaks: 'School breaks & summer' };
  const TRAVEL = { walk: ['🚶', 'Can walk'], bike: ['🚲', 'Can bike'], bus: ['🚌', 'Takes the bus'], ride: ['🚗', 'A parent can drive'], drive: ['🚙', 'Drives'] };
  const RATE_TYPES = ['hour', 'job', 'ask'];
  const MAX_SVC = 8, ABOUT_MAX = 300, NOTE_MAX = 300, WHEN_MAX = 80, DAY_CAP = 10, SYNC_MS = 30000;
  const PROFILE = 'svc_profile', OK = 'svc_ok:', REQ = 'svc_req:', SENT = 'svc_sent';
  const OPEN = ['waiting-teen', 'waiting-parent'];
  const STATUSES = ['waiting-teen', 'waiting-parent', 'accepted', 'declined', 'cancelled'];

  /* ── small helpers ──────────────────────────────────────────────── */
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const isReal = u => !!(u && !isDemoUser(u) && !u.isAdmin && ROLES.includes(u.type) && /@/.test(String(u.email || '')));
  const realAs = type => { const u = me(); return isReal(u) && u.type === type ? u : null; };
  const own = u => (u ? String(u.dataKey || u.email || '') : '');            // the user_data "email" column for this account
  const low = s => String(s == null ? '' : s).trim().toLowerCase();
  const emailOf = u => low(u && u.email);
  const baseEmail = k => low(k).replace(/#\d+$/, '');                      // "mom@x.com#2" = an extra account on that email
  function inboxOf(e) {                                                     // the inbox an address really reaches
    e = baseEmail(e); const at = e.lastIndexOf('@'); if (at < 1) return e;
    let local = e.slice(0, at), dom = e.slice(at + 1);
    if (dom === 'gmail.com' || dom === 'googlemail.com') { local = local.split('+')[0].replace(/\./g, ''); dom = 'gmail.com'; }
    return local + '@' + dom;
  }
  const ownInbox = (parentKey, teenKey, tester) => !tester && inboxOf(parentKey) === inboxOf(teenKey);
  const isTester = u => { try { return !!(window._twIsTesterUser && window._twIsTesterUser(u)); } catch (e) { return false; } };
  const isTesterKey = k => { try { return !!(window._twIsTesterEmail && window._twIsTesterEmail(baseEmail(k))); } catch (e) { return false; } };
  const isClosed = k => { try { return !!(window._twClosed && window._twClosed.has(low(k))); } catch (e) { return false; } };
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Text from other accounts: no control characters, tags, backticks or backslashes (it is escaped again when shown)
  const txt = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/[<>`\\]/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, max);
  const parse = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; } };
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const readJSON = (k, d) => { try { const v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch (e) { return d; } };
  const cacheKey = (u, k) => 'tw_' + own(u).replace(/[^a-z0-9]/gi, '_') + '_' + k;   // where _DB keeps its copy of a row
  const cacheGet = (u, k, d) => readJSON(cacheKey(u, k), d);
  const cacheSet = (u, k, v) => lsSet(cacheKey(u, k), v == null ? null : JSON.stringify(v));
  const toast = (m, t) => { try { showToast(m, t || 'success'); } catch (e) {} };
  const later = (fn, ms) => setTimeout(() => { try { const r = fn(); if (r && r.catch) r.catch(e => console.warn('teen-services:', e)); } catch (e) { console.warn('teen-services:', e); } }, ms || 0);
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
  const fmtDate = ts => { const d = new Date(ts || 0); return !ts || isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
  const num = (v, d) => { const n = Number(v); return isFinite(n) ? n : d; };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); }
  function ageFrom(dob) {
    if (!dob) return 0; const b = new Date(/^\d{4}-\d\d-\d\d$/.test(dob) ? dob + 'T00:00' : dob), t = new Date(); if (isNaN(b)) return 0;
    let a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    return a > 0 && a < 120 ? a : 0;
  }
  const iconOf = s => { const hit = SERVICES.find(x => low(x[1]) === low(s)); return hit ? hit[0] : '✳️'; };
  // People meet through TeenWork: no email, phone, links, social handles or street addresses in listings and requests.
  const CONTACT = [
    /[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z0-9.-]+/i,
    /(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/,
    /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|me|co|us|app|ly|gg)\b/i,
    /\b(?:snapchat|instagram|insta|tik ?tok|whats ?app|discord|telegram|kik|facebook)\b|(?:^|\s)@[a-z0-9_.]{3,}/i,
    /\b\d{1,5}\s+(?:[a-z]+\s+){1,2}(?:st|ave|rd|ln|dr|ct|blvd|hwy)\b/i,                          // "12 maple st"
    /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|Avenue|Road|Lane|Drive|Court|Boulevard|Way|Place|Circle|Terrace|Highway)\b/,   // "12 Maple Street"
  ];
  const hasContact = s => CONTACT.some(rx => rx.test(String(s || '')));
  const CONTACT_MSG = 'Please leave out emails, phone numbers, links, social media and street addresses. People reach each other through TeenWork once a parent says OK.';

  /* ── cloud (user_data) ──────────────────────────────────────────── */
  async function client() {
    try { if (typeof _twCloudClient === 'function') return await _twCloudClient(3000); } catch (e) {}
    try { return (typeof sbClient !== 'undefined' && sbClient) || null; } catch (e) { return null; }
  }
  // rows(q => q.eq(...)) → [{email,key,value}], or null when offline / failed
  async function rows(build) {
    const c = await client(); if (!c) return null;
    try { const r = await build(c.from('user_data').select('email,key,value')); return r && !r.error ? (r.data || []) : null; } catch (e) { return null; }
  }
  // the same, for an "in" list that may be long (kept short so the address stays small)
  async function rowsIn(list, build) {
    const out = [];
    for (let i = 0; i < list.length; i += 60) {
      const part = list.slice(i, i + 60), got = await rows(q => build(q, part));
      if (!got) return null;
      got.forEach(r => out.push(r));
    }
    return out;
  }
  async function put(email, key, value) {
    if (!email) return false;
    const c = await client(); if (!c) return false;
    try {
      const r = await c.from('user_data').upsert({ email, key, value: JSON.stringify(value), updated_at: new Date().toISOString() }, { onConflict: 'email,key' });
      return !(r && r.error);
    } catch (e) { return false; }
  }

  /* ── what a listing is ──────────────────────────────────────────── */
  const PUB = ['services', 'about', 'rate', 'rateType', 'when', 'travel', 'first', 'initial', 'city', 'state'];
  const keep = (arr, map) => Object.keys(map).filter(k => Array.isArray(arr) && arr.includes(k));
  // Every listing read from the cloud is rebuilt from known fields (anyone with the app's key can write a row).
  function normListing(l) {
    if (!l || typeof l !== 'object') return null;
    const seen = new Set(), services = [];
    (Array.isArray(l.services) ? l.services : []).forEach(s => { const t = txt(s, 30); if (t && !seen.has(low(t))) { seen.add(low(t)); services.push(t); } });
    const rateType = RATE_TYPES.includes(l.rateType) ? l.rateType : 'ask';
    const rate = Math.round(num(l.rate, 0));
    const out = {
      services: services.slice(0, MAX_SVC), about: txt(l.about, ABOUT_MAX),
      rate: rateType === 'ask' || rate < 1 || rate > 500 ? 0 : rate, rateType: rateType !== 'ask' && (rate < 1 || rate > 500) ? 'ask' : rateType,
      when: keep(l.when, WHEN), travel: keep(l.travel, TRAVEL),
      first: txt(l.first, 30), initial: txt(l.initial, 2).replace(/[^\p{L}]/gu, '').slice(0, 1).toUpperCase(),
      city: txt(l.city, 60), state: txt(l.state, 30),
    };
    return out.services.length && out.first ? out : null;
  }
  const sigOf = l => (l ? hash(JSON.stringify(PUB.map(k => l[k]))) : '');
  function normProfile(v, key) {
    if (!v || typeof v !== 'object') return null;
    const listing = normListing(v.listing); if (!listing) return null;
    return { listing, sig: sigOf(listing), listed: !!v.listed, age: num(v.age, 0) >= 10 && num(v.age, 0) < 25 ? Math.floor(num(v.age, 0)) : 0,
      teenKey: key || String(v.teenKey || ''), updatedAt: num(v.updatedAt, 0) };
  }
  function normOk(v) {
    if (!v || typeof v !== 'object' || typeof v.teenKey !== 'string') return null;
    const r = { teenKey: v.teenKey, parentName: txt(v.parentName, 60), approved: null, last: null };
    const a = v.approved && normListing(v.approved.listing);
    if (a) r.approved = { listing: a, sig: sigOf(a), at: num(v.approved.at, 0) };
    if (v.last && typeof v.last === 'object' && ['approved', 'changes', 'removed'].includes(v.last.decision))
      r.last = { sig: String(v.last.sig || '').slice(0, 20), decision: v.last.decision, note: txt(v.last.note, NOTE_MAX), at: num(v.last.at, 0) };
    return r;
  }
  function normReq(v, teenKey) {
    if (!v || typeof v !== 'object' || !(num(v.id, 0) > 0) || !STATUSES.includes(v.status)) return null;
    if (teenKey && v.teenKey !== teenKey) return null;
    return {
      id: num(v.id, 0), teenKey: String(v.teenKey || ''), teenName: txt(v.teenName, 40), employerKey: String(v.employerKey || ''),
      employerName: txt(v.employerName, 60), business: txt(v.business, 60), service: txt(v.service, 30), when: txt(v.when, WHEN_MAX),
      where: txt(v.where, 60), pay: Math.max(0, Math.round(num(v.pay, 0))), payType: v.payType === 'hour' ? 'hour' : 'job', note: txt(v.note, NOTE_MAX),
      status: v.status, by: v.by === 'parent' ? 'parent' : v.by === 'teen' ? 'teen' : '', noParent: !!v.noParent, test: !!v.test,
      parentEmail: low(v.parentEmail), parentName: txt(v.parentName, 60), createdAt: num(v.createdAt, 0), updatedAt: num(v.updatedAt, 0),
    };
  }
  const withPrefix = (list, p) => (list || []).filter(r => r && typeof r.key === 'string' && typeof r.email === 'string' && r.key.indexOf(p) === 0);
  // A parent counts only while the teen's own link is approved and names them.
  function linkParents(link) {
    if (!link || link.status !== 'approved') return [];
    return [...new Set((Array.isArray(link.parents) ? link.parents : []).concat(link.parentEmail ? [link.parentEmail] : []).map(baseEmail).filter(Boolean))];
  }
  // Where a teen's listing stands, from the teen's own row, their parent link and the parents' decisions.
  function judge(teenKey, prof, link, okRows, tester) {
    const parents = linkParents(link);
    let live = null, changes = null;
    (okRows || []).forEach(r => {
      const v = r.v, pe = baseEmail(r.email);
      if (!v || v.teenKey !== teenKey || !parents.includes(pe) || ownInbox(pe, teenKey, tester) || isClosed(r.email)) return;
      if (v.approved && (!live || v.approved.at > live.at)) live = Object.assign({ by: v.parentName || '', parentKey: r.email }, v.approved);
      if (v.last && v.last.decision === 'changes' && prof && v.last.sig === prof.sig && (!changes || v.last.at > changes.at)) changes = Object.assign({ by: v.parentName || '' }, v.last);
    });
    const listed = !!(prof && prof.listed), solo = !!(tester && !parents.length);
    let state = 'none';
    if (prof && !listed) state = 'paused';
    else if (prof && solo) state = 'live';
    else if (prof && !parents.length) state = 'no-parent';
    else if (prof && live && live.sig === prof.sig) state = 'live';
    else if (prof && changes) state = 'changes';
    else if (prof) state = 'waiting';
    const shown = !listed ? null : solo ? { listing: prof.listing, sig: prof.sig, at: prof.updatedAt, solo: true } : live;
    return { state, parents, live, changes, shown, listed, solo };
  }

  /* ── state per signed-in account ────────────────────────────────── */
  const S = { owner: '', teen: null, parent: null, employer: null, busy: false, lastSync: 0 };
  function reset(u) {
    const k = u && isReal(u) ? u.type + '|' + own(u) : '';
    if (S.owner === k) return false;
    S.owner = k; S.teen = null; S.parent = null; S.employer = null; S.lastSync = 0;
    built.teen = built.employer = '';
    return true;
  }
  const seenGet = u => cacheGet(u, 'svc_seen', {});
  const seenSet = (u, m) => cacheSet(u, 'svc_seen', m);

  /* ════════════════════════ TEEN ════════════════════════════════════ */
  function teenLinkLocal(u) {
    const l = (readJSON('tw_parent_links', {}) || {})[emailOf(u)];
    return (l && l.status) ? l : cacheGet(u, 'parent_link', null) || u.parentLinked || null;
  }
  function teenState(u) {
    if (!S.teen) {
      const raw = cacheGet(u, PROFILE, null);
      S.teen = { prof: normProfile(raw, own(u)), link: teenLinkLocal(u), ok: [], reqs: [], loaded: false };
    }
    return S.teen;
  }
  function teenJudge(u) { const t = teenState(u); return judge(own(u), t.prof, t.link, t.ok, isTester(u)); }
  function townOf(u) {
    const city = txt(u.city, 60), state = txt(u.state, 30);
    if (city || state) return { city, state };
    const a = cacheGet(u, 'account_profile', null) || {};
    return { city: txt(a.city, 60), state: txt(a.state, 30) };
  }
  function teenAge(u) { return ageFrom(u.dob) || (num(u.age, 0) >= 10 && num(u.age, 0) < 25 ? Math.floor(num(u.age, 0)) : 0); }
  async function saveTeenRow(u, prof) {
    const raw = { v: 1, listing: prof.listing, listed: prof.listed, age: teenAge(u), teenKey: own(u), test: isTester(u), updatedAt: prof.updatedAt };
    cacheSet(u, PROFILE, raw);
    const ok = await put(own(u), PROFILE, raw);
    lsSet(cacheKey(u, 'svc_unsent'), ok ? null : '1');
    return ok;
  }
  async function syncTeen(u) {
    const t = teenState(u), key = own(u);
    if (lsGet(cacheKey(u, 'svc_unsent')) && t.prof) await saveTeenRow(u, t.prof);
    const [mine, oks, reqs] = await Promise.all([
      rows(q => q.eq('email', key).in('key', [PROFILE, 'parent_link'])),
      rows(q => q.eq('key', OK + key)),
      rows(q => q.eq('email', key).like('key', REQ + '%')),
    ]);
    if (me() !== u || S.teen !== t) return;
    if (mine) {
      const l = mine.find(r => r.key === 'parent_link'); if (l) t.link = parse(l.value);
      const p = mine.find(r => r.key === PROFILE);
      if (p && !lsGet(cacheKey(u, 'svc_unsent'))) {
        const prof = normProfile(parse(p.value), key);
        if (prof && (!t.prof || prof.updatedAt >= t.prof.updatedAt)) { t.prof = prof; cacheSet(u, PROFILE, parse(p.value)); }
        const age = teenAge(u);                          // keep the age employers see up to date
        if (t.prof && age && num(parse(p.value).age, 0) !== age) saveTeenRow(u, t.prof);
      }
    }
    if (!t.link || !t.link.status) t.link = teenLinkLocal(u);
    if (oks) t.ok = withPrefix(oks, OK + key).filter(r => r.key === OK + key).map(r => ({ email: r.email, v: normOk(parse(r.value)) })).filter(r => r.v);
    if (reqs) t.reqs = withPrefix(reqs, REQ).map(r => normReq(parse(r.value), key)).filter(r => r && r.teenKey === key).sort((a, b) => b.createdAt - a.createdAt);
    t.loaded = true;
    teenNews(u, t);
  }
  function teenNews(u, t) {
    const m = seenGet(u), j = teenJudge(u), first = !Object.keys(m).length, notes = [];
    const ls = j.state + '|' + (j.live ? j.live.sig : '');
    if (m.list && m.list !== ls) {
      if (j.state === 'live' && !j.solo) notes.push(['🎉 Your parent approved your services listing. Employers on TeenWork can see it now.', 'success']);
      else if (j.state === 'changes') notes.push(['✏️ Your parent asked for changes to your services listing. Open Offer Services to see what.', 'info']);
      else if (m.list.indexOf('live|') === 0 && !j.live && j.listed) notes.push(['Your services listing was taken down by your parent.', 'info']);
    }
    m.list = ls;
    t.reqs.forEach(r => {
      const k = 'req:' + r.id, was = m[k];
      if (!was && r.status === 'waiting-teen') notes.push(['📬 ' + (r.business || r.employerName || 'An employer') + ' asked you about ' + r.service + '. Answer it in Offer Services.', 'info']);
      else if (was && was !== r.status) {
        if (r.status === 'accepted') notes.push(['✅ ' + (r.noParent ? 'You said yes to ' : 'Your parent said yes to ') + (r.business || r.employerName) + '. You can message them in Messages now.', 'success']);
        else if (r.status === 'declined' && r.by === 'parent') notes.push(['Your parent said no to the request from ' + (r.business || r.employerName) + '.', 'info']);
        else if (r.status === 'cancelled') notes.push([(r.business || r.employerName) + ' cancelled their request.', 'info']);
      }
      m[k] = r.status;
    });
    seenSet(u, m);
    if (first && notes.length > 1) notes.splice(0, notes.length, ['📬 You have updates in Offer Services.', 'info']);
    notes.slice(0, 2).forEach(n => toast(n[0], n[1]));
    if (t.reqs.some(r => r.status === 'accepted' && m['acc:' + r.id] !== 1)) {
      t.reqs.forEach(r => { if (r.status === 'accepted') m['acc:' + r.id] = 1; }); seenSet(u, m);
      contactsSync();
    }
  }
  function readForm(u) {
    const services = [...document.querySelectorAll('#tw64-form input[name="tw64-svc"]:checked')].map(i => i.value);
    String(($('tw64-other') || {}).value || '').split(',').map(s => txt(s, 30)).filter(Boolean).slice(0, 2).forEach(s => services.push(s));
    const town = townOf(u), parts = String(u.name || '').trim().split(/\s+/);
    const rt = ($('tw64-rate-type') || {}).value;
    return {
      services, about: ($('tw64-about') || {}).value || '', rate: ($('tw64-rate') || {}).value, rateType: RATE_TYPES.includes(rt) ? rt : 'ask',
      when: [...document.querySelectorAll('#tw64-form input[name="tw64-when"]:checked')].map(i => i.value),
      travel: [...document.querySelectorAll('#tw64-form input[name="tw64-travel"]:checked')].map(i => i.value),
      first: parts[0] || '', initial: parts.length > 1 ? parts[parts.length - 1].charAt(0) : '', city: town.city, state: town.state,
    };
  }
  function checkForm(f) {
    if (!f.services.length) return 'Pick at least one thing you can do.';
    if (f.services.length > MAX_SVC) return 'Pick up to ' + MAX_SVC + ' things, so employers can see what you do best.';
    if (!f.first) return 'Add your name in Profile & Settings first.';
    if (!f.city) return 'Add your town in Profile & Settings first, so nearby employers can find you.';
    if (f.rateType !== 'ask' && !(Math.round(num(f.rate, 0)) >= 1 && Math.round(num(f.rate, 0)) <= 500)) return 'Type your rate in dollars (1 to 500), or pick "Let’s talk".';
    if (hasContact(f.about) || f.services.some(hasContact)) return CONTACT_MSG;
    return '';
  }
  async function teenSave() {
    const u = realAs('teen'); if (!u) return;
    const t = teenState(u), f = readForm(u), err = checkForm(f), msg = $('tw64-form-msg');
    if (msg) msg.textContent = err;
    if (err) { toast(err, 'error'); return; }
    const listing = normListing(f);
    if (!listing) { if (msg) msg.textContent = 'Something is missing. Check your services and your name.'; return; }
    const was = teenJudge(u);
    t.prof = { listing, sig: sigOf(listing), listed: true, age: teenAge(u), teenKey: own(u), updatedAt: Date.now() };
    built.dirty = false;
    const ok = await saveTeenRow(u, t.prof);
    const j = teenJudge(u);
    if (!ok) toast('Saved on this device. It will be sent when you’re back online.', 'info');
    else if (j.solo) toast('🧪 Saved. Your listing shows to tester employers (no parent step for tester accounts).', 'success');
    else if (j.state === 'no-parent') toast('Saved. Link a parent so they can approve it. Employers can’t see it until then.', 'info');
    else if (j.state === 'live') toast('Saved. Nothing changed, so your listing stays live.', 'success');
    else toast(was.live ? 'Sent to your parent. Employers keep seeing your approved listing until they OK the new one.' : '📨 Sent to your parent for approval. Employers can see it once they say OK.', 'success');
    drawTeen(true);
  }
  async function teenListed(on) {
    const u = realAs('teen'), t = u && teenState(u); if (!t || !t.prof) return;
    t.prof = Object.assign({}, t.prof, { listed: !!on, updatedAt: Date.now() });
    const ok = await saveTeenRow(u, t.prof);
    toast(on ? (teenJudge(u).state === 'live' ? 'Your listing is showing again.' : 'Your listing is back on. It shows once your parent has approved it.') : 'Your listing is hidden. Employers can’t see it.', ok ? 'success' : 'info');
    drawTeen(true);
  }
  async function teenAnswer(id, yes) {
    const u = realAs('teen'), t = u && teenState(u); if (!t) return;
    const r = t.reqs.find(x => x.id === id); if (!r) return;
    const j = teenJudge(u), solo = j.solo;
    const patch = yes ? (solo ? { status: 'accepted', noParent: true, teenAt: Date.now() } : { status: 'waiting-parent', teenAt: Date.now() }) : { status: 'declined', by: 'teen', teenAt: Date.now() };
    const res = await patchReq(own(u), id, patch, ['waiting-teen']);
    if (res.ok) {
      Object.assign(r, res.rec);
      const m = seenGet(u); m['req:' + id] = r.status; seenSet(u, m);
      toast(!yes ? 'You said no thanks. ' + (r.business || r.employerName) + ' will see "Not this time".' : solo ? '✅ Accepted. You can message ' + (r.business || r.employerName) + ' in Messages.' : '👍 Sent to your parent. Once they say OK you can message ' + (r.business || r.employerName) + '.', 'success');
      if (r.status === 'accepted') contactsSync();
    } else if (res.stale) { if (res.cur) Object.assign(r, res.cur); toast('That request was already updated. Showing the latest.', 'info'); }
    else toast(res.gone ? 'That request is no longer there.' : 'You seem to be offline. Try again when you’re connected.', 'error');
    drawTeen(true);
  }

  /* ════════════════════════ PARENT ══════════════════════════════════ */
  function linkedTeens() { try { return ((window._twRealData && window._twRealData.linkedTeens()) || []).filter(t => t && t.key && !t.pending); } catch (e) { return []; } }
  function parentState(u) { if (!S.parent) S.parent = { teens: [], by: {}, loaded: false }; return S.parent; }
  async function syncParent(u) {
    const p = parentState(u), teens = linkedTeens(), keys = teens.map(t => t.key);
    if (!keys.length) { p.teens = []; p.by = {}; p.loaded = true; return; }
    const [mine, oks, reqs] = await Promise.all([
      rows(q => q.in('email', keys).in('key', [PROFILE, 'parent_link'])),
      rows(q => q.in('key', keys.map(k => OK + k))),
      rows(q => q.in('email', keys).like('key', REQ + '%')),
    ]);
    if (me() !== u || S.parent !== p || !mine || !oks || !reqs) return;
    const by = {};
    teens.forEach(t => {
      const pr = mine.find(r => r.email === t.key && r.key === PROFILE), lk = mine.find(r => r.email === t.key && r.key === 'parent_link');
      by[t.key] = {
        teen: t, prof: pr ? normProfile(parse(pr.value), t.key) : null, link: lk ? parse(lk.value) : null,
        ok: oks.filter(r => r.key === OK + t.key).map(r => ({ email: r.email, v: normOk(parse(r.value)) })).filter(r => r.v),
        reqs: withPrefix(reqs, REQ).filter(r => r.email === t.key).map(r => normReq(parse(r.value), t.key)).filter(Boolean).sort((a, b) => b.createdAt - a.createdAt),
      };
    });
    p.teens = teens; p.by = by; p.loaded = true;
    parentNews(u, p);
  }
  const teenName = t => (t && (t.name || t.email)) || 'Your teen';
  function parentNeeds(u, d) {
    const j = judge(d.teen.key, d.prof, d.link, d.ok, isTester(u));
    const review = !!(d.prof && d.prof.listed && !j.solo && j.parents.length && !(j.live && j.live.sig === d.prof.sig) && !j.changes);
    return { j, review, reqs: d.reqs.filter(r => r.status === 'waiting-parent') };
  }
  function parentNews(u, p) {
    const m = seenGet(u), notes = [];
    p.teens.forEach(t => {
      const d = p.by[t.key]; if (!d) return;
      const who = firstName(teenName(t)), n = parentNeeds(u, d), lk = 'list:' + t.key;
      if (n.review && m[lk] !== d.prof.sig) notes.push(who + ' wants to offer services on TeenWork. Review the listing in Approvals.');
      m[lk] = n.review ? d.prof.sig : '';
      d.reqs.forEach(r => {
        const k = 'req:' + t.key + ':' + r.id;
        if (m[k] !== r.status) {
          if (r.status === 'waiting-parent') notes.push(who + ' said yes to ' + (r.business || r.employerName) + ' (' + r.service + '). It needs your OK in Approvals.');
          else if (r.status === 'waiting-teen' && !m[k]) notes.push((r.business || r.employerName) + ' asked ' + who + ' about ' + r.service + '. You can see it in Approvals.');
        }
        m[k] = r.status;
      });
    });
    seenSet(u, m);
    if (notes.length) {
      try { const list = typeof demoNotifs !== 'undefined' ? demoNotifs : null; if (list) notes.forEach(text => list.unshift({ text, time: 'Just now', read: false, type: 'job-approval' })); } catch (e) {}
      try { if (typeof renderNotifications === 'function') renderNotifications(); } catch (e) {}
      toast(notes.length === 1 ? notes[0] : notes.length + ' teen services updates in Approvals.', 'info');
    }
  }
  function okRowOf(u, d) { const r = d.ok.find(x => x.email === own(u)); return r ? r.v : null; }
  async function parentDecide(teenKey, decision, note) {
    const u = realAs('parent'), p = u && parentState(u), d = p && p.by[teenKey]; if (!d) return;
    if (!d.prof && decision !== 'removed') return;
    const parents = linkParents(d.link), mine = baseEmail(own(u));
    if (!parents.includes(mine)) { toast(teenName(d.teen) + '’s account doesn’t show you as their linked parent yet. Link them again under My Teens.', 'error'); return; }
    if (ownInbox(own(u), teenKey, isTester(u))) { toast('This parent account uses the same email inbox as ' + teenName(d.teen) + '’s account, so it can’t approve. A parent or guardian needs their own email.', 'error'); return; }
    if (decision === 'changes' && hasContact(note)) { toast(CONTACT_MSG, 'error'); return; }
    // read the teen's listing again, so the parent approves exactly what is saved now
    const got = await rows(q => q.eq('email', teenKey).eq('key', PROFILE));
    if (!got) { toast('You seem to be offline. Try again when you’re connected.', 'error'); return; }
    const fresh = got[0] ? normProfile(parse(got[0].value), teenKey) : null;
    if (decision !== 'removed' && (!fresh || fresh.sig !== d.prof.sig)) { if (fresh) d.prof = fresh; toast(firstName(teenName(d.teen)) + ' just changed the listing. Have a look at the new version.', 'info'); drawParent(); return; }
    const cur = okRowOf(u, d) || {}, now = Date.now();
    const rec = { v: 1, teenKey, parentEmail: emailOf(u), parentName: u.name || '', approved: cur.approved ? { listing: cur.approved.listing, at: cur.approved.at } : null, last: null };
    if (decision === 'approved') { rec.approved = { listing: fresh.listing, at: now }; rec.last = { sig: fresh.sig, decision, at: now }; }
    else if (decision === 'changes') rec.last = { sig: fresh.sig, decision, note: txt(note, NOTE_MAX), at: now };
    else { rec.last = { sig: rec.approved ? sigOf(normListing(rec.approved.listing)) : '', decision: 'removed', at: now }; rec.approved = null; }
    if (!(await put(own(u), OK + teenKey, rec))) { toast('That couldn’t be saved. Check your connection and try again.', 'error'); return; }
    const v = normOk(rec), i = d.ok.findIndex(x => x.email === own(u));
    if (i >= 0) d.ok[i] = { email: own(u), v }; else d.ok.push({ email: own(u), v });
    if (fresh) d.prof = fresh;
    const who = firstName(teenName(d.teen));
    toast(decision === 'approved' ? '✅ Approved. Employers on TeenWork can now see ' + who + '’s listing.' : decision === 'changes' ? 'Sent. ' + who + ' will see your note and can update the listing.' : who + '’s listing is taken down. Employers can’t see it any more.', 'success');
    drawParent();
  }
  async function parentAnswer(teenKey, id, yes) {
    const u = realAs('parent'), p = u && parentState(u), d = p && p.by[teenKey]; if (!d) return;
    const r = d.reqs.find(x => x.id === id); if (!r) return;
    if (yes && !linkParents(d.link).includes(baseEmail(own(u)))) { toast(teenName(d.teen) + '’s account doesn’t show you as their linked parent yet.', 'error'); return; }
    const patch = yes ? { status: 'accepted', parentEmail: emailOf(u), parentName: u.name || '', parentAt: Date.now() } : { status: 'declined', by: 'parent', parentEmail: emailOf(u), parentName: u.name || '', parentAt: Date.now() };
    const res = await patchReq(teenKey, id, patch, yes ? ['waiting-parent'] : OPEN);
    if (res.ok) {
      Object.assign(r, res.rec);
      const m = seenGet(u); m['req:' + teenKey + ':' + id] = r.status; seenSet(u, m);
      toast(yes ? '✅ Approved. ' + firstName(teenName(d.teen)) + ' and ' + (r.business || r.employerName) + ' can message each other in TeenWork now.' : 'You said no. ' + (r.business || r.employerName) + ' will see "Not this time".', 'success');
      if (yes) contactsSync();
    } else if (res.stale) { if (res.cur) Object.assign(r, res.cur); toast('That request was already updated. Showing the latest.', 'info'); }
    else toast(res.gone ? 'That request is no longer there.' : 'You seem to be offline. Try again when you’re connected.', 'error');
    drawParent();
  }

  /* ════════════════════════ EMPLOYER ════════════════════════════════ */
  function employerState(u) {
    if (!S.employer) S.employer = { list: [], sent: (cacheGet(u, SENT, { list: [] }).list || []), reqs: [], loaded: false, at: 0 };
    return S.employer;
  }
  function empPlace(u) {
    const p = cacheGet(u, 'emp_profile', null) || {};
    return { city: txt(u.city || p.city, 60), state: txt(u.state || p.state, 30), business: txt(p.name || u.business || u.businessName || '', 60) };
  }
  const normSent = l => (Array.isArray(l) ? l : []).filter(x => x && num(x.id, 0) > 0 && typeof x.teenKey === 'string').map(x => ({ id: num(x.id, 0), teenKey: x.teenKey, at: num(x.at, 0) }));
  async function syncEmployer(u) {
    const e = employerState(u), tester = isTester(u), key = own(u);
    const [profs, oks, sentRow] = await Promise.all([
      rows(q => q.eq('key', PROFILE).limit(3000)),
      rows(q => q.like('key', OK + '%').limit(5000)),
      rows(q => q.eq('email', key).eq('key', SENT)),
    ]);
    if (me() !== u || S.employer !== e) return;
    if (sentRow && sentRow[0]) {
      const cloud = normSent((parse(sentRow[0].value) || {}).list), have = new Set(e.sent.map(x => x.id));
      cloud.forEach(x => { if (!have.has(x.id)) e.sent.push(x); });
      if (e.sent.length > cloud.length) put(key, SENT, { list: e.sent.slice(-300) });
      cacheSet(u, SENT, { list: e.sent.slice(-300) });
    }
    if (profs && oks) {
      const cands = profs.filter(r => r.key === PROFILE && r.email !== key && !isClosed(r.email) && isTesterKey(r.email) === tester)
        .map(r => ({ key: r.email, prof: normProfile(parse(r.value), r.email) })).filter(c => c.prof && c.prof.listed);
      const links = cands.length ? await rowsIn(cands.map(c => c.key), (q, part) => q.in('email', part).eq('key', 'parent_link')) : [];
      if (me() !== u || S.employer !== e) return;
      if (links) {
        const okBy = {};
        withPrefix(oks, OK).forEach(r => { const v = normOk(parse(r.value)); if (v && r.key === OK + v.teenKey) (okBy[v.teenKey] = okBy[v.teenKey] || []).push({ email: r.email, v }); });
        e.list = cands.map(c => {
          const lk = links.find(r => r.email === c.key), link = lk ? parse(lk.value) : null;
          const j = judge(c.key, c.prof, link, okBy[c.key] || [], isTesterKey(c.key));
          return j.shown ? { key: c.key, tok: hash('tw64|' + c.key), listing: j.shown.listing, age: c.prof.age, at: j.shown.at || 0, solo: !!j.shown.solo } : null;
        }).filter(Boolean);
        e.loaded = true; e.error = false; e.at = Date.now();
      } else e.error = !e.loaded;
    } else e.error = !e.loaded;
    const ids = e.sent.map(x => x.id);
    const got = ids.length ? await rowsIn(ids.map(id => REQ + id), (q, part) => q.in('key', part)) : [];
    if (me() !== u || S.employer !== e || !got) return;
    const m = seenGet(u), notes = [];
    e.reqs = withPrefix(got, REQ).map(r => normReq(parse(r.value), r.email)).filter(r => r && r.employerKey === key).sort((a, b) => b.createdAt - a.createdAt);
    e.reqs.forEach(r => {
      const k = 'req:' + r.id, who = r.teenName || 'The teen';
      if (m[k] && m[k] !== r.status) {
        if (r.status === 'accepted') notes.push(['✅ ' + who + (r.noParent ? ' said yes' : ' and their parent said yes') + ' to "' + r.service + '". They are in your Messages now.', 'success']);
        else if (r.status === 'declined') notes.push([who + ' can’t take "' + r.service + '" this time.', 'info']);
        else if (r.status === 'waiting-parent') notes.push(['👍 ' + who + ' is interested in "' + r.service + '". Now their parent decides.', 'info']);
      }
      m[k] = r.status;
    });
    seenSet(u, m);
    notes.slice(0, 2).forEach(n => toast(n[0], n[1]));
    if (e.reqs.some(r => r.status === 'accepted' && m['acc:' + r.id] !== 1)) { e.reqs.forEach(r => { if (r.status === 'accepted') m['acc:' + r.id] = 1; }); seenSet(u, m); contactsSync(); }
  }
  async function sendRequest(t, form) {
    const u = realAs('employer'), e = u && employerState(u); if (!e || !t || !t.key) return { msg: 'That listing is no longer there.' };
    const f = {
      service: txt(form.service, 30), when: txt(form.when, WHEN_MAX), where: txt(form.where, 60),
      pay: Math.round(num(form.pay, 0)), payType: form.payType === 'hour' ? 'hour' : 'job', note: txt(form.note, NOTE_MAX),
    };
    if (!t.listing.services.some(s => low(s) === low(f.service))) return { msg: 'Pick one of the services ' + t.listing.first + ' offers.' };
    if (f.when.length < 3) return { msg: 'Say when you need help (for example "Saturday morning").' };
    if (f.where.length < 2) return { msg: 'Say which town the work is in.' };
    if (!(f.pay >= 1 && f.pay <= 2000)) return { msg: 'Say what you will pay, in whole dollars.' };
    if ([f.when, f.where, f.note].some(hasContact)) return { msg: CONTACT_MSG };
    if (e.reqs.some(r => r.teenKey === t.key && OPEN.includes(r.status))) return { msg: 'You already have a request waiting with ' + t.listing.first + '. Wait for an answer, or cancel it first.' };
    if (e.sent.filter(x => Date.now() - x.at < 864e5).length >= DAY_CAP) return { msg: 'You can send up to ' + DAY_CAP + ' requests a day. Try again tomorrow.' };
    const now = Date.now(), id = now * 1000 + Math.floor(Math.random() * 1000), place = empPlace(u);
    const rec = Object.assign({ v: 1, id, teenKey: t.key, teenName: t.listing.first + (t.listing.initial ? ' ' + t.listing.initial + '.' : ''), employerKey: own(u),
      employerName: txt(u.name, 60), business: place.business, status: 'waiting-teen', test: isTester(u), createdAt: now, updatedAt: now }, f);
    if (!(await put(t.key, REQ + id, rec))) return { msg: 'Your request couldn’t be sent. Check your connection and try again.' };
    e.sent.push({ id, teenKey: t.key, at: now });
    cacheSet(u, SENT, { list: e.sent.slice(-300) });
    put(own(u), SENT, { list: e.sent.slice(-300) });
    e.reqs.unshift(normReq(rec, t.key));
    const m = seenGet(u); m['req:' + id] = 'waiting-teen'; seenSet(u, m);
    return { ok: true, name: t.listing.first };
  }
  async function employerCancel(id) {
    const u = realAs('employer'), e = u && employerState(u), r = e && e.reqs.find(x => x.id === id); if (!r) return;
    const res = await patchReq(r.teenKey, id, { status: 'cancelled', cancelledAt: Date.now() }, OPEN);
    if (res.ok) { Object.assign(r, res.rec); const m = seenGet(u); m['req:' + id] = r.status; seenSet(u, m); toast('Request cancelled.', 'success'); }
    else if (res.stale) { if (res.cur) Object.assign(r, res.cur); toast('That request was already answered. Showing the latest.', 'info'); }
    else toast('You seem to be offline. Try again when you’re connected.', 'error');
    drawEmployer();
  }

  /* ── requests: read the row, check its status is still one we may change, merge, write back ── */
  async function patchReq(teenKey, id, patch, from) {
    const got = await rows(q => q.eq('email', teenKey).eq('key', REQ + id));
    if (!got) return { ok: false };
    const cur = got[0] ? parse(got[0].value) : null;
    if (!cur || cur.teenKey !== teenKey) return { ok: false, gone: true };
    if (from && !from.includes(cur.status)) return { ok: false, stale: true, cur: normReq(cur, teenKey) };
    const next = Object.assign({}, cur, patch, { updatedAt: Date.now() });
    return (await put(teenKey, REQ + id, next)) ? { ok: true, rec: normReq(next, teenKey) } : { ok: false };
  }

  /* ── contacts: an accepted request makes the employer, the teen and the deciding parent contacts ── */
  async function contactSource(u) {
    if (!isReal(u)) return [];
    const out = [];
    if (u.type === 'teen') {
      const got = await rows(q => q.eq('email', own(u)).like('key', REQ + '%'));
      withPrefix(got, REQ).map(r => normReq(parse(r.value), own(u))).filter(r => r && r.status === 'accepted' && r.employerKey)
        .forEach(r => out.push({ key: r.employerKey, name: r.business || r.employerName, role: 'employer', job: r.service, how: 'job' }));
    } else if (u.type === 'parent') {
      const keys = linkedTeens().map(t => t.key);
      const got = keys.length ? await rows(q => q.in('email', keys).like('key', REQ + '%')) : [];
      withPrefix(got, REQ).map(r => normReq(parse(r.value), r.email)).filter(r => r && r.status === 'accepted' && r.employerKey)
        .forEach(r => out.push({ key: r.employerKey, name: r.business || r.employerName, role: 'employer', job: r.service, how: 'job' }));
    } else if (u.type === 'employer') {
      const ids = normSent((cacheGet(u, SENT, { list: [] }) || {}).list).map(x => x.id);
      const got = ids.length ? await rowsIn(ids.map(id => REQ + id), (q, part) => q.in('key', part)) : [];
      withPrefix(got, REQ).map(r => normReq(parse(r.value), r.email)).filter(r => r && r.status === 'accepted' && r.employerKey === own(u)).forEach(r => {
        out.push({ key: r.teenKey, name: r.teenName, role: 'teen', job: r.service, how: 'applicant' });
        if (r.parentEmail) out.push({ key: r.parentEmail, name: r.parentName, role: 'parent', job: r.service, how: 'applicant' });
      });
    }
    return out;
  }
  window._twContactSources = (window._twContactSources || []).concat([contactSource]);
  function contactsSync() { later(() => { try { if (window._twContacts && window._twContacts.sync) return window._twContacts.sync(); } catch (e) {} }, 200); }
  function openMessagesWith(key) {
    try { if (window._twContacts && window._twContacts.showInChat) window._twContacts.showInChat(); } catch (e) {}
    try { openMsgModal(); } catch (e) { return; }
    later(() => {
      try {
        const c = (typeof msgAllContacts !== 'undefined' ? msgAllContacts : []).find(x => x && low(x.cloudKey) === low(key));
        if (c) openMsgChat(c.id);
      } catch (e) {}
    }, 250);
  }

  /* ════════════════════════ SCREENS ═════════════════════════════════ */
  const built = { teen: '', employer: '', filled: -1, dirty: false };
  function ensurePanels() {
    const add = (id, afterId, cls) => {
      if ($(id)) return;
      const ref = $(afterId); if (!ref || !ref.parentNode) return;
      const d = document.createElement('div'); d.id = id; d.className = 'tab-panel ' + cls;
      ref.parentNode.insertBefore(d, ref.nextSibling);
    };
    add('ttab-services', 'ttab-worklog', 'tw64-panel');
    add('etab-teens', 'etab-profile', 'tw64-panel');
  }
  // one listing card, the same for the teen's preview, the parent's review and the employer's list
  function cardHTML(l, o) {
    o = o || {};
    if (!l) return '<div class="tw64-card tw64-empty-card">Pick what you can do and your listing appears here.</div>';
    const rate = l.rateType === 'ask' || !l.rate ? 'Rate: let’s talk' : money(l.rate) + (l.rateType === 'hour' ? '/hour' : ' per job');
    const age = o.age ? ', ' + o.age : '';
    return '<article class="tw64-card">' +
      '<div class="tw64-card-top"><div class="tw64-av" aria-hidden="true">' + esc((l.first || '?').charAt(0).toUpperCase()) + '</div>' +
      '<div class="tw64-who"><div class="tw64-name">' + esc(l.first) + (l.initial ? ' ' + esc(l.initial) + '.' : '') + esc(age) + '</div>' +
      '<div class="tw64-place">📍 ' + esc([l.city, l.state].filter(Boolean).join(', ') || 'Town not set') + '</div></div>' +
      (o.badge ? '<span class="tw64-ok' + (o.wait ? ' wait' : '') + '">' + o.badge + '</span>' : '') + '</div>' +
      '<div class="tw64-chips">' + l.services.map(s => '<span class="tw64-chip">' + iconOf(s) + ' ' + esc(s) + '</span>').join('') + '</div>' +
      (l.about ? '<p class="tw64-about">' + esc(l.about) + '</p>' : '') +
      '<div class="tw64-facts"><span>💵 ' + esc(rate) + '</span>' +
      (l.when.length ? '<span>🗓️ ' + esc(l.when.map(w => WHEN[w]).join(', ')) + '</span>' : '') +
      (l.travel.length ? '<span>' + l.travel.map(t => TRAVEL[t][0] + ' ' + esc(TRAVEL[t][1])).join(' · ') + '</span>' : '') + '</div>' +
      (o.foot || '') + '</article>';
  }
  const reqWhat = r => esc(r.service) + ' · ' + esc(r.when) + ' · ' + esc(r.where) + ' · ' + money(r.pay) + (r.payType === 'hour' ? '/hour' : ' for the job');

  /* ── teen ── */
  function teenFormHTML(u) {
    const town = townOf(u);
    return '<div class="tw64">' +
      '<div class="tw64-intro">' +
      '<p>List what you can do for neighbors and local businesses. <b>Your parent approves your listing from their own account</b> before any employer can see it. ' +
      'Employers see your first name, last initial, age and town, never your email, phone or address.</p></div>' +
      '<div id="tw64-t-status" class="tw64-status" role="status"></div>' +
      '<div class="tw64-cols">' +
      '<form id="tw64-form" class="tw64-box" novalidate>' +
      '<fieldset><legend>What can you do?</legend><div class="tw64-picks">' +
      SERVICES.map(s => '<label class="tw64-pick"><input type="checkbox" name="tw64-svc" value="' + esc(s[1]) + '"><span>' + s[0] + ' ' + esc(s[1]) + '</span></label>').join('') + '</div>' +
      '<label class="tw64-lab" for="tw64-other">Something else? (up to 2, separated by commas)</label><input id="tw64-other" class="tw64-in" maxlength="62" placeholder="e.g. Raking leaves, Window washing" autocomplete="off"></fieldset>' +
      '<label class="tw64-lab" for="tw64-about">About you</label>' +
      '<textarea id="tw64-about" class="tw64-in" maxlength="' + ABOUT_MAX + '" rows="3" placeholder="What are you good at? Any experience, like caring for your own dog or helping a neighbor?"></textarea>' +
      '<div class="tw64-count"><span id="tw64-about-n">0</span>/' + ABOUT_MAX + '</div>' +
      '<fieldset><legend>Your rate</legend><div class="tw64-rate"><span aria-hidden="true">$</span>' +
      '<input id="tw64-rate" class="tw64-in" type="number" min="1" max="500" step="1" inputmode="numeric" aria-label="Rate in dollars">' +
      '<select id="tw64-rate-type" class="tw64-in" aria-label="Rate per"><option value="hour">per hour</option><option value="job">per job</option><option value="ask">Let’s talk</option></select></div></fieldset>' +
      '<fieldset><legend>When are you free?</legend><div class="tw64-picks">' +
      Object.keys(WHEN).map(k => '<label class="tw64-pick"><input type="checkbox" name="tw64-when" value="' + k + '"><span>' + esc(WHEN[k]) + '</span></label>').join('') + '</div></fieldset>' +
      '<fieldset><legend>How do you get there?</legend><div class="tw64-picks">' +
      Object.keys(TRAVEL).map(k => '<label class="tw64-pick"><input type="checkbox" name="tw64-travel" value="' + k + '"><span>' + TRAVEL[k][0] + ' ' + esc(TRAVEL[k][1]) + '</span></label>').join('') + '</div></fieldset>' +
      '<div class="tw64-town">📍 Your town: <b id="tw64-town">' + esc([town.city, town.state].filter(Boolean).join(', ') || 'not set yet') + '</b> ' +
      '<button type="button" class="tw64-link" data-tw64="profile">Change it in Profile &amp; Settings</button></div>' +
      '<div class="tw64-msg" id="tw64-form-msg" role="alert"></div>' +
      '<button type="submit" class="tw64-btn primary" id="tw64-save">Send to my parent for approval</button>' +
      '</form>' +
      '<div class="tw64-side"><div class="tw64-sub">What employers will see</div><div id="tw64-preview"></div><div id="tw64-pause"></div></div>' +
      '</div>' +
      '<div class="tw64-box"><h3 class="tw64-h3">Requests from employers</h3><div id="tw64-t-reqs"></div></div>' +
      '</div>';
  }
  function fillForm(prof) {
    const l = prof && prof.listing; if (!l) return;
    const std = SERVICES.map(s => s[1]);
    document.querySelectorAll('#tw64-form input[name="tw64-svc"]').forEach(i => { i.checked = l.services.includes(i.value); });
    const other = $('tw64-other'); if (other) other.value = l.services.filter(s => !std.includes(s)).join(', ');
    const about = $('tw64-about'); if (about) about.value = l.about || '';
    const rate = $('tw64-rate'); if (rate) rate.value = l.rate ? String(l.rate) : '';
    const rt = $('tw64-rate-type'); if (rt) rt.value = l.rateType;
    document.querySelectorAll('#tw64-form input[name="tw64-when"]').forEach(i => { i.checked = l.when.includes(i.value); });
    document.querySelectorAll('#tw64-form input[name="tw64-travel"]').forEach(i => { i.checked = l.travel.includes(i.value); });
  }
  function teenPreview() {
    const u = realAs('teen'), box = $('tw64-preview'); if (!u || !box) return;
    const f = readForm(u), l = normListing(f), n = $('tw64-about-n');
    if (n) n.textContent = String((($('tw64-about') || {}).value || '').length);
    const j = teenJudge(u), approved = !!(l && j.listed && (j.solo || (j.live && j.live.sig === sigOf(l))));
    const html = cardHTML(l, { age: teenAge(u), badge: j.solo ? '🧪 Tester listing' : approved ? '👪 Parent approved' : '⏳ Needs your parent\u2019s OK', wait: !approved });
    if (box._h !== html) { box.innerHTML = html; box._h = html; }
    const rate = $('tw64-rate'), rt = $('tw64-rate-type'); if (rate && rt) rate.disabled = rt.value === 'ask';
  }
  function statusHTML(u, j, t) {
    const names = (() => { const l = t.link || {}; return l.parentName || 'your parent'; })();
    const live = j.live, when = live && live.at ? fmtDate(live.at) : '';
    switch (j.state) {
      case 'none': return '<div class="tw64-st"><b>Not listed yet.</b> Fill this in, then send it to your parent to approve.</div>';
      case 'paused': return '<div class="tw64-st"><b>⏸ Hidden.</b> Employers can’t see your listing right now.</div><button type="button" class="tw64-btn" data-tw64="show">Show my listing again</button>';
      case 'no-parent': return '<div class="tw64-st warn"><b>🔗 Link a parent first.</b> Your parent approves your listing before employers can see it.</div><button type="button" class="tw64-btn primary" data-tw64="link">Link a parent</button>';
      case 'changes': return '<div class="tw64-st warn"><b>✏️ ' + esc(j.changes.by || 'Your parent') + ' asked for changes:</b> ' + (j.changes.note ? '“' + esc(j.changes.note) + '”' : '(no note)') + '<br>Update your listing below and send it again.' +
        (live ? '<br><span class="tw64-small">Employers still see the version approved on ' + esc(when) + '.</span>' : '') + '</div>';
      case 'waiting': return '<div class="tw64-st wait"><b>⏳ Waiting for ' + esc(names) + '.</b> They approve it under <b>Approvals</b> in their own TeenWork account.' +
        (live ? '<br><span class="tw64-small">Employers still see the version approved on ' + esc(when) + ' until then.</span>' : '') + '</div>';
      case 'live': return j.solo
        ? '<div class="tw64-st ok"><b>🧪 Live for tester employers.</b> Tester accounts with no parent linked skip the parent step. A real account needs a parent’s OK.</div>'
        : '<div class="tw64-st ok"><b>✅ Live.</b> Employers on TeenWork can see your listing' + (live && live.by ? ' (approved by ' + esc(live.by) + (when ? ' on ' + esc(when) : '') + ')' : '') + '.</div>';
    }
    return '';
  }
  function teenReqHTML(r) {
    const who = esc(r.business || r.employerName || 'An employer');
    let st = '', btns = '';
    if (r.status === 'waiting-teen') { st = '<span class="tw64-tag new">New: your answer</span>'; btns = '<button type="button" class="tw64-btn primary" data-tw64="yes" data-id="' + r.id + '">Yes, I’m interested</button><button type="button" class="tw64-btn" data-tw64="no" data-id="' + r.id + '">No thanks</button>'; }
    else if (r.status === 'waiting-parent') st = '<span class="tw64-tag wait">Waiting for your parent’s OK</span>';
    else if (r.status === 'accepted') { st = '<span class="tw64-tag ok">' + (r.noParent ? 'Accepted ✓' : 'Your parent said yes ✓') + '</span>'; btns = '<button type="button" class="tw64-btn primary" data-tw64="msg" data-k="' + esc(r.employerKey) + '">💬 Message ' + who + '</button>'; }
    else if (r.status === 'declined') st = '<span class="tw64-tag no">' + (r.by === 'parent' ? 'Your parent said no' : 'You said no thanks') + '</span>';
    else st = '<span class="tw64-tag no">Cancelled by the employer</span>';
    return '<div class="tw64-req"><div class="tw64-req-top"><b>' + who + '</b>' + st + '</div>' +
      '<div class="tw64-req-what">' + reqWhat(r) + '</div>' + (r.note ? '<p class="tw64-note">“' + esc(r.note) + '”</p>' : '') +
      '<div class="tw64-req-meta">Sent ' + esc(fmtDate(r.createdAt)) + '</div>' + (btns ? '<div class="tw64-acts">' + btns + '</div>' : '') + '</div>';
  }
  function drawTeen(force) {
    const u = realAs('teen'), panel = $('ttab-services'); if (!panel) return;
    if (!u) { if (built.teen) { panel.innerHTML = ''; built.teen = ''; } return; }
    const t = teenState(u);
    if (built.teen !== own(u)) { panel.innerHTML = teenFormHTML(u); built.teen = own(u); built.filled = -1; built.dirty = false; }
    const at = t.prof ? t.prof.updatedAt : 0;
    if (t.prof && at !== built.filled && (force || !built.dirty)) { fillForm(t.prof); built.filled = at; built.dirty = false; }
    const town = townOf(u), tn = $('tw64-town'); if (tn) tn.textContent = [town.city, town.state].filter(Boolean).join(', ') || 'not set yet';
    const j = teenJudge(u), st = $('tw64-t-status');
    const sh = statusHTML(u, j, t); if (st && st._h !== sh) { st.innerHTML = sh; st._h = sh; }
    const save = $('tw64-save');
    if (save) save.textContent = j.solo ? 'Save and show my listing' : !j.parents.length ? 'Save my listing' : t.prof ? 'Save and send to my parent' : 'Send to my parent for approval';
    const pause = $('tw64-pause');
    if (pause) { const h = t.prof && t.prof.listed ? '<button type="button" class="tw64-link" data-tw64="hide">Hide my listing from employers</button>' : ''; if (pause._h !== h) { pause.innerHTML = h; pause._h = h; } }
    teenPreview();
    const rq = $('tw64-t-reqs');
    if (rq) {
      const h = t.reqs.length ? t.reqs.map(teenReqHTML).join('')
        : '<p class="tw64-empty">No requests yet. ' + (j.state === 'live' ? 'Employers who like your listing can ask you to help. You’ll see it here, and your parent will too.' : 'Once your listing is live, employers can ask you to help here.') + '</p>';
      if (rq._h !== h) { rq.innerHTML = h; rq._h = h; }
    }
    drawPromo();
  }
  // Find Jobs: a small card that points to Offer Services until the teen has a listing
  function drawPromo() {
    const u = realAs('teen'), list = $('browse-jobs-list'), holder = list && list.closest('.panel');
    let card = $('tw64-promo');
    const want = !!(u && holder && !teenState(u).prof && !lsGet(cacheKey(u, 'svc_promo_off')));
    if (!want) { if (card) card.remove(); return; }
    if (card) return;
    card = document.createElement('div'); card.id = 'tw64-promo'; card.className = 'tw64-promo';
    card.innerHTML = '<div class="tw64-promo-ic" aria-hidden="true">🧰</div><div class="tw64-promo-tx"><b>Offer your own services</b>' +
      '<span>Mow lawns, walk dogs, babysit? List what you can do. Once your parent approves it, local employers can ask you to help.</span></div>' +
      '<button type="button" class="tw64-btn primary" data-tw64="go-services">Set up my listing</button>' +
      '<button type="button" class="tw64-x" data-tw64="promo-off" aria-label="Hide this">×</button>';
    holder.parentNode.insertBefore(card, holder);
  }

  /* ── parent (a box at the top of Approvals) ── */
  function drawParent() {
    const u = realAs('parent'), host = $('ptab-approvals');
    let box = $('tw64-parent');
    if (!u || !host) { if (box) box.remove(); return; }
    const p = parentState(u), items = [];
    let waiting = 0;
    p.teens.forEach((t, ti) => {
      const d = p.by[t.key]; if (!d) return;
      const n = parentNeeds(u, d), j = n.j, who = firstName(teenName(t));
      if (n.review) {
        waiting++;
        items.push('<div class="tw64-pitem"><div class="tw64-ptitle"><b>' + esc(who) + ' wants to offer services.</b> This is exactly what employers will see:</div>' +
          cardHTML(d.prof.listing, { age: d.prof.age, badge: '👪 Needs your OK', wait: true }) +
          (j.live ? '<p class="tw64-small">Employers see the version you approved on ' + esc(fmtDate(j.live.at)) + ' until you approve this one.</p>' : '') +
          '<p class="tw64-small">Approving shows ' + esc(who) + '’s first name, last initial, age, town and this text to employers on TeenWork. Their email, phone and address are never shown. ' +
          'Any request from an employer comes to you for an OK before they can message each other.</p>' +
          '<div class="tw64-acts"><button type="button" class="tw64-btn primary" data-tw64="p-ok" data-t="' + ti + '" data-k="' + esc(t.key) + '">✅ Approve listing</button>' +
          '<button type="button" class="tw64-btn" data-tw64="p-changes" data-t="' + ti + '" data-k="' + esc(t.key) + '">✏️ Ask for changes</button>' +
          (j.live ? '<button type="button" class="tw64-btn" data-tw64="p-down" data-t="' + ti + '" data-k="' + esc(t.key) + '">Take down the live listing</button>' : '') + '</div>' +
          '<div class="tw64-chg" id="tw64-chg-' + ti + '" hidden><label class="tw64-lab" for="tw64-chg-in-' + ti + '">What should ' + esc(who) + ' change?</label>' +
          '<textarea id="tw64-chg-in-' + ti + '" class="tw64-in" rows="2" maxlength="' + NOTE_MAX + '"></textarea>' +
          '<button type="button" class="tw64-btn primary" data-tw64="p-changes-send" data-t="' + ti + '" data-k="' + esc(t.key) + '">Send to ' + esc(who) + '</button></div></div>');
      } else if (j.changes && d.prof && d.prof.listed) {
        items.push('<div class="tw64-pitem"><div class="tw64-ptitle">You asked ' + esc(who) + ' for changes on ' + esc(fmtDate(j.changes.at)) + (j.changes.note ? ': “' + esc(j.changes.note) + '”' : '.') + ' Waiting for ' + esc(who) + ' to update it.</div></div>');
      } else if (j.live && d.prof && d.prof.listed) {
        items.push('<div class="tw64-pitem tw64-pline"><div>✅ <b>' + esc(who) + '’s services listing is live</b> (approved' + (j.live.by ? ' by ' + esc(j.live.by) : '') + ' on ' + esc(fmtDate(j.live.at)) + ').</div>' +
          '<div class="tw64-acts"><button type="button" class="tw64-btn" data-tw64="p-view" data-t="' + ti + '" data-k="' + esc(t.key) + '">See it</button><button type="button" class="tw64-btn" data-tw64="p-down" data-t="' + ti + '" data-k="' + esc(t.key) + '">Take it down</button></div>' +
          '<div id="tw64-view-' + ti + '" hidden>' + cardHTML(j.live.listing, { age: d.prof.age, badge: '👪 Parent approved' }) + '</div></div>');
      }
      d.reqs.filter(r => r.status !== 'cancelled' || Date.now() - r.updatedAt < 7 * 864e5).slice(0, 12).forEach(r => {
        const emp = esc(r.business || r.employerName || 'An employer');
        let st = '', btns = '';
        if (r.status === 'waiting-parent') { waiting++; st = '<span class="tw64-tag new">Waiting for your OK</span>'; btns = '<button type="button" class="tw64-btn primary" data-tw64="p-req-ok" data-t="' + ti + '" data-k="' + esc(t.key) + '" data-id="' + r.id + '">✅ Approve</button><button type="button" class="tw64-btn" data-tw64="p-req-no" data-t="' + ti + '" data-k="' + esc(t.key) + '" data-id="' + r.id + '">Say no</button>'; }
        else if (r.status === 'waiting-teen') { st = '<span class="tw64-tag wait">Waiting for ' + esc(who) + '’s answer</span>'; btns = '<button type="button" class="tw64-btn" data-tw64="p-req-no" data-t="' + ti + '" data-k="' + esc(t.key) + '" data-id="' + r.id + '">Say no</button>'; }
        else if (r.status === 'accepted') st = '<span class="tw64-tag ok">Approved ✓</span>';
        else if (r.status === 'declined') st = '<span class="tw64-tag no">' + (r.by === 'parent' ? 'You said no' : esc(who) + ' said no thanks') + '</span>';
        else st = '<span class="tw64-tag no">Cancelled by the employer</span>';
        items.push('<div class="tw64-req"><div class="tw64-req-top"><b>' + emp + '</b> asked ' + esc(who) + st + '</div><div class="tw64-req-what">' + reqWhat(r) + '</div>' +
          (r.note ? '<p class="tw64-note">“' + esc(r.note) + '”</p>' : '') +
          (r.status === 'waiting-parent' ? '<p class="tw64-small">If you approve, ' + esc(who) + ' and ' + emp + ' are added to each other’s contacts and can message in TeenWork.</p>' : '') +
          (btns ? '<div class="tw64-acts">' + btns + '</div>' : '') + '</div>');
      });
    });
    if (!items.length) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'tw64-parent'; box.className = 'panel tw64-parent'; host.insertBefore(box, host.firstChild); }
    const open = [...box.querySelectorAll('.tw64-chg:not([hidden]), [id^="tw64-view-"]:not([hidden])')].map(x => x.id);
    const typed = {}; box.querySelectorAll('textarea').forEach(x => { typed[x.id] = x.value; });
    const html = '<div class="panel-head"><h2>🧰 Teen services</h2>' + (waiting ? '<span class="badge badge-amber">' + waiting + ' waiting</span>' : '') + '</div><div class="panel-body">' + items.join('') + '</div>';
    if (box._h === html) return;
    box.innerHTML = html; box._h = html;
    open.forEach(id => { const x = $(id); if (x) x.hidden = false; });
    Object.keys(typed).forEach(id => { const x = $(id); if (x) x.value = typed[id]; });
  }

  /* ── employer ── */
  function employerHTML() {
    return '<div class="tw64">' +
      '<div class="tw64-intro">' +
      '<p>Every listing here was <b>approved by the teen’s parent</b> from their own account. Ask a teen to help: the teen says yes, then their parent says OK, and then you can message each other in TeenWork.</p></div>' +
      '<div class="tw64-filters">' +
      '<label class="tw64-sr" for="tw64-f-svc">Service</label><select id="tw64-f-svc" class="tw64-in"><option value="">All services</option>' + SERVICES.map(s => '<option>' + esc(s[1]) + '</option>').join('') + '</select>' +
      '<label class="tw64-sr" for="tw64-f-town">Town or state</label><input id="tw64-f-town" class="tw64-in" placeholder="📍 Town or state" autocomplete="off">' +
      '<label class="tw64-sr" for="tw64-f-when">When</label><select id="tw64-f-when" class="tw64-in"><option value="">Any time</option>' + Object.keys(WHEN).map(k => '<option value="' + k + '">' + esc(WHEN[k]) + '</option>').join('') + '</select>' +
      '</div>' +
      '<div id="tw64-e-count" class="tw64-small" role="status"></div>' +
      '<div id="tw64-e-list" class="tw64-grid"></div>' +
      '<div class="tw64-box"><h3 class="tw64-h3">Requests you sent</h3><div id="tw64-e-sent"></div></div>' +
      '</div>';
  }
  function employerList(u, e) {
    const svc = low(($('tw64-f-svc') || {}).value), town = low(($('tw64-f-town') || {}).value), when = ($('tw64-f-when') || {}).value || '';
    const place = empPlace(u), myState = low(place.state), myCity = low(place.city);
    return e.list.map((t, i) => ({ t, i })).filter(x => {
      const l = x.t.listing;
      if (svc && !l.services.some(s => low(s) === svc)) return false;
      if (town && !(low(l.city).includes(town) || low(l.state).includes(town))) return false;
      if (when && !l.when.includes(when)) return false;
      return true;
    }).sort((a, b) => {
      const sc = x => (myState && low(x.t.listing.state) === myState ? 2 : 0) + (myCity && low(x.t.listing.city) === myCity ? 1 : 0);
      return sc(b) - sc(a) || b.t.at - a.t.at;
    });
  }
  function sentHTML(r) {
    const who = esc(r.teenName || 'Teen');
    let st = '', btns = '';
    if (r.status === 'waiting-teen') { st = '<span class="tw64-tag wait">Waiting for ' + who + '</span>'; btns = '<button type="button" class="tw64-btn" data-tw64="cancel" data-id="' + r.id + '">Cancel</button>'; }
    else if (r.status === 'waiting-parent') { st = '<span class="tw64-tag wait">' + who + ' said yes · waiting for their parent</span>'; btns = '<button type="button" class="tw64-btn" data-tw64="cancel" data-id="' + r.id + '">Cancel</button>'; }
    else if (r.status === 'accepted') { st = '<span class="tw64-tag ok">Accepted ✓</span>'; btns = '<button type="button" class="tw64-btn primary" data-tw64="msg" data-k="' + esc(r.teenKey) + '">💬 Message ' + who + '</button>'; }
    else if (r.status === 'declined') st = '<span class="tw64-tag no">Not this time</span>';
    else st = '<span class="tw64-tag no">You cancelled</span>';
    return '<div class="tw64-req"><div class="tw64-req-top"><b>' + who + '</b>' + st + '</div><div class="tw64-req-what">' + reqWhat(r) + '</div>' +
      '<div class="tw64-req-meta">Sent ' + esc(fmtDate(r.createdAt)) + '</div>' + (btns ? '<div class="tw64-acts">' + btns + '</div>' : '') + '</div>';
  }
  function drawEmployer() {
    const u = realAs('employer'), panel = $('etab-teens'); if (!panel) return;
    if (!u) { if (built.employer) { panel.innerHTML = ''; built.employer = ''; } return; }
    const e = employerState(u);
    if (built.employer !== own(u)) { panel.innerHTML = employerHTML(); built.employer = own(u); }
    const list = $('tw64-e-list'), count = $('tw64-e-count'), shown = employerList(u, e);
    const open = new Set(e.reqs.filter(r => OPEN.includes(r.status)).map(r => r.teenKey));
    let h;
    if (!e.loaded) h = e.error ? '<p class="tw64-empty">Listings couldn\u2019t load. Check your connection; this page tries again by itself.</p>' : '<p class="tw64-empty">Loading teens near you…</p>';
    else if (!e.list.length) h = '<div class="tw64-empty-box"><b>No teen listings yet.</b><p>When teens list their services and a parent approves, they show up here. You can still post a job: teens near you will see it.</p><button type="button" class="tw64-btn primary" data-tw64="post">📝 Post a job</button></div>';
    else if (!shown.length) h = '<p class="tw64-empty">No listings match. Try another service, town or time.</p>';
    else h = shown.map(x => cardHTML(x.t.listing, {
      age: x.t.age, badge: x.t.solo ? '🧪 Tester listing' : '👪 Parent approved' + (x.t.at ? ' ' + esc(fmtDate(x.t.at)) : ''),
      foot: '<div class="tw64-acts">' + (open.has(x.t.key) ? '<span class="tw64-tag wait">Request sent</span>' : '<button type="button" class="tw64-btn primary" data-tw64="ask" data-tok="' + x.t.tok + '">Ask ' + esc(x.t.listing.first) + ' to help</button>') + '</div>',
    })).join('');
    if (list && list._h !== h) { list.innerHTML = h; list._h = h; }
    const c = e.loaded && e.list.length ? shown.length + ' of ' + e.list.length + ' listing' + (e.list.length === 1 ? '' : 's') : '';
    if (count && count.textContent !== c) count.textContent = c;
    const sent = $('tw64-e-sent');
    if (sent) {
      const s = e.reqs.length ? e.reqs.slice(0, 30).map(sentHTML).join('') : '<p class="tw64-empty">Nothing sent yet. Use "Ask … to help" on a listing.</p>';
      if (sent._h !== s) { sent.innerHTML = s; sent._h = s; }
    }
  }
  let askReturn = null, askTeen = null;
  function openAsk(tok) {
    const u = realAs('employer'), e = u && employerState(u), t = e && e.list.find(x => x.tok === tok); if (!t) return;
    closeAsk();
    askReturn = document.activeElement; askTeen = t;
    const place = empPlace(u), l = t.listing, first = esc(l.first);
    const m = document.createElement('div'); m.id = 'tw64-ask'; m.className = 'tw64-modal';
    m.innerHTML = '<div class="tw64-dialog" role="dialog" aria-modal="true" aria-labelledby="tw64-ask-h">' +
      '<button type="button" class="tw64-x" data-tw64="ask-close" aria-label="Close">×</button>' +
      '<h3 id="tw64-ask-h" class="tw64-h3">Ask ' + first + ' to help</h3>' +
      '<p class="tw64-small">' + first + ' answers first, then their parent decides. You can message each other once both say yes.</p>' +
      '<form id="tw64-ask-form" novalidate>' +
      '<label class="tw64-lab" for="tw64-a-svc">Which service?</label><select id="tw64-a-svc" class="tw64-in">' + l.services.map(s => '<option>' + esc(s) + '</option>').join('') + '</select>' +
      '<label class="tw64-lab" for="tw64-a-when">When?</label><input id="tw64-a-when" class="tw64-in" maxlength="' + WHEN_MAX + '" placeholder="e.g. Saturday Nov 22, 9 to 11 am" autocomplete="off">' +
      '<label class="tw64-lab" for="tw64-a-where">Which town?</label><input id="tw64-a-where" class="tw64-in" maxlength="60" value="' + esc(place.city || l.city) + '" autocomplete="off">' +
      '<label class="tw64-lab" for="tw64-a-pay">What will you pay?</label><div class="tw64-rate"><span aria-hidden="true">$</span><input id="tw64-a-pay" class="tw64-in" type="number" min="1" max="2000" step="1" inputmode="numeric"' + (l.rate ? ' value="' + l.rate + '"' : '') + '>' +
      '<select id="tw64-a-paytype" class="tw64-in" aria-label="Pay per"><option value="hour"' + (l.rateType === 'hour' ? ' selected' : '') + '>per hour</option><option value="job"' + (l.rateType === 'job' ? ' selected' : '') + '>for the job</option></select></div>' +
      '<label class="tw64-lab" for="tw64-a-note">Anything else? (optional)</label><textarea id="tw64-a-note" class="tw64-in" rows="3" maxlength="' + NOTE_MAX + '" placeholder="What the job is, what to bring…"></textarea>' +
      '<div class="tw64-msg" id="tw64-a-msg" role="alert"></div>' +
      '<button type="submit" class="tw64-btn primary wide" id="tw64-a-send">Send request</button></form></div>';
    document.body.appendChild(m);
    later(() => { const f = $('tw64-a-when'); if (f) f.focus(); }, 30);
  }
  function closeAsk() { const m = $('tw64-ask'); if (m) { m.remove(); try { if (askReturn && askReturn.focus && document.contains(askReturn)) askReturn.focus(); } catch (e) {} } askReturn = null; askTeen = null; }
  async function submitAsk() {
    const btn = $('tw64-a-send'), msg = $('tw64-a-msg');
    if (btn) btn.disabled = true;
    const res = await sendRequest(askTeen, { service: $('tw64-a-svc').value, when: $('tw64-a-when').value, where: $('tw64-a-where').value, pay: $('tw64-a-pay').value, payType: $('tw64-a-paytype').value, note: $('tw64-a-note').value });
    if (btn) btn.disabled = false;
    if (!res.ok) { if (msg) msg.textContent = res.msg || 'That didn’t work. Try again.'; return; }
    closeAsk();
    toast('📨 Request sent to ' + res.name + '. You’ll see here when they and their parent answer.', 'success');
    drawEmployer();
  }

  /* ── clicks, typing, keys ── */
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-tw64]'); if (!b) return;
    const a = b.getAttribute('data-tw64'), id = num(b.getAttribute('data-id'), 0), ti = num(b.getAttribute('data-t'), -1);
    const pteen = () => b.getAttribute('data-k') || '';
    switch (a) {
      case 'yes': case 'no': teenAnswer(id, a === 'yes'); break;
      case 'hide': teenListed(false); break;
      case 'show': teenListed(true); break;
      case 'link': try { if (typeof twOpenLinkModal === 'function') twOpenLinkModal(); else switchDashTab(null, 'ttab-resume'); } catch (e) {} break;
      case 'profile': try { switchDashTab(null, 'ttab-resume'); } catch (e) {} break;
      case 'go-services': try { switchDashTab(null, 'ttab-services'); } catch (e) {} break;
      case 'promo-off': { const u = realAs('teen'); if (u) lsSet(cacheKey(u, 'svc_promo_off'), '1'); drawPromo(); break; }
      case 'msg': openMessagesWith(b.getAttribute('data-k')); break;
      case 'p-ok': parentDecide(pteen(), 'approved'); break;
      case 'p-changes': { const x = $('tw64-chg-' + ti); if (x) { x.hidden = !x.hidden; if (!x.hidden) { const t = $('tw64-chg-in-' + ti); if (t) t.focus(); } } break; }
      case 'p-changes-send': { const t = $('tw64-chg-in-' + ti), note = t ? t.value.trim() : ''; if (!note) { toast('Write a short note about what to change.', 'error'); break; } parentDecide(pteen(), 'changes', note); break; }
      case 'p-down': parentDecide(pteen(), 'removed'); break;
      case 'p-view': { const x = $('tw64-view-' + ti); if (x) x.hidden = !x.hidden; break; }
      case 'p-req-ok': case 'p-req-no': parentAnswer(pteen(), id, a === 'p-req-ok'); break;
      case 'ask': openAsk(b.getAttribute('data-tok')); break;
      case 'ask-close': closeAsk(); break;
      case 'cancel': employerCancel(id); break;
      case 'post': try { switchDashTab(null, 'etab-post'); } catch (e) {} break;
    }
  });
  document.addEventListener('click', ev => { const m = $('tw64-ask'); if (m && ev.target === m) closeAsk(); });
  document.addEventListener('submit', ev => {
    if (ev.target && ev.target.id === 'tw64-form') { ev.preventDefault(); teenSave(); }
    else if (ev.target && ev.target.id === 'tw64-ask-form') { ev.preventDefault(); submitAsk(); }
  });
  ['input', 'change'].forEach(type => document.addEventListener(type, ev => {
    const t = ev.target; if (!t || !t.closest) return;
    if (t.closest('#tw64-form')) { built.dirty = true; teenPreview(); const m = $('tw64-form-msg'); if (m && m.textContent) m.textContent = ''; }
    else if (t.closest('.tw64-filters')) drawEmployer();
  }));
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape' || !$('tw64-ask')) return;
    ev.stopPropagation(); closeAsk();
  }, true);

  /* ── wiring: watch who is signed in and which section is open ── */
  function drawAll() { try { drawTeen(); } catch (e) { console.warn('teen-services:', e); } try { drawParent(); } catch (e) { console.warn('teen-services:', e); } try { drawEmployer(); } catch (e) { console.warn('teen-services:', e); } }
  async function sync(force) {
    const u = me();
    if (!isReal(u)) { reset(u); drawAll(); return; }
    if (S.busy || (!force && Date.now() - S.lastSync < 8000)) return;
    S.busy = true; S.lastSync = Date.now();
    try {
      if (u.type === 'teen') await syncTeen(u);
      else if (u.type === 'parent') await syncParent(u);
      else if (u.type === 'employer') await syncEmployer(u);
    } finally { S.busy = false; }
    if (me() === u) drawAll();
  }
  let lastPanel = '';
  function watch() {
    const u = me();
    if (reset(u)) { closeAsk(); drawAll(); if (isReal(u)) { later(() => sync(true), 900); later(() => sync(true), 4000); } return; }
    if (!isReal(u)) return;
    const on = ['ttab-services', 'etab-teens', 'ptab-approvals', 'ttab-browse'].find(id => { const el = $(id); return el && el.classList.contains('active'); }) || '';
    if (on !== lastPanel) { lastPanel = on; drawAll(); if (on && on !== 'ttab-browse') sync(true); }
  }
  ensurePanels();
  ['page-teen', 'page-parent', 'page-employer', 'ttab-services', 'etab-teens', 'ptab-approvals', 'ttab-browse'].forEach(id => {
    const el = $(id); if (el && !el.__tw64) { el.__tw64 = true; new MutationObserver(() => later(watch, 0)).observe(el, { attributes: true, attributeFilter: ['class'] }); }
  });
  setInterval(watch, 1500);
  setInterval(() => { if (document.visibilityState !== 'hidden' && isReal(me())) sync(false); }, SYNC_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && isReal(me())) sync(false); });
  window.addEventListener('tw-supabase-ready', () => { if (isReal(me())) later(() => sync(true), 600); });

  window.twServices = {
    sync: () => sync(true),
    state: () => { const u = me(); if (!isReal(u)) return null; return u.type === 'teen' ? Object.assign({ judge: teenJudge(u) }, teenState(u)) : u.type === 'parent' ? parentState(u) : employerState(u); },
    hasContact, normListing, judge, sigOf,
  };
})();
