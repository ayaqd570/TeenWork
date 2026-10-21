
/* ═══════════════════════════════════════════════════════════════════
   v47 · ASK FOR THE WORK PERMIT WHEN APPLYING  (2026-10-18)
   Aya: "you must ask for teens permit image if one is needed".
   Before: a teen who tapped Apply on a job that needs a work permit (Tier 3)
   got "📋 Work permit needed" and had to find the Verification page.
   Now the Apply pop-up asks for the permit right there: the same 📷 upload
   and check as Verification → step 3 (verify-permit, then a TeenWork admin
   double-checks). As soon as the permit passes the check, "Send my
   application" sends it. Jobs that are blocked for another reason (age,
   hazard, no parent consent yet) still show the job-tiers explanation.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twPermitAsk47) return;
  window.__twPermitAsk47 = true;

  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tiers = () => (window.twJobTiers && typeof window.twJobTiers.check === 'function') ? window.twJobTiers : null;
  const permitOk = () => { try { return !!(window.twWorkPermitStatus && window.twWorkPermitStatus().ok); } catch (e) { return false; } };
  const permitNow = () => { try { return window.twWorkPermitStatus ? window.twWorkPermitStatus() : { status: 'none' }; } catch (e) { return { status: 'none' }; } };
  const JOBS = () => { try { return typeof browsableJobs !== 'undefined' ? browsableJobs : []; } catch (e) { return []; } };
  const POSTED = () => { try { return typeof employerPostedJobs !== 'undefined' ? employerPostedJobs : []; } catch (e) { return []; } };
  function findJob(arg) {
    if (arg && typeof arg === 'object') return arg;
    return JOBS().find(j => j && String(j.id) === String(arg)) || POSTED().find(j => j && String(j.id) === String(arg)) || null;
  }

  /* ── the pop-up (borrows the permit upload panel from Verification) ── */
  let home = null, timer = 0, open = null;
  function borrowPanel() {
    let panel = $('twpc');
    if (!panel) { try { window.twPermitCheck && window.twPermitCheck.build(); } catch (e) {} panel = $('twpc'); }
    if (!panel) return null;
    if (!home) home = { parent: panel.parentNode, next: panel.nextSibling };
    return panel;
  }
  function returnPanel() {
    const panel = $('twpc');
    if (panel && home && home.parent && panel.parentNode !== home.parent) {
      try { home.parent.insertBefore(panel, home.next && home.next.parentNode === home.parent ? home.next : null); } catch (e) { home.parent.appendChild(panel); }
    }
    home = null;
  }
  function close() {
    clearInterval(timer); timer = 0;
    returnPanel();
    const m = $('tw47pa'); if (m) m.remove();
    open = null;
  }
  function state() {
    const ok = permitOk(), btn = $('tw47pa-go'), note = $('tw47pa-note'); if (!btn || !note) return;
    btn.disabled = !ok;
    const st = permitNow().status;
    const text = ok ? '✅ Your permit passed the check. You can send your application now.'
      : st === 'rejected' ? 'TeenWork couldn\'t approve your last permit. Add a clearer photo above.'
      : st === 'needs_review' ? 'Your last photo was missing something. Add a new photo above.'
      : 'Add your permit above to send this application.';
    if (note.textContent !== text) { note.textContent = text; note.className = 'tw47pa-note' + (ok ? ' ok' : ''); }
  }
  function ask(job, res, send) {
    close();
    const panel = borrowPanel();
    if (!panel) return false;                                  // no upload panel in this copy: the job-tiers pop-up explains instead
    const rule = res.rule || {}, b = (res.blocks || [])[0] || {};
    const m = document.createElement('div'); m.id = 'tw47pa'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'tw47pa-h');
    m.innerHTML = '<div class="tw47pa-sheet"><button type="button" class="tw47pa-x" aria-label="Close" data-tw47pa="close">✕</button>' +
      '<h3 id="tw47pa-h">📋 This job needs your work permit</h3>' +
      '<p class="tw47pa-job">' + esc(job.title || 'This job') + (job.employer ? ' · ' + esc(job.employer) : '') + ' · 📋 Tier 3</p>' +
      '<p>' + esc(b.msg || rule.note || 'This job needs a work permit.') + '</p>' +
      (rule.url ? '<p class="tw47pa-small"><a href="' + esc(rule.url) + '" target="_blank" rel="noopener">How to get a permit in ' + esc(rule.state || 'your state') + ' →</a></p>' : '') +
      '<div id="tw47pa-slot"></div>' +
      '<p class="tw47pa-note" id="tw47pa-note" role="status" aria-live="polite"></p>' +
      '<div class="tw47pa-row"><button type="button" class="tw47pa-btn" data-tw47pa="close">Not now</button>' +
      '<button type="button" class="tw47pa-btn pri" id="tw47pa-go" data-tw47pa="go" disabled>Send my application</button></div></div>';
    document.body.appendChild(m);
    $('tw47pa-slot').appendChild(panel);
    open = { job, send };
    state();
    timer = setInterval(state, 400);
    return true;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-tw47pa]'); if (!b) return;
    const a = b.getAttribute('data-tw47pa');
    if (a === 'close') close();
    else if (a === 'go' && open && permitOk()) { const send = open.send; close(); send(); }
  });
  document.addEventListener('mousedown', e => { if (e.target && e.target.id === 'tw47pa') close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('tw47pa')) close(); });

  /* ── the apply gate, outside the job-tiers one ───────────────────── */
  ['teenApply', 'applyToJob'].forEach(name => {
    const o = window[name]; if (typeof o !== 'function') return;
    window[name] = function (jobArg) {
      const u = me(), self = this, args = arguments, T = tiers();
      try {
        if (T && u && u.type === 'teen' && !u.isAdmin && !(document.body && document.body.classList.contains('tw-limited'))) {
          const job = findJob(jobArg);
          const res = job ? T.check(job, u) : null;
          // only when the permit is the one thing missing; anything else gets the job-tiers explanation
          if (res && !res.ok && res.blocks.length && res.blocks.every(b => b.kind === 'permit')) {
            if (ask(job, res, () => window[name].apply(self, args))) return;
          }
        }
      } catch (e) { console.warn('permit-ask-v47:', e); }
      return o.apply(this, arguments);
    };
  });
  const _oLogout = window.doLogout;
  if (typeof _oLogout === 'function') window.doLogout = function () { close(); return _oLogout.apply(this, arguments); };

  const css = document.createElement('style'); css.id = 'permit-ask-v47-css';
  css.textContent =
    '#tw47pa{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10060;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto}' +
    '.tw47pa-sheet{position:relative;background:var(--card,#fff);color:var(--text,#1b1b1b);border-radius:16px;padding:1.4rem 1.3rem 1.1rem;max-width:480px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.25);font-size:.9rem;line-height:1.55;margin:auto}' +
    '.tw47pa-sheet h3{font-family:"Fraunces",serif;font-size:1.18rem;margin:0 0 .4rem;padding-right:1.6rem}' +
    '.tw47pa-sheet p{margin:0 0 .6rem}' +
    '.tw47pa-job{font-size:.8rem;color:var(--muted,#667);font-weight:700}' +
    '.tw47pa-small{font-size:.82rem}' +
    '.tw47pa-x{position:absolute;top:8px;right:10px;border:none;background:none;font-size:1.1rem;cursor:pointer;color:var(--muted,#667);padding:4px}' +
    '#tw47pa .twpc{margin-top:.4rem}' +
    '.tw47pa-note{font-size:.82rem;color:var(--muted,#667);margin:.7rem 0 .2rem}.tw47pa-note.ok{color:var(--green,#2d6a4f);font-weight:700}' +
    '.tw47pa-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:.5rem}' +
    '.tw47pa-btn{border:1.5px solid var(--border,#ddd);background:var(--card,#fff);color:inherit;border-radius:9px;padding:8px 14px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.85rem}' +
    '.tw47pa-btn.pri{background:var(--green,#2d6a4f);border-color:var(--green,#2d6a4f);color:#fff}.tw47pa-btn[disabled]{opacity:.5;cursor:default}';
  document.head.appendChild(css);

  window._twPermitAsk = { ask, close, isOpen: () => !!open };
})();
