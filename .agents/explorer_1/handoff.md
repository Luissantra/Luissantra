# Handoff Report: Milestone 3 (Favorites Carousel) Investigation

## Observation
1. **Interval Leak:** In `scripts/main.js` (lines 183-205), `carouselIntervalId` is declared as a local `const` within `initHomePage()` and is never cleared. If `initHomePage()` is invoked multiple times, intervals stack up in the background.
2. **Resize Listener Leak:** In `scripts/main.js` (lines 482-488), an anonymous function is added via `window.addEventListener('resize', ...)` during `initGalleryPage()`. Repeated calls add duplicate listeners to the `window` object.
3. **Duplicate Images:** In `scripts/main.js` (lines 187-189), the carousel image is chosen via a simple `Math.random()` call, meaning the same image can be randomly selected twice in a row.
4. **Accessibility (Reduced Motion):** The carousel interval runs unconditionally, ignoring the user's `prefers-reduced-motion` OS setting, which conflicts with modern web accessibility guidelines.

## Logic Chain
1. **Fixing the Interval Leak:** Moving `carouselIntervalId` to a higher scope (e.g., module-level) allows us to call `clearInterval()` at the start of `initHomePage()` before setting a new one, ensuring only one interval runs at a time.
2. **Fixing the Listener Leak:** In `GalleryManager`, storing the resize handler function in a variable scoped to the IIFE (`let resizeListener`) allows us to call `window.removeEventListener('resize', resizeListener)` prior to attaching a new one.
3. **Preventing Repeats:** By maintaining a `lastImgSrc` variable outside the interval, we can use a `do...while` loop to re-roll the random index until the selected image differs from the currently displayed one.
4. **Respecting Reduced Motion:** Wrapping the interval creation in an `if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)` block ensures that users with motion sensitivity only see a static featured image, aligning with the `modern-web-guidance` pattern.

## Caveats
- The application currently appears to be multi-page (using standard `<a>` tags for navigation), meaning global state resets on navigation. However, the acceptance criteria explicitly states that listeners and intervals accumulate when repeatedly changing views, suggesting either a client-side router is being tested or the functions are being called repeatedly without a hard refresh. Implementing cleanup is a best practice regardless.

## Conclusion
To fulfill the M3 requirements, `scripts/main.js` should be updated to:
1. Declare a module-scoped `let carouselIntervalId = null;` and call `clearInterval(carouselIntervalId)` inside `initHomePage()`.
2. Add a `let resizeListener = null;` inside `GalleryManager` and call `window.removeEventListener` before adding it.
3. Wrap the carousel `setInterval` in a `window.matchMedia('(prefers-reduced-motion: reduce)')` check.
4. Use a `do...while` loop inside the interval to ensure the newly selected `imgSrc` does not match `lastImgSrc`.

## Verification Method
- **Interval/Listener verification:** Execute `initHomePage()` and `initGalleryPage()` multiple times in the console, then use `getEventListeners(window)` to ensure only one `resize` listener exists, and check that multiple intervals are not logging or changing images erratically.
- **Visual verification:** Observe the Favorites cover image over 15-20 seconds to confirm no consecutive duplicate images appear.
- **Accessibility verification:** Emulate `prefers-reduced-motion: reduce` using Chrome DevTools (Rendering tab) and verify that the cover image remains static.
