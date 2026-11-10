function scenePieces(scene) {
  return [...new Set(scene.items)].map(getProduct).filter(Boolean);
}

function piecePoster(scene, pieces, index) {
  const p = pieces[index];
  const title = sceneLabel(branchForScene(scene.id), scene);
  const back = `<a class="poster-parent life-btn" data-life="series-back" data-id="${esc(scene.id)}" href="#/scene/${esc(scene.id)}">${icon('left')}${esc(title)}</a>`;
  const select = pieces.map((item, i) => `<button data-life="select-piece" data-id="${esc(scene.id)}" data-piece="${esc(item.id)}"
    aria-label="Show ${esc(item.name)}" aria-pressed="${i === index}">${productPhoto(item)}</button>`).join('');
  return `<section class="life-scene discover-poster piece-poster" data-scene="${esc(scene.id)}" data-piece="${esc(p.id)}" tabindex="-1" aria-label="${esc(p.name)}">
    <img class="life-scene-photo" src="${esc(scene.image)}" alt="" draggable="false">
    ${back}
    <button class="piece-portrait" data-life="product" data-id="${esc(p.id)}" data-type="concept" data-scene="${esc(scene.id)}" aria-label="View ${esc(p.name)}">${productPhoto(p)}</button>
    <div class="piece-caption"><p>${esc(p.brand || p.category)}</p><h1>${esc(p.name)}</h1>
    ${p.color ? `<p>${esc(p.color)}</p>` : ''}
    <button class="life-btn glass" data-life="product" data-id="${esc(p.id)}" data-type="concept" data-scene="${esc(scene.id)}">View details ${icon('right')}</button></div>
    <div class="piece-thumbnails" aria-label="Pieces styled for this scene">${select}</div>
    <div class="poster-pager" aria-label="Scene pieces"><output aria-label="Position">${index+1} / ${pieces.length}</output>
    <button class="scene-step" data-life="page-poster" data-direction="-1" aria-label="Previous piece">↑</button>
    <button class="scene-step" data-life="page-poster" data-direction="1" aria-label="Next piece">↓</button></div></section>`;
}

function sceneSeriesPage(id) {
  const scene = sceneFor(id);
  if (!scene) return wrap(empty('This scene is unavailable.', 'Browse the current scenes in Discover.'));
  const pieces = scenePieces(scene);
  if (!pieces.length) return wrap(empty('No pieces in this scene yet.', '', '#/scene/' + id, 'Back to scene'));
  const saved = history.state?.pieceId;
  const index = Math.max(0, pieces.findIndex(piece => piece.id === saved));
  return wrap(piecePoster(scene, pieces, index), 'moment-feed piece-feed');
}

function selectScenePiece(id, pieceId, focus) {
  const scene = sceneFor(id), current = document.querySelector('.piece-feed .piece-poster');
  if (!current || current.dataset.scene !== id || !scene) return false;
  const pieces = scenePieces(scene), index = pieces.findIndex(piece => piece.id === pieceId);
  if (index < 0) return false;
  focus = focus || current.contains(document.activeElement);
  history.replaceState({...history.state, pieceId}, '');
  current.outerHTML = piecePoster(scene, pieces, index);
  if (focus) document.querySelector('.piece-poster').focus({preventScroll:true});
  return true;
}

function moveScenePiece(card, step, focus) {
  const scene = sceneFor(card.dataset.scene), pieces = scenePieces(scene);
  const index = pieces.findIndex(p => p.id === card.dataset.piece);
  return selectScenePiece(scene.id, pieces[(index + step + pieces.length) % pieces.length].id, focus);
}

function openSceneSeries(id) {
  if (!sceneFor(id)) return false;
  const origin = route();
  closeOverlay();
  journeyDirection = 'left';
  history.pushState({seriesOrigin: origin}, '', '#/series/' + encodeURIComponent(id));
  render();
  document.querySelector('.piece-poster')?.focus({preventScroll: true});
  return true;
}

function leaveSceneSeries(id) {
  if (journeyDirection === 'right') return true; // History traversal is asynchronous.
  const origin = history.state?.seriesOrigin;
  journeyDirection = 'right';
  if (origin === '/scene/' + id) {
    history.back();
  } else {
    history.replaceState(null, '', '#/scene/' + encodeURIComponent(id));
    render();
  }
  return true;
}
