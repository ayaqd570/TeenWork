/* TeenWork app-e.js — a built file, do not edit. Edit the files named below (assets/js, assets/css), then run: node tools/build.cjs */
/* assets/js/homepage-trust-v48.js */
try{
(function(){
'use strict';
if(window.__twHomepageTrust48)return;
window.__twHomepageTrust48=true;
const SHOW_COUNTS_FROM=25;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const me=()=>window.currentUser||(typeof currentUser!=='undefined'?currentUser:null);
const isDemoUser=u=> !!(u&&(u.isDemo|| /\.demo$/i.test(String(u.email||''))));
const sb=()=>(typeof sbClient!=='undefined'&&sbClient)?sbClient:null;
const later=(fn,ms)=>setTimeout(()=>{try{fn();}catch(e){console.warn('homepage-trust-v48:',e);}},ms);
const css=`
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
const st=document.createElement('style');st.id='homepage-trust-v48-css';st.textContent=css;document.head.appendChild(st);
const AUTH=['page-signup','page-login','page-email-sent'];
function syncLanding(){
const lp=$('page-landing'),act=document.querySelector('.page.active');
document.body.classList.toggle('tw48-landing',!!(lp&&lp.classList.contains('active')));
document.body.classList.toggle('tw48-auth',!!(act&&AUTH.indexOf(act.id)>=0));
syncDemo();
}
function addAuthHelp(){
AUTH.forEach(id=>{
const card=document.querySelector('#'+id+' .auth-card, #'+id+' .email-sent-card');
if(!card||card.querySelector('.tw48-auth-help'))return;
const p=document.createElement('p');
p.className='auth-switch tw48-auth-help';
p.innerHTML='Need help? <a href="#" onclick="twOpenHelp();return false">Contact support</a>';
card.appendChild(p);
});
}
function dropFakeSchema(){
const s=$('v14-review-schema');if(s)s.remove();
}
let counts=null,countsAt=0,loading=false;
async function loadCounts(force){
if(loading||(!force&&counts&&Date.now()-countsAt<5*60*1000))return;
let c=sb();
if(!c&&typeof window._twEnsureSupabase==='function'){try{window._twEnsureSupabase();}catch(e){}c=sb();}
if(!c||typeof c.rpc!=='function')return;
loading=true;
try{
const r=await c.rpc('tw_public_counts');
if(r&& !r.error&&r.data&&typeof r.data==='object'){counts=r.data;countsAt=Date.now();}
}catch(e){}
finally{loading=false;renderCounts();window.dispatchEvent(new CustomEvent('tw-public-counts',{detail:counts}));}
}
const n=v=>Math.max(0,parseInt(v,10)||0);
function renderCounts(){
const body=$('tw48-numbers-body'),states=$('tw48-job-states');
if(!body)return;
const c=counts;
if(states){
const list=c&&Array.isArray(c.job_states)?c.job_states.filter(Boolean).map(String):[];
states.textContent=c&&n(c.open_jobs)>0&&list.length?'Open jobs right now are in: '+list.join(', ')+'.':'';
}
if(!c||n(c.accounts)<SHOW_COUNTS_FROM)return;
const when=new Date(c.as_of||Date.now());
const asOf=isNaN(when)?'':when.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
const tile=(v,label)=>`<div class="tw48-num"><strong>${esc(n(v))}</strong><span>${esc(label)}</span></div>`;
body.innerHTML=
`<div class="tw48-nums">${tile(c.teens,'teens')}${tile(c.parents,'parents')}${tile(c.employers,'employers')}${tile(c.open_jobs,'open jobs')}</div>`+
`<p class="tw48-small">Counted live from TeenWork's database${asOf?' on '+esc(asOf):''}. Accounts are ones real people made; demo, test and closed accounts aren't counted. Open jobs are real employers' posts that are still open (posts close after 90 days).</p>`;
}
let lastFocus=null;
window.twOpenSafetyDetails=function(){
const m=$('tw48-safety-modal');if(!m)return;
lastFocus=document.activeElement;
m.classList.add('open');
const x=m.querySelector('.tw48-x');if(x)try{x.focus();}catch(e){}
};
window.twCloseSafetyDetails=function(){
const m=$('tw48-safety-modal');if(!m)return;
m.classList.remove('open','active');
if(lastFocus&&lastFocus.focus)try{lastFocus.focus();}catch(e){}
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('tw48-safety-modal')?.classList.contains('open'))window.twCloseSafetyDetails();});
window.twOpenHelp=function(){
if(typeof window.openSupportModal==='function')return window.openSupportModal('General Support','');
const f=$('v17-support-fab')||$('v16-support-fab');if(f)f.click();
};
function linkedParentEmail(u){
if(!u||u.type!=='teen'||isDemoUser(u))return'';
let l=u.parentLinked;
try{const m=JSON.parse(localStorage.getItem('tw_parent_links')||'{}');const k=String(u.email||'').trim().toLowerCase();if(m&&m[k]&&m[k].status)l=m[k];}catch(e){}
if(!l||l.status!=='approved')return'';
const list=(Array.isArray(l.parents)&&l.parents.length?l.parents:[l.parentEmail]).map(x=>String(x||'').trim().toLowerCase()).filter(x=> /@/.test(x));
return list[0]||'';
}
function wrapAlert(){
const orig=window.submitFeelsWrong;
if(typeof orig!=='function'||orig.__tw48)return;
const w=function(){
const u=window.currentUser,had=u?u.parentEmail:undefined;
const pe=(u&&u.parentEmail)||linkedParentEmail(u);
if(u&&pe)u.parentEmail=pe;
const toastWas=window.showToast;
if(!pe&&typeof toastWas==='function')window.showToast=function(m,t){
if(/^🚨 Alert sent/.test(String(m)))return toastWas.call(this,'🚨 Sent to the TeenWork team. Link a parent so they get these alerts too.',t);
return toastWas.apply(this,arguments);
};
try{return orig.apply(this,arguments);}
finally{
if(window.showToast!==toastWas)window.showToast=toastWas;
if(u){if(had===undefined)delete u.parentEmail;else u.parentEmail=had;}
}
};
w.__tw48=true;
window.submitFeelsWrong=w;
}
const DASH=['page-teen','page-parent','page-employer'];
function syncDemo(){
const u=me(),act=document.querySelector('.page.active');
const on= !!(isDemoUser(u)&&act&&DASH.indexOf(act.id)>=0);
document.body.classList.toggle('tw48-demo',on);
document.querySelectorAll('#tw48-demo-banner').forEach(b=>{if(!on|| !act.contains(b))b.remove();});
if(!on)return;
const dash=act.querySelector('.dashboard');if(!dash)return;
if(!dash.querySelector('#tw48-demo-banner')){
const b=document.createElement('div');
b.id='tw48-demo-banner';b.setAttribute('role','note');
b.innerHTML='<span>🧪 <strong>Demo: everything here is sample data.</strong> The jobs, people, messages and numbers are made up, and nothing you do is saved.</span>'+
'<button type="button" onclick="gotoPage(\'signup\')">Make a real account</button>';
const head=dash.querySelector('.dash-header');
if(head&&head.parentElement===dash)dash.insertBefore(b,head);else dash.insertBefore(b,dash.firstChild);
}
act.querySelectorAll('.badge').forEach(s=>{
const m= /^(\d+) Open$/.exec((s.textContent||'').trim());
if(m)s.textContent=m[1]+' sample job'+(m[1]==='1'?'':'s');
});
}
function wrapDemo(){
const orig=window._directDemo;
if(typeof orig!=='function'||orig.__tw48)return;
const w=function(type){
const r=orig.apply(this,arguments);
[80,450,1200].forEach(ms=>later(syncDemo,ms));
later(()=>{
if(window._twDemoSandbox&& !window._twDemoSandbox.active)return;
if(typeof window.showToast==='function')window.showToast('This demo starts empty, like a new account. Nothing you do in it is saved.','info');
},1600);
return r;
};
w.__tw48=true;
window._directDemo=w;
}
function wrapAdminDemoSwitch(){
const orig=window.adminSetDemo;
if(typeof orig!=='function'||orig.__tw48)return;
const w=function(val){
const r=orig.apply(this,arguments);
later(()=>{const d=$('tw48-demo');if(d)d.style.display=val?'':'none';},150);
return r;
};
w.__tw48=true;
window.adminSetDemo=w;
}
function boot(){
addAuthHelp();syncLanding();dropFakeSchema();renderCounts();wrapAlert();wrapDemo();wrapAdminDemoSwitch();
const lp=$('page-landing');
document.querySelectorAll('.page').forEach(pg=>new MutationObserver(()=>{
syncLanding();if(pg===lp&&lp.classList.contains('active'))loadCounts(false);
}).observe(pg,{attributes:true,attributeFilter:['class']}));
new MutationObserver(dropFakeSchema).observe(document.head,{childList:true});
window.addEventListener('tw-supabase-ready',()=>loadCounts(true));
[600,2500,6000].forEach(ms=>later(()=>loadCounts(false),ms));
[400,1500,4000].forEach(ms=>later(()=>{wrapAlert();wrapDemo();wrapAdminDemoSwitch();dropFakeSchema();},ms));
setInterval(()=>{try{syncLanding();}catch(e){}},1000);
if(/^#(safety|how-safety-works)$/i.test(location.hash||''))later(window.twOpenSafetyDetails,300);
}
window._twHomepageTrust48={loadCounts,renderCounts,syncDemo,syncLanding,linkedParentEmail,get counts(){return counts;},SHOW_COUNTS_FROM};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/remember-me-v63.js */
try{
(function(){
'use strict';
if(window.twRememberMe)return;
var KEY='tw_remember';
var SHORT=30*60*1000;
var LONG=30*24*3600*1000;
var BEAT=60*1000;
var TRY_FOR=10*60*1000;
var ROLES=['teen','parent','employer'];
function $(id){return document.getElementById(id);}
function low(s){return String(s==null?'':s).trim().toLowerCase();}
function me(){
var u=window.currentUser;
if(u)return u;
try{return typeof currentUser!=='undefined'?currentUser:null;}catch(e){return null;}
}
function toast(m,t){try{showToast(m,t||'info');}catch(e){}}
function kindOf(u){
if(!u)return null;
if(u.isAdmin&&u.type==='admin')return'admin';
if(ROLES.indexOf(u.type)<0|| !/@/.test(String(u.email||'')))return null;
var sandbox=false;
try{sandbox=typeof window._twIsDemoSandboxUser==='function'&&window._twIsDemoSandboxUser(u);}catch(e){}
if(sandbox||u.isDemo||u.twDemo|| /\.demo$/i.test(String(u.email||'')))return'demo';
return'real';
}
function keyOf(u){return low(u&&(u.dataKey||u.email));}
function idOf(u){var k=kindOf(u);return k?k+':'+(k==='real'?keyOf(u):'')+':'+u.type:'';}
function markId(m){return m?m.kind+':'+(m.kind==='real'?low(m.k):'')+':'+m.t:'';}
function read(){try{var m=JSON.parse(localStorage.getItem(KEY)||'null');return m&&m.v===1?m:null;}catch(e){return null;}}
function write(m){try{if(m)localStorage.setItem(KEY,JSON.stringify(m));else localStorage.removeItem(KEY);}catch(e){}}
function live(m,now){
now=now||Date.now();
if(!m||(m.kind!=='real'&&m.kind!=='admin'))return false;
if(m.kind==='real'?(!m.k||ROLES.indexOf(m.t)<0):m.t!=='admin')return false;
var at=Number(m.at),seen=Number(m.seen);
if(!(at>0)|| !(seen>=at)||seen>now+5*60*1000)return false;
return m.long?now-at<LONG:now-seen<SHORT;
}
function peek(){var m=read();return live(m)?m:null;}
function storedSession(){
try{
for(var i=0;i<localStorage.length;i++){
var k=localStorage.key(i);
if(/^sb-[a-z0-9]+-auth-token$/.test(k)){
var s=JSON.parse(localStorage.getItem(k)||'null');
if(s&&s.refresh_token)return s;
}
}
}catch(e){}
return null;
}
function deviceCopy(k){try{return(typeof window._twLocalAccounts==='function'&&window._twLocalAccounts()[k])||null;}catch(e){return null;}}
function take(){
var m=read();
if(!m)return null;
if(!live(m)){write(null);return null;}
if(m.kind==='real'){
var rec=deviceCopy(m.k);
if(!rec||rec.type!==m.t){write(null);return null;}
if(rec.cloud===true){
var s=storedSession();
if(!s||low(s.user&&s.user.email)!==low(rec.email)){write(null);return null;}
}
}
return{v:1,kind:m.kind,k:m.kind==='real'?low(m.k):'',t:m.t,at:Number(m.at),via:'remember'};
}
function sbc(){try{return(typeof sbClient!=='undefined'&&sbClient)?sbClient:null;}catch(e){return null;}}
function patchSignOut(){
var c=sbc(),a=c&&c.auth;
if(!a||typeof a.signOut!=='function'||a.signOut.__twLocal)return;
var orig=a.signOut;
var local=function(opts){return orig.call(a,Object.assign({scope:'local'},opts||{}));};
local.__twLocal=true;
try{a.signOut=local;}catch(e){}
}
async function client(ms){
try{if(typeof window._twCloudClient==='function'){var c=await window._twCloudClient(ms);if(c){patchSignOut();return c;}}}catch(e){}
return sbc();
}
function safe(f){try{return Promise.resolve(f()).catch(function(e){return{data:null,error:e||{message:'network error'}};});}catch(e){return Promise.resolve({data:null,error:e});}}
function offline(e){return!!e&&(e.name==='AuthRetryableFetchError'||e.status===0|| /fetch|network|timed? ?out|connect|load failed/i.test(String(e.message||e)));}
function refused(e){
if(!e||offline(e))return false;
var code=String(e.code||'');
return e.status===401||e.status===403||['session_not_found','bad_jwt','user_not_found','refresh_token_not_found','refresh_token_already_used'].indexOf(code)>=0||
/refresh token|session.*(not found|expired|missing)|invalid jwt/i.test(String(e.message||''));
}
async function verify(u){
var id=idOf(u),want=low(u.email),rec=deviceCopy(keyOf(u));
if(!rec||rec.cloud!==true)return;
var c=await client(10000);
if(!c|| !c.auth||idOf(me())!==id)return;
var r=await safe(function(){return c.auth.getSession();});
if(idOf(me())!==id)return;
var s=r&&r.data&&r.data.session;
if(!s){if(r&&r.error&& !refused(r.error))return;return end(u);}
if(low(s.user&&s.user.email)!==want)return end(u);
if(typeof c.auth.getUser!=='function')return;
var g=await safe(function(){return c.auth.getUser();});
if(idOf(me())!==id)return;
if(g&&g.error&&refused(g.error))return end(u);
}
function end(u){
if(idOf(me())!==idOf(u))return;
write(null);
try{window.doLogout();}catch(e){}
setTimeout(function(){
try{gotoPage('login');}catch(e){}
try{showAlert('li-alert','🔒 For your safety, please sign in again.','info');}catch(e){}
},60);
}
var tried=false;
async function forgetCloud(){
if(!storedSession())return;
var c=await client(10000);
if(!c|| !c.auth||typeof c.auth.signOut!=='function')return;
if(me()||tried||peek()||window.__twDemoSandbox|| !storedSession())return;
try{await c.auth.signOut({scope:'local'});}catch(e){}
}
var CSS=[
'.tw63-remember{margin:.2rem 0 .9rem;align-items:flex-start}',
'.tw63-remember input[type=checkbox]{width:20px;height:20px;margin-top:1px}',
'.tw63-remember label{cursor:pointer}',
'.tw63-remember strong{display:block;color:var(--text);font-size:.92rem;font-weight:700}',
'.tw63-remember .tw63-hint{display:block;font-size:.8rem;line-height:1.45}',
'html.twu-boot #page-login.active{visibility:hidden}'
].join('\n');
function addStyle(){
if($('tw63-remember-style')|| !document.head)return;
var st=document.createElement('style');st.id='tw63-remember-style';st.textContent=CSS;
document.head.appendChild(st);
}
addStyle();
function addBox(){
addStyle();
if($('li-remember'))return;
var pw=$('li-password'),card=pw&&pw.closest('.auth-card'),btn=card&&card.querySelector('.form-submit');
if(!btn)return;
var row=document.createElement('div');
row.className='terms-check tw63-remember';
row.innerHTML='<input type="checkbox" id="li-remember" aria-describedby="li-remember-hint">'+
'<label for="li-remember"><strong>Remember me for 30 days</strong>'+
'<span class="tw63-hint" id="li-remember-hint">Leave this off on a shared or school computer. Without it, you stay signed in for 30 minutes after you leave.</span></label>';
btn.parentNode.insertBefore(row,btn);
}
var lastTry=null;
function pressed(){var b=$('li-remember');lastTry={long: !!(b&&b.checked),at:Date.now()};tried=true;}
document.addEventListener('click',function(e){
var t=e.target;
if(!t|| !t.closest)return;
if(t.closest('#page-login .form-submit'))pressed();
else if(t.closest('#signup-btn')){tried=true;lastTry=null;}
},true);
document.addEventListener('keydown',function(e){
if(e.key==='Enter'&&e.target&&e.target.id==='li-password')pressed();
},true);
var cur='';
function shown(k){
if(k==='admin')return!!$('tw-admin-panel');
return!!document.querySelector('#page-teen.active,#page-parent.active,#page-employer.active,#page-verify.active');
}
function signedIn(u,k){
var now=Date.now(),m=read(),id=idOf(u);
var press=lastTry&&now-lastTry.at<TRY_FOR?lastTry:null;
lastTry=null;
if(!press&&m&&markId(m)===id&&live(m,now)){m.seen=now;write(m);return;}
write({v:1,kind:k,k:k==='real'?keyOf(u):'',t:u.type,long: !!(press&&press.long),at:now,seen:now});
}
function signedOut(id){
var m=read();
if(m&&markId(m)===id)write(null);
lastTry=null;
var b=$('li-remember');if(b)b.checked=false;
}
function tick(){
patchSignOut();
var u=me();
if(!u){if(cur){signedOut(cur);cur='';}return;}
var k=kindOf(u);
if(k!=='real'&&k!=='admin'){if(cur){signedOut(cur);cur='';}return;}
var id=idOf(u);
if(id===cur|| !shown(k))return;
cur=id;
signedIn(u,k);
}
function beat(){
if(!cur)return;
var m=read();
if(!m||markId(m)!==cur)return;
m.seen=Date.now();
write(m);
}
window.addEventListener('storage',function(e){
if(e.key!==KEY||e.newValue|| !cur)return;
var old=null;try{old=JSON.parse(e.oldValue||'null');}catch(x){}
if(!old||markId(old)!==cur)return;
try{window.doLogout();}catch(x){}
toast('You signed out of TeenWork in another tab.','info');
});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')beat();});
window.addEventListener('pagehide',beat);
window.addEventListener('tw-supabase-ready',patchSignOut);
function restored(u){
var id=idOf(u),m=read();
if(!id)return;
if(m&&markId(m)===id){m.seen=Date.now();write(m);}
cur=id;
if(kindOf(u)==='real')verify(u).catch(function(){});
}
function failed(){write(null);}
function boot(){
addBox();
tick();
setInterval(tick,1000);
setInterval(beat,BEAT);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
window.twRememberMe={peek:peek,take:take,restored:restored,failed:failed,forgetCloud:forgetCloud,mark:read,SHORT:SHORT,LONG:LONG};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/url-views-v50.js */
try{
(function(){
'use strict';
if(window.__twUrlViews50)return;
window.__twUrlViews50=true;
const MARK='tw_url_session';
const NEXT='tw_url_next';
const MAX_AGE=12*3600*1000;
const ROLES=['teen','parent','employer'];
const PUBLIC=['login','signup','pricing','school','safety-lab'];
const AUTH=['login','signup'];
const SLUGS={
teen:{
'ttab-browse':'jobs','ttab-map':'job-map','ttab-applications':'applied','ttab-tracker':'tracker',
'ttab-worklog':'work-log','ttab-calendar':'schedule','ttab-earnings':'earnings','ttab-savings':'savings',
'ttab-resume':'profile','ttab-portfolio':'portfolio','ttab-references':'references','ttab-letters':'letters',
'ttab-badges':'badges','ttab-leaderboard':'leaderboard','ttab-ai':'ai-coach','ttab-lessons':'lessons',
'ttab-firstjob':'first-job','ttab-qa':'questions','ttab-stories':'stories'
},
parent:{
'ptab-overview':'home','ptab-approvals':'approvals','ptab-controls':'controls','ptab-notifications':'alerts',
'ptab-trusted':'trusted-employers','ptab-teens':'my-teens','ptab-ratings':'ratings','ptab-weekly':'weekly-summary',
'ptab-savings':'savings'
},
employer:{
'etab-post':'post-job','etab-applicants':'applicants','etab-active':'active-jobs','etab-schedule':'schedule',
'etab-bulkmsg':'bulk-message','etab-ai':'ai-tools','etab-analytics':'analytics','etab-reviews':'reviews',
'etab-letters':'letters','etab-bgcheck':'verification','etab-profile':'company-profile'
}
};
const FIRST={teen:'ttab-browse',parent:'ptab-overview',employer:'etab-post'};
const APPLY_RE= /(?:^|[^A-Za-z0-9_$])teenApply\(\s*'?([0-9A-Za-z_-]+)/;
const $=id=>document.getElementById(id);
const lexUser=()=>{try{return typeof currentUser!=='undefined'?currentUser:null;}catch(e){return null;}};
const me=()=>window.currentUser||lexUser();
function setUser(u){try{currentUser=u;}catch(e){}window.currentUser=u;}
const later=(fn,ms)=>setTimeout(()=>{try{fn();}catch(e){console.warn('url-views-v50:',e);}},ms||0);
const toast=(m,t)=>{try{showToast(m,t||'info');}catch(e){}};
const isOn=el=> !!el&&el.classList.contains('active');
const low=s=>String(s==null?'':s).trim().toLowerCase();
const slugText=s=>low(s).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
const ssGet=k=>{try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch(e){return null;}};
const ssSet=(k,v)=>{try{if(v==null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,JSON.stringify(v));}catch(e){}};
function kindOf(u){
if(!u)return null;
if(u.isAdmin&&u.type==='admin')return'admin';
if(ROLES.indexOf(u.type)<0|| !/@/.test(String(u.email||'')))return null;
let sandbox=false;
try{sandbox=typeof window._twIsDemoSandboxUser==='function'&&window._twIsDemoSandboxUser(u);}catch(e){}
if(sandbox||u.isDemo|| /\.demo$/i.test(String(u.email||'')))return'demo';
return'real';
}
const keyOf=u=>low(u&&(u.dataKey||u.email));
function clean(v,max){v=String(v==null?'':v).trim();return/^[A-Za-z0-9_-]+$/.test(v)?v.slice(0,max||48):'';}
function parse(){
let q;
try{q=new URLSearchParams(location.search);}catch(e){return{view:'',tab:'',job:''};}
return{view:low(clean(q.get('view'))),tab:low(clean(q.get('tab'))),job:clean(q.get('job'),40)};
}
const same=(a,b)=>(a.view||'')===(b.view||'')&&(a.tab||'')===(b.tab||'')&&(a.job||'')===(b.job||'');
function urlFor(s){
let rest='';
try{const q=new URLSearchParams(location.search);['view','tab','job'].forEach(k=>q.delete(k));rest=q.toString();}catch(e){}
const own=[];
if(s.view)own.push('view='+encodeURIComponent(s.view));
if(s.view&&s.tab)own.push('tab='+encodeURIComponent(s.tab));
if(s.view&&s.job)own.push('job='+encodeURIComponent(s.job));
const qs=own.concat(rest?[rest]:[]).join('&');
return location.pathname+(qs?'?'+qs:'')+(s.view?'':location.hash);
}
function write(s,mode){
if(same(s,parse()))return false;
try{history[mode==='push'?'pushState':'replaceState']({twView:s.view||''},'',urlFor(s));return true;}
catch(e){return false;}
}
function slugFor(role,id){return id==='verify'?'verification':(SLUGS[role]&&SLUGS[role][id])||id;}
function idFor(role,slug){
if(!slug)return null;
const map=SLUGS[role]||{};
const hit=Object.keys(map).filter(id=>map[id]===slug)[0];
if(!hit&&slug==='verification')return role==='teen'&&$('page-verify')?'verify':null;
const id=hit||(/^[pte]tab-[a-z0-9-]+$/.test(slug)?slug:null);
const pg=$('page-'+role),el=id&&$(id);
return el&&pg&&pg.contains(el)&&el.classList.contains('tab-panel')?id:null;
}
function isDashSlug(slug){
if(!slug)return false;
if(slug==='verification'|| /^[pte]tab-[a-z0-9-]+$/.test(slug))return true;
return ROLES.some(r=>Object.keys(SLUGS[r]).some(id=>SLUGS[r][id]===slug));
}
function activePanel(role){
const pg=$('page-'+role);if(!pg)return null;
const p=pg.querySelector('.tab-panel.active');
return p&&p.id?p.id:null;
}
function adminTabSlug(panel){
const b=panel.querySelector('.adm-tab.active');
return b?slugText(b.textContent):'';
}
let picked=null;
function current(){
const u=me(),panel=$('tw-admin-panel');
if(panel&&u&&u.isAdmin)return{view:'admin',tab:adminTabSlug(panel)};
const lock=$('parent-lock-overlay');
if(lock&&u&&u.type==='teen'&&getComputedStyle(lock).display!=='none')return{view:slugFor('teen',FIRST.teen)};
const act=document.querySelector('.page.active');
if(!act)return null;
const id=act.id.replace(/^page-/,'');
if(id==='landing')return{view:''};
if(PUBLIC.indexOf(id)>=0)return{view:id};
if(id==='admin')return u&&u.isAdmin?{view:'admin'}:null;
if(id==='verify')return u&&u.type==='teen'?{view:'verification'}:null;
if(ROLES.indexOf(id)>=0){
if(!u||u.type!==id)return null;
const pid=activePanel(id);if(!pid)return null;
const s={view:slugFor(id,pid)};
if(pid==='ttab-browse'&&picked)s.job=picked;
return s;
}
return null;
}
let seenUser='';
function keepMark(){
const u=me(),k=kindOf(u);
if(k){
const m={v:1,kind:k,t:u.type,k:k==='real'?keyOf(u):'',at:Date.now()};
seenUser=k+':'+m.k+':'+m.t;
ssSet(MARK,m);
}else if(seenUser){
seenUser='';
ssSet(MARK,null);
ssSet(NEXT,null);
}
}
function readMark(){
const m=ssGet(MARK);
if(!m||m.v!==1|| !(Date.now()-Number(m.at)<MAX_AGE)){if(m)ssSet(MARK,null);return null;}
return m;
}
const remember=()=>window.twRememberMe||null;
function comeBack(){
const r=remember();
if(!r||kindOf(me()))return false;
const m=r.take();
if(!m)return false;
const ok=restoreSession(m);
if(ok)r.restored(me());else r.failed(m);
return ok;
}
function hideAutoTour(){
try{const u=me();if(u&&u.email)localStorage.setItem('tw_tour34_'+u.email,'1');}catch(e){}
later(()=>{if($('tw34-tour')&&typeof window.tourSkip==='function')window.tourSkip();},700);
}
function restoreSession(m){
if(!m)return false;
try{
if(m.kind==='demo'){
if(ROLES.indexOf(m.t)<0||typeof window.twStartDemo!=='function')return false;
window.twStartDemo(m.t);
hideAutoTour();
return kindOf(me())==='demo';
}
if(m.kind==='admin'){
if(typeof window.launchAdminPanel!=='function'||typeof ADMIN_EMAIL==='undefined')return false;
if(typeof window._twStoredAdminSession!=='function'|| !window._twStoredAdminSession())return false;
setUser({name:'Admin',email:String(ADMIN_EMAIL).toLowerCase(),type:'admin',emailVerified:true,isAdmin:true});
try{window._loadUserDarkPref&&window._loadUserDarkPref();}catch(e){}
window.launchAdminPanel();
if(typeof window._twAdminToken==='function')window._twAdminToken(15000).then(t=>{
const u=me();
if(t===null&&u&&u.isAdmin&&typeof window.doLogout==='function')window.doLogout();
});
return!!$('tw-admin-panel');
}
if(m.kind==='real'){
if(typeof window._twLocalAccounts!=='function'||typeof window._twLoginLocalAccount!=='function')return false;
const all=window._twLocalAccounts()||{},rec=all[m.k];
if(!rec||rec.type!==m.t)return false;
try{if(window._twClosed&&window._twClosed.has(m.k))return false;}catch(e){}
const acct=Object.assign({},rec,{_key:m.k,slot:rec.slot||(m.k.indexOf('#')>=0?(parseInt(m.k.split('#')[1],10)||1):1)});
const ok=window._twLoginLocalAccount(acct);
try{
const log=JSON.parse(localStorage.getItem('tw_signin_log')||'[]');
if(ok&&log[0]&&log[0].event==='login'&&low(log[0].email)===low(rec.email)){log[0].event=m.via==='remember'?'remembered':'page-refresh';localStorage.setItem('tw_signin_log',JSON.stringify(log));}
}catch(e){}
return!!ok&&kindOf(me())==='real';
}
}catch(e){console.warn('url-views-v50: restore',e);}
return false;
}
let applying=true;
let applyFrom=0,pinSeq=0,lastGesture=0;
const tookOver=since=>lastGesture>since;
function menuButton(id){return document.querySelector('#twm-side [data-twm="'+id+'"]');}
function openSection(role,id){
if(id==='verify'){if(!isOn($('page-verify'))&&typeof window.showVerifyPage==='function')window.showVerifyPage();return;}
const pg=$('page-'+role),panel=$(id);
if(!pg|| !panel)return;
if(!isOn(pg)){
if(typeof window.gotoPage==='function')window.gotoPage(role);
else{document.querySelectorAll('.page.active').forEach(p=>p.classList.remove('active'));pg.classList.add('active');}
}
try{if(window.twCleanMenu&&typeof window.twCleanMenu.sync==='function')window.twCleanMenu.sync();}catch(e){}
const b=menuButton(id);
if(b&& !b.hidden){b.click();return;}
try{if(typeof window.switchDashTab==='function')window.switchDashTab(null,id);}catch(e){}
pg.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p===panel));
}
function shownId(role){return isOn($('page-verify'))?'verify':isOn($('page-'+role))?activePanel(role):null;}
function blocked(){
const lock=$('parent-lock-overlay');
return(lock&&getComputedStyle(lock).display!=='none')|| !!$('tw34-tour');
}
function pin(role,id,job){
const token= ++pinSeq,since=Date.now();
picked=id==='ttab-browse'&&job?job:null;
const hold=()=>{
if(token!==pinSeq)return;
if(tookOver(since)){soon();return;}
const u=me();
if(!u||u.type!==role||blocked())return;
if(shownId(role)!==id)openSection(role,id);
paintPicks();
};
hold();
[120,350,800,1500,2600].forEach(ms=>later(hold,ms));
later(()=>{if(token===pinSeq){applying=false;record();}},2700);
if(picked)seekJob(picked,token);
}
function openAdminTab(slug){
const panel=$('tw-admin-panel');if(!panel|| !slug)return false;
const b=[...panel.querySelectorAll('.adm-tab')].filter(x=>slugText(x.textContent)===slug)[0];
if(b){if(!b.classList.contains('active'))b.click();return true;}
return false;
}
function closeAdmin(){
const panel=$('tw-admin-panel');
if(panel)panel.remove();
}
function done(ms){const token=pinSeq;later(()=>{if(token===pinSeq){applying=false;record();}},ms==null?60:ms);}
function toLogin(t,why){
ssSet(NEXT,{view:t.view,tab:t.tab||'',job:t.job||''});
closeAdmin();
if(typeof window.gotoPage==='function')window.gotoPage('login');
if(why)toast(why,'info');
write({view:'login'},'replace');
}
function go(t,how){
applying=true;applyFrom=Date.now();++pinSeq;
t={view:t.view||'',tab:t.tab||'',job:t.job||''};
try{if(window.twCleanMenu&&window.twCleanMenu.close)window.twCleanMenu.close(true);}catch(e){}
if(!t.view){
closeAdmin();
if(!isOn($('page-landing'))&&typeof window.gotoPage==='function')window.gotoPage('landing');
return done();
}
if(PUBLIC.indexOf(t.view)>=0){
closeAdmin();
const pg=$('page-'+t.view);
if(pg&& !isOn(pg)&&typeof window.gotoPage==='function')window.gotoPage(t.view);
if(t.view==='safety-lab')later(()=>{if(typeof window.renderSafetyLab==='function')window.renderSafetyLab();},150);
write({view:t.view},'replace');
return done();
}
const wantsAdmin=t.view==='admin';
if(!wantsAdmin&& !isDashSlug(t.view)){
if(!kindOf(me())){write({view:''},'replace');return done();}
t={view:'__first',tab:'',job:''};
}
let u=me();
if(!kindOf(u)){
if(restoreSession(readMark()))u=me();
else{ssSet(MARK,null);if(comeBack())u=me();}
}
if(!kindOf(u)){toLogin(t,how==='load'||how==='pop'?'🔒 Please sign in to open that page.':'');return done();}
if(u.isAdmin){
if(!$('tw-admin-panel')&&typeof window.launchAdminPanel==='function')window.launchAdminPanel();
if(!(wantsAdmin&&t.tab&&openAdminTab(t.tab)))later(()=>{if(wantsAdmin&&t.tab)openAdminTab(t.tab);},150);
return done(300);
}
const role=u.type;
closeAdmin();
const id=(t.view!=='__first'&& !wantsAdmin&&idFor(role,t.view))||FIRST[role];
pin(role,id,id==='ttab-browse'?t.job:'');
}
function cardJobId(card){
if(card.dataset.twuJob)return card.dataset.twuJob;
let id='';
const b=card.querySelector('[onclick*="teenApply("]'),m=b?APPLY_RE.exec(b.getAttribute('onclick')||''):null;
if(m)id=m[1];
else{
const title=((card.querySelector('.browse-title')||{}).textContent||'').trim();
let list=[];
try{list=typeof browsableJobs!=='undefined'?browsableJobs:[];}catch(e){}
const hits=title?list.filter(j=>j&&String(j.title||'').trim()===title):[];
if(hits.length===1&&hits[0].id!=null)id=clean(hits[0].id,40);
}
if(id)card.dataset.twuJob=id;
return id;
}
function cards(){const list=$('browse-jobs-list');return list?[...list.querySelectorAll('.browse-card')]:[];}
function paintPicks(){
let hit=null;
cards().forEach(c=>{
const on= !!picked&&cardJobId(c)===picked;
if(on!==c.classList.contains('twu-picked'))c.classList.toggle('twu-picked',on);
if(on){hit=c;if(c.getAttribute('aria-current')!=='true')c.setAttribute('aria-current','true');}
else if(c.hasAttribute('aria-current'))c.removeAttribute('aria-current');
});
return hit;
}
function seekJob(job,token){
const since=Date.now();
const look=()=>{
if(token!==pinSeq||picked!==job)return;
const u=me();
if(!u||u.type!=='teen'|| !isOn($('ttab-browse'))){if(Date.now()-since<3000)later(look,300);return;}
const card=paintPicks();
if(card){if(!tookOver(since)){try{card.scrollIntoView({block:'center'});}catch(e){}}return;}
if(Date.now()-since<10000){later(look,300);return;}
picked=null;
toast('That job isn\'t on the list anymore.','info');
write(current()||{view:'jobs'},'replace');
};
later(look,200);
}
document.addEventListener('click',e=>{
const t=e.target,card=t&&t.closest?t.closest('#browse-jobs-list .browse-card'):null;
if(!card||t.closest('button,a,input,select,textarea,label,summary,[role="button"],.twr-panel'))return;
try{if(String(window.getSelection?window.getSelection():'').trim())return;}catch(e2){}
const u=me();if(!u||u.type!=='teen')return;
const id=cardJobId(card);if(!id||id===picked)return;
picked=id;
++pinSeq;applying=false;
paintPicks();
record();
});
let listObs=null,listT=0;
function watchList(){
const list=$('browse-jobs-list');if(!list||listObs)return;
listObs=new MutationObserver(()=>{if(listT|| !picked)return;listT=setTimeout(()=>{listT=0;paintPicks();},60);});
listObs.observe(list,{childList:true,subtree:true});
}
function record(){
if(applying){
if(!(applyFrom&&tookOver(applyFrom)))return;
applying=false;++pinSeq;
}
keepMark();
const s=current();
if(!s)return;
if(s.view!=='jobs')picked=null;
if(s.view==='')ssSet(NEXT,null);
const next=ssGet(NEXT),k=kindOf(me());
if(next&&k&&s.view&&PUBLIC.indexOf(s.view)<0){
ssSet(NEXT,null);
if(!same(next,s)){go(next,'next');return;}
}
const was=parse();
if(same(s,was))return;
let mode=Date.now()-lastGesture<1500?'push':'replace';
if(AUTH.indexOf(was.view)>=0&&s.view&&PUBLIC.indexOf(s.view)<0)mode='replace';
write(s,mode);
}
let queued=0;
function soon(){if(queued)return;queued=setTimeout(()=>{queued=0;try{record();}catch(e){console.warn('url-views-v50:',e);}},60);}
function relevant(muts){
for(let i=0;i<muts.length;i++){
const m=muts[i],t=m.target;
if(m.type==='childList'){if(t===document.body)return true;continue;}
const cl=t&&t.classList;
if(cl&&(cl.contains('page')||cl.contains('tab-panel')||cl.contains('adm-tab-panel')||cl.contains('adm-tab')))return true;
}
return false;
}
const mark=()=>{lastGesture=Date.now();};
['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,mark,{capture:true,passive:true}));
window.addEventListener('popstate',()=>{try{go(parse(),'pop');}catch(e){console.warn('url-views-v50: back',e);applying=false;}});
const CSS=[
'#browse-jobs-list .browse-card{cursor:pointer}',
'#browse-jobs-list .browse-card.twu-picked{border-color:var(--green,#2d6a4f);box-shadow:0 0 0 3px var(--green-pale,#d8f3dc),0 6px 20px rgba(0,0,0,.08)}',
'html.twu-boot #page-landing.active{visibility:hidden}'
].join('\n');
function addStyle(){
if($('url-views-v50-style'))return;
const st=document.createElement('style');st.id='url-views-v50-style';st.textContent=CSS;
document.head.appendChild(st);
}
addStyle();
const first=parse();
const dashAddress=t=> !!t.view&&(t.view==='admin'||isDashSlug(t.view));
const homeOrAuth=t=> !t.view||AUTH.indexOf(t.view)>=0;
if((dashAddress(first)&&readMark())||((dashAddress(first)||homeOrAuth(first))&&remember()&&remember().peek())){
document.documentElement.classList.add('twu-boot');
setTimeout(()=>document.documentElement.classList.remove('twu-boot'),2500);
}
function boot(){
if(window.__twUrlViewsBooted)return;
window.__twUrlViewsBooted=true;
new MutationObserver(muts=>{if(relevant(muts))soon();})
.observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true,childList:true});
watchList();
setInterval(()=>{watchList();if(!applying)record();},2000);
const t=parse();
if(!dashAddress(t))ssSet(MARK,null);
let back=false;
const tabMark=dashAddress(t)&& !!readMark();
try{
if(!tabMark)back=comeBack();
if(!tabMark&& !kindOf(me())&&remember())remember().forgetCloud();
}catch(e){console.warn('url-views-v50: remember',e);}
try{
if(back&&homeOrAuth(t)){applying=false;record();}
else if(t.view)go(t,'load');
else{applying=false;record();}
}catch(e){console.warn('url-views-v50: start',e);applying=false;}
later(()=>document.documentElement.classList.remove('twu-boot'),0);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>later(boot,30));
else later(boot,30);
window.twUrlViews={state:()=>current(),parse,go:t=>go(t||parse(),'api'),picked:()=>picked};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/real-stats-v42.js */
try{
(function(){
'use strict';
const ROLES=['teen','parent','employer'];
const me=()=>window.currentUser||(typeof currentUser!=='undefined'?currentUser:null);
const isDemoUser=u=> !!(u&&(u.isDemo|| /\.demo$/i.test(String(u.email||''))));
const isReal=u=> !!(u&& !isDemoUser(u)&& !u.isAdmin&&ROLES.includes(u.type)&& /@/.test(String(u.email||'')));
const acctKey=u=>String(u.dataKey||u.email||'').toLowerCase();
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}};
const readJSON=(k,d)=>{try{const v=JSON.parse(lsGet(k));return v==null?d:v;}catch(e){return d;}};
function realText(el,real,text){if(!el)return;if(el.dataset.twOrigText==null)el.dataset.twOrigText=el.textContent;el.textContent=real?text:el.dataset.twOrigText;}
function realHide(el,hide){if(!el)return;if(hide){el.dataset.twHidden='1';el.style.display='none';}else if(el.dataset.twHidden){delete el.dataset.twHidden;el.style.display='';}}
const SCOPED=['tw_worklog','tw_cal_shifts','tw_savings_goals','tw_savings_history','tw_tracker','tw_portfolio','tw_earnings_log','tw_streak','tw_lessons_completed'];
const OWNER='tw_device_data_owner',CLAIMED='tw_device_data_legacy_claimed';
const slot=(owner,k)=>'tw_scoped_'+owner.replace(/[^a-z0-9@._:-]/gi,'_')+'__'+k;
const DEMO_WL=new Set([1001,1002,1003,1004,1005,1006,1007,1008,1009,1010]);
const DEMO_GOALS=new Set([2001,2002,2003]);
const isDemoShift=s=> !!s&&(s.id==='demo-1'||(s.job==="Lawn Mowing — Mike's Landscaping"&&s.notes==='Bring gloves. Side gate will be open.'));
const DEMO_FILTER={
tw_worklog:e=> !(e&&DEMO_WL.has(e.id)),
tw_cal_shifts:s=> !isDemoShift(s),
tw_savings_goals:g=> !(g&&DEMO_GOALS.has(g.id)),
};
function withoutSamples(k,raw){
if(raw==null|| !DEMO_FILTER[k])return raw;
try{const v=JSON.parse(raw);return Array.isArray(v)?JSON.stringify(v.filter(DEMO_FILTER[k])):raw;}catch(e){return raw;}
}
function ownerFor(u){if(!u)return'';if(isDemoUser(u))return'demo';if(isReal(u))return'acct:'+acctKey(u);return'';}
function demoShift(){
const now=new Date(),next=new Date(now);
next.setDate(now.getDate()+((6-now.getDay()+7)%7||7));
return{id:'demo-1',job:"Lawn Mowing — Mike's Landscaping",date:next.toISOString().slice(0,10),start:'09:00',end:'11:30',pay:'$18/hr',notes:'Bring gloves. Side gate will be open.'};
}
function reloadCaches(owner){
try{
let raw=lsGet('tw_cal_shifts');
if(raw==null){raw=JSON.stringify(owner==='demo'?[demoShift()]:[]);lsSet('tw_cal_shifts',raw);}
calShifts=JSON.parse(raw);
}catch(e){}
try{earningsLog=JSON.parse(lsGet('tw_earnings_log')||'[]');}catch(e){}
try{savingsGoals=JSON.parse(lsGet('tw_savings_goals')||'[]');}catch(e){}
}
function useDeviceDataOf(u){
const next=ownerFor(u);if(!next)return;
const cur=lsGet(OWNER)||'legacy';
if(cur!==next){
SCOPED.forEach(k=>lsSet(slot(cur,k),lsGet(k)));
lsSet(slot(cur,'_seen'),'1');
const claimLegacy=next.indexOf('acct:')===0&& !lsGet(slot(next,'_seen'))&&lsGet(slot('legacy','_seen'))&& !lsGet(CLAIMED);
SCOPED.forEach(k=>lsSet(k,claimLegacy?withoutSamples(k,lsGet(slot('legacy',k))):lsGet(slot(next,k))));
if(claimLegacy)lsSet(CLAIMED,next);
lsSet(slot(next,'_seen'),'1');
lsSet(OWNER,next);
}
if(isReal(u))SCOPED.forEach(k=>{const raw=lsGet(k),clean=withoutSamples(k,raw);if(clean!==raw)lsSet(k,clean);});
reloadCaches(next);
}
const SAMPLE_RATINGS=(typeof demoRatings!=='undefined')?demoRatings.map(r=>({...r})):[];
const SAMPLE_LETTERS=(typeof _teenLetters!=='undefined')?_teenLetters.filter(l=> /^lor-demo/.test(l.id)):[];
function reviewsFor(u){
if(!u||u.type!=='teen')return[];
let list=[];
try{list=(window._getReviewsForTeen?window._getReviewsForTeen(u.name):[])||[];}catch(e){}
return list.filter(r=>r&&r.stars).map(r=>({from:r.employer||'An employer',job:r.jobTitle||'Job',stars:Number(r.stars)||0,comment:r.text||''}));
}
function applySampleGate(u){
const real=isReal(u);
try{
if(typeof demoRatings!=='undefined'){
if(real){demoRatings.length=0;reviewsFor(u).forEach(r=>demoRatings.push(r));}
else if(u&& !demoRatings.length)SAMPLE_RATINGS.forEach(r=>demoRatings.push({...r}));
}
}catch(e){}
try{
if(typeof _teenLetters!=='undefined'&&real){for(let i=_teenLetters.length-1;i>=0;i--)if(/^lor-demo/.test(_teenLetters[i].id))_teenLetters.splice(i,1);}
}catch(e){}
}
let lettersSaved=null;
function useLettersOf(u){
if(typeof _teenLetters==='undefined'|| !u)return;
const list=isReal(u)?(u.type==='teen'?(()=>{try{const v=_DB.load('rec_letters',[]);return Array.isArray(v)?v.filter(l=>l&&l.id&& !/^lor-demo/.test(l.id)):[];}catch(e){return[];}})():[])
:SAMPLE_LETTERS.map(l=>({...l}));
_teenLetters.length=0;list.forEach(l=>_teenLetters.push(l));
lettersSaved=isReal(u)&&u.type==='teen'?JSON.stringify(list):null;
}
function saveLetters(u){
if(lettersSaved==null|| !isReal(u)||u.type!=='teen')return;
const json=JSON.stringify(_teenLetters.filter(l=>l&& !/^lor-demo/.test(l.id)));
if(json===lettersSaved)return;
lettersSaved=json;
try{_DB.save('rec_letters',JSON.parse(json));}catch(e){}
}
function knownLessonIds(){
const ids=new Set();
try{(window.lessonsData||[]).forEach(l=>l&&l.id&&ids.add(l.id));}catch(e){}
return ids;
}
function savedLessons(u){
const set=new Set();
const add=a=>{if(Array.isArray(a))a.forEach(id=>{if(typeof id==='string'&&id)set.add(id);});};
try{add(_DB.load('lessons_completed',[]));}catch(e){}
[u.id,u.dataKey,u.email,String(u.email||'').toLowerCase()].filter(Boolean).forEach(id=>{const p=readJSON('tw_'+id+'_ai_profile',null);if(p)add(p.lessonsCompleted);});
return[...set];
}
function lessonCount(list){
const known=knownLessonIds();
return new Set((list||[]).filter(id=> !known.size||known.has(id))).size;
}
function storeLessons(list){
try{_DB.save('lessons_completed',list);}catch(e){}
lsSet('tw_lessons_completed',String(lessonCount(list)));
}
function restoreLessons(u,afterSync){
if(!isReal(u)||u.type!=='teen'||typeof userActivity==='undefined')return;
const list=afterSync?[...new Set(savedLessons(u).concat(userActivity.lessonsCompleted||[]))]:savedLessons(u);
userActivity.lessonsCompleted=list;
lsSet('tw_lessons_completed',String(lessonCount(list)));
if(afterSync&&list.length)storeLessons(list);
}
const _oTrack=window.trackActivity;
if(typeof _oTrack==='function'){
window.trackActivity=function(type){
const r=_oTrack.apply(this,arguments);
try{
const u=me();
if(type==='lesson_complete'&&isReal(u)&&u.type==='teen'&&typeof userActivity!=='undefined')
setTimeout(()=>{const list=[...new Set(savedLessons(u).concat(userActivity.lessonsCompleted||[]))];userActivity.lessonsCompleted=list;storeLessons(list);},0);
}catch(e){}
return r;
};
}
const _oSync=window._syncUserData;
let syncCalled=false;
if(typeof _oSync==='function'){
window._syncUserData=async function(){
syncCalled=true;
const r=await _oSync.apply(this,arguments);
try{
const u=me();
if(isReal(u)&&u.type==='teen'){
const before=(userActivity.lessonsCompleted||[]).length;
restoreLessons(u,true);
const untouched=lettersSaved!=null&&JSON.stringify(_teenLetters)===lettersSaved;
if(untouched)useLettersOf(u);
if((userActivity.lessonsCompleted||[]).length!==before||untouched)redrawTeen();
}
}catch(e){}
return r;
};
}
function joinedAt(u){
const ok=t=>{const n=typeof t==='number'?t:Date.parse(t);return n&&n>Date.UTC(2020,0,1)&&n<=Date.now()+864e5?n:0;};
let t=ok(u.created)||ok(u.createdAt)||ok(u.signupDate);
if(!t){try{const all=_twLocalAccounts()||{};const a=all[acctKey(u)]||all[String(u.email||'').toLowerCase()];t=ok(a&&a.created);}catch(e){}}
if(!t){const k='tw_'+acctKey(u).replace(/[^a-z0-9]/gi,'_')+'_first_seen';t=ok(Number(lsGet(k)));if(!t){t=Date.now();lsSet(k,String(t));}}
return t;
}
function timeOnApp(t){
const days=Math.floor((Date.now()-t)/864e5);
if(days<1)return'Today';
if(days<31)return days+' day'+(days===1?'':'s');
const months=Math.floor(days/30.44);
if(months<12)return months+' month'+(months===1?'':'s');
const y=Math.floor(months/12),m=months%12;
return y+' yr'+(y>1?'s':'')+(m?' '+m+' mo':'');
}
const TASKS={'yard work':'Yard Work','pet care':'Pet Care',cleaning:'Cleaning',babysitting:'Babysitting','tech help':'Tech Help',other:'Other'};
function weekKey(d){const x=new Date(d+(/^\d{4}-\d{2}-\d{2}$/.test(d)?'T12:00:00':''));if(isNaN(x))return'';const m=new Date(x);m.setDate(x.getDate()-((x.getDay()+6)%7));return m.toISOString().slice(0,10);}
function realStats(u){
const log=readJSON('tw_worklog',[]).filter(e=>e&&DEMO_FILTER.tw_worklog(e)&&parseFloat(e.hours)>0);
const ratings=(typeof demoRatings!=='undefined'&&isReal(u))?demoRatings.slice():reviewsFor(u);
const totalHours=log.reduce((s,e)=>s+(parseFloat(e.hours)||0),0);
const weeks=new Set(log.map(e=>weekKey(String(e.date||''))).filter(Boolean)).size;
const avg=ratings.length?(ratings.reduce((s,r)=>s+r.stars,0)/ratings.length).toFixed(1):null;
const reviews=ratings.filter(r=>r.comment&&r.comment.trim().length>5);
const types=[...new Set(log.map(e=>TASKS[e.task]||(e.task?String(e.task):'')).concat(ratings.map(r=>r.job)).filter(Boolean))];
let badges='';
try{badges=(teenGameState.badges||[]).map(b=>{const d=(typeof BADGES!=='undefined'?BADGES:[]).find(x=>x.id===(b.id||b));return d?d.label:(b.label||b.id||b);}).join(', ');}catch(e){}
return{
totalRatings:ratings.length,avgRating:avg,fiveStars:ratings.filter(r=>r.stars===5).length,reviews,
weeksWorked:weeks,totalHours:parseFloat(totalHours.toFixed(1)),jobTypes:types,
lessonsCompleted:lessonCount(typeof userActivity!=='undefined'?userActivity.lessonsCompleted:[]),badges,
bestReview:reviews.slice().sort((a,b)=>b.stars-a.stars)[0],jobsCompleted:log.length,
joined:joinedAt(u),isEmpty: !log.length&& !ratings.length,
};
}
const _oCompile=window._compileteenStatsForLOR;
window._compileteenStatsForLOR=function(){
const u=me();
if(!isReal(u))return _oCompile?_oCompile.apply(this,arguments):{};
return realStats(u);
};
const _oBanner=window.renderTeenLORStatsBanner;
window.renderTeenLORStatsBanner=function(){
const u=me();
if(!isReal(u))return _oBanner?_oBanner.apply(this,arguments):undefined;
const grid=document.getElementById('teen-lor-stats-grid');
const typesEl=document.getElementById('teen-lor-job-types');
const timeEl=document.getElementById('teen-lor-time-on-app');
if(!grid)return;
const s=realStats(u),onApp=timeOnApp(s.joined);
const fmtH=h=>(Math.round(h*10)/10)+(h===1?' hr':' hrs');
const items=[
{label:'Hours Worked',val:fmtH(s.totalHours),col:'#92400e',bg:'#fff7ed',border:'#fcd34d'},
{label:'Weeks Active',val:s.weeksWorked,col:'#1e40af',bg:'#eff6ff',border:'#93c5fd'},
{label:'Jobs Completed',val:s.jobsCompleted,col:'#166534',bg:'#f0fdf4',border:'#86efac'},
{label:'Avg Rating',val:s.avgRating?s.avgRating+' ★':'—',col:'#7c3aed',bg:'#fdf4ff',border:'#d8b4fe'},
{label:'5-Star Reviews',val:s.fiveStars,col:'#b45309',bg:'#fefce8',border:'#fde047'},
{label:'Time on App',val:onApp,col:'#0f766e',bg:'#f0fdfa',border:'#6ee7b7'},
{label:'Lessons Done',val:s.lessonsCompleted,col:'#1a5276',bg:'#dbeafe',border:'#93c5fd'},
];
grid.innerHTML=items.map(i=>`
    <div style="background:${i.bg};border:1.5px solid ${i.border};border-radius:12px;padding:.75rem 1rem;text-align:center">
      <div style="font-family:'Fraunces',serif;font-size:1.6rem;font-weight:900;color:${i.col};line-height:1">${esc(i.val)}</div>
      <div style="font-size:.68rem;font-weight:700;color:${i.col};opacity:.75;text-transform:uppercase;letter-spacing:.4px;margin-top:3px">${i.label}</div>
    </div>`).join('');
if(typesEl){
typesEl.innerHTML=s.jobTypes.length
?`<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
             <span style="font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-right:2px">Job Types:</span>
             ${s.jobTypes.map(j=>`<span style="background:var(--green-pale);color:var(--green);border-radius:20px;padding:2px 10px;font-size:.75rem;font-weight:700">${esc(j)}</span>`).join('')}
           </div>`
:`<div data-tw-empty="work-record" style="background:var(--bg);border:1px dashed var(--border);border-radius:10px;padding:.65rem .9rem;font-size:.8rem;color:var(--muted);line-height:1.5">
             ${s.isEmpty?'🌳 Nothing logged yet, and that\'s fine. ':''}When you finish a job, add your hours in <strong>Work → Hours</strong>. Your hours, weeks and job types fill in here, and reviews from employers add your rating.
             <div style="margin-top:.45rem"><button type="button" class="btn-sm btn-ai" style="font-size:.72rem" onclick="if(typeof switchDashTab==='function')switchDashTab(null,'ttab-worklog')">⏱️ Log hours</button></div>
           </div>`;
}
if(timeEl){
const since=new Date(s.joined).toLocaleDateString('en-US',{month:'long',year:'numeric'});
timeEl.innerHTML=`<span style="font-size:.75rem;color:var(--muted)">Member since ${esc(since)} · ${onApp==='Today'?'joined today':esc(onApp)+' on TeenWork'}</span>`;
}
};
const UPLOAD_BOX=`
    <div data-tw-upload="1" style="border:2px dashed var(--border);border-radius:14px;padding:1rem 1.2rem;margin-top:.4rem;background:var(--bg)">
      <div style="font-weight:700;font-size:.88rem;color:var(--text);margin-bottom:.4rem">📤 Upload a Letter You Already Have</div>
      <p style="font-size:.79rem;color:var(--muted);margin-bottom:.75rem;line-height:1.5">Have a letter from a teacher, coach, or employer not on TeenWork? Upload it here to keep everything in one place.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <label style="background:var(--purple);color:#fff;border-radius:8px;padding:7px 16px;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;display:inline-block">
          📎 Choose File
          <input type="file" accept=".pdf,.doc,.docx,.txt" style="display:none" onchange="teenUploadLetter(this)">
        </label>
        <span id="teen-upload-name" style="font-size:.8rem;color:var(--muted)">No file selected</span>
      </div>
      <div id="teen-upload-alert" style="margin-top:.6rem"></div>
    </div>`;
const _oLetters=window.renderTeenLettersPanel;
window.renderTeenLettersPanel=function(){
const r=_oLetters?_oLetters.apply(this,arguments):undefined;
try{
const u=me();
if(isReal(u)&&u.type==='teen'){
const wrap=document.getElementById('teen-letters-inner');
if(wrap&& !wrap.querySelector('input[type=file]'))wrap.insertAdjacentHTML('beforeend',UPLOAD_BOX);
saveLetters(u);
}
}catch(e){}
return r;
};
const _oEmpStats=window.renderEmpStatsDashboard;
window.renderEmpStatsDashboard=function(){
const u=me();
if(!isReal(u)){realHide(document.getElementById('emp-stats-gen-btn'),false);return _oEmpStats?_oEmpStats.apply(this,arguments):undefined;}
const cards=document.getElementById('emp-stats-cards');if(!cards)return;
cards.innerHTML=`<div data-tw-empty="worker-report" style="grid-column:1/-1;text-align:center;padding:1.6rem 1rem;color:var(--muted);background:var(--card);border:1.5px dashed var(--border);border-radius:14px">
      <div style="font-size:2rem;margin-bottom:.5rem">📊</div>
      <div style="font-weight:700;font-size:.95rem;color:var(--text);margin-bottom:.3rem">No worker records yet</div>
      <div style="font-size:.84rem;line-height:1.5">When you hire a teen and rate their work, their hours, ratings and reviews show up here.</div></div>`;
const jobsRow=document.getElementById('emp-stats-jobs-row');if(jobsRow)jobsRow.innerHTML='';
const rev=document.getElementById('emp-stats-reviews');if(rev)rev.innerHTML='';
realHide(document.getElementById('emp-stats-gen-btn'),true);
};
const _oRatings=window.renderRatings;
window.renderRatings=function(){
const r=_oRatings?_oRatings.apply(this,arguments):undefined;
try{
const u=me(),real=isReal(u);
const tab=document.getElementById('ptab-ratings');
if(tab){
realText(tab.querySelector('.panel .panel-head h2'),real,'Your Teen\'s Ratings & Feedback');
realText(tab.querySelector('#rating-suggestions-panel .badge'),real,'Tips for your teen');
realHide(tab.querySelector('.panel .panel-head .btn-ai'),real);
}
if(!real)return r;
const list=document.getElementById('ratings-list');
if(list&& !demoRatings.length)list.innerHTML='<div data-tw-empty="ratings" style="text-align:center;padding:1.6rem 1rem;color:var(--muted)"><div style="font-size:2rem;margin-bottom:.5rem">⭐</div><div style="font-weight:700;color:var(--text);margin-bottom:.3rem">No ratings yet</div><div style="font-size:.84rem">When an employer rates your teen after a job, it shows up here.</div></div>';
}catch(e){}
return r;
};
const _oOpen=window.openLesson;
if(typeof _oOpen==='function'){
window.openLesson=function(id){
const r=_oOpen.apply(this,arguments);
if(id==='future_jobs_lor'&& !document.getElementById('tw34l'))return _oOpen.call(this,'references');
return r;
};
}
function redrawTeen(){
try{if(typeof window.renderLessonsGrid==='function')window.renderLessonsGrid();}catch(e){}
try{if(document.getElementById('ttab-letters')?.classList.contains('active'))window.renderTeenLettersPanel();}catch(e){}
}
function prepare(){
const u=me();if(!u)return;
useDeviceDataOf(u);
useLettersOf(u);
applySampleGate(u);
restoreLessons(u);
if(isReal(u)&&u.type==='teen'){
try{teenGameState.hoursWorked=parseFloat(readJSON('tw_worklog',[]).reduce((s,e)=>s+(parseFloat(e.hours)||0),0).toFixed(1));}catch(e){}
}
}
const _oLaunch=window.launchDashboard;
window.launchDashboard=function(){
try{prepare();}catch(e){console.warn('real-stats prepare failed',e);}
syncCalled=false;
const r=_oLaunch?_oLaunch.apply(this,arguments):undefined;
try{
const u=me();
if(isReal(u)){
applySampleGate(u);setTimeout(redrawTeen,200);
if(!syncCalled&&u.type==='teen'&&typeof window._syncUserData==='function')window._syncUserData();
}
}catch(e){}
return r;
};
window._twRealStats={stats:()=>realStats(me()),owner:()=>lsGet(OWNER),isReal:()=>isReal(me())};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/featpack-v39-cloud-js.js */
try{
(function(){
'use strict';
const REFRESH_SECONDS=Number(window.TW_MSG_REFRESH_SECONDS)||10;
const me=()=>window.currentUser||(typeof currentUser!=='undefined'?currentUser:null);
const sb=()=>(typeof sbClient!=='undefined'&&sbClient)?sbClient:null;
const keyOf=u=>u?(u.dataKey||String(u.email||'').toLowerCase()):'';
const isRealUser=()=>{const u=me();return!!(u&& !u.isDemo&& !u.isAdmin&&['teen','parent','employer'].includes(u.type)&& /@/.test(String(u.email||'')));};
const fmtTime=iso=>{const d=new Date(iso);return isNaN(d)?'':d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true});};
const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const avatars={employer:'🏢',teen:'🧑',parent:'👪',admin:'🛡️'};
const toast=(m,t)=>{try{showToast(m,t||'info');}catch(e){}};
const modalOpen=()=> !!document.getElementById('msgModal')?.classList.contains('open');
let lastError='';
function ensureClient(){
if(sb())return true;
try{
if(window.supabase&&typeof SUPABASE_URL!=='undefined'&&SUPABASE_KEY!=='YOUR_SUPABASE_ANON_KEY'){
sbClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
window.dispatchEvent(new CustomEvent('tw-supabase-ready'));
return true;
}
}catch(e){console.warn('Supabase connect failed:',e);}
return false;
}
window._twEnsureSupabase=ensureClient;
(function waitForSdk(n){if(ensureClient()||n>=60)return;setTimeout(()=>waitForSdk(n+1),500);})(0);
const storeKey=()=>'tw_'+keyOf(me()).replace(/[^a-z0-9]/gi,'_')+'_cloud_msgs';
let store={msgs:[],lastAt:null};
const seen=new Set();
function loadStore(){try{const s=JSON.parse(localStorage.getItem(storeKey())||'null');store=(s&&Array.isArray(s.msgs))?{msgs:s.msgs,lastAt:s.lastAt||null}:{msgs:[],lastAt:null};}catch(e){store={msgs:[],lastAt:null};}}
function saveStore(){try{localStorage.setItem(storeKey(),JSON.stringify({msgs:store.msgs.slice(-1000),lastAt:store.lastAt}));}catch(e){}}
function remember(r){seen.add(String(r.id));store.msgs.push(r);if(!store.lastAt||String(r.created_at)>String(store.lastAt))store.lastAt=r.created_at;}
const SEED={};
try{Object.keys(MSG_CONTACTS).forEach(t=>{SEED[t]=MSG_CONTACTS[t].map(c=>({...c,messages:c.messages.map(m=>({...m}))}));});}catch(e){}
function restoreSeeds(){try{Object.keys(SEED).forEach(t=>{MSG_CONTACTS[t]=SEED[t].map(c=>({...c,messages:c.messages.map(m=>({...m}))}));});}catch(e){}}
function contactsList(){const u=me();if(!u)return[];if(!MSG_CONTACTS[u.type])MSG_CONTACTS[u.type]=[];return MSG_CONTACTS[u.type];}
function liveList(){try{return(me()&&msgCurrentRole===me().type&&Array.isArray(msgAllContacts))?msgAllContacts:null;}catch(e){return null;}}
function findContact(key,name){
const list=contactsList();const n=String(name||'').trim().toLowerCase();
return list.find(c=>key&&c.cloudKey===key)||list.find(c=>n&&String(c.name||'').trim().toLowerCase()===n)||null;
}
function ensureContact(key,name,role){
let c=findContact(key,name);
if(!c){
c={id:'cloud-'+(key?slug(key):'name-'+slug(name))+'-'+Date.now().toString(36),name:name||key||'Unknown',avatar:avatars[role]||'🏢',role:role||'employer',jobTitle:'',unread:0,messages:[],cloudKey:key||''};
contactsList().unshift(c);
const live=liveList();if(live&& !live.includes(c))live.unshift(c);
}else if(key&& !c.cloudKey)c.cloudKey=key;
return c;
}
function addToContact(r){
const u=me();const mine=r.from_key===keyOf(u);
const otherKey=mine?(r.to_key||''):r.from_key;
const otherName=mine?(r.to_name||r.to_key):(r.from_name||r.from_key);
const otherRole=mine?(r.to_role||''):(r.from_role||'');
const c=ensureContact(otherKey,otherName,otherRole||(u.type==='employer'?'teen':'employer'));
c._cloudIds=c._cloudIds||new Set();
if(c._cloudIds.has(String(r.id)))return{c,added:false,mine};
c._cloudIds.add(String(r.id));
c.messages.push({from:mine?'me':'them',text:r.text,time:fmtTime(r.created_at),encrypted:false,cloudId:r.id});
return{c,added:true,mine};
}
function refreshUi(){
try{
if(modalOpen()){
const live=liveList();
if(live){contactsList().forEach(c=>{if(!live.includes(c))live.unshift(c);});}
renderMsgContactList(document.getElementById('msg-search-input')?.value||'');
if(msgActiveContactId)renderMsgBubbles(msgActiveContactId);
}
updateMsgBadge();
}catch(e){}
}
let fetching=false;
async function fetchNew(initial){
const client=sb();const u=me();
if(!client|| !u|| !isRealUser()||fetching)return;
fetching=true;
const k=keyOf(u),nm=String(u.name||'').trim(),since=initial?null:store.lastAt;
const rows=[];
const run=async b=>{if(since)b=b.gte('created_at',since);const{data,error}=await b.order('created_at',{ascending:true}).limit(300);if(error)throw error;(data||[]).forEach(r=>rows.push(r));};
try{
await run(client.from('messages').select('*').eq('to_key',k));
await run(client.from('messages').select('*').eq('from_key',k));
if(nm)await run(client.from('messages').select('*').is('to_key',null).ilike('to_name',nm));
lastError='';
}catch(e){lastError=String(e&&e.message||e);console.warn('Cloud messages:',lastError);fetching=false;return;}
const byId={};rows.forEach(r=>{if(!seen.has(String(r.id)))byId[String(r.id)]=r;});
const fresh=Object.values(byId).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
const incoming=[];
fresh.forEach(r=>{remember(r);const{c,added,mine}=addToContact(r);if(added&& !mine)incoming.push(c);});
if(fresh.length)saveStore();
if(incoming.length){
const active=modalOpen()?msgActiveContactId:null;
const names=[];
incoming.forEach(c=>{if(c.id!==active){c.unread=(c.unread||0)+1;if(!names.includes(c.name))names.push(c.name);}});
if(names.length)toast('💬 New message from '+names.join(', '),'info');
try{window.RT?.publish?.('message-received',{from:names[0]||''});}catch(e){}
}
if(fresh.length)refreshUi();
fetching=false;
}
const dir={at:0,map:{}};
async function lookupByName(name){
const client=sb();const n=String(name||'').trim().toLowerCase();if(!client|| !n)return null;
if(Date.now()-dir.at>60000){
try{
const{data}=await client.from('user_data').select('email,value').eq('key','account_profile').limit(2000);
dir.map={};
(data||[]).forEach(r=>{try{const v=JSON.parse(r.value||'{}');const key=String(v.name||'').trim().toLowerCase();if(key)(dir.map[key]=dir.map[key]||[]).push({key:r.email,role:v.type||''});}catch(e){}});
dir.at=Date.now();
}catch(e){}
}
const hits=dir.map[n]||[];
return hits.length===1?hits[0]:null;
}
function friendly(err){
const m=String(err&&err.message||err||'');
if(/does not exist|42P01|schema cache/i.test(m))return'the messages table is missing in Supabase (run supabase-setup.sql)';
if(/policy|permission|42501/i.test(m))return'the Supabase table rules block it (re-run supabase-setup.sql)';
if(/fetch|network|Failed to/i.test(m))return'no connection';
return m||'unknown error';
}
async function pushToCloud(c,m){
const u=me(),client=sb();
let toKey=c.cloudKey||'',toRole=c.role||'';
if(!toKey){const hit=await lookupByName(c.name);if(hit){toKey=hit.key;c.cloudKey=toKey;if(hit.role)toRole=hit.role;}}
const row={from_key:keyOf(u),from_name:u.name||u.email,from_role:u.type,to_key:toKey||null,to_name:c.name,to_role:toRole||null,text:m.text};
const{data,error}=await client.from('messages').insert([row]).select();
if(error){lastError=String(error.message||error);console.warn('Cloud send failed:',lastError);toast('⚠️ Message kept on this device but not delivered: '+friendly(error),'error');return;}
const saved=(data&&data[0])||{...row,id:'local-'+Date.now(),created_at:new Date().toISOString()};
m.cloudId=saved.id;
c._cloudIds=c._cloudIds||new Set();c._cloudIds.add(String(saved.id));
remember(saved);saveStore();
}
const _oSend=window.sendMsg;
window.sendMsg=async function(contactId){
const live=liveList()||[];
const c=live.find(x=>x.id===contactId)||contactsList().find(x=>x.id===contactId);
const before=c?c.messages.length:0;
const r=_oSend?await _oSend.apply(this,arguments):undefined;
try{
if(c&&isRealUser()&&sb()&&c.messages.length>before){
const m=c.messages[c.messages.length-1];
if(m&&m.from==='me'&& !m.blocked&& !m.cloudId)await pushToCloud(c,m);
}
}catch(e){console.warn('Cloud send failed:',e);}
return r;
};
const _oAuto=window.generateAutoReply;
window.generateAutoReply=function(){if(isRealUser()&&sb())return null;return _oAuto?_oAuto.apply(this,arguments):null;};
window.startRealtimeUpdates=function(){};
let timer=null,channel=null,running=false;
const onVis=()=>{if(document.visibilityState==='visible')fetchNew(false);};
function start(){
stop();
if(!isRealUser()|| !sb())return;
running=true;
loadStore();seen.clear();
const u=me();MSG_CONTACTS[u.type]=[];
const live=liveList();if(live)live.length=0;
store.msgs.forEach(r=>{seen.add(String(r.id));addToContact(r);});
refreshUi();
fetchNew(!store.lastAt);
timer=setInterval(()=>{if(document.visibilityState!=='hidden')fetchNew(false);},REFRESH_SECONDS*1000);
document.addEventListener('visibilitychange',onVis);
try{channel=sb().channel('tw-cloud-messages').on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},()=>fetchNew(false)).subscribe();}catch(e){channel=null;}
}
function stop(){
if(timer)clearInterval(timer);timer=null;
document.removeEventListener('visibilitychange',onVis);
try{if(channel){sb()?.removeChannel?.(channel);channel.unsubscribe?.();}}catch(e){}channel=null;
if(running){running=false;restoreSeeds();}
seen.clear();store={msgs:[],lastAt:null};
}
const _oLaunch=window.launchDashboard;
window.launchDashboard=function(){const r=_oLaunch?_oLaunch.apply(this,arguments):undefined;setTimeout(()=>{try{start();}catch(e){console.warn('cloud messages start failed',e);}},300);return r;};
const _oLogout=window.doLogout;
window.doLogout=function(){try{stop();}catch(e){}return _oLogout?_oLogout.apply(this,arguments):undefined;};
window.addEventListener('tw-supabase-ready',()=>{if(!running&&isRealUser())setTimeout(start,200);});
window._twCloudMessages={refresh:()=>fetchNew(false),status:()=>({connected: !!sb(),running,stored:store.msgs.length,lastError,refreshSeconds:REFRESH_SECONDS})};
const _oHealth=window.adminRunHealthCheck;
window.adminRunHealthCheck=async function(){
const r=_oHealth?await _oHealth.apply(this,arguments):undefined;
try{
const el=document.getElementById('adm-health-list');if(!el)return r;
let status='warn',note='Supabase not connected — messages stay on each device';
if(sb()){
const{error}=await sb().from('messages').select('id').limit(1);
if(!error){status='ok';note='table found · refresh every '+REFRESH_SECONDS+'s';}
else{status='error';note='table missing or blocked — run admin-account/supabase-setup.sql';}
}
el.querySelector('[data-tw-cloud]')?.remove();
const row=document.createElement('div');row.className='adm-health-item';row.setAttribute('data-tw-cloud','1');
row.innerHTML='<div class="adm-health-status '+status+'"></div><div class="adm-health-label">Cloud messaging</div><div class="adm-health-note">'+note.replace(/</g,'&lt;')+'</div>';
el.appendChild(row);
}catch(e){}
return r;
};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/homepage-v49.js */
try{
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let loading=false,busy=false;
async function client(){return typeof _twCloudClient==='function'?await _twCloudClient():null;}
async function loadReviews(){
const feed=$('tw49-reviews-feed');
if(!feed||loading)return;
loading=true;
try{
const c=await client();
if(!c)throw new Error('Connection unavailable');
const{data,error}=await c.rpc('tw_public_app_reviews');
if(error|| !Array.isArray(data))throw new Error('Reviews unavailable');
const reviews=data.filter(r=>Number.isInteger(r.rating)&&r.rating>=1&&r.rating<=5&&typeof r.body==='string');
if(!reviews.length)feed.innerHTML='<p>No public reviews yet. Reviews appear here when members choose to share their feedback.</p>';
else{
const avg=(reviews.reduce((sum,r)=>sum+r.rating,0)/reviews.length).toFixed(1);
feed.innerHTML='<p><strong>'+esc(avg)+' / 5</strong> · '+reviews.length+' shared review'+(reviews.length===1?'':'s')+'</p>'+reviews.map(r=>{
const d=new Date(r.created_at);const date=Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
return'<article class="tw49-review"><span aria-label="'+r.rating+' out of 5 stars">'+'★'.repeat(r.rating)+'☆'.repeat(5-r.rating)+'</span><blockquote>'+esc(r.body)+'</blockquote><p class="tw48-small">TeenWork member'+(date?' · <time>'+esc(date)+'</time>':'')+'</p></article>';
}).join('');
}
}catch(e){
feed.innerHTML='<p>Reviews are temporarily unavailable.</p><button class="tw48-link" type="button" id="tw49-retry-reviews">Try again →</button>';
$('tw49-retry-reviews')?.addEventListener('click',loadReviews);
}finally{loading=false;}
}
function enhanceForm(){
const text=$('v17-erm-text');if(!text||$('tw49-public-review'))return;
text.maxLength=2000;
text.insertAdjacentHTML('afterend','<label class="tw49-consent"><input type="checkbox" id="tw49-public-review"><span>Share my rating and comment on the TeenWork homepage as “TeenWork member.” Please leave out names, contact details and other private information.</span></label><p id="tw49-review-error" role="status"></p>');
}
async function submitReview(){
if(busy)return;
enhanceForm();
const error=$('tw49-review-error');
const fail=m=>{if(error)error.textContent=m;};
const stars=typeof _v17Stars==='number'?_v17Stars:0;
const body=$('v17-erm-text')?.value.trim()||'';
if(!stars|| !body||body.length>2000){fail('Choose a star rating and add a comment of up to 2,000 characters.');return;}
busy=true;if(error)error.textContent='Saving your review…';
try{
const c=await client();const session=c?await c.auth.getSession():null;
if(!session?.data?.session|| !window.currentUser||window.currentUser.isDemo||
String(session.data.session.user?.email||'').toLowerCase()!==String(window.currentUser.email||'').toLowerCase()){
fail('Please sign in to a real account to save a review.');return;
}
const{error:saveError}=await c.rpc('tw_submit_app_review',{p_rating:stars,p_body:body,p_public:!!$('tw49-public-review')?.checked});
if(saveError)throw new Error('Save failed');
if(error)error.textContent='';
$('v17-erm-form').style.display='none';$('v17-erm-thanks').style.display='block';
if(typeof showToast==='function')showToast('Your review is saved. Thank you!','success');
await loadReviews();
setTimeout(()=>{
$('v17-enhanced-rating-modal')?.classList.remove('open');
setTimeout(()=>{if($('v17-erm-form'))$('v17-erm-form').style.display='';if($('v17-erm-thanks'))$('v17-erm-thanks').style.display='none';},300);
},1800);
}catch(e){fail('Your review could not be saved. Please try again; your comment is still here.');}
finally{busy=false;}
}
function boot(){
expandHomepage();
window._v17SubmitEnhancedReview=submitReview;
enhanceForm();
new MutationObserver(enhanceForm).observe(document.body,{childList:true,subtree:true});
window.addEventListener('tw-supabase-ready',loadReviews);
document.querySelector('#page-landing')&&new MutationObserver(()=>{
if($('page-landing').classList.contains('active'))loadReviews();
}).observe($('page-landing'),{attributes:true,attributeFilter:['class']});
loadReviews();
}
window.twRefreshPublicReviews=loadReviews;
function expandHomepage(){
const hero=$('tw48-hero'),image=$('tw-hero-outer');
if(!hero||$('tw50-details'))return;
if(image?.parentElement===hero.parentElement)hero.before(image);
hero.insertAdjacentHTML('beforeend','<button class="tw48-link tw50-scroll" type="button" id="tw50-discover">See how TeenWork works ↓</button>');
$('tw50-discover').addEventListener('click',()=>$('tw48-how')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
const details=document.createElement('div');details.id='tw50-details';
details.innerHTML=`
   <section class="landing-section" aria-labelledby="tw50-tools">
    <div class="landing-section-head"><div><h2 id="tw50-tools">More than finding a first job</h2><p>A place to prepare, apply and keep track as you build experience.</p></div></div>
    <div class="tw48-proof-grid">
     <article class="tw48-card"><h3>Look for local work</h3><p>Browse employer posts and read the work, pay, location and age requirements before applying. Talk through the details with a parent first.</p><p>Jobs depend on what real employers post. There may not be a listing near you yet.</p></article>
     <article class="tw48-card"><h3>Learn before you start</h3><p>Take short lessons to prepare for work. Practice explaining your skills, asking questions and understanding what an employer expects.</p><p>The AI coach can help with application ideas. Live AI requires an online, signed-in account and has usage limits.</p></article>
     <article class="tw48-card"><h3>Keep your work record</h3><p>Log hours and earnings as you complete jobs. Keep track of your progress and the experience you can describe on your next application.</p><p>Payment is arranged with the employer and your parent. TeenWork does not process wages or take a cut of your earnings.</p></article>
    </div>
   </section>
   <section class="landing-section" aria-labelledby="tw50-ideas">
    <div class="landing-section-head"><div><h2 id="tw50-ideas">What could a neighborhood job look like?</h2><p>Ideas to discuss with a parent—not current job listings. Tasks should fit your age, experience and local rules.</p></div></div>
    <div class="tw48-proof-grid">
     <article class="tw48-card"><h3>Yard and garden help</h3><p>Raking leaves, pulling weeds or watering plants. Agree on the area, tools, pay and expected time before starting.</p></article>
     <article class="tw48-card"><h3>Pet care</h3><p>Feeding pets or walking a familiar dog. Meet the animal with a parent and ask about its behavior, routine and emergency contact.</p></article>
     <article class="tw48-card"><h3>Seasonal help</h3><p>Hand-shoveling a walkway or helping with simple seasonal cleanup. A parent should check the weather, equipment and workload with you.</p></article>
    </div>
   </section>
   <section class="landing-section" aria-labelledby="tw50-checklist">
    <div class="landing-section-head"><div><h2 id="tw50-checklist">Before the first job</h2><p>A few details make it easier for everyone to know what to expect.</p></div></div>
    <div class="tw48-proof-grid">
     <article class="tw48-card"><h3>1. Agree on the work</h3><p>Ask what needs doing, how long it might take, what tools are needed and what the pay will be. Keep the conversation in the app.</p></article>
     <article class="tw48-card"><h3>2. Make a plan together</h3><p>Review the employer and job with a parent. Decide on transport, timing and how to check in. Parent approval is a starting point for that conversation.</p></article>
     <article class="tw48-card"><h3>3. Ask if anything changes</h3><p>If the task, location or people involved change, pause and talk to your parent. You can turn down work that makes you uncomfortable.</p></article>
    </div>
   </section>
   <section class="landing-section" aria-labelledby="tw50-faq">
    <div class="landing-section-head"><div><h2 id="tw50-faq">Questions before you join</h2><p>What to expect from TeenWork.</p></div></div>
    <details class="tw50-faq"><summary>What is TeenWork?</summary><p>TeenWork is a teen job app and job finder for ages 13–17, and it's free to join. Teens browse local jobs that employers post, like lawn care, pet sitting and snow shoveling, and a linked parent approves every application. A 13-year-old started it in Vermont.</p></details>
    <details class="tw50-faq"><summary>Do I need to download the TeenWork app?</summary><p>No. TeenWork is a web app, so it works in the browser on a phone, tablet or computer at teenwork.ayaqd.com. To keep it handy on a phone, use the browser's Share or menu button and choose Add to Home Screen.</p></details>
    <details class="tw50-faq"><summary>Who can use TeenWork?</summary><p>Teens ages 13–17, their parents, and employers with local work. When a teen applies for a job, TeenWork checks the job's minimum age, job types teens aren't allowed to do, and whether the teen's state needs a work permit.</p></details>
    <details class="tw50-faq"><summary>Can I explore without creating an account?</summary><p>Yes. Choose Teen Demo, Parent Demo or Employer Demo above. Each demo is an empty practice account, like a brand-new one, so you can try every screen. Nothing you do in a demo is saved or sent, and the demo AI can be tried 5 times a day.</p></details>
    <details class="tw50-faq"><summary>How does a parent get involved?</summary><p>The parent creates a separate account and links to the teen using the teen's code. A parent must agree before the teen applies, and each application waits for parent approval before the employer receives it.</p></details>
    <details class="tw50-faq"><summary>Are jobs guaranteed in my town?</summary><p>No. TeenWork started in Vermont, and listings appear when local employers post them. Creating an account does not guarantee a nearby job or that an employer will hire you.</p></details>
    <details class="tw50-faq"><summary>Can an employer post a small neighborhood job?</summary><p>Employers can describe local work, the location, pay and requirements. Be specific about the tasks and schedule. Employers are responsible for checking that the work and hours are appropriate for the teen's age and follow applicable rules.</p></details>
    <details class="tw50-faq"><summary>Does TeenWork verify every employer?</summary><p>TeenWork does not currently verify employer identities or run criminal background checks. Parents should review the work and meet the employer with their teen before a first job. Read “How safety works” for the app's checks and their limits.</p></details>
    <details class="tw50-faq"><summary>Where do real reviews come from?</summary><p>Signed-in members can leave feedback using Rate app in their dashboard. A review appears publicly only when its author chooses to share it. Demo reviews are not used as real testimonials.</p></details>
   </section>`;
$('tw48-proof')?.before(details);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/phone-fit-v51.js */
try{
(function(){
'use strict';
let demoUntil=0,pending=[],tries=0,timer=0;
function isWelcome(msg,type){
if(type==='error')return false;
const t=String(msg||'');
const demoOn= !window._twDemoSandbox||window._twDemoSandbox.active;
return/\bwelcome\b/i.test(t)||(Date.now()<demoUntil&&demoOn&& /\b(demo|sample)\b/i.test(t));
}
function activeDash(){
const page=document.querySelector('.page.active');
return page&&page.querySelector('.dashboard');
}
function removeNotes(){document.querySelectorAll('.tw-welcome-note').forEach(n=>n.remove());}
function place(){
timer=0;
const dash=activeDash();
if(!dash){
if(++tries<8){timer=setTimeout(place,250);return;}
const left=pending;pending=[];
left.forEach(m=>original(m.msg,m.type));
return;
}
const hasBanner= !!dash.querySelector('#tw48-demo-banner');
const msgs=pending.splice(0).map(m=>m.msg).filter(t=> !hasBanner|| /\bwelcome\b/i.test(t));
if(!msgs.length)return;
let note=dash.querySelector(':scope > .tw-welcome-note');
if(!note){
removeNotes();
note=document.createElement('div');
note.className='tw-welcome-note';
const close=document.createElement('button');
close.type='button';close.textContent='×';
close.setAttribute('aria-label','Dismiss welcome message');
close.onclick=()=>note.remove();
note.append(close);
const head=dash.querySelector(':scope > .dash-header');
dash.insertBefore(note,head||dash.firstChild);
}
msgs.forEach(t=>{
if([...note.querySelectorAll('p')].some(p=>p.textContent===t))return;
const p=document.createElement('p');p.textContent=t;
note.insertBefore(p,note.lastElementChild);
announce(t);
});
}
function announce(t){
let live=document.getElementById('tw-welcome-live');
if(!live){
live=document.createElement('div');live.id='tw-welcome-live';live.setAttribute('role','status');
live.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
document.body.append(live);
}
live.textContent='';
setTimeout(()=>{live.textContent=t;},50);
}
let original=window.showToast;
function install(){
const cur=window.showToast;
if(typeof cur!=='function'||cur.__twWelcome)return;
original=cur;
const w=function(msg,type){
if(!isWelcome(msg,type))return original.apply(this,arguments);
pending.push({msg:String(msg),type});
tries=0;
if(!timer)timer=setTimeout(place,0);
};
w.__twWelcome=true;
window.showToast=w;
}
function wrapDemo(){
const orig=window._directDemo;
if(typeof orig!=='function'||orig.__twWelcome)return;
const w=function(){demoUntil=Date.now()+4000;return orig.apply(this,arguments);};
w.__twWelcome=true;
window._directDemo=w;
}
install();wrapDemo();
document.addEventListener('DOMContentLoaded',()=>{install();wrapDemo();if(document.body)announce('');});
document.addEventListener('click',e=>{
if(e.target.closest('.tw-welcome-note'))return;
if(e.target.closest('[onclick*="switch"],[onclick*="gotoPage"],[onclick*="signOut"],.mobile-nav button,#twm-bottom button,.pdtab'))setTimeout(removeNotes,0);
},true);
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/trust-usability.js */
try{
(function(){
'use strict';
const $=id=>document.getElementById(id);
const user=()=>window.currentUser||(typeof currentUser!=='undefined'?currentUser:null);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const limits='AI screening can miss things or be unavailable. Reports and alerts are not monitored 24/7 and do not guarantee a response. In immediate danger, call 911; this is not an emergency service.';
function safetyNote(){
const p=document.createElement('p');p.className='tw-safety-note';
p.append(document.createTextNode(limits+' '));
const b=document.createElement('button');b.type='button';b.className='tw48-link';b.textContent='How safety works';b.onclick=()=>window.twOpenSafetyDetails?.();p.append(b);return p;
}
function addNote(host){if(host&& !host.querySelector(':scope > .tw-safety-note'))host.append(safetyNote());}
function ageOf(u){
if(!u?.dob)return Number.isInteger(u?.age)&&u.age>=13&&u.age<=17?u.age:null;const d=new Date(u.dob+'T00:00:00'),n=new Date();if(isNaN(d))return null;
const a=n.getFullYear()-d.getFullYear()-(n.getMonth()<d.getMonth()||n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()?1:0);return a>=13&&a<=17?a:null;
}
window.twRenderLaborSummary=function(banner,state){
if(!banner)return;const u=user(),age=ageOf(u),name=String(u?.state||'');
const rules=typeof STATE_DATA!=='undefined'&&name?STATE_DATA[name]:null;
let summary,detail;
if(!age|| !name|| !rules){summary='Add your age and state to see relevant work guidance.';detail='Your age or supported jurisdiction is unknown. A search filter does not establish where you work. Ask a parent to review the job and local requirements.';}
else{
summary=`Age ${age} · ${name}: `+(age<14?'job options are limited; review each task with a parent.':age<16?'school-day and weekly hour limits may apply.':'hazardous tasks remain restricted; state limits may apply.');
detail=rules.notes+' '+(rules.permitNote||'')+' These are the rules currently supported by TeenWork, not a determination that a particular job is legal. Job duties, school schedule and exceptions can change the requirements.';
}
const html='<strong>'+escape(summary)+'</strong><details class="tw-law-details"><summary>Full work guidance and limits</summary><p>'+escape(detail)+'</p></details>';
if(banner._twHtml!==html|| !banner.querySelector('.tw-law-details')){banner.innerHTML=html;banner._twHtml=html;}
if(!banner.classList.contains('show'))banner.classList.add('show');
};
window.twOpenPendingApprovals=function(){
document.querySelectorAll('.type-cb').forEach(x=>{x.checked=false;});
['filter-pay','filter-min-rating','filter-max-hours','filter-city'].forEach(id=>{if($(id))$(id).value='';});
window.renderApprovalJobs?.(typeof demoJobs!=='undefined'?demoJobs:[]);
window.switchParentTab?.('ptab-approvals','pdtab-approvals');
};
function groupJobActions(){
document.querySelectorAll('#browse-jobs-list .browse-card').forEach(card=>{
const row=card.querySelector('.browse-actions');
if(row&& !row.querySelector('.tw-secondary-actions')){
const secondary=[...row.children].filter(el=>el.tagName==='BUTTON'&& !el.classList.contains('btn-apply')&& !/report|issue/i.test(el.textContent));
secondary.filter(el=>/BG Check|Background/i.test(el.textContent)).forEach(el=>el.remove());
const keep=secondary.filter(el=>el.isConnected);
if(keep.length){const d=document.createElement('details');d.className='tw-secondary-actions';const s=document.createElement('summary');s.textContent='More options';d.append(s,...keep);row.append(d);}
}
});
}
function accurateScreening(){
document.querySelectorAll('.verified-emp-badge').forEach(el=>el.remove());
document.querySelectorAll('.tw-ver-badge.identity,.tw-ver-badge.bgc').forEach(el=>el.remove());
document.querySelectorAll('.badge,.tag,.tw-ver-badge').forEach(el=>{if(/^(?:[✅🪪🛡✦✓ ]*)?(?:Verified|Identity Verified|Trusted\+|Background Check)$/iu.test(el.textContent.trim()))el.remove();});
document.querySelectorAll('[onclick*="requestEmployerBGC"]').forEach(el=>el.remove());
['tw-ver-t4','tw-ver-line-3'].forEach(id=>{if($(id))$(id).hidden=true;});
const sub=$('tw-ver-page-sub');if(sub&&sub.textContent!=='Profile details are self-reported. Linked-parent consent and work-permit status are separate checks.')sub.textContent='Profile details are self-reported. Linked-parent consent and work-permit status are separate checks.';
}
function wireFieldLabels(){
document.querySelectorAll('.form-group input[id],.form-group select[id],.form-group textarea[id],.tw-ver-field input[id]').forEach(input=>{const label=input.closest('.form-group,.tw-ver-field')?.querySelector('label');if(label&& !label.htmlFor)label.htmlFor=input.id;});
}
const fieldIds=['emp-title','emp-type','emp-pay','emp-pay-type','emp-city','emp-state','emp-min-age','emp-max-hours','emp-desc'];
const checkIds=['twjt-emp-permit','twjt-emp-home','twjt-emp-hazard'];
let step=0,steps,progress,preview,back,next,publishRow;
const titles=['Job and pay','Location and travel','Age, hours and tasks','Review before posting'];
function draftKey(){const u=user();return u?.type==='employer'?'tw_post_draft_'+encodeURIComponent(u.dataKey||u.email||'demo'):null;}
function values(){return Object.fromEntries(fieldIds.map(id=>[id,$(id)?.value||'']));}
function previewJob(){
const v=values();preview.replaceChildren();
const h=document.createElement('h4');h.textContent=v['emp-title']||'Untitled job';preview.append(h);
const dl=document.createElement('dl');
[['Type',v['emp-type']],['Pay',v['emp-pay']?'$'+v['emp-pay']+' · '+v['emp-pay-type']:'Not supplied'],['Location',[v['emp-city'],v['emp-state']].filter(Boolean).join(', ')],['Nearby landmark',$('emp-landmark')?.selectedOptions[0]?.textContent||'Not selected'],['Minimum age',v['emp-min-age']],['Hours per week',v['emp-max-hours']],['Description',v['emp-desc']],['Travel',[...document.querySelectorAll('#emp-transport-options input:checked')].map(x=>x.parentElement.textContent.trim()).join(', ')]].forEach(([k,v])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v||'Not supplied';dl.append(dt,dd);});checkIds.forEach(id=>{const el=$(id);if(!el)return;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=el.parentElement.textContent.trim();dd.textContent=el.checked?'Selected':'Not selected';dl.append(dt,dd);});preview.append(dl,safetyNote());
const p=document.createElement('p');p.textContent='This preview is not a compliance approval. Employers must check applicable rules. The existing posting checks run when you choose Post Job.';preview.append(p);
}
function showStep(n){
step=Math.max(0,Math.min(3,n));steps.forEach((s,i)=>{s.hidden=i!==step;});
progress.textContent=`Step ${step+1} of 4 · ${titles[step]}`;progress.setAttribute('aria-valuenow',String(step+1));
back.disabled=step===0;next.hidden=step===3;publishRow.hidden=step!==3;if(step===3)previewJob();
progress.focus({preventScroll:true});
}
function validateStep(){
const required=step===0?['emp-title','emp-type','emp-pay']:step===1?['emp-city','emp-state']:['emp-min-age','emp-max-hours','emp-desc'];
const checkIds=['twjt-emp-permit','twjt-emp-home','twjt-emp-hazard'];
for(const id of required){const el=$(id);if(!el)continue;el.required=true;
if(id==='emp-pay'){el.min='0.01';el.step='0.01';}if(id==='emp-max-hours')el.min='1';
if(!el.value.trim()||!el.checkValidity()){el.reportValidity();el.focus();return false;}
}return true;
}
function postingWizard(){
const form=document.querySelector('#etab-post .post-form');if(!form||$('tw-post-progress'))return;
progress=document.createElement('p');progress.id='tw-post-progress';progress.tabIndex=-1;progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Job posting progress');progress.setAttribute('aria-valuemin','1');progress.setAttribute('aria-valuemax','4');form.querySelector('h3').after(progress);
steps=titles.map((title,i)=>{const f=document.createElement('fieldset');f.className='tw-post-step';const l=document.createElement('legend');l.textContent=title;f.append(l);return f;});
[...form.children].forEach(el=>{
if(el===progress||el.tagName==='H3'||el.id==='emp-post-alert')return;
if(el.querySelector('[onclick="postJob()"]')){publishRow=el;return;}
let target=2;
if(el.querySelector('#emp-title,#emp-type,#emp-pay,#emp-desc'))target=0;
if(el.querySelector('#emp-city,#emp-state,#emp-landmark,#emp-transport-options')||/landmark/i.test(el.id))target=1;
steps[target].append(el);
});
steps.forEach(f=>form.append(f));preview=document.createElement('div');preview.id='tw-post-preview';steps[3].append(preview);if(publishRow)steps[3].append(publishRow);
const location=$('emp-city')?.closest('.form-row');const privacy=document.createElement('p');privacy.className='tw-field-hint';privacy.textContent='Public listing: use a city or nearby landmark. Do not put a home address, phone number or private meeting instructions in the title or description. Arrange details with a parent involved.';location?.after(privacy);
const hours=$('emp-max-hours')?.closest('.form-row');const guidance=document.createElement('p');guidance.className='tw-field-hint';guidance.textContent='Age and hours are requirements you enter, not a compliance certification. Review the duties, equipment, school schedule and the selected state’s guidance; parents must review each application.';hours?.after(guidance);
const nav=document.createElement('div');nav.className='tw-post-controls';back=document.createElement('button');back.type='button';back.className='btn-secondary';back.textContent='Back';back.onclick=()=>showStep(step-1);next=document.createElement('button');next.type='button';next.className='btn-primary';next.textContent='Continue';next.onclick=()=>{if(validateStep())showStep(step+1);};nav.append(back,next);
const save=document.createElement('button');save.type='button';save.className='btn-secondary';save.textContent='Save draft on this device';
const restore=document.createElement('button');restore.type='button';restore.className='btn-secondary';restore.textContent='Restore my device draft';
save.onclick=()=>{try{const k=draftKey();if(!k)throw Error();localStorage.setItem(k,JSON.stringify({fields:values(),checks:Object.fromEntries(checkIds.map(id=>[id,!!$(id)?.checked])),transport:[...document.querySelectorAll('#emp-transport-options input:checked')].map(x=>x.value)}));showToast('Draft saved on this device. It has not been posted.','info');}catch{showToast('Draft could not be saved on this device.','info');}};
restore.onclick=()=>{try{const k=draftKey(),d=k&&JSON.parse(localStorage.getItem(k));if(!d?.fields){showToast('No device draft for this account.','info');return;}fieldIds.forEach(id=>{if($(id)){$(id).value=String(d.fields[id]||'');$(id).dispatchEvent(new Event('change',{bubbles:true}));}});document.querySelectorAll('#emp-transport-options input').forEach(x=>{x.checked=Array.isArray(d.transport)&&d.transport.includes(x.value);x.dispatchEvent(new Event('change'));});checkIds.forEach(id=>{if($(id)){$(id).checked=!!d.checks?.[id];$(id).dispatchEvent(new Event('change'));}});showStep(0);}catch{showToast('Draft could not be restored.','info');}};
nav.append(save,restore);form.append(nav);form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();next.click();}});showStep(0);
}
function decorate(){
accurateScreening();groupJobActions();wireFieldLabels();
['msg-main-area','approval-jobs'].forEach(id=>addNote($(id)));
addNote(document.querySelector('#feelsWrongModal .modal'));
addNote(document.querySelector('#dispute-modal .ai-tools-modal-body'));
const browse=$('browse-jobs-list');if(browse)addNote(browse);
const banner=$('teen-state-rules-banner');if(banner)window.twRenderLaborSummary(banner,user()?.state);
const toast=$('global-toast');if(toast&&toast.style.opacity==='0'&&toast.style.pointerEvents!=='none')toast.style.pointerEvents='none';
}
function boot(){
const modal=$('tw48-safety-modal');if(modal)document.body.append(modal);
const full=$('tw48-safety-modal')?.querySelector('.tw48-safety-doc');if(full&& !full.querySelector('.tw-safety-note'))full.append(safetyNote());
postingWizard();decorate();let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest('[onclick*="switch"],[onclick*="launchDashboard"]'))setTimeout(decorate,0);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/work-rules-v52.js */
try{
(function(){
'use strict';
if(window.twWorkRules)return;
const REVIEWED='2026-11-02',REVIEWED_TEXT='Nov 2, 2026';
const TABLE_DATE='July 15, 2025';
const SRC={
cfr:{label:'29 CFR 570.35',url:'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570/subpart-C/section-570.35'},
fs43:{label:'US DOL Fact Sheet #43',url:'https://www.dol.gov/agencies/whd/fact-sheets/43-child-labor-non-agriculture'},
states:{label:'US DOL state child labor table ('+TABLE_DATE+')',url:'https://www.dol.gov/agencies/whd/state/child-labor'},
certs:{label:'US DOL work permit table',url:'https://www.dol.gov/agencies/whd/state/age-certificates'},
offices:{label:'state labor offices',url:'https://www.dol.gov/agencies/whd/state/contacts'},
vt431:{label:'21 V.S.A. § 431',url:'https://legislature.vermont.gov/statutes/section/21/005/00431'},
vt434:{label:'21 V.S.A. § 434',url:'https://legislature.vermont.gov/statutes/section/21/005/00434'},
vt436:{label:'21 V.S.A. § 436',url:'https://legislature.vermont.gov/statutes/section/21/005/00436'},
vt437:{label:'21 V.S.A. § 437',url:'https://legislature.vermont.gov/statutes/section/21/005/00437'},
wh30:{label:'Vermont DOL guide WH-30',url:'https://labor.vermont.gov/src/sites/labor/files/doc_library/WH-30-Information-for-Employer-Child-Labor-Law.pdf'},
cadlse:{label:'California DLSE child labor guide',url:'https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf'},
};
const FED={
minAge:14,
under16:{schoolDay:3,schoolWeek:18,nonSchoolDay:8,nonSchoolWeek:40,start:'7 a.m.',end:'7 p.m.',summerEnd:'9 p.m.'},
hazardUnder:18,
};
const FED_TIME='Between 7 a.m. and 7 p.m. (9 p.m. from June 1 through Labor Day).';
const F={sd:3,sw:18,nd:8,nw:40};
const N7='No work from 7 p.m. to 7 a.m. (9 p.m. from June 1 through Labor Day).';
const RAW={
'Alabama':{u:{...F,days:6,n:'No work from 7 p.m. to 7 a.m. (9 p.m. during summer vacation).'},
o:{n:'If you\'re in school: no work from 10 p.m. to 5 a.m. before a school day. The state can grant exceptions.'}},
'Alaska':{u:{cd:9,cw:23,days:6,h:'School and work together: at most 9 h a day and 23 h a week, and no more than 6 days a week.',n:'No work from 9 p.m. to 5 a.m.'},
o:{days:6,h:'No more than 6 days a week.'}},
'Arizona':{u:{...F,n:'No work from 9:30 p.m. (11 p.m. before a non-school day) to 6 a.m. Door-to-door sales or deliveries: no work from 7 p.m. to 6 a.m.'},o:{}},
'Arkansas':{u:{d:8,w:48,days:6,n:'No work from 7 p.m. (9 p.m. before a non-school day) to 6 a.m.'},
o:{d:10,h:'At 16: no more than 10 hours in a row, or in any 24 hours.',s:'no more than 10 hours in a row, or in any 24 hours',n:'At 16: no work from 11 p.m. to 6 a.m. before a school day.'},o17:{}},
'California':{u:{...F,n:N7},
o:{sd:4,nd:8,w:48,h:'Up to 4 h on a school day and 8 h on a non-school day or the day before one; up to 48 h a week.',n:'No work from 10 p.m. (12:30 a.m. before a non-school day) to 5 a.m.'},
extra:['cadlse']},
'Colorado':{u:{sd:6,sw:40,nd:8,nw:40,n:'No work from 9:30 p.m. to 5 a.m. before a school day.'},o:{d:8,w:40}},
'Connecticut':{u:{nd:8,nw:40,h:'Up to 8 h a day and 40 h a week during school vacations of 5 days or more.',n:'No work from 7 p.m. to 7 a.m. (9 p.m. from July 1 to the first Monday in September).'},
o:{sd:6,sw:32,nd:8,nw:48,days:6,s:'if you\'re in high school, up to 6 h on a school day and 32 h in a school week in most businesses (8 h a day and 48 h a week when school is out)',h:'If you\'re in high school: up to 6 h on a school day and 32 h in a school week in restaurants, stores, entertainment, factories, salons and most other businesses; up to 8 h a day, 48 h a week and 6 days a week when school is out.',
n:'Restaurants, entertainment and theaters: no work from 11 p.m. (midnight during vacations or before a non-school day) to 6 a.m. Stores, factories and mechanical work: no work from 10 p.m. (11 p.m. during vacations or before a non-school day; midnight in large supermarkets when there\'s no school the next day) to 6 a.m. Salons, bowling alleys, pool halls and photo studios: no work from 10 p.m. to 6 a.m.'}},
'Delaware':{u:{sd:4,sw:18,nd:8,nw:40,days:6,n:N7},
o:{cd:12,h:'School and work together: at most 12 h a day.',s:'school and work hours together can\'t top 12 h a day',n:'You need 8 hours in a row off work and school in every 24 hours.'}},
'District of Columbia':{u:{d:8,w:48,days:6,n:N7},o:{d:8,w:48,days:6,n:'No work from 10 p.m. to 6 a.m.'}},
'Florida':{u:{sd:3,sw:15,nd:8,nw:40,days:6,n:'No work from 7 p.m. before a school day to 7 a.m. on a school day (9 p.m. during holidays and summer vacation).'},
o:{sd:8,sw:30,days:6,s:'when school is in session, up to 8 h a day and 30 h a week, 6 days a week',h:'When school is in session: up to 8 h a day and 30 h a week, 6 days a week.',n:'No work from 11 p.m. to 6:30 a.m. before a school day.'}},
'Georgia':{u:{sd:4,sw:40,nd:8,nw:40,n:'No work from 9 p.m. to 6 a.m.'},o:{}},
'Hawaii':{u:{...F,days:6,n:'No work from 7 p.m. to 7 a.m. (from 9 p.m. to 6 a.m. during school breaks).'},o:{}},
'Idaho':{u:{d:9,w:54,n:'No work from 9 p.m. to 6 a.m.'},o:{}},
'Illinois':{u:{...F,n:N7},o:{}},
'Indiana':{u:{...F,n:N7},o:{}},
'Iowa':{u:{sd:6,sw:28,nd:8,nw:40,n:'No work from 9 p.m. (11 p.m. from June 1 through Labor Day) to 7 a.m.'},o:{}},
'Kansas':{u:{d:8,w:40,n:'No work from 10 p.m. to 7 a.m. before a school day.'},o:{}},
'Kentucky':{u:{...F,n:N7},
o:{sd:6,sw:30,s:'when school is in session, up to 6 h on a school day and 30 h in a school week',h:'When school is in session: up to 6 h on a school day and 30 h in a school week (40 h with a parent\'s permission and at least a 2.0 grade point average).',n:'When school is in session: no work from 11 p.m. (1 a.m. on Friday and Saturday nights) to 6 a.m.'}},
'Louisiana':{u:{...F,days:6,n:'No work from 7 p.m. to 7 a.m. (9 p.m. from June 1 through Labor Day). If you haven\'t graduated: no work from 7 p.m. to 7 a.m. on a school day, or from 9 p.m. to 7 a.m. on other days.'},
o:{n:'If you haven\'t graduated: no work from 11 p.m. to 5 a.m. before a school day.'},
o17:{n:'If you haven\'t graduated: no work from midnight to 5 a.m. before a school day.'}},
'Maine':{u:{...F,days:6,n:'No work from 7 p.m. to 7 a.m. (9 p.m. during summer vacation).'},
o:{sd:6,sw:24,nd:10,nw:50,days:6,s:'if you\'re in school, up to 6 h on a school day and 24 h in a school week (10 h a day and 50 h a week when school is out)',h:'If you\'re in school: up to 6 h on a school day (8 h on the last school day of the week) and 24 h in a school week; up to 10 h a day and 50 h a week when school is out; 6 days a week.',
n:'If you\'re in school: no work from 10:15 p.m. (midnight before a non-school day) to 7 a.m. on a school day, or to 5 a.m. on other days.'}},
'Maryland':{u:{sd:4,sw:23,nd:8,nw:40,n:'No work from 8 p.m. to 7 a.m. (9 p.m. from Memorial Day through Labor Day).'},
o:{cd:12,h:'School and work together: at most 12 h a day.',s:'school and work hours together can\'t top 12 h a day',n:'You need 8 hours in a row off work and school in every 24 hours.'}},
'Massachusetts':{u:{d:8,w:48,days:6,n:'Work only between 6:30 a.m. and 7 p.m. during the school year, and between 6:30 a.m. and 9 p.m. from July 1 through Labor Day.'},
o:{d:9,w:48,days:6,n:'Work only between 6 a.m. and 10 p.m. before a school day (10:15 p.m. if the business stops serving customers at 10), and between 6 a.m. and 11:30 p.m. on other nights (midnight in restaurants and racetracks).'}},
'Michigan':{u:{sd:3,sw:18,nw:40,n:N7},
o:{sd:10,sw:24,nd:10,nw:48,h:'Up to 10 h a day; up to 24 h in a school week and 48 h a week when school is out.',n:'If you\'re in school: no work from 10:30 p.m. (11:30 p.m. on Fridays, Saturdays and school vacations) to 6:30 a.m. If you\'re not in school: no work from 11:30 p.m. to 6 a.m.'}},
'Minnesota':{u:{d:8,w:40,n:'No work from 9 p.m. to 7 a.m.'},
o:{n:'No work from 11 p.m. to 5 a.m. before a school day (11:30 p.m. to 4:30 a.m. with a parent\'s written permission).'}},
'Mississippi':{u:{x:'Mississippi\'s own limits (8 h a day, 44 h a week, no work from 7 p.m. to 6 a.m.) cover factories, mills, canneries and workshops, which are off-limits under 16 anyway.'},o:{}},
'Missouri':{u:{sd:3,sw:40,nd:8,nw:40,days:6,n:N7},o:{}},
'Montana':{u:{...F,n:'No work from 7 p.m. to 7 a.m. (9 p.m. outside the school year, about June 1 through Labor Day).'},o:{}},
'Nebraska':{u:{d:8,w:48,n:'At 14 and 15: no work from 10 p.m. to 6 a.m. (later before a non-school day with a special permit). Under 14: no work from 8 p.m. to 6 a.m.'},o:{}},
'Nevada':{u:{d:8,w:48},o:{}},
'New Hampshire':{u:{sd:3,sw:23,nd:8,nw:48,n:'No work from 9 p.m. to 7 a.m.'},
o:{sw:30,nw:48,days:6,s:'if you\'re in school, up to 30 h in a school week and 48 h in a vacation week',h:'If you\'re in school: up to 30 h in a school week and 48 h in a vacation week, 6 days a week.'}},
'New Jersey':{u:{...F,days:6,n:'No work from 7 p.m. to 7 a.m. (9 p.m. from the last day of school through Labor Day, in weeks without school, with written permission).'},
o:{d:8,w:40,days:6,sw2:50,s:'up to 8 h a day and 40 h a week (10 h a day and 50 h a week from the last day of school through Labor Day)',h:'Up to 8 h a day, 40 h a week and 6 days a week. From the last day of school through Labor Day: up to 10 h a day and 50 h a week.',n:'During the school term: no work from 11 p.m. to 6 a.m. (with some exceptions).'}},
'New Mexico':{u:{...F,n:'No work from 7 p.m. to 7 a.m. (9 p.m. outside the school year).'},o:{}},
'New York':{u:{...F,days:6,n:'No work from 7 p.m. to 7 a.m. (9 p.m. from June 21 through Labor Day).'},
o:{sd:4,sw:28,nd:8,nw:48,days:6,s:'if you\'re in school, up to 4 h before a school day and 28 h in a school week (8 h a day and 48 h a week when school is out)',h:'If you\'re in school: up to 4 h before a school day, 8 h on a Friday, Saturday, Sunday or holiday, and 28 h in a school week. When school is out: up to 8 h a day, 48 h a week and 6 days a week.',
n:'While school is in session: no work from 10 p.m. to 6 a.m. (midnight with written permission from a parent and the school before a school day, or from a parent before a non-school day). When school is out: no work from midnight to 6 a.m.'}},
'North Carolina':{u:{...F,n:'No work from 7 p.m. to 7 a.m. (9 p.m. during summer vacation).'},
o:{n:'While school is in session: no work from 11 p.m. to 5 a.m. before a school day, unless a parent and the school give written permission.'}},
'North Dakota':{u:{...F,n:N7},o:{}},
'Ohio':{u:{...F,n:'No work from 7 p.m. to 7 a.m. (9 p.m. from June 1 to September 1 and during school holidays of 5 school days or more). Door-to-door sales: no work from 7 p.m. to 7 a.m.'},
o:{n:'If you have to attend school: no work after 11 p.m. before a school day, or before 7 a.m. on a school day (6 a.m. if you didn\'t work after 8 p.m. the night before). Door-to-door sales: no work from 8 p.m. to 7 a.m.'}},
'Oklahoma':{u:{...F,n:N7,x:'Employers not covered by federal law have a few extra exceptions.'},o:{}},
'Oregon':{u:{...F,days:6,n:N7},o:{w:44}},
'Pennsylvania':{u:{...F,n:'No work from 7 p.m. to 7 a.m. (9 p.m. during summer vacation, June through Labor Day).',x:'No more than 6 days a week when school is out.'},
o:{sd:8,sw:28,nd:10,nw:48,days:6,n:'If you\'re in school: no work from midnight (1 a.m. before a non-school day) to 6 a.m.'}},
'Rhode Island':{u:{d:8,w:40,n:'No work from 7 p.m. to 6 a.m. (9 p.m. during school vacation).'},
o:{d:9,w:48,n:'If you\'re in school: no work from 11:30 p.m. (1:30 a.m. before a non-school day) to 6 a.m.'}},
'South Carolina':{u:{...F,n:'No work from 7 p.m. to 7 a.m. (9 p.m. during your school district\'s summer break).'},o:{}},
'South Dakota':{u:{sd:4,sw:20,nd:8,nw:40,n:'No work after 10 p.m. before a school day.'},o:{}},
'Tennessee':{u:{...F,n:'No work from 7 p.m. to 7 a.m. (from 9 p.m. to 6 a.m. before a non-school day).'},
o:{n:'Sunday to Thursday before a school day: no work from 10 p.m. to 6 a.m. (midnight up to 3 nights a week with a parent\'s permission).'}},
'Texas':{u:{d:8,w:48,n:'No work from 10 p.m. to 5 a.m. (midnight before a non-school day, or in summer if you\'re not in summer school).'},o:{}},
'Utah':{u:{...F,n:N7},o:{}},
'Vermont':{u:{...F,days:6,n:N7},o:{},factory:{day:9,week:50},extra:['vt431','vt434','vt436','vt437','wh30']},
'Virginia':{u:{...F,n:N7},o:{}},
'Washington':{u:{sd:3,sw:16,nd:8,nw:40,days:6,h:'Up to 3 h on a school day (8 h on Saturday and Sunday) and 16 h in a school week; up to 8 h a day and 40 h a week when school is out; 6 days a week.',
n:'No work from 7 p.m. to 7 a.m. (9 p.m. from June 1 through Labor Day). An adult must supervise you after 8 p.m. in jobs like restaurants and stores.'},
o:{sd:4,sw:20,nd:8,nw:48,days:6,n:'No work from 10 p.m. Sunday to Thursday (midnight on Friday, Saturday and when school is out) to 7 a.m. (5 a.m. when school is out). Door-to-door sales: no work from 9 p.m. to 7 a.m. An adult must supervise you after 8 p.m. in jobs like restaurants and stores.'}},
'West Virginia':{u:{...F,n:'No work from 7 p.m. to 7 a.m. (9 p.m. from June 1 through Labor Day). With a supervision permit you can work until 11 p.m. when school is out.'},o:{}},
'Wisconsin':{u:{...F,days:6,n:N7},o:{}},
'Wyoming':{u:{h:'No more than 8 h in any 12-hour period.',n:'No work from 10 p.m. (midnight before a non-school day, or if you\'re not in school) to 5 a.m.'},o:{}},
};
const num=v=>(typeof v==='number'&&v>0?v:null);
const minOf=(...v)=>{const n=v.filter(x=>x!=null);return n.length?Math.min(...n):null;};
function norm(r){
if(!r)return null;
return{schoolDay:num(r.sd),schoolWeek:num(r.sw),nonSchoolDay:num(r.nd),nonSchoolWeek:num(r.nw),day:num(r.d),week:num(r.w),
combinedDay:num(r.cd),combinedWeek:num(r.cw),summerWeek:num(r.sw2),daysPerWeek:num(r.days),hoursText:r.h||'',short:r.s||'',night:r.n||'',extra:r.x||''};
}
const STATES={};
Object.keys(RAW).forEach(name=>{
const r=RAW[name],u=norm(r.u);
STATES[name]={
reviewed:REVIEWED,table:TABLE_DATE,
own16:u,over16:norm(r.o),over17:r.o17?norm(r.o17):null,factory:r.factory||null,
under16:{
schoolDay:minOf(FED.under16.schoolDay,u.schoolDay),schoolWeek:minOf(FED.under16.schoolWeek,u.schoolWeek),
nonSchoolDay:minOf(FED.under16.nonSchoolDay,u.nonSchoolDay,u.day),nonSchoolWeek:minOf(FED.under16.nonSchoolWeek,u.nonSchoolWeek,u.week),
daysPerWeek:u.daysPerWeek,start:FED.under16.start,end:FED.under16.end,summerEnd:FED.under16.summerEnd,
},
sources:['states'].concat(r.extra||[]),
};
});
const GOAL_OPTIONS=[5,8,10,12,15,20,25,30];
const NO_GOAL=999;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const me=()=>{try{if(typeof currentUser!=='undefined'&&currentUser)return currentUser;}catch(e){}return window.currentUser||null;};
const ABBR={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
const NAMES=Object.values(ABBR);
function stateName(s){
s=String(s||'').trim();if(!s)return'';
if(ABBR[s.toUpperCase()])return ABBR[s.toUpperCase()];
if(/^(washington,? )?d\.?c\.?$/i.test(s))return'District of Columbia';
return NAMES.find(n=>n.toLowerCase()===s.toLowerCase())||'';
}
const stateData=()=>{try{return typeof STATE_DATA!=='undefined'?STATE_DATA:null;}catch(e){return null;}};
function ageOf(u){
if(u&&u.dob){
const d=new Date(/^\d{4}-\d\d-\d\d$/.test(u.dob)?u.dob+'T00:00:00':u.dob),n=new Date();
if(!isNaN(d)){const a=n.getFullYear()-d.getFullYear()-(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate())?1:0);return a>=10&&a<=17?a:null;}
}
const a=Number(u&&u.age);return Number.isInteger(a)&&a>=10&&a<=17?a:null;
}
const h=n=>n+' h';
const cap1=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const the=name=>(name==='District of Columbia'?'D.C.':name);
function hoursWords(r){
if(!r)return'';
if(r.hoursText)return r.hoursText;
const parts=[];
const pair=(a,aw,b,bw)=>[a!=null?h(a)+aw:'',b!=null?h(b)+bw:''].filter(Boolean).join(' and ');
const school=pair(r.schoolDay,' on a school day',r.schoolWeek,' in a school week');
const out=pair(r.nonSchoolDay,' a day',r.nonSchoolWeek,' a week');
const any=pair(r.day,' a day',r.week,' a week');
if(school)parts.push('up to '+school);
if(out)parts.push((school?'':'up to ')+out+' when school is out');
if(any)parts.push('up to '+any);
if(r.daysPerWeek)parts.push(r.daysPerWeek+' days a week at most');
return parts.length?cap1(parts.join('; '))+'.':'';
}
const sameAsFed=u=>u&&u.schoolDay===3&&u.schoolWeek===18&&u.nonSchoolDay===8&&u.nonSchoolWeek===40&& !u.day&& !u.week&& !u.combinedDay&& !u.hoursText;
function permitLine(state,age){
try{
const jt=window.twJobTiers;
if(jt&&typeof jt.permitNeeded==='function'){const p=jt.permitNeeded(state,age);if(p&&p.note)return p.note;}
}catch(e){}
return'';
}
const PERMIT_SENTENCE= /permit|certificate|working papers|get it from|apply through|proof of age|child labor law poster|parental (consent|notification)/i;
function olderNotes(state){
const e=(stateData()||{})[state];if(!e||e.__tw52)return'';
let n=String(e.notes||'');
if(e.permitNote)n=n.split(e.permitNote).join(' ');
return n.replace(/\.\s+/g,'.\u0000').split('\u0000').filter(s=>s&& !PERMIT_SENTENCE.test(s)).join(' ').replace(/\s{2,}/g,' ').trim();
}
function controls(){try{return typeof parentalControls!=='undefined'?parentalControls:null;}catch(e){return null;}}
function goalHours(){
const c=controls();const n=Number(c&&c['max-weekly-hours']);
return n>0&&n<NO_GOAL?n:null;
}
function parentLimit(){
try{const p=typeof window.twParentHourLimit==='function'?window.twParentHourLimit():null;return p&&p.hours>0?p:null;}catch(e){return null;}
}
function setGoal(n){
const c=controls();if(!c)return;
n=Number(n);c['max-weekly-hours']=n>0&&n<NO_GOAL?n:NO_GOAL;
try{if(typeof saveUserData==='function')saveUserData();}catch(e){}
try{if(typeof window.twMoneyRedraw==='function')window.twMoneyRedraw();}catch(e){}
renderWorkLogRules();
try{const b=$('teen-state-rules-banner');if(b)window.twRenderLaborSummary(b);}catch(e){}
}
function forTeen(age,state){
const name=stateName(state);
const out={age,state:name,known: !!(age&&name),verified: !!STATES[name],reviewed:REVIEWED,summary:'',lines:[],permit:'',older:'',sources:[],week:null,day:null};
if(!out.known){
out.summary='Add your age and state to see the work rules that apply to you.';
out.lines.push(['Why','Your age or state is missing from your profile. A search filter does not show where you work. Ask a parent to review each job and your local rules.']);
return out;
}
const S=STATES[name]||null,nm=the(name);
const u16=(S&&S.under16)||FED.under16;
const src=new Set(['cfr','fs43']);
const hoursLine=()=>`Outside school hours only. Up to ${h(u16.schoolDay)} on a school day and ${h(u16.schoolWeek)} in a week when school is in session; up to ${h(u16.nonSchoolDay)} a day and ${h(u16.nonSchoolWeek)} a week when school is out.`+
(u16.daysPerWeek?` No more than ${u16.daysPerWeek} days a week (${nm}).`:'');
const stricterLine=()=>{
if(!S||sameAsFed(S.own16))return;
const own=hoursWords(S.own16);
if(own)out.lines.push([nm+' law',own+' Where federal and '+nm+' limits differ, the lower one is shown above.']);
};
const timeLines=()=>{
out.lines.push(['Time of day','Federal: '+FED_TIME.charAt(0).toLowerCase()+FED_TIME.slice(1)]);
if(S&&S.own16.night&&S.own16.night!==N7)out.lines.push([nm+' time rule',S.own16.night+' Follow whichever rule is stricter.']);
};
const weekOf=(school,outw,why,note)=>(school!=null||outw!=null?{school:school!=null?school:outw,out:outw,why,outNote:note||''}:null);
if(age<14){
out.summary=`Age ${age} · ${name}: most jobs aren't allowed under 14. Check every task with a parent.`;
out.lines.push(['Under 14','Federal law allows most jobs only from 14. It doesn\'t cover casual babysitting, small chores around private homes, delivering newspapers or acting.']);
if(name==='Vermont'){
out.lines.push(['Vermont','Under 14, Vermont allows only jobs its Labor Commissioner has approved, during vacations or before and after school. Working for your own parent (not factory, mining or hazardous work), newspaper delivery and acting are the exceptions.']);
out.lines.push(['Hours','Vermont\'s under-16 hours apply too: '+hoursLine()]);
out.lines.push(['Time of day',FED_TIME]);
out.week=weekOf(u16.schoolWeek,u16.nonSchoolWeek,`Vermont limits everyone under 16 to ${h(u16.schoolWeek)} in a week when school is in session (${h(u16.nonSchoolWeek)} when school is out).`);
out.day={school:u16.schoolDay,out:u16.nonSchoolDay};
}else if(S){
out.lines.push([nm,`Check with ${nm}'s labor office which jobs are allowed under 14. If a job is allowed, ${nm}'s under-16 rules apply: `+(hoursWords(S.own16)||'no extra hour limits.')+(S.own16.night?' '+S.own16.night:'')]);
}
}else if(age<16){
const fedWeek=u16.schoolWeek===FED.under16.schoolWeek;
out.summary=`Age ${age} · ${name}: outside school hours, up to ${h(u16.schoolDay)} on a school day and ${h(u16.schoolWeek)} in a school week.`;
out.lines.push(['Hours',hoursLine()]);
stricterLine();
timeLines();
if(S&&S.own16.extra)out.lines.push(['Also',S.own16.extra]);
out.lines.push(['Job types','Only non-factory, non-hazardous jobs at 14 and 15 (federal law).']);
out.week=weekOf(u16.schoolWeek,u16.nonSchoolWeek,(fedWeek?'Federal law limits':nm+' law limits')+` 14- and 15-year-olds to ${h(u16.schoolWeek)} in a week when school is in session (${h(u16.nonSchoolWeek)} when school is out).`);
out.day={school:u16.schoolDay,out:u16.nonSchoolDay};
}else{
const o=S?((age>=17&&S.over17)||S.over16):null;
const words=o?hoursWords(o):'';
const ageWords=age>=17&&S&&S.over17?'17-year-olds':'16- and 17-year-olds';
if(!S){
out.summary=`Age ${age} · ${name}: no federal hour limits at ${age}. ${name}'s own limits may be stricter. Hazardous jobs stay off-limits until 18.`;
}else if(words){
const short=o.short||words.charAt(0).toLowerCase()+words.slice(1,-1);
out.summary=`Age ${age} · ${name}: ${short}. Hazardous jobs stay off-limits until 18.`;
}else if(o.night){
out.summary=`Age ${age} · ${name}: no hour limits for most jobs at ${age}, but ${nm} limits late-night work. Hazardous jobs stay off-limits until 18.`;
}else{
out.summary=`Age ${age} · ${name}: no hour limits for most jobs at ${age} under federal or ${nm} law. Hazardous jobs stay off-limits until 18.`;
}
out.lines.push(['Hours','Federal law sets no hour or time-of-day limits at 16 and 17.'+(S?(words?` ${nm} law: ${words}`:` ${nm}'s child labor law adds none for most jobs.`):'')]);
if(o&&o.night)out.lines.push(['Time of day',o.night]);
if(o&&o.extra)out.lines.push(['Also',o.extra]);
if(S&&S.factory)out.lines.push(['Factory work',`In manufacturing or mechanical work, ${nm} allows at most ${h(S.factory.day)} a day and ${h(S.factory.week)} a week at 16 and 17.`]);
if(o){
const school=o.schoolWeek!=null?o.schoolWeek:o.week,outw=o.nonSchoolWeek!=null?o.nonSchoolWeek:o.week;
const outNote=o.summerWeek?h(o.summerWeek)+' from the last day of school through Labor Day':'';
out.week=weekOf(school,outw,`${nm} law limits ${ageWords} to `+(school!=null&&school!==outw?`${h(school)} in a week when school is in session`+(outw!=null?` (${h(outw)} when school is out)`:''):`${h(school!=null?school:outw)} a week`)+(outNote?` and ${outNote}`:'')+'.',outNote);
const sd=o.schoolDay!=null?o.schoolDay:o.day,od=o.nonSchoolDay!=null?o.nonSchoolDay:o.day;
if(sd!=null||od!=null)out.day={school:sd!=null?sd:od,out:od};
}
}
if(age>=14)out.lines.push(['Off-limits until 18','Jobs federal law calls hazardous, such as driving for work, power saws, roofing, demolition and many power-driven machines.']);
out.permit=permitLine(name,age);
if(out.permit){out.lines.push(['Work permit',out.permit]);src.add('certs');}
if(S)S.sources.forEach(k=>src.add(k));
else{out.older=olderNotes(name);}
out.sources=[...src].map(k=>SRC[k]).filter(Boolean);
return out;
}
function current(){const u=me();return forTeen(ageOf(u),u&&u.state);}
function weekTarget(){
const r=current(),goal=goalHours(),par=parentLimit();
const legal=r.week?r.week.school:null;
const c=[];
if(legal!=null)c.push({hours:legal,kind:'legal',name:'legal limit for a school week',short:'school-week limit',label:'Legal school-week limit',
reached:'School-week limit reached',of:'the '+h(legal)+' legal limit for a school week',why:r.week.why});
if(par){
const who=String(par.name||'Your parent').trim().split(/\s+/)[0]||'Your parent';
c.push({hours:par.hours,kind:'parent',by:who,name:'parent\'s weekly limit',short:'parent\'s weekly limit',label:'Weekly limit set by '+who+' (not a law)',
reached:'Your parent\'s weekly limit reached',of:'the '+h(par.hours)+' weekly limit '+who+' set',
why:who+' set a '+par.hours+'-hour weekly limit for you from their parent account. It\'s a family rule, not a law. Talk to them if you\'d like it changed.'});
}
if(goal!=null)c.push({hours:goal,kind:'goal',name:'weekly goal',short:'weekly goal',label:'Weekly goal (not a law)',reached:'Weekly goal reached',
of:'your '+h(goal)+' weekly goal',why:'This is your own weekly goal, not a law. If your family agrees, you can change it in Work Log under "Work rules for your age".'});
if(!c.length)return null;
return c.reduce((a,b)=>(b.hours<a.hours?b:a));
}
window.twWeeklyHourLimit=function(){const t=weekTarget();return t?t.hours:0;};
function weekStatusHTML(worked){
const r=current(),w=Math.round((Number(worked)||0)*10)/10;
const at=`You're at ${esc(h(w))} this week`;
if(!r.known)return`<span>${at}. Add your age and state to your profile to compare it with the law.</span>`;
if(!r.week&&r.age<14)return`<span style="color:var(--amber)">${at}. Most jobs aren't allowed under 14, so check each task with a parent.</span>`;
if(!r.week)return`<span style="color:var(--green)">${at}. No legal weekly hour limit applies at ${esc(r.age)}${r.verified?' in '+esc(the(r.state)):' under federal law'} for most jobs.</span>`;
const wk=r.week,note=wk.outNote?` (${esc(wk.outNote)})`:'';
if(wk.out!=null&&wk.out>=wk.school&&w>wk.out&& !wk.outNote)return`<span style="color:var(--red)">⚠️ ${at}, over ${esc(h(wk.out))}: the legal limit even in a week without school.</span>`;
if(w>wk.school)return`<span style="color:var(--red)">⚠️ ${at}, over ${esc(h(wk.school))}: the legal limit for a week when school is in session`+(wk.out!=null&&wk.out!==wk.school?` (${esc(h(wk.out))} when school is out${note?', '+esc(wk.outNote):''})`:note)+'.</span>';
if(w>=wk.school*0.8)return`<span style="color:var(--amber)">${at}, close to the ${esc(h(wk.school))} school-week limit.</span>`;
return`<span style="color:var(--green)">${at}, within the ${esc(h(wk.school))} school-week limit ✓</span>`;
}
function weekWords(wk){
const note=wk.outNote?' ('+wk.outNote+')':'';
if(wk.out==null)return`${h(wk.school)} in a week when school is in session; no limit when school is out.`;
if(wk.out!==wk.school)return`${h(wk.school)} in a week when school is in session, ${h(wk.out)} when school is out${note}.`;
return`${h(wk.school)} a week${note}.`;
}
function goalNote(){
const g=goalHours(),p=parentLimit();
const goal=g?`Your weekly goal is ${h(g)}: a personal target you can change in Work Log, not a law.`:'You have no weekly hours goal set. You can add one in Work Log.';
return p?goal+` ${String(p.name||'Your parent').split(/\s+/)[0]} also set a weekly limit of ${h(p.hours)} for you: a family rule, not a law.`:goal;
}
function sourcesHTML(r){
const links=r.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(', ');
return`<p class="tw52-src">Checked against ${links} on ${REVIEWED_TEXT}. Laws change, so your <a href="${esc(SRC.offices.url)}" target="_blank" rel="noopener">state's labor office</a> has the latest rules. General guidance, not legal advice or a ruling that a job is legal. School enrollment, job duties and exceptions can change what applies.</p>`;
}
function linesHTML(r){
let s='<dl class="tw52-rules">'+r.lines.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')+'</dl>';
if(r.known&& !r.verified){
s+=`<p class="tw52-unverified"><strong>${esc(r.state)} rules not re-checked yet.</strong> The rules above are federal. ${esc(r.state)} may be stricter; check with its labor department.`+
(r.older?` Older TeenWork notes (not re-checked): ${esc(r.older)}`:'')+'</p>';
}
return s;
}
window.twRenderLaborSummary=function(banner){
if(!banner)return;
const r=current();
const html='<strong>'+esc(r.summary)+'</strong><details class="tw-law-details"><summary>Full work guidance and limits</summary>'+
linesHTML(r)+(r.known?'<p class="tw52-goal">'+esc(goalNote())+'</p>'+sourcesHTML(r):'')+'</details>';
if(banner._twHtml!==html|| !banner.querySelector('.tw-law-details')){
const open= !!banner.querySelector('.tw-law-details[open]');
banner.innerHTML=html;banner._twHtml=html;
if(open)banner.querySelector('.tw-law-details').open=true;
}
if(!banner.classList.contains('show'))banner.classList.add('show');
};
function renderWorkLogRules(){
const box=$('tw52-wl-rules-text');if(!box)return;
const r=current(),g=goalHours(),p=parentLimit();
const opts=[`<option value="${NO_GOAL}"${g==null?' selected':''}>No goal</option>`]
.concat(GOAL_OPTIONS.concat(g&&GOAL_OPTIONS.indexOf(g)<0?[g]:[]).sort((a,b)=>a-b).map(n=>`<option value="${n}"${n===g?' selected':''}>${n} h a week</option>`)).join('');
const where=r.verified?' in '+the(r.state):' under federal law ('+r.state+' may be stricter)';
const legalWeek= !r.known?'Add your age and state to your profile to see your legal limits.'
:r.week?weekWords(r.week)
:`None for most jobs at ${r.age}${where}.`;
const who=p?String(p.name||'Your parent').trim().split(/\s+/)[0]:'';
const parentRow=p?`<div class="tw52-wl-row"><span class="tw52-k">Parent's limit</span><span>${esc(h(p.hours))} a week, set by ${esc(who)}. <small>A family rule, not a law. Only ${esc(who)} can change it.</small></span></div>`:'';
const goalHelp=p&&(g==null||p.hours<g)?`A personal target, not a law. ${esc(who)}'s ${esc(h(p.hours))} limit is lower, so it's the one that counts.`:'A personal target, not a law.';
const html=`<p class="tw52-wl-sum"><strong>${esc(r.summary)}</strong></p>`+
`<div class="tw52-wl-row"><span class="tw52-k">Legal weekly limit</span><span>${esc(legalWeek)}</span></div>`+parentRow+
`<div class="tw52-wl-row"><label class="tw52-k" for="tw52-goal">Your weekly goal</label><span><select id="tw52-goal" aria-describedby="tw52-goal-help">${opts}</select> <small id="tw52-goal-help">${goalHelp}</small></span></div>`+
`<details class="tw-law-details"><summary>All rules for your age</summary>${linesHTML(r)}${r.known?sourcesHTML(r):''}</details>`;
if(box._twHtml!==html){
const open= !!box.querySelector('.tw-law-details[open]');
box.innerHTML=html;box._twHtml=html;
if(open)box.querySelector('.tw-law-details').open=true;
const sel=$('tw52-goal');if(sel)sel.onchange=()=>setGoal(sel.value);
}
}
function wrapVerifyCheck(){
let V;try{V=typeof TW_Verify!=='undefined'?TW_Verify:null;}catch(e){V=null;}
if(!V||typeof V.runComplianceCheck!=='function'||V.runComplianceCheck.__tw52)return;
const o=V.runComplianceCheck;
const w=function(){
const p=o.apply(this,arguments);
try{
const age=parseInt(($('tw-ver-age')||{}).value,10)||null,st=($('tw-ver-state')||{}).value||'';
const jtype=($('tw-ver-job-type-check')||{}).value||'';
const r=forTeen(age,st),grid=$('tw-ver-law-grid');
const hazardous= /manufactur|construction/i.test(jtype);
if(grid&&r.known&& !/farm/i.test(jtype)){
const rows=[
['Minimum age',age<14?'Most jobs start at 14':'Age '+age+' can work',age>=14],
['School-day hours',r.day?'Up to '+h(r.day.school)+' a day':'No legal limit for most jobs',true],
['Weekly hours',r.week?(r.week.out==null?h(r.week.school)+' school week · no limit otherwise':r.week.out!==r.week.school?h(r.week.school)+' school week · '+h(r.week.out)+' otherwise':h(r.week.school)+' a week'):'No legal limit for most jobs',true],
['Work permit',r.permit||'Check your state',true],
['Job type',hazardous?'Blocked on TeenWork (hazardous work)':(age<14?'Check with a parent':'Allowed for age '+age),!hazardous&&age>=14],
['Checked',(r.verified?'Federal + '+the(r.state):'Federal only ('+r.state+' not re-checked)')+' · '+REVIEWED_TEXT,r.verified],
];
grid.innerHTML=rows.map(([k,v,ok])=>`<div class="tw-ver-law-pill ${ok?'ok':'warn'}"><div class="tw-ver-pill-label">${esc(k)}</div><div class="tw-ver-pill-val">${esc(v)}</div></div>`).join('');
}
}catch(e){console.warn('work-rules-v52: verify grid',e);}
return p;
};
w.__tw52=true;V.runComplianceCheck=w;
}
function stateNotes(name){
const S=STATES[name],u=S.under16,nm=the(name),o=S.over16;
const own=sameAsFed(S.own16)?'':' '+nm+' law: '+hoursWords(S.own16);
let s=`Under 16: outside school hours, max ${u.schoolDay}h on a school day, ${u.schoolWeek}h in a school week, ${u.nonSchoolDay}h a day and ${u.nonSchoolWeek}h a week when school is out`+
(u.daysPerWeek?`, ${u.daysPerWeek} days a week`:'')+`, ${u.start}–${u.end} (${u.summerEnd} June 1–Labor Day; the stricter of federal and ${nm} rules).`+own+
(S.own16.night&&S.own16.night!==N7?' '+S.own16.night:'');
const ow=hoursWords(o);
s+=' Ages 16–17: '+(ow||'no hour limits for most jobs.')+(o.night?' '+o.night:'');
if(S.over17)s+=' At 17: '+(hoursWords(S.over17)||'')+(S.over17.night?' '+S.over17.night:(hoursWords(S.over17)?'':'no extra limits.'));
if(S.factory)s+=` Factory or mechanical work at 16–17: ${S.factory.day}h a day, ${S.factory.week}h a week.`;
return s.replace(/\s{2,}/g,' ').trim();
}
function fixStateData(){
const D=stateData();if(!D)return;
Object.keys(STATES).forEach(name=>{
const e=D[name];if(!e||e.__tw52)return;
const u=STATES[name].under16;
e.schoolDayMax=u.schoolDay;e.schoolWeekMax=u.schoolWeek;e.summerMax=u.nonSchoolWeek;e.nightCurfew='7pm';
e.notes=(stateNotes(name)+' '+(e.permitNote||'')).trim();
e.rulesSource=SRC.states.label;e.rulesReviewed=REVIEWED;
e.__tw52=true;
});
}
function boot(){
try{fixStateData();}catch(e){}
try{wrapVerifyCheck();}catch(e){}
try{renderWorkLogRules();}catch(e){}
}
boot();
document.addEventListener('DOMContentLoaded',boot);
window.addEventListener('load',()=>{boot();setTimeout(boot,1500);});
window.twWorkRules={REVIEWED,TABLE_DATE,SOURCES:SRC,FED,STATES,forTeen,current,weekTarget,weekStatusHTML,goalHours,parentLimit,setGoal,renderWorkLogRules,stateName,stateNotes,hoursWords,NO_GOAL};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/parent-hours-v52.js */
try{
(function(){
'use strict';
if(window.__twParentHours52)return;
window.__twParentHours52=true;
const OPTIONS=[5,8,10,12,15,20,25,30];
const NONE=999;
const ROLES=['teen','parent','employer'];
const $=id=>document.getElementById(id);
const me=()=>{try{if(typeof currentUser!=='undefined'&&currentUser)return currentUser;}catch(e){}return window.currentUser||null;};
const isReal=u=> !!(u&& !u.isDemo&& !u.isAdmin&&ROLES.includes(u.type)&& /@/.test(String(u.email||''))&& !/\.demo$/i.test(String(u.email||'')));
const as=type=>{const u=me();return u&& !u.isAdmin&&u.type===type?u:null;};
const emailOf=u=>String((u&&u.email)||'').trim().toLowerCase();
const rowKeyOf=u=>(u?String(u.dataKey||u.email||''):'');
const baseEmail=k=>String(k||'').trim().toLowerCase().replace(/#\d+$/,'');
const firstName=n=>String(n||'').trim().split(/\s+/)[0]||'';
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}};
const readJSON=(k,d)=>{try{const v=JSON.parse(lsGet(k));return v==null?d:v;}catch(e){return d;}};
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch(e){return null;}};
const toast=(m,t)=>{try{showToast(m,t||'success');}catch(e){}};
const later=(fn,ms)=>setTimeout(()=>{try{const r=fn();if(r&&r.catch)r.catch(e=>console.warn('parent-hours:',e));}catch(e){console.warn('parent-hours:',e);}},ms||0);
const validHours=n=>{n=Number(n);return n>0&&n<NONE?Math.round(n):null;};
async function client(){
try{if(typeof _twCloudClient==='function')return await _twCloudClient(3000);}catch(e){}
try{return(typeof sbClient!=='undefined'&&sbClient)||null;}catch(e){return null;}
}
async function rows(build){
const c=await client();if(!c)return null;
try{const r=await build(c.from('user_data').select('email,key,value'));return r&& !r.error?(r.data||[]):null;}catch(e){return null;}
}
async function put(email,key,value){
if(!email)return false;
const c=await client();if(!c)return false;
try{
const r=await c.from('user_data').upsert({email,key,value:JSON.stringify(value),updated_at:new Date().toISOString()},{onConflict:'email,key'});
return!(r&&r.error);
}catch(e){return false;}
}
function linkParents(link){
if(!link||link.status!=='approved')return[];
return[...new Set((link.parents||[]).concat(link.parentEmail?[link.parentEmail]:[]).map(baseEmail).filter(Boolean))];
}
const redrawTeen=()=>{
try{if(window.twWorkRules)window.twWorkRules.renderWorkLogRules();}catch(e){}
try{if(typeof window.twMoneyRedraw==='function')window.twMoneyRedraw();}catch(e){}
try{const b=$('teen-state-rules-banner');if(b&&typeof window.twRenderLaborSummary==='function')window.twRenderLaborSummary(b);}catch(e){}
try{if(typeof renderCalEarningsBar==='function'&&$('cal-grid'))renderCalEarningsBar();}catch(e){}
};
const choiceKey=u=>'tw52ph_choice_'+rowKeyOf(u).toLowerCase();
let pOwner='',pChoice=undefined,pFetchedAt=0,pBusy=false;
function parentTeens(u){
if(!u||u.type!=='parent')return[];
try{return((window._twRealData&&window._twRealData.linkedTeens())||[]).filter(t=>t&&t.key&& !t.pending);}catch(e){return[];}
}
function loadChoice(u){
if(pOwner!==rowKeyOf(u)){pOwner=rowKeyOf(u);pChoice=undefined;pFetchedAt=0;}
if(pChoice===undefined){const c=readJSON(choiceKey(u),null);if(c&&'hours'in c)pChoice={hours:validHours(c.hours),at:c.at||''};}
return pChoice;
}
function remember(u,choice){pChoice=choice;lsSet(choiceKey(u),JSON.stringify(choice));}
const recFor=(u,t,choice)=>({v:1,status:choice.hours?'set':'off',hours:choice.hours||null,teenKey:t.key,teenEmail:t.email||t.key,teenName:t.name||'',
parentKey:rowKeyOf(u),parentEmail:emailOf(u),parentName:u.name||'',at:choice.at});
async function pushAll(u,choice,existing){
const teens=parentTeens(u);let failed=0;
for(const t of teens){
const have=existing?existing[t.key]:null;
if(have&&have.at===choice.at&&(have.hours||null)===(choice.hours||null))continue;
if(!have&& !choice.hours)continue;
if(!(await put(rowKeyOf(u),'hour_limit:'+t.key,recFor(u,t,choice))))failed++;
}
return{ok: !failed,failed,teens};
}
async function refreshParent(force){
const u=as('parent');if(!isReal(u)||pBusy)return;
loadChoice(u);
if(!force&&Date.now()-pFetchedAt<60000)return;
pBusy=true;pFetchedAt=Date.now();
try{
const got=await rows(q=>q.eq('email',rowKeyOf(u)).like('key','hour_limit:%'));
if(!got||me()!==u)return;
const existing={};let newest=null;
got.forEach(r=>{
const v=parse(r.value);if(!v||r.key!=='hour_limit:'+v.teenKey)return;
existing[v.teenKey]=v;
if(!newest||String(v.at||'')>String(newest.at||''))newest=v;
});
if(newest&&(!pChoice||String(newest.at||'')>String(pChoice.at||'')))remember(u,{hours:validHours(newest.hours),at:newest.at||''});
drawParent();
if(pChoice)await pushAll(u,pChoice,existing);
}finally{pBusy=false;}
}
async function choose(value){
const u=as('parent');if(!u)return;
const choice={hours:validHours(value),at:new Date().toISOString()};
try{if(typeof parentalControls!=='undefined'){parentalControls['max-weekly-hours']=choice.hours||NONE;if(typeof saveUserData==='function')saveUserData();}}catch(e){}
remember(u,choice);drawParent();
if(!isReal(u)){toast(choice.hours?'Weekly limit set to '+choice.hours+' h.':'Weekly limit turned off.');return;}
const teens=parentTeens(u);
if(!teens.length){toast((choice.hours?'Saved: '+choice.hours+' h a week.':'Saved: no weekly limit.')+' It will apply once you link a teen under My Teens.','info');return;}
const res=await pushAll(u,choice,null);
const who=teens.length===1?(firstName(teens[0].name)||'your teen'):'your teens';
if(!res.ok){toast('The limit couldn\'t reach '+who+'\'s account. Check your connection and try again.','error');return;}
toast(choice.hours?'Weekly limit set to '+choice.hours+' h for '+who+'. They\'ll see it in Work Log.':'Weekly limit turned off for '+who+'. State law still applies.','success');
}
window.twParentSetHourLimit=choose;
function drawParent(){
const u=as('parent'),sel=$('ctrl-max-hours');if(!u|| !sel)return;
const c=loadChoice(u),cur=c&&c.hours?c.hours:NONE;
const opts=[NONE].concat(OPTIONS,cur!==NONE&&OPTIONS.indexOf(cur)<0?[cur]:[]).sort((a,b)=>a===NONE? -1:b===NONE?1:a-b);
const sig=opts.join(',');
if(sel.dataset.tw52!==sig){
sel.innerHTML=opts.map(n=>`<option value="${n}">${n===NONE?'No limit (state law only)':n+' h a week'}</option>`).join('');
sel.dataset.tw52=sig;
}
if(String(sel.value)!==String(cur))sel.value=String(cur);
if(!sel.__tw52){
sel.removeAttribute('onchange');
sel.onchange=()=>{choose(sel.value);};
sel.setAttribute('aria-label','Weekly hour limit for your linked teens');
sel.style.fontSize='';sel.classList.add('tw52-ph-select');
sel.__tw52=true;
}
const box=sel.parentElement,help=box&&box.querySelector('div > div:nth-child(2)');
const text='Applies to your linked teens. They see it in Work Log and can\'t change it. If the law allows fewer hours, the law wins.';
if(help&&help.textContent!==text)help.textContent=text;
}
let tState={key:'',by:null,checkedAt:0};
let tBusy=false;
const teenLink=u=>(readJSON('tw_parent_links',{})||{})[emailOf(u)]||u.parentLinked||null;
const lastKey=u=>'tw52ph_last_'+rowKeyOf(u).toLowerCase();
const seenKey=u=>'tw52ph_seen_'+rowKeyOf(u).toLowerCase();
function resetTeen(u){
if(tState.key===rowKeyOf(u))return;
tState={key:rowKeyOf(u),by:null,checkedAt:0};
const last=readJSON(lastKey(u),null);
if(last&&validHours(last.hours)&&linkParents(teenLink(u)).includes(baseEmail(last.email)))tState.by=last;
}
function setTeen(u,by){
const before=JSON.stringify(tState.by||null);
tState.by=by;
lsSet(lastKey(u),by?JSON.stringify(by):null);
const seen=lsGet(seenKey(u)),now=by?String(by.hours):'none';
if(seen!==null&&seen!==now){
if(by)toast('⏰ '+(firstName(by.name)||'Your parent')+' set a weekly limit of '+by.hours+' h for you. You\'ll see it in Work Log.','info');
else toast('Your parent turned off your weekly hour limit. The law and your own goal still apply.','info');
}
lsSet(seenKey(u),now);
if(JSON.stringify(by||null)!==before)redrawTeen();
}
async function checkTeen(){
const u=as('teen');if(!isReal(u)||tBusy)return;
resetTeen(u);
const parents=linkParents(teenLink(u));
tState.checkedAt=Date.now();
if(!parents.length){setTeen(u,null);return;}
tBusy=true;
try{
const mine=rowKeyOf(u);
const got=await rows(q=>q.eq('key','hour_limit:'+mine));
if(!got||me()!==u)return;
const set=got.map(r=>({r,v:parse(r.value)}))
.filter(x=>x.v&&x.v.status==='set'&&validHours(x.v.hours)&&x.v.teenKey===mine&&parents.includes(baseEmail(x.r.email))&&baseEmail(x.v.parentEmail)===baseEmail(x.r.email))
.sort((a,b)=>a.v.hours-b.v.hours);
const best=set[0]?{hours:validHours(set[0].v.hours),name:set[0].v.parentName||set[0].v.parentEmail,email:set[0].v.parentEmail,at:set[0].v.at||''}:null;
setTeen(u,best);
}finally{tBusy=false;}
}
window.twParentHourLimit=function(){
const u=as('teen');if(!isReal(u))return null;
resetTeen(u);
return tState.by&&validHours(tState.by.hours)?Object.assign({},tState.by):null;
};
const _oLaunch=window.launchDashboard;
if(typeof _oLaunch==='function')window.launchDashboard=function(){
const r=_oLaunch.apply(this,arguments);
[300,2500].forEach(ms=>later(()=>{
const u=me();if(!u)return;
if(u.type==='teen')return checkTeen();
if(u.type==='parent'){drawParent();return refreshParent(true);}
},ms));
return r;
};
document.addEventListener('visibilitychange',()=>{
if(document.hidden)return;
const u=me();if(!isReal(u))return;
if(u.type==='teen')later(checkTeen,0);else if(u.type==='parent')later(()=>refreshParent(true),0);
});
setInterval(()=>{
try{
const u=me();if(!u)return;
if(u.type==='parent'){drawParent();if(isReal(u))later(()=>refreshParent(false),0);}
if(isReal(u)&&u.type==='teen'&& !document.hidden&& !tBusy&&(tState.key!==rowKeyOf(u)||Date.now()-tState.checkedAt>120000))later(checkTeen,0);
}catch(e){}
},1500);
window._twParentHours={checkTeen,refreshParent:()=>refreshParent(true),drawParent,choose,teenLimit:()=>window.twParentHourLimit(),OPTIONS};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/practice-v52.js */
try{
(function(){
'use strict';
if(window.__twPractice52)return;
window.__twPractice52=true;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const demoActive=()=>{try{return!!(window._twDemoSandbox&&window._twDemoSandbox.active);}catch(e){return false;}};
const ROLE_NAMES={teen:'Teen',parent:'Parent',employer:'Employer'};
const ssGet=k=>{try{return sessionStorage.getItem(k);}catch(e){return null;}};
const ssSet=(k,v)=>{try{sessionStorage.setItem(k,v);}catch(e){}};
const SAMPLE={
teen:{name:'Sam',age:15,town:'Burlington, VT',state:'Vermont'},
parent:{name:'Jordan'},
employer:{name:'Sample Garden Co.'},
job:{title:'Water garden plants',type:'Yard work',pay:'$15 an hour',town:'Burlington, VT',when:'Saturdays, 9–10:30 a.m.',hoursWeek:1.5,minAge:14,landmark:'near a public library (sample)',desc:'Water raised garden beds with a watering can and pull a few weeds. No tools or machines.'},
};
const STEPS=[
{k:'applied',label:'Teen applies'},
{k:'approved',label:'Parent approves'},
{k:'review',label:'Employer reviews'},
{k:'hired',label:'Hired'},
];
let S=null;
let opener=null;
const fresh=view=>({stage:'browse',view:view||'teen'});
function rulesCheck(){
const R=window.twWorkRules,t=SAMPLE.teen,j=SAMPLE.job;
if(!R)return{ok:true,text:`${j.hoursWeek} h a week on Saturday mornings.`,permit:''};
const r=R.forTeen(t.age,t.state);
const okWeek= !r.week||j.hoursWeek<=r.week.school;
return{
ok:okWeek,
text:r.week?`${j.hoursWeek} h a week on Saturday mornings fits the ${r.week.school} h school-week limit and the 7 a.m.–7 p.m. window for age ${t.age} in ${t.state}.`:`${j.hoursWeek} h a week.`,
permit:r.permit||'',
};
}
const pill=(txt,kind)=>`<span class="tw52-pill tw52-pill-${kind}">${esc(txt)}</span>`;
function jobFacts(){
const j=SAMPLE.job;
return`<dl class="tw52-facts"><dt>Pay</dt><dd>${esc(j.pay)}</dd><dt>Where</dt><dd>${esc(j.town)}, ${esc(j.landmark)}</dd><dt>When</dt><dd>${esc(j.when)}</dd><dt>Ages</dt><dd>${esc(j.minAge)}+ · 👪 parent OK (Tier 2)</dd></dl>`;
}
function rulesBox(){
const c=rulesCheck();
return`<div class="tw52-rulecheck"><strong>⚖️ Work rules check:</strong> ${esc(c.text)}${c.permit?' '+esc(c.permit):''}</div>`;
}
function nextHint(text,role,label){
return`<div class="tw52-next"><span>${esc(text)}</span>${role?`<button type="button" class="tw52-btn tw52-btn-soft" data-view="${role}">${esc(label)} →</button>`:''}</div>`;
}
function teenView(){
const st=S.stage,j=SAMPLE.job;
const status={browse:'',applied:pill('Waiting for your parent’s OK','wait'),approved:pill('With the employer','info'),denied:pill('Your parent said no','no'),hired:pill('Hired ✓','ok'),passed:pill('Not chosen','no')}[st];
let body=`<p class="tw52-who">You are <b>${esc(SAMPLE.teen.name)}</b>, ${SAMPLE.teen.age}, in ${esc(SAMPLE.teen.town)}. This is the Find Jobs card ${esc(SAMPLE.teen.name)} sees.</p>
      <article class="tw52-card"><div class="tw52-card-top"><h4>${esc(j.title)} <span class="tw52-tag">Sample</span></h4>${status}</div>
      <div class="tw52-sub">${esc(SAMPLE.employer.name)} · ${esc(j.type)}</div><p class="tw52-desc">${esc(j.desc)}</p>${jobFacts()}${rulesBox()}`;
if(st==='browse')body+=`<div class="tw52-actions"><button type="button" class="tw52-btn" data-act="apply">Apply (needs parent OK)</button></div></article>`+nextHint('Applying sends the application to Sam’s parent first, not the employer.');
else if(st==='applied')body+=`</article>`+nextHint('Next, Sam’s parent decides.','parent','Show the parent’s view');
else if(st==='approved')body+=`</article>`+nextHint('The parent said yes, so the employer can see it now.','employer','Show the employer’s view');
else if(st==='hired')body+=`</article>`+nextHint('Next, Sam and the employer plan the first shift in TeenWork’s chat. Pay is between them.');
else body+=`</article>`+nextHint('That’s the end of this path. Start over to try the other choice.');
return body;
}
function parentView(){
const st=S.stage,j=SAMPLE.job;
let body=`<p class="tw52-who">You are <b>${esc(SAMPLE.parent.name)}</b>, ${esc(SAMPLE.teen.name)}’s linked parent. This is the Approvals screen.</p>`;
if(st==='browse')return body+`<div class="tw52-empty">✅ Nothing waiting. When ${esc(SAMPLE.teen.name)} applies, it shows up here for your OK.</div>`+nextHint('Start on the teen’s view and press Apply.','teen','Show the teen’s view');
const status={applied:pill('Waiting for your OK','wait'),approved:pill('With the employer','info'),denied:pill('You said no','no'),hired:pill('Hired ✓','ok'),passed:pill('Not chosen','no')}[st];
body+=`<article class="tw52-card"><div class="tw52-card-top"><h4>${esc(SAMPLE.teen.name)} applied: ${esc(j.title)} <span class="tw52-tag">Sample</span></h4>${status}</div>
      <div class="tw52-sub">${esc(SAMPLE.employer.name)} · ${esc(j.type)}</div><p class="tw52-desc">${esc(j.desc)}</p>${jobFacts()}${rulesBox()}`;
if(st==='applied')body+=`<div class="tw52-actions"><button type="button" class="tw52-btn" data-act="approve">Approve</button><button type="button" class="tw52-btn tw52-btn-soft" data-act="deny">Say no</button></div></article>`+nextHint('The employer sees nothing until you approve.');
else if(st==='approved')body+=`</article>`+nextHint('You approved it. It’s with the employer now.','employer','Show the employer’s view');
else if(st==='denied')body+=`</article>`+nextHint('You said no, so the employer never sees this application.');
else body+=`</article>`;
return body;
}
function employerView(){
const st=S.stage,j=SAMPLE.job,t=SAMPLE.teen;
let body=`<p class="tw52-who">You are <b>${esc(SAMPLE.employer.name)}</b>, who posted this job. This is the Applicants screen.</p>
      <div class="tw52-posted">📋 Active job: <b>${esc(j.title)}</b> <span class="tw52-tag">Sample</span> · ${esc(j.pay)} · ${esc(j.town)}</div>`;
if(st==='browse'||st==='applied'||st==='denied'){
const why=st==='applied'?`${t.name} applied, but a parent hasn’t approved it yet, so it isn’t shown to you.`:st==='denied'?`${t.name}’s parent said no, so the application never reaches you.`:'No applicants yet.';
return body+`<div class="tw52-empty">👥 ${esc(why)} Applications reach employers only after a parent approves.</div>`+(st==='applied'?nextHint('Waiting on the parent.','parent','Show the parent’s view'):st==='browse'?nextHint('Start on the teen’s view and press Apply.','teen','Show the teen’s view'):'');
}
const status={approved:pill('Parent approved ✓','ok'),hired:pill('Hired ✓','ok'),passed:pill('Not chosen','no')}[st];
body+=`<article class="tw52-card"><div class="tw52-card-top"><h4>${esc(t.name)}, ${t.age} <span class="tw52-tag">Sample</span></h4>${status}</div>
      <div class="tw52-sub">Applied to ${esc(j.title)} · ${esc(t.town)}</div>${rulesBox()}`;
if(st==='approved')body+=`<div class="tw52-actions"><button type="button" class="tw52-btn" data-act="hire">Hire</button><button type="button" class="tw52-btn tw52-btn-soft" data-act="pass">Pass</button></div></article>`+nextHint('Profile details are self-reported. TeenWork does not run background checks.');
else if(st==='hired')body+=`</article>`+nextHint(`You hired ${t.name}. Both of you would plan the first shift in TeenWork’s chat.`,'teen','See it from the teen’s side');
else body+=`</article>`+nextHint('You passed. The teen sees “Not chosen”.','teen','See it from the teen’s side');
return body;
}
function stepState(i){
const st=S.stage;
const reached={browse:0,applied:1,approved:2,denied:1,hired:4,passed:3}[st];
if(i<reached)return(st==='denied'&&i===1)||(st==='passed'&&i===3)?'no':'done';
if(i===reached&&st!=='hired')return st==='denied'&&i===1?'no':'now';
return'';
}
function render(){
const box=$('tw52-sample');if(!box|| !S)return;
const tabs=['teen','parent','employer'].map(r=>`<button type="button" role="tab" class="tw52-tab" id="tw52-tab-${r}" aria-selected="${S.view===r}" aria-controls="tw52-view" data-view="${r}">${{teen:'🧑‍💼',parent:'👪',employer:'🏢'}[r]} ${ROLE_NAMES[r]}</button>`).join('');
const steps=STEPS.map((s,i)=>`<li class="tw52-step ${stepState(i)}"><b>${i+1}</b> ${esc(s.label)}</li>`).join('');
const view=S.view==='parent'?parentView():S.view==='employer'?employerView():teenView();
box.querySelector('.tw52-steps').innerHTML=steps;
box.querySelector('.tw52-tabs').innerHTML=tabs;
box.querySelector('#tw52-view').innerHTML=view;
box.querySelector('#tw52-view').setAttribute('aria-labelledby','tw52-tab-'+S.view);
}
function act(a){
const go={apply:['browse','applied'],approve:['applied','approved'],deny:['applied','denied'],hire:['approved','hired'],pass:['approved','passed']}[a];
if(!go||S.stage!==go[0])return;
S.stage=go[1];
render();
const live=$('tw52-sample-live');
if(live)live.textContent={apply:'Sample: Sam applied. It now waits for the parent.',approve:'Sample: the parent approved. The employer can see it now.',deny:'Sample: the parent said no.',hire:'Sample: the employer hired Sam.',pass:'Sample: the employer passed.'}[a];
const next=$('tw52-view').querySelector('.tw52-next button, .tw52-actions button');
if(next)try{next.focus({preventScroll:false});}catch(e){}
}
function build(){
if($('tw52-sample'))return $('tw52-sample');
const m=document.createElement('div');
m.id='tw52-sample';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','tw52-sample-h');
m.innerHTML=`<div class="tw52-sheet">
      <div class="tw52-head"><h2 id="tw52-sample-h" tabindex="-1">🎬 Sample scenario</h2><button type="button" class="tw52-x" data-act="close" aria-label="Close the sample scenario">×</button></div>
      <p class="tw52-label"><strong>Made-up people and a made-up job.</strong> Nothing here is saved, sent or shown to anyone, and it isn't connected to real accounts or notifications.</p>
      <ol class="tw52-steps" aria-label="Where this application is"></ol>
      <div class="tw52-tabs" role="tablist" aria-label="Whose screen to show"></div>
      <section id="tw52-view" role="tabpanel"></section>
      <div class="tw52-foot"><button type="button" class="tw52-btn tw52-btn-soft" data-act="reset">↺ Start over</button><button type="button" class="tw52-btn tw52-btn-soft" data-act="close">Close</button></div>
      <div id="tw52-sample-live" class="tw52-sr" aria-live="polite"></div>
    </div>`;
m.addEventListener('click',e=>{
const b=e.target.closest&&e.target.closest('button');if(!b){if(e.target===m)close();return;}
if(b.dataset.view){S.view=b.dataset.view;render();const t=$('tw52-tab-'+S.view);if(t)t.focus();return;}
const a=b.dataset.act;
if(a==='close')close();
else if(a==='reset'){S=fresh('teen');render();const l=$('tw52-sample-live');if(l)l.textContent='Sample scenario started over.';}
else if(a)act(a);
});
m.addEventListener('keydown',e=>{
if(e.key==='Escape'){e.stopPropagation();close();return;}
if(e.key==='Tab'){
const f=[...m.querySelectorAll('button,[href],select,[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null);
if(!f.length)return;
if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus();}
else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus();}
}
if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&e.target.classList&&e.target.classList.contains('tw52-tab')){
const order=['teen','parent','employer'],i=order.indexOf(S.view);
S.view=order[(i+(e.key==='ArrowRight'?1:2))%3];render();const t=$('tw52-tab-'+S.view);if(t)t.focus();
}
});
document.body.appendChild(m);
return m;
}
function open(view){
opener=document.activeElement;
if(!S)S=fresh(view);
else if(view)S.view=view;
build();render();
document.documentElement.classList.add('tw52-sample-open');
const h=$('tw52-sample-h');if(h)try{h.focus();}catch(e){}
}
function close(){
const m=$('tw52-sample');if(m)m.remove();
document.documentElement.classList.remove('tw52-sample-open');
if(opener&&opener.isConnected)try{opener.focus();}catch(e){}
opener=null;
}
window.twOpenSampleScenario=open;
window.twCloseSampleScenario=close;
window._twSampleScenario={open,close,reset:()=>{S=null;},get state(){return S?Object.assign({},S):null;},SAMPLE};
function homeButton(){
const box=$('tw48-demo');if(!box||$('tw52-home-sample'))return;
const note=box.querySelector('.tw48-demo-note');
const b=document.createElement('button');
b.type='button';b.id='tw52-home-sample';b.className='tw52-home-sample';
b.innerHTML='🎬 See a sample scenario <span>(apply → parent OK → hire, made-up people)</span>';
b.onclick=()=>open('teen');
if(note)box.insertBefore(b,note);else box.appendChild(b);
}
function tourAnswered(){return!!ssGet('tw52_tour_answer');}
function bannerExtras(){
const b=$('tw49-demo-banner');if(!b|| !demoActive())return;
let x=b.querySelector('.tw52-demo-more');
const role=(window._twDemoSandbox&&window.__twDemoSandbox&&window.__twDemoSandbox.type)||((window.currentUser||{}).type)||'teen';
const html=`<button type="button" class="tw52-link" data-act="sample">🎬 See a sample scenario</button>`+
(tourAnswered()?'':`<span class="tw52-tour-ask"><button type="button" class="tw52-link" data-act="tour">🗺️ Take the 6-step tour</button><button type="button" class="tw52-link tw52-muted" data-act="skip-tour" aria-label="Skip the tour">Skip tour</button></span>`);
if(!x){
x=document.createElement('div');x.className='tw52-demo-more';
x.addEventListener('click',e=>{
const t=e.target.closest&&e.target.closest('button');if(!t)return;
if(t.dataset.act==='sample')open(role==='parent'||role==='employer'?role:'teen');
else if(t.dataset.act==='tour'){ssSet('tw52_tour_answer','started');x._tw='';bannerExtras();startTourNow();}
else if(t.dataset.act==='skip-tour'){ssSet('tw52_tour_answer','skipped');x._tw='';bannerExtras();}
});
}
if(x.parentElement!==b)b.appendChild(x);
if(x._tw!==html){x.innerHTML=html;x._tw=html;}
}
let origTourStart=null;
function startTourNow(){try{(origTourStart||window.tourStart).call(window,true);}catch(e){console.warn('practice-v52: tour',e);}}
function wrapTour(){
const t=window.tourStart;
if(typeof t==='function'&& !t.__tw52){
origTourStart=t;
const w=function(force){if(force!==true&&demoActive()){bannerExtras();return;}return t.apply(this,arguments);};
w.__tw52=true;window.tourStart=w;
}
const s=window._startAdvancedTour;
if(typeof s==='function'&& !s.__tw52){
const w2=function(){if(demoActive()){bannerExtras();return;}return s.apply(this,arguments);};
w2.__tw52=true;window._startAdvancedTour=w2;window.startTour=w2;
}
}
const REPEAT= /^This demo starts empty, like a new account\./;
function wrapToast(){
const o=window.showToast;
if(typeof o!=='function'||o.__tw52)return;
const w=function(msg){if(REPEAT.test(String(msg||''))&&(demoActive()||$('tw49-demo-banner')))return;return o.apply(this,arguments);};
w.__tw52=true;
Object.keys(o).forEach(k=>{try{w[k]=o[k];}catch(e){}});
window.showToast=w;
}
function dropRepeatNote(){
document.querySelectorAll('.tw-welcome-note').forEach(n=>{if(REPEAT.test((n.textContent||'').trim())&&demoActive())n.remove();});
}
function tick(){
try{wrapTour();}catch(e){}
try{wrapToast();}catch(e){}
try{homeButton();}catch(e){}
try{bannerExtras();}catch(e){}
try{dropRepeatNote();}catch(e){}
if(S&& !$('tw52-sample'))document.documentElement.classList.remove('tw52-sample-open');
}
tick();
document.addEventListener('DOMContentLoaded',tick);
window.addEventListener('load',tick);
setInterval(tick,700);
new MutationObserver(()=>{if($('tw49-demo-banner')&& !$('tw49-demo-banner').querySelector('.tw52-demo-more'))tick();})
.observe(document.documentElement,{childList:true,subtree:true});
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/onboarding-v53.js */
try{
(function(){
'use strict';
if(window.__twOnboardingV53)return;
window.__twOnboardingV53=true;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const me=()=>{try{return window.currentUser||(typeof currentUser!=='undefined'?currentUser:null);}catch(e){return null;}};
const ua=()=>{try{return typeof userActivity!=='undefined'?userActivity:(window.userActivity||null);}catch(e){return window.userActivity||null;}};
const isTeen=u=> !!(u&& !u.isAdmin&&u.type==='teen');
const practice=u=> !!(u&&(u.twDemo||u.isDemo));
const tester=u=>{try{return!!(window._twIsTesterUser&&window._twIsTesterUser(u));}catch(e){return false;}};
const tiers=()=>window.twJobTiers||null;
const readJSON=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}};
const SAMPLE_BIO= /^Hardworking 16-year-old from Burlington/;
function ageState(u){
let age=0,state='';
try{const s=tiers()&&tiers().teenStatus(u);if(s){age=Number(s.age)||0;state=s.state||'';}}catch(e){}
if(!age){try{age=window.twAgeFromDob?window.twAgeFromDob(u.dob):0;}catch(e){}age=age||Number(u.age)||0;}
return{age,state:state||String(u.state||'')};
}
function linkOf(u){
const local=readJSON('tw_parent_links',{})[String(u.email||'').toLowerCase()]||null;
const l=(u.parentLinked&&u.parentLinked.status)?u.parentLinked:local;
return l||{};
}
function parentStep(u){
const l=linkOf(u),who=l.parentName||l.parentEmail||'your parent';
if(l.status==='approved')return{state:'done',status:'Linked to '+who,action:'',actionLabel:''};
if(practice(u))return{state:'skipped',status:'Skipped in this practice account',detail:'A real account needs this before applying.',action:'link',actionLabel:'See how linking works'};
if(tester(u))return{state:'skipped',status:'Optional for tester accounts',action:'link',actionLabel:'Link a parent'};
if(l.status==='pending')return{state:'waiting',status:'Waiting for '+who+' to accept',detail:'They accept from their own TeenWork account.',action:'link',actionLabel:'See status'};
return{state:'todo',status:'Not linked yet',detail:'Send your parent or guardian a request, or give them your link code.',action:'link',actionLabel:'Link a parent'};
}
function consentStep(u){
if(practice(u))return{state:'skipped',status:'Skipped in this practice account',detail:'A real account needs this before applying.',action:'verify',actionLabel:'How consent works'};
let c={ok:false,why:''};
try{c=tiers()?tiers().consentStatus(u):c;}catch(e){}
if(c.why==='tester')return{state:'skipped',status:'Optional for tester accounts',action:'verify',actionLabel:'Open Verification'};
if(c.ok){
let by=null;try{by=window._twParentConsent&&window._twParentConsent.teenConsent();}catch(e){}
return{state:'done',status:by&&by.name?by.name+' agreed':'Your parent agreed',action:'',actionLabel:''};
}
if(parentStep(u).state!=='done')return{state:'todo',status:'After your parent is linked',detail:'Then they agree from their own account. You can\'t do this step yourself.',action:'verify',actionLabel:'How consent works'};
return{state:'waiting',status:'Waiting for your parent to agree',detail:'They open My Teens in their TeenWork account and tap Review & agree.',action:'verify',actionLabel:'Check again'};
}
function permitStep(u){
const{age,state}=ageState(u),T=tiers();
if(!T)return{state:'na',status:'Checked when you apply',action:'',actionLabel:''};
if(!age|| !state)return{state:'todo',status:'Add your birthday and state',detail:'Your profile needs them to know if you need a work permit.',action:'profile',actionLabel:'Open profile'};
let ps={ok:false,status:'none'},need=null;
try{ps=T.permitStatus(u)||ps;}catch(e){}
try{need=T.permitNeeded(state,age);}catch(e){}
if(ps.ok)return{state:'done',status:'Work permit on file',action:'',actionLabel:'',age,place:state};
if(ps.status==='needs_review')return{state:'waiting',status:'Your permit is being checked',detail:'You can apply to jobs that need a permit once it passes.',action:'verify',actionLabel:'Open Verification',age,place:state};
if(ps.status==='rejected')return{state:'todo',status:'Your last permit photo didn\'t pass',detail:'Add a clearer photo on the Verification page.',action:'verify',actionLabel:'Add a new photo',age,place:state};
if(!need|| !need.known)return{state:'todo',status:'Check your state\'s rule',detail:(need&&need.note)||'',action:'verify',actionLabel:'Open Verification',age,place:state};
if(!need.needed)return{state:'na',status:'Not needed at '+age+' in '+need.state,detail:need.note+' An employer can still ask for one.',action:'',actionLabel:'',age,place:need.state};
return{state:'todo',status:'Needed at '+age+' in '+need.state,detail:need.note+' Add a photo of it on the Verification page.',action:'verify',actionLabel:'Add my permit',age,place:need.state};
}
const passes=s=>s.state==='done'||s.state==='skipped'||s.state==='na';
function gates(u){
u=u||me();
if(!isTeen(u))return null;
const list=[
Object.assign({id:'parent',title:'Link a parent or guardian'},parentStep(u)),
Object.assign({id:'consent',title:'Your linked parent agrees, from their own account'},consentStep(u)),
Object.assign({id:'permit',title:'A work permit, only if your state or the employer needs one'},permitStep(u)),
];
const open=list.filter(s=> !passes(s));
return{list,ok: !open.length,practice:practice(u),done:list.filter(s=>s.state==='done'||s.state==='na').length,total:list.length};
}
function profile(u){
u=u||me()||{};
const a=ua()||{};
const bioBox=$('profile-bio-input');
const bio=String(a.bio||(bioBox&&bioBox.value)||'').trim();
const skills=(Array.isArray(u.skills)&&u.skills.length?u.skills:(Array.isArray(a.skills)?a.skills:[])).filter(Boolean);
const{age}=ageState(u);
const parts=[
{id:'name',label:'your name',done: !!String(u.name||'').trim()},
{id:'age',label:'your birthday',done: !!(u.dob||age)},
{id:'town',label:'your town',done: !!(u.city&&u.state)},
{id:'bio',label:'a short bio',done:bio.length>=20&& !SAMPLE_BIO.test(bio)},
{id:'skills',label:'2 or more skills',done:skills.length>=2},
];
const done=parts.filter(p=>p.done).length;
return{pct:Math.round(done/parts.length*100),missing:parts.filter(p=> !p.done).map(p=>p.label),parts};
}
window.computeProfileCompletion=function(){const u=me();return isTeen(u)?profile(u).pct:0;};
function lessons(){
const list=window.lessonsData||[],done=((ua()||{}).lessonsCompleted||[]).filter(id=>list.some(l=>l.id===id));
return{done:done.length,total:list.length||12,safetyDone:done.includes('safety')};
}
function alerts(){
const on=id=>{const el=$(id);return!el|| !!el.checked;};
return{inapp:on('ctrl-inapp-match'),email:on('ctrl-email-match')};
}
function go(id){
const btn=document.querySelector('[data-twm="'+id+'"]');
try{
const pg=$('page-teen');
if(pg&& !pg.classList.contains('active')&&typeof window.gotoPage==='function')window.gotoPage('teen');
if(typeof window.switchDashTab==='function')window.switchDashTab(btn,id);
else if(typeof window._navfix_go==='function')window._navfix_go('teen',id);
}catch(e){console.warn('onboarding-v53 go',e);}
}
function focusLater(el,highlight){
if(!el)return;
setTimeout(()=>{
try{el.scrollIntoView({block:'center',behavior:'smooth'});}catch(e){el.scrollIntoView();}
try{el.focus({preventScroll:true});}catch(e){}
if(highlight){highlight.classList.add('tw53-flash');setTimeout(()=>highlight.classList.remove('tw53-flash'),2400);}
},250);
}
const ACTIONS={
profile(){go('ttab-resume');const t=$('profile-bio-input')||$('skills-input');focusLater(t,t&&t.closest('.panel'));},
safety(){if(typeof window.openLesson==='function')window.openLesson('safety');else go('ttab-lessons');},
lessons(){go('ttab-lessons');},
link(){if(typeof window.twOpenLinkModal==='function')window.twOpenLinkModal();else go('ttab-resume');},
alerts(){go('ttab-resume');focusLater($('ctrl-inapp-match'),$('notif-prefs-section'));},
verify(){if(typeof window.showVerifyPage==='function')window.showVerifyPage();},
checklist(){go('ttab-firstjob');},
portfolio(){go('ttab-portfolio');},
messages(){if(typeof window.openMsgModal==='function')window.openMsgModal();},
schedule(){go('ttab-calendar');},
map(){go($('ttab-map')?'ttab-map':'ttab-browse');},
worklog(){go('ttab-worklog');},
earnings(){go('ttab-earnings');},
references(){go('ttab-references');},
invite(){if(typeof window.twShare==='function')window.twShare({source:'teen-empty-jobs',audience:'employer',sheet:true});},
};
window.twTeenSteps={
gates,profile,lessons,alerts,passes,
open(name){const f=ACTIONS[name];if(f)f();},
get ACTIONS(){return Object.keys(ACTIONS);},
};
function nextStepsHTML(u){
const p=profile(u),l=lessons(),a=alerts(),g=gates(u),parent=g.list[0];
const row=(cls,icon,title,status,btn)=>
`<li class="tw53-step ${cls}"><span class="tw53-step-icon" aria-hidden="true">${icon}</span>`+
`<div class="tw53-step-text"><b>${title}</b><span>${status}</span></div>${btn}</li>`;
const button=(act,label,primary)=>`<button type="button" class="tw53-btn${primary?' pri':''}" data-tw53-act="${act}">${esc(label)}</button>`;
const profileStatus=p.pct>=100?'Done: 100% complete':p.pct+'% complete. Still to add: '+esc(p.missing.join(', '))+'.';
const lessonStatus=l.safetyDone?'Done. '+l.done+' of '+l.total+' lessons finished':'Recommended first lesson · '+l.done+' of '+l.total+' lessons done';
const parentStatus=esc(parent.status)+(parent.state==='todo'?'. You need this before you can apply.':'.');
const alertStatus=a.inapp||a.email?'On: '+[a.inapp?'in the app':'',a.email?'by email':''].filter(Boolean).join(' and ')+' when a job matches your skills.':'Off. Turn them on to hear about new jobs.';
return`<div class="tw59-ask" role="note">
        <span class="tw59-ask-icon" aria-hidden="true">🏡</span>
        <div class="tw59-ask-text"><b>Know someone who could use a hand?</b><span>Neighbors, family friends and local businesses can post jobs on TeenWork for free. Ask them to post one for you.</span></div>
        ${button('invite','Ask someone to post a job',true)}
      </div>
      <h3 id="tw53-next-h">While you wait for jobs</h3>
      <p class="tw53-next-sub">Do these now so you're ready to apply as soon as a job is posted near you.</p>
      <ul class="tw53-steps">
        ${row(p.pct>=100?'is-done':'','👤','Complete your profile',profileStatus,button('profile',p.pct>=100?'Edit profile':'Complete profile',p.pct<100))}
        ${row(l.safetyDone?'is-done':'','🦺','Workplace Safety Basics',lessonStatus,button(l.safetyDone?'lessons':'safety',l.safetyDone?'More lessons':'Start lesson',!l.safetyDone&&p.pct>=100))}
        ${row(parent.state==='done'?'is-done':'','👪','Link a parent',parentStatus,parent.action?button('link',parent.actionLabel,false):'')}
        ${row(a.inapp||a.email?'is-done':'','🔔','Job-match alerts',alertStatus,button('alerts','Alert settings',false))}
      </ul>
      <p class="tw53-next-foot">What do you need before applying? <button type="button" class="tw48-link" data-tw53-act="checklist">See the First Job Checklist</button></p>`;
}
let drawingNext=false;
function drawNextSteps(){
const list=$('browse-jobs-list'),u=me();
if(!list||drawingNext)return;
const empty=list.querySelector(':scope > [data-tw-empty]');
let box=$('tw53-next');
if(!isTeen(u)|| !empty||list.querySelector('.browse-card')){if(box)box.remove();return;}
drawingNext=true;
try{
const html=nextStepsHTML(u);
if(!box){box=document.createElement('section');box.id='tw53-next';box.className='tw53-next';box.setAttribute('aria-labelledby','tw53-next-h');}
if(box._html!==html){box.innerHTML=html;box._html=html;}
if(empty.nextElementSibling!==box)empty.after(box);
try{if($('teen-profile-completion')&&typeof window.renderProfileCompletionBar==='function')window.renderProfileCompletionBar('teen-profile-completion');}catch(e){}
}finally{drawingNext=false;}
}
document.addEventListener('click',e=>{
const b=e.target&&e.target.closest&&e.target.closest('[data-tw53-act]');
if(!b)return;
e.preventDefault();
window.twTeenSteps.open(b.getAttribute('data-tw53-act'));
});
function markStartLesson(){
const grid=$('lessons-grid');if(!grid)return;
const card=[...grid.querySelectorAll('.lesson-card')].find(c=> /'safety'/.test(c.getAttribute('onclick')||''));
if(!card)return;
const done=card.classList.contains('done');
const tag=card.querySelector('.tw53-start-tag');
if(done){if(tag)tag.remove();card.classList.remove('tw53-start');return;}
if(!tag){
const t=document.createElement('span');t.className='tw53-start-tag';t.textContent='Start here';
const title=card.querySelector('.lesson-title');if(title)title.before(t);else card.prepend(t);
card.classList.add('tw53-start');
}
if(grid.firstElementChild!==card)grid.prepend(card);
}
const FOCUSABLE='button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const visibleEl=el=> !!(el&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
let lastPointer=null,msgOpener=null;
document.addEventListener('pointerdown',e=>{lastPointer=e.target;},true);
function openerNow(box){
let a=document.activeElement;
if(!a||a===document.body||(box&&box.contains(a)))a=lastPointer&&lastPointer.closest?lastPointer.closest('button,a,[tabindex],[onclick]'):null;
return a&& !(box&&box.contains(a))?a:null;
}
function setupMessages(){
const ov=$('msgModal'),box=ov&&ov.querySelector('.msg-modal');
if(!box||box.__tw53)return;
box.__tw53=true;
box.setAttribute('role','dialog');
box.setAttribute('aria-modal','true');
box.setAttribute('aria-label','Messages');
box.tabIndex= -1;
const bar=document.createElement('div');
bar.className='tw53-msg-bar';
bar.innerHTML='<button type="button" class="tw53-msg-sos" id="tw53-msg-sos"><span aria-hidden="true">⚠️</span> Something feels wrong</button>'+
'<button type="button" class="tw53-msg-close" id="tw53-msg-close" aria-label="Close messages"><span aria-hidden="true">✕</span> Close</button>';
box.insertBefore(bar,box.firstChild);
$('tw53-msg-close').addEventListener('click',()=>{if(typeof window.closeMsgModal==='function')window.closeMsgModal();else ov.classList.remove('open');});
$('tw53-msg-sos').addEventListener('click',()=>{if(typeof window.openFeelsWrong==='function')window.openFeelsWrong();});
let wasOpen=ov.classList.contains('open');
new MutationObserver(()=>{
const open=ov.classList.contains('open');
if(open===wasOpen)return;
wasOpen=open;
document.body.classList.toggle('tw53-msg-open',open);
if(open){
msgOpener=openerNow(box);
setTimeout(()=>{if(ov.classList.contains('open')&& !box.contains(document.activeElement))try{box.focus({preventScroll:true});}catch(e){}},0);
}else{
const a=document.activeElement,back=msgOpener;msgOpener=null;
if((!a||a===document.body||box.contains(a))&&back&&back.isConnected&&visibleEl(back))try{back.focus({preventScroll:true});}catch(e){}
else if(box.contains(a))try{a.blur();}catch(e){}
}
}).observe(ov,{attributes:true,attributeFilter:['class']});
if(wasOpen)document.body.classList.add('tw53-msg-open');
}
document.addEventListener('keydown',e=>{
if(e.key!=='Tab')return;
const ov=$('msgModal'),box=ov&&ov.querySelector('.msg-modal');
if(!box|| !ov.classList.contains('open'))return;
const a=document.activeElement;
if(a&&a!==document.body&&a!==box&& !box.contains(a))return;
const items=[...box.querySelectorAll(FOCUSABLE)].filter(visibleEl);
if(!items.length)return;
const first=items[0],last=items[items.length-1];
if(!box.contains(a)||a===box){e.preventDefault();(e.shiftKey?last:first).focus();}
else if(e.shiftKey&&a===first){e.preventDefault();last.focus();}
else if(!e.shiftKey&&a===last){e.preventDefault();first.focus();}
},true);
const OTHER_TOP='#tw35-modal, #tw44c-modal, #twjt-modal, #tw47pa, #tw34l, #twlm-sheet, #twps-win, #kbd-help-modal, .ai-tools-modal-overlay.open';
window.addEventListener('keydown',e=>{
if(e.key!=='Escape'||e.isComposing||e.defaultPrevented)return;
const sos=$('feelsWrongModal'),ov=$('msgModal');
if(sos&&(sos.classList.contains('open')||sos.classList.contains('active'))){e.stopImmediatePropagation();window.closeFeelsWrong();return;}
if(!ov|| !ov.classList.contains('open'))return;
const others=[...document.querySelectorAll(OTHER_TOP+', .modal-overlay.open, .modal-overlay.active')].filter(visibleEl);
if(others.length)return;
e.stopImmediatePropagation();
if(typeof window.closeMsgModal==='function')window.closeMsgModal();else ov.classList.remove('open');
},true);
let sosOpener=null;
window.openFeelsWrong=function(){
const m=$('feelsWrongModal');if(!m)return;
sosOpener=openerNow(m);
m.classList.add('open','active');
m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
const h=m.querySelector('h3');if(h){h.id=h.id||'tw53-sos-title';m.setAttribute('aria-labelledby',h.id);}
setTimeout(()=>{const t=$('feels-wrong-note');if(t)try{t.focus({preventScroll:true});}catch(e){}},30);
};
window.closeFeelsWrong=function(){
const m=$('feelsWrongModal');if(!m)return;
m.classList.remove('open','active');
const back=sosOpener;sosOpener=null;
if(back&&back.isConnected&&visibleEl(back))try{back.focus({preventScroll:true});}catch(e){}
};
window.twPermitStepStatus=function(open3,u){
u=u||me();
if(!isTeen(u))return null;
const s=permitStep(u),step=$('tw-ver-step-3');
let kind,label;
if(s.state==='done'){kind='done';label='✓ On file';}
else if(s.state==='na'){kind='done';label='✓ Not needed at '+s.age+' in '+s.place;}
else if(s.state==='waiting'){kind='active';label='Being checked';}
else if(/didn't pass/.test(s.status)){kind='active';label='Didn\'t pass: try again';}
else if(!open3){kind='locked';label='🔒 After parent consent';}
else if(/^Needed/.test(s.status)){kind='active';label='Needed: add your permit';}
else{kind='active';label=s.status;}
const desc=step&&step.querySelector('.tw-ver-step-desc');
const text=s.state==='na'?'You don\'t need a work permit for most jobs. An employer can still ask for one; you can add it here.'
:s.state==='done'?'Your work permit is on file, so jobs that need a permit are open to you.'
:s.state==='waiting'?s.detail
: !open3&&s.state==='todo'?'You need a work permit at your age in your state. You can add it after your linked parent agrees (step 2).'
:(s.detail||s.status);
if(desc&&desc.textContent!==text)desc.textContent=text;
const row=$('tw-ver-badge-row');
if(row){
let cap=$('tw53-badge-cap');
if(!cap){cap=document.createElement('p');cap.id='tw53-badge-cap';cap.className='tw53-badge-cap';row.after(cap);}
const c=s.state==='na'?'🔒 means not earned yet. At '+s.age+' in '+s.place+' you don\'t need the Work Permit badge, unless an employer asks for a permit.'
:'🔒 means not earned yet. Profile details are self-reported; TeenWork does not check ID or run background checks.';
if(cap.textContent!==c)cap.textContent=c;
}
return{kind,label};
};
function drawAvatar(){
const el=$('tw53-avatar'),u=me();
if(!el|| !u)return;
const parts=String(u.name||'').trim().split(/\s+/).filter(Boolean);
const ini=((parts[0]||'')[0]||'')+((parts.length>1?parts[parts.length-1]:'')[0]||'');
const t=ini.toUpperCase()||'🙂';
if(el.textContent!==t)el.textContent=t;
}
const phone=window.matchMedia?window.matchMedia('(max-width: 600px)'):{matches:false};
function placeDemos(){
const trust=$('tw51-trust'),demo=$('tw48-demo');
if(!trust|| !demo)return;
if(phone.matches){if(demo.nextElementSibling!==trust)demo.after(trust);}
else if(trust.nextElementSibling!==demo)demo.before(trust);
}
placeDemos();
try{phone.addEventListener('change',placeDemos);}catch(e){try{phone.addListener(placeDemos);}catch(x){}}
let queued=false;
function tick(){
queued=false;
try{setupMessages();}catch(e){console.warn('onboarding-v53 messages',e);}
try{drawNextSteps();}catch(e){console.warn('onboarding-v53 next steps',e);}
try{markStartLesson();}catch(e){}
try{drawAvatar();}catch(e){}
}
const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(tick);}};
function watch(){
['browse-jobs-list','lessons-grid'].forEach(id=>{const el=$(id);if(el&& !el.__tw53w){el.__tw53w=true;new MutationObserver(schedule).observe(el,{childList:true});}});
['ttab-browse','ttab-resume','ttab-lessons','page-teen'].forEach(id=>{const el=$(id);if(el&& !el.__tw53c){el.__tw53c=true;new MutationObserver(schedule).observe(el,{attributes:true,attributeFilter:['class']});}});
tick();
}
document.addEventListener('change',e=>{if(e.target&& /^ctrl-(inapp|email)-match$/.test(e.target.id||''))schedule();},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window._twOnboardingV53={drawNextSteps,setupMessages,markStartLesson,placeDemos,profile,gates};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/profile-photo-v55.js */
try{
(function(){
'use strict';
if(window.__twPhoto55)return;
window.__twPhoto55=true;
const BUCKET='profile-photos',TABLE='tw_profile_photos',SIZE=400,MAX_IN=20*1024*1024,LINK_SECS=3600;
const ROLES=['teen','parent','employer'];
const AUD={teen:['me','parent','employers','everyone'],parent:['me','teens','teens_employers','everyone'],employer:['me','teens','teens_parents','everyone']};
const DEFAULT={teen:'parent',parent:'teens',employer:'teens_parents'};
const SHOWS={
me:[],parent:['parents'],employers:['parents','employers'],
teens:['teens'],teens_employers:['teens','employers'],teens_parents:['teens','parents'],
everyone:[],
};
const CAP={parents:300,employers:200,teens:300};
const $=id=>document.getElementById(id);
const lexUser=()=>{try{return typeof currentUser!=='undefined'?currentUser:null;}catch(e){return null;}};
const me=()=>window.currentUser||lexUser();
const low=s=>String(s==null?'':s).trim().toLowerCase();
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const EMAIL= /^[^\s@#,()"*<>]+@[^\s@#,()"*<>]+\.[^\s@#,()"*<>]+$/;
const KEY= /^[^\s@#,()"*<>]+@[^\s@#,()"*<>]+\.[^\s@#,()"*<>]+(#\d{1,3})?$/;
const keyOf=u=>low(u&&(u.dataKey||u.email));
const emailOfKey=k=>low(k).split('#')[0];
const slotOf=k=>(String(k).includes('#')?parseInt(String(k).split('#')[1],10)||1:1);
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch(e){return null;}};
const toast=(m,t)=>{try{showToast(m,t||'success');}catch(e){}};
const uniq=a=>[...new Set(a)];
const sameList=(a,b)=>JSON.stringify((a||[]).slice().sort())===JSON.stringify((b||[]).slice().sort());
const isPractice=u=> !!(u&&(u.twDemo||u.isDemo|| /\.demo$/i.test(String(u.email||''))||(typeof window._twIsDemoSandboxUser==='function'&&window._twIsDemoSandboxUser(u))));
const isReal=u=> !!(u&& !isPractice(u)&& !u.isAdmin&&ROLES.includes(u.type)&&KEY.test(keyOf(u)));
const roleOf=u=>(u&&ROLES.includes(u.type)?u.type:'');
async function client(){
let c=null;
try{if(typeof _twCloudClient==='function')c=await _twCloudClient(3000);}catch(e){}
if(!c){try{c=(typeof sbClient!=='undefined'&&sbClient)||null;}catch(e){c=null;}}
return c&& !c.__twDemo&&c.storage&&typeof c.from==='function'?c:null;
}
async function sessionFor(c,key){
try{
const r=await c.auth.getSession(),s=r&&r.data&&r.data.session;
return s&&s.user&&low(s.user.email)===emailOfKey(key)?s:null;
}catch(e){return null;}
}
const notReady=err=> !!err&&(err.code==='23514'|| /audience_check/i.test(String(err.message||'')));
const missing=err=> !!err&&(err.code==='PGRST205'||err.code==='PGRST202'||err.code==='PGRST204'||err.code==='42P01'||
err.code==='42883'||err.code==='42703'||
/tw_profile_photos|tw_photo_paths|bucket not found|schema cache|teen_viewers/i.test(String(err.message||'')));
function ids(role){
if(role==='teen')return{box:'tw55-photo',av:'tw53-avatar',cap:'tw55-cap',pick:'tw55-pick',rm:'tw55-remove',file:'tw55-file',stat:'tw55-status',aud:'tw55-aud',who:'tw55-who',radio:'tw55-aud',tab:'ttab-resume',page:'page-teen'};
const s='-'+role;
return{box:'tw55-photo'+s,av:'tw55-avatar'+s,cap:'tw55-cap'+s,pick:'tw55-pick'+s,rm:'tw55-remove'+s,file:'tw55-file'+s,stat:'tw55-status'+s,aud:'tw55-aud'+s,who:'tw55-who'+s,radio:'tw55-aud'+s,
tab:role==='parent'?'ptab-teens':'etab-profile',page:'page-'+role};
}
const CHOICES={
parent:[['me','Only me',''],['teens','Me and my teens','Teens linked to your account'],
['teens_employers','My teens and their employers','An employer sees it only after you approve your teen\'s application to their job'],
['everyone','Anyone on TeenWork','Anyone signed in to TeenWork']],
employer:[['me','Only me',''],['teens','Teens who applied','A teen sees it once their application reaches you, after their parent says OK'],
['teens_parents','Those teens and their parents','Also the parent who approved each application'],
['everyone','Anyone on TeenWork','Anyone signed in to TeenWork, so teens and parents can see who you are']],
};
const HINT={
parent:'Pick a friendly picture of your face. TeenWork makes it a small square and removes hidden details phone cameras add, like where the photo was taken.',
employer:'A clear photo of you or your business logo helps teens and parents know who they\'re talking to. TeenWork makes it a small square and removes hidden details phone cameras add, like where the photo was taken.',
};
function addPanel(role){
const I=ids(role);if($(I.box))return;
let host=null,before=null;
if(role==='parent')host=$('ptab-teens');
else{host=$('etab-profile');before=$('emp-profile-edit-wrap');if(before&&before.parentNode!==host)before=null;}
if(!host)return;
const panel=document.createElement('div');
panel.className='panel tw55-panel';panel.style.marginTop='1rem';
panel.innerHTML='<div class="panel-head"><h2>📷 '+(role==='parent'?'Your Photo':'Your Photo or Logo')+'</h2><span class="badge badge-green">Optional</span></div>'+
'<div class="panel-body tw55-box" id="'+I.box+'">'+
'<div class="tw53-avatar'+(role==='employer'?' tw55-square':'')+'" id="'+I.av+'" aria-hidden="true"></div>'+
'<p class="tw53-avatar-cap" id="'+I.cap+'">Default avatar (your initials)</p>'+
'<div class="tw55-btns"><button type="button" class="btn-secondary" id="'+I.pick+'">📷 Add a photo</button>'+
'<button type="button" class="btn-secondary tw55-remove" id="'+I.rm+'" hidden>Remove photo</button>'+
'<input type="file" id="'+I.file+'" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden></div>'+
'<p class="tw55-status" id="'+I.stat+'" role="status" aria-live="polite"></p>'+
'<p><b>You don\'t need a photo.</b> Without one, people see your initials.</p>'+
'<fieldset class="tw55-aud" id="'+I.aud+'"><legend>Who can see your photo</legend>'+
CHOICES[role].map(([v,t,s])=>'<label><input type="radio" name="'+I.radio+'" value="'+v+'"'+(v===DEFAULT[role]?' checked':'')+'><span><b>'+esc(t)+'</b>'+(s?'<small>'+esc(s)+'</small>':'')+'</span></label>').join('')+
'</fieldset><div class="tw55-who" id="'+I.who+'" hidden></div>'+
'<p class="tw53-hint">'+esc(HINT[role])+'</p></div>';
if(before)host.insertBefore(panel,before);else host.appendChild(panel);
}
const st={key:'',role:'',setup:'idle',row:null,url:'',practiceUrl:'',busy:false,people:null,msg:'',msgKind:'',loadedAt:0,syncedAt:0};
function reset(key,role){
if(st.practiceUrl){try{URL.revokeObjectURL(st.practiceUrl);}catch(e){}}
Object.assign(st,{key,role,setup:'idle',row:null,url:'',practiceUrl:'',busy:false,people:null,msg:'',msgKind:'',loadedAt:0,syncedAt:0});
}
function current(){
const u=me(),role=roleOf(u);
if(!role)return null;
const key=isPractice(u)?'practice:'+role+':'+low(u.email):keyOf(u);
if(st.key!==key||st.role!==role)reset(key,role);
return u;
}
const audience=()=>(st.row&&(AUD[st.role]||[]).includes(st.row.audience)?st.row.audience:DEFAULT[st.role]||'me');
const photoUrl=()=>st.practiceUrl||st.url;
const cols=role=>'path,audience,parent_viewers,employer_viewers'+(role==='teen'?'':',teen_viewers');
async function signed(c,paths){
if(!paths.length)return{};
try{
const r=await c.storage.from(BUCKET).createSignedUrls(paths,LINK_SECS);
const out={};
((r&&r.data)||[]).forEach(x=>{if(x&&x.signedUrl&& !x.error)out[x.path]=x.signedUrl;});
return out;
}catch(e){return{};}
}
async function loadMine(force){
const u=current();if(!u)return;
if(isPractice(u)){st.setup='practice';draw();return;}
if(!isReal(u))return;
if(!force&&st.loadedAt&&Date.now()-st.loadedAt<(st.setup==='ok'?50:2)*60*1000)return;
const key=st.key,role=st.role,fail=s=>{st.setup=s;st.loadedAt=Date.now();draw();};
const c=await client();
if(st.key!==key)return;
if(!c)return fail('offline');
if(!(await sessionFor(c,key)))return fail('signin');
let r;
try{r=await c.from(TABLE).select(cols(role)).eq('owner_key',key).maybeSingle();}catch(e){r={error:e};}
if(st.key!==key)return;
if(r&&r.error)return fail(missing(r.error)?'missing':'offline');
st.row=(r&&r.data)||null;
st.setup='ok';st.loadedAt=Date.now();
st.url=st.row&&st.row.path?((await signed(c,[st.row.path]))[st.row.path]||''):'';
draw();
}
async function readPeople(c,key,role){
const q=async build=>{try{const r=await build(c.from('user_data').select('email,key,value'));return r&& !r.error?(r.data||[]):null;}catch(e){return null;}};
const self=emailOfKey(key),out={parents:[],employers:[],teens:[]};
const add=(list,email,name,job)=>{
email=low(email);
if(!EMAIL.test(email)||email===self)return;
let p=list.find(x=>x.email===email);
if(!p){p={email,name:String(name||'').slice(0,60),jobs:[]};list.push(p);}
if(!p.name&&name)p.name=String(name).slice(0,60);
if(job&&p.jobs.length<3&& !p.jobs.includes(job))p.jobs.push(String(job).slice(0,60));
};
const live=v=>v&&['applied','hired'].includes(v.status);
if(role==='teen'){
const[linkRows,appRows]=await Promise.all([q(b=>b.eq('email',key).eq('key','parent_link')),q(b=>b.eq('email',key).like('key','job_app:%'))]);
if(!linkRows|| !appRows)return null;
const link=parse(linkRows[0]&&linkRows[0].value)||{};
if(link.status==='approved'){
uniq((Array.isArray(link.parents)?link.parents:[]).concat(link.parentEmail?[link.parentEmail]:[]).map(low)).slice(0,10)
.forEach(e=>add(out.parents,e,e===low(link.parentEmail)?link.parentName:''));
}
appRows.forEach(r=>{const v=parse(r.value);if(!live(v))return;const job=v.job||{};add(out.employers,emailOfKey(v.employerKey),job.employer||job.business,job.title);});
}else if(role==='parent'){
const mine=await q(b=>b.eq('email',key).eq('key','linked_teens'));
if(!mine)return null;
const v=parse(mine[0]&&mine[0].value)||{};
const teens=(Array.isArray(v.teens)?v.teens:[]).filter(t=>t&& !t.pending&&KEY.test(low(t.key||t.email)));
teens.forEach(t=>add(out.teens,emailOfKey(t.key||t.email),t.name&& !EMAIL.test(low(t.name))?t.name:''));
if(teens.length){
const apps=await q(b=>b.in('email',teens.map(t=>low(t.key||t.email))).like('key','job_app:%'));
if(!apps)return null;
apps.forEach(r=>{const a=parse(r.value);if(!live(a))return;const job=a.job||{};add(out.employers,emailOfKey(a.employerKey),job.employer||job.business,job.title);});
}
}else{
const posts=await q(b=>b.eq('email',key).like('key','job_post:%'));
if(!posts)return null;
const jobs={};
posts.forEach(r=>{const v=parse(r.value);if(v&&v.id)jobs[v.id]=v.title||'';});
const idList=Object.keys(jobs);
if(idList.length){
const apps=await q(b=>b.in('key',idList.slice(0,200).map(id=>'job_app:'+id)));
if(!apps)return null;
apps.forEach(r=>{
const a=parse(r.value);if(!live(a)||low(a.employerKey)!==key)return;
const title=jobs[a.jobId]||(a.job&&a.job.title)||'';
add(out.teens,emailOfKey(r.email),a.teenName,title);
if(a.parentEmail)add(out.parents,a.parentEmail,a.parentName,'');
});
}
}
Object.keys(CAP).forEach(k=>{out[k]=out[k].slice(0,CAP[k]);});
if(role==='teen')out.parents=out.parents.slice(0,10);
return out;
}
function rowFor(fields){
const p=st.people,r0=st.row||{};
const list=(name,col)=>(p?p[name].map(x=>x.email):(r0[col]||[]));
const row={owner_key:st.key,audience:audience(),path:r0.path||null};
if(st.role==='teen')Object.assign(row,{parent_viewers:list('parents','parent_viewers'),employer_viewers:list('employers','employer_viewers')});
else if(st.role==='parent')Object.assign(row,{parent_viewers:[],teen_viewers:list('teens','teen_viewers'),employer_viewers:list('employers','employer_viewers')});
else Object.assign(row,{employer_viewers:[],teen_viewers:list('teens','teen_viewers'),parent_viewers:list('parents','parent_viewers')});
return Object.assign(row,fields,{updated_at:new Date().toISOString()});
}
async function save(c,fields){
const row=rowFor(fields);
let r;
try{r=await c.from(TABLE).upsert(row,{onConflict:'owner_key'}).select(cols(st.role)).single();}catch(e){r={error:e};}
if(r&&r.error){st.refused=notReady(r.error);if(!st.refused&&missing(r.error))st.setup='missing';return false;}
st.refused=false;
st.row=r.data||row;
return true;
}
const listsOf=(role,p)=>role==='teen'?[['parent_viewers',p.parents],['employer_viewers',p.employers]]
:role==='parent'?[['teen_viewers',p.teens],['employer_viewers',p.employers]]
:[['teen_viewers',p.teens],['parent_viewers',p.parents]];
async function syncViewers(force){
const u=current();if(!isReal(u))return;
if(!force&&Date.now()-st.syncedAt<2*60*1000)return;
await loadMine();
if(st.setup!=='ok')return;
const key=st.key,role=st.role,c=await client();if(!c||st.key!==key)return;
const people=await readPeople(c,key,role);
if(!people||st.key!==key)return;
st.people=people;st.syncedAt=Date.now();
const r=st.row;
if(r&&listsOf(role,people).some(([col,list])=> !sameList(r[col],list.map(x=>x.email))))await save(c,{});
draw();
}
function decode(file){
if(typeof createImageBitmap==='function')return createImageBitmap(file).catch(()=>viaImg(file));
return viaImg(file);
}
function viaImg(file){
return new Promise((res,rej)=>{
const url=URL.createObjectURL(file),img=new Image();
img.onload=()=>{URL.revokeObjectURL(url);res(img);};
img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('decode'));};
img.src=url;
});
}
async function squareJpeg(file){
const src=await decode(file);
const w=src.width||src.naturalWidth,h=src.height||src.naturalHeight,s=Math.min(w,h);
if(!s)throw new Error('decode');
const cv=document.createElement('canvas');cv.width=cv.height=SIZE;
const ctx=cv.getContext('2d');
ctx.fillStyle='#fff';ctx.fillRect(0,0,SIZE,SIZE);
ctx.drawImage(src,(w-s)/2,h>w?(h-s)*0.25:(h-s)/2,s,s,0,0,SIZE,SIZE);
try{src.close&&src.close();}catch(e){}
const blob=await new Promise(res=>cv.toBlob(res,'image/jpeg',0.85));
if(!blob)throw new Error('encode');
return blob;
}
function say(msg,kind){st.msg=msg||'';st.msgKind=kind||'';draw();}
async function upload(file){
const u=current();if(!u||st.busy)return;
if(!file)return;
if(!/^image\//i.test(file.type||'')&& !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name||''))return say('That file isn\'t a picture. Choose a JPG or PNG photo.','bad');
if(file.size>MAX_IN)return say('That picture is too big (over 20 MB). Choose a smaller one.','bad');
st.busy=true;say('Getting your photo ready…');
let blob;
try{blob=await squareJpeg(file);}
catch(e){st.busy=false;return say('This picture can\'t be opened here. Try a JPG or PNG photo.','bad');}
if(isPractice(u)){
if(st.practiceUrl){try{URL.revokeObjectURL(st.practiceUrl);}catch(e){}}
st.practiceUrl=URL.createObjectURL(blob);st.busy=false;
say('Practice account: your photo shows here only. It was not uploaded and goes away when you leave.','ok');
return;
}
await loadMine(true);
const key=st.key,c=await client();
if(st.setup!=='ok'|| !c){st.busy=false;return say(setupText(),'bad');}
const s=await sessionFor(c,key);
if(!s){st.busy=false;st.setup='signin';return say(setupText(),'bad');}
say('Uploading…');
if(!st.people){const p=await readPeople(c,key,st.role);if(p)st.people=p;}
const path=s.user.id+'/p'+slotOf(key)+'-'+Date.now()+'.jpg',old=st.row&&st.row.path;
let up;
try{up=await c.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'});}catch(e){up={error:e};}
if(st.key!==key)return;
if(up&&up.error){st.busy=false;if(missing(up.error))st.setup='missing';return say(st.setup==='missing'?setupText():'The upload didn\'t work. Check your connection and try again.','bad');}
if(!(await save(c,{path}))){
try{await c.storage.from(BUCKET).remove([path]);}catch(e){}
st.busy=false;return say(st.setup==='missing'?setupText():'Your photo couldn\'t be saved. Please try again.','bad');
}
if(old&&old!==path){try{await c.storage.from(BUCKET).remove([old]);}catch(e){}}
st.url=(await signed(c,[path]))[path]||URL.createObjectURL(blob);
st.busy=false;st.loadedAt=Date.now();
say('Photo saved. '+whoShort()+'.','ok');
toast('📷 Profile photo saved');
}
async function removePhoto(){
const u=current();if(!u||st.busy)return;
if(isPractice(u)){
if(st.practiceUrl){try{URL.revokeObjectURL(st.practiceUrl);}catch(e){}}
st.practiceUrl='';return say('Photo removed.','ok');
}
const old=st.row&&st.row.path;if(!old)return;
const c=await client();if(!c)return say('Can\'t reach TeenWork right now. Check your connection and try again.','bad');
st.busy=true;say('Removing…');
if(!(await save(c,{path:null}))){st.busy=false;return say('Your photo couldn\'t be removed. Please try again.','bad');}
try{await c.storage.from(BUCKET).remove([old]);}catch(e){}
st.url='';st.busy=false;
say('Photo removed. People see your initials again.','ok');
}
async function setAudience(a){
const u=current();if(!u|| !(AUD[st.role]||[]).includes(a)||a===audience())return;
if(isPractice(u)){st.row=Object.assign({},st.row||{},{audience:a});return say('Saved for this practice account.','ok');}
const c=await client();
if(!c||st.setup!=='ok'){draw();return say(setupText(),'bad');}
const before=st.row;
st.row=Object.assign({},st.row||{},{audience:a});draw();
if(!st.people){const p=await readPeople(c,st.key,st.role);if(p)st.people=p;}
if(await save(c,{audience:a}))say('Saved. '+whoShort()+'.','ok');
else{st.row=before;say(st.refused?'That choice isn\'t switched on yet. Check back soon.':st.setup==='missing'?setupText():'That change didn\'t save. Please try again.','bad');}
}
function setupText(){
return st.setup==='missing'?'Photo upload is still being set up. Check back soon.'
:st.setup==='signin'?'To add a photo, sign out and sign back in, then try again.'
:st.setup==='offline'?'Can\'t reach TeenWork right now. Check your connection and try again.':'';
}
const ROLE_TAG={parents:' (parent)',employers:'',teens:''};
function nameOf(p,kind){
const jobs=p.jobs&&p.jobs.length?' <span class="tw55-mail">for '+p.jobs.map(esc).join(', ')+'</span>':'';
return(p.name?esc(p.name)+ROLE_TAG[kind]+' <span class="tw55-mail">'+esc(p.email)+'</span>':esc(p.email)+ROLE_TAG[kind])+jobs;
}
function whoShort(){
const a=audience(),p=st.people||{parents:[],employers:[],teens:[]};
if(a==='me')return'Only you can see it';
if(a==='everyone')return'Anyone signed in to TeenWork can see it';
const n=SHOWS[a].reduce((t,k)=>t+p[k].length,0);
return n?'You and '+n+(n===1?' other person':' other people')+' can see it':'Right now only you can see it';
}
const EMPTY={
teen:{parents:'No parent is linked yet, so no parent sees it.',employers:'No employers yet. An employer is added after your parent approves your application to their job.'},
parent:{teens:'No teen is linked yet. Your teens are added once you link to them.',employers:'No employers yet. An employer is added after you approve your teen\'s application to their job.'},
employer:{teens:'No applicants yet. A teen is added once their application reaches you, after their parent says OK.',parents:'No parents yet. A parent is added when they approve their teen\'s application to your job.'},
};
const PRACTICE={
parent:'Your linked parent',employers:'Your linked parent, and employers after your parent approves an application',
teens:'Your linked teens',teens_employers:'Your linked teens, and their employers after you approve an application',
everyone:'Anyone signed in to TeenWork',
};
function whoHTML(){
const a=audience(),role=st.role,p=st.people,has= !!photoUrl();
const lead=has?'<b>Who can see your photo right now:</b>':'<b>No photo yet.</b> If you add one, it shows to:';
if(a==='me')return lead+'<ul><li>Only you</li></ul>';
if(a==='everyone')return lead+'<ul><li>You</li><li>Anyone signed in to TeenWork</li></ul>'+
(role==='teen'?'<p class="tw55-warn">⚠️ That includes adults you don\'t know. Talk to your parent before you pick this.</p>':'');
if(st.setup==='practice'){
const what=role==='employer'&&a!=='everyone'?(a==='teens'?'Teens whose application reached you':'Those teens and the parents who approved them'):PRACTICE[a];
return lead+'<ul><li>You</li><li>'+what+' (in a real account)</li></ul>';
}
if(!p)return lead+'<ul><li>You</li><li class="tw55-muted">Checking who that is…</li></ul>';
const li=['<li>You</li>'];
SHOWS[a].forEach(k=>{
p[k].forEach(x=>li.push('<li>'+nameOf(x,k)+'</li>'));
if(!p[k].length)li.push('<li class="tw55-muted">'+esc(EMPTY[role][k])+'</li>');
});
return lead+'<ul>'+li.join('')+'</ul>';
}
function initials(u){
const n=String((u&&(u.name||u.businessName))||'').trim().split(/\s+/).filter(Boolean);
return n.length?(n[0][0]+(n.length>1?n[n.length-1][0]:'')).toUpperCase():'🙂';
}
function draw(){
const u=current();if(!u)return;
const I=ids(st.role),box=$(I.box);if(!box)return;
const url=photoUrl(),av=$(I.av),cap=$(I.cap);
const want=url?'url("'+url.replace(/["\\]/g,'')+'")':'';
const avatars=[av];
if(st.role==='employer')avatars.push($('emp-profile-avatar-display'));
avatars.forEach(el=>{
if(!el)return;
if(el.style.backgroundImage!==want&&(want||el.style.backgroundImage))el.style.backgroundImage=want;
el.classList.toggle('tw55-has-photo',!!url);
});
if(av&&st.role!=='teen'&& !url){const t=initials(u);if(av.textContent!==t)av.textContent=t;}
if(cap)cap.textContent=url?'Your photo':'Default avatar (your initials)';
const ready=st.setup==='ok'||st.setup==='practice';
const pick=$(I.pick),rm=$(I.rm),stat=$(I.stat),who=$(I.who),fs=$(I.aud);
if(pick){pick.disabled=st.setup==='missing'||st.setup==='signin'||st.busy;pick.textContent=url?'📷 Change photo':'📷 Add a photo';}
if(rm){rm.hidden= !url;rm.disabled=st.busy;}
if(fs){
fs.disabled= !ready||st.busy;
const a=audience();
fs.querySelectorAll('input[name="'+I.radio+'"]').forEach(r=>{r.checked=r.value===a;});
}
if(stat){
const t=st.msg||(st.setup==='practice'?'Practice account: a photo you add stays on this screen only and is never uploaded.':setupText());
if(stat.textContent!==t)stat.textContent=t;
stat.className='tw55-status'+(st.msgKind?' '+st.msgKind:(!ready&&st.setup!=='idle'?' bad':''));
}
if(who){
const h=ready?whoHTML()+'<p class="tw55-note">'+(audience()==='everyone'?'People who aren\'t signed in to TeenWork never see it.':'Everyone else sees your initials.')+
' TeenWork\'s owner can open stored photos to keep the site safe.</p>':'';
if(who.innerHTML!==h)who.innerHTML=h;
who.hidden= !h;
}
}
function wirePanel(role){
if(role!=='teen')addPanel(role);
const I=ids(role),box=$(I.box);if(!box||box.__tw55)return;
box.__tw55=true;
const file=$(I.file),pick=$(I.pick),rm=$(I.rm),fs=$(I.aud);
if(pick&&file)pick.addEventListener('click',()=>{st.msg='';file.value='';file.click();});
if(file)file.addEventListener('change',()=>{const f=file.files&&file.files[0];upload(f);});
if(rm)rm.addEventListener('click',removePhoto);
if(fs)fs.addEventListener('change',e=>{if(e.target&&e.target.name===I.radio)setAudience(e.target.value);});
}
const cache=new Map();
let cacheFor='',inflight=null;
async function fetchPhotos(need){
const c=await client(),u=me();
if(!c|| !isReal(u)|| !(await sessionFor(c,keyOf(u))))return;
for(let i=0;i<need.length;i+=100){
const part=need.slice(i,i+100);
let r;try{r=await c.rpc('tw_photo_paths',{p_keys:part});}catch(e){r={error:e};}
if(cacheFor!==keyOf(me()))return;
if(r&&r.error){const exp=Date.now()+(missing(r.error)?60:5)*60*1000;part.forEach(k=>cache.set(k,{url:'',exp}));continue;}
const rows=(r&&r.data)||[],links=await signed(c,rows.map(x=>x.path).filter(Boolean));
if(cacheFor!==keyOf(me()))return;
part.forEach(k=>{
const row=rows.find(x=>low(x.owner_key)===k),url=row?links[row.path]||'':'';
cache.set(k,{url,exp:Date.now()+(url?LINK_SECS-120:5*60)*1000});
});
}
}
async function photosFor(keys){
const who=keyOf(me());
if(cacheFor!==who){cache.clear();cacheFor=who;}
keys=uniq(keys.map(low).filter(k=>KEY.test(k)&&k!==who));
while(inflight){try{await inflight;}catch(e){}}
const now=Date.now(),need=keys.filter(k=>{const h=cache.get(k);return!h||h.exp<now;});
if(need.length){inflight=fetchPhotos(need);try{await inflight;}catch(e){}finally{inflight=null;}}
const out={};
if(cacheFor===keyOf(me()))keys.forEach(k=>{const h=cache.get(k);if(h&&h.url)out[k]=h.url;});
return out;
}
function paint(el,url,label){
const want='url("'+url.replace(/["\\]/g,'')+'")';
if(el.style.backgroundImage!==want)el.style.backgroundImage=want;
el.classList.add('tw55-has-photo');
el.setAttribute('role','img');el.setAttribute('aria-label',label);
}
function unpaint(el){
if(!el.classList.contains('tw55-has-photo'))return;
el.classList.remove('tw55-has-photo');el.style.backgroundImage='';el.removeAttribute('role');el.removeAttribute('aria-label');
}
function applicants(){try{return typeof demoApplicants!=='undefined'&&Array.isArray(demoApplicants)?demoApplicants:[];}catch(e){return[];}}
function chatContacts(){try{return typeof msgAllContacts!=='undefined'&&Array.isArray(msgAllContacts)?msgAllContacts:[];}catch(e){return[];}}
function activeChat(){try{return typeof msgActiveContactId!=='undefined'?msgActiveContactId:null;}catch(e){return null;}}
function chatSpots(spots){
const list=chatContacts();if(!list.length)return;
const byId=id=>list.find(c=>c&&c.id===id)||null;
document.querySelectorAll('#msg-contacts-list .msg-contact').forEach(row=>{
const m= /openMsgChat\('([^']+)'\)/.exec(row.getAttribute('onclick')||''),c=m?byId(m[1]):null;
const el=row.querySelector('.msg-contact-avatar');
if(el&&c&&c.cloudKey)spots.push({el,key:low(c.cloudKey),name:c.name||'this person'});
});
document.querySelectorAll('#msg-contacts-list .tw47c-person').forEach(row=>{
const b=row.querySelector('[data-tw47c-add]'),el=row.querySelector('.msg-contact-avatar'),n=row.querySelector('.msg-contact-name');
if(b&&el)spots.push({el,key:low(b.getAttribute('data-tw47c-add')),name:(n&&n.textContent)||'this person'});
});
const head=document.querySelector('#msg-main-area .msg-header-avatar'),c=byId(activeChat());
if(head&&c&&c.cloudKey)spots.push({el:head,key:low(c.cloudKey),name:c.name||'this person'});
}
async function decorate(){
const u=me();if(!isReal(u))return;
const spots=[];
if(u.type==='parent'){
document.querySelectorAll('#page-parent [data-tw-photo-key]').forEach(el=>spots.push({el,key:low(el.getAttribute('data-tw-photo-key')),name:el.getAttribute('data-tw-photo-name')||'your teen'}));
}else if(u.type==='employer'){
const list=applicants();
document.querySelectorAll('#emp-kanban-board [ondragstart]').forEach(card=>{
const m= /_kDragging=(\d+)/.exec(card.getAttribute('ondragstart')||''),a=m?list[+m[1]]:null;
if(!a|| !a._jb|| !a._teenKey)return;
const nameEl=card.firstElementChild;if(!nameEl)return;
spots.push({el:nameEl.querySelector('.tw55-mini'),key:low(a._teenKey),name:a.name||'this applicant',card:nameEl});
});
}
chatSpots(spots);
if(!spots.length)return;
const urls=await photosFor(spots.map(s=>s.key));
if(me()!==u)return;
spots.forEach(s=>{
const url=urls[s.key];
if(s.card){
let mini=s.card.querySelector('.tw55-mini');
if(url&& !mini){mini=document.createElement('span');mini.className='tw55-mini';s.card.prepend(mini);s.card.classList.add('tw55-named');}
if(url)paint(mini,url,'Photo of '+s.name);else if(mini){mini.remove();s.card.classList.remove('tw55-named');}
}else if(url)paint(s.el,url,'Photo of '+s.name);else unpaint(s.el);
});
}
let queued=false;
function tick(){
queued=false;
const u=me(),role=roleOf(u);
if(!role)return;
const I=ids(role),page=$(I.page);
if(page&&page.classList.contains('active')){
wirePanel(role);current();
if(st.setup==='practice'||isPractice(u)){st.setup='practice';draw();}
else{
const tab=$(I.tab);
if(tab&&tab.classList.contains('active'))syncViewers().then(draw,()=>{});
else syncViewers().catch(()=>{});
draw();
}
}
decorate().catch(e=>console.warn('profile-photo',e));
}
const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(tick);}};
function watch(){
['page-teen','ttab-resume','page-parent','ptab-teens','page-employer','etab-profile'].forEach(id=>{const el=$(id);if(el&& !el.__tw55c){el.__tw55c=true;new MutationObserver(schedule).observe(el,{attributes:true,attributeFilter:['class']});}});
['emp-kanban-board','multi-teen-list','msg-contacts-list','msg-main-area'].forEach(id=>{const el=$(id);if(el&& !el.__tw55w){el.__tw55w=true;new MutationObserver(schedule).observe(el,{childList:true,subtree:true});}});
const ov=$('ptab-overview');if(ov&& !ov.__tw55w){ov.__tw55w=true;new MutationObserver(schedule).observe(ov,{childList:true,subtree:true});}
schedule();
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window._twPhotoV55={state:st,loadMine,syncViewers,upload,removePhoto,setAudience,photosFor,decorate,draw,squareJpeg,cache,readPeople};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/dob-start-v50.js */
try{
(function(){
var IDS={'su-age':1,'su-dob':1,'adm39-new-dob':1};
function startDate(){
var d=new Date();d.setFullYear(d.getFullYear()-14);
return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function release(el){if(el.getAttribute('data-tw-dob-max')){el.removeAttribute('max');el.removeAttribute('data-tw-dob-max');}}
document.addEventListener('focusin',function(e){
var el=e.target;
if(!el||el.type!=='date'|| !IDS[el.id]||el.value||el.hasAttribute('max'))return;
el.setAttribute('max',startDate());el.setAttribute('data-tw-dob-max','1');
});
document.addEventListener('input',function(e){if(e.target&&e.target.value)release(e.target);},true);
document.addEventListener('change',function(e){if(e.target&&e.target.type==='date')release(e.target);},true);
document.addEventListener('focusout',function(e){if(e.target&&e.target.type==='date')release(e.target);});
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/home-v51.js */
try{
(function(){
'use strict';
if(window.__twHomeV51)return;
window.__twHomeV51=true;
const STATS_FROM_JOBS=10;
const REVIEWS_FROM=3;
const PRO_KEY='tw_pro_banner_hidden';
const $=id=>document.getElementById(id);
const reduce=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
window.twGoEmployers=function(){
const landing=$('page-landing');
if(landing&& !landing.classList.contains('active')){try{gotoPage('landing');}catch(e){}}
const card=$('tw-for-employers');
if(!card)return;
setTimeout(()=>{
card.scrollIntoView({behavior:reduce()?'auto':'smooth',block:'center'});
try{card.focus({preventScroll:true});}catch(e){}
card.classList.add('tw51-flash');
setTimeout(()=>card.classList.remove('tw51-flash'),1800);
},0);
};
let proHiddenMem=false;
function proHidden(){try{return localStorage.getItem(PRO_KEY)==='1';}catch(e){return proHiddenMem;}}
function setProHidden(v){
proHiddenMem=v;
try{if(v)localStorage.setItem(PRO_KEY,'1');else localStorage.removeItem(PRO_KEY);}catch(e){}
}
function syncPro(){
const hidden=proHidden();
const banner=$('tw48-pro'),wrap=$('tw51-pro-show-wrap');
if(banner)banner.hidden=hidden;
if(wrap)wrap.hidden= !hidden;
}
window.twHideProInfo=function(){
setProHidden(true);syncPro();
try{$('tw51-pro-show').focus({preventScroll:true});}catch(e){}
};
window.twShowProInfo=function(){
setProHidden(false);syncPro();
const banner=$('tw48-pro');
if(!banner)return;
banner.scrollIntoView({behavior:reduce()?'auto':'smooth',block:'center'});
try{$('tw51-pro-close').focus({preventScroll:true});}catch(e){}
};
let openJobs=null;
function syncProof(){
const proof=$('tw48-proof');
if(!proof)return;
const stats=openJobs!=null&&openJobs>=STATS_FROM_JOBS;
proof.classList.toggle('tw51-no-stats',!stats);
proof.setAttribute('aria-label',stats?'Where TeenWork is today':'About TeenWork');
const reviews=$('tw48-reviews');
if(reviews)reviews.hidden=document.querySelectorAll('#tw49-reviews-feed .tw49-review').length<REVIEWS_FROM;
}
window.addEventListener('tw-public-counts',e=>{
const c=e.detail;
if(c&&typeof c==='object')openJobs=Math.max(0,parseInt(c.open_jobs,10)||0);
syncProof();
});
function boot(){
syncPro();
syncProof();
const feed=$('tw49-reviews-feed');
if(feed)new MutationObserver(syncProof).observe(feed,{childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/app-fixes-v51.js */
try{
(function(){
'use strict';
if(window.__twAppFixesV51)return;
window.__twAppFixesV51=true;
const SLOW_MS=8000;
const $=id=>document.getElementById(id);
const inDemo=()=> !!(window._twDemoSandbox&&window._twDemoSandbox.active);
function dropDemoNotes(){
if(inDemo())return;
document.querySelectorAll('.tw-welcome-note').forEach(n=>{if(/\bdemo\b/i.test(n.textContent||''))n.remove();});
}
const MENU_ITEMS='#twm-side button, #twm-bottom button, .mobile-nav button, .dash-tabs button, .dash-nav button';
document.addEventListener('click',e=>{
const overlay=$('msgModal');
if(!overlay||e.target!==overlay|| !e.isTrusted||(!e.clientX&& !e.clientY))return;
const x=e.clientX,y=e.clientY;
setTimeout(()=>{
overlay.classList.remove('open');
const under=document.elementFromPoint(x,y);
const item=under&&under.closest(MENU_ITEMS);
if(item)item.click();
},0);
},true);
function activity(){
try{if(typeof userActivity!=='undefined')return userActivity;}catch(e){}
return window.userActivity||null;
}
function wrapStreak(){
const prev=window.renderStreakBadge;
if(prev&&prev.__twV51)return;
const w=function(){
const r=typeof prev==='function'?prev.apply(this,arguments):undefined;
const el=$('teen-streak-badge');
if(!el)return r;
const a=activity()||{};
const streak=Number(a.streak)||0;
const started=streak>0||(Array.isArray(a.lessonsCompleted)&&a.lessonsCompleted.length>0)||
(Array.isArray(a.jobsAccepted)&&a.jobsAccepted.length>0);
el.hidden= !started;
if(streak>0)el.textContent='⚡ '+streak+' day streak';
return r;
};
w.__twV51=true;
window.renderStreakBadge=w;
}
const LOADING= /^(?:⏳\s*)?Loading\b[^\n]{0,80}$/i;
const SKIP='option, select, button, input, textarea, script, style, .twlm-status';
const seen=new Map(),done=new WeakSet();
function visible(el){return!!(el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');}
function placeholders(){
const out=[];
const snap=document.evaluate("//body//text()[contains(., 'Loading')]",document,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
for(let i=0;i<snap.snapshotLength;i++){
const el=snap.snapshotItem(i).parentElement;
if(!el||done.has(el)||el.closest(SKIP))continue;
if(LOADING.test((el.textContent||'').trim())&&visible(el))out.push(el);
}
return out;
}
function retry(el){
const panel=el.closest('[id^="ttab-"], [id^="ptab-"], [id^="etab-"]');
const btn=panel&&(document.querySelector('#twm-side [data-twm="'+panel.id+'"]')||
document.querySelector('#twm-bottom [data-twm="'+panel.id+'"]')||
document.querySelector('[onclick*="\''+panel.id+'\'"]'));
if(btn){btn.click();return;}
const admTab=el.closest('#page-admin, #tw-admin-panel')&&document.querySelector('.adm-tab.active');
if(admTab){admTab.click();return;}
location.reload();
}
function scan(){
const now=Date.now(),live=new Set(placeholders());
seen.forEach((t,el)=>{if(!live.has(el))seen.delete(el);});
live.forEach(el=>{
if(!seen.has(el)){seen.set(el,now);return;}
if(now-seen.get(el)<SLOW_MS)return;
seen.delete(el);done.add(el);
const note=document.createElement('span');
note.className='tw51-slow';
note.setAttribute('role','status');
note.innerHTML='This is taking longer than usual. Check your internet connection, then try again. ';
const b=document.createElement('button');
b.type='button';b.className='tw51-retry';b.textContent='Try again';
b.onclick=()=>{note.remove();done.delete(el);retry(el);};
note.append(b);
el.append(' ',note);
});
dropDemoNotes();
}
const st=document.createElement('style');
st.id='app-fixes-v51-css';
st.textContent=
'.tw51-slow{display:block;margin-top:.5rem;font-size:.85rem;line-height:1.5;color:var(--muted)}'+
'.tw51-retry{margin-left:.4rem;min-height:44px;padding:8px 14px;border:1.5px solid var(--green);border-radius:10px;background:transparent;color:var(--green);font:inherit;font-weight:700;cursor:pointer}'+
'#teen-streak-badge[hidden]{display:none !important}';
document.head.appendChild(st);
function boot(){
wrapStreak();
const badge=$('teen-streak-badge');
if(badge&& !(activity()||{}).streak)badge.hidden=true;
setInterval(scan,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window._twAppFixesV51={SLOW_MS,scan};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/share-v54.js */
try{
(function(){
'use strict';
if(window.__twShareV54)return;
window.__twShareV54=true;
var SITE='https://teenwork.ayaqd.com/';
var CODE_RE= /^[A-Z0-9]{6,10}$/;
var FROM_KEY='tw_ref_from';
var FROM_DAYS=60;
var NUDGE_AFTER_VISITS=3;
var $=function(id){return document.getElementById(id);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function toast(m,t){try{showToast(m,t||'info');}catch(e){}}
function lsGet(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}}
function lsSet(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function user(){try{return window.currentUser||(typeof currentUser!=='undefined'?currentUser:null)||null;}catch(e){return window.currentUser||null;}}
function isPractice(u){
if(!u)return false;
if(u.isDemo||u.twDemo)return true;
try{return typeof window._twIsDemoSandboxUser==='function'&& !!window._twIsDemoSandboxUser(u);}catch(e){return false;}
}
function isMember(u){return!!(u&& !u.isAdmin&&u.type!=='admin'&& /@/.test(String(u.email||''))&& !isPractice(u));}
function acctKey(u){return String(u.dataKey||u.email||'').toLowerCase();}
function dbLoad(k,d){try{return window._DB&&_DB.load?_DB.load(k,d):d;}catch(e){return d;}}
function dbSave(k,v){try{if(window._DB&&_DB.save)return _DB.save(k,v);}catch(e){}}
async function client(){
try{if(typeof _twCloudClient==='function')return await _twCloudClient(3000);}catch(e){}
try{return typeof sbClient!=='undefined'?sbClient:null;}catch(e){return null;}
}
var arrival=(function(){
var out={ref:'',share:''};
try{
var q=new URLSearchParams(location.search);
var ref=String(q.get('ref')||'').toUpperCase();
var share=String(q.get('share')||'');
if(CODE_RE.test(ref))out.ref=ref;
if(share)out.share=CODE_RE.test(share.toUpperCase())?share.toUpperCase():'1';
if(q.has('ref')||q.has('share')){
q.delete('ref');q.delete('share');
var s=q.toString();
history.replaceState(history.state,'',location.pathname+(s?'?'+s:'')+location.hash);
}
}catch(e){}
return out;
})();
if(arrival.ref&&arrival.ref!==lsGet('tw_ref_mine'))lsSet(FROM_KEY,{code:arrival.ref,at:Date.now()});
if(arrival.share&&arrival.share!=='1')lsSet('tw_ref_mine',arrival.share);
function newCode(){
var abc='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',out='';
var buf=new Uint32Array(8);
try{crypto.getRandomValues(buf);}catch(e){for(var i=0;i<8;i++)buf[i]=Math.floor(Math.random()*4294967296);}
for(var j=0;j<8;j++)out+=abc[buf[j]%abc.length];
return out;
}
function myCode(create){
var u=user();
if(!isMember(u))return'';
var c=String(dbLoad('ref_code','')||'').toUpperCase();
if(!CODE_RE.test(c)&&create){c=newCode();dbSave('ref_code',c);}
if(CODE_RE.test(c)){lsSet('tw_ref_mine',c);return c;}
return'';
}
function linkFor(code){return SITE+(code&&CODE_RE.test(code)?'?ref='+code:'');}
function shareCodeForSheet(){return myCode(true)||(arrival.share&&arrival.share!=='1'?arrival.share:'');}
var audience='';
function message(role){
if(role==='hire')return'Could you use a hand with yard work, pet care, snow shoveling or other odd jobs? On TeenWork, neighbors and local businesses post small jobs for teens 13–17, and a parent approves every application. Posting a job is free:';
if(role==='employer')return'Hiring teens for local jobs? TeenWork connects you with teens 13–17, and a parent approves every application. It’s free to post a job:';
if(role==='parent')return'TeenWork helps teens 13–17 find safe local jobs, and parents approve every application. Free for teens and parents:';
if(role==='teen')return'I’m using TeenWork to find local jobs like lawn care, pet sitting and babysitting. It’s free for teens 13–17 and a parent approves every application:';
return'TeenWork is a free app that helps teens 13–17 find safe local jobs, with a parent approving every application:';
}
function payload(){
var u=user(),role=audience==='employer'?'hire':(u&& !u.isAdmin?u.type:'');
var url=linkFor(shareCodeForSheet());
return{title:audience==='employer'?'Post a job for local teens on TeenWork':'TeenWork — safe local jobs for teens',text:message(role),url:url};
}
async function joinedCount(code){
if(!CODE_RE.test(code))return null;
var c=await client();if(!c)return null;
try{
var r=await c.rpc('tw_referral_count',{p_code:code});
if(r&& !r.error&&typeof r.data==='number')return r.data;
}catch(e){}
try{
var q=await c.from('user_data').select('email',{count:'exact',head:true}).eq('key','referred_by').eq('value',JSON.stringify(code));
if(q&& !q.error&&typeof q.count==='number')return q.count;
}catch(e){}
return null;
}
var lastFocus=null;
function close(){
var m=$('tw54-share');if(!m)return;
m.remove();
document.removeEventListener('keydown',onKey,true);
if(lastFocus&&lastFocus.focus)try{lastFocus.focus({preventScroll:true});}catch(e){}
lastFocus=null;
}
function onKey(e){
var m=$('tw54-share');if(!m)return;
if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
if(e.key==='Tab'){
var f=[].slice.call(m.querySelectorAll('button, a[href], input')).filter(function(el){return el.offsetParent!==null;});
if(!f.length)return;
var first=f[0],last=f[f.length-1];
if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
}
}
async function copy(text){
try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true;}}catch(e){}
try{
var ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');
ta.style.cssText='position:fixed;top:-1000px;opacity:0';document.body.appendChild(ta);ta.select();
var ok=document.execCommand('copy');ta.remove();return ok;
}catch(e){return false;}
}
function openSheet(opts){
close();
opts=opts||{};
lastFocus=document.activeElement;
var p=payload(),full=p.text+' '+p.url;
var u=user(),member=isMember(u),code=member?myCode(true):'';
var enc=encodeURIComponent;
var m=document.createElement('div');
m.id='tw54-share';
m.className='tw54-share';
m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','tw54-share-title');
m.innerHTML=
'<div class="tw54-share-card">'+
'<button type="button" class="tw54-x" data-tw54="close" aria-label="Close">✕</button>'+
'<h2 id="tw54-share-title">'+(audience==='employer'?'🏡 Ask someone to post a job':'📣 Share TeenWork')+'</h2>'+
'<p class="tw54-lead">'+esc(audience==='employer'?'Know a neighbor, family friend or local business who could use a hand? Send them TeenWork. Posting a job is free.':member&&u.type==='employer'?'Know another business that hires teens? Send them TeenWork.':'Know a teen, a parent or a local business who’d like TeenWork? It’s free for them too.')+'</p>'+
'<div class="tw54-link"><input id="tw54-link-input" type="text" readonly value="'+esc(p.url)+'" aria-label="Your share link">'+
'<button type="button" class="tw54-copy" data-tw54="copy">Copy link</button></div>'+
'<div class="tw54-grid">'+
'<a class="tw54-btn" data-tw54="sms" href="sms:?&body='+enc(full)+'"><span aria-hidden="true">💬</span>Text message</a>'+
'<a class="tw54-btn" data-tw54="email" href="mailto:?subject='+enc(audience==='employer'?'Could you post a job on TeenWork?':'Have you seen TeenWork?')+'&body='+enc(p.text+'\n\n'+p.url)+'"><span aria-hidden="true">✉️</span>Email</a>'+
'<a class="tw54-btn" data-tw54="whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text='+enc(full)+'"><span aria-hidden="true">🟢</span>WhatsApp</a>'+
'<a class="tw54-btn" data-tw54="facebook" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u='+enc(p.url)+'"><span aria-hidden="true">📘</span>Facebook</a>'+
(navigator.share?'<button type="button" class="tw54-btn" data-tw54="more"><span aria-hidden="true">⋯</span>More…</button>':'')+
'</div>'+
(member?inviteForm():'')+
(member?'<p class="tw54-count" id="tw54-count" aria-live="polite">'+(code?'Checking who joined with your link…':'')+'</p>':'')+
'<p class="tw54-small">'+(member?'Your link has a short code so we can count who joins. It never shows your name or email.':'Sign up to get your own link and see how many people join with it.')+'</p>'+
'</div>';
m.addEventListener('mousedown',function(e){if(e.target===m)close();});
m.addEventListener('click',function(e){
var t=e.target.closest('[data-tw54]');if(!t)return;
var what=t.getAttribute('data-tw54');
if(what==='close'){close();return;}
if(what==='copy'){
e.preventDefault();
copy(p.url).then(function(ok){
t.textContent=ok?'Copied ✓':'Select & copy';
if(!ok){var inp=$('tw54-link-input');if(inp){inp.focus();inp.select();}}
if(ok)toast('🔗 Link copied. Paste it anywhere to share TeenWork.','success');
});
return;
}
if(what==='more'){e.preventDefault();nativeShare(p).then(function(r){if(r==='shared')close();});return;}
remember(what);
});
var form=m.querySelector('#tw54-invite');
if(form)form.addEventListener('submit',function(e){e.preventDefault();sendInvite(form);});
document.body.appendChild(m);
document.addEventListener('keydown',onKey,true);
var first=m.querySelector('.tw54-copy');if(first)try{first.focus({preventScroll:true});}catch(e){}
if(member&&code)joinedCount(code).then(function(n){
var el=$('tw54-count');if(!el)return;
if(n==null){el.textContent='';return;}
el.textContent=n===0?'Nobody has joined with your link yet. Send it to a friend!':(n===1?'🎉 1 person joined TeenWork with your link. Thank you!':'🎉 '+n+' people joined TeenWork with your link. Thank you!');
});
remember('open:'+(opts.source||''));
}
var INVITES_PER_DAY=5,INVITE_AGAIN_DAYS=30;
var EMAIL_RE= /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
function inviteKey(u){return'tw54_invites_'+acctKey(u).replace(/[^a-z0-9]/g,'_');}
function hashAddr(a){var h=2166136261;a=String(a).toLowerCase();for(var i=0;i<a.length;i++){h^=a.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(36);}
function inviteState(u){
var s=lsGet(inviteKey(u))||{},today=new Date().toISOString().slice(0,10),cut=Date.now()-INVITE_AGAIN_DAYS*864e5;
if(s.day!==today){s.day=today;s.n=0;}
s.sent=(Array.isArray(s.sent)?s.sent:[]).filter(function(x){return x&&x.at>cut;});
return s;
}
function inviteForm(){
var left=Math.max(0,INVITES_PER_DAY-inviteState(user()).n);
return'<form class="tw54-invite" id="tw54-invite" novalidate>'+
'<label for="tw54-inv-to">✉️ Invite a friend by email</label>'+
'<div class="tw54-link"><input id="tw54-inv-to" type="email" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="120" placeholder="friend@example.com" aria-describedby="tw54-inv-msg">'+
'<button type="submit" class="tw54-copy tw54-inv-send">Send invite</button></div>'+
'<p class="tw54-inv-msg" id="tw54-inv-msg" role="status" aria-live="polite">TeenWork emails them your link. '+left+' invite'+(left===1?'':'s')+' left today.</p>'+
'</form>';
}
function firstName(u){return String((u&&(u.firstName||u.name))||'').trim().split(/\s+/)[0].replace(/[^\p{L}\p{M}'’-]/gu,'').slice(0,30);}
function inviteEmail(u,link){
var name=firstName(u),who=name?esc(name):'A friend';
var about=u.type==='employer'||audience==='employer'
?'TeenWork connects local businesses and neighbors with teens 13&ndash;17 for small jobs. A parent approves every application, and posting a job is free.'
:'TeenWork helps teens 13&ndash;17 find safe local jobs like lawn care, pet sitting and snow shoveling. A parent approves every application, and chats with employers stay inside the app. It&rsquo;s free for teens and parents.';
var html=
'<p>Hi there,</p>'+
'<p><strong>'+who+'</strong> thinks you&rsquo;d like TeenWork and sent you this invite.</p>'+
'<p>'+about+'</p>'+
'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 8px;"><tr><td bgcolor="#2d6a4f" style="background:#2d6a4f;border-radius:12px;">'+
'<a href="'+esc(link)+'" style="display:inline-block;padding:14px 26px;font-family:\'DM Sans\',Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">See TeenWork</a>'+
'</td></tr></table>'+
'<p style="font-size:13px;color:#4b5563;">You got this email because '+who+' typed your address into TeenWork. We won&rsquo;t email you again unless you sign up.</p>';
return{
subject:(name?name+' invited you to TeenWork':'You’re invited to TeenWork'),
html:html,
text:(name?name:'A friend')+' thinks you’d like TeenWork. '+message(audience==='employer'?'hire':u.type)+' '+link
};
}
function inviteMsg(form,text,kind,mailto){
var el=form.querySelector('#tw54-inv-msg');if(!el)return;
el.className='tw54-inv-msg'+(kind?' tw54-inv-'+kind:'');
el.textContent=text;
if(mailto){
var a=document.createElement('a');a.href=mailto;a.textContent='Send it from your email app instead';
a.addEventListener('click',function(){remember('invite_app');});
el.appendChild(document.createTextNode(' '));el.appendChild(a);
}
}
function sendInvite(form){
var u=user();if(!isMember(u))return;
var input=form.querySelector('#tw54-inv-to'),btn=form.querySelector('.tw54-inv-send');
var to=String(input.value||'').trim().toLowerCase();
var mine=String(u.email||'').toLowerCase().split('#')[0];
if(!EMAIL_RE.test(to)){inviteMsg(form,'That doesn’t look like an email address.','warn');input.focus();return;}
if(to===mine){inviteMsg(form,'That’s your own email. Try a friend’s.','warn');input.focus();return;}
if((window.twIsTeamInbox&&window.twIsTeamInbox(to))||TEAM.indexOf(to)>=0){inviteMsg(form,'That’s the TeenWork team’s address. Try a friend’s.','warn');input.focus();return;}
var st=inviteState(u),h=hashAddr(to);
if(st.sent.some(function(x){return x.h===h;})){inviteMsg(form,'You already invited them this month.','warn');return;}
if(st.n>=INVITES_PER_DAY){inviteMsg(form,'You’ve sent '+INVITES_PER_DAY+' invites today. You can send more tomorrow.','warn');return;}
var link=linkFor(myCode(true)),mail=inviteEmail(u,link);
var mailto='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(mail.subject)+'&body='+encodeURIComponent(mail.text);
if(typeof window.twSendViaResend!=='function'){inviteMsg(form,'TeenWork can’t send email invites right now.','warn',mailto);return;}
var params={to_email:to,to_name:'',from_name:'TeenWork',reply_to:'',subject:mail.subject,message:mail.html,
tw_heading:'You’re invited to TeenWork',tw_icon:'📣',tw_preheader:(firstName(u)||'A friend')+' thinks you’d like TeenWork.',tw_share:false};
try{if(typeof window.twBrandEmailParams==='function')params=window.twBrandEmailParams(params);}catch(e){}
btn.disabled=true;var label=btn.textContent;btn.textContent='Sending…';
inviteMsg(form,'Sending…');
window.twSendViaResend(params).then(function(){
var s2=inviteState(u);s2.n+=1;s2.sent.push({h:h,at:Date.now()});lsSet(inviteKey(u),s2);
remember('invite');
input.value='';
var left=Math.max(0,INVITES_PER_DAY-s2.n);
inviteMsg(form,'✓ Invite sent to '+to+'. Thank you for sharing TeenWork! '+left+' left today.','ok');
},function(err){
var code=err&&err.code;
inviteMsg(form,code==='rate_limited'||code==='limit'?'TeenWork has sent a lot of emails today. Try again later, or':'TeenWork can’t send email invites right now.','warn',mailto);
}).then(function(){btn.disabled=false;btn.textContent=label;});
}
function remember(what){
var u=user();if(!isMember(u))return;
try{
var s=dbLoad('share_stats',null);if(!s||typeof s!=='object')s={};
var k=String(what).split(':')[0];
s[k]=(Number(s[k])||0)+1;s.last=new Date().toISOString();
dbSave('share_stats',s);
}catch(e){}
}
function nativeShare(p){
if(!navigator.share)return Promise.resolve('unsupported');
return navigator.share({title:p.title,text:p.text,url:p.url}).then(function(){remember('native');return'shared';},function(e){
return e&&e.name==='AbortError'?'cancelled':'failed';
});
}
function phoneLike(){try{return matchMedia('(pointer: coarse)').matches&&Math.min(screen.width,screen.height)<900;}catch(e){return false;}}
window.twShare=function(opts){
opts=opts||{};
audience=opts.audience==='employer'?'employer':'';
try{if(window.twCleanMenu&&window.twCleanMenu.close)window.twCleanMenu.close(true);}catch(e){}
if(navigator.share&&phoneLike()&& !opts.sheet&& !isMember(user())){
remember('open:'+(opts.source||''));
return nativeShare(payload()).then(function(r){if(r==='failed')openSheet(opts);return r;});
}
openSheet(opts);
return Promise.resolve('sheet');
};
window.twShareLink=function(){return linkFor(shareCodeForSheet());};
window.twShareCode=function(){return myCode(true);};
window.twShareClose=close;
window.openReferral=function(){window.twShare({source:'refer',sheet:true});};
window.copyReferralCode=function(){window.twShare({source:'refer',sheet:true});};
window._twShareNative=function(){window.twShare({source:'rate'});};
window._twShareCopy=function(){copy(window.twShareLink()).then(function(ok){toast(ok?'🔗 Link copied. Paste it anywhere to share TeenWork.':'Copy the link: '+window.twShareLink(),ok?'success':'info');});};
function recordReferral(){
var u=user();if(!isMember(u))return;
var from=lsGet(FROM_KEY);
if(!from|| !CODE_RE.test(String(from.code||''))||Date.now()-Number(from.at||0)>FROM_DAYS*864e5){lsSet(FROM_KEY,null);return;}
if(dbLoad('referred_by','')){lsSet(FROM_KEY,null);return;}
if(String(from.code)===String(dbLoad('ref_code',''))){lsSet(FROM_KEY,null);return;}
dbSave('referred_by',String(from.code));
lsSet(FROM_KEY,null);
}
(function wrapSignup(){
var o=window._adminTrackSignup;
if(typeof o!=='function'||o.__tw54)return;
var w=function(){var r=o.apply(this,arguments);try{setTimeout(recordReferral,300);}catch(e){}return r;};
w.__tw54=true;
Object.keys(o).forEach(function(k){try{w[k]=o[k];}catch(e){}});
if(o.__twPlan)w.__twPlan=true;
window._adminTrackSignup=w;
})();
var TEAM=['ayaquarrierdraper@gmail.com','aqdteenwork@gmail.com'];
var FRIENDLY= /welcome to teenwork|approved your teenwork link|now linked with|letter of recommendation|you gave parent consent/i;
window.twEmailShareBlock=function(p,C,FONT){
try{
p=p||{};
if(p.tw_share===false)return'';
var to=String(p.to_email||'').trim().toLowerCase();
if(!to||TEAM.indexOf(to)>=0)return'';
if(p.tw_share!==true&& !FRIENDLY.test(String(p.subject||'')))return'';
var u=user(),code='';
if(isMember(u)&&String(u.email||'').toLowerCase()===to)code=myCode(true);
var link=SITE+'?share='+(code||'1');
return'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="'+C.amberPale+'" style="width:100%;margin:26px 0 4px;background:'+C.amberPale+';border:1px solid #f6d7ae;border-radius:14px;">'+
'<tr><td style="padding:18px 20px;font-family:'+FONT+';">'+
'<div style="font-size:16px;font-weight:bold;color:'+C.amberText+';">&#128227; Know someone who&rsquo;d like TeenWork?</div>'+
'<div style="font-size:14px;line-height:1.55;color:'+C.text+';margin:6px 0 14px;">Share it with a friend, a parent or a local business. It&rsquo;s free for teens and parents, and every share helps more teens find safe local work.</div>'+
'<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="'+C.amber+'" style="background:'+C.amber+';border-radius:10px;">'+
'<a href="'+esc(link)+'" style="display:inline-block;padding:11px 20px;font-family:'+FONT+';font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">Share TeenWork</a>'+
'</td></tr></table>'+
'<div style="font-size:12px;color:'+C.muted+';margin-top:10px;">Or just forward this email.</div>'+
'</td></tr></table>';
}catch(e){return'';}
};
function nudgeKey(u){return'tw54_share_nudge_'+acctKey(u).replace(/[^a-z0-9]/g,'_');}
function maybeNudge(){
var u=user();if(!isMember(u))return;
var k=nudgeKey(u),st=lsGet(k)||{visits:0,done:false};
if(st.done)return;
st.visits=(Number(st.visits)||0)+1;lsSet(k,st);
if(st.visits<NUDGE_AFTER_VISITS)return;
setTimeout(function(){
var page=document.querySelector('.page.active'),dash=page&&page.querySelector('.dashboard');
var home=dash&&dash.querySelector(':scope > .tab-panel');
if(!home||dash.querySelector('.tw54-share-note'))return;
var note=document.createElement('div');
note.className='tw54-share-note';
note.setAttribute('role','note');
note.innerHTML='<p><b>📣 Enjoying TeenWork?</b> Share it with a friend. It’s free for them too.</p>'+
'<button type="button" class="tw54-note-share">Share</button>'+
'<button type="button" class="tw54-note-x" aria-label="Don’t show this again">×</button>';
function finish(){var s=lsGet(k)||{};s.done=true;lsSet(k,s);note.remove();}
note.querySelector('.tw54-note-share').onclick=function(){finish();window.twShare({source:'nudge'});};
note.querySelector('.tw54-note-x').onclick=finish;
home.insertBefore(note,home.firstChild);
},2500);
}
(function wrapLaunch(){
var o=window.launchDashboard;
if(typeof o!=='function'||o.__tw54)return;
var w=function(){var r=o.apply(this,arguments);try{maybeNudge();}catch(e){}return r;};
w.__tw54=true;
Object.keys(o).forEach(function(k){try{w[k]=o[k];}catch(e){}});
window.launchDashboard=w;
})();
if(arrival.share){
var openFromEmail=function(){setTimeout(function(){window.twShare({source:'email',sheet:true});},700);};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',openFromEmail);else openFromEmail();
}
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/get-app-v57.js */
try{
(function(){
'use strict';
if(window.__twGetAppV57)return;
window.__twGetAppV57=true;
var SITE='https://teenwork.ayaqd.com/';
var APP_LINK=SITE+'?app=1';
var INSTALLED='tw57_app_installed';
var NUDGE_GAP_DAYS=14;
var T={first:4000,retry:10000,giveUp:120000};
var UUID_RE= /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var $=function(id){return document.getElementById(id);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function toast(m,t){try{showToast(m,t||'info');}catch(e){}}
function lsGet(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}}
function lsSet(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function user(){try{return window.currentUser||(typeof currentUser!=='undefined'?currentUser:null)||null;}catch(e){return window.currentUser||null;}}
function isPractice(u){
if(!u)return false;
if(u.isDemo||u.twDemo||window.twDemo||(window._twDemoSandbox&&window._twDemoSandbox.active))return true;
if(/@teenwork\.demo$/i.test(String(u.email||'')))return true;
try{return typeof window._twIsDemoSandboxUser==='function'&& !!window._twIsDemoSandboxUser(u);}catch(e){return false;}
}
function isMember(u){return!!(u&& !u.isAdmin&&u.type!=='admin'&& /^(teen|parent|employer)$/.test(u.type)&& /@/.test(String(u.email||''))&& !isPractice(u));}
function acctKey(u){return String((u&&(u.dataKey||u.email))||'').toLowerCase();}
function slug(k){return String(k).replace(/[^a-z0-9]/g,'_');}
async function client(){
try{if(typeof _twCloudClient==='function')return await _twCloudClient(3000);}catch(e){}
try{return typeof sbClient!=='undefined'?sbClient:null;}catch(e){return null;}
}
var deferred=null;
window.addEventListener('beforeinstallprompt',function(e){
e.preventDefault();
deferred=e;
refresh();
});
window.addEventListener('appinstalled',function(){markInstalled();refresh();});
function standalone(){
try{
return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||
matchMedia('(display-mode: minimal-ui)').matches||matchMedia('(display-mode: window-controls-overlay)').matches||
navigator.standalone===true|| /^android-app:\/\//.test(document.referrer||'');
}catch(e){return false;}
}
function installed(){return standalone()||lsGet(INSTALLED)===true;}
function device(){
var ua=navigator.userAgent||'';
var ios= /iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
var android= /Android/i.test(ua);
var inApp= /Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|musical_ly|Bytedance|Line\/|Pinterest|LinkedInApp|GSA\//.test(ua);
var browser=
ios?(/CriOS/.test(ua)?'chrome': /EdgiOS/.test(ua)?'edge': /FxiOS/.test(ua)?'firefox': /OPiOS|OPT\//.test(ua)?'opera': /Safari/.test(ua)?'safari':'other')
: /SamsungBrowser/.test(ua)?'samsung'
: /Edg(e|A)?\//.test(ua)?'edge'
: /OPR\/|Opera/.test(ua)?'opera'
: /Firefox\//.test(ua)?'firefox'
: /Chrome\/|Chromium\//.test(ua)?'chrome'
: /Safari\//.test(ua)?'safari'
:'other';
var phone=ios||android|| /Mobi/i.test(ua);
return{ios:ios,ipad:ios&& !/iPhone|iPod/.test(ua),android:android,phone:phone,computer: !phone,inApp:inApp,browser:browser};
}
function markInstalled(){
lsSet(INSTALLED,true);
reportInstalled();
}
var reporting=false;
function reportInstalled(){
var u=user();
if(!isMember(u)||reporting|| !installed())return;
var key='tw57_app_reported_'+slug(acctKey(u));
if(Date.now()-(Number(lsGet(key))||0)<7*864e5)return;
reporting=true;
client().then(function(c){
if(!c||typeof c.rpc!=='function')return;
return Promise.resolve(c.rpc('tw_app_installed')).then(function(r){if(r&& !r.error&&r.data)lsSet(key,Date.now());});
}).catch(function(){}).then(function(){reporting=false;});
}
var ICON={
share:'<svg class="tw57-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
add:'<svg class="tw57-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
dots:'<span class="tw57-key" aria-hidden="true">⋮</span>',
install:'<svg class="tw57-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v6M9.5 11 12 13.5 14.5 11M8 20.5h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
function b(t){return'<b>'+t+'</b>';}
function howTo(d){
var out={button:'',steps:[],note:''};
if(deferred){
out.button=d.computer?'💻 Install on this computer':'📲 Download the app';
out.note=d.computer?'Your browser asks you to confirm. TeenWork then opens in its own window.':'Your phone asks you to confirm. TeenWork then shows up on your home screen.';
return out;
}
if(d.inApp){
out.lead='You opened TeenWork inside another app, which can’t add apps to your phone.';
out.steps=[
'Tap the '+b('⋯')+' or menu button in the corner of this screen.',
'Choose '+b(d.ios?'Open in Safari':'Open in browser')+' (or '+b('Open in Chrome')+').',
'Tap '+b('Download the app')+' again there.'
];
out.copy=true;
return out;
}
if(d.ios){
if(d.browser==='safari'){
out.steps=[
'Tap the '+b('Share')+' button '+ICON.share+(d.ipad?' at the top of Safari.':' at the bottom of Safari.'),
'Scroll down and tap '+b('Add to Home Screen')+' '+ICON.add+'.',
'Tap '+b('Add')+'. TeenWork is now on your home screen.'
];
}else{
out.steps=[
'Tap the '+b('Share')+' button '+ICON.share+(d.browser==='chrome'?' next to the address bar.':' (it may be in the '+b('⋯')+' menu).'),
'Tap '+b('Add to Home Screen')+' '+ICON.add+'. You may need to tap '+b('More')+' first.',
'Tap '+b('Add')+'.'
];
out.note='Don’t see it? Open teenwork.ayaqd.com in Safari and try there.';
}
return out;
}
if(d.android){
if(d.browser==='samsung'){
out.steps=['Tap the menu '+b('☰')+' at the bottom of the screen.','Tap '+b('Add page to')+', then '+b('Home screen')+'.','Tap '+b('Add')+'.'];
}else if(d.browser==='firefox'){
out.steps=['Tap the menu '+ICON.dots+' next to the address bar.','Tap '+b('Install')+' or '+b('Add to Home screen')+'.','Tap '+b('Add')+'.'];
}else{
out.steps=['Tap the menu '+ICON.dots+' at the top right.','Tap '+b('Install app')+' or '+b('Add to Home screen')+'.','Tap '+b('Install')+'.'];
}
return out;
}
if(d.browser==='chrome')out.steps=['Click the install icon '+ICON.install+' at the right end of the address bar.','Or open the menu '+ICON.dots+', then '+b('Cast, save and share')+' → '+b('Install page as app')+'.'];
else if(d.browser==='edge')out.steps=['Open the menu '+b('⋯')+' at the top right.','Choose '+b('Apps')+' → '+b('Install this site as an app')+'.'];
else if(d.browser==='safari')out.steps=['In the menu bar, choose '+b('File')+' → '+b('Add to Dock')+'.'];
else out.note=(d.browser==='firefox'?'Firefox can’t install apps on computers. ':'')+'To install TeenWork on a computer, open it in Chrome or Edge.';
return out;
}
function leadFor(u){
var t=u&&u.type;
if(t==='teen')return'Find jobs, answer messages and log your hours in one tap.';
if(t==='parent')return'See your teen’s job requests and alerts in one tap.';
if(t==='employer')return'Post jobs and answer applicants in one tap.';
return'Safe local jobs for teens, one tap from your home screen.';
}
var lastFocus=null,current=null;
function close(){
var m=$('tw57-app');if(!m)return;
m.remove();
document.removeEventListener('keydown',onKey,true);
document.body.classList.remove('tw57-open');
current=null;
if(lastFocus&&lastFocus.focus)try{lastFocus.focus({preventScroll:true});}catch(e){}
lastFocus=null;
}
function onKey(e){
var m=$('tw57-app');if(!m)return;
if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
if(e.key==='Tab'){
var f=[].slice.call(m.querySelectorAll('button, a[href], input')).filter(function(el){return el.offsetParent!==null&& !el.disabled;});
if(!f.length)return;
var first=f[0],last=f[f.length-1];
if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
}
}
function body(opts){
var d=device(),u=user(),member=isMember(u);
if(standalone()){
return'<div class="tw57-done"><p class="tw57-big">✓ You’re using the TeenWork app.</p><p>It opens from your home screen like any other app. You can close this.</p></div>';
}
if(opts.justInstalled){
return'<div class="tw57-done"><p class="tw57-big">🎉 TeenWork is installed.</p><p>'+(d.computer?'Open it from your Start menu, Dock or desktop next time.':'Next time, open it from your home screen.')+' Sign in with the same email and password.</p></div>';
}
var h=howTo(d),html='';
html+='<ul class="tw57-pills" aria-label="About the app"><li>Free</li><li>No app store</li><li>Same account</li></ul>';
if(h.lead)html+='<p class="tw57-warn">'+esc(h.lead)+'</p>';
if(h.button)html+='<button type="button" class="tw57-go" data-tw57="install">'+esc(h.button)+'</button>';
if(h.steps.length){
html+=(d.computer&& !h.button?'<h3 class="tw57-h">On this computer</h3>':(h.button?'':'<h3 class="tw57-h">'+(d.ios?'Add it to your home screen':'Install it')+'</h3>'));
html+='<ol class="tw57-steps">'+h.steps.map(function(s){return'<li>'+s+'</li>';}).join('')+'</ol>';
}
if(h.copy)html+='<button type="button" class="tw57-alt" data-tw57="copy">🔗 Copy the TeenWork link</button>';
if(h.note)html+='<p class="tw57-small">'+esc(h.note)+'</p>';
if(d.computer){
html+='<div class="tw57-phone"><img class="tw57-qr" src="assets/img/get-app-qr.svg" width="132" height="132" alt="QR code that opens teenwork.ayaqd.com">'+
'<div><h3 class="tw57-h">📱 On your phone</h3><p>Point your phone’s camera at the code, then tap <b>Download the app</b>. Or open <b>teenwork.ayaqd.com</b> on your phone.</p>'+
(member?'<button type="button" class="tw57-alt" data-tw57="email">✉️ Email me the link</button><p class="tw57-small" id="tw57-email-msg" role="status" aria-live="polite"></p>':'')+
'</div></div>';
}
if(!h.button)html+='<p class="tw57-small">Then sign in with the same email and password. It’s the same TeenWork: your account, jobs and messages are all there.</p>';
if(opts.nudge)html+='<div class="tw57-foot"><button type="button" class="tw57-later" data-tw57="later">Not now</button><button type="button" class="tw57-never" data-tw57="never">Don’t ask again</button></div>';
return html;
}
function open(opts){
opts=opts||{};
var had=$('tw57-app');
if(had)had.remove();else lastFocus=document.activeElement;
current=opts;
var u=user();
var m=document.createElement('div');
m.id='tw57-app';
m.className='tw57-app'+(opts.nudge?' tw57-is-nudge':'');
m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','tw57-title');
m.innerHTML=
'<div class="tw57-card">'+
'<button type="button" class="tw57-x" data-tw57="close" aria-label="Close">✕</button>'+
'<div class="tw57-head"><img class="tw57-logo" src="assets/img/small-logo.png" width="52" height="52" alt="">'+
'<div><h2 id="tw57-title">Get the TeenWork app</h2><p class="tw57-lead">'+esc(leadFor(u))+'</p></div></div>'+
'<div class="tw57-body" id="tw57-body">'+body(opts)+'</div>'+
'</div>';
m.addEventListener('mousedown',function(e){if(e.target===m)close();});
m.addEventListener('click',onClick);
document.body.appendChild(m);
document.body.classList.add('tw57-open');
document.addEventListener('keydown',onKey,true);
var first=m.querySelector('.tw57-go')||m.querySelector('.tw57-x');
if(first)try{first.focus({preventScroll:true});}catch(e){}
return true;
}
function refresh(){
syncButtons();
var bd=$('tw57-body');
if(bd&&current)bd.innerHTML=body(current);
}
function onClick(e){
var t=e.target.closest('[data-tw57]');if(!t)return;
var what=t.getAttribute('data-tw57');
if(what==='close'||what==='later'){close();return;}
if(what==='never'){noteNudge({never:true});close();toast('OK, we won’t ask again. “Download the app” is in the menu any time.','info');return;}
if(what==='install'){promptInstall();return;}
if(what==='copy'){
copy(SITE).then(function(ok){t.textContent=ok?'✓ Link copied. Paste it in your browser.':'teenwork.ayaqd.com';});
return;
}
if(what==='email'){emailLink(t);return;}
}
function promptInstall(){
var p=deferred;if(!p){refresh();return;}
deferred=null;
try{p.prompt();}catch(e){refresh();return;}
Promise.resolve(p.userChoice).then(function(r){
if(r&&r.outcome==='accepted'){
markInstalled();
if(current&&current.nudge)noteNudge({never:true});
if($('tw57-app')){current=Object.assign({},current,{justInstalled:true,nudge:false});refresh();}
toast('🎉 TeenWork is installed.','success');
}else{
refresh();
}
}).catch(function(){refresh();});
}
async function copy(text){
try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true;}}catch(e){}
try{
var ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');
ta.style.cssText='position:fixed;top:-1000px;opacity:0';document.body.appendChild(ta);ta.select();
var ok=document.execCommand('copy');ta.remove();return ok;
}catch(e){return false;}
}
function emailLink(btn){
var u=user(),msg=$('tw57-email-msg');
var say=function(s){if(msg)msg.textContent=s;};
if(!isMember(u))return;
var key='tw57_app_emailed_'+slug(acctKey(u));
if(Date.now()-(Number(lsGet(key))||0)<864e5){say('We already emailed you the link today. Check your inbox (and spam).');return;}
if(typeof window.twSendEmail!=='function'){say('Email isn’t available right now. Open teenwork.ayaqd.com on your phone instead.');return;}
var name=String(u.firstName||u.name||'').trim().split(/\s+/)[0].replace(/[^\p{L}\p{M}'’-]/gu,'').slice(0,30);
var html=
'<p>Hi '+esc(name||'there')+',</p>'+
'<p>Here’s your link to put TeenWork on your phone. Open this email on your phone and tap the button:</p>'+
'<p style="text-align:center;margin:22px 0;"><a href="'+APP_LINK+'" style="display:inline-block;background:#2d6a4f;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:12px;">📲 Get the TeenWork app</a></p>'+
'<p><b>iPhone:</b> open it in Safari, tap the Share button, then <b>Add to Home Screen</b>.<br><b>Android:</b> open it in Chrome, then tap <b>Install app</b> (or menu ⋮ → <b>Add to Home screen</b>).</p>'+
'<p>Then sign in with the same email and password. It’s free, with no app store.</p>';
btn.disabled=true;say('Sending…');
Promise.resolve(window.twSendEmail(u.email,'📲 Your TeenWork app link',html,{heading:'Put TeenWork on your phone',icon:'&#128242;',preheader:'Open this on your phone and tap the button. Free, no app store.'}))
.then(function(ok){
btn.disabled=false;
if(ok===false){say('That didn’t send. Open teenwork.ayaqd.com on your phone instead.');return;}
lsSet(key,Date.now());
say('Sent to '+u.email+'. Open it on your phone.');
},function(){btn.disabled=false;say('That didn’t send. Open teenwork.ayaqd.com on your phone instead.');});
}
function nudgeKey(u){return'tw57_app_nudge_'+slug(acctKey(u));}
function nudgeState(u){var s=lsGet(nudgeKey(u));return s&&typeof s==='object'?s:{n:0,last:0,never:false};}
function noteNudge(o){
var u=user();if(!isMember(u))return;
var s=nudgeState(u);
if(o.shown){s.n=(s.n||0)+1;s.last=Date.now();}
if(o.never)s.never=true;
lsSet(nudgeKey(u),s);
}
function onDashboard(){
var act=document.querySelector('.page.active');
return!!(act&& /^page-(teen|parent|employer)$/.test(act.id));
}
var BUSY='#tw34-tour, #tw-tour-overlay, #tw-tour-card, #v14-tour-overlay, #v14-tour-card, #parent-lock-overlay, .modal-overlay.open, .modal-overlay.active, #tw54-share, #twm-sheet, #msgModal.open, [role="dialog"][aria-modal="true"], .bottom-sheet.open';
function busy(){
var els=document.querySelectorAll(BUSY);
for(var i=0;i<els.length;i++){
var el=els[i];
if(el.id==='tw57-app')continue;
var cs=getComputedStyle(el);
if(cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)>0.05&&el.getClientRects().length)return true;
}
return false;
}
function mayNudge(){
var u=user();
if(!isMember(u)||installed()|| !onDashboard()||$('tw57-app'))return false;
var s=nudgeState(u);
if(s.never)return false;
if(s.last&&Date.now()-s.last<NUDGE_GAP_DAYS*864e5)return false;
return true;
}
var nudgeTimer=0,nudgeSince=0;
function nudge(){
reportInstalled();
clearTimeout(nudgeTimer);
if(!mayNudge())return false;
nudgeSince=Date.now();
var who=acctKey(user());
var tick=function(){
if(acctKey(user())!==who|| !mayNudge())return;
if(busy()||document.hidden){
if(Date.now()-nudgeSince<T.giveUp)nudgeTimer=setTimeout(tick,T.retry);
return;
}
noteNudge({shown:true});
open({source:'popup',nudge:true});
};
nudgeTimer=setTimeout(tick,T.first);
return true;
}
function menuButton(){
var b=document.createElement('button');
b.type='button';
b.className='twm-item tw57-menu-app';
b.setAttribute('data-tw57-menu','app');
b.innerHTML='<span class="twm-ic" aria-hidden="true">📲</span><span class="twm-lb">Download the app</span>';
b.addEventListener('click',function(){
var x=document.querySelector('#twm-sheet [data-twm="close"]');
if(x)x.click();
window.twGetApp({source:'menu'});
});
return b;
}
function syncButtons(){
var have=installed();
['#twm-side .twm-foot','#twm-sheet .twm-sheet-foot'].forEach(function(sel){
var foot=document.querySelector(sel);if(!foot)return;
var theirs=foot.querySelector('[data-twm="app"]'),ours=foot.querySelector('[data-tw57-menu="app"]');
if(theirs){if(ours)ours.remove();theirs.hidden=have;return;}
if(!ours){ours=menuButton();foot.insertBefore(ours,foot.firstChild);}
ours.hidden=have;
});
var nav=$('tw51-nav-employers');
if(nav&& !$('tw57-nav-app')){
var nb=document.createElement('button');
nb.type='button';nb.id='tw57-nav-app';nb.className='tw57-nav-app';
nb.innerHTML='<span aria-hidden="true">📲</span> Get the app';
nb.addEventListener('click',function(){window.twGetApp({source:'home-nav'});});
nav.parentNode.insertBefore(nb,nav);
}
var share=$('tw54-share-band');
if(share&& !$('tw57-app-band')){
var band=document.createElement('div');
band.id='tw57-app-band';band.className='tw57-app-band';
band.innerHTML='<p><b>📲 Get TeenWork on your phone.</b> It’s free, with no app store, and opens like any other app.</p>'+
'<button type="button">Download the app</button>';
band.querySelector('button').addEventListener('click',function(){window.twGetApp({source:'home'});});
share.parentNode.insertBefore(band,share);
}
var foot=document.querySelector('#page-landing .landing-footer');
if(foot&& !$('tw57-foot-app')){
var shareLink=[].slice.call(foot.querySelectorAll('button')).filter(function(x){return/Share TeenWork/.test(x.textContent);})[0];
var span=document.createElement('span');
span.id='tw57-foot-app';
span.innerHTML=' &nbsp;·&nbsp; <button class="terms-link" type="button">Download the app</button>';
span.querySelector('button').addEventListener('click',function(){window.twGetApp({source:'footer'});});
if(shareLink&&shareLink.nextSibling)foot.insertBefore(span,shareLink.nextSibling);else foot.appendChild(span);
}
['tw57-nav-app','tw57-app-band','tw57-foot-app'].forEach(function(id){var el=$(id);if(el)el.hidden=standalone();});
}
var arrival=(function(){
var out={app:false,unsub:''};
try{
var q=new URLSearchParams(location.search);
out.app=q.has('app');
var t=String(q.get('unsub')||'');
if(UUID_RE.test(t))out.unsub=t.toLowerCase();
if(q.has('app')||q.has('unsub')){
q.delete('app');q.delete('unsub');
var s=q.toString();
history.replaceState(history.state,'',location.pathname+(s?'?'+s:'')+location.hash);
}
}catch(e){}
return out;
})();
function unsubWindow(token){
lastFocus=document.activeElement;
current={source:'unsub'};
var m=document.createElement('div');
m.id='tw57-app';m.className='tw57-app';
m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','tw57-title');
m.innerHTML='<div class="tw57-card"><button type="button" class="tw57-x" data-tw57="close" aria-label="Close">✕</button>'+
'<div class="tw57-head"><img class="tw57-logo" src="assets/img/small-logo.png" width="52" height="52" alt=""><div><h2 id="tw57-title">TeenWork emails</h2></div></div>'+
'<div class="tw57-body"><p class="tw57-big" id="tw57-unsub-msg" role="status" aria-live="polite">Turning off reminder emails…</p>'+
'<p class="tw57-small" id="tw57-unsub-more"></p><button type="button" class="tw57-alt" id="tw57-unsub-undo" hidden>Undo: keep sending them</button></div></div>';
m.addEventListener('mousedown',function(e){if(e.target===m)close();});
m.addEventListener('click',function(e){var t=e.target.closest('[data-tw57="close"]');if(t)close();});
document.body.appendChild(m);
document.addEventListener('keydown',onKey,true);
var msg=$('tw57-unsub-msg'),more=$('tw57-unsub-more'),undo=$('tw57-unsub-undo');
var call=function(fn){
return client().then(function(c){
if(!c||typeof c.rpc!=='function')throw new Error('offline');
return c.rpc(fn,{p_token:token});
}).then(function(r){if(!r||r.error)throw new Error('failed');return!!r.data;});
};
call('tw_email_unsubscribe').then(function(ok){
if(!ok){msg.textContent='That link has expired or isn’t valid.';more.textContent='If you keep getting emails you don’t want, tell us through Help & Support in the app.';return;}
msg.textContent='✓ You won’t get TeenWork reminder emails any more.';
more.textContent='You’ll still get the emails you need, like sign-in codes, parent approvals and messages about your jobs.';
undo.hidden=false;
undo.onclick=function(){
undo.disabled=true;
call('tw_email_resubscribe').then(function(){msg.textContent='✓ Reminder emails are back on.';more.textContent='';undo.hidden=true;},
function(){undo.disabled=false;more.textContent='That didn’t work. Please try again in a minute.';});
};
},function(){
msg.textContent='Sorry, we couldn’t do that right now.';
more.textContent='Check your internet connection and open the link from the email again.';
});
}
var api=function(opts){return open(Object.assign({source:'button'},opts||{}));};
api.installed=installed;
api.nudge=nudge;
api.device=device;
api.canPrompt=function(){return!!deferred;};
api._t=T;
window.twGetApp=api;
window.twOfferInstall=nudge;
window.featpackInstall=function(){document.getElementById('featpack-install')?.classList.remove('open');return api({source:'old-sheet'});};
function start(){
syncButtons();
try{if(window.twCleanMenu&&typeof window.twCleanMenu.sync==='function')window.twCleanMenu.sync();}catch(e){}
var pending=false;
new MutationObserver(function(){
if(pending)return;pending=true;
setTimeout(function(){pending=false;syncButtons();},0);
}).observe(document.body,{childList:true});
if(standalone()){
markInstalled();
setTimeout(function(){
var act=document.querySelector('.page.active');
if(act&&act.id==='page-landing'&& !user()&&typeof window.gotoPage==='function'&& !/[?&]view=/.test(location.search)){try{window.gotoPage('login');}catch(e){}}
},300);
}
if(arrival.unsub)setTimeout(function(){unsubWindow(arrival.unsub);},400);
else if(arrival.app)setTimeout(function(){api({source:'link'});},600);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/billing-v54.js */
try{
(function(){
'use strict';
if(window.__twBillingV54)return;
window.__twBillingV54=true;
var PRICE_TEXT={teen_pro:'$3.99',employer_pro:'$3.99'};
var RETURN_VIEW={teen:'jobs',parent:'home',employer:'post-job'};
var PING_TTL=60000;
var $=function(id){return document.getElementById(id);};
function toast(m,t,ms){try{showToast(m,t||'info',ms);}catch(e){}}
function user(){try{return window.currentUser||(typeof currentUser!=='undefined'?currentUser:null)||null;}catch(e){return window.currentUser||null;}}
function isPractice(u){
if(!u)return false;
if(u.isDemo||u.twDemo)return true;
try{return typeof window._twIsDemoSandboxUser==='function'&& !!window._twIsDemoSandboxUser(u);}catch(e){return false;}
}
function isMember(u){return!!(u&& !u.isAdmin&&u.type!=='admin'&& /@/.test(String(u.email||''))&& !isPractice(u));}
function cfg(){try{return typeof _adminGetConfig==='function'?(_adminGetConfig()||{}):{};}catch(e){return{};}}
function paidOn(){return!!cfg().launchPaid;}
function fnUrl(){return(typeof SUPABASE_URL!=='undefined'&& /^https:/.test(SUPABASE_URL))?SUPABASE_URL.replace(/\/+$/,'')+'/functions/v1/billing':'';}
function pubKey(){return typeof SUPABASE_KEY!=='undefined'&&SUPABASE_KEY!=='YOUR_SUPABASE_ANON_KEY'?SUPABASE_KEY:'';}
async function client(){
try{if(typeof _twCloudClient==='function')return await _twCloudClient(3000);}catch(e){}
try{return typeof sbClient!=='undefined'?sbClient:null;}catch(e){return null;}
}
async function token(){
var c=await client(),u=user();
if(!c|| !c.auth|| !u)return'';
try{
var r=await c.auth.getSession(),s=r&&r.data&&r.data.session;
if(!s|| !s.access_token||String((s.user&&s.user.email)||'').toLowerCase()!==String(u.email||'').toLowerCase())return'';
return s.access_token;
}catch(e){return'';}
}
async function call(action,extra,signed){
var url=fnUrl(),key=pubKey();
if(!url|| !key)return{ok:false,code:'no_supabase'};
var bearer=key;
if(signed){bearer=await token();if(!bearer)return{ok:false,code:'sign_in'};}
try{
var res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+bearer},body:JSON.stringify(Object.assign({action:action},extra||{}))});
var d=await res.json().catch(function(){return{};});
d=d&&typeof d==='object'?d:{};
if(res.status===404&& !d.code)d.code='not_deployed';
d.httpStatus=res.status;
return d;
}catch(e){return{ok:false,code:'network',error:String((e&&e.message)||e)};}
}
var pingCache=null,pingAt=0;
function ping(force){
if(!force&&pingCache&&Date.now()-pingAt<PING_TTL)return pingCache;
pingAt=Date.now();
pingCache=call('ping');
return pingCache;
}
function kindFor(u,asked){
if(asked==='teen_pro'||asked==='employer_pro')return asked;
return u&&u.type==='employer'?'employer_pro':'teen_pro';
}
function friendly(d){
var c=d&&d.code;
if(c==='sign_in')return'Please sign out and sign in again, then try once more.';
if(c==='wrong_account')return'That account doesn’t match your sign-in. Sign in again and try once more.';
if(c==='network')return'You seem to be offline. Check your connection and try again.';
if(c==='not_configured'||c==='not_deployed'||c==='no_supabase')return'Payments aren’t set up yet. Message support and the TeenWork team can help.';
return'Something went wrong on our side. Please try again in a minute.';
}
function closeBox(){var b=$('tw54-pay');if(b)b.remove();}
function box(html,buttons){
closeBox();
var m=document.createElement('div');
m.id='tw54-pay';m.className='tw54-share';
m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','tw54-pay-title');
m.innerHTML='<div class="tw54-share-card">'+html+'<div class="tw54-pay-actions">'+(buttons||[]).map(function(b,i){
return'<button type="button" data-i="'+i+'" class="'+(b.primary?'tw54-copy':'tw54-btn')+'" style="width:100%;justify-content:center;margin-top:8px">'+b.label+'</button>';
}).join('')+'</div></div>';
m.addEventListener('click',function(e){
var t=e.target.closest('button[data-i]');if(!t)return;
var b=buttons[Number(t.getAttribute('data-i'))];if(b&&b.onClick)b.onClick();
});
document.body.appendChild(m);
var f=m.querySelector('button');if(f)try{f.focus({preventScroll:true});}catch(e){}
return m;
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('tw54-pay')&& !$('tw54-pay').dataset.busy)closeBox();},true);
function askParent(kind){
return new Promise(function(resolve){
box('<h2 id="tw54-pay-title">⭐ TeenWork Pro</h2>'+
'<p class="tw54-lead"><b>'+PRICE_TEXT[kind]+' a month.</b> Cancel anytime from <b>Manage billing</b> on the plans page.</p>'+
'<p class="tw54-lead">👪 <b>Ask a parent or guardian first.</b> They should be with you and pay with their card. Applying to jobs stays free, with or without Pro.</p>',
[{label:'A parent is here, continue →',primary:true,onClick:function(){closeBox();resolve(true);}},
{label:'Not now',onClick:function(){closeBox();resolve(false);}}]);
});
}
function busy(text){
var m=box('<h2 id="tw54-pay-title">⭐ TeenWork Pro</h2><p class="tw54-lead" aria-live="polite">'+text+'</p>',[]);
m.dataset.busy='1';
return m;
}
async function startCheckout(kind){
var u=user();
var p=await ping();
if(!(p&&p.ok&&p.configured&&p.prices&&p.prices[kind])){
toast('Payments aren’t set up yet. Message support and the TeenWork team can switch you to Pro.','info',5000);
try{openSupportModal('Pro / Billing','I would like to upgrade to TeenWork Pro.');}catch(e){}
return;
}
if(u.type==='teen'&& !(await askParent(kind)))return;
busy('Opening Stripe’s secure checkout…');
var d=await call('checkout',{plan:kind,account_key:u.dataKey||u.email,return_view:RETURN_VIEW[u.type]||''},true);
if(d.ok&&d.url&& /^https:\/\/checkout\.stripe\.com\//.test(d.url)){location.href=d.url;return;}
closeBox();
if(d.code==='already_pro'){toast('⭐ You already have Pro. Opening your billing page…','info');openPortal();return;}
toast('Checkout didn’t open. '+friendly(d),'error',6000);
}
async function openPortal(){
var u=user();if(!isMember(u))return;
busy('Opening your billing page…');
var d=await call('portal',{return_view:RETURN_VIEW[u.type]||''},true);
if(d.ok&&d.url&& /^https:\/\/billing\.stripe\.com\//.test(d.url)){location.href=d.url;return;}
closeBox();
toast(d.code==='no_billing'?'There’s no paid subscription on this account yet.':'The billing page didn’t open. '+friendly(d),'info',5000);
}
window.twBilling={ping:ping,checkout:function(k){var u=user();if(isMember(u))return startCheckout(kindFor(u,k));},portal:openPortal,status:function(){return call('status',{},true);},priceText:PRICE_TEXT};
var origUpgrade=window.handleUpgradeClick;
window.handleUpgradeClick=function(asked){
var u=user();
if(u&&u.type==='parent'&& !u.isAdmin){toast(PARENT_NOTE+' Pro is for teen and employer accounts.','info',6000);return;}
if(!paidOn()|| !isMember(u))return typeof origUpgrade==='function'?origUpgrade.apply(this,arguments):undefined;
var kind=kindFor(u,asked);
if((kind==='employer_pro')!==(u.type==='employer')){
toast(kind==='employer_pro'?'Employer Pro is for employer accounts.':'Teen Pro is for teen accounts. Employers can pick Employer Pro below.','info',5000);
return;
}
try{if(window.twPlan&&window.twPlan.planOf(u)==='pro'){openPortal();return;}}catch(e){}
startCheckout(kind);
};
var returned='';
try{returned=new URLSearchParams(location.search).get('checkout')||'';}catch(e){}
function whenSignedIn(fn,tries){
tries=tries||0;
var u=user();
if(isMember(u)){fn(u);return;}
if(tries<40)setTimeout(function(){whenSignedIn(fn,tries+1);},500);
}
function afterReturn(){
if(returned==='cancel'){whenSignedIn(function(){toast('Checkout canceled. You weren’t charged.','info',5000);});return;}
if(returned!=='success')return;
whenSignedIn(function(u){
toast('Thanks! Your payment went through. Turning on Pro…','success',5000);
var tries=0;
(function poll(){
call('status',{},true).then(function(d){
if(d&&d.ok&&d.plan==='pro'){
var c=null;
client().then(function(cl){c=cl;return cl&&cl.auth&&cl.auth.refreshSession?cl.auth.refreshSession():null;}).catch(function(){}).then(function(){
try{if(window._DB&&_DB.save)_DB.save('plan','pro');}catch(e){}
try{if(window.twPlan)window.twPlan.refresh();}catch(e){}
manageFor='';
try{paint();}catch(e){}
toast('⭐ You’re on TeenWork Pro. Thank you for supporting TeenWork!','success',6000);
});
return;
}
if(++tries<15)setTimeout(poll,2500);
else toast('Your payment is in. Pro can take a few minutes to turn on. Reload the page later to see it.','info',8000);
});
})();
});
}
function setHTML(id,html){var el=$(id);if(el&&el.innerHTML!==html)el.innerHTML=html;}
function paint(){
var paid=paidOn();
var teenPrice=$('tw54-teen-pro-price');
if(teenPrice)teenPrice.innerHTML=paid?PRICE_TEXT.teen_pro+'<span style="font-size:.9rem;font-weight:600;color:var(--muted)">/mo</span>':'Free<span style="font-size:.9rem;font-weight:600;color:var(--muted)"> right now</span>';
setHTML('tw54-teen-pro-note',paid?'Monthly. Cancel anytime from Manage billing.':'App is still in testing — Pro is free.');
var testing=$('tw54-testing-box');if(testing)testing.hidden=paid;
var empPrice=$('tw54-emp-pro-price');
if(empPrice)empPrice.innerHTML=PRICE_TEXT.employer_pro+'<span style="font-size:.9rem;font-weight:600;color:var(--muted)">/mo</span>';
setHTML('tw54-emp-pro-note',paid?'Monthly. Cancel anytime.':'Free while TeenWork is in testing');
var empBtn=$('tw54-emp-pro-btn');
if(empBtn)empBtn.textContent=paid?'Upgrade to Employer Pro →':'Go Pro — free during testing →';
var faq=$('tw54-faq-try');
if(faq)faq.textContent=paid?'Pro costs '+PRICE_TEXT.teen_pro+' a month for teens and employers. Parent accounts are always free. You can cancel anytime from Manage billing, and you keep Pro until the end of the month you paid for.':'Yes — while TeenWork is in early access, all Pro features are available for free to teens and employers. You’ll get an email at least 10 days before any paid plan starts.';
var pro=$('tw48-pro'),p=pro&&pro.querySelector('p');
if(p){
var want=paid?'<strong>⭐ TeenWork Pro is '+PRICE_TEXT.teen_pro+' a month.</strong> Pro adds extras like the AI resume builder. Applying to jobs is always free and unlimited.'
:'<strong>⭐ Pro is free during early access.</strong> Pro adds extras like the AI resume builder. Applying to jobs is always free and unlimited. No credit card needed.';
if(p.innerHTML!==want)p.innerHTML=want;
}
var info=$('v24-pro-info');if(info)info.hidden=paid;
var su=$('su-plan-notice-paid');
if(paid&&su){su.textContent='⭐ Pro is '+PRICE_TEXT.teen_pro+' a month for teens and employers. Start free, then upgrade from the plans page once your account is set up.';su.style.display='block';}
paintParents();
paintManage();
}
var PARENT_NOTE='Parent accounts are always free.';
function signupType(){
var b=document.querySelector('.type-btn.selected');
var m=b&& /^type-(teen|parent|employer)$/.exec(b.id||'');
return m?m[1]:'';
}
function paintParents(){
var u=user(),parentIn= !!(u&&u.type==='parent'&& !u.isAdmin);
['pricing-pro-btn','tw54-emp-pro-btn'].forEach(function(id){var b=$(id);if(b)b.style.display=parentIn?'none':'';});
var note=$('tw54-parent-free');if(note)note.style.fontWeight=parentIn?'700':'';
var sec=$('su-plan-section');if(!sec)return;
var parentSu=signupType()==='parent';
sec.style.display=parentSu?'none':'';
var free=document.querySelector('input[name="su-plan"][value="free"]');
if(parentSu&&free&& !free.checked){free.checked=true;try{free.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}}
var su=$('tw54-su-parent-free');
if(parentSu&& !su){
su=document.createElement('p');su.id='tw54-su-parent-free';su.className='tw54-terms-note';
su.style.cssText='margin:1rem 0 0;font-size:.85rem';
su.textContent='👪 '+PARENT_NOTE+' There’s no Pro plan for parents.';
sec.parentNode.insertBefore(su,sec.nextSibling);
}
if(su)su.style.display=parentSu?'block':'none';
}
(function wrapSelectType(){
var o=window.selectType;
if(typeof o!=='function'||o.__tw54){if(typeof o!=='function')setTimeout(wrapSelectType,300);return;}
var w=function(){var r=o.apply(this,arguments);try{paintParents();}catch(e){}return r;};
w.__tw54=true;window.selectType=w;
})();
var manageFor='';
function paintManage(){
var btn=$('pricing-pro-btn');if(!btn)return;
var holder=$('tw54-manage'),u=user();
if(!paidOn()|| !isMember(u)||u.type==='parent'){if(holder)holder.hidden=true;return;}
if(!holder){
holder=document.createElement('div');holder.id='tw54-manage';holder.hidden=true;holder.style.cssText='text-align:center;margin:1.4rem auto 0;max-width:520px';
holder.innerHTML='<p id="tw54-manage-text" style="font-size:.88rem;color:var(--muted);margin:0 0 .6rem"></p><button type="button" class="btn-secondary" id="tw54-manage-btn" style="min-height:44px;padding:0 20px">💳 Manage billing</button>';
var grid=btn.closest('.pricing-grid');
(grid&&grid.parentNode?grid.parentNode:btn.parentNode).insertBefore(holder,grid?grid.nextSibling:null);
holder.querySelector('#tw54-manage-btn').onclick=openPortal;
}
var k=String(u.dataKey||u.email)+'|'+Math.floor(Date.now()/60000);
if(manageFor===k)return;
manageFor=k;
call('status',{},true).then(function(d){
if(!d|| !d.ok|| !d.has_billing|| !d.status||d.status==='none'){holder.hidden=true;return;}
var t=$('tw54-manage-text');
if(t){
var end=d.current_period_end?new Date(d.current_period_end).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'';
t.textContent=d.plan==='pro'?('⭐ You’re on Pro'+(end?(d.cancel_at_period_end?' until '+end+' (canceled).':'. Next payment: '+end+'.'):'.')):'Your Pro subscription has ended.';
}
holder.hidden=false;
});
}
(function wrapGoto(){
var o=window.gotoPage;
if(typeof o!=='function'||o.__tw54)return;
var w=function(page){var r=o.apply(this,arguments);if(page==='pricing'||page==='landing'||page==='signup')setTimeout(paint,60);return r;};
w.__tw54=true;
Object.keys(o).forEach(function(k){try{w[k]=o[k];}catch(e){}});
if(o.__twPlan)w.__twPlan=true;
window.gotoPage=w;
})();
function healthNote(d){
if(d.code==='not_deployed')return{status:'warn',note:'billing function not deployed yet'};
if(!d.ok)return{status:'warn',note:'billing function unreachable ('+(d.code||'offline')+')'};
if(!d.configured)return{status:'warn',note:'Stripe keys not added yet · Pro stays free/manual'};
var miss=[];
if(!d.prices.teen_pro)miss.push('Teen Pro price');if(!d.prices.employer_pro)miss.push('Employer Pro price');if(!d.webhook)miss.push('webhook secret');
if(miss.length)return{status:'warn',note:'Stripe '+d.mode+' mode · missing: '+miss.join(', ')};
return{status:d.mode==='live'?'ok':'warn',note:d.mode==='live'?'Stripe ready (live mode)':'Stripe ready in TEST mode (no real charges)'};
}
var oHealth=window.adminRunHealthCheck;
window.adminRunHealthCheck=async function(){
var r=oHealth?await oHealth.apply(this,arguments):undefined;
try{
var el=$('adm-health-list');if(!el)return r;
var old=el.querySelector('[data-tw54-pay]');if(old)old.remove();
var row=document.createElement('div');row.className='adm-health-item';row.setAttribute('data-tw54-pay','1');
row.innerHTML='<div class="adm-health-status warn"></div><div class="adm-health-label">Payments (Stripe)</div><div class="adm-health-note">Checking…</div>';
el.appendChild(row);
var h=healthNote(await ping(true));
row.querySelector('.adm-health-status').className='adm-health-status '+h.status;
row.querySelector('.adm-health-note').textContent=h.note;
}catch(e){}
return r;
};
function wrapSetPaid(){
var oSetPaid=window.adminSetPaid;
if(typeof oSetPaid!=='function'||oSetPaid.__tw54)return;
var w=async function(val){
if(!val)return oSetPaid.apply(this,arguments);
var d=await ping(true),h=healthNote(d);
var msg=h.status==='ok'
?'Turn on paid plans? People will pay through Stripe (live mode).\n\nThe pricing page promises an email at least 10 days before paid plans start. Have you sent it?'
:'Stripe isn’t ready: '+h.note+'.\n\nIf you turn on paid plans now, people who pick Pro are asked to message support instead of paying. Turn it on anyway?';
if(!window.confirm(msg))return;
var realConfirm=window.confirm;
window.confirm=function(){return true;};
try{return oSetPaid.apply(this,arguments);}finally{window.confirm=realConfirm;setTimeout(paint,100);}
};
Object.keys(oSetPaid).forEach(function(k){try{w[k]=oSetPaid[k];}catch(e){}});
w.__tw54=true;
window.adminSetPaid=w;
}
function start(){
setTimeout(wrapSetPaid,50);setTimeout(wrapSetPaid,1700);
paint();
afterReturn();
setTimeout(paint,1500);setTimeout(paint,4000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/polish-v54.js */
try{
(function(){
'use strict';
if(window.__tw54Polish)return;
window.__tw54Polish=true;
function syncPage(){
var act=document.querySelector('.page.active');
document.body.classList.toggle('tw54-pricing',!!(act&&act.id==='page-pricing'));
}
var offerTimer=0;
function wrapLaunch(){
var orig=window.launchDashboard;
if(typeof orig!=='function'||orig.__tw54Polish)return;
var w=function(){
var out=orig.apply(this,arguments);
clearTimeout(offerTimer);
offerTimer=setTimeout(function(){try{if(window.twOfferInstall)window.twOfferInstall();}catch(e){}},8000);
return out;
};
Object.keys(orig).forEach(function(k){try{w[k]=orig[k];}catch(e){}});
w.__tw54Polish=true;
window.launchDashboard=w;
}
function start(){
wrapLaunch();syncPage();
setTimeout(function(){wrapLaunch();syncPage();},1800);
var mo=new MutationObserver(syncPage);
Array.prototype.forEach.call(document.querySelectorAll('.page'),function(el){mo.observe(el,{attributes:true,attributeFilter:['class']});});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/account-pages-v60.js */
try{
(function(){
'use strict';
if(window.__twAccountPagesV60)return;
window.__twAccountPagesV60=true;
var ROLES=['teen','parent','employer'];
var HOME={teen:'ttab-browse',parent:'ptab-overview',employer:'etab-post'};
var DASH={teen:'Teen Dashboard',parent:'Parent Dashboard',employer:'Employer Dashboard'};
var LINES={
'ttab-applications':'The jobs you applied for and where each one stands.',
'ttab-earnings':'What you earned, what you took out and what is left.',
'ttab-resume':'Your profile, parent link, account details and alerts.',
'etab-active':'Your job posts and how each one is doing.',
'etab-analytics':'How your job posts are doing.',
'etab-profile':'Your business details and your photo or logo.'
};
var $=function(id){return document.getElementById(id);};
function me(){try{return window.currentUser||(typeof currentUser!=='undefined'?currentUser:null)||null;}catch(e){return window.currentUser||null;}}
function activity(){try{return typeof userActivity!=='undefined'?userActivity:(window.userActivity||null);}catch(e){return window.userActivity||null;}}
function toast(m,t){try{showToast(m,t||'info');}catch(e){}}
function isOn(el){return!!el&&el.classList.contains('active');}
var BASE_TITLE=document.title;
function nameOf(role,id){
if(id==='verify')return'Verification';
try{
var m=window.twCleanMenu&&window.twCleanMenu.menu&&window.twCleanMenu.menu[role];
var items=m?(m.main||[]).slice():[];
((m&&m.groups)||[]).forEach(function(g){items=items.concat(g.items||[]);});
for(var i=0;i<items.length;i++)if(items[i][0]===id)return String(items[i][2]||'');
}catch(e){}
return'';
}
function openSection(page){
var list=page.querySelectorAll('.dashboard .tab-panel.active');
for(var i=0;i<list.length;i++)if(!list[i].parentElement.closest('.tab-panel'))return list[i].id;
return'';
}
function setLead(h1,text){
var n=h1.firstChild;
if(!n||n.nodeType!==3){n=document.createTextNode('');h1.insertBefore(n,h1.firstChild);}
if(n.nodeValue!==text)n.nodeValue=text;
}
function paintHeader(role,page,id,name){
var h1=page.querySelector('.dash-header h1');if(!h1)return;
setLead(h1,name||DASH[role]);
var wrap=h1.parentElement;if(!wrap)return;
var home= !id||id===HOME[role];
var keep=home||role==='parent';
var own=null,first=null;
[].forEach.call(wrap.children,function(c){
if(c.tagName!=='P')return;
if(c.classList.contains('tw60-line'))own=c;else if(!first)first=c;
});
if(first)first.classList.toggle('tw60-off',!keep);
var text=keep?'':(LINES[id]||'');
if(text){
if(!own){own=document.createElement('p');own.className='tw60-line';wrap.appendChild(own);}
if(own.textContent!==text)own.textContent=text;
own.hidden=false;
}else if(own)own.hidden=true;
}
function setTabTitle(name){
var t=name?name+' · TeenWork':BASE_TITLE;
if(document.title!==t)document.title=t;
}
var lastTeen='';
function paint(){
var u=me(),role=u&&ROLES.indexOf(u.type)>=0?u.type:null;
var page=role?$('page-'+role):null,on=isOn(page);
if(on){
var id=openSection(page),name=nameOf(role,id);
paintHeader(role,page,id,name);
setTabTitle(name||DASH[role]);
}else setTabTitle(role&&isOn($('page-verify'))?nameOf(role,'verify'):'');
if(on&&role==='teen'){
var key=String(u.dataKey||u.email||'');
if(key!==lastTeen){lastTeen=key;bioDirty=false;clearTimeout(bioTimer);[1500,4000].forEach(function(ms){setTimeout(syncProfile,ms);});}
syncProfile();
}else if(!role)lastTeen='';
}
var queued=false;
function later(){if(queued)return;queued=true;setTimeout(function(){queued=false;try{paint();}catch(e){console.warn('account-pages-v60:',e);}},40);}
var SAMPLE= /^Hardworking 16-year-old from Burlington/;
var MAX=600,COUNTS_FROM=20;
var bioTimer=null,bioDirty=false;
function tidy(t){return String(t==null?'':t).replace(/\s+$/,'').replace(/^\s+/,'').slice(0,MAX);}
function isTeen(u){return!!(u&&u.type==='teen');}
function savedBio(){
try{var v=window._DB&&_DB.load?_DB.load('bio',''):'';return typeof v==='string'&& !SAMPLE.test(v)?v:'';}catch(e){return'';}
}
function storeBio(text){
var u=me();if(!isTeen(u))return false;
text=tidy(text);
try{if(typeof trackActivity==='function')trackActivity('bio_update',text);else if(activity())activity().bio=text;}catch(e){}
try{if(window._DB&&_DB.save)_DB.save('bio',text);}catch(e){}
bioDirty=false;
drawProfileNote();
try{if(typeof window.renderProfileCompletionBar==='function'&&$('teen-profile-completion'))window.renderProfileCompletionBar('teen-profile-completion');}catch(e){}
try{if(window._twOnboardingV53&&window._twOnboardingV53.drawNextSteps)window._twOnboardingV53.drawNextSteps();}catch(e){}
return true;
}
function said(text){var el=$('tw60-bio-saved');if(el&&el.textContent!==text)el.textContent=text;}
function drawProfileNote(){
var el=$('tw60-profile-todo'),u=me();if(!el)return;
var p=null;
try{p=isTeen(u)&&window.twTeenSteps&&window.twTeenSteps.profile?window.twTeenSteps.profile(u):null;}catch(e){}
if(!p||p.pct>=100|| !p.missing|| !p.missing.length){el.hidden=true;return;}
var onlyBio=p.missing.length===1&&(p.parts||[]).some(function(x){return x.id==='bio'&& !x.done;});
var text='Profile '+p.pct+'% complete. '+(onlyBio?'A short bio is the last thing to add.':'Still to add: '+p.missing.join(', ')+'.');
if(el.textContent!==text)el.textContent=text;
el.hidden=false;
}
function syncProfile(){
var u=me();if(!isTeen(u))return;
var box=$('profile-bio-input'),a=activity();
if(!bioDirty){
var bio=savedBio();
if(!bio&&a&&a.bio&& !SAMPLE.test(a.bio)){
bio=tidy(a.bio);
try{if(window._DB&&_DB.save)_DB.save('bio',bio);}catch(e){}
}
if(a&&bio&&a.bio!==bio)a.bio=bio;
if(box&&box!==document.activeElement&&box.value!==bio){box.value=bio;said('');}
}
drawProfileNote();
}
window.saveBioInput=function(value){
if(!isTeen(me()))return;
bioDirty=true;said('');
drawProfileNote();
clearTimeout(bioTimer);
bioTimer=setTimeout(function(){if(bioDirty&&storeBio(value))said('Saved');},900);
};
window.saveBioBtn=function(){
var box=$('profile-bio-input');if(!box|| !isTeen(me()))return;
var text=tidy(box.value);
if(!text){toast('Write a sentence or two about yourself first.','warning');try{box.focus();}catch(e){}return;}
clearTimeout(bioTimer);
if(!storeBio(text))return;
said('Saved');
toast(text.length>=COUNTS_FROM?'✅ Bio saved!':'✅ Saved. Write a little more (20 letters or more) and it counts toward your profile.','success');
};
window.useAIBio=function(){
var bio=tidy(window._latestAIBio);
if(!bio){toast('Ask the AI to write a bio first!','warning');return;}
if(!isTeen(me()))return;
var box=$('profile-bio-input');if(box)box.value=bio;
clearTimeout(bioTimer);
if(storeBio(bio)){said('Saved');toast('✅ Bio saved to your profile!','success');}
};
window.addEventListener('pagehide',function(){
var box=$('profile-bio-input');
if(bioDirty&&box){clearTimeout(bioTimer);try{storeBio(box.value);}catch(e){}}
});
function boot(){
try{paint();}catch(e){console.warn('account-pages-v60:',e);}
new MutationObserver(later).observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window._twAccountPagesV60={paint:paint,syncProfile:syncProfile,savedBio:savedBio};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
