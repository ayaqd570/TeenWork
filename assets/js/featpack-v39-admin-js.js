
/* ══════════════════════════════════════════════════════════════════════
   v39 — ADMIN PANEL EXPANSION
   Adds five tabs to the admin panel (sign in with ADMIN_EMAIL + the admin password):
     👤 Accounts        — every account (this device + cloud), search, details,
                          reset password, suspend, change role, delete, create, CSV export
     📧 Email Rules     — emails/domains allowed to own more than one account,
                          max accounts per email, blocked emails/domains
     📢 Announcements   — banner messages to all users / one role / one person
     🔐 Security & Log  — admin password, protection summary, admin audit log, sign-in log
     🧰 Data Tools      — storage usage, full backup export / import, danger zone
   Also: announcement banners on dashboards, admin-only guard on the Platform Admin page.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const toast = (m, t) => { try { showToast(m, t || 'success'); } catch (e) {} };
  const audit = (a, d) => { try { _twAdminAudit(a, d); } catch (e) {} };
  const isAdmin = () => !!((window.currentUser && window.currentUser.isAdmin) || (typeof currentUser !== 'undefined' && currentUser && currentUser.isAdmin));
  const sb = () => (typeof sbClient !== 'undefined' && sbClient) ? sbClient : null;
  const fmtDate = ts => { if (!ts) return '—'; const d = new Date(ts); return isNaN(d) ? '—' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const ageFrom = dob => { if (!dob) return ''; const b = new Date(/^\d{4}-\d\d-\d\d$/.test(dob) ? dob + 'T00:00' : dob), t = new Date(); if (isNaN(b)) return ''; let a = t.getFullYear() - b.getFullYear(); if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--; return a; };
  const prefixFor = key => 'tw_' + String(key).replace(/[^a-z0-9]/gi, '_') + '_';
  const roleIcon = { teen: '🧑', parent: '👨‍👩‍👧', employer: '💼' };
  const $ = id => document.getElementById(id);
  const uid = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ── accounts: this device + cloud ─────────────────────────────── */
  let cloudAccounts = [];
  let cloudStatus = 'Cloud database not checked yet.';
  let cloudLoading = false;

  function localAccounts() {
    const all = _twLocalAccounts();
    return Object.keys(all).map(k => ({ ...all[k], _key: k, slot: all[k].slot || (k.includes('#') ? (parseInt(k.split('#')[1]) || 1) : 1), source: 'device' }));
  }
  function allAccounts() {
    const local = localAccounts();
    const seen = new Set(local.map(a => a._key));
    const cloud = cloudAccounts.filter(c => !seen.has(c._key)).map(c => ({ ...c, source: 'cloud' }));
    return local.concat(cloud).sort((a, b) => (b.created || 0) - (a.created || 0));
  }
  async function loadCloudAccounts() {
    const client = sb();
    if (!client) { cloudStatus = 'Cloud database is not connected on this page, so only accounts saved on this device are listed.'; cloudAccounts = []; return; }
    cloudLoading = true;
    try {
      const { data, error } = await client.from('user_data').select('email,value,updated_at').eq('key', 'account_profile').limit(2000);
      if (error) throw error;
      cloudAccounts = (data || []).map(r => {
        let v = {}; try { v = JSON.parse(r.value || '{}'); } catch (e) {}
        return { ...v, _key: r.email, email: v.email || String(r.email).split('#')[0], slot: v.slot || 1, cloudUpdated: r.updated_at };
      });
      // Older accounts that never saved a profile row still show up by email so nothing is hidden
      const { data: rows } = await client.from('user_data').select('email').limit(5000);
      const known = new Set(cloudAccounts.map(a => a._key));
      (rows || []).forEach(r => {
        if (r.email && !known.has(r.email) && !_twIsAdminEmail(r.email)) {
          known.add(r.email);
          cloudAccounts.push({ _key: r.email, email: String(r.email).split('#')[0], name: '', type: '', created: 0, slot: 1, dataOnly: true });
        }
      });
      cloudStatus = 'Cloud database checked at ' + new Date().toLocaleTimeString() + ': ' + cloudAccounts.length + ' account' + (cloudAccounts.length === 1 ? '' : 's') + ' found there.';
    } catch (e) {
      cloudAccounts = [];
      cloudStatus = 'Could not read the cloud database (' + (e && e.message ? e.message : e) + '). Showing accounts saved on this device.';
    }
    cloudLoading = false;
  }

  /* ── panel injection ───────────────────────────────────────────── */
  const STYLE = `
    .adm39-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin-bottom:14px; }
    .adm39-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
    .adm39-in, .adm39-sel, .adm39-ta { padding:7px 12px; border:1.5px solid var(--border); border-radius:8px; font-family:'DM Sans',sans-serif; font-size:.83rem; background:var(--card,#fff); color:var(--text); outline:none; }
    .adm39-in:focus, .adm39-sel:focus, .adm39-ta:focus { border-color:var(--green); }
    .adm39-ta { width:100%; min-height:72px; resize:vertical; box-sizing:border-box; }
    .adm39-acct { background:var(--card); border:1.5px solid var(--border); border-radius:12px; padding:12px 14px; margin-bottom:8px; }
    .adm39-acct.suspended { border-color:#f0b66a; background:#fffaf0; }
    .adm39-acct-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .adm39-avatar { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; background:var(--bg); flex-shrink:0; }
    .adm39-pill { display:inline-block; padding:2px 8px; border-radius:20px; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.4px; background:var(--bg); color:var(--muted); border:1px solid var(--border); }
    .adm39-pill.teen { background:var(--green-pale); color:var(--green); border-color:transparent; }
    .adm39-pill.parent { background:var(--blue-pale); color:var(--blue); border-color:transparent; }
    .adm39-pill.employer { background:var(--amber-pale); color:var(--amber); border-color:transparent; }
    .adm39-pill.warn { background:#fff3cd; color:#856404; border-color:transparent; }
    .adm39-pill.cloud { background:var(--purple-pale,#ede9fe); color:var(--purple,#6d28d9); border-color:transparent; }
    .adm39-actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
    .adm39-details { margin-top:10px; background:var(--bg); border-radius:10px; padding:10px 12px; font-size:.8rem; line-height:1.6; }
    .adm39-details table { width:100%; border-collapse:collapse; }
    .adm39-details td { padding:3px 6px 3px 0; vertical-align:top; }
    .adm39-details td:first-child { color:var(--muted); white-space:nowrap; width:130px; }
    .adm39-list-item { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border); font-size:.84rem; }
    .adm39-list-item:last-child { border-bottom:none; }
    .adm39-log { font-size:.78rem; max-height:320px; overflow:auto; }
    .adm39-log div { padding:6px 0; border-bottom:1px solid var(--border); display:flex; gap:10px; }
    .adm39-log div:last-child { border-bottom:none; }
    .adm39-log time { color:var(--muted); white-space:nowrap; }
    .adm39-muted { font-size:.78rem; color:var(--muted); }
    .adm39-danger { border-color:#f5b7b1 !important; }
    .adm39-ok { color:var(--green); font-weight:700; }
    .adm39-bad { color:var(--red); font-weight:700; }
    code.adm39-code { display:block; background:#1a1a2e; color:#e2e8f0; padding:8px 10px; border-radius:8px; font-size:.75rem; overflow:auto; white-space:pre; margin-top:6px; user-select:all; }
  `;

  const TABS = [
    ['accounts', '👤 Accounts'],
    ['rules',    '📧 Email Rules'],
    ['announce', '📢 Announcements'],
    ['security', '🔐 Security & Log'],
    ['data',     '🧰 Data Tools'],
  ];

  function panelsHTML() {
    return `
      <!-- ── ACCOUNTS (v39) ─── -->
      <div class="adm-tab-panel" id="adm-panel-accounts">
        <div class="adm-section-title">👤 All Accounts</div>
        <p class="adm39-muted" style="margin-bottom:12px">Every TeenWork account: the ones saved on this device plus the ones the cloud database knows about. <span id="adm39-cloud-status"></span></p>
        <div class="adm39-grid" id="adm39-acct-tiles"></div>
        <div class="adm39-row">
          <input type="text" id="adm39-acct-search" class="adm39-in" placeholder="Search name, email, city…" style="flex:1;min-width:170px">
          <select id="adm39-acct-role" class="adm39-sel"><option value="">All roles</option><option value="teen">Teens</option><option value="parent">Parents</option><option value="employer">Employers</option></select>
          <select id="adm39-acct-status" class="adm39-sel"><option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="multi">Shared emails</option><option value="cloud">Cloud only</option></select>
          <button class="adm-btn adm-btn-mark" id="adm39-acct-refresh">🔄 Refresh</button>
          <button class="adm-btn adm-btn-mark" id="adm39-acct-export">⬇️ Export CSV</button>
        </div>
        <div id="adm39-acct-list"></div>
        <div class="adm-card" style="margin-top:14px">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:8px">➕ Create an account</div>
          <p class="adm39-muted" style="margin-bottom:10px">Handy for testers. Accounts made here work exactly like sign-up accounts (teen, parent or employer only — the admin role can never be created this way).</p>
          <div class="adm39-row">
            <input id="adm39-new-name" class="adm39-in" placeholder="Full name" style="flex:1;min-width:140px">
            <input id="adm39-new-email" class="adm39-in" placeholder="Email" style="flex:1;min-width:160px">
            <select id="adm39-new-role" class="adm39-sel"><option value="teen">Teen</option><option value="parent">Parent</option><option value="employer">Employer</option></select>
          </div>
          <div class="adm39-row">
            <input id="adm39-new-dob" class="adm39-in" type="date" title="Date of birth (teens & parents)">
            <input id="adm39-new-city" class="adm39-in" placeholder="City" style="min-width:120px">
            <input id="adm39-new-state" class="adm39-in" placeholder="State" style="width:110px">
            <input id="adm39-new-pw" class="adm39-in" type="text" placeholder="Password (8+ characters)" style="flex:1;min-width:160px">
            <button class="adm-btn adm-btn-reply" id="adm39-new-create">Create account</button>
          </div>
        </div>
      </div>

      <!-- ── EMAIL RULES (v39) ─── -->
      <div class="adm-tab-panel" id="adm-panel-rules">
        <div class="adm-section-title">📧 Email Rules</div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:4px">🔁 Emails allowed to have more than one account</div>
          <p class="adm39-muted" style="margin-bottom:10px">Normally one email = one account. Add an email here (or a whole domain like <strong>*@yourschool.org</strong>) and it can sign up again as another teen, parent or employer. At sign-in, people with several accounts pick which one to open.</p>
          <div class="adm39-row">
            <input id="adm39-multi-input" class="adm39-in" placeholder="name@email.com or *@domain.com" style="flex:1;min-width:200px">
            <button class="adm-btn adm-btn-reply" id="adm39-multi-add">Allow</button>
            <label class="adm39-muted" style="display:flex;align-items:center;gap:6px">Max per email <input id="adm39-multi-max" class="adm39-in" type="number" min="2" max="50" style="width:64px;text-align:center"></label>
          </div>
          <div id="adm39-multi-list"></div>
        </div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:4px">🚫 Blocked emails &amp; domains</div>
          <p class="adm39-muted" style="margin-bottom:10px">Sign-up is refused for these. Existing accounts are not affected (suspend them from the Accounts tab).</p>
          <div class="adm39-row">
            <input id="adm39-block-input" class="adm39-in" placeholder="name@email.com or *@domain.com" style="flex:1;min-width:200px">
            <button class="adm-btn adm-btn-delete" id="adm39-block-add">Block</button>
          </div>
          <div id="adm39-block-list"></div>
        </div>
      </div>

      <!-- ── ANNOUNCEMENTS (v39) ─── -->
      <div class="adm-tab-panel" id="adm-panel-announce">
        <div class="adm-section-title">📢 Announcements</div>
        <div class="adm-card">
          <p class="adm39-muted" style="margin-bottom:10px">Shows as a banner at the top of the dashboard the next time people open the app, until they dismiss it. Use the <strong>Message</strong> button on an account to write to one person.</p>
          <div class="adm39-row">
            <input id="adm39-ann-title" class="adm39-in" placeholder="Title (e.g. New lessons are live!)" style="flex:1;min-width:200px">
            <select id="adm39-ann-aud" class="adm39-sel"><option value="all">Everyone</option><option value="teen">Teens only</option><option value="parent">Parents only</option><option value="employer">Employers only</option></select>
          </div>
          <textarea id="adm39-ann-body" class="adm39-ta" placeholder="Your message…"></textarea>
          <div class="adm39-row" style="margin-top:8px"><button class="adm-btn adm-btn-reply" id="adm39-ann-send">📢 Post announcement</button></div>
        </div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:8px">History</div>
          <div id="adm39-ann-list"></div>
        </div>
      </div>

      <!-- ── SECURITY & LOG (v39) ─── -->
      <div class="adm-tab-panel" id="adm-panel-security">
        <div class="adm-section-title">🔐 Security &amp; Log</div>
        <div class="adm-card" id="adm39-sec-login"></div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:6px">🛡 How the admin role is protected</div>
          <ul class="adm39-muted" style="margin:0;padding-left:18px;line-height:1.7">
            <li>Sign-up can only create teen, parent or employer accounts; an "admin" type is refused even if the page is tampered with.</li>
            <li>The admin password is never written in the app, only a salted hash, and a wrong guess shows the same message as any wrong password.</li>
            <li>Stored accounts marked anything other than teen / parent / employer cannot sign in.</li>
            <li>The Platform Admin page and this panel open only for the signed-in admin.</li>
            <li>Every admin action is written to the audit log below.</li>
          </ul>
        </div>
        <div class="adm-card">
          <div class="adm39-row" style="justify-content:space-between;margin-bottom:6px"><div style="font-weight:700;font-size:.9rem">📝 Admin activity log</div><button class="adm-btn adm-btn-delete" id="adm39-audit-clear">Clear</button></div>
          <div class="adm39-log" id="adm39-audit-list"></div>
        </div>
        <div class="adm-card">
          <div class="adm39-row" style="justify-content:space-between;margin-bottom:6px"><div style="font-weight:700;font-size:.9rem">🔑 Sign-in log</div><button class="adm-btn adm-btn-delete" id="adm39-signin-clear">Clear</button></div>
          <div id="adm39-signin-summary" class="adm39-muted" style="margin-bottom:6px"></div>
          <div class="adm39-log" id="adm39-signin-list"></div>
        </div>
      </div>

      <!-- ── DATA TOOLS (v39) ─── -->
      <div class="adm-tab-panel" id="adm-panel-data">
        <div class="adm-section-title">🧰 Data Tools</div>
        <div class="adm-card" id="adm39-data-usage"></div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:6px">💾 Backup &amp; restore (this device)</div>
          <p class="adm39-muted" style="margin-bottom:10px">Export saves every TeenWork record on this device (accounts, settings, logs, user data) to one JSON file. Import restores a backup; existing records with the same name are replaced.</p>
          <div class="adm39-row">
            <button class="adm-btn adm-btn-reply" id="adm39-export-all">⬇️ Export full backup</button>
            <label class="adm-btn adm-btn-mark" style="cursor:pointer">⬆️ Import backup <input type="file" id="adm39-import-file" accept="application/json,.json" style="display:none"></label>
          </div>
        </div>
        <div class="adm-card adm39-danger">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:6px;color:var(--red)">⚠️ Danger zone</div>
          <div class="adm39-row">
            <button class="adm-btn adm-btn-delete" id="adm39-wipe-accounts">Delete ALL accounts on this device</button>
            <button class="adm-btn adm-btn-delete" id="adm39-wipe-logs">Clear all logs</button>
          </div>
        </div>
      </div>`;
  }

  function inject() {
    const panel = $('tw-admin-panel');
    if (!panel || panel.querySelector('#adm-panel-accounts')) return;
    const st = document.createElement('style'); st.textContent = STYLE; panel.appendChild(st);
    const tabs = panel.querySelector('.adm-tabs');
    const content = panel.querySelector('.adm-content');
    if (!tabs || !content) return;
    TABS.forEach(([id, label]) => {
      const b = document.createElement('button');
      b.className = 'adm-tab'; b.textContent = label;
      b.onclick = () => window.adminSwitchTab(id, b);
      tabs.appendChild(b);
    });
    const holder = document.createElement('div'); holder.innerHTML = panelsHTML();
    while (holder.firstChild) content.appendChild(holder.firstChild);
    wire();
    renderAll();
    loadCloudAccounts().then(() => { renderAccounts(); });
  }

  function renderAll() { renderAccounts(); renderRules(); renderAnnouncements(); renderSecurity(); renderData(); }

  /* ── ACCOUNTS ──────────────────────────────────────────────────── */
  function accountInfo(a) {
    const px = prefixFor(a._key);
    const keys = Object.keys(localStorage).filter(k => k.startsWith(px));
    let bytes = 0; keys.forEach(k => { bytes += (localStorage.getItem(k) || '').length; });
    const links = read('tw_parent_links', {});
    const link = links[String(a.email || '').toLowerCase()] || null;
    const tier = localStorage.getItem(px + 'acct_tier') || 'free';
    return { keys, bytes, link, tier };
  }
  function renderAccounts() {
    const list = $('adm39-acct-list'); if (!list) return;
    const q = ($('adm39-acct-search')?.value || '').trim().toLowerCase();
    const role = $('adm39-acct-role')?.value || '';
    const status = $('adm39-acct-status')?.value || '';
    const all = allAccounts();
    const byEmail = {}; all.forEach(a => { const e = String(a.email || '').toLowerCase(); byEmail[e] = (byEmail[e] || 0) + 1; });
    const t = { total: all.length, teen: 0, parent: 0, employer: 0, suspended: 0, cloud: 0, multi: 0 };
    all.forEach(a => { if (t[a.type] != null) t[a.type]++; if (a.suspended) t.suspended++; if (a.source === 'cloud') t.cloud++; });
    t.multi = Object.values(byEmail).filter(n => n > 1).length;
    const tiles = $('adm39-acct-tiles');
    if (tiles) tiles.innerHTML = [
      ['Accounts', t.total], ['Teens', t.teen], ['Parents', t.parent], ['Employers', t.employer], ['Suspended', t.suspended], ['Shared emails', t.multi], ['Cloud only', t.cloud],
    ].map(([l, v]) => `<div class="adm-stat"><div class="adm-stat-val">${v}</div><div class="adm-stat-label">${l}</div></div>`).join('');
    const cs = $('adm39-cloud-status'); if (cs) cs.textContent = cloudLoading ? 'Checking the cloud database…' : cloudStatus;

    const rows = all.filter(a => {
      if (role && a.type !== role) return false;
      if (status === 'active' && a.suspended) return false;
      if (status === 'suspended' && !a.suspended) return false;
      if (status === 'multi' && byEmail[String(a.email || '').toLowerCase()] < 2) return false;
      if (status === 'cloud' && a.source !== 'cloud') return false;
      if (q) { const hay = [a.name, a.email, a.city, a.state, a.type].join(' ').toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    });
    if (!rows.length) { list.innerHTML = '<div class="adm-empty">No accounts match.' + (all.length ? '' : ' Nobody has signed up on this device yet.') + '</div>'; return; }
    list.innerHTML = rows.map(a => {
      const age = ageFrom(a.dob);
      const shared = byEmail[String(a.email || '').toLowerCase()] > 1;
      const sub = [a.type ? a.type[0].toUpperCase() + a.type.slice(1) : 'Unknown role', age !== '' ? 'age ' + age : '', [a.city, a.state].filter(Boolean).join(', '), a.created ? 'joined ' + new Date(a.created).toLocaleDateString() : ''].filter(Boolean).join(' · ');
      return `<div class="adm39-acct${a.suspended ? ' suspended' : ''}" data-key="${esc(a._key)}" data-src="${a.source}">
        <div class="adm39-acct-head">
          <div class="adm39-avatar">${roleIcon[a.type] || '👤'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:.92rem">${esc(a.name || '(no name saved)')} ${a.slot > 1 ? `<span class="adm39-pill">account #${a.slot}</span>` : ''}</div>
            <div class="adm39-muted">${esc(a.email)} · ${esc(sub)}</div>
          </div>
          ${a.type ? `<span class="adm39-pill ${esc(a.type)}">${esc(a.type)}</span>` : ''}
          ${a.suspended ? '<span class="adm39-pill warn">suspended</span>' : ''}
          ${shared ? '<span class="adm39-pill">shared email</span>' : ''}
          ${a.source === 'cloud' ? '<span class="adm39-pill cloud">cloud</span>' : ''}
        </div>
        <div class="adm39-actions">
          <button class="adm-btn adm-btn-mark" data-act="details">🔍 Details</button>
          <button class="adm-btn adm-btn-mark" data-act="message">✉️ Message</button>
          ${a.source === 'device' ? `
            <button class="adm-btn adm-btn-mark" data-act="resetpw">🔑 Reset password</button>
            <button class="adm-btn ${a.suspended ? 'adm-btn-reply' : 'adm-btn-mark'}" data-act="suspend">${a.suspended ? '✅ Unsuspend' : '⛔ Suspend'}</button>
            <button class="adm-btn adm-btn-delete" data-act="delete">🗑 Delete</button>` : ''}
        </div>
        <div class="adm39-details" data-details style="display:none"></div>
      </div>`;
    }).join('');
  }
  function detailsHTML(a) {
    const info = accountInfo(a);
    const rows = [
      ['Name', esc(a.name || '—')], ['Email', esc(a.email)], ['Role', a.type ? `<select class="adm39-sel" data-role-sel style="padding:3px 8px">${['teen','parent','employer'].map(r => `<option value="${r}"${a.type === r ? ' selected' : ''}>${r}</option>`).join('')}</select> <button class="adm-btn adm-btn-mark" data-act="saverole" style="padding:3px 10px">Save role</button>` : '—'],
      ['Date of birth', esc(a.dob || '—') + (ageFrom(a.dob) !== '' ? ' (age ' + ageFrom(a.dob) + ')' : '')],
      ['Location', esc([a.city, a.state].filter(Boolean).join(', ') || '—')],
      ['Created', fmtDate(a.created)], ['Last sign-in', fmtDate(a.lastLogin)],
      ['Status', a.suspended ? `<span class="adm39-bad">Suspended</span> ${fmtDate(a.suspendedAt)}` : '<span class="adm39-ok">Active</span>'],
      ['Stored on', a.source === 'device' ? 'This device' + (cloudAccounts.some(c => c._key === a._key) ? ' + cloud' : '') : 'Cloud only (signed up on another device)'],
      ['Plan', esc(info.tier)],
      ['Parent link', info.link ? esc(info.link.status || '—') + (info.link.parentEmail ? ' · ' + esc(info.link.parentEmail) : '') : '—'],
      ['Saved data', info.keys.length + ' record' + (info.keys.length === 1 ? '' : 's') + ' · ' + (info.bytes / 1024).toFixed(1) + ' KB on this device'],
      ['Storage key', '<code>' + esc(a._key) + '</code>'],
    ];
    if (a.source === 'device') rows.splice(2, 0, []);
    return '<table>' + rows.filter(r => r.length).map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';
  }
  function findAccount(key) { return allAccounts().find(a => a._key === key); }
  function saveAccountChange(key, fn) {
    const all = _twLocalAccounts(); if (!all[key]) return false; fn(all[key]); _twSaveLocalAccounts(all); return true;
  }
  async function onAccountAction(act, key, card) {
    const a = findAccount(key); if (!a) return;
    if (act === 'details') {
      const d = card.querySelector('[data-details]');
      if (d.style.display === 'none') { d.innerHTML = detailsHTML(a); d.style.display = 'block'; } else d.style.display = 'none';
      return;
    }
    if (act === 'message') {
      const body = prompt('Message to ' + (a.name || a.email) + ' (shows as a banner the next time they open TeenWork):');
      if (!body || !body.trim()) return;
      const anns = read('tw_admin_announcements', []);
      anns.unshift({ id: uid(), title: 'Message from TeenWork', body: body.trim(), audience: 'one', to: a._key, toEmail: a.email, at: new Date().toISOString() });
      write('tw_admin_announcements', anns.slice(0, 300));
      audit('Sent message', a.email + (a.slot > 1 ? ' (#' + a.slot + ')' : ''));
      toast('✉️ Message queued for ' + (a.name || a.email));
      renderAnnouncements();
      return;
    }
    if (a.source !== 'device') { toast('That account lives on another device, so it can only be viewed or messaged here.', 'info'); return; }
    if (act === 'resetpw') {
      const pw = prompt('New password for ' + a.email + ' (at least 8 characters):');
      if (pw == null) return;
      if (pw.length < 8) { toast('Password must be at least 8 characters.', 'error'); return; }
      const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const hash = await _twHashPw(pw, salt);
      saveAccountChange(key, r => { r.salt = salt; r.hash = hash; r.pwResetAt = Date.now(); });
      audit('Reset password', a.email + (a.slot > 1 ? ' (#' + a.slot + ')' : ''));
      toast('🔑 Password updated for ' + a.email);
      return;
    }
    if (act === 'suspend') {
      const now = !a.suspended;
      if (now && !confirm('Suspend ' + (a.name || a.email) + '? They will not be able to sign in until you unsuspend them.')) return;
      saveAccountChange(key, r => { r.suspended = now; r.suspendedAt = now ? Date.now() : undefined; });
      audit(now ? 'Suspended account' : 'Unsuspended account', a.email + (a.slot > 1 ? ' (#' + a.slot + ')' : ''));
      toast(now ? '⛔ Account suspended' : '✅ Account unsuspended');
      renderAccounts();
      return;
    }
    if (act === 'saverole') {
      const sel = card.querySelector('[data-role-sel]'); const role = sel && sel.value;
      if (!TW_ACCOUNT_TYPES.includes(role)) { toast('Role must be teen, parent or employer.', 'error'); return; }
      if (role === a.type) { toast('Role unchanged.', 'info'); return; }
      saveAccountChange(key, r => { r.type = role; });
      audit('Changed role', a.email + ': ' + a.type + ' → ' + role);
      toast('✅ Role changed to ' + role);
      renderAccounts();
      return;
    }
    if (act === 'delete') {
      if (!confirm('Delete the ' + (a.type || '') + ' account for ' + a.email + '? This cannot be undone.')) return;
      const info = accountInfo(a);
      const wipeData = info.keys.length ? confirm('Also delete their saved data (' + info.keys.length + ' records) on this device?\n\nOK = delete data too · Cancel = keep the data') : false;
      const all = _twLocalAccounts(); delete all[key]; _twSaveLocalAccounts(all);
      if (wipeData) info.keys.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
      audit('Deleted account', a.email + (a.slot > 1 ? ' (#' + a.slot + ')' : '') + (wipeData ? ' + data' : ''));
      toast('🗑 Account deleted');
      renderAccounts();
    }
  }
  async function createAccount() {
    const name = ($('adm39-new-name').value || '').trim();
    const email = ($('adm39-new-email').value || '').trim();
    const role = $('adm39-new-role').value;
    const dob = $('adm39-new-dob').value || '';
    const city = ($('adm39-new-city').value || '').trim();
    const state = ($('adm39-new-state').value || '').trim();
    const pw = $('adm39-new-pw').value || '';
    if (!name || !email || !pw) { toast('Name, email and password are required.', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || ADMIN_LOGIN_ALIASES.includes(email.toLowerCase())) { toast('Please enter a real email address.', 'error'); return; }
    if (!TW_ACCOUNT_TYPES.includes(role)) { toast('Role must be teen, parent or employer.', 'error'); return; }
    if (pw.length < 8) { toast('Password must be at least 8 characters.', 'error'); return; }
    if (_twEmailBlocked(email)) { toast('That email is on the blocked list (Email Rules).', 'error'); return; }
    const existing = _twAccountsForEmail(email);
    let key = email.toLowerCase(), slot = 1;
    if (existing.length) {
      if (!confirm(email + ' already has ' + existing.length + ' account' + (existing.length === 1 ? '' : 's') + ' on this device. Create another one anyway?')) return;
      slot = Math.max(...existing.map(a => a.slot || 1)) + 1; key = email.toLowerCase() + '#' + slot;
    }
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const hash = await _twHashPw(pw, salt);
    const all = _twLocalAccounts();
    all[key] = { name, email, type: role, dob, city, state, salt, hash, created: Date.now(), slot, createdBy: 'admin' };
    _twSaveLocalAccounts(all);
    _twRegisterAccountInCloud(all[key], key);
    _twLogSignin({ email: email.toLowerCase(), type: role, ok: true, event: 'created-by-admin', slot });
    audit('Created account', email + ' (' + role + (slot > 1 ? ', #' + slot : '') + ')');
    ['adm39-new-name', 'adm39-new-email', 'adm39-new-dob', 'adm39-new-city', 'adm39-new-state', 'adm39-new-pw'].forEach(id => { $(id).value = ''; });
    toast('✅ Account created for ' + email);
    renderAccounts();
  }
  function exportCSV() {
    const rows = [['name', 'email', 'role', 'account_no', 'date_of_birth', 'age', 'city', 'state', 'created', 'last_sign_in', 'status', 'stored_on']];
    allAccounts().forEach(a => rows.push([a.name || '', a.email || '', a.type || '', a.slot || 1, a.dob || '', ageFrom(a.dob), a.city || '', a.state || '', a.created ? new Date(a.created).toISOString() : '', a.lastLogin ? new Date(a.lastLogin).toISOString() : '', a.suspended ? 'suspended' : 'active', a.source]));
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    download('teenwork-accounts-' + new Date().toISOString().slice(0, 10) + '.csv', csv, 'text/csv');
    audit('Exported accounts CSV', (rows.length - 1) + ' accounts');
  }
  function download(name, text, type) {
    try {
      const blob = new Blob([text], { type: type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 800);
    } catch (e) { toast('Download failed: ' + e.message, 'error'); }
  }

  /* ── EMAIL RULES ───────────────────────────────────────────────── */
  function cleanRule(v) {
    v = String(v || '').trim().toLowerCase();
    if (!v) return '';
    if (v.startsWith('@')) v = '*' + v;
    if (v.startsWith('*@')) return /^\*@[^\s@*]+\.[^\s@*]+$/.test(v) ? v : '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : '';
  }
  function renderRules() {
    const r = _twAdminRules();
    const maxEl = $('adm39-multi-max'); if (maxEl) maxEl.value = r.maxAccountsPerEmail || 5;
    const ml = $('adm39-multi-list');
    if (ml) ml.innerHTML = r.multiEmails.length ? r.multiEmails.map(e => {
      const n = e.startsWith('*@') ? localAccounts().filter(a => _twEmailMatchesRule(a.email, e)).length : _twAccountsForEmail(e).length;
      return `<div class="adm39-list-item"><span style="flex:1">${esc(e)} <span class="adm39-muted">· ${n} account${n === 1 ? '' : 's'} on this device</span></span><button class="adm-btn adm-btn-delete" data-rm-multi="${esc(e)}">Remove</button></div>`;
    }).join('') : '<div class="adm39-muted" style="padding:6px 0">No emails allowed yet. Every email can have one account.</div>';
    const bl = $('adm39-block-list');
    if (bl) bl.innerHTML = r.blockedEmails.length ? r.blockedEmails.map(e => `<div class="adm39-list-item"><span style="flex:1">${esc(e)}</span><button class="adm-btn adm-btn-mark" data-rm-block="${esc(e)}">Unblock</button></div>`).join('') : '<div class="adm39-muted" style="padding:6px 0">Nothing blocked.</div>';
  }
  function addRule(kind) {
    const inp = $(kind === 'multi' ? 'adm39-multi-input' : 'adm39-block-input');
    const v = cleanRule(inp.value);
    if (!v) { toast('Enter a full email (name@site.com) or a domain (*@site.com).', 'error'); return; }
    const r = _twAdminRules();
    const list = kind === 'multi' ? r.multiEmails : r.blockedEmails;
    if (list.includes(v)) { toast('Already on the list.', 'info'); return; }
    list.push(v); _twSaveAdminRules(r); inp.value = '';
    audit(kind === 'multi' ? 'Allowed multiple accounts' : 'Blocked email', v);
    toast(kind === 'multi' ? '✅ ' + v + ' can now have more than one account' : '🚫 ' + v + ' blocked from sign-up');
    renderRules();
  }
  function removeRule(kind, v) {
    const r = _twAdminRules();
    if (kind === 'multi') r.multiEmails = r.multiEmails.filter(x => x !== v); else r.blockedEmails = r.blockedEmails.filter(x => x !== v);
    _twSaveAdminRules(r);
    audit(kind === 'multi' ? 'Removed multi-account allowance' : 'Unblocked email', v);
    renderRules();
  }

  /* ── ANNOUNCEMENTS ─────────────────────────────────────────────── */
  function renderAnnouncements() {
    const el = $('adm39-ann-list'); if (!el) return;
    const anns = read('tw_admin_announcements', []);
    const audLabel = { all: 'Everyone', teen: 'Teens', parent: 'Parents', employer: 'Employers', one: 'One person' };
    el.innerHTML = anns.length ? anns.map(a => `<div class="adm39-list-item" style="align-items:flex-start"><span style="font-size:1.1rem">${a.to ? '✉️' : '📢'}</span><div style="flex:1;min-width:0"><div style="font-weight:700">${esc(a.title)} <span class="adm39-pill">${esc(a.to ? 'to ' + (a.toEmail || a.to) : (audLabel[a.audience] || a.audience))}</span></div><div class="adm39-muted" style="white-space:pre-wrap">${esc(a.body)}</div><div class="adm39-muted">${fmtDate(a.at)}</div></div><button class="adm-btn adm-btn-delete" data-rm-ann="${esc(a.id)}">Remove</button></div>`).join('') : '<div class="adm39-muted" style="padding:6px 0">No announcements yet.</div>';
  }
  function postAnnouncement() {
    const title = ($('adm39-ann-title').value || '').trim();
    const body = ($('adm39-ann-body').value || '').trim();
    const aud = $('adm39-ann-aud').value || 'all';
    if (!body) { toast('Please write a message first.', 'error'); return; }
    const anns = read('tw_admin_announcements', []);
    anns.unshift({ id: uid(), title: title || 'Announcement', body, audience: aud, at: new Date().toISOString() });
    write('tw_admin_announcements', anns.slice(0, 300));
    $('adm39-ann-title').value = ''; $('adm39-ann-body').value = '';
    audit('Posted announcement', (title || 'Announcement') + ' → ' + aud);
    toast('📢 Announcement posted');
    renderAnnouncements();
  }

  /* ── SECURITY & LOG ────────────────────────────────────────────── */
  function renderSecurity() {
    const el = $('adm39-sec-login');
    if (el) {
      const rec = _twAdminPwRecord();
      el.innerHTML = `
        <div style="font-weight:700;font-size:.9rem;margin-bottom:6px">🔑 Admin sign-in</div>
        <p class="adm39-muted">Sign in on the normal <strong>Sign In</strong> page with <strong>${esc(ADMIN_EMAIL)}</strong> (or just <strong>admin</strong>) and the admin password.
        Password in use on this device: ${rec.custom ? '<span class="adm39-ok">custom password</span> set ' + fmtDate(rec.at) : '<span class="adm39-ok">built-in password</span> (from the app file)'}.</p>
        <div class="adm39-row" style="margin-top:10px">
          <input id="adm39-pw1" class="adm39-in" type="password" placeholder="New admin password (12+ characters)" style="flex:1;min-width:200px" autocomplete="new-password">
          <input id="adm39-pw2" class="adm39-in" type="password" placeholder="Repeat it" style="flex:1;min-width:140px" autocomplete="new-password">
          <button class="adm-btn adm-btn-reply" id="adm39-pw-save">Change admin password</button>
          ${rec.custom ? '<button class="adm-btn adm-btn-mark" id="adm39-pw-reset">Back to built-in</button>' : ''}
        </div>
        <p class="adm39-muted" style="margin-top:8px">A changed password is saved (hashed) in this browser and works here right away. To make it the built-in password on every device, open the app file, find <code>ADMIN_PW_SALT</code> / <code>ADMIN_PW_HASH</code> in the CONFIG section and paste these two lines:</p>
        <div id="adm39-pw-lines">${rec.custom ? `<code class="adm39-code">const ADMIN_PW_SALT = '${esc(rec.salt)}';\nconst ADMIN_PW_HASH = '${esc(rec.hash)}';</code>` : '<span class="adm39-muted">(appears after you change the password)</span>'}</div>`;
      el.querySelector('#adm39-pw-save').onclick = changeAdminPassword;
      const rs = el.querySelector('#adm39-pw-reset'); if (rs) rs.onclick = () => { if (!confirm('Go back to the built-in admin password on this device?')) return; localStorage.removeItem('tw_admin_pw'); audit('Admin password', 'reset to built-in'); toast('Built-in admin password is active again.'); renderSecurity(); };
    }
    const al = $('adm39-audit-list');
    if (al) { const log = read('tw_admin_audit', []); al.innerHTML = log.length ? log.slice(0, 150).map(e => `<div><time>${fmtDate(e.at)}</time><span><strong>${esc(e.action)}</strong>${e.detail ? ' · ' + esc(e.detail) : ''}</span></div>`).join('') : '<div class="adm39-muted">Nothing logged yet.</div>'; }
    const sl = $('adm39-signin-list');
    if (sl) {
      const log = read('tw_signin_log', []);
      const fails = log.filter(e => !e.ok).length, adminFails = log.filter(e => e.event === 'admin-wrong-password').length;
      const sum = $('adm39-signin-summary'); if (sum) sum.textContent = log.length + ' events · ' + fails + ' failed sign-ins · ' + adminFails + ' wrong admin password attempts';
      const label = { login: 'Signed in', signup: 'Signed up', 'wrong-password': 'Wrong password', suspended: 'Blocked (suspended)', 'admin-wrong-password': 'Wrong admin password', 'created-by-admin': 'Created by admin' };
      sl.innerHTML = log.length ? log.slice(0, 150).map(e => `<div><time>${fmtDate(e.at)}</time><span class="${e.ok ? 'adm39-ok' : 'adm39-bad'}">${esc(label[e.event] || e.event)}</span><span>${esc(e.email || '')}${e.type ? ' · ' + esc(e.type) : ''}${e.slot > 1 ? ' #' + e.slot : ''}</span></div>`).join('') : '<div class="adm39-muted">No sign-ins logged yet.</div>';
    }
  }
  async function changeAdminPassword() {
    const p1 = $('adm39-pw1').value, p2 = $('adm39-pw2').value;
    if (p1.length < 12) { toast('Use at least 12 characters for the admin password.', 'error'); return; }
    if (p1 !== p2) { toast('The two passwords do not match.', 'error'); return; }
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
    const hash = await _twHashPw(p1, salt);
    write('tw_admin_pw', { salt, hash, at: new Date().toISOString() });
    audit('Admin password', 'changed on this device');
    toast('🔐 Admin password changed. Use it from now on.');
    renderSecurity();
  }

  /* ── DATA TOOLS ────────────────────────────────────────────────── */
  function twKeys() { return Object.keys(localStorage).filter(k => k.startsWith('tw_')); }
  function renderData() {
    const el = $('adm39-data-usage'); if (!el) return;
    const keys = twKeys(); let bytes = 0; keys.forEach(k => { bytes += (localStorage.getItem(k) || '').length; });
    const groups = { accounts: 0, admin: 0, users: 0 };
    keys.forEach(k => { if (k === 'tw_local_accounts') groups.accounts++; else if (k.startsWith('tw_admin_') || k === 'tw_signin_log') groups.admin++; else groups.users++; });
    el.innerHTML = `<div style="font-weight:700;font-size:.9rem;margin-bottom:8px">📦 Storage on this device</div>
      <div class="adm39-grid">
        <div class="adm-stat"><div class="adm-stat-val">${keys.length}</div><div class="adm-stat-label">Records</div></div>
        <div class="adm-stat"><div class="adm-stat-val">${(bytes / 1024).toFixed(0)}</div><div class="adm-stat-label">KB used</div></div>
        <div class="adm-stat"><div class="adm-stat-val">${localAccounts().length}</div><div class="adm-stat-label">Accounts</div></div>
        <div class="adm-stat"><div class="adm-stat-val">${groups.admin}</div><div class="adm-stat-label">Admin records</div></div>
      </div>
      <p class="adm39-muted">Browsers allow roughly 5,000 KB per site. Cloud sync: ${sb() ? '<span class="adm39-ok">connected</span>' : '<span class="adm39-bad">not connected on this page</span>'}.</p>`;
  }
  function exportAll() {
    const out = { app: 'TeenWork', version: 'v39', exported: new Date().toISOString(), records: {} };
    twKeys().forEach(k => { out.records[k] = localStorage.getItem(k); });
    download('teenwork-backup-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json', JSON.stringify(out, null, 2), 'application/json');
    audit('Exported full backup', Object.keys(out.records).length + ' records');
  }
  function importAll(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const data = JSON.parse(fr.result);
        const recs = data && data.records; if (!recs || typeof recs !== 'object') throw new Error('not a TeenWork backup');
        const n = Object.keys(recs).filter(k => k.startsWith('tw_')).length;
        if (!confirm('Restore ' + n + ' records from this backup? Records with the same name on this device will be replaced.')) return;
        Object.keys(recs).forEach(k => { if (k.startsWith('tw_') && typeof recs[k] === 'string') localStorage.setItem(k, recs[k]); });
        audit('Imported backup', n + ' records from ' + (file.name || 'file'));
        toast('✅ Backup restored (' + n + ' records)');
        renderAll();
      } catch (e) { toast('That file is not a TeenWork backup (' + e.message + ').', 'error'); }
    };
    fr.readAsText(file);
  }

  /* ── wiring ────────────────────────────────────────────────────── */
  function wire() {
    const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
    ['adm39-acct-search', 'adm39-acct-role', 'adm39-acct-status'].forEach(id => { on(id, 'input', renderAccounts); on(id, 'change', renderAccounts); });
    on('adm39-acct-refresh', 'click', () => { renderAccounts(); loadCloudAccounts().then(renderAccounts); });
    on('adm39-acct-export', 'click', exportCSV);
    on('adm39-new-create', 'click', createAccount);
    on('adm39-acct-list', 'click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const card = b.closest('.adm39-acct'); if (!card) return;
      onAccountAction(b.getAttribute('data-act'), card.getAttribute('data-key'), card);
    });
    on('adm39-multi-add', 'click', () => addRule('multi'));
    on('adm39-multi-input', 'keydown', e => { if (e.key === 'Enter') addRule('multi'); });
    on('adm39-block-add', 'click', () => addRule('block'));
    on('adm39-block-input', 'keydown', e => { if (e.key === 'Enter') addRule('block'); });
    on('adm39-multi-max', 'change', e => { const r = _twAdminRules(); const n = Math.max(2, Math.min(50, parseInt(e.target.value) || 5)); r.maxAccountsPerEmail = n; _twSaveAdminRules(r); e.target.value = n; audit('Max accounts per email', String(n)); toast('Max accounts per allowed email: ' + n); });
    on('adm39-multi-list', 'click', e => { const b = e.target.closest('[data-rm-multi]'); if (b) removeRule('multi', b.getAttribute('data-rm-multi')); });
    on('adm39-block-list', 'click', e => { const b = e.target.closest('[data-rm-block]'); if (b) removeRule('block', b.getAttribute('data-rm-block')); });
    on('adm39-ann-send', 'click', postAnnouncement);
    on('adm39-ann-list', 'click', e => { const b = e.target.closest('[data-rm-ann]'); if (!b) return; const id = b.getAttribute('data-rm-ann'); write('tw_admin_announcements', read('tw_admin_announcements', []).filter(a => a.id !== id)); audit('Removed announcement', id); renderAnnouncements(); });
    on('adm39-audit-clear', 'click', () => { if (!confirm('Clear the admin activity log?')) return; localStorage.removeItem('tw_admin_audit'); audit('Cleared admin activity log'); renderSecurity(); });
    on('adm39-signin-clear', 'click', () => { if (!confirm('Clear the sign-in log?')) return; localStorage.removeItem('tw_signin_log'); audit('Cleared sign-in log'); renderSecurity(); });
    on('adm39-export-all', 'click', exportAll);
    on('adm39-import-file', 'change', e => { importAll(e.target.files && e.target.files[0]); e.target.value = ''; });
    on('adm39-wipe-accounts', 'click', () => {
      const n = localAccounts().length;
      if (!n) { toast('There are no accounts on this device.', 'info'); return; }
      if (!confirm('Delete ALL ' + n + ' accounts saved on this device? People will have to sign up again.')) return;
      if (prompt('Type DELETE to confirm:') !== 'DELETE') { toast('Cancelled.', 'info'); return; }
      localStorage.removeItem('tw_local_accounts');
      audit('Deleted ALL accounts on this device', n + ' accounts');
      toast('🗑 All accounts deleted');
      renderAll();
    });
    on('adm39-wipe-logs', 'click', () => { if (!confirm('Clear the admin activity log and the sign-in log?')) return; localStorage.removeItem('tw_signin_log'); localStorage.removeItem('tw_admin_audit'); audit('Cleared all logs'); renderSecurity(); });
  }

  /* ── hook into the existing admin panel ─────────────────────────── */
  const _oLaunchAdmin = window.launchAdminPanel;
  window.launchAdminPanel = function () {
    if (!isAdmin()) { try { showToast('Admin sign-in required.', 'error'); } catch (e) {} return; }
    const r = _oLaunchAdmin ? _oLaunchAdmin.apply(this, arguments) : undefined;
    try { inject(); } catch (e) { console.warn('v39 admin inject failed', e); }
    return r;
  };
  const _oSwitch = window.adminSwitchTab;
  window.adminSwitchTab = function (name, btn) {
    const r = _oSwitch ? _oSwitch.apply(this, arguments) : undefined;
    try {
      if (name === 'accounts') renderAccounts();
      if (name === 'rules') renderRules();
      if (name === 'announce') renderAnnouncements();
      if (name === 'security') renderSecurity();
      if (name === 'data') renderData();
    } catch (e) {}
    return r;
  };
  const _oAdminOut = window.adminSignOut;
  window.adminSignOut = function () {
    audit('Signed out');
    const r = _oAdminOut ? _oAdminOut.apply(this, arguments) : undefined;
    window.currentUser = null; try { currentUser = null; } catch (e) {}
    return r;
  };

  /* ── announcement banners on dashboards ─────────────────────────── */
  function showAnnouncementsFor(u) {
    if (!u || u.isAdmin || !TW_ACCOUNT_TYPES.includes(u.type)) return;
    const anns = read('tw_admin_announcements', []);
    if (!anns.length) return;
    const key = u.dataKey || String(u.email || '').toLowerCase();
    const dKey = prefixFor(key) + 'dismissed_ann';
    const dismissed = read(dKey, []);
    const mine = anns.filter(a => !dismissed.includes(a.id) && (a.to ? a.to === key : (a.audience === 'all' || a.audience === u.type)));
    document.getElementById('tw39-ann')?.remove();
    if (!mine.length) return;
    const page = document.querySelector('.page.active .dashboard') || document.querySelector('.page.active');
    if (!page) return;
    const box = document.createElement('div'); box.id = 'tw39-ann';
    box.style.cssText = 'display:grid;gap:10px;margin:0 0 1.2rem;';
    box.innerHTML = mine.map(a => `<div data-ann="${esc(a.id)}" style="background:linear-gradient(135deg,var(--green-pale,#d8f3dc),var(--card,#fff));border:1.5px solid var(--green-light,#95d5b2);border-radius:14px;padding:12px 16px;display:flex;gap:12px;align-items:flex-start;font-family:'DM Sans',sans-serif">
        <span style="font-size:1.4rem;line-height:1">${a.to ? '✉️' : '📢'}</span>
        <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:.95rem;color:var(--green)">${esc(a.title || 'Announcement')}</div><div style="font-size:.86rem;color:var(--text);line-height:1.5;white-space:pre-wrap">${esc(a.body)}</div><div style="font-size:.72rem;color:var(--muted);margin-top:4px">${esc(fmtDate(a.at))} · TeenWork team</div></div>
        <button type="button" data-dismiss="${esc(a.id)}" aria-label="Dismiss" style="background:none;border:none;font-size:1.1rem;color:var(--muted);cursor:pointer;line-height:1">✕</button></div>`).join('');
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-dismiss]'); if (!b) return;
      const id = b.getAttribute('data-dismiss'); const d = read(dKey, []); if (!d.includes(id)) { d.push(id); write(dKey, d); }
      b.closest('[data-ann]').remove(); if (!box.children.length) box.remove();
    });
    const hdr = page.querySelector('.dash-header');
    if (hdr && hdr.parentNode === page) page.insertBefore(box, hdr.nextSibling); else page.insertBefore(box, page.firstChild);
  }
  const _oLaunchDash = window.launchDashboard;
  window.launchDashboard = function () {
    const r = _oLaunchDash ? _oLaunchDash.apply(this, arguments) : undefined;
    setTimeout(() => { try { showAnnouncementsFor(window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null)); } catch (e) {} }, 700);
    return r;
  };
  window._twShowAnnouncements = () => showAnnouncementsFor(window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null));
})();
