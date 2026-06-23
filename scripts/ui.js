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
          const menuToggle = document.getElementById('menu-toggle');
          const isMenuOpen = menuToggle && menuToggle.getAttribute('aria-expanded') === 'true';

          if (!isMenuOpen) {
            if (window.scrollY > 100 && window.scrollY > lastScrollY) {
              header.classList.add('is-hidden');
            } else {
              header.classList.remove('is-hidden');
            }
          }
        }
        lastScrollY = window.scrollY;
        ticking = false;
      });
      ticking = true;
    }
  });
}

export function initMobileMenu() {
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const links = document.querySelectorAll('.nav-link');
  
  if (!menuToggle || !navLinks) return;

  function toggleMenu() {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    navLinks.classList.toggle('is-open', !isOpen);
    document.body.classList.toggle('is-menu-open', !isOpen);
  }

  function closeMenu() {
    menuToggle.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('is-open');
    document.body.classList.remove('is-menu-open');
  }

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close menu when clicking a link
  links.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Close menu when pressing Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    const isClickInside = navLinks.contains(e.target) || menuToggle.contains(e.target);
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    if (!isClickInside && isOpen) {
      closeMenu();
    }
  });
}
