/* Offline checks for v61 (Aya's pasted review, 2026-11-16: "the image is still 1,180px tall, so the main headline
   starts about 1,320px down and the big Sign Up button about 1,630px down").
   On computers the headline and Sign Up Free now sit ON the picture, top right over the house. The picture itself is
   not touched: same size, whole, first. Phones and tablets keep the headline under the picture.
   No real accounts or network calls. Run: node tests/hero-intro-v61.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const PORT = 8031, URL0 = 'http://127.0.0.1:' + PORT + '/';
const NAV = 58;

// The page file: the picture tag is as it was, there is one headline, and the layout rules are in the head
// (so the headline is in its final place from the first paint and never jumps).
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /<img id="tw-hero-img" src="assets\/img\/hero-960\.webp" width="1254" height="1254"/);
assert.equal((html.match(/<h1 id="tw48-h1"/g) || []).length, 1);
assert(html.indexOf('<style id="tw61-hero-intro">') > 0 && html.indexOf('<style id="tw61-hero-intro">') < html.indexOf('</head>'), 'the v61 layout rules are not in the head');
assert(html.indexOf('id="tw-hero-outer"') < html.indexOf('id="tw61-intro"'), 'the picture no longer comes first in the page');

const measure = () => {
  const box = el => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width, height: b.height }; };
  const hero = document.getElementById('tw48-hero');
  const btn = t => [...hero.querySelectorAll('button')].find(b => b.textContent.trim() === t);
  const img = document.getElementById('tw-hero-img'), intro = document.getElementById('tw61-intro'), lead = hero.querySelector('.landing-lead');
  return {
    img: box(img), natural: img.naturalWidth / img.naturalHeight,
    introBoxes: intro.getClientRects().length, intro: box(intro), introKids: [...intro.children].map(c => c.id || c.className || c.tagName),
    h1: box(document.getElementById('tw48-h1')), h1s: [...document.querySelectorAll('#page-landing h1')].filter(h => h.getClientRects().length).length,
    lead: box(lead), leadFont: parseFloat(getComputedStyle(lead).fontSize), leadText: lead.textContent.trim(),
    signup: box(btn('Sign Up Free')), signin: box(btn('Sign In')),
    trust: box(document.getElementById('tw51-trust')), demo: box(document.getElementById('tw48-demo')),
    overflow: document.documentElement.scrollWidth > innerWidth, scrollY,
  };
};

async function ctxFor(browser, viewport, slow) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  await context.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.hostname !== '127.0.0.1') return r.abort();
    // "slow": everything that loads after the home page markup (the late styles and scripts) arrives 2.5 s late
    if (slow && /assets\/css\/(homepage-v49|trust-usability|home-v51|onboarding-v53|phone-fit-v51)|assets\/js\/(homepage|trust-usability|featpack|real-stats)/.test(u.pathname)) await new Promise(x => setTimeout(x, 2500));
    r.continue();
  });
  return context;
}

// Computers: headline and Sign Up Free on the first screen, on the picture; the picture as big and whole as before.
async function computer(browser, viewport) {
  const w = viewport.width, context = await ctxFor(browser, viewport);
  const p = await context.newPage(), errors = []; p.setDefaultTimeout(8000); p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(500);
  const s = await p.evaluate(measure), pw = s.img.width;

  // The picture: first thing under the top bar, a whole square (so nothing is cropped), across the page (1,180px on a laptop).
  assert(Math.abs(s.img.top - NAV) <= 2, w + ': the picture is not the first thing under the top bar (' + s.img.top + ')');
  assert(Math.abs(s.img.width / s.img.height - s.natural) < 0.02, w + ': hero picture is cropped');
  assert.equal(Math.round(pw), Math.min(1180, w - 32), w + ': hero picture changed size (' + pw + ')');

  // The review's two numbers: where the headline and the big Sign Up button start.
  assert(s.h1.top >= NAV && s.h1.top < 200, w + ': headline starts ' + Math.round(s.h1.top) + 'px down');
  assert(s.signup.top >= NAV && s.signup.top < 400, w + ': Sign Up Free starts ' + Math.round(s.signup.top) + 'px down');
  for (const [name, b] of [['headline', s.h1], ['intro text', s.lead], ['Sign Up Free', s.signup], ['Sign In', s.signin]])
    assert(b.top >= NAV && b.bottom <= viewport.height && b.left >= 0 && b.right <= w, w + 'x' + viewport.height + ': ' + name + ' is not whole on the first screen');
  assert.equal(s.h1s, 1, w + ': there should be one headline');
  assert.deepEqual(s.introKids, ['tw48-h1', 'landing-lead', 'DIV']);
  assert.match(s.leadText, /^TeenWork is a free teen job finder/);

  // The card stays in the top right corner of the picture, over the house: inside the picture, clear of the teen
  // (his cap ends about 44% across) and of the parent on the porch (his hair starts about 29% down).
  assert.equal(s.introBoxes, 1);
  assert(s.intro.left >= s.img.left + pw * 0.46, w + ': the card reaches the teen (' + ((s.intro.left - s.img.left) / pw).toFixed(3) + ')');
  assert(s.intro.right <= s.img.right - 10 && s.intro.top >= s.img.top + 10, w + ': the card is not inside the picture');
  assert(s.intro.bottom <= s.img.top + pw * 0.28, w + ': the card reaches the parent (' + ((s.intro.bottom - s.img.top) / pw).toFixed(3) + ')');
  for (const b of [s.h1, s.lead, s.signup, s.signin]) assert(b.left >= s.intro.left && b.right <= s.intro.right + 1 && b.top >= s.intro.top && b.bottom <= s.intro.bottom, w + ': something sticks out of the card');
  assert(s.h1.bottom <= s.lead.top && s.lead.bottom <= s.signup.top, w + ': card order should be headline, text, buttons');
  // Readable and easy to click.
  assert(s.leadFont >= 13, w + ': intro text is ' + s.leadFont + 'px');
  assert(s.signup.height >= 44 && s.signin.height >= 44, w + ': buttons are under 44px tall');
  // The trust line and the demos stay under the picture.
  assert(s.trust.top >= s.img.bottom && s.demo.top >= s.trust.bottom - 1, w + ': the trust line and demos should be under the picture');
  assert.equal(s.overflow, false, w + ': the page scrolls sideways');

  // The buttons on the picture work.
  await p.locator('#tw61-intro button', { hasText: 'Sign Up Free' }).click(); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => document.getElementById('page-signup').classList.contains('active')), true, w + ': Sign Up Free on the picture did not open sign-up');
  await p.evaluate(() => gotoPage('landing')); await p.waitForTimeout(300);
  await p.locator('#tw61-intro button', { hasText: 'Sign In' }).click(); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => document.getElementById('page-login').classList.contains('active')), true, w + ': Sign In on the picture did not open sign-in');
  assert.deepEqual(errors, []);
  await context.close();
}

// Phones and tablets: nothing moved. Headline, text and buttons under the picture, in that order, and no card box.
async function small(browser, viewport) {
  const w = viewport.width, context = await ctxFor(browser, viewport);
  const p = await context.newPage(), errors = []; p.setDefaultTimeout(8000); p.on('pageerror', e => errors.push(e.message));
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(500);
  const s = await p.evaluate(measure);
  assert.equal(s.introBoxes, 0, w + ': the card should not exist as a box on small screens');
  assert(Math.abs(s.img.width / s.img.height - s.natural) < 0.02, w + ': hero picture is cropped');
  assert.equal(Math.round(s.img.width), w - 32, w + ': hero picture changed size');
  assert(s.img.bottom <= s.h1.top && s.h1.bottom <= s.lead.top && s.lead.bottom <= s.signup.top, w + ': order should be picture, headline, text, buttons');
  assert(s.signup.bottom <= s.trust.top || s.signup.bottom <= s.demo.top, w + ': the buttons should come before the trust line and demos');
  assert.equal(s.h1s, 1);
  assert.equal(s.overflow, false, w + ': the page scrolls sideways');
  assert.deepEqual(errors, []);
  await context.close();
}

// A slow connection: the late styles and scripts are 2.5 s behind. The card is already in its final place.
async function noJump(browser, viewport) {
  const w = viewport.width, context = await ctxFor(browser, viewport, true);
  const p = await context.newPage(); p.setDefaultTimeout(10000);
  await p.goto(URL0, { waitUntil: 'commit' });
  await p.locator('#tw48-h1').waitFor({ state: 'visible' }); await p.waitForTimeout(700);
  assert.equal(await p.evaluate(() => document.readyState), 'loading', w + ': the test page finished loading too soon');
  const early = await p.evaluate(measure);
  await p.waitForLoadState('load'); await p.waitForTimeout(500);
  const late = await p.evaluate(measure);
  for (const k of ['img', 'intro', 'h1', 'signup']) for (const side of ['top', 'left', 'width'])
    assert(Math.abs(early[k][side] - late[k][side]) <= 3, w + ': ' + k + ' ' + side + ' moved while loading (' + early[k][side] + ' → ' + late[k][side] + ')');
  await context.close();
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    await new Promise(r => setTimeout(r, 600));
    for (const viewport of [{ width: 1366, height: 650 }, { width: 1280, height: 600 }, { width: 1280, height: 720 }, { width: 1440, height: 800 }, { width: 1536, height: 730 },
      { width: 1920, height: 950 }, { width: 1212, height: 700 }, { width: 1100, height: 700 }, { width: 1024, height: 700 }, { width: 900, height: 700 }]) await computer(browser, viewport);
    for (const viewport of [{ width: 899, height: 700 }, { width: 768, height: 1024 }, { width: 600, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) await small(browser, viewport);
    // (computers only: on phones the headline has always settled about 50px higher once the late styles arrive, v61 or not)
    for (const viewport of [{ width: 1366, height: 650 }, { width: 1024, height: 700 }, { width: 900, height: 700 }]) await noJump(browser, viewport);
    console.log('hero-intro-v61: headline and Sign Up Free on the first screen on computers, picture whole and same size, phones unchanged, no jump while loading');
  } finally { await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exit(1); });
