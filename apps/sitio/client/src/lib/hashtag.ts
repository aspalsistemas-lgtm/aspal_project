/** ¿Es una letra mayúscula? (también las acentuadas: Á, É, Ñ…) */
function esMayuscula(c: string): boolean {
  return c !== c.toLowerCase() && c === c.toUpperCase();
}

/** ¿Es una letra minúscula? */
function esMinuscula(c: string): boolean {
  return c !== c.toUpperCase() && c === c.toLowerCase();
}

/**
 * Parte un hashtag en sus palabras, por las mayúsculas que siguen a una
 * minúscula: «#NingunDirectorDirigeSolo» → ["#Ningun", "Director", "Dirige",
 * "Solo"]. El «#» queda pegado a la primera palabra.
 *
 * Para pintarlo con <wbr> entre ellas: una sola palabra de 25 letras no cabe
 * en móvil a tamaño de titular y crea scroll horizontal.
 */
export function partirHashtag(hashtag: string): string[] {
  const partes: string[] = [];
  let actual = "";
  for (const c of hashtag) {
    const anterior = actual.slice(-1);
    if (actual && esMayuscula(c) && esMinuscula(anterior)) {
      partes.push(actual);
      actual = "";
    }
    actual += c;
  }
  if (actual) partes.push(actual);
  return partes;
}
