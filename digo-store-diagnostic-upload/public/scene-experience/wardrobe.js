/* An image-based hanging rail. Product identities and saved records stay unchanged. */
let closetSelection = '', closetView = 'rail', closetQuery = '', closetLimit = 18, closetSwipedUntil = 0;
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
  return record.type==='concept'?'Concept piece':'Saved';
}
function hanger() { return `<svg class="closet-hanger" viewBox="0 0 220 75" aria-hidden="true"><path class="hanger-hook" d="M111 25V15c0-6 10-5 10-12 0-11-19-11-19 0"/><path class="hanger-wood" d="m111 23-85 34q-7 4 1 8h166q8-4 1-8Z"/><path class="hanger-line" d="M29 60h163"/></svg>`; }
function closetArt(x) {
  const p=closetProduct(x);
  if(x.type==='own')return `<div class="closet-missing">${icon('shirt')}<span>${esc(p.name)}</span></div>`;
  if(x.type==='concept')return productPhoto(p);
  const image=safeImage(p?.image_url||p?.image);
  return image?`<img src="${esc(image)}" alt="${esc(p.name)}" draggable="false">`:`<div class="closet-missing">${icon('image')}<span>${esc(p?.material||p?.name||'Your piece')}</span><small>Photo pending</small></div>`;
}
function closetRail(rows) {
  let index=rows.findIndex(x=>x.closetKey===closetSelection);
  if(index<0){index=rows.findIndex(x=>x.type==='concept'||safeImage(closetProduct(x)?.image_url));if(index<0)index=0;closetSelection=rows[index].closetKey;}
  const selected=rows[index], p=closetProduct(selected);
  return `<section class="closet-stage" aria-label="Hanging wardrobe"><div class="closet-rail-line" aria-hidden="true"></div><div class="closet-garments" tabindex="0" aria-label="Clothing rail. Use the left and right arrow keys.">${rows.map((x,i)=>{
    let offset=i-index;if(offset>rows.length/2)offset-=rows.length;if(offset<-rows.length/2)offset+=rows.length;const visible=Math.abs(offset)<=3;
    return `<button class="closet-piece ${offset===0?'is-selected':''}" data-closet="select" data-key="${esc(x.closetKey)}" style="--offset:${offset};--depth:${Math.abs(offset)};z-index:${10-Math.abs(offset)}" ${!visible?'hidden':''} aria-label="${esc(closetProduct(x).name)}" aria-pressed="${offset===0}" tabindex="${offset===0?0:-1}">${hanger()}<div class="closet-garment-art">${closetArt(x)}</div></button>`;
  }).join('')}</div><div class="closet-navigation"><button data-closet="previous" class="closet-arrow" aria-label="Previous piece" ${rows.length<2?'disabled':''}>${icon('left')}</button><span aria-live="polite">${String(index+1).padStart(2,'0')} / ${String(rows.length).padStart(2,'0')}</span><button data-closet="next" class="closet-arrow" aria-label="Next piece" ${rows.length<2?'disabled':''}>${icon('right')}</button></div><div class="closet-focus">${selected.type==='catalog'?`<p>${storeMoney(p.price_cents||0,p.currency)}</p>`:''}<div class="closet-focus-actions"><button class="life-btn subtle" data-closet="detail" data-key="${esc(selected.closetKey)}">View piece ${icon('arrow')}</button>${selected.kind!=='own'?`<button class="icon-btn" data-closet="manage" data-key="${esc(selected.closetKey)}" aria-label="Organize ${esc(p.name)}">${icon('grid')}</button>`:''}</div></div></section>`;
}
function closetGrid(rows) {
  return `<div class="saved-grid closet-grid">${rows.map(x=>['product','own'].includes(x.kind)?`<article class="saved-card"><button class="life-art" data-closet="detail" data-key="${esc(x.closetKey)}">${closetArt(x)}</button><small class="closet-grid-status">${esc(closetStatus(x))}</small><h3>${esc(closetProduct(x).name)}</h3>${x.type==='catalog'?`<p>${esc(brandFor(closetProduct(x)))} · ${storeMoney(closetProduct(x).price_cents||0)}</p>`:''}${x.kind!=='own'?savedTools(x):''}</article>`:savedCard(x)).join('')}</div>`;
}
function closetEmpty() {
  const ordered=wardrobeStatus==='Ordered',owned=wardrobeStatus==='Owned';
  return `<div class="closet-empty"><div class="empty-rail" aria-hidden="true">${hanger()}${hanger()}${hanger()}</div><p>${ordered?'Purchased pieces appear here after payment is confirmed.':owned?'Your own pieces will live here.':'A little space for your next favourite.'}</p>${!ordered&&!owned?`<button class="life-btn subtle" data-closet="add">Add DIGO pieces ${icon('plus')}</button>`:`<a class="life-btn subtle" href="${owned?'#/edit/amalfi':'/shop'}">${owned?'Add an owned piece':'Explore pieces'} ${icon('arrow')}</a>`}</div>`;
}
function closetPage() {
  const rows=closetRecords(),rail=wardrobeFilter==='Clothing'&&closetView==='rail'&&rows.every(x=>['product','own'].includes(x.kind));
  let content;
  if(wardrobeFilter==='Combinations')content=`<div class="version-grid">${Object.values(world.boards).map(b=>`<article><a href="#/edit/${esc(b.id)}">${miniBoard(b)}<h3>${esc(b.title)}</h3></a></article>`).join('')}${Object.values(world.versions).map(v=>`<article>${miniBoard(v)}<h3>${esc(v.title)}</h3>${btn('Edit a copy','version-copy',v.id,'','subtle')}</article>`).join('')}</div>`;
  else content=rows.length?(rail?closetRail(rows):closetGrid(rows)):closetEmpty();
  return wrap(`<h1 class="sr-only">Wardrobe</h1><div class="closet-top"><div class="closet-status" aria-label="Wardrobe status">${[['Liked','Saved'],['Ordered','Purchased'],['Owned','Owned']].map(([key,label])=>`<button data-life="wardrobe-status" data-id="${key}" aria-pressed="${wardrobeStatus===key}">${label}</button>`).join('')}</div><button class="life-btn subtle closet-add" data-closet="add">${icon('plus')} Add pieces</button></div><div class="closet-subnav"><div class="closet-categories" aria-label="Wardrobe category">${[['Clothing','Clothing'],['Home','Home'],['Combinations','Looks'],['Moments','Moments'],['Details','Details'],['Recently viewed','Recent']].map(([key,label])=>`<button data-life="wardrobe-filter" data-id="${key}" aria-current="${wardrobeFilter===key}">${label}</button>`).join('')}</div><div class="closet-views"><button data-closet="rail" aria-label="Hanging rail" aria-pressed="${closetView==='rail'}" ${wardrobeFilter!=='Clothing'?'disabled':''}>${icon('shirt')}</button><button data-closet="grid" aria-label="Grid view" aria-pressed="${closetView==='grid'}">${icon('grid')}</button></div></div><div class="closet-collection"><label class="sr-only" for="closet-group">Collection</label><select id="closet-group"><option value="">All collections</option>${world.groups.map(g=>`<option value="${esc(g)}" ${g===groupFilter?'selected':''}>${esc(g)}</option>`).join('')}</select>${btn('New collection','new-group','','','quiet')}</div>${content}<div class="closet-footer">${world.resume?`<a href="#${esc(world.resume.path)}" data-life="resume">${icon('undo')} Continue ${esc(world.resume.label)} ${icon('right')}</a>`:''}<span>On this device</span></div>`,'closet-page');
}
function closetMove(step) {
  const rows=closetRecords(),index=Math.max(0,rows.findIndex(x=>x.closetKey===closetSelection));
  const next=rows[(index+step+rows.length)%rows.length];
  if(!next)return;closetSelection=next.closetKey;world.closetSelection=closetSelection;writeWorld();paintClosetSelection();
}
function paintClosetSelection() {
  const stage=$('.closet-stage');if(!stage){render(false);return;}
  const preview=document.createElement('div');preview.innerHTML=closetRail(closetRecords());
  const updated=[...preview.querySelectorAll('.closet-piece')];
  for(const node of stage.querySelectorAll('.closet-piece')){
    const next=updated.find(x=>x.dataset.key===node.dataset.key);if(!next)continue;
    node.hidden=next.hidden;node.style.cssText=next.style.cssText;node.className=next.className;
    node.setAttribute('aria-pressed',next.getAttribute('aria-pressed'));node.tabIndex=next.tabIndex;
  }
  stage.querySelector('.closet-navigation span').textContent=preview.querySelector('.closet-navigation span').textContent;
  for(const action of ['previous','next'])stage.querySelector(`[data-closet="${action}"]`).disabled=preview.querySelector(`[data-closet="${action}"]`).disabled;
  stage.querySelector('.closet-focus').innerHTML=preview.querySelector('.closet-focus').innerHTML;
}
function closetCatalogRows() {
  const q=closetQuery.toLowerCase().trim(),matches=catalog.filter(p=>[p.name,p.brand,p.category,p.material,p.style_code].some(v=>String(v||'').toLowerCase().includes(q)));
  if(catalogStatus==='loading')return '<p role="status">Loading pieces…</p>';
  if(catalogStatus==='error')return `<p>Could not load pieces. Your wardrobe is kept.</p><button class="life-btn subtle" data-closet="retry-catalog">Try again</button>`;
  if(!catalog.length)return '<p>New pieces, soon.</p><a class="life-btn subtle" href="#/">Explore moments</a>';
  return matches.length?`<div class="closet-picker-grid">${matches.slice(0,closetLimit).map(p=>{
    const saved=world.saved.some(x=>x.kind==='product'&&x.id===p.id&&x.savedManually!==false);
    return `<article><button class="life-art" data-life="product" data-id="${esc(p.id)}" aria-label="View ${esc(p.name)}">${productArt(p)}</button><small>${esc(brandFor(p))}</small><h3>${esc(p.name)}</h3><p>${storeMoney(p.price_cents,p.currency)}</p><button class="life-btn subtle" data-closet="save" data-key="${esc(p.id)}" ${saved?'disabled':''}>${saved?'Added ✓':'Add to wardrobe'}</button></article>`;
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
    const p=productFor(key);if(!p)return;
    if(saveRecord({kind:'product',id:p.id,type:'catalog',title:p.name,snapshot:p,savedManually:true})){
      wardrobeStatus='Liked';wardrobeFilter=J.category({},p);closetSelection='product:'+p.id;world.closetSelection=closetSelection;writeWorld();render(false);
      $('#closet-picker').innerHTML=closetCatalogRows();
    }
  }else if(action==='retry-catalog'){await loadCatalog();if($('#closet-picker'))$('#closet-picker').innerHTML=closetCatalogRows();}
  else if(action==='more'){closetLimit+=18;$('#closet-picker').innerHTML=closetCatalogRows();}
  else if(action==='select'){if(Date.now()<closetSwipedUntil)return;if(closetSelection===key){if(record)record.type==='own'?ownedClosetDetail(record):showProduct(record.id,record.type);}else{closetSelection=key;world.closetSelection=key;writeWorld();paintClosetSelection();}}
  else if(action==='previous'||action==='next')closetMove(action==='next'?1:-1);
  else if(action==='rail'||action==='grid'){closetView=action;render(false);}
  else if(action==='detail'&&record){record.type==='own'?ownedClosetDetail(record):showProduct(record.id,record.type);}
  else if(action==='manage'&&record){overlay(`<h2>${esc(closetProduct(record).name)}</h2>${savedTools(record)}${record.orderIds?.length||record.testOrderIds?.length?'<p>Purchase records remain linked to your order.</p>':''}`,'Organize piece');}
});
function ownedClosetDetail(record) { overlay(`<div class="product-detail-art">${closetArt(record)}</div><h2>${esc(record.name)}</h2><p>${esc(record.brand||'Your own piece')}</p>${btn('Care & services','care',record.id,'','subtle')}`,'Owned piece'); }
document.addEventListener('input',e=>{if(e.target.id==='closet-search'){closetQuery=e.target.value;closetLimit=18;$('#closet-picker').innerHTML=closetCatalogRows();}});
document.addEventListener('change',e=>{if(e.target.id==='closet-group'){groupFilter=e.target.value;render(false);}});
window.addEventListener('storage',e=>{if(e.key==='digo-wardrobe-orders-v1'){importWardrobeOrders();if(route()==='/wardrobe'&&!$('#overlay-root').innerHTML)render(false);}});
window.addEventListener('digo-wardrobe-orders',()=>{importWardrobeOrders();if(route()==='/wardrobe')render(false);});
