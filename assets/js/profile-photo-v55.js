/* ═══════════════════════════════════════════════════════════════════
   PROFILE PHOTOS, STORED IN SUPABASE
   v55 (2026-11-07, Aya: "store them in supabase also let them choose
   who can see it") made it for teens. v58 (2026-11-13, Aya: "get the
   photo upload to work and let them choose who gets to see it") ships
   it and gives parents and employers a photo and a choice too.
   • Everyone adds a photo in one box: teens on Profile → Profile Photo,
     parents under My Teens, employers on Company Profile. The browser
     makes it a 400×400 JPEG (this also drops hidden data such as where
     the photo was taken) and uploads it to the PRIVATE Storage bucket
     "profile-photos", folder = the person's sign-in id.
   • Each person picks who can see it:
       teen      only me / me and my parent / my parent and employers
                 (an employer only after a parent approved the teen's
                 application to that employer's job)
       parent    only me / me and my teens / my teens and their employers
       employer  only me / teens whose application reached me / those
                 teens and the parents who approved them
     The choice and the people it covers are saved in
     public.tw_profile_photos, which only the owner's own signed-in
     account can write. Storage gives a viewer a one-hour link only when
     that row allows them (supabase/migrations/20261107_profile_photos.sql
     and 20261113_profile_photos_all_roles.sql).
   • The owner's app keeps the lists up to date from its own records
     (parent link, linked teens, applications) on sign-in, on opening
     the box, when the tab comes back and when the choice changes, and
     the box lists exactly who can see the photo right now.
   • Photos show where people meet: Messages (contacts and the chat
     header) for everyone, the teen card and My Teens for parents, the
     Applicant Pipeline for employers. Everyone else sees initials.
   • Practice (demo) accounts never upload: the photo stays on the
     screen until they leave.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twPhoto55) return;
  window.__twPhoto55 = true;

  const BUCKET = 'profile-photos', TABLE = 'tw_profile_photos', SIZE = 400, MAX_IN = 20 * 1024 * 1024, LINK_SECS = 3600;
  const ROLES = ['teen', 'parent', 'employer'];
  // who-can-see choices per role, the first list each one adds, and the default
  const AUD = { teen: ['me', 'parent', 'employers'], parent: ['me', 'teens', 'teens_employers'], employer: ['me', 'teens', 'teens_parents'] };
  const DEFAULT = { teen: 'parent', parent: 'teens', employer: 'teens_parents' };
  const SHOWS = {   // which lists each choice lets see the photo (same rule as tw_photo_viewer_ok in SQL)
    me: [], parent: ['parents'], employers: ['parents', 'employers'],
    teens: ['teens'], teens_employers: ['teens', 'employers'], teens_parents: ['teens', 'parents'],
  };
  const CAP = { parents: 300, employers: 200, teens: 300 };
  const $ = id => document.getElementById(id);
  const lexUser = () => { try { return typeof currentUser !== 'undefined' ? currentUser : null; } catch (e) { return null; } };
  const me = () => window.currentUser || lexUser();
  const low = s => String(s == null ? '' : s).trim().toLowerCase();
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const EMAIL = /^[^\s@#,()"*<>]+@[^\s@#,()"*<>]+\.[^\s@#,()"*<>]+$/;
  const KEY = /^[^\s@#,()"*<>]+@[^\s@#,()"*<>]+\.[^\s@#,()"*<>]+(#\d{1,3})?$/;
  const keyOf = u => low(u && (u.dataKey || u.email));
  const emailOfKey = k => low(k).split('#')[0];
  const slotOf = k => (String(k).includes('#') ? parseInt(String(k).split('#')[1], 10) || 1 : 1);
  const parse = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; } };
  const toast = (m, t) => { try { showToast(m, t || 'success'); } catch (e) {} };
  const uniq = a => [...new Set(a)];
  const sameList = (a, b) => JSON.stringify((a || []).slice().sort()) === JSON.stringify((b || []).slice().sort());
  const isPractice = u => !!(u && (u.twDemo || u.isDemo || /\.demo$/i.test(String(u.email || '')) || (typeof window._twIsDemoSandboxUser === 'function' && window._twIsDemoSandboxUser(u))));
  const isReal = u => !!(u && !isPractice(u) && !u.isAdmin && ROLES.includes(u.type) && KEY.test(keyOf(u)));
  const roleOf = u => (u && ROLES.includes(u.type) ? u.type : '');

  async function client() {
    let c = null;
    try { if (typeof _twCloudClient === 'function') c = await _twCloudClient(3000); } catch (e) {}
    if (!c) { try { c = (typeof sbClient !== 'undefined' && sbClient) || null; } catch (e) { c = null; } }
    return c && !c.__twDemo && c.storage && typeof c.from === 'function' ? c : null;
  }
  async function sessionFor(c, key) {
    try {
      const r = await c.auth.getSession(), s = r && r.data && r.data.session;
      return s && s.user && low(s.user.email) === emailOfKey(key) ? s : null;
    } catch (e) { return null; }
  }
  // "not set up yet": the table, the rpc or (for parents and employers) the v58 column / choices are missing
  const missing = err => !!err && (err.code === 'PGRST205' || err.code === 'PGRST202' || err.code === 'PGRST204' || err.code === '42P01' ||
    err.code === '42883' || err.code === '42703' ||
    /tw_profile_photos|tw_photo_paths|bucket not found|schema cache|teen_viewers|audience_check/i.test(String(err.message || '')));

  /* ══ 1. my own photo ═══════════════════════════════════════════════ */
  // the box's parts: the teen's box is in index.html, the parent's and employer's are added below
  function ids(role) {
    if (role === 'teen') return { box: 'tw55-photo', av: 'tw53-avatar', cap: 'tw55-cap', pick: 'tw55-pick', rm: 'tw55-remove', file: 'tw55-file', stat: 'tw55-status', aud: 'tw55-aud', who: 'tw55-who', radio: 'tw55-aud', tab: 'ttab-resume', page: 'page-teen' };
    const s = '-' + role;
    return { box: 'tw55-photo' + s, av: 'tw55-avatar' + s, cap: 'tw55-cap' + s, pick: 'tw55-pick' + s, rm: 'tw55-remove' + s, file: 'tw55-file' + s, stat: 'tw55-status' + s, aud: 'tw55-aud' + s, who: 'tw55-who' + s, radio: 'tw55-aud' + s,
      tab: role === 'parent' ? 'ptab-teens' : 'etab-profile', page: 'page-' + role };
  }
  const CHOICES = {
    parent: [['me', 'Only me', ''], ['teens', 'Me and my teens', 'Teens linked to your account'],
      ['teens_employers', 'My teens and their employers', 'An employer sees it only after you approve your teen\'s application to their job']],
    employer: [['me', 'Only me', ''], ['teens', 'Teens who applied', 'A teen sees it once their application reaches you, after their parent says OK'],
      ['teens_parents', 'Those teens and their parents', 'Also the parent who approved each application']],
  };
  const HINT = {
    parent: 'Pick a friendly picture of your face. TeenWork makes it a small square and removes hidden details phone cameras add, like where the photo was taken.',
    employer: 'A clear photo of you or your business logo helps teens and parents know who they\'re talking to. TeenWork makes it a small square and removes hidden details phone cameras add, like where the photo was taken.',
  };
  function addPanel(role) {
    const I = ids(role); if ($(I.box)) return;
    let host = null, before = null;
    if (role === 'parent') host = $('ptab-teens');
    else { host = $('etab-profile'); before = $('emp-profile-edit-wrap'); if (before && before.parentNode !== host) before = null; }
    if (!host) return;
    const panel = document.createElement('div');
    panel.className = 'panel tw55-panel'; panel.style.marginTop = '1rem';
    panel.innerHTML = '<div class="panel-head"><h2>📷 ' + (role === 'parent' ? 'Your Photo' : 'Your Photo or Logo') + '</h2><span class="badge badge-green">Optional</span></div>' +
      '<div class="panel-body tw55-box" id="' + I.box + '">' +
      '<div class="tw53-avatar' + (role === 'employer' ? ' tw55-square' : '') + '" id="' + I.av + '" aria-hidden="true"></div>' +
      '<p class="tw53-avatar-cap" id="' + I.cap + '">Default avatar (your initials)</p>' +
      '<div class="tw55-btns"><button type="button" class="btn-secondary" id="' + I.pick + '">📷 Add a photo</button>' +
      '<button type="button" class="btn-secondary tw55-remove" id="' + I.rm + '" hidden>Remove photo</button>' +
      '<input type="file" id="' + I.file + '" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden></div>' +
      '<p class="tw55-status" id="' + I.stat + '" role="status" aria-live="polite"></p>' +
      '<p><b>You don\'t need a photo.</b> Without one, people see your initials.</p>' +
      '<fieldset class="tw55-aud" id="' + I.aud + '"><legend>Who can see your photo</legend>' +
      CHOICES[role].map(([v, t, s]) => '<label><input type="radio" name="' + I.radio + '" value="' + v + '"' + (v === DEFAULT[role] ? ' checked' : '') + '><span><b>' + esc(t) + '</b>' + (s ? '<small>' + esc(s) + '</small>' : '') + '</span></label>').join('') +
      '</fieldset><div class="tw55-who" id="' + I.who + '" hidden></div>' +
      '<p class="tw53-hint">' + esc(HINT[role]) + '</p></div>';
    if (before) host.insertBefore(panel, before); else host.appendChild(panel);
  }

  // setup: 'idle' (not loaded) · 'ok' · 'missing' (migration not applied) · 'signin' (no Supabase session for this
  // account) · 'offline' · 'practice'
  const st = { key: '', role: '', setup: 'idle', row: null, url: '', practiceUrl: '', busy: false, people: null, msg: '', msgKind: '', loadedAt: 0, syncedAt: 0 };
  function reset(key, role) {
    if (st.practiceUrl) { try { URL.revokeObjectURL(st.practiceUrl); } catch (e) {} }
    Object.assign(st, { key, role, setup: 'idle', row: null, url: '', practiceUrl: '', busy: false, people: null, msg: '', msgKind: '', loadedAt: 0, syncedAt: 0 });
  }
  function current() {
    const u = me(), role = roleOf(u);
    if (!role) return null;
    const key = isPractice(u) ? 'practice:' + role + ':' + low(u.email) : keyOf(u);
    if (st.key !== key || st.role !== role) reset(key, role);
    return u;
  }
  const audience = () => (st.row && (AUD[st.role] || []).includes(st.row.audience) ? st.row.audience : DEFAULT[st.role] || 'me');
  const photoUrl = () => st.practiceUrl || st.url;
  const cols = role => 'path,audience,parent_viewers,employer_viewers' + (role === 'teen' ? '' : ',teen_viewers');

  async function signed(c, paths) {
    if (!paths.length) return {};
    try {
      const r = await c.storage.from(BUCKET).createSignedUrls(paths, LINK_SECS);
      const out = {};
      ((r && r.data) || []).forEach(x => { if (x && x.signedUrl && !x.error) out[x.path] = x.signedUrl; });
      return out;
    } catch (e) { return {}; }
  }

  async function loadMine(force) {
    const u = current(); if (!u) return;
    if (isPractice(u)) { st.setup = 'practice'; draw(); return; }
    if (!isReal(u)) return;
    // a loaded photo link lasts an hour (reload after 50 minutes); a failed try is retried after 2 minutes
    if (!force && st.loadedAt && Date.now() - st.loadedAt < (st.setup === 'ok' ? 50 : 2) * 60 * 1000) return;
    const key = st.key, role = st.role, fail = s => { st.setup = s; st.loadedAt = Date.now(); draw(); };
    const c = await client();
    if (st.key !== key) return;
    if (!c) return fail('offline');
    if (!(await sessionFor(c, key))) return fail('signin');
    let r;
    try { r = await c.from(TABLE).select(cols(role)).eq('owner_key', key).maybeSingle(); } catch (e) { r = { error: e }; }
    if (st.key !== key) return;
    if (r && r.error) return fail(missing(r.error) ? 'missing' : 'offline');
    st.row = (r && r.data) || null;
    st.setup = 'ok'; st.loadedAt = Date.now();
    st.url = st.row && st.row.path ? ((await signed(c, [st.row.path]))[st.row.path] || '') : '';
    draw();
  }

  // Who my own records say may see the photo. Read from my own rows (and, for a parent, my linked teens'
  // applications; for an employer, the applications to my jobs) on every sync.
  async function readPeople(c, key, role) {
    const q = async build => { try { const r = await build(c.from('user_data').select('email,key,value')); return r && !r.error ? (r.data || []) : null; } catch (e) { return null; } };
    const self = emailOfKey(key), out = { parents: [], employers: [], teens: [] };
    const add = (list, email, name, job) => {
      email = low(email);
      if (!EMAIL.test(email) || email === self) return;
      let p = list.find(x => x.email === email);
      if (!p) { p = { email, name: String(name || '').slice(0, 60), jobs: [] }; list.push(p); }
      if (!p.name && name) p.name = String(name).slice(0, 60);
      if (job && p.jobs.length < 3 && !p.jobs.includes(job)) p.jobs.push(String(job).slice(0, 60));
    };
    const live = v => v && ['applied', 'hired'].includes(v.status);
    if (role === 'teen') {
      const [linkRows, appRows] = await Promise.all([q(b => b.eq('email', key).eq('key', 'parent_link')), q(b => b.eq('email', key).like('key', 'job_app:%'))]);
      if (!linkRows || !appRows) return null;
      const link = parse(linkRows[0] && linkRows[0].value) || {};
      if (link.status === 'approved') {
        uniq((Array.isArray(link.parents) ? link.parents : []).concat(link.parentEmail ? [link.parentEmail] : []).map(low)).slice(0, 10)
          .forEach(e => add(out.parents, e, e === low(link.parentEmail) ? link.parentName : ''));
      }
      appRows.forEach(r => { const v = parse(r.value); if (!live(v)) return; const job = v.job || {}; add(out.employers, emailOfKey(v.employerKey), job.employer || job.business, job.title); });
    } else if (role === 'parent') {
      const mine = await q(b => b.eq('email', key).eq('key', 'linked_teens'));
      if (!mine) return null;
      const v = parse(mine[0] && mine[0].value) || {};
      const teens = (Array.isArray(v.teens) ? v.teens : []).filter(t => t && !t.pending && KEY.test(low(t.key || t.email)));
      teens.forEach(t => add(out.teens, emailOfKey(t.key || t.email), t.name && !EMAIL.test(low(t.name)) ? t.name : ''));
      if (teens.length) {
        const apps = await q(b => b.in('email', teens.map(t => low(t.key || t.email))).like('key', 'job_app:%'));
        if (!apps) return null;
        apps.forEach(r => { const a = parse(r.value); if (!live(a)) return; const job = a.job || {}; add(out.employers, emailOfKey(a.employerKey), job.employer || job.business, job.title); });
      }
    } else {
      const posts = await q(b => b.eq('email', key).like('key', 'job_post:%'));
      if (!posts) return null;
      const jobs = {};
      posts.forEach(r => { const v = parse(r.value); if (v && v.id) jobs[v.id] = v.title || ''; });
      const idList = Object.keys(jobs);
      if (idList.length) {
        const apps = await q(b => b.in('key', idList.slice(0, 200).map(id => 'job_app:' + id)));
        if (!apps) return null;
        apps.forEach(r => {
          const a = parse(r.value); if (!live(a) || low(a.employerKey) !== key) return;
          const title = jobs[a.jobId] || (a.job && a.job.title) || '';
          add(out.teens, emailOfKey(r.email), a.teenName, title);
          if (a.parentEmail) add(out.parents, a.parentEmail, a.parentName, '');
        });
      }
    }
    Object.keys(CAP).forEach(k => { out[k] = out[k].slice(0, CAP[k]); });
    if (role === 'teen') out.parents = out.parents.slice(0, 10);
    return out;
  }

  // the row as saved: a teen's row never sends the v58 teen list, so teen photos work with only the first migration
  function rowFor(fields) {
    const p = st.people, r0 = st.row || {};
    const list = (name, col) => (p ? p[name].map(x => x.email) : (r0[col] || []));
    const row = { owner_key: st.key, audience: audience(), path: r0.path || null };
    if (st.role === 'teen') Object.assign(row, { parent_viewers: list('parents', 'parent_viewers'), employer_viewers: list('employers', 'employer_viewers') });
    else if (st.role === 'parent') Object.assign(row, { parent_viewers: [], teen_viewers: list('teens', 'teen_viewers'), employer_viewers: list('employers', 'employer_viewers') });
    else Object.assign(row, { employer_viewers: [], teen_viewers: list('teens', 'teen_viewers'), parent_viewers: list('parents', 'parent_viewers') });
    return Object.assign(row, fields, { updated_at: new Date().toISOString() });
  }
  async function save(c, fields) {
    // when my records couldn't be read just now, keep the lists saved last time
    const row = rowFor(fields);
    let r;
    try { r = await c.from(TABLE).upsert(row, { onConflict: 'owner_key' }).select(cols(st.role)).single(); } catch (e) { r = { error: e }; }
    if (r && r.error) { if (missing(r.error)) st.setup = 'missing'; return false; }
    st.row = r.data || row;
    return true;
  }
  const listsOf = (role, p) => role === 'teen' ? [['parent_viewers', p.parents], ['employer_viewers', p.employers]]
    : role === 'parent' ? [['teen_viewers', p.teens], ['employer_viewers', p.employers]]
    : [['teen_viewers', p.teens], ['parent_viewers', p.parents]];

  async function syncViewers(force) {
    const u = current(); if (!isReal(u)) return;
    if (!force && Date.now() - st.syncedAt < 2 * 60 * 1000) return;
    await loadMine();
    if (st.setup !== 'ok') return;
    const key = st.key, role = st.role, c = await client(); if (!c || st.key !== key) return;
    const people = await readPeople(c, key, role);
    if (!people || st.key !== key) return;
    st.people = people; st.syncedAt = Date.now();
    const r = st.row;
    if (r && listsOf(role, people).some(([col, list]) => !sameList(r[col], list.map(x => x.email)))) await save(c, {});
    draw();
  }

  /* making the picture: a 400×400 JPEG, cropped to the middle (a little higher on tall photos, where faces are) */
  function decode(file) {
    if (typeof createImageBitmap === 'function') return createImageBitmap(file).catch(() => viaImg(file));
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
      img.src = url;
    });
  }
  async function squareJpeg(file) {
    const src = await decode(file);
    const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, s = Math.min(w, h);
    if (!s) throw new Error('decode');
    const cv = document.createElement('canvas'); cv.width = cv.height = SIZE;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(src, (w - s) / 2, h > w ? (h - s) * 0.25 : (h - s) / 2, s, s, 0, 0, SIZE, SIZE);
    try { src.close && src.close(); } catch (e) {}
    const blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.85));
    if (!blob) throw new Error('encode');
    return blob;
  }

  function say(msg, kind) { st.msg = msg || ''; st.msgKind = kind || ''; draw(); }

  async function upload(file) {
    const u = current(); if (!u || st.busy) return;
    if (!file) return;
    if (!/^image\//i.test(file.type || '') && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || '')) return say('That file isn\'t a picture. Choose a JPG or PNG photo.', 'bad');
    if (file.size > MAX_IN) return say('That picture is too big (over 20 MB). Choose a smaller one.', 'bad');
    st.busy = true; say('Getting your photo ready…');
    let blob;
    try { blob = await squareJpeg(file); }
    catch (e) { st.busy = false; return say('This picture can\'t be opened here. Try a JPG or PNG photo.', 'bad'); }
    if (isPractice(u)) {
      if (st.practiceUrl) { try { URL.revokeObjectURL(st.practiceUrl); } catch (e) {} }
      st.practiceUrl = URL.createObjectURL(blob); st.busy = false;
      say('Practice account: your photo shows here only. It was not uploaded and goes away when you leave.', 'ok');
      return;
    }
    await loadMine(true);
    const key = st.key, c = await client();
    if (st.setup !== 'ok' || !c) { st.busy = false; return say(setupText(), 'bad'); }
    const s = await sessionFor(c, key);
    if (!s) { st.busy = false; st.setup = 'signin'; return say(setupText(), 'bad'); }
    say('Uploading…');
    if (!st.people) { const p = await readPeople(c, key, st.role); if (p) st.people = p; }
    const path = s.user.id + '/p' + slotOf(key) + '-' + Date.now() + '.jpg', old = st.row && st.row.path;
    let up;
    try { up = await c.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '3600' }); } catch (e) { up = { error: e }; }
    if (st.key !== key) return;
    if (up && up.error) { st.busy = false; if (missing(up.error)) st.setup = 'missing'; return say(st.setup === 'missing' ? setupText() : 'The upload didn\'t work. Check your connection and try again.', 'bad'); }
    if (!(await save(c, { path }))) {
      try { await c.storage.from(BUCKET).remove([path]); } catch (e) {}
      st.busy = false; return say(st.setup === 'missing' ? setupText() : 'Your photo couldn\'t be saved. Please try again.', 'bad');
    }
    if (old && old !== path) { try { await c.storage.from(BUCKET).remove([old]); } catch (e) {} }
    st.url = (await signed(c, [path]))[path] || URL.createObjectURL(blob);
    st.busy = false; st.loadedAt = Date.now();
    say('Photo saved. ' + whoShort() + '.', 'ok');
    toast('📷 Profile photo saved');
  }

  async function removePhoto() {
    const u = current(); if (!u || st.busy) return;
    if (isPractice(u)) {
      if (st.practiceUrl) { try { URL.revokeObjectURL(st.practiceUrl); } catch (e) {} }
      st.practiceUrl = ''; return say('Photo removed.', 'ok');
    }
    const old = st.row && st.row.path; if (!old) return;
    const c = await client(); if (!c) return say('Can\'t reach TeenWork right now. Check your connection and try again.', 'bad');
    st.busy = true; say('Removing…');
    // Take the photo off the row first, so nobody gets a new link, then delete the file.
    if (!(await save(c, { path: null }))) { st.busy = false; return say('Your photo couldn\'t be removed. Please try again.', 'bad'); }
    try { await c.storage.from(BUCKET).remove([old]); } catch (e) {}
    st.url = ''; st.busy = false;
    say('Photo removed. People see your initials again.', 'ok');
  }

  async function setAudience(a) {
    const u = current(); if (!u || !(AUD[st.role] || []).includes(a) || a === audience()) return;
    if (isPractice(u)) { st.row = Object.assign({}, st.row || {}, { audience: a }); return say('Saved for this practice account.', 'ok'); }
    const c = await client();
    if (!c || st.setup !== 'ok') { draw(); return say(setupText(), 'bad'); }
    const before = st.row;
    st.row = Object.assign({}, st.row || {}, { audience: a }); draw();
    if (!st.people) { const p = await readPeople(c, st.key, st.role); if (p) st.people = p; }
    if (await save(c, { audience: a })) say('Saved. ' + whoShort() + '.', 'ok');
    else { st.row = before; say(st.setup === 'missing' ? setupText() : 'That change didn\'t save. Please try again.', 'bad'); }
  }

  /* ══ 2. the photo box ═══════════════════════════════════════════════ */
  function setupText() {
    return st.setup === 'missing' ? 'Photo upload is still being set up. Check back soon.'
      : st.setup === 'signin' ? 'To add a photo, sign out and sign back in, then try again.'
      : st.setup === 'offline' ? 'Can\'t reach TeenWork right now. Check your connection and try again.' : '';
  }
  const ROLE_TAG = { parents: ' (parent)', employers: '', teens: '' };
  function nameOf(p, kind) {
    const jobs = p.jobs && p.jobs.length ? ' <span class="tw55-mail">for ' + p.jobs.map(esc).join(', ') + '</span>' : '';
    return (p.name ? esc(p.name) + ROLE_TAG[kind] + ' <span class="tw55-mail">' + esc(p.email) + '</span>' : esc(p.email) + ROLE_TAG[kind]) + jobs;
  }
  function whoShort() {
    const a = audience(), p = st.people || { parents: [], employers: [], teens: [] };
    if (a === 'me') return 'Only you can see it';
    const n = SHOWS[a].reduce((t, k) => t + p[k].length, 0);
    return n ? 'You and ' + n + (n === 1 ? ' other person' : ' other people') + ' can see it' : 'Right now only you can see it';
  }
  const EMPTY = {
    teen: { parents: 'No parent is linked yet, so no parent sees it.', employers: 'No employers yet. An employer is added after your parent approves your application to their job.' },
    parent: { teens: 'No teen is linked yet. Your teens are added once you link to them.', employers: 'No employers yet. An employer is added after you approve your teen\'s application to their job.' },
    employer: { teens: 'No applicants yet. A teen is added once their application reaches you, after their parent says OK.', parents: 'No parents yet. A parent is added when they approve their teen\'s application to your job.' },
  };
  const PRACTICE = {
    parent: 'Your linked parent', employers: 'Your linked parent, and employers after your parent approves an application',
    teens: 'Your linked teens', teens_employers: 'Your linked teens, and their employers after you approve an application',
  };
  function whoHTML() {
    const a = audience(), role = st.role, p = st.people, has = !!photoUrl();
    const lead = has ? '<b>Who can see your photo right now:</b>' : '<b>No photo yet.</b> If you add one, it shows to:';
    if (a === 'me') return lead + '<ul><li>Only you</li></ul>';
    if (st.setup === 'practice') {
      const what = role === 'employer' ? (a === 'teens' ? 'Teens whose application reached you' : 'Those teens and the parents who approved them') : PRACTICE[a];
      return lead + '<ul><li>You</li><li>' + what + ' (in a real account)</li></ul>';
    }
    if (!p) return lead + '<ul><li>You</li><li class="tw55-muted">Checking who that is…</li></ul>';
    const li = ['<li>You</li>'];
    SHOWS[a].forEach(k => {
      p[k].forEach(x => li.push('<li>' + nameOf(x, k) + '</li>'));
      if (!p[k].length) li.push('<li class="tw55-muted">' + esc(EMPTY[role][k]) + '</li>');
    });
    return lead + '<ul>' + li.join('') + '</ul>';
  }
  function initials(u) {
    const n = String((u && (u.name || u.businessName)) || '').trim().split(/\s+/).filter(Boolean);
    return n.length ? (n[0][0] + (n.length > 1 ? n[n.length - 1][0] : '')).toUpperCase() : '🙂';
  }
  function draw() {
    const u = current(); if (!u) return;
    const I = ids(st.role), box = $(I.box); if (!box) return;
    const url = photoUrl(), av = $(I.av), cap = $(I.cap);
    const want = url ? 'url("' + url.replace(/["\\]/g, '') + '")' : '';
    const avatars = [av];
    if (st.role === 'employer') avatars.push($('emp-profile-avatar-display'));
    avatars.forEach(el => {
      if (!el) return;
      if (el.style.backgroundImage !== want && (want || el.style.backgroundImage)) el.style.backgroundImage = want;
      el.classList.toggle('tw55-has-photo', !!url);
    });
    if (av && st.role !== 'teen' && !url) { const t = initials(u); if (av.textContent !== t) av.textContent = t; }
    if (cap) cap.textContent = url ? 'Your photo' : 'Default avatar (your initials)';
    const ready = st.setup === 'ok' || st.setup === 'practice';
    const pick = $(I.pick), rm = $(I.rm), stat = $(I.stat), who = $(I.who), fs = $(I.aud);
    // offline: the button stays on, and trying again checks the connection again
    if (pick) { pick.disabled = st.setup === 'missing' || st.setup === 'signin' || st.busy; pick.textContent = url ? '📷 Change photo' : '📷 Add a photo'; }
    if (rm) { rm.hidden = !url; rm.disabled = st.busy; }
    if (fs) {
      fs.disabled = !ready || st.busy;
      const a = audience();
      fs.querySelectorAll('input[name="' + I.radio + '"]').forEach(r => { r.checked = r.value === a; });
    }
    if (stat) {
      const t = st.msg || (st.setup === 'practice' ? 'Practice account: a photo you add stays on this screen only and is never uploaded.' : setupText());
      if (stat.textContent !== t) stat.textContent = t;
      stat.className = 'tw55-status' + (st.msgKind ? ' ' + st.msgKind : (!ready && st.setup !== 'idle' ? ' bad' : ''));
    }
    if (who) {
      const h = ready ? whoHTML() + '<p class="tw55-note">Everyone else sees your initials. TeenWork\'s owner can open stored photos to keep the site safe.</p>' : '';
      if (who.innerHTML !== h) who.innerHTML = h;
      who.hidden = !h;
    }
  }

  function wirePanel(role) {
    if (role !== 'teen') addPanel(role);
    const I = ids(role), box = $(I.box); if (!box || box.__tw55) return;
    box.__tw55 = true;
    const file = $(I.file), pick = $(I.pick), rm = $(I.rm), fs = $(I.aud);
    if (pick && file) pick.addEventListener('click', () => { st.msg = ''; file.value = ''; file.click(); });
    if (file) file.addEventListener('change', () => { const f = file.files && file.files[0]; upload(f); });
    if (rm) rm.addEventListener('click', removePhoto);
    if (fs) fs.addEventListener('change', e => { if (e.target && e.target.name === I.radio) setAudience(e.target.value); });
  }

  /* ══ 3. seeing the photos I'm allowed to ═══════════════════════════ */
  // account key → { url, exp }: a link is reused until 2 minutes before it runs out; "no photo" is asked again
  // after 5 minutes (60 when the photo tables aren't set up yet). The cache belongs to one signed-in account.
  const cache = new Map();
  let cacheFor = '', inflight = null;
  async function fetchPhotos(need) {
    const c = await client(), u = me();
    if (!c || !isReal(u) || !(await sessionFor(c, keyOf(u)))) return;
    for (let i = 0; i < need.length; i += 100) {
      const part = need.slice(i, i + 100);
      let r; try { r = await c.rpc('tw_photo_paths', { p_keys: part }); } catch (e) { r = { error: e }; }
      if (cacheFor !== keyOf(me())) return;
      if (r && r.error) { const exp = Date.now() + (missing(r.error) ? 60 : 5) * 60 * 1000; part.forEach(k => cache.set(k, { url: '', exp })); continue; }
      const rows = (r && r.data) || [], links = await signed(c, rows.map(x => x.path).filter(Boolean));
      if (cacheFor !== keyOf(me())) return;
      part.forEach(k => {
        const row = rows.find(x => low(x.owner_key) === k), url = row ? links[row.path] || '' : '';
        cache.set(k, { url, exp: Date.now() + (url ? LINK_SECS - 120 : 5 * 60) * 1000 });
      });
    }
  }
  async function photosFor(keys) {
    const who = keyOf(me());
    if (cacheFor !== who) { cache.clear(); cacheFor = who; }
    keys = uniq(keys.map(low).filter(k => KEY.test(k) && k !== who));
    while (inflight) { try { await inflight; } catch (e) {} }
    const now = Date.now(), need = keys.filter(k => { const h = cache.get(k); return !h || h.exp < now; });
    if (need.length) { inflight = fetchPhotos(need); try { await inflight; } catch (e) {} finally { inflight = null; } }
    const out = {};
    if (cacheFor === keyOf(me())) keys.forEach(k => { const h = cache.get(k); if (h && h.url) out[k] = h.url; });
    return out;
  }
  function paint(el, url, label) {
    const want = 'url("' + url.replace(/["\\]/g, '') + '")';
    if (el.style.backgroundImage !== want) el.style.backgroundImage = want;
    el.classList.add('tw55-has-photo');
    el.setAttribute('role', 'img'); el.setAttribute('aria-label', label);
  }
  function unpaint(el) {
    if (!el.classList.contains('tw55-has-photo')) return;
    el.classList.remove('tw55-has-photo'); el.style.backgroundImage = ''; el.removeAttribute('role'); el.removeAttribute('aria-label');
  }
  function applicants() { try { return typeof demoApplicants !== 'undefined' && Array.isArray(demoApplicants) ? demoApplicants : []; } catch (e) { return []; } }
  function chatContacts() { try { return typeof msgAllContacts !== 'undefined' && Array.isArray(msgAllContacts) ? msgAllContacts : []; } catch (e) { return []; } }
  function activeChat() { try { return typeof msgActiveContactId !== 'undefined' ? msgActiveContactId : null; } catch (e) { return null; } }
  function chatSpots(spots) {
    const list = chatContacts(); if (!list.length) return;
    const byId = id => list.find(c => c && c.id === id) || null;
    document.querySelectorAll('#msg-contacts-list .msg-contact').forEach(row => {
      const m = /openMsgChat\('([^']+)'\)/.exec(row.getAttribute('onclick') || ''), c = m ? byId(m[1]) : null;
      const el = row.querySelector('.msg-contact-avatar');
      if (el && c && c.cloudKey) spots.push({ el, key: low(c.cloudKey), name: c.name || 'this person' });
    });
    const head = document.querySelector('#msg-main-area .msg-header-avatar'), c = byId(activeChat());
    if (head && c && c.cloudKey) spots.push({ el: head, key: low(c.cloudKey), name: c.name || 'this person' });
  }
  async function decorate() {
    const u = me(); if (!isReal(u)) return;
    const spots = [];
    if (u.type === 'parent') {
      document.querySelectorAll('#page-parent [data-tw-photo-key]').forEach(el => spots.push({ el, key: low(el.getAttribute('data-tw-photo-key')), name: el.getAttribute('data-tw-photo-name') || 'your teen' }));
    } else if (u.type === 'employer') {
      const list = applicants();
      document.querySelectorAll('#emp-kanban-board [ondragstart]').forEach(card => {
        const m = /_kDragging=(\d+)/.exec(card.getAttribute('ondragstart') || ''), a = m ? list[+m[1]] : null;
        if (!a || !a._jb || !a._teenKey) return;
        const nameEl = card.firstElementChild; if (!nameEl) return;
        spots.push({ el: nameEl.querySelector('.tw55-mini'), key: low(a._teenKey), name: a.name || 'this applicant', card: nameEl });
      });
    }
    chatSpots(spots);
    if (!spots.length) return;
    const urls = await photosFor(spots.map(s => s.key));
    if (me() !== u) return;
    spots.forEach(s => {
      const url = urls[s.key];
      if (s.card) {
        let mini = s.card.querySelector('.tw55-mini');
        if (url && !mini) { mini = document.createElement('span'); mini.className = 'tw55-mini'; s.card.prepend(mini); s.card.classList.add('tw55-named'); }
        if (url) paint(mini, url, 'Photo of ' + s.name); else if (mini) { mini.remove(); s.card.classList.remove('tw55-named'); }
      } else if (url) paint(s.el, url, 'Photo of ' + s.name); else unpaint(s.el);
    });
  }

  /* ══ wiring ═════════════════════════════════════════════════════════ */
  let queued = false;
  function tick() {
    queued = false;
    const u = me(), role = roleOf(u);
    if (!role) return;
    const I = ids(role), page = $(I.page);
    if (page && page.classList.contains('active')) {
      wirePanel(role); current();
      if (st.setup === 'practice' || isPractice(u)) { st.setup = 'practice'; draw(); }
      else {
        const tab = $(I.tab);
        if (tab && tab.classList.contains('active')) syncViewers().then(draw, () => {});
        else syncViewers().catch(() => {});
        draw();
      }
    }
    decorate().catch(e => console.warn('profile-photo', e));
  }
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  function watch() {
    ['page-teen', 'ttab-resume', 'page-parent', 'ptab-teens', 'page-employer', 'etab-profile'].forEach(id => { const el = $(id); if (el && !el.__tw55c) { el.__tw55c = true; new MutationObserver(schedule).observe(el, { attributes: true, attributeFilter: ['class'] }); } });
    ['emp-kanban-board', 'multi-teen-list', 'msg-contacts-list', 'msg-main-area'].forEach(id => { const el = $(id); if (el && !el.__tw55w) { el.__tw55w = true; new MutationObserver(schedule).observe(el, { childList: true, subtree: true }); } });
    const ov = $('ptab-overview'); if (ov && !ov.__tw55w) { ov.__tw55w = true; new MutationObserver(schedule).observe(ov, { childList: true, subtree: true }); }
    schedule();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  window._twPhotoV55 = { state: st, loadMine, syncViewers, upload, removePhoto, setAudience, photosFor, decorate, draw, squareJpeg, cache, readPeople };
})();
