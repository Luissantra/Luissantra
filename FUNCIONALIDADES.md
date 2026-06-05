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
    *   **Rotación Inteligente de Portada:** La imagen de fondo de esta tarjeta rota de manera aleatoria cada 5 segundos.
    *   **Lógica de No Repetición:** El algoritmo JavaScript asegura que la nueva imagen seleccionada al azar nunca sea idéntica a la mostrada inmediatamente antes, evitando transiciones visuales repetitivas.
    *   **Soporte de Accesibilidad:** Si el sistema operativo del usuario tiene configurada la opción de reducir animaciones, el carrusel dinámico se detiene automáticamente respetando la consulta de medios `(prefers-reduced-motion: reduce)`.
*   **Menú de Navegación Scroll-Driven:** El encabezado del sitio (`.site-header`) es pegajoso y dinámico. Al hacer scroll hacia abajo, se oculta suavemente para no obstaculizar la vista de las fotos; al hacer un scroll mínimo hacia arriba, vuelve a aparecer. Si el usuario hace clic en los enlaces de navegación rápida de la página de inicio, el menú se mantiene visible para evitar parpadeos durante el scroll suave.
*   **Tarjetas de Galería Interactivas:** Las tarjetas responden al cursor (hover) con un zoom suave de la imagen de fondo y un subrayado animado expansivo en el título de la galería.

### B. Vista de Galería Individual (`gallery.html`)
*   **Enrutamiento por Parámetros:** Mediante parámetros de búsqueda (`gallery.html?id=viaje-japon`) se carga dinámicamente la galería seleccionada, modificando el título de la pestaña del navegador automáticamente para optimizar el SEO.
*   **Layout de Mosaico Adaptativo (Masonry Grid):**
    *   Las fotos se disponen en columnas dinámicas de altura variable inspiradas en Pinterest.
    *   El diseño es totalmente responsivo y se adapta en columnas según el tamaño de la pantalla (1 columna en móviles, 2 en tablets, 3 en pantallas de escritorio).
    *   Usa clases de modificación de tamaño (`.photo-item--wide` y `.photo-item--featured`) basadas en la proporción del archivo original para dar dinamismo a las imágenes horizontales o destacadas.
*   **Alternancia de Disposición (Layout Toggle):**
    *   El usuario puede cambiar la visualización de la galería de Favoritos entre el "Mosaico Dinámico" y la "Cuadrícula Clásica de 3 Columnas".
    *   **Integración de View Transitions API:** Al presionar el botón de cambio de disposición, las imágenes se reorganizan flotando de manera fluida y suave gracias a esta API nativa de animaciones de diseño.
    *   **Accesibilidad (ARIA):** El botón actualiza dinámicamente el estado `aria-pressed` para informar correctamente a lectores de pantalla de la disposición seleccionada.
*   **Estados de Carga Progresivos:** Las fotos muestran un efecto visual de carga ("skeleton screen") con un spinner central discreto, revelando la imagen real con una transición difuminada de opacidad (`fade-in`) una vez descargada.
*   **Visualizador en Pantalla Completa (Lightbox):**
    *   Al hacer clic en cualquier foto, se abre un visualizador de pantalla completa.
    *   **Basado en `<dialog>` Nativo:** Implementa la etiqueta `<dialog>` de HTML5, asegurando que el foco del teclado quede atrapado dentro del modal, permitiendo cerrar la vista presionando la tecla `Escape` sin escribir código de control manual.
    *   **Controles de Navegación:** El visualizador incluye botones en pantalla para avanzar y retroceder de foto, y responde a eventos de teclado (flecha izquierda y derecha).
    *   **Efecto de Desfoque de Fondo:** El fondo del Lightbox aplica un filtro CSS de desenfoque (`backdrop-filter: blur(10px)`) para centrar el 100% de la atención en la fotografía expuesta.

### C. Características Técnicas Globales
*   **Tema Claro/Oscuro Integrado:** El usuario puede alternar la iluminación de la web mediante un botón interactivo. La elección se guarda localmente en `localStorage` y persiste si el usuario refresca o vuelve al sitio. Si no hay preferencia previa, el sistema se configura automáticamente para igualar la preferencia del sistema operativo mediante `prefers-color-scheme`.
*   **Diseño Mobile-First Extremo:** Adaptabilidad garantizada en viewports pequeños desde 320px de ancho hasta pantallas ultra-wide 4K.
*   **Optimización LCP y CLS:**
    *   La imagen Hero principal y las imágenes críticas usan `fetchpriority="high"` y `decoding="sync"` para cargarse al instante sin retrasos que penalicen el SEO.
    *   Las imágenes especifican sus dimensiones en CSS y marcadores dinámicos para evitar saltos repentinos en la pantalla durante la carga.
    *   Uso de `content-visibility: auto` con parámetros calculados en JS (`contain-intrinsic-size`) para no calcular estilos de imágenes fuera de pantalla en galerías extensas.

