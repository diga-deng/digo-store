/* Four persistent browsing lanes. Only deliberate actions create history. */
const lanePaths = ['/', '/interests', '/recent', '/world'];
const laneNames = ['Discover', 'Interested scenes', 'Viewed products', 'My World'];
const laneIcons = ['sun', 'grid', 'bag', 'world'];
const tutorialVersion = 'swipe-v1';
const swipeUI = { direction: '', tutorialStep: null, lastLane: 0, worldScroll: 0, blockedClickUntil: 0 };
state.sceneInteractions = Array.isArray(state.sceneInteractions) ? state.sceneInteractions : [];
state.viewedProducts = Array.isArray(state.viewedProducts) ? state.viewedProducts : [];
// Previously saved or edited scenes are genuine actions, unlike impressions.
for (const id of [...new Set([...state.saved, ...Object.keys(state.drafts)])]) {
  if (!state.sceneInteractions.some(x => x.id === id)) state.sceneInteractions.push({ id, at: 0, actions: ['saved'] });
}
ui.discoverIndex = 0;
ui.interestIndex = 0;
ui.recentIndex = 0;

function routePath() { return location.hash.slice(1) || '/'; }
function laneIndex() { return lanePaths.indexOf(routePath()); }
function knownScene(id) { return [...baseScenes, ...state.custom].some(s => s.id === id); }
function interestedScenes() { return state.sceneInteractions.filter(x => knownScene(x.id)).map(x => getScene(x.id)); }
function viewedPieces() { return state.viewedProducts.filter(x => x && (getProduct(x.id) || (x.kind === 'catalog' && typeof x.product?.slug === 'string' && typeof x.product?.name === 'string' && Number.isSafeInteger(x.product?.price_cents)))); }
function rememberSceneView() { return interestedScenes()[ui.interestIndex]?.id; }

function recordSceneInteraction(id, action) {
  if (!id || !knownScene(id)) return;
  const current = rememberSceneView();
  const previous = state.sceneInteractions.find(x => x.id === id);
  state.sceneInteractions = [{ id, at: Date.now(), actions: [...new Set([...(previous?.actions || []), action])] }, ...state.sceneInteractions.filter(x => x.id !== id)].slice(0, 50);
  ui.interestIndex = laneIndex() === 1 && current ? Math.max(0, interestedScenes().findIndex(s => s.id === current)) : 0;
  persist();
}

function recordProductView(id, scene) {
  if (!getProduct(id)) return;
  const previous = state.viewedProducts.find(x => x.id === id);
  const source = knownScene(scene) ? scene : previous?.scene || null;
  state.viewedProducts = [{ id, scene: source, at: Date.now() }, ...state.viewedProducts.filter(x => x.id !== id)].slice(0, 50);
  ui.recentIndex = 0;
  recordSceneInteraction(source, 'product');
  persist();
}

function bottomNavigation() {
  let active = laneIndex();
  if (active < 0) active = routePath() === '/scenes' ? 1 : routePath() === '/shop' ? 2 : swipeUI.lastLane;
  return `<nav class="bottom-lanes" aria-label="Main navigation">${lanePaths.map((path, i) => `<a class="lane-tab ${i === active ? 'active' : ''}" href="#${path}" aria-label="${laneNames[i]}" title="${laneNames[i]}" ${i === active ? 'aria-current="page"' : ''}>${icon(laneIcons[i])}</a>`).join('')}</nav>`;
}

