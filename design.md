# Design System Tokens — Especificación Técnica (`design.md`)

Este documento define la librería de variables de diseño (tokens) para la página web de fotografía. Su estructura es escalable, soporta modos **Light** y **Dark**, y establece la equivalencia exacta entre el sistema de diseño (Figma) y la implementación web (Tailwind CSS / CSS Variables).

---

## 0. Convención de Nomenclatura y Sintaxis

Para garantizar la consistencia entre diseño y código, todas las variables siguen estas reglas:
* **Figma (Grupos):** Organizado mediante barras inclinadas (`grupo/subgrupo/variable`).
* **Web (CSS Variables):** Formato `kebab-case` estricto con el prefijo `var(--...)`.
* **Unidades:** Los valores absolutos se definen en píxeles (`px`) para Figma, mapeados a su equivalente semántico en entorno web.

---

## 1. Colección: Primitives (Valores Base)

Las primitivas son los valores puros del sistema. **No deben usarse directamente en los componentes**, sino como alias (referencias) en las colecciones semánticas. En Figma, se configuran sin scope (`[]`) para permanecer ocultas en el panel de diseño.

### 1A. Colores Base (Escala Tailwind CSS)
* **`color/base/*`** (Gama Gris - Slate): `50` (más claro) a `950` (más oscuro).
* **`color/primary/*`** (Gama Principal - Blue): `50` a `950`.
* **`color/secondary/*`** (Gama Secundaria - Violet): `50` a `950`.

#### Escalas Semánticas de Soporte
* **`color/error/*`** (Soporte - Red): `50` a `950`.
* **`color/success/*`** (Soporte - Green): `50` a `950`.
* **`color/warning/*`** (Soporte - Amber): `50` a `950`.
* **`color/notification/*`** (Soporte - Sky): `50` a `950`.

### 1B. Dimensiones y Geometría

| Grupo Figma | Variable | Valor (px) | Sintaxis Web (CSS) |
| :--- | :--- | :--- | :--- |
| **Spacing** | `spacing/0` al `12` | `0`, `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48` | `var(--spacing-[X])` |
| | `spacing/16` al `24` | `64`, `80`, `96` | |
| **Radius** | `radius/none` \| `sm` \| `md` | `0` \| `2` \| `6` | `var(--radius-[size])` |
| | `radius/lg` \| `xl` \| `2xl` | `8` \| `12` \| `16` | |
| | `radius/3xl` \| `full` | `24` \| `9999` | |
| **Stroke** | `stroke/0` \| `1` \| `2` | `0` \| `1` \| `2` | `var(--stroke-[size])` |
| (Bordes) | `stroke/4` \| `8` | `4` \| `8` | |
| **Icon Size**| `icon-size/xs` \| `sm` \| `md`| `12` \| `16` \| `20` | `var(--icon-size-[size])` |
| | `icon-size/lg` \| `xl` | `24` \| `32` | |
| **Breakpoint**| `breakpoint/xs` \| `sm` \| `md`| `0` \| `640` \| `768` | Usar en Media Queries |
| (Layout) | `breakpoint/lg` \| `xl` \| `2xl`| `1024` \| `1280` \| `1536` | |

### 1C. Tipografía Base

> 💡 *Nota de implementación:* Los tamaños de fuente se derivan de la base estándar `1rem = 16px`.

| Grupo Figma | Variable | Valor | Sintaxis Web (CSS) |
| :--- | :--- | :--- | :--- |
| **Font Size** | `font-size/xs` \| `sm` \| `md` | `12px` \| `14px` \| `16px` | `var(--font-size-[size])` |
| | `font-size/lg` \| `xl` \| `2xl` | `18px` \| `20px` \| `24px` | |
| | `font-size/3xl` \| `4xl` \| `5xl`| `30px` \| `36px` \| `48px` | |
| **Line Height**| `line-height/none` \| `tight` | `1` \| `1.1` (Multiplicador)| `var(--line-height-[size])` |
| (Multiplicador)| `line-height/snug` \| `normal`| `1.2` \| `1.5` | |
| | `line-height/relaxed` \| `loose`| `1.7` \| `2` | |
| **Font Weight**| `font-weight/regular` \| `medium`| `400` \| `500` | `var(--font-weight-[size])` |
| | `font-weight/semibold` \| `bold` | `600` \| `700` | |

---

## 2. Colecciones Semánticas (Modos y Aplicación)

Estas variables apuntan a las **Primitives** mediante alias. Son las que se consumen directamente en los estilos CSS de la web y en las capas de Figma.

