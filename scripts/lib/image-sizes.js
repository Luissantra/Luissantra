'use strict';

const SIZES_FILE = 'image-sizes.json';

// El mapa vive en un fichero aparte de galleries.json porque el CMS reescribe
// gallery.images entero al reordenar y perdería cualquier dato adjunto.
//
// El valor descubierto en esta pasada manda siempre. Si discovered[key] no es
// un valor valido (null, undefined, u otro falsy), la clave se descarta en vez
// de resucitar el valor del mapa previo: un dato invalido en esta pasada no
// debe hacer que sobreviva un dato obsoleto. `previous` no aporta valores al
// resultado; las claves huerfanas (presentes en previous pero ausentes de
// discovered) ya quedan fuera por construccion, al iterar solo sobre las
// claves de discovered.
function mergeSizes(previous, discovered) {
  const merged = {};
  for (const key of Object.keys(discovered).sort()) {
    if (discovered[key]) {
      merged[key] = discovered[key];
    }
  }
  return merged;
}

module.exports = { mergeSizes, SIZES_FILE };
