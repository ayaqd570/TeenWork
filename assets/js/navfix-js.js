
(function(){
'use strict';

/* ── Tab group definitions ───────────────────────────── */
const NAV = {
  teen: {
    bottom: [
      { icon:'🔍', label:'Jobs',    tab:'ttab-browse' },
      { icon:'💼', label:'Work',    tab:'ttab-worklog' },
      { icon:'💬', label:'Chat',    action:'msg' },
      { icon:'👤', label:'Account', tab:'ttab-resume' },
      { icon:'☰',  label:'More',    action:'more' },
    ],
    groups: [
      { label:'🔍 Jobs',    tabs:[['ttab-browse','Browse'],['ttab-applications','Applied'],['ttab-tracker','Pipeline'],['ttab-calendar','Calendar']] },
      { label:'👤 Account', tabs:[['ttab-resume','Profile & Settings'],['ttab-portfolio','Portfolio'],['ttab-badges','Badges'],['ttab-leaderboard','Leaderboard']] },
      { label:'💼 Work',    tabs:[['ttab-worklog','Hours & Letters'],['ttab-earnings','Earnings'],['ttab-savings','Savings']] },
      { label:'🤖 Grow',    tabs:[['ttab-ai','AI Coach'],['ttab-lessons','Lessons'],['ttab-letters','Rec Letters'],['ttab-firstjob','First Job']] },
    ],
    more: [
      { section:'Jobs & Progress', items:[
        { icon:'📋', label:'Applied',      tab:'ttab-applications' },
        { icon:'📅', label:'Calendar',     tab:'ttab-calendar' },
        { icon:'⏱️', label:'Hours & Letters', tab:'ttab-worklog' },
        { icon:'🏅', label:'Badges',       tab:'ttab-badges' },
        { icon:'🎯', label:'Savings',      tab:'ttab-savings' },
      ]},
      { section:'Learning & Tools', items:[
        { icon:'🤖', label:'AI Coach', tab:'ttab-ai' },
        { icon:'📚', label:'Lessons', tab:'ttab-lessons' },
        { icon:'📜', label:'Rec Letters',  tab:'ttab-letters' },
        { icon:'🛡️', label:'Verify',       tab:'verify' },
      ]},
    ],
  },
  parent: {
    bottom: [
      { icon:'🏠', label:'Home',    tab:'ptab-overview' },
      { icon:'✅', label:'Approve', tab:'ptab-approvals' },
      { icon:'🛡', label:'Safety',  tab:'ptab-controls' },
      { icon:'💬', label:'Chat',    action:'msg' },
      { icon:'☰',  label:'More',    action:'more' },
    ],
    groups: [
      { label:'🏠 Home',    tabs:[['ptab-overview','Overview'],['ptab-approvals','Approvals'],['ptab-ratings','Ratings']] },
      { label:'🛡 Safety',  tabs:[['ptab-controls','Controls'],['ptab-notifications','Alerts'],['ptab-trusted','Trusted Employers']] },
      { label:'📬 Updates', tabs:[['ptab-weekly','Weekly Digest'],['ptab-savings','Savings Goals']] },
      { label:'👨‍👩‍👧 Family',  tabs:[['ptab-teens','My Teens']] },
    ],
    more: [
      { section:'Family & Oversight', items:[
        { icon:'👨‍👩‍👧', label:'My Teens',  tab:'ptab-teens' },
        { icon:'⭐', label:'Ratings',    tab:'ptab-ratings' },
        { icon:'🔔', label:'Alerts',     tab:'ptab-notifications' },
        { icon:'✅', label:'Trusted',    tab:'ptab-trusted' },
        { icon:'🎯', label:'Savings',    tab:'ptab-savings' },
        { icon:'📬', label:'Digest',     tab:'ptab-weekly' },
        { icon:'📊', label:'Admin',      action:'admin' },
      ]},
    ],
  },
  employer: {
    bottom: [
      { icon:'📝', label:'Post',    tab:'etab-post' },
      { icon:'👥', label:'Hiring',  tab:'etab-applicants' },
      { icon:'💬', label:'Chat',    action:'msg' },
      { icon:'📊', label:'Grow',    tab:'etab-analytics' },
      { icon:'☰',  label:'More',    action:'more' },
    ],
    groups: [
      { label:'📝 Pipeline', tabs:[['etab-post','Post Job'],['etab-applicants','Applicants'],['etab-active','Active']] },
      { label:'💬 Comms',    tabs:[['etab-ai','AI Tools'],['etab-bulkmsg','Bulk Message'],['etab-schedule','Schedule']] },
      { label:'📊 Grow',     tabs:[['etab-analytics','Analytics'],['etab-reviews','Reviews'],['etab-profile','Profile']] },
      { label:'🛡 Trust',    tabs:[['etab-bgcheck','Verification'],['etab-letters','Rec Letters']] },
    ],
    more: [
      { section:'Tools & Settings', items:[
        { icon:'🤖', label:'AI Tools',  tab:'etab-ai' },
        { icon:'📅', label:'Schedule',  tab:'etab-schedule' },
        { icon:'⭐', label:'Reviews',   tab:'etab-reviews' },
        { icon:'📜', label:'Letters',   tab:'etab-letters' },
        { icon:'🛡', label:'Verify',    tab:'etab-bgcheck' },
        { icon:'👤', label:'Profile',   tab:'etab-profile' },
      ]},
    ],
  },
};

/* ── Core tab switcher ───────────────────────────────── */
function switchTab(role, tabId) {
  if (!tabId) return;
  if (tabId === 'verify') { window.showVerifyPage && showVerifyPage(); return; }
  if (tabId === 'admin')  { window.gotoPage && gotoPage('admin'); setTimeout(()=>window.renderAdmin&&renderAdmin(),80); return; }
  if (tabId === 'ttab-lessons' || tabId === 'ttab-ai') { setTimeout(()=>{ if(typeof renderLessonsGrid==='function') renderLessonsGrid(); }, 100); }
  const page = document.getElementById('page-' + role);
  if (!page) return;
  page.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  // Sync desktop subtabs
  const sub = page.querySelector('.subtab-row');
  if (sub) {
    sub.querySelectorAll('.subtab').forEach(b =>
      b.classList.toggle('active', b.dataset.tid === tabId));
  }
  // Scroll to top of dashboard
  page.querySelector('.dashboard')?.scrollTo?.(0,0);
  window.scrollTo?.(0,0);
}
window.switchDashTab = function(btn, tabId) {
  const role = window.currentUser?.type || 'teen';
  switchTab(role, tabId);
};

/* ── Mobile bottom nav ───────────────────────────────── */
function buildBottomNav(role) {
  const cfg = NAV[role];
  if (!cfg) return;
  const nav = document.getElementById('mobileNav');
  if (!nav) return;

  // Replace inner HTML with fresh structure
  nav.innerHTML = '<div class="mnav-inner" id="mnavInner"></div>';
  const inner = nav.querySelector('.mnav-inner');

  cfg.bottom.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.className = 'mnav-btn' + (i === 0 ? ' active' : '') + (item.action === 'msg' ? ' msg-btn' : '');
    btn.id = 'mnav-' + i;
    btn.innerHTML = `<span class="ni">${item.icon}</span><span>${item.label}</span>`;
    btn.onclick = () => {
      if (item.action === 'msg')  { window.openMsgModal && openMsgModal(); return; }
      if (item.action === 'more') { openMoreDrawer(role); return; }
      // Switch tab
      switchTab(role, item.tab);
      // Update active state
      inner.querySelectorAll('.mnav-btn').forEach((b,j) => b.classList.toggle('active', j === i));
    };
    inner.appendChild(btn);
  });

  nav.style.display = 'block';
}

