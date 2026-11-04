/* One deliberate gesture advances one page. Inner controls keep their own gestures. */
function mountJourneyGestures() {
  const main = document.querySelector('.life-main');
  const feed = !!document.querySelector('.moment-feed');
  document.documentElement.classList.remove('scene-scroll');
  document.body.classList.toggle('journey-feed', feed);
  main?.classList.toggle('journey-module', ['/', '/style', '/wardrobe', '/world', '/plans'].includes(route()) || feed);
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
    const horizontal = target.closest('.closet-garments,.life-nav');
    if (horizontal) return { node: horizontal, axis: 'x' };
    if (target.closest('button,a,.life-rail,.closet-categories,#circle-canvas,[data-gesture-ignore]')) return null;
    const main = target.closest('.journey-module');
    return main ? { node: main, axis: main.matches('.moment-feed') ? 'both' : 'x' } : null;
  }

  function move(surface, axis, step, focus = false) {
    if (overlayOpen() || !surface.isConnected) return false;
    if (surface.matches('.closet-garments')) {
      if (closetRecords().length < 2) return false;
      closetMove(step);
      if (focus) document.querySelector('.closet-garments')?.focus({ preventScroll: true });
      return true;
    }
    if (axis === 'y') {
      const changed = moveJourneyScene(step);
      if (changed && focus) document.querySelector('.moment-feed .life-scene')?.focus({ preventScroll: true });
      return changed;
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

  function reset() {
    drag?.node.classList.remove('is-gesture-dragging');
    drag = null;
  }

  document.addEventListener('pointerdown', event => {
    if (!event.isPrimary) { reset(); return; }
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const surface = surfaceFor(event.target);
    if (!surface) return;
    drag = { ...surface, id: event.pointerId, x: event.clientX, y: event.clientY, locked: false };
  });
  document.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id || drag.rejected) return;
    if (overlayOpen() || !drag.node.isConnected) { reset(); return; }
    const dx = Math.abs(event.clientX - drag.x), dy = Math.abs(event.clientY - drag.y);
    if (!drag.locked) {
      if (Math.max(dx, dy) < 12) return;
      const axis = dx > dy * 1.25 ? 'x' : dy > dx * 1.25 ? 'y' : null;
      if (!axis) return;
      if (drag.axis !== 'both' && drag.axis !== axis) { drag.rejected = true; return; }
      drag.axis = axis;
      drag.locked = true;
      drag.node.setPointerCapture(event.pointerId);
      drag.node.classList.add('is-gesture-dragging');
    }
    if (event.cancelable) event.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const current = drag;
    const distance = current.axis === 'x' ? event.clientX - current.x : event.clientY - current.y;
    reset();
    if (Math.max(Math.abs(event.clientX - current.x), Math.abs(event.clientY - current.y)) > 12) blockedUntil = now() + 400;
    if (!current.locked || current.rejected) return;
    if (Math.abs(distance) >= (current.axis === 'x' ? 48 : 64)) move(current.node, current.axis, distance < 0 ? 1 : -1);
  });
  document.addEventListener('pointercancel', reset);
  document.addEventListener('lostpointercapture', reset);
  document.addEventListener('touchstart', event => { if (event.touches.length > 1) reset(); }, { passive: true });
  window.addEventListener('blur', reset);
  window.addEventListener('hashchange', reset);
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
    if (surface.axis === 'x' && axis !== 'x') return;
    if (event.cancelable) event.preventDefault();
    if (!axis) return;
    const time = now();
    // Stable keys survive a render: inertial tails cannot advance the replacement page.
    const key = surface.node.matches('.closet-garments') ? 'wardrobe' : 'pages';
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
    const surface = surfaceFor(event.target) || (event.target === document.body && document.querySelector('.moment-feed') ? { node: document.querySelector('.moment-feed'), axis: 'both' } : null);
    if (!surface) return;
    const key = { ArrowLeft: ['x', -1], ArrowRight: ['x', 1], ArrowUp: ['y', -1], ArrowDown: ['y', 1] }[event.key];
    if (!key || (surface.axis !== 'both' && surface.axis !== key[0])) return;
    event.preventDefault();
    move(surface.node, key[0], key[1], true);
  });
  mountJourneyGestures();
})();
