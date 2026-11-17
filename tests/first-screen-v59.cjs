/* Offline checks for v59 (Aya's pasted review, 2026-11-15): the first screen, the fake quotes, the small logo,
   taps while the page is still loading, and the hero picture staying big and whole.
   v61 (2026-11-17) moved the headline onto the picture on computers; the top-bar line checks follow that.
   No real accounts or network calls. Run: node tests/first-screen-v59.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const PORT = 8030, URL0 = 'http://127.0.0.1:' + PORT + '/';

// 1. The made-up quotes are gone from everything the site serves. (They are written here in base64,
//    so this file doesn't repeat them either.)
const b64 = s => Buffer.from(s, 'base64').toString('utf8');
const OLD = ['TWF5YSwgMTUgwrcgVFg=', 'SmFtZXMsIDE0IMK3IENB', 'Uml2ZXJiZWQgTGFuZHNjYXBpbmc=', 'RGFuYSDCtyBQYXJlbnQsIFZU',
  'SSBtYWRlICQzMjAgaW4gbXkgZmlyc3QgbW9udGggY2xlYW5pbmcgY2Fycw==', 'VmVyaWZpZWQgZW1wbG95ZXIgYmFkZ2UgcGx1cyBwYXJlbnQgYXBwcm92YWw='].map(b64);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const served = [path.join(root, 'index.html'), ...walk(path.join(root, 'assets/js')), ...walk(path.join(root, 'assets/css'))];
for (const f of served) {
  const t = fs.readFileSync(f, 'utf8');
  for (const q of OLD.concat(['Loved by teens', '$320', b64('d2Vla2x5IGRpZ2VzdCBlbWFpbCBpcyBnb2xk')])) assert(!t.includes(q), path.relative(root, f) + ' still has a made-up quote: ' + q.slice(0, 12) + '…');
}
// The hero picture itself is unchanged: a <picture>, uncropped square files, no object-fit change in index.html's hero.
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /<img id="tw-hero-img" src="assets\/img\/hero-960\.webp" width="1254" height="1254"/);
// Small logo: page logos use assets/img/small-logo.png (CSS that frames "logo.png" still matches it).
assert.equal((html.match(/<img[^>]+src="logo\.png"/g) || []).length, 0, 'a page logo still uses the 100 KB logo.png');
assert(fs.statSync(path.join(root, 'assets/img/small-logo.png')).size < 20 * 1024, 'small logo is over 20 KB');
assert.match(html, /"url": "https:\/\/teenwork\.ayaqd\.com\/logo\.png"/, 'search engines still get the big logo');

async function ctxFor(browser, viewport) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  return context;
}

async function firstScreen(browser, viewport) {
  const context = await ctxFor(browser, viewport);
  const p = await context.newPage(), errors = []; p.setDefaultTimeout(8000); p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(500);
  const w = viewport.width;
  const s = await p.evaluate(() => {
    const box = el => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, width: b.width, height: b.height }; };
    const tag = document.getElementById('tw59-tag'), img = document.getElementById('tw-hero-img'), h1 = document.getElementById('tw48-h1');
    const navSignup = [...document.querySelectorAll('#page-landing > nav button')].find(b => /^Sign Up/.test(b.textContent.trim()));
    const shown = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity !== '0';
    const onScreen = el => shown(el) && box(el).top >= 0 && box(el).bottom <= innerHeight;
    return {
      tag: shown(tag) && onScreen(tag), tagText: tag.innerText.replace(/\s+/g, ' ').trim(), tagHidden: tag.getAttribute('aria-hidden'),
      signup: onScreen(navSignup), img: box(img), natural: img.naturalWidth / img.naturalHeight, h1: box(h1),
      logos: [...document.querySelectorAll('img')].filter(i => /logo/.test(i.getAttribute('src') || '')).map(i => i.getAttribute('src')),
      bigLogoLoaded: performance.getEntriesByType('resource').some(e => /\/logo\.png(\?|$)/.test(e.name)),
      framed: getComputedStyle(document.querySelector('#page-landing > nav img')).borderTopWidth,
    };
  });
  // Sign Up is on the first screen on every size (in the top bar).
  assert(s.signup, w + ': Sign Up is not on the first screen');
  // The picture: big, whole and first — as Aya wants.
  assert(Math.abs(s.img.width / s.img.height - s.natural) < 0.02, w + ': hero picture is cropped');
  assert(s.img.width >= Math.min(w, 1212) - 40, w + ': hero picture got smaller (' + s.img.width + ')');
  if (w >= 900) {
    // Computers, since v61: the headline sits ON the picture, on the first screen (tests/hero-intro-v61.cjs has the details)...
    assert(s.h1.top >= s.img.top && s.h1.bottom <= viewport.height, w + ': headline is not on the first screen');
    // ...so the short line next to the logo, which says the same thing, stays quiet while the headline is on screen
    // (the top bar scrolls away with the page: html and body have overflow-x:hidden, so "sticky" never sticks).
    assert.equal(s.tag, false, w + ': top-bar line shows next to the headline');
    assert.equal(s.tagHidden, 'true');
    await p.evaluate(() => scrollTo(0, 700)); await p.waitForTimeout(500);
    const later = await p.evaluate(() => { const t = document.getElementById('tw59-tag'); return { quiet: t.classList.contains('tw59-quiet'), text: t.innerText.replace(/\s+/g, ' ').trim() }; });
    assert.equal(later.quiet, false, w + ': the top-bar line does not come back after the headline');
    assert.equal(later.text, 'Safe local jobs for teens 13–17 A parent approves every application · Free to join');
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
    assert.equal(await p.evaluate(() => document.getElementById('tw59-tag').classList.contains('tw59-quiet')), true);
  } else {
    // Phones and tablets: the headline is under the picture, and there is no top-bar line.
    assert(s.img.bottom <= s.h1.top, w + ': headline is not under the picture');
    assert.equal(s.tag, false, w + ': top-bar line should be hidden on small screens');
  }
  // Logos: the small file, still in its cream frame; the 100 KB logo.png isn't downloaded.
  assert(s.logos.length > 0 && s.logos.every(x => x === 'assets/img/small-logo.png'), w + ': ' + s.logos.join());
  assert.equal(s.bigLogoLoaded, false, w + ': logo.png was downloaded');
  assert.equal(s.framed, '3px');
  assert.deepEqual(errors, []);
  await context.close();
}

async function oldSamples(browser) {
  const context = await ctxFor(browser, { width: 1280, height: 800 });
  const p = await context.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(300);
  assert.equal(await p.locator('#featpack-testimonials, #v14-reviews-section').count(), 0, 'the hidden testimonial block is still added');
  assert.equal(await p.locator('script#v14-review-schema').count(), 0, 'made-up review markup is still added');
  const r = await p.evaluate(old => {
    // A browser that kept the old samples from an earlier version
    localStorage.setItem('tw_success_stories', JSON.stringify([{ name: old[0], role: 'teen', quote: old[4] }, { name: 'Sam, real member', role: 'teen', quote: 'Got my first lawn job!' }]));
    localStorage.setItem('tw_admin_reviews', JSON.stringify([{ name: old[2], body: old[5] + ' and more', published: true }, { name: 'Real', body: 'Nice app', published: true }]));
    const box = document.createElement('div'); box.id = 'tw59-test-stories'; document.body.appendChild(box);
    renderStories('tw59-test-stories');
    return {
      shown: box.textContent, kept: JSON.parse(localStorage.getItem('tw_success_stories')).map(s => s.name),
      reviews: _getReviews().map(x => x.name),
      flags: old.map(x => twIsOldSample(x)).concat([twIsOldSample('Got my first lawn job!'), twIsOldSample(''), twIsOldSample(null)]),
    };
  }, OLD);
  assert(!r.shown.includes(OLD[0]) && r.shown.includes('Sam, real member'), 'old sample story still shows: ' + r.shown);
  assert.deepEqual(r.kept, ['Sam, real member'], 'old sample story still saved');
  assert.deepEqual(r.reviews, ['Real']);
  assert.deepEqual(r.flags, [true, true, true, true, true, true, false, false, false]);
  assert.deepEqual(errors, []);
  await context.close();
}

// A slow phone: one late script takes 2.5 s, so the page is on screen while the app is still loading.
async function earlyTap(browser, label, button, check) {
  const context = await ctxFor(browser, { width: 390, height: 844 });
  await context.route('**/assets/js/real-stats-v42.js*', async r => { await new Promise(x => setTimeout(x, 2500)); r.continue(); });
  const p = await context.newPage(), errors = []; p.setDefaultTimeout(10000); p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL0, { waitUntil: 'commit' });
  await p.locator(button).first().waitFor({ state: 'visible' });
  assert.equal(await p.evaluate(() => document.readyState), 'loading', label + ': the test page finished loading too soon');
  await p.locator(button).first().click();
  assert.equal(await p.locator(button).first().evaluate(b => b.classList.contains('tw59-wait') && b.getAttribute('aria-busy')), 'true', label + ': the tapped button does not show it is waiting');
  await p.waitForLoadState('load'); await p.waitForTimeout(1500);
  await check(p);
  assert.equal(await p.locator('.tw59-wait').count(), 0);
  assert.deepEqual(errors, [], label + ': ' + errors.join(' | '));
  await context.close();
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    await new Promise(r => setTimeout(r, 600));
    for (const viewport of [{ width: 1366, height: 650 }, { width: 1280, height: 720 }, { width: 900, height: 700 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) await firstScreen(browser, viewport);
    await oldSamples(browser);
    await earlyTap(browser, 'Sign Up', '#tw48-hero button:has-text("Sign Up Free")', async p => {
      assert.equal(await p.evaluate(() => document.getElementById('page-signup').classList.contains('active')), true, 'Sign Up tapped early did not open sign-up');
    });
    await earlyTap(browser, 'Teen demo', '#tw48-demo button[aria-label="Teen demo"]', async p => {
      await p.waitForFunction(() => { const u = (typeof currentUser !== 'undefined' && currentUser) || window.currentUser; return !!(u && u.type === 'teen' && u.twDemo); }, null, { timeout: 8000 });
    });
    // After loading, taps go straight through (nothing waits).
    const context = await ctxFor(browser, { width: 390, height: 844 });
    const p = await context.newPage();
    await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(300);
    await p.locator('#tw48-hero button:has-text("Sign In")').first().click(); await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => document.getElementById('page-login').classList.contains('active')), true);
    await context.close();
    console.log('first-screen-v59: first screen, quotes, small logo, early taps and hero checks passed');
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