/* ── More drawer ─────────────────────────────────────── */
function openMoreDrawer(role) {
  // Remove existing
  document.getElementById('more-drawer')?.remove();
  document.getElementById('more-scrim')?.remove();

  const cfg = NAV[role];
  if (!cfg) return;

  const scrim = document.createElement('div');
  scrim.id = 'more-scrim';
  const close = () => { drawer.remove(); scrim.remove(); };
  scrim.onclick = close;
  document.body.appendChild(scrim);

  const drawer = document.createElement('div');
  drawer.id = 'more-drawer';

  let sectionsHtml = '';
  cfg.more.forEach(section => {
    sectionsHtml += `<div class="more-section-label">${section.section}</div><div class="more-grid">`;
    section.items.forEach(item => {
      let onclick = '';
      if (item.tab)            onclick = `window._navfix_go('${role}','${item.tab}')`;
      else if (item.action === 'dark')  onclick = `window.toggleDarkMode&&toggleDarkMode()`;
      const isDark = document.documentElement.classList.contains('dark');
      if (item.action === 'dark') item.label = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
      else if (item.action === 'admin') onclick = `window.gotoPage&&gotoPage('admin');setTimeout(()=>window.renderAdmin&&renderAdmin(),80)`;
      const isUtil = item.action === 'dark' || item.action === 'admin';
      sectionsHtml += `<button class="more-btn${isUtil?' utility-btn':''}" onclick="${onclick};document.getElementById('more-drawer')?.remove();document.getElementById('more-scrim')?.remove()">
        <span class="mi">${item.icon}</span><span>${item.label}</span>
      </button>`;
    });
    sectionsHtml += '</div>';
  });

  drawer.innerHTML = `
    <div class="more-pill" onclick="document.getElementById('more-drawer')?.remove();document.getElementById('more-scrim')?.remove()"></div>
    <div class="more-head">
      <span class="more-head-title">More</span>
      <button onclick="document.getElementById('more-drawer')?.remove();document.getElementById('more-scrim')?.remove()"
        style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted);padding:4px">✕</button>
    </div>
    ${sectionsHtml}
    <div style="height:8px"></div>`;

  document.body.appendChild(drawer);
  document.addEventListener('keydown', function esc(e){
    if (e.key==='Escape'){ close(); document.removeEventListener('keydown',esc); }
  });
}
window._navfix_go = function(role, tabId) { switchTab(role, tabId); };
window.openMobileMoreDrawer = function(){ openMoreDrawer(window.currentUser?.type||'teen'); };

