# Iconos de consola, paginación y filtro: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Marcar la consola de cada galería in-game, cortar la home en 10 galerías con botón de "Load more", y permitir filtrar por consola mediante chips, apoyándose en un `data/gallery-meta.json` nuevo que pasa a ser la fuente de verdad persistente del orden, la categoría y la consola.

**Architecture:** Se introduce `data/gallery-meta.json`, editado a mano o desde el CMS, y un helper CommonJS `scripts/lib/gallery-meta.js` que lo parsea, valida y ordena. `build.js` deja de derivar categoría y descripción de listas hardcodeadas y pasa a leer el meta, ordenando el array de galerías antes de escribir `galleries.json`. En el navegador, un módulo ES `scripts/platforms.js` centraliza el vocabulario de consolas para `home.js` y `gallery.js`, y `home.js` gana chips de filtro, corte en 10 y estado en la URL.

**Tech Stack:** Node.js CommonJS para build y CMS, `node --test` para tests, módulos ES nativos sin bundler para el navegador, Express y SortableJS en el CMS, CSS modular sin framework.

## Global Constraints

- Sin dependencias nuevas. El sitio público no carga terceros; `sharp`, `express` y `multer` son solo de build y CMS.
- El copy visible del sitio público va en **inglés**. La UI del CMS, los comentarios de código, la documentación y los mensajes de commit van en **español**.
- Nada de guiones largos en ningún texto. Usar guion normal.
- Todo valor interpolado desde `data/*.json` en una plantilla que acaba en `innerHTML` pasa por `esc()` de `scripts/dom.js`.
- `platform` procede de `galleries.json`, que es entrada no confiable. Se valida contra la lista permitida antes de renderizar; un valor desconocido se trata como "sin consola".
- Los ficheros CSS nuevos, si los hubiera, se declaran en `styles/main.css` en el hueco correcto del orden de cascada (variables, reset, layout, components, lightbox, utilities). Este plan no crea ninguno: reutiliza `components.css` y `utilities.css`.
- Toda mutación de JSON en el CMS pasa por `dbQueue.enqueue` y valida todo antes de escribir nada.
- Consolas permitidas, exactamente estas cuatro cadenas: `ps4`, `ps5`, `switch`, `switch-2`.
- Etiquetas visibles de consola, exactamente estas: `PS4`, `PS5`, `Switch`, `Switch 2`.
- El aspecto visual definitivo de la insignia está **pendiente de decisión del usuario**. La tarea 7 es un punto de parada explícito: no inventar un diseño y darlo por bueno.

---

### Task 1: Helper de metadatos `gallery-meta.js`

Módulo puro en CommonJS con toda la lógica de parseo, validación y ordenación. Es la única pieza de este plan cubierta por tests automáticos, así que concentra ahí todo lo que se pueda.

**Files:**
- Create: `scripts/lib/gallery-meta.js`
- Test: `test/gallery-meta.test.js`

**Interfaces:**
- Consumes: `safeSegment` de `scripts/lib/safe-path.js`.
- Produces:
  - `META_FILE: string` (constante `'gallery-meta.json'`)
  - `PLATFORMS: string[]`
  - `CATEGORIES: string[]`
  - `validateMeta(meta: unknown): Array` lanza `Error` en el primer problema, devuelve `meta`
  - `indexMeta(meta: Array): Map<string, {id, category, platform?, description?, order: number}>`
  - `resolveMeta(byId: Map, folderName: string): {category: string, platform: string|null, description: string, order: number}`
  - `sortGalleries(galleries: Array<{id: string}>, byId: Map): Array` devuelve un array nuevo

- [ ] **Step 1: Escribir el test que falla**

Crear `test/gallery-meta.test.js`:

```js
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
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npm test`
Expected: FAIL con `Cannot find module '../scripts/lib/gallery-meta'`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `scripts/lib/gallery-meta.js`:

```js
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
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npm test`
Expected: PASS. Todos los tests previos siguen pasando y los 17 nuevos también.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/gallery-meta.js test/gallery-meta.test.js
git commit -m "feat: anadir helper de metadatos de galeria

Modulo CommonJS con el parseo, la validacion y la ordenacion de
gallery-meta.json, siguiendo el patron de variants.js e image-sizes.js
para que la logica quede cubierta por npm test.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Semilla de `gallery-meta.json` e integración en el build

`build.js` deja de inventar categoría y descripción, y pasa a respetar el orden del meta. Esto arregla de paso el bug por el que el orden manual del CMS se destruía en cada build.

**Files:**
- Create: `data/gallery-meta.json`
- Modify: `scripts/build.js` (bloque de requires, `getDescription`/`getCategory`, declaración de `galleries`, bloque `galleries.push`, ordenación antes del `unshift` de favourites)

**Interfaces:**
- Consumes: `META_FILE`, `validateMeta`, `indexMeta`, `resolveMeta`, `sortGalleries` de la tarea 1.
- Produces: `data/galleries.json` con las galerías ordenadas según el meta y con un campo `platform` opcional en cada objeto de galería.

- [ ] **Step 1: Crear la semilla del meta**

Crear `data/gallery-meta.json`. El orden es exactamente el alfabético actual, para que el primer build produzca un diff que solo añada `platform` y sea fácil de revisar. Las 9 consolas marcadas con el comentario del commit son estimaciones a corregir desde el CMS.

