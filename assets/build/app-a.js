/* TeenWork app-a.js — a built file, do not edit. Edit the files named below (assets/js, assets/css), then run: node tools/build.cjs */
/* assets/js/featpack-js.js */
try{
(function(){
const LS={
dark:()=>'tw_'+(window.currentUser?.email||'guest')+'_dark',
safeword:()=>'tw_'+(window.currentUser?.email||'guest')+'_safeword',
autoreplies:()=>'tw_'+(window.currentUser?.email||'guest')+'_autoreplies',
archive:()=>'tw_'+(window.currentUser?.email||'guest')+'_msg_archive',
attachments:()=>'tw_'+(window.currentUser?.email||'guest')+'_msg_attachments',
referral:()=>'tw_'+(window.currentUser?.email||'guest')+'_referral_code',
invites:()=>'tw_'+(window.currentUser?.email||'guest')+'_referral_count',
goals:()=>'tw_'+(window.currentUser?.email||'guest')+'_profile_unlock',
qa:()=>'tw_qa_posts',
installed:()=>'tw_pwa_dismissed',
push:()=>'tw_'+(window.currentUser?.email||'guest')+'_push_optin',
freemium:()=>'tw_'+(window.currentUser?.email||'guest')+'_emp_posts_used',
premium:()=>'tw_'+(window.currentUser?.email||'guest')+'_premium_teen',
featured:()=>'tw_'+(window.currentUser?.email||'guest')+'_featured_jobs',
stories:()=>'tw_success_stories',
wagechat:()=>'tw_'+(window.currentUser?.email||'guest')+'_wage_chat_seen',
};
const load=(k,d)=>{try{const key=typeof k==='function'?k():k;const v=localStorage.getItem(key);return v==null?d:JSON.parse(v);}catch(e){return d;}};
const save=(k,v)=>{try{const key=typeof k==='function'?k():k;localStorage.setItem(key,JSON.stringify(v));}catch(e){}};
function _isOnLandingPage(){
const active=document.querySelector('.page.active');
if(!active)return true;
const id=active.id||'';
return id==='page-landing'||id==='page-login'||id==='page-signup'||id==='page-about';
}
function _darkUserKey(){
const uid=window.currentUser?.email||'guest';
return'tw_dark_'+uid;
}
function _applyDark(on){
if(on&&_isOnLandingPage())return;
document.documentElement.classList.toggle('dark',on);
document.querySelectorAll('.darkmode-toggle').forEach(b=>b.textContent=on?'☀️ Light':'🌙 Dark');
const profileToggle=document.getElementById('settings-dark-toggle');
if(profileToggle)profileToggle.checked=on;
}
window.toggleDarkMode=function(){
const on= !document.documentElement.classList.contains('dark');
_applyDark(on);
save(_darkUserKey(),on);
if(window.showToast)showToast(on?'🌙 Dark mode on':'☀️ Light mode on','info');
if(!load('tw_dark_tip_shown',false)){
save('tw_dark_tip_shown',true);
setTimeout(()=>{
if(window.showToast)showToast('💡 Tip: Find the Dark Mode toggle in your Profile → Settings tab anytime','info',4500);
},800);
}
};
window._loadUserDarkPref=function(){
const on=load(_darkUserKey(),false);
_applyDark(on);
};
window._stripDarkForLanding=function(){
document.documentElement.classList.remove('dark');
document.querySelectorAll('.darkmode-toggle').forEach(b=>b.textContent='🌙 Dark');
if(window.currentUser?.isDemo|| !window.currentUser){
try{localStorage.removeItem('tw_dark_guest');}catch(e){}
if(window.currentUser?.email){
try{localStorage.removeItem('tw_dark_'+window.currentUser.email);}catch(e){}
}
}
};
if(load(_darkUserKey(),false)&& !_isOnLandingPage()){
document.documentElement.classList.add('dark');
document.addEventListener('DOMContentLoaded',()=>{
const t=document.getElementById('settings-dark-toggle');
if(t)t.checked=true;
document.querySelectorAll('.darkmode-toggle').forEach(b=>b.textContent='☀️ Light');
});
}
window.showKbdHelp=function(){
const old=document.getElementById('kbd-help-modal');if(old)return old.remove();
const d=document.createElement('div');
d.id='kbd-help-modal';d.className='kbd-help';
d.innerHTML=`
      <h3 style="margin-bottom:.8rem;color:var(--green);font-family:'Fraunces',serif">⌨️ Keyboard shortcuts</h3>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 14px;font-size:.87rem">
        <span><span class="kbd">g</span> <span class="kbd">h</span></span><span>Home / Browse jobs</span>
        <span><span class="kbd">g</span> <span class="kbd">m</span></span><span>Open messages</span>
        <span><span class="kbd">g</span> <span class="kbd">a</span></span><span>Applications</span>
        <span><span class="kbd">g</span> <span class="kbd">c</span></span><span>Calendar</span>
        <span><span class="kbd">/</span></span><span>Focus search</span>
        <span><span class="kbd">d</span></span><span>Toggle dark mode</span>
        <span><span class="kbd">?</span></span><span>This help</span>
        <span><span class="kbd">Esc</span></span><span>Close modal</span>
      </div>
      <div style="text-align:right;margin-top:1rem"><button class="btn-secondary" onclick="document.getElementById('kbd-help-modal').remove()">Close</button></div>`;
document.body.appendChild(d);
};
let kbdBuf='';
document.addEventListener('keydown',e=>{
if(e.target.matches('input,textarea,select'))return;
if(e.key==='?'){e.preventDefault();showKbdHelp();return;}
if(e.key==='Escape'){document.querySelectorAll('.modal-overlay.active,.msg-modal-overlay.open').forEach(m=>m.classList.remove('active','open'));document.getElementById('kbd-help-modal')?.remove();return;}
if(e.key==='d'&& !e.metaKey&& !e.ctrlKey){toggleDarkMode();return;}
if(e.key==='/'){const s=document.querySelector('#ai-job-query,#msg-search-input,input[type="search"]');if(s){e.preventDefault();s.focus();}return;}
if(e.key==='g'){kbdBuf='g';setTimeout(()=>kbdBuf='',1000);return;}
if(kbdBuf==='g'){
const map={h:'ttab-browse',m:null,a:'ttab-applications',c:'ttab-calendar'};
if(e.key==='m'){window.openMsgModal&&openMsgModal();kbdBuf='';return;}
if(map[e.key]){window.switchDashTab&&switchDashTab(null,map[e.key]);kbdBuf='';}
}
});
window.fireConfetti=function(durMs=1600){
let c=document.getElementById('confetti-canvas');
if(!c){c=document.createElement('canvas');c.id='confetti-canvas';document.body.appendChild(c);}
c.width=innerWidth;c.height=innerHeight;
const ctx=c.getContext('2d'),N=140,colors=['#2d6a4f','#e76f00','#1a5276','#6d28d9','#c0392b','#f6c90e'];
const parts=Array.from({length:N},()=>({x:innerWidth/2+(Math.random()-.5)*200,y:innerHeight/3,vx:(Math.random()-.5)*10,vy:Math.random()*-8-4,g:.28,r:Math.random()*7+3,c:colors[Math.random()*colors.length|0],rot:Math.random()*6,vr:(Math.random()-.5)*.4}));
const start=performance.now();
(function loop(t){
const elapsed=t-start;
ctx.clearRect(0,0,c.width,c.height);
parts.forEach(p=>{p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.c;ctx.fillRect(-p.r,-p.r/2,p.r*2,p.r);ctx.restore();});
if(elapsed<durMs)requestAnimationFrame(loop);
else ctx.clearRect(0,0,c.width,c.height);
})(performance.now());
};
const _origApply=window.applyToJob;
if(typeof _origApply==='function'){
window.applyToJob=function(...a){
const already=load('tw_first_apply_done',false);
_origApply.apply(this,a);
if(!already){save('tw_first_apply_done',true);setTimeout(()=>fireConfetti(2000),300);}
};
}
const badgeObs=new MutationObserver(muts=>{
muts.forEach(m=>m.addedNodes.forEach(n=>{
if(n.nodeType===1&&(n.closest?.('#page-teen,#page-parent,#page-employer')||n.id?.startsWith('page-'))){
n.querySelectorAll?.('.badge-new, [data-badge-new]').forEach(el=>{
el.classList.add('badge-unlocked');
});
}
}));
});
badgeObs.observe(document.body,{subtree:true,childList:true});
window.computeProfileCompletion=function(){
const keys=['tw_teen_profile_name','tw_teen_profile_bio','tw_teen_profile_skills','tw_portfolio','tw_teen_photo','tw_resume_built'];
let done=0;
keys.forEach(k=>{const v=localStorage.getItem(k);if(v&&v!=='null'&&v!=='""'&&v!=='[]')done++;});
return Math.round(done/keys.length*100);
};
window.renderProfileCompletionBar=function(containerId){
const el=document.getElementById(containerId);if(!el)return;
const p=computeProfileCompletion();
el.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:.82rem;margin-bottom:3px"><strong>Profile completion</strong><span>${p}%</span></div>
      <div class="profile-strength-bar"><div class="profile-strength-fill" style="width:${p}%"></div></div>
      ${p<100?`<div style="font-size:.76rem;color:var(--muted);margin-top:4px">Finish your profile for better job matches.</div>`:''}`;
};
let deferredInstall=null;
const INSTALL_LATER='tw54_install_later';
const isIOS=()=> /iPad|iPhone|iPod/.test(navigator.userAgent)&& !window.MSStream;
const standalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}catch(e){return false;}};
function installSnoozed(){try{return Date.now()-(Number(localStorage.getItem(INSTALL_LATER))||0)<30*864e5;}catch(e){return true;}}
function realMember(){const u=window.currentUser;return!!(u&&u.email&& !u.isDemo&& !window.twDemo&& !window._twDemoSandbox?.active&&u.type!=='admin'&& /^(teen|parent|employer)$/.test(u.type));}
window.twOfferInstall=function(){
const sheet=document.getElementById('featpack-install');
if(!sheet||standalone()||installSnoozed()||load(LS.installed,false)|| !realMember())return false;
if(!deferredInstall&& !isIOS())return false;
const act=document.querySelector('.page.active');
if(!act|| !/^page-(teen|parent|employer)$/.test(act.id))return false;
const msg=sheet.querySelector('p');
if(msg)msg.textContent=isIOS()&& !deferredInstall
?'Open TeenWork like an app: tap the Share button in Safari, then “Add to Home Screen”.'
:'Add TeenWork to your home screen so it opens like an app, one tap away.';
const btn=sheet.querySelector('.btn-primary');if(btn)btn.textContent=isIOS()&& !deferredInstall?'Got it':'Install';
sheet.classList.add('open');
return true;
};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
window.addEventListener('appinstalled',()=>{save(LS.installed,true);document.getElementById('featpack-install')?.classList.remove('open');});
window.featpackInstall=async function(){
const sheet=document.getElementById('featpack-install');
sheet?.classList.remove('open');
if(deferredInstall){deferredInstall.prompt();const r=await deferredInstall.userChoice;deferredInstall=null;if(r&&r.outcome==='accepted')save(LS.installed,true);else try{localStorage.setItem(INSTALL_LATER,String(Date.now()));}catch(e){}return;}
try{localStorage.setItem(INSTALL_LATER,String(Date.now()));}catch(e){}
};
window.featpackInstallLater=function(){
document.getElementById('featpack-install')?.classList.remove('open');
try{localStorage.setItem(INSTALL_LATER,String(Date.now()));}catch(e){}
};
window.enablePushNotifications=async function(){
if(!('Notification'in window)){showToast?.('Push notifications not supported in this browser','warn');return;}
const r=await Notification.requestPermission();
if(r==='granted'){save(LS.push,true);new Notification('TeenWork',{body:"🔔 You'll be notified when new jobs match your skills."});showToast?.('Push notifications enabled','success');}
else showToast?.('Push notifications blocked','warn');
};
window.makeSwipeDismiss=function(el,onDismiss){
let sx=0,dx=0,dragging=false;
el.classList.add('swipe-dismissable');
el.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;dx=0;dragging=true;el.style.transition='none';},{passive:true});
el.addEventListener('touchmove',e=>{if(!dragging)return;dx=e.touches[0].clientX-sx;el.style.transform=`translateX(${dx}px)`;el.style.opacity=String(1-Math.min(Math.abs(dx)/300,.9));},{passive:true});
el.addEventListener('touchend',()=>{
dragging=false;el.style.transition='';
if(Math.abs(dx)>120){el.classList.add('dismissing');setTimeout(()=>{onDismiss?.();el.remove();},260);}
else{el.style.transform='';el.style.opacity='';}
});
};
window.openSwipeStack=function(){
const jobs=(window.demoJobs||[]).slice(0,8);
if(!jobs.length){showToast?.('No jobs to swipe','info');return;}
const overlay=document.createElement('div');
overlay.className='modal-overlay active';
overlay.style.zIndex='9000';
overlay.innerHTML=`
      <div class="modal" style="max-width:400px;background:transparent;box-shadow:none">
        <div style="text-align:center;margin-bottom:10px"><strong style="font-family:'Fraunces',serif;color:var(--green);font-size:1.1rem">Swipe to save, skip to pass</strong></div>
        <div class="swipe-stack" id="sw-stack"></div>
        <div style="display:flex;gap:14px;justify-content:center;margin-top:14px">
          <button onclick="swipeCard('left')" style="width:54px;height:54px;border-radius:50%;border:none;background:#fff;font-size:1.4rem;box-shadow:var(--shadow-lg);cursor:pointer">❌</button>
          <button onclick="swipeCard('right')" style="width:54px;height:54px;border-radius:50%;border:none;background:var(--green);color:#fff;font-size:1.4rem;box-shadow:var(--shadow-lg);cursor:pointer">💚</button>
        </div>
        <button onclick="this.closest('.modal-overlay').remove()" style="display:block;margin:1rem auto 0;background:none;border:none;color:#fff;font-weight:700;cursor:pointer">Close</button>
      </div>`;
document.body.appendChild(overlay);
const stack=overlay.querySelector('#sw-stack');
jobs.reverse().forEach((j,i)=>{
const c=document.createElement('div');
c.className='swipe-card';c.dataset.job=j.title;
c.innerHTML=`
        <div class="swipe-stamp save">LIKE</div>
        <div class="swipe-stamp skip">NOPE</div>
        <div style="font-size:.72rem;color:var(--muted);font-weight:700">${j.category||'JOB'}</div>
        <h4>${j.title}</h4>
        <p style="font-size:.85rem;color:var(--muted);flex:1">${j.description||j.desc||'Local teen-friendly gig.'}</p>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:700;color:var(--amber)">${j.pay||'$15/hr'}</span>
          <span style="font-size:.8rem;color:var(--muted)">📍 ${j.location||j.city||'Nearby'}</span>
        </div>`;
c.style.zIndex=String(100+i);
stack.appendChild(c);
attachSwipe(c);
});
};
function attachSwipe(c){
let sx=0,dx=0,dragging=false;
const start=x=>{sx=x;dx=0;dragging=true;c.style.transition='none';};
const move=x=>{if(!dragging)return;dx=x-sx;c.style.transform=`translate(${dx}px, ${Math.abs(dx)/10}px) rotate(${dx/16}deg)`;c.querySelector('.swipe-stamp.save').style.opacity=dx>40?Math.min(dx/100,1):0;c.querySelector('.swipe-stamp.skip').style.opacity=dx<-40?Math.min(-dx/100,1):0;};
const end=()=>{dragging=false;c.style.transition='';
if(dx>120)finish('right');else if(dx<-120)finish('left');
else{c.style.transform='';c.querySelectorAll('.swipe-stamp').forEach(s=>s.style.opacity=0);}
};
function finish(dir){c.classList.add(dir==='left'?'gone-left':'gone-right');setTimeout(()=>c.remove(),260);if(dir==='right'&&window.showToast)showToast('💚 Saved to your Applications','success');}
c.addEventListener('mousedown',e=>start(e.clientX));
document.addEventListener('mousemove',e=>move(e.clientX));
document.addEventListener('mouseup',end);
c.addEventListener('touchstart',e=>start(e.touches[0].clientX),{passive:true});
c.addEventListener('touchmove',e=>move(e.touches[0].clientX),{passive:true});
c.addEventListener('touchend',end);
c._swipeFinish=finish;
}
window.swipeCard=function(dir){
const top=document.querySelectorAll('.swipe-card:not(.gone-left):not(.gone-right)');
const card=top[top.length-1];if(!card)return;
card._swipeFinish?.(dir)||card.classList.add(dir==='left'?'gone-left':'gone-right');
};
window.openCameraUpload=function(onDataUrl){
const inp=document.createElement('input');
inp.type='file';inp.accept='image/*';inp.capture='user';
inp.onchange=()=>{
const f=inp.files?.[0];if(!f)return;
const r=new FileReader();
r.onload=()=>{onDataUrl?.(r.result);if(!onDataUrl){save('tw_teen_photo',r.result);showToast?.('📷 Profile photo updated','success');}};
r.readAsDataURL(f);
};
inp.click();
};
window.openFeelsWrong=()=>document.getElementById('feelsWrongModal').classList.add('active');
window.closeFeelsWrong=()=>document.getElementById('feelsWrongModal').classList.remove('active');
window.submitFeelsWrong=function(){
const note=document.getElementById('feels-wrong-note').value.trim();
const log=load('tw_safety_alerts',[]);
const alertEntry={ts:Date.now(),note,page:location.hash||'msg'};
log.push(alertEntry);
save('tw_safety_alerts',log);
const teenName=window.currentUser?.name||'A teen';
const parentEmail=window.currentUser?.parentEmail||'';
const msgBody=`🚨 SAFETY ALERT from TeenWork\n\n${teenName} pressed the SOS button.\n\nNote: ${note||'(no note provided)'}\n\nPlease check in with them immediately.\n\nTime: ${new Date().toLocaleString()}\n\n— TeenWork Safety System`;
let emailSent=false,parentSend=null;
if(typeof emailjs!=='undefined'&&parentEmail){
try{
parentSend=emailjs.send('teenwork_service','safety_alert',{
to_email:parentEmail,
to_name:'Parent/Guardian',
from_name:'TeenWork Safety',
teen_name:teenName,
alert_note:note||'(no note provided)',
alert_time:new Date().toLocaleString(),
});
emailSent=true;
}catch(e){console.warn('EmailJS SOS failed:',e);}
}
if(typeof _adminSaveSupportMessage==='function'){
_adminSaveSupportMessage({
name:teenName,
context:'🚨 SOS BUTTON PRESSED',
body:msgBody,
email:window.currentUser?.email||'unknown',
userType:'teen',
time:new Date().toISOString(),
});
}
const adminEmail='ayaquarrierdraper@gmail.com';
const subject=encodeURIComponent(`🚨 SOS Alert — ${teenName} needs help`);
const body=encodeURIComponent(msgBody);
try{
const a=document.createElement('a');
a.href=`mailto:${parentEmail||adminEmail}?subject=${subject}&body=${body}`;
a.style.display='none';
document.body.appendChild(a);
a.click();
setTimeout(()=>a.remove(),1000);
}catch(e){}
closeFeelsWrong();
if(!parentSend){showToast?.('🚨 Alert sent to the TeenWork team. If you are in danger, call 911.','warn');return;}
Promise.resolve(parentSend).then(
()=>showToast?.('🚨 Alert sent to your parent and the TeenWork team. If you are in danger, call 911.','warn'),
()=>showToast?.('🚨 Alert sent to the TeenWork team, but the email to your parent did not go through. If an email draft opened, send it, and tell a trusted adult now. If you are in danger, call 911.','warn'));
};
window.openSafeWord=function(){
const cur=load(LS.safeword,'');
document.getElementById('safe-word-input').value=cur||'';
document.getElementById('safe-word-current').textContent=cur?`Current safe word: ${cur.replace(/./g,'•')}`:'No safe word set yet.';
document.getElementById('safeWordModal').classList.add('active');
};
window.closeSafeWord=()=>document.getElementById('safeWordModal').classList.remove('active');
window.saveSafeWord=function(){
const v=document.getElementById('safe-word-input').value.trim().toLowerCase();
if(v.length<3){showToast?.('Pick a word with at least 3 letters','warn');return;}
save(LS.safeword,v);closeSafeWord();showToast?.('🔐 Safe word saved — keep it private','success');
};
window.checkSafeWord=function(msg){
const sw=load(LS.safeword,'');
if(sw&&msg&&msg.toLowerCase().includes(sw)){
const log=load('tw_safety_alerts',[]);
log.push({ts:Date.now(),note:'SAFE WORD TRIGGERED',page:'msg'});
save('tw_safety_alerts',log);
return true;
}return false;
};
['sendMessage','sendMsg'].forEach(fn=>{
const orig=window[fn];if(typeof orig==='function'){
window[fn]=function(...a){try{const m=a[0]||document.querySelector('#msg-input')?.value;checkSafeWord(m);}catch(e){}return orig.apply(this,a);};
}
});
window.openAutoReply=function(){
renderAutoReplies();
document.getElementById('autoReplyModal').classList.add('active');
};
window.closeAutoReply=()=>document.getElementById('autoReplyModal').classList.remove('active');
function renderAutoReplies(){
const list=load(LS.autoreplies,[
"Thanks for reaching out! I'm available weekdays after 4pm.",
"Sounds great — I can start this weekend.",
"Could you share more details about the job?",
"I'll need to check with my parent and get back to you."
]);
save(LS.autoreplies,list);
const el=document.getElementById('auto-reply-list');
el.innerHTML=list.map((t,i)=>`
      <div style="display:flex;gap:8px;align-items:center;background:var(--bg);padding:8px 10px;border-radius:8px">
        <div style="flex:1;font-size:.85rem">${t.replace(/</g,'&lt;')}</div>
        <button class="btn-sm" onclick="sendAutoReply(${i})" style="background:var(--green);color:#fff;border:none;padding:5px 10px;border-radius:6px;font-weight:700;font-size:.78rem;cursor:pointer">Send</button>
        <button onclick="deleteAutoReply(${i})" style="background:none;border:none;color:var(--red);font-size:1rem;cursor:pointer">✕</button>
      </div>`).join('');
}
window.addAutoReply=function(){
const v=document.getElementById('auto-reply-input').value.trim();if(!v)return;
const list=load(LS.autoreplies,[]);list.push(v);save(LS.autoreplies,list);
document.getElementById('auto-reply-input').value='';renderAutoReplies();
};
window.deleteAutoReply=function(i){const list=load(LS.autoreplies,[]);list.splice(i,1);save(LS.autoreplies,list);renderAutoReplies();};
window.sendAutoReply=function(i){
const list=load(LS.autoreplies,[]);const t=list[i];if(!t)return;
const inp=document.querySelector('#msg-input,input[placeholder*="message" i],textarea[placeholder*="message" i]');
if(inp){inp.value=t;inp.focus();}
closeAutoReply();
showToast?.('⚡ Template ready — press send','info');
};
window.archiveConversation=function(contact){
const arc=load(LS.archive,[]);if(!arc.includes(contact))arc.push(contact);save(LS.archive,arc);
showToast?.(`📦 ${contact} archived`,'info');
document.querySelector(`[data-msg-contact="${contact}"]`)?.remove();
};
window.attachFileToMsg=function(){
const inp=document.createElement('input');inp.type='file';inp.accept='image/*,.pdf,.doc,.docx';
inp.onchange=()=>{const f=inp.files?.[0];if(!f)return;
const body=document.querySelector('#msg-thread-body, .msg-thread-body, #msg-main-area');
if(body){
const d=document.createElement('div');
d.className='msg-bubble outgoing';
d.innerHTML=`<span class="msg-att">📎 ${f.name} <span style="color:var(--muted)">(${Math.round(f.size/1024)} KB)</span></span>`;
body.appendChild(d);body.scrollTop=body.scrollHeight;
}
showToast?.(`📎 Attached ${f.name}`,'success');
};
inp.click();
};
function getReferralCode(){
let c=load(LS.referral,null);
if(!c){c='TEEN-'+Math.random().toString(36).slice(2,7).toUpperCase();save(LS.referral,c);}
return c;
}
window.openReferral=function(){
if(typeof window.twShare==='function'){window.twShare({source:'refer',sheet:true});return;}
document.getElementById('referral-code-display').textContent=getReferralCode();
document.getElementById('referral-count').textContent=load(LS.invites,0);
document.getElementById('referralModal').classList.add('active');
};
window.closeReferral=()=>document.getElementById('referralModal').classList.remove('active');
window.copyReferralCode=function(){
const c=getReferralCode();
if(typeof window.twShare==='function'){window.twShare({source:'refer',sheet:true});return;}
navigator.clipboard?.writeText(`Join me on TeenWork, the free app for safe local teen jobs: https://teenwork.ayaqd.com/`);
showToast?.('📋 Code + link copied','success');
save(LS.invites,load(LS.invites,0)+1);
document.getElementById('referral-count').textContent=load(LS.invites,0);
};
window.submitSchool=function(){
const val=id=>(document.getElementById(id)?.value||'').trim();
const name=val('school-name');
const contact=val('school-contact');
const email=val('school-email');
const size=val('school-size');
const notes=val('school-notes');
if(!name|| !email){showToast?.('Please fill in your school name and email','error');return;}
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showToast?.('Please enter a valid school email address','error');return;}
const body=`School / Organization: ${name}\nContact: ${contact||'(not given)'}\nSchool email: ${email}\nApprox. students: ${size||'(not given)'}\n\nHoping to use TeenWork for:\n${notes||'(not given)'}`;
const reqs=load('tw_school_reqs',[]);reqs.push({name,contact,email,size,notes,ts:Date.now()});save('tw_school_reqs',reqs);
if(typeof window._adminSaveSupportMessage!=='function'){
console.warn('School partnership request not delivered: _adminSaveSupportMessage missing');
showToast?.('Something went wrong sending your request. Please use the Help & Support button instead.','error');
return;
}
window._adminSaveSupportMessage({
name,
context:'🏫 School Partnership Request',
body,
email,
userType:'school',
time:new Date().toISOString()
});
['school-name','school-contact','school-email','school-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
showToast?.('✅ Partnership request sent — we will reach out within 2 business days','success');
setTimeout(()=>gotoPage('landing'),1200);
};
window.openWageCoach=function(){
const prompt=`You are a friendly career coach for a 14–17 year old teen in the US. Teach them in 6 short bullets how to politely negotiate their pay for a local gig (lawn care, babysitting, tutoring, etc.). Cover: researching fair rates, anchoring high but respectfully, highlighting value/experience, offering trade-offs (bundled services), scripted example lines they can say, and when to walk away. Keep it age-appropriate, confident, no pressure.`;
if(typeof window.openAI==='function')return openAI(prompt);
if(typeof window.callGemini==='function'){callGemini(prompt);return;}
showToast?.('AI coach unavailable — try again later','warn');
};
function randPct(){return 10+Math.random()*80;}
window.renderJobMap=function(containerId){
const el=document.getElementById(containerId);if(!el)return;
const jobs=(window.demoJobs||[]).slice(0,14);
el.innerHTML=`<div class="job-map-wrap" id="jm-wrap">
      <div style="position:absolute;top:10px;left:12px;font-weight:700;color:var(--green);font-size:.82rem;background:var(--card);padding:5px 10px;border-radius:8px;box-shadow:var(--shadow)">📍 Jobs near you</div>
    </div>`;
const wrap=el.querySelector('#jm-wrap');
jobs.forEach((j,i)=>{
const p=document.createElement('div');p.className='job-map-pin';
p.style.top=randPct()+'%';p.style.left=randPct()+'%';
p.innerHTML=`<span>${(j.category||'J')[0].toUpperCase()}</span>`;
p.title=`${j.title} — ${j.pay||''} — ${j.location||''}`;
p.onclick=()=>showToast?.(`${j.title} · ${j.pay||''} · ${j.location||''}`,'info');
wrap.appendChild(p);
});
};
const SEED_QA=[
{q:'How do I ask for a raise?',a:'Pick a calm moment, note what you\'ve delivered (reliability, extra tasks), propose a specific number, and be ready to hear "later" gracefully.',author:'TeenWork'},
{q:"Can I work 6 hours on a school night?",a:"Most states cap school-night hours at 3 for 14–15 year olds. Check your state's rules — we show them on each job.",author:'Safety Bot'},
{q:"My employer pays late — what now?",a:"First message them politely. If it happens again, hit 'Something feels wrong' and we'll loop in your parent.",author:'Safety Bot'},
];
window.renderQA=function(containerId){
const el=document.getElementById(containerId);if(!el)return;
const list=load(LS.qa,SEED_QA);
save(LS.qa,list);
el.innerHTML=`
      <div style="display:flex;gap:8px;margin-bottom:1rem">
        <input id="qa-q" placeholder="Ask the community…" style="flex:1;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text)">
        <button class="btn-primary" onclick="postQA()">Ask</button>
      </div>
      <div id="qa-list">${list.map((p,i)=>`
        <div class="qa-card">
          <h4>${p.q.replace(/</g,'&lt;')}</h4>
          <p>${(p.a||'No answers yet — be the first to help.').replace(/</g,'&lt;')}</p>
          <div class="qa-meta"><span>— ${p.author||'Anon'}</span><span>👍 ${p.votes||0}</span>
            <button onclick="voteQA(${i})" style="background:none;border:none;color:var(--green);font-weight:700;cursor:pointer">Helpful</button>
          </div>
        </div>`).join('')}</div>`;
};
window.postQA=function(){
const q=document.getElementById('qa-q').value.trim();if(!q)return;
const list=load(LS.qa,SEED_QA);list.unshift({q,a:'',author:'You',votes:0});save(LS.qa,list);
document.getElementById('qa-q').value='';renderQA('qa-board-container');
};
window.voteQA=function(i){const list=load(LS.qa,SEED_QA);list[i].votes=(list[i].votes||0)+1;save(LS.qa,list);renderQA('qa-board-container');};
const SEED_STORIES=[];
const notSample=s=> !(s&&window.twIsOldSample&&(window.twIsOldSample(s.name)||window.twIsOldSample(s.quote)));
window.renderStories=function(containerId){
const el=document.getElementById(containerId);if(!el)return;
const list=(load(LS.stories,SEED_STORIES)||[]).filter(notSample);save(LS.stories,list);
el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">${list.map(s=>`
      <div style="background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:1rem">
        <div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;font-weight:700">${s.role}</div>
        <p style="font-size:.9rem;margin:6px 0 8px;line-height:1.5">"${s.quote}"</p>
        <div style="font-size:.78rem;color:var(--green);font-weight:700">— ${s.name}</div>
      </div>`).join('')}</div>`;
};
window.renderAdmin=function(){
const allStats=(function(){
try{return JSON.parse(localStorage.getItem('tw_admin_stats')||'{}');}catch(e){return{};}
})();
const teens=allStats.teens||0;
const parents=allStats.parents||0;
const employers=allStats.employers||0;
const jobsPosted=allStats.jobsPosted||0;
const hires=allStats.hires||0;
const msgsCount=(function(){try{return JSON.parse(localStorage.getItem('tw_admin_support')||'[]').length;}catch(e){return 0;}})();
const reviewsCount=(function(){try{return JSON.parse(localStorage.getItem('tw_v17_reviews')||'[]').length;}catch(e){return 0;}})();
document.getElementById('admin-stats').innerHTML=`
      <div class="stat-card"><div class="stat-label">Teens</div><div class="stat-value">${teens}</div><div class="stat-sub">registered</div></div>
      <div class="stat-card amber"><div class="stat-label">Jobs Posted</div><div class="stat-value">${jobsPosted}</div><div class="stat-sub">by employers</div></div>
      <div class="stat-card blue"><div class="stat-label">Hires</div><div class="stat-value">${hires}</div><div class="stat-sub">completed</div></div>
      <div class="stat-card purple"><div class="stat-label">Support Msgs</div><div class="stat-value">${msgsCount}</div><div class="stat-sub">${reviewsCount} review${reviewsCount!==1?'s':''}</div></div>`;
document.getElementById('admin-category-chart').innerHTML=`<div style="color:var(--muted);font-size:.85rem;padding:.5rem 0">No job category data yet — will populate when jobs are posted.</div>`;
document.getElementById('admin-top-employers').innerHTML=`<div style="color:var(--muted);font-size:.85rem;padding:.5rem 0">No employer data yet — will populate when employers sign up and post jobs.</div>`;
document.getElementById('admin-health').innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
        <div><div style="font-size:.78rem;color:var(--muted)">Total users</div><div style="font-size:1.4rem;font-weight:900;color:var(--green)">${teens+parents+employers}</div></div>
        <div><div style="font-size:.78rem;color:var(--muted)">Support messages</div><div style="font-size:1.4rem;font-weight:900;color:var(--green)">${msgsCount}</div></div>
        <div><div style="font-size:.78rem;color:var(--muted)">Reviews</div><div style="font-size:1.4rem;font-weight:900;color:var(--amber)">${reviewsCount}</div></div>
      </div>`;
renderJobMap('admin-heatmap');
};
window.checkEmployerPostLimit=function(){
const used=load(LS.freemium,0);
const premium=load('tw_emp_premium',false);
if(premium||used<3)return true;
showToast?.('You\'ve used your 3 free posts. Upgrade to Pro to keep posting.','warn');
setTimeout(()=>gotoPage('pricing'),800);
return false;
};
window.incrementEmployerPost=function(){save(LS.freemium,load(LS.freemium,0)+1);};
window.boostJobListing=function(jobId){
showToast?.('Featured job boosts aren\'t available yet. Nothing was charged.','info');
};
window.isJobFeatured=function(jobId){return load(LS.featured,[]).includes(jobId);};
function patchNav(){
if(typeof window.buildNavTabs!=='function'){return setTimeout(patchNav,300);}
const orig=window.buildNavTabs;
window.buildNavTabs=function(role){
orig(role);
const extras={
parent:[['🔐','Safe Word','open-safeword']],
teen:[['🎁','Refer','open-referral'],['🔐','Safe Word','open-safeword'],['🌙','Dark Mode','toggle-dark']],
employer:[['💳','Pricing','page-pricing-link'],['🏫','Schools','page-school-link'],['🌙','Dark Mode','toggle-dark']]
};
const more=extras[role]||[];
window._mobileMoreItems=[...(window._mobileMoreItems||[]),...more];
injectDesktopTabs(role);
injectNewPanels(role);
injectHeaderButtons(role);
};
}
function injectHeaderButtons(role){
const header=document.querySelector(`#page-${role} .dash-header > div:last-child`);
if(!header||header.querySelector('.darkmode-toggle'))return;
}
function injectDesktopTabs(role){
if(role==='teen'){
const strip=document.querySelector('#page-teen [style*="border-bottom:2px solid var(--border)"], #teen-desktop-tabs');
const anyBtn=document.querySelector('button.tdtab, button[onclick*="ttab-browse"]');
const host=anyBtn?anyBtn.parentElement:strip;
if(host&& !document.getElementById('tdtab-map')){
host.insertAdjacentHTML('beforeend',`
          <button class="tdtab" id="tdtab-map" onclick="switchDashTab(this,'ttab-map');renderJobMap('job-map-container')" style="color:var(--blue);font-weight:700">🗺️ Job Map</button>
          <button class="tdtab" id="tdtab-qa" onclick="switchDashTab(this,'ttab-qa');renderQA('qa-board-container')" style="color:var(--purple);font-weight:700">💬 Q&amp;A</button>
          <button class="tdtab" id="tdtab-stories" onclick="switchDashTab(this,'ttab-stories');renderStories('stories-container')" style="color:var(--amber);font-weight:700">🌟 Stories</button>`);
}
}
if(role==='parent'){
const host=document.getElementById('parent-desktop-tabs');
if(host&& !document.getElementById('pdtab-admin')){
host.insertAdjacentHTML('beforeend',`
          <button class="pdtab" id="pdtab-admin" onclick="gotoPage('admin');setTimeout(renderAdmin, 80)" style="color:var(--purple);font-weight:700">📊 Admin</button>`);
}
}
if(role==='employer'){
const anyBtn=document.querySelector('button[onclick*="etab-post"]');
const host=anyBtn?anyBtn.parentElement:null;
if(host&& !document.getElementById('edtab-pricing')){
host.insertAdjacentHTML('beforeend',`
          <button class="edtab" id="edtab-pricing" onclick="gotoPage('pricing')" style="color:var(--amber);font-weight:700">💳 Pricing</button>`);
}
}
}
function injectNewPanels(role){
if(role==='teen'){
const teenRoot=document.querySelector('#page-teen .dashboard');
if(teenRoot&& !document.getElementById('ttab-map')){
const wrap=document.createElement('div');
wrap.innerHTML=`
          <div id="ttab-map" class="tab-panel">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:10px">
              <div><h2 style="font-family:'Fraunces',serif;font-size:1.4rem;color:var(--green)">🗺️ Jobs on the map</h2><p style="font-size:.85rem;color:var(--muted)">Tap a pin to preview the job. Pins are approximate for privacy.</p></div>
              <button class="btn-primary" onclick="openSwipeStack()" style="font-size:.85rem;padding:8px 16px">💚 Swipe mode</button>
            </div>
            <div id="job-map-container"></div>
          </div>
          <div id="ttab-qa" class="tab-panel">
            <div style="margin-bottom:1rem"><h2 style="font-family:'Fraunces',serif;font-size:1.4rem;color:var(--green)">💬 Community Q&amp;A</h2><p style="font-size:.85rem;color:var(--muted)">Ask teens, parents, and employers. Anonymous by default.</p></div>
            <div id="qa-board-container"></div>
          </div>
          <div id="ttab-stories" class="tab-panel">
            <div style="margin-bottom:1rem"><h2 style="font-family:'Fraunces',serif;font-size:1.4rem;color:var(--green)">🌟 Success stories</h2><p style="font-size:.85rem;color:var(--muted)">Real teens, parents, and employers using TeenWork.</p></div>
            <div id="stories-container"></div>
            <div style="background:var(--green-pale);border-radius:14px;padding:1rem;margin-top:1.2rem;text-align:center">
              <strong style="color:var(--green)">Got a story?</strong>
              <p style="font-size:.85rem;color:var(--muted);margin:4px 0 10px">Share yours — we feature new ones weekly.</p>
              <button class="btn-primary" onclick="showToast('Thanks — we\\'ll reach out soon!','success')">Share my story</button>
            </div>
            <div style="margin-top:1.4rem;text-align:center;font-size:.85rem;color:var(--muted)">
              🏫 <a onclick="gotoPage('school')" style="color:var(--purple);font-weight:700;cursor:pointer">Bring TeenWork to your school</a>
            </div>
          </div>`;
teenRoot.appendChild(wrap);
const browse=document.getElementById('ttab-browse');
if(browse&& !document.getElementById('teen-profile-completion')){
const bar=document.createElement('div');
bar.id='teen-profile-completion';
bar.style.cssText='background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:10px 14px;margin-bottom:1rem';
browse.insertBefore(bar,browse.firstChild);
renderProfileCompletionBar('teen-profile-completion');
}
const aiTab=document.getElementById('ttab-ai');
if(aiTab&& !document.getElementById('wage-coach-btn')){
const btn=document.createElement('button');
btn.id='wage-coach-btn';btn.className='btn-primary';
btn.style.cssText='margin:0 0 1rem;background:var(--amber)';
btn.textContent='💰 Wage Negotiation Coach';
btn.onclick=openWageCoach;
aiTab.insertBefore(btn,aiTab.firstChild);
}
const hdr=document.getElementById('teen-name-header');
if(hdr&&load(LS.premium,false)&& !hdr.parentElement.querySelector('.premium-teen-badge')){
hdr.insertAdjacentHTML('afterend',' <span class="premium-teen-badge">⭐ Premium</span>');
}
}
hookMsgModal();
}
if(role==='employer'){
const eTab=document.getElementById('etab-post');
if(eTab&& !document.getElementById('emp-freemium-banner')){
const used=load(LS.freemium,0);
const banner=document.createElement('div');
banner.id='emp-freemium-banner';
banner.style.cssText='background:var(--amber-pale);border:1.5px solid var(--amber);border-radius:12px;padding:10px 14px;margin-bottom:1rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
banner.innerHTML=`<strong style="color:var(--amber)">Starter plan:</strong> <span style="flex:1;font-size:.88rem">${Math.max(0,3-used)} free posts left</span> <button class="btn-primary" style="padding:6px 14px;font-size:.8rem;background:var(--amber)" onclick="gotoPage('pricing')">Upgrade</button>`;
eTab.insertBefore(banner,eTab.firstChild);
}
}
}
function hookMsgModal(){
const modal=document.getElementById('msgModal');
if(!modal||modal.dataset.fpHooked)return;
modal.dataset.fpHooked='1';
const head=modal.querySelector('.msg-sidebar-head');
if(head&& !document.getElementById('msg-sidebar-tools')){
const tools=document.createElement('div');
tools.id='msg-sidebar-tools';
tools.style.cssText='display:flex;gap:6px;margin-top:8px;flex-wrap:wrap';
tools.innerHTML=`
        <button onclick="attachFileToMsg()" title="Attach" style="flex:1;padding:6px 8px;border:1px solid var(--border);background:var(--card);color:var(--text);border-radius:8px;font-size:.76rem;font-weight:600;cursor:pointer">📎 Attach</button>
        <button onclick="openAutoReply()" title="Templates" style="flex:1;padding:6px 8px;border:1px solid var(--border);background:var(--card);color:var(--text);border-radius:8px;font-size:.76rem;font-weight:600;cursor:pointer">⚡ Reply</button>
        <button onclick="openSafeWord()" title="Safe word" style="flex:1;padding:6px 8px;border:1px solid var(--border);background:var(--card);color:var(--text);border-radius:8px;font-size:.76rem;font-weight:600;cursor:pointer">🔐 Safe</button>`;
head.appendChild(tools);
}
const fab=document.getElementById('featpack-emergency');
new MutationObserver(()=>{fab.style.display=modal.classList.contains('open')?'flex':'none';}).observe(modal,{attributes:true,attributeFilter:['class']});
}
function patchMobileMore(){
if(typeof window.openMobileMoreDrawer!=='function')return setTimeout(patchMobileMore,300);
const orig=window.openMobileMoreDrawer;
window.openMobileMoreDrawer=function(){
orig.apply(this,arguments);
setTimeout(()=>{
document.querySelectorAll('.mobile-more-item, [data-more-action]').forEach(el=>{
const txt=el.textContent||'';
const mapping={
'open-referral':openReferral,'open-safeword':openSafeWord,'open-kbd':showKbdHelp,
'toggle-dark':toggleDarkMode,'open-wagecoach':openWageCoach,
'page-admin-link':()=>{gotoPage('admin');setTimeout(renderAdmin,80);},
'page-pricing-link':()=>gotoPage('pricing'),
'page-school-link':()=>gotoPage('school'),
};
Object.entries(mapping).forEach(([k,fn])=>{
const btn=document.querySelector(`[data-tabid="${k}"], [onclick*="${k}"]`);
if(btn&& !btn.dataset.fpBound){btn.dataset.fpBound='1';btn.onclick=(e)=>{e.preventDefault();fn();document.getElementById('mobile-more-drawer')?.remove();document.getElementById('mobile-more-scrim')?.remove();};}
});
});
},50);
};
}
function boot(){
patchNav();patchMobileMore();
const wire=()=>document.querySelectorAll('[data-dismissable]:not([data-fp-wired])').forEach(el=>{
el.dataset.fpWired='1';makeSwipeDismiss(el,()=>{const k=el.dataset.dismissId;if(k){const seen=load('tw_seen_notifs',[]);seen.push(k);save('tw_seen_notifs',seen);}});
});
let _wireTimer=null;
const wireDebounced=()=>{clearTimeout(_wireTimer);_wireTimer=setTimeout(wire,400);};
new MutationObserver(wireDebounced).observe(document.body,{subtree:true,childList:true});
wire();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
/* assets/js/featpack-v24-js.js */
try{
(function(){
'use strict';
const TAB_GROUPS={
parent:[
{id:'home',label:'🏠 Home',tabs:[['ptab-overview','Overview'],['ptab-approvals','Approvals'],['ptab-ratings','Ratings']]},
{id:'safety',label:'🛡 Safety',tabs:[['ptab-controls','Controls'],['ptab-notifications','Notifications'],['ptab-trusted','Employers saved by you']]},
{id:'updates',label:'📬 Updates',tabs:[['ptab-weekly','Weekly Digest'],['ptab-savings','Savings Goals']]},
{id:'family',label:'👨‍👩‍👧 Family',tabs:[['ptab-teens','My Teens']]},
],
teen:[
{id:'jobs',label:'🔍 Jobs',tabs:[['ttab-browse','Browse'],['ttab-applications','Applied'],['ttab-tracker','Pipeline'],['ttab-map','Map'],['ttab-calendar','Calendar']]},
{id:'me',label:'👤 Account',tabs:[['ttab-resume','Profile & Settings'],['ttab-portfolio','Portfolio'],['ttab-references','References'],['ttab-badges','Badges'],['ttab-leaderboard','Leaderboard']]},
{id:'work',label:'💼 Work',tabs:[['ttab-worklog','Hours'],['ttab-earnings','Earnings'],['ttab-savings','Savings']]},
{id:'grow',label:'🤖 Grow',tabs:[['ttab-ai','AI Coach'],['ttab-lessons','Lessons'],['ttab-firstjob','First Job'],['ttab-letters','Rec Letters'],['ttab-qa','Q&A'],['ttab-stories','Stories']]},
{id:'verify',label:'🛡️ Verify',tabs:[['verify','Verification']]},
],
employer:[
{id:'pipeline',label:'📝 Pipeline',tabs:[['etab-post','Post'],['etab-applicants','Applicants'],['etab-active','Active Jobs']]},
{id:'comms',label:'💬 Comms',tabs:[['etab-ai','AI Tools'],['etab-letters','Letters'],['etab-bulkmsg','Bulk Message'],['etab-schedule','Schedule']]},
{id:'grow',label:'📊 Grow',tabs:[['etab-analytics','Analytics'],['etab-reviews','Reviews'],['etab-profile','Profile']]},
{id:'trust',label:'🛡 Trust',tabs:[['etab-bgcheck','Verification']]},
],
};
function renderGroupedNav(role){
const page=document.getElementById('page-'+role);
if(!page||page.querySelector('.grp-tabs[data-role="'+role+'"]'))return;
const existing=page.querySelector('#parent-desktop-tabs, #teen-desktop-tabs, #employer-desktop-tabs');
if(existing)existing.style.display='none';
page.querySelectorAll('#tdtab-map,#tdtab-qa,#tdtab-stories,#pdtab-admin,#edtab-pricing').forEach(b=>b.style.display='none');
const dash=page.querySelector('.dashboard');
if(!dash)return;
const header=dash.querySelector('.dash-header');
if(!header)return;
const groups=TAB_GROUPS[role]||[];
const nav=document.createElement('div');
nav.className='grp-tabs';
nav.dataset.role=role;
nav.innerHTML=groups.map((g,i)=>`<button class="grp-tab${i===0?' active':''}" data-grp="${g.id}">${g.label}</button>`).join('');
const sub=document.createElement('div');
sub.className='subtab-row';
sub.dataset.role=role;
header.insertAdjacentElement('afterend',nav);
nav.insertAdjacentElement('afterend',sub);
function showGroup(gid){
const g=groups.find(x=>x.id===gid);if(!g)return;
nav.querySelectorAll('.grp-tab').forEach(b=>b.classList.toggle('active',b.dataset.grp===gid));
sub.innerHTML=g.tabs.map(([tid,label],i)=>`<button class="subtab${i===0?' active':''}" data-tid="${tid}">${label}</button>`).join('');
if(g.tabs[0])switchTo(g.tabs[0][0]);
sub.querySelectorAll('.subtab').forEach(b=>b.onclick=()=>{
sub.querySelectorAll('.subtab').forEach(x=>x.classList.remove('active'));
b.classList.add('active');
switchTo(b.dataset.tid);
});
}
function switchTo(tabId){
if(tabId==='page-admin-link'){window.gotoPage&&gotoPage('admin');setTimeout(()=>window.renderAdmin&&renderAdmin(),80);return;}
if(tabId==='ttab-map'){window.switchDashTab&&switchDashTab(null,tabId);setTimeout(()=>window.renderJobMap&&renderJobMap('job-map-container'),60);return;}
if(tabId==='ttab-qa'){window.switchDashTab&&switchDashTab(null,tabId);setTimeout(()=>window.renderQA&&renderQA('qa-board-container'),60);return;}
if(tabId==='ttab-stories'){window.switchDashTab&&switchDashTab(null,tabId);setTimeout(()=>window.renderStories&&renderStories('stories-container'),60);return;}
window.switchDashTab&&switchDashTab(null,tabId);
}
nav.querySelectorAll('.grp-tab').forEach(b=>b.onclick=()=>showGroup(b.dataset.grp));
showGroup(groups[0].id);
}
function patchNavV24(){
if(typeof window.buildNavTabs!=='function')return setTimeout(patchNavV24,300);
const orig=window.buildNavTabs;
window.buildNavTabs=function(role){
orig(role);
setTimeout(()=>renderGroupedNav(role),40);
};
}
function gateDemoData(){
if(typeof window.launchDashboard!=='function')return setTimeout(gateDemoData,300);
const orig=window.launchDashboard;
window.launchDashboard=function(){
orig.apply(this,arguments);
const isDemo= !!(window.currentUser&&window.currentUser.isDemo);
window.DEMO_MODE=isDemo;
if(!isDemo){
try{
if(Array.isArray(window.demoJobs))window.demoJobs.length=0;
if(Array.isArray(window.demoNotifs))window.demoNotifs.length=0;
if(Array.isArray(window.demoApplicants))window.demoApplicants.length=0;
if(Array.isArray(window.browsableJobs))window.browsableJobs.length=0;
window.renderBrowseJobs&&renderBrowseJobs();
window.renderTeenDashboard&&renderTeenDashboard();
window.renderEmployerDashboard&&renderEmployerDashboard();
window.renderParentDashboard&&renderParentDashboard();
}catch(e){console.warn('demo-gate:',e);}
}
};
}
function complianceCheck(job){
const issues=[];
const S=window.STATE_DATA||{};
const rules=S[job.state]||{minAge:14,schoolWeekMax:18,summerMax:40,nightCurfew:'10pm'};
const HAZARDOUS= /(roofing|mining|explosive|meat slicer|meat grinder|forklift|chainsaw|driving|operate.+machinery|demolition|power saw|tractor|crane|scaffold|hazmat|asbestos|welding)/i;
if(HAZARDOUS.test(job.desc||'')||HAZARDOUS.test(job.title||'')){
issues.push({level:'block',reason:'Federal child-labor law prohibits minors from operating hazardous equipment or performing high-risk work.'});
}
if(typeof job.pay==='number'&&job.pay>0&&job.pay<5){
issues.push({level:'block',reason:`Pay of $${job.pay}/${job.payType} is below minimum wage for minors.`});
}
if(typeof job.minAge==='number'&&job.minAge<(rules.minAge||14)){
issues.push({level:'block',reason:`${job.state||'This state'} requires minimum age ${rules.minAge||14} for paid work.`});
}
if(typeof job.maxHours==='number'&&job.maxHours>40){
issues.push({level:'block',reason:'Federal law caps minors at 40 hrs/week (8 hrs/day during school breaks).'});
}
if(typeof job.maxHours==='number'&&rules.schoolWeekMax&&job.maxHours>rules.schoolWeekMax){
issues.push({level:'warn',reason:`${job.state} caps school-week hours at ${rules.schoolWeekMax} for ages under 16. Your cap of ${job.maxHours} will only apply to teens 16+.`});
}
if(/adult content|nude|explicit|nsfw|escort|bar\s+(staff|tend)|tobacco|alcohol|vape|cannabis|weed|marijuana/i.test(`${job.title} ${job.desc||''}`)){
issues.push({level:'block',reason:'Jobs involving adult/age-restricted products or environments are not permitted for minors.'});
}
return issues;
}
window.complianceCheck=complianceCheck;
function patchPostJob(){
if(typeof window.postJob!=='function')return setTimeout(patchPostJob,300);
const orig=window.postJob;
window.postJob=async function(...a){
const g=id=>document.getElementById(id);
const job={
title:g('emp-title')?.value.trim(),
type:g('emp-type')?.value,
pay:parseFloat(g('emp-pay')?.value)||0,
payType:g('emp-pay-type')?.value,
state:g('emp-state')?.value.trim(),
minAge:parseInt(g('emp-min-age')?.value)||14,
maxHours:parseInt(g('emp-max-hours')?.value)||15,
desc:g('emp-desc')?.value.trim(),
};
const issues=complianceCheck(job);
const blockers=issues.filter(i=>i.level==='block');
if(blockers.length){
const html='🚫 Silent compliance engine blocked this post:\n\n'+
blockers.map(i=>`• ${i.reason}`).join('\n');
window.showAlert?showAlert('emp-post-alert',html,'error'):alert(html);
return;
}
const warns=issues.filter(i=>i.level==='warn');
if(warns.length&&window.showToast){
warns.forEach(w=>showToast('⚠️ '+w.reason,'warn'));
}
return orig.apply(this,a);
};
}
const GROOMING_PATTERNS=[
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
window.groomingCheck=function(text){
if(!text)return{flag:false};
for(const p of GROOMING_PATTERNS){if(p.test(text))return{flag:true,pattern:p.toString()};}
return{flag:false};
};
function patchScan(){
if(typeof window.scanMessage!=='function')return setTimeout(patchScan,300);
const orig=window.scanMessage;
window.scanMessage=function(text){
const g=groomingCheck(text);
if(g.flag){
try{
const log=JSON.parse(localStorage.getItem('tw_safety_alerts')||'[]');
log.push({ts:Date.now(),type:'grooming',pattern:g.pattern,preview:(text||'').slice(0,160)});
localStorage.setItem('tw_safety_alerts',JSON.stringify(log));
}catch(e){}
return{blocked:true,reason:'safety_pattern',pattern:g.pattern,source:'grooming-watchdog'};
}
return orig.call(this,text);
};
}
function whyThisMatch(job){
const skills=(window.userActivity?.skills||[]).map(s=>String(s).toLowerCase());
const bio=String(window.userActivity?.bio||'').toLowerCase();
const city=String(window.currentUser?.city||'').toLowerCase();
const reasons=[];
const txt=`${job.title||''} ${job.type||''} ${job.desc||''}`.toLowerCase();
const hit=skills.find(s=>s&&txt.includes(s));
if(hit)reasons.push(`Matches your "${hit}" skill`);
if(city&&String(job.city||'').toLowerCase().includes(city))reasons.push(`In ${job.city}`);
if(typeof job.pay==='number'&&job.pay>=15)reasons.push(`Pays $${job.pay}/${job.payType||'hr'}`);
const age=window.getTeenAge?.()||window.currentUser?.age;
if(age&&job.minAge&&age>=job.minAge)reasons.push(`Open to age ${age}`);
if(bio){
const bioWords=bio.split(/\W+/).filter(w=>w.length>4);
const bioHit=bioWords.find(w=>txt.includes(w));
if(bioHit&& !reasons.join(' ').toLowerCase().includes(bioHit))reasons.push(`You mentioned "${bioHit}" in your bio`);
}
return reasons.slice(0,2);
}
function patchBrowse(){
if(typeof window.renderBrowseJobs!=='function')return setTimeout(patchBrowse,300);
const orig=window.renderBrowseJobs;
window.renderBrowseJobs=function(...a){
orig.apply(this,a);
setTimeout(()=>{
const cards=document.querySelectorAll('#browse-jobs-list .browse-card');
const jobs=(window.browsableJobs||[]).filter(j=>!(new Set((window.demoJobs||[]).map(x=>x.id))).has(j.id));
cards.forEach((card,i)=>{
if(card.querySelector('.why-match'))return;
const j=jobs[i];if(!j)return;
const r=whyThisMatch(j);
if(!r.length)return;
const wrap=document.createElement('div');
wrap.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px';
wrap.innerHTML=r.map(x=>`<span class="why-match">${x}</span>`).join('');
const head=card.querySelector('.browse-card-head')||card.firstElementChild;
head?.insertAdjacentElement('afterend',wrap);
});
},20);
};
}
function boot(){
patchNavV24();
gateDemoData();
patchPostJob();
patchScan();
patchBrowse();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
}catch(e){typeof reportError=="function"?reportError(e):setTimeout(function(){throw e})}
