# Handoff Report — JS Explorer Milestone 6

## 1. Observation
In `scripts/main.js`, the following exact blocks and line numbers were identified:
- **`DOMContentLoaded` listener** (lines 9–21):
  ```javascript
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initHeaderScroll();
    
    // Simple Router
    const isGalleryPage = window.location.pathname.includes('gallery.html');
    
    if (isGalleryPage) {
      initGalleryPage();
    } else {
      initHomePage();
    }
  });
  ```
- **Favourites cover image carousel** (lines 186–218):
  ```javascript
      // Change favourites cover image every 5 seconds
      if (carouselIntervalId) {
        clearInterval(carouselIntervalId);
      }
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (favImages.length > 1 && !prefersReducedMotion) {
        carouselIntervalId = setInterval(() => {
          const imgEl = document.getElementById('fav-cover-img');
          if (imgEl) {
            let randomIndex;
            do {
              randomIndex = Math.floor(Math.random() * favImages.length);
            } while (randomIndex === lastFavIndex);
            lastFavIndex = randomIndex;

            const randomImg = favImages[randomIndex];
            const imgSrc = typeof randomImg === 'string' ? randomImg : randomImg.src;
            const newSrc = `images/${imgSrc}`;
            
            imgEl.style.opacity = '0';
            setTimeout(() => {
              imgEl.src = newSrc;
              imgEl.onload = () => {
                imgEl.style.opacity = '1';
              };
              imgEl.onerror = () => {
                imgEl.style.opacity = '1'; // Restore opacity if image fails to load
              };
            }, 500);
          }
        }, 5000);
      }
  ```
- **Lightbox backdrop click listener** (lines 668–671):
  ```javascript
      // Close on backdrop click (light-dismiss)
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) lightbox.close();
      });
  ```

---

## 2. Logic Chain
- **Scroll Animations Initialization**: 
  - On script load, `initScrollAnimations()` must check if the preference is stored in `localStorage.getItem('scroll-animations')`.
  - If it is the first visit (`localStorage.getItem('scroll-animations')` is `null`), it must check system prefers-reduced-motion status using `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. If reduced motion is requested, animations default to `false`; otherwise, they default to `true`.
  - The `scroll-animations-enabled` class should be toggled on `document.documentElement` (`<html>` element) to allow CSS rules to adapt.
  - The `#animation-toggle` button (if present) must have its `aria-pressed` attribute updated to match the boolean status (`"true"`/`"false"`).
  - The inner HTML of the icon container should be synced with inline SVGs showing flow/motion (enabled vs. disabled with visual indicator/slash).
  - A click listener on `#animation-toggle` should toggle the state, save it to `localStorage`, and update the UI states.
- **Lightbox Backdrop Fallback**: 
  - To support modern dialog light-dismiss where the browser natively handles closing a dialog on backdrop click, check for `'closedBy' in HTMLDialogElement.prototype`.
  - If the check is truthy, native support is present, and we must *not* attach a click listener that closes the dialog manually.
  - If it is falsy, we attach the manual listener as a fallback.
- **Favourites Carousel Refactoring**: 
  - In `initHomePage()`, `setTimeout` must be replaced with `transitionend`.
  - When the carousel interval fires, `imgEl.style.opacity = '0'` is set.
  - A `transitionend` listener with `{ once: true }` is registered on `imgEl`. Inside the handler, it verifies `e.propertyName === 'opacity'`.
  - When verified, `imgEl.src` is updated to the `newSrc`.
  - On `load` and `error` events of the image, `imgEl.style.opacity = '1'` is set.
  - To prevent memory leaks, both the `load` and `error` event handlers remove themselves and each other upon completion using `removeEventListener`.

---

## 3. Caveats
- The `#animation-toggle` and `#animation-icon-container` buttons are not defined in the source HTML yet, so our code is written defensively to inspect their existence before registering events or updating their inner elements.
- The `transitionend` listener relies on the CSS transition for `opacity` being set and active. If the CSS transitions are fully disabled or overridden, `transitionend` may not fire. However, the carousel logic already checks `!prefersReducedMotion`, and the inline style includes a 0.5s transition on `opacity`, making it safe.

---

## 4. Conclusion
Below are the proposed exact diffs and additions for `scripts/main.js`.

### Proposed Diff 1: DOMContentLoaded Update
Replace lines 9–21 with:
```javascript
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeaderScroll();
  initScrollAnimations();
  
  // Simple Router
  const isGalleryPage = window.location.pathname.includes('gallery.html');
  
  if (isGalleryPage) {
    initGalleryPage();
  } else {
    initHomePage();
  }
});
```

