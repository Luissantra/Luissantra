# Handoff Report: Milestone 3 (Favorites Carousel) Optimizations

## Observation
- In `scripts/main.js:184-205`, `carouselIntervalId` is instantiated as a `const` inside the local scope of `initHomePage`. If this function is called multiple times without a page reload (e.g. in future SPA navigations or dynamic content refreshes), multiple intervals will accumulate and memory/CPU leaks will occur.
- Also in `scripts/main.js:482`, `window.addEventListener('resize', ...)` is added inside `renderFavouritesGallery`. Every time this function is executed, a new listener binds to the `window` object, persisting indefinitely.
- The carousel image selection in `initHomePage` randomly picks from `favImages` using `Math.random()`. There is no check to ensure the new image is different from the currently displayed image.
- There is no logic respecting the `prefers-reduced-motion` media query in the JS carousel. As per `modern-web-guidance`, it should be checked and respected when executing motion or dynamic changes.

## Logic Chain
1. **Memory Leaks**: By scoping `carouselIntervalId` at the top level of `main.js`, we can check and `clearInterval` prior to setting a new one. Similarly, tracking the resize listener using an `AbortController` within the `GalleryManager` allows us to securely abort the previous `window` listener before binding a new one.
2. **Consecutive Image Prevention**: To ensure the same image does not appear twice consecutively, we need to declare a `lastIndex` variable (initialized to the index of the image randomly chosen on first load) and generate a new random index using a `do...while` loop until it differs from `lastIndex`.
3. **Respecting Reduced Motion**: We can use `window.matchMedia('(prefers-reduced-motion: reduce)')` to detect user preference. Inside the interval, we check `.matches` and `return` early, effectively pausing the carousel updates if the user prefers reduced motion.

## Caveats
- The app currently seems to use traditional page navigations (`window.location.pathname.includes('gallery.html')`), which natively clears memory on reload. However, the requested fixes ensure robust memory hygiene and prepare the application for future SPA (e.g., View Transitions, Turbolinks) implementations where the JS environment is persistent.
- The `initialFavIndex` must be explicitly tracked during the initial render loop so the first interval transition doesn't accidentally pick the same image shown at load.

## Conclusion
The fixes are straightforward and isolated within `scripts/main.js`. 
- **Fix 1**: Lift `carouselIntervalId` out of `initHomePage()` scope, and `resizeController` (using `AbortController`) out of `renderFavouritesGallery()`.
- **Fix 2**: Implement `lastIndex` tracking and a `do...while` loop for the image randomization.
- **Fix 3**: Integrate `window.matchMedia('(prefers-reduced-motion: reduce)')` in the `setInterval`.

## Verification Method
1. **Verification of M3**: Run a local server and load the home page.
2. Monitor `window.setInterval` activity and Memory usage via Chrome DevTools.
3. Observe the Favorites cover image over 15-20 seconds to confirm no consecutive duplicate images appear.
4. Open Chrome DevTools > Rendering > Emulate CSS media feature `prefers-reduced-motion: reduce`. Verify the carousel stops transitioning.
5. In the Gallery view, trigger `renderFavouritesGallery` multiple times (if possible via console) and run `getEventListeners(window)` to confirm only a single `resize` listener exists.

## Implementation Details

### Carousel Interval & Reduced Motion (`initHomePage` scope)
```javascript
// At the top of scripts/main.js
let carouselIntervalId = null;

// Inside initHomePage() where favCover is initially chosen
let initialFavIndex = -1;
if (favImages.length > 0) {
  initialFavIndex = Math.floor(Math.random() * favImages.length);
  const randomImg = favImages[initialFavIndex];
  const imgSrc = typeof randomImg === 'string' ? randomImg : randomImg.src;
  favCover = `images/${imgSrc}`;
}

// ...
// Inside initHomePage(), replacing the setInterval logic
if (favImages.length > 1) {
  if (carouselIntervalId) {
    clearInterval(carouselIntervalId);
  }
  
  let lastIndex = initialFavIndex;
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  carouselIntervalId = setInterval(() => {
    if (mql.matches) return;
    
    const imgEl = document.getElementById('fav-cover-img');
    if (imgEl) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * favImages.length);
      } while (randomIndex === lastIndex);
      lastIndex = randomIndex;
      
      const randomImg = favImages[randomIndex];
      const imgSrc = typeof randomImg === 'string' ? randomImg : randomImg.src;
      const newSrc = `images/${imgSrc}`;
      
      imgEl.style.opacity = '0';
      setTimeout(() => {
        imgEl.src = newSrc;
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
        imgEl.onerror = () => { imgEl.style.opacity = '1'; };
      }, 500);
    }
  }, 5000);
}
```

### Resize Listener Cleanup (`GalleryManager` scope)
```javascript
const GalleryManager = (() => {
  let currentImages = [];
  let currentImageIndex = 0;
  let resizeController = null; // Added

  // ...
  // Inside renderFavouritesGallery() where resize listener is attached
  if (resizeController) {
    resizeController.abort();
  }
  resizeController = new AbortController();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeAllGridItems(container);
    }, 150);
  }, { signal: resizeController.signal });
```
