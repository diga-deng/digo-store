/* The scene experience shares the store's real cart, never its illustrative catalog. */
function storeCartItems() {
  try {
    const items = JSON.parse(sessionStorage.getItem('digo-cart-v3') || '[]');
    return Array.isArray(items) ? items.filter(item => item?.product &&
      typeof item.product.id === 'string' && typeof item.product.name === 'string' &&
      Number.isSafeInteger(item.product.price_cents) && item.product.price_cents > 0 &&
      Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 &&
      (item.kind === 'retail' || (item.kind === 'reservation' &&
        Number.isSafeInteger(item.product.reserve_price_cents) && item.product.reserve_price_cents > 0 &&
        item.product.reserve_price_cents < item.product.price_cents &&
        ['refundable', 'committed'].includes(item.reservationPlan)))).slice(0, 20) : [];
  } catch { return []; }
}
function storeCartCount() { return storeCartItems().reduce((n, item) => n + item.quantity, 0); }
function storeMoney(cents, currency = 'usd') {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100); }
  catch { return '$' + (cents / 100).toFixed(2); }
}
function bagModal() {
  const items = storeCartItems();
  overlay(`<div class="drawer-head"><h2>Your bag.</h2><button class="icon-btn" data-action="close" aria-label="Close bag">${icon('close')}</button></div>
    <div class="drawer-body">${items.length ? items.map(item => `<div class="live-cart-item"><h3>${esc(item.product.name)}</h3><p>${item.kind === 'reservation' ? (item.reservationPlan === 'committed' ? 'Non-refundable reservation' : 'Refundable reservation') : 'Pay in full'} · ${item.quantity}</p><strong>${esc(storeMoney((item.kind === 'reservation' ? item.product.reserve_price_cents : item.product.price_cents) * item.quantity, item.product.currency))}</strong></div>`).join('') : '<div class="world-empty"><h2>A little of your world.</h2><p>Your shopping bag is empty.</p></div>'}</div>
    <div class="drawer-foot"><a class="btn" href="${items.length ? '/checkout' : '/shop'}">${items.length ? 'Review checkout' : 'Explore the collection'} ${icon('arrow')}</a></div>`, 'drawer');
}
function checkoutModal() { location.assign('/checkout'); }
function addBag(id) { productModal(id); }

