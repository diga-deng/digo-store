/* Discover commits a whole scene per swipe. Fitting-room gestures follow the garment. */
function mountJourneyGestures() {
  const main = document.querySelector('.life-main');
  const feed = !!document.querySelector('.moment-feed');
  document.documentElement.classList.remove('scene-scroll');
  document.body.classList.toggle('journey-feed', feed);
  main?.classList.toggle('journey-module', ['/', '/wardrobe', '/world', '/plans'].includes(route()) || feed || main.matches('.scene-series'));
  if (feed && main) {
    mountDiscoverWheel(main);
    preloadNeighborPhotos(visibleSceneCard(main)?.dataset.scene);
  }
  if (journeyDirection && main) {
    main.classList.add('journey-enter-' + journeyDirection);
    journeyDirection = '';
  }
}

// A trackpad can pause or change speed while the same fingers are still down.
// Give the browser a stable scrolling element so it can signal the actual end.
// Only the input surface scrolls; its visible scene stays pinned to the viewport.
const discoverWheel = new WeakMap();
function mountDiscoverWheel(feed) {
  const pager = feed.closest('.discover-pager');
  if (!pager || discoverWheel.has(feed) || !('onscrollend' in pager)) return;
  pager.classList.add('native-wheel');
  const center = () => { pager.scrollTop = (pager.scrollHeight - pager.clientHeight) / 2; };
  center();
  const state = {start: pager.scrollTop, armed: false, fired: false, momentum: false};
  discoverWheel.set(feed, state);

  pager.addEventListener('scroll', () => {
    if (!state.armed || state.fired || !feed.isConnected) return;
    const distance = pager.scrollTop - state.start;
    if (Math.abs(distance) < 24) return;
    state.fired = true;
    moveJourneyScene(Math.sign(distance));
  }, {passive: true});
  pager.addEventListener('scrollend', event => {
    if (event.target !== pager || !pager.isConnected) return;
    state.armed = state.fired = state.momentum = false;
    const remaining = pager.scrollHeight - pager.clientHeight - pager.scrollTop;
    if (Math.min(pager.scrollTop, remaining) < pager.clientHeight) center();
    state.start = pager.scrollTop;
  });
}

