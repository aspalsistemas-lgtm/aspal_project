/**
 * Iniciales de un nombre (las dos primeras palabras, en mayúscula) para el
 * retrato sin foto: «Patricia Hernández de Anda» → «PH». Lo usan VocesRed y
 * RetratoHex.
 */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]!.toUpperCase())
    .join("");
}
