/* Fitting room extras: press and hold the figure to set your shape, tap outside to go back
   to trying pieces, and add your own face above the mannequin's neck. All kept on this device. */
(function () {
  const SHAPE_KEY = 'digo-fitting-shape-v1', FACE_KEY = 'digo-fitting-face-v1', GUIDE_KEY = 'digo-fitting-guide-v1';
  // Where each measurement sits on the studio photograph, as a fraction of its height.
  const PARTS = [
    {id: 'shoulders', label: 'Shoulders', at: .11, spread: .045},
    {id: 'chest', label: 'Chest', at: .19, spread: .05},
    {id: 'belly', label: 'Belly', at: .30, spread: .055},
    {id: 'hips', label: 'Hips', at: .42, spread: .06},
    {id: 'legs', label: 'Legs', at: .66, spread: 0}
  ];
  const MIN = 85, MAX = 120;
  // Size check. PLACEHOLDER numbers until each brand supplies its real chart: the mannequin at 100%
  // stands for these body measurements (cm), and a size fits while every measurement is within its limit.
  const BASE_CM = {shoulders: 42, chest: 92, belly: 74, hips: 98, legs: 56};
  const SIZE_CHART = [['XS', 84, 66, 90], ['S', 88, 70, 94], ['M', 96, 78, 102], ['L', 104, 86, 110], ['XL', 112, 94, 118]];
  const SIZES = SIZE_CHART.map(row => row[0]);
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const stored = read(SHAPE_KEY, {});
  let shape = Object.fromEntries(PARTS.map(part => [part.id, Number(stored[part.id]) || 100]));
  let confirmed = stored.confirmed === true, pendingShape = false;
  const saveShape = () => write(SHAPE_KEY, {...shape, confirmed});
  const cm = id => Math.round(BASE_CM[id] * shape[id] / 100);
  // The smallest size whose chest, waist and hip limits all hold this shape; 'none' when none does.
  function fitSize() {
    if (!confirmed) return null;
    return SIZE_CHART.find(([, chest, waist, hips]) => cm('chest') <= chest && cm('belly') <= waist && cm('hips') <= hips)?.[0] || 'none';
  }
  let active = 'hips', shaping = false, hold = null, handle = null;
  const room = () => document.querySelector('.fitting-room');
  const stage = () => document.querySelector('.fitting-stage');
  const isDefault = () => PARTS.every(part => shape[part.id] === 100);

  // Each row of the photograph is stretched or narrowed by the parts of the body near it.
  function rowScale(t) {
    let scale = 1;
    for (const part of PARTS) {
      const amount = shape[part.id] / 100 - 1;
      if (!amount) continue;
      const weight = part.id === 'legs' ? Math.min(1, Math.max(0, (t - .47) / .08)) * (t > .93 ? Math.max(0, (1 - t) / .07) : 1)
        : Math.exp(-((t - part.at) ** 2) / (2 * part.spread ** 2));
      scale += amount * weight;
    }
    return scale;
  }
  function drawWarp() {
    const box = stage(), canvas = box?.querySelector('.fitting-warp'), photo = box?.querySelector('.fitting-model');
    if (!canvas || !photo) return;
    box.classList.toggle('is-warped', !isDefault());
    if (isDefault() || !photo.complete || !photo.naturalWidth) return;
    const h = photo.naturalHeight, w = Math.round(h * 218 / 512), crop = Math.round((photo.naturalWidth - w) / 2), ratio = 2;
    canvas.width = w * ratio; canvas.height = h * ratio;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fefefe'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    // One row at a time, widened about the centre line of the figure, so no seam can open.
    for (let y = 0; y < h; y++) {
      const scale = rowScale(y / h), width = photo.naturalWidth * scale * ratio;
      ctx.drawImage(photo, 0, y, photo.naturalWidth, 1, (w * ratio - width) / 2, y * ratio, width, ratio);
    }
  }

  function guides() {
    return PARTS.map(part => `<div class="fit-guide ${part.id === active ? 'is-active' : ''}" data-part="${part.id}" style="top:${part.at * 100}%">
      <i data-fit-handle="${part.id}" data-side="-1"></i><i data-fit-handle="${part.id}" data-side="1"></i><span>${part.label}</span></div>`).join('');
  }
  function panel() {
    return `<section class="fit-panel" aria-label="Your shape">
      <div class="fit-parts" role="group" aria-label="Part of the body">${PARTS.map(part => `<button type="button" data-fit="part" data-id="${part.id}" aria-pressed="${part.id === active}">${part.label}</button>`).join('')}</div>
      <label class="fit-slider"><span><small>Narrower</small><b data-fit-name>${PARTS.find(part => part.id === active).label} · about ${cm(active)} cm</b><small>Wider</small></span>
        <input type="range" min="${MIN}" max="${MAX}" step="1" value="${shape[active]}" data-fit-range aria-label="Width"></label>
      <div class="fit-panel-foot"><button type="button" data-fit="reset">Reset</button><button type="button" class="is-primary" data-fit="done">Done</button></div>
      <p>Your size is checked against this shape before you can order. It stays on this device.</p></section>`;
  }
  function setPart(id) {
    active = id;
    const box = room(); if (!box) return;
    box.querySelectorAll('.fit-guide').forEach(guide => guide.classList.toggle('is-active', guide.dataset.part === id));
    box.querySelectorAll('[data-fit="part"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.id === id)));
    const name = box.querySelector('[data-fit-name]'), range = box.querySelector('[data-fit-range]');
    if (name) name.textContent = PARTS.find(part => part.id === id).label + ' · about ' + cm(id) + ' cm';
    if (range) range.value = shape[id];
  }
  function setValue(id, value) {
    shape[id] = Math.round(Math.min(MAX, Math.max(MIN, value)));
    const range = room()?.querySelector('[data-fit-range]');
    if (range && id === active) range.value = shape[id];
    const name = room()?.querySelector('[data-fit-name]');
    if (name && id === active) name.textContent = PARTS.find(part => part.id === id).label + ' · about ' + cm(id) + ' cm';
    drawWarp();
  }
  function startShaping() {
    const box = room(), carousel = box?.querySelector('.fitting-carousel');
    if (!box || shaping) return;
    shaping = true;
    write(GUIDE_KEY, {used: true});
    box.querySelectorAll('.fit-hint').forEach(node => node.remove());
    stage().insertAdjacentHTML('beforeend', `<div class="fit-guides">${guides()}</div>`);
    carousel.closest('.fitting-figure').insertAdjacentHTML('beforeend', panel());
    document.body.classList.add('fit-shaping');
    navigator.vibrate?.(8);
  }
  function stopShaping() {
    if (!shaping) return;
    shaping = false; handle = null;
    confirmed = true;
    saveShape();
    const size = fitSize();
    toast(size === 'none' ? 'This shape is outside the sizes we make.' : 'Shape saved. Your size is ' + size + '.');
    document.body.classList.remove('fit-shaping');
    document.querySelectorAll('.fit-guides, .fit-panel').forEach(node => node.remove());
  }

  // Your own face above the neck. The photo is cropped small and never leaves this device.
  function faceHtml() {
    const face = read(FACE_KEY, null);
    return `<div class="fit-face ${face ? 'has-photo' : ''}">
      <button type="button" class="fit-face-pick" data-fit="face" aria-label="${face ? 'Change your face photo' : 'Add a photo of your face'}">${face ? `<img src="${esc(face)}" alt="Your face">` : `${icon('plus')}<span>Your face</span>`}</button>
      ${face ? `<button type="button" class="fit-face-clear" data-fit="face-clear" aria-label="Remove your face photo">${icon('close')}</button>` : ''}
      <input type="file" accept="image/*" hidden data-fit-file></div>`;
  }
  function loadFace(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file), photo = new Image();
    photo.onload = () => {
      const size = 240, side = Math.min(photo.naturalWidth, photo.naturalHeight), canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      canvas.getContext('2d').drawImage(photo, (photo.naturalWidth - side) / 2, Math.max(0, (photo.naturalHeight - side) * .3), side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      if (!write(FACE_KEY, canvas.toDataURL('image/jpeg', .86))) return toast('Could not keep the photo on this device.');
      mountFace();
    };
    photo.onerror = () => { URL.revokeObjectURL(url); toast('That photo could not be opened.'); };
    photo.src = url;
  }
  function mountFace() {
    const carousel = room()?.querySelector('.fitting-carousel'); if (!carousel) return;
    carousel.querySelector('.fit-face')?.remove();
    carousel.insertAdjacentHTML('afterbegin', faceHtml());
  }

  function mount() {
    const box = room();
    if (!box) { shaping = false; document.body.classList.remove('fit-shaping'); return; }
    if (box.dataset.fitReady) return;
    box.dataset.fitReady = 'true'; shaping = false; document.body.classList.remove('fit-shaping');
    const photo = box.querySelector('.fitting-model');
    photo.insertAdjacentHTML('afterend', '<canvas class="fitting-warp" aria-hidden="true"></canvas>');
    photo.addEventListener('load', drawWarp);
    mountFace();
    if (!read(GUIDE_KEY, {}).used) box.querySelector('.fitting-carousel').insertAdjacentHTML('beforeend',
      '<span class="fit-hint fit-hint-ring" aria-hidden="true"></span><span class="fit-hint fit-hint-press" aria-hidden="true"></span><p class="fit-hint fit-hint-text"><b>Press and hold</b> the figure to set your shape</p>');
    drawWarp();
    if (pendingShape) { pendingShape = false; setTimeout(startShaping, 350); }
  }
  // A piece can only be ordered in the size that fits the saved shape. Returns and exchanges are
  // DIGO's cost, so an untested or ill-fitting size is stopped here instead of being shipped.
  function orderBlock(id) {
    const size = fitSize(), chosen = world.options[id]?.size;
    if (!size) return {reason: 'shape', text: 'Set your shape before ordering. We check every size against it.'};
    if (size === 'none') return {reason: 'range', text: 'Your shape is outside the sizes we make for this piece, so it cannot be ordered.'};
    if (!chosen) return {reason: 'choose', text: 'Choose your size. ' + size + ' fits your shape.', size};
    if (chosen !== size) return {reason: 'wrong', text: chosen + ' does not fit your shape. Choose ' + size + ' to order.', size};
    return null;
  }
  function paintSize() {
    const box = document.querySelector('.modal.product-sheet .piece-size'); if (!box) return;
    const id = box.dataset.piece, buyable = box.dataset.buyable === 'true', size = fitSize(), chosen = world.options[id]?.size, block = orderBlock(id);
    const pills = SIZES.map(name => `<button type="button" data-fit="size" data-id="${name}" aria-pressed="${name === chosen}" class="${name === size ? 'is-yours' : ''}">${name}${name === size ? '<small>fits you</small>' : ''}</button>`).join('');
    box.innerHTML = `<h3>Size</h3><div class="piece-size-row" role="group" aria-label="Size">${pills}</div>
      <p class="piece-size-note ${block ? 'is-blocked' : 'is-ok'}" role="status">${esc(block ? block.text : chosen + ' fits your shape.')}</p>
      ${!size ? '<button type="button" class="piece-size-set" data-fit="set-shape">Set my shape</button>' : '<button type="button" class="piece-size-edit" data-fit="set-shape">Change my shape</button>'}`;
    const buy = document.querySelector('.modal.product-sheet [data-life="add-real"]');
    if (buy && buyable) { buy.disabled = !!block; buy.setAttribute('aria-disabled', String(!!block)); }
  }

  // Every piece shows its colour reference and make-up, and can be seen out of the scene's light.
  const openPiece = showProduct;
  showProduct = function (id, type = 'catalog', sceneId = null) {
    openPiece(id, type, sceneId);
    const sheet = document.querySelector('.modal.product-sheet'), p = type === 'concept' ? getProduct(id) : productFor(id);
    if (!sheet || !p || sheet.querySelector('.piece-facts')) return;
    const pending = 'Not yet supplied', scene = sceneFor(sceneId), art = sheet.querySelector('.product-detail-art');
    if (art && scene?.image) {
      art.dataset.studio = art.innerHTML; art.dataset.scene = `<img class="piece-scene-photo" src="${esc(scene.image)}" alt="${esc(p.name)} as seen in ${esc(scene.title)}">`;
      art.insertAdjacentHTML('afterend', '<div class="piece-light" role="group" aria-label="Lighting"><button type="button" data-fit="light" data-id="studio" aria-pressed="true">Studio light</button><button type="button" data-fit="light" data-id="scene" aria-pressed="false">In the scene</button></div>');
    }
    const facts = `<section class="piece-facts"><h3>Colour & material</h3><dl>
      <div><dt>Colour</dt><dd>${esc(p.color || 'To be confirmed')}</dd></div>
      <div><dt>Colour card</dt><dd>${esc(p.colorCard || pending)}</dd></div>
      <div><dt>Composition</dt><dd>${esc(p.material || pending)}</dd></div>
      <div><dt>Fabric weight</dt><dd>${esc(p.weight || pending)}</dd></div>
      <div><dt>Made in</dt><dd>${esc(p.origin || pending)}</dd></div></dl>
      <p>Screens differ. The colour card number is the colour a piece is produced to.</p></section>`;
    // Straight under the pictures: the brand, its other pieces, and the way to all of them.
    const family = p.brand ? brandPieces(brandSlug(p.brand)) : [], others = family.filter(row => row.p.id !== p.id);
    const brand = family.length ? `<section class="piece-brand" aria-label="More from ${esc(p.brand)}">
      <a class="piece-brand-link" href="#/brand/${encodeURIComponent(brandSlug(p.brand))}"><span><small>Like this brand?</small><strong>${esc(p.brand)}</strong></span><em>See all ${family.length} pieces ${icon('right')}</em></a>
      ${others.length ? `<div class="piece-brand-row">${others.slice(0, 8).map(row => `<button type="button" data-life="product" data-id="${esc(row.p.id)}" data-type="${row.type}" ${sceneId ? `data-scene="${esc(sceneId)}"` : ''} aria-label="View ${esc(row.p.name)}">${row.type === 'catalog' ? productArt(row.p) : productPhoto(row.p)}<span>${esc(row.p.name)}</span></button>`).join('')}</div>` : ''}</section>` : '';
    // Keep the pictures, their light switch and the brand together as one column of the sheet.
    if (art) {
      const media = document.createElement('div'); media.className = 'piece-media';
      const light = sheet.querySelector('.piece-light');
      art.replaceWith(media); media.append(art); if (light) media.append(light);
      media.insertAdjacentHTML('beforeend', brand);
    } else sheet.querySelector('h2')?.insertAdjacentHTML('beforebegin', brand);
    (sheet.querySelector('.life-actions') || sheet.querySelector('h2'))?.insertAdjacentHTML('beforebegin', `<section class="piece-size" data-piece="${esc(p.id)}" data-buyable="${type === 'catalog'}"></section>` + facts);
    paintSize();
  };

  new MutationObserver(mount).observe(document.querySelector('#app'), {childList: true});
  mount();

  document.addEventListener('pointerdown', event => {
    clearTimeout(hold?.timer); hold = null;
    if (!room() || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const grip = event.target.closest?.('[data-fit-handle]');
    if (shaping && grip) {
      const rect = stage().getBoundingClientRect();
      setPart(grip.dataset.fitHandle);
      handle = {id: event.pointerId, part: grip.dataset.fitHandle, side: Number(grip.dataset.side), x: event.clientX, start: shape[grip.dataset.fitHandle], width: rect.width};
      event.preventDefault();
      return;
    }
    if (shaping || !event.target.closest?.('.fitting-stage')) return;
    hold = {id: event.pointerId, x: event.clientX, y: event.clientY, timer: setTimeout(() => { hold = null; startShaping(); }, 420)};
  }, true);
  document.addEventListener('pointermove', event => {
    if (hold && event.pointerId === hold.id && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 9) { clearTimeout(hold.timer); hold = null; }
    if (handle && event.pointerId === handle.id) {
      setValue(handle.part, handle.start + handle.side * (event.clientX - handle.x) / handle.width * 160);
      if (event.cancelable) event.preventDefault();
    }
  }, {capture: true, passive: false});
  const release = () => { clearTimeout(hold?.timer); hold = null; if (handle) { handle = null; saveShape(); } };
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
  document.addEventListener('contextmenu', event => { if (event.target.closest?.('.fitting-stage')) event.preventDefault(); });
  document.addEventListener('input', event => { if (event.target.matches?.('[data-fit-range]')) setValue(active, Number(event.target.value)); });
  document.addEventListener('change', event => {
    if (event.target.matches?.('[data-fit-range]')) saveShape();
    if (event.target.matches?.('[data-fit-file]')) { loadFace(event.target.files[0]); event.target.value = ''; }
  });
  document.addEventListener('keydown', event => { if (shaping && event.key === 'Escape') { event.preventDefault(); stopShaping(); } }, true);
  document.addEventListener('click', event => {
    const el = event.target.closest?.('[data-fit]');
    if (el) {
      const action = el.dataset.fit;
      if (action === 'part') setPart(el.dataset.id);
      else if (action === 'done') stopShaping();
      else if (action === 'reset') { for (const part of PARTS) shape[part.id] = 100; setPart(active); drawWarp(); saveShape(); }
      else if (action === 'face') el.parentElement.querySelector('[data-fit-file]').click();
      else if (action === 'face-clear') { try { localStorage.removeItem(FACE_KEY); } catch {} mountFace(); }
      else if (action === 'size') {
        const id = el.closest('.piece-size').dataset.piece;
        world.options[id] = {kind: 'retail', plan: 'refundable', ...world.options[id], size: el.dataset.id};
        writeWorld(); paintSize();
      }
      else if (action === 'set-shape') { closeOverlay(); if (route() === '/wardrobe') startShaping(); else { pendingShape = true; navigate('/wardrobe'); } }
      else if (action === 'light') {
        const art = document.querySelector('.modal.product-sheet .product-detail-art');
        if (art) art.innerHTML = art.dataset[el.dataset.id];
        el.parentElement.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === el)));
      }
      return;
    }
    // Nothing reaches the bag or checkout in an unchecked or ill-fitting size.
    const order = event.target.closest?.('[data-life="add-real"], [data-life="buy-board"]');
    if (order) {
      let block = null;
      if (order.dataset.life === 'add-real') block = orderBlock(order.dataset.id);
      else for (const item of world.boards[order.dataset.id]?.items || []) if (item.type === 'catalog' && !item.owned && item.selected !== false && (block = orderBlock(item.id))) break;
      if (block) { event.preventDefault(); event.stopImmediatePropagation(); toast(block.text); paintSize(); return; }
    }
    // Tapping anywhere outside the figure and its panel goes back to trying pieces.
    if (shaping && !event.target.closest('.fitting-stage, .fit-panel')) { event.preventDefault(); event.stopPropagation(); stopShaping(); }
  }, true);
  window.DigoFit = {size: fitSize, orderBlock, sizes: SIZES};
})();
