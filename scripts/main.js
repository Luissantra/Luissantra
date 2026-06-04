/**
 * Photography Portfolio - Main Script
 * Handles Theme Toggle, Dynamic Routing, and Lightbox
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
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
  updateThemeIcon(currentTheme);

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });
}

function updateThemeIcon(theme) {
  const iconContainer = document.getElementById('theme-icon-container');
  if (!iconContainer) return;

  if (theme === 'dark') {
    iconContainer.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36c-0.98,1.37-2.58,2.26-4.4,2.26 c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z"/></svg>`;
  } else {
    iconContainer.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7z M2,13h2c0.55,0,1-0.45,1-1s-0.45-1-1-1H2c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13h2c0.55,0,1-0.45,1-1s-0.45-1-1-1h-2c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1S11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z"/></svg>`;
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
  let isNavigating = false;
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

    if (favImages.length > 0) {
      const randomIndex = Math.floor(Math.random() * favImages.length);
      favCover = `images/favourites/${favImages[randomIndex]}`;
    }

    let html = '';
    
    // Add Favourites as the first featured card
    html += `
      <section class="category-section">
        <div id="section-featured" style="scroll-margin-top: 65px;"></div>
        <h2 class="section-title fade-in-up">Featured</h2>
        <div class="gallery-grid" style="margin-bottom: var(--space-xl)">
          <a href="gallery.html?id=favourites" class="gallery-card fade-in-up" data-layout="featured-banner">
            <div class="gallery-card__image-wrapper">
              <img id="fav-cover-img" class="gallery-card__image" src="${favCover}" alt="Favourites cover image" loading="lazy" width="1200" height="500" style="transition: opacity 0.5s ease;">
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
          <div id="section-photography" style="scroll-margin-top: 65px;"></div>
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
          <div id="section-in-game" style="scroll-margin-top: 65px;"></div>
          <h2 class="section-title gaming fade-in-up">In-Game Photography</h2>
          <div class="gallery-grid">
            ${inGame.map((g, i) => renderGalleryCard(g, i)).join('')}
          </div>
        </section>
      `;
    }

    container.innerHTML = html;
    
    // Change favourites cover image every 5 seconds
    if (favImages.length > 1) {
      setInterval(() => {
        const imgEl = document.getElementById('fav-cover-img');
        if (imgEl) {
          const randomIndex = Math.floor(Math.random() * favImages.length);
          const newSrc = `images/favourites/${favImages[randomIndex]}`;
          
          imgEl.style.opacity = '0';
          setTimeout(() => {
            imgEl.src = newSrc;
            imgEl.onload = () => {
              imgEl.style.opacity = '1';
            };
            imgEl.onerror = () => {
              imgEl.style.opacity = '1'; // Restore opacity if image fails to load
            };
          }, 500);
        }
      }, 5000);
    }
    
    // Handle anchor links after dynamic content is loaded
    if (window.location.hash) {
      setTimeout(() => {
        const target = document.querySelector(window.location.hash);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
    
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Error loading galleries. Please try again later.</p>';
  }
}

// renderFavourites is now removed from home page logic

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
let currentImages = [];
let currentImageIndex = 0;

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
    currentImages = gallery.images.map(img => `images/${gallery.id}/${img}`);

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
            <img src="images/${gallery.id}/${img}" alt="${gallery.title} photo ${i + 1}" loading="lazy" onload="this.parentElement.classList.remove('is-loading'); this.parentElement.classList.add('is-loaded')">
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;
    initLightbox();

  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Error loading gallery.</p>';
  }
}

function renderFavouritesGallery(galleries, container) {
  const favGallery = galleries.find(g => g.id === 'favourites');
  if (!favGallery) {
    container.innerHTML = '<p>Gallery not found.</p>';
    return;
  }

  document.title = `${favGallery.title} — Photography Portfolio`;
  
  const favourites = favGallery.images.map(img => ({
    src: `images/favourites/${img}`,
    thumb: `images/favourites/thumb_${img}`,
    alt: `Favourite shot`
  }));
  
  currentImages = favourites.map(f => f.src);

  const html = `
    <div class="gallery-header">
      <a href="index.html" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        Back to Home
      </a>
      <h1>${favGallery.title}</h1>
      <p>${favGallery.description}</p>
    </div>
    <div class="mosaic-grid" style="max-width: var(--max-width); margin: 0 auto; padding: 0 var(--space-md) var(--space-lg);">
      ${favourites.length === 0 ? '<p style="grid-column: 1 / -1; text-align: center;">No favourite images yet. Add some to images/favourites/ and update data/galleries.json.</p>' : ''}
      ${favourites.map((f, i) => `
        <div class="photo-item is-loading" data-index="${i}">
          <img src="${f.thumb}" alt="${f.alt}" loading="lazy" onload="this.parentElement.classList.remove('is-loading'); this.parentElement.classList.add('is-loaded')" onerror="this.onerror=null; this.src=this.dataset.fallback;" data-fallback="${f.src}">
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;
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
  
  // Close on backdrop click (light-dismiss)
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.close();
  });
}

function openLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  
  // Show a loading state or reset
  lightboxImage.classList.remove('is-loaded');
  
  // Load the full size WebP
  lightboxImage.src = currentImages[currentImageIndex];
  
  // Animate in once loaded
  lightboxImage.onload = () => {
    lightboxImage.classList.add('is-loaded');
  };

  lightbox.showModal();
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
