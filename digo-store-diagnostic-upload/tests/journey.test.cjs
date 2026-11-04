const { test }=require('node:test');
const assert=require('node:assert/strict');
const J=require('../public/scene-experience/journey-model.js');
const board=()=>({id:'day',title:'Tennis',items:[{key:'coat',id:'coat-a',type:'catalog',locked:false,owned:false,selected:true},{key:'dress',id:'dress',type:'catalog',locked:true,owned:false,selected:true},{key:'own',id:'shoes',type:'own',owned:true}],history:[],future:[],budget:300});
test('replacing one piece preserves kept choices and ownership, undo and redo restore the exact states',()=>{const start=board();const changed=J.change(start,{type:'replace',key:'coat',item:{id:'coat-b',type:'catalog',owned:false,selected:true}});assert.equal(changed.items[0].key,'coat');assert.deepEqual(changed.items.slice(1),start.items.slice(1));assert.equal(changed.budget,300);const undo=J.change(changed,{type:'undo'});assert.deepEqual(undo.items,start.items);assert.deepEqual(J.change(undo,{type:'redo'}).items,changed.items);assert.equal(start.items[0].id,'coat-a');});
test('kept pieces reject replacement and removal',()=>{const b=board();assert.deepEqual(J.change(b,{type:'remove',key:'dress'}),b);assert.deepEqual(J.change(b,{type:'replace',key:'dress',item:{id:'bad'}}),b);});
test('purchase totals exclude owned, concept and explicitly deselected items',()=>{const b=board();b.items.push({key:'concept',id:'idea',type:'concept'},{key:'no',id:'skip',type:'catalog',selected:false});assert.equal(J.total(b,[{id:'coat-a',price_cents:12000},{id:'dress',price_cents:8000},{id:'shoes',price_cents:9000},{id:'idea',price_cents:50000},{id:'skip',price_cents:5000}]),20000);});
test('saved versions and plans keep immutable selection references after the working board changes',()=>{let w=J.initial({boards:{day:board()},plans:{trip:{candidateIds:['version-a'],date:'2026-11-14'}}});w=J.saveVersion(w,'day','version-a');w.boards.day=J.change(w.boards.day,{type:'remove',key:'coat'});assert.equal(w.versions['version-a'].items.length,3);assert.deepEqual(w.plans.trip.candidateIds,['version-a']);w.plans.trip.date='2026-12-01';assert.equal(w.versions['version-a'].items[0].id,'coat-a');});

test('a plan created from a saved version retains the same candidate and scene reference',()=>{const p=J.createPlan('plan','Next Saturday',{versionId:'version-a',inspirationKey:'scene:amalfi'});assert.deepEqual(p.candidateIds,['version-a']);assert.deepEqual(p.inspirationKeys,['scene:amalfi']);p.date='2026-11-14';p.budget=400;assert.deepEqual(p.candidateIds,['version-a']);assert.deepEqual(J.createPlan('empty','A future day').candidateIds,[]);});
test('home catalog items and personal items use the same wardrobe category',()=>{assert.equal(J.category({category:'Home'}),'Home');assert.equal(J.category({}, {category:'Bedding'}),'Home');assert.equal(J.category({}, {category:'Scarves'}),'Clothing');});

test('confirmed purchases merge into the same saved product without losing groups or combinations',()=>{
 const start=J.initial({saved:[{key:'product:scarf',kind:'product',type:'catalog',id:'scarf',group:'Sea weekend',status:'liked',title:'My saved scarf'}],boards:{day:board()}});
 const receipt={id:'cs_live_receipt',paidAt:123,test:false,items:[{id:'scarf',quantity:1,kind:'retail',product:{id:'scarf',name:'Wool scarf'}}]};
 const merged=J.mergeOrders(start,[receipt]);
 assert.equal(merged.saved.length,1);assert.equal(merged.saved[0].group,'Sea weekend');assert.equal(merged.saved[0].status,'ordered');
 assert.deepEqual(merged.saved[0].orderIds,['cs_live_receipt']);assert.deepEqual(merged.boards,start.boards);assert.deepEqual(merged.owned,[]);
 assert.deepEqual(J.mergeOrders(merged,[receipt]),merged);assert.equal(start.saved[0].status,'liked');
});
test('test purchases are separated from real purchases and do not imply ownership or manual saves',()=>{
 const receipt={id:'cs_test_receipt',paidAt:123,test:true,items:[{id:'scarf',quantity:1,kind:'reservation',product:{id:'scarf',name:'Wool scarf'}}]};
 const merged=J.mergeOrders(J.initial(),[receipt]);
 assert.equal(merged.saved[0].status,'test-ordered');assert.equal(merged.saved[0].savedManually,false);
 assert.deepEqual(merged.saved[0].testOrderIds,['cs_test_receipt']);assert.equal(merged.saved[0].orderIds,undefined);assert.deepEqual(merged.owned,[]);
});
test('invalid receipt lines cannot create wardrobe records',()=>{
 const initial=J.initial();
 assert.deepEqual(J.mergeOrders(initial,[{id:'cs_test_bad',test:true,items:[{id:'scarf',quantity:0,kind:'retail',product:{id:'scarf',name:'Scarf'}}]}]).saved,[]);
});
