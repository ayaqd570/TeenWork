
/* ════════════════════════════════════════════════════════════════════
   permit-check-v45 — Work permit photo check (Verification Center, step 3)
   A teen uploads a photo or PDF of their Vermont work permit. It goes to the
   Supabase Edge Function `verify-permit`, which asks Google Gemini to check it
   and returns { valid, missing_fields, extracted_data, needs_review, ... }.
   The AI answer is a pre-check: a passed check unlocks step 3 as before, and
   every check waits in the permit_checks table for a TeenWork admin.
   Real accounts must be signed in to Supabase (the function checks the token).
   Demo logins get a sample result and send nothing.
   The old "✓ Mark Permit Submitted" button now opens the upload for real teens.
   window.twWorkPermitStatus() -> { ok, status: 'approved'|'needs_review'|'rejected'|'none', state }
   is read by the job-tiers block; ok = approved, or waiting for review after a passed pre-check.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twPermitCheck) return; window.__twPermitCheck = true;

  const FN = (typeof SUPABASE_URL === 'string' && /^https:/.test(SUPABASE_URL)) ? SUPABASE_URL.replace(/\/+$/, '') + '/functions/v1/verify-permit' : '';
  const PUBKEY = typeof SUPABASE_KEY === 'string' ? SUPABASE_KEY : '';
  const MAX_SEND = 7 * 1024 * 1024;
  const FIELD_NAMES = { date_of_birth: 'your date of birth', employer_name: 'the employer name', issuing_official_signature: "the issuing official's signature" };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const me = () => { try { if (typeof currentUser !== 'undefined' && currentUser) return currentUser; } catch (e) {} return window.currentUser || null; };
  const isDemo = (u) => !u || u.isDemo === true || /\.demo$/i.test(u.email || '') || u.email === 'demo@teen.com';
  const toast = (m, t) => { try { window.showToast(m, t || 'info'); } catch (e) {} };
  const client = () => { try { if (typeof sbClient !== 'undefined' && sbClient) return sbClient; } catch (e) {} return window.sbClient || null; };

  const V = (typeof TW_Verify !== 'undefined' && TW_Verify) ? TW_Verify : null;
  if (!V) return;
  const origSubmit = V.submitPermit;

  /* ── styles ─────────────────────────────────────────────────────── */
  const css = document.createElement('style');
  css.textContent = `
  .twpc{margin-top:1rem;border:1.5px dashed var(--green-light,#9fd3b5);border-radius:12px;padding:1rem 1.1rem;background:var(--card,#fff)}
  .twpc-title{font-weight:700;font-size:.95rem;color:var(--green,#2d6a4f);margin-bottom:.25rem}
  .twpc-sub{font-size:.8rem;color:var(--muted,#667);margin:0 0 .8rem;line-height:1.5}
  .twpc-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .twpc-name{font-size:.8rem;color:var(--muted,#667);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
  .twpc-preview{display:block;max-width:100%;max-height:220px;border-radius:8px;margin:.7rem 0;border:1px solid var(--border,#e5e5e5)}
  .twpc-result{margin-top:.8rem;border-radius:10px;padding:.8rem 1rem;font-size:.84rem;line-height:1.55}
  .twpc-result.ok{background:var(--green-pale,#e8f5ee);color:var(--text,#1a1a1a)}
  .twpc-result.warn{background:#fff4e0;color:#6b4300}
  .twpc-result.err{background:#fdecec;color:#8a1f1f}
  .twpc-result ul{margin:.35rem 0 0 1.1rem;padding:0}
  .twpc-result .twpc-k{color:var(--muted,#667)}
  .twpc-status{font-size:.8rem;margin-top:.6rem;color:var(--muted,#667)}
  .twpc button[disabled]{opacity:.55;cursor:default}`;
  document.head.appendChild(css);

  /* ── status for other blocks (job tiers) ────────────────────────── */
  let permit = { ok: false, status: 'none', state: 'Vermont' };
  function setPermit(status, aiValid) {
    const next = { ok: status === 'approved' || (status === 'needs_review' && !!aiValid), status, state: 'Vermont' };
    const changed = next.ok !== permit.ok || next.status !== permit.status;
    permit = next;
    if (changed) { try { window.twJobTiersRefresh && window.twJobTiersRefresh(); } catch (e) {} }
  }
  window.twWorkPermitStatus = () => ({ ...permit });

  /* ── the panel ──────────────────────────────────────────────────── */
  let picked = null, busy = false;
  function build() {
    const body = $('tw-ver-body-3');
    if (!body || $('twpc')) return;
    const box = document.createElement('div');
    box.className = 'twpc'; box.id = 'twpc';
    box.innerHTML = `
      <div class="twpc-title">📷 Upload your work permit</div>
      <p class="twpc-sub">Take a clear photo of your whole Vermont work permit (the Child Labor Certificate from the Department of Labor), or upload a PDF scan. We check it for your date of birth, the employer name and the issuing official's signature. A TeenWork admin double-checks every permit.</p>
      <input type="file" id="twpc-file" accept="image/*,application/pdf" style="display:none">
      <div class="twpc-row">
        <button type="button" class="tw-ver-btn ghost" id="twpc-pick">📷 Choose photo</button>
        <button type="button" class="tw-ver-btn primary" id="twpc-send" disabled>Check my permit</button>
        <span class="twpc-name" id="twpc-name"></span>
      </div>
      <img class="twpc-preview" id="twpc-preview" alt="Your permit photo" style="display:none">
      <div class="twpc-result" id="twpc-result" style="display:none" role="status" aria-live="polite"></div>
      <div class="twpc-status" id="twpc-status"></div>`;
    body.appendChild(box);
    $('twpc-pick').onclick = () => $('twpc-file').click();
    $('twpc-file').onchange = (e) => choose(e.target.files && e.target.files[0]);
    $('twpc-send').onclick = send;
    refreshStatus();
  }

  function choose(file) {
    picked = file || null;
    const prev = $('twpc-preview');
    $('twpc-name').textContent = picked ? picked.name : '';
    $('twpc-send').disabled = !picked;
    show(null);
    if (prev) {
      if (picked && /^image\/(jpeg|png|webp|gif)$/i.test(picked.type)) { prev.src = URL.createObjectURL(picked); prev.style.display = 'block'; }
      else { prev.removeAttribute('src'); prev.style.display = 'none'; }
    }
  }

  function show(kind, html) {
    const r = $('twpc-result'); if (!r) return;
    if (!kind) { r.style.display = 'none'; r.innerHTML = ''; return; }
    r.className = 'twpc-result ' + kind; r.innerHTML = html; r.style.display = 'block';
  }

  /* Big photos are shrunk in the browser so they upload fast and stay under the 7 MB limit. */
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type) || file.size <= 3.5 * 1024 * 1024) return file;
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.88));
      return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
    } catch (e) { return file; }
  }

  async function token() {
    const c = client();
    if (!c || !c.auth || typeof c.auth.getSession !== 'function') return null;
    try { const { data } = await c.auth.getSession(); return data && data.session ? data.session.access_token : null; } catch (e) { return null; }
  }

  // Marks step 3 done without the old "submitted" pop-up (used when restoring a saved result).
  function markDone(quiet) {
    if (!quiet) return origSubmit.call(V);
    const t = window.showToast; window.showToast = function () {};
    try { origSubmit.call(V); } finally { window.showToast = t; }
  }

  function renderResult(res, demo) {
    const d = res.extracted_data || {};
    const facts = [
      ['Date of birth', d.date_of_birth], ['Employer', d.employer_name],
      ['Signed by', d.issuing_official_signature_present ? (d.issuing_official_name || 'issuing official') + (d.issuing_official_title ? ' (' + d.issuing_official_title + ')' : '') : ''],
    ].filter((f) => f[1]).map((f) => `<li><span class="twpc-k">${esc(f[0])}:</span> ${esc(f[1])}</li>`).join('');
    const tag = demo ? '<div class="twpc-k" style="margin-top:.4rem">Demo result: in demo mode no photo is sent.</div>' : '';
    if (res.valid) {
      show('ok', `<strong>✓ Your permit looks complete.</strong> A TeenWork admin will confirm it soon.${facts ? '<ul>' + facts + '</ul>' : ''}${tag}`);
    } else {
      const miss = (res.missing_fields || []).map((k) => `<li>We couldn't find ${esc(FIELD_NAMES[k] || k)}.</li>`).join('');
      const why = (res.reasons || []).slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join('');
      show('warn', `<strong>We couldn't confirm this permit yet.</strong><ul>${miss}${why}</ul><div style="margin-top:.4rem">Try a sharper photo of the whole page in good light, with nothing covering it.</div>${tag}`);
    }
  }

  async function send() {
    if (busy || !picked) return;
    const u = me();
    const btn = $('twpc-send');
    busy = true; btn.disabled = true; btn.textContent = 'Checking…';
    try {
      if (isDemo(u)) {
        await new Promise((r) => setTimeout(r, 900));
        const res = { valid: true, missing_fields: [], extracted_data: { date_of_birth: '2010-04-12', employer_name: "Mike's Landscaping", issuing_official_signature_present: true, issuing_official_name: 'J. Rivera', issuing_official_title: 'Appointed authority' } };
        renderResult(res, true); setPermit('needs_review', true); markDone(false); return;
      }
      if (!FN) { show('err', 'The permit check is not available in this copy of the app.'); return; }
      const tok = await token();
      if (!tok) { show('err', 'Please sign out and sign in again with your TeenWork account, then try once more.'); return; }
      const file = await shrink(picked);
      if (file.size > MAX_SEND) { show('err', 'That file is too big. Please upload a photo under 7 MB.'); return; }
      const fd = new FormData(); fd.append('file', file, file.name || 'permit.jpg');
      let r, data = null;
      try {
        r = await fetch(FN, { method: 'POST', headers: { apikey: PUBKEY, Authorization: 'Bearer ' + tok }, body: fd, signal: AbortSignal.timeout ? AbortSignal.timeout(90000) : undefined });
        data = await r.json().catch(() => null);
      } catch (e) { show('err', "Couldn't reach TeenWork. Check your internet connection and try again."); return; }
      if (!r.ok || !data || typeof data.valid !== 'boolean') {
        show('err', esc((data && data.error) || 'The permit check is unavailable right now. Please try again later.')); return;
      }
      renderResult(data, false);
      setPermit('needs_review', data.valid);
      checkedThisVisit = true;
      if (data.valid) markDone(false);
      const st = $('twpc-status'); if (st) st.textContent = '';
    } finally {
      busy = false; btn.textContent = 'Check my permit'; btn.disabled = !picked;
    }
  }

  /* Latest saved check for this teen (they can read only their own rows). Runs on sign-in too,
     so the job-tiers block knows the permit status before the Verification page is opened. */
  let lastEmail = null, checkedThisVisit = false;
  async function refreshStatus() {
    const st = $('twpc-status');
    const line = (t) => { if (st) st.textContent = t; };
    const u = me();
    const email = u && u.email ? String(u.email).toLowerCase() : null;
    if (email !== lastEmail) { lastEmail = email; checkedThisVisit = false; setPermit('none', false); }
    line('');
    if (!u || isDemo(u)) return;
    const c = client();
    if (!c || typeof c.from !== 'function' || !(await token())) return;
    try {
      const { data, error } = await c.from('permit_checks').select('ai_valid,status,created_at,review_note').order('created_at', { ascending: false }).limit(1);
      if (error || !data || !data.length) { if (!error && !checkedThisVisit) setPermit('none', false); return; }
      const row = data[0], when = new Date(row.created_at).toLocaleDateString();
      setPermit(row.status, row.ai_valid);
      if (row.status === 'approved') { line(`✓ Approved by TeenWork (checked ${when}).`); markDone(true); }
      else if (row.status === 'rejected') line(`✗ TeenWork couldn't approve your last permit (${when})${row.review_note ? ': ' + row.review_note : ''}. Please upload it again.`);
      else if (row.ai_valid) { line(`Last check ${when}: looks complete, waiting for a TeenWork admin.`); markDone(true); }
      else line(`Last check ${when}: something was missing. Upload a new photo to try again.`);
    } catch (e) {}
  }

  /* ── hooks ──────────────────────────────────────────────────────── */
  // The old self-report button sends real teens to the upload instead.
  V.submitPermit = function () {
    if (isDemo(me())) return origSubmit.apply(this, arguments);
    build();
    const body = $('tw-ver-body-3'); if (body) body.classList.add('open');
    const box = $('twpc'); if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('📷 Upload a photo of your work permit to finish this step.', 'info');
  };
  const origToggle = V.toggleStep;
  V.toggleStep = function (n) { const r = origToggle.apply(this, arguments); if (Number(n) === 3) { build(); refreshStatus(); } return r; };
  const origShow = window.showVerifyPage;
  if (typeof origShow === 'function') window.showVerifyPage = function () { const r = origShow.apply(this, arguments); setTimeout(() => { build(); refreshStatus(); }, 150); return r; };
  const origLaunch = window.launchDashboard;
  if (typeof origLaunch === 'function') window.launchDashboard = function () { const r = origLaunch.apply(this, arguments); setTimeout(refreshStatus, 600); return r; };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  window.twPermitCheck = { build, refreshStatus, send, choose };
})();
