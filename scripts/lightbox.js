let currentImages = [];
let currentImageIndex = 0;

export function setupLightbox(images) {
  currentImages = images;
}

export function updateCurrentImageIndex(index) {
  currentImageIndex = index;
}

export function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  if (!lightbox || !lightboxImage) return;

  document.querySelectorAll('.photo-item').forEach(item => {
    item.addEventListener('click', () => {
      currentImageIndex = parseInt(item.getAttribute('data-index'));
      openLightbox();
    });
  });

  document.getElementById('lightbox-close').addEventListener('click', () => lightbox.close());
  document.getElementById('lightbox-prev').addEventListener('click', showPrevImage);
  document.getElementById('lightbox-next').addEventListener('click', showNextImage);

  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showPrevImage();
    if (e.key === 'ArrowRight') showNextImage();
  });
  
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

export function openLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  if (!lightbox || !lightboxImage) return;

  const newSrc = currentImages[currentImageIndex];

  const activeItem = document.querySelector(`.photo-item[data-index="${currentImageIndex}"]`);
  const activeImg = activeItem ? activeItem.querySelector('img') : null;
  const newAlt = activeImg ? (activeImg.alt || 'Full screen gallery view') : 'Full screen gallery view';

  if (!lightbox.open) {
    lightboxImage.classList.remove('is-loaded');
    lightboxImage.src = newSrc;
    lightboxImage.alt = newAlt;
    lightboxImage.onload = () => lightboxImage.classList.add('is-loaded');
    lightboxImage.onerror = () => lightboxImage.classList.add('is-loaded');
    lightbox.showModal();
    const lightboxContent = lightbox.querySelector('.lightbox-content');
    if (lightboxContent) lightboxContent.focus();
  } else {
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
    currentImageIndex = currentImages.length - 1;
    openLightbox();
  }
}

function showNextImage() {
  if (currentImageIndex < currentImages.length - 1) {
    currentImageIndex++;
    openLightbox();
  } else {
    currentImageIndex = 0;
    openLightbox();
  }
}
