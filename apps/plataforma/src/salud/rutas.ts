/**
 * GET /health (`docs/api/plataforma.md`). Lo consulta el healthcheck del
 * contenedor: sin base de datos la plataforma no sirve nada útil, así que
 * responde 503 para que el orquestador deje de mandarle tráfico.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Dependencias } from "../app.js";
import { cuerpoError } from "../zod-fastify.js";

const RESPUESTA_OK = z.object({
  success: z.literal(true),
  data: z.object({ estado: z.literal("ok"), baseDeDatos: z.literal("ok") }),
});

const RESPUESTA_ERROR = z.object({
  success: z.literal(false),
  error: z.object({ codigo: z.string(), mensaje: z.string() }),
});

export function registrarSalud(
  app: FastifyInstance,
  { comprobarBaseDeDatos }: Dependencias,
): void {
  app.get(
    "/health",
    { schema: { response: { 200: RESPUESTA_OK, 503: RESPUESTA_ERROR } } },
    async (peticion, respuesta) => {
      let responde = false;
      try {
        responde = await comprobarBaseDeDatos();
      } catch (error) {
        // El detalle va al log del servidor, nunca a la respuesta.
        peticion.log.warn({ err: error }, "la comprobación de la base lanzó");
      }
      if (!responde) {
        return respuesta
          .code(503)
          .send(cuerpoError("NO_DISPONIBLE", "La base de datos no responde"));
      }
      return {
        success: true as const,
        data: { estado: "ok" as const, baseDeDatos: "ok" as const },
      };
    },
  );
}
