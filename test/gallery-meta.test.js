const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  META_FILE,
  PLATFORMS,
  validateMeta,
  indexMeta,
  resolveMeta,
  sortGalleries
} = require('../scripts/lib/gallery-meta');

test('META_FILE es el nombre esperado', () => {
  assert.equal(META_FILE, 'gallery-meta.json');
});

test('PLATFORMS contiene exactamente las cuatro consolas admitidas', () => {
  assert.deepEqual(PLATFORMS, ['ps4', 'ps5', 'switch', 'switch-2']);
});

test('validateMeta acepta un meta bien formado', () => {
  const meta = [
    { id: 'japan', category: 'photography' },
    { id: 'astro-bot', category: 'in-game', platform: 'ps5' }
  ];
  assert.equal(validateMeta(meta), meta);
});

test('validateMeta rechaza lo que no es un array', () => {
  assert.throws(() => validateMeta({}), /debe ser un array/);
  assert.throws(() => validateMeta(null), /debe ser un array/);
});

test('validateMeta rechaza una entrada que no es objeto', () => {
  assert.throws(() => validateMeta(['japan']), /\[0\] debe ser un objeto/);
});

test('validateMeta rechaza un id no válido', () => {
  assert.throws(
    () => validateMeta([{ id: '../etc', category: 'in-game' }]),
    /\[0\]\.id/
  );
});

test('validateMeta rechaza el id reservado favourites', () => {
  assert.throws(
    () => validateMeta([{ id: 'favourites', category: 'in-game' }]),
    /id reservado/
  );
});

test('validateMeta rechaza ids duplicados', () => {
  assert.throws(
    () => validateMeta([
      { id: 'japan', category: 'photography' },
      { id: 'japan', category: 'photography' }
    ]),
    /duplicado/
  );
});

test('validateMeta rechaza una categoría desconocida', () => {
  assert.throws(
    () => validateMeta([{ id: 'japan', category: 'paisaje' }]),
    /\[0\]\.category/
  );
});

test('validateMeta rechaza una consola fuera del conjunto permitido', () => {
  assert.throws(
    () => validateMeta([{ id: 'halo', category: 'in-game', platform: 'xbox' }]),
    /\[0\]\.platform/
  );
});

test('validateMeta acepta una entrada sin consola', () => {
  const meta = [{ id: 'japan', category: 'photography' }];
  assert.equal(validateMeta(meta), meta);
});

test('validateMeta rechaza una description que no es cadena', () => {
  assert.throws(
    () => validateMeta([{ id: 'japan', category: 'photography', description: 42 }]),
    /\[0\]\.description/
  );
});

test('resolveMeta devuelve los valores de una galería registrada', () => {
  const byId = indexMeta([{ id: 'astro-bot', category: 'in-game', platform: 'ps5' }]);
  assert.deepEqual(resolveMeta(byId, 'astro-bot'), {
    category: 'in-game',
    platform: 'ps5',
    description: 'In-Game Photography',
    order: 0
  });
});

test('resolveMeta usa la descripción de photography cuando toca', () => {
  const byId = indexMeta([{ id: 'japan', category: 'photography' }]);
  assert.equal(resolveMeta(byId, 'japan').description, 'Photography - Real World');
});

test('resolveMeta respeta un override de description', () => {
  const byId = indexMeta([
    { id: 'japan', category: 'photography', description: 'Tokyo, spring 2024' }
  ]);
  assert.equal(resolveMeta(byId, 'japan').description, 'Tokyo, spring 2024');
});

test('resolveMeta da valores por defecto a una carpeta no registrada', () => {
  const byId = indexMeta([{ id: 'japan', category: 'photography' }]);
  assert.deepEqual(resolveMeta(byId, 'carpeta-nueva'), {
    category: 'in-game',
    platform: null,
    description: 'In-Game Photography',
    order: Infinity
  });
});

test('sortGalleries ordena según la posición en el meta', () => {
  const byId = indexMeta([
    { id: 'zelda-totk', category: 'in-game' },
    { id: 'astro-bot', category: 'in-game' },
    { id: 'japan', category: 'photography' }
  ]);
  const galleries = [{ id: 'japan' }, { id: 'astro-bot' }, { id: 'zelda-totk' }];
  assert.deepEqual(
    sortGalleries(galleries, byId).map(g => g.id),
    ['zelda-totk', 'astro-bot', 'japan']
  );
});

test('sortGalleries manda al final las no registradas, en orden alfabético', () => {
  const byId = indexMeta([{ id: 'astro-bot', category: 'in-game' }]);
  const galleries = [{ id: 'zzz' }, { id: 'aaa' }, { id: 'astro-bot' }];
  assert.deepEqual(
    sortGalleries(galleries, byId).map(g => g.id),
    ['astro-bot', 'aaa', 'zzz']
  );
});

test('sortGalleries no muta el array recibido', () => {
  const byId = indexMeta([{ id: 'b', category: 'in-game' }, { id: 'a', category: 'in-game' }]);
  const galleries = [{ id: 'a' }, { id: 'b' }];
  sortGalleries(galleries, byId);
  assert.deepEqual(galleries.map(g => g.id), ['a', 'b']);
});
