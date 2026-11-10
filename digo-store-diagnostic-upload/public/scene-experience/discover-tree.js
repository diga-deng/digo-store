// The branch order also defines the order of the five Discover covers.
// Existing scene IDs continue to resolve from wardrobe saves and shared links.
const discoverBranches = [
  { id: 'work', title: 'Work & professional life', cover: 'commute', scenes: [
    ['meeting', 'The client meeting'], ['commute', 'The morning commute'], ['atelier', 'Inside the atelier']
  ] },
  { id: 'everyday', title: 'Everyday life & leisure', cover: 'a-quiet-living-room', scenes: [
    ['morning', 'A slow Sunday morning'], ['dog', 'Around the block'], ['gallery', 'An afternoon at the gallery'],
    ['a-quiet-living-room', 'An hour at home'], ['a-corner-to-play', 'Time to play'], ['architecture-lounge', 'A quiet afternoon']
  ] },
  { id: 'social', title: 'Social & special occasions', cover: 'wedding', scenes: [
    ['date', 'A café date'], ['wedding', 'The garden ceremony'], ['club', 'After the lights go down'],
    ['dinner', 'Dinner with friends'], ['a-table-for-the-evening', 'Setting the table']
  ] },
  { id: 'active', title: 'Sport & wellness', cover: 'alpine-ridge', scenes: [
    ['coast', 'The coastal trail'], ['outdoor-powder', 'A day on the slopes'], ['cycle', 'The city ride'],
    ['studio', 'Morning in the studio'], ['outdoor-dawn', 'A sunrise hike'], ['alpine-ridge', 'On the alpine ridge'],
    ['outdoor-ridgewalk', 'The high traverse'], ['alpine-snow', 'The snowy ascent']
  ] },
  { id: 'travel', title: 'Travel & holidays', cover: 'amalfi', scenes: [
    ['old-town', 'Through the old town'], ['island', 'An island afternoon'], ['amalfi', 'An evening on the Amalfi Coast'], ['snow-town', 'Winter in the city'],
    ['architecture-canoas', 'Visiting Casa das Canoas'], ['architecture-glass', 'Inside the glass house'],
    ['architecture-terrace', 'On the sunlit terrace'], ['architecture-courtyard', 'Into the courtyard']
  ] }
];

const discoverPhotographs = [
  ['commute', 33402246, 'A woman in a blazer walks past a glass-fronted building.', .38, ['edit-lp-34','edit-lp-21','edit-lp-25']],
  ['meeting', 7793672, 'Colleagues gather around a table with their notebooks and laptops.', .44, ['edit-lp-25','edit-lp-34','edit-lp-23']],
  ['atelier', 3814539, 'A tailor guides a length of cloth through his sewing machine.', .46, ['edit-lp-26','edit-lp-21']],
  ['dog', 9844321, 'A dog and its walker pass a row of neighborhood storefronts.', .56, ['edit-arc-green','edit-lp-21']],
  ['gallery', 27046040, 'A gallery visitor sits before a painting in a red vaulted room.', .50, ['edit-lp-30','edit-lp-16']],
  ['wedding', 30608501, 'A couple celebrates their wedding in a garden.', .47, ['edit-lp-17','edit-lp-1','edit-lp-14']],
  ['date', 8626828, 'Two people sit together at a small café table.', .52, ['edit-lp-8','edit-lp-25','ref-zara-linen-dress']],
  ['club', 11806683, 'A crowd watches a live performance under blue lights.', .52, ['edit-lp-2','edit-lp-0']],
  ['studio', 4998815, 'Two people stretch on mats in a sunlit studio.', .53, ['edit-arc-green','edit-arc-ivory']],
  ['cycle', 31328589, 'A cyclist rides between tall city buildings.', .65, ['edit-arc-earth','edit-arc-ivory']],
  ['coast', 16804797, 'A hiker looks across the sea from a cliff path.', .47, ['edit-arc-green','edit-arc-blue','edit-lp-23']],
  ['island', 33445372, 'A traveler in a colorful dress walks by turquoise water on a tropical beach.', .48, ['edit-lp-8','ref-zara-linen-dress','edit-lp-1']],
  ['snow-town', 10066931, 'Pedestrians follow a snow-covered path between city buildings.', .50, ['edit-lp-23','edit-arc-black','edit-lp-34']],
  ['old-town', 12591798, 'A traveler explores a narrow street framed by historic façades.', .48, ['edit-lp-30','edit-lp-26','ref-zara-linen-dress']]
];

function branchForScene(id) {
  return discoverBranches.find(branch => branch.scenes.some(([sceneId]) => sceneId === id));
}
function sceneLabel(branch, scene) {
  return branch?.scenes.find(([id]) => id === scene.id)?.[1] || scene.title;
}
for (const [id, photoId, description, focusY, items] of discoverPhotographs) {
  const branch = branchForScene(id);
  const title = sceneLabel(branch, {id});
  baseScenes.push({
    id, title, headline: title, subtitle: description, description, category: branch.title, place: branch.title,
    label: branch.title, collection: branch.title, tags: title + ' ' + branch.title,
    image: '/scene-experience/assets/discover/' + id + '.webp', position: [.5, focusY],
    items, editorial: true, moments: [['', title, '', description]], sourceCredit: 'Photo · Pexels',
    sourceUrl: 'https://www.pexels.com/photo/' + photoId + '/'
  });
}
