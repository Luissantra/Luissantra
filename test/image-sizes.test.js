const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mergeSizes, SIZES_FILE } = require('../scripts/lib/image-sizes');

test('SIZES_FILE es el nombre esperado', () => {
  assert.equal(SIZES_FILE, 'image-sizes.json');
});

test('mergeSizes añade las entradas descubiertas', () => {
  const result = mergeSizes({}, { 'japan/japan-13.webp': { w: 1920, h: 1280 } });
  assert.deepEqual(result, { 'japan/japan-13.webp': { w: 1920, h: 1280 } });
});

test('mergeSizes descarta las huérfanas que ya no existen', () => {
  const previous = {
    'japan/japan-13.webp': { w: 1920, h: 1280 },
    'japan/borrada.webp': { w: 800, h: 600 }
  };
  const result = mergeSizes(previous, { 'japan/japan-13.webp': { w: 1920, h: 1280 } });
  assert.deepEqual(Object.keys(result), ['japan/japan-13.webp']);
});

test('mergeSizes prioriza el valor recién descubierto', () => {
  const previous = { 'japan/japan-13.webp': { w: 100, h: 100 } };
  const result = mergeSizes(previous, { 'japan/japan-13.webp': { w: 1920, h: 1280 } });
  assert.deepEqual(result['japan/japan-13.webp'], { w: 1920, h: 1280 });
});

test('mergeSizes tolera un mapa previo ausente o corrupto', () => {
  const discovered = { 'italy/italy-06.webp': { w: 1920, h: 1080 } };
  assert.deepEqual(mergeSizes(null, discovered), discovered);
  assert.deepEqual(mergeSizes('no soy un objeto', discovered), discovered);
});

test('mergeSizes ordena las claves para que el diff sea estable', () => {
  const result = mergeSizes({}, {
    'italy/italy-06.webp': { w: 1, h: 1 },
    'japan/japan-13.webp': { w: 1, h: 1 },
    'italy/italy-01.webp': { w: 1, h: 1 }
  });
  assert.deepEqual(Object.keys(result), [
    'italy/italy-01.webp',
    'italy/italy-06.webp',
    'japan/japan-13.webp'
  ]);
});

test('mergeSizes no resucita el valor previo cuando el descubierto es invalido', () => {
  const previous = { 'japan/japan-13.webp': { w: 1920, h: 1280 } };
  for (const invalid of [null, undefined, 0, false, '']) {
    const result = mergeSizes(previous, { 'japan/japan-13.webp': invalid });
    assert.deepEqual(
      result,
      {},
      `no debe resucitar el valor previo con valor invalido: ${String(invalid)}`
    );
  }
});
