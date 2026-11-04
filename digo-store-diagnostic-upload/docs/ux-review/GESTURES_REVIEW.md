# Full-page browsing and persistent visual navigation — 2026-11-04

Discover, Style and scene deep links now show one viewport-sized moment at a time. Up/down touch, mouse dragging, wheel and arrow-key gestures replace that moment, with visible previous/next controls. This supersedes the earlier continuous scrolling/proximity-snap behaviour. The four picture tabs stay fixed at the bottom; horizontal swipes on the scene or tabs switch Discover, Style, Wardrobe and Plans. Wardrobe's garment rail retains local horizontal item selection. Editors, plan forms and product sheets retain ordinary content scrolling.

Discover and Style keep independent current-scene IDs on this device. Opening/closing product details, switching modules and refreshing preserve the selected scene. Removed promotional headings stay removed. Style refinement remains available through the compact Refine control; related catalog pieces and plan creation remain available through Explore pieces. No catalogue, order, payment or service rules were changed.

Guards cover editable controls, circle mode, open dialogs, local product-rail scrolling, multi-touch, cancelled gestures and pinch zoom. A drag suppresses the trailing click. Wheel bursts have a stable identity across DOM replacement so inertial tails cannot skip several pages.

Validation: 51 automated tests passed and Next.js production build passed. Browser checks verified vertical wheel and mouse pagination, horizontal module switching, current scene after closing a product and refreshing, and the 390px mobile layout. Mobile frame measured 390 × 844 with one scene, document height 844, four picture tabs, and navigation bottom at 844. Touch behaviour is covered by gesture tests; physical iOS/Android hardware was not available.
