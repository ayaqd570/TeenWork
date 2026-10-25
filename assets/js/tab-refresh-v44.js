
/* ═══════════════════════════════════════════════════════════════════
   v44 · SECTIONS FILL IN AGAIN + SKILL PROGRESS REPORT  (2026-10-16)
   Aya: "Skill Progress Report … Loading your skill report… this never
   actually loads" and "Locked Badges … Loading… not loading".
   Cause: the old navfix-js script replaced window.switchDashTab with its
   own switcher and never called the one before it. Sixteen older add-ons
   had hooked switchDashTab to fill their section when it opens (Skill
   Report, Badges, Weekly Digest, Portfolio, Tracker, Leaderboard, Work
   Log, employer Reviews, …), so none of them ran any more. The v43 menu
   opens every section through switchDashTab, so those sections stayed
   on "Loading…" or showed whatever was drawn at sign-in.
   • HOOKS below runs those fillers again when their section opens.
   • Badges and the Application Tracker read a global `_state` that no
     longer exists, so they threw before drawing anything. It now exists
     (empty), which is what both scripts expect when there is no state.
   • Earnings: its filler puts four sample jobs into an empty log; real
     accounts now see their own log (or an empty note) instead.
   • Skill Progress Report: the numbers, skill bars and lessons show at
     once; the AI line fills in after, stops waiting after 20 seconds with
     a clear message and a Try again button, and is remembered for the
     same progress so reopening Profile doesn't spend another AI request
     (🔄 Refresh always asks again). Real accounts use only their own
     skills, hours log, employer reviews and lessons; with nothing yet they
     get a short "how to fill this in" note instead of an AI guess.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twTabRefreshV44) return;
  window.__twTabRefreshV44 = true;

  if (!('_state' in window)) window._state = undefined;

  /* ── 1. Fill each section when it opens ───────────────────────────
     [section id] → [[window function name, delay ms], …] — the same
     functions and delays the original add-ons used. AI Coach / Lessons
     are left out: the hooks that draw them still work. */
  const HOOKS = {
    'ttab-calendar':     [['calRender', 60], ['renderCalEarningsBar', 120]],
    'ttab-letters':      [['renderTeenLettersPanel', 80]],
    'ttab-applications': [['renderWeeklyDigest', 100]],
    'ttab-earnings':     [['renderEarningsTracker', 100]],
    'ttab-resume':       [['renderSkillReport', 150, { auto: true }]],
    'ttab-portfolio':    [['renderPortfolioTab', 80]],
    'ttab-badges':       [['renderBadgesTab', 80]],
    'ttab-savings':      [['renderSavingsTab', 80]],
    'ttab-tracker':      [['renderTrackerTab', 80]],
    'ttab-worklog':      [['renderWorkLogTab', 80]],
    'ttab-references':   [['renderTeenReferencesTab', 80]],
    'ttab-firstjob':     [['renderFirstJobChecklist', 80]],
    'ttab-leaderboard':  [['renderLeaderboard', 80]],
    'ptab-savings':      [['renderSavingsGoals', 100]],
    'ptab-trusted':      [['renderTrustedEmployers', 100]],
    'ptab-teens':        [['renderMultiTeens', 100]],
    'etab-reviews':      [['renderEmpReviewsTab', 80], ['renderEndorsementChips', 100]],
    'etab-letters':      [['renderEmpLetterList', 80], ['renderEmpStatsDashboard', 100]],
    'etab-schedule':     [['renderEmpSchedGrid', 80], ['_empScanAllMsgsForEdits', 80]],
    'etab-applicants':   [['renderEmpKanban', 80]],
    'etab-analytics':    [['renderEmpAnalytics', 80]],
    'etab-profile':      [['renderEmpProfileReviews', 80]],
    'etab-bulkmsg':      [['empBulkFilter', 80, 'all']],
  };
  function runHooks(panelId) {
    (HOOKS[panelId] || []).forEach(([name, ms, arg]) => setTimeout(() => {
      const fn = window[name];
      if (typeof fn !== 'function') return;
      try {
        const r = arg === undefined ? fn() : fn(arg);
        if (r && typeof r.catch === 'function') r.catch(e => console.warn('tab-refresh: ' + name, e));
      } catch (e) { console.warn('tab-refresh: ' + name, e); }
    }, ms));
  }
  const _oSwitch = window.switchDashTab;
  window.switchDashTab = function (btn, panelId) {
    const r = typeof _oSwitch === 'function' ? _oSwitch.apply(this, arguments) : undefined;
    // v45: calendar-first-open-v44 draws most of these sections itself, with real-account guards; drawing them
    // again here undid those guards (sample savings goal for real parents), so only the rest run here
    const drawnElsewhere = id => { try { const c = window._twCalFirstOpen; return !!(c && Array.isArray(c.sections) && c.sections.includes(id)); } catch (e) { return false; } };
    try { if (HOOKS[panelId] && !drawnElsewhere(panelId)) runHooks(panelId); } catch (e) {}
    return r;
  };

  /* ── 2. Skill Progress Report ─────────────────────────────────── */
  const ROLES = ['teen', 'parent', 'employer'];
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const isReal = u => !!(u && !isDemoUser(u) && !u.isAdmin && ROLES.includes(u.type) && /@/.test(String(u.email || '')));
  const acctKey = u => String((u && (u.dataKey || u.email)) || 'guest').toLowerCase();
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const readJSON = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const AI_WAIT_MS = 20000;
  const TASKS = { 'yard work': 'Yard Work', 'pet care': 'Pet Care', cleaning: 'Cleaning', babysitting: 'Babysitting', 'tech help': 'Tech Help', other: 'Other' };
  // a skill also counts work of the same kind (e.g. Lawn Care ← Yard Work)
  const RELATED = {
    'lawn care': ['yard', 'garden', 'mow', 'lawn', 'leaf', 'leaves'], 'snow shoveling': ['snow', 'yard'],
    'pet sitting': ['pet', 'dog', 'cat', 'animal'], 'dog walking': ['dog', 'pet'],
    'cleaning': ['clean', 'organiz', 'tidy'], 'babysitting': ['babysit', 'child', 'kid'], 'tutoring': ['tutor', 'homework'],
  };
  const CATS = (typeof SKILL_CATEGORIES !== 'undefined') ? SKILL_CATEGORIES : {};
  const LMETA = (typeof LESSON_META !== 'undefined') ? LESSON_META : {};
  const DEMO_SKILLS = 'lawn care,pet sitting,snow shoveling,cleaning';

  function lessonInfo(id) {
    const l = (window.lessonsData || []).find(x => x && x.id === id);
    if (l) return { label: l.title, icon: l.icon || '📚', pts: l.xp || 20 };
    if (LMETA[id]) return LMETA[id];
    return { label: String(id).replace(/[_-]+/g, ' ').replace(/^\w/, c => c.toUpperCase()), icon: '📚', pts: 20 };
  }
  function matches(skill, type) {
    const s = String(skill).toLowerCase(), t = String(type).toLowerCase();
    if (!s || !t) return false;
    if (t.includes(s) || s.includes(t)) return true;
    const key = Object.keys(RELATED).find(k => s.includes(k));
    return !!key && RELATED[key].some(w => t.includes(w));
  }

  // Everything the report shows, from the signed-in account only.
  function reportData(u) {
    const ua = typeof userActivity !== 'undefined' ? userActivity : {};
    const real = isReal(u);
    const own = Array.isArray(u && u.skills) ? u.skills : null;
    const box = () => String((document.getElementById('skills-input') || {}).value || '').split(',');   // what the demo profile shows
    let skills = real ? (own || ua.skills || []) : ((ua.skills || []).length ? ua.skills : (own && own.length ? own : box()));
    skills = [...new Set(skills.map(s => String(s).trim()).filter(Boolean))];
    if (real && skills.join(',') === DEMO_SKILLS) skills = [];   // left behind by a demo session in this tab
    const lessons = [...new Set((ua.lessonsCompleted || []).filter(id => typeof id === 'string' && id))];
    const ratings = (typeof demoRatings !== 'undefined' && Array.isArray(demoRatings)) ? demoRatings.filter(r => r && r.stars) : [];
    const accepted = (ua.jobsAccepted || []).filter(Boolean);
    // jobs: accepted through the app + the teen's own Hours log (kept per account since v42)
    const log = readJSON('tw_worklog', []).filter(e => e && parseFloat(e.hours) > 0);   // per account since v42
    const jobTypes = accepted.map(j => j.type || '').concat(log.map(e => TASKS[e.task] || e.task || '')).filter(Boolean);
    let jobsDone = accepted.length + log.length, hours = log.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
    if (real && window._twRealStats) {
      try { const s = window._twRealStats.stats(); jobsDone = Math.max(accepted.length, s.jobsCompleted || 0); hours = s.totalHours || hours; } catch (e) {}
    }
    const avg = ratings.length ? ratings.reduce((s, r) => s + (Number(r.stars) || 0), 0) / ratings.length : 0;
    const allSkills = [...new Set(skills.concat(jobTypes))];
    return { real, skills, allSkills, lessons, ratings, avg, jobTypes, jobsDone, hours: Math.round(hours * 10) / 10,
             empty: !skills.length && !lessons.length && !ratings.length && !jobsDone };
  }

  function skillBars(d) {
    if (!d.allSkills.length) return '<p style="color:var(--muted);font-size:.85rem">Add skills in <strong>Skills &amp; Tags</strong> below to see progress here.</p>';
    const ratingBonus = Math.min(d.ratings.length * 10, 30);
    return d.allSkills.map(skill => {
      const jobCount = d.jobTypes.filter(t => matches(skill, t)).length;
      const catKey = Object.keys(CATS).find(k => skill.toLowerCase().includes(k));
      const icon = (CATS[catKey] || {}).icon || '💼';
      const score = Math.min(100, 30 + jobCount * 25 + ratingBonus);
      const color = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--blue)';
      const level = score >= 75 ? 'Advanced' : score >= 50 ? 'Intermediate' : 'Beginner';
      return `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <div style="font-size:.85rem;font-weight:700">${icon} ${esc(skill)}</div>
          <div style="font-size:.75rem;font-weight:700;color:${color}">${level} · ${score}%</div>
        </div>
        <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
          <div style="width:${score}%;height:100%;background:${color};border-radius:4px;transition:width .6s ease"></div>
        </div>
      </div>`;
    }).join('');
  }
  function lessonList(d) {
    if (!d.lessons.length) return '<p style="color:var(--muted);font-size:.83rem">Complete lessons in the Lessons tab to earn skill points.</p>';
    return d.lessons.map(id => {
      const m = lessonInfo(id);
      return `<div style="display:flex;align-items:center;gap:8px;background:var(--green-pale);border-radius:8px;padding:6px 10px;margin-bottom:6px">
        <span style="font-size:1.1rem">${esc(m.icon)}</span>
        <span style="font-size:.83rem;font-weight:700;color:var(--green);flex:1">${esc(m.label)}</span>
        <span style="font-size:.72rem;font-weight:700;background:var(--green);color:#fff;padding:2px 8px;border-radius:10px">+${Number(m.pts) || 20}pts ✓</span>
      </div>`;
    }).join('');
  }
  const AI_BOX = 'background:var(--green-pale);border-left:4px solid var(--green);border-radius:0 10px 10px 0;padding:12px 14px;margin-bottom:1.2rem;font-size:.85rem;line-height:1.65';
  const RETRY = '<button type="button" class="btn-sm btn-ai" style="font-size:.72rem;margin-left:6px" onclick="renderSkillReport()">Try again</button>';
  function aiHTML(state, text) {
    if (state === 'loading') return '🤖 <strong>AI Assessment:</strong> <span class="loading-dots">Writing your assessment</span>';
    if (state === 'ok') return '🤖 <strong>AI Assessment:</strong> ' + esc(text).replace(/\n+/g, '<br>');
    if (state === 'empty') return '🌱 <strong>Your report fills in as you go.</strong> Add your skills in <strong>Skills &amp; Tags</strong>, finish a lesson, or log your hours after a job, and your AI assessment shows up here.';
    if (state === 'limit') return '🤖 <strong>AI Assessment:</strong> ' + esc(text || 'You\'ve used today\'s AI requests.') + ' Your progress below is up to date.';
    if (state === 'slow') return '🤖 <strong>AI Assessment:</strong> The AI is taking too long to answer right now. Your progress below is up to date.' + RETRY;
    return '🤖 <strong>AI Assessment:</strong> The AI assessment isn\'t available right now. Your progress below is up to date.' + RETRY;
  }

  // the AI's last answer for this account and this exact progress
  const CACHE = 'tw_skill_report_ai_v44';
  const signature = d => JSON.stringify([d.allSkills.slice().sort(), d.lessons.length, d.ratings.length, d.avg.toFixed(1), d.jobsDone]);
  function cached(u, sig) { const c = readJSON(CACHE, {})[acctKey(u)]; return c && c.sig === sig && c.text ? c.text : null; }
  function remember(u, sig, text) {
    const all = readJSON(CACHE, {}); all[acctKey(u)] = { sig, text, at: Date.now() };
    try { localStorage.setItem(CACHE, JSON.stringify(all)); } catch (e) {}
  }

  let run = 0;
  async function renderSkillReport(opts) {
    const panel = document.getElementById('skill-progress-panel');
    if (!panel) return;
    const my = ++run, u = me();
    let d;
    try { d = reportData(u); }
    catch (e) { console.warn('skill report', e); d = { real: isReal(u), allSkills: [], skills: [], lessons: [], ratings: [], avg: 0, jobTypes: [], jobsDone: 0, hours: 0, empty: true }; }
    const sig = signature(d);
    const hit = (opts && opts.auto) ? cached(u, sig) : null;   // 🔄 Refresh / Try again always ask the AI again
    const skipAI = d.empty && d.real;
    panel.innerHTML = `
      <div data-tw-skill-ai style="${AI_BOX}">${aiHTML(skipAI ? 'empty' : hit ? 'ok' : 'loading', hit)}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1.2rem">
        ${[['Jobs Done', d.jobsDone, 'var(--green)'], ['Avg Rating', d.avg ? d.avg.toFixed(1) + '⭐' : '—', 'var(--amber)'], ['Lessons', d.lessons.length, 'var(--blue)']]
          .map(([l, v, c]) => `<div style="background:var(--bg);border-radius:10px;padding:10px;text-align:center">
            <div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:900;color:${c}">${esc(v)}</div>
            <div style="font-size:.7rem;color:var(--muted);font-weight:600">${l}</div>
          </div>`).join('')}
      </div>
      <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Skill Levels</div>
      ${skillBars(d)}
      <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 8px">Completed Lessons</div>
      ${lessonList(d)}`;
    if (skipAI || hit) return;

    const who = acctKey(u);
    const box = () => (my === run && acctKey(me()) === who) ? panel.querySelector('[data-tw-skill-ai]') : null;
    const prompt = `You are a career coach for teens. Write a 2-sentence skill assessment for a teen with these skills: ${d.allSkills.join(', ') || 'none listed yet'}, ${d.lessons.length} lessons completed, ` +
      `${d.ratings.length ? 'average employer rating ' + d.avg.toFixed(1) + '/5 from ' + d.ratings.length + ' review' + (d.ratings.length === 1 ? '' : 's') : 'no employer ratings yet'}, ` +
      `${d.jobsDone} job${d.jobsDone === 1 ? '' : 's'} completed${d.hours ? ' (' + d.hours + ' hours logged)' : ''}. Use only these facts and don't invent any. Be encouraging and specific about their strongest area and one thing to improve.`;
    let timer;
    const slow = new Promise(res => { timer = setTimeout(() => res({ slow: true }), AI_WAIT_MS); });
    let out;
    try {
      const ask = typeof window.callAI === 'function' ? window.callAI(prompt) : window.callGemini(prompt);
      out = await Promise.race([Promise.resolve(ask).then(text => ({ text }), err => ({ err })), slow]);
    } catch (e) { out = { err: e }; }
    clearTimeout(timer);
    const b = box(); if (!b) return;
    if (out.slow) { b.innerHTML = aiHTML('slow'); return; }
    const msg = String(out.err ? (out.err.message || out.err) : '');
    if (/__AI_LIMIT__/.test(msg)) { b.innerHTML = aiHTML('limit', msg.replace('__AI_LIMIT__:', '').split(':')[1]); return; }
    const text = String(out.text || '').trim();
    if (out.err || !text || /^AI temporarily unavailable/i.test(text) || /^\{/.test(text)) { b.innerHTML = aiHTML('error'); return; }
    remember(u, sig, text);
    b.innerHTML = aiHTML('ok', text);
  }
  window.renderSkillReport = renderSkillReport;

  /* ── 3. Earnings: no made-up pay for real accounts ───────────────
     renderEarningsTracker() fills an empty log with four sample jobs
     ("Babysitting – Hendersons" …) and saves them. It never ran on
     this tab before this fix; now it does, so real accounts get their
     own (possibly empty) log, and samples saved earlier are removed. */
  const SAMPLE_EARN = new Set(['Lawn Mowing – Park Ave', 'Dog Walking – Martinez', 'Snow Shoveling', 'Babysitting – Hendersons']);
  const _oEarn = window.renderEarningsTracker;
  if (typeof _oEarn === 'function') {
    window.renderEarningsTracker = function () {
      const u = me();
      try {
        if (isReal(u) && typeof earningsLog !== 'undefined' && Array.isArray(earningsLog)) {
          const mine = earningsLog.filter(e => !(e && SAMPLE_EARN.has(e.job)));
          if (mine.length !== earningsLog.length) { earningsLog = mine; try { localStorage.setItem('tw_earnings_log', JSON.stringify(mine)); } catch (e) {} }
          if (!earningsLog.length) {
            const el = id => document.getElementById(id), set = (id, t) => { if (el(id)) el(id).textContent = t; };
            set('earn-total', '$0'); set('earn-hours', '0h'); set('earn-avg', '$0/hr'); set('earnings-total-badge', '$0 total');
            if (el('earnings-bar-chart')) el('earnings-bar-chart').innerHTML = '';
            if (el('earnings-bar-labels')) el('earnings-bar-labels').innerHTML = '';
            if (el('earnings-log')) el('earnings-log').innerHTML = '<div data-tw-empty="earnings" style="text-align:center;padding:1.2rem 1rem;color:var(--muted);font-size:.84rem;line-height:1.5"><div style="font-size:1.6rem;margin-bottom:.35rem">💵</div>No earnings logged yet. When you get paid for a job, add it below and your totals and weekly chart fill in.</div>';
            return;
          }
        }
      } catch (e) {}
      return _oEarn.apply(this, arguments);
    };
  }

  window._twTabRefresh = { hooks: () => JSON.parse(JSON.stringify(HOOKS)), reportData: () => reportData(me()), isReal: () => isReal(me()) };
})();
