# M2 Masonry Grid Analysis

## Observation
1. **`content-visibility` misconfiguration**: In `styles/main.css` (line 577), `content-visibility: auto` and `contain-intrinsic-size: auto 600px` are applied globally to all `.photo-item` elements, including those in the initial viewport.
2. **Responsive grid behavior**: In `styles/main.css` (line 494), the modifier classes `.photo-item--wide` and `.photo-item--featured` that apply `grid-column: span 2` are only reset to `auto` at `max-width: 600px`. At `max-width: 1024px`, the grid uses 2 columns but keeps `span 2`, causing these items to take up the entire row.
3. **JS Layout Thrashing**: In `scripts/main.js` (line 320, `resizeAllGridItems`), the code sets `item.style.gridRowEnd = 'auto'` in a loop, then immediately calculates `img.getBoundingClientRect().height` in the next loop, causing forced synchronous reflows.

## Logic Chain
1. **Content-visibility**: According to `modern-web-guidance`, `content-visibility: auto` must **not** be applied to above-the-fold items, as evaluating visibility bounds delays critical rendering. We should target elements below the initial fold (e.g., `.photo-item:nth-child(n+7)`). Furthermore, `contain-intrinsic-size` should explicitly define width and height (e.g., `auto none auto 600px`) to prevent horizontal layout jumping.
2. **Responsive grid**: Allowing `span 2` when there are only 2 columns (`max-width: 1024px`) forces items to span the full width, breaking the masonry aesthetic. The media query that resets spans (`grid-column: auto;`) should be updated from `max-width: 600px` to `max-width: 1024px`.
3. **JS Reflow Optimization**: We can completely avoid DOM layout thrashing by reading the item's current width `getBoundingClientRect().width` and mathematically calculating its required height using the image's inherent aspect ratio (`img.naturalHeight / img.naturalWidth`). This eliminates the need to reset `gridRowEnd = 'auto'` and separates DOM reads from DOM writes.

## Caveats
- Calculating heights mathematically requires images to have their `naturalWidth` and `naturalHeight` available. The existing implementation already defers `finalizeGrid` until images have loaded, so this assumption holds.
- Setting `content-visibility: auto` via `:nth-child(n+7)` assumes roughly the first 6 images fit above the fold. This is a very safe heuristic across both desktop (2 rows of 3) and mobile (first items only).

## Conclusion
The implementer should apply the following fixes:
- **CSS (`styles/main.css`)**: 
  - Restrict `content-visibility` and `contain-intrinsic-size` to `.photo-item:nth-child(n+7)`.
  - Update syntax to `contain-intrinsic-size: auto none auto 600px;`.
  - Change the media query that resets spans from `@media (max-width: 600px)` to `@media (max-width: 1024px)`.
- **JS (`scripts/main.js`)**: 
  - Rewrite the height calculation logic in `resizeAllGridItems`. Read the current item width and calculate the expected height as `width * (img.naturalHeight / img.naturalWidth)`. Do not set `gridRowEnd = 'auto'`.

## Verification Method
1. Inspect `.photo-item` elements in the browser; verify only the 7th item and beyond have `content-visibility: auto`.
2. Resize the browser to `900px` and ensure wide/featured items do not span across both columns.
3. Open the Chrome DevTools Performance tab, record while resizing the window, and verify there are no "Forced reflow" warnings from `resizeAllGridItems`.
