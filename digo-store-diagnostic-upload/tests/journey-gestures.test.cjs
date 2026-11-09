const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/scene-experience/journey-gestures.js'), 'utf8');

function fixture() {
  const handlers = {}, overlay = { innerHTML: '' }, calls = { wardrobe: [], navigation: [], scenes: [] };
  let active = 0, count = 3, clock = 1000;
  const makeSurface = kind => ({
    kind, isConnected: true, clientWidth: 900,
    classList: { add() {}, remove() {}, toggle() {} }, setPointerCapture() {}, focus() {},
    matches(selector) { return selector === (kind === 'wardrobe' ? '.closet-garments' : kind === 'nav' ? '.life-nav' : kind === 'series' ? '.scene-series' : '.moment-feed'); },
    querySelector(selector) {
      if (kind === 'scene' && selector === '.life-scene') return {dataset:{scene:this.id}};
      if (kind === 'series' && selector === '[data-series-scene]') return {dataset:{seriesScene:this.id}};
      return null;
    },
    querySelectorAll() { return ['/', '/wardrobe', '/plans'].map((p, i) => ({ getAttribute: key => key === 'href' ? '#' + p : i === active ? 'page' : null })); },
    scrollIntoView() { calls.scenes.push(this.id); }
  });
  const wardrobe = makeSurface('wardrobe');
  let nav = makeSurface('nav');
  const scenes = ['a', 'b', 'c'].map(id => Object.assign(makeSurface('scene'), { id }));
  const series = Object.assign(makeSurface('series'), {id:'b'});
  const target = (surface, ignored = false) => ({ closest(selector) {
    if (ignored && /input|button/.test(selector)) return {};
    if (selector.includes('.closet-garments') && surface.kind === 'wardrobe') return surface;
    if (selector.includes('.life-nav') && surface.kind === 'nav') return surface;
    if (selector === '.journey-module' && surface.kind === 'series') return surface;
    if (['.journey-module','.moment-feed'].includes(selector) && surface.kind === 'scene') return surface;
    return null;
  }});
  const document = {
    documentElement: { classList: { toggle() {}, remove() {} } }, body: { classList: { toggle() {} } },
    addEventListener(name, fn) { (handlers[name] ||= []).push(fn); },
    querySelector(selector) { return selector === '#overlay-root' ? overlay : selector === '.closet-garments' ? wardrobe : selector === '.life-nav' ? nav : null; },
    querySelectorAll() { return scenes; }
  };
  vm.runInNewContext(source, {
    document, window: { addEventListener() {} }, performance: { now: () => clock },
    journeyDirection: '', route: () => '/', moveJourneyScene: step => { calls.scenes.push(step); return true; }, requestAnimationFrame: fn => fn(), matchMedia: () => ({ matches: false }),
    closetRecords: () => Array.from({ length: count }), closetMove: step => calls.wardrobe.push(step),
    openSceneSeries: id => { calls.navigation.push('/series/' + id); return true; },
    leaveSceneSeries: id => { calls.navigation.push('/scene/' + id); return true; },
    navigate: p => { calls.navigation.push(p); active = ['/', '/wardrobe', '/plans'].indexOf(p); nav.isConnected = false; nav = makeSurface('nav'); }
  });
  return {
    calls, overlay, wardrobe, scenes, series, target, nav: () => nav,
    tick: n => clock += n, setCount: n => count = n,
    event(name, surface = wardrobe, extra = {}) {
      const e = { target: target(surface), isPrimary: true, pointerId: 1, pointerType: 'mouse', button: 0,
        clientX: 400, clientY: 400, cancelable: true, detail: 1, deltaX: 0, deltaY: 0, deltaMode: 0,
        preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...extra };
      for (const fn of handlers[name] || []) fn(e);
      return e;
    },
    drag(surface, dx, dy = 0, pointerType = 'mouse') {
      this.event('pointerdown', surface, { pointerType });
      this.event('pointermove', surface, { pointerType, clientX: 400 + dx, clientY: 400 + dy });
      this.event('pointerup', surface, { pointerType, clientX: 400 + dx, clientY: 400 + dy });
    }
  };
}

