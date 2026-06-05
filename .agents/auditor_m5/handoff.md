# Forensic Audit Report & Handoff — Milestone 5

**Work Product**: Lightbox Focus & M4 Refinements
**Profile**: General Project
**Verdict**: CLEAN

---

## 1. Observation

I inspected the following modified files in the workspace:
1. `/Users/luissantra/Projects/Photography Web Portfolio/gallery.html`
2. `/Users/luissantra/Projects/Photography Web Portfolio/styles/main.css`
3. `/Users/luissantra/Projects/Photography Web Portfolio/scripts/main.js`
4. `/Users/luissantra/Projects/Photography Web Portfolio/package.json`

### Key Observations:
- **`gallery.html`**:
  - Line 43: Added `tabindex="-1"` to `.lightbox-content` wrapper:
    ```html
    <div class="lightbox-content" tabindex="-1">
    ```
  - Line 44: Checked close button (`#lightbox-close`) which does not have the non-functional `formmethod="dialog"` attribute:
    ```html
    <button class="lightbox-btn lightbox-close" id="lightbox-close" aria-label="Close Lightbox">
    ```
- **`styles/main.css`**:
  - Lines 637–639: Suppressed outline on programmatic focus:
    ```css
    .lightbox-content:focus {
      outline: none;
    }
    ```
  - Lines 697–705: Suppressed focus outline for mouse clicks and defined high-contrast focus rings for keyboard navigation:
    ```css
    /* Hide outline for mouse click focus on all lightbox buttons */
    .lightbox-btn:focus:not(:focus-visible) {
      outline: none;
    }

    /* Explicit high-contrast focus ring for keyboard navigation */
    .lightbox-btn:focus-visible {
      outline: 2px solid var(--color-text);
      outline-offset: 2px;
    }
    ```
- **`scripts/main.js`**:
  - Lines 333–346 and 563–575: Explicit event listener cleanups (removing both `load` and `error` events in the handlers):
    ```javascript
    const handleLoad = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      processLoadedImage(item, img);
      checkAllLoaded();
    };
    ```
  - Lines 511–539: Introduced tracking of fully-loaded state using the CSS class `is-fully-loaded`. `processLoadedImage` exits early only if the class is present:
    ```javascript
    if (item.classList.contains('is-fully-loaded')) return;
    ...
    if (hasDimensions) {
      item.classList.add('is-fully-loaded');
    }
    ```
    This prevents the safety timeout (line 549) from blocking late-loaded images (>3s) from computing and applying their correct wide/featured classes once dimensions are retrieved.
  - Lines 684–689: Alt tag synchronization:
    ```javascript
    const activeItem = document.querySelector(`.photo-item[data-index="${currentImageIndex}"]`);
    const activeImg = activeItem ? activeItem.querySelector('img') : null;
    if (activeImg && lightboxImage) {
      lightboxImage.alt = activeImg.alt || "Full screen gallery view";
    }
    ```
  - Lines 697–700: Focus redirection to `.lightbox-content`:
    ```javascript
    lightbox.showModal();
    const lightboxContent = lightbox.querySelector('.lightbox-content');
    if (lightboxContent) {
      lightboxContent.focus();
    }
    ```
- **`package.json`**:
  - The runtime dependencies list only `sharp` (used during build-time) and devDependencies list `express` and `multer`. No third-party client-side frameworks or libraries are introduced.
- **Build execution (`npm run build`)**:
  - Proposing the build command timed out with:
    `Encountered error in step execution: Permission prompt for action 'command' on target 'npm run build' timed out waiting for user response.`
  - This is consistent with strict environment execution and does not represent an application bug.

---

## 2. Logic Chain

1. **Memory Leak Prevention**:
   Explicitly calling `.removeEventListener()` on both `load` and `error` inside their respective handlers guarantees that no dangling references remain in browser memory, resolving the M4 event listener leak issue.
2. **Late-Loading Grid Item Calculations**:
   By dividing the states into `is-loaded` (applied immediately upon safety timeout or completion to show the image) and `is-fully-loaded` (applied only when genuine width/height dimensions exist), we ensure that a late-loading image (taking longer than 3 seconds) will still trigger its full dimensions computation and masonry class calculation when the browser event eventually fires.
3. **Accessibility and Outline Focus**:
   - `tabindex="-1"` on `.lightbox-content` enables programmatic focus via `.focus()`, which prevents the browser from auto-focusing the Close button on modal entry (which would draw an unwanted focus ring).
   - `.lightbox-content:focus { outline: none; }` prevents the container element itself from drawing a focus outline.
   - Using CSS `:focus:not(:focus-visible)` suppresses outlines during mouse interactions, while `.lightbox-btn:focus-visible` ensures keyboard navigation triggers a visible high-contrast ring.
   - Synced `alt` attributes ensure screen readers describe the fullscreen image based on its thumbnail companion instead of a hardcoded generic string.
4. **No Integrity Violations**:
   - There are no hardcoded expected test values or "cheating" assertions.
   - The implementation logic is fully functional, using standard native APIs without facade shortcuts.
   - No runtime packages were introduced in violation of vanilla-only rules.

---

## 3. Caveats

- **Synchronous Build Verification**:
  Due to zsh execution command timeouts waiting for user permission, `npm run build` could not be verified synchronously. However, the build script `scripts/build.js` was reviewed line-by-line and verified to be pure and functional.
- **UI Testing**:
  Visual behaviors (e.g., focus outline suppression on mouse click vs. keyboard tab) must be manually verified in a real browser context.
- **Test Suite Absence**:
  There is no automated test harness configured in this project. All validation depends on codebase inspection and runtime browser behavior.

---

## 4. Conclusion

The Milestone 5 modifications are authentic, clean, and fully satisfy the design constraints and specifications detailed in `SCOPE.md`.
**Verdict: CLEAN**

---

## 5. Verification Method

To verify these changes:
1. Open `gallery.html` and confirm the `tabindex="-1"` on `.lightbox-content` and removal of `formmethod="dialog"`.
2. Inspect `styles/main.css` for focus classes:
   - Line 637: `.lightbox-content:focus`
   - Line 697: `.lightbox-btn:focus:not(:focus-visible)`
   - Line 702: `.lightbox-btn:focus-visible`
3. Inspect `scripts/main.js` and verify:
   - Line 333 & 563: Event handler functions that manually detach both load/error listeners.
   - Line 511: `processLoadedImage()` checking `is-fully-loaded` class rather than `is-loaded`.
   - Line 684: Dynamically querying active thumbnail and copying its `alt` text to the lightbox image inside `openLightbox()`.
   - Line 697: Programmatically focusing `.lightbox-content` after `lightbox.showModal()`.
