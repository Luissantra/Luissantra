# Progress

- Last visited: 2026-06-05T13:25:35+02:00
- Analyzed `scripts/main.js` to understand the interval leak, resize event listener, and random selection logic.
- Implemented `let carouselIntervalId = null;` at the top level and added cleanup before starting intervals.
- Added `AbortController` in `GalleryManager` to cleanup resize event listeners.
- Added `do...while` loop to avoid identical consecutive image selections.
- Added logic for `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- Documented changes in `handoff.md`.