test('loaded journey gestures replace the old wardrobe touch handler', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/scene-experience/index.html'), 'utf8');
  assert.ok(html.indexOf('journey-gestures.js') > html.indexOf('lifestyle.js'));
  const wardrobe = fs.readFileSync(path.join(__dirname, '../public/scene-experience/wardrobe.js'), 'utf8');
  assert.ok(!wardrobe.includes("addEventListener('touchend'"));
});
test('mouse and touch horizontal drags switch one item and suppress the trailing click', () => {
  const f = fixture();
  f.drag(f.wardrobe, -140);
  assert.deepEqual(f.calls.wardrobe, [1]);
  assert.equal(f.event('click').stopped, true);
  assert.equal(f.event('click', f.wardrobe, { detail: 0 }).stopped, undefined);
  f.tick(500); f.drag(f.wardrobe, 90, 2, 'touch');
  assert.deepEqual(f.calls.wardrobe, [1, -1]);
});
test('taps, vertical drags, multi-touch and cancelled gestures never change the wardrobe', () => {
  const f = fixture();
  f.drag(f.wardrobe, 5); f.drag(f.wardrobe, 5, 100, 'touch');
  assert.equal(f.event('click').stopped, true);
  f.event('pointerdown');f.event('touchstart', f.wardrobe, { touches: [{}, {}] });f.event('pointerup', f.wardrobe, { clientX: 100 });
  f.event('pointerdown');f.event('pointermove', f.wardrobe, { clientX: 100 });f.event('pointercancel');f.event('pointerup', f.wardrobe, { clientX: 100 });
  assert.deepEqual(f.calls.wardrobe, []);
});
test('dialogs, editable controls and empty rails are protected', () => {
  const f = fixture();f.overlay.innerHTML = 'dialog'; f.drag(f.wardrobe, -150);
  f.overlay.innerHTML = ''; f.event('pointerdown', f.wardrobe, { target: f.target(f.wardrobe, true) });
  f.event('pointermove', f.wardrobe, { clientX: 100 });f.event('pointerup', f.wardrobe, { clientX: 100 });
  f.setCount(0);f.drag(f.wardrobe, -150);
  assert.deepEqual(f.calls.wardrobe, []);
});
test('vertical swipes change moments; only a leftward swipe opens the visible scene’s series', () => {
  const f = fixture();f.drag(f.scenes[0], 0, -150);f.drag(f.scenes[1], 0, 150);
  f.drag(f.scenes[0], 0, -150, 'touch');
  assert.deepEqual(f.calls.scenes, [1, -1, 1]);
  f.drag(f.scenes[0], 150);
  assert.deepEqual(f.calls.navigation, []);
  f.drag(f.scenes[1], -140, 3, 'touch');
  assert.deepEqual(f.calls.navigation, ['/series/b']);
  f.drag(f.series, -120, 2, 'touch');
  assert.deepEqual(f.calls.navigation, ['/series/b']);
  f.drag(f.series, 120, 2, 'touch');
  assert.deepEqual(f.calls.navigation, ['/series/b','/scene/b']);
});
test('arrow keys and a trackpad enter the current series and return to its source', () => {
  const f = fixture();
  f.event('keydown',f.scenes[2],{key:'ArrowLeft'});
  f.event('keydown',f.series,{key:'ArrowRight'});
  f.event('wheel',f.scenes[1],{deltaX:92,deltaY:2});
  f.event('wheel',f.series,{deltaX:92,deltaY:2});
  assert.deepEqual(f.calls.navigation,['/series/c','/scene/b','/series/b']);
  f.tick(300);
  f.event('wheel',f.series,{deltaX:-94});
  assert.deepEqual(f.calls.navigation.at(-1),'/scene/b');
  assert.equal(f.event('wheel',f.series,{deltaY:110}).prevented,undefined);
});
test('vertical wheel momentum cannot skip multiple scenes after replacement', () => {
  const f = fixture();
  for(let n=0;n<12;n++){f.tick(20);f.event('wheel',f.scenes[n%3],{deltaY:45});}
  assert.deepEqual(f.calls.scenes,[1]);
  f.tick(250);f.event('wheel',f.scenes[1],{deltaY:-90});
  assert.deepEqual(f.calls.scenes,[1,-1]);
  assert.equal(f.event('wheel',f.scenes[0],{deltaY:100,ctrlKey:true}).prevented,undefined);
});
test('horizontal trackpad momentum moves once; vertical wheels and zoom remain native', () => {
  const f = fixture();
  for (let n = 0; n < 10; n++) { f.tick(20);f.event('wheel', f.wardrobe, { deltaX: 30, deltaY: 2 }); }
  assert.deepEqual(f.calls.wardrobe, [1]);
  assert.equal(f.event('wheel', f.wardrobe, { deltaY: 100 }).prevented, undefined);
  assert.equal(f.event('wheel', f.wardrobe, { deltaX: 100, ctrlKey: true }).prevented, undefined);
  f.tick(250);f.event('wheel', f.wardrobe, { deltaY: -90, shiftKey: true });
  assert.deepEqual(f.calls.wardrobe, [1, -1]);
});
test('navigation swipes use the three visible destinations without momentum skipping across replacement DOM', () => {
  const f = fixture();f.drag(f.nav(), -140);
  assert.deepEqual(f.calls.navigation, ['/wardrobe']);
  f.tick(250);
  for (let n = 0; n < 8; n++) { f.tick(20);f.event('wheel', f.nav(), { deltaX: 80 }); }
  assert.deepEqual(f.calls.navigation, ['/wardrobe', '/plans']);
  f.tick(250);f.event('keydown', f.nav(), { key: 'ArrowLeft' });
  assert.deepEqual(f.calls.navigation, ['/wardrobe', '/plans', '/wardrobe']);
});