```json
[
  { "id": "alan-wake-2", "category": "in-game", "platform": "ps5" },
  { "id": "astro-bot", "category": "in-game", "platform": "ps5" },
  { "id": "ciberpunk-2077", "category": "in-game", "platform": "ps5" },
  { "id": "clair-obscur", "category": "in-game", "platform": "ps5" },
  { "id": "demons-souls", "category": "in-game", "platform": "ps5" },
  { "id": "dk-bananza", "category": "in-game", "platform": "switch-2" },
  { "id": "dredge", "category": "in-game", "platform": "ps5" },
  { "id": "elden-ring", "category": "in-game", "platform": "ps5" },
  { "id": "ghost-of-tsushima", "category": "in-game", "platform": "ps5" },
  { "id": "gow-ragnarok", "category": "in-game", "platform": "ps5" },
  { "id": "italy", "category": "photography" },
  { "id": "japan", "category": "photography" },
  { "id": "mario-kart-world", "category": "in-game", "platform": "switch-2" },
  { "id": "mario-odyssey", "category": "in-game", "platform": "switch-2" },
  { "id": "marvel-spider-man-2", "category": "in-game", "platform": "ps5" },
  { "id": "mgs-snake-eater", "category": "in-game", "platform": "ps5" },
  { "id": "new-york", "category": "photography" },
  { "id": "ratchet-clank-rift-apart", "category": "in-game", "platform": "ps5" },
  { "id": "red-dead-redemption-2", "category": "in-game", "platform": "ps4" },
  { "id": "sekiro", "category": "in-game", "platform": "ps4" },
  { "id": "spider-man-miles-morales", "category": "in-game", "platform": "ps5" },
  { "id": "the-last-guardian", "category": "in-game", "platform": "ps4" },
  { "id": "the-last-of-us-2", "category": "in-game", "platform": "ps4" },
  { "id": "zelda-botw", "category": "in-game", "platform": "switch-2" },
  { "id": "zelda-totk", "category": "in-game", "platform": "switch-2" }
]
```

- [ ] **Step 2: Verificar que la semilla pasa la validación**

Run:

```bash
node -e "const {validateMeta}=require('./scripts/lib/gallery-meta');const m=require('./data/gallery-meta.json');validateMeta(m);console.log('ok', m.length, 'entradas')"
```

Expected: `ok 25 entradas`

