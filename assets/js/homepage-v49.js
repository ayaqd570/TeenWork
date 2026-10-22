(function () {
 'use strict';
 const $ = id => document.getElementById(id);
 const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let loading = false, busy = false;
 async function client() { return typeof _twCloudClient === 'function' ? await _twCloudClient() : null; }
 async function loadReviews() {
  const feed = $('tw49-reviews-feed');
  if (!feed || loading) return;
  loading = true;
  try {
   const c = await client();
   if (!c) throw new Error('Connection unavailable');
   const {data,error} = await c.rpc('tw_public_app_reviews');
   if (error || !Array.isArray(data)) throw new Error('Reviews unavailable');
   const reviews=data.filter(r => Number.isInteger(r.rating) && r.rating>=1 && r.rating<=5 && typeof r.body==='string');
   if (!reviews.length) feed.innerHTML='<p>No public reviews yet. Reviews appear here when members choose to share their feedback.</p>';
   else {
    const avg=(reviews.reduce((sum,r)=>sum+r.rating,0)/reviews.length).toFixed(1);
    feed.innerHTML='<p><strong>'+esc(avg)+' / 5</strong> · '+reviews.length+' shared review'+(reviews.length===1?'':'s')+'</p>'+reviews.map(r=>{
     const d=new Date(r.created_at);const date=Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
     return '<article class="tw49-review"><span aria-label="'+r.rating+' out of 5 stars">'+ '★'.repeat(r.rating)+'☆'.repeat(5-r.rating)+'</span><blockquote>'+esc(r.body)+'</blockquote><p class="tw48-small">TeenWork member'+(date?' · <time>'+esc(date)+'</time>':'')+'</p></article>';
    }).join('');
   }
  } catch(e) {
   feed.innerHTML='<p>Reviews are temporarily unavailable.</p><button class="tw48-link" type="button" id="tw49-retry-reviews">Try again →</button>';
   $('tw49-retry-reviews')?.addEventListener('click',loadReviews);
  } finally { loading=false; }
 }
 function enhanceForm() {
  const text=$('v17-erm-text');if(!text || $('tw49-public-review'))return;
  text.maxLength=2000;
  text.insertAdjacentHTML('afterend','<label class="tw49-consent"><input type="checkbox" id="tw49-public-review"><span>Share my rating and comment on the TeenWork homepage as “TeenWork member.” Please leave out names, contact details and other private information.</span></label><p id="tw49-review-error" role="status"></p>');
 }
 async function submitReview() {
  if(busy)return;
  enhanceForm();
  const error=$('tw49-review-error');
  const fail=m=>{if(error)error.textContent=m;};
  const stars=typeof _v17Stars==='number'?_v17Stars:0;
  const body=$('v17-erm-text')?.value.trim() || '';
  if(!stars || !body || body.length>2000){fail('Choose a star rating and add a comment of up to 2,000 characters.');return;}
  busy=true;if(error)error.textContent='Saving your review…';
  try{
   const c=await client();const session=c?await c.auth.getSession():null;
   if(!session?.data?.session || !window.currentUser || window.currentUser.isDemo ||
      String(session.data.session.user?.email || '').toLowerCase()!==String(window.currentUser.email || '').toLowerCase()){
    fail('Please sign in to a real account to save a review.');return;
   }
   const {error:saveError}=await c.rpc('tw_submit_app_review',{p_rating:stars,p_body:body,p_public:!!$('tw49-public-review')?.checked});
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
  // The latest override saves to Supabase, replacing older device-only handlers.
  window._v17SubmitEnhancedReview=submitReview;
  enhanceForm();
  new MutationObserver(enhanceForm).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('tw-supabase-ready',loadReviews);
  document.querySelector('#page-landing') && new MutationObserver(()=>{
   if($('page-landing').classList.contains('active'))loadReviews();
  }).observe($('page-landing'),{attributes:true,attributeFilter:['class']});
  loadReviews();
 }
 window.twRefreshPublicReviews=loadReviews;
 function expandHomepage(){
  const hero=$('tw48-hero'), image=$('tw-hero-outer');
  if(!hero || $('tw50-details'))return;
  const headline=$('tw48-h1');
  if(headline && !$('tw-slogan-wrap')){
   const slogans=['From teen jobs <em>to adult jobs.</em>','Learn <em>how to work well.</em>','Work <em>your first job.</em>','Join the job world <em>early.</em>','Connect with neighbors <em>through work.</em>','Expand your <em>knowledge of jobs.</em>'];
   headline.insertAdjacentHTML('beforebegin','<div id="tw-slogan-wrap">'+slogans.map((s,i)=>'<div class="tw-slogan'+(i?'':' active')+'" aria-hidden="'+!!i+'">'+s+'</div>').join('')+'</div><button type="button" id="tw51-pause" aria-pressed="false">Pause headlines</button>');
   let current=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
   const pause=$('tw51-pause');
   const sync=()=>{pause.textContent=paused?'Play headlines':'Pause headlines';pause.setAttribute('aria-pressed',String(paused));};sync();
   pause.addEventListener('click',()=>{paused=!paused;sync();});
   setInterval(()=>{if(paused || document.hidden || !$('page-landing')?.classList.contains('active'))return;const items=$('tw-slogan-wrap').children;items[current].classList.remove('active');items[current].setAttribute('aria-hidden','true');current=(current+1)%items.length;items[current].classList.add('active');items[current].setAttribute('aria-hidden','false');},3200);
  }
  // Keep the existing introduction and controls; give them the first screen.
  if(image?.parentElement===hero.parentElement)image.before(hero);
  hero.insertAdjacentHTML('beforeend','<button class="tw48-link tw50-scroll" type="button" id="tw50-discover">See how TeenWork works ↓</button>');
  $('tw50-discover').addEventListener('click',()=>$('tw48-how')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
  const details=document.createElement('div');details.id='tw50-details';
  details.innerHTML=`
   <section class="landing-section" aria-labelledby="tw50-tools">
    <div class="landing-section-head"><div><h2 id="tw50-tools">More than finding a first job</h2><p>A place to prepare, apply and keep track as you build experience.</p></div></div>
    <div class="tw48-proof-grid">
     <article class="tw48-card"><h3>📍 Look for local work</h3><p>Browse employer posts and read the work, pay, location and age requirements before applying. Talk through the details with a parent first.</p><p>Jobs depend on what real employers post. There may not be a listing near you yet.</p></article>
     <article class="tw48-card"><h3>📚 Learn before you start</h3><p>Take short lessons to prepare for work. Practice explaining your skills, asking questions and understanding what an employer expects.</p><p>The AI coach can help with application ideas. Live AI requires an online, signed-in account and has usage limits.</p></article>
     <article class="tw48-card"><h3>⏱️ Keep your work record</h3><p>Log hours and earnings as you complete jobs. Keep track of your progress and the experience you can describe on your next application.</p><p>Payment is arranged with the employer and your parent. TeenWork does not process wages or take a cut of your earnings.</p></article>
    </div>
   </section>
   <section class="landing-section" aria-labelledby="tw50-ideas">
    <div class="landing-section-head"><div><h2 id="tw50-ideas">What could a neighborhood job look like?</h2><p>Ideas to discuss with a parent—not current job listings. Tasks should fit your age, experience and local rules.</p></div></div>
    <div class="tw48-proof-grid">
     <article class="tw48-card"><h3>🍂 Yard and garden help</h3><p>Raking leaves, pulling weeds or watering plants. Agree on the area, tools, pay and expected time before starting.</p></article>
     <article class="tw48-card"><h3>🐾 Pet care</h3><p>Feeding pets or walking a familiar dog. Meet the animal with a parent and ask about its behavior, routine and emergency contact.</p></article>
     <article class="tw48-card"><h3>❄️ Seasonal help</h3><p>Hand-shoveling a walkway or helping with simple seasonal cleanup. A parent should check the weather, equipment and workload with you.</p></article>
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
    <details class="tw50-faq"><summary>Can I explore without creating an account?</summary><p>Yes. Choose Teen Demo, Parent Demo or Employer Demo above. Demo jobs, profiles and messages are sample data so you can explore each dashboard.</p></details>
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
