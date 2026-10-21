
/* ═══════════════════════════════════════════════════════════════════
   v45 · SHARED JOB BOARD  (2026-10-16, Aya: "yes definitely" to a cloud job board)
   Before: a job an employer posted lived only in that employer's browser, so real
   teens saw an empty Find Jobs page, and an application never reached anyone.
   Now, for real (non-demo) accounts, jobs and applications are saved in Supabase
   `user_data` (the same table the app already uses):
     <employer>/job_post:<jobId>   the job (status active|closed, postedAt, test)
     <teen>/job_app:<jobId>        a teen's application to that job
   • Employers: posts, the "How can teen get there?" choices, Close Listing and
     Repost are saved to the account, so posts show on every device. Applicants
     appear once a parent has approved (Hire / Pass are saved too).
   • Teens: Find Jobs lists every open job real employers posted (newest first,
     posts older than 90 days drop off). The state filter starts on the teen's own
     state. Applications and their status (waiting for parent, sent, hired, not
     selected) follow the teen to any device.
   • Parents: the linked teens' applications show in Approvals and All Applications
     with the teen's name; Approve / Deny is saved and sends it on to the employer.
   • Jobs posted by tester accounts (🧪) are shown only to tester accounts, so
     Aya's tests never reach real teens, and testers never apply to real jobs.
   Demo logins keep the sample jobs and applicants exactly as before.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twJobBoard45) return;
  window.__twJobBoard45 = true;

  const ROLES = ['teen', 'parent', 'employer'];
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const isReal = u => !!(u && !isDemoUser(u) && !u.isAdmin && ROLES.includes(u.type) && /@/.test(String(u.email || '')));
  const realAs = type => { const u = me(); return isReal(u) && u.type === type ? u : null; };
  const own = u => (u ? String(u.dataKey || u.email || '') : '');          // the user_data "email" column for this account
  const emailOf = u => String((u && u.email) || '').trim().toLowerCase();
  const isTester = u => { try { return !!(window._twTester && window._twTester.isTesterUser(u)); } catch (e) { return false; } };
  const $ = id => document.getElementById(id);
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const readJSON = (k, d) => { try { const v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch (e) { return d; } };
  const parse = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; } };
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
  const toast = (m, t) => { try { showToast(m, t || 'success'); } catch (e) {} };
  const later = (fn, ms) => setTimeout(() => { try { const r = fn(); if (r && r.catch) r.catch(e => console.warn('job-board:', e)); } catch (e) { console.warn('job-board:', e); } }, ms || 0);
  const fmtDate = ts => { const d = new Date(ts || Date.now()); return isNaN(d) ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  function ageFrom(dob) {
    if (!dob) return 0; const b = new Date(/^\d{4}-\d\d-\d\d$/.test(dob) ? dob + 'T00:00' : dob), t = new Date(); if (isNaN(b)) return 0;
    let a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    return a > 0 && a < 120 ? a : 0;
  }
  function prune(arr, bad) { if (!Array.isArray(arr)) return 0; let n = 0; for (let i = arr.length - 1; i >= 0; i--) if (bad(arr[i])) { arr.splice(i, 1); n++; } return n; }
  // the app's lists are top-level consts, not window properties
  const JOBS = () => (typeof browsableJobs !== 'undefined' ? browsableJobs : []);
  const APPS = () => (typeof demoJobs !== 'undefined' ? demoJobs : []);
  const POSTED = () => (typeof employerPostedJobs !== 'undefined' ? employerPostedJobs : []);
  const APPLICANTS = () => (typeof demoApplicants !== 'undefined' ? demoApplicants : []);
  const NOTIFS = () => (typeof demoNotifs !== 'undefined' ? demoNotifs : []);
  // Text from other accounts goes into the app's HTML and onclick="…('…')" handlers, so it is
  // made inert: no tags, quotes, entities or backslashes (look-alike quotes keep "Mike's" readable).
  const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\s]+/g, ' ').replace(/'/g, '\u2019').replace(/"/g, '\u201d')
    .replace(/&/g, ' and ').replace(/[<>`\\]/g, '').replace(/ {2,}/g, ' ').trim().slice(0, max || 80);
  const num = (v, d) => { const n = Number(v); return isFinite(n) ? n : d; };
  const TEXT_MAX = { title: 80, type: 30, payType: 10, city: 60, state: 30, desc: 600, employer: 60 };
  function cleanJob(o) {
    const r = {};
    Object.keys(TEXT_MAX).forEach(k => { if (o && o[k] != null) r[k] = clean(o[k], TEXT_MAX[k]); });
    if (o && o.pay != null) r.pay = num(o.pay, 0);
    if (o && o.minAge != null) r.minAge = num(o.minAge, 14);
    if (o && o.maxHours != null) r.maxHours = num(o.maxHours, 15);
    if (o && Array.isArray(o.transport)) r.transport = o.transport.slice(0, 8).map(t => clean(t, 30)).filter(Boolean);
    ['permit', 'homeJob', 'farm'].forEach(k => { if (o && o[k] != null) r[k] = !!o[k]; });   // set by the job tiers block
    const lm = o && o.landmark;     // "Nearest landmark" from the job map block, when that block is in the file
    if (lm && isFinite(lm.lat) && isFinite(lm.lon)) r.landmark = { id: clean(lm.id, 40), name: clean(lm.name, 60), kind: clean(lm.kind, 30), icon: clean(lm.icon, 4), lat: num(lm.lat, 0), lon: num(lm.lon, 0) };
    return r;
  }
  const validId = v => typeof v === 'number' && isFinite(v) && v > 0;

  /* ── cloud (user_data) ──────────────────────────────────────────── */
  async function client() {
    try { if (typeof _twCloudClient === 'function') return await _twCloudClient(3000); } catch (e) {}
    try { return (typeof sbClient !== 'undefined' && sbClient) || null; } catch (e) { return null; }
  }
  // rows(q => q.eq(...)) → [{email,key,value}] or null when offline / failed
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
  const JOB = 'job_post:', APP = 'job_app:';
  const MAX_AGE = 90 * 864e5;
  // Every row read from the cloud is rebuilt from known fields with clean text (anyone with the
  // app's key can write a row), and the cloud's "like" filter is checked again here.
  function normPost(v) {
    if (!v || !validId(num(v.id, 0))) return null;
    return Object.assign(cleanJob(v), {
      id: num(v.id, 0), employerKey: String(v.employerKey || ''), business: clean(v.business, 60),
      status: v.status === 'closed' ? 'closed' : 'active', postedAt: num(v.postedAt, 0), updatedAt: num(v.updatedAt, 0), test: !!v.test,
    });
  }
  function normApp(v) {
    if (!v || !validId(num(v.jobId, 0))) return null;
    const r = {
      jobId: num(v.jobId, 0), employerKey: String(v.employerKey || ''), job: cleanJob(v.job || {}), test: !!v.test,
      teenKey: String(v.teenKey || ''), teenEmail: String(v.teenEmail || ''), teenName: clean(v.teenName, 60), teenAge: num(v.teenAge, '') || '',
      teenCity: clean(v.teenCity, 60), teenState: clean(v.teenState, 30), skills: (Array.isArray(v.skills) ? v.skills : []).slice(0, 12).map(x => clean(x, 30)).filter(Boolean),
      status: LOCAL[v.status] ? v.status : 'pending-approval', noParent: !!v.noParent, appliedAt: num(v.appliedAt, 0), updatedAt: num(v.updatedAt, 0),
    };
    ['parentDecidedAt', 'decidedAt'].forEach(k => { if (v[k] != null) r[k] = num(v[k], 0); });
    if (v.parentEmail) r.parentEmail = String(v.parentEmail);
    if (v.parentName) r.parentName = clean(v.parentName, 60);
    return r;
  }
  const withPrefix = (list, p) => (list || []).filter(r => r && typeof r.key === 'string' && typeof r.email === 'string' && r.key.indexOf(p) === 0)
    .map(r => ({ email: r.email, key: r.key, v: (p === JOB ? normPost : normApp)(parse(r.value)) })).filter(r => r.v);
  const cacheKey = (u, k) => 'tw_' + own(u).replace(/[^a-z0-9]/gi, '_') + '_' + k;
  const cacheGet = (u, k, d) => readJSON(cacheKey(u, k), d);
  const cacheSet = (u, k, v) => lsSet(cacheKey(u, k), JSON.stringify(v));

  // Changes this device couldn't send yet (offline); retried on the next sync
  const queue = u => cacheGet(u, 'jb_queue', []);
  function enqueue(u, item) { const q = queue(u).filter(x => !(x.email === item.email && x.key === item.key && !item.patch)); q.push(item); cacheSet(u, 'jb_queue', q.slice(-100)); }
  async function flushQueue(u) {
    const q = queue(u); if (!q.length) return;
    const left = [];
    for (const it of q) {
      const ok = it.patch ? await patchApp(it.email, it.key, it.patch, it.from, true) : await put(it.email, it.key, it.value);
      if (!ok) left.push(it);
    }
    cacheSet(u, 'jb_queue', left);
  }
  async function save(u, email, key, value) { const ok = await put(email, key, value); if (!ok) enqueue(u, { email, key, value }); return ok; }
  // Read the application row, check its status is still one we may change, merge, write back
  async function patchApp(email, key, patch, from, quiet) {
    const got = await rows(q => q.eq('email', email).eq('key', key));
    if (!got) return false;
    const cur = got[0] ? parse(got[0].value) : null;
    if (!cur) return true;                                   // gone: nothing to update
    if (from && from.length && !from.includes(cur.status)) { if (!quiet) toast('That application was already updated. Showing the latest.', 'info'); return true; }
    return put(email, key, Object.assign({}, cur, patch, { updatedAt: Date.now() }));
  }
  async function updateApp(u, teenKey, jobId, patch, from) {
    const key = APP + jobId;
    const ok = await patchApp(teenKey, key, patch, from);
    if (!ok) { enqueue(u, { email: teenKey, key, patch, from }); toast('Saved on this device. It will reach the cloud when you\'re back online.', 'info'); }
    return ok;
  }

  // Our entries in the app's shared lists carry _jb and the account they belong to,
  // so switching accounts in one tab never shows another account's jobs.
  function pruneOthers(u) {
    const k = isReal(u) ? own(u) : '';
    let n = 0;
    [JOBS(), APPS(), POSTED(), APPLICANTS()].forEach(arr => { n += prune(arr, x => x && x._jb && x._owner !== k); });
    return n;
  }
  const tag = (o, u, extra) => Object.assign(o, { _jb: true, _owner: own(u) }, extra || {});
  const JOB_FIELDS = ['title', 'type', 'pay', 'payType', 'city', 'state', 'minAge', 'maxHours', 'desc', 'transport', 'employer', 'landmark', 'permit', 'homeJob', 'farm'];
  const pick = (o, keys) => { const r = {}; keys.forEach(k => { if (o && o[k] !== undefined) r[k] = o[k]; }); return r; };
  const LOCAL = { 'pending-approval': 'pending-approval', applied: 'applied', 'parent-denied': 'parent-denied', hired: 'accepted', passed: 'rejected' };
  const rerender = names => names.forEach(n => { try { if (typeof window[n] === 'function') window[n](n === 'renderApprovalJobs' ? APPS() : undefined); } catch (e) {} });

  // seen statuses, so a change is announced once
  const seenGet = u => cacheGet(u, 'jb_seen', {});
  const seenSet = (u, m) => cacheSet(u, 'jb_seen', m);

  /* ── Employers ──────────────────────────────────────────────────── */
  function jobRecord(u, j) {
    return Object.assign(cleanJob(j), {
      id: j.id, employer: clean(j.employer || u.name || 'Employer', 60), employerKey: own(u), business: clean(j.business, 60),
      status: j.status === 'closed' ? 'closed' : 'active', postedAt: j.postedAt || Date.now(), test: isTester(u), updatedAt: Date.now(),
    });
  }
  function bizName(u) { try { return (cacheGet(u, 'emp_profile', null) || {}).name || ''; } catch (e) { return ''; } }
  function myJobs(u) { return cacheGet(u, 'jb_jobs', []); }
  function setMyJobs(u, list) { cacheSet(u, 'jb_jobs', list); }
  function showMyJobs(u, list) {
    const posted = POSTED(); let changed = false;
    const want = list.filter(r => r.status === 'active');
    prune(posted, x => { const gone = x._jb && x._owner === own(u) && !want.some(r => r.id === x.id); if (gone) changed = true; return gone; });
    want.forEach(r => {
      const cur = posted.find(x => x.id === r.id);
      const job = Object.assign(pick(r, JOB_FIELDS), { id: r.id, status: 'active', applied: fmtDate(r.postedAt), postedAt: r.postedAt, employerKey: own(u), test: !!r.test });
      if (!cur) { posted.push(tag(job, u, { _cloud: true })); changed = true; }
      else if (JSON.stringify(pick(cur, JOB_FIELDS)) !== JSON.stringify(pick(job, JOB_FIELDS))) { Object.assign(cur, job); changed = true; }
    });
    return changed;
  }
  const _oPost = window.postJob;
  window.postJob = async function () {
    const u = realAs('employer');
    if (!u || typeof _oPost !== 'function') return typeof _oPost === 'function' ? _oPost.apply(this, arguments) : undefined;
    const transport = [...document.querySelectorAll('#emp-transport-options input:checked')].map(i => i.value);
    const posted = POSTED(), before = posted.slice();
    let r, err;
    try { r = await _oPost.apply(this, arguments); } catch (e) { err = e; }
    const added = posted.filter(j => before.indexOf(j) < 0);
    for (const j of added) {
      const oldId = j.id;
      if (typeof j.id !== 'number' || j.id < 1e14) j.id = Date.now() * 1000 + Math.floor(Math.random() * 1000);   // unique across employers
      const copy = JOBS().find(b => b.id === oldId && b.title === j.title && !b._jb);
      if (copy) JOBS().splice(JOBS().indexOf(copy), 1);    // the base's copy for teens on this device; teens load it from the cloud
      tag(j, u, { _cloud: true, transport, postedAt: Date.now(), employerKey: own(u), business: bizName(u), test: isTester(u) });
      const rec = jobRecord(u, j);
      setMyJobs(u, myJobs(u).filter(x => x.id !== rec.id).concat([rec]));
      save(u, own(u), JOB + rec.id, rec);
    }
    // blocks that wrap postJob further out (job map: landmark; job tiers: permit, farm hours) change the job
    // once this wrapper has saved it, so look again after they finish
    if (added.length) setTimeout(() => added.forEach(j => {
      const list = myJobs(u), rec = list.find(x => x.id === j.id); if (!rec) return;
      const now = cleanJob(pick(j, JOB_FIELDS)), diff = Object.keys(now).filter(k => k !== 'employer' && JSON.stringify(now[k]) !== JSON.stringify(rec[k]));
      if (!diff.length) return;
      diff.forEach(k => { rec[k] = now[k]; }); rec.updatedAt = Date.now();
      setMyJobs(u, list); save(u, own(u), JOB + rec.id, rec);
    }), 0);
    if (added.length) {
      document.querySelectorAll('#emp-transport-options input:checked').forEach(i => { i.checked = false; try { i.dispatchEvent(new Event('change')); } catch (e) {} });
      rerender(['renderEmployerDashboard']);
    }
    // the base calls aiJobMatchForParent, which the app never defines, right after posting
    if (err && !(added.length && /aiJobMatchForParent/.test(String(err.message || err)))) throw err;
    return r;
  };
  function jobAt(idx) { const all = APPS().concat(POSTED()); return all[idx]; }
  const _oClose = window.closeJob;
  if (typeof _oClose === 'function') window.closeJob = function (idx) {
    const u = realAs('employer'), job = u ? jobAt(idx) : null;
    const r = _oClose.apply(this, arguments);
    if (u && job && job._jb) {
      const list = myJobs(u), rec = list.find(x => x.id === job.id) || jobRecord(u, job);
      rec.status = 'closed'; rec.updatedAt = Date.now();
      setMyJobs(u, list.filter(x => x.id !== rec.id).concat([rec]));
      save(u, own(u), JOB + rec.id, rec);
    }
    return r;
  };
  const _oRepost = window.repostJob;
  if (typeof _oRepost === 'function') window.repostJob = function (idx) {
    const u = realAs('employer'), job = u ? jobAt(idx) : null;
    const r = _oRepost.apply(this, arguments);
    if (u && job && job._jb) {
      const list = myJobs(u), rec = list.find(x => x.id === job.id) || jobRecord(u, job);
      rec.status = 'active'; rec.postedAt = Date.now(); rec.updatedAt = Date.now(); job.postedAt = rec.postedAt;
      setMyJobs(u, list.filter(x => x.id !== rec.id).concat([rec]));
      save(u, own(u), JOB + rec.id, rec);
    }
    return r;
  };
  ['hireApplicant', 'passApplicant'].forEach(n => {
    const o = window[n]; if (typeof o !== 'function') return;
    window[n] = function (idx) {
      const u = realAs('employer'), a = u ? APPLICANTS()[idx] : null, was = a && (a.hired || a.passed);
      const r = o.apply(this, arguments);
      if (u && a && a._jb && !was && (a.hired || a.passed)) {
        const status = n === 'hireApplicant' ? 'hired' : 'passed';
        a._status = status;
        const m = seenGet(u); m[a._appKey] = status; seenSet(u, m);
        updateApp(u, a._teenKey, a._jobId, { status, decidedAt: Date.now() }, ['applied']);
      }
      return r;
    };
  });
  // "Your Job Postings" never filled in: the app's renderer stops early because the old
  // applicants list it looks for first is no longer on the page. Real employers get the list here.
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function drawMyJobs() {
    const u = realAs('employer'), el = $('employer-jobs-list'); if (!u || !el) return;
    const off = APPS().length, apps = APPLICANTS();
    const html = POSTED().map((j, i) => {
      if (!j) return '';
      const n = apps.filter(a => a && (a._jb ? a._jobId === j.id : a.job === j.title) && !a.passed).length;
      return '<div class="job-card"><div class="job-card-top"><div><div class="job-title">' + esc(j.title) + '</div>' +
        '<div class="job-employer">' + esc([j.city, j.state].filter(Boolean).join(', ')) + (j.type ? ' · ' + esc(j.type) : '') + '</div></div>' +
        '<span class="tag pay">$' + esc(j.pay) + (j.payType === 'hourly' ? '/hr' : ' flat') + '</span></div>' +
        '<div class="job-meta"><span class="tag">Age ' + esc(j.minAge) + '+</span><span class="tag">Max ' + esc(j.maxHours) + 'h/wk</span>' +
        '<span class="tag status-accepted">Active</span>' + (j.test ? '<span class="tag">🧪 Test post (only tester accounts see it)</span>' : '') +
        '<span class="tag">' + n + ' applicant' + (n === 1 ? '' : 's') + '</span>' + (j.postedAt ? '<span class="tag">Posted ' + esc(fmtDate(j.postedAt)) + '</span>' : '') + '</div>' +
        '<div class="job-actions"><button class="btn-sm btn-deny" onclick="closeJob(' + (off + i) + ')">Close Listing</button>' +
        '<button class="btn-sm btn-primary" onclick="repostJob(' + (off + i) + ')" style="background:var(--blue);border:none;color:#fff">🔁 Repost (move to the top)</button></div></div>';
    }).join('');
    el.innerHTML = html || '<p style="color:var(--muted);text-align:center;padding:1.2rem">No job posts yet. Use <strong>Post Job</strong> to add your first one.</p>';
  }
  const _oEmpDash = window.renderEmployerDashboard;
  if (typeof _oEmpDash === 'function') window.renderEmployerDashboard = function () {
    const r = _oEmpDash.apply(this, arguments);
    try { drawMyJobs(); } catch (e) {}
    return r;
  };
  // The Applicant Pipeline is the only applicant screen: its stages were saved by list position for the
  // whole device. Real employers' stages are kept per applicant and account, "→ Hired" hires the teen
  // (saved for the teen and parent), and "✗ Pass" tells the teen they weren't picked.
  const stages = u => cacheGet(u, 'jb_stages', {});
  const _oKanban = window.renderEmpKanban;
  if (typeof _oKanban === 'function') window.renderEmpKanban = function () {
    const u = realAs('employer'), list = APPLICANTS();
    if (u) {
      try {
        const m = stages(u), p = readJSON('tw_emp_pipeline', {});
        list.forEach((a, i) => { if (a && a._jb) p[i] = a.hired ? 'hired' : (m[a._appKey] && m[a._appKey] !== 'hired' ? m[a._appKey] : 'applied'); });
        lsSet('tw_emp_pipeline', JSON.stringify(p));
      } catch (e) {}
    }
    const r = _oKanban.apply(this, arguments);
    if (u) {
      try {
        document.querySelectorAll('#emp-kanban-board [ondragstart]').forEach(card => {
          const mm = /_kDragging=(\d+)/.exec(card.getAttribute('ondragstart') || ''); const i = mm ? +mm[1] : -1, a = list[i];
          if (!a || !a._jb) return;
          const row = card.querySelector('.btn-msg') && card.querySelector('.btn-msg').parentElement; if (!row) return;
          if (a.passed) {
            card.style.opacity = '.55';
            row.querySelectorAll('button[onclick^="empKanbanMoveCard"]').forEach(b => b.remove());
            const t = document.createElement('span'); t.className = 'tag status-rejected'; t.style.fontSize = '.66rem'; t.textContent = 'Passed'; row.appendChild(t);
          } else if (!a.hired && !row.querySelector('[data-jb-pass]')) {
            const b = document.createElement('button'); b.className = 'btn-sm btn-deny'; b.dataset.jbPass = '1';
            b.style.cssText = 'font-size:.7rem;padding:4px 8px'; b.textContent = '✗ Pass'; b.onclick = () => window.passApplicant(i); row.appendChild(b);
          }
        });
      } catch (e) {}
    }
    return r;
  };
  const _oMove = window.empKanbanMoveCard;
  if (typeof _oMove === 'function') window.empKanbanMoveCard = function (idx, stage) {
    const u = realAs('employer'), a = u ? APPLICANTS()[idx] : null;
    if (!a || !a._jb) return _oMove.apply(this, arguments);
    if (a.passed) { toast('You passed on ' + a.name + ' for this job.', 'info'); return; }
    const m = stages(u); m[a._appKey] = stage; cacheSet(u, 'jb_stages', m);
    const r = _oMove.apply(this, arguments);
    if (stage === 'hired' && !a.hired) window.hireApplicant(idx);
    return r;
  };
  let empSyncing = false;
  async function syncEmployer(u) {
    if (empSyncing) return; empSyncing = true;
    try {
      await flushQueue(u);
      const got = await rows(q => q.eq('email', own(u)).like('key', JOB + '%'));
      if (me() !== u) return;
      let list = myJobs(u);
      if (got) {
        const cloud = withPrefix(got, JOB).map(r => r.v).filter(v => v && v.id);
        const byId = {}; cloud.forEach(v => { byId[v.id] = v; });
        list.forEach(l => { const c = byId[l.id]; if (!c) save(u, own(u), JOB + l.id, l); else if ((l.updatedAt || 0) > (c.updatedAt || 0)) { byId[l.id] = l; save(u, own(u), JOB + l.id, l); } });
        list = Object.keys(byId).map(k => byId[k]).concat(list.filter(l => !byId[l.id]));
        setMyJobs(u, list);
      }
      let changed = showMyJobs(u, list);
      // applicants: only applications a parent approved (or a tester's, which need no parent)
      const ids = list.map(r => r.id);
      const apps = ids.length ? await rows(q => q.in('key', ids.map(id => APP + id))) : [];
      if (me() !== u) return;
      if (apps) {
        const m = seenGet(u), fresh = [];
        withPrefix(apps, APP).filter(r => r.v.employerKey === own(u) && ['applied', 'hired', 'passed'].includes(r.v.status)).forEach(r => {
          const v = r.v, appKey = r.email + '|' + v.jobId, job = list.find(x => x.id === v.jobId) || {};
          const list2 = APPLICANTS();
          let a = list2.find(x => x._jb && x._appKey === appKey);
          if (!a) {
            a = tag({ name: v.teenName || 'Teen', age: v.teenAge || '', city: v.teenCity || '', skills: v.skills.slice(0, 8), rating: 'New',
              job: job.title || (v.job && v.job.title) || 'Job', applied: fmtDate(v.appliedAt) }, u, { _appKey: appKey, _teenKey: r.email, _jobId: v.jobId, _status: v.status });
            list2.push(a); changed = true;
            if (!m[appKey]) fresh.push(a);
          }
          if (a._status !== v.status || !!a.hired !== (v.status === 'hired') || !!a.passed !== (v.status === 'passed')) { a.hired = v.status === 'hired'; a.passed = v.status === 'passed'; a._status = v.status; changed = true; }
          m[appKey] = v.status;
        });
        seenSet(u, m);
        if (fresh.length) toast(fresh.length === 1 ? '📥 New applicant: ' + fresh[0].name + ' for "' + fresh[0].job + '"' : '📥 ' + fresh.length + ' new applicants', 'success');
      }
      if (changed) rerender(['renderEmployerDashboard']);
    } finally { empSyncing = false; }
  }

  /* ── Teens ──────────────────────────────────────────────────────── */
  function teenRecord(u, j) {
    let skills = [];
    try { skills = (typeof userActivity !== 'undefined' && Array.isArray(userActivity.skills) && userActivity.skills.length) ? userActivity.skills : (u.skills || []); } catch (e) { skills = u.skills || []; }
    return {
      jobId: j.id, employerKey: j.employerKey || '', job: cleanJob(pick(j, JOB_FIELDS)), test: !!j.test,
      teenKey: own(u), teenEmail: emailOf(u), teenName: clean(u.name || emailOf(u).split('@')[0], 60), teenAge: ageFrom(u.dob) || num(u.age, 0) || '',
      teenCity: clean(u.city, 60), teenState: clean(u.state, 30), skills: (Array.isArray(skills) ? skills : String(skills).split(',')).map(s => clean(s, 30)).filter(Boolean).slice(0, 12),
      status: j.status === 'applied' ? 'applied' : 'pending-approval', noParent: !!j.testerNoParent, appliedAt: Date.now(), updatedAt: Date.now(),
    };
  }
  const _oApply = window.teenApply;
  if (typeof _oApply === 'function') window.teenApply = function () {
    const u = realAs('teen'); if (!u) return _oApply.apply(this, arguments);
    const apps = APPS(), before = apps.slice();
    const r = _oApply.apply(this, arguments);
    apps.filter(j => before.indexOf(j) < 0).forEach(j => {
      tag(j, u);
      if (!j._cloud) return;
      const rec = teenRecord(u, j);
      const m = seenGet(u); m[own(u) + '|' + j.id] = rec.status; seenSet(u, m);
      save(u, own(u), APP + j.id, rec);
    });
    return r;
  };
  function jobFromRecord(u, v) {
    const j = Object.assign(pick(v, JOB_FIELDS), { id: v.id, employerKey: v.employerKey, postedAt: v.postedAt, test: v.test });
    if (!Array.isArray(j.transport)) delete j.transport;
    if (j.test && !/^🧪/.test(j.title || '')) j.title = '🧪 ' + (j.title || 'Test job');
    return tag(j, u, { _cloud: true });
  }
  let teenSyncing = false;
  async function syncTeen(u, first) {
    if (teenSyncing) return; teenSyncing = true;
    try {
      await flushQueue(u);
      const tester = isTester(u), now = Date.now();
      const [jobRows, appRows] = await Promise.all([
        rows(q => q.like('key', JOB + '%').limit(1000)),
        rows(q => q.eq('email', own(u)).like('key', APP + '%')),
      ]);
      if (me() !== u) return;
      let changedJobs = false, changedApps = false;
      const apps = APPS(), jobs = JOBS();
      // my applications (cloud copy wins: the parent or employer may have changed them)
      if (appRows) {
        const m = seenGet(u), news = [];
        withPrefix(appRows, APP).forEach(r => {
          const v = r.v, status = LOCAL[v.status], key = own(u) + '|' + v.jobId;
          let a = apps.find(x => x.id === v.jobId);
          if (!a) {
            a = tag(Object.assign(pick(v.job || {}, JOB_FIELDS), { id: v.jobId, status, applied: fmtDate(v.appliedAt), parentApproved: v.status !== 'pending-approval', employerKey: v.employerKey }), u, { _cloud: true });
            if (v.test && !/^🧪/.test(a.title || '')) a.title = '🧪 ' + a.title;
            apps.push(a); changedApps = true;
          } else if (a.status !== status) { a.status = status; a.parentApproved = v.status !== 'pending-approval'; changedApps = true; }
          tag(a, u, { _cloud: true });
          if (m[key] && m[key] !== v.status) news.push(v);
          m[key] = v.status;
        });
        seenSet(u, m);
        news.forEach(v => {
          const t = (v.job && v.job.title) || 'your job';
          if (v.status === 'applied') toast('✅ Your parent approved "' + t + '". It went to the employer.', 'success');
          else if (v.status === 'parent-denied') toast('Your parent said no to "' + t + '".', 'info');
          else if (v.status === 'hired') {
            toast('🎉 You got the job: "' + t + '"!', 'success');
            try { if (typeof sendPushNotif === 'function') sendPushNotif('You got the job! 🎉', '"' + t + '"'); } catch (e) {}
            try { if (typeof trackActivity === 'function') trackActivity('job_accepted', { title: t, employer: (v.job && v.job.employer) || '', ts: Date.now() }); } catch (e) {}
          } else if (v.status === 'passed') toast('"' + t + '": the employer chose someone else this time.', 'info');
        });
      }
      // open jobs from real employers (tester accounts only see tester jobs)
      if (jobRows) {
        const open = withPrefix(jobRows, JOB).map(r => r.v)
          .filter(v => v && v.id && v.status === 'active' && !!v.test === tester && now - (v.postedAt || 0) < MAX_AGE)
          .sort((a, b) => (b.postedAt || 0) - (a.postedAt || 0));
        const appliedIds = new Set(apps.map(a => a.id));
        const keep = new Set(open.map(v => v.id));
        if (prune(jobs, x => x._jb && x._owner === own(u) && (!keep.has(x.id) || appliedIds.has(x.id)))) changedJobs = true;
        open.forEach(v => {
          if (appliedIds.has(v.id)) return;
          const j = jobFromRecord(u, v), cur = jobs.find(x => x.id === v.id);
          if (!cur) { jobs.push(j); changedJobs = true; }
          else if (cur._jb && JSON.stringify(pick(cur, JOB_FIELDS)) !== JSON.stringify(pick(j, JOB_FIELDS))) { Object.assign(cur, j); changedJobs = true; }
        });
        // newest first, ahead of anything else in the list
        if (changedJobs) jobs.sort((a, b) => (b._jb ? b.postedAt || 1 : 0) - (a._jb ? a.postedAt || 1 : 0));
      }
      if (first) setStateFilter(u);
      if (changedJobs || first) rerender(['renderBrowseJobs']);
      if (changedApps) rerender(['renderTeenApplications', 'renderBrowseJobs']);
    } finally { teenSyncing = false; }
  }
  // the state filter was hard-coded to Vermont; start it on the teen's own state
  function setStateFilter(u) {
    const sel = $('teen-filter-state'); if (!sel || sel.dataset.jbSet === own(u)) return;
    sel.dataset.jbSet = own(u);
    const st = String(u.state || '').trim().toLowerCase();
    const opt = st && [...sel.options].find(o => o.value.toLowerCase() === st || o.textContent.trim().toLowerCase() === st);
    sel.value = opt ? opt.value : '';
  }
  // labels the app has no words for
  const _oTeenApps = window.renderTeenApplications;
  if (typeof _oTeenApps === 'function') window.renderTeenApplications = function () {
    const r = _oTeenApps.apply(this, arguments);
    try {
      if (realAs('teen')) {
        const shown = APPS().filter(j => j && !(typeof j.id === 'number' && j.id >= 1 && j.id <= 12));
        document.querySelectorAll('#teen-applications-list .job-card').forEach((card, i) => {
          const j = shown[i], t = card.querySelector('.job-card-top .tag'); if (!j || !t) return;
          if (j.status === 'rejected') t.textContent = 'Not selected this time';
          else if (j.status === 'parent-denied') t.textContent = 'Your parent said no';
          else if (j.status === 'applied') t.textContent = 'Sent to the employer';
        });
      }
    } catch (e) {}
    return r;
  };

  /* ── Parents ────────────────────────────────────────────────────── */
  function linked() { try { return (window._twRealData && window._twRealData.linkedTeens()) || []; } catch (e) { return []; } }
  function pid(teenKey, jobId) {                          // one numeric id per teen + job, for the app's onclick handlers
    let h = 2166136261; const s = teenKey + '|' + jobId;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return 3e15 + h * 1000 + (Number(String(jobId).slice(-3)) || 0);
  }
  ['parentApproveJob', 'parentDenyJob'].forEach(n => {
    const o = window[n]; if (typeof o !== 'function') return;
    window[n] = function (jobId) {
      const u = realAs('parent'), job = u ? APPS().find(j => j.id === jobId && j.status === 'pending-approval') : null;
      const r = o.apply(this, arguments);
      if (u && job && job._jb && job.status !== 'pending-approval') {
        const status = n === 'parentApproveJob' ? 'applied' : 'parent-denied';
        const m = seenGet(u); m[job._appKey] = status; seenSet(u, m);
        updateApp(u, job._teenKey, job._jobId, { status, parentEmail: emailOf(u), parentName: u.name || '', parentDecidedAt: Date.now() }, ['pending-approval']);
      }
      return r;
    };
  });
  let parSyncing = false;
  async function syncParent(u) {
    if (parSyncing) return; parSyncing = true;
    try {
      await flushQueue(u);
      const teens = linked().filter(t => t && t.key);
      const apps = APPS();
      let changed = prune(apps, x => x._jb && x._owner === own(u) && !teens.some(t => t.key === x._teenKey)) > 0;
      if (!teens.length) { if (changed) rerender(['renderApprovalJobs', 'renderAllApplications']); return; }
      const got = await rows(q => q.in('email', teens.map(t => t.key)).like('key', APP + '%'));
      if (!got || me() !== u) return;
      const m = seenGet(u), notes = [];
      withPrefix(got, APP).forEach(r => {
        const v = r.v, teen = teens.find(t => t.key === r.email) || {}, appKey = r.email + '|' + v.jobId, teenName = clean(teen.name, 60) || v.teenName;
        const who = firstName(teenName) || 'Your teen', status = LOCAL[v.status];
        let a = apps.find(x => x._jb && x._appKey === appKey);
        if (!a) {
          a = tag(Object.assign(pick(v.job || {}, JOB_FIELDS), { id: pid(r.email, v.jobId), status, applied: fmtDate(v.appliedAt) + ' by ' + who, parentApproved: v.status !== 'pending-approval' }),
            u, { _appKey: appKey, _teenKey: r.email, _jobId: v.jobId, _teenName: teenName || '' });
          if (v.test && !/^🧪/.test(a.title || '')) a.title = '🧪 ' + a.title;
          apps.push(a); changed = true;
        } else if (a.status !== status) { a.status = status; a.parentApproved = v.status !== 'pending-approval'; changed = true; }
        const t = (v.job && v.job.title) || 'a job';
        if (m[appKey] !== v.status) {
          if (v.status === 'pending-approval') notes.push(who + ' wants to apply to "' + t + '"' + (v.job && v.job.pay ? ' ($' + v.job.pay + (v.job.payType === 'hourly' ? '/hr' : ' flat') + (v.job.city ? ', ' + v.job.city : '') + ')' : '') + '. Review it in Approvals.');
          else if (v.status === 'hired') notes.push(who + ' was hired for "' + t + '" 🎉');
          else if (v.status === 'passed' && m[appKey]) notes.push('"' + t + '": the employer chose someone else for ' + who + ' this time.');
        }
        m[appKey] = v.status;
      });
      seenSet(u, m);
      if (notes.length) {
        try { const list = NOTIFS(); notes.forEach(text => list.unshift({ text, time: 'Just now', read: false, type: 'job-approval' })); } catch (e) {}
        toast(notes.length === 1 ? notes[0] : notes.length + ' updates about your teen\'s applications', 'info');
        rerender(['renderNotifications']);
      }
      if (changed) rerender(['renderApprovalJobs', 'renderAllApplications']);
    } finally { parSyncing = false; }
  }
  // the employer rating line was made up (4.0 for every unknown employer); the teen's name is added
  function fixParentCards() {
    if (!realAs('parent')) return;
    const apps = APPS();
    apps.filter(j => j._jb && j.status === 'pending-approval').forEach(j => {
      const card = $('job-card-' + j.id); if (!card) return;
      [...card.querySelectorAll('div')].forEach(d => { if (/^Employer rating:/.test(d.textContent.trim()) && !d.dataset.jb) { d.dataset.jb = '1'; d.textContent = 'Employer rating: no reviews yet'; } });
    });
    const acc = apps.filter(j => j.status === 'accepted');
    document.querySelectorAll('#approval-jobs .cal-synced-badge').forEach((b, i) => { const j = acc[i]; if (j && j._jb && j._teenName) b.textContent = firstName(j._teenName) + ' is hired ✓'; });
    document.querySelectorAll('#all-applications .job-card').forEach((card, i) => {
      const j = apps[i], t = card.querySelector('.job-card-top .tag'); if (!j || !j._jb || !t) return;
      t.textContent = j.status === 'pending-approval' ? 'Waiting for your OK' : j.status === 'applied' ? 'Sent to the employer' : j.status === 'accepted' ? (firstName(j._teenName) || 'Your teen') + ' was hired ✓' : j.status === 'parent-denied' ? 'You said no' : 'Not selected';
      const b = card.querySelector('.cal-synced-badge'); if (b && j._teenName) b.textContent = firstName(j._teenName) + ' is hired ✓';
    });
  }
  ['renderApprovalJobs', 'renderAllApplications'].forEach(n => {
    const o = window[n]; if (typeof o !== 'function') return;
    window[n] = function () { const r = o.apply(this, arguments); try { fixParentCards(); } catch (e) {} return r; };
  });

  /* ── Wiring ─────────────────────────────────────────────────────── */
  function syncNow(u, first) {
    if (!isReal(u)) return Promise.resolve();
    if (u.type === 'teen') return syncTeen(u, first);
    if (u.type === 'parent') return syncParent(u);
    if (u.type === 'employer') return syncEmployer(u);
    return Promise.resolve();
  }
  const _oLaunch = window.launchDashboard;
  window.launchDashboard = function () {
    const u = me();
    try { pruneOthers(u); } catch (e) {}
    try {
      if (isReal(u) && u.type === 'employer') showMyJobs(u, myJobs(u));     // this device's copy right away; the cloud follows
    } catch (e) {}
    const r = typeof _oLaunch === 'function' ? _oLaunch.apply(this, arguments) : undefined;
    if (isReal(u)) {
      later(() => { if (me() === u) return syncNow(u, true); }, 250);
      if (u.type === 'parent') later(() => { if (me() === u) return syncNow(u); }, 2500);   // after the linked teens load
    }
    return r;
  };
  setInterval(() => { const u = me(); if (isReal(u) && document.visibilityState !== 'hidden') syncNow(u); }, 30000);
  document.addEventListener('visibilitychange', () => { const u = me(); if (document.visibilityState === 'visible' && isReal(u)) syncNow(u); });

  window._twJobBoard = { sync: () => syncNow(me(), true), myJobs: () => { const u = me(); return u ? myJobs(u).slice() : []; }, isTester: () => isTester(me()) };
})();
