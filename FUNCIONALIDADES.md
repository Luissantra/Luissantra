# Guía Completa de Funcionalidades del Portafolio Fotográfico

Este documento detalla todas las funcionalidades del portafolio web de **Luissantra**, dividiéndolo en la experiencia de la **Página Pública** para los visitantes y las **Herramientas de Administración** utilizadas por el creador del portafolio.

---

## 1. Sitio Web Público (Portfolio de Fotografías)

El portfolio consta de dos vistas principales (`index.html` y `gallery.html`) y está enfocado en ofrecer una experiencia visual premium, de carga ultrarrápida, fluida y con un diseño interactivo moderno.

### A. Página de Inicio (Home — `index.html`)

*   **Carga Dinámica de Contenidos:** Toda la información de las galerías se lee del archivo estático `data/galleries.json` y se renderiza en tiempo de ejecución. No requiere base de datos activa.
*   **Clasificación por Categorías:** Las galerías se dividen automáticamente en dos categorías visualmente diferenciadas:
    *   *Photography:* Fotografías reales y artísticas.
    *   *In-Game Photography:* Capturas de pantalla artísticas y detalladas de videojuegos (con tipografía especial retro/arcade).
*   **Sección de Destacados (Carrusel de Favoritos):**
    *   Muestra un banner horizontal grande que enlaza a la galería especial de Favoritos.
    *   **Rotación Inteligente de Portada:** La imagen de fondo de esta tarjeta rota de manera aleatoria cada 5 segundos con una transición de opacidad suave.
    *   **Lógica de No Repetición:** El algoritmo JavaScript asegura que la nueva imagen seleccionada al azar nunca sea idéntica a la mostrada inmediatamente antes, evitando transiciones visuales repetitivas.
    *   **Soporte de Accesibilidad:** Si el sistema operativo del usuario tiene configurada la opción de reducir animaciones, el carrusel dinámico se detiene automáticamente respetando la consulta de medios `(prefers-reduced-motion: reduce)`.
*   **Menú de Navegación Scroll-Driven:** El encabezado del sitio (`.site-header`) es pegajoso y dinámico. Al hacer scroll hacia abajo más de 100px, se oculta suavemente con una transición CSS; al hacer cualquier scroll hacia arriba, vuelve a aparecer. Si el usuario hace clic en los enlaces de navegación rápida de la página de inicio, un flag `isNavigating` previene que el menú se oculte durante el scroll suave programático.
*   **Tarjetas de Galería Interactivas:** Las tarjetas responden al cursor con un zoom suave de la imagen de fondo y un subrayado animado expansivo en el título de la galería (expand desde la derecha al izquierda al hacer hover, con transición de `transform-origin`).
*   **Animaciones de Entrada por Scroll:** Las tarjetas de galería y los títulos de sección se revelan suavemente al entrar en el viewport mediante animaciones `scroll-driven` nativas (`animation-timeline: view()`), sin JavaScript adicional.
*   **Navegación por Teclado (j/k):** Las teclas `j` / `k` permiten saltar entre las secciones de la página de inicio (Featured → Photography → In-Game) sin necesidad de ratón.

### B. Vista de Galería Individual (`gallery.html`)

*   **Enrutamiento por Parámetros:** Mediante parámetros de búsqueda (`gallery.html?id=viaje-japon`) se carga dinámicamente la galería seleccionada, modificando el título de la pestaña del navegador automáticamente para optimizar el SEO.
*   **Layout de Mosaico Adaptativo (Masonry Grid):**
    *   Las fotos se disponen en columnas dinámicas de altura variable inspiradas en Pinterest.
    *   El diseño es totalmente responsivo: 3 columnas en escritorio, 2 en tablet (≤1024px), 1 columna en móvil (≤600px).
    *   Las imágenes horizontales o destacadas (marcadas como `featured: true` en el JSON) pueden ocupar 2 columnas (`photo-item--wide`, `photo-item--featured`) para dar dinamismo visual.
    *   El mosaico se recalcula automáticamente al cargar cada imagen y al redimensionar la ventana (con debounce de 150ms).
*   **Alternancia de Disposición (Layout Toggle) — Galería de Favourites:**
    *   El usuario puede cambiar la visualización entre el «Mosaico Dinámico» y la «Cuadrícula Clásica de 3 Columnas» mediante un botón.
    *   **Integración de View Transitions API:** Al presionar el botón de cambio de disposición, las imágenes se reorganizan flotando de manera fluida y suave gracias a esta API nativa. Si la API no está disponible, el cambio ocurre instantáneamente sin error.
    *   **Accesibilidad (ARIA):** El botón actualiza dinámicamente el estado `aria-pressed` para informar correctamente a lectores de pantalla de la disposición seleccionada.
