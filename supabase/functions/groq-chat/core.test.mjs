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
