# Patrones de Diseño y Arquitectura del Proyecto

Este documento describe los patrones de diseño, convenciones y decisiones arquitectónicas que sigue el proyecto «Photography Web Portfolio».

El proyecto es una aplicación frontend **vanilla** (sin frameworks pesados como React o Vue) diseñada para ser extremadamente rápida, accesible, fluida y fácil de mantener, complementada por herramientas locales de administración y optimización de recursos.

---

## 1. Arquitectura General y Estructura

*   **Separación de Responsabilidades (Separation of Concerns):** El proyecto mantiene una estricta separación entre el marcado (HTML), la presentación (CSS) y el comportamiento/lógica (JavaScript).
*   **Renderizado Dinámico del Lado del Cliente (CSR parcial):** El contenido principal de las galerías no está estático en el HTML. Se utiliza JavaScript para realizar una petición asíncrona (Fetch API) a un archivo JSON estático (`data/galleries.json`) y construir dinámicamente el DOM utilizando Template Literals. Esto facilita la adición de nuevo contenido sin tener que modificar múltiples archivos HTML.
*   **Enrutamiento Simple del Lado del Cliente:** Se utiliza una lógica sencilla basada en la URL (`window.location.pathname` y `URLSearchParams`) para determinar qué «vista» renderizar (página de inicio vs. vista de una galería específica como `gallery.html?id=favourites`).

---

## 2. Patrones CSS y Diseño

*   **Sistema de Diseño basado en Tokens (CSS Custom Properties):** Se utilizan variables CSS en el elemento `:root` para definir la paleta de colores, tipografía, espaciado, radios de borde y transiciones. Esto actúa como un sistema de diseño de fuente única de verdad, asegurando consistencia visual en toda la aplicación.
*   **Tematización (Theming) con Atributos de Datos:** El modo oscuro/claro se gestiona alternando un atributo de datos (`data-theme="dark"`) en el elemento `<html>`. Las variables CSS se redefinen bajo este selector para aplicar los colores del tema correspondiente de manera global y eficiente.
*   **Metodología BEM (Block Element Modifier) simplificada:** Para componentes complejos como las tarjetas de galería, se utiliza una convención de nomenclatura similar a BEM (ej. `gallery-card`, `gallery-card__image-wrapper`, `gallery-card__title`) para encapsular los estilos y evitar colisiones de especificidad.
*   **Clases de Utilidad (Utility Classes):** Se emplean clases reutilizables de un solo propósito para comportamientos comunes, como animaciones (`.fade-in-up`) o accesibilidad (`.visually-hidden`).
*   **Animaciones Scroll-Driven Nativas (`animation-timeline: view()`):** La aparición de las tarjetas de galería y los items del mosaico al entrar en el viewport se gestiona con `animation-timeline: view()` y `animation-range: entry`. Estas animaciones se activan mediante la clase `scroll-animations-enabled` en `<html>`, que solo se añade vía JS si el usuario no tiene activada la opción de reducir movimiento (`prefers-reduced-motion`). Se implementan dentro de un `@supports` para compatibilidad progresiva.
*   **Transiciones de Disposición Modernas (View Transitions API):** Al cambiar la visualización de la galería de favoritos (entre la disposición de mosaico fluido y la clásica cuadrícula de 3 columnas), se utiliza la API nativa `document.startViewTransition`. Esto permite al navegador animar automáticamente la transición de tamaño y posición de las imágenes sin necesidad de complejas librerías de animación de terceros.
*   **Animación de Cambio de Icono de Tema:** El botón de alternancia de tema claro/oscuro utiliza un sistema de animaciones CSS por fases (`theme-icon-exit` / `theme-icon-enter`) gestionado por clases (`is-exiting`, `is-entering`) y escuchadores de evento `animationend` en JS. El icono (luna/sol) se intercambia durante la fase de salida para garantizar una transición suave sin parpadeos.
*   **Efectos Scroll-Driven y Sticky:** El header principal utiliza posicionamiento pegajoso (`position: sticky`) y cambia su visibilidad dinámicamente mediante la adición de la clase `.is-hidden` cuando el usuario hace scroll hacia abajo, reapareciendo instantáneamente al desplazarse hacia arriba para maximizar el área de lectura en dispositivos móviles.
*   **Glassmorphism en Elementos Fijos:** El header principal y los títulos de sección utilizan `backdrop-filter: blur() saturate()` para crear un efecto de cristal esmerilado sobre el contenido que se desplaza por detrás, manteniendo la legibilidad sin ocultar la imagen de fondo.

