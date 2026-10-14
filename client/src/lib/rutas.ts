/**
 * Fuente única de las rutas que existen en el sitio.
 *
 * La consumen `App.tsx` (qué página pinta cada ruta) y el test de navegación
 * (ningún enlace del menú puede apuntar a una ruta que no existe); después la
 * usarán también el prerender y el sitemap. Si una ruta no está aquí, no
 * existe.
 *
 * Existe porque el menú llegó a prometer doce destinos de los que diez no
 * llevaban a ningún sitio, y nada lo detectaba.
 */

/** Rutas sin parámetros. Cada una tiene su página en `App.tsx`. */
export const RUTAS_ESTATICAS = [
  "/",
  "/blog",
  "/podcast",
  "/plataforma",
  "/unete",
  "/eventos",
  "/que-hacemos",
  "/nuestro-equipo",
  "/nosotros",
  "/mapa-de-ruta",
  "/aviso-de-privacidad",
  "/terminos",
  "/componentes",
] as const;
export type RutaEstatica = (typeof RUTAS_ESTATICAS)[number];

/** Rutas con parámetros, en la sintaxis de wouter. */
export const RUTAS_DINAMICAS = ["/blog/:slug"] as const;
export type RutaDinamica = (typeof RUTAS_DINAMICAS)[number];

/** Compara segmento a segmento; un `:parámetro` acepta cualquier valor no vacío. */
function coincidePatron(patron: string, ruta: string): boolean {
  const esperados = patron.split("/");
  const recibidos = ruta.split("/");
  return (
    esperados.length === recibidos.length &&
    esperados.every((segmento, i) =>
      segmento.startsWith(":") ? recibidos[i] !== "" : segmento === recibidos[i],
    )
  );
}

/**
 * ¿Lleva este enlace interno a una página que existe?
 *
 * Se ignoran `#ancla` y `?consulta`: `/que-hacemos#tecnologia` existe si
 * existe `/que-hacemos`. La barra final no se normaliza: `/blog/` no es una
 * forma canónica y no debe aparecer en el menú.
 */
export function esRutaConocida(href: string): boolean {
  const ruta = href.split(/[?#]/)[0];
  return (
    (RUTAS_ESTATICAS as readonly string[]).includes(ruta) ||
    RUTAS_DINAMICAS.some((patron) => coincidePatron(patron, ruta))
  );
}

/**
 * La forma canónica de una ruta estática escrita con otras mayúsculas
 * (`/Blog` → `/blog`), o `null` si ya es canónica o no es estática. Las
 * rutas dinámicas no se tocan: el slug es del autor y el servidor ya las sirve.
 */
export function rutaCanonica(ruta: string): RutaEstatica | null {
  const minusculas = ruta.toLowerCase();
  if (minusculas === ruta) return null;
  return (RUTAS_ESTATICAS as readonly string[]).includes(minusculas)
    ? (minusculas as RutaEstatica)
    : null;
}
