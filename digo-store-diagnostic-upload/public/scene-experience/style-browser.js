/* Style uses the exact product identities attached to the active Discover edit. */
const styleView = { mode: 'color', lanes: {}, active: {color:0,temperature:0} };
const styleColors = [
  {id:'red',name:'Red',tone:'#9e363c'}, {id:'blue',name:'Blue',tone:'#507a9d'},
  {id:'ivory',name:'Ivory',tone:'#d5cbb6'}, {id:'green',name:'Green',tone:'#596c58'},
  {id:'earth',name:'Earth',tone:'#92745d'}, {id:'burgundy',name:'Burgundy',tone:'#602238'}, {id:'black',name:'Black',tone:'#2f3233'}, {id:'stone',name:'Stone',tone:'#9a9d99'}
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
  return products.filter(p=>ids.has(p.id) && p.styleColor).sort((a,b)=>Number(a.category==='Home')-Number(b.category==='Home'));
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
  const backdrops = groups.map(g => {
    const photo = mode === 'color' ? `;--fabric:url(/scene-experience/assets/textile-${g.id}.webp)` : '';
    return `<i data-fabric="${g.id}" style="--tone:${g.tone}${photo}"></i>`;
  }).join('');
  return `<div class="style-textiles" aria-hidden="true">${backdrops}</div>` + wrap(`<header class="style-heading"><div><h1>Style</h1></div><div class="style-mode" role="tablist" aria-label="Browse pieces by"><button id="style-color-tab" role="tab" aria-selected="${mode==='color'}" aria-controls="style-panel" tabindex="${mode==='color'?0:-1}" data-style-mode="color">Colour</button><button id="style-temperature-tab" role="tab" aria-selected="${mode==='temperature'}" aria-controls="style-panel" tabindex="${mode==='temperature'?0:-1}" data-style-mode="temperature">Temperature</button></div></header><div class="style-filter-row" data-mode="${mode}" data-gesture-ignore><div class="style-jumps" aria-label="${mode==='color'?'Colour':'Temperature'} columns">${groups.map((g,i)=>`<button data-style-jump="${i}" style="--swatch:${g.tone}" aria-label="Browse ${g.name}" aria-pressed="${styleView.active[mode]===i}"><i></i>${g.name}</button>`).join('')}</div><div class="style-arrows"><span class="style-position" aria-hidden="true">${styleView.active[mode]+1} / ${groups.length}</span><button data-style-step="-1" aria-label="Previous column">${icon('left')}</button><button data-style-step="1" aria-label="Next column">${icon('right')}</button></div></div><section id="style-panel" class="style-cylinder" data-mode="${mode}" role="tabpanel" aria-labelledby="style-${mode}-tab" data-gesture-ignore><div class="style-track" tabindex="0" aria-label="${mode==='color'?'Colour':'Temperature'} product columns. Swipe horizontally to browse." aria-keyshortcuts="ArrowLeft ArrowRight">${groups.map((g,i)=>`<section class="style-lane" data-style-lane="${g.id}" style="--lane-tone:${g.tone}"><header><div><i></i><h2>${g.name}</h2></div>${mode==='temperature'?`<small>${g.note}</small>`:''}</header><div class="style-lane-scroll" tabindex="0" aria-label="${g.name} pieces">${g.items.length?g.items.map(styleProductCard).join(''):'<p class="style-empty">New pieces, soon.</p>'}</div></section>`).join('')}</div></section>`,'style-browser');
}
// Each colour has its own reachable snap position, including the columns at both edges.
function styleSnapStops(lanes, viewport, contentWidth) {
  const end = Math.max(0, contentWidth - viewport);
  if (lanes.length < 2) return [0];
  return lanes.map((lane, i) => {
    const inset = (viewport - lane.offsetWidth) * i / (lanes.length - 1);
    return Math.max(0, Math.min(end, lane.offsetLeft - inset));
  });
}
let styleResizeObserver;
function mountStyleBrowser() {
  styleResizeObserver?.disconnect();
  const track = document.querySelector('.style-track');
  if (!track) return;
  const mode = styleView.mode;
  const lanes = [...track.querySelectorAll('.style-lane')];
  const backdrop = document.querySelector('.style-textiles');
  const swatches = [...document.querySelectorAll('[data-style-jump]')];
  const arrows = [...document.querySelectorAll('[data-style-step]')];
  const position = document.querySelector('.style-position');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let stops = [], frame = 0, destination = null, drag = null, suppressClick = false;

  function nearest(offset) {
    return stops.reduce((best, stop, i) =>
      Math.abs(stop - offset) < Math.abs(stops[best] - offset) ? i : best, 0);
  }
  function showSelection(index) {
    styleView.active[mode] = index;
    swatches.forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
    position.textContent = `${index + 1} / ${lanes.length}`;
    arrows[0].disabled = index === 0;
    arrows[1].disabled = index === lanes.length - 1;
    const chip = swatches[index], strip = chip.parentElement;
    const rect = chip.getBoundingClientRect(), bounds = strip.getBoundingClientRect();
    if (rect.left < bounds.left || rect.right > bounds.right) {
      strip.scrollBy({left: rect.left - bounds.left - (strip.clientWidth - rect.width) / 2, behavior:'instant'});
    }
  }
  function paint() {
    frame = 0;
    if (!track.isConnected) return;
    const left = track.scrollLeft;
    backdrop.style.transform = `translate3d(${-left}px,0,0)`;
    for (const [i, panel] of [...backdrop.children].entries()) {
      const distance = Math.max(-1, Math.min(1, (lanes[i].offsetLeft - left) / track.clientWidth));
      panel.style.setProperty('--drift', reduced.matches ? '0px' : `${distance * 6}px`);
    }
    const index = destination ?? nearest(left);
    if (index !== styleView.active[mode]) showSelection(index);
  }
  function select(index) {
    destination = Math.max(0, Math.min(lanes.length - 1, index));
    showSelection(destination);
    track.scrollTo({left: stops[destination], behavior: reduced.matches ? 'instant' : 'smooth'});
  }
  function measure() {
    const selected = styleView.active[mode];
    stops = styleSnapStops(lanes, track.clientWidth, track.scrollWidth);
    lanes.forEach((lane,i) => lane.style.scrollMarginInlineStart = (lane.offsetLeft - stops[i]) + 'px');
    track.scrollTo({left: stops[selected], behavior:'instant'});
    showSelection(selected);
    paint();
  }
  measure();
  styleResizeObserver = new ResizeObserver(measure);
  styleResizeObserver.observe(track);
  lanes.forEach(lane => {
    const scroller = lane.querySelector('.style-lane-scroll');
    const key = mode + lane.dataset.styleLane;
    scroller.scrollTop = styleView.lanes[key] || 0;
    scroller.addEventListener('scroll', () => { styleView.lanes[key] = scroller.scrollTop; }, {passive:true});
  });
  track.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(paint); }, {passive:true});
  track.addEventListener('scrollend', () => {
    if (drag?.locked) return;
    destination = null;
    showSelection(nearest(track.scrollLeft));
  });
  track.addEventListener('wheel', () => { destination = null; }, {passive:true});
  swatches.forEach((button, i) => button.addEventListener('click', () => select(i)));
  arrows.forEach(button => button.addEventListener('click', () => select(styleView.active[mode] + Number(button.dataset.styleStep))));
  document.querySelectorAll('[data-style-mode]').forEach(b=>{
    const switchMode=()=>{if(styleView.mode===b.dataset.styleMode)return;styleView.mode=b.dataset.styleMode;render(false);document.querySelector(`[data-style-mode="${styleView.mode}"]`)?.focus({preventScroll:true});};
    b.addEventListener('click',switchMode);
    b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();styleView.mode=e.key==='Home'?'color':e.key==='End'?'temperature':mode==='color'?'temperature':'color';render(false);document.querySelector(`[data-style-mode="${styleView.mode}"]`)?.focus({preventScroll:true});}});
  });
  track.addEventListener('keydown', e => {
    const index = styleView.active[mode];
    const keys = {ArrowLeft:index - 1, ArrowRight:index + 1, Home:0, End:lanes.length - 1};
    if (!Object.hasOwn(keys, e.key)) return;
    e.preventDefault();
    select(keys[e.key]);
  });
  track.addEventListener('pointerdown', e => {
    destination = null;
    if (e.pointerType === 'mouse' && e.button === 0) {
      drag = {id:e.pointerId, x:e.clientX, y:e.clientY, start:track.scrollLeft, locked:false};
    }
  });
  track.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!e.buttons) { drag = null; track.classList.remove('is-dragging'); return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.locked) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      if (Math.abs(dx) < 8) return;
      drag.locked = true;
      track.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
    }
    e.preventDefault();
    track.scrollLeft = drag.start - dx;
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const {start, locked} = drag;
    drag = null;
    if (!locked) return;
    const left = track.scrollLeft;
    const delta = left - start;
    const initial = nearest(start);
    let target = nearest(left);
    if (e.type === 'pointerup' && target === initial && Math.abs(delta) > 44) {
      target = initial + Math.sign(delta);
    }
    track.classList.remove('is-dragging');
    select(target);
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
  }
  for (const event of ['pointerup','pointercancel','lostpointercapture']) track.addEventListener(event, endDrag);
  track.addEventListener('click', e => {
    if (suppressClick) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  track.addEventListener('dragstart',e=>e.preventDefault());
  track.addEventListener('click',e=>{const save=e.target.closest('.style-save');if(save)queueMicrotask(()=>{const saved=world.saved.some(x=>x.kind==='product'&&x.id===save.dataset.id);save.classList.toggle('is-saved',saved);save.setAttribute('aria-pressed',String(saved));});});
}
