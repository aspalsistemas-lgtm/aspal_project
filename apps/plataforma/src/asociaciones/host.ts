/**
 * Del `Host` de la petición al subdominio de la asociación
 * (`docs/api/plataforma.md`, «Resolución de la asociación por subdominio»).
 *
 * Función pura: decide solo la forma. Si el subdominio existe lo decide la base
 * (`app.resolver_asociacion`). `X-Forwarded-Host` no se lee nunca: con él,
 * cualquiera podría pedir en nombre de otra asociación.
 */
import { FORMATO_SUBDOMINIO, SUBDOMINIOS_RESERVADOS } from "./subdominios.js";

const ETIQUETA = new RegExp(FORMATO_SUBDOMINIO);

export function subdominioDesdeHost(
  host: string | undefined,
  dominioBase: string,
): string | null {
  if (!host) return null;
  let nombre = host.toLowerCase();
  // Literal IPv6 (`[::1]:5010`): nunca es el host de una asociación.
  if (nombre.startsWith("[")) return null;
  nombre = nombre.replace(/:\d+$/, "").replace(/\.$/, "");
  const sufijo = `.${dominioBase}`;
  if (!nombre.endsWith(sufijo)) return null;
  const subdominio = nombre.slice(0, -sufijo.length);
  // El formato de etiqueta excluye los puntos: un solo nivel.
  if (!ETIQUETA.test(subdominio)) return null;
  if ((SUBDOMINIOS_RESERVADOS as readonly string[]).includes(subdominio)) return null;
  return subdominio;
}
