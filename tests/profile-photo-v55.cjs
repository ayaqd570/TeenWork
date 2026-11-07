/* Offline checks for v55 teen profile photos (profile-photo-v55.js).
   • Practice teen: the photo stays in the browser, nothing reaches Supabase.
   • Real teen against a FAKE Supabase client (no network): the photo is made a 400×400 JPEG, uploaded to
     <sign-in id>/p1-….jpg, the "who can see it" choice and the parent / employer lists are saved, the panel names
     the people, changing and removing the photo cleans up the old file, and "not set up yet" is said plainly.
   • A linked parent and an employer see the photo when the teen's choice allows it, and initials otherwise.
   The database rules themselves are checked in tests/profile-photos-sql.mjs.
   Run: node tests/profile-photo-v55.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const zlib = require('node:zlib');

const PORT = 8025, ROOT = 'http://127.0.0.1:' + PORT + '/';
const TEEN = { id: '11111111-1111-1111-1111-111111111111', email: 'teen@example.com' };
const MOM = { id: '22222222-2222-2222-2222-222222222222', email: 'mom@example.com' };
const BOSS = { id: '33333333-3333-3333-3333-333333333333', email: 'boss@example.com' };

// a 900×600 PNG (wider than tall, so the square crop is visible), made here so the test needs no files
function png(w, h) {
  const row = Buffer.alloc(1 + w * 3);
  const raw = Buffer.concat(Array.from({ length: h }, (_, y) => { const r = Buffer.from(row); for (let x = 0; x < w; x++) { r[1 + x * 3] = x % 256; r[2 + x * 3] = y % 256; r[3 + x * 3] = 120; } return r; }));
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const PHOTO = { name: 'me.png', mimeType: 'image/png', buffer: png(900, 600) };

/* A pretend Supabase for one browser tab. It answers what the app asks for and keeps the photo
   table, Storage files and user_data rows in memory. tw_photo_paths follows the same rule as the SQL. */