function sceneFeedPage(mode) {
  const scenes = mode === 'interests' ? interestedScenes() : baseScenes;
  const key = mode === 'interests' ? 'interestIndex' : 'discoverIndex';
  ui[key] = Math.min(ui[key] || 0, Math.max(0, scenes.length - 1));
  const scene = scenes[ui[key]];
  const empty = `<section class="feed-empty"><span class="empty-symbol">${icon('grid')}</span><p>Scenes you tap, save or edit appear here.</p><a class="empty-return" href="#/" aria-label="Back to Discover" title="Discover">${icon('left')}${icon('sun')}</a></section>`;
  return `${header()}<main id="main" class="swipe-main gesture-surface" data-feed="${mode}"><h1 class="sr-only">${mode === 'interests' ? 'Interested scenes' : 'Discover'}</h1>${scene ? `<section class="hero shoppable-hero feed-stage" data-active-scene="${scene.id}" aria-label="${esc(scene.title)}" tabindex="0"><img class="hero-img" src="${esc(scene.image)}" alt="${esc(scene.subtitle)}" draggable="false" fetchpriority="high"><button class="feed-help icon-btn" data-action="gesture-help" aria-label="Replay swipe guide" title="Swipe guide">${icon('info')}</button><div class="picture-tools"><button class="picture-tool ${state.saved.includes(scene.id) ? 'selected' : ''}" data-action="save" data-id="${scene.id}" aria-label="${state.saved.includes(scene.id) ? 'Unsave' : 'Save'} ${esc(scene.title)}" title="Save" aria-pressed="${state.saved.includes(scene.id)}">${icon('save')}</button><a class="picture-tool" href="#/edit/${scene.id}" aria-label="Make ${esc(scene.title)} mine" title="Make it mine">${icon('plus')}</a></div>${scenePins(scene)}${glassProductRail(scene)}<div class="hero-commerce"><div class="hero-collection-actions"><button class="scene-shop-entry" data-action="shop-scene" data-id="${scene.id}" aria-label="Shop all ${scene.items.length} pieces in this scene" title="Shop this scene">${icon('cart')}<span>${scene.items.length}</span></button><a class="scene-enter" href="#/scene/${scene.id}" aria-label="Enter ${esc(scene.title)}" title="Enter scene">${icon('arrow')}</a></div></div></section>` : empty}<span class="sr-only" role="status" aria-live="polite">${scene ? esc(scene.title) : 'No interested scenes yet'}</span></main>${bottomNavigation()}<div id="gesture-coach-root"></div>`;
}

function recentProductsPage() {
  const entries = viewedPieces();
  ui.recentIndex = Math.min(ui.recentIndex || 0, Math.max(0, entries.length - 1));
  const entry = entries[ui.recentIndex];
  if (entry?.kind === 'catalog') return catalogRecentPage(entry);
  const p = entry && getProduct(entry.id);
  const source = entry?.scene && knownScene(entry.scene) ? getScene(entry.scene) : null;
  return `${header()}<main id="main" class="swipe-main gesture-surface recent-lane" data-feed="recent"><h1 class="sr-only">Viewed products</h1>${p ? `<section class="recent-stage" data-active-product="${p.id}" data-scene="${source?.id || ''}" aria-label="${esc(p.name)}" tabindex="0"><button class="recent-product-art" data-action="product" data-id="${p.id}" aria-label="View ${esc(p.name)}">${productPhoto(p)}</button><div class="recent-product-summary"><span class="recent-category" aria-label="${p.category}">${icon(p.category === 'Wear' ? 'shirt' : 'home')}</span><h2>${esc(p.name)}</h2><p>${esc(p.material)}</p><button class="recent-buy" data-action="product" data-id="${p.id}" aria-label="Choose options for ${esc(p.name)}">${icon('cart')}</button>${source ? `<a class="recent-source" href="#/scene/${source.id}" aria-label="See ${esc(source.title)}" title="${esc(source.title)}"><img src="${esc(source.image)}" alt="${esc(source.title)}" draggable="false">${icon('arrow')}</a>` : ''}</div><button class="feed-help icon-btn" data-action="gesture-help" aria-label="Replay swipe guide" title="Swipe guide">${icon('info')}</button></section>` : `<section class="feed-empty"><span class="empty-symbol">${icon('bag')}</span><p>Pieces you open will be waiting here.</p><a class="empty-return" href="#/" aria-label="Back to Discover" title="Discover">${icon('left')}${icon('sun')}</a><a class="empty-catalog" href="#/shop" aria-label="Browse all products" title="All products">${icon('search')}</a></section>`}<span class="sr-only" role="status" aria-live="polite">${p ? esc(p.name) : 'No viewed products yet'}</span></main>${bottomNavigation()}<div id="gesture-coach-root"></div>`;
}

const handOutline = `<svg viewBox="0 0 80 100" aria-hidden="true"><path d="M27 48V15c0-7 11-7 11 0v25-7c0-7 11-7 11 0v10-6c0-7 11-7 11 0v12-5c0-7 10-7 10 0v23c0 12-8 17-11 24H35c-3-8-9-14-14-20L11 58c-5-7 3-14 9-8l7 8Z"/></svg>`;
const guideCopy = ['Swipe up or down · Explore scenes', 'Swipe left · Scenes you interacted with', 'Swipe left again · Pieces you opened'];

