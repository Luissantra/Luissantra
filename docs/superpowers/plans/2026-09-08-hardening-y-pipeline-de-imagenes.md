# Hardening del CMS y pipeline de imágenes - Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar las vulnerabilidades de escritura de ficheros del CMS local y convertir el pipeline de imágenes en uno responsive con dimensiones conocidas en tiempo de build, antes de subir el próximo lote de fotos.

**Architecture:** Se extraen helpers puros a `scripts/lib/` (CommonJS) para poder testearlos con el runner nativo de Node, sin añadir dependencias.
`scripts/build.js` pasa a generar dos variantes reducidas por foto y a escribir un mapa de dimensiones en `data/image-sizes.json`, un fichero lateral que el CMS nunca reescribe.
El frontend consume ese mapa para emitir `srcset`/`sizes` y para conocer la relación de aspecto antes de que la imagen cargue, lo que elimina la dependencia del evento `load` en el cálculo del mosaico.

**Tech Stack:** Node 26 (runner `node --test` nativo), sharp 0.34, Express 5, multer 2, JavaScript vanilla con módulos ES en el navegador.

## Global Constraints

- Sin dependencias nuevas en `package.json`.
  Los tests usan `node:test` y `node:assert/strict`, incluidos en Node 26.
- `scripts/lib/*.js` y `test/*.test.js` son CommonJS (`require`), porque `package.json` declara `"type": "commonjs"`.
  Los módulos de `scripts/*.js` que carga el navegador siguen siendo ES modules y **no** se testean con Node: se verifican en navegador con los pasos indicados.
- Nunca usar el guion largo "—" en código, comentarios, mensajes de commit ni documentación. Usar "-".
- Los mensajes de commit van en español y no llevan coautor.
- No editar a mano `data/galleries.json`, `data/favourites.json` ni `data/image-sizes.json`: son salida de `scripts/build.js` o del CMS.
- Las variantes generadas **se versionan en git**, igual que las imágenes actuales, para que el despliegue sea un copiado estático sin paso de build.
- Anchos de variante: `640` y `1280`. El fichero base sin sufijo sigue siendo el de 1920px.
- Convención de nombre de variante: `<base>-<ancho>w.webp`, por ejemplo `japan-13-640w.webp`.

## Contexto medido

Medición real sobre `images/japan/japan-13.webp` (1920x1280, 309KB):

| ancho | peso |
|---|---|
| 1920 (actual) | 309KB |
| 1280 | 81KB |
| 640 | 18KB |

En escritorio a 1512px el mosaico pinta cada foto en un hueco de 326px y descarga los 309KB.

Medido en navegador real tras implementarlo: con una pantalla Retina (DPR 2) el navegador pide 756px de píxeles reales para ese hueco de 378px CSS, así que elige la variante de 1280px, no la de 640px.
La galería de Favourites pasa de ~17MB a ~4.5MB en la primera vista, un factor de 3.8.
En una pantalla sin Retina (DPR 1) sí elige la de 640px y el factor es de 17.
La estimación inicial de este plan asumía DPR 1 y se quedaba corta.

El repositorio tiene 275 webp y 54MB. Las variantes añaden unos 27MB.

## Fuera de alcance

- El despliegue en sí (elección de hosting, dominio, CI).
  Se aborda en un plan aparte, cuando las fotos nuevas estén subidas.
- Deduplicar `data/favourites.json` contra la galería `favourites` embebida en `data/galleries.json`.
  Es un riesgo real de desincronización, pero el refactor toca los seis endpoints mutadores del CMS y no bloquea ni la subida de fotos ni el despliegue.
- Aplanar la cadena de `@import` de `styles/main.css` en un solo fichero.
  Es una optimización de despliegue que conviene decidir junto con el hosting.

## Estructura de ficheros

**Nuevos:**

- `scripts/lib/safe-path.js` - validación de segmentos de ruta y nombres de fichero que llegan del cliente. Sin dependencias, sin I/O.
- `scripts/lib/variants.js` - nombres de variante, detección de variantes y la lista de anchos. Sin I/O.
- `scripts/lib/image-sizes.js` - construcción y fusión del mapa de dimensiones. Sin I/O.
- `scripts/images.js` - módulo ES del navegador: dado un `src` y el mapa de dimensiones, devuelve los atributos `srcset`, `sizes`, `width` y `height`.
- `scripts/dom.js` - módulo ES del navegador: `esc()` para escapar texto interpolado en plantillas.
- `test/safe-path.test.js`, `test/variants.test.js`, `test/image-sizes.test.js`.

**Modificados:**

- `admin-server.js` - sanea entradas, restringe el estático, borra variantes.
- `scripts/build.js` - genera variantes, escribe el mapa de dimensiones, ignora variantes al escanear.
- `scripts/gallery.js` - consume el mapa, emite `srcset`, calcula el mosaico sin esperar al `load`.
- `scripts/home.js` - consume el mapa y escapa el texto de las tarjetas.
- `index.html`, `gallery.html` - fuentes, favicon, metadatos Open Graph.
- `package.json` - script `test`.

---

### Task 1: Sanear las rutas que llegan del cliente al CMS

Los endpoints del CMS meten `galleryId` y `photo` del cuerpo de la petición directamente en `path.join`, y multer guarda con `file.originalname` sin filtrar.
Una cadena con `../` escribe, borra o sobrescribe fuera de `images/`.
El servidor no tiene autenticación ni protección CSRF, así que cualquier página abierta en el navegador puede lanzar esas peticiones a `localhost:3030`.

