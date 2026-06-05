# Original User Request

## Initial Request — 2026-06-05T12:56:03+02:00

# Teamwork Project Prompt — Final

Implementar las optimizaciones de rendimiento, corrección de bugs visuales y mejores prácticas detalladas en `implementation_plan.md` para la sección de Favoritos, el grid en mosaico y el botón de cambio de disposición del portfolio fotográfico.

Working directory: `/Users/luissantra/Projects/Photography Web Portfolio`
Integrity mode: development (se permite usar el stack actual y enfoques estándar, sin librerías de terceros nuevas)

## Requirements

### R1. Implementar cambios en Toggle de Disposición
Aplicar mejoras de accesibilidad (aria-pressed), separar estilos CSS en clases en lugar de inline, e implementar View Transitions API para el cambio de layout (entre mosaico y clásico). Ver `implementation_plan.md` para más detalles.

### R2. Implementar cambios en el Mosaico / Grid
Ajustar `content-visibility` con tamaños intrínsecos correctos, corregir comportamientos de grid responsive (evitar span 2 en layouts pequeños), y optimizar el cálculo de reflows en JavaScript en `resizeAllGridItems`. Ver `implementation_plan.md`.

### R3. Implementar cambios en el Carrusel de Favoritos (Home)
Corregir memory leaks (limpiar listeners y mantener un registro del ID del intervalo para el carrusel), evitar que se repita la misma imagen consecutivamente en el aleatorio, y respetar `prefers-reduced-motion`. Ver `implementation_plan.md`.

## Acceptance Criteria

### Verificación de Calidad
- [ ] El carrusel de Favourites no muestra la misma imagen de forma consecutiva en las transiciones de home.
- [ ] El toggle de disposición usa `aria-pressed` y transiciona de forma fluida usando la View Transitions API entre la vista de mosaico y la clásica.
- [ ] No se acumulan event listeners de `resize` o intervalos en segundo plano al cambiar repetidamente entre la home y la vista de la galería de favoritos.
- [ ] El grid de mosaico se renderiza correctamente sin dejar columnas desbordadas en el viewport de ancho medio (2 columnas).
- [ ] Los estilos en línea se han reemplazado por clases CSS que aplican estilos desde `main.css`.


## Follow-up — 2026-06-05T16:31:24+02:00

Implement a series of improvements to the static "Photography Web Portfolio" project to fix bugs, optimize performance and accessibility, and enhance interactivity.

Working directory: `/Users/luissantra/Projects/Photography Web Portfolio`
Integrity mode: `development`

## Requirements

### R1. Fix Favourites Mosaic Grid Gaps (WS1)
- Modify `resizeAllGridItems()` in main.js (file:///Users/luissantra/Projects/Photography%20Web%20Portfolio/scripts/main.js) to handle cases where an image's `naturalWidth` is 0 by utilizing width/height attributes or standard aspect-ratio fallbacks.
- Re-run grid calculations progressively on image `load` events with debounce to ensure correct dimensions without relying on all images loading at once.
- Apply a slight offset (+1) to calculation rounding to prevent grid cell overlaps or gaps.
- Add `grid-auto-flow: dense` and adjust background colors in main.css (file:///Users/luissantra/Projects/Photography%20Web%20Portfolio/styles/main.css) to eliminate visual black gaps in the grid.

### R2. Lightbox Close Button Focus Fix (WS2)
- Prevent the default browser outline ring from displaying on the lightbox close button when clicked.
- Redirect the initial focus to `.lightbox-content` (with `tabindex="-1"`) after calling `lightbox.showModal()`.
- Add `:focus:not(:focus-visible)` CSS rules in main.css (file:///Users/luissantra/Projects/Photography%20Web%20Portfolio/styles/main.css) to hide the outline for mouse clicks while keeping keyboard accessibility functional.
- Remove redundant HTML attributes like `formmethod="dialog"` if they cause issues.

### R3. Web Optimization & Scroll Reveal Toggle (WS3)
- Declare `color-scheme: light` and `color-scheme: dark` in CSS. Add light/dark theme meta tags to pages.
- Implement CSS scroll-driven reveal animations (`@supports (animation-timeline: view())`) wrapped in media queries for `prefers-reduced-motion: no-preference`.
- Animations must be toggleable via a UI control placed in the header (persisting user choices using `localStorage`). Apply animations only if the `.scroll-animations-enabled` class is present on `<html>`.
- Convert the manual backdrop click handler on the lightbox `<dialog>` to a conditional fallback that runs only when the native `closedby="any"` feature is not supported by the browser.
- Replace `setTimeout` with a transition-based listener (`transitionend`) in the favourites carousel.

### R4. Rich Interactivity & Animations (WS4)
- Add a subtle gradient overlay hover effect to portfolio thumbnails.
- Use `@starting-style` to create a smooth fade-in and scale-up animation when opening the lightbox.
- Smoothly transition background/color themes (`body`).
- Optimize scrolling with a global `scroll-padding-top` on the root element.
- Implement smart image preloading for adjacent images (prev/next) when a lightbox image is displayed.
- Implement a smooth image crossfade inside the lightbox using a temporary secondary image node rather than immediate source replacement.
- Implement keyboard navigation shortcuts `j`/`k` to navigate between homepage sections.

## Acceptance Criteria

### Grid Layout
- [ ] The Favourites mosaic grid has no black spaces or gaps.
- [ ] Resizing the browser window recalculates items dynamically and maintains grid structure.
- [ ] No image overlaps occur in the grid.

### Accessibility & Focus Management
- [ ] Clicking a thumbnail to open the lightbox does not show any focus ring or outline around the close (X) button.
- [ ] Tabbing through the dialog allows the user to focus the close button, which displays a visible focus outline.
- [ ] Keyboard navigation (Tab, Enter, Space) and Escape key work correctly within the lightbox dialog.

### Performance & Modern API Features
- [ ] Scroll animations only play when the scroll animations toggle is turned "on" and the system doesn't request reduced motion.
- [ ] The animation toggle state persists in `localStorage` across visits.
- [ ] Carousel changes trigger based on `transitionend` events instead of raw timing delays.
- [ ] Light-dismiss dialog native `closedby="any"` is supported, with robust JS fallback for older browsers.

### Interactivity & Rich UX
- [ ] Thumbnails in the grid display a gradient overlay and scale/transform cleanly on hover.
- [ ] Lightbox entry displays a smooth scale and fade transition.
- [ ] Navigating between images in the lightbox displays a crossfade fade effect instead of an abrupt flash or loading pop-in.
- [ ] The next and previous images in the gallery are preloaded in the background.
- [ ] Pressing `j` and `k` on the keyboard scrolls the page smoothly to the next and previous section headers respectively.

### Compatibility & Architecture Rules
- [ ] No external runtime NPM packages, frameworks (React/Vue/etc.), Tailwind CSS, or TypeScript are introduced.
- [ ] Code changes follow BEM styling patterns and the Init Pattern described in `DESIGN_PATTERNS.md`.
- [ ] Variables, functions, and CSS classes are named in English.
- [ ] The site is fully functional on both light and dark themes, and on desktop viewports.
- [ ] Visual regression checklist in `antigravity.md` passes.