---

## 3. Patrones de JavaScript

*   **Patrón de Inicialización (Init Pattern):** El código está estructurado en funciones de inicialización discretas (`initTheme`, `initScrollAnimations`, `initHeaderScroll`, `initHomePage`, `initGalleryPage`, `initLightbox`). Dos *event listeners* `DOMContentLoaded` se encargan de llamar a las funciones correspondientes según la ruta actual.
*   **Módulo IIFE para GalleryManager:** Toda la lógica de la página de galería (incluyendo el lightbox, el mosaico y la navegación de imágenes) está encapsulada en un módulo IIFE (`GalleryManager`), que expone únicamente el método `initGalleryPage` como API pública. Esto previene la contaminación del espacio global de nombres.
*   **Programación Asíncrona:** Uso de `async` / `await` junto con la API `fetch` para la carga de datos no bloqueante, incluyendo un manejo robusto de errores (`try...catch`).
*   **Limpieza y Modularidad de Archivos:** Se emplean exclusivamente archivos con extensión `.js` referenciados como módulos en el HTML (`<script type="module">`), habiéndose eliminado por completo la duplicidad de archivos con extensiones redundantes (`.mjs`) para reducir el ruido.
*   **Generación de UI con Template Literals:** El HTML dinámico se construye inyectando variables directamente en cadenas de texto multilínea (Template Literals) y luego asignándolas vía `innerHTML`.
*   **Prevención de Pérdidas de Memoria (Memory Leaks):**
    *   Al cambiar entre vistas o inicializar componentes cíclicos, se lleva un registro estricto del identificador de intervalos (`carouselIntervalId`). Este se cancela mediante `clearInterval` antes de iniciar una nueva instancia del carrusel de favoritos, evitando la acumulación de procesos en segundo plano.
    *   Los escuchadores de eventos sobre el objeto global `window` (como el evento `resize` para recalcular el mosaico) utilizan un `AbortController` para poder cancelar la escucha de eventos de manera limpia al destruir o reconstruir componentes.
    *   Los event listeners de carga de imágenes (en el carrusel y el lightbox) se eliminan explícitamente (`removeEventListener`) inmediatamente después de dispararse (`{ once: true }` donde aplica) para evitar referencias colgantes.
*   **Algoritmo de Rotación de Favoritos:** El carrusel de la página de inicio selecciona imágenes aleatorias del archivo de configuración, pero utiliza una variable de estado (`lastFavIndex`) para garantizar que la nueva imagen elegida sea siempre diferente a la mostrada inmediatamente antes, evitando transiciones visuales repetitivas.
*   **Crossfade del Lightbox:** Al navegar entre imágenes con el lightbox abierto, se precarga la imagen siguiente en un objeto `Image()` temporal. Solo tras confirmar su carga (o un error) se intercambia el `src` del elemento visible, evitando parpadeos o imágenes rotas.
*   **Precarga de Imágenes Adyacentes:** Al abrir el lightbox, se precargan las imágenes anterior y siguiente de la secuencia, reduciendo la latencia percibida al navegar.
*   **Navegación de Secciones por Teclado (j/k):** En la página de inicio, las teclas `j` / `k` permiten saltar entre las secciones (anchors). La lógica determina la sección activa comparando la posición de cada anchor con el scroll actual y se ignora si el lightbox está abierto o si el foco está en un input.
*   **`isNavigating` Flag:** Un flag global `isNavigating` previene que el efecto scroll-down de ocultamiento del header se active durante el scroll programático provocado por los anchor links o el hash de la URL, evitando que el header se oculte durante esas navegaciones.