function fakeSupabase() {
  const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const F = window.__fake = { photos: {}, objects: {}, removed: [], userData: [], session: null, missing: false, calls: [] };
  const ok = data => ({ data, error: null });
  const MISSING = { code: 'PGRST205', message: "Could not find the table 'public.tw_profile_photos' in the schema cache" };
  const match = (row, filters) => filters.every(([op, c, v]) => op === 'eq' ? String(row[c]) === String(v)
    : op === 'like' ? new RegExp('^' + String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$').test(String(row[c]))
    : op === 'in' ? v.map(String).includes(String(row[c])) : true);
  function run(q) {
    F.calls.push(q.table + ':' + q.op);
    const one = list => (q.single || q.maybe ? ok(list[0] || null) : ok(list));
    if (q.table === 'tw_profile_photos') {
      if (F.missing) return { data: null, error: MISSING };
      if (q.op === 'select') return one(Object.values(F.photos).filter(r => match(r, q.filters)).map(r => ({ ...r })));
      if (q.op === 'upsert') {
        const p = q.payload, mine = F.session && F.session.user;
        if (!mine || p.owner_key.split('#')[0] !== mine.email) return { data: null, error: { message: 'new row violates row-level security policy' } };
        F.photos[p.owner_key] = { ...(F.photos[p.owner_key] || { owner_id: mine.id }), ...p };
        return one([{ ...F.photos[p.owner_key] }]);
      }
      return ok(null);
    }
    if (q.table === 'user_data') {
      if (q.op === 'select') return one(F.userData.filter(r => match(r, q.filters)));
      if (q.op === 'upsert' || q.op === 'insert') {
        (Array.isArray(q.payload) ? q.payload : [q.payload]).forEach(p => { const i = F.userData.findIndex(r => r.email === p.email && r.key === p.key); if (i >= 0) F.userData[i] = { ...F.userData[i], ...p }; else F.userData.push({ ...p }); });
        return ok(null);
      }
      return ok(null);
    }
    return q.single || q.maybe ? ok(null) : ok([]);
  }
  function from(table) {
    const q = { table, op: 'select', filters: [], payload: null };
    const api = new Proxy({}, { get(_, prop) {
      if (prop === 'then') return (res, rej) => Promise.resolve().then(() => run(q)).then(res, rej);
      if (prop === 'select') return () => api;
      if (['upsert', 'insert', 'update'].includes(prop)) return p => { q.op = prop; q.payload = p; return api; };
      if (prop === 'delete') return () => { q.op = 'delete'; return api; };
      if (['eq', 'like', 'in'].includes(prop)) return (c, v) => { q.filters.push([prop, c, v]); return api; };
      if (prop === 'single') return () => { q.single = true; return api; };
      if (prop === 'maybeSingle') return () => { q.maybe = true; return api; };
      return () => api;
    } });
    return api;
  }
  const chan = new Proxy({}, { get: (_, p) => (p === 'then' ? undefined : () => chan) });
  const client = {
    from,
    rpc: async (name, args) => {
      F.calls.push('rpc:' + name);
      if (name !== 'tw_photo_paths') return ok(null);
      if (F.missing) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.tw_photo_paths' } };
      const me = F.session && F.session.user; if (!me) return ok([]);
      return ok(Object.values(F.photos).filter(p => args.p_keys.includes(p.owner_key) && p.path && (p.owner_id === me.id
        || (['parent', 'employers'].includes(p.audience) && (p.parent_viewers || []).includes(me.email))
        || (p.audience === 'employers' && (p.employer_viewers || []).includes(me.email)))).map(p => ({ owner_key: p.owner_key, path: p.path })));
    },
    storage: { from: bucket => ({
      upload: async (p, blob, opts) => { F.calls.push('upload:' + bucket); if (F.missing) return { data: null, error: { message: 'Bucket not found' } }; F.objects[p] = { blob, opts, owner: F.session.user.id }; return ok({ path: p }); },
      createSignedUrls: async paths => ok(paths.map(p => (F.objects[p] ? { path: p, signedUrl: PNG1, error: null } : { path: p, signedUrl: null, error: 'not found' }))),
      remove: async paths => { paths.forEach(p => { delete F.objects[p]; F.removed.push(p); }); return ok([]); },
    }) },
    auth: {
      getSession: async () => ok({ session: F.session }),
      getUser: async () => ok({ user: F.session && F.session.user }),
      onAuthStateChange: () => ok({ subscription: { unsubscribe() {} } }),
      signOut: async () => ({ error: null }), signInWithPassword: async () => ({ data: null, error: { message: 'offline test' } }),
      updateUser: async () => ok({ user: F.session && F.session.user }), signUp: async () => ({ data: null, error: { message: 'offline test' } }),
    },
    functions: { invoke: async () => ({ data: null, error: { message: 'offline test' } }) },
    channel: () => chan, removeChannel: () => {}, removeAllChannels: () => {},
  };
  window.supabase = { createClient: () => client };
}

async function open(browser, viewport, fake) {
  const context = await browser.newContext({ viewport });
  const outside = [];
  await context.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname === '127.0.0.1') return r.continue(); outside.push(u.hostname); return r.abort(); });
  if (fake) await context.addInitScript(fakeSupabase);
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window._twDemoSandbox && window._twPhotoV55);
  await p.waitForTimeout(300);
  return { context, p, errors, outside };
}
const noOverflow = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const text = (p, sel) => p.locator(sel).first().evaluate(el => (el.innerText || el.textContent).replace(/\s+/g, ' ').trim());
async function skipIntro(p) {
  if (await p.locator('#tw34-skip').isVisible().catch(() => false)) await p.locator('#tw34-skip').click();
  await p.evaluate(() => { document.getElementById('featpack-install')?.classList.remove('open'); document.querySelectorAll('.tw-welcome-note').forEach(n => n.remove()); });
}
async function profile(p) {
  await p.evaluate(() => switchDashTab(null, 'ttab-resume'));
  await p.waitForTimeout(500);
  await p.locator('#tw55-photo').scrollIntoViewIfNeeded();
}
const avatar = p => p.evaluate(() => { const a = document.getElementById('tw53-avatar'); return { photo: a.classList.contains('tw55-has-photo'), bg: a.style.backgroundImage.slice(0, 20), cap: document.getElementById('tw55-cap').textContent }; });
async function signIn(p, user, extra) {
  await p.evaluate(({ user, extra }) => {
    window.__fake.session = { access_token: 'fake', user: { id: user.id, email: user.email } };
    Object.entries(extra.local || {}).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
    _twLoginLocalAccount(Object.assign({ email: user.email }, extra.acct));
  }, { user, extra });
  await p.waitForTimeout(2200);
  await skipIntro(p);
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      const tag = viewport.width + 'px';

      /* 1. Practice teen: the photo never leaves the browser */
      {
        const { context, p, errors, outside } = await open(browser, viewport, false);
        await p.evaluate(() => _directDemo('teen'));
        await p.waitForTimeout(2600);
        await skipIntro(p);
        await profile(p);
        assert.match(await text(p, '#tw55-status'), /Practice account: a photo you add stays on this screen only and is never uploaded/);
        assert.equal(await p.locator('#tw55-pick').isEnabled(), true);
        const btn = await p.locator('#tw55-pick').boundingBox();
        assert(btn.height >= 44, tag + ': Add a photo button is too small');
        await p.setInputFiles('#tw55-file', PHOTO);
        await p.waitForFunction(() => document.getElementById('tw53-avatar').classList.contains('tw55-has-photo'));
        const a = await avatar(p);
        assert.equal(a.cap, 'Your photo'); assert.match(a.bg, /^url\("blob:/);
        assert.match(await text(p, '#tw55-status'), /was not uploaded/);
        assert.equal(await text(p, '#tw55-pick'), '📷 Change photo');
        assert.equal(await p.locator('#tw55-remove').isVisible(), true);
        await p.locator('#tw55-aud label').filter({ hasText: 'Only me' }).click();
        await p.waitForTimeout(150);
        assert.match(await text(p, '#tw55-who'), /Who can see your photo right now: Only you/);
        assert(await noOverflow(p), tag + ': practice profile overflows');
        await p.locator('#tw55-remove').click();
        await p.waitForTimeout(150);
        assert.equal((await avatar(p)).photo, false);
        const sent = await p.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => /supabase\.co\/(storage|rest)/.test(n)));
        assert.deepEqual(sent, [], tag + ': practice photo reached Supabase');
        assert.deepEqual(errors, []);
        await context.close();
      }

      /* 2. Real teen (fake Supabase): upload, choose who sees it, change, remove */
      {
        const { context, p, errors } = await open(browser, viewport, true);
        await p.evaluate(({ TEEN, MOM, BOSS }) => {
          window.__fake.userData.push(
            { email: TEEN.email, key: 'parent_link', value: JSON.stringify({ status: 'approved', parentEmail: MOM.email, parentName: 'Dana Rivera', parents: [MOM.email] }) },
            { email: TEEN.email, key: 'job_app:101', value: JSON.stringify({ jobId: 101, employerKey: BOSS.email, status: 'applied', job: { title: 'Lawn helper', employer: "Mike's Lawn" } }) },
            { email: TEEN.email, key: 'job_app:102', value: JSON.stringify({ jobId: 102, employerKey: 'other@example.com', status: 'pending-approval', job: { title: 'Dog walker', employer: 'Not yet' } }) });
        }, { TEEN, MOM, BOSS });
        await signIn(p, TEEN, { acct: { name: 'Sam Rivera', type: 'teen', dob: '2010-03-01', city: 'Burlington', state: 'Vermont' },
          local: { tw_parent_links: { [TEEN.email]: { status: 'approved', parentEmail: MOM.email, parentName: 'Dana Rivera', parents: [MOM.email] } } } });
        await profile(p);
        await p.waitForFunction(() => window._twPhotoV55.state.setup === 'ok' && window._twPhotoV55.state.people);
        let who = await text(p, '#tw55-who');
        assert.match(who, /No photo yet\. If you add one, it shows to: You Dana Rivera \(parent\) mom@example\.com/);
        assert.doesNotMatch(who, /boss@example\.com/);
        assert.equal(await p.locator('input[name="tw55-aud"][value="parent"]').isChecked(), true);

        await p.setInputFiles('#tw55-file', PHOTO);
        await p.waitForFunction(() => /Photo saved/.test(document.getElementById('tw55-status').textContent));
        const up = await p.evaluate(async () => {
          const F = window.__fake, paths = Object.keys(F.objects), o = F.objects[paths[0]];
          const bmp = await createImageBitmap(o.blob);
          return { paths, type: o.blob.type, size: o.blob.size, w: bmp.width, h: bmp.height, opts: o.opts, row: F.photos['teen@example.com'] };
        });
        assert.equal(up.paths.length, 1);
        assert.match(up.paths[0], new RegExp('^' + TEEN.id + '/p1-\\d+\\.jpg$'));
        assert.deepEqual([up.type, up.w, up.h, up.opts.contentType, up.opts.upsert], ['image/jpeg', 400, 400, 'image/jpeg', false]);
        assert(up.size < 1048576, 'photo over 1 MB');
        assert.deepEqual([up.row.path, up.row.audience, up.row.parent_viewers, up.row.employer_viewers], [up.paths[0], 'parent', [MOM.email], [BOSS.email]]);
        assert.equal((await avatar(p)).photo, true);
        assert.match(await text(p, '#tw55-status'), /Photo saved\. You and 1 other person can see it\./);
        assert.match(await text(p, '#tw55-who'), /Who can see your photo right now: You Dana Rivera \(parent\)/);

        await p.locator('#tw55-aud label').filter({ hasText: 'My parent and employers' }).click();
        await p.waitForFunction(() => window.__fake.photos['teen@example.com'].audience === 'employers');
        who = await text(p, '#tw55-who');
        assert.match(who, /Mike.s Lawn boss@example\.com for Lawn helper/);
        assert.doesNotMatch(who, /other@example\.com/);
        await p.locator('#tw55-aud label').filter({ hasText: 'Only me' }).click();
        await p.waitForFunction(() => window.__fake.photos['teen@example.com'].audience === 'me');
        assert.match(await text(p, '#tw55-who'), /right now: Only you/);
        await p.locator('#tw55-aud label').filter({ hasText: 'Me and my parent' }).click();
        await p.waitForFunction(() => window.__fake.photos['teen@example.com'].audience === 'parent');

        // a new photo replaces the old file
        const first = up.paths[0];
        await p.waitForTimeout(20);
        await p.setInputFiles('#tw55-file', PHOTO);
        await p.waitForFunction(old => window.__fake.photos['teen@example.com'].path !== old, first);
        await p.waitForFunction(old => window.__fake.removed.includes(old), first);
        assert.equal(await p.evaluate(() => Object.keys(window.__fake.objects).length), 1);
        assert(await noOverflow(p), tag + ': real profile overflows');

        // remove: the row loses the path first, then the file goes
        await p.locator('#tw55-remove').click();
        await p.waitForFunction(() => window.__fake.photos['teen@example.com'].path === null);
        assert.equal(await p.evaluate(() => Object.keys(window.__fake.objects).length), 0);
        assert.equal((await avatar(p)).photo, false);
        assert.match(await text(p, '#tw55-status'), /Photo removed/);

        // a file that isn't a picture
        await p.setInputFiles('#tw55-file', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
        await p.waitForTimeout(200);
        assert.match(await text(p, '#tw55-status'), /That file isn't a picture/);
        assert.deepEqual(errors, []);
        await context.close();
      }

      /* 3. Before the photo setup is applied in Supabase, the panel says so and nothing breaks */
      {
        const { context, p, errors } = await open(browser, viewport, true);
        await p.evaluate(() => { window.__fake.missing = true; });
        await signIn(p, TEEN, { acct: { name: 'Sam Rivera', type: 'teen', dob: '2010-03-01', city: 'Burlington', state: 'Vermont' },
          local: { tw_parent_links: { [TEEN.email]: { status: 'approved', parentEmail: MOM.email, parents: [MOM.email] } } } });
        await profile(p);
        await p.waitForFunction(() => window._twPhotoV55.state.setup === 'missing');
        await p.waitForTimeout(100);
        assert.equal(await text(p, '#tw55-status'), 'Photo upload is still being set up. Check back soon.');
        assert.equal(await p.locator('#tw55-pick').isDisabled(), true);
        assert.equal(await p.locator('#tw55-aud input[value="me"]').isDisabled(), true);
        assert.deepEqual(errors, []);
        await context.close();
      }

      /* 4. The linked parent and an employer see the photo only when the teen's choice allows it */
      if (viewport.width === 1440) {
        const seed = (audience) => ({ TEEN, MOM, BOSS, audience });
        const addPhoto = ({ TEEN, MOM, BOSS, audience }) => {
          const path = TEEN.id + '/p1-1.jpg';
          window.__fake.objects[path] = { blob: new Blob(['x'], { type: 'image/jpeg' }), owner: TEEN.id };
          window.__fake.photos[TEEN.email] = { owner_key: TEEN.email, owner_id: TEEN.id, path, audience, parent_viewers: [MOM.email], employer_viewers: [BOSS.email] };
        };
        for (const audience of ['parent', 'me']) {
          const { context, p, errors } = await open(browser, viewport, true);
          await p.evaluate(addPhoto, seed(audience));
          await signIn(p, MOM, { acct: { name: 'Dana Rivera', type: 'parent' },
            local: { tw_mom_example_com_linked_teens: { teens: [{ key: TEEN.email, email: TEEN.email, name: 'Sam Rivera', linkedAt: Date.now() }], updatedAt: Date.now() } } });
          await p.evaluate(() => { try { renderParentDashboard(); } catch (e) {} });
          await p.waitForTimeout(800);
          const card = await p.evaluate(() => { const a = document.querySelector('#ptab-overview .teen-avatar[data-tw-photo-key]'); return a ? { key: a.dataset.twPhotoKey, photo: a.classList.contains('tw55-has-photo'), label: a.getAttribute('aria-label') } : null; });
          assert(card, 'parent teen card has no photo spot');
          assert.equal(card.key, TEEN.email);
          if (audience === 'parent') { assert.equal(card.photo, true, 'parent should see the photo'); assert.equal(card.label, 'Photo of Sam Rivera'); }
          else assert.equal(card.photo, false, 'parent sees a photo the teen kept to themselves');
          await p.evaluate(() => switchParentTab('ptab-teens', 'pdtab-teens'));
          await p.waitForTimeout(600);
          assert.equal(await p.evaluate(() => !!document.querySelector('#multi-teen-list [data-tw-photo-key].tw55-has-photo')), audience === 'parent');
          assert.deepEqual(errors, []);
          await context.close();
        }
        for (const audience of ['employers', 'parent']) {
          const { context, p, errors } = await open(browser, viewport, true);
          await p.evaluate(addPhoto, seed(audience));
          await signIn(p, BOSS, { acct: { name: "Mike's Lawn", type: 'employer' } });
          await p.evaluate(({ TEEN, BOSS }) => {
            demoApplicants.push({ name: 'Sam Rivera', age: 16, city: 'Burlington', skills: ['mowing'], rating: 'New', job: 'Lawn helper', applied: 'Today', _jb: true, _owner: BOSS.email, _teenKey: TEEN.email, _appKey: TEEN.email + '|101', _jobId: 101, _status: 'applied' });
            switchDashTab(null, 'etab-applicants'); renderEmpKanban();
          }, { TEEN, BOSS });
          await p.waitForTimeout(900);
          const mini = await p.evaluate(() => { const m = document.querySelector('#emp-kanban-board .tw55-mini'); return m ? m.getAttribute('aria-label') : null; });
          if (audience === 'employers') assert.equal(mini, 'Photo of Sam Rivera');
          else assert.equal(mini, null, 'employer sees a photo the teen kept for the parent');
          assert.deepEqual(errors, []);
          await context.close();
        }
      }
      console.log(tag + ': profile photo checks passed');
    }
    console.log('profile-photo-v55: all checks passed');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
