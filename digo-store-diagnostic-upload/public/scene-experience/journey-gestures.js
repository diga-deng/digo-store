/* Discover scrolls vertically. Horizontal gestures belong to their starting surface. */
function mountJourneyGestures() {
  const main = document.querySelector('.life-main');
  const feed = !!document.querySelector('.moment-feed');
  document.documentElement.classList.remove('scene-scroll');
  document.body.classList.toggle('journey-feed', feed);
  main?.classList.toggle('journey-module', ['/', '/wardrobe', '/world', '/plans'].includes(route()) || feed || main.matches('.scene-series'));
  if (feed && main) mountSceneStream(main);
  if (journeyDirection && main) {
    main.classList.add('journey-enter-' + journeyDirection);
    journeyDirection = '';
  }
}

(function () {
  let drag = null, blockedUntil = 0;
  let wheel = { key: null, x: 0, y: 0, time: 0, fired: false };
  const editable = 'input,textarea,select,[contenteditable=true]';
  const overlayOpen = () => !!document.querySelector('#overlay-root')?.innerHTML;
  const now = () => performance.now();

  function surfaceFor(target) {
    if (target.closest(editable) || overlayOpen()) return null;
    const horizontal = target.closest('[data-fitting-swipe],.life-nav');
    if (horizontal) {
      const source = horizontal.matches('.life-nav') && document.querySelector('.moment-feed,.scene-series');
      return { node: source || horizontal, axis: 'x' };
    }
    const card = target.closest('.series-piece');
    if (card) return { node: card.closest('.scene-series'), axis: 'x' };
    if (target.closest('button,a,.life-rail,.closet-categories,#circle-canvas,[data-gesture-ignore]')) return null;
    const main = target.closest('.journey-module');
    if (main?.querySelector('.fitting-room')) return null;
    return main ? { node: main, axis: main.matches('.moment-feed') ? 'both' : 'x' } : null;
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
    drag?.stream?.classList.remove('mouse-scrolling');
    drag?.node.classList.remove('is-gesture-dragging');
    drag = null;
  }

  document.addEventListener('pointerdown', event => {
    if (!event.isPrimary) { reset(); return; }
    if (event.pointerType === 'mouse' && event.button !== 0) return;
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
      drag.stream = axis === 'y' ? drag.node.querySelector('.moment-stream') : null;
      if (drag.stream && event.pointerType !== 'mouse') { drag = null; return; }
      if (drag.stream) {
        drag.scrollStart = drag.stream.scrollTop;
        drag.stream.classList.add('mouse-scrolling');
      }
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
    if (drag.stream) drag.stream.scrollTop = drag.scrollStart + drag.y - event.clientY;
    if (event.cancelable) event.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const current = drag;
    const distance = current.axis === 'x' ? event.clientX - current.x : event.clientY - current.y;
    const threshold = current.zone ? garmentThreshold(current.zone) : (current.axis === 'x' ? 48 : 64);
    const quickFlick = current.zone && now() - current.started < 180 && Math.abs(distance) >= 16;
    const passed = current.locked && !current.rejected && (Math.abs(distance) >= threshold || quickFlick);
    const step = distance < 0 ? 1 : -1;
    if (current.garment) {
      slideGarment(current.garment, event.clientX - current.lastX);
      finishGarment(current.garment, quickFlick ? 16 : threshold);
      current.garment = null;
    }
    let destination;
    if (current.stream) {
      const height = current.stream.clientHeight;
      destination = Math.round(current.stream.scrollTop / height);
      const start = Math.round(current.scrollStart / height);
      if (passed && destination === start) destination += step;
    }
    reset();
    if (Math.max(Math.abs(event.clientX - current.x), Math.abs(event.clientY - current.y)) > 12) blockedUntil = now() + 400;
    if (current.stream) {
      current.stream.scrollTo({top: destination * current.stream.clientHeight,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    } else if (passed && !current.zone) move(current.node, current.axis, step);
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
    let surface = surfaceFor(event.target);
    // A wheel over a scene action still pages the scene; scrollable rails keep their scroll.
    if (!surface && !event.target.closest(editable + ',.life-rail')) {
      const feed = event.target.closest('.moment-feed');
      if (feed) surface = { node: feed, axis: 'both' };
    }
    if (!surface) return;
    const factor = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? surface.node.clientHeight : 1;
    const dx = (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * factor;
    const dy = (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * factor;
    const axis = Math.abs(dx) > Math.abs(dy) * 1.25 ? 'x' : Math.abs(dy) > Math.abs(dx) * 1.25 ? 'y' : null;
    if (surface.node.matches('.moment-feed') && surface.node.querySelector('.moment-stream') && axis !== 'x') return;
    if (surface.axis === 'x' && axis !== 'x') return;
    if (event.cancelable) event.preventDefault();
    if (!axis) return;
    const zone = garmentZone(surface.node);
    if (zone) {
      if (!drag && axis === 'x') scrollGarment(zone, dx);
      return;
    }
    const time = now();
    // Stable keys survive a render: inertial tails cannot advance the replacement page.
    const key = surface.node.matches('[data-fitting-swipe]') ? 'wardrobe-' + (surface.node.dataset?.row || 0) : 'pages';
    if (wheel.key !== key || time - wheel.time > 220) wheel = { key, x: 0, y: 0, time, fired: false };
    wheel.time = time;
    if (wheel.fired) return;
    wheel.x += dx; wheel.y += dy;
    if (Math.abs(wheel[axis]) < 60) return;
    wheel.fired = true;
    move(surface.node, axis, wheel[axis] > 0 ? 1 : -1);
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
