const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/scene-experience/journey-gestures.js'), 'utf8');

function fixture() {
  const handlers = {}, overlay = { innerHTML: '' }, calls = { wardrobe: [], bodyRows: [], previewRows: [], offsets: [], settled: [], navigation: [], scenes: [] };
  let active = 0, count = 3, clock = 1000, currentPage = null;
  const makeSurface = (kind, row = 0) => ({
    kind, get dataset() { return {count, row}; }, isConnected: true, clientWidth: 200,
    classList: { add() {}, remove() {}, toggle() {} }, replaceChildren() {}, setPointerCapture() {}, focus() {},
    matches(selector) {
      if (kind === 'bodyZone') return ['[data-fitting-swipe]', '.fitting-zone'].includes(selector);
      return selector === (kind === 'wardrobe' ? '[data-fitting-swipe]' : kind === 'nav' ? '.life-nav' : kind === 'series' ? '.scene-series' : '.moment-feed'); },
    querySelector(selector) {
      if (kind === 'scene' && selector === '.life-scene') return {dataset:{scene:this.id}};
      if (kind === 'series' && selector === '[data-series-scene]') return {dataset:{seriesScene:this.id}};
      return null;
    },
    querySelectorAll() { return ['/', '/wardrobe', '/plans'].map((p, i) => ({ getAttribute: key => key === 'href' ? '#' + p : i === active ? 'page' : null })); },
    scrollIntoView() { calls.scenes.push(this.id); }
  });
  const wardrobe = makeSurface('wardrobe');
  const zones = [makeSurface('bodyZone', 0), makeSurface('bodyZone', 1)];
  const timers = new Map();
  let nextTimer = 0;
  let nav = makeSurface('nav');
  const scenes = ['a', 'b', 'c'].map(id => Object.assign(makeSurface('scene'), { id }));
  const series = Object.assign(makeSurface('series'), {id:'b'});
  const target = (surface, ignored = false) => ({ closest(selector) {
    if (ignored && /input|button/.test(selector)) return {};
    if (selector.includes('[data-fitting-swipe]') && ['wardrobe','bodyZone'].includes(surface.kind)) return surface;
    if (selector.includes('.life-nav') && surface.kind === 'nav') return surface;
    if (selector === '.journey-module' && surface.kind === 'series') return surface;
    if (['.journey-module','.moment-feed'].includes(selector) && surface.kind === 'scene') return surface;
    return null;
  }});
  const document = {
    documentElement: { classList: { toggle() {}, remove() {} } }, body: { classList: { toggle() {} } },
    addEventListener(name, fn) { (handlers[name] ||= []).push(fn); },
    querySelector(selector) {
      const zone = zones.find(z => selector === `.fitting-zone[data-row="${z.dataset.row}"]`);
      if (zone) return zone;
      if (selector === '.moment-feed,.scene-series') return currentPage;
      return selector === '#overlay-root' ? overlay : selector === '[data-fitting-swipe]' ? wardrobe : selector === '.life-nav' ? nav : null; },
    querySelectorAll() { return scenes; }
  };
  const context = vm.createContext({
    document, window: { addEventListener() {} }, performance: { now: () => clock },
    journeyDirection: '', route: () => '/', moveJourneyScene: step => { calls.scenes.push(step); return true; }, requestAnimationFrame: fn => fn(), matchMedia: () => ({ matches: false }),
    visibleSceneCard: feed => feed.querySelector('.life-scene'), resumeFittingGarment: () => 0,
    moveFittingPiece(step, row) { calls.wardrobe.push(step); calls.bodyRows.push(row); },
    dragFittingGarment(zone, offset) { calls.previewRows.push(zone.dataset.row); calls.offsets.push(offset); },
    settleFittingGarment(zone, step) { calls.settled.push([zone.dataset.row, step]); },
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, {fn, at: clock + delay}); return id; },
    clearTimeout(id) { timers.delete(id); },
    openSceneSeries: id => { calls.navigation.push('/series/' + id); return true; },
    leaveSceneSeries: id => { calls.navigation.push('/scene/' + id); return true; },
    navigate: p => { calls.navigation.push(p); active = ['/', '/wardrobe', '/plans'].indexOf(p); nav.isConnected = false; nav = makeSurface('nav'); }
  });
  vm.runInContext(source, context);
  return {
    calls, overlay, wardrobe, scenes, series, target, bodyZone: row => zones[row], nav: () => nav,
    mountPager(feed) {
      const listeners = {};
      const pager = {
        isConnected: true, onscrollend: null, scrollHeight: 42000, clientHeight: 1000,
        classList: {add() {}}, addEventListener(name, fn) { listeners[name] = fn; },
        scrollBy(dy) { this.scrollTop += dy; listeners.scroll({target: this}); },
        end() { listeners.scrollend({target: this}); }
      };
      feed.closest = selector => selector === '.discover-pager' ? pager : null;
      context.mountDiscoverWheel(feed);
      return pager;
    },
    tick(n) {
      clock += n;
      for (const [id,timer] of timers) {
        if (timer.at <= clock) { timers.delete(id); timer.fn(); }
      }
    },
    setCount: n => count = n,
    showPage: page => currentPage = page,
    event(name, surface = wardrobe, extra = {}) {
      const e = { target: target(surface), isPrimary: true, pointerId: 1, pointerType: 'mouse', button: 0,
        clientX: 400, clientY: 400, cancelable: true, detail: 1, deltaX: 0, deltaY: 0, deltaMode: 0, timeStamp: clock,
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
  assert.deepEqual(f.calls.wardrobe, []);
  f.event('pointerdown');f.event('pointermove', f.wardrobe, { clientX: 100 });f.event('pointercancel');f.event('pointerup', f.wardrobe, { clientX: 100 });
  assert.deepEqual(f.calls.wardrobe, [1, -1]);
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
test('Discover commits during a drag, stays on that frame until release and accepts the next swipe immediately', () => {
  const f = fixture(), feed = f.scenes[0];
  for (const pointerType of ['touch','mouse']) {
    f.calls.scenes.length = 0;
    f.event('pointerdown', feed, {pointerType});
    f.event('pointermove', feed, {pointerType, clientY: 385});
    assert.deepEqual(f.calls.scenes, []);
    f.event('pointermove', feed, {pointerType, clientY: 362});
    assert.deepEqual(f.calls.scenes, [1]);
    f.event('pointermove', feed, {pointerType, clientY: 10});
    f.event('pointerup', feed, {pointerType, clientY: 10});
    f.drag(feed, 0, -180, pointerType);
    assert.deepEqual(f.calls.scenes, [1, 1]);
  }
});
test('a long wheel stroke stays on one scene through surges, stalls and jitter in all delta modes', () => {
  for (const deltaMode of [0, 1, 2]) {
    const f = fixture(), feed = f.scenes[0];
    feed.clientHeight = 850;
    for (const [gap, deltaY] of [[0,40],[16,180],[16,22],[16,98],[50,98],[100,100],[18,-40],[16,150]]) {
      f.tick(gap);
      f.event('wheel', feed, {deltaY, deltaMode});
    }
    assert.deepEqual(f.calls.scenes, [1]);
    f.tick(200);
    f.event('wheel', feed, {deltaY: -35, deltaMode});
    assert.deepEqual(f.calls.scenes, [1,-1]);
  }
});
test('marked trackpad inertia never pages; fresh contact immediately accepts a second swipe', () => {
  const f = fixture(), feed = f.scenes[0];
  f.event('wheel', feed, {deltaY: 42, momentum: false});
  for (const [gap, deltaY] of [[20,180],[12,16],[12,75],[320,130]]) {
    f.tick(gap);
    f.event('wheel', feed, {deltaY, momentum: true});
  }
  assert.deepEqual(f.calls.scenes, [1]);
  f.tick(1);
  f.event('wheel', feed, {deltaY: 45, momentum: false});
  assert.deepEqual(f.calls.scenes, [1,1]);
});
test('a swipe from a bottom navigation link pages Discover just once', () => {
  const f = fixture();
  f.showPage(f.scenes[0]);
  f.event('pointerdown', f.nav(), {pointerType: 'touch', clientY: 840});
  for (const clientY of [810, 650, 320, 30]) {
    f.event('pointermove', f.nav(), {pointerType: 'touch', clientY});
  }
  f.event('pointerup', f.nav(), {pointerType: 'touch', clientY: 30});
  assert.deepEqual(f.calls.scenes, [1]);
  f.drag(f.scenes[0], 0, -35, 'touch');
  assert.deepEqual(f.calls.scenes, [1,1]);
});
test('one native scroll stays on one frame across pauses longer than the old idle window', () => {
  const f = fixture(), feed = f.scenes[0], pager = f.mountPager(feed);
  const scroll = (gap, deltaY, extra = {}) => {
    f.tick(gap);
    const event = f.event('wheel', feed, {deltaY, ...extra});
    assert.equal(event.prevented, undefined);
    pager.scrollBy(deltaY);
  };
  scroll(0, 32);
  for (const [gap, delta] of [[12, 1200], [600, 900], [40,-480], [350,720]]) scroll(gap, delta);
  assert.deepEqual(f.calls.scenes, [1]);
  pager.end();
  scroll(1, 36);
  assert.deepEqual(f.calls.scenes, [1,1]);
  scroll(10, 720, {momentum: true});
  scroll(1, -30, {momentum: false});
  assert.deepEqual(f.calls.scenes, [1,1,-1]);
  pager.end();
  scroll(300, 100, {momentum: true});
  assert.deepEqual(f.calls.scenes, [1,1,-1]);
});

test('rightward trackpad return works during the entry tail and vertical paging resumes immediately', () => {
  const f = fixture();
  f.event('wheel', f.scenes[1], {deltaX: 74});
  f.tick(16); f.event('wheel', f.series, {deltaX: 25});
  f.tick(16); f.event('wheel', f.series, {deltaX: -40});
  assert.deepEqual(f.calls.navigation, ['/series/b', '/scene/b']);
  f.tick(16); f.event('wheel', f.scenes[1], {deltaY: 50});
  assert.deepEqual(f.calls.scenes, [1]);
});
test('horizontal trackpad deltas span multiple garments and support immediate reversal', () => {
  const f = fixture();
  for (let n = 0; n < 16; n++) { f.tick(14); f.event('wheel', f.wardrobe, {deltaX: 30, deltaY: 2}); }
  assert.deepEqual(f.calls.wardrobe, [1, 1]);
  f.event('wheel', f.wardrobe, {deltaX: -300});
  assert.deepEqual(f.calls.wardrobe, [1, 1, -1]);
  assert.equal(f.calls.offsets.at(-1), 20);
  f.tick(120);
  assert.equal(f.calls.settled.at(-1)[1], 0);
  assert.equal(f.event('wheel', f.wardrobe, { deltaY: 100 }).prevented, undefined);
  assert.equal(f.event('wheel', f.wardrobe, { deltaX: 100, ctrlKey: true }).prevented, undefined);
  f.event('wheel', f.wardrobe, { deltaY: -90, shiftKey: true });
  f.tick(120);
  assert.deepEqual(f.calls.wardrobe, [1, 1, -1, -1]);
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

test('upper and lower mannequin swipes move only the slot where the drag started', () => {
  const f = fixture();
  f.drag(f.bodyZone(0), -110, 6, 'touch');
  f.drag(f.bodyZone(1), 120, -3, 'touch');
  f.drag(f.bodyZone(0), 4, 115, 'touch');
  assert.deepEqual(f.calls.previewRows, [0, 1]);
  assert.deepEqual(f.calls.wardrobe, [1, -1]);
  assert.deepEqual(f.calls.bodyRows, [0, 1]);
  assert.deepEqual(f.calls.navigation, []);
});

test('trackpad deltas keep the gesture on the starting garment until it settles', () => {
  const f = fixture(), top = f.bodyZone(0);
  f.event('wheel',top,{deltaX:12, deltaY:1});
  assert.deepEqual(f.calls.offsets, [-12]);
  assert.deepEqual(f.calls.bodyRows, []);
  f.event('wheel',top,{deltaX:18});
  f.event('wheel',top,{deltaX:16});
  for (let i=0;i<8;i++) { f.tick(15); f.event('wheel',i<4 ? top : f.bodyZone(1),{deltaX:17}); }
  f.tick(120);
  assert.deepEqual(f.calls.wardrobe, [1]);
  assert.deepEqual(f.calls.bodyRows, [0]);
  assert.deepEqual(f.calls.settled, [[0,1]]);
  f.tick(300);
  f.event('wheel',f.bodyZone(1),{deltaX:-55});
  f.tick(120);
  assert.deepEqual(f.calls.wardrobe, [1,-1]);
  assert.deepEqual(f.calls.bodyRows, [0,1]);
});

test('a small trackpad nudge snaps back, vertical scrolling and pinch zoom are native', () => {
  const f = fixture(), trousers = f.bodyZone(1);
  f.event('wheel',trousers,{deltaX:14});
  f.tick(250);
  assert.deepEqual(f.calls.settled, [[1,0]]);
  assert.deepEqual(f.calls.wardrobe, []);
  assert.equal(f.event('wheel',trousers,{deltaX:4,deltaY:100}).prevented, undefined);
  assert.equal(f.event('wheel',trousers,{deltaX:105,ctrlKey:true}).prevented, undefined);
});

test('dragging a side thumbnail also visibly slides the corresponding garment', () => {
  const f=fixture(); f.drag(f.wardrobe, -25, 1, 'touch');
  assert.deepEqual(f.calls.previewRows, [0]);
  assert.deepEqual(f.calls.wardrobe, [1]);
  assert.deepEqual(f.calls.navigation, []);
});

test('one held drag crosses several pieces and reverses before release', () => {
  const f = fixture(), zone = f.bodyZone(1);
  f.event('pointerdown', zone);
  f.event('pointermove', zone, {clientX: 180});
  f.event('pointermove', zone, {clientX: -10});
  assert.deepEqual(f.calls.wardrobe, [1, 1]);
  f.event('pointermove', zone, {clientX: 205});
  assert.deepEqual(f.calls.wardrobe, [1, 1, -1]);
  f.event('pointerup', zone, {clientX: 205});
  assert.deepEqual(f.calls.bodyRows, [1, 1, 1]);
  f.event('pointerdown', zone);
  f.event('pointerup', zone);
  assert.equal(f.event('click', zone).stopped, undefined);
});
