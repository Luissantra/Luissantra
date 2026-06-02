# Patrones de Diseño y Arquitectura del Proyecto

Este documento describe los patrones de diseño, convenciones y decisiones arquitectónicas que sigue el proyecto "Photography Web Portfolio". 

El proyecto es una aplicación frontend "vanilla" (sin frameworks pesados como React o Vue) diseñada para ser rápida, accesible y fácil de mantener.

## 1. Arquitectura General y Estructura

*   **Separación de Responsabilidades (Separation of Concerns):** El proyecto mantiene una estricta separación entre el marcado (HTML), la presentación (CSS) y el comportamiento/lógica (JavaScript).
*   **Renderizado Dinámico del Lado del Cliente (CSR parcial):** El contenido principal de las galerías no está estático en el HTML. Se utiliza JavaScript para realizar una petición asíncrona (Fetch API) a un archivo JSON estático (`data/galleries.json`) y construir dinámicamente el DOM utilizando Template Literals. Esto facilita la adición de nuevo contenido sin tener que modificar múltiples archivos HTML.
*   **Enrutamiento Simple del Lado del Cliente:** Se utiliza una lógica sencilla basada en la URL (`window.location.pathname` y `URLSearchParams`) para determinar qué "vista" renderizar (Página de inicio vs. Vista de una galería específica).

## 2. Patrones CSS y Diseño

*   **Sistema de Diseño basado en Tokens (CSS Custom Properties):** Se utilizan variables CSS en el elemento `:root` para definir la paleta de colores, tipografía, espaciado, radios de borde y transiciones. Esto actúa como un sistema de diseño de fuente única de verdad, asegurando consistencia visual en toda la aplicación.
*   **Tematización (Theming) con Atributos de Datos:** El modo oscuro/claro se gestiona alternando un atributo de datos (`data-theme="dark"`) en el elemento `<html>`. Las variables CSS se redefinen bajo este selector para aplicar los colores del tema correspondiente de manera global y eficiente.
*   **Metodología BEM (Block Element Modifier) simplificada:** Para componentes complejos como las tarjetas de galería, se utiliza una convención de nomenclatura similar a BEM (ej. `gallery-card`, `gallery-card__image-wrapper`, `gallery-card__title`) para encapsular los estilos y evitar colisiones de especificidad.
*   **Clases de Utilidad (Utility Classes):** Se emplean clases reutilizables de un solo propósito para comportamientos comunes, como animaciones (`.fade-in-up`) o accesibilidad (`.visually-hidden`).

## 3. Patrones de JavaScript

*   **Patrón de Inicialización (Init Pattern):** El código está estructurado en funciones de inicialización discretas (`initTheme`, `initHomePage`, `initGalleryPage`, `initLightbox`). Un único *event listener* `DOMContentLoaded` se encarga de llamar a las funciones correspondientes según la ruta actual.
*   **Programación Asíncrona:** Uso intensivo de `async` / `await` junto con la API `fetch` para la carga de datos no bloqueante, incluyendo un manejo básico de errores (`try...catch`).
*   **Generación de UI con Template Literals:** El HTML dinámico se construye inyectando variables directamente en cadenas de texto multilínea (Template Literals) y luego asignándolas vía `innerHTML`.

## 4. Rendimiento y APIs Web Modernas

*   **Uso de APIs Nativas (HTML5 `<dialog>`):** En lugar de depender de librerías externas de terceros o construir modales complejos desde cero con divs y scripts para el manejo del foco, el proyecto utiliza el elemento nativo `<dialog>` de HTML5 para el componente "Lightbox". Esto proporciona accesibilidad, gestión del foco y soporte para la tecla "Escape" por defecto.
*   **Optimización de Carga de Imágenes:**
    *   **Priorización de recursos:** Uso de `fetchpriority="high"` y `decoding="sync"` para la imagen Hero (Largest Contentful Paint - LCP).
    *   **Carga Diferida (Lazy Loading):** Uso del atributo nativo `loading="lazy"` para las imágenes fuera de pantalla.
*   **Optimización de Renderizado:** Implementación de `content-visibility: auto` y `contain-intrinsic-size` en los ítems de las galerías para mejorar el rendimiento de renderizado en listas con cientos de imágenes pesadas.

## 5. Almacenamiento de Estado Local

*   **Persistencia de Preferencias:** Se utiliza `localStorage` para recordar la preferencia de tema (claro/oscuro) del usuario entre sesiones. Si no hay preferencia guardada, el sistema recurre a la preferencia del sistema operativo mediante la API `window.matchMedia('(prefers-color-scheme: dark)')`.
