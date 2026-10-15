/**
 * `GET /asociaciones/actual` (`docs/api/plataforma.md`).
 *
 * La asociación de la petición la resuelve la capa común (`http/proteccion.ts`) a
 * partir del `Host`; la ruta la lee de `peticion.asociacion` y entra en su
 * contexto con `enAsociacion`. El contexto de RLS sale solo de ahí, nunca de un
 * parámetro de la petición.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Dependencias } from "../app.js";
import { asociacion } from "../esquema.js";
import { cuerpoError } from "../zod-fastify.js";

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
  { enAsociacion }: Dependencias,
): void {
  app.get(
    "/asociaciones/actual",
    {
      config: { categoria: "publica" },
      schema: { response: { 200: RESPUESTA_ACTUAL, 404: RESPUESTA_ERROR } },
    },
    async (peticion, respuesta) => {
      // La capa común ya respondió 404 si el Host no es de ninguna asociación; esto
      // solo estrecha el tipo.
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
