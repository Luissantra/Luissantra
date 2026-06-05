# Patrones de Diseño y Arquitectura del Proyecto

Este documento describe los patrones de diseño, convenciones y decisiones arquitectónicas que sigue el proyecto "Photography Web Portfolio".

El proyecto es una aplicación frontend "vanilla" (sin frameworks pesados como React o Vue) diseñada para ser extremadamente rápida, accesible, fluida y fácil de mantener, complementada por herramientas locales de administración y optimización de recursos.

---

## 1. Arquitectura General y Estructura

*   **Separación de Responsabilidades (Separation of Concerns):** El proyecto mantiene una estricta separación entre el marcado (HTML), la presentación (CSS) y el comportamiento/lógica (JavaScript).
*   **Renderizado Dinámico del Lado del Cliente (CSR parcial):** El contenido principal de las galerías no está estático en el HTML. Se utiliza JavaScript para realizar una petición asíncrona (Fetch API) a un archivo JSON estático (`data/galleries.json`) y construir dinámicamente el DOM utilizando Template Literals. Esto facilita la adición de nuevo contenido sin tener que modificar múltiples archivos HTML.
*   **Enrutamiento Simple del Lado del Cliente:** Se utiliza una lógica sencilla basada en la URL (`window.location.pathname` y `URLSearchParams`) para determinar qué "vista" renderizar (Página de inicio vs. Vista de una galería específica como `gallery.html?id=favourites`).

---

## 2. Patrones CSS y Diseño

*   **Sistema de Diseño basado en Tokens (CSS Custom Properties):** Se utilizan variables CSS en el elemento `:root` para definir la paleta de colores, tipografía, espaciado, radios de borde y transiciones. Esto actúa como un sistema de diseño de fuente única de verdad, asegurando consistencia visual en toda la aplicación.
*   **Tematización (Theming) con Atributos de Datos:** El modo oscuro/claro se gestiona alternando un atributo de datos (`data-theme="dark"`) en el elemento `<html>`. Las variables CSS se redefinen bajo este selector para aplicar los colores del tema correspondiente de manera global y eficiente.
*   **Metodología BEM (Block Element Modifier) simplificada:** Para componentes complejos como las tarjetas de galería, se utiliza una convención de nomenclatura similar a BEM (ej. `gallery-card`, `gallery-card__image-wrapper`, `gallery-card__title`) para encapsular los estilos y evitar colisiones de especificidad.
*   **Clases de Utilidad (Utility Classes):** Se emplean clases reutilizables de un solo propósito para comportamientos comunes, como animaciones (`.fade-in-up`) o accesibilidad (`.visually-hidden`).
*   **Transiciones de Disposición Modernas (View Transitions API):** Al cambiar la visualización de la galería de favoritos (entre la disposición de mosaico fluido y la clásica cuadrícula de 3 columnas), se utiliza la API nativa `document.startViewTransition`. Esto permite al navegador animar automáticamente la transición de tamaño y posición de las imágenes sin necesidad de complejas librerías de animación de terceros.
*   **Efectos Scroll-Driven y Sticky:** El header principal utiliza posicionamiento pegajoso (`position: sticky`) y cambia su visibilidad dinámicamente mediante la adición de la clase `.is-hidden` cuando el usuario hace scroll hacia abajo, reapareciendo instantáneamente al desplazarse hacia arriba para maximizar el área de lectura en dispositivos móviles.

---

## 3. Patrones de JavaScript

*   **Patrón de Inicialización (Init Pattern):** El código está estructurado en funciones de inicialización discretas (`initTheme`, `initHeaderScroll`, `initHomePage`, `initGalleryPage`, `initLightbox`). Un único *event listener* `DOMContentLoaded` se encarga de llamar a las funciones correspondientes según la ruta actual.
*   **Programación Asíncrona:** Uso de `async` / `await` junto con la API `fetch` para la carga de datos no bloqueante, incluyendo un manejo robusto de errores (`try...catch`).
*   **Generación de UI con Template Literals:** El HTML dinámico se construye inyectando variables directamente en cadenas de texto multilínea (Template Literals) y luego asignándolas vía `innerHTML`.
*   **Prevención de Pérdidas de Memoria (Memory Leaks):**
    *   Al cambiar entre vistas o inicializar componentes cíclicos, se lleva un registro estricto del identificador de intervalos (`carouselIntervalId`). Este se cancela mediante `clearInterval` antes de iniciar una nueva instancia del carrusel de favoritos, evitando la acumulación de procesos en segundo plano.
    *   Los escuchadores de eventos sobre el objeto global `window` (como el evento `resize` para recalcular el mosaico) utilizan un `AbortController` para poder cancelar la escucha de eventos de manera limpia al destruir o reconstruir componentes.
*   **Algoritmo de Rotación de Favoritos:** El carrusel de la página de inicio selecciona imágenes aleatorias del archivo de configuración, pero utiliza una variable de estado (`lastFavIndex`) para garantizar que la nueva imagen elegida sea siempre diferente a la mostrada inmediatamente antes, evitando transiciones visuales repetitivas.

---

## 4. Rendimiento y APIs Web Modernas