**Files:**
- Create: `scripts/lib/safe-path.js`
- Create: `test/safe-path.test.js`
- Modify: `admin-server.js:25` (estático), `admin-server.js:28-41` (multer), `admin-server.js:99-110` (gallery/new), `admin-server.js:112-160` (photo/delete), `admin-server.js:162-185` (toggle-favourite), `admin-server.js:215-238` (set-cover)
- Modify: `package.json` (script `test`)

**Interfaces:**
- Produces: `scripts/lib/safe-path.js` exporta `{ safeSegment, safeFilename }`.
  `safeSegment(value)` devuelve el string validado o lanza `Error` con mensaje en español.
  `safeFilename(value)` idem, permitiendo un único punto de extensión.
  Las tareas 3 y 6 usan `safeFilename`.

- [ ] **Step 1: Escribir el test que falla**

Crear `test/safe-path.test.js`:

```js
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
```

- [ ] **Step 2: Añadir el script de test y comprobar que falla**

En `package.json`, dentro de `"scripts"`, añadir:

```json
"test": "node --test test/"
```

Ejecutar:

```bash
npm test
```

Esperado: FAIL, `Cannot find module '../scripts/lib/safe-path'`.

- [ ] **Step 3: Implementar el sanitizador**

Crear `scripts/lib/safe-path.js`:

```js
'use strict';

// Un segmento de ruta seguro: minúsculas, dígitos y guiones. Nada más.
// Coincide con los nombres de carpeta que genera y espera el pipeline.
const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;

// Un nombre de fichero seguro: base alfanumérica con guiones o guiones bajos,
// exactamente un punto y una extensión alfanumérica.
const FILENAME = /^[A-Za-z0-9][A-Za-z0-9_-]*\.[A-Za-z0-9]+$/;

function safeSegment(value) {
  if (typeof value !== 'string' || !SEGMENT.test(value)) {
    throw new Error(`Identificador no válido: ${JSON.stringify(value)}`);
  }
  return value;
}

function safeFilename(value) {
  if (typeof value !== 'string' || !FILENAME.test(value)) {
    throw new Error(`Nombre de fichero no válido: ${JSON.stringify(value)}`);
  }
  return value;
}

module.exports = { safeSegment, safeFilename };
```

- [ ] **Step 4: Ejecutar los tests y verificar que pasan**

```bash
npm test
```

Esperado: PASS, 5 tests.

- [ ] **Step 5: Aplicar el sanitizador en el servidor del CMS**

En `admin-server.js`, tras las importaciones existentes:

```js
const { safeSegment, safeFilename } = require('./scripts/lib/safe-path');
```

Sustituir el `destination` y el `filename` de multer (líneas 28-41) por:

```js
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const galleryId = safeSegment(req.body.galleryId);
      if (galleryId === 'favourites') {
        throw new Error('No puedes subir fotos directamente a favoritos. Súbelas a una galería específica primero.');
      }
      const dir = path.join(__dirname, 'images', galleryId);
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (e) {
      cb(e);
    }
  },
  filename: function (req, file, cb) {
    try {
      cb(null, safeFilename(file.originalname));
    } catch (e) {
      cb(e);
    }
  }
});
```

En `/api/gallery/new` (línea 101-103), sustituir la validación por:

```js
const galleryId = safeSegment(req.body.galleryId);
if (galleryId === 'favourites') throw new Error('ID de galería inválido');
const dir = path.join(__dirname, 'images', galleryId);
```

En `/api/photo/delete` (líneas 115-116), sustituir por:

```js
const galleryId = safeSegment(req.body.galleryId);
const photo = galleryId === 'favourites'
  ? String(req.body.photo)
  : safeFilename(req.body.photo);
```

En `/api/photo/toggle-favourite` (líneas 165-166), sustituir por:

```js
const galleryId = safeSegment(req.body.galleryId);
const photo = safeFilename(req.body.photo);
if (galleryId === 'favourites') throw new Error('Invalid parameters');
```

En `/api/gallery/set-cover` (líneas 218-219), sustituir por:

```js
const galleryId = safeSegment(req.body.galleryId);
const photo = galleryId === 'favourites'
  ? String(req.body.photo)
  : safeFilename(req.body.photo);
```

Nota: en la rama `favourites` el `photo` es una ruta relativa del tipo `japan/japan-13.webp`, no un nombre suelto, y solo se usa para comparar contra entradas del JSON, nunca para tocar el disco. Por eso ahí basta con `String()`.

- [ ] **Step 6: Restringir lo que sirve el estático**

`app.use(express.static(__dirname))` en la línea 25 publica la raíz del repositorio, incluidos `.git/`, `node_modules/` y `data/`.
Sustituir esa línea por:

```js
// Solo lo que el panel necesita cargar por HTTP. Servir __dirname entero
// publicaría .git, node_modules y los JSON de datos.
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/tools/admin', express.static(path.join(__dirname, 'tools', 'admin')));
```

- [ ] **Step 7: Verificar en el CMS**

Arrancar el servidor:

```bash
npm run admin
```

