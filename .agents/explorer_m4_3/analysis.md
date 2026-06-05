# Performance and Debouncing Analysis of `resizeAllGridItems`

This report analyzes the performance, debouncing, loading mechanics, layout thrashing, and memory leak risks of `resizeAllGridItems()` in the Photography Web Portfolio codebase, and details a progressive, debounced fix strategy.

---

## 1. Executive Summary

- **Current Behavior**: The masonry grid (`.mosaic-grid`) is hidden (`opacity: 0`) until all images have either loaded or the 3-second safety timeout fires. This prevents progressive rendering. Additionally, resize events are debounced, but image load events are NOT debounced or progressively rendered—they are handled as a single blocking barrier.
- **Identified Issues**:
  1. **Poor UX (Non-Progressive Loading)**: Any single slow image blocks the rendering of the entire grid.
  2. **Layout Thrashing Risks**: If progressive load events were attached without debouncing, multiple consecutive calls to `resizeAllGridItems` would trigger sequential DOM reads (`getBoundingClientRect()`) and writes (`gridRowEnd`), causing forced synchronous layout/reflow.
  3. **Memory Leaks**: Image `load` and `error` listeners are never removed after firing, and the 3-second safety timeout is never cleared if all images load early.
- **Proposed Fix Strategy**: 
  - Show the grid immediately (`opacity: 1`) with placeholder cards.
  - Settle images progressively by attaching `{ once: true }` listeners for `load`/`error` events.
  - Coalesce progressive resizing using a debounced resize wrapper (`50ms` delay) to prevent layout thrashing.
  - Clean up the safety timeout and resize listeners appropriately to avoid memory leaks.

---

## 2. Current Implementation Analysis

### 2.1 Performance Profile of `resizeAllGridItems()`
The function is located at `scripts/main.js` (lines 345–373):
```javascript
function resizeAllGridItems(container) {
  const grid = container.querySelector('.mosaic-grid') || document.querySelector('.mosaic-grid');
  if (!grid || grid.classList.contains('is-classic')) return;

  const items = grid.querySelectorAll('.photo-item');
  
  // Batch DOM reads: Get all computed heights and gaps mathematically
  const rowHeight = 10;
  const gapStr = window.getComputedStyle(grid).getPropertyValue('row-gap');
  const rowGap = parseInt(gapStr) || 0;
  
  const measurements = Array.from(items).map(item => {
    const img = item.querySelector('img');
    const dim = item.getBoundingClientRect(); // FORCES REFLOW (DOM Read)
    if (!img || !(img.naturalWidth > 0)) return { calculatedHeight: 0 };
    const calculatedHeight = dim.width * (img.naturalHeight / img.naturalWidth);
    return { calculatedHeight };
  });

  // Batch DOM writes: Set new spans and contain-intrinsic-size
  items.forEach((item, i) => {
    const { calculatedHeight } = measurements[i];
    if (calculatedHeight > 0) {
      const rowSpan = Math.ceil((calculatedHeight + rowGap) / (rowHeight + rowGap));
      item.style.gridRowEnd = `span ${rowSpan}`; // DOM Write
      item.style.containIntrinsicSize = 'auto none auto ' + Math.round(calculatedHeight) + 'px'; // DOM Write
    }
  });
}
```

- **Read/Write Split**: Inside `resizeAllGridItems`, style reads and writes are clean. The first loop does all DOM reads (`getBoundingClientRect` and `getComputedStyle`), and the second loop does all style writes (`gridRowEnd` and `containIntrinsicSize`). This avoids layout thrashing *within a single execution* of the function.
- **Inter-execution Thrashing**: If `resizeAllGridItems` is called multiple times back-to-back (e.g. sequentially as multiple images load or during rapid resize events), the writes from the first execution will dirty the layout. The next execution will then immediately call `getBoundingClientRect()`, forcing a synchronous style recalculation and reflow.

### 2.2 Resize and Load Listener Attachment
- **Resize Listeners**:
  Attached in `renderFavouritesGallery` (lines 507–519):
  ```javascript
  // Debounced resize listener
  if (resizeController) {
    resizeController.abort();
  }
  resizeController = new AbortController();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeAllGridItems(container);
    }, 150);
  }, { signal: resizeController.signal });
  ```
  *Analysis*: The resize listener is debounced by 150ms and uses an `AbortController` to abort previous listeners when rebuilding the gallery. This is performant and prevents event listener leakage on rebuild.
- **Load Listeners**:
  Attached in `renderFavouritesGallery` (lines 483–495):
  ```javascript
  allImgs.forEach(img => {
    if (img.complete) {
      loadedCount++;
      const item = img.parentElement;
      if (item) {
        item.classList.remove('is-loading');
        item.classList.add('is-loaded');
      }
    } else {
      img.addEventListener('load', onImageSettled);
      img.addEventListener('error', onImageSettled);
    }
  });
  ```
  *Analysis*:
  1. **All-or-Nothing Finalization**: `onImageSettled` calls `finalizeGrid()` only when `loadedCount >= totalImages`. There is no progressive recalculation as individual images load.
  2. **Non-Removed Listeners**: The `load` and `error` event listeners on images are never removed after firing.
  3. **Safety Timeout Leak**: A 3-second safety timeout is scheduled to call `finalizeGrid()`. If all images load in 200ms, the safety timeout is never cleared; it still fires at 3000ms (though it returns early because of a `hasFinalized` guard, the timeout handle is leaked until execution).

---

## 3. Potential Performance Issues & Memory Leaks