*   **Uso de APIs Nativas (HTML5 `<dialog>`):** En lugar de depender de librerías externas de terceros o construir modales complejos desde cero con divs y scripts para el manejo del foco, el proyecto utiliza el elemento nativo `<dialog>` de HTML5 para el componente "Lightbox". Esto proporciona accesibilidad, gestión del foco y soporte para la tecla "Escape" por defecto.
*   **Optimización de Carga de Imágenes:**
    *   **Priorización de recursos:** Uso de `fetchpriority="high"` y `decoding="sync"` para la imagen Hero (Largest Contentful Paint - LCP).
    *   **Carga Diferida (Lazy Loading):** Uso del atributo nativo `loading="lazy"` para todas las imágenes fuera de pantalla.
*   **Optimización de Renderizado (Batching & Containment):**
    *   **Decoplamiento de Lectura y Escritura:** El cálculo dinámico del mosaico de fotos (`resizeAllGridItems`) agrupa las lecturas al DOM (`getBoundingClientRect` y obtención de gaps mediante `getComputedStyle`) en una primera fase. En una segunda fase, realiza todas las modificaciones de estilos (`gridRowEnd` e `containIntrinsicSize`), lo que evita por completo el bloqueo de renderizado provocado por el *layout thrashing* (reflows forzados).
    *   **Contención de Layout:** Implementación de `content-visibility: auto` y actualización dinámica de `contain-intrinsic-size` según la altura calculada de las imágenes. Esto permite al navegador omitir el renderizado y los cálculos de diseño de los elementos que se encuentran fuera del viewport, reduciendo drásticamente el tiempo de carga en galerías grandes.
*   **Respeto a Preferencias del Sistema (`prefers-reduced-motion`):** La lógica de JavaScript consulta activamente si el usuario tiene activas las restricciones de movimiento del sistema operativo a través del query de medios `(prefers-reduced-motion: reduce)`. Si está activo, el carrusel dinámico de favoritos se deshabilita para evitar molestias visuales.

---

## 5. Almacenamiento de Estado Local

*   **Persistencia de Preferencias:** Se utiliza `localStorage` para recordar la preferencia de tema (claro/oscuro) del usuario entre sesiones. Si no hay preferencia guardada, el sistema recurre a la preferencia del sistema operativo mediante la API `window.matchMedia('(prefers-color-scheme: dark)')`.
*   **Persistencia de Layouts:** La preferencia de visualización de la galería de favoritos (mosaico vs. lista clásica) puede persistir opcionalmente de forma similar para garantizar la consistencia en futuras visitas.

---

## 6. Arquitectura de Herramientas y Automatización

Para agilizar el flujo de trabajo sin sobrecargar el frontend de producción, el proyecto incorpora herramientas de administración locales:

### A. Panel de Administración CMS (`admin-server.js`)
Servidor local en Node.js desarrollado con Express para gestionar el portfolio:
*   **API REST:** Rutas para leer/guardar configuraciones en `galleries.json` y `favourites.json`, cargar imágenes en caliente, eliminar archivos físicos del disco y configurar portadas de galerías.
*   **Procesamiento de Archivos:** Implementa `multer` para la carga segura y organizada de imágenes directamente a la carpeta de la galería seleccionada.
*   **Integración Drag & Drop:** Utiliza `SortableJS` en el frontend del CMS para reordenar las fotos interactivamente. Al soltar la imagen, el orden se guarda asíncronamente en los archivos JSON de datos.
*   **Disparador de Build:** Expone un endpoint `/api/build` que ejecuta el script `build.js` en un subproceso de Node (`child_process.spawn`) devolviendo el log de consola en tiempo real al navegador.

### B. Herramienta de Reordenación Estática (`tools/reorder.html`)
Una alternativa sin backend que aprovecha la API nativa de navegadores modernos **File System Access API** (`window.showDirectoryPicker`):
*   Permite al usuario seleccionar el directorio local `data/` con permisos de lectura/escritura y manipular interactivamente el orden de las imágenes a través de `SortableJS` escribiendo directamente el nuevo JSON al disco local desde el sandbox del navegador.

### C. Automatización del Build (`scripts/build.js`)
Script en Node.js que utiliza la librería de procesamiento de alto rendimiento `sharp` para:
1.  Escanear las carpetas físicas dentro de `images/`.
2.  Optimizar y comprimir imágenes originales al formato de última generación **WebP**.
3.  Generar miniaturas de carga rápida prefijadas con `thumb_`.
4.  Mover los originales a la carpeta `originals/` como respaldo para evitar inflar el tamaño de la web desplegada.
5.  Actualizar y sincronizar automáticamente la base de datos estática `data/galleries.json`.

### D. Normalizador de Nombres (`tools/rename.py`)
Script en Python de utilidad que automatiza la nomenclatura de los archivos de imagen:
*   Normaliza los nombres de archivo bajo el esquema `{id_galeria}-{secuencial:02d}.webp` (ej. `japon-01.webp`, `japon-02.webp`) y `{id_galeria}-caratula.webp` para la foto de portada.
*   Actualiza simultáneamente los nombres correspondientes en las carpetas de imágenes optimizadas (`images/`), originales (`originals/`), miniaturas y las referencias dentro de `data/galleries.json`.
