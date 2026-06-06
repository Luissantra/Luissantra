export let isNavigating = typeof window !== 'undefined' && !!window.location.hash;

export function setIsNavigating(val) {
  isNavigating = val;
}

export function initScrollAnimations() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    document.documentElement.classList.add('scroll-animations-enabled');
  }
}

export function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let lastScrollY = window.scrollY;
  let ticking = false;
  let scrollTimeout = null;

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
