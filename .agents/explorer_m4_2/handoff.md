# Handoff Report - Masonry Grid Layout Analysis

## 1. Observation

In `styles/main.css`:
- Line 418: `.mosaic-grid` sets up a 3-column CSS Grid but does not specify a `grid-auto-flow` value, thus defaulting to `row`:
  ```css
  .mosaic-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 10px;
    gap: calc(var(--space-sm) * 2 / 3);
    ...
  }
  ```
- Lines 459-464: Wide items span 2 columns in the grid:
  ```css
  .mosaic-grid .photo-item--wide {
    grid-column: span 2;
  }
  .mosaic-grid .photo-item--featured {
    grid-column: span 2;
  }
  ```
- Lines 567-574: `.photo-item` defines a loading placeholder background:
  ```css
  .photo-item {
    position: relative;
    overflow: hidden;
    cursor: zoom-in;
    border-radius: var(--radius-sm);
    background-color: var(--color-surface); /* Placeholder while loading */
    width: 100%;
  }
  ```
- Lines 507-511: `.mosaic-grid .photo-item img` sets the image's height to `auto`:
  ```css
  .mosaic-grid .photo-item img {
    width: 100%;
    height: auto;
    display: block;
  }
  ```

In `scripts/main.js`:
- Line 368: `resizeAllGridItems()` calculates grid item row spans using `Math.ceil()`:
  ```javascript
  const rowSpan = Math.ceil((calculatedHeight + rowGap) / (rowHeight + rowGap));
  ```

---

## 2. Logic Chain

1. **Grid auto placement**: Without a dense flow, when a 2-column wide item cannot fit on the current row's remaining columns, the CSS Grid engine leaves the slot empty and moves the wide item to the next row. Since the body background is dark, these empty slots appear as **large visual black gaps**. Adding `grid-auto-flow: dense` resolves this by pulling subsequent 1-column items forward to fill the empty slots.
2. **Rounding math & overlaps**: Subpixel rounding during layout rendering can make the calculated height of the grid items slightly smaller than their actual rendered size, resulting in vertical overlaps with items in rows below. Adding a `+1` offset to `rowSpan` in JS creates a safe buffer of one extra grid row to prevent overlaps.
3. **Internal visual gaps**: Adding `+1` to the `rowSpan` makes the grid item container taller than the image's natural aspect ratio. Because the image height is `auto`, this leaves an empty space at the bottom of the container. Since `.photo-item` has `background-color: var(--color-surface)` (which is gray `#f7f7f7` in light mode), this shows up as a contrasting colored stripe below the image.
4. **Fixing internal gaps**: We can solve this by:
   - Setting `height: 100%` and `object-fit: cover` on `.mosaic-grid .photo-item img` so the image expands to cover the extra buffer space.
   - Setting `background-color: transparent` on `.photo-item.is-loaded` to blend any residual subpixel layout margins seamlessly into the page background.

---

## 3. Caveats

- Changing the image style in `.mosaic-grid` to `height: 100%; object-fit: cover` means the image may be cropped by up to a few pixels (typically less than 10-18px) to align with the discrete grid row spans. This is standard masonry behaviour.

---

## 4. Conclusion

The masonry grid issues (empty slots, vertical overlaps, and visual placeholder gaps) can be resolved with four coordinated changes:
1. Add `grid-auto-flow: dense` to `.mosaic-grid` in `styles/main.css`.
2. Update `.mosaic-grid .photo-item img` to `height: 100%; object-fit: cover` in `styles/main.css`.
3. Set `.photo-item.is-loaded` background-color to `transparent` in `styles/main.css`.
4. Add a `+1` offset to the calculated `rowSpan` in `resizeAllGridItems()` in `scripts/main.js`.

---

## 5. Verification Method

To verify these changes:
1. Inspect `styles/main.css` to confirm that:
   - `.mosaic-grid` has `grid-auto-flow: dense;`.
   - `.mosaic-grid .photo-item img` has `height: 100%; object-fit: cover;`.
   - `.photo-item.is-loaded` has `background-color: transparent;`.
2. Inspect `scripts/main.js` to confirm that `rowSpan` calculation in `resizeAllGridItems` has `+ 1` added to it.
3. Load the Favourites page and verify:
   - Grid items pack densely with no empty cells.
   - Images do not overlap vertically.
   - There are no gray background gaps/stripes below images.
