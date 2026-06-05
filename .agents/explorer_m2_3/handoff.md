# M2 Masonry Grid Analysis Report

## Observation
1. **Scope 1 (content-visibility)**: In `styles/main.css` (lines 577-580), `content-visibility: auto;` and `contain-intrinsic-size: auto 600px;` are applied globally to all `.photo-item` elements. The `modern-web-guidance` explicitly dictates that this must not be applied to above-the-fold items.
2. **Scope 2 (Responsive Grid)**: In `styles/main.css`, the `.mosaic-grid` drops to 2 columns at `max-width: 1024px` (line 433). However, `.photo-item--wide` and `.photo-item--featured` maintain `grid-column: span 2;` (line 454). Spans are only reset to `auto` at `max-width: 600px` (line 494).
3. **Scope 3 (Reflow Calculation)**: In `scripts/main.js` (lines 326-338), `resizeAllGridItems` sets `item.style.gridRowEnd = 'auto'` (DOM Write) for all items, and then immediately maps over the items to read `img.getBoundingClientRect().height` (DOM Read). 

## Logic Chain
1. **Scope 1**: Applying `content-visibility: auto` to above-the-fold elements forces the browser to evaluate visibility boundaries before initial render, ironically delaying the Largest Contentful Paint (LCP). It should only target off-screen items (e.g., using a CSS selector like `.photo-item:nth-child(n+7)` or adding a specific `.deferred` class dynamically).
2. **Scope 2**: In a 2-column layout (<=1024px), an item spanning 2 columns takes up the full width. In a dense masonry layout, this acts as a row break and frequently causes awkward white space gaps above or below the element because the masonry algorithm struggles to fit items around it. The `span 2` rule should be disabled starting at the 1024px breakpoint instead of 600px.
3. **Scope 3**: The sequence of invalidating the layout (`gridRowEnd = 'auto'`) and immediately requesting geometric properties (`getBoundingClientRect().height`) triggers a synchronous reflow (Layout Thrashing). To avoid this, the image height can be computed mathematically: `height = columnWidth / (img.naturalWidth / img.naturalHeight)`. The `columnWidth` can be read exactly once before any DOM writes, completely eliminating per-item layout thrashing.

## Caveats
- **Scope 1**: Determining exactly which items are "above the fold" using pure CSS `nth-child` is an approximation since it depends on the user's viewport size.
- **Scope 2**: Disabling `span 2` at 1024px means featured images will lose their size emphasis on tablets. If emphasis is critical, consider adjusting the `grid-row` spans to make them taller instead of wider.
- **Scope 3**: Calculating height mathematically assumes the image takes up 100% of the container's width without padding or borders. If padding/borders are added to `.photo-item` in the future, the math formula will need to account for them.

## Conclusion
1. **content-visibility**: Remove `content-visibility: auto;` from `.photo-item` and apply it only to elements guaranteed to be below the fold, such as `.photos-grid .photo-item:nth-child(n+9)`.
2. **Responsive Grid**: Inside the `@media (max-width: 1024px)` block in `styles/main.css`, explicitly reset wide items: `.mosaic-grid .photo-item--wide, .mosaic-grid .photo-item--featured { grid-column: auto; }`.
3. **Reflow Optimization**: Refactor `resizeAllGridItems` in `scripts/main.js` to read `items[0].getBoundingClientRect().width` once, and compute heights using the `img.naturalWidth / img.naturalHeight` aspect ratio. 

## Verification Method
- **Scope 1**: Inspect the first 4-6 images in the gallery using Chrome DevTools. Verify they do not have `content-visibility: auto` computed, ensuring LCP is not delayed.
- **Scope 2**: Resize the browser width to 900px. Verify that featured images fit into one column of the 2-column layout and no large blank vertical gaps appear.
- **Scope 3**: Use the Chrome DevTools Performance panel to record a viewport resize. In the Main thread flame chart, verify there are no "Recalculate Style" or "Layout" warnings (red triangles) caused by Forced Synchronous Layout inside `resizeAllGridItems`.
