
--- Guide for carousel-slide-effects ---
# Build Carousel Slide Effects

Carousel slide effects are a great way to add visual interest to a carousel. As the user scrolls through the slides, each slide can animate as it enters, centers, and exits the scrollport. For example, the slides can fade in and out, rotate, or scale in size. This creates a dynamic and engaging user experience. Unlike simple entry/exit animations, this effect uses a single, continuous animation to control the slide's appearance across the entire scrollport.

## How to implement

Here’s how to create carousel slide effects:

1.  **Create a scroller:** This element will act as the container for your carousel slides. In this example it uses `overflow-x: scroll` to allow horizontal scrolling.

    ```html
    <ul class="scroller">
      <li class="entry">1</li>
      <li class="entry">2</li>
      <li class="entry">3</li>
      …
    </ul>
    ```

    ```css
    .scroller {
      overflow-x: scroll;
    }
    ```

2.  **Define the animation:** Create a CSS animation that defines the different states of your slides as they traverse the scrollport. You can define keyframes for any part of the animation. For example, you can define a state for when the slides are in the center of the scrollport by including a `50%` keyframe. In this example, the `scale` property makes the slides grow as they approach the center and shrink as they move away.

    ```css
    @keyframes animate {
      0% {
        scale: 0.5;
      }
      50% {
        scale: 1;
      }
      100% {
        scale: 0.5;
      }
    }
    ```

3.  **Apply the animation and `view-timeline`:** Attach the animation to the carousel slides and link it to a `view-timeline` that tracks the element as it scrolls through the container.

    ```css
    .scroller > * {
      animation: animate auto linear both;
      animation-timeline: view(inline);
    }
    ```

    By default, `view()` tracks the element on the `block` axis. If you need to track it on the `inline` axis, you can use `view(inline)`.

## Example code

This code animates the carousel items of a horizontal scroller on scroll using an **anonymous view-timeline**:

```css
@keyframes animate {
  0% {
    scale: 0.5;
  }

  50% {
    scale: 1;
  }

  100% {
    scale: 0.5;
  }
}

.scroller > * {
  /* Applies the animation using an `auto` duration */
  animation: animate auto linear both;
  /* Sets the animation timeline to use an anonymous view progress timeline, tracking the element's progress through the scroller on the inline axis */
  animation-timeline: view(inline);
}
```

This code animates the carousel items of a horizontal scroller on scroll using a **named view-timeline**:

```css
@keyframes animate {
  0% {
    scale: 0.5;
  }

  50% {
    scale: 1;
  }

  100% {
    scale: 0.5;
  }
}

/* This creates a named view-timeline on each carousel item. The timeline is used to drive the animation that is applied on the same element. */
.scroller > * {
  /* Applies the animation using an `auto` duration */
  animation: animate auto linear both;
  /* Defines a named view progress timeline, tracking the element's progress through the scroller on the inline axis */
  view-timeline: --item inline;
  /* Sets the animation timeline to use the named view progress timeline defined above */
  animation-timeline: --item;
}
```

## Best Practices

When using scroll-driven animations, it's important to follow a few best practices to ensure a smooth and accessible experience:

- **DO** include feature detection: Not all browsers support scroll-driven animations. Use `@supports ((animation-timeline: view()) and (animation-range: entry))` to check for support and provide a fallback for browsers that don't support it.
  - The `(animation-range: entry)` check **MUST** be included here, to filter out browsers with only partial support.
  - **DO NOT** use the `scroll-timeline-polyfill` package for the fallback strategy as it is not feature complete and has a lot of known issues.
  - If the animation is only considered to be decorative, opt for Progressive Enhancement and **DO NOT** provide a fallback.
- **DO** respect user preferences: Some users prefer to have less motion on the web. Use the `prefers-reduced-motion` media query to disable or reduce your animations for these users.
- **DO** try to animate only performant CSS properties: For the smoothest animations, stick to animating properties that can be handled by the browser's compositor thread, such as `transform` and `opacity`. Animating other properties like `width` or `height` can lead to performance issues.
- **DO** use the correct declaration order: When using the `animation` shorthand property, declare `animation-timeline` and `animation-range` *after* it to prevent the shorthand from resetting the timeline.

Prefer a named `view-timeline` when multiple DOM elements need to animate based on the same timeline, or when you need to animate children of the element that has the `view-timeline` defined on it. If the element that you animate is also the element that defines the `view-timeline`, you can use an anonymous view-timeline using `view()`.

