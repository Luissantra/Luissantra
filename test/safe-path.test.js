const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  safeSegment,
  safeFilename,
  safeRelativeImagePath,
  normalizeUploadFilename,
  dedupeFilename
} = require('../scripts/lib/safe-path');

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

test('safeRelativeImagePath acepta rutas galeria/fichero válidas', () => {
  assert.equal(safeRelativeImagePath('japan/japan-13.webp'), 'japan/japan-13.webp');
  assert.equal(
    safeRelativeImagePath('spider-man-miles-morales/spider-man-miles-morales-29.webp'),
    'spider-man-miles-morales/spider-man-miles-morales-29.webp'
  );
});

test('safeRelativeImagePath rechaza cuando cualquiera de las dos mitades es inválida', () => {
  // segmento inválido (mayúsculas)
  assert.throws(() => safeRelativeImagePath('Japan/japan-13.webp'), /no válido/);
  // fichero inválido (sin extensión)
  assert.throws(() => safeRelativeImagePath('japan/sin-extension'), /no válido/);
  // recorrido de directorios disfrazado de "galeria/fichero"
  assert.throws(() => safeRelativeImagePath('../data/japan-13.webp'), /no válida/);
  // ni un solo "/", o más de uno
  assert.throws(() => safeRelativeImagePath('japan-13.webp'), /no válida/);
  assert.throws(() => safeRelativeImagePath('a/b/c.webp'), /no válida/);
  // tipos que no son cadena
  assert.throws(() => safeRelativeImagePath(undefined), /no válida/);
  assert.throws(() => safeRelativeImagePath({ src: 'japan/japan-13.webp' }), /no válida/);
});

test('normalizeUploadFilename transcribe capturas reales de PlayStation', () => {
  const cases = [
    ['Ghost of Tsushima_20240115181523.jpg', 'ghost-of-tsushima-20240115181523.jpg'],
    ['God of War Ragnarök_2024.jpg', 'god-of-war-ragnarok-2024.jpg'],
    ['Horizon Forbidden West™_20240115.jpg', 'horizon-forbidden-west-20240115.jpg'],
    ["Marvel's Spider-Man 2_2024.png", 'marvel-s-spider-man-2-2024.png'],
    ['Screenshot 2024-01-15 at 18.15.23.png', 'screenshot-2024-01-15-at-18-15-23.png'],
    ['photo (1).jpg', 'photo-1.jpg']
  ];
  for (const [input, expected] of cases) {
    assert.equal(normalizeUploadFilename(input), expected);
  }
});

test('normalizeUploadFilename siempre produce algo que pasa safeFilename, incluso en casos degenerados', () => {
  const degenerate = [
    '@@@.jpg',
    '....',
    '.oculto',
    '.jpg',
    '',
    '😀😀😀.png',
    '   .png',
    'a.b.c.tar.gz',
    '/etc/passwd',
    '../../secret.jpg',
    'CON.jpg', // reservado en Windows, pero irrelevante aquí: solo importa que pase safeFilename
    'a'.repeat(5000) + '.jpg'
  ];
  for (const input of degenerate) {
    const normalized = normalizeUploadFilename(input);
    assert.doesNotThrow(() => safeFilename(normalized), `normalizeUploadFilename(${JSON.stringify(input)}) produjo ${JSON.stringify(normalized)}, que no pasa safeFilename`);
  }
});

test('normalizeUploadFilename conserva la extensión en minúsculas y colapsa símbolos en un guion', () => {
  assert.equal(normalizeUploadFilename('IMG_2024.JPG'), 'img-2024.jpg');
  assert.equal(normalizeUploadFilename('foto!!!bar.png'), 'foto-bar.png');
});

test('dedupeFilename deja pasar el primer nombre y numera las colisiones siguientes', () => {
  const taken = new Set();
  assert.equal(dedupeFilename('photo-1.jpg', taken), 'photo-1.jpg');
  assert.equal(dedupeFilename('photo-1.jpg', taken), 'photo-1-2.jpg');
  assert.equal(dedupeFilename('photo-1.jpg', taken), 'photo-1-3.jpg');
});

test('dedupeFilename respeta los nombres ya ocupados en disco', () => {
  const taken = new Set(['foto.jpg', 'foto-2.jpg']);
  assert.equal(dedupeFilename('foto.jpg', taken), 'foto-3.jpg');
});
