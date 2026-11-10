/* A series is an editorial selection. Unassigned scenes keep their own selection. */
const discoverSeries = [
  { title: 'Alpine series', scenes: ['alpine-ridge', 'alpine-snow', 'outdoor-dawn', 'outdoor-ridgewalk', 'outdoor-powder'] },
  { title: 'Architecture series', scenes: ['architecture-terrace', 'architecture-canoas', 'architecture-glass', 'architecture-courtyard', 'architecture-lounge'] }
];

function sceneSeriesPage(id) {
  const scene = sceneFor(id);
  if (!scene) return wrap(empty('This series is unavailable.', 'Explore the current moments in Discover.'));
  const series = discoverSeries.find(group => group.scenes.includes(id));
  const title = series?.title || scene.collection || scene.title;
  const here = [...new Set(scene.items)];
  const related = new Set((series?.scenes || []).flatMap(sceneId => sceneFor(sceneId)?.items || []));
  here.forEach(pieceId => related.delete(pieceId));

  function pieceCard(pieceId) {
    const product = getProduct(pieceId);
    if (!product) return '';
    return `<button class="series-piece" data-life="product" data-type="concept"
      data-id="${esc(pieceId)}" data-scene="${esc(scene.id)}" aria-label="View ${esc(product.name)}">
      <span class="series-piece-photo">${productPhoto(product)}</span>
      <span class="series-piece-copy"><small>${esc(product.brand || product.category)}</small>
        <strong>${esc(product.name)}</strong>${product.color ? `<span>${esc(product.color)}</span>` : ''}</span></button>`;
  }

  const position = (scene.position || [.5,.5]).map(n => n * 100 + '%').join(' ');
  return wrap(`<div class="series-cover" aria-hidden="true"><img src="${esc(scene.image)}" alt=""
      style="object-position:${position}" fetchpriority="high"></div>
    <div class="series-content" data-series-scene="${esc(id)}">
      <a class="series-back" data-life="series-back" data-id="${esc(id)}" href="#/scene/${esc(id)}">${icon('left')} Back to scene</a>
      <header class="series-heading">
        <p>${esc(scene.brand || scene.category)}</p><h1 tabindex="-1">${esc(title)}</h1>
        ${title !== scene.title ? `<span>${esc(scene.title)}</span>` : ''}
      </header>
      <section aria-labelledby="series-pieces"><h2 id="series-pieces">In this scene</h2>
        <div class="series-grid">${here.map(pieceCard).join('')}</div>
      </section>
      ${related.size ? `<details class="series-more"><summary>More from this series</summary>
        <div class="series-grid">${[...related].map(pieceCard).join('')}</div></details>` : ''}
    </div>`, 'scene-series');
}

function openSceneSeries(id) {
  if (!sceneFor(id)) return false;
  if (document.querySelector('.moment-feed')) rememberFeedScene(id);
  const origin = route();
  closeOverlay();
  journeyDirection = 'left';
  history.pushState({seriesOrigin: origin}, '', '#/series/' + encodeURIComponent(id));
  render();
  document.querySelector('.series-heading h1')?.focus({preventScroll: true});
  return true;
}

function leaveSceneSeries(id) {
  if (journeyDirection === 'right') return true; // History traversal is asynchronous.
  const origin = history.state?.seriesOrigin;
  journeyDirection = 'right';
  if (origin === '/' || origin === '/scene/' + id) {
    history.back();
  } else {
    navigate('/scene/' + encodeURIComponent(id));
  }
  return true;
}
