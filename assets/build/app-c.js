/* TeenWork app-c.js — a built file, do not edit. Edit the files named below (assets/js, assets/css), then run: node tools/build.cjs */
/* assets/js/support-email-v39.js */
try{
(function(){
var SUPPORT_INBOX_EMAIL='aqdteenwork@gmail.com';
var saveToInbox=window._adminSaveSupportMessage;
if(typeof saveToInbox!=='function'||saveToInbox._twEmailsSupport)return;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function emailSupportMessage(msg){
try{
if(typeof emailjs==='undefined'||typeof EMAILJS_SERVICE==='undefined')return;
if(typeof _emailjsQuotaExceeded!=='undefined'&&_emailjsQuotaExceeded)return;
var name=String(msg.name||'Anonymous');
var topic=String(msg.context||'General Support');
var senderEmail=String(msg.email||'');
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail))senderEmail='';
var when=msg.time?new Date(msg.time):new Date();
if(isNaN(when.getTime()))when=new Date();
var html='<p><b>From:</b> '+esc(name)
+(senderEmail?' &lt;'+esc(senderEmail)+'&gt;':' (no email on file)')
+(msg.userType?' &middot; '+esc(msg.userType):'')+'</p>'
+'<p><b>Topic:</b> '+esc(topic)+'</p>'
+'<p><b>Sent:</b> '+esc(when.toLocaleString())+'</p>'
+'<hr style="border:none;border-top:1px solid #ddd;margin:14px 0;">'
+'<p style="white-space:pre-wrap;">'+esc(msg.body||'(empty message)')+'</p>'
+'<p style="color:#888;font-size:12px;margin-top:22px;">Sent automatically by the TeenWork Help &amp; Support form.'
+(senderEmail?' Reply to this email to answer '+esc(name)+'.':'')+'</p>';
try{emailjs.init(EMAILJS_PUBKEY);}catch(e){}
emailjs.send(EMAILJS_SERVICE,EMAILJS_TEMPLATE,{
to_email:SUPPORT_INBOX_EMAIL,
to_name:'TeenWork Support',
from_name:'TeenWork Help & Support',
reply_to:senderEmail||ADMIN_EMAIL,
subject:'TeenWork Support: '+topic+' from '+name,
message:html
}).catch(function(e){console.warn('Support email failed:',e);});
}catch(e){console.warn('Support email failed:',e);}
}
function saveAndEmail(msg){
var out=saveToInbox.apply(this,arguments);
emailSupportMessage(msg||{});
return out;
}
saveAndEmail._twEmailsSupport=true;
window._adminSaveSupportMessage=saveAndEmail;
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/featpack-v39-nodemo-js.js */
try{
(function(){
'use strict';
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const sb=()=>(typeof sbClient!=='undefined'&&sbClient)?sbClient:null;
const toast=(m,t)=>{try{showToast(m,t||'info');}catch(e){}};
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fmt=iso=>{const d=new Date(iso);return isNaN(d)?'':d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});};
const ROLES=['teen','parent','employer'];
const ADMIN_KEY='admin',ADMIN_NAME='TeenWork Admin';
const isAdminEmail=e=>{try{return _twIsAdminEmail(e);}catch(x){return false;}};
window._getReviews=function(){
const old=r=> !!(r&&window.twIsOldSample&&(window.twIsOldSample(r.body)||window.twIsOldSample(r.name)));
try{const s=localStorage.getItem('tw_admin_reviews');const v=s?JSON.parse(s):[];return Array.isArray(v)?v.filter(r=> !old(r)):[];}catch(e){return[];}
};
const _oSchema=window._injectReviewSchema;
window._injectReviewSchema=function(reviews){
const published=(Array.isArray(reviews)?reviews:[]).filter(r=>r&&r.published);
if(!published.length){document.getElementById('tw-review-schema')?.remove();return;}
return _oSchema?_oSchema.apply(this,arguments):undefined;
};
let cloudAccounts=[],cloudNote='',cloudLoadedAt=0,loading=false;
function localContacts(){
let all={};try{all=_twLocalAccounts()||{};}catch(e){}
return Object.keys(all).filter(k=>all[k]&&(ROLES.includes(all[k].type)|| !isAdminEmail(all[k].email||k))&& !(window._twClosed&&window._twClosed.has(k))).map(k=>{
const a=all[k];
return{id:k,key:k,name:a.name||a.email||k,email:a.email||k.split('#')[0],role:ROLES.includes(a.type)?a.type:'teen',
slot:a.slot||(k.includes('#')?(parseInt(k.split('#')[1])||1):1),suspended: !!a.suspended,source:'device',created:a.created||0};
});
}
async function loadCloud(){
const client=sb();
if(!client){cloudAccounts=[];cloudNote='Cloud database not connected on this page, so only accounts saved on this device are listed.';cloudLoadedAt=Date.now();return;}
loading=true;
try{
const{data,error}=await client.from('user_data').select('email,value,updated_at').eq('key','account_profile').limit(2000);
if(error)throw error;
cloudAccounts=(data||[]).map(r=>{
let v={};try{v=JSON.parse(r.value||'{}');}catch(e){}
const key=String(r.email||'');const email=v.email||key.split('#')[0];
return{id:key,key,name:v.name||email,email,role:ROLES.includes(v.type)?v.type:'',slot:v.slot||1,suspended:false,source:'cloud',created:v.created||0};
}).filter(c=>c.key&&c.role&& !(window._twClosed&&window._twClosed.has(c.key)));
cloudNote=cloudAccounts.length+' account'+(cloudAccounts.length===1?'':'s')+' found in the cloud database.';
}catch(e){cloudAccounts=[];cloudNote='Could not read the cloud database: '+String(e&&e.message||e).slice(0,120);}
loading=false;cloudLoadedAt=Date.now();
}
function allContacts(){
const local=localContacts();const seen=new Set(local.map(c=>c.key));
const list=local.concat(cloudAccounts.filter(c=> !seen.has(c.key))).sort((a,b)=>(b.created||0)-(a.created||0));
try{_adminAllContacts.length=0;list.forEach(c=>_adminAllContacts.push(c));}catch(e){}
return list;
}
window.adminRenderContacts=function(){
const listEl=document.getElementById('adm-contacts-list'),selEl=document.getElementById('adm-msg-to');
if(!listEl|| !selEl)return;
const list=allContacts();
const q=(document.getElementById('adm-contact-search')?.value||'').toLowerCase();
const role=document.getElementById('adm-contact-role')?.value||'';
const filtered=list.filter(c=>(!role||c.role===role)&&(!q||String(c.name).toLowerCase().includes(q)||String(c.email).toLowerCase().includes(q)));
const roleBg={teen:'var(--green-pale)',parent:'var(--blue-pale)',employer:'var(--amber-pale)'};
const roleText={teen:'var(--green)',parent:'var(--blue)',employer:'var(--amber)'};
const note=cloudNote||(sb()?'Loading accounts from the cloud database…':'Cloud database not connected on this page, so only accounts saved on this device are listed.');
const head=`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.76rem;color:var(--muted);margin-bottom:8px"><span>${list.length} real account${list.length===1?'':'s'} · ${esc(note)}</span><button type="button" class="adm-btn adm-btn-mark" style="font-size:.7rem;padding:2px 8px" onclick="adminRefreshContacts()">↻ Refresh</button></div>`;
if(!filtered.length){
listEl.innerHTML=head+'<div class="adm-empty">'+(list.length?'No accounts match.':'No accounts yet. Real sign-ups appear here.')+'</div>';
}else{
listEl.innerHTML=head+filtered.map(c=>`
      <div class="adm-card" style="margin-bottom:8px;padding:12px 14px;display:flex;align-items:center;gap:12px;${c.suspended?'opacity:.6':''}">
        <div style="width:36px;height:36px;border-radius:50%;background:${roleBg[c.role]||'var(--bg)'};display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:${roleText[c.role]||'var(--muted)'};flex-shrink:0;">${esc(String(c.name).split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase())}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:.88rem;">${esc(c.name)}${c.slot>1?' <span style="font-size:.72rem;color:var(--muted)">#'+c.slot+'</span>':''}</div>
          <div style="font-size:.76rem;color:var(--muted);">${esc(c.email)} · ${c.source==='cloud'?'cloud':'this device'}${c.suspended?' · <span style="color:var(--red)">suspended</span>':''}</div>
        </div>
        <span class="adm-msg-badge ${esc(c.role)}">${esc(c.role)}</span>
        <button type="button" class="adm-btn adm-btn-reply" style="font-size:.72rem;" data-key="${esc(c.key)}" onclick="adminPreFillMsg(this.getAttribute('data-key'))">Message</button>
      </div>`).join('');
}
selEl.innerHTML=filtered.map(c=>`<option value="${esc(c.key)}">${esc(c.name)} (${esc(c.role)}${c.slot>1?' #'+c.slot:''}) · ${esc(c.email)}</option>`).join('');
if(!cloudLoadedAt&& !loading)loadCloud().then(()=>{if(document.getElementById('adm-contacts-list'))window.adminRenderContacts();});
renderReplies();
};
window.adminRefreshContacts=function(){cloudLoadedAt=0;window.adminRenderContacts();};
window.addEventListener('tw-supabase-ready',()=>{cloudLoadedAt=0;if(document.getElementById('adm-contacts-list'))window.adminRenderContacts();});
window.adminSendToContact=async function(){
const selEl=document.getElementById('adm-msg-to'),bodyEl=document.getElementById('adm-msg-body'),sentEl=document.getElementById('adm-contact-sent');
if(!selEl|| !bodyEl)return;
const key=selEl.value,body=bodyEl.value.trim();
if(!key){toast('Pick an account first. Real accounts appear in the list as people sign up.','error');return;}
if(!body){toast('Please type a message first.','error');return;}
const c=allContacts().find(x=>x.key===key);
if(!c){toast('That account is no longer listed.','error');return;}
const anns=read('tw_admin_announcements',[]);
anns.unshift({id:uid(),title:'Message from TeenWork',body,audience:'one',to:c.key,toEmail:c.email,at:new Date().toISOString()});
write('tw_admin_announcements',Array.isArray(anns)?anns.slice(0,300):[]);
let viaCloud=false,cloudErr='';
const client=sb();
if(client){
try{
const{error}=await client.from('messages').insert([{from_key:ADMIN_KEY,from_name:ADMIN_NAME,from_role:'admin',to_key:c.key,to_name:c.name,to_role:c.role,text:body}]);
if(error)throw error;viaCloud=true;
}catch(e){cloudErr=String(e&&e.message||e).slice(0,120);}
}
try{_twAdminAudit('Sent message',c.email+(c.slot>1?' (#'+c.slot+')':'')+(viaCloud?' · chat + banner':' · banner on this device'));}catch(e){}
bodyEl.value='';
if(sentEl){sentEl.style.display='inline';setTimeout(()=>{sentEl.style.display='none';},2500);}
if(viaCloud)toast('✉️ Message sent to '+c.name+' (in their chat, plus a banner on this device)','success');
else if(cloudErr)toast('⚠️ Banner queued for '+c.name+', but the chat message was not delivered: '+cloudErr,'error');
else toast('✉️ Banner queued for '+c.name+' on this device. Connect Supabase to reach them on other devices.','success');
try{if(typeof window.adminRenderAnnouncements==='function')window.adminRenderAnnouncements();}catch(e){}
renderReplies();
};
async function renderReplies(){
const host=document.getElementById('adm-panel-contacts');if(!host)return;
let box=document.getElementById('adm39-admin-inbox');
if(!box){
box=document.createElement('div');box.id='adm39-admin-inbox';box.className='adm-card';box.style.marginTop='14px';host.appendChild(box);
box.addEventListener('click',e=>{
const b=e.target.closest('[data-reply-key]');if(!b)return;
const key=b.getAttribute('data-reply-key'),name=b.getAttribute('data-reply-name')||key;
const selEl=document.getElementById('adm-msg-to');if(!selEl)return;
if(![...selEl.options].some(o=>o.value===key)){const o=document.createElement('option');o.value=key;o.textContent=name+' · '+key.split('#')[0];selEl.appendChild(o);}
selEl.value=key;document.getElementById('adm-msg-body')?.focus();
});
}
const title='<div style="font-weight:700;font-size:.9rem;margin-bottom:8px">📥 Replies to TeenWork Admin</div>';
const client=sb();
if(!client){box.innerHTML=title+'<div style="font-size:.8rem;color:var(--muted)">Connect Supabase to see replies people send to TeenWork Admin from their chat.</div>';return;}
try{
const{data,error}=await client.from('messages').select('*').eq('to_key',ADMIN_KEY).order('created_at',{ascending:false}).limit(50);
if(error)throw error;
const rows=data||[];
box.innerHTML=title+(rows.length?rows.map(r=>`
        <div style="padding:8px 0;border-top:1px solid var(--border);font-size:.84rem">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><strong>${esc(r.from_name||r.from_key)}</strong><span class="adm-msg-badge ${esc(r.from_role||'teen')}">${esc(r.from_role||'')}</span><span style="margin-left:auto;font-size:.72rem;color:var(--muted)">${esc(fmt(r.created_at))}</span></div>
          <div style="white-space:pre-wrap;line-height:1.5">${esc(r.text)}</div>
          <button type="button" class="adm-btn adm-btn-reply" style="font-size:.7rem;margin-top:4px" data-reply-key="${esc(r.from_key)}" data-reply-name="${esc(r.from_name||'')}">Reply</button>
        </div>`).join(''):'<div style="font-size:.8rem;color:var(--muted)">No replies yet. When someone answers a message from TeenWork Admin in their chat, it shows here.</div>');
}catch(e){box.innerHTML=title+'<div style="font-size:.8rem;color:var(--muted)">Could not load replies: '+esc(String(e&&e.message||e).slice(0,120))+'</div>';}
}
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/plan-limits-v40.js */
try{
(function(){
'use strict';
var ADMIN=(typeof ADMIN_EMAIL==='string'&&ADMIN_EMAIL)?ADMIN_EMAIL.toLowerCase():'ayaquarrierdraper@gmail.com';
var SETTINGS_KEY='tw_plan_settings';
var SETTINGS_ROW_KEY='plan_settings';
var DEFAULTS={
enabled:true,
selfUpgrade:true,
free:{
applicationsPerMonth:5,
aiPerDay:10,
messagesPerMonth:0,
employerPostsPerMonth:2,
employerApplicantsPerJob:3,
proOnly:{resume:true,pitch:true,wage:true,bulkmsg:true}
}
};
var KINDS={
apps:{setting:'applicationsPerMonth',period:'month',noun:'job applications',icon:'📋',pro:'unlimited job applications'},
ai:{setting:'aiPerDay',period:'day',noun:'AI requests',icon:'🤖',pro:'unlimited AI requests'},
msgs:{setting:'messagesPerMonth',period:'month',noun:'messages',icon:'💬',pro:'unlimited messages'},
posts:{setting:'employerPostsPerMonth',period:'month',noun:'job posts',icon:'📝',pro:'unlimited job posts'}
};
var FEATURES={resume:'AI Resume Builder',pitch:'Pitch AI',wage:'AI Wage Coach',bulkmsg:'Bulk messaging'};
var $=function(id){return document.getElementById(id);};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});};
function readJSON(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}}
function writeJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function toast(m,t){try{showToast(m,t||'info');}catch(e){}}
function go(page){try{gotoPage(page);}catch(e){}}
var ownClient=null;
function sb(){
if(typeof sbClient!=='undefined'&&sbClient)return sbClient;
if(ownClient)return ownClient;
try{
if(window.supabase&&typeof SUPABASE_URL==='string'&&typeof SUPABASE_KEY==='string'&&SUPABASE_KEY!=='YOUR_SUPABASE_ANON_KEY'){
ownClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
return ownClient;
}
}catch(e){}
return null;
}
function cfg(){try{return(typeof _adminGetConfig==='function')?_adminGetConfig():{};}catch(e){return{};}}
function user(){return window.currentUser||(typeof currentUser!=='undefined'?currentUser:null)||null;}
function isAdminUser(u){return!!(u&&(u.isAdmin||u.type==='admin'));}
function acctKey(u){u=u||user();return u?String(u.dataKey||u.email||'').toLowerCase():'';}
function dbLoad(k,d){try{return(window._DB&&_DB.load)?_DB.load(k,d):d;}catch(e){return d;}}
function dbSave(k,v){try{if(window._DB&&_DB.save)_DB.save(k,v);}catch(e){}}
function dbPrefix(){try{return(window._DB&&_DB._prefix)?_DB._prefix():'tw_guest_';}catch(e){return'tw_guest_';}}
var cloud={ok:false,checked:false,error:''};
function settings(){
var s=readJSON(SETTINGS_KEY,null)||{};
var f=s.free||{};
var out={enabled:s.enabled!==false,selfUpgrade:s.selfUpgrade!==false,free:{}};
if(typeof s.launchPaid==='boolean')out.launchPaid=s.launchPaid;
Object.keys(DEFAULTS.free).forEach(function(k){
if(k==='proOnly')out.free.proOnly=Object.assign({},DEFAULTS.free.proOnly,f.proOnly||{});
else out.free[k]=(typeof f[k]==='number'&&f[k]>=0&&isFinite(f[k]))?Math.floor(f[k]):DEFAULTS.free[k];
});
return out;
}
function pullSettings(){
var c=sb();if(!c)return Promise.resolve(false);
return Promise.resolve(c.from('user_data').select('value').eq('email',ADMIN).eq('key',SETTINGS_ROW_KEY).limit(1)).then(function(r){
if(r&&r.error)throw r.error;
var row=r&&r.data&&r.data[0];
if(row&&row.value){try{localStorage.setItem(SETTINGS_KEY,row.value);}catch(e){}}
cloud.ok=true;cloud.checked=true;cloud.error='';
refreshUI();
return true;
}).catch(function(e){cloud.ok=false;cloud.checked=true;cloud.error=(e&&e.message)||String(e);return false;});
}
function pushSettings(s){
writeJSON(SETTINGS_KEY,s);
var c=sb();if(!c)return Promise.resolve(false);
return Promise.resolve(c.from('user_data').upsert({email:ADMIN,key:SETTINGS_ROW_KEY,value:JSON.stringify(s),updated_at:new Date().toISOString()},{onConflict:'email,key'}))
.then(function(r){if(r&&r.error)throw r.error;cloud.ok=true;cloud.error='';return true;})
.catch(function(e){cloud.ok=false;cloud.error=(e&&e.message)||String(e);return false;});
}
function canSelfUpgrade(){var s=settings();return s.enabled&&s.selfUpgrade&& !cfg().launchPaid;}
function legacyTier(u){
try{
var em=String(u.email||'');
var a=localStorage.getItem('tw_'+em.replace(/[^a-z0-9]/gi,'_')+'_acct_tier');
var b=localStorage.getItem('tw_'+em+'_acct_tier');
return(a==='pro'||b==='pro')?'pro':'';
}catch(e){return'';}
}
function storedPlanOf(u){
u=u||user();
if(!u)return'free';
var p='';
var cur=user();
if(cur&&u===cur)p=dbLoad('plan','');
else{try{var px=u.isDemo?'tw_demo_'+u.type+'_':'tw_'+String(u.dataKey||u.email||'').replace(/[^a-z0-9]/gi,'_')+'_';p=JSON.parse((u.isDemo?sessionStorage:localStorage).getItem(px+'plan'));}catch(e){p='';}}
if(p==='pro'||p==='free')return p;
if(legacyTier(u)==='pro'){if(cur&&u===cur&& !u.isDemo)dbSave('plan','pro');return'pro';}
return'free';
}
function planOf(u){
u=u||user();
if(!u)return'free';
if(u.isDemo||u.twDemo||isAdminUser(u))return'pro';
if(!settings().enabled)return'pro';
if(u.type==='parent')return'free';
return storedPlanOf(u);
}
function isPro(u){return planOf(u)==='pro';}
function setMyPlan(p){dbSave('plan',p==='pro'?'pro':'free');refreshUI();}
function pad(n){return(n<10?'0':'')+n;}
function monthKey(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1);}
function dayKey(d){d=d||new Date();return monthKey(d)+'-'+pad(d.getDate());}
function usage(){
var u=dbLoad('plan_usage',null);
if(!u||typeof u!=='object')u={};
if(u.month!==monthKey())u={month:monthKey(),apps:0,msgs:0,posts:0,day:dayKey(),ai:0};
if(u.day!==dayKey()){u.day=dayKey();u.ai=0;}
['apps','msgs','posts','ai'].forEach(function(k){u[k]=Number(u[k])||0;});
return u;
}
function limitFor(kind){return(kind==='apps'||isPro())?0:(settings().free[KINDS[kind].setting]||0);}
function bump(kind){
if(!limitFor(kind))return;
var u=usage();u[kind]=(u[kind]||0)+1;
dbSave('plan_usage',u);
refreshUI();
}
function allow(kind){
var lim=limitFor(kind);if(!lim)return true;
if(usage()[kind]<lim)return true;
showLimit(kind,lim);
return false;
}
function featureAllowed(f){return isPro()|| !settings().free.proOnly[f];}
function requireFeature(f){if(featureAllowed(f))return true;showFeature(f);return false;}
function resetText(period){
if(period==='day')return'tomorrow';
var d=new Date(),n=new Date(d.getFullYear(),d.getMonth()+1,1);
return'on '+n.toLocaleDateString('en-US',{month:'long',day:'numeric'});
}
function closeModal(){var m=$('tw-plan-modal');if(m)m.remove();}
function modal(icon,title,body){
closeModal();
var m=document.createElement('div');
m.id='tw-plan-modal';
m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
m.style.cssText='position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:1rem;font-family:"DM Sans",system-ui,sans-serif';
var cta=canSelfUpgrade()?'See Pro (free during testing) →':'See Pro plans →';
m.innerHTML='<div style="background:var(--card,#fff);color:var(--text,#1f2937);border-radius:18px;padding:1.6rem 1.5rem;max-width:400px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.22);text-align:center">'+
'<div style="font-size:2.4rem;margin-bottom:.4rem">'+icon+'</div>'+
'<h3 style="font-family:Fraunces,Georgia,serif;font-size:1.15rem;color:var(--amber,#b45309);margin:0 0 .5rem">'+esc(title)+'</h3>'+
'<p style="font-size:.88rem;color:var(--muted,#6b7280);line-height:1.6;margin:0 0 1.1rem">'+esc(body)+'</p>'+
'<button type="button" id="tw-plan-modal-cta" style="width:100%;background:var(--amber,#d97706);color:#fff;border:none;padding:11px 0;border-radius:10px;font-family:inherit;font-size:.92rem;font-weight:700;cursor:pointer">'+esc(cta)+'</button>'+
'<button type="button" id="tw-plan-modal-later" style="width:100%;background:none;color:var(--muted,#6b7280);border:1.5px solid var(--border,#e5e7eb);padding:9px 0;border-radius:10px;font-family:inherit;font-size:.85rem;font-weight:600;cursor:pointer;margin-top:8px">Maybe later</button>'+
'</div>';
m.addEventListener('mousedown',function(e){if(e.target===m)closeModal();});
document.body.appendChild(m);
$('tw-plan-modal-cta').onclick=function(){closeModal();go('pricing');};
$('tw-plan-modal-later').onclick=closeModal;
}
function showLimit(kind,lim){
var k=KINDS[kind];
modal(k.icon,
"You've used your "+lim+' free '+k.noun+' this '+k.period,
'Free accounts get '+lim+' '+k.noun+(k.period==='day'?' a day':' a month')+'. Your count resets '+resetText(k.period)+'. TeenWork Pro has '+k.pro+'.');
}
function showFeature(f){
modal('⭐',(FEATURES[f]||'This')+' is a Pro feature',
'Free accounts can browse jobs, apply, message employers and use the AI coach. TeenWork Pro adds '+(FEATURES[f]||'this feature')+' and more.');
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();},true);
var active={};
function wrap(name,make){
var o=window[name];
if(typeof o!=='function'||o.__twPlan)return;
var inner=make(o);
var w=function(){
if(active[name])return o.apply(this,arguments);
active[name]=true;
try{return inner.apply(this,arguments);}finally{active[name]=false;}
};
w.__twPlan=true;window[name]=w;
}
function gateFeature(f){
return function(o){return function(){if(!requireFeature(f))return;return o.apply(this,arguments);};};
}
function countAI(o){
return function(){if(!allow('ai'))return;bump('ai');return o.apply(this,arguments);};
}
function wrapAll(){
['teenApply','applyToJob'].forEach(function(n){
wrap(n,function(o){return function(){
if(!allow('apps'))return;
var before=(typeof demoJobs!=='undefined'&&demoJobs)?demoJobs.length: -1;
var r=o.apply(this,arguments);
if(before>=0&&demoJobs.length>before)bump('apps');
return r;
};});
});
wrap('sendMsg',function(o){return function(contactId){
var input=$('msg-input-'+contactId);
var text=input?String(input.value||'').trim():'';
if(text&& !allow('msgs'))return;
var contact=null;
try{contact=(typeof msgAllContacts!=='undefined'&&msgAllContacts)?msgAllContacts.find(function(c){return c.id===contactId;}):null;}catch(e){}
var before=(contact&&contact.messages)?contact.messages.length: -1;
var r=o.apply(this,arguments);
var after=function(){
if(!text|| !limitFor('msgs'))return;
if(before>=0){if(contact.messages.length>before)bump('msgs');return;}
var blocked=false;try{blocked= !!(typeof scanMessage==='function'&&scanMessage(text).blocked);}catch(e){}
if(!blocked)bump('msgs');
};
if(r&&typeof r.then==='function')return r.then(function(v){after();return v;},function(err){after();throw err;});
after();return r;
};});
wrap('postJob',function(o){return function(){
if(!allow('posts'))return;
var before=(typeof employerPostedJobs!=='undefined'&&employerPostedJobs)?employerPostedJobs.length: -1;
var r=o.apply(this,arguments);
var after=function(){if(before>=0&&employerPostedJobs.length>before)bump('posts');};
if(r&&typeof r.then==='function')return r.then(function(v){after();return v;},function(err){after();throw err;});
after();return r;
};});
['chatAI','quickCoach','openAI','generateCoverLetter','aiWriteJobDesc',
'generateWeeklySummary','aiAutoFillShift'].forEach(function(n){wrap(n,countAI);});
wrap('openResumeBuilder',gateFeature('resume'));
wrap('openAIPitchModal',gateFeature('pitch'));
wrap('teenAIPitch',gateFeature('pitch'));
wrap('regenerateAIPitch',gateFeature('pitch'));
wrap('openWageCoach',gateFeature('wage'));
wrap('empBulkSend',gateFeature('bulkmsg'));
wrap('renderEmployerDashboard',function(o){return function(){var r=o.apply(this,arguments);setTimeout(capApplicants,0);return r;};});
wrap('renderEmpKanban',function(o){return function(){var r=o.apply(this,arguments);setTimeout(capApplicants,0);return r;};});
wrap('gotoPage',function(o){return function(page){
var r=o.apply(this,arguments);
if(page==='pricing')setTimeout(refreshPricing,0);
if(page==='teen'||page==='parent'||page==='employer')setTimeout(refreshUI,80);
return r;
};});
wrap('launchDashboard',function(o){return function(){
var r=o.apply(this,arguments);
setTimeout(function(){pullSettings();pullMine();refreshUI();},250);
setTimeout(refreshUI,1500);
return r;
};});
wrap('_adminTrackSignup',function(o){return function(){var r=o.apply(this,arguments);try{saveSignupPlan();}catch(e){}return r;};});
wrap('adminSetPaid',function(o){return function(){var r=o.apply(this,arguments);mirrorLaunchPaid();return r;};});
wrap('adminSaveLaunch',function(o){return function(){var r=o.apply(this,arguments);mirrorLaunchPaid();return r;};});
wrap('launchAdminPanel',function(o){return function(){var r=o.apply(this,arguments);try{injectAdminTab();}catch(e){console.warn('plan-limits admin tab failed',e);}pullSettings().then(renderAdmin);return r;};});
wrap('adminSwitchTab',function(o){return function(name){var r=o.apply(this,arguments);if(name==='plans')renderAdmin();return r;};});
}
function saveSignupPlan(){
var u=user();if(!u||u.isDemo||isAdminUser(u))return;
var picked=(document.querySelector('input[name="su-plan"]:checked')||{}).value||'free';
var s=settings();
var plan=(picked==='pro'&&s.selfUpgrade&& !cfg().launchPaid)?'pro':'free';
dbSave('plan',plan);
}
function mirrorLaunchPaid(){
var local=readJSON('tw_admin_config',{})||{};
var s=settings();s.launchPaid= !!local.launchPaid;
pushSettings(s);
}
(function(){
var orig=window._adminGetConfig;
if(typeof orig!=='function'||orig.__twPlan)return;
var w=function(){
var c=orig.apply(this,arguments)||{};
var s=readJSON(SETTINGS_KEY,null);
if(s&&typeof s.launchPaid==='boolean')c.launchPaid=s.launchPaid;
return c;
};
w.__twPlan=true;window._adminGetConfig=w;
})();
(function(){
var w=function(){return planOf();};
w.__twPlan=true;window._getUserTier=w;
})();
function pullMine(){
var c=sb(),u=user();
if(!c|| !u||u.isDemo||isAdminUser(u))return Promise.resolve(false);
var raw=String(u.dataKey||u.email||''),keys=raw.toLowerCase()===raw?[raw]:[raw,raw.toLowerCase()],px=dbPrefix();
return Promise.resolve(c.from('user_data').select('key,value').in('email',keys).in('key',['plan','plan_usage'])).then(function(r){
if(r&&r.error)throw r.error;
(r&&r.data||[]).forEach(function(row){try{localStorage.setItem(px+row.key,row.value);}catch(e){}});
refreshUI();
return true;
}).catch(function(){return false;});
}
function refreshPricing(){
var btn=$('pricing-pro-btn');if(!btn|| !settings().enabled)return;
var u=user();
if(u&&isPro(u)){btn.textContent="✓ You're on Pro";btn.style.background='var(--green)';}
else if(canSelfUpgrade()){btn.textContent='Switch to Pro — free during testing →';btn.style.background='var(--amber)';}
else{btn.textContent='Upgrade to Pro →';btn.style.background='var(--amber)';}
}
var origUpgrade=window.handleUpgradeClick;
window.handleUpgradeClick=function(){
if(!settings().enabled){return typeof origUpgrade==='function'?origUpgrade.apply(this,arguments):undefined;}
var u=user();
if(!u){toast('Create an account or sign in first, then pick Pro.','info');go('signup');return;}
if(isAdminUser(u)){toast('The admin account already has everything.','info');return;}
if(isPro(u)){toast("⭐ You're already on Pro.",'success');return;}
if(canSelfUpgrade()){setMyPlan('pro');refreshPricing();toast("⭐ You're on Pro — free while TeenWork is in testing.",'success');return;}
try{openSupportModal('Pro / Billing','I would like to upgrade to TeenWork Pro.');}
catch(e){toast('Payments are not set up yet. Message support and the TeenWork team can switch you to Pro.','info');}
};
function refreshUI(){
try{
var u=user();
document.querySelectorAll('.dash-header').forEach(function(h){
var old=h.querySelector('.tw-plan-pill');if(old)old.remove();
if(!u||isAdminUser(u)|| !settings().enabled)return;
var page=h.closest('.page');var pid=page?page.id:'';
var pill=document.createElement('div');
pill.className='tw-plan-pill';
if(isPro(u)){
if(h.querySelector('.tw-tier-badge'))return;
pill.textContent='⭐ Pro';
pill.style.cssText='font-size:.72rem;font-weight:700;color:var(--amber);background:var(--amber-pale);padding:4px 10px;border-radius:20px;border:1.5px solid var(--amber)';
}else{
var us=usage(),parts=[];
if(pid==='page-employer'){if(limitFor('posts'))parts.push(us.posts+'/'+limitFor('posts')+' posts');}
else if(pid==='page-teen'){if(limitFor('apps'))parts.push(us.apps+'/'+limitFor('apps')+' applications');}
if(limitFor('ai'))parts.push(us.ai+'/'+limitFor('ai')+' AI today');
if(limitFor('msgs'))parts.push(us.msgs+'/'+limitFor('msgs')+' messages');
pill.innerHTML='<b>Free plan</b>'+(parts.length?' · '+esc(parts.join(' · ')):'')+' · <span style="text-decoration:underline">See Pro</span>';
pill.title='Your free-plan usage. Tap to see Pro.';
pill.style.cssText='display:inline-flex;align-items:center;gap:4px;font-size:.74rem;font-weight:600;color:var(--muted);cursor:pointer;padding:4px 10px;border:1.5px solid var(--border);border-radius:20px;background:var(--card,#fff)';
pill.onclick=function(){go('pricing');};
}
var right=h.querySelector(':scope > div:last-child')||h;
right.insertBefore(pill,right.firstChild);
});
var wb=$('wage-coach-btn');if(wb)wb.onclick=function(){window.openWageCoach();};
var fb=$('emp-freemium-banner');if(fb&&settings().enabled)fb.style.display='none';
refreshPricing();
capApplicants();
}catch(e){console.warn('plan-limits refreshUI',e);}
}
function allowedApplicantIdx(){
var n=settings().free.employerApplicantsPerJob;
var u=user();
if(!u||u.type!=='employer'||isPro(u)|| !n||typeof demoApplicants==='undefined'|| !demoApplicants)return null;
var seen={},ok={};
demoApplicants.forEach(function(a,i){var j=(a&&a.job)||'';seen[j]=(seen[j]||0)+1;if(seen[j]<=n)ok[i]=true;});
return ok;
}
function noteHTML(hidden){
return'<div class="tw-plan-applicants-note" style="margin-top:10px;padding:12px 14px;background:var(--amber-pale,#fff7ed);border:1.5px solid var(--amber,#d97706);border-radius:12px;font-size:.84rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
'<span style="flex:1"><strong>🔒 '+hidden+' more applicant'+(hidden===1?'':'s')+'</strong> — free accounts see '+settings().free.employerApplicantsPerJob+' per job.</span>'+
'<button type="button" class="btn-primary" style="padding:6px 14px;font-size:.8rem;background:var(--amber)" onclick="gotoPage(\'pricing\')">See Pro</button></div>';
}
function setNote(container,where,hidden){
var note=container.querySelector(':scope > .tw-plan-applicants-note');
if(!hidden){if(note)note.remove();return;}
if(note&&note.getAttribute('data-hidden')===String(hidden))return;
if(note)note.remove();
var tmp=document.createElement('div');tmp.innerHTML=noteHTML(hidden);
var el=tmp.firstChild;el.setAttribute('data-hidden',String(hidden));
if(where==='end')container.appendChild(el);else container.insertBefore(el,where.nextSibling);
}
var capping=false;
function capApplicants(){
if(capping)return;capping=true;
try{
var ok=allowedApplicantIdx();
var list=$('applicants-list');
if(list){
var hidden=0;
list.querySelectorAll('.applicant-card').forEach(function(c,i){
var want=(!!ok&& !ok[i])?'none':'';
if(c.style.display!==want)c.style.display=want;
if(want)hidden++;
});
setNote(list,'end',hidden);
}
var board=$('emp-kanban-board');
if(board){
var hid=0;
board.querySelectorAll('[ondragstart]').forEach(function(c){
var m= /_kDragging=(\d+)/.exec(c.getAttribute('ondragstart')||'');if(!m)return;
var want=(!!ok&& !ok[+m[1]])?'none':'';
if(c.style.display!==want)c.style.display=want;
if(want)hid++;
});
if(board.parentElement)setNote(board.parentElement,board,hid);
}
}catch(e){}finally{capping=false;}
}
var capTimer=null;
function watchApplicants(){
['applicants-list','emp-kanban-board'].forEach(function(id){
var el=$(id);if(!el||el.__twPlanObs)return;
el.__twPlanObs=true;
new MutationObserver(function(){if(capping)return;clearTimeout(capTimer);capTimer=setTimeout(capApplicants,30);}).observe(el,{childList:true,subtree:true});
});
}
var FIELDS=[
['aiPerDay','AI requests per day'],
['messagesPerMonth','Messages per month (0 = unlimited)'],
['employerPostsPerMonth','Job posts per month (employers)'],
['employerApplicantsPerJob','Applicants shown per job (employers, 0 = all)']
];
function injectAdminTab(){
var panel=$('tw-admin-panel')||document.querySelector('#page-admin');
if(!panel||$('adm-panel-plans'))return;
var tabs=panel.querySelector('.adm-tabs'),content=panel.querySelector('.adm-content');
if(!tabs|| !content)return;
var b=document.createElement('button');
b.className='adm-tab';b.id='adm-tab-plans';b.textContent='💎 Plans';
b.onclick=function(){window.adminSwitchTab('plans',b);};
tabs.appendChild(b);
var holder=document.createElement('div');
holder.innerHTML='<div class="adm-tab-panel" id="adm-panel-plans"><div class="adm-section-title">💎 Plans &amp; usage limits</div><div id="twpl-body"></div></div>';
content.appendChild(holder.firstChild);
}
function card(inner){return'<div style="background:var(--card,#fff);border:1.5px solid var(--border,#e5e7eb);border-radius:14px;padding:16px;margin-bottom:14px">'+inner+'</div>';}
function renderAdmin(){
var body=$('twpl-body');if(!body)return;
var s=settings(),c=cfg();
var cloudLine= !sb()?'⚪ Cloud database is not connected on this page. Settings you save here apply to this device only until it connects.'
:cloud.ok?'🟢 Cloud connected. Settings saved here reach every device the next time the app loads.'
:cloud.checked?'🔴 Could not read the cloud settings row ('+esc(cloud.error)+'). Saving will still try the cloud.'
:'⏳ Checking the cloud…';
var html='';
html+='<div style="font-size:.82rem;color:var(--muted);margin-bottom:12px">'+cloudLine+'</div>';
html+=card(
'<label style="display:flex;gap:8px;align-items:flex-start;font-size:.9rem;font-weight:700;cursor:pointer"><input type="checkbox" id="twpl-enabled"'+(s.enabled?' checked':'')+' style="margin-top:3px"> <span>Plan limits are ON<br><span style="font-weight:400;color:var(--muted);font-size:.8rem">Off = every account gets everything, like before.</span></span></label>'+
'<label style="display:flex;gap:8px;align-items:flex-start;font-size:.88rem;cursor:pointer;margin-top:10px"><input type="checkbox" id="twpl-self"'+(s.selfUpgrade?' checked':'')+' style="margin-top:3px"> <span>While Paid Launch is off, anyone can switch to Pro for free on the pricing page<br><span style="color:var(--muted);font-size:.8rem">Paid Launch is currently <strong>'+(c.launchPaid?'ON':'OFF')+'</strong> (Launch Controls tab). When it is on, only you can give Pro, below.</span></span></label>'+
'<div style="font-weight:700;font-size:.88rem;margin:16px 0 8px">Free plan limits</div>'+
'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">'+
FIELDS.map(function(f){return'<label style="font-size:.8rem;color:var(--muted)">'+esc(f[1])+'<br><input type="number" min="0" step="1" id="twpl-'+f[0]+'" value="'+s.free[f[0]]+'" style="width:100%;margin-top:4px;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:.9rem;background:var(--card,#fff);color:var(--text)"></label>';}).join('')+
'</div>'+
'<div style="font-weight:700;font-size:.88rem;margin:16px 0 8px">Pro-only features (unchecked = free accounts can use it)</div>'+
'<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:.86rem">'+
Object.keys(FEATURES).map(function(k){return'<label style="cursor:pointer"><input type="checkbox" id="twpl-pro-'+k+'"'+(s.free.proOnly[k]?' checked':'')+'> '+esc(FEATURES[k])+'</label>';}).join('')+
'</div>'+
'<div style="margin-top:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button type="button" class="btn-primary" onclick="twPlanAdminSave()">💾 Save for everyone</button><span id="twpl-save-msg" style="font-size:.8rem;color:var(--muted)"></span></div>'
);
html+=card(
'<div style="font-weight:700;font-size:.95rem;margin-bottom:6px">⭐ Give or remove Pro</div>'+
'<div style="font-size:.8rem;color:var(--muted);margin-bottom:10px">Type the account email (for a second account on the same email use email#2). The change reaches them the next time they sign in.</div>'+
'<div style="display:flex;gap:8px;flex-wrap:wrap"><input type="email" id="twpl-email" placeholder="name@example.com" style="flex:1;min-width:200px;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:.9rem;background:var(--card,#fff);color:var(--text)">'+
'<button type="button" class="btn-primary" onclick="twPlanAdminSet(\'pro\')">Give Pro</button><button type="button" class="btn-secondary" onclick="twPlanAdminSet(\'free\')">Set to Free</button></div>'+
'<div id="twpl-set-msg" style="font-size:.8rem;color:var(--muted);margin-top:8px"></div>'+
'<div style="font-weight:700;font-size:.85rem;margin:14px 0 6px">Accounts with a plan saved in the cloud</div><div id="twpl-list" style="font-size:.84rem">Loading…</div>'
);
html+=card(
'<div style="font-weight:700;font-size:.9rem;margin-bottom:6px">What these limits can and cannot do</div>'+
'<div style="font-size:.82rem;color:var(--muted);line-height:1.6">Limits and plans are saved per account in the cloud, so clearing the browser or switching phones does not reset them. But the app runs in the browser with a public database key, so a person who opens the browser developer tools can change their own plan or counters. These limits keep ordinary users on the free plan; they are not payment security. Real enforcement needs Supabase Auth with row-level rules or a server that checks the plan before an action.</div>'
);
body.innerHTML=html;
loadPlanList();
}
function loadPlanList(){
var el=$('twpl-list');if(!el)return;
var c=sb();
if(!c){el.textContent='Cloud database is not connected on this page.';return;}
Promise.resolve(c.from('user_data').select('email,value,updated_at').eq('key','plan').limit(2000)).then(function(r){
if(r&&r.error)throw r.error;
var rows=(r&&r.data)||[];
if(!rows.length){el.textContent='No account has a saved plan yet. New sign-ups and anyone who switches on the pricing page will appear here.';return;}
rows.sort(function(a,b){return String(a.email).localeCompare(String(b.email));});
el.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:.83rem">'+rows.map(function(row){
var v='';try{v=JSON.parse(row.value);}catch(e){v=row.value;}
return'<tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 4px">'+esc(row.email)+'</td><td style="padding:6px 4px;font-weight:700;color:'+(v==='pro'?'var(--amber)':'var(--muted)')+'">'+(v==='pro'?'⭐ Pro':'Free')+'</td><td style="padding:6px 4px;text-align:right"><button type="button" class="btn-sm btn-secondary" onclick="twPlanAdminSet(\''+(v==='pro'?'free':'pro')+'\',\''+esc(row.email)+'\')">'+(v==='pro'?'Set to Free':'Give Pro')+'</button></td></tr>';
}).join('')+'</table>';
}).catch(function(e){el.textContent='Could not read plans from the cloud ('+((e&&e.message)||e)+').';});
}
window.twPlanAdminSave=function(){
var s=settings();
s.enabled= !!($('twpl-enabled')&&$('twpl-enabled').checked);
s.selfUpgrade= !!($('twpl-self')&&$('twpl-self').checked);
FIELDS.forEach(function(f){var v=parseInt($('twpl-'+f[0])&&$('twpl-'+f[0]).value,10);s.free[f[0]]=(isNaN(v)||v<0)?0:v;});
Object.keys(FEATURES).forEach(function(k){s.free.proOnly[k]= !!($('twpl-pro-'+k)&&$('twpl-pro-'+k).checked);});
var local=readJSON('tw_admin_config',{})||{};s.launchPaid= !!local.launchPaid;
var msg=$('twpl-save-msg');if(msg)msg.textContent='Saving…';
pushSettings(s).then(function(ok){
if(msg)msg.textContent=ok?'Saved to the cloud '+new Date().toLocaleTimeString()+'.':(sb()?'Saved on this device, but the cloud save failed: '+cloud.error:'Saved on this device only (cloud not connected).');
toast(ok?'✅ Plan limits saved for everyone':'⚠️ Saved on this device only',ok?'success':'warn');
try{_twAdminAudit('plan-limits-saved',JSON.stringify(s.free));}catch(e){}
refreshUI();
});
};
window.twPlanAdminSet=function(plan,email){
var key=String(email||($('twpl-email')&&$('twpl-email').value)||'').trim().toLowerCase();
var msg=$('twpl-set-msg');
if(!key||key.indexOf('@')<0){if(msg)msg.textContent='Type the account email first.';return;}
try{localStorage.setItem('tw_'+key.replace(/[^a-z0-9]/gi,'_')+'_plan',JSON.stringify(plan));}catch(e){}
var c=sb();
if(!c){if(msg)msg.textContent='Saved on this device only: the cloud database is not connected.';return;}
if(msg)msg.textContent='Saving…';
Promise.resolve(c.from('user_data').upsert({email:key,key:'plan',value:JSON.stringify(plan),updated_at:new Date().toISOString()},{onConflict:'email,key'})).then(function(r){
if(r&&r.error)throw r.error;
if(msg)msg.textContent=(plan==='pro'?'⭐ ':'')+key+' is now on '+(plan==='pro'?'Pro':'the free plan')+'.';
toast('✅ '+key+' → '+(plan==='pro'?'Pro':'Free'),'success');
try{_twAdminAudit('plan-set',key+' → '+plan);}catch(e){}
loadPlanList();
}).catch(function(e){if(msg)msg.textContent='Cloud save failed: '+((e&&e.message)||e);});
};
window.twPlan={planOf:planOf,storedPlanOf:storedPlanOf,usage:usage,settings:settings,allow:allow,bump:bump,refresh:refreshUI,pull:pullSettings,setMyPlan:setMyPlan,limitFor:limitFor};
function start(){
wrapAll();
watchApplicants();
refreshUI();
var tries=0;
(function tick(){if(sb()){pullSettings();return;}if(++tries<60)setTimeout(tick,250);})();
window.addEventListener('tw-supabase-ready',function(){pullSettings();pullMine();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(start,0);});
else setTimeout(start,0);
setTimeout(wrapAll,1500);
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/branded-email-v41.js */
try{
(function(){
'use strict';
if(window.__twBrandedEmail)return;
window.__twBrandedEmail=true;
var C={
green:'#2d6a4f',greenMid:'#40916c',greenLight:'#52b788',greenPale:'#d8f3dc',greenTint:'#eef8f1',
amber:'#e76f00',amberMid:'#f49d37',amberPale:'#fff1e0',amberText:'#7a4700',
red:'#c0392b',redPale:'#fde8e8',blue:'#1a5276',bluePale:'#dbeafe',
bg:'#f5f0e8',card:'#fffdf7',text:'#1c1c1c',muted:'#4b5563',border:'#e2ddd4',
dark:'#1a4731',darker:'#0d2d1e'
};
var FONT="'DM Sans',Arial,Helvetica,sans-serif";
var DISPLAY="Fraunces,Georgia,'Times New Roman',serif";
var MARK='<!--tw-branded-email-->';
var LOGO='https://teenwork.ayaqd.com/email-logo.png';
var EMOJI_RE= /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍(?:\p{Extended_Pictographic})️?|\p{Emoji_Modifier})*/gu;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function cfg(){
return{
service:typeof EMAILJS_SERVICE!=='undefined'?EMAILJS_SERVICE:'',
template:typeof EMAILJS_TEMPLATE!=='undefined'?EMAILJS_TEMPLATE:'',
key:typeof EMAILJS_PUBKEY!=='undefined'?EMAILJS_PUBKEY:'',
admin:typeof ADMIN_EMAIL!=='undefined'?ADMIN_EMAIL:'',
quota:typeof _emailjsQuotaExceeded!=='undefined'&& !!_emailjsQuotaExceeded
};
}
function appUrl(){try{return/^https?:/.test(location.protocol)?location.href.split('#')[0].split('?')[0]:'';}catch(e){return'';}}
function looksHtml(m){var t=String(m||'').trim();return t.charAt(0)==='<'&&t.charAt(t.length-1)==='>';}
function isCode(t){return/^(?=.*\d)[A-Z0-9][A-Z0-9-]{3,11}$/.test(String(t).trim());}
function firstEmoji(s){var m=String(s||'').match(EMOJI_RE);return m?m[0]:'';}
function noEmoji(s){return String(s||'').replace(EMOJI_RE,'').replace(/\s{2,}/g,' ').replace(/\s+([!?.,:])/g,'$1').trim();}
function button(label,url){
url=url||appUrl();
if(!url)return'';
return'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px;"><tr>'+
'<td bgcolor="'+C.green+'" style="background:'+C.green+';border-radius:12px;">'+
'<a href="'+esc(url)+'" style="display:inline-block;padding:14px 26px;font-family:'+FONT+';font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">'+esc(label)+'</a>'+
'</td></tr></table>';
}
function codeBox(code){
return'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 20px;"><tr>'+
'<td bgcolor="'+C.amberPale+'" style="background:'+C.amberPale+';border:2px dashed '+C.amberMid+';border-radius:14px;padding:14px 26px;font-family:\'Courier New\',Courier,monospace;font-size:30px;font-weight:bold;letter-spacing:6px;color:'+C.green+';">'+esc(code)+'</td>'+
'</tr></table>';
}
function listBox(items,numbered){
var rows=items.map(function(html,i){
return'<tr>'+
'<td valign="top" width="30" style="width:30px;padding:7px 0;">'+
'<div style="width:24px;height:24px;line-height:24px;border-radius:12px;background:'+C.green+';color:#ffffff;font-family:'+FONT+';font-size:13px;font-weight:bold;text-align:center;">'+(numbered?(i+1):'&#10003;')+'</div></td>'+
'<td valign="top" style="padding:7px 0 7px 10px;font-family:'+FONT+';font-size:15px;line-height:1.5;color:'+C.text+';">'+html+'</td>'+
'</tr>';
}).join('');
return'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="'+C.greenTint+'" style="width:100%;margin:6px 0 20px;background:'+C.greenTint+';border:1px solid '+C.greenPale+';border-left:5px solid '+C.greenLight+';border-radius:14px;">'+
'<tr><td style="padding:10px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'+rows+'</table></td></tr></table>';
}
function callout(icon,html,tone){
var bg=tone==='amber'?C.amberPale:tone==='red'?C.redPale:C.greenTint;
var bar=tone==='amber'?C.amber:tone==='red'?C.red:C.greenLight;
var fg=tone==='amber'?C.amberText:tone==='red'?C.red:C.dark;
return'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="'+bg+'" style="width:100%;margin:8px 0 20px;background:'+bg+';border-left:5px solid '+bar+';border-radius:12px;"><tr>'+
'<td valign="top" width="34" style="width:34px;padding:14px 0 14px 16px;font-size:20px;line-height:1.3;">'+icon+'</td>'+
'<td valign="top" style="padding:14px 16px 14px 8px;font-family:'+FONT+';font-size:15px;line-height:1.55;color:'+fg+';">'+html+'</td>'+
'</tr></table>';
}
function stepCards(steps){
return steps.map(function(s,i){
return'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;margin:0 0 10px;background:#ffffff;border:1px solid '+C.border+';border-left:5px solid '+s.color+';border-radius:14px;"><tr>'+
'<td valign="middle" width="56" style="width:56px;padding:14px 0 14px 16px;">'+
'<div style="width:40px;height:40px;line-height:40px;border-radius:20px;background:'+s.tint+';text-align:center;font-size:20px;">'+s.icon+'</div></td>'+
'<td valign="middle" style="padding:14px 18px 14px 10px;font-family:'+FONT+';">'+
'<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:'+s.color+';">Step '+(i+1)+'</div>'+
'<div style="font-size:16px;font-weight:bold;color:'+C.text+';margin-top:2px;">'+s.title+'</div>'+
'<div style="font-size:14px;line-height:1.5;color:'+C.muted+';margin-top:2px;">'+s.text+'</div>'+
'</td></tr></table>';
}).join('');
}
function textToHtml(plain){
var paras=String(plain||'').replace(/\r\n?/g,'\n').trim().split(/\n[ \t]*\n/);
return paras.map(function(p){
var t=p.replace(/^\n+|\n+$/g,'');
if(!t.trim())return'';
if(isCode(t))return codeBox(t.trim());
if(/^\s*[—–]\s*\S/.test(t)&&t.split('\n').length<=2)return'<p data-tw="signoff">'+esc(t.trim()).replace(/\n/g,'<br>')+'</p>';
var lines=t.split('\n'),out='',bullets=[];
function flush(){if(bullets.length){out+='<ul>'+bullets.map(function(b){return'<li>'+b+'</li>';}).join('')+'</ul>';bullets=[];}}
var para=[];
function flushPara(){if(para.length){out+='<p>'+para.join('<br>')+'</p>';para=[];}}
lines.forEach(function(line){
var m=line.match(/^\s*(?:[✓✔•\-*]|✅)\s+(.*)$/);
var lbl=line.match(/^\s*([A-Z][A-Za-z ]{1,24}):\s+(\S.*)$/);
if(m){flushPara();bullets.push(esc(m[1]));return;}
flush();
para.push(lbl?'<b>'+esc(lbl[1])+':</b> '+esc(lbl[2]):esc(line.trim()));
});
flushPara();flush();
return out;
}).join('');
}
function restyle(html){
var tpl=document.createElement('template');
tpl.innerHTML=html;
var root=tpl.content;
function merge(el,base){var old=el.getAttribute('style');el.setAttribute('style',base+(old?';'+old:''));}
Array.prototype.forEach.call(root.querySelectorAll('ul,ol'),function(list){
if(list.closest('[data-tw-keep]'))return;
var items=Array.prototype.filter.call(list.children,function(c){return c.tagName==='LI';}).map(function(li){return li.innerHTML;});
var holder=document.createElement('template');
holder.innerHTML=listBox(items,list.tagName==='OL');
list.replaceWith(holder.content);
});
Array.prototype.forEach.call(root.querySelectorAll('p'),function(p){
if(p.closest('[data-tw-keep]'))return;
if(isCode(p.textContent)&& !p.querySelector('*')){var h=document.createElement('template');h.innerHTML=codeBox(p.textContent.trim());p.replaceWith(h.content);return;}
if(p.getAttribute('data-tw')==='signoff'){p.setAttribute('style','margin:22px 0 0;font-family:'+FONT+';font-size:15px;line-height:1.5;color:'+C.green+';font-weight:bold;');p.removeAttribute('data-tw');return;}
merge(p,'margin:0 0 14px;font-family:'+FONT+';font-size:16px;line-height:1.6;color:'+C.text);
});
Array.prototype.forEach.call(root.querySelectorAll('h1,h2,h3'),function(h){
if(h.closest('[data-tw-keep]'))return;
merge(h,'margin:18px 0 8px;font-family:'+DISPLAY+';font-weight:900;color:'+C.green+';font-size:'+(h.tagName==='H1'?'24px':h.tagName==='H2'?'20px':'17px'));
});
Array.prototype.forEach.call(root.querySelectorAll('b,strong'),function(b){if(!b.closest('[data-tw-keep]'))merge(b,'color:'+C.green);});
Array.prototype.forEach.call(root.querySelectorAll('a'),function(a){if(!a.getAttribute('style'))a.setAttribute('style','color:'+C.green+';font-weight:bold;text-decoration:underline;');});
Array.prototype.forEach.call(root.querySelectorAll('hr'),function(hr){hr.setAttribute('style','border:none;border-top:1px solid '+C.border+';margin:18px 0;');});
Array.prototype.forEach.call(root.querySelectorAll('[data-tw-keep]'),function(el){el.removeAttribute('data-tw-keep');});
var div=document.createElement('div');
div.appendChild(root.cloneNode(true));
return div.innerHTML;
}
function frame(o){
var alert=o.tone==='alert';
var accent=alert?C.red:C.green;
var badgeBg=alert?C.redPale:C.greenPale;
var stripe=alert
?'background:'+C.red+';background-image:linear-gradient(90deg,'+C.red+','+C.amber+');'
:'background:'+C.amber+';background-image:linear-gradient(90deg,'+C.amber+' 0%,'+C.amberMid+' 45%,'+C.greenLight+' 100%);';
var pre=esc(String(o.preheader||'').slice(0,140));
return MARK+
'<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:'+C.bg+';">'+pre+'&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>'+
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="'+C.bg+'" style="width:100%;background:'+C.bg+';margin:0;padding:0;">'+
'<tr><td align="center" style="padding:28px 12px;">'+
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="'+C.card+'" style="width:100%;max-width:600px;background:'+C.card+';border:1px solid '+C.border+';border-radius:20px;overflow:hidden;">'+
'<tr><td bgcolor="'+C.green+'" style="background:'+C.green+';background-image:linear-gradient(135deg,'+C.green+' 0%,'+C.dark+' 60%,'+C.darker+' 100%);padding:26px 32px 22px;border-radius:20px 20px 0 0;">'+
'<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'+
'<td style="padding:0 12px 0 0;vertical-align:middle;"><img src="'+LOGO+'" width="44" height="44" alt="TeenWork tree logo" style="display:block;width:44px;height:44px;border:0;outline:none;text-decoration:none;border-radius:10px;"></td>'+
'<td style="vertical-align:middle;font-family:'+DISPLAY+';font-size:30px;font-weight:900;line-height:1.1;color:#ffffff;">Teen<span style="color:'+C.amberMid+';">Work</span></td>'+
'</tr></table>'+
'<div style="font-family:'+FONT+';font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:'+C.greenLight+';margin-top:8px;">Safe local jobs for teens 13&ndash;17</div>'+
'</td></tr>'+
'<tr><td height="6" style="height:6px;line-height:6px;font-size:0;'+stripe+'">&nbsp;</td></tr>'+
'<tr><td style="padding:30px 32px 4px;">'+
(o.icon?'<div style="width:56px;height:56px;line-height:56px;border-radius:28px;background:'+badgeBg+';text-align:center;font-size:28px;margin:0 0 14px;">'+o.icon+'</div>':'')+
(o.heading?'<h1 style="margin:0 0 6px;font-family:'+DISPLAY+';font-size:26px;line-height:1.25;font-weight:900;color:'+accent+';">'+esc(o.heading)+'</h1>':'')+
'</td></tr>'+
'<tr><td style="padding:14px 32px 30px;font-family:'+FONT+';font-size:16px;line-height:1.6;color:'+C.text+';">'+o.body+'</td></tr>'+
(o.share?'<tr><td style="padding:0 32px 26px;">'+o.share+'</td></tr>':'')+
'<tr><td bgcolor="'+C.bg+'" style="background:'+C.bg+';border-top:1px solid '+C.border+';padding:20px 32px 24px;text-align:center;font-family:'+FONT+';font-size:12px;line-height:1.6;color:'+C.muted+';border-radius:0 0 20px 20px;">'+
'<div style="font-family:'+DISPLAY+';font-size:15px;font-weight:900;color:'+C.green+';margin-bottom:4px;">&#127795; Built by a teen, for teens.</div>'+
'Questions? Tap <b style="color:'+C.green+';">Help &amp; Support</b> in the TeenWork app and we&rsquo;ll reply in your in-app inbox.'+
'</td></tr>'+
'</table>'+
'</td></tr></table>';
}
function iconFor(subject,tone){
if(tone==='alert')return'&#128680;';
var e=firstEmoji(subject);
if(e)return e;
var s=String(subject||'').toLowerCase();
if(/verif|code/.test(s))return'&#128274;';
if(/consent|parent|link/.test(s))return'&#128106;';
if(/support|message/.test(s))return'&#128236;';
if(/sign-?up/.test(s))return'&#128640;';
return'&#127795;';
}
function brand(service,template,params){
var c=cfg(),MAIN_SERVICE=c.service,MAIN_TEMPLATE=c.template;
var p=Object.assign({},params||{});
if(service==='teenwork_service'&&template==='safety_alert'&&MAIN_SERVICE&&MAIN_TEMPLATE){
var teen=String(p.teen_name||'A teen');
p={
to_email:p.to_email,to_name:p.to_name||'Parent/Guardian',from_name:'TeenWork Safety',
reply_to:c.admin,
subject:'🚨 SOS alert: '+teen.replace(/[<>]/g,'')+' needs help',
message:'Hi,\n\n'+teen+' pressed the SOS button in TeenWork.\n\nNote: '+(p.alert_note||'(no note provided)')+'\nTime: '+(p.alert_time||new Date().toLocaleString())+'\n\nPlease check in with them right away.\n\n— TeenWork Safety',
tw_tone:'alert',tw_heading:teen+' pressed the SOS button'
};
service=MAIN_SERVICE;template=MAIN_TEMPLATE;
}
if(!MAIN_TEMPLATE||template!==MAIN_TEMPLATE||typeof p.message!=='string'||p.message.indexOf(MARK)===0)return[service,template,params];
var subject=String(p.subject||'TeenWork');
var tone=p.tw_tone||(/\bSOS\b|safety alert|🚨/i.test(subject)?'alert':'');
var heading=p.tw_heading||noEmoji(subject);
var icon=p.tw_icon||iconFor(subject,tone);
var inner=looksHtml(p.message)?p.message:textToHtml(p.message);
var body=restyle(inner);
var tmp=document.createElement('div');tmp.innerHTML=inner;
var preheader=p.tw_preheader||String(tmp.textContent||'').replace(/\s+/g,' ').replace(/^\s*Hi\b[^,]{0,40},\s*/i,'').trim();
var share='';
try{if(tone!=='alert'&&typeof window.twEmailShareBlock==='function')share=window.twEmailShareBlock(p,C,FONT)||'';}catch(e){share='';}
p.message=frame({heading:heading,icon:icon,tone:tone,body:body,preheader:preheader,share:share});
if(!p.from_name)p.from_name='TeenWork';
if(!p.to_name)p.to_name='';
delete p.tw_tone;delete p.tw_heading;delete p.tw_icon;delete p.tw_preheader;delete p.tw_share;
return[service,template,p];
}
window.twBrandEmailParams=function(params){var c=cfg();return brand(c.service,c.template,params)[2];};
function install(){
var ej=window.emailjs;
if(!ej||ej.__twBranded||typeof ej.send!=='function')return;
var origSend=ej.send;
var w={};
Object.keys(ej).forEach(function(k){try{w[k]=ej[k];}catch(e){}});
w.send=function(service,template,params,key){
var a=[service,template,params];
try{a=brand(service,template,params);}catch(e){console.warn('TeenWork branded email failed, sending plain:',e);}
var pr=typeof window.twDeliverEmail==='function'
?window.twDeliverEmail(a[0],a[1],a[2],key,function(){return origSend.call(ej,a[0],a[1],a[2],key);})
:origSend.call(ej,a[0],a[1],a[2],key);
if(pr&&typeof pr.catch==='function'&&a[0]!==service)pr.catch(function(e){console.warn('TeenWork SOS email failed:',e);});
return pr;
};
Object.defineProperty(w,'__twBranded',{value:true});
window.emailjs=w;
}
install();
Array.prototype.forEach.call(document.querySelectorAll('script[src*="emailjs"]'),function(s){s.addEventListener('load',install);});
setInterval(install,500);
window.twSendEmail=function(to,subject,html,opts){
try{
var c=cfg();
if(!to||typeof emailjs==='undefined'|| !c.service)return Promise.resolve(false);
if(c.quota)return Promise.resolve(false);
install();
try{emailjs.init(c.key);}catch(e){}
var params={to_email:to,subject:subject,message:html,reply_to:c.admin,from_name:'TeenWork'};
opts=opts||{};
if(opts.heading)params.tw_heading=opts.heading;
if(opts.icon)params.tw_icon=opts.icon;
if(opts.preheader)params.tw_preheader=opts.preheader;
if(opts.tone)params.tw_tone=opts.tone;
return emailjs.send(c.service,c.template,params)
.then(function(){return true;},function(e){console.warn('TeenWork email failed:',e);return false;});
}catch(e){console.warn(e);return Promise.resolve(false);}
};
window.twWelcomeEmail=function(to,first,type){
var name=String(first||'').replace(/[<>]/g,'').trim();
var f=esc(name||'there');
var intro,steps,note;
if(type==='teen'){
intro='Hi '+f+', your account is ready! Here&rsquo;s how to get started:';
steps=[
{icon:'&#129489;&#8205;&#128188;',color:C.green,tint:C.greenPale,title:'Finish your profile',text:'So employers can get to know you.'},
{icon:'&#128218;',color:C.blue,tint:C.bluePale,title:'Learn to be a great worker',text:'Short lessons on first impressions, teamwork, interviews, your first paycheck and more.'},
{icon:'&#128106;',color:C.amber,tint:C.amberPale,title:'Link a parent or guardian',text:'This unlocks applying for jobs and messaging employers.'}
];
note=callout('&#128274;','<b style="color:'+C.amberText+';">You&rsquo;re in limited mode for now.</b> Until a parent is linked, you can look around, take lessons and build your profile.','amber');
}else if(type==='parent'){
intro='Hi '+f+', your parent account is ready. You can link your teen, approve what they apply for, and keep an eye on their work.';
steps=[
{icon:'&#128106;',color:C.green,tint:C.greenPale,title:'Approve your teen&rsquo;s link request',text:'It shows up in your account as soon as your teen sends it.'},
{icon:'&#128203;',color:C.blue,tint:C.bluePale,title:'Review jobs and messages',text:'Look over the jobs your teen applies for and their messages.'},
{icon:'&#128279;',color:C.amber,tint:C.amberPale,title:'Link another teen any time',text:'Use the invite code option in your account.'}
];
note=callout('&#9989;','<b style="color:'+C.dark+';">You stay in control.</b> Your teen can&rsquo;t apply for jobs or message employers until you approve the link.','green');
}else{
intro='Hi '+f+', your employer account is ready. Post a job, set up your business profile, and meet local teens looking for safe, legal work.';
steps=[
{icon:'&#127970;',color:C.green,tint:C.greenPale,title:'Complete your business profile',text:'Help teens and parents see who you are.'},
{icon:'&#128221;',color:C.amber,tint:C.amberPale,title:'Post your first job',text:'Describe the work, the pay and the hours.'},
{icon:'&#128203;',color:C.blue,tint:C.bluePale,title:'Review the teen work rules',text:'Check the hours and duties teens are allowed to work.'}
];
note=callout('&#128106;','<b style="color:'+C.dark+';">Parents are part of every hire.</b> Teens need a linked parent or guardian before they can apply.','green');
}
var html='<div data-tw-keep="1">'+
'<p style="margin:0 0 18px;font-family:'+FONT+';font-size:16px;line-height:1.6;color:'+C.text+';">'+intro+'</p>'+
stepCards(steps)+'<div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>'+note+
button('🚀 Open TeenWork')+
'<p style="margin:24px 0 0;font-family:'+FONT+';font-size:15px;line-height:1.5;color:'+C.muted+';">See you inside,<br><b style="color:'+C.green+';">The TeenWork team</b> &#127795;</p>'+
'</div>';
return window.twSendEmail(to,'Welcome to TeenWork'+(name?', '+name:'')+'! 🎉',html,{
heading:'Welcome to TeenWork'+(name?', '+name:'')+'!',
icon:'&#127881;',
preheader:type==='teen'?'Your account is ready. Here is how to get started.':'Your '+(type==='parent'?'parent':'employer')+' account is ready.'
});
};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/support-reply-email-v42.js */
try{
(function(){
'use strict';
if(window.__twSupportReplyEmail)return;
window.__twSupportReplyEmail=true;
var LS_KEY='tw_support_reply_email';
var EMAIL_RE= /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/;
var SEND_BUTTONS='#support-modal-overlay button[onclick*="sendSupportEmail"], #tw-sup-fallback #tw-sup-send, #tw-sup-fallback #tw-ss';
var pending=null;
function user(){try{return window.currentUser||(typeof currentUser!=='undefined'?currentUser:null);}catch(e){return window.currentUser||null;}}
function valid(e){return EMAIL_RE.test(String(e||'').trim());}
function defaultEmail(){
var u=user();
if(u&&valid(u.email))return String(u.email).trim();
try{var last=localStorage.getItem(LS_KEY);if(valid(last))return last;}catch(e){}
return'';
}
function fieldHtml(){
return'<label for="tw-sup-reply-email" style="font-size:.78rem;font-weight:700;color:#4b5563;display:block;margin-bottom:4px">'+
'Your email <span style="color:#c0392b">*</span> <span style="font-weight:400;color:#6b7280">so we can reply to you</span></label>'+
'<input id="tw-sup-reply-email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" '+
'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e2ddd4;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-size:.9rem;outline:none;background:#fff;color:#1c1c1c">'+
'<div id="tw-sup-reply-err" style="display:none;font-size:.74rem;color:#c0392b;font-weight:600;margin-top:4px">Please enter your email so the TeenWork team can reply.</div>';
}
function addField(ov){
if(!ov||ov.querySelector('#tw-sup-reply-email'))return;
var box=document.createElement('div');
box.id='tw-sup-reply-box';
box.style.cssText='margin-bottom:1rem';
box.innerHTML=fieldHtml();
var nameInp=ov.querySelector('#support-name, #tw-sup-name');
var ta=ov.querySelector('#tw-sm');
if(nameInp&&nameInp.parentNode&&nameInp.parentNode!==ov){
nameInp.parentNode.parentNode.insertBefore(box,nameInp.parentNode.nextSibling);
}else if(ta&&ta.parentNode){
ta.parentNode.insertBefore(box,ta);
}else{
var send=ov.querySelector('#tw-sup-send, #tw-ss, button[onclick*="sendSupportEmail"]');
if(!send)return;
var row=send.parentNode;
row.parentNode.insertBefore(box,row);
}
var inp=box.querySelector('#tw-sup-reply-email');
inp.value=defaultEmail();
inp.addEventListener('focus',function(){this.style.borderColor='#2d6a4f';});
inp.addEventListener('blur',function(){this.style.borderColor=valid(this.value)|| !this.value?'#e2ddd4':'#c0392b';});
inp.addEventListener('input',function(){var err=box.querySelector('#tw-sup-reply-err');if(err)err.style.display='none';this.style.borderColor='#2d6a4f';});
}
function scan(){
['support-modal-overlay','tw-sup-fallback'].forEach(function(id){var el=document.getElementById(id);if(el)addField(el);});
}
try{
new MutationObserver(function(list){
for(var i=0;i<list.length;i++){
var added=list[i].addedNodes;
for(var j=0;j<added.length;j++){
var n=added[j];
if(n.nodeType===1&&(n.id==='support-modal-overlay'||n.id==='tw-sup-fallback'))addField(n);
}
}
}).observe(document.body,{childList:true});
}catch(e){}
scan();
document.addEventListener('click',function(e){
var btn=e.target&&e.target.closest?e.target.closest(SEND_BUTTONS):null;
if(!btn)return;
var ov=btn.closest('#support-modal-overlay, #tw-sup-fallback');
addField(ov);
var inp=ov&&ov.querySelector('#tw-sup-reply-email');
var email=inp?String(inp.value||'').trim():'';
if(!valid(email)){
e.preventDefault();e.stopImmediatePropagation();
var err=ov&&ov.querySelector('#tw-sup-reply-err');
if(err){err.textContent=email?'That doesn’t look like an email address. Please check it.':'Please enter your email so the TeenWork team can reply.';err.style.display='block';}
if(inp){inp.style.borderColor='#c0392b';inp.focus();}
return;
}
pending={email:email,at:Date.now()};
var u=user();
if(!(u&&valid(u.email))){try{localStorage.setItem(LS_KEY,email);}catch(er){}}
},true);
function wrapSave(){
var orig=window._adminSaveSupportMessage;
if(typeof orig!=='function'||orig._twReplyEmail)return;
var wrapped=function(msg){
if(pending&&Date.now()-pending.at<4000&&msg&&typeof msg==='object'){
var email=pending.email;
pending=null;
msg=Object.assign({},msg,{email:email});
var name=msg.name||'Anonymous';
var type=msg.userType&&msg.userType!=='visitor'?' · '+msg.userType:'';
msg.senderDisplay=name+' <'+email+'>'+type;
return orig.call(this,msg);
}
return orig.apply(this,arguments);
};
wrapped._twReplyEmail=true;
wrapped._twEmailsSupport=orig._twEmailsSupport;
window._adminSaveSupportMessage=wrapped;
}
wrapSave();
setTimeout(wrapSave,0);
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/resend-email-v42.js */
try{
(function(){
'use strict';
if(window.__twResendEmail)return;
window.__twResendEmail=true;
var TIMEOUT_MS=12000;
var state={off:false,offReason:'',log:[]};
function fnUrl(){return(typeof SUPABASE_URL!=='undefined'&& /^https:/.test(SUPABASE_URL))?SUPABASE_URL.replace(/\/+$/,'')+'/functions/v1/send-email':'';}
function sbKey(){return typeof SUPABASE_KEY!=='undefined'&&SUPABASE_KEY!=='YOUR_SUPABASE_ANON_KEY'?SUPABASE_KEY:'';}
function mainTemplate(){return typeof EMAILJS_TEMPLATE!=='undefined'?EMAILJS_TEMPLATE:'';}
function isEmail(s){return/^[^\s@<>,;:"()\[\]\\]+@[^\s@<>,;:"()\[\]\\]+\.[A-Za-z]{2,}$/.test(String(s||'').trim());}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function looksHtml(m){var t=String(m||'').trim();return t.charAt(0)==='<'&&t.charAt(t.length-1)==='>';}
var TEAM=['ayaquarrierdraper@gmail.com','aqdteenwork@gmail.com'];
function isTeam(to){
var t=String(to||'').trim().toLowerCase();
if(typeof ADMIN_EMAIL!=='undefined'&&t===String(ADMIN_EMAIL).toLowerCase())return true;
return TEAM.indexOf(t)>=0;
}
window.twIsTeamInbox=isTeam;
function userToken(to){
try{
var u=window.currentUser;
if(u&&(u.isDemo||u.twDemo))return Promise.resolve('');
var mine=[String((u&&u.email)||'').toLowerCase(),String(to||'').trim().toLowerCase()].filter(Boolean);
var getClient=typeof _twCloudClient==='function'?_twCloudClient(2000):Promise.resolve(typeof sbClient!=='undefined'?sbClient:null);
return Promise.resolve(getClient).then(function(c){
if(!c|| !c.auth||typeof c.auth.getSession!=='function')return'';
return c.auth.getSession().then(function(r){
var s=r&&r.data&&r.data.session;
return s&&s.access_token&&mine.indexOf(String((s.user&&s.user.email)||'').toLowerCase())>=0?s.access_token:'';
});
}).catch(function(){return'';});
}catch(e){return Promise.resolve('');}
}
function callFn(body){
var url=fnUrl(),key=sbKey();
if(!url|| !key)return Promise.resolve({ok:false,httpStatus:0,code:'no_supabase',error:'Supabase is not configured in this copy'});
return(body&&body.ping?Promise.resolve(''):userToken(body&&body.to)).then(function(tok){return post(url,key,tok||key,body);});
}
function post(url,key,bearer,body){
var ctl=typeof AbortController!=='undefined'?new AbortController():null;
var timer=ctl?setTimeout(function(){ctl.abort();},TIMEOUT_MS):null;
return fetch(url,{
method:'POST',
headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+bearer},
body:JSON.stringify(body),
signal:ctl?ctl.signal:undefined
}).then(function(res){
return res.json().catch(function(){return{};}).then(function(d){
d=(d&&typeof d==='object')?d:{};
d.httpStatus=res.status;
if(res.status===404)d.code='not_deployed';
return d;
});
},function(e){
return{ok:false,httpStatus:0,code:'network',error:String((e&&e.message)||e)};
}).then(function(d){if(timer)clearTimeout(timer);return d;});
}
window.twSendViaResend=function(params,opts){
var p=params||{};
opts=opts||{};
if(state.off&& !opts.force)return Promise.reject({status:0,text:'Resend is off for this visit: '+state.offReason,code:'off'});
var html=String(p.message||'');
if(!looksHtml(html))html='<p>'+esc(html).replace(/\r?\n/g,'<br>')+'</p>';
return callFn({to:String(p.to_email||'').trim(),subject:p.subject||'TeenWork',html:html,reply_to:p.reply_to||'',from_name:p.from_name||'TeenWork'})
.then(function(d){
if(d.ok){state.off=false;state.offReason='';return{status:200,text:'OK',via:'resend',id:d.id,testing: !!d.testing};}
if(d.code==='not_deployed'||d.code==='not_configured'||d.code==='limits_unavailable'||d.code==='bad_key'||d.code==='no_supabase'){
state.off=true;state.offReason=d.code;
}
throw{status:d.httpStatus||0,text:d.error||'Resend send failed',code:d.code||'error'};
});
};
function remember(entry){state.log.push(entry);if(state.log.length>30)state.log.shift();}
window.twDeliverEmail=function(service,template,params,key,emailJS){
function viaEmailJS(){
try{if(!key&&typeof EMAILJS_PUBKEY!=='undefined'&&window.emailjs&&typeof window.emailjs.init==='function')window.emailjs.init(EMAILJS_PUBKEY);}catch(e){}
return emailJS();
}
try{
var p=params||{};
if(!mainTemplate()||template!==mainTemplate()|| !isEmail(p.to_email)||typeof p.message!=='string')return viaEmailJS();
if(isTeam(p.to_email)){remember({at:new Date().toISOString(),to:p.to_email,subject:p.subject,via:'emailjs',why:'team inbox'});return viaEmailJS();}
var at=new Date().toISOString();
return window.twSendViaResend(p).then(function(r){
remember({at:at,to:p.to_email,subject:p.subject,via:'resend',id:r.id});
return r;
},function(err){
remember({at:at,to:p.to_email,subject:p.subject,via:'emailjs',resendError:err&&(err.code+': '+err.text)});
if(err&&err.code!=='off')console.info('TeenWork: Resend could not send ('+(err.code||'')+'), using EmailJS instead.',err.text||'');
return viaEmailJS();
});
}catch(e){
console.warn('TeenWork Resend hook failed, using EmailJS:',e);
return viaEmailJS();
}
};
window.twEmailStatus=function(){return{resendOff:state.off,reason:state.offReason,functionUrl:fnUrl(),recent:state.log.slice()};};
window.twPingEmailFunction=function(){return callFn({ping:true});};
function healthNote(d){
if(d.ok&&d.configured&& !d.testing)return{status:'ok',note:'Resend ready · sending from '+(d.from_domain||'your domain')};
if(d.ok&&d.configured)return{status:'warn',note:'Resend in test mode: it only reaches the email your Resend account uses. Others go through EmailJS until a domain is verified.'};
if(d.ok)return{status:'warn',note:'Resend key not added yet · EmailJS sends instead'};
if(d.code==='not_deployed')return{status:'warn',note:'send-email function not deployed · EmailJS sends instead'};
if(d.code==='no_supabase')return{status:'warn',note:'Supabase not configured · EmailJS sends instead'};
return{status:'warn',note:'Resend unreachable ('+(d.error||d.code||'offline')+') · EmailJS sends instead'};
}
function adminEmail(){return typeof ADMIN_EMAIL!=='undefined'?ADMIN_EMAIL:'';}
window.twSendTestEmail=function(to){
to=String(to||adminEmail()).trim();
if(!isEmail(to))return Promise.reject({status:0,text:'Type a valid email address',code:'bad_request'});
var params={to_email:to,subject:'✅ TeenWork test email',from_name:'TeenWork',reply_to:adminEmail(),
message:'Hi,\n\nThis test email came through Resend, so the app’s emails are set up.\n\nSent '+new Date().toLocaleString()+'.\n\n— TeenWork'};
try{if(typeof window.twBrandEmailParams==='function')params=window.twBrandEmailParams(params);}catch(e){}
return window.twSendViaResend(params,{force:true});
};
function testMessage(err){
var c=err&&err.code;
if(c==='testing_only')return'Resend’s test sender only reaches the email your Resend account uses. Try that address, or verify a domain.';
if(c==='not_configured')return'Add RESEND_API_KEY in Supabase first.';
if(c==='bad_key')return'Resend refused the key. Check RESEND_API_KEY in Supabase.';
if(c==='limit')return'Send limit reached for now.';
return(err&&err.text)||'Failed';
}
var _oHealth=window.adminRunHealthCheck;
window.adminRunHealthCheck=async function(){
var r=_oHealth?await _oHealth.apply(this,arguments):undefined;
try{
var el=document.getElementById('adm-health-list');if(!el)return r;
var old=el.querySelector('[data-tw-email]');if(old)old.remove();
var row=document.createElement('div');row.className='adm-health-item';row.setAttribute('data-tw-email','1');
row.style.flexWrap='wrap';
row.innerHTML='<div class="adm-health-status warn"></div><div class="adm-health-label">Email sender</div><div class="adm-health-note" data-tw-email-note>Checking Resend…</div>'+
'<div style="flex-basis:100%;display:flex;gap:6px;justify-content:flex-end;margin-top:6px;">'+
'<input data-tw-email-to type="email" value="'+esc(adminEmail())+'" style="flex:0 1 240px;min-width:0;padding:5px 8px;border:1px solid var(--border);border-radius:8px;font-size:.78rem;">'+
'<button type="button" class="adm-btn adm-btn-mark" data-tw-email-test>✉️ Send test</button></div>';
el.appendChild(row);
var dot=row.querySelector('.adm-health-status'),note=row.querySelector('[data-tw-email-note]');
row.querySelector('[data-tw-email-test]').addEventListener('click',function(){
var btn=this;btn.disabled=true;note.textContent='Sending a test through Resend…';
window.twSendTestEmail(row.querySelector('[data-tw-email-to]').value).then(function(res){
dot.className='adm-health-status ok';
note.textContent='Test sent through Resend ✓ Check the inbox'+(res.testing?' (test mode)':'')+'.';
},function(err){
dot.className='adm-health-status error';
note.textContent='Test not sent: '+testMessage(err);
}).then(function(){btn.disabled=false;});
});
var d=await callFn({ping:true});
var h=healthNote(d);
dot.className='adm-health-status '+h.status;
note.textContent=h.note;
}catch(e){}
return r;
};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/address-autocomplete-v42.js */
try{
(function(){
'use strict';
if(window.TWAddress)return;
var api=window.TWAddress={picking:false};
var PHOTON_SEARCH='https://photon.komoot.io/api/';
var OSM_SEARCH='https://nominatim.openstreetmap.org/search';
var CENSUS='https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
var US_BBOX='-180,15,-60,72';
var WAIT_MS=300,MIN_CHARS=4,MAX_SHOWN=6;
var PHOTON_LIMIT_MS=4000;
var PHOTON_REST_MS=90000;
var LOOKUP_LIMIT_MS=8000;
var ZIP_LIMIT_MS=7000;
var photonRestUntil=0,osmNextAt=0;
var FORMS={
'su-teen-address':{drop:'su-teen-addr-drop',city:'su-city',state:'su-state',zip:'su-teen-zip'},
'su-emp-address':{drop:'su-emp-addr-drop',city:'su-emp-city',state:'su-emp-state',zip:'su-emp-zip'},
'profile-address':{drop:'profile-addr-drop',city:'profile-city',state:'profile-state',zip:'profile-zip'}
};
var STATES={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',
ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
var ABBR={};
Object.keys(STATES).forEach(function(k){ABBR[STATES[k].toLowerCase()]=k;});
var css=document.createElement('style');
css.id='address-autocomplete-v42-css';
css.textContent=
'.tw-addr-hint{font-size:.76rem;color:var(--muted);margin-top:5px;line-height:1.4;text-transform:none;letter-spacing:0;font-weight:400}'+
'.form-row.tw-addr-row,.tw-addr-row-sm{display:grid;grid-template-columns:1.3fr 1.2fr .8fr;gap:12px}'+
'.tw-addr-row-sm{gap:10px;margin-top:10px}'+
'@media(max-width:768px){.form-row.tw-addr-row,.tw-addr-row-sm{grid-template-columns:1fr 1fr}.tw-addr-row .tw-addr-city,.tw-addr-row-sm .tw-addr-city{grid-column:1/-1}}'+
'.tw-addr-drop .tw-addr-main{display:block;font-weight:600;color:var(--text)}'+
'.tw-addr-drop .tw-addr-sub{display:block;font-size:.75rem;color:var(--muted);margin-top:1px}'+
'.tw-addr-drop .tw-addr-msg{padding:9px 12px;font-size:.82rem;color:var(--muted);font-style:italic;line-height:1.4}'+
'.tw-addr-drop .tw-addr-find{font-weight:600;color:var(--green)}'+
'.tw-addr-drop .tw-addr-credit{padding:4px 12px;font-size:.66rem;color:var(--muted);text-align:right;border-top:1px solid var(--border)}'+
'.tw-addr-row-sm select{background:#fff}html.dark .tw-addr-row-sm select{background:var(--card)}'+
'.city-dropdown.tw-addr-drop{max-height:290px}'+
'html.dark .city-dropdown.tw-addr-drop{background:var(--card)}'+
'.tw-addr-ask{border-color:#d97706!important}'+
'.tw-addr-flash{background-color:var(--green-pale)!important;transition:background-color .9s ease}';
(document.head||document.documentElement).appendChild(css);
var $=function(id){return id?document.getElementById(id):null;};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
var zip5=function(s){var m=String(s||'').match(/\b(\d{5})(?:-\d{4})?\b/);return m?m[1]:'';};
var stateName=function(s){
s=String(s||'').trim();
if(!s)return'';
if(STATES[s.toUpperCase()])return STATES[s.toUpperCase()];
return ABBR[s.toLowerCase()]?STATES[ABBR[s.toLowerCase()]]:s;
};
var cfg=function(input){
var d=input.dataset||{};
return{drop:d.addrDrop,city:d.addrCity,state:d.addrState,zip:d.addrZip};
};
var isStreetInput=function(el){
return!!(el&&el.tagName==='INPUT'&&el.dataset&&(el.dataset.addrCity||el.dataset.addrState||el.dataset.addrZip));
};
var runs=new WeakMap();
var run=function(input){var r=runs.get(input);if(!r){r={timer:0,ctrl:null,seq:0,items:[],active: -1};runs.set(input,r);}return r;};
var cache=new Map();
function fetchJSON(url,r,limitMs){
var ctrl=typeof AbortController==='function'?new AbortController():null;
if(r){if(r.ctrl)try{r.ctrl.abort();}catch(e){}r.ctrl=ctrl;}
var timer;
var limit=new Promise(function(_,reject){
timer=setTimeout(function(){if(ctrl)try{ctrl.abort();}catch(e){}reject(new Error('no answer within '+(limitMs||LOOKUP_LIMIT_MS)+' ms'));},limitMs||LOOKUP_LIMIT_MS);
});
var req;
try{req=fetch(url,ctrl?{signal:ctrl.signal}:{});}catch(e){req=Promise.reject(e);}
req=req.then(function(res){
if(!res.ok)throw new Error('HTTP '+res.status);
return res.json();
});
return Promise.race([req,limit]).then(function(v){clearTimeout(timer);return v;},function(e){clearTimeout(timer);throw e;});
}
function osmTurn(){
var wait=Math.max(0,osmNextAt-Date.now());
osmNextAt=Date.now()+wait+1100;
return new Promise(function(ok){setTimeout(ok,wait);});
}
function note(what,err){try{console.warn('[TeenWork address] '+what+':',(err&&err.message)||err);}catch(e){}}
function leadNumber(typed){return(String(typed).match(/^\s*(\d+[a-z]?(?:[-\/]\d+[a-z]?)?)\s+\S/i)||[])[1]||'';}
function collect(rows,typed,read){
var lead=leadNumber(typed),out=[],seen={};
(rows||[]).forEach(function(x){
var s=read(x);
if(!s|| !s.road)return;
s.street=((s.num||lead)?(s.num||lead)+' ':'')+s.road;
delete s.road;delete s.num;
var key=(s.street+'|'+s.city+'|'+s.state).toLowerCase();
if(seen[key])return;
seen[key]=s;out.push(s);
});
return out.slice(0,MAX_SHOWN);
}
function toSuggestions(features,typed){
return collect(features,typed,function(f){
var p=(f&&f.properties)||{},c=(f&&f.geometry&&f.geometry.coordinates)||[];
if(String(p.countrycode||'').toUpperCase()!=='US')return null;
return{road:p.street||((p.osm_key==='highway'||p.type==='street')?p.name:''),num:p.housenumber||'',
city:p.city||(p.osm_key==='place'?p.name:'')||'',state:stateName(p.state),zip:p.housenumber?zip5(p.postcode):'',
lon:c[0]==null?null:c[0],lat:c[1]==null?null:c[1]};
});
}
function fromNominatim(list,typed){
return collect(list,typed,function(x){
var a=(x&&x.address)||{};
if(String(a.country_code||'').toLowerCase()!=='us')return null;
return{road:a.road||a.pedestrian||a.footway||a.path||'',num:a.house_number||'',
city:a.city||a.town||a.village||a.hamlet||a.municipality||'',state:stateName(a.state),zip:a.house_number?zip5(a.postcode):'',
lon:x.lon==null?null: +x.lon,lat:x.lat==null?null: +x.lat,via:'osm'};
});
}
function dropFor(input){
var c=cfg(input),d=$(c.drop);
if(!d){
d=document.createElement('div');
d.id=c.drop||(input.id+'-addr-drop');
input.setAttribute('data-addr-drop',d.id);
d.style.display='none';
var wrap=input.parentElement;
if(wrap&&getComputedStyle(wrap).position==='static')wrap.style.position='relative';
input.insertAdjacentElement('afterend',d);
}
if(!d.classList.contains('tw-addr-drop')){
d.classList.add('city-dropdown','tw-addr-drop');
d.removeAttribute('style');d.style.display='none';
d.setAttribute('role','listbox');
d.addEventListener('mousedown',function(e){
e.preventDefault();
var row=e.target.closest&&e.target.closest('.tw-addr-item, .tw-addr-find');
if(!row)return;
if(row.classList.contains('tw-addr-find'))findNow(input);
else pick(input,run(input).items[+row.getAttribute('data-i')]);
});
}
input.setAttribute('role','combobox');
input.setAttribute('aria-autocomplete','list');
input.setAttribute('aria-controls',d.id);
return d;
}
function isOpen(input){var d=$(cfg(input).drop);return!!(d&&d.style.display!=='none');}
function hide(input){
var d=$(cfg(input).drop);
if(d)d.style.display='none';
input.setAttribute('aria-expanded','false');
input.removeAttribute('aria-activedescendant');
run(input).active= -1;
}
function show(input,html){
var d=dropFor(input);
d.innerHTML=html;
d.style.display='block';
input.setAttribute('aria-expanded','true');
unclip(d);
}
function unclip(d){
d.style.position='';d.style.marginTop='';
var bottom=d.getBoundingClientRect().bottom;
for(var el=d.parentElement;el&&el!==document.body&&el!==document.documentElement;el=el.parentElement){
var cs=getComputedStyle(el);
if(/hidden|auto|scroll|clip/.test(cs.overflowY)&&el.getBoundingClientRect().bottom<bottom-1){
d.style.position='static';d.style.marginTop='4px';
return;
}
}
}
function message(input,text){
run(input).items=[];
show(input,'<div class="tw-addr-msg">'+esc(text)+'</div>');
}
function render(input,list){
var r=run(input),d=dropFor(input);
r.items=list;r.active= -1;
if(!list.length){message(input,'No matching street addresses yet. Keep typing, or fill in the fields below.');return;}
show(input,list.map(function(s,i){
var sub=[s.city,[ABBR[String(s.state).toLowerCase()]||s.state,s.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
return'<div class="city-dropdown-item tw-addr-item" role="option" id="'+d.id+'-opt-'+i+'" data-i="'+i+'">'+
'<span class="tw-addr-main">'+esc(s.street)+'</span><span class="tw-addr-sub">'+esc(sub)+'</span></div>';
}).join('')+'<div class="tw-addr-credit">Addresses © OpenStreetMap contributors</div>');
}
function highlight(input,i){
var r=run(input),d=$(cfg(input).drop);
if(!d|| !r.items.length)return;
r.active=(i+r.items.length)%r.items.length;
[].forEach.call(d.querySelectorAll('.tw-addr-item'),function(row,k){row.classList.toggle('highlighted',k===r.active);});
var row=$(d.id+'-opt-'+r.active);
if(row){input.setAttribute('aria-activedescendant',row.id);if(row.scrollIntoView)row.scrollIntoView({block:'nearest'});}
}
function onInput(input){
var r=run(input),q=String(input.value||'').trim();
clearTimeout(r.timer);
if(q.length<MIN_CHARS|| !/[a-z]/i.test(q)){r.seq++;if(r.ctrl)try{r.ctrl.abort();}catch(e){}hide(input);return;}
r.timer=setTimeout(function(){search(input,q);},WAIT_MS);
}
function search(input,q){
var r=run(input),seq= ++r.seq,key=q.toLowerCase().replace(/\s+/g,' ');
if(cache.has(key)){render(input,toSuggestions(cache.get(key),q));return;}
if(Date.now()<photonRestUntil){offerFind(input,q);return;}
if(!isOpen(input)|| !r.items.length)message(input,'Searching addresses…');
var url=PHOTON_SEARCH+'?q='+encodeURIComponent(q)+'&limit=12&lang=en&layer=house&layer=street&bbox='+US_BBOX;
fetchJSON(url,r,PHOTON_LIMIT_MS).then(function(data){
if(seq!==r.seq)return;
var feats=(data&&data.features)||[];
cache.set(key,feats);
if(cache.size>60)cache.delete(cache.keys().next().value);
if(document.activeElement===input)render(input,toSuggestions(feats,q));
}).catch(function(err){
if(seq!==r.seq)return;
photonRestUntil=Date.now()+PHOTON_REST_MS;
note('suggestions are not loading (photon.komoot.io), offering Find instead',err);
if(document.activeElement===input)offerFind(input,q);
});
}
function offerFind(input,q){
var r=run(input),d=dropFor(input);
r.items=[];r.active= -1;
show(input,'<div class="city-dropdown-item tw-addr-find" role="option" id="'+d.id+'-find">🔍 Find “'+esc(q)+'”</div>'+
'<div class="tw-addr-msg">Suggestions aren\'t loading right now. Type your street and town, then tap Find or press Enter.</div>');
}
function findNow(input){
var r=run(input),q=String(input.value||'').trim(),seq= ++r.seq;
clearTimeout(r.timer);
if(q.length<MIN_CHARS)return;
message(input,'Looking up your address…');
osmTurn().then(function(){
if(seq!==r.seq)return null;
return fetchJSON(OSM_SEARCH+'?format=jsonv2&addressdetails=1&limit=8&countrycodes=us&q='+encodeURIComponent(q),r).then(function(list){
if(seq!==r.seq)return;
var out=fromNominatim(list,q);
if(out.length)render(input,out);
else message(input,"We couldn't find that address. Check the street and town, or fill in the city, state and ZIP below.");
});
}).catch(function(err){
if(seq!==r.seq)return;
note('address lookup failed (nominatim.openstreetmap.org)',err);
message(input,"Address lookup isn't working right now. Fill in the city, state and ZIP below.");
});
}
var jsonpSeq=0;
function jsonp(url,limitMs){
return new Promise(function(ok,fail){
var name='__twAddrZip'+(++jsonpSeq)+'_'+Date.now().toString(36),tag=document.createElement('script'),done=false;
var finish=function(err,data){
if(done)return;
done=true;clearTimeout(timer);
window[name]=function(){};
if(tag.parentNode)tag.parentNode.removeChild(tag);
if(err)fail(err);else ok(data);
};
var timer=setTimeout(function(){finish(new Error('no answer within '+limitMs+' ms'));},limitMs);
window[name]=function(data){finish(null,data);};
tag.onerror=function(){finish(new Error('could not reach the service'));};
tag.async=true;
tag.src=url+(url.indexOf('?')<0?'?':'&')+'callback='+name;
(document.head||document.documentElement).appendChild(tag);
});
}
function censusZip(s){
var where=[s.street,s.city,ABBR[String(s.state).toLowerCase()]||s.state].filter(Boolean).join(', ');
return jsonp(CENSUS+'?address='+encodeURIComponent(where)+'&benchmark=Public_AR_Current&format=jsonp',ZIP_LIMIT_MS).then(function(data){
var m=(data&&data.result&&data.result.addressMatches)||[];
var zips=m.map(function(x){return zip5(x&&x.addressComponents&&x.addressComponents.zip);}).filter(Boolean);
if(!zips.length)return'';
if(zips.every(function(z){return z===zips[0];}))return zips[0];
var city=String(s.city||'').toLowerCase();
var same=m.filter(function(x){return String((x.addressComponents||{}).city||'').toLowerCase()===city;});
return same.length===1?zip5(same[0].addressComponents.zip):'';
});
}
function quietChange(el){
api.picking=true;
try{el.dispatchEvent(new Event('change',{bubbles:true}));}finally{api.picking=false;}
}
function placeholder(el,text){
if(!el.hasAttribute('data-addr-ph'))el.setAttribute('data-addr-ph',el.placeholder||'');
el.placeholder=text==null?el.getAttribute('data-addr-ph'):text;
}
function askZip(zipEl){
if(String(zipEl.value||'').trim())return;
placeholder(zipEl,'Type your ZIP');
zipEl.classList.add('tw-addr-ask');
}
function checkZip(input,zipEl,s){
var r=run(input),seq=r.zipSeq=(r.zipSeq||0)+1;
zipEl.classList.remove('tw-addr-ask');
placeholder(zipEl,null);
if(!/^\d/.test(s.street)){if(!s.zip)askZip(zipEl);return;}
if(!s.zip)placeholder(zipEl,'Looking up…');
censusZip(s).then(function(z){return z;},function(err){note('ZIP check failed (geocoding.geo.census.gov)',err);return'';}).then(function(z){
if(seq!==r.zipSeq)return;
placeholder(zipEl,null);
var now=String(zipEl.value||'').trim(),ours=now===''||now===zipEl.getAttribute('data-addr-filled');
if(z&&ours){
if(now!==z){setField(zipEl,z);quietChange(zipEl);}
}else if(!z&& !s.zip)askZip(zipEl);
});
}
function flash(el){
if(!el)return;
el.classList.add('tw-addr-flash');
setTimeout(function(){el.classList.remove('tw-addr-flash');},1200);
}
function setField(el,value){
el.value=value;
el.setAttribute('data-addr-filled',value);
flash(el);
}
function fill(el,value){
if(!el)return;
if(value)setField(el,value);
else if(el.value&&el.value===el.getAttribute('data-addr-filled')){el.value='';el.removeAttribute('data-addr-filled');}
}
function fillState(sel,name){
if(!sel|| !name)return;
var want=name.toLowerCase(),abbr=(ABBR[want]||'').toLowerCase();
var opt=[].find.call(sel.options||[],function(o){
var v=String(o.value||o.text).trim().toLowerCase(),t=String(o.text).trim().toLowerCase();
return v===want||t===want||(abbr&&(v===abbr||t===abbr));
});
if(!opt)return;
if(sel.value!==opt.value){
sel.value=opt.value;
sel.dispatchEvent(new Event('change',{bubbles:true}));
}
flash(sel);
}
function pick(input,s){
if(!s)return;
var c=cfg(input);
clearTimeout(run(input).timer);
hide(input);
api.picking=true;
try{
input.value=s.street;
fillState($(c.state),s.state);
var cityEl=$(c.city);
fill(cityEl,s.city);
if(cityEl){var cd=cityEl.parentElement&&cityEl.parentElement.querySelector('.city-dropdown');if(cd)cd.style.display='none';}
fill($(c.zip),s.zip);
}finally{api.picking=false;}
input.dispatchEvent(new Event('change',{bubbles:true}));
var zipEl=$(c.zip);
if(zipEl)checkZip(input,zipEl,s);
}
document.addEventListener('input',function(e){
var el=e.target;
if(isStreetInput(el))onInput(el);
else if(el&&el.classList&&el.classList.contains('tw-addr-ask'))el.classList.remove('tw-addr-ask');
},true);
document.addEventListener('keydown',function(e){
var input=e.target;
if(!isStreetInput(input))return;
var r=run(input),open=isOpen(input)&&r.items.length>0;
if(e.key==='ArrowDown'||e.key==='ArrowUp'){
if(!open)return;
e.preventDefault();
highlight(input,r.active<0?(e.key==='ArrowDown'?0: -1):r.active+(e.key==='ArrowDown'?1: -1));
}else if(e.key==='Enter'){
var d=$(cfg(input).drop);
if(open&&r.active>=0){e.preventDefault();pick(input,r.items[r.active]);}
else if(isOpen(input)&&d&&d.querySelector('.tw-addr-find')){e.preventDefault();findNow(input);}
}else if(e.key==='Escape'||e.key==='Tab'){
if(isOpen(input)){if(e.key==='Escape')e.preventDefault();hide(input);}
}
},true);
document.addEventListener('focusout',function(e){
var input=e.target;
if(isStreetInput(input))setTimeout(function(){if(document.activeElement!==input)hide(input);},150);
},true);
function wire(){
Object.keys(FORMS).forEach(function(id){
var input=$(id),f=FORMS[id];
if(!input)return;
[['drop','data-addr-drop'],['city','data-addr-city'],['state','data-addr-state'],['zip','data-addr-zip']].forEach(function(a){
if(!input.hasAttribute(a[1])&&f[a[0]])input.setAttribute(a[1],f[a[0]]);
});
['oninput','onfocus'].forEach(function(h){if(/addressAutocomplete/.test(input.getAttribute(h)||''))input.removeAttribute(h);});
input.setAttribute('autocomplete','off');
dropFor(input);
});
}
wire();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);
window.addressAutocomplete=function(input,dropId){
if(!input)return;
if(dropId&& !input.hasAttribute('data-addr-drop'))input.setAttribute('data-addr-drop',dropId);
onInput(input);
};
window.selectAddress=function(street,city,state,zip,inputId){
var input=$(inputId);
if(input)pick(input,{street:street,city:city,state:stateName(state),zip:zip5(zip)});
};
var lastSaved=null;
window.saveProfileAddress=function(){
var v=function(id){var el=$(id);return el?String(el.value||'').trim():null;};
var next={street:v('profile-address')||'',zip:v('profile-zip')||''};
if(v('profile-city')!==null)next.city=v('profile-city');
if(v('profile-state')!==null)next.state=v('profile-state');
try{if(typeof _userAddress==='object'&&_userAddress)Object.assign(_userAddress,next);}catch(e){}
var sig=JSON.stringify(next);
if(api.picking){lastSaved=sig;return;}
if(sig===lastSaved)return;
lastSaved=sig;
try{showToast('📍 Address saved (private — only used for distance)','success');}catch(e){}
};
api.wire=wire;api.search=onInput;api.pick=pick;api.find=findNow;api.suggestions=toSuggestions;
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/clean-menu-v43.js */
try{
(function(){
'use strict';
if(window.__twCleanMenuV43)return;
window.__twCleanMenuV43=true;
var ROLES=['teen','parent','employer'];
var MENU={
teen:{
name:'Teen',
main:[
['ttab-browse','🔍','Find Jobs','jobs'],
['ttab-applications','📋','Applied'],
['chat','💬','Messages','chat'],
['ttab-worklog','⏱️','Work Log','work'],
['ttab-earnings','💰','Earnings'],
['ttab-resume','👤','Profile & Settings','account']],
groups:[
{id:'jobs',title:'Jobs & money',items:[
['ttab-map','🗺️','Job Map'],
['ttab-tracker','📈','Tracker'],
['ttab-calendar','📅','Schedule'],
['ttab-savings','🎯','Savings']]},
{id:'profile',title:'My profile',items:[
['verify','🛡️','Verification'],
['ttab-portfolio','🗂️','Portfolio'],
['ttab-references','🤝','References'],
['ttab-letters','📜','Rec Letters'],
['ttab-badges','🏅','Badges'],
['ttab-leaderboard','🏆','Leaderboard']]},
{id:'learn',title:'Learn & grow',items:[
['ttab-ai','🤖','AI Coach','grow'],
['ttab-lessons','📚','Lessons'],
['ttab-firstjob','🚀','First Job Guide'],
['ttab-qa','🙋','Community Q&A'],
['ttab-stories','🌟','Success Stories']]}
],
bar:[['ttab-browse','Jobs'],['ttab-worklog','Work'],['chat','Chat'],['ttab-resume','Profile']]
},
parent:{
name:'Parent',
main:[
['ptab-overview','🏠','Overview','home'],
['ptab-approvals','✅','Approvals','approve'],
['chat','💬','Messages','chat'],
['ptab-teens','👨‍👩‍👧','My Teens'],
['ptab-controls','🛡️','Controls','safety']],
groups:[
{id:'safety',title:'Safety & alerts',items:[
['ptab-notifications','🔔','Alerts'],
['ptab-trusted','🤝','Employers saved by you']]},
{id:'family',title:'Family',items:[
['ptab-weekly','📬','Weekly Summary','updates'],
['ptab-ratings','⭐','Ratings'],
['ptab-savings','🎯','Savings Goals']]}
],
bar:[['ptab-overview','Home'],['ptab-approvals','Approve'],['chat','Chat'],['ptab-controls','Safety']]
},
employer:{
name:'Employer',
main:[
['etab-post','📝','Post a Job','post'],
['etab-applicants','👥','Applicants','hiring'],
['etab-active','📂','Active Jobs'],
['chat','💬','Messages','chat'],
['etab-profile','🏢','Company Profile']],
groups:[
{id:'tools',title:'Hiring tools',items:[
['etab-schedule','📅','Schedule'],
['etab-bulkmsg','📣','Bulk Message'],
['etab-ai','🤖','AI Tools']]},
{id:'business',title:'Your business',items:[
['etab-analytics','📊','Analytics','grow'],
['etab-reviews','⭐','Reviews'],
['etab-letters','📜','Rec Letters'],
['etab-bgcheck','🛡️','Verification']]}
],
bar:[['etab-post','Post'],['etab-applicants','Hiring'],['chat','Chat'],['etab-active','Jobs']]
}
};
var HELP={id:'help',title:'Help & feedback',items:[['help','❓','Get help'],['tour','🗺️','App tour'],['rate','⭐','Rate the app']]};
var FOOT=[['app','📲','Download the app'],['share','📣','Share TeenWork','share'],['out','↩','Sign out']];
var TAB= /^[pte]tab-/;
function groupsOf(role){return MENU[role].groups.concat([HELP]);}
var DRAW={
'ttab-map':function(){window.renderJobMap&&window.renderJobMap('job-map-container');},
'ttab-qa':function(){window.renderQA&&window.renderQA('qa-board-container');},
'ttab-stories':function(){window.renderStories&&window.renderStories('stories-container');}
};
var CSS=[
':root{--twm-side-w:244px}',
'@media (max-width:1024px){:root{--twm-side-w:208px}}',
'#twm-side,#twm-bottom{display:none}',
'#twm-side,#twm-bottom,#twm-sheet{font-family:"DM Sans",system-ui,sans-serif;-webkit-tap-highlight-color:transparent}',
'body.twm-on #mobileNav,body.twm-on .page .grp-tabs,body.twm-on .page .subtab-row,body.twm-on #teen-desktop-tabs,body.twm-on #parent-desktop-tabs,body.twm-on #employer-desktop-tabs,body.twm-on #more-drawer,body.twm-on #more-scrim,body.twm-on #mobile-more-drawer,body.twm-on #mobile-more-scrim,body.twm-on .twm-moved,body.twm-on #v17-support-fab,body.twm-on .twm-fab{display:none!important}',
'body.twm-on .dash-header{align-items:center;gap:10px 12px;margin-bottom:1.5rem}',
'body.twm-on .dash-header>.twm-title{order:-1;flex:1 1 260px;min-width:0}',
'body.twm-on .dash-header>div:not(.twm-title):not(.tw-plan-pill){display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
'@media (min-width:769px){body.twm-on #twm-side{display:flex}body.twm-on .page.active{padding-left:var(--twm-side-w)}}',
'#twm-side{position:fixed;top:0;left:0;bottom:0;width:var(--twm-side-w);z-index:150;flex-direction:column;background:var(--card);border-right:1.5px solid var(--border);box-shadow:2px 0 18px rgba(0,0,0,.03)}',
'.twm-brand{display:flex;align-items:center;gap:8px;padding:20px 18px 12px}',
'.twm-logo{font-family:"Fraunces",Georgia,serif;font-weight:900;font-size:1.28rem;color:var(--green);line-height:1;white-space:nowrap}',
'.twm-role{margin-left:auto;font-size:.64rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--green);background:var(--green-pale);padding:3px 8px;border-radius:999px}',
'.twm-scroll{flex:1;overflow-y:auto;padding:0 12px 12px;scrollbar-width:thin;background:linear-gradient(var(--card) 30%,transparent) center top/100% 36px no-repeat local,linear-gradient(transparent,var(--card) 70%) center bottom/100% 36px no-repeat local,radial-gradient(farthest-side at 50% 0,rgba(0,0,0,.13),transparent) center top/100% 12px no-repeat scroll,radial-gradient(farthest-side at 50% 100%,rgba(0,0,0,.13),transparent) center bottom/100% 12px no-repeat scroll;background-color:var(--card)}',
'.twm-sec{font-size:.66rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:14px 10px 5px}',
'.twm-item{position:relative;display:flex;align-items:center;gap:10px;width:100%;margin:1px 0;padding:8px 10px;border:0;border-radius:10px;background:none;color:var(--text);font:600 .88rem/1.25 "DM Sans",system-ui,sans-serif;text-align:left;cursor:pointer;transition:background .15s,color .15s}',
'.twm-item:hover{background:var(--bg)}',
'.twm-item:focus-visible,.twm-tab:focus-visible,.twm-x:focus-visible,.twm-gtog:focus-visible{outline:2px solid var(--green);outline-offset:1px}',
'.twm-item.on{background:var(--green-pale);color:var(--green);font-weight:700}',
'.twm-item[hidden]{display:none}',
'.twm-main{padding-top:4px}',
'.twm-groups{margin-top:10px;padding-top:8px;border-top:1.5px solid var(--border)}',
'.twm-group[hidden],.twm-gbody[hidden]{display:none!important}',
'.twm-gtog{display:flex;align-items:center;gap:10px;width:100%;margin:1px 0;padding:8px 10px;border:0;border-radius:10px;background:none;color:var(--muted);font:700 .86rem/1.25 "DM Sans",system-ui,sans-serif;text-align:left;cursor:pointer;transition:background .15s,color .15s}',
'.twm-gtog:hover,.twm-gtog[aria-expanded="true"]{color:var(--text)}',
'.twm-gtog:hover{background:var(--bg)}',
'.twm-chev{display:inline-flex;align-items:center;justify-content:center}',
'.twm-chev::before{content:"";display:block;width:6px;height:6px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateX(-2px) rotate(-45deg);transition:transform .15s}',
'.twm-gtog[aria-expanded="true"] .twm-chev::before{transform:translateY(-2px) rotate(45deg)}',
'.twm-count{margin-left:auto;min-width:22px;padding:2px 7px;border-radius:999px;background:var(--bg);color:var(--muted);font-size:.7rem;font-weight:700;line-height:1.2;text-align:center}',
'.twm-gtog.has-on .twm-count{background:var(--green-pale);color:var(--green)}',
'.twm-gtog[aria-expanded="true"] .twm-count{visibility:hidden}',
'#twm-side .twm-gbody{padding:0 0 6px 12px}',
'#twm-side .twm-gbody .twm-item{font-size:.85rem;padding:7px 10px}',
'.twm-ic{flex:0 0 22px;text-align:center;font-size:1rem;line-height:1}',
'.twm-lb{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
'.twm-foot{display:grid;grid-template-columns:1fr;gap:2px;border-top:1.5px solid var(--border);padding:8px 12px 14px}',
'.twm-foot .twm-item,.twm-sheet-foot .twm-item{gap:7px;padding:8px;font-size:.82rem;color:var(--muted)}',
'.twm-foot .twm-ic,.twm-sheet-foot .twm-ic{flex-basis:18px;font-size:.92rem}',
'.twm-foot .twm-item:hover{color:var(--green)}',
'.twm-foot .twm-item[data-twm="out"]:hover,.twm-sheet-foot .twm-item[data-twm="out"]:hover{color:var(--red);background:var(--red-pale)}',
'@media (max-width:768px){body.twm-on #twm-bottom{display:flex}body.twm-on .dash-header{flex-direction:row;justify-content:flex-start;gap:8px;margin-bottom:1.2rem}body.twm-on .dash-header button{width:auto}body.twm-on .dash-header>.twm-title{flex-basis:100%}}',
'#twm-bottom{position:fixed;left:0;right:0;bottom:0;z-index:190;justify-content:space-around;gap:2px;padding:6px 6px calc(6px + env(safe-area-inset-bottom));background:var(--green);background:linear-gradient(135deg,var(--green) 0%,color-mix(in srgb,var(--green) 62%,black) 100%);box-shadow:0 -4px 20px rgba(0,0,0,.14)}',
'.twm-tab{flex:1 1 0;min-width:0;min-height:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:5px 2px;border:0;border-radius:12px;background:none;color:rgba(255,255,255,.72);font:700 .66rem/1.1 "DM Sans",system-ui,sans-serif;cursor:pointer}',
'.twm-tab .twm-ic{flex:none;font-size:1.22rem}',
'.twm-tab.on{color:#fff;background:rgba(255,255,255,.16)}',
'.twm-burger{display:inline-flex;flex-direction:column;justify-content:center;gap:3.5px;width:22px;height:20px}',
'.twm-burger i{display:block;height:2.5px;border-radius:2px;background:currentColor}',
'#twm-scrim{position:fixed;inset:0;z-index:9950;background:rgba(0,0,0,.42);opacity:0;transition:opacity .2s}',
'#twm-sheet:focus{outline:none}',
'#twm-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9951;display:flex;flex-direction:column;max-height:86vh;max-height:86dvh;background:var(--card);border-radius:22px 22px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.22);transform:translateY(100%);transition:transform .24s cubic-bezier(.2,.8,.2,1)}',
'body.twm-sheet-open #twm-scrim{opacity:1}body.twm-sheet-open #twm-sheet{transform:none}',
'.twm-sheet-head{position:relative;display:flex;align-items:center;gap:10px;padding:20px 16px 4px 22px}',
'.twm-sheet-head::before{content:"";position:absolute;top:8px;left:50%;width:38px;height:4px;margin-left:-19px;border-radius:2px;background:var(--border)}',
'.twm-sheet-title{font-family:"Fraunces",Georgia,serif;font-weight:800;font-size:1.15rem;color:var(--green)}',
'.twm-x{margin-left:auto;width:36px;height:36px;border:0;border-radius:50%;background:var(--bg);color:var(--muted);font-size:1rem;cursor:pointer}',
'.twm-sheet-body{overflow-y:auto;padding:0 12px 10px;overscroll-behavior:contain}',
'.twm-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px 6px}',
'.twm-grid .twm-item{min-width:0}.twm-grid .twm-lb{white-space:normal;overflow-wrap:anywhere}',
'.twm-grid .twm-item{padding:10px;font-size:.87rem;background:var(--bg)}',
'.twm-grid .twm-item.on{background:var(--green-pale)}',
'.twm-sheet-body .twm-main{padding-top:10px}',
'.twm-sheet-body .twm-groups{margin-top:12px}',
'.twm-sheet-body .twm-gtog{min-height:46px;padding:10px;font-size:.92rem}',
'.twm-sheet-body .twm-gbody{padding:2px 0 10px}',
'.twm-sheet-foot{display:grid;grid-template-columns:1fr;gap:2px;padding:8px 12px calc(12px + env(safe-area-inset-bottom));border-top:1.5px solid var(--border)}',
'@media (min-width:769px){#twm-sheet,#twm-scrim{display:none}}',
'#tw-admin-panel.twm-adm .adm-nav{background:var(--green);background:linear-gradient(135deg,var(--green) 0%,color-mix(in srgb,var(--green) 60%,black) 100%)}',
'#tw-admin-panel.twm-adm .adm-tab.active{background:var(--green);border-color:var(--green);color:#fff}',
'#tw-admin-panel .twm-adm-sec{display:none}',
'@media (min-width:769px){',
'#tw-admin-panel.twm-adm .adm-tabs{position:fixed;left:0;bottom:0;top:var(--twm-adm-top,58px);width:232px;z-index:5;display:block;overflow-y:auto;padding:4px 12px 20px;background:var(--card);border-right:1.5px solid var(--border);border-bottom:0}',
'#tw-admin-panel.twm-adm .twm-adm-sec{display:block;font:700 .66rem/1 "DM Sans",system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:16px 10px 6px}',
'#tw-admin-panel.twm-adm .adm-tab{display:flex;align-items:center;gap:8px;width:100%;margin:1px 0;padding:8px 10px;border:0;border-radius:10px;background:none;color:var(--text);font-size:.87rem;font-weight:600;text-align:left}',
'#tw-admin-panel.twm-adm .adm-tab:not(.active):hover{background:var(--bg);color:var(--text)}',
'#tw-admin-panel.twm-adm .adm-tab.active{background:var(--green-pale);color:var(--green);font-weight:700}',
'#tw-admin-panel.twm-adm .adm-content{max-width:980px;margin:0 auto 0 232px;padding:24px 32px 48px}',
'}',
'@media (max-width:768px){',
'#tw-admin-panel.twm-adm .adm-tabs{position:sticky;top:var(--twm-adm-top,58px);z-index:6;flex-wrap:nowrap;overflow-x:auto;gap:6px;padding:10px 12px;scrollbar-width:none}',
'#tw-admin-panel.twm-adm .adm-tabs::-webkit-scrollbar{display:none}',
'#tw-admin-panel.twm-adm .adm-tab{flex:0 0 auto;border-radius:999px;white-space:nowrap}',
'}'
].join('\n');
function cu(){try{return(typeof currentUser!=='undefined'&&currentUser)||window.currentUser||null;}catch(e){return window.currentUser||null;}}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function $(id){return document.getElementById(id);}
function isOn(el){return!!el&&el.classList.contains('active');}
function addStyle(){
if($('clean-menu-v43-style'))return;
var st=document.createElement('style');
st.id='clean-menu-v43-style';
st.textContent=CSS;
document.head.appendChild(st);
}
function shownRole(){
var u=cu(),r=u&&u.type;
if(ROLES.indexOf(r)<0)return null;
if(isOn($('page-'+r)))return r;
if(isOn($('page-verify')))return r;
return null;
}
function activeId(role){
if(isOn($('page-verify')))return'verify';
var pg=$('page-'+role);if(!pg)return null;
var ids=allIds(role);
for(var i=0;i<ids.length;i++){var p=$(ids[i]);if(p&&p.classList.contains('active')&&pg.contains(p))return ids[i];}
return null;
}
function allItems(role){
var out=MENU[role].main.slice();
groupsOf(role).forEach(function(g){out=out.concat(g.items);});
return out;
}
function allIds(role){
return allItems(role).map(function(it){return it[0];}).filter(function(id){return TAB.test(id);});
}
function findItem(role,id){
var hit=null;
allItems(role).forEach(function(it){if(it[0]===id)hit=it;});
return hit;
}
function groupOf(role,id){
var hit=null;
groupsOf(role).forEach(function(g){g.items.forEach(function(it){if(it[0]===id)hit=g.id;});});
return hit;
}
function itemHTML(it){
return'<button type="button" class="twm-item" data-twm="'+esc(it[0])+'" data-tour-key="'+esc(it[3]||'')+'">'+
'<span class="twm-ic" aria-hidden="true">'+it[1]+'</span><span class="twm-lb">'+esc(it[2])+'</span></button>';
}
function groupsHTML(role,grid){
var where=grid?'sheet':'side';
return'<div class="twm-main'+(grid?' twm-grid':'')+'">'+MENU[role].main.map(itemHTML).join('')+'</div>'+
'<div class="twm-groups">'+groupsOf(role).map(function(g){
var body='twm-'+where+'-'+g.id;
var keys=g.items.map(function(it){return it[3]||'';}).filter(Boolean).join(' ');
return'<div class="twm-group" data-twm-group="'+esc(g.id)+'">'+
'<button type="button" class="twm-gtog" data-twm-tog="'+esc(g.id)+'" aria-expanded="false" aria-controls="'+body+'" data-tour-key="'+esc(keys)+'">'+
'<span class="twm-ic twm-chev" aria-hidden="true"></span><span class="twm-lb">'+esc(g.title)+'</span>'+
'<span class="twm-count" aria-hidden="true">'+g.items.length+'</span></button>'+
'<div class="twm-gbody'+(grid?' twm-grid':'')+'" id="'+body+'" role="group" aria-label="'+esc(g.title)+'" hidden>'+g.items.map(itemHTML).join('')+'</div>'+
'</div>';
}).join('')+'</div>';
}
var openG={},lastAuto=null;
function opened(role){
if(openG[role])return openG[role];
var o={};
try{(JSON.parse(localStorage.getItem('twm_open_'+role)||'[]')||[]).forEach(function(g){if(typeof g==='string')o[g]=true;});}catch(e){}
return(openG[role]=o);
}
function setOpen(role,gid,on){
var o=opened(role);
if(on)o[gid]=true;else delete o[gid];
try{localStorage.setItem('twm_open_'+role,JSON.stringify(Object.keys(o)));}catch(e){}
}
function toggleGroup(role,gid,btn){
setOpen(role,gid,!opened(role)[gid]);
paint(role);
if(opened(role)[gid]&&btn&&btn.parentElement){
var body=btn.parentElement.querySelector('.twm-gbody');
if(body&&body.scrollIntoView)try{body.scrollIntoView({block:'nearest'});}catch(e){}
}
}
function installed(){
try{
if(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)return true;
if(navigator.standalone===true)return true;
return!!(window.twGetApp&&typeof window.twGetApp.installed==='function'&&window.twGetApp.installed());
}catch(e){return false;}
}
function footHTML(){return FOOT.map(itemHTML).join('');}
var built=null;
function build(role){
['twm-side','twm-bottom'].forEach(function(id){var el=$(id);if(el)el.remove();});
closeSheet(true);
lastAuto=null;
var side=document.createElement('div');
side.id='twm-side';
side.setAttribute('role','navigation');
side.setAttribute('aria-label','Main menu');
side.innerHTML=
'<div class="twm-brand"><span class="twm-logo"><img class="tw-tree-mark" src="assets/img/small-logo.png" alt="" width="30" height="30">TeenWork</span><span class="twm-role">'+esc(MENU[role].name)+'</span></div>'+
'<div class="twm-scroll">'+groupsHTML(role,false)+'</div>'+
'<div class="twm-foot">'+footHTML()+'</div>';
var bar=document.createElement('div');
bar.id='twm-bottom';
bar.setAttribute('role','navigation');
bar.setAttribute('aria-label','Main menu');
bar.innerHTML=MENU[role].bar.map(function(b){
var it=findItem(role,b[0])||[b[0],'•',b[1]];
return'<button type="button" class="twm-tab" data-twm="'+esc(b[0])+'" data-tour-key="'+esc(it[3]||'')+'">'+
'<span class="twm-ic" aria-hidden="true">'+it[1]+'</span><span>'+esc(b[1])+'</span></button>';
}).join('')+
'<button type="button" class="twm-tab" data-twm="menu" data-tour-key="more" aria-haspopup="dialog" aria-expanded="false">'+
'<span class="twm-ic twm-burger" aria-hidden="true"><i></i><i></i><i></i></span><span>Menu</span></button>';
side.addEventListener('click',onClick);
bar.addEventListener('click',onClick);
document.body.appendChild(side);
document.body.appendChild(bar);
built=role;
}
var lastFocus=null;
function openSheet(){
var role=built;if(!role)return;
closeSheet(true);
var scrim=document.createElement('div');
scrim.id='twm-scrim';
scrim.addEventListener('click',function(){closeSheet();});
var sheet=document.createElement('div');
sheet.id='twm-sheet';
sheet.setAttribute('role','dialog');
sheet.setAttribute('aria-modal','true');
sheet.setAttribute('aria-label','Menu');
sheet.tabIndex= -1;
sheet.innerHTML=
'<div class="twm-sheet-head"><span class="twm-sheet-title">Menu</span><button type="button" class="twm-x" data-twm="close" aria-label="Close menu">✕</button></div>'+
'<div class="twm-sheet-body">'+groupsHTML(role,true)+'</div>'+
'<div class="twm-sheet-foot">'+footHTML()+'</div>';
sheet.addEventListener('click',onClick);
document.body.appendChild(scrim);
document.body.appendChild(sheet);
lastFocus=document.activeElement;
paint(role);
var mb=document.querySelector('#twm-bottom [data-twm="menu"]');if(mb)mb.setAttribute('aria-expanded','true');
void sheet.offsetHeight;
document.body.classList.add('twm-sheet-open');
try{sheet.focus({preventScroll:true});}catch(e){}
}
function closeSheet(instant){
var sheet=$('twm-sheet'),scrim=$('twm-scrim');
document.body.classList.remove('twm-sheet-open');
var mb=document.querySelector('#twm-bottom [data-twm="menu"]');if(mb)mb.setAttribute('aria-expanded','false');
if(!sheet&& !scrim)return;
var done=function(){if(sheet)sheet.remove();if(scrim)scrim.remove();};
if(instant)done();else setTimeout(done,240);
if(!instant&&lastFocus&&lastFocus.focus)try{lastFocus.focus({preventScroll:true});}catch(e){}
lastFocus=null;
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('twm-sheet'))closeSheet();});
function headerBtn(role,kind){var pg=$('page-'+role);return pg?pg.querySelector('.dash-header [data-twm-was="'+kind+'"]'):null;}
function rateFab(){
var list=document.querySelectorAll('body > button');
for(var i=0;i<list.length;i++)if(/Rate App/.test(list[i].textContent||''))return list[i];
return null;
}
function act(role,id){
if(id==='menu'){if($('twm-sheet'))closeSheet();else openSheet();return;}
if(id==='close'){closeSheet();return;}
closeSheet(true);
if(id==='chat'){if(typeof window.openMsgModal==='function')window.openMsgModal();return;}
if(id==='verify'){if(typeof window.showVerifyPage==='function')window.showVerifyPage();return;}
if(id==='share'){if(typeof window.twShare==='function')window.twShare({source:'menu'});return;}
if(id==='app'){if(typeof window.twGetApp==='function')window.twGetApp({source:'menu'});return;}
if(id==='help'){
if(typeof window.openSupportModal==='function')window.openSupportModal('General Support','');
else if(typeof window._twOpenSupport==='function')window._twOpenSupport();
return;
}
if(id==='rate'){
var f=rateFab();
if(f)f.click();else if(typeof window._v17OpenEnhancedRating==='function')window._v17OpenEnhancedRating();
return;
}
if(id==='tour'){
var t=headerBtn(role,'tour');
if(typeof window.tourStart==='function')window.tourStart(true);else if(t)t.click();
return;
}
if(id==='out'){
var o=headerBtn(role,'out');
if(o)o.click();
else if(typeof window.signOut==='function')window.signOut();
else if(typeof window.doLogout==='function')window.doLogout();
return;
}
openTab(role,id);
}
function openTab(role,id){
var pg=$('page-'+role),panel=$(id);
if(!pg|| !panel)return;
if(!pg.classList.contains('active')){
document.querySelectorAll('.page.active').forEach(function(p){p.classList.remove('active');});
pg.classList.add('active');
}
try{if(typeof window.switchDashTab==='function')window.switchDashTab(null,id);}catch(e){console.warn('clean-menu: switchDashTab',e);}
allIds(role).forEach(function(pid){var p=$(pid);if(p&&pg.contains(p))p.classList.toggle('active',pid===id);});
if(DRAW[id])setTimeout(function(){try{DRAW[id]();}catch(e){}},60);
try{window.scrollTo(0,0);}catch(e){}
sync();
}
function onClick(e){
var t=e.target&&e.target.closest?e.target.closest('[data-twm-tog]'):null;
if(t&&built){e.preventDefault();toggleGroup(built,t.getAttribute('data-twm-tog'),t);return;}
var b=e.target&&e.target.closest?e.target.closest('[data-twm]'):null;
if(!b|| !built)return;
e.preventDefault();
act(built,b.getAttribute('data-twm'));
}
function tagHeader(role){
var pg=$('page-'+role),h=pg&&pg.querySelector('.dash-header');
if(!h)return;
var h1=h.querySelector('h1');
if(h1&&h1.parentElement&&h1.parentElement.parentElement===h)h1.parentElement.classList.add('twm-title');
h.querySelectorAll('button').forEach(function(b){
if(b.hasAttribute('data-twm-was'))return;
var t=(b.textContent||'').replace(/\s+/g,' ').trim(),oc=b.getAttribute('onclick')||'';
var kind= /sign ?out/i.test(t)|| /signout|logout/i.test(oc)?'out':(/^(🗺️\s*)?(app )?tour$/i.test(t)|| /tourStart/.test(oc)?'tour':'');
if(kind){b.setAttribute('data-twm-was',kind);b.classList.add('twm-moved');}
});
}
function tagFabs(){var f=rateFab();if(f&& !f.classList.contains('twm-fab'))f.classList.add('twm-fab');}
function paint(role){
var id=activeId(role),barIds=MENU[role].bar.map(function(b){return b[0];});
var sheetOpen= !!$('twm-sheet');
var appOk=typeof window.twGetApp==='function'&& !installed();
document.querySelectorAll('#twm-side [data-twm], #twm-sheet [data-twm], #twm-bottom [data-twm]').forEach(function(b){
var k=b.getAttribute('data-twm');
var on=k==='menu'?(sheetOpen||(!!id&&barIds.indexOf(id)<0)):k===id;
b.classList.toggle('on',on);
if(on&&k!=='menu')b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
if(TAB.test(k))b.hidden= !$(k);
else if(k==='app')b.hidden= !appOk;
});
if(id!==lastAuto){
lastAuto=id;
var gid=id&&groupOf(role,id);
if(gid&& !opened(role)[gid])setOpen(role,gid,true);
}
var o=opened(role);
document.querySelectorAll('#twm-side [data-twm-group], #twm-sheet [data-twm-group]').forEach(function(g){
var gid=g.getAttribute('data-twm-group'),open= !!o[gid],n=0,here=false;
g.querySelectorAll('.twm-gbody [data-twm]').forEach(function(b){if(!b.hidden)n++;if(b.classList.contains('on'))here=true;});
g.hidden=n===0;
g.classList.toggle('open',open);
var t=g.querySelector('.twm-gtog'),body=g.querySelector('.twm-gbody'),c=g.querySelector('.twm-count');
if(t){
if(t.getAttribute('aria-expanded')!==String(open))t.setAttribute('aria-expanded',String(open));
t.classList.toggle('has-on',here&& !open);
}
if(body&&body.hidden===open)body.hidden= !open;
if(c&&c.textContent!==String(n))c.textContent=String(n);
});
}
var queued=false;
function sync(){
var role=shownRole();
document.body.classList.toggle('twm-on',!!role);
if(!role){closeSheet(true);return;}
if(built!==role|| !$('twm-side')|| !$('twm-bottom'))build(role);
tagHeader(role);
tagFabs();
paint(role);
}
function later(){if(queued)return;queued=true;setTimeout(function(){queued=false;try{sync();admSync();}catch(e){console.warn('clean-menu:',e);}},30);}
var ADM_GROUPS=[
['Messages',/support|announce|review/i],
['People',/account|contact|email rule/i],
['App settings',/config|launch|plan/i],
['System',/activity|stat|health|security|data/i]
];
var admObserved=null;
function admSync(){
var panel=$('tw-admin-panel');if(!panel)return;
var tabs=panel.querySelector('.adm-tabs');if(!tabs)return;
panel.classList.add('twm-adm');
var nav=panel.querySelector('.adm-nav');
if(nav)panel.style.setProperty('--twm-adm-top',nav.offsetHeight+'px');
if(admObserved!==tabs){admObserved=tabs;new MutationObserver(later).observe(tabs,{childList:true});}
var buckets=ADM_GROUPS.map(function(){return[];}),other=[];
tabs.querySelectorAll(':scope > .adm-tab').forEach(function(b){
var t=b.textContent||'',i= -1;
for(var g=0;g<ADM_GROUPS.length;g++)if(ADM_GROUPS[g][1].test(t)){i=g;break;}
(i<0?other:buckets[i]).push(b);
});
var labels={};
tabs.querySelectorAll(':scope > .twm-adm-sec').forEach(function(l){labels[l.textContent]=l;});
function label(name){
if(labels[name]){var l=labels[name];delete labels[name];return l;}
var d=document.createElement('div');d.className='twm-adm-sec';d.setAttribute('aria-hidden','true');d.textContent=name;return d;
}
var want=[];
buckets.forEach(function(list,i){if(list.length){want.push(label(ADM_GROUPS[i][0]));want=want.concat(list);}});
if(other.length){want.push(label('More'));want=want.concat(other);}
Object.keys(labels).forEach(function(k){labels[k].remove();});
var cur=[].slice.call(tabs.children).filter(function(c){return c.classList.contains('adm-tab')||c.classList.contains('twm-adm-sec');});
var same=cur.length===want.length&&cur.every(function(c,i){return c===want[i];});
if(!same)want.forEach(function(n){tabs.appendChild(n);});
var act=tabs.querySelector(':scope > .adm-tab.active');
if(act&&act!==admLastActive&&tabs.scrollWidth>tabs.clientWidth+2){
var l=act.getBoundingClientRect().left-tabs.getBoundingClientRect().left+tabs.scrollLeft,r=l+act.offsetWidth;
if(l<tabs.scrollLeft||r>tabs.scrollLeft+tabs.clientWidth)tabs.scrollLeft=Math.max(0,l-12);
}
admLastActive=act;
}
var admLastActive=null;
function boot(){
addStyle();
new MutationObserver(later).observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true,childList:true});
sync();admSync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.twCleanMenu={sync:sync,open:openSheet,close:closeSheet,menu:MENU};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/real-data-v43.js */
try{
(function(){
'use strict';
if(window.__twRealData43)return;
window.__twRealData43=true;
const ROLES=['teen','parent','employer'];
const me=()=>window.currentUser||(typeof currentUser!=='undefined'?currentUser:null);
const isDemoUser=u=> !!(u&&(u.isDemo|| /\.demo$/i.test(String(u.email||''))));
const isReal=u=> !!(u&& !isDemoUser(u)&& !u.isAdmin&&ROLES.includes(u.type)&& /@/.test(String(u.email||'')));
const realAs=type=>{const u=me();return isReal(u)&&u.type===type?u:null;};
const emailOf=u=>String((u&&u.email)||'').trim().toLowerCase();
const rowKeyOf=u=>(u?String(u.dataKey||u.email||''):'');
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}};
const readJSON=(k,d)=>{try{const v=JSON.parse(lsGet(k));return v==null?d:v;}catch(e){return d;}};
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v;}catch(e){return null;}};
const firstName=n=>String(n||'').trim().split(/\s+/)[0]||'';
const toast=(m,t)=>{try{showToast(m,t||'success');}catch(e){}};
const later=(fn,ms)=>setTimeout(()=>{try{const r=fn();if(r&&r.catch)r.catch(e=>console.warn('real-data:',e));}catch(e){console.warn('real-data:',e);}},ms||0);
const plural=(n,w)=>n+' '+w+(n===1?'':'s');
function ageFrom(dob){
if(!dob)return 0;const b=new Date(/^\d{4}-\d\d-\d\d$/.test(dob)?dob+'T00:00':dob),t=new Date();if(isNaN(b))return 0;
let a=t.getFullYear()-b.getFullYear();
if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;
return a>0&&a<120?a:0;
}
const placeOf=o=>[o&&o.city,o&&o.state].filter(Boolean).join(', ');
const EMPTY=(icon,title,text)=>`<div data-tw-empty="1" style="text-align:center;padding:1.6rem 1rem;color:var(--muted)"><div style="font-size:2rem;margin-bottom:.5rem">${icon}</div><div style="font-weight:700;font-size:.95rem;color:var(--text);margin-bottom:.3rem">${title}</div><div style="font-size:.84rem;line-height:1.55">${text}</div></div>`;
const ORIG=new WeakMap();
const orig=(el,kind,read)=>{let o=ORIG.get(el);if(!o){o={};ORIG.set(el,o);}if(!(kind in o))o[kind]=read();return o[kind];};
function realText(el,real,text){if(!el)return;const o=orig(el,'text',()=>el.textContent);const next=real?text:o;if(el.textContent!==next)el.textContent=next;}
function realHTML(el,real,html){
if(!el)return;
const o=orig(el,'html',()=>el.innerHTML),next=real?html:o;
if(el._twSet===next&&el._twSeen===el.innerHTML)return;
el.innerHTML=next;el._twSet=next;el._twSeen=el.innerHTML;
}
function realHide(el,hide){if(!el)return;if(hide){el.dataset.twHidden='1';el.style.display='none';}else if(el.dataset.twHidden){delete el.dataset.twHidden;el.style.display='';}}
function realVal(el,real,v){if(!el||el===document.activeElement)return;const o=orig(el,'val',()=>el.getAttribute('value')||'');el.value=real?v:o;}
function realSel(el,real,v){
if(!el||el===document.activeElement)return;
const o=orig(el,'sel',()=>el.value);
if(!real){el.value=o;return;}
const want=String(v||'').trim().toLowerCase();if(!want)return;
const opt=[...el.options].find(x=>x.value.toLowerCase()===want||x.textContent.trim().toLowerCase()===want);
if(opt)el.value=opt.value;
}
function realAttr(el,real,name,v){if(!el)return;const o=orig(el,'attr:'+name,()=>el.getAttribute(name));const next=real?v:o;if(next==null)el.removeAttribute(name);else el.setAttribute(name,next);}
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
const cacheKey=(u,key)=>'tw_'+rowKeyOf(u).replace(/[^a-z0-9]/gi,'_')+'_'+key;
const cacheGet=(u,key,d)=>readJSON(cacheKey(u,key),d);
const cacheSet=(u,key,v)=>lsSet(cacheKey(u,key),JSON.stringify(v));
const saveMine=(u,key,v)=>{cacheSet(u,key,v);return put(rowKeyOf(u),key,v);};
const SAMPLE_APPLICANTS=(typeof demoApplicants!=='undefined')?JSON.parse(JSON.stringify(demoApplicants)):[];
const SAMPLE_PEOPLE=new Set(SAMPLE_APPLICANTS.map(a=>a.name));
const SAMPLE_TITLES=['Lawn Mowing & Yard Cleanup','Dog Walking (3 dogs)','House Cleaning Assistant','Babysitting (2 kids, ages 5 & 7)',
'Snow Shoveling Route','Moving Help (Light Boxes)','Garden Weeding & Planting','Pet Sitting (Cat + Rabbit)','Car Washing & Detailing',
'Grocery Run & Errand Help','Leaf Raking & Yard Cleanup','Dog Walker (Golden Retriever)'];
const SAMPLE_EMPLOYERS= /Mike's Landscaping|Sarah Chen|The Hendersons|Martinez Family|Maple Street Neighbors|Johnson Moving|Green Thumb Gardens|Davis Household|Riverside Auto|Peterson Household|Thompson Property|Kim & Chris Park/;
const SAMPLE_NOTIF= /^(Alex applied to '|New AI job match: Snow Shoveling in Burlington|The Hendersons accepted Alex's application|New 5-star rating received from Mike's Landscaping)/;
const DEMO_SKILLS='lawn care,pet sitting,snow shoveling,cleaning';
const isSampleJob=j=> !!j&&typeof j.id==='number'&&j.id>=1&&j.id<=12;
function isSampleNotif(n){
const t=String((n&&n.text)||'');
if(SAMPLE_NOTIF.test(t)||(n&&isSampleJob({id:n.jobId})))return true;
if([...SAMPLE_PEOPLE].some(p=>t.indexOf(p+' was hired')===0))return true;
return/\bAlex\b/.test(t)&&SAMPLE_TITLES.some(x=>t.indexOf(x)>=0);
}
function prune(arr,bad){if(!Array.isArray(arr))return;for(let i=arr.length-1;i>=0;i--)if(bad(arr[i]))arr.splice(i,1);}
function useSamplesFor(u){
if(isReal(u)){
try{prune(demoJobs,isSampleJob);}catch(e){}
try{prune(browsableJobs,isSampleJob);}catch(e){}
try{prune(demoApplicants,a=>a&&SAMPLE_PEOPLE.has(a.name));}catch(e){}
try{prune(demoNotifs,isSampleNotif);}catch(e){}
}else if(u){
try{if(!demoApplicants.some(a=>a&&SAMPLE_PEOPLE.has(a.name)))SAMPLE_APPLICANTS.forEach(a=>demoApplicants.push(JSON.parse(JSON.stringify(a))));}catch(e){}
}
}
function subjectName(){
const u=me();if(!u)return'your teen';
if(u.type==='teen')return firstName(u.name)||'your teen';
if(u.type==='parent')return pTeens.length===1?(firstName(pTeens[0].name)||'your teen'):'your teen';
return'your worker';
}
const NAME_FIXES=[
[/\bAlex(?='s (application|account|work)\b)/g,n=>n],
[/\bAlex(?= (wants to apply|tried to |hit the |is hired))/g,n=>n],
[/\b(allowed|blocked) for Alex\b/g,(n,m,w)=>w+' for '+n],
];
function fixNames(s){
const u=me();
if(!isReal(u)||typeof s!=='string'||s.indexOf('Alex')<0)return s;
const n=subjectName();
let out=s;
NAME_FIXES.forEach(([re,rep])=>{out=out.replace(re,(m,a)=>rep(n,m,a));});
return out.indexOf('your ')===0?'Y'+out.slice(1):out;
}
try{
if(typeof demoNotifs!=='undefined'&&Array.isArray(demoNotifs)&& !Object.prototype.hasOwnProperty.call(demoNotifs,'unshift')){
Object.defineProperty(demoNotifs,'unshift',{configurable:true,writable:true,value:function(){
for(const n of arguments)if(n&&typeof n.text==='string')n.text=fixNames(n.text);
return Array.prototype.unshift.apply(this,arguments);
}});
}
}catch(e){}
const _oToast=window.showToast;
if(typeof _oToast==='function')window.showToast=function(msg){const a=[].slice.call(arguments);a[0]=fixNames(a[0]);return _oToast.apply(this,a);};
const _oPush=window.sendPushNotif;
if(typeof _oPush==='function')window.sendPushNotif=function(title,body){const a=[].slice.call(arguments);a[0]=fixNames(a[0]);a[1]=fixNames(a[1]);return _oPush.apply(this,a);};
const _oAuto=window.generateAutoReply;
window.generateAutoReply=function(){if(isReal(me()))return null;return typeof _oAuto==='function'?_oAuto.apply(this,arguments):null;};
const LS_LINKS='tw_parent_links',LS_REQ='tw_link_requests',LS_CODES='tw_teen_codes';
const CODE_CHARS='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const STRONG= /^TEEN-[A-HJ-NP-Z2-9]{6}$/;
function newCode(){
const a=new Uint32Array(6);
try{crypto.getRandomValues(a);}catch(e){for(let i=0;i<6;i++)a[i]=Math.floor(Math.random()*4294967295);}
let s='';for(let i=0;i<6;i++)s+=CODE_CHARS[a[i]%CODE_CHARS.length];
return'TEEN-'+s;
}
function normCode(c){c=String(c||'').toUpperCase().replace(/[\s_]+/g,'');if(c&&c.indexOf('TEEN-')!==0)c='TEEN-'+c.replace(/^TEEN-?/,'');return c;}
const localLink=em=>readJSON(LS_LINKS,{})[em]||null;
function setLocalLink(em,data){const m=readJSON(LS_LINKS,{});if(data)m[em]=data;else delete m[em];lsSet(LS_LINKS,JSON.stringify(m));}
const localCode=em=>readJSON(LS_CODES,{})[em]||'';
function setLocalCode(em,code){const m=readJSON(LS_CODES,{});m[em]=code;lsSet(LS_CODES,JSON.stringify(m));}
const dirtyKey=em=>'tw_link_unsent_'+em;
const sameLink=(a,b)=> !!a&& !!b&&['status','parentEmail','requestedAt','approvedAt','declinedAt','unlinkedAt'].every(k=>String(a[k]||'')===String(b[k]||''));
const teenStatus=u=>((localLink(emailOf(u))||u.parentLinked||{}).status)||'none';
function showCode(code){document.querySelectorAll('.tw35-code b').forEach(b=>{if(b.textContent!==code)b.textContent=code;});}
function applyTeenLink(u,link){
setLocalLink(emailOf(u),link);u.parentLinked=link;
try{if(typeof currentUser!=='undefined'&&currentUser&&currentUser!==u&&emailOf(currentUser)===emailOf(u))currentUser.parentLinked=link;}catch(e){}
const lock=$('parent-lock-overlay');
if(lock&&link&&link.status){lock.remove();try{launchDashboard();}catch(e){}}
}
async function putTeenLink(u,link){
const v=Object.assign({},link,{teenEmail:emailOf(u),teenName:u.name||'',code:localCode(emailOf(u)),updatedAt:Date.now()});
cacheSet(u,'parent_link',v);
return put(rowKeyOf(u),'parent_link',v);
}
async function sendRequest(u,link,before){
const em=emailOf(u),key=rowKeyOf(u);
lsSet(dirtyKey(em),'1');
const ok1=await putTeenLink(u,link);
const req={teenKey:key,teenEmail:em,teenName:u.name||em,parentEmail:String(link.parentEmail||'').toLowerCase(),code:localCode(em),status:'pending',at:Date.now()};
const ok2=await put(req.parentEmail,'link_request:'+key,req);
if(before&&before.status==='pending'&&before.parentEmail&&before.parentEmail!==link.parentEmail)
put(String(before.parentEmail).toLowerCase(),'link_request:'+key,Object.assign({},req,{parentEmail:String(before.parentEmail).toLowerCase(),status:'cancelled'}));
if(ok1&&ok2)lsSet(dirtyKey(em),null);
}
async function claimCode(u,code){
const key=rowKeyOf(u),em=emailOf(u);
for(let i=0;i<6;i++){
if(!STRONG.test(code))code=newCode();
const taken=await rows(q=>q.eq('key','code:'+code));
if(taken===null)return'';
if(!taken.some(r=>r.email!==key))break;
code=newCode();
}
if(!(await put(key,'code:'+code,{teenKey:key,teenEmail:em,at:Date.now()})))return'';
await put(key,'link_code',code);
cacheSet(u,'link_code',code);
if(localCode(em)!==code){setLocalCode(em,code);showCode(code);}
return code;
}
let teenSyncing=false;
async function syncTeen(){
const u=realAs('teen');if(!u||teenSyncing)return;
teenSyncing=true;
try{
const em=emailOf(u),key=rowKeyOf(u);
const got=await rows(q=>q.eq('email',key).in('key',['parent_link','link_code','skills']));
if(!got||me()!==u)return;
const by={};got.forEach(r=>{by[r.key]=parse(r.value);});
const cc=by.link_code;
if(typeof cc==='string'&&STRONG.test(cc)){cacheSet(u,'link_code',cc);if(localCode(em)!==cc){setLocalCode(em,cc);showCode(cc);}}
else await claimCode(u,localCode(em));
const local=localLink(em),cloud=by.parent_link;
if(lsGet(dirtyKey(em))&&local&&local.status){
if(local.status==='pending')await sendRequest(u,local,null);
else if(await putTeenLink(u,local))lsSet(dirtyKey(em),null);
}else if(cloud&&cloud.status){
cacheSet(u,'parent_link',cloud);
if(!sameLink(local,cloud))applyTeenLink(u,cloud);
}else if(local&&local.status){
await putTeenLink(u,local);
}
if(Array.isArray(by.skills)&& !Array.isArray(cacheGet(u,'skills',null))){cacheSet(u,'skills',by.skills);u.skills=by.skills;later(()=>applyAll(true),0);}
}finally{teenSyncing=false;}
}
const withTimeout=(p,ms)=>Promise.race([p,new Promise(r=>setTimeout(r,ms))]);
const _oSend=window.twSendLink;
if(typeof _oSend==='function')window.twSendLink=function(){
const u=realAs('teen'),em=u?emailOf(u):'',before=u?localLink(em):null;
const r=_oSend.apply(this,arguments);
try{
if(u){const after=localLink(em);if(after&&after.status==='pending'&&(!before||before.requestedAt!==after.requestedAt||before.parentEmail!==after.parentEmail))sendRequest(u,after,before);}
}catch(e){}
return r;
};
const _oSkip=window.twSkipLink;
if(typeof _oSkip==='function')window.twSkipLink=function(){
const u=realAs('teen');
const r=_oSkip.apply(this,arguments);
if(u)later(async()=>{
const got=await rows(q=>q.eq('email',rowKeyOf(u)).eq('key','parent_link'));
if(!got||me()!==u)return;
const cloud=got[0]?parse(got[0].value):null;
if(cloud&&cloud.status&&cloud.status!=='skipped'){cacheSet(u,'parent_link',cloud);if(!sameLink(localLink(emailOf(u)),cloud))applyTeenLink(u,cloud);}
else{const l=localLink(emailOf(u));if(l&&l.status==='skipped')putTeenLink(u,l);}
},0);
return r;
};
['twCheckApproval','checkParentLinkApproval'].forEach(n=>{
const o=window[n];if(typeof o!=='function')return;
window[n]=async function(){if(realAs('teen')){try{await withTimeout(syncTeen(),5000);}catch(e){}}return o.apply(this,arguments);};
});
let pTeens=[],pTeensAt=0,pOwner='';
const reqKeys={};
let parentSyncing=false,profilesAt=0;
function teenLabel(t){return(t&&(t.name||t.email))||'your teen';}
function syncLinkedTeensVar(){
try{
linkedTeens=pTeens.map(t=>({name:teenLabel(t),age:ageFrom(t.dob)||'',city:placeOf(t),inviteCode:t.code||'',status:'active',jobs:0,rating:0,avatar:'🧑',email:t.email}));
}catch(e){}
}
function saveParentTeens(u,push){
if(!u)return;
pTeensAt=Date.now();
const v={teens:pTeens,updatedAt:pTeensAt};
cacheSet(u,'linked_teens',v);
syncLinkedTeensVar();
if(push!==false)put(rowKeyOf(u),'linked_teens',v);
}
function prepareParent(u){
if(pOwner!==rowKeyOf(u)){pTeens=[];pTeensAt=0;pOwner=rowKeyOf(u);}
const saved=cacheGet(u,'linked_teens',null);
if(saved&&Array.isArray(saved.teens)){
if((saved.updatedAt||0)>=pTeensAt){pTeens=saved.teens.filter(t=>t&&t.key);pTeensAt=saved.updatedAt||0;}
}else if(!pTeensAt){
const mine=emailOf(u),links=readJSON(LS_LINKS,{}),accts=readJSON('tw_local_accounts',{}),found=[];
const add=(em,fallbackName,at)=>{
em=String(em||'').toLowerCase();if(!em||found.some(t=>t.email===em))return;
const a=accts[em]||{};
found.push({key:em,email:em,name:a.name||(fallbackName&&fallbackName!==em?fallbackName:'')||em,dob:a.dob||'',city:a.city||'',state:a.state||'',code:'',linkedAt:at||Date.now(),pending:true});
};
readJSON('tw_linked_teens',[]).forEach(t=>{
const em=String((t&&t.email)||'').toLowerCase(),l=em&&links[em];
if(l&&l.status==='approved'&&String(l.parentEmail||'').toLowerCase()===mine)add(em,t.name,Date.parse(l.approvedAt));
});
readJSON(LS_REQ,[]).forEach(r=>{
const l=r&&links[String(r.teenEmail||'').toLowerCase()];
if(r&&r.status==='approved'&&String(r.parentEmail||'').toLowerCase()===mine&&l&&l.status==='approved'&&String(l.parentEmail||'').toLowerCase()===mine)add(r.teenEmail,r.teenName,r.at);
});
pTeens=found;
saveParentTeens(u,false);
}
syncLinkedTeensVar();
}
function fillTeen(t,by){
const p=(by&&by.account_profile)||{};
if(p.name)t.name=p.name;
if(p.dob)t.dob=p.dob;
if(p.city!=null)t.city=p.city;
if(p.state!=null)t.state=p.state;
if(by&&typeof by.link_code==='string')t.code=by.link_code;
if(by&&Array.isArray(by.skills))t.skills=by.skills;
}
async function linkTeenCloud(u,t,viaRequest){
const got=await rows(q=>q.eq('email',t.key).in('key',['parent_link','account_profile','link_code','skills']));
if(got===null)return false;
const by={};got.forEach(r=>{by[r.key]=parse(r.value);});
fillTeen(t,by);
const pe=emailOf(u),prev=by.parent_link||{};
const had=(prev.parents||[]).concat(prev.status==='approved'&&prev.parentEmail?[prev.parentEmail]:[]).map(x=>String(x).toLowerCase());
let ok=true;
if(!(prev.status==='approved'&&had.includes(pe))){
const link=Object.assign({},prev,{status:'approved',parentEmail:pe,parentName:u.name||'',approvedAt:new Date().toISOString(),
parents:[...new Set(had.concat([pe]))],teenEmail:t.email,teenName:t.name||prev.teenName||'',updatedAt:Date.now()});
delete link.unlinkedAt;delete link.declinedAt;
ok=await put(t.key,'parent_link',link);
}
if(ok){
delete t.pending;
if(viaRequest||reqKeys[t.email])put(pe,'link_request:'+t.key,{teenKey:t.key,teenEmail:t.email,teenName:t.name||'',parentEmail:pe,code:t.code||'',status:'approved',at:Date.now()});
}
if(realAs('parent')===u)saveParentTeens(u);
return ok;
}
function adoptTeen(u,email,info){
email=String(email||'').toLowerCase();if(!email)return null;
const key=(info&&info.key)||reqKeys[email]||email;
let t=pTeens.find(x=>x.key===key||x.email===email);
if(!t){
t={key,email,name:(info&&info.name)||'',dob:'',city:'',state:'',code:(info&&info.code)||'',linkedAt:Date.now(),pending:true};
pTeens.push(t);
saveParentTeens(u);
}
if(t.pending)linkTeenCloud(u,t,info&&info.viaRequest).then(()=>redrawParent());
return t;
}
function mergeRequests(u,reqs){
const mine=emailOf(u),local=readJSON(LS_REQ,[]);let changed=false;
reqs.forEach(r=>{
if(!r|| !r.teenEmail||String(r.parentEmail||'').toLowerCase()!==mine)return;
const te=String(r.teenEmail).toLowerCase();
reqKeys[te]=r.teenKey||te;
const i=local.findIndex(x=>x&&String(x.teenEmail).toLowerCase()===te&&String(x.parentEmail||'').toLowerCase()===mine);
const linked=pTeens.some(t=>t.key===(r.teenKey||te));
if(r.status==='pending'&& !linked){
if(i<0){local.push({teenEmail:te,teenName:r.teenName||te,parentEmail:mine,code:r.code||'',status:'pending',at:r.at||Date.now()});changed=true;}
else if(local[i].status!=='pending'&&(r.at||0)>(local[i].at||0)){Object.assign(local[i],{status:'pending',at:r.at,teenName:r.teenName||local[i].teenName});changed=true;}
}else if(i>=0&&local[i].status==='pending'&&r.status!=='pending'){local[i].status=linked?'approved':r.status;changed=true;}
});
if(changed)lsSet(LS_REQ,JSON.stringify(local));
}
async function syncParent(full){
const u=realAs('parent');if(!u||parentSyncing)return;
parentSyncing=true;
try{
const keys=[...new Set([rowKeyOf(u),emailOf(u)])];
const got=await rows(q=>q.in('email',keys));
if(!got||me()!==u)return;
const row=got.find(r=>r.key==='linked_teens'&&r.email===rowKeyOf(u));
const cloud=row&&parse(row.value);
if(cloud&&Array.isArray(cloud.teens)&&(cloud.updatedAt||0)>=pTeensAt){
pTeens=cloud.teens.filter(t=>t&&t.key);pTeensAt=cloud.updatedAt||0;
cacheSet(u,'linked_teens',{teens:pTeens,updatedAt:pTeensAt});syncLinkedTeensVar();
}else if(pTeens.length||pTeensAt){
put(rowKeyOf(u),'linked_teens',{teens:pTeens,updatedAt:pTeensAt});
}
mergeRequests(u,got.filter(r=> /^link_request:/.test(r.key)).map(r=>parse(r.value)).filter(Boolean));
for(const t of pTeens.filter(x=>x.pending))await linkTeenCloud(u,t);
if(full||Date.now()-profilesAt>300000){
profilesAt=Date.now();
const tk=pTeens.map(t=>t.key);
const prof=tk.length?await rows(q=>q.in('email',tk).in('key',['account_profile','link_code','skills'])):[];
if(prof&&prof.length){
const by={};prof.forEach(r=>{(by[r.email]=by[r.email]||{})[r.key]=parse(r.value);});
const before=JSON.stringify(pTeens);
pTeens.forEach(t=>fillTeen(t,by[t.key]));
if(JSON.stringify(pTeens)!==before)saveParentTeens(u);
}
}
redrawParent();
}finally{parentSyncing=false;}
}
async function linkByCode(u,raw){
const code=normCode(raw);
if(!/^TEEN-[A-Z0-9]{4,8}$/.test(code))return{ok:false,msg:'Enter the link code from your teen\'s Profile tab. It looks like TEEN-K7M2QX.'};
if(pTeens.some(t=>t.code===code))return{ok:false,msg:'That teen is already linked to your account.'};
let key='',email='';
const idx=await rows(q=>q.eq('key','code:'+code));
if(idx&&idx.length){
const cands=[...new Set(idx.map(r=>r.email))];
const cur=await rows(q=>q.in('email',cands).in('key',['link_code','account_profile']));
const by={};(cur||[]).forEach(r=>{(by[r.email]=by[r.email]||{})[r.key]=parse(r.value);});
const hit=cands.find(k=>by[k]&&by[k].link_code===code&& !(by[k].account_profile&&by[k].account_profile.type&&by[k].account_profile.type!=='teen'));
if(hit){key=hit;const ix=idx.find(r=>r.email===hit);email=String((ix&&parse(ix.value)||{}).teenEmail||(by[hit].account_profile||{}).email||hit.replace(/#\d+$/,'')).toLowerCase();}
}
if(!key){
const codes=readJSON(LS_CODES,{});
const em=Object.keys(codes).find(k=>codes[k]===code);
if(em){key=em;email=em;}
}
if(!key)return{ok:false,msg:idx===null?'You seem to be offline, so the code can\'t be checked. Try again when you\'re connected.':'No teen has the code '+code+'. Check it on your teen\'s Profile tab (Parent link) and try again.'};
if(pTeens.some(t=>t.key===key))return{ok:false,msg:'That teen is already linked to your account.'};
const t={key,email,name:'',dob:'',city:'',state:'',code,linkedAt:Date.now(),pending:true};
pTeens.push(t);
saveParentTeens(u);
const pe=emailOf(u);
const l=localLink(email);
if(l||readJSON(LS_CODES,{})[email])setLocalLink(email,Object.assign({},l||{},{status:'approved',parentEmail:pe,parentName:u.name||'',approvedAt:new Date().toISOString()}));
await linkTeenCloud(u,t);
return{ok:true,teen:t};
}
async function linkInvite(u,code){
const r=await linkByCode(u,code);
if(r.ok)toast('✅ Linked to '+teenLabel(r.teen)+'! They now have full access.','success');
else toast(r.msg,'info');
redrawParent();
}
const _oApprove=window.twApproveLink;
if(typeof _oApprove==='function')window.twApproveLink=function(teenEmail){
const u=realAs('parent');const e=String(teenEmail||'').toLowerCase();
const req=u?readJSON(LS_REQ,[]).find(r=>r&&String(r.teenEmail).toLowerCase()===e&&r.status==='pending'):null;
const r=_oApprove.apply(this,arguments);
if(u){try{adoptTeen(u,e,{name:req&&req.teenName!==e?req.teenName:'',code:req&&req.code,viaRequest:true});redrawParent();}catch(x){}}
return r;
};
const _oDecline=window.twDeclineLink;
if(typeof _oDecline==='function')window.twDeclineLink=function(teenEmail){
const u=realAs('parent');const e=String(teenEmail||'').toLowerCase();
const r=_oDecline.apply(this,arguments);
if(u)later(async()=>{
const key=reqKeys[e]||e,pe=emailOf(u);
put(pe,'link_request:'+key,{teenKey:key,teenEmail:e,parentEmail:pe,status:'declined',at:Date.now()});
const got=await rows(q=>q.eq('email',key).eq('key','parent_link'));
const cur=got&&got[0]?parse(got[0].value):null;
if(cur&&cur.status==='pending'&&String(cur.parentEmail||'').toLowerCase()===pe)
put(key,'parent_link',Object.assign({},cur,{status:'declined',declinedAt:new Date().toISOString(),updatedAt:Date.now()}));
},0);
return r;
};
const _oLinkAnother=window.linkAnotherTeen;
window.linkAnotherTeen=async function(){
const u=realAs('parent');
if(!u)return typeof _oLinkAnother==='function'?_oLinkAnother.apply(this,arguments):undefined;
const inp=$('mt-invite'),raw=inp?inp.value:'';
if(!String(raw).trim()){toast('Enter your teen\'s link code first. They can find it on their Profile tab.','info');return;}
const btn=document.querySelector('[onclick^="linkAnotherTeen"]');
if(btn)btn.disabled=true;
try{
const r=await linkByCode(u,raw);
if(r.ok){if(inp)inp.value='';toast('✅ Linked to '+teenLabel(r.teen)+'! They now have full access.','success');}
else toast(r.msg,'info');
}finally{if(btn)btn.disabled=false;redrawParent();}
};
window.twUnlinkTeen=async function(key){
const u=realAs('parent');if(!u)return;
const t=pTeens.find(x=>x.key===key);if(!t)return;
if(!confirm('Unlink '+teenLabel(t)+' from your account? If no other parent is linked, their account goes back to limited mode.'))return;
pTeens=pTeens.filter(x=>x!==t);
saveParentTeens(u);redrawParent();
const pe=emailOf(u);
const got=await rows(q=>q.eq('email',t.key).eq('key','parent_link'));
const prev=got&&got[0]?parse(got[0].value)||{}:null;
let next=null;
if(prev){
const parents=(prev.parents||(prev.parentEmail?[prev.parentEmail]:[])).map(x=>String(x).toLowerCase()).filter(x=>x&&x!==pe);
next=parents.length
?Object.assign({},prev,{parents,parentEmail:parents[0],parentName:'',updatedAt:Date.now()})
:Object.assign({},prev,{status:'unlinked',parents:[],parentEmail:'',parentName:'',unlinkedAt:new Date().toISOString(),updatedAt:Date.now()});
await put(t.key,'parent_link',next);
}
const l=localLink(t.email);
if(l&&String(l.parentEmail||'').toLowerCase()===pe)setLocalLink(t.email,next&&next.status==='approved'?Object.assign({},l,{parentEmail:next.parentEmail,parentName:''}):{status:'unlinked',unlinkedAt:new Date().toISOString()});
toast('Unlinked '+teenLabel(t)+'.','info');
};
const _oSaveTeens=window.saveLinkedTeens;
window.saveLinkedTeens=function(){
const u=realAs('parent');
if(!u)return typeof _oSaveTeens==='function'?_oSaveTeens.apply(this,arguments):undefined;
try{(linkedTeens||[]).forEach(t=>{if(t&&t.email&& !pTeens.some(x=>x.email===String(t.email).toLowerCase()))adoptTeen(u,t.email,{name:t.name!==t.email?t.name:'',code:t.inviteCode});});}catch(e){}
saveParentTeens(u);
};
const _oMulti=window.renderMultiTeens;
window.renderMultiTeens=function(){
const u=realAs('parent');
if(!u)return typeof _oMulti==='function'?_oMulti.apply(this,arguments):undefined;
syncLinkedTeensVar();
const badge=$('teen-count-badge');if(badge)badge.textContent=pTeens.length?plural(pTeens.length,'Teen'):'None yet';
const list=$('multi-teen-list');if(!list)return;
list.innerHTML= !pTeens.length
?`<div data-tw-empty="teens" style="text-align:center;padding:1.4rem 1rem;color:var(--muted);background:var(--bg);border:1.5px dashed var(--border);border-radius:14px">
          <div style="font-size:2rem;margin-bottom:.4rem">👪</div>
          <div style="font-weight:700;color:var(--text);margin-bottom:.3rem">No teens linked yet</div>
          <div style="font-size:.84rem;line-height:1.55">Ask your teen to open <strong>Profile</strong> in their TeenWork account and read you the link code under <strong>Parent link</strong> (it looks like TEEN-K7M2QX). Enter it below. If your teen sent you a request, it shows at the top of your dashboard.</div></div>`
:pTeens.map(t=>{
const age=ageFrom(t.dob),info=[age?'Age '+age:'',placeOf(t)].filter(Boolean).join(' · ');
return`<div data-tw-teen="${esc(t.key)}" style="background:var(--bg);border:1.5px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <div data-tw-photo-key="${esc(t.key)}" data-tw-photo-name="${esc(teenLabel(t))}" style="width:48px;height:48px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">🧑</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:.95rem">${esc(teenLabel(t))}</div>
              ${info?`<div style="font-size:.78rem;color:var(--muted)">${esc(info)}</div>`:''}
              ${t.code?`<div style="font-size:.76rem;color:var(--muted);margin-top:2px">Code: <code style="background:var(--bg);border:1px solid var(--border);padding:1px 5px;border-radius:4px;font-size:.74rem">${esc(t.code)}</code></div>`:''}
            </div>
            <span style="background:${t.pending?'var(--amber-pale)':'var(--green-pale)'};color:${t.pending?'var(--amber)':'var(--green)'};font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:10px;flex-shrink:0">${t.pending?'not synced yet':'linked'}</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
            <button class="btn-sm btn-ai" style="font-size:.75rem" onclick="switchParentTab('ptab-weekly','pdtab-weekly')">📬 Weekly summary</button>
            <button class="btn-sm btn-approve" style="font-size:.75rem" onclick="switchParentTab('ptab-approvals','pdtab-approvals')">✅ Approvals</button>
            <button class="btn-sm" style="font-size:.75rem;background:var(--red-pale);color:var(--red);border:1px solid #f5b7b1" onclick="twUnlinkTeen(decodeURIComponent('${encodeURIComponent(t.key)}'))">Unlink</button>
          </div></div>`;
}).join('');
};
const SKILL_ICONS=[[/pet|dog|cat|animal/i,'🐾'],[/lawn|yard|garden|mow|leaf|leaves|rake|weed/i,'🌿'],[/snow|shovel/i,'❄️'],[/clean|wash|chore/i,'🧹'],
[/baby|child|kid|nanny/i,'👶'],[/tutor|homework|math|reading/i,'📚'],[/tech|computer|phone/i,'💻'],[/mov|box|lift/i,'📦'],[/cook|bake|food/i,'🍳'],[/paint|art|craft/i,'🎨']];
const splitSkills=s=>(Array.isArray(s)?s:String(s||'').split(',')).map(x=>String(x).trim()).filter(Boolean).slice(0,20);
const aiProfileOf=u=>readJSON('tw_'+(u.id||u.email)+'_ai_profile',null);
let signupStash=null;
function skillsOf(u){
const saved=cacheGet(u,'skills',null);
if(Array.isArray(saved))return saved;
const ai=aiProfileOf(u);
if(ai&&Array.isArray(ai.skills)&&ai.skills.length&&ai.skills.join(',')!==DEMO_SKILLS)return ai.skills;
return Array.isArray(u.skills)&&u.skills.join(',')!==DEMO_SKILLS?u.skills:[];
}
const addrKey=u=>'tw_device_address_'+rowKeyOf(u).toLowerCase();
const addressOf=u=>readJSON(addrKey(u),null)||{street:'',zip:'',city:u.city||'',state:u.state||''};
function prepareTeen(u){
const em=emailOf(u);
const cl=cacheGet(u,'parent_link',null);
if(cl&&cl.status&& !lsGet(dirtyKey(em))){if(!sameLink(localLink(em),cl))setLocalLink(em,cl);u.parentLinked=cl;}
const cc=cacheGet(u,'link_code',null);
if(typeof cc==='string'&&STRONG.test(cc))setLocalCode(em,cc);
else if(!STRONG.test(localCode(em)))setLocalCode(em,newCode());
if(signupStash&&signupStash.type==='teen'&&signupStash.email===em&& !lsGet(addrKey(u))&&(signupStash.street||signupStash.zip))
lsSet(addrKey(u),JSON.stringify({street:signupStash.street,zip:signupStash.zip,city:signupStash.city||u.city||'',state:signupStash.state||u.state||''}));
const skills=skillsOf(u);u.skills=skills;
try{
if(typeof userActivity!=='undefined'){
if(!Array.isArray(userActivity.skills)|| !userActivity.skills.length||userActivity.skills.join(',')===DEMO_SKILLS)userActivity.skills=skills.slice();
if(/^Hardworking 16-year-old from Burlington/.test(userActivity.bio||'')){const ai=aiProfileOf(u);userActivity.bio=(ai&&ai.bio)||'';}
prune(userActivity.jobsAccepted,j=>j&&SAMPLE_EMPLOYERS.test(String(j.employer||'')));
}
if(typeof teenGameState!=='undefined'&&teenGameState.points===180&&String(teenGameState.badges)==='first_job,first_hire,lesson_1,verified'){
const k=s=>'tw_'+(u.id||u.email)+'_'+s,b=readJSON(k('badges'),null);
teenGameState.badges=Array.isArray(b)?b:[];teenGameState.points=parseInt(lsGet(k('points')),10)||0;
}
}catch(e){}
try{const a=addressOf(u);Object.assign(_userAddress,{street:a.street||'',zip:a.zip||'',city:a.city||u.city||'',state:a.state||u.state||''});}catch(e){}
}
function drawSkills(u,real){
const box=$('profile-skills-display');if(!box)return;
const list=real?skillsOf(u):[];
realHTML(box,real,list.length
?list.map(s=>`<span class="skill-pill">${(SKILL_ICONS.find(([re])=>re.test(s))||[0,'✨'])[1]} ${esc(s.replace(/\b\w/g,c=>c.toUpperCase()))}</span>`).join(' ')
:'<span style="font-size:.8rem;opacity:.8">None yet. Add your skills in Skills &amp; Tags below.</span>');
}
window.saveSkillsInput=function(value){
const list=splitSkills(value),u=me();
try{if(typeof trackActivity==='function')trackActivity('skills_update',list);}catch(e){}
if(!u||u.type!=='teen')return;
u.skills=list;
if(!isReal(u))return;
cacheSet(u,'skills',list);
drawSkills(u,true);
clearTimeout(window.saveSkillsInput._t);
window.saveSkillsInput._t=setTimeout(()=>{if(me()===u)put(rowKeyOf(u),'skills',list);},900);
};
const _oAddr=window.saveProfileAddress;
if(typeof _oAddr==='function')window.saveProfileAddress=function(){
const r=_oAddr.apply(this,arguments);
const u=realAs('teen');
if(u){const v=id=>String(($(id)||{}).value||'').trim();lsSet(addrKey(u),JSON.stringify({street:v('profile-address'),zip:v('profile-zip'),city:v('profile-city'),state:v('profile-state')}));}
return r;
};
function ratingLine(){
let p=document.querySelector('[data-tw-rating-line]');
if(!p){p=[...document.querySelectorAll('#ttab-resume .resume-card p')].find(x=> /avg ·/.test(x.textContent));if(p)p.dataset.twRatingLine='1';}
return p;
}
function ratingText(){
let s=null;try{s=window._twRealStats&&window._twRealStats.stats();}catch(e){}
const n=s?s.totalRatings||0:0,jobs=s?s.jobsCompleted||0:0;
return(s&&s.avgRating?'⭐ '+s.avgRating+' avg from '+plural(n,'rating'):'No ratings yet')+' · '+plural(jobs,'completed job');
}
function panelBadge(tabId,title){
const head=[...document.querySelectorAll('#'+tabId+' .panel-head')].find(h=>{const h2=h.querySelector('h2');return h2&&(!title||h2.textContent.trim()===title);});
return head?head.querySelector('.badge'):null;
}
const openJobs=()=>{try{const applied=new Set(demoJobs.map(j=>j.id));return browsableJobs.filter(j=> !applied.has(j.id));}catch(e){return[];}};
const realApps=()=>{try{return demoJobs.filter(j=>j&& !isSampleJob(j));}catch(e){return[];}};
function patchTeen(u,real,inputs){
const age=ageFrom(u.dob)||(Number(u.age)||0);
realText($('profile-info-display'),real,[age?'Age '+age:'',placeOf(u)].filter(Boolean).join(' · ')||'Add your town in Account Settings below');
drawSkills(u,real);
realText(ratingLine(),real,ratingText());
realText(panelBadge('ttab-browse','Available Jobs'),real,openJobs().length+' Open');
realText(panelBadge('ttab-applications'),real,realApps().length+' Total');
if(inputs){
realVal($('skills-input'),real,skillsOf(u).join(', '));
const a=addressOf(u);
realVal($('profile-address'),real,a.street||'');
realVal($('profile-city'),real,a.city||u.city||'');
realVal($('profile-zip'),real,a.zip||'');
realSel($('profile-state'),real,a.state||u.state||'');
realVal($('acct-city'),real,u.city||'');
realSel($('acct-state'),real,u.state||'');
const bio=$('profile-bio-input');
if(real&&bio&& !bio.value&&typeof userActivity!=='undefined'&&userActivity.bio&&bio!==document.activeElement)bio.value=userActivity.bio;
}
if(real){
try{if($('cal-grid')&&typeof renderCalEarningsBar==='function')renderCalEarningsBar();}catch(e){}
if($('ttab-leaderboard')&&$('ttab-leaderboard').classList.contains('active'))drawLeaderboard();
if($('ttab-stories')&&$('ttab-stories').classList.contains('active'))drawStories();
}
}
const NO_JOBS=EMPTY('🔎','No jobs posted near you yet','Check back soon. In the meantime, finish your profile and try a lesson so you\'re ready to apply.');
const _oBrowse=window.renderBrowseJobs;
if(typeof _oBrowse==='function')window.renderBrowseJobs=function(){
const r=_oBrowse.apply(this,arguments);
try{
const u=realAs('teen'),c=$('browse-jobs-list');
if(u&&c&& !openJobs().length)c.innerHTML=NO_JOBS;
realText(panelBadge('ttab-browse','Available Jobs'),!!u,openJobs().length+' Open');
}catch(e){}
return r;
};
const _oMatch=window.aiJobMatch;
if(typeof _oMatch==='function')window.aiJobMatch=function(){
const u=realAs('teen');
if(!u||openJobs().length)return _oMatch.apply(this,arguments);
try{
const ua=typeof userActivity!=='undefined'?userActivity:{};
const bio=ua.bio||'',skills=ua.skills||[],missing=[];
let strength=0;
if(bio.length>20)strength+=30;else missing.push('add a bio');
if(skills.length>=2)strength+=30;else missing.push('add more skills');
if((ua.jobsAccepted||[]).length)strength+=20;
if((ua.lessonsCompleted||[]).length)strength+=20;
const badge=$('profile-strength-badge');
if(badge){
badge.textContent='Profile: '+(strength>=70?'💪 Strong':strength>=40?'👍 Good':'⚠️ Weak')+' ('+strength+'%)';
badge.style.background=strength>=70?'var(--green-pale)':strength>=40?'var(--amber-pale)':'var(--red-pale)';
badge.style.color=strength>=70?'var(--green)':strength>=40?'var(--amber)':'var(--red)';
}
const nudge=$('ai-match-profile-nudge');
if(nudge){nudge.style.display=missing.length?'block':'none';if(missing.length)nudge.innerHTML='💡 <strong>Get ready for matches:</strong> '+missing.join(' and ')+' in your <a onclick="switchDashTab(null,\'ttab-resume\')" style="color:var(--amber);font-weight:700;cursor:pointer">Profile tab</a>.';}
const panel=$('ai-match-panel');
if(panel)panel.innerHTML='<p style="color:var(--muted);font-size:.85rem;margin:0">No job matches yet, because there are no open jobs near you right now. Matches show up here when jobs are posted.</p>';
}catch(e){}
};
const _oTeenApps=window.renderTeenApplications;
if(typeof _oTeenApps==='function')window.renderTeenApplications=function(){
const r=_oTeenApps.apply(this,arguments);
try{
const u=realAs('teen'),c=$('teen-applications-list'),apps=realApps();
if(u&&c&&apps.length)c.innerHTML=apps.map(j=>`<div class="job-card"><div class="job-card-top"><div><div class="job-title">${esc(j.title)}</div><div class="job-employer">${esc(j.employer)} · Applied ${esc(j.applied||'')}</div></div>
        <span class="tag status-${j.status==='pending-approval'?'pending':esc(j.status)}">${j.status==='pending-approval'?'Waiting for Parent Approval':j.status==='accepted'?'✓ Accepted':j.status==='applied'?'Sent to employer':'Not approved'}</span></div>
        <div class="job-meta"><span class="tag pay">$${esc(j.pay)}${j.payType==='hourly'?'/hr':' flat'}</span><span class="tag">📍 ${esc(j.city)}</span><span class="tag">🏷 ${esc(j.type)}</span></div></div>`).join('');
realText(panelBadge('ttab-applications'),!!u,apps.length+' Total');
}catch(e){}
return r;
};
const _oSaveAcct=window.saveAccountSettings;
if(typeof _oSaveAcct==='function')window.saveAccountSettings=function(){
const r=_oSaveAcct.apply(this,arguments);
later(()=>applyAll(false),0);
return r;
};
function drawLeaderboard(){
const u=realAs('teen');if(!u)return;
const opts=readJSON('tw_lb_opts',{});
let s=null;try{s=window._twRealStats.stats();}catch(e){}
const badges=(typeof teenGameState!=='undefined'&&teenGameState.badges)?teenGameState.badges.length:0,hours=s?s.totalHours:0;
const row=(metric,unit)=>`<div style="display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;background:var(--amber-pale);border:1.5px solid var(--amber);margin-bottom:6px">
      <div style="font-size:1.3rem;width:28px;text-align:center">🥇</div><div style="font-size:1.4rem">😎</div>
      <div style="flex:1"><div style="font-weight:700;font-size:.88rem;color:var(--amber)">${esc(u.name||'You')} (You)</div><div style="font-size:.72rem;color:var(--muted)">${esc(u.city||'Your town')}</div></div>
      <div style="text-align:right"><div style="font-family:'Fraunces',serif;font-size:1.2rem;font-weight:900;color:var(--amber)">${metric}</div><div style="font-size:.68rem;color:var(--muted)">${unit}</div></div></div>`;
const note='<div style="margin-top:.6rem;font-size:.78rem;color:var(--muted);text-align:center">Rankings with other teens are coming soon. For now this shows your own count.</div>';
const none='<div style="padding:.9rem;background:var(--bg);border-radius:10px;font-size:.84rem;color:var(--muted);text-align:center">Opt in above to show up here.</div>';
const bl=$('lb-badges-list'),hl=$('lb-hours-list');
if(bl)bl.innerHTML=opts.badges?row(badges,'badges')+note:none;
if(hl)hl.innerHTML=opts.hours?row(hours+'h','hours worked')+note:none;
}
const _oLbOpt=window.leaderboardOptToggle;
if(typeof _oLbOpt==='function')window.leaderboardOptToggle=function(){const r=_oLbOpt.apply(this,arguments);drawLeaderboard();return r;};
const isSample=s=> !!(window.twIsOldSample&&(window.twIsOldSample(s.name)||window.twIsOldSample(s.quote)));
function drawStories(){
const el=$('stories-container');if(!el|| !isReal(me()))return;
const list=readJSON('tw_success_stories',[]).filter(s=>s&& !isSample(s));
el.innerHTML=list.length
?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">${list.map(s=>`<div style="background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:1rem"><div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;font-weight:700">${esc(s.role)}</div><p style="font-size:.9rem;margin:6px 0 8px;line-height:1.5">"${esc(s.quote)}"</p><div style="font-size:.78rem;color:var(--green);font-weight:700">— ${esc(s.name)}</div></div>`).join('')}</div>`
:EMPTY('🌟','No member stories yet','Got one? Share it below and it could be featured here.');
}
const _oStories=window.renderStories;
if(typeof _oStories==='function')window.renderStories=function(containerId){
const r=_oStories.apply(this,arguments);
if(containerId==='stories-container')drawStories();
return r;
};
function patchVerify(){
const u=me();if(!u)return;
const real=isReal(u);
const who=u.type==='parent'?(pTeens[0]||{name:'',dob:'',state:''}):u;
const body=$('tw-ver-body-1');if(!body)return;
const ins=body.querySelectorAll('input');
const parts=String(who.name||'').trim().split(/\s+/);
realVal(ins[0],real,parts[0]||'');realVal(ins[1],real,parts.slice(1).join(' '));
realVal(ins[2],real,who.dob||'');realVal(ins[3],real,who.state||'');
const up=body.querySelector('.tw-ver-upload');
if(up){realText(up,real,'No ID uploaded');up.classList.toggle('has-file',!real);}
const age=ageFrom(who.dob);
realVal($('tw-ver-age'),real,age?String(age):'');
const sel=$('tw-ver-state');
if(sel){const o=orig(sel,'sel',()=>sel.value);if(!real)sel.value=o;else{const m=[...sel.options].find(x=>x.textContent.trim().toLowerCase()===String(who.state||'').toLowerCase());if(m)sel.value=m.value;}}
}
const _oVerify=window.showVerifyPage;
if(typeof _oVerify==='function')window.showVerifyPage=function(){const r=_oVerify.apply(this,arguments);try{patchVerify();}catch(e){}later(patchVerify,120);return r;};
try{
if(typeof TW_Verify!=='undefined'&&TW_Verify){
const _oPrev=TW_Verify.previewConsentEmail,_oBGC=TW_Verify.purchaseBGC;
TW_Verify.previewConsentEmail=function(){
const u=me();if(!isReal(u))return _oPrev.apply(this,arguments);
const name=($('tw-ver-parent-name')||{}).value||'[Parent]';
const teen=u.type==='teen'?(u.name||'your teen'):teenLabel(pTeens[0]);
alert(`📧 Email preview to ${name}:\n\nSubject: Action Required — TeenWork Consent for ${teen}\n\n${firstName(teen)||'Your teen'} has created a TeenWork account and needs your consent to apply for jobs. Click the link to review and sign.\n\n[Sign Consent Form →]\n\nYou can revoke consent anytime from your parent dashboard.`);
};
TW_Verify.purchaseBGC=async function(){
if(!isReal(me()))return _oBGC.apply(this,arguments);
const box=$('tw-ver-bgc-result');
if(box){box.textContent='✦ Background checks are coming soon. Nothing was charged.';box.classList.add('show');}
};
}
}catch(e){}
const _oEmpBGC=window.runEmployerBGC;
if(typeof _oEmpBGC==='function')window.runEmployerBGC=async function(){
if(!realAs('employer'))return _oEmpBGC.apply(this,arguments);
try{showAlert('emp-bgc-alert','🛡 Verified-employer background checks are coming soon. Nothing was charged.','info');}catch(e){}
};
function parentActivity(){
const apps=isReal(me())?realApps():(typeof demoJobs!=='undefined'?demoJobs:[]),ratings=(typeof demoRatings!=='undefined'?demoRatings:[]);
const pending=parentApprovalRecords(apps),accepted=apps.filter(j=>j.status==='accepted');
const avg=ratings.length?(ratings.reduce((s,r)=>s+(Number(r.stars)||0),0)/ratings.length).toFixed(1):'';
return{apps,pending,accepted,ratings,avg,total:apps.length+ratings.length};
}
const teenNames=()=>pTeens.map(t=>firstName(t.name)||t.email).join(', ');
function parentHeaderHTML(){
if(!pTeens.length)return'<strong id="parent-teen-name">No teen linked yet</strong> · <a href="#" onclick="switchParentTab(\'ptab-teens\',\'pdtab-teens\');return false" style="color:var(--green);font-weight:700">Link your teen</a>';
if(pTeens.length===1){const t=pTeens[0],age=ageFrom(t.dob);return'Monitoring <strong id="parent-teen-name">'+esc(teenLabel(t))+'</strong>'+(age?' · Age '+age:'')+(t.state?' · '+esc(t.state):'');}
return'Monitoring <strong id="parent-teen-name">'+esc(teenNames())+'</strong>';
}
const SMALL='font-size:.82rem;color:var(--muted);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.5px';
function teenCardHTML(t,more){
if(!t)return`<div class="teen-profile-card"><div class="teen-avatar">👪</div><div class="teen-name" id="p-teen-name">No teen linked yet</div>
        <div class="teen-info">Ask your teen for the link code on their Profile tab, then enter it under My Teens. Or approve their request when it shows at the top of this page.</div></div>
        <button class="btn-sm btn-approve" style="margin-top:10px;width:100%" onclick="switchParentTab('ptab-teens','pdtab-teens')">🔗 Link your teen</button>`;
const age=ageFrom(t.dob),info=[age?'Age '+age:'',placeOf(t)].filter(Boolean).join(' · ');
return`<div class="teen-profile-card"><div class="teen-avatar" data-tw-photo-key="${esc(t.key)}" data-tw-photo-name="${esc(teenLabel(t))}">🧑</div><div class="teen-name" id="p-teen-name">${esc(teenLabel(t))}</div>
        ${info?`<div class="teen-info">${esc(info)}</div>`:''}
        <div class="teen-info">Skills: ${t.skills&&t.skills.length?esc(t.skills.join(', ')):'none added yet'}</div></div>
        ${t.code?`<div style="${SMALL}">Link Code</div><div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-family:monospace;font-size:.95rem;letter-spacing:2px">${esc(t.code)}</div>
        <div style="font-size:.76rem;color:var(--muted);margin-top:5px">Share with a second parent so they can link too</div>`:''}
        ${more?`<div style="font-size:.8rem;color:var(--muted);margin-top:8px">+ ${plural(more,'more linked teen')} · <a href="#" onclick="switchParentTab('ptab-teens','pdtab-teens');return false" style="color:var(--green);font-weight:700">See My Teens</a></div>`:''}
        <button class="btn-sm btn-ai" style="margin-top:10px;width:100%" onclick="showVerifyPage()">🛡 View Teen's Verification Status</button>`;
}
function patchParent(u,real){
realHTML(document.querySelector('#page-parent .dash-header p'),real,parentHeaderHTML());
const a=parentActivity();
const vals=[[a.apps.length,a.pending.length?a.pending.length+' pending review':'None yet'],[a.pending.length,a.pending.length?'Your action needed':'Nothing waiting'],
[a.accepted.length,'This season'],[a.avg?a.avg+'⭐':'—',a.ratings.length?'From '+plural(a.ratings.length,'rating'):'No ratings yet']];
document.querySelectorAll('#ptab-overview .stats-row .stat-card').forEach((c,i)=>{
if(!vals[i])return;
if(i<2){c.querySelector('.stat-value').textContent=String(vals[i][0]);c.querySelector('.stat-sub').textContent=vals[i][1];}
else{realText(c.querySelector('.stat-value'),real,String(vals[i][0]));realText(c.querySelector('.stat-sub'),real,vals[i][1]);}
});
let card=document.querySelector('[data-tw-teen-card]');
if(!card){const tc=document.querySelector('#ptab-overview .teen-profile-card');card=tc&&tc.closest('.panel-body');if(card)card.dataset.twTeenCard='1';}
if(card){
realHTML(card,real,teenCardHTML(pTeens[0],pTeens.length-1));
realText(card.closest('.panel').querySelector('.panel-head .badge'),real,pTeens.length?'Linked':'Not linked');
}
const allApps=$('all-applications');
realText(allApps&&allApps.closest('.panel').querySelector('.panel-head .badge'),real,a.apps.length+' Total');
if(real&&allApps&& !a.apps.length&& !allApps.querySelector('[data-tw-empty]'))allApps.innerHTML=EMPTY('📋','No applications yet','When your teen applies for a job, it shows up here for you to review.');
const nl=$('notif-list');
if(real&&nl&& !demoNotifs.length&& !nl.querySelector('[data-tw-empty]'))nl.innerHTML=EMPTY('🔔','No notifications yet','Your teen\'s job applications, approvals and safety alerts show up here.');
realAttr($('mt-invite'),real,'placeholder','e.g. TEEN-K7M2QX');
const mt=$('mt-invite'),box=mt&&mt.closest('#ptab-teens > .panel, #ptab-teens .panel-body');
if(box){
const head=[...box.querySelectorAll('div')].find(d=> /^➕ Link Another Teen$/i.test(d.textContent.trim())||d.dataset.twLinkHead);
if(head){head.dataset.twLinkHead='1';realText(head,real,pTeens.length?'➕ Link Another Teen':'➕ Link Your Teen');}
const tip=[...box.querySelectorAll('p')].find(x=> /^Ask your other teen to share/.test(x.textContent)||x.dataset.twLinkTip);
if(tip){tip.dataset.twLinkTip='1';realText(tip,real,'Your teen finds their link code on their Profile tab, under Parent link.');}
}
if(real){
const badge=$('teen-count-badge');if(badge)badge.textContent=pTeens.length?plural(pTeens.length,'Teen'):'None yet';
if($('ptab-teens')&&$('ptab-teens').classList.contains('active'))window.renderMultiTeens();
}
}
function redrawParent(){const u=realAs('parent');if(u){try{patchParent(u,true);}catch(e){}}}
const _oRPD=window.renderParentDashboard;
if(typeof _oRPD==='function')window.renderParentDashboard=function(){
const r=_oRPD.apply(this,arguments);
try{const u=me();if(u&&u.type==='parent')patchParent(u,isReal(u));}catch(e){}
return r;
};
function fixHired(id){const el=$(id);if(el&&isReal(me()))el.querySelectorAll('.cal-synced-badge').forEach(b=>{b.textContent=fixNames(b.textContent);});}
['renderApprovalJobs','renderAllApplications'].forEach(n=>{
const o=window[n];if(typeof o!=='function')return;
window[n]=function(){const r=o.apply(this,arguments);try{fixHired(n==='renderApprovalJobs'?'approval-jobs':'all-applications');redrawParent();}catch(e){}return r;};
});
const _oNotifs=window.renderNotifications;
if(typeof _oNotifs==='function')window.renderNotifications=function(){
if(isReal(me())){try{prune(demoNotifs,isSampleNotif);}catch(e){}}
const r=_oNotifs.apply(this,arguments);
redrawParent();
return r;
};
async function withPrompt(prompt,fn){
const saved=window.callGemini;let used=false;
if(typeof saved==='function')window.callGemini=function(){if(used)return saved.apply(this,arguments);used=true;window.callGemini=saved;return saved.call(this,prompt);};
try{return await fn();}finally{if(window.callGemini!==saved&& !used)window.callGemini=saved;}
}
function activityFacts(a){
return[
'- Teen(s): '+pTeens.map(t=>teenLabel(t)+(ageFrom(t.dob)?' (age '+ageFrom(t.dob)+')':'')+(placeOf(t)?', '+placeOf(t):'')).join('; '),
'- Job applications: '+a.apps.length+(a.apps.length?' ('+a.apps.map(j=>j.title+' at '+j.employer+', '+j.status).join('; ')+')':''),
'- Waiting for parent approval: '+a.pending.length,
'- Accepted: '+a.accepted.length,
'- Ratings: '+(a.ratings.length?a.ratings.map(r=>r.stars+'★ from '+r.from).join(', '):'none'),
].join('\n');
}
const _oWeekly=window.generateWeeklySummary;
if(typeof _oWeekly==='function')window.generateWeeklySummary=async function(){
const u=realAs('parent');if(!u)return _oWeekly.apply(this,arguments);
const a=parentActivity();
if(pTeens.length&&a.total){
const prompt='You are writing a short, warm weekly digest email from TeenWork to a parent. Use ONLY these facts and do not invent any other activity, earnings, lessons or ratings:\n'+activityFacts(a)+
'\n\nWrite 3 short sections with emoji headers: 📊 This Week at a Glance, 💼 Job Activity, 💡 Parent Tip. Under 150 words. Sign off as "The TeenWork Team".';
return withPrompt(prompt,()=>_oWeekly.apply(this,arguments));
}
const out=$('weekly-summary-output'),body=$('weekly-summary-body'),dateEl=$('weekly-summary-date');
if(!out|| !body)return;
out.style.display='block';
const now=new Date(),sun=new Date(now);sun.setDate(now.getDate()-now.getDay());const sat=new Date(sun);sat.setDate(sun.getDate()+6);
const fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
if(dateEl)dateEl.textContent='Week of '+fmt(sun)+' – '+fmt(sat);
body.innerHTML= !pTeens.length
?'📭 <strong>No teen linked yet.</strong><br><br>Link your teen in <a href="#" onclick="switchParentTab(\'ptab-teens\',\'pdtab-teens\');return false" style="color:var(--green);font-weight:700">My Teens</a> and their weekly summary will show here.'
:'📭 <strong>Nothing to report yet for '+esc(teenNames())+'.</strong><br><br>When your teen applies for jobs, gets approved or receives a rating on TeenWork, this week\'s summary shows it here.';
};
const _oDigest=window.openParentAIDigest;
if(typeof _oDigest==='function')window.openParentAIDigest=async function(){
const u=realAs('parent');if(!u)return _oDigest.apply(this,arguments);
const a=parentActivity();
if(pTeens.length&&a.total){
const prompt='You are writing a friendly 3-4 sentence weekly summary for a parent on TeenWork. Use ONLY these facts and do not invent anything:\n'+activityFacts(a)+'\nEnd with one specific suggestion for the parent.';
const r=await withPrompt(prompt,()=>_oDigest.apply(this,arguments));
const sub=document.querySelector('#parent-digest-modal div[style*="font-size:.78rem"]');if(sub)sub.textContent=teenNames()+' · this week';
return r;
}
let modal=$('parent-digest-modal');
if(!modal){modal=document.createElement('div');modal.id='parent-digest-modal';modal.style.cssText='position:fixed;inset:0;z-index:6000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:1rem';document.body.appendChild(modal);}
modal.innerHTML=`<div style="background:var(--card);border-radius:18px;padding:1.6rem 1.5rem;max-width:480px;width:100%;box-shadow:var(--shadow-lg);position:relative">
      <button onclick="document.getElementById('parent-digest-modal').remove()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.3rem;color:var(--muted);cursor:pointer">✕</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem"><span style="font-size:1.8rem">📋</span><div><div style="font-family:'Fraunces',serif;font-size:1.05rem;font-weight:700;color:var(--green)">AI Weekly Digest</div>
      <div style="font-size:.78rem;color:var(--muted)">${pTeens.length?esc(teenNames())+' · this week':'No teen linked yet'}</div></div></div>
      <div style="font-size:.88rem;line-height:1.7;color:var(--text);background:var(--bg);border-radius:10px;padding:.9rem 1rem;margin-bottom:1rem">${pTeens.length?'Nothing to report yet. When your teen applies for jobs, gets approved or receives a rating, the digest sums it up here.':'Link your teen under My Teens to get a weekly digest of their TeenWork activity.'}</div>
      <button onclick="document.getElementById('parent-digest-modal').remove()" style="width:100%;background:var(--green);color:#fff;border:none;padding:10px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:700;cursor:pointer">Close</button></div>`;
};
const _oSummary=window.viewTeenSummary;
window.viewTeenSummary=function(){
if(!realAs('parent'))return typeof _oSummary==='function'?_oSummary.apply(this,arguments):undefined;
try{switchParentTab('ptab-weekly','pdtab-weekly');}catch(e){}
};
const _oExport=window.exportParentData;
if(typeof _oExport==='function')window.exportParentData=function(){
const u=realAs('parent');if(!u)return _oExport.apply(this,arguments);
const a=parentActivity();
const contacts=(typeof MSG_CONTACTS!=='undefined'&&MSG_CONTACTS.parent)?MSG_CONTACTS.parent:[];
const data={
exportDate:new Date().toISOString(),
parent:{name:u.name||'',email:u.email},
teens:pTeens.map(t=>({name:t.name||'',email:t.email,dob:t.dob||'',city:t.city||'',state:t.state||'',linkCode:t.code||'',linkedAt:t.linkedAt?new Date(t.linkedAt).toISOString():''})),
applications:a.apps.map(j=>({title:j.title,employer:j.employer,status:j.status,applied:j.applied,pay:j.pay,city:j.city})),
ratings:a.ratings.map(r=>({job:r.job,from:r.from,stars:r.stars,comment:r.comment})),
notifications:(typeof demoNotifs!=='undefined'?demoNotifs:[]).slice(0,50),
parentalControls:Object.assign({},typeof parentalControls!=='undefined'?parentalControls:{}),
yourMessages:contacts.map(c=>({contact:c.name,role:c.role,messageCount:(c.messages||[]).length,messages:(c.messages||[]).map(m=>({from:m.from,time:m.time,blocked: !!m.blocked}))})),
};
const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
const url=URL.createObjectURL(blob),link=document.createElement('a');
link.href=url;link.download='teenwork-data-export-'+Date.now()+'.json';link.click();
setTimeout(()=>URL.revokeObjectURL(url),1000);
toast('Data exported successfully!','success');
};
const empProfile=u=>cacheGet(u,'emp_profile',null)||{};
const bizName=u=>empProfile(u).name||(u&&u.name)||'';
function prepareEmployer(u){
const s=signupStash;
if(!cacheGet(u,'emp_profile',null)&&s&&s.type==='employer'&&s.email===emailOf(u)&&(s.business||s.city))
saveMine(u,'emp_profile',{name:s.business||'',city:s.city||'',state:s.state||'',updatedAt:Date.now()});
}
async function syncEmployer(){
const u=realAs('employer');if(!u)return;
const got=await rows(q=>q.eq('email',rowKeyOf(u)).eq('key','emp_profile'));
if(!got||me()!==u)return;
const cloud=got[0]?parse(got[0].value):null,local=cacheGet(u,'emp_profile',null);
if(cloud&&(!local||(cloud.updatedAt||0)>(local.updatedAt||0))){cacheSet(u,'emp_profile',cloud);applyAll(true);}
else if(local&& !cloud)put(rowKeyOf(u),'emp_profile',local);
}
const postedJobs=()=>(typeof employerPostedJobs!=='undefined'?employerPostedJobs:[]);
const applicants=()=>(typeof demoApplicants!=='undefined'?demoApplicants:[]);
function drawEmpProfile(u,real,inputs){
const p=real?empProfile(u):{};
realText($('emp-profile-name-display'),real,p.name||u.name||'Your business');
realText($('emp-profile-loc-display'),real,[placeOf(p)?'📍 '+placeOf(p):'',p.type||''].filter(Boolean).join(' · ')||'📍 Add your town and type of work in Edit Profile');
const verified=[...document.querySelectorAll('#etab-profile .badge.badge-green')].find(b=> /Employer profile \(not screened\)/.test(b.textContent));
realHide(verified,real);
realText($('emp-profile-rating-badge'),real,'No reviews yet');
realText($('emp-profile-about-display'),real,p.about||'Tell teens and parents about your business: what you do, the kind of work, and what makes it a good first job. Tap ✏️ Edit Profile.');
const ex=$('emp-profile-expect-display');realText(ex&&ex.querySelector('p'),real,p.expect||'Add what teens can expect: hours, pay, equipment and who they work with.');
if(inputs){
realVal($('emp-edit-name'),real,p.name||u.name||'');
const ab=$('emp-edit-about'),xp=$('emp-edit-expect');
if(real&&ab&&ab!==document.activeElement)ab.value=p.about||'';
if(real&&xp&&xp!==document.activeElement)xp.value=p.expect||'';
realSel($('emp-edit-type'),real,p.type||'');
}
}
function patchEmployer(u,real,inputs){
const posted=postedJobs(),apps=applicants();
const vals=[[posted.length,posted.length?'Receiving applications':'No posts yet'],[apps.filter(a=> !a.hired&& !a.passed).length,'This week'],
[apps.filter(a=>a.hired).length,'This season'],['—','Not enough data yet']];
document.querySelectorAll('#etab-active .stats-row .stat-card').forEach((c,i)=>{
if(!vals[i])return;
realText(c.querySelector('.stat-value'),real,String(vals[i][0]));realText(c.querySelector('.stat-sub'),real,vals[i][1]);
});
const jl=$('employer-jobs-list');
if(real&&jl&& !jl.children.length)jl.innerHTML=EMPTY('📋','No job posts yet','Use <strong>Post Job</strong> to add your first one.');
const endorse=$('endorsement-count-badge');realHide(endorse&&endorse.closest('.panel'),real);
const form=$('rev-text');realHide(form&&form.closest('.panel'),real);
const inner=$('etab-reviews-inner');realText(inner&&inner.closest('.panel').querySelector('.panel-head h2'),real,'📊 Your Workers');
const letters=$('etab-letters');
if(letters){
realHide(letters.firstElementChild,real);
realHide(letters.querySelector('button[onclick^="toggleEmpLetterForm"]'),real);
let intro=letters.querySelector('[data-tw-letters-intro]');
if(!intro){intro=[...letters.querySelectorAll('p')].find(p=> /Letters you've written for this worker/.test(p.textContent));if(intro)intro.dataset.twLettersIntro='1';}
realText(intro,real,'Letters you write for teens you hire show up here and on their profile.');
}
if(inputs){realVal($('ltr-from'),real,bizName(u));realVal($('ltr-title'),real,'');}
const ana=[['—','Not tracked yet'],[apps.length,'From your job posts'],['—','Views → Applied'],['—','From first apply']];
document.querySelectorAll('#etab-analytics .stats-row .stat-card').forEach((c,i)=>{
if(!ana[i])return;
realText(c.querySelector('.stat-value'),real,String(ana[i][0]));realText(c.querySelector('.stat-sub'),real,ana[i][1]);
});
drawEmpProfile(u,real,inputs);
realHide(document.querySelector('#etab-schedule button[onclick^="empAIFillSchedule"]'),real);
const law=document.querySelector('#etab-ai button[data-tw-law]')||document.querySelector('#etab-ai button[onclick*="Vermont state child labor"]');
if(law){
law.dataset.twLaw='1';
const st=(real&&(empProfile(u).state||u.state))||'Vermont';
const o=orig(law,'attr:onclick',()=>law.getAttribute('onclick'));
realText(law,real,'📋 '+st+' teen labor laws');
realAttr(law,real,'onclick',o.replace('Vermont state',st.replace(/['"\\<>]/g,'')+' state'));
}
if(real){
if($('etab-analytics')&&$('etab-analytics').classList.contains('active'))window.renderEmpAnalytics();
if($('etab-schedule')&&$('etab-schedule').classList.contains('active')&&typeof renderEmpSchedGrid==='function')renderEmpSchedGrid();
if($('etab-profile')&&$('etab-profile').classList.contains('active'))window.renderEmpProfileReviews();
}
}
const _oEmpDash=window.renderEmployerDashboard;
if(typeof _oEmpDash==='function')window.renderEmployerDashboard=function(){
const r=_oEmpDash.apply(this,arguments);
try{const u=realAs('employer'),jl=$('employer-jobs-list');if(u&&jl&& !jl.children.length)jl.innerHTML=EMPTY('📋','No job posts yet','Use <strong>Post Job</strong> to add your first one.');}catch(e){}
return r;
};
const _oAna=window.renderEmpAnalytics;
window.renderEmpAnalytics=function(){
if(!realAs('employer'))return typeof _oAna==='function'?_oAna.apply(this,arguments):undefined;
const table=$('emp-analytics-table'),funnel=$('emp-analytics-funnel'),posted=postedJobs(),apps=applicants();
if(table)table.innerHTML=posted.length
?`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.84rem"><thead><tr style="background:var(--bg)">${['Job','Applied','Hired','Status'].map((h,i)=>`<th style="text-align:${i?'center':'left'};padding:9px 12px;font-weight:700;color:var(--muted);font-size:.74rem;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid var(--border)">${h}</th>`).join('')}</tr></thead><tbody>
        ${posted.map(j=>`<tr style="border-bottom:1px solid var(--border)"><td style="padding:10px 12px;font-weight:600">${esc(j.title)}</td><td style="padding:10px 12px;text-align:center">${apps.filter(x=>x.job===j.title).length}</td><td style="padding:10px 12px;text-align:center">${apps.filter(x=>x.job===j.title&&x.hired).length}</td><td style="padding:10px 12px;text-align:center">Active</td></tr>`).join('')}</tbody></table></div>`
:EMPTY('📊','No job posts yet','Each job you post gets a row here with its applications and hires.');
if(funnel)funnel.innerHTML=apps.length?'':EMPTY('🔽','No applicants yet','Your applicant funnel fills in as teens apply to your jobs.');
};
const _oProfRev=window.renderEmpProfileReviews;
window.renderEmpProfileReviews=function(){
const u=realAs('employer');
if(!u)return typeof _oProfRev==='function'?_oProfRev.apply(this,arguments):undefined;
const c=$('emp-profile-review-count');if(c)c.textContent='0 reviews';
realText($('emp-profile-rating-badge'),true,'No reviews yet');
const el=$('emp-profile-reviews-list');if(el)el.innerHTML=EMPTY('⭐','No reviews yet','Teens you hire can review you after a job. Their reviews show up here.');
};
const _oProfSave=window.empProfileSave;
window.empProfileSave=function(){
const u=realAs('employer');
if(!u)return typeof _oProfSave==='function'?_oProfSave.apply(this,arguments):undefined;
const v=id=>String(($(id)||{}).value||'').trim(),p=empProfile(u);
const next=Object.assign({},p,{name:v('emp-edit-name')||p.name||u.name||'',type:v('emp-edit-type'),about:v('emp-edit-about'),expect:v('emp-edit-expect'),updatedAt:Date.now()});
saveMine(u,'emp_profile',next);
drawEmpProfile(u,true,false);
const al=$('emp-profile-save-alert');if(al){al.className='alert alert-success';al.textContent='✅ Profile saved!';al.style.display='';}
setTimeout(()=>{try{empProfileToggleEdit();}catch(e){}},1200);
toast('Profile updated!','success');
};
if(typeof renderEmpSchedGrid==='function'){
const _oSched=window.renderEmpSchedGrid;
window.renderEmpSchedGrid=function(){
if(!realAs('employer'))return _oSched.apply(this,arguments);
const grid=$('emp-sched-grid');if(!grid)return;
try{const d=_empGetWeekDates(empWeekOffset),lbl=$('emp-cal-label');if(lbl)lbl.textContent=_empFmtDate(d[0])+' – '+_empFmtDate(d[6]);}catch(e){}
grid.innerHTML=`<div style="grid-column:1/-1">${EMPTY('📅','No shifts scheduled yet','When you hire a teen and agree on shifts, they show up here for you to approve.')}</div>`;
};
}
const _oLetterList=window.renderEmpLetterList;
if(typeof _oLetterList==='function')window.renderEmpLetterList=function(){
const r=_oLetterList.apply(this,arguments);
try{const c=$('emp-letter-list');if(realAs('employer')&&c&& /No letters written yet/.test(c.textContent))c.innerHTML='<p style="color:var(--muted);font-size:.85rem;font-style:italic">No letters yet. After you hire a teen, you can write them a letter of recommendation here.</p>';}catch(e){}
return r;
};
function applyAll(inputs){
const u=me();if(!u|| !ROLES.includes(u.type))return;
const real=isReal(u);
try{if(u.type==='teen')patchTeen(u,real,inputs);}catch(e){console.warn('real-data teen:',e);}
try{if(u.type==='parent')patchParent(u,real);}catch(e){console.warn('real-data parent:',e);}
try{if(u.type==='employer')patchEmployer(u,real,inputs);}catch(e){console.warn('real-data employer:',e);}
}
const _oSignup=window.doSignup;
if(typeof _oSignup==='function')window.doSignup=function(){
try{
const v=id=>String(($(id)||{}).value||'').trim();
const type=(typeof selectedType!=='undefined'&&selectedType)||window.selectedType||'';
const emp=type==='employer';
signupStash={type,email:v('su-email').toLowerCase(),business:v('su-business'),city:v(emp?'su-emp-city':'su-city'),state:v(emp?'su-emp-state':'su-state'),
street:emp?'':v('su-teen-address'),zip:emp?'':v('su-teen-zip')};
if(type==='parent'&& !window.__twInvite&&v('su-invite'))window.__twInvite=v('su-invite');
}catch(e){}
return _oSignup.apply(this,arguments);
};
const _oLaunch=window.launchDashboard;
window.launchDashboard=function(){
const u=me();
let invite='';
try{
if(u){
useSamplesFor(u);
if(isReal(u)){
if(u.type==='teen')prepareTeen(u);
else if(u.type==='parent'){invite=window.__twInvite||'';window.__twInvite='';prepareParent(u);}
else if(u.type==='employer')prepareEmployer(u);
}else if(u.type==='parent'){
try{linkedTeens=[];}catch(e){}
}
}
}catch(e){console.warn('real-data prepare failed',e);}
const r=typeof _oLaunch==='function'?_oLaunch.apply(this,arguments):undefined;
if(u){
[0,150,700,1600].forEach(ms=>later(()=>{if(me()===u){if(isReal(u))useSamplesFor(u);applyAll(ms!==150);}},ms));
if(isReal(u)){
if(u.type==='teen')later(syncTeen,60);
if(u.type==='parent')later(async()=>{if(invite)await linkInvite(u,invite);await syncParent(true);},60);
if(u.type==='employer')later(syncEmployer,60);
}
}
return r;
};
const retab=()=>{later(()=>applyAll(false),160);later(()=>applyAll(false),500);};
['switchDashTab','switchParentTab','switchEmployerTab'].forEach(n=>{
const o=window[n];if(typeof o!=='function')return;
window[n]=function(){const r=o.apply(this,arguments);retab();return r;};
});
setInterval(()=>{
const t=realAs('teen');if(t&&teenStatus(t)!=='approved')syncTeen();
if(realAs('parent'))syncParent(false);
},20000);
document.addEventListener('visibilitychange',()=>{
if(document.visibilityState!=='visible')return;
if(realAs('teen'))syncTeen();
if(realAs('parent'))syncParent(false);
});
window._twRealData={linkedTeens:()=>pTeens.map(t=>Object.assign({},t)),syncParent:()=>syncParent(true),syncTeen,isReal:()=>isReal(me()),newCode};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/find-jobs-simple-v45.js */
try{
(function(){
'use strict';
if(window.__twFindJobsSimpleV45)return;
window.__twFindJobsSimpleV45=true;
var $=function(id){return document.getElementById(id);};
var css=document.createElement('style');
css.id='find-jobs-simple-v45-css';
css.textContent=
'#fjs-progress{margin-bottom:1.2rem}'+
'#fjs-progress .fjs-title{font-family:"DM Sans",sans-serif;font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 .6rem}'+
'#fjs-progress .stats-row{margin-bottom:1rem}'+
'#fjs-progress #teen-profile-completion{margin-bottom:1rem}'+
'#fjs-progress #teen-savings-banner{margin-bottom:0}'+
'.fjs-head-right{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}'+
'#fjs-ai-picks{font-size:.75rem;white-space:nowrap}'+
'.fjs-more{display:none;align-items:center;gap:4px;padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--green);font-family:"DM Sans",sans-serif;font-size:.83rem;font-weight:700;cursor:pointer}'+
'@media (max-width:768px){'+
'#ttab-browse .filters-bar .fjs-more{display:inline-flex}'+
'#ttab-browse .filters-bar:not(.fjs-open) .fjs-extra{display:none!important}'+
'}'+
'.fjs-flash{animation:fjsFlash 1.6s ease}'+
'@keyframes fjsFlash{0%,40%{box-shadow:0 0 0 4px var(--green-light)}100%{box-shadow:none}}';
document.head.appendChild(css);
function progressBox(){
var box=$('fjs-progress');
var tab=$('ttab-resume');
if(!tab)return null;
if(!box){
box=document.createElement('div');
box.id='fjs-progress';
box.innerHTML='<div class="fjs-title">📊 My Progress</div>';
}
var link=$('tw-link-card');
if(link&&link.parentNode===tab){if(link.nextSibling!==box)link.after(box);}
else if(box.parentNode!==tab)tab.insertBefore(box,tab.firstChild);
return box;
}
function addToProgress(el){
var box=progressBox();
if(!box|| !el)return;
var order=['teen-profile-completion','fjs-stats','teen-savings-banner'];
var key=el.id||(el.classList.contains('stats-row')?'fjs-stats':'');
if(key==='fjs-stats')el.dataset.fjs='stats';
var mine=order.indexOf(key);
var before=null;
[].slice.call(box.children).some(function(c){
var k=c.id||(c.dataset.fjs==='stats'?'fjs-stats':'');
if(order.indexOf(k)>mine){before=c;return true;}
return false;
});
box.insertBefore(el,before);
}
function moveGamePanel(el){
var tab=$('ttab-badges');
if(!tab|| !el)return;
var first=tab.firstElementChild;
if(first&& !first.classList.contains('panel')&&first!==el)first.after(el);
else tab.insertBefore(el,tab.firstChild);
}
function moveAiPicks(el){
var tab=$('ttab-ai');
if(!tab|| !el)return;
el.id=el.id||'fjs-ai-picks-panel';
var after=$('v18-ai-banner')||$('wage-coach-btn');
if(after&&after.parentNode===tab)after.after(el);
else tab.insertBefore(el,tab.firstChild);
}
function jobsPanel(){
var list=$('browse-jobs-list');
return list?list.closest('.panel'):null;
}
function openAiPicks(){
try{window.switchDashTab(null,'ttab-ai');}catch(e){}
setTimeout(function(){
var p=$('ai-match-panel'),panel=p&&p.closest('.panel');
if(!panel)return;
panel.scrollIntoView({behavior:'smooth',block:'start'});
panel.classList.remove('fjs-flash');void panel.offsetWidth;panel.classList.add('fjs-flash');
},150);
}
window.twOpenAiPicks=openAiPicks;
function addAiPicksButton(){
var panel=jobsPanel();
var head=panel&&panel.querySelector('.panel-head');
if(!head||$('fjs-ai-picks'))return;
var right=document.createElement('div');
right.className='fjs-head-right';
var badge=head.querySelector('.badge');
var btn=document.createElement('button');
btn.id='fjs-ai-picks';
btn.type='button';
btn.className='btn-sm btn-ai';
btn.textContent='🤖 AI picks';
btn.title='See jobs the AI picked for you (in AI Coach)';
btn.addEventListener('click',openAiPicks);
right.appendChild(btn);
if(badge)right.appendChild(badge);
head.appendChild(right);
}
function compactFilters(){
var panel=jobsPanel();
var bar=panel&&panel.querySelector('.filters-bar');
if(!bar||$('fjs-more-filters'))return;
['teen-filter-state','teen-filter-transport','teen-filter-radius','teen-filter-badge'].forEach(function(id){
var item=$(id);
while(item&&item.parentNode!==bar)item=item.parentNode;
if(item)item.classList.add('fjs-extra');
});
var btn=document.createElement('button');
btn.id='fjs-more-filters';
btn.type='button';
btn.className='fjs-more';
btn.setAttribute('aria-expanded','false');
btn.textContent='More filters ▾';
btn.addEventListener('click',function(){
var open=bar.classList.toggle('fjs-open');
btn.setAttribute('aria-expanded',String(open));
btn.textContent=open?'Fewer filters ▴':'More filters ▾';
});
bar.appendChild(btn);
}
var busy=false;
function tidy(){
var browse=$('ttab-browse');
if(!browse||busy)return;
busy=true;
try{
var keep=jobsPanel();
[].slice.call(browse.children).forEach(function(el){
if(el===keep)return;
if(el.id==='teen-profile-completion'||el.id==='teen-savings-banner'||el.classList.contains('stats-row'))addToProgress(el);
else if(el.id==='teen-game-panel')moveGamePanel(el);
else if(el.querySelector&&el.querySelector('#ai-match-panel'))moveAiPicks(el);
});
if($('fjs-progress'))progressBox();
addAiPicksButton();
compactFilters();
}finally{busy=false;}
}
window.twFindJobsTidy=tidy;
tidy();
var browse=$('ttab-browse');
if(browse&&window.MutationObserver)new MutationObserver(tidy).observe(browse,{childList:true});
var resume=$('ttab-resume');
if(resume&&window.MutationObserver)new MutationObserver(function(){
var box=$('fjs-progress'),link=$('tw-link-card');
if(box&&link&&link.parentNode===resume&&link.nextSibling!==box)progressBox();
}).observe(resume,{childList:true});
document.addEventListener('DOMContentLoaded',tidy);
window.addEventListener('load',tidy);
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/job-tiers-v45.js */
try{
(function(){
'use strict';
if(window.__twJobTiers45)return;
window.__twJobTiers45=true;
const HOME_JOBS_EXEMPT=false;
const FARM_TYPE='farm work';
function farmRule(){
const r=(window._twShiftFinder&&window._twShiftFinder.rules&&window._twShiftFinder.rules.FARM_RULE)||{};
const n=(v,d)=>(typeof v==='number'&&v>=0?v:d);
return{
minAge:n(r.minAge,12),
consentUnder:n(r.consentUnder,14),
outsideSchoolUnder:n(r.outsideSchoolUnder,16),
hazardUnder:n(r.hazardUnder,16),
weekMax:typeof r.weekMax==='number'&&r.weekMax>0?r.weekMax:null,
};
}
const FARM_STATE_FALLBACK={'Vermont':{under:16,dayMax:8,weekMax:40,cite:'21 V.S.A. § 437(b)'}};
function farmStateRule(state,age){
const R=window._twShiftFinder&&window._twShiftFinder.rules,name=stateName(state);
if(R&&typeof R.farmStateRule==='function'){try{return R.farmStateRule(name,age)||null;}catch(e){}}
const r=((R&&R.FARM_STATE)||FARM_STATE_FALLBACK)[name];
return r&&age<r.under?r:null;
}
const HAZARD_TYPES=['manufacturing','construction'];
const DOL_URL='https://www.dol.gov/agencies/whd/state/age-certificates';
const PERMITS={
'Alabama':[18],'Alaska':[17],'Arizona':[0],'Arkansas':[0],'California':[18],
'Colorado':[0,'school'],'Connecticut':[18],'Delaware':[18],'District of Columbia':[18],
'Florida':[0],'Georgia':[16],'Hawaii':[18],'Idaho':[0],'Illinois':[16],'Indiana':[0],
'Iowa':[16],'Kansas':[0],'Kentucky':[0],'Louisiana':[18],'Maine':[16],'Maryland':[18],
'Massachusetts':[18],'Michigan':[18],'Minnesota':[0,'school'],'Mississippi':[0],
'Missouri':[16],'Montana':[0],'Nebraska':[16],'Nevada':[14],'New Hampshire':[16],
'New Jersey':[18],'New Mexico':[17],'New York':[18],'North Carolina':[18],
'North Dakota':[16],'Ohio':[18],'Oklahoma':[16],'Oregon':[0,'employer'],
'Pennsylvania':[18],'Rhode Island':[18],'South Carolina':[0],'South Dakota':[0],
'Tennessee':[0],'Texas':[0],'Utah':[0],'Vermont':[0,'school'],'Virginia':[16],
'Washington':[18],'West Virginia':[16],'Wisconsin':[16],'Wyoming':[0],
};
const ABBR={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const me=()=>{try{if(typeof currentUser!=='undefined'&&currentUser)return currentUser;}catch(e){}return window.currentUser||null;};
const isDemoUser=u=> !!(u&&(u.isDemo|| /\.demo$/i.test(String(u.email||''))));
const isTester=u=>{try{return!!(window._twIsTesterUser&&window._twIsTesterUser(u));}catch(e){return false;}};
const isTeen=u=> !!(u&& !u.isAdmin&&u.type==='teen');
const toast=(m,t)=>{try{showToast(m,t||'info');}catch(e){}};
const later=(fn,ms)=>setTimeout(()=>{try{fn();}catch(e){console.warn('job-tiers:',e);}},ms||0);
const lower=s=>String(s||'').trim().toLowerCase();
const stateName=s=>{s=String(s||'').trim();if(!s)return'';if(ABBR[s.toUpperCase()])return ABBR[s.toUpperCase()];const k=Object.keys(PERMITS).find(n=>n.toLowerCase()===s.toLowerCase());return k||s;};
const stateData=()=>{try{return typeof STATE_DATA!=='undefined'?STATE_DATA:null;}catch(e){return null;}};
const jobsList=()=>{try{return typeof browsableJobs!=='undefined'?browsableJobs:[];}catch(e){return[];}};
const postedList=()=>{try{return typeof employerPostedJobs!=='undefined'?employerPostedJobs:[];}catch(e){return[];}};
function ageOfDob(dob){
if(!dob)return null;const b=new Date(/^\d{4}-\d\d-\d\d$/.test(dob)?dob+'T00:00':dob);if(isNaN(b))return null;
const t=new Date();let a=t.getFullYear()-b.getFullYear();
if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;
return a;
}
function teenAge(u){
u=u||me();
const a=ageOfDob(u&&u.dob);if(a!=null)return a;
try{if(typeof getTeenAge==='function')return getTeenAge();}catch(e){}
return(u&&u.age)||16;
}
function teenState(u){
u=u||me();
return stateName((u&&u.state)||(()=>{try{return typeof getTeenState==='function'?getTeenState():'';}catch(e){return'';}})());
}
const isFarmJob=j=> !!(j&&(j.farm===true||lower(j.type)===FARM_TYPE));
function permitNeeded(state,age){
const name=stateName(state);
const row=PERMITS[name];
const info=(stateData()||{})[name]||{};
const url=info.permitUrl||DOL_URL;
if(!row)return{needed:false,under:0,state:name,known:false,url,note:name?`TeenWork has no work permit rule on file for ${name}. Check with your state labor department.`:''};
const under=row[0],extra=row[1]||'';
const a=(age==null||isNaN(age))?16:Number(age);
const needed=under>0&&a<under;
let note;
if(under>=18)note=`${name} needs a work permit for every worker under 18. You usually get it from your school.`;
else if(under>0)note=`${name} needs a work permit for workers under ${under}${needed?'':`, so at ${a} you don't need one`}. You usually get it from your school.`;
else if(extra==='school')note=`${name} only needs a work permit for teens under 16 working during school hours, so after-school and weekend jobs don't need one.`;
else if(extra==='employer')note=`${name} doesn't give teens a work permit. The employer gets the certificate.`;
else note=`${name} doesn't need a work permit for teens.`;
return{needed,under,extra,state:name,known:true,url,note};
}
const PERMIT_SENTENCE= /permit|certificate|working papers|get it from|apply through|proof of age|child labor law poster|parental (consent|notification) recommended/i;
function fixStateData(){
const S=stateData();if(!S)return;
Object.keys(S).forEach(name=>{
const e=S[name],row=PERMITS[name];if(!e|| !row||e.__twjt)return;
const p=permitNeeded(name,13);
e.permitRequired=row[0]>0;
e.permitUnder=row[0];
e.permitNote=p.note;
if(!e.permitRequired)e.permitUrl=e.permitUrl||'';
const kept=String(e.notes||'').replace(/\.\s+/g,'.\u0000').split('\u0000').filter(s=>s&& !PERMIT_SENTENCE.test(s)).join(' ');
e.notes=(kept+' '+p.note).trim();
e.__twjt=true;
});
}
fixStateData();
function permitStatus(u){
u=u||me();
if(typeof window.twWorkPermitStatus==='function'){
try{const s=window.twWorkPermitStatus()||{};return{ok: !!s.ok,status:s.status||'none',state:s.state||'',source:'check'};}catch(e){}
}
let saved=null;try{saved=window._DB?_DB.load('work_permit',null):null;}catch(e){}
if(saved&&saved.status==='self-reported')return{ok:true,status:'self-reported',state:saved.state||'',source:'self'};
return{ok:false,status:'none',state:'',source:typeof window.twWorkPermitStatus==='function'?'check':'self'};
}
function consentStatus(u){
u=u||me();
if(!isTeen(u))return{ok:true,why:''};
if(isDemoUser(u))return{ok:true,why:'demo'};
if(isTester(u))return{ok:true,why:'tester'};
if(window._twParentConsent&&typeof window._twParentConsent.teenConsent==='function'){
let by=null;try{by=window._twParentConsent.teenConsent();}catch(e){}
return by?{ok:true,why:'consent'}:{ok:false,why:'consent'};
}
return document.body&&document.body.classList.contains('tw-limited')?{ok:false,why:'link'}:{ok:true,why:'link'};
}
function teenStatus(u){
u=u||me();
const c=consentStatus(u),p=permitStatus(u);
return{tier:p.ok&&c.ok?3:c.ok?2:1,consent:c,permit:p,age:teenAge(u),state:teenState(u)};
}
function tierOf(job,u){
u=u||me();
const state=stateName((job&&job.state)||teenState(u));
const p=permitNeeded(state,teenAge(u));
const homeSkip=HOME_JOBS_EXEMPT&&job&&job.homeJob&& !job.permit;
const permit= !!(job&&job.permit)||(p.needed&& !homeSkip);
return{tier:permit?3:2,permit,byEmployer: !!(job&&job.permit),rule:p};
}
function check(job,u){
u=u||me();
const out={ok:true,tier:2,blocks:[]};
if(!job|| !isTeen(u))return out;
const t=tierOf(job,u),age=teenAge(u),st=teenStatus(u);
out.tier=t.tier;out.rule=t.rule;
const minAge=Number(job.minAge)||0;
if(minAge&&age<minAge)out.blocks.push({kind:'age',msg:`This job is for ages ${minAge} and up, and you're ${age}.`});
if(HAZARD_TYPES.includes(lower(job.type)))out.blocks.push({kind:'hazard',msg:`${job.type} jobs aren't allowed for anyone under 18.`});
if(isFarmJob(job)){
const F=farmRule();
if(age<F.minAge)out.blocks.push({kind:'age',msg:`Farm jobs start at age ${F.minAge}.`});
else if(job.hazardFarm&&age<F.hazardUnder)out.blocks.push({kind:'age',msg:`This farm job uses tractors, power machinery or farm chemicals. The law only allows that from age ${F.hazardUnder}.`});
else{
const where=stateName(job.state||teenState(u)),fs=farmStateRule(where,age),hrs=Number(job.maxHours)||0;
if(fs&&fs.weekMax&&hrs>fs.weekMax)out.blocks.push({kind:'age',msg:`In ${where}, teens under ${fs.under} can work at most ${fs.weekMax} hours a week, farm work included. This job lists ${hrs}.`});
}
}
if(!st.consent.ok)out.blocks.push({kind:'consent',msg:st.consent.why==='link'?'Link a parent first. Every job is at least Tier 2, which needs a parent.':"Your linked parent has to agree first, from their own TeenWork account (My Teens → Review & agree). Every job is at least Tier 2."});
if(t.permit&& !st.permit.ok)out.blocks.push({kind:'permit',msg:t.byEmployer&& !t.rule.needed?'This employer asks every teen for a work permit.':t.rule.note,pending:st.permit.status==='needs_review'||st.permit.status==='rejected'?st.permit.status:''});
out.ok= !out.blocks.length;
return out;
}
function closeModal(){const m=$('twjt-modal');if(m)m.remove();}
window.twJobTiersClose=closeModal;
window.twJobTiersVerify=function(){closeModal();try{window.showVerifyPage&&window.showVerifyPage();}catch(e){}};
function explain(job,res){
closeModal();
const b=res.blocks[0];
const head={age:'🔒 Not old enough yet',hazard:'🚫 Not allowed for teens',consent:'👪 Parent consent needed',permit:'📋 Work permit needed'}[b.kind]||'🔒 Not yet';
const extra=b.kind==='permit'
?(b.pending==='needs_review'?'<p>Your permit is waiting for a TeenWork check. You can apply once it passes.</p>':b.pending==='rejected'?'<p>Your last permit photo didn\'t pass. Add a clearer photo on the Verification page.</p>':'<p>Add your permit on the Verification page (step 3) and you can apply.</p>')+
(res.rule&&res.rule.url?`<p><a href="${esc(res.rule.url)}" target="_blank" rel="noopener">How to get a permit in ${esc(res.rule.state||'your state')} →</a></p>`:'')
:'';
const btn=(b.kind==='permit'||b.kind==='consent')?'<button type="button" class="twjt-btn pri" onclick="twJobTiersVerify()">Open Verification</button>':'';
const m=document.createElement('div');m.id='twjt-modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
m.innerHTML=`<div class="twjt-sheet"><button type="button" class="twjt-x" aria-label="Close" onclick="twJobTiersClose()">✕</button>
      <h3>${head}</h3><p class="twjt-job">${esc(job.title||'This job')} · ${res.tier===3?'📋 Tier 3 · Work permit':'👪 Tier 2 · Parent OK'}</p>
      <p>${esc(b.msg)}</p>${extra}
      <div class="twjt-row">${btn}<button type="button" class="twjt-btn" onclick="twJobTiersClose()">OK</button></div></div>`;
m.addEventListener('mousedown',e=>{if(e.target===m)closeModal();});
document.body.appendChild(m);
}
function findJob(arg){
if(arg&&typeof arg==='object')return arg;
const id=arg;
return jobsList().find(j=>j&&String(j.id)===String(id))||postedList().find(j=>j&&String(j.id)===String(id))||null;
}
const gates={};
['teenApply','applyToJob'].forEach(name=>{
const o=window[name];
if(typeof o!=='function'||o.__twjt)return;
const w=function(jobArg){
const u=me();
if(!isTeen(u)||(document.body&&document.body.classList.contains('tw-limited')))return o.apply(this,arguments);
const job=findJob(jobArg);
if(job){const res=check(job,u);if(!res.ok){explain(job,res);return;}}
return o.apply(this,arguments);
};
w.__twjt=true;window[name]=w;gates[name]=w;
});
try{if(typeof TW_Verify!=='undefined'&&TW_Verify)TW_Verify.canApply=function(job){const r=check(job);return r.ok?{allowed:true,tier:r.tier}:{allowed:false,tier:r.tier,reason:r.blocks[0].msg};};}catch(e){}
const APPLY_RE= /(?:^|[^A-Za-z0-9_$])teenApply\(\s*'?([0-9A-Za-z_-]+)/;
let decorating=false;
function decorate(){
const list=$('browse-jobs-list');if(!list||decorating)return;
const u=me();if(!isTeen(u))return;
decorating=true;
try{
list.querySelectorAll('.browse-card').forEach(card=>{
const btn=card.querySelector('[onclick*="teenApply("]');
const m=btn?APPLY_RE.exec(btn.getAttribute('onclick')||''):null;
const job=m?findJob(m[1]):null;
if(!job)return;
const res=check(job,u);
const meta=card.querySelector('.job-meta');
let tag=card.querySelector('.twjt-tag');
if(meta&& !tag){tag=document.createElement('span');meta.insertBefore(tag,meta.firstChild);}
if(tag){
tag.className='tag twjt-tag '+(res.tier===3?'t3':'t2');
const tierText=res.tier===3?'📋 Tier 3 · Work permit':'👪 Tier 2 · Parent OK';
if(tag.textContent!==tierText)tag.textContent=tierText;
tag.title=res.tier===3?(job.permit&& !(res.rule&&res.rule.needed)?'The employer asks for a work permit.':(res.rule&&res.rule.note)||''):'Needs a parent\'s OK.';
}
if(isFarmJob(job)&&meta&& !card.querySelector('.twjt-farm')){const f=document.createElement('span');f.className='tag twjt-farm';f.textContent='🚜 Farm';meta.appendChild(f);}
if(!btn.dataset.twjtLabel)btn.dataset.twjtLabel=btn.textContent;
const b=res.blocks[0];
const label= !b?btn.dataset.twjtLabel:b.kind==='permit'?'🔒 Needs work permit':b.kind==='consent'?'🔒 Needs parent consent':'🔒 Not available';
if(btn.textContent!==label)btn.textContent=label;
btn.classList.toggle('twjt-locked',!!b);
});
}finally{decorating=false;}
}
const _oRender=window.renderBrowseJobs;
if(typeof _oRender==='function'&& !_oRender.__twjt){
const w=function(){const r=_oRender.apply(this,arguments);try{decorate();}catch(e){}return r;};
w.__twjt=true;window.renderBrowseJobs=w;
}
let obs=null;
function watchList(){
const list=$('browse-jobs-list');if(!list||obs)return;
let t=0;
obs=new MutationObserver(()=>{if(decorating)return;clearTimeout(t);t=setTimeout(()=>{try{decorate();}catch(e){}},30);});
obs.observe(list,{childList:true,subtree:true});
}
window.showPermitBanner=function(state){
const banner=$('teen-permit-banner');if(!banner)return;
const u=me(),name=stateName(state);
if(!PERMITS[name]){banner.classList.remove('show');return;}
const p=permitNeeded(name,isTeen(u)?teenAge(u):13),info=(stateData()||{})[name]||{};
banner.classList.add('show');
if(p.needed){
const have=isTeen(u)&&permitStatus(u).ok;
banner.innerHTML=`<strong>📋 ${have?'Your work permit is on file':'Work permit needed in '+esc(name)}</strong> ${esc(p.note)} ${have?'':'Jobs there are Tier 3 until you add one on the Verification page.'}${info.permitUrl?` <a href="${esc(info.permitUrl)}" target="_blank" rel="noopener">Learn more →</a>`:''}`;
banner.style.background='';banner.style.borderColor='';banner.style.color='';
}else{
banner.innerHTML=`<strong>✅ No work permit needed${isTeen(u)?' at '+esc(String(teenAge(u))):''} in ${esc(name)}</strong> ${esc(p.note)}`;
banner.style.background='var(--green-pale)';banner.style.borderColor='var(--green-light)';banner.style.color='var(--green)';
}
};
window.checkSignupStatePermit=function(){
const state=($('su-state')||{}).value||'',note=$('su-permit-note');
if(!note|| !state)return;
const age=ageOfDob(($('su-age')||{}).value);
const p=permitNeeded(state,age==null?13:age);
note.style.display='block';
if(p.needed){note.style.background='';note.style.color='';note.style.borderColor='';note.textContent='⚠️ '+p.note+' You will need it before applying to jobs there.';}
else{note.style.background='var(--green-pale)';note.style.color='var(--green)';note.style.borderColor='var(--green-light)';note.textContent='✅ '+p.note;}
};
function addFarmOption(sel,label){
if(!sel||[...sel.options].some(o=>lower(o.value)===FARM_TYPE))return;
const o=document.createElement('option');o.value=FARM_TYPE;o.textContent=label||'Farm Work';
const other=[...sel.options].find(x=>lower(x.value)==='other');
sel.insertBefore(o,other||null);
}
function empNote(){
const n=$('twjt-emp-note');if(!n)return;
const state=($('emp-state')||{}).value||'',type=lower(($('emp-type')||{}).value),ask=($('twjt-emp-permit')||{}).checked;
const F=farmRule(),farm=type===FARM_TYPE,hz=farm&& !!($('twjt-emp-hazard')||{}).checked;
const minEl=$('emp-min-age');if(minEl)minEl.min=farm?String(hz?F.hazardUnder:F.minAge):'13';
const hzRow=$('twjt-emp-hazard-row');if(hzRow)hzRow.style.display=farm?'flex':'none';
let t='';
if(state&&PERMITS[stateName(state)]){
const p13=permitNeeded(state,13),p17=permitNeeded(state,17);
t=p17.needed?`${stateName(state)} needs a work permit for every teen, so this job is Tier 3 (📋 work permit).`
:p13.needed?`${stateName(state)} needs a work permit for teens under ${p13.under}. For them this job is Tier 3; older teens see Tier 2.`
:ask?'Tier 3: you ask every teen for a work permit.':`${stateName(state)} doesn't need a teen work permit for this, so the job is Tier 2 (👪 parent OK).`;
}else t=ask?'Tier 3: you ask every teen for a work permit.':'Pick a state to see whether teens need a work permit.';
if(farm)t+=` Farm jobs (federal law): age ${F.minAge}+, with a parent's OK under ${F.consentUnder}; under ${F.outsideSchoolUnder} only outside school hours; ${F.weekMax?`up to ${F.weekMax} h a week`:'no weekly hour limit'}; tractors, machinery and farm chemicals ${F.hazardUnder}+.`;
const fs=farm?farmStateRule(state,0):null;
if(farm)t+=fs?` ${stateName(state)} also limits teens under ${fs.under} to ${fs.dayMax} h a day and ${fs.weekMax} h a week (${fs.cite}).`:` ${stateName(state)||'Your state'} may be stricter.`;
n.textContent=t;
}
function buildEmpForm(){
addFarmOption($('emp-type'));
const minEl=$('emp-min-age');if(!minEl||$('twjt-emp-row'))return;
const row=minEl.closest('.form-row')||minEl.parentNode;
const div=document.createElement('div');div.id='twjt-emp-row';div.className='form-group';
div.innerHTML=`<label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-weight:600;cursor:pointer"><input type="checkbox" id="twjt-emp-permit" style="width:16px;height:16px"> 📋 Always ask for a work permit (Tier 3)</label>`+
(HOME_JOBS_EXEMPT?`<label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-weight:600;cursor:pointer;margin-top:6px"><input type="checkbox" id="twjt-emp-home" style="width:16px;height:16px"> 🏠 Odd job at my home (babysitting, yard work) — no permit needed</label>`:'')+
`<label id="twjt-emp-hazard-row" style="display:none;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-weight:600;cursor:pointer;margin-top:6px"><input type="checkbox" id="twjt-emp-hazard" style="width:16px;height:16px"> 🚜 Uses tractors, power machinery or farm chemicals (16+)</label>`+
`<div id="twjt-emp-note" class="twjt-emp-note"></div>`;
row.parentNode.insertBefore(div,row.nextSibling);
['emp-state','emp-type','twjt-emp-permit','twjt-emp-hazard','emp-min-age'].forEach(id=>{const el=$(id);if(el){el.addEventListener('change',empNote);el.addEventListener('input',empNote);}});
empNote();
}
let posting=false;
function installPost(){
const _oPost=window.postJob;
if(typeof _oPost!=='function'||_oPost.__twjt)return;
const w=async function(){
if(posting)return _oPost.apply(this,arguments);
posting=true;
try{
const minEl=$('emp-min-age'),hrsEl=$('emp-max-hours');
const ask= !!($('twjt-emp-permit')||{}).checked,home= !!($('twjt-emp-home')||{}).checked;
const farm=lower(($('emp-type')||{}).value)===FARM_TYPE;
const hazardFarm=farm&& !!($('twjt-emp-hazard')||{}).checked;
const F=farmRule();
const typedMin=minEl&&minEl.value!==''?parseInt(minEl.value,10):null;
const typedHrs=hrsEl&&hrsEl.value!==''?parseInt(hrsEl.value,10):null;
if(farm){
if(typedMin!=null&&typedMin<F.minAge){try{showAlert('emp-post-alert',`Farm jobs start at age ${F.minAge} under federal law.`,'error');}catch(e){}return;}
if(F.weekMax&&typedHrs!=null&&typedHrs>F.weekMax){try{showAlert('emp-post-alert',`Farm jobs can be at most ${F.weekMax} hours a week.`,'error');}catch(e){}return;}
if(typedMin!=null&&typedMin<14)minEl.value='14';
if(typedHrs!=null&&typedHrs>40)hrsEl.value='40';
}
const before=new Set(postedList().map(j=>j&&j.id));
let r;
try{r=await _oPost.apply(this,arguments);}
finally{
const added=postedList().filter(j=>j&& !before.has(j.id));
added.forEach(j=>{
const patch={};
if(ask)patch.permit=true;
if(home)patch.homeJob=true;
if(farm){
patch.farm=true;
if(typedMin!=null)patch.minAge=typedMin;
if(typedHrs!=null)patch.maxHours=typedHrs;
if(hazardFarm){patch.hazardFarm=true;patch.minAge=Math.max(typedMin||0,F.hazardUnder);}
}
Object.assign(j,patch);
jobsList().forEach(b=>{if(b&&b.id===j.id)Object.assign(b,patch);});
});
if(added.length){
const c=$('twjt-emp-permit');if(c)c.checked=false;
const h=$('twjt-emp-home');if(h)h.checked=false;
const hz=$('twjt-emp-hazard');if(hz)hz.checked=false;
empNote();
try{window.renderBrowseJobs&&window.renderBrowseJobs();}catch(e){}
}else if(farm){
if(minEl&&typedMin!=null)minEl.value=String(typedMin);
if(hrsEl&&typedHrs!=null)hrsEl.value=String(typedHrs);
}
}
return r;
}finally{posting=false;}
};
w.__twjt=true;window.postJob=w;
}
installPost();
const lateInstall=()=>[0,400,1800,4000].forEach(ms=>later(installPost,ms));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',lateInstall);else lateInstall();
function fillStates(){
const sel=$('tw-ver-state');if(!sel||sel.dataset.twjt)return;
const cur=stateName(sel.value);
sel.innerHTML=Object.keys(PERMITS).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
sel.value=PERMITS[cur]?cur:'Vermont';
sel.dataset.twjt='1';
addFarmOption($('tw-ver-job-type-check'),'Farm Work');
}
function drawStep3(){
const u=me(),body=$('tw-ver-body-3');if(!body|| !isTeen(u))return;
fillStates();
const sel=$('tw-ver-state'),ageEl=$('tw-ver-age');
if(sel&& !sel.dataset.twjtSet){const s=teenState(u);if(PERMITS[s])sel.value=s;sel.dataset.twjtSet='1';}
if(ageEl&& !ageEl.dataset.twjtSet&& !isDemoUser(u)){ageEl.value=String(teenAge(u));ageEl.dataset.twjtSet='1';}
let n=$('twjt-step3-note');
if(!n){n=document.createElement('div');n.id='twjt-step3-note';n.className='twjt-step3';body.insertBefore(n,body.firstChild);}
const p=permitNeeded(teenState(u),teenAge(u)),st=permitStatus(u);
const html=st.ok
?`✅ <b>Work permit ${st.status==='self-reported'?'added':st.status==='needs_review'?'pre-checked':'on file'}.</b> Tier 3 jobs are open to you.`
:p.needed?`📋 <b>You need a work permit.</b> ${esc(p.note)} Jobs in ${esc(p.state)} are Tier 3 until you add it here.`
:`✅ <b>No work permit needed.</b> ${esc(p.note)} You only need one for jobs in a permit state or when an employer asks.`;
if(n.innerHTML!==html)n.innerHTML=html;
}
try{
if(typeof TW_Verify!=='undefined'&&TW_Verify){
const V=TW_Verify;
const oCheck=V.runComplianceCheck;
V.runComplianceCheck=async function(){
fillStates();
const age=parseInt(($('tw-ver-age')||{}).value,10)||teenAge();
const state=stateName(($('tw-ver-state')||{}).value)||teenState();
const jtype=($('tw-ver-job-type-check')||{}).value||'Yard Work';
const rules=(typeof getStateRules==='function'?getStateRules(state):null)||{};
const p=permitNeeded(state,age);
const farm=lower(jtype)===FARM_TYPE,hazard=HAZARD_TYPES.includes(lower(jtype));
const F=farmRule(),minAge=farm?F.minAge:14;
const grid=$('tw-ver-law-grid'),results=$('tw-ver-law-results'),aiBox=$('tw-ver-law-ai');
if(grid)grid.innerHTML=[
{label:'Minimum Age',val:`${minAge}+${farm?` for farm work${age<F.consentUnder?', with a parent\'s OK':''}`:''} · Age ${age}`,ok:age>=minAge},
farm
?{label:'Farm Hours',val:(fsr=>fsr?`Up to ${fsr.weekMax} h/week, ${fsr.dayMax} h/day in ${esc(state)}`:F.weekMax?`Up to ${F.weekMax} h/week`:'No federal weekly limit')(farmStateRule(state,age))+(age<F.outsideSchoolUnder?' · outside school hours':''),ok:true}
:{label:'School-Week Hrs',val:age<16?`Max ${rules.schoolWeekMax||18} h/week`:'Set by your state for 16–17',ok:true},
farm
?{label:'Farm Machinery',val:age>=F.hazardUnder?`✓ Allowed at ${age}`:`Not until ${F.hazardUnder} (tractors, power machinery, farm chemicals)`,ok:true}
:{label:'Summer Max',val:`${rules.summerMax||40} h/week in ${esc(state)}`,ok:true},
{label:'Permit Needed',val:p.needed?`Yes — ${esc(state)}, under ${p.under}`:`No — ${esc(state)} at ${age}`,ok: !p.needed||permitStatus().ok},
{label:'Job Type',val:hazard?'⚠️ Hazardous — not allowed under 18':'✓ Allowed for age '+age,ok: !hazard},
{label:'Job Tier',val:p.needed?'📋 Tier 3 · Work permit':'👪 Tier 2 · Parent OK',ok:true},
].map(r=>`<div class="tw-ver-law-pill ${r.ok?'ok':'warn'}"><div class="tw-ver-pill-label">${r.label}</div><div class="tw-ver-pill-val">${r.val}</div></div>`).join('');
if(results)results.style.display='block';
if(aiBox){aiBox.textContent=p.note;aiBox.classList.add('show');}
try{
const text=await callClaudeAI(`You are a teen labor law assistant. A ${age}-year-old in ${state} wants to work in ${jtype}. TeenWork's rule: ${p.note}${farm?` Federal farm rule: from age ${F.minAge} (ages ${F.minAge}–${F.consentUnder-1} need a parent's written OK), under ${F.outsideSchoolUnder} only outside school hours, ${F.weekMax?`up to ${F.weekMax} hours a week`:'no federal weekly hour limit'}, tractors, power machinery and farm chemicals only from ${F.hazardUnder}. ${(fsr=>fsr?`${state} also limits teens under ${fsr.under} to ${fsr.dayMax} hours a day and ${fsr.weekMax} a week, farm work included (${fsr.cite}).`:`Say that ${state} may have stricter farm rules.`)(farmStateRule(state,age))}`:''} In 3 friendly sentences: (1) whether this job is allowed, (2) key hour limits, (3) whether a work permit is needed and how to get one in ${state}. Do not contradict TeenWork's permit rule.`);
if(aiBox&&text)aiBox.textContent=text;
}catch(e){}
drawStep3();
};
V.__twjtOrigCheck=oCheck;
const oSubmit=V.submitPermit;
V.submitPermit=function(){
const u=me();
if(typeof window.twWorkPermitStatus!=='function'&&isTeen(u)&& !isDemoUser(u)){
try{_DB.save('work_permit',{status:'self-reported',state:stateName(($('tw-ver-state')||{}).value)||teenState(u),savedAt:new Date().toISOString()});}catch(e){}
}
const r=oSubmit.apply(this,arguments);
later(()=>{drawStep3();refresh();},0);
return r;
};
const withPermit=fn=>function(){
let b=[];try{b=(fn.apply(V,arguments)||[]).slice();}catch(e){}
const u=me();
if(isTeen(u)&& !isDemoUser(u)){b=b.filter(x=>x!=='workPermit');if(permitStatus(u).ok)b.push('workPermit');}
return b;
};
if(typeof V.getBadges==='function')V.getBadges=withPermit(V.getBadges);
if(typeof V.__tw44cBadges==='function')V.__tw44cBadges=withPermit(V.__tw44cBadges);
}
}catch(e){console.warn('job-tiers verify:',e);}
function refresh(){
try{const pg=$('page-verify');if(pg&&pg.classList.contains('active'))drawStep3();}catch(e){}
try{const list=$('browse-jobs-list');if(list&&list.children.length)decorate();}catch(e){}
try{const sel=$('teen-filter-state');const u=me();if(isTeen(u)&&$('teen-permit-banner'))window.showPermitBanner((sel&&sel.value)||teenState(u));}catch(e){}
}
window.twJobTiersRefresh=refresh;
const _oShow=window.showVerifyPage;
if(typeof _oShow==='function')window.showVerifyPage=function(){const r=_oShow.apply(this,arguments);[60,250,700].forEach(ms=>later(drawStep3,ms));return r;};
const _oLaunch=window.launchDashboard;
if(typeof _oLaunch==='function')window.launchDashboard=function(){
const r=_oLaunch.apply(this,arguments);
[0,400,1500].forEach(ms=>later(()=>{addFarmOption($('teen-job-filter'));buildEmpForm();watchList();installPost();refresh();},ms));
return r;
};
later(()=>{addFarmOption($('teen-job-filter'));buildEmpForm();watchList();},0);
setInterval(()=>{try{const u=me();if(isTeen(u)&&$('browse-jobs-list')&&$('browse-jobs-list').offsetParent)decorate();}catch(e){}},15000);
const css=document.createElement('style');css.id='job-tiers-v45-css';
css.textContent=
'.twjt-tag.t2{background:var(--green-pale,#e8f5ee);color:var(--green,#2d6a4f);border:none;font-weight:700}'+
'.twjt-tag.t3{background:var(--blue-pale,#e8f0fb);color:var(--blue,#1a5276);border:none;font-weight:700}'+
'.twjt-farm{background:var(--amber-pale,#fdf3e1);color:var(--amber,#b9770e);border:none}'+
'.btn-apply.twjt-locked{background:var(--border,#ddd)!important;color:var(--muted,#555)!important;border-color:var(--border,#ddd)!important}'+
'.twjt-emp-note{font-size:.8rem;color:var(--muted,#667);margin-top:6px;line-height:1.5}'+
'.twjt-step3{margin-top:.9rem;padding:.7rem .9rem;border-radius:10px;background:var(--green-pale,#e8f5ee);font-size:.84rem;line-height:1.5}'+
'#twjt-modal{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px}'+
'#twjt-modal .twjt-sheet{position:relative;background:var(--card,#fff);color:var(--text,#1b1b1b);border-radius:16px;padding:1.4rem 1.3rem 1.1rem;max-width:400px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.25);font-size:.9rem;line-height:1.55}'+
'#twjt-modal h3{font-family:"Fraunces",serif;font-size:1.15rem;margin:0 0 .3rem}'+
'#twjt-modal .twjt-job{font-size:.78rem;color:var(--muted,#667);margin:0 0 .6rem}'+
'#twjt-modal p{margin:0 0 .6rem}'+
'#twjt-modal .twjt-x{position:absolute;top:8px;right:10px;border:none;background:none;font-size:1.1rem;cursor:pointer;color:var(--muted,#667)}'+
'#twjt-modal .twjt-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:.4rem}'+
'.twjt-btn{border:1.5px solid var(--border,#ddd);background:var(--card,#fff);color:inherit;border-radius:9px;padding:7px 14px;font-weight:700;cursor:pointer;font-family:inherit}'+
'.twjt-btn.pri{background:var(--green,#2d6a4f);border-color:var(--green,#2d6a4f);color:#fff}';
document.head.appendChild(css);
window.twPermitNeeded=permitNeeded;
window.twJobTiers={permitNeeded,check,teenStatus,tierOf,permitStatus,consentStatus,refresh,decorate,gates,PERMITS,farmRule,farmStateRule,get FARM(){return farmRule();},HOME_JOBS_EXEMPT};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/tester-accounts-v44.js */
try{
(function(){
'use strict';
if(window.__twTester44)return;
window.__twTester44=true;
const TESTER_INBOXES=['ayaquarrierdraper@gmail.com','ayaqdteenwork@gmail.com'];
const ROLES=['teen','parent','employer'];
const me=()=>window.currentUser||(typeof currentUser!=='undefined'?currentUser:null);
function inboxOf(email){
let e=String(email||'').trim().toLowerCase().split('#')[0];
const at=e.lastIndexOf('@');
if(at<1)return'';
let local=e.slice(0,at),dom=e.slice(at+1);
if(dom==='gmail.com'||dom==='googlemail.com'){local=local.split('+')[0].replace(/\./g,'');dom='gmail.com';}
return local+'@'+dom;
}
const TESTERS=TESTER_INBOXES.map(inboxOf);
const isTesterEmail=email=>{const i=inboxOf(email);return!!i&&TESTERS.includes(i);};
const isTesterUser=u=> !!(u&& !u.isAdmin&& !u.isDemo&&ROLES.includes(u.type)&&isTesterEmail(u.email));
window._twIsTesterEmail=isTesterEmail;
window._twIsTesterUser=isTesterUser;
const _oMulti=window._twEmailAllowsMultiple;
if(typeof _oMulti==='function')window._twEmailAllowsMultiple=function(email){return isTesterEmail(email)||_oMulti.apply(this,arguments);};
const _oCloudSignUp=window._twCloudSignUp;
if(typeof _oCloudSignUp==='function')window._twCloudSignUp=async function(email){
const r=await _oCloudSignUp.apply(this,arguments);
if(r&&r.status==='local'&&r.why==='not-in-cloud'&&isTesterEmail(email)){
const mine=(typeof window._twAccountsForEmail==='function'?window._twAccountsForEmail(email):[]).filter(a=>a.hash);
if(mine.length&&mine.every(a=>a.cloud))return{status:'exists',why:'password'};
}
return r;
};
function linkStatus(u){
let l=null;
try{l=(JSON.parse(localStorage.getItem('tw_parent_links')||'{}')||{})[String(u.email||'').toLowerCase()]||null;}catch(e){}
return((l||u.parentLinked||{}).status)||'none';
}
const testerTeenWithoutParent=()=>{const u=me();return isTesterUser(u)&&u.type==='teen'&&linkStatus(u)!=='approved';};
function wrapApply(){
const o=window.teenApply;
if(typeof o!=='function'||o.__tw44)return;
const w=function(){
if(!testerTeenWithoutParent())return o.apply(this,arguments);
let list=null;try{list=demoJobs;}catch(e){}
const before=Array.isArray(list)?list.slice():null;
const _toast=window.showToast;
if(typeof _toast==='function')window.showToast=function(msg){
const a=[].slice.call(arguments);
if(/parent/i.test(String(msg))&& /review|approv/i.test(String(msg)))a[0]='✅ Application sent to the employer. Tester account, so no parent approval is needed.';
return _toast.apply(this,a);
};
let r;
try{r=o.apply(this,arguments);}finally{if(typeof _toast==='function')window.showToast=_toast;}
if(before){
let n=0;
list.forEach(j=>{if(j&&before.indexOf(j)<0&&j.status==='pending-approval'){j.status='applied';j.parentApproved=true;j.testerNoParent=true;n++;}});
if(n)['renderTeenApplications','renderAllApplications','renderBrowseJobs'].forEach(f=>{try{if(typeof window[f]==='function')window[f]();}catch(e){}});
}
return r;
};
w.__tw44=true;
window.teenApply=w;
}
wrapApply();
const st=document.createElement('style');
st.id='tw44-tester-style';
st.textContent=
'.tw44-pill{display:inline-flex;align-items:center;gap:4px;margin-left:10px;vertical-align:middle;background:#ede9fe;color:#5b21b6;border:1.5px solid #c4b5fd;border-radius:999px;padding:2px 10px;font-family:"DM Sans",sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.02em;white-space:nowrap}'+
'.tw44-note{background:#ede9fe;color:#4c1d95;border-radius:10px;padding:9px 12px;font-size:.84rem;line-height:1.5;margin:0 0 10px}'+
'html.dark .tw44-pill{background:#2e1065;color:#ddd6fe;border-color:#6d28d9}'+
'html.dark .tw44-note{background:#2e1065;color:#ddd6fe}'+
'#tw-acct-chooser > div{max-height:calc(100vh - 2.4rem);max-height:calc(100dvh - 2.4rem);overflow-y:auto}';
document.head.appendChild(st);
function decorate(){
const u=me(),tester=isTesterUser(u);
document.querySelectorAll('.tw44-pill').forEach(p=>{if(!tester|| !p.closest('#page-'+u.type))p.remove();});
if(!tester){document.querySelectorAll('.tw44-note').forEach(n=>n.remove());return;}
const h1=document.querySelector('#page-'+u.type+' .dash-header h1');
if(h1&& !h1.querySelector('.tw44-pill')){
const p=document.createElement('span');
p.className='tw44-pill';
p.title='Tester account: as many as you like on this email, and no parent link needed.';
p.textContent='🧪 Tester';
h1.appendChild(p);
}
const card=u.type==='teen'?document.getElementById('tw-link-card'):null;
if(card&& !card.querySelector('.tw44-note')){
const n=document.createElement('div');
n.className='tw44-note';
n.textContent="🧪 Tester account: you don't need a parent link. You can still link one here to test it.";
const h3=card.querySelector('h3');
if(h3&&h3.nextSibling)card.insertBefore(n,h3.nextSibling);else card.appendChild(n);
}
}
const _oLaunch=window.launchDashboard;
if(typeof _oLaunch==='function')window.launchDashboard=function(){
const r=_oLaunch.apply(this,arguments);
[0,120,800,1800].forEach(ms=>setTimeout(()=>{try{decorate();}catch(e){}},ms));
return r;
};
setInterval(()=>{try{decorate();}catch(e){}},1500);
window._twTester={inboxOf,isTesterEmail,isTesterUser,inboxes:TESTER_INBOXES.slice()};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/first-job-checklist-v44.js */
try{
(function(){
'use strict';
if(window.__twFirstJobV44)return;
window.__twFirstJobV44=true;
const ID='ttab-firstjob';
const isOn=cls=> /(^|\s)active(\s|$)/.test(cls||'');
function draw(){
const panel=document.getElementById(ID);
if(!panel|| !panel.classList.contains('active'))return;
try{if(typeof window.renderFirstJobChecklist==='function')window.renderFirstJobChecklist();}
catch(e){console.warn('first-job-checklist-v44',e);}
}
function start(){
const panel=document.getElementById(ID);
if(!panel)return;
let queued=false;
new MutationObserver(records=>{
if(queued|| !panel.classList.contains('active'))return;
if(records.some(r=> !isOn(r.oldValue))){queued=true;setTimeout(()=>{queued=false;draw();},0);}
}).observe(panel,{attributes:true,attributeFilter:['class'],attributeOldValue:true});
draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
else start();
const _oSync=window._syncUserData;
if(typeof _oSync==='function'){
window._syncUserData=async function(){
const r=await _oSync.apply(this,arguments);
draw();
return r;
};
}
window._twFirstJob={draw};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/calendar-first-open-v44.js */
try{
(function(){
'use strict';
if(window.__twCalFirstOpenV44)return;
window.__twCalFirstOpenV44=true;
const isReal=()=>{try{return!!(window._twRealData&&window._twRealData.isReal());}catch(e){return false;}};
const call=(name,...args)=>{const f=window[name];if(typeof f==='function')f.apply(window,args);};
const me=()=>String((window.currentUser||{}).email||'');
const empty=(id,text)=>{const el=document.getElementById(id);if(el)el.innerHTML='<p style="color:var(--muted);font-size:.85rem;font-style:italic">'+text+'</p>';};
const noneYet=list=>{try{return!list|| !list.length;}catch(e){return true;}};
let skillReportFor=null;
const DRAW={
'ttab-calendar':()=>call('calRender'),
'ttab-applications':()=>call('renderWeeklyDigest'),
'ttab-earnings':()=>{
if(isReal()&&noneYet(typeof earningsLog!=='undefined'?earningsLog:null))return empty('earnings-log','No earnings logged yet. Add a job below after you get paid.');
call('renderEarningsTracker');
},
'ttab-resume':()=>{if(window._twTabRefresh)return call('renderSkillReport',{auto:true});if(skillReportFor===me())return;skillReportFor=me();call('renderSkillReport');},
'ttab-portfolio':()=>call('renderPortfolioTab'),
'ttab-savings':()=>call('renderSavingsTab'),
'ttab-worklog':()=>call('renderWorkLogTab'),
'ttab-references':()=>call('renderTeenReferencesTab'),
'ttab-firstjob':()=>call('renderFirstJobChecklist'),
'ttab-leaderboard':()=>{if(!isReal())call('renderLeaderboard');},
'ptab-savings':()=>{
if(isReal()&&noneYet(typeof savingsGoals!=='undefined'?savingsGoals:null))return empty('savings-goals-list','No savings goals yet.');
call('renderSavingsGoals');
},
'ptab-trusted':()=>call('renderTrustedEmployers'),
'ptab-teens':()=>call('renderMultiTeens'),
'etab-schedule':()=>{
call('renderEmpSchedGrid');
if(!isReal())call('_empScanAllMsgsForEdits');
},
'etab-reviews':()=>{call('renderEmpReviewsTab');call('renderEndorsementChips');},
'etab-analytics':()=>call('renderEmpAnalytics'),
'etab-profile':()=>call('renderEmpProfileReviews'),
'etab-bulkmsg':()=>call('empBulkFilter','all'),
};
const _oWorkLog=window.renderWorkLogTab;
if(typeof _oWorkLog==='function'&& !_oWorkLog.__twEmptyNote){
window.renderWorkLogTab=function(){
const r=_oWorkLog.apply(this,arguments);
const count=document.getElementById('worklog-session-count');
if(count&& /^0 sessions$/.test(count.textContent.trim()))empty('worklog-sessions-list','No hours logged yet — use the button above to start tracking.');
return r;
};
window.renderWorkLogTab.__twEmptyNote=true;
}
const isOn=cls=> /(^|\s)active(\s|$)/.test(cls||'');
function watch(id){
const panel=document.getElementById(id);
if(!panel)return false;
let queued=false;
const draw=()=>{
queued=false;
if(!panel.classList.contains('active'))return;
try{DRAW[id]();}catch(e){console.warn('calendar-first-open-v44: '+id,e);}
};
new MutationObserver(records=>{
if(queued|| !panel.classList.contains('active'))return;
if(records.some(r=> !isOn(r.oldValue))){queued=true;setTimeout(draw,0);}
}).observe(panel,{attributes:true,attributeFilter:['class'],attributeOldValue:true});
if(panel.classList.contains('active'))draw();
return true;
}
function start(){Object.keys(DRAW).forEach(watch);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
else start();
window._twCalFirstOpen={sections:Object.keys(DRAW),draw:id=>DRAW[id]&&DRAW[id]()};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/tab-refresh-v44.js */
try{
(function(){
'use strict';
if(window.__twTabRefreshV44)return;
window.__twTabRefreshV44=true;
if(!('_state'in window))window._state=undefined;
const HOOKS={
'ttab-calendar':[['calRender',60],['renderCalEarningsBar',120]],
'ttab-letters':[['renderTeenLettersPanel',80]],
'ttab-applications':[['renderWeeklyDigest',100]],
'ttab-earnings':[['renderEarningsTracker',100]],
'ttab-resume':[['renderSkillReport',150,{auto:true}]],
'ttab-portfolio':[['renderPortfolioTab',80]],
'ttab-badges':[['renderBadgesTab',80]],
'ttab-savings':[['renderSavingsTab',80]],
'ttab-tracker':[['renderTrackerTab',80]],
'ttab-worklog':[['renderWorkLogTab',80]],
'ttab-references':[['renderTeenReferencesTab',80]],
'ttab-firstjob':[['renderFirstJobChecklist',80]],
'ttab-leaderboard':[['renderLeaderboard',80]],
'ptab-savings':[['renderSavingsGoals',100]],
'ptab-trusted':[['renderTrustedEmployers',100]],
'ptab-teens':[['renderMultiTeens',100]],
'etab-reviews':[['renderEmpReviewsTab',80],['renderEndorsementChips',100]],
'etab-letters':[['renderEmpLetterList',80],['renderEmpStatsDashboard',100]],
'etab-schedule':[['renderEmpSchedGrid',80],['_empScanAllMsgsForEdits',80]],
'etab-applicants':[['renderEmpKanban',80]],
'etab-analytics':[['renderEmpAnalytics',80]],
'etab-profile':[['renderEmpProfileReviews',80]],
'etab-bulkmsg':[['empBulkFilter',80,'all']],
};
function runHooks(panelId){
(HOOKS[panelId]||[]).forEach(([name,ms,arg])=>setTimeout(()=>{
const fn=window[name];
if(typeof fn!=='function')return;
try{
const r=arg===undefined?fn():fn(arg);
if(r&&typeof r.catch==='function')r.catch(e=>console.warn('tab-refresh: '+name,e));
}catch(e){console.warn('tab-refresh: '+name,e);}
},ms));
}
const _oSwitch=window.switchDashTab;
window.switchDashTab=function(btn,panelId){
const r=typeof _oSwitch==='function'?_oSwitch.apply(this,arguments):undefined;
const drawnElsewhere=id=>{try{const c=window._twCalFirstOpen;return!!(c&&Array.isArray(c.sections)&&c.sections.includes(id));}catch(e){return false;}};
try{if(HOOKS[panelId]&& !drawnElsewhere(panelId))runHooks(panelId);}catch(e){}
return r;
};
const ROLES=['teen','parent','employer'];
const me=()=>window.currentUser||(typeof currentUser!=='undefined'?currentUser:null);
const isDemoUser=u=> !!(u&&(u.isDemo|| /\.demo$/i.test(String(u.email||''))));
const isReal=u=> !!(u&& !isDemoUser(u)&& !u.isAdmin&&ROLES.includes(u.type)&& /@/.test(String(u.email||'')));
const acctKey=u=>String((u&&(u.dataKey||u.email))||'guest').toLowerCase();
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const readJSON=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}};
const AI_WAIT_MS=20000;
const TASKS={'yard work':'Yard Work','pet care':'Pet Care',cleaning:'Cleaning',babysitting:'Babysitting','tech help':'Tech Help',other:'Other'};
const RELATED={
'lawn care':['yard','garden','mow','lawn','leaf','leaves'],'snow shoveling':['snow','yard'],
'pet sitting':['pet','dog','cat','animal'],'dog walking':['dog','pet'],
'cleaning':['clean','organiz','tidy'],'babysitting':['babysit','child','kid'],'tutoring':['tutor','homework'],
};
const CATS=(typeof SKILL_CATEGORIES!=='undefined')?SKILL_CATEGORIES:{};
const LMETA=(typeof LESSON_META!=='undefined')?LESSON_META:{};
const DEMO_SKILLS='lawn care,pet sitting,snow shoveling,cleaning';
function lessonInfo(id){
const l=(window.lessonsData||[]).find(x=>x&&x.id===id);
if(l)return{label:l.title,icon:l.icon||'📚',pts:l.xp||20};
if(LMETA[id])return LMETA[id];
return{label:String(id).replace(/[_-]+/g,' ').replace(/^\w/,c=>c.toUpperCase()),icon:'📚',pts:20};
}
function matches(skill,type){
const s=String(skill).toLowerCase(),t=String(type).toLowerCase();
if(!s|| !t)return false;
if(t.includes(s)||s.includes(t))return true;
const key=Object.keys(RELATED).find(k=>s.includes(k));
return!!key&&RELATED[key].some(w=>t.includes(w));
}
function reportData(u){
const ua=typeof userActivity!=='undefined'?userActivity:{};
const real=isReal(u);
const own=Array.isArray(u&&u.skills)?u.skills:null;
const box=()=>String((document.getElementById('skills-input')||{}).value||'').split(',');
let skills=real?(own||ua.skills||[]):((ua.skills||[]).length?ua.skills:(own&&own.length?own:box()));
skills=[...new Set(skills.map(s=>String(s).trim()).filter(Boolean))];
if(real&&skills.join(',')===DEMO_SKILLS)skills=[];
const lessons=[...new Set((ua.lessonsCompleted||[]).filter(id=>typeof id==='string'&&id))];
const ratings=(typeof demoRatings!=='undefined'&&Array.isArray(demoRatings))?demoRatings.filter(r=>r&&r.stars):[];
const accepted=(ua.jobsAccepted||[]).filter(Boolean);
const log=readJSON('tw_worklog',[]).filter(e=>e&&parseFloat(e.hours)>0);
const jobTypes=accepted.map(j=>j.type||'').concat(log.map(e=>TASKS[e.task]||e.task||'')).filter(Boolean);
let jobsDone=accepted.length+log.length,hours=log.reduce((s,e)=>s+(parseFloat(e.hours)||0),0);
if(real&&window._twRealStats){
try{const s=window._twRealStats.stats();jobsDone=Math.max(accepted.length,s.jobsCompleted||0);hours=s.totalHours||hours;}catch(e){}
}
const avg=ratings.length?ratings.reduce((s,r)=>s+(Number(r.stars)||0),0)/ratings.length:0;
const allSkills=[...new Set(skills.concat(jobTypes))];
return{real,skills,allSkills,lessons,ratings,avg,jobTypes,jobsDone,hours:Math.round(hours*10)/10,
empty: !skills.length&& !lessons.length&& !ratings.length&& !jobsDone};
}
function skillBars(d){
if(!d.allSkills.length)return'<p style="color:var(--muted);font-size:.85rem">Add skills in <strong>Skills &amp; Tags</strong> below to see progress here.</p>';
const ratingBonus=Math.min(d.ratings.length*10,30);
return d.allSkills.map(skill=>{
const jobCount=d.jobTypes.filter(t=>matches(skill,t)).length;
const catKey=Object.keys(CATS).find(k=>skill.toLowerCase().includes(k));
const icon=(CATS[catKey]||{}).icon||'💼';
const score=Math.min(100,30+jobCount*25+ratingBonus);
const color=score>=75?'var(--green)':score>=50?'var(--amber)':'var(--blue)';
const level=score>=75?'Advanced':score>=50?'Intermediate':'Beginner';
return`<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <div style="font-size:.85rem;font-weight:700">${icon} ${esc(skill)}</div>
          <div style="font-size:.75rem;font-weight:700;color:${color}">${level} · ${score}%</div>
        </div>
        <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
          <div style="width:${score}%;height:100%;background:${color};border-radius:4px;transition:width .6s ease"></div>
        </div>
      </div>`;
}).join('');
}
function lessonList(d){
if(!d.lessons.length)return'<p style="color:var(--muted);font-size:.83rem">Complete lessons in the Lessons tab to earn skill points.</p>';
return d.lessons.map(id=>{
const m=lessonInfo(id);
return`<div style="display:flex;align-items:center;gap:8px;background:var(--green-pale);border-radius:8px;padding:6px 10px;margin-bottom:6px">
        <span style="font-size:1.1rem">${esc(m.icon)}</span>
        <span style="font-size:.83rem;font-weight:700;color:var(--green);flex:1">${esc(m.label)}</span>
        <span style="font-size:.72rem;font-weight:700;background:var(--green);color:#fff;padding:2px 8px;border-radius:10px">+${Number(m.pts)||20}pts ✓</span>
      </div>`;
}).join('');
}
const AI_BOX='background:var(--green-pale);border-left:4px solid var(--green);border-radius:0 10px 10px 0;padding:12px 14px;margin-bottom:1.2rem;font-size:.85rem;line-height:1.65';
const RETRY='<button type="button" class="btn-sm btn-ai" style="font-size:.72rem;margin-left:6px" onclick="renderSkillReport()">Try again</button>';
function aiHTML(state,text){
if(state==='loading')return'🤖 <strong>AI Assessment:</strong> <span class="loading-dots">Writing your assessment</span>';
if(state==='ok')return'🤖 <strong>AI Assessment:</strong> '+esc(text).replace(/\n+/g,'<br>');
if(state==='empty')return'🌳 <strong>Your report fills in as you go.</strong> Add your skills in <strong>Skills &amp; Tags</strong>, finish a lesson, or log your hours after a job, and your AI assessment shows up here.';
if(state==='limit')return'🤖 <strong>AI Assessment:</strong> '+esc(text||'You\'ve used today\'s AI requests.')+' Your progress below is up to date.';
if(state==='slow')return'🤖 <strong>AI Assessment:</strong> The AI is taking too long to answer right now. Your progress below is up to date.'+RETRY;
return'🤖 <strong>AI Assessment:</strong> The AI assessment isn\'t available right now. Your progress below is up to date.'+RETRY;
}
const CACHE='tw_skill_report_ai_v44';
const signature=d=>JSON.stringify([d.allSkills.slice().sort(),d.lessons.length,d.ratings.length,d.avg.toFixed(1),d.jobsDone]);
function cached(u,sig){const c=readJSON(CACHE,{})[acctKey(u)];return c&&c.sig===sig&&c.text?c.text:null;}
function remember(u,sig,text){
const all=readJSON(CACHE,{});all[acctKey(u)]={sig,text,at:Date.now()};
try{localStorage.setItem(CACHE,JSON.stringify(all));}catch(e){}
}
let run=0;
async function renderSkillReport(opts){
const panel=document.getElementById('skill-progress-panel');
if(!panel)return;
const my= ++run,u=me();
let d;
try{d=reportData(u);}
catch(e){console.warn('skill report',e);d={real:isReal(u),allSkills:[],skills:[],lessons:[],ratings:[],avg:0,jobTypes:[],jobsDone:0,hours:0,empty:true};}
const sig=signature(d);
const hit=(opts&&opts.auto)?cached(u,sig):null;
const skipAI=d.empty&&d.real;
panel.innerHTML=`
      <div data-tw-skill-ai style="${AI_BOX}">${aiHTML(skipAI?'empty':hit?'ok':'loading',hit)}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1.2rem">
        ${[['Jobs Done',d.jobsDone,'var(--green)'],['Avg Rating',d.avg?d.avg.toFixed(1)+'⭐':'—','var(--amber)'],['Lessons',d.lessons.length,'var(--blue)']]
.map(([l,v,c])=>`<div style="background:var(--bg);border-radius:10px;padding:10px;text-align:center">
            <div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:900;color:${c}">${esc(v)}</div>
            <div style="font-size:.7rem;color:var(--muted);font-weight:600">${l}</div>
          </div>`).join('')}
      </div>
      <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Skill Levels</div>
      ${skillBars(d)}
      <div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 8px">Completed Lessons</div>
      ${lessonList(d)}`;
if(skipAI||hit)return;
const who=acctKey(u);
const box=()=>(my===run&&acctKey(me())===who)?panel.querySelector('[data-tw-skill-ai]'):null;
const prompt=`You are a career coach for teens. Write a 2-sentence skill assessment for a teen with these skills: ${d.allSkills.join(', ')||'none listed yet'}, ${d.lessons.length} lessons completed, `+
`${d.ratings.length?'average employer rating '+d.avg.toFixed(1)+'/5 from '+d.ratings.length+' review'+(d.ratings.length===1?'':'s'):'no employer ratings yet'}, `+
`${d.jobsDone} job${d.jobsDone===1?'':'s'} completed${d.hours?' ('+d.hours+' hours logged)':''}. Use only these facts and don't invent any. Be encouraging and specific about their strongest area and one thing to improve.`;
let timer;
const slow=new Promise(res=>{timer=setTimeout(()=>res({slow:true}),AI_WAIT_MS);});
let out;
try{
const ask=typeof window.callAI==='function'?window.callAI(prompt):window.callGemini(prompt);
out=await Promise.race([Promise.resolve(ask).then(text=>({text}),err=>({err})),slow]);
}catch(e){out={err:e};}
clearTimeout(timer);
const b=box();if(!b)return;
if(out.slow){b.innerHTML=aiHTML('slow');return;}
const msg=String(out.err?(out.err.message||out.err):'');
if(/__AI_LIMIT__/.test(msg)){b.innerHTML=aiHTML('limit',msg.replace('__AI_LIMIT__:','').split(':')[1]);return;}
const text=String(out.text||'').trim();
if(out.err|| !text|| /^AI temporarily unavailable/i.test(text)|| /^\{/.test(text)){b.innerHTML=aiHTML('error');return;}
remember(u,sig,text);
b.innerHTML=aiHTML('ok',text);
}
window.renderSkillReport=renderSkillReport;
const SAMPLE_EARN=new Set(['Lawn Mowing – Park Ave','Dog Walking – Martinez','Snow Shoveling','Babysitting – Hendersons']);
const _oEarn=window.renderEarningsTracker;
if(typeof _oEarn==='function'){
window.renderEarningsTracker=function(){
const u=me();
try{
if(isReal(u)&&typeof earningsLog!=='undefined'&&Array.isArray(earningsLog)){
const mine=earningsLog.filter(e=> !(e&&SAMPLE_EARN.has(e.job)));
if(mine.length!==earningsLog.length){earningsLog=mine;try{localStorage.setItem('tw_earnings_log',JSON.stringify(mine));}catch(e){}}
if(!earningsLog.length){
const el=id=>document.getElementById(id),set=(id,t)=>{if(el(id))el(id).textContent=t;};
set('earn-total','$0');set('earn-hours','0h');set('earn-avg','$0/hr');set('earnings-total-badge','$0 total');
if(el('earnings-bar-chart'))el('earnings-bar-chart').innerHTML='';
if(el('earnings-bar-labels'))el('earnings-bar-labels').innerHTML='';
if(el('earnings-log'))el('earnings-log').innerHTML='<div data-tw-empty="earnings" style="text-align:center;padding:1.2rem 1rem;color:var(--muted);font-size:.84rem;line-height:1.5"><div style="font-size:1.6rem;margin-bottom:.35rem">💵</div>No earnings logged yet. When you get paid for a job, add it below and your totals and weekly chart fill in.</div>';
return;
}
}
}catch(e){}
return _oEarn.apply(this,arguments);
};
}
window._twTabRefresh={hooks:()=>JSON.parse(JSON.stringify(HOOKS)),reportData:()=>reportData(me()),isReal:()=>isReal(me())};
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/job-map-landmarks-v44.js */
try{
(function(){
'use strict';
if(window.TWLandmarks)return;
var api=window.TWLandmarks={};
var LEAFLET_JS=['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'];
var LEAFLET_CSS=['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'];
var SRI_JS='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
var SRI_CSS='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
var TILES='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
var TILE_CREDIT='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
var OVERPASS=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
var PHOTON='https://photon.komoot.io/api/',NOMINATIM='https://nominatim.openstreetmap.org/search';
var US_BBOX='-180,15,-60,72';
var US_CENTER=[39.5,-98.35];
var SLOW_MS=8000;
var KINDS=[
{k:'school',e:'🏫',label:'Schools',c:'#2563eb',tier:'a',w:0.8,f:['["amenity"~"^(school|college|university)$"]']},
{k:'park',e:'🌳',label:'Parks',c:'#15803d',tier:'a',w:0.8,f:['["leisure"~"^(park|nature_reserve)$"]']},
{k:'library',e:'📚',label:'Libraries',c:'#7c3aed',tier:'a',w:0.8,f:['["amenity"="library"]']},
{k:'store',e:'🛒',label:'Stores',c:'#ea580c',tier:'a',w:0.9,f:['["shop"~"^(supermarket|mall|department_store|hardware|doityourself)$"]']},
{k:'civic',e:'🏛️',label:'Town hall & post',c:'#475569',tier:'a',w:0.9,f:['["amenity"~"^(townhall|post_office|community_centre|courthouse)$"]']},
{k:'safety',e:'🚒',label:'Fire & police',c:'#dc2626',tier:'a',w:1.0,f:['["amenity"~"^(fire_station|police)$"]']},
{k:'health',e:'🏥',label:'Hospitals',c:'#db2777',tier:'a',w:1.0,f:['["amenity"="hospital"]']},
{k:'transit',e:'🚉',label:'Stations',c:'#0891b2',tier:'a',w:0.9,f:['["amenity"="bus_station"]','["railway"="station"]']},
{k:'fun',e:'🏟️',label:'Sports & museums',c:'#ca8a04',tier:'a',w:0.9,f:['["leisure"~"^(stadium|sports_centre|ice_rink)$"]','["tourism"~"^(museum|attraction|zoo)$"]']},
{k:'food',e:'🍔',label:'Food & gas',c:'#b45309',tier:'b',w:1.1,f:['["amenity"~"^(fast_food|cafe|fuel)$"]["brand"]']},
{k:'worship',e:'⛪',label:'Places of worship',c:'#6b7280',tier:'b',w:1.2,f:['["amenity"="place_of_worship"]']}
];
var KIND={};KINDS.forEach(function(K){KIND[K.k]=K;});
var TIER_ZOOM={a:13,b:15};
function classify(t){
var a=t.amenity||'',l=t.leisure||'',s=t.shop||'',tr=t.tourism||'';
if(/^(school|college|university)$/.test(a))return['school',a==='school'?'🏫':'🎓'];
if(a==='library')return['library','📚'];
if(l==='park'||l==='nature_reserve')return['park',l==='park'?'🌳':'🌲'];
if(/^(supermarket|mall|department_store|hardware|doityourself)$/.test(s))return['store',s==='supermarket'?'🛒': /^(hardware|doityourself)$/.test(s)?'🔨':'🛍️'];
if(/^(townhall|post_office|community_centre|courthouse)$/.test(a))return['civic',{townhall:'🏛️',post_office:'🏤',community_centre:'🏘️',courthouse:'⚖️'}[a]];
if(a==='fire_station'||a==='police')return['safety',a==='police'?'🚓':'🚒'];
if(a==='hospital')return['health','🏥'];
if(a==='bus_station'||t.railway==='station')return['transit',a==='bus_station'?'🚌':'🚉'];
if(/^(stadium|sports_centre|ice_rink)$/.test(l))return['fun',{stadium:'🏟️',sports_centre:'🏀',ice_rink:'⛸️'}[l]];
if(/^(museum|attraction|zoo)$/.test(tr))return['fun',{museum:'🖼️',attraction:'📸',zoo:'🦁'}[tr]];
if(/^(fast_food|cafe|fuel)$/.test(a))return['food',{fast_food:'🍔',cafe:'☕',fuel:'⛽'}[a]];
if(a==='place_of_worship')return['worship',{jewish:'🕍',muslim:'🕌',christian:'⛪'}[t.religion]||'🛐'];
return null;
}
var JOB_ICON={'yard work':'🌿','pet care':'🐾',cleaning:'🧽',babysitting:'🧸','moving help':'📦',tutoring:'📖'};
var $=function(id){return document.getElementById(id);};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
var lsGet=function(k){try{return localStorage.getItem(k);}catch(e){return null;}};
var lsSet=function(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}};
var readJSON=function(k,d){try{var v=JSON.parse(lsGet(k));return v==null?d:v;}catch(e){return d;}};
function me(){try{return(typeof currentUser!=='undefined'&&currentUser)||window.currentUser||null;}catch(e){return window.currentUser||null;}}
var isDemo=function(u){return!!(u&&(u.isDemo|| /\.demo$/i.test(String(u.email||''))));};
var isLimited=function(){return document.body.classList.contains('tw-limited');};
var toast=function(m,t){try{showToast(m,t||'info');}catch(e){}};
var note=function(m,e){try{console.warn('job map:',m,e||'');}catch(x){}};
var STATES={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',
DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',
KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',
NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',
SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
var ABBR={};Object.keys(STATES).forEach(function(k){ABBR[STATES[k].toLowerCase()]=k;});
function stateName(s){s=String(s||'').trim();return STATES[s.toUpperCase()]||s;}
function stateAbbr(s){s=String(s||'').trim();return ABBR[s.toLowerCase()]||s;}
function townLabel(city,state){return[String(city||'').trim(),stateAbbr(state)].filter(Boolean).join(', ');}
function miles(a,b){
var R=3958.8,r=Math.PI/180,dLat=(b[0]-a[0])*r,dLon=(b[1]-a[1])*r;
var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dLon/2)*Math.sin(dLon/2);
return 2*R*Math.asin(Math.min(1,Math.sqrt(x)));
}
function distText(mi){
if(mi<0.06)return'right there';
if(mi<0.1)return'about 1 block';
return(mi<10?mi.toFixed(1):Math.round(mi))+' mi';
}
function tripText(mi){
if(mi<=2)return'about a '+Math.max(1,Math.round(mi*20))+' min walk';
if(mi<=6)return'about a '+Math.max(1,Math.round(mi*6))+' min bike ride';
return'about a '+Math.max(1,Math.round(mi*2.2))+' min drive';
}
function timeoutFetch(url,opts,ms){
var ctl=typeof AbortController==='function'?new AbortController():null;
var t=setTimeout(function(){if(ctl)ctl.abort();},ms||10000);
return fetch(url,Object.assign({},opts||{},ctl?{signal:ctl.signal}:{})).then(function(r){
clearTimeout(t);
if(!r.ok)throw new Error('HTTP '+r.status);
return r.json();
},function(e){clearTimeout(t);throw e;});
}
var GEO_KEY='tw_geo_cache_v1',GEO_DAYS=30,geoMem=readJSON(GEO_KEY,{}),geoInflight={};
function geoSave(){
var keys=Object.keys(geoMem);
if(keys.length>120)keys.sort(function(a,b){return geoMem[a][2]-geoMem[b][2];}).slice(0,keys.length-120).forEach(function(k){delete geoMem[k];});
lsSet(GEO_KEY,JSON.stringify(geoMem));
}
function geocode(q){
q=String(q||'').replace(/\s+/g,' ').trim();
if(!q)return Promise.resolve(null);
var key=q.toLowerCase(),hit=geoMem[key];
if(hit&&Date.now()-hit[2]<GEO_DAYS*864e5)return Promise.resolve(hit[0]==null?null:[hit[0],hit[1]]);
if(geoInflight[key])return geoInflight[key];
var p=timeoutFetch(PHOTON+'?q='+encodeURIComponent(q)+'&limit=3&lang=en&bbox='+US_BBOX,null,6000).then(function(j){
var f=((j&&j.features)||[]).filter(function(x){return x&&x.geometry&&(!x.properties|| !x.properties.countrycode||x.properties.countrycode==='US');})[0];
if(!f)throw new Error('no photon match');
return[f.geometry.coordinates[1],f.geometry.coordinates[0]];
}).catch(function(e){
note('photon lookup failed, trying nominatim',e);
return timeoutFetch(NOMINATIM+'?format=json&limit=1&countrycodes=us&q='+encodeURIComponent(q),{headers:{Accept:'application/json'}},8000).then(function(j){
var r=j&&j[0];if(!r)return null;
return[parseFloat(r.lat),parseFloat(r.lon)];
});
}).then(function(pt){
geoMem[key]=pt?[pt[0],pt[1],Date.now()]:[null,null,Date.now()-(GEO_DAYS-1)*864e5];
geoSave();
return pt;
},function(e){note('town lookup failed',e);return null;}).then(function(pt){delete geoInflight[key];return pt;});
geoInflight[key]=p;
return p;
}
var CLAT=0.03,CLON=0.04,MAX_CELLS=9,LM_KEY='tw_landmarks_v1',LM_DAYS=7,LM_MAX_CELLS=40;
var store=readJSON(LM_KEY,null);if(!store|| !store.a|| !store.b)store={a:{},b:{}};
var mem={a:{},b:{}},failedUntil=0,chain=Promise.resolve();
function cellOf(lat,lon){return Math.floor(lat/CLAT)+':'+Math.floor(lon/CLON);}
function cellBox(key){var p=key.split(':'),i= +p[0],j= +p[1];return{s:i*CLAT,n:(i+1)*CLAT,w:j*CLON,e:(j+1)*CLON};}
function cellsIn(b){
var out=[],i0=Math.floor(b.s/CLAT),i1=Math.floor(b.n/CLAT),j0=Math.floor(b.w/CLON),j1=Math.floor(b.e/CLON);
if((i1-i0+1)*(j1-j0+1)>400)return null;
for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++)out.push(i+':'+j);
return out;
}
function have(tier,key){
if(mem[tier][key])return true;
var c=store[tier][key];
if(c&&Date.now()-c.t<LM_DAYS*864e5){mem[tier][key]=c.items;return true;}
return false;
}
function saveStore(){
['a','b'].forEach(function(tier){
var keys=Object.keys(store[tier]);
if(keys.length>LM_MAX_CELLS)keys.sort(function(x,y){return store[tier][x].t-store[tier][y].t;}).slice(0,keys.length-LM_MAX_CELLS).forEach(function(k){delete store[tier][k];});
});
if(!lsSet(LM_KEY,JSON.stringify(store))){store={a:{},b:{}};lsSet(LM_KEY,JSON.stringify(store));}
}
function query(tier,b){
var parts=[];
KINDS.forEach(function(K){if(K.tier===tier)K.f.forEach(function(f){parts.push('nwr'+f+'["name"];');});});
var bb=[b.s,b.w,b.n,b.e].map(function(x){return x.toFixed(4);}).join(',');
return'[out:json][timeout:25][bbox:'+bb+'];('+parts.join('')+');out center 1500;';
}
function parse(json){
var out=[],seen={};
((json&&json.elements)||[]).forEach(function(el){
var t=el.tags||{},name=String(t.name||'').trim();if(!name)return;
var lat=el.lat!=null?el.lat:el.center&&el.center.lat,lon=el.lon!=null?el.lon:el.center&&el.center.lon;
if(lat==null||lon==null)return;
var c=classify(t);if(!c)return;
var dup=c[0]+'|'+name.toLowerCase()+'|'+Math.round(lat*200)+'|'+Math.round(lon*200);
if(seen[dup])return;seen[dup]=1;
out.push([el.type.charAt(0)+el.id,name,c[0],c[1]||KIND[c[0]].e,+(+lat).toFixed(5),+(+lon).toFixed(5)]);
});
return out;
}
function fetchOverpass(q){
var i=0;
function attempt(){
return timeoutFetch(OVERPASS[i],{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q)},20000)
.catch(function(e){note('landmarks: '+OVERPASS[i]+' failed',e);i++;if(i<OVERPASS.length)return attempt();throw e;});
}
return attempt();
}
function ensureCells(tier,keys,center,now){
if(!keys)return Promise.resolve('too-far');
var missing=keys.filter(function(k){return!have(tier,k);});
if(!missing.length)return Promise.resolve('ok');
if(Date.now()<failedUntil)return Promise.resolve('failed');
if(missing.length>MAX_CELLS){
if(!center)return Promise.resolve('too-far');
var mid=cellOf(center[0],center[1]).split(':').map(Number);
missing.sort(function(x,y){var a=x.split(':'),b=y.split(':');return(Math.abs(a[0]-mid[0])+Math.abs(a[1]-mid[1]))-(Math.abs(b[0]-mid[0])+Math.abs(b[1]-mid[1]));});
missing=missing.slice(0,MAX_CELLS);
}
var run=function(){
missing=missing.filter(function(k){return!have(tier,k);});
if(!missing.length)return'ok';
var b={s:90,n: -90,w:180,e: -180};
missing.forEach(function(k){var c=cellBox(k);b.s=Math.min(b.s,c.s);b.n=Math.max(b.n,c.n);b.w=Math.min(b.w,c.w);b.e=Math.max(b.e,c.e);});
return fetchOverpass(query(tier,b)).then(function(json){
var items=parse(json),by={};
missing.forEach(function(k){by[k]=[];});
items.forEach(function(it){var k=cellOf(it[4],it[5]);if(by[k])by[k].push(it);});
var now=Date.now();
Object.keys(by).forEach(function(k){mem[tier][k]=by[k];store[tier][k]={t:now,items:by[k]};});
saveStore();
api.lastFetchCount=(api.lastFetchCount||0)+1;
return'ok';
},function(e){failedUntil=Date.now()+45000;note('landmarks could not load',e);return'failed';});
};
if(now)return Promise.resolve().then(run);
var p=chain.then(run,run);
chain=p.catch(function(){});
return p;
}
function landmarksIn(tier,b){
var keys=cellsIn(b)||[],out=[];
keys.forEach(function(k){if(have(tier,k))mem[tier][k].forEach(function(it){if(it[4]>=b.s&&it[4]<=b.n&&it[5]>=b.w&&it[5]<=b.e)out.push(it);});});
return out;
}
function boxAround(pt,mi){var dLat=mi/69,dLon=mi/(69*Math.max(0.2,Math.cos(pt[0]*Math.PI/180)));return{s:pt[0]-dLat,n:pt[0]+dLat,w:pt[1]-dLon,e:pt[1]+dLon};}
function ensureAround(pt,mi){return ensureCells('a',cellsIn(boxAround(pt,mi||0.9)),pt);}
function nearest(pt,n,skipId){
var list=landmarksIn('a',boxAround(pt,1.5)).map(function(it){var d=miles(pt,[it[4],it[5]]);return{it:it,d:d,score:d*(KIND[it[2]]?KIND[it[2]].w:1)};})
.filter(function(x){return x.it[0]!==skipId&&x.d<=1.5;})
.sort(function(a,b){return a.score-b.score;});
var per={},out=[];
for(var i=0;i<list.length&&out.length<(n||4);i++){
var k=list[i].it[2];per[k]=(per[k]||0)+1;
if(per[k]<=2)out.push({id:list[i].it[0],name:list[i].it[1],kind:k,icon:list[i].it[3],lat:list[i].it[4],lon:list[i].it[5],mi:list[i].d});
}
return out;
}
function homeInfo(){
var u=me();if(!u||u.type!=='teen')return null;
var a=readJSON('tw_device_address_'+String(u.dataKey||u.email||'').toLowerCase(),null)||{};
if(isDemo(u)){
try{if(typeof _userAddress!=='undefined'&&_userAddress)a={street:_userAddress.street,zip:_userAddress.zip,city:_userAddress.city||u.city,state:u.state||'Vermont'};}catch(e){}
}
var city=String(a.city||u.city||'').trim(),state=stateName(a.state||u.state||''),street=String(a.street||'').trim(),zip=String(a.zip||'').trim();
if(!city&& !zip)return null;
var town=city?city+(state?', '+state:''):zip;
return{full:street?[street,city,[state,zip].filter(Boolean).join(' ')].filter(Boolean).join(', '):'',town:town,label:city?townLabel(city,state):zip,exact: !!street};
}
function homePoint(){
var h=homeInfo();if(!h)return Promise.resolve(null);
return(h.full?geocode(h.full):Promise.resolve(null)).then(function(pt){
if(pt)return{pt:pt,info:h,exact:true};
return geocode(h.town).then(function(p2){return p2?{pt:p2,info:h,exact:false}:null;});
});
}
function jobTownQuery(j){return[String(j.city||'').trim(),stateName(j.state)].filter(Boolean).join(', ');}
function jobPoint(j){
if(j&&j.landmark&&isFinite(j.landmark.lat)&&isFinite(j.landmark.lon))return Promise.resolve({pt:[+j.landmark.lat,+j.landmark.lon],exact:true});
var q=jobTownQuery(j);if(!q)return Promise.resolve(null);
return geocode(q).then(function(pt){return pt?{pt:pt,exact:false}:null;});
}
var isSampleJob=function(j){return!!j&&typeof j.id==='number'&&j.id>=1&&j.id<=12;};
function jobLists(){
var open=[],applied=[],posted=[],demo=isDemo(me());
var ok=function(j){return!!j&&(demo|| !isSampleJob(j));};
try{var ids=new Set(demoJobs.map(function(j){return j&&j.id;}));open=browsableJobs.filter(function(j){return ok(j)&& !ids.has(j.id);});applied=demoJobs.filter(ok);}catch(e){}
try{posted=employerPostedJobs.filter(ok);}catch(e){}
return{open:open,applied:applied,posted:posted};
}
function findJob(id){
var L=jobLists(),all=L.open.concat(L.applied,L.posted);
for(var i=0;i<all.length;i++)if(String(all[i].id)===String(id))return all[i];
return null;
}
function payText(j){return j.pay?'$'+j.pay+(j.payType==='hourly'?'/hr':' flat'):'';}
var leafletP=null;
function loadLeaflet(){
if(window.L&&window.L.map)return Promise.resolve(window.L);
if(leafletP)return leafletP;
if(!document.getElementById('twlm-leaflet-css')){
var css=document.createElement('link');css.id='twlm-leaflet-css';css.rel='stylesheet';css.href=LEAFLET_CSS[0];
css.integrity=SRI_CSS;css.crossOrigin='anonymous';
css.onerror=function(){css.onerror=null;css.href=LEAFLET_CSS[1];};
document.head.appendChild(css);
}
leafletP=new Promise(function(resolve,reject){
var i=0;
(function next(){
if(i>=LEAFLET_JS.length){leafletP=null;reject(new Error('map library did not load'));return;}
var s=document.createElement('script'),done=false;
s.src=LEAFLET_JS[i];s.integrity=SRI_JS;s.crossOrigin='anonymous';s.async=true;
var fail=function(){if(done)return;done=true;clearTimeout(to);s.remove();i++;next();};
var to=setTimeout(fail,12000);
s.onload=function(){if(done)return;done=true;clearTimeout(to);if(window.L&&window.L.map)resolve(window.L);else{i++;next();}};
s.onerror=fail;
document.head.appendChild(s);
})();
});
return leafletP;
}
function lmIcon(L,it){
var K=KIND[it[2]]||KINDS[0];
return L.divIcon({className:'twlm-lm-wrap',html:'<span class="twlm-lm" style="--c:'+K.c+'">'+it[3]+'</span>',iconSize:[26,26],iconAnchor:[13,13],popupAnchor:[0,-12]});
}
function jobIcon(L,j,applied){
return L.divIcon({className:'twlm-job-wrap',html:'<span class="twlm-job'+(applied?' applied':'')+'"><b>'+(JOB_ICON[String(j.type||'').toLowerCase()]||'💼')+'</b></span>',iconSize:[34,42],iconAnchor:[17,40],popupAnchor:[0,-36]});
}
function homeIcon(L,label){
return L.divIcon({className:'twlm-home-wrap',html:'<span class="twlm-home">'+(label||'🏠')+'</span>',iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-14]});
}
function injectCss(){
if($('job-map-landmarks-v44-css'))return;
var st=document.createElement('style');st.id='job-map-landmarks-v44-css';
st.textContent=[
'.twlm{font-family:"DM Sans",system-ui,sans-serif;color:var(--text)}',
'.twlm-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin:0 0 8px}',
'.twlm-where{font-weight:700;color:var(--green);font-size:.9rem}',
'.twlm-btn{font-family:inherit;font-size:.8rem;font-weight:700;border:1.5px solid var(--border);background:var(--card);color:var(--text);border-radius:999px;padding:6px 12px;min-height:34px;cursor:pointer}',
'.twlm-btn:hover{border-color:var(--green)}',
'.twlm-chips{display:flex;gap:6px;overflow-x:auto;padding:0 0 6px;margin:0 0 6px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}',
'.twlm-chip{flex:0 0 auto;font-family:inherit;font-size:.76rem;font-weight:600;border:1.5px solid var(--border);background:var(--card);color:var(--muted);border-radius:999px;padding:5px 10px;min-height:32px;cursor:pointer;opacity:.75}',
'.twlm-chip.on{border-color:var(--c);color:var(--text);opacity:1;background:color-mix(in srgb,var(--c) 12%,var(--card))}',
'.twlm-msg{font-size:.84rem;line-height:1.5;border-radius:10px;padding:9px 12px;margin:0 0 8px;background:var(--green-pale,#e8f5ee);color:var(--text)}',
'.twlm-msg.amber{background:#fff7e6;color:#7a4a00}html.dark .twlm-msg.amber{background:#3a2c10;color:#f5d48b}',
'.twlm-box{position:relative;border:1.5px solid var(--border);border-radius:14px;overflow:hidden;isolation:isolate;background:#e9eee8}',
'html.dark .twlm-box{background:#1d2622}',
'.twlm-map{height:clamp(320px,58vh,520px);width:100%;font-family:inherit}',
'.twlm-box .twlm-status{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1000;background:var(--card);color:var(--text);border-radius:999px;padding:5px 12px;font-size:.78rem;font-weight:600;box-shadow:0 2px 10px rgba(0,0,0,.15);white-space:nowrap;max-width:92%;overflow:hidden;text-overflow:ellipsis}',
'.twlm-box .twlm-status:empty{display:none}',
'.twlm-box .twlm-status:has(button){white-space:normal;text-align:center;border-radius:14px;line-height:1.45}',
'.twlm-status button{font:inherit;border:none;background:none;color:var(--green);font-weight:800;cursor:pointer;padding:0 0 0 6px}',
'html.dark .twlm .leaflet-tile-pane,html.dark #twlm-sheet .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.92) contrast(.9) saturate(.55)}',
'.twlm .leaflet-container,#twlm-sheet .leaflet-container{font-family:"DM Sans",system-ui,sans-serif}',
'.twlm-lm-wrap,.twlm-job-wrap,.twlm-home-wrap{background:none;border:none}',
'.twlm-lm{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid var(--c);font-size:14px;line-height:1;box-shadow:0 1px 4px rgba(0,0,0,.25)}',
'.twlm-job{position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--green,#2d6a4f);border:2px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.3)}',
'.twlm-job.applied{background:var(--blue,#2563eb)}',
'.twlm-job b{transform:rotate(45deg);font-size:16px;line-height:1}',
'.twlm-home{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#fff;border:3px solid var(--amber,#d97706);font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,.3)}',
'.twlm-pop{font-size:.82rem;line-height:1.45;min-width:180px;max-width:240px}',
'.twlm-pop b{font-size:.9rem}',
'.twlm-pop .sub{color:#555}',
'.twlm-pop .near{margin:6px 0;padding:6px 8px;background:#f1f5f2;border-radius:8px;font-size:.78rem}',
'.twlm-pop button{font-family:inherit;font-weight:700;font-size:.8rem;border-radius:8px;padding:6px 10px;margin:4px 4px 0 0;cursor:pointer;border:1.5px solid var(--green,#2d6a4f);background:var(--green,#2d6a4f);color:#fff}',
'.twlm-pop button.alt{background:#fff;color:var(--green,#2d6a4f)}',
'.twlm-close{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}',
'.twlm-close .twlm-chip{opacity:1;color:var(--text)}',
'.twlm-foot{font-size:.72rem;color:var(--muted);margin:6px 0 0;line-height:1.45}',
'.twlm-near{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:.8rem;color:var(--text);background:var(--blue-pale,#eaf1fe);border-radius:8px;padding:5px 9px;margin:0 0 8px}',
'.btn-sm.twlm-where-btn{background:var(--blue-pale,#eaf1fe);color:var(--blue,#2563eb);border:1px solid #b9cdfa;font-size:.74rem}',
'#twlm-sheet{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px;font-family:"DM Sans",system-ui,sans-serif}',
'#twlm-sheet .sheet{background:var(--card,#fff);color:var(--text,#1c1c1c);width:100%;max-width:480px;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow-y:auto;border-radius:18px;padding:18px 18px 16px;box-shadow:0 12px 48px rgba(0,0,0,.3);position:relative}',
'#twlm-sheet h2{margin:0 30px 4px 0;font-family:"Fraunces",Georgia,serif;font-size:1.2rem;color:var(--green,#2d6a4f);line-height:1.3}',
'#twlm-sheet .x{position:absolute;top:8px;right:10px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--muted,#6b7280);padding:6px}',
'#twlm-sheet .meta{font-size:.84rem;color:var(--muted,#6b7280);margin:0 0 10px}',
'#twlm-sheet .mini{height:210px;border-radius:12px;overflow:hidden;border:1.5px solid var(--border,#e5e7eb);isolation:isolate;background:#e9eee8;margin:0 0 10px}',
'#twlm-sheet .mini.off{display:none}',
'#twlm-sheet .lead{font-size:.88rem;line-height:1.5;margin:0 0 6px}',
'#twlm-sheet ul{list-style:none;margin:0 0 10px;padding:0}',
'#twlm-sheet li{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border,#e5e7eb);font-size:.88rem}',
'#twlm-sheet li:last-child{border-bottom:none}',
'#twlm-sheet li .d{margin-left:auto;color:var(--muted,#6b7280);font-size:.8rem;white-space:nowrap}',
'#twlm-sheet .home{font-size:.86rem;background:#fff7e6;color:#7a4a00;border-radius:10px;padding:8px 10px;margin:0 0 12px;line-height:1.45}',
'html.dark #twlm-sheet .home{background:#3a2c10;color:#f5d48b}',
'#twlm-sheet .wait{font-size:.84rem;color:var(--muted,#6b7280);margin:0 0 10px}',
'#twlm-sheet .acts{display:flex;gap:8px;flex-wrap:wrap}',
'#twlm-sheet .acts button{flex:1 1 160px;font-family:inherit;font-weight:700;font-size:.92rem;border-radius:10px;padding:11px 14px;min-height:44px;cursor:pointer;border:1.5px solid var(--green,#2d6a4f);background:transparent;color:var(--green,#2d6a4f)}',
'#twlm-sheet .acts button.pri{background:var(--green,#2d6a4f);color:#fff}',
'.twlm-pick select{width:100%}',
'.twlm-pick .twlm-hint{font-size:.76rem;color:var(--muted);margin-top:5px;line-height:1.4;text-transform:none;letter-spacing:0;font-weight:400}',
'.twlm-pick-status{font-size:.8rem;color:var(--text);margin-top:6px;line-height:1.45;overflow-wrap:anywhere}',
'.twlm-pick-status[data-state=slow],.twlm-pick-status[data-state=failed]{background:var(--amber-pale,#fff7e6);border:1px solid #f0b66a;border-radius:8px;padding:6px 9px}',
'.twlm-pick-status button{font:inherit;font-weight:800;color:var(--green);background:none;border:none;padding:4px 2px;min-height:32px;cursor:pointer;text-decoration:underline}',
'.twlm-spin{display:inline-block;width:.85em;height:.85em;margin-right:6px;vertical-align:-1px;border:2px solid var(--border,#ddd);border-top-color:var(--green);border-radius:50%;animation:twlmspin .8s linear infinite}',
'@keyframes twlmspin{to{transform:rotate(360deg)}}',
'@media (prefers-reduced-motion:reduce){.twlm-spin{animation:none}}'
].join('\n');
document.head.appendChild(st);
}
var views={};
var KINDS_KEY='tw_landmark_kinds_v1';
var hiddenKinds=readJSON(KINDS_KEY,{});
function fixPanelText(){
var p=document.querySelector('#ttab-map > div p');
if(p&& !p.dataset.twlm){p.dataset.twlm='1';p.textContent='Parks, schools, libraries and stores help you see where each job is. Job pins show the town, or the landmark the employer picked. Never a home address.';}
}
function buildView(host,cid){
var v={cid:cid,host:host,centered:'',jobsSig:null,markers:{},jobLayer:null,lmLayer:null,homeLayer:null,map:null};
host.innerHTML='<div class="twlm" data-twlm="'+esc(cid)+'">'+
'<div class="twlm-top"><div class="twlm-where">📍 Finding your area…</div>'+
'<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="twlm-btn" data-a="locate">📍 Use where I am</button><button type="button" class="twlm-btn" data-a="home">🏠 Home</button></div></div>'+
'<div class="twlm-msgs"></div>'+
'<div class="twlm-chips" role="group" aria-label="Show landmarks">'+KINDS.map(function(K){
return'<button type="button" class="twlm-chip'+(hiddenKinds[K.k]?'':' on')+'" data-k="'+K.k+'" style="--c:'+K.c+'" aria-pressed="'+(hiddenKinds[K.k]?'false':'true')+'">'+K.e+' '+esc(K.label)+'</button>';
}).join('')+'</div>'+
'<div class="twlm-box"><div class="twlm-map"></div><div class="twlm-status" aria-live="polite"></div></div>'+
'<div class="twlm-close"></div>'+
'<div class="twlm-foot">Landmarks and map: © OpenStreetMap contributors. Zoom in to see more places.</div></div>';
v.root=host.firstChild;
v.root.addEventListener('click',function(e){
var chip=e.target.closest('.twlm-chip[data-k]'),btn=e.target.closest('[data-a]'),go=e.target.closest('[data-go]');
if(chip&&chip.parentNode.classList.contains('twlm-chips')){
var k=chip.dataset.k,on= !chip.classList.contains('on');
chip.classList.toggle('on',on);chip.setAttribute('aria-pressed',on?'true':'false');
if(on)delete hiddenKinds[k];else hiddenKinds[k]=1;
lsSet(KINDS_KEY,JSON.stringify(hiddenKinds));
drawLandmarks(v);
}else if(btn&&btn.dataset.a==='locate')locate(v);
else if(btn&&btn.dataset.a==='home'){v.centered='';centerView(v,true);}
else if(btn&&btn.dataset.a==='retry'){failedUntil=0;if(v.mapFailed|| !v.map){delete views[v.cid];renderJobMap(v.cid);}else loadForView(v);}
else if(go&&v.map){v.map.setView([+go.dataset.lat,+go.dataset.lon],Math.max(v.map.getZoom(),16));}
});
return v;
}
function status(v,html){var s=v.root.querySelector('.twlm-status');if(s)s.innerHTML=html||'';}
function messages(v){
var u=me(),out=[],L=jobLists();
var jobs=u&&u.type==='teen'?L.open:L.open.concat(L.posted);
if(u&&u.type==='teen'&&isLimited())out.push('<div class="twlm-msg amber">🔒 <b>Limited mode.</b> You can explore the map and see where jobs are. Link a parent to apply.</div>');
if(!jobs.length)out.push(u&&u.type==='teen'
?'<div class="twlm-msg">🔎 <b>No jobs posted near you yet.</b> The map still shows parks, schools, libraries and stores, so when a job shows up you will know where it is.</div>'
:'<div class="twlm-msg">🔎 <b>No jobs posted yet.</b> Zoom in on a town to see its landmarks.</div>');
if(u&&u.type==='teen'&& !homeInfo())out.push('<div class="twlm-msg amber">🏠 Add your town in <b>Profile → Your Address</b> to see landmarks near your home, or tap <b>📍 Use where I am</b>.</div>');
v.root.querySelector('.twlm-msgs').innerHTML=out.join('');
}
function refreshView(v){
messages(v);
if(!v.map){
status(v,'Loading the map…');
clearTimeout(v.mapSlowT);
v.mapSlowT=setTimeout(function(){if(!v.map&& !v.mapFailed)status(v,'The map is taking longer than usual to load.<button type="button" data-a="retry">Try again</button>');},SLOW_MS);
}
loadLeaflet().then(function(L){
clearTimeout(v.mapSlowT);
if(!document.body.contains(v.root))return;
if(!v.map){
status(v,'');
var el=v.root.querySelector('.twlm-map');
v.map=L.map(el,{zoomControl:true,attributionControl:true,worldCopyJump:true}).setView(US_CENTER,4);
L.tileLayer(TILES,{maxZoom:19,attribution:TILE_CREDIT}).addTo(v.map);
v.lmLayer=L.layerGroup().addTo(v.map);
v.jobLayer=L.layerGroup().addTo(v.map);
v.homeLayer=L.layerGroup().addTo(v.map);
var t=null;
v.map.on('moveend zoomend',function(){clearTimeout(t);t=setTimeout(function(){loadForView(v);},450);});
if(typeof ResizeObserver==='function'){v.ro=new ResizeObserver(function(){try{v.map.invalidateSize();}catch(e){}});v.ro.observe(el);}
[80,400].forEach(function(ms){setTimeout(function(){try{v.map.invalidateSize();}catch(e){}},ms);});
}else{try{v.map.invalidateSize();}catch(e){}}
drawJobs(v);
centerView(v,false);
},function(e){
clearTimeout(v.mapSlowT);
status(v,'');
note('map library failed',e);
var box=v.root.querySelector('.twlm-box');
box.querySelector('.twlm-map').style.height='auto';
box.querySelector('.twlm-map').innerHTML='<div style="padding:1.4rem 1rem;text-align:center;color:var(--muted);font-size:.88rem;line-height:1.55">🗺️ The map could not load. Check your internet connection.<br><button type="button" class="twlm-btn" data-a="retry" style="margin-top:8px">Try again</button></div>';
v.mapFailed=true;
homePoint().then(function(h){if(h){setWhere(v,h);closestList(v,h.pt);}});
});
}
function setWhere(v,h){
var w=v.root.querySelector('.twlm-where');
if(w)w.textContent=h?'📍 Around '+(h.exact?'your home in ':'')+h.info.label:(me()&&me().type==='teen'?'📍 Jobs and landmarks':'📍 Jobs on TeenWork');
}
function centerView(v,force){
var u=me(),sig=(u&&u.email||'')+'|'+JSON.stringify(homeInfo());
if(!force&&v.centered===sig){loadForView(v);return;}
v.centered=sig;
homePoint().then(function(h){
if(!v.map)return;
v.homeLayer.clearLayers();
setWhere(v,h);
if(h){
if(h.exact)L_marker(v.homeLayer,h.pt,homeIcon(window.L),'<div class="twlm-pop"><b>🏠 Home</b><div class="sub">Only you can see this.</div></div>');
v.home=h;
v.map.setView(h.pt,h.exact?14:13);
closestList(v,h.pt);
}else{
v.home=null;
var pts=Object.keys(v.markers).map(function(k){return v.markers[k].getLatLng();});
if(pts.length)v.map.fitBounds(window.L.latLngBounds(pts).pad(0.3),{maxZoom:14});
else v.map.setView(US_CENTER,4);
}
loadForView(v);
});
}
function L_marker(layer,pt,icon,popup){var m=window.L.marker(pt,{icon:icon,keyboard:false});if(popup)m.bindPopup(popup);layer.addLayer(m);return m;}
function locate(v){
if(!navigator.geolocation){toast('Your browser can\'t share your location.','info');return;}
status(v,'Finding where you are…');
navigator.geolocation.getCurrentPosition(function(pos){
status(v,'');
if(!v.map)return;
var pt=[pos.coords.latitude,pos.coords.longitude];
v.homeLayer.clearLayers();
L_marker(v.homeLayer,pt,homeIcon(window.L,'📍'),'<div class="twlm-pop"><b>📍 You are here</b><div class="sub">Not saved anywhere.</div></div>');
v.map.setView(pt,15);
closestList(v,pt);
},function(){status(v,'');toast('Location is off. Add your town in Profile instead.','info');},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
}
function loadForView(v){
if(!v.map)return;
clearTimeout(v.slowT);
var z=v.map.getZoom(),b=v.map.getBounds().pad(0.15),box={s:b.getSouth(),n:b.getNorth(),w:b.getWest(),e:b.getEast()};
var c=v.map.getCenter(),center=[c.lat,c.lng];
if(z<TIER_ZOOM.a){drawLandmarks(v);status(v,'🔍 Zoom in to see landmarks');return;}
var tiers=['a'].concat(z>=TIER_ZOOM.b?['b']:[]);
var need=tiers.some(function(t){var ks=cellsIn(box);return!ks||ks.some(function(k){return!have(t,k);});});
var seq=(v.seq=(v.seq||0)+1);
if(need){
status(v,'Loading landmarks…');
v.slowT=setTimeout(function(){if(seq===v.seq)status(v,'Couldn\'t load landmarks yet. The map and jobs still work.<button type="button" data-a="retry">Try again</button>');},SLOW_MS);
}
drawLandmarks(v);
Promise.all(tiers.map(function(t){return ensureCells(t,cellsIn(box),center);})).then(function(rs){
if(seq!==v.seq)return;
clearTimeout(v.slowT);
drawLandmarks(v);
if(rs.indexOf('failed')>=0)status(v,'Landmarks couldn\'t load right now.<button type="button" data-a="retry">Try again</button>');
else status(v,'');
if(v.home)closestList(v,v.home.pt);
});
}
function drawLandmarks(v){
if(!v.map|| !v.lmLayer)return;
var L=window.L,z=v.map.getZoom(),b=v.map.getBounds().pad(0.2),box={s:b.getSouth(),n:b.getNorth(),w:b.getWest(),e:b.getEast()};
var items=[];
if(z>=TIER_ZOOM.a)items=landmarksIn('a',box);
if(z>=TIER_ZOOM.b)items=items.concat(landmarksIn('b',box));
items=items.filter(function(it){return!hiddenKinds[it[2]];});
if(items.length>400)items=items.sort(function(x,y){return(KIND[x[2]].w-KIND[y[2]].w);}).slice(0,400);
var want={};items.forEach(function(it){want[it[0]]=it;});
v.lm=v.lm||{};
Object.keys(v.lm).forEach(function(id){if(!want[id]){v.lmLayer.removeLayer(v.lm[id]);delete v.lm[id];}});
items.forEach(function(it){
if(v.lm[it[0]])return;
var K=KIND[it[2]];
var m=L.marker([it[4],it[5]],{icon:lmIcon(L,it),keyboard:false,title:it[1],zIndexOffset: -100});
m.bindPopup('<div class="twlm-pop"><b>'+it[3]+' '+esc(it[1])+'</b><div class="sub">'+esc(K.label)+'</div></div>');
v.lm[it[0]]=m;v.lmLayer.addLayer(m);
});
v.root.dataset.landmarks=String(Object.keys(v.lm).length);
}
function closestList(v,pt){
var box=v.root.querySelector('.twlm-close');if(!box)return;
ensureAround(pt,1).then(function(){
var near=nearest(pt,6);
box.innerHTML=near.length?'<span style="font-size:.78rem;color:var(--muted);align-self:center">Closest landmarks:</span>'+near.map(function(n){
return'<button type="button" class="twlm-chip" data-go="1" data-lat="'+n.lat+'" data-lon="'+n.lon+'" style="--c:'+KIND[n.kind].c+'">'+n.icon+' '+esc(n.name)+' · '+distText(n.mi)+'</button>';
}).join(''):'';
});
}
function drawJobs(v){
var L=window.L,u=me(),lists=jobLists();
var isTeen=u&&u.type==='teen';
var jobs=isTeen?lists.open.map(function(j){return{j:j,applied:false};}).concat(lists.applied.map(function(j){return{j:j,applied:true};}))
:lists.open.concat(lists.posted).map(function(j){return{j:j,applied:false};});
var seen={};jobs=jobs.filter(function(x){var k=String(x.j.id);if(seen[k])return false;seen[k]=1;return true;});
var sig=jobs.map(function(x){return x.j.id+(x.applied?'a':'o')+(x.j.landmark?x.j.landmark.id:'');}).join(',');
messages(v);
if(sig===v.jobsSig)return;
v.jobsSig=sig;
v.jobLayer.clearLayers();v.markers={};
var byTown={};
Promise.all(jobs.map(function(x){return jobPoint(x.j).then(function(p){return{x:x,p:p};});})).then(function(res){
if(v.jobsSig!==sig)return;
res.forEach(function(r){if(r.p&& !r.p.exact){var k=r.p.pt.join(',');(byTown[k]=byTown[k]||[]).push(r);}});
Object.keys(byTown).forEach(function(k){
var g=byTown[k];if(g.length<2)return;
g.forEach(function(r,i){var a=2*Math.PI*i/g.length,d=0.0022;r.pt=[r.p.pt[0]+d*Math.sin(a),r.p.pt[1]+d*1.35*Math.cos(a)];});
});
res.forEach(function(r){
if(!r.p)return;
var j=r.x.j,m=L.marker(r.pt||r.p.pt,{icon:jobIcon(L,j,r.x.applied),title:j.title,riseOnHover:true});
m.bindPopup(function(){return jobPopup(j,r.p,r.x.applied);},{maxWidth:260});
v.jobLayer.addLayer(m);v.markers[j.id]=m;
});
v.root.dataset.jobs=String(Object.keys(v.markers).length);
if(!v.home&&v.centered&&Object.keys(v.markers).length&&v.map.getZoom()<6){
v.map.fitBounds(L.latLngBounds(Object.keys(v.markers).map(function(k){return v.markers[k].getLatLng();})).pad(0.3),{maxZoom:14});
}
});
}
function jobPopup(j,p,applied){
var u=me(),d=document.createElement('div');d.className='twlm-pop';
d.innerHTML='<b>'+esc(j.title)+'</b><div class="sub">'+esc([j.employer,payText(j)].filter(Boolean).join(' · '))+'</div>'+
'<div class="sub">📍 '+(j.landmark?'Near '+esc(j.landmark.icon||'')+' '+esc(j.landmark.name):'Somewhere in '+esc(townLabel(j.city,j.state)))+'</div>'+
'<div class="near">Finding landmarks…</div>';
var near=d.querySelector('.near');
ensureAround(p.pt).then(function(){
var n=nearest(p.pt,3,j.landmark&&j.landmark.id);
if(!n.length){near.remove();return;}
near.innerHTML=(p.exact?'Close by: ':'In the middle of town: ')+n.map(function(x){return x.icon+' '+esc(x.name)+' ('+distText(x.mi)+')';}).join(', ');
});
if(applied){var a=document.createElement('div');a.className='sub';a.textContent='✅ You applied to this job.';d.appendChild(a);}
else if(u&&u.type==='teen'){
var b=document.createElement('button');b.type='button';b.textContent=isLimited()?'🔒 Where is it & apply':'Where is it & apply';
b.addEventListener('click',function(){api.openSheet(j.id);});
d.appendChild(b);
}
return d;
}
function renderJobMap(cid){
var host=$(cid);if(!host)return;
injectCss();fixPanelText();
var v=views[cid];
if(!v|| !v.root||v.root.parentNode!==host|| !document.body.contains(v.root)){
if(v&&v.map){try{v.map.remove();}catch(e){}if(v.ro)v.ro.disconnect();}
v=views[cid]=buildView(host,cid);
}
refreshView(v);
}
renderJobMap.__twlm=true;
function install(){if(!window.renderJobMap|| !window.renderJobMap.__twlm)window.renderJobMap=renderJobMap;}
install();
document.addEventListener('DOMContentLoaded',install);
window.addEventListener('load',install);
var sheetMap=null;
function closeSheet(){
var s=$('twlm-sheet');if(!s)return;
if(sheetMap){try{sheetMap.remove();}catch(e){}sheetMap=null;}
s.remove();
}
api.closeSheet=closeSheet;
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('twlm-sheet')&& !$('tw35-modal'))closeSheet();});
api.openSheet=function(id,opts){
opts=opts||{};
var j=findJob(id);if(!j)return false;
injectCss();closeSheet();
var applied=jobLists().applied.some(function(x){return String(x.id)===String(id);});
var title=j.title||'this job',limited=isLimited();
var s=document.createElement('div');s.id='twlm-sheet';s.setAttribute('role','dialog');s.setAttribute('aria-modal','true');s.setAttribute('aria-label','Where this job is');
s.innerHTML='<div class="sheet"><button type="button" class="x" aria-label="Close">✕</button>'+
'<h2>'+(applied?'📍 Where this job is':'📍 Before you apply: where this job is')+'</h2>'+
'<div class="meta"><b style="color:var(--text)">'+esc(title)+'</b><br>'+esc([j.employer,payText(j),townLabel(j.city,j.state)].filter(Boolean).join(' · '))+'</div>'+
'<div class="mini"></div><div class="body"><div class="wait">Finding landmarks near this job…</div></div>'+
'<div class="acts">'+(applied?'<button type="button" class="pri" data-a="close">Done</button>':
'<button type="button" class="pri" data-a="send">'+(limited?'🔒 Link a parent to apply':(opts.label||'✅ Send application'))+'</button><button type="button" data-a="close">Cancel</button>')+'</div></div>';
s.addEventListener('mousedown',function(e){if(e.target===s)closeSheet();});
s.querySelector('.x').addEventListener('click',closeSheet);
s.querySelector('.acts').addEventListener('click',function(e){
var b=e.target.closest('button[data-a]');if(!b)return;
if(b.dataset.a==='close'){closeSheet();return;}
if(isLimited()){if(typeof window.twOpenLinkModal==='function')window.twOpenLinkModal();return;}
closeSheet();
try{window.teenApply(j.id,j.title);}catch(err){note('apply failed',err);}
});
document.body.appendChild(s);
var body=s.querySelector('.body'),mini=s.querySelector('.mini');
Promise.all([jobPoint(j),homePoint()]).then(function(r){
var p=r[0],h=r[1];
if(!$('twlm-sheet')||s!==$('twlm-sheet'))return;
if(!p){mini.classList.add('off');body.innerHTML='<p class="lead">We couldn\'t find '+esc(townLabel(j.city,j.state)||'this job\'s town')+' on the map right now. Ask the employer where the job is before your first shift.</p>';return;}
var lead=j.landmark
?'<p class="lead">📍 The employer says this job is near <b>'+esc((j.landmark.icon||'')+' '+j.landmark.name)+'</b>.</p>'
:'<p class="lead">📍 The employer didn\'t pin an exact spot, so this shows the middle of <b>'+esc(townLabel(j.city,j.state))+'</b>. Ask them for the address before your first shift.</p>';
var homeLine='';
if(h){
var mi=miles(h.pt,p.pt);
homeLine='<div class="home">🏠 '+(p.exact&&h.exact?'About <b>'+distText(mi)+'</b> from your home, '+tripText(mi)+'.':
'About <b>'+distText(mi)+'</b> from '+(h.exact?'your home':'your town')+' ('+tripText(mi)+'). The exact trip depends on the address.')+
' Check how you\'ll get there with your parent.</div>';
}
body.innerHTML=lead+'<div class="wait">Finding landmarks near this job…</div>'+homeLine;
drawMini(mini,p,h,j);
ensureAround(p.pt).then(function(res){
if(s!==$('twlm-sheet'))return;
var n=nearest(p.pt,4,j.landmark&&j.landmark.id),w=body.querySelector('.wait');
if(!n.length){w.textContent=res==='failed'?'Landmarks couldn\'t load right now. You can still apply.':'No well-known landmarks close to this spot.';return;}
var ul=document.createElement('ul');ul.setAttribute('aria-label','Landmarks near this job');
ul.innerHTML=n.map(function(x){return'<li><span>'+x.icon+'</span><span>'+esc(x.name)+'</span><span class="d">'+distText(x.mi)+'</span></li>';}).join('');
w.outerHTML='<p class="lead" style="margin-top:6px"><b>Landmarks '+(p.exact?'near this job':'in the middle of town')+':</b></p>'+ul.outerHTML;
mini._twNear=n;if(sheetMap)addMiniLandmarks(n);
});
});
return true;
};
function drawMini(mini,p,h,j){
loadLeaflet().then(function(L){
if(!document.body.contains(mini))return;
sheetMap=L.map(mini,{zoomControl:false,attributionControl:true,scrollWheelZoom:false}).setView(p.pt,p.exact?16:15);
L.tileLayer(TILES,{maxZoom:19,attribution:TILE_CREDIT}).addTo(sheetMap);
L.marker(p.pt,{icon:jobIcon(L,j,false),title:j.title,zIndexOffset:500}).addTo(sheetMap);
if(h&&h.exact&&miles(h.pt,p.pt)<3){
L.marker(h.pt,{icon:homeIcon(L)}).addTo(sheetMap);
sheetMap.fitBounds(L.latLngBounds([p.pt,h.pt]).pad(0.25),{maxZoom:16});
}
sheetMap._twJob=p.pt;
if(mini._twNear)addMiniLandmarks(mini._twNear);
setTimeout(function(){try{sheetMap&&sheetMap.invalidateSize();}catch(e){}},60);
},function(){mini.classList.add('off');});
}
function addMiniLandmarks(n){
var L=window.L;if(!L|| !sheetMap)return;
var pts=[sheetMap._twJob];
n.forEach(function(x){L.marker([x.lat,x.lon],{icon:lmIcon(L,[x.id,x.name,x.kind,x.icon,x.lat,x.lon]),title:x.name}).bindTooltip(x.name).addTo(sheetMap);pts.push([x.lat,x.lon]);});
try{sheetMap.fitBounds(L.latLngBounds(pts).pad(0.2),{maxZoom:16});}catch(e){}
}
var APPLY_RE= /(?:^|[^A-Za-z0-9_$])teenApply\(\s*([0-9]+)/;
document.addEventListener('click',function(e){
var t=e.target&&e.target.closest?e.target.closest('[onclick]'):null;
if(!t||t.closest('#twlm-sheet'))return;
var m=APPLY_RE.exec(t.getAttribute('onclick')||'');if(!m)return;
var u=me();if(!u||u.type!=='teen')return;
var j=findJob(m[1]);if(!j||jobLists().applied.some(function(x){return String(x.id)===m[1];}))return;
e.preventDefault();e.stopImmediatePropagation();
api.openSheet(m[1],{label:(t.textContent||'').indexOf('parent OK')>=0?'✅ Send (needs parent OK)':''});
},true);
function decorateCards(){
document.querySelectorAll('#browse-jobs-list .browse-card:not([data-twlm])').forEach(function(card){
var btn=card.querySelector('[onclick*="teenApply("]'),m=btn?APPLY_RE.exec(btn.getAttribute('onclick')||''):null;
card.dataset.twlm='1';
if(!m)return;
var j=findJob(m[1]);if(!j)return;
if(j.landmark&&j.landmark.name){
var near=document.createElement('div');near.className='twlm-near';
near.textContent='📍 Near '+(j.landmark.icon?j.landmark.icon+' ':'')+j.landmark.name;
var head=card.querySelector('.browse-card-head');if(head)head.insertAdjacentElement('afterend',near);
}
var acts=card.querySelector('.browse-actions');
if(acts&& !acts.querySelector('.twlm-where-btn')){
var w=document.createElement('button');w.type='button';w.className='btn-sm twlm-where-btn';w.textContent='🗺️ Where is it?';
w.addEventListener('click',function(){api.openSheet(m[1]);});
btn.insertAdjacentElement('afterend',w);
}
});
}
var decoT=null;
new MutationObserver(function(){if(decoT)return;decoT=setTimeout(function(){decoT=null;decorateCards();},60);})
.observe(document.documentElement,{childList:true,subtree:true});
var PICK_WAIT_MS=8000;
var NONE_LABEL='No landmark (teens see the town only)';
var pick={town:'',items:[],loading:null,state:'idle',seq:0,slowT:null};
function ensurePicker(){
var city=$('emp-city');if(!city||$('emp-landmark'))return;
var row=city.closest('.form-row');if(!row)return;
injectCss();
var g=document.createElement('div');g.className='form-group twlm-pick';
g.innerHTML='<label for="emp-landmark">📍 Nearest landmark <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--muted)">(optional)</span></label>'+
'<select id="emp-landmark" aria-describedby="emp-landmark-status emp-landmark-hint"><option value="">'+NONE_LABEL+'</option></select>'+
'<div class="twlm-pick-status" id="emp-landmark-status" role="status" aria-live="polite" data-state="idle">Add the city and state to see landmarks near the job.</div>'+
'<div class="twlm-hint" id="emp-landmark-hint">Teens see “near this landmark” on the job instead of your address, so they know roughly where it is. Your address is never shown.</div>';
row.insertAdjacentElement('afterend',g);
var sel=$('emp-landmark');
var later=null,kick=function(){clearTimeout(later);later=setTimeout(loadPicker,700);};
city.addEventListener('change',kick);city.addEventListener('blur',kick);
var st=$('emp-state');if(st)st.addEventListener('change',kick);
sel.addEventListener('focus',function(){loadPicker();});sel.addEventListener('mousedown',function(){loadPicker();});
$('emp-landmark-status').addEventListener('click',function(e){
var b=e.target&&e.target.closest&&e.target.closest('button[data-a="retry"]');
if(b){failedUntil=0;loadPicker(true);}
});
}
function pickerTown(){var c=($('emp-city')||{}).value||'',s=($('emp-state')||{}).value||'';c=c.trim();return c?c+(s?', '+stateName(s):''):'';}
function pickStatus(kind,html){
var el=$('emp-landmark-status');pick.state=kind;
if(!el)return;
el.dataset.state=kind;
if(el.innerHTML!==html)el.innerHTML=html;
}
var RETRY=' <button type="button" data-a="retry">Try again</button>';
function loadPicker(force){
var sel=$('emp-landmark');if(!sel)return;
var town=pickerTown();
if(!town){pick.seq++;clearTimeout(pick.slowT);pick.town='';pick.items=[];pick.loading=null;sel.innerHTML='<option value="">'+NONE_LABEL+'</option>';pickStatus('idle','Add the city and state to see landmarks near the job.');return;}
if(force!==true&&pick.town===town&&(pick.loading||pick.items.length||pick.state==='none'))return pick.loading;
var seq= ++pick.seq,keep=pick.town===town?sel.value:'';
pick.town=town;pick.items=[];
sel.innerHTML='<option value="">'+NONE_LABEL+'</option>';
pickStatus('loading','<span class="twlm-spin" aria-hidden="true"></span>Finding landmarks near '+esc(town)+'… You can keep going while this loads.');
clearTimeout(pick.slowT);
pick.slowT=setTimeout(function(){
if(seq===pick.seq&&pick.state==='loading')pickStatus('slow','Landmarks are taking too long. You can continue without one: teens will see the town, never your address.'+RETRY);
},PICK_WAIT_MS);
function done(kind,html){if(seq!==pick.seq)return;clearTimeout(pick.slowT);pickStatus(kind,html);}
var p=geocode(town).then(function(pt){
if(seq!==pick.seq)return;
if(!pt){done('failed','Couldn’t find '+esc(town)+' on the map. You can continue without a landmark.'+RETRY);return;}
return ensureCells('a',cellsIn(boxAround(pt,2.2)),pt,force===true).then(function(res){
if(seq!==pick.seq)return;
var all=landmarksIn('a',boxAround(pt,2.2)).map(function(it){return{it:it,d:miles(pt,[it[4],it[5]])};}).sort(function(a,b){return a.d-b.d;});
var groups='',count=0;
KINDS.forEach(function(K){
var mine=all.filter(function(x){return x.it[2]===K.k;}).slice(0,15).sort(function(a,b){return a.it[1].localeCompare(b.it[1]);});
if(!mine.length)return;
count+=mine.length;
groups+='<optgroup label="'+esc(K.e+' '+K.label)+'">'+mine.map(function(x){return'<option value="'+esc(x.it[0])+'">'+esc(x.it[3]+' '+x.it[1])+'</option>';}).join('')+'</optgroup>';
});
pick.items=all.map(function(x){return x.it;});
var now=sel.value||keep;
sel.innerHTML='<option value="">'+NONE_LABEL+'</option>'+groups;
if(now&&sel.querySelector('option[value="'+now.replace(/"/g,'')+'"]'))sel.value=now;
if(groups)done('ok',count+' landmark'+(count===1?'':'s')+' near '+esc(town)+'. Picking one is optional.');
else if(res==='failed')done('failed','Landmarks couldn’t load right now. You can continue without one: teens will see the town, never your address.'+RETRY);
else done('none','No landmarks found near '+esc(town)+'. Teens will see the town only.');
});
}).then(null,function(e){note('landmark picker failed',e);done('failed','Landmarks couldn’t load right now. You can continue without one.'+RETRY);});
pick.loading=p.then(function(){if(seq===pick.seq)pick.loading=null;});
return pick.loading;
}
function pickedLandmark(){
var sel=$('emp-landmark');if(!sel|| !sel.value)return null;
var it=pick.items.filter(function(x){return x[0]===sel.value;})[0];
return it?{id:it[0],name:it[1],kind:it[2],icon:it[3],lat:it[4],lon:it[5]}:null;
}
var postWrapped=false;
function wrapPostJob(){
var o=window.postJob;
if(postWrapped||typeof o!=='function')return;
postWrapped=true;
var w=async function(){
var lm=pickedLandmark(),title=(($('emp-title')||{}).value||'').trim(),t0=Date.now()-1000;
try{return await o.apply(this,arguments);}
finally{if(lm&&title)attachLandmark(lm,title,t0);}
};
window.postJob=w;
}
function attachLandmark(lm,title,t0){
var hit=false;
[typeof employerPostedJobs!=='undefined'?employerPostedJobs:[],typeof browsableJobs!=='undefined'?browsableJobs:[]].forEach(function(list){
list.forEach(function(j){if(j&&j.title===title&&typeof j.id==='number'&&j.id>=t0&& !j.landmark){j.landmark=Object.assign({},lm);hit=true;}});
});
if(hit){var sel=$('emp-landmark');if(sel)sel.value='';try{window.renderBrowseJobs&&window.renderBrowseJobs();}catch(e){}}
}
function boot(){ensurePicker();wrapPostJob();}
boot();
document.addEventListener('DOMContentLoaded',boot);
window.addEventListener('load',function(){boot();setTimeout(boot,1500);});
api.kinds=KINDS;api.geocode=geocode;api.ensureAround=ensureAround;api.nearest=nearest;api.jobPoint=jobPoint;
api.homeInfo=homeInfo;api.classify=classify;api.query=query;api.views=views;api.loadPicker=loadPicker;api.pickedLandmark=pickedLandmark;
api.pickState=function(){return{town:pick.town,state:pick.state,items:pick.items.length};};api.PICK_WAIT_MS=PICK_WAIT_MS;
api.cellsIn=cellsIn;api.ensureCells=ensureCells;
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
