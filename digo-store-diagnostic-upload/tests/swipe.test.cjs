const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/scene-experience/swipe.js'), 'utf8');

function fixture() {
  const listeners = {}, overlay = { innerHTML: '' }, coach = { innerHTML: '' };
  const surface = { isConnected: true, style: { setProperty() {}, removeProperty() {} }, classList: { add() {}, remove() {} }, setPointerCapture() {} };
  const scenes = ['a', 'b', 'c'].map(id => ({ id, title: id }));
  const products = ['dress', 'lamp'].map(id => ({ id }));
  const context = vm.createContext({
    state: { saved: [], drafts: {}, custom: [] }, ui: {}, baseScenes: scenes,
    getScene: id => scenes.find(s => s.id === id), getProduct: id => products.find(p => p.id === id),
    location: { hash: '#/' }, performance: { now: () => context.clock }, clock: 1000,
    window: { scrollY: 0, scrollTo() {} }, innerHeight: 800,
    document: { addEventListener(name, fn) { (listeners[name] ||= []).push(fn); } },
    $: selector => selector === '#overlay-root' ? overlay : coach,
    persist() {}, render() {}, navigate(path) { context.location.hash = '#' + path; },
    requestAnimationFrame(fn) { fn(); },
  });
  vm.runInContext(source, context);
  const target = { closest(s) { return s === '.gesture-surface' ? surface : null; } };
  return { context, overlay, target, run: s => vm.runInContext(s, context), event(name, extra = {}) {
    const e = { target, isPrimary: true, pointerId: 1, pointerType: 'touch', clientX: 400, clientY: 500, cancelable: true, preventDefault() {}, ...extra };
    for (const fn of listeners[name] || []) fn(e);
  } };
}

test('browsing and lane navigation do not create interests or product history', () => {
  const f = fixture();
  f.run('moveScene(1);moveScene(1);moveLane(1);moveLane(1);moveLane(-1);moveLane(-1)');
  assert.equal(f.run('ui.discoverIndex'), 2);
  assert.equal(f.run('state.sceneInteractions.length'), 0);
  assert.equal(f.run('state.viewedProducts.length'), 0);
});

test('a product tap records its scene and deduplicates the most recent pieces', () => {
  const f = fixture();
  f.run("recordProductView('dress','a');recordProductView('lamp','b');recordProductView('dress','a')");
  assert.equal(f.run('JSON.stringify(state.viewedProducts.map(x=>[x.id,x.scene]))'), '[["dress","a"],["lamp","b"]]');
  assert.equal(f.run('JSON.stringify(state.sceneInteractions.map(x=>x.id))'), '["a","b"]');
});

test('real catalog views share the recent lane without generating a scene interaction', () => {
  const f = fixture();
  f.run("state.viewedProducts=[{id:'store:scarf',kind:'catalog',product:{slug:'scarf',name:'Scarf',price_cents:4500}},{id:'broken',kind:'catalog',product:{}},{id:'lamp',scene:'a'}]");
  assert.equal(f.run('JSON.stringify(viewedPieces().map(x=>x.id))'), '["store:scarf","lamp"]');
  assert.equal(f.run('state.sceneInteractions.length'), 0);
});

test('new interactions lead the next lane while current interest stays stable', () => {
  const f = fixture();
  f.run("recordSceneInteraction('a','save');recordSceneInteraction('b','details');ui.interestIndex=1;recordSceneInteraction('c','product')");
  assert.equal(f.run('ui.interestIndex'), 0);
  f.context.location.hash = '#/interests';
  f.run("ui.interestIndex=1;recordSceneInteraction('a','save')");
  assert.equal(f.run('interestedScenes()[ui.interestIndex].id'), 'b');
});

test('one-finger vertical and horizontal drags route independently and suppress accidental clicks', () => {
  const f = fixture();
  f.event('pointerdown');
  f.event('pointermove', { clientY: 280 });
  f.event('pointerup', { clientY: 280 });
  assert.equal(f.run('ui.discoverIndex'), 1);
  assert.equal(f.run('state.sceneInteractions.length'), 0);
  assert.ok(f.run('swipeUI.blockedClickUntil') > f.context.clock);
  f.event('pointerdown');
  f.event('pointermove', { clientX: 200 });
  f.event('pointerup', { clientX: 200 });
  assert.equal(f.context.location.hash, '#/interests');
});

test('short taps, multitouch, open dialogs and product-rail scrolling cannot switch scenes', () => {
  const f = fixture();
  f.event('pointerdown');f.event('pointerup', { clientY: 495 });
  f.event('pointerdown');f.event('pointerdown', { isPrimary: false, pointerId: 2 });f.event('pointerup', { clientY: 100 });
  f.overlay.innerHTML = '<dialog>';
  f.event('pointerdown');f.event('pointermove', { clientY: 100 });f.event('pointerup', { clientY: 100 });
  f.overlay.innerHTML = '';
  const railTarget = { closest() { return {}; } };
  f.event('pointerdown', { target: railTarget });f.event('pointermove', { clientY: 100 });f.event('pointerup', { clientY: 100 });
  assert.equal(f.run('ui.discoverIndex'), 0);
});

test('trackpad momentum advances once until the next separate wheel gesture', () => {
  const f = fixture();
  for (let n = 0; n < 8; n++) { f.context.clock += 20; f.event('wheel', { deltaX: 0, deltaY: 45, deltaMode: 0 }); }
  assert.equal(f.run('ui.discoverIndex'), 1);
  f.context.clock += 200;
  f.event('wheel', { deltaX: 0, deltaY: 80, deltaMode: 0 });
  assert.equal(f.run('ui.discoverIndex'), 2);
});

test('tutorial progresses with the gestures and persists completion', () => {
  const f = fixture();
  f.run('swipeUI.tutorialStep=0;moveScene(1)');
  assert.equal(f.run('swipeUI.tutorialStep'), 1);
  f.run('moveLane(1)');assert.equal(f.run('swipeUI.tutorialStep'), 2);
  f.run('moveLane(1)');assert.equal(f.run('swipeUI.tutorialStep'), null);
  assert.equal(f.run('state.gestureTutorial'), 'swipe-v1');
});
