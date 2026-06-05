# Implementation Plan - Milestone 6 Iteration 2

This plan outlines the fixes for three issues in the Photography Web Portfolio codebase.

## Issue 1: Fix Favourites Carousel `transitionend` Listener Hang
- **File**: `scripts/main.js`
- **Location**: `initHomePage()`
- **Changes**:
  1. Remove `{ once: true }` from the `transitionend` event listener options on `imgEl`.
  2. Inside the listener, if `e.propertyName === 'opacity'`, manually call `imgEl.removeEventListener('transitionend', handleTransitionEnd);`.
- **Verification**:
  - The carousel logic is executed without hanging when transitions occur.
  - Hovering and transition interactions do not permanently leave the cover image invisible.

## Issue 2: Fix Fallback Lightbox Backdrop Click Close Failure
- **File**: `scripts/main.js`
- **Location**: `initLightbox()`
- **Changes**:
  1. Update the fallback backdrop click listener conditional logic.
  2. Instead of `if (e.target === lightbox) lightbox.close();`, change it to `if (e.target === lightbox || e.target.classList.contains('lightbox-content')) lightbox.close();`.
- **Verification**:
  - Lightbox closes properly on backdrop click even if the click targets the `.lightbox-content` container.

## Issue 3: Fix SVG Fill Override Issue
- **File**: `styles/main.css`
- **Location**: Grouped selectors `.theme-toggle svg, #animation-toggle svg`
- **Changes**:
  1. Separate the selectors so that `fill: currentColor;` is only applied to `.theme-toggle svg`.
  2. Maintain `width: 20px;` and `height: 20px;` grouped for both selectors to match layout styling.
- **Verification**:
  - Build script runs correctly.
  - No syntax errors in CSS.
  - The fill for `#animation-toggle svg` remains as defined in SVG attributes (e.g. `fill="none"`) rather than being overridden by `currentColor`.

## Verification Steps
1. Run `npm run build` to verify there are no build issues.
2. Manually review JavaScript and CSS edits.
