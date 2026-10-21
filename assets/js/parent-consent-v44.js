
/* ═══════════════════════════════════════════════════════════════════
   v44 · PARENT CONSENT COMES FROM THE PARENT'S ACCOUNT  (2026-10-16)
   Aya: "dont have the parent consent in teen account have that agree
   stuff in parent that auto gives teens the badge but teens might fake
   stuff"
   Before: step 2 of the teen's Verification page was the consent form.
   The teen typed any name and email, ticked "I confirm I am the parent"
   and got the 👪 Parent Approved badge (Tier 2) on the spot.
   Now:
   • Teens see no form. Step 2 says who has to agree and shows the
     status. Only a linked parent's agreement gives the badge.
   • A linked parent agrees in their own account: a banner on their
     dashboard, a "Review & agree" button on each My Teens card, or
     step 2 of their Verification page. Three statements to tick, their
     typed name as signature, relationship. They can withdraw it later
     (also done for them when they unlink the teen) and the teen loses
     the badge. The parent gets a receipt email.
   • Saved in Supabase user_data:
       <parent>/consent:<teen key>   the agreement {status given|withdrawn, …}
       <teen>/parent_link .consents[<parent email>]   a copy on the teen's link
     The teen's app counts only a "given" row saved under a parent who is
     linked and approved on the teen's own parent_link, so nothing the
     teen does in their own account turns the badge on.
   • The teen's app checks on sign-in, on the Verification page, on
     "Check again", every 30 s while waiting and every 2 min after, and
     shows a toast when the badge arrives or goes.
   • Tester teens (tester-accounts-v44) don't need consent to move on:
     step 3 opens without it. The badge still needs a parent's OK.
   • Demo logins: the demo parent can agree for the sample teen; it is
     kept in this tab only (sessionStorage), like other demo data.
   Needs real-data-v43 (linked teens) before it. Wraps functions only;
   no base code is edited.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twParentConsent44) return;
  window.__twParentConsent44 = true;

  const ROLES = ['teen', 'parent', 'employer'];
  const RELS = ['Parent', 'Legal Guardian', 'Foster Parent'];
  const DEMO_TEEN = { key: 'teen@teenwork.demo', email: 'teen@teenwork.demo', name: 'Alex Johnson' };
  const DEMO_PARENT = { email: 'parent@teenwork.demo', name: 'Jamie Johnson' };
  const DEMO_KEY = 'tw_demo_parent_consent';
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const isReal = u => !!(u && !isDemoUser(u) && !u.isAdmin && ROLES.includes(u.type) && /@/.test(String(u.email || '')));
  const as = type => { const u = me(); return u && !u.isAdmin && u.type === type ? u : null; };
  const isTester = u => { try { return !!(window._twIsTesterUser && window._twIsTesterUser(u)); } catch (e) { return false; } };
  const emailOf = u => String((u && u.email) || '').trim().toLowerCase();
  const rowKeyOf = u => (u ? String(u.dataKey || u.email || '') : '');          // the user_data "email" column _DB uses
  const baseEmail = k => String(k || '').trim().toLowerCase().replace(/#\d+$/, '');   // "mom@x.com#2" = an extra account on that email
  // The inbox an address really reaches (Gmail ignores dots and "+anything"), so teen+mom@gmail.com is the teen's own inbox.
  function inboxOf(e) {
    e = baseEmail(e); const at = e.lastIndexOf('@'); if (at < 1) return e;
    let local = e.slice(0, at), dom = e.slice(at + 1);
    if (dom === 'gmail.com' || dom === 'googlemail.com') { local = local.split('+')[0].replace(/\./g, ''); dom = 'gmail.com'; }
    return local + '@' + dom;
  }
  // A parent account on the teen's own inbox can't give consent (tester accounts excepted, so Aya can test with +names).
  const ownInbox = (parentEmail, teenEmail, tester) => !tester && inboxOf(parentEmail) === inboxOf(teenEmail);
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const readJSON = (k, d) => { try { const v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch (e) { return d; } };
  const parse = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; } };
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
  const teenLabel = t => (t && (t.name || t.email)) || 'your teen';
  const toast = (m, t) => { try { showToast(m, t || 'success'); } catch (e) {} };
  const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  const enc = s => encodeURIComponent(String(s || '')).replace(/'/g, '%27');
  const later = (fn, ms) => setTimeout(() => { try { const r = fn(); if (r && r.catch) r.catch(e => console.warn('parent-consent:', e)); } catch (e) { console.warn('parent-consent:', e); } }, ms || 0);
  const STATEMENTS = t => {
    const name = teenLabel(t), first = firstName(name) || 'my teen';
    return ['I am the parent or legal guardian of ' + name + '.',
      'I understand I can withdraw this consent and block any job application at any time.',
      'I agree that TeenWork may share ' + first + "'s first name and verified age with approved employers only."];
  };
  const demoGet = () => { try { const v = JSON.parse(sessionStorage.getItem(DEMO_KEY)); return v && v.status === 'given' ? v : null; } catch (e) { return null; } };
  const demoSet = v => { try { if (v) sessionStorage.setItem(DEMO_KEY, JSON.stringify(v)); else sessionStorage.removeItem(DEMO_KEY); } catch (e) {} };

  /* ── cloud (user_data) ──────────────────────────────────────────── */
  async function client() {
    try { if (typeof _twCloudClient === 'function') return await _twCloudClient(3000); } catch (e) {}
    try { return (typeof sbClient !== 'undefined' && sbClient) || null; } catch (e) { return null; }
  }
  // rows(q => q.eq(...)) → array of {email,key,value}, or null when offline / failed
  async function rows(build) {
    const c = await client(); if (!c) return null;
    try { const r = await build(c.from('user_data').select('email,key,value')); return r && !r.error ? (r.data || []) : null; } catch (e) { return null; }
  }
  async function put(email, key, value) {
    if (!email) return false;
    const c = await client(); if (!c) return false;
    try {
      const r = await c.from('user_data').upsert({ email, key, value: JSON.stringify(value), updated_at: new Date().toISOString() }, { onConflict: 'email,key' });
      return !(r && r.error);
    } catch (e) { return false; }
  }
  const cacheKey = (rowKey, key) => 'tw_' + String(rowKey).replace(/[^a-z0-9]/gi, '_') + '_' + key;   // where _DB keeps its copy of a row

  // A parent counts only while the teen's own link is approved and names them.
  function linkParents(link) {
    if (!link || link.status !== 'approved') return [];
    return [...new Set((link.parents || []).concat(link.parentEmail ? [link.parentEmail] : []).map(baseEmail).filter(Boolean))];
  }

  /* ── parent side ────────────────────────────────────────────────── */
  const pConsent = {};            // teen key → this parent's consent record (given or withdrawn)
  let pOwner = '', pFetchedAt = 0, pFetching = false;
  const hidden = {};              // banner "Later" for this sign-in: teen key → true
  function parentTeens(u) {
    if (!u || u.type !== 'parent') return [];
    if (isDemoUser(u)) return [Object.assign({}, DEMO_TEEN)];
    try { return (window._twRealData && window._twRealData.linkedTeens()) || []; } catch (e) { return []; }
  }
  function loadParent(u) {
    if (pOwner !== rowKeyOf(u)) { Object.keys(pConsent).forEach(k => delete pConsent[k]); Object.keys(hidden).forEach(k => delete hidden[k]); pOwner = rowKeyOf(u); pFetchedAt = 0; }
    if (isDemoUser(u)) { const d = demoGet(); if (d) pConsent[DEMO_TEEN.key] = d; else delete pConsent[DEMO_TEEN.key]; return; }
    parentTeens(u).forEach(t => {                          // _DB.sync copies the parent's own rows here at sign-in
      if (!(t.key in pConsent)) { const c = readJSON(cacheKey(rowKeyOf(u), 'consent:' + t.key), null); if (c && c.teenKey === t.key) pConsent[t.key] = c; }
    });
  }
  const givenFor = key => { const c = pConsent[key]; return c && c.status === 'given' ? c : null; };
  function remember(u, key, rec) {
    if (rec) pConsent[key] = rec; else delete pConsent[key];
    if (!isDemoUser(u)) lsSet(cacheKey(rowKeyOf(u), 'consent:' + key), rec ? JSON.stringify(rec) : null);
  }
  // pick up consents given or withdrawn on another device
  async function refreshParent(force) {
    const u = as('parent'); if (!isReal(u) || pFetching) return;
    loadParent(u);
    if (!force && Date.now() - pFetchedAt < 60000) return;
    const teens = parentTeens(u); if (!teens.length) return;
    pFetching = true; pFetchedAt = Date.now();
    try {
      const got = await rows(q => q.eq('email', rowKeyOf(u)).in('key', teens.map(t => 'consent:' + t.key)));
      if (!got || me() !== u) return;
      let changed = false;
      teens.forEach(t => {
        const r = got.find(x => x.key === 'consent:' + t.key), v = r ? parse(r.value) : null;
        const before = JSON.stringify(pConsent[t.key] || null);
        remember(u, t.key, v && v.teenKey === t.key ? v : null);
        if (JSON.stringify(pConsent[t.key] || null) !== before) changed = true;
      });
      if (changed) redrawAll();
    } finally { pFetching = false; }
  }
  // copy (or remove) this parent's consent on the teen's parent_link row, so it shows with the link
  async function mirror(teenKey, pe, rec) {
    const got = await rows(q => q.eq('email', teenKey).eq('key', 'parent_link'));
    const link = got && got[0] ? parse(got[0].value) : null;
    if (!link || typeof link !== 'object') return false;
    const consents = Object.assign({}, link.consents || {});
    if (rec && rec.status === 'given') consents[pe] = { status: 'given', signedName: rec.signedName, relationship: rec.relationship, parentKey: rec.parentKey, at: rec.at };
    else if (consents[pe]) delete consents[pe];
    else return true;
    const next = Object.assign({}, link, { consents });
    if (!Object.keys(consents).length) delete next.consents;
    return put(teenKey, 'parent_link', next);
  }
  function receipt(u, rec) {
    try {
      if (typeof window.twSendEmail !== 'function' || isDemoUser(u)) return;
      const teen = rec.teenName || rec.teenEmail;
      window.twSendEmail(emailOf(u), 'You gave parent consent for ' + teen + ' on TeenWork',
        '<p>Hi ' + esc(firstName(u.name) || 'there') + ',</p>' +
        '<p>You gave parent consent for <b>' + esc(teen) + '</b> on ' + esc(fmtDate(rec.at)) + ', signed as <b>' + esc(rec.signedName) + '</b> (' + esc(rec.relationship) + '). You agreed that:</p>' +
        '<ul style="padding-left:20px;">' + rec.statements.map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>' +
        '<p>' + esc(firstName(teen) || 'Your teen') + ' now has the Parent Approved badge. You can withdraw your consent any time under <b>My Teens</b> in your parent account.</p>' +
        '<p>If you did not do this, reply to this email and we will look into it.</p>',
        { heading: 'Parent consent saved', icon: '&#128106;', preheader: 'You gave parent consent for ' + teen + '.' });
    } catch (e) {}
  }
  async function agree(key, form) {
    const u = as('parent');
    if (!u) return { ok: false, msg: 'Only a parent account can give parent consent.' };
    loadParent(u);
    const t = parentTeens(u).find(x => x.key === key);
    if (!t) return { ok: false, msg: 'Link this teen to your account first (My Teens).' };
    if (!form.checks.every(Boolean)) return { ok: false, msg: 'Please tick all three statements. Each one is needed to give consent.' };
    const signed = String(form.name || '').trim().replace(/\s+/g, ' ');
    if (signed.length < 2) return { ok: false, msg: 'Type your full name to sign.' };
    const rec = { v: 1, status: 'given', teenKey: t.key, teenEmail: t.email || t.key, teenName: t.name || '', parentKey: rowKeyOf(u), parentEmail: emailOf(u),
      parentName: u.name || '', signedName: signed.slice(0, 120), relationship: RELS.includes(form.rel) ? form.rel : 'Parent', statements: STATEMENTS(t), at: new Date().toISOString() };
    if (isDemoUser(u)) { demoSet(rec); remember(u, t.key, rec); return { ok: true, rec }; }
    if (t.pending) return { ok: false, msg: 'Still finishing the link to ' + teenLabel(t) + '. Try again in a moment.' };
    if (ownInbox(emailOf(u), t.email || t.key, isTester(u)))
      return { ok: false, msg: 'This parent account uses the same email inbox as ' + teenLabel(t) + '\'s account, so it can\'t give consent. A parent or guardian needs their own email.' };
    const got = await rows(q => q.eq('email', t.key).eq('key', 'parent_link'));
    if (got === null) return { ok: false, msg: 'You seem to be offline, so your consent can\'t be saved. Try again when you\'re connected.' };
    if (!linkParents(got[0] ? parse(got[0].value) : null).includes(emailOf(u)))
      return { ok: false, msg: teenLabel(t) + '\'s account doesn\'t show you as their linked parent yet. Ask them for their code and link them again under My Teens.' };
    if (!(await put(rowKeyOf(u), 'consent:' + t.key, rec))) return { ok: false, msg: 'Your consent couldn\'t be saved. Check your connection and try again.' };
    remember(u, t.key, rec);
    later(() => mirror(t.key, emailOf(u), rec), 0);
    receipt(u, rec);
    return { ok: true, rec };
  }
  async function withdraw(u, key, quiet) {
    const cur = givenFor(key); if (!cur) return true;
    const rec = Object.assign({}, cur, { status: 'withdrawn', withdrawnAt: new Date().toISOString() });
    if (isDemoUser(u)) { demoSet(null); remember(u, key, rec); return true; }
    if (!(await put(rowKeyOf(u), 'consent:' + key, rec))) { if (!quiet) toast('Your consent couldn\'t be withdrawn. Check your connection and try again.', 'error'); return false; }
    remember(u, key, rec);
    await mirror(key, emailOf(u), rec);
    return true;
  }

  /* ── teen side ──────────────────────────────────────────────────── */
  let tState = { key: '', by: null, checkedAt: 0, known: false };
  let teenChecking = false;
  function teenLink(u) {
    const l = (readJSON('tw_parent_links', {}) || {})[emailOf(u)];
    return l || u.parentLinked || null;
  }
  const teenParents = u => isDemoUser(u) ? [DEMO_PARENT.email] : linkParents(teenLink(u));
  const byOf = v => ({ name: v.signedName || v.parentName || v.parentEmail, email: v.parentEmail, relationship: v.relationship || '', at: v.at });
  const seenKey = u => 'tw44c_seen_' + rowKeyOf(u).toLowerCase();
  const lastKey = u => 'tw44c_last_' + rowKeyOf(u).toLowerCase();
  function resetTeen(u) { if (tState.key !== rowKeyOf(u)) tState = { key: rowKeyOf(u), by: null, checkedAt: 0, known: false }; }
  function setTeen(u, by, fresh) {
    tState.by = by; tState.known = true;
    if (!isDemoUser(u)) {
      lsSet(lastKey(u), by ? JSON.stringify(by) : null);
      if (fresh) {
        const seen = lsGet(seenKey(u));
        if (by && seen !== 'given') toast('🎉 ' + (by.name || 'Your parent') + ' gave parent consent. You earned the 👪 Parent Approved badge!', 'success');
        else if (!by && seen === 'given') toast('Parent consent was withdrawn, so the 👪 Parent Approved badge is off for now.', 'info');
        lsSet(seenKey(u), by ? 'given' : 'none');
      }
    }
    drawVerify();                                         // also when only the link changed (e.g. a parent was just linked)
  }
  async function checkTeen() {
    const u = as('teen'); if (!u) return;
    resetTeen(u);
    if (isDemoUser(u)) { const d = demoGet(); setTeen(u, d ? byOf(d) : null, false); return; }
    if (!isReal(u) || teenChecking) return;
    const parents = teenParents(u);
    if (!tState.known) {                                  // what this device saw last time, until the cloud answers
      const last = readJSON(lastKey(u), null);
      if (last && parents.includes(baseEmail(last.email))) { tState.by = last; drawVerify(); }
    }
    if (!parents.length) { tState.checkedAt = Date.now(); setTeen(u, null, true); return; }
    teenChecking = true;
    try {
      const me0 = rowKeyOf(u), tester = isTester(u);
      tState.checkedAt = Date.now();
      const got = await rows(q => q.eq('key', 'consent:' + me0));
      if (!got || me() !== u) return;
      const ok = got.map(r => ({ r, v: parse(r.value) }))
        .filter(x => x.v && x.v.status === 'given' && x.v.teenKey === me0 && parents.includes(baseEmail(x.r.email)) && baseEmail(x.v.parentEmail) === baseEmail(x.r.email) && !ownInbox(x.r.email, emailOf(u), tester))
        .sort((a, b) => String(b.v.at || '').localeCompare(String(a.v.at || '')));
      setTeen(u, ok.length ? byOf(ok[0].v) : null, true);
    } finally { teenChecking = false; }
  }
  window.twConsentCheck = async function () {
    const u = as('teen'); if (!u) return;
    await checkTeen();
    if (!tState.by) toast(teenParents(u).length ? 'No consent yet. Ask your parent to open My Teens in their TeenWork account and tap Review & agree.' : 'Link a parent first. Then they can give consent from their own account.', 'info');
  };

  /* ── what the Verification page shows ───────────────────────────── */
  let vTeen = '';                                         // parent: which teen step 2 is about
  function currentConsent() {
    const u = me(); if (!u) return false;
    if (u.type === 'teen') return !!tState.by && tState.key === rowKeyOf(u);
    if (u.type === 'parent') return !!givenFor(vTeen);
    return false;
  }
  const BADGES = [['identity', '🪪 Identity Verified', 'identity'], ['parentConsent', '👪 Parent Approved', 'parent'], ['workPermit', '📋 Work Permit', 'permit'], ['bgc', '✦ Trusted+', 'bgc']];
  function badges() {
    let b = [];
    try { b = (typeof TW_Verify !== 'undefined' && TW_Verify && TW_Verify.__tw44cBadges) ? TW_Verify.__tw44cBadges() : []; } catch (e) {}
    b = b.filter(x => x !== 'parentConsent');
    if (currentConsent()) b.push('parentConsent');
    return BADGES.map(d => d[0]).filter(k => b.includes(k));
  }
  const tierOf = b => b.includes('bgc') ? 4 : b.includes('workPermit') ? 3 : b.includes('parentConsent') ? 2 : b.includes('identity') ? 1 : 0;
  function drawBadges() {
    const b = badges(), tier = tierOf(b);
    const row = $('tw-ver-badge-row');
    if (row) {
      const html = BADGES.map(d => { const on = b.includes(d[0]); return `<span class="tw-ver-badge ${on ? d[2] : 'locked'}">${d[1]}${on ? '' : ' 🔒'}</span>`; }).join('');
      if (row.innerHTML !== html) row.innerHTML = html;
    }
    [1, 2, 3, 4].forEach(n => {
      const el = $('tw-ver-t' + n); if (!el) return;
      el.classList.toggle('done', n <= tier);
      el.classList.toggle('active', n > tier && n === tier + 1 && n < 4);
    });
    [1, 2, 3].forEach(n => { const l = $('tw-ver-line-' + n); if (l) l.classList.toggle('done', n <= tier - 1); });
  }
  function setStatus(step, el, kind, text) {
    if (step) { step.classList.toggle('done', kind === 'done'); step.classList.toggle('active', kind === 'active'); step.classList.toggle('locked', kind === 'locked'); }
    if (el) { el.className = 'tw-ver-step-status ' + kind; if (el.textContent !== text) el.textContent = text; }
  }
  function formHTML(p, t, u) {
    const k = enc(t.key);
    return `<div class="tw44c-form" data-teen="${esc(t.key)}">
      <p class="tw44c-p">Agreeing gives <b>${esc(teenLabel(t))}</b> the 👪 Parent Approved badge. Only you can do this, from your parent account.</p>
      <div class="tw-ver-consent">${STATEMENTS(t).map((s, i) => `<label class="tw-ver-consent-item"><input type="checkbox" id="tw44c-${p}-c${i}"> ${esc(s)}</label>`).join('')}</div>
      <div class="tw-ver-row">
        <div class="tw-ver-field"><label for="tw44c-${p}-name">Your full name (signature)</label><input type="text" id="tw44c-${p}-name" value="${esc((u && u.name) || '')}" autocomplete="name" maxlength="120"></div>
        <div class="tw-ver-field"><label for="tw44c-${p}-rel">Relationship</label><select id="tw44c-${p}-rel">${RELS.map(r => `<option>${r}</option>`).join('')}</select></div>
      </div>
      <div class="tw44c-msg" id="tw44c-${p}-msg" role="status"></div>
      <button type="button" class="tw-ver-btn primary" id="tw44c-${p}-go" onclick="twConsentAgree('${p}',decodeURIComponent('${k}'))">✅ I agree</button>
    </div>`;
  }
  function drawVerify() {
    const u = me(), step = $('tw-ver-step-2'), body = $('tw-ver-body-2');
    if (!u || u.isAdmin || !step || !body) return;
    const status = $('tw-ver-s2-status'), desc = step.querySelector('.tw-ver-step-desc');
    let kind = 'locked', label = '🔒 Locked', html = '', d = '', open3 = null;
    if (u.type === 'teen') {
      resetTeen(u);
      const by = tState.by, tester = isTester(u), parents = teenParents(u), l = isDemoUser(u) ? { parentName: DEMO_PARENT.name } : (teenLink(u) || {});
      const who = l.parentName || l.parentEmail || 'your parent';
      d = 'Your linked parent agrees from their own account. Unlocks Tier 2 jobs.';
      const note = tester && !by ? '<div class="tw44c-note">🧪 Tester account: you can keep going without this. The badge still needs a linked parent to agree.</div>' : '';
      if (by) {
        kind = 'done'; label = '✓ Complete';
        html = `<div class="tw44c-ok">✅ <b>${esc(by.name)}</b>${by.relationship ? ' (' + esc(by.relationship) + ')' : ''} gave consent from their parent account${by.at ? ' on ' + esc(fmtDate(by.at)) : ''}. You have the 👪 Parent Approved badge.</div>`;
      } else if (parents.length) {
        kind = 'active'; label = tester ? 'Optional (tester)' : 'Waiting for your parent';
        html = note + `<p class="tw44c-p">Only your parent or guardian can give this, from their own TeenWork account. Ask <b>${esc(who)}</b> to sign in, open <b>My Teens</b> and tap <b>Review &amp; agree</b>.</p>
          <p class="tw44c-p">You get the 👪 Parent Approved badge as soon as they agree.</p>
          <button type="button" class="tw-ver-btn primary" onclick="twConsentCheck()">🔄 Check again</button>`;
      } else {
        kind = tester ? 'active' : 'locked'; label = tester ? 'Optional (tester)' : 'Link a parent first';
        html = note + `<p class="tw44c-p">Link a parent or guardian to your account first. Then they give consent from their own TeenWork account. You can't give it yourself.</p>
          <button type="button" class="tw-ver-btn primary" onclick="if(typeof twOpenLinkModal==='function')twOpenLinkModal();else{gotoPage('teen');switchDashTab(null,'ttab-resume');}">🔗 Link a parent</button>`;
      }
      open3 = !!by || tester;
    } else if (u.type === 'parent') {
      loadParent(u);
      const teens = parentTeens(u);
      d = 'Agree from your account to give your teen the 👪 Parent Approved badge.';
      if (!teens.length) {
        vTeen = ''; kind = 'locked'; label = 'Link your teen first';
        html = `<p class="tw44c-p">Link your teen under <b>My Teens</b> first. Then you can give parent consent here.</p>
          <button type="button" class="tw-ver-btn primary" onclick="gotoPage('parent');switchParentTab('ptab-teens','pdtab-teens')">👨‍👩‍👧 Go to My Teens</button>`;
        open3 = false;
      } else {
        if (!teens.some(t => t.key === vTeen)) vTeen = (teens.find(t => !givenFor(t.key)) || teens[0]).key;
        const t = teens.find(x => x.key === vTeen), c = givenFor(t.key);
        const pick = teens.length > 1 ? `<div class="tw-ver-field"><label for="tw44c-v-teen">Which teen?</label><select id="tw44c-v-teen" onchange="twConsentPick(this.value)">${teens.map(x => `<option value="${esc(x.key)}"${x.key === t.key ? ' selected' : ''}>${esc(teenLabel(x))}${givenFor(x.key) ? ' ✓' : ''}</option>`).join('')}</select></div>` : '';
        if (c) {
          kind = 'done'; label = '✓ Complete';
          html = pick + `<div class="tw44c-ok">✅ You gave consent for <b>${esc(teenLabel(t))}</b> on ${esc(fmtDate(c.at))}, signed as <b>${esc(c.signedName)}</b> (${esc(c.relationship)}). They have the 👪 Parent Approved badge.</div>
            <button type="button" class="tw-ver-btn ghost" onclick="twConsentWithdraw(decodeURIComponent('${enc(t.key)}'))">Withdraw consent</button>`;
        } else if (t.pending && !isDemoUser(u)) {
          kind = 'active'; label = 'Finishing the link';
          html = pick + `<p class="tw44c-p">Still finishing the link to <b>${esc(teenLabel(t))}</b>. This updates in a moment.</p>`;
        } else {
          kind = 'active'; label = 'Your agreement needed';
          html = pick + formHTML('v', t, u);
        }
        open3 = !!c;
        if (isReal(u) && teens.length > 1) {                // step 1 shows the teen picked here
          const ins = ($('tw-ver-body-1') || { querySelectorAll: () => [] }).querySelectorAll('input'), parts = String(t.name || '').trim().split(/\s+/);
          [parts[0] || '', parts.slice(1).join(' '), t.dob || '', t.state || ''].forEach((v, i) => { if (ins[i] && ins[i] !== document.activeElement && ins[i].value !== v) ins[i].value = v; });
        }
      }
    } else {
      d = 'A teen\'s linked parent gives this from their own account.'; kind = 'locked'; label = 'Parents only';
      html = '<p class="tw44c-p">Parents give this consent for their own teen, from their own TeenWork account.</p>';
    }
    setStatus(step, status, kind, label);
    if (desc && desc.textContent !== d) desc.textContent = d;
    if (body._tw44c !== html) { body.innerHTML = html; body._tw44c = html; }
    if (open3 !== null) {
      const s3 = $('tw-ver-step-3'), st3 = s3 && s3.querySelector('.tw-ver-step-status');
      if (s3 && !badges().includes('workPermit')) setStatus(s3, st3, open3 ? 'active' : 'locked', open3 ? 'Ready' : '🔒 Locked');
    }
    drawBadges();
    const prog = $('tw-ver-role-progress'), steps = { teen: 5, parent: 3, employer: 4 }[u.type];
    if (prog && steps) {
      const done = document.querySelectorAll('#page-verify .tw-ver-step.done').length;
      const txt = `Step ${Math.min(done + 1, steps)} of ${steps} — ${Math.min(100, Math.round((done / steps) * 100))}% complete`;
      if (prog.textContent !== txt) prog.textContent = txt;
    }
  }

  /* ── parent screens: banner, My Teens, pop-up ───────────────────── */
  function closeModal() { const m = $('tw44c-modal'); if (m) m.remove(); }
  window.twConsentOpen = function (key) {
    const u = as('parent'); if (!u) return;
    loadParent(u);
    const t = parentTeens(u).find(x => x.key === key); if (!t) return;
    if (givenFor(key)) { toast('You already gave consent for ' + firstName(teenLabel(t)) + '.', 'info'); return; }
    if (t.pending && !isDemoUser(u)) { toast('Still finishing the link to ' + teenLabel(t) + '. Try again in a moment.', 'info'); return; }
    closeModal();
    const m = document.createElement('div');
    m.id = 'tw44c-modal'; m.dataset.owner = rowKeyOf(u);
    m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="tw44c-m-title"><button type="button" class="x" aria-label="Close" onclick="document.getElementById('tw44c-modal').remove()">✕</button>
      <h2 id="tw44c-m-title">👪 Parent consent for ${esc(teenLabel(t))}</h2>${formHTML('m', t, u)}</div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
  };
  window.twConsentAgree = async function (p, key) {
    const g = id => $('tw44c-' + p + '-' + id), btn = g('go'), msg = g('msg');
    const form = { checks: [0, 1, 2].map(i => !!(g('c' + i) || {}).checked), name: (g('name') || {}).value, rel: (g('rel') || {}).value };
    if (btn) btn.disabled = true;
    if (msg) { msg.className = 'tw44c-msg'; msg.textContent = 'Saving…'; }
    let r;
    try { r = await agree(key, form); } catch (e) { r = { ok: false, msg: 'Your consent couldn\'t be saved. Try again.' }; }
    if (btn) btn.disabled = false;
    if (!r.ok) { if (msg) { msg.className = 'tw44c-msg err'; msg.textContent = r.msg; } return false; }
    if (p === 'm') closeModal();
    toast('✅ Consent saved. ' + (firstName(r.rec.teenName) || 'Your teen') + ' now has the 👪 Parent Approved badge.', 'success');
    redrawAll();
    return true;
  };
  window.twConsentWithdraw = async function (key) {
    const u = as('parent'); if (!u) return;
    const c = givenFor(key); if (!c) return;
    if (!confirm('Withdraw your parent consent for ' + (c.teenName || c.teenEmail) + '? They lose the 👪 Parent Approved badge until a parent agrees again.')) return;
    if (await withdraw(u, key)) { toast('Consent withdrawn for ' + (firstName(c.teenName) || c.teenEmail) + '.', 'info'); redrawAll(); }
  };
  window.twConsentPick = function (key) { vTeen = String(key || ''); drawVerify(); };
  window.twConsentLater = function (key) { hidden[key] = true; drawBanner(); };

  function drawBanner() {
    const u = as('parent'), host = document.querySelector('#page-parent .dashboard');
    let box = $('tw44c-banner');
    const need = isReal(u) ? (loadParent(u), parentTeens(u).filter(t => !t.pending && !givenFor(t.key) && !hidden[t.key])) : [];
    if (!need.length || !host) { if (box) box.remove(); return; }
    const html = need.map(t => `<div class="ban"><div class="t">👪 <b>${esc(teenLabel(t))}</b> needs your parent consent to get the Parent Approved badge. Only you can give it.</div>
      <button type="button" class="tw44c-btn pri" onclick="twConsentOpen(decodeURIComponent('${enc(t.key)}'))">Review &amp; agree</button>
      <button type="button" class="tw44c-btn" onclick="twConsentLater(decodeURIComponent('${enc(t.key)}'))">Later</button></div>`).join('');
    if (!box || box.parentNode !== host) {
      if (box) box.remove();
      box = document.createElement('div'); box.id = 'tw44c-banner';
      const after = $('tw35-requests') || host.querySelector('.dash-header');
      if (after && after.parentNode === host) host.insertBefore(box, after.nextSibling); else host.insertBefore(box, host.firstChild);
    }
    if (box._tw44c !== html) { box.innerHTML = html; box._tw44c = html; }
  }
  function decorateTeens() {
    const u = as('parent'); if (!isReal(u)) return;
    const cards = document.querySelectorAll('#multi-teen-list [data-tw-teen]'); if (!cards.length) return;
    loadParent(u);
    const teens = parentTeens(u);
    cards.forEach(card => {
      const t = teens.find(x => x.key === card.getAttribute('data-tw-teen')); if (!t) return;
      const c = givenFor(t.key), k = enc(t.key);
      const html = c
        ? `<span class="tw44c-tag ok">👪 Consent given</span><span class="tw44c-sub">${esc(fmtDate(c.at))} · ${esc(firstName(teenLabel(t)))} has the Parent Approved badge</span><a href="#" onclick="twConsentWithdraw(decodeURIComponent('${k}'));return false">Withdraw</a>`
        : t.pending
          ? `<span class="tw44c-tag">👪 Consent</span><span class="tw44c-sub">You can give it once the link finishes.</span>`
          : `<span class="tw44c-tag need">👪 Consent needed</span><span class="tw44c-sub">${esc(firstName(teenLabel(t)))} has no Parent Approved badge until you agree.</span><button type="button" class="btn-sm btn-approve" style="font-size:.75rem" onclick="twConsentOpen(decodeURIComponent('${k}'))">Review &amp; agree</button>`;
      let row = card.querySelector('.tw44c-row');
      if (!row) { row = document.createElement('div'); row.className = 'tw44c-row'; card.insertBefore(row, card.lastElementChild); }
      if (row._tw44c !== html) { row.innerHTML = html; row._tw44c = html; }
    });
  }
  function redrawAll() { try { drawVerify(); } catch (e) {} try { drawBanner(); } catch (e) {} try { decorateTeens(); } catch (e) {} }

  /* ── styles ─────────────────────────────────────────────────────── */
  const st = document.createElement('style');
  st.id = 'tw44c-style';
  st.textContent =
    '.tw44c-p{font-size:.85rem;line-height:1.55;margin:.8rem 0 .5rem;color:var(--text)}' +
    '.tw44c-ok{background:var(--green-pale,#e8f5ee);color:var(--green,#2d6a4f);border-radius:10px;padding:10px 12px;font-size:.86rem;line-height:1.5;margin:.9rem 0 .7rem}' +
    '.tw44c-note{background:#ede9fe;color:#4c1d95;border-radius:10px;padding:9px 12px;font-size:.84rem;line-height:1.5;margin:.9rem 0 .2rem}' +
    '.tw44c-msg{min-height:1.2em;font-size:.82rem;margin:6px 0 4px;color:var(--muted,#6b7280)}.tw44c-msg.err{color:#b42318;font-weight:600}' +
    '.tw44c-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-top:10px;padding:8px 10px;border-radius:10px;border:1px dashed var(--border,#d1d5db);font-size:.8rem}' +
    '.tw44c-row a{color:var(--red,#b42318);font-weight:700;font-size:.78rem}' +
    '.tw44c-tag{font-weight:700;padding:2px 9px;border-radius:10px;font-size:.72rem;background:var(--bg,#f5f5f0);white-space:nowrap}' +
    '.tw44c-tag.ok{background:var(--green-pale,#e8f5ee);color:var(--green,#2d6a4f)}.tw44c-tag.need{background:var(--amber-pale,#fff3e0);color:var(--amber,#b45309)}' +
    '.tw44c-sub{color:var(--muted,#6b7280);flex:1 1 170px;line-height:1.4}' +
    '#tw44c-banner .ban{display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:#eef4ff;border:1.5px solid #6b9bea;border-radius:12px;padding:12px 14px;margin:0 0 12px;font-size:.9rem;color:#1c2f57}' +
    '#tw44c-banner .t{flex:1 1 240px;line-height:1.45}' +
    '.tw44c-btn{font-family:inherit;font-weight:700;font-size:.86rem;border-radius:10px;padding:9px 14px;min-height:40px;cursor:pointer;border:1.5px solid var(--green,#2d6a4f);background:transparent;color:var(--green,#2d6a4f)}' +
    '.tw44c-btn.pri{background:var(--green,#2d6a4f);color:#fff}' +
    '#tw44c-modal{position:fixed;inset:0;z-index:99996;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px;font-family:"DM Sans",sans-serif}' +
    '#tw44c-modal .sheet{background:var(--card,#fff);color:var(--text,#1c1c1c);width:100%;max-width:480px;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow-y:auto;border-radius:18px;padding:20px 18px;box-shadow:0 12px 48px rgba(0,0,0,.3);position:relative}' +
    '#tw44c-modal h2{margin:0 30px 4px 0;font-family:"Fraunces",Georgia,serif;font-size:1.2rem;color:var(--green,#2d6a4f)}' +
    '#tw44c-modal .x{position:absolute;top:10px;right:12px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted,#6b7280);padding:6px}' +
    '#tw44c-modal .tw-ver-btn{width:100%}' +
    '@media(max-width:520px){#tw44c-modal .tw-ver-row{grid-template-columns:1fr;gap:0}}' +
    'html.dark #tw44c-banner .ban{background:#172554;border-color:#3b5ba8;color:#dbe6ff}' +
    'html.dark .tw44c-note{background:#2e1065;color:#ddd6fe}' +
    'html.dark #tw44c-modal .tw-ver-field input,html.dark #tw44c-modal .tw-ver-field select{background:var(--card,#1f2937);color:var(--text,#e5e7eb)}';
  document.head.appendChild(st);

  /* ── wiring ─────────────────────────────────────────────────────── */
  function wrapVerify() {
    if (typeof TW_Verify === 'undefined' || !TW_Verify || TW_Verify.__tw44c) return;
    const V = TW_Verify, oBadges = V.getBadges;
    V.__tw44cBadges = function () { try { return oBadges.apply(V, arguments) || []; } catch (e) { return []; } };
    ['init', 'submitPermit', 'purchaseBGC'].forEach(n => {
      const o = V[n]; if (typeof o !== 'function') return;
      V[n] = function () {
        const r = o.apply(this, arguments), after = () => { try { drawVerify(); } catch (e) {} };
        if (r && typeof r.then === 'function') r.then(after, after);
        after();
        return r;
      };
    });
    // The old form let the teen "sign" for the parent. Now only a parent's agreement counts.
    V.submitParentConsent = function () {
      if (as('parent') && vTeen) return window.twConsentAgree('v', vTeen);
      toast('Only your linked parent can give parent consent, from their own TeenWork account.', 'info');
      drawVerify();
    };
    V.getBadges = function () { return badges(); };
    V.getTrustTier = function () { return tierOf(badges()); };
    V.__tw44c = true;
  }
  wrapVerify();

  const _oShow = window.showVerifyPage;
  if (typeof _oShow === 'function') window.showVerifyPage = function () {
    vTeen = '';                                           // a parent lands on the first teen still needing consent
    const r = _oShow.apply(this, arguments);
    const u = me();
    if (u && u.type === 'teen') later(checkTeen, 0); else if (u && u.type === 'parent') later(() => refreshParent(true), 0);
    [0, 80, 200, 600].forEach(ms => later(drawVerify, ms));
    return r;
  };
  const _oMulti = window.renderMultiTeens;
  window.renderMultiTeens = function () {
    const r = typeof _oMulti === 'function' ? _oMulti.apply(this, arguments) : undefined;
    try { decorateTeens(); } catch (e) {}
    later(() => refreshParent(false), 0);
    return r;
  };
  const _oUnlink = window.twUnlinkTeen;
  if (typeof _oUnlink === 'function') window.twUnlinkTeen = async function (key) {
    const u = as('parent');
    const r = await _oUnlink.apply(this, arguments);
    try { if (u && me() === u && givenFor(key) && !parentTeens(u).some(t => t.key === key)) { await withdraw(u, key, true); redrawAll(); } } catch (e) {}
    return r;
  };
  ['twCheckApproval', 'checkParentLinkApproval'].forEach(n => {
    const o = window[n]; if (typeof o !== 'function') return;
    window[n] = async function () { const r = await o.apply(this, arguments); later(checkTeen, 0); return r; };
  });
  const _oLaunch = window.launchDashboard;
  if (typeof _oLaunch === 'function') window.launchDashboard = function () {
    const r = _oLaunch.apply(this, arguments);
    closeModal();
    [300, 2500].forEach(ms => later(() => {
      const u = me(); if (!u) return;
      if (u.type === 'teen') return checkTeen();
      if (u.type === 'parent') { loadParent(u); redrawAll(); return refreshParent(true); }
    }, ms));
    return r;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    const u = me(); if (!isReal(u)) return;
    if (u.type === 'teen') later(checkTeen, 0); else if (u.type === 'parent') later(() => refreshParent(true), 0);
  });
  setInterval(() => {
    try {
      const u = me();
      const m = $('tw44c-modal'); if (m && (!u || m.dataset.owner !== rowKeyOf(u))) m.remove();
      if (!isReal(u) || u.type !== 'parent') { const b = $('tw44c-banner'); if (b) b.remove(); }
      else { drawBanner(); decorateTeens(); later(() => refreshParent(false), 0); }
      if (isReal(u) && u.type === 'teen' && !document.hidden && !teenChecking) {
        const age = Date.now() - tState.checkedAt;
        if (tState.key !== rowKeyOf(u) || (!tState.by && age > 30000) || age > 120000) later(checkTeen, 0);
      }
    } catch (e) {}
  }, 1500);

  window._twParentConsent = { checkTeen, refreshParent: () => refreshParent(true), teenConsent: () => tState.by, parentConsents: () => JSON.parse(JSON.stringify(pConsent)), redraw: redrawAll };
})();
