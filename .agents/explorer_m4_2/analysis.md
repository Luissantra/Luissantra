# Masonry Grid Layout Analysis and Proposed Fixes

This document details the analysis of the photography portfolio's masonry grid layout in `styles/main.css` and `scripts/main.js`. It outlines the causes of current layout issues—such as visual gaps and overlaps—and proposes a concrete implementation strategy.

---

## 1. Masonry Grid Dense Flow (`grid-auto-flow: dense`)

### Observation & Analysis
In `styles/main.css`, the `.mosaic-grid` class sets up the CSS Grid for the Favourites mosaic page:
```css
.mosaic-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 10px;
  gap: calc(var(--space-sm) * 2 / 3);
  padding: 0;
  align-items: start;
  opacity: 0;
  transition: opacity 0.4s ease;
}
```

The gallery includes featured/wide items that span two columns:
```css
.mosaic-grid .photo-item--wide {
  grid-column: span 2;
}
.mosaic-grid .photo-item--featured {
  grid-column: span 2;
}
```

By default, the browser's CSS Grid auto-placement algorithm uses `grid-auto-flow: row`. It places items sequentially. When it encounters a multi-column item (`span 2`) that cannot fit in the remaining columns of the current row, it pushes it to the next row, leaving empty grid cells behind. Because the page background color is very dark (`#0a0a0a` in dark mode), these empty slots appear as **large visual black gaps**.

### Proposed Fix
We should add `grid-auto-flow: dense;` to the `.mosaic-grid` class definition in `styles/main.css`. This directs the grid engine to pack items densely, filling in empty cells with subsequent single-column items.

```css
.mosaic-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 10px;
  grid-auto-flow: dense; /* Fill in empty slots with smaller items */
  gap: calc(var(--space-sm) * 2 / 3);
  padding: 0;
  align-items: start;
  opacity: 0;
  transition: opacity 0.4s ease;
}
```

---

## 2. Background Color Adjustments to Eliminate Gaps

### Observation & Analysis
In `styles/main.css`, `.photo-item` and `.photo-item img` are styled as follows:
```css
.photo-item {
  position: relative;
  overflow: hidden;
  cursor: zoom-in;
  border-radius: var(--radius-sm);
  background-color: var(--color-surface); /* Placeholder while loading: #f7f7f7 (light), #141414 (dark) */
  width: 100%;
}

.mosaic-grid .photo-item img {
  width: 100%;
  height: auto;
  display: block;
}
```

When an image loads, it is displayed with `height: auto`. However, the height of its container (`.photo-item`) is determined by the `grid-row-end` span style. Because `grid-row-end` spans are integers calculated in JS, they rarely match the exact subpixel height of the image. 

- This subpixel mismatch leaves a tiny gap at the bottom of the container.
- If we increase the row span calculation (e.g. by adding an offset of `+1` to prevent overlaps), the gap at the bottom becomes much larger (around 10px to 18px).
- Since the container has `background-color: var(--color-surface);`, this gap is visible as a contrasting gray block (especially in light mode where the background is white but the gap shows `#f7f7f7` gray).

### Proposed Fix
To eliminate these internal visual gaps, we should implement a two-part styling fix:

1. **Cover container height with the image**: Change the image inside the mosaic grid to fill the container and crop/scale slightly using `object-fit: cover`.
   ```css
   .mosaic-grid .photo-item img {
     width: 100%;
     height: 100%;
     object-fit: cover;
     display: block;
   }
   ```
2. **Reset the background color after load**: Change the container's background to `transparent` once the image has loaded, ensuring that any subpixel boundary gaps match the surrounding page theme background color.
   ```css
   .photo-item.is-loaded {
     background-color: transparent;
   }
   ```

---

## 3. JavaScript Rounding Math Offset in `resizeAllGridItems()`

### Observation & Analysis
In `scripts/main.js`, `resizeAllGridItems()` calculates grid spans using:
```javascript
const rowSpan = Math.ceil((calculatedHeight + rowGap) / (rowHeight + rowGap));
item.style.gridRowEnd = `span ${rowSpan}`;
```

Using `Math.ceil()` maps the height to the next full grid row. Due to subpixel rounding, text wrapping, border widths, or dynamic scaling, the height calculated in JS can sometimes be slightly smaller than what the browser needs to render the item, resulting in vertical overlaps with items in rows below.

### Proposed Fix
Apply a `+1` offset to the calculated `rowSpan`. This creates a reliable safety buffer (one extra grid row span, roughly 10px-18px) to guarantee that adjacent items never overlap.

```javascript
// Add +1 safety buffer to prevent overlaps
const rowSpan = Math.ceil((calculatedHeight + rowGap) / (rowHeight + rowGap)) + 1;
item.style.gridRowEnd = `span ${rowSpan}`;
```

*Note: As noted in Section 2, adding this +1 offset makes the container taller than the image's original aspect ratio. Therefore, applying the `height: 100%` and `object-fit: cover` styles to `.mosaic-grid .photo-item img` is mandatory to prevent the extra row height from displaying as an empty background gap.*

---

## 4. Summary of Proposed Changes (Diff View)

### Proposed patch for `styles/main.css`
```diff
diff --git a/styles/main.css b/styles/main.css
--- a/styles/main.css
+++ b/styles/main.css
@@ -418,6 +418,7 @@
 .mosaic-grid {
   display: grid;
   grid-template-columns: repeat(3, 1fr);
   grid-auto-rows: 10px;
+  grid-auto-flow: dense;
   gap: calc(var(--space-sm) * 2 / 3);
   padding: 0;
   align-items: start;
@@ -507,7 +508,8 @@
 .mosaic-grid .photo-item img {
   width: 100%;
-  height: auto;
+  height: 100%;
+  object-fit: cover;
   display: block;
 }
 
+ .photo-item.is-loaded {
+   background-color: transparent;
+ }
```

### Proposed patch for `scripts/main.js`
```diff
diff --git a/scripts/main.js b/scripts/main.js
--- a/scripts/main.js
+++ b/scripts/main.js
@@ -365,7 +365,7 @@
     items.forEach((item, i) => {
       const { calculatedHeight } = measurements[i];
       if (calculatedHeight > 0) {
-        const rowSpan = Math.ceil((calculatedHeight + rowGap) / (rowHeight + rowGap));
+        const rowSpan = Math.ceil((calculatedHeight + rowGap) / (rowHeight + rowGap)) + 1;
         item.style.gridRowEnd = `span ${rowSpan}`;
         item.style.containIntrinsicSize = 'auto none auto ' + Math.round(calculatedHeight) + 'px';
       }
```