function paintGuide() {
  let root = $('#gesture-coach-root');
  if (!root) { root = document.createElement('div'); root.id = 'gesture-coach-root'; $('#app').append(root); }
  const step = swipeUI.tutorialStep;
  if (step === null) { root.innerHTML = ''; return; }
  root.innerHTML = `<aside class="gesture-coach ${step === 0 ? 'guide-vertical' : 'guide-horizontal'}" aria-label="Swipe guide"><button class="guide-skip" data-action="guide-skip" aria-label="Skip swipe guide" title="Skip">${icon('close')}</button><div class="guide-demonstration"><span class="guide-track"></span><span class="guide-hand">${handOutline}</span></div><div class="guide-copy" role="status" aria-live="polite">${guideCopy[step]}</div><div class="guide-controls"><span class="guide-dots" aria-hidden="true">${guideCopy.map((_, i) => `<i class="${i === step ? 'active' : ''}"></i>`).join('')}</span><button class="guide-next" data-action="guide-next" aria-label="${step === 2 ? 'Finish swipe guide' : 'Next swipe tip'}" title="${step === 2 ? 'Done' : 'Next'}">${icon(step === 2 ? 'check' : 'right')}</button></div></aside>`;
}

function finishGuide() { swipeUI.tutorialStep = null; state.gestureTutorial = tutorialVersion; persist(); paintGuide(); }
function advanceGuide(axis, step) {
  if (swipeUI.tutorialStep === 0 && axis === 'vertical') swipeUI.tutorialStep = 1;
  else if (swipeUI.tutorialStep === 1 && axis === 'horizontal' && step > 0) swipeUI.tutorialStep = 2;
  else if (swipeUI.tutorialStep === 2 && axis === 'horizontal' && step > 0) finishGuide();
}

function mountSwipePage() {
  const lane = laneIndex();
  if (lane >= 0) swipeUI.lastLane = lane;
  const main = $('#main');
  if (lane >= 0) main?.classList.add('gesture-surface');
  if (swipeUI.direction && main) main.classList.add('motion-' + swipeUI.direction);
  swipeUI.direction = '';
  if (lane === 0 && state.gestureTutorial !== tutorialVersion && swipeUI.tutorialStep === null) swipeUI.tutorialStep = 0;
  if (lane >= 0) paintGuide();
  if (lane === 3 && swipeUI.worldScroll) requestAnimationFrame(() => window.scrollTo(0, swipeUI.worldScroll));
}

function moveScene(step) {
  if ($('#overlay-root').innerHTML) return false;
  const lane = laneIndex();
  const key = lane === 0 ? 'discoverIndex' : lane === 1 ? 'interestIndex' : 'recentIndex';
  const length = lane === 0 ? baseScenes.length : lane === 1 ? interestedScenes().length : lane === 2 ? viewedPieces().length : 0;
  if (!length) return false;
  ui[key] = ((ui[key] || 0) + step + length) % length;
  swipeUI.direction = step > 0 ? 'up' : 'down';
  advanceGuide('vertical', step);
  render(false);
  return true;
}

function moveLane(step) {
  if ($('#overlay-root').innerHTML) return false;
  const lane = laneIndex();
  const target = lane + step;
  if (lane < 0 || target < 0 || target >= lanePaths.length) return false;
  if (lane === 3) swipeUI.worldScroll = window.scrollY;
  swipeUI.direction = step > 0 ? 'left' : 'right';
  advanceGuide('horizontal', step);
  navigate(lanePaths[target]);
  return true;
}

function gestureIgnored(target) {
  return !!target.closest('.glass-product-rail,input,textarea,select,.bottom-lanes,.gesture-coach,.overlay,[data-gesture-ignore]');
}

let drag = null;
function resetDrag() {
  if (drag?.surface?.isConnected) { drag.surface.style.removeProperty('--gesture-x'); drag.surface.style.removeProperty('--gesture-y'); drag.surface.classList.remove('gesture-dragging'); }
  drag = null;
}

