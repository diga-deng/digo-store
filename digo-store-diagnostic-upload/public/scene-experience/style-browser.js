/* Style uses the exact product identities attached to the active Discover edit. */
const styleView = { mode: 'color', positions: {color:0,temperature:0}, lanes: {}, active: {color:0,temperature:0} };
const styleColors = [
  {id:'red',name:'Red',tone:'#9e363c'}, {id:'blue',name:'Blue',tone:'#507a9d'},
  {id:'ivory',name:'Ivory',tone:'#d5cbb6'}, {id:'green',name:'Green',tone:'#596c58'},
  {id:'earth',name:'Earth',tone:'#92745d'}, {id:'black',name:'Black',tone:'#2f3233'}
];
const styleTemperatures = [
  {id:'0',name:'0–5°C',tone:'#718795',note:'Winter layers'},
  {id:'5',name:'5–10°C',tone:'#8e9f9c',note:'Cold mornings'},
  {id:'10',name:'10–15°C',tone:'#a8b1a0',note:'Light layers'},
  {id:'15',name:'15–20°C',tone:'#c0b599',note:'In between'},
  {id:'20',name:'20–25°C',tone:'#c7a482',note:'Warm days'},
  {id:'25',name:'25–30°C',tone:'#bb886f',note:'High summer'}
];
function styleProducts() {
  const ids = new Set(baseScenes.flatMap(s=>s.items));
  return products.filter(p=>ids.has(p.id) && p.styleColor);
}
function styleGroups(mode=styleView.mode) {
  const all=styleProducts();
  return (mode==='color'?styleColors:styleTemperatures).map(g=>({...g,items:all.filter(p=>mode==='color'?p.styleColor===g.id:p.category==='Wear'&&p.styleTemperatures?.includes(Number(g.id)))}));
}
function styleProductCard(p,index) {
  const scene=baseScenes.find(s=>s.items.includes(p.id));
  const saved=world.saved.some(x=>x.kind==='product'&&x.id===p.id);
  return `<article class="style-piece style-piece-${index%3}"><div class="style-piece-visual"><button class="style-piece-open" data-life="product" data-type="concept" data-id="${p.id}" data-scene="${scene.id}" aria-label="View ${esc(p.name)} in ${esc(p.color)}">${productPhoto(p)}</button><button class="style-save ${saved?'is-saved':''}" data-life="save-product" data-type="concept" data-id="${p.id}" aria-label="Save ${esc(p.name)} to wardrobe" aria-pressed="${saved}">${icon('save')}</button></div><div class="style-piece-copy"><span>${esc(p.brand)}</span><button data-life="product" data-type="concept" data-id="${p.id}" data-scene="${scene.id}">${esc(p.name)}</button><small>${esc(p.color)}</small></div></article>`;
}
function styleBrowserPage() {
  const groups=styleGroups(),mode=styleView.mode;
  return wrap(`<header class="style-heading"><div><p class="eyebrow">THE DISCOVER EDIT</p><h1>Style</h1></div><div class="style-mode" role="tablist" aria-label="Browse pieces by"><button id="style-color-tab" role="tab" aria-selected="${mode==='color'}" aria-controls="style-panel" tabindex="${mode==='color'?0:-1}" data-style-mode="color">Colour</button><button id="style-temperature-tab" role="tab" aria-selected="${mode==='temperature'}" aria-controls="style-panel" tabindex="${mode==='temperature'?0:-1}" data-style-mode="temperature">Temperature</button></div></header><div class="style-filter-row" data-gesture-ignore><div class="style-jumps" aria-label="${mode==='color'?'Colour':'Temperature'} columns">${groups.map((g,i)=>`<button data-style-jump="${i}" aria-label="Browse ${g.name}" aria-pressed="${styleView.active[mode]===i}"><i style="--swatch:${g.tone}"></i>${g.name}</button>`).join('')}</div><div class="style-arrows"><button data-style-step="-1" aria-label="Previous column">${icon('left')}</button><button data-style-step="1" aria-label="Next column">${icon('right')}</button></div></div><section id="style-panel" class="style-cylinder" role="tabpanel" aria-labelledby="style-${mode}-tab" data-gesture-ignore><div class="style-track" tabindex="0" aria-label="${mode==='color'?'Colour':'Temperature'} product columns. Swipe horizontally to browse." aria-keyshortcuts="ArrowLeft ArrowRight">${groups.map((g,i)=>`<section class="style-lane" data-style-lane="${g.id}" style="--lane-tone:${g.tone}"><header><div><i></i><h2>${g.name}</h2></div><span>${String(g.items.length).padStart(2,'0')}</span>${mode==='temperature'?`<small>${g.note}</small>`:''}</header><div class="style-lane-scroll" tabindex="0" aria-label="${g.name} pieces">${g.items.length?g.items.map(styleProductCard).join(''):'<p class="style-empty">New pieces, soon.</p>'}</div></section>`).join('')}</div></section><footer class="style-caption"><span>Swipe across · Scroll to explore</span><span>${mode==='color'?'Pieces from Discover':'Layering ideas · Adjust for wind & activity'}</span></footer>`,'style-browser');
}
function mountStyleBrowser() {
  const track=document.querySelector('.style-track'); if(!track)return;
  const mode=styleView.mode,lanes=[...track.querySelectorAll('.style-lane')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame=0,drag=null,suppressClick=false,programmaticUntil=0;
  const paint=()=>{
    frame=0;const center=track.scrollLeft+track.clientWidth/2;let nearest=0,dist=Infinity;
    lanes.forEach((lane,i)=>{const d=(lane.offsetLeft+lane.offsetWidth/2-center)/track.clientWidth;const bounded=Math.max(-1,Math.min(1,d));lane.style.setProperty('--lane-rotate',`${reduced?0:-bounded*9}deg`);lane.style.setProperty('--lane-shift',`${reduced?0:Math.abs(bounded)*10}px`);if(Math.abs(d)<dist){dist=Math.abs(d);nearest=i;}});
    styleView.positions[mode]=track.scrollLeft;if(performance.now()>programmaticUntil)styleView.active[mode]=nearest;
    document.querySelectorAll('[data-style-jump]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===styleView.active[mode])));
    document.querySelector('[data-style-step="-1"]').disabled=track.scrollLeft<2;
    document.querySelector('[data-style-step="1"]').disabled=track.scrollLeft>=track.scrollWidth-track.clientWidth-2;
  };
  const scrollToLane=i=>{const index=Math.max(0,Math.min(lanes.length-1,i));const lane=lanes[index];styleView.active[mode]=index;programmaticUntil=performance.now()+900;paint();track.scrollTo({left:lane.offsetLeft-(track.clientWidth-lane.offsetWidth)/2,behavior:reduced?'instant':'smooth'});};
  track.scrollLeft=styleView.positions[mode];
  lanes.forEach(lane=>{const scroller=lane.querySelector('.style-lane-scroll');scroller.scrollTop=styleView.lanes[mode+lane.dataset.styleLane]||0;scroller.addEventListener('scroll',()=>{styleView.lanes[mode+lane.dataset.styleLane]=scroller.scrollTop;},{passive:true});});
  track.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(paint);},{passive:true});
  document.querySelectorAll('[data-style-jump]').forEach(b=>b.addEventListener('click',()=>scrollToLane(Number(b.dataset.styleJump))));
  document.querySelectorAll('[data-style-step]').forEach(b=>b.addEventListener('click',()=>scrollToLane(styleView.active[mode]+Number(b.dataset.styleStep))));
  document.querySelectorAll('[data-style-mode]').forEach(b=>{
    const switchMode=()=>{if(styleView.mode===b.dataset.styleMode)return;styleView.mode=b.dataset.styleMode;render(false);document.querySelector(`[data-style-mode="${styleView.mode}"]`)?.focus({preventScroll:true});};
    b.addEventListener('click',switchMode);
    b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();styleView.mode=e.key==='Home'?'color':e.key==='End'?'temperature':mode==='color'?'temperature':'color';render(false);document.querySelector(`[data-style-mode="${styleView.mode}"]`)?.focus({preventScroll:true});}});
  });
  track.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();scrollToLane(styleView.active[mode]+(e.key==='ArrowRight'?1:-1));}});
  // Native touch scrolling handles both axes; mouse dragging starts only after horizontal intent.
  track.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0)drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:track.scrollLeft,locked:false};});
  track.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.locked){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}if(Math.abs(dx)<8)return;drag.locked=true;track.setPointerCapture(e.pointerId);track.classList.add('is-dragging');}e.preventDefault();track.scrollLeft=drag.start-dx;});
  const end=()=>{if(drag?.locked){suppressClick=true;setTimeout(()=>suppressClick=false,0);}drag=null;track.classList.remove('is-dragging');};
  track.addEventListener('pointerup',end);track.addEventListener('pointercancel',end);track.addEventListener('lostpointercapture',end);
  track.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}},true);
  track.addEventListener('dragstart',e=>e.preventDefault());
  track.addEventListener('click',e=>{const save=e.target.closest('.style-save');if(save)queueMicrotask(()=>{const saved=world.saved.some(x=>x.kind==='product'&&x.id===save.dataset.id);save.classList.toggle('is-saved',saved);save.setAttribute('aria-pressed',String(saved));});});
  paint();
}
