/* ═══════════════════════════════════════════════════════════════════
   v55 · TEEN PROFILE PHOTOS, STORED IN SUPABASE  (2026-11-07, Aya:
   "store them in supabase also let them choose who can see it")
   • A teen adds a photo on Profile → Account Settings → Profile Photo.
     The browser makes it a 400×400 JPEG (this also drops hidden data
     such as where the photo was taken) and uploads it to the PRIVATE
     Storage bucket "profile-photos", folder = the teen's sign-in id.
   • The teen picks who can see it: only me / me and my parent / my
     parent and employers (an employer only after a parent approved the
     teen's application to that employer's job). The choice and the
     people it covers are saved in public.tw_profile_photos, which only
     the teen's own signed-in account can write. Storage gives a viewer
     a one-hour link only when that row allows them
     (supabase/migrations/20261107_profile_photos.sql).
   • The teen's app keeps the parent and employer lists up to date from
     the parent link and the teen's applications (on sign-in, on opening
     Profile, when the tab comes back, and when the choice changes), and
     the panel lists exactly who can see the photo right now.
   • Parents see it on the teen card and in My Teens; employers on the
     Applicant Pipeline cards. Everyone else sees initials.
   • Practice (demo) accounts never upload: the photo stays on the
     screen until they leave.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twPhoto55) return;
  window.__twPhoto55 = true;

  const BUCKET = 'profile-photos', TABLE = 'tw_profile_photos', SIZE = 400, MAX_IN = 20 * 1024 * 1024, LINK_SECS = 3600;
  const AUD = ['me', 'parent', 'employers'];
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
  const ROLES = ['teen', 'parent', 'employer'];
  const isPractice = u => !!(u && (u.twDemo || u.isDemo || /\.demo$/i.test(String(u.email || '')) || (typeof window._twIsDemoSandboxUser === 'function' && window._twIsDemoSandboxUser(u))));
  const isReal = u => !!(u && !isPractice(u) && !u.isAdmin && ROLES.includes(u.type) && KEY.test(keyOf(u)));

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
  const missing = err => !!err && (err.code === 'PGRST205' || err.code === 'PGRST202' || err.code === '42P01' || err.code === '42883' ||
    /tw_profile_photos|tw_photo_paths|bucket not found|schema cache/i.test(String(err.message || '')));

  /* ══ 1. the teen's own photo ═══════════════════════════════════════ */
  // setup: 'idle' (not loaded) · 'ok' · 'missing' (migration not applied) · 'signin' (no Supabase session for this
  // account) · 'offline' · 'practice'
  const st = { key: '', setup: 'idle', row: null, url: '', practiceUrl: '', busy: false, people: null, msg: '', msgKind: '', loadedAt: 0, syncedAt: 0 };
  function reset(key) {
    if (st.practiceUrl) { try { URL.revokeObjectURL(st.practiceUrl); } catch (e) {} }
    Object.assign(st, { key, setup: 'idle', row: null, url: '', practiceUrl: '', busy: false, people: null, msg: '', msgKind: '', loadedAt: 0, syncedAt: 0 });
  }
  function current() {
    const u = me();
    if (!u || u.type !== 'teen') return null;
    const key = isPractice(u) ? 'practice:' + low(u.email) : keyOf(u);
    if (st.key !== key) reset(key);
    return u;
  }
  const audience = () => (st.row && AUD.includes(st.row.audience) ? st.row.audience : 'parent');
  const photoUrl = () => st.practiceUrl || st.url;

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
    const key = st.key, fail = s => { st.setup = s; st.loadedAt = Date.now(); draw(); };
    const c = await client();
    if (st.key !== key) return;
    if (!c) return fail('offline');
    if (!(await sessionFor(c, key))) return fail('signin');
    let r;
    try { r = await c.from(TABLE).select('path,audience,parent_viewers,employer_viewers').eq('owner_key', key).maybeSingle(); } catch (e) { r = { error: e }; }
    if (st.key !== key) return;
    if (r && r.error) return fail(missing(r.error) ? 'missing' : 'offline');
    st.row = (r && r.data) || null;
    st.setup = 'ok'; st.loadedAt = Date.now();
    st.url = st.row && st.row.path ? ((await signed(c, [st.row.path]))[st.row.path] || '') : '';
    draw();
  }

  // Who the teen's own records say may see the photo: approved linked parents, and employers of jobs a parent
  // approved (or a tester's direct applications). Read from the teen's own rows on every sync.
  async function readPeople(c, key) {
    const q = async build => { try { const r = await build(c.from('user_data').select('key,value').eq('email', key)); return r && !r.error ? (r.data || []) : null; } catch (e) { return null; } };
    const [linkRows, appRows] = await Promise.all([q(b => b.eq('key', 'parent_link')), q(b => b.like('key', 'job_app:%'))]);
    if (!linkRows || !appRows) return null;
    const self = emailOfKey(key);
    const parents = [], employers = [];
    const link = parse(linkRows[0] && linkRows[0].value) || {};
    if (link.status === 'approved') {
      uniq((Array.isArray(link.parents) ? link.parents : []).concat(link.parentEmail ? [link.parentEmail] : []).map(low))
        .filter(e => EMAIL.test(e) && e !== self).slice(0, 10)
        .forEach(e => parents.push({ email: e, name: e === low(link.parentEmail) ? String(link.parentName || '').slice(0, 60) : '' }));
    }
    appRows.forEach(r => {
      const v = parse(r.value);
      if (!v || !['applied', 'hired'].includes(v.status)) return;
      const e = emailOfKey(v.employerKey);
      if (!EMAIL.test(e) || e === self) return;
      const job = v.job || {};
      let p = employers.find(x => x.email === e);
      if (!p) { p = { email: e, name: String(job.employer || job.business || '').slice(0, 60), jobs: [] }; employers.push(p); }
      if (job.title && p.jobs.length < 3) p.jobs.push(String(job.title).slice(0, 60));
    });
    return { parents, employers: employers.slice(0, 200) };
  }

  async function save(c, fields) {
    // when the parent link and applications couldn't be read just now, keep the lists saved last time
    const p = st.people, r0 = st.row || {};
    const row = Object.assign({
      owner_key: st.key,
      audience: audience(),
      path: r0.path || null,
      parent_viewers: p ? p.parents.map(x => x.email) : (r0.parent_viewers || []),
      employer_viewers: p ? p.employers.map(x => x.email) : (r0.employer_viewers || []),
    }, fields, { updated_at: new Date().toISOString() });
    let r;
    try { r = await c.from(TABLE).upsert(row, { onConflict: 'owner_key' }).select('path,audience,parent_viewers,employer_viewers').single(); } catch (e) { r = { error: e }; }
    if (r && r.error) { if (missing(r.error)) st.setup = 'missing'; return false; }
    st.row = r.data || row;
    return true;
  }

  async function syncViewers(force) {
    const u = current(); if (!isReal(u)) return;
    if (!force && Date.now() - st.syncedAt < 2 * 60 * 1000) return;
    await loadMine();
    if (st.setup !== 'ok') return;
    const key = st.key, c = await client(); if (!c || st.key !== key) return;
    const people = await readPeople(c, key);
    if (!people || st.key !== key) return;
    st.people = people; st.syncedAt = Date.now();
    const r = st.row;
    if (r && (!sameList(r.parent_viewers, people.parents.map(x => x.email)) || !sameList(r.employer_viewers, people.employers.map(x => x.email)))) await save(c, {});
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
    if (!st.people) { const p = await readPeople(c, key); if (p) st.people = p; }
    const path = s.user.id + '/p' + slotOf(key) + '-' + Date.now() + '.jpg', old = st.row && st.row.path;
    let up;
    try { up = await c.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '3600' }); } catch (e) { up = { error: e }; }
    if (st.key !== key) return;
    if (up && up.error) { st.busy = false; if (missing(up.error)) st.setup = 'missing'; return say(st.setup === 'missing' ? setupText() : 'The upload didn\'t work. Check your connection and try again.', 'bad'); }
    if (!(await save(c, { path }))) {
      try { await c.storage.from(BUCKET).remove([path]); } catch (e) {}
      st.busy = false; return say('Your photo couldn\'t be saved. Please try again.', 'bad');
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
    const u = current(); if (!u || !AUD.includes(a) || a === audience()) return;
    if (isPractice(u)) { st.row = Object.assign({}, st.row || {}, { audience: a }); return say('Saved for this practice account.', 'ok'); }
    const c = await client();
    if (!c || st.setup !== 'ok') { draw(); return say(setupText(), 'bad'); }
    const before = st.row;
    st.row = Object.assign({}, st.row || {}, { audience: a }); draw();
    if (!st.people) { const p = await readPeople(c, st.key); if (p) st.people = p; }
    if (await save(c, { audience: a })) say('Saved. ' + whoShort() + '.', 'ok');
    else { st.row = before; say('That change didn\'t save. Please try again.', 'bad'); }
  }

  /* ══ 2. the Profile Photo panel ════════════════════════════════════ */
  function setupText() {
    return st.setup === 'missing' ? 'Photo upload is still being set up. Check back soon.'
      : st.setup === 'signin' ? 'To add a photo, sign out and sign back in, then try again.'
      : st.setup === 'offline' ? 'Can\'t reach TeenWork right now. Check your connection and try again.' : '';
  }
  function nameOf(p, role) {
    return p.name ? esc(p.name) + (role === 'parent' ? ' (parent)' : '') + ' <span class="tw55-mail">' + esc(p.email) + '</span>'
      : esc(p.email) + (role === 'parent' ? ' (parent)' : '');
  }
  function whoShort() {
    const a = audience(), p = st.people || { parents: [], employers: [] };
    if (a === 'me') return 'Only you can see it';
    const n = p.parents.length + (a === 'employers' ? p.employers.length : 0);
    return n ? 'You and ' + n + (n === 1 ? ' other person' : ' other people') + ' can see it' : 'Right now only you can see it';
  }
  function whoHTML(u) {
    const a = audience(), p = st.people, practice = st.setup === 'practice';
    const has = !!photoUrl();
    const lead = has ? '<b>Who can see your photo right now:</b>' : '<b>No photo yet.</b> If you add one, it shows to:';
    if (a === 'me') return lead + '<ul><li>Only you</li></ul>';
    if (practice) return lead + '<ul><li>You</li><li>' + (a === 'employers' ? 'Your linked parent, and employers after your parent approves an application' : 'Your linked parent') + ' (in a real account)</li></ul>';
    if (!p) return lead + '<ul><li>You</li><li class="tw55-muted">Checking your parent link…</li></ul>';
    const li = ['<li>You</li>'];
    p.parents.forEach(x => li.push('<li>' + nameOf(x, 'parent') + '</li>'));
    if (!p.parents.length) li.push('<li class="tw55-muted">No parent is linked yet, so no parent sees it.</li>');
    if (a === 'employers') {
      p.employers.forEach(x => li.push('<li>' + nameOf(x, 'employer') + (x.jobs.length ? ' <span class="tw55-mail">for ' + x.jobs.map(esc).join(', ') + '</span>' : '') + '</li>'));
      if (!p.employers.length) li.push('<li class="tw55-muted">No employers yet. An employer is added after your parent approves your application to their job.</li>');
    }
    return lead + '<ul>' + li.join('') + '</ul>';
  }
  function draw() {
    const u = current(), box = $('tw55-photo'); if (!box || !u) return;
    const url = photoUrl(), av = $('tw53-avatar'), cap = $('tw55-cap');
    if (av) {
      const want = url ? 'url("' + url.replace(/["\\]/g, '') + '")' : '';
      if (av.style.backgroundImage !== want && (want || av.style.backgroundImage)) av.style.backgroundImage = want;
      av.classList.toggle('tw55-has-photo', !!url);
    }
    if (cap) cap.textContent = url ? 'Your photo' : 'Default avatar (your initials)';
    const ready = st.setup === 'ok' || st.setup === 'practice';
    const pick = $('tw55-pick'), rm = $('tw55-remove'), stat = $('tw55-status'), who = $('tw55-who'), fs = $('tw55-aud');
    // offline: the button stays on, and trying again checks the connection again
    if (pick) { pick.disabled = st.setup === 'missing' || st.setup === 'signin' || st.busy; pick.textContent = url ? '📷 Change photo' : '📷 Add a photo'; }
    if (rm) { rm.hidden = !url; rm.disabled = st.busy; }
    if (fs) {
      fs.disabled = !ready || st.busy;
      const a = audience();
      fs.querySelectorAll('input[name="tw55-aud"]').forEach(r => { r.checked = r.value === a; });
    }
    if (stat) {
      const t = st.msg || (st.setup === 'practice' ? 'Practice account: a photo you add stays on this screen only and is never uploaded.' : setupText());
      if (stat.textContent !== t) stat.textContent = t;
      stat.className = 'tw55-status' + (st.msgKind ? ' ' + st.msgKind : (!ready && st.setup !== 'idle' ? ' bad' : ''));
    }
    if (who) {
      const h = ready ? whoHTML(u) + '<p class="tw55-note">Everyone else sees your initials. TeenWork\'s owner can open stored photos to keep the site safe.</p>' : '';
      if (who.innerHTML !== h) who.innerHTML = h;
      who.hidden = !h;
    }
  }

  function wirePanel() {
    const box = $('tw55-photo'); if (!box || box.__tw55) return;
    box.__tw55 = true;
    const file = $('tw55-file'), pick = $('tw55-pick'), rm = $('tw55-remove'), fs = $('tw55-aud');
    if (pick && file) pick.addEventListener('click', () => { st.msg = ''; file.value = ''; file.click(); });
    if (file) file.addEventListener('change', () => { const f = file.files && file.files[0]; upload(f); });
    if (rm) rm.addEventListener('click', removePhoto);
    if (fs) fs.addEventListener('change', e => { if (e.target && e.target.name === 'tw55-aud') setAudience(e.target.value); });
  }

  /* ══ 3. parents and employers see the photos they're allowed to ════ */
  // account key → { url, exp }: a link is reused until 2 minutes before it runs out; "no photo" is asked again
  // after 5 minutes (60 when the photo tables aren't set up yet)
  const cache = new Map();
  let inflight = null;
  async function fetchPhotos(need) {
    const c = await client(), u = me();
    if (!c || !isReal(u) || !(await sessionFor(c, keyOf(u)))) return;
    for (let i = 0; i < need.length; i += 100) {
      const part = need.slice(i, i + 100);
      let r; try { r = await c.rpc('tw_photo_paths', { p_keys: part }); } catch (e) { r = { error: e }; }
      if (r && r.error) { const exp = Date.now() + (missing(r.error) ? 60 : 5) * 60 * 1000; part.forEach(k => cache.set(k, { url: '', exp })); continue; }
      const rows = (r && r.data) || [], links = await signed(c, rows.map(x => x.path).filter(Boolean));
      part.forEach(k => {
        const row = rows.find(x => low(x.owner_key) === k), url = row ? links[row.path] || '' : '';
        cache.set(k, { url, exp: Date.now() + (url ? LINK_SECS - 120 : 5 * 60) * 1000 });
      });
    }
  }
  async function photosFor(keys) {
    keys = uniq(keys.map(low).filter(k => KEY.test(k)));
    while (inflight) { try { await inflight; } catch (e) {} }
    const now = Date.now(), need = keys.filter(k => { const h = cache.get(k); return !h || h.exp < now; });
    if (need.length) { inflight = fetchPhotos(need); try { await inflight; } catch (e) {} finally { inflight = null; } }
    const out = {}; keys.forEach(k => { const h = cache.get(k); if (h && h.url) out[k] = h.url; });
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
  async function decorate() {
    const u = me(); if (!isReal(u) || (u.type !== 'parent' && u.type !== 'employer')) return;
    const spots = [];
    if (u.type === 'parent') {
      document.querySelectorAll('#page-parent [data-tw-photo-key]').forEach(el => spots.push({ el, key: low(el.getAttribute('data-tw-photo-key')), name: el.getAttribute('data-tw-photo-name') || 'your teen' }));
    } else {
      const list = applicants();
      document.querySelectorAll('#emp-kanban-board [ondragstart]').forEach(card => {
        const m = /_kDragging=(\d+)/.exec(card.getAttribute('ondragstart') || ''), a = m ? list[+m[1]] : null;
        if (!a || !a._jb || !a._teenKey) return;
        const nameEl = card.firstElementChild; if (!nameEl) return;
        let mini = nameEl.querySelector('.tw55-mini');
        spots.push({ el: mini, key: low(a._teenKey), name: a.name || 'this applicant', card: nameEl });
      });
    }
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
    const u = me();
    if (u && u.type === 'teen') {
      wirePanel(); current();
      const prof = $('ttab-resume'), teenOn = $('page-teen') && $('page-teen').classList.contains('active');
      if (teenOn) {
        if (st.setup === 'practice' || isPractice(u)) { st.setup = 'practice'; draw(); }
        else if (prof && prof.classList.contains('active')) syncViewers().then(draw, () => {});
        else syncViewers().catch(() => {});
        draw();
      }
    } else if (u) decorate().catch(e => console.warn('profile-photo-v55', e));
  }
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  function watch() {
    ['page-teen', 'ttab-resume', 'page-parent', 'page-employer'].forEach(id => { const el = $(id); if (el && !el.__tw55c) { el.__tw55c = true; new MutationObserver(schedule).observe(el, { attributes: true, attributeFilter: ['class'] }); } });
    ['emp-kanban-board', 'multi-teen-list'].forEach(id => { const el = $(id); if (el && !el.__tw55w) { el.__tw55w = true; new MutationObserver(schedule).observe(el, { childList: true, subtree: true }); } });
    const ov = $('ptab-overview'); if (ov && !ov.__tw55w) { ov.__tw55w = true; new MutationObserver(schedule).observe(ov, { childList: true, subtree: true }); }
    schedule();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  window._twPhotoV55 = { state: st, loadMine, syncViewers, upload, removePhoto, setAudience, photosFor, decorate, draw, squareJpeg, cache };
})();
