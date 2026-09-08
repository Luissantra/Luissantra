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

module.exports = { VARIANT_WIDTHS, variantName, isVariant };
