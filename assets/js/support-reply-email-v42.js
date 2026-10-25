
/* ══════════════════════════════════════════════════════════════════════
   SUPPORT FORMS ASK FOR AN EMAIL  (2026-10-15, "Welcome email" thread)
   Aya: "ask for email before sending so they can get admin's response".
   Every Help & Support form (the Contact Support modal, the floating
   Support button's form and the backup form) gets a required "Your email"
   box, pre-filled with the signed-in account's email. Send is blocked
   until it looks like an email. The address is stored with the message
   in the admin inbox and used as Reply-To on the support email, so the
   admin can just press Reply.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twSupportReplyEmail) return;
  window.__twSupportReplyEmail = true;

  var LS_KEY = 'tw_support_reply_email';
  var EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/;
  var SEND_BUTTONS = '#support-modal-overlay button[onclick*="sendSupportEmail"], #tw-sup-fallback #tw-sup-send, #tw-sup-fallback #tw-ss';
  var pending = null;   // { email, at } set by a valid Send click, used by the next inbox save

  function user() { try { return window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null); } catch (e) { return window.currentUser || null; } }
  function valid(e) { return EMAIL_RE.test(String(e || '').trim()); }
  function defaultEmail() {
    var u = user();
    if (u && valid(u.email)) return String(u.email).trim();
    try { var last = localStorage.getItem(LS_KEY); if (valid(last)) return last; } catch (e) {}
    return '';
  }

  function fieldHtml() {
    return '<label for="tw-sup-reply-email" style="font-size:.78rem;font-weight:700;color:#4b5563;display:block;margin-bottom:4px">' +
        'Your email <span style="color:#c0392b">*</span> <span style="font-weight:400;color:#6b7280">so we can reply to you</span></label>' +
      '<input id="tw-sup-reply-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" ' +
        'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e2ddd4;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-size:.9rem;outline:none;background:#fff;color:#1c1c1c">' +
      '<div id="tw-sup-reply-err" style="display:none;font-size:.74rem;color:#c0392b;font-weight:600;margin-top:4px">Please enter your email so the TeenWork team can reply.</div>';
  }

  function addField(ov) {
    if (!ov || ov.querySelector('#tw-sup-reply-email')) return;
    var box = document.createElement('div');
    box.id = 'tw-sup-reply-box';
    box.style.cssText = 'margin-bottom:1rem';
    box.innerHTML = fieldHtml();
    var nameInp = ov.querySelector('#support-name, #tw-sup-name');
    var ta = ov.querySelector('#tw-sm');
    if (nameInp && nameInp.parentNode && nameInp.parentNode !== ov) {
      nameInp.parentNode.parentNode.insertBefore(box, nameInp.parentNode.nextSibling);
    } else if (ta && ta.parentNode) {
      ta.parentNode.insertBefore(box, ta);
    } else {
      var send = ov.querySelector('#tw-sup-send, #tw-ss, button[onclick*="sendSupportEmail"]');
      if (!send) return;
      var row = send.parentNode;
      row.parentNode.insertBefore(box, row);
    }
    var inp = box.querySelector('#tw-sup-reply-email');
    inp.value = defaultEmail();
    inp.addEventListener('focus', function () { this.style.borderColor = '#2d6a4f'; });
    inp.addEventListener('blur', function () { this.style.borderColor = valid(this.value) || !this.value ? '#e2ddd4' : '#c0392b'; });
    inp.addEventListener('input', function () { var err = box.querySelector('#tw-sup-reply-err'); if (err) err.style.display = 'none'; this.style.borderColor = '#2d6a4f'; });
  }

  function scan() {
    ['support-modal-overlay', 'tw-sup-fallback'].forEach(function (id) { var el = document.getElementById(id); if (el) addField(el); });
  }

  // Forms are appended to <body> when opened; add the box as soon as one appears.
  try {
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var added = list[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1 && (n.id === 'support-modal-overlay' || n.id === 'tw-sup-fallback')) addField(n);
        }
      }
    }).observe(document.body, { childList: true });
  } catch (e) {}
  scan();

  // Check the email before any Send button's own handler runs (capture phase).
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest(SEND_BUTTONS) : null;
    if (!btn) return;
    var ov = btn.closest('#support-modal-overlay, #tw-sup-fallback');
    addField(ov);
    var inp = ov && ov.querySelector('#tw-sup-reply-email');
    var email = inp ? String(inp.value || '').trim() : '';
    if (!valid(email)) {
      e.preventDefault(); e.stopImmediatePropagation();
      var err = ov && ov.querySelector('#tw-sup-reply-err');
      if (err) { err.textContent = email ? 'That doesn’t look like an email address. Please check it.' : 'Please enter your email so the TeenWork team can reply.'; err.style.display = 'block'; }
      if (inp) { inp.style.borderColor = '#c0392b'; inp.focus(); }
      return;
    }
    pending = { email: email, at: Date.now() };
    // Remember it for next time only when nobody is signed in (signed-in users get their account email).
    var u = user();
    if (!(u && valid(u.email))) { try { localStorage.setItem(LS_KEY, email); } catch (er) {} }
  }, true);

  // Put the typed email on the message the form saves (inbox + support email Reply-To).
  function wrapSave() {
    var orig = window._adminSaveSupportMessage;
    if (typeof orig !== 'function' || orig._twReplyEmail) return;
    var wrapped = function (msg) {
      if (pending && Date.now() - pending.at < 4000 && msg && typeof msg === 'object') {
        var email = pending.email;
        pending = null;
        msg = Object.assign({}, msg, { email: email });
        var name = msg.name || 'Anonymous';
        var type = msg.userType && msg.userType !== 'visitor' ? ' · ' + msg.userType : '';
        msg.senderDisplay = name + ' <' + email + '>' + type;
        return orig.call(this, msg);
      }
      return orig.apply(this, arguments);
    };
    wrapped._twReplyEmail = true;
    wrapped._twEmailsSupport = orig._twEmailsSupport;
    window._adminSaveSupportMessage = wrapped;
  }
  wrapSave();
  setTimeout(wrapSave, 0);
})();
