const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const J=require('../public/scene-experience/journey-model.js');
const code=ts.transpileModule(fs.readFileSync('components/CompleteCheckout.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const receipt={id:'cs_test_device',paidAt:123,test:true,items:[{id:'scarf',quantity:1,kind:'retail',product:{id:'scarf',name:'Wool scarf'}}]};
function client({fail=false,current='[]',attempt='null'}={}){
 const local=new Map(),session=new Map([['cart',current],['attempt',attempt]]),states=[];let cleared=0;
 const storage=(map,throwing=false)=>({getItem:k=>map.get(k)||null,setItem(k,v){if(throwing)throw Error('Storage full');map.set(k,v);},removeItem:k=>map.delete(k)});
 const module={exports:{}};
 const context={module,exports:module.exports,Event:class Event{},window:{dispatchEvent(){}},
  localStorage:storage(local,fail),sessionStorage:storage(session),require(name){
   if(name==='react')return{useEffect:fn=>fn(),useState:value=>[value,next=>states.push(next)]};
   if(name==='./CartProvider')return{useCart:()=>({clearCart(){cleared++;}})};
   if(name==='@/lib/purchase')return{CART_STORAGE_KEY:'cart',ATTEMPT_STORAGE_KEY:'attempt'};
   return require(name);
  }};
 vm.runInNewContext(code,context);
 return{local,session,states,render(props){module.exports.CompleteCheckout(props);},get cleared(){return cleared;}};
}
test('successful return persists one receipt, then wardrobe links it without a manual add',()=>{
 const f=client();f.render({fingerprint:'paid-cart',receipt});f.render({fingerprint:'paid-cart',receipt});
 const stored=JSON.parse(f.local.get('digo-wardrobe-orders-v1'));
 assert.equal(stored.length,1);const wardrobe=J.mergeOrders(J.initial(),stored);
 assert.equal(wardrobe.saved[0].id,'scarf');assert.deepEqual(wardrobe.saved[0].testOrderIds,['cs_test_device']);
 assert.equal(f.cleared,0);assert.ok(f.states.includes('saved'));
});
test('paid return does not empty a changed shopping bag; a matching paid cart is cleared',()=>{
 const lines=[{id:'scarf',quantity:1,kind:'retail'}],fingerprint=JSON.stringify(lines);
 const current=JSON.stringify([{product:{id:'scarf'},quantity:1,kind:'retail'}]);
 const f=client({current,attempt:JSON.stringify({fingerprint})});f.render({fingerprint,receipt});
 assert.equal(f.cleared,1);assert.equal(f.session.get('cart'),'[]');
 const changed=client({current,attempt:JSON.stringify({fingerprint:'new-cart'})});changed.render({fingerprint,receipt});
 assert.equal(changed.cleared,0);assert.equal(changed.session.get('cart'),current);
});
test('failed device storage is exposed for retry and does not fabricate a saved receipt',()=>{
 const f=client({fail:true});f.render({fingerprint:'paid',receipt});
 assert.equal(f.local.size,0);assert.ok(f.states.includes('failed'));
});