- [ ] **Step 3: Comprobar que el meta cubre todas las carpetas de images/**

Run:

```bash
node -e "
const fs=require('fs');
const meta=require('./data/gallery-meta.json').map(e=>e.id);
const folders=fs.readdirSync('./images',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
const faltan=folders.filter(f=>!meta.includes(f));
const sobran=meta.filter(id=>!folders.includes(id));
console.log('faltan en el meta:',faltan);
console.log('en el meta sin carpeta:',sobran);
"
```

Expected: ambas listas vacías, es decir `faltan en el meta: []` y `en el meta sin carpeta: []`

- [ ] **Step 4: Añadir el require en `build.js`**

En `scripts/build.js`, debajo del require de `./lib/variants`, añadir:

```js
const {
  META_FILE,
  validateMeta,
  indexMeta,
  resolveMeta,
  sortGalleries
} = require('./lib/gallery-meta');
```

- [ ] **Step 5: Borrar `getDescription` y `getCategory`**

Eliminar de `scripts/build.js` las dos funciones completas, junto con el comentario `// Generate descriptive text based on folder (since we don't have descriptions yet)` que las precede. Son las que hoy contienen la lista hardcodeada `['japan', 'italy', 'new-york']`.

- [ ] **Step 6: Leer y validar el meta al principio de `build()`**

En `scripts/build.js`, justo después del bloque `try/catch` que lee `galleries.json` en `existingGalleries`, insertar:

```js
  // El meta es la fuente de verdad del orden, la categoría y la consola. Un
  // fichero corrupto se propaga en vez de degradarse a vacío: degradar
  // reordenaría y recategorizaría las 25 galerías en silencio, que es
  // exactamente el fallo que queremos que sea ruidoso.
  let meta = [];
  try {
    const metaPath = path.join(DATA_DIR, META_FILE);
    meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    console.log(`No data/${META_FILE} found, using defaults for every gallery.`);
  }
  validateMeta(meta);
  const metaById = indexMeta(meta);
```

- [ ] **Step 7: Cambiar `galleries` de `const` a `let`**

En `scripts/build.js`, la línea `const galleries = [];` pasa a `let galleries = [];`, porque el paso 9 la reasigna con el array ordenado.

- [ ] **Step 8: Usar el meta al construir cada galería**

Sustituir el bloque `galleries.push({ ... })` por:

```js
      const resolved = resolveMeta(metaById, folder);
      const gallery = {
        id: folder,
        title: formatTitle(folder),
        description: resolved.description,
        category: resolved.category,
        coverImage: coverImage,
        images: processedImages
      };
      // Solo se emite platform cuando existe: una galería de photography no
      // debe llevar la clave con valor null en galleries.json.
      if (resolved.platform) gallery.platform = resolved.platform;
      galleries.push(gallery);
```

- [ ] **Step 9: Ordenar antes de anteponer favourites**

En `scripts/build.js`, justo después de cerrar el `for (const folder of folders)` y antes del bloque `try` que lee `favourites.json`, insertar:

```js
  // El orden manual vive en gallery-meta.json. Sin esto, el orden de
  // fs.readdir se impone y destruye cualquier reordenación hecha en el CMS,
  // que es el bug que este cambio arregla. Va antes del unshift de favourites
  // para que la galería sintética siga quedando la primera.
  galleries = sortGalleries(galleries, metaById);
```

- [ ] **Step 10: Ejecutar el build**

Run: `npm run build`
Expected: termina sin error. Tarda un rato porque regenera las variantes de todas las imágenes.

- [ ] **Step 11: Revisar el diff de `galleries.json`**

Run: `git diff --stat data/galleries.json && git diff data/galleries.json | head -60`
Expected: el diff **solo** añade líneas `"platform": "..."`. No debe reordenar galerías ni cambiar ningún `description`, `category`, `coverImage` ni ningún array `images`. Si aparece cualquier otro cambio, es un fallo de este plan y hay que investigarlo antes de continuar.

- [ ] **Step 12: Verificar que el orden ahora sobrevive al build**

`gallery-meta.json` todavía no está en git en este punto, así que la prueba se hace sobre una copia de seguridad en vez de con `git checkout`.

Run:

```bash
cp data/gallery-meta.json scratch/gallery-meta.backup.json
node -e "
const fs=require('fs');
const p='./data/gallery-meta.json';
const meta=JSON.parse(fs.readFileSync(p,'utf-8'));
const i=meta.findIndex(e=>e.id==='zelda-totk');
meta.unshift(meta.splice(i,1)[0]);
fs.writeFileSync(p,JSON.stringify(meta,null,2));
console.log('zelda-totk movida al principio del meta');
"
npm run build
node -e "console.log(require('./data/galleries.json').map(g=>g.id).slice(0,3))"
```

Expected: la salida es `[ 'favourites', 'zelda-totk', 'alan-wake-2' ]`. Antes de este cambio habría sido `[ 'favourites', 'alan-wake-2', 'astro-bot' ]`.

- [ ] **Step 13: Deshacer el cambio de orden de prueba**

Run:

```bash
mv scratch/gallery-meta.backup.json data/gallery-meta.json
npm run build
node -e "console.log(require('./data/galleries.json').map(g=>g.id).slice(0,3))"
```

Expected: `[ 'favourites', 'alan-wake-2', 'astro-bot' ]`, es decir el orden alfabético original restaurado.

- [ ] **Step 14: Ejecutar los tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 15: Commit**

```bash
git add data/gallery-meta.json data/galleries.json scripts/build.js
git commit -m "feat: leer categoria, consola y orden desde gallery-meta.json

build.js deja de derivar description y category de listas hardcodeadas y
pasa a leerlas del meta, que ademas define el orden de presentacion y la
consola de cada galeria in-game.

Arregla de paso un bug latente: el CMS ya permitia reordenar galerias por
drag and drop, pero build.js reconstruia el array con el orden de
fs.readdir y destruia esa reordenacion en cada build.

Nueve consolas quedan sembradas como estimacion y se corregiran desde el
CMS: ciberpunk-2077, dredge, elden-ring, ghost-of-tsushima, gow-ragnarok,
spider-man-miles-morales, red-dead-redemption-2, sekiro y the-last-of-us-2.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: El CMS lee y escribe el meta

`admin-server.js` expone el meta y acepta guardarlo, con la misma disciplina que ya aplica a galerías y favoritos: todo se valida antes de escribir nada, y todo pasa por la cola serializada.

**Files:**
- Modify: `admin-server.js` (requires, `/api/data`, `/api/save`)

**Interfaces:**
- Consumes: `META_FILE` y `validateMeta` de la tarea 1.
- Produces:
  - `GET /api/data` devuelve `{ galleries, favourites, availableFolders, meta }`
  - `POST /api/save` acepta `{ galleries?, favourites?, meta? }` y escribe `data/gallery-meta.json` cuando `meta` está presente

- [ ] **Step 1: Añadir el require**

En `admin-server.js`, tras el require de `./scripts/lib/variants`, añadir:

```js
const { META_FILE, validateMeta } = require('./scripts/lib/gallery-meta');
```

- [ ] **Step 2: Devolver el meta en `/api/data`**

Dentro de `app.get('/api/data', ...)`, tras la línea que lee `favouritesData`, añadir:

```js
        const metaData = await readJsonFile(META_FILE);
```

y cambiar la respuesta a:

```js
        res.json({ galleries: galleriesData, favourites: favouritesData, availableFolders, meta: metaData });
```

- [ ] **Step 3: Aceptar y validar el meta en `/api/save`**

Dentro de `app.post('/api/save', ...)`, sustituir el cuerpo del `try` por:

```js
            const { galleries, favourites, meta } = req.body;
            // Validar TODO antes de escribir NADA: un guardado parcial (p.ej.
            // galleries.json válido pero favourites.json corrupto) sería peor
            // que rechazar la petición entera, porque el frontend confía en
            // que estos ficheros son datos bien formados.
            if (galleries !== undefined) validateGalleries(galleries);
            if (favourites !== undefined) validateFavourites(favourites);
            if (meta !== undefined) validateMeta(meta);

            if (galleries !== undefined) await writeJsonFile('galleries.json', galleries);
            if (favourites !== undefined) await writeJsonFile('favourites.json', favourites);
            if (meta !== undefined) await writeJsonFile(META_FILE, meta);
            res.json({ success: true });
```

- [ ] **Step 4: Arrancar el CMS**

Run: `npm run admin`
Expected: arranca en el puerto 3030 sin error. Dejarlo corriendo en otra terminal para los pasos siguientes.

- [ ] **Step 5: Verificar que `/api/data` devuelve el meta**

Run:

```bash
curl -s localhost:3030/api/data | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('entradas de meta:',j.meta.length);console.log('primera:',JSON.stringify(j.meta[0]))})"
```

Expected: `entradas de meta: 25` y la primera entrada es la de `alan-wake-2` con `platform: "ps5"`.

- [ ] **Step 6: Verificar que `/api/save` rechaza una consola inválida**

Run:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3030/api/save \
  -H 'Content-Type: application/json' \
  -d '{"meta":[{"id":"halo","category":"in-game","platform":"xbox"}]}'
```

Expected: `400`

- [ ] **Step 7: Verificar que el rechazo no ha escrito nada**

Run: `git diff --stat data/gallery-meta.json`
Expected: sin salida. El fichero no ha cambiado.

- [ ] **Step 8: Verificar que un guardado válido sí escribe**

Run:

```bash
curl -s -X POST localhost:3030/api/save -H 'Content-Type: application/json' \
  -d '{"meta":[{"id":"astro-bot","category":"in-game","platform":"ps4"}]}'
git diff --stat data/gallery-meta.json
git checkout data/gallery-meta.json
```

Expected: la respuesta es `{"success":true}`, el `git diff --stat` muestra el fichero modificado, y el `git checkout` lo restaura.

- [ ] **Step 9: Commit**

```bash
git add admin-server.js
git commit -m "feat(cms): leer y guardar gallery-meta.json

/api/data devuelve el meta y /api/save lo acepta en una clave nueva,
validandolo con validateMeta antes de escribir nada y dentro de la misma
tarea de dbQueue que galleries.json y favourites.json.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Selector de consola en el CMS

La barra lateral ya reordena por drag and drop; ahora esa reordenación viaja al meta. Y se añade un selector de consola para la galería activa.

**Files:**
- Modify: `tools/admin/index.html` (bloque `.main-header`)
- Modify: `tools/admin/admin.js` (`apiData`, `updateGalleryOrder`, `loadGallery`, `saveOrder`, funciones nuevas)
- Modify: `tools/admin/admin.css` (estilos del campo)

**Interfaces:**
- Consumes: `GET /api/data` con `meta`, y `POST /api/save` con `meta`, de la tarea 3.
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Añadir el campo al HTML**

En `tools/admin/index.html`, sustituir el bloque `.main-header` entero por:

```html
        <div class="main-header">
            <h2 id="current-gallery-title">Selecciona una galería</h2>
            <label id="platform-field" class="platform-field hidden">
                Consola
                <select id="platform-select" onchange="setPlatform(this.value)">
                    <option value="">Ninguna</option>
                    <option value="ps5">PS5</option>
                    <option value="ps4">PS4</option>
                    <option value="switch-2">Switch 2</option>
                    <option value="switch">Switch</option>
                </select>
            </label>
        </div>
```

- [ ] **Step 2: Inicializar `meta` en el estado del cliente**

En `tools/admin/admin.js`, cambiar la primera línea a:

```js
let apiData = { galleries: [], favourites: [], availableFolders: [], meta: [] };
```

- [ ] **Step 3: Añadir la sincronización de orden y el selector**

En `tools/admin/admin.js`, justo antes de `async function saveOrder()`, insertar:

```js
// El orden de la home vive ahora en gallery-meta.json, así que reordenar la
// barra lateral tiene que reordenar también el meta. Se reconstruye siguiendo
// el nuevo orden de galerías; las entradas cuya carpeta ya no aparece en
// galleries.json se conservan al final, para no perder la consola de una
// carpeta que todavía está vacía y aún no ha entrado en el build.
function syncMetaOrder() {
    const meta = Array.isArray(apiData.meta) ? apiData.meta : [];
    const byId = new Map(meta.map(entry => [entry.id, entry]));
    const ordered = [];
    apiData.galleries.forEach(g => {
        if (g.id === 'favourites') return;
        ordered.push(byId.get(g.id) || { id: g.id, category: g.category || 'in-game' });
        byId.delete(g.id);
    });
    byId.forEach(entry => ordered.push(entry));
    apiData.meta = ordered;
}

// El selector solo tiene sentido en galerías in-game. Favourites es sintética
// y las de photography no llevan consola.
function renderPlatformField(id) {
    const field = document.getElementById('platform-field');
    const select = document.getElementById('platform-select');
    const gallery = apiData.galleries.find(g => g.id === id);
    const isInGame = id !== 'favourites' && (!gallery || gallery.category !== 'photography');
    field.classList.toggle('hidden', !isInGame);
    if (!isInGame) return;
    const entry = (apiData.meta || []).find(m => m.id === id);
    select.value = entry && entry.platform ? entry.platform : '';
}

function setPlatform(value) {
    if (!currentGalleryId || currentGalleryId === 'favourites') return;
    if (!Array.isArray(apiData.meta)) apiData.meta = [];
    let entry = apiData.meta.find(m => m.id === currentGalleryId);
    if (!entry) {
        const gallery = apiData.galleries.find(g => g.id === currentGalleryId);
        entry = { id: currentGalleryId, category: (gallery && gallery.category) || 'in-game' };
        apiData.meta.push(entry);
    }
    // Ninguna se guarda quitando la clave, no poniéndola a null: el meta debe
    // quedar lo más limpio posible porque se edita también a mano.
    if (value) {
        entry.platform = value;
    } else {
        delete entry.platform;
    }
    saveOrder();
}
```

- [ ] **Step 4: Llamar a `syncMetaOrder` al reordenar**

En `tools/admin/admin.js`, dentro de `updateGalleryOrder`, sustituir:

```js
    apiData.galleries = newGalleries;
    saveOrder().then(() => {
```

por:

```js
    apiData.galleries = newGalleries;
    syncMetaOrder();
    saveOrder().then(() => {
```

- [ ] **Step 5: Pintar el selector al cambiar de galería**

En `tools/admin/admin.js`, dentro de `loadGallery`, justo después de la línea que fija `current-gallery-title`, añadir:

```js
    renderPlatformField(id);
```

- [ ] **Step 6: Enviar el meta al guardar**

En `tools/admin/admin.js`, dentro de `saveOrder`, cambiar el `body` a:

```js
            body: JSON.stringify({ galleries: apiData.galleries, favourites: apiData.favourites, meta: apiData.meta })
```

- [ ] **Step 7: Estilar el campo**

Añadir al final de `tools/admin/admin.css`:

```css
.main-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
}

.platform-field {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #aaa;
    font-size: 0.9rem;
    white-space: nowrap;
}

.platform-field select {
    background: #1f1f1f;
    color: #fff;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 6px 10px;
    font: inherit;
    cursor: pointer;
}
```

- [ ] **Step 8: Verificar el selector a mano**

Con `npm run admin` corriendo, abrir `http://localhost:3030/admin` y comprobar:

1. Al seleccionar **Astro Bot**, el selector aparece con `PS5` marcado.
2. Al seleccionar **Japan**, el selector desaparece.
3. Al seleccionar **Favourites**, el selector desaparece.
4. Cambiar Astro Bot a `PS4`: sale el toast de guardado, y `node -e "console.log(require('./data/gallery-meta.json').find(e=>e.id==='astro-bot'))"` muestra `platform: 'ps4'`.
5. Volver a poner `Ninguna`: la clave `platform` desaparece de esa entrada.
6. Devolver Astro Bot a `PS5`.

- [ ] **Step 9: Verificar que reordenar persiste en el meta**

En el CMS, arrastrar **Zelda Totk** al principio de la barra lateral. Después:

Run: `node -e "console.log(require('./data/gallery-meta.json').slice(0,2).map(e=>e.id))"`
Expected: `[ 'zelda-totk', 'alan-wake-2' ]`

Después arrastrarla de vuelta al final y confirmar que el meta vuelve a empezar por `alan-wake-2`.

- [ ] **Step 10: Commit**

```bash
git add tools/admin/index.html tools/admin/admin.js tools/admin/admin.css data/gallery-meta.json data/galleries.json
git commit -m "feat(cms): selector de consola y orden persistente

El drag and drop de la barra lateral ahora reordena tambien
gallery-meta.json, asi que el orden sobrevive al build. Se anade un
selector de consola visible solo en galerias in-game.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Vocabulario de consolas en el navegador

Módulo ES pequeño y compartido por `home.js` y `gallery.js`, siguiendo el patrón de `dom.js` e `images.js`. Aísla la validación de `platform` en un solo sitio.

**Files:**
- Create: `scripts/platforms.js`

**Interfaces:**
- Consumes: `esc` de `scripts/dom.js`.
- Produces:
  - `PLATFORM_ORDER: string[]` en orden de presentación de los chips
  - `PLATFORM_LABELS: Record<string, string>`
  - `platformOf(gallery: object): string|null`
  - `platformBadge(gallery: object): string` devuelve HTML, o cadena vacía si no hay consola válida

- [ ] **Step 1: Crear el módulo**

Crear `scripts/platforms.js`:

```js
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
```

- [ ] **Step 2: Verificar la sintaxis del módulo**

`node --check` parsea los `.js` como CommonJS, porque `package.json` declara `"type": "commonjs"`, y daría un `SyntaxError` falso al ver `export`. Copiar a `.mjs` fuerza el parseo como módulo ES sin llegar a resolver el import.

Run:

```bash
cp scripts/platforms.js scratch/platforms-check.mjs && node --check scratch/platforms-check.mjs && echo "sintaxis ok"; rm -f scratch/platforms-check.mjs
```

Expected: `sintaxis ok`

- [ ] **Step 3: Commit**

```bash
git add scripts/platforms.js
git commit -m "feat: anadir modulo compartido de consolas

Centraliza el orden de los chips, las etiquetas visibles y la validacion
de platform, que se usan tanto en la home como en la vista de galeria.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Chips, corte en 10 y estado en la URL en la home

El grueso del cambio de frontend. La sección In-Game pasa a tener estado propio y a repintarse sola, sin tocar Featured ni Photography.

**Files:**
- Modify: `scripts/home.js` (imports, estado de módulo, bloque HTML de la sección in-game, `renderGalleryCard`, funciones nuevas, `initHomePage`)
- Modify: `styles/components.css` (estilos de chips, botón y estado vacío)

**Interfaces:**
- Consumes: `PLATFORM_ORDER`, `PLATFORM_LABELS`, `platformOf`, `platformBadge` de la tarea 5.
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Añadir el import y el estado de módulo**

En `scripts/home.js`, añadir tras los imports existentes:

```js
import { PLATFORM_ORDER, PLATFORM_LABELS, platformOf, platformBadge } from './platforms.js';
```

y bajo `let carouselIntervalId = null;`:

```js
const PAGE_SIZE = 10;

// Estado de la sección In-Game. Vive a nivel de módulo porque la sección se
// repinta sola al filtrar o al cargar más, sin volver a montar la home entera.
let inGameGalleries = [];
let inGameSizesMap = null;
let activePlatform = null; // null significa "All"
let shownCount = PAGE_SIZE;
```

- [ ] **Step 2: Sustituir el bloque HTML de la sección In-Game**

En `scripts/home.js`, dentro de `initHomePage`, sustituir el bloque `if (inGame.length > 0) { html += ... }` entero por:

```js
    if (inGame.length > 0) {
      inGameGalleries = inGame;
      inGameSizesMap = sizesMap;
      readUrlState();
      html += `
        <section class="category-section" id="in-game-section">
          <div id="section-in-game" class="scroll-anchor"></div>
          <h2 class="section-title gaming fade-in-up">In-Game Photography</h2>
          <div id="platform-chips" class="platform-chips" role="group" aria-label="Filter galleries by console"></div>
          <div id="in-game-status" class="visually-hidden" aria-live="polite"></div>
          <div class="gallery-grid" id="in-game-grid"></div>
          <div id="load-more-wrapper" class="load-more-wrapper"></div>
        </section>
      `;
    }
```

- [ ] **Step 3: Pintar y enganchar la sección tras el `innerHTML`**

En `scripts/home.js`, justo después de `container.innerHTML = html;`, añadir:

```js
    if (inGameGalleries.length > 0) {
      renderInGameSection();
      initInGameControls();
    }
```

- [ ] **Step 4: Añadir las funciones de la sección**

En `scripts/home.js`, tras `renderGalleryCard`, añadir:

```js
// Los chips solo se dibujan para consolas con al menos una galería: un chip
// "Switch (0)" sería ruido, y hoy no hay ninguna galería de Switch 1.
function renderChips() {
  const counts = new Map();
  inGameGalleries.forEach(g => {
    const p = platformOf(g);
    if (p) counts.set(p, (counts.get(p) || 0) + 1);
  });

  const chips = [{ value: '', label: 'All', count: inGameGalleries.length }];
  PLATFORM_ORDER.forEach(p => {
    if (counts.has(p)) {
      chips.push({ value: p, label: PLATFORM_LABELS[p], count: counts.get(p) });
    }
  });

  return chips.map(chip => `
    <button type="button" class="platform-chip" data-platform="${esc(chip.value)}" aria-pressed="${(chip.value || null) === activePlatform}">
      ${esc(chip.label)} <span class="platform-chip__count">${chip.count}</span>
    </button>
  `).join('');
}

function renderInGameSection() {
  const chips = document.getElementById('platform-chips');
  const grid = document.getElementById('in-game-grid');
  const status = document.getElementById('in-game-status');
  const moreWrapper = document.getElementById('load-more-wrapper');
  if (!chips || !grid || !status || !moreWrapper) return;

  const visible = activePlatform
    ? inGameGalleries.filter(g => platformOf(g) === activePlatform)
    : inGameGalleries;
  const page = visible.slice(0, shownCount);

  chips.innerHTML = renderChips();
  grid.innerHTML = page.length > 0
    ? page.map((g, i) => renderGalleryCard(g, i, inGameSizesMap)).join('')
    : '<p class="empty-state">No galleries for this console yet.</p>';

  const remaining = visible.length - page.length;
  moreWrapper.innerHTML = remaining > 0
    ? `<button type="button" class="load-more" id="load-more">Load more (${remaining})</button>`
    : '';
  status.textContent = `Showing ${page.length} of ${visible.length} galleries`;
}

// Delegación: la rejilla y los chips se reescriben en cada repintado, así que
// escuchar en la sección evita tener que reenganchar handlers cada vez.
function initInGameControls() {
  const section = document.getElementById('in-game-section');
  if (!section) return;

  section.addEventListener('click', (e) => {
    const chip = e.target.closest('.platform-chip');
    if (chip) {
      const value = chip.dataset.platform || null;
      if (value === activePlatform) return;
      activePlatform = value;
      shownCount = PAGE_SIZE;
      // pushState: el botón atrás debe recorrer los filtros.
      syncUrl(true);
      renderInGameSection();
      return;
    }

    const more = e.target.closest('#load-more');
    if (more) {
      const previousCount = shownCount;
      shownCount += PAGE_SIZE;
      // replaceState: el botón atrás NO debe replegar la lista, sería
      // desconcertante volver a ver 10 tras haber pedido 20.
      syncUrl(false);
      renderInGameSection();
      focusCardAt(previousCount);
    }
  });

  window.addEventListener('popstate', () => {
    readUrlState();
    renderInGameSection();
  });
}

// Tras "Load more", el foco salta a la primera tarjeta nueva para que quien
// navega por teclado no acabe al principio de la lista otra vez. Las tarjetas
// son enlaces, así que ya son focusables.
function focusCardAt(index) {
  const cards = document.querySelectorAll('#in-game-grid .gallery-card');
  if (cards[index]) cards[index].focus();
}

function syncUrl(push) {
  const params = new URLSearchParams(window.location.search);
  if (activePlatform) params.set('platform', activePlatform);
  else params.delete('platform');
  if (shownCount > PAGE_SIZE) params.set('shown', String(shownCount));
  else params.delete('shown');

  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  const state = { platform: activePlatform, shown: shownCount };
  if (push) history.pushState(state, '', url);
  else history.replaceState(state, '', url);
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const platform = params.get('platform');
  // Un valor desconocido cae a "All" en vez de dejar la rejilla vacía.
  activePlatform = PLATFORM_ORDER.includes(platform) ? platform : null;
  const shown = parseInt(params.get('shown'), 10);
  shownCount = Number.isFinite(shown) && shown >= PAGE_SIZE ? shown : PAGE_SIZE;
}
```

- [ ] **Step 5: Añadir la insignia y topar el retardo en `renderGalleryCard`**

En `scripts/home.js`, sustituir `renderGalleryCard` entera por:

```js
function renderGalleryCard(gallery, index, sizesMap) {
  const layout = index % 2 === 0 ? 'horizontal-left' : 'horizontal-right';
  const rel = gallery.coverImage.replace(/^images\//, '');
  const attrs = imageAttrs(rel, sizesMap, '(max-width: 768px) 100vw, 50vw');
  // Se topa el retardo: con 22 tarjetas, index * 100ms daría 2,2 s de cascada
  // y al cambiar de filtro la sección se sentiría lenta.
  const delay = Math.min(index, 6) * 100;

  return `
    <a href="gallery.html?id=${esc(gallery.id)}" class="gallery-card fade-in-up" data-layout="${layout}" style="animation-delay: ${delay}ms">
      <div class="gallery-card__image-wrapper">
        <img class="gallery-card__image" ${attrs} alt="${esc(gallery.title)} cover image" loading="lazy">
      </div>
      <div class="gallery-card__info">
        <h3 class="gallery-card__title">${esc(gallery.title)}</h3>
        <p class="gallery-card__desc">${esc(gallery.description)}</p>
        ${platformBadge(gallery)}
      </div>
    </a>
  `;
}
```

- [ ] **Step 6: Estilar chips, botón y estado vacío**

Añadir al final de `styles/components.css`:

```css
/* ==========================================================================
   Console Filter Chips
   ========================================================================== */
