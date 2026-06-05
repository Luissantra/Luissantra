# Masonry Grid Calculations & Load Optimization Analysis

## Executive Summary
This analysis addresses two critical issues in the Masonry Grid (`mosaic-grid`) layout calculation system:
1. **Handling images that are still loading or fail to load (`naturalWidth === 0`)**: The current system ignores these items during grid calculations, causing zero-height collapsing and subsequent layout shifts when images finally load.
2. **Sequential loading experience**: The grid currently remains hidden (`opacity: 0`) and layout recalculations are deferred until *all* images have fully loaded or a 3-second safety timeout is reached. This results in a blank page for several seconds on slower connections.

We propose a robust **Fallback and progressive rendering architecture** that:
- Uses a multi-tiered aspect-ratio resolution hierarchy (Actual Dimensions $\rightarrow$ HTML Attributes $\rightarrow$ CSS `aspect-ratio` $\rightarrow$ Static Fallback) when `naturalWidth === 0` to pre-calculate and reserve layout spaces.
- Reveals the grid immediately, applying layouts progressively using a **debounced event listener** to batch calculations and prevent layout thrashing.

---

## 1. Problem Analysis & Evidence Chain

### 1.1 `naturalWidth === 0` Issue
In `scripts/main.js` (lines 356–362), the height calculation reads:
```javascript
const measurements = Array.from(items).map(item => {
  const img = item.querySelector('img');
  const dim = item.getBoundingClientRect();
  if (!img || !(img.naturalWidth > 0)) return { calculatedHeight: 0 };
  const calculatedHeight = dim.width * (img.naturalHeight / img.naturalWidth);
  return { calculatedHeight };
});
```
* **Observation**: If an image is loading (especially lazy-loaded off-screen items) or fails to load, `img.naturalWidth` is `0`. The current code returns `calculatedHeight: 0`.
* **Impact**: The element gets ignored in the second loop (DOM writing loop):
  ```javascript
  if (calculatedHeight > 0) {
    const rowSpan = Math.ceil((calculatedHeight + rowGap) / (rowHeight + rowGap));
    item.style.gridRowEnd = `span ${rowSpan}`;
    ...
  }
  ```
  Consequently, it does not get a grid span. The element either collapses to height 0 or takes default grid properties, leading to massive layout shifts (LCP/CLS penalty) when the image load event fires and `naturalWidth` suddenly becomes positive.

### 1.2 Non-Progressive Render Block
In `scripts/main.js` (lines 430–505), the grid rendering logic does the following:
* **Observation**: `.mosaic-grid` has `opacity: 0` by default (styled in `styles/main.css` line 425). It only becomes visible when `finalizeGrid` adds `is-ready` (line 467).
* **Observation**: `finalizeGrid` is only triggered when `loadedCount >= totalImages` (line 478) or after a 3000ms safety timeout (line 503).
* **Impact**: Even if 19 out of 20 images load instantly, the user sees a blank white space until the 20th image completes or the 3-second timeout forces rendering.

---

## 2. Proposed Strategy & Resolutions

### 2.1 Multi-Tiered Aspect-Ratio Resolution
To compute placeholder heights for unloaded images, `resizeAllGridItems` should fall back dynamically:
1. **Tier 1 (Actual)**: `img.naturalWidth > 0` $\rightarrow$ Use actual aspect ratio.
2. **Tier 2 (HTML Attributes)**: Check for `width` and `height` attributes on the `<img>` tag.
3. **Tier 3 (CSS Styles)**: Parse the computed CSS `aspect-ratio` on the image element.
4. **Tier 4 (Static Default)**: Apply a default photography aspect ratio (e.g. 3:2 landscape, or ratio of `0.667`).

In addition, if `dim.width` is 0 (due to element being hidden initially), we calculate a fallback column width based on the grid's client width and the number of columns.

### 2.2 Debounced Progressive Calculations
To render progressively:
1. **Early Reveal**: Fade in the grid container immediately (`grid.classList.add('is-ready')`) rather than waiting for all images.
2. **Progressive Layout Classes**: Apply featured classes (`photo-item--wide`, etc.) to individual items as soon as they load.
3. **Debounced Refresh**: Call a debounced layout update function when individual load events fire. This groups rapid multiple image load events (e.g. from cache) into a single repaint.

---

## 3. Proposed Code Modification

### 3.1 `resizeAllGridItems(container)` Optimization
Replace the current implementation with a layout-safe, fallback-aware read/write separation:

