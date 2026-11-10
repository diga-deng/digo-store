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
  vm.runInContext(fs.readFileSync(path.join(root,'public/scene-experience/scene-products.js'),'utf8'),c);
  return code=>vm.runInContext(code,c);
}
test('real reference feed preserves old saved identities and binds each photo to its actual product',()=>{
  const run=fixture(),data=JSON.parse(run('JSON.stringify({products:referenceProducts,scenes:baseScenes,archived:archivedScenes})'));
  assert.equal(data.products.length,13);
  assert.equal(data.scenes.length,3);
  assert.equal(data.archived.length,5);
  assert.equal(data.archived.find(s=>s.id==='linen-afternoon').items[0],'ref-zara-linen-dress');
  assert.equal(run("getProduct('dress').name"),'Original concept');
  assert.equal(data.archived[0].id,'amalfi');
  for(const scene of data.scenes){
    assert.equal(scene.items.length,3);
    assert.equal(scene.hotspots.length,scene.items.length);
    assert.deepEqual(scene.hotspots.map(h=>h.id),scene.items);
    assert.equal(scene.fullScene,true);
    const product=data.products.find(p=>p.id===scene.items[0]);
    assert.equal(scene.brand,product.brand);
    assert.equal(product.reference,true);
    assert.ok(fs.existsSync(path.join(root,'public',scene.image)));
    for(const photo of product.gallery)assert.ok(fs.existsSync(path.join(root,'public',photo)));
    assert.match(product.sourceUrl,/^https:\/\/fermliving\.com\/products\//);
    assert.ok(scene.items.every(id=>data.products.find(p=>p.id===id).image!==scene.image));
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

test('room markers remain on their photographed objects at desktop and mobile cover crops',()=>{
  const run=fixture();
  for(const [width,height] of [[1408,800],[378,700],[360,600]]) {
    const points=JSON.parse(run(`JSON.stringify(roomScenes.flatMap(s=>s.hotspots.map(h=>({...scenePhotoPoint(h,s.width,s.height,${width},${height},s.position),scene:s.id,product:h.id}))))`));
    for(const point of points){assert.ok(point.x>=0&&point.x<=width,JSON.stringify(point));assert.ok(point.y>=0&&point.y<=height,JSON.stringify(point));}
  }
  const p=JSON.parse(run('JSON.stringify(scenePhotoPoint({x:.5,y:.5},100,200,400,200,[.5,.5]))'));
  assert.deepEqual(p,{x:200,y:100});
});
test('European references retain their currency and original sold-out identity',()=>{
  const run=fixture();
  run("let captured='';const world={options:{}};const storeMoney=(x,c)=>new Intl.NumberFormat('en-US',{style:'currency',currency:c}).format(x/100);const icon=()=>'';const btn=(label,action)=>'<button data-life=\"'+action+'\">'+label+'</button>';const overlay=html=>captured=html;const $=()=>null;");
  run("showReferenceProduct(getProduct('ref-ferm-insert-table'),'a-quiet-living-room')");
  const html=run('captured');
  assert.match(html,/€1,219.00/);assert.match(html,/Brand reference price · EUR/);assert.match(html,/Out of stock at the source/);assert.match(html,/insert-side-table-stone-sand/);assert.doesNotMatch(html,/add-real|add-bag|\/checkout/);
});

test('Discover covers and scene posters expose the pictured scene’s products in the left rail', () => {
  const run = fixture();
  for (const file of ['curated-edit', 'discover-tree', 'scene-series']) {
    run(fs.readFileSync(path.join(root, 'public/scene-experience', file + '.js'), 'utf8'));
  }
  run("const world = {saved: []}; const icon = () => ''; const productPhoto = p => '<img src=' + p.image + '>'; const sceneFor = id => [...baseScenes, ...archivedScenes].find(s => s.id === id);");
  run(journeys.slice(journeys.indexOf('function sceneProductRail('), journeys.indexOf('function sceneSection(')));
  run(journeys.slice(journeys.indexOf('function branchEntry('), journeys.indexOf('function visibleSceneCard(')));
  run(journeys.slice(journeys.indexOf('function discoverPoster('), journeys.indexOf('function rememberPoster(')));
  for (const [cover, id, pictured] of [[true, 'active', 'alpine-ridge'], [false, 'coast', 'coast']]) {
    const html = run(`discoverPoster({branch:branchForScene('coast'), scene:sceneFor('${pictured}'), cover:${cover}, id:'${id}'}, 0, 5)`);
    const rail = html.match(/<aside class="life-rail"[^>]*>([\s\S]*?)<\/aside>/);
    assert.ok(rail, id);
    const buttons = [...rail[1].matchAll(/data-life="product" data-id="([^"]+)" data-type="concept" data-scene="([^"]+)"/g)];
    assert.deepEqual(buttons.map(m => m[1]), Array.from(run(`sceneFor('${pictured}').items.slice(0, 4)`)));
    assert.ok(buttons.every(m => m[2] === pictured));
  }
});
