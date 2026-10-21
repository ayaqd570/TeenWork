
/* ══════════════════════════════════════════════════════════════════════
   GEMINI CONTEXT SAFETY CHECK  (2026-10-16, "Gemini safety check" thread, Aya's request)
   Before a message between an adult employer and a teen is sent, the last
   5 messages of that chat (newest = the one being sent) go to the Supabase
   Edge Function `gemini-safety`, which asks Gemini whether the adult is
   trying to isolate the teen, set up an unapproved private meeting, offer
   a ride alone, or get around parent visibility. UNSAFE = the message is
   not sent and the chat is saved in Supabase (safety_flags) for review.

   • Only employer ↔ teen chats are checked (not parent or admin chats), and
     only messages the faster filters let through, so quota isn't wasted.
   • Fallback lives in the function: Gemini → Groq (the AI key the app
     already has) → message allowed and saved for review. If the function
     can't be reached at all (not deployed, offline, the file preview inside
     the Claude app), the message goes out after the other filters, as before.
   • Uses the shared pre-send runner (window.twPreSendChecks) that the
     message-safety block uses too: its phrase filter + OpenAI check is
     order 10, this check is order 30, the first block wins.
   • Admin → 🩺 System Health gets a "Chat safety AI" line.
   • Settings: window.TW_GEMINI_SAFETY = { enabled, demo, timeoutMs } before
     this block (defaults: on, also for demo logins, 15 s).
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twGeminiSafety) return;
  window.__twGeminiSafety = true;

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

  /* ── Settings ── */
  var CFG = Object.assign({ enabled: true, demo: true, timeoutMs: 15000 }, window.TW_GEMINI_SAFETY || {});
  window.TW_GEMINI_SAFETY = CFG;
  var CONTEXT_SIZE = 5;                                  // the function only reads the last 5 messages
  var state = { off: false, offReason: '', last: null };

  function fnUrl() { return (typeof SUPABASE_URL !== 'undefined' && /^https:/.test(SUPABASE_URL)) ? SUPABASE_URL.replace(/\/+$/, '') + '/functions/v1/gemini-safety' : ''; }
  function sbKey() { return typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY' ? SUPABASE_KEY : ''; }
  function me() { return window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null); }
  function keyOf(u) { return u ? (u.dataKey || String(u.email || '').toLowerCase()) : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function callFn(body) {
    var url = fnUrl(), key = sbKey();
    if (!url || !key) return Promise.resolve({ ok: false, code: 'no_supabase' });
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, CFG.timeoutMs) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(body),
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      if (res.status === 404) return { ok: false, code: 'not_deployed' };
      return res.json().then(function (d) { return (d && typeof d === 'object') ? d : { ok: false, code: 'bad_reply' }; }, function () { return { ok: false, code: 'bad_reply' }; });
    }, function (e) {
      return { ok: false, code: (e && e.name === 'AbortError') ? 'timeout' : 'network' };
    }).then(function (d) { if (timer) clearTimeout(timer); return d; });
  }

  /* Check a conversation by hand, e.g. from the console:
       twCheckConversation([{role:'employer', text:'…'}, {role:'teen', text:'…'}])
     Resolves to the function's answer { ok, safe, reason, checked, provider, … }. */
  window.twCheckConversation = function (messages, meta) {
    if (state.off) return Promise.resolve({ ok: false, code: state.offReason });
    return callFn(Object.assign({ messages: messages || [] }, meta || {})).then(function (d) {
      if (d.code === 'not_deployed') { state.off = true; state.offReason = 'not_deployed'; }
      state.last = { at: new Date().toISOString(), ok: !!d.ok, safe: d.safe, checked: d.checked, provider: d.provider || '', fallback: d.fallback || d.code || '' };
      return d;
    });
  };

  /* ── The order-30 check: employer ↔ teen chats only ── */
  window.twPreSendChecks.push({
    id: 'gemini-context', order: 30,
    run: function (ctx) {
      var u = me();
      if (!CFG.enabled || !u || !ctx.contact) return null;
      if (u.isDemo && !CFG.demo) return null;
      // the chat list belongs to msgCurrentRole (same as u.type for signed-in accounts)
      var myRole = (typeof msgCurrentRole !== 'undefined' && msgCurrentRole) || u.type, theirRole = ctx.contact.role;
      if ([myRole, theirRole].sort().join('+') !== 'employer+teen') return null;
      // the old word list in sendMsg blocks these anyway; don't spend AI quota on them
      try { if (typeof scanMessage === 'function' && scanMessage(ctx.text).blocked) return null; } catch (e) {}
      var msgs = ctx.history.slice(-(CONTEXT_SIZE - 1))
        .map(function (m) { return { role: m.from === 'me' ? myRole : theirRole, text: m.text }; })
        .concat([{ role: myRole, text: ctx.text }]);
      return window.twCheckConversation(msgs, {
        from_key: keyOf(u) || u.name || '', from_role: myRole,
        to_key: ctx.contact.cloudKey || ctx.contact.name || '', to_role: theirRole
      }).then(function (d) {
        if (!d || !d.ok) { if (d && d.code !== 'not_deployed') console.info('TeenWork: chat safety AI not reachable (' + (d && d.code) + '), message allowed.'); return null; }
        if (d.checked === false) console.info('TeenWork: chat safety AI could not check this message (' + (d.fallback || '') + '); it was allowed and saved for review.');
        if (d.safe !== false) return null;
        return {
          blocked: true, source: 'AI', gemini: d,
          reason: 'Safety check: ' + String(d.reason || 'this conversation looks unsafe for a teen.').replace(/\s+$/, '') +
            (d.flagged ? ' This chat was saved for a TeenWork admin to review.' : '')
        };
      });
    }
  });

  /* ── Admin → System Health: "Chat safety AI" line ── */
  function shortModel(m) { return String(m || '').replace(/^openai\//, ''); }
  function timeOf(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }); }
  function healthNote(d) {
    if (!d || !d.ok) {
      if (d && d.code === 'not_deployed') return { status: 'warn', note: 'gemini-safety function not deployed · chats get the other filters only' };
      return { status: 'warn', note: 'gemini-safety not reachable (' + ((d && d.code) || 'offline') + ') · chats get the other filters only' };
    }
    var c = d.configured || {}, q = d.quota || {}, gq = q.gemini || {}, parts = [], status = 'ok';
    if (c.gemini) {
      parts.push(gq.paused_until ? 'Gemini paused until ' + timeOf(gq.paused_until) + ' (quota used up), Groq checking instead'
        : 'Gemini (' + d.gemini_model + ') · ' + (gq.used_today || 0) + ' of ' + (d.gemini_daily_limit || '∞') + ' checks today');
      parts.push(c.groq ? 'Groq backup ready' : 'no backup AI');
    } else if (c.groq) {
      parts.push('Groq (' + shortModel(d.groq_model) + ') checks chats · no Gemini key');
    } else {
      status = 'warn';
      parts.push('no AI key: messages are allowed and saved for review');
    }
    if (d.storage === false) { status = 'warn'; parts.push('review table missing'); }
    else if (d.flags_to_review) parts.push(d.flags_to_review + ' flagged chat' + (d.flags_to_review === 1 ? '' : 's') + ' to review in Supabase (safety_flags)');
    return { status: status, note: parts.join(' · ') };
  }
  window.twPingChatSafety = function () { return callFn({ ping: true }); };
  var _oHealth = window.adminRunHealthCheck;
  if (typeof _oHealth === 'function') {
    window.adminRunHealthCheck = async function () {
      var r = await _oHealth.apply(this, arguments);
      try {
        var el = document.getElementById('adm-health-list'); if (!el) return r;
        var h = healthNote(await callFn({ ping: true }));
        var old = el.querySelector('[data-tw-gemini-safety]'); if (old) old.remove();
        var row = document.createElement('div'); row.className = 'adm-health-item'; row.setAttribute('data-tw-gemini-safety', '1');
        row.innerHTML = '<div class="adm-health-status ' + h.status + '"></div><div class="adm-health-label">Chat safety AI</div><div class="adm-health-note">' + esc(h.note) + '</div>';
        el.appendChild(row);
      } catch (e) {}
      return r;
    };
  }

  window._twGeminiSafety = { status: function () { return { enabled: CFG.enabled, off: state.off, offReason: state.offReason, last: state.last, url: fnUrl() }; } };
})();
