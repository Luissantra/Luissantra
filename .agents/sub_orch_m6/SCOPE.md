# Scope: Milestone 6 — Web Optimization & Scroll Reveal Toggle

## Architecture
- `index.html`: Header navigation with toggle button, theme meta tags in head.
- `gallery.html`: Header navigation with toggle button, theme meta tags in head.
- `styles/main.css`: Color scheme variables, scroll animation styles, transition durations, layout toggling, button styles.
- `scripts/main.js`: Scroll animation init (UI toggle, class toggle, localStorage persistence), carousel transitionend refactoring, lightbox backdrop check feature detection.

## Work Items / Acceptance Criteria

### 1. Theme and Color Scheme Declarations
- Declare `color-scheme: light` in `:root` and `color-scheme: dark` in `[data-theme="dark"]` in `styles/main.css`.
- Add light and dark theme meta tags to `index.html` and `gallery.html` in the `<head>` section:
  ```html
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)">
  ```

### 2. Scroll-Driven Reveal Animations & UI Toggle
- Add scroll-reveal animations to the CSS in `styles/main.css` using `@supports (animation-timeline: view())` and media queries wrapping it in `(prefers-reduced-motion: no-preference)`.
- Apply these reveal animations to `.gallery-card`, `.photo-item`, and `.section-title` ONLY when the `<html>` element has the class `.scroll-animations-enabled`.
- Add a new UI control button (`#animation-toggle`) in the header next to the theme toggle in both `index.html` and `gallery.html`.
- Style `#animation-toggle` in `styles/main.css` to match `#theme-toggle` layout and feel.
- Implement the toggle behavior in `scripts/main.js` (`initScrollAnimations()`):
  - Read persisted setting from `localStorage.getItem('scroll-animations')`.
  - Default to `true` (enabled) on first visit if system does not request reduced motion (`prefers-reduced-motion: reduce` is false).
  - Dynamically add/remove class `scroll-animations-enabled` on the `<html>` element.
  - Sync the `aria-pressed` attribute on `#animation-toggle` (`"true"` if enabled, `"false"` if disabled).
  - Sync the icon inside `#animation-toggle` using an SVG representing flow/motion.
  - Handle clicks to toggle the setting, persist it to `localStorage`, and toggle class/ARIA attributes.

### 3. Native Light Dismiss Dialog & Backdrop Fallback
- Modify the lightbox dialog click event listener in `scripts/main.js` (inside `initLightbox()`):
  - Check for native browser support of `closedby="any"` feature using `'closedBy' in HTMLDialogElement.prototype`.
  - If native support exists, do NOT attach the manual backdrop click listener (avoid redundant trigger).
  - If native support does NOT exist, attach the backdrop click listener as a fallback.

### 4. Transition-Based Favourites Carousel
- In `scripts/main.js` (`initHomePage()`), refactor the favourites cover image carousel interval.
- Replace `setTimeout` with a transition-based listener (`transitionend` on `opacity`).
- When the interval fires, set `opacity = '0'` on the cover image element.
- Listen for `transitionend` event (once: true). In the event handler, verify `e.propertyName === 'opacity'`, then update `imgEl.src = newSrc`, and on `imgEl.onload` / `imgEl.onerror` set `opacity = '1'`.
- Ensure transition handlers are clean and do not leak.

## Verification Criteria
- All tests and checks must compile and pass.
- No regression on the Favourites carousel, lightbox, or grid layout.
- Scroll animations must only play when enabled and `prefers-reduced-motion` is not active.
- Lightbox must close on backdrop click both in modern browsers (native `closedby`) and fallback.