.platform-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  max-width: 1200px;
  margin: 0 auto var(--space-md);
}

.platform-chip {
  font-family: var(--font-gaming);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  transition: color var(--transition-fast), background-color var(--transition-fast), border-color var(--transition-fast);
}

.platform-chip:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.platform-chip[aria-pressed="true"] {
  color: var(--color-bg);
  background-color: var(--color-text);
  border-color: var(--color-text);
}

.platform-chip__count {
  opacity: 0.6;
  margin-left: 0.35em;
}

.load-more-wrapper {
  display: flex;
  justify-content: center;
  margin-top: var(--space-md);
}

.load-more {
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text);
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-md);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.load-more:hover {
  background-color: var(--color-surface-hover);
  border-color: var(--color-text-muted);
}

.empty-state {
  color: var(--color-text-muted);
  font-style: italic;
  text-align: center;
  padding: var(--space-md);
}
```

- [ ] **Step 7: Arrancar el sitio**

Run: `npm start`
Expected: sirve en `http://localhost:8080`. Dejarlo corriendo.

- [ ] **Step 8: Verificar el corte y los chips**

Abrir `http://localhost:8080` y comprobar:

1. La sección In-Game muestra **10 tarjetas**, no 22.
2. Sobre la rejilla hay cuatro chips: `All 22`, `PS5 13`, `PS4 4`, `Switch 2 5`. **No** hay chip de Switch.
3. `All` está marcado y se ve destacado respecto a los demás.
4. Bajo la rejilla hay un botón `LOAD MORE (12)`.
5. La consola del navegador no muestra ningún error.

