import { setIsNavigating } from './ui.js';
import { loadImageSizes, imageAttrs } from './images.js';
import { esc } from './dom.js';
import { PLATFORM_ORDER, PLATFORM_LABELS, platformOf, platformBadge } from './platforms.js';

let carouselIntervalId = null;

const PAGE_SIZE = 10;

// Estado de la sección In-Game. Vive a nivel de módulo porque la sección se
// repinta sola al filtrar o al cargar más, sin volver a montar la home entera.
let inGameGalleries = [];
let inGameSizesMap = null;
let activePlatform = null; // null significa "All"
let shownCount = PAGE_SIZE;

export async function initHomePage() {
  const container = document.getElementById('galleries-container');
  if (!container) return;

  try {
    const [res, sizesMap] = await Promise.all([
      fetch('data/galleries.json'),
      loadImageSizes()
    ]);
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
            <div id="fav-wrapper" class="gallery-card__image-wrapper">
              <img class="gallery-card__image fav-carousel-img" src="${esc(favCover)}" alt="Favourites cover image" loading="lazy" width="1200" height="500" style="position: absolute; top: 0; left: 0; transition: opacity 0.5s ease, transform var(--transition-slow);">
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
            ${photography.map((g, i) => renderGalleryCard(g, i, sizesMap)).join('')}
          </div>
        </section>
      `;
    }

    if (inGame.length > 0) {
      inGameGalleries = inGame;
      inGameSizesMap = sizesMap;
      readUrlState();
      html += `
        <section class="category-section" id="in-game-section">
          <div id="section-in-game" class="scroll-anchor"></div>
          <h2 class="section-title gaming fade-in-up">In-Game Photography</h2>
          <div id="platform-chips" class="platform-chips" role="group" aria-label="Filter galleries by console"></div>
          <div id="in-game-status" class="visually-hidden" aria-live="polite"></div>
          <div class="gallery-grid" id="in-game-grid"></div>
          <div id="load-more-wrapper" class="load-more-wrapper"></div>
        </section>
      `;
    }

    container.innerHTML = html;

    if (inGameGalleries.length > 0) {
      renderInGameSection();
      initInGameControls();
    }

    if (carouselIntervalId) {
      clearInterval(carouselIntervalId);
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (favImages.length > 1 && !prefersReducedMotion) {
      carouselIntervalId = setInterval(() => {
        const wrapper = document.getElementById('fav-wrapper');
        if (wrapper) {
          let randomIndex;
          do {
            randomIndex = Math.floor(Math.random() * favImages.length);
          } while (randomIndex === lastFavIndex);
          lastFavIndex = randomIndex;

          const randomImg = favImages[randomIndex];
          const imgSrc = typeof randomImg === 'string' ? randomImg : randomImg.src;
          const newSrc = `images/${imgSrc}`;
          
          const newImg = document.createElement('img');
          newImg.className = 'gallery-card__image fav-carousel-img';
          newImg.src = newSrc;
          newImg.alt = 'Favourites cover image';
          newImg.loading = 'lazy';
          newImg.width = 1200;
          newImg.height = 500;
          newImg.style.cssText = 'position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.5s ease, transform var(--transition-slow); z-index: 2;';
          
          const oldImages = wrapper.querySelectorAll('.fav-carousel-img');
          oldImages.forEach(img => img.style.zIndex = '1');
          
          const handleLoad = () => {
            newImg.removeEventListener('load', handleLoad);
            newImg.removeEventListener('error', handleError);
            
            // Trigger reflow to ensure transition runs
            void newImg.offsetWidth;
            newImg.style.opacity = '1';
            
            newImg.addEventListener('transitionend', function handleTransition(e) {
              if (e.propertyName === 'opacity') {
                newImg.removeEventListener('transitionend', handleTransition);
                oldImages.forEach(img => {
                  if (img !== newImg) img.remove();
                });
                newImg.style.zIndex = '1';
              }
            });
          };
          
          const handleError = () => {
            newImg.removeEventListener('load', handleLoad);
            newImg.removeEventListener('error', handleError);
            newImg.remove();
          };
          
          newImg.addEventListener('load', handleLoad);
          newImg.addEventListener('error', handleError);
          wrapper.appendChild(newImg);
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

function renderGalleryCard(gallery, index, sizesMap) {
  const layout = index % 2 === 0 ? 'horizontal-left' : 'horizontal-right';
  const rel = gallery.coverImage.replace(/^images\//, '');
  const attrs = imageAttrs(rel, sizesMap, '(max-width: 768px) 100vw, 50vw');
  // Se topa el retardo: con 22 tarjetas, index * 100ms daría 2,2 s de cascada
  // y al cambiar de filtro la sección se sentiría lenta.
  const delay = Math.min(index, 6) * 100;

  return `
    <a href="gallery.html?id=${esc(gallery.id)}" class="gallery-card fade-in-up" data-layout="${layout}" style="animation-delay: ${delay}ms">
      <div class="gallery-card__image-wrapper">
        <img class="gallery-card__image" ${attrs} alt="${esc(gallery.title)} cover image" loading="lazy">
      </div>
      <div class="gallery-card__info">
        <h3 class="gallery-card__title">${esc(gallery.title)}</h3>
        <p class="gallery-card__desc">${esc(gallery.description)}</p>
        ${platformBadge(gallery)}
      </div>
    </a>
  `;
}

// Los chips solo se dibujan para consolas con al menos una galería: un chip
// "Switch (0)" sería ruido, y hoy no hay ninguna galería de Switch 1.
function renderChips() {
  const counts = new Map();
  inGameGalleries.forEach(g => {
    const p = platformOf(g);
    if (p) counts.set(p, (counts.get(p) || 0) + 1);
  });

  const chips = [{ value: '', label: 'All', count: inGameGalleries.length }];
  PLATFORM_ORDER.forEach(p => {
    if (counts.has(p)) {
      chips.push({ value: p, label: PLATFORM_LABELS[p], count: counts.get(p) });
    }
  });

  return chips.map(chip => `
    <button type="button" class="platform-chip" data-platform="${esc(chip.value)}" aria-pressed="${(chip.value || null) === activePlatform}">
      ${esc(chip.label)} <span class="platform-chip__count">${chip.count}</span>
    </button>
  `).join('');
}

function renderInGameSection() {
  const chips = document.getElementById('platform-chips');
  const grid = document.getElementById('in-game-grid');
  const status = document.getElementById('in-game-status');
  const moreWrapper = document.getElementById('load-more-wrapper');
  if (!chips || !grid || !status || !moreWrapper) return;

  const visible = activePlatform
    ? inGameGalleries.filter(g => platformOf(g) === activePlatform)
    : inGameGalleries;
  const page = visible.slice(0, shownCount);

  chips.innerHTML = renderChips();
  grid.innerHTML = page.length > 0
    ? page.map((g, i) => renderGalleryCard(g, i, inGameSizesMap)).join('')
    : '<p class="empty-state">No galleries for this console yet.</p>';

  const remaining = visible.length - page.length;
  moreWrapper.innerHTML = remaining > 0
    ? `<button type="button" class="load-more" id="load-more">Load more (${remaining})</button>`
    : '';
  status.textContent = `Showing ${page.length} of ${visible.length} galleries`;
}

// Delegación: la rejilla y los chips se reescriben en cada repintado, así que
// escuchar en la sección evita tener que reenganchar handlers cada vez.
function initInGameControls() {
  const section = document.getElementById('in-game-section');
  if (!section) return;

  section.addEventListener('click', (e) => {
    const chip = e.target.closest('.platform-chip');
    if (chip) {
      const value = chip.dataset.platform || null;
      if (value === activePlatform) return;
      activePlatform = value;
      shownCount = PAGE_SIZE;
      // pushState: el botón atrás debe recorrer los filtros.
      syncUrl(true);
      renderInGameSection();
      return;
    }

    const more = e.target.closest('#load-more');
    if (more) {
      const previousCount = shownCount;
      shownCount += PAGE_SIZE;
      // replaceState: el botón atrás NO debe replegar la lista, sería
      // desconcertante volver a ver 10 tras haber pedido 20.
      syncUrl(false);
      renderInGameSection();
      focusCardAt(previousCount);
    }
  });

  window.addEventListener('popstate', () => {
    readUrlState();
    renderInGameSection();
  });
}

// Tras "Load more", el foco salta a la primera tarjeta nueva para que quien
// navega por teclado no acabe al principio de la lista otra vez. Las tarjetas
// son enlaces, así que ya son focusables.
function focusCardAt(index) {
  const cards = document.querySelectorAll('#in-game-grid .gallery-card');
  if (cards[index]) cards[index].focus();
}

function syncUrl(push) {
  const params = new URLSearchParams(window.location.search);
  if (activePlatform) params.set('platform', activePlatform);
  else params.delete('platform');
  if (shownCount > PAGE_SIZE) params.set('shown', String(shownCount));
  else params.delete('shown');

  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  const state = { platform: activePlatform, shown: shownCount };
  if (push) history.pushState(state, '', url);
  else history.replaceState(state, '', url);
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const platform = params.get('platform');
  // Un valor desconocido cae a "All" en vez de dejar la rejilla vacía.
  activePlatform = PLATFORM_ORDER.includes(platform) ? platform : null;
  const shown = parseInt(params.get('shown'), 10);
  shownCount = Number.isFinite(shown) && shown >= PAGE_SIZE ? shown : PAGE_SIZE;
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
