# Scope: Milestone 5 (Lightbox Focus & M4 Refinements)

## Architecture
- `gallery.html`: HTML dialog markup for the lightbox and image gallery.
- `styles/main.css`: CSS styling for lightbox overlay, buttons, and focus outlines.
- `scripts/main.js`: JS logic for opening/closing the lightbox, focus redirection, gallery rendering, image preloading, and progressive grid calculations.

## Milestones & Tasks
### Milestone 5: Lightbox Focus (WS2) & M4 Refinements
- **Objective**: Fix keyboard and mouse focus behavior for the Lightbox modal dialog and clean up/fix the progressive grid loading listeners from M4.
- **Tasks**:
  1. **M4 Refinements**:
     - Explicitly remove both `load` and `error` event listeners in `gallery.html` image loading callbacks to prevent memory leaks (do not rely solely on `{ once: true }`).
     - Resolve the safety timeout issue in grid rendering: when the 3-second safety timeout fires, clean up the listeners or allow wide/featured classes to be calculated and applied once the image eventually loads, avoiding the early return bug.
  2. **HTML Cleanup (`gallery.html`)**:
     - Remove the non-functional `formmethod="dialog"` attribute on the close button.
     - Add `tabindex="-1"` to the `.lightbox-content` wrapper to make it programmatically focusable.
  3. **CSS Focus Adjustments (`styles/main.css`)**:
     - Add `.lightbox-content:focus { outline: none; }` to prevent screen-wide outline boxes on programmatic focus.
     - Suppress default outlines for mouse click focus on all lightbox buttons using `:focus:not(:focus-visible) { outline: none; }`.
     - Explicitly define high-contrast focus rings for keyboard navigation on lightbox buttons using `.lightbox-btn:focus-visible`.
  4. **JavaScript Focus Management (`scripts/main.js`)**:
     - Programmatically redirect focus to `.lightbox-content` after calling `lightbox.showModal()`.
     - Enhance accessibility by dynamically updating the `alt` attribute of `#lightbox-image` to match the source thumbnail's `alt` when opening or navigating images.

## Acceptance Criteria
- [ ] No focus rings or outlines are displayed on the close button or other navigation buttons when clicked with a mouse.
- [ ] Tabbing through the open dialog allows keyboard users to focus control buttons, which must display a visible, high-contrast outline.
- [ ] The close button works correctly, and Escape key closes the dialog natively.
- [ ] Keyboard navigation inside the lightbox continues to work correctly.
- [ ] The lightbox image `alt` text matches the current thumbnail image's `alt` text.
- [ ] M4 refinements pass verification: no memory leaks from event listeners, and late-loading images (>3s) have their wide/featured classes correctly computed and applied.

## Reference Materials
- JS Analysis: `.agents/explorer_m5_1_gen2/analysis.md`
- CSS Analysis: `.agents/explorer_m5_2_gen2/analysis.md`
- HTML Analysis: `.agents/explorer_m5_3_gen2/analysis.md`
