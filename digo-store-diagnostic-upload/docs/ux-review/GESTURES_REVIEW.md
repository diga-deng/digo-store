# Desktop preview and directional gestures — 2026-11-04

- Discover: native vertical touch/wheel scrolling with proximity snapping; desktop mouse drags up/down move between moments; visible previous/next arrows remain.
- Wardrobe: horizontal mouse, touch and pen drags, horizontal trackpad scrolling, Shift+wheel, arrow keys, and visible previous/next buttons.
- Bottom navigation: horizontal swipes and trackpad gestures switch between the four labelled destinations. Horizontal gestures elsewhere do not unexpectedly leave the page.
- Open dialogs, text inputs, circle drawing and pinch zoom do not trigger navigation. A drag suppresses its trailing click; wheel momentum advances only once per gesture, including when the navigation DOM is replaced.
- The desktop preview keeps a 1440px iframe layout and scales its display to available width. Mobile uses a 390px layout. Changing preview mode preserves the same iframe and its current choices.

Validation: 50 tests pass, including new pointer, touch, cancel, input, modal, zoom, momentum and navigation regression cases. Next.js production build passed. Browser validation exercised upward/downward scene dragging, bottom navigation dragging, wardrobe mouse drag in both directions, horizontal wheel and keyboard navigation. Actual phone hardware was not used; touch event behaviour is covered by automated tests and the 390px responsive preview.

Previous payment, catalogue and sharing-service boundaries are unchanged.