---

## 2. Herramientas de Administración (CMS y Utilidades)

Para evitar la edición manual pesada de códigos JSON y la optimización de imágenes pesadas, el portafolio incorpora un conjunto de herramientas locales de desarrollo.

### A. Panel de Administración CMS (`admin-server.js` y `tools/admin/index.html`)
Es una aplicación local con interfaz gráfica web para gestionar todo el portfolio. Se inicia mediante el comando `npm run admin` y se accede en `http://localhost:3030/admin`.

*   **Gestor de Galerías Integrado:**
    *   **Barra Lateral de Control:** Lista todas las galerías activas configuradas en el JSON. Detecta carpetas de imágenes en el disco que aún no han sido añadidas al archivo de configuración, listándolas como "Borradores/Drafts" para activarlas rápidamente.
    *   **Creación de Galerías:** Permite crear una nueva galería introduciendo un ID único (ej. `viaje-islandia`). Crea automáticamente el directorio correspondiente en el almacenamiento local de imágenes.
*   **Gestor de Archivos Fotográficos:**
    *   **Carga de Imágenes (Upload):** El panel incluye una zona de arrastrar y soltar (Drag & Drop) y un buscador de archivos de sistema para subir múltiples fotos simultáneamente. La subida se gestiona mediante `multer` y organiza las fotos directamente en la carpeta correcta del disco.
    *   **Eliminación Segura (Delete):** Borra permanentemente una imagen física del disco duro y, de manera inteligente, escanea las bases de datos de galerías y favoritos para eliminar cualquier enlace roto existente.
    *   **Asignación de Portadas (Cover):** Un botón permite marcar cualquier foto de la galería como la portada principal de la tarjeta de la Home.
    *   **Gestor de Favoritos:** Un botón de icono de corazón permite añadir o remover cualquier imagen del carrusel de destacados y de la galería de Favoritos de forma instantánea.
*   **Ordenador Drag & Drop (SortableJS):**
    *   Las fotos de una galería se muestran en una cuadrícula interactiva. El administrador puede arrastrarlas y soltarlas para reordenar la secuencia.
    *   Al soltar las imágenes, el servidor reescribe asíncronamente las colecciones de datos en los archivos JSON de configuración guardando la ordenación al instante.
*   **Lanzador de Build Integrado:**
    *   Un botón destacado permite ejecutar el script de optimización de imágenes (`build.js`) directamente desde la interfaz web del CMS. La interfaz web del panel muestra un spinner de carga activa mientras el servidor ejecuta el proceso de consola en segundo plano.

### B. Ordenador Estático Autónomo (`tools/reorder.html`)
*   Una alternativa liviana al panel CMS Express que no requiere node activo en terminal.
*   Utiliza la API nativa de navegadores modernos **File System Access API** (`window.showDirectoryPicker()`).
*   El usuario selecciona la carpeta local del proyecto, el script carga los archivos `galleries.json` y `favourites.json` directo en la memoria del navegador, permite reordenar con `SortableJS` y guarda de vuelta al disco directamente a través de flujos de escritura locales seguros (`FileSystemWritableFileStream`).

### C. Script Normalizador de Nombres (`tools/rename.py`)
*   Script programado en Python diseñado para mantener limpios los directorios de imágenes.
*   Renombra recursivamente todas las fotos de una galería bajo un estándar numérico secuencial de dos dígitos (ej. `islandia-caratula.webp`, `islandia-01.webp`, `islandia-02.webp`...), evitando caracteres extraños o nombres largos de cámaras.
*   Actualiza simultáneamente los archivos de configuración JSON con los nuevos nombres generados para no romper los enlaces visuales de la web.

### D. Pipeline de Procesamiento de Imágenes (`scripts/build.js`)
*   Es el motor de optimización que reduce el peso del portfolio. Se ejecuta mediante `npm run build` o a través del CMS.
*   **Optimización WebP:** Escanea los directorios de fotos y las convierte al formato optimizado WebP utilizando la librería de alto rendimiento `sharp`.
*   **Generación de Miniaturas (Thumbnails):** Genera una copia a baja resolución de cada imagen con el prefijo `thumb_` (ej. `thumb_japon-01.webp`) destinada a la carga inicial del mosaico en cuadrículas, acelerando la velocidad de carga de la página.
*   **Respaldo de Originales:** Mueve las fotos pesadas de formato original (JPEG, PNG) a la carpeta externa `/originals/` para conservarlas como copia de seguridad sin saturar el peso final de la web estática que se subirá a producción.
*   **Sincronización JSON:** Actualiza las listas de imágenes de cada galería dentro de `data/galleries.json` en base a lo que realmente se encuentra en los subdirectorios del disco.
