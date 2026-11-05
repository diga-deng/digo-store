const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
function fixture(){
 const c=vm.createContext({document:{addEventListener(){}},esc:String});
 vm.runInContext("const products=[];const baseScenes=[{id:'amalfi',items:[]}];const getProduct=id=>products.find(p=>p.id===id);",c);
 for(const name of ['reference-products','scene-products','screen-products'])vm.runInContext(fs.readFileSync(path.join(root,'public/scene-experience',name+'.js'),'utf8'),c);
 return code=>vm.runInContext(code,c);
}
test('three television moments add people, clothing and home references while retaining existing rooms',()=>{
 const run=fixture(),data=JSON.parse(run('JSON.stringify({scenes:baseScenes,refs:screenReferenceProducts,archived:archivedScenes})'));
 assert.equal(data.scenes.length,6);assert.equal(data.refs.length,9);
 assert.equal(data.scenes[0].id,'screen-bigbang-evening');
 assert.ok(data.scenes.some(s=>s.id==='a-quiet-living-room'));
 assert.ok(data.archived.some(s=>s.id==='linen-afternoon'));
 for(const s of data.scenes.filter(s=>s.screenScene)){
  assert.equal(s.items.length,3);assert.deepEqual(s.hotspots.map(h=>h.id),s.items);
  const pieces=s.items.map(id=>data.refs.find(p=>p.id===id));
  assert.ok(pieces.some(p=>p.category==='Wear'));assert.ok(pieces.some(p=>p.category==='Home'));
  assert.ok(fs.existsSync(path.join(root,'public',s.image)));
  for(const p of pieces){assert.equal(p.price,null);assert.equal(p.sku,null);assert.equal(p.brand,'Brand unverified');assert.equal(p.screenReference,true);assert.equal(p.sceneId,s.id);assert.equal(p.sourceUrl,s.sourceUrl);assert.notEqual(p.image,s.image);assert.ok(fs.existsSync(path.join(root,'public',p.image)));}
 }
});
test('screen details disclose assisted isolation and uncertain identity without an invented price or purchase action',()=>{
 const run=fixture();
 run("let captured='';const icon=()=>'';const btn=(label,action)=>'<button data-life=\"'+action+'\">'+label+'</button>';const productPhoto=p=>'<img src=\"'+p.image+'\">';const overlay=html=>captured=html;const $=()=>null;");
 run("showReferenceProduct(getProduct('ref-screen-penny-dress'),'screen-bigbang-evening')");
 const html=run('captured');
 assert.match(html,/AI-assisted isolation/);assert.match(html,/Brand & model/);assert.match(html,/Not verified/);assert.match(html,/no retail product matched/);assert.match(html,/save-product/);assert.match(html,/add-to-board/);assert.match(html,/screen-bigbang-evening.webp/);
 assert.doesNotMatch(html,/detail-price|Brand reference price|add-real|add-bag|View at |\$0/);
});
test('the full-scene view preserves the complete frame and makes every referenced object accessible',()=>{
 const run=fixture();run("const productPhoto=p=>'<img src=\"'+p.image+'\">';");
 const scenes=JSON.parse(run('JSON.stringify(screenScenes)'));
 for(let i=0;i<scenes.length;i++){
  const html=run(`screenFullSceneMarkup(screenScenes[${i}])`);
  assert.match(html,new RegExp(`aspect-ratio:${scenes[i].width}/${scenes[i].height}`));
  for(const id of scenes[i].items)assert.ok(html.includes(`data-id="${id}"`));
  assert.doesNotMatch(html,/undefined|NaN|%%/);
 }
});