*   **Estados de Carga Progresivos:** Las fotos muestran un fondo de color mientras se cargan (clase `is-loading`) y se revelan con una transición de opacidad (`fade-in`) una vez descargadas (clase `is-loaded`). Un timeout de seguridad de 3 segundos fuerza el estado cargado para imágenes que no disparen su evento load.
*   **Visualizador en Pantalla Completa (Lightbox):**
    *   Al hacer clic en cualquier foto, se abre un visualizador de pantalla completa con la foto ampliada.
    *   **Basado en `<dialog>` Nativo:** Implementa la etiqueta HTML5 `<dialog>`, asegurando que el foco del teclado quede atrapado dentro del modal y permitiendo cerrar la vista presionando `Escape` sin código de control manual.
    *   **Controles de Navegación:** El visualizador incluye botones en pantalla para avanzar y retroceder de foto, y responde a eventos de teclado (flecha izquierda y derecha). La navegación es cíclica (al llegar al último, vuelve al primero y viceversa).
    *   **Crossfade entre Imágenes:** Al navegar con el lightbox abierto, la imagen actual se desvanece mientras la siguiente se precarga en un objeto `Image` temporal. Solo cuando está lista se intercambia visualmente, evitando parpadeos.
    *   **Precarga de Imágenes Adyacentes:** Al abrir o navegar el lightbox, se precargan automáticamente las imágenes anterior y siguiente para reducir la latencia percibida.
    *   **Light-Dismiss:** Hacer clic fuera del área de la imagen (en el backdrop) cierra el lightbox. Se utiliza el atributo nativo `closedBy` con fallback manual para compatibilidad.
    *   **Efecto de Desfoque de Fondo:** El backdrop del Lightbox aplica `backdrop-filter: blur(10px)` para centrar la atención en la fotografía expuesta.
    *   **Animación de Apertura/Cierre:** El lightbox se abre con una animación de escala y opacidad usando la propiedad CSS `@starting-style` (dentro de un `@supports` para compatibilidad progresiva).

### C. Características Técnicas Globales

*   **Tema Claro/Oscuro Integrado:** El usuario puede alternar la iluminación de la web mediante un botón interactivo. La elección se guarda localmente en `localStorage` y persiste si el usuario refresca o vuelve al sitio. Si no hay preferencia previa, el sistema se configura automáticamente para igualar la preferencia del sistema operativo mediante `prefers-color-scheme`.
*   **Animación del Icono de Tema:** Al cambiar de tema, el icono (sol/luna) desaparece con una rotación de salida y el nuevo icono aparece con una rotación de entrada, creando una transición suave y elegante. La animación se omite si `prefers-reduced-motion` está activo.
*   **Diseño Mobile-First Extremo:** Adaptabilidad garantizada en viewports pequeños desde 320px de ancho hasta pantallas ultra-wide 4K.
*   **Optimización LCP y CLS:**
    *   La imagen Hero principal usa `fetchpriority="high"` y `decoding="sync"` para cargarse al instante.
    *   El header tiene `scroll-padding-top: 80px` para que los anchor links no queden tapados por el header sticky.
    *   Uso de `content-visibility: auto` con `contain-intrinsic-size` calculado dinámicamente en JS para no calcular estilos de imágenes fuera de pantalla en galerías extensas.
*   **Glassmorphism en Header y Títulos de Sección:** El header y los títulos de cada sección utilizan `backdrop-filter: blur() saturate()` para crear un efecto de cristal esmerilado, manteniendo la legibilidad sobre cualquier imagen de fondo.
*   **Accesibilidad de Foco:** Los botones interactivos usan `:focus-visible` para mostrar un anillo de foco solo cuando se navega por teclado, sin interferir con la interacción con ratón (`:focus:not(:focus-visible)` sin outline).

---

## 2. Herramientas de Administración (CMS y Utilidades)

Para evitar la edición manual de archivos JSON y la optimización manual de imágenes pesadas, el portafolio incorpora un conjunto de herramientas locales de desarrollo.

### A. Panel de Administración CMS (`admin-server.js` y `tools/admin/`)

Es una aplicación local con interfaz gráfica web para gestionar todo el portfolio. Se inicia mediante el comando `npm run admin` y se accede en `http://localhost:3030/admin`. El frontend del panel está estructurado modularmente en `index.html` (layout), `admin.css` (estilos) y `admin.js` (lógica) dentro del directorio `tools/admin/`.

**Estructura:** Diseño de dos paneles (sidebar + contenido principal). La barra lateral lista las galerías; el panel principal muestra las imágenes de la galería activa.

