/**
 * Ruta interna anterior, para que el 404 sepa desde qué página del sitio se
 * llegó a un enlace roto (`document.referrer` no cambia al navegar dentro de
 * la SPA). Dos casillas: el orden de los efectos no importa, porque el 404
 * solo lee `anterior` si `actual` ya es su propia ruta.
 */
let actual: string | null = null;
let anterior: string | null = null;

export function registrarRuta(ruta: string): void {
  if (ruta === actual) return;
  anterior = actual;
  actual = ruta;
}

export function rutaAnterior(ruta: string): string | null {
  return actual === ruta ? anterior : null;
}