---

## 4. Rendimiento y APIs Web Modernas

*   **Uso de APIs Nativas (HTML5 `<dialog>`):** En lugar de depender de librerías externas de terceros o construir modales complejos desde cero con divs y scripts para el manejo del foco, el proyecto utiliza el elemento nativo `<dialog>` de HTML5 para el componente «Lightbox». Esto proporciona accesibilidad, gestión del foco y soporte para la tecla «Escape» por defecto. Se incluye también soporte para `closedBy` (API moderna de light-dismiss) con un fallback manual para navegadores que aún no la implementan.
*   **Optimización de Carga de Imágenes:**
    *   **Priorización de recursos:** Uso de `fetchpriority="high"` y `decoding="sync"` para la imagen Hero (Largest Contentful Paint - LCP).
    *   **Carga Diferida (Lazy Loading):** Uso del atributo nativo `loading="lazy"` para todas las imágenes fuera de pantalla.
*   **Optimización de Renderizado (Batching & Containment):**
    *   **Desacoplamiento de Lectura y Escritura:** El cálculo dinámico del mosaico de fotos (`resizeAllGridItems`) agrupa las lecturas al DOM (`getBoundingClientRect` y obtención de gaps mediante `getComputedStyle`) en una primera fase. En una segunda fase, realiza todas las modificaciones de estilos (`gridRowEnd` e `containIntrinsicSize`), lo que evita por completo el bloqueo de renderizado provocado por el *layout thrashing* (reflows forzados).
    *   **Contención de Layout:** Implementación de `content-visibility: auto` y actualización dinámica de `contain-intrinsic-size` según la altura calculada de las imágenes. Esto permite al navegador omitir el renderizado y los cálculos de diseño de los elementos que se encuentran fuera del viewport, reduciendo drásticamente el tiempo de carga en galerías grandes.
    *   **Debounce del Resize:** El listener de `window.resize` para recalcular el mosaico se envuelve en un `setTimeout` de 150ms para evitar recalcular el layout en cada frame durante el redimensionado de la ventana.
    *   **Carga Progresiva del Mosaico:** En la galería de Favourites, cada imagen dispara un `resizeAllGridItems` al cargarse. Un timeout de seguridad de 3 segundos fuerza el cálculo final para imágenes que no hayan disparado su evento de carga (por error o caché).
*   **Ratio de Aspecto Dinámico:** El algoritmo de mosaico calcula el ratio de aspecto de cada imagen usando `naturalWidth`/`naturalHeight`. Si la imagen no está cargada, recurre secuencialmente a los atributos `width`/`height` del HTML, al `aspect-ratio` de CSS computado, y como último fallback usa una proporción vertical estándar (2/3).
*   **Respeto a Preferencias del Sistema (`prefers-reduced-motion`):** La lógica de JavaScript consulta activamente si el usuario tiene activas las restricciones de movimiento del sistema operativo a través del query de medios `(prefers-reduced-motion: reduce)`. Si está activo, el carrusel dinámico de favoritos se deshabilita y las animaciones scroll-driven no se habilitan.

---

## 5. Almacenamiento de Estado Local

*   **Persistencia de Preferencias:** Se utiliza `localStorage` para recordar la preferencia de tema (claro/oscuro) del usuario entre sesiones. Si no hay preferencia guardada, el sistema recurre a la preferencia del sistema operativo mediante la API `window.matchMedia('(prefers-color-scheme: dark)')`.

---

## 6. Arquitectura de Herramientas y Automatización

