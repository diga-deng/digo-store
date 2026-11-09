/* The fitting room displays studio samples separately from personal wardrobe records. */
let closetQuery = '', closetLimit = 18;
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
const fittingRows = [
  { title: 'Tops', pieces: ['Ivory rib knit', 'Indigo overshirt', 'Olive shell'] },
  { title: 'Trousers', pieces: ['Indigo jeans', 'Sand pleats', 'Black tailored'] }
];
const fittingAssetRoot = '/scene-experience/assets/fitting/';
const fittingStorageKey = 'digo-fitting-look-v1';
function readFittingLook() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(fittingStorageKey)); } catch { /* Use the first studio look. */ }
  return fittingRows.map((row, i) => Number.isInteger(saved?.[i]) && row.pieces[saved[i]] ? saved[i] : 0);
}
let fittingLook = readFittingLook();
function fittingLookName() {
  return fittingRows.map((row, i) => row.pieces[fittingLook[i]]).join(' · ');
}
function fittingPhoto() {
  return fittingAssetRoot + 'look-' + fittingLook.join('-') + '.webp';
}
function fittingOptions(row, rowIndex) {
  return `<section class="fitting-row"><h2>${row.title}</h2>
    <div class="fitting-options" role="group" aria-label="${row.title}" aria-keyshortcuts="ArrowLeft ArrowRight"
      data-row="${rowIndex}" data-count="${row.pieces.length}" tabindex="0">
      ${row.pieces.map((piece, i) => `<button type="button" data-closet="try-piece" data-row="${rowIndex}" data-option="${i}"
        aria-label="${piece}" aria-pressed="${i === fittingLook[rowIndex]}">
        <img src="${fittingAssetRoot}option-${rowIndex}-${i}.webp" alt="" draggable="false"><span>${piece}</span></button>`).join('')}
    </div></section>`;
}
function fittingRoom() {
  return `<div class="fitting-room"><figure class="fitting-figure">
    <img class="fitting-model" src="${fittingPhoto()}" alt="Headless ceramic mannequin wearing ${fittingLookName()}" fetchpriority="high">
    </figure><div class="fitting-controls">
      <p class="fitting-intro">Studio samples</p>
      ${fittingRows.map(fittingOptions).join('')}
      <p class="fitting-caption" aria-live="polite">${fittingLookName()}</p>
    </div></div>`;
}
function chooseFittingPiece(row, option) {
  if (!fittingRows[row]?.pieces[option] || fittingLook[row] === option) return;
  fittingLook[row] = option;
  try { localStorage.setItem(fittingStorageKey, JSON.stringify(fittingLook)); } catch { /* Keep the current selection in memory. */ }
  const room = document.querySelector('.fitting-room');
  if (!room) return;
  room.querySelectorAll(`.fitting-options[data-row="${row}"] button`).forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.option) === option));
  });
  const model = room.querySelector('.fitting-model');
  model.src = fittingPhoto();
  model.alt = 'Headless ceramic mannequin wearing ' + fittingLookName();
  room.querySelector('.fitting-caption').textContent = fittingLookName();
}
function moveFittingPiece(step, row) {
  const count = fittingRows[row].pieces.length;
  chooseFittingPiece(row, (fittingLook[row] + step + count) % count);
}
function closetGrid(rows) {
  return `<div class="saved-grid closet-grid">${rows.map(x=>['product','own'].includes(x.kind)?`<article class="saved-card"><button class="life-art" data-closet="detail" data-key="${esc(x.closetKey)}">${closetArt(x)}</button><small class="closet-grid-status">${esc(closetStatus(x))}</small><h3>${esc(closetProduct(x).name)}</h3>${closetProduct(x).reference?`<p>${esc(closetProduct(x).brand)}</p>`:''}${x.type==='catalog'?`<p>${esc(brandFor(closetProduct(x)))} · ${storeMoney(closetProduct(x).price_cents||0)}</p>`:''}${x.kind!=='own'?savedTools(x):''}</article>`:savedCard(x)).join('')}</div>`;
}
function closetEmpty() {
  const ordered=wardrobeStatus==='Ordered',owned=wardrobeStatus==='Owned';
  return `<div class="closet-empty"><div class="empty-rail" aria-hidden="true">${hanger()}${hanger()}${hanger()}</div><p>${ordered?'Purchased pieces appear here after payment is confirmed.':owned?'Your own pieces will live here.':'A little space for your next favourite.'}</p>${!ordered&&!owned?`<button class="life-btn subtle" data-closet="add">Add DIGO pieces ${icon('plus')}</button>`:`<a class="life-btn subtle" href="${owned?'#/edit/amalfi':'/shop'}">${owned?'Add an owned piece':'Explore pieces'} ${icon('arrow')}</a>`}</div>`;
}
function closetPage() {
  const fitting = route() === '/wardrobe' && !location.hash.includes('tab=purchased');
  const tabs = `<nav class="fitting-tabs" aria-label="Wardrobe views">
    <a href="#/wardrobe" ${fitting ? 'aria-current="page"' : ''}>Fitting room</a>
    <a href="#/wardrobe/pieces" ${!fitting ? 'aria-current="page"' : ''}>My pieces</a></nav>`;
  const heading = `<div class="closet-top"><h1>Wardrobe</h1>${tabs}</div>`;
  if (fitting) return wrap(heading + fittingRoom(), 'closet-page');
  const rows = closetRecords();
  let content;
  if(wardrobeFilter==='Combinations')content=`<div class="version-grid">${Object.values(world.boards).map(b=>`<article><a href="#/edit/${esc(b.id)}">${miniBoard(b)}<h3>${esc(b.title)}</h3></a></article>`).join('')}${Object.values(world.versions).map(v=>`<article>${miniBoard(v)}<h3>${esc(v.title)}</h3>${btn('Edit a copy','version-copy',v.id,'','subtle')}</article>`).join('')}</div>`;
  else if (rows.length) content = closetGrid(rows);
  else content = closetEmpty();
  return wrap(`${heading}<div class="closet-library-head"><div class="closet-status" aria-label="Wardrobe status">${[['Liked','Saved'],['Ordered','Purchased'],['Owned','Owned']].map(([key,label])=>`<button data-life="wardrobe-status" data-id="${key}" aria-pressed="${wardrobeStatus===key}">${label}</button>`).join('')}</div><button class="life-btn subtle closet-add" data-closet="add">${icon('plus')} Add pieces</button></div><div class="closet-subnav"><div class="closet-categories" aria-label="Wardrobe category">${[['Clothing','Clothing'],['Home','Home'],['Combinations','Looks'],['Moments','Moments'],['Details','Details'],['Recently viewed','Recent']].map(([key,label])=>`<button data-life="wardrobe-filter" data-id="${key}" aria-current="${wardrobeFilter===key}">${label}</button>`).join('')}</div></div><div class="closet-collection"><label class="sr-only" for="closet-group">Collection</label><select id="closet-group"><option value="">All collections</option>${world.groups.map(g=>`<option value="${esc(g)}" ${g===groupFilter?'selected':''}>${esc(g)}</option>`).join('')}</select>${btn('New collection','new-group','','','quiet')}</div>${content}<div class="closet-footer">${world.resume?`<a href="#${esc(world.resume.path)}" data-life="resume">${icon('undo')} Continue ${esc(world.resume.label)} ${icon('right')}</a>`:''}<span>On this device</span></div>`,'closet-page');
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
  if(action==='try-piece')chooseFittingPiece(Number(el.dataset.row), Number(el.dataset.option));
  else if(action==='add')closetAddModal();
  else if(action==='save'){
    const p=productFor(key)||referenceProducts.find(p=>p.id===key);if(!p)return;
    if(saveRecord({kind:'product',id:p.id,type:p.reference?'concept':'catalog',title:p.name,snapshot:p.reference?undefined:p,savedManually:true})){
      wardrobeStatus='Liked';wardrobeFilter=J.category({},p);world.closetSelection='product:'+p.id;writeWorld();render(false);
      $('#closet-picker').innerHTML=closetCatalogRows();
    }
  }else if(action==='retry-catalog'){await loadCatalog();if($('#closet-picker'))$('#closet-picker').innerHTML=closetCatalogRows();}
  else if(action==='more'){closetLimit+=18;$('#closet-picker').innerHTML=closetCatalogRows();}
  else if(action==='detail'&&record){record.type==='own'?ownedClosetDetail(record):showProduct(record.id,record.type);}
  else if(action==='manage'&&record){overlay(`<h2>${esc(closetProduct(record).name)}</h2>${savedTools(record)}${record.orderIds?.length||record.testOrderIds?.length?'<p>Purchase records remain linked to your order.</p>':''}`,'Organize piece');}
});
function ownedClosetDetail(record) { overlay(`<div class="product-detail-art">${closetArt(record)}</div><h2>${esc(record.name)}</h2><p>${esc(record.brand||'Your own piece')}</p>${btn('Care & services','care',record.id,'','subtle')}`,'Owned piece'); }
document.addEventListener('input',e=>{if(e.target.id==='closet-search'){closetQuery=e.target.value;closetLimit=18;$('#closet-picker').innerHTML=closetCatalogRows();}});
document.addEventListener('change',e=>{if(e.target.id==='closet-group'){groupFilter=e.target.value;render(false);}});
window.addEventListener('storage',e=>{if(e.key==='digo-wardrobe-orders-v1'){importWardrobeOrders();if(route().startsWith('/wardrobe')&&!$('#overlay-root').innerHTML)render(false);}});
window.addEventListener('digo-wardrobe-orders',()=>{importWardrobeOrders();if(route().startsWith('/wardrobe'))render(false);});
