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
