import { setupLightbox, initLightbox } from './lightbox.js';
import { loadImageSizes, imageAttrs } from './images.js';

let resizeController = null;

export async function initGalleryPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const galleryId = urlParams.get('id');
  
  if (!galleryId) {
    window.location.href = 'index.html';
    return;
  }

  const container = document.getElementById('gallery-content');
  if (!container) return;

  try {
    const [res, sizesMap] = await Promise.all([
      fetch('data/galleries.json'),
      loadImageSizes()
    ]);
    if (!res.ok) throw new Error('Failed to load galleries');
    const galleries = await res.json();

    if (galleryId === 'favourites') {
      renderFavouritesGallery(galleries, container, sizesMap);
      return;
    }

    const gallery = galleries.find(g => g.id === galleryId);
    if (!gallery) {
      container.innerHTML = '<p>Gallery not found.</p>';
      return;
    }

    document.title = `${gallery.title} — Photography Portfolio`;
    const currentImages = gallery.images.map(img => `images/${gallery.id}/${typeof img === 'string' ? img : img.src}`);
    setupLightbox(currentImages);

    const html = `
      <div class="gallery-header">
        <a href="index.html" class="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Back to Home
        </a>
        <h1>${gallery.title}</h1>
        <p>${gallery.description}</p>
      </div>
      <div class="photos-grid">
        ${gallery.images.map((img, i) => {
          const rel = `${gallery.id}/${typeof img === 'string' ? img : img.src}`;
          const attrs = imageAttrs(rel, sizesMap, '(max-width: 1200px) 100vw, 1200px');
          return `
          <div class="photo-item is-loading" data-index="${i}" tabindex="0">
            <img ${attrs} alt="${gallery.title} photo ${i + 1}" loading="lazy">
          </div>
        `;
        }).join('')}
      </div>
    `;

    container.innerHTML = html;
    
    container.querySelectorAll('.photo-item img').forEach(img => {
      const item = img.parentElement;
      if (!item) return;

      if (img.complete) {
        item.classList.remove('is-loading');
        item.classList.add('is-loaded');
      } else {
        const handleLoad = () => {
          img.removeEventListener('load', handleLoad);
          img.removeEventListener('error', handleError);
          item.classList.remove('is-loading');
          item.classList.add('is-loaded');
        };
        const handleError = () => {
          img.removeEventListener('load', handleLoad);
          img.removeEventListener('error', handleError);
          item.classList.remove('is-loading');
          item.classList.add('is-loaded');
        };
        img.addEventListener('load', handleLoad);
        img.addEventListener('error', handleError);
      }
    });

    initLightbox();

  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Error loading gallery.</p>';
  }
}

