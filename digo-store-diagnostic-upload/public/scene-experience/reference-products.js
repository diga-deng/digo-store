/* Official product references for the visual demo. Never part of DIGO inventory. */
const archivedScenes = baseScenes.slice();
const referenceProducts = [
  {id:'ref-zara-linen-dress',brand:'ZARA',name:'Linen blend midi dress',color:'Light beige',sku:'7561/727/052',category:'Wear',material:'52% linen · 48% viscose',price:79.90,sourceUrl:'https://www.zara.com/us/en/linen-blend-midi-dress-p07561727.html',image:'/scene-experience/assets/zara-linen-dress.webp',gallery:['zara-linen-dress'],story:'A light linen blend with a straight neckline, narrow straps and side pockets.'},
  {id:'ref-zara-wool-cardigan',brand:'ZARA',name:'Textured wool blend cardigan',color:'Gray marl',sku:'2893/338/803',category:'Wear',material:'Textured wool blend',price:99.90,sourceUrl:'https://www.zara.com/us/en/textured-wool-blend-cardigan-p02893338.html',image:'/scene-experience/assets/zara-wool-cardigan.webp',gallery:['zara-wool-cardigan'],story:'A button-front knit with a round neckline and ribbed edges.'},
  {id:'ref-zarahome-wood-chair',brand:'ZARA HOME',name:'Wooden chair with backrest',color:'Natural',sku:'8331/073/052',category:'Home',material:'Elm wood',price:319,dimensions:'31.3 × 16.9 × 16.5 in · H × W × D',sourceUrl:'https://www.zarahome.com/us/wooden-chair-with-backrest-l48331073',image:'/scene-experience/assets/zarahome-chair-front.webp',gallery:['zarahome-chair-front','zarahome-chair-detail','zarahome-chair-scene'],story:'An elm-wood chair with a sculpted backrest and visible natural grain.'},
  {id:'ref-zarahome-foldable-lamp',brand:'ZARA HOME',name:'Foldable cordless table lamp',color:'Natural',sku:'6165/047/052',category:'Home',material:'Paper body · wooden top and base',price:59.90,dimensions:'8.5 × 4.8 × 4.8 in · H × W × D',sourceUrl:'https://www.zarahome.com/us/foldable-cordless-table-lamp-l46165047?categoryId=1020496559&ct=true',image:'/scene-experience/assets/zarahome-lamp-open.webp',gallery:['zarahome-lamp-open','zarahome-lamp-detail','zarahome-lamp-scene','zarahome-lamp-folded'],story:'A folding paper shade between wooden ends. The height adjusts as the shade opens.'}
].map(p=>({...p,reference:true,tile:null,checkedAt:'2026-11-05',gallery:p.gallery.map(n=>'/scene-experience/assets/'+n+'.webp')}));
products.push(...referenceProducts);
const referenceScenes = [
  ['linen-afternoon','Linen, in the afternoon','zara-linen-dress','ref-zara-linen-dress','travel summer linen light beige relaxed', '#6b302b'],
  ['soft-layers','Soft layers','zara-wool-cardigan','ref-zara-wool-cardigan','city knit wool gray relaxed structured', '#85817b'],
  ['a-place-to-sit','A place to sit','zarahome-chair-scene','ref-zarahome-wood-chair','home elm wood furniture natural', '#353a30'],
  ['evening-light','Evening light','zarahome-lamp-scene','ref-zarahome-foldable-lamp','home paper lamp warm light quiet', '#615d50']
].map(([id,title,photo,pid,tags,tone])=>{const p=getProduct(pid);return {id,title,headline:title,subtitle:p.brand+' · '+p.name,place:p.brand,season:'',category:p.category==='Home'?'Home':'Style',tags,image:'/scene-experience/assets/'+photo+'.webp',label:p.brand,brand:p.brand,collection:'My references',description:p.story,moments:[['',title,'',p.story]],items:[pid],reference:true,tone};});
baseScenes.splice(0,baseScenes.length,...referenceScenes);

function referenceCard(p) {
  return `<article class="life-product-card"><button class="life-art" data-life="product" data-type="concept" data-id="${p.id}" aria-label="View ${esc(p.name)}">${productPhoto(p)}</button><p class="eyebrow">${esc(p.brand)} <span class="reference-mini-label">Demo</span></p><h3>${esc(p.name)}</h3>${btn('Save to wardrobe','save-product',p.id,'data-type="concept"','subtle')}</article>`;
}
function showReferenceProduct(p,sceneId) {
  if(p.editorialProduct){showEditorialProduct(p,sceneId);return;}
  if(p.screenReference){showScreenReference(p,sceneId);return;}
  const selected=Math.min(world.options[p.id]?.photo||0,p.gallery.length-1);
  overlay(`<div class="life-product-detail reference-detail"><div class="reference-gallery"><div class="product-detail-art"><img id="reference-main-photo" src="${p.gallery[selected]}" alt="${esc(p.brand+' '+p.name)}" draggable="false"></div>${p.gallery.length>1?`<div class="reference-thumbnails" aria-label="Product photographs">${p.gallery.map((src,i)=>`<button data-life="reference-photo" data-id="${p.id}" data-photo="${i}" aria-label="Photo ${i+1}" aria-pressed="${i===selected}"><img src="${src}" alt="" loading="lazy"></button>`).join('')}</div>`:''}</div><div><p class="eyebrow">${esc(p.brand)} <span class="reference-mini-label">Demo</span></p><h2>${esc(p.name)}</h2><p class="detail-price">${storeMoney(Math.round(p.price*100),p.currency||'USD')}<small> Brand reference price · ${esc(p.currency||'USD')}</small></p><p class="reference-disclosure">Reference only · not sold by DIGO</p><dl><div><dt>Colour</dt><dd>${esc(p.color)}</dd></div><div><dt>Material</dt><dd>${esc(p.material)}</dd></div>${p.dimensions?`<div><dt>Size</dt><dd>${esc(p.dimensions)}</dd></div>`:''}<div><dt>Style</dt><dd>${esc(p.sku)}</dd></div></dl>${p.sourceAvailability==='Out of stock'?'<p class="reference-disclosure">Out of stock at the source when checked. You can still save this exact piece.</p>':''}<div class="life-actions">${btn('Save to wardrobe','save-product',p.id,'data-type="concept"','subtle')}${btn('Add to combination','add-to-board',p.id,'data-type="concept"','subtle')}</div><a class="life-btn reference-source" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">View at ${esc(p.brand)} ↗</a><details class="product-more"><summary>About this piece</summary><p>${esc(p.story)}</p><p>Official product photographs. Price checked ${p.checkedAt}; current sizes, availability and delivery are shown on the brand’s website.</p></details>${sceneId?`<a class="text-btn" href="#/scene/${esc(sceneId)}">Original moment ${icon('arrow')}</a>`:''}</div></div>`,'Product details');
  $('.modal')?.classList.add('product-sheet','reference-sheet');
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-life="reference-photo"]');if(!el)return;
  const p=getProduct(el.dataset.id),i=Number(el.dataset.photo);if(!p?.reference||!p.gallery[i])return;
  const photo=$('#reference-main-photo');if(!photo)return;
  photo.src=p.gallery[i];world.options[p.id]={...world.options[p.id],photo:i};writeWorld();
  for(const button of document.querySelectorAll('[data-life="reference-photo"]'))button.setAttribute('aria-pressed',String(button===el));
});
