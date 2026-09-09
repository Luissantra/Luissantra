'use strict';

const { safeSegment } = require('./safe-path');

const META_FILE = 'gallery-meta.json';

// Consolas admitidas. "switch" se mantiene aunque hoy ninguna galería lo use:
// los chips de la home solo dibujan las consolas con galerías reales, así que
// tenerlo aquí no cuesta nada y evita una migración si algún día aparece.
const PLATFORMS = ['ps4', 'ps5', 'switch', 'switch-2'];

const CATEGORIES = ['photography', 'in-game'];

// Una carpeta de images/ sin entrada en el meta no debe romper el build. Cae
// a in-game, que es la categoría mayoritaria y la que ya asumía getCategory.
const DEFAULT_CATEGORY = 'in-game';

const DESCRIPTIONS = {
  photography: 'Photography - Real World',
  'in-game': 'In-Game Photography'
};

// favourites es una galería sintética que build.js antepone, no una carpeta de
// images/. Registrarla aquí no tendría efecto y confundiría, así que se
// rechaza en vez de ignorarse en silencio.
const RESERVED_IDS = ['favourites'];

// Valida el meta entero antes de que nadie escriba nada. Lanza en el primer
// problema con un mensaje que dice exactamente qué entrada falló, igual que
// hacen validateGalleries y validateFavourites en admin-server.js.
function validateMeta(meta) {
  if (!Array.isArray(meta)) {
    throw new Error('gallery-meta debe ser un array');
  }
  const seen = new Set();
  meta.forEach((entry, i) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`gallery-meta[${i}] debe ser un objeto`);
    }
    let id;
    try {
      id = safeSegment(entry.id);
    } catch (e) {
      throw new Error(`gallery-meta[${i}].id: ${e.message}`);
    }
    if (RESERVED_IDS.includes(id)) {
      throw new Error(`gallery-meta[${i}].id: "${id}" es un id reservado`);
    }
    if (seen.has(id)) {
      throw new Error(`gallery-meta[${i}].id: "${id}" está duplicado`);
    }
    seen.add(id);
    if (!CATEGORIES.includes(entry.category)) {
      throw new Error(
        `gallery-meta[${i}].category debe ser una de: ${CATEGORIES.join(', ')}`
      );
    }
    if ('platform' in entry && entry.platform !== null && !PLATFORMS.includes(entry.platform)) {
      throw new Error(
        `gallery-meta[${i}].platform debe ser una de: ${PLATFORMS.join(', ')}`
      );
    }
    if ('description' in entry && typeof entry.description !== 'string') {
      throw new Error(`gallery-meta[${i}].description debe ser una cadena`);
    }
  });
  return meta;
}

// Índice por id que guarda además la posición en el array, que es lo que
// define el orden de presentación en la home.
function indexMeta(meta) {
  const byId = new Map();
  meta.forEach((entry, i) => {
    byId.set(entry.id, Object.assign({}, entry, { order: i }));
  });
  return byId;
}

function resolveMeta(byId, folderName) {
  const entry = byId.get(folderName);
  const category = entry ? entry.category : DEFAULT_CATEGORY;
  const platform = entry && entry.platform ? entry.platform : null;
  const description = entry && typeof entry.description === 'string'
    ? entry.description
    : DESCRIPTIONS[category];
  const order = entry ? entry.order : Infinity;
  return { category, platform, description, order };
}

// Ordena por la posición en el meta. Las no registradas quedan al final y
// entre ellas por orden alfabético de id, para que el resultado sea estable y
// el diff de galleries.json no baile entre builds.
// Nota sobre el comparador: si ambas son Infinity, `oa !== ob` es false
// (Infinity !== Infinity), así que se cae al localeCompare y nunca se calcula
// Infinity - Infinity, que sería NaN.
function sortGalleries(galleries, byId) {
  return galleries.slice().sort((a, b) => {
    const oa = byId.has(a.id) ? byId.get(a.id).order : Infinity;
    const ob = byId.has(b.id) ? byId.get(b.id).order : Infinity;
    if (oa !== ob) return oa - ob;
    return a.id.localeCompare(b.id);
  });
}

module.exports = {
  META_FILE,
  PLATFORMS,
  CATEGORIES,
  validateMeta,
  indexMeta,
  resolveMeta,
  sortGalleries
};
