/* Keep gestures local: vertical scenes, horizontal wardrobe and labelled navigation. */
function mountJourneyGestures() {
  document.documentElement.classList.toggle('scene-scroll', !!document.querySelector('.discover-page'));
}

(function () {
  let drag = null, blockedUntil = 0;
  let wheel = { surface: null, x: 0, time: 0, fired: false };
  const editable = 'input,textarea,select,[contenteditable=true]';
  const overlayOpen = () => !!document.querySelector('#overlay-root')?.innerHTML;
  const now = () => performance.now();

  function surfaceFor(target) {
    if (target.closest(editable) || overlayOpen()) return null;
    const horizontal = target.closest('.closet-garments,.life-nav');
    if (horizontal) return { node: horizontal, axis: 'x' };
    if (target.closest('button,a,.life-rail,#circle-canvas')) return null;
    const scene = target.closest('.discover-page .life-scene');
    return scene ? { node: scene, axis: 'y' } : null;
  }

  function move(surface, step, focus = false) {
    if (overlayOpen() || !surface.isConnected) return false;
    if (surface.matches('.closet-garments')) {
      if (closetRecords().length < 2) return false;
      closetMove(step);
      if (focus) document.querySelector('.closet-garments')?.focus({ preventScroll: true });
      return true;
    }
    if (surface.matches('.life-nav')) {
      const links = [...surface.querySelectorAll('a[href]')];
      const index = links.findIndex(link => link.getAttribute('aria-current') === 'page');
      const target = links[index + step];
      if (index < 0 || !target) return false;
      const path = target.getAttribute('href').slice(1);
      navigate(path);
      if (focus) requestAnimationFrame(() => document.querySelector('.life-nav a[aria-current="page"]')?.focus({ preventScroll: true }));
      return true;
    }
    const scenes = [...document.querySelectorAll('.discover-page .life-scene')];
    const target = scenes[scenes.indexOf(surface) + step];
    if (!target) return false;
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    if (focus) target.focus({ preventScroll: true });
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
    // Touch and pen retain native vertical scrolling and pinch zoom on the feed.
    if (!surface || (surface.axis === 'y' && event.pointerType !== 'mouse')) return;
    drag = { ...surface, id: event.pointerId, x: event.clientX, y: event.clientY, locked: false };
  });

  document.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id || drag.rejected) return;
    if (overlayOpen() || !drag.node.isConnected) { reset(); return; }
    const dx = Math.abs(event.clientX - drag.x), dy = Math.abs(event.clientY - drag.y);
    const along = drag.axis === 'x' ? dx : dy, across = drag.axis === 'x' ? dy : dx;
    if (!drag.locked) {
      if (across > 12 && across > along * 1.25) { drag.rejected = true; return; }
      if (along < 12 || along < across * 1.25) return;
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
    if (Math.abs(distance) >= (current.axis === 'x' ? 48 : 64)) move(current.node, distance < 0 ? 1 : -1);
  });
  document.addEventListener('pointercancel', reset);
  document.addEventListener('lostpointercapture', reset);
  document.addEventListener('touchstart', event => { if (event.touches.length > 1) reset(); }, { passive: true });
  window.addEventListener('blur', reset);
  window.addEventListener('hashchange', reset);

  document.addEventListener('dragstart', event => {
    if (surfaceFor(event.target)) event.preventDefault();
  });
  document.addEventListener('click', event => {
    if (event.detail !== 0 && now() < blockedUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || overlayOpen()) return;
    const surface = event.target.closest('.closet-garments,.life-nav');
    if (!surface || event.target.closest(editable)) return;
    const factor = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? surface.clientWidth : 1;
    const dx = (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * factor;
    const dy = (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * factor;
    // Ordinary vertical wheels keep scrolling the page, including over the wardrobe.
    if (Math.abs(dx) <= Math.abs(dy) * 1.25) return;
    if (event.cancelable) event.preventDefault();
    const time = now();
    const key = surface.matches('.life-nav') ? 'navigation' : surface;
    if (wheel.surface !== key || time - wheel.time > 180) wheel = { surface: key, x: 0, time, fired: false };
    wheel.time = time;
    if (wheel.fired) return;
    wheel.x += dx;
    if (Math.abs(wheel.x) < 60) return;
    wheel.fired = true;
    move(surface, wheel.x > 0 ? 1 : -1);
  }, { passive: false });

  document.addEventListener('keydown', event => {
    if (event.altKey || event.metaKey || event.ctrlKey || event.target.closest(editable) || overlayOpen()) return;
    const surface = surfaceFor(event.target);
    if (!surface) return;
    const keys = surface.axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
    const index = keys.indexOf(event.key);
    if (index < 0) return;
    event.preventDefault();
    move(surface.node, index === 0 ? -1 : 1, true);
  });
  mountJourneyGestures();
})();