When using the `view()` function to create a scroll-driven animation:

- **OPTIONAL** be explicit about the axis to track: When not targeting the default `block` axis (such as in a horizontal scroller), be explicit about which axis to track with `view(block)` or `view(inline)`.

When using the `view-timeline` property to create a scroll-driven animation:

- **DO** use a CSS `<dashed-ident>` for the name (e.g. `view-timeline: --my-custom-name`)
- **OPTIONAL** be explicit about the axis to track: When not targeting the default `block` axis (such as in a horizontal scroller), be explicit about which axis to track with `view-timeline-axis`.
- **DO** make sure the scope of the lookup works: When the element that is declaring the `view-timeline` is not a flat tree ancestor of the animated element, hoist up the visibility of the `view-timeline`’s name by using `timeline-scope` on a shared ancestor.

## Browser support and fallback strategies

Scroll-driven animations has limited availability.
Supported by: Chrome 115 (Jul 2023), Edge 115 (Jul 2023), and Safari 26 (Sep 2025).
Unsupported in: Firefox.. Therefore, a fallback strategy is typically required.

For browsers that do not support scroll-driven animations, you can use a fallback to recreate the visual effects. The fallbacks are typically built with either a scroll listener (for ScrollTimeline effects) or the IntersectionObserver API (for ViewTimeline effects).

In browsers with built-in support for scroll-driven animations, ALWAYS use the native CSS implementation as those are more performant.

Note that not every effect can be recreated using the fallbacks approach.

For this use-case specifically, the following script applies the fallback for browsers that do not support scroll-driven animations. It uses the Web Animations API (`Element.animate()`) to create a paused animation for each item in the carousel. It then listens to the `scroll` event on the scroller and updates the `currentTime` of each animation based on the item's scroll progress within the scroller.

```js
// Fallback for browsers that don't support scroll-driven animations
if (!CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
  const scroller = document.querySelector('.scroller');
  const entries = document.querySelectorAll('.entry');

  // Create a map to store animations
  const animations = new Map();

  entries.forEach(entry => {
    const animation = entry.animate(
      {
        scale: ['0.5', '1', '0.5']
      },
      {
        duration: 1, // We'll control the time ourselves
        fill: 'both'
      }
    );
    animation.pause();
    animations.set(entry, animation);
  });

  // Update animations on scroll
  const tick = () => {
    const scrollerRect = scroller.getBoundingClientRect();

    entries.forEach(entry => {
      const animation = animations.get(entry);
      if (!animation) return;

      const entryRect = entry.getBoundingClientRect();
      const progress = (entryRect.left + entryRect.width / 2 - scrollerRect.left) / scrollerRect.width;

      animation.currentTime = progress;
    });
  };
    
  scroller.addEventListener('scroll', tick);
  tick();
}
```


--- Guide for physics-based-easing ---
Traditional CSS easing functions like `ease-in` or `cubic-bezier()` are limited to simple curves, making it impossible to create complex physics-based effects like bounces or springs. The `linear()` timing function solves this by allowing you to provide a series of stops that can approximate complex curves. Transitions and animations are interpolated based on straight lines between the stops, but within enough stops, it can appear smooth.

### Implementation Steps

1.  **Generate the curve stops:**
    Manually plotting dozens of points for a spring or bounce is impractical. Use a timing function from an external library, or use a  tool to convert an existing JavaScript easing function or an SVG path into the `linear()` syntax. Optional: store these timing functions as CSS custom properties for reuse throughout your site.
2.  **Define the timing function:**
    Apply the generated stops to the `transition-timing-function` or `animation-timing-function` property, or through the `transition` or `animation` shorthands.
3.  **Adjust the duration:**
    Unlike JavaScript physics engines where duration is derived from physical properties (mass, stiffness), CSS still requires a fixed `duration`. You may need to adjust the duration to get the intended effect.

### Example: Spring Easing

This example shows how to use a custom `linear()` function to create a spring effect that overshoots the target value before settling.