function resizeAllGridItems(container) {
  const grid = (container && container.querySelector('.mosaic-grid')) || document.querySelector('.mosaic-grid');
  if (!grid || grid.classList.contains('is-classic')) return;

  const items = grid.querySelectorAll('.photo-item');

  // Read the layout constants from CSS so the breakpoints live in exactly one
  // place. grid-auto-rows is the quantisation unit for the masonry spans.
  const gridStyle = window.getComputedStyle(grid);
  const rowHeight = parseFloat(gridStyle.gridAutoRows) || 1;
  const rowGap = parseFloat(gridStyle.rowGap) || 0;
  const columnGap = parseFloat(gridStyle.columnGap) || 0;
  const columnsCount = gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length || 1;

  const gridClientWidth = grid.clientWidth;
  const parentClientWidth = grid.parentElement ? grid.parentElement.clientWidth : 0;
  const containerClientWidth = (container && container.clientWidth) || 0;
  
  const measurements = Array.from(items).map(item => {
    const img = item.querySelector('img');
    if (!img) return { calculatedHeight: 0 };

    const dim = item.getBoundingClientRect();
    let itemWidth = dim.width;

    if (itemWidth === 0) {
      const containerWidth = gridClientWidth || parentClientWidth || containerClientWidth || window.innerWidth;
      const totalGapsWidth = (columnsCount - 1) * columnGap;
      const baseColWidth = Math.max(0, (containerWidth - totalGapsWidth) / columnsCount);
      // Ask the cascade whether this item actually spans two columns: the
      // media queries drop wide/featured back to a single column on narrow
      // viewports, so the class alone is not enough.
      const spansTwo = window.getComputedStyle(item).gridColumnEnd === 'span 2';
      const itemSpan = spansTwo ? 2 : 1;
      itemWidth = baseColWidth * itemSpan + (itemSpan > 1 ? columnGap : 0);
    }

    let ratio = 0;
    if (img.naturalWidth > 0) {
      ratio = img.naturalHeight / img.naturalWidth;
    } else {
      const attrWidth = parseFloat(img.getAttribute('width'));
      const attrHeight = parseFloat(img.getAttribute('height'));
      if (attrWidth > 0 && attrHeight > 0) {
        ratio = attrHeight / attrWidth;
      }

      if (ratio === 0) {
        const computedStyle = window.getComputedStyle(img);
        const aspect = computedStyle.aspectRatio;
        if (aspect && aspect !== 'auto' && aspect !== 'none') {
          const parts = aspect.split('/').map(p => parseFloat(p.trim()));
          if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
            ratio = parts[1] / parts[0];
          } else {
            const parsed = parseFloat(aspect);
            if (!isNaN(parsed) && parsed > 0) {
              ratio = 1 / parsed;
            }
          }
        }
      }

      if (ratio === 0) {
        ratio = 2 / 3;
      }
    }

    const calculatedHeight = itemWidth * ratio;
    // The item's own bottom margin provides the vertical gutter, so it has to
    // be part of the span or rows overlap the following item.
    const marginBottom = parseFloat(window.getComputedStyle(item).marginBottom) || 0;
    return { calculatedHeight, marginBottom };
  });

  items.forEach((item, i) => {
    const { calculatedHeight, marginBottom } = measurements[i];
    if (calculatedHeight > 0) {
      // +1 row of slack absorbs sub-pixel rounding in the ratio estimate; with a
      // 1px row unit that is invisible, and without it items can overlap by ~1px.
      const outerHeight = calculatedHeight + marginBottom;
      const rowSpan = Math.max(1, Math.ceil((outerHeight + rowGap) / (rowHeight + rowGap)) + 1);
      item.style.gridRowEnd = `span ${rowSpan}`;
      item.style.containIntrinsicSize = 'auto none auto ' + Math.round(calculatedHeight) + 'px';
    }
  });
}

