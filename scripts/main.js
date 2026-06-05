/**
 * Photography Portfolio - Main Script
 * Handles Theme Toggle, Dynamic Routing, and Lightbox
 */

let carouselIntervalId = null;
let isNavigating = typeof window !== 'undefined' && !!window.location.hash;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initScrollAnimations();
  initHeaderScroll();
  
  // Simple Router
  const isGalleryPage = window.location.pathname.includes('gallery.html');
  
  if (isGalleryPage) {
    initGalleryPage();
  } else {
    initHomePage();
  }
});

/* ==========================================================================
   Theme Management
   ========================================================================== */
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  // Check local storage or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', currentTheme);
  themeToggle.setAttribute('aria-pressed', (currentTheme === 'dark').toString());
  updateThemeIcon(currentTheme);

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    themeToggle.setAttribute('aria-pressed', (newTheme === 'dark').toString());
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme, true);
  });
}

function updateThemeIcon(theme, animate = false) {
  const iconContainer = document.getElementById('theme-icon-container');
  if (!iconContainer) return;

  const moonSVG = `<svg viewBox="0 0 24 24"><path d="M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36c-0.98,1.37-2.58,2.26-4.4,2.26 c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z"/></svg>`;
  const sunSVG  = `<svg viewBox="0 0 24 24"><path d="M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7z M2,13h2c0.55,0,1-0.45,1-1s-0.45-1-1-1H2c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13h2c0.55,0,1-0.45,1-1s-0.45-1-1-1h-2c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1S11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z"/></svg>`;

  const newIcon = theme === 'dark' ? moonSVG : sunSVG;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!animate || prefersReduced) {
    // Initial load or reduced motion: set icon immediately
    iconContainer.innerHTML = newIcon;
    return;
  }

  // Phase 1: exit animation
  iconContainer.classList.remove('is-entering');
  iconContainer.classList.add('is-exiting');

  const onExitDone = () => {
    iconContainer.removeEventListener('animationend', onExitDone);
    // Swap the icon
    iconContainer.innerHTML = newIcon;
    // Phase 2: enter animation
    iconContainer.classList.remove('is-exiting');
    iconContainer.classList.add('is-entering');

    const onEnterDone = () => {
      iconContainer.removeEventListener('animationend', onEnterDone);
      iconContainer.classList.remove('is-entering');
    };
    iconContainer.addEventListener('animationend', onEnterDone, { once: true });
  };

  iconContainer.addEventListener('animationend', onExitDone, { once: true });
}


function initScrollAnimations() {
  // Always enable scroll animations unless the user prefers reduced motion.
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    document.documentElement.classList.add('scroll-animations-enabled');
  }
}


/* ==========================================================================
   Header Scroll Effect
   ========================================================================== */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let lastScrollY = window.scrollY;
  let ticking = false;
  let scrollTimeout = null;

  // Listen for clicks on navigation links to prevent header hiding during smooth scroll
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      isNavigating = true;
      header.classList.remove('is-hidden');
    });
  });

  window.addEventListener('scroll', () => {
    if (isNavigating) {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isNavigating = false;
        lastScrollY = window.scrollY;
      }, 100);
      
      lastScrollY = window.scrollY;
      return;
    }

    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (!isNavigating) {
          if (window.scrollY > 100 && window.scrollY > lastScrollY) {
            header.classList.add('is-hidden');
          } else {
            header.classList.remove('is-hidden');
          }
        }
        lastScrollY = window.scrollY;
        ticking = false;
      });
      ticking = true;
    }
  });
}

/* ==========================================================================
   Home Page: Fetch and render galleries
   ========================================================================== */
