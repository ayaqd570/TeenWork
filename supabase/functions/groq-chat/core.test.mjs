import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler } from './core.mjs';
const env = { SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'public', SUPABASE_SERVICE_ROLE_KEY: 'service', GROQ_KEY_FREE: 'free-key', GROQ_KEY_PRO: 'pro-key' };
const request = (body = {}, token = 'valid') => new Request('https://example.invalid', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify({ messages: [{role:'user',content:'Hi'}], ...body }) });
const response = (v, status=200) => new Response(JSON.stringify(v), {status});
function backend({pro=false, allowed=true, authStatus=200, quotaStatus=200}={}) {
 const calls=[];
 const handle=makeHandler(env, async (url, opts) => {
  calls.push({url,opts});
  if (url.endsWith('/auth/v1/user')) return response({id:'user-id',app_metadata: pro ? {tw_ai_plan:'pro'} : {}, user_metadata:{tw_ai_plan:'pro'}},authStatus);
  if (url.endsWith('/rpc/tw_consume_ai_quota')) return response(allowed, quotaStatus);
  return response({choices:[{message:{content:'Hello'}}]});
 });
 return {handle,calls};
}
test('missing or invalid login never reaches quota or Groq',async()=>{
 const b=backend(); assert.equal((await b.handle(request({},''))).status,401); assert.equal(b.calls.length,0);
 const c=backend({authStatus:401}); assert.equal((await c.handle(request())).status,401); assert.equal(c.calls.length,1);
});
test('client pro claim and editable user metadata cannot select the pro key',async()=>{
 const b=backend(); assert.equal((await b.handle(request({plan:'pro'}))).status,200);
 assert.equal(JSON.parse(b.calls[1].opts.body).p_plan,'free'); assert.equal(b.calls[2].opts.headers.Authorization,'Bearer free-key');
});
test('admin-owned pro entitlement selects pro key',async()=>{
 const b=backend({pro:true}); await b.handle(request({plan:'free'})); assert.equal(b.calls[2].opts.headers.Authorization,'Bearer pro-key');
});
test('quota denial and quota outage fail closed',async()=>{
 for (const [opts,status] of [[{allowed:false},429],[{quotaStatus:500},503]]) {
  const b=backend(opts); assert.equal((await b.handle(request())).status,status); assert.equal(b.calls.length,2);
 }
});
test('invalid and oversized prompts do not spend quota',async()=>{
 for (const [body,status] of [[{max_tokens:-1},400],[{temperature:10},400],[{messages:[{role:'user',content:'x'.repeat(20001)}]},413],[{messages:[{role:'bogus',content:'x'}]},400],[{padding:'x'.repeat(100001)},413]]) {
  const b=backend(); assert.equal((await b.handle(request(body))).status,status); assert.equal(b.calls.length,1);
 }
});
test('preflight works without authentication',async()=>{
 const b=backend(); assert.equal((await b.handle(new Request('https://example.invalid',{method:'OPTIONS'}))).status,200); assert.equal(b.calls.length,0);
});

test('moderation blocks before Groq and preserves the safety response',async()=>{
 const b=backend();
 let calls=0;
 const handle=makeHandler(env, async (url, opts)=>{
  calls++;
  if(url.endsWith('/auth/v1/user')) return response({id:'user-id'});
  if(url.endsWith('/rpc/tw_consume_ai_quota')) return response(true);
  throw new Error('Groq must not be called');
 },async()=>({allowed:false,title:'Safety check',message:'Blocked',layer:'moderation'}));
 const r=await handle(request()); assert.equal(r.status,200);
 assert.equal((await r.json()).choices[0].finish_reason,'content_filter');assert.equal(calls,2);
});
test('model fallback and reasoning settings preserve the production model',async()=>{
 const b=backend();await b.handle(request({model:'llama-3.3-70b-versatile',max_tokens:10}));
 const payload=JSON.parse(b.calls[2].opts.body);
 assert.equal(payload.model,'openai/gpt-oss-20b');assert.equal(payload.max_tokens,600);assert.equal(payload.reasoning_effort,'low');
});

test('both site addresses and Netlify previews get CORS; other sites get the main address',async()=>{
 const b=backend();
 const origin=o=>new Request('https://example.invalid',{method:'OPTIONS',headers:{Origin:o}});
 for (const o of ['https://teenwork.ayaqd.com','https://ayaqdteenwork.netlify.app','https://deploy-preview-9--ayaqdteenwork.netlify.app'])
  assert.equal((await b.handle(origin(o))).headers.get('access-control-allow-origin'),o);
 assert.equal((await b.handle(origin('https://evil.example'))).headers.get('access-control-allow-origin'),'https://teenwork.ayaqd.com');
 const extra=makeHandler({...env,ALLOWED_ORIGIN:'https://ayaqdteenwork.netlify.app, http://localhost:8000'});
 assert.equal((await extra(origin('http://localhost:8000'))).headers.get('access-control-allow-origin'),'http://localhost:8000');
 assert.equal((await extra(origin('https://teenwork.ayaqd.com'))).headers.get('access-control-allow-origin'),'https://teenwork.ayaqd.com');
 assert.match((await b.handle(origin('https://teenwork.ayaqd.com'))).headers.get('access-control-allow-headers'),/x-teenwork-demo/);
});
const demoRequest=(body={},ip='203.0.113.7')=>new Request('https://example.invalid',{method:'POST',headers:{'x-teenwork-demo':'1','x-forwarded-for':ip+', 10.0.0.1',Authorization:'Bearer sb_publishable_x'},body:JSON.stringify({messages:[{role:'user',content:'Hi'}],...body})});
function demoBackend(allowed=true){
 const calls=[];
 const handle=makeHandler(env, async (url, opts) => {
  calls.push({url,opts});
  if (url.endsWith('/rpc/tw_consume_demo_ai_quota')) return response(allowed);
  if (url.endsWith('/auth/v1/user')) throw new Error('a demo must not be checked as a sign-in');
  return response({choices:[{message:{content:'Hello'}}]});
 });
 return {handle,calls};
}
test('demos skip sign-in, use the free key and a per-visitor demo quota',async()=>{
 const b=demoBackend(); const r=await b.handle(demoRequest({plan:'pro'})); assert.equal(r.status,200);
 assert.equal(b.calls.length,2); assert.match(b.calls[0].url,/tw_consume_demo_ai_quota$/);
 const client=JSON.parse(b.calls[0].opts.body).p_client; assert.match(client,/^[0-9a-f]{64}$/); assert.ok(!client.includes('203'));
 assert.equal(b.calls[1].opts.headers.Authorization,'Bearer free-key');
 const c=demoBackend(); await c.handle(demoRequest({},'203.0.113.7')); assert.equal(JSON.parse(c.calls[0].opts.body).p_client,client);
 const d=demoBackend(); await d.handle(demoRequest({},'198.51.100.2')); assert.notEqual(JSON.parse(d.calls[0].opts.body).p_client,client);
});
test('demo quota denial, long demo answers and a missing demo header are refused',async()=>{
 const b=demoBackend(false); const r=await b.handle(demoRequest()); assert.equal(r.status,429); assert.match((await r.json()).error.message,/free account/); assert.equal(b.calls.length,1);
 const c=demoBackend(); assert.equal((await c.handle(demoRequest({max_tokens:1500}))).status,400); assert.equal(c.calls.length,0);
 const d=backend(); assert.equal((await d.handle(request({},''))).status,401);
});
