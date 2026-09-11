const { test } = require('node:test');
const assert = require('node:assert/strict');
const { VARIANT_WIDTHS, variantName, isVariant, webpTargetName, dedupeConversionSources } = require('../scripts/lib/variants');

test('los anchos de variante son 640 y 1280', () => {
  assert.deepEqual(VARIANT_WIDTHS, [640, 1280]);
});

test('variantName inserta el sufijo antes de la extensión', () => {
  assert.equal(variantName('japan-13.webp', 640), 'japan-13-640w.webp');
  assert.equal(variantName('spider-man-miles-morales-29.webp', 1280), 'spider-man-miles-morales-29-1280w.webp');
});

test('isVariant reconoce los ficheros generados', () => {
  assert.equal(isVariant('japan-13-640w.webp'), true);
  assert.equal(isVariant('japan-13-1280w.webp'), true);
});

test('isVariant no confunde los ficheros base', () => {
  assert.equal(isVariant('japan-13.webp'), false);
  assert.equal(isVariant('japan-caratula.webp'), false);
  assert.equal(isVariant('foto-2024w-final.webp'), false);
});

test('isVariant ignora anchos que no están en la lista', () => {
  assert.equal(isVariant('japan-13-999w.webp'), false);
});

test('webpTargetName deja los .webp tal cual', () => {
  assert.equal(webpTargetName('japan-13.webp'), 'japan-13.webp');
});

test('webpTargetName convierte jpg/png a .webp', () => {
  assert.equal(webpTargetName('sunset.jpg'), 'sunset.webp');
  assert.equal(webpTargetName('sunset.JPEG'), 'sunset.webp');
  assert.equal(webpTargetName('sunset.png'), 'sunset.webp');
});

test('dedupeConversionSources conserva ficheros con nombres distintos', () => {
  const { kept, skipped } = dedupeConversionSources(['japan-13.jpg', 'japan-14.png']);
  assert.deepEqual(kept, ['japan-13.jpg', 'japan-14.png']);
  assert.deepEqual(skipped, []);
});

test('dedupeConversionSources detecta fuentes que colapsan en el mismo .webp', () => {
  const { kept, skipped } = dedupeConversionSources(['sunset.jpg', 'sunset.png']);
  assert.deepEqual(kept, ['sunset.jpg']);
  assert.deepEqual(skipped, [{ file: 'sunset.png', keptAs: 'sunset.jpg', target: 'sunset.webp' }]);
});

test('dedupeConversionSources conserva la primera fuente según el orden recibido', () => {
  const { kept, skipped } = dedupeConversionSources(['sunset.png', 'sunset.jpg', 'sunset.webp']);
  assert.deepEqual(kept, ['sunset.png']);
  assert.deepEqual(skipped, [
    { file: 'sunset.jpg', keptAs: 'sunset.png', target: 'sunset.webp' },
    { file: 'sunset.webp', keptAs: 'sunset.png', target: 'sunset.webp' },
  ]);
});
