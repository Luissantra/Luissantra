'use strict';

const path = require('path');

// El fichero sin sufijo sigue siendo el de 1920px: así galleries.json y
// favourites.json no necesitan migración.
const VARIANT_WIDTHS = [640, 1280];

function variantName(file, width) {
  const ext = path.extname(file);
  return `${path.basename(file, ext)}-${width}w${ext}`;
}

const VARIANT_RE = new RegExp(`-(${VARIANT_WIDTHS.join('|')})w\\.[A-Za-z0-9]+$`);

function isVariant(file) {
  return VARIANT_RE.test(file);
}

// El nombre de fichero al que colapsará esta fuente tras la conversión: los
// .webp pasan tal cual, los .jpg/.jpeg/.png se convierten a "<base>.webp".
function webpTargetName(file) {
  const ext = path.extname(file);
  return ext.toLowerCase() === '.webp' ? file : `${path.basename(file, ext)}.webp`;
}

// Dos ficheros de origen con el mismo nombre base pero distinta extensión
// (p.ej. "sunset.jpg" y "sunset.png") colapsan en el mismo "<base>.webp" al
// convertir. Procesar ambos sobrescribiría uno con el otro y añadiría el
// mismo nombre dos veces a la galería. `files` debe venir ya ordenado: se
// conserva la primera fuente de cada grupo y se informa del resto.
function dedupeConversionSources(files) {
  const seen = new Map();
  const kept = [];
  const skipped = [];
  for (const file of files) {
    const target = webpTargetName(file);
    if (seen.has(target)) {
      skipped.push({ file, keptAs: seen.get(target), target });
      continue;
    }
    seen.set(target, file);
    kept.push(file);
  }
  return { kept, skipped };
}

module.exports = { VARIANT_WIDTHS, variantName, isVariant, webpTargetName, dedupeConversionSources };
