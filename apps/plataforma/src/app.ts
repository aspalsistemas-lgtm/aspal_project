/**
 * Construye la aplicación Fastify sin arrancarla: los tests la prueban con
 * `inject` y `servidor.ts` la pone a escuchar. Las dependencias externas (la
 * base de datos) entran como parámetros para poder sustituirlas en los tests.
 */
import Fastify, { type FastifyInstance } from "fastify";
import { registrarSalud } from "./salud/rutas.js";
import { registrarZod } from "./zod-fastify.js";

export interface Dependencias {
  comprobarBaseDeDatos: () => Promise<boolean>;
}

export function construirApp(
  dependencias: Dependencias,
  opciones = { logger: false },
): FastifyInstance {
  const app = Fastify({ logger: opciones.logger });
  registrarZod(app);
  registrarSalud(app, dependencias);
  return app;
}