### Proposed Diff 2: Scroll Animations Function Implementation
Insert the following new code between the end of `initTheme()` (line 48) and the start of `initHeaderScroll()` (line 64):
```javascript
/* ==========================================================================
   Scroll Animations Management
   ========================================================================== */
function initScrollAnimations() {
  const animationToggle = document.getElementById('animation-toggle');
  
  // 1. Read setting from localStorage or default based on reduced motion media query
  const savedSetting = localStorage.getItem('scroll-animations');
  let enabled;
  
  if (savedSetting !== null) {
    enabled = savedSetting === 'true';
  } else {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    enabled = !prefersReduced;
  }
  
  // 2. Define the applyState function to sync UI and class
  const applyState = (isEnabled) => {
    // Add/remove class on HTML element
    if (isEnabled) {
      document.documentElement.classList.add('scroll-animations-enabled');
    } else {
      document.documentElement.classList.remove('scroll-animations-enabled');
    }
    
    // Sync button attributes and icons
    if (animationToggle) {
      animationToggle.setAttribute('aria-pressed', isEnabled.toString());
      
      const iconContainer = document.getElementById('animation-icon-container') || animationToggle;
      if (isEnabled) {
        // SVG representing flow/motion (wavy lines)
        iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M6 8h12M10 16h6"/></svg>`;
      } else {
        // SVG representing disabled flow/motion (dashed lines with a diagonal slash)
        iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M6 8h12M10 16h6" stroke-dasharray="4 4"/><line x1="2" y1="2" x2="22" y2="22" /></svg>`;
      }
    }
  };
  
  // 3. Initial state application
  applyState(enabled);
  
  // 4. Click event handler to toggle and persist setting
  if (animationToggle) {
    animationToggle.addEventListener('click', () => {
      enabled = !enabled;
      localStorage.setItem('scroll-animations', enabled.toString());
      applyState(enabled);
    });
  }
}
```

### Proposed Diff 3: Transition-based Carousel Refactoring
In `initHomePage()`, replace the fading logic inside the interval (lines 205–216) with:
```javascript
          imgEl.style.opacity = '0';
          
          imgEl.addEventListener('transitionend', function handleTransitionEnd(e) {
            if (e.propertyName === 'opacity') {
              imgEl.src = newSrc;
              
              const handleLoad = () => {
                imgEl.removeEventListener('load', handleLoad);
                imgEl.removeEventListener('error', handleError);
                imgEl.style.opacity = '1';
              };
              
              const handleError = () => {
                imgEl.removeEventListener('load', handleLoad);
                imgEl.removeEventListener('error', handleError);
                imgEl.style.opacity = '1';
              };
              
              imgEl.addEventListener('load', handleLoad);
              imgEl.addEventListener('error', handleError);
            }
          }, { once: true });
```

### Proposed Diff 4: Dialog Light Dismiss Backdrop Fallback
In `initLightbox()`, replace the manual backdrop click listener (lines 668–671) with:
```javascript
    // Close on backdrop click (light-dismiss fallback)
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) lightbox.close();
      });
    }
```

---

## 5. Verification Method
- **Scroll Animations Verification**:
  1. Inspect the DOM hierarchy in developer tools. Observe that the `<html>` tag contains `class="scroll-animations-enabled"` on page load if system reduced motion is false.
  2. Simulate system reduced motion (`prefers-reduced-motion: reduce`) and reload page. The `<html>` class must not be added.
  3. Clicking `#animation-toggle` should add/remove the class from `<html>`, flip the `aria-pressed` attribute, change the icon, and store the updated preference in `localStorage`.
- **Dialog Backdrop Fallback Verification**:
  1. In Chrome (which supports native `closedBy` or backdrop close properties), check that clicking the backdrop closes the dialog but does not invoke the custom callback (since the listener is not attached).
  2. In an older browser or by mocking `closedBy` to be absent on `HTMLDialogElement.prototype`, verify that clicking the backdrop still closes the lightbox dialog via the attached fallback listener.
- **Transition Carousel Verification**:
  1. Inspect the homepage cover image container and verify it transitions smoothly every 5 seconds.
  2. Trace listeners on `#fav-cover-img` using DevTools or console hooks to verify that `load`, `error`, and `transitionend` listeners are successfully unregistered once they execute.
