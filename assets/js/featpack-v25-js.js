
(function(){
  'use strict';

  /* ─── 1. Central AI caller + aliases ─────────────────────────────── */
  // ── Groq set-up (added by groq-ai patch) ─────────────────────────
  //  Free-plan and Pro-plan requests use separate Groq API keys, so one
  //  plan's usage never eats into the other plan's quota.
  //  mode 'direct': this page calls Groq itself with the key for the user's
  //                 plan. Anyone who opens this file can read those keys.
  //  mode 'proxy' : this page calls the Supabase Edge Function `groq-chat`;
  //                 the keys live only in that function's secrets
  //                 (GROQ_KEY_FREE / GROQ_KEY_PRO) and are not in this file.
  const TW_GROQ = {
    mode: 'proxy',
    proxyUrl: 'https://qocmpwimsfcnqijtfmki.supabase.co/functions/v1/groq-chat',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    plans: {
      free: { key: '__TW_GROQ_FREE_KEY__', model: 'llama-3.3-70b-versatile' },
      pro:  { key: '__TW_GROQ_PRO_KEY__',  model: 'llama-3.3-70b-versatile' },
    },
  };
  window.TW_GROQ = TW_GROQ;

  // Which plan pays for this AI request? → 'free' | 'pro'
  // Follows the plan stored on the account (picked at sign-up or set by an
  // upgrade), NOT the pre-launch / "limits off" switch that gives everyone Pro
  // features, so a free account always draws on the free key. Guests and the
  // public demo accounts use the free key; the admin uses the pro key.
  // Only used to pick the key and model; it never blocks a request (the daily
  // cap lives in the plan-limits block, on the user-facing AI buttons).
  function _twAIPlan() {
    const u = window.currentUser;
    if (!u) return 'free';
    if (u.isAdmin || u.type === 'admin') return 'pro';
    if (u.isDemo) return 'free';
    // Plan-limits block (plan-limits-v40), when present: the account's stored plan
    // (cloud row `plan`, cached in localStorage under _DB._prefix() + 'plan').
    try {
      if (window.twPlan && typeof window.twPlan.storedPlanOf === 'function') {
        const p = window.twPlan.storedPlanOf(u);
        if (p === 'pro' || p === 'free') return p;
      }
      if (window._DB && typeof window._DB._prefix === 'function') {
        const raw = localStorage.getItem(window._DB._prefix() + 'plan');
        const p = raw ? JSON.parse(raw) : null;
        if (p === 'pro' || p === 'free') return p;
      }
    } catch (e) {}
    // Older storage: the plan picked at sign-up (both key spellings).
    const ids = [u.dataKey, u.email].filter(Boolean).map(s => String(s).toLowerCase());
    for (const id of ids) {
      const keys = ['tw_' + id.replace(/[^a-z0-9]/gi, '_') + '_acct_tier', 'tw_' + id + '_acct_tier'];
      for (const k of keys) {
        let t = null;
        try { t = localStorage.getItem(k) || sessionStorage.getItem(k); } catch (e) {}
        if (t === 'pro') return 'pro';
        if (t === 'free') return 'free';
      }
    }
    return 'free';
  }
  window._twAIPlan = _twAIPlan;

  async function callAI(prompt, system, opts = {}) {
    // ── Account tier AI limit check ─────────────────────────────
    const limitCheck = typeof _checkAILimit === 'function' ? _checkAILimit() : { ok: true };
    if (!limitCheck.ok) throw new Error('__AI_LIMIT__:' + limitCheck.reason + ':' + limitCheck.msg + (limitCheck.cta ? ':' + limitCheck.cta : ''));
    // ────────────────────────────────────────────────────────────
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });
    const plan = _twAIPlan();
    const planCfg = TW_GROQ.plans[plan] || TW_GROQ.plans.free;
    const payload = {
      model: opts.model || planCfg.model,
      messages,
      max_tokens: opts.max_tokens || 1000,
      temperature: (opts.temperature == null) ? 0.7 : opts.temperature,
    };
    let res;
    if (TW_GROQ.mode === 'proxy') {
      const sbKey = (typeof SUPABASE_KEY !== 'undefined') ? SUPABASE_KEY : '';
      // Demos (empty practice accounts, demo-sandbox-v49) have no sign-in: groq-chat gives them a small
      // daily allowance per visitor. demo-sandbox-v49 also limits them to 5 tries a day in the browser.
      const u = window.currentUser;
      const demo = !!(u && (u.isDemo || u.twDemo || (typeof window._twIsDemoSandboxUser === 'function' && window._twIsDemoSandboxUser(u))));
      let bearer = sbKey;
      if (!demo) {
        // The backend verifies this session and selects the plan from admin-owned metadata.
        const client = await _twCloudClient();
        const sessionResult = client ? await client.auth.getSession() : null;
        const session = sessionResult?.data?.session;
        if (!session?.access_token || !u ||
            String(session.user?.email || '').toLowerCase() !== String(u.email || '').toLowerCase()) {
          throw new Error('Please sign in to your account to use AI features.');
        }
        bearer = session.access_token;
      }
      const headers = { 'Content-Type': 'application/json', 'apikey': sbKey, 'Authorization': 'Bearer ' + bearer };
      if (demo) headers['x-teenwork-demo'] = '1';
      res = await fetch(TW_GROQ.proxyUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
    } else {
      if (!planCfg.key || planCfg.key.startsWith('__')) throw new Error('AI is not set up yet (no Groq key for the ' + plan + ' plan).');
      res = await fetch(TW_GROQ.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + planCfg.key },
        body: JSON.stringify(payload),
      });
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || String(data.error));
    typeof _incrementAICall === 'function' && _incrementAICall();
    return data.choices?.[0]?.message?.content || JSON.stringify(data);
  }
  window.callAI = callAI;

  // Helper: render AI limit message into an element
  function _showAILimitMsg(el, errMsg) {
    if (!el) return;
    const parts = errMsg.replace('__AI_LIMIT__:', '').split(':');
    const reason = parts[0];
    const msg    = parts[1] || 'AI limit reached.';
    const cta    = parts[2];
    const cfg    = typeof _adminGetConfig === 'function' ? _adminGetConfig() : {};
    if (reason === 'upgrade' && cfg.launchPaid) {
      el.innerHTML = `<div style="padding:14px;background:var(--amber-pale);border:1.5px solid var(--amber);border-radius:12px;text-align:center">
        <div style="font-size:1.4rem;margin-bottom:6px">⭐</div>
        <div style="font-weight:700;color:var(--amber);margin-bottom:4px">Daily AI Limit Reached</div>
        <div style="font-size:.85rem;color:var(--text);margin-bottom:10px">You've used your 3 free AI requests today.</div>
        <div style="font-size:.82rem;color:var(--muted);margin-bottom:12px">Upgrade to <strong>TeenWork Pro</strong> for unlimited AI — just $4.99/mo.</div>
        <button onclick="gotoPage('pricing')" style="background:var(--amber);color:#fff;border:none;padding:8px 20px;border-radius:8px;font-weight:700;cursor:pointer;font-family:DM Sans,sans-serif">Upgrade to Pro →</button>
      </div>`;
    } else {
      el.innerHTML = `<div style="padding:12px 14px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;color:var(--muted);font-size:.85rem;text-align:center">${msg}<br><span style="font-size:.78rem">Try again tomorrow.</span></div>`;
    }
  }
  window._showAILimitMsg = _showAILimitMsg;

  // callGemini(prompt, system?, streaming?) → returns text
  if (typeof window.callGemini !== 'function') {
    window.callGemini = async function(prompt, system, _streaming) {
      try { return await callAI(prompt, system); }
      catch (e) { return 'AI temporarily unavailable. ' + (e.message||''); }
    };
  }
  if (typeof window.callClaudeAI !== 'function') {
    window.callClaudeAI = async function(prompt, system) {
      try { return await callAI(prompt, system); }
      catch (e) {
        const msg = e.message || '';
        if (msg.startsWith('__AI_LIMIT__')) return '__AI_LIMIT_ERROR__';
        return 'AI temporarily unavailable. ' + msg;
      }
    };
  }
  // openAI(prompt) in this app opens the AI modal and streams text into #aiResponse
  if (typeof window.openAI !== 'function') {
    window.openAI = async function(prompt, system) {
      const modal = document.getElementById('aiModal');
      const out   = document.getElementById('aiResponse');
      if (modal) modal.classList.add('open', 'active');   // CSS shows .modal-overlay.open; 'active' kept for older code
      if (out)   out.innerHTML = '<span class="loading-dots">Thinking</span>';
      try {
        const text = await callAI(prompt, system);
        if (out) out.textContent = text;
      } catch (e) {
        const msg = e.message || '';
        if (msg.startsWith('__AI_LIMIT__') && out) {
          _showAILimitMsg(out, msg);
        } else if (out) {
          out.textContent = 'AI temporarily unavailable. ' + msg;
        }
      }
    };
    window.closeAIModal = window.closeAIModal || function(){ document.getElementById('aiModal')?.classList.remove('open', 'active'); };
  }

  /* ─── 2. Cross-tab real-time sync via BroadcastChannel ────────────── */
  let bc = null;
  try { bc = new BroadcastChannel('teenwork-rt'); } catch(e) { bc = null; }
  const RT = {
    publish(event, data) {
      if (!bc) return;
      bc.postMessage({ event, data, ts: Date.now(), role: window.currentUser?.type || 'anon' });
    },
    onMessage(handler) { if (bc) bc.addEventListener('message', e => handler(e.data)); },
  };
  window.RT = RT;

  RT.onMessage(({ event, data, role }) => {
    const myRole = window.currentUser?.type;
    if (!myRole || role === myRole) return; // don't notify same role
    const toast = document.createElement('div');
    toast.className = 'rt-toast';
    toast.innerHTML = '<strong style="color:var(--green)">⚡ Live update</strong><div style="margin-top:3px">' + htmlEscape(formatRtEvent(event, data)) + '</div>';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
    // Refresh relevant views
    if (event === 'job-posted') { window.renderBrowseJobs?.(); }
    if (event === 'applied')    { window.renderParentDashboard?.(); window.renderEmployerDashboard?.(); }
    if (event === 'message-sent'){ /* could refresh msg list */ }
  });
  function formatRtEvent(e, d){
    if (e === 'job-posted')   return `New job posted: ${d.title || 'Untitled'}`;
    if (e === 'applied')      return `${d.teen || 'A teen'} applied to ${d.job || 'a job'}`;
    if (e === 'message-sent') return `New message from ${d.from || 'a user'}`;
    if (e === 'safety-flag')  return `⚠️ Safety flag raised`;
    return `${e}`;
  }
  function htmlEscape(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // Hook postJob → publish
  function wirePostJob() {
    if (typeof window.postJob !== 'function') return setTimeout(wirePostJob, 300);
    const orig = window.postJob;
    window.postJob = async function(...a) {
      const r = await orig.apply(this, a);
      const title = document.getElementById('emp-title')?.value || 'a new job';
      RT.publish('job-posted', { title });
      return r;
    };
  }
  // Hook applyToJob → publish
  function wireApply() {
    if (typeof window.applyToJob !== 'function') return setTimeout(wireApply, 300);
    const orig = window.applyToJob;
    window.applyToJob = function(...a) {
      const r = orig.apply(this, a);
      RT.publish('applied', { teen: window.currentUser?.name, job: a[0]?.title || a[0] });
      return r;
    };
  }
  // Hook sendMsg → publish
  function wireMsg() {
    if (typeof window.sendMsg !== 'function') return setTimeout(wireMsg, 300);
    const orig = window.sendMsg;
    window.sendMsg = async function(...a) {
      const r = await orig.apply(this, a);
      RT.publish('message-sent', { from: window.currentUser?.name || 'user' });
      return r;
    };
  }

  /* ─── 3. Safety Lab eval page ─────────────────────────────────────── */
  const MSG_CASES = [
    // text, expectedBlocked
    ['Hi! I can start this Saturday morning at 8am.', false],
    ['Great — see you at the community center at 4pm.', false],
    ['Our little secret, ok?', true],
    ["don't tell your parents about this", true],
    ["You're really mature for your age", true],
    ['send me a pic', true],
    ['What are you wearing right now?', true],
    ['I can pick you up, come alone', true],
    ['Cash under the table, no one needs to know', true],
    ["Delete this chat after you read it", true],
    ["Can you babysit on Friday night? It's 3 hours.", false],
    ['My address is 123 Main St, call me at 555-1234', true],
    ['sounds great, see you Tuesday', false],
    ['how old are you really', true],
    ['here is a link: malware.xyz/login', true],
  ];
  const JOB_CASES = [
    // job, expectedBlocked
    [{title:'Lawn mowing', type:'yard work', pay:18, payType:'hourly', state:'Vermont', minAge:14, maxHours:12, desc:'Mow a small yard weekly'}, false],
    [{title:'Roofing assistant', type:'construction', pay:20, payType:'hourly', state:'Vermont', minAge:15, maxHours:20, desc:'Carry shingles up a ladder'}, true],
    [{title:'Pet sitting', type:'pet care', pay:15, payType:'hourly', state:'Vermont', minAge:13, maxHours:8, desc:'Walk and feed two dogs'}, false],
    [{title:'Forklift operator', type:'warehouse', pay:17, payType:'hourly', state:'Vermont', minAge:14, maxHours:15, desc:'Operate forklift in the warehouse'}, true],
    [{title:'Babysitter', type:'child care', pay:15, payType:'hourly', state:'Vermont', minAge:14, maxHours:10, desc:'Watch 2 kids on Friday evenings'}, false],
    [{title:'Underpaid gig', type:'cleaning', pay:3, payType:'hourly', state:'Vermont', minAge:14, maxHours:10, desc:'Some cleaning'}, true],
    [{title:'60-hour week', type:'yard work', pay:12, payType:'hourly', state:'Vermont', minAge:14, maxHours:60, desc:'Lots of mowing'}, true],
    [{title:'Bar back', type:'food service', pay:14, payType:'hourly', state:'Vermont', minAge:15, maxHours:10, desc:'Stock alcohol and clean glasses at the bar'}, true],
    [{title:'Tutoring', type:'tutoring', pay:22, payType:'hourly', state:'Vermont', minAge:14, maxHours:6, desc:'Help 5th graders with math'}, false],
    [{title:'Under-age post', type:'cleaning', pay:15, payType:'hourly', state:'Vermont', minAge:11, maxHours:8, desc:'Light cleaning'}, true],
  ];

  window.renderSafetyLab = function () {
    const msgEl = document.getElementById('safelab-msg');
    const jobEl = document.getElementById('safelab-job');
    const stats = document.getElementById('safelab-stats');
    if (!msgEl || !jobEl) return;
    let msgPass = 0;
    msgEl.innerHTML = '<div class="safelab-grid"><div class="h">Input</div><div class="h">Verdict</div><div class="h">Expected</div>' +
      MSG_CASES.map(([txt, expect]) => {
        const scan = window.scanMessage?.(txt) || { blocked: false };
        const got = !!scan.blocked;
        const ok  = got === expect;
        if (ok) msgPass++;
        return `<div class="safelab-row safelab-input">${htmlEscape(txt)}</div>
                <div class="safelab-row ${got?'safelab-fail':'safelab-pass'}">${got?'🚫 blocked':'✅ passed'}</div>
                <div class="safelab-row ${ok?'safelab-pass':'safelab-fail'}">${ok?'✓ correct':'✗ wrong'}</div>`;
      }).join('') + '</div>';
    let jobPass = 0;
    jobEl.innerHTML = '<div class="safelab-grid"><div class="h">Job</div><div class="h">Verdict</div><div class="h">Expected</div>' +
      JOB_CASES.map(([j, expect]) => {
        const issues = window.complianceCheck?.(j) || [];
        const got = issues.some(i => i.level === 'block');
        const ok  = got === expect;
        if (ok) jobPass++;
        return `<div class="safelab-row safelab-input">${htmlEscape(j.title)} · age ${j.minAge}+ · $${j.pay}/${j.payType} · ${j.maxHours}h</div>
                <div class="safelab-row ${got?'safelab-fail':'safelab-pass'}">${got?'🚫 blocked':'✅ allowed'}</div>
                <div class="safelab-row ${ok?'safelab-pass':'safelab-fail'}">${ok?'✓ correct':'✗ wrong'}</div>`;
      }).join('') + '</div>';
    const total = MSG_CASES.length + JOB_CASES.length;
    const pass  = msgPass + jobPass;
    const pct   = Math.round(pass/total*100);
    stats.innerHTML = `
      <div class="safelab-score"><div class="sc-num">${pct}%</div><div style="font-size:.78rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:3px">Suite accuracy</div></div>
      <div class="safelab-score"><div class="sc-num">${msgPass}/${MSG_CASES.length}</div><div style="font-size:.78rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:3px">Message tests</div></div>
      <div class="safelab-score"><div class="sc-num">${jobPass}/${JOB_CASES.length}</div><div style="font-size:.78rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:3px">Job tests</div></div>
      <div class="safelab-score" style="background:var(--amber-pale);border-color:var(--amber)"><div class="sc-num" style="color:var(--amber)">0 ms</div><div style="font-size:.78rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:3px">AI required</div></div>`;
  };
  // Auto-run on page nav — wrap after real gotoPage is registered
  function _wrapGotoForSafetyLab() {
    var _origGoto = window.gotoPage;
    if (typeof _origGoto === 'function' && !_origGoto._safetyLabWrapped) {
      var _wrapped = function(p) { _origGoto(p); if (p === 'safety-lab') setTimeout(renderSafetyLab, 80); };
      _wrapped._safetyLabWrapped = true;
      window.gotoPage = _wrapped;
    } else {
      // gotoPage not ready or already drained — retry
      setTimeout(_wrapGotoForSafetyLab, 150);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(_wrapGotoForSafetyLab, 300); });
  else setTimeout(_wrapGotoForSafetyLab, 300);

  /* ─── 4. Download my data ─────────────────────────────────────────── */
  window.downloadMyData = function () {
    const data = {
      exported_at: new Date().toISOString(),
      user: window.currentUser ? { ...window.currentUser } : null,
      local_storage: {},
    };
    for (let i=0; i<localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('tw_')) continue;
      try { data.local_storage[k] = JSON.parse(localStorage.getItem(k)); }
      catch { data.local_storage[k] = localStorage.getItem(k); }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `teenwork-data-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    window.showToast?.('📥 Your data exported','success');
  };

  /* ─── 5. Service worker registration ──────────────────────────────── */
  // Writes an inline SW via Blob URL so no separate file is strictly required.
  // When served over https/localhost the browser registers it and caches the app shell.
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // Try a sibling sw.js first (for deployments), fall back to inline.
    navigator.serviceWorker.register('sw.js').catch(() => {
      const src = `
        const CACHE = 'teenwork-v1';
        self.addEventListener('install', e => {
          e.waitUntil(caches.open(CACHE).then(c => c.addAll([location.origin + '/'])));
          self.skipWaiting();
        });
        self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });
        self.addEventListener('fetch', e => {
          if (e.request.method !== 'GET') return;
          e.respondWith(
            caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
              const copy = resp.clone();
              caches.open(CACHE).then(c => { try { c.put(e.request, copy); } catch(_){} });
              return resp;
            }).catch(() => caches.match('/')))
          );
        });`;
      const url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
      navigator.serviceWorker.register(url).catch(() => {});
    });
  }

  /* ─── Inject entry points ──────────────────────────────────────────── */
  function injectEntryPoints() {
    // Safety Lab link on the landing page
    const landing = document.querySelector('#page-landing .landing-shell');
    if (landing && !document.getElementById('featpack-safetylab-cta')) {
      const d = document.createElement('div');
      d.id = 'featpack-safetylab-cta';
      d.style.cssText = 'margin:1.4rem auto;text-align:center';
      d.innerHTML = `<button onclick="gotoPage('safety-lab');setTimeout(function(){if(typeof renderSafetyLab==='function')renderSafetyLab();},150);" class="btn-secondary" style="padding:10px 20px;border-color:var(--red);color:var(--red)">🛡️ See the safety engine — live eval</button>`;
      landing.appendChild(d);
    }
    // Download-my-data button appears in the referral modal as a privacy companion
    const refModal = document.querySelector('#referralModal .modal');
    if (refModal && !document.getElementById('dl-my-data-btn')) {
      const btn = document.createElement('button');
      btn.id = 'dl-my-data-btn'; btn.className = 'btn-secondary';
      btn.style.cssText = 'width:100%;margin-top:8px';
      btn.textContent = '📥 Download my data (JSON)';
      btn.onclick = downloadMyData;
      refModal.appendChild(btn);
    }
  }

  /* ─── BOOT ─── */
  function boot() {
    wirePostJob();
    wireApply();
    wireMsg();
    injectEntryPoints();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
