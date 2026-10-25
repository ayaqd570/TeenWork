
/* ═══════════════════════════════════════════════════════════════════
   v42 · REAL STATS FOR REAL ACCOUNTS  (2026-10-15, Aya's request)
   Real teen, parent and employer accounts now see only their own data.
   Demo logins keep the sample data (Alex Johnson, Mike's Landscaping…).
   • 📊 "Your Work Record" (Rec Letters) is built from the teen's own
     Hours log, reviews employers left them, completed lessons and real
     sign-up date. No more 14 hrs / 4.7 ★ / "Member since August 2024".
     Friendly hints replace the numbers when nothing is logged yet.
   • The two sample recommendation letters and the sample ratings are
     hidden for real accounts (letters tab, parent Ratings tab, weekly
     digest, skill report, employer Worker Performance Report).
   • Lessons: completed lessons are saved per account (on the device and
     in the cloud `user_data` row "lessons_completed") and restored at
     sign-in, so "Lessons Done", the lesson grid and the Badges tab count
     the lessons the teen actually passed. Lessons finished before this
     version are recovered from the account's saved AI-coach profile.
   • Hours log, calendar, savings goals and the other teen tools that were
     kept device-wide are now kept per account on a shared device, so one
     account (or the demo) no longer shows up in another. Data already on
     the device goes to the first real account that signs in, minus the
     demo samples.
   • Letters a real teen uploads are kept per account (device + cloud row
     "rec_letters") instead of vanishing on reload, and the upload box
     shows even before the first letter.
   • "Learn how to ask for one" (Why letters matter) opens the References
     lesson; it pointed at a lesson that doesn't exist.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const ROLES = ['teen', 'parent', 'employer'];
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const isReal = u => !!(u && !isDemoUser(u) && !u.isAdmin && ROLES.includes(u.type) && /@/.test(String(u.email || '')));
  const acctKey = u => String(u.dataKey || u.email || '').toLowerCase();
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const readJSON = (k, d) => { try { const v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch (e) { return d; } };
  // change a label or hide a button for real accounts, and put the original back for demo logins
  function realText(el, real, text) { if (!el) return; if (el.dataset.twOrigText == null) el.dataset.twOrigText = el.textContent; el.textContent = real ? text : el.dataset.twOrigText; }
  function realHide(el, hide) { if (!el) return; if (hide) { el.dataset.twHidden = '1'; el.style.display = 'none'; } else if (el.dataset.twHidden) { delete el.dataset.twHidden; el.style.display = ''; } }

  /* ── 1. Per-account device data ───────────────────────────────────
     These teen tools save straight to one device-wide key, so every
     account on the device (and the demo) shared them. The app keeps
     using the same keys; we swap the contents when a different
     account starts its dashboard and park the previous owner's copy. */
  const SCOPED = ['tw_worklog', 'tw_cal_shifts', 'tw_savings_goals', 'tw_savings_history', 'tw_tracker', 'tw_portfolio', 'tw_earnings_log', 'tw_streak', 'tw_lessons_completed'];
  const OWNER = 'tw_device_data_owner', CLAIMED = 'tw_device_data_legacy_claimed';
  const slot = (owner, k) => 'tw_scoped_' + owner.replace(/[^a-z0-9@._:-]/gi, '_') + '__' + k;
  const DEMO_WL = new Set([1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010]);
  const DEMO_GOALS = new Set([2001, 2002, 2003]);
  const isDemoShift = s => !!s && (s.id === 'demo-1' || (s.job === "Lawn Mowing — Mike's Landscaping" && s.notes === 'Bring gloves. Side gate will be open.'));
  const DEMO_FILTER = {
    tw_worklog: e => !(e && DEMO_WL.has(e.id)),
    tw_cal_shifts: s => !isDemoShift(s),
    tw_savings_goals: g => !(g && DEMO_GOALS.has(g.id)),
  };
  function withoutSamples(k, raw) {
    if (raw == null || !DEMO_FILTER[k]) return raw;
    try { const v = JSON.parse(raw); return Array.isArray(v) ? JSON.stringify(v.filter(DEMO_FILTER[k])) : raw; } catch (e) { return raw; }
  }
  function ownerFor(u) { if (!u) return ''; if (isDemoUser(u)) return 'demo'; if (isReal(u)) return 'acct:' + acctKey(u); return ''; }
  function demoShift() {
    const now = new Date(), next = new Date(now);
    next.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
    return { id: 'demo-1', job: "Lawn Mowing — Mike's Landscaping", date: next.toISOString().slice(0, 10), start: '09:00', end: '11:30', pay: '$18/hr', notes: 'Bring gloves. Side gate will be open.' };
  }
  function reloadCaches(owner) {
    // values some scripts read once at start-up
    try {
      let raw = lsGet('tw_cal_shifts');
      if (raw == null) { raw = JSON.stringify(owner === 'demo' ? [demoShift()] : []); lsSet('tw_cal_shifts', raw); }
      calShifts = JSON.parse(raw);
    } catch (e) {}
    try { earningsLog = JSON.parse(lsGet('tw_earnings_log') || '[]'); } catch (e) {}
    try { savingsGoals = JSON.parse(lsGet('tw_savings_goals') || '[]'); } catch (e) {}
  }
  function useDeviceDataOf(u) {
    const next = ownerFor(u); if (!next) return;
    const cur = lsGet(OWNER) || 'legacy';             // 'legacy' = saved before this version, owner unknown
    if (cur !== next) {
      SCOPED.forEach(k => lsSet(slot(cur, k), lsGet(k)));
      lsSet(slot(cur, '_seen'), '1');
      const claimLegacy = next.indexOf('acct:') === 0 && !lsGet(slot(next, '_seen')) && lsGet(slot('legacy', '_seen')) && !lsGet(CLAIMED);
      SCOPED.forEach(k => lsSet(k, claimLegacy ? withoutSamples(k, lsGet(slot('legacy', k))) : lsGet(slot(next, k))));
      if (claimLegacy) lsSet(CLAIMED, next);
      lsSet(slot(next, '_seen'), '1');
      lsSet(OWNER, next);
    }
    if (isReal(u)) SCOPED.forEach(k => { const raw = lsGet(k), clean = withoutSamples(k, raw); if (clean !== raw) lsSet(k, clean); });
    reloadCaches(next);
  }

  /* ── 2. Sample data: only for demo logins ──────────────────────── */
  const SAMPLE_RATINGS = (typeof demoRatings !== 'undefined') ? demoRatings.map(r => ({ ...r })) : [];
  const SAMPLE_LETTERS = (typeof _teenLetters !== 'undefined') ? _teenLetters.filter(l => /^lor-demo/.test(l.id)) : [];
  function reviewsFor(u) {
    if (!u || u.type !== 'teen') return [];
    let list = [];
    try { list = (window._getReviewsForTeen ? window._getReviewsForTeen(u.name) : []) || []; } catch (e) {}
    return list.filter(r => r && r.stars).map(r => ({ from: r.employer || 'An employer', job: r.jobTitle || 'Job', stars: Number(r.stars) || 0, comment: r.text || '' }));
  }
  function applySampleGate(u) {
    const real = isReal(u);
    try {
      if (typeof demoRatings !== 'undefined') {
        if (real) { demoRatings.length = 0; reviewsFor(u).forEach(r => demoRatings.push(r)); }
        else if (u && !demoRatings.length) SAMPLE_RATINGS.forEach(r => demoRatings.push({ ...r }));
      }
    } catch (e) {}
    try {
      if (typeof _teenLetters !== 'undefined' && real) { for (let i = _teenLetters.length - 1; i >= 0; i--) if (/^lor-demo/.test(_teenLetters[i].id)) _teenLetters.splice(i, 1); }
    } catch (e) {}
  }
  // Letters a real teen uploads were kept in memory only and vanished on reload, although the app
  // says "saved to your account". Keep them per account (device + cloud row "rec_letters").
  let lettersSaved = null;
  function useLettersOf(u) {
    if (typeof _teenLetters === 'undefined' || !u) return;
    const list = isReal(u) ? (u.type === 'teen' ? (() => { try { const v = _DB.load('rec_letters', []); return Array.isArray(v) ? v.filter(l => l && l.id && !/^lor-demo/.test(l.id)) : []; } catch (e) { return []; } })() : [])
                           : SAMPLE_LETTERS.map(l => ({ ...l }));
    _teenLetters.length = 0; list.forEach(l => _teenLetters.push(l));
    lettersSaved = isReal(u) && u.type === 'teen' ? JSON.stringify(list) : null;
  }
  function saveLetters(u) {
    if (lettersSaved == null || !isReal(u) || u.type !== 'teen') return;
    const json = JSON.stringify(_teenLetters.filter(l => l && !/^lor-demo/.test(l.id)));
    if (json === lettersSaved) return;
    lettersSaved = json;
    try { _DB.save('rec_letters', JSON.parse(json)); } catch (e) {}
  }

  /* ── 3. Lessons the account really completed ───────────────────── */
  function knownLessonIds() {
    const ids = new Set();
    try { (window.lessonsData || []).forEach(l => l && l.id && ids.add(l.id)); } catch (e) {}
    return ids;
  }
  function savedLessons(u) {
    const set = new Set();
    const add = a => { if (Array.isArray(a)) a.forEach(id => { if (typeof id === 'string' && id) set.add(id); }); };
    try { add(_DB.load('lessons_completed', [])); } catch (e) {}
    // lessons finished before this version were only recorded in the AI-coach profile
    [u.id, u.dataKey, u.email, String(u.email || '').toLowerCase()].filter(Boolean).forEach(id => { const p = readJSON('tw_' + id + '_ai_profile', null); if (p) add(p.lessonsCompleted); });
    return [...set];
  }
  function lessonCount(list) {
    const known = knownLessonIds();
    return new Set((list || []).filter(id => !known.size || known.has(id))).size;
  }
  function storeLessons(list) {
    try { _DB.save('lessons_completed', list); } catch (e) {}
    lsSet('tw_lessons_completed', String(lessonCount(list)));
  }
  // At sign-in: the saved list only (anything already in memory belongs to the previous session).
  // After the cloud copy is pulled: saved + what was finished since, then written back.
  // Nothing is written to the cloud before that pull, so a shorter device list never replaces it.
  function restoreLessons(u, afterSync) {
    if (!isReal(u) || u.type !== 'teen' || typeof userActivity === 'undefined') return;
    const list = afterSync ? [...new Set(savedLessons(u).concat(userActivity.lessonsCompleted || []))] : savedLessons(u);
    userActivity.lessonsCompleted = list;
    lsSet('tw_lessons_completed', String(lessonCount(list)));
    if (afterSync && list.length) storeLessons(list);
  }
  const _oTrack = window.trackActivity;
  if (typeof _oTrack === 'function') {
    window.trackActivity = function (type) {
      const r = _oTrack.apply(this, arguments);
      try {
        const u = me();
        if (type === 'lesson_complete' && isReal(u) && u.type === 'teen' && typeof userActivity !== 'undefined')
          setTimeout(() => { const list = [...new Set(savedLessons(u).concat(userActivity.lessonsCompleted || []))]; userActivity.lessonsCompleted = list; storeLessons(list); }, 0);
      } catch (e) {}
      return r;
    };
  }
  // the cloud copy arrives after the dashboard opens: merge it in and redraw
  const _oSync = window._syncUserData;
  let syncCalled = false;
  if (typeof _oSync === 'function') {
    window._syncUserData = async function () {
      syncCalled = true;
      const r = await _oSync.apply(this, arguments);
      try {
        const u = me();
        if (isReal(u) && u.type === 'teen') {
          const before = (userActivity.lessonsCompleted || []).length;
          restoreLessons(u, true);
          const untouched = lettersSaved != null && JSON.stringify(_teenLetters) === lettersSaved;
          if (untouched) useLettersOf(u);
          if ((userActivity.lessonsCompleted || []).length !== before || untouched) redrawTeen();
        }
      } catch (e) {}
      return r;
    };
  }

  /* ── 4. The teen's real work record ────────────────────────────── */
  function joinedAt(u) {
    const ok = t => { const n = typeof t === 'number' ? t : Date.parse(t); return n && n > Date.UTC(2020, 0, 1) && n <= Date.now() + 864e5 ? n : 0; };
    let t = ok(u.created) || ok(u.createdAt) || ok(u.signupDate);
    if (!t) { try { const all = _twLocalAccounts() || {}; const a = all[acctKey(u)] || all[String(u.email || '').toLowerCase()]; t = ok(a && a.created); } catch (e) {} }
    if (!t) { const k = 'tw_' + acctKey(u).replace(/[^a-z0-9]/gi, '_') + '_first_seen'; t = ok(Number(lsGet(k))); if (!t) { t = Date.now(); lsSet(k, String(t)); } }
    return t;
  }
  function timeOnApp(t) {
    const days = Math.floor((Date.now() - t) / 864e5);
    if (days < 1) return 'Today';
    if (days < 31) return days + ' day' + (days === 1 ? '' : 's');
    const months = Math.floor(days / 30.44);
    if (months < 12) return months + ' month' + (months === 1 ? '' : 's');
    const y = Math.floor(months / 12), m = months % 12;
    return y + ' yr' + (y > 1 ? 's' : '') + (m ? ' ' + m + ' mo' : '');
  }
  const TASKS = { 'yard work': 'Yard Work', 'pet care': 'Pet Care', cleaning: 'Cleaning', babysitting: 'Babysitting', 'tech help': 'Tech Help', other: 'Other' };
  function weekKey(d) { const x = new Date(d + (/^\d{4}-\d{2}-\d{2}$/.test(d) ? 'T12:00:00' : '')); if (isNaN(x)) return ''; const m = new Date(x); m.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return m.toISOString().slice(0, 10); }
  function realStats(u) {
    const log = readJSON('tw_worklog', []).filter(e => e && DEMO_FILTER.tw_worklog(e) && parseFloat(e.hours) > 0);
    const ratings = (typeof demoRatings !== 'undefined' && isReal(u)) ? demoRatings.slice() : reviewsFor(u);
    const totalHours = log.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
    const weeks = new Set(log.map(e => weekKey(String(e.date || ''))).filter(Boolean)).size;
    const avg = ratings.length ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1) : null;
    const reviews = ratings.filter(r => r.comment && r.comment.trim().length > 5);
    const types = [...new Set(log.map(e => TASKS[e.task] || (e.task ? String(e.task) : '')).concat(ratings.map(r => r.job)).filter(Boolean))];
    let badges = '';
    try { badges = (teenGameState.badges || []).map(b => { const d = (typeof BADGES !== 'undefined' ? BADGES : []).find(x => x.id === (b.id || b)); return d ? d.label : (b.label || b.id || b); }).join(', '); } catch (e) {}
    return {
      totalRatings: ratings.length, avgRating: avg, fiveStars: ratings.filter(r => r.stars === 5).length, reviews,
      weeksWorked: weeks, totalHours: parseFloat(totalHours.toFixed(1)), jobTypes: types,
      lessonsCompleted: lessonCount(typeof userActivity !== 'undefined' ? userActivity.lessonsCompleted : []), badges,
      bestReview: reviews.slice().sort((a, b) => b.stars - a.stars)[0], jobsCompleted: log.length,
      joined: joinedAt(u), isEmpty: !log.length && !ratings.length,
    };
  }
  const _oCompile = window._compileteenStatsForLOR;
  window._compileteenStatsForLOR = function () {
    const u = me();
    if (!isReal(u)) return _oCompile ? _oCompile.apply(this, arguments) : {};
    return realStats(u);
  };

  const _oBanner = window.renderTeenLORStatsBanner;
  window.renderTeenLORStatsBanner = function () {
    const u = me();
    if (!isReal(u)) return _oBanner ? _oBanner.apply(this, arguments) : undefined;
    const grid = document.getElementById('teen-lor-stats-grid');
    const typesEl = document.getElementById('teen-lor-job-types');
    const timeEl = document.getElementById('teen-lor-time-on-app');
    if (!grid) return;
    const s = realStats(u), onApp = timeOnApp(s.joined);
    const fmtH = h => (Math.round(h * 10) / 10) + (h === 1 ? ' hr' : ' hrs');
    const items = [
      { label: 'Hours Worked', val: fmtH(s.totalHours), col: '#92400e', bg: '#fff7ed', border: '#fcd34d' },
      { label: 'Weeks Active', val: s.weeksWorked, col: '#1e40af', bg: '#eff6ff', border: '#93c5fd' },
      { label: 'Jobs Completed', val: s.jobsCompleted, col: '#166534', bg: '#f0fdf4', border: '#86efac' },
      { label: 'Avg Rating', val: s.avgRating ? s.avgRating + ' ★' : '—', col: '#7c3aed', bg: '#fdf4ff', border: '#d8b4fe' },
      { label: '5-Star Reviews', val: s.fiveStars, col: '#b45309', bg: '#fefce8', border: '#fde047' },
      { label: 'Time on App', val: onApp, col: '#0f766e', bg: '#f0fdfa', border: '#6ee7b7' },
      { label: 'Lessons Done', val: s.lessonsCompleted, col: '#1a5276', bg: '#dbeafe', border: '#93c5fd' },
    ];
    grid.innerHTML = items.map(i => `
    <div style="background:${i.bg};border:1.5px solid ${i.border};border-radius:12px;padding:.75rem 1rem;text-align:center">
      <div style="font-family:'Fraunces',serif;font-size:1.6rem;font-weight:900;color:${i.col};line-height:1">${esc(i.val)}</div>
      <div style="font-size:.68rem;font-weight:700;color:${i.col};opacity:.75;text-transform:uppercase;letter-spacing:.4px;margin-top:3px">${i.label}</div>
    </div>`).join('');
    if (typesEl) {
      typesEl.innerHTML = s.jobTypes.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
             <span style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-right:2px">Job Types:</span>
             ${s.jobTypes.map(j => `<span style="background:var(--green-pale);color:var(--green);border-radius:20px;padding:2px 10px;font-size:.75rem;font-weight:700">${esc(j)}</span>`).join('')}
           </div>`
        : `<div data-tw-empty="work-record" style="background:var(--bg);border:1px dashed var(--border);border-radius:10px;padding:.65rem .9rem;font-size:.8rem;color:var(--muted);line-height:1.5">
             ${s.isEmpty ? '🌱 Nothing logged yet, and that\'s fine. ' : ''}When you finish a job, add your hours in <strong>Work → Hours</strong>. Your hours, weeks and job types fill in here, and reviews from employers add your rating.
             <div style="margin-top:.45rem"><button type="button" class="btn-sm btn-ai" style="font-size:.72rem" onclick="if(typeof switchDashTab==='function')switchDashTab(null,'ttab-worklog')">⏱️ Log hours</button></div>
           </div>`;
    }
    if (timeEl) {
      const since = new Date(s.joined).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      timeEl.innerHTML = `<span style="font-size:.75rem;color:var(--muted)">Member since ${esc(since)} · ${onApp === 'Today' ? 'joined today' : esc(onApp) + ' on TeenWork'}</span>`;
    }
  };

  const UPLOAD_BOX = `
    <div data-tw-upload="1" style="border:2px dashed var(--border);border-radius:14px;padding:1rem 1.2rem;margin-top:.4rem;background:var(--bg)">
      <div style="font-weight:700;font-size:.88rem;color:var(--text);margin-bottom:.4rem">📤 Upload a Letter You Already Have</div>
      <p style="font-size:.79rem;color:var(--muted);margin-bottom:.75rem;line-height:1.5">Have a letter from a teacher, coach, or employer not on TeenWork? Upload it here to keep everything in one place.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <label style="background:var(--purple);color:#fff;border-radius:8px;padding:7px 16px;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;display:inline-block">
          📎 Choose File
          <input type="file" accept=".pdf,.doc,.docx,.txt" style="display:none" onchange="teenUploadLetter(this)">
        </label>
        <span id="teen-upload-name" style="font-size:.8rem;color:var(--muted)">No file selected</span>
      </div>
      <div id="teen-upload-alert" style="margin-top:.6rem"></div>
    </div>`;
  const _oLetters = window.renderTeenLettersPanel;
  window.renderTeenLettersPanel = function () {
    const r = _oLetters ? _oLetters.apply(this, arguments) : undefined;
    try {
      const u = me();
      if (isReal(u) && u.type === 'teen') {
        const wrap = document.getElementById('teen-letters-inner');
        if (wrap && !wrap.querySelector('input[type=file]')) wrap.insertAdjacentHTML('beforeend', UPLOAD_BOX);   // the app only drew it when letters existed
        saveLetters(u);
      }
    } catch (e) {}
    return r;
  };

  /* ── 5. Employer: Worker Performance Report ─────────────────────── */
  const _oEmpStats = window.renderEmpStatsDashboard;
  window.renderEmpStatsDashboard = function () {
    const u = me();
    if (!isReal(u)) { realHide(document.getElementById('emp-stats-gen-btn'), false); return _oEmpStats ? _oEmpStats.apply(this, arguments) : undefined; }
    const cards = document.getElementById('emp-stats-cards'); if (!cards) return;
    cards.innerHTML = `<div data-tw-empty="worker-report" style="grid-column:1/-1;text-align:center;padding:1.6rem 1rem;color:var(--muted);background:var(--card);border:1.5px dashed var(--border);border-radius:14px">
      <div style="font-size:2rem;margin-bottom:.5rem">📊</div>
      <div style="font-weight:700;font-size:.95rem;color:var(--text);margin-bottom:.3rem">No worker records yet</div>
      <div style="font-size:.84rem;line-height:1.5">When you hire a teen and rate their work, their hours, ratings and reviews show up here.</div></div>`;
    const jobsRow = document.getElementById('emp-stats-jobs-row'); if (jobsRow) jobsRow.innerHTML = '';
    const rev = document.getElementById('emp-stats-reviews'); if (rev) rev.innerHTML = '';
    realHide(document.getElementById('emp-stats-gen-btn'), true);
  };

  /* ── 6. Parent: Ratings tab ─────────────────────────────────────── */
  const _oRatings = window.renderRatings;
  window.renderRatings = function () {
    const r = _oRatings ? _oRatings.apply(this, arguments) : undefined;
    try {
      const u = me(), real = isReal(u);
      const tab = document.getElementById('ptab-ratings');
      if (tab) {
        realText(tab.querySelector('.panel .panel-head h2'), real, 'Your Teen\'s Ratings & Feedback');
        realText(tab.querySelector('#rating-suggestions-panel .badge'), real, 'Tips for your teen');
        // its prompt has the sample ratings written into it
        realHide(tab.querySelector('.panel .panel-head .btn-ai'), real);
      }
      if (!real) return r;
      const list = document.getElementById('ratings-list');
      if (list && !demoRatings.length) list.innerHTML = '<div data-tw-empty="ratings" style="text-align:center;padding:1.6rem 1rem;color:var(--muted)"><div style="font-size:2rem;margin-bottom:.5rem">⭐</div><div style="font-weight:700;color:var(--text);margin-bottom:.3rem">No ratings yet</div><div style="font-size:.84rem">When an employer rates your teen after a job, it shows up here.</div></div>';
    } catch (e) {}
    return r;
  };

  /* ── 7. "Learn how to ask for one" → the References lesson ──────── */
  const _oOpen = window.openLesson;
  if (typeof _oOpen === 'function') {
    window.openLesson = function (id) {
      const r = _oOpen.apply(this, arguments);
      if (id === 'future_jobs_lor' && !document.getElementById('tw34l')) return _oOpen.call(this, 'references');
      return r;
    };
  }

  /* ── 8. Hook into sign-in ───────────────────────────────────────── */
  function redrawTeen() {
    try { if (typeof window.renderLessonsGrid === 'function') window.renderLessonsGrid(); } catch (e) {}
    try { if (document.getElementById('ttab-letters')?.classList.contains('active')) window.renderTeenLettersPanel(); } catch (e) {}
  }
  function prepare() {
    const u = me(); if (!u) return;
    useDeviceDataOf(u);
    useLettersOf(u);
    applySampleGate(u);
    restoreLessons(u);
    if (isReal(u) && u.type === 'teen') {
      try { teenGameState.hoursWorked = parseFloat(readJSON('tw_worklog', []).reduce((s, e) => s + (parseFloat(e.hours) || 0), 0).toFixed(1)); } catch (e) {}
    }
  }
  const _oLaunch = window.launchDashboard;
  window.launchDashboard = function () {
    try { prepare(); } catch (e) { console.warn('real-stats prepare failed', e); }
    syncCalled = false;
    const r = _oLaunch ? _oLaunch.apply(this, arguments) : undefined;
    try {
      const u = me();
      if (isReal(u)) {
        applySampleGate(u); setTimeout(redrawTeen, 200);
        // a teen still waiting for a parent link stops before the dashboard's own cloud sync
        if (!syncCalled && u.type === 'teen' && typeof window._syncUserData === 'function') window._syncUserData();
      }
    } catch (e) {}
    return r;
  };
  window._twRealStats = { stats: () => realStats(me()), owner: () => lsGet(OWNER), isReal: () => isReal(me()) };
})();
