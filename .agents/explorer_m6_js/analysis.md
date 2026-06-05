# Analysis Report: Main JS Refactoring for Milestone 6

This analysis covers three enhancements to `scripts/main.js`:
1. Implementing a customizable scroll animations preference toggle.
2. Implementing conditional native dialog backdrop click handling.
3. Upgrading the home page carousel from time-delayed updates to robust transition-based updates.

---

## 1. Scroll Animation Initialization

Currently, scroll animation states are not managed dynamically in JS. Introducing `initScrollAnimations()` fulfills modern accessibility requirements:
- **Default behavior**: Respects user's OS preference (`prefers-reduced-motion: reduce`) but defaults to enabling animations if the setting is absent.
- **Persistence**: Persists the setting using `localStorage.setItem('scroll-animations', ...)`.
- **UI State**:
  - Adds/removes the class `scroll-animations-enabled` on `<html>` so CSS animations can be conditionally turned on/off.
  - Toggles `aria-pressed="true"|"false"` on `#animation-toggle` for screen reader synchronization.
  - Switches the inline SVG icon inside `#animation-toggle` to show flow/motion (enabled) or a paused indicator (disabled).

### Proposed Insertion
We insert this function between the end of `initTheme()` and the start of `initHeaderScroll()`:

```javascript
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

We also invoke it in the `DOMContentLoaded` event listener:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeaderScroll();
  initScrollAnimations(); // Added
  
  // Simple Router
  const isGalleryPage = window.location.pathname.includes('gallery.html');
  ...
```

---

## 2. Native Light Dismiss Dialog Backdrop Fallback

Modern web browsers support native light-dismiss on `<dialog>` elements, which allows them to auto-close when clicking on the backdrop or outside the container.
- We check support using `'closedBy' in HTMLDialogElement.prototype`.
- If native support exists, we do **not** add any event listeners to the backdrop (avoiding redundant calls or logic collision).
- If it does not exist, we attach the manual `click` event listener.

### Proposed Edit
In `initLightbox()`, change:

```javascript
    // Close on backdrop click (light-dismiss)
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) lightbox.close();
    });
```

To:

```javascript
    // Close on backdrop click (light-dismiss fallback)
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) lightbox.close();
      });
    }
```

---

## 3. Transition-based Favourites Carousel

In the old implementation, the carousel used a hardcoded `setTimeout` of 500ms to update `imgEl.src` after setting `opacity = '0'`.
This can cause visual flashes or timing desyncs if the CSS transition duration is altered.
- **Refactoring**: Replace `setTimeout` with a `transitionend` listener on `opacity`.
- **Logic**:
  1. Trigger fade-out by setting `opacity = '0'`.
  2. Register a one-off (`{ once: true }`) `transitionend` listener on `imgEl`.
  3. Validate `e.propertyName === 'opacity'`.
  4. Perform the update: `imgEl.src = newSrc`.
  5. Add temporary `load` and `error` listeners to set `opacity = '1'` when loading completes or fails, ensuring they clean themselves up immediately using `removeEventListener` to prevent memory leaks.

### Proposed Edit
In `initHomePage()`, replace the interval's inner logic:

```javascript
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
```

With:

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
