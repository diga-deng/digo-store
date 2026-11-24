/* Fitting room extras: press and hold the figure to set your shape, tap outside to go back
   to trying pieces, and add your own face above the mannequin's neck. The shape and the face are
   kept on this device. A shopper can also describe themselves in words: only then, and only after
   they agree, what they type and the figure's shape are sent to /api/fit to work out the numbers. */
(function () {
  const SHAPE_KEY = 'digo-fitting-shape-v1', FACE_KEY = 'digo-fitting-face-v1', GUIDE_KEY = 'digo-fitting-guide-v1';
  // Where each measurement sits on the studio photograph, as a fraction of its height.
  const PARTS = [
    {id: 'shoulders', label: 'Shoulders', at: .11, spread: .045},
    {id: 'chest', label: 'Chest', at: .19, spread: .05},
    {id: 'belly', label: 'Belly', at: .30, spread: .055},
    {id: 'hips', label: 'Hips', at: .42, spread: .06},
    {id: 'legs', label: 'Legs', at: .66, spread: 0},
    // Recorded for fitted sleeves. The front photograph cannot show the arms changing on their own.
    {id: 'arms', label: 'Arms', at: .24, spread: 0, flat: true}
  ];
  // Front-to-back depth: a belly that sits forward, a fuller chest or seat. Not visible from the front
  // either, so it is recorded and counted in the measurement rather than drawn.
  const DEPTH = {chest: 'chestDepth', belly: 'bellyDepth', hips: 'hipsDepth'};
  const KEYS = [...PARTS.map(part => part.id), ...Object.values(DEPTH)];
  const DRAWN = PARTS.filter(part => !part.flat);
  const MIN = 85, MAX = 120;
  // Size check. PLACEHOLDER numbers until each brand supplies its real chart: the mannequin at 100%
  // stands for these body measurements (cm), and a size fits while every measurement is within its limit.
  const BASE_CM = {shoulders: 42, chest: 92, belly: 74, hips: 98, legs: 56, arms: 28};
  const SIZE_CHART = [['XS', 84, 66, 90], ['S', 88, 70, 94], ['M', 96, 78, 102], ['L', 104, 86, 110], ['XL', 112, 94, 118]];
  const SIZES = SIZE_CHART.map(row => row[0]);
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const stored = read(SHAPE_KEY, {});
  const limit = value => Math.round(Math.min(MAX, Math.max(MIN, Number(value) || 100)));
  let shape = Object.fromEntries(KEYS.map(key => [key, limit(stored[key])]));
  let confirmed = stored.confirmed === true, pendingShape = false;
  const saveShape = () => write(SHAPE_KEY, {...shape, confirmed});
  // Width changes a measurement in full; depth adds half as much again (an approximation of going
  // round an oval). With depth untouched this is the same number as before depth existed.
  const cm = id => Math.round(BASE_CM[id] * shape[id] / 100 * (DEPTH[id] ? 1 + (shape[DEPTH[id]] - 100) / 200 : 1));
  // The smallest size whose chest, waist and hip limits all hold this shape; 'none' when none does.
  function fitSize() {
    if (!confirmed) return null;
    return SIZE_CHART.find(([, chest, waist, hips]) => cm('chest') <= chest && cm('belly') <= waist && cm('hips') <= hips)?.[0] || 'none';
  }
  let active = 'hips', shaping = false, hold = null, handle = null;
  const room = () => document.querySelector('.fitting-room');
  const stage = () => document.querySelector('.fitting-stage');
  const isDefault = () => DRAWN.every(part => shape[part.id] === 100);

  // Each row of the photograph is stretched or narrowed by the parts of the body near it.
  function rowScale(t) {
    let scale = 1;
    for (const part of DRAWN) {
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
    return DRAWN.map(part => `<div class="fit-guide ${part.id === active ? 'is-active' : ''}" data-part="${part.id}" style="top:${part.at * 100}%">
      <i data-fit-handle="${part.id}" data-side="-1"></i><i data-fit-handle="${part.id}" data-side="1"></i><span>${part.label}</span></div>`).join('');
  }
  const label = id => PARTS.find(part => part.id === id).label + ' · about ' + cm(id) + ' cm';
  function panel() {
    return `<section class="fit-panel" aria-label="Your shape">
      <div class="fit-sliders">
      <div class="fit-parts" role="group" aria-label="Part of the body">${PARTS.map(part => `<button type="button" data-fit="part" data-id="${part.id}" aria-pressed="${part.id === active}">${part.label}</button>`).join('')}</div>
      <label class="fit-slider"><span><small>Narrower</small><b data-fit-name>${label(active)}</b><small>Wider</small></span>
        <input type="range" min="${MIN}" max="${MAX}" step="1" value="${shape[active]}" data-fit-range aria-label="Width"></label>
      <label class="fit-slider fit-depth" ${DEPTH[active] ? '' : 'hidden'}><span><small>Flatter</small><b>Front to back</b><small>Fuller</small></span>
        <input type="range" min="${MIN}" max="${MAX}" step="1" value="${shape[DEPTH[active]] ?? 100}" data-fit-depth aria-label="Front to back"></label>
      <button type="button" class="fit-talk-open" data-fit="talk" ${talk.available ? '' : 'hidden'}>Describe yourself instead</button>
      </div>
      <div class="fit-talk" data-gesture-ignore hidden></div>
      <div class="fit-panel-foot"><button type="button" data-fit="talk-back" hidden>Use the sliders</button><button type="button" data-fit="reset">Reset</button><button type="button" class="is-primary" data-fit="done">Done</button></div>
      <p data-fit-note>Your size is checked against this shape before you can order. The shape is kept on this device.</p></section>`;
  }
  function setPart(id) {
    active = id;
    const box = room(); if (!box) return;
    box.querySelectorAll('.fit-guide').forEach(guide => guide.classList.toggle('is-active', guide.dataset.part === id));
    box.querySelectorAll('[data-fit="part"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.id === id)));
    const name = box.querySelector('[data-fit-name]'), range = box.querySelector('[data-fit-range]'), depth = box.querySelector('[data-fit-depth]');
    if (name) name.textContent = label(id);
    if (range) range.value = shape[id];
    if (depth) { depth.closest('.fit-depth').hidden = !DEPTH[id]; depth.value = shape[DEPTH[id]] ?? 100; }
  }
  function setValue(id, value) {
    shape[id] = limit(value);
    const box = room(), range = box?.querySelector('[data-fit-range]'), depth = box?.querySelector('[data-fit-depth]'), name = box?.querySelector('[data-fit-name]');
    if (range && id === active) range.value = shape[id];
    if (depth && id === DEPTH[active]) depth.value = shape[id];
    if (name) name.textContent = label(active);
    drawWarp();
  }

  // Describing yourself in words instead of moving sliders. The language model proposes the numbers;
  // the shopper sees the figure change and can still correct any part by hand before pressing Done.
  const talk = {available: false, open: false, busy: false, turns: [], error: ''};
  const TALK_INTRO = 'Tell me your height and weight, then anything about your shape: where weight sits, your shoulders, arms, chest or belly. Skip whatever you would rather not say.';
  function talkHtml() {
    if (!read(GUIDE_KEY, {}).talkAgreed) return `<p class="fit-talk-note">What you type here, and the figure's shape, are sent to our language model provider to work out your shape. We do not store it. Share only what you are comfortable with.</p>
      <div class="fit-talk-row"><button type="button" class="is-primary" data-fit="talk-agree">Continue</button></div>`;
    const lines = [{role: 'assistant', content: TALK_INTRO}, ...talk.turns].map(turn => `<p class="fit-say fit-say-${turn.role === 'user' ? 'you' : 'us'}">${esc(turn.content)}</p>`).join('');
    return `<div class="fit-talk-log" role="log" aria-live="polite">${lines}${talk.busy ? '<p class="fit-say fit-say-us fit-say-wait">Working out your shape…</p>' : ''}${talk.error ? `<p class="fit-say fit-say-error" role="alert">${esc(talk.error)}</p>` : ''}</div>
      <div class="fit-talk-row"><input type="text" data-fit-say maxlength="600" enterkeyhint="send" autocomplete="off" aria-label="Describe your shape" placeholder="166 cm, 58 kg, belly sits forward, slim arms" ${talk.busy ? 'disabled' : ''}>
        <button type="button" class="is-primary" data-fit="talk-send" ${talk.busy ? 'disabled' : ''}>Send</button></div>`;
  }
  function paintTalk(keep = '') {
    const box = room()?.querySelector('.fit-panel'); if (!box) return;
    const view = box.querySelector('.fit-talk');
    box.querySelector('.fit-sliders').hidden = talk.open; view.hidden = !talk.open;
    box.querySelector('[data-fit="talk-back"]').hidden = !talk.open; box.querySelector('[data-fit="reset"]').hidden = talk.open;
    box.querySelector('[data-fit-note]').hidden = talk.open;
    if (!talk.open) return;
    view.innerHTML = talkHtml();
    const log = view.querySelector('.fit-talk-log'), input = view.querySelector('[data-fit-say]');
    if (log) log.scrollTop = log.scrollHeight;
    if (input) { input.value = keep; if (!talk.busy) input.focus({preventScroll: true}); }
  }
  function applyShape(next) {
    for (const key of KEYS) if (next && key in next) shape[key] = limit(next[key]);
    setPart(active); drawWarp(); saveShape();
  }
  async function sendTalk() {
    const input = room()?.querySelector('[data-fit-say]'), text = input?.value.trim();
    if (!text || talk.busy) return;
    talk.turns.push({role: 'user', content: text}); talk.busy = true; talk.error = ''; paintTalk();
    let failed = '';
    try {
      // The server accepts twelve turns; the latest eleven always start and end with the shopper.
      const response = await fetch('/api/fit', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({messages: talk.turns.slice(-11), shape})});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) failed = data.error || 'We could not work that out. Please try again, or set your shape by hand.';
      else {
        applyShape(data.shape);
        talk.turns.push({role: 'assistant', content: [data.reply, data.question].filter(Boolean).join(' ') || 'I have updated the figure. Does it look like you?'});
      }
    } catch { failed = 'We could not reach the helper. Check your connection, or set your shape by hand.'; }
    talk.busy = false;
    // A message that was not answered goes back into the box, so nothing typed is lost.
    if (failed) { talk.turns.pop(); talk.error = failed; }
    paintTalk(failed ? text : '');
  }
  // Offer the helper only when the store has a language model connected.
  fetch('/api/fit').then(response => response.ok ? response.json() : {}).then(data => {
    talk.available = data.available === true;
    const button = room()?.querySelector('.fit-panel [data-fit="talk"]');
    if (button) button.hidden = !talk.available;
  }).catch(() => {});
  function startShaping() {
    const box = room(), carousel = box?.querySelector('.fitting-carousel');
    if (!box || shaping) return;
    shaping = true;
    write(GUIDE_KEY, {...read(GUIDE_KEY, {}), used: true});
    box.querySelectorAll('.fit-hint').forEach(node => node.remove());
    stage().insertAdjacentHTML('beforeend', `<div class="fit-guides">${guides()}</div>`);
    carousel.closest('.fitting-figure').insertAdjacentHTML('beforeend', panel());
    document.body.classList.add('fit-shaping');
    navigator.vibrate?.(8);
  }
  function stopShaping() {
    if (!shaping) return;
    shaping = false; handle = null; talk.open = false; talk.error = '';
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

  // Buying from the fitting room: one tap buys the whole look, holding the button offers one piece.
  let buyHold = null, buyHeld = false;
  function buyHtml() {
    const names = fittingRows.map((row, i) => row.pieces[fittingLook[i]]);
    return `<div class="fit-buy"><button type="button" class="fit-buy-all" data-fit="buy-look" aria-haspopup="true" aria-expanded="false" aria-describedby="fit-buy-tip">Buy this look</button>
      <small id="fit-buy-tip">Hold to buy just one piece</small>
      <div class="fit-buy-one" hidden><button type="button" data-fit="buy-one" data-id="0"><b>Top only</b><span data-fit-buy-name="0">${esc(names[0])}</span></button>
        <button type="button" data-fit="buy-one" data-id="1"><b>Trousers only</b><span data-fit-buy-name="1">${esc(names[1])}</span></button></div></div>`;
  }
  function toggleBuyOne(open) {
    const box = room()?.querySelector('.fit-buy'); if (!box) return;
    const names = fittingRows.map((row, i) => row.pieces[fittingLook[i]]);
    box.querySelectorAll('[data-fit-buy-name]').forEach(node => { node.textContent = names[node.dataset.fitBuyName]; });
    box.querySelector('.fit-buy-one').hidden = !open;
    box.querySelector('.fit-buy-all').setAttribute('aria-expanded', String(open));
    box.classList.toggle('is-open', open);
    if (open) { write(GUIDE_KEY, {...read(GUIDE_KEY, {}), buyHeld: true}); box.querySelector('small').hidden = true; navigator.vibrate?.(8); }
  }
  function buyLook(rows) {
    toggleBuyOne(false);
    const size = fitSize();
    if (!size) { toast('Set your shape first, so we can send the size that fits.'); startShaping(); return; }
    if (size === 'none') { toast('Your shape is outside the sizes we make, so this cannot be ordered.'); return; }
    const picks = rows.map(row => ({name: fittingRows[row].pieces[fittingLook[row]], id: fittingProductIds[row]?.[fittingLook[row]]}));
    const missing = picks.filter(pick => !pick.id || !productFor(pick.id));
    if (missing.length) { toast(missing.map(pick => pick.name).join(' and ') + (missing.length > 1 ? ' are studio samples' : ' is a studio sample') + ' and not on sale yet.'); return; }
    let added = 0;
    for (const pick of picks) if (addReal(pick.id, true)) added++;
    if (added) navigate('/wardrobe/pieces');
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
    box.querySelector('.fitting-figure').insertAdjacentHTML('afterbegin', buyHtml());
    if (read(GUIDE_KEY, {}).buyHeld) box.querySelector('.fit-buy small').hidden = true;
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
    if (buy && buyable) buy.textContent = 'Add to cart';
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
    clearTimeout(buyHold); buyHeld = false;
    if (event.target.closest?.('.fit-buy-all')) { buyHold = setTimeout(() => { buyHeld = true; toggleBuyOne(true); }, 420); return; }
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
  const release = () => { clearTimeout(buyHold); clearTimeout(hold?.timer); hold = null; if (handle) { handle = null; saveShape(); } };
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
  document.addEventListener('contextmenu', event => { if (event.target.closest?.('.fitting-stage, .fit-buy')) event.preventDefault(); });
  document.addEventListener('input', event => {
    if (event.target.matches?.('[data-fit-range]')) setValue(active, Number(event.target.value));
    if (event.target.matches?.('[data-fit-depth]') && DEPTH[active]) setValue(DEPTH[active], Number(event.target.value));
  });
  document.addEventListener('change', event => {
    if (event.target.matches?.('[data-fit-range], [data-fit-depth]')) saveShape();
    if (event.target.matches?.('[data-fit-file]')) { loadFace(event.target.files[0]); event.target.value = ''; }
  });
  document.addEventListener('keydown', event => {
    if (event.target.matches?.('.fit-buy-all') && event.key === 'ArrowDown') { event.preventDefault(); toggleBuyOne(true); room().querySelector('.fit-buy-one button').focus(); }
    if (event.key === 'Escape' && room()?.querySelector('.fit-buy.is-open')) toggleBuyOne(false);
  });
  document.addEventListener('keydown', event => { if (shaping && event.key === 'Escape') { event.preventDefault(); stopShaping(); } }, true);
  document.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing && event.target.matches?.('[data-fit-say]')) { event.preventDefault(); sendTalk(); } });
  document.addEventListener('click', event => {
    const el = event.target.closest?.('[data-fit]');
    if (el) {
      const action = el.dataset.fit;
      if (action === 'part') setPart(el.dataset.id);
      else if (action === 'done') stopShaping();
      else if (action === 'reset') { for (const key of KEYS) shape[key] = 100; setPart(active); drawWarp(); saveShape(); }
      else if (action === 'talk') { talk.open = true; paintTalk(); }
      else if (action === 'talk-back') { talk.open = false; talk.error = ''; paintTalk(); }
      else if (action === 'talk-agree') { write(GUIDE_KEY, {...read(GUIDE_KEY, {}), talkAgreed: true}); paintTalk(); }
      else if (action === 'talk-send') sendTalk();
      else if (action === 'face') el.parentElement.querySelector('[data-fit-file]').click();
      else if (action === 'face-clear') { try { localStorage.removeItem(FACE_KEY); } catch {} mountFace(); }
      else if (action === 'buy-look') { if (buyHeld) { buyHeld = false; event.preventDefault(); } else buyLook([0, 1]); }
      else if (action === 'buy-one') buyLook([Number(el.dataset.id)]);
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
    if (!el && room()?.querySelector('.fit-buy.is-open') && !event.target.closest('.fit-buy')) toggleBuyOne(false);
    // Tapping anywhere outside the figure and its panel goes back to trying pieces.
    if (shaping && !event.target.closest('.fitting-stage, .fit-panel')) { event.preventDefault(); event.stopPropagation(); stopShaping(); }
  }, true);
  window.DigoFit = {size: fitSize, orderBlock, sizes: SIZES, setShape() { if (route() === '/wardrobe') startShaping(); else { pendingShape = true; navigate('/wardrobe'); } }};
})();
