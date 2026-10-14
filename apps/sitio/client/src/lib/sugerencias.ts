/**
 * Lógica de la página 404: adivinar a dónde quería ir la persona, ofrecerle
 * salidas reales y facilitarle avisar del enlace roto.
 *
 * Pura y sin DOM para poder probarla: la página solo la pinta.
 */

import { CONTACTO, URL_SITIO } from "./marca";
import { NAVEGACION, destinosDe, type DestinoNav } from "./navegacion";
import { RUTAS_ESTATICAS, esRutaConocida } from "./rutas";

/** Erratas que se perdonan: hasta dos letras cambiadas, sobrantes o faltantes. */
const DISTANCIA_MAXIMA = 2;

/** Distancia de Levenshtein entre dos cadenas. */
function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const arriba = fila[j];
      fila[j] = Math.min(
        fila[j] + 1,
        fila[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = arriba;
    }
  }
  return fila[b.length];
}

/** Minúsculas, sin tildes, sin consulta ni ancla, sin extensión ni barras sobrantes. */
function normalizar(ruta: string): string {
  let r = ruta.split(/[?#]/)[0];
  try {
    r = decodeURI(r);
  } catch {
    // Dirección mal codificada: se compara tal cual.
  }
  r = r
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\/index\.[a-z]+$/, "/")
    .replace(/\.(html?|php|aspx?)$/, "")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");
  return r === "" ? "/" : r;
}

/**
 * La ruta existente que la persona probablemente quería, o `null`. Primero
 * prueba la dirección normalizada tal cual (`/Blog/` → `/blog`) y después
 * corrige erratas en el primer segmento (`/blogs/x` → `/blog/x`).
 */
export function sugerirRuta(ruta: string): string | null {
  const normalizada = normalizar(ruta);
  if (normalizada === "/") return null;
  if (esRutaConocida(normalizada)) return normalizada;

  const [, primero = "", ...resto] = normalizada.split("/");
  let mejor: string | null = null;
  let menor = DISTANCIA_MAXIMA + 1;
  for (const candidata of RUTAS_ESTATICAS) {
    if (candidata === "/") continue;
    const d = distancia(primero, candidata.slice(1));
    if (d < menor) {
      menor = d;
      mejor = candidata;
    }
  }
  if (!mejor) return null;

  const completa = [mejor, ...resto].join("/");
  return resto.length > 0 && esRutaConocida(completa) ? completa : mejor;
}

/**
 * Destinos del menú que existen, en su orden y sin repetir URL: la comunidad
 * aparece en Recursos y en su propio rubro, y el 404 no debe ofrecerla dos veces.
 */
export function destinosSugeridos(): DestinoNav[] {
  const vistos = new Set<string>();
  return NAVEGACION.flatMap(destinosDe).filter((destino) => {
    if (!destino.href || vistos.has(destino.href)) return false;
    vistos.add(destino.href);
    return true;
  });
}

/** Correo prellenado para avisar de un enlace roto: dirección y origen incluidos. */
export function enlaceReporte(ruta: string, referente: string): string {
  const asunto = "Enlace roto en el sitio de ASPAL";
  const cuerpo = [
    "Hola, llegué a una página que no existe.",
    "",
    `Dirección: ${URL_SITIO}${ruta}`,
    `Venía de: ${referente || "no lo sé"}`,
  ].join("\n");
  return `mailto:${CONTACTO.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
