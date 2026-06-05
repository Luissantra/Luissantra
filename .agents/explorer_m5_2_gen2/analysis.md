# Lightbox Focus Outline Analysis

## Summary
The photography web portfolio currently relies entirely on browser-default styles for element focus rings, which causes visual clutter (such as prominent default outlines on `.lightbox-close` immediately upon modal open). To hide outlines for mouse click focus while retaining them for keyboard accessibility, we propose adding targeted CSS rules utilizing the `:focus:not(:focus-visible)` pseudo-class combination.

---

## 1. Current Styling Assessment

An investigation of the stylesheet at `styles/main.css` reveals the following:

| Path | Lines | Observations |
| :--- | :--- | :--- |
| `styles/main.css` | N/A | No custom `:focus` or `outline` CSS declarations exist anywhere in the codebase. All focus rings fallback to browser-specific defaults. |
| `styles/main.css` | 652–690 | `.lightbox-btn` is the common base class for the next/prev buttons (`.lightbox-prev`, `.lightbox-next`) and the close button (`.lightbox-close`). |
| `gallery.html` | 44–56 | The lightbox buttons are standard HTML `<button>` elements, which are natively focusable and trigger focus outlines. |
| `scripts/main.js` | 659 | The lightbox dialog is opened using `lightbox.showModal()`. |

### Behavior Analysis
When a user clicks a thumbnail, `scripts/main.js` triggers `lightbox.showModal()`. The browser automatically focuses the first focusable child in the dialog, which is `<button id="lightbox-close">` (line 44 of `gallery.html`). Because this focus action is programmatic, most modern browsers render a default focus outline on the close button immediately upon lightbox load. Similarly, clicking the direction buttons (`.lightbox-prev`, `.lightbox-next`) leaves a persistent outline on them. This disrupts the visual cleanliness of the lightbox interface.

---

## 2. Technical Solution: `:focus-visible`

The modern CSS solution to manage focus rings uses the `:focus-visible` pseudo-class:

- **`:focus`**: Matches an element that has focus, regardless of the input device (mouse, keyboard, touch, or script).
- **`:focus-visible`**: Matches an element that has focus only when the browser determines that focus should be visibly indicated (typically when navigated using the keyboard `Tab` or arrow keys).
- **`:focus:not(:focus-visible)`**: Matches elements that have focus but do not require visible focus rings (i.e. mouse clicks or touch taps).

By styling `:focus:not(:focus-visible) { outline: none; }` or `outline: 0;`, we suppress the outline for mouse users. Keyboard users will still match `:focus-visible` and see the focus ring.

---

## 3. Proposed Fix Strategy

To keep the codebase organized and restrict changes to the lightbox components, we propose adding the rules at the end of the Lightbox section in `styles/main.css`.

### Proposed CSS Rules

We recommend applying the following styling rules:

```css
/* ==========================================================================
   Lightbox Focus Adjustments
   ========================================================================== */

/* Hide outline for mouse click focus on all lightbox buttons */
.lightbox-btn:focus:not(:focus-visible) {
  outline: none;
}

/* Explicit high-contrast focus ring for keyboard navigation */
.lightbox-btn:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}
```

### Rationale
1. **Targeted Selector**: Applying the rules to `.lightbox-btn` covers `.lightbox-close`, `.lightbox-prev`, and `.lightbox-next` simultaneously because they all share this class in `gallery.html`.
2. **Keyboard Accessibility**: Defining `.lightbox-btn:focus-visible` ensures that when keyboard users tab through the buttons, they receive a high-contrast focus ring that scales beautifully with the theme (using `var(--color-text)`, which is dark in light mode and light in dark mode). The `outline-offset` adds a small gap around the circular buttons, enhancing visibility.
3. **No Layout Shifts**: Using the `outline` property instead of `border` prevents layout shifts, as outlines do not occupy space in the document flow.

---

## 4. Implementation Step-by-Step

Since this is a read-only investigation, the implementing agent should execute the following edits:

1. Open `styles/main.css`.
2. Scroll to the end of the Lightbox section (around line 691).
3. Insert the proposed CSS block.
4. Optionally, add similar general rules for utility buttons like `.theme-toggle` or `.layout-toggle-btn` to unify the portfolio's focus behavior.
