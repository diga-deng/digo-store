const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'public/scene-experience/reference-products.js'),'utf8');
const journeys=fs.readFileSync(path.join(root,'public/scene-experience/lifestyle.js'),'utf8');
function fixture(){
  const c=vm.createContext({document:{addEventListener(){}},esc:String});
  vm.runInContext("const products=[{id:'dress',name:'Original concept'}]; const baseScenes=[{id:'amalfi',items:['dress']}]; const getProduct=id=>products.find(p=>p.id===id);",c);
  vm.runInContext(source,c);
  return code=>vm.runInContext(code,c);
}
test('real reference feed preserves old saved identities and binds each photo to its actual product',()=>{
  const run=fixture(),data=JSON.parse(run('JSON.stringify({products:referenceProducts,scenes:baseScenes,archived:archivedScenes})'));
  assert.equal(data.products.length,4);
  assert.equal(run("getProduct('dress').name"),'Original concept');
  assert.equal(data.archived[0].id,'amalfi');
  for(const scene of data.scenes){
    assert.equal(scene.items.length,1);
    const product=data.products.find(p=>p.id===scene.items[0]);
    assert.equal(scene.brand,product.brand);
    assert.equal(product.reference,true);
    assert.ok(fs.existsSync(path.join(root,'public',scene.image)));
    for(const photo of product.gallery)assert.ok(fs.existsSync(path.join(root,'public',photo)));
    assert.match(product.sourceUrl,/^https:\/\/www\.(zara|zarahome)\.com\/us\//);
    assert.equal(product.active,undefined);
    assert.equal(product.tile,null);
  }
});
test('saved reference candidates export the same brand and real image rather than an illustration tile',()=>{
  const run=fixture();
  run("const catalog=[];const safeImage=x=>x;const brandFor=p=>p.brand;");
  for(const [start,end] of [['function itemInfo(','function itemArt('],['function itemBrand(','function itemCaption('],['function sharedCandidate(','function sharedArt(']])run(journeys.slice(journeys.indexOf(start),journeys.indexOf(end)));
  const candidate=JSON.parse(run("JSON.stringify(sharedCandidate({id:'a',title:'A',items:[{id:referenceProducts[0].id,type:'concept'}]}))"));
  assert.equal(candidate.items[0].brand,'ZARA');
  assert.equal(candidate.items[0].image,'/scene-experience/assets/zara-linen-dress.webp');
  assert.equal(candidate.items[0].tile,null);
  assert.equal(candidate.items[0].owned,false);
});
test('reference detail supports saving and editing but offers only the original brand purchase link',()=>{
  const run=fixture();
  run("let captured='';const world={options:{}};const storeMoney=x=>String(x);const icon=()=>'';const btn=(label,action)=>'<button data-life=\"'+action+'\">'+label+'</button>';const overlay=html=>captured=html;const $=()=>null;");
  run('showReferenceProduct(referenceProducts[2],null)');
  const html=run('captured');
  assert.match(html,/not sold by DIGO/);
  assert.match(html,/save-product/);
  assert.match(html,/add-to-board/);
  assert.match(html,/https:\/\/www.zarahome.com\/us\/wooden-chair-with-backrest/);
  assert.doesNotMatch(html,/add-real|add-bag|\/checkout/);
});
