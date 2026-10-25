/* Focused presentation changes; existing role, consent, permit and job handlers remain authoritative. */
(function () {
 'use strict';
 const $ = id => document.getElementById(id);
 const user = () => window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
 const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const limits = 'AI screening can miss things or be unavailable. Reports and alerts are not monitored 24/7 and do not guarantee a response. In immediate danger, call 911; this is not an emergency service.';
 function safetyNote() {
  const p=document.createElement('p');p.className='tw-safety-note';
  p.append(document.createTextNode(limits+' '));
  const b=document.createElement('button');b.type='button';b.className='tw48-link';b.textContent='How safety works';b.onclick=()=>window.twOpenSafetyDetails?.();p.append(b);return p;
 }
 function addNote(host) {if(host && !host.querySelector(':scope > .tw-safety-note'))host.append(safetyNote());}
 function ageOf(u) {
  if(!u?.dob)return Number.isInteger(u?.age)&&u.age>=13&&u.age<=17?u.age:null;const d=new Date(u.dob+'T00:00:00'),n=new Date();if(isNaN(d))return null;
  const a=n.getFullYear()-d.getFullYear()-(n.getMonth()<d.getMonth()||n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()?1:0);return a>=13&&a<=17?a:null;
 }
 window.twRenderLaborSummary = function (banner,state) {
  if(!banner)return;const u=user(),age=ageOf(u),name=String(u?.state||'');
  // A browse filter is not the teen's jurisdiction. Unknown profile information stays unknown.
  const rules=typeof STATE_DATA!=='undefined' && name ? STATE_DATA[name] : null;
  let summary,detail;
  if(!age || !name || !rules){summary='Add your age and state to see relevant work guidance.';detail='Your age or supported jurisdiction is unknown. A search filter does not establish where you work. Ask a parent to review the job and local requirements.';}
  else {
   summary=`Age ${age} · ${name}: `+(age<14?'job options are limited; review each task with a parent.':age<16?'school-day and weekly hour limits may apply.':'hazardous tasks remain restricted; state limits may apply.');
   detail=rules.notes+' '+(rules.permitNote||'')+' These are the rules currently supported by TeenWork, not a determination that a particular job is legal. Job duties, school schedule and exceptions can change the requirements.';
  }
  const html='<strong>'+escape(summary)+'</strong><details class="tw-law-details"><summary>Full work guidance and limits</summary><p>'+escape(detail)+'</p></details>';
  if(banner.innerHTML!==html)banner.innerHTML=html;banner.classList.add('show');
 };
 window.twOpenPendingApprovals = function(){
  document.querySelectorAll('.type-cb').forEach(x=>{x.checked=false;});
  ['filter-pay','filter-min-rating','filter-max-hours','filter-city'].forEach(id=>{if($(id))$(id).value='';});
  window.renderApprovalJobs?.(typeof demoJobs!=='undefined'?demoJobs:[]);
  window.switchParentTab?.('ptab-approvals','pdtab-approvals');
 };
 function groupJobActions(){
  document.querySelectorAll('#browse-jobs-list .browse-card').forEach(card=>{
   const row=card.querySelector('.browse-actions');
   if(row && !row.querySelector('.tw-secondary-actions')){
    const secondary=[...row.children].filter(el=>el.tagName==='BUTTON' && !el.classList.contains('btn-apply') && !/report|issue/i.test(el.textContent));
    // Unsupported screening requests have no replacement screening action.
    secondary.filter(el=>/BG Check|Background/i.test(el.textContent)).forEach(el=>el.remove());
    const keep=secondary.filter(el=>el.isConnected);
    if(keep.length){const d=document.createElement('details');d.className='tw-secondary-actions';const s=document.createElement('summary');s.textContent='More options';d.append(s,...keep);row.append(d);}
   }
  });
 }
 function accurateScreening(){
  document.querySelectorAll('.verified-emp-badge').forEach(el=>el.remove());
  document.querySelectorAll('.tw-ver-badge.identity,.tw-ver-badge.bgc').forEach(el=>el.remove());
  // Legacy templates can recreate badges. Keep this defensive cleanup scoped to screening labels.
  document.querySelectorAll('.badge,.tag,.tw-ver-badge').forEach(el=>{if(/^(?:[✅🪪🛡✦✓ ]*)?(?:Verified|Identity Verified|Trusted\+|Background Check)$/iu.test(el.textContent.trim()))el.remove();});
  document.querySelectorAll('[onclick*="requestEmployerBGC"]').forEach(el=>el.remove());
  ['tw-ver-t4','tw-ver-line-3'].forEach(id=>{if($(id))$(id).hidden=true;});
  const sub=$('tw-ver-page-sub');if(sub && sub.textContent!=='Profile details are self-reported. Linked-parent consent and work-permit status are separate checks.')sub.textContent='Profile details are self-reported. Linked-parent consent and work-permit status are separate checks.';
 }
 function wireFieldLabels(){
  document.querySelectorAll('.form-group input[id],.form-group select[id],.form-group textarea[id],.tw-ver-field input[id]').forEach(input=>{const label=input.closest('.form-group,.tw-ver-field')?.querySelector('label');if(label && !label.htmlFor)label.htmlFor=input.id;});
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
  const form=document.querySelector('#etab-post .post-form');if(!form || $('tw-post-progress'))return;
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
  const toast=$('global-toast');if(toast && toast.style.opacity==='0')toast.style.pointerEvents='none';
 }
 function boot(){
  // The original disclosure lived inside the inactive landing page; dashboards need it too.
  const modal=$('tw48-safety-modal');if(modal)document.body.append(modal);
  const full=$('tw48-safety-modal')?.querySelector('.tw48-safety-doc');if(full && !full.querySelector('.tw-safety-note'))full.append(safetyNote());
  postingWizard();decorate();let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('[onclick*="switch"],[onclick*="launchDashboard"]'))setTimeout(decorate,0);});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
