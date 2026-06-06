import { initTheme } from './theme.js';
import { initScrollAnimations, initHeaderScroll } from './ui.js';
import { initHomePage, initSectionKeyNav } from './home.js';
import { initGalleryPage } from './gallery.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initScrollAnimations();
  initHeaderScroll();
  
  const isGalleryPage = window.location.pathname.includes('gallery.html');
  
  if (isGalleryPage) {
    initGalleryPage();
  } else {
    initHomePage();
    initSectionKeyNav();
  }
});
