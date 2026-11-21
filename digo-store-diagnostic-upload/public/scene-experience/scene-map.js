/* Scene map: press and hold a Discover scene and the page shrinks into a map of every
   category. Keep holding and slide onto a branch to open it, then let go on a scene. */
(function () {
  const HOLD_MS = 380, DWELL_MS = 240, HINT_KEY = 'digo-scene-map-hint';
  const root = () => document.querySelector('#overlay-root');
  let hold = null, map = null, hintTimer = 0;

  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isOpen = () => !!map && map.el.isConnected;
  function currentSceneId() { return visibleSceneCard(document.querySelector('.moment-feed'))?.dataset.scene || null; }
  function hintState() { try { return JSON.parse(localStorage.getItem(HINT_KEY) || '{}'); } catch { return {}; } }
  function setHint(value) { try { localStorage.setItem(HINT_KEY, JSON.stringify({...hintState(), ...value})); } catch {} }

  // Nodes sit on an ellipse around the centre, starting at twelve o'clock.
  function ring(count, width, height) {
    const narrow = width < 641;
    const rx = Math.min(width * (narrow ? .34 : .33), 430), ry = Math.min(height * (narrow ? .31 : .30), 290);
    return Array.from({length: count}, (_, i) => {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / count;
      return [width / 2 + rx * Math.cos(angle), height / 2 + ry * Math.sin(angle)];
    });
  }
  function levelNodes() {
    if (map.branch) {
      const branch = map.branch;
      return {
        centre: {kind: 'back', id: branch.id, title: branch.title, image: sceneFor(branch.cover)?.image, note: 'All categories'},
        nodes: branch.scenes.map(([id, title]) => ({kind: 'scene', id, title, image: sceneFor(id)?.image, current: id === map.sceneId})).filter(node => node.image)
      };
    }
    const here = sceneFor(map.sceneId), scope = world.browse?.scope;
    const nodes = discoverBranches.map(branch => ({kind: 'branch', id: branch.id, title: branch.title, image: sceneFor(branch.cover)?.image,
      note: branch.scenes.length + ' scenes', current: branchForScene(map.sceneId)?.id === branch.id}));
    if (scope) nodes.push({kind: 'all', id: 'all', title: 'All scenes', note: 'Back to everything'});
    return {centre: {kind: 'close', id: map.sceneId, title: here ? sceneLabel(branchForScene(here.id), here) : 'This scene', image: here?.image, note: 'You are here'}, nodes};
  }
  function nodeHtml(node, x, y, centre) {
    const art = node.image ? `<img src="${esc(node.image)}" alt="" draggable="false">` : `<i aria-hidden="true">${icon('grid')}</i>`;
    return `<button class="map-node ${centre ? 'map-centre' : ''} ${node.current ? 'is-current' : ''}" data-map="${node.kind}" data-id="${esc(node.id)}" style="left:${x}px;top:${y}px">
      <span class="map-art">${art}</span><strong>${esc(node.title)}</strong>${node.note ? `<small>${esc(node.note)}</small>` : ''}</button>`;
  }
  function draw(entering) {
    const width = innerWidth, height = innerHeight, {centre, nodes} = levelNodes(), points = ring(nodes.length, width, height);
    const prompt = map.branch ? (map.holding ? 'Let go on a scene' : 'Choose a scene') : (map.holding ? 'Keep holding · slide to a category' : 'Choose a category');
    map.points = [{node: centre, x: width / 2, y: height / 2, centre: true}, ...nodes.map((node, i) => ({node, x: points[i][0], y: points[i][1]}))];
    map.el.innerHTML = `<svg class="map-lines" aria-hidden="true">${points.map(([x, y]) => `<line x1="${width / 2}" y1="${height / 2}" x2="${x}" y2="${y}"/>`).join('')}</svg>
      <div class="map-level ${entering || ''}">${nodeHtml(centre, width / 2, height / 2, true)}${nodes.map((node, i) => nodeHtml(node, points[i][0], points[i][1])).join('')}</div>
      <p class="map-prompt" aria-live="polite">${prompt}</p><button class="map-close" data-map="close" aria-label="Close the scene map">${icon('close')}</button>`;
    const size = map.el.querySelector('.map-centre .map-art')?.getBoundingClientRect();
    if (size?.width) map.el.style.setProperty('--map-zoom', Math.max(width / size.width, height / size.height).toFixed(2));
    map.hover = null; map.armed = !map.holding; map.origin = map.pointer;
  }
  function open(sceneId, pointer) {
    if (isOpen() || !sceneId || !sceneFor(sceneId)) return false;
    closeOverlay();
    const el = document.createElement('div');
    el.className = 'scene-map'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Scene map');
    root().append(el);
    map = {el, sceneId, branch: null, holding: !!pointer, pointer: pointer || null, hover: null, dwell: 0};
    document.body.classList.add('scene-map-open');
    draw('is-shrinking');
    setHint({used: true}); hideHint();
    if (pointer) navigator.vibrate?.(8); else el.querySelector('.map-node:not(.map-centre)')?.focus();
    return true;
  }
  function close() {
    clearTimeout(map?.dwell);
    map = null;
    document.body.classList.remove('scene-map-open');
    const el = root()?.querySelector('.scene-map');
    if (el) el.remove();
  }
  function showBranch(id) {
    map.branch = discoverBranches.find(branch => branch.id === id) || null;
    draw('is-arriving');
    if (!map.holding) map.el.querySelector('.map-node.is-current, .map-node:not(.map-centre)')?.focus();
  }
  function choose(kind, id) {
    if (kind === 'branch') return showBranch(id);
    if (kind === 'back') return showBranch(null);
    if (kind === 'close') return close();
    if (kind === 'all') {
      world.browse = {...world.browse, scope: null}; writeWorld(); close(); render(false);
      return toast('Showing every scene.');
    }
    if (kind === 'scene') {
      const branch = branchForScene(id);
      world.browse = {...world.browse, scope: branch?.id || null, discover: id}; writeWorld(); close();
      if (route() === '/scene/' + id) render(false); else navigate('/scene/' + id);
    }
  }
  function nodeAt(x, y) {
    let best = null, reach = innerWidth < 641 ? 46 : 62;
    for (const point of map.points) {
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < reach) { best = point; reach = distance; }
    }
    return best;
  }
  function track(x, y) {
    if (!map.armed) {
      if (!map.origin || Math.hypot(x - map.origin.x, y - map.origin.y) < 14) return;
      map.armed = true;
    }
    const point = nodeAt(x, y), node = point?.node || null;
    if (node === map.hover) return;
    clearTimeout(map.dwell);
    map.hover = node;
    for (const button of map.el.querySelectorAll('.map-node')) button.classList.toggle('is-hover', !!node && button.dataset.id === node.id && button.dataset.map === node.kind);
    if (node && (node.kind === 'branch' || node.kind === 'back')) map.dwell = setTimeout(() => { if (isOpen() && map.hover === node) { navigator.vibrate?.(6); choose(node.kind, node.id); } }, DWELL_MS);
  }

  function cancelHold() { if (hold) { clearTimeout(hold.timer); hold = null; } }
  document.addEventListener('pointerdown', event => {
    hideHint();
    cancelHold();
    if (isOpen() || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const poster = event.target.closest?.('.discover-poster:not(.piece-poster)');
    if (!poster || event.target.closest('button, a, .life-rail')) return;
    const start = {x: event.clientX, y: event.clientY};
    hold = {id: event.pointerId, ...start, timer: setTimeout(() => {
      const pending = hold; hold = null;
      if (pending && open(poster.dataset.scene, start)) map.pointerId = pending.id;
    }, HOLD_MS)};
  }, true);
  document.addEventListener('pointermove', event => {
    if (hold && event.pointerId === hold.id && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 10) cancelHold();
    if (isOpen() && map.holding && event.pointerId === map.pointerId) {
      map.pointer = {x: event.clientX, y: event.clientY};
      track(event.clientX, event.clientY);
      if (event.cancelable) event.preventDefault();
    }
  }, {capture: true, passive: false});
  function release(event) {
    cancelHold();
    if (!isOpen() || !map.holding || event.pointerId !== map.pointerId) return;
    clearTimeout(map.dwell);
    const node = event.type === 'pointerup' ? map.hover : null;
    map.holding = false; map.pointerId = null;
    if (node && node.kind !== 'close') choose(node.kind, node.id);
    else draw('');
    if (isOpen()) map.el.querySelector('.map-node.is-current, .map-node:not(.map-centre)')?.focus({preventScroll: true});
  }
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
  document.addEventListener('contextmenu', event => {
    if (isOpen() || (hold && event.target.closest?.('.discover-poster'))) event.preventDefault();
  });
  document.addEventListener('click', event => {
    if (!isOpen()) return;
    const node = event.target.closest('[data-map]');
    event.preventDefault(); event.stopPropagation();
    if (node) choose(node.dataset.map, node.dataset.id);
    else if (event.target === map.el || event.target.closest('.map-lines')) close();
  }, true);
  document.addEventListener('keydown', event => {
    if (isOpen()) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); map.branch ? showBranch(null) : close(); }
      return;
    }
    hideHint();
    if (event.key.toLowerCase() !== 'm' || event.altKey || event.metaKey || event.ctrlKey || event.target.closest('input, textarea, select, [contenteditable]')) return;
    if (root()?.innerHTML) return;
    const id = currentSceneId();
    if (id && document.querySelector('.discover-poster:not(.piece-poster)')) { event.preventDefault(); open(id, null); }
  }, true);
  addEventListener('resize', () => { if (isOpen()) draw(''); });
  addEventListener('hashchange', () => { map = null; document.body.classList.remove('scene-map-open'); });

  // First visits get a short demonstration of the gesture. It never blocks the page.
  function hideHint() { clearTimeout(hintTimer); document.querySelector('.map-hint')?.remove(); }
  function showHint() {
    const state = hintState();
    if (state.used || (state.shown || 0) >= 3 || isOpen() || root()?.innerHTML) return;
    const poster = document.querySelector('.discover-poster:not(.piece-poster)');
    if (!poster || document.querySelector('.map-hint')) return;
    const hint = document.createElement('div');
    hint.className = 'map-hint'; hint.setAttribute('role', 'note');
    hint.innerHTML = `<div class="map-hint-stage" aria-hidden="true"><span class="map-hint-chip a">Work</span><span class="map-hint-chip b">Travel</span><span class="map-hint-chip c">Social</span><span class="map-hint-ring"></span><span class="map-hint-finger"></span></div>
      <p><strong>Press and hold</strong> anywhere to browse scenes by category</p>`;
    document.body.append(hint);
    setHint({shown: (state.shown || 0) + 1});
    hintTimer = setTimeout(hideHint, still() ? 6000 : 9000);
  }
  function scheduleHint() {
    clearTimeout(hintTimer);
    if (document.querySelector('.discover-poster:not(.piece-poster)')) hintTimer = setTimeout(showHint, 1400);
  }
  addEventListener('wheel', hideHint, {passive: true});
  if (document.readyState === 'complete') scheduleHint(); else addEventListener('load', scheduleHint);

  window.DigoSceneMap = {open: () => open(currentSceneId(), null), close, isOpen};
})();
