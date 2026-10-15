/**
 * Construye la aplicación Fastify sin arrancarla: los tests la prueban con
 * `inject` y `servidor.ts` la pone a escuchar. Las dependencias externas (la
 * base de datos) entran como parámetros para poder sustituirlas en los tests.
 */
import Fastify, { type FastifyInstance } from "fastify";
import { registrarAsociaciones } from "./asociaciones/rutas.js";
import type { AsociacionResuelta, BaseDeAsociacion } from "./base-de-datos.js";
import { registrarSalud } from "./salud/rutas.js";
import { registrarZod } from "./zod-fastify.js";

export interface Dependencias {
  comprobarBaseDeDatos: () => Promise<boolean>;
  /** Dominio del que cuelgan los subdominios de las asociaciones. */
  dominioBase: string;
  resolverAsociacion: (subdominio: string) => Promise<AsociacionResuelta | null>;
  /** `conAsociacion` con el pool ya puesto: la única vía a datos de una asociación. */
  enAsociacion: <T>(
    asociacionId: string,
    fn: (base: BaseDeAsociacion) => Promise<T>,
  ) => Promise<T>;
}

export function construirApp(
  dependencias: Dependencias,
  opciones = { logger: false },
): FastifyInstance {
  const app = Fastify({ logger: opciones.logger });
  registrarZod(app);
  // Primero: su hook resuelve la asociación de toda petición que la necesite.
  registrarAsociaciones(app, dependencias);
  registrarSalud(app, dependencias);
  return app;
}