```javascript
  function resizeAllGridItems(container) {
    const grid = container.querySelector('.mosaic-grid') || document.querySelector('.mosaic-grid');
    if (!grid || grid.classList.contains('is-classic')) return;

    const items = grid.querySelectorAll('.photo-item');
    
    // Batch DOM reads: Query grid layout variables once
    const rowHeight = 10;
    const gridStyle = window.getComputedStyle(grid);
    const gapStr = gridStyle.getPropertyValue('row-gap');
    const rowGap = parseInt(gapStr) || 0;
    
    // Fallback item width if container or item is currently hidden (dim.width === 0)
    const gridWidth = grid.clientWidth;
    const columnsCount = gridStyle.getPropertyValue('grid-template-columns').split(' ').length || 3;
    const fallbackWidth = gridWidth / columnsCount;
    
    const measurements = Array.from(items).map(item => {
      const img = item.querySelector('img');
      const dim = item.getBoundingClientRect();
      if (!img) return { calculatedHeight: 0 };
      
      let ratio = 0;
      if (img.naturalWidth > 0) {
        ratio = img.naturalHeight / img.naturalWidth;
      } else {
        // Fallback Tier 1: HTML attributes
        const wAttr = parseInt(img.getAttribute('width'));
        const hAttr = parseInt(img.getAttribute('height'));
        if (wAttr > 0 && hAttr > 0) {
          ratio = hAttr / wAttr;
        } else {
          // Fallback Tier 2: CSS aspect-ratio
          const computedStyle = window.getComputedStyle(img);
          const aspect = computedStyle.aspectRatio;
          if (aspect && aspect !== 'auto' && aspect !== 'none') {
            const parts = aspect.split('/').map(p => parseFloat(p.trim()));
            if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
              ratio = parts[1] / parts[0];
            } else {
              const val = parseFloat(aspect);
              if (!isNaN(val) && val > 0) {
                ratio = 1 / val;
              }
            }
          } else {
            // Fallback Tier 3: Standard default photography landscape ratio (3:2 = height 2/3 width)
            ratio = 2 / 3;
          }
        }
      }
      
      const width = dim.width > 0 ? dim.width : fallbackWidth;
      const calculatedHeight = width * ratio;
      return { calculatedHeight };
    });

    // Batch DOM writes: Set new spans and contain-intrinsic-size
    items.forEach((item, i) => {
      const { calculatedHeight } = measurements[i];
      if (calculatedHeight > 0) {
        const rowSpan = Math.ceil((calculatedHeight + rowGap) / (rowHeight + rowGap));
        item.style.gridRowEnd = `span ${rowSpan}`;
        item.style.containIntrinsicSize = 'auto none auto ' + Math.round(calculatedHeight) + 'px';
      }
    });
  }
```

### 3.2 Favourites Gallery Load Logic Optimization
Modify the loader inside `renderFavouritesGallery` to support progressive updates:

```javascript
    container.innerHTML = html;

    const grid = container.querySelector('.mosaic-grid');
    const allImgs = container.querySelectorAll('.photo-item img');
    const totalImages = allImgs.length;
    let loadedCount = 0;
    let hasFinalized = false;

    // Helper to evaluate item dimensions and set classes progressively
    function setupItemDimensions(item, img) {
      if (!img) return;
      
      item.classList.remove('is-loading');
      item.classList.add('is-loaded');

      if (item.getAttribute('data-featured') === 'true' && img.naturalWidth) {
        const ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1.2) {
          item.classList.add('photo-item--wide');
        } else if (ratio < 0.8) {
          // Vertical layout: naturally stretches in single column
        } else {
          item.classList.add('photo-item--featured');
        }
      }
    }

    // Debounced layout calculation trigger
    let progressiveResizeTimer;
    function triggerProgressiveResize() {
      clearTimeout(progressiveResizeTimer);
      progressiveResizeTimer = setTimeout(() => {
        resizeAllGridItems(container);
      }, 50); // 50ms debounce window
    }

    function finalizeGrid() {
      if (hasFinalized) return;
      hasFinalized = true;

      // Ensure all items are resolved
      container.querySelectorAll('.photo-item').forEach(item => {
        const img = item.querySelector('img');
        if (item.classList.contains('is-loading')) {
          setupItemDimensions(item, img);
        }
      });

      // Execute final clean calculations
      resizeAllGridItems(container);
    }

    function onImageSettled() {
      const img = this;
      const item = img.parentElement;
      if (item) {
        setupItemDimensions(item, img);
      }
      loadedCount++;
      
      // Recalculate grid layout progressively as new images load
      triggerProgressiveResize();

      if (loadedCount >= totalImages) {
        finalizeGrid();
      }
    }

    // Bind onload events
    allImgs.forEach(img => {
      if (img.complete) {
        loadedCount++;
        const item = img.parentElement;
        if (item) {
          setupItemDimensions(item, img);
        }
      } else {
        img.addEventListener('load', onImageSettled);
        img.addEventListener('error', onImageSettled);
      }
    });

    // Fade in grid early to allow progressive skeleton rendering
    requestAnimationFrame(() => {
      grid.classList.add('is-ready');
    });

    // Trigger initial layout calculations for already cached/complete images
    if (loadedCount > 0) {
      triggerProgressiveResize();
    }

    // Safety timeout: finalize loading states after 3s
    setTimeout(() => {
      finalizeGrid();
    }, 3000);
```

---

## 4. Verification and Implementation Plan
To verify the proposed modifications:
1. **Pre-requisite Checks**:
   * Inspect current layout behavior in Chrome/Safari devtools under simulated Slow 3G network conditions to observe block-rendering.
2. **After Implementation**:
   * Verify that the grid is immediately visible with colored loading cards sized according to the default 3:2 layout.
   * Verify that individual images fade in and snap to correct dimensions progressively.
   * Verify that no layout thrashing is introduced (verify separation of DOM reads and writes).
