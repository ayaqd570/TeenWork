
/* ══════════════════════════════════════════════════════════════════════
   MESSAGE SAFETY CHECK  (2026-10-16, "Message safety filter" thread, Aya's request)
   Before a chat message goes to another person, the Supabase Edge Function
   `check-message` checks it in two layers:
     1. a fast phrase filter for taking work, pay, hours or contact off
        TeenWork ("off the app", "pay cash", "text my cell", "dont log",
        "add to calendar", phone numbers, emails …)
     2. OpenAI's free Moderation check: hate, harassment, self-harm and
        sexual content are blocked.
   A blocked message is never shown as sent and never saved to Supabase.
   This replaces the "AI moderation" step sendMsg already had: it called
   aiCheckMessage(), which was never defined, so only the old word list ran.

   • If check-message can't be reached (not deployed yet, offline, the file
     preview inside the Claude app), the message goes through after the old
     word list, exactly as before.
   • Uses the shared pre-send runner (window.twPreSendChecks), which the
     Gemini safety block uses too: checks run in `order`, the first block wins.
   • Fixes the old word list (scanMessage): it matched words inside other
     words, so "Thanks for the work" or "Have a good night" never sent.
   • Admin → 🩺 System Health gets a "Message safety check" line.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twMessageSafety) return;
  window.__twMessageSafety = true;

  /* ── Shared pre-send check runner. The same code is in gemini-safety; whichever block loads first installs it. ── */
  window.twPreSendChecks = window.twPreSendChecks || [];
  if (!window.__twPreSendRunner) {
    window.__twPreSendRunner = true;
    var prevSend = window.sendMsg;
    var busy = {};
    window.sendMsg = async function (contactId) {
      var self = this, args = arguments;
      var input = document.getElementById('msg-input-' + contactId);
      var text = input ? String(input.value || '').trim() : '';
      var checks = (window.twPreSendChecks || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      if (!text || !checks.length) return prevSend ? prevSend.apply(self, args) : undefined;
      if (busy[contactId]) return;                       // Enter pressed again while a check is running
      busy[contactId] = true;
      var contact = null;
      try { contact = (typeof msgAllContacts !== 'undefined' && msgAllContacts) ? msgAllContacts.find(function (c) { return c.id === contactId; }) : null; } catch (e) {}
      var history = ((contact && contact.messages) || []).filter(function (m) { return m && !m.blocked; }).slice(-10)
        .map(function (m) { return { from: m.from, text: String(m.text || '') }; });
      var u = window.currentUser || {};
      var ctx = { contactId: contactId, contact: contact, text: text, history: history, me: { type: u.type, name: u.name } };
      var btn = input ? input.nextElementSibling : null, btnText = btn ? btn.textContent : '';
      if (input) input.readOnly = true;
      if (btn) { btn.disabled = true; btn.textContent = '🔍…'; }
      var blocked = null;
      try {
        for (var i = 0; i < checks.length && !blocked; i++) {
          try { var r = await checks[i].run(ctx); if (r && r.blocked) blocked = r; }
          catch (e) { console.warn('Pre-send check failed (message allowed):', checks[i].id, e); }
        }
      } finally {
        if (input) input.readOnly = false;
        if (btn) { btn.disabled = false; btn.textContent = btnText; }
        busy[contactId] = false;
      }
      if (blocked) { if (typeof _blockMsg === 'function') _blockMsg(contactId, blocked, input); return; }
      return prevSend ? prevSend.apply(self, args) : undefined;
    };
  }

  /* ── The check-message call ── */
  var TIMEOUT_MS = 5000;
  var state = { off: false, offReason: '', last: null };
  function fnUrl() { return (typeof SUPABASE_URL !== 'undefined' && /^https:/.test(SUPABASE_URL)) ? SUPABASE_URL.replace(/\/+$/, '') + '/functions/v1/check-message' : ''; }
  function sbKey() { return typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY' ? SUPABASE_KEY : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function callFn(body) {
    var url = fnUrl(), key = sbKey();
    if (!url || !key) return Promise.resolve(null);
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(body),
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      if (res.status === 404) { state.off = true; state.offReason = 'check-message is not deployed'; return null; }
      return res.json().catch(function () { return null; });
    }, function () { return null; })
      .then(function (d) { if (timer) clearTimeout(timer); return d; });
  }

  /* Resolves to the function's verdict { allowed, layer, reason, rule, categories, title, message, moderation }, or null when it can't be reached. */
  window.twCheckMessage = function (text) {
    if (state.off) return Promise.resolve(null);
    return callFn({ text: String(text || '') }).then(function (d) {
      if (!d || typeof d.allowed !== 'boolean') return null;
      state.last = { at: new Date().toISOString(), allowed: d.allowed, layer: d.layer || '', moderation: d.moderation || '' };
      return d;
    });
  };

  window.twPreSendChecks.push({
    id: 'message-safety', order: 10,                     // both layers in one call; the Gemini context check is order 30
    run: function (ctx) {
      return window.twCheckMessage(ctx.text).then(function (d) {
        return (d && d.allowed === false) ? { blocked: true, reason: 'tw_guard', source: 'TeenWork', guard: d } : null;
      });
    }
  });

  /* ── What the sender sees ── */
  var _oReason = window.getBlockReason;
  window.getBlockReason = function (scan) {
    if (scan && scan.reason === 'tw_guard' && scan.guard) {
      var g = scan.guard;
      var care = (g.categories || []).some(function (c) { return /^self-harm/.test(c); }) && !(g.categories || []).some(function (c) { return /^(hate|harassment)/.test(c); });
      var icon = care ? '💛' : g.layer === 'policy' ? '🛡️' : '🚫';
      var support = care ? '' : ' If this was a mistake, <a href="#" onclick="openSupportModal(\'Blocked Message\',\'The safety check blocked a message by mistake\');return false" style="color:inherit;font-weight:700;text-decoration:underline">contact support</a>.';
      return '<span class="msg-blocked-icon">' + icon + '</span><div><span class="msg-blocked-label">' + esc(g.title || 'Message blocked') + '</span><span class="msg-blocked-detail">' + esc(g.message || '') + support + '</span></div>';
    }
    return _oReason ? _oReason.apply(this, arguments) : '';
  };

  /* ── Old word list: match whole words only ──
     scanMessage() squashed the whole message into one string and looked for each listed word inside it,
     so 'f', 'fu', 'nig' and 'ass' blocked almost every normal message ("Thanks for the work", "Have a good
     night", "my class"). Same list, same rules, but a word now has to stand on its own. Leet spellings
     ("b1tch") and spaced-out letters ("f u c k") are still caught; slurs hidden other ways are OpenAI's job. */
  if (typeof MSG_BLOCKED_WORDS !== 'undefined' && typeof MSG_WARN_PATTERNS !== 'undefined' && typeof isSchedulingContext === 'function') {
    var LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '|': 'l' };
    var prep = function (s) {
      var t = String(s || '').toLowerCase().replace(/[\u200B-\u200F\u2060\uFEFF\u00AD]/g, '').replace(/['’‘`´]/g, '');
      t = t.split('').map(function (c, i, a) { return LEET[c] && (/[a-z]/.test(a[i - 1] || '') || /[a-z]/.test(a[i + 1] || '')) ? LEET[c] : c; }).join('');
      return t.replace(/(^|[^a-z])([a-z](?:[\s.\-_*•·,]{1,3}[a-z](?![a-z])){2,})/g, function (m, pre, run) { return pre + run.replace(/[^a-z]/g, ''); });
    };
    var wordRe = function (w) { return new RegExp('(^|[^a-z])' + prep(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ +/g, '[^a-z]*') + '(?![a-z])'); };
    var LIST = MSG_BLOCKED_WORDS.map(function (w) { return { word: w, re: wordRe(w) }; });
    var TOO_BROAD = [String.raw`\bf[\s\-_.]*[uy]`, String.raw`\bn[\s\-_.]*[i1][\s\-_.]*[gq]`];   // matched "fun", "for you", "night"
    var WARN = MSG_WARN_PATTERNS.filter(function (p) { return TOO_BROAD.indexOf(p.source) < 0; });
    var ALWAYS = ['meet me alone', 'come alone', 'ill pick you up', 'get in my car', 'come to my house alone', 'meet at my house'];
    window.scanMessage = function (text) {
      var t = prep(text), lower = String(text || '').toLowerCase();
      for (var i = 0; i < LIST.length; i++) {
        if (!LIST[i].re.test(t)) continue;
        if (ALWAYS.indexOf(LIST[i].word) >= 0) return { blocked: true, reason: 'safety_pattern', word: LIST[i].word };
        if (isSchedulingContext(text)) continue;
        return { blocked: true, reason: 'inappropriate_language', word: LIST[i].word };
      }
      for (var j = 0; j < WARN.length; j++) {
        if (WARN[j].test(lower) && !isSchedulingContext(text)) return { blocked: true, reason: 'safety_pattern', pattern: WARN[j].toString() };
      }
      return { blocked: false };
    };
  }

  /* ── Admin → System Health line ── */
  var _oHealth = window.adminRunHealthCheck;
  if (typeof _oHealth === 'function') {
    window.adminRunHealthCheck = async function () {
      var r = await _oHealth.apply(this, arguments);
      try {
        var el = document.getElementById('adm-health-list'); if (!el) return r;
        var d = await callFn({ ping: true });
        var status = 'warn', note = 'check-message not reachable (deploy it in Supabase) · messages use the old word list only';
        if (d && d.ok) {
          status = d.moderation_configured ? 'ok' : 'warn';
          note = d.moderation_configured ? 'phrase filter + OpenAI moderation on' : 'phrase filter on · OpenAI moderation off (add the OPENAI_API_KEY secret)';
        }
        var old = el.querySelector('[data-tw-msg-safety]'); if (old) old.remove();
        var row = document.createElement('div'); row.className = 'adm-health-item'; row.setAttribute('data-tw-msg-safety', '1');
        row.innerHTML = '<div class="adm-health-status ' + status + '"></div><div class="adm-health-label">Message safety check</div><div class="adm-health-note">' + esc(note) + '</div>';
        el.appendChild(row);
      } catch (e) {}
      return r;
    };
  }

  window._twMessageSafety = { status: function () { return { off: state.off, offReason: state.offReason, last: state.last, url: fnUrl() }; } };
})();
