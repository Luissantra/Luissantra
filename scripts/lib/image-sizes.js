'use strict';

const SIZES_FILE = 'image-sizes.json';

// El mapa vive en un fichero aparte de galleries.json porque el CMS reescribe
// gallery.images entero al reordenar y perdería cualquier dato adjunto.
function mergeSizes(previous, discovered) {
  const base = (previous && typeof previous === 'object' && !Array.isArray(previous))
    ? previous
    : {};

  const merged = {};
  for (const key of Object.keys(discovered).sort()) {
    merged[key] = discovered[key] || base[key];
  }
  return merged;
}

module.exports = { mergeSizes, SIZES_FILE };
