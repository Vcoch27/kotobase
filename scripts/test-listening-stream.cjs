const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/app/api/listening/[fileId]/route.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness(fetcher, signedIn=true) {
  const timers=[]; const calls=[];
  const context={exports:{},Response,Headers,AbortSignal,AbortController,process:{env:{}},setTimeout:fn=>{const timer={fn,cleared:false};timers.push(timer);return timer},clearTimeout:timer=>{timer.cleared=true},fetch:async(url,options)=>{calls.push(options);return fetcher(options)},require:name=> {
    if(name==='@/lib/listening-plan')return {listeningExams:[{driveFileId:'exam'}]};
    if(name==='@/lib/session')return {getCurrentUser:async()=>signedIn?{uid:'test'}:null};
    if(name==='@/lib/auth-utils')return {verifyToken:async()=>true};
    throw Error(name);
  }};
  vm.runInNewContext(code,context);
  return {calls,timers,get:range=>context.exports.GET({headers:new Headers(range?{range}:{}),signal:new AbortController().signal,cookies:{get:()=>undefined}},{params:{fileId:'exam'}})};
}
test('preserves open, large, seek and suffix ranges without 2 MB truncation',async()=>{
  for(const range of ['bytes=0-','bytes=0-9999999','bytes=12000000-','bytes=-65536']) {
    const h=harness(()=>new Response('data',{status:206,headers:{'content-type':'video/mp4','content-range':'bytes 0-3/4'}}));
    const response=await h.get(range); assert.equal(h.calls[0].headers.Range,range);assert.equal(response.status,206);assert.equal(await response.text(),'data');
  }
});
test('no Range returns 200 and clears connection timer before streaming body',async()=>{
  const h=harness(()=>new Response('video',{headers:{'content-type':'video/mp4'}}));
  const response=await h.get();assert.equal(response.status,200);assert.equal(h.calls[0].headers.Range,undefined);
  for(const timer of h.timers)if(!timer.cleared)timer.fn();
  assert.equal(h.calls[0].signal.aborted,false);assert.equal(await response.text(),'video');
});
test('rejects invalid ranges before contacting Drive; propagates 416 size',async()=>{
  const h=harness(()=>new Response(null,{status:416,headers:{'content-range':'bytes */99'}}));
  for(const range of ['bytes=-','bytes=-0','bytes=20-1','bytes=1-2,4-5','bytes=9007199254740992-'])assert.equal((await h.get(range)).status,416);
  assert.equal(h.calls.length,0);const r=await h.get('bytes=100-');assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),'bytes */99');
});
test('rejects Drive HTML and keeps authentication required',async()=>{
  const h=harness(()=>new Response('<html>quota</html>',{headers:{'content-type':'text/html'}}));assert.equal((await h.get('bytes=0-')).status,502);
  const guest=harness(()=>{throw Error('must not fetch')},false);assert.equal((await guest.get()).status,401);assert.equal(guest.calls.length,0);
});
