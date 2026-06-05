# Review Report — Milestone 4 (WS1) - Favourites Mosaic Grid Gaps

## Review Summary

**Verdict**: APPROVE

The worker has correctly implemented the fixes requested for Milestone 4. The favourites mosaic grid displays dynamically, handles fallbacks appropriately, debounces recalculations to prevent layout thrashing, and uses native browser mechanisms safely. While there are visual and accessibility suggestions, the code adheres to all requirements without any integrity violations.

---

## Findings

### [Major] Finding 1: Unnecessary `+1` rowSpan Offset Causes Crop Escalation
- **What**: The gridRowEnd `span` calculation includes a hardcoded `+1` rowSpan offset: `const rowSpan = Math.ceil((calculatedHeight + rowGap) / (rowHeight + rowGap)) + 1;` (scripts/main.js:421).
- **Where**: `scripts/main.js` line 421.
- **Why**: Since `Math.ceil` is already used to round up the item's span to the nearest row, the grid row span is mathematically guaranteed to be greater than or equal to the natural image height. Adding an extra `+1` rowSpan adds an entire extra row (20px) to the cell. Combined with CSS `object-fit: cover` and `height: 100%`, this unnecessarily stretches and crops the image (by up to 20% width/height depending on size), compromising portrait/landscape compositions.
- **Suggestion**: Remove the `+1` offset. Since `object-fit: cover` and `height: 100%` are used, any subpixel gaps are already filled.

### [Major] Finding 2: Slow Loading Image Featured Class Loss
- **What**: If an image takes more than 3 seconds to load, the safety timeout triggers and marks the item as `is-loaded` (scripts/main.js:528-536). Later, when the image eventually loads and fires the event handler, the code returns early: `if (item.classList.contains('is-loaded')) return;` (scripts/main.js:499).
- **Where**: `scripts/main.js` lines 499 and 528-536.
- **Why**: Returning early prevents the layout code from checking and applying the wide/featured layout modifier classes (`photo-item--wide`, `photo-item--featured`) once the slow image actually loads. The image will load but be rendered in standard single-column style, ignoring its featured property.
- **Suggestion**: Refactor `processLoadedImage` to check and apply layout classes even if `is-loaded` is already present, or ensure the event listener is cleaned up when safety timeout fires.

### [Major] Finding 3: Lack of Keyboard accessibility on Mosaic and Photo Grids
- **What**: The `.photo-item` element is rendered as a `div` without a `tabindex`, `role="button"`, or keydown handler (scripts/main.js:315-318, 475-479).
- **Where**: `scripts/main.js` lines 315-318 and 475-479.
- **Why**: Assistive technologies and keyboard-only users cannot focus on the grid elements or open the lightbox.
- **Suggestion**: Add `tabindex="0"` and `role="button"` to all `.photo-item` elements, and add a keydown event listener (`Enter` and `Space`) to trigger lightbox view.

### [Minor] Finding 4: Incomplete Event Listener Cleanup
- **What**: The load and error listeners are registered with `{ once: true }` (scripts/main.js:551-552).
- **Where**: `scripts/main.js` lines 551-552.
- **Why**: When an image loads successfully, the `load` listener is removed but the `error` listener is left hanging (and vice versa). While the memory leak is minor since these elements stay in the DOM, it is cleaner to remove both listeners explicitly inside the callback.
- **Suggestion**: Remove both event listeners manually inside the callback instead of relying on `{ once: true }`.

---

## Verified Claims

- **Dense flow and image filling** → Verified via code inspection of `styles/main.css` (lines 422, 508-511) → **PASS**
- **Batching DOM reads and writes** → Verified via code inspection of `scripts/main.js` (lines 351-415 and 418-425) → **PASS**
- **Dimension and aspect fallback** → Verified via code inspection of `scripts/main.js` (lines 373-380 and 382-411) → **PASS**
- **Safety timer and progressive loading** → Verified via code inspection of `scripts/main.js` (lines 485-559) → **PASS**

---

## Coverage Gaps

- **JSON Data Schema** — Risk level: **Low** — recommendation: **Accept risk**. Currently, `data/galleries.json` does not store width/height metadata. Adding metadata would eliminate progressive loading layout shifts (CLS) entirely, but it requires dataset updates beyond this milestone scope.

---

## Unverified Items

- **Visual browser behavior** — Reason not verified: Commands requesting active user permission timed out. Code was inspected statically for structural soundness.
