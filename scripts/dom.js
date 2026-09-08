const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

// Los títulos y descripciones vienen del CMS, donde el usuario escribe texto
// libre, y se interpolan en plantillas que acaban en innerHTML.
export function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ENTITIES[c]);
}
