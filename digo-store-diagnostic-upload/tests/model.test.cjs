const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');const root=path.resolve(__dirname,'..');
function load(rel,cache=new Map()){if(cache.has(rel))return cache.get(rel).exports;const module={exports:{}};cache.set(rel,module);const code=ts.transpileModule(fs.readFileSync(path.join(root,rel),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const req=spec=>spec.startsWith('@/')?load(spec.slice(2)+'.ts',cache):require(spec);vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(req,module,module.exports);return module.exports;}
const lib=load('lib/model.ts');
const group=(n,extra={})=>({[`DIGO_MODEL_${n}_URL`]:`https://m${n}.example/chat/completions`,[`DIGO_MODEL_${n}_KEY`]:`key-${n}`,[`DIGO_MODEL_${n}_MODEL`]:`model-${n}`,...extra});
const ok=text=>new Response(JSON.stringify({choices:[{message:{content:text}}]}),{status:200});
const prompt={system:'s',user:'u'};

test('a model counts only when its address, key and model id are all set; staff never see the key or the address',()=>{
  assert.deepEqual(lib.modelsFrom({}),[]);
  assert.deepEqual(lib.modelsFrom({DIGO_MODEL_1_KEY:'k'}),[]);
  const env={...group(2,{DIGO_MODEL_2_NAME:'DeepSeek'}),...group(4),DIGO_MODEL_3_URL:'https://x.example'};
  assert.deepEqual(lib.modelsFrom(env).map(m=>m.id),['m2','m4']);
  assert.deepEqual(lib.publicModels(env),[{id:'m2',name:'DeepSeek',model:'model-2'},{id:'m4',name:'model-4',model:'model-4'}]);
  assert.ok(!JSON.stringify(lib.publicModels(env)).includes('key-'));
});

test('the request carries the key as a bearer token, both messages, and EXTRA; a malformed EXTRA is ignored',async()=>{
  const calls=[];const fetchImpl=async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});return ok(' ready ');};
  const [plain]=lib.modelsFrom(group(1,{DIGO_MODEL_1_EXTRA:'{not json'}));
  assert.equal(await lib.callOne(plain,prompt,{fetchImpl}),'ready');
  assert.equal(calls[0].url,'https://m1.example/chat/completions');
  assert.equal(calls[0].init.headers.authorization,'Bearer key-1');
  assert.deepEqual(calls[0].body,{max_tokens:600,model:'model-1',messages:[{role:'system',content:'s'},{role:'user',content:'u'}]});
  const [tuned]=lib.modelsFrom(group(1,{DIGO_MODEL_1_EXTRA:'{"max_completion_tokens":900,"thinking":{"type":"disabled"}}'}));
  await lib.callOne(tuned,prompt,{fetchImpl});
  assert.equal(calls[1].body.max_tokens,undefined);assert.equal(calls[1].body.max_completion_tokens,900);assert.deepEqual(calls[1].body.thinking,{type:'disabled'});
});

test('models are tried in order: a failing one is skipped, and with none connected or all failing the caller is told',async()=>{
  await assert.rejects(lib.callModel(prompt,{env:{}}),error=>error.status===503);
  const env={...group(1,{DIGO_MODEL_1_NAME:'First'}),...group(2,{DIGO_MODEL_2_NAME:'Second'})};const seen=[];
  const fetchImpl=async url=>{seen.push(url);return url.includes('m1')?new Response(JSON.stringify({error:{message:'Insufficient Balance'}}),{status:402}):ok('hello');};
  assert.deepEqual(await lib.callModel(prompt,{env,fetchImpl}),{text:'hello',model:'Second'});
  assert.equal(seen.length,2);
  await assert.rejects(lib.callModel(prompt,{env,fetchImpl:async()=>new Response('{}',{status:500})}),/Second returned an error \(500\)/);
  await assert.rejects(lib.callModel(prompt,{env,fetchImpl:async()=>ok('')}),/returned no text/);
  await assert.rejects(lib.callModel(prompt,{env,fetchImpl:async()=>{throw new TypeError('network');}}),error=>error.status===504&&/could not be reached/.test(error.message));
  await assert.rejects(lib.callOne(lib.modelsFrom(env)[0],prompt,{fetchImpl}),/First returned an error \(402\): Insufficient Balance/);
});

test('the staff check needs the admin password and reports each model without revealing a key',async()=>{
  const route=load('app/api/admin/model/route.ts');const saved={...process.env},realFetch=global.fetch;
  try{
    for(const key of Object.keys(process.env))if(key.startsWith('DIGO_MODEL_'))delete process.env[key];
    Object.assign(process.env,{ADMIN_SECRET:'pw',...group(1,{DIGO_MODEL_1_NAME:'First'}),...group(2,{DIGO_MODEL_2_NAME:'Second'})});
    const ask=(method,secret)=>route[method](new Request('https://digo.example/api/admin/model',{method,headers:secret?{'x-admin-secret':secret}:{}}));
    assert.equal((await ask('GET')).status,401);assert.equal((await ask('POST','wrong')).status,401);
    assert.deepEqual((await(await ask('GET','pw')).json()).models.map(m=>m.name),['First','Second']);
    global.fetch=async url=>String(url).includes('m1')?ok('ready'):new Response(JSON.stringify({error:{message:'bad key'}}),{status:401});
    const response=await ask('POST','pw'),body=await response.json();
    assert.equal(response.status,200);assert.deepEqual(body.results.map(r=>r.ok),[true,false]);assert.equal(body.results[0].text,'ready');assert.match(body.results[1].error,/Second returned an error \(401\): bad key/);
    assert.ok(!JSON.stringify(body).includes('key-'));
    for(const key of Object.keys(process.env))if(key.startsWith('DIGO_MODEL_'))delete process.env[key];
    assert.equal((await ask('POST','pw')).status,503);
    delete process.env.ADMIN_SECRET;assert.equal((await ask('GET','pw')).status,500);
  }finally{global.fetch=realFetch;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}
});