/* ── Desktop grouped nav ─────────────────────────────── */
function buildDesktopNav(role) {
  const cfg = NAV[role];
  if (!cfg) return;
  const page = document.getElementById('page-' + role);
  if (!page) return;

  // Hide any old strips
  page.querySelectorAll('#parent-desktop-tabs,#teen-desktop-tabs,#employer-desktop-tabs,.grp-tabs,.subtab-row').forEach(el => el.remove());

  const dash = page.querySelector('.dashboard');
  const header = dash?.querySelector('.dash-header');
  if (!header) return;

  // Group tabs
  const grpEl = document.createElement('div');
  grpEl.className = 'grp-tabs';
  grpEl.innerHTML = cfg.groups.map((g,i) =>
    `<button class="grp-tab${i===0?' active':''}" data-gi="${i}">${g.label}</button>`).join('');

  // Sub tabs
  const subEl = document.createElement('div');
  subEl.className = 'subtab-row';

  header.insertAdjacentElement('afterend', grpEl);
  grpEl.insertAdjacentElement('afterend', subEl);

  function showGroup(gi) {
    const g = cfg.groups[gi];
    grpEl.querySelectorAll('.grp-tab').forEach((b,i) => b.classList.toggle('active', i===gi));
    subEl.innerHTML = g.tabs.map(([tid,label],i) =>
      `<button class="subtab${i===0?' active':''}" data-tid="${tid}">${label}</button>`).join('');
    subEl.querySelectorAll('.subtab').forEach(b => {
      b.onclick = () => {
        subEl.querySelectorAll('.subtab').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        switchTab(role, b.dataset.tid);
      };
    });
    // Switch to first tab of group
    if (g.tabs[0]) switchTab(role, g.tabs[0][0]);
  }

  grpEl.querySelectorAll('.grp-tab').forEach((b,i) => b.onclick = () => showGroup(i));
  showGroup(0);
}

/* ── Main entry: call on every dashboard load ────────── */
function initNav(role) {
  if (!NAV[role]) return;
  // Hard-reset: hide ALL panels in this page before building nav
  const pg = document.getElementById('page-' + role);
  if (pg) pg.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  buildBottomNav(role);
  buildDesktopNav(role);
}
window.buildNavTabs = initNav; // replace all prior versions

/* ── Wire into gotoPage and _directDemo ─────────────── */
const _origGoto = window.gotoPage;
window.gotoPage = function(page) {
  _origGoto && _origGoto(page);
  // _origGoto now calls window.buildNavTabs = initNav, so no need to call again
};

/* ── Also fire when _directDemo forces a page ────────── */
const _origLaunch = window.launchDashboard;
window.launchDashboard = function() {
  try { _origLaunch && _origLaunch.apply(this, arguments); } catch(e){}
  const role = window.currentUser?.type;
  if (role && NAV[role]) setTimeout(() => initNav(role), 80);
};

/* ── Boot on DOMContentLoaded if already logged in ───── */
function boot() {
  const role = window.currentUser?.type;
  if (role && NAV[role]) initNav(role);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
