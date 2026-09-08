// Los anchos deben coincidir con VARIANT_WIDTHS de scripts/lib/variants.js.
// Se duplican porque aquel módulo es CommonJS y este lo carga el navegador
// como módulo ES.
const VARIANT_WIDTHS = [640, 1280];

export async function loadImageSizes() {
  try {
    const res = await fetch('data/image-sizes.json');
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    console.warn('No se pudo cargar el mapa de dimensiones', err);
    return {};
  }
}

function variantSrc(relSrc, width) {
  const dot = relSrc.lastIndexOf('.');
  return `images/${relSrc.slice(0, dot)}-${width}w${relSrc.slice(dot)}`;
}

// Escapa comillas dobles para prevenir inyección XSS en atributos HTML.
// Necesario porque las rutas en data/galleries.json y data/favourites.json
// se escriben sin validar desde POST /api/save.
function escapeAttrValue(str) {
  return str.replace(/"/g, '&quot;');
}

// relSrc es una ruta relativa a images/, del tipo "japan/japan-13.webp".
export function imageAttrs(relSrc, sizesMap, sizesAttr) {
  const src = `images/${escapeAttrValue(relSrc)}`;
  const dim = sizesMap && sizesMap[relSrc];
  if (!dim) return `src="${src}"`;

  const candidates = VARIANT_WIDTHS
    .filter(w => w < dim.w)
    .map(w => `${escapeAttrValue(variantSrc(relSrc, w))} ${w}w`);
  candidates.push(`${src} ${dim.w}w`);

  return `src="${src}" srcset="${candidates.join(', ')}" sizes="${sizesAttr}" width="${dim.w}" height="${dim.h}"`;
}
