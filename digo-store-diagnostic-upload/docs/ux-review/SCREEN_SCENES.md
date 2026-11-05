# People, clothes and furniture — screen-scene demo

Added three real television stills alongside the three existing real-room references. No actors or scenery were generated or composited into the scene photographs.

| Scene | Isolated visual references | Published source |
| --- | --- | --- |
| An evening in Apartment 4A | Penny’s purple printed dress; Sheldon’s green graphic T-shirt; round glass coffee table | https://www.imdb.com/media/rm3716725760/tt0898266 |
| Coffee with friends | Chandler’s red long-sleeve top; Central Perk orange sofa; yellow coffee cup | https://www.revistagq.com/noticias/articulo/friends-central-perk-en-la-vida-real-nueva-york |
| Everyone stays for dinner | Howard’s checked shirt; white upholstered armchair; glass table with crossed legs | https://www.eltiempo.com/cultura/cine-y-tv/the-big-bang-theory-hace-emotivo-adios-tras-12-anos-363010 |

Each source photograph, publication URL and normalized hotspot is recorded in screen-products.js. Scene images are original downloaded stills with WebP delivery compression. Product silhouette assets are AI-assisted isolation edits of those stills, not verified retail photographs. Occluded regions were reconstructed by the editing model, so the product sheet explicitly discloses this and retains the original frame for comparison. Brand, model, material, dimensions, prices and availability remain unverified, with no invented purchase action. Demo references cannot enter the real checkout.

The left rail contains three isolated objects per scene. Hotspots open the same reference identity. Full scene opens the complete uncropped frame with all three clickable objects, particularly useful on a portrait phone. Save and Make it mine use the same existing wardrobe and combination records. Clothes use Clothing and furniture/objects use Home. Existing room scenes and saved Zara references keep their identities.

## Asset-edit prompt set

Built-in image editing; one source still and one transparent cutout per call. Common brief: background-extraction, square transparent canvas, centered individual object with margin; preserve original color, texture, folds, proportions, visible wear and camera perspective; remove people and surrounding objects; do not add captions or labels. Each prompt selected exactly one subject from the table above. The round table prompt removed drinks and snacks; the sofa prompt removed seated people; the white chair prompt removed clothing; the crossed-leg table prompt removed plates and bottles. These removals can reconstruct hidden details and are disclosed in the UI.

Delivered assets: public/scene-experience/assets/screen-*.webp. Source data and interactions: public/scene-experience/screen-products.js.

Validation: 62 automated tests passed, including preservation of existing scenes, exact source/reference relationships, unverified product disclosure, no fabricated price or checkout, and accessibility of every object from the uncropped scene.

Production build passed. Browser QA verified the desktop scene, exact hotspot/detail pairing, save to Clothing, phone portrait view, uncropped Full scene, and clickable furniture references.