```css
.spring {
  /* Define the physics-based easing as a reusable variable */
  --spring-easing: linear(0, 0.016 0.5%, 0.06 1%, 0.226 2%, 1.116 5.4%, 1.375 6.6%, 1.527 7.7%, 1.565 8.2%, 1.585 8.8%, 1.581 9.3%, 1.559 9.8%, 1.458 10.9%, 0.937 14.3%, 0.784 15.5%, 0.693 16.6%, 0.67 17.1%, 0.657 17.7%, 0.671 18.7%, 0.729 19.8%, 1.042 23.3%, 1.13 24.5%, 1.182 25.6%, 1.201 26.7%, 1.192 27.7%, 1.156 28.8%, 0.977 32.2%, 0.925 33.4%, 0.894 34.5%, 0.882 35.6%, 0.887 36.6%, 0.907 37.7%, 1.045 42.4%, 1.069 44.5%, 1.059 46.3%, 0.979 50.9%, 0.96 53.4%, 0.966 55.3%, 1.013 59.9%, 1.024 62.3%, 0.986 71.2%, 1.008 79.9%, 0.995 88.9%, 1);


  /* Apply the easing with a duration that fits the spring's complexity */
  /* MANDATORY: Always include a duration; linear() does not calculate it automatically */
  transition: scale 0.8s var(--spring-easing);
}

.spring:hover {
  scale: 1.2;
}
```
### Example: Bounce Easing

This example shows how to use a custom `linear()` function to create a bounce effect.

```css
.bounce {
  /* Define the physics-based easing as a reusable variable */
  --bounce-easing: linear(0, 0.214 14.7%, 0.386 23.7%, 0.598 31.9%, 0.999 44.7%, 0.807 52.6%, 0.762 56%, 0.747 59.4%, 0.758 62.4%, 0.793 65.6%, 0.999 77.4%, 0.961 81.2%, 0.949 84.8%, 0.956 88%, 0.993 95.5%, 1);


  /* Apply the easing with a duration that fits the bounce's complexity */
  /* MANDATORY: Always include a duration; linear() does not calculate it automatically */
  transition: scale 0.4s var(--bounce-easing);
}

.bounce:hover {
  scale: 1.2;
}
```

### Key Considerations

*   **Performance:** For the smoothest physics-based animations, apply `linear()` to properties that run on a separate thread, such as `transform` and `opacity`.
*   **Precision vs. Payload:** While more stops result in a smoother curve, they also increase the size of your CSS. Most generators allow you to "simplify" the curve to find the optimal balance between smoothness and code size.
*   **Avoid Opacity for Bounces:** Applying bounce easings to `opacity` can cause visually jarring flickering if the value overshoots below 0 or above 1.
*   **Accessibility:** Complex physics-based animations can be distracting or cause motion sensitivity for some users. Always respect user preferences by reducing or disabling these animations.

```css
@media (prefers-reduced-motion: reduce) {
  .element {
    transition: none;
  }
}
```

### Fallback strategies

Baseline status for linear() easing: Newly available. It's been Baseline since 2023-12-11.
Supported by: Chrome 113 (May 2023), Edge 113 (May 2023), Firefox 112 (Apr 2023), and Safari 17.2 (Dec 2023).

#### CSS Fallback
For browsers that do not support `linear()`, provide a standard easing function as a fallback. The browser will ignore the `linear()` value if it doesn't recognize it, falling back to the previous valid declaration.

```css
.element {
  /* Fallback for older browsers (standard smooth exit) */
  transition: transform 0.8s ease-out;
  
  /* Modern browsers will override with the physics-based easing */
  transition-timing-function: linear(0, 1.1, 0.95, 1.02, 1);
}
```

#### JavaScript Library Fallback (Motion/GSAP)

Optional: If a high-fidelity physics animation is critical even in older browsers, use a JavaScript library like **Motion** (motion.dev) or **GSAP** (greensock.com) to handle the animation when `linear()` is unsupported.

1.  **Detect support:** Use `CSS.supports()` to check if the browser handles the `linear()` function.
2.  **Conditionally load/apply:** If unsupported, use the library's spring or bounce implementation.

```javascript
/* Detect if the browser supports the linear() function */
const supportsLinearEasing = window.CSS && CSS.supports('animation-timing-function', 'linear(0, 1)');

if (!supportsLinearEasing) {
  /* 
     Example using Motion (motion.dev) for a spring fallback.
     This should only be initialized if native CSS support is missing.
  */
  import("https://cdn.jsdelivr.net/npm/motion@latest/dist/motion.js").then(({ animate, spring }) => {
    animate(".element", { transform: "scale(1.2)" }, {
      easing: spring({ stiffness: 100, damping: 10 })
    });
  });
}
```

You can also use `@supports` in CSS for more explicit feature detection:

```css
@supports not (animation-timing-function: linear(0, 1)) {
  .element {
    /* Alternative experience for unsupported browsers */
    transition-duration: 0.4s;
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}
```

