
/* ═══════════════════════════════════════════════════════════════════
   v39 · NO DEMO DATA IN THE ADMIN PANEL  (2026-10-14, Aya's request)
   • 👥 Contacts now lists the real accounts (this device + the cloud
     database) instead of the five sample people. "Send Message"
     reaches a real account: a banner the next time they open TeenWork
     on this device and, when Supabase is connected, a chat message
     from "TeenWork Admin" through the shared `messages` table.
     Replies people send to TeenWork Admin show under the form.
   • ⭐ Reviews lists only reviews people actually left or the admin
     added. The four sample reviews are gone, and no review rating is
     written into the page's Google data while there are none.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const sb = () => (typeof sbClient !== 'undefined' && sbClient) ? sbClient : null;
  const toast = (m, t) => { try { showToast(m, t || 'info'); } catch (e) {} };
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmt = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const ROLES = ['teen', 'parent', 'employer'];
  const ADMIN_KEY = 'admin', ADMIN_NAME = 'TeenWork Admin';
  const isAdminEmail = e => { try { return _twIsAdminEmail(e); } catch (x) { return false; } };

  /* 1. Reviews: only the ones that really exist ───────────────────── */
  window._getReviews = function () {
    try { const s = localStorage.getItem('tw_admin_reviews'); const v = s ? JSON.parse(s) : []; return Array.isArray(v) ? v : []; } catch (e) { return []; }
  };
  const _oSchema = window._injectReviewSchema;
  window._injectReviewSchema = function (reviews) {
    const published = (Array.isArray(reviews) ? reviews : []).filter(r => r && r.published);
    if (!published.length) { document.getElementById('tw-review-schema')?.remove(); return; }
    return _oSchema ? _oSchema.apply(this, arguments) : undefined;
  };

  /* 2. Contacts: real accounts from this device and the cloud ─────── */
  let cloudAccounts = [], cloudNote = '', cloudLoadedAt = 0, loading = false;
  function localContacts() {
    let all = {}; try { all = _twLocalAccounts() || {}; } catch (e) {}
    return Object.keys(all).filter(k => all[k] && (ROLES.includes(all[k].type) || !isAdminEmail(all[k].email || k)) && !(window._twClosed && window._twClosed.has(k))).map(k => {
      const a = all[k];
      return { id: k, key: k, name: a.name || a.email || k, email: a.email || k.split('#')[0], role: ROLES.includes(a.type) ? a.type : 'teen',
        slot: a.slot || (k.includes('#') ? (parseInt(k.split('#')[1]) || 1) : 1), suspended: !!a.suspended, source: 'device', created: a.created || 0 };
    });
  }
  async function loadCloud() {
    const client = sb();
    if (!client) { cloudAccounts = []; cloudNote = 'Cloud database not connected on this page, so only accounts saved on this device are listed.'; cloudLoadedAt = Date.now(); return; }
    loading = true;
    try {
      const { data, error } = await client.from('user_data').select('email,value,updated_at').eq('key', 'account_profile').limit(2000);
      if (error) throw error;
      cloudAccounts = (data || []).map(r => {
        let v = {}; try { v = JSON.parse(r.value || '{}'); } catch (e) {}
        const key = String(r.email || ''); const email = v.email || key.split('#')[0];
        return { id: key, key, name: v.name || email, email, role: ROLES.includes(v.type) ? v.type : '', slot: v.slot || 1, suspended: false, source: 'cloud', created: v.created || 0 };
      }).filter(c => c.key && c.role && !(window._twClosed && window._twClosed.has(c.key)));
      cloudNote = cloudAccounts.length + ' account' + (cloudAccounts.length === 1 ? '' : 's') + ' found in the cloud database.';
    } catch (e) { cloudAccounts = []; cloudNote = 'Could not read the cloud database: ' + String(e && e.message || e).slice(0, 120); }
    loading = false; cloudLoadedAt = Date.now();
  }
  function allContacts() {
    const local = localContacts(); const seen = new Set(local.map(c => c.key));
    const list = local.concat(cloudAccounts.filter(c => !seen.has(c.key))).sort((a, b) => (b.created || 0) - (a.created || 0));
    try { _adminAllContacts.length = 0; list.forEach(c => _adminAllContacts.push(c)); } catch (e) {}   // older code keeps reading this list
    return list;
  }

  window.adminRenderContacts = function () {
    const listEl = document.getElementById('adm-contacts-list'), selEl = document.getElementById('adm-msg-to');
    if (!listEl || !selEl) return;
    const list = allContacts();
    const q = (document.getElementById('adm-contact-search')?.value || '').toLowerCase();
    const role = document.getElementById('adm-contact-role')?.value || '';
    const filtered = list.filter(c => (!role || c.role === role) && (!q || String(c.name).toLowerCase().includes(q) || String(c.email).toLowerCase().includes(q)));
    const roleBg = { teen: 'var(--green-pale)', parent: 'var(--blue-pale)', employer: 'var(--amber-pale)' };
    const roleText = { teen: 'var(--green)', parent: 'var(--blue)', employer: 'var(--amber)' };
    const note = cloudNote || (sb() ? 'Loading accounts from the cloud database…' : 'Cloud database not connected on this page, so only accounts saved on this device are listed.');
    const head = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.76rem;color:var(--muted);margin-bottom:8px"><span>${list.length} real account${list.length === 1 ? '' : 's'} · ${esc(note)}</span><button type="button" class="adm-btn adm-btn-mark" style="font-size:.7rem;padding:2px 8px" onclick="adminRefreshContacts()">↻ Refresh</button></div>`;
    if (!filtered.length) {
      listEl.innerHTML = head + '<div class="adm-empty">' + (list.length ? 'No accounts match.' : 'No accounts yet. Real sign-ups appear here.') + '</div>';
    } else {
      listEl.innerHTML = head + filtered.map(c => `
      <div class="adm-card" style="margin-bottom:8px;padding:12px 14px;display:flex;align-items:center;gap:12px;${c.suspended ? 'opacity:.6' : ''}">
        <div style="width:36px;height:36px;border-radius:50%;background:${roleBg[c.role] || 'var(--bg)'};display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:${roleText[c.role] || 'var(--muted)'};flex-shrink:0;">${esc(String(c.name).split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase())}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:.88rem;">${esc(c.name)}${c.slot > 1 ? ' <span style="font-size:.72rem;color:var(--muted)">#' + c.slot + '</span>' : ''}</div>
          <div style="font-size:.76rem;color:var(--muted);">${esc(c.email)} · ${c.source === 'cloud' ? 'cloud' : 'this device'}${c.suspended ? ' · <span style="color:var(--red)">suspended</span>' : ''}</div>
        </div>
        <span class="adm-msg-badge ${esc(c.role)}">${esc(c.role)}</span>
        <button type="button" class="adm-btn adm-btn-reply" style="font-size:.72rem;" data-key="${esc(c.key)}" onclick="adminPreFillMsg(this.getAttribute('data-key'))">Message</button>
      </div>`).join('');
    }
    selEl.innerHTML = filtered.map(c => `<option value="${esc(c.key)}">${esc(c.name)} (${esc(c.role)}${c.slot > 1 ? ' #' + c.slot : ''}) · ${esc(c.email)}</option>`).join('');
    if (!cloudLoadedAt && !loading) loadCloud().then(() => { if (document.getElementById('adm-contacts-list')) window.adminRenderContacts(); });
    renderReplies();
  };
  window.adminRefreshContacts = function () { cloudLoadedAt = 0; window.adminRenderContacts(); };
  window.addEventListener('tw-supabase-ready', () => { cloudLoadedAt = 0; if (document.getElementById('adm-contacts-list')) window.adminRenderContacts(); });

  /* 3. Send Message: a banner on this device + a chat message through the cloud */
  window.adminSendToContact = async function () {
    const selEl = document.getElementById('adm-msg-to'), bodyEl = document.getElementById('adm-msg-body'), sentEl = document.getElementById('adm-contact-sent');
    if (!selEl || !bodyEl) return;
    const key = selEl.value, body = bodyEl.value.trim();
    if (!key) { toast('Pick an account first. Real accounts appear in the list as people sign up.', 'error'); return; }
    if (!body) { toast('Please type a message first.', 'error'); return; }
    const c = allContacts().find(x => x.key === key);
    if (!c) { toast('That account is no longer listed.', 'error'); return; }
    const anns = read('tw_admin_announcements', []);
    anns.unshift({ id: uid(), title: 'Message from TeenWork', body, audience: 'one', to: c.key, toEmail: c.email, at: new Date().toISOString() });
    write('tw_admin_announcements', Array.isArray(anns) ? anns.slice(0, 300) : []);
    let viaCloud = false, cloudErr = '';
    const client = sb();
    if (client) {
      try {
        const { error } = await client.from('messages').insert([{ from_key: ADMIN_KEY, from_name: ADMIN_NAME, from_role: 'admin', to_key: c.key, to_name: c.name, to_role: c.role, text: body }]);
        if (error) throw error; viaCloud = true;
      } catch (e) { cloudErr = String(e && e.message || e).slice(0, 120); }
    }
    try { _twAdminAudit('Sent message', c.email + (c.slot > 1 ? ' (#' + c.slot + ')' : '') + (viaCloud ? ' · chat + banner' : ' · banner on this device')); } catch (e) {}
    bodyEl.value = '';
    if (sentEl) { sentEl.style.display = 'inline'; setTimeout(() => { sentEl.style.display = 'none'; }, 2500); }
    if (viaCloud) toast('✉️ Message sent to ' + c.name + ' (in their chat, plus a banner on this device)', 'success');
    else if (cloudErr) toast('⚠️ Banner queued for ' + c.name + ', but the chat message was not delivered: ' + cloudErr, 'error');
    else toast('✉️ Banner queued for ' + c.name + ' on this device. Connect Supabase to reach them on other devices.', 'success');
    try { if (typeof window.adminRenderAnnouncements === 'function') window.adminRenderAnnouncements(); } catch (e) {}
    renderReplies();
  };

  /* 4. Replies people send to TeenWork Admin ───────────────────────── */
  async function renderReplies() {
    const host = document.getElementById('adm-panel-contacts'); if (!host) return;
    let box = document.getElementById('adm39-admin-inbox');
    if (!box) {
      box = document.createElement('div'); box.id = 'adm39-admin-inbox'; box.className = 'adm-card'; box.style.marginTop = '14px'; host.appendChild(box);
      box.addEventListener('click', e => {
        const b = e.target.closest('[data-reply-key]'); if (!b) return;
        const key = b.getAttribute('data-reply-key'), name = b.getAttribute('data-reply-name') || key;
        const selEl = document.getElementById('adm-msg-to'); if (!selEl) return;
        if (![...selEl.options].some(o => o.value === key)) { const o = document.createElement('option'); o.value = key; o.textContent = name + ' · ' + key.split('#')[0]; selEl.appendChild(o); }
        selEl.value = key; document.getElementById('adm-msg-body')?.focus();
      });
    }
    const title = '<div style="font-weight:700;font-size:.9rem;margin-bottom:8px">📥 Replies to TeenWork Admin</div>';
    const client = sb();
    if (!client) { box.innerHTML = title + '<div style="font-size:.8rem;color:var(--muted)">Connect Supabase to see replies people send to TeenWork Admin from their chat.</div>'; return; }
    try {
      const { data, error } = await client.from('messages').select('*').eq('to_key', ADMIN_KEY).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      const rows = data || [];
      box.innerHTML = title + (rows.length ? rows.map(r => `
        <div style="padding:8px 0;border-top:1px solid var(--border);font-size:.84rem">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><strong>${esc(r.from_name || r.from_key)}</strong><span class="adm-msg-badge ${esc(r.from_role || 'teen')}">${esc(r.from_role || '')}</span><span style="margin-left:auto;font-size:.72rem;color:var(--muted)">${esc(fmt(r.created_at))}</span></div>
          <div style="white-space:pre-wrap;line-height:1.5">${esc(r.text)}</div>
          <button type="button" class="adm-btn adm-btn-reply" style="font-size:.7rem;margin-top:4px" data-reply-key="${esc(r.from_key)}" data-reply-name="${esc(r.from_name || '')}">Reply</button>
        </div>`).join('') : '<div style="font-size:.8rem;color:var(--muted)">No replies yet. When someone answers a message from TeenWork Admin in their chat, it shows here.</div>');
    } catch (e) { box.innerHTML = title + '<div style="font-size:.8rem;color:var(--muted)">Could not load replies: ' + esc(String(e && e.message || e).slice(0, 120)) + '</div>'; }
  }
})();
