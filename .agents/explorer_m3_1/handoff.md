# Milestone 3 Investigation Report: Favorites Carousel Fixes

## 1. Observation
- **Observation 1 (Memory Leak - Carousel):** In `scripts/main.js:185`, `const carouselIntervalId = setInterval(...)` is declared inside a block in `initHomePage()`. There is no cleanup (`clearInterval`) when `initHomePage()` is re-executed or when the user navigates to the gallery view.
- **Observation 2 (Memory Leak - Resize Listener):** In `scripts/main.js:484` within `renderFavouritesGallery()`, `window.addEventListener('resize', () => { ... })` uses an anonymous function. This listener is attached every time the gallery is rendered but never removed.
- **Observation 3 (Duplicate Images):** In `scripts/main.js:188`, `const randomIndex = Math.floor(Math.random() * favImages.length);` does not check against the previously shown image index.
- **Observation 4 (Reduced Motion):** In `scripts/main.js:184`, the interval is set unconditionally `if (favImages.length > 1)`. `prefers-reduced-motion` is not checked.

## 2. Logic Chain
- Because `carouselIntervalId` is a local block-scoped variable, it cannot be cleared globally. Moving its declaration to the outer scope (e.g., module level) will allow `clearInterval(carouselIntervalId)` to be called at the beginning of `initHomePage()`.
- Because the `resize` listener is an anonymous function, `removeEventListener` cannot target it. Refactoring it to a named function stored in the `GalleryManager` scope will allow removing the previous listener before adding a new one.
- The duplication issue can be solved by storing the previous index and using a `do...while` loop (or simple conditional) to pick a new random index that `!== lastIndex`.
- To respect `prefers-reduced-motion`, we can use `window.matchMedia('(prefers-reduced-motion: reduce)').matches` to conditionally avoid starting the `setInterval` animation for the carousel.

## 3. Caveats
- I did not add `history.pushState` logic. The memory leaks happen specifically when functions like `initHomePage` or `initGalleryPage` might be called multiple times without a hard page reload.
- Only the `prefers-reduced-motion` query on initial load will be checked. If the user toggles their OS settings while the page is open, the JS interval won't dynamically stop/start unless we also add an event listener to `window.matchMedia(...)`. A simple check on function execution might be sufficient for the MVP.

## 4. Conclusion
To fulfill M3, the implementer needs to:
1. Declare `let carouselIntervalId = null;` at the top level of `scripts/main.js` and clear it at the start of `initHomePage()`.
2. Keep a `lastIndex` variable within `initHomePage`'s interval callback to ensure the new random index does not equal `lastIndex`.
3. Evaluate `const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;` and only set the carousel interval if it's `false`.
4. In `GalleryManager`, assign the resize handler to a variable (e.g., `let resizeListener = null;`) and call `window.removeEventListener('resize', resizeListener)` before attaching the new one.

## 5. Verification Method
- **Carousel Leak & Duplication:** Add a `console.log` inside the `setInterval` in `scripts/main.js`. Navigate back and forth between Home and Favorites without refreshing; observe that only one interval runs. Observe the `src` attribute of the carousel image to verify it never repeats consecutively.
- **Resize Leak:** Run `getEventListeners(window)` in Chrome DevTools or add a `console.log` inside the resize handler. Resize the window and verify the log only fires for a single listener after navigating multiple times.
- **Reduced Motion:** Emulate "prefers-reduced-motion" in Chrome DevTools (Rendering > Emulate CSS media feature prefers-reduced-motion: reduce). Refresh the page and confirm the `setInterval` does not start.
