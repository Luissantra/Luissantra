## 2026-06-05T17:23:01Z

You are the Milestone 6 Worker.
Your working directory is `/Users/luissantra/Projects/Photography Web Portfolio/.agents/worker_m6/`.
You are tasked with implementing the changes for Milestone 6: Web Optimization & Scroll Reveal Toggle.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please modify the following files:
1. `index.html` and `gallery.html`:
   - Add light and dark theme meta tags in `<head>` section:
     `<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">`
     `<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)">`
   - Add `#animation-toggle` button in the header next to `#theme-toggle` inside `<div class="nav-links">`. Include the initial SVG icon and correct accessibility attributes:
     ```html
     <button id="animation-toggle" class="theme-toggle" aria-label="Toggle animations" aria-pressed="true">
       <span id="animation-icon-container" aria-hidden="true">
         <svg viewBox="0 0 24 24">
           <path d="M2 5.5C2 4.67 2.67 4 3.5 4H14.5C16.43 4 18 5.57 18 7.5C18 9.43 16.43 11 14.5 11C13.67 11 13 10.33 13 9.5C13 8.67 13.67 8 14.5 8C14.78 8 15 7.78 15 7.5C15 7.22 14.78 7 14.5 7H3.5C2.67 7 2 6.33 2 5.5Z" />
           <path d="M2 12C2 11.17 2.67 10.5 3.5 10.5H19.5C20.33 10.5 21 11.17 21 12C21 12.83 20.33 13.5 19.5 13.5H3.5C2.67 13.5 2 12.83 2 12Z" />
           <path d="M2 18.5C2 17.67 2.67 17 3.5 17H11.5C12.33 17 13 17.67 13 18.5C13 19.33 12.33 20 11.5 20C9.57 20 8 18.43 8 16.5C8 15.67 8.67 15 9.5 15C10.33 15 11 15.67 11 16.5C11 16.78 11.22 17 11.5 17H3.5C2.67 17 2 17.67 2 18.5Z" />
         </svg>
       </span>
     </button>
     ```

2. `styles/main.css`:
   - Declare `color-scheme: light` in `:root` and `color-scheme: dark` in `[data-theme="dark"]`.
   - Update `.theme-toggle` selector groups to also include `#animation-toggle`:
     - Group `.theme-toggle` and `#animation-toggle` for base style.
     - Group `.theme-toggle:hover` and `#animation-toggle:hover`.
     - Group `.theme-toggle svg` and `#animation-toggle svg`.
   - Append the following scroll-driven reveal animations at the end of the file:
     ```css
     /* ==========================================================================
        Scroll-Driven Reveal Animations
        ========================================================================== */
     @media (prefers-reduced-motion: no-preference) {
       @supports (animation-timeline: view()) {
         @keyframes scroll-reveal-item {
           from {
             opacity: 0;
             transform: translateY(40px) scale(0.97);
           }
           to {
             opacity: 1;
             transform: translateY(0) scale(1);
           }
         }

         @keyframes scroll-reveal-title {
           from {
             opacity: 0;
             transform: translateX(-20px);
           }
           to {
             opacity: 1;
             transform: translateX(0);
           }
         }

         html.scroll-animations-enabled .gallery-card,
         html.scroll-animations-enabled .photo-item {
           animation: scroll-reveal-item auto linear both;
           animation-timeline: view();
           animation-range: entry;
         }

         html.scroll-animations-enabled .section-title {
           animation: scroll-reveal-title auto linear both;
           animation-timeline: view();
           animation-range: entry;
         }
       }
     }
     ```

3. `scripts/main.js`:
   - Call `initScrollAnimations();` inside `document.addEventListener('DOMContentLoaded', ...)` (around line 9-21).
   - Implement `initScrollAnimations()` (you can insert it right after `initTheme()`):
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
   - In `initHomePage()`, locate the favourites carousel interval and replace the `setTimeout` opacity transitions with a transition-based listener (`transitionend` on `opacity`):
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
   - In `initLightbox()`, check if the native light-dismiss feature (`closedBy` in `HTMLDialogElement.prototype`) is supported. If it is NOT supported, attach the manual backdrop click listener:
     ```javascript
         // Close on backdrop click (light-dismiss fallback)
         if (!('closedBy' in HTMLDialogElement.prototype)) {
           lightbox.addEventListener('click', (e) => {
             if (e.target === lightbox) lightbox.close();
           });
         }
     ```

Run local checks/builds if necessary to verify, and once completed, write a handoff report in your directory. Do not use external libraries, Tailwind, or TypeScript. Keep it simple and vanilla.
