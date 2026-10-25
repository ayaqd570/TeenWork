/* Local, offline acceptance checks. No real accounts, API calls, messages or posts. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const path=require('node:path');
(async()=>{
 const server=spawn('python',['-m','http.server','8021'],{cwd:path.resolve(__dirname,'..'),stdio:'ignore'});
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 try{
 for(const viewport of [{width:390,height:844},{width:320,height:720},{width:1440,height:1000}]){
  const context=await browser.newContext({viewport});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  const p=await context.newPage(),errors=[];p.setDefaultTimeout(7000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:8021/',{waitUntil:'domcontentloaded'});await p.waitForTimeout(300);
  const home=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,title:document.querySelector('#tw48-h1').getBoundingClientRect().bottom,signup:[...document.querySelectorAll('#tw48-hero button')].find(b=>b.textContent.includes('Sign Up')).getBoundingClientRect().bottom}));
  assert.equal(home.overflow,false);if(viewport.width<500){assert(home.title<viewport.height);assert(home.signup<viewport.height);}
  assert.equal(await p.locator('link[rel="canonical"]').getAttribute('href'),'https://teenwork.ayaqd.com/');
  for(const role of ['teen','parent','employer']){
   await p.evaluate(r=>_directDemo(r),role);await p.waitForTimeout(1100);
   if(await p.locator('#tw34-skip').isVisible())await p.locator('#tw34-skip').click();
   assert.equal(await p.locator('.page.active').getAttribute('id'),'page-'+role);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await p.locator('.verified-emp-badge').count(),0);
   await p.evaluate(()=>showToast('Local verification message','info'));
   const pos=await p.evaluate(()=>{const t=document.querySelector('#global-toast').getBoundingClientRect(),nav=[...document.querySelectorAll('.mobile-nav')].find(x=>x.getBoundingClientRect().height);return {bottom:t.bottom,navTop:nav?.getBoundingClientRect().top||innerHeight};});
   if(viewport.width<769)assert(pos.bottom<=pos.navTop);
   await p.getByRole('button',{name:'Dismiss notification',exact:true}).click();
   assert.equal(await p.locator('#global-toast').evaluate(el=>el.style.opacity),'0');
   await p.evaluate(()=>twOpenSafetyDetails());assert(await p.locator('#tw48-safety-modal').isVisible());await p.evaluate(()=>twCloseSafetyDetails());
   await p.evaluate(()=>showVerifyPage());await p.waitForTimeout(100);assert.equal(await p.locator('.page.active').getAttribute('id'),'page-verify');
   await p.evaluate(r=>gotoPage(r),role);
  }
  await p.evaluate(()=>_directDemo('parent'));await p.waitForTimeout(700);
  // Fixture records live only in this disposable demo browser.
  await p.evaluate(()=>{demoJobs.splice(0,demoJobs.length,...['pending-approval','pending-approval','applied','accepted','parent-denied'].map((status,i)=>({id:900+i,title:'Fixture '+i,employer:'Sample employer',status,pay:15,payType:'hourly',city:'Burlington',state:'Vermont',type:'yard work',minAge:14,maxHours:3,desc:'Sample task',applied:'Today'})));renderApprovalJobs(demoJobs);});
  assert.equal(await p.locator('#parent-awaiting-count').textContent(),'2');
  assert.equal(await p.locator('#approval-count-badge').textContent(),'2 Pending');
  await p.evaluate(()=>renderApprovalJobs(demoJobs.slice(0,1)));
  assert.match(await p.locator('#approval-count-badge').textContent(),/2 Pending.*1 shown/);
  assert.equal(await p.locator('#parent-awaiting-count').textContent(),'2');
  await p.locator('#parent-awaiting-count').click();assert(await p.locator('#ptab-approvals').evaluate(el=>el.classList.contains('active')));
  assert.equal(await p.locator('#approval-jobs [id^="job-card-"]').count(),2);
  await p.evaluate(()=>{demoJobs[0].status='applied';renderApprovalJobs(demoJobs);});
  assert.equal(await p.locator('#parent-awaiting-count').textContent(),'1');assert.equal(await p.locator('#approval-count-badge').textContent(),'1 Pending');
  await p.evaluate(()=>{demoJobs.forEach(j=>j.status='applied');renderApprovalJobs(demoJobs);});
  assert.equal(await p.locator('#parent-awaiting-count').textContent(),'0');
  await p.evaluate(()=>{_directDemo('teen');window.currentUser.state='';window.currentUser.dob='';window.currentUser.age=undefined;twRenderLaborSummary(document.querySelector('#teen-state-rules-banner'),'Vermont');});
  assert.match(await p.locator('#teen-state-rules-banner').textContent(),/unknown|Add your age/);
  await p.evaluate(()=>{window.currentUser.state='Vermont';window.currentUser.age=13;twRenderLaborSummary(document.querySelector('#teen-state-rules-banner'),'Vermont');});
  assert.match(await p.locator('#teen-state-rules-banner strong').textContent(),/Age 13/);
  await p.evaluate(()=>{_directDemo('teen');});await p.waitForTimeout(700);
  await p.evaluate(()=>{browsableJobs.splice(0,browsableJobs.length,{id:888888,title:'Sample watering task',employer:'Sample neighbor',pay:15,payType:'hourly',city:'Burlington',state:'Vermont',type:'yard work',minAge:14,maxHours:3,desc:'Water flowers with a can.',status:'active'});renderBrowseJobs();});await p.waitForTimeout(100);
  assert.equal(await p.locator('#browse-jobs-list .browse-card').count(),1);
  assert.equal(await p.locator('#browse-jobs-list .btn-apply').count(),1);
  assert.equal(await p.locator('#browse-jobs-list [onclick*=requestEmployerBGC]').count(),0);
  assert.equal(await p.locator('#browse-jobs-list .tw-secondary-actions').count(),1);
  await p.evaluate(()=>openDisputeModal('Sample neighbor','Sample task'));
  assert.match(await p.locator('#dispute-form').textContent(),/does not send a report/);
  await p.evaluate(()=>closeDisputeModal());
  await p.evaluate(()=>_directDemo('employer'));await p.waitForTimeout(700);await p.evaluate(()=>switchEmployerTab('etab-post','edtab-post'));
  await p.locator('#emp-title').fill('Sample garden watering');await p.locator('#emp-type').selectOption('yard work');await p.locator('#emp-pay').fill('15');await p.locator('#emp-desc').fill('Water garden plants with a watering can.');
  await p.getByRole('button',{name:'Continue',exact:true}).click();await p.locator('#emp-state').selectOption('Vermont');await p.locator('#emp-city').fill('Burlington');
  await p.getByRole('button',{name:'Continue',exact:true}).click();await p.locator('#emp-min-age').fill('14');await p.locator('#emp-max-hours').fill('3');await p.locator('#twjt-emp-permit').check();
  await p.getByRole('button',{name:'Continue',exact:true}).click();
  assert.match(await p.locator('#tw-post-preview').textContent(),/Sample garden watering/);
  assert.match(await p.locator('#tw-post-preview').textContent(),/not a compliance approval/);
  assert(await p.getByRole('button',{name:'Post Job',exact:true}).isVisible());
  await p.getByRole('button',{name:'Save draft on this device',exact:true}).click();
  const key=await p.evaluate(()=>Object.keys(localStorage).find(k=>k.startsWith('tw_post_draft_')));assert(key);
  await p.getByRole('button',{name:'Restore my device draft',exact:true}).click();assert.equal(await p.locator('#emp-title').inputValue(),'Sample garden watering');assert(await p.locator('#twjt-emp-permit').isChecked());
  await p.evaluate(()=>{window.__calls=0;window.callClaudeAI=()=>{window.__calls++;return Promise.resolve('fake')};TW_Verify.purchaseBGC();TW_Verify.checkEmployer();runEmployerBGC();requestEmployerBGC();});
  assert.equal(await p.evaluate(()=>window.__calls),0);
  assert.deepEqual(errors,[]);
  console.log('PASS viewport '+viewport.width+'x'+viewport.height+': homepage, roles, queue transitions, toast, age summary, post steps/preview/device draft, unavailable screening');
  await context.close();
 }
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