async function initHomePage() {
  const container = document.getElementById('galleries-container');
  if (!container) return;

  try {
    const res = await fetch('data/galleries.json');
    if (!res.ok) throw new Error('Failed to load galleries');
    const galleries = await res.json();
    
    // Group by category
    const photography = galleries.filter(g => g.category === 'photography');
    const inGame = galleries.filter(g => g.category === 'in-game');

    // Get the favourites gallery to use its cover image
    const favGallery = galleries.find(g => g.id === 'favourites');
    let favCover = favGallery && favGallery.coverImage ? favGallery.coverImage : (photography[0]?.coverImage || '');
    let favImages = favGallery ? favGallery.images : [];

    let lastFavIndex = -1;
    if (favImages.length > 0) {
      lastFavIndex = Math.floor(Math.random() * favImages.length);
      const randomImg = favImages[lastFavIndex];
      const imgSrc = typeof randomImg === 'string' ? randomImg : randomImg.src;
      favCover = `images/${imgSrc}`;
    }

    let html = '';
    
    // Add Favourites as the first featured card
    html += `
      <section class="category-section">
        <div id="section-featured" class="scroll-anchor"></div>
        <h2 class="section-title fade-in-up">Featured</h2>
        <div class="gallery-grid" style="margin-bottom: var(--space-xl)">
          <a href="gallery.html?id=favourites" class="gallery-card fade-in-up" data-layout="featured-banner">
            <div class="gallery-card__image-wrapper">
              <img id="fav-cover-img" class="gallery-card__image" src="${favCover}" alt="Favourites cover image" loading="lazy" width="1200" height="500" style="transition: opacity 0.5s ease, transform var(--transition-slow);">
            </div>
            <div class="gallery-card__info">
              <h3 class="gallery-card__title">Favourites</h3>
              <p class="gallery-card__desc">A curated collection of the best shots</p>
            </div>
          </a>
        </div>
      </section>
    `;

    if (photography.length > 0) {
      html += `
        <section class="category-section">
          <div id="section-photography" class="scroll-anchor"></div>
          <h2 class="section-title fade-in-up">Photography</h2>
          <div class="gallery-grid" style="margin-bottom: var(--space-xl)">
            ${photography.map((g, i) => renderGalleryCard(g, i)).join('')}
          </div>
        </section>
      `;
    }

    if (inGame.length > 0) {
      html += `
        <section class="category-section">
          <div id="section-in-game" class="scroll-anchor"></div>
          <h2 class="section-title gaming fade-in-up">In-Game Photography</h2>
          <div class="gallery-grid">
            ${inGame.map((g, i) => renderGalleryCard(g, i)).join('')}
          </div>
        </section>
      `;
    }

    container.innerHTML = html;
    
    // Change favourites cover image every 5 seconds
    if (carouselIntervalId) {
      clearInterval(carouselIntervalId);
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (favImages.length > 1 && !prefersReducedMotion) {
      carouselIntervalId = setInterval(() => {
        const imgEl = document.getElementById('fav-cover-img');
        if (imgEl) {
          let randomIndex;
          do {
            randomIndex = Math.floor(Math.random() * favImages.length);
          } while (randomIndex === lastFavIndex);
          lastFavIndex = randomIndex;

          const randomImg = favImages[randomIndex];
          const imgSrc = typeof randomImg === 'string' ? randomImg : randomImg.src;
          const newSrc = `images/${imgSrc}`;
          
          imgEl.style.opacity = '0';
          
          imgEl.addEventListener('transitionend', function handleTransitionEnd(e) {
            if (e.propertyName === 'opacity') {
              imgEl.removeEventListener('transitionend', handleTransitionEnd);
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
          });
        }
      }, 5000);
    }
    
    // Handle anchor links after dynamic content is loaded
    if (window.location.hash) {
      setTimeout(() => {
        const target = document.querySelector(window.location.hash);
        if (target) {
          isNavigating = true;
          const header = document.querySelector('.site-header');
          if (header) {
            header.classList.remove('is-hidden');
          }
          target.scrollIntoView({ behavior: 'smooth' });
          
          // Safety fallback: reset isNavigating after 1.5s in case scroll event didn't fire
          setTimeout(() => {
            isNavigating = false;
          }, 1500);
        } else {
          isNavigating = false;
        }
      }, 100);
    }
    
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Error loading galleries. Please try again later.</p>';
  }
}

function renderGalleryCard(gallery, index) {
  // Alternate layouts like the original site
  const layout = index % 2 === 0 ? 'horizontal-left' : 'horizontal-right';
  
  return `
    <a href="gallery.html?id=${gallery.id}" class="gallery-card fade-in-up" data-layout="${layout}" style="animation-delay: ${index * 100}ms">
      <div class="gallery-card__image-wrapper">
        <img class="gallery-card__image" src="${gallery.coverImage}" alt="${gallery.title} cover image" loading="lazy" width="600" height="400">
      </div>
      <div class="gallery-card__info">
        <h3 class="gallery-card__title">${gallery.title}</h3>
        <p class="gallery-card__desc">${gallery.description}</p>
      </div>
    </a>
  `;
}

/* ==========================================================================
   Gallery Page: Fetch and render specific gallery
   ========================================================================== */
const GalleryManager = (() => {
  let currentImages = [];
  let currentImageIndex = 0;
  let resizeController = null;

  async function initGalleryPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const galleryId = urlParams.get('id');
    
    if (!galleryId) {
      window.location.href = 'index.html';
      return;
    }

    const container = document.getElementById('gallery-content');
    if (!container) return;

    try {
      const res = await fetch('data/galleries.json');
      if (!res.ok) throw new Error('Failed to load galleries');
      const galleries = await res.json();
      
      if (galleryId === 'favourites') {
        renderFavouritesGallery(galleries, container);
        return;
      }

      const gallery = galleries.find(g => g.id === galleryId);
      if (!gallery) {
        container.innerHTML = '<p>Gallery not found.</p>';
        return;
      }

      document.title = `${gallery.title} — Photography Portfolio`;
      currentImages = gallery.images.map(img => `images/${gallery.id}/${typeof img === 'string' ? img : img.src}`);

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
          ${gallery.images.map((img, i) => `
            <div class="photo-item is-loading" data-index="${i}">
              <img src="images/${gallery.id}/${typeof img === 'string' ? img : img.src}" alt="${gallery.title} photo ${i + 1}" loading="lazy">
            </div>
          `).join('')}
        </div>
      `;

      container.innerHTML = html;
      
      // Attach load events
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
    
    // Batch DOM reads: Get all computed heights and gaps mathematically
    const rowHeight = 10;
    const gapStr = window.getComputedStyle(grid).getPropertyValue('row-gap');
    const rowGap = parseInt(gapStr) || 0;
    
    let columnsCount = 3;
    if (window.innerWidth <= 600) {
      columnsCount = 1;
    } else if (window.innerWidth <= 1024) {
      columnsCount = 2;
    }
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
        const totalGapsWidth = (columnsCount - 1) * rowGap;
        const baseColWidth = Math.max(0, (containerWidth - totalGapsWidth) / columnsCount);
        const isWide = item.classList.contains('photo-item--wide') || item.classList.contains('photo-item--featured');
        const itemSpan = (isWide && columnsCount > 1) ? 2 : 1;
        itemWidth = baseColWidth * itemSpan + (itemSpan > 1 ? rowGap : 0);
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
      return { calculatedHeight };
    });

    // Batch DOM writes: Set new spans and contain-intrinsic-size
    items.forEach((item, i) => {
      const { calculatedHeight } = measurements[i];
      if (calculatedHeight > 0) {
        const rowSpan = Math.ceil((calculatedHeight + rowGap) / (rowHeight + rowGap)) + 1;
        item.style.gridRowEnd = `span ${rowSpan}`;
        item.style.containIntrinsicSize = 'auto none auto ' + Math.round(calculatedHeight) + 'px';
      }
    });
  }

  function renderFavouritesGallery(galleries, container) {
    const favGallery = galleries.find(g => g.id === 'favourites');
    if (!favGallery) {
      container.innerHTML = '<p>Gallery not found.</p>';
      return;
    }

    document.title = `${favGallery.title} — Photography Portfolio`;
    
    const favourites = favGallery.images.map((img, index) => {
      const isObj = typeof img !== 'string';
      const srcStr = isObj ? img.src : img;
      
      // Only mark as featured if explicitly set in the JSON data.
      let isFeatured = false;
      if (isObj && img.featured !== undefined) {
        isFeatured = img.featured;
      }
      
      return {
        src: `images/${srcStr}`,
        alt: `Favourite shot`,
        featured: isFeatured
      };
    });
    
    currentImages = favourites.map(f => f.src);

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
            Show Classic 3-Column
          </button>
        </div>
      </div>
      <div class="mosaic-grid is-ready" style="max-width: var(--max-width); margin: 0 auto; padding: 0 var(--space-md) var(--space-lg);">
        ${favourites.length === 0 ? '<p style="grid-column: 1 / -1; text-align: center;">No favourite images yet. Add some to images/favourites/ and update data/galleries.json.</p>' : ''}
        ${favourites.map((f, i) => `
          <div class="photo-item is-loading" data-index="${i}" data-featured="${f.featured ? 'true' : 'false'}" style="view-transition-name: photo-${i};">
            <img src="${f.src}" alt="${f.alt}" loading="lazy">
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;

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

    // Debounced resize listener
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
            toggleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> Show Classic 3-Column';
            resizeAllGridItems(container);
          }
        }
      });
    }

    initLightbox();
  }

  /* ==========================================================================
     Lightbox (using native <dialog>)
     ========================================================================== */
  function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    if (!lightbox || !lightboxImage) return;

    // Add click events to thumbnails
    document.querySelectorAll('.photo-item').forEach(item => {
      item.addEventListener('click', () => {
        currentImageIndex = parseInt(item.getAttribute('data-index'));
        openLightbox();
      });
    });

    // Lightbox controls
    document.getElementById('lightbox-close').addEventListener('click', () => lightbox.close());
    document.getElementById('lightbox-prev').addEventListener('click', showPrevImage);
    document.getElementById('lightbox-next').addEventListener('click', showNextImage);

    // Keyboard navigation
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') showPrevImage();
      if (e.key === 'ArrowRight') showNextImage();
      // Escape is handled natively by <dialog>
    });
    
    // Close on backdrop click (light-dismiss fallback)
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
          lightbox.close();
        }
      });
    }
  }

  function preloadAdjacentImages() {
    const preload = (index) => {
      if (index >= 0 && index < currentImages.length) {
        const img = new Image();
        img.src = currentImages[index];
      }
    };
    preload(currentImageIndex - 1);
    preload(currentImageIndex + 1);
  }

  function openLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    if (!lightbox || !lightboxImage) return;

    const newSrc = currentImages[currentImageIndex];

    // Sync alt from thumbnail
    const activeItem = document.querySelector(`.photo-item[data-index="${currentImageIndex}"]`);
    const activeImg = activeItem ? activeItem.querySelector('img') : null;
    const newAlt = activeImg ? (activeImg.alt || 'Full screen gallery view') : 'Full screen gallery view';

    if (!lightbox.open) {
      // First open: load directly
      lightboxImage.classList.remove('is-loaded');
      lightboxImage.src = newSrc;
      lightboxImage.alt = newAlt;
      lightboxImage.onload = () => lightboxImage.classList.add('is-loaded');
      lightboxImage.onerror = () => lightboxImage.classList.add('is-loaded');
      lightbox.showModal();
      const lightboxContent = lightbox.querySelector('.lightbox-content');
      if (lightboxContent) lightboxContent.focus();
    } else {
      // Crossfade between images
      lightboxImage.style.opacity = '0';
      lightboxImage.style.transform = 'scale(0.95)';

      const tempImg = new Image();
      tempImg.src = newSrc;
      tempImg.alt = newAlt;

      const doSwap = () => {
        lightboxImage.src = newSrc;
        lightboxImage.alt = newAlt;
        lightboxImage.classList.add('is-loaded');
        lightboxImage.style.opacity = '';
        lightboxImage.style.transform = '';
      };

      if (tempImg.complete) {
        doSwap();
      } else {
        tempImg.onload = doSwap;
        tempImg.onerror = doSwap;
      }
    }

    preloadAdjacentImages();
  }

  function showPrevImage() {
    if (currentImageIndex > 0) {
      currentImageIndex--;
      openLightbox();
    } else {
      // Loop to end
      currentImageIndex = currentImages.length - 1;
      openLightbox();
    }
  }

  function showNextImage() {
    if (currentImageIndex < currentImages.length - 1) {
      currentImageIndex++;
      openLightbox();
    } else {
      // Loop to start
      currentImageIndex = 0;
      openLightbox();
    }
  }

  return { initGalleryPage };
})();

