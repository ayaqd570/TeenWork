
/* ═══════════════════════════════════════════════════════════════════
   permit-signup-v48 · WORK PERMIT AT SIGN-UP, AGE GOES UP ON THE BIRTHDAY  (2026-10-19)
   Aya: "Check permit at sign up so there's no redoing it update age at birthday."
   • Teen sign-up has an optional 📋 Work Permit photo. As soon as the account is made, the photo
     goes through the same check as Verification → step 3 (verify-permit, then a TeenWork admin).
     A permit that passed is saved with the account (permit_checks), so Apply doesn't ask for it
     again, on any device. A photo that doesn't pass opens the permit window right away, so the teen
     can try another photo now, or later from Verification or Apply.
   • A permit stays on file: a later photo that doesn't pass doesn't undo one that did. Only a
     TeenWork admin's "rejected" does.
   • The age comes from the date of birth and goes up on the birthday itself, also when the app is
     left open past midnight: job tiers, permit rules and Find Jobs follow, and the teen gets the
     birthday note (plus a line when a work permit is no longer needed). The apply script also makes
     every age helper read "2010-10-19" as a local date: it was read as UTC midnight, which is still
     the 18th in the US, so the age went up a day early.
   window.twAgeFromDob(dob[, date]) → age in whole years on that date (default today), or null.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twPermitSignup48) return;
  window.__twPermitSignup48 = true;

  const $ = id => document.getElementById(id);
  const me = () => { try { if (typeof currentUser !== 'undefined' && currentUser) return currentUser; } catch (e) {} return window.currentUser || null; };
  const emailOf = u => String((u && u.email) || '').trim().toLowerCase();
  const isDemo = u => !u || u.isDemo === true || /\.demo$/i.test(u.email || '') || u.email === 'demo@teen.com';
  const isTeen = u => !!(u && !u.isAdmin && u.type === 'teen');
  const toast = (m, t) => { try { window.showToast(m, t || 'info'); } catch (e) {} };
  const client = () => { try { if (typeof sbClient !== 'undefined' && sbClient) return sbClient; } catch (e) {} return window.sbClient || null; };
  const tiers = () => (window.twJobTiers && typeof window.twJobTiers.permitNeeded === 'function') ? window.twJobTiers : null;
  const later = (fn, ms) => setTimeout(() => { try { fn(); } catch (e) { console.warn('permit-signup-v48:', e); } }, ms || 0);
  const permitOk = () => { try { return !!(window.twWorkPermitStatus && window.twWorkPermitStatus().ok); } catch (e) { return false; } };

  /* ── age from a date of birth ───────────────────────────────────── */
  // "2010-10-19" is that day where the teen is (new Date("2010-10-19") is UTC midnight).
  function dobDate(dob) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob || '').trim());
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const d = dob ? new Date(dob) : null;
    return d && !isNaN(d) ? d : null;
  }
  function ageOn(dob, day) {
    const b = dobDate(dob); if (!b) return null;
    const t = day || new Date();
    let a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    return a;
  }
  window.twAgeFromDob = ageOn;
  function setAge(u, age) {
    u.age = age;
    const w = window.currentUser; if (w && w !== u && emailOf(w) === emailOf(u)) w.age = age;
    try { if (typeof _aiProfile !== 'undefined' && _aiProfile) _aiProfile.age = age; } catch (e) {}
  }

  /* ── styles ─────────────────────────────────────────────────────── */
  const css = document.createElement('style'); css.id = 'permit-signup-v48-css';
  css.textContent =
    '.twps-opt{color:var(--muted,#667);font-weight:400;text-transform:none;letter-spacing:0}' +
    '.twps-note{font-size:.8rem;color:var(--muted,#667);margin:0 0 .55rem;line-height:1.5}' +
    '.twps-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
    '.twps-btn{border:1.5px solid var(--border,#ddd);background:var(--card,#fff);color:inherit;border-radius:9px;padding:8px 14px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.85rem}' +
    '.twps-btn.pri{background:var(--green,#2d6a4f);border-color:var(--green,#2d6a4f);color:#fff}' +
    '.twps-link{border:none;background:none;color:var(--muted,#667);text-decoration:underline;cursor:pointer;font-family:inherit;font-size:.8rem;padding:4px}' +
    '.twps-name{font-size:.8rem;color:var(--muted,#667);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}' +
    '.twps-preview{display:block;max-width:100%;max-height:160px;border-radius:8px;margin-top:.6rem;border:1px solid var(--border,#e5e5e5)}' +
    '.twps [hidden],#twps-win [hidden]{display:none!important}' +
    '.twps-onfile{font-size:.8rem;margin-top:.55rem;color:var(--green,#2d6a4f);font-weight:700}' +
    '#twps-win{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10060;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto}' +
    '.twps-sheet{position:relative;background:var(--card,#fff);color:var(--text,#1b1b1b);border-radius:16px;padding:1.4rem 1.3rem 1.1rem;max-width:480px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.25);font-size:.9rem;line-height:1.55;margin:auto}' +
    '.twps-sheet h3{font-family:"Fraunces",serif;font-size:1.18rem;margin:0 0 .4rem;padding-right:1.6rem}' +
    '.twps-sheet p{margin:0 0 .6rem}' +
    '.twps-x{position:absolute;top:8px;right:10px;border:none;background:none;font-size:1.1rem;cursor:pointer;color:var(--muted,#667);padding:4px}' +
    '#twps-win .twpc{margin-top:.4rem}#twps-win #twps-onfile{display:none}' +
    '.twps-wnote{font-size:.82rem;color:var(--green,#2d6a4f);font-weight:700;margin:.7rem 0 .2rem}' +
    '.twps-wrow{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:.5rem}';
  document.head.appendChild(css);

  /* ── 1. sign-up: an optional permit photo ───────────────────────── */
  let picked = null;    // the photo chosen on the sign-up form
  let pending = null;   // { file, email }: sent once that account exists and is signed in
  let previewUrl = '';
  function noteText() {
    const T = tiers(), state = ($('su-state') || {}).value || '', age = ageOn(($('su-age') || {}).value);
    const once = "Add a photo now and we'll check it once, so you won't be asked for it again when you apply.";
    if (T && state) {
      const p = T.permitNeeded(state, age == null ? 13 : age);
      if (p.needed) return once + ' No permit yet? You can add it later.';
      if (p.known) return `You don't need one for most jobs in ${p.state}${age == null ? '' : ' at ' + age}, but some employers ask for it. Have one? ` + once;
    }
    return 'Have a work permit? ' + once;
  }
  function drawNote() { const n = $('twps-note'); if (n) n.textContent = noteText(); }
  function buildSignup() {
    const host = $('teen-fields'); if (!host || $('twps')) return;
    const box = document.createElement('div');
    box.className = 'form-group twps'; box.id = 'twps';
    box.innerHTML =
      '<label for="twps-file">Work Permit <span class="twps-opt">(optional)</span></label>' +
      '<p class="twps-note" id="twps-note"></p>' +
      '<input type="file" id="twps-file" accept="image/*,application/pdf" hidden>' +
      '<div class="twps-row"><button type="button" class="twps-btn" id="twps-pick">📷 Add a photo of my permit</button>' +
      '<span class="twps-name" id="twps-name"></span>' +
      '<button type="button" class="twps-link" id="twps-clear" hidden>Remove</button></div>' +
      '<img class="twps-preview" id="twps-preview" alt="Your work permit" hidden>';
    const note = $('su-permit-note');
    if (note && note.parentNode === host) host.insertBefore(box, note.nextSibling); else host.appendChild(box);
    $('twps-pick').onclick = () => $('twps-file').click();
    $('twps-file').onchange = e => pick(e.target.files && e.target.files[0]);
    $('twps-clear').onclick = () => pick(null);
    ['su-state', 'su-age'].forEach(id => { const el = $(id); if (el) { el.addEventListener('change', drawNote); el.addEventListener('input', drawNote); } });
    drawNote();
  }
  function pick(file) {
    const fits = f => !!f && (/^image\//i.test(f.type) || /pdf$/i.test(f.type) || /\.(jpe?g|png|webp|heic|heif|pdf)$/i.test(f.name || ''));
    picked = fits(file) ? file : null;
    if (file && !picked) toast('Please choose a photo or a PDF of your work permit.', 'error');
    if (!picked) { const inp = $('twps-file'); if (inp) inp.value = ''; }
    const img = $('twps-preview');
    if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch (e) {} previewUrl = ''; }
    if (img) {
      if (picked && /^image\/(jpeg|png|webp|gif)$/i.test(picked.type)) { previewUrl = URL.createObjectURL(picked); img.src = previewUrl; img.hidden = false; }
      else { img.removeAttribute('src'); img.hidden = true; }
    }
    if ($('twps-name')) $('twps-name').textContent = picked ? picked.name : '';
    if ($('twps-clear')) $('twps-clear').hidden = !picked;
    if ($('twps-pick')) $('twps-pick').textContent = picked ? '📷 Choose a different photo' : '📷 Add a photo of my permit';
  }

  // Sends the sign-up photo through the Verification step 3 panel (permit-check-v45).
  async function sendPending(job) {
    const P = window.twPermitCheck, u = me();
    if (!P || !job || !isTeen(u) || isDemo(u) || emailOf(u) !== job.email) return;
    pick(null);
    try { await P.refreshStatus(); } catch (e) {}   // the panel learns whose account it is first, so it doesn't reset the result afterwards
    try { P.build(); } catch (e) {}
    if (!$('twpc')) return;
    P.choose(job.file);
    toast('📋 Checking the work permit you added…', 'info');
    try { await P.send(); } catch (e) {}
    if (emailOf(me()) !== job.email) return;
    const res = $('twpc-result');
    const kind = !res || res.style.display === 'none' ? 'err' : res.classList.contains('ok') ? 'ok' : res.classList.contains('warn') ? 'warn' : 'err';
    await loadOnFile();
    if (kind === 'ok') toast("✅ Your work permit is on file. You won't be asked for it again when you apply.", 'success');
    else openWindow(kind);
  }

  /* The permit window: the Verification step 3 panel, borrowed and put back on close. */
  let home = null, poll = 0;
  function openWindow(kind) {
    closeWindow();
    const panel = $('twpc'); if (!panel) return;
    home = { parent: panel.parentNode, next: panel.nextSibling };
    const m = document.createElement('div');
    m.id = 'twps-win'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'twps-win-h');
    m.innerHTML = '<div class="twps-sheet"><button type="button" class="twps-x" aria-label="Close" data-twps="close">✕</button>' +
      '<h3 id="twps-win-h">📋 Your work permit</h3>' +
      '<p>' + (kind === 'warn' ? "The permit photo you added when you signed up didn't pass the check." : "We couldn't check the permit photo you added when you signed up.") +
      ' You can try another photo now, or later from Verification or when you apply to a job that needs it.</p>' +
      '<div id="twps-slot"></div>' +
      '<p class="twps-wnote" id="twps-wnote" role="status" aria-live="polite"></p>' +
      '<div class="twps-wrow"><button type="button" class="twps-btn pri" id="twps-win-go" data-twps="close">Later</button></div></div>';
    document.body.appendChild(m);
    $('twps-slot').appendChild(panel);
    drawWindow();
    poll = setInterval(drawWindow, 400);
  }
  function drawWindow() {
    const go = $('twps-win-go'), note = $('twps-wnote'); if (!go || !note) return;
    const ok = permitOk();
    const text = ok ? "✅ Your permit passed the check. It's on file, so you won't be asked for it again when you apply." : '';
    if (note.textContent !== text) note.textContent = text;
    if (go.textContent !== (ok ? 'Done' : 'Later')) go.textContent = ok ? 'Done' : 'Later';
  }
  function closeWindow() {
    clearInterval(poll); poll = 0;
    const panel = $('twpc');
    if (panel && home && home.parent && panel.parentNode !== home.parent) {
      try { home.parent.insertBefore(panel, home.next && home.next.parentNode === home.parent ? home.next : null); } catch (e) { home.parent.appendChild(panel); }
    }
    home = null;
    const m = $('twps-win'); if (m) m.remove();
  }
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-twps="close"]')) closeWindow(); });
  document.addEventListener('mousedown', e => { if (e.target && e.target.id === 'twps-win') closeWindow(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('twps-win')) closeWindow(); });

  /* ── 2. a permit that passed stays on file ──────────────────────── */
  // permit-check-v45 reads only the newest check. Here: newest first, an admin's "rejected" cancels every
  // check before it; after that, an approved check, or one that passed and waits for an admin, keeps the
  // permit on file even when a later photo didn't pass.
  let onFile = null;   // { email, ok, status }
  function standing(rows) {
    const live = [];
    for (const r of rows || []) { if (r.status === 'rejected') break; live.push(r); }
    if (live.some(r => r.status === 'approved')) return { ok: true, status: 'approved' };
    if (live.some(r => r.status === 'needs_review' && r.ai_valid)) return { ok: true, status: 'needs_review' };
    return { ok: false, status: rows && rows.length ? rows[0].status : 'none' };
  }
  async function loadOnFile() {
    const u = me(), email = emailOf(u);
    if (!isTeen(u) || isDemo(u) || !email) { onFile = null; return; }
    const c = client();
    if (!c || typeof c.from !== 'function' || !c.auth || typeof c.auth.getSession !== 'function') return;
    try {
      const s = await c.auth.getSession(); if (!(s && s.data && s.data.session)) return;
      const { data, error } = await c.from('permit_checks').select('ai_valid,status,created_at').order('created_at', { ascending: false }).limit(25);
      if (error || !Array.isArray(data) || emailOf(me()) !== email) return;
      const before = !!(onFile && onFile.email === email && onFile.ok);
      onFile = Object.assign({ email }, standing(data));
      if (before !== onFile.ok) { try { window.twJobTiersRefresh && window.twJobTiersRefresh(); } catch (e) {} }
      drawOnFile();
    } catch (e) {}
  }
  const _oStatus = window.twWorkPermitStatus;
  if (typeof _oStatus === 'function') window.twWorkPermitStatus = function () {
    const s = _oStatus.apply(this, arguments) || { ok: false, status: 'none' };
    if (!s.ok && onFile && onFile.ok && onFile.email === emailOf(me())) return Object.assign({}, s, { ok: true, status: onFile.status, onFile: true });
    return s;
  };
  // One line in the permit panel (Verification, the Apply pop-up and the window above) once it's on file.
  function drawOnFile() {
    const box = $('twpc'); if (!box) return;
    let line = $('twps-onfile');
    const u = me();
    if (!(isTeen(u) && !isDemo(u) && permitOk())) { if (line) line.remove(); return; }
    if (!line) { line = document.createElement('div'); line.id = 'twps-onfile'; line.className = 'twps-onfile'; box.appendChild(line); }
    line.textContent = "✓ Your work permit is on file, so you won't be asked for it again when you apply.";
  }
  const _oRefresh = window.twJobTiersRefresh;   // permit-check-v45 calls this whenever the permit status changes
  window.twJobTiersRefresh = function () {
    let r; if (typeof _oRefresh === 'function') r = _oRefresh.apply(this, arguments);
    try { drawOnFile(); } catch (e) {}
    return r;
  };

  /* ── 3. the birthday ─────────────────────────────────────────────── */
  // The base checkBirthdayUnlocks() (run by launchDashboard) shows "Happy Birthday!" and redraws Find Jobs.
  // This keeps both copies of the signed-in user on the new age, says when a work permit is no longer
  // needed, and runs it again at midnight and whenever the app comes back on screen on a new day.
  function permitNote(u, was, now) {
    const T = tiers(); if (!T || me() !== u) return;
    let state = u.state || '';
    try { if (typeof getTeenState === 'function') state = getTeenState() || state; } catch (e) {}
    const a = T.permitNeeded(state, was), b = T.permitNeeded(state, now);
    if (a.needed && !b.needed) toast(`🎂 You're ${now} now, so jobs in ${b.state} don't need a work permit anymore.`, 'success');
  }
  const _oBirthday = window.checkBirthdayUnlocks;
  if (typeof _oBirthday === 'function') window.checkBirthdayUnlocks = function () {
    const u = me();
    let last = 0; try { last = parseInt(localStorage.getItem('tw_last_age_' + ((u && u.email) || 'anon')) || '0', 10) || 0; } catch (e) {}
    const r = _oBirthday.apply(this, arguments);
    const age = isTeen(u) ? ageOn(u.dob) : null;
    if (age != null) {
      setAge(u, age);
      if (last && age > last) {
        try { window.twJobTiersRefresh && window.twJobTiersRefresh(); } catch (e) {}
        later(() => permitNote(u, last, age), 4800);   // after the "Happy Birthday!" toast
      }
    }
    return r;
  };
  const dayKey = () => new Date().toDateString();
  let day = dayKey(), dayTimer = 0;
  function armMidnight() {
    clearTimeout(dayTimer);
    const n = new Date(), next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 2);
    dayTimer = setTimeout(newDay, Math.max(1000, Math.min(next - n, 3 * 3600 * 1000)));   // at least every 3 h: timers stall while a laptop sleeps
  }
  function newDay() {
    const d = dayKey();
    if (d !== day) {
      day = d;
      const u = me();
      if (isTeen(u) && u.dob && typeof window.checkBirthdayUnlocks === 'function') {
        try { window.checkBirthdayUnlocks(); } catch (e) {}
        try { window.twJobTiersRefresh && window.twJobTiersRefresh(); } catch (e) {}
      }
    }
    armMidnight();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) newDay(); });
  window.addEventListener('focus', newDay);
  armMidnight();

  /* ── hooks ──────────────────────────────────────────────────────── */
  const _oSignup = window.doSignup;
  if (typeof _oSignup === 'function') window.doSignup = function () {
    try {
      const type = (typeof selectedType !== 'undefined' && selectedType) || window.selectedType || '';
      pending = type === 'teen' && picked ? { file: picked, email: String(($('su-email') || {}).value || '').trim().toLowerCase(), at: Date.now() } : null;
    } catch (e) {}
    return _oSignup.apply(this, arguments);
  };
  const _oLaunch = window.launchDashboard;
  if (typeof _oLaunch === 'function') window.launchDashboard = function () {
    const r = _oLaunch.apply(this, arguments);
    day = dayKey(); armMidnight();
    const u = me();
    if (isTeen(u) && !isDemo(u)) {
      later(loadOnFile, 700);
      // only right after that sign-up, not at some later sign-in to the same email
      if (pending && pending.email === emailOf(u) && Date.now() - pending.at < 120000) { const job = pending; pending = null; later(() => sendPending(job), 1500); }
    }
    return r;
  };
  const _oVerify = window.showVerifyPage;
  if (typeof _oVerify === 'function') window.showVerifyPage = function () { const r = _oVerify.apply(this, arguments); [300, 1200].forEach(ms => later(drawOnFile, ms)); return r; };
  const _oLogout = window.doLogout;
  if (typeof _oLogout === 'function') window.doLogout = function () { closeWindow(); pending = null; onFile = null; return _oLogout.apply(this, arguments); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildSignup); else buildSignup();
  window._twPermitSignup = { ageOn, standing, loadOnFile, openWindow, closeWindow, onFile: () => (onFile ? Object.assign({}, onFile) : null) };
})();
