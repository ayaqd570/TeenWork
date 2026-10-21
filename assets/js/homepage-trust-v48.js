
/* ══════════════════════════════════════════════════════════════════════
   homepage-trust-v48 — the homepage only says what's true (2026-10-18)
   Aya pasted a homepage review: conflicting numbers (4.8 stars, 247 users,
   89 jobs, 12 states vs "all 50 states"; "0 real reviews" next to "verified"
   reviews), safety labels that promised more than the app does, floating
   buttons over the phone sign-up area, a rotating headline with no H1, and a
   long page with the demo's sample data unmarked.
   The new homepage HTML (apply-homepage-trust.py) has one H1, a short story
   (who it's for → how parent approval works → safety → proof → sign up) and
   no invented numbers or reviews. This block does the parts that need code:
   • Live numbers: rpc('tw_public_counts') (Supabase function, counts only)
     fills "TeenWork right now" with an as-of time and what each number
     counts, once there are SHOW_COUNTS_FROM real accounts. Until then the
     card says TeenWork is new. Same source for "open jobs are in …".
   • Hides the old injected review/testimonial sections and the safety-lab
     button on the homepage, and removes their made-up Google review data.
   • Help & Support / Rate App buttons and the install sheet stay off the
     homepage and the sign-up / sign-in / code pages, so nothing floats over
     the text, the form or the buttons. Help is a footer link on the
     homepage and a "Contact support" link on those pages instead.
   • "How safety works" details (window.twOpenSafetyDetails), Help link.
   • "Something feels wrong?" now really emails the teen's linked parent
     (it read currentUser.parentEmail, which real accounts never had).
   • Demo logins: a "sample data" banner on every dashboard, a Sample tag
     on each job card and "N sample jobs" instead of "N Open".
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__twHomepageTrust48) return;
  window.__twHomepageTrust48 = true;

  const SHOW_COUNTS_FROM = 25;           // real accounts needed before the homepage shows counts (0 = always)
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const me = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  const isDemoUser = u => !!(u && (u.isDemo || /\.demo$/i.test(String(u.email || ''))));
  const sb = () => (typeof sbClient !== 'undefined' && sbClient) ? sbClient : null;
  const later = (fn, ms) => setTimeout(() => { try { fn(); } catch (e) { console.warn('homepage-trust-v48:', e); } }, ms);

  /* ── styles ───────────────────────────────────────────────────────── */
  const css = `
  #page-landing .landing-hero{grid-template-columns:1fr}
  #tw48-h1{font-family:'Fraunces',Georgia,serif;font-size:clamp(1.75rem,4.4vw,2.7rem);font-weight:900;line-height:1.15;color:var(--green);max-width:none;margin:0 auto 1rem;letter-spacing:-.01em}
  @media (min-width:900px){
    #tw-hero-outer > div{min-height:0 !important;max-height:none}
    #tw-hero-img{height:auto !important;object-fit:contain;object-position:center}
  }
  @media (max-width:900px){#tw48-how .landing-steps,#tw48-how .landing-audience-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media (max-width:600px){#tw48-how .landing-steps,#tw48-how .landing-audience-grid{grid-template-columns:1fr}}
  /* small phones and zoomed-in text: the top bar and the sign-up form fit without sideways scrolling */
  @media (max-width:360px){
    #page-landing > nav{padding:0 .6rem !important}
    #page-landing > nav button{padding:6px 10px !important;font-size:.82rem !important}
    #page-signup .type-selector{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
    #page-signup .type-btn{min-width:0;padding:10px 2px}
    #page-signup .type-btn .t-label{font-size:.7rem;overflow-wrap:break-word}
    #su-plan-cards{grid-template-columns:minmax(0,1fr) !important}
    #tw-hero-outer > div > div{padding:.9rem 1rem !important;gap:10px !important}
    #tw-hero-outer > div > div > div{width:48px !important;height:48px !important;font-size:1.5rem !important}
    #tw-hero-outer > div > div > span{font-size:1.7rem !important}
  }
  /* short phones: a shorter photo so the headline and Sign Up fit on the first screen */
  @media (max-width:600px) and (max-height:700px){
    #tw-hero-outer > div{min-height:0 !important}
    #tw-hero-img{height:34vh !important;object-position:50% 30%}
    #tw-hero-outer{margin-bottom:0 !important}
    #tw48-hero .landing-inner{padding-top:1rem !important;padding-bottom:1rem !important}
    #tw48-hero .landing-lead{font-size:.95rem !important;line-height:1.5 !important;margin-bottom:1rem !important}
  }
  @media (max-width:600px) and (max-height:600px){#tw-hero-img{height:26vh !important}}
  .tw48-demo-note{font-size:.76rem;color:var(--muted);margin:.65rem 0 0;line-height:1.45}
  .tw48-link{background:none;border:none;padding:0;margin-top:.7rem;color:var(--green);font-weight:700;font-size:.85rem;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;text-align:left}
  .tw48-link:hover{text-decoration:underline}
  .tw48-safety-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:12px}
  .tw48-safety-card{background:#fff;border-radius:14px;padding:1rem 1.1rem;border:1.5px solid var(--green-light)}
  .tw48-safety-card h3{font-size:.95rem;font-weight:800;color:var(--green);margin:.35rem 0 .3rem;font-family:'DM Sans',system-ui,sans-serif}
  .tw48-safety-card p{font-size:.84rem;color:var(--muted);margin:0;line-height:1.55}
  .tw48-safety-limit{border-color:#fcd34d;background:#fffbeb}
  .tw48-safety-limit h3{color:#7a4700}
  .tw48-ico{font-size:1.45rem}
  .tw48-proof-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:12px}
  .tw48-card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:1rem 1.1rem}
  .tw48-card h3{font-size:1rem;font-weight:800;color:var(--text);margin:0 0 .45rem;font-family:'DM Sans',system-ui,sans-serif}
  .tw48-card p{font-size:.86rem;color:var(--muted);line-height:1.6;margin:0 0 .5rem}
  .tw48-small{font-size:.76rem !important;color:var(--muted)}
  .tw48-nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(88px,100%),1fr));gap:8px;margin:.2rem 0 .6rem}
  .tw48-num{background:var(--green-pale);border-radius:12px;padding:.6rem .5rem;text-align:center}
  .tw48-num strong{display:block;font-family:'Fraunces',Georgia,serif;font-size:1.5rem;color:var(--green);line-height:1.1}
  .tw48-num span{font-size:.72rem;color:var(--green);font-weight:700}
  .tw48-founder{margin-top:12px;background:linear-gradient(135deg,#1a3a2a,var(--green));color:#fff;border-radius:16px;padding:1.2rem 1.3rem}
  .tw48-founder-tag{font-size:.7rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--green-light)}
  .tw48-founder h3{font-family:'Fraunces',Georgia,serif;font-size:1.45rem;font-weight:900;color:#fff;margin:.35rem 0 .5rem}
  .tw48-founder h3 em{font-style:normal;color:var(--amber-mid,#f4a261)}
  .tw48-founder p{font-size:.9rem;line-height:1.65;color:rgba(255,255,255,.85);margin:0;max-width:70ch}
  .tw48-pro{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:linear-gradient(135deg,var(--amber-pale),#fffdf7) !important;border:2px solid var(--amber) !important}
  .tw48-pro p{margin:0;font-size:.92rem;color:#7a4700;line-height:1.55;flex:1;min-width:min(220px,100%)}
  .landing-footer .terms-link{display:inline}
  .tw48-safety-doc{max-width:640px;position:relative;text-align:left}
  .tw48-safety-doc h4{font-size:.95rem;color:var(--text);margin:1.1rem 0 .4rem;font-family:'DM Sans',system-ui,sans-serif;font-weight:800}
  .tw48-safety-doc ul{margin:0;padding-left:1.15rem;display:grid;gap:.4rem}
  .tw48-safety-doc li{font-size:.86rem;line-height:1.55;color:var(--text)}
  .tw48-x{position:absolute;top:12px;right:12px;background:var(--bg);border:1px solid var(--border);border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:1rem;color:var(--muted)}
  /* old injected homepage sections (made-up reviews, repeated testimonials, safety-lab button) */
  #page-landing #v14-reviews-section,#page-landing #featpack-testimonials,#page-landing #tw-community-section,#page-landing #featpack-safetylab-cta{display:none !important}
  /* nothing floats over the homepage: Help & Support / Rate App (linked in the footer instead) and the install sheet */
  body.tw48-landing [data-tw-fab="1"],body.tw48-landing #v17-support-fab,body.tw48-landing #v16-support-fab,body.tw48-landing #v17-rate-fab,body.tw48-landing #v16-rate-fab,body.tw48-landing #featpack-install,
  body.tw48-auth [data-tw-fab="1"],body.tw48-auth #v17-support-fab,body.tw48-auth #v16-support-fab,body.tw48-auth #v17-rate-fab,body.tw48-auth #v16-rate-fab,body.tw48-auth #featpack-install{display:none !important}
  .tw48-auth-help{margin-top:.25rem !important;font-size:.8rem}
  /* demo logins: say plainly that it's sample data */
  #tw48-demo-banner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#fff7e6;border:1.5px solid #f4b740;color:#5c3b00;border-radius:12px;padding:.6rem .85rem;margin:0 0 .9rem;font-size:.84rem;line-height:1.45}
  #tw48-demo-banner strong{color:#7a4700}
  #tw48-demo-banner span{flex:1;min-width:200px}
  #tw48-demo-banner button{background:var(--green);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-weight:700;font-size:.8rem;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif}
  body.tw48-demo .browse-card{position:relative}
  body.tw48-demo .browse-card::before{content:'Sample';position:absolute;top:8px;right:8px;background:#fff7e6;color:#7a4700;border:1px solid #f4b740;border-radius:999px;font-size:.66rem;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:2px 8px;z-index:1}
  body.tw48-demo .browse-card > :first-child{padding-right:62px}
  `;
  const st = document.createElement('style'); st.id = 'homepage-trust-v48-css'; st.textContent = css; document.head.appendChild(st);

  /* ── 1. homepage / sign-up page flags (for the floating buttons) ──── */
  const AUTH = ['page-signup', 'page-login', 'page-email-sent'];
  function syncLanding() {
    const lp = $('page-landing'), act = document.querySelector('.page.active');
    document.body.classList.toggle('tw48-landing', !!(lp && lp.classList.contains('active')));
    document.body.classList.toggle('tw48-auth', !!(act && AUTH.indexOf(act.id) >= 0));
    syncDemo();
  }
  function addAuthHelp() {   // Help & Support stays one tap away on the pages where its floating button is hidden
    AUTH.forEach(id => {
      const card = document.querySelector('#' + id + ' .auth-card, #' + id + ' .email-sent-card');
      if (!card || card.querySelector('.tw48-auth-help')) return;
      const p = document.createElement('p');
      p.className = 'auth-switch tw48-auth-help';
      p.innerHTML = 'Need help? <a href="#" onclick="twOpenHelp();return false">Contact support</a>';
      card.appendChild(p);
    });
  }

  /* ── 2. made-up review data for Google: removed whenever it appears ─ */
  function dropFakeSchema() {
    const s = $('v14-review-schema'); if (s) s.remove();
  }

  /* ── 3. live numbers (counts only) ────────────────────────────────── */
  let counts = null, countsAt = 0, loading = false;
  async function loadCounts(force) {
    if (loading || (!force && counts && Date.now() - countsAt < 5 * 60 * 1000)) return;
    let c = sb();
    if (!c && typeof window._twEnsureSupabase === 'function') { try { window._twEnsureSupabase(); } catch (e) {} c = sb(); }
    if (!c || typeof c.rpc !== 'function') return;
    loading = true;
    try {
      const r = await c.rpc('tw_public_counts');
      if (r && !r.error && r.data && typeof r.data === 'object') { counts = r.data; countsAt = Date.now(); }
    } catch (e) { /* offline: the card keeps saying TeenWork is new */ }
    finally { loading = false; renderCounts(); }
  }
  const n = v => Math.max(0, parseInt(v, 10) || 0);
  function renderCounts() {
    const body = $('tw48-numbers-body'), states = $('tw48-job-states');
    if (!body) return;
    const c = counts;
    if (states) {
      const list = c && Array.isArray(c.job_states) ? c.job_states.filter(Boolean).map(String) : [];
      states.textContent = c && n(c.open_jobs) > 0 && list.length ? 'Open jobs right now are in: ' + list.join(', ') + '.' : '';
    }
    if (!c || n(c.accounts) < SHOW_COUNTS_FROM) return;   // keep the "TeenWork is new" text from the HTML
    const when = new Date(c.as_of || Date.now());
    const asOf = isNaN(when) ? '' : when.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const tile = (v, label) => `<div class="tw48-num"><strong>${esc(n(v))}</strong><span>${esc(label)}</span></div>`;
    body.innerHTML =
      `<div class="tw48-nums">${tile(c.teens, 'teens')}${tile(c.parents, 'parents')}${tile(c.employers, 'employers')}${tile(c.open_jobs, 'open jobs')}</div>` +
      `<p class="tw48-small">Counted live from TeenWork's database${asOf ? ' on ' + esc(asOf) : ''}. Accounts are ones real people made; demo, test and closed accounts aren't counted. Open jobs are real employers' posts that are still open (posts close after 90 days).</p>`;
  }

  /* ── 4. safety details + help ─────────────────────────────────────── */
  let lastFocus = null;
  window.twOpenSafetyDetails = function () {
    const m = $('tw48-safety-modal'); if (!m) return;
    lastFocus = document.activeElement;
    m.classList.add('open');
    const x = m.querySelector('.tw48-x'); if (x) try { x.focus(); } catch (e) {}
  };
  window.twCloseSafetyDetails = function () {
    const m = $('tw48-safety-modal'); if (!m) return;
    m.classList.remove('open', 'active');
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('tw48-safety-modal')?.classList.contains('open')) window.twCloseSafetyDetails(); });
  window.twOpenHelp = function () {
    if (typeof window.openSupportModal === 'function') return window.openSupportModal('General Support', '');
    const f = $('v17-support-fab') || $('v16-support-fab'); if (f) f.click();
  };

  /* ── 5. "Something feels wrong?" reaches the linked parent ────────── */
  function linkedParentEmail(u) {
    if (!u || u.type !== 'teen' || isDemoUser(u)) return '';
    let l = u.parentLinked;
    try { const m = JSON.parse(localStorage.getItem('tw_parent_links') || '{}'); const k = String(u.email || '').trim().toLowerCase(); if (m && m[k] && m[k].status) l = m[k]; } catch (e) {}
    if (!l || l.status !== 'approved') return '';
    const list = (Array.isArray(l.parents) && l.parents.length ? l.parents : [l.parentEmail]).map(x => String(x || '').trim().toLowerCase()).filter(x => /@/.test(x));
    return list[0] || '';
  }
  function wrapAlert() {
    const orig = window.submitFeelsWrong;
    if (typeof orig !== 'function' || orig.__tw48) return;
    const w = function () {
      const u = window.currentUser, had = u ? u.parentEmail : undefined;
      const pe = (u && u.parentEmail) || linkedParentEmail(u);
      if (u && pe) u.parentEmail = pe;
      const toastWas = window.showToast;
      if (!pe && typeof toastWas === 'function') window.showToast = function (m, t) {
        if (/^🚨 Alert sent/.test(String(m))) return toastWas.call(this, '🚨 Sent to the TeenWork team. Link a parent so they get these alerts too.', t);
        return toastWas.apply(this, arguments);
      };
      try { return orig.apply(this, arguments); }
      finally {
        if (window.showToast !== toastWas) window.showToast = toastWas;
        if (u) { if (had === undefined) delete u.parentEmail; else u.parentEmail = had; }
      }
    };
    w.__tw48 = true;
    window.submitFeelsWrong = w;
  }

  /* ── 6. demo logins: sample data is labelled ──────────────────────── */
  const DASH = ['page-teen', 'page-parent', 'page-employer'];
  function syncDemo() {
    const u = me(), act = document.querySelector('.page.active');
    const on = !!(isDemoUser(u) && act && DASH.indexOf(act.id) >= 0);
    document.body.classList.toggle('tw48-demo', on);
    document.querySelectorAll('#tw48-demo-banner').forEach(b => { if (!on || !act.contains(b)) b.remove(); });
    if (!on) return;
    const dash = act.querySelector('.dashboard'); if (!dash) return;
    if (!dash.querySelector('#tw48-demo-banner')) {
      const b = document.createElement('div');
      b.id = 'tw48-demo-banner'; b.setAttribute('role', 'note');
      b.innerHTML = '<span>🧪 <strong>Demo: everything here is sample data.</strong> The jobs, people, messages and numbers are made up, and nothing you do is saved.</span>' +
        '<button type="button" onclick="gotoPage(\'signup\')">Make a real account</button>';
      const head = dash.querySelector('.dash-header');
      if (head && head.parentElement === dash) dash.insertBefore(b, head); else dash.insertBefore(b, dash.firstChild);
    }
    act.querySelectorAll('.badge').forEach(s => {
      const m = /^(\d+) Open$/.exec((s.textContent || '').trim());
      if (m) s.textContent = m[1] + ' sample job' + (m[1] === '1' ? '' : 's');
    });
  }
  function wrapDemo() {
    const orig = window._directDemo;
    if (typeof orig !== 'function' || orig.__tw48) return;
    const w = function (type) {
      const r = orig.apply(this, arguments);
      [80, 450, 1200].forEach(ms => later(syncDemo, ms));
      later(() => { if (typeof window.showToast === 'function') window.showToast('This demo uses sample data: every job, person and message is made up.', 'info'); }, 1600);
      return r;
    };
    w.__tw48 = true;
    window._directDemo = w;
  }
  function wrapAdminDemoSwitch() {
    const orig = window.adminSetDemo;
    if (typeof orig !== 'function' || orig.__tw48) return;
    const w = function (val) {
      const r = orig.apply(this, arguments);
      later(() => { const d = $('tw48-demo'); if (d) d.style.display = val ? '' : 'none'; }, 150);
      return r;
    };
    w.__tw48 = true;
    window.adminSetDemo = w;
  }

  /* ── boot ─────────────────────────────────────────────────────────── */
  function boot() {
    addAuthHelp(); syncLanding(); dropFakeSchema(); renderCounts(); wrapAlert(); wrapDemo(); wrapAdminDemoSwitch();
    const lp = $('page-landing');
    document.querySelectorAll('.page').forEach(pg => new MutationObserver(() => {
      syncLanding(); if (pg === lp && lp.classList.contains('active')) loadCounts(false);
    }).observe(pg, { attributes: true, attributeFilter: ['class'] }));
    new MutationObserver(dropFakeSchema).observe(document.head, { childList: true });
    window.addEventListener('tw-supabase-ready', () => loadCounts(true));
    [600, 2500, 6000].forEach(ms => later(() => loadCounts(false), ms));
    [400, 1500, 4000].forEach(ms => later(() => { wrapAlert(); wrapDemo(); wrapAdminDemoSwitch(); dropFakeSchema(); }, ms));
    setInterval(() => { try { syncLanding(); } catch (e) {} }, 1000);   // page changes, re-rendered job lists, demo ↔ real
    if (/^#(safety|how-safety-works)$/i.test(location.hash || '')) later(window.twOpenSafetyDetails, 300);
  }
  window._twHomepageTrust48 = { loadCounts, renderCounts, syncDemo, syncLanding, linkedParentEmail, get counts() { return counts; }, SHOW_COUNTS_FROM };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
