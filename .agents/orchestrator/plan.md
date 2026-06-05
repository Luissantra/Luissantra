# Plan - Web Portfolio Optimizations (Follow-up)

This plan outlines the steps to implement the follow-up requests (WS1 - WS4) for the Photography Web Portfolio.

## Milestones

### Milestone 1: Favourites Mosaic Grid Gaps (WS1)
- **Objective**: Fix black gaps and overlaps in the mosaic grid.
- **Tasks**:
  1. Modify `resizeAllGridItems()` in `main.js` to handle `naturalWidth === 0` by using width/height attributes or standard aspect-ratio fallbacks.
  2. Implement progressive grid recalculations on image `load` events with debouncing.
  3. Apply `+1` offset to grid row calculation rounding.
  4. Add `grid-auto-flow: dense` and background color adjustments in `main.css`.
- **Verification**: Check mosaic grid on multiple viewport sizes, verify no overlaps/gaps.

### Milestone 2: Lightbox Close Button Focus Fix (WS2)
- **Objective**: Fix outline issues on lightbox close button.
- **Tasks**:
  1. Prevent default browser focus ring on close button upon mouse click.
  2. Redirect initial focus to `.lightbox-content` (add `tabindex="-1"` in HTML or dynamically) after `lightbox.showModal()`.
  3. CSS rules `:focus:not(:focus-visible)` in `main.css` to hide outline for mouse clicks while keeping keyboard accessibility.
  4. Remove redundant `formmethod="dialog"` on close button from `gallery.html` if it causes issues.
- **Verification**: Verify no outline on mouse click, but focus outline is visible when navigating via keyboard (Tab).

### Milestone 3: Web Optimization & Scroll Reveal Toggle (WS3)
- **Objective**: Declare color scheme, scroll-driven animations (optional), native closedby fallback, transitionend carousel.
- **Tasks**:
  1. Declare `color-scheme: light` and `color-scheme: dark` in CSS. Add light/dark theme meta tags to `index.html` and `gallery.html`.
  2. Implement CSS scroll-driven reveal animations using `@supports (animation-timeline: view())` wrapped in `prefers-reduced-motion: no-preference`.
  3. Implement toggle control for scroll animations in the header (button/checkbox), persists choice in `localStorage`. Only apply animations when `<html>` has class `.scroll-animations-enabled`.
  4. Convert manual backdrop click handler on lightbox `<dialog>` to fallback only when `closedby` is not supported (i.e. check if HTMLDialogElement supports `closedby` attribute or behaves correctly).
  5. Replace `setTimeout` with `transitionend` listener in favourites carousel.
- **Verification**: Scroll reveal works when enabled, respects reduced-motion. Toggle persists on reload. Favourites carousel transitions using `transitionend`. Lightbox dismisses correctly.

### Milestone 4: Rich Interactivity & Animations (WS4)
- **Objective**: Add hover effects, starting styles, preloading, lightbox image crossfade, keyboard shortcuts.
- **Tasks**:
  1. Subtle gradient overlay hover effect on portfolio thumbnails.
  2. `@starting-style` transitions for lightbox opening (fade-in and scale-up).
  3. Transition background/color themes (`body`).
  4. Global `scroll-padding-top` on root element.
  5. Smart preloading of adjacent (prev/next) images when lightbox is open.
  6. Smooth image crossfade inside the lightbox using a temporary secondary image node.
  7. Keyboard navigation `j`/`k` to scroll smoothly between homepage sections.
- **Verification**: All hover, transitons, preloading, crossfade, and key scroll work.

### Milestone 5: E2E and Integration Verification
- **Objective**: Run full E2E validation against the acceptance criteria, run visual regression checks, and ensure no console errors.
