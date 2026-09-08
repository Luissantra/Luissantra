const { test } = require('node:test');
const assert = require('node:assert/strict');
const { VARIANT_WIDTHS, variantName, isVariant } = require('../scripts/lib/variants');

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
