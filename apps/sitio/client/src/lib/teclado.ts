/**
 * Movimiento del foco con flechas dentro de un desplegable (RF-02). Radix ya
 * abre con Enter o Espacio, cierra con Escape y devuelve el foco al
 * disparador; lo que no hace es recorrer los enlaces de nuestro contenido.
 *
 * Pura: recibe la posición actual (-1 si el foco aún no está en la lista) y
 * devuelve la siguiente, o `null` si la tecla no le corresponde.
 */
export function indiceSiguiente(
  actual: number,
  total: number,
  tecla: string,
): number | null {
  if (total === 0) return null;
  switch (tecla) {
    case "Home":
      return 0;
    case "End":
      return total - 1;
    case "ArrowDown":
    case "ArrowRight":
      return actual === -1 ? 0 : (actual + 1) % total;
    case "ArrowUp":
    case "ArrowLeft":
      return actual === -1 ? 0 : (actual - 1 + total) % total;
    default:
      return null;
  }
}
