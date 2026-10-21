
(function(){
  'use strict';
  const TAB_GROUPS = {
    parent: [
      {id:'home',    label:'🏠 Home',     tabs:[['ptab-overview','Overview'],['ptab-approvals','Approvals'],['ptab-ratings','Ratings']]},
      {id:'safety',  label:'🛡 Safety',   tabs:[['ptab-controls','Controls'],['ptab-notifications','Notifications'],['ptab-trusted','Trusted Employers']]},
      {id:'updates', label:'📬 Updates',  tabs:[['ptab-weekly','Weekly Digest'],['ptab-savings','Savings Goals']]},
      {id:'family',  label:'👨‍👩‍👧 Family', tabs:[['ptab-teens','My Teens']]},
    ],
    teen: [
      {id:'jobs',   label:'🔍 Jobs',   tabs:[['ttab-browse','Browse'],['ttab-applications','Applied'],['ttab-tracker','Pipeline'],['ttab-map','Map'],['ttab-calendar','Calendar']]},
      {id:'me',     label:'👤 Account',tabs:[['ttab-resume','Profile & Settings'],['ttab-portfolio','Portfolio'],['ttab-references','References'],['ttab-badges','Badges'],['ttab-leaderboard','Leaderboard']]},
      {id:'work',   label:'💼 Work',   tabs:[['ttab-worklog','Hours'],['ttab-earnings','Earnings'],['ttab-savings','Savings']]},
      {id:'grow',   label:'🤖 Grow',   tabs:[['ttab-ai','AI Coach'],['ttab-lessons','Lessons'],['ttab-firstjob','First Job'],['ttab-letters','Rec Letters'],['ttab-qa','Q&A'],['ttab-stories','Stories']]},
      {id:'verify', label:'🛡️ Verify', tabs:[['verify','Verification']]},
    ],
    employer: [
      {id:'pipeline', label:'📝 Pipeline', tabs:[['etab-post','Post'],['etab-applicants','Applicants'],['etab-active','Active Jobs']]},
      {id:'comms',    label:'💬 Comms',    tabs:[['etab-ai','AI Tools'],['etab-letters','Letters'],['etab-bulkmsg','Bulk Message'],['etab-schedule','Schedule']]},
      {id:'grow',     label:'📊 Grow',     tabs:[['etab-analytics','Analytics'],['etab-reviews','Reviews'],['etab-profile','Profile']]},
      {id:'trust',    label:'🛡 Trust',    tabs:[['etab-bgcheck','Verification']]},
    ],
  };

  /* ─── Render grouped nav for a role ─── */
  function renderGroupedNav(role){
    const page = document.getElementById('page-'+role);
    if(!page || page.querySelector('.grp-tabs[data-role="'+role+'"]')) return;

    // Hide any existing flat tab strip
    const existing = page.querySelector('#parent-desktop-tabs, #teen-desktop-tabs, #employer-desktop-tabs');
    if(existing) existing.style.display = 'none';
    // Hide v23 tab injections (tdtab/pdtab-admin) since they're now inside groups
    page.querySelectorAll('#tdtab-map,#tdtab-qa,#tdtab-stories,#pdtab-admin,#edtab-pricing').forEach(b=>b.style.display='none');

    const dash = page.querySelector('.dashboard');
    if(!dash) return;
    const header = dash.querySelector('.dash-header');
    if(!header) return;

    const groups = TAB_GROUPS[role] || [];
    const nav = document.createElement('div');
    nav.className = 'grp-tabs';
    nav.dataset.role = role;
    nav.innerHTML = groups.map((g,i)=>`<button class="grp-tab${i===0?' active':''}" data-grp="${g.id}">${g.label}</button>`).join('');
    const sub = document.createElement('div');
    sub.className = 'subtab-row';
    sub.dataset.role = role;

    header.insertAdjacentElement('afterend', nav);
    nav.insertAdjacentElement('afterend', sub);

    function showGroup(gid){
      const g = groups.find(x=>x.id===gid); if(!g) return;
      nav.querySelectorAll('.grp-tab').forEach(b=>b.classList.toggle('active', b.dataset.grp===gid));
      sub.innerHTML = g.tabs.map(([tid,label],i)=>`<button class="subtab${i===0?' active':''}" data-tid="${tid}">${label}</button>`).join('');
      // switch to first tab in group automatically
      if(g.tabs[0]) switchTo(g.tabs[0][0]);
      sub.querySelectorAll('.subtab').forEach(b=>b.onclick = ()=>{
        sub.querySelectorAll('.subtab').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        switchTo(b.dataset.tid);
      });
    }
    function switchTo(tabId){
      if(tabId === 'page-admin-link'){ window.gotoPage && gotoPage('admin'); setTimeout(()=>window.renderAdmin && renderAdmin(), 80); return; }
      if(tabId === 'ttab-map'){ window.switchDashTab && switchDashTab(null, tabId); setTimeout(()=>window.renderJobMap && renderJobMap('job-map-container'), 60); return; }
      if(tabId === 'ttab-qa'){ window.switchDashTab && switchDashTab(null, tabId); setTimeout(()=>window.renderQA && renderQA('qa-board-container'), 60); return; }
      if(tabId === 'ttab-stories'){ window.switchDashTab && switchDashTab(null, tabId); setTimeout(()=>window.renderStories && renderStories('stories-container'), 60); return; }
      window.switchDashTab && switchDashTab(null, tabId);
    }
    nav.querySelectorAll('.grp-tab').forEach(b=>b.onclick = ()=>showGroup(b.dataset.grp));
    showGroup(groups[0].id);
  }

  /* ─── Hook buildNavTabs to render grouped nav each time ─── */
  function patchNavV24(){
    if(typeof window.buildNavTabs !== 'function') return setTimeout(patchNavV24, 300);
    const orig = window.buildNavTabs;
    window.buildNavTabs = function(role){
      orig(role);
      setTimeout(()=>renderGroupedNav(role), 40);
    };
  }

  /* ─── Gate demo data: if not demo user, wipe demo arrays ─── */
  function gateDemoData(){
    if(typeof window.launchDashboard !== 'function') return setTimeout(gateDemoData, 300);
    const orig = window.launchDashboard;
    window.launchDashboard = function(){
      orig.apply(this, arguments);
      const isDemo = !!(window.currentUser && window.currentUser.isDemo);
      window.DEMO_MODE = isDemo;
      if(!isDemo){
        // Real account: wipe any demo seed data so the dashboard is truly empty
        try{
          if(Array.isArray(window.demoJobs))    window.demoJobs.length = 0;
          if(Array.isArray(window.demoNotifs))  window.demoNotifs.length = 0;
          if(Array.isArray(window.demoApplicants)) window.demoApplicants.length = 0;
          if(Array.isArray(window.browsableJobs)) window.browsableJobs.length = 0;
          // Re-render the panels that depend on this data
          window.renderBrowseJobs && renderBrowseJobs();
          window.renderTeenDashboard && renderTeenDashboard();
          window.renderEmployerDashboard && renderEmployerDashboard();
          window.renderParentDashboard && renderParentDashboard();
        }catch(e){ console.warn('demo-gate:', e); }
      }
    };
  }

  /* ─── Silent compliance engine (rule-based) ─── */
  function complianceCheck(job){
    // job: {title, type, pay, payType, minAge, maxHours, state, desc}
    const issues = [];
    const S = window.STATE_DATA || {};
    const rules = S[job.state] || {minAge:14, schoolWeekMax:18, summerMax:40, nightCurfew:'10pm'};
    // Hard federal rules (apply everywhere)
    const HAZARDOUS = /(roofing|mining|explosive|meat slicer|meat grinder|forklift|chainsaw|driving|operate.+machinery|demolition|power saw|tractor|crane|scaffold|hazmat|asbestos|welding)/i;
    if(HAZARDOUS.test(job.desc||'') || HAZARDOUS.test(job.title||'')){
      issues.push({level:'block', reason:'Federal child-labor law prohibits minors from operating hazardous equipment or performing high-risk work.'});
    }
    if(typeof job.pay === 'number' && job.pay > 0 && job.pay < 5){
      issues.push({level:'block', reason:`Pay of $${job.pay}/${job.payType} is below minimum wage for minors.`});
    }
    if(typeof job.minAge === 'number' && job.minAge < (rules.minAge||14)){
      issues.push({level:'block', reason:`${job.state||'This state'} requires minimum age ${rules.minAge||14} for paid work.`});
    }
    if(typeof job.maxHours === 'number' && job.maxHours > 40){
      issues.push({level:'block', reason:'Federal law caps minors at 40 hrs/week (8 hrs/day during school breaks).'});
    }
    if(typeof job.maxHours === 'number' && rules.schoolWeekMax && job.maxHours > rules.schoolWeekMax){
      issues.push({level:'warn', reason:`${job.state} caps school-week hours at ${rules.schoolWeekMax} for ages under 16. Your cap of ${job.maxHours} will only apply to teens 16+.`});
    }
    // Adult content
    if(/adult content|nude|explicit|nsfw|escort|bar\s+(staff|tend)|tobacco|alcohol|vape|cannabis|weed|marijuana/i.test(`${job.title} ${job.desc||''}`)){
      issues.push({level:'block', reason:'Jobs involving adult/age-restricted products or environments are not permitted for minors.'});
    }
    return issues;
  }
  // Expose + hook into postJob
  window.complianceCheck = complianceCheck;
  function patchPostJob(){
    if(typeof window.postJob !== 'function') return setTimeout(patchPostJob, 300);
    const orig = window.postJob;
    window.postJob = async function(...a){
      // Collect the job fields the same way postJob does
      const g = id => document.getElementById(id);
      const job = {
        title:    g('emp-title')?.value.trim(),
        type:     g('emp-type')?.value,
        pay:      parseFloat(g('emp-pay')?.value)||0,
        payType:  g('emp-pay-type')?.value,
        state:    g('emp-state')?.value.trim(),
        minAge:   parseInt(g('emp-min-age')?.value)||14,
        maxHours: parseInt(g('emp-max-hours')?.value)||15,
        desc:     g('emp-desc')?.value.trim(),
      };
      const issues = complianceCheck(job);
      const blockers = issues.filter(i=>i.level==='block');
      if(blockers.length){
        const html = '🚫 Silent compliance engine blocked this post:\n\n' +
          blockers.map(i=>`• ${i.reason}`).join('\n');
        window.showAlert ? showAlert('emp-post-alert', html, 'error') : alert(html);
        return;
      }
      // Warnings don't block but surface to employer
      const warns = issues.filter(i=>i.level==='warn');
      if(warns.length && window.showToast){
        warns.forEach(w=>showToast('⚠️ '+w.reason, 'warn'));
      }
      return orig.apply(this, a);
    };
  }

  /* ─── Grooming / sentiment watchdog ─── */
  const GROOMING_PATTERNS = [
    /don'?t tell your (mom|dad|parent|mother|father|mum)/i,
    /(our|this will be our) little secret/i,
    /keep this (between|just) us/i,
    /you'?re (really )?(mature|grown|so grown up) for your age/i,
    /can you keep a secret/i,
    /send me a (pic|picture|photo|selfie)/i,
    /what are you wearing/i,
    /no one (has to|needs to|should) know/i,
    /delete (this|the) (message|chat|convo)/i,
    /come alone/i,
    /let'?s meet (somewhere|alone|just us)/i,
    /(pay you|give you).+(extra|cash|more).+(alone|privately)/i,
    /how old are you (really|again)/i,
    /i can pick you up/i,
    /(cash|money) under the table/i,
  ];
  window.groomingCheck = function(text){
    if(!text) return {flag:false};
    for(const p of GROOMING_PATTERNS){ if(p.test(text)) return {flag:true, pattern: p.toString()}; }
    return {flag:false};
  };
  function patchScan(){
    if(typeof window.scanMessage !== 'function') return setTimeout(patchScan, 300);
    const orig = window.scanMessage;
    window.scanMessage = function(text){
      const g = groomingCheck(text);
      if(g.flag){
        // Log silent safety alert for parent review
        try{
          const log = JSON.parse(localStorage.getItem('tw_safety_alerts')||'[]');
          log.push({ts:Date.now(), type:'grooming', pattern:g.pattern, preview:(text||'').slice(0,160)});
          localStorage.setItem('tw_safety_alerts', JSON.stringify(log));
        }catch(e){}
        return { blocked:true, reason:'safety_pattern', pattern:g.pattern, source:'grooming-watchdog' };
      }
      return orig.call(this, text);
    };
  }

  /* ─── "Why this match" chips on browse cards ─── */
  function whyThisMatch(job){
    const skills = (window.userActivity?.skills || []).map(s=>String(s).toLowerCase());
    const bio    = String(window.userActivity?.bio || '').toLowerCase();
    const city   = String(window.currentUser?.city || '').toLowerCase();
    const reasons = [];
    // skill match
    const txt = `${job.title||''} ${job.type||''} ${job.desc||''}`.toLowerCase();
    const hit = skills.find(s => s && txt.includes(s));
    if(hit) reasons.push(`Matches your "${hit}" skill`);
    // location
    if(city && String(job.city||'').toLowerCase().includes(city)) reasons.push(`In ${job.city}`);
    // pay
    if(typeof job.pay === 'number' && job.pay >= 15) reasons.push(`Pays $${job.pay}/${job.payType||'hr'}`);
    // age fit
    const age = window.getTeenAge?.() || window.currentUser?.age;
    if(age && job.minAge && age >= job.minAge) reasons.push(`Open to age ${age}`);
    // bio keyword
    if(bio){
      const bioWords = bio.split(/\W+/).filter(w=>w.length>4);
      const bioHit = bioWords.find(w => txt.includes(w));
      if(bioHit && !reasons.join(' ').toLowerCase().includes(bioHit)) reasons.push(`You mentioned "${bioHit}" in your bio`);
    }
    return reasons.slice(0,2);
  }
  function patchBrowse(){
    if(typeof window.renderBrowseJobs !== 'function') return setTimeout(patchBrowse, 300);
    const orig = window.renderBrowseJobs;
    window.renderBrowseJobs = function(...a){
      orig.apply(this,a);
      setTimeout(()=>{
        const cards = document.querySelectorAll('#browse-jobs-list .browse-card');
        const jobs  = (window.browsableJobs||[]).filter(j=>!(new Set((window.demoJobs||[]).map(x=>x.id))).has(j.id));
        cards.forEach((card, i)=>{
          if(card.querySelector('.why-match')) return;
          const j = jobs[i]; if(!j) return;
          const r = whyThisMatch(j);
          if(!r.length) return;
          const wrap = document.createElement('div');
          wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px';
          wrap.innerHTML = r.map(x=>`<span class="why-match">${x}</span>`).join('');
          const head = card.querySelector('.browse-card-head') || card.firstElementChild;
          head?.insertAdjacentElement('afterend', wrap);
        });
      }, 20);
    };
  }

  /* ─── BOOT ─── */
  function boot(){
    patchNavV24();
    gateDemoData();
    patchPostJob();
    patchScan();
    patchBrowse();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