- [ ] **Step 9: Verificar el filtro y la URL**

1. Pulsar `PS4`: la rejilla muestra 4 tarjetas, no hay botón de "Load more", y la URL pasa a `?platform=ps4`.
2. Pulsar `All`: vuelven 10 tarjetas y la URL vuelve a quedar sin parámetros.
3. Pulsar `PS5`: 10 tarjetas y botón `LOAD MORE (3)`.
4. Pulsar el botón: 13 tarjetas y la URL es `?platform=ps5&shown=20`.
5. Pulsar atrás en el navegador: vuelve a `?platform=ps4` con sus 4 tarjetas. **No** debe volver a "PS5 con 10", que sería el `shown` desandándose.
6. Recargar con `?platform=switch-2` escrito a mano: 5 tarjetas y el chip `Switch 2` marcado.
7. Recargar con `?platform=xbox`: cae a `All` con 10 tarjetas, sin rejilla vacía ni error en consola.

- [ ] **Step 10: Verificar el layout alternado bajo filtro**

Con el chip `PS4` activo, comprobar en escritorio (ventana de más de 768 px) que las 4 tarjetas alternan imagen a izquierda y a derecha empezando por la izquierda. No debe haber dos seguidas con la imagen del mismo lado.

- [ ] **Step 11: Verificar el foco tras "Load more"**

