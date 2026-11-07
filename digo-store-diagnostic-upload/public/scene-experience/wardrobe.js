/* The cabinet displays existing wardrobe records, with a separate browse-only preview. */
let closetSelection = '', closetView = 'rail', closetQuery = '', closetLimit = 18;
function closetProduct(record) { return record.type === 'own' ? record : itemInfo(record); }
function closetRecords() {
  let rows = wardrobeStatus === 'Owned'
    ? [...world.owned.map(x => ({...x,kind:'own',closetKey:'own:'+x.id})), ...world.saved.filter(x => x.status==='owned')]
    : world.saved.filter(x => wardrobeStatus === 'Ordered'
      ? (x.orderIds?.length || x.testOrderIds?.length)
      : x.savedManually !== false);
  if (groupFilter) rows = rows.filter(x => x.group === groupFilter);
  if (wardrobeFilter === 'Recently viewed') rows = world.recent.map(x=>({...x,key:'recent:'+x.id}));
  else if (['Clothing','Home'].includes(wardrobeFilter)) rows = rows.filter(x => ['product','own'].includes(x.kind) && J.category(x,closetProduct(x))===wardrobeFilter);
  else if (wardrobeFilter === 'Moments') rows = rows.filter(x=>x.kind==='scene');
  else if (wardrobeFilter === 'Details') rows = rows.filter(x=>x.kind==='inspiration');
  return rows.map(x=>({...x,closetKey:x.closetKey||x.key}));
}
function closetStatus(record) {
  if (record.type === 'own' || record.status === 'owned') return 'Owned';
  if (record.orderIds?.length) {
    const reserved = record.orderIds.some(id=>world.orders[id]?.items.some(i=>i.id===record.id&&i.kind==='reservation'));
    return reserved ? 'Reserved · deposit paid' : 'Purchased';
  }
  if (record.testOrderIds?.length && wardrobeStatus === 'Ordered') return 'Test purchase';
  return closetProduct(record)?.reference?'Demo reference':record.type==='concept'?'Concept piece':'Saved';
}
function hanger() { return `<svg class="closet-hanger" viewBox="0 0 220 75" aria-hidden="true"><path class="hanger-hook" d="M111 25V15c0-6 10-5 10-12 0-11-19-11-19 0"/><path class="hanger-wood" d="m111 23-85 34q-7 4 1 8h166q8-4 1-8Z"/><path class="hanger-line" d="M29 60h163"/></svg>`; }
function closetArt(x) {
  const p=closetProduct(x);
  if(x.type==='own')return `<div class="closet-missing">${icon('shirt')}<span>${esc(p.name)}</span></div>`;
  if(x.type==='concept')return productPhoto(p);
  const image=safeImage(p?.image_url||p?.image);
  return image?`<img src="${esc(image)}" alt="${esc(p.name)}" draggable="false">`:`<div class="closet-missing">${icon('image')}<span>${esc(p?.material||p?.name||'Your piece')}</span><small>Photo pending</small></div>`;
}
const shelfSelections = new Map();
let cabinetTimer = 0;
let browsingCabinetPreview = false;
let cabinetPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;

