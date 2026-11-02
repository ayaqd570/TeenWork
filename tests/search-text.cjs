/* Local, offline checks for the text Google and link previews read: title, meta, Open Graph,
   JSON-LD, the home page H1 and FAQ. No real accounts or API calls. Run: node tests/search-text.cjs */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

(async () => {
 // Files Google fetches directly: no old Netlify address, and the sitemap points at the live site.
 for (const f of ['index.html', 'robots.txt', 'sitemap.xml']) assert.ok(!/netlify/i.test(read(f)), f + ' mentions Netlify');
 assert.match(read('sitemap.xml'), /<loc>https:\/\/teenwork\.ayaqd\.com\/<\/loc>/);
 assert.match(read('robots.txt'), /Sitemap: https:\/\/teenwork\.ayaqd\.com\/sitemap\.xml/);

 const server = spawn('python', ['-m', 'http.server', '8023'], {cwd: root, stdio: 'ignore'});
 const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote']});
 try {
  for (const viewport of [{width: 390, height: 844}, {width: 1440, height: 1000}]) {
   const context = await browser.newContext({viewport});
   await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
   const p = await context.newPage(), errors = [];
   p.on('pageerror', e => errors.push(e.message));
   await p.goto('http://127.0.0.1:8023/', {waitUntil: 'domcontentloaded'});
   await p.waitForSelector('details.tw50-faq');

   const seo = await p.evaluate(() => {
    const meta = s => document.querySelector(s)?.getAttribute('content') || '';
    const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    const hero = document.getElementById('tw-hero-outer').getBoundingClientRect();
    return {
     title: document.title,
     description: meta('meta[name="description"]'),
     ogTitle: meta('meta[property="og:title"]'), ogDescription: meta('meta[property="og:description"]'),
     twTitle: meta('meta[name="twitter:title"]'), twDescription: meta('meta[name="twitter:description"]'),
     geo: document.querySelectorAll('meta[name^="geo."], meta[name="ICBM"]').length,
     canonical: document.querySelector('link[rel="canonical"]').href,
     h1s: [...document.querySelectorAll('#page-landing h1')].filter(visible).map(h => h.textContent.trim()),
     heroAboveH1: hero.bottom <= document.getElementById('tw48-h1').getBoundingClientRect().top + 1,
     lead: document.querySelector('#tw48-hero .landing-lead').textContent.trim(),
     faq: [...document.querySelectorAll('details.tw50-faq')].map(d => [d.querySelector('summary').textContent.trim(), d.querySelector('p').textContent.trim()]),
     ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent),
    };
   });
   const where = ' (' + viewport.width + 'px)';

   // Lead with what people search for: "teen job app", "teen job finder app", "TeenWork".
   assert.equal(seo.title, 'TeenWork — Teen Job App & Job Finder for Ages 13–17');
   assert.ok(seo.title.length <= 60, 'title too long for Google: ' + seo.title.length);
   assert.match(seo.description, /^TeenWork is a free teen job finder app for ages 13–17\./);
   assert.ok(seo.description.length <= 200, 'description too long: ' + seo.description.length);
   assert.equal(seo.ogTitle, seo.title);
   assert.match(seo.twTitle, /Teen Job App/);
   assert.deepEqual(seo.h1s, ['The teen job app for safe local jobs, ages 13–17'], 'one visible H1' + where);
   assert.match(seo.lead, /^TeenWork is a free teen job finder/);
   assert.ok(seo.heroAboveH1, 'hero picture should stay above the headline' + where);
   assert.equal(seo.canonical, 'https://teenwork.ayaqd.com/');

   // Vermont stays a second mention, never the lead.
   for (const [name, text] of Object.entries({title: seo.title, description: seo.description, ogTitle: seo.ogTitle, ogDescription: seo.ogDescription, twTitle: seo.twTitle, h1: seo.h1s[0], lead: seo.lead}))
    assert.ok(!/vermont/i.test(text), name + ' leads with Vermont: ' + text);
   assert.equal(seo.geo, 0, 'Vermont location meta tags are back');
   assert.match(seo.twDescription, /Started in Vermont\.$/);

   // Structured data: valid JSON, one graph, and the FAQ matches what people see on the page.
   assert.equal(seo.ld.length, 1);
   const graph = JSON.parse(seo.ld[0])['@graph'], byType = t => graph.filter(n => n['@type'] === t);
   const site = byType('WebSite')[0], org = byType('Organization')[0], app = byType('SoftwareApplication')[0], faq = byType('FAQPage')[0];
   assert.deepEqual(site.alternateName, ['Teen Work', 'TeenWork App']);
   assert.deepEqual(org.areaServed, {'@type': 'Country', 'name': 'United States'});
   assert.equal(org.foundingLocation.name, 'Vermont, USA');
   assert.match(app.description, /^TeenWork is a teen job app and job finder for ages 13–17\./);
   for (const s of byType('Service')) assert.ok(!/vermont/i.test(JSON.stringify(s)), s['@id'] + ' is Vermont-only');
   assert.deepEqual(faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text]), seo.faq, 'JSON-LD FAQ must match the visible FAQ' + where);
   assert.equal(seo.faq[0][0], 'What is TeenWork?');
   assert.ok(seo.faq.some(([q]) => q === 'Do I need to download the TeenWork app?'));

   // Honesty rules: no ratings, invented numbers, verified/background-checked employers or all-states claims.
   const head = await p.evaluate(() => document.head.innerHTML);
   assert.ok(!/aggregateRating|ratingValue|reviewCount|"review"/i.test(head), 'rating markup in <head>');
   assert.ok(!/all 50 states|every state|nationwide|teen jobs USA/i.test(head), 'coverage claim in <head>');
   assert.ok(!/\bverified employer|background[- ]checked employer|employers are (verified|background)/i.test(head), 'employer verification claim in <head>');

   assert.deepEqual(errors, [], 'page errors' + where);
   await context.close();
   console.log('ok', viewport.width + 'px');
  }
  console.log('search text checks passed');
 } finally {
  await browser.close();
  server.kill();
 }
})().catch(e => { console.error(e); process.exit(1); });
