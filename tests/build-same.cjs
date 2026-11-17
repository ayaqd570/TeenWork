/* Checks for the build step (tools/build.cjs): the built page must behave exactly like the page that loads
   every source file by its own <script> tag.

   1. The built files in assets/build and index.html are up to date with assets/js, assets/css and tools/bundles.json.
   2. The page is opened twice, offline: once as built (a few big files) and once with each source file on its own
      tag in the same order. A probe runs before and after every source file and records the page's state:
      every global name and function (by its code), the DOM (minus script and style-sheet tags), which listeners and
      timers were set, local and session storage, and where each <style> sits among the style sheets.
      The two runs must match at every probe, then after the page has loaded, then after each flow
      (the three demos, Sign In, Sign Up, page addresses, the admin address). Screenshots must match too.

   Run: node tests/build-same.cjs                    (compares with the separate source files)
        node tests/build-same.cjs --against 34038bd  (compares with index.html from that commit, where every script and
                                                      style sheet still had its own tag: main just before the build step) */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const B = require('../tools/build.cjs');
const root = B.ROOT;
const AGAINST = process.argv.includes('--against') ? process.argv[process.argv.indexOf('--against') + 1] : '';

// 1. up to date
const result = B.build();
assert.deepEqual(B.stale(result), [], 'built files are out of date: run node tools/build.cjs');

// 2. two copies of the site
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-build-same-'));
const builtDir = path.join(tmp, 'built'), sepDir = path.join(tmp, 'separate');
const copyTree = (from, to) => fs.cpSync(from, to, { recursive: true, filter: s => !/[\\/](\.git|node_modules)([\\/]|$)/.test(s) });
copyTree(root, builtDir); copyTree(root, sepDir);

const PROBE_DEF = fs.readFileSync(__filename, 'utf8').split('/*PROBE-START*/')[2].split('/*PROBE-END*/')[0];
const probeTag = '<script>' + PROBE_DEF + '</script>';
const withProbeDef = html => html.replace(/^<head>$/m, () => '<head>\n' + probeTag);

// built copy: the real build, with probes around every source file
const probed = B.build({ probe: true });
// a script that is not joined with others (written into the page, or a built file of its own) gets probes around its tag
const around = (f, tag) => '<script>__twProbe(' + JSON.stringify(f) + ',0)</script>' + tag + '<script>__twProbe(' + JSON.stringify(f) + ',1)</script>';
let builtHtml = probed.files['index.html'];
builtHtml = builtHtml.replace(/<script\b[^>]*\bdata-tw-inline="([^"]+)"[^>]*>[\s\S]*?<\/script>/g, (m, f) => around(f, m));
for (const u of B.loadManifest().scripts) if (u.file && u.from.length === 1)
  builtHtml = builtHtml.replace(new RegExp('<script\\b[^>]*\\bsrc="' + B.OUT + '/' + u.file + '\\.js[^"]*"[^>]*></script>'), m => around(u.from[0], m));
for (const [f, text] of Object.entries(probed.files)) fs.writeFileSync(path.join(builtDir, f), f === 'index.html' ? withProbeDef(builtHtml) : text);