function cabinetPreview() {
  return styleProducts()
    .filter(p => p.category === 'Wear' && p.image?.includes('/edit-lp-'))
    .slice(0, 12)
    .map(p => ({ kind:'product', type:'concept', id:p.id, closetKey:'preview:' + p.id, preview:true }));
}
function cabinetShelves(rows) {
  if (rows.length < 4) return [rows];
  return [rows.filter((_, i) => i % 2 === 0), rows.filter((_, i) => i % 2 === 1)];
}
function shelfMarkup(items, row, context) {
  const selection = shelfSelections.get(context + row) || closetSelection;
  const index = Math.max(0, items.findIndex(x => x.closetKey === selection));
  const current = items[index];
  const radius = Math.min(3, Math.floor(items.length / 2));
  const tubes = [];
  for (let offset = -radius; offset <= radius; offset++) {
    const item = items[(index + offset + items.length) % items.length];
    const name = closetProduct(item).name;
    tubes.push(`<button class="cabinet-tube" data-closet="detail" data-key="${esc(item.closetKey)}"
      tabindex="${offset === 0 ? 0 : -1}" style="--slot:${offset}" aria-label="View ${esc(name)}">
      <span class="closet-garment-art">${closetArt(item)}</span></button>`);
  }
  const details = !current.preview && current.kind !== 'own'
    ? `<button data-closet="manage" data-key="${esc(current.closetKey)}" aria-label="Organize ${esc(closetProduct(current).name)}">${icon('grid')}</button>` : '';
  return `<section class="cabinet-shelf" data-row="${row}" aria-label="Shelf ${row + 1}">
    <button class="shelf-arrow" data-closet="previous" aria-label="Previous piece on shelf ${row + 1}" ${items.length < 2 ? 'disabled' : ''}>${icon('left')}</button>
    <div class="closet-garments cabinet-window" data-row="${row}" data-count="${items.length}" tabindex="0" aria-label="Shelf ${row + 1}. Use left and right arrows.">
      <div class="cabinet-track">${tubes.join('')}</div>
    </div>
    <button class="shelf-arrow" data-closet="next" aria-label="Next piece on shelf ${row + 1}" ${items.length < 2 ? 'disabled' : ''}>${icon('right')}</button>
    <div class="shelf-caption"><button data-closet="detail" data-key="${esc(current.closetKey)}">${esc(closetProduct(current).name)}</button>${details}</div>
  </section>`;
}
function cabinetContext(preview) {
  return [wardrobeStatus, groupFilter, preview ? 'preview' : 'collection'].join('/') + '/';
}
function closetRail(rows) {
  const preview = !!rows[0]?.preview;
  const shelves = cabinetShelves(rows);
  const canPreview = wardrobeStatus === 'Liked' && !groupFilter && closetRecords().length > 0;
  const previewSwitch = canPreview ? `<button data-closet="preview">${preview ? 'My pieces' : 'Preview cabinet'}</button>` : '';
  return `<section class="cabinet" aria-label="Glass wardrobe" data-preview="${preview}">
    <div class="cabinet-meta"><span>${preview ? 'Wardrobe preview' : ''}</span>${previewSwitch}
    ${rows.length > 1 ? `<button data-closet="rotation" aria-label="${cabinetPaused ? 'Start' : 'Pause'} shelf rotation">${cabinetPaused ? 'Play' : 'Pause'}</button>` : ''}</div>
    ${shelves.map((items,i) => shelfMarkup(items,i,cabinetContext(preview))).join('')}
  </section>`;
}
function closetMove(step, row = 0, manual = true) {
  const stage = document.querySelector('.cabinet');
  if (!stage) return;
  const preview = stage.dataset.preview === 'true';
  const items = cabinetShelves(preview ? cabinetPreview() : closetRecords())[row];
  const shelf = stage.querySelector(`.cabinet-shelf[data-row="${row}"]`);
  if (!shelf || !items || items.length < 2) return;
  const key = cabinetContext(preview);
  const oldKey = shelf.querySelector('.shelf-caption button').dataset.key;
  const index = Math.max(0, items.findIndex(x => x.closetKey === oldKey));
  const next = items[(index + step + items.length) % items.length];
  shelfSelections.set(key + row, next.closetKey);
  if (manual && !preview) {
    closetSelection = next.closetKey;
    world.closetSelection = closetSelection;
    writeWorld();
  }
  const temp = document.createElement('div');
  temp.innerHTML = shelfMarkup(items, row, key);
  const fresh = temp.firstElementChild;
  // Keep the gesture and arrow targets mounted so focus and pointer capture survive a turn.
  const track = shelf.querySelector('.cabinet-track');
  track.innerHTML = fresh.querySelector('.cabinet-track').innerHTML;
  shelf.querySelector('.shelf-caption').innerHTML = fresh.querySelector('.shelf-caption').innerHTML;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const stride = shelf.querySelector('.cabinet-tube').offsetWidth + 12;
    track.animate([{transform:`translateX(${step * stride}px)`}, {transform:'translateX(0)'}],
      {duration:360,easing:'cubic-bezier(.2,.65,.22,1)'});
  }
}
function mountCabinet() {
  clearInterval(cabinetTimer);
  const stage = document.querySelector('.cabinet');
  if (!stage || cabinetPaused) return;
  cabinetTimer = setInterval(() => {
    if (!stage.isConnected || document.hidden || document.querySelector('#overlay-root')?.innerHTML) return;
    for (const shelf of stage.querySelectorAll('.cabinet-shelf')) {
      if (!shelf.matches(':hover, :focus-within')) closetMove(1, Number(shelf.dataset.row), false);
    }
  }, 7500);
}
function closetGrid(rows) {
  return `<div class="saved-grid closet-grid">${rows.map(x=>['product','own'].includes(x.kind)?`<article class="saved-card"><button class="life-art" data-closet="detail" data-key="${esc(x.closetKey)}">${closetArt(x)}</button><small class="closet-grid-status">${esc(closetStatus(x))}</small><h3>${esc(closetProduct(x).name)}</h3>${closetProduct(x).reference?`<p>${esc(closetProduct(x).brand)}</p>`:''}${x.type==='catalog'?`<p>${esc(brandFor(closetProduct(x)))} · ${storeMoney(closetProduct(x).price_cents||0)}</p>`:''}${x.kind!=='own'?savedTools(x):''}</article>`:savedCard(x)).join('')}</div>`;
}
function closetEmpty() {
  const ordered=wardrobeStatus==='Ordered',owned=wardrobeStatus==='Owned';
  return `<div class="closet-empty"><div class="empty-rail" aria-hidden="true">${hanger()}${hanger()}${hanger()}</div><p>${ordered?'Purchased pieces appear here after payment is confirmed.':owned?'Your own pieces will live here.':'A little space for your next favourite.'}</p>${!ordered&&!owned?`<button class="life-btn subtle" data-closet="add">Add DIGO pieces ${icon('plus')}</button>`:`<a class="life-btn subtle" href="${owned?'#/edit/amalfi':'/shop'}">${owned?'Add an owned piece':'Explore pieces'} ${icon('arrow')}</a>`}</div>`;
}
function closetPage() {
  const rows=closetRecords(),rail=wardrobeFilter==='Clothing'&&closetView==='rail'&&rows.every(x=>['product','own'].includes(x.kind));
  let content;
  if(wardrobeFilter==='Combinations')content=`<div class="version-grid">${Object.values(world.boards).map(b=>`<article><a href="#/edit/${esc(b.id)}">${miniBoard(b)}<h3>${esc(b.title)}</h3></a></article>`).join('')}${Object.values(world.versions).map(v=>`<article>${miniBoard(v)}<h3>${esc(v.title)}</h3>${btn('Edit a copy','version-copy',v.id,'','subtle')}</article>`).join('')}</div>`;
  else if (rail && browsingCabinetPreview && wardrobeStatus === 'Liked' && !groupFilter) content = closetRail(cabinetPreview());
  else if (rows.length) content = rail ? closetRail(rows) : closetGrid(rows);
  else if (rail && wardrobeStatus === 'Liked' && !groupFilter) content = closetRail(cabinetPreview());
  else content = closetEmpty();
  return wrap(`<div class="closet-top"><h1>Wardrobe</h1><div class="closet-status" aria-label="Wardrobe status">${[['Liked','Saved'],['Ordered','Purchased'],['Owned','Owned']].map(([key,label])=>`<button data-life="wardrobe-status" data-id="${key}" aria-pressed="${wardrobeStatus===key}">${label}</button>`).join('')}</div><button class="life-btn subtle closet-add" data-closet="add">${icon('plus')} Add pieces</button></div><div class="closet-subnav"><div class="closet-categories" aria-label="Wardrobe category">${[['Clothing','Clothing'],['Home','Home'],['Combinations','Looks'],['Moments','Moments'],['Details','Details'],['Recently viewed','Recent']].map(([key,label])=>`<button data-life="wardrobe-filter" data-id="${key}" aria-current="${wardrobeFilter===key}">${label}</button>`).join('')}</div><div class="closet-views"><button data-closet="rail" aria-label="Glass cabinet" aria-pressed="${closetView==='rail'}" ${wardrobeFilter!=='Clothing'?'disabled':''}>${icon('shirt')}</button><button data-closet="grid" aria-label="Grid view" aria-pressed="${closetView==='grid'}">${icon('grid')}</button></div></div><div class="closet-collection"><label class="sr-only" for="closet-group">Collection</label><select id="closet-group"><option value="">All collections</option>${world.groups.map(g=>`<option value="${esc(g)}" ${g===groupFilter?'selected':''}>${esc(g)}</option>`).join('')}</select>${btn('New collection','new-group','','','quiet')}</div>${content}<div class="closet-footer">${world.resume?`<a href="#${esc(world.resume.path)}" data-life="resume">${icon('undo')} Continue ${esc(world.resume.label)} ${icon('right')}</a>`:''}<span>On this device</span></div>`,'closet-page');
}
function closetCatalogRows() {
  const q=closetQuery.toLowerCase().trim(),matches=[...referenceProducts,...catalog].filter(p=>[p.name,p.brand,p.category,p.material,p.style_code].some(v=>String(v||'').toLowerCase().includes(q)));
  if(catalogStatus==='loading')return '<p role="status">Loading pieces…</p>';
  if(catalogStatus==='error')return `<p>Could not load pieces. Your wardrobe is kept.</p><button class="life-btn subtle" data-closet="retry-catalog">Try again</button>`;
  if(!catalog.length&&!referenceProducts.length)return '<p>New pieces, soon.</p><a class="life-btn subtle" href="#/">Explore moments</a>';
  return matches.length?`<div class="closet-picker-grid">${matches.slice(0,closetLimit).map(p=>{
    const saved=world.saved.some(x=>x.kind==='product'&&x.id===p.id&&x.savedManually!==false);
    return `<article><button class="life-art" data-life="product" data-id="${esc(p.id)}" data-type="${p.reference?'concept':'catalog'}" aria-label="View ${esc(p.name)}">${productArt(p,p.reference?'concept':'catalog')}</button><small>${esc(brandFor(p))}</small><h3>${esc(p.name)}</h3><p>${p.reference?'Demo reference':storeMoney(p.price_cents,p.currency)}</p><button class="life-btn subtle" data-closet="save" data-key="${esc(p.id)}" ${saved?'disabled':''}>${saved?'Added ✓':'Add to wardrobe'}</button></article>`;
  }).join('')}</div>${matches.length>closetLimit?'<button class="life-btn subtle" data-closet="more">Show more</button>':''}`:'<p>No matching pieces. Try a name, brand or material.</p>';
}
function closetAddModal() {
  closetQuery='';closetLimit=18;
  overlay(`<h2>Add pieces</h2><label class="closet-search">${icon('search')}<input id="closet-search" placeholder="Search DIGO pieces" aria-label="Search DIGO pieces"></label><div id="closet-picker">${closetCatalogRows()}</div>`,'Add DIGO pieces');
  $('.modal')?.classList.add('closet-picker-modal');
}
function importWardrobeOrders() {
  try {
    const receipts=JSON.parse(localStorage.getItem('digo-wardrobe-orders-v1')||'[]');
    const next=J.mergeOrders(world,receipts);
    if(JSON.stringify(next)!==JSON.stringify(world)){world=next;writeWorld();}
  } catch { /* Do not erase a wardrobe when a receipt cannot be read. */ }
}
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-closet]');if(!el)return;e.preventDefault();
  const action=el.dataset.closet,key=el.dataset.key,record=closetRecords().find(x=>x.closetKey===key);
  if(action==='add')closetAddModal();
  else if(action==='save'){
    const p=productFor(key)||referenceProducts.find(p=>p.id===key);if(!p)return;
    if(saveRecord({kind:'product',id:p.id,type:p.reference?'concept':'catalog',title:p.name,snapshot:p.reference?undefined:p,savedManually:true})){
      wardrobeStatus='Liked';wardrobeFilter=J.category({},p);closetSelection='product:'+p.id;world.closetSelection=closetSelection;writeWorld();render(false);
      $('#closet-picker').innerHTML=closetCatalogRows();
    }
  }else if(action==='retry-catalog'){await loadCatalog();if($('#closet-picker'))$('#closet-picker').innerHTML=closetCatalogRows();}
  else if(action==='more'){closetLimit+=18;$('#closet-picker').innerHTML=closetCatalogRows();}
  else if(action==='previous'||action==='next')closetMove(action==='next'?1:-1, Number(el.closest('.cabinet-shelf').dataset.row));
  else if(action==='preview'){browsingCabinetPreview=!browsingCabinetPreview;render(false);}
  else if(action==='rotation'){
    cabinetPaused=!cabinetPaused;el.textContent=cabinetPaused?'Play':'Pause';
    el.setAttribute('aria-label',(cabinetPaused?'Start':'Pause')+' shelf rotation');
    mountCabinet();
  }
  else if(action==='detail'&&key?.startsWith('preview:')){
    const item=cabinetPreview().find(x=>x.closetKey===key);
    if(item)showProduct(item.id,item.type);
  }
  else if(action==='rail'||action==='grid'){closetView=action;render(false);}
  else if(action==='detail'&&record){record.type==='own'?ownedClosetDetail(record):showProduct(record.id,record.type);}
  else if(action==='manage'&&record){overlay(`<h2>${esc(closetProduct(record).name)}</h2>${savedTools(record)}${record.orderIds?.length||record.testOrderIds?.length?'<p>Purchase records remain linked to your order.</p>':''}`,'Organize piece');}
});
function ownedClosetDetail(record) { overlay(`<div class="product-detail-art">${closetArt(record)}</div><h2>${esc(record.name)}</h2><p>${esc(record.brand||'Your own piece')}</p>${btn('Care & services','care',record.id,'','subtle')}`,'Owned piece'); }
document.addEventListener('input',e=>{if(e.target.id==='closet-search'){closetQuery=e.target.value;closetLimit=18;$('#closet-picker').innerHTML=closetCatalogRows();}});
document.addEventListener('change',e=>{if(e.target.id==='closet-group'){groupFilter=e.target.value;render(false);}});
window.addEventListener('storage',e=>{if(e.key==='digo-wardrobe-orders-v1'){importWardrobeOrders();if(route()==='/wardrobe'&&!$('#overlay-root').innerHTML)render(false);}});
window.addEventListener('digo-wardrobe-orders',()=>{importWardrobeOrders();if(route()==='/wardrobe')render(false);});
