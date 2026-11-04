const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const Stripe = require('stripe');
const root = path.resolve(__dirname, '..');
// Run real application modules with only network/storage boundaries replaced.
function load(entry, overrides = {}, cache = new Map()) {
  const rel = entry.replaceAll('\\', '/');
  if (overrides[rel]) return overrides[rel];
  if (cache.has(rel)) return cache.get(rel).exports;
  const file = path.join(root, rel);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true
  }}).outputText;
  const module = { exports: {} }; cache.set(rel, module);
  function localRequire(spec) {
    if (spec.startsWith('@/') || spec.startsWith('.')) {
      let next = spec.startsWith('@/') ? spec.slice(2) : path.relative(root, path.resolve(path.dirname(file), spec));
      if (!path.extname(next)) next += '.ts';
      return load(next, overrides, cache);
    }
    return require(spec);
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
const core = load('lib/checkout.ts');
const {RESERVATION_TERMS_VERSION}=load('lib/purchase.ts');
const catalog = load('lib/supplierCatalog.ts').supplierCatalog;
const product = catalog[0];
const item = { id: product.id, quantity: 1, kind: 'retail' };
function request(body) { return new Request('https://digo.example/api/checkout', {method:'POST',body:JSON.stringify(body)}); }
function fixture({storageError = false, mode = 'test'} = {}) {
  process.env.STRIPE_MODE = mode; process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit_test_only';
  let fail = storageError;
  const orders = new Map(); const creates = []; const productQueries = [];
  const client = { from(table) {
    return {
      select() { return { limit: async () => ({ error: fail ? { message:'offline' } : null }),
        in(field, ids) { productQueries.push(ids); return {eq: async () => ({data:[],error:null})}; } }; },
      async upsert(order, options) {
        assert.equal(table, 'orders'); assert.equal(options.onConflict, 'stripe_session_id'); assert.equal(options.ignoreDuplicates,true);
        if (fail) return {error:{message:'offline'}};
        if (!orders.has(order.stripe_session_id)) orders.set(order.stripe_session_id, order);
        return {error:null};
      }
    };
  }};
  const stripe = new Stripe('sk_test_unit_test_only');
  stripe.checkout.sessions.create = async (params, options) => {
    creates.push({params,options}); return {id:'cs_test_unit',status:'open',url:'https://checkout.stripe.com/c/pay/cs_test_unit'};
  };
  const overrides = {'lib/supabase.ts':{getSupabaseAdminClient:()=>client},
    'lib/stripe.ts':{getStripe:()=>stripe,getCheckoutSiteUrl:()=> 'https://digo.example'}};
  return {orders, creates, productQueries, stripe, overrides, setFail(value){fail=value;}};
}
const session = { id:'cs_test_unit',payment_status:'paid',livemode:false,amount_total:4500,currency:'usd',
  customer_details:{email:'test@example.com'},metadata:{digo_checkout:'v2',item_0:JSON.stringify(item)},payment_intent:'pi_test_unit'};
function webhookRequest(stripe, object = session, type = 'checkout.session.completed', livemode = false) {
  const payload=JSON.stringify({id:'evt_test_unit',type,livemode,data:{object}});
  const signature=stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_unit_test_only'});
  return new Request('https://digo.example/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':signature},body:payload});
}
test('rejects malformed, negative, fractional, overflowing and duplicate-overflow quantities',()=>{
 for(const input of [null,{},[],[{...item,quantity:0}],[{...item,quantity:1.2}],[{...item,quantity:100}],
  [{...item,quantity:60},{...item,quantity:60}],[{...item,kind:'free'}],Array(21).fill(item)]) assert.throws(()=>core.parseCheckoutItems(input));
 assert.equal(core.parseCheckoutItems([item,item])[0].quantity,2);
});
test('supplier catalog prices override all client supplied amounts',()=>{
 const parsed=core.parseCheckoutItems([{...item,price_cents:1,unit_amount:1}]);
 const result=core.buildCheckout(parsed,[product]);
 assert.equal(result.line_items[0].price_data.unit_amount,product.price_cents);
 assert.throws(()=>core.buildCheckout([{...item,id:'missing'}],[product]));
 assert.throws(()=>core.buildCheckout([item],[{...product,active:false}]));
});
test('reservation charges exactly the catalog deposit and preserves retail amount',()=>{
 const result=core.buildCheckout([{...item,kind:'reservation',reservationPlan:'refundable'}],[product]);
 assert.equal(result.line_items[0].price_data.unit_amount,450);
 assert.equal(JSON.parse(result.metadata.item_0).retail_unit_amount,product.price_cents);
 assert.equal(result.hasRetail,false);
});
test('supplier checkout does not send supplier IDs to UUID database query; retries use the same key',async()=>{
 const f=fixture();const route=load('app/api/checkout/route.ts',f.overrides);
 const body={items:[item],requestId:'same-attempt-00000001'};
 assert.equal((await route.POST(request(body))).status,200);
 assert.equal((await route.POST(request(body))).status,200);
 assert.equal(f.productQueries.length,0);
 assert.equal(f.creates[0].options.idempotencyKey,f.creates[1].options.idempotencyKey);
 assert.equal(f.creates[0].params.payment_method_types,undefined); // Dashboard controls eligible methods.
 assert.match(f.creates[0].params.success_url,/session_id=\{CHECKOUT_SESSION_ID\}/);
 assert.deepEqual(f.creates[0].params.shipping_address_collection.allowed_countries,['US']);
});
test('unreachable order table blocks Stripe session creation before payment',async()=>{
 const f=fixture({storageError:true});const route=load('app/api/checkout/route.ts',f.overrides);
 assert.equal((await route.POST(request({items:[item],requestId:'attempt-00000000002'}))).status,503);
 assert.equal(f.creates.length,0);
});
test('unknown IDs, missing request ID, and real-money reservations are rejected',async()=>{
 const f=fixture({mode:'live'});const route=load('app/api/checkout/route.ts',f.overrides);
 for(const body of [{items:[item]},{items:[{...item,id:'missing'}],requestId:'attempt-00000000003'},
 {items:[{...item,kind:'reservation',reservationPlan:'refundable'}],requestId:'attempt-00000000004'}]) assert.equal((await route.POST(request(body))).status,400);
 assert.equal(f.creates.length,0);
});
test('a valid paid webhook is idempotent; replay cannot overwrite order state',async()=>{
 const f=fixture();const route=load('app/api/stripe/webhook/route.ts',f.overrides);
 assert.equal((await route.POST(webhookRequest(f.stripe))).status,200);
 f.orders.get(session.id).status='refunded';
 assert.equal((await route.POST(webhookRequest(f.stripe))).status,200);
 assert.equal(f.orders.size,1); assert.equal(f.orders.get(session.id).status,'refunded');
});
test('invalid signature, mismatched mode, unpaid session and foreign checkout never record payment',async()=>{
 const f=fixture();const route=load('app/api/stripe/webhook/route.ts',f.overrides);
 assert.equal((await route.POST(new Request('https://digo.example',{method:'POST',body:'{}'}))).status,400);
 assert.equal((await route.POST(new Request('https://digo.example',{method:'POST',headers:{'stripe-signature':'bad'},body:'{}'}))).status,400);
 assert.equal((await route.POST(webhookRequest(f.stripe,session,undefined,true))).status,400);
 assert.equal((await route.POST(webhookRequest(f.stripe,{...session,payment_status:'unpaid'}))).status,200);
 assert.equal((await route.POST(webhookRequest(f.stripe,{...session,metadata:{}}))).status,200);
 assert.equal(f.orders.size,0);
});
test('failed order insert asks Stripe to retry, then a retry records exactly once',async()=>{
 const f=fixture({storageError:true});const route=load('app/api/stripe/webhook/route.ts',f.overrides);
 assert.equal((await route.POST(webhookRequest(f.stripe))).status,500); assert.equal(f.orders.size,0);
 f.setFail(false);
 assert.equal((await route.POST(webhookRequest(f.stripe))).status,200); assert.equal(f.orders.size,1);
});
test('delayed success records payment; delayed failure does not',async()=>{
 const f=fixture();const route=load('app/api/stripe/webhook/route.ts',f.overrides);
 assert.equal((await route.POST(webhookRequest(f.stripe,{...session,payment_status:'unpaid'},'checkout.session.async_payment_failed'))).status,200);
 assert.equal(f.orders.size,0);
 assert.equal((await route.POST(webhookRequest(f.stripe,session,'checkout.session.async_payment_succeeded'))).status,200);
 assert.equal(f.orders.size,1);
});
test('test mode rejects live keys and validates redirect origin',()=>{
 const saved={...process.env};
 try {
  const {getStripe,getCheckoutSiteUrl}=load('lib/stripe.ts');
  delete process.env.STRIPE_MODE;process.env.STRIPE_SECRET_KEY='sk_live_unit_test_only';
  assert.throws(()=>getStripe());
  process.env.STRIPE_SECRET_KEY='sk_test_unit_test_only'; assert.ok(getStripe());
  process.env.NEXT_PUBLIC_SITE_URL='http://unsafe.example';delete process.env.VERCEL_ENV;
  assert.throws(()=>getCheckoutSiteUrl());
  process.env.NEXT_PUBLIC_SITE_URL='https://digo.example';assert.equal(getCheckoutSiteUrl(),'https://digo.example');
  process.env.VERCEL_ENV='preview';process.env.VERCEL_URL='preview.vercel.app';assert.equal(getCheckoutSiteUrl(),'https://preview.vercel.app');
 } finally {for(const key of ['STRIPE_MODE','STRIPE_SECRET_KEY','NEXT_PUBLIC_SITE_URL','VERCEL_ENV','VERCEL_URL']) {if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});

test('A and B reservations stay separate and only trusted deposit prices are charged',()=>{
 const items=core.parseCheckoutItems([{...item,kind:'reservation',reservationPlan:'refundable',unit_amount:1},
  {...item,kind:'reservation',reservationPlan:'committed',unit_amount:1}]);
 assert.equal(items.length,2);
 const result=core.buildCheckout(items,[product]);
 assert.equal(result.metadata.reservation_terms,RESERVATION_TERMS_VERSION);
 assert.equal(JSON.parse(result.metadata.item_0).reservationPlan,'refundable');
 assert.equal(JSON.parse(result.metadata.item_1).reservationPlan,'committed');
 assert.equal(result.line_items[0].price_data.unit_amount,450);
 assert.equal(result.line_items[1].price_data.unit_amount,450);
 for(const reservationPlan of [undefined,'free',null]) assert.throws(()=>core.parseCheckoutItems([{...item,kind:'reservation',reservationPlan}]));
 assert.throws(()=>core.parseCheckoutItems([{...item,reservationPlan:'committed'}]));
 assert.throws(()=>core.buildCheckout(items,[{...product,reserve_price_cents:product.price_cents+1}]));
});
test('reservation consent is required on the server and repeated requests keep identical Stripe parameters',async()=>{
 const f=fixture();const route=load('app/api/checkout/route.ts',f.overrides);
 const body={items:[{...item,kind:'reservation',reservationPlan:'committed'}],requestId:'attempt-reservation-00001'};
 assert.equal((await route.POST(request(body))).status,400); assert.equal(f.creates.length,0);
 const accepted={...body,reservationTerms:RESERVATION_TERMS_VERSION};
 assert.equal((await route.POST(request(accepted))).status,200);
 assert.equal((await route.POST(request(accepted))).status,200);
 assert.deepEqual(f.creates[0],f.creates[1]);
 assert.equal(f.creates[0].params.metadata.terms_accepted,'true');
 assert.equal(f.creates[0].params.shipping_address_collection,undefined);
 assert.equal((await route.POST(request({...accepted,items:[{...body.items[0],reservationPlan:'refundable'}]}))).status,200);
 assert.notEqual(f.creates[0].options.idempotencyKey,f.creates[2].options.idempotencyKey);
});
test('verified paid v3 deposits queue once; unpaid deposits do not join and balance is calculated from snapshot',async()=>{
 const f=fixture();const route=load('app/api/stripe/webhook/route.ts',f.overrides);
 const built=core.buildCheckout([{...item,quantity:2,kind:'reservation',reservationPlan:'committed'}],[product]);
 const depositSession={...session,amount_total:900,metadata:built.metadata};
 assert.equal((await route.POST(webhookRequest(f.stripe,{...depositSession,payment_status:'unpaid'}))).status,200);
 assert.equal(f.orders.size,0);
 assert.equal((await route.POST(webhookRequest(f.stripe,depositSession))).status,200);
 assert.equal(f.orders.get(session.id).metadata.fulfillment_state,'queued');
 assert.deepEqual(core.reservationSummary(built.metadata),[{plan:'committed',quantity:2,deposit:900,balance:(product.price_cents-450)*2}]);
 assert.equal((await route.POST(webhookRequest(f.stripe,depositSession))).status,200);assert.equal(f.orders.size,1);
});
test('all live collection remains closed until fulfilment is implemented',async()=>{
 const f=fixture({mode:'live'});const route=load('app/api/checkout/route.ts',f.overrides);
 assert.equal((await route.GET()).status,200); assert.equal((await (await route.GET()).json()).available,false);
 for(const items of [[item],[{...item,kind:'reservation',reservationPlan:'refundable'}],[{...item,kind:'reservation',reservationPlan:'committed'}]]) {
  assert.equal((await route.POST(request({items,requestId:'live-closed-000001',reservationTerms:RESERVATION_TERMS_VERSION}))).status,400);
 }
 assert.equal(f.creates.length,0);
});

test('wardrobe receipt only comes from verified paid DIGO sessions and contains no customer or sourcing details',()=>{
 const {wardrobeReceipt}=load('lib/wardrobe.ts');
 const built=core.buildCheckout([item],[product]);
 const paid={...session,created:1700000000,metadata:built.metadata};
 const receipt=wardrobeReceipt(paid,[product]);
 assert.equal(receipt.id,session.id);assert.equal(receipt.test,true);assert.equal(receipt.items[0].id,product.id);
 assert.equal(receipt.items[0].product.name,product.name);assert.equal(receipt.items[0].product.supplier_price_cny,undefined);
 assert.equal(JSON.stringify(receipt).includes('test@example.com'),false);
 assert.equal(wardrobeReceipt({...paid,payment_status:'unpaid'},[product]),null);
 assert.equal(wardrobeReceipt({...paid,metadata:{digo_checkout:'foreign'}},[product]),null);
 const missing=wardrobeReceipt(paid,[]);assert.equal(missing.items[0].id,product.id);assert.equal(missing.items[0].product.name,'Purchased piece');
});
