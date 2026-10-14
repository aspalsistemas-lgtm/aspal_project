import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Formatea una fecha ISO de forma defensiva.
 *
 * `format(new Date("basura"))` lanza `RangeError`, y en React eso tumba el
 * árbol entero: una fecha malformada en un solo post dejaba el sitio en
 * pantalla en blanco. Devuelve `null` en vez de lanzar para que quien llama
 * decida qué pintar (normalmente, nada).
 */
export function formatPublishedDate(
  isoDate: string | undefined | null,
  pattern = "d MMM, yyyy",
): string | null {
  if (!isoDate) {
    return null;
  }

  const parsed = new Date(isoDate);

  if (!isValid(parsed)) {
    return null;
  }

  return format(parsed, pattern, { locale: es });
}