const initGalleryPage = GalleryManager.initGalleryPage;

/* ==========================================================================
   Section Keyboard Navigation (j/k) — Home Page only
   ========================================================================== */
function initSectionKeyNav() {
  document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in an input or the lightbox is open
    if (e.target.matches('input, textarea, select') || document.querySelector('#lightbox[open]')) return;
    if (e.key !== 'j' && e.key !== 'k') return;

    const anchors = Array.from(document.querySelectorAll('.scroll-anchor'));
    if (anchors.length === 0) return;

    // Find which anchor is closest to the current viewport top
    const scrollY = window.scrollY + 100;
    let currentIdx = 0;
    for (let i = 0; i < anchors.length; i++) {
      if (anchors[i].getBoundingClientRect().top + window.scrollY <= scrollY) {
        currentIdx = i;
      }
    }

    let targetIdx = e.key === 'j' ? currentIdx + 1 : currentIdx - 1;
    targetIdx = Math.max(0, Math.min(anchors.length - 1, targetIdx));

    if (targetIdx !== currentIdx || (e.key === 'k' && currentIdx === 0)) {
      anchors[targetIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// Hook into DOMContentLoaded — runs on home page only (gallery page has no .scroll-anchor)
document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.includes('gallery.html')) {
    initSectionKeyNav();
  }
});