Comprobar en `http://localhost:3030/admin`:
1. La barra lateral lista las galerías y al pulsar una se ven sus miniaturas (confirma que `/images` sigue sirviéndose).
2. Los estilos del panel se aplican (confirma `/tools/admin/admin.css`).
3. Arrastrar y soltar fotos reordena y guarda sin error.
4. El corazón de favoritos y el botón de portada siguen funcionando.

Comprobar que lo cerrado está cerrado:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3030/.git/config
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3030/data/galleries.json
curl -s -X POST http://localhost:3030/api/gallery/new -H 'Content-Type: application/json' -d '{"galleryId":"../escapada"}'
```

Esperado: `404`, `404`, y un JSON de error con `Identificador no válido`.
Confirmar además que no se ha creado nada fuera de `images/`:

```bash
ls "$(dirname "$PWD")" | grep escapada || echo "sin escapada, correcto"
```

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/safe-path.js test/safe-path.test.js admin-server.js package.json
git commit -m "fix(cms): sanear rutas del cliente y restringir el servidor estático"
```

---

### Task 2: Mapa de dimensiones de imagen en tiempo de build

Hoy el frontend no sabe el tamaño de ninguna foto hasta que carga.
De ahí salen el `contain-intrinsic-size` estimado, el timeout de seguridad de 3 segundos y el recálculo del mosaico en cada `load`.
Con las dimensiones en un JSON, el mosaico se puede resolver en el primer render.

El mapa va en un fichero lateral, `data/image-sizes.json`, y no dentro de `galleries.json`, porque el CMS reescribe `gallery.images` entero al reordenar (`tools/admin/admin.js:224`) y aplanaría cualquier dato adjunto a las entradas.

**Files:**
- Create: `scripts/lib/image-sizes.js`
- Create: `test/image-sizes.test.js`
- Modify: `scripts/build.js` (importaciones, cuerpo de `build()`)

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: `scripts/lib/image-sizes.js` exporta `{ mergeSizes, SIZES_FILE }`.
  `mergeSizes(previous, discovered)` devuelve un objeto nuevo cuyas claves son rutas relativas del tipo `japan/japan-13.webp` y cuyos valores son `{ w: number, h: number }`.
  Conserva las entradas previas que sigan presentes en `discovered` y descarta las huérfanas.
  `SIZES_FILE` es la constante `'image-sizes.json'`.
  La tarea 4 lee el fichero que produce esta tarea.

- [ ] **Step 1: Escribir el test que falla**

Crear `test/image-sizes.test.js`:

```js
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
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npm test
```

Esperado: FAIL, `Cannot find module '../scripts/lib/image-sizes'`.

- [ ] **Step 3: Implementar el módulo**

Crear `scripts/lib/image-sizes.js`:

```js
'use strict';

const SIZES_FILE = 'image-sizes.json';

// El mapa vive en un fichero aparte de galleries.json porque el CMS reescribe
// gallery.images entero al reordenar y perdería cualquier dato adjunto.
function mergeSizes(previous, discovered) {
  const base = (previous && typeof previous === 'object' && !Array.isArray(previous))
    ? previous
    : {};

  const merged = {};
  for (const key of Object.keys(discovered).sort()) {
    merged[key] = discovered[key] || base[key];
  }
  return merged;
}

module.exports = { mergeSizes, SIZES_FILE };
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

```bash
npm test
```

Esperado: PASS, 11 tests en total.

- [ ] **Step 5: Recoger las dimensiones en el build**

En `scripts/build.js`, tras las importaciones:

```js
const { mergeSizes, SIZES_FILE } = require('./lib/image-sizes');
```

Dentro de `build()`, justo antes del bucle `for (const folder of folders)`, declarar el acumulador:

```js
const discoveredSizes = {};
```

Dentro de la función que se pasa a `limit(...)` (líneas 114-146), el bloque debe devolver también las dimensiones.
Sustituir el retorno temprano de los `.webp` ya convertidos:

```js
      if (fileExt.toLowerCase() === '.webp') {
        const meta = await sharp(filePath).metadata();
        return { success: true, file, largeWebpName, width: meta.width, height: meta.height };
      }
```

Y el retorno del caso convertido, tras el `fs.rename`:

```js
        const meta = await sharp(largePath).metadata();
        return { success: true, file, largeWebpName, width: meta.width, height: meta.height };
```

En el bucle que recorre `results` (líneas 148-156), registrar la dimensión:

```js
    for (const result of results) {
      if (result.success) {
        processedImages.push(result.largeWebpName);
        if (result.width && result.height) {
          discoveredSizes[`${folder}/${result.largeWebpName}`] = { w: result.width, h: result.height };
        }
        if (!coverImage) {
          coverImage = `images/${folder}/${result.largeWebpName}`;
        }
      }
    }