Con `All` activo, pulsar `LOAD MORE` y comprobar con `document.activeElement` en la consola del navegador que el elemento enfocado es la tarjeta número 11, es decir la primera nueva:

```js
document.activeElement.getAttribute('href')
```

Expected: el `href` de la undécima galería, no el del `body` ni el del botón.

- [ ] **Step 12: Commit**

```bash
git add scripts/home.js styles/components.css
git commit -m "feat: filtro por consola y paginacion en la home

La seccion In-Game gana chips de consola que hacen de filtro y de
agrupacion, un corte en 10 galerias con boton de cargar mas, y estado en
la URL para que el filtro sobreviva a entrar en una galeria y volver.

El chip usa pushState para que el boton atras recorra los filtros, y
cargar mas usa replaceState para que atras no repliegue la lista.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Insignia en la vista de galería y decisión visual

Se coloca la insignia en la cabecera de `gallery.html` y se le da un estilo neutro deliberadamente provisional. **Esta tarea termina con una parada para que el usuario decida el aspecto definitivo.**

**Files:**
- Modify: `scripts/gallery.js` (import, bloque `.gallery-header`)
- Modify: `styles/components.css` (estilo de `.platform-badge`)

**Interfaces:**
- Consumes: `platformBadge` de la tarea 5.
- Produces: nada.

- [ ] **Step 1: Importar el helper en `gallery.js`**

En `scripts/gallery.js`, añadir tras los imports existentes:

```js
import { platformBadge } from './platforms.js';
```

- [ ] **Step 2: Añadir la insignia a la cabecera**

En `scripts/gallery.js`, dentro de `initGalleryPage`, en el bloque `.gallery-header`, sustituir:

```js
        <p>${esc(gallery.description)}</p>
