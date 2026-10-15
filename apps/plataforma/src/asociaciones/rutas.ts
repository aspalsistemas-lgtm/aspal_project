/**
 * Resolución de la asociación de cada petición y `GET /asociaciones/actual`
 * (`docs/api/plataforma.md`).
 *
 * Un hook deduce el subdominio del `Host` y lo resuelve con
 * `app.resolver_asociacion`; las rutas de una asociación leen
 * `peticion.asociacion` y entran en su contexto con `enAsociacion`. El contexto
 * de RLS sale solo de aquí, nunca de un parámetro de la petición.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Dependencias } from "../app.js";
import type { AsociacionResuelta } from "../base-de-datos.js";
import { asociacion } from "../esquema.js";
import { cuerpoError } from "../zod-fastify.js";
import { subdominioDesdeHost } from "./host.js";

declare module "fastify" {
  interface FastifyRequest {
    /** La asociación del `Host`, o null si la dirección no es de ninguna. */
    asociacion: AsociacionResuelta | null;
  }
}

/** Rutas que no dependen de ninguna asociación: no se resuelve nada para ellas. */
const RUTAS_GLOBALES = ["/health"];

const RESPUESTA_ACTUAL = z.object({
  success: z.literal(true),
  data: z.object({ nombre: z.string(), subdominio: z.string(), zonaHoraria: z.string() }),
});

const RESPUESTA_ERROR = z.object({
  success: z.literal(false),
  error: z.object({ codigo: z.string(), mensaje: z.string() }),
});

export function registrarAsociaciones(
  app: FastifyInstance,
  { dominioBase, resolverAsociacion, enAsociacion }: Dependencias,
): void {
  app.decorateRequest("asociacion", null);

  app.addHook("onRequest", async (peticion) => {
    // Sin ruta (un 404) o ruta global: no hay nada que atender en nombre de una
    // asociación, y consultar la base por cada dirección inventada sería una
    // amplificación gratuita (auditoría, hallazgo 12).
    const ruta = peticion.routeOptions.url;
    if (!ruta || RUTAS_GLOBALES.includes(ruta)) return;
    // headers.host y no X-Forwarded-Host: ese lo pone quien quiera.
    const subdominio = subdominioDesdeHost(peticion.headers.host, dominioBase);
    peticion.asociacion = subdominio ? await resolverAsociacion(subdominio) : null;
  });

  app.get(
    "/asociaciones/actual",
    { schema: { response: { 200: RESPUESTA_ACTUAL, 404: RESPUESTA_ERROR } } },
    async (peticion, respuesta) => {
      // Depende del Host: ninguna caché compartida debe guardarla.
      respuesta.header("Cache-Control", "private, no-store");
      if (!peticion.asociacion) {
        return respuesta
          .code(404)
          .send(
            cuerpoError(
              "RECURSO_NO_ENCONTRADO",
              "No hay una asociación en esta dirección",
            ),
          );
      }
      // Los datos se leen a través de RLS, dentro del contexto de la asociación:
      // sin filtro propio, la base solo devuelve la fila de esta asociación.
      const filas = await enAsociacion(peticion.asociacion.id, (base) =>
        base
          .select({
            nombre: asociacion.nombre,
            subdominio: asociacion.subdominio,
            zonaHoraria: asociacion.zonaHoraria,
          })
          .from(asociacion),
      );
      if (filas.length !== 1) {
        throw new Error(`RLS devolvió ${filas.length} asociaciones en un contexto`);
      }
      return { success: true as const, data: filas[0]! };
    },
  );
}
