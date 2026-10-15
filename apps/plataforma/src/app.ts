/**
 * Construye la aplicación Fastify sin arrancarla: los tests la prueban con
 * `inject` y `servidor.ts` la pone a escuchar. Las dependencias externas (la
 * base de datos) entran como parámetros para poder sustituirlas en los tests.
 */
import type { Writable } from "node:stream";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import type { ServicioContrasenas } from "./acceso/contrasenas.js";
import { registrarGestionDePersonas } from "./acceso/rutas-personas.js";
import { registrarSesiones } from "./acceso/rutas-sesion.js";
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
  /** Secreto del servidor para las claves HMAC de los límites de uso. */
  secretoClaves: string;
  contrasenas: ServicioContrasenas;
  /** Probabilidad de limpiar tablas de acceso en un login (0 a 1). Por defecto, 0,02. */
  probabilidadLimpieza?: number;
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
  app.register(cookie);
  // Primero: sus hooks exigen categoría a toda ruta y resuelven la asociación.
  registrarProteccion(app, dependencias);
  registrarAsociaciones(app, dependencias);
  registrarSesiones(app, dependencias);
  registrarGestionDePersonas(app, dependencias);
  registrarSalud(app, dependencias);
  return app;
}