(function () {
  let drag = null, blockedUntil = 0;
  let consumedPointer = null, wheel = null;
  const wheelIdleMs = 180;
  const editable = 'input,textarea,select,[contenteditable=true]';
  const overlayOpen = () => !!document.querySelector('#overlay-root')?.innerHTML;
  const now = () => performance.now();

  function surfaceFor(target) {
    if (target.closest(editable) || overlayOpen()) return null;
    const horizontal = target.closest('[data-fitting-swipe],.life-nav');
    if (horizontal) {
      const source = horizontal.matches('.life-nav') && document.querySelector('.moment-feed,.scene-series');
      if (source) return { node: source, axis: source.matches('.moment-feed') ? 'both' : 'x' };
      return { node: horizontal, axis: 'x' };
    }
    if (target.closest('.life-rail,.closet-categories,#circle-canvas,[data-gesture-ignore]')) return null;
    const main = target.closest('.journey-module');
    if (main?.matches('.moment-feed')) return { node: main, axis: 'both' };
    if (main?.matches('.scene-series')) return { node: main, axis: 'x' };
    if (target.closest('button,a')) return null;
    if (main?.querySelector('.fitting-room')) return null;
    return main ? { node: main, axis: 'x' } : null;
  }

  function move(surface, axis, step, focus = false) {
    if (overlayOpen() || !surface.isConnected) return false;
    if (surface.matches('[data-fitting-swipe]')) {
      if (Number(surface.dataset.count) < 2) return false;
      moveFittingPiece(step, Number(surface.dataset.row), focus);
      if (focus) surface.focus({ preventScroll: true });
      return true;
    }
    if (axis === 'y') {
      return moveJourneyScene(step, focus);
    }
    if (surface.matches('.moment-feed')) {
      const id = visibleSceneCard(surface)?.dataset.scene;
      if (surface.matches('.piece-feed')) return step === -1 && !!id && leaveSceneSeries(id);
      if (surface.matches('.branch-feed')) return step === 1 && openDiscoverBranch(id);
      if (step === -1 && surface.matches('.branch-scenes')) {
        return leaveDiscoverBranch(visibleSceneCard(surface).dataset.branch);
      }
      return step === 1 && !!id && openSceneSeries(id);
    }
    if (surface.matches('.scene-series')) {
      const id = surface.querySelector('[data-series-scene]')?.dataset.seriesScene;
      return step === -1 && !!id && leaveSceneSeries(id);
    }
    const nav = document.querySelector('.life-nav');
    const links = [...(nav?.querySelectorAll('a[href]') || [])];
    const index = links.findIndex(link => link.getAttribute('aria-current') === 'page');
    const target = links[index + step];
    if (index < 0 || !target) return false;
    journeyDirection = step > 0 ? 'left' : 'right';
    navigate(target.getAttribute('href').slice(1));
    if (focus) requestAnimationFrame(() => document.querySelector('.life-nav a[aria-current="page"]')?.focus({ preventScroll: true }));
    return true;
  }

  function garmentZone(node) {
    if (node.matches('.fitting-zone')) return node;
    if (!node.matches('[data-fitting-swipe]')) return null;
    return document.querySelector(`.fitting-zone[data-row="${node.dataset.row}"]`);
  }

  function garmentThreshold(zone) {
    return Math.max(20, Math.min(40, zone.clientWidth * 0.14));
  }

  // Consume whole garment widths as the gesture travels, keeping its remaining
  // pixels on the new strip. Reversing direction consumes the same distance back.
  function startGarment(zone) {
    if (!zone || Number(zone.dataset.count) < 2) return null;
    return {zone, steps: 0, distance: resumeFittingGarment(zone), width: Math.max(1, zone.clientWidth)};
  }
  function slideGarment(gesture, delta) {
    if (!gesture || !delta) return;
    gesture.distance += delta;
    const steps = Math.trunc(gesture.distance / gesture.width);
    if (steps) {
      moveFittingPiece(-steps, Number(gesture.zone.dataset.row));
      gesture.steps -= steps;
      gesture.distance -= steps * gesture.width;
    }
    dragFittingGarment(gesture.zone, gesture.distance);
  }
  function finishGarment(gesture, threshold) {
    if (!gesture) return;
    const {zone, distance} = gesture;
    const step = Math.abs(distance) >= threshold ? -Math.sign(distance) : 0;
    settleFittingGarment(zone, step);
    if (step) moveFittingPiece(step, Number(zone.dataset.row));
  }
  let garmentScroll = null;
  function endGarmentScroll(commit = true) {
    if (!garmentScroll) return;
    clearTimeout(garmentScroll.timer);
    finishGarment(garmentScroll, commit ? garmentThreshold(garmentScroll.zone) : Infinity);
    garmentScroll = null;
  }
  function scrollGarment(zone, dx) {
    if (!garmentScroll || !garmentScroll.zone.isConnected) {
      endGarmentScroll(false);
      garmentScroll = startGarment(zone);
      if (!garmentScroll) return;
    }
    slideGarment(garmentScroll, -dx);
    clearTimeout(garmentScroll.timer);
    garmentScroll.timer = setTimeout(endGarmentScroll, 90);
  }

  function reset() {
    if (drag?.garment) {
      const {zone, steps} = drag.garment;
      if (steps) {
        zone.replaceChildren();
        moveFittingPiece(-steps, Number(zone.dataset.row));
      } else finishGarment(drag.garment, Infinity);
    }
    drag?.node.classList.remove('is-gesture-dragging');
    drag = null;
  }

  document.addEventListener('pointerdown', event => {
    if (!event.isPrimary) { reset(); return; }
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    consumedPointer = null;
    blockedUntil = 0;
    const surface = surfaceFor(event.target);
    if (!surface) return;
    endGarmentScroll();
    drag = { ...surface, zone: garmentZone(surface.node), id: event.pointerId,
      x: event.clientX, lastX: event.clientX, y: event.clientY, started: now(), locked: false };
  });
  document.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id || drag.rejected) return;
    if (overlayOpen() || !drag.node.isConnected) { reset(); return; }
    const dx = Math.abs(event.clientX - drag.x), dy = Math.abs(event.clientY - drag.y);
    if (!drag.locked) {
      if (Math.max(dx, dy) < (drag.zone ? 5 : 12)) return;
      const axis = dx > dy * 1.25 ? 'x' : dy > dx * 1.25 ? 'y' : null;
      if (!axis) return;
      if (drag.axis !== 'both' && drag.axis !== axis) { drag.rejected = true; return; }
      drag.garment = startGarment(drag.zone);
      drag.axis = axis;
      drag.locked = true;
      drag.node.setPointerCapture(event.pointerId);
      drag.node.classList.add('is-gesture-dragging');
    }
    if (drag.garment) {
      slideGarment(drag.garment, event.clientX - drag.lastX);
      drag.lastX = event.clientX;
    }
    if (!drag.zone && (drag.node.matches('.moment-feed') || drag.node.matches('.scene-series'))) {
      const distance = drag.axis === 'x' ? event.clientX - drag.x : event.clientY - drag.y;
      if (Math.abs(distance) >= 32) {
        const current = drag;
        consumedPointer = current.id;
        reset();
        const step = distance < 0 ? 1 : -1;
        move(current.node, current.axis, current.axis === 'y' && current.node.matches('.branch-feed') ? -step : step);
      }
    }
    if (event.cancelable) event.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerup', event => {
    if (event.pointerId === consumedPointer) {
      consumedPointer = null;
      blockedUntil = now() + 400;
      return;
    }
    if (!drag || event.pointerId !== drag.id) return;
    const current = drag;
    const distance = current.axis === 'x' ? event.clientX - current.x : event.clientY - current.y;
    const threshold = current.zone ? garmentThreshold(current.zone) : 32;
    const quickFlick = current.zone && now() - current.started < 180 && Math.abs(distance) >= 16;
    const passed = current.locked && !current.rejected && (Math.abs(distance) >= threshold || quickFlick);
    const step = distance < 0 ? 1 : -1;
    if (current.garment) {
      slideGarment(current.garment, event.clientX - current.lastX);
      finishGarment(current.garment, quickFlick ? 16 : threshold);
      current.garment = null;
    }
    reset();
    if (Math.max(Math.abs(event.clientX - current.x), Math.abs(event.clientY - current.y)) > 12) blockedUntil = now() + 400;
    if (passed && !current.zone) move(current.node, current.axis, current.axis === 'y' && current.node.matches('.branch-feed') ? -step : step);
  });
  document.addEventListener('pointercancel', reset);
  document.addEventListener('lostpointercapture', event => {
    // Touch starts with implicit capture on a thumbnail. Transferring it to the rail
    // must not cancel the in-progress drag.
    if (drag && event.pointerId === drag.id && event.target === drag.node) reset();
  });
  document.addEventListener('touchstart', event => { if (event.touches.length > 1) reset(); }, { passive: true });
  function cancelGestures() { reset(); endGarmentScroll(false); }
  window.addEventListener('blur', cancelGestures);
  window.addEventListener('hashchange', cancelGestures);
  document.addEventListener('dragstart', event => { if (surfaceFor(event.target)) event.preventDefault(); });
  document.addEventListener('click', event => {
    if (event.detail !== 0 && now() < blockedUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);

  document.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || overlayOpen()) return;
    const time = event.timeStamp;
    if (event.momentum === true || (wheel && time - wheel.time >= wheelIdleMs)) wheel = null;
    if (wheel) wheel.time = time;
    const surface = surfaceFor(event.target);
    if (!surface) return;
    const factor = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? surface.node.clientHeight : 1;
    const dx = (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * factor;
    const dy = (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * factor;
    const axis = Math.abs(dx) > Math.abs(dy) * 1.25 ? 'x' : Math.abs(dy) > Math.abs(dx) * 1.25 ? 'y' : null;
    const native = discoverWheel.get(surface.node);
    if (native && (axis === 'y' || (native.fired && !native.momentum))) {
      if (event.momentum === true) {
        native.momentum = true;
      } else if (axis === 'y') {
        if (native.momentum || !native.armed) {
          native.start = surface.node.closest('.discover-pager').scrollTop;
          native.fired = false;
        }
        native.momentum = false;
        native.armed = true;
      }
      return; // Let the browser scroll the pager and deliver its scrollend.
    }
    if (surface.axis === 'x' && axis !== 'x') return;
    if (event.cancelable) event.preventDefault();
    if (!axis) return;
    const zone = garmentZone(surface.node);
    if (zone) {
      if (!drag && axis === 'x') scrollGarment(zone, dx);
      return;
    }
    // Inertial events can speed up again or arrive after a long dispatch gap.
    // Only fresh contact can begin another page after the browser marks inertia.
    if (event.momentum === true) return;
    const delta = axis === 'x' ? dx : dy;
    const direction = Math.sign(delta);
    const level = (surface.node.matches('.piece-feed') || surface.node.matches('.scene-series')) ? 'pieces' : surface.node.matches('.branch-feed') ? 'categories' : 'scenes';
    const changedHeading = wheel && (axis !== wheel.axis || direction !== wheel.direction);
    // Without a momentum flag, keep the entire wheel burst latched, including
    // line/page units. A deliberate return on the newly opened series is separate.
    if (!wheel || (changedHeading && (!wheel.fired || level !== wheel.level))) {
      wheel = {axis, direction, level, time, total: 0, fired: false};
    }
    if (wheel.fired) return;
    wheel.total += Math.abs(delta);
    if (wheel.total < 28 && event.deltaMode === 0) return;
    wheel.fired = true;
    move(surface.node, axis, direction);
  }, { passive: false });

  document.addEventListener('keydown', event => {
    if (event.altKey || event.metaKey || event.ctrlKey || event.target.closest(editable) || overlayOpen()) return;
    const page = event.target === document.body && document.querySelector('.moment-feed,.scene-series');
    const surface = surfaceFor(event.target) || (page ? { node: page, axis: page.matches('.moment-feed') ? 'both' : 'x' } : null);
    if (!surface) return;
    const key = { ArrowLeft: ['x', -1], ArrowRight: ['x', 1], ArrowUp: ['y', -1], ArrowDown: ['y', 1] }[event.key];
    if (!key || (surface.axis !== 'both' && surface.axis !== key[0])) return;
    event.preventDefault();
    // Arrow keys name the finger direction on a scene; wheel deltas name the scroll direction.
    const contextPage = surface.node.matches('.moment-feed') || surface.node.matches('.scene-series');
    move(surface.node, key[0], key[0] === 'x' && contextPage ? -key[1] : key[1], true);
  });
  mountJourneyGestures();
})();
