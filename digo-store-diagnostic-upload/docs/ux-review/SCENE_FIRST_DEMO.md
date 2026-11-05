# Real scene demo — 2026-11-04

The feed now starts with three real furnished rooms, each containing three identifiable products. It no longer enlarges an individual product photo into a scene. Official product cutouts remain in the left rail, product sheet, wardrobe and combination board.

Source: https://fermliving.com/blogs/stories/living-with-kids-at-home-with-fanny-nilsson
Shop the exact home: https://fermliving.com/collections/at-home-with-fanny-nilsson

| Scene | Actual photographed products |
| --- | --- |
| A quiet living room | Cilla blanket (Off-White/Dark Grape), Arum portable lamp (Stainless Steel), Insert marble side table (Sand) |
| A table for the evening | Elysia candelabra, Tydra bowl Large, Tydra bowl Small |
| A corner to play | Tukki trolley Natural, Pear bean bag Elm Green, Mara rug Elm Green/Warm Sand |

Source images are the 3400px-high originals Fanny_3.jpg, Fanny_1.jpg and Fanny_5.jpg, associated with the thumbnails linked in the official article. Their exact dimensions and normalized anchors are recorded in scene-products.js. Product SKU, original image URL, material, dimensions, EUR price snapshot and official product link are stored on each reference record. No speculative hotspots were added to unidentified furniture. Photos are locally optimized WebP copies for this requested reference demo, not a representation of DIGO stock or a supplier relationship.

Hotspots use the same cover transform and focal position as each photo. Connector lines point from the photographed item to the accessible numbered button where needed. Three numbered thumbnails remain available at every screen size, even if an extreme viewport crops a hotspot. Whole-page vertical scene switching, horizontal module gestures and the fixed four-icon navigation remain unchanged.

The previous Zara / Zara Home products and old scene IDs remain available to existing saved selections. New references can be saved and combined, but are excluded from DIGO checkout. Source EUR prices are never presented as USD; the Insert table retains its observed out-of-stock status. The 141 withdrawn supplier products remain withdrawn.

Validation: npm test (59 passed); npm run build passed. Browser QA at 390 × 844 and 1440 × 960: correct room photography, three thumbnail/product matches, accurate numbered hotspots, EUR detail, save into Wardrobe Home, close back to scene, all three products in Make it mine, and next-scene controls/keyboard navigation.
