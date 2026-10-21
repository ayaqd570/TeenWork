
/* ═══════════════════════════════════════════════════════
   v35 — Teen ↔ parent linking
   • Teens can skip the parent step and open the app in LIMITED mode
   • Limited mode: look around, but applying / messaging / logging work is locked
   • Teens can link a parent any time from Profile (email request or personal code)
   • Parents approve requests on their dashboard, or enter the teen's code
   Links are stored on this device/browser (same place accounts are stored).
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var LS_LINKS = 'tw_parent_links', LS_REQ = 'tw_link_requests', LS_CODES = 'tw_teen_codes';

  function read(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function me() { try { return (typeof currentUser !== 'undefined' && currentUser) || window.currentUser || null; } catch (e) { return null; } }
  function em(u) { return String((u && u.email) || '').toLowerCase(); }
  function isTeen() { var u = me(); return !!u && u.type === 'teen'; }
  function isDemoTeen() { return em(me()) === 'teen@teenwork.demo'; }
  function toast(m, t) { if (typeof showToast === 'function') showToast(m, t || 'success'); }
  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

  function linkOf(email) { return read(LS_LINKS, {})[String(email || '').toLowerCase()] || null; }
  function setLink(email, data) { var m = read(LS_LINKS, {}); m[String(email).toLowerCase()] = data; write(LS_LINKS, m); }

  function teenStatus() {            // approved | pending | skipped | declined | none
    if (!isTeen() || isDemoTeen()) return 'approved';
    var l = linkOf(em(me())) || me().parentLinked || null;
    return (l && l.status) || 'none';
  }
  function isLimited() { return isTeen() && teenStatus() !== 'approved' && !(window._twIsTesterUser && window._twIsTesterUser(me())); }   // v44: tester accounts are never limited
  function linkInfo() { return linkOf(em(me())) || me().parentLinked || {}; }

  function teenCodeFor(email) {
    email = String(email).toLowerCase();
    var m = read(LS_CODES, {});
    if (!m[email]) {
      var used = {}; Object.keys(m).forEach(function (k) { used[m[k]] = 1; });
      var c; do { c = 'TEEN-' + (1000 + Math.floor(Math.random() * 9000)); } while (used[c]);
      m[email] = c; write(LS_CODES, m);
    }
    return m[email];
  }
  function ageFrom(dob) {
    if (!dob) return 0; var b = new Date(/^\d{4}-\d\d-\d\d$/.test(dob) ? dob + 'T00:00' : dob), t = new Date(); if (isNaN(b)) return 0;
    var a = t.getFullYear() - b.getFullYear();
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
    return a;
  }

  /* ── styles ─────────────────────────────────────────── */
  function injectStyle() {
    if (document.getElementById('tw35-style')) return;
    var st = document.createElement('style'); st.id = 'tw35-style';
    st.textContent =
      '.tw35-banner{display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:#fff7e6;border:1.5px solid #f5c26b;color:#7a4a00;border-radius:12px;padding:10px 14px;margin:0 0 14px;font-size:.88rem;line-height:1.45}' +
      '.tw35-banner b{color:#5c3600}.tw35-banner button{margin-left:auto}' +
      '.tw35-btn{font-family:inherit;font-weight:700;font-size:.88rem;border-radius:10px;padding:10px 16px;min-height:42px;cursor:pointer;border:1.5px solid var(--green,#2d6a4f);background:transparent;color:var(--green,#2d6a4f)}' +
      '.tw35-btn.pri{background:var(--green,#2d6a4f);color:#fff}' +
      '.tw35-btn.full{width:100%;margin-top:8px}' +
      '.tw35-card{background:var(--card,#fff);border:1.5px solid var(--border,#e5e7eb);border-radius:14px;padding:16px;margin-bottom:16px}' +
      '.tw35-card h3{margin:0 0 8px;font-size:1rem;color:var(--green,#2d6a4f)}' +
      '.tw35-card p,.tw35-body p{font-size:.88rem;line-height:1.55;color:var(--muted,#6b7280);margin:0 0 10px}' +
      '.tw35-code{display:flex;align-items:center;gap:10px;background:var(--bg,#f4f1ea);border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:8px 12px;margin:0 0 10px;font-size:.8rem;color:var(--muted,#6b7280)}' +
      '.tw35-code b{font-family:monospace;font-size:1.05rem;letter-spacing:2px;color:var(--text,#1c1c1c)}' +
      '.tw35-code button{margin-left:auto;font-family:inherit;font-size:.78rem;font-weight:700;background:none;border:1.5px solid var(--border,#d1d5db);border-radius:8px;padding:5px 10px;cursor:pointer;color:inherit}' +
      '.tw35-input{width:100%;box-sizing:border-box;padding:11px 13px;border:1.5px solid var(--border,#d1d5db);border-radius:10px;font:inherit;font-size:.95rem;outline:none;background:var(--card,#fff);color:var(--text,#1c1c1c)}' +
      '.tw35-input:focus{border-color:var(--green,#2d6a4f)}' +
      '.tw35-msg{min-height:1.2em;font-size:.8rem;margin:6px 0 2px}' +
      '.tw35-ok{background:#dcfce7;color:#14532d;border-radius:10px;padding:10px 12px;font-size:.88rem;line-height:1.5}' +
      '.tw35-wait{background:#fff7e6;color:#7a4a00;border-radius:10px;padding:10px 12px;font-size:.88rem;margin-bottom:10px;line-height:1.5}' +
      '.tw35-warn{background:#fee2e2;color:#7f1d1d;border-radius:10px;padding:10px 12px;font-size:.88rem;margin-bottom:10px}' +
      '.tw35-sep{font-size:.8rem;color:var(--muted,#6b7280);margin:12px 0 6px}' +
      '#tw35-modal{position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px;font-family:"DM Sans",sans-serif}' +
      '#tw35-modal .sheet{background:var(--card,#fff);color:var(--text,#1c1c1c);width:100%;max-width:440px;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow-y:auto;border-radius:18px;padding:20px 18px;box-shadow:0 12px 48px rgba(0,0,0,.3);position:relative}' +
      '#tw35-modal h2{margin:0 28px 6px 0;font-family:"Fraunces",Georgia,serif;font-size:1.2rem;color:var(--green,#2d6a4f)}' +
      '#tw35-modal .x{position:absolute;top:10px;right:12px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--muted,#6b7280);padding:6px}' +
      '.tw35-req{display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:#eef7f0;border:1.5px solid var(--green,#2d6a4f);border-radius:12px;padding:12px 14px;margin:0 0 12px;font-size:.9rem}' +
      '.tw35-req .t{flex:1 1 220px;line-height:1.45}' +
      '#parent-lock-overlay .tw35-body{text-align:left}';
    document.head.appendChild(st);
  }

  /* ── the link panel (used on the lock screen, Profile tab and pop-up) ── */
  function panelHTML(sfx) {
    var u = me(), st = teenStatus(), l = linkInfo(), code = teenCodeFor(em(u)), h = '';
    var codeBox = '<div class="tw35-code"><span>Your link code</span><b>' + esc(code) + '</b><button type="button" onclick="twCopyCode()">Copy</button></div>';
    if (st === 'approved') {
      return '<div class="tw35-ok">✅ Parent linked' + (l.parentName ? ': <b>' + esc(l.parentName) + '</b>' : '') +
             (l.parentEmail ? ' (' + esc(l.parentEmail) + ')' : '') + '. Everything is unlocked.</div>';
    }
    if (st === 'pending') {
      h += '<div class="tw35-wait">⏳ Waiting for <b>' + esc(l.parentEmail || 'your parent') + '</b> to approve.</div>' +
           '<p>Your parent signs in to their TeenWork parent account and taps <b>Approve</b>, or enters your code under <b>Link another teen</b>.</p>' + codeBox +
           '<button type="button" class="tw35-btn pri full" style="margin-top:0" onclick="twCheckApproval()">🔄 Check if my parent approved</button>' +
           '<div class="tw35-sep">Wrong email? Send it to a different one:</div>';
    } else {
      if (st === 'declined') h += '<div class="tw35-warn">Your parent declined that request. You can send a new one.</div>';
      h += '<p>A linked parent or guardian unlocks applying for jobs, messaging employers and logging work. Send them a request, or give them your code.</p>' + codeBox;
    }
    h += '<input type="email" class="tw35-input" id="tw35-email-' + sfx + '" placeholder="Parent\'s email address" autocomplete="email" onkeydown="if(event.key===\'Enter\')twSendLink(\'' + sfx + '\')">' +
         '<div class="tw35-msg" id="tw35-msg-' + sfx + '"></div>' +
         '<button type="button" class="tw35-btn pri full" style="margin-top:0" onclick="twSendLink(\'' + sfx + '\')">📨 ' + (st === 'pending' ? 'Send to this email' : 'Send link request') + '</button>';
    return h;
  }

  window.twCopyCode = function () {
    var c = teenCodeFor(em(me()));
    try { navigator.clipboard.writeText(c).then(function () { toast('Code copied: ' + c, 'success'); }, function () { toast('Your code is ' + c, 'info'); }); }
    catch (e) { toast('Your code is ' + c, 'info'); }
  };

  window.twSendLink = function (sfx) {
    var inp = document.getElementById('tw35-email-' + sfx), msg = document.getElementById('tw35-msg-' + sfx);
    var pe = (inp && inp.value || '').trim().toLowerCase();
    function say(t, bad) { if (msg) { msg.style.color = bad ? 'var(--red,#b91c1c)' : 'var(--green,#2d6a4f)'; msg.textContent = t; } }
    if (!validEmail(pe)) { say('⚠️ Please enter a valid parent email address.', true); return; }
    if (pe === em(me())) { say("⚠️ That's your own email. Enter your parent's email.", true); return; }
    var reqs = read(LS_REQ, []).filter(function (r) { return !(r.teenEmail === em(me()) && r.status === 'pending'); });
    reqs.push({ teenEmail: em(me()), teenName: me().name || em(me()), parentEmail: pe, code: teenCodeFor(em(me())), status: 'pending', at: Date.now() });
    write(LS_REQ, reqs);
    var data = { status: 'pending', parentEmail: pe, requestedAt: new Date().toISOString() };
    setLink(em(me()), data); me().parentLinked = data;
    toast('Request saved for ' + pe + '. Ask them to approve it.', 'success');
    refreshUI(true);
  };

  window.twCheckApproval = function () {
    var before = teenStatus();
    var l = linkOf(em(me()));
    if (l && l.status === 'approved') { me().parentLinked = l; refreshUI(true); toast('🎉 Parent linked! Everything is unlocked.', 'success'); }
    else if (l && l.status === 'declined') { me().parentLinked = l; refreshUI(true); }
    else toast('Not approved yet. Your parent needs to approve it first.', 'info');
  };

  /* ── limited mode: banner, profile card, pop-up, gates ───────── */
  function bannerHTML() {
    var st = teenStatus();
    return '<span>🔒 <b>Limited mode.</b> ' + (st === 'pending' ? 'Waiting for your parent to approve. ' : 'Link a parent to unlock ') +
           (st === 'pending' ? '' : 'applying for jobs, messaging employers and logging work. ') +
           'You can still look around, take lessons and build your profile.</span>' +
           '<button type="button" class="tw35-btn pri" onclick="twOpenLinkModal()">' + (st === 'pending' ? 'See status' : '🔗 Link a parent') + '</button>';
  }

  function openModal(title, sub) {
    injectStyle();
    var m = document.getElementById('tw35-modal'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'tw35-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="sheet"><button class="x" type="button" aria-label="Close" onclick="twCloseLinkModal()">✕</button>' +
      '<h2>' + esc(title) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '<div class="tw35-body" id="tw35-modal-body">' + panelHTML('m') + '</div></div>';
    m.addEventListener('mousedown', function (e) { if (e.target === m) window.twCloseLinkModal(); });
    document.body.appendChild(m);
    var inp = document.getElementById('tw35-email-m'); if (inp) setTimeout(function () { try { inp.focus(); } catch (e) {} }, 50);
  }
  window.twOpenLinkModal = function () { openModal('🔗 Link a parent', ''); };
  window.twCloseLinkModal = function () { var m = document.getElementById('tw35-modal'); if (m) m.remove(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') window.twCloseLinkModal(); }, true);

  function gate() {
    if (document.getElementById('tw35-modal')) return;
    openModal('🔒 Link a parent to use this', 'You are in limited mode, so this is locked for now.');
  }

  var GATED = ['teenApply', 'applyToJob', 'sendMsg', 'openMsgChat', 'openMsgModal', 'openAddShiftModal', 'openAddWorkLogModal', 'addEarningsEntry', 'saveShift', 'addSelectedShifts'];
  var GATE_RE = new RegExp('(^|[^A-Za-z0-9_$])(' + GATED.join('|') + ')\\s*\\(');
  function wrapGates() {
    GATED.forEach(function (n) {
      var o = window[n];
      if (typeof o !== 'function' || o.__tw35) return;
      var w = function () { if (isLimited()) { gate(); return; } return o.apply(this, arguments); };
      w.__tw35 = true; window[n] = w;
    });
  }
  // second layer: block clicks on any button wired to a gated action
  document.addEventListener('click', function (e) {
    if (!isLimited()) return;
    var t = e.target && e.target.closest ? e.target.closest('[onclick]') : null;
    if (!t || t.closest('#tw35-modal') || t.closest('#parent-lock-overlay')) return;
    if (GATE_RE.test(t.getAttribute('onclick') || '')) { e.preventDefault(); e.stopImmediatePropagation(); gate(); }
  }, true);

  var lastSig = null;
  function sig() { return isTeen() ? (teenStatus() + '|' + (linkInfo().parentEmail || '')) : 'x'; }

  function ensureBanner() {
    var host = document.querySelector('#page-teen .dashboard'), b = document.getElementById('tw35-banner');
    if (!isTeen() || !isLimited() || !host) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div'); b.id = 'tw35-banner'; b.className = 'tw35-banner';
      var hdr = host.querySelector('.dash-header');
      if (hdr && hdr.nextSibling) host.insertBefore(b, hdr.nextSibling); else host.appendChild(b);
    }
    b.innerHTML = bannerHTML();
  }
  function ensureCard() {
    var panel = document.getElementById('ttab-resume'), c = document.getElementById('tw-link-card');
    if (!isTeen() || !panel) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('div'); c.id = 'tw-link-card'; c.className = 'tw35-card'; panel.insertBefore(c, panel.firstChild); }
    c.innerHTML = '<h3>👪 Parent link</h3>' + panelHTML('c');
  }
  function refreshUI(force) {
    injectStyle();
    var s = sig();
    if (force || s !== lastSig) {
      var was = lastSig; lastSig = s;
      document.body.classList.toggle('tw-limited', isLimited());
      ensureBanner(); ensureCard();
      var mb = document.getElementById('tw35-modal-body'); if (mb) mb.innerHTML = panelHTML('m');
      var lb = document.getElementById('tw35-lock-body'); if (lb) lb.innerHTML = panelHTML('lock');
      if (!force && was && was.indexOf('approved') !== 0 && s.indexOf('approved') === 0 && isTeen()) toast('🎉 Your parent approved your account! Everything is unlocked.', 'success');
    } else { ensureBanner(); }
  }

  /* ── lock screen (first time a teen signs in) ─────────────────── */
  window.showParentLockScreen = function () {
    injectStyle();
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    var old = document.getElementById('parent-lock-overlay'); if (old) old.remove();
    var o = document.createElement('div'); o.id = 'parent-lock-overlay';
    o.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto;';
    o.innerHTML =
      '<div id="parent-link-card" style="background:var(--card);border-radius:24px;box-shadow:var(--shadow-lg);border:1px solid var(--border);max-width:440px;width:100%;padding:1.8rem 1.5rem;margin:auto">' +
      '<div style="font-size:2.4rem;text-align:center">👪</div>' +
      '<h2 style="font-family:Fraunces,serif;font-size:1.5rem;color:var(--green);margin:.3rem 0 .5rem;text-align:center">Link a parent</h2>' +
      '<p style="color:var(--muted);font-size:.88rem;line-height:1.55;margin:0 0 1rem;text-align:center">You can skip this for now and look around in limited mode.</p>' +
      '<div class="tw35-body" id="tw35-lock-body">' + panelHTML('lock') + '</div>' +
      '<button type="button" class="tw35-btn full" onclick="twSkipLink()">Skip for now — open my account (limited)</button>' +
      '<button type="button" class="tw35-btn full" style="border-color:var(--border);color:var(--muted);font-weight:600" onclick="signOut()">↩ Sign out</button>' +
      '</div>';
    document.body.appendChild(o);
    lastSig = null;
  };
  window.twSkipLink = function () {
    var st = teenStatus();
    if (st === 'none' || st === 'declined') {
      var d = { status: 'skipped', skippedAt: new Date().toISOString() };
      setLink(em(me()), d); me().parentLinked = d;
    }
    var o = document.getElementById('parent-lock-overlay'); if (o) o.remove();
    toast('Limited mode: you can look around. Link a parent any time from Profile to unlock everything.', 'info');
    launchDashboard();
  };
  // older code paths that still call these
  window.submitParentLinkRequest = function () { window.twSendLink('lock'); };
  window.checkParentLinkApproval = function () {
    var l = linkOf(em(me()));
    if (l && l.status === 'approved') {
      me().parentLinked = l;
      var o = document.getElementById('parent-lock-overlay'); if (o) o.remove();
      toast('🎉 Parent linked! Welcome to TeenWork!', 'success'); launchDashboard();
    } else toast('Not approved yet. Your parent needs to approve it first.', 'info');
  };

  /* ── parent side ───────────────────────────────────────────────── */
  function addLinkedTeen(email, acct) {
    acct = acct || {};
    if (typeof linkedTeens === 'undefined') return;
    if (linkedTeens.some(function (t) { return t.email === email; })) return;
    linkedTeens.push({ name: acct.name || email, age: ageFrom(acct.dob) || 15, city: (acct.city ? acct.city + (acct.state ? ', ' + acct.state : '') : (acct.state || '—')),
      inviteCode: teenCodeFor(email), status: 'active', jobs: 0, rating: 0, avatar: '🧑', email: email });
    try { if (typeof saveLinkedTeens === 'function') saveLinkedTeens(); if (typeof renderMultiTeens === 'function') renderMultiTeens(); } catch (e) {}
  }
  function approveTeen(email) {
    var acct = read('tw_local_accounts', {})[email] || {};
    setLink(email, { status: 'approved', parentEmail: em(me()), parentName: me().name || '', approvedAt: new Date().toISOString() });
    var reqs = read(LS_REQ, []); reqs.forEach(function (r) { if (r.teenEmail === email && r.status === 'pending') r.status = 'approved'; }); write(LS_REQ, reqs);
    addLinkedTeen(email, acct);
    return acct;
  }
  window.twApproveLink = function (teenEmail) {
    var e = String(teenEmail).toLowerCase(), a = approveTeen(e);
    toast('✅ Linked to ' + (a.name || e) + '. They now have full access.', 'success'); renderRequests();
  };
  window.twDeclineLink = function (teenEmail) {
    var e = String(teenEmail).toLowerCase();
    setLink(e, { status: 'declined', parentEmail: em(me()), declinedAt: new Date().toISOString() });
    var reqs = read(LS_REQ, []); reqs.forEach(function (r) { if (r.teenEmail === e && r.status === 'pending') r.status = 'declined'; }); write(LS_REQ, reqs);
    toast('Request declined.', 'info'); renderRequests();
  };
  function renderRequests() {
    if (!me() || me().type !== 'parent') return;
    var host = document.querySelector('#page-parent .dashboard'); if (!host) return;
    var box = document.getElementById('tw35-requests'), mine = em(me());
    var list = read(LS_REQ, []).filter(function (r) { return r.status === 'pending' && r.parentEmail === mine; });
    if (!list.length) { if (box) box.remove(); return; }
    injectStyle();
    if (!box) {
      box = document.createElement('div'); box.id = 'tw35-requests';
      var hdr = host.querySelector('.dash-header');
      if (hdr && hdr.nextSibling) host.insertBefore(box, hdr.nextSibling); else host.appendChild(box);
    }
    box.innerHTML = list.map(function (r) {
      var k = encodeURIComponent(r.teenEmail);
      return '<div class="tw35-req"><div class="t">👋 <b>' + esc(r.teenName) + '</b> (' + esc(r.teenEmail) + ') asked to link to your account. Approving gives them access to apply for jobs, message employers and log work, with you overseeing it.</div>' +
        '<button type="button" class="tw35-btn pri" onclick="twApproveLink(decodeURIComponent(\'' + k + '\'))">✅ Approve</button>' +
        '<button type="button" class="tw35-btn" onclick="twDeclineLink(decodeURIComponent(\'' + k + '\'))">Decline</button></div>';
    }).join('');
  }
  function linkByCode(code, silent) {
    code = String(code || '').trim().toUpperCase();
    var codes = read(LS_CODES, {}), email = null;
    Object.keys(codes).forEach(function (k) { if (codes[k] === code) email = k; });
    if (!email) return false;
    var acct = approveTeen(email);
    if (!silent) toast('✅ Linked to ' + (acct.name || email) + '! They now have full access.', 'success');
    return true;
  }
  var _origLinkAnother = window.linkAnotherTeen;
  window.linkAnotherTeen = function () {
    var inp = document.getElementById('mt-invite'), code = inp ? inp.value.trim().toUpperCase() : '';
    if (code && linkByCode(code, false)) { if (inp) inp.value = ''; renderRequests(); return; }
    if (typeof _origLinkAnother === 'function') return _origLinkAnother.apply(this, arguments);
  };
  document.addEventListener('click', function (e) {          // remember the invite code typed while signing up as a parent
    if (e.target && e.target.closest && e.target.closest('#signup-btn')) { var i = document.getElementById('su-invite'); window.__twInvite = i ? i.value : ''; }
  }, true);

  /* ── wiring ─────────────────────────────────────────────────────── */
  function afterLaunch() {
    wrapGates(); refreshUI(true); renderRequests();
    if (me() && me().type === 'parent' && window.__twInvite) { var c = window.__twInvite; window.__twInvite = ''; if (linkByCode(c, false)) renderRequests(); }
  }
  var _ld = window.launchDashboard;
  if (typeof _ld === 'function') {
    window.launchDashboard = function () {
      var r = _ld.apply(this, arguments);
      setTimeout(afterLaunch, 60); setTimeout(afterLaunch, 700);
      return r;
    };
  }
  wrapGates(); setTimeout(wrapGates, 1500);
  window.addEventListener('storage', function (e) { if (e.key === LS_LINKS || e.key === LS_REQ) { refreshUI(false); renderRequests(); } });
  setInterval(function () { if (isTeen()) refreshUI(false); else if (me() && me().type === 'parent') renderRequests(); }, 1500);
})();