### 2A. Colección: Color (Soporte Light / Dark)
* **Figma Scopes:** `FRAME_FILL`, `SHAPE_FILL` (Backgrounds) / `TEXT_FILL` (Text) / `STROKE_COLOR` (Borders).

#### Backgrounds (Fondos)
| Variable Figma | Light Alias | Dark Alias | Sintaxis Web (CSS) |
| :--- | :--- | :--- | :--- |
| `color/bg/default` | `base/50` | `base/950` | `var(--color-bg-default)` |
| `color/bg/subtle` | `base/100` | `base/900` | `var(--color-bg-subtle)` |
| `color/bg/muted` | `base/200` | `base/800` | `var(--color-bg-muted)` |
| `color/bg/primary` | `primary/600` | `primary/500` | `var(--color-bg-primary)` |
| `color/bg/secondary` | `secondary/600` | `secondary/500` | `var(--color-bg-secondary)` |

#### Text (Tipografía)
| Variable Figma | Light Alias | Dark Alias | Sintaxis Web (CSS) |
| :--- | :--- | :--- | :--- |
| `color/text/default` | `base/900` | `base/50` | `var(--color-text-default)` |
| `color/text/subtle` | `base/500` | `base/400` | `var(--color-text-subtle)` |
| `color/text/muted` | `base/400` | `base/600` | `var(--color-text-muted)` |
| `color/text/inverted` | `base/50` | `base/900` | `var(--color-text-inverted)` |
| `color/text/primary` | `primary/700` | `primary/300` | `var(--color-text-primary)` |
| `color/text/secondary`| `secondary/700`| `secondary/300`| `var(--color-text-secondary)`|

#### Borders (Bordes y Líneas)
| Variable Figma | Light Alias | Dark Alias | Sintaxis Web (CSS) |
| :--- | :--- | :--- | :--- |
| `color/border/default` | `base/200` | `base/800` | `var(--color-border-default)` |
| `color/border/strong` | `base/400` | `base/600` | `var(--color-border-strong)` |
| `color/border/primary` | `primary/500` | `primary/400` | `var(--color-border-primary)` |

#### Estados y Feedback (Error, Success, Warning, Notification)
> *Nota: Siguen el mismo patrón estructural intercambiando la paleta base.*

| Variable Figma (Ej. Error) | Light Alias | Dark Alias | Sintaxis Web (CSS) |
| :--- | :--- | :--- | :--- |
| `color/error/bg` | `error/50` | `error/950` | `var(--color-error-bg)` |
| `color/error/text` | `error/700` | `error/300` | `var(--color-error-text)` |
| `color/error/border` | `error/300` | `error/700` | `var(--color-error-border)` |
| `color/error/solid` | `error/600` | `error/500` | `var(--color-error-solid)` |

---

### 2B. Colección: Spacing (Layout y Componentes)
* **Figma Scopes:** `GAP`, `HORIZONTAL_PADDING`, `VERTICAL_PADDING`.

| Variable Figma | Alias Primitiva | Valor Equivalente | Sintaxis Web (CSS) |
| :--- | :--- | :--- | :--- |
| `spacing/none` | `spacing/0` | `0px` | `var(--spacing-none)` |
| `spacing/xs` | `spacing/1` | `4px` | `var(--spacing-xs)` |
| `spacing/sm` | `spacing/2` | `8px` | `var(--spacing-sm)` |
| `spacing/md` | `spacing/4` | `16px` | `var(--spacing-md)` |
| `spacing/lg` | `spacing/6` | `24px` | `var(--spacing-lg)` |
| `spacing/xl` | `spacing/8` | `32px` | `var(--spacing-xl)` |
| `spacing/2xl` | `spacing/12` | `48px` | `var(--spacing-2xl)` |
| `spacing/3xl` | `spacing/16` | `64px` | `var(--spacing-3xl)` |

---

### 2C. Colección: Radius (Esquinas)
* **Figma Scopes:** `CORNER_RADIUS`.

| Variable Figma | Alias Primitiva | Valor Equivalente | Sintaxis Web (CSS) |
| :--- | :--- | :--- | :--- |
| `radius/none` | `radius/none` | `0px` | `var(--radius-none)` |
| `radius/sm` | `radius/sm` | `2px` | `var(--radius-sm)` |
| `radius/md` | `radius/md` | `6px` | `var(--radius-md)` |
| `radius/lg` | `radius/lg` | `8px` | `var(--radius-lg)` |
| `radius/xl` | `radius/xl` | `12px` | `var(--radius-xl)` |
| `radius/2xl` | `radius/2xl` | `16px` | `var(--radius-2xl)` |
| `radius/full` | `radius/full` | `9999px` | `var(--radius-full)` |