// separate copy: each source file (comments and spaces removed the same way, so function code compares equal) on its own tag
const manifest = B.loadManifest();
fs.mkdirSync(path.join(sepDir, 'assets/strip'), { recursive: true });
const sepTag = f => {
  const out = 'assets/strip/' + path.basename(f);
  fs.writeFileSync(path.join(sepDir, out), B.stripJs(fs.readFileSync(path.join(root, f), 'utf8'), f).code);
  return '<script>__twProbe(' + JSON.stringify(f) + ',0)</script><script src="' + out + '"></script><script>__twProbe(' + JSON.stringify(f) + ',1)</script>';
};
let sepHtml;
if (AGAINST) {
  // index.html from before the build step: every script and style sheet at its old place
  sepHtml = execFileSync('git', ['-C', root, 'show', AGAINST + ':index.html'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  assert(/<script[^>]+src="assets\/js\//.test(sepHtml), AGAINST + ':index.html loads no assets/js file by its own tag');
  sepHtml = sepHtml.replace(/<script\b([^>]*?)\s*\bsrc="(assets\/js\/[^"?]+)(?:\?[^"]*)?"([^>]*)><\/script>/g, (m, a, f) => sepTag(f));
} else {
  sepHtml = B.expand(probed.files['index.html'], manifest);
  sepHtml = sepHtml.replace(/<script src="(assets\/js\/[^"]+)"><\/script>/g, (m, f) => sepTag(f));
}
fs.writeFileSync(path.join(sepDir, 'index.html'), withProbeDef(sepHtml));

function serve(dir) {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon' };
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p === '/') p = '/index.html';
      let f = path.join(dir, p); if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html');
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(fs.readFileSync(f));
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

/*PROBE-START*/
(function () {
  if (typeof window === 'undefined' || window.__twProbe) return;
  // Same random numbers and the same clock start in both runs
  var seed = 20261117; Math.random = function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  try { crypto.getRandomValues = function (a) { for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 4294967296) % Math.pow(2, 8 * (a.BYTES_PER_ELEMENT || 1)); return a; }; } catch (e) {}
  var digits = function (s) { return String(s).replace(/\d+/g, '#'); };
  var h = function (s) { s = String(s); var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); };
  var base = new Set(Object.getOwnPropertyNames(window));
  var listeners = [], timers = [], fnHash = new WeakMap();
  var who = function (t) { try { if (t === window) return 'window'; if (t === document) return 'document'; if (t && t.nodeType === 1) return t.tagName.toLowerCase() + (t.id ? '#' + t.id : ''); return t && t.constructor ? t.constructor.name : String(t); } catch (e) { return '?'; } };
  var add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opt) { try { listeners.push(who(this) + ' ' + type + ' ' + h(fn && fn.toString ? fn.toString() : fn)); } catch (e) {} return add.apply(this, arguments); };
  ['setTimeout', 'setInterval'].forEach(function (n) { var o = window[n]; window[n] = function (fn, ms) { try { timers.push(n + ' ' + (ms | 0) + ' ' + h(typeof fn === 'function' ? fn.toString() : fn)); } catch (e) {} return o.apply(this, arguments); }; });
  base = new Set(Object.getOwnPropertyNames(window));
  window.__twProbeLexical = window.__twProbeLexical || [];
  function globals() {
    var out = [];
    Object.getOwnPropertyNames(window).sort().forEach(function (k) {
      if (base.has(k) || /^__twProbe/.test(k)) return;
      var v, d = Object.getOwnPropertyDescriptor(window, k);
      if (d && d.get && !d.set) { out.push(k + ':getter'); return; }
      try { v = window[k]; } catch (e) { out.push(k + ':throws'); return; }
      try { out.push(k + ':' + describe(v)); } catch (e) { out.push(k + ':?'); }
    });
    window.__twProbeLexical.forEach(function (k) {
      var v; try { v = (0, eval)(k); } catch (e) { return; }
      try { out.push('let ' + k + ':' + describe(v)); } catch (e) { out.push('let ' + k + ':?'); }
    });
    return out;
  }
  function describe(v) {
    var t = typeof v;
    if (t === 'function') { var c = fnHash.get(v); if (!c) { c = h(Function.prototype.toString.call(v)); fnHash.set(v, c); } return 'fn ' + c + markers(v); }
    if (v === null || t !== 'object') return t + ' ' + digits(v).slice(0, 80);
    if (v.nodeType) return 'node ' + who(v);
    var keys = []; try { keys = Object.keys(v).slice(0, 200); } catch (e) {}
    var c = ''; try { c = v.constructor && v.constructor.name; } catch (e) {}
    return 'obj ' + c + ' {' + keys.join(',') + '}';
  }
  function markers(fn) { var m = []; try { Object.getOwnPropertyNames(fn).forEach(function (k) { if (!/^(length|name|prototype|arguments|caller)$/.test(k)) m.push(k); }); } catch (e) {} return m.length ? ' +' + m.sort().join(',') : ''; }
  function dom() {
    var out = [], w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var skip = function (el) { return el.tagName === 'SCRIPT' || (el.tagName === 'LINK' && /stylesheet/.test(el.rel)); };
    for (var n = w.currentNode; n; n = w.nextNode()) {
      if (n.nodeType === 3) { var t = n.data.trim(); if (t && !(n.parentNode && skip(n.parentNode))) out.push('"' + digits(t)); continue; }
      if (skip(n)) continue;
      var a = []; for (var i = 0; i < n.attributes.length; i++) a.push(n.attributes[i].name + '=' + digits(n.attributes[i].value));
      out.push('<' + n.tagName + ' ' + a.sort().join(' ') + (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' ? ' value=' + digits(n.value) + ' checked=' + n.checked : ''));
    }
    return out;
  }
  function sheets() {
    // for each <style>: which style sheet files come before it (a built file stands for its source files)
    var before = [], out = [];
    document.querySelectorAll('style, link[rel~="stylesheet"]').forEach(function (el) {
      if (el.tagName === 'LINK') { var src = (el.getAttribute('href') || '').split('?')[0]; before.push.apply(before, (window.__twCssMap && window.__twCssMap[src]) || [src]); return; }
      out.push((el.id || h(el.textContent)) + ' after [' + before.join(',') + ']');
    });
    return out;
  }
  function store(s) { var o = []; try { for (var i = 0; i < s.length; i++) { var k = s.key(i); o.push(digits(k) + '=' + digits(s.getItem(k)).slice(0, 300)); } } catch (e) {} return o.sort(); }
  window.__twProbeSnap = function () {
    return { globals: globals(), dom: dom(), sheets: sheets(), listeners: listeners.slice().sort(), timers: timers.slice().sort(), local: store(localStorage), session: store(sessionStorage), ready: document.readyState, title: document.title, url: location.pathname + location.search };
  };
  window.__twProbeLog = [];
  window.__twProbe = function (file, k) { window.__twProbeLog.push({ at: file + (k ? ' after' : ' before'), snap: window.__twProbeSnap() }); };
})();
/*PROBE-END*/

const cssMap = {};
for (const u of manifest.styles) cssMap[B.OUT + '/' + u.file + '.css'] = u.from;

function firstDiff(a, b) {
  const out = {};
  for (const k of Object.keys(a)) {
    if (JSON.stringify(a[k]) === JSON.stringify(b[k])) continue;
    if (Array.isArray(a[k])) {
      const count = arr => arr.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
      const ca = count(a[k]), cb = count(b[k]), onlyA = [], onlyB = [];
      for (const [x, n] of ca) if (n > (cb.get(x) || 0)) onlyA.push(x + (n - (cb.get(x) || 0) > 1 ? ' ×' + (n - (cb.get(x) || 0)) : ''));
      for (const [x, n] of cb) if (n > (ca.get(x) || 0)) onlyB.push(x + (n - (ca.get(x) || 0) > 1 ? ' ×' + (n - (ca.get(x) || 0)) : ''));
      out[k] = onlyA.length || onlyB.length ? { separate: onlyA.slice(0, 8), built: onlyB.slice(0, 8) } : 'same items, other order';
    } else out[k] = { separate: a[k], built: b[k] };
  }
  return Object.keys(out).length ? out : null;
}

(async () => {
  const [s1, s2] = [await serve(sepDir), await serve(builtDir)];
  const urls = { separate: 'http://127.0.0.1:' + s1.address().port, built: 'http://127.0.0.1:' + s2.address().port };
  const browser = await chromium.launch();
  const problems = [], duringLoad = [], smoothing = [];
  let compared = 0, pixels = 0;

  // Run the page clock, give the browser a moment for what the clock does not drive (pictures arriving, observers
  // that watch what is on screen), then run the clock once more so timers those started have fired before the
  // snapshot. Without the last step a short timer (account-pages-v60 repaints 40 ms after a class changes) could be
  // still waiting in one run and done in the other, depending on when the browser got round to it.
  async function settle(page, ms) { await page.clock.runFor(ms); await page.waitForTimeout(300); await page.clock.runFor(1000); }
  async function open(mode, viewport, addr, session) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600, serviceWorkers: 'block' });
    await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
    await context.addInitScript(([lex, map, ss]) => {
      window.__twCssMap = map; window.__twProbeLexical = lex;
      if (ss && !sessionStorage.getItem('tw-test-seeded')) { sessionStorage.setItem('tw-test-seeded', '1'); Object.entries(ss).forEach(([k, v]) => sessionStorage.setItem(k, v)); }
    }, [result.lexicalNames, cssMap, session || null]);
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // A stopped clock while the page loads: no timer can run between two scripts in one run and not in the other
    // (on a real phone that depends on how fast each file arrives). The clock then runs the same 4 s in both.
    await page.clock.install({ time: new Date('2026-11-17T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-17T12:00:00Z'));
    await page.goto(urls[mode] + addr, { waitUntil: 'load' });
    await settle(page, 4000);
    return { context, page, errors };
  }
  const shot = async p => { await p.evaluate(() => { document.querySelectorAll('*').forEach(e => { e.style.setProperty('animation', 'none', 'important'); e.style.setProperty('transition', 'none', 'important'); e.style.setProperty('caret-color', 'transparent', 'important'); }); }); await p.waitForTimeout(150); return p.screenshot({ fullPage: false }); };
  const snap = p => p.evaluate(() => window.__twProbeSnap());
  // Screenshots: the same, or at most a few edge pixels off by 1 or 2 (of 255). That is how the browser happens to
  // smooth a rounded corner, not a change: in the one case seen (employer demo refresh, phone) all 3,964 elements had
  // the same size, place and every computed style in both pages, and 18 pixels on one box edge were 1 apart.
  const cmpPage = await browser.newPage();
  async function sameShot(name, label, x, y) {
    pixels++;
    if (x.equals(y)) return;
    const d = await cmpPage.evaluate(async ([u, v]) => {
      const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
      const [i, j] = await Promise.all([load(u), load(v)]);
      if (i.width !== j.width || i.height !== j.height) return { size: true };
      const data = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
      const p = data(i), q = data(j); let n = 0, max = 0;
      for (let k = 0; k < p.length; k += 4) { const m = Math.max(Math.abs(p[k] - q[k]), Math.abs(p[k + 1] - q[k + 1]), Math.abs(p[k + 2] - q[k + 2])); if (m) { n++; if (m > max) max = m; } }
      return { n, max };
    }, ['data:image/png;base64,' + x.toString('base64'), 'data:image/png;base64,' + y.toString('base64')]);
    if (!d.size && d.max <= 2 && d.n <= 200) { smoothing.push(name + ' — ' + label + ': ' + d.n + ' pixels differ by ' + d.max + ' of 255'); return; }
    problems.push(name + ' — ' + label + ': the screenshots differ (' + (d.size ? 'other size' : d.n + ' pixels, by up to ' + d.max + ' of 255') + ')');
    const base = path.join(tmp, (name + ' ' + label).replace(/\W+/g, '-'));
    fs.writeFileSync(base + '-separate.png', x); fs.writeFileSync(base + '-built.png', y);
  }

  async function scenario(name, viewport, addr, flow, session) {
    const runs = {};
    for (const mode of ['separate', 'built']) {
      const r = await open(mode, viewport, addr, session);
      r.log = await r.page.evaluate(() => window.__twProbeLog.map(x => x.at));
      r.snaps = await r.page.evaluate(() => window.__twProbeLog.map(x => x.snap));
      r.loaded = await snap(r.page);
      r.shot = await shot(r.page);
      r.flows = [];
      for (const [label, act] of flow || []) {
        await act(r.page); await settle(r.page, 3000);
        r.flows.push({ label, snap: await snap(r.page), shot: await shot(r.page) });
      }
      runs[mode] = r;
      await r.context.close();
    }
    const a = runs.separate, b = runs.built;
    assert.deepEqual(b.log, a.log, name + ': the source files did not run in the same order');
    // ignore what only differs before the page has loaded because of the probes themselves: nothing
    // While the page loads: every difference, once, with where it first showed and how long it lasted.
    const seen = new Map();
    for (let i = 0; i < a.snaps.length; i++) {
      compared++;
      const d = firstDiff(a.snaps[i], b.snaps[i]);
      if (!d) continue;
      for (const [k, v] of Object.entries(d)) {
        const key = k + ' ' + JSON.stringify(v);
        if (!seen.has(key)) seen.set(key, { k, v, from: a.log[i], to: a.log[i], n: 0 });
        const e = seen.get(key); e.to = a.log[i]; e.n++;
      }
    }
    for (const e of seen.values()) duringLoad.push(name + ' — ' + e.k + ' differs from ' + e.from + ' to ' + e.to + ' (' + e.n + ' probes): ' + JSON.stringify(e.v));
    // After loading, timers count once each: how often a repaint timer that waits for a quiet moment gets started
    // (account-pages-v60 repaints 40 ms after the last class change) depends on when the browser draws a frame, which
    // the page clock doesn't control: loading the separate files 8 times gave 93 or 94 starts, the built page 94.
    const once = x => Object.assign({}, x, { timers: [...new Set(x.timers)].sort() });
    const check = (label, x, y) => { compared++; const d = firstDiff(once(x), once(y)); if (d) problems.push(name + ' — ' + label + ': ' + JSON.stringify(d, null, 1)); };
    check('after loading', a.loaded, b.loaded);
    await sameShot(name, 'after loading', a.shot, b.shot);
    for (let i = 0; i < a.flows.length; i++) {
      const f = a.flows[i];
      check(f.label, f.snap, b.flows[i].snap);
      await sameShot(name, f.label, f.shot, b.flows[i].shot);
    }
    assert.deepEqual(b.errors, a.errors, name + ': different page errors');
    console.log((problems.length ? '…' : 'ok') + ' ' + name + ' (' + a.log.length + ' probes, ' + (a.flows.length + 1) + ' states)');
  }

  const click = sel => p => p.locator(sel).first().click();
  const desktop = { width: 1366, height: 800 }, phone = { width: 390, height: 844 };
  await scenario('home page, computer', desktop, '/', [
    ['Teen demo', click('#page-landing button[aria-label="Teen demo"]')],
  ]);
  await scenario('home page, phone', phone, '/', [
    ['Parent demo', click('#page-landing button[aria-label="Parent demo"]')],
  ]);
  await scenario('employer demo', desktop, '/', [['Employer demo', click('#page-landing button[aria-label="Employer demo"]')]]);
  await scenario('sign in and sign up', desktop, '/', [
    ['Sign In', p => p.evaluate(() => gotoPage('login'))],
    ['Sign Up', p => p.evaluate(() => gotoPage('signup'))],
  ]);
  await scenario('address ?view=jobs, signed out', desktop, '/?view=jobs', []);
  await scenario('address ?view=admin', desktop, '/?view=admin&tab=accounts', []);
  await scenario('pricing page', phone, '/', [['Plans', p => p.evaluate(() => gotoPage('pricing'))]]);
  // a refresh in the teen demo on its Find Jobs address: the page signs the demo back in while it loads
  const T0 = Date.parse('2026-11-17T12:00:00Z');
  await scenario('refresh in the teen demo', desktop, '/?view=jobs', [['Messages', p => p.evaluate(() => { const b = document.querySelector('#twm-side [data-twm="ttab-messages"]'); if (b) b.click(); })]],
    { tw_url_session: JSON.stringify({ v: 1, kind: 'demo', t: 'teen', k: '', at: T0 }) });
  await scenario('refresh in the employer demo, phone', phone, '/?view=applicants', [], { tw_url_session: JSON.stringify({ v: 1, kind: 'demo', t: 'employer', k: '', at: T0 }) });

  await browser.close(); s1.close(); s2.close();
  if (duringLoad.length) console.log('\nWhile loading (each source file in the built page runs right after the one before it, with no\nmicrotask break between them; the end state is what has to match):\n' + duringLoad.join('\n'));
  if (smoothing.length) console.log('\nScreenshots off by edge smoothing only (allowed: at most 2 of 255, at most 200 pixels):\n' + smoothing.join('\n'));
  if (problems.length) { console.error('\n' + problems.join('\n\n') + '\n\nScreenshots and copies: ' + tmp); process.exit(1); }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('Built page = separate files: ' + compared + ' states and ' + pixels + ' screenshots match' + (AGAINST ? ' (compared with index.html from ' + AGAINST + ')' : '') + '.');
})().catch(e => { console.error(e); console.error('Copies kept in ' + tmp); process.exit(1); });
