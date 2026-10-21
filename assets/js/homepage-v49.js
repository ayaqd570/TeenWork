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
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
