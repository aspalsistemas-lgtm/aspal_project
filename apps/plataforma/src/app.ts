/**
 * Construye la aplicación Fastify sin arrancarla: los tests la prueban con
 * `inject` y `servidor.ts` la pone a escuchar. Las dependencias externas (la
 * base de datos) entran como parámetros para poder sustituirlas en los tests.
 */
import type { Writable } from "node:stream";
import Fastify, { type FastifyInstance } from "fastify";
import { registrarAsociaciones } from "./asociaciones/rutas.js";
import type { AsociacionResuelta, BaseDeAsociacion } from "./base-de-datos.js";
import {
  registrarProteccion,
  serializadorDeReq,
  type LimiteGrueso,
} from "./http/proteccion.js";
import { registrarSalud } from "./salud/rutas.js";
import { registrarZod } from "./zod-fastify.js";

export interface Dependencias {
  comprobarBaseDeDatos: () => Promise<boolean>;
  /** Dominio del que cuelgan los subdominios de las asociaciones. */
  dominioBase: string;
  /** `https` salvo en desarrollo local (la configuración lo impide en otro dominio). */
  esquemaPublico: "http" | "https";
  /** Solo en local (`http://aspal.localhost:5010`): para el `Origin` esperado. */
  puertoPublico: number | undefined;
  /** `0` (ningún proxy) o las IP/CIDR exactas del balanceador. */
  trustProxy: 0 | string[];
  limiteGrueso: LimiteGrueso;
  resolverAsociacion: (subdominio: string) => Promise<AsociacionResuelta | null>;
  /** `conAsociacion` con el pool ya puesto: la única vía a datos de una asociación. */
  enAsociacion: <T>(
    asociacionId: string,
    fn: (base: BaseDeAsociacion) => Promise<T>,
  ) => Promise<T>;
}

export interface OpcionesApp {
  /** `true` para el log por defecto; un flujo propio para capturarlo (tests). */
  logger?: boolean | { stream: Writable };
}

function opcionesDeLog(logger: OpcionesApp["logger"]) {
  if (!logger) return false;
  // El `req` del log nunca lleva la query de la URL: puede traer tokens de un solo
  // uso (enlaces de correo) y los logs no son un lugar para secretos.
  const serializers = { req: serializadorDeReq };
  return logger === true ? { serializers } : { serializers, stream: logger.stream };
}

export function construirApp(
  dependencias: Dependencias,
  opciones: OpcionesApp = {},
): FastifyInstance {
  const app = Fastify({
    logger: opcionesDeLog(opciones.logger),
    // 0 = ninguno: `request.ip` es el de la conexión. Nunca `true` ni un número.
    trustProxy: dependencias.trustProxy === 0 ? false : dependencias.trustProxy,
  });
  registrarZod(app);
  // Primero: sus hooks exigen categoría a toda ruta y resuelven la asociación.
  registrarProteccion(app, dependencias);
  registrarAsociaciones(app, dependencias);
  registrarSalud(app, dependencias);
  return app;
}
