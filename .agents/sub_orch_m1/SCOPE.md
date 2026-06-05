# Scope: M1 - Layout Toggle (R1)

## Architecture
- `gallery.html`: Layout toggle button and grid container
- `styles/main.css`: CSS classes for layout toggle (replacing inline styles)
- `scripts/main.js`: Toggle logic, `aria-pressed` updates, View Transitions API (`document.startViewTransition`)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1 - Layout Toggle | Implement aria-pressed, CSS classes over inline styles, View Transitions API | none | DONE |

## Interface Contracts
### `scripts/main.js` ↔ `styles/main.css`
- M1 will introduce specific classes for the layout toggle instead of JS manipulating `style`.
- JavaScript will add/remove these classes.

## Code Layout
- HTML in `gallery.html`
- CSS in `styles/main.css`
- JavaScript in `scripts/main.js`
