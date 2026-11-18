/* ═══════════════════════════════════════════════════════════════════
   v64 · EMPLOYER TRUST CHECKS  (2026-11-18, Aya: "The app says plainly
   that employers aren't verified. Adding a confirmed phone number,
   reviews from past jobs, and an employer history parents can see
   before approving would make the safety story much stronger.")
   • Parents: every application waiting for their OK shows an "Employer
     check" box: phone number confirmed by text (or not yet), stars and
     the latest reviews from teens and parents who worked there, how many
     teens the employer hired on TeenWork, jobs posted, and since when the
     employer has been on TeenWork. It still says plainly that TeenWork
     doesn't run background checks.
   • Teens and parents rate the employer (1-5 stars and a short note) on
     a hired job's card: teens on Applied, parents on Approvals and All
     Applications. Names are never shown, only "Teen" or "Parent". Each
     review's stars and note stay private for 14 days, or until the
     employer has finished their part of the after-job wrap-up; the
     totals include it right away.
   • Employers: Company Profile gets a "Trust checks" panel to confirm a
     mobile number with a texted code (employer-phone function, Twilio
     Verify) and shows exactly what parents see. Their "Reviews" panel
     shows the real reviews. "Hired" is recorded on the server by the
     employer's own account, and a review only counts once it is, so a
     made-up "hired" application can't add a review.
   • window.twEmployerTrust.review({ jobId, employer, rating, text, teen })
     is the one way to send a review (the after-job wrap-up uses it).
   • Practice (demo) accounts see what the box is for, never made-up
     reviews, and nothing is sent.
   Database rules: supabase/migrations/20261118_employer_trust.sql.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twEmployerTrust64) return;
  window.__twEmployerTrust64 = true;

  const ROLES = ['teen', 'parent', 'employer'];
  const FRESH_MS = 60 * 1000;
  const $ = id => document.getElementById(id);
  const lexUser = () => { try { return typeof currentUser !== 'undefined' ? currentUser : null; } catch (e) { return null; } };
  const me = () => window.currentUser || lexUser();
  const low = s => String(s == null ? '' : s).trim().toLowerCase();
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const KEY = /^[^\s@#,()"*<>]+@[^\s@#,()"*<>]+\.[^\s@#,()"*<>]+(#\d{1,3})?$/;
  const keyOf = u => low(u && (u.dataKey || u.email));
  const emailOfKey = k => low(k).split('#')[0];
  const isPractice = u => !!(u && (u.twDemo || u.isDemo || /\.demo$/i.test(String(u.email || '')) || (typeof window._twIsDemoSandboxUser === 'function' && window._twIsDemoSandboxUser(u))));
  const isReal = u => !!(u && !isPractice(u) && !u.isAdmin && ROLES.includes(u.type) && KEY.test(keyOf(u)));
  const realAs = type => { const u = me(); return isReal(u) && u.type === type ? u : null; };
  const asRole = type => { const u = me(); return u && u.type === type ? u : null; };
  const toast = (m, t) => { try { showToast(m, t || 'success'); } catch (e) {} };
  const later = (fn, ms) => setTimeout(() => { try { const r = fn(); if (r && r.catch) r.catch(e => console.warn('employer-trust:', e)); } catch (e) { console.warn('employer-trust:', e); } }, ms || 0);
  const APPS = () => { try { return typeof demoJobs !== 'undefined' ? demoJobs : []; } catch (e) { return []; } };
  const APPLICANTS = () => { try { return typeof demoApplicants !== 'undefined' ? demoApplicants : []; } catch (e) { return []; } };
  const isSampleJob = j => !!j && typeof j.id === 'number' && j.id >= 1 && j.id <= 12;
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function day(d) { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(d || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  const monthYear = d => { const x = day(d); return x ? MONTHS[x.getMonth()] + ' ' + x.getFullYear() : ''; };
  const fullDate = d => { const x = day(d); return x ? MONTHS[x.getMonth()] + ' ' + x.getDate() + ', ' + x.getFullYear() : ''; };
  const stars = n => { n = Math.max(0, Math.min(5, Math.round(+n || 0))); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); };

  /* ── Supabase ───────────────────────────────────────────────────── */
  async function client() {
    let c = null;
    try { if (typeof _twCloudClient === 'function') c = await _twCloudClient(3000); } catch (e) {}
    if (!c) { try { c = (typeof sbClient !== 'undefined' && sbClient) || null; } catch (e) { c = null; } }
    return c && !c.__twDemo && typeof c.rpc === 'function' ? c : null;
  }
  // the Supabase sign-in, only when it is this account's email
  async function sessionFor(c, u) {
    try {
      const r = await c.auth.getSession(), s = r && r.data && r.data.session;
      return s && s.user && low(s.user.email) === emailOfKey(keyOf(u)) ? s : null;
    } catch (e) { return null; }
  }
  // "not set up yet": the v64 database change isn't applied
  const missing = err => !!err && (['PGRST202', 'PGRST205', '42883', '42P01'].includes(err.code) ||
    /tw_employer_trust|tw_review_employer|tw_record_hire|tw_my_employer_reviews|Could not find the function|schema cache/i.test(String(err.message || '')));

  /* ── employer history (tw_employer_trust) ───────────────────────── */
  // state.setup: 'idle' · 'ok' · 'missing' (database change not applied) · 'offline' · 'signin'
  const state = { setup: 'idle', owner: '', mine: null, mineAt: 0 };
  const cache = {};            // employer key → { at, d }
  const waiting = new Set();   // keys asked for while a call runs
  let inflight = null;
  function resetFor(u) {
    const k = keyOf(u);
    if (state.owner === k) return;
    Object.keys(cache).forEach(x => delete cache[x]);
    Object.assign(state, { setup: 'idle', owner: k, mine: null, mineAt: 0 });
  }
  async function fetchTrust(keys, force) {
    const u = me(); if (!u) return {};
    resetFor(u);
    const want = [...new Set((keys || []).map(low).filter(k => KEY.test(k)))];
    const need = want.filter(k => force || !cache[k] || Date.now() - cache[k].at > FRESH_MS);
    if (need.length) {
      need.forEach(k => waiting.add(k));
      if (!inflight) inflight = (async () => {
        await new Promise(r => setTimeout(r, 30));       // gather the keys of one screen into one call
        const list = [...waiting]; waiting.clear();
        const c = await client();
        if (!c) { state.setup = 'offline'; return; }
        if (!(await sessionFor(c, u))) { state.setup = 'signin'; return; }
        for (let i = 0; i < list.length; i += 50) {
          let r;
          try { r = await c.rpc('tw_employer_trust', { p_keys: list.slice(i, i + 50) }); } catch (e) { r = { error: { message: String(e) } }; }
          if (r && r.error) { state.setup = missing(r.error) ? 'missing' : 'offline'; return; }
          state.setup = 'ok';
          (Array.isArray(r && r.data) ? r.data : []).forEach(d => { if (d && d.key) cache[low(d.key)] = { at: Date.now(), d }; });
          list.slice(i, i + 50).forEach(k => { if (!cache[k] || Date.now() - cache[k].at > 1000) cache[k] = { at: Date.now(), d: null }; });
        }
      })().finally(() => { inflight = null; });
      await inflight;
      if (waiting.size) return fetchTrust(want, false);
    } else if (inflight) await inflight;
    const out = {}; want.forEach(k => { out[k] = cache[k] ? cache[k].d : null; }); return out;
  }
  const cached = k => (cache[low(k)] ? cache[low(k)].d : undefined);

  /* ── the history box (parents, and the employer's own preview) ──── */
  function historyLines(d) {
    if (!d) return '';
    if (d.closed) return '<p class="tw64-line tw64-warn">⚠️ This employer\'s account was closed.</p>';
    const since = day(d.since), isNew = since && Date.now() - since.getTime() < 30 * 864e5;
    const n = +d.reviews || 0, held = +d.held || 0;
    const lines = [];
    lines.push(d.phone
      ? '<p class="tw64-line tw64-good"><span aria-hidden="true">✅</span> Phone number confirmed by text' + (d.phone_at ? ' (' + esc(monthYear(d.phone_at)) + ')' : '') + '</p>'
      : '<p class="tw64-line tw64-warn"><span aria-hidden="true">⚠️</span> Phone number not confirmed yet</p>');
    lines.push(n
      ? '<p class="tw64-line"><span aria-hidden="true">⭐</span> <b>' + esc(Number(d.avg).toFixed(1)) + ' out of 5</b> from ' + plural(n, 'review') + '</p>'
      : '<p class="tw64-line"><span aria-hidden="true">⭐</span> No reviews yet</p>');
    const teens = +d.teens || 0, fin = +d.finished || 0;
    lines.push('<p class="tw64-line"><span aria-hidden="true">🤝</span> ' + (teens ? 'Hired ' + plural(teens, 'teen') + ' on TeenWork' : 'No teens hired on TeenWork yet') +
      (fin ? ' · ' + plural(fin, 'job') + ' finished' : '') + '</p>');
    lines.push('<p class="tw64-line"><span aria-hidden="true">🗓</span> ' + (since ? 'On TeenWork since ' + esc(monthYear(d.since)) + (isNew ? ' <span class="tw64-new">New</span>' : '') : 'New on TeenWork') +
      ' · ' + plural(+d.jobs_posted || 0, 'job') + ' posted</p>');
    const recent = (Array.isArray(d.recent) ? d.recent : []).slice(0, 3);
    let html = lines.join('');
    if (recent.length) {
      html += '<ul class="tw64-reviews">' + recent.map(r => '<li><span class="tw64-stars" role="img" aria-label="' + (+r.rating || 0) + ' out of 5 stars">' + stars(r.rating) + '</span> <b>' +
        (r.role === 'parent' ? 'Parent' : 'Teen') + '</b> · ' + esc(monthYear(r.at)) + (r.text ? '<q>' + esc(r.text) + '</q>' : '') + '</li>').join('') + '</ul>';
    }
    if (held) html += '<p class="tw64-small">' + (held === 1 ? '1 newer review stays private' : held + ' newer reviews stay private') + ' for up to 14 days, so nobody rates to get even. It is in the stars above.</p>';
    return html;
  }
  const LIMIT = '<p class="tw64-limit">TeenWork doesn\'t run background checks. Meet the employer with your teen before the first job.</p>';
  function boxHtml(key, name) {
    const d = cached(key);
    const head = '<p class="tw64-title"><span aria-hidden="true">🛡</span> Employer check' + (name ? ': ' + esc(name) : '') + '</p>';
    if (state.setup === 'missing') return head + '<p class="tw64-line">Employer history (phone check, reviews from past jobs, teens hired) is being switched on. Ask the employer your questions in Messages.</p>' + LIMIT;
    if (d === undefined) return head + '<p class="tw64-line tw64-muted">' + (state.setup === 'offline' ? 'Couldn\'t load this employer\'s history. Check your connection.' : state.setup === 'signin' ? 'Sign in again to see this employer\'s history.' : 'Checking this employer…') + '</p>' + LIMIT;
    if (d === null) return head + '<p class="tw64-line tw64-muted">No history found for this employer.</p>' + LIMIT;
    return head + historyLines(d) + LIMIT;
  }
  const PRACTICE_BOX = '<p class="tw64-title"><span aria-hidden="true">🛡</span> Employer check</p><p class="tw64-line">Practice account: for a real employer, this box shows whether they confirmed a phone number by text, reviews from teens and parents who worked for them, how many teens they hired on TeenWork, and since when they have been on TeenWork.</p>' + LIMIT;

  /* ── my own reviews (to show "You rated ★★★★☆") ─────────────────── */
  const rkey = (emp, job, teen) => low(emp) + '|' + String(job) + '|' + low(teen);
  async function loadMine(force) {
    const u = me(); if (!isReal(u) || u.type === 'employer') return null;
    resetFor(u);
    if (state.mine && !force && Date.now() - state.mineAt < 5 * 60 * 1000) return state.mine;
    const c = await client(); if (!c || !(await sessionFor(c, u))) return state.mine;
    try {
      const r = await c.rpc('tw_my_employer_reviews');
      if (r && r.error) { if (missing(r.error)) state.setup = 'missing'; return state.mine; }
      const m = {}; (Array.isArray(r.data) ? r.data : []).forEach(x => { m[rkey(x.employer_key, x.job_id, x.teen_key)] = { rating: x.rating, body: x.body || '' }; });
      state.mine = m; state.mineAt = Date.now();
    } catch (e) {}
    return state.mine;
  }

  /* ── sending a review ───────────────────────────────────────────── */
  async function review(o) {
    o = o || {};
    const u = me();
    if (!u || isPractice(u)) return { ok: false, error: 'practice' };
    if (!isReal(u) || u.type === 'employer') return { ok: false, error: 'not_allowed' };
    const rating = Math.round(Number(o.rating));
    if (!(rating >= 1 && rating <= 5)) return { ok: false, error: 'bad_rating' };
    const employer = low(o.employer), jobId = String(o.jobId == null ? '' : o.jobId).trim();
    const teen = low(o.teen || (u.type === 'teen' ? keyOf(u) : ''));
    if (!KEY.test(employer) || !/^\d{1,16}$/.test(jobId) || (u.type === 'parent' && !KEY.test(teen))) return { ok: false, error: 'bad_request' };
    const c = await client(); if (!c) return { ok: false, error: 'offline' };
    if (!(await sessionFor(c, u))) return { ok: false, error: 'sign_in' };
    let r;
    try { r = await c.rpc('tw_review_employer', { p_employer: employer, p_job_id: jobId, p_teen: teen || null, p_rating: rating, p_text: String(o.text || '').slice(0, 500) }); }
    catch (e) { return { ok: false, error: 'offline' }; }
    if (r && r.error) { if (missing(r.error)) { state.setup = 'missing'; return { ok: false, error: 'not_set_up' }; } return { ok: false, error: 'offline' }; }
    const d = (r && r.data) || {};
    if (d.ok) {
      state.mine = state.mine || {};
      state.mine[rkey(employer, jobId, teen || keyOf(u))] = { rating, body: String(o.text || '').slice(0, 500) };
      delete cache[employer];
    }
    return d.ok ? d : { ok: false, error: d.error || 'offline' };
  }

  /* ── the rating window ──────────────────────────────────────────── */
  const WORDS = ['', 'Bad', 'Not great', 'OK', 'Good', 'Great'];
  const NO_CONTACT = /(\b\d{3}[\s.\-)]*\d{3}[\s.\-]*\d{4}\b)|(@[^\s]+\.[a-z]{2,})|(https?:\/\/)|(\bwww\.)/i;
  let lastFocus = null;
  function closeReview() {
    const m = $('tw64-review'); if (m) m.remove();
    document.removeEventListener('keydown', onKey, true);
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {}
  }
  function onKey(e) {
    const m = $('tw64-review'); if (!m) return;
    if (e.key === 'Escape') { e.preventDefault(); closeReview(); return; }
    if (e.key === 'Tab') {
      const f = [...m.querySelectorAll('button,textarea,[tabindex="0"]')].filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  function openReview(o) {
    closeReview();
    lastFocus = document.activeElement;
    const u = me(), practice = isPractice(u);
    const mine = (state.mine || {})[rkey(o.employer, o.jobId, o.teen || keyOf(u))] || null;
    let pick = mine ? mine.rating : 0;
    const m = document.createElement('div');
    m.id = 'tw64-review'; m.className = 'tw64-modal';
    m.innerHTML = '<div class="tw64-card" role="dialog" aria-modal="true" aria-labelledby="tw64-rv-h">' +
      '<button type="button" class="tw64-x" aria-label="Close">✕</button>' +
      '<h2 id="tw64-rv-h">Rate ' + esc(o.name || 'this employer') + '</h2>' +
      (o.title ? '<p class="tw64-sub">For “' + esc(o.title) + '”' + (o.who ? ' · ' + esc(o.who) : '') + '</p>' : '') +
      '<p class="tw64-q" id="tw64-rv-q">How was this employer to work for?</p>' +
      '<div class="tw64-pick" role="radiogroup" aria-labelledby="tw64-rv-q">' +
      [1, 2, 3, 4, 5].map(n => '<button type="button" role="radio" class="tw64-star" data-n="' + n + '" aria-checked="false" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + ', ' + WORDS[n] + '" tabindex="-1">★</button>').join('') +
      '<span class="tw64-word" id="tw64-rv-word" aria-hidden="true"></span></div>' +
      '<label class="tw64-lbl" for="tw64-rv-text">Anything other families should know? <span>(optional)</span></label>' +
      '<textarea id="tw64-rv-text" maxlength="500" rows="3" placeholder="Paid on time? Clear about the work? Safe place to work?"></textarea>' +
      '<p class="tw64-count" id="tw64-rv-count">0 / 500</p>' +
      '<p class="tw64-small">Your name isn\'t shown, only “' + (u && u.type === 'parent' ? 'Parent' : 'Teen') + '” and the month. Other families see your stars and note after 14 days, or sooner once the employer has finished their part of the job wrap-up. The employer may still guess who wrote it. Leave out phone numbers, emails and links.</p>' +
      (practice ? '<p class="tw64-small tw64-warn">Practice account: nothing is saved or sent.</p>' : '') +
      '<p class="tw64-status" id="tw64-rv-status" role="status" aria-live="polite"></p>' +
      '<div class="tw64-btns"><button type="button" class="tw64-go" id="tw64-rv-send">' + (mine ? 'Update rating' : 'Send rating') + '</button><button type="button" class="tw64-cancel">Cancel</button></div></div>';
    document.body.appendChild(m);
    const ta = $('tw64-rv-text'), cnt = $('tw64-rv-count'), status = $('tw64-rv-status'), send = $('tw64-rv-send');
    if (mine && mine.body) ta.value = mine.body;
    const paint = () => {
      m.querySelectorAll('.tw64-star').forEach(b => { const n = +b.dataset.n; b.classList.toggle('on', n <= pick); b.setAttribute('aria-checked', String(n === pick)); b.tabIndex = (pick ? n === pick : n === 1) ? 0 : -1; });
      $('tw64-rv-word').textContent = pick ? WORDS[pick] : 'Tap a star';
      cnt.textContent = ta.value.length + ' / 500';
    };
    m.querySelectorAll('.tw64-star').forEach(b => {
      b.addEventListener('click', () => { pick = +b.dataset.n; status.textContent = ''; paint(); });
      b.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
        if (!d) return; e.preventDefault(); pick = Math.max(1, Math.min(5, (pick || 0) + d)); paint();
        const t = m.querySelector('.tw64-star[data-n="' + pick + '"]'); if (t) t.focus();
      });
    });
    ta.addEventListener('input', paint);
    m.querySelector('.tw64-x').onclick = closeReview;
    m.querySelector('.tw64-cancel').onclick = closeReview;
    m.addEventListener('click', e => { if (e.target === m) closeReview(); });
    document.addEventListener('keydown', onKey, true);
    send.onclick = async () => {
      const text = ta.value.replace(/\s+/g, ' ').trim();
      status.className = 'tw64-status';
      if (!pick) { status.textContent = 'Tap 1 to 5 stars first.'; status.classList.add('tw64-bad'); return; }
      if (NO_CONTACT.test(text)) { status.textContent = 'Please leave out phone numbers, email addresses and links.'; status.classList.add('tw64-bad'); return; }
      if (practice) { status.textContent = 'Practice account: this rating wasn\'t saved. In a real account it would be.'; return; }
      send.disabled = true; status.textContent = 'Sending…';
      // the chat safety check, for hurtful or unsafe words (it is skipped when it can't be reached)
      try {
        if (text && typeof window.twCheckMessage === 'function') {
          const v = await Promise.race([window.twCheckMessage(text), new Promise(r => setTimeout(() => r(null), 4000))]);
          if (v && v.allowed === false && Array.isArray(v.categories) && v.categories.length) {
            send.disabled = false; status.textContent = 'Please change the note: ' + (v.message || 'it looks hurtful or unsafe.'); status.classList.add('tw64-bad'); return;
          }
        }
      } catch (e) {}
      const r = await review({ jobId: o.jobId, employer: o.employer, teen: o.teen, rating: pick, text });
      send.disabled = false;
      if (r.ok) {
        closeReview();
        toast(r.counts === false ? 'Thanks! Your rating is saved. It counts once the employer\'s account confirms the hire.' : 'Thanks! Your rating is saved.', 'success');
        later(() => paintAll(true), 0);
        return;
      }
      status.classList.add('tw64-bad');
      status.textContent = {
        not_set_up: 'Ratings are still being switched on. Please try again later.',
        offline: 'Couldn\'t send it. Check your connection and try again.',
        sign_in: 'Please sign in again, then try once more.',
        not_hired: 'You can rate an employer after the teen is hired for the job.',
        not_allowed: 'Only the teen who worked the job or their linked parent can rate it.',
        too_many: 'That\'s a lot of ratings for one day. Please try again tomorrow.',
      }[r.error] || 'Couldn\'t send it. Please try again.';
    };
    paint();
    const firstStar = m.querySelector('.tw64-star[tabindex="0"]');
    setTimeout(() => { try { (firstStar || send).focus(); } catch (e) {} }, 30);
  }

  function rateRow(o) {
    const mine = (state.mine || {})[rkey(o.employer, o.jobId, o.teen)];
    const div = document.createElement('div');
    div.className = 'tw64-rate';
    div.innerHTML = mine
      ? '<span>You rated ' + esc(o.name || 'this employer') + ' <span class="tw64-stars" role="img" aria-label="' + mine.rating + ' out of 5 stars">' + stars(mine.rating) + '</span></span><button type="button" class="tw64-rate-btn">Change rating</button>'
      : '<span>How was ' + esc(o.name || 'this employer') + ' to work for?</span><button type="button" class="tw64-rate-btn">⭐ Rate this employer</button>';
    div.querySelector('button').onclick = () => openReview(o);
    return div;
  }
  function putRate(card, o) {
    if (!card) return;
    const old = card.querySelector(':scope > .tw64-rate');
    const sig = [o.employer, o.jobId, o.teen, ((state.mine || {})[rkey(o.employer, o.jobId, o.teen)] || {}).rating || 0].join('|');
    if (old && old.dataset.sig === sig) return;
    const row = rateRow(o); row.dataset.sig = sig;
    if (old) old.replaceWith(row); else card.appendChild(row);
  }

  /* ── parents ────────────────────────────────────────────────────── */
  let lastApprovalJobs = null;
  function decorateParent() {
    const u = asRole('parent'); if (!u) return;
    const practice = !isReal(u);
    const apps = APPS();
    const keys = [];
    apps.filter(j => j && j.status === 'pending-approval').forEach(j => {
      const card = $('job-card-' + j.id); if (!card) return;
      const key = practice ? '' : low(j._employerKey);
      if (!practice && !key) return;
      // the old "Employer rating:" line is replaced by the box
      [...card.querySelectorAll(':scope > div')].forEach(d => { if (/^Employer rating:/.test(d.textContent.trim())) d.hidden = true; });
      let box = card.querySelector('.tw64-check');
      if (!box) {
        box = document.createElement('div'); box.className = 'tw64-check';
        box.setAttribute('aria-label', 'Employer check');
        const act = card.querySelector('.job-actions');
        if (act) card.insertBefore(box, act); else card.appendChild(box);
      }
      const html = practice ? PRACTICE_BOX : boxHtml(key, j.employer);
      if (box.dataset.html !== html) { box.innerHTML = html; box.dataset.html = html; }
      if (key) keys.push(key);
    });
    if (practice) return;
    // hired jobs: rate the employer
    const hired = [];
    const acceptedCards = [...document.querySelectorAll('#approval-jobs .job-card:not([id^="job-card-"])')];
    const acc = (lastApprovalJobs || apps).filter(j => j && j.status === 'accepted');
    acceptedCards.forEach((card, i) => { const j = acc[i]; if (j && j._jb && j._employerKey) hired.push([card, j]); });
    const all = [...document.querySelectorAll('#all-applications .job-card')];
    all.forEach((card, i) => { const j = apps[i]; if (j && j._jb && j._employerKey && j.status === 'accepted') hired.push([card, j]); });
    hired.forEach(([card, j]) => putRate(card, { employer: j._employerKey, jobId: j._jobId, teen: j._teenKey, name: j.employer, title: j.title,
      who: j._teenName ? String(j._teenName).split(/\s+/)[0] + '\'s job' : '' }));
    if (hired.length && !state.mine) later(() => loadMine().then(m => { if (m) decorateParent(); }), 0);
    if (keys.length) later(() => fetchTrust(keys).then(() => { if (asRole('parent') === u) decorateParent(); }), 0);
  }

  /* ── teens ──────────────────────────────────────────────────────── */
  function decorateTeen() {
    const u = realAs('teen'); if (!u) return;
    const shown = APPS().filter(j => j && !isSampleJob(j));
    let any = false;
    document.querySelectorAll('#teen-applications-list .job-card').forEach((card, i) => {
      const j = shown[i];
      if (!j || j.status !== 'accepted' || !j.employerKey) return;
      any = true;
      putRate(card, { employer: j.employerKey, jobId: j.id, teen: keyOf(u), name: j.employer, title: j.title });
    });
    if (any && !state.mine) later(() => loadMine().then(m => { if (m) decorateTeen(); }), 0);
  }

  /* ── employers ──────────────────────────────────────────────────── */
  const FN = () => (typeof SUPABASE_URL === 'string' && /^https:/.test(SUPABASE_URL)) ? SUPABASE_URL.replace(/\/+$/, '') + '/functions/v1/employer-phone' : '';
  const PUBKEY = () => (typeof SUPABASE_KEY === 'string' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') ? SUPABASE_KEY : '';
  async function phoneCall(action, extra) {
    const url = FN(), key = PUBKEY(), u = me();
    if (!url || !key || !u) return { ok: false, code: 'offline' };
    let bearer = key;
    if (action !== 'ping') {
      const c = await client(); const s = c && await sessionFor(c, u);
      if (!s || !s.access_token) return { ok: false, code: 'sign_in' };
      bearer = s.access_token;
    }
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + bearer },
        body: JSON.stringify(Object.assign({ action, account_key: keyOf(u) }, extra || {})) });
      let d = await res.json().catch(() => ({}));
      d = d && typeof d === 'object' ? d : {};
      if (res.status === 404 && !d.code) d.code = 'not_deployed';
      return d;
    } catch (e) { return { ok: false, code: 'offline' }; }
  }
  const ph = { key: '', ready: null, readyAt: 0, step: '', last4: '', msg: '', msgKind: '', busy: false };
  async function phoneReady(force) {
    if (!force && ph.ready !== null && Date.now() - ph.readyAt < 5 * 60 * 1000) return ph.ready;
    const d = await phoneCall('ping');
    ph.ready = d.ok ? !!d.configured : d.code === 'not_deployed' ? false : ph.ready;
    ph.readyAt = Date.now();
    return ph.ready;
  }
  function empPanel() {
    let p = $('tw64-emp');
    if (p) return p;
    const host = $('etab-profile'); if (!host) return null;
    p = document.createElement('div');
    p.className = 'panel tw64-panel'; p.id = 'tw64-emp';
    p.innerHTML = '<div class="panel-head"><h2>🛡 Trust checks</h2><span class="badge badge-amber" id="tw64-emp-badge">Not confirmed</span></div>' +
      '<div class="panel-body"><p class="tw64-lead">Parents see these checks before they approve their teen\'s application to your job. Employers with a confirmed phone and good reviews are easier to say yes to.</p>' +
      '<div class="tw64-phone" id="tw64-phone"></div>' +
      '<h3 class="tw64-h3">What parents see before they approve</h3><div class="tw64-check" id="tw64-emp-preview"></div></div>';
    // after the photo panel (or the profile card), before About
    const photo = host.querySelector('.tw55-panel'), edit = $('emp-profile-edit-wrap');
    const after = photo || (edit && edit.parentNode === host ? edit : null);
    if (after) after.after(p); else host.appendChild(p);
    p.addEventListener('click', onPhoneClick);
    p.addEventListener('submit', e => e.preventDefault());
    return p;
  }
  function paintPhone() {
    const box = $('tw64-phone'), u = asRole('employer'); if (!box || !u) return;
    const practice = !isReal(u);
    const d = practice ? null : cached(keyOf(u));
    const badge = $('tw64-emp-badge');
    const confirmed = !!(d && d.phone);
    if (badge) { badge.textContent = confirmed ? '📱 Phone confirmed' : 'Phone not confirmed'; badge.className = 'badge ' + (confirmed ? 'badge-green' : 'badge-amber'); }
    let html = '<p class="tw64-title"><span aria-hidden="true">📱</span> Confirm your phone number</p>';
    const msg = ph.msg ? '<p class="tw64-status ' + (ph.msgKind === 'bad' ? 'tw64-bad' : ph.msgKind === 'good' ? 'tw64-ok' : '') + '" role="status" aria-live="polite">' + esc(ph.msg) + '</p>' : '<p class="tw64-status" role="status" aria-live="polite"></p>';
    const privacy = '<p class="tw64-small">US and Canadian mobile numbers. Your number stays private: parents and teens only see that it was confirmed, never the number. Message and data rates may apply.</p>';
    if (practice) {
      html += '<p class="tw64-line">Practice account: real employers confirm a mobile number here with a code sent by text. Nothing is sent from a practice account.</p>';
    } else if (state.setup === 'missing' || ph.ready === false) {
      html += (confirmed ? '<p class="tw64-line tw64-good">✅ Confirmed: number ending in ' + esc(d.last4 || '••••') + (d.phone_at ? ' on ' + esc(fullDate(d.phone_at)) : '') + '</p>'
        : '<p class="tw64-line">Confirming your number with a texted code is being switched on. You\'ll be able to do it here soon.</p>') + privacy;
    } else if (d === undefined || ph.ready === null) {
      html += '<p class="tw64-line tw64-muted">Checking…</p>';
    } else if (ph.step === 'code' || (!ph.step && d && d.pending && !confirmed)) {
      const last4 = ph.last4 || (d && d.pending_last4) || '';
      html += '<p class="tw64-line">We texted a code to the number ending in <b>' + esc(last4 || '••••') + '</b>. It works for 10 minutes.</p>' +
        '<form class="tw64-form" id="tw64-code-form"><label class="tw64-lbl" for="tw64-code">Code from the text</label><div class="tw64-row">' +
        '<input id="tw64-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456">' +
        '<button type="submit" class="tw64-go" data-act="check"' + (ph.busy ? ' disabled' : '') + '>Confirm</button></div></form>' + msg +
        '<div class="tw64-links"><button type="button" class="tw64-link" data-act="resend">Send a new code</button><button type="button" class="tw64-link" data-act="other">Use a different number</button></div>';
    } else if (confirmed && ph.step !== 'change') {
      html += '<p class="tw64-line tw64-good">✅ Confirmed: number ending in <b>' + esc(d.last4 || '••••') + '</b>' + (d.phone_at ? ' on ' + esc(fullDate(d.phone_at)) : '') + '</p>' + msg +
        '<div class="tw64-links"><button type="button" class="tw64-link" data-act="change">Change number</button><button type="button" class="tw64-link" data-act="remove">Remove</button></div>' + privacy;
    } else {
      html += '<form class="tw64-form" id="tw64-phone-form"><label class="tw64-lbl" for="tw64-tel">Your mobile number</label><div class="tw64-row">' +
        '<input id="tw64-tel" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="20" placeholder="(802) 555-1234">' +
        '<button type="submit" class="tw64-go" data-act="start"' + (ph.busy ? ' disabled' : '') + '>Text me a code</button></div></form>' + msg +
        (ph.step === 'change' ? '<div class="tw64-links"><button type="button" class="tw64-link" data-act="keep">Keep my confirmed number</button></div>' : '') + privacy;
    }
    // keep what the person is typing when the box repaints
    const typed = { tel: ($('tw64-tel') || {}).value, code: ($('tw64-code') || {}).value };
    const had = document.activeElement && box.contains(document.activeElement) ? document.activeElement.id : '';
    if (box.dataset.html !== html) {
      box.innerHTML = html; box.dataset.html = html;
      if (typed.tel && $('tw64-tel')) $('tw64-tel').value = typed.tel;
      if (typed.code && $('tw64-code')) $('tw64-code').value = typed.code;
      if (had && $(had)) $(had).focus();
    }
    const f1 = $('tw64-phone-form'), f2 = $('tw64-code-form');
    if (f1) f1.onsubmit = e => { e.preventDefault(); phoneAction('start'); };
    if (f2) f2.onsubmit = e => { e.preventDefault(); phoneAction('check'); };
  }
  const PHONE_MSG = {
    not_configured: 'Texting codes is being switched on. Please try again soon.', not_deployed: 'Texting codes is being switched on. Please try again soon.',
    not_set_up: 'Phone confirmation is still being set up. Please try again soon.', offline: 'Couldn\'t reach TeenWork. Check your connection.',
    sign_in: 'Please sign in again, then try once more.',
  };
  async function phoneAction(act) {
    const u = realAs('employer'); if (!u || ph.busy) return;
    ph.msg = ''; ph.msgKind = '';
    if (act === 'other' || act === 'change') { ph.step = 'change'; paintPhone(); setTimeout(() => { const t = $('tw64-tel'); if (t) t.focus(); }, 0); return; }
    if (act === 'keep') { ph.step = ''; paintPhone(); return; }
    let body = {};
    if (act === 'start' || act === 'resend') {
      const tel = act === 'resend' ? ph.tel : (($('tw64-tel') || {}).value || '').trim();
      const digits = tel.replace(/\D/g, '');
      if (!(digits.length === 10 || (digits.length === 11 && digits[0] === '1'))) { ph.msg = 'Enter a 10-digit US or Canadian mobile number, like (802) 555-1234.'; ph.msgKind = 'bad'; paintPhone(); return; }
      ph.tel = tel; body = { phone: tel }; act = 'start';
    } else if (act === 'check') {
      const code = (($('tw64-code') || {}).value || '').replace(/\s+/g, '');
      if (!/^\d{4,10}$/.test(code)) { ph.msg = 'Enter the number from the text message.'; ph.msgKind = 'bad'; paintPhone(); return; }
      body = { code };
    } else if (act === 'remove') {
      if (!window.confirm('Take your confirmed phone number off your TeenWork account? Parents will see "Phone number not confirmed yet".')) return;
    }
    ph.busy = true; ph.msg = act === 'start' ? 'Sending a code…' : act === 'check' ? 'Checking…' : 'Removing…'; ph.msgKind = ''; paintPhone();
    const d = await phoneCall(act, body);
    ph.busy = false;
    if (d.ok) {
      if (act === 'start' && d.sent) { ph.step = 'code'; ph.last4 = d.last4 || ''; ph.msg = 'Code sent.'; ph.msgKind = 'good'; }
      else if (d.confirmed) { ph.step = ''; ph.msg = d.already ? 'That number is already confirmed.' : 'Your phone number is confirmed. Parents now see it on your jobs.'; ph.msgKind = 'good'; toast('📱 Phone number confirmed', 'success'); }
      else if (d.removed) { ph.step = ''; ph.msg = 'Your number was taken off your account.'; ph.msgKind = ''; }
      delete cache[keyOf(u)];
      await fetchTrust([keyOf(u)], true);
      if (act === 'start' && d.sent) setTimeout(() => { const c = $('tw64-code'); if (c) c.focus(); }, 0);
    } else {
      if (d.code === 'not_configured' || d.code === 'not_deployed') ph.ready = false;
      if (d.code === 'expired') ph.step = 'change';
      ph.msg = PHONE_MSG[d.code] || d.error || 'Something went wrong. Please try again.';
      if (d.code === 'wrong_code' && typeof d.left === 'number') ph.msg += d.left ? ' ' + plural(d.left, 'try', 'tries') + ' left.' : '';
      ph.msgKind = 'bad';
    }
    paintPhone(); paintEmployer();
  }
  function onPhoneClick(e) {
    const b = e.target.closest('button[data-act]'); if (!b || b.type === 'submit') return;
    e.preventDefault(); phoneAction(b.dataset.act);
  }
  function paintEmployer() {
    const u = asRole('employer'); if (!u) return;
    if (!empPanel()) return;
    const practice = !isReal(u), key = keyOf(u);
    if (ph.key !== key) Object.assign(ph, { key, step: '', last4: '', msg: '', msgKind: '', busy: false, tel: '' });
    const pv = $('tw64-emp-preview');
    if (pv) { const html = practice ? PRACTICE_BOX : boxHtml(key, ''); if (pv.dataset.html !== html) { pv.innerHTML = html; pv.dataset.html = html; } }
    paintPhone();
    if (practice) return;
    // the profile's own badges and reviews panel
    const d = cached(key);
    if (d && !d.closed) {
      const n = +d.reviews || 0;
      const rb = $('emp-profile-rating-badge'); if (rb) rb.textContent = n ? '⭐ ' + Number(d.avg).toFixed(1) + ' (' + plural(n, 'review') + ')' : 'No reviews yet';
      const rc = $('emp-profile-review-count'); if (rc) rc.textContent = plural(n, 'review');
      const head = rc && rc.parentNode && rc.parentNode.querySelector('h2'); if (head && /Reviews from Teens$/.test(head.textContent)) head.textContent = '⭐ Reviews from teens and parents';
      const list = $('emp-profile-reviews-list');
      if (list) {
        const recent = Array.isArray(d.recent) ? d.recent : [], held = +d.held || 0;
        const html = (recent.length ? '<ul class="tw64-reviews tw64-reviews-big">' + recent.map(r => '<li><span class="tw64-stars" role="img" aria-label="' + (+r.rating || 0) + ' out of 5 stars">' + stars(r.rating) + '</span> <b>' + (r.role === 'parent' ? 'Parent' : 'Teen') + '</b> · ' + esc(monthYear(r.at)) + (r.text ? '<q>' + esc(r.text) + '</q>' : '') + '</li>').join('') + '</ul>'
          : '<p class="tw64-line tw64-muted">' + (n ? 'Your reviews show here once they are public.' : 'No reviews yet. After a teen you hired finishes a job, they and their parent can rate you here.') + '</p>') +
          (held ? '<p class="tw64-small">' + (held === 1 ? '1 new review stays private' : held + ' new reviews stay private') + ' for up to 14 days, or until you finish your part of the job wrap-up. It already counts in your stars.</p>' : '');
        if (list.dataset.tw64 !== html) { list.innerHTML = html; list.dataset.tw64 = html; }
      }
      const prof = $('emp-profile-rating-badge') && $('emp-profile-rating-badge').parentNode;
      if (prof) {
        let pb = $('tw64-phone-badge');
        if (d.phone && !pb) { pb = document.createElement('span'); pb.id = 'tw64-phone-badge'; pb.className = 'badge badge-green'; pb.textContent = '📱 Phone confirmed'; prof.appendChild(pb); }
        else if (!d.phone && pb) pb.remove();
      }
    }
  }
  let empLoading = false;
  async function loadEmployer(force) {
    const u = realAs('employer'); if (!u || empLoading) return;
    empLoading = true;
    try {
      paintEmployer();
      await Promise.all([fetchTrust([keyOf(u)], force), phoneReady(force)]);
    } finally { empLoading = false; }
    if (asRole('employer') === u) paintEmployer();
  }

  /* ── "Hired" is recorded on the server by the employer's own account ── */
  const hireStore = u => 'tw64_hires_' + keyOf(u).replace(/[^a-z0-9]/g, '_');
  const recorded = u => { try { return JSON.parse(lsGet(hireStore(u)) || '{}') || {}; } catch (e) { return {}; } };
  const hiring = new Set();
  async function recordHire(u, a) {
    const id = String(a._jobId) + '|' + low(a._teenKey);
    if (!a._jobId || !a._teenKey || recorded(u)[id] || hiring.has(id)) return;
    hiring.add(id);
    try {
      const c = await client(); if (!c || !(await sessionFor(c, u))) return;
      const r = await c.rpc('tw_record_hire', { p_employer: keyOf(u), p_job_id: String(a._jobId), p_teen: low(a._teenKey) });
      if (r && r.error) { if (missing(r.error)) state.setup = 'missing'; return; }
      const d = (r && r.data) || {};
      if (d.ok) { const m = recorded(u); m[id] = Date.now(); lsSet(hireStore(u), JSON.stringify(m)); delete cache[keyOf(u)]; }
    } catch (e) {} finally { hiring.delete(id); }
  }
  let backfillAt = 0;
  function backfillHires() {
    const u = realAs('employer'); if (!u || state.setup === 'missing' || Date.now() - backfillAt < 20000) return;
    backfillAt = Date.now();
    APPLICANTS().filter(a => a && a._jb && a.hired && a._owner === (u.dataKey || u.email)).forEach(a => later(() => recordHire(u, a), 0));
  }
  const _oHire = window.hireApplicant;
  if (typeof _oHire === 'function') window.hireApplicant = function (idx) {
    const u = realAs('employer'), a = u ? APPLICANTS()[idx] : null, was = !!(a && a.hired);
    const r = _oHire.apply(this, arguments);
    if (u && a && a._jb && !was && a.hired) later(() => recordHire(u, a), 600);
    return r;
  };

  /* ── wiring ─────────────────────────────────────────────────────── */
  function paintAll(force) {
    const u = me(); if (!u) return;
    if (force) { Object.keys(cache).forEach(k => delete cache[k]); state.mine = null; }
    if (u.type === 'parent') decorateParent();
    else if (u.type === 'teen') decorateTeen();
    else if (u.type === 'employer') { backfillHires(); if (isReal(u)) loadEmployer(force); else paintEmployer(); }
  }
  const wrap = (name, after) => {
    const o = window[name]; if (typeof o !== 'function') return;
    window[name] = function () { const r = o.apply(this, arguments); try { after.apply(this, arguments); } catch (e) { console.warn('employer-trust:', e); } return r; };
  };
  wrap('renderApprovalJobs', jobs => { lastApprovalJobs = Array.isArray(jobs) ? jobs : null; decorateParent(); });
  wrap('renderAllApplications', () => decorateParent());
  wrap('renderTeenApplications', () => decorateTeen());
  wrap('renderEmployerDashboard', () => { if (asRole('employer')) { backfillHires(); paintEmployer(); } });
  wrap('switchDashTab', (btn, id) => {
    if (id === 'ptab-approvals' || id === 'ptab-overview') decorateParent();
    else if (id === 'ttab-applications') decorateTeen();
    else if (id === 'etab-profile') loadEmployer(false);
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') later(() => paintAll(false), 300); });
  // after sign-in the dashboard draws itself, then the job board's cloud sync redraws the lists
  let lastUser = null;
  setInterval(() => {
    const u = me();
    if (u !== lastUser) { lastUser = u; if (u) { resetFor(u); later(() => paintAll(false), 400); } return; }
    if (u && u.type === 'employer') backfillHires();
  }, 1500);

  window.twEmployerTrust = {
    review,                                   // ({ jobId, employer, rating, text, teen }) → Promise<{ ok, error? }>
    history: keys => fetchTrust(keys, true),  // (employer keys) → Promise<{ key: history | null }>
    openReview,
    refresh: () => paintAll(true),
    state,
  };
})();
