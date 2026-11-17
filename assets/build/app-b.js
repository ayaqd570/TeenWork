/* TeenWork app-b.js — a built file, do not edit. Edit the files named below (assets/js, assets/css), then run: node tools/build.cjs */
/* assets/js/featpack-v25-js.js */
try{
(function(){
'use strict';
const TW_GROQ={
mode:'proxy',
proxyUrl:'https://qocmpwimsfcnqijtfmki.supabase.co/functions/v1/groq-chat',
endpoint:'https://api.groq.com/openai/v1/chat/completions',
plans:{
free:{key:'__TW_GROQ_FREE_KEY__',model:'llama-3.3-70b-versatile'},
pro:{key:'__TW_GROQ_PRO_KEY__',model:'llama-3.3-70b-versatile'},
},
};
window.TW_GROQ=TW_GROQ;
function _twAIPlan(){
const u=window.currentUser;
if(!u)return'free';
if(u.isAdmin||u.type==='admin')return'pro';
if(u.isDemo)return'free';
try{
if(window.twPlan&&typeof window.twPlan.storedPlanOf==='function'){
const p=window.twPlan.storedPlanOf(u);
if(p==='pro'||p==='free')return p;
}
if(window._DB&&typeof window._DB._prefix==='function'){
const raw=localStorage.getItem(window._DB._prefix()+'plan');
const p=raw?JSON.parse(raw):null;
if(p==='pro'||p==='free')return p;
}
}catch(e){}
const ids=[u.dataKey,u.email].filter(Boolean).map(s=>String(s).toLowerCase());
for(const id of ids){
const keys=['tw_'+id.replace(/[^a-z0-9]/gi,'_')+'_acct_tier','tw_'+id+'_acct_tier'];
for(const k of keys){
let t=null;
try{t=localStorage.getItem(k)||sessionStorage.getItem(k);}catch(e){}
if(t==='pro')return'pro';
if(t==='free')return'free';
}
}
return'free';
}
window._twAIPlan=_twAIPlan;
async function callAI(prompt,system,opts={}){
const limitCheck=typeof _checkAILimit==='function'?_checkAILimit():{ok:true};
if(!limitCheck.ok)throw new Error('__AI_LIMIT__:'+limitCheck.reason+':'+limitCheck.msg+(limitCheck.cta?':'+limitCheck.cta:''));
const messages=[];
if(system)messages.push({role:'system',content:system});
messages.push({role:'user',content:prompt});
const plan=_twAIPlan();
const planCfg=TW_GROQ.plans[plan]||TW_GROQ.plans.free;
const payload={
model:opts.model||planCfg.model,
messages,
max_tokens:opts.max_tokens||1000,
temperature:(opts.temperature==null)?0.7:opts.temperature,
};
let res;
if(TW_GROQ.mode==='proxy'){
const sbKey=(typeof SUPABASE_KEY!=='undefined')?SUPABASE_KEY:'';
const u=window.currentUser;
const demo= !!(u&&(u.isDemo||u.twDemo||(typeof window._twIsDemoSandboxUser==='function'&&window._twIsDemoSandboxUser(u))));
let bearer=sbKey;
if(!demo){
const client=await _twCloudClient();
const sessionResult=client?await client.auth.getSession():null;
const session=sessionResult?.data?.session;
if(!session?.access_token|| !u||
String(session.user?.email||'').toLowerCase()!==String(u.email||'').toLowerCase()){
throw new Error('Please sign in to your account to use AI features.');
}
bearer=session.access_token;
}
const headers={'Content-Type':'application/json','apikey':sbKey,'Authorization':'Bearer '+bearer};
if(demo)headers['x-teenwork-demo']='1';
res=await fetch(TW_GROQ.proxyUrl,{method:'POST',headers,body:JSON.stringify(payload)});
}else{
if(!planCfg.key||planCfg.key.startsWith('__'))throw new Error('AI is not set up yet (no Groq key for the '+plan+' plan).');
res=await fetch(TW_GROQ.endpoint,{
method:'POST',
headers:{'Content-Type':'application/json','Authorization':'Bearer '+planCfg.key},
body:JSON.stringify(payload),
});
}
const data=await res.json();
if(data.error)throw new Error(data.error.message||String(data.error));
typeof _incrementAICall==='function'&&_incrementAICall();
return data.choices?.[0]?.message?.content||JSON.stringify(data);
}
window.callAI=callAI;
function _showAILimitMsg(el,errMsg){
if(!el)return;
const parts=errMsg.replace('__AI_LIMIT__:','').split(':');
const reason=parts[0];
const msg=parts[1]||'AI limit reached.';
const cta=parts[2];
const cfg=typeof _adminGetConfig==='function'?_adminGetConfig():{};
if(reason==='upgrade'&&cfg.launchPaid&&(window.currentUser||{}).type!=='parent'){
el.innerHTML=`<div style="padding:14px;background:var(--amber-pale);border:1.5px solid var(--amber);border-radius:12px;text-align:center">
        <div style="font-size:1.4rem;margin-bottom:6px">⭐</div>
        <div style="font-weight:700;color:var(--amber);margin-bottom:4px">Daily AI Limit Reached</div>
        <div style="font-size:.85rem;color:var(--text);margin-bottom:10px">You've used today's free AI requests.</div>
        <div style="font-size:.82rem;color:var(--muted);margin-bottom:12px">Upgrade to <strong>TeenWork Pro</strong> for up to 500 a day — $3.99/mo.</div>
        <button onclick="gotoPage('pricing')" style="background:var(--amber);color:#fff;border:none;padding:8px 20px;border-radius:8px;font-weight:700;cursor:pointer;font-family:DM Sans,sans-serif">Upgrade to Pro →</button>
      </div>`;
}else{
el.innerHTML=`<div style="padding:12px 14px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;color:var(--muted);font-size:.85rem;text-align:center">${msg}<br><span style="font-size:.78rem">Try again tomorrow.</span></div>`;
}
}
window._showAILimitMsg=_showAILimitMsg;
if(typeof window.callGemini!=='function'){
window.callGemini=async function(prompt,system,_streaming){
try{return await callAI(prompt,system);}
catch(e){return'AI temporarily unavailable. '+(e.message||'');}
};
}
if(typeof window.callClaudeAI!=='function'){
window.callClaudeAI=async function(prompt,system){
try{return await callAI(prompt,system);}
catch(e){
const msg=e.message||'';
if(msg.startsWith('__AI_LIMIT__'))return'__AI_LIMIT_ERROR__';
return'AI temporarily unavailable. '+msg;
}
};
}
if(typeof window.openAI!=='function'){
window.openAI=async function(prompt,system){
const modal=document.getElementById('aiModal');
const out=document.getElementById('aiResponse');
if(modal)modal.classList.add('open','active');
if(out)out.innerHTML='<span class="loading-dots">Thinking</span>';
try{
const text=await callAI(prompt,system);
if(out)out.textContent=text;
}catch(e){
const msg=e.message||'';
if(msg.startsWith('__AI_LIMIT__')&&out){
_showAILimitMsg(out,msg);
}else if(out){
out.textContent='AI temporarily unavailable. '+msg;
}
}
};
window.closeAIModal=window.closeAIModal||function(){document.getElementById('aiModal')?.classList.remove('open','active');};
}
let bc=null;
try{bc=new BroadcastChannel('teenwork-rt');}catch(e){bc=null;}
const RT={
publish(event,data){
if(!bc)return;
bc.postMessage({event,data,ts:Date.now(),role:window.currentUser?.type||'anon'});
},
onMessage(handler){if(bc)bc.addEventListener('message',e=>handler(e.data));},
};
window.RT=RT;
RT.onMessage(({event,data,role})=>{
const myRole=window.currentUser?.type;
if(!myRole||role===myRole)return;
const toast=document.createElement('div');
toast.className='rt-toast';
toast.innerHTML='<strong style="color:var(--green)">⚡ Live update</strong><div style="margin-top:3px">'+htmlEscape(formatRtEvent(event,data))+'</div>';
document.body.appendChild(toast);
setTimeout(()=>toast.remove(),4500);
if(event==='job-posted'){window.renderBrowseJobs?.();}
if(event==='applied'){window.renderParentDashboard?.();window.renderEmployerDashboard?.();}
if(event==='message-sent'){}
});
function formatRtEvent(e,d){
if(e==='job-posted')return`New job posted: ${d.title||'Untitled'}`;
if(e==='applied')return`${d.teen||'A teen'} applied to ${d.job||'a job'}`;
if(e==='message-sent')return`New message from ${d.from||'a user'}`;
if(e==='safety-flag')return`⚠️ Safety flag raised`;
return`${e}`;
}
function htmlEscape(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function wirePostJob(){
if(typeof window.postJob!=='function')return setTimeout(wirePostJob,300);
const orig=window.postJob;
window.postJob=async function(...a){
const r=await orig.apply(this,a);
const title=document.getElementById('emp-title')?.value||'a new job';
RT.publish('job-posted',{title});
return r;
};
}
function wireApply(){
if(typeof window.applyToJob!=='function')return setTimeout(wireApply,300);
const orig=window.applyToJob;
window.applyToJob=function(...a){
const r=orig.apply(this,a);
RT.publish('applied',{teen:window.currentUser?.name,job:a[0]?.title||a[0]});
return r;
};
}
function wireMsg(){
if(typeof window.sendMsg!=='function')return setTimeout(wireMsg,300);
const orig=window.sendMsg;
window.sendMsg=async function(...a){
const r=await orig.apply(this,a);
RT.publish('message-sent',{from:window.currentUser?.name||'user'});
return r;
};
}
const MSG_CASES=[
['Hi! I can start this Saturday morning at 8am.',false],
['Great — see you at the community center at 4pm.',false],
['Our little secret, ok?',true],
["don't tell your parents about this",true],
["You're really mature for your age",true],
['send me a pic',true],
['What are you wearing right now?',true],
['I can pick you up, come alone',true],
['Cash under the table, no one needs to know',true],
["Delete this chat after you read it",true],
["Can you babysit on Friday night? It's 3 hours.",false],
['My address is 123 Main St, call me at 555-1234',true],
['sounds great, see you Tuesday',false],
['how old are you really',true],
['here is a link: malware.xyz/login',true],
];
const JOB_CASES=[
[{title:'Lawn mowing',type:'yard work',pay:18,payType:'hourly',state:'Vermont',minAge:14,maxHours:12,desc:'Mow a small yard weekly'},false],
[{title:'Roofing assistant',type:'construction',pay:20,payType:'hourly',state:'Vermont',minAge:15,maxHours:20,desc:'Carry shingles up a ladder'},true],
[{title:'Pet sitting',type:'pet care',pay:15,payType:'hourly',state:'Vermont',minAge:13,maxHours:8,desc:'Walk and feed two dogs'},false],
[{title:'Forklift operator',type:'warehouse',pay:17,payType:'hourly',state:'Vermont',minAge:14,maxHours:15,desc:'Operate forklift in the warehouse'},true],
[{title:'Babysitter',type:'child care',pay:15,payType:'hourly',state:'Vermont',minAge:14,maxHours:10,desc:'Watch 2 kids on Friday evenings'},false],
[{title:'Underpaid gig',type:'cleaning',pay:3,payType:'hourly',state:'Vermont',minAge:14,maxHours:10,desc:'Some cleaning'},true],
[{title:'60-hour week',type:'yard work',pay:12,payType:'hourly',state:'Vermont',minAge:14,maxHours:60,desc:'Lots of mowing'},true],
[{title:'Bar back',type:'food service',pay:14,payType:'hourly',state:'Vermont',minAge:15,maxHours:10,desc:'Stock alcohol and clean glasses at the bar'},true],
[{title:'Tutoring',type:'tutoring',pay:22,payType:'hourly',state:'Vermont',minAge:14,maxHours:6,desc:'Help 5th graders with math'},false],
[{title:'Under-age post',type:'cleaning',pay:15,payType:'hourly',state:'Vermont',minAge:11,maxHours:8,desc:'Light cleaning'},true],
];
window.renderSafetyLab=function(){
const msgEl=document.getElementById('safelab-msg');
const jobEl=document.getElementById('safelab-job');
const stats=document.getElementById('safelab-stats');
if(!msgEl|| !jobEl)return;
let msgPass=0;
msgEl.innerHTML='<div class="safelab-grid"><div class="h">Input</div><div class="h">Verdict</div><div class="h">Expected</div>'+
MSG_CASES.map(([txt,expect])=>{
const scan=window.scanMessage?.(txt)||{blocked:false};
const got= !!scan.blocked;
const ok=got===expect;
if(ok)msgPass++;
return`<div class="safelab-row safelab-input">${htmlEscape(txt)}</div>
                <div class="safelab-row ${got?'safelab-fail':'safelab-pass'}">${got?'🚫 blocked':'✅ passed'}</div>
                <div class="safelab-row ${ok?'safelab-pass':'safelab-fail'}">${ok?'✓ correct':'✗ wrong'}</div>`;
}).join('')+'</div>';
let jobPass=0;
jobEl.innerHTML='<div class="safelab-grid"><div class="h">Job</div><div class="h">Verdict</div><div class="h">Expected</div>'+
JOB_CASES.map(([j,expect])=>{
const issues=window.complianceCheck?.(j)||[];
const got=issues.some(i=>i.level==='block');
const ok=got===expect;
if(ok)jobPass++;
return`<div class="safelab-row safelab-input">${htmlEscape(j.title)} · age ${j.minAge}+ · $${j.pay}/${j.payType} · ${j.maxHours}h</div>
                <div class="safelab-row ${got?'safelab-fail':'safelab-pass'}">${got?'🚫 blocked':'✅ allowed'}</div>
                <div class="safelab-row ${ok?'safelab-pass':'safelab-fail'}">${ok?'✓ correct':'✗ wrong'}</div>`;
}).join('')+'</div>';
const total=MSG_CASES.length+JOB_CASES.length;
const pass=msgPass+jobPass;
const pct=Math.round(pass/total*100);
stats.innerHTML=`
      <div class="safelab-score"><div class="sc-num">${pct}%</div><div style="font-size:.78rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:3px">Suite accuracy</div></div>
      <div class="safelab-score"><div class="sc-num">${msgPass}/${MSG_CASES.length}</div><div style="font-size:.78rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:3px">Message tests</div></div>
      <div class="safelab-score"><div class="sc-num">${jobPass}/${JOB_CASES.length}</div><div style="font-size:.78rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:3px">Job tests</div></div>
      <div class="safelab-score" style="background:var(--amber-pale);border-color:var(--amber)"><div class="sc-num" style="color:var(--amber)">0 ms</div><div style="font-size:.78rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:3px">AI required</div></div>`;
};
function _wrapGotoForSafetyLab(){
var _origGoto=window.gotoPage;
if(typeof _origGoto==='function'&& !_origGoto._safetyLabWrapped){
var _wrapped=function(p){_origGoto(p);if(p==='safety-lab')setTimeout(renderSafetyLab,80);};
_wrapped._safetyLabWrapped=true;
window.gotoPage=_wrapped;
}else{
setTimeout(_wrapGotoForSafetyLab,150);
}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(_wrapGotoForSafetyLab,300);});
else setTimeout(_wrapGotoForSafetyLab,300);
window.downloadMyData=function(){
const data={
exported_at:new Date().toISOString(),
user:window.currentUser?{...window.currentUser}:null,
local_storage:{},
};
for(let i=0;i<localStorage.length;i++){
const k=localStorage.key(i);
if(!k|| !k.startsWith('tw_'))continue;
try{data.local_storage[k]=JSON.parse(localStorage.getItem(k));}
catch{data.local_storage[k]=localStorage.getItem(k);}
}
const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url;
a.download=`teenwork-data-${new Date().toISOString().slice(0,10)}.json`;
a.click();
setTimeout(()=>URL.revokeObjectURL(url),500);
window.showToast?.('📥 Your data exported','success');
};
if('serviceWorker'in navigator&&location.protocol!=='file:'){
navigator.serviceWorker.register('sw.js').catch(()=>{
const src=`
        const CACHE = 'teenwork-v1';
        self.addEventListener('install', e => {
          e.waitUntil(caches.open(CACHE).then(c => c.addAll([location.origin + '/'])));
          self.skipWaiting();
        });
        self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });
        self.addEventListener('fetch', e => {
          if (e.request.method !== 'GET') return;
          e.respondWith(
            caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
              const copy = resp.clone();
              caches.open(CACHE).then(c => { try { c.put(e.request, copy); } catch(_){} });
              return resp;
            }).catch(() => caches.match('/')))
          );
        });`;
const url=URL.createObjectURL(new Blob([src],{type:'application/javascript'}));
navigator.serviceWorker.register(url).catch(()=>{});
});
}
function injectEntryPoints(){
const landing=document.querySelector('#page-landing .landing-shell');
if(landing&& !document.getElementById('featpack-safetylab-cta')){
const d=document.createElement('div');
d.id='featpack-safetylab-cta';
d.style.cssText='margin:1.4rem auto;text-align:center';
d.innerHTML=`<button onclick="gotoPage('safety-lab');setTimeout(function(){if(typeof renderSafetyLab==='function')renderSafetyLab();},150);" class="btn-secondary" style="padding:10px 20px;border-color:var(--red);color:var(--red)">🛡️ See the safety engine — live eval</button>`;
landing.appendChild(d);
}
const refModal=document.querySelector('#referralModal .modal');
if(refModal&& !document.getElementById('dl-my-data-btn')){
const btn=document.createElement('button');
btn.id='dl-my-data-btn';btn.className='btn-secondary';
btn.style.cssText='width:100%;margin-top:8px';
btn.textContent='📥 Download my data (JSON)';
btn.onclick=downloadMyData;
refModal.appendChild(btn);
}
}
function boot(){
wirePostJob();
wireApply();
wireMsg();
injectEntryPoints();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-09.js */
try{
(function fixDemoAndAdmin(){
function _run(){
window.demoLogin=function(type){
console.log('[demoLogin] called with type:',type);
var validTypes=['teen','parent','employer'];
if(!type||validTypes.indexOf(type)=== -1){
console.warn('[demoLogin] invalid type:',type);return;
}
window.currentUser=null;
window.selectedType=null;
window.parentVerified=false;
window.pendingEmail='';
if(typeof resetSessionState==='function')resetSessionState();
var emailMap={teen:'teen@teenwork.demo',parent:'parent@teenwork.demo',employer:'employer@teenwork.demo'};
var nameMap={teen:'Alex Johnson',parent:'Jamie Johnson',employer:"Mike's Landscaping"};
window.currentUser={
name:nameMap[type],
email:emailMap[type],
type:type,
emailVerified:true,
city:'Burlington',
state:'Vermont',
age:type==='teen'?16:undefined,
isDemo:true,
parentLinked:type==='teen'?{status:'approved',parentName:'Jamie Johnson',parentEmail:'parent@teenwork.demo'}:undefined,
};
console.log('[demoLogin] currentUser:',JSON.stringify(window.currentUser));
if(type==='teen'){
if(window.userActivity){
userActivity.bio='Hardworking 16-year-old from Burlington, Vermont.';
userActivity.skills=['lawn care','pet sitting','snow shoveling','cleaning'];
userActivity.jobsAccepted=[
{title:"Lawn Mowing & Yard Cleanup",employer:"Mike's Landscaping"},
{title:"House Cleaning Assistant",employer:"The Hendersons"},
];
userActivity.lessonsCompleted=['first_impression','safety'];
}
if(window.teenGameState){
teenGameState.points=180;
teenGameState.badges=['first_job','first_hire','lesson_1','verified'];
teenGameState.hoursWorked=14;
}
}
console.log('[demoLogin] launchDashboard is:',typeof launchDashboard);
if(typeof launchDashboard==='function'){
try{launchDashboard();}catch(e){console.error('[demoLogin] launchDashboard threw:',e);}
}
if(typeof gotoPage==='function'){
gotoPage(type);
setTimeout(function(){gotoPage(type);},100);
}
if(typeof showToast==='function')showToast('Welcome to the '+type.charAt(0).toUpperCase()+type.slice(1)+' Demo!','success');
};
function _seedDemoAccounts(){
const demos={
'teen@teenwork.demo':{
tier:'pro',
profile:{firstName:'Alex',lastName:'Johnson',age:16,city:'Burlington',state:'Vermont',bio:'Hardworking 16-year-old looking for local jobs. Great with animals, lawn care, and cleaning. Reliable and punctual!',skills:['Lawn Mowing','Pet Sitting','Snow Shoveling','House Cleaning','Dog Walking']},
earnings:[
{id:'e1',date:'2024-05-10',employer:"Mike's Landscaping",job:'Lawn Mowing',hours:4,rate:15,total:60,status:'paid'},
{id:'e2',date:'2024-05-17',employer:'The Hendersons',job:'House Cleaning',hours:3,rate:14,total:42,status:'paid'},
{id:'e3',date:'2024-05-24',employer:'Sarah Chen',job:'Pet Sitting',hours:5,rate:12,total:60,status:'pending'},
],
badges:['first_job','first_hire','lesson_1','verified','5_star'],
points:380,
lessonsCompleted:['first_impression','safety','communication','money'],
applications:[
{id:'a1',job:'Lawn Mowing',employer:"Mike's Landscaping",status:'accepted',date:'2024-05-01'},
{id:'a2',job:'Dog Walking',employer:'The Martinez Family',status:'pending',date:'2024-06-01'},
],
savingsGoals:[{id:'g1',name:'New Bike',target:350,saved:162,emoji:'🚲'}],
},
'parent@teenwork.demo':{
tier:'pro',
profile:{firstName:'Jamie',lastName:'Johnson',city:'Burlington',state:'Vermont',parentEmail:'parent@teenwork.demo',linkedTeens:['teen@teenwork.demo']},
controls:{approval:true,'match-notify':true,'accept-notify':true,'local-only':false,block:false,'msg-alert':true,'min-employer-rating':4,'max-distance':10,'max-weekly-hours':15},
},
'employer@teenwork.demo':{
tier:'pro',
profile:{firstName:"Mike's",lastName:'Landscaping',city:'Burlington',state:'Vermont',bizName:"Mike's Landscaping",bizType:'Landscaping',rating:4.8,reviews:12},
postedJobs:[
{id:'j1',title:'Lawn Mowing & Yard Cleanup',pay:15,payType:'hr',type:'Outdoor',minAge:14,maxHours:15,city:'Burlington',state:'Vermont',desc:'Help with weekly lawn mowing, edging, and yard cleanup. Must be reliable and bring energy.',status:'active',applicants:3},
{id:'j2',title:'Snow Shoveling - Winter Ready',pay:20,payType:'hr',type:'Outdoor',minAge:14,maxHours:10,city:'Burlington',state:'Vermont',desc:'Looking for reliable teen to help clear driveways and walkways after snowfall.',status:'active',applicants:1},
],
},
};
Object.entries(demos).forEach(([email,data])=>{
const base='tw_'+email+'_';
if(!sessionStorage.getItem(base+'demo_seeded')){
const _dSet=(k,v)=>{try{sessionStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));}catch(e){}};
if(data.tier)_dSet(base+'acct_tier',data.tier);
if(data.profile)_dSet(base+'profile',data.profile);
if(data.earnings)_dSet(base+'earnings',data.earnings);
if(data.badges)_dSet(base+'badges',data.badges);
if(data.points)_dSet(base+'points',String(data.points));
if(data.lessonsCompleted)_dSet(base+'lessons',data.lessonsCompleted);
if(data.applications)_dSet(base+'applications',data.applications);
if(data.savingsGoals)_dSet(base+'savings_goals',data.savingsGoals);
if(data.controls)_dSet(base+'controls',data.controls);
if(data.postedJobs)_dSet(base+'jobs',data.postedJobs);
sessionStorage.setItem(base+'demo_seeded','1');
}
});
}
_seedDemoAccounts();
const _origDoLogin=window.doLogin;
window.doLogin=async function(){
const emailEl=document.getElementById('li-email');
const passEl=document.getElementById('li-password');
if(!emailEl|| !passEl){if(_origDoLogin)return _origDoLogin();return;}
const email=emailEl.value.trim();
const password=passEl.value;
if(await _twAdminLogin(email,password))return;
if(typeof _origDoLogin==='function')return _origDoLogin();
};
if(typeof window.lessonsData==='undefined'){
window.lessonsData=[
{id:'first_impression',title:'Making a Great First Impression',icon:'🤝',desc:'How to introduce yourself, show up on time, and impress employers from day one.',xp:20,quiz:[{q:'What should you do when you first meet an employer?',opts:['Look at your phone','Give a firm handshake and make eye contact','Wait for them to speak first'],ans:1}]},
{id:'safety',title:'Workplace Safety Basics',icon:'🦺',desc:'Know your rights and how to stay safe on the job.',xp:20,quiz:[{q:'If a task feels unsafe, you should:',opts:['Do it anyway','Tell your employer immediately','Quit on the spot'],ans:1}]},
{id:'communication',title:'Professional Communication',icon:'💬',desc:'Texting, emailing, and talking to employers like a pro.',xp:20,quiz:[{q:'Best way to confirm a shift?',opts:['Show up and hope','Send a quick text or email the day before','Post on social media'],ans:1}]},
{id:'money',title:'Managing Your First Paycheck',icon:'💰',desc:'Taxes, savings, and making your money work for you.',xp:20,quiz:[{q:'What is a good habit with your paycheck?',opts:['Spend it all immediately','Save at least 10%','Give it all to parents'],ans:1}]},
{id:'ratings',title:'Getting 5-Star Ratings',icon:'⭐',desc:'What employers look for and how to consistently earn top marks.',xp:20,quiz:[{q:'What most affects your rating?',opts:['Your age','Reliability and attitude','How fast you work'],ans:1}]},
{id:'resume',title:'Building Your Teen Resume',icon:'📄',desc:'How to write a resume with no work experience — and make it shine.',xp:20,quiz:[{q:'What can go on a teen resume?',opts:['Only paid jobs','School activities, chores, volunteering, and skills','Nothing — you have no experience'],ans:1}]},
{id:'interview',title:'Nailing the Interview',icon:'🎤',desc:'Common questions, how to answer them, and what to wear.',xp:20,quiz:[{q:'Best answer to "Tell me about yourself":',opts:['I dunno','A short intro covering your skills and enthusiasm','Read your resume out loud'],ans:1}]},
{id:'conflict',title:'Handling Workplace Conflict',icon:'🕊️',desc:'Disagreements happen — here\'s how to handle them professionally.',xp:20,quiz:[{q:'A coworker is rude to you. Best response?',opts:['Yell back','Ignore it forever','Calmly address it or tell a supervisor'],ans:1}]},
{id:'time',title:'Time Management on the Job',icon:'⏰',desc:'Scheduling, being on time, and balancing work with school.',xp:20,quiz:[{q:'You\'re going to be late. What do you do?',opts:['Say nothing and hope','Text your employer as soon as you know','Just don\'t show up'],ans:1}]},
{id:'social_media',title:'Social Media & Your Reputation',icon:'📱',desc:'What employers can see and how to keep your online presence professional.',xp:20,quiz:[{q:'Before applying for jobs, you should:',opts:['Delete all accounts','Review your public posts for anything unprofessional','Post more to look active'],ans:1}]},
{id:'teamwork',title:'Working as Part of a Team',icon:'🤜',desc:'Collaboration, taking direction, and being the teammate everyone wants.',xp:20,quiz:[{q:'Your team is behind schedule. You should:',opts:['Focus only on your own tasks','Ask how you can help','Blame the slowest person'],ans:1}]},
{id:'references',title:'Getting Great References',icon:'📜',desc:'Who to ask, what they\'ll say, and how to keep relationships strong.',xp:20,quiz:[{q:'Best person to ask for a reference?',opts:['A friend','A former employer or teacher who knows your work','A family member'],ans:1}]},
];
}
if(typeof window.renderLessonsGrid==='undefined'||typeof renderLessonsGrid==='undefined'){
window.renderLessonsGrid=function(){
var grid=document.getElementById('lessons-grid');
if(!grid)return;
var completed=(window.userActivity&&window.userActivity.lessonsCompleted)?window.userActivity.lessonsCompleted:[];
var data=window.lessonsData||[];
var done=data.filter(function(l){return completed.indexOf(l.id)!== -1;}).length;
var doneEl=document.getElementById('lessons-done-count');
var totalEl=document.getElementById('lessons-total-count');
var barEl=document.getElementById('lessons-progress-bar');
var labelEl=document.getElementById('lessons-progress-label');
if(doneEl)doneEl.textContent=done;
if(totalEl)totalEl.textContent=data.length;
var pct=data.length?Math.round(done/data.length*100):0;
if(barEl)barEl.style.width=pct+'%';
if(labelEl)labelEl.textContent=done===data.length?'All lessons complete! 🎉':pct+'% complete — keep going!';
grid.innerHTML=data.map(function(l){
var isDone=completed.indexOf(l.id)!== -1;
return'<div class="lesson-card'+(isDone?' done':'')+'" onclick="openLesson(\''+l.id+'\')">'+
'<div class="lesson-card-top">'+
'<div style="font-size:2rem">'+l.icon+'</div>'+
'<div><div style="font-weight:700;font-size:.92rem;color:var(--text)">'+l.title+'</div>'+
'<div style="font-size:.78rem;color:var(--muted);margin-top:3px">'+l.desc+'</div></div>'+
'</div>'+
'<div class="lesson-card-bottom">'+
'<span style="font-size:.75rem;font-weight:700;color:'+(isDone?'var(--green)':'var(--amber)')+'">'+(isDone?'✅ Complete':'⚡ +'+l.xp+' XP')+'</span>'+
'<button class="btn-sm '+(isDone?'btn-approve':'btn-ai')+'" style="font-size:.72rem">'+(isDone?'Review':'Start')+'</button>'+
'</div>'+
'</div>';
}).join('');
};
}
if(typeof window.renderStreakBadge==='undefined'){
window.renderStreakBadge=function(){
var el=document.getElementById('teen-streak-badge');
if(!el)return;
var streak=(window.userActivity&&window.userActivity.streak)||0;
el.textContent=streak>0?('⚡ '+streak+' day streak'):'⚡ Start your streak!';
};
}
if(typeof window.openLesson==='undefined'){
window.openLesson=function(id){
var l=(window.lessonsData||[]).find(function(x){return x.id===id;});
if(!l)return;
var completed=(window.userActivity&&window.userActivity.lessonsCompleted)?window.userActivity.lessonsCompleted:[];
var isDone=completed.indexOf(id)!== -1;
var modal=document.getElementById('lesson-modal')||(function(){
var m=document.createElement('div');
m.id='lesson-modal';
m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem';
document.body.appendChild(m);
return m;
})();
modal.innerHTML='<div style="background:var(--card,#fff);border-radius:18px;max-width:480px;width:100%;padding:1.5rem;max-height:90vh;overflow-y:auto">'+
'<div style="font-size:2.5rem;text-align:center;margin-bottom:.5rem">'+l.icon+'</div>'+
'<h2 style="font-family:Fraunces,serif;text-align:center;color:var(--green);margin-bottom:.5rem">'+l.title+'</h2>'+
'<p style="font-size:.88rem;color:var(--text);line-height:1.65;margin-bottom:1rem">'+l.desc+'</p>'+
(l.quiz&&l.quiz[0]?'<div style="background:var(--bg,#f8f8f8);border-radius:12px;padding:1rem;margin-bottom:1rem">'+
'<div style="font-weight:700;font-size:.88rem;margin-bottom:.75rem">Quick Quiz: '+l.quiz[0].q+'</div>'+
l.quiz[0].opts.map(function(o,i){
return'<button onclick="answerLesson(\''+id+'\','+i+','+l.quiz[0].ans+')" style="display:block;width:100%;text-align:left;padding:.5rem .75rem;margin-bottom:.4rem;border-radius:8px;border:1.5px solid var(--border);background:var(--card,#fff);cursor:pointer;font-size:.85rem">'+o+'</button>';
}).join('')+
'</div>':'')+
(isDone?'<div style="text-align:center;color:var(--green);font-weight:700;margin-bottom:1rem">✅ You already completed this lesson!</div>':'')+
'<button onclick="document.getElementById(\'lesson-modal\').style.display=\'none\'" style="width:100%;padding:.6rem;border-radius:10px;border:none;background:var(--border);color:var(--text);font-weight:700;cursor:pointer">Close</button>'+
'</div>';
modal.style.display='flex';
};
}
if(typeof window.answerLesson==='undefined'){
window.answerLesson=function(id,chosen,correct){
if(chosen===correct){
if(window.userActivity){
if(!userActivity.lessonsCompleted)userActivity.lessonsCompleted=[];
if(userActivity.lessonsCompleted.indexOf(id)=== -1)userActivity.lessonsCompleted.push(id);
}
if(typeof showToast==='function')showToast('✅ Correct! Lesson complete — +20 XP','success');
if(typeof renderLessonsGrid==='function')setTimeout(renderLessonsGrid,300);
}else{
if(typeof showToast==='function')showToast('Not quite — try again!','warning');
}
document.getElementById('lesson-modal').style.display='none';
};
}
const _origRLG=window.renderLessonsGrid;
window.renderLessonsGrid=function(){
if(_origRLG)_origRLG();
var aiGrid=document.getElementById('ai-lessons-grid');
var mainGrid=document.getElementById('lessons-grid');
if(aiGrid&&mainGrid){aiGrid.innerHTML=mainGrid.innerHTML;}
var aiDone=document.getElementById('ai-lessons-done-count');
var aiTotal=document.getElementById('ai-lessons-total-count');
var aiBar=document.getElementById('ai-lessons-progress-bar');
var aiLabel=document.getElementById('ai-lessons-progress-label');
var aiDoneBadge=document.getElementById('ai-lessons-done-badge');
var doneEl=document.getElementById('lessons-done-count');
var totalEl=document.getElementById('lessons-total-count');
var barEl=document.getElementById('lessons-progress-bar');
if(doneEl&&aiDone)aiDone.textContent=doneEl.textContent;
if(totalEl&&aiTotal)aiTotal.textContent=totalEl.textContent;
if(barEl&&aiBar)aiBar.style.width=barEl.style.width;
if(aiLabel){var l=document.getElementById('lessons-progress-label');if(l)aiLabel.textContent=l.textContent;}
if(aiDoneBadge&&doneEl)aiDoneBadge.textContent=doneEl.textContent+' done';
};
window.chatAI=window.chatAI||async function(inputId,outputId){
const input=document.getElementById(inputId);
const out=document.getElementById(outputId);
if(!input|| !out)return;
const msg=input.value.trim();
if(!msg)return;
input.value='';
out.innerHTML+='<p style="background:var(--green-pale);border-radius:8px;padding:6px 10px;margin-top:6px"><strong>You:</strong> '+msg+'</p><span class="loading-dots" id="ai-dots">Thinking…</span>';
out.scrollTop=out.scrollHeight;
try{
const role=window.currentUser?.type||'user';
const system=role==='employer'
?'You are an AI compliance assistant for TeenWork employers. Help with teen labor laws, safe job descriptions, and best hiring practices. Be concise and practical.'
:role==='parent'
?'You are a helpful safety assistant for parents on TeenWork. Answer questions about teen work safety, platform features, and parental controls. Be reassuring and clear.'
:'You are an AI job coach for TeenWork, a platform for teens aged 14-17 getting their first jobs. Be encouraging, practical, and age-appropriate.';
const reply=await callAI(msg,system);
document.getElementById('ai-dots')?.remove();
out.innerHTML+='<p style="background:var(--blue-pale,#eff6ff);border-radius:8px;padding:6px 10px;margin-top:6px">🤖 <strong>AI:</strong> '+reply.replace(/\n/g,'<br>')+'</p>';
}catch(e){
document.getElementById('ai-dots')?.remove();
out.innerHTML+='<p style="color:var(--muted);margin-top:6px;font-size:.85rem">AI unavailable — try again.</p>';
}
out.scrollTop=out.scrollHeight;
};
window.quickCoach=window.quickCoach||async function(prompt){
const out=document.getElementById('teen-coach-ai');
const input=document.getElementById('teen-coach-input');
if(input)input.value='';
if(!out)return;
out.innerHTML+='<p style="background:var(--green-pale);border-radius:8px;padding:6px 10px;margin-top:6px"><strong>You:</strong> '+prompt.slice(0,80)+'…</p><span class="loading-dots" id="qc-dots">Thinking…</span>';
out.scrollTop=out.scrollHeight;
try{
const reply=await callAI(prompt,'You are an AI job coach for teens aged 14-17 on TeenWork. Be encouraging, practical, and age-appropriate.');
document.getElementById('qc-dots')?.remove();
out.innerHTML+='<p style="background:var(--blue-pale,#eff6ff);border-radius:8px;padding:6px 10px;margin-top:6px">🤖 <strong>Coach:</strong> '+reply.replace(/\n/g,'<br>')+'</p>';
}catch(e){
document.getElementById('qc-dots')?.remove();
out.innerHTML+='<p style="color:var(--muted);margin-top:6px;font-size:.85rem">AI unavailable.</p>';
}
out.scrollTop=out.scrollHeight;
};
window.empQuickAI=window.empQuickAI||async function(prompt){
const out=document.getElementById('emp-ai-chat');
const input=document.getElementById('emp-ai-input');
if(input)input.value='';
if(!out)return;
out.innerHTML+='<p style="background:var(--green-pale);border-radius:8px;padding:6px 10px;margin-top:6px"><strong>You:</strong> '+prompt.slice(0,80)+'…</p><span class="loading-dots" id="eq-dots">Thinking…</span>';
out.scrollTop=out.scrollHeight;
try{
const reply=await callAI(prompt,'You are an AI compliance assistant for employers on TeenWork who hire teens. Be concise, accurate, and reference relevant labor laws.');
document.getElementById('eq-dots')?.remove();
out.innerHTML+='<p style="background:var(--blue-pale,#eff6ff);border-radius:8px;padding:6px 10px;margin-top:6px">🤖 <strong>AI:</strong> '+reply.replace(/\n/g,'<br>')+'</p>';
}catch(e){
document.getElementById('eq-dots')?.remove();
out.innerHTML+='<p style="color:var(--muted);margin-top:6px;font-size:.85rem">AI unavailable.</p>';
}
out.scrollTop=out.scrollHeight;
};
window.runParentSafetyCheck=window.runParentSafetyCheck||async function(){
const out=document.getElementById('p-ai-chat')||document.getElementById('parent-safety-output');
if(!out){alert('AI job guidance: all settings look good!');return;}
out.innerHTML='<span class="loading-dots">Running safety check…</span>';
try{
const reply=await callAI(
'A parent is using TeenWork to supervise their teen\'s job activities. Run a quick safety checklist covering: job type safety, employer verification, working hours compliance, payment safety, and communication monitoring. Give a short reassuring summary with any action items.',
'You are a teen work safety assistant for parents. Be clear, reassuring, and flag any real concerns.'
);
out.innerHTML='<p style="background:var(--blue-pale,#eff6ff);border-radius:8px;padding:8px 12px">🛡️ <strong>Safety Check:</strong><br>'+reply.replace(/\n/g,'<br>')+'</p>';
}catch(e){
out.innerHTML='<p style="color:var(--muted);font-size:.85rem">AI unavailable. Manually review your teen\'s active jobs and approved employers.</p>';
}
};
window.saveBioBtn=window.saveBioBtn||function(){
const bioEl=document.getElementById('acct-bio')||document.getElementById('teen-bio-field');
const val=bioEl?bioEl.value.trim():'';
if(!val){if(typeof showToast==='function')showToast('Write a bio first!','warning');return;}
if(window.userActivity)userActivity.bio=val;
if(typeof updateAIProfile==='function')updateAIProfile('bio_update',val);
if(typeof showToast==='function')showToast('✅ Bio saved!','success');
};
window._selectedRating=0;
window._ratingTargetIdx= -1;
window.openRatingModal=window.openRatingModal||function(idx){
window._ratingTargetIdx=idx;
window._selectedRating=0;
document.querySelectorAll('.star-opt').forEach(s=>s.textContent='☆');
const modal=document.getElementById('ratingModal');
if(modal)modal.classList.add('active');
};
window.closeRatingModal=window.closeRatingModal||function(){
const modal=document.getElementById('ratingModal');
if(modal)modal.classList.remove('active');
};
window.pickStar=window.pickStar||function(n){
window._selectedRating=n;
document.querySelectorAll('.star-opt').forEach(function(s,i){
s.textContent=i<n?'★':'☆';
});
};
window.submitRating=window.submitRating||function(){
const stars=window._selectedRating||0;
if(!stars){if(typeof showToast==='function')showToast('Pick a star rating first!','warning');return;}
const commentEl=document.getElementById('rating-comment');
const comment=commentEl?commentEl.value.trim():'';
if(typeof showToast==='function')showToast('⭐ Rating submitted — thanks!','success');
window.closeRatingModal();
};
window.openTerms=function(){
const modal=document.getElementById('termsModal');
if(modal)modal.classList.add('open','active');
};
window.closeTerms=function(){
const modal=document.getElementById('termsModal');
if(modal)modal.classList.remove('open','active');
};
window.agreeTermsAndClose=function(){
const cb=document.getElementById('terms-agree');
if(cb)cb.checked=true;
window.closeTerms();
};
window.closeFeelsWrong=window.closeFeelsWrong||function(){document.getElementById('feelsWrongModal')?.classList.remove('active');};
window.closeSafeWord=window.closeSafeWord||function(){document.getElementById('safeWordModal')?.classList.remove('active');};
window.closeAutoReply=window.closeAutoReply||function(){document.getElementById('autoReplyModal')?.classList.remove('active');};
window.closeReferral=window.closeReferral||function(){document.getElementById('referralModal')?.classList.remove('active');};
console.log('[TeenWork Fix] demoLogin and doLogin patched successfully.');
window.resumeChatAI=async function(){
const input=document.getElementById('teen-resume-input');
const chatBox=document.getElementById('teen-resume-ai');
if(!input|| !chatBox)return;
const msg=input.value.trim();
if(!msg)return;
input.value='';
chatBox.innerHTML+=`<p style="background:var(--green-pale,#f0fdf4);border-radius:8px;padding:5px 9px;margin-top:6px"><strong>You:</strong> ${msg}</p><span class="loading-dots">Thinking…</span>`;
chatBox.scrollTop=chatBox.scrollHeight;
try{
const bio=await callGemini(msg,
'You are an AI résumé assistant for TeenWork. A teen is describing themselves. Write a short, enthusiastic 2-3 sentence professional bio in first person based on what they tell you. Keep it friendly and age-appropriate. End with one specific strength.');
const dots=chatBox.querySelector('.loading-dots');
if(dots)dots.remove();
chatBox.innerHTML+=`<p style="margin-top:6px;background:var(--blue-pale,#eff6ff);border-radius:8px;padding:5px 9px">🤖 <strong>AI:</strong> ${bio.replace(/\n/g,'<br>')}</p>`;
window._latestAIBio=bio;
}catch(e){
const dots=chatBox.querySelector('.loading-dots');
if(dots)dots.remove();
chatBox.innerHTML+=`<p style="color:var(--muted,#888);margin-top:6px;font-size:.85rem">AI unavailable — try again shortly.</p>`;
}
chatBox.scrollTop=chatBox.scrollHeight;
};
window.useAIBio=function(){
const bio=window._latestAIBio;
if(!bio){if(typeof showToast==='function')showToast('Ask the AI to write a bio first!','warning');return;}
if(window.userActivity)userActivity.bio=bio;
if(typeof updateAIProfile==='function')updateAIProfile('bio_update',bio);
const bioEl=document.getElementById('acct-bio')||document.getElementById('teen-bio-field');
if(bioEl){bioEl.value=bio;}
if(typeof showToast==='function')showToast('✅ Bio saved to your profile!','success');
};
}
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',_run);
}else{
_run();
}
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/navfix-js.js */
try{
(function(){
'use strict';
const NAV={
teen:{
bottom:[
{icon:'🔍',label:'Jobs',tab:'ttab-browse'},
{icon:'💼',label:'Work',tab:'ttab-worklog'},
{icon:'💬',label:'Chat',action:'msg'},
{icon:'👤',label:'Account',tab:'ttab-resume'},
{icon:'☰',label:'More',action:'more'},
],
groups:[
{label:'🔍 Jobs',tabs:[['ttab-browse','Browse'],['ttab-applications','Applied'],['ttab-tracker','Pipeline'],['ttab-calendar','Calendar']]},
{label:'👤 Account',tabs:[['ttab-resume','Profile & Settings'],['ttab-portfolio','Portfolio'],['ttab-badges','Badges'],['ttab-leaderboard','Leaderboard']]},
{label:'💼 Work',tabs:[['ttab-worklog','Hours & Letters'],['ttab-earnings','Earnings'],['ttab-savings','Savings']]},
{label:'🤖 Grow',tabs:[['ttab-ai','AI Coach'],['ttab-lessons','Lessons'],['ttab-letters','Rec Letters'],['ttab-firstjob','First Job']]},
],
more:[
{section:'Jobs & Progress',items:[
{icon:'📋',label:'Applied',tab:'ttab-applications'},
{icon:'📅',label:'Calendar',tab:'ttab-calendar'},
{icon:'⏱️',label:'Hours & Letters',tab:'ttab-worklog'},
{icon:'🏅',label:'Badges',tab:'ttab-badges'},
{icon:'🎯',label:'Savings',tab:'ttab-savings'},
]},
{section:'Learning & Tools',items:[
{icon:'🤖',label:'AI Coach',tab:'ttab-ai'},
{icon:'📚',label:'Lessons',tab:'ttab-lessons'},
{icon:'📜',label:'Rec Letters',tab:'ttab-letters'},
{icon:'🛡️',label:'Verify',tab:'verify'},
]},
],
},
parent:{
bottom:[
{icon:'🏠',label:'Home',tab:'ptab-overview'},
{icon:'✅',label:'Approve',tab:'ptab-approvals'},
{icon:'🛡',label:'Safety',tab:'ptab-controls'},
{icon:'💬',label:'Chat',action:'msg'},
{icon:'☰',label:'More',action:'more'},
],
groups:[
{label:'🏠 Home',tabs:[['ptab-overview','Overview'],['ptab-approvals','Approvals'],['ptab-ratings','Ratings']]},
{label:'🛡 Safety',tabs:[['ptab-controls','Controls'],['ptab-notifications','Alerts'],['ptab-trusted','Employers saved by you']]},
{label:'📬 Updates',tabs:[['ptab-weekly','Weekly Digest'],['ptab-savings','Savings Goals']]},
{label:'👨‍👩‍👧 Family',tabs:[['ptab-teens','My Teens']]},
],
more:[
{section:'Family & Oversight',items:[
{icon:'👨‍👩‍👧',label:'My Teens',tab:'ptab-teens'},
{icon:'⭐',label:'Ratings',tab:'ptab-ratings'},
{icon:'🔔',label:'Alerts',tab:'ptab-notifications'},
{icon:'✅',label:'Saved',tab:'ptab-trusted'},
{icon:'🎯',label:'Savings',tab:'ptab-savings'},
{icon:'📬',label:'Digest',tab:'ptab-weekly'},
{icon:'📊',label:'Admin',action:'admin'},
]},
],
},
employer:{
bottom:[
{icon:'📝',label:'Post',tab:'etab-post'},
{icon:'👥',label:'Hiring',tab:'etab-applicants'},
{icon:'💬',label:'Chat',action:'msg'},
{icon:'📊',label:'Grow',tab:'etab-analytics'},
{icon:'☰',label:'More',action:'more'},
],
groups:[
{label:'📝 Pipeline',tabs:[['etab-post','Post Job'],['etab-applicants','Applicants'],['etab-active','Active']]},
{label:'💬 Comms',tabs:[['etab-ai','AI Tools'],['etab-bulkmsg','Bulk Message'],['etab-schedule','Schedule']]},
{label:'📊 Grow',tabs:[['etab-analytics','Analytics'],['etab-reviews','Reviews'],['etab-profile','Profile']]},
{label:'🛡 Trust',tabs:[['etab-bgcheck','Verification'],['etab-letters','Rec Letters']]},
],
more:[
{section:'Tools & Settings',items:[
{icon:'🤖',label:'AI Tools',tab:'etab-ai'},
{icon:'📅',label:'Schedule',tab:'etab-schedule'},
{icon:'⭐',label:'Reviews',tab:'etab-reviews'},
{icon:'📜',label:'Letters',tab:'etab-letters'},
{icon:'🛡',label:'Verify',tab:'etab-bgcheck'},
{icon:'👤',label:'Profile',tab:'etab-profile'},
]},
],
},
};
function switchTab(role,tabId){
if(!tabId)return;
if(tabId==='verify'){window.showVerifyPage&&showVerifyPage();return;}
if(tabId==='admin'){window.gotoPage&&gotoPage('admin');setTimeout(()=>window.renderAdmin&&renderAdmin(),80);return;}
if(tabId==='ttab-lessons'||tabId==='ttab-ai'){setTimeout(()=>{if(typeof renderLessonsGrid==='function')renderLessonsGrid();},100);}
const page=document.getElementById('page-'+role);
if(!page)return;
page.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
const target=document.getElementById(tabId);
if(target)target.classList.add('active');
const sub=page.querySelector('.subtab-row');
if(sub){
sub.querySelectorAll('.subtab').forEach(b=>
b.classList.toggle('active',b.dataset.tid===tabId));
}
page.querySelector('.dashboard')?.scrollTo?.(0,0);
window.scrollTo?.(0,0);
}
window.switchDashTab=function(btn,tabId){
const role=window.currentUser?.type||'teen';
switchTab(role,tabId);
};
function buildBottomNav(role){
const cfg=NAV[role];
if(!cfg)return;
const nav=document.getElementById('mobileNav');
if(!nav)return;
nav.innerHTML='<div class="mnav-inner" id="mnavInner"></div>';
const inner=nav.querySelector('.mnav-inner');
cfg.bottom.forEach((item,i)=>{
const btn=document.createElement('button');
btn.className='mnav-btn'+(i===0?' active':'')+(item.action==='msg'?' msg-btn':'');
btn.id='mnav-'+i;
btn.innerHTML=`<span class="ni">${item.icon}</span><span>${item.label}</span>`;
btn.onclick=()=>{
if(item.action==='msg'){window.openMsgModal&&openMsgModal();return;}
if(item.action==='more'){openMoreDrawer(role);return;}
switchTab(role,item.tab);
inner.querySelectorAll('.mnav-btn').forEach((b,j)=>b.classList.toggle('active',j===i));
};
inner.appendChild(btn);
});
nav.style.display='block';
}
function openMoreDrawer(role){
document.getElementById('more-drawer')?.remove();
document.getElementById('more-scrim')?.remove();
const cfg=NAV[role];
if(!cfg)return;
const scrim=document.createElement('div');
scrim.id='more-scrim';
const close=()=>{drawer.remove();scrim.remove();};
scrim.onclick=close;
document.body.appendChild(scrim);
const drawer=document.createElement('div');
drawer.id='more-drawer';
let sectionsHtml='';
cfg.more.forEach(section=>{
sectionsHtml+=`<div class="more-section-label">${section.section}</div><div class="more-grid">`;
section.items.forEach(item=>{
let onclick='';
if(item.tab)onclick=`window._navfix_go('${role}','${item.tab}')`;
else if(item.action==='dark')onclick=`window.toggleDarkMode&&toggleDarkMode()`;
const isDark=document.documentElement.classList.contains('dark');
if(item.action==='dark')item.label=isDark?'☀️ Light Mode':'🌙 Dark Mode';
else if(item.action==='admin')onclick=`window.gotoPage&&gotoPage('admin');setTimeout(()=>window.renderAdmin&&renderAdmin(),80)`;
const isUtil=item.action==='dark'||item.action==='admin';
sectionsHtml+=`<button class="more-btn${isUtil?' utility-btn':''}" onclick="${onclick};document.getElementById('more-drawer')?.remove();document.getElementById('more-scrim')?.remove()">
        <span class="mi">${item.icon}</span><span>${item.label}</span>
      </button>`;
});
sectionsHtml+='</div>';
});
drawer.innerHTML=`
    <div class="more-pill" onclick="document.getElementById('more-drawer')?.remove();document.getElementById('more-scrim')?.remove()"></div>
    <div class="more-head">
      <span class="more-head-title">More</span>
      <button onclick="document.getElementById('more-drawer')?.remove();document.getElementById('more-scrim')?.remove()"
        style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted);padding:4px">✕</button>
    </div>
    ${sectionsHtml}
    <div style="height:8px"></div>`;
document.body.appendChild(drawer);
document.addEventListener('keydown',function esc(e){
if(e.key==='Escape'){close();document.removeEventListener('keydown',esc);}
});
}
window._navfix_go=function(role,tabId){switchTab(role,tabId);};
window.openMobileMoreDrawer=function(){openMoreDrawer(window.currentUser?.type||'teen');};
function buildDesktopNav(role){
const cfg=NAV[role];
if(!cfg)return;
const page=document.getElementById('page-'+role);
if(!page)return;
page.querySelectorAll('#parent-desktop-tabs,#teen-desktop-tabs,#employer-desktop-tabs,.grp-tabs,.subtab-row').forEach(el=>el.remove());
const dash=page.querySelector('.dashboard');
const header=dash?.querySelector('.dash-header');
if(!header)return;
const grpEl=document.createElement('div');
grpEl.className='grp-tabs';
grpEl.innerHTML=cfg.groups.map((g,i)=>
`<button class="grp-tab${i===0?' active':''}" data-gi="${i}">${g.label}</button>`).join('');
const subEl=document.createElement('div');
subEl.className='subtab-row';
header.insertAdjacentElement('afterend',grpEl);
grpEl.insertAdjacentElement('afterend',subEl);
function showGroup(gi){
const g=cfg.groups[gi];
grpEl.querySelectorAll('.grp-tab').forEach((b,i)=>b.classList.toggle('active',i===gi));
subEl.innerHTML=g.tabs.map(([tid,label],i)=>
`<button class="subtab${i===0?' active':''}" data-tid="${tid}">${label}</button>`).join('');
subEl.querySelectorAll('.subtab').forEach(b=>{
b.onclick=()=>{
subEl.querySelectorAll('.subtab').forEach(x=>x.classList.remove('active'));
b.classList.add('active');
switchTab(role,b.dataset.tid);
};
});
if(g.tabs[0])switchTab(role,g.tabs[0][0]);
}
grpEl.querySelectorAll('.grp-tab').forEach((b,i)=>b.onclick=()=>showGroup(i));
showGroup(0);
}
function initNav(role){
if(!NAV[role])return;
const pg=document.getElementById('page-'+role);
if(pg)pg.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
buildBottomNav(role);
buildDesktopNav(role);
}
window.buildNavTabs=initNav;
const _origGoto=window.gotoPage;
window.gotoPage=function(page){
_origGoto&&_origGoto(page);
};
const _origLaunch=window.launchDashboard;
window.launchDashboard=function(){
try{_origLaunch&&_origLaunch.apply(this,arguments);}catch(e){}
const role=window.currentUser?.type;
if(role&&NAV[role])setTimeout(()=>initNav(role),80);
};
function boot(){
const role=window.currentUser?.type;
if(role&&NAV[role])initNav(role);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-11.js */
try{
window.openMobileMoreDrawer=function(){
const role=window.currentUser?.type||'teen';
document.getElementById('mobile-more-drawer')?.remove();
document.getElementById('mobile-more-scrim')?.remove();
if(window._openMoreDrawer){window._openMoreDrawer(role);return;}
const navBtn=document.querySelector('#mnavInner .mnav-btn:last-child');
if(navBtn){navBtn.click();}
};
(function patchMoreRef(){
const _newDrawer=window.openMobileMoreDrawer;
window.openMobileMoreDrawer=function(){
document.getElementById('mobile-more-drawer')?.remove();
document.getElementById('mobile-more-scrim')?.remove();
const role=window.currentUser?.type||'teen';
const inner=document.getElementById('mnavInner');
if(inner){
const btns=inner.querySelectorAll('.mnav-btn');
const moreBtn=Array.from(btns).find(b=>b.textContent.includes('More'));
if(moreBtn){moreBtn.click();return;}
}
if(_newDrawer)_newDrawer();
};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-12.js */
try{
(function v14(){
'use strict';
function _fixAuthButtons(){
document.querySelectorAll('button,a[onclick]').forEach(el=>{
const oc=el.getAttribute('onclick')||'';
if(/gotoPage\('(signup|login)'\)/.test(oc)){
const target=oc.match(/gotoPage\('(signup|login)'\)/)?.[1];
if(!target)return;
el.addEventListener('click',function(e){
e.preventDefault();
if(typeof window.gotoPage==='function'){
window.gotoPage(target);
}else{
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
document.getElementById('page-'+target)?.classList.add('active');
}
});
}
});
}
const _origDoLogin=window.doLogin;
window.doLogin=async function(){
const emailEl=document.getElementById('li-email');
const passEl=document.getElementById('li-password');
if(!emailEl|| !passEl){if(_origDoLogin)return _origDoLogin.apply(this,arguments);return;}
const email=emailEl.value.trim().toLowerCase();
const pass=passEl.value;
if(await _twAdminLogin(email,pass))return;
if(_origDoLogin)return _origDoLogin.apply(this,arguments);
};
const _origInitPlan=window._initSignupPlan;
window._initSignupPlan=function(){
if(_origInitPlan)_origInitPlan.apply(this,arguments);
const cfg=typeof _adminGetConfig==='function'?_adminGetConfig():{};
const notice=document.getElementById('su-plan-notice');
const proPrice=document.getElementById('su-plan-pro-price');
const freeRadio=document.querySelector('input[name="su-plan"][value="free"]');
const proRadio=document.querySelector('input[name="su-plan"][value="pro"]');
if(freeRadio){
freeRadio.checked=true;
document.getElementById('su-plan-free-card').style.borderColor='var(--green)';
if(document.getElementById('su-plan-pro-card'))document.getElementById('su-plan-pro-card').style.borderColor='var(--border)';
}
if(!cfg.launchPaid){
if(proPrice)proPrice.textContent='FREE — all features included';
if(notice){
notice.style.display='block';
notice.innerHTML=`🧪 <strong>TeenWork is still in testing — Pro is completely free!</strong><br>
        <span style="font-size:.75rem;font-weight:400;line-height:1.5;display:block;margin-top:3px">The app is still being tested. Pro is free for everyone. If a paid plan is ever added, you'll get a <strong>10-day email notice</strong> to switch to Free or add a payment method. No surprise charges, ever.</span>`;
}
}
};
const _sigPage=document.getElementById('page-signup');
if(_sigPage){
new MutationObserver(()=>{
if(_sigPage.classList.contains('active'))setTimeout(window._initSignupPlan,50);
}).observe(_sigPage,{attributes:true,attributeFilter:['class']});
}
const LESSON_CONTENT={
first_impression:{
sections:[
{title:'Why First Impressions Matter',text:'Employers make a judgment about you within the first 30 seconds. A good first impression can get you the job; a bad one is almost impossible to undo.'},
{title:'What to Do',text:'• Show up 5 minutes early (never late)\n• Give a firm handshake and make eye contact\n• Smile and say your name clearly\n• Dress one step nicer than you think you need to'},
{title:'What NOT to Do',text:'• Check your phone during the meeting\n• Mumble or look at the floor\n• Bring a friend unless asked\n• Smell like food, smoke, or body odor'},
],
tip:'💡 Pro tip: Before you meet an employer, practice saying "Hi, I\'m [name], thanks for meeting with me" out loud at home until it feels natural.'
},
safety:{
sections:[
{title:'Your Safety Rights',text:'As a teen worker you have legal rights. You CANNOT be asked to do work that is dangerous for your age. You can always say "I don\'t feel safe doing that."'},
{title:'Common Hazards',text:'• Heavy equipment — you likely cannot legally operate it\n• Working alone at night — should always have adult nearby\n• Chemicals — must have proper training and safety gear\n• Heights — requires proper equipment'},
{title:'What to Do If You Feel Unsafe',text:'Tell your employer immediately. If they ignore you, contact your parent and if needed the Department of Labor. You will never be fired legally for reporting a safety concern.'},
],
tip:'💡 Know the number: US Dept of Labor child labor violations hotline: 1-866-4-US-WAGE (1-866-487-9243)'
},
communication:{
sections:[
{title:'Professional vs Casual',text:'Texting your friends and texting your boss are completely different. Employers expect professional language — no slang, no emojis in work messages, no "k" or "lol".'},
{title:'The Golden Rules',text:'• Always confirm shifts the day before\n• Reply within 24 hours (not days)\n• Proofread before you send\n• If you can\'t make it, tell them ASAP — not the morning of'},
{title:'Sample Messages',text:'Good: "Hi Mike, just confirming I\'ll be there at 9am tomorrow. See you then!"\n\nBad: "hey r we still doing tmrw lol"'},
],
tip:'💡 When in doubt, read your message out loud. If it sounds weird, fix it.'
},
money:{
sections:[
{title:'Your First Paycheck',text:'You worked hard for that money! But taxes come out first. Federal income tax, and sometimes state tax, gets withheld. Don\'t panic — you may get some back as a refund.'},
{title:'The 50/30/20 Rule (Teen Version)',text:'• 50% for things you need or really want\n• 30% into savings (car, college, goals)\n• 20% for emergencies or investing\nEven saving $20/week = $1,040/year.'},
{title:'Avoid These Money Mistakes',text:'• Spending your whole check immediately\n• Lending money to friends\n• Buying stuff just to flex\n• No budget = no idea where it went'},
],
tip:'💡 Open a savings account NOW. Even $100 sitting there makes you feel different about money.'
},
ratings:{
sections:[
{title:'Why Ratings Matter',text:'On TeenWork, your rating follows you. A 5-star teen gets more interviews, better jobs, and letters of recommendation. A 2-star teen gets skipped.'},
{title:'How to Get 5 Stars',text:'• Show up on time, every time\n• Do a little more than asked\n• Ask "Is there anything else I can help with?"\n• Say thank you at the end of every shift\n• Follow up: "Let me know if everything looks good!"'},
{title:'Common Rating Killers',text:'• Being late without notice\n• Using your phone during work\n• Doing minimum effort\n• Not communicating schedule changes'},
],
tip:'💡 Think of every job as a free audition. Employers talk to each other.'
},
resume:{
sections:[
{title:'Teen Resume Reality',text:'You don\'t need paid work experience for a teen resume. Babysitting, mowing your neighbor\'s lawn, helping at a church, school clubs — all of it counts.'},
{title:'What to Include',text:'• Contact info (email + phone)\n• Skills (be specific: "mow, edge, and blow clippings" not just "yard work")\n• Experience (any kind — paid or unpaid)\n• School activities, sports, volunteering\n• A short objective statement'},
{title:'Format Tips',text:'• Keep it to ONE page\n• Use a clean, readable font\n• No photos\n• Save as PDF before sending\n• Name the file: FirstLast_Resume.pdf'},
],
tip:'💡 Use the AI Resume Builder in this app — it builds a real formatted resume in 2 minutes.'
},
interview:{
sections:[
{title:'The 3 Things Employers Want',text:'1. Will you show up reliably?\n2. Will you do the job without constant supervision?\n3. Are you pleasant to be around?\n\nYour answers need to show all three.'},
{title:'Common Questions + Answers',text:'"Tell me about yourself" → Name, age, 1-2 skills, why you want this specific job.\n\n"What\'s your weakness?" → Pick a REAL weakness you\'re working on. Never say "I work too hard."\n\n"Why do you want this job?" → Be specific. "I love dogs" for a pet sitting job is great.'},
{title:'After the Interview',text:'Send a thank-you text or email within 24 hours: "Thanks for taking the time to meet with me today — I\'m really excited about this opportunity!"'},
],
tip:'💡 Practice answering "Tell me about yourself" in the mirror until you can do it in 30 seconds without "um".'
},
conflict:{
sections:[
{title:'Conflict Is Normal',text:'Even in the best jobs, things go wrong. A customer complains. A coworker is rude. An employer asks for something unfair. How you handle it is what defines you as a professional.'},
{title:'The Response Framework',text:'1. Stay calm — do NOT react immediately\n2. Listen fully before responding\n3. Use "I" statements: "I felt..." not "You always..."\n4. Suggest a solution, not just a complaint\n5. If unresolved, go one level up (parent, HR, etc.)'},
{title:'When to Escalate',text:'If the conflict involves something illegal (harassment, unsafe work, not getting paid) — involve your parent and TeenWork support immediately. Do not try to handle it alone.'},
],
tip:'💡 The phrase "I understand your frustration — here\'s what I can do" defuses almost any situation.'
},
time:{
sections:[
{title:'Time Blocking for Teens',text:'School + homework + sports + work sounds impossible. The key is planning ahead, not hoping it works out. Every Sunday, map the whole week.'},
{title:'Work-Life-School Balance',text:'• School is always #1\n• Max hours for teens during school year: 18/week in most states\n• Build buffer time — jobs often run long\n• Communicate schedule BEFORE accepting, not after'},
{title:'If Something Comes Up',text:'• Tell your employer as early as possible\n• Offer to find a replacement if you can\n• Never just ghost a shift — it permanently damages your reputation'},
],
tip:'💡 Put every shift in your phone calendar the moment you accept it. Use reminders.'
},
social_media:{
sections:[
{title:'Employers Google You',text:'Before hiring you, most employers will search your name online. Whatever is public is fair game. A single bad post can cost you the job.'},
{title:'What to Check Right Now',text:'• Google yourself — what comes up?\n• Check your Instagram/TikTok public posts\n• Remove anything that shows drug use, violence, or extreme language\n• Make accounts private if you\'re not sure'},
{title:'Use Social Media as an Advantage',text:'• LinkedIn is free and makes teens look serious\n• Posting about community service or hobbies looks great\n• Following a business before applying shows initiative'},
],
tip:'💡 The rule: never post anything you wouldn\'t want a grandparent or future employer to see.'
},
teamwork:{
sections:[
{title:'Why Teamwork Skills Pay Off',text:'Employers always rank "works well with others" in the top 3 traits they look for. Even solo jobs (lawn care, pet sitting) involve working with clients and family members.'},
{title:'Being the Teammate Everyone Wants',text:'• Do your share without being asked\n• Give credit to others publicly\n• Speak up if you see a problem\n• Never blame teammates to supervisors'},
{title:'Handling Difficult Teammates',text:'• Don\'t gossip — it always gets back to them\n• Address issues directly and privately first\n• Focus on the behavior, not the person\n• If it continues, bring it to your employer professionally'},
],
tip:'💡 The best team players make everyone around them look good. That\'s what gets you recommended.'
},
references:{
sections:[
{title:'Why References Matter',text:'A single strong reference from a real employer is worth more than any grade or award. Colleges and future jobs take references seriously.'},
{title:'Who to Ask',text:'• Former or current employers (best)\n• Teachers or coaches who know your work ethic\n• Community or religious leaders\n• NOT: friends, family, or people who don\'t know your work'},
{title:'How to Ask',text:'1. Ask in person or via phone (not text)\n2. Ask: "Would you be comfortable giving me a strong reference?"\n3. The word "strong" matters — it lets them opt out politely\n4. Give them time and a copy of your resume'},
],
tip:'💡 Always send a thank-you note after someone gives you a reference. It makes them want to help you again.'
},
};
window.openLesson=function(id){
const lessons=window.lessonsData||[];
const l=lessons.find(x=>x.id===id);
if(!l)return;
const content=LESSON_CONTENT[id]||null;
const completed=(window.userActivity?.lessonsCompleted)||[];
const isDone=completed.includes(id);
let modal=document.getElementById('v14-lesson-modal');
if(!modal){
modal=document.createElement('div');
modal.id='v14-lesson-modal';
modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:none;align-items:center;justify-content:center;padding:1rem';
modal.onclick=e=>{if(e.target===modal)modal.style.display='none';};
document.body.appendChild(modal);
}
const sectionsHtml=content?content.sections.map(s=>
`<div class="v14-lesson-section">${s.title}</div>
     <div style="font-size:.86rem;line-height:1.7;color:var(--text);white-space:pre-line">${s.text}</div>`
).join(''):`<p style="font-size:.88rem;color:var(--text);line-height:1.7">${l.desc}</p>`;
const tipHtml=content?.tip?`<div class="v14-lesson-tip">${content.tip}</div>`:'';
const quizHtml=l.quiz&&l.quiz[0]?`
    <div style="background:var(--bg);border-radius:12px;padding:1rem;margin-bottom:1rem">
      <div style="font-weight:700;font-size:.88rem;margin-bottom:.75rem;color:var(--text)">🧠 Quick Quiz: ${l.quiz[0].q}</div>
      ${l.quiz[0].opts.map((o,i)=>
`<button onclick="v14AnswerLesson('${id}',${i},${l.quiz[0].ans})" style="display:block;width:100%;text-align:left;padding:9px 12px;margin-bottom:6px;border-radius:10px;border:1.5px solid var(--border);background:var(--card,#fff);cursor:pointer;font-size:.85rem;font-family:'DM Sans',sans-serif;transition:border-color .15s" onmouseover="this.style.borderColor='var(--green)'" onmouseout="this.style.borderColor='var(--border)'">
          <span style="font-weight:700;color:var(--green);margin-right:6px">${String.fromCharCode(65+i)}.</span>${o}
        </button>`
).join('')}
    </div>`:'';
modal.innerHTML=`
    <div style="background:var(--card,#fff);border-radius:18px;max-width:520px;width:100%;padding:1.6rem;max-height:90vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:2rem">${l.icon}</span>
          <div>
            <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Lesson ${lessons.indexOf(l)+1} of ${lessons.length}</div>
            <h2 style="font-family:'Fraunces',serif;font-size:1.05rem;color:var(--green);margin:2px 0 0">${l.title}</h2>
          </div>
        </div>
        <button onclick="document.getElementById('v14-lesson-modal').style.display='none'" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--muted);padding:0 4px;line-height:1">✕</button>
      </div>
      ${isDone?'<div style="background:var(--green-pale);border-radius:8px;padding:7px 12px;font-size:.82rem;font-weight:700;color:var(--green);margin-bottom:.75rem">✅ You already completed this lesson! You can review it anytime.</div>':''}
      <div class="v14-lesson-content">${sectionsHtml}</div>
      ${tipHtml}
      ${quizHtml}
      ${isDone?'':'<p style="font-size:.78rem;color:var(--muted);text-align:center;margin-bottom:.75rem">Answer the quiz correctly to earn +'+l.xp+' XP and mark this lesson complete!</p>'}
      <button onclick="document.getElementById('v14-lesson-modal').style.display='none'" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--border);color:var(--text);font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif">Close</button>
    </div>`;
modal.style.display='flex';
};
window.v14AnswerLesson=function(id,chosen,correct){
if(chosen===correct){
if(window.userActivity){
if(!userActivity.lessonsCompleted)userActivity.lessonsCompleted=[];
if(!userActivity.lessonsCompleted.includes(id)){
userActivity.lessonsCompleted.push(id);
const l=(window.lessonsData||[]).find(x=>x.id===id);
if(typeof awardBadge==='function'&&l)awardBadge('lesson_1');
if(window.teenGameState&&l)teenGameState.points=(teenGameState.points||0)+(l.xp||20);
}
}
document.getElementById('v14-lesson-modal').style.display='none';
if(typeof showToast==='function')showToast('✅ Correct! +'+((window.lessonsData||[]).find(x=>x.id===id)?.xp||20)+' XP earned!','success');
if(typeof renderLessonsGrid==='function')setTimeout(renderLessonsGrid,200);
}else{
if(typeof showToast==='function')showToast('Not quite — try again!','info');
}
};
const _origNAV=window.NAV;
if(window.NAV?.teen){
window.NAV.teen.bottom=[
{icon:'🔍',label:'Jobs',tab:'ttab-browse'},
{icon:'💼',label:'Work',action:'work'},
{icon:'💬',label:'Chat',action:'msg'},
{icon:'👤',label:'Me',tab:'ttab-resume'},
{icon:'☰',label:'More',action:'more'},
];
window.NAV.teen.more=[
{section:'Progress & Achievements',items:[
{icon:'🏅',label:'Badges',tab:'ttab-badges'},
{icon:'🏆',label:'Leaderboard',tab:'ttab-leaderboard'},
{icon:'🗂️',label:'Portfolio',tab:'ttab-portfolio'},
{icon:'🛡️',label:'Verify',tab:'verify'},
]},
{section:'Learning',items:[
{icon:'📚',label:'Lessons',tab:'ttab-lessons'},
{icon:'🎯',label:'First Job',tab:'ttab-firstjob'},
{icon:'📜',label:'Rec Letters',tab:'ttab-letters'},
]},
];
}
const _origBBN=window.buildBottomNav;
window.buildBottomNav=function(role){
if(_origBBN)_origBBN.apply(this,arguments);
if(role!=='teen')return;
setTimeout(()=>{
const inner=document.getElementById('mnavInner');
if(!inner)return;
const btns=inner.querySelectorAll('.mnav-btn');
btns.forEach(btn=>{
if(btn.textContent.includes('Work')){
btn.onclick=()=>_openWorkPicker();
}
});
},50);
};
function _openWorkPicker(){
document.getElementById('v14-work-picker')?.remove();
document.getElementById('v14-work-scrim')?.remove();
const WORK_ITEMS=[
{icon:'⏱️',label:'Hours & Work Log',tab:'ttab-worklog'},
{icon:'📅',label:'Calendar',tab:'ttab-calendar'},
{icon:'📊',label:'App Tracker',tab:'ttab-tracker'},
{icon:'💰',label:'Earnings',tab:'ttab-earnings'},
{icon:'🎯',label:'Savings Goals',tab:'ttab-savings'},
{icon:'⭐',label:'My References',tab:'ttab-references'},
];
const scrim=document.createElement('div');
scrim.id='v14-work-scrim';
scrim.style.cssText='position:fixed;inset:0;z-index:499;background:rgba(0,0,0,.35)';
scrim.onclick=()=>{picker.remove();scrim.remove();};
document.body.appendChild(scrim);
const picker=document.createElement('div');
picker.id='v14-work-picker';
picker.style.cssText='position:fixed;bottom:72px;left:0;right:0;z-index:500;background:var(--card);border-radius:18px 18px 0 0;padding:1rem;box-shadow:0 -8px 32px rgba(0,0,0,.18);animation:slideUp .22s cubic-bezier(.32,1,.22,1);font-family:"DM Sans",sans-serif';
picker.innerHTML=`
    <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
    <div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 12px;cursor:pointer" onclick="document.getElementById('v14-work-picker')?.remove();document.getElementById('v14-work-scrim')?.remove()"></div>
    <div style="font-family:'Fraunces',serif;font-size:.95rem;font-weight:700;color:var(--green);margin-bottom:12px;padding:0 4px">💼 Work & Earnings</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${WORK_ITEMS.map(item=>`
        <button onclick="switchTab('teen','${item.tab}');document.getElementById('v14-work-picker')?.remove();document.getElementById('v14-work-scrim')?.remove()" style="background:var(--bg);border:1.5px solid var(--border);border-radius:12px;padding:12px 6px 10px;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;flex-direction:column;align-items:center;gap:5px;transition:background .12s;font-size:.72rem;font-weight:700;color:var(--text)">
          <span style="font-size:1.4rem">${item.icon}</span>
          <span style="text-align:center;line-height:1.2">${item.label}</span>
        </button>`).join('')}
    </div>
  `;
document.body.appendChild(picker);
}
const _origOpenSup=window.openSupportModal;
window.openSupportModal=function(context,detail){
var worked=false;
try{
if(_origOpenSup){_origOpenSup.apply(this,arguments);worked=true;}
}catch(e){worked=false;}
if(worked)return;
document.getElementById('tw-sup-fallback')?.remove();
var ov=document.createElement('div');
ov.id='tw-sup-fallback';
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:"DM Sans",system-ui,sans-serif;overflow-y:auto';
ov.innerHTML=`
  <div style="background:#fff;border-radius:24px;padding:0;max-width:520px;width:100%;box-shadow:0 32px 80px rgba(0,0,0,.35);max-height:92vh;overflow-y:auto;animation:twSupSlide .22s ease">
  <style>
    @keyframes twSupSlide{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
    .tw-sup-chip{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:20px;border:1.5px solid #d1fae5;background:#f0fdf4;color:#2d6a4f;font-size:.78rem;font-weight:700;cursor:pointer;transition:all .15s;margin:3px}
    .tw-sup-chip.active,.tw-sup-chip:hover{background:#2d6a4f;color:#fff;border-color:#2d6a4f}
    .tw-sup-inp{width:100%;padding:10px 13px;border:1.5px solid #e5e7eb;border-radius:10px;font-family:inherit;font-size:.9rem;outline:none;box-sizing:border-box;transition:border-color .2s;line-height:1.5}
    .tw-sup-inp:focus{border-color:#2d6a4f}
    .tw-sup-faq{border:1.5px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:1rem}
    .tw-sup-faq-item{border-bottom:1px solid #f3f4f6}
    .tw-sup-faq-item:last-child{border-bottom:none}
    .tw-sup-faq-q{width:100%;text-align:left;background:none;border:none;padding:11px 14px;font-size:.82rem;font-weight:700;color:#1f2937;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-family:inherit}
    .tw-sup-faq-q:hover{background:#f9fafb}
    .tw-sup-faq-a{display:none;padding:0 14px 11px;font-size:.8rem;color:#6b7280;line-height:1.6}
    .tw-sup-faq-a.open{display:block}
    .tw-sup-pri{display:flex;gap:6px;margin-bottom:1rem}
    .tw-sup-pri-btn{flex:1;padding:8px 6px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;font-size:.75rem;font-weight:700;cursor:pointer;text-align:center;transition:all .15s}
    .tw-sup-pri-btn.active{border-color:#2d6a4f;background:#f0fdf4;color:#2d6a4f}
  </style>

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1b4332,#2d6a4f);padding:1.4rem 1.6rem;border-radius:24px 24px 0 0;display:flex;align-items:center;gap:12px">
    <div style="width:46px;height:46px;background:rgba(255,255,255,.18);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">💬</div>
    <div style="flex:1">
      <div style="font-size:1.1rem;font-weight:800;color:#fff">Help & Support</div>
      <div style="font-size:.78rem;color:rgba(255,255,255,.75);margin-top:2px">TeenWork team · usually replies within a few hours</div>
    </div>
    <button id="tw-sup-x" style="background:rgba(255,255,255,.15);border:none;border-radius:10px;width:34px;height:34px;font-size:1.2rem;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
  </div>

  <div style="padding:1.4rem 1.6rem">

    <!-- AI Help Bot -->
    <div style="font-size:.78rem;font-weight:800;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.6rem">🤖 Ask the AI Assistant</div>
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:1rem;margin-bottom:1rem;">
      <div id="tw-ai-chat-log" style="max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:10px;"></div>
      <div style="display:flex;gap:6px;">
        <input id="tw-ai-chat-inp" class="tw-sup-inp" type="text" placeholder="Ask anything — e.g. how do I apply for a job?" style="flex:1;font-size:.85rem;padding:8px 11px;">
        <button id="tw-ai-chat-send" style="background:#2d6a4f;color:#fff;border:none;padding:8px 14px;border-radius:9px;font-size:.82rem;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;">Ask ↵</button>
      </div>
      <div style="font-size:.7rem;color:#6b7280;margin-top:6px;">Powered by TeenWork AI · Can't solve it? Send us a message below 👇</div>
    </div>

    <!-- Quick FAQ -->
    <div style="font-size:.78rem;font-weight:800;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.6rem">Common Questions</div>
    <div class="tw-sup-faq">
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">How do I sign up as a teen? <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Tap Sign Up on the home screen, choose <strong>Teen Worker</strong>, fill in your details and have a parent verify your age. You'll be ready to apply for jobs right away.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">What does Pro include? <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Pro includes more AI (up to 500 requests a day), the AI Resume Builder, AI Job Coach, Pitch AI and the Wage Coach. AI safety checks on messages are on for everyone, free or Pro. See the plans page for prices.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">I'm a parent — how do I verify my teen? <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Choose <strong>Parent / Guardian</strong> on the sign-up screen. You'll be able to verify your teen's account and manage their job application permissions from your dashboard.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">How do I post a job as an employer? <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Sign up as an <strong>Employer</strong>, complete your profile, then tap <em>Post a Job</em>. All job posts are reviewed for teen-safety compliance before going live.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">My account is locked / I can't log in <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Try clearing your browser cache and reloading. If you still can't log in, send us a message below and we'll unlock your account manually within a few hours.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">I didn't get my verification email <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Check your <strong>spam or junk folder</strong> first — it sometimes ends up there. If it's not there after a few minutes, try signing up again or contact support below.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">The AI isn't working / I hit my limit <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Free plan users get <strong>10 AI requests per day</strong>, which resets at midnight. If you're hitting the limit regularly, upgrading to Pro gives you unlimited requests for free during launch.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">My message was blocked by the safety filter <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">The AI safety filter sometimes catches messages by mistake. If you think your message was incorrectly blocked, rephrase it or contact support below with details and we'll review it.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">How do teens get paid? <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Payment is arranged directly between the teen and employer — TeenWork doesn't take a cut. Common methods are cash, Venmo, or check. Always agree on payment before starting a job.</div>
      </div>
      <div class="tw-sup-faq-item">
        <button class="tw-sup-faq-q" onclick="var a=this.nextElementSibling;a.classList.toggle('open');this.querySelector('.tw-arr').textContent=a.classList.contains('open')?'▲':'▼'">Something looks broken or isn't loading <span class="tw-arr">▼</span></button>
        <div class="tw-sup-faq-a">Try <strong>refreshing the page</strong> (pull down on mobile, or press F5 on desktop). If the problem persists, clear your browser cache or try a different browser, then contact us below.</div>
      </div>
    </div>

    <!-- Divider -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem">
      <div style="flex:1;height:1px;background:#e5e7eb"></div>
      <span style="font-size:.76rem;color:#9ca3af;font-weight:700">OR SEND US A MESSAGE</span>
      <div style="flex:1;height:1px;background:#e5e7eb"></div>
    </div>

    <!-- Topic chips -->
    <div style="font-size:.78rem;font-weight:800;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.5rem">What's this about?</div>
    <div style="margin-bottom:1rem" id="tw-sup-chips">
      <span class="tw-sup-chip active" onclick="twSupChip(this)">🔐 Login / Account</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">💼 Jobs & Applying</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">🤖 AI Features</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">💳 Pro / Billing</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">👨‍👩‍👧 Parent Verify</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">🐛 Bug / Error</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">💡 Suggestion</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">🛡️ Safety Concern</span>
      <span class="tw-sup-chip" onclick="twSupChip(this)">❓ Other</span>
    </div>

    <!-- Priority -->
    <div style="font-size:.78rem;font-weight:800;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.5rem">Priority</div>
    <div class="tw-sup-pri" style="margin-bottom:1rem">
      <button class="tw-sup-pri-btn" onclick="twSupPri(this)">🟢 Low<br><span style="font-weight:400;font-size:.7rem">No rush</span></button>
      <button class="tw-sup-pri-btn active" onclick="twSupPri(this)">🟡 Normal<br><span style="font-weight:400;font-size:.7rem">We'll reply soon</span></button>
      <button class="tw-sup-pri-btn" onclick="twSupPri(this)">🔴 Urgent<br><span style="font-weight:400;font-size:.7rem">Can't use app</span></button>
    </div>

    <!-- Name only -->
    <div style="margin-bottom:1rem">
      <label style="font-size:.78rem;font-weight:700;color:#374151;display:block;margin-bottom:4px">Your name <span style="color:#9ca3af;font-weight:400">(optional)</span></label>
      <input id="tw-sup-name" class="tw-sup-inp" type="text" placeholder="e.g. Alex">
    </div>

    <!-- Message -->
    <div style="margin-bottom:1rem">
      <label style="font-size:.78rem;font-weight:700;color:#374151;display:block;margin-bottom:4px">Describe your issue <span style="color:#ef4444">*</span></label>
      <textarea id="tw-sup-msg" class="tw-sup-inp" rows="5" placeholder="Tell us what happened, what you were trying to do, and what you expected… The more detail, the faster we can help."></textarea>
      <div id="tw-sup-chars" style="font-size:.72rem;color:#9ca3af;text-align:right;margin-top:3px">0 / 1000</div>
    </div>

    <!-- Buttons -->
    <div style="display:flex;gap:8px">
      <button id="tw-sup-send" style="flex:1;background:linear-gradient(135deg,#1b4332,#2d6a4f);color:#fff;border:none;padding:14px;border-radius:12px;font-size:.95rem;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">
        📨 Send to Support
      </button>
      <button id="tw-sup-cancel" style="padding:14px 18px;border-radius:12px;border:1.5px solid #e5e7eb;background:#f9fafb;font-size:.9rem;cursor:pointer;color:#374151;font-weight:600;font-family:inherit">Cancel</button>
    </div>
    <p style="font-size:.72rem;color:#9ca3af;margin-top:.8rem;text-align:center;margin-bottom:0">Your message goes directly to the TeenWork admin team</p>
  </div>
  </div>`;
document.body.appendChild(ov);
window.twSupChip=function(el){
ov.querySelectorAll('.tw-sup-chip').forEach(function(c){c.classList.remove('active');});
el.classList.add('active');
};
window.twSupPri=function(el){
ov.querySelectorAll('.tw-sup-pri-btn').forEach(function(b){b.classList.remove('active');});
el.classList.add('active');
};
var msgEl=ov.querySelector('#tw-sup-msg');
var charsEl=ov.querySelector('#tw-sup-chars');
msgEl.addEventListener('input',function(){
var n=Math.min(this.value.length,1000);
this.value=this.value.slice(0,1000);
charsEl.textContent=n+' / 1000';
charsEl.style.color=n>800?'#ef4444':'#9ca3af';
});
function _rm(){ov.remove();}
ov.querySelector('#tw-sup-x').onclick=_rm;
ov.querySelector('#tw-sup-cancel').onclick=_rm;
ov.addEventListener('click',function(e){if(e.target===ov)_rm();});
ov.querySelector('#tw-sup-send').onclick=function(){
var msg=(ov.querySelector('#tw-sup-msg').value||'').trim();
if(!msg){ov.querySelector('#tw-sup-msg').style.borderColor='#ef4444';ov.querySelector('#tw-sup-msg').focus();return;}
var topic=(ov.querySelector('.tw-sup-chip.active')||{}).textContent||'General';
var priority=(ov.querySelector('.tw-sup-pri-btn.active')||{}).textContent||'Normal';
var name=ov.querySelector('#tw-sup-name').value||'Anonymous';
var body='Topic: '+topic+'\nPriority: '+priority.replace(/\n.*/,'')
+(name?'\nName: '+name:'')
+'\n\n'+msg;
if(typeof _adminSaveSupportMessage==='function'){
_adminSaveSupportMessage({name:name,context:topic,body:msg,email:(window.currentUser?.email||'unknown'),userType:(window.currentUser?.type||'visitor'),time:new Date().toISOString()});
}
ov.querySelector('#tw-sup-send').textContent='✅ Message sent!';
ov.querySelector('#tw-sup-send').style.background='#065f46';
setTimeout(_rm,2200);
};
var _aiLog=ov.querySelector('#tw-ai-chat-log');
var _aiInp=ov.querySelector('#tw-ai-chat-inp');
var _aiSend=ov.querySelector('#tw-ai-chat-send');
function _aiAddMsg(text,from){
var bubble=document.createElement('div');
bubble.style.cssText='padding:7px 11px;border-radius:10px;font-size:.8rem;line-height:1.55;max-width:85%;word-wrap:break-word;'+
(from==='user'
?'background:#2d6a4f;color:#fff;align-self:flex-end;border-bottom-right-radius:3px;'
:'background:#fff;color:#1c1c1c;border:1px solid #e5e7eb;align-self:flex-start;border-bottom-left-radius:3px;');
bubble.textContent=text;
_aiLog.appendChild(bubble);
_aiLog.scrollTop=_aiLog.scrollHeight;
}
_aiAddMsg('👋 Hi! I\'m the TeenWork AI. Ask me anything about the app and I\'ll try to help before you need to contact support.','bot');
async function _aiAsk(){
var q=(_aiInp.value||'').trim();
if(!q)return;
_aiInp.value='';
_aiAddMsg(q,'user');
_aiSend.disabled=true;
_aiSend.textContent='…';
var thinking=document.createElement('div');
thinking.style.cssText='padding:7px 11px;border-radius:10px;font-size:.8rem;color:#6b7280;background:#fff;border:1px solid #e5e7eb;align-self:flex-start;';
thinking.textContent='🤔 Thinking…';
_aiLog.appendChild(thinking);
_aiLog.scrollTop=_aiLog.scrollHeight;
try{
var response=await fetch('https://api.anthropic.com/v1/messages',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
model:'claude-sonnet-4-20250514',
max_tokens:300,
system:'You are the TeenWork support assistant. TeenWork is a job app for teens ages 13-17, started in Vermont: a linked parent approves every application and chats are checked by a word filter and AI. TeenWork does not verify employers or run background checks, so never say it does. Answer questions helpfully and briefly (2-3 sentences max). If the issue needs admin help, say so and encourage them to send a message using the form below.',
messages:[{role:'user',content:q}]
})
});
var data=await response.json();
thinking.remove();
var ans=(data.content&&data.content[0]&&data.content[0].text)||'I\'m not sure — please send a message to the admin using the form below and we\'ll sort it out!';
_aiAddMsg(ans,'bot');
}catch(e){
thinking.remove();
_aiAddMsg('I\'m having trouble connecting right now. Please use the form below to send a message to the admin!','bot');
}
_aiSend.disabled=false;
_aiSend.textContent='Ask ↵';
}
_aiSend.onclick=_aiAsk;
_aiInp.addEventListener('keydown',function(e){if(e.key==='Enter'&& !e.shiftKey){e.preventDefault();_aiAsk();}});
};
function _injectFeedbackFAB(){
if(document.getElementById('v14-feedback-fab'))return;
const fab=document.createElement('button');
fab.id='v14-feedback-fab';
fab.innerHTML='⭐ Rate App';
fab.title='Give feedback on TeenWork';
fab.onclick=()=>document.getElementById('v14-feedback-modal').classList.add('open');
document.body.appendChild(fab);
const modal=document.createElement('div');
modal.id='v14-feedback-modal';
modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open');};
modal.innerHTML=`
    <div id="v14-feedback-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <h3 style="font-family:'Fraunces',serif;font-size:1.1rem;color:var(--green);margin:0">⭐ How's TeenWork?</h3>
        <button onclick="document.getElementById('v14-feedback-modal').classList.remove('open')" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--muted)">✕</button>
      </div>
      <div class="v14-category-grid">
        <button class="v14-cat-btn active" data-cat="overall" onclick="v14SelectCat(this)">🌟 Overall</button>
        <button class="v14-cat-btn" data-cat="jobs" onclick="v14SelectCat(this)">💼 Job Listings</button>
        <button class="v14-cat-btn" data-cat="safety" onclick="v14SelectCat(this)">🛡 Safety</button>
        <button class="v14-cat-btn" data-cat="ai" onclick="v14SelectCat(this)">🤖 AI Features</button>
        <button class="v14-cat-btn" data-cat="design" onclick="v14SelectCat(this)">🎨 Design</button>
        <button class="v14-cat-btn" data-cat="idea" onclick="v14SelectCat(this)">💡 Suggestion</button>
      </div>
      <div style="margin-bottom:.5rem">
        <div style="font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:4px">Your rating</div>
        <div class="v14-star-row" id="v14-fb-stars">
          ${[1,2,3,4,5].map(n=>`<span class="v14-star lit" data-n="${n}" onclick="v14SetStar(${n})">★</span>`).join('')}
        </div>
        <input type="hidden" id="v14-fb-rating" value="5">
      </div>
      <div style="margin-bottom:.5rem">
        <div style="font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:4px">Tell us more (optional)</div>
        <textarea id="v14-fb-body" rows="3" placeholder="What do you love? What could be better?" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.87rem;resize:vertical;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'"></textarea>
      </div>
      <div style="margin-bottom:1rem">
        <div style="font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:4px">Your name <span style="font-weight:400">(optional)</span></div>
        <input id="v14-fb-name" type="text" placeholder="e.g. Alex, teen from Vermont" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.87rem;outline:none;box-sizing:border-box" onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'">
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <input type="checkbox" id="v14-fb-public" checked style="width:16px;height:16px">
        <label for="v14-fb-public" style="font-size:.78rem;color:var(--muted);cursor:pointer">Allow my review to appear publicly on TeenWork (after approval)</label>
      </div>
      <button onclick="v14SubmitFeedback()" class="btn-primary" style="width:100%;margin-top:.5rem">Submit Feedback</button>
    </div>`;
document.body.appendChild(modal);
}
window.v14SelectCat=function(btn){
document.querySelectorAll('.v14-cat-btn').forEach(b=>b.classList.remove('active'));
btn.classList.add('active');
};
window.v14SetStar=function(n){
document.getElementById('v14-fb-rating').value=n;
document.querySelectorAll('.v14-star').forEach(s=>{
s.classList.toggle('lit',Number(s.dataset.n)<=n);
});
};
window.v14SubmitFeedback=function(){
const rating=parseInt(document.getElementById('v14-fb-rating')?.value||'5');
const body=document.getElementById('v14-fb-body')?.value.trim()||'';
const name=document.getElementById('v14-fb-name')?.value.trim()||(window.currentUser?.name||'Anonymous user');
const isPublic=document.getElementById('v14-fb-public')?.checked!==false;
const cat=document.querySelector('.v14-cat-btn.active')?.dataset.cat||'overall';
const role=window.currentUser?.type||'visitor';
try{
const msgs=JSON.parse(localStorage.getItem('tw_admin_support_msgs')||'[]');
msgs.unshift({
id:'fb-'+Date.now(),name,role,type:'feedback',
category:cat,rating,
body:body||`(No comment — ${rating}★ for ${cat})`,
ts:new Date().toISOString(),email:window.currentUser?.email||'visitor'
});
localStorage.setItem('tw_admin_support_msgs',JSON.stringify(msgs.slice(0,200)));
}catch(e){}
if(isPublic&&name&&body){
try{
const RKEY='tw_admin_reviews';
const reviews=JSON.parse(localStorage.getItem(RKEY)||'[]');
reviews.unshift({
id:'r'+Date.now(),name:name+(role&&role!=='visitor'?' · '+role:''),
role,rating,body,published:false,
date:new Date().toISOString().slice(0,10)
});
localStorage.setItem(RKEY,JSON.stringify(reviews));
}catch(e){}
}
document.getElementById('v14-feedback-modal').classList.remove('open');
if(typeof showToast==='function')showToast('⭐ Thanks for your feedback! It helps us improve.','success');
};
function _injectLandingReviews(){}
const V14_TOUR={
teen:[
{icon:'👋',title:'Welcome to TeenWork!',body:'Let\'s take a quick 6-step tour so you know where everything is. You can skip anytime.'},
{target:'#ttab-browse, .browse-card, .filters-bar',icon:'🔍',title:'Browse Local Jobs',body:'This is the Jobs tab — scroll through real listings near you, filtered for your age. Tap any job to apply.'},
{target:'.stat-card:first-child, .stats-row',icon:'📊',title:'Your Stats',body:'Your earnings, hours worked, star rating, and streak are always visible here at the top.'},
{target:'#mobileNav, .grp-tabs',icon:'💼',title:'Work Button',body:'Tap Work to access your Hours Log, Calendar, App Tracker, Earnings, and Savings Goals — all in one place.'},
{target:'#ttab-ai, .lessons-grid, #lessons-grid',icon:'📚',title:'Lessons & AI Coach',body:'Learn professional skills and earn XP. Your AI Coach can help write cover letters, prep for interviews, and explain your rights.'},
{target:'.dash-header h1, .dashboard',icon:'🎉',title:'You\'re All Set!',body:'Explore freely — every section has help and AI tools nearby. Good luck finding your first job! 💚'},
],
parent:[
{icon:'👪',title:'Parent Dashboard Tour',body:'Welcome! This is your oversight center. Let\'s show you the key features in 4 quick steps.'},
{target:'#ptab-approvals, .tab-panel.active',icon:'✅',title:'Approve Applications',body:'When your teen applies to a job, it shows up here. Review the employer\'s AI safety report before approving.'},
{target:'#ptab-controls',icon:'🛡',title:'Parental Controls',body:'Set weekly hour limits, block certain transport types, and get real-time safety alerts if anything looks off.'},
{icon:'✨',title:'You\'re Ready!',body:'TeenWork keeps your teen safe while giving them independence to build real work experience. You\'ve got this! 💚'},
],
employer:[
{icon:'🏢',title:'Employer Dashboard Tour',body:'Welcome! Here\'s a quick 4-step overview of your hiring tools.'},
{target:'#etab-post, .post-form',icon:'📋',title:'Post a Job',body:'Fill in the details — our AI checks every post for child labor law compliance before it goes live.'},
{target:'#emp-kanban-board, #etab-applicants',icon:'📊',title:'Applicant Pipeline',body:'Drag applicants through stages: Applied → Reviewed → Met Them → Hired. Bulk-message everyone at once.'},
{icon:'✅',title:'Ready to Hire!',body:'A teen’s age is self-reported. Review the application and discuss the work with the teen and their parent. Good luck! 💚'},
],
};
let _v14TourSteps=[],_v14TourIdx=0;
function _v14CreateTour(){
if(document.getElementById('v14-tour-overlay'))return;
const ov=document.createElement('div');
ov.id='v14-tour-overlay';
ov.innerHTML=`
    <div id="v14-tour-scrim"></div>
    <div id="v14-tour-hole" style="position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.6);pointer-events:none;transition:all .35s;display:none"></div>
    <div id="v14-tour-card"></div>`;
document.body.appendChild(ov);
}
function _v14TourStep(idx){
const ov=document.getElementById('v14-tour-overlay');
if(!ov)return;
if(idx>=_v14TourSteps.length){_v14TourEnd();return;}
_v14TourIdx=idx;
ov.classList.add('on');
const step=_v14TourSteps[idx];
const card=document.getElementById('v14-tour-card');
const hole=document.getElementById('v14-tour-hole');
const total=_v14TourSteps.length;
const isLast=idx===total-1;
let targetEl=null;
if(step.target){
const sel=step.target.split(',').map(s=>s.trim());
for(const s of sel){targetEl=document.querySelector(s);if(targetEl)break;}
}
if(targetEl){
targetEl.scrollIntoView({behavior:'smooth',block:'center'});
setTimeout(()=>{
const r=targetEl.getBoundingClientRect();
const p=8;
hole.style.cssText=`position:fixed;left:${r.left-p}px;top:${r.top-p}px;width:${r.width+p*2}px;height:${r.height+p*2}px;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.6);pointer-events:none;transition:all .35s;display:block`;
const cW=270;
let top,left,bottom;
const spaceBelow=window.innerHeight-(r.bottom+p+14);
const spaceAbove=r.top-p-14;
if(spaceBelow>=200||spaceBelow>=spaceAbove){
top=r.bottom+p+14;
bottom=null;
}else{
top=null;
bottom=window.innerHeight-(r.top-p-14);
}
left=Math.max(12,Math.min(r.left-p,window.innerWidth-cW-12));
card.style.cssText=`max-width:${cW}px;`+
(top!==null?`top:${top}px;bottom:auto;`:`bottom:${bottom}px;top:auto;`)+
`left:${left}px;right:auto;`;
_v14TourRenderCard(card,step,idx,total,isLast);
},360);
}else{
hole.style.display='none';
card.style.cssText='max-width:290px;top:50%;left:50%;transform:translate(-50%,-50%)';
_v14TourRenderCard(card,step,idx,total,isLast);
}
}
function _v14TourRenderCard(card,step,idx,total,isLast){
card.innerHTML=`
    <div class="v14-tour-step-label">Step ${idx+1} of ${total}</div>
    <div class="v14-tour-dots">${Array.from({length:total},(_,i)=>`<div class="v14-tour-dot${i<idx?' done':i===idx?' active':''}"></div>`).join('')}</div>
    <div class="v14-tour-title">${step.icon||''} ${step.title}</div>
    <div class="v14-tour-body">${step.body}</div>
    <div class="v14-tour-btns">
      ${idx>0?`<button class="v14-tour-back" onclick="window._v14TourStep(${idx-1})">← Back</button>`:''}
      <button class="v14-tour-next" onclick="${isLast?'window._v14TourEnd()':`window._v14TourStep(${idx+1})`}">${isLast?'🎉 Done!':'Next →'}</button>
      ${!isLast?`<button class="v14-tour-skip" onclick="window._v14TourEnd()">Skip</button>`:''}
    </div>`;
}
window._v14TourStep=_v14TourStep;
window._v14TourEnd=function(){
const ov=document.getElementById('v14-tour-overlay');
if(ov)ov.classList.remove('on');
document.getElementById('v14-tour-hole').style.display='none';
try{localStorage.setItem('tw_tour_v14_'+(window.currentUser?.email||'g'),'1');}catch(e){}
if(typeof showToast==='function')showToast('Tour complete! Explore freely 🎉','success');
};
window.startTour=window._startAdvancedTour=function(role){
role=role||window.currentUser?.type||'teen';
_v14TourSteps=V14_TOUR[role]||V14_TOUR.teen;
_v14CreateTour();
_v14TourStep(0);
};
window.tourDone=window._v14TourEnd;
const _origLD=window.launchDashboard;
window.launchDashboard=function(){
if(_origLD)_origLD.apply(this,arguments);
const role=window.currentUser?.type;
if(!role||role==='admin')return;
const k='tw_tour_v14_'+(window.currentUser?.email||'g');
if(!matchMedia('(max-width:768px)').matches&& !localStorage.getItem(k)){
setTimeout(()=>window._startAdvancedTour(role),900);
}
};
function boot(){
_fixAuthButtons();
_injectFeedbackFAB();
_injectLandingReviews();
const lp=document.getElementById('page-landing');
if(lp)new MutationObserver(()=>{if(lp.classList.contains('active'))setTimeout(_injectLandingReviews,100);}).observe(lp,{attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-13.js */
try{
(function v16(){
'use strict';
window._nav=function(page){
if(typeof window.gotoPage==='function'){
window.gotoPage(page);
}else{
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
const pg=document.getElementById('page-'+page);
if(pg)pg.classList.add('active');
}
};
function _v16PatchNavButtons(){
document.querySelectorAll('[onclick]').forEach(el=>{
const oc=el.getAttribute('onclick')||'';
const navM=oc.match(/gotoPage\(['"](\w+)['"]\)/);
if(navM&&(navM[1]==='signup'||navM[1]==='login')){
const target=navM[1];
el.setAttribute('onclick',`window._nav('${target}')`);
}
if(/signOut\(\)|doLogout\(\)/.test(oc)){
el.setAttribute('onclick','window._v16SignOut()');
}
});
}
window._v16SignOut=function(){
try{
if(window.sbClient)window.sbClient.auth.signOut();
}catch(e){}
window.currentUser=null;
window.selectedType=null;
window.parentVerified=false;
try{currentUser=null;selectedType=null;parentVerified=false;}catch(e){}
['tw35-modal','tw35-banner','tw35-requests','tw-link-card','parent-lock-overlay'].forEach(function(id){
var el=document.getElementById(id);if(el)el.remove();
});
document.body.classList.remove('tw-limited');
const mn=document.getElementById('mobileNav');
if(mn)mn.style.display='none';
document.querySelectorAll('.grp-tabs,.subtab-row').forEach(el=>el.remove());
window._nav('landing');
};
window._v14CreateTour=function(){
if(document.getElementById('v14-tour-overlay'))return;
const ov=document.createElement('div');
ov.id='v14-tour-overlay';
ov.innerHTML=`
    <div id="v14-tour-scrim" style="position:fixed;inset:0;background:rgba(0,0,0,.55);pointer-events:none"></div>
    <div id="v14-tour-hole" style="position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.6);pointer-events:none;transition:all .35s;display:none"></div>
    <div id="v14-tour-card"></div>`;
document.body.appendChild(ov);
};
function _v16DefaultFreePlan(){
const freeRadio=document.querySelector('input[name="su-plan"][value="free"]');
const proCard=document.getElementById('su-plan-pro-card');
const freeCard=document.getElementById('su-plan-free-card');
if(freeRadio){
freeRadio.checked=true;
if(freeCard)freeCard.style.borderColor='var(--green)';
if(proCard)proCard.style.borderColor='var(--border)';
}
const cfg=typeof _adminGetConfig==='function'?_adminGetConfig():{};
if(!cfg.launchPaid){
const notice=document.getElementById('su-plan-notice');
const proPrice=document.getElementById('su-plan-pro-price');
if(proPrice)proPrice.textContent='FREE during early access';
if(notice){
notice.style.display='block';
notice.innerHTML='🧪 <strong>TeenWork is still in testing — Pro is completely free!</strong> You\'ll get a 10-day email notice before any paid plan is ever added. No surprises, ever.';
}
}
}
const _sigPage=document.getElementById('page-signup');
if(_sigPage)new MutationObserver(()=>{
if(_sigPage.classList.contains('active'))setTimeout(_v16DefaultFreePlan,80);
}).observe(_sigPage,{attributes:true,attributeFilter:['class']});
const LESSONS_DATA_V16=[
{id:'first_impression',icon:'🤝',title:'First Impressions',xp:20,mins:4},
{id:'safety',icon:'🦺',title:'Stay Safe at Work',xp:20,mins:4},
{id:'communication',icon:'💬',title:'Professional Communication',xp:20,mins:4},
{id:'money',icon:'💰',title:'Your First Paycheck',xp:25,mins:5},
{id:'ratings',icon:'⭐',title:'Get a 5-Star Rating',xp:20,mins:4},
{id:'resume',icon:'📄',title:'Build a Teen Resume',xp:30,mins:6},
{id:'interview',icon:'🎤',title:'Ace Your Interview',xp:30,mins:5},
{id:'conflict',icon:'🤜',title:'Handle Conflict',xp:25,mins:5},
{id:'time',icon:'⏰',title:'Time Management',xp:20,mins:4},
{id:'future_jobs_lor',icon:'📜',title:'Letters of Rec',xp:25,mins:5},
{id:'negotiation',icon:'💵',title:'Negotiate Your Pay',xp:30,mins:5},
{id:'digital',icon:'🌐',title:'Digital Professionalism',xp:20,mins:4},
];
const _origRL=window.renderLessonsGrid;
window.renderLessonsGrid=function(){
if(_origRL){try{_origRL();}catch(e){}}
const completed=window.userActivity?.lessonsCompleted||[];
const lessons=(window.lessonsData?.length)?window.lessonsData:LESSONS_DATA_V16;
['ai-lessons-grid','lessons-grid'].forEach(gid=>{
const grid=document.getElementById(gid);
if(!grid||grid.querySelector('.lesson-card'))return;
const done=completed.filter(id=>lessons.find(l=>l.id===id)).length;
grid.innerHTML=lessons.map(l=>{
const isDone=completed.includes(l.id);
return`<div class="lesson-card${isDone?' done':''}" onclick="window.v16OpenLesson('${l.id}')" style="cursor:pointer">
        <div class="lesson-card-top">
          <div class="lesson-icon">${l.icon||'📚'}</div>
          <div>
            <div class="lesson-title">${l.title}</div>
            <div class="lesson-meta">${l.mins||4} min · ${l.xp||20} XP${isDone?' · ✓':''}</div>
          </div>
        </div>
        <div class="lesson-card-bottom">
          <span class="lesson-progress" style="color:${isDone?'var(--green)':'var(--muted)'}">${isDone?'Done':'Not started'}</span>
          <button class="lesson-btn ${isDone?'done':'start'}" onclick="window.v16OpenLesson('${l.id}');event.stopPropagation()">${isDone?'Review':'Start →'}</button>
        </div>
      </div>`;
}).join('');
const pre=gid==='ai-lessons-grid'?'ai-':'';
const dc=document.getElementById(pre+'lessons-done-count');if(dc)dc.textContent=done;
const tc=document.getElementById(pre+'lessons-total-count');if(tc)tc.textContent=lessons.length;
const pb=document.getElementById(pre+'lessons-progress-bar');
if(pb)pb.style.width=Math.round(done/lessons.length*100)+'%';
const pl=document.getElementById(pre+'lessons-progress-label');
if(pl)pl.textContent=done===0?'Start a lesson below!':done===lessons.length?'🎓 All done!':lessons.length-done+' left';
const db=document.getElementById('ai-lessons-done-badge');
if(db)db.textContent=done+' done';
});
};
window.v16OpenLesson=function(id){
if(typeof window.openLesson==='function'){try{window.openLesson(id);return;}catch(e){}}
const content=(window.LESSON_CONTENT||{})[id];
const lesson=LESSONS_DATA_V16.find(l=>l.id===id)||{id,title:id,icon:'📚',xp:20,mins:4};
const isDone=(window.userActivity?.lessonsCompleted||[]).includes(id);
let m=document.getElementById('v16-lesson-modal');
if(!m){m=document.createElement('div');m.id='v16-lesson-modal';
m.style.cssText='display:none;position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:1rem;font-family:"DM Sans",sans-serif';
m.onclick=e=>{if(e.target===m)m.style.display='none';};document.body.appendChild(m);}
let body='';
if(content?.sections){
body=content.sections.map(s=>`<div style="margin-bottom:.9rem"><div style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.4px;color:var(--green);margin-bottom:.35rem">${s.title}</div><div style="font-size:.87rem;line-height:1.7;white-space:pre-wrap;color:var(--text)">${s.text}</div></div>`).join('');
if(content.tip)body+=`<div style="background:var(--green-pale,#d1fae5);border-left:3px solid var(--green);border-radius:0 8px 8px 0;padding:10px 14px;font-size:.85rem;line-height:1.6;margin-top:.5rem">${content.tip}</div>`;
}else{body=`<p style="color:var(--muted)">${lesson.title} — content coming soon!</p>`;}
m.innerHTML=`<div style="background:var(--card,#fff);border-radius:20px;width:100%;max-width:600px;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25)">
    <div style="background:var(--green);padding:1.3rem 1.5rem;border-radius:20px 20px 0 0;color:#fff;display:flex;justify-content:space-between;align-items:flex-start">
      <div><div style="font-size:1.5rem;margin-bottom:3px">${lesson.icon}</div>
        <h2 style="font-family:'Fraunces',serif;font-size:1.2rem;font-weight:700;margin:0 0 2px">${lesson.title}</h2>
        <div style="font-size:.78rem;opacity:.85">${lesson.mins} min · ${lesson.xp} XP · ${isDone?'✓ Done':'Not started'}</div></div>
      <button onclick="document.getElementById('v16-lesson-modal').style.display='none'" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:5px 10px;cursor:pointer">✕</button>
    </div>
    <div style="padding:1.3rem 1.5rem">
      ${body}
      ${!isDone?`<div style="margin-top:1.2rem;padding-top:1rem;border-top:1px solid var(--border)">
        <button onclick="window.v16CompleteLesson('${id}')" style="background:var(--green);color:#fff;border:none;padding:10px 22px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer">✓ I read it — earn ${lesson.xp} XP!</button>
      </div>`:`<div style="margin-top:1rem;padding:10px 14px;background:var(--green-pale,#d1fae5);border-radius:10px;color:var(--green);font-weight:700;font-size:.87rem">✓ Completed!</div>`}
    </div></div>`;
m.style.display='flex';
};
window.v16CompleteLesson=function(id){
if(!window.userActivity)window.userActivity={};
if(!window.userActivity.lessonsCompleted)window.userActivity.lessonsCompleted=[];
if(!window.userActivity.lessonsCompleted.includes(id)){
window.userActivity.lessonsCompleted.push(id);
const l=LESSONS_DATA_V16.find(x=>x.id===id);
if(window.teenGameState)window.teenGameState.points=(window.teenGameState.points||0)+(l?.xp||20);
if(typeof awardBadge==='function')awardBadge('lesson_1');
try{localStorage.setItem('tw_lessons_completed',String(window.userActivity.lessonsCompleted.length));}catch(e){}
}
document.getElementById('v16-lesson-modal').style.display='none';
if(typeof showToast==='function'){const l=LESSONS_DATA_V16.find(x=>x.id===id);showToast(`✅ +${l?.xp||20} XP!`,'success');}
setTimeout(window.renderLessonsGrid,150);
};
if(window.NAV?.teen){
window.NAV.teen.more=[
{section:'More Features',items:[
{icon:'🏅',label:'Badges',tab:'ttab-badges'},
{icon:'🗂️',label:'Portfolio',tab:'ttab-portfolio'},
{icon:'📜',label:'Rec Letters',tab:'ttab-letters'},
{icon:'🎯',label:'First Job',tab:'ttab-firstjob'},
{icon:'🛡️',label:'Verify',tab:'verify'},
]},
];
}
function _makeDraggable(el){
let startX,startY,startLeft,startBottom,dragged=false;
const DRAG_THRESHOLD=6;
function onDown(clientX,clientY){
const rect=el.getBoundingClientRect();
startX=clientX;startY=clientY;
startLeft=rect.left;
startBottom=window.innerHeight-rect.bottom;
dragged=false;
el.classList.add('dragging');
el.style.transition='none';
}
function onMove(clientX,clientY){
const dx=clientX-startX,dy=clientY-startY;
if(!dragged&&(Math.abs(dx)>DRAG_THRESHOLD||Math.abs(dy)>DRAG_THRESHOLD))dragged=true;
if(!dragged)return;
const newLeft=Math.max(0,Math.min(window.innerWidth-el.offsetWidth-8,startLeft+dx));
const newBottom=Math.max(72,Math.min(window.innerHeight-el.offsetHeight-8,startBottom-dy));
el.style.left=newLeft+'px';
el.style.bottom=newBottom+'px';
el.style.right='auto';
el.style.top='auto';
}
function onUp(){
el.classList.remove('dragging');
el.style.transition='';
try{localStorage.setItem('tw_fab_'+el.id,JSON.stringify({left:el.style.left,bottom:el.style.bottom}));}catch(e){}
}
try{
const saved=JSON.parse(localStorage.getItem('tw_fab_'+el.id)||'null');
if(saved){el.style.left=saved.left;el.style.bottom=saved.bottom;el.style.right='auto';}
}catch(e){}
el.addEventListener('mousedown',e=>{e.preventDefault();onDown(e.clientX,e.clientY);
function mm(e){onMove(e.clientX,e.clientY);}
function mu(){onUp();document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);}
document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
});
el.addEventListener('touchstart',e=>{const t=e.touches[0];onDown(t.clientX,t.clientY);},{passive:true});
el.addEventListener('touchmove',e=>{const t=e.touches[0];onMove(t.clientX,t.clientY);e.preventDefault();},{passive:false});
el.addEventListener('touchend',onUp);
el.addEventListener('click',e=>{if(dragged){dragged=false;e.preventDefault();e.stopImmediatePropagation();}},true);
}
function _v16InjectFABs(){
['v14-feedback-fab','v15-feedback-fab','v16-rate-fab','v16-support-fab'].forEach(id=>document.getElementById(id)?.remove());
const rateFab=document.createElement('button');
rateFab.id='v16-rate-fab';
rateFab.className='v16-fab';
rateFab.innerHTML='⭐ Rate App';
rateFab.title='Rate & review TeenWork';
rateFab.addEventListener('click',()=>{if(!rateFab.classList.contains('dragging'))_v16OpenFeedback();});
document.body.appendChild(rateFab);
_makeDraggable(rateFab);
const supFab=document.createElement('button');
supFab.id='v16-support-fab';
supFab.className='v16-fab';
supFab.innerHTML='🆘 Support';
supFab.title='Contact support';
supFab.addEventListener('click',()=>{if(!supFab.classList.contains('dragging')){
if(typeof openSupportModal==='function')openSupportModal('General','');
else if(window._v16OpenFeedback)_v16OpenFeedback('support');
}});
document.body.appendChild(supFab);
_makeDraggable(supFab);
if(!document.getElementById('v16-feedback-modal')){
const modal=document.createElement('div');
modal.id='v16-feedback-modal';
modal.innerHTML=`<div id="v16-feedback-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <div><div style="font-family:'Fraunces',serif;font-size:1.1rem;font-weight:700;color:var(--green)">⭐ Rate TeenWork</div>
          <div style="font-size:.78rem;color:var(--muted);margin-top:2px">Your feedback helps improve the app</div></div>
        <button onclick="document.getElementById('v16-feedback-modal').classList.remove('open')" style="background:none;border:none;font-size:1.2rem;color:var(--muted);cursor:pointer;padding:4px">✕</button>
      </div>
      <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-bottom:4px">How would you rate TeenWork?</div>
      <div class="v16-star-row" id="v16-star-row">
        ${[1,2,3,4,5].map(n=>`<span class="v16-star" data-n="${n}" onclick="window._v16SetStar(${n})">★</span>`).join('')}
      </div>
      <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-bottom:8px">What do you like? (pick any)</div>
      <div class="v16-cat-grid">
        ${['Easy to use','Jobs near me','Safety features','Parent tools','AI tools','Lessons','Earnings tracker','Clean design'].map(c=>`<button class="v16-cat-btn" onclick="this.classList.toggle('active')">${c}</button>`).join('')}
      </div>
      <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-bottom:6px">Anything else? (optional)</div>
      <textarea id="v16-feedback-text" placeholder="Feedback, ideas, or bugs…" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.86rem;resize:vertical;min-height:68px;outline:none;background:var(--bg,#f5f0e8);color:var(--text)"></textarea>
      <div style="display:flex;gap:8px;margin-top:1rem">
        <button onclick="window._v16SubmitFeedback()" style="flex:1;background:var(--green);color:#fff;border:none;padding:11px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer">Submit ★</button>
        <button onclick="document.getElementById('v16-feedback-modal').classList.remove('open')" style="background:var(--bg,#f5f0e8);border:1.5px solid var(--border);padding:11px 16px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.9rem;cursor:pointer;color:var(--muted)">Skip</button>
      </div>
      <div id="v16-feedback-ok" style="display:none;text-align:center;padding:1.5rem 0;font-size:1rem;color:var(--green);font-weight:700">🎉 Thanks for your review!</div>
    </div>`;
document.body.appendChild(modal);
}
}
let _v16Stars=0;
window._v16SetStar=function(n){
_v16Stars=n;
document.querySelectorAll('.v16-star').forEach((s,i)=>s.classList.toggle('lit',i<n));
};
function _v16OpenFeedback(){
_v16Stars=0;
document.querySelectorAll('.v16-star').forEach(s=>s.classList.remove('lit'));
document.querySelectorAll('.v16-cat-btn').forEach(b=>b.classList.remove('active'));
const txt=document.getElementById('v16-feedback-text');if(txt)txt.value='';
const ok=document.getElementById('v16-feedback-ok');if(ok)ok.style.display='none';
const card=document.getElementById('v16-feedback-card');
if(card)Array.from(card.children).forEach(c=>c.style.display='');
document.getElementById('v16-feedback-modal').classList.add('open');
}
window._v16SubmitFeedback=function(){
if(!_v16Stars){if(typeof showToast==='function')showToast('Pick a star rating','info');return;}
const cats=Array.from(document.querySelectorAll('.v16-cat-btn.active')).map(b=>b.textContent);
const text=document.getElementById('v16-feedback-text')?.value.trim()||'';
const role=window.currentUser?.type||'visitor';
const review={name:window.currentUser?.name||'Anonymous',rating:_v16Stars,categories:cats,
body:text||(cats.length?'Liked: '+cats.join(', '):'No comment'),
date:new Date().toISOString().slice(0,10),userType:role,source:'in-app-review'};
try{
const rs=JSON.parse(localStorage.getItem('tw_v14_reviews')||'[]');
rs.unshift(review);localStorage.setItem('tw_v14_reviews',JSON.stringify(rs.slice(0,200)));
}catch(e){}
if(typeof _adminSaveSupportMessage==='function')_adminSaveSupportMessage({
name:review.name,context:`⭐ Review (${_v16Stars}/5, ${role})`,
body:`Rating: ${_v16Stars}/5\nLiked: ${cats.join(', ')||'none'}\n${text}`,
email:window.currentUser?.email||'anonymous',userType:role,time:new Date().toISOString()
});
const card=document.getElementById('v16-feedback-card');
if(card){Array.from(card.children).forEach(c=>c.style.display='none');const ok=document.getElementById('v16-feedback-ok');if(ok)ok.style.display='block';}
setTimeout(()=>{document.getElementById('v16-feedback-modal')?.classList.remove('open');if(card)Array.from(card.children).forEach(c=>c.style.display='');},2000);
if(typeof showToast==='function')showToast(`Thanks for your ${_v16Stars}⭐ review!`,'success');
};
function bootV16(){
_v16PatchNavButtons();
_v16DefaultFreePlan();
_v16InjectFABs();
const _origSwitch=window.switchDashTab;
window.switchDashTab=function(btn,panelId){
if(_origSwitch)_origSwitch(btn,panelId);
if(panelId==='ttab-ai'||panelId==='ttab-lessons')setTimeout(window.renderLessonsGrid,120);
};
setTimeout(()=>{if(typeof window.renderLessonsGrid==='function')window.renderLessonsGrid();},600);
window.signOut=window._v16SignOut;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootV16);
else bootV16();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-14.js */
try{
(function v17(){
'use strict';
function _v17SignOut(){
try{
if(typeof resetSessionState==='function')resetSessionState();
window.currentUser=null;
window.selectedType=null;
try{currentUser=null;selectedType=null;parentVerified=false;}catch(e){}
['tw35-modal','tw35-banner','tw35-requests','tw-link-card','parent-lock-overlay'].forEach(function(id){
var el=document.getElementById(id);if(el)el.remove();
});
document.body.classList.remove('tw-limited');
if(window.sbClient){
try{window.sbClient.auth.signOut();}catch(e){}
}
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
const landing=document.getElementById('page-landing');
if(landing)landing.classList.add('active');
const nav=document.getElementById('mobileNav');
if(nav)nav.style.display='none';
if(typeof showToast==='function')showToast('You have been signed out.','success');
}catch(e){
console.warn('v17 signOut error:',e);
window.location.reload();
}
}
window.signOut=_v17SignOut;
window._v17SignOut=_v17SignOut;
function _bindSignOutButtons(){
document.querySelectorAll('button, a').forEach(el=>{
const oc=el.getAttribute('onclick')||'';
if(/signOut\(\)|_v16SignOut\(\)/.test(oc)){
el.onclick=(e)=>{e.preventDefault();_v17SignOut();};
}
});
}
function _bindAuthButtons(){
document.querySelectorAll('button').forEach(btn=>{
const oc=btn.getAttribute('onclick')||'';
const txt=btn.textContent.trim();
if(oc.includes('doLogin')||oc.includes('doSignup'))return;
if(oc.includes("gotoPage('signup')")||txt==='Sign Up Free'||txt==='Sign Up'){
btn.onclick=(e)=>{
e.preventDefault();
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
document.getElementById('page-signup')?.classList.add('active');
window.scrollTo(0,0);
};
}
if(oc.includes("gotoPage('login')")||txt==='Sign In'){
btn.onclick=(e)=>{
e.preventDefault();
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
document.getElementById('page-login')?.classList.add('active');
window.scrollTo(0,0);
};
}
});
}
const V17_TEEN_MORE=[
{section:'Progress & Achievements',items:[
{icon:'🏅',label:'Badges',tab:'ttab-badges'},
{icon:'🏆',label:'Leaderboard',tab:'ttab-leaderboard'},
{icon:'🗂️',label:'Portfolio',tab:'ttab-portfolio'},
{icon:'🛡️',label:'Verify',tab:'verify'},
]},
{section:'Learning & Tools',items:[
{icon:'📚',label:'Lessons',tab:'ttab-lessons'},
{icon:'🎯',label:'First Job',tab:'ttab-firstjob'},
{icon:'📜',label:'Rec Letters',tab:'ttab-letters'},
{icon:'💵',label:'Wage Coach',tab:'ttab-ai'},
]},
];
function _patchMoreDrawer(){
if(window.NAV?.teen){
window.NAV.teen.more=V17_TEEN_MORE;
}
const _origMore=window.openMobileMoreDrawer;
window.openMobileMoreDrawer=function(){
document.getElementById('mobile-more-drawer')?.remove();
document.getElementById('mobile-more-scrim')?.remove();
const role=window.currentUser?.type||'teen';
if(role!=='teen'){
if(_origMore)return _origMore.apply(this,arguments);
return;
}
const scrim=document.createElement('div');
scrim.id='mobile-more-scrim';
scrim.style.cssText='position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.4)';
scrim.onclick=()=>{scrim.remove();drawer.remove();};
document.body.appendChild(scrim);
const drawer=document.createElement('div');
drawer.id='mobile-more-drawer';
drawer.style.cssText='position:fixed;bottom:72px;left:0;right:0;z-index:2001;background:var(--card);border-radius:20px 20px 0 0;box-shadow:0 -8px 32px rgba(0,0,0,.18);padding:1.2rem 1rem 1rem;max-height:70vh;overflow-y:auto;font-family:"DM Sans",sans-serif';
let html='<div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 1rem"></div>';
V17_TEEN_MORE.forEach(section=>{
html+=`<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:8px;margin-top:4px">${section.section}</div>`;
html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">';
section.items.forEach(item=>{
html+=`<button onclick="
          document.getElementById('mobile-more-scrim')?.remove();
          document.getElementById('mobile-more-drawer')?.remove();
          ${item.tab==='verify'?"if(typeof showVerifyPage==='function'){showVerifyPage();}else{if(typeof switchDashTab==='function')switchDashTab(null,'ttab-ai');}":`if(typeof switchDashTab==='function')switchDashTab(null,'${item.tab}'); else if(typeof gotoPage==='function')gotoPage('${item.tab}');`}
        " style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border:1.5px solid var(--border);border-radius:12px;background:var(--bg);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s" onmouseover="this.style.borderColor='var(--green)';this.style.background='var(--green-pale)'" onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg)'">
          <span style="font-size:1.4rem">${item.icon}</span>
          <span style="font-size:.72rem;font-weight:700;color:var(--text)">${item.label}</span>
        </button>`;
});
html+='</div>';
});
drawer.innerHTML=html;
document.body.appendChild(drawer);
};
}
let _v17Stars=0,_v17Recommend='',_v17NPS=0,_v17FindUs='';
function _v17BuildRatingModal(){
if(document.getElementById('v17-enhanced-rating-modal'))return;
const el=document.createElement('div');
el.id='v17-enhanced-rating-modal';
el.innerHTML=`
  <div id="v17-erm-card">
    <div class="v17-erm-head">
      <h3>⭐ Rate TeenWork</h3>
      <button onclick="document.getElementById('v17-enhanced-rating-modal').classList.remove('open')"
        style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:.9rem">✕</button>
    </div>
    <div class="v17-erm-body" id="v17-erm-form">
      <!-- Star Rating -->
      <div class="v17-section-label">Overall Rating *</div>
      <div class="v17-star-row" id="v17-star-row">
        ${[1,2,3,4,5].map(n=>`<span class="v17-star" data-n="${n}" onclick="window._v17SetStar(${n})">★</span>`).join('')}
      </div>
      <div id="v17-star-label" style="font-size:.78rem;color:var(--muted);margin-bottom:8px;min-height:18px"></div>

      <!-- What do you like -->
      <div class="v17-section-label">What do you like? (pick any)</div>
      <div class="v17-cat-grid">
        ${['Easy to use','Jobs near me','Safety features','Parent tools','AI tools','Lessons','Earnings tracker','Clean design'].map(c=>`<button class="v17-cat-btn" onclick="this.classList.toggle('active')">${c}</button>`).join('')}
      </div>

      <!-- Would you recommend -->
      <div class="v17-section-label">Would you recommend TeenWork to a friend?</div>
      <div class="v17-radio-row" id="v17-recommend-row">
        ${['Definitely yes','Probably','Not sure','Probably not','No'].map(r=>`<button class="v17-radio-btn" onclick="window._v17SetRecommend('${r}',this)">${r}</button>`).join('')}
      </div>

      <!-- NPS 0–10 -->
      <div class="v17-section-label">How likely are you to recommend us? (0 = not likely, 10 = extremely)</div>
      <div class="v17-scale-row" id="v17-nps-row">
        ${[0,1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="v17-scale-btn" onclick="window._v17SetNPS(${n},this)">${n}</button>`).join('')}
      </div>

      <!-- What could be improved -->
      <div class="v17-section-label">What could be improved?</div>
      <div class="v17-cat-grid" id="v17-improve-grid">
        ${['More jobs','Better pay filters','Faster loading','More safety info','Parent controls','AI answers','Notifications','Bug fixes'].map(c=>`<button class="v17-cat-btn" data-improve onclick="this.classList.toggle('active')">${c}</button>`).join('')}
      </div>

      <!-- How did you find us -->
      <div class="v17-section-label">How did you find TeenWork?</div>
      <div class="v17-radio-row" id="v17-findus-row">
        ${['Friend/family','Social media','School','Google','App store','Other'].map(r=>`<button class="v17-radio-btn" data-findus onclick="window._v17SetFindUs('${r}',this)">${r}</button>`).join('')}
      </div>

      <!-- Open comment -->
      <div class="v17-section-label">Anything else? Ideas, bugs, praise…</div>
      <textarea id="v17-erm-text" class="v17-erm-textarea" placeholder="Tell us anything — we read every review!"></textarea>

      <div class="v17-submit-row">
        <button onclick="window._v17SubmitEnhancedReview()" style="flex:1;background:linear-gradient(135deg,#2d6a4f,#52b788);color:#fff;border:none;padding:13px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(45,106,79,0.3);letter-spacing:.2px">Submit Review ⭐</button>
        <button onclick="document.getElementById('v17-enhanced-rating-modal').classList.remove('open')" style="padding:13px 16px;border-radius:10px;border:1.5px solid #cce8d4;background:#f8fdf9;font-family:'DM Sans',sans-serif;font-size:.9rem;cursor:pointer;color:#2d6a4f;font-weight:600">Skip</button>
      </div>
    </div>
    <div id="v17-erm-thanks" style="display:none;text-align:center;padding:2.5rem 1.5rem">
      <div style="font-size:3rem;margin-bottom:.8rem">🎉</div>
      <div style="font-family:'Fraunces',serif;font-size:1.3rem;color:var(--green);font-weight:700;margin-bottom:.5rem">Thank you!</div>
      <div style="font-size:.88rem;color:var(--muted);line-height:1.6">Your review has been saved and sent to the team. We appreciate your feedback!</div>
    </div>
  </div>`;
el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('open');});
document.body.appendChild(el);
}
const _STAR_LABELS=['','😟 Very poor','😕 Poor','😐 OK','😊 Good','🤩 Excellent!'];
window._v17SetStar=function(n){
_v17Stars=n;
document.querySelectorAll('.v17-star').forEach((s,i)=>s.classList.toggle('lit',i<n));
const lbl=document.getElementById('v17-star-label');
if(lbl)lbl.textContent=_STAR_LABELS[n]||'';
};
window._v17SetRecommend=function(val,btn){
_v17Recommend=val;
document.querySelectorAll('#v17-recommend-row .v17-radio-btn').forEach(b=>b.classList.remove('sel'));
btn.classList.add('sel');
};
window._v17SetNPS=function(val,btn){
_v17NPS=val;
document.querySelectorAll('#v17-nps-row .v17-scale-btn').forEach(b=>b.classList.remove('sel'));
btn.classList.add('sel');
};
window._v17SetFindUs=function(val,btn){
_v17FindUs=val;
document.querySelectorAll('#v17-findus-row .v17-radio-btn').forEach(b=>b.classList.remove('sel'));
btn.classList.add('sel');
};
window._v17SubmitEnhancedReview=async function(){
if(!_v17Stars){
if(typeof showToast==='function')showToast('Please pick a star rating first','info');
return;
}
const cats=Array.from(document.querySelectorAll('.v17-cat-btn.active:not([data-improve])')).map(b=>b.textContent);
const improvements=Array.from(document.querySelectorAll('[data-improve].active')).map(b=>b.textContent);
const text=document.getElementById('v17-erm-text')?.value.trim()||'';
const role=window.currentUser?.type||'visitor';
const name=window.currentUser?.name||'Anonymous';
const review={
name,rating:_v17Stars,categories:cats,improvements,
recommend:_v17Recommend,nps:_v17NPS,findUs:_v17FindUs,
body:text||(cats.length?'Liked: '+cats.join(', '):'No comment'),
date:new Date().toISOString().slice(0,10),
dateTime:new Date().toISOString(),
userType:role,source:'v17-enhanced-review'
};
try{
const rs=JSON.parse(localStorage.getItem('tw_v17_reviews')||'[]');
rs.unshift(review);
localStorage.setItem('tw_v17_reviews',JSON.stringify(rs.slice(0,300)));
const rs2=JSON.parse(localStorage.getItem('tw_v14_reviews')||'[]');
rs2.unshift(review);
localStorage.setItem('tw_v14_reviews',JSON.stringify(rs2.slice(0,300)));
}catch(e){}
if(typeof _adminSaveSupportMessage==='function'){
_adminSaveSupportMessage({
name,context:`⭐ v17 Review (${_v17Stars}/5 stars, NPS:${_v17NPS}, ${role})`,
body:`Rating: ${_v17Stars}/5\nNPS: ${_v17NPS}/10\nRecommend: ${_v17Recommend}\nFound us via: ${_v17FindUs}\nLiked: ${cats.join(', ')||'none'}\nImprove: ${improvements.join(', ')||'none'}\nComment: ${text||'none'}`,
email:window.currentUser?.email||'anonymous',userType:role,time:new Date().toISOString()
});
}
_v17GenerateAIReport(review);
document.getElementById('v17-erm-form').style.display='none';
document.getElementById('v17-erm-thanks').style.display='block';
setTimeout(()=>{
document.getElementById('v17-enhanced-rating-modal')?.classList.remove('open');
setTimeout(()=>{
document.getElementById('v17-erm-form').style.display='';
document.getElementById('v17-erm-thanks').style.display='none';
_v17Stars=0;_v17Recommend='';_v17NPS=0;_v17FindUs='';
document.querySelectorAll('.v17-star').forEach(s=>s.classList.remove('lit'));
document.querySelectorAll('.v17-cat-btn,.v17-radio-btn,.v17-scale-btn').forEach(b=>b.classList.remove('active','sel'));
const txt=document.getElementById('v17-erm-text');if(txt)txt.value='';
},500);
},2200);
if(typeof showToast==='function')showToast(`Thanks for your ${_v17Stars}⭐ review!`,'success');
};
async function _v17GenerateAIReport(review){
try{
const allReviews=JSON.parse(localStorage.getItem('tw_v17_reviews')||'[]');
if(allReviews.length<1)return;
const avgRating=(allReviews.reduce((s,r)=>s+(r.rating||0),0)/allReviews.length).toFixed(1);
const catCounts={};
allReviews.forEach(r=>(r.categories||[]).forEach(c=>{catCounts[c]=(catCounts[c]||0)+1;}));
const topCats=Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k).join(', ');
const prompt=`You are an analytics AI for TeenWork, a safe teen job platform. Here is a recent user review and stats. Write a brief 3-4 sentence insight report for the admin team.

Review: ${review.rating}/5 stars | NPS: ${review.nps}/10 | Recommend: ${review.recommend} | Found via: ${review.findUs}
Liked: ${(review.categories||[]).join(', ')||'none'} | Improve: ${(review.improvements||[]).join(', ')||'none'}
Comment: "${review.body}"

Overall stats: ${allReviews.length} total reviews, avg ${avgRating}/5, top liked: ${topCats}

Write an admin insight report in plain text (no markdown). Be concise and actionable.`;
const response=await fetch('https://api.anthropic.com/v1/messages',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
model:'claude-sonnet-4-20250514',max_tokens:400,
messages:[{role:'user',content:prompt}]
})
});
if(!response.ok)return;
const data=await response.json();
const aiText=data.content?.map(c=>c.text||'').join('')||'';
if(!aiText)return;
try{
const reports=JSON.parse(localStorage.getItem('tw_v17_ai_reports')||'[]');
reports.unshift({date:new Date().toISOString(),report:aiText,reviewCount:allReviews.length,avgRating});
localStorage.setItem('tw_v17_ai_reports',JSON.stringify(reports.slice(0,50)));
}catch(e){}
}catch(e){}
}
function _v17BuildReviewsPanel(){
if(document.getElementById('v17-reviews-panel'))return;
const el=document.createElement('div');
el.id='v17-reviews-panel';
el.innerHTML=`
  <div id="v17-reviews-inner">
    <div class="v17-rev-head">
      <h2>📊 All App Reviews</h2>
      <button onclick="document.getElementById('v17-reviews-panel').classList.remove('open')"
        style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:.9rem">✕</button>
    </div>
    <div class="v17-rev-body" id="v17-rev-body-content">
      <p style="color:var(--muted);font-size:.85rem">Loading reviews…</p>
    </div>
  </div>`;
el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('open');});
document.body.appendChild(el);
}
window._v17OpenReviews=function(){
_v17BuildReviewsPanel();
const panel=document.getElementById('v17-reviews-panel');
panel.classList.add('open');
const body=document.getElementById('v17-rev-body-content');
const reviews=[];
try{reviews.push(...JSON.parse(localStorage.getItem('tw_v17_reviews')||'[]'));}catch(e){}
try{
const old=JSON.parse(localStorage.getItem('tw_v14_reviews')||'[]');
old.forEach(r=>{if(!reviews.find(x=>x.dateTime===r.dateTime&&x.name===r.name))reviews.push(r);});
}catch(e){}
if(!reviews.length){
body.innerHTML=`<div style="text-align:center;padding:2rem;color:var(--muted)">
      <div style="font-size:2.5rem;margin-bottom:.5rem">📭</div>
      <p>No reviews yet. Be the first to rate the app!</p>
      <button onclick="document.getElementById('v17-reviews-panel').classList.remove('open');window._v17OpenEnhancedRating();" style="margin-top:1rem;background:var(--green);color:#fff;border:none;padding:10px 22px;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:700;cursor:pointer">⭐ Leave a Review</button>
    </div>`;
return;
}
const avg=(reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length).toFixed(1);
const starBar=(n)=>'★'.repeat(n)+'☆'.repeat(5-n);
const isAdmin=window.currentUser?.isAdmin||window.currentUser?.type==='admin';
const reports=[];
try{reports.push(...JSON.parse(localStorage.getItem('tw_v17_ai_reports')||'[]'));}catch(e){}
const latestReport=reports[0];
let html=`
  <div class="v17-avg-strip">
    <div>
      <div class="v17-avg-num">${avg}</div>
      <div style="font-size:.88rem;color:var(--amber)">${starBar(Math.round(parseFloat(avg)))}</div>
    </div>
    <div>
      <div style="font-size:.85rem;font-weight:700;color:var(--text)">${reviews.length} review${reviews.length!==1?'s':''}</div>
      <div style="font-size:.78rem;color:var(--muted);margin-top:2px">From real users</div>
    </div>
    <div style="margin-left:auto">
      <button onclick="document.getElementById('v17-reviews-panel').classList.remove('open');window._v17OpenEnhancedRating();" style="background:var(--green);color:#fff;border:none;padding:9px 18px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer">+ Add Yours</button>
    </div>
  </div>`;
if(isAdmin&&latestReport){
html+=`<div style="margin-bottom:1rem">
      <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--green);margin-bottom:6px">🤖 AI Admin Report · ${latestReport.date?.slice(0,10)||''}</div>
      <div class="v17-ai-report">${latestReport.report}</div>
    </div>`;
}
reviews.slice(0,50).forEach(r=>{
const stars=Math.max(1,Math.min(5,r.rating||1));
const cats=(r.categories||[]).join(', ');
const improve=(r.improvements||[]).join(', ');
html+=`<div class="v17-rev-card">
      <div class="v17-rev-stars">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</div>
      <div class="v17-rev-text">"${r.body||'No comment'}"</div>
      <div class="v17-rev-meta">
        <span><strong>${r.name||'Anonymous'}</strong></span>
        <span>${r.userType||'user'}</span>
        <span>${r.date||''}</span>
        ${r.recommend?`<span>👍 ${r.recommend}</span>`:''}
        ${r.nps!=null&&r.nps!==''?`<span>NPS: ${r.nps}/10</span>`:''}
      </div>
      ${cats?`<div style="font-size:.76rem;color:var(--muted);margin-top:5px">Liked: ${cats}</div>`:''}
      ${improve?`<div style="font-size:.76rem;color:var(--red);margin-top:2px">Improve: ${improve}</div>`:''}
    </div>`;
});
body.innerHTML=html;
};
window._v17OpenEnhancedRating=function(){
_v17BuildRatingModal();
_v17Stars=0;
document.querySelectorAll('.v17-star').forEach(s=>s.classList.remove('lit'));
const lbl=document.getElementById('v17-star-label');if(lbl)lbl.textContent='';
document.getElementById('v17-enhanced-rating-modal').classList.add('open');
};
function _v17MakeDraggable(el){
const THRESHOLD=6;
let startX,startY,startLeft,startBottom;
el._twDragged=false;
function getPos(){
const rect=el.getBoundingClientRect();
return{left:rect.left,bottom:window.innerHeight-rect.bottom};
}
function onDown(cx,cy){
el.setAttribute('data-tw-grab','1');
const pos=getPos();
startX=cx;startY=cy;
startLeft=pos.left;startBottom=pos.bottom;
el._twDragged=false;
el.style.transition='none';
el._twStartOnPic= !!(window.__twHitsPicture&&window.__twHitsPicture(pos.left,window.innerHeight-pos.bottom-el.offsetHeight,el.offsetWidth,el.offsetHeight,0));
}
function onMove(cx,cy){
const dx=cx-startX,dy=cy-startY;
if(!el._twDragged&&(Math.abs(dx)>THRESHOLD||Math.abs(dy)>THRESHOLD)){
el._twDragged=true;
el.classList.add('dragging');
}
if(!el._twDragged)return;
const W=window.innerWidth,H=window.innerHeight;
const elW=el.offsetWidth,elH=el.offsetHeight;
let newLeft=Math.max(8,Math.min(W-elW-8,startLeft+dx));
let newBottom=Math.max(80,Math.min(H-elH-8,startBottom-dy));
if(window.__twHitsPicture&& !el._twStartOnPic){
const lastL=isFinite(parseFloat(el.style.left))?parseFloat(el.style.left):startLeft;
const lastB=isFinite(parseFloat(el.style.bottom))?parseFloat(el.style.bottom):startBottom;
const free=(l,b)=> !window.__twHitsPicture(l,H-b-elH,elW,elH,18);
if(!free(newLeft,newBottom)){
if(free(newLeft,lastB)){newBottom=lastB;}
else if(free(lastL,newBottom)){newLeft=lastL;}
else{newLeft=lastL;newBottom=lastB;}
}
}
el.style.left=newLeft+'px';
el.style.bottom=newBottom+'px';
el.style.right='auto';
el.style.top='auto';
}
function onUp(){
el.removeAttribute('data-tw-grab');
el.style.transition='';
if(el._twDragged){
try{localStorage.setItem('tw_v17_fab_'+el.id,JSON.stringify({left:el.style.left,bottom:el.style.bottom}));}catch(e){}
}
setTimeout(()=>{
el._twDragged=false;
el.classList.remove('dragging');
},50);
}
try{
const saved=JSON.parse(localStorage.getItem('tw_v17_fab_'+el.id)||'null');
if(saved){el.style.left=saved.left;el.style.bottom=saved.bottom;el.style.right='auto';el.style.top='auto';}
}catch(e){}
el.addEventListener('mousedown',e=>{
onDown(e.clientX,e.clientY);
const mm=e2=>onMove(e2.clientX,e2.clientY);
const mu=()=>{onUp();document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);};
document.addEventListener('mousemove',mm);
document.addEventListener('mouseup',mu);
});
el.addEventListener('touchstart',e=>{const t=e.touches[0];onDown(t.clientX,t.clientY);},{passive:true});
el.addEventListener('touchmove',e=>{const t=e.touches[0];onMove(t.clientX,t.clientY);e.preventDefault();},{passive:false});
el.addEventListener('touchend',onUp);
}
window._v17MakeDraggable=_v17MakeDraggable;
function _v17InjectFABs(){
['v16-rate-fab','v16-support-fab','v14-feedback-fab','v15-feedback-fab'].forEach(id=>{
document.getElementById(id)?.remove();
});
const rateFab=document.createElement('button');
rateFab.innerHTML='⭐ Rate App';
rateFab.title='Rate & review TeenWork — drag to move';
rateFab.style.cssText=`
    position:fixed; right:16px; bottom:90px; z-index:9900;
    background:linear-gradient(135deg,#3a7d5c,#52b788);
    border:2px solid rgba(255,255,255,0.35);
    border-radius:50px; padding:10px 20px; font-size:.85rem; font-weight:700;
    color:#fff; cursor:grab; box-shadow:0 4px 14px rgba(45,106,79,0.4);
    display:flex; align-items:center; gap:7px; transition:box-shadow .2s,transform .15s;
    font-family:'DM Sans',sans-serif; touch-action:none; user-select:none;
    letter-spacing:.2px;`;
rateFab.addEventListener('click',()=>{
if(!rateFab._twDragged){
_v17BuildRatingModal();
window._v17OpenEnhancedRating();
}
});
document.body.appendChild(rateFab);
_v17MakeDraggable(rateFab);
window._twOpenSupport=function(){
try{
if(typeof openSupportModal==='function'){
openSupportModal('General Support','');
return;
}
}catch(e){}
document.getElementById('tw-sup-fallback')?.remove();
const ov=document.createElement('div');
ov.id='tw-sup-fallback';
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem';
ov.innerHTML=`
      <div style="background:#fff;border-radius:20px;padding:1.8rem;max-width:460px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.3);font-family:'DM Sans',sans-serif">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.2rem">
          <div style="width:42px;height:42px;background:#d8f3dc;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">💬</div>
          <div style="flex:1"><div style="font-size:1.05rem;font-weight:800;color:#2d6a4f">Contact Support</div><div style="font-size:.78rem;color:#888;margin-top:2px">We'll get back to you soon</div></div>
          <button onclick="document.getElementById('tw-sup-fallback').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#bbb;line-height:1;padding:4px">✕</button>
        </div>
        <textarea id="tw-sup-msg" rows="5" placeholder="Describe your issue or question…" style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:10px;font-size:.9rem;resize:vertical;outline:none;box-sizing:border-box;font-family:'DM Sans',sans-serif"></textarea>
        <div style="display:flex;gap:8px;margin-top:1rem">
          <button onclick="(function(){const m=document.getElementById('tw-sup-msg')?.value||'';window.location.href='mailto:ayaquarrierdraper@gmail.com?subject=TeenWork Support&body='+encodeURIComponent(m);document.getElementById('tw-sup-fallback').remove();})()" style="flex:1;background:linear-gradient(135deg,#2d6a4f,#52b788);color:#fff;border:none;padding:12px;border-radius:10px;font-size:.9rem;font-weight:700;cursor:pointer">📨 Send to Support</button>
          <button onclick="document.getElementById('tw-sup-fallback').remove()" style="padding:12px 16px;border-radius:10px;border:1.5px solid #ddd;background:#f5f5f5;font-size:.9rem;cursor:pointer;color:#888">Cancel</button>
        </div>
        <p style="font-size:.72rem;color:#9ca3af;margin-top:.8rem;text-align:center">Your message goes directly to the TeenWork admin team</p>
      </div>`;
ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
document.body.appendChild(ov);
};
const supFab=document.createElement('button');
supFab.id='v17-support-fab';
supFab.className='v16-fab';
supFab.innerHTML='💬 Help & Support';
supFab.title='Contact support — drag to move';
supFab.style.cssText=`
    position:fixed; right:16px; bottom:148px; z-index:9900;
    background:#fff; border:2px solid #2d6a4f;
    border-radius:50px; padding:10px 18px; font-size:.85rem; font-weight:700;
    color:#2d6a4f; cursor:grab; box-shadow:0 4px 14px rgba(45,106,79,.2);
    display:flex; align-items:center; gap:6px; transition:box-shadow .2s;
    font-family:'DM Sans',sans-serif; touch-action:none; user-select:none;`;
var _supTouchT=0,_supTouchX=0,_supTouchY=0;
supFab.addEventListener('touchstart',function(e){
_supTouchT=Date.now();_supTouchX=e.touches[0].clientX;_supTouchY=e.touches[0].clientY;
},{passive:true});
supFab.addEventListener('touchend',function(e){
var dt=Date.now()-_supTouchT,dx=Math.abs(e.changedTouches[0].clientX-_supTouchX),dy=Math.abs(e.changedTouches[0].clientY-_supTouchY);
if(dt<250&&dx<10&&dy<10){e.preventDefault();openSupportModal('General Support','');}
},{passive:false});
supFab.addEventListener('click',function(){
if(!supFab._twDragged)openSupportModal('General Support','');
});
document.body.appendChild(supFab);
_v17MakeDraggable(supFab);
_v17AddViewReviewsToAdmin();
}
function _v17AddViewReviewsToAdmin(){
const adminPanels=document.querySelectorAll('#admin-dashboard, #page-admin, .admin-panel');
adminPanels.forEach(panel=>{
if(!panel.querySelector('.v17-view-reviews-btn')){
const btn=document.createElement('button');
btn.className='v17-view-reviews-btn';
btn.textContent='📊 View All Reviews';
btn.style.cssText='background:var(--green);color:#fff;border:none;padding:9px 18px;border-radius:10px;font-family:"DM Sans",sans-serif;font-weight:700;cursor:pointer;margin:8px 4px;font-size:.85rem';
btn.onclick=()=>window._v17OpenReviews();
panel.prepend(btn);
}
});
}
function bootV17(){
_v17BuildRatingModal();
_v17BuildReviewsPanel();
_v17InjectFABs();
_bindSignOutButtons();
_bindAuthButtons();
_patchMoreDrawer();
window._v16OpenFeedback=window._v17OpenEnhancedRating;
setTimeout(()=>{
const rateFab=document.getElementById('v17-rate-fab');
if(rateFab){
rateFab.addEventListener('contextmenu',e=>{
e.preventDefault();
window._v17OpenReviews();
});
rateFab.title='Click: Rate App | Right-click or drag to view reviews';
}
},500);
const _origLaunch=window.launchDashboard;
if(_origLaunch){
window.launchDashboard=function(){
const result=_origLaunch.apply(this,arguments);
setTimeout(_bindSignOutButtons,300);
return result;
};
}
setTimeout(()=>{
_v17AddViewReviewsToAdmin();
const supportList=document.getElementById('admin-support-list')||document.getElementById('admin-messages-list');
if(supportList&& !document.getElementById('v17-admin-reviews-btn')){
const wrap=document.createElement('div');
wrap.id='v17-admin-reviews-btn';
wrap.style.cssText='padding:8px 0;margin-bottom:12px';
wrap.innerHTML=`<button onclick="window._v17OpenReviews()" style="background:var(--green);color:#fff;border:none;padding:9px 18px;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:700;cursor:pointer;font-size:.85rem;margin-right:8px">📊 View All App Reviews</button>
      <button onclick="window._v17GenerateAdminReport()" style="background:var(--blue);color:#fff;border:none;padding:9px 18px;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:700;cursor:pointer;font-size:.85rem">🤖 Generate AI Report</button>`;
supportList.before(wrap);
}
},1500);
}
window._v17GenerateAdminReport=async function(){
if(typeof showToast==='function')showToast('🤖 Generating AI report…','info');
const reviews=[];
try{reviews.push(...JSON.parse(localStorage.getItem('tw_v17_reviews')||'[]'));}catch(e){}
if(!reviews.length){if(typeof showToast==='function')showToast('No reviews to analyze yet','info');return;}
await _v17GenerateAIReport(reviews[0]);
if(typeof showToast==='function')showToast('✅ AI report generated! Open View Reviews to see it.','success');
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootV17);
else bootV17();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-15.js */
try{
(function v18(){
'use strict';
function _v18PatchImproveGrid(){
const grid=document.getElementById('v17-improve-grid');
if(!grid||grid.dataset.v18patched)return;
grid.dataset.v18patched='1';
const otherBtn=document.createElement('button');
otherBtn.className='v17-cat-btn';
otherBtn.setAttribute('data-improve','');
otherBtn.setAttribute('data-other','1');
otherBtn.textContent='✏️ Other…';
otherBtn.onclick=function(){
this.classList.toggle('active');
const wrap=document.getElementById('v18-other-improve-wrap');
if(wrap)wrap.classList.toggle('show',this.classList.contains('active'));
};
grid.appendChild(otherBtn);
const wrap=document.createElement('div');
wrap.id='v18-other-improve-wrap';
wrap.innerHTML='<input id="v18-other-improve-input" type="text" placeholder="Tell us what could be better…" maxlength="200">';
grid.parentNode.insertBefore(wrap,grid.nextSibling);
}
function _v18PatchFindUsRow(){
const row=document.getElementById('v17-findus-row');
if(!row||row.dataset.v18patched)return;
row.dataset.v18patched='1';
if(row.querySelector('[data-findus="AI"]'))return;
const aiBtn=document.createElement('button');
aiBtn.className='v17-radio-btn';
aiBtn.setAttribute('data-findus','AI');
aiBtn.textContent='🤖 AI / ChatGPT';
aiBtn.onclick=function(){window._v17SetFindUs('AI / ChatGPT',this);};
row.appendChild(aiBtn);
}
const _origV17Submit=window._v17SubmitEnhancedReview;
window._v17SubmitEnhancedReview=async function(){
const otherInput=document.getElementById('v18-other-improve-input');
if(otherInput&&otherInput.value.trim()){
const otherBtn=document.querySelector('[data-other="1"]');
if(otherBtn)otherBtn.setAttribute('data-other-text',otherInput.value.trim());
}
const _origImprovements=Array.from(document.querySelectorAll('[data-improve].active')).map(b=>{
if(b.getAttribute('data-other')==='1'){
const txt=b.getAttribute('data-other-text')||'Other';
return'Other: '+txt;
}
return b.textContent;
});
if(_origV17Submit){
window._v18TempImprovements=_origImprovements;
return _origV17Submit.apply(this,arguments);
}
};
function _v18FixSupportFAB(){
}
const V18_TEEN_MORE_CONSOLIDATED=[
{section:'📋 Work & Jobs',items:[
{icon:'📋',label:'Applications',tab:'ttab-applications'},
{icon:'📅',label:'Calendar',tab:'ttab-calendar'},
{icon:'⏱️',label:'Hours & Pay',tab:'ttab-worklog'},
{icon:'🎯',label:'Savings',tab:'ttab-savings'},
]},
{section:'🤖 AI & Learning',items:[
{icon:'🤖',label:'AI Coach',tab:'ttab-ai'},
{icon:'📚',label:'Lessons',tab:'ttab-lessons'},
]},
{section:'👤 Profile & Progress',items:[
{icon:'🏅',label:'Badges',tab:'ttab-badges'},
{icon:'📜',label:'Rec Letters',tab:'ttab-letters'},
{icon:'🛡️',label:'Verify',tab:'verify'},
{icon:'🗂️',label:'Portfolio',tab:'ttab-portfolio'},
]},
];
function _v18PatchMoreDrawer(){
if(window.NAV?.teen){
window.NAV.teen.more=V18_TEEN_MORE_CONSOLIDATED;
}
if(window.V17_TEEN_MORE){
window.V17_TEEN_MORE=V18_TEEN_MORE_CONSOLIDATED;
}
const _origMore=window.openMobileMoreDrawer;
window.openMobileMoreDrawer=function(){
const role=window.currentUser?.type||'teen';
document.getElementById('mobile-more-drawer')?.remove();
document.getElementById('mobile-more-scrim')?.remove();
document.getElementById('more-drawer')?.remove();
document.getElementById('more-scrim')?.remove();
if(role!=='teen'){
const inner=document.getElementById('mnavInner');
if(inner){
const btns=inner.querySelectorAll('.mnav-btn');
const moreBtn=Array.from(btns).find(b=>b.textContent.includes('More'));
if(moreBtn){moreBtn.click();return;}
}
if(_origMore)_origMore.apply(this,arguments);
return;
}
const scrim=document.createElement('div');
scrim.id='mobile-more-drawer-v18-scrim';
scrim.style.cssText='position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.4)';
const closeDrawer=()=>{scrim.remove();drawer.remove();};
scrim.onclick=closeDrawer;
document.body.appendChild(scrim);
const drawer=document.createElement('div');
drawer.id='mobile-more-drawer';
drawer.style.cssText='position:fixed;bottom:72px;left:0;right:0;z-index:2001;background:var(--card);border-radius:20px 20px 0 0;box-shadow:0 -8px 32px rgba(0,0,0,.18);padding:1.2rem 1rem 1.2rem;max-height:72vh;overflow-y:auto;font-family:"DM Sans",sans-serif';
let html='<div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 1rem"></div>';
V18_TEEN_MORE_CONSOLIDATED.forEach(section=>{
html+=`<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:8px;margin-top:4px">${section.section}</div>`;
html+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">';
section.items.forEach(item=>{
const action=item.tab==='verify'
?`if(typeof showVerifyPage==='function'){showVerifyPage();}else{if(typeof switchDashTab==='function')switchDashTab(null,'ttab-ai');}`
:`if(typeof switchDashTab==='function')switchDashTab(null,'${item.tab}');`;
html+=`<button onclick="document.getElementById('mobile-more-drawer-v18-scrim')?.remove();document.getElementById('mobile-more-drawer')?.remove();${action}" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border:1.5px solid var(--border);border-radius:12px;background:var(--bg);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s">
          <span style="font-size:1.3rem">${item.icon}</span>
          <span style="font-size:.66rem;font-weight:700;color:var(--text);text-align:center;line-height:1.2">${item.label}</span>
        </button>`;
});
html+='</div>';
});
drawer.innerHTML=html;
document.body.appendChild(drawer);
};
}
function _v18FixTourButtons(){
document.querySelectorAll('button').forEach(btn=>{
if(btn.textContent.includes('App Tour')||(btn.getAttribute('onclick')||'').includes('tourStart')){
btn.onclick=function(e){
e.preventDefault();
e.stopPropagation();
if(typeof tourStart==='function'){
tourStart(true);
}else{
setTimeout(()=>{if(typeof tourStart==='function')tourStart(true);},200);
}
};
}
});
}
function _v18StyleLessons(){
const style=document.createElement('style');
style.id='v18-lessons-style';
style.textContent=`
    /* Lesson cards: the roomy layout they had in AI Coach, now in Lessons (v44) */
    #ttab-lessons .lesson-card {
      padding: 8px 10px !important;
      min-height: 0 !important;
    }
    /* AI tab — prominent section label */
    #ttab-ai > .panel:first-child .panel-head,
    .ai-tools-section .panel-head {
      background: linear-gradient(135deg, var(--blue-pale), #eff6ff) !important;
    }
    /* AI features banner above lessons on AI tab */
    #v18-ai-banner { background:linear-gradient(135deg,var(--blue),#3b82f6);color:#fff;border-radius:12px;padding:10px 14px;margin-bottom:1rem;font-size:.85rem;font-weight:600;display:flex;align-items:center;gap:10px; }
  `;
if(!document.getElementById('v18-lessons-style'))document.head.appendChild(style);
setTimeout(()=>{
const aiTab=document.getElementById('ttab-ai');
if(aiTab&& !document.getElementById('v18-ai-banner')){
const banner=document.createElement('div');
banner.id='v18-ai-banner';
banner.innerHTML='<span>🤖 <strong>AI Coach</strong> — ask anything, practice interviews, learn your rights and get help with pay.</span><button type="button" id="v18-ai-banner-lessons" onclick="var b=document.querySelector(\'#twm-side [data-twm=ttab-lessons]\');if(b)b.click();else if(typeof switchDashTab===\'function\')switchDashTab(null,\'ttab-lessons\')" style="margin-left:auto;flex-shrink:0;background:#fff;color:var(--blue);border:0;border-radius:8px;padding:6px 12px;font:700 .8rem \'DM Sans\',sans-serif;cursor:pointer;white-space:nowrap">📚 Go to Lessons</button>';
aiTab.insertBefore(banner,aiTab.firstChild);
}
},300);
}
function _v18FixLessonClicks(){
setTimeout(()=>{
if(typeof renderLessonsGrid==='function'){
const _orig=window.renderLessonsGrid;
window.renderLessonsGrid=function(){
_orig.apply(this,arguments);
setTimeout(()=>{
document.querySelectorAll('[onclick*="openLesson"]').forEach(el=>{
if(typeof window.openLesson!=='function'){
console.warn('v18: openLesson not defined — lesson clicks may not work');
}
});
},100);
};
}
},500);
}
const _v18OrigDoLogin=window.doLogin;
window.doLogin=async function(){
const emailEl=document.getElementById('li-email');
const passEl=document.getElementById('li-password');
if(!emailEl|| !passEl){if(_v18OrigDoLogin)return _v18OrigDoLogin.apply(this,arguments);return;}
const email=emailEl.value.trim().toLowerCase();
const pass=passEl.value;
if(await _twAdminLogin(email,pass))return;
if(_v18OrigDoLogin)return _v18OrigDoLogin.apply(this,arguments);
};
function _v18FixBackButtons(){
document.querySelectorAll('#page-login a, #page-signup a, #page-login button, #page-signup button').forEach(el=>{
const txt=(el.textContent||'').trim();
if(txt.includes('Back to home')||txt.includes('← Back')){
el.onclick=function(e){
e.preventDefault();
e.stopPropagation();
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
const landing=document.getElementById('page-landing');
if(landing)landing.classList.add('active');
window.scrollTo(0,0);
};
}
if(txt==='Create account'&&el.closest('#page-login')){
el.onclick=function(e){
e.preventDefault();
e.stopPropagation();
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
const signup=document.getElementById('page-signup');
if(signup)signup.classList.add('active');
window.scrollTo(0,0);
};
}
});
}
function _v18FixSignupButtons(){
document.querySelectorAll('button').forEach(btn=>{
const txt=btn.textContent.trim();
const oc=btn.getAttribute('onclick')||'';
if(txt.includes("Sign Up")||txt.includes("It's Free")||oc.includes("gotoPage('signup')")){
btn.onclick=function(e){
e.preventDefault();
e.stopPropagation();
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
const signup=document.getElementById('page-signup');
if(signup){
signup.classList.add('active');
window.scrollTo(0,0);
if(typeof window._initSignupPlan==='function')setTimeout(window._initSignupPlan,50);
}
};
}
});
}
function _v18FixSupportLabel(){
document.querySelectorAll('button, a').forEach(el=>{
if(el.innerHTML&&el.innerHTML.includes('🆘')){
el.innerHTML=el.innerHTML.replace(/🆘\s*/g,'💬 ');
}
if(el.title&&el.title.includes('SOS')){
el.title=el.title.replace('SOS','Support');
}
});
const oldFab=document.getElementById('support-fab');
if(oldFab&&oldFab.innerHTML.includes('🆘')){
oldFab.innerHTML=oldFab.innerHTML.replace(/🆘/g,'💬');
if(oldFab.textContent.includes('Support'))oldFab.innerHTML='💬 Help & Support';
}
}
function _v18UpdateAILabels(){
document.querySelectorAll('.badge').forEach(el=>{
if(el.textContent.trim()==='Gemini AI')el.textContent='AI';
});
document.querySelectorAll('[id*="ai-chat"], [class*="ai-chat"]').forEach(el=>{
const badge=el.closest('.panel')?.querySelector('.badge-blue');
if(badge&&badge.textContent.includes('Gemini'))badge.textContent='AI';
});
}
function _v18Boot(){
_v18FixSupportLabel();
_v18FixTourButtons();
_v18FixBackButtons();
_v18FixSignupButtons();
_v18PatchMoreDrawer();
_v18StyleLessons();
_v18FixLessonClicks();
_v18UpdateAILabels();
const _ratingModal=document.getElementById('v17-enhanced-rating-modal');
if(_ratingModal){
new MutationObserver(()=>{
if(_ratingModal.classList.contains('open')){
_v18PatchImproveGrid();
_v18PatchFindUsRow();
}
}).observe(_ratingModal,{attributes:true,attributeFilter:['class']});
}
_v18FixSupportLabel();
const _origLaunch=window.launchDashboard;
if(_origLaunch){
window.launchDashboard=function(){
const result=_origLaunch.apply(this,arguments);
setTimeout(()=>{
_v18FixTourButtons();
_v18FixBackButtons();
_v18FixSupportFAB();
_v18FixSupportLabel();
_v18UpdateAILabels();
_v18StyleLessons();
},500);
return result;
};
}
setTimeout(_v18FixSupportFAB,1000);
setTimeout(_v18FixSupportFAB,2000);
setTimeout(()=>{
_v18FixTourButtons();
_v18FixBackButtons();
_v18FixSignupButtons();
_v18FixSupportLabel();
_v18UpdateAILabels();
},1500);
}
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',_v18Boot);
}else{
_v18Boot();
}
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-16.js */
try{
(function v18b(){
'use strict';
function _isPreLaunch(){
const cfg=typeof _adminGetConfig==='function'?_adminGetConfig():{};
return cfg.demoModeActive===false;
}
function _getAllRealReviews(){
const reviews=[];
try{reviews.push(...JSON.parse(localStorage.getItem('tw_v17_reviews')||'[]'));}catch(e){}
try{
const old=JSON.parse(localStorage.getItem('tw_v14_reviews')||'[]');
old.forEach(r=>{if(!reviews.find(x=>x.dateTime===r.dateTime&&x.name===r.name))reviews.push(r);});
}catch(e){}
return reviews.filter(r=>r.rating>=1);
}
function _getSignupCount(){
try{return parseInt(localStorage.getItem('tw_signup_count')||'0');}catch(e){return 0;}
}
function _incSignupCount(){
try{localStorage.setItem('tw_signup_count',String(_getSignupCount()+1));}catch(e){}
}
function _reorderLanding(){
const shell=document.querySelector('#page-landing .landing-shell');
if(!shell)return;
const lovedBlock=document.getElementById('featpack-testimonials');
const finalSection=shell.querySelector('.landing-final');
if(lovedBlock&&finalSection){
shell.insertBefore(lovedBlock,finalSection);
}
const communitySection=document.getElementById('tw-community-section');
if(communitySection&&finalSection){
shell.insertBefore(communitySection,finalSection);
}
}
function _hideFakeDataIfPreLaunch(){
if(!_isPreLaunch())return;
const statsSection=document.querySelector('#page-landing [id="stat-counter-teens"]')?.closest('section');
if(statsSection)statsSection.style.display='none';
const landingQuoteGrid=document.querySelector('#page-landing .landing-quote-grid');
if(landingQuoteGrid){
const section=landingQuoteGrid.closest('section');
if(section)section.style.display='none';
}
const lovedBlock=document.getElementById('featpack-testimonials');
if(lovedBlock)lovedBlock.style.display='none';
}
function _buildCommunitySection(){
const shell=document.querySelector('#page-landing .landing-shell');
if(!shell||document.getElementById('tw-community-section'))return;
const section=document.createElement('section');
section.id='tw-community-section';
section.className='landing-section';
shell.appendChild(section);
_renderCommunitySection();
}
function _renderCommunitySection(){
const section=document.getElementById('tw-community-section');
if(!section)return;
const reviews=_getAllRealReviews();
const signups=_getSignupCount();
const preLaunch=_isPreLaunch();
if(preLaunch&&reviews.length===0){
section.innerHTML=`
      <h2>What the community says</h2>
      <p class="sub">Be among the first to share your experience</p>
      <div id="tw-community-empty">
        <div style="font-size:2.5rem;margin-bottom:.6rem">💬</div>
        <div style="font-weight:700;color:var(--text);margin-bottom:.4rem">No reviews yet — be the first!</div>
        <p style="font-size:.84rem;line-height:1.5;max-width:320px;margin:0 auto .8rem">Sign up, use TeenWork, then leave a review from your dashboard. Reviews appear here for everyone to read.</p>
        <button onclick="document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById('page-signup')?.classList.add('active');window.scrollTo(0,0)"
          style="background:var(--green);color:#fff;border:none;padding:9px 22px;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:700;cursor:pointer;font-size:.88rem">
          🚀 Sign Up & Be the First
        </button>
      </div>`;
return;
}
const avg=reviews.length?(reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length).toFixed(1):null;
const shown=reviews.slice(0,3);
const starBar=n=>'★'.repeat(Math.max(0,Math.min(5,n||0)))+'☆'.repeat(Math.max(0,5-(n||0)));
const roleLabel=r=>({teen:'Teen',parent:'Parent',employer:'Employer',visitor:'User'}[r]||'User');
const escH=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let statsHtml='';
if(!preLaunch||reviews.length>0){
const cols=[];
if(signups>0)cols.push(`<div style="text-align:center"><div style="font-family:'Fraunces',serif;font-size:1.8rem;font-weight:900;color:var(--green)">${signups}</div><div style="font-size:.76rem;color:var(--muted);font-weight:600">People signed up</div></div>`);
if(reviews.length>0)cols.push(`<div style="text-align:center"><div style="font-family:'Fraunces',serif;font-size:1.8rem;font-weight:900;color:var(--amber)">${reviews.length}</div><div style="font-size:.76rem;color:var(--muted);font-weight:600">Reviews</div></div>`);
if(avg)cols.push(`<div style="text-align:center"><div style="font-family:'Fraunces',serif;font-size:1.8rem;font-weight:900;color:var(--green)">${avg}⭐</div><div style="font-size:.76rem;color:var(--muted);font-weight:600">Avg rating</div></div>`);
if(cols.length)statsHtml=`<div style="display:flex;gap:2rem;justify-content:center;margin-bottom:1.2rem;flex-wrap:wrap">${cols.join('')}</div>`;
}
const cardsHtml=shown.map(r=>`
    <div class="tw-review-card-landing">
      <div class="tw-rc-stars">${starBar(r.rating)}</div>
      <div class="tw-rc-body">"${escH(r.body||'No comment')}"</div>
      <div class="tw-rc-author">— ${escH(r.name||'Anonymous')}</div>
      <div class="tw-rc-role">${roleLabel(r.userType)}</div>
    </div>`).join('');
const seeAllBtn=reviews.length>3
?`<button id="tw-see-all-reviews-btn" onclick="_twOpenAllReviews()">See all ${reviews.length} reviews →</button>`
:'';
section.innerHTML=`
    <h2>What the community says</h2>
    <p class="sub">${reviews.length} real review${reviews.length!==1?'s':''} from teens, parents & employers</p>
    ${statsHtml}
    <div id="tw-reviews-grid">${cardsHtml}</div>
    ${seeAllBtn}
    <div style="text-align:center;margin-top:1rem;font-size:.8rem;color:var(--muted)">
      Have an account? <button onclick="window._v17OpenEnhancedRating&&window._v17OpenEnhancedRating()" style="background:none;border:none;color:var(--green);font-weight:700;cursor:pointer;font-size:.8rem">Leave a review →</button>
    </div>`;
}
function _buildAllReviewsPanel(){
if(document.getElementById('tw-all-reviews-panel'))return;
const panel=document.createElement('div');
panel.id='tw-all-reviews-panel';
panel.innerHTML=`
    <div id="tw-all-reviews-inner">
      <div id="tw-all-reviews-head">
        <h3>📋 All Reviews</h3>
        <button onclick="document.getElementById('tw-all-reviews-panel').classList.remove('open')"
          style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--muted)">✕</button>
      </div>
      <div id="tw-all-reviews-filters">
        <button class="tw-filter-btn active" data-filter="all" onclick="_twFilterReviews('all',this)">All</button>
        <button class="tw-filter-btn" data-filter="teen" onclick="_twFilterReviews('teen',this)">🧑‍💼 Teens</button>
        <button class="tw-filter-btn" data-filter="parent" onclick="_twFilterReviews('parent',this)">👪 Parents</button>
        <button class="tw-filter-btn" data-filter="employer" onclick="_twFilterReviews('employer',this)">🏢 Employers</button>
        <button class="tw-filter-btn" data-filter="5" onclick="_twFilterReviews('5',this)">⭐⭐⭐⭐⭐ 5 star</button>
        <button class="tw-filter-btn" data-filter="recent" onclick="_twFilterReviews('recent',this)">🕐 Recent</button>
      </div>
      <div id="tw-all-reviews-list"></div>
    </div>`;
panel.addEventListener('click',e=>{if(e.target===panel)panel.classList.remove('open');});
document.body.appendChild(panel);
}
window._twOpenAllReviews=function(){
_buildAllReviewsPanel();
document.getElementById('tw-all-reviews-panel').classList.add('open');
_twFilterReviews('all',document.querySelector('[data-filter="all"]'));
};
window._twFilterReviews=function(filter,btn){
document.querySelectorAll('.tw-filter-btn').forEach(b=>b.classList.remove('active'));
if(btn)btn.classList.add('active');
let reviews=_getAllRealReviews();
if(filter==='teen'||filter==='parent'||filter==='employer'){
reviews=reviews.filter(r=>r.userType===filter);
}else if(filter==='5'){
reviews=reviews.filter(r=>r.rating===5);
}else if(filter==='recent'){
reviews=reviews.sort((a,b)=>(b.dateTime||'').localeCompare(a.dateTime||'')).slice(0,20);
}
const escH=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const starBar=n=>'★'.repeat(Math.max(0,Math.min(5,n||0)))+'☆'.repeat(Math.max(0,5-(n||0)));
const roleLabel=r=>({teen:'Teen',parent:'Parent',employer:'Employer',visitor:'User'}[r]||'User');
const list=document.getElementById('tw-all-reviews-list');
if(!list)return;
if(!reviews.length){
list.innerHTML=`<div style="text-align:center;padding:2rem;color:var(--muted)">No reviews match this filter.</div>`;
return;
}
list.innerHTML=reviews.map(r=>`
    <div class="tw-review-card-landing">
      <div class="tw-rc-stars">${starBar(r.rating)}</div>
      <div class="tw-rc-body">"${escH(r.body||'No comment')}"</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
        <div>
          <div class="tw-rc-author">— ${escH(r.name||'Anonymous')}</div>
          <div class="tw-rc-role">${roleLabel(r.userType)} · ${r.date||''}</div>
        </div>
      </div>
    </div>`).join('');
};
function _v18PatchRateModalShare(){
const modal=document.getElementById('v17-enhanced-rating-modal');
if(!modal||modal.dataset.sharePatched)return;
modal.dataset.sharePatched='1';
const obs=new MutationObserver(()=>{
const form=document.getElementById('v17-erm-form');
if(form&& !document.getElementById('v18-share-section')){
const shareSection=document.createElement('div');
shareSection.id='v18-share-section';
shareSection.innerHTML=`
        <div class="share-label">📣 Help spread the word!</div>
        <p style="font-size:.8rem;color:var(--muted);margin-bottom:8px;line-height:1.4">Know someone who'd like TeenWork? Send them your link. It's free for them too.</p>
        <button type="button" class="tw-share-btn" onclick="twShare({source:'rate',sheet:true})">
          📣 Share TeenWork
        </button>`;
form.appendChild(shareSection);
}
});
obs.observe(modal,{attributes:true,attributeFilter:['class']});
}
window._twShareNative=function(){
const text=`TeenWork — safe local jobs for teens with parent oversight & AI safety. Check it out!`;
const url=window.location.href;
if(navigator.share){
navigator.share({title:'TeenWork',text,url}).catch(()=>{});
}else{
_twShareCopy();
}
};
window._twShareCopy=function(){
const url=window.location.href;
navigator.clipboard?.writeText(url+'\n\nTeenWork — safe local jobs for teens!')
.then(()=>{if(typeof showToast==='function')showToast('Link copied! Share it with friends 🎉','success');})
.catch(()=>{if(typeof showToast==='function')showToast('Copy the URL from your browser bar','info');});
};
window._twSubmitShareQuote=function(){
const quote=document.getElementById('v18-share-quote')?.value.trim();
if(!quote){if(typeof showToast==='function')showToast('Please write a quote first','info');return;}
const role=window.currentUser?.type||'visitor';
const name=window.currentUser?.name||'Anonymous';
const review={
name,rating:5,
body:quote,
categories:['shared'],
userType:role,
date:new Date().toISOString().slice(0,10),
dateTime:new Date().toISOString(),
source:'share-quote',
recommend:'Definitely yes'
};
try{
const rs=JSON.parse(localStorage.getItem('tw_v17_reviews')||'[]');
rs.unshift(review);
localStorage.setItem('tw_v17_reviews',JSON.stringify(rs.slice(0,300)));
}catch(e){}
_renderCommunitySection();
if(typeof showToast==='function')showToast('🎉 Your quote is now on the community page!','success');
const wrap=document.getElementById('v18-share-quote-wrap');
if(wrap)wrap.style.display='none';
const inp=document.getElementById('v18-share-quote');
if(inp)inp.value='';
};
(function _trackSignups(){
const _origSignup=window.doSignup;
if(!_origSignup)return;
window.doSignup=async function(){
const result=await _origSignup.apply(this,arguments);
_incSignupCount();
return result;
};
})();
const _origV17SubmitB=window._v17SubmitEnhancedReview;
window._v17SubmitEnhancedReview=async function(){
if(_origV17SubmitB)await _origV17SubmitB.apply(this,arguments);
setTimeout(_renderCommunitySection,2500);
};
function _bootV18b(){
_buildCommunitySection();
_hideFakeDataIfPreLaunch();
setTimeout(()=>{
_reorderLanding();
_v18PatchRateModalShare();
_renderCommunitySection();
if(_isPreLaunch()){
const loved=document.getElementById('featpack-testimonials');
if(loved)loved.style.display='none';
}
},600);
const origGoto=window.gotoPage;
if(origGoto){
window.gotoPage=function(page){
origGoto.apply(this,arguments);
if(page==='landing'){
setTimeout(()=>{
_hideFakeDataIfPreLaunch();
_reorderLanding();
_renderCommunitySection();
if(_isPreLaunch()){
const loved=document.getElementById('featpack-testimonials');
if(loved)loved.style.display='none';
}
},150);
}
};
}
}
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',_bootV18b);
}else{
_bootV18b();
}
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-17.js */
try{
(function(){
var _origSelectType=(typeof window.selectType==='function')?window.selectType:null;
window.selectType=function(type){
if(_origSelectType){try{_origSelectType(type);}catch(e){console.warn('selectType error',e);}}
document.querySelectorAll('.type-btn').forEach(function(b){b.classList.remove('selected');});
var picked=document.getElementById('type-'+type);
if(picked)picked.classList.add('selected');
document.querySelectorAll('.extra-fields').forEach(function(f){f.classList.remove('show');});
var fields=document.getElementById(type+'-fields');
if(fields)fields.classList.add('show');
if(type!=='parent'){
var pv=document.getElementById('parent-verify-section');
if(pv)pv.style.display='none';
}
var alertEl=document.getElementById('su-alert');
if(alertEl)alertEl.className='alert';
};
function _rebindTypeBtns(){
['teen','employer','parent'].forEach(function(type){
var btn=document.getElementById('type-'+type);
if(!btn)return;
var fresh=btn.cloneNode(true);
fresh.style.cursor='pointer';
(function(t){fresh.addEventListener('click',function(e){
e.preventDefault();e.stopPropagation();window.selectType(t);
});})(type);
btn.parentNode.replaceChild(fresh,btn);
});
}
_rebindTypeBtns();
[300,800,1500,2500].forEach(function(d){setTimeout(_rebindTypeBtns,d);});
(function(){
var _base=window.gotoPage;
window.gotoPage=function(page){
if(_base)_base.apply(this,arguments);
if(page==='signup'){
setTimeout(_rebindTypeBtns,200);
setTimeout(_injectProInfo,350);
}
};
})();
function _injectProInfo(){
var proPrice=document.getElementById('su-plan-pro-price');
if(!proPrice||document.getElementById('v24-pro-info'))return;
var box=document.createElement('div');
box.id='v24-pro-info';
box.style.cssText='margin-top:10px;padding:11px 13px;background:linear-gradient(135deg,#f0fdf4,#d8f3dc);border:1.5px solid #52b788;border-radius:10px;font-family:"DM Sans",sans-serif';
box.innerHTML=
'<div style="font-size:.78rem;font-weight:800;color:#2d6a4f;margin-bottom:6px;display:flex;flex-wrap:wrap;align-items:center;gap:6px">'+
'<span style="background:#2d6a4f;color:#fff;border-radius:5px;padding:1px 7px;font-size:.68rem;letter-spacing:.03em;white-space:nowrap">PRO</span>'+
'<span>Free during early access \uD83C\uDF89</span></div>'+
'<ul style="list-style:none;margin:0;padding:0;font-size:.78rem;color:#1a5c3a;line-height:1.6">'+
'<li>\u2705 More AI help (500 a day)</li><li>\u2705 AI Resume Builder</li>'+
'<li>\u2705 Pitch AI for applications</li><li>\u2705 Wage Coach</li><li>\u2705 Everything in Free</li>'+
'</ul>';
proPrice.parentNode.insertBefore(box,proPrice.nextSibling);
}
setTimeout(_injectProInfo,700);
window._twOpenSupport=function(){
var existing=document.getElementById('tw-sup-fallback');
if(existing)existing.remove();
var ov=document.createElement('div');
ov.id='tw-sup-fallback';
ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:999999;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:"DM Sans",sans-serif';
ov.innerHTML=
'<div style="background:#fff;border-radius:20px;padding:1.8rem;max-width:460px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.28)">'+
'<div style="display:flex;align-items:center;gap:12px;margin-bottom:1.2rem">'+
'<div style="width:44px;height:44px;background:#d8f3dc;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">\uD83D\uDCAC</div>'+
'<div style="flex:1"><div style="font-size:1.05rem;font-weight:800;color:#2d6a4f">Contact Support</div>'+
'<div style="font-size:.78rem;color:#999;margin-top:2px">We read every message and reply fast</div></div>'+
'<button id="tw-sc" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#bbb;line-height:1;padding:4px">\u2715</button></div>'+
'<textarea id="tw-sm" rows="5" placeholder="Describe your issue or question \u2014 we\'ll get back to you soon\u2026" '+
'style="width:100%;padding:10px 12px;border:1.5px solid #d8f3dc;border-radius:10px;font-size:.9rem;resize:vertical;outline:none;box-sizing:border-box;font-family:\'DM Sans\',sans-serif;color:#222;line-height:1.5"></textarea>'+
'<div style="display:flex;gap:8px;margin-top:1rem">'+
'<button id="tw-ss" style="flex:1;background:linear-gradient(135deg,#2d6a4f,#52b788);color:#fff;border:none;padding:13px;border-radius:10px;font-size:.92rem;font-weight:800;cursor:pointer">\uD83D\uDCE8 Send to Support</button>'+
'<button id="tw-sca" style="padding:13px 16px;border-radius:10px;border:1.5px solid #d8f3dc;background:#f8fdf9;font-size:.9rem;cursor:pointer;color:#2d6a4f;font-weight:600">Cancel</button>'+
'</div>'+
'<p style="font-size:.72rem;color:#bbb;margin-top:.8rem;text-align:center">Your message goes directly to the TeenWork admin team</p>'+
'</div>';
document.body.appendChild(ov);
function _rm(){ov.remove();}
document.getElementById('tw-sc').onclick=_rm;
document.getElementById('tw-sca').onclick=_rm;
document.getElementById('tw-ss').onclick=function(){
var msg=(document.getElementById('tw-sm')&&document.getElementById('tw-sm').value)||'';
if(typeof _adminSaveSupportMessage==='function'){
_adminSaveSupportMessage({name:(window.currentUser&&window.currentUser.name)||'Anonymous',context:'General Support',body:msg,email:(window.currentUser&&window.currentUser.email)||'unknown',userType:(window.currentUser&&window.currentUser.type)||'visitor',time:new Date().toISOString()});
}
document.getElementById('tw-ss').textContent='✅ Sent!';
setTimeout(_rm,1800);
};
ov.addEventListener('click',function(e){if(e.target===ov)_rm();});
var ta=document.getElementById('tw-sm');
if(ta){ta.addEventListener('focus',function(){this.style.borderColor='#2d6a4f';});
ta.addEventListener('blur',function(){this.style.borderColor='#d8f3dc';});}
};
function _rewireSupportFAB(){
var fab=document.getElementById('v17-support-fab');
if(!fab)return;
if(fab.classList.contains('dragging')||fab._twDragged||fab.getAttribute('data-tw-grab')==='1')return;
var fresh=fab.cloneNode(false);
fresh.innerHTML='\uD83D\uDCAC Help & Support';
fresh.removeAttribute('onclick');
var _touchStartTime=0;
var _touchStartX=0;
var _touchStartY=0;
fresh.addEventListener('touchstart',function(e){
_touchStartTime=Date.now();
_touchStartX=e.touches[0].clientX;
_touchStartY=e.touches[0].clientY;
},{passive:true});
fresh.addEventListener('touchend',function(e){
var dt=Date.now()-_touchStartTime;
var dx=Math.abs(e.changedTouches[0].clientX-_touchStartX);
var dy=Math.abs(e.changedTouches[0].clientY-_touchStartY);
if(dt<250&&dx<10&&dy<10){
e.preventDefault();
window._twOpenSupport();
}
},{passive:false});
fresh.addEventListener('click',function(e){
if(!fresh._twDragged)window._twOpenSupport();
});
fab.parentNode.replaceChild(fresh,fab);
if(typeof _v17MakeDraggable==='function')_v17MakeDraggable(fresh);
}
setTimeout(function(){
window._v18FixSupportFAB=function(){};
},50);
[600,1300,2500,4500].forEach(function(d){setTimeout(_rewireSupportFAB,d);});
function _styleRateFAB(){
var fab=document.getElementById('v17-rate-fab');
if(!fab)return;
fab.style.setProperty('background','linear-gradient(135deg,#1b5e3b,#2e9e65)','important');
fab.style.setProperty('border','2px solid rgba(255,255,255,0.32)','important');
fab.style.setProperty('box-shadow','0 4px 18px rgba(27,94,59,0.5)','important');
fab.style.setProperty('color','#ffffff','important');
fab.style.setProperty('font-weight','800','important');
}
[500,1800,3200].forEach(function(d){setTimeout(_styleRateFAB,d);});
})();
(function(){
var FAB_IDS=['v17-support-fab','v16-rate-fab','v17-rate-fab','v16-support-fab'];
var MIN_PIC=60;
var CLASS='tw-fab-vanish';
var st=document.createElement('style');
st.id='tw37-fab-style';
st.textContent=
'.'+CLASS+'{opacity:0!important;visibility:hidden!important;pointer-events:none!important;}'+
'[data-tw-fab="1"]{transition:opacity .15s ease;}';
document.head.appendChild(st);
function killOldPanel(){
var p=document.getElementById('tw-hero-side-btns');if(p)p.remove();
document.querySelectorAll('.tw-fab-hidden').forEach(function(el){el.classList.remove('tw-fab-hidden');});
}
function shown(el){
if(!el)return false;
var cs=getComputedStyle(el);
if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)===0)return false;
return true;
}
var LABEL_RE= /help\s*&\s*support|rate\s*app/i;
function floatingButtons(){
var out=[];
document.querySelectorAll('body > button, body > a').forEach(function(el){
var tagged=el.getAttribute('data-tw-fab')==='1';
if(!tagged&&FAB_IDS.indexOf(el.id)=== -1&& !LABEL_RE.test(el.textContent||''))return;
if(getComputedStyle(el).position!=='fixed')return;
el.setAttribute('data-tw-fab','1');
out.push(el);
});
return out;
}
function pictureRects(){
var els=[];
var hero=document.getElementById('tw-hero-outer');
if(hero)els.push(hero);
document.querySelectorAll('img').forEach(function(im){els.push(im);});
var out=[];
els.forEach(function(el){
var r=el.getBoundingClientRect();
if(r.width<MIN_PIC||r.height<MIN_PIC)return;
if(r.bottom<=0||r.top>=window.innerHeight)return;
if(el.closest('.tw-fab-keep'))return;
var cs=getComputedStyle(el);
if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)===0)return;
out.push({left:r.left,top:r.top,right:r.right,bottom:r.bottom});
});
return out;
}
window.__twHitsPicture=function(left,top,w,h,margin){
var m=margin||0;
return pictureRects().some(function(p){
return left<p.right+m&&left+w>p.left-m&&top<p.bottom+m&&top+h>p.top-m;
});
};
function overlaps(a,b){
return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
}
function check(){
killOldPanel();
var pics=pictureRects().map(function(p){
return{left:p.left+4,top:p.top+4,right:p.right-4,bottom:p.bottom-4};
});
floatingButtons().forEach(function(fab){
var fr=fab.getBoundingClientRect();
if(fr.width===0&&fr.height===0){fab.classList.remove(CLASS);return;}
var over=pics.some(function(p){return overlaps(fr,p);});
if(over)fab.classList.add(CLASS);else fab.classList.remove(CLASS);
});
}
var queued=false;
function soon(){
if(queued)return;queued=true;
requestAnimationFrame(function(){queued=false;check();});
}
window.addEventListener('scroll',soon,{passive:true,capture:true});
window.addEventListener('resize',soon,{passive:true});
window.addEventListener('orientationchange',soon,{passive:true});
document.addEventListener('pointermove',soon,{passive:true});
document.addEventListener('pointerup',soon,{passive:true});
document.addEventListener('click',function(){setTimeout(soon,50);setTimeout(soon,400);},true);
window.addEventListener('load',function(){soon();setTimeout(soon,500);setTimeout(soon,1500);});
setInterval(check,400);
check();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-18.js */
try{
(function(){
'use strict';
function cu(){try{return(typeof currentUser!=='undefined'&&currentUser)||window.currentUser||null;}catch(e){return null;}}
var STEPS={
teen:[
{icon:'👋',title:'Welcome to TeenWork!',body:"Here's a quick tour of where everything lives. Use Next to move along, or Skip tour any time."},
{find:['Jobs'],icon:'🔍',title:'Jobs',body:'Browse real jobs near you, filtered for your age. Tap a job to apply — a parent approves it before anything moves forward.'},
{find:['Work'],icon:'💼',title:'Work',body:'Your hours log, calendar, applications and earnings all live here.'},
{find:['Chat','Grow'],icon:'💬',title:'Chat & Grow',body:'Keep employer conversations in the app. AI screening can miss things or be unavailable; parents do not automatically see chats. Lessons and the AI coach can help you prepare.'},
{find:['Account'],icon:'👤',title:'Account',body:'Your profile, badges and settings. A complete profile gets more employers looking at you.'},
{icon:'🎉',title:"You're all set!",body:'You can replay this tour any time with the Tour button on your dashboard. Good luck finding your first job! 💚'}
],
parent:[
{icon:'👪',title:'Welcome, parent!',body:"This is your oversight center. Here's a quick look at the key places. Use Next, or Skip tour any time."},
{find:['Home'],icon:'🏠',title:'Home',body:"A snapshot of your teen's activity, hours and anything waiting on you."},
{find:['Approve','Safety'],icon:'✅',title:'Approvals',body:"When your teen applies for a job it shows up for your OK first. Review the employer and job together; identity and background screening are not available."},
{find:['Safety'],icon:'🛡️',title:'Safety & controls',body:'Set hour limits, review flagged messages and safety alerts.'},
{find:['Chat','Updates'],icon:'💬',title:'Messages & updates',body:'Read your teen\'s conversations with employers and see the latest updates.'},
{icon:'✨',title:"You're ready!",body:'You can replay this tour any time with the App Tour button. Stay involved as your teen builds work experience. No app can guarantee safety. 💚'}
],
employer:[
{icon:'🏢',title:'Welcome, employer!',body:"Here's a quick tour of your hiring tools. Use Next, or Skip tour any time."},
{find:['Post','Pipeline'],icon:'📋',title:'Post a job',body:'Add the title, pay, schedule and age requirements. Every post is checked for child labor law compliance before it goes live.'},
{find:['Hiring','Comms'],icon:'👥',title:'Applicants',body:'Review teens who applied, see their badges and ratings, and move them through your hiring stages.'},
{find:['Chat','Comms'],icon:'💬',title:'Messages',body:'Message applicants inside the app — no outside contact info needed.'},
{find:['Grow'],icon:'📊',title:'Grow',body:'Track your hiring results and get tips for attracting great teens.'},
{icon:'✅',title:'Ready to hire!',body:'You can replay this tour any time from your dashboard. Every teen is parent-approved, so you can focus on finding the right fit. 💚'}
]
};
var state={steps:[],idx:0,role:'teen',open:false};
var PAD=8;
function userKey(){
var u=cu()||{};
return'tw_tour34_'+(u.email||'guest');
}
function isDone(){try{return!!localStorage.getItem(userKey());}catch(e){return false;}}
function removeOld(){
['tw-tour-overlay','tw-tour-style','v14-tour-overlay'].forEach(function(id){
var el=document.getElementById(id);if(el)el.remove();
});
var ob=document.getElementById('onboarding-modal');if(ob)ob.classList.remove('open');
}
function isVisible(el){
if(!el)return false;
var r=el.getBoundingClientRect(),s=getComputedStyle(el);
return r.width>4&&r.height>4&&s.visibility!=='hidden'&&s.display!=='none';
}
function findTarget(step){
if(!step.find)return null;
var pool=Array.prototype.slice.call(document.querySelectorAll('[data-tour-key], .mnav-btn, .grp-tab'));
for(var i=0;i<step.find.length;i++){
var label=step.find[i].toLowerCase();
for(var j=0;j<pool.length;j++){
var t=((pool[j].getAttribute('data-tour-key')||'')+' '+(pool[j].textContent||'')).toLowerCase();
if(t.indexOf(label)!== -1&&isVisible(pool[j]))return pool[j];
}
}
return null;
}
function injectStyle(){
if(document.getElementById('tw34-tour-style'))return;
var st=document.createElement('style');
st.id='tw34-tour-style';
st.textContent=
'#tw34-tour{position:fixed;inset:0;z-index:2147483000;font-family:"DM Sans",sans-serif}'+
'#tw34-scrim{position:absolute;inset:0;background:rgba(0,0,0,.55)}'+
'#tw34-hole{position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.55);pointer-events:none;display:none;transition:all .25s ease}'+
'#tw34-card{position:fixed;box-sizing:border-box;width:min(330px,calc(100vw - 24px));max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow-y:auto;background:#fff;color:#1c1c1c;border-radius:16px;padding:18px 18px 14px;box-shadow:0 10px 40px rgba(0,0,0,.3)}'+
'#tw34-card .tw34-step{font-size:.72rem;font-weight:700;color:#6b7280;letter-spacing:.4px;text-transform:uppercase}'+
'#tw34-card .tw34-dots{display:flex;gap:5px;margin:6px 0 10px}'+
'#tw34-card .tw34-dot{width:7px;height:7px;border-radius:50%;background:#d1d5db}'+
'#tw34-card .tw34-dot.on{background:#2d6a4f}'+
'#tw34-card h3{margin:0 0 6px;font-size:1.05rem;font-weight:800;color:#1b4332}'+
'#tw34-card p{margin:0 0 14px;font-size:.9rem;line-height:1.55;color:#4b5563}'+
'#tw34-card .tw34-btns{display:flex;flex-wrap:wrap;gap:8px;align-items:center}'+
'#tw34-card button{font-family:inherit;font-size:.9rem;font-weight:700;border-radius:10px;cursor:pointer;padding:10px 16px;min-height:42px}'+
'#tw34-card .tw34-next{background:#2d6a4f;color:#fff;border:none;flex:1 1 110px}'+
'#tw34-card .tw34-back{background:#fff;color:#2d6a4f;border:1.5px solid #2d6a4f}'+
'#tw34-card .tw34-skip{background:none;border:none;color:#6b7280;font-weight:600;margin-left:auto;text-decoration:underline}';
document.head.appendChild(st);
}
function build(){
if(document.getElementById('tw34-tour'))return;
injectStyle();
var ov=document.createElement('div');
ov.id='tw34-tour';
ov.setAttribute('role','dialog');
ov.setAttribute('aria-modal','true');
ov.setAttribute('aria-label','App tour');
ov.innerHTML='<div id="tw34-scrim"></div><div id="tw34-hole"></div><div id="tw34-card"></div>';
document.body.appendChild(ov);
}
function clamp(v,lo,hi){return Math.max(lo,Math.min(v,hi));}
function place(card,rect){
var vw=window.innerWidth,vh=window.innerHeight,m=12;
card.style.left='0px';card.style.top='0px';
var w=card.offsetWidth,h=card.offsetHeight,top,left;
if(!rect){
top=(vh-h)/2;left=(vw-w)/2;
}else{
var below=vh-(rect.bottom+PAD+14),above=rect.top-PAD-14;
if(below>=h)top=rect.bottom+PAD+14;
else if(above>=h)top=rect.top-PAD-14-h;
else top=(rect.top+rect.height/2<vh/2)?vh-h-m:m;
left=rect.left+rect.width/2-w/2;
}
card.style.top=clamp(top,m,Math.max(m,vh-h-m))+'px';
card.style.left=clamp(left,m,Math.max(m,vw-w-m))+'px';
}
function render(){
var step=state.steps[state.idx];
if(!step){finish();return;}
var card=document.getElementById('tw34-card');
var hole=document.getElementById('tw34-hole');
var scrim=document.getElementById('tw34-scrim');
if(!card)return;
var total=state.steps.length,last=state.idx===total-1;
var dots='';
for(var i=0;i<total;i++)dots+='<div class="tw34-dot'+(i===state.idx?' on':'')+'"></div>';
card.innerHTML=
'<div class="tw34-step">Step '+(state.idx+1)+' of '+total+'</div>'+
'<div class="tw34-dots">'+dots+'</div>'+
'<h3>'+(step.icon||'')+' '+step.title+'</h3>'+
'<p>'+step.body+'</p>'+
'<div class="tw34-btns">'+
(state.idx>0?'<button type="button" class="tw34-back" id="tw34-back">← Back</button>':'')+
'<button type="button" class="tw34-next" id="tw34-next">'+(last?'🎉 Done':'Next →')+'</button>'+
(last?'':'<button type="button" class="tw34-skip" id="tw34-skip">Skip tour</button>')+
'</div>';
var b;
if((b=document.getElementById('tw34-next')))b.onclick=next;
if((b=document.getElementById('tw34-back')))b.onclick=back;
if((b=document.getElementById('tw34-skip')))b.onclick=finish;
card.scrollTop=0;
var el=findTarget(step);
var rect=null;
if(el){
try{el.scrollIntoView({block:'center',inline:'nearest'});}catch(e){}
var r=el.getBoundingClientRect();
if(r.width<window.innerWidth*0.9&&r.height<window.innerHeight*0.5&&
r.bottom>0&&r.top<window.innerHeight)rect=r;
}
if(rect){
hole.style.display='block';
hole.style.left=(rect.left-PAD)+'px';hole.style.top=(rect.top-PAD)+'px';
hole.style.width=(rect.width+PAD*2)+'px';hole.style.height=(rect.height+PAD*2)+'px';
scrim.style.background='transparent';
}else{
hole.style.display='none';
scrim.style.background='rgba(0,0,0,.55)';
}
place(card,rect);
var nb=document.getElementById('tw34-next');if(nb)nb.focus({preventScroll:true});
}
function next(){state.idx++;if(state.idx>=state.steps.length){finish();return;}render();}
function back(){if(state.idx>0){state.idx--;render();}}
function onKey(e){
if(!state.open)return;
if(e.key==='Escape'){e.preventDefault();finish();}
else if(e.key==='ArrowRight'){e.preventDefault();next();}
else if(e.key==='ArrowLeft'){e.preventDefault();back();}
}
var rzTimer;
function onResize(){if(!state.open)return;clearTimeout(rzTimer);rzTimer=setTimeout(render,120);}
function finish(){
var role=state.role;
state.open=false;
var ov=document.getElementById('tw34-tour');if(ov)ov.remove();
var st=document.getElementById('tw34-tour-style');if(st)st.remove();
removeOld();
document.removeEventListener('keydown',onKey,true);
window.removeEventListener('resize',onResize);
try{
localStorage.setItem(userKey(),'1');
localStorage.setItem('tw_tour_done_'+role,'1');
localStorage.setItem('tw_tour_v14_'+((cu()&&cu().email)||'g'),'1');
localStorage.setItem('tw_onboarded_'+role,'1');
}catch(e){}
if(window._pendingPushRequest){
window._pendingPushRequest=false;
setTimeout(function(){if(typeof requestPushPermission==='function')requestPushPermission();},600);
}
}
function start(role){
if(state.open)return;
var lock=document.getElementById('parent-lock-overlay');
if(lock&&getComputedStyle(lock).display!=='none')return;
role=role||(cu()&&cu().type)||'teen';
if(role==='admin')return;
removeOld();
state.role=role;
state.steps=STEPS[role]||STEPS.teen;
state.idx=0;
state.open=true;
build();
document.addEventListener('keydown',onKey,true);
window.addEventListener('resize',onResize);
render();
}
function auto(role){if(!matchMedia('(max-width:768px)').matches&& !isDone())start(role);}
window.tourStart=function(force){if(force===true)start();else auto();};
window.startTour=window._startAdvancedTour=function(role){auto(role);};
window.tourNext=next;
window.tourSkip=window.tourDone=window._v14TourEnd=finish;
window._v14TourStep=function(){};
window.initOnboarding=function(){};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-19.js */
try{
(function(){
'use strict';
var DATA={"first_impression":{"mins":8,"pages":[{"t":"Why the first 30 seconds matter","b":["Most employers hiring teens are not expecting a long resume. What they are really deciding is: Will this person show up? Will they be respectful? Will they care about the job?","They start answering those questions before you say anything impressive. How you arrive, how you look, and how you greet them all count. The good news: every one of those things is something you control.",["Reliability: do you arrive when you say you will?","Respect: how do you treat the first person you meet?","Attitude: do you seem interested and willing to learn?"]]},{"t":"Before you arrive","b":["A great first impression usually starts the day before.",["Plan your route and how long it takes. Add a buffer for traffic or a missed bus.","Aim to arrive 5 to 10 minutes early. Showing up 30 minutes early can feel awkward for the person you're meeting.","Dress one step nicer than the job. Clean, simple and comfortable is better than flashy.","Bring a pen, a small notebook, your ID, and any paperwork they asked for.","Learn the name of the person you're meeting and a little about the business."]]},{"t":"The first minute","b":["When you walk in, put your phone away and silence it. Then:",["Smile and make eye contact.","Offer a firm, friendly handshake (firm does not mean crushing).","Say your name clearly: \"Hi, I'm Jordan. Thanks for meeting with me.\"","Use their name when you reply. People like hearing their own name.","Sit when invited, sit up straight, and keep your hands relaxed."],"Nervous? That is normal. Breathe, slow down, and remember it is fine to say, \"I'm a little nervous because I'm excited about this job.\" Honesty comes across well."]},{"t":"Show you're interested","b":["Employers remember teens who seem curious and polite.",["Listen without interrupting, and nod to show you're following.","Ask one or two real questions, like \"What does a typical shift look like?\"","If you haven't done something, be honest: \"I haven't done that yet, but I learn quickly. Last year I picked up ____ in a week.\"","Don't badmouth old jobs, teachers or coworkers.","Don't bring a friend, chew gum, or check your phone."],"Finish strong: thank them, and send a short thank-you message within a day. Very few applicants do this, so it makes you stand out."]}],"quiz":[{"q":"About how early should you arrive for a meeting with an employer?","opts":["About 5 to 10 minutes before it starts","At least 30 minutes early, to show you're keen","Exactly on time, since early can seem pushy","A little late is fine if you text them first"],"ans":0,"why":"5 to 10 minutes early shows you're reliable without catching the employer off guard. Arriving 30 minutes early can feel awkward, and being late, even with a text, is the fastest way to lose trust."},{"q":"What should you do with your phone during a meeting with an employer?","opts":["Keep it face down on the table, on silent","Leave it on vibrate in case of an emergency","Glance at it only during quiet pauses","Silence it and keep it put away"],"ans":3,"why":"A silenced, put-away phone tells the employer they have your full attention. Even a phone face down on the table or a quick glance can look like you'd rather be somewhere else."},{"q":"Which is the best way to introduce yourself?","opts":["\"Hey, I'm Jordan. So, what's the job like?\"","\"Hi there. I'm here for the job interview.\"","\"Hi, I'm Jordan. Thanks for meeting with me.\"","Wait quietly so they can introduce themselves"],"ans":2,"why":"A clear greeting with your name and a thank-you sounds confident and polite. Leaving out your name, jumping straight to the job, or waiting in silence makes a weaker first impression."},{"q":"The employer asks about a task you've never done. What's the best answer?","opts":["Say yes, since you can learn it later on the job","Be honest, then share how fast you learned something similar","Say you haven't, then move on to a different topic","Say a friend showed you once, so it basically counts"],"ans":1,"why":"Honesty plus proof that you learn fast works better than bluffing or stopping at \"no.\" Employers can usually tell when someone is stretching the truth, and a bluff can cost you the job later."},{"q":"What is the best thing to do after the meeting?","opts":["Send a short thank-you message within a day","Wait a week, then call to ask if you got it","Send a message every day until they reply","Post a thank-you on social media and tag them"],"ans":0,"why":"A quick, polite thank-you within a day shows professionalism and keeps your name fresh. Daily messages or public posts can look pushy, and waiting a week lets them forget you."}]},"safety":{"mins":9,"pages":[{"t":"Your rights as a teen worker","b":["Every worker, including teens, has the right to a safe workplace. That means:",["Training on how to do your tasks safely before you do them.","Protective equipment (like gloves or non-slip shoes) when the job needs it.","Being able to report a hazard or problem without being punished.","Being paid for the work you do."],"In the United States, federal law sets minimum rules for young workers, and your state may add stricter ones. When two rules differ, the stricter, more protective rule is the one that counts."]},{"t":"Hours rules by age (federal)","b":["These are the general federal limits. Your state may be stricter, and some jobs (farm work, babysitting, working for your parents) have different rules.",["Age 14 to 15: work must be outside school hours, no more than 3 hours on a school day, 18 hours in a school week, 8 hours on a non-school day, and 40 hours in a non-school week.","Age 14 to 15: only between 7 a.m. and 7 p.m. (until 9 p.m. from June 1 through Labor Day).","Age 16 to 17: federal law doesn't limit hours, but some states do, and school should always come first.","Under 14: only a few jobs are allowed, like delivering newspapers or working for your parents."],"If an employer schedules you for more than the rules allow, say so politely and tell a parent."]},{"t":"Jobs that are too dangerous","b":["Federal rules ban anyone under 18 from certain hazardous jobs. Examples include:",["Operating forklifts and similar lifting equipment.","Using power-driven meat slicers.","Operating trash compactors or balers.","Roofing work.","Excavation and trenching."],"Under 16, the list of banned tasks is even longer. If anyone asks you to do one of these, the answer is a polite \"No, I'm not allowed to do that.\" Then tell a parent or report it in TeenWork. You will never be in trouble for refusing an illegal or unsafe task."]},{"t":"Staying safe every day","b":["Most injuries are preventable. Build these habits:",["Ask for training if you haven't been shown how to do something.","Lift with your legs, not your back, and ask for help with heavy items.","Clean up spills right away and watch for wet floors.","Know where the exits and first-aid kit are.","Report every injury to your supervisor right away, even a small one."],"Trust your instincts about people too. Red flags include an employer who wants to meet somewhere private, asks you to keep the job secret from your parents, or makes you uncomfortable. Leave, tell a parent or trusted adult, and use the TeenWork SOS or report buttons."]}],"quiz":[{"q":"You're 15 and it's a school day. Under federal rules, what is the most you can work?","opts":["4 hours","3 hours","6 hours","8 hours"],"ans":1,"why":"Federal rules cap 14 and 15 year olds at 3 hours on a school day and 18 in a school week. 8 hours is the limit on a non-school day. Your state may be even stricter."},{"q":"Your boss asks you, a 16-year-old, to run a power-driven meat slicer. What should you do?","opts":["Say no, since it's banned under 18, and tell a parent","Do it, but ask a coworker to show you how first","Do it slowly, and only while your boss is watching","Say yes, but only while wearing cut-proof gloves"],"ans":0,"why":"Operating power-driven meat slicers is a hazardous job banned for anyone under 18, even with training, gloves or supervision. Declining is your right, and a parent or TeenWork can help."},{"q":"You scrape your hand on a shelf at work. It's small. What should you do?","opts":["Wash it and put on a bandage, no need to bother anyone","Finish your shift, then mention it if it still hurts","Tell a coworker so someone knows, then keep working","Tell your supervisor right away, even if it's small"],"ans":3,"why":"Even small injuries can get infected or worse. Telling your supervisor right away gets you first aid and creates a record in case you need medical care later. Telling only a coworker doesn't do that."},{"q":"Which of these is a red flag about an employer?","opts":["They ask what hours you can work around school","They want to meet at the shop with a parent present","They ask you to keep the job secret from your parents","They ask you to fill out a W-4 and an I-9 form"],"ans":2,"why":"Legitimate employers are open with parents and meet in public or at the workplace, and asking about your schedule or tax forms is normal. Secrecy is a warning sign. Leave and tell a trusted adult."},{"q":"Your state's youth work rule is stricter than the federal rule. Which should be followed?","opts":["The federal rule, since it's national","The stricter, more protective rule","Whichever one the employer picks","The one that passed most recently"],"ans":1,"why":"When federal and state rules differ, the one that gives young workers more protection is the one that applies, no matter which is newer or what the employer prefers."}]},"communication":{"mins":8,"pages":[{"t":"Speaking professionally","b":["At work you'll talk to managers, coworkers and customers. A professional voice is easy to learn.",["Greet people and use their names.","Say \"Yes\" and \"No problem\" instead of \"yeah\" and \"whatever.\"","Skip slang and filler words like \"like\" and \"um\" as much as you can.","Speak clearly and a little slower than you think you need to.","Stay positive in your tone, even when the task isn't your favorite."],"With customers, a simple script works: greet, listen, help, thank. \"Hi, welcome in! What can I help you find?\""]},{"t":"Texts and emails","b":["Messages about work are different from messages to friends.",["Use a clear subject line, like \"Shift swap request for Saturday.\"","Start with a greeting and end with your name.","Keep it short and specific. State what you need and by when.","Proofread before you send. Check names, dates and times.","Reply within a day, even if it's just \"Got it, thanks.\""],"Example: \"Hi Ms. Lopez, I have a dentist appointment Thursday at 4. Could I switch my shift with Sam, or work Friday instead? Thank you, Alex.\""]},{"t":"Listening and asking questions","b":["Good communicators listen more than they talk.",["Look at the person and don't interrupt.","Repeat instructions back: \"So I'll restock shelves first and then sweep. Is that right?\"","Write down details like times and names.","If you don't understand, ask. Asking one question is better than redoing a whole task."],"Employers are rarely upset when a new teen asks a clarifying question. They are upset when a task is done wrong because nobody asked."]},{"t":"Hard messages","b":["Some messages are uncomfortable but important.",["Running late or sick? Tell your manager as early as you can, by phone or the way they prefer. Never just not show up.","Can't take a shift? Say so early, thank them, and offer an alternative if you can.","Made a mistake? Say so quickly and explain how you'll fix it.","Need help? Ask: \"Could you show me again how to do that?\""],"Early, honest and polite is the formula for almost every hard message."]}],"quiz":[{"q":"Which is the best subject line for a work email?","opts":["Quick question about work stuff","Hi! It's Alex from the weekend crew","Shift swap request for Saturday","URGENT: please read before Saturday"],"ans":2,"why":"A clear, specific subject line tells the reader what the message is about and what to do. Vague, chatty or \"urgent\" subject lines make people guess."},{"q":"Your manager gives instructions you don't fully understand. What's best?","opts":["Start the task and ask a coworker if you get stuck","Repeat it back and ask about the parts you're unsure of","Nod, then look up how to do it on your phone later","Make your best guess, then ask your manager to check it"],"ans":1,"why":"Repeating instructions back catches misunderstandings early. Guessing or asking someone else later often means redoing the task, which wastes your time and your manager's."},{"q":"You're going to be 15 minutes late. What should you do?","opts":["Message or call your manager as soon as you know","Explain what happened as soon as you walk in","Text a coworker and ask them to let the manager know","Hurry in and stay 15 minutes late to make up for it"],"ans":0,"why":"Telling your manager early lets them plan. Waiting until you arrive, or passing it through a coworker, makes lateness look careless."},{"q":"Which reply to a shift request sounds most professional?","opts":["\"Sure, I can probably make it work, I think.\"","\"Maybe! I'll let you know by the weekend.\"","\"Yeah, should be fine. See you then!\"","\"Yes, I can work Saturday 10 to 2. Thanks!\""],"ans":3,"why":"It says yes, confirms the exact day and time, and sounds positive. \"Probably,\" \"maybe\" or \"should be fine\" leave your manager unsure if you're really coming."},{"q":"What does active listening look like?","opts":["Nodding often, and planning your reply while they talk","Finishing their sentences, so they know you're following","Eye contact, no interrupting, and repeating key points","Sharing a similar story, so they know you relate"],"ans":2,"why":"Active listening means giving the speaker your full attention and checking that you understood. Planning your reply, finishing their sentences or switching to your own story pulls the focus away from them."}]},"money":{"mins":9,"pages":[{"t":"Gross pay vs. net pay","b":["Your first paycheck will probably be smaller than you expect. That's because of taxes.",["Gross pay is what you earned: hours worked times your hourly rate. Example: 12 hours at $14 is $168 gross.","Net pay (take-home) is what you actually receive after deductions.","Most workers pay Social Security and Medicare taxes, called FICA. The employee share is 7.65% (6.2% Social Security plus 1.45% Medicare).","Some money may also be withheld for federal and state income tax."],"Deductions are normal. But you should know what each one is."]},{"t":"Forms you'll see","b":["When you start a job you'll usually fill out a few forms.",["Form W-4 tells your employer how much federal income tax to withhold.","Form I-9 proves you're allowed to work in the U.S. You'll show documents like a passport, or a school ID plus a birth certificate.","Form W-2 is the yearly summary your employer sends by the end of January showing what you earned and what was withheld."],"Teens who earn a small amount often owe little or no federal income tax, and may be able to get withheld income tax back by filing a tax return. Ask a parent or a tax professional to help the first time."]},{"t":"Reading a pay stub","b":["Check every pay stub. Mistakes happen.",["Do the hours match what you worked?","Is the hourly rate what you were promised?","Do the deductions look right and add up to the difference between gross and net?","Year-to-date totals show everything you've earned so far this year."],"If something looks wrong, politely ask your manager or payroll person. Keep your own record of the hours you worked so you can compare."]},{"t":"Making your money work","b":["Having a plan makes your first paychecks go further.",["Pay yourself first: set aside part of every paycheck for savings before you spend.","Set a goal, like a phone, a car fund or college, and track your progress.","Ask a parent about a teen or custodial bank account.","Watch out for scams: a real job never makes you pay to get hired, and never sends you a check and asks you to send part of it back.","Never share bank or ID details with an \"employer\" you haven't verified."]]}],"quiz":[{"q":"You worked 12 hours at $14 per hour. What is your gross pay?","opts":["$140","$154","$182","$168"],"ans":3,"why":"12 x $14 = $168. That's before any taxes or deductions come out."},{"q":"What's the difference between gross pay and net pay?","opts":["Gross is after taxes, net is before any deductions","Gross is your hourly rate, net is your total for the week","Gross is before deductions, net is what you take home","Gross includes your tips, net is only your hourly wages"],"ans":2,"why":"Gross is everything you earned. Net is what's left after taxes and other deductions, so it's the amount you actually take home."},{"q":"Which form do you get after the year ends that summarizes your earnings and taxes withheld?","opts":["W-4","W-2","I-9","1040"],"ans":1,"why":"The W-2 is the year-end summary from your employer. The W-4 sets withholding, the I-9 proves you can legally work, and the 1040 is the tax return you file yourself."},{"q":"A \"job\" sends you a check and asks you to deposit it and send part back. What is this?","opts":["A scam, even if the check looks real","Normal, if the company says it's for supplies","A standard way to pay for your uniform","How some companies run payroll at first"],"ans":0,"why":"Check-overpayment scams are common. The check later bounces and you lose the money you sent. Real employers never ask you to send money back, for supplies, uniforms or anything else."},{"q":"Your pay stub shows fewer hours than you worked. What should you do?","opts":["Wait a few paychecks, since mistakes often fix themselves","Assume the missing hours were your unpaid breaks","Bring it up at your next review in a few months","Politely ask payroll and show your own record of hours"],"ans":3,"why":"Pay mistakes are fixable, but only if you speak up. Keeping your own record of hours and asking politely right away is the best way to get it corrected."}]},"ratings":{"mins":8,"pages":[{"t":"Why ratings matter","b":["On TeenWork, employers can leave ratings and reviews after a job. Those follow you. A strong rating helps you get hired for better jobs, earn more, and later ask for references and letters of recommendation.","The good news: ratings are mostly about simple habits, not special talent."]},{"t":"Be reliable","b":["Reliability is the single biggest thing employers rate.",["Show up on time, every time. If something changes, tell your employer as early as you can.","Do what you said you'd do, when you said you'd do it.","Finish a task completely before you move to the next one.","Keep your word on small things. Big trust is built from small promises."]]},{"t":"Go a little further","b":["Employers remember teens who take initiative.",["When you finish, ask: \"What else can I help with?\"","Notice what needs doing (restocking, cleaning, helping a customer) and do it without being asked.","Stay positive, even on slow or boring shifts.","Be friendly with customers and coworkers.","Leave the space a little better than you found it."],"You don't have to do everything perfectly. You just have to show you care."]},{"t":"Mistakes and feedback","b":["Everybody makes mistakes. How you respond is what employers rate.",["Own it quickly: \"I made a mistake. Here's how I'll fix it.\"","Skip the excuses and the blaming.","When you get feedback, listen, say thank you, and apply it.","Ask for feedback yourself: \"Is there anything I could do better?\""],"A teen who takes feedback well often gets a better rating than one who never makes a mistake but never listens."]}],"quiz":[{"q":"What do employers usually value most when they rate a teen worker?","opts":["Being reliable and on time","Working fast and finishing early","Never needing to ask a question","Past experience and good grades"],"ans":0,"why":"Reliability comes first. If an employer can count on you, they can trust you with more. Speed and experience matter less, and asking questions is a good thing."},{"q":"You finish your tasks early. What's the best move?","opts":["Take a break until someone gives you a new task","Redo your finished tasks slowly so you look busy","Ask if you can clock out early since you're done","Ask your supervisor what else you can help with"],"ans":3,"why":"Asking what else needs doing shows initiative, which employers notice and reward. Waiting to be told, looking busy or leaving early doesn't."},{"q":"You broke a display by accident. What should you do?","opts":["Clean it up yourself and mention it if anyone asks","Leave a note for the manager at the end of your shift","Tell your supervisor right away and offer to help fix it","Fix it as best you can so it isn't noticed"],"ans":2,"why":"Owning a mistake right away builds trust. Waiting, hoping no one asks, or quietly patching it makes things worse if it's discovered later."},{"q":"A manager gives you critical feedback. The best response is:","opts":["Explain why you did it your way, so they understand","Listen, thank them, and ask how to do it better next time","Agree to change, then keep doing it the way you know","Apologize a lot, and promise it will never happen again"],"ans":1,"why":"Listening, saying thanks and acting on feedback shows maturity, which leads to better ratings. Explaining yourself, over-apologizing or ignoring it doesn't help you improve."},{"q":"You can't make your shift tomorrow. What should you do?","opts":["Tell your manager as early as you can","Text your manager an hour before it starts","Find a friend to cover, and tell the manager after","Tell a coworker so they can pass on the message"],"ans":0,"why":"Early notice to your manager gives them time to find coverage. Last-minute texts, secondhand messages or surprise swaps are quick ways to lose a good rating."}]},"resume":{"mins":9,"pages":[{"t":"What goes on a teen resume","b":["A resume is a one-page summary of who you are as a worker. A good teen resume includes:",["Your name and contact info (phone and a professional email address).","A short summary or goal, like \"Responsible high school student looking for part-time retail work.\"","Education: school, expected graduation, and GPA if it's strong.","Experience: jobs, but also babysitting, lawn work, volunteering and club roles.","Skills: things like customer service, Spanish, Canva, or Microsoft Office.","Awards and activities, like sports teams or honor roll."]]},{"t":"Writing strong bullet points","b":["Employers skim. Make each line short and strong by starting with an action verb and adding a result or number.",["Weak: \"Helped at a bake sale.\"","Strong: \"Organized a bake sale for 60 customers and raised $400 for the school band.\"","Weak: \"Was in charge of babysitting.\"","Strong: \"Cared for two children (ages 4 and 7) weekly, including meals and homework help.\""],"Good action verbs: organized, led, created, served, trained, improved, managed, completed."]},{"t":"Format and polish","b":["Looks matter, because a clean resume signals you care.",["Keep it to one page.","Use one simple font and the same style for every heading.","Use a professional email, like first.last@email.com, not a nickname.","Save and send it as a PDF so it doesn't change.","Proofread twice and have a parent or teacher check it too."],"You do not need to include your age, photo, full home address, or any ID numbers. Never put a Social Security number on a resume."]},{"t":"No experience? Use what you have","b":["Everyone starts with no job history. You still have plenty to show.",["School clubs, sports and student government show teamwork and leadership.","Volunteering shows responsibility and heart.","Chores, pet sitting, tutoring and helping a family business all count.","Skills and badges you've earned, like your TeenWork lessons, show you're learning.","List \"References available on request\" and have 2 or 3 ready."]]}],"quiz":[{"q":"Which bullet point is strongest?","opts":["Was responsible for helping out at the school band's bake sale","Organized a band bake sale for 60 customers and raised $400","Helped with many different tasks at a big bake sale for the band","Took part in a bake sale and did a lot of baking and selling"],"ans":1,"why":"It starts with an action verb and includes numbers and a result, so the employer can see exactly what you accomplished. The others are just as long but vague."},{"q":"How long should a teen resume be?","opts":["One page","Two pages","Three pages","Half a page"],"ans":0,"why":"One page is plenty. Employers skim, so short and clear wins, but half a page usually leaves out good things."},{"q":"Which email address is best to put on a resume?","opts":["xXjordanXx@email.com","jordy.loves.pizza@email.com","jordan_gamer99@email.com","jordan.rivera@email.com"],"ans":3,"why":"A simple version of your name looks professional and is easy to remember. Nicknames, hobbies and extra symbols look less serious."},{"q":"Which of these should you leave OFF your resume?","opts":["Your phone number and email","Your volunteer experience","Your Social Security number","Your school and graduation year"],"ans":2,"why":"Never put sensitive ID numbers on a resume. They aren't needed to apply and could be misused. Contact info, school and volunteering all belong on it."},{"q":"You have no job history. What can you include in Experience?","opts":["Leave that section out and list hobbies instead","Real things you've done, like babysitting or volunteering","A family member's job you sometimes helped watch","Jobs you plan to get soon, marked as \"upcoming\""],"ans":1,"why":"Real responsibilities count. Employers know teens are just starting, and they look for reliability and willingness to learn. Never list jobs you haven't really done."}]},"interview":{"mins":9,"pages":[{"t":"Prepare ahead","b":["Preparing is the easiest way to feel less nervous.",["Read the job posting and think about how your skills match.","Learn what the business does and who its customers are.","Practice your answers out loud, to a mirror or a parent.","Prepare 2 or 3 questions to ask them.","Plan your outfit, route, and what to bring."]]},{"t":"Common questions","b":["You'll probably hear some version of these:",["\"Tell me about yourself.\" Give a short answer: who you are, what you're good at, why you want this job.","\"Why do you want to work here?\" Mention something specific about the business.","\"What are your strengths?\" Choose real ones, like reliable, friendly or quick learner, and give an example.","\"What's a weakness?\" Be honest, then show you're working on it.","\"When can you work?\" Be honest and clear about school and activities."]]},{"t":"The STAR method","b":["For questions like \"Tell me about a time you solved a problem,\" use STAR:",["Situation: set the scene in one sentence.","Task: what you needed to do.","Action: what YOU did.","Result: what happened, ideally with a number or a positive outcome."],"Example: \"In my group project (S), we were missing a teammate (T), so I split his part and finished it with another student (A). We turned it in on time and got an A (R).\""]},{"t":"Questions to ask and staying safe","b":["At the end, they'll ask if you have questions. Always have a couple ready:",["\"What does a typical shift look like?\"","\"What training will I get?\"","\"When will you make a decision?\""],"Then thank them and shake hands. For safety, meet in a public place or the workplace, tell a parent where you're going, and never agree to meet somewhere private. Keep your conversations in TeenWork so a parent can see them."]}],"quiz":[{"q":"An interviewer asks, \"What's a weakness?\" What's a good answer?","opts":["\"I work too hard,\" since it sounds like a strength","\"I'm a perfectionist and care too much about details.\"","An honest one, plus how you're working to improve it","Say you can't think of one, so you stay positive"],"ans":2,"why":"Honesty plus a plan to improve shows self-awareness, which employers like. Disguised strengths like \"I work too hard\" sound rehearsed, and having no answer sounds unprepared."},{"q":"What does the S in STAR stand for?","opts":["Strategy","Situation","Strength","Solution"],"ans":1,"why":"STAR stands for Situation, Task, Action, Result. Starting with the situation sets the scene for a clear story."},{"q":"Which is a good question to ask at the end of an interview?","opts":["\"What does a typical shift look like?\"","\"How soon can I ask for time off?\"","\"How many breaks do I get per shift?\"","\"Can I swap shifts whenever I want?\""],"ans":0,"why":"It shows you're thinking about doing the job well. Questions about time off, breaks or swapping shifts this early can send the wrong message."},{"q":"They ask when you can work. What's the best approach?","opts":["Say you're free anytime, then sort it out later","Ask them to pick the hours and adjust around it","Wait until they offer the job to talk about hours","Be honest about your school and activity schedule"],"ans":3,"why":"Being honest about your schedule up front prevents problems later and builds trust. Saying \"anytime\" or waiting until after you're hired leads to clashes."},{"q":"Which is the safest way to handle an interview location?","opts":["Meet at their home office, as long as you bring your phone","Meet in their car outside the shop, so it's quick","Meet at the workplace or a public place and tell a parent","Meet wherever they suggest, but keep it short"],"ans":2,"why":"Public or workplace meetings plus a parent who knows where you are is the safest approach. Private homes and cars are red flags, even for a short meeting."}]},"conflict":{"mins":8,"pages":[{"t":"Why conflict happens","b":["Whenever people work together, disagreements will happen. They can come from unclear instructions, stress, different styles, or simple misunderstandings.","Conflict isn't automatically bad. Handled well, it can improve how a team works. Handled poorly, it hurts your reputation."]},{"t":"Stay calm first","b":["When you feel angry or embarrassed, pause before you react.",["Take a slow breath and count to five.","Step away for a minute if you can.","Don't reply by text or in front of customers while you're upset.","Ask yourself: what outcome do I actually want?"]]},{"t":"Talk it out","b":["Most conflicts get better with a calm, private conversation.",["Pick a private moment, not in front of customers.","Use \"I\" statements: \"I felt confused when the schedule changed. Could we go over it?\"","Be specific about what happened and what you'd like instead.","Listen to their side too, then look for a solution you can both live with."],"Avoid gossiping. Talking about people behind their backs makes conflict worse."]},{"t":"When to get help","b":["A disagreement is normal. These are NOT normal and you should get help right away:",["Harassment, bullying or threats.","Unwanted touching or comments about your body.","Being treated unfairly because of who you are.","Being asked to do something unsafe or illegal."],"Tell a parent, a manager above the person involved, or use the TeenWork report button. Write down what happened, when, and who saw it. You will not be in trouble for speaking up."]}],"quiz":[{"q":"A coworker took credit for your work. What's the best first step?","opts":["Correct them in front of the team so everyone knows","Go straight to the manager and ask them to fix it","Let it go this time, but bring it up if it happens again","Talk to them privately and calmly using an \"I\" statement"],"ans":3,"why":"A calm, private conversation resolves most issues without damaging relationships. Calling them out in public or skipping straight to the manager can make things worse."},{"q":"Which is an \"I\" statement?","opts":["\"You changed the plan without asking me. Why?\"","\"I think you always leave me out of the plans.\"","\"I felt left out when the plan changed. Could we talk?\"","\"Everyone noticed you left me out. Can we talk?\""],"ans":2,"why":"A real \"I\" statement describes how you felt without blaming. Starting with \"I think you always...\" is still blaming, which makes the other person defensive."},{"q":"A customer is yelling at you. What should you do first?","opts":["Stay polite, and tell them firmly to calm down first","Stay calm, listen, and get a manager if needed","Apologize, and give them a refund right away","Walk to the back and wait until they leave"],"ans":1,"why":"Calm listening de-escalates most situations. If it doesn't, bring in a manager. Arguing, walking off, or promising things you can't decide on usually makes it worse."},{"q":"A coworker keeps making uncomfortable comments about your body. What should you do?","opts":["Tell a trusted adult or manager, and report it","Ask them calmly to stop, and give it a few weeks","Treat it like any disagreement and use \"I\" statements","Laugh it off so things don't get awkward at work"],"ans":0,"why":"This is harassment, not a normal conflict, so it needs to be reported, not handled alone. You will not be in trouble for speaking up."},{"q":"Why should you avoid gossip at work?","opts":["It's illegal and can be reported to the police","It's grounds for being fired on the spot","It lowers your TeenWork rating right away","It can make conflict worse and hurt trust"],"ans":3,"why":"Gossip spreads and damages trust, and it often makes the original problem bigger. It isn't a crime or an automatic firing offense, but it hurts how people see you."}]},"time":{"mins":8,"pages":[{"t":"Plan your week","b":["Juggling school, a job and a life is hard. A simple plan makes it manageable.",["Put everything in one calendar: classes, tests, practices, shifts and fun.","Look at the week ahead every Sunday night.","Set reminders for deadlines and shifts.","Tell your employer your school schedule up front, including exam weeks."]]},{"t":"Prioritize","b":["Not everything is equally important or urgent.",["Do the important and urgent things first.","Tackle the hardest task when you have the most energy.","If two things clash, ask the person involved. A message like \"I have a test Friday. Can we move my shift?\" works well.","School should come first. A good employer will understand."]]},{"t":"Avoid time traps","b":["Most lost time disappears in small ways.",["Put your phone away while working or studying.","Break big tasks into small steps.","Try 25 minutes of focus, then a 5 minute break.","Prepare the night before: clothes, bag, uniform, charger.","Don't wait until the last minute. It adds stress and mistakes."]]},{"t":"Balance and rest","b":["You can't do your best when you're exhausted.",["Teens usually need about 8 to 10 hours of sleep.","Build in buffer time between school and work.","It's okay to say no politely: \"I'd love to help, but I can't this week.\"","Don't take more hours than you can handle."],"A balanced schedule makes you a better student and a better employee."]}],"quiz":[{"q":"You have a big test tomorrow and a shift tonight. What's the best approach?","opts":["Ask your manager early about moving the shift","Work the shift, then study late into the night","Bring your notes and study during slow moments","Call in sick that afternoon so you can study"],"ans":0,"why":"Asking early gives your employer time to adjust, and it protects both your grades and your reputation. Studying on the clock, losing sleep or calling in sick all cause new problems."},{"q":"What is a good way to keep track of everything?","opts":["Keep a separate planner for school and for work","Write shifts, tests and plans on sticky notes","Keep it in your head, and ask friends to remind you","Put school, work and activities in one calendar"],"ans":3,"why":"One calendar with everything in it helps you spot clashes before they become problems. Separate planners hide conflicts."},{"q":"How much sleep do teens generally need?","opts":["5 to 6 hours","6 to 7 hours","8 to 10 hours","10 to 12 hours"],"ans":2,"why":"Most teens need about 8 to 10 hours. Too little sleep hurts grades, mood and safety."},{"q":"Which is a helpful way to fight procrastination?","opts":["Wait until you feel motivated, then do it all at once","Break it into small steps and work in short focused blocks","Do the easy tasks first and save it for the end","Work on it with music on and your phone close by"],"ans":1,"why":"Small steps and short focus blocks make tasks feel doable and help you start. Waiting for motivation or saving it for last usually means rushing at the deadline."},{"q":"Your boss asks you to take extra shifts but you're overloaded. What's best?","opts":["Politely explain what you can and can't take on","Say yes now and figure out the schedule later","Take the shifts and cut back on sleep for a while","Accept a few and hope they don't ask again"],"ans":0,"why":"Being honest about your limits is more professional than overcommitting and letting people down later."}]},"social_media":{"mins":8,"pages":[{"t":"Employers look you up","b":["Many employers search for applicants online before they hire. What they find can help or hurt you.","Even posts you delete can live on through screenshots, and photos can be copied. A good rule: don't post anything you wouldn't want a future boss, teacher or grandparent to see."]},{"t":"What to keep off","b":["Some things are better kept off social media.",["Complaints about your boss, coworkers, customers or job.","Rude, hateful or inappropriate content, even as a joke.","Personal information like your address, school schedule or live location.","Private business details, like what's in the register or other people's information."],"Posting about a bad day at work can get you fired, and it can also make future employers nervous."]},{"t":"Clean up and lock down","b":["Do a quick checkup.",["Search your name online and see what shows up.","Set accounts to private if you want, and review who can follow you.","Untag yourself from anything you wouldn't want an employer to see.","Use a simple, professional username for anything you'll share with employers.","Delete old posts that don't represent you well anymore."]]},{"t":"Build a positive presence and stay safe","b":["Social media can help you too.",["Share things you're proud of: awards, projects, volunteering, skills you're learning.","Be kind. How you treat others online shows who you are."],"Stay safe: be cautious with messages from unknown \"recruiters,\" never share ID or bank details, and don't accept job offers that move you away from the app into private chats. If something feels off, tell a trusted adult."]}],"quiz":[{"q":"You had a rough shift. What should you do?","opts":["Post about it without naming the business","Vent to a friend or a parent in private","Share it on a private story for close friends","Post a vague quote about bad bosses"],"ans":1,"why":"Venting privately keeps your reputation safe. Even vague posts or \"close friends\" stories can be screenshotted and shared, and complaints about work can cost you the job."},{"q":"Which should you avoid sharing publicly?","opts":["Your home address and live location","Your volunteer photos and team awards","Your team's win at the regional finals","A school project and the grade you got"],"ans":0,"why":"Personal details like your address and live location can put you at risk. Awards, projects and volunteering are great things to share."},{"q":"A stranger messages you with a \"high-paying job\" and asks for your ID photo. What do you do?","opts":["Ask for their ID first, and then send yours","Send it with the number covered, so it's safer","Ask for the pay details in writing, then send it","Don't send anything, and tell a trusted adult"],"ans":3,"why":"Asking for ID photos right away is a classic scam. Never share ID with someone you haven't verified, even partly covered or after they show theirs."},{"q":"What's a good first step to clean up your online presence?","opts":["Delete every account and start over fresh","Post more good things to push old posts down","Search your own name and see what's public","Switch your name to a nickname on every app"],"ans":2,"why":"Seeing what an employer would see lets you fix what needs fixing. Deleting everything or posting more doesn't tell you what's actually out there."},{"q":"Do deleted posts always disappear?","opts":["Yes, once deleted they're gone for good","No, screenshots and copies can still exist","Yes, if you delete them within an hour","Yes, if your account is set to private"],"ans":1,"why":"Anything can be screenshotted or shared before it's deleted, so think before you post. Being quick or private doesn't change that."}]},"teamwork":{"mins":8,"pages":[{"t":"What good teamwork looks like","b":["Most jobs depend on people working together. A good teammate is someone others are glad to have on the shift.",["Shows up and does their part.","Helps without being asked.","Communicates clearly and kindly.","Shares credit and takes responsibility."]]},{"t":"Communicate and share the work","b":["Teams run best when everyone knows what they're doing.",["Ask at the start of a shift who's doing what.","Say what you're working on so others don't repeat it.","Offer help when you finish early: \"I'm done with this. What can I take?\"","Ask for help early instead of struggling quietly."]]},{"t":"Different styles, different people","b":["Everyone works differently. Some people are fast, some careful, some chatty, some quiet.",["Be patient and assume good intentions.","Learn names and say thank you.","If a teammate isn't doing their share, first talk to them kindly. If it keeps happening, tell your supervisor calmly and stick to facts.","Don't quietly pick up everyone's slack. It hides the problem."]]},{"t":"Give credit and grow","b":["Great teammates make others look good.",["Say \"Great job\" when someone does something well.","Give credit in front of the manager.","Admit when you needed help from someone.","Learn from coworkers who have been there longer."],"Reputation spreads. People who are easy to work with get more hours, better shifts and stronger references."]}],"quiz":[{"q":"What should you do when you finish your task and others are still busy?","opts":["Start your break early while you wait","Wait nearby until someone asks you","Offer to help with what's left","Redo your own task to make it perfect"],"ans":2,"why":"Offering help keeps the team moving and shows you care about the group, not only your own list. Waiting to be asked wastes time."},{"q":"A teammate isn't doing their share. What's a good first step?","opts":["Quietly pick up their slack so the work gets done","Talk to them kindly first, then go to the supervisor","Tell the supervisor right away, before talking to them","Mention it to the other teammates so they can help"],"ans":1,"why":"A direct, kind conversation first gives them a chance to fix it. If it continues, the supervisor needs to know. Quietly covering for them hides the problem."},{"q":"What helps a team avoid doing the same task twice?","opts":["Telling others what you're working on","Each person picking whatever looks undone","Letting the fastest person do most of it","Working quickly so you finish first"],"ans":0,"why":"Simple communication prevents wasted effort and mistakes. Guessing what's undone is how two people end up on the same job."},{"q":"Your coworker did a great job. What should you do?","opts":["Keep quiet, so they don't get a big head","Tell the manager, but say you helped a lot","Say nothing, and try to beat them next shift","Say so, and mention it to the manager"],"ans":3,"why":"Sharing credit, especially in front of the manager, builds trust and makes your whole team stronger."},{"q":"You're struggling with a task. What's best?","opts":["Keep trying alone so you don't bother anyone","Switch to a different task and come back later","Ask a teammate or supervisor for help early","Watch a video on your phone to figure it out"],"ans":2,"why":"Asking early prevents bigger problems. Good teammates ask for help and offer it. Struggling quietly or switching tasks just delays the fix."}]},"references":{"mins":8,"pages":[{"t":"What is a reference?","b":["A reference is a person who can tell an employer what you're like to work with. Employers often call or message them before they hire you.",["Good references: teachers, coaches, club leaders, volunteer supervisors, past employers, neighbors you've worked for.","Not good: family members and close friends.","Have 2 or 3 ready."]]},{"t":"Ask the right way","b":["Always ask before you list someone. It's polite, and it makes sure they'll say something good.",["Ask in person or by a polite message.","Try: \"Would you feel comfortable being a positive reference for me?\"","Give them notice and tell them about the jobs you're applying for.","Share your resume and a few things you'd like them to mention.","If they hesitate, thank them and ask someone else."]]},{"t":"Prepare your list","b":["Make a simple reference page you can send when asked:",["Name and title","Relationship (for example, \"my soccer coach for two years\")","Phone number and email","How long they've known you"],"Keep their contact info up to date, and only list people who have said yes."]},{"t":"Stay in touch and say thanks","b":["References are relationships, not one-time favors.",["Thank them with a short message or note.","Tell them if you got the job.","Keep them updated on what you're doing.","Ask employers you've worked for to write a letter of recommendation in TeenWork."],"A thoughtful thank-you means they'll happily help again."]}],"quiz":[{"q":"Who makes a good reference?","opts":["A close friend who knows you really well","A parent who has seen you do lots of chores","A famous person you met once at an event","A coach or teacher who knows your work"],"ans":3,"why":"Employers want someone who can speak about your work habits and character, not a friend or family member."},{"q":"What should you do before listing someone as a reference?","opts":["Nothing, as long as they know you","Tell them after you've applied","Ask if they're willing to be one","Find their number on social media"],"ans":2,"why":"Always ask first. It's respectful, and it lets them prepare to say good things. Telling them afterward can catch them off guard."},{"q":"How many references should you have ready?","opts":["Just 1","2 or 3","5 or 6","8 to 10"],"ans":1,"why":"Two or three is a standard number employers expect."},{"q":"What helps a reference speak well about you?","opts":["Sharing your resume and the job details","Writing a script and asking them to read it","Giving them no info, so it sounds natural","Asking them to mention only your grades"],"ans":0,"why":"The more they know about you and the job, the better they can speak to your strengths. A script or no information at all makes it harder for them."},{"q":"After someone agrees to be a reference, what's a good next step?","opts":["Wait, and thank them once you get the job","Leave them alone, and let the employer call them","Only contact them again if you need them","Send a thank-you and keep them updated"],"ans":3,"why":"A thank-you and an update keep the relationship strong and make them happy to help again. Waiting, or only reaching out when you need something, weakens it."}]}};
var PASS_RATIO=0.8;
var S=null;
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function meta(id){
var list=window.lessonsData||[];
for(var i=0;i<list.length;i++)if(list[i].id===id)return{m:list[i],n:i+1,total:list.length};
return null;
}
function isDone(id){
var ua=(typeof userActivity!=='undefined')?userActivity:window.userActivity;
return!!(ua&&ua.lessonsCompleted&&ua.lessonsCompleted.indexOf(id)!== -1);
}
function injectStyle(){
if(document.getElementById('tw34l-style'))return;
var st=document.createElement('style');
st.id='tw34l-style';
st.textContent=
'#tw34l{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px;font-family:"DM Sans",sans-serif}'+
'#tw34l .sheet{background:var(--card,#fff);color:var(--text,#1c1c1c);width:100%;max-width:560px;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);border-radius:18px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.3)}'+
'#tw34l .head{display:flex;align-items:center;gap:10px;padding:14px 16px 10px}'+
'#tw34l .head .ic{font-size:1.9rem;line-height:1}'+
'#tw34l .head .tt{flex:1;min-width:0}'+
'#tw34l .head .kicker{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted,#6b7280)}'+
'#tw34l .head h2{margin:2px 0 0;font-family:"Fraunces",Georgia,serif;font-size:1.05rem;color:var(--green,#2d6a4f)}'+
'#tw34l .x{background:none;border:none;font-size:1.4rem;line-height:1;cursor:pointer;color:var(--muted,#6b7280);padding:6px 8px}'+
'#tw34l .bar{height:6px;background:var(--border,#e5e7eb);margin:0 16px;border-radius:6px;overflow:hidden}'+
'#tw34l .bar i{display:block;height:100%;background:var(--green,#2d6a4f);border-radius:6px;transition:width .3s}'+
'#tw34l .body{padding:14px 16px;overflow-y:auto;flex:1}'+
'#tw34l .body h3{margin:0 0 10px;font-size:1.05rem;color:var(--green,#2d6a4f)}'+
'#tw34l .body p{margin:0 0 12px;font-size:.93rem;line-height:1.65}'+
'#tw34l .body ul{margin:0 0 12px;padding-left:1.15rem}'+
'#tw34l .body li{font-size:.93rem;line-height:1.6;margin-bottom:6px}'+
'#tw34l .done-banner{background:var(--green-pale,#d8f3dc);color:var(--green,#2d6a4f);border-radius:8px;padding:7px 12px;font-size:.82rem;font-weight:700;margin-bottom:12px}'+
'#tw34l .q{font-weight:700;font-size:1rem;line-height:1.45;margin-bottom:12px}'+
'#tw34l .opt{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;padding:11px 12px;margin-bottom:8px;border-radius:12px;border:2px solid var(--border,#e5e7eb);background:var(--card,#fff);color:inherit;font:inherit;font-size:.92rem;line-height:1.4;cursor:pointer}'+
'#tw34l .opt .l{font-weight:800;color:var(--green,#2d6a4f);min-width:1.1em}'+
'#tw34l .opt:hover:not([disabled]){border-color:var(--green,#2d6a4f)}'+
'#tw34l .opt[disabled]{cursor:default}'+
'#tw34l .opt.right{border-color:#16a34a;background:#dcfce7;color:#14532d}'+
'#tw34l .opt.wrong{border-color:#dc2626;background:#fee2e2;color:#7f1d1d}'+
'#tw34l .fb{border-radius:12px;padding:11px 13px;font-size:.9rem;line-height:1.55;margin-top:6px}'+
'#tw34l .fb.ok{background:#dcfce7;color:#14532d}'+
'#tw34l .fb.no{background:#fee2e2;color:#7f1d1d}'+
'#tw34l .score{text-align:center;padding:6px 0 12px}'+
'#tw34l .score .big{font-size:2.6rem;font-weight:800;color:var(--green,#2d6a4f)}'+
'#tw34l .score .sm{font-size:.95rem;color:var(--muted,#6b7280)}'+
'#tw34l .miss{border:1.5px solid var(--border,#e5e7eb);border-radius:12px;padding:10px 12px;margin-bottom:10px;font-size:.88rem;line-height:1.5}'+
'#tw34l .miss b{display:block;margin-bottom:4px}'+
'#tw34l .foot{display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px 14px;border-top:1px solid var(--border,#e5e7eb)}'+
'#tw34l .btn{font:inherit;font-weight:700;font-size:.92rem;border-radius:11px;padding:11px 16px;min-height:44px;cursor:pointer}'+
'#tw34l .btn.pri{background:var(--green,#2d6a4f);color:#fff;border:none;flex:1 1 140px}'+
'#tw34l .btn.sec{background:transparent;color:var(--green,#2d6a4f);border:1.5px solid var(--green,#2d6a4f)}'+
'#tw34l .btn[disabled]{opacity:.45;cursor:not-allowed}';
document.head.appendChild(st);
}
function total(){return S.c.pages.length+S.c.quiz.length;}
function position(){
if(S.stage==='read')return S.page;
if(S.stage==='quiz')return S.c.pages.length+S.qi+(S.answered?1:0);
return total();
}
function startQuiz(){
S.stage='quiz';S.qi=0;S.answered=false;S.right=0;S.log=[];
S.order=S.c.quiz.map(function(q){return shuffle(q.opts.map(function(_,i){return i;}));});
render();
}
function pick(optIndex){
if(S.answered)return;
var q=S.c.quiz[S.qi];
S.answered=true;
var ok=(optIndex===q.ans);
if(ok)S.right++;
S.log.push({qi:S.qi,picked:optIndex,ok:ok});
S.lastOk=ok;S.lastPick=optIndex;
render();
}
function next(){
if(S.stage==='read'){
if(S.page<S.c.pages.length-1){S.page++;render();}else{startQuiz();}
}else if(S.stage==='quiz'){
if(!S.answered)return;
if(S.qi<S.c.quiz.length-1){S.qi++;S.answered=false;render();}
else{S.stage='result';render();}
}
}
function back(){if(S.stage==='read'&&S.page>0){S.page--;render();}}
function need(){return Math.ceil(S.c.quiz.length*PASS_RATIO);}
function finishLesson(){
var id=S.id,xp=S.xp,was=isDone(id);
if(!was){
try{if(typeof trackActivity==='function')trackActivity('lesson_complete',id);}catch(e){}
var ua=(typeof userActivity!=='undefined')?userActivity:window.userActivity;
if(ua){if(!ua.lessonsCompleted)ua.lessonsCompleted=[];if(ua.lessonsCompleted.indexOf(id)=== -1)ua.lessonsCompleted.push(id);}
try{if(typeof teenGameState!=='undefined')teenGameState.points=(teenGameState.points||0)+xp;}catch(e){}
try{if(typeof awardBadge==='function')awardBadge('lesson_1');}catch(e){}
if(typeof showToast==='function')showToast('🎉 Lesson complete! +'+xp+' XP','success');
}
closeNow();
if(typeof window.renderLessonsGrid==='function')setTimeout(window.renderLessonsGrid,150);
}
function closeNow(){
var el=document.getElementById('tw34l');if(el)el.remove();
document.removeEventListener('keydown',onKey,true);
S=null;
}
function tryClose(){
if(S&&S.stage==='quiz'&& !(S.qi===S.c.quiz.length-1&&S.answered)){
if(!window.confirm('Leave this lesson? Your quiz answers so far will not be saved.'))return;
}
closeNow();
}
function onKey(e){if(S&&e.key==='Escape'){e.preventDefault();tryClose();}}
function render(){
var root=document.getElementById('tw34l');if(!root)return;
var sheet=root.querySelector('.sheet');
var c=S.c,h='';
var pct=Math.round(position()/total()*100);
var kicker,body='',foot='';
if(S.stage==='read'){
var p=c.pages[S.page];
kicker='Lesson '+S.n+' of '+S.count+' · Learn · Page '+(S.page+1)+' of '+c.pages.length;
if(S.page===0&&S.done)body+='<div class="done-banner">✅ You already completed this lesson. Feel free to review it anytime.</div>';
body+='<h3>'+esc(p.t)+'</h3>';
p.b.forEach(function(blk){
if(Array.isArray(blk))body+='<ul>'+blk.map(function(li){return'<li>'+esc(li)+'</li>';}).join('')+'</ul>';
else body+='<p>'+esc(blk)+'</p>';
});
var lastPage=S.page===c.pages.length-1;
foot=(S.page>0?'<button class="btn sec" data-a="back">← Back</button>':'')+
'<button class="btn pri" data-a="next">'+(lastPage?'Start the quiz ('+c.quiz.length+' questions) →':'Next →')+'</button>';
}else if(S.stage==='quiz'){
var q=c.quiz[S.qi],ord=S.order[S.qi];
kicker='Lesson '+S.n+' of '+S.count+' · Quiz · Question '+(S.qi+1)+' of '+c.quiz.length;
body+='<div class="q">'+esc(q.q)+'</div>';
ord.forEach(function(oi,k){
var cls='opt';
if(S.answered){if(oi===q.ans)cls+=' right';else if(oi===S.lastPick)cls+=' wrong';}
body+='<button class="'+cls+'" data-o="'+oi+'"'+(S.answered?' disabled':'')+'><span class="l">'+String.fromCharCode(65+k)+'.</span><span>'+esc(q.opts[oi])+'</span></button>';
});
if(S.answered){
body+=S.lastOk
?'<div class="fb ok"><b>✅ Correct!</b> '+esc(q.why)+'</div>'
:'<div class="fb no"><b>❌ Not quite.</b> The right answer is <b>'+esc(q.opts[q.ans])+'</b>. '+esc(q.why)+'</div>';
}
var lastQ=S.qi===c.quiz.length-1;
foot='<button class="btn pri" data-a="next"'+(S.answered?'':' disabled')+'>'+(S.answered?(lastQ?'See my results →':'Next question →'):'Pick an answer')+'</button>';
}else{
var passed=S.right>=need();
kicker='Lesson '+S.n+' of '+S.count+' · Results';
body+='<div class="score"><div class="big">'+S.right+' / '+c.quiz.length+'</div><div class="sm">'+
(passed?'🎉 Great work! You passed.':'You need '+need()+' out of '+c.quiz.length+' to complete this lesson.')+'</div></div>';
var missed=S.log.filter(function(x){return!x.ok;});
if(missed.length){
body+='<p style="font-weight:700;margin-bottom:8px">Review what you missed:</p>';
missed.forEach(function(m){
var qq=c.quiz[m.qi];
body+='<div class="miss"><b>'+esc(qq.q)+'</b>Your answer: '+esc(qq.opts[m.picked])+'<br>Right answer: <b style="display:inline">'+esc(qq.opts[qq.ans])+'</b><br>'+esc(qq.why)+'</div>';
});
}else{
body+='<p style="text-align:center">Perfect score. You got every question right!</p>';
}
if(passed){
foot='<button class="btn pri" data-a="finish">'+(S.done?'Close':'✅ Finish lesson & claim +'+S.xp+' XP')+'</button>';
}else{
foot='<button class="btn sec" data-a="review">Review the lesson</button><button class="btn pri" data-a="retry">Try the quiz again</button>';
}
}
sheet.innerHTML=
'<div class="head"><div class="ic">'+S.icon+'</div><div class="tt"><div class="kicker">'+esc(kicker)+'</div><h2>'+esc(S.title)+'</h2></div><button class="x" data-a="close" aria-label="Close">✕</button></div>'+
'<div class="bar"><i style="width:'+pct+'%"></i></div>'+
'<div class="body">'+body+'</div>'+
'<div class="foot">'+foot+'</div>';
sheet.onclick=function(e){
var t=e.target.closest('[data-a],[data-o]');if(!t)return;
if(t.hasAttribute('data-o')){pick(parseInt(t.getAttribute('data-o'),10));return;}
var a=t.getAttribute('data-a');
if(a==='next')next();else if(a==='back')back();else if(a==='close')tryClose();
else if(a==='finish')finishLesson();
else if(a==='retry')startQuiz();
else if(a==='review'){S.stage='read';S.page=0;render();}
};
var bd=sheet.querySelector('.body');if(bd)bd.scrollTop=0;
}
window.openLesson=function(id){
var mm=meta(id),c=DATA[id];
if(!mm|| !c)return;
injectStyle();
var old=document.getElementById('tw34l');if(old)old.remove();
var v14=document.getElementById('v14-lesson-modal');if(v14)v14.style.display='none';
S={id:id,c:c,stage:'read',page:0,qi:0,answered:false,right:0,log:[],
title:mm.m.title,icon:mm.m.icon,xp:mm.m.xp||20,n:mm.n,count:mm.total,done:isDone(id)};
var root=document.createElement('div');
root.id='tw34l';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
root.innerHTML='<div class="sheet"></div>';
root.addEventListener('mousedown',function(e){if(e.target===root)tryClose();});
document.body.appendChild(root);
document.addEventListener('keydown',onKey,true);
render();
};
window.v16OpenLesson=function(id){window.openLesson(id);};
window.v14AnswerLesson=function(){};
function renderGrids(){
var lessons=window.lessonsData||[];
var ua=(typeof userActivity!=='undefined')?userActivity:null;
var completed=(ua&&ua.lessonsCompleted)||[];
var done=completed.filter(function(id){return lessons.some(function(l){return l.id===id;});}).length;
['ai-lessons-grid','lessons-grid'].forEach(function(gid){
var grid=document.getElementById(gid);
if(!grid)return;
grid.innerHTML=lessons.map(function(l){
var d=completed.indexOf(l.id)!== -1,c=DATA[l.id];
return'<div class="lesson-card'+(d?' done':'')+'" onclick="window.v16OpenLesson(\''+l.id+'\')" style="cursor:pointer">'+
'<div class="lesson-card-top"><div class="lesson-icon">'+(l.icon||'📚')+'</div><div>'+
'<div class="lesson-title">'+esc(l.title)+'</div>'+
'<div class="lesson-meta">'+(c?c.mins:4)+' min · '+(l.xp||20)+' XP'+(d?' · ✓':'')+'</div></div></div>'+
'<div class="lesson-card-bottom"><span class="lesson-progress" style="color:'+(d?'var(--green)':'var(--muted)')+'">'+(d?'Done':'Not started')+'</span>'+
'<button class="lesson-btn '+(d?'done':'start')+'" onclick="window.v16OpenLesson(\''+l.id+'\');event.stopPropagation()">'+(d?'Review':'Start →')+'</button></div></div>';
}).join('');
var pre=gid==='ai-lessons-grid'?'ai-':'';
var dc=document.getElementById(pre+'lessons-done-count');if(dc)dc.textContent=done;
var tc=document.getElementById(pre+'lessons-total-count');if(tc)tc.textContent=lessons.length;
var pb=document.getElementById(pre+'lessons-progress-bar');if(pb)pb.style.width=Math.round(done/(lessons.length||1)*100)+'%';
var pl=document.getElementById(pre+'lessons-progress-label');
if(pl)pl.textContent=done===0?'Start a lesson below!':done===lessons.length?'🎓 All done!':(lessons.length-done)+' left';
});
var db=document.getElementById('ai-lessons-done-badge');if(db)db.textContent=done+' done';
}
window.renderLessonsGrid=renderGrids;
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-20.js */
try{
(function(){
'use strict';
var LS_LINKS='tw_parent_links',LS_REQ='tw_link_requests',LS_CODES='tw_teen_codes';
function read(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function me(){try{return(typeof currentUser!=='undefined'&&currentUser)||window.currentUser||null;}catch(e){return null;}}
function em(u){return String((u&&u.email)||'').toLowerCase();}
function isTeen(){var u=me();return!!u&&u.type==='teen';}
function isDemoTeen(){return em(me())==='teen@teenwork.demo';}
function toast(m,t){if(typeof showToast==='function')showToast(m,t||'success');}
function validEmail(s){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);}
function linkOf(email){return read(LS_LINKS,{})[String(email||'').toLowerCase()]||null;}
function setLink(email,data){var m=read(LS_LINKS,{});m[String(email).toLowerCase()]=data;write(LS_LINKS,m);}
function teenStatus(){
if(!isTeen()||isDemoTeen())return'approved';
var l=linkOf(em(me()))||me().parentLinked||null;
return(l&&l.status)||'none';
}
function isLimited(){return isTeen()&&teenStatus()!=='approved'&& !(window._twIsTesterUser&&window._twIsTesterUser(me()));}
function linkInfo(){return linkOf(em(me()))||me().parentLinked||{};}
function teenCodeFor(email){
email=String(email).toLowerCase();
var m=read(LS_CODES,{});
if(!m[email]){
var used={};Object.keys(m).forEach(function(k){used[m[k]]=1;});
var c;do{c='TEEN-'+(1000+Math.floor(Math.random()*9000));}while(used[c]);
m[email]=c;write(LS_CODES,m);
}
return m[email];
}
function ageFrom(dob){
if(!dob)return 0;var b=new Date(/^\d{4}-\d\d-\d\d$/.test(dob)?dob+'T00:00':dob),t=new Date();if(isNaN(b))return 0;
var a=t.getFullYear()-b.getFullYear();
if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;
return a;
}
function injectStyle(){
if(document.getElementById('tw35-style'))return;
var st=document.createElement('style');st.id='tw35-style';
st.textContent=
'.tw35-banner{display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:#fff7e6;border:1.5px solid #f5c26b;color:#7a4a00;border-radius:12px;padding:10px 14px;margin:0 0 14px;font-size:.88rem;line-height:1.45}'+
'.tw35-banner b{color:#5c3600}.tw35-banner button{margin-left:auto}'+
'.tw35-btn{font-family:inherit;font-weight:700;font-size:.88rem;border-radius:10px;padding:10px 16px;min-height:42px;cursor:pointer;border:1.5px solid var(--green,#2d6a4f);background:transparent;color:var(--green,#2d6a4f)}'+
'.tw35-btn.pri{background:var(--green,#2d6a4f);color:#fff}'+
'.tw35-btn.full{width:100%;margin-top:8px}'+
'.tw35-card{background:var(--card,#fff);border:1.5px solid var(--border,#e5e7eb);border-radius:14px;padding:16px;margin-bottom:16px}'+
'.tw35-card h3{margin:0 0 8px;font-size:1rem;color:var(--green,#2d6a4f)}'+
'.tw35-card p,.tw35-body p{font-size:.88rem;line-height:1.55;color:var(--muted,#6b7280);margin:0 0 10px}'+
'.tw35-code{display:flex;align-items:center;gap:10px;background:var(--bg,#f4f1ea);border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:8px 12px;margin:0 0 10px;font-size:.8rem;color:var(--muted,#6b7280)}'+
'.tw35-code b{font-family:monospace;font-size:1.05rem;letter-spacing:2px;color:var(--text,#1c1c1c)}'+
'.tw35-code button{margin-left:auto;font-family:inherit;font-size:.78rem;font-weight:700;background:none;border:1.5px solid var(--border,#d1d5db);border-radius:8px;padding:5px 10px;cursor:pointer;color:inherit}'+
'.tw35-input{width:100%;box-sizing:border-box;padding:11px 13px;border:1.5px solid var(--border,#d1d5db);border-radius:10px;font:inherit;font-size:.95rem;outline:none;background:var(--card,#fff);color:var(--text,#1c1c1c)}'+
'.tw35-input:focus{border-color:var(--green,#2d6a4f)}'+
'.tw35-msg{min-height:1.2em;font-size:.8rem;margin:6px 0 2px}'+
'.tw35-ok{background:#dcfce7;color:#14532d;border-radius:10px;padding:10px 12px;font-size:.88rem;line-height:1.5}'+
'.tw35-wait{background:#fff7e6;color:#7a4a00;border-radius:10px;padding:10px 12px;font-size:.88rem;margin-bottom:10px;line-height:1.5}'+
'.tw35-warn{background:#fee2e2;color:#7f1d1d;border-radius:10px;padding:10px 12px;font-size:.88rem;margin-bottom:10px}'+
'.tw35-sep{font-size:.8rem;color:var(--muted,#6b7280);margin:12px 0 6px}'+
'#tw35-modal{position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px;font-family:"DM Sans",sans-serif}'+
'#tw35-modal .sheet{background:var(--card,#fff);color:var(--text,#1c1c1c);width:100%;max-width:440px;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow-y:auto;border-radius:18px;padding:20px 18px;box-shadow:0 12px 48px rgba(0,0,0,.3);position:relative}'+
'#tw35-modal h2{margin:0 28px 6px 0;font-family:"Fraunces",Georgia,serif;font-size:1.2rem;color:var(--green,#2d6a4f)}'+
'#tw35-modal .x{position:absolute;top:10px;right:12px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--muted,#6b7280);padding:6px}'+
'.tw35-req{display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:#eef7f0;border:1.5px solid var(--green,#2d6a4f);border-radius:12px;padding:12px 14px;margin:0 0 12px;font-size:.9rem}'+
'.tw35-req .t{flex:1 1 220px;line-height:1.45}'+
'#parent-lock-overlay .tw35-body{text-align:left}';
document.head.appendChild(st);
}
function panelHTML(sfx){
var u=me(),st=teenStatus(),l=linkInfo(),code=teenCodeFor(em(u)),h='';
var codeBox='<div class="tw35-code"><span>Your link code</span><b>'+esc(code)+'</b><button type="button" onclick="twCopyCode()">Copy</button></div>';
if(st==='approved'){
return'<div class="tw35-ok">✅ Parent linked'+(l.parentName?': <b>'+esc(l.parentName)+'</b>':'')+
(l.parentEmail?' ('+esc(l.parentEmail)+')':'')+'. Everything is unlocked.</div>';
}
if(st==='pending'){
h+='<div class="tw35-wait">⏳ Waiting for <b>'+esc(l.parentEmail||'your parent')+'</b> to approve.</div>'+
'<p>Your parent signs in to their TeenWork parent account and taps <b>Approve</b>, or enters your code under <b>Link another teen</b>.</p>'+codeBox+
'<button type="button" class="tw35-btn pri full" style="margin-top:0" onclick="twCheckApproval()">🔄 Check if my parent approved</button>'+
'<div class="tw35-sep">Wrong email? Send it to a different one:</div>';
}else{
if(st==='declined')h+='<div class="tw35-warn">Your parent declined that request. You can send a new one.</div>';
h+='<p>A linked parent or guardian unlocks applying for jobs, messaging employers and logging work. Send them a request, or give them your code.</p>'+codeBox;
}
h+='<input type="email" class="tw35-input" id="tw35-email-'+sfx+'" placeholder="Parent\'s email address" autocomplete="email" onkeydown="if(event.key===\'Enter\')twSendLink(\''+sfx+'\')">'+
'<div class="tw35-msg" id="tw35-msg-'+sfx+'"></div>'+
'<button type="button" class="tw35-btn pri full" style="margin-top:0" onclick="twSendLink(\''+sfx+'\')">📨 '+(st==='pending'?'Send to this email':'Send link request')+'</button>';
return h;
}
window.twCopyCode=function(){
var c=teenCodeFor(em(me()));
try{navigator.clipboard.writeText(c).then(function(){toast('Code copied: '+c,'success');},function(){toast('Your code is '+c,'info');});}
catch(e){toast('Your code is '+c,'info');}
};
window.twSendLink=function(sfx){
var inp=document.getElementById('tw35-email-'+sfx),msg=document.getElementById('tw35-msg-'+sfx);
var pe=(inp&&inp.value||'').trim().toLowerCase();
function say(t,bad){if(msg){msg.style.color=bad?'var(--red,#b91c1c)':'var(--green,#2d6a4f)';msg.textContent=t;}}
if(!validEmail(pe)){say('⚠️ Please enter a valid parent email address.',true);return;}
if(pe===em(me())){say("⚠️ That's your own email. Enter your parent's email.",true);return;}
var reqs=read(LS_REQ,[]).filter(function(r){return!(r.teenEmail===em(me())&&r.status==='pending');});
reqs.push({teenEmail:em(me()),teenName:me().name||em(me()),parentEmail:pe,code:teenCodeFor(em(me())),status:'pending',at:Date.now()});
write(LS_REQ,reqs);
var data={status:'pending',parentEmail:pe,requestedAt:new Date().toISOString()};
setLink(em(me()),data);me().parentLinked=data;
toast('Request saved for '+pe+'. Ask them to approve it.','success');
refreshUI(true);
};
window.twCheckApproval=function(){
var before=teenStatus();
var l=linkOf(em(me()));
if(l&&l.status==='approved'){me().parentLinked=l;refreshUI(true);toast('🎉 Parent linked! Everything is unlocked.','success');}
else if(l&&l.status==='declined'){me().parentLinked=l;refreshUI(true);}
else toast('Not approved yet. Your parent needs to approve it first.','info');
};
function bannerHTML(){
var st=teenStatus();
return'<span>🔒 <b>Limited mode.</b> '+(st==='pending'?'Waiting for your parent to approve. ':'Link a parent to unlock ')+
(st==='pending'?'':'applying for jobs, messaging employers and logging work. ')+
'You can still look around, take lessons and build your profile.</span>'+
'<button type="button" class="tw35-btn pri" onclick="twOpenLinkModal()">'+(st==='pending'?'See status':'🔗 Link a parent')+'</button>';
}
function openModal(title,sub){
injectStyle();
var m=document.getElementById('tw35-modal');if(m)m.remove();
m=document.createElement('div');m.id='tw35-modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
m.innerHTML='<div class="sheet"><button class="x" type="button" aria-label="Close" onclick="twCloseLinkModal()">✕</button>'+
'<h2>'+esc(title)+'</h2>'+(sub?'<p>'+esc(sub)+'</p>':'')+'<div class="tw35-body" id="tw35-modal-body">'+panelHTML('m')+'</div></div>';
m.addEventListener('mousedown',function(e){if(e.target===m)window.twCloseLinkModal();});
document.body.appendChild(m);
var inp=document.getElementById('tw35-email-m');if(inp)setTimeout(function(){try{inp.focus();}catch(e){}},50);
}
window.twOpenLinkModal=function(){openModal('🔗 Link a parent','');};
window.twCloseLinkModal=function(){var m=document.getElementById('tw35-modal');if(m)m.remove();};
document.addEventListener('keydown',function(e){if(e.key==='Escape')window.twCloseLinkModal();},true);
function gate(){
if(document.getElementById('tw35-modal'))return;
openModal('🔒 Link a parent to use this','You are in limited mode, so this is locked for now.');
}
var GATED=['teenApply','applyToJob','sendMsg','openMsgChat','openMsgModal','openAddShiftModal','openAddWorkLogModal','addEarningsEntry','saveShift','addSelectedShifts'];
var GATE_RE=new RegExp('(^|[^A-Za-z0-9_$])('+GATED.join('|')+')\\s*\\(');
function wrapGates(){
GATED.forEach(function(n){
var o=window[n];
if(typeof o!=='function'||o.__tw35)return;
var w=function(){if(isLimited()){gate();return;}return o.apply(this,arguments);};
w.__tw35=true;window[n]=w;
});
}
document.addEventListener('click',function(e){
if(!isLimited())return;
var t=e.target&&e.target.closest?e.target.closest('[onclick]'):null;
if(!t||t.closest('#tw35-modal')||t.closest('#parent-lock-overlay'))return;
if(GATE_RE.test(t.getAttribute('onclick')||'')){e.preventDefault();e.stopImmediatePropagation();gate();}
},true);
var lastSig=null;
function sig(){return isTeen()?(teenStatus()+'|'+(linkInfo().parentEmail||'')):'x';}
function ensureBanner(){
var host=document.querySelector('#page-teen .dashboard'),b=document.getElementById('tw35-banner');
if(!isTeen()|| !isLimited()|| !host){if(b)b.remove();return;}
if(!b){
b=document.createElement('div');b.id='tw35-banner';b.className='tw35-banner';
var hdr=host.querySelector('.dash-header');
if(hdr&&hdr.nextSibling)host.insertBefore(b,hdr.nextSibling);else host.appendChild(b);
}
b.innerHTML=bannerHTML();
}
function ensureCard(){
var panel=document.getElementById('ttab-resume'),c=document.getElementById('tw-link-card');
if(!isTeen()|| !panel){if(c)c.remove();return;}
if(!c){
c=document.createElement('div');c.id='tw-link-card';c.className='tw35-card';
var prof=document.getElementById('teen-profile-card');
if(prof&&prof.parentNode===panel)panel.insertBefore(c,prof.nextSibling);else panel.insertBefore(c,panel.firstChild);
}
c.innerHTML='<h3>👪 Parent link</h3>'+panelHTML('c');
}
function refreshUI(force){
injectStyle();
var s=sig();
if(force||s!==lastSig){
var was=lastSig;lastSig=s;
document.body.classList.toggle('tw-limited',isLimited());
ensureBanner();ensureCard();
var mb=document.getElementById('tw35-modal-body');if(mb)mb.innerHTML=panelHTML('m');
var lb=document.getElementById('tw35-lock-body');if(lb)lb.innerHTML=panelHTML('lock');
if(!force&&was&&was.indexOf('approved')!==0&&s.indexOf('approved')===0&&isTeen())toast('🎉 Your parent approved your account! Everything is unlocked.','success');
}else{ensureBanner();}
}
window.showParentLockScreen=function(){
injectStyle();
document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
var old=document.getElementById('parent-lock-overlay');if(old)old.remove();
var o=document.createElement('div');o.id='parent-lock-overlay';
o.style.cssText='position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto;';
o.innerHTML=
'<div id="parent-link-card" style="background:var(--card);border-radius:24px;box-shadow:var(--shadow-lg);border:1px solid var(--border);max-width:440px;width:100%;padding:1.8rem 1.5rem;margin:auto">'+
'<div style="font-size:2.4rem;text-align:center">👪</div>'+
'<h2 style="font-family:Fraunces,serif;font-size:1.5rem;color:var(--green);margin:.3rem 0 .5rem;text-align:center">Link a parent</h2>'+
'<p style="color:var(--muted);font-size:.88rem;line-height:1.55;margin:0 0 1rem;text-align:center">You can skip this for now and look around in limited mode.</p>'+
'<div class="tw35-body" id="tw35-lock-body">'+panelHTML('lock')+'</div>'+
'<button type="button" class="tw35-btn full" onclick="twSkipLink()">Skip for now — open my account (limited)</button>'+
'<button type="button" class="tw35-btn full" style="border-color:var(--border);color:var(--muted);font-weight:600" onclick="signOut()">↩ Sign out</button>'+
'</div>';
document.body.appendChild(o);
lastSig=null;
};
window.twSkipLink=function(){
var st=teenStatus();
if(st==='none'||st==='declined'){
var d={status:'skipped',skippedAt:new Date().toISOString()};
setLink(em(me()),d);me().parentLinked=d;
}
var o=document.getElementById('parent-lock-overlay');if(o)o.remove();
toast('Limited mode: you can look around. Link a parent any time from Profile to unlock everything.','info');
launchDashboard();
};
window.submitParentLinkRequest=function(){window.twSendLink('lock');};
window.checkParentLinkApproval=function(){
var l=linkOf(em(me()));
if(l&&l.status==='approved'){
me().parentLinked=l;
var o=document.getElementById('parent-lock-overlay');if(o)o.remove();
toast('🎉 Parent linked! Welcome to TeenWork!','success');launchDashboard();
}else toast('Not approved yet. Your parent needs to approve it first.','info');
};
function addLinkedTeen(email,acct){
acct=acct||{};
if(typeof linkedTeens==='undefined')return;
if(linkedTeens.some(function(t){return t.email===email;}))return;
linkedTeens.push({name:acct.name||email,age:ageFrom(acct.dob)||15,city:(acct.city?acct.city+(acct.state?', '+acct.state:''):(acct.state||'—')),
inviteCode:teenCodeFor(email),status:'active',jobs:0,rating:0,avatar:'🧑',email:email});
try{if(typeof saveLinkedTeens==='function')saveLinkedTeens();if(typeof renderMultiTeens==='function')renderMultiTeens();}catch(e){}
}
function approveTeen(email){
var acct=read('tw_local_accounts',{})[email]||{};
setLink(email,{status:'approved',parentEmail:em(me()),parentName:me().name||'',approvedAt:new Date().toISOString()});
var reqs=read(LS_REQ,[]);reqs.forEach(function(r){if(r.teenEmail===email&&r.status==='pending')r.status='approved';});write(LS_REQ,reqs);
addLinkedTeen(email,acct);
return acct;
}
window.twApproveLink=function(teenEmail){
var e=String(teenEmail).toLowerCase(),a=approveTeen(e);
toast('✅ Linked to '+(a.name||e)+'. They now have full access.','success');renderRequests();
};
window.twDeclineLink=function(teenEmail){
var e=String(teenEmail).toLowerCase();
setLink(e,{status:'declined',parentEmail:em(me()),declinedAt:new Date().toISOString()});
var reqs=read(LS_REQ,[]);reqs.forEach(function(r){if(r.teenEmail===e&&r.status==='pending')r.status='declined';});write(LS_REQ,reqs);
toast('Request declined.','info');renderRequests();
};
function renderRequests(){
if(!me()||me().type!=='parent')return;
var host=document.querySelector('#page-parent .dashboard');if(!host)return;
var box=document.getElementById('tw35-requests'),mine=em(me());
var list=read(LS_REQ,[]).filter(function(r){return r.status==='pending'&&r.parentEmail===mine;});
if(!list.length){if(box)box.remove();return;}
injectStyle();
if(!box){
box=document.createElement('div');box.id='tw35-requests';
var hdr=host.querySelector('.dash-header');
if(hdr&&hdr.nextSibling)host.insertBefore(box,hdr.nextSibling);else host.appendChild(box);
}
box.innerHTML=list.map(function(r){
var k=encodeURIComponent(r.teenEmail);
return'<div class="tw35-req"><div class="t">👋 <b>'+esc(r.teenName)+'</b> ('+esc(r.teenEmail)+') asked to link to your account. Approving gives them access to apply for jobs, message employers and log work, with you overseeing it.</div>'+
'<button type="button" class="tw35-btn pri" onclick="twApproveLink(decodeURIComponent(\''+k+'\'))">✅ Approve</button>'+
'<button type="button" class="tw35-btn" onclick="twDeclineLink(decodeURIComponent(\''+k+'\'))">Decline</button></div>';
}).join('');
}
function linkByCode(code,silent){
code=String(code||'').trim().toUpperCase();
var codes=read(LS_CODES,{}),email=null;
Object.keys(codes).forEach(function(k){if(codes[k]===code)email=k;});
if(!email)return false;
var acct=approveTeen(email);
if(!silent)toast('✅ Linked to '+(acct.name||email)+'! They now have full access.','success');
return true;
}
var _origLinkAnother=window.linkAnotherTeen;
window.linkAnotherTeen=function(){
var inp=document.getElementById('mt-invite'),code=inp?inp.value.trim().toUpperCase():'';
if(code&&linkByCode(code,false)){if(inp)inp.value='';renderRequests();return;}
if(typeof _origLinkAnother==='function')return _origLinkAnother.apply(this,arguments);
};
document.addEventListener('click',function(e){
if(e.target&&e.target.closest&&e.target.closest('#signup-btn')){var i=document.getElementById('su-invite');window.__twInvite=i?i.value:'';}
},true);
function afterLaunch(){
wrapGates();refreshUI(true);renderRequests();
if(me()&&me().type==='parent'&&window.__twInvite){var c=window.__twInvite;window.__twInvite='';if(linkByCode(c,false))renderRequests();}
}
var _ld=window.launchDashboard;
if(typeof _ld==='function'){
window.launchDashboard=function(){
var r=_ld.apply(this,arguments);
setTimeout(afterLaunch,60);setTimeout(afterLaunch,700);
return r;
};
}
wrapGates();setTimeout(wrapGates,1500);
window.addEventListener('storage',function(e){if(e.key===LS_LINKS||e.key===LS_REQ){refreshUI(false);renderRequests();}});
setInterval(function(){if(isTeen())refreshUI(false);else if(me()&&me().type==='parent')renderRequests();},1500);
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-21.js */
try{
(function(){
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function appUrl(){try{return/^https?:/.test(location.protocol)?location.href.split('#')[0].split('?')[0]:'';}catch(e){return'';}}
function btn(label){var u=appUrl();return u?'<p style="margin:22px 0 4px;"><a href="'+esc(u)+'" style="background:#2d6a4f;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block;font-family:Arial,Helvetica,sans-serif;">'+esc(label)+'</a></p>':'';}
function read(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}}
window.twSendEmail=function(to,subject,html){
try{
if(!to||typeof emailjs==='undefined'||typeof EMAILJS_SERVICE==='undefined')return Promise.resolve(false);
try{emailjs.init(EMAILJS_PUBKEY);}catch(e){}
return emailjs.send(EMAILJS_SERVICE,EMAILJS_TEMPLATE,{
to_email:to,subject:subject,message:html,reply_to:ADMIN_EMAIL
}).then(function(){return true;},function(e){console.warn('TeenWork email failed:',e);return false;});
}catch(e){console.warn(e);return Promise.resolve(false);}
};
window.twWelcomeEmail=function(to,first,type){
var f=esc(first||'there'),body;
if(type==='teen')body='<p>Hi '+f+',</p><p>Welcome to <b>TeenWork</b> — your account is ready! Here is how to get started:</p><ul style="padding-left:20px;"><li>Finish your profile so employers can get to know you</li><li>Take the short lessons on being a great worker</li><li>Link a parent or guardian to unlock applying for jobs and messaging employers</li></ul><p>Until a parent is linked, you are in <b>limited mode</b>: you can look around, take lessons and build your profile.</p>';
else if(type==='parent')body='<p>Hi '+f+',</p><p>Welcome to <b>TeenWork</b> — your parent account is ready. You can link your teen, approve what they apply for, and keep an eye on their work.</p><ul style="padding-left:20px;"><li>Approve link requests from your teen</li><li>Review jobs and messages</li><li>Use your invite code option to link another teen at any time</li></ul>';
else body='<p>Hi '+f+',</p><p>Welcome to <b>TeenWork</b> — your employer account is ready. Post a job, set up your business profile, and meet local teens looking for safe, legal work.</p><ul style="padding-left:20px;"><li>Complete your business profile</li><li>Post your first job</li><li>Review the teen work rules for hours and duties</li></ul>';
return window.twSendEmail(to,'Welcome to TeenWork, '+String(first||'').replace(/[<>]/g,'')+'! 🎉',body+btn('Open TeenWork'));
};
function reqFor(teenEmail){
var l=read('tw_link_requests',[]),r=null;
l.forEach(function(x){if(x.teenEmail===teenEmail)r=x;});
return r;
}
var oSend=window.twSendLink;
window.twSendLink=function(sfx){
var before=read('tw_link_requests',[]).length;
var r=oSend.apply(this,arguments);
var all=read('tw_link_requests',[]);
var last=all[all.length-1];
if(last&&last.status==='pending'&&last.at&&Date.now()-last.at<3000){
var html='<p>Hi,</p><p><b>'+esc(last.teenName)+'</b> ('+esc(last.teenEmail)+') would like to link their TeenWork account to yours so they can apply for jobs safely.</p>'+
'<p>Sign in (or create a free Parent account) with <b>this email address</b> and you will see the request to approve. You can also enter their invite code:</p>'+
'<p style="font-size:24px;letter-spacing:3px;font-weight:bold;color:#1b4332;margin:8px 0;">'+esc(last.code)+'</p>'+btn('Open TeenWork');
window.twSendEmail(last.parentEmail,String(last.teenName).replace(/[<>]/g,'')+' wants to link with you on TeenWork',html);
}
return r;
};
var oApprove=window.twApproveLink;
window.twApproveLink=function(teenEmail){
var e=String(teenEmail).toLowerCase(),r=reqFor(e);
var out=oApprove.apply(this,arguments);
window.twSendEmail(e,'Your parent approved your TeenWork link 🎉',
'<p>Hi '+esc(r&&r.teenName||'')+',</p><p>Great news — your parent approved the link. <b>Everything is unlocked</b>: you can now apply for jobs, message employers and log your work.</p>'+btn('Open TeenWork'));
if(r&&r.parentEmail)window.twSendEmail(r.parentEmail,'You are now linked with '+String(r.teenName||'your teen').replace(/[<>]/g,''),
'<p>Hi,</p><p>You approved the link with <b>'+esc(r.teenName||e)+'</b>. They now have full access to apply for jobs, message employers and log their work, with you linked as their parent.</p>'+btn('Open TeenWork'));
return out;
};
var oDecline=window.twDeclineLink;
window.twDeclineLink=function(teenEmail){
var e=String(teenEmail).toLowerCase(),r=reqFor(e);
var out=oDecline.apply(this,arguments);
window.twSendEmail(e,'Update on your TeenWork link request',
'<p>Hi '+esc(r&&r.teenName||'')+',</p><p>Your parent did not approve the link request this time. You can still look around, take lessons and build your profile. Talk with them, then send a new request when you are ready.</p>'+btn('Open TeenWork'));
return out;
};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/featpack-v39-admin-js.js */
try{
(function(){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const toast=(m,t)=>{try{showToast(m,t||'success');}catch(e){}};
const audit=(a,d)=>{try{_twAdminAudit(a,d);}catch(e){}};
const isAdmin=()=> !!((window.currentUser&&window.currentUser.isAdmin)||(typeof currentUser!=='undefined'&&currentUser&&currentUser.isAdmin));
const sb=()=>(typeof sbClient!=='undefined'&&sbClient)?sbClient:null;
const fmtDate=ts=>{if(!ts)return'—';const d=new Date(ts);return isNaN(d)?'—':d.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});};
const ageFrom=dob=>{if(!dob)return'';const b=new Date(/^\d{4}-\d\d-\d\d$/.test(dob)?dob+'T00:00':dob),t=new Date();if(isNaN(b))return'';let a=t.getFullYear()-b.getFullYear();if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;return a;};
const prefixFor=key=>'tw_'+String(key).replace(/[^a-z0-9]/gi,'_')+'_';
const roleIcon={teen:'🧑',parent:'👨‍👩‍👧',employer:'💼'};
const $=id=>document.getElementById(id);
const uid=()=>'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
let cloudAccounts=[];
let cloudStatus='Cloud database not checked yet.';
let cloudLoading=false;
function localAccounts(){
const all=_twLocalAccounts();
return Object.keys(all).map(k=>({...all[k],_key:k,slot:all[k].slot||(k.includes('#')?(parseInt(k.split('#')[1])||1):1),source:'device'}));
}
function allAccounts(){
const local=localAccounts();
const seen=new Set(local.map(a=>a._key));
const cloud=cloudAccounts.filter(c=> !seen.has(c._key)).map(c=>({...c,source:'cloud'}));
return local.concat(cloud).sort((a,b)=>(b.created||0)-(a.created||0));
}
async function loadCloudAccounts(){
const client=sb();
if(!client){cloudStatus='Cloud database is not connected on this page, so only accounts saved on this device are listed.';cloudAccounts=[];return;}
cloudLoading=true;
try{
const{data,error}=await client.from('user_data').select('email,value,updated_at').eq('key','account_profile').limit(2000);
if(error)throw error;
cloudAccounts=(data||[]).map(r=>{
let v={};try{v=JSON.parse(r.value||'{}');}catch(e){}
return{...v,_key:r.email,email:v.email||String(r.email).split('#')[0],slot:v.slot||1,cloudUpdated:r.updated_at};
});
const{data:rows}=await client.from('user_data').select('email').limit(5000);
const known=new Set(cloudAccounts.map(a=>a._key));
(rows||[]).forEach(r=>{
if(r.email&& !known.has(r.email)&& !_twIsAdminEmail(r.email)){
known.add(r.email);
cloudAccounts.push({_key:r.email,email:String(r.email).split('#')[0],name:'',type:'',created:0,slot:1,dataOnly:true});
}
});
cloudStatus='Cloud database checked at '+new Date().toLocaleTimeString()+': '+cloudAccounts.length+' account'+(cloudAccounts.length===1?'':'s')+' found there.';
}catch(e){
cloudAccounts=[];
cloudStatus='Could not read the cloud database ('+(e&&e.message?e.message:e)+'). Showing accounts saved on this device.';
}
cloudLoading=false;
}
const STYLE=`
    .adm39-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin-bottom:14px; }
    .adm39-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
    .adm39-in, .adm39-sel, .adm39-ta { padding:7px 12px; border:1.5px solid var(--border); border-radius:8px; font-family:'DM Sans',sans-serif; font-size:.83rem; background:var(--card,#fff); color:var(--text); outline:none; }
    .adm39-in:focus, .adm39-sel:focus, .adm39-ta:focus { border-color:var(--green); }
    .adm39-ta { width:100%; min-height:72px; resize:vertical; box-sizing:border-box; }
    .adm39-acct { background:var(--card); border:1.5px solid var(--border); border-radius:12px; padding:12px 14px; margin-bottom:8px; }
    .adm39-acct.suspended { border-color:#f0b66a; background:#fffaf0; }
    .adm39-acct-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .adm39-avatar { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; background:var(--bg); flex-shrink:0; }
    .adm39-pill { display:inline-block; padding:2px 8px; border-radius:20px; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.4px; background:var(--bg); color:var(--muted); border:1px solid var(--border); }
    .adm39-pill.teen { background:var(--green-pale); color:var(--green); border-color:transparent; }
    .adm39-pill.parent { background:var(--blue-pale); color:var(--blue); border-color:transparent; }
    .adm39-pill.employer { background:var(--amber-pale); color:var(--amber); border-color:transparent; }
    .adm39-pill.warn { background:#fff3cd; color:#856404; border-color:transparent; }
    .adm39-pill.cloud { background:var(--purple-pale,#ede9fe); color:var(--purple,#6d28d9); border-color:transparent; }
    .adm39-actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
    .adm39-details { margin-top:10px; background:var(--bg); border-radius:10px; padding:10px 12px; font-size:.8rem; line-height:1.6; }
    .adm39-details table { width:100%; border-collapse:collapse; }
    .adm39-details td { padding:3px 6px 3px 0; vertical-align:top; }
    .adm39-details td:first-child { color:var(--muted); white-space:nowrap; width:130px; }
    .adm39-list-item { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border); font-size:.84rem; }
    .adm39-list-item:last-child { border-bottom:none; }
    .adm39-log { font-size:.78rem; max-height:320px; overflow:auto; }
    .adm39-log div { padding:6px 0; border-bottom:1px solid var(--border); display:flex; gap:10px; }
    .adm39-log div:last-child { border-bottom:none; }
    .adm39-log time { color:var(--muted); white-space:nowrap; }
    .adm39-muted { font-size:.78rem; color:var(--muted); }
    .adm39-danger { border-color:#f5b7b1 !important; }
    .adm39-ok { color:var(--green); font-weight:700; }
    .adm39-bad { color:var(--red); font-weight:700; }
    code.adm39-code { display:block; background:#1a1a2e; color:#e2e8f0; padding:8px 10px; border-radius:8px; font-size:.75rem; overflow:auto; white-space:pre; margin-top:6px; user-select:all; }
  `;
const TABS=[
['accounts','👤 Accounts'],
['rules','📧 Email Rules'],
['announce','📢 Announcements'],
['security','🔐 Security & Log'],
['data','🧰 Data Tools'],
];
function panelsHTML(){
return`
      <!-- ── ACCOUNTS (v39) ─── -->
      <div class="adm-tab-panel" id="adm-panel-accounts">
        <div class="adm-section-title">👤 All Accounts</div>
        <p class="adm39-muted" style="margin-bottom:12px">Every TeenWork account: the ones saved on this device plus the ones the cloud database knows about. <span id="adm39-cloud-status"></span></p>
        <div class="adm39-grid" id="adm39-acct-tiles"></div>
        <div class="adm39-row">
          <input type="text" id="adm39-acct-search" class="adm39-in" placeholder="Search name, email, city…" style="flex:1;min-width:170px">
          <select id="adm39-acct-role" class="adm39-sel"><option value="">All roles</option><option value="teen">Teens</option><option value="parent">Parents</option><option value="employer">Employers</option></select>
          <select id="adm39-acct-status" class="adm39-sel"><option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="multi">Shared emails</option><option value="cloud">Cloud only</option></select>
          <button class="adm-btn adm-btn-mark" id="adm39-acct-refresh">🔄 Refresh</button>
          <button class="adm-btn adm-btn-mark" id="adm39-acct-export">⬇️ Export CSV</button>
        </div>
        <div id="adm39-acct-list"></div>
        <div class="adm-card" style="margin-top:14px">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:8px">➕ Create an account</div>
          <p class="adm39-muted" style="margin-bottom:10px">Handy for testers. Accounts made here work exactly like sign-up accounts (teen, parent or employer only — the admin role can never be created this way).</p>
          <div class="adm39-row">
            <input id="adm39-new-name" class="adm39-in" placeholder="Full name" style="flex:1;min-width:140px">
            <input id="adm39-new-email" class="adm39-in" placeholder="Email" style="flex:1;min-width:160px">
            <select id="adm39-new-role" class="adm39-sel"><option value="teen">Teen</option><option value="parent">Parent</option><option value="employer">Employer</option></select>
          </div>
          <div class="adm39-row">
            <input id="adm39-new-dob" class="adm39-in" type="date" title="Date of birth (teens & parents)">
            <input id="adm39-new-city" class="adm39-in" placeholder="City" style="min-width:120px">
            <input id="adm39-new-state" class="adm39-in" placeholder="State" style="width:110px">
            <input id="adm39-new-pw" class="adm39-in" type="text" placeholder="Password (8+ characters)" style="flex:1;min-width:160px">
            <button class="adm-btn adm-btn-reply" id="adm39-new-create">Create account</button>
          </div>
        </div>
      </div>

      <!-- ── EMAIL RULES (v39) ─── -->
      <div class="adm-tab-panel" id="adm-panel-rules">
        <div class="adm-section-title">📧 Email Rules</div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:4px">🔁 Emails allowed to have more than one account</div>
          <p class="adm39-muted" style="margin-bottom:10px">Normally one email = one account. Add an email here (or a whole domain like <strong>*@yourschool.org</strong>) and it can sign up again as another teen, parent or employer. At sign-in, people with several accounts pick which one to open.</p>
          <div class="adm39-row">
            <input id="adm39-multi-input" class="adm39-in" placeholder="name@email.com or *@domain.com" style="flex:1;min-width:200px">
            <button class="adm-btn adm-btn-reply" id="adm39-multi-add">Allow</button>
            <label class="adm39-muted" style="display:flex;align-items:center;gap:6px">Max per email <input id="adm39-multi-max" class="adm39-in" type="number" min="2" max="50" style="width:64px;text-align:center"></label>
          </div>
          <div id="adm39-multi-list"></div>
        </div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:4px">🚫 Blocked emails &amp; domains</div>
          <p class="adm39-muted" style="margin-bottom:10px">Sign-up is refused for these. Existing accounts are not affected (suspend them from the Accounts tab).</p>
          <div class="adm39-row">
            <input id="adm39-block-input" class="adm39-in" placeholder="name@email.com or *@domain.com" style="flex:1;min-width:200px">
            <button class="adm-btn adm-btn-delete" id="adm39-block-add">Block</button>
          </div>
          <div id="adm39-block-list"></div>
        </div>
      </div>

      <!-- ── ANNOUNCEMENTS (v39) ─── -->
      <div class="adm-tab-panel" id="adm-panel-announce">
        <div class="adm-section-title">📢 Announcements</div>
        <div class="adm-card">
          <p class="adm39-muted" style="margin-bottom:10px">Shows as a banner at the top of the dashboard the next time people open the app, until they dismiss it. Use the <strong>Message</strong> button on an account to write to one person.</p>
          <div class="adm39-row">
            <input id="adm39-ann-title" class="adm39-in" placeholder="Title (e.g. New lessons are live!)" style="flex:1;min-width:200px">
            <select id="adm39-ann-aud" class="adm39-sel"><option value="all">Everyone</option><option value="teen">Teens only</option><option value="parent">Parents only</option><option value="employer">Employers only</option></select>
          </div>
          <textarea id="adm39-ann-body" class="adm39-ta" placeholder="Your message…"></textarea>
          <div class="adm39-row" style="margin-top:8px"><button class="adm-btn adm-btn-reply" id="adm39-ann-send">📢 Post announcement</button></div>
        </div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:8px">History</div>
          <div id="adm39-ann-list"></div>
        </div>
      </div>

      <!-- ── SECURITY & LOG (v39) ─── -->
      <div class="adm-tab-panel" id="adm-panel-security">
        <div class="adm-section-title">🔐 Security &amp; Log</div>
        <div class="adm-card" id="adm39-sec-login"></div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:6px">🛡 How the admin role is protected</div>
          <ul class="adm39-muted" style="margin:0;padding-left:18px;line-height:1.7">
            <li>Sign-up can only create teen, parent or employer accounts; an "admin" type is refused even if the page is tampered with.</li>
            <li>The admin password is never written in the app, only a salted hash, and a wrong guess shows the same message as any wrong password.</li>
            <li>Stored accounts marked anything other than teen / parent / employer cannot sign in.</li>
            <li>The Platform Admin page and this panel open only for the signed-in admin.</li>
            <li>Every admin action is written to the audit log below.</li>
          </ul>
        </div>
        <div class="adm-card">
          <div class="adm39-row" style="justify-content:space-between;margin-bottom:6px"><div style="font-weight:700;font-size:.9rem">📝 Admin activity log</div><button class="adm-btn adm-btn-delete" id="adm39-audit-clear">Clear</button></div>
          <div class="adm39-log" id="adm39-audit-list"></div>
        </div>
        <div class="adm-card">
          <div class="adm39-row" style="justify-content:space-between;margin-bottom:6px"><div style="font-weight:700;font-size:.9rem">🔑 Sign-in log</div><button class="adm-btn adm-btn-delete" id="adm39-signin-clear">Clear</button></div>
          <div id="adm39-signin-summary" class="adm39-muted" style="margin-bottom:6px"></div>
          <div class="adm39-log" id="adm39-signin-list"></div>
        </div>
      </div>

      <!-- ── DATA TOOLS (v39) ─── -->
      <div class="adm-tab-panel" id="adm-panel-data">
        <div class="adm-section-title">🧰 Data Tools</div>
        <div class="adm-card" id="adm39-data-usage"></div>
        <div class="adm-card">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:6px">💾 Backup &amp; restore (this device)</div>
          <p class="adm39-muted" style="margin-bottom:10px">Export saves every TeenWork record on this device (accounts, settings, logs, user data) to one JSON file. Import restores a backup; existing records with the same name are replaced.</p>
          <div class="adm39-row">
            <button class="adm-btn adm-btn-reply" id="adm39-export-all">⬇️ Export full backup</button>
            <label class="adm-btn adm-btn-mark" style="cursor:pointer">⬆️ Import backup <input type="file" id="adm39-import-file" accept="application/json,.json" style="display:none"></label>
          </div>
        </div>
        <div class="adm-card adm39-danger">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:6px;color:var(--red)">⚠️ Danger zone</div>
          <div class="adm39-row">
            <button class="adm-btn adm-btn-delete" id="adm39-wipe-accounts">Delete ALL accounts on this device</button>
            <button class="adm-btn adm-btn-delete" id="adm39-wipe-logs">Clear all logs</button>
          </div>
        </div>
      </div>`;
}
function inject(){
const panel=$('tw-admin-panel');
if(!panel||panel.querySelector('#adm-panel-accounts'))return;
const st=document.createElement('style');st.textContent=STYLE;panel.appendChild(st);
const tabs=panel.querySelector('.adm-tabs');
const content=panel.querySelector('.adm-content');
if(!tabs|| !content)return;
TABS.forEach(([id,label])=>{
const b=document.createElement('button');
b.className='adm-tab';b.textContent=label;
b.onclick=()=>window.adminSwitchTab(id,b);
tabs.appendChild(b);
});
const holder=document.createElement('div');holder.innerHTML=panelsHTML();
while(holder.firstChild)content.appendChild(holder.firstChild);
wire();
renderAll();
loadCloudAccounts().then(()=>{renderAccounts();});
}
function renderAll(){renderAccounts();renderRules();renderAnnouncements();renderSecurity();renderData();}
function accountInfo(a){
const px=prefixFor(a._key);
const keys=Object.keys(localStorage).filter(k=>k.startsWith(px));
let bytes=0;keys.forEach(k=>{bytes+=(localStorage.getItem(k)||'').length;});
const links=read('tw_parent_links',{});
const link=links[String(a.email||'').toLowerCase()]||null;
const tier=localStorage.getItem(px+'acct_tier')||'free';
return{keys,bytes,link,tier};
}
function renderAccounts(){
const list=$('adm39-acct-list');if(!list)return;
const q=($('adm39-acct-search')?.value||'').trim().toLowerCase();
const role=$('adm39-acct-role')?.value||'';
const status=$('adm39-acct-status')?.value||'';
const all=allAccounts();
const byEmail={};all.forEach(a=>{const e=String(a.email||'').toLowerCase();byEmail[e]=(byEmail[e]||0)+1;});
const t={total:all.length,teen:0,parent:0,employer:0,suspended:0,cloud:0,multi:0};
all.forEach(a=>{if(t[a.type]!=null)t[a.type]++;if(a.suspended)t.suspended++;if(a.source==='cloud')t.cloud++;});
t.multi=Object.values(byEmail).filter(n=>n>1).length;
const tiles=$('adm39-acct-tiles');
if(tiles)tiles.innerHTML=[
['Accounts',t.total],['Teens',t.teen],['Parents',t.parent],['Employers',t.employer],['Suspended',t.suspended],['Shared emails',t.multi],['Cloud only',t.cloud],
].map(([l,v])=>`<div class="adm-stat"><div class="adm-stat-val">${v}</div><div class="adm-stat-label">${l}</div></div>`).join('');
const cs=$('adm39-cloud-status');if(cs)cs.textContent=cloudLoading?'Checking the cloud database…':cloudStatus;
const rows=all.filter(a=>{
if(role&&a.type!==role)return false;
if(status==='active'&&a.suspended)return false;
if(status==='suspended'&& !a.suspended)return false;
if(status==='multi'&&byEmail[String(a.email||'').toLowerCase()]<2)return false;
if(status==='cloud'&&a.source!=='cloud')return false;
if(q){const hay=[a.name,a.email,a.city,a.state,a.type].join(' ').toLowerCase();if(!hay.includes(q))return false;}
return true;
});
if(!rows.length){list.innerHTML='<div class="adm-empty">No accounts match.'+(all.length?'':' Nobody has signed up on this device yet.')+'</div>';return;}
list.innerHTML=rows.map(a=>{
const age=ageFrom(a.dob);
const shared=byEmail[String(a.email||'').toLowerCase()]>1;
const sub=[a.type?a.type[0].toUpperCase()+a.type.slice(1):'Unknown role',age!==''?'age '+age:'',[a.city,a.state].filter(Boolean).join(', '),a.created?'joined '+new Date(a.created).toLocaleDateString():''].filter(Boolean).join(' · ');
return`<div class="adm39-acct${a.suspended?' suspended':''}" data-key="${esc(a._key)}" data-src="${a.source}">
        <div class="adm39-acct-head">
          <div class="adm39-avatar">${roleIcon[a.type]||'👤'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:.92rem">${esc(a.name||'(no name saved)')} ${a.slot>1?`<span class="adm39-pill">account #${a.slot}</span>`:''}</div>
            <div class="adm39-muted">${esc(a.email)} · ${esc(sub)}</div>
          </div>
          ${a.type?`<span class="adm39-pill ${esc(a.type)}">${esc(a.type)}</span>`:''}
          ${a.suspended?'<span class="adm39-pill warn">suspended</span>':''}
          ${shared?'<span class="adm39-pill">shared email</span>':''}
          ${a.source==='cloud'?'<span class="adm39-pill cloud">cloud</span>':''}
        </div>
        <div class="adm39-actions">
          <button class="adm-btn adm-btn-mark" data-act="details">🔍 Details</button>
          <button class="adm-btn adm-btn-mark" data-act="message">✉️ Message</button>
          ${a.source==='device'?`
            <button class="adm-btn adm-btn-mark" data-act="resetpw">🔑 Reset password</button>
            <button class="adm-btn ${a.suspended?'adm-btn-reply':'adm-btn-mark'}" data-act="suspend">${a.suspended?'✅ Unsuspend':'⛔ Suspend'}</button>
            <button class="adm-btn adm-btn-delete" data-act="delete">🗑 Delete</button>`:''}
        </div>
        <div class="adm39-details" data-details style="display:none"></div>
      </div>`;
}).join('');
}
function detailsHTML(a){
const info=accountInfo(a);
const rows=[
['Name',esc(a.name||'—')],['Email',esc(a.email)],['Role',a.type?`<select class="adm39-sel" data-role-sel style="padding:3px 8px">${['teen','parent','employer'].map(r=>`<option value="${r}"${a.type===r?' selected':''}>${r}</option>`).join('')}</select> <button class="adm-btn adm-btn-mark" data-act="saverole" style="padding:3px 10px">Save role</button>`:'—'],
['Date of birth',esc(a.dob||'—')+(ageFrom(a.dob)!==''?' (age '+ageFrom(a.dob)+')':'')],
['Location',esc([a.city,a.state].filter(Boolean).join(', ')||'—')],
['Created',fmtDate(a.created)],['Last sign-in',fmtDate(a.lastLogin)],
['Status',a.suspended?`<span class="adm39-bad">Suspended</span> ${fmtDate(a.suspendedAt)}`:'<span class="adm39-ok">Active</span>'],
['Stored on',a.source==='device'?'This device'+(cloudAccounts.some(c=>c._key===a._key)?' + cloud':''):'Cloud only (signed up on another device)'],
['Plan',esc(info.tier)],
['Parent link',info.link?esc(info.link.status||'—')+(info.link.parentEmail?' · '+esc(info.link.parentEmail):''):'—'],
['Saved data',info.keys.length+' record'+(info.keys.length===1?'':'s')+' · '+(info.bytes/1024).toFixed(1)+' KB on this device'],
['Storage key','<code>'+esc(a._key)+'</code>'],
];
if(a.source==='device')rows.splice(2,0,[]);
return'<table>'+rows.filter(r=>r.length).map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')+'</table>';
}
function findAccount(key){return allAccounts().find(a=>a._key===key);}
function saveAccountChange(key,fn){
const all=_twLocalAccounts();if(!all[key])return false;fn(all[key]);_twSaveLocalAccounts(all);return true;
}
async function onAccountAction(act,key,card){
const a=findAccount(key);if(!a)return;
if(act==='details'){
const d=card.querySelector('[data-details]');
if(d.style.display==='none'){d.innerHTML=detailsHTML(a);d.style.display='block';}else d.style.display='none';
return;
}
if(act==='message'){
const body=prompt('Message to '+(a.name||a.email)+' (shows as a banner the next time they open TeenWork):');
if(!body|| !body.trim())return;
const anns=read('tw_admin_announcements',[]);
anns.unshift({id:uid(),title:'Message from TeenWork',body:body.trim(),audience:'one',to:a._key,toEmail:a.email,at:new Date().toISOString()});
write('tw_admin_announcements',anns.slice(0,300));
audit('Sent message',a.email+(a.slot>1?' (#'+a.slot+')':''));
toast('✉️ Message queued for '+(a.name||a.email));
renderAnnouncements();
return;
}
if(a.source!=='device'){toast('That account lives on another device, so it can only be viewed or messaged here.','info');return;}
if(act==='resetpw'){
const pw=prompt('New password for '+a.email+' (at least 8 characters):');
if(pw==null)return;
if(pw.length<8){toast('Password must be at least 8 characters.','error');return;}
const salt=Math.random().toString(36).slice(2)+Date.now().toString(36);
const hash=await _twHashPw(pw,salt);
saveAccountChange(key,r=>{r.salt=salt;r.hash=hash;r.pwResetAt=Date.now();});
audit('Reset password',a.email+(a.slot>1?' (#'+a.slot+')':''));
toast('🔑 Password updated for '+a.email);
return;
}
if(act==='suspend'){
const now= !a.suspended;
if(now&& !confirm('Suspend '+(a.name||a.email)+'? They will not be able to sign in until you unsuspend them.'))return;
saveAccountChange(key,r=>{r.suspended=now;r.suspendedAt=now?Date.now():undefined;});
audit(now?'Suspended account':'Unsuspended account',a.email+(a.slot>1?' (#'+a.slot+')':''));
toast(now?'⛔ Account suspended':'✅ Account unsuspended');
renderAccounts();
return;
}
if(act==='saverole'){
const sel=card.querySelector('[data-role-sel]');const role=sel&&sel.value;
if(!TW_ACCOUNT_TYPES.includes(role)){toast('Role must be teen, parent or employer.','error');return;}
if(role===a.type){toast('Role unchanged.','info');return;}
saveAccountChange(key,r=>{r.type=role;});
audit('Changed role',a.email+': '+a.type+' → '+role);
toast('✅ Role changed to '+role);
renderAccounts();
return;
}
if(act==='delete'){
if(!confirm('Delete the '+(a.type||'')+' account for '+a.email+'? This cannot be undone.'))return;
const info=accountInfo(a);
const wipeData=info.keys.length?confirm('Also delete their saved data ('+info.keys.length+' records) on this device?\n\nOK = delete data too · Cancel = keep the data'):false;
const all=_twLocalAccounts();delete all[key];_twSaveLocalAccounts(all);
if(wipeData)info.keys.forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
audit('Deleted account',a.email+(a.slot>1?' (#'+a.slot+')':'')+(wipeData?' + data':''));
toast('🗑 Account deleted');
renderAccounts();
}
}
async function createAccount(){
const name=($('adm39-new-name').value||'').trim();
const email=($('adm39-new-email').value||'').trim();
const role=$('adm39-new-role').value;
const dob=$('adm39-new-dob').value||'';
const city=($('adm39-new-city').value||'').trim();
const state=($('adm39-new-state').value||'').trim();
const pw=$('adm39-new-pw').value||'';
if(!name|| !email|| !pw){toast('Name, email and password are required.','error');return;}
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||ADMIN_LOGIN_ALIASES.includes(email.toLowerCase())){toast('Please enter a real email address.','error');return;}
if(!TW_ACCOUNT_TYPES.includes(role)){toast('Role must be teen, parent or employer.','error');return;}
if(pw.length<8){toast('Password must be at least 8 characters.','error');return;}
if(_twEmailBlocked(email)){toast('That email is on the blocked list (Email Rules).','error');return;}
const existing=_twAccountsForEmail(email);
let key=email.toLowerCase(),slot=1;
if(existing.length){
if(!confirm(email+' already has '+existing.length+' account'+(existing.length===1?'':'s')+' on this device. Create another one anyway?'))return;
slot=Math.max(...existing.map(a=>a.slot||1))+1;key=email.toLowerCase()+'#'+slot;
}
const salt=Math.random().toString(36).slice(2)+Date.now().toString(36);
const hash=await _twHashPw(pw,salt);
const all=_twLocalAccounts();
all[key]={name,email,type:role,dob,city,state,salt,hash,created:Date.now(),slot,createdBy:'admin'};
_twSaveLocalAccounts(all);
_twRegisterAccountInCloud(all[key],key);
_twLogSignin({email:email.toLowerCase(),type:role,ok:true,event:'created-by-admin',slot});
audit('Created account',email+' ('+role+(slot>1?', #'+slot:'')+')');
['adm39-new-name','adm39-new-email','adm39-new-dob','adm39-new-city','adm39-new-state','adm39-new-pw'].forEach(id=>{$(id).value='';});
toast('✅ Account created for '+email);
renderAccounts();
}
function exportCSV(){
const rows=[['name','email','role','account_no','date_of_birth','age','city','state','created','last_sign_in','status','stored_on']];
allAccounts().forEach(a=>rows.push([a.name||'',a.email||'',a.type||'',a.slot||1,a.dob||'',ageFrom(a.dob),a.city||'',a.state||'',a.created?new Date(a.created).toISOString():'',a.lastLogin?new Date(a.lastLogin).toISOString():'',a.suspended?'suspended':'active',a.source]));
const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
download('teenwork-accounts-'+new Date().toISOString().slice(0,10)+'.csv',csv,'text/csv');
audit('Exported accounts CSV',(rows.length-1)+' accounts');
}
function download(name,text,type){
try{
const blob=new Blob([text],{type:type||'application/octet-stream'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();
setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},800);
}catch(e){toast('Download failed: '+e.message,'error');}
}
function cleanRule(v){
v=String(v||'').trim().toLowerCase();
if(!v)return'';
if(v.startsWith('@'))v='*'+v;
if(v.startsWith('*@'))return/^\*@[^\s@*]+\.[^\s@*]+$/.test(v)?v:'';
return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?v:'';
}
function renderRules(){
const r=_twAdminRules();
const maxEl=$('adm39-multi-max');if(maxEl)maxEl.value=r.maxAccountsPerEmail||5;
const ml=$('adm39-multi-list');
if(ml)ml.innerHTML=r.multiEmails.length?r.multiEmails.map(e=>{
const n=e.startsWith('*@')?localAccounts().filter(a=>_twEmailMatchesRule(a.email,e)).length:_twAccountsForEmail(e).length;
return`<div class="adm39-list-item"><span style="flex:1">${esc(e)} <span class="adm39-muted">· ${n} account${n===1?'':'s'} on this device</span></span><button class="adm-btn adm-btn-delete" data-rm-multi="${esc(e)}">Remove</button></div>`;
}).join(''):'<div class="adm39-muted" style="padding:6px 0">No emails allowed yet. Every email can have one account.</div>';
const bl=$('adm39-block-list');
if(bl)bl.innerHTML=r.blockedEmails.length?r.blockedEmails.map(e=>`<div class="adm39-list-item"><span style="flex:1">${esc(e)}</span><button class="adm-btn adm-btn-mark" data-rm-block="${esc(e)}">Unblock</button></div>`).join(''):'<div class="adm39-muted" style="padding:6px 0">Nothing blocked.</div>';
}
function addRule(kind){
const inp=$(kind==='multi'?'adm39-multi-input':'adm39-block-input');
const v=cleanRule(inp.value);
if(!v){toast('Enter a full email (name@site.com) or a domain (*@site.com).','error');return;}
const r=_twAdminRules();
const list=kind==='multi'?r.multiEmails:r.blockedEmails;
if(list.includes(v)){toast('Already on the list.','info');return;}
list.push(v);_twSaveAdminRules(r);inp.value='';
audit(kind==='multi'?'Allowed multiple accounts':'Blocked email',v);
toast(kind==='multi'?'✅ '+v+' can now have more than one account':'🚫 '+v+' blocked from sign-up');
renderRules();
}
function removeRule(kind,v){
const r=_twAdminRules();
if(kind==='multi')r.multiEmails=r.multiEmails.filter(x=>x!==v);else r.blockedEmails=r.blockedEmails.filter(x=>x!==v);
_twSaveAdminRules(r);
audit(kind==='multi'?'Removed multi-account allowance':'Unblocked email',v);
renderRules();
}
function renderAnnouncements(){
const el=$('adm39-ann-list');if(!el)return;
const anns=read('tw_admin_announcements',[]);
const audLabel={all:'Everyone',teen:'Teens',parent:'Parents',employer:'Employers',one:'One person'};
el.innerHTML=anns.length?anns.map(a=>`<div class="adm39-list-item" style="align-items:flex-start"><span style="font-size:1.1rem">${a.to?'✉️':'📢'}</span><div style="flex:1;min-width:0"><div style="font-weight:700">${esc(a.title)} <span class="adm39-pill">${esc(a.to?'to '+(a.toEmail||a.to):(audLabel[a.audience]||a.audience))}</span></div><div class="adm39-muted" style="white-space:pre-wrap">${esc(a.body)}</div><div class="adm39-muted">${fmtDate(a.at)}</div></div><button class="adm-btn adm-btn-delete" data-rm-ann="${esc(a.id)}">Remove</button></div>`).join(''):'<div class="adm39-muted" style="padding:6px 0">No announcements yet.</div>';
}
function postAnnouncement(){
const title=($('adm39-ann-title').value||'').trim();
const body=($('adm39-ann-body').value||'').trim();
const aud=$('adm39-ann-aud').value||'all';
if(!body){toast('Please write a message first.','error');return;}
const anns=read('tw_admin_announcements',[]);
anns.unshift({id:uid(),title:title||'Announcement',body,audience:aud,at:new Date().toISOString()});
write('tw_admin_announcements',anns.slice(0,300));
$('adm39-ann-title').value='';$('adm39-ann-body').value='';
audit('Posted announcement',(title||'Announcement')+' → '+aud);
toast('📢 Announcement posted');
renderAnnouncements();
}
function renderSecurity(){
const el=$('adm39-sec-login');
if(el){
el.innerHTML=`
        <div style="font-weight:700;font-size:.9rem;margin-bottom:6px">🔑 Admin sign-in</div>
        <p class="adm39-muted">Sign in on the normal <strong>Sign In</strong> page with <strong>${esc(ADMIN_EMAIL)}</strong> (or just <strong>admin</strong>) and that account's own TeenWork password, then pick <strong>Admin panel</strong>.
        The admin is a real Supabase sign-in: the account is marked as admin in Supabase, and the database and the delete-account function check that mark. There is no admin password in the app any more.</p>
        <p class="adm39-muted" style="margin-top:8px">To change the password, sign out and use <strong>Forgot password?</strong> on the Sign In page with ${esc(ADMIN_EMAIL)}.</p>`;
}
const al=$('adm39-audit-list');
if(al){const log=read('tw_admin_audit',[]);al.innerHTML=log.length?log.slice(0,150).map(e=>`<div><time>${fmtDate(e.at)}</time><span><strong>${esc(e.action)}</strong>${e.detail?' · '+esc(e.detail):''}</span></div>`).join(''):'<div class="adm39-muted">Nothing logged yet.</div>';}
const sl=$('adm39-signin-list');
if(sl){
const log=read('tw_signin_log',[]);
const fails=log.filter(e=> !e.ok).length;
const sum=$('adm39-signin-summary');if(sum)sum.textContent=log.length+' events · '+fails+' failed sign-ins';
const label={login:'Signed in',signup:'Signed up','wrong-password':'Wrong password',suspended:'Blocked (suspended)','admin-wrong-password':'Wrong admin password','created-by-admin':'Created by admin'};
sl.innerHTML=log.length?log.slice(0,150).map(e=>`<div><time>${fmtDate(e.at)}</time><span class="${e.ok?'adm39-ok':'adm39-bad'}">${esc(label[e.event]||e.event)}</span><span>${esc(e.email||'')}${e.type?' · '+esc(e.type):''}${e.slot>1?' #'+e.slot:''}</span></div>`).join(''):'<div class="adm39-muted">No sign-ins logged yet.</div>';
}
}
function twKeys(){return Object.keys(localStorage).filter(k=>k.startsWith('tw_'));}
function renderData(){
const el=$('adm39-data-usage');if(!el)return;
const keys=twKeys();let bytes=0;keys.forEach(k=>{bytes+=(localStorage.getItem(k)||'').length;});
const groups={accounts:0,admin:0,users:0};
keys.forEach(k=>{if(k==='tw_local_accounts')groups.accounts++;else if(k.startsWith('tw_admin_')||k==='tw_signin_log')groups.admin++;else groups.users++;});
el.innerHTML=`<div style="font-weight:700;font-size:.9rem;margin-bottom:8px">📦 Storage on this device</div>
      <div class="adm39-grid">
        <div class="adm-stat"><div class="adm-stat-val">${keys.length}</div><div class="adm-stat-label">Records</div></div>
        <div class="adm-stat"><div class="adm-stat-val">${(bytes/1024).toFixed(0)}</div><div class="adm-stat-label">KB used</div></div>
        <div class="adm-stat"><div class="adm-stat-val">${localAccounts().length}</div><div class="adm-stat-label">Accounts</div></div>
        <div class="adm-stat"><div class="adm-stat-val">${groups.admin}</div><div class="adm-stat-label">Admin records</div></div>
      </div>
      <p class="adm39-muted">Browsers allow roughly 5,000 KB per site. Cloud sync: ${sb()?'<span class="adm39-ok">connected</span>':'<span class="adm39-bad">not connected on this page</span>'}.</p>`;
}
function exportAll(){
const out={app:'TeenWork',version:'v39',exported:new Date().toISOString(),records:{}};
twKeys().forEach(k=>{out.records[k]=localStorage.getItem(k);});
download('teenwork-backup-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.json',JSON.stringify(out,null,2),'application/json');
audit('Exported full backup',Object.keys(out.records).length+' records');
}
function importAll(file){
if(!file)return;
const fr=new FileReader();
fr.onload=()=>{
try{
const data=JSON.parse(fr.result);
const recs=data&&data.records;if(!recs||typeof recs!=='object')throw new Error('not a TeenWork backup');
const n=Object.keys(recs).filter(k=>k.startsWith('tw_')).length;
if(!confirm('Restore '+n+' records from this backup? Records with the same name on this device will be replaced.'))return;
Object.keys(recs).forEach(k=>{if(k.startsWith('tw_')&&typeof recs[k]==='string')localStorage.setItem(k,recs[k]);});
audit('Imported backup',n+' records from '+(file.name||'file'));
toast('✅ Backup restored ('+n+' records)');
renderAll();
}catch(e){toast('That file is not a TeenWork backup ('+e.message+').','error');}
};
fr.readAsText(file);
}
function wire(){
const on=(id,ev,fn)=>{const el=$(id);if(el)el.addEventListener(ev,fn);};
['adm39-acct-search','adm39-acct-role','adm39-acct-status'].forEach(id=>{on(id,'input',renderAccounts);on(id,'change',renderAccounts);});
on('adm39-acct-refresh','click',()=>{renderAccounts();loadCloudAccounts().then(renderAccounts);});
on('adm39-acct-export','click',exportCSV);
on('adm39-new-create','click',createAccount);
on('adm39-acct-list','click',e=>{
const b=e.target.closest('[data-act]');if(!b)return;
const card=b.closest('.adm39-acct');if(!card)return;
onAccountAction(b.getAttribute('data-act'),card.getAttribute('data-key'),card);
});
on('adm39-multi-add','click',()=>addRule('multi'));
on('adm39-multi-input','keydown',e=>{if(e.key==='Enter')addRule('multi');});
on('adm39-block-add','click',()=>addRule('block'));
on('adm39-block-input','keydown',e=>{if(e.key==='Enter')addRule('block');});
on('adm39-multi-max','change',e=>{const r=_twAdminRules();const n=Math.max(2,Math.min(50,parseInt(e.target.value)||5));r.maxAccountsPerEmail=n;_twSaveAdminRules(r);e.target.value=n;audit('Max accounts per email',String(n));toast('Max accounts per allowed email: '+n);});
on('adm39-multi-list','click',e=>{const b=e.target.closest('[data-rm-multi]');if(b)removeRule('multi',b.getAttribute('data-rm-multi'));});
on('adm39-block-list','click',e=>{const b=e.target.closest('[data-rm-block]');if(b)removeRule('block',b.getAttribute('data-rm-block'));});
on('adm39-ann-send','click',postAnnouncement);
on('adm39-ann-list','click',e=>{const b=e.target.closest('[data-rm-ann]');if(!b)return;const id=b.getAttribute('data-rm-ann');write('tw_admin_announcements',read('tw_admin_announcements',[]).filter(a=>a.id!==id));audit('Removed announcement',id);renderAnnouncements();});
on('adm39-audit-clear','click',()=>{if(!confirm('Clear the admin activity log?'))return;localStorage.removeItem('tw_admin_audit');audit('Cleared admin activity log');renderSecurity();});
on('adm39-signin-clear','click',()=>{if(!confirm('Clear the sign-in log?'))return;localStorage.removeItem('tw_signin_log');audit('Cleared sign-in log');renderSecurity();});
on('adm39-export-all','click',exportAll);
on('adm39-import-file','change',e=>{importAll(e.target.files&&e.target.files[0]);e.target.value='';});
on('adm39-wipe-accounts','click',()=>{
const n=localAccounts().length;
if(!n){toast('There are no accounts on this device.','info');return;}
if(!confirm('Delete ALL '+n+' accounts saved on this device? People will have to sign up again.'))return;
if(prompt('Type DELETE to confirm:')!=='DELETE'){toast('Cancelled.','info');return;}
localStorage.removeItem('tw_local_accounts');
audit('Deleted ALL accounts on this device',n+' accounts');
toast('🗑 All accounts deleted');
renderAll();
});
on('adm39-wipe-logs','click',()=>{if(!confirm('Clear the admin activity log and the sign-in log?'))return;localStorage.removeItem('tw_signin_log');localStorage.removeItem('tw_admin_audit');audit('Cleared all logs');renderSecurity();});
}
const _oLaunchAdmin=window.launchAdminPanel;
window.launchAdminPanel=function(){
if(!isAdmin()){try{showToast('Admin sign-in required.','error');}catch(e){}return;}
const r=_oLaunchAdmin?_oLaunchAdmin.apply(this,arguments):undefined;
try{inject();}catch(e){console.warn('v39 admin inject failed',e);}
return r;
};
const _oSwitch=window.adminSwitchTab;
window.adminSwitchTab=function(name,btn){
const r=_oSwitch?_oSwitch.apply(this,arguments):undefined;
try{
if(name==='accounts')renderAccounts();
if(name==='rules')renderRules();
if(name==='announce')renderAnnouncements();
if(name==='security')renderSecurity();
if(name==='data')renderData();
}catch(e){}
return r;
};
const _oAdminOut=window.adminSignOut;
window.adminSignOut=function(){
audit('Signed out');
const r=_oAdminOut?_oAdminOut.apply(this,arguments):undefined;
window.currentUser=null;try{currentUser=null;}catch(e){}
return r;
};
function showAnnouncementsFor(u){
if(!u||u.isAdmin|| !TW_ACCOUNT_TYPES.includes(u.type))return;
const anns=read('tw_admin_announcements',[]);
if(!anns.length)return;
const key=u.dataKey||String(u.email||'').toLowerCase();
const dKey=prefixFor(key)+'dismissed_ann';
const dismissed=read(dKey,[]);
const mine=anns.filter(a=> !dismissed.includes(a.id)&&(a.to?a.to===key:(a.audience==='all'||a.audience===u.type)));
document.getElementById('tw39-ann')?.remove();
if(!mine.length)return;
const page=document.querySelector('.page.active .dashboard')||document.querySelector('.page.active');
if(!page)return;
const box=document.createElement('div');box.id='tw39-ann';
box.style.cssText='display:grid;gap:10px;margin:0 0 1.2rem;';
box.innerHTML=mine.map(a=>`<div data-ann="${esc(a.id)}" style="background:linear-gradient(135deg,var(--green-pale,#d8f3dc),var(--card,#fff));border:1.5px solid var(--green-light,#95d5b2);border-radius:14px;padding:12px 16px;display:flex;gap:12px;align-items:flex-start;font-family:'DM Sans',sans-serif">
        <span style="font-size:1.4rem;line-height:1">${a.to?'✉️':'📢'}</span>
        <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:.95rem;color:var(--green)">${esc(a.title||'Announcement')}</div><div style="font-size:.86rem;color:var(--text);line-height:1.5;white-space:pre-wrap">${esc(a.body)}</div><div style="font-size:.72rem;color:var(--muted);margin-top:4px">${esc(fmtDate(a.at))} · TeenWork team</div></div>
        <button type="button" data-dismiss="${esc(a.id)}" aria-label="Dismiss" style="background:none;border:none;font-size:1.1rem;color:var(--muted);cursor:pointer;line-height:1">✕</button></div>`).join('');
box.addEventListener('click',e=>{
const b=e.target.closest('[data-dismiss]');if(!b)return;
const id=b.getAttribute('data-dismiss');const d=read(dKey,[]);if(!d.includes(id)){d.push(id);write(dKey,d);}
b.closest('[data-ann]').remove();if(!box.children.length)box.remove();
});
const hdr=page.querySelector('.dash-header');
if(hdr&&hdr.parentNode===page)page.insertBefore(box,hdr.nextSibling);else page.insertBefore(box,page.firstChild);
}
const _oLaunchDash=window.launchDashboard;
window.launchDashboard=function(){
const r=_oLaunchDash?_oLaunchDash.apply(this,arguments):undefined;
setTimeout(()=>{try{showAnnouncementsFor(window.currentUser||(typeof currentUser!=='undefined'?currentUser:null));}catch(e){}},700);
return r;
};
window._twShowAnnouncements=()=>showAnnouncementsFor(window.currentUser||(typeof currentUser!=='undefined'?currentUser:null));
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
