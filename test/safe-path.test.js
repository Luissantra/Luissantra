const { test } = require('node:test');
const assert = require('node:assert/strict');
const { safeSegment, safeFilename } = require('../scripts/lib/safe-path');

test('safeSegment acepta identificadores de galería válidos', () => {
  assert.equal(safeSegment('japan'), 'japan');
  assert.equal(safeSegment('red-dead-redemption-2'), 'red-dead-redemption-2');
});

test('safeSegment rechaza el recorrido de directorios', () => {
  assert.throws(() => safeSegment('../data'), /no válido/);
  assert.throws(() => safeSegment('a/b'), /no válido/);
  assert.throws(() => safeSegment('..'), /no válido/);
  assert.throws(() => safeSegment('.'), /no válido/);
});

test('safeSegment rechaza vacíos, mayúsculas y caracteres raros', () => {
  assert.throws(() => safeSegment(''), /no válido/);
  assert.throws(() => safeSegment(undefined), /no válido/);
  assert.throws(() => safeSegment('Japan'), /no válido/);
  assert.throws(() => safeSegment('japan\0'), /no válido/);
  assert.throws(() => safeSegment('japan photo'), /no válido/);
});

test('safeFilename acepta nombres de imagen reales', () => {
  assert.equal(safeFilename('japan-13.webp'), 'japan-13.webp');
  assert.equal(safeFilename('japan-13-640w.webp'), 'japan-13-640w.webp');
  assert.equal(safeFilename('IMG_2024.JPG'), 'IMG_2024.JPG');
});

test('safeFilename rechaza rutas y extensiones ausentes', () => {
  assert.throws(() => safeFilename('../../etc/passwd'), /no válido/);
  assert.throws(() => safeFilename('a/b.webp'), /no válido/);
  assert.throws(() => safeFilename('sin-extension'), /no válido/);
  assert.throws(() => safeFilename('doble.tar.gz'), /no válido/);
  assert.throws(() => safeFilename('.oculto'), /no válido/);
});
