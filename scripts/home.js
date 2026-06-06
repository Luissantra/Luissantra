import { setIsNavigating } from './ui.js';

let carouselIntervalId = null;

export async function initHomePage() {
  const container = document.getElementById('galleries-container');
  if (!container) return;

  try {
    const res = await fetch('data/galleries.json');
    if (!res.ok) throw new Error('Failed to load galleries');
    const galleries = await res.json();
    
    const photography = galleries.filter(g => g.category === 'photography');
    const inGame = galleries.filter(g => g.category === 'in-game');

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
    
    if (window.location.hash) {
      setTimeout(() => {
        const target = document.querySelector(window.location.hash);
        if (target) {
          setIsNavigating(true);
          const header = document.querySelector('.site-header');
          if (header) {
            header.classList.remove('is-hidden');
          }
          target.scrollIntoView({ behavior: 'smooth' });
          
          setTimeout(() => {
            setIsNavigating(false);
          }, 1500);
        } else {
          setIsNavigating(false);
        }
      }, 100);
    }
    
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Error loading galleries. Please try again later.</p>';
  }
}

function renderGalleryCard(gallery, index) {
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

export function initSectionKeyNav() {
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select') || document.querySelector('#lightbox[open]')) return;
    if (e.key !== 'j' && e.key !== 'k') return;

    const anchors = Array.from(document.querySelectorAll('.scroll-anchor'));
    if (anchors.length === 0) return;

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