// Concept objects retain editing/history, but cannot become order line items.
function productModal(id, addToScene = false, sceneId = null) {
  ui.productScene = sceneId || (/^#\/(scene|edit)\//.test(location.hash) ? currentScene : null);
  const p = getProduct(id); if (!p) return;
  recordProductView(id, ui.productScene);
  overlay(`<div class="product-modal"><div class="product-visual">${productPhoto(p)}</div><div>
    <div class="product-category-icon" aria-label="${p.category}">${icon(p.category === 'Wear' ? 'shirt' : 'home')}</div>
    <h2>${esc(p.name)}</h2><p>${esc(p.material)}</p><p>${esc(p.story)}</p>
    <p class="concept-note">Concept piece · Not available to order.</p>
    ${addToScene ? `<button class="btn" data-action="insert-piece" data-id="${p.id}">${icon('plus')} Add to my scene</button>` : '<a class="btn" href="/shop">View current collection ' + icon('arrow') + '</a>'}
    </div></div>`, 'Product details');
}
function productCard(p) {
  return `<article class="product-card"><div class="product-visual"><button class="product-image-btn" data-action="product" data-id="${p.id}" style="height:100%" aria-label="Explore ${esc(p.name)}">${productPhoto(p)}</button><button class="add-small" data-action="product" data-id="${p.id}" aria-label="Explore ${esc(p.name)}">${icon('cart')}</button></div><h3>${esc(p.name)}</h3><div class="meta"><span>${esc(p.material.split(' · ')[0])}</span><span>Concept</span></div></article>`;
}
function glassProductRail(s) {
  return `<aside class="glass-product-rail ${s.id === 'dinner' ? 'glass-on-dark' : ''}" aria-label="Explore pieces in ${esc(s.title)}" data-scene="${s.id}"><ul class="glass-product-list">${s.items.map(id => {
    const p = getProduct(id);
    return `<li class="glass-product-item"><button class="glass-product-image" data-action="product" data-id="${p.id}" aria-label="Explore ${esc(p.name)}">${productPhoto(p)}</button><div class="glass-product-details"><button class="glass-product-cart" data-action="product" data-id="${p.id}" aria-label="Explore ${esc(p.name)}">${icon('cart')}</button></div></li>`;
  }).join('')}</ul></aside>`;
}
function scenePins(s) {
  const positions = { amalfi: [[72,51],[85,79],[83,56]], dinner: [[53,40],[24,45],[59,76]], morning: [[46,55],[27,38],[16,69]] };
  const points = positions[s.id] || positions.dinner;
  return s.items.slice(0,3).map((id,i) => `<button class="cart-pin pin-${i+1}" style="--pin-x:${points[i][0]}%;--pin-y:${points[i][1]}%" data-action="product" data-id="${id}" data-scene="${s.id}" aria-label="Explore ${esc(getProduct(id).name)}">${icon('cart')}</button>`).join('');
}

let storeCatalogPromise;
function storeCatalog() {
  if (!storeCatalogPromise) storeCatalogPromise = fetch('/api/catalog').then(response => {
    if (!response.ok) throw new Error('Catalog unavailable');
    return response.json();
  }).then(data => Array.isArray(data.products) ? data.products : []).catch(() => { storeCatalogPromise = null; return []; });
  return storeCatalogPromise;
}
async function searchResults() {
  const q = ui.search.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(x => x.length > 2 && !['want','with','feel','like','the','for','and','more'].includes(x));
  const matches = value => !q || tokens.some(t => value.toLowerCase().includes(t));
  const scenes = [...baseScenes, ...state.custom].filter(s => matches(`${s.title} ${s.tags} ${s.subtitle}`));
  const concepts = products.filter(p => matches(`${p.name} ${p.material} ${p.category}`));
  const sr = scenes.map(s => `<button class="search-result" data-action="search-scene" data-id="${s.id}"><div class="thumb"><img src="${esc(s.image)}" alt="" loading="lazy"></div><div><h3>${esc(s.title)}</h3><p>Scene · ${esc(s.subtitle)}</p></div>${icon('arrow')}</button>`).join('');
  const cr = concepts.map(p => `<button class="search-result" data-action="product" data-id="${p.id}"><div class="thumb">${productPhoto(p)}</div><div><h3>${esc(p.name)}</h3><p>Concept · ${esc(p.material)}</p></div>${icon('arrow')}</button>`).join('');
  const target = $('#search-results'); if (!target) return;
  const selectedType = ui.searchType;
  target.innerHTML = (selectedType !== 'Products' ? sr : '') + (selectedType !== 'Scenes' ? cr : '') || '<p>Try another place, activity, or material.</p>';
  document.querySelectorAll('[data-action="search-type"]').forEach(b => b.classList.toggle('active', b.dataset.id === selectedType));
  if (selectedType === 'Scenes') return;
  const catalog = await storeCatalog();
  if (!target.isConnected || ui.search.toLowerCase().trim() !== q || ui.searchType !== selectedType) return;
  const actual = catalog.filter(p => matches(`${p.name} ${p.material || ''} ${p.category || ''}`)).slice(0, 20);
  const live = actual.map(p => `<a class="search-result" href="/products/${encodeURIComponent(p.slug)}"><div class="thumb live-piece-symbol">${icon('bag')}</div><div><h3>${esc(p.name)}</h3><p>${esc(storeMoney(p.price_cents, p.currency))} · Current collection</p></div>${icon('arrow')}</a>`).join('');
  const result = (selectedType === 'All' ? sr : '') + live + cr;
  target.innerHTML = result || '<p>No matching pieces yet.</p><a class="text-btn" href="/shop">Browse the current collection</a>';
}

window.addEventListener('pageshow', event => { if (event.persisted) render(false); });
