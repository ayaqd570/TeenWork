/* ══════════════════════════════════════════════════════════════════════
   PRO PAYMENTS WITH STRIPE  (v54, 2026-11-06, Aya: "add stripe setup")

   Nothing changes for anyone until the admin turns on Paid Launch
   (Admin → Launch Controls). Until then Pro stays free during testing,
   exactly like before.

   Once Paid Launch is on:
   • "Upgrade to Pro" sends a signed-in teen or employer to Stripe's own
     checkout page (the Supabase Edge Function `billing` starts it; card
     details never touch TeenWork). Teens are asked to get a parent first.
   • Coming back from Stripe, the app waits for Stripe's confirmation
     (the webhook turns Pro on) and says when Pro is on.
   • The pricing page shows the prices and a "Manage billing" button
     (Stripe's billing page: change card, see receipts, cancel).
   • The Pro line on the home page and the sign-up plan picker show prices.
   Admin → 🩺 System Health gets a "Payments (Stripe)" line, and turning on
   Paid Launch warns if Stripe isn't set up or is still in test mode.
   Prices shown here must match the prices made in Stripe (PRICE_TEXT).
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twBillingV54) return;
  window.__twBillingV54 = true;

  // per month; keep in step with Stripe. Aya, 2026-11-09: "make employer same as teen … make pro only 3.99 a month",
  // and "dont have pro for parents": parent accounts are always free (see the parents section below).
  var PRICE_TEXT = { teen_pro: '$3.99', employer_pro: '$3.99' };
  var RETURN_VIEW = { teen: 'jobs', parent: 'home', employer: 'post-job' };
  var PING_TTL = 60000;

  var $ = function (id) { return document.getElementById(id); };
  function toast(m, t, ms) { try { showToast(m, t || 'info', ms); } catch (e) {} }
  function user() { try { return window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null) || null; } catch (e) { return window.currentUser || null; } }
  function isPractice(u) {
    if (!u) return false;
    if (u.isDemo || u.twDemo) return true;
    try { return typeof window._twIsDemoSandboxUser === 'function' && !!window._twIsDemoSandboxUser(u); } catch (e) { return false; }
  }
  function isMember(u) { return !!(u && !u.isAdmin && u.type !== 'admin' && /@/.test(String(u.email || '')) && !isPractice(u)); }
  function cfg() { try { return typeof _adminGetConfig === 'function' ? (_adminGetConfig() || {}) : {}; } catch (e) { return {}; } }
  function paidOn() { return !!cfg().launchPaid; }
  function fnUrl() { return (typeof SUPABASE_URL !== 'undefined' && /^https:/.test(SUPABASE_URL)) ? SUPABASE_URL.replace(/\/+$/, '') + '/functions/v1/billing' : ''; }
  function pubKey() { return typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY' ? SUPABASE_KEY : ''; }
  async function client() {
    try { if (typeof _twCloudClient === 'function') return await _twCloudClient(3000); } catch (e) {}
    try { return typeof sbClient !== 'undefined' ? sbClient : null; } catch (e) { return null; }
  }
  // The person's own Supabase sign-in, only when it matches the account on screen.
  async function token() {
    var c = await client(), u = user();
    if (!c || !c.auth || !u) return '';
    try {
      var r = await c.auth.getSession(), s = r && r.data && r.data.session;
      if (!s || !s.access_token || String((s.user && s.user.email) || '').toLowerCase() !== String(u.email || '').toLowerCase()) return '';
      return s.access_token;
    } catch (e) { return ''; }
  }
  async function call(action, extra, signed) {
    var url = fnUrl(), key = pubKey();
    if (!url || !key) return { ok: false, code: 'no_supabase' };
    var bearer = key;
    if (signed) { bearer = await token(); if (!bearer) return { ok: false, code: 'sign_in' }; }
    try {
      var res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + bearer }, body: JSON.stringify(Object.assign({ action: action }, extra || {})) });
      var d = await res.json().catch(function () { return {}; });
      d = d && typeof d === 'object' ? d : {};
      if (res.status === 404 && !d.code) d.code = 'not_deployed';
      d.httpStatus = res.status;
      return d;
    } catch (e) { return { ok: false, code: 'network', error: String((e && e.message) || e) }; }
  }
  var pingCache = null, pingAt = 0;
  function ping(force) {
    if (!force && pingCache && Date.now() - pingAt < PING_TTL) return pingCache;
    pingAt = Date.now();
    pingCache = call('ping');
    return pingCache;
  }
  function kindFor(u, asked) {
    if (asked === 'teen_pro' || asked === 'employer_pro') return asked;
    return u && u.type === 'employer' ? 'employer_pro' : 'teen_pro';
  }
  function friendly(d) {
    var c = d && d.code;
    if (c === 'sign_in') return 'Please sign out and sign in again, then try once more.';
    if (c === 'wrong_account') return 'That account doesn’t match your sign-in. Sign in again and try once more.';
    if (c === 'network') return 'You seem to be offline. Check your connection and try again.';
    if (c === 'not_configured' || c === 'not_deployed' || c === 'no_supabase') return 'Payments aren’t set up yet. Message support and the TeenWork team can help.';
    return 'Something went wrong on our side. Please try again in a minute.';
  }

  /* ── a small "please wait" / "ask a parent" window ─────────────── */
  function closeBox() { var b = $('tw54-pay'); if (b) b.remove(); }
  function box(html, buttons) {
    closeBox();
    var m = document.createElement('div');
    m.id = 'tw54-pay'; m.className = 'tw54-share';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'tw54-pay-title');
    m.innerHTML = '<div class="tw54-share-card">' + html + '<div class="tw54-pay-actions">' + (buttons || []).map(function (b, i) {
      return '<button type="button" data-i="' + i + '" class="' + (b.primary ? 'tw54-copy' : 'tw54-btn') + '" style="width:100%;justify-content:center;margin-top:8px">' + b.label + '</button>';
    }).join('') + '</div></div>';
    m.addEventListener('click', function (e) {
      var t = e.target.closest('button[data-i]'); if (!t) return;
      var b = buttons[Number(t.getAttribute('data-i'))]; if (b && b.onClick) b.onClick();
    });
    document.body.appendChild(m);
    var f = m.querySelector('button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
    return m;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('tw54-pay') && !$('tw54-pay').dataset.busy) closeBox(); }, true);
  function askParent(kind) {
    return new Promise(function (resolve) {
      box('<h2 id="tw54-pay-title">⭐ TeenWork Pro</h2>' +
        '<p class="tw54-lead"><b>' + PRICE_TEXT[kind] + ' a month.</b> Cancel anytime from <b>Manage billing</b> on the plans page.</p>' +
        '<p class="tw54-lead">👪 <b>Ask a parent or guardian first.</b> They should be with you and pay with their card. Applying to jobs stays free, with or without Pro.</p>',
        [{ label: 'A parent is here, continue →', primary: true, onClick: function () { closeBox(); resolve(true); } },
         { label: 'Not now', onClick: function () { closeBox(); resolve(false); } }]);
    });
  }
  function busy(text) {
    var m = box('<h2 id="tw54-pay-title">⭐ TeenWork Pro</h2><p class="tw54-lead" aria-live="polite">' + text + '</p>', []);
    m.dataset.busy = '1';
    return m;
  }

  /* ── checkout and billing page ──────────────────────────────────── */
  async function startCheckout(kind) {
    var u = user();
    var p = await ping();
    if (!(p && p.ok && p.configured && p.prices && p.prices[kind])) {
      toast('Payments aren’t set up yet. Message support and the TeenWork team can switch you to Pro.', 'info', 5000);
      try { openSupportModal('Pro / Billing', 'I would like to upgrade to TeenWork Pro.'); } catch (e) {}
      return;
    }
    if (u.type === 'teen' && !(await askParent(kind))) return;
    busy('Opening Stripe’s secure checkout…');
    var d = await call('checkout', { plan: kind, account_key: u.dataKey || u.email, return_view: RETURN_VIEW[u.type] || '' }, true);
    if (d.ok && d.url && /^https:\/\/checkout\.stripe\.com\//.test(d.url)) { location.href = d.url; return; }
    closeBox();
    if (d.code === 'already_pro') { toast('⭐ You already have Pro. Opening your billing page…', 'info'); openPortal(); return; }
    toast('Checkout didn’t open. ' + friendly(d), 'error', 6000);
  }
  async function openPortal() {
    var u = user(); if (!isMember(u)) return;
    busy('Opening your billing page…');
    var d = await call('portal', { return_view: RETURN_VIEW[u.type] || '' }, true);
    if (d.ok && d.url && /^https:\/\/billing\.stripe\.com\//.test(d.url)) { location.href = d.url; return; }
    closeBox();
    toast(d.code === 'no_billing' ? 'There’s no paid subscription on this account yet.' : 'The billing page didn’t open. ' + friendly(d), 'info', 5000);
  }
  window.twBilling = { ping: ping, checkout: function (k) { var u = user(); if (isMember(u)) return startCheckout(kindFor(u, k)); }, portal: openPortal, status: function () { return call('status', {}, true); }, priceText: PRICE_TEXT };

  /* ── the Upgrade buttons ────────────────────────────────────────── */
  var origUpgrade = window.handleUpgradeClick;
  window.handleUpgradeClick = function (asked) {
    var u = user();
    // no Pro for parents, before or after Paid Launch (they could pick the free testing Pro before)
    if (u && u.type === 'parent' && !u.isAdmin) { toast(PARENT_NOTE + ' Pro is for teen and employer accounts.', 'info', 6000); return; }
    if (!paidOn() || !isMember(u)) return typeof origUpgrade === 'function' ? origUpgrade.apply(this, arguments) : undefined;
    var kind = kindFor(u, asked);
    if ((kind === 'employer_pro') !== (u.type === 'employer')) {
      toast(kind === 'employer_pro' ? 'Employer Pro is for employer accounts.' : 'Teen Pro is for teen accounts. Employers can pick Employer Pro below.', 'info', 5000);
      return;
    }
    try { if (window.twPlan && window.twPlan.planOf(u) === 'pro') { openPortal(); return; } } catch (e) {}
    startCheckout(kind);
  };

  /* ── coming back from Stripe ────────────────────────────────────── */
  var returned = '';
  try { returned = new URLSearchParams(location.search).get('checkout') || ''; } catch (e) {}
  function whenSignedIn(fn, tries) {
    tries = tries || 0;
    var u = user();
    if (isMember(u)) { fn(u); return; }
    if (tries < 40) setTimeout(function () { whenSignedIn(fn, tries + 1); }, 500);
  }
  function afterReturn() {
    if (returned === 'cancel') { whenSignedIn(function () { toast('Checkout canceled. You weren’t charged.', 'info', 5000); }); return; }
    if (returned !== 'success') return;
    whenSignedIn(function (u) {
      toast('Thanks! Your payment went through. Turning on Pro…', 'success', 5000);
      var tries = 0;
      (function poll() {
        call('status', {}, true).then(function (d) {
          if (d && d.ok && d.plan === 'pro') {
            var c = null;
            client().then(function (cl) { c = cl; return cl && cl.auth && cl.auth.refreshSession ? cl.auth.refreshSession() : null; }).catch(function () {}).then(function () {
              try { if (window._DB && _DB.save) _DB.save('plan', 'pro'); } catch (e) {}
              try { if (window.twPlan) window.twPlan.refresh(); } catch (e) {}
              manageFor = '';
              try { paint(); } catch (e) {}
              toast('⭐ You’re on TeenWork Pro. Thank you for supporting TeenWork!', 'success', 6000);
            });
            return;
          }
          if (++tries < 15) setTimeout(poll, 2500);
          else toast('Your payment is in. Pro can take a few minutes to turn on. Reload the page later to see it.', 'info', 8000);
        });
      })();
    });
  }

  /* ── pricing page, home page and sign-up picker copy ───────────── */
  function setHTML(id, html) { var el = $(id); if (el && el.innerHTML !== html) el.innerHTML = html; }
  function paint() {
    var paid = paidOn();
    var teenPrice = $('tw54-teen-pro-price');
    if (teenPrice) teenPrice.innerHTML = paid ? PRICE_TEXT.teen_pro + '<span style="font-size:.9rem;font-weight:600;color:var(--muted)">/mo</span>' : 'Free<span style="font-size:.9rem;font-weight:600;color:var(--muted)"> right now</span>';
    setHTML('tw54-teen-pro-note', paid ? 'Monthly. Cancel anytime from Manage billing.' : 'App is still in testing — Pro is free.');
    var testing = $('tw54-testing-box'); if (testing) testing.hidden = paid;
    var empPrice = $('tw54-emp-pro-price');
    if (empPrice) empPrice.innerHTML = PRICE_TEXT.employer_pro + '<span style="font-size:.9rem;font-weight:600;color:var(--muted)">/mo</span>';
    setHTML('tw54-emp-pro-note', paid ? 'Monthly. Cancel anytime.' : 'Free while TeenWork is in testing');
    var empBtn = $('tw54-emp-pro-btn');
    if (empBtn) empBtn.textContent = paid ? 'Upgrade to Employer Pro →' : 'Go Pro — free during testing →';
    var faq = $('tw54-faq-try');
    if (faq) faq.textContent = paid ? 'Pro costs ' + PRICE_TEXT.teen_pro + ' a month for teens and employers. Parent accounts are always free. You can cancel anytime from Manage billing, and you keep Pro until the end of the month you paid for.' : 'Yes — while TeenWork is in early access, all Pro features are available for free to teens and employers. You’ll get an email at least 10 days before any paid plan starts.';
    var pro = $('tw48-pro'), p = pro && pro.querySelector('p');
    if (p) {
      var want = paid ? '<strong>⭐ TeenWork Pro is ' + PRICE_TEXT.teen_pro + ' a month.</strong> Pro adds extras like the AI resume builder. Applying to jobs is always free and unlimited.'
        : '<strong>⭐ Pro is free during early access.</strong> Pro adds extras like the AI resume builder. Applying to jobs is always free and unlimited. No credit card needed.';
      if (p.innerHTML !== want) p.innerHTML = want;
    }
    var info = $('v24-pro-info'); if (info) info.hidden = paid;   // app-17's "free during launch" box on the sign-up form
    var su = $('su-plan-notice-paid');
    if (paid && su) { su.textContent = '⭐ Pro is ' + PRICE_TEXT.teen_pro + ' a month for teens and employers. Start free, then upgrade from the plans page once your account is set up.'; su.style.display = 'block'; }
    paintParents();
    paintManage();
  }

  /* ── parents: no Pro (Aya, 2026-11-09) ─────────────────────────── */
  var PARENT_NOTE = 'Parent accounts are always free.';
  function signupType() {
    var b = document.querySelector('.type-btn.selected');
    var m = b && /^type-(teen|parent|employer)$/.exec(b.id || '');
    return m ? m[1] : '';
  }
  function paintParents() {
    var u = user(), parentIn = !!(u && u.type === 'parent' && !u.isAdmin);
    // plans page: a signed-in parent sees no Upgrade buttons, just the note under "Teens & Parents"
    ['pricing-pro-btn', 'tw54-emp-pro-btn'].forEach(function (id) { var b = $(id); if (b) b.style.display = parentIn ? 'none' : ''; });
    var note = $('tw54-parent-free'); if (note) note.style.fontWeight = parentIn ? '700' : '';
    // sign-up: no plan choice for a parent account, and it is saved as Free
    var sec = $('su-plan-section'); if (!sec) return;
    var parentSu = signupType() === 'parent';
    sec.style.display = parentSu ? 'none' : '';
    var free = document.querySelector('input[name="su-plan"][value="free"]');
    if (parentSu && free && !free.checked) { free.checked = true; try { free.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} }
    var su = $('tw54-su-parent-free');
    if (parentSu && !su) {
      su = document.createElement('p'); su.id = 'tw54-su-parent-free'; su.className = 'tw54-terms-note';
      su.style.cssText = 'margin:1rem 0 0;font-size:.85rem';
      su.textContent = '👪 ' + PARENT_NOTE + ' There’s no Pro plan for parents.';
      sec.parentNode.insertBefore(su, sec.nextSibling);
    }
    if (su) su.style.display = parentSu ? 'block' : 'none';
  }
  (function wrapSelectType() {
    var o = window.selectType;
    if (typeof o !== 'function' || o.__tw54) { if (typeof o !== 'function') setTimeout(wrapSelectType, 300); return; }
    var w = function () { var r = o.apply(this, arguments); try { paintParents(); } catch (e) {} return r; };
    w.__tw54 = true; window.selectType = w;
  })();
  var manageFor = '';
  function paintManage() {
    var btn = $('pricing-pro-btn'); if (!btn) return;
    var holder = $('tw54-manage'), u = user();
    if (!paidOn() || !isMember(u) || u.type === 'parent') { if (holder) holder.hidden = true; return; }
    if (!holder) {
      holder = document.createElement('div'); holder.id = 'tw54-manage'; holder.hidden = true; holder.style.cssText = 'text-align:center;margin:1.4rem auto 0;max-width:520px';
      holder.innerHTML = '<p id="tw54-manage-text" style="font-size:.88rem;color:var(--muted);margin:0 0 .6rem"></p><button type="button" class="btn-secondary" id="tw54-manage-btn" style="min-height:44px;padding:0 20px">💳 Manage billing</button>';
      var grid = btn.closest('.pricing-grid');
      (grid && grid.parentNode ? grid.parentNode : btn.parentNode).insertBefore(holder, grid ? grid.nextSibling : null);
      holder.querySelector('#tw54-manage-btn').onclick = openPortal;
    }
    var k = String(u.dataKey || u.email) + '|' + Math.floor(Date.now() / 60000);   // ask again at most once a minute
    if (manageFor === k) return;
    manageFor = k;
    call('status', {}, true).then(function (d) {
      // "none" means checkout was opened but never paid: nothing to manage yet
      if (!d || !d.ok || !d.has_billing || !d.status || d.status === 'none') { holder.hidden = true; return; }
      var t = $('tw54-manage-text');
      if (t) {
        var end = d.current_period_end ? new Date(d.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
        t.textContent = d.plan === 'pro' ? ('⭐ You’re on Pro' + (end ? (d.cancel_at_period_end ? ' until ' + end + ' (canceled).' : '. Next payment: ' + end + '.') : '.')) : 'Your Pro subscription has ended.';
      }
      holder.hidden = false;
    });
  }
  (function wrapGoto() {
    var o = window.gotoPage;
    if (typeof o !== 'function' || o.__tw54) return;
    var w = function (page) { var r = o.apply(this, arguments); if (page === 'pricing' || page === 'landing' || page === 'signup') setTimeout(paint, 60); return r; };
    w.__tw54 = true;
    Object.keys(o).forEach(function (k) { try { w[k] = o[k]; } catch (e) {} });
    if (o.__twPlan) w.__twPlan = true;
    window.gotoPage = w;
  })();

  /* ── admin: System Health line + Paid Launch check ─────────────── */
  function healthNote(d) {
    if (d.code === 'not_deployed') return { status: 'warn', note: 'billing function not deployed yet' };
    if (!d.ok) return { status: 'warn', note: 'billing function unreachable (' + (d.code || 'offline') + ')' };
    if (!d.configured) return { status: 'warn', note: 'Stripe keys not added yet · Pro stays free/manual' };
    var miss = [];
    if (!d.prices.teen_pro) miss.push('Teen Pro price'); if (!d.prices.employer_pro) miss.push('Employer Pro price'); if (!d.webhook) miss.push('webhook secret');
    if (miss.length) return { status: 'warn', note: 'Stripe ' + d.mode + ' mode · missing: ' + miss.join(', ') };
    return { status: d.mode === 'live' ? 'ok' : 'warn', note: d.mode === 'live' ? 'Stripe ready (live mode)' : 'Stripe ready in TEST mode (no real charges)' };
  }
  var oHealth = window.adminRunHealthCheck;
  window.adminRunHealthCheck = async function () {
    var r = oHealth ? await oHealth.apply(this, arguments) : undefined;
    try {
      var el = $('adm-health-list'); if (!el) return r;
      var old = el.querySelector('[data-tw54-pay]'); if (old) old.remove();
      var row = document.createElement('div'); row.className = 'adm-health-item'; row.setAttribute('data-tw54-pay', '1');
      row.innerHTML = '<div class="adm-health-status warn"></div><div class="adm-health-label">Payments (Stripe)</div><div class="adm-health-note">Checking…</div>';
      el.appendChild(row);
      var h = healthNote(await ping(true));
      row.querySelector('.adm-health-status').className = 'adm-health-status ' + h.status;
      row.querySelector('.adm-health-note').textContent = h.note;
    } catch (e) {}
    return r;
  };
  // Wrapped after plan-limits-v40 has wrapped it (on page load), so its copy to the shared settings row
  // still runs after the switch really changed.
  function wrapSetPaid() {
    var oSetPaid = window.adminSetPaid;
    if (typeof oSetPaid !== 'function' || oSetPaid.__tw54) return;
    var w = async function (val) {
      if (!val) return oSetPaid.apply(this, arguments);
      var d = await ping(true), h = healthNote(d);
      var msg = h.status === 'ok'
        ? 'Turn on paid plans? People will pay through Stripe (live mode).\n\nThe pricing page promises an email at least 10 days before paid plans start. Have you sent it?'
        : 'Stripe isn’t ready: ' + h.note + '.\n\nIf you turn on paid plans now, people who pick Pro are asked to message support instead of paying. Turn it on anyway?';
      if (!window.confirm(msg)) return;
      var realConfirm = window.confirm;
      window.confirm = function () { return true; };   // the older switch asks again; one question is enough
      try { return oSetPaid.apply(this, arguments); } finally { window.confirm = realConfirm; setTimeout(paint, 100); }
    };
    Object.keys(oSetPaid).forEach(function (k) { try { w[k] = oSetPaid[k]; } catch (e) {} });
    w.__tw54 = true;
    window.adminSetPaid = w;
  }

  /* ── start ──────────────────────────────────────────────────────── */
  function start() {
    setTimeout(wrapSetPaid, 50); setTimeout(wrapSetPaid, 1700);
    paint();
    afterReturn();
    // the shared plan settings (and so Paid Launch) arrive from the cloud a moment after load
    setTimeout(paint, 1500); setTimeout(paint, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