```

por:

```js
        <p>${esc(gallery.description)}</p>
        ${platformBadge(gallery)}
```

- [ ] **Step 3: Dar a la insignia un estilo neutro provisional**

Añadir al final de `styles/components.css`:

```css
/* Insignia de consola.
   PROVISIONAL: el aspecto definitivo está pendiente de decisión. Este estilo
   es deliberadamente neutro y solo reserva el sitio y la jerarquía. El atributo
   data-platform ya está en el marcado, así que el diseño final puede
   diferenciar por consola sin tocar el JS. */
.platform-badge {
  display: inline-block;
  margin-top: var(--space-xs);
  font-family: var(--font-gaming);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.2em 0.6em;
}
```

- [ ] **Step 4: Verificar la insignia a mano**

Con `npm start` corriendo:

1. En la home, cada tarjeta in-game muestra su insignia bajo la descripción, y las de Photography (Italy, Japan, New York) **no** muestran ninguna.
2. Abrir `http://localhost:8080/gallery.html?id=astro-bot`: la cabecera muestra `PS5` bajo la descripción.
3. Abrir `http://localhost:8080/gallery.html?id=japan`: **no** hay insignia.
4. La insignia se lee bien en tema claro y en tema oscuro.

- [ ] **Step 5: Commit**

```bash
git add scripts/gallery.js styles/components.css
git commit -m "feat: mostrar la insignia de consola en la vista de galeria

El estilo de la insignia es provisional y neutro a proposito: el aspecto
definitivo esta pendiente de decidir. El marcado ya lleva data-platform,
asi que el diseno final se resuelve solo en CSS.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: PARADA. Pedir al usuario la decisión visual**

No inventar un diseño y darlo por bueno. Presentar al usuario al menos dos direcciones concretas para el aspecto de la insignia, recordando estos dos puntos ya establecidos en la especificación:

- Los logos oficiales de PlayStation y Nintendo son marcas registradas.
- El sitio ya carga `Silkscreen` como `--font-gaming`, lo que permite una insignia tipográfica sutil y coherente con la identidad existente.

Esperar la respuesta antes de tocar `.platform-badge` otra vez.

---

### Task 8: Verificación final y documentación

**Files:**
- Modify: `CLAUDE.md` (secciones "Data flow", "CMS" y "Things that break silently")

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: nada.

- [ ] **Step 1: Ejecutar la suite completa**

Run: `npm test`
Expected: PASS, sin fallos ni tests saltados.

- [ ] **Step 2: Verificar el ciclo completo de navegación**

Con `npm start` corriendo, en `http://localhost:8080`:

