/* DIGO journeys: the existing scene imagery and store share one explicit selection model. */
const J = DigoJourney, WORLD_KEY = 'digo-journeys-v2';
let world;
try { world = J.initial(JSON.parse(localStorage.getItem(WORLD_KEY) || 'null') || {}); } catch { world = J.initial(); }
let catalog = [], catalogStatus = 'loading', currentBoard = null, activePlan = null, currentProduct = null;
let wardrobeFilter = 'Clothing', wardrobeStatus = location.hash.includes('tab=purchased')?'Ordered':'Liked', groupFilter = '', storageFailed = false, sharingBusy = false, applyingRemoteState = false;
const newId = () => crypto.randomUUID();
const safeImage = value => typeof value === 'string' && (/^\/(?!\/)/.test(value) || /^https:\/\//.test(value)) ? value : '';
const moments = {
  amalfi: ['Before dinner, by the sea.', 'The terrace. The last light. A little anticipation.', '19:30 · THE COASTAL EDIT'],
  dinner: ['A table, before everyone arrives.', 'Straighten the linen. Leave room for one more.', '17:30 · AT YOUR PLACE'],
  morning: ['Fresh sheets. One more chapter.', 'The room is ready. The rest of the day can wait.', '10:00 · A SLOWER SUNDAY']
};
const route = () => (location.hash.slice(1) || '/').split('?')[0];
const sceneFor = id => [...baseScenes, ...archivedScenes, ...state.custom].find(s => s.id === id);
const productFor = id => catalog.find(p => p.id === id || p.slug === id);
let pendingPlanContext = {};
const contextScene = () => route().startsWith('/scene/') ? route().split('/')[2] : route().startsWith('/edit/') ? world.boards[route().split('/')[2]]?.sceneId : null;
const brandFor = p => p?.brand || 'Brand not yet supplied';
function writeWorld() {
  try { const serialized=JSON.stringify(world); if(localStorage.getItem(WORLD_KEY)!==serialized)localStorage.setItem(WORLD_KEY, serialized); storageFailed = false; return true; }
  catch { storageFailed = true; toast('Could not save on this device. Your choices are still here. Retry saving.'); return false; }
}
function recordSceneInteraction() {}
function recordProductView() {}
function mountSwipePage() {}
function remember(path, label) { if(applyingRemoteState || (world.resume?.path===path&&world.resume.label===label))return; world.resume = { path, label, scroll:world.resume?.path===path?world.resume.scroll:0, at: Date.now() }; writeWorld(); }
function navLink(path, text, glyph, active) { return `<a href="#${path}" ${active ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${text}</span></a>`; }
function header() {
  return `<header class="life-header"><a class="brand" href="#/" aria-label="DIGO home">DIGO</a><span class="brand-line">Different brands. Your style.</span><div class="header-tools"><button class="icon-btn" data-life="search" aria-label="Search">${icon('search')}</button><button class="icon-btn" data-life="bag" aria-label="Shopping bag">${icon('bag')}<span class="bag-count">${storeCartCount()}</span></button><a class="icon-btn" href="#/account" aria-label="Account">${icon('user')}</a></div></header>`;
}
function bottomNavigation() {
  const r = route();
  return `<nav class="life-nav" aria-label="Main navigation">${navLink('/', 'Discover', 'sun', r==='/' || r.startsWith('/scene'))}${navLink('/style','Style','spark',r==='/style'||r.startsWith('/edit'))}${navLink('/wardrobe','Wardrobe','shirt',['/wardrobe','/world','/recent','/interests'].includes(r))}${navLink('/plans','Plans','calendar',r.startsWith('/plan'))}</nav>`;
}
symbols.calendar = '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h3"/>';
symbols.share = '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 11 6-4m-6 6 6 4"/>';
symbols.circle = '<path d="M20 12a8 8 0 1 1-8-8c3 0 5 1 6 3"/><path d="m17 2 5 2-2 5"/>';
function wrap(body, cls='') { return `${header()}<main id="main" class="life-main ${cls}">${world.catalogChanges?.length?notice(world.catalogChanges.map(esc).join(' ')):''}${storageFailed?'<div role="alert" class="life-notice">Your changes have not been saved. <button data-life="retry-save">Retry saving</button></div>':''}${body}</main>${bottomNavigation()}`; }
function pageHeading(kicker,title,copy='',action='') { return `<div class="life-page-head"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1>${copy?`<p>${copy}</p>`:''}</div>${action}</div>`; }
function btn(label,action,id='',extra='',cls='') { return `<button class="life-btn ${cls}" data-life="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`; }
function empty(title,copy,link='#/',label='Discover a little inspiration') { return `<div class="life-empty">${icon('save')}<h2>${title}</h2><p>${copy}</p><a class="life-btn" href="${link}">${label} ${icon('arrow')}</a></div>`; }
function notice(text) { return `<p class="life-notice">${text}</p>`; }
function productArt(p,type='catalog') {
  if (type==='concept') return productPhoto(p);
  const image = safeImage(p?.image_url || p?.image);
  return image ? `<img src="${esc(image)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="life-product-placeholder"><span>${esc(p?.category || 'A piece for your world')}</span>${icon('shirt')}<strong>${esc(p?.material || p?.name || 'Your own piece')}</strong><small>Product photo pending</small></div>`;
}
function itemInfo(item) {
  const p = item.type==='concept' ? getProduct(item.id) : item.type==='catalog' ? productFor(item.id) || item.snapshot : item;
  return p || { name: 'Unavailable piece', id: item.id };
}
function itemArt(item) { const p=itemInfo(item);return item.type==='own'?`<div class="own-art">${icon(item.category==='Home'?'home':'shirt')}<span>${esc(p.name)}</span><small>Already yours</small></div>`:productArt(p,item.type); }
function itemBrand(item) { return itemInfo(item).reference?itemInfo(item).brand:item.type==='concept'?'Concept · no brand assigned':item.type==='own'?(item.brand||'Your own piece'):brandFor(itemInfo(item)); }
function itemCaption(item) { return item.owned?'Already owned':itemInfo(item).screenReference?'Screen reference':itemInfo(item).reference?'Demo reference':item.type==='concept'?'Inspiration only':item.type==='catalog'?storeMoney(itemInfo(item).price_cents || 0):'Your own piece'; }
function miniBoard(b) { return `<div class="mini-board">${b.items.slice(0,4).map(i=>`<div>${itemArt(i)}</div>`).join('')}</div>`; }
function resumeCard() { const r=world.resume;return r?`<a class="resume-card" href="#${esc(r.path)}" data-life="resume"><span>${icon('undo')} Pick up where you left off</span><strong>${esc(r.label)}</strong>${icon('right')}</a>`:''; }
function sceneSection(s,index,single=false) {
  const m=moments[s.id]||[s.title,s.subtitle,'YOUR MOMENT'];
  return `<section class="life-scene ${s.reference?'reference-scene':''} ${s.screenScene?'screen-scene':''}" style="--reference-tone:${s.tone||'#807b70'}" id="moment-${s.id}" data-scene="${s.id}" ${s.fullScene?'data-real-room="true"':''} aria-label="${esc(m[0])}" tabindex="0" aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight">
    <img class="life-scene-photo" src="${esc(s.image)}" alt="${esc(m[1])}" ${s.fullScene?`style="object-position:${s.position[0]*100}% ${s.position[1]*100}%"`:""} fetchpriority="high" draggable="false">
    <div class="scene-topline"><span>${String(index+1).padStart(2,'0')} / ${String(baseScenes.length).padStart(2,'0')}</span><span class="scene-static-label">${s.reference?esc(s.brand)+'<span class="reference-mini-label">Demo</span>':'Concept still'}</span></div>
    <aside class="life-rail" aria-label="Pieces in this moment"><span>THE DETAILS</span>${s.items.slice(0,4).map((id,i)=>`<button data-life="product" data-id="${id}" data-type="concept" data-scene="${s.id}" aria-label="View ${esc(getProduct(id).name)}">${productPhoto(getProduct(id))}<small>${s.fullScene?String(i+1).padStart(2,'0'):'View piece'} ${icon('plus')}</small></button>`).join('')}</aside>
    ${s.fullScene?`<svg class="scene-hotspot-lines" aria-hidden="true">${s.hotspots.map((h,i)=>`<line data-hotspot-line="${i}"/>`).join('')}</svg>${s.hotspots.map((h,i)=>`<button class="life-hotspot room-hotspot" data-hotspot-index="${i}" data-life="product" data-type="concept" data-id="${h.id}" data-scene="${s.id}" aria-label="View ${esc(getProduct(h.id).name)}"><span>${String(i+1).padStart(2,'0')}</span></button>`).join('')}`:`<button class="life-hotspot" style="left:72%;top:48%" data-life="product" data-type="concept" data-id="${s.items[0]}" data-scene="${s.id}" aria-label="View ${esc(getProduct(s.items[0]).name)}">${icon('plus')}</button>`}
    <div class="scene-quick"><button data-life="save-scene" data-id="${s.id}" aria-label="Save this moment" aria-pressed="${world.saved.some(x=>x.kind==='scene'&&x.id===s.id)}">${icon('save')}<span>Save</span></button><button data-life="circle" data-id="${s.id}" aria-label="Circle a detail">${icon('circle')}<span>Circle a detail</span></button></div>
    ${s.screenScene?`<button class="scene-wide-view" data-life="full-scene" data-id="${s.id}">${icon('grid')}<span>Full scene</span></button>`:''}<div class="life-scene-copy"><h2 class="sr-only">${esc(m[0])}</h2><div class="life-actions"><a class="life-btn light" href="#/edit/${s.id}">Make it mine ${icon('plus')}</a><button class="life-btn glass" data-life="scene-pieces" data-id="${s.id}">Explore pieces ${icon('arrow')}</button></div></div>
    <div class="scene-index"><button class="scene-step" data-life="next-scene" data-id="${baseScenes[(index-1+baseScenes.length)%baseScenes.length].id}" data-direction="-1" aria-label="Previous moment">↑</button><button class="scene-step" data-life="next-scene" data-id="${baseScenes[(index+1)%baseScenes.length].id}" data-direction="1" aria-label="Next moment">↓</button></div>
  </section>`;
}
let journeyDirection = '';
function feedScene(key) { return baseScenes.find(s=>s.id===world.browse?.[key]) || baseScenes[0]; }
function activateFeedScene(id, direction=1) {
  const s=sceneFor(id); if(!s)return false;
  const key=route()==='/style'?'style':'discover';
  world.browse={...world.browse,[key]:id}; currentScene=id; journeyDirection=direction>0?'up':'down'; writeWorld();
  if(route().startsWith('/scene/'))navigate('/scene/'+id);else render(false);
  return true;
}
function moveJourneyScene(step) {
  const active=document.querySelector('.moment-feed .life-scene'); if(!active)return false;
  const index=baseScenes.findIndex(s=>s.id===active.dataset.scene);
  return activateFeedScene(baseScenes[(Math.max(0,index)+step+baseScenes.length)%baseScenes.length].id,step);
}
function discoverPage() {
  const s=feedScene('discover');currentScene=s.id;
  return wrap(sceneSection(s,baseScenes.indexOf(s)),'discover-page moment-feed');
}
function catalogCard(p, extra='', sceneId=null) {return `<article class="life-product-card"><button class="life-art" data-life="product" data-type="catalog" data-id="${esc(p.id)}" ${sceneId?`data-scene="${esc(sceneId)}"`:""} aria-label="View ${esc(p.name)}">${productArt(p)}</button><p class="eyebrow">${esc(brandFor(p))}</p><h3>${esc(p.name)}</h3><p>${storeMoney(p.price_cents,p.currency)} <small>· ${esc(p.style_code||'')}</small></p>${extra||btn('Save to wardrobe','save-product',p.id,'data-type="catalog"','subtle')}</article>`;}
function scenePage(id) {
  const s=sceneFor(id); if(!s)return wrap(empty('This moment is not here.','The original link may have changed.'));
  currentScene=s.id; remember('/scene/'+id,s.title);
  return wrap(sceneSection(s,Math.max(0,baseScenes.indexOf(s)),true),'scene-page moment-feed');
}
function getBoard(id) {
  if (!world.boards[id]) {
    const scene=sceneFor(id), legacy=state.drafts[id];
    const items=(legacy?.items||scene?.items||[]).map((pid,index)=>({key:newId(),id:pid,type:'concept',locked:legacy?.locked?.includes(pid)||false,owned:legacy?.owned?.includes(pid)||false,selected:true}));
    world.boards[id]={id,title:legacy?.title||scene?.title||'My own combination',sceneId:scene?.id||null,items,history:[],future:[],budget:'',mood:'',color:'',updatedAt:Date.now()};writeWorld();
  } return world.boards[id];
}
function editPage(id) {
  currentBoard=id; const b=getBoard(id), source=sceneFor(b.sceneId), total=J.total(b,catalog);
  const versions=Object.values(world.versions).filter(v=>v.boardId===id);
  remember('/edit/'+id,b.title);
  return wrap(`<div class="editor-breadcrumb"><a href="#/wardrobe">My World</a><span> / Make it mine</span></div>${pageHeading('YOUR COMBINATION','Make it mine.','Keep the feeling. Choose each piece.',`<div class="life-actions">${btn('Undo','board-undo',id,!(b.history?.length)?'disabled':'','subtle')}${btn('Redo','board-redo',id,!(b.future?.length)?'disabled':'','subtle')}</div>`)}
    <div class="life-editor"><aside class="life-source">${source?`<img src="${esc(source.image)}" alt="Original scene inspiration"><p class="eyebrow">ORIGINAL INSPIRATION</p><h3>${esc(source.title)}</h3><p>The image stays as inspiration. Your actual selection appears on the combination board.</p>`:'<h3>Your own starting point.</h3><p>Build around a piece you love.</p>'}<a class="text-btn" href="#/style">Explore a feeling ${icon('arrow')}</a></aside>
    <section><div class="board-title"><h2>${esc(b.title)}</h2><span class="status-dot">${storageFailed?'Unsaved changes':'Saved on this device'}</span></div><div class="life-board">${b.items.length?b.items.map(i=>`<article class="board-item"><div class="board-art">${itemArt(i)}<span class="board-kind">${i.owned?'Owned':itemInfo(i).reference?'Demo':i.type==='concept'?'Concept':'Catalog'}</span></div><div class="board-item-copy"><p class="eyebrow">${esc(itemBrand(i))}</p><h3>${esc(itemInfo(i).name)}</h3><p>${esc(itemCaption(i))}</p><div class="board-controls">${btn(i.locked?'Kept ✓':'Keep this','board-lock',i.key,`aria-pressed="${!!i.locked}"`,'subtle')}${btn('Swap piece','swap',i.key,i.locked?'disabled':'','subtle')}${btn(i.owned?'Use new instead':'Use my own','board-own',i.key,'','subtle')}${btn('Remove','board-remove',i.key,i.locked?'disabled':'','quiet')}</div>${i.type==='catalog'&&!i.owned?`<label class="purchase-check"><input type="checkbox" data-change-life="purchase-item" data-id="${i.key}" ${i.selected!==false?'checked':''}> Include in purchase</label>`:''}</div></article>`).join(''):empty('A little room for something new.','Add a piece to begin.','#/style','Explore style')}</div><div class="life-actions">${btn('Add a piece','swap','')}${btn('Add something I own','own-modal','','','subtle')}</div>
    <div class="board-preferences"><label>Feeling<input data-board-field="mood" value="${esc(b.mood)}" placeholder="Sweet, but structured" maxlength="80"></label><label>Colour direction<input data-board-field="color" value="${esc(b.color)}" placeholder="Ink blue + warm ivory" maxlength="60"></label><label>New-pieces budget · USD<input type="number" min="0" max="100000" data-board-field="budget" value="${esc(b.budget)}" placeholder="Optional"></label></div><p class="life-small">These preferences guide your choices; pieces change only when you choose a replacement.</p>
    ${b.budget && total>Number(b.budget)*100?notice(`Your selection is ${storeMoney(total-Number(b.budget)*100)} above your budget. Your kept pieces are unchanged.`):''}
    <div class="board-summary"><div><span>Selected new catalog pieces</span><strong>${storeMoney(total)}</strong><small>Owned items, demo references and concept pieces excluded. Shipping and tax unconfirmed.</small></div><div class="life-actions">${btn('Buy selected pieces','buy-board',id,b.items.some(i=>i.type==='catalog'&&!i.owned&&i.selected!==false)?'':'disabled')}${btn('Save a version','version',id,'','subtle')}${btn('Add to a plan','plan-add-board',id,'','subtle')}</div></div>
    <div class="version-section"><h2>Your versions <small>${versions.length}</small></h2><p>Save A and B before asking a friend. Each saved version keeps its original selection.</p><div class="version-grid">${versions.map((v,i)=>`<article>${miniBoard(v)}<h3>${String.fromCharCode(65+i)} · ${esc(v.title)}</h3><div class="life-actions">${btn('Edit a copy','version-copy',v.id,'','subtle')}${btn('Add to plan','version-plan',v.id,'','quiet')}</div></article>`).join('')}</div>${btn('Ask a friend','share-start',id,versions.length<2?'disabled':'')}</div></section></div>`,'editor-page');
}
function stylePage() {
  const s=feedScene('style');currentScene=s.id;
  return wrap(`${sceneSection(s,baseScenes.indexOf(s))}<button class="style-refine-entry life-btn light" data-life="refine-style" aria-label="Refine your style">${icon('spark')} Refine</button>`,'style-page moment-feed');
}
function saveRecord(record) {
  const key=record.kind+':'+record.id, existing=world.saved.find(x=>x.key===key);
  if(!existing)world.saved.unshift({...record,key,at:Date.now(),group:'',status:'liked',savedManually:true});
  else if(record.kind==='product')existing.savedManually=true;
  else if(record.kind==='inspiration')Object.assign(existing,record,{key,updatedAt:Date.now()});
  const saved=writeWorld();if(saved)toast(existing?(record.kind==='inspiration'?'Your detail was updated.':'Already in your wardrobe.'):'Saved to your wardrobe.');return saved;
}
function savedCard(x) {
  if(x.kind==='product') { const p=x.type==='concept'?getProduct(x.id):productFor(x.id)||x.snapshot;return p?`<article class="saved-card"><button class="life-art" data-life="product" data-id="${esc(x.id)}" data-type="${x.type}">${productArt(p,x.type)}</button><p class="eyebrow">${p.reference?esc(p.brand):x.type==='concept'?'CONCEPT PIECE':esc(brandFor(p))}</p><h3>${esc(p.name)}</h3><p>${p.reference?'Demo reference':x.type==='concept'?'Inspiration only':storeMoney(p.price_cents)}</p>${savedTools(x)}</article>`:''; }
  if(x.kind==='scene'){const s=sceneFor(x.id);return s?`<article class="saved-card"><a href="#/scene/${s.id}"><img class="saved-cover" src="${esc(s.image)}" alt="${esc(s.title)}"></a><p class="eyebrow">SAVED MOMENT</p><h3>${esc(s.title)}</h3>${savedTools(x)}</article>`:'';}
  if(x.kind==='inspiration'){return `<article class="saved-card"><button class="inspiration-preview" data-life="view-inspiration" data-id="${x.id}">${circlePreview(x)}</button><p class="eyebrow">CIRCLED INSPIRATION</p><h3>${esc(x.title)}</h3>${savedTools(x)}</article>`;}
  return '';
}
function savedTools(x){if(x.planId)return btn('Remove from plan','remove-inspiration',x.key,`data-plan="${x.planId}"`,'quiet');if(x.key.startsWith('recent:'))return btn('Save to wardrobe','save-product',x.id,`data-type="${x.type}"`,'subtle');return `<div class="saved-tools"><select data-change-life="group" data-id="${esc(x.key)}" aria-label="Collection for ${esc(x.title||x.id)}"><option value="">Ungrouped</option>${world.groups.map(g=>`<option ${x.group===g?'selected':''}>${esc(g)}</option>`).join('')}</select>${btn('Remove','unsave',x.key,'','quiet')}</div>`;}
function wardrobePage() { return closetPage(); }
function planCard(p) { const first=world.versions[p.candidateIds[0]];return `<article class="plan-card"><a href="#/plan/${p.id}">${first?miniBoard(first):`<div class="plan-empty-art">${icon('calendar')}<span>A day to look forward to.</span></div>`}<p class="eyebrow">${esc(p.date||'DATE OPEN')} ${p.archived?'· ARCHIVED':''}</p><h2>${esc(p.title)}</h2><p>${p.candidateIds.length} candidates · ${esc(p.place||'Somewhere you want to be')}</p>${icon('arrow')}</a></article>`;}
function plansPage() { return wrap(`${pageHeading('MY WORLD / PLANS','For a day worth imagining.','An occasion, a sentence, a feeling. You can fill in the rest later.',btn('Start a plan','new-plan'))}<div class="plans-grid">${Object.values(world.plans).map(planCard).join('')||empty('What are you looking forward to?','A date, a weekend away, or your first dinner with friends. Start with one sentence.','#/','Find a moment')}</div>`); }
function planPage(id) {
  const p=world.plans[id];if(!p)return wrap(empty('This plan is not on this device.','Open a shared help-me-choose link to see a friend’s candidates.'));
  activePlan=id;remember('/plan/'+id,p.title);
  const candidates=p.candidateIds.map(x=>world.versions[x]).filter(Boolean);
  return wrap(`<h1 class="sr-only">${esc(p.title)}</h1><div class="compact-toolbar">${btn(p.archived?'Unarchive':'Archive plan','archive-plan',id,'','subtle')}</div>
    <div class="plan-tags">${[['date','Date','date'],['occasion','Occasion','text'],['place','Destination','text'],['budget','Budget · USD','number']].map(([key,label,type])=>`<label>${label}<input type="${type}" data-plan-field="${key}" data-id="${id}" value="${esc(p[key]||'')}" placeholder="Add ${label.toLowerCase()}" ${type==='number'?'min="0" max="100000"':'maxlength="100"'}></label>`).join('')}</div>
    ${notice(`Delivery ${p.place?'to '+esc(p.place):'to your destination'} is not confirmed for the current collection.${p.date?' Arrival by '+esc(p.date)+' cannot be guaranteed.':''} Keep your candidates, or choose alternatives.`)}
    <div class="section-title"><h2>Your candidates</h2><div class="life-actions">${btn('Add saved versions','plan-candidates',id,'','subtle')}${btn('Ask a friend','share-plan',id,candidates.length<2?'disabled':'')}</div></div>
    <div class="version-grid">${candidates.map((v,i)=>`<article>${miniBoard(v)}<h3>${String.fromCharCode(65+i)} · ${esc(v.title)}</h3><p>${storeMoney(J.total(v,catalog))} in selected new pieces</p><div class="life-actions">${btn('Edit a copy','version-copy',v.id,'','subtle')}${btn('Remove from plan','remove-candidate',v.id,`data-plan="${id}"`,'quiet')}</div></article>`).join('')||empty('Your first ideas go here.','Save versions in Make it mine, then add them to this plan.','#/wardrobe','Open wardrobe')}</div>
    <section class="life-section"><div class="section-title"><h2>Saved inspiration</h2>${btn('Add inspiration','plan-inspiration',id,'','subtle')}</div><div class="saved-grid">${(p.inspirationKeys||[]).map(k=>world.saved.find(x=>x.key===k)).filter(Boolean).map(x=>savedCard({...x,planId:id})).join('')||'<p>No details saved to this plan yet.</p>'}</div></section>
    <section class="life-section"><h2>Friend feedback</h2><p>Each link keeps the exact candidate versions you shared.</p>${(p.shares||[]).map(s=>`<div class="share-record"><a href="#/choose/${s.id}">${esc(s.question)} ${icon('arrow')}</a>${btn('Refresh results','share-results',s.id,'','subtle')}<div id="results-${s.id}"></div></div>`).join('')||'<p>Choose at least two versions, then ask a friend.</p>'}</section>`);
}
function accountPage(){return wrap(`${pageHeading('YOUR ACCOUNT','The care continues.','Orders, thoughtful details, and support for the things you keep.')}<div class="account-grid">${[['Orders','Order history and account sync are not connected yet.'],['Care & accessories','Open an owned piece in Wardrobe to keep its care information together.'],['Return & recycle','DIGO order matching, confirmed eligibility, shipping costs and inspection-based estimates must be connected before requests can be submitted.']].map(([title,text])=>`<section><h2>${title}</h2><p>${text}</p><span class="demo-label">Connection pending</span></section>`).join('')}</div><a class="life-btn subtle" href="#/wardrobe">Open your wardrobe ${icon('arrow')}</a><section class="life-section"><h2>Your device, your choices.</h2><p>No account is required to browse, save or prepare a plan. Cross-device sync is not available yet.</p>${btn('Clear browsing history','clear-recent','','','subtle')}</section>`);}
function render(scroll=true) {
  const parts=route().split('/').filter(Boolean);let content;
  if(parts[0]==='scene')content=scenePage(parts[1]);else if(parts[0]==='edit')content=editPage(parts[1]);else if(['world','wardrobe','recent','interests'].includes(parts[0])){if(parts[0]==='recent')wardrobeFilter='Recently viewed';if(parts[0]==='interests')wardrobeFilter='Moments';content=wardrobePage();}
  else if(['style','taste'].includes(parts[0]))content=stylePage();else if(parts[0]==='plans')content=plansPage();else if(parts[0]==='plan')content=planPage(parts[1]);else if(parts[0]==='account')content=accountPage();else if(parts[0]==='choose'){content=wrap('<div class="life-empty" role="status">Loading your friend’s question…</div>');loadChoice(parts[1]);}
  else if(parts[0]==='product'){content=discoverPage();if(catalogStatus!=='loading')queueMicrotask(()=>showProduct(parts[1],getProduct(parts[1])?'concept':'catalog',new URLSearchParams(location.search).get('scene')));}
  else if(parts[0]==='references'){content=wrap(`<div class="life-product-grid reference-collection">${referenceProducts.map(referenceCard).join('')}</div>`);} else if(parts[0]==='search'){content=discoverPage();queueMicrotask(()=>searchModal());}else if(parts[0]==='shop'){location.assign('/shop');return;}else content=discoverPage();
  $('#app').innerHTML=content;document.body.classList.remove('feed-mode');document.title='DIGO — A life that feels like you';if(typeof mountJourneyGestures==='function')mountJourneyGestures();if(typeof mountSceneHotspots==='function')mountSceneHotspots();if(scroll)window.scrollTo(0,0);
}
function trackProduct(id,type,sceneId) {
  const p=type==='concept'?getProduct(id):productFor(id);if(!p)return;
  world.recent=[{kind:'product',id,type,sceneId,snapshot:type==='catalog'?p:undefined,at:Date.now()},...world.recent.filter(x=>x.id!==id)].slice(0,60);
  writeWorld();
}
function showProduct(id,type='catalog',sceneId=null) {
  const p=type==='concept'?getProduct(id):productFor(id);if(!p){const saved=[...world.saved,...world.recent,...Object.values(world.boards).flatMap(b=>b.items)].find(x=>x.id===id&&x.snapshot)?.snapshot;overlay(`${saved?`<div class="unavailable-art">${productArt(saved)}</div><p class="eyebrow">${esc(brandFor(saved))}</p>`:''}<h2>${esc(saved?.name||'This piece is currently unavailable.')}</h2><p>This original selection is unavailable. It has not been replaced. ${saved?'Last saved price: '+storeMoney(saved.price_cents)+'.':''}</p>${sceneId?`<a class="text-btn" href="#/scene/${esc(sceneId)}">Back to the original moment</a>`:''}${btn('Browse alternatives','search','','','subtle')}`,'Product unavailable');return;}id=p.id;
  currentProduct={id,type,sceneId};if(sceneId)remember('/scene/'+sceneId,sceneFor(sceneId)?.title||'Your last moment');trackProduct(id,type,sceneId);
  if(p.reference){showReferenceProduct(p,sceneId);return;}
  const concept=type==='concept';
  const options=world.options[id]||{kind:'retail',plan:'refundable'};
  const canReserve=!concept&&p.reserve_price_cents>0&&p.reserve_price_cents<p.price_cents;
  const due=options.kind==='reservation'&&canReserve?p.reserve_price_cents:p.price_cents;
  overlay(`<div class="life-product-detail"><div class="product-detail-art">${productArt(p,type)}</div><div><p class="eyebrow">${concept?'CONCEPT PIECE':esc(brandFor(p))}</p><h2>${esc(p.name)}</h2><p>${esc(p.material)}</p>${concept?'<span class="demo-label">Scene illustration · not available to order</span>':`<p class="detail-price">${storeMoney(p.price_cents,p.currency)} <small>Full product price</small></p>${notice('Stock, colour availability and delivery are not confirmed.')}<dl><div><dt>Specification</dt><dd>${esc(p.dimensions||'Not supplied')}</dd></div><div><dt>Colour</dt><dd>To be confirmed</dd></div><div><dt>Style</dt><dd>${esc(p.style_code||'Not supplied')}</dd></div></dl>`}
    <div class="life-actions">${btn('Save to wardrobe','save-product',id,`data-type="${type}"`,'subtle')}${btn('Add to combination','add-to-board',id,`data-type="${type}"`,'subtle')}</div>
    ${concept?`<p>${esc(p.story)}</p>${btn('Explore related catalog pieces','related',id,'','subtle')}`:`<label class="field">Purchase option<select data-change-life="purchase-kind" data-id="${id}"><option value="retail" ${options.kind==='retail'?'selected':''}>Pay in full</option>${canReserve?`<option value="reservation" ${options.kind==='reservation'?'selected':''}>Reserve with a deposit</option>`:''}</select></label>${canReserve&&options.kind==='reservation'?`<label class="field">Deposit option<select data-change-life="reserve-plan" data-id="${id}"><option value="refundable" ${options.plan==='refundable'?'selected':''}>Refundable reservation</option><option value="committed" ${options.plan==='committed'?'selected':''}>Non-refundable reservation</option></select></label>`:''}<div class="detail-totals"><span>Due now <strong>${storeMoney(due)}</strong></span><span>Balance later <strong>${storeMoney(p.price_cents-due)}</strong></span><small>Shipping & tax unconfirmed · Delivery unconfirmed</small></div>${btn('Add to bag · '+storeMoney(due),'add-real',id)}<p class="life-small">Payment setup is pending. Adding to bag does not place an order.</p>`}
    ${sceneId?`<a class="text-btn" href="#/scene/${esc(sceneId)}">From your original moment ${icon('arrow')}</a>`:''}
    <details class="product-more"><summary>Material, size & care</summary><p>${esc(p.description||p.story||'Details are being prepared.')}</p><p>Material video, model measurements and verified care instructions have not been supplied.</p></details><details class="product-more"><summary>Delivery & services</summary><p>Estimated arrival is not confirmed. Gift packaging, scent, tracking accessories, swatches and spare buttons are only included when confirmed for this exact item.</p><p>Returns and recycling will be linked to a confirmed DIGO order. No buyback value is promised at this stage.</p></details>${!concept?`<a class="text-btn" href="/products/${encodeURIComponent(p.slug)}${sceneId?'?scene='+encodeURIComponent(sceneId):''}">Full product page ${icon('arrow')}</a>`:''}</div></div>`,'Product details');
  $('.modal')?.classList.add('product-sheet');
}
function addReal(id,quiet=false) {
  const p=productFor(id);if(!p||!p.active){toast('This piece is unavailable. Your selection is unchanged.');return false;}
  const o=world.options[id]||{kind:'retail',plan:'refundable'},items=storeCartItems();
  const kind=o.kind==='reservation'&&p.reserve_price_cents>0?'reservation':'retail';
  const match=items.find(x=>x.product.id===id&&x.kind===kind&&(kind==='retail'||x.reservationPlan===o.plan));
  if(match)match.quantity=Math.min(99,match.quantity+1);else{if(items.length>=20){toast('Your bag has reached 20 selections.');return false;}items.push({product:p,quantity:1,kind,...(kind==='reservation'?{reservationPlan:o.plan}: {})});}
  try{sessionStorage.setItem('digo-cart-v3',JSON.stringify(items));}catch{toast('Could not update your bag. Please retry.');return false;}
  if(!quiet){closeOverlay();render(false);bagModal();}return true;
}
function bagModal() {const items=storeCartItems(),full=items.reduce((n,x)=>n+x.product.price_cents*x.quantity,0),due=items.reduce((n,x)=>n+(x.kind==='reservation'?x.product.reserve_price_cents:x.product.price_cents)*x.quantity,0);
  overlay(`<div class="drawer-head"><h2>A little of your world.</h2><button class="icon-btn" data-action="close" aria-label="Close bag">${icon('close')}</button></div><div class="drawer-body">${items.length?items.map((x,i)=>`<article class="bag-line"><div><p class="eyebrow">${esc(brandFor(x.product))}</p><h3>${esc(x.product.name)}</h3><p>${x.kind==='reservation'?'Deposit · '+x.reservationPlan:'Pay in full'} · Qty ${x.quantity}</p><strong>${storeMoney((x.kind==='reservation'?x.product.reserve_price_cents:x.product.price_cents)*x.quantity)}</strong></div>${btn('Remove one','bag-remove',String(i),'','quiet')}</article>`).join(''):empty('Your bag is waiting.','Save a little, try a combination, or go straight to a piece.','/shop','Browse all pieces')}${items.length?`<div class="detail-totals"><span>Full product total <strong>${storeMoney(full)}</strong></span><span>Due now <strong>${storeMoney(due)}</strong></span><span>Balance later <strong>${storeMoney(full-due)}</strong></span><small>Shipping, tax and delivery unconfirmed</small></div><details class="product-more"><summary>Gift details & what is included</summary><p>Standard packaging, no scent selected. Gift boxes, scent carriers, tracker compatibility, swatches and spare buttons are not yet confirmed for these styles.</p><a href="/checkout">Review options at checkout →</a></details>${notice('Payments are being set up. Your bag is saved for this browser session.')}`:''}</div>${items.length?'<div class="drawer-foot"><a class="life-btn" href="/checkout">Review checkout →</a></div>':''}`,'drawer');}
function searchModal(query='') {
  overlay(`<p class="eyebrow">FIND YOUR NEXT LITTLE THING</p><h2>A piece, a place, a feeling.</h2><label class="search-box">${icon('search')}<input id="life-search" type="search" placeholder="Product, brand, moment or feeling…" value="${esc(query)}" aria-label="Search products, brands, moments and styles"></label><a class="text-btn" href="#/references">Browse demo pieces ${icon('arrow')}</a><div id="life-search-results"></div>`,'Search');searchPaint(query);
}
function searchPaint(q) {
  const target=$('#life-search-results');if(!target)return;const lower=q.toLowerCase().trim();
  const tokens=lower.split(/\s+/).filter(x=>x.length>2&&!['but','and','the'].includes(x));
  const matches=s=>!lower||(tokens.length?tokens:[lower]).some(t=>s.toLowerCase().includes(t));
  const scenes=baseScenes.filter(s=>matches(s.title+' '+s.tags+' '+s.subtitle));
  const refs=referenceProducts.filter(p=>matches([p.name,p.material,p.category,p.brand].join(' ')));
  const ps=catalog.filter(p=>matches([p.name,p.material,p.category,p.brand,p.style_code].join(' '))).slice(0,12);
  target.innerHTML=`${scenes.length?`<h3>Moments & feelings</h3>${scenes.map(s=>`<a class="search-result" href="#/scene/${s.id}"><img src="${s.image}" alt=""><span><strong>${esc(moments[s.id]?.[0]||s.title)}</strong><small>${esc(s.subtitle)}</small></span>${icon('arrow')}</a>`).join('')}`:''}<h3>Demo references</h3><div class="life-product-grid">${refs.map(referenceCard).join('')||'<p>No matching references.</p>'}</div><h3>Current collection</h3>${catalogStatus==='loading'?'<p>Loading…</p>':ps.map(p=>`<button class="search-result" data-life="product" data-type="catalog" data-id="${esc(p.id)}"><div class="search-art">${productArt(p)}</div><span><strong>${esc(p.name)}</strong><small>${esc(brandFor(p))} · ${storeMoney(p.price_cents)}</small></span>${icon('arrow')}</button>`).join('')||(catalog.length?'<p>No matching pieces.</p>':'<p>New pieces, soon.</p>')}`;
}
function changeBoard(action) {if(!currentBoard)return;world.boards[currentBoard]=J.change(getBoard(currentBoard),action);writeWorld();render(false);}
function swapModal(key) {
  const b=getBoard(currentBoard),item=b.items.find(i=>i.key===key);if(item?.locked){toast('This piece is kept. Unlock it before replacing.');return;}
  overlay(`<p class="eyebrow">${key?'REPLACE ONE PIECE':'ADD A PIECE'}</p><h2>${key?'The rest stays yours.':'A little something more.'}</h2><p>${key?'Choose a replacement. Kept pieces, other selections and your budget stay unchanged.':'Choose a piece for your combination.'}</p><div class="swap-options">${catalog.length?'<h3>Current catalog · related pieces</h3>':''}${catalog.slice(0,24).map(p=>`<button class="swap-option" data-life="swap-choose" data-id="${esc(p.id)}" data-type="catalog" data-key="${esc(key)}"><div>${productArt(p)}</div><span>${esc(p.name)}<small>${esc(brandFor(p))} · ${storeMoney(p.price_cents)}</small></span>${icon('plus')}</button>`).join('')}<h3>Brand references · demo</h3>${referenceProducts.map(p=>`<button class="swap-option" data-life="swap-choose" data-id="${p.id}" data-type="concept" data-key="${esc(key)}"><div>${productPhoto(p)}</div><span>${esc(p.name)}<small>${esc(p.brand)} · Demo reference</small></span>${icon('plus')}</button>`).join('')}</div>`,'Choose a piece');
}
function saveVersion() {const b=getBoard(currentBoard);if(!b.items.length){toast('Add a piece before saving a version.');return;}const id=newId();world=J.saveVersion(world,currentBoard,id);if(writeWorld()){render(false);toast('Version saved. It is ready for your wardrobe and plans.');}return id;}
function newPlanModal(sceneId,versionId=null) {pendingPlanContext={sceneId:sceneFor(sceneId)?.id||null,versionId};overlay(`<p class="eyebrow">FOR THAT DAY</p><h2>What are you looking forward to?</h2><label class="field">Start with a sentence<textarea id="plan-sentence" maxlength="160" placeholder="Next Saturday, tennis. Relaxed, but a little dressed up."></textarea></label><p class="life-small">Save now. Date, place and budget can be added when you know them.</p>${btn('Save my plan','create-plan',sceneId||'')}`,'Start a plan');}
function choosePlanModal(versionId) {
  overlay(`<h2>Keep it for that day.</h2><p>This plan will reference the same saved version.</p>${Object.values(world.plans).filter(p=>!p.archived).map(p=>btn(p.title,'attach-version',versionId,`data-plan="${p.id}"`,'subtle')).join('')||'<p>Create a plan first. Your version is safely in Wardrobe.</p>'}${btn('Start a plan with this version','new-plan-version',versionId,'','subtle')}`,'Add to plan');
}
function candidateModal(planId) {const p=world.plans[planId];overlay(`<h2>Your ideas, side by side.</h2><p>Choose saved versions to add. Existing choices stay in this plan.</p><div class="version-grid">${Object.values(world.versions).map(v=>`<article>${miniBoard(v)}<h3>${esc(v.title)}</h3>${btn(p.candidateIds.includes(v.id)?'Already added':'Add candidate','attach-version',v.id,`data-plan="${planId}" ${p.candidateIds.includes(v.id)?'disabled':''}`,'subtle')}</article>`).join('')||'<p>Save a version in Make it mine first.</p>'}</div>`,'Choose candidates');}
let circleDraft=null;
function circleModal(id,existing=null) {
  const s=sceneFor(id);if(!s)return;
  circleDraft=existing?J.copy(existing):{id:newId(),sceneId:id,title:s.title,points:[],at:Date.now(),time:0,aspect:1.5};
  overlay(`<p class="eyebrow">A DETAIL WORTH KEEPING</p><h2>Circle what you love.</h2><p>Draw around, or drag across, a colour, a texture, or a corner of the room. This mode keeps drawing separate from scrolling.</p><svg id="circle-canvas" viewBox="0 0 1000 667" role="img" aria-label="Draw on ${esc(s.title)}" style="aspect-ratio:1.5"><image href="${esc(s.image)}" width="1000" height="667" preserveAspectRatio="xMidYMid slice"/><polygon id="circle-path" points="${circleDraft.points.map(p=>p.join(',')).join(' ')}"/></svg><div class="life-actions">${btn('Undo circle','circle-reset','','','subtle')}${btn('Save this detail','circle-save')}${btn('View scene pieces','scene-pieces',id,'','subtle')}</div><p class="life-small">Saved as inspiration. Automatic product recognition is not connected; a circle does not change your style preferences.</p>`,'Circle a detail');
}
function circlePreview(x) {const s=sceneFor(x.sceneId);return s?`<svg viewBox="0 0 1000 667" role="img" aria-label="Circled detail from ${esc(s.title)}"><image href="${esc(s.image)}" width="1000" height="667" preserveAspectRatio="xMidYMid slice"/><polygon points="${x.points.map(p=>p.join(',')).join(' ')}"/></svg>`:'';}
let drawing=false;
document.addEventListener('pointerdown',e=>{const svg=e.target.closest('#circle-canvas');if(!svg)return;e.preventDefault();drawing=true;circleDraft.points=[];svg.setPointerCapture(e.pointerId);const r=svg.getBoundingClientRect();circleDraft.points.push([(e.clientX-r.left)/r.width*1000,(e.clientY-r.top)/r.height*667]);});
document.addEventListener('pointermove',e=>{if(!drawing||!circleDraft)return;const svg=$('#circle-canvas');if(!svg)return;e.preventDefault();const r=svg.getBoundingClientRect();if(circleDraft.points.length<400)circleDraft.points.push([Math.max(0,Math.min(1000,(e.clientX-r.left)/r.width*1000)),Math.max(0,Math.min(667,(e.clientY-r.top)/r.height*667))]);$('#circle-path').setAttribute('points',circleDraft.points.map(p=>p.join(',')).join(' '));});
document.addEventListener('pointerup',()=>{
  if(drawing&&circleDraft?.points.length>3){
    const pts=circleDraft.points;let area=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];area+=a[0]*b[1]-b[0]*a[1];}
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;
    if(width>20&&height>20&&Math.abs(area)/2<width*height*.1){circleDraft.points=Array.from({length:48},(_,i)=>[left+width/2+Math.cos(i*Math.PI/24)*width/2,top+height/2+Math.sin(i*Math.PI/24)*height/2]);$('#circle-path')?.setAttribute('points',circleDraft.points.map(p=>p.join(',')).join(' '));}
  }drawing=false;
});document.addEventListener('pointercancel',()=>{drawing=false;});
let shareDraft=null, activeChoice=null;
async function responseData(response) {
  try { return await response.json(); }
  catch { throw Error('This service is unavailable right now. Your choices are kept. Please try again.'); }
}
function shareModal(ids,planId=null) {
  const candidates=ids.map(id=>world.versions[id]).filter(Boolean);
  shareDraft={ids:candidates.slice(0,4).map(c=>c.id),planId};
  overlay(`<p class="eyebrow">A SECOND PAIR OF EYES</p><h2>Which one feels like me?</h2><label class="field">Ask a specific question<input id="share-question" maxlength="180" value="Which one feels more like me?"></label><p>Choose 2–4 saved versions. Only this question and the selected combination boards will be shared.</p><div class="version-grid">${candidates.map((v,i)=>`<label class="share-candidate"><input type="checkbox" name="share-version" value="${v.id}" ${i<4?'checked':''}> <strong>${String.fromCharCode(65+i)}</strong>${miniBoard(v)}<span>${esc(v.title)}</span></label>`).join('')}</div>${btn('Preview share card','share-preview')}<p class="life-small">No plan dates, destination, budget or wardrobe history are shared. Links expire after 30 days and can be disabled from this device.</p>`,'Ask a friend');
}
function sharedCandidate(v) {return {id:v.id,title:v.title,items:v.items.map(i=>{const p=itemInfo(i);return {id:i.id,name:p.name,brand:itemBrand(i),type:i.type,owned:!!i.owned,image:p.reference?p.image:i.type==='catalog'?safeImage(p.image_url)||null:null,tile:i.type==='concept'&&!p.reference?p.tile:null};})};}
function sharedArt(i) {return i.type==='concept'&&Number.isInteger(i.tile)?productPhoto({name:i.name,tile:i.tile}):i.image?`<img src="${esc(i.image)}" alt="${esc(i.name)}">`:`<div class="own-art">${icon(i.owned?'shirt':'bag')}<span>${esc(i.name)}</span></div>`;}
function sharedBoard(c) {return `<div class="shared-board">${c.items.map(i=>`<div><div>${sharedArt(i)}</div><strong>${esc(i.name)}</strong><small>${esc(i.brand)}${i.owned?' · Already owned':''}</small></div>`).join('')}</div>`;}
function previewShare() {
  const ids=[...document.querySelectorAll('[name="share-version"]:checked')].map(e=>e.value),question=$('#share-question').value.trim();
  if(ids.length<2||ids.length>4||!question){toast('Choose 2–4 versions and add a short question.');return;}
  shareDraft={...shareDraft,ids,question,candidates:ids.map(id=>sharedCandidate(world.versions[id]))};
  overlay(`<p class="eyebrow">SHARE PREVIEW</p><h2>${esc(question)}</h2><div class="version-grid">${shareDraft.candidates.map((c,i)=>`<article><h3>${String.fromCharCode(65+i)}</h3>${sharedBoard(c)}</article>`).join('')}</div><p>This is exactly what friends will see. They can view and vote without an account.</p><div class="life-actions">${btn('Create help-me-choose link','share-create')}${btn('Save comparison image','share-draft-image','','','subtle')}</div><div id="share-create-error" role="alert"></div><p class="life-small">For Instagram and Xiaohongshu, save the comparison card and use a link where the platform supports it. For WeChat, copy the link or share the image; a rich link card is not guaranteed.</p>`,'Preview sharing');
}
async function createShare() {
  if(sharingBusy)return;sharingBusy=true;const button=$('[data-life="share-create"]');if(button){button.disabled=true;button.textContent='Creating your link…';}
  try{const r=await fetch('/api/choose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:shareDraft.question,candidates:shareDraft.candidates})}),data=await responseData(r);if(!r.ok)throw Error(data.error);
    const record={id:data.id,ownerToken:data.ownerToken,question:shareDraft.question,ids:shareDraft.ids,at:Date.now(),planId:shareDraft.planId};world.shares=world.shares||{};world.shares[data.id]=record;
    if(shareDraft.planId)world.plans[shareDraft.planId].shares.push({id:data.id,question:shareDraft.question});
    if(!writeWorld()) { $('#share-create-error').textContent='The link was created, but its management key could not be saved. Retry saving before you share.';return;}
    navigate('/choose/'+data.id);
  }catch(e){if($('#share-create-error'))$('#share-create-error').textContent=e.message||'Your link was not created. Your candidates are safe. Retry.';}finally{sharingBusy=false;if(button?.isConnected){button.disabled=false;button.textContent='Create help-me-choose link';}}
}
async function loadChoice(id) {
  try{const r=await fetch('/api/choose/'+encodeURIComponent(id),{cache:'no-store'}),data=await responseData(r);if(route()!=='/choose/'+id)return;if(!r.ok)throw Error(data.error);activeChoice={...data,id};paintChoice();}
  catch(e){if(route()==='/choose/'+id)$('#app').innerHTML=wrap(`${pageHeading('HELP A FRIEND CHOOSE','A moment, please.',esc(e.message))}${btn('Try again','choice-retry',id)}`);}
}
function paintChoice() {
  const c=activeChoice,owner=world.shares?.[c.id];
  if(c.myVote)world.myVotes={...world.myVotes,[c.id]:c.myVote.candidateId};
  $('#app').innerHTML=wrap(`${pageHeading(owner?'YOUR HELP-ME-CHOOSE LINK':'A FRIEND WOULD LOVE YOUR THOUGHTS',esc(c.question),'Same candidates. A little outside perspective. No account needed.')}${c.ended?notice('Voting has ended. These are the original candidates and their feedback.'):''}<div class="choice-grid">${c.candidates.map((v,i)=>`<article><h2>${String.fromCharCode(65+i)} <small>${esc(v.title)}</small></h2>${sharedBoard(v)}${btn('View larger','enlarge-candidate',v.id,'','subtle')}<button class="life-btn ${world.myVotes?.[c.id]===v.id?'active':''}" data-life="vote" data-id="${v.id}" ${c.ended?'disabled':''}>${world.myVotes?.[c.id]===v.id?'Your choice ✓':'Choose '+String.fromCharCode(65+i)}</button><p>${c.votes.filter(x=>x.candidateId===v.id).length} votes</p></article>`).join('')}</div><label class="field vote-comment">A little thought, if you like<textarea id="vote-comment" maxlength="300" placeholder="I love the softer texture in B…" ${c.ended?'disabled':''}>${esc(c.myVote?.comment||'')}</textarea></label><p class="life-small">You can change your vote from this browser. Choose a candidate again to save a new comment.</p><div id="vote-status" role="status"></div><div class="feedback-list">${c.votes.filter(v=>v.comment).map(v=>`<p><strong>${String.fromCharCode(65+c.candidates.findIndex(x=>x.id===v.candidateId))}</strong> · ${esc(v.comment)}</p>`).join('')}</div><div class="life-actions">${btn('Refresh results','choice-retry',c.id,'','subtle')}${owner?`${btn('Copy link','copy-share',c.id)}${btn('Save share card','save-card',c.id,'','subtle')}${navigator.share?btn('Share…','system-share',c.id,'','subtle'):''}${btn('End voting','end-share',c.id,c.ended?'disabled':'','quiet')}${btn('Disable link','disable-share',c.id,'','quiet')}`:''}</div>${owner?.planId?`<a class="text-btn" href="#/plan/${owner.planId}">Back to your plan ${icon('arrow')}</a>`:owner?.ids?.[0]&&world.versions[owner.ids[0]]?`<a class="text-btn" href="#/edit/${world.versions[owner.ids[0]].boardId}">Back to your combination ${icon('arrow')}</a>`:''}<p class="life-small">Saved candidate versions are fixed. Create a new link after changing candidates.</p>`,'choice-page');
}
async function vote(id) {
  const message=$('#vote-comment').value,buttons=[...document.querySelectorAll('[data-life="vote"]')];buttons.forEach(b=>b.disabled=true);
  try{const r=await fetch('/api/choose/'+activeChoice.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({candidateId:id,comment:message})}),d=await responseData(r);if(!r.ok)throw Error(d.error);world.myVotes={...world.myVotes,[activeChoice.id]:id};writeWorld();await loadChoice(activeChoice.id);if($('#vote-status'))$('#vote-status').textContent='Your choice was saved. You can change your mind.';}
  catch(e){if($('#vote-status'))$('#vote-status').textContent=e.message;buttons.forEach(b=>b.disabled=false);}
}
async function manageShare(action,id) {try{const r=await fetch('/api/choose/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,ownerToken:world.shares[id].ownerToken})}),d=await responseData(r);if(!r.ok)throw Error(d.error);await loadChoice(id);}catch(e){toast(e.message);}}
async function shareResults(id) {const node=$('#results-'+id);if(!node)return;node.textContent='Loading…';try{const r=await fetch('/api/choose/'+id,{cache:'no-store'}),d=await responseData(r);if(!r.ok)throw Error(d.error);node.innerHTML=d.candidates.map((c,i)=>`<p>${String.fromCharCode(65+i)} · ${d.votes.filter(v=>v.candidateId===c.id).length} votes</p>`).join('')+(d.ended?'<p>Voting ended</p>':'');}catch(e){node.textContent=e.message;}}
async function saveCard(choice=activeChoice) {
  const c=choice,canvas=document.createElement('canvas');canvas.width=1200;const panelHeight=100+Math.max(...c.candidates.map(v=>Math.ceil(v.items.length/2)))*330;canvas.height=300+Math.ceil(c.candidates.length/2)*panelHeight;const ctx=canvas.getContext('2d');ctx.fillStyle='#f5f2eb';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#24333b';ctx.font='bold 36px Georgia';ctx.fillText('DIGO / A SECOND PAIR OF EYES',60,70);ctx.font='38px Georgia';
  function lines(text,x,y,width,lineHeight){let line='';for(const word of text.split(' ')){if(ctx.measureText(line+word+' ').width>width&&line){ctx.fillText(line,x,y);y+=lineHeight;line='';}line+=word+' ';}ctx.fillText(line,x,y);return y;}
  lines(c.question,60,135,1080,48);
  const sheet=new Image();sheet.src='/scene-experience/assets/products.webp';await sheet.decode().catch(()=>{});
  for(let n=0;n<c.candidates.length;n++){const v=c.candidates[n],x=60+(n%2)*570,y=240+Math.floor(n/2)*panelHeight;ctx.font='bold 34px Georgia';ctx.fillText(String.fromCharCode(65+n),x,y);for(let j=0;j<v.items.length;j++){const i=v.items[j],px=x+(j%2)*255,py=y+30+Math.floor(j/2)*330;ctx.fillStyle='#e7e4dc';ctx.fillRect(px,py,235,210);if(i.type==='concept'&&sheet.complete&&sheet.naturalWidth&&i.tile!==null){const sw=sheet.naturalWidth/3,sh=sheet.naturalHeight/2;ctx.drawImage(sheet,(i.tile%3)*sw,Math.floor(i.tile/3)*sh,sw,sh,px,py,235,210);}else if(i.image){try{const pic=new Image();pic.crossOrigin='anonymous';pic.src=i.image;await pic.decode();const scale=Math.min(235/pic.width,210/pic.height);ctx.drawImage(pic,px+(235-pic.width*scale)/2,py+(210-pic.height*scale)/2,pic.width*scale,pic.height*scale);}catch{ctx.fillStyle='#24333b';ctx.font='16px Arial';lines('Photo unavailable in export',px+14,py+100,205,25);}}else{ctx.fillStyle='#24333b';ctx.font='21px Georgia';lines(i.owned?'Already yours':'Product image pending',px+14,py+100,205,28);}ctx.fillStyle='#24333b';ctx.font='22px Georgia';lines(i.name,px,py+240,235,26);ctx.font='14px Arial';lines(i.brand,px,py+289,235,18);}}
  ctx.fillStyle='#24333b';ctx.font='20px Arial';ctx.fillText('DIGO / Help me choose. Demo references are not sold by DIGO.',60,canvas.height-35);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob){toast('Could not create the image. Please retry.');return;}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='DIGO-help-me-choose.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
}
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-life]');if(!el)return;e.preventDefault();const a=el.dataset.life,id=el.dataset.id,type=el.dataset.type||'catalog';
  if(a==='resume'){const r={...world.resume};navigate(r.path);setTimeout(()=>window.scrollTo(0,r.scroll||0),100);}else if(a==='search')searchModal();else if(a==='style-search')searchModal(id);else if(a==='product')showProduct(id,type,el.dataset.scene||contextScene());else if(a==='bag')bagModal();
  else if(a==='retry-save'){if(writeWorld()){render(false);toast('Your choices are now saved.');}}
  else if(a==='reload-catalog')await loadCatalog(true);
  else if(a==='next-scene')activateFeedScene(id,Number(el.dataset.direction)||1);
  else if(a==='refine-style')overlay(`<h2>Find your own balance.</h2><div class="life-actions">${['Sweet but structured','Light utility','Relaxed tailoring','Natural texture'].map(s=>btn(s,'style-search',s,'','subtle')).join('')}</div>`,'Refine your style');
  else if(a==='save-scene'){saveRecord({kind:'scene',id,title:sceneFor(id).title});el.setAttribute('aria-pressed','true');}
  else if(a==='save-product'){const p=type==='concept'?getProduct(id):productFor(id);if(p)saveRecord({kind:'product',id,type,title:p.name,snapshot:type==='catalog'?p:undefined});}
  else if(a==='scene-pieces'){const s=sceneFor(id);if(s.reference){overlay(`<p class="eyebrow">${esc(s.brand)} <span class="reference-mini-label">Demo</span></p><div class="life-product-grid">${s.items.map(pid=>referenceCard(getProduct(pid))).join('')}</div>${btn('Prepare for a day','new-plan',id,'','subtle')}`,'Explore scene pieces');return;}overlay(`<h2>${esc(moments[id]?.[0]||s.title)}</h2><p>Concept pieces in the original image</p><div class="life-product-grid">${s.items.map(pid=>`<article><button class="life-art" data-life="product" data-id="${pid}" data-type="concept" data-scene="${id}">${productPhoto(getProduct(pid))}</button><h3>${esc(getProduct(pid).name)}</h3><small>Illustration · Not orderable</small></article>`).join('')}</div>${btn('Prepare for a day','new-plan',id,'','subtle')}<h3>Related catalog accessories</h3><p>Different pieces with their own identities. These are not the same products shown in the scene.</p><div class="life-product-grid">${catalog.slice(0,4).map(p=>catalogCard(p,'',id)).join('')}</div>`,'Explore scene pieces');}
  else if(a==='related'){overlay(`<h2>Something with a similar feeling.</h2><p>Related catalog accessories. These are not the illustrated piece.</p><div class="life-product-grid">${catalog.slice(0,8).map(p=>catalogCard(p,'',currentProduct?.sceneId||contextScene())).join('')}</div>`,'Related pieces');}
  else if(a==='add-to-board'){const p=type==='concept'?getProduct(id):productFor(id);const boardId=(route().startsWith('/edit/')?route().split('/')[2]:null)||currentProduct?.sceneId||'pieces-'+id;const b=getBoard(boardId);if(!b.items.some(i=>i.id===id&&i.type===type))world.boards[boardId]=J.change(b,{type:'add',item:{key:newId(),id,type,owned:false,locked:false,selected:true,snapshot:type==='catalog'?p:undefined}});writeWorld();navigate('/edit/'+boardId);}
  else if(a==='add-real')addReal(id);
  else if(a==='bag-remove'){const items=storeCartItems(),item=items[Number(id)];if(item){item.quantity--;try{sessionStorage.setItem('digo-cart-v3',JSON.stringify(items.filter(x=>x.quantity>0)));bagModal();}catch{toast('Could not update your bag. Please retry.');}}}
  else if(a==='board-lock')changeBoard({type:'toggle',key:id,field:'locked'});
  else if(a==='board-own'){
    const item=getBoard(currentBoard).items.find(i=>i.key===id);
    if(!item.owned&&!world.owned.some(x=>x.sourceKey===id)){const p=itemInfo(item);world.owned.push({key:newId(),id:newId(),sourceKey:id,name:'My '+p.name.replace(/^The /,''),brand:'Added by you',category:p.category==='Home'?'Home':'Clothing',type:'own',owned:true});}
    changeBoard({type:'toggle',key:id,field:'owned'});
  }
  else if(a==='board-remove')changeBoard({type:'remove',key:id});
  else if(a==='board-undo')changeBoard({type:'undo'});else if(a==='board-redo')changeBoard({type:'redo'});
  else if(a==='swap')swapModal(id);
  else if(a==='swap-choose'){const p=type==='catalog'?productFor(id):getProduct(id),key=el.dataset.key;changeBoard({type:key?'replace':'add',key,item:{key:newId(),id,type,owned:false,locked:false,selected:true,snapshot:type==='catalog'?p:undefined}});closeOverlay();}
  else if(a==='own-modal')overlay(`<h2>Bring something of your own.</h2><label class="field">Item name<input id="own-name" maxlength="100" placeholder="My navy coat"></label><label class="field">Brand, if known<input id="own-brand" maxlength="100" placeholder="Optional"></label><label class="field">Category<select id="own-category"><option>Clothing</option><option>Home</option></select></label>${btn('Use this item','own-save')}`,'Use my own');
  else if(a==='own-save'){const name=$('#own-name').value.trim();if(!name){toast('Give your piece a name.');return;}const item={key:newId(),id:newId(),name,brand:$('#own-brand').value.trim(),category:$('#own-category').value,type:'own',owned:true,locked:true,selected:false};world.owned.push(item);changeBoard({type:'add',item});closeOverlay();}
  else if(a==='version')saveVersion();
  else if(a==='version-copy'){const v=world.versions[id],copyId='copy-'+newId();world.boards[copyId]={...J.copy(v),id:copyId,title:v.title+' · new version',history:[],future:[]};writeWorld();navigate('/edit/'+copyId);}
  else if(a==='buy-board'){let count=0;for(const item of getBoard(currentBoard).items)if(item.type==='catalog'&&!item.owned&&item.selected!==false)if(addReal(item.id,true))count++;if(count){render(false);bagModal();}else toast('Choose a catalog piece to buy. Concept and owned pieces are not charged.');}
  else if(a==='wardrobe-filter'){wardrobeFilter=id;groupFilter='';render(false);}
  else if(a==='wardrobe-status'){wardrobeStatus=id;render(false);}
  else if(a==='group-filter'){groupFilter=id;render(false);}
  else if(a==='new-group')overlay(`<h2>A space for your next idea.</h2><label class="field">Collection name<input id="group-name" maxlength="80" placeholder="A weekend by the sea"></label>${btn('Create collection','group-create')}`,'New collection');
  else if(a==='group-create'){const name=$('#group-name').value.trim();if(!name){toast('Name your collection.');return;}if(!world.groups.includes(name))world.groups.push(name);writeWorld();closeOverlay();render(false);}
  else if(a==='unsave'){const x=world.saved.find(x=>x.key===id);if(x&&(x.orderIds?.length||x.testOrderIds?.length)){x.savedManually=false;toast('Removed from Saved. Your purchase stays in Purchased.');}else world.saved=world.saved.filter(x=>x.key!==id);writeWorld();closeOverlay();render(false);}
  else if(a==='clear-recent'){world.recent=[];try{const old=JSON.parse(localStorage.getItem('digo-world-v1')||'{}');old.viewedProducts=[];localStorage.setItem('digo-world-v1',JSON.stringify(old));}catch{}writeWorld();render(false);toast('Browsing history cleared. Your saved pieces remain.');}
  else if(a==='new-plan')newPlanModal(id);
  else if(a==='new-plan-version')newPlanModal(world.versions[id]?.sceneId,id);
  else if(a==='create-plan'){const title=$('#plan-sentence').value.trim();if(!title){toast('Start with a sentence.');return;}const pid=newId(),source=sceneFor(pendingPlanContext.sceneId);if(source)saveRecord({kind:'scene',id:source.id,title:source.title});world.plans[pid]=J.createPlan(pid,title,{versionId:pendingPlanContext.versionId,inspirationKey:source?'scene:'+source.id:null});pendingPlanContext={};writeWorld();navigate('/plan/'+pid);}
  else if(a==='archive-plan'){world.plans[id].archived=!world.plans[id].archived;writeWorld();render(false);}
  else if(a==='plan-add-board'){const vid=saveVersion();if(vid)choosePlanModal(vid);}
  else if(a==='version-plan')choosePlanModal(id);
  else if(a==='attach-version'){const planId=el.dataset.plan,p=world.plans[planId];if(!p.candidateIds.includes(id))p.candidateIds.push(id);writeWorld();closeOverlay();navigate('/plan/'+planId);}
  else if(a==='plan-candidates')candidateModal(id);
  else if(a==='remove-candidate'){const p=world.plans[el.dataset.plan];p.candidateIds=p.candidateIds.filter(x=>x!==id);writeWorld();render(false);}
  else if(a==='remove-inspiration'){const p=world.plans[el.dataset.plan];p.inspirationKeys=p.inspirationKeys.filter(k=>k!==id);writeWorld();render(false);}
  else if(a==='plan-inspiration'){overlay(`<h2>Keep a little inspiration here.</h2><div class="saved-grid">${world.saved.filter(x=>['scene','inspiration'].includes(x.kind)).map(x=>`<article>${x.kind==='scene'?`<img class="saved-cover" src="${sceneFor(x.id).image}" alt="">`:circlePreview(x)}<h3>${esc(x.title)}</h3>${btn('Add to plan','attach-inspiration',x.key,`data-plan="${id}"`,'subtle')}</article>`).join('')||'<p>Save a moment or circle a detail first.</p>'}</div>`,'Plan inspiration');}
  else if(a==='attach-inspiration'){const p=world.plans[el.dataset.plan];if(!p.inspirationKeys.includes(id))p.inspirationKeys.push(id);writeWorld();closeOverlay();render(false);}
  else if(a==='circle')circleModal(id);
  else if(a==='circle-reset'){circleDraft.points=[];$('#circle-path').setAttribute('points','');}
  else if(a==='circle-save'){if(circleDraft.points.length<4){toast('Circle a detail first.');return;}if(saveRecord({...circleDraft,kind:'inspiration'})){closeOverlay();render(false);}}
  else if(a==='view-inspiration'){const x=world.saved.find(x=>x.id===id);overlay(`<h2>Your little detail.</h2>${circlePreview(x)}<p>From ${esc(x.title)} · Original still</p><div class="life-actions">${btn('Adjust circle','circle-adjust',id,'','subtle')}${btn('Explore original pieces','scene-pieces',x.sceneId,'','subtle')}${btn('Find related pieces','related',x.sceneId,'','subtle')}</div>`,'Saved detail');}
  else if(a==='circle-adjust'){const x=world.saved.find(x=>x.id===id);circleModal(x.sceneId,x);}
  else if(a==='share-start')shareModal(Object.values(world.versions).filter(v=>v.boardId===id).map(v=>v.id));
  else if(a==='share-plan')shareModal(world.plans[id].candidateIds,id);
  else if(a==='share-preview')previewShare();else if(a==='share-create')await createShare();
  else if(a==='enlarge-candidate'){const candidate=activeChoice?.candidates.find(c=>c.id===id);if(candidate)overlay(`<h2>${esc(candidate.title)}</h2><div class="enlarged-candidate">${sharedBoard(candidate)}</div>`,'Candidate details');}
  else if(a==='choice-retry')await loadChoice(id);else if(a==='vote')await vote(id);else if(a==='share-results')await shareResults(id);
  else if(a==='copy-share'){try{await navigator.clipboard.writeText(location.origin+'/#/choose/'+id);toast('Link copied.');}catch{overlay(`<h2>Your share link</h2><label class="field">Copy this link<input readonly value="${esc(location.origin+'/#/choose/'+id)}"></label>`,'Copy link');}}
  else if(a==='system-share'){try{await navigator.share({title:'Help me choose · DIGO',text:activeChoice.question,url:location.origin+'/#/choose/'+id});}catch(e){if(e.name!=='AbortError')toast('Use Copy link or Save share card instead.');}}
  else if(a==='share-draft-image'){try{await saveCard(shareDraft);}catch{toast('Could not create the image. Please retry.');}}else if(a==='save-card'){try{await saveCard();}catch{toast('Could not create the share image. Please retry.');}}
  else if(a==='end-share')await manageShare('end',id);else if(a==='disable-share')await manageShare('disable',id);
  else if(a==='care')overlay(`<h2>A piece to keep.</h2><p>This was added as your own item. Follow its original care label.</p><details class="product-more"><summary>Care & replacement accessories</summary><p>Verified care guides, swatches and spare buttons have not been connected for this item.</p></details><details class="product-more"><summary>Return & recycle</summary><p>A confirmed DIGO order is required. Eligibility, shipping fees and inspection-based estimates will be shown before you apply. This service is not available yet.</p></details>`,'Care & services');
});
document.addEventListener('input',e=>{if(e.target.id==='life-search')searchPaint(e.target.value);});
document.addEventListener('change',e=>{
  const el=e.target,a=el.dataset.changeLife,id=el.dataset.id;
  if(el.dataset.boardField){const key=el.dataset.boardField;world.boards[currentBoard]=J.change(getBoard(currentBoard),{type:'preferences',value:{[key]:el.value}});writeWorld();if(key==='budget')render(false);}
  if(el.dataset.planField){world.plans[id][el.dataset.planField]=el.value;writeWorld();if(['date','place','budget'].includes(el.dataset.planField))render(false);}
  if(a==='group'){const x=world.saved.find(x=>x.key===id);if(x){x.group=el.value;writeWorld();}}
  if(a==='purchase-item')changeBoard({type:'toggle',key:id,field:'selected'});
  if(a==='purchase-kind'||a==='reserve-plan'){world.options[id]={kind:'retail',plan:'refundable',...world.options[id],[a==='purchase-kind'?'kind':'plan']:el.value};writeWorld();showProduct(id,'catalog',currentProduct?.sceneId);}
});
async function loadCatalog(repaint=false) {
  catalogStatus='loading';if(repaint)render(false);
  try{const r=await fetch('/api/catalog',{cache:'no-store'});if(!r.ok)throw Error();const d=await responseData(r);if(!Array.isArray(d.products))throw Error('Invalid catalog');catalog=d.products;catalogStatus='ready';
    const changes=[],seen=new Set();
    const tracked=[...world.saved.filter(x=>x.kind==='product'),...Object.values(world.boards).flatMap(b=>b.items),...Object.values(world.versions).flatMap(v=>v.items)];
    for(const x of tracked){if(x.type!=='catalog'||x.owned||seen.has(x.id))continue;seen.add(x.id);const p=productFor(x.id),name=x.title||x.snapshot?.name||'A saved piece';if(!p||!p.active)changes.push(name+' is currently unavailable. Your selection is kept.');else if(x.snapshot&&x.snapshot.price_cents!==p.price_cents)changes.push(p.name+' is now '+storeMoney(p.price_cents)+'. Your selection is kept.');}
    if(changes.length)world.catalogChanges=changes;else world.catalogChanges=[];
    writeWorld();
  }catch{catalogStatus='error';}
  if(!$('#overlay-root').innerHTML&&!document.activeElement?.matches('input,textarea,select'))render(false);
}
// Import only deliberate legacy saves. Browsing history is never converted to likes.
if(!world.migrated){for(const id of state.saved||[])if(sceneFor(id))world.saved.push({kind:'scene',id,key:'scene:'+id,title:sceneFor(id).title,at:Date.now(),status:'liked',group:''});for(const id of Object.keys(state.drafts||{}))getBoard(id);world.migrated=true;writeWorld();}
function importHistory(){try{const legacy=JSON.parse(localStorage.getItem('digo-world-v1')||'{}');for(const x of legacy.viewedProducts||[]){if(x.kind==='catalog'&&x.product&&!world.recent.some(y=>y.id===x.product.id))world.recent.push({id:x.product.id,type:'catalog',kind:'product',snapshot:x.product,at:x.at});}world.recent.sort((a,b)=>b.at-a.at);writeWorld();}catch{}}
window.addEventListener('pageshow',()=>{importWardrobeOrders();importHistory();if(catalogStatus!=='loading')loadCatalog();});
let scrollTimer;window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{if(world.resume&&world.resume.path===route()){world.resume.scroll=window.scrollY;writeWorld();}},400);},{passive:true});
const initialParams=new URLSearchParams(location.search);
if(!location.hash&&initialParams.get('scene')&&sceneFor(initialParams.get('scene')))location.hash='/scene/'+initialParams.get('scene');
importWardrobeOrders();closetSelection=world.closetSelection||'';importHistory();render();loadCatalog().then(()=>{const pid=initialParams.get('product');if(pid)showProduct(pid,getProduct(pid)?.reference?'concept':'catalog',initialParams.get('scene'));if(world.catalogChanges?.length)toast(world.catalogChanges.join(' '));});

window.addEventListener('storage',event=>{if(event.key===WORLD_KEY&&event.newValue){try{world=J.initial(JSON.parse(event.newValue));applyingRemoteState=true;try{if(!$('#overlay-root').innerHTML)render(false);}finally{applyingRemoteState=false;}}catch{}}});

window.addEventListener('focus',()=>{if(catalogStatus!=='loading')loadCatalog();});
