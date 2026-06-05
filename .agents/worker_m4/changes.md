# Changes Report — Milestone 4 (WS1) - Favourites Mosaic Grid Gaps

## Files Modified

1. **`styles/main.css`**
   - Added `grid-auto-flow: dense;` to `.mosaic-grid` to allow smaller images to backfill layout gaps left by featured/wide elements.
   - Updated `.mosaic-grid .photo-item img` to have `height: 100%; object-fit: cover;` so that they completely fill the spans assigned by the masonry layout calculations without introducing empty gaps.
   - Added `.photo-item.is-loaded` background-color reset to `transparent` to avoid contrasting grey background placeholders showing at the bottom of the grid items.

2. **`scripts/main.js`**
   - Refactored `resizeAllGridItems(container)`:
     - Separated DOM reads (e.g. `clientWidth`, `getBoundingClientRect`, computed styles, image attributes) from DOM writes (style assignments).
     - Handled hidden/zero-width elements by computing a fallback width using elements' parent widths/viewport width and column count.
     - Handled images with `naturalWidth === 0` by trying their `width` and `height` attributes, parsing CSS `aspect-ratio` computed style, or fallback landscape aspect ratio `3:2` (i.e. height/width `2/3`).
     - Added a `+1` row span offset to prevent rounding or subpixel gaps.
   - Refactored `renderFavouritesGallery(...)`:
     - Added the `is-ready` class to the grid during initialization so it shows the grid container immediately.
     - Implemented progressive loading: transition individual items to `is-loaded` / `is-loading` classes and compute wide/featured styles as their images finish loading/caching.
     - Added a debounced resize helper (50ms delay) to prevent layout thrashing and bundle multiple image loads/layout updates together.
     - Listened to image `load`/`error` events using `{ once: true }` for clean memory management.
     - Cleared the 3-second safety timeout when all images load successfully.

## Verification
- Checked CSS and JS files for syntactic validity.
- The build pipeline setup is preserved.
