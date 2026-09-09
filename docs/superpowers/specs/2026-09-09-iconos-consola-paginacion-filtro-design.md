# Iconos de consola, paginación y filtro en la home

Fecha: 2026-09-09

## Problema

La home muestra hoy las 22 galerías de In-Game de golpe, cada una como una tarjeta banner horizontal a ancho completo.
El resultado es un scroll muy largo y sin jerarquía, en el que una galería de 2 fotos ocupa lo mismo que una de 48.
Además, el sitio no indica en ninguna parte en qué consola se capturó cada juego, que es un dato que el visitante no puede deducir y que da contexto real a una galería de fotografía in-game.

## Objetivos

1. Marcar de forma sutil la consola de cada galería in-game, con granularidad de generación.
2. Reducir la saturación de la home mostrando 10 galerías por defecto y el resto bajo demanda.
3. Permitir filtrar las galerías in-game por consola.

Los objetivos 2 y 3 se resuelven con una única pieza de interfaz: una barra de chips de consola que actúa a la vez como filtro y como agrupación, sobre una lista con corte en 10 y botón de "Cargar más".
No se introduce un nivel extra de navegación tipo carpeta modal, porque escondería galerías detrás de un segundo clic y rompería el enlace directo.

## Contexto técnico que condiciona el diseño

`data/galleries.json` es salida generada.
`scripts/build.js` reescribe `title`, `description` y `category` en cada build a partir de listas hardcodeadas en `getDescription` y `getCategory`, de modo que cualquier campo nuevo se perdería en el siguiente `npm run build` si no tiene una fuente persistente.

Existe además un bug latente relacionado.
El CMS ya permite reordenar galerías por drag and drop en la barra lateral y guarda ese orden en `galleries.json`, pero `build.js` reconstruye el array recorriendo `images/` con `fs.readdir`, así que el orden manual se destruye en el siguiente build.
Hoy no se nota porque el orden no significa nada visualmente.
En cuanto las 10 primeras galerías sean el escaparate de la home, pasa a ser crítico, así que este diseño lo arregla.

## Modelo de datos

### `data/gallery-meta.json` (nuevo)

Fichero editado a mano o desde el CMS, fuente de verdad para el orden y los metadatos por galería.

```json
[
  { "id": "japan",      "category": "photography" },
  { "id": "italy",      "category": "photography" },
  { "id": "astro-bot",  "category": "in-game", "platform": "ps5" },
  { "id": "dk-bananza", "category": "in-game", "platform": "switch-2" }
]
```

Reglas:

- El orden del array es el orden de presentación en la home, dentro de cada sección de categoría.
- `category` es obligatorio y vale `photography` o `in-game`.
- `platform` es opcional y solo tiene sentido en galerías in-game.
  Valores permitidos: `ps4`, `ps5`, `switch`, `switch-2`.
  Una galería tiene como mucho una consola.
- `description` es opcional y sobrescribe el texto derivado.
  Si falta, se deriva de la categoría igual que hoy.
- Una carpeta presente en `images/` pero ausente del fichero sigue funcionando: cae a `in-game`, sin consola, y se ordena al final por orden alfabético.
- `favourites` no aparece nunca en este fichero.
  Es una galería sintética que `build.js` antepone, no una carpeta de `images/`, y el CMS ya la excluye del drag and drop.
  Una entrada con ese id se rechaza en validación.

Se deja `switch` en el conjunto de valores válidos aunque hoy ninguna galería lo use, porque el coste es cero y los chips solo se dibujan para las consolas con galerías reales.

### Semilla inicial

Las galerías de Nintendo van todas a `switch-2`, incluidas Mario Odyssey, Zelda BotW y Zelda TotK, porque se jugaron en Switch 2 por retrocompatibilidad.

Valores ciertos por exclusividad o por confirmación directa (13):

| Galería | Consola |
| --- | --- |
| astro-bot | ps5 |
| demons-souls | ps5 |
| ratchet-clank-rift-apart | ps5 |
| marvel-spider-man-2 | ps5 |
| mgs-snake-eater | ps5 |
| clair-obscur | ps5 |
| alan-wake-2 | ps5 |
| the-last-guardian | ps4 |
| dk-bananza | switch-2 |
| mario-kart-world | switch-2 |
| mario-odyssey | switch-2 |
| zelda-botw | switch-2 |
| zelda-totk | switch-2 |

Valores sembrados como estimación, a verificar en el CMS (9):

| Galería | Estimación |
| --- | --- |
| ciberpunk-2077 | ps5 |
| dredge | ps5 |
| elden-ring | ps5 |
| ghost-of-tsushima | ps5 |
| gow-ragnarok | ps5 |
| spider-man-miles-morales | ps5 |
| red-dead-redemption-2 | ps4 |
| sekiro | ps4 |
| the-last-of-us-2 | ps4 |

Con esta semilla los contadores quedan en PS5 13, PS4 4 y Switch 2 5.
Corregir cualquiera de las 9 estimaciones desde el CMS recalcula los contadores solo.

## Arquitectura

### `scripts/lib/gallery-meta.js` (nuevo)

Módulo CommonJS con la lógica pura de metadatos, siguiendo el patrón ya establecido por `variants.js` e `image-sizes.js`.
Mantiene `build.js` fino y hace la lógica testeable con `node --test`.

Responsabilidades:

- Leer y parsear `gallery-meta.json`, tolerando su ausencia.
- Validar la forma: ids válidos según `safeSegment`, categorías conocidas, consolas dentro del conjunto permitido.
- Exponer la resolución de metadatos por id, con los valores por defecto descritos arriba.
- Exponer la ordenación de un array de galerías según el índice del meta, con las no registradas al final por orden alfabético.

