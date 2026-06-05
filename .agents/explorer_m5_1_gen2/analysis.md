# Lightbox Dialog Focus Management Analysis

This report documents the findings regarding how the lightbox dialog is initialized and opened, and outlines the proposed fix strategy for redirecting keyboard focus to `.lightbox-content` upon opening the modal.

---

## 1. Current Implementation Details

### A. Initialization & Opening (`scripts/main.js`)
The lightbox dialog is managed by the `GalleryManager` module (an immediately invoked function expression, IIFE) in `scripts/main.js`.

- **Initialization Function**: `initLightbox()` (lines 613-642)
  - Configures close, previous, and next button click event handlers.
  - Adds keyboard listeners to handle left and right arrow keys.
  - Adds a click listener on the backdrop for light-dismiss fallback support (for browsers not supporting native `closedby="any"`).
  - Listens for clicks on any thumbnail (`.photo-item`) element to record the selected index and trigger `openLightbox()`.
- **Opening Function**: `openLightbox()` (lines 644-660)
  - Resets the image loaded class state, sets the full-resolution image source from the `currentImages` array, and sets an `onload` handler.
  - Invokes `lightbox.showModal()` to open the native dialog as a modal window.

### B. Triggering `lightbox.showModal()`
The call to `lightbox.showModal()` occurs on line 659:
```javascript
644:   function openLightbox() {
645:     const lightbox = document.getElementById('lightbox');
646:     const lightboxImage = document.getElementById('lightbox-image');
647:     
648:     // Show a loading state or reset
649:     lightboxImage.classList.remove('is-loaded');
650:     
651:     // Load the full size WebP
652:     lightboxImage.src = currentImages[currentImageIndex];
653:     
654:     // Animate in once loaded
655:     lightboxImage.onload = () => {
656:       lightboxImage.classList.add('is-loaded');
657:     };
658: 
659:     lightbox.showModal();
660:   }
```

### C. The Dialog Structure (`gallery.html`)
The native dialog markup resides in `gallery.html` (lines 41-58):
```html
41:   <!-- Native HTML Dialog for the Lightbox -->
42:   <dialog id="lightbox" closedby="any">
43:     <div class="lightbox-content">
44:       <button class="lightbox-btn lightbox-close" id="lightbox-close" aria-label="Close Lightbox" formmethod="dialog">
45:         <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
46:       </button>
47:       
48:       <button class="lightbox-btn lightbox-prev" id="lightbox-prev" aria-label="Previous Image">
49:         <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
50:       </button>
51:       
52:       <img id="lightbox-image" class="lightbox-image" src="" alt="Full screen gallery view" decoding="async">
53:       
54:       <button class="lightbox-btn lightbox-next" id="lightbox-next" aria-label="Next Image">
55:         <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
56:       </button>
57:     </div>
58:   </dialog>
```

---

## 2. The Issue: Default Browser Focus Behavior
When `dialog.showModal()` is called, modern browsers automatically find the first focusable element inside the dialog to focus.
In `gallery.html`, the close button (`#lightbox-close`) is the first focusable descendant within `#lightbox` because the surrounding wrapper `<div class="lightbox-content">` has no keyboard semantics or tabindex attribute.
As a result, focus is placed immediately on the close button when a user opens the lightbox. This can be visually distracting and is sub-optimal for screen readers, as the modal's entire context might not be fully announced before the close button's label is read.

---

## 3. Proposed Fix Strategy

To redirect focus to `.lightbox-content` without making the wrapper navigable via standard tab progression, we need to perform three steps:

### Step A: Make `.lightbox-content` Programmatically Focusable
Add `tabindex="-1"` to the `.lightbox-content` container in `gallery.html`.
- Setting `tabindex="-1"` permits setting focus programmatically via JavaScript using `.focus()`.
- It does **not** insert the element into the sequential keyboard navigation (Tab/Shift-Tab) flow, ensuring keyboard users do not get stuck on or have to tab through the structural wrapper.

### Step B: Programmatically Shift Focus
In `scripts/main.js`, after invoking `lightbox.showModal()`, select the `.lightbox-content` element and call `.focus()` on it.

### Step C: Style the Focused Element to Avoid Visual Regression
When a container with `tabindex="-1"` is focused, some browsers draw a default visual focus indicator (blue/black border) around the entire container bounds. Since `.lightbox-content` spans 100% of the viewport width and height, this would show an ugly screen-wide border. We should add an outline override in `styles/main.css`.

---

## 4. Proposed Code Modifications

### 1. File: `gallery.html`
**Target lines**: ~43
Modify the wrapper opening tag to include `tabindex="-1"`.

```html
<!-- Before -->
  <dialog id="lightbox" closedby="any">
    <div class="lightbox-content">

<!-- After -->
  <dialog id="lightbox" closedby="any">
    <div class="lightbox-content" tabindex="-1">
```

### 2. File: `scripts/main.js`
**Target lines**: ~659
Update the `openLightbox` function to focus `.lightbox-content`.

```javascript
// Before
    lightbox.showModal();
  }

// After
    lightbox.showModal();
    const lightboxContent = lightbox.querySelector('.lightbox-content');
    if (lightboxContent) {
      lightboxContent.focus();
    }
  }
```

### 3. File: `styles/main.css`
**Target lines**: ~628
Add `outline: none;` to the `.lightbox-content` class rule to prevent outline boxes on programmatic focus.

```css
/* Before */
.lightbox-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* After */
.lightbox-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  outline: none; /* Avoid default browser focus ring on container focus */
}
```