document.addEventListener('pointerdown', e => {
  if (!e.isPrimary) { resetDrag(); return; }
  const surface = e.target.closest('.gesture-surface');
  if (!surface || $('#overlay-root').innerHTML || gestureIgnored(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return;
  drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, id: e.pointerId, surface, axis: null, time: performance.now() };
});
document.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
  const x = Math.abs(drag.dx), y = Math.abs(drag.dy);
  if (!drag.axis && Math.max(x, y) > 12) {
    if (x > y * 1.25) drag.axis = 'horizontal';
    else if (y > x * 1.25) drag.axis = 'vertical';
    if (drag.axis === 'vertical' && laneIndex() === 3) { resetDrag(); return; }
    if (drag.axis) { drag.surface.setPointerCapture(e.pointerId); drag.surface.classList.add('gesture-dragging'); }
  }
  if (!drag?.axis) return;
  if (e.cancelable) e.preventDefault();
  const axis = drag.axis === 'horizontal' ? 'x' : 'y';
  const distance = axis === 'x' ? drag.dx : drag.dy;
  drag.surface.style.setProperty('--gesture-' + axis, Math.max(-42, Math.min(42, distance * .18)) + 'px');
}, { passive: false });
document.addEventListener('pointerup', e => {
  if (!drag || drag.id !== e.pointerId) return;
  const axis = drag.axis;
  const distance = axis === 'horizontal' ? e.clientX - drag.x : e.clientY - drag.y;
  const threshold = axis === 'horizontal' ? 56 : 62;
  const moved = Math.max(Math.abs(e.clientX - drag.x), Math.abs(e.clientY - drag.y)) > 12;
  resetDrag();
  if (moved) swipeUI.blockedClickUntil = performance.now() + 400;
  if (!axis || Math.abs(distance) < threshold) return;
  const step = distance < 0 ? 1 : -1;
  axis === 'horizontal' ? moveLane(step) : moveScene(step);
});
document.addEventListener('pointercancel', resetDrag);
document.addEventListener('touchstart', e => { if (e.touches.length > 1) resetDrag(); }, { passive: true });

// Wheel/trackpad momentum advances one page per gesture, not many scenes at once.
let wheel = { x: 0, y: 0, time: 0, fired: false };
document.addEventListener('wheel', e => {
  if (!e.target.closest('.gesture-surface') || gestureIgnored(e.target) || $('#overlay-root').innerHTML || e.ctrlKey) return;
  const now = performance.now();
  if (now - wheel.time > 160) wheel = { x: 0, y: 0, time: now, fired: false };
  wheel.time = now;
  const factor = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? innerHeight : 1;
  const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * factor;
  const dy = (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * factor;
  if (laneIndex() === 3 && Math.abs(dy) >= Math.abs(dx)) return;
  if (e.cancelable) e.preventDefault();
  if (wheel.fired) return;
  wheel.x += dx; wheel.y += dy;
  if (Math.max(Math.abs(wheel.x), Math.abs(wheel.y)) < 65) return;
  wheel.fired = true;
  if (Math.abs(wheel.x) > Math.abs(wheel.y) * 1.2) moveLane(wheel.x > 0 ? 1 : -1);
  else if (Math.abs(wheel.y) > Math.abs(wheel.x) * 1.2) moveScene(wheel.y > 0 ? 1 : -1);
}, { passive: false });

document.addEventListener('keydown', e => {
  if (laneIndex() < 0 || $('#overlay-root').innerHTML || e.target.closest('input,textarea,select,[contenteditable=true]') || e.altKey || e.metaKey || e.ctrlKey) return;
  if (e.key === 'Escape' && swipeUI.tutorialStep !== null) { finishGuide(); return; }
  const moves = { ArrowLeft: () => moveLane(-1), ArrowRight: () => moveLane(1), ArrowUp: () => moveScene(-1), ArrowDown: () => moveScene(1) };
  if (moves[e.key] && !(laneIndex() === 3 && ['ArrowUp', 'ArrowDown'].includes(e.key))) { e.preventDefault(); moves[e.key](); }
});

document.addEventListener('click', e => {
  if (performance.now() < swipeUI.blockedClickUntil) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  const action = e.target.closest('[data-action]');
  if (['gesture-help', 'guide-next', 'guide-skip'].includes(action?.dataset.action)) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (action.dataset.action === 'guide-skip') finishGuide();
    else if (action.dataset.action === 'guide-next') {
      if (swipeUI.tutorialStep === 2) finishGuide();
      else { swipeUI.tutorialStep++; paintGuide(); }
    } else {
      swipeUI.tutorialStep = 0;
      if (laneIndex() !== 0) navigate('/'); else paintGuide();
    }
    return;
  }
  const link = e.target.closest('a[href]');
  if (link) {
    const match = link.getAttribute('href').match(/^#\/(scene|edit)\/([^/]+)$/);
    if (match) recordSceneInteraction(match[2], match[1] === 'edit' ? 'edit' : 'enter');
    if (link.classList.contains('lane-tab')) {
      const lane = laneIndex(), target = lanePaths.indexOf(link.getAttribute('href').slice(1));
      if (lane === 3) swipeUI.worldScroll = window.scrollY;
      if (target !== lane) {
        swipeUI.direction = target > lane ? 'left' : 'right';
        if (target > lane) advanceGuide('horizontal', 1);
      }
    }
  }
}, true);

render();
