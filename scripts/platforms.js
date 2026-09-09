import { esc } from './dom.js';

// Espejo de PLATFORMS en scripts/lib/gallery-meta.js. No se puede importar de
// allí: aquel es CommonJS, porque lo consumen build.js y admin-server.js, y
// este es un módulo ES que carga el navegador sin bundler. Si se añade una
// consola en gallery-meta.js, hay que añadirla también aquí.
//
// El orden de este array es el orden en que se dibujan los chips de la home,
// no el del fichero CommonJS, que va alfabético.
export const PLATFORM_ORDER = ['ps5', 'ps4', 'switch-2', 'switch'];

export const PLATFORM_LABELS = {
  ps5: 'PS5',
  ps4: 'PS4',
  'switch-2': 'Switch 2',
  switch: 'Switch'
};

// galleries.json es entrada no confiable: puede venir de POST /api/save, que
// valida la forma pero cuyo fichero también se edita a mano. Como platform
// acaba en un atributo data- y en selectores CSS, se comprueba contra la lista
// permitida en vez de confiar en el valor. Lo que no se reconoce se trata como
// "sin consola", que degrada bien: la tarjeta simplemente no lleva insignia.
export function platformOf(gallery) {
  const value = gallery && gallery.platform;
  return PLATFORM_ORDER.includes(value) ? value : null;
}

export function platformBadge(gallery) {
  const platform = platformOf(gallery);
  if (!platform) return '';
  return `<span class="platform-badge" data-platform="${esc(platform)}">${esc(PLATFORM_LABELS[platform])}</span>`;
}