Para agilizar el flujo de trabajo sin sobrecargar el frontend de producción, el proyecto incorpora herramientas de administración locales:

### A. Panel de Administración CMS (`admin-server.js` + `tools/admin/`)

Servidor local en Node.js (Express) para gestionar el portfolio visualmente. Se inicia con `npm run admin` y se accede en `http://localhost:3030/admin`. El frontend del panel está modularizado de forma limpia en `index.html` (estructura HTML pura), `admin.css` (estilos) y `admin.js` (lógica) dentro del directorio `tools/admin/`.

*   **API REST:** Rutas para leer/guardar configuraciones en `galleries.json` y `favourites.json`, cargar imágenes en caliente, eliminar archivos físicos del disco y configurar portadas de galerías.
*   **Procesamiento de Archivos:** Implementa `multer` para la carga segura y organizada de imágenes directamente a la carpeta de la galería seleccionada.
*   **Reordenación Drag & Drop (SortableJS):** Tanto las galerías en la barra lateral como las imágenes dentro de cada galería son reordenables mediante drag & drop con SortableJS. La galería de Favourites está bloqueada de ser reordenada en la barra lateral. Al soltar, el orden se guarda asíncronamente en los archivos JSON.
*   **Integridad de Datos (AsyncQueue / Mutex):** Todas las operaciones de escritura y modificación sobre los archivos JSON estáticos de base de datos están protegidas en el backend por una cola asíncrona. Esto garantiza que múltiples pulsaciones rápidas del usuario (ej. eliminar varias fotos o añadir muchos favoritos de golpe) no corrompan los archivos JSON por condiciones de carrera (race conditions).
*   **Actualización Optimista de Favoritos:** Al pulsar el botón de corazón para añadir/quitar una imagen de favoritos, la UI se actualiza de forma inmediata (sin esperar la respuesta del servidor). Si la petición falla, se revierte el estado de la UI y del `apiData` local.
*   **Indicador Visual de Favoritos:** Las imágenes que ya pertenecen a la galería de Favourites muestran un badge rojo con el icono ❤ en la esquina superior derecha de la tarjeta, independientemente de si están dentro de la galería de favoritos o en otra galería.
*   **Disparador de Build:** Expone un endpoint `/api/build` que ejecuta el script `build.js` en un subproceso de Node (`child_process.spawn`) devolviendo el log de consola en tiempo real al navegador.

### B. Automatización del Build (`scripts/build.js`)

Script en Node.js que utiliza la librería de procesamiento de alto rendimiento `sharp` para:
1.  Escanear las carpetas físicas dentro de `images/`.
2.  Optimizar y comprimir imágenes originales al formato de última generación **WebP**. El proceso está altamente paralelizado mediante un limitador de concurrencia (`limitConcurrency`) y `Promise.all()`, lo que acelera masivamente el tiempo de compilación reduciendo cuellos de botella secuenciales.
3.  Generar miniaturas de carga rápida prefijadas con `thumb_`.
4.  Mover los originales a la carpeta `originals/` como respaldo para evitar inflar el tamaño de la web desplegada.
5.  Actualizar y sincronizar automáticamente la base de datos estática `data/galleries.json`.

---

## 7. Convenciones de Nomenclatura y Formato de Datos

*   **Imágenes de galerías:** `{gallery-id}/{filename}.webp` (ej. `japon/japon-01.webp`)
*   **Miniaturas:** `{gallery-id}/thumb_{filename}.webp`
*   **Portadas:** El campo `coverImage` en `galleries.json` contiene la ruta completa relativa desde la raíz del proyecto (ej. `images/japon/japon-caratula.webp`).
*   **Favoritos:** El array `images` de la galería `favourites` en `galleries.json` y el archivo `favourites.json` contienen rutas relativas al directorio `images/` (ej. `japon/japon-03.webp`). El CMS almacena los favoritos como strings simples o como objetos `{ src, featured }`.
