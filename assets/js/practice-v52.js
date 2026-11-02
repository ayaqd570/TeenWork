/* ═══════════════════════════════════════════════════════════════════
   practice-v52 — practice-account polish and an optional sample scenario
   (2026-11-02, Aya's practice-account test, priorities 3 and 4)
   • Sample scenario: "See a sample scenario" on the home page and in the
     practice-account notice opens a walk-through with one made-up teen,
     parent, employer, job and application. You can switch between the three
     views and press Apply → Approve → Hire to watch the hand-off. Everything
     lives in this script's memory: no account, no Supabase, no storage, no
     email or notifications. "Start over" resets it; reloading the page does too.
     The empty practice accounts are unchanged.
   • One notice in practice accounts: the "This demo starts empty…" message
     that repeated the orange practice notice is no longer shown there.
   • Tour: practice accounts no longer open the 6-step tour by themselves. The
     practice notice asks "Take the 6-step tour?" with Start / Skip; the answer
     is remembered for this browser tab (sessionStorage), and the menu's Tour
     button still replays it. Real accounts keep the old first-login tour.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twPractice52) return;
  window.__twPractice52 = true;

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const demoActive = () => { try { return !!(window._twDemoSandbox && window._twDemoSandbox.active); } catch (e) { return false; } };
  const ROLE_NAMES = { teen: 'Teen', parent: 'Parent', employer: 'Employer' };
  const ssGet = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };

  /* ══ 1. SAMPLE SCENARIO ═════════════════════════════════════════════ */
  // Made-up people and job. Shown only inside the sample scenario; never written anywhere.
  const SAMPLE = {
    teen: { name: 'Sam', age: 15, town: 'Burlington, VT', state: 'Vermont' },
    parent: { name: 'Jordan' },
    employer: { name: 'Sample Garden Co.' },
    job: { title: 'Water garden plants', type: 'Yard work', pay: '$15 an hour', town: 'Burlington, VT', when: 'Saturdays, 9–10:30 a.m.', hoursWeek: 1.5, minAge: 14, landmark: 'near a public library (sample)', desc: 'Water raised garden beds with a watering can and pull a few weeds. No tools or machines.' },
  };
  const STEPS = [
    { k: 'applied', label: 'Teen applies' },
    { k: 'approved', label: 'Parent approves' },
    { k: 'review', label: 'Employer reviews' },
    { k: 'hired', label: 'Hired' },
  ];
  let S = null;                 // { stage: 'browse'|'applied'|'approved'|'denied'|'hired'|'passed', view: role }
  let opener = null;
  const fresh = view => ({ stage: 'browse', view: view || 'teen' });

  function rulesCheck() {
    const R = window.twWorkRules, t = SAMPLE.teen, j = SAMPLE.job;
    if (!R) return { ok: true, text: `${j.hoursWeek} h a week on Saturday mornings.`, permit: '' };
    const r = R.forTeen(t.age, t.state);
    const okWeek = !r.week || j.hoursWeek <= r.week.school;
    return {
      ok: okWeek,
      text: r.week ? `${j.hoursWeek} h a week on Saturday mornings fits the ${r.week.school} h school-week limit and the 7 a.m.–7 p.m. window for age ${t.age} in ${t.state}.` : `${j.hoursWeek} h a week.`,
      permit: r.permit || '',
    };
  }
  const pill = (txt, kind) => `<span class="tw52-pill tw52-pill-${kind}">${esc(txt)}</span>`;
  function jobFacts() {
    const j = SAMPLE.job;
    return `<dl class="tw52-facts"><dt>Pay</dt><dd>${esc(j.pay)}</dd><dt>Where</dt><dd>${esc(j.town)}, ${esc(j.landmark)}</dd><dt>When</dt><dd>${esc(j.when)}</dd><dt>Ages</dt><dd>${esc(j.minAge)}+ · 👪 parent OK (Tier 2)</dd></dl>`;
  }
  function rulesBox() {
    const c = rulesCheck();
    return `<div class="tw52-rulecheck"><strong>⚖️ Work rules check:</strong> ${esc(c.text)}${c.permit ? ' ' + esc(c.permit) : ''}</div>`;
  }
  function nextHint(text, role, label) {
    return `<div class="tw52-next"><span>${esc(text)}</span>${role ? `<button type="button" class="tw52-btn tw52-btn-soft" data-view="${role}">${esc(label)} →</button>` : ''}</div>`;
  }

  function teenView() {
    const st = S.stage, j = SAMPLE.job;
    const status = { browse: '', applied: pill('Waiting for your parent’s OK', 'wait'), approved: pill('With the employer', 'info'), denied: pill('Your parent said no', 'no'), hired: pill('Hired ✓', 'ok'), passed: pill('Not chosen', 'no') }[st];
    let body = `<p class="tw52-who">You are <b>${esc(SAMPLE.teen.name)}</b>, ${SAMPLE.teen.age}, in ${esc(SAMPLE.teen.town)}. This is the Find Jobs card ${esc(SAMPLE.teen.name)} sees.</p>
      <article class="tw52-card"><div class="tw52-card-top"><h4>${esc(j.title)} <span class="tw52-tag">Sample</span></h4>${status}</div>
      <div class="tw52-sub">${esc(SAMPLE.employer.name)} · ${esc(j.type)}</div><p class="tw52-desc">${esc(j.desc)}</p>${jobFacts()}${rulesBox()}`;
    if (st === 'browse') body += `<div class="tw52-actions"><button type="button" class="tw52-btn" data-act="apply">Apply (needs parent OK)</button></div></article>` + nextHint('Applying sends the application to Sam’s parent first, not the employer.');
    else if (st === 'applied') body += `</article>` + nextHint('Next, Sam’s parent decides.', 'parent', 'Show the parent’s view');
    else if (st === 'approved') body += `</article>` + nextHint('The parent said yes, so the employer can see it now.', 'employer', 'Show the employer’s view');
    else if (st === 'hired') body += `</article>` + nextHint('Next, Sam and the employer plan the first shift in TeenWork’s chat. Pay is between them.');
    else body += `</article>` + nextHint('That’s the end of this path. Start over to try the other choice.');
    return body;
  }
  function parentView() {
    const st = S.stage, j = SAMPLE.job;
    let body = `<p class="tw52-who">You are <b>${esc(SAMPLE.parent.name)}</b>, ${esc(SAMPLE.teen.name)}’s linked parent. This is the Approvals screen.</p>`;
    if (st === 'browse') return body + `<div class="tw52-empty">✅ Nothing waiting. When ${esc(SAMPLE.teen.name)} applies, it shows up here for your OK.</div>` + nextHint('Start on the teen’s view and press Apply.', 'teen', 'Show the teen’s view');
    const status = { applied: pill('Waiting for your OK', 'wait'), approved: pill('With the employer', 'info'), denied: pill('You said no', 'no'), hired: pill('Hired ✓', 'ok'), passed: pill('Not chosen', 'no') }[st];
    body += `<article class="tw52-card"><div class="tw52-card-top"><h4>${esc(SAMPLE.teen.name)} applied: ${esc(j.title)} <span class="tw52-tag">Sample</span></h4>${status}</div>
      <div class="tw52-sub">${esc(SAMPLE.employer.name)} · ${esc(j.type)}</div><p class="tw52-desc">${esc(j.desc)}</p>${jobFacts()}${rulesBox()}`;
    if (st === 'applied') body += `<div class="tw52-actions"><button type="button" class="tw52-btn" data-act="approve">Approve</button><button type="button" class="tw52-btn tw52-btn-soft" data-act="deny">Say no</button></div></article>` + nextHint('The employer sees nothing until you approve.');
    else if (st === 'approved') body += `</article>` + nextHint('You approved it. It’s with the employer now.', 'employer', 'Show the employer’s view');
    else if (st === 'denied') body += `</article>` + nextHint('You said no, so the employer never sees this application.');
    else body += `</article>`;
    return body;
  }
  function employerView() {
    const st = S.stage, j = SAMPLE.job, t = SAMPLE.teen;
    let body = `<p class="tw52-who">You are <b>${esc(SAMPLE.employer.name)}</b>, who posted this job. This is the Applicants screen.</p>
      <div class="tw52-posted">📋 Active job: <b>${esc(j.title)}</b> <span class="tw52-tag">Sample</span> · ${esc(j.pay)} · ${esc(j.town)}</div>`;
    if (st === 'browse' || st === 'applied' || st === 'denied') {
      const why = st === 'applied' ? `${t.name} applied, but a parent hasn’t approved it yet, so it isn’t shown to you.` : st === 'denied' ? `${t.name}’s parent said no, so the application never reaches you.` : 'No applicants yet.';
      return body + `<div class="tw52-empty">👥 ${esc(why)} Applications reach employers only after a parent approves.</div>` + (st === 'applied' ? nextHint('Waiting on the parent.', 'parent', 'Show the parent’s view') : st === 'browse' ? nextHint('Start on the teen’s view and press Apply.', 'teen', 'Show the teen’s view') : '');
    }
    const status = { approved: pill('Parent approved ✓', 'ok'), hired: pill('Hired ✓', 'ok'), passed: pill('Not chosen', 'no') }[st];
    body += `<article class="tw52-card"><div class="tw52-card-top"><h4>${esc(t.name)}, ${t.age} <span class="tw52-tag">Sample</span></h4>${status}</div>
      <div class="tw52-sub">Applied to ${esc(j.title)} · ${esc(t.town)}</div>${rulesBox()}`;
    if (st === 'approved') body += `<div class="tw52-actions"><button type="button" class="tw52-btn" data-act="hire">Hire</button><button type="button" class="tw52-btn tw52-btn-soft" data-act="pass">Pass</button></div></article>` + nextHint('Profile details are self-reported. TeenWork does not run background checks.');
    else if (st === 'hired') body += `</article>` + nextHint(`You hired ${t.name}. Both of you would plan the first shift in TeenWork’s chat.`, 'teen', 'See it from the teen’s side');
    else body += `</article>` + nextHint('You passed. The teen sees “Not chosen”.', 'teen', 'See it from the teen’s side');
    return body;
  }

  function stepState(i) {
    const st = S.stage;
    const reached = { browse: 0, applied: 1, approved: 2, denied: 1, hired: 4, passed: 3 }[st];
    if (i < reached) return (st === 'denied' && i === 1) || (st === 'passed' && i === 3) ? 'no' : 'done';
    if (i === reached && st !== 'hired') return st === 'denied' && i === 1 ? 'no' : 'now';
    return '';
  }
  function render() {
    const box = $('tw52-sample'); if (!box || !S) return;
    const tabs = ['teen', 'parent', 'employer'].map(r => `<button type="button" role="tab" class="tw52-tab" id="tw52-tab-${r}" aria-selected="${S.view === r}" aria-controls="tw52-view" data-view="${r}">${{ teen: '🧑‍💼', parent: '👪', employer: '🏢' }[r]} ${ROLE_NAMES[r]}</button>`).join('');
    const steps = STEPS.map((s, i) => `<li class="tw52-step ${stepState(i)}"><b>${i + 1}</b> ${esc(s.label)}</li>`).join('');
    const view = S.view === 'parent' ? parentView() : S.view === 'employer' ? employerView() : teenView();
    box.querySelector('.tw52-steps').innerHTML = steps;
    box.querySelector('.tw52-tabs').innerHTML = tabs;
    box.querySelector('#tw52-view').innerHTML = view;
    box.querySelector('#tw52-view').setAttribute('aria-labelledby', 'tw52-tab-' + S.view);
  }
  function act(a) {
    const go = { apply: ['browse', 'applied'], approve: ['applied', 'approved'], deny: ['applied', 'denied'], hire: ['approved', 'hired'], pass: ['approved', 'passed'] }[a];
    if (!go || S.stage !== go[0]) return;
    S.stage = go[1];
    render();
    const live = $('tw52-sample-live');
    if (live) live.textContent = { apply: 'Sample: Sam applied. It now waits for the parent.', approve: 'Sample: the parent approved. The employer can see it now.', deny: 'Sample: the parent said no.', hire: 'Sample: the employer hired Sam.', pass: 'Sample: the employer passed.' }[a];
    const next = $('tw52-view').querySelector('.tw52-next button, .tw52-actions button');
    if (next) try { next.focus({ preventScroll: false }); } catch (e) {}
  }
  function build() {
    if ($('tw52-sample')) return $('tw52-sample');
    const m = document.createElement('div');
    m.id = 'tw52-sample'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'tw52-sample-h');
    m.innerHTML = `<div class="tw52-sheet">
      <div class="tw52-head"><h2 id="tw52-sample-h" tabindex="-1">🎬 Sample scenario</h2><button type="button" class="tw52-x" data-act="close" aria-label="Close the sample scenario">×</button></div>
      <p class="tw52-label"><strong>Made-up people and a made-up job.</strong> Nothing here is saved, sent or shown to anyone, and it isn't connected to real accounts or notifications.</p>
      <ol class="tw52-steps" aria-label="Where this application is"></ol>
      <div class="tw52-tabs" role="tablist" aria-label="Whose screen to show"></div>
      <section id="tw52-view" role="tabpanel"></section>
      <div class="tw52-foot"><button type="button" class="tw52-btn tw52-btn-soft" data-act="reset">↺ Start over</button><button type="button" class="tw52-btn tw52-btn-soft" data-act="close">Close</button></div>
      <div id="tw52-sample-live" class="tw52-sr" aria-live="polite"></div>
    </div>`;
    m.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('button'); if (!b) { if (e.target === m) close(); return; }
      if (b.dataset.view) { S.view = b.dataset.view; render(); const t = $('tw52-tab-' + S.view); if (t) t.focus(); return; }
      const a = b.dataset.act;
      if (a === 'close') close();
      else if (a === 'reset') { S = fresh('teen'); render(); const l = $('tw52-sample-live'); if (l) l.textContent = 'Sample scenario started over.'; }
      else if (a) act(a);
    });
    m.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') {     // keep focus inside the dialog
        const f = [...m.querySelectorAll('button,[href],select,[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.classList && e.target.classList.contains('tw52-tab')) {
        const order = ['teen', 'parent', 'employer'], i = order.indexOf(S.view);
        S.view = order[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3]; render(); const t = $('tw52-tab-' + S.view); if (t) t.focus();
      }
    });
    document.body.appendChild(m);
    return m;
  }
  function open(view) {
    opener = document.activeElement;
    if (!S) S = fresh(view);
    else if (view) S.view = view;
    build(); render();
    document.documentElement.classList.add('tw52-sample-open');
    const h = $('tw52-sample-h'); if (h) try { h.focus(); } catch (e) {}
  }
  function close() {
    const m = $('tw52-sample'); if (m) m.remove();
    document.documentElement.classList.remove('tw52-sample-open');
    if (opener && opener.isConnected) try { opener.focus(); } catch (e) {}
    opener = null;
  }
  window.twOpenSampleScenario = open;
  window.twCloseSampleScenario = close;
  window._twSampleScenario = { open, close, reset: () => { S = null; }, get state() { return S ? Object.assign({}, S) : null; }, SAMPLE };

  /* ══ 2. ENTRY POINTS ════════════════════════════════════════════════ */
  function homeButton() {
    const box = $('tw48-demo'); if (!box || $('tw52-home-sample')) return;
    const note = box.querySelector('.tw48-demo-note');
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'tw52-home-sample'; b.className = 'tw52-home-sample';
    b.innerHTML = '🎬 See a sample scenario <span>(apply → parent OK → hire, made-up people)</span>';
    b.onclick = () => open('teen');
    if (note) box.insertBefore(b, note); else box.appendChild(b);
  }

  // The practice-account notice (demo-sandbox-v49 draws #tw49-demo-banner): add the scenario and tour choices to it.
  function tourAnswered() { return !!ssGet('tw52_tour_answer'); }
  function bannerExtras() {
    const b = $('tw49-demo-banner'); if (!b || !demoActive()) return;
    let x = b.querySelector('.tw52-demo-more');
    const role = (window._twDemoSandbox && window.__twDemoSandbox && window.__twDemoSandbox.type) || ((window.currentUser || {}).type) || 'teen';
    const html = `<button type="button" class="tw52-link" data-act="sample">🎬 See a sample scenario</button>` +
      (tourAnswered() ? '' : `<span class="tw52-tour-ask"><button type="button" class="tw52-link" data-act="tour">🗺️ Take the 6-step tour</button><button type="button" class="tw52-link tw52-muted" data-act="skip-tour" aria-label="Skip the tour">Skip tour</button></span>`);
    if (!x) {
      x = document.createElement('div'); x.className = 'tw52-demo-more';
      x.addEventListener('click', e => {
        const t = e.target.closest && e.target.closest('button'); if (!t) return;
        if (t.dataset.act === 'sample') open(role === 'parent' || role === 'employer' ? role : 'teen');
        else if (t.dataset.act === 'tour') { ssSet('tw52_tour_answer', 'started'); x._tw = ''; bannerExtras(); startTourNow(); }
        else if (t.dataset.act === 'skip-tour') { ssSet('tw52_tour_answer', 'skipped'); x._tw = ''; bannerExtras(); }
      });
    }
    if (x.parentElement !== b) b.appendChild(x);
    if (x._tw !== html) { x.innerHTML = html; x._tw = html; }
  }

  /* ══ 3. TOUR: offer it in practice accounts instead of opening it ═══ */
  let origTourStart = null;
  function startTourNow() { try { (origTourStart || window.tourStart).call(window, true); } catch (e) { console.warn('practice-v52: tour', e); } }
  function wrapTour() {
    const t = window.tourStart;
    if (typeof t === 'function' && !t.__tw52) {
      origTourStart = t;
      const w = function (force) { if (force !== true && demoActive()) { bannerExtras(); return; } return t.apply(this, arguments); };
      w.__tw52 = true; window.tourStart = w;
    }
    const s = window._startAdvancedTour;
    if (typeof s === 'function' && !s.__tw52) {
      const w2 = function () { if (demoActive()) { bannerExtras(); return; } return s.apply(this, arguments); };
      w2.__tw52 = true; window._startAdvancedTour = w2; window.startTour = w2;
    }
  }

  /* ══ 4. ONE NOTICE: drop the repeat of the practice notice ══════════ */
  const REPEAT = /^This demo starts empty, like a new account\./;
  function wrapToast() {
    const o = window.showToast;
    if (typeof o !== 'function' || o.__tw52) return;
    const w = function (msg) { if (REPEAT.test(String(msg || '')) && (demoActive() || $('tw49-demo-banner'))) return; return o.apply(this, arguments); };
    w.__tw52 = true;
    Object.keys(o).forEach(k => { try { w[k] = o[k]; } catch (e) {} });
    window.showToast = w;
  }
  function dropRepeatNote() {
    document.querySelectorAll('.tw-welcome-note').forEach(n => { if (REPEAT.test((n.textContent || '').trim()) && demoActive()) n.remove(); });
  }

  /* ── boot ─────────────────────────────────────────────────────────── */
  function tick() {
    try { wrapTour(); } catch (e) {}
    try { wrapToast(); } catch (e) {}
    try { homeButton(); } catch (e) {}
    try { bannerExtras(); } catch (e) {}
    try { dropRepeatNote(); } catch (e) {}
    if (S && !$('tw52-sample')) document.documentElement.classList.remove('tw52-sample-open');
  }
  tick();
  document.addEventListener('DOMContentLoaded', tick);
  window.addEventListener('load', tick);
  setInterval(tick, 700);
  new MutationObserver(() => { if ($('tw49-demo-banner') && !$('tw49-demo-banner').querySelector('.tw52-demo-more')) tick(); })
    .observe(document.documentElement, { childList: true, subtree: true });
})();
