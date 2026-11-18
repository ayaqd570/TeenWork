/* ═══════════════════════════════════════════════════════════════════
   v65 · AFTER-JOB WRAP-UP AND REFERENCES  (2026-11-18, Aya's list item 6:
   "When a job ends, prompt for hours and pay, a rating from both sides,
   and a reusable reference for the teen.")
   Before: a hired job just stayed "hired". The Reviews / References tabs
   were sample screens ("Leave a Review for Alex") that saved on one
   browser only, so no rating or reference ever reached a real teen.
   Now, for every teen an employer hired through the job board:
   • When the job is done, both sides get a short wrap-up: hours worked,
     total pay, paid in full or not, a 1-5 star rating of the other side
     and "would you work together again?". The employer also picks a few
     strengths and writes a short reference for the teen.
   • Prompts: a note on the home screen a day after the hire (and as soon
     as the other side has wrapped up), a button on the hired job (teen:
     Applied, employer: Applicants and Active Jobs), and right after an
     employer closes a listing that had a hire. "Not finished yet" waits
     3 days.
   • Hours and pay from both sides are compared. If they don't match,
     both sides and the teen's parent see both numbers. The teen's
     confirmed hours that aren't in their Work Log yet are added to it.
   • Neither side sees the other's stars or the reference until both
     have wrapped up, or 14 days pass, so nobody rates to get even.
     Hours and pay show right away.
   • References: the teen keeps every reference in References, can copy
     it or print / save it as a PDF, and chooses which ones employers see
     on later applications ("📜 References" on the applicant card).
   • Parents see every wrap-up of their linked teens in Ratings, with a
     notice when hours or pay don't match or the teen says they weren't
     paid in full.
   • Ratings of employers belong to the employer trust work (item 3): the
     teen's rating is sent through window.twEmployerTrust.review() when
     that is on the page, and again later if it wasn't yet.
   Saved in Supabase user_data (like the job board):
     <teen key>/job_wrap:<jobId>                   the teen's side
     <employer key>/job_wrap:<jobId>:<teen key>    the employer's side
     <teen key>/ref_hidden                         references the teen hides
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twWrapUp65) return;
  window.__twWrapUp65 = true;

  const REVEAL_MS = 14 * 864e5, NUDGE_AFTER_MS = 864e5, SNOOZE_MS = 3 * 864e5, SYNC_MS = 60000, REFS_MS = 120000;
  const H_TOL = 0.25, PAY_TOL = 0.5, MAX_STRENGTHS = 5;
  const NOTE_MAX = 500, REF_MAX = 800;
  // [label shown on the reference, phrase for "Start from a template"]
  const STRENGTHS = [
    ['On time', 'showed up on time'], ['Reliable', 'did what they said they would'], ['Hard worker', 'worked hard'],
    ['Great attitude', 'kept a great attitude'], ['Self-starter', 'got going without being told'], ['Communicates well', 'kept me in the loop'],
    ['Follows instructions', 'followed instructions carefully'], ['Respectful', 'was polite and respectful'], ['Careful with details', 'paid attention to the details'],
    ['Fast learner', 'learned quickly'], ['Trustworthy', 'could be trusted'], ['Works safely', 'worked carefully and safely'],
  ];

  /* ── helpers ─────────────────────────────────────────────────────── */
  const ROLES = ['teen', 'parent', 'employer'];
  const me = () => { try { if (typeof currentUser !== 'undefined' && currentUser) return currentUser; } catch (e) {} return window.currentUser || null; };
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const isReal = u => !!(u && !isDemoUser(u) && !u.isAdmin && ROLES.includes(u.type) && /@/.test(String(u.email || '')));
  const own = u => (u ? String(u.dataKey || u.email || '') : '');
  const $ = id => document.getElementById(id);
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const readJSON = (k, d) => { try { const v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch (e) { return d; } };
  const parse = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; } };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // text written by other accounts: no tags, entities or control characters (same rule as the job board)
  const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/[<>`\\]/g, '').replace(/[ \t]{2,}/g, ' ').trim().slice(0, max || 80);
  const cleanLong = (s, max) => String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').replace(/[<>`\\]/g, '')
    .replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
  const num = (v, d) => { const n = Number(v); return isFinite(n) ? n : d; };
  const r2 = n => Math.round(n * 100) / 100;
  const money = n => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hrs = n => { const v = Math.round((Number(n) || 0) * 100) / 100; return v + (v === 1 ? ' hour' : ' hours'); };
  const hShort = n => (Math.round((Number(n) || 0) * 100) / 100) + ' h';
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
  const toast = (m, t) => { try { showToast(m, t || 'success'); } catch (e) {} };
  const validId = v => typeof v === 'number' && isFinite(v) && v > 0;
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthYear = t => { const d = new Date(t || Date.now()); return isNaN(d) ? '' : MON[d.getMonth()] + ' ' + d.getFullYear(); };
  const shortDay = t => { const d = new Date(t || Date.now()); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const starText = n => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  const later = (fn, ms) => setTimeout(() => { try { const r = fn(); if (r && r.catch) r.catch(e => console.warn('wrap-up:', e)); } catch (e) { console.warn('wrap-up:', e); } }, ms || 0);

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
    if (!email) return false;
    const c = await client(); if (!c) return false;
    try {
      const r = await c.from('user_data').upsert({ email, key, value: JSON.stringify(value), updated_at: new Date().toISOString() }, { onConflict: 'email,key' });
      return !(r && r.error);
    } catch (e) { return false; }
  }
  const WRAP = 'job_wrap:', APP = 'job_app:', POST = 'job_post:', HIDDEN = 'ref_hidden';
  function keyInfo(key) { const m = /^job_wrap:(\d{1,20})(?::(.+))?$/.exec(String(key || '')); return m ? { jobId: Number(m[1]), teenKey: m[2] || '' } : null; }
  const yn = v => (v === true || v === false ? v : null);

  // Every row is rebuilt from known fields (anyone with the app's key can write a user_data row).
  function normTeen(v, teenKey, jobId) {
    if (!v || num(v.jobId, 0) !== jobId) return null;
    const hours = r2(num(v.hours, 0)), pay = r2(num(v.pay, 0)), stars = Math.round(num(v.stars, 0));
    if (!(hours > 0) || pay < 0 || stars < 1 || stars > 5) return null;
    return {
      v: 1, side: 'teen', jobId, teenKey, employerKey: String(v.employerKey || ''), hours, pay, paid: yn(v.paid), stars, again: yn(v.again),
      note: cleanLong(v.note, NOTE_MAX), at: num(v.at, 0), edited: num(v.edited, 0), trust: ['sent', 'final', 'pending'].includes(v.trust) ? v.trust : 'pending',
      trustTries: num(v.trustTries, 0), title: clean(v.title, 80), employerName: clean(v.employerName, 60),
    };
  }
  function normEmp(v, employerKey, jobId, teenKey) {
    if (!v || num(v.jobId, 0) !== jobId) return null;
    const hours = r2(num(v.hours, 0)), pay = r2(num(v.pay, 0)), stars = Math.round(num(v.stars, 0));
    if (!(hours > 0) || pay < 0 || stars < 1 || stars > 5) return null;
    const known = STRENGTHS.map(s => s[0]);
    return {
      v: 1, side: 'employer', jobId, teenKey, employerKey, hours, pay, paid: yn(v.paid), stars, rehire: yn(v.rehire),
      strengths: (Array.isArray(v.strengths) ? v.strengths : []).map(s => clean(s, 30)).filter(s => known.includes(s)).slice(0, MAX_STRENGTHS),
      text: cleanLong(v.text, REF_MAX), at: num(v.at, 0), edited: num(v.edited, 0),
      title: clean(v.title, 80), business: clean(v.business, 60), teenName: clean(v.teenName, 60),
    };
  }
  function normApp(v, teenKey) {
    if (!v || !validId(num(v.jobId, 0))) return null;
    const job = v.job || {};
    return {
      jobId: num(v.jobId, 0), teenKey, employerKey: String(v.employerKey || ''), status: String(v.status || ''),
      teenName: clean(v.teenName, 60), title: clean(job.title, 80) || 'Job', employerName: clean(job.employer, 60) || 'Employer',
      pay: num(job.pay, 0), payType: job.payType === 'hourly' ? 'hourly' : 'flat', hiredAt: num(v.decidedAt, 0) || num(v.updatedAt, 0) || num(v.appliedAt, 0), test: !!v.test,
    };
  }
  const withRows = (list, test) => (list || []).filter(r => r && typeof r.key === 'string' && typeof r.email === 'string' && test(r));

  /* ── state ───────────────────────────────────────────────────────── */
  let GEN = 0;
  function fresh(u) {
    return { acct: u ? own(u) : '', role: u ? u.type : '', u, items: [], loaded: false, busy: false, gen: ++GEN, at: 0,
      hidden: [], teenNames: {}, applicantRefs: {}, refsAt: 0, refsBusy: false };
  }
  let S = fresh(null);
  const cacheKey = k => 'tw_' + S.acct.replace(/[^a-z0-9]/gi, '_') + '_' + k;
  const cacheGet = (k, d) => readJSON(cacheKey(k), d);
  const cacheSet = (k, v) => lsSet(cacheKey(k), JSON.stringify(v));
  const itemId = (jobId, teenKey) => jobId + '|' + teenKey;
  const findItem = id => S.items.find(i => i.id === id) || null;

  function makeItem(a) {
    return { id: itemId(a.jobId, a.teenKey), jobId: a.jobId, teenKey: a.teenKey, employerKey: a.employerKey, title: a.title, employerName: a.employerName,
      teenName: a.teenName || 'Teen', pay: a.pay, payType: a.payType, hiredAt: a.hiredAt, test: a.test, teen: null, emp: null };
  }
  // apps: hired job_app rows; teenRows / empRows: wrap rows of either side
  function buildItems(apps, teenRows, empRows) {
    const map = {};
    apps.forEach(a => { if (a.status === 'hired') map[itemId(a.jobId, a.teenKey)] = makeItem(a); });
    teenRows.forEach(r => {
      const it = map[itemId(r.jobId, r.teenKey)]; if (!it) return;
      if (r.employerKey && r.employerKey !== it.employerKey) return;          // a row for another job of the same id can't exist; ignore look-alikes
      it.teen = r;
    });
    empRows.forEach(r => { const it = map[itemId(r.jobId, r.teenKey)]; if (it && r.employerKey === it.employerKey) it.emp = r; });
    return Object.keys(map).map(k => map[k]).sort((a, b) => (b.hiredAt || 0) - (a.hiredAt || 0));
  }

  /* ── what each side may see ─────────────────────────────────────── */
  const firstAt = it => Math.min(it.teen ? it.teen.at || Date.now() : Infinity, it.emp ? it.emp.at || Date.now() : Infinity);
  const isOpen = it => !!(it.teen && it.emp) || (isFinite(firstAt(it)) && Date.now() - firstAt(it) >= REVEAL_MS);
  const opensOn = it => (isFinite(firstAt(it)) ? firstAt(it) + REVEAL_MS : 0);
  function compare(it) {
    if (!it.teen || !it.emp) return null;
    const hoursOK = Math.abs(it.teen.hours - it.emp.hours) <= H_TOL, payOK = Math.abs(it.teen.pay - it.emp.pay) <= PAY_TOL;
    return { hoursOK, payOK, same: hoursOK && payOK };
  }
  const notPaid = it => !!((it.teen && it.teen.paid === false) || (it.emp && it.emp.paid === false));
  const mine = it => (S.role === 'teen' ? it.teen : S.role === 'employer' ? it.emp : null);
  const theirs = it => (S.role === 'teen' ? it.emp : S.role === 'employer' ? it.teen : null);
  const otherName = it => (S.role === 'teen' ? it.employerName : firstName(it.teenName) || 'the teen');
  // "needs you": nothing from this side yet
  const waiting = it => (S.role === 'teen' || S.role === 'employer') && !mine(it);
  function snoozed(it) {
    const z = cacheGet('wu_snooze', {})[it.id];
    return !!(z && z.until > Date.now() && z.other === !!theirs(it));       // a snooze ends early when the other side wraps up
  }
  function snooze(it) { const m = cacheGet('wu_snooze', {}); m[it.id] = { until: Date.now() + SNOOZE_MS, other: !!theirs(it) }; cacheSet('wu_snooze', m); }
  const due = it => waiting(it) && (!!theirs(it) || Date.now() - (it.hiredAt || 0) >= NUDGE_AFTER_MS) && !snoozed(it);

  /* ── sync ────────────────────────────────────────────────────────── */
  function linkedTeens() { try { return ((window._twRealData && window._twRealData.linkedTeens()) || []).filter(t => t && t.key); } catch (e) { return []; } }
  async function hiredApps(teenKeys) {
    const got = teenKeys.length ? await rows(q => q.in('email', teenKeys).like('key', APP + '%')) : [];
    if (!got) return null;
    return withRows(got, r => r.key.indexOf(APP) === 0).map(r => normApp(parse(r.value), r.email)).filter(a => a && a.status === 'hired' && a.employerKey);
  }
  async function teenWraps(teenKeys, jobIds) {
    if (!teenKeys.length) return [];
    const got = await rows(q => { q = q.in('email', teenKeys); return jobIds ? q.in('key', jobIds.map(id => WRAP + id)) : q.like('key', WRAP + '%'); });
    if (!got) return null;
    return withRows(got, r => { const k = keyInfo(r.key); return !!k && !k.teenKey; }).map(r => normTeen(parse(r.value), r.email, keyInfo(r.key).jobId)).filter(Boolean);
  }
  async function empWraps(apps) {
    const emails = [...new Set(apps.map(a => a.employerKey))], keys = [...new Set(apps.map(a => WRAP + a.jobId + ':' + a.teenKey))];
    if (!emails.length) return [];
    const got = await rows(q => q.in('email', emails).in('key', keys));
    if (!got) return null;
    return withRows(got, r => { const k = keyInfo(r.key); return !!k && !!k.teenKey; }).map(r => { const k = keyInfo(r.key); return normEmp(parse(r.value), r.email, k.jobId, k.teenKey); }).filter(Boolean);
  }
  async function load(u) {
    const k = own(u);
    if (u.type === 'teen') {
      const [apps, wraps, hid] = await Promise.all([hiredApps([k]), teenWraps([k]), rows(q => q.eq('email', k).eq('key', HIDDEN))]);
      if (!apps || !wraps) return null;
      const emps = await empWraps(apps); if (!emps) return null;
      const h = hid && hid[0] ? parse(hid[0].value) : null;
      return { items: buildItems(apps, wraps, emps), hidden: (h && Array.isArray(h.jobIds) ? h.jobIds : []).map(x => num(x, 0)).filter(validId) };
    }
    if (u.type === 'parent') {
      const teens = linkedTeens(), keys = teens.map(t => t.key);
      const [apps, wraps] = await Promise.all([hiredApps(keys), teenWraps(keys)]);
      if (!apps || !wraps) return null;
      const emps = await empWraps(apps); if (!emps) return null;
      const names = {}; teens.forEach(t => { names[t.key] = t.name || ''; });
      const items = buildItems(apps, wraps, emps);
      items.forEach(it => { if (names[it.teenKey]) it.teenName = clean(names[it.teenKey], 60); });
      return { items };
    }
    if (u.type === 'employer') {
      const posts = await rows(q => q.eq('email', k).like('key', POST + '%'));
      if (!posts) return null;
      const ids = withRows(posts, r => r.key.indexOf(POST) === 0).map(r => num(String(r.key).slice(POST.length), 0)).filter(validId).slice(-300);
      if (!ids.length) return { items: [] };
      const got = await rows(q => q.in('key', ids.map(id => APP + id)));
      if (!got) return null;
      const apps = withRows(got, r => r.key.indexOf(APP) === 0).map(r => normApp(parse(r.value), r.email)).filter(a => a && a.status === 'hired' && a.employerKey === k);
      const teenKeys = [...new Set(apps.map(a => a.teenKey))];
      const [wraps, mineRows] = await Promise.all([teenWraps(teenKeys, [...new Set(apps.map(a => a.jobId))]), rows(q => q.eq('email', k).like('key', WRAP + '%'))]);
      if (!wraps || !mineRows) return null;
      const emps = withRows(mineRows, r => { const x = keyInfo(r.key); return !!x && !!x.teenKey; }).map(r => { const x = keyInfo(r.key); return normEmp(parse(r.value), k, x.jobId, x.teenKey); }).filter(Boolean);
      return { items: buildItems(apps, wraps, emps) };
    }
    return { items: [] };
  }
  async function sync() {
    const u = me();
    if (!isReal(u) || !S.acct || own(u) !== S.acct || S.busy) return;
    S.busy = true; const gen = S.gen;
    try {
      const got = await load(u);
      if (gen !== S.gen || !got) return;
      const first = !S.loaded;
      S.items = got.items; if (got.hidden) S.hidden = got.hidden;
      S.loaded = true; S.at = Date.now();
      announce(first);
      if (S.role === 'teen') { feedRatings(); sendTrust(); }
      redraw();
      if (S.role === 'employer') later(() => applicantRefs(false), 300);
    } finally { if (gen === S.gen) S.busy = false; }
  }

  /* ── tell people what changed ───────────────────────────────────── */
  const sigOf = it => (it.teen ? 't' : '') + (it.emp ? 'e' : '') + (isOpen(it) ? 'o' : '') + (it.teen ? (it.teen.edited || it.teen.at) : '') + '/' + (it.emp ? (it.emp.edited || it.emp.at) : '');
  function announce(first) {
    const seen = cacheGet('wu_seen', {}), notes = [];
    const firstEver = first && !Object.keys(seen).length;
    S.items.forEach(it => {
      const was = seen[it.id], now = sigOf(it);
      seen[it.id] = now;
      if (firstEver || was === now) return;
      const wasT = !!was && was.indexOf('t') === 0, wasE = !!was && /^t?e/.test(was), wasO = !!was && /^t?e?o/.test(was);
      const t = '“' + it.title + '”';
      if (S.role === 'teen') {
        if (it.emp && !wasE) notes.push(it.teen ? '⭐ ' + it.employerName + ' wrapped up ' + t + '. Your rating and reference are in References.'
          : '🧾 ' + it.employerName + ' wrapped up ' + t + '. Add your hours and rating to see your reference.');
        else if (isOpen(it) && !wasO && it.emp) notes.push('⭐ Your reference for ' + t + ' is ready in References.');
      } else if (S.role === 'employer') {
        if (it.teen && !wasT) notes.push(it.emp ? '🧾 ' + firstName(it.teenName) + ' finished their wrap-up for ' + t + '.'
          : '🧾 ' + firstName(it.teenName) + ' wrapped up ' + t + ' (' + hShort(it.teen.hours) + ', ' + money(it.teen.pay) + '). Your turn: rate them and write a short reference.');
      } else if (S.role === 'parent') {
        const who = firstName(it.teenName) || 'Your teen', c = compare(it);
        if (it.teen && !wasT) notes.push(who + ' wrapped up ' + t + ': ' + hrs(it.teen.hours) + ', ' + money(it.teen.pay) + (it.teen.paid === false ? ' (not paid in full yet)' : '') + '.');
        if (it.emp && !wasE) notes.push(it.employerName + ' wrapped up ' + t + ' for ' + who + ': ' + hrs(it.emp.hours) + ', ' + money(it.emp.pay) + '.');
        const numsChanged = !was || was.replace(/^[teo]*/, '') !== now.replace(/^[teo]*/, '');
        if (c && !c.same && numsChanged) notes.push('⚠️ Hours or pay for ' + t + ' don\'t match. ' + who + ': ' + hShort(it.teen.hours) + ', ' + money(it.teen.pay) + '. ' + it.employerName + ': ' + hShort(it.emp.hours) + ', ' + money(it.emp.pay) + '. See Ratings.');
        if (isOpen(it) && it.emp && !wasO) notes.push('⭐ ' + it.employerName + ' rated ' + who + ' ' + it.emp.stars + ' of 5 for ' + t + '.');
      }
    });
    cacheSet('wu_seen', seen);
    if (!notes.length) return;
    if (S.role === 'parent') {
      try { const list = typeof demoNotifs !== 'undefined' ? demoNotifs : null; if (list) notes.forEach(text => list.unshift({ text, time: 'Just now', read: false, type: 'job-wrapup' })); } catch (e) {}
      try { if (typeof window.renderNotifications === 'function') window.renderNotifications(); } catch (e) {}
    }
    toast(notes.length === 1 ? notes[0] : notes[0] + ' (+' + (notes.length - 1) + ' more)', 'info');
  }

  /* ── teen: Work Record ratings, employer trust hook ─────────────── */
  // real-stats-v42 fills the app's rating list for real teens; add the employers' wrap-up ratings to it
  function feedRatings() {
    try {
      if (typeof demoRatings === 'undefined') return;
      for (let i = demoRatings.length - 1; i >= 0; i--) if (demoRatings[i] && demoRatings[i]._tw65) demoRatings.splice(i, 1);
      S.items.filter(it => it.emp && isOpen(it)).forEach(it => demoRatings.push({ _tw65: true, from: it.employerName, job: it.title, stars: it.emp.stars, comment: it.emp.text }));
    } catch (e) {}
  }
  let trustBusy = false;
  async function sendTrust() {
    const hook = window.twEmployerTrust && window.twEmployerTrust.review;
    if (typeof hook !== 'function' || trustBusy || S.role !== 'teen') return;
    trustBusy = true; const gen = S.gen;
    try {
      for (const it of S.items) {
        const t = it.teen; if (!t || t.trust !== 'pending' || t.trustTries >= 5) continue;
        let res = null;
        try { res = await hook({ jobId: String(it.jobId), employer: it.employerKey, rating: t.stars, text: t.note || '' }); } catch (e) { res = { ok: false, error: 'offline' }; }
        if (gen !== S.gen) return;
        const err = res && !res.ok ? String(res.error || '') : '';
        if (['not_set_up', 'offline', 'sign_in', 'too_many'].includes(err)) continue;      // try again on a later visit
        t.trust = res && res.ok ? 'sent' : (['not_hired', 'bad_rating', 'already', 'practice', 'bad_request', 'not_allowed'].includes(err) ? 'final' : 'pending');
        if (t.trust === 'pending') t.trustTries = (t.trustTries || 0) + 1;
        await put(S.acct, WRAP + it.jobId, t);
      }
    } finally { trustBusy = false; }
  }

  /* ── teen: Work Log ─────────────────────────────────────────────── */
  const WL = 'tw_worklog';
  const worklog = () => { const v = parse(lsGet(WL)); return Array.isArray(v) ? v.filter(e => e && typeof e === 'object') : []; };
  const normTitle = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  function logged(it) {
    const t = normTitle(it.title);
    let hours = 0, pay = 0;
    worklog().forEach(e => {
      if (e.wrapJobId != null) return;                                       // ours: the part we added
      const j = normTitle(e.job);
      if (num(e.cloudJobId, 0) === it.jobId || (t.length >= 4 && j.indexOf(t) >= 0)) { hours += num(e.hours, 0); pay += num(e.pay, 0); }
    });
    return { hours: r2(hours), pay: r2(pay) };
  }
  function guessTask(job) {
    const j = String(job || '').toLowerCase();
    if (/babysit|child|kids?\b|nanny|sitter/.test(j)) return 'babysitting';
    if (/dog|cat|pet|walk|feed|horse|animal/.test(j)) return 'pet care';
    if (/lawn|mow|yard|garden|leaf|leaves|rake|snow|shovel|weed|landscap|hedge/.test(j)) return 'yard work';
    if (/clean|wash|dish|vacuum|tidy|laundry|organi/.test(j)) return 'cleaning';
    if (/tech|computer|phone|wifi|router|ipad|laptop|printer/.test(j)) return 'tech help';
    return 'other';
  }
  let lastLogId = 0;
  // the confirmed total minus what the Work Log already has for this job goes in as one entry (or comes out again)
  function syncWorkLog(it, t, day) {
    const have = logged(it), dh = r2(t.hours - have.hours), dp = r2(t.pay - have.pay);
    let log = worklog(); const cur = log.find(e => num(e.wrapJobId, 0) === it.jobId);
    if (dh > 0 || dp > 0) {
      const e = cur || { id: (lastLogId = Math.max(Date.now(), lastLogId + 1)), wrapJobId: it.jobId };
      Object.assign(e, { job: it.title + ' · ' + it.employerName, date: day || (cur && cur.date) || ymd(new Date()), hours: Math.max(0, dh), pay: Math.max(0, dp),
        task: guessTask(it.title), notes: 'From the job wrap-up', source: 'wrapup' });
      if (!cur) log.unshift(e);
    } else if (cur) log = log.filter(e => e !== cur);
    else return null;
    lsSet(WL, JSON.stringify(log));
    try { if (typeof window.twMoneyRedraw === 'function') window.twMoneyRedraw(); } catch (e) {}
    return { hours: Math.max(0, dh), pay: Math.max(0, dp) };
  }

  /* ── the wrap-up window ─────────────────────────────────────────── */
  let lastFocus = null;
  function closeModal() {
    const m = $('tw65-modal'); if (!m) return;
    m.remove(); document.removeEventListener('keydown', onKey, true);
    try { if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); } catch (e) {}
  }
  function onKey(e) {
    const m = $('tw65-modal'); if (!m) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeModal(); return; }
    if (e.key !== 'Tab') return;
    const f = [...m.querySelectorAll('button,input,textarea,select,a[href]')].filter(el => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  function shell(title, sub, body) {
    closeModal();
    lastFocus = document.activeElement;
    const m = document.createElement('div');
    m.id = 'tw65-modal'; m.className = 'tw65-modal';
    m.innerHTML = '<div class="tw65-card" role="dialog" aria-modal="true" aria-labelledby="tw65-h">' +
      '<button type="button" class="tw65-x" aria-label="Close">✕</button>' +
      '<h2 id="tw65-h">' + esc(title) + '</h2>' + (sub ? '<p class="tw65-lead">' + sub + '</p>' : '') + body + '</div>';
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) closeModal(); });
    m.querySelector('.tw65-x').onclick = closeModal;
    document.addEventListener('keydown', onKey, true);
    return m;
  }
  const starsField = (name, legend, value, locked) => '<fieldset class="tw65-stars"' + (locked ? ' disabled' : '') + '><legend>' + esc(legend) + '</legend><div class="tw65-star-row">' +
    [1, 2, 3, 4, 5].map(n => '<label class="tw65-star' + (value >= n ? ' on' : '') + '"><input type="radio" name="' + name + '" value="' + n + '"' + (value === n ? ' checked' : '') + '><span aria-hidden="true">★</span><span class="tw65-sr">' + n + ' star' + (n > 1 ? 's' : '') + '</span></label>').join('') +
    '<span class="tw65-star-word" aria-hidden="true">' + (value ? ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][value] : '') + '</span></div></fieldset>';
  const ynField = (name, legend, value, yes, no, locked) => '<fieldset class="tw65-yn"' + (locked ? ' disabled' : '') + '><legend>' + esc(legend) + '</legend><div class="tw65-yn-row">' +
    '<label class="tw65-pill"><input type="radio" name="' + name + '" value="yes"' + (value === true ? ' checked' : '') + '><span>' + esc(yes) + '</span></label>' +
    '<label class="tw65-pill"><input type="radio" name="' + name + '" value="no"' + (value === false ? ' checked' : '') + '><span>' + esc(no) + '</span></label></div></fieldset>';
  const radioVal = (m, name) => { const r = m.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; };
  function wireStars(m, name) {
    const box = m.querySelector('input[name="' + name + '"]'); if (!box) return;
    const set = () => {
      const v = Number(radioVal(m, name)) || 0;
      m.querySelectorAll('input[name="' + name + '"]').forEach(i => i.parentElement.classList.toggle('on', Number(i.value) <= v));
      const w = box.closest('fieldset').querySelector('.tw65-star-word'); if (w) w.textContent = v ? ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][v] : '';
    };
    m.querySelectorAll('input[name="' + name + '"]').forEach(i => i.addEventListener('change', set));
  }
  function payGuess(it, hours) { return it.payType === 'hourly' && it.pay > 0 && hours > 0 ? r2(it.pay * hours) : it.payType === 'flat' && it.pay > 0 ? it.pay : null; }
  function payLine(it) { return it.pay > 0 ? 'Job pay: ' + money(it.pay) + (it.payType === 'hourly' ? ' an hour' : ' for the job') + '.' : ''; }
  async function safeText(text) {
    if (!text || typeof window.twCheckMessage !== 'function') return null;
    try {
      const d = await Promise.race([window.twCheckMessage(text), new Promise(r => setTimeout(() => r(null), 6000))]);
      return d && d.allowed === false ? (d.title || 'That text can\'t be saved') + (d.message ? ': ' + d.message : '') : null;
    } catch (e) { return null; }
  }

  function openWrap(id) {
    const u = me(); if (!isReal(u) || (S.role !== 'teen' && S.role !== 'employer')) return;
    const it = findItem(id); if (!it) { toast('That job isn\'t loaded yet. Try again in a moment.', 'info'); later(sync, 0); return; }
    const teen = S.role === 'teen', mineRow = mine(it), other = theirs(it), editing = !!mineRow;
    const name = teen ? it.employerName : firstName(it.teenName) || 'this teen';
    const have = teen ? logged(it) : { hours: 0, pay: 0 };
    const h0 = mineRow ? mineRow.hours : other ? other.hours : have.hours || '';
    const p0 = mineRow ? mineRow.pay : other ? other.pay : have.pay || payGuess(it, Number(h0) || 0) || '';
    const paid0 = mineRow ? mineRow.paid : other ? other.paid : null;
    const hints = [];
    if (other) hints.push((teen ? esc(it.employerName) : esc(firstName(it.teenName))) + ' said <b>' + esc(hShort(other.hours)) + '</b> and <b>' + esc(money(other.pay)) + '</b>' + (other.paid === false ? ', not paid in full yet' : '') + '. <button type="button" class="tw65-link" data-tw65-use="1">Use the same numbers</button>');
    if (teen && (have.hours || have.pay)) hints.push('Your Work Log already has ' + esc(hShort(have.hours)) + ' and ' + esc(money(have.pay)) + ' for this job.');
    const pl = payLine(it); if (pl) hints.push(esc(pl));
    let body = '<form class="tw65-form" novalidate>' +
      '<fieldset class="tw65-sec"><legend>' + (editing ? 'Hours and pay' : '1. Hours and pay') + '</legend>' +
      '<div class="tw65-two"><label>Hours worked<input id="tw65-hours" type="number" inputmode="decimal" min="0" max="500" step="0.25" value="' + esc(h0) + '" required></label>' +
      '<label>Total pay for the job ($)<input id="tw65-pay" type="number" inputmode="decimal" min="0" max="20000" step="0.01" value="' + esc(p0 === '' ? '' : Number(p0).toFixed(2)) + '" required></label></div>' +
      ynField('tw65-paid', teen ? 'Have you been paid in full?' : 'Have you paid ' + name + ' in full?', paid0, teen ? 'Yes' : 'Yes, all paid', 'Not yet') +
      (hints.length ? '<p class="tw65-hint">' + hints.join('<br>') + '</p>' : '') +
      (teen ? '<div class="tw65-log" id="tw65-log" hidden><label class="tw65-check"><input type="checkbox" id="tw65-log-on" checked><span id="tw65-log-text"></span></label>' +
        '<label class="tw65-day">Last day you worked<input id="tw65-day" type="date" value="' + esc(ymd(new Date())) + '" max="' + esc(ymd(new Date())) + '"></label></div>' : '') +
      '</fieldset>';
    if (!editing) {
      body += '<fieldset class="tw65-sec"><legend>2. Rate ' + esc(name) + '</legend>' +
        starsField('tw65-stars', teen ? 'How was working for ' + name + '?' : 'How did ' + name + ' do?', 0, false) +
        ynField('tw65-again', teen ? 'Would you work for them again?' : 'Would you hire ' + name + ' again?', null, 'Yes', 'No') +
        (teen ? '<label class="tw65-full">Anything other teens and parents should know? <span class="tw65-opt">(optional)</span><textarea id="tw65-note" rows="3" maxlength="' + NOTE_MAX + '" placeholder="For example: clear instructions, paid on time, safe place to work"></textarea></label>' : '') +
        '<p class="tw65-hint">🔒 ' + esc(teen ? it.employerName : name) + ' won\'t see your stars' + (teen ? '' : ' or reference') + ' until they wrap up too, or 14 days pass. That way nobody rates to get even.</p></fieldset>';
      if (!teen) body += '<fieldset class="tw65-sec"><legend>3. A reference ' + esc(name) + ' can reuse</legend>' +
        '<p class="tw65-hint" style="margin-top:0">' + esc(name) + ' can show this to future employers. Pick up to ' + MAX_STRENGTHS + ' strengths.</p>' +
        '<div class="tw65-chips">' + STRENGTHS.map((s, i) => '<label class="tw65-chip"><input type="checkbox" name="tw65-str" value="' + i + '"><span>' + esc(s[0]) + '</span></label>').join('') + '</div>' +
        '<label class="tw65-full">What did ' + esc(name) + ' do well? <span class="tw65-opt">(a few sentences)</span><textarea id="tw65-text" rows="4" maxlength="' + REF_MAX + '"></textarea></label>' +
        '<button type="button" class="tw65-ghost" id="tw65-tpl">✍️ Start from the strengths I picked</button>' +
        '<p class="tw65-hint">Please leave out phone numbers, addresses and other people\'s names.</p></fieldset>';
    } else {
      body += '<p class="tw65-hint">You rated ' + esc(name) + ' ' + esc(starText(mineRow.stars)) + ' on ' + esc(shortDay(mineRow.at)) + '. Ratings can\'t be changed, but you can fix the hours and pay.</p>';
    }
    body += '<p class="tw65-err" id="tw65-err" role="alert" aria-live="assertive"></p>' +
      '<div class="tw65-actions"><button type="submit" class="tw65-go">' + (editing ? 'Save hours and pay' : 'Finish wrap-up') + '</button>' +
      (editing ? '' : '<button type="button" class="tw65-ghost" id="tw65-notyet">Not finished yet</button>') + '</div></form>';
    const sub = teen ? 'with <b>' + esc(it.employerName) + '</b>' + (it.hiredAt ? ' · hired ' + esc(shortDay(it.hiredAt)) : '')
      : 'with <b>' + esc(it.teenName) + '</b>' + (it.hiredAt ? ' · hired ' + esc(shortDay(it.hiredAt)) : '');
    const m = shell('Wrap up: ' + it.title, sub, body);
    const H = $('tw65-hours'), P = $('tw65-pay'), err = $('tw65-err');
    m.addEventListener('change', () => { err.textContent = ''; });
    m.addEventListener('input', () => { err.textContent = ''; });
    let payTouched = !!mineRow || !!other || !!have.pay;
    P.addEventListener('input', () => { payTouched = true; });
    const logBox = () => {
      if (!teen) return;
      const box = $('tw65-log'); if (!box) return;
      const dh = r2(num(H.value, 0) - have.hours), dp = r2(num(P.value, 0) - have.pay);
      const cur = worklog().find(e => num(e.wrapJobId, 0) === it.jobId);
      box.hidden = !(dh > 0 || dp > 0) || !!cur;
      $('tw65-log-text').textContent = 'Add ' + (dh > 0 ? hShort(dh) : '') + (dh > 0 && dp > 0 ? ' and ' : '') + (dp > 0 ? money(dp) : '') + ' to my Work Log' + (have.hours || have.pay ? ' (the part that isn\'t there yet)' : '');
      if (it.hiredAt) $('tw65-day').min = ymd(new Date(it.hiredAt));
    };
    H.addEventListener('input', () => { if (!payTouched) { const g = payGuess(it, num(H.value, 0)); if (g != null) P.value = g.toFixed(2); } logBox(); });
    P.addEventListener('input', logBox);
    logBox();
    const use = m.querySelector('[data-tw65-use]');
    if (use) use.onclick = () => {
      H.value = other.hours; P.value = Number(other.pay).toFixed(2); payTouched = true;
      if (other.paid != null) { const r = m.querySelector('input[name="tw65-paid"][value="' + (other.paid ? 'yes' : 'no') + '"]'); if (r) r.checked = true; }
      logBox();
    };
    wireStars(m, 'tw65-stars');
    const chips = [...m.querySelectorAll('input[name="tw65-str"]')];
    chips.forEach(c => c.addEventListener('change', () => {
      const n = chips.filter(x => x.checked).length;
      chips.forEach(x => { x.disabled = !x.checked && n >= MAX_STRENGTHS; x.parentElement.classList.toggle('off', x.disabled); });
    }));
    const tpl = $('tw65-tpl');
    if (tpl) tpl.onclick = () => {
      const picked = chips.filter(x => x.checked).map(x => STRENGTHS[Number(x.value)][1]);
      const again = radioVal(m, 'tw65-again'), h = num(H.value, 0);
      const list = picked.length > 1 ? picked.slice(0, -1).join(', ') + ' and ' + picked[picked.length - 1] : picked[0] || 'did a good job';
      $('tw65-text').value = name + ' worked for me on “' + it.title + '”' + (h > 0 ? ' (' + hrs(h) + ')' : '') + '. ' + name + ' ' + list + '.' + (again === 'yes' ? ' I would happily hire ' + name + ' again.' : '');
      $('tw65-text').focus();
    };
    const nY = $('tw65-notyet');
    if (nY) nY.onclick = () => { snooze(it); closeModal(); redraw(); toast('Okay. We\'ll ask again in a few days.', 'info'); };
    m.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      err.textContent = '';
      const hours = r2(num(H.value, NaN)), pay = r2(num(P.value, NaN)), paidV = radioVal(m, 'tw65-paid');
      if (!(hours > 0) || hours > 500) { err.textContent = 'Type the hours worked (more than 0).'; H.focus(); return; }
      if (!(pay >= 0) || P.value === '' || pay > 20000) { err.textContent = 'Type the total pay for the job (0 or more).'; P.focus(); return; }
      if (!paidV) { err.textContent = teen ? 'Say whether you\'ve been paid in full.' : 'Say whether you\'ve paid ' + name + ' in full.'; return; }
      const go = m.querySelector('.tw65-go'), was = go.textContent;
      const now = Date.now();
      let row;
      if (editing) {
        row = Object.assign({}, mineRow, { hours, pay, paid: paidV === 'yes', edited: now });
      } else {
        const stars = Number(radioVal(m, 'tw65-stars')) || 0, again = radioVal(m, 'tw65-again');
        if (!stars) { err.textContent = 'Pick 1 to 5 stars for ' + name + '.'; return; }
        if (!again) { err.textContent = teen ? 'Say whether you\'d work for them again.' : 'Say whether you\'d hire ' + name + ' again.'; return; }
        const text = teen ? cleanLong($('tw65-note').value, NOTE_MAX) : cleanLong($('tw65-text').value, REF_MAX);
        if (!teen && text && text.length < 20) { err.textContent = 'Write a little more for the reference (20 letters or more), or leave it empty.'; $('tw65-text').focus(); return; }
        go.disabled = true; go.textContent = 'Checking…';
        const bad = await safeText(text);
        go.disabled = false; go.textContent = was;
        if (bad) { err.textContent = bad; return; }
        row = teen
          ? { v: 1, side: 'teen', jobId: it.jobId, teenKey: S.acct, employerKey: it.employerKey, hours, pay, paid: paidV === 'yes', stars, again: again === 'yes', note: text, at: now, edited: now, trust: 'pending', trustTries: 0, title: it.title, employerName: it.employerName }
          : { v: 1, side: 'employer', jobId: it.jobId, teenKey: it.teenKey, employerKey: S.acct, hours, pay, paid: paidV === 'yes', stars, rehire: again === 'yes',
            strengths: chips.filter(x => x.checked).map(x => STRENGTHS[Number(x.value)][0]), text, at: now, edited: now, title: it.title, business: bizName(), teenName: it.teenName };
      }
      go.disabled = true; go.textContent = 'Saving…';
      const key = teen ? WRAP + it.jobId : WRAP + it.jobId + ':' + it.teenKey;
      const ok = await put(S.acct, key, row);
      go.disabled = false; go.textContent = was;
      if (!ok) { err.textContent = 'Couldn\'t save. Check your internet connection and try again.'; return; }
      if (teen) it.teen = normTeen(row, S.acct, it.jobId); else it.emp = normEmp(row, S.acct, it.jobId, it.teenKey);
      let added = null;
      if (teen) { const lb = $('tw65-log'), on = lb && !lb.hidden && $('tw65-log-on').checked; if (on || worklog().some(x => num(x.wrapJobId, 0) === it.jobId)) added = syncWorkLog(it, it.teen, on ? $('tw65-day').value : ''); }
      const seen = cacheGet('wu_seen', {}); seen[it.id] = sigOf(it); cacheSet('wu_seen', seen);
      closeModal();
      const c = compare(it);
      toast(editing ? '✅ Hours and pay updated.' + (c && !c.same ? ' They still don\'t match the other side.' : '')
        : '✅ Wrapped up! ' + (added && (added.hours || added.pay) ? 'Added ' + hShort(added.hours) + ' and ' + money(added.pay) + ' to your Work Log. ' : '') + (other ? (c && !c.same ? 'Your hours or pay don\'t match theirs. Your parent can see both.' : 'You can both see the ratings now.') : 'We\'ll let ' + (teen ? it.employerName : firstName(it.teenName)) + ' know.'), c && !c.same ? 'info' : 'success');
      if (teen) { feedRatings(); sendTrust(); }
      redraw();
    });
    setTimeout(() => { try { (H.value ? m.querySelector(editing ? '#tw65-hours' : 'input[name="tw65-stars"]') : H).focus(); } catch (e2) {} }, 30);
  }
  function bizName() {
    try { const p = readJSON('tw_' + S.acct.replace(/[^a-z0-9]/gi, '_') + '_emp_profile', null); if (p && p.name) return clean(p.name, 60); } catch (e) {}
    return clean((S.u && (S.u.biz || S.u.name)) || 'Employer', 60);
  }

  /* ── references (shown, copied, printed) ────────────────────────── */
  function refOf(it) {
    const e = it.emp, c = compare(it);
    return { id: it.id, jobId: it.jobId, from: e.business || it.employerName, title: it.title, teenName: it.teenName, hours: c && c.hoursOK ? it.teen.hours : e.hours,
      agreed: !!(c && c.hoursOK), stars: e.stars, rehire: e.rehire, strengths: e.strengths, text: e.text, at: e.at, when: monthYear(it.hiredAt || e.at) };
  }
  function refCard(r, opts) {
    opts = opts || {};
    return '<article class="tw65-ref">' +
      '<div class="tw65-ref-top"><div><div class="tw65-ref-from">' + esc(r.from) + '</div><div class="tw65-ref-job">' + esc(r.title) + ' · ' + esc(r.when) + ' · ' + esc(hrs(r.hours)) + (r.agreed ? ' (both agreed)' : '') + '</div></div>' +
      '<div class="tw65-ref-stars" aria-label="' + r.stars + ' out of 5 stars">' + esc(starText(r.stars)) + '</div></div>' +
      (r.rehire === true ? '<span class="tw65-tag ok">👍 Would hire again</span>' : r.rehire === false ? '<span class="tw65-tag">Wouldn\'t hire again</span>' : '') +
      (r.strengths.length ? '<div class="tw65-ref-str">' + r.strengths.map(s => '<span class="tw65-tag">' + esc(s) + '</span>').join('') + '</div>' : '') +
      (r.text ? '<blockquote class="tw65-ref-text">' + esc(r.text).replace(/\n/g, '<br>') + '</blockquote>' : '<p class="tw65-muted">No written reference, just the rating and strengths.</p>') +
      (opts.actions || '') + '</article>';
  }
  function refPlain(r) {
    return ['Reference for ' + r.teenName, 'From: ' + r.from + ' (employer on TeenWork)', 'Job: ' + r.title + ', ' + r.when + ', ' + hrs(r.hours),
      'Rating: ' + r.stars + ' out of 5' + (r.rehire === true ? ', would hire again' : ''), r.strengths.length ? 'Strengths: ' + r.strengths.join(', ') : '',
      r.text ? '"' + r.text + '"' : '', 'Written on TeenWork on ' + shortDay(r.at) + ' after the job was finished. TeenWork does not check employers\' identity.'].filter(Boolean).join('\n');
  }
  async function copyRef(r) {
    const text = refPlain(r);
    try { await navigator.clipboard.writeText(text); toast('📋 Reference copied. Paste it into an application or email.', 'success'); return; } catch (e) {}
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    toast(ok ? '📋 Reference copied.' : 'Couldn\'t copy here. Use Print / Save as PDF instead.', ok ? 'success' : 'info');
  }
  function printRef(r) {
    let box = $('tw65-print'); if (box) box.remove();
    box = document.createElement('div'); box.id = 'tw65-print';
    box.innerHTML = '<div class="tw65-p-brand">🌳 TeenWork · Job reference</div><h1>Reference for ' + esc(r.teenName) + '</h1>' + refCard(r) +
      '<p class="tw65-p-foot">Written on TeenWork on ' + esc(shortDay(r.at)) + ' after the job was finished. TeenWork does not check employers\' identity.</p>';
    document.body.appendChild(box);
    document.documentElement.classList.add('tw65-printing');
    const done = () => { document.documentElement.classList.remove('tw65-printing'); const b = $('tw65-print'); if (b) b.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { try { window.print(); } catch (e) {} setTimeout(done, 1500); }, 60);
  }
  async function setHidden(jobId, hide) {
    const list = new Set(S.hidden); if (hide) list.add(jobId); else list.delete(jobId);
    S.hidden = [...list];
    const ok = await put(S.acct, HIDDEN, { jobIds: S.hidden, at: Date.now() });
    toast(ok ? (hide ? 'Hidden from employers. Only you and your parent see it.' : 'Employers will see it when you apply.') : 'Couldn\'t save. Try again when you\'re online.', ok ? 'success' : 'info');
  }

  /* ── employers: the references an applicant shares ──────────────── */
  async function applicantRefs(force) {
    if (S.role !== 'employer' || S.refsBusy || (!force && Date.now() - S.refsAt < REFS_MS)) return;
    const list = (typeof demoApplicants !== 'undefined' ? demoApplicants : []).filter(a => a && a._jb && a._teenKey && !a.passed);
    const keys = [...new Set(list.map(a => a._teenKey))];
    if (!keys.length) return;
    S.refsBusy = true; const gen = S.gen;
    try {
      const [apps, wraps, hid] = await Promise.all([hiredApps(keys), teenWraps(keys), rows(q => q.in('email', keys).eq('key', HIDDEN))]);
      if (!apps || !wraps || gen !== S.gen) return;
      const emps = await empWraps(apps); if (!emps || gen !== S.gen) return;
      const hidden = {}; withRows(hid || [], () => true).forEach(r => { const v = parse(r.value); hidden[r.email] = new Set((v && Array.isArray(v.jobIds) ? v.jobIds : []).map(x => num(x, 0))); });
      const out = {};
      buildItems(apps, wraps, emps).forEach(it => {
        // the employer's own references are on its Reviews page; here only what other employers wrote
        if (!it.emp || !isOpen(it) || it.employerKey === S.acct || (hidden[it.teenKey] && hidden[it.teenKey].has(it.jobId))) return;
        (out[it.teenKey] = out[it.teenKey] || []).push(refOf(it));
      });
      S.applicantRefs = out; S.refsAt = Date.now();
      decorateKanban();
    } finally { if (gen === S.gen) S.refsBusy = false; }
  }
  function openApplicantRefs(teenKey, name) {
    const list = S.applicantRefs[teenKey] || [];
    const avg = list.length ? (list.reduce((s, r) => s + r.stars, 0) / list.length).toFixed(1) : '';
    shell('References for ' + name, list.length ? list.length + ' reference' + (list.length === 1 ? '' : 's') + ' from past TeenWork jobs · average ' + esc(avg) + ' ★' : '',
      (list.length ? list.map(r => refCard(r)).join('') : '<p class="tw65-muted">No shared references yet.</p>') +
      '<p class="tw65-hint">Written by employers after a finished job. ' + esc(firstName(name)) + ' chooses which ones to share. TeenWork does not check employers\' identity.</p>');
  }

  /* ── drawing ─────────────────────────────────────────────────────── */
  const quote = s => '“' + s + '”';
  function statusLine(it) {
    const my = mine(it), th = theirs(it), c = compare(it), who = esc(otherName(it));
    if (!my && th) return S.role === 'teen' ? who + ' wrapped up this job and wrote you a reference. ' + (isOpen(it) ? 'It\'s in References. Add your hours and rating too.' : 'Add your hours and rating to see it.') : who + ' wrapped up this job (' + esc(hShort(th.hours)) + ', ' + esc(money(th.pay)) + '). Your turn: rate them and write a short reference.';
    if (!my) return 'When the job is done, wrap it up: hours, pay and a quick rating' + (S.role === 'employer' ? ', plus a reference the teen can reuse.' : '.');
    if (!th) return '✓ Wrapped up (' + esc(hShort(my.hours)) + ', ' + esc(money(my.pay)) + '). Waiting for ' + who + '.' + (isOpen(it) ? '' : ' Ratings show once they wrap up too, or on ' + esc(shortDay(opensOn(it))) + '.');
    if (c && !c.same) return '⚠️ Hours or pay don\'t match. You: ' + esc(hShort(my.hours)) + ', ' + esc(money(my.pay)) + '. ' + who + ': ' + esc(hShort(th.hours)) + ', ' + esc(money(th.pay)) + '.';
    return '✓ Wrapped up. You both agree: ' + esc(hShort(my.hours)) + ', ' + esc(money(my.pay)) + '.' + (th.stars ? ' ' + who + ' gave ' + esc(starText(th.stars)) + '.' : '');
  }
  function actionBtn(it, small) {
    const my = mine(it), c = compare(it), cls = small ? 'btn-sm tw65-btn-sm' : 'tw65-btn';
    if (!my) return '<button type="button" class="' + cls + ' tw65-primary" data-tw65="wrap" data-id="' + esc(it.id) + '">✅ ' + (theirs(it) ? 'Wrap it up' : S.role === 'teen' ? 'Job finished? Wrap it up' : 'Job done? Wrap it up') + '</button>';
    const b = c && !c.same ? '✏️ Fix my hours and pay' : '✏️ Edit hours and pay';
    let out = '<button type="button" class="' + cls + '" data-tw65="wrap" data-id="' + esc(it.id) + '">' + b + '</button>';
    if (S.role === 'teen' && it.emp && isOpen(it)) out += '<button type="button" class="' + cls + '" data-tw65="refs">📜 See my reference</button>';
    return out;
  }
  function strip(it) { return '<div class="tw65-strip" data-tw65-item="' + esc(it.id) + '"><p>' + statusLine(it) + '</p><div class="tw65-strip-btns">' + actionBtn(it, true) + '</div></div>'; }

  // teen: Applied cards (drawn by real-data-v43, labels by job-board-v45)
  function decorateApplied() {
    if (S.role !== 'teen' || !S.loaded) return;
    const apps = (typeof demoJobs !== 'undefined' ? demoJobs : []).filter(j => j && !(typeof j.id === 'number' && j.id >= 1 && j.id <= 12));
    document.querySelectorAll('#teen-applications-list .job-card').forEach((card, i) => {
      const j = apps[i], old = card.querySelector('.tw65-strip');
      const it = j && j._jb && j.status === 'accepted' ? findItem(itemId(j.id, S.acct)) : null;
      const title = card.querySelector('.job-title');
      if (!it || !title || title.textContent.trim() !== String(j.title || '').trim()) { if (old) old.remove(); return; }
      const html = strip(it);
      if (old && old.outerHTML === html) return;
      if (old) old.outerHTML = html; else card.insertAdjacentHTML('beforeend', html);
    });
  }
  // employer: hired cards in the Applicant Pipeline, and "📜 References" on every real applicant
  function decorateKanban() {
    if (S.role !== 'employer') return;
    const list = typeof demoApplicants !== 'undefined' ? demoApplicants : [];
    document.querySelectorAll('#emp-kanban-board [ondragstart]').forEach(card => {
      const mm = /_kDragging=(\d+)/.exec(card.getAttribute('ondragstart') || ''); const a = mm ? list[+mm[1]] : null;
      if (!a || !a._jb) return;
      const row = card.querySelector('.btn-msg') && card.querySelector('.btn-msg').parentElement; if (!row) return;
      const it = a.hired && S.loaded ? findItem(itemId(a._jobId, a._teenKey)) : null;
      const old = card.querySelector('.tw65-kstrip');
      if (it) {
        const html = '<div class="tw65-kstrip" data-tw65-item="' + esc(it.id) + '">' + (mine(it) ? '<span class="tw65-tag ok">✓ Wrapped up</span>' + (compare(it) && !compare(it).same ? '<span class="tw65-tag warn">Numbers differ</span>' : '') : theirs(it) ? '<span class="tw65-tag warn">' + esc(firstName(a.name)) + ' wrapped up</span>' : '') + actionBtn(it, true) + '</div>';
        if (!old || old.outerHTML !== html) { if (old) old.remove(); row.insertAdjacentHTML('afterend', html); }
      } else if (old) old.remove();
      const refs = S.applicantRefs[a._teenKey] || [], rb = row.querySelector('[data-tw65="aprefs"]');
      if (refs.length) {
        const avg = (refs.reduce((s, r) => s + r.stars, 0) / refs.length).toFixed(1), label = '📜 ' + refs.length + ' · ' + avg + '★';
        if (!rb) row.insertAdjacentHTML('beforeend', '<button type="button" class="btn-sm tw65-btn-sm" data-tw65="aprefs" data-key="' + esc(a._teenKey) + '" data-name="' + esc(a.name) + '" title="References from past jobs" aria-label="' + refs.length + ' references from past jobs, average ' + avg + ' stars">' + esc(label) + '</button>');
        else if (rb.textContent !== label) rb.textContent = label;
      } else if (rb) rb.remove();
    });
  }
  // employer: hired teens under each posting in Active Jobs
  function decorateJobs() {
    if (S.role !== 'employer' || !S.loaded) return;
    const posted = typeof employerPostedJobs !== 'undefined' ? employerPostedJobs : [];
    document.querySelectorAll('#employer-jobs-list .job-card').forEach((card, i) => {
      const j = posted[i], old = card.querySelector('.tw65-jobs');
      const its = j && j._jb ? S.items.filter(it => it.jobId === j.id) : [];
      if (!its.length) { if (old) old.remove(); return; }
      const html = '<div class="tw65-jobs">' + its.map(it => '<div class="tw65-jobs-row"><b>' + esc(it.teenName) + '</b> · hired' + strip(it) + '</div>').join('') + '</div>';
      if (old && old.outerHTML === html) return;
      if (old) old.remove();
      const acts = card.querySelector('.job-actions'); if (acts) acts.insertAdjacentHTML('beforebegin', html); else card.insertAdjacentHTML('beforeend', html);
    });
  }
  // the home screen note: one job at a time, the most urgent first
  function drawNudge() {
    const home = S.role === 'teen' ? $('ttab-browse') : S.role === 'employer' ? $('etab-post') : null;
    const old = $('tw65-nudge');
    if (!home || !S.loaded) { if (old) old.remove(); return; }
    const list = S.items.filter(due).sort((a, b) => (theirs(b) ? 1 : 0) - (theirs(a) ? 1 : 0));
    const it = list[0];
    if (!it) { if (old) old.remove(); return; }
    const t = esc(quote(it.title)), who = esc(otherName(it));
    const text = S.role === 'teen'
      ? (it.emp ? '<b>' + who + ' wrapped up ' + t + '</b> and wrote you a reference. ' + (isOpen(it) ? 'It\'s in References. Add your hours and rating too.' : 'Add your hours and rating to see it.') : '<b>Is ' + t + ' for ' + who + ' finished?</b> Wrap it up to log your hours and pay and get a reference you can reuse.')
      : (it.teen ? '<b>' + who + ' wrapped up ' + t + '</b> (' + esc(hShort(it.teen.hours)) + ', ' + esc(money(it.teen.pay)) + '). Your turn: confirm the hours and pay, rate ' + who + ' and write a short reference.'
        : '<b>Is ' + t + ' with ' + who + ' done?</b> Wrap it up: confirm hours and pay, rate ' + who + ' and write a reference they can reuse.');
    const html = '<div id="tw65-nudge" class="tw65-nudge" role="note" data-tw65-item="' + esc(it.id) + '"><span class="tw65-nudge-ico" aria-hidden="true">🧾</span><p>' + text + (list.length > 1 ? ' <span class="tw65-muted">(' + (list.length - 1) + ' more)</span>' : '') + '</p>' +
      '<div class="tw65-nudge-btns"><button type="button" class="tw65-btn tw65-primary" data-tw65="wrap" data-id="' + esc(it.id) + '">Wrap it up</button>' +
      (it.emp && S.role === 'teen' || it.teen && S.role === 'employer' ? '' : '<button type="button" class="tw65-btn" data-tw65="snooze" data-id="' + esc(it.id) + '">Not finished yet</button>') + '</div></div>';
    if (old && old.outerHTML === html) return;
    if (old) old.remove();
    home.insertAdjacentHTML('afterbegin', html);
  }
  const EMPTY = (ico, h, p) => '<div class="tw65-empty"><div class="tw65-empty-ico" aria-hidden="true">' + ico + '</div><div class="tw65-empty-h">' + h + '</div><p>' + p + '</p></div>';
  // teen: References tab
  function drawTeenRefs() {
    const tab = $('ttab-references'); if (!tab || S.role !== 'teen') return;
    [...tab.children].forEach(c => { if (c.id !== 'tw65-refs' && c.classList.contains('panel')) c.style.display = 'none'; });
    const sub = tab.querySelector('p');
    if (sub) { if (sub.dataset.tw65Orig == null) sub.dataset.tw65Orig = sub.textContent; sub.textContent = 'What employers wrote after a finished job. Reuse them for every job after.'; }
    let box = $('tw65-refs');
    if (!box) { box = document.createElement('div'); box.id = 'tw65-refs'; box.className = 'tw65-panel'; tab.appendChild(box); }
    const refs = S.items.filter(it => it.emp && isOpen(it)), locked = S.items.filter(it => it.emp && !isOpen(it)), todo = S.items.filter(it => !it.teen && !it.emp);
    const badge = $('teen-refs-badge');
    if (badge) { const avg = refs.length ? (refs.reduce((s, it) => s + it.emp.stars, 0) / refs.length).toFixed(1) : ''; badge.textContent = refs.length + ' Reference' + (refs.length === 1 ? '' : 's') + (avg ? ' · ' + avg + '★' : ''); }
    let html = '';
    if (!S.loaded) html = '<p class="tw65-muted">Loading your references…</p>';
    else {
      if (locked.length) html += locked.map(it => '<div class="tw65-lock"><span aria-hidden="true">🔒</span><p><b>' + esc(it.employerName) + '</b> wrote you a reference for ' + esc(quote(it.title)) + '. ' + (it.teen ? 'It opens on ' + esc(shortDay(opensOn(it))) + '.' : 'Wrap up the job to see it.') + '</p>' + (it.teen ? '' : actionBtn(it, true)) + '</div>').join('');
      if (todo.length) html += '<div class="tw65-sub">Jobs to wrap up</div>' + todo.map(it => '<div class="tw65-row"><div class="tw65-row-h"><b>' + esc(it.title) + '</b> · ' + esc(it.employerName) + '</div>' + strip(it) + '</div>').join('');
      if (refs.length) {
        html += '<div class="tw65-sub">Your references</div><p class="tw65-hint" style="margin-top:0">Copy one into an application, or print it / save it as a PDF. Employers on TeenWork see the ones you share when you apply.</p>';
        html += refs.map(it => {
          const r = refOf(it), hid = S.hidden.includes(it.jobId);
          return refCard(r, { actions: '<div class="tw65-ref-acts"><button type="button" class="btn-sm tw65-btn-sm" data-tw65="copy" data-id="' + esc(it.id) + '">📋 Copy</button>' +
            '<button type="button" class="btn-sm tw65-btn-sm" data-tw65="print" data-id="' + esc(it.id) + '">🖨️ Print or save as PDF</button>' +
            '<label class="tw65-check"><input type="checkbox" data-tw65="share" data-job="' + it.jobId + '"' + (hid ? '' : ' checked') + '><span>Show to employers when I apply</span></label></div>' });
        }).join('');
      } else if (!locked.length) html += EMPTY('📜', 'No references yet', 'When you finish a job, your employer rates you and can write a short reference. It shows up here, and you can reuse it for every job after.');
    }
    if (box.innerHTML !== html) box.innerHTML = html;
  }
  // employer: Reviews tab (the sample "Leave a Review for Alex" screen)
  function drawEmpReviews() {
    const tab = $('etab-reviews'); if (!tab || S.role !== 'employer') return;
    [...tab.children].forEach(c => { if (c.id !== 'tw65-emp' && c.classList.contains('panel')) c.style.display = 'none'; });
    let box = $('tw65-emp');
    if (!box) { box = document.createElement('div'); box.id = 'tw65-emp'; box.className = 'tw65-panel'; tab.appendChild(box); }
    const todo = S.items.filter(it => !it.emp), done = S.items.filter(it => it.emp);
    let html = '<h2 class="tw65-h2">⭐ Wrap-ups and references</h2><p class="tw65-hint" style="margin-top:0">When a job is done, confirm the hours and pay, rate the teen, and write a short reference they can reuse for future jobs.</p>';
    if (!S.loaded) html += '<p class="tw65-muted">Loading…</p>';
    else if (!S.items.length) html += EMPTY('🧾', 'No finished jobs yet', 'When you hire a teen through TeenWork, their job shows up here so you can wrap it up.');
    else {
      if (todo.length) html += '<div class="tw65-sub">To wrap up</div>' + todo.map(it => '<div class="tw65-row"><div class="tw65-row-h"><b>' + esc(it.teenName) + '</b> · ' + esc(it.title) + '</div>' + strip(it) + '</div>').join('');
      if (done.length) html += '<div class="tw65-sub">Wrapped up</div>' + done.map(it => '<div class="tw65-row"><div class="tw65-row-h"><b>' + esc(it.teenName) + '</b> · ' + esc(it.title) + '</div>' + strip(it) +
        refCard(Object.assign(refOf(it), { from: 'Your reference' })) + (it.teen && isOpen(it) ? '<p class="tw65-hint">' + esc(firstName(it.teenName)) + ' rated working for you ' + esc(starText(it.teen.stars)) + (it.teen.again === true ? ' and would work for you again' : '') + '.</p>' : '') + '</div>').join('');
    }
    if (box.innerHTML !== html) box.innerHTML = html;
  }
  // parent: Ratings tab
  function parentList() {
    if (!S.loaded) return '';
    if (!S.items.length) return '';
    return '<div id="tw65-parent" class="tw65-panel-in">' + S.items.map(it => {
      const who = esc(firstName(it.teenName) || 'Your teen'), c = compare(it), open = isOpen(it);
      const side = (label, r) => r ? '<div class="tw65-side"><div class="tw65-side-h">' + label + '</div><div>' + esc(hrs(r.hours)) + ' · ' + esc(money(r.pay)) + (r.paid === false ? ' · <b class="tw65-warn-t">not paid in full yet</b>' : r.paid === true ? ' · paid in full' : '') + '</div></div>'
        : '<div class="tw65-side tw65-muted"><div class="tw65-side-h">' + label + '</div><div>Not wrapped up yet</div></div>';
      let html = '<article class="tw65-pcard"><div class="tw65-row-h"><b>' + who + '</b> · ' + esc(it.title) + ' · ' + esc(it.employerName) + (it.hiredAt ? ' <span class="tw65-muted">hired ' + esc(shortDay(it.hiredAt)) + '</span>' : '') + '</div>' +
        '<div class="tw65-sides">' + side(who + ' says', it.teen) + side(esc(it.employerName) + ' says', it.emp) + '</div>';
      if (c && !c.same) html += '<p class="tw65-alert">⚠️ The ' + (!c.hoursOK && !c.payOK ? 'hours and pay don\'t' : !c.hoursOK ? 'hours don\'t' : 'pay doesn\'t') + ' match. You may want to talk with ' + who + ' about it.</p>';
      else if (c) html += '<p class="tw65-ok">✓ Both agree on the hours and pay.</p>';
      if (notPaid(it) && !(c && !c.same)) html += '<p class="tw65-alert">💵 ' + (it.teen && it.teen.paid === false ? who + ' says they haven\'t been paid in full yet.' : esc(it.employerName) + ' says ' + who + ' hasn\'t been paid in full yet.') + '</p>';
      if (open && it.emp) html += refCard(refOf(it));
      else if (it.emp) html += '<p class="tw65-muted">🔒 ' + esc(it.employerName) + '\'s rating of ' + who + ' shows once ' + who + ' wraps up too, or on ' + esc(shortDay(opensOn(it))) + '.</p>';
      if (open && it.teen) html += '<p class="tw65-hint">' + who + ' rated working for ' + esc(it.employerName) + ' ' + esc(starText(it.teen.stars)) + (it.teen.again === true ? ' and would work there again.' : it.teen.again === false ? ' and wouldn\'t work there again.' : '.') + (it.teen.note ? ' “' + esc(it.teen.note) + '”' : '') + '</p>';
      return html + '</article>';
    }).join('') + '</div>';
  }
  function drawParent() {
    if (S.role !== 'parent') return;
    const list = $('ratings-list'); if (!list) return;
    const html = parentList();
    const cur = $('tw65-parent');
    if (!html) { if (cur) cur.remove(); return; }
    const tips = $('rating-suggestions-panel'), panel = list.closest('.panel');
    if (tips && panel && panel.parentElement === tips.parentElement && tips.nextElementSibling === panel) { panel.after(tips); tips.dataset.tw65Moved = '1'; }
    if (cur && cur.outerHTML === html) return;
    list.innerHTML = html;
  }
  function redraw() {
    try { decorateApplied(); } catch (e) { console.warn('wrap-up: applied', e); }
    try { decorateKanban(); } catch (e) { console.warn('wrap-up: kanban', e); }
    try { decorateJobs(); } catch (e) { console.warn('wrap-up: jobs', e); }
    try { drawNudge(); } catch (e) { console.warn('wrap-up: nudge', e); }
    try { if (S.role === 'teen') drawTeenRefs(); } catch (e) { console.warn('wrap-up: refs', e); }
    try { if (S.role === 'employer') drawEmpReviews(); } catch (e) { console.warn('wrap-up: reviews', e); }
    try { drawParent(); } catch (e) { console.warn('wrap-up: parent', e); }
  }

  /* ── clicks ──────────────────────────────────────────────────────── */
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-tw65]'); if (!b) return;
    const act = b.getAttribute('data-tw65'), id = b.getAttribute('data-id');
    if (act === 'share') return;
    e.preventDefault();
    if (act === 'wrap') openWrap(id);
    else if (act === 'snooze') { const it = findItem(id); if (it) { snooze(it); redraw(); toast('Okay. We\'ll ask again in a few days.', 'info'); } }
    else if (act === 'refs') { closeModal(); try { switchDashTab(null, 'ttab-references'); } catch (x) {} later(redraw, 120); }
    else if (act === 'copy' || act === 'print') { const it = findItem(id); if (it && it.emp && isOpen(it)) (act === 'copy' ? copyRef : printRef)(refOf(it)); }
    else if (act === 'aprefs') openApplicantRefs(b.getAttribute('data-key'), b.getAttribute('data-name') || 'this teen');
  });
  document.addEventListener('change', e => {
    const b = e.target; if (!b || b.getAttribute('data-tw65') !== 'share') return;
    setHidden(num(b.getAttribute('data-job'), 0), !b.checked);
  });

  /* ── wiring ──────────────────────────────────────────────────────── */
  function wrap(name, after) {
    const o = window[name]; if (typeof o !== 'function' || o.__tw65) return;
    const w = function () { const r = o.apply(this, arguments); try { after.apply(this, arguments); } catch (e) { console.warn('wrap-up:', name, e); } return r; };
    w.__tw65 = true; Object.keys(o).forEach(k => { try { w[k] = o[k]; } catch (e) {} });
    window[name] = w;
  }
  wrap('renderTeenApplications', () => decorateApplied());
  wrap('renderEmpKanban', () => decorateKanban());
  wrap('renderEmployerDashboard', () => { decorateJobs(); setTimeout(() => { try { decorateKanban(); } catch (e) {} }, 200); });
  wrap('renderRatings', () => drawParent());
  // closing a listing that had a hire is the moment the job ends: ask for the wrap-up right away
  (function () {
    const o = window.closeJob; if (typeof o !== 'function' || o.__tw65) return;
    const w = function (idx) {
      const u = me(), all = (typeof demoJobs !== 'undefined' ? demoJobs : []).concat(typeof employerPostedJobs !== 'undefined' ? employerPostedJobs : []);
      const job = isReal(u) && u.type === 'employer' ? all[idx] : null;
      const r = o.apply(this, arguments);
      try {
        if (job && job._jb) {
          const open = S.items.filter(it => it.jobId === job.id && !it.emp);
          if (open.length) setTimeout(() => { toast('Listing closed. Now wrap up ' + firstName(open[0].teenName) + '\'s job: hours, pay and a reference.', 'info'); openWrap(open[0].id); }, 400);
        }
      } catch (e) {}
      return r;
    };
    w.__tw65 = true; window.closeJob = w;
  })();
  (function () {
    const o = window.launchDashboard; if (typeof o !== 'function' || o.__tw65) return;
    const w = function () {
      const r = o.apply(this, arguments);
      try {
        const u = me();
        closeModal();
        if (!isReal(u)) { S = fresh(null); ['tw65-nudge', 'tw65-refs', 'tw65-emp', 'tw65-parent'].forEach(id => { const el = $(id); if (el) el.remove(); }); restorePanels(); return r; }
        if (own(u) !== S.acct || u.type !== S.role) { S = fresh(u); ['tw65-nudge', 'tw65-refs', 'tw65-emp', 'tw65-parent'].forEach(id => { const el = $(id); if (el) el.remove(); }); }
        S.u = u;
        later(sync, 1200);
        if (u.type === 'parent') later(sync, 4000);      // after the linked teens load
      } catch (e) { console.warn('wrap-up: launch', e); }
      return r;
    };
    w.__tw65 = true; Object.keys(o).forEach(k => { try { w[k] = o[k]; } catch (e) {} });
    window.launchDashboard = w;
  })();
  function restorePanels() {
    ['ttab-references', 'etab-reviews'].forEach(id => { const t = $(id); if (t) [...t.children].forEach(c => { if (c.classList.contains('panel')) c.style.display = ''; }); });
    const sub = document.querySelector('#ttab-references p[data-tw65-orig]'); if (sub) { sub.textContent = sub.dataset.tw65Orig; delete sub.dataset.tw65Orig; }
    const tips = $('rating-suggestions-panel'); if (tips && tips.dataset.tw65Moved) { delete tips.dataset.tw65Moved; tips.parentElement.insertBefore(tips, tips.parentElement.firstChild); }
  }
  // draw a section when it opens, whatever opened it
  const PANELS = ['ttab-references', 'ttab-applications', 'ttab-browse', 'etab-reviews', 'etab-applicants', 'etab-active', 'etab-post', 'ptab-ratings'];
  function watchPanels() {
    PANELS.forEach(id => {
      const p = $(id); if (!p || p.__tw65) return; p.__tw65 = true;
      new MutationObserver(recs => {
        if (!p.classList.contains('active') || !recs.some(r => !/(^|\s)active(\s|$)/.test(r.oldValue || ''))) return;
        const u = me(); if (!isReal(u) || own(u) !== S.acct) return;
        setTimeout(() => { redraw(); if (Date.now() - S.at > 20000) later(sync, 0); if (id === 'etab-applicants') later(() => applicantRefs(false), 0); }, 120);
      }).observe(p, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchPanels); else watchPanels();
  setInterval(() => { const u = me(); if (isReal(u) && own(u) === S.acct && document.visibilityState !== 'hidden' && Date.now() - S.at >= SYNC_MS) sync(); }, 15000);
  document.addEventListener('visibilitychange', () => { const u = me(); if (document.visibilityState === 'visible' && isReal(u) && own(u) === S.acct && Date.now() - S.at > 20000) later(sync, 300); });
  // a later block may install the employer trust hook after this one: send waiting ratings then
  let trustSeen = !!(window.twEmployerTrust && window.twEmployerTrust.review);
  setInterval(() => { const has = !!(window.twEmployerTrust && window.twEmployerTrust.review); if (has && !trustSeen && S.role === 'teen') sendTrust(); trustSeen = has; }, 5000);

  window.twWrapUp = {
    open: openWrap, sync, items: () => S.items.map(it => Object.assign({}, it)), state: () => ({ acct: S.acct, role: S.role, loaded: S.loaded, busy: S.busy, hidden: S.hidden.slice(), applicantRefs: S.applicantRefs }),
    applicantRefs: () => applicantRefs(true), _t: { REVEAL_MS, NUDGE_AFTER_MS, SNOOZE_MS }, _plain: refPlain,
  };
})();
