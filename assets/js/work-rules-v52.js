/* ═══════════════════════════════════════════════════════════════════
   work-rules-v52 — one source for the work-hour and permit guidance teens see
   (2026-11-02, Aya's practice-account test, priority 1)
   Before: Find Jobs said a 16-year-old in Vermont had no federal hour limit,
   while Work Log said "max 18 hrs/week", measured the week against a 15 h
   "weekly limit" and printed the Vermont permit sentence twice. The 18 h is
   the federal rule for ages 14–15 only, and the 15 h was the app's default
   hours setting, not a law.
   Now every Teen screen that talks about hours or permits reads this file:
   • Find Jobs "work guidance" banner (window.twRenderLaborSummary)
   • Work Log: the rules box, the "this week" status line and the weekly bar
   • Calendar weekly bar, the apply / chat hour-goal notices (app-05)
   • Verification page "check a job" grid (TW_Verify.runComplianceCheck)
   Legal limits and the teen's own weekly goal are kept apart: the goal is a
   personal target saved on the account (the old 'max-weekly-hours' setting,
   default 15 h) and is always labelled "not a law".
   Sources, checked 2026-11-02 (re-check before changing any number):
   • 29 CFR 570.35 (eCFR, current to 2026-10-22): ages 14–15 hours/time of day.
   • US DOL WHD Fact Sheet #43 (rev. Dec 2016): no federal hour limits at 16–17,
     under-14 rule, hazardous orders, non-manufacturing/non-hazardous for 14–15.
   • US DOL employment/age certificate table (rev. 2024-01-01): Vermont = under
     16 during school hours. Permit data itself stays in job-tiers-v45 PERMITS.
   • Vermont: 21 V.S.A. §§ 431, 434, 436, 437 (legislature.vermont.gov, read
     2026-11-02) and Vermont DOL employer guide WH-30 (the 9 h / 50 h rule for
     16–17 in manufacturing or mechanical work comes only from WH-30).
   Only federal rules and Vermont are verified. Other states show the federal
   rules plus their older TeenWork notes, labelled "not re-checked yet".
   window.twWorkRules = { forTeen, current, weekTarget, weekStatusHTML, … }
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.twWorkRules) return;

  const REVIEWED = '2026-11-02', REVIEWED_TEXT = 'Nov 2, 2026';
  const SRC = {
    cfr: { label: '29 CFR 570.35', url: 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570/subpart-C/section-570.35' },
    fs43: { label: 'US DOL Fact Sheet #43', url: 'https://www.dol.gov/agencies/whd/fact-sheets/43-child-labor-non-agriculture' },
    certs: { label: 'US DOL work permit table', url: 'https://www.dol.gov/agencies/whd/state/age-certificates' },
    vt431: { label: '21 V.S.A. § 431', url: 'https://legislature.vermont.gov/statutes/section/21/005/00431' },
    vt434: { label: '21 V.S.A. § 434', url: 'https://legislature.vermont.gov/statutes/section/21/005/00434' },
    vt436: { label: '21 V.S.A. § 436', url: 'https://legislature.vermont.gov/statutes/section/21/005/00436' },
    vt437: { label: '21 V.S.A. § 437', url: 'https://legislature.vermont.gov/statutes/section/21/005/00437' },
    wh30: { label: 'Vermont DOL guide WH-30', url: 'https://labor.vermont.gov/src/sites/labor/files/doc_library/WH-30-Information-for-Employer-Child-Labor-Law.pdf' },
  };

  /* ── the rules (one place to change them) ─────────────────────────── */
  // Federal (FLSA), non-farm work. 29 CFR 570.35(a) and Fact Sheet #43.
  const FED = {
    minAge: 14,
    under16: { schoolDay: 3, schoolWeek: 18, nonSchoolDay: 8, nonSchoolWeek: 40, start: '7 a.m.', end: '7 p.m.', summerEnd: '9 p.m.' },
    hazardUnder: 18,
  };
  // States TeenWork has checked against official text. Numbers only where the source says them.
  const STATES = {
    'Vermont': {
      reviewed: REVIEWED,
      // 21 V.S.A. § 434(a),(b) and § 437(b): applies to everyone under 16 (so under-14s too).
      under16: { schoolDay: 3, schoolWeek: 18, nonSchoolDay: 8, nonSchoolWeek: 40, daysPerWeek: 6, start: '7 a.m.', end: '7 p.m.', summerEnd: '9 p.m.' },
      // WH-30 only (no statute cited there): manufacturing or mechanical work at 16–17.
      over16Factory: { day: 9, week: 50 },
      sources: ['vt431', 'vt434', 'vt436', 'vt437', 'wh30', 'certs'],
    },
  };
  const GOAL_OPTIONS = [5, 8, 10, 12, 15, 20, 25, 30];
  const NO_GOAL = 999;            // the old "Use State Limits" value: no personal goal

  /* ── helpers ──────────────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const me = () => { try { if (typeof currentUser !== 'undefined' && currentUser) return currentUser; } catch (e) {} return window.currentUser || null; };
  const ABBR = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
  const NAMES = Object.values(ABBR);
  function stateName(s) {
    s = String(s || '').trim(); if (!s) return '';
    if (ABBR[s.toUpperCase()]) return ABBR[s.toUpperCase()];
    return NAMES.find(n => n.toLowerCase() === s.toLowerCase()) || '';
  }
  const stateData = () => { try { return typeof STATE_DATA !== 'undefined' ? STATE_DATA : null; } catch (e) { return null; } };
  function ageOf(u) {
    if (u && u.dob) {
      const d = new Date(/^\d{4}-\d\d-\d\d$/.test(u.dob) ? u.dob + 'T00:00:00' : u.dob), n = new Date();
      if (!isNaN(d)) { const a = n.getFullYear() - d.getFullYear() - (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate()) ? 1 : 0); return a >= 10 && a <= 17 ? a : null; }
    }
    const a = Number(u && u.age); return Number.isInteger(a) && a >= 10 && a <= 17 ? a : null;
  }
  const h = n => n + ' h';

  /* ── permit: the data lives in job-tiers-v45 (PERMITS, from the DOL table) ── */
  function permitLine(state, age) {
    try {
      const jt = window.twJobTiers;
      if (jt && typeof jt.permitNeeded === 'function') { const p = jt.permitNeeded(state, age); if (p && p.note) return p.note; }
    } catch (e) {}
    return '';
  }
  // Older STATE_DATA notes, without their permit sentences (the permit line above replaces them).
  const PERMIT_SENTENCE = /permit|certificate|working papers|get it from|apply through|proof of age|child labor law poster|parental (consent|notification)/i;
  function olderNotes(state) {
    const e = (stateData() || {})[state]; if (!e) return '';
    let n = String(e.notes || '');
    if (e.permitNote) n = n.split(e.permitNote).join(' ');
    return n.split(/(?<=\.)\s+/).filter(s => s && !PERMIT_SENTENCE.test(s)).join(' ').replace(/\s{2,}/g, ' ').trim();
  }

  /* ── the teen's own weekly goal (not a law) ───────────────────────── */
  function controls() { try { return typeof parentalControls !== 'undefined' ? parentalControls : null; } catch (e) { return null; } }
  function goalHours() {
    const c = controls(); const n = Number(c && c['max-weekly-hours']);
    return n > 0 && n < NO_GOAL ? n : null;
  }
  function setGoal(n) {
    const c = controls(); if (!c) return;
    n = Number(n); c['max-weekly-hours'] = n > 0 && n < NO_GOAL ? n : NO_GOAL;
    try { if (typeof saveUserData === 'function') saveUserData(); } catch (e) {}
    try { if (typeof window.twMoneyRedraw === 'function') window.twMoneyRedraw(); } catch (e) {}
    renderWorkLogRules();
    try { const b = $('teen-state-rules-banner'); if (b) window.twRenderLaborSummary(b); } catch (e) {}
  }

  /* ── what applies to one teen ─────────────────────────────────────── */
  function forTeen(age, state) {
    const name = stateName(state);
    const out = { age, state: name, known: !!(age && name), verified: !!STATES[name], reviewed: REVIEWED, summary: '', lines: [], permit: '', older: '', sources: [], week: null, day: null };
    if (!out.known) {
      out.summary = 'Add your age and state to see the work rules that apply to you.';
      out.lines.push(['Why', 'Your age or state is missing from your profile. A search filter does not show where you work. Ask a parent to review each job and your local rules.']);
      return out;
    }
    const S = STATES[name] || null;
    const u16 = (S && S.under16) || FED.under16;
    const src = new Set(['cfr', 'fs43']);
    const hoursLine = () => `Outside school hours only. Up to ${h(u16.schoolDay)} on a school day and ${h(u16.schoolWeek)} in a week when school is in session; up to ${h(u16.nonSchoolDay)} a day and ${h(u16.nonSchoolWeek)} a week when school is out.`;
    const timeLine = () => `Between ${u16.start} and ${u16.end} (until ${u16.summerEnd} from June 1 through Labor Day).`;
    if (age < 14) {
      out.summary = `Age ${age} · ${name}: most jobs aren't allowed under 14. Check every task with a parent.`;
      out.lines.push(['Under 14', 'Federal law allows most jobs only from 14. It doesn\'t cover casual babysitting, small chores around private homes, delivering newspapers or acting.']);
      if (name === 'Vermont') {
        out.lines.push(['Vermont', 'Under 14, Vermont allows only jobs its Labor Commissioner has approved, during vacations or before and after school. Working for your own parent (not factory, mining or hazardous work), newspaper delivery and acting are the exceptions.']);
        out.lines.push(['Hours', 'Vermont\'s under-16 hours apply too: ' + hoursLine() + ' No more than ' + u16.daysPerWeek + ' days a week.']);
        out.lines.push(['Time of day', timeLine()]);
        out.week = { school: u16.schoolWeek, out: u16.nonSchoolWeek }; out.day = { school: u16.schoolDay, out: u16.nonSchoolDay };
      }
    } else if (age < 16) {
      out.summary = `Age ${age} · ${name}: outside school hours, up to ${h(u16.schoolDay)} on a school day and ${h(u16.schoolWeek)} in a school week.`;
      out.lines.push(['Hours', hoursLine() + (S && S.under16.daysPerWeek ? ` No more than ${S.under16.daysPerWeek} days a week (Vermont).` : '')]);
      out.lines.push(['Time of day', timeLine()]);
      out.lines.push(['Job types', 'Only non-factory, non-hazardous jobs at 14 and 15 (federal law).']);
      out.week = { school: u16.schoolWeek, out: u16.nonSchoolWeek }; out.day = { school: u16.schoolDay, out: u16.nonSchoolDay };
    } else {
      out.summary = S
        ? `Age ${age} · ${name}: no hour limits for most jobs at ${age} under federal or ${name} law. Hazardous jobs stay off-limits until 18.`
        : `Age ${age} · ${name}: no federal hour limits at ${age}. ${name}'s own limits may be stricter. Hazardous jobs stay off-limits until 18.`;
      out.lines.push(['Hours', `Federal law sets no hour or time-of-day limits at 16 and 17.` + (S ? ` ${name}'s child labor law adds none for most jobs.` : '')]);
      if (S && S.over16Factory) out.lines.push(['Factory work', `In manufacturing or mechanical work, ${name} allows at most ${h(S.over16Factory.day)} a day and ${h(S.over16Factory.week)} a week at 16 and 17.`]);
    }
    if (age >= 14) out.lines.push(['Off-limits until 18', 'Jobs federal law calls hazardous, such as driving for work, power saws, roofing, demolition and many power-driven machines.']);
    out.permit = permitLine(name, age);
    if (out.permit) { out.lines.push(['Work permit', out.permit]); src.add('certs'); }
    if (S) S.sources.forEach(k => src.add(k));
    else { out.older = olderNotes(name); }
    out.sources = [...src].map(k => SRC[k]).filter(Boolean);
    return out;
  }
  function current() { const u = me(); return forTeen(ageOf(u), u && u.state); }

  // The number the weekly bar measures against: the lower of the teen's goal and a legal school-week limit.
  function weekTarget() {
    const r = current(), goal = goalHours(), legal = r.week ? r.week.school : null;
    if (legal != null && (goal == null || legal <= goal)) return { hours: legal, kind: 'legal', name: 'legal limit for a school week', short: 'school-week limit' };
    if (goal != null) return { hours: goal, kind: 'goal', name: 'weekly goal', short: 'weekly goal' };
    return null;
  }
  window.twWeeklyHourLimit = function () { const t = weekTarget(); return t ? t.hours : 0; };

  // One line for "this week" (Work Log). Hours = hours logged this week.
  function weekStatusHTML(worked) {
    const r = current(), w = Math.round((Number(worked) || 0) * 10) / 10;
    const at = `You're at ${esc(h(w))} this week`;
    if (!r.known) return `<span>${at}. Add your age and state to your profile to compare it with the law.</span>`;
    if (!r.week && r.age < 14) return `<span style="color:var(--amber)">${at}. Most jobs aren't allowed under 14, so check each task with a parent.</span>`;
    if (!r.week) return `<span style="color:var(--green)">${at}. No legal weekly hour limit applies at ${esc(r.age)}${r.verified ? ' in ' + esc(r.state) : ' under federal law'} for most jobs.</span>`;
    if (w > r.week.out) return `<span style="color:var(--red)">⚠️ ${at}, over ${esc(h(r.week.out))}: the legal limit even in a week without school.</span>`;
    if (w > r.week.school) return `<span style="color:var(--red)">⚠️ ${at}, over ${esc(h(r.week.school))}: the legal limit for a week when school is in session (${esc(h(r.week.out))} when school is out).</span>`;
    if (w >= r.week.school * 0.8) return `<span style="color:var(--amber)">${at}, close to the ${esc(h(r.week.school))} school-week limit.</span>`;
    return `<span style="color:var(--green)">${at}, within the ${esc(h(r.week.school))} school-week limit ✓</span>`;
  }

  function goalNote() {
    const g = goalHours();
    return g ? `Your weekly goal is ${h(g)}: a personal target you can change in Work Log, not a law.` : 'You have no weekly hours goal set. You can add one in Work Log.';
  }
  function sourcesHTML(r) {
    const links = r.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(', ');
    return `<p class="tw52-src">Checked against ${links} on ${REVIEWED_TEXT}. General guidance, not legal advice or a ruling that a job is legal. Job duties, school schedules and exceptions can change what applies.</p>`;
  }
  function linesHTML(r) {
    let s = '<dl class="tw52-rules">' + r.lines.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') + '</dl>';
    if (r.known && !r.verified) {
      s += `<p class="tw52-unverified"><strong>${esc(r.state)} rules not re-checked yet.</strong> The rules above are federal. ${esc(r.state)} may be stricter; check with its labor department.` +
        (r.older ? ` Older TeenWork notes (not re-checked): ${esc(r.older)}` : '') + '</p>';
    }
    return s;
  }

  /* ── Find Jobs banner ─────────────────────────────────────────────── */
  window.twRenderLaborSummary = function (banner) {
    if (!banner) return;
    const r = current();
    const html = '<strong>' + esc(r.summary) + '</strong><details class="tw-law-details"><summary>Full work guidance and limits</summary>' +
      linesHTML(r) + (r.known ? '<p class="tw52-goal">' + esc(goalNote()) + '</p>' + sourcesHTML(r) : '') + '</details>';
    // Compare with what was last written (the browser rewrites entities, so innerHTML never matches).
    if (banner._twHtml !== html || !banner.querySelector('.tw-law-details')) {
      const open = !!banner.querySelector('.tw-law-details[open]');
      banner.innerHTML = html; banner._twHtml = html;
      if (open) banner.querySelector('.tw-law-details').open = true;
    }
    if (!banner.classList.contains('show')) banner.classList.add('show');
  };

  /* ── Work Log rules box + goal picker ─────────────────────────────── */
  function renderWorkLogRules() {
    const box = $('tw52-wl-rules-text'); if (!box) return;
    const r = current(), g = goalHours();
    const opts = [`<option value="${NO_GOAL}"${g == null ? ' selected' : ''}>No goal</option>`]
      .concat(GOAL_OPTIONS.concat(g && GOAL_OPTIONS.indexOf(g) < 0 ? [g] : []).sort((a, b) => a - b).map(n => `<option value="${n}"${n === g ? ' selected' : ''}>${n} h a week</option>`)).join('');
    const legalWeek = !r.known ? 'Add your age and state to your profile to see your legal limits.'
      : r.week ? `${h(r.week.school)} in a week when school is in session, ${h(r.week.out)} when school is out.`
        : `None for most jobs at ${r.age}${r.verified ? ' in ' + r.state : ' under federal law' + ' (' + r.state + ' may be stricter)'}.`;
    const html = `<p class="tw52-wl-sum"><strong>${esc(r.summary)}</strong></p>` +
      `<div class="tw52-wl-row"><span class="tw52-k">Legal weekly limit</span><span>${esc(legalWeek)}</span></div>` +
      `<div class="tw52-wl-row"><label class="tw52-k" for="tw52-goal">Your weekly goal</label><span><select id="tw52-goal" aria-describedby="tw52-goal-help">${opts}</select> <small id="tw52-goal-help">A personal target, not a law.</small></span></div>` +
      `<details class="tw-law-details"><summary>All rules for your age</summary>${linesHTML(r)}${r.known ? sourcesHTML(r) : ''}</details>`;
    if (box._twHtml !== html) {
      const open = !!box.querySelector('.tw-law-details[open]');
      box.innerHTML = html; box._twHtml = html;
      if (open) box.querySelector('.tw-law-details').open = true;
      const sel = $('tw52-goal'); if (sel) sel.onchange = () => setGoal(sel.value);
    }
  }

  /* ── Verification page: "check a job" grid ────────────────────────── */
  function wrapVerifyCheck() {
    let V; try { V = typeof TW_Verify !== 'undefined' ? TW_Verify : null; } catch (e) { V = null; }
    if (!V || typeof V.runComplianceCheck !== 'function' || V.runComplianceCheck.__tw52) return;
    const o = V.runComplianceCheck;
    const w = function () {
      const p = o.apply(this, arguments);           // writes its old grid synchronously, then asks the AI
      try {
        const age = parseInt(($('tw-ver-age') || {}).value, 10) || null, st = ($('tw-ver-state') || {}).value || '';
        const jtype = ($('tw-ver-job-type-check') || {}).value || '';
        const r = forTeen(age, st), grid = $('tw-ver-law-grid');
        const hazardous = /manufactur|construction/i.test(jtype);
        if (grid && r.known) {
          const rows = [
            ['Minimum age', age < 14 ? 'Most jobs start at 14' : 'Age ' + age + ' can work', age >= 14],
            ['School-day hours', r.day ? 'Up to ' + h(r.day.school) + ' a day' : 'No legal limit for most jobs', true],
            ['Weekly hours', r.week ? h(r.week.school) + ' school week · ' + h(r.week.out) + ' otherwise' : 'No legal limit for most jobs', true],
            ['Work permit', r.permit || 'Check your state', true],
            ['Job type', hazardous ? 'Blocked on TeenWork (hazardous work)' : (age < 14 ? 'Check with a parent' : 'Allowed for age ' + age), !hazardous && age >= 14],
            ['Checked', (r.verified ? 'Federal + ' + r.state : 'Federal only (' + r.state + ' not re-checked)') + ' · ' + REVIEWED_TEXT, r.verified],
          ];
          grid.innerHTML = rows.map(([k, v, ok]) => `<div class="tw-ver-law-pill ${ok ? 'ok' : 'warn'}"><div class="tw-ver-pill-label">${esc(k)}</div><div class="tw-ver-pill-val">${esc(v)}</div></div>`).join('');
        }
      } catch (e) { console.warn('work-rules-v52: verify grid', e); }
      return p;
    };
    w.__tw52 = true; V.runComplianceCheck = w;
  }

  /* ── keep STATE_DATA's Vermont text in step (other blocks and the AI read it) ── */
  function fixStateData() {
    const S = stateData(), vt = S && S.Vermont; if (!vt || vt.__tw52) return;
    const u = STATES.Vermont.under16;
    vt.notes = `Under 16: outside school hours, max ${u.schoolDay}h on a school day, ${u.schoolWeek}h in a school week, ${u.nonSchoolDay}h a day and ${u.nonSchoolWeek}h a week when school is out, ${u.daysPerWeek} days a week, ${u.start}–${u.end} (${u.summerEnd} June 1–Labor Day). Ages 16–17: no hour limits for most jobs (factory or mechanical work: 9h a day, 50h a week). ` + (vt.permitNote || '');
    vt.notes = vt.notes.trim();
    vt.nightCurfew = '7pm';
    vt.__tw52 = true;
  }

  function boot() {
    try { fixStateData(); } catch (e) {}
    try { wrapVerifyCheck(); } catch (e) {}
    try { renderWorkLogRules(); } catch (e) {}
  }
  boot();
  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', () => { boot(); setTimeout(boot, 1500); });

  window.twWorkRules = { REVIEWED, SOURCES: SRC, FED, STATES, forTeen, current, weekTarget, weekStatusHTML, goalHours, setGoal, renderWorkLogRules, stateName, NO_GOAL };
})();