*   **Gestor de Galerías Integrado:**
    *   **Barra Lateral de Control:** Lista todas las galerías activas configuradas en el JSON con indicadores de layout (flecha izquierda/derecha según su posición par/impar) y el símbolo ★ para Favourites. Detecta carpetas de imágenes en el disco que aún no han sido añadidas al archivo de configuración, listándolas como «(Draft)» para activarlas rápidamente.
    *   **Reordenación de Galerías (Drag & Drop):** El orden de las galerías en la barra lateral puede modificarse arrastrándolas. La galería «Favourites» está bloqueada y no puede moverse. Al soltar, el nuevo orden se persiste en `galleries.json`.
    *   **Creación de Galerías:** Permite crear una nueva galería introduciendo un ID único (ej. `viaje-islandia`). Crea automáticamente el directorio correspondiente en el almacenamiento local de imágenes.

*   **Gestor de Archivos Fotográficos:**
    *   **Carga de Imágenes (Upload):** El panel incluye una zona de drag & drop y un buscador de archivos para subir múltiples fotos simultáneamente. La carga se gestiona mediante `multer` y organiza las fotos directamente en la carpeta del disco de la galería seleccionada.
    *   **Eliminación Segura (Delete):** Borra permanentemente una imagen física del disco y escanea las bases de datos para eliminar cualquier referencia rota existente. Toda operación destructiva está protegida por un **sistema de cola asíncrona** en el servidor para evitar corrupción de la base de datos JSON en caso de clicks rápidos/masivos.
    *   **Asignación de Portadas (Cover):** Un botón de icono de imagen permite marcar cualquier foto de la galería como la portada principal de la tarjeta de la Home. La foto actual de portada muestra un badge «Portada» en la esquina superior izquierda.
    *   **Gestor de Favoritos (Optimistic UI):** Un botón de corazón añade o elimina cualquier imagen del carrusel de destacados y de la galería de Favourites. La actualización de la UI es **inmediata** (optimista): el estado visual cambia al instante sin esperar la respuesta del servidor. Si el servidor devuelve un error, el estado se revierte automáticamente.
    *   **Indicador Visual de Favoritos:** Las imágenes que pertenecen a Favourites muestran un badge rojo (❤) en la esquina superior derecha de su tarjeta en el CMS, independientemente de en qué galería estén.

*   **Ordenador Drag & Drop (SortableJS):**
    *   Las fotos de una galería se muestran en una cuadrícula interactiva. El administrador puede arrastrarlas y soltarlas para reordenar la secuencia.
    *   Al soltar las imágenes, el servidor reescribe asíncronamente las colecciones de datos en los archivos JSON guardando la ordenación al instante.

*   **Lanzador de Build Integrado:**
    *   Un botón destacado «🚀 Build & Optimize» permite ejecutar el script de optimización de imágenes (`build.js`) directamente desde la interfaz web del CMS. La interfaz muestra un overlay con spinner y texto mientras el servidor ejecuta el proceso en segundo plano.

*   **Sistema de Notificaciones (Toast):**
    *   Todas las operaciones (guardado, upload, build, error) muestran una notificación flotante temporal en la esquina inferior derecha con código de color (verde para éxito, rojo para error).

### B. Pipeline de Procesamiento de Imágenes (`scripts/build.js`)

*   Es el motor de optimización que reduce el peso del portfolio. Se ejecuta mediante `npm run build` o a través del botón «Build» del CMS.
*   **Optimización WebP (Ejecución Paralela):** Escanea los directorios de fotos y las convierte al formato optimizado WebP utilizando la librería de alto rendimiento `sharp`. Utiliza procesamiento paralelo concurrente, procesando lotes de imágenes a la vez en lugar de forma secuencial, para acelerar exponencialmente el tiempo de compilación general.
*   **Generación de Miniaturas (Thumbnails):** Genera una copia a baja resolución de cada imagen con el prefijo `thumb_` (ej. `thumb_japon-01.webp`) destinada a la carga inicial del mosaico, acelerando la velocidad de carga de la página.
*   **Respaldo de Originales:** Mueve las fotos pesadas de formato original (JPEG, PNG) a la carpeta externa `/originals/` para conservarlas como copia de seguridad sin saturar el peso final de la web estática que se subirá a producción.
*   **Sincronización JSON:** Actualiza las listas de imágenes de cada galería dentro de `data/galleries.json` en base a lo que realmente se encuentra en los subdirectorios del disco.

---

## 3. Scripts y Comandos NPM

| Comando           | Descripción                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| `npm start`       | Levanta un servidor Python (`python3 -m http.server 8080`) para ver la web pública en `http://localhost:8080` |
| `npm run build`   | Ejecuta el pipeline de optimización de imágenes (`scripts/build.js`)        |
| `npm run admin`   | Inicia el servidor CMS Express (`admin-server.js`) en `http://localhost:3030/admin` |

El script `start-cms.command` es un script ejecutable de macOS que lanza el servidor CMS con doble clic desde el Finder.