---

### 2D. Colección: Stroke (Grosor de Línea)
* **Figma Scopes:** `STROKE_WIDTH`.

| Variable Figma | Alias Primitiva | Uso General | Sintaxis Web (CSS) |
| :--- | :--- | :--- | :--- |
| `stroke/none` | `stroke/0` | Sin borde | `var(--stroke-none)` |
| `stroke/thin` | `stroke/1` | Borde de UI estándar | `var(--stroke-thin)` |
| `stroke/base` | `stroke/2` | Borde de énfasis o activo | `var(--stroke-base)` |
| `stroke/thick` | `stroke/4` | Separadores fuertes | `var(--stroke-thick)` |
| `stroke/heavy` | `stroke/8` | Enmarques artísticos (Fotos) | `var(--stroke-heavy)` |

---

### 2E. Colección: Icon Size & Breakpoints
* **Icon Size Scopes:** `WIDTH_HEIGHT` | **Breakpoint Scopes:** `[]` (Documental).

| Tipo | Variable Figma | Alias Primitiva | Sintaxis Web (CSS) |
| :--- | :--- | :--- | :--- |
| **Icono** | `icon-size/xs` a `xl` | `icon-size/xs` a `xl` | `var(--icon-size-[size])` |
| **Layout**| `breakpoint/xs` a `2xl`| `breakpoint/xs` a `2xl`| *Usado en Media Queries* |

---

### 2F. Colección: Typography (Estructura Editorial)

#### Font Size (`FONT_SIZE`)
| Variable Figma | Alias Primitiva | Propósito en Fotografía | Sintaxis Web (CSS) |
| :--- | :--- | :--- | :--- |
| `font-size/caption-xs` | `font-size/xs` (12px) | Datos EXIF secundarios | `var(--font-size-caption-xs)` |
| `font-size/caption-sm` | `font-size/sm` (14px) | Pie de foto / Metadatos | `var(--font-size-caption-sm)` |
| `font-size/body-sm` | `font-size/sm` (14px) | Textos legales / párrafos cortos| `var(--font-size-body-sm)` |
| `font-size/body-md` | `font-size/md` (16px) | Cuerpo de artículo / Bio | `var(--font-size-body-md)` |
| `font-size/body-lg` | `font-size/lg` (18px) | Entradillas de blogs | `var(--font-size-body-lg)` |
| `font-size/heading-h6` | `font-size/sm` (14px) | Subtitulados de tarjetas | `var(--font-size-heading-h6)` |
| `font-size/heading-h5` | `font-size/md` (16px) | Títulos de tarjetas/galerías | `var(--font-size-heading-h5)` |
| `font-size/heading-h4` | `font-size/lg` (18px) | Títulos de sección menores | `var(--font-size-heading-h4)` |
| `font-size/heading-h3` | `font-size/xl` (20px) | Cabeceras de colecciones | `var(--font-size-heading-h3)` |
| `font-size/heading-h2` | `font-size/3xl` (30px)| Títulos de proyectos | `var(--font-size-heading-h2)` |
| `font-size/heading-h1` | `font-size/5xl` (48px)| Título principal (Hero) | `var(--font-size-heading-h1)` |

#### Line Height (`LINE_HEIGHT`)
| Variable Figma | Alias Primitiva | Sintaxis Web (CSS) |
| :--- | :--- | :--- |
| `line-height/heading-tight` | `line-height/tight` (1.1) | `var(--line-height-heading-tight)` |
| `line-height/heading-snug` | `line-height/snug` (1.2) | `var(--line-height-heading-snug)` |
| `line-height/body-normal` | `line-height/normal` (1.5) | `var(--line-height-body-normal)` |
| `line-height/body-relaxed` | `line-height/relaxed` (1.7) | `var(--line-height-body-relaxed)` |
| `line-height/caption` | `line-height/normal` (1.5) | `var(--line-height-caption)` |

#### Font Weight (`[]` — Referencia Documental)
| Variable Figma | Alias Primitiva | Sintaxis Web (CSS) |
| :--- | :--- | :--- |
| `font-weight/regular` | `font-weight/regular` (400) | `var(--font-weight-regular)` |
| `font-weight/medium` | `font-weight/medium` (500) | `var(--font-weight-medium)` |
| `font-weight/semibold` | `font-weight/semibold` (600) | `var(--font-weight-semibold)` |
| `font-weight/bold` | `font-weight/bold` (700) | `var(--font-weight-bold)` |
