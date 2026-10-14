/**
 * Aviso para lectores de pantalla en todo enlace que abre otra pestaña. El
 * espacio va DENTRO del span: como hermano de un contenedor flex, algunos
 * motores lo descartan al calcular el nombre accesible ("Cursos(se abre…").
 */
export function AvisoPestanaNueva() {
  return <span className="sr-only"> (se abre en otra pestaña)</span>;
}