### `scripts/build.js`

- `getDescription` y `getCategory` desaparecen y se sustituyen por consultas al meta.
- Tras recorrer las carpetas, el array de galerías se ordena con el helper antes de escribir.
- `platform` se emite en `galleries.json` cuando existe.
- `favourites` se sigue anteponiendo después de la ordenación, así que continúa siendo la primera entrada.

### CMS: `admin-server.js` y `tools/admin/`

- `/api/data` devuelve también el contenido de `gallery-meta.json`.
- `/api/save` acepta una clave `meta` nueva en el cuerpo, junto a las ya existentes `galleries` y `favourites`.
  Escribe `gallery-meta.json` y `galleries.json` dentro de la misma tarea de `dbQueue`, validando los tres bloques por completo antes de escribir ninguno.
  Un error en cualquiera de los dos rechaza la petición entera sin dejar escritura parcial, igual que hace hoy con galerías y favoritos.
- El drag and drop de la barra lateral no cambia de comportamiento visible, pero ahora persiste de verdad porque el orden viaja a `gallery-meta.json`.
- Nuevo `select` de consola en la cabecera principal, visible solo cuando la galería seleccionada es in-game.
  Opciones: ninguna, PS4, PS5, Switch, Switch 2.
- Validación en servidor: la consola debe pertenecer al conjunto permitido.
  Un valor desconocido rechaza la petición.

### `scripts/home.js`

La sección In-Game gana una barra de chips bajo el título, con los contadores calculados a partir de los datos.
El orden de los chips es fijo: Todos, PS5, PS4, Switch 2, Switch.
Solo se dibujan los chips de consolas con al menos una galería.

Comportamiento de la lista:

- El corte de 10 se aplica siempre, haya filtro activo o no.
  "Cargar más" revela 10 galerías adicionales.
  Un único camino de código y un modelo mental predecible.
- Al cambiar de chip solo se vuelve a renderizar la rejilla de In-Game.
  Las secciones Featured y Photography no se tocan.
- La alternancia `horizontal-left` y `horizontal-right` y el `animation-delay` se recalculan sobre el subconjunto visible, de modo que un filtro nunca deja dos tarjetas seguidas con el mismo layout.
- El `animation-delay` pasa de `index * 100ms` a `Math.min(index, 6) * 100ms`.
  Con 22 tarjetas la fórmula actual daría 2,2 segundos de cascada y al filtrar se sentiría lento.

### Estado en la URL

- Cambio de chip: `history.pushState` con `?platform=ps5`, de forma que el botón atrás recorre los filtros.
- "Cargar más": `history.replaceState` con `&shown=20`, de forma que atrás no repliega la lista, que sería desconcertante.
- Al arrancar se leen ambos parámetros.
- Un valor de consola desconocido cae silenciosamente a "Todos" en lugar de dejar la rejilla vacía.

Esto también resuelve la pérdida de contexto al volver desde una galería con "Back to Home", que hoy renderiza la home desde cero.

### Insignia

Un `span` con clase `platform-badge` y atributo `data-platform`, situado en el bloque de info de la tarjeta en la home y junto al título en `gallery.html`.

El aspecto visual de la insignia queda pendiente de decidir y se resolverá antes de implementar esa parte.
Este diseño reserva el hueco, la clase y el punto de inserción.
Se ha señalado que los logos oficiales de PlayStation y Nintendo son marcas registradas, y que una insignia tipográfica apoyada en la fuente `Silkscreen` que ya usa el sitio es una alternativa más sutil y más coherente con la identidad existente.

## Seguridad y escapado

`platform` llega de `galleries.json`, que según el CLAUDE.md es entrada no confiable porque puede provenir de `POST /api/save`.
El valor se valida contra el conjunto permitido antes de renderizar, y lo que no se reconozca se trata como "sin consola".
Esto es más fuerte que aplicar solo `esc()`, y es necesario porque el valor acaba en un atributo `data-` y en un selector CSS.
El resto de valores interpolados sigue pasando por `esc()` según la convención del proyecto.

## Accesibilidad

- Los chips son elementos `button` reales dentro de un `role="group"` con `aria-label`.
  El chip activo lleva `aria-pressed="true"`.
- Tras pulsar "Cargar más", el foco salta a la primera tarjeta nueva, para que quien navega por teclado no vuelva al principio de la lista.
- Una región `aria-live="polite"` anuncia el estado, por ejemplo "Showing 20 of 22".
- Si un filtro diera cero resultados, se muestra un mensaje corto en lugar de una rejilla vacía.
- El copy visible es en inglés, según la convención del proyecto.

## Verificación

Tests automáticos nuevos sobre `scripts/lib/gallery-meta.js` con `node --test`:

- Resolución del orden a partir del índice del meta.
- Carpetas no registradas en el meta: categoría por defecto y colocación al final.
- Rechazo de una consola fuera del conjunto permitido.
- Fallback de `description` cuando no hay override.

Verificación manual:

- Home en tema claro y oscuro.
- Móvil y escritorio.
- Con `prefers-reduced-motion` activo.
- Ciclo completo de filtro, "Cargar más", entrar en una galería y volver atrás.
- Un `npm run build` después de reordenar en el CMS, comprobando que el orden sobrevive.

## Fuera de alcance

- Insignia de cámara u objetivo para las galerías de Photography.
  Es otro eje de información y solo hay 3 galerías, que no necesitan filtro.
- Consola por foto.
  Obligaría a etiquetar más de 400 fotos a mano para un dato que al visitante le importa a nivel de juego.
- El lightbox, que no se toca.
- Filtro en la sección Photography.