function renderFavouritesGallery(galleries, container, sizesMap) {
  const favGallery = galleries.find(g => g.id === 'favourites');
  if (!favGallery) {
    container.innerHTML = '<p>Gallery not found.</p>';
    return;
  }

  document.title = `${favGallery.title} — Photography Portfolio`;
  
  const favourites = favGallery.images.map((img, index) => {
    const isObj = typeof img !== 'string';
    const srcStr = isObj ? img.src : img;
    
    let isFeatured = false;
    if (isObj && img.featured !== undefined) {
      isFeatured = img.featured;
    }
    
    return {
      src: `images/${srcStr}`,
      rel: srcStr,
      alt: `Favourite shot`,
      featured: isFeatured
    };
  });
  
  const currentImages = favourites.map(f => f.src);
  setupLightbox(currentImages);

  const html = `
    <div class="gallery-header">
      <a href="index.html" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        Back to Home
      </a>
      <h1>${favGallery.title}</h1>
      <p>${favGallery.description}</p>
      <div style="margin-top: 1.5rem;">
        <button id="toggle-mosaic-mode" class="nav-link layout-toggle-btn" aria-pressed="false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          Show Classic Grid
        </button>
      </div>
    </div>
    <div class="mosaic-grid is-ready" style="max-width: var(--max-width); margin: 0 auto; padding: 0 var(--space-md) var(--space-lg);">
      ${favourites.length === 0 ? '<p style="grid-column: 1 / -1; text-align: center;">No favourite images yet. Add some to images/favourites/ and update data/galleries.json.</p>' : ''}
      ${favourites.map((f, i) => {
        const attrs = imageAttrs(f.rel, sizesMap, '(max-width: 600px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw');
        return `
        <div class="photo-item is-loading" data-index="${i}" data-featured="${f.featured ? 'true' : 'false'}" tabindex="0" style="view-transition-name: photo-${i};">
          <img ${attrs} alt="${f.alt}" loading="lazy">
        </div>
      `;
      }).join('')}
    </div>
  `;

  container.innerHTML = html;

  // Primer cálculo inmediato: los atributos width/height del marcado bastan,
  // no hace falta que ninguna imagen haya cargado todavía.
  resizeAllGridItems(container);

  const grid = container.querySelector('.mosaic-grid');
  const allImgs = container.querySelectorAll('.photo-item img');
  const totalImages = allImgs.length;
  let loadedCount = 0;

  let progressiveResizeTimeout;
  function triggerProgressiveResize() {
    clearTimeout(progressiveResizeTimeout);
    progressiveResizeTimeout = setTimeout(() => {
      resizeAllGridItems(container);
    }, 50);
  }

  function processLoadedImage(item, img) {
    if (item.classList.contains('is-fully-loaded')) return;

    const hasDimensions = img && img.naturalWidth > 0;

    item.classList.remove('is-loading');
    item.classList.add('is-loaded');

    if (hasDimensions) {
      item.classList.add('is-fully-loaded');
    }

    if (item.getAttribute('data-featured') === 'true') {
      const width = img.naturalWidth || parseFloat(img.getAttribute('width')) || 0;
      const height = img.naturalHeight || parseFloat(img.getAttribute('height')) || 0;
      if (width && height) {
        const ratio = width / height;
        item.classList.remove('photo-item--wide', 'photo-item--featured');
        if (ratio > 1.2) {
          item.classList.add('photo-item--wide');
        } else if (ratio < 0.8) {
          // Vertical: keep 1 column, natural height makes it stand out
        } else {
          item.classList.add('photo-item--featured');
        }
      }
    }
    triggerProgressiveResize();
  }

  function checkAllLoaded() {
    loadedCount++;
    if (loadedCount >= totalImages) {
      clearTimeout(safetyTimeoutId);
      triggerProgressiveResize();
    }
  }

  const safetyTimeoutId = setTimeout(() => {
    container.querySelectorAll('.photo-item.is-loading').forEach(item => {
      const img = item.querySelector('img');
      if (img) {
        processLoadedImage(item, img);
      }
    });
    triggerProgressiveResize();
  }, 3000);

  allImgs.forEach(img => {
    const item = img.parentElement;
    if (!item) return;

    const handleLoad = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      processLoadedImage(item, img);
      checkAllLoaded();
    };

    const handleError = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      processLoadedImage(item, img);
      checkAllLoaded();
    };

    if (img.complete && img.naturalWidth > 0) {
      processLoadedImage(item, img);
      loadedCount++;
    } else {
      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);
    }
  });

  if (loadedCount >= totalImages) {
    clearTimeout(safetyTimeoutId);
    triggerProgressiveResize();
  }

  if (resizeController) {
    resizeController.abort();
  }
  resizeController = new AbortController();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeAllGridItems(container);
    }, 150);
  }, { signal: resizeController.signal });

  const toggleBtn = document.getElementById('toggle-mosaic-mode');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isClassicModeNext = !grid.classList.contains('is-classic');
      toggleBtn.setAttribute('aria-pressed', isClassicModeNext.toString());

      if (!document.startViewTransition) {
        doTransition();
        return;
      }

      document.startViewTransition(() => {
        doTransition();
      });

      function doTransition() {
        grid.classList.toggle('is-classic');
        const isClassic = grid.classList.contains('is-classic');
        
        if (isClassic) {
          toggleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> Show Featured Mosaic';
          grid.querySelectorAll('.photo-item').forEach(item => {
            item.style.gridRowEnd = '';
          });
        } else {
          toggleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> Show Classic Grid';
          resizeAllGridItems(container);
        }
      }
    });
  }

  initLightbox();
}