1. Pulsar `PS5`, pulsar `LOAD MORE`.
2. Entrar en una galería cualquiera.
3. Pulsar "Back to Home".
4. Comprobar que se vuelve con el chip `PS5` activo y las 13 tarjetas desplegadas, no con `All` y 10.

- [ ] **Step 3: Verificar en móvil**

Con las herramientas de desarrollo del navegador en una anchura de 375 px:

1. Los chips hacen wrap en varias líneas y ninguno se sale de la pantalla.
2. Las tarjetas quedan apiladas en vertical, como antes.
3. El botón `LOAD MORE` queda centrado y es cómodo de pulsar.

- [ ] **Step 4: Verificar los dos temas**

Alternar el tema con el botón de la cabecera y comprobar en ambos que el chip activo, los chips inactivos, el botón `LOAD MORE` y la insignia tienen contraste suficiente y no desaparecen contra el fondo.

- [ ] **Step 5: Verificar con `prefers-reduced-motion`**

En las herramientas de desarrollo, forzar `prefers-reduced-motion: reduce` y recargar. Comprobar que filtrar y cargar más siguen funcionando y que no aparece ninguna animación de entrada en las tarjetas.

- [ ] **Step 6: Verificar que el build no rompe nada**

Run: `npm run build && npm test && git diff --stat data/`
Expected: el build termina bien, los tests pasan, y `data/galleries.json` no cambia respecto al estado ya commiteado, porque el meta y el disco ya están sincronizados.

- [ ] **Step 7: Actualizar `CLAUDE.md`**

Hacer estos cuatro cambios en `CLAUDE.md`:

1. En "Data flow (the important part)", añadir `data/gallery-meta.json` como cuarto fichero de la lista, descrito como fuente de verdad editada a mano o desde el CMS para el orden de presentación, la categoría, la consola y una descripción opcional.
2. En esa misma sección, sustituir el párrafo que dice que `title`, `description` y `category` se derivan de las listas hardcodeadas de `getDescription`/`getCategory`, y la frase **"Adding a new real-world photography gallery requires adding its folder name to those two lists"**, por la regla nueva: `title` sigue derivándose de `formatTitle`, y `description`, `category` y `platform` salen de `gallery-meta.json`. Una carpeta ausente del meta cae a `in-game` sin consola y al final del orden.
3. En la sección del CMS, documentar que `/api/save` acepta también `meta`, validado con `validateMeta`, y que el drag and drop de la barra lateral persiste el orden en `gallery-meta.json`.
4. En "Things that break silently", añadir una entrada: el vocabulario de consolas está duplicado a propósito entre `scripts/lib/gallery-meta.js` (CommonJS, para build y CMS) y `scripts/platforms.js` (módulo ES, para el navegador), porque no hay bundler que cruce esa frontera. Añadir una consola exige tocar los dos ficheros.

- [ ] **Step 8: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: actualizar CLAUDE.md con gallery-meta.json

Documenta el fichero nuevo como fuente de verdad de orden, categoria y
consola, retira la regla obsoleta de las dos listas hardcodeadas de
build.js, y deja constancia de la duplicacion deliberada del vocabulario
de consolas entre el modulo CommonJS y el modulo ES.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
