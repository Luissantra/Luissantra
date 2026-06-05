# Project: Photography Web Portfolio Optimizations
# Scope: Global

## Architecture
- `index.html`: Home page with favorites carousel
- `gallery.html`: Masonry grid and layout toggle
- `styles/main.css`: Shared and component styles
- `scripts/main.js`: Core logic for carousel, grid layout, and toggle

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1 - Layout Toggle (R1) | Implement aria-pressed, CSS classes over inline styles, and View Transitions API | none | DONE |
| 2 | M2 - Masonry Grid (R2) | Optimize content-visibility, fix responsive grid span 2, optimize JS reflows in resizeAllGridItems | M1 | DONE |
| 3 | M3 - Favorites Carousel (R3) | Fix memory leaks (intervals/listeners), prevent consecutive duplicate images, respect prefers-reduced-motion | M2 | DONE |
| 4 | M4 - Favourites Mosaic Grid Gaps (WS1) | Handle naturalWidth 0, debounce progressive grid recalculations on load, +1 rounding offset, dense grid style | M3 | DONE |
| 5 | M5 - Lightbox Focus (WS2) | Prevent mouse outline, redirect focus to .lightbox-content, add :focus:not(:focus-visible), remove redundant formmethod | M4 | DONE |
| 6 | M6 - Web Optimization & Scroll Reveal Toggle (WS3) | color-scheme, scroll animations toggleable in UI & localStorage, closedby fallback, transitionend carousel | M5 | PLANNED |
| 7 | M7 - Rich Interactivity & Animations (WS4) | hover gradient, @starting-style lightbox, theme transition, scroll-padding, preloading, crossfade, keyboard shortcuts | M6 | PLANNED |
| 8 | M8 - Verification & Coverage Hardening | Run E2E test suites, audit compliance, verify visual regression checklist | M7 | PLANNED |

## Interface Contracts
### `scripts/main.js` ↔ `styles/main.css`
- M1 will introduce specific classes for the layout toggle instead of JS manipulating `style`.
- M2 will introduce `contain-intrinsic-size` and modify grid behaviors.
- M3 will adjust carousel logic and handle `prefers-reduced-motion` media queries.
- M4 will coordinate `resizeAllGridItems()` dynamic height calculations with `grid-auto-flow: dense` and masonry display styling.
- M5 will coordinate focus redirection in JS with styling outlines using `:focus:not(:focus-visible)` rules.
- M6 will coordinate theme meta tags and transition events with scroll-animation toggles stored in localStorage and applied via `<html>` class.
- M7 will coordinate JS-based adjacent preloading and image crossfade with CSS-based transition styles, hover overlays, and @starting-style.

## Code Layout
- Root directory contains HTML (`index.html`, `gallery.html`).
- CSS is in `styles/main.css`.
- JavaScript is in `scripts/main.js`.
