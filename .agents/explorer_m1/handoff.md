# Handoff Report: M1 Layout Toggle

## Observation
1. **Accessibility (`aria-pressed`)**: `gallery.html` contains a theme toggle button (`#theme-toggle`) that is missing the `aria-pressed` state. Furthermore, `scripts/main.js` dynamically injects a layout toggle button (`#toggle-mosaic-mode`) into the Favourites gallery view, which also lacks the `aria-pressed` state.
2. **Inline CSS**: The layout toggle button (`#toggle-mosaic-mode`) in `scripts/main.js` is generated with a large inline style block (`style="border: 1px solid currentColor; padding: 0.5rem 1.5rem; border-radius: 20px; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 8px;"`). 
3. **Layout Switching**: The layout switch logic toggles the `.is-classic` class on `.mosaic-grid` and manually triggers `resizeAllGridItems` using a `setTimeout(..., 50)` when switching back to mosaic mode. Layouts snap abruptly.
4. **View Transitions**: According to the `modern-web-guidance` skill, same-document view transitions must be wrapped in `document.startViewTransition()`. To achieve smooth item morphing (rather than a simple cross-fade of the entire group), list elements must have unique `view-transition-name` properties.

## Logic Chain
1. **Apply Accessibility Improvements**: We must add `aria-pressed` to both toggle buttons. For `#theme-toggle`, `true` signifies dark mode. For `#toggle-mosaic-mode`, `true` signifies classic layout. These states must be correctly initialized and then toggled inside their respective event listeners in `scripts/main.js`. 
2. **Separate CSS Styles**: The inline styles on the `#toggle-mosaic-mode` button should be removed from the JS template string. Instead, apply a new class (e.g., `layout-toggle-btn`) and add these styles to `styles/main.css`.
3. **Implement View Transitions API**:
   - The DOM update logic inside the `#toggle-mosaic-mode` click listener must be extracted into an `updateLayout()` helper.
   - We must invoke `document.startViewTransition(() => updateLayout())`, falling back to `updateLayout()` directly if the API is unsupported.
   - Inside `updateLayout()`, we toggle the `is-classic` class, update the button text and `aria-pressed` state.
   - Crucially, the `setTimeout` wrapped around `resizeAllGridItems(container)` must be removed. View Transitions synchronously capture the updated DOM state. `resizeAllGridItems()` uses `getBoundingClientRect()` which forces a layout flush, so it is perfectly safe and required to execute it synchronously within the `updateLayout` function.
   - To create a high-quality "shuffling" animation, inject `style="view-transition-name: photo-${i};"` onto the `.photo-item` elements in the `renderFavouritesGallery` HTML template.

## Caveats
- **Focus Routing**: The accessibility guidance for View Transitions mandates routing focus programmatically if context is lost. However, since the layout toggle button remains mounted and actively focused throughout the transition, focus naturally persists and no explicit focus shifting is required.
- **Scale limitations**: Assigning unique `view-transition-name`s to all elements works perfectly for a curated favourites gallery but could cause performance overhead if the gallery size expands to hundreds of images. 

## Conclusion
The implementation strategy involves:
1. Adding `aria-pressed` to `#theme-toggle` (in HTML & JS) and `#toggle-mosaic-mode` (in JS).
2. Creating a `.layout-toggle-btn` class in `main.css` and removing the inline `style="..."` on the layout toggle.
3. Adding `style="view-transition-name: photo-${i};"` to each `.photo-item` generated in the favourites gallery.
4. Refactoring the `#toggle-mosaic-mode` event listener to wrap synchronous DOM updates and `resizeAllGridItems()` inside a conditional `document.startViewTransition()` wrapper.

## Verification Method
1. Start a local HTTP server and navigate to the Favourites gallery (`gallery.html?id=favourites`).
2. **Inspect HTML**: Verify `#theme-toggle` and `#toggle-mosaic-mode` have accurate `aria-pressed` attributes.
3. **Inspect CSS**: Verify `#toggle-mosaic-mode` uses the new `.layout-toggle-btn` class and lacks inline styles.
4. **Test Transition**: Click the layout toggle button. Verify that a smooth view transition occurs (photos morphing into their new sizes/positions) and DevTools records a top-layer view transition. Verify the layout change works identically on browsers without View Transition API support (or by disabling it in DevTools rendering options).