1. **UX Blocking**: Since the `.mosaic-grid` is initialized with `opacity: 0` and is only set to `opacity: 1` inside `finalizeGrid`, any delay in loading a single image blocks the rendering of the entire page content.
2. **Forced Reflow / Layout Thrashing**: If progressive sizing were implemented naively by calling `resizeAllGridItems(container)` directly inside `onImageSettled`, every image load event would immediately trigger a full recalculation. Multiple images loading in the same frame (e.g. from cache or parallel network requests) would cause severe layout thrashing because the DOM write phase of one handler would run right before the DOM read phase of the next.
3. **Event Listener Bloat**: Attaching event listeners without `{ once: true }` or manual `removeEventListener` leaves event listener attachments in memory on the image elements, even after they have already loaded.

---

## 4. Proposed Fix Strategy

To enable a highly performant, progressive, layout-safe, and memory-safe grid layout, we propose the following changes:

### 4.1 Progressive Grid Visibility
- Set `.mosaic-grid` to be visible immediately (add the `.is-ready` class to the grid during initialization).
- Individual `.photo-item` elements will display their loading placeholders (`background-color: var(--color-surface)`) immediately. As each image loads, it will fade in smoothly.

### 4.2 Progressive Aspect Ratio & Sizing (Coalesced Debounce)
- Define a module-scoped debounced wrapper for `resizeAllGridItems` with a short delay (e.g., `50ms`) to group multiple image load events into a single layout pass.
- As each image settles (either synchronously if complete, or asynchronously via event listeners), transition it to `is-loaded`, apply its featured/aspect-ratio class based on its `naturalWidth` / `naturalHeight`, and queue the debounced layout resize.

### 4.3 Memory Leak Mitigation
- Bind load/error events using the `{ once: true }` event listener option, ensuring the browser automatically removes them after execution.
- Clear the safety timeout immediately if all images load before the 3-second mark.

### 4.4 Refactored Implementation Design

Below is the proposed implementation pattern for `renderFavouritesGallery` in `scripts/main.js`:

```javascript
function renderFavouritesGallery(galleries, container) {
  // ... (rendering HTML and injecting the grid container) ...

  const grid = container.querySelector('.mosaic-grid');
  const allImgs = container.querySelectorAll('.photo-item img');
  const totalImages = allImgs.length;
  let settledCount = 0;
  
  // Shared debounced resize timer
  let resizeTimer;
  function triggerDebouncedResize(delay = 50) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeAllGridItems(container);
    }, delay);
  }

  // 1. Show the grid immediately for progressive layout rendering
  grid.classList.add('is-ready');

  // Helper to determine featured layout classes based on aspect ratio
  function initializeFeaturedClass(item, img) {
    if (!img || !img.naturalWidth) return;
    if (item.getAttribute('data-featured') === 'true') {
      const ratio = img.naturalWidth / img.naturalHeight;
      if (ratio > 1.2) {
        item.classList.add('photo-item--wide');
      } else if (ratio < 0.8) {
        // Vertical: keep 1 column, natural height makes it stand out
      } else {
        item.classList.add('photo-item--featured');
      }
    }
  }

  // Handler for when an image settles (loaded or error)
  function handleImageSettled(item, img) {
    settledCount++;
    
    // Animate item entry
    item.classList.remove('is-loading');
    item.classList.add('is-loaded');
    
    // Apply layout constraints
    initializeFeaturedClass(item, img);
    
    // Coalesce multiple progressive resizes into a single frame
    triggerDebouncedResize(50);

    // Clear safety timeout if all images settled early
    if (settledCount >= totalImages) {
      clearTimeout(safetyTimeoutId);
    }
  }

  // Safety timeout: force resize fallback after 3 seconds in case of network drops
  const safetyTimeoutId = setTimeout(() => {
    triggerDebouncedResize(0);
  }, 3000);

  // Attach progressive listeners using once: true
  allImgs.forEach(img => {
    const item = img.parentElement;
    if (img.complete) {
      handleImageSettled(item, img);
    } else {
      const settleHandler = () => handleImageSettled(item, img);
      
      img.addEventListener('load', settleHandler, { once: true });
      img.addEventListener('error', settleHandler, { once: true });
    }
  });

  // Debounced window resize listener (using AbortController signal)
  if (resizeController) {
    resizeController.abort();
  }
  resizeController = new AbortController();

  let windowResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(windowResizeTimer);
    windowResizeTimer = setTimeout(() => {
      resizeAllGridItems(container);
    }, 150);
  }, { signal: resizeController.signal });

  // ... (Toggle buttons and lightbox initialization) ...
}
```

---

## 5. Verification Plan

To verify that the refactored code performs correctly without layout thrashing:
1. **Performance Timeline Auditing**:
   - Open Chrome DevTools and navigate to the **Performance** tab.
   - Start recording and reload the gallery page.
   - Observe the loading sequence. Verify that "Forced Reflow" or "Forced Synchronous Layout" warnings (red triangle flags in the flame graph) are absent during image loading.
   - Verify that the total number of style recalculations matches the debounced triggers (only a few layout passes instead of 30 sequential passes).
2. **Visual Inspection**:
   - Throttle the network to "Fast 3G" or "Slow 3G" in DevTools Network tab.
   - Observe that placeholder cards are visible immediately, and each image fades in and reflows into its correct masonry span progressively as it finishes loading.
3. **Memory Analysis**:
   - Take a Heap Snapshot before and after reloading/toggling the mosaic view.
   - Check for detached DOM nodes or leaked event listeners matching `settleHandler`. Verify they are collected correctly since `{ once: true }` removes them automatically upon firing.
