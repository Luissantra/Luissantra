# CSS Analysis & Modification Proposal — Milestone 6

This document presents the detailed analysis and proposed CSS modifications for `styles/main.css` to implement theme color scheme declarations, scroll-driven reveal animations, and UI toggle styles for the Photography Web Portfolio.

---

## 1. Theme and Color Scheme Declarations

### Context & Goals
Declaring standard browser `color-scheme` properties enables user agents to optimize native rendering (such as scrollbars, form controls, and selection highlighting) for the active theme. This prevents light scrollbars from appearing when dark mode is enabled.

### Proposed Changes
Add `color-scheme: light;` to the `:root` pseudo-class (Light Theme default) and `color-scheme: dark;` to the `[data-theme="dark"]` selector.

#### Line-by-Line Diffs
**Target File**: `styles/main.css`

##### Edit 1 (Near Line 4-5):
```diff
 :root {
+  color-scheme: light;
   /* Colors - Light Theme (Default) */
   --color-bg: #ffffff;
```

##### Edit 2 (Near Line 40-41):
```diff
 [data-theme="dark"] {
+  color-scheme: dark;
   /* Colors - Dark Theme */
   --color-bg: #0a0a0a;
```

---

## 2. UI Toggle Styles for `#animation-toggle`

### Context & Goals
The header has a dark-mode theme toggle button styled with the `.theme-toggle` class. A new button `#animation-toggle` will sit next to `#theme-toggle` in the navigation header. The layout and styling of this toggle must match `#theme-toggle` exactly to ensure visual harmony.

### Proposed Changes
Modify the selector names in the existing `theme-toggle` style block to include `#animation-toggle`. This groups selectors to avoid code duplication and guarantees perfect visual match.

#### Line-by-Line Diffs
**Target File**: `styles/main.css`

##### Edit 3 (Near Line 148-167):
```diff
-.theme-toggle {
+.theme-toggle,
+#animation-toggle {
   display: flex;
   align-items: center;
   justify-content: center;
   width: 40px;
   height: 40px;
   border-radius: 50%;
   background-color: var(--color-surface);
   transition: background-color var(--transition-fast);
 }
 
-.theme-toggle:hover {
+.theme-toggle:hover,
+#animation-toggle:hover {
   background-color: var(--color-surface-hover);
 }
 
-.theme-toggle svg {
+.theme-toggle svg,
+#animation-toggle svg {
   width: 20px;
   height: 20px;
   fill: currentColor;
 }
```

*Note: The existing `.nav-links` flex container has `gap: var(--space-md)` and `align-items: center` (lines 131-135), so placing the buttons adjacent in markup will align them horizontally and space them appropriately.*

---

## 3. Scroll-Driven Reveal Animations

### Context & Goals
- Add scroll-driven reveal animations using the native CSS View Timeline API.
- Use `@supports (animation-timeline: view())` for progressive enhancement.
- Wrap inside a `@media (prefers-reduced-motion: no-preference)` media query to protect users with motion sensitivities.
- Apply animations to `.gallery-card`, `.photo-item`, and `.section-title` ONLY when the `<html>` element has class `.scroll-animations-enabled`.

### Proposed Changes
Append the new animations block at the end of `styles/main.css` under the Utilities & Animations section.

#### Proposed Styles to Append
**Target File**: `styles/main.css` (appended to the end of the file, starting at line 752)

```css

/* ==========================================================================
   Scroll-Driven Reveal Animations
   ========================================================================== */
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    /* Keyframes for gallery card and photo item entry */
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

    /* Keyframes for section title reveal (subtle fade and slide from left) */
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

    /* Apply entrance animation to gallery cards and photo items when enabled */
    html.scroll-animations-enabled .gallery-card,
    html.scroll-animations-enabled .photo-item {
      animation: scroll-reveal-item auto linear both;
      animation-timeline: view();
      animation-range: entry;
    }

    /* Apply entrance animation to section title when enabled */
    html.scroll-animations-enabled .section-title {
      animation: scroll-reveal-title auto linear both;
      animation-timeline: view();
      animation-range: entry;
    }
  }
}
```

### Rationale for Specific CSS Properties
- **`animation-timeline: view()`**: Configures an anonymous view-timeline that tracks the element as it moves through the viewport scrollport.
- **`animation-range: entry`**: Ensures the animation runs only while the element transitions from entering the bottom fold of the screen to being fully visible on screen.
- **`animation-fill-mode: both`**: Clamps the animation state to its initial bounds before scroll entry and holds the final animation state after the scroll entry is completed.
- **`html.scroll-animations-enabled` prefix**: Restricts the animation styling to when the class is present, providing full user toggleability through the UI button.
