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

// Una ruta relativa "galeria/fichero.ext", tal y como aparecen en las
// entradas de favourites.json y en la galería sintética "favourites" de
// galleries.json. Cada mitad se valida por separado con las reglas de arriba:
// no basta con que la cadena entera "parezca" una ruta, las dos mitades
// tienen que ser, cada una, un identificador y un nombre de fichero válidos.
function safeRelativeImagePath(value) {
  if (typeof value !== 'string') {
    throw new Error(`Ruta de imagen no válida: ${JSON.stringify(value)}`);
  }
  const parts = value.split('/');
  if (parts.length !== 2) {
    throw new Error(`Ruta de imagen no válida: ${JSON.stringify(value)}`);
  }
  const [gallery, filename] = parts;
  safeSegment(gallery);
  safeFilename(filename);
  return value;
}

// Ninguna extensión reconocible tras normalizar: para un CMS de fotos, jpg es
// la asunción menos mala.
const FALLBACK_EXTENSION = 'jpg';
// Base vacía tras normalizar (el nombre original era solo símbolos, o solo
// la extensión): un nombre genérico que la desambiguación de colisiones
// puede numerar.
const FALLBACK_BASE = 'foto';

// Separa "nombre.ext" en sus dos mitades. Un punto en la posición 0 (nombre
// "oculto" al estilo Unix, p.ej. ".oculto" o ".jpg") o al final de la cadena
// no cuenta como separador de extensión: no hay nada útil que extraer ahí.
function splitExtension(name) {
  const idx = name.lastIndexOf('.');
  if (idx <= 0 || idx === name.length - 1) {
    return { base: name, ext: '' };
  }
  return { base: name.slice(0, idx), ext: name.slice(idx + 1) };
}

// Transcribe acentos y diacríticos (NFD + quitar las marcas combinantes) y
// colapsa cualquier racha de caracteres que no sean [a-z0-9] en un único
// guion, recortando los guiones sobrantes en los extremos.
function slugify(value) {
  const withoutDiacritics = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return withoutDiacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Convierte cualquier nombre de fichero subido en uno que pasa safeFilename,
// en vez de rechazarlo. Pensado para nombres reales que la regex de
// safeFilename rechaza pero que no tienen nada de malicioso, solo espacios,
// acentos o símbolos: las capturas de PlayStation llegan como
// "Ghost of Tsushima_20240115181523.jpg", por ejemplo.
// Propiedad de seguridad: la salida SIEMPRE pasa safeFilename, sea cual sea
// la entrada (incluidos nombres que sean solo símbolos o que empiecen por
// punto) porque se construye a partir de un alfabeto ya restringido a
// [a-z0-9-] más un punto y una extensión alfanumérica, con reservas para los
// casos en los que no queda nada aprovechable.
function normalizeUploadFilename(value) {
  const raw = typeof value === 'string' ? value : '';
  const { base, ext } = splitExtension(raw);

  let safeBase = slugify(base);
  if (!safeBase) safeBase = FALLBACK_BASE;

  let safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (!safeExt) safeExt = FALLBACK_EXTENSION;

  return safeFilename(`${safeBase}.${safeExt}`);
}

// Desambigua colisiones: si `filename` ya está en `takenNames`, prueba
// "base-2.ext", "base-3.ext"... hasta encontrar uno libre. Marca el nombre
// devuelto como ocupado en el propio Set (mutación intencionada) para que
// llamadas sucesivas dentro del mismo lote no vuelvan a colisionar entre sí.
function dedupeFilename(filename, takenNames) {
  if (!takenNames.has(filename)) {
    takenNames.add(filename);
    return filename;
  }
  const { base, ext } = splitExtension(filename);
  let n = 2;
  let candidate;
  do {
    candidate = `${base}-${n}.${ext}`;
    n++;
  } while (takenNames.has(candidate));
  takenNames.add(candidate);
  return candidate;
}

module.exports = {
  safeSegment,
  safeFilename,
  safeRelativeImagePath,
  normalizeUploadFilename,
  dedupeFilename
};
