const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/scene-experience/production.js'), 'utf8');

function fixture(stored) {
  let html = '';
  const writes = [];
  const context = vm.createContext({
    sessionStorage: { getItem: () => stored, setItem: (...args) => writes.push(args) },
    window: { addEventListener() {} }, location: { hash: '#/', assign: url => writes.push(url) },
    Intl, ui: {}, currentScene: 'amalfi', esc: value => String(value ?? ''), icon: () => '<svg/>',
    getProduct: () => ({ id: 'dress', name: 'Linen dress', category: 'Wear', material: 'Linen', story: 'Concept' }),
    recordProductView() {}, productPhoto: () => '<div/>', overlay: value => { html = value; },
  });
  vm.runInContext(source, context);
  return { run: code => vm.runInContext(code, context), get html() { return html; }, writes };
}
test('scene header uses the existing store cart and rejects corrupt line items', () => {
  const product = { id: 'real', name: 'Scarf', price_cents: 10000, reserve_price_cents: 2000 };
  const f = fixture(JSON.stringify([
    { product, kind: 'retail', quantity: 2 },
    { product, kind: 'reservation', reservationPlan: 'refundable', quantity: 1 },
    { product, kind: 'reservation', quantity: 1 },
    { product, kind: 'retail', quantity: -1 },
    { id: 'dress', qty: 4 }
  ]));
  assert.equal(f.run('storeCartCount()'), 3);
  f.run('bagModal()');
  assert.match(f.html, /\$200.00/);
  assert.match(f.html, /\$20.00/);
  assert.match(f.html, /href="\/checkout"/);
});
test('concept product actions never add illustrative products to the real cart', () => {
  const f = fixture('[]');
  f.run("addBag('dress')");
  assert.match(f.html, /Not available to order/);
  assert.doesNotMatch(f.html, /data-action="add-bag"/);
  assert.deepEqual(f.writes, []);
  f.run("productModal('dress', true)");
  assert.match(f.html, /data-action="insert-piece"/);
});
test('invalid storage degrades to an empty real cart', () => {
  const f = fixture('{bad');
  assert.equal(f.run('storeCartCount()'), 0);
  f.run('bagModal()');
  assert.match(f.html, /href="\/shop"/);
  f.run('checkoutModal()');
  assert.deepEqual(f.writes, ['/checkout']);
});