```

- [ ] **Step 6: Escribir el fichero de dimensiones**

En `scripts/build.js`, justo antes del `await fs.writeFile(jsonPath, ...)` final, añadir:

```js
  // Mapa de dimensiones: lo consume el frontend para conocer la relación de
  // aspecto antes de que la imagen cargue.
  const sizesPath = path.join(DATA_DIR, SIZES_FILE);
  let previousSizes = {};
  try {
    previousSizes = JSON.parse(await fs.readFile(sizesPath, 'utf-8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Warning: no se pudo leer ${SIZES_FILE}, se regenera desde cero.`, err.message);
    }
  }
  const sizes = mergeSizes(previousSizes, discoveredSizes);
  await fs.writeFile(sizesPath, JSON.stringify(sizes, null, 2));
  console.log(`Wrote ${Object.keys(sizes).length} image sizes to ${sizesPath}`);
```

- [ ] **Step 7: Ejecutar el build y verificar la salida**

```bash
npm run build
```

Esperado: la línea `Wrote 275 image sizes to .../data/image-sizes.json` (el número puede variar según las fotos presentes).

Comprobar el contenido:

```bash
node -e "const s=require('./data/image-sizes.json');const k=Object.keys(s);console.log(k.length, k[0], JSON.stringify(s[k[0]]))"
```

Esperado: un número mayor que 0, una clave del tipo `italy/italy-01.webp` y un valor `{"w":1920,"h":...}`.

Comprobar que el build no ha alterado el orden de las galerías:

```bash
git diff --stat data/galleries.json
```

Esperado: sin cambios, o solo cambios esperados si se han añadido fotos.

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/image-sizes.js test/image-sizes.test.js scripts/build.js data/image-sizes.json
git commit -m "feat(build): registrar las dimensiones de cada imagen en data/image-sizes.json"
```

---

### Task 3: Generar variantes responsive en el build

Todas las fotos se sirven a 1920px, incluso en huecos de 326px.
Se generan dos variantes reducidas por foto y se mantiene el fichero base como el de 1920px, para no romper las referencias existentes en `galleries.json` ni en `favourites.json`.

**Files:**
- Create: `scripts/lib/variants.js`
- Create: `test/variants.test.js`
- Modify: `scripts/build.js` (importaciones, filtro de escaneo, tarea de conversión)

**Interfaces:**
- Consumes: `safeFilename` no se usa aquí; el build trabaja sobre el disco, no sobre entrada del cliente.
- Produces: `scripts/lib/variants.js` exporta `{ VARIANT_WIDTHS, variantName, isVariant }`.
  `VARIANT_WIDTHS` es `[640, 1280]`.
  `variantName('japan-13.webp', 640)` devuelve `'japan-13-640w.webp'`.
  `isVariant('japan-13-640w.webp')` devuelve `true`.
  Las tareas 4 y 6 usan `VARIANT_WIDTHS` y `variantName`.

- [ ] **Step 1: Escribir el test que falla**

Crear `test/variants.test.js`:

```js
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
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
npm test
```

Esperado: FAIL, `Cannot find module '../scripts/lib/variants'`.

- [ ] **Step 3: Implementar el módulo**

Crear `scripts/lib/variants.js`:

```js
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
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

```bash
npm test
```

Esperado: PASS, 16 tests en total.

- [ ] **Step 5: Excluir las variantes del escaneo**

Si el build tratara las variantes como fotos, las metería en `galleries.json` y generaría variantes de variantes.

En `scripts/build.js`, tras las importaciones:

```js
const { VARIANT_WIDTHS, variantName, isVariant } = require('./lib/variants');
```

Sustituir el filtro de la línea 93 por:

```js
    const imageFiles = files.filter(f => /\.(jpe?g|png|webp)$/i.test(f) && !f.startsWith('thumb_') && !isVariant(f))
```

- [ ] **Step 6: Generar las variantes**

Dentro de la función pasada a `limit(...)`, tras obtener el `.webp` grande, generar las reducidas.
Añadir este helper por encima de `build()`:

```js
// Genera las variantes reducidas junto al fichero base. withoutEnlargement
// evita crear una "variante" mayor que el original en fotos pequeñas.
async function writeVariants(sourcePath, folderPath, largeWebpName, sourceWidth) {
  for (const width of VARIANT_WIDTHS) {
    if (sourceWidth && sourceWidth <= width) continue;
    const target = path.join(folderPath, variantName(largeWebpName, width));
    await sharp(sourcePath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(target);
  }
}
```

En la rama de los `.webp` ya convertidos, sustituir el retorno por:

```js
      if (fileExt.toLowerCase() === '.webp') {
        const meta = await sharp(filePath).metadata();
        await writeVariants(filePath, folderPath, largeWebpName, meta.width);
        return { success: true, file, largeWebpName, width: meta.width, height: meta.height };
      }
```

En la rama de conversión, tras el `fs.rename` y antes del retorno:

```js
        const meta = await sharp(largePath).metadata();
        await writeVariants(largePath, folderPath, largeWebpName, meta.width);
        return { success: true, file, largeWebpName, width: meta.width, height: meta.height };
```

- [ ] **Step 7: Ejecutar el build y verificar**

```bash
npm run build
```

Comprobar que hay tres ficheros por foto y que los pesos son los esperados:

```bash
ls -l images/japan/japan-13*.webp
```

Esperado: `japan-13.webp` (~309KB), `japan-13-640w.webp` (~18KB), `japan-13-1280w.webp` (~81KB).

Comprobar que las variantes no se han colado en los datos:

```bash
node -e "const g=require('./data/galleries.json');const bad=g.flatMap(x=>x.images.map(i=>typeof i==='string'?i:i.src)).filter(s=>/-(640|1280)w\./.test(s));console.log(bad.length===0?'sin variantes en galleries.json':bad)"
```

Esperado: `sin variantes en galleries.json`.

Ejecutar el build una segunda vez y confirmar que es idempotente:

```bash
npm run build && git status --short data/
```

Esperado: `data/` sin cambios respecto a la primera ejecución.

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/variants.js test/variants.test.js scripts/build.js images data/
git commit -m "feat(build): generar variantes de 640w y 1280w para cada imagen"
```

---

### Task 4: Servir `srcset` y resolver el mosaico sin esperar al `load`

Con el mapa de dimensiones disponible, el frontend puede emitir `srcset`, fijar `width`/`height` y calcular la relación de aspecto en el primer render.
Eso elimina el salto de layout y hace innecesario el timeout de seguridad de 3 segundos de `scripts/gallery.js:284`.

**Files:**
- Create: `scripts/images.js`
- Modify: `scripts/gallery.js:1-80` (galería normal), `scripts/gallery.js:200-330` (favourites)
- Modify: `scripts/home.js:26-45` (banner), `scripts/home.js:164-180` (tarjetas)

**Interfaces:**
- Consumes: `data/image-sizes.json` de la tarea 2, con claves `gallery/file.webp` y valores `{ w, h }`.
  Los anchos de variante `[640, 1280]` de la tarea 3, replicados aquí como constante del navegador porque `scripts/lib/variants.js` es CommonJS y no se puede importar desde un módulo ES del navegador.
- Produces: `scripts/images.js` exporta `{ loadImageSizes, imageAttrs }`.
  `loadImageSizes()` devuelve una `Promise` del mapa, o `{}` si el fichero no existe.
  `imageAttrs(relSrc, sizesMap, sizesAttr)` devuelve el string de atributos HTML listo para interpolar (`src`, `srcset`, `sizes`, `width`, `height`), o solo `src` si no hay dimensiones conocidas.

- [ ] **Step 1: Crear el módulo de imágenes**

Crear `scripts/images.js`:

```js
// Los anchos deben coincidir con VARIANT_WIDTHS de scripts/lib/variants.js.
// Se duplican porque aquel módulo es CommonJS y este lo carga el navegador.
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

// relSrc es una ruta relativa a images/, del tipo "japan/japan-13.webp".
export function imageAttrs(relSrc, sizesMap, sizesAttr) {
  const src = `images/${relSrc}`;
  const dim = sizesMap && sizesMap[relSrc];
  if (!dim) return `src="${src}"`;

  const candidates = VARIANT_WIDTHS
    .filter(w => w < dim.w)
    .map(w => `${variantSrc(relSrc, w)} ${w}w`);
  candidates.push(`${src} ${dim.w}w`);

  return `src="${src}" srcset="${candidates.join(', ')}" sizes="${sizesAttr}" width="${dim.w}" height="${dim.h}"`;
}
```

- [ ] **Step 2: Verificar el módulo en el navegador antes de cablearlo**

Arrancar el sitio:

```bash
npm start
```

Abrir `http://localhost:8080/` y en la consola del navegador:

```js
const m = await import('/scripts/images.js');
const sizes = await m.loadImageSizes();
console.log(Object.keys(sizes).length);
console.log(m.imageAttrs('japan/japan-13.webp', sizes, '25vw'));
console.log(m.imageAttrs('no/existe.webp', sizes, '25vw'));
```

Esperado: un número mayor que 0; una cadena con `srcset="images/japan/japan-13-640w.webp 640w, images/japan/japan-13-1280w.webp 1280w, images/japan/japan-13.webp 1920w"` y `width="1920" height="1280"`; y para la ruta inexistente solo `src="images/no/existe.webp"`.

- [ ] **Step 3: Usarlo en la galería normal**

En `scripts/gallery.js`, añadir a las importaciones:

```js
import { loadImageSizes, imageAttrs } from './images.js';
```

En `initGalleryPage`, cargar el mapa en paralelo con las galerías.
Sustituir:

```js
    const res = await fetch('data/galleries.json');
    if (!res.ok) throw new Error('Failed to load galleries');
    const galleries = await res.json();
```

por:

```js
    const [res, sizesMap] = await Promise.all([
      fetch('data/galleries.json'),
      loadImageSizes()
    ]);
    if (!res.ok) throw new Error('Failed to load galleries');
    const galleries = await res.json();
```

Y pasar `sizesMap` a `renderFavouritesGallery(galleries, container, sizesMap)`.

Sustituir el `map` de las fotos (líneas 46-52) por:

```js
        ${gallery.images.map((img, i) => {
          const rel = `${gallery.id}/${typeof img === 'string' ? img : img.src}`;
          const attrs = imageAttrs(rel, sizesMap, '(max-width: 1200px) 100vw, 1200px');
          return `
          <div class="photo-item is-loading" data-index="${i}" tabindex="0">
            <img ${attrs} alt="${gallery.title} photo ${i + 1}" loading="lazy">
          </div>
        `;
        }).join('')}
```

- [ ] **Step 4: Usarlo en el mosaico de favourites**

Cambiar la firma a `function renderFavouritesGallery(galleries, container, sizesMap)`.

Sustituir el `map` de los items del mosaico (líneas 222-228) por:

```js
      ${favourites.map((f, i) => {
        const attrs = imageAttrs(f.rel, sizesMap, '(max-width: 600px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw');
        return `
        <div class="photo-item is-loading" data-index="${i}" data-featured="${f.featured ? 'true' : 'false'}" tabindex="0" style="view-transition-name: photo-${i};">
          <img ${attrs} alt="${f.alt}" loading="lazy">
        </div>
      `;
      }).join('')}
```

Para que `f.rel` exista, en el `map` que construye `favourites` (líneas 190-204) añadir la propiedad:

```js
    return {
      src: `images/${srcStr}`,
      rel: srcStr,
      alt: `Favourite shot`,
      featured: isFeatured
    };
```

- [ ] **Step 5: Calcular el mosaico desde los atributos, no desde el evento load**

`resizeAllGridItems` ya prefiere `img.naturalWidth` y cae a los atributos `width`/`height` cuando aún vale 0.
Con el paso anterior esos atributos existen siempre que la foto esté en el mapa, así que el primer cálculo es correcto sin esperar a ninguna descarga.
Falta invocarlo una vez nada más pintar el marcado.

En `renderFavouritesGallery`, justo después de `container.innerHTML = html;` y antes de `const grid = container.querySelector('.mosaic-grid');`, añadir:

```js
  // Primer cálculo inmediato: los atributos width/height del marcado bastan,
  // no hace falta que ninguna imagen haya cargado todavía.
  resizeAllGridItems(container);
```

El timeout de seguridad de 3 segundos se deja tal cual: ahora solo cubre el caso de fotos que todavía no estén en `data/image-sizes.json`, por ejemplo si se añaden a mano sin pasar por `npm run build`.

- [ ] **Step 6: Usarlo en la home**

En `scripts/home.js`, añadir a las importaciones:

```js
import { loadImageSizes, imageAttrs } from './images.js';
```

Sustituir la carga:

```js
    const [res, sizesMap] = await Promise.all([
      fetch('data/galleries.json'),
      loadImageSizes()
    ]);
    if (!res.ok) throw new Error('Failed to load galleries');
    const galleries = await res.json();
```

Pasar `sizesMap` a `renderGalleryCard(g, i, sizesMap)` en las dos llamadas (líneas 55 y 67) y cambiar la firma:

```js
function renderGalleryCard(gallery, index, sizesMap) {
  const layout = index % 2 === 0 ? 'horizontal-left' : 'horizontal-right';
  const rel = gallery.coverImage.replace(/^images\//, '');
  const attrs = imageAttrs(rel, sizesMap, '(max-width: 768px) 100vw, 50vw');

  return `
    <a href="gallery.html?id=${gallery.id}" class="gallery-card fade-in-up" data-layout="${layout}" style="animation-delay: ${index * 100}ms">
      <div class="gallery-card__image-wrapper">
        <img class="gallery-card__image" ${attrs} alt="${gallery.title} cover image" loading="lazy">
      </div>
      <div class="gallery-card__info">
        <h3 class="gallery-card__title">${gallery.title}</h3>
        <p class="gallery-card__desc">${gallery.description}</p>
      </div>
    </a>
  `;
}
```

El banner de favourites y su carrusel se dejan con `src` a 1920px: ocupa el ancho completo y es lo primero que se ve.

- [ ] **Step 7: Comprobar que no hace falta tocar el CSS**

En el mosaico la altura de cada hueco la fija el `grid-row-end` que calcula el JavaScript, y el `img` la rellena con `object-fit: cover`, así que ahí no cambia nada.

En la galería normal (`.photos-grid`) los `width`/`height` que ahora emite el marcado le dan al navegador la relación de aspecto por defecto, y con eso reserva el hueco antes de descargar.
Eso ocurre sin ninguna regla nueva.

Verificar que efectivamente no hay regresión, con `npm start` corriendo y las DevTools abiertas en `http://localhost:8080/gallery.html?id=japan`:

```js
const i = document.querySelector('.photos-grid .photo-item img');
console.log(i.getAttribute('width'), i.getAttribute('height'), getComputedStyle(i).aspectRatio);
```

Esperado: los dos atributos con valores reales y un `aspect-ratio` distinto de `auto`.

Si el `aspect-ratio` saliera `auto`, añadir en `styles/components.css` al final del bloque de `.photo-item img`:

```css
.photos-grid .photo-item img {
  height: auto;
}
```

y volver a comprobarlo.

- [ ] **Step 8: Verificar en el navegador**

Con `npm start` corriendo, abrir `http://localhost:8080/gallery.html?id=favourites` con las DevTools en la pestaña Network, filtro Img, caché deshabilitada.

Comprobar en escritorio a 1512px de ancho:
1. Las peticiones son a ficheros `-640w.webp`, no a los de 1920px.
2. El peso total de imágenes de la primera pantalla baja de varios MB a unos cientos de KB.
3. El mosaico no da un salto visible al terminar de cargar.

En la consola, confirmar que no quedan huecos ni solapes:

```js
const g = document.querySelector('.mosaic-grid');
const items = [...g.querySelectorAll('.photo-item')];
const R = items.map(i => { const r = i.getBoundingClientRect(); return { l: r.left, rt: r.right, t: r.top + scrollY, b: r.bottom + scrollY }; });
let ov = 0;
for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j]; if (Math.min(a.rt, b.rt) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1) ov++; }
console.log('solapes', ov, 'altura', Math.round(g.getBoundingClientRect().height));
```

Esperado: `solapes 0`.

Repetir en `http://localhost:8080/` (tarjetas de la home) y en una galería normal, por ejemplo `gallery.html?id=japan`, comprobando que las fotos se ven y el lightbox sigue abriendo la versión de 1920px.

- [ ] **Step 9: Commit**

```bash
git add scripts/images.js scripts/gallery.js scripts/home.js
git commit -m "feat(frontend): servir srcset y resolver el mosaico sin esperar a la carga"
```

---

### Task 5: Escapar el texto interpolado en las plantillas

`home.js` y `gallery.js` inyectan `title`, `description` y los `alt` con `innerHTML` sin escapar.
El CMS permite crear galerías con el nombre que sea, así que un título con comillas o con `<` rompe el marcado, y en el peor caso ejecuta script.

**Files:**
- Create: `scripts/dom.js`
- Modify: `scripts/gallery.js` (cabecera de galería, `alt` de las fotos)
- Modify: `scripts/home.js` (`renderGalleryCard`)

**Interfaces:**
- Consumes: nada.
- Produces: `scripts/dom.js` exporta `esc(value)`, que devuelve el string con `&`, `<`, `>`, `"` y `'` sustituidos por sus entidades.

- [ ] **Step 1: Crear el helper**

Crear `scripts/dom.js`:

```js
const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

// Los títulos y descripciones vienen del CMS, donde el usuario escribe texto
// libre, y se interpolan en plantillas que acaban en innerHTML.
export function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ENTITIES[c]);
}
```

- [ ] **Step 2: Verificar el helper en el navegador**

Con `npm start` corriendo, en la consola:

```js
const { esc } = await import('/scripts/dom.js');
console.log(esc('Japón "2024" <img onerror=alert(1)>'));
console.log(esc(null), esc(undefined));
```

Esperado: `Japón &quot;2024&quot; &lt;img onerror=alert(1)&gt;` y dos cadenas vacías.

- [ ] **Step 3: Aplicarlo en gallery.js**

Añadir la importación:

```js
import { esc } from './dom.js';
```

En la cabecera de la galería normal, sustituir:

```js
        <h1>${gallery.title}</h1>
        <p>${gallery.description}</p>
```

por:

```js
        <h1>${esc(gallery.title)}</h1>
        <p>${esc(gallery.description)}</p>
```

En el `alt` de las fotos, sustituir `alt="${gallery.title} photo ${i + 1}"` por `alt="${esc(gallery.title)} photo ${i + 1}"`.

En `renderFavouritesGallery`, sustituir:

```js
      <h1>${favGallery.title}</h1>
      <p>${favGallery.description}</p>
```

por:

```js
      <h1>${esc(favGallery.title)}</h1>
      <p>${esc(favGallery.description)}</p>
```

y el `alt` del mosaico por `alt="${esc(f.alt)}"`.

- [ ] **Step 4: Aplicarlo en home.js**

Añadir la importación:

```js
import { esc } from './dom.js';
```

En `renderGalleryCard`, sustituir las tres interpolaciones de texto:

```js
        <img class="gallery-card__image" ${attrs} alt="${esc(gallery.title)} cover image" loading="lazy">
      </div>
      <div class="gallery-card__info">
        <h3 class="gallery-card__title">${esc(gallery.title)}</h3>
        <p class="gallery-card__desc">${esc(gallery.description)}</p>
```

- [ ] **Step 5: Verificar con un título hostil**

Crear una galería de prueba desde el CMS no permite meter caracteres raros porque el `id` va saneado, pero el `title` sí es texto libre en `galleries.json`.
Editar temporalmente el título de una galería para la prueba:

```bash
node -e "const fs=require('fs');const p='data/galleries.json';const g=JSON.parse(fs.readFileSync(p));const t=g.find(x=>x.id!=='favourites');console.log('titulo original:',t.title);t.title='Japón \"2024\" <img src=x onerror=alert(1)>';fs.writeFileSync(p,JSON.stringify(g,null,2))"
```

Recargar `http://localhost:8080/`.
Esperado: el título se ve literal, con las comillas y los signos `<` `>` visibles, y no salta ningún `alert`.

Restaurar:

```bash
git checkout data/galleries.json
```

- [ ] **Step 6: Commit**

```bash
git add scripts/dom.js scripts/gallery.js scripts/home.js
git commit -m "fix(frontend): escapar el texto interpolado en las plantillas"
```

---

### Task 6: Borrar las variantes al borrar una foto desde el CMS

Tras la tarea 3, borrar una foto deja huérfanas sus dos variantes en el disco.
Se acumularían en cada limpieza de galería.

**Files:**
- Modify: `admin-server.js` (`/api/photo/delete`, rama de galería normal)

**Interfaces:**
- Consumes: `VARIANT_WIDTHS` y `variantName` de `scripts/lib/variants.js` (tarea 3), `safeSegment` y `safeFilename` de `scripts/lib/safe-path.js` (tarea 1).

- [ ] **Step 1: Importar el módulo de variantes**

En `admin-server.js`, junto a la importación de `safe-path`:

```js
const { VARIANT_WIDTHS, variantName } = require('./scripts/lib/variants');
```

- [ ] **Step 2: Borrar también las variantes**

En `/api/photo/delete`, en la rama que no es `favourites`, sustituir:

```js
                const filePath = path.join(__dirname, 'images', galleryId, photo);
                try { await fs.unlink(filePath); } catch(e) { console.log("File not found to delete:", filePath); }
```

por:

```js
                const targets = [photo, ...VARIANT_WIDTHS.map(w => variantName(photo, w))];
                for (const name of targets) {
                  const filePath = path.join(__dirname, 'images', galleryId, name);
                  try {
                    await fs.unlink(filePath);
                  } catch (e) {
                    if (e.code !== 'ENOENT') console.log('No se pudo borrar:', filePath, e.message);
                  }
                }
```

- [ ] **Step 3: Verificar**

Arrancar el CMS:

```bash
npm run admin
```

Subir una foto de prueba a una galería cualquiera desde el panel, pulsar Build, confirmar que existen las tres versiones:

```bash
ls images/<galeria>/<foto-de-prueba>*
```

Borrarla desde el panel y confirmar que no queda ninguna:

```bash
ls images/<galeria>/<foto-de-prueba>* 2>&1
```

Esperado: `No such file or directory`.

- [ ] **Step 4: Commit**

```bash
git add admin-server.js
git commit -m "fix(cms): borrar las variantes junto con la foto original"
```

---

### Task 7: Limpieza previa al despliegue

Tres cosas pequeñas que solo se notan en producción.

**Files:**
- Modify: `index.html` (link de fuentes, favicon, Open Graph)
- Modify: `gallery.html` (link de fuentes, favicon)
- Modify: `scripts/build.js` (aviso si falta la foto del hero)

**Interfaces:**
- Consumes: nada.
- Produces: nada que consuman otras tareas.

- [ ] **Step 1: Quitar la fuente que no se usa**

`Baumans` se descarga en las dos páginas y no aparece en ningún `font-family`.
Comprobarlo:

```bash
grep -rn "Baumans" styles/ scripts/ || echo "Baumans no se usa en ningún estilo"
```

En `index.html` y en `gallery.html`, sustituir la URL de Google Fonts por la misma sin `&family=Baumans`:

```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;1,400&family=Orbitron:wght@400..900&family=Rochester&family=Silkscreen:wght@400;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Añadir favicon y metadatos sociales**

Crear `images/favicon.svg` con una marca sencilla que funcione en claro y en oscuro:

```bash
cat > images/favicon.svg <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
  <circle cx="16" cy="17" r="7" fill="none" stroke="#f0f0f0" stroke-width="2"/>
  <path d="M11 9h10l-2-3h-6z" fill="#f0f0f0"/>
</svg>
SVG
```

En `index.html`, dentro del `<head>`, tras la etiqueta `<title>`:

```html
<link rel="icon" href="images/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:title" content="Luissantra - Photography Portfolio">
<meta property="og:description" content="Photography and in-game photography portfolio by Luissantra.">
<meta property="og:image" content="images/spider-man-miles-morales/spider-man-miles-morales-01.webp">
<meta name="twitter:card" content="summary_large_image">
```

En `gallery.html`, añadir solo el `<link rel="icon">`, porque el título y la imagen los fija el JavaScript según la galería.

Nota: `og:image` debe ser una URL absoluta para que la mayoría de redes la resuelvan.
Se deja relativa hasta conocer el dominio y se corrige en el plan de despliegue.

- [ ] **Step 3: Avisar si falta la foto del hero**

`index.html` referencia `images/spider-man-miles-morales/spider-man-miles-morales-01.webp` a pelo.
Si esa foto se renombra o se borra desde el CMS, la home se queda sin hero y nadie se entera.

En `scripts/build.js`, al final de `build()`, antes del `console.log('Build complete!')`:

```js
  // El hero de index.html apunta a un fichero fijo. Avisar si desaparece.
  const HERO_IMAGE = 'spider-man-miles-morales/spider-man-miles-morales-01.webp';
  try {
    await fs.access(path.join(IMAGES_DIR, HERO_IMAGE));
  } catch (err) {
    console.warn(`\nAviso: falta ${HERO_IMAGE}, que index.html usa como hero. Actualiza el marcado o restaura la foto.`);
  }
```

- [ ] **Step 4: Verificar**

```bash
npm run build
npm start
```

Abrir `http://localhost:8080/` y comprobar:
1. El favicon aparece en la pestaña.
2. En la pestaña Network no hay ninguna petición de la fuente `Baumans`.
3. El hero se ve y no sale ningún aviso en la salida del build.

Provocar el aviso para confirmar que funciona:

```bash
mv images/spider-man-miles-morales/spider-man-miles-morales-01.webp /tmp/hero.webp && npm run build; mv /tmp/hero.webp images/spider-man-miles-morales/spider-man-miles-morales-01.webp
```

Esperado: la línea `Aviso: falta spider-man-miles-morales/spider-man-miles-morales-01.webp`.

Volver a ejecutar `npm run build` para dejar los datos consistentes tras restaurar la foto.

- [ ] **Step 5: Commit**

```bash
git add index.html gallery.html images/favicon.svg scripts/build.js
git commit -m "chore: favicon, metadatos sociales, quitar fuente sin usar y avisar del hero"
```

---

## Después de este plan

1. Subir las fotos de los juegos nuevos a `images/<id-del-juego>/` y ejecutar `npm run build`.
   No hace falta tocar código: `getCategory` en `scripts/build.js:58` clasifica como `in-game` todo lo que no esté en la lista `['japan', 'italy', 'new-york']`.
   Solo una galería de mundo real nueva obligaría a editar esa lista y la de `getDescription`.
2. Revisar orden y portadas en el CMS, marcar favoritas.
3. Plan de despliegue aparte: hosting, dominio, cabeceras de caché para `images/`, y si conviene aplanar la cadena de `@import` del CSS.
