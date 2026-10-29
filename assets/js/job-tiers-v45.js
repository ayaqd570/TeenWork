
/* ═══════════════════════════════════════════════════════════════════
   job-tiers-v45 — real job tiers and state work-permit rules (2026-10-17)
   Aya: "for job tiers do jobs actually get flaged as tier 2 or 3 … also in
   some states you need work permit to do any work"
   Before: jobs only had a type and a minimum age. The Verification page said
   "Unlocks Tier 2 / Tier 3 jobs", but nothing checked a tier (TW_Verify.canApply
   was never called), and STATE_DATA's permit flags only fed a banner.
   Now:
   • Every job is Tier 2 (👪 parent OK) or Tier 3 (📋 work permit). It is Tier 3
     when the job's state needs a permit at the teen's age, or when the employer
     ticks "Always ask for a work permit". Find Jobs shows the tier on each card.
   • Applying is checked in one wrapper around teenApply/applyToJob: the job's
     minimum age, hazardous job types, parent consent (Tier 2), work permit (Tier 3).
     A blocked teen gets a short pop-up saying what is missing and where to get it.
       Tier 2 = consent from a linked parent (parent-consent-v44 when present),
                otherwise an approved parent link. Tester accounts always pass Tier 2.
       Tier 3 = window.twWorkPermitStatus().ok (permit-check-v45 when present),
                otherwise a self-reported permit saved to user_data "work_permit".
   • Permit rules per state (PERMITS below) come from the US Department of Labor
     table "State Child Labor Laws: Employment/Age Certification" (Jan 1, 2024),
     plus Wisconsin's 2017 change (permits only under 16) and Oregon (the employer,
     not the teen, holds the certificate). The value is the age a permit is needed
     under: 18 = every teen, 16 = under 16 only, 0 = not needed. CO, MN and VT only
     need one to work during school hours, so they count as 0 here.
     STATE_DATA's permit flag and notes are corrected from this table, and the
     Find Jobs banner, sign-up note and Verification step 3 use the teen's age.
   • Farm work: new "Farm Work" job type, following federal law (FLSA farm rules;
     Aya 2026-10-18: "Do what the law says"): from age 12 (12–13 need a parent's
     written OK, which Tier 2 parent consent covers), under 16 only outside school
     hours, no federal weekly hour limit, and tractors, power machinery or farm
     chemicals only from 16 (employer box "Uses tractors, machinery or farm
     chemicals"). Read from ai-shift-finder's FARM_RULE when it is in the file.
     States may be stricter.
   • HOME_JOBS_EXEMPT (off): when on, employers can mark "odd job at my home"
     (babysitting, yard work), which skips the permit. Off = permit for every job.
   Wraps functions only; no base code is edited.
   window.twJobTiers = { permitNeeded, check, teenStatus, tierOf, refresh, PERMITS }
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twJobTiers45) return;
  window.__twJobTiers45 = true;

  /* ── rules (one place to change them) ─────────────────────────────── */
  const HOME_JOBS_EXEMPT = false;
  const FARM_TYPE = 'farm work';
  // Federal farm rule (FLSA, 29 CFR 570 subpart E-1). Read at call time so ai-shift-finder's FARM_RULE wins
  // wherever its block sits in the file. weekMax null = no weekly cap (federal law has none outside school hours).
  function farmRule() {
    const r = (window._twShiftFinder && window._twShiftFinder.rules && window._twShiftFinder.rules.FARM_RULE) || {};
    const n = (v, d) => (typeof v === 'number' && v >= 0 ? v : d);
    return {
      minAge: n(r.minAge, 12),                // 12–13 with a parent's written OK
      consentUnder: n(r.consentUnder, 14),
      outsideSchoolUnder: n(r.outsideSchoolUnder, 16),
      hazardUnder: n(r.hazardUnder, 16),      // tractors, power machinery, farm chemicals
      weekMax: typeof r.weekMax === 'number' && r.weekMax > 0 ? r.weekMax : null,
    };
  }
  // States with stricter farm-hour limits (ai-shift-finder's FARM_STATE wins when it is in the file).
  const FARM_STATE_FALLBACK = { 'Vermont': { under: 16, dayMax: 8, weekMax: 40, cite: '21 V.S.A. § 437(b)' } };
  function farmStateRule(state, age) {
    const R = window._twShiftFinder && window._twShiftFinder.rules, name = stateName(state);
    if (R && typeof R.farmStateRule === 'function') { try { return R.farmStateRule(name, age) || null; } catch (e) {} }
    const r = ((R && R.FARM_STATE) || FARM_STATE_FALLBACK)[name];
    return r && age < r.under ? r : null;
  }
  const HAZARD_TYPES = ['manufacturing', 'construction'];
  const DOL_URL = 'https://www.dol.gov/agencies/whd/state/age-certificates';
  // [age a permit is needed under, extra]  extra: 'school' = only during school hours, 'employer' = employer's certificate
  const PERMITS = {
    'Alabama': [18], 'Alaska': [17], 'Arizona': [0], 'Arkansas': [0], 'California': [18],
    'Colorado': [0, 'school'], 'Connecticut': [18], 'Delaware': [18], 'District of Columbia': [18],
    'Florida': [0], 'Georgia': [16], 'Hawaii': [18], 'Idaho': [0], 'Illinois': [16], 'Indiana': [0],
    'Iowa': [16], 'Kansas': [0], 'Kentucky': [0], 'Louisiana': [18], 'Maine': [16], 'Maryland': [18],
    'Massachusetts': [18], 'Michigan': [18], 'Minnesota': [0, 'school'], 'Mississippi': [0],
    'Missouri': [16], 'Montana': [0], 'Nebraska': [16], 'Nevada': [14], 'New Hampshire': [16],
    'New Jersey': [18], 'New Mexico': [17], 'New York': [18], 'North Carolina': [18],
    'North Dakota': [16], 'Ohio': [18], 'Oklahoma': [16], 'Oregon': [0, 'employer'],
    'Pennsylvania': [18], 'Rhode Island': [18], 'South Carolina': [0], 'South Dakota': [0],
    'Tennessee': [0], 'Texas': [0], 'Utah': [0], 'Vermont': [0, 'school'], 'Virginia': [16],
    'Washington': [18], 'West Virginia': [16], 'Wisconsin': [16], 'Wyoming': [0],
  };
  const ABBR = { AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming' };

  /* ── helpers ──────────────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const me = () => { try { if (typeof currentUser !== 'undefined' && currentUser) return currentUser; } catch (e) {} return window.currentUser || null; };
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const isTester = u => { try { return !!(window._twIsTesterUser && window._twIsTesterUser(u)); } catch (e) { return false; } };
  const isTeen = u => !!(u && !u.isAdmin && u.type === 'teen');
  const toast = (m, t) => { try { showToast(m, t || 'info'); } catch (e) {} };
  const later = (fn, ms) => setTimeout(() => { try { fn(); } catch (e) { console.warn('job-tiers:', e); } }, ms || 0);
  const lower = s => String(s || '').trim().toLowerCase();
  const stateName = s => { s = String(s || '').trim(); if (!s) return ''; if (ABBR[s.toUpperCase()]) return ABBR[s.toUpperCase()]; const k = Object.keys(PERMITS).find(n => n.toLowerCase() === s.toLowerCase()); return k || s; };
  const stateData = () => { try { return typeof STATE_DATA !== 'undefined' ? STATE_DATA : null; } catch (e) { return null; } };
  const jobsList = () => { try { return typeof browsableJobs !== 'undefined' ? browsableJobs : []; } catch (e) { return []; } };
  const postedList = () => { try { return typeof employerPostedJobs !== 'undefined' ? employerPostedJobs : []; } catch (e) { return []; } };
  function ageOfDob(dob) {
    if (!dob) return null; const b = new Date(/^\d{4}-\d\d-\d\d$/.test(dob) ? dob + 'T00:00' : dob); if (isNaN(b)) return null;
    const t = new Date(); let a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    return a;
  }
  function teenAge(u) {
    u = u || me();
    const a = ageOfDob(u && u.dob); if (a != null) return a;
    try { if (typeof getTeenAge === 'function') return getTeenAge(); } catch (e) {}
    return (u && u.age) || 16;
  }
  function teenState(u) {
    u = u || me();
    return stateName((u && u.state) || (() => { try { return typeof getTeenState === 'function' ? getTeenState() : ''; } catch (e) { return ''; } })());
  }
  const isFarmJob = j => !!(j && (j.farm === true || lower(j.type) === FARM_TYPE));

  /* ── permit rule ──────────────────────────────────────────────────── */
  function permitNeeded(state, age) {
    const name = stateName(state);
    const row = PERMITS[name];
    const info = (stateData() || {})[name] || {};
    const url = info.permitUrl || DOL_URL;
    if (!row) return { needed: false, under: 0, state: name, known: false, url, note: name ? `TeenWork has no work permit rule on file for ${name}. Check with your state labor department.` : '' };
    const under = row[0], extra = row[1] || '';
    const a = (age == null || isNaN(age)) ? 16 : Number(age);
    const needed = under > 0 && a < under;
    let note;
    if (under >= 18) note = `${name} needs a work permit for every worker under 18. You usually get it from your school.`;
    else if (under > 0) note = `${name} needs a work permit for workers under ${under}${needed ? '' : `, so at ${a} you don't need one`}. You usually get it from your school.`;
    else if (extra === 'school') note = `${name} only needs a work permit for teens under 16 working during school hours, so after-school and weekend jobs don't need one.`;
    else if (extra === 'employer') note = `${name} doesn't give teens a work permit. The employer gets the certificate.`;
    else note = `${name} doesn't need a work permit for teens.`;
    return { needed, under, extra, state: name, known: true, url, note };
  }

  // Correct STATE_DATA's permit flag and notes from PERMITS (banners, sign-up note and the AI read them).
  const PERMIT_SENTENCE = /permit|certificate|working papers|get it from|apply through|proof of age|child labor law poster|parental (consent|notification) recommended/i;
  function fixStateData() {
    const S = stateData(); if (!S) return;
    Object.keys(S).forEach(name => {
      const e = S[name], row = PERMITS[name]; if (!e || !row || e.__twjt) return;
      const p = permitNeeded(name, 13);
      e.permitRequired = row[0] > 0;
      e.permitUnder = row[0];
      e.permitNote = p.note;
      if (!e.permitRequired) e.permitUrl = e.permitUrl || '';
      const kept = String(e.notes || '').split(/(?<=\.)\s+/).filter(s => s && !PERMIT_SENTENCE.test(s)).join(' ');
      e.notes = (kept + ' ' + p.note).trim();
      e.__twjt = true;
    });
  }
  fixStateData();

  /* ── what the teen has ────────────────────────────────────────────── */
  function permitStatus(u) {
    u = u || me();
    if (typeof window.twWorkPermitStatus === 'function') {
      try { const s = window.twWorkPermitStatus() || {}; return { ok: !!s.ok, status: s.status || 'none', state: s.state || '', source: 'check' }; } catch (e) {}
    }
    let saved = null; try { saved = window._DB ? _DB.load('work_permit', null) : null; } catch (e) {}
    if (saved && saved.status === 'self-reported') return { ok: true, status: 'self-reported', state: saved.state || '', source: 'self' };
    return { ok: false, status: 'none', state: '', source: typeof window.twWorkPermitStatus === 'function' ? 'check' : 'self' };
  }
  function consentStatus(u) {
    u = u || me();
    if (!isTeen(u)) return { ok: true, why: '' };
    if (isDemoUser(u)) return { ok: true, why: 'demo' };
    if (isTester(u)) return { ok: true, why: 'tester' };
    if (window._twParentConsent && typeof window._twParentConsent.teenConsent === 'function') {
      let by = null; try { by = window._twParentConsent.teenConsent(); } catch (e) {}
      return by ? { ok: true, why: 'consent' } : { ok: false, why: 'consent' };
    }
    return document.body && document.body.classList.contains('tw-limited') ? { ok: false, why: 'link' } : { ok: true, why: 'link' };
  }
  function teenStatus(u) {
    u = u || me();
    const c = consentStatus(u), p = permitStatus(u);
    return { tier: p.ok && c.ok ? 3 : c.ok ? 2 : 1, consent: c, permit: p, age: teenAge(u), state: teenState(u) };
  }

  /* ── what a job needs ─────────────────────────────────────────────── */
  function tierOf(job, u) {
    u = u || me();
    const state = stateName((job && job.state) || teenState(u));
    const p = permitNeeded(state, teenAge(u));
    const homeSkip = HOME_JOBS_EXEMPT && job && job.homeJob && !job.permit;
    const permit = !!(job && job.permit) || (p.needed && !homeSkip);
    return { tier: permit ? 3 : 2, permit, byEmployer: !!(job && job.permit), rule: p };
  }
  function check(job, u) {
    u = u || me();
    const out = { ok: true, tier: 2, blocks: [] };
    if (!job || !isTeen(u)) return out;
    const t = tierOf(job, u), age = teenAge(u), st = teenStatus(u);
    out.tier = t.tier; out.rule = t.rule;
    const minAge = Number(job.minAge) || 0;
    if (minAge && age < minAge) out.blocks.push({ kind: 'age', msg: `This job is for ages ${minAge} and up, and you're ${age}.` });
    if (HAZARD_TYPES.includes(lower(job.type))) out.blocks.push({ kind: 'hazard', msg: `${job.type} jobs aren't allowed for anyone under 18.` });
    if (isFarmJob(job)) {
      const F = farmRule();
      if (age < F.minAge) out.blocks.push({ kind: 'age', msg: `Farm jobs start at age ${F.minAge}.` });
      else if (job.hazardFarm && age < F.hazardUnder) out.blocks.push({ kind: 'age', msg: `This farm job uses tractors, power machinery or farm chemicals. The law only allows that from age ${F.hazardUnder}.` });
      else {
        const where = stateName(job.state || teenState(u)), fs = farmStateRule(where, age), hrs = Number(job.maxHours) || 0;
        if (fs && fs.weekMax && hrs > fs.weekMax) out.blocks.push({ kind: 'age', msg: `In ${where}, teens under ${fs.under} can work at most ${fs.weekMax} hours a week, farm work included. This job lists ${hrs}.` });
      }
    }
    if (!st.consent.ok) out.blocks.push({ kind: 'consent', msg: st.consent.why === 'link' ? 'Link a parent first. Every job is at least Tier 2, which needs a parent.' : "Your linked parent has to agree first, from their own TeenWork account (My Teens → Review & agree). Every job is at least Tier 2." });
    if (t.permit && !st.permit.ok) out.blocks.push({ kind: 'permit', msg: t.byEmployer && !t.rule.needed ? 'This employer asks every teen for a work permit.' : t.rule.note, pending: st.permit.status === 'needs_review' || st.permit.status === 'rejected' ? st.permit.status : '' });
    out.ok = !out.blocks.length;
    return out;
  }

  /* ── the "can't apply yet" pop-up ─────────────────────────────────── */
  function closeModal() { const m = $('twjt-modal'); if (m) m.remove(); }
  window.twJobTiersClose = closeModal;
  window.twJobTiersVerify = function () { closeModal(); try { window.showVerifyPage && window.showVerifyPage(); } catch (e) {} };
  function explain(job, res) {
    closeModal();
    const b = res.blocks[0];
    const head = { age: '🔒 Not old enough yet', hazard: '🚫 Not allowed for teens', consent: '👪 Parent consent needed', permit: '📋 Work permit needed' }[b.kind] || '🔒 Not yet';
    const extra = b.kind === 'permit'
      ? (b.pending === 'needs_review' ? '<p>Your permit is waiting for a TeenWork check. You can apply once it passes.</p>' : b.pending === 'rejected' ? '<p>Your last permit photo didn\'t pass. Add a clearer photo on the Verification page.</p>' : '<p>Add your permit on the Verification page (step 3) and you can apply.</p>') +
        (res.rule && res.rule.url ? `<p><a href="${esc(res.rule.url)}" target="_blank" rel="noopener">How to get a permit in ${esc(res.rule.state || 'your state')} →</a></p>` : '')
      : '';
    const btn = (b.kind === 'permit' || b.kind === 'consent') ? '<button type="button" class="twjt-btn pri" onclick="twJobTiersVerify()">Open Verification</button>' : '';
    const m = document.createElement('div'); m.id = 'twjt-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = `<div class="twjt-sheet"><button type="button" class="twjt-x" aria-label="Close" onclick="twJobTiersClose()">✕</button>
      <h3>${head}</h3><p class="twjt-job">${esc(job.title || 'This job')} · ${res.tier === 3 ? '📋 Tier 3 · Work permit' : '👪 Tier 2 · Parent OK'}</p>
      <p>${esc(b.msg)}</p>${extra}
      <div class="twjt-row">${btn}<button type="button" class="twjt-btn" onclick="twJobTiersClose()">OK</button></div></div>`;
    m.addEventListener('mousedown', e => { if (e.target === m) closeModal(); });
    document.body.appendChild(m);
  }

  /* ── apply gate ───────────────────────────────────────────────────── */
  function findJob(arg) {
    if (arg && typeof arg === 'object') return arg;
    const id = arg;
    return jobsList().find(j => j && String(j.id) === String(id)) || postedList().find(j => j && String(j.id) === String(id)) || null;
  }
  const gates = {};
  ['teenApply', 'applyToJob'].forEach(name => {
    const o = window[name];
    if (typeof o !== 'function' || o.__twjt) return;
    const w = function (jobArg) {
      const u = me();
      if (!isTeen(u) || (document.body && document.body.classList.contains('tw-limited'))) return o.apply(this, arguments);   // limited mode shows its own "link a parent" pop-up
      const job = findJob(jobArg);
      if (job) { const res = check(job, u); if (!res.ok) { explain(job, res); return; } }
      return o.apply(this, arguments);
    };
    w.__twjt = true; window[name] = w; gates[name] = w;
  });
  try { if (typeof TW_Verify !== 'undefined' && TW_Verify) TW_Verify.canApply = function (job) { const r = check(job); return r.ok ? { allowed: true, tier: r.tier } : { allowed: false, tier: r.tier, reason: r.blocks[0].msg }; }; } catch (e) {}

  /* ── Find Jobs: tier on each card ─────────────────────────────────── */
  const APPLY_RE = /(?:^|[^A-Za-z0-9_$])teenApply\(\s*'?([0-9A-Za-z_-]+)/;
  let decorating = false;
  function decorate() {
    const list = $('browse-jobs-list'); if (!list || decorating) return;
    const u = me(); if (!isTeen(u)) return;
    decorating = true;
    try {
      list.querySelectorAll('.browse-card').forEach(card => {
        const btn = card.querySelector('[onclick*="teenApply("]');
        const m = btn ? APPLY_RE.exec(btn.getAttribute('onclick') || '') : null;
        const job = m ? findJob(m[1]) : null;
        if (!job) return;
        const res = check(job, u);
        const meta = card.querySelector('.job-meta');
        let tag = card.querySelector('.twjt-tag');
        if (meta && !tag) { tag = document.createElement('span'); meta.insertBefore(tag, meta.firstChild); }
        if (tag) {
          tag.className = 'tag twjt-tag ' + (res.tier === 3 ? 't3' : 't2');
          const tierText = res.tier === 3 ? '📋 Tier 3 · Work permit' : '👪 Tier 2 · Parent OK';
          if (tag.textContent !== tierText) tag.textContent = tierText;   // an unconditional write re-ran this watcher ~30 times a second
          tag.title = res.tier === 3 ? (job.permit && !(res.rule && res.rule.needed) ? 'The employer asks for a work permit.' : (res.rule && res.rule.note) || '') : 'Needs a parent\'s OK.';
        }
        if (isFarmJob(job) && meta && !card.querySelector('.twjt-farm')) { const f = document.createElement('span'); f.className = 'tag twjt-farm'; f.textContent = '🚜 Farm'; meta.appendChild(f); }
        if (!btn.dataset.twjtLabel) btn.dataset.twjtLabel = btn.textContent;
        const b = res.blocks[0];
        const label = !b ? btn.dataset.twjtLabel : b.kind === 'permit' ? '🔒 Needs work permit' : b.kind === 'consent' ? '🔒 Needs parent consent' : '🔒 Not available';
        if (btn.textContent !== label) btn.textContent = label;
        btn.classList.toggle('twjt-locked', !!b);
      });
    } finally { decorating = false; }
  }
  const _oRender = window.renderBrowseJobs;
  if (typeof _oRender === 'function' && !_oRender.__twjt) {
    const w = function () { const r = _oRender.apply(this, arguments); try { decorate(); } catch (e) {} return r; };
    w.__twjt = true; window.renderBrowseJobs = w;
  }
  let obs = null;
  function watchList() {
    const list = $('browse-jobs-list'); if (!list || obs) return;
    let t = 0;
    obs = new MutationObserver(() => { if (decorating) return; clearTimeout(t); t = setTimeout(() => { try { decorate(); } catch (e) {} }, 30); });
    obs.observe(list, { childList: true, subtree: true });
  }

  // Age-aware permit banner on Find Jobs, and the sign-up note.
  window.showPermitBanner = function (state) {
    const banner = $('teen-permit-banner'); if (!banner) return;
    const u = me(), name = stateName(state);
    if (!PERMITS[name]) { banner.classList.remove('show'); return; }
    const p = permitNeeded(name, isTeen(u) ? teenAge(u) : 13), info = (stateData() || {})[name] || {};
    banner.classList.add('show');
    if (p.needed) {
      const have = isTeen(u) && permitStatus(u).ok;
      banner.innerHTML = `<strong>📋 ${have ? 'Your work permit is on file' : 'Work permit needed in ' + esc(name)}</strong> ${esc(p.note)} ${have ? '' : 'Jobs there are Tier 3 until you add one on the Verification page.'}${info.permitUrl ? ` <a href="${esc(info.permitUrl)}" target="_blank" rel="noopener">Learn more →</a>` : ''}`;
      banner.style.background = ''; banner.style.borderColor = ''; banner.style.color = '';
    } else {
      banner.innerHTML = `<strong>✅ No work permit needed${isTeen(u) ? ' at ' + esc(String(teenAge(u))) : ''} in ${esc(name)}</strong> ${esc(p.note)}`;
      banner.style.background = 'var(--green-pale)'; banner.style.borderColor = 'var(--green-light)'; banner.style.color = 'var(--green)';
    }
  };
  window.checkSignupStatePermit = function () {
    const state = ($('su-state') || {}).value || '', note = $('su-permit-note');
    if (!note || !state) return;
    const age = ageOfDob(($('su-age') || {}).value);
    const p = permitNeeded(state, age == null ? 13 : age);
    note.style.display = 'block';
    if (p.needed) { note.style.background = ''; note.style.color = ''; note.style.borderColor = ''; note.textContent = '⚠️ ' + p.note + ' You will need it before applying to jobs there.'; }
    else { note.style.background = 'var(--green-pale)'; note.style.color = 'var(--green)'; note.style.borderColor = 'var(--green-light)'; note.textContent = '✅ ' + p.note; }
  };

  /* ── job type lists: add Farm Work ────────────────────────────────── */
  function addFarmOption(sel, label) {
    if (!sel || [...sel.options].some(o => lower(o.value) === FARM_TYPE)) return;
    const o = document.createElement('option'); o.value = FARM_TYPE; o.textContent = label || 'Farm Work';
    const other = [...sel.options].find(x => lower(x.value) === 'other');
    sel.insertBefore(o, other || null);
  }

  /* ── employer: post form ──────────────────────────────────────────── */
  function empNote() {
    const n = $('twjt-emp-note'); if (!n) return;
    const state = ($('emp-state') || {}).value || '', type = lower(($('emp-type') || {}).value), ask = ($('twjt-emp-permit') || {}).checked;
    const F = farmRule(), farm = type === FARM_TYPE, hz = farm && !!($('twjt-emp-hazard') || {}).checked;
    const minEl = $('emp-min-age'); if (minEl) minEl.min = farm ? String(hz ? F.hazardUnder : F.minAge) : '13';
    const hzRow = $('twjt-emp-hazard-row'); if (hzRow) hzRow.style.display = farm ? 'flex' : 'none';
    let t = '';
    if (state && PERMITS[stateName(state)]) {
      const p13 = permitNeeded(state, 13), p17 = permitNeeded(state, 17);
      t = p17.needed ? `${stateName(state)} needs a work permit for every teen, so this job is Tier 3 (📋 work permit).`
        : p13.needed ? `${stateName(state)} needs a work permit for teens under ${p13.under}. For them this job is Tier 3; older teens see Tier 2.`
        : ask ? 'Tier 3: you ask every teen for a work permit.' : `${stateName(state)} doesn't need a teen work permit for this, so the job is Tier 2 (👪 parent OK).`;
    } else t = ask ? 'Tier 3: you ask every teen for a work permit.' : 'Pick a state to see whether teens need a work permit.';
    if (farm) t += ` Farm jobs (federal law): age ${F.minAge}+, with a parent's OK under ${F.consentUnder}; under ${F.outsideSchoolUnder} only outside school hours; ${F.weekMax ? `up to ${F.weekMax} h a week` : 'no weekly hour limit'}; tractors, machinery and farm chemicals ${F.hazardUnder}+.`;
    const fs = farm ? farmStateRule(state, 0) : null;
    if (farm) t += fs ? ` ${stateName(state)} also limits teens under ${fs.under} to ${fs.dayMax} h a day and ${fs.weekMax} h a week (${fs.cite}).` : ` ${stateName(state) || 'Your state'} may be stricter.`;
    n.textContent = t;
  }
  function buildEmpForm() {
    addFarmOption($('emp-type'));
    const minEl = $('emp-min-age'); if (!minEl || $('twjt-emp-row')) return;
    const row = minEl.closest('.form-row') || minEl.parentNode;
    const div = document.createElement('div'); div.id = 'twjt-emp-row'; div.className = 'form-group';
    div.innerHTML = `<label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-weight:600;cursor:pointer"><input type="checkbox" id="twjt-emp-permit" style="width:16px;height:16px"> 📋 Always ask for a work permit (Tier 3)</label>` +
      (HOME_JOBS_EXEMPT ? `<label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-weight:600;cursor:pointer;margin-top:6px"><input type="checkbox" id="twjt-emp-home" style="width:16px;height:16px"> 🏠 Odd job at my home (babysitting, yard work) — no permit needed</label>` : '') +
      `<label id="twjt-emp-hazard-row" style="display:none;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-weight:600;cursor:pointer;margin-top:6px"><input type="checkbox" id="twjt-emp-hazard" style="width:16px;height:16px"> 🚜 Uses tractors, power machinery or farm chemicals (16+)</label>` +
      `<div id="twjt-emp-note" class="twjt-emp-note"></div>`;
    row.parentNode.insertBefore(div, row.nextSibling);
    ['emp-state', 'emp-type', 'twjt-emp-permit', 'twjt-emp-hazard', 'emp-min-age'].forEach(id => { const el = $(id); if (el) { el.addEventListener('change', empNote); el.addEventListener('input', empNote); } });
    empNote();
  }
  // postJob is wrapped again at start-up by featpack-v24/v25 and plan-limits, so this wrapper re-installs itself
  // on top (installPost) until it is the outermost one; copies further in pass straight through.
  let posting = false;
  function installPost() {
    const _oPost = window.postJob;
    if (typeof _oPost !== 'function' || _oPost.__twjt) return;
    const w = async function () {
      if (posting) return _oPost.apply(this, arguments);
      posting = true;
      try {
      const minEl = $('emp-min-age'), hrsEl = $('emp-max-hours');
      const ask = !!($('twjt-emp-permit') || {}).checked, home = !!($('twjt-emp-home') || {}).checked;
      const farm = lower(($('emp-type') || {}).value) === FARM_TYPE;
      const hazardFarm = farm && !!($('twjt-emp-hazard') || {}).checked;
      const F = farmRule();
      const typedMin = minEl && minEl.value !== '' ? parseInt(minEl.value, 10) : null;
      const typedHrs = hrsEl && hrsEl.value !== '' ? parseInt(hrsEl.value, 10) : null;
      if (farm) {
        if (typedMin != null && typedMin < F.minAge) { try { showAlert('emp-post-alert', `Farm jobs start at age ${F.minAge} under federal law.`, 'error'); } catch (e) {} return; }
        if (F.weekMax && typedHrs != null && typedHrs > F.weekMax) { try { showAlert('emp-post-alert', `Farm jobs can be at most ${F.weekMax} hours a week.`, 'error'); } catch (e) {} return; }
        // The older checks stop at 14+ and 40 h for every job; let farm numbers through and put them back on the job below.
        if (typedMin != null && typedMin < 14) minEl.value = '14';
        if (typedHrs != null && typedHrs > 40) hrsEl.value = '40';
      }
      const before = new Set(postedList().map(j => j && j.id));
      let r;
      try { r = await _oPost.apply(this, arguments); }
      finally {
        const added = postedList().filter(j => j && !before.has(j.id));
        added.forEach(j => {
          const patch = {};
          if (ask) patch.permit = true;
          if (home) patch.homeJob = true;
          if (farm) {
            patch.farm = true;
            if (typedMin != null) patch.minAge = typedMin;
            if (typedHrs != null) patch.maxHours = typedHrs;
            if (hazardFarm) { patch.hazardFarm = true; patch.minAge = Math.max(typedMin || 0, F.hazardUnder); }
          }
          Object.assign(j, patch);
          jobsList().forEach(b => { if (b && b.id === j.id) Object.assign(b, patch); });
        });
        if (added.length) {
          const c = $('twjt-emp-permit'); if (c) c.checked = false;
          const h = $('twjt-emp-home'); if (h) h.checked = false;
          const hz = $('twjt-emp-hazard'); if (hz) hz.checked = false;
          empNote();
          try { window.renderBrowseJobs && window.renderBrowseJobs(); } catch (e) {}
        } else if (farm) {                        // not posted: give the employer their own numbers back
          if (minEl && typedMin != null) minEl.value = String(typedMin);
          if (hrsEl && typedHrs != null) hrsEl.value = String(typedHrs);
        }
      }
      return r;
      } finally { posting = false; }
    };
    w.__twjt = true; window.postJob = w;
  }
  installPost();
  const lateInstall = () => [0, 400, 1800, 4000].forEach(ms => later(installPost, ms));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lateInstall); else lateInstall();

  /* ── Verification page: step 3 uses the real rule ─────────────────── */
  function fillStates() {
    const sel = $('tw-ver-state'); if (!sel || sel.dataset.twjt) return;
    const cur = stateName(sel.value);
    sel.innerHTML = Object.keys(PERMITS).map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    sel.value = PERMITS[cur] ? cur : 'Vermont';
    sel.dataset.twjt = '1';
    addFarmOption($('tw-ver-job-type-check'), 'Farm Work');
  }
  function drawStep3() {
    const u = me(), body = $('tw-ver-body-3'); if (!body || !isTeen(u)) return;
    fillStates();
    const sel = $('tw-ver-state'), ageEl = $('tw-ver-age');
    if (sel && !sel.dataset.twjtSet) { const s = teenState(u); if (PERMITS[s]) sel.value = s; sel.dataset.twjtSet = '1'; }
    if (ageEl && !ageEl.dataset.twjtSet && !isDemoUser(u)) { ageEl.value = String(teenAge(u)); ageEl.dataset.twjtSet = '1'; }
    let n = $('twjt-step3-note');
    if (!n) { n = document.createElement('div'); n.id = 'twjt-step3-note'; n.className = 'twjt-step3'; body.insertBefore(n, body.firstChild); }
    const p = permitNeeded(teenState(u), teenAge(u)), st = permitStatus(u);
    const html = st.ok
      ? `✅ <b>Work permit ${st.status === 'self-reported' ? 'added' : st.status === 'needs_review' ? 'pre-checked' : 'on file'}.</b> Tier 3 jobs are open to you.`
      : p.needed ? `📋 <b>You need a work permit.</b> ${esc(p.note)} Jobs in ${esc(p.state)} are Tier 3 until you add it here.`
      : `✅ <b>No work permit needed.</b> ${esc(p.note)} You only need one for jobs in a permit state or when an employer asks.`;
    if (n.innerHTML !== html) n.innerHTML = html;
  }
  try {
    if (typeof TW_Verify !== 'undefined' && TW_Verify) {
      const V = TW_Verify;
      const oCheck = V.runComplianceCheck;
      V.runComplianceCheck = async function () {
        fillStates();
        const age = parseInt(($('tw-ver-age') || {}).value, 10) || teenAge();
        const state = stateName(($('tw-ver-state') || {}).value) || teenState();
        const jtype = ($('tw-ver-job-type-check') || {}).value || 'Yard Work';
        const rules = (typeof getStateRules === 'function' ? getStateRules(state) : null) || {};
        const p = permitNeeded(state, age);
        const farm = lower(jtype) === FARM_TYPE, hazard = HAZARD_TYPES.includes(lower(jtype));
        const F = farmRule(), minAge = farm ? F.minAge : 14;
        const grid = $('tw-ver-law-grid'), results = $('tw-ver-law-results'), aiBox = $('tw-ver-law-ai');
        if (grid) grid.innerHTML = [
          { label: 'Minimum Age', val: `${minAge}+${farm ? ` for farm work${age < F.consentUnder ? ', with a parent\'s OK' : ''}` : ''} · Age ${age}`, ok: age >= minAge },
          farm
            ? { label: 'Farm Hours', val: (fsr => fsr ? `Up to ${fsr.weekMax} h/week, ${fsr.dayMax} h/day in ${esc(state)}` : F.weekMax ? `Up to ${F.weekMax} h/week` : 'No federal weekly limit')(farmStateRule(state, age)) + (age < F.outsideSchoolUnder ? ' · outside school hours' : ''), ok: true }
            : { label: 'School-Week Hrs', val: age < 16 ? `Max ${rules.schoolWeekMax || 18} h/week` : 'Set by your state for 16–17', ok: true },
          farm
            ? { label: 'Farm Machinery', val: age >= F.hazardUnder ? `✓ Allowed at ${age}` : `Not until ${F.hazardUnder} (tractors, power machinery, farm chemicals)`, ok: true }
            : { label: 'Summer Max', val: `${rules.summerMax || 40} h/week in ${esc(state)}`, ok: true },
          { label: 'Permit Needed', val: p.needed ? `Yes — ${esc(state)}, under ${p.under}` : `No — ${esc(state)} at ${age}`, ok: !p.needed || permitStatus().ok },
          { label: 'Job Type', val: hazard ? '⚠️ Hazardous — not allowed under 18' : '✓ Allowed for age ' + age, ok: !hazard },
          { label: 'Job Tier', val: p.needed ? '📋 Tier 3 · Work permit' : '👪 Tier 2 · Parent OK', ok: true },
        ].map(r => `<div class="tw-ver-law-pill ${r.ok ? 'ok' : 'warn'}"><div class="tw-ver-pill-label">${r.label}</div><div class="tw-ver-pill-val">${r.val}</div></div>`).join('');
        if (results) results.style.display = 'block';
        if (aiBox) { aiBox.textContent = p.note; aiBox.classList.add('show'); }
        try {
          const text = await callClaudeAI(`You are a teen labor law assistant. A ${age}-year-old in ${state} wants to work in ${jtype}. TeenWork's rule: ${p.note}${farm ? ` Federal farm rule: from age ${F.minAge} (ages ${F.minAge}–${F.consentUnder - 1} need a parent's written OK), under ${F.outsideSchoolUnder} only outside school hours, ${F.weekMax ? `up to ${F.weekMax} hours a week` : 'no federal weekly hour limit'}, tractors, power machinery and farm chemicals only from ${F.hazardUnder}. ${(fsr => fsr ? `${state} also limits teens under ${fsr.under} to ${fsr.dayMax} hours a day and ${fsr.weekMax} a week, farm work included (${fsr.cite}).` : `Say that ${state} may have stricter farm rules.`)(farmStateRule(state, age))}` : ''} In 3 friendly sentences: (1) whether this job is allowed, (2) key hour limits, (3) whether a work permit is needed and how to get one in ${state}. Do not contradict TeenWork's permit rule.`);
          if (aiBox && text) aiBox.textContent = text;
        } catch (e) { /* the rule above stays */ }
        drawStep3();
      };
      V.__twjtOrigCheck = oCheck;
      const oSubmit = V.submitPermit;
      // Without the permit photo check, "Mark Permit Submitted" saves a self-reported permit to the account.
      V.submitPermit = function () {
        const u = me();
        if (typeof window.twWorkPermitStatus !== 'function' && isTeen(u) && !isDemoUser(u)) {
          try { _DB.save('work_permit', { status: 'self-reported', state: stateName(($('tw-ver-state') || {}).value) || teenState(u), savedAt: new Date().toISOString() }); } catch (e) {}
        }
        const r = oSubmit.apply(this, arguments);
        later(() => { drawStep3(); refresh(); }, 0);
        return r;
      };
      // The 📋 Work Permit badge follows the real permit status (also for the parent-consent block's badge row).
      const withPermit = fn => function () {
        let b = []; try { b = (fn.apply(V, arguments) || []).slice(); } catch (e) {}
        const u = me();
        if (isTeen(u) && !isDemoUser(u)) { b = b.filter(x => x !== 'workPermit'); if (permitStatus(u).ok) b.push('workPermit'); }
        return b;
      };
      if (typeof V.getBadges === 'function') V.getBadges = withPermit(V.getBadges);
      if (typeof V.__tw44cBadges === 'function') V.__tw44cBadges = withPermit(V.__tw44cBadges);
    }
  } catch (e) { console.warn('job-tiers verify:', e); }

  /* ── refresh points ───────────────────────────────────────────────── */
  function refresh() {
    try { const pg = $('page-verify'); if (pg && pg.classList.contains('active')) drawStep3(); } catch (e) {}
    try { const list = $('browse-jobs-list'); if (list && list.children.length) decorate(); } catch (e) {}
    try { const sel = $('teen-filter-state'); const u = me(); if (isTeen(u) && $('teen-permit-banner')) window.showPermitBanner((sel && sel.value) || teenState(u)); } catch (e) {}
  }
  window.twJobTiersRefresh = refresh;
  const _oShow = window.showVerifyPage;
  if (typeof _oShow === 'function') window.showVerifyPage = function () { const r = _oShow.apply(this, arguments); [60, 250, 700].forEach(ms => later(drawStep3, ms)); return r; };
  const _oLaunch = window.launchDashboard;
  if (typeof _oLaunch === 'function') window.launchDashboard = function () {
    const r = _oLaunch.apply(this, arguments);
    [0, 400, 1500].forEach(ms => later(() => { addFarmOption($('teen-job-filter')); buildEmpForm(); watchList(); installPost(); refresh(); }, ms));
    return r;
  };
  later(() => { addFarmOption($('teen-job-filter')); buildEmpForm(); watchList(); }, 0);
  setInterval(() => { try { const u = me(); if (isTeen(u) && $('browse-jobs-list') && $('browse-jobs-list').offsetParent) decorate(); } catch (e) {} }, 15000);   // consent / permit can change on another device

  /* ── styles ───────────────────────────────────────────────────────── */
  const css = document.createElement('style'); css.id = 'job-tiers-v45-css';
  css.textContent =
    '.twjt-tag.t2{background:var(--green-pale,#e8f5ee);color:var(--green,#2d6a4f);border:none;font-weight:700}' +
    '.twjt-tag.t3{background:var(--blue-pale,#e8f0fb);color:var(--blue,#1a5276);border:none;font-weight:700}' +
    '.twjt-farm{background:var(--amber-pale,#fdf3e1);color:var(--amber,#b9770e);border:none}' +
    '.btn-apply.twjt-locked{background:var(--border,#ddd)!important;color:var(--muted,#555)!important;border-color:var(--border,#ddd)!important}' +
    '.twjt-emp-note{font-size:.8rem;color:var(--muted,#667);margin-top:6px;line-height:1.5}' +
    '.twjt-step3{margin-top:.9rem;padding:.7rem .9rem;border-radius:10px;background:var(--green-pale,#e8f5ee);font-size:.84rem;line-height:1.5}' +
    '#twjt-modal{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px}' +
    '#twjt-modal .twjt-sheet{position:relative;background:var(--card,#fff);color:var(--text,#1b1b1b);border-radius:16px;padding:1.4rem 1.3rem 1.1rem;max-width:400px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.25);font-size:.9rem;line-height:1.55}' +
    '#twjt-modal h3{font-family:"Fraunces",serif;font-size:1.15rem;margin:0 0 .3rem}' +
    '#twjt-modal .twjt-job{font-size:.78rem;color:var(--muted,#667);margin:0 0 .6rem}' +
    '#twjt-modal p{margin:0 0 .6rem}' +
    '#twjt-modal .twjt-x{position:absolute;top:8px;right:10px;border:none;background:none;font-size:1.1rem;cursor:pointer;color:var(--muted,#667)}' +
    '#twjt-modal .twjt-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:.4rem}' +
    '.twjt-btn{border:1.5px solid var(--border,#ddd);background:var(--card,#fff);color:inherit;border-radius:9px;padding:7px 14px;font-weight:700;cursor:pointer;font-family:inherit}' +
    '.twjt-btn.pri{background:var(--green,#2d6a4f);border-color:var(--green,#2d6a4f);color:#fff}';
  document.head.appendChild(css);

  window.twPermitNeeded = permitNeeded;
  window.twJobTiers = { permitNeeded, check, teenStatus, tierOf, permitStatus, consentStatus, refresh, decorate, gates, PERMITS, farmRule, farmStateRule, get FARM() { return farmRule(); }, HOME_JOBS_EXEMPT };
})();
