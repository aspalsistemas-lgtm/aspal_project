/**
 * `conSesion` y `rutaAutenticada` (plan del corte 3, CA-16).
 *
 * Una petición autenticada abre **un único** `conAsociacion`: dentro, resuelve la
 * sesión, la persona y los roles y ejecuta el manejador, con los permisos leídos de la
 * base en **esa misma petición** (nada de roles en la cookie ni en una caché). Así no
 * hay una ventana entre «comprobar» y «hacer» en la que un rol revocado siga valiendo.
 *
 * Una ruta de categoría `autenticada` solo puede registrarse con `rutaAutenticada`
 * (el guardián de `proteccion.ts` lo exige): no existe una ruta autenticada que olvide
 * pedir la sesión.
 *
 * Cualquier fallo de sesión responde el **mismo** `401 NO_AUTENTICADO`: cookie ausente,
 * desconocida, caducada, revocada, de otra asociación o de una persona no activa.
 */
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
} from "fastify";
import type { Dependencias } from "../app.js";
import type { BaseDeAsociacion } from "../base-de-datos.js";
import { cuerpoError } from "../zod-fastify.js";
import { nombreCookieSesion, opcionesParaBorrar } from "./cookie.js";
import { RespuestaDeError, noAutenticado } from "./errores.js";
import { sesionVigente } from "./politica-sesion.js";
import type { Rol } from "./rol.js";
import { hashDeToken, resolverSesion, tocarSesion } from "./sesiones.js";

/** Lo que ve un manejador autenticado: quién es y la base **ya dentro de su contexto**. */
export interface ContextoSesion {
  base: BaseDeAsociacion;
  asociacionId: string;
  sesionId: string;
  cuentaId: string;
  personaId: string;
  nombre: string;
  roles: Rol[];
  expiraEn: Date;
  /** Ejecuta `fn` solo si la transacción se confirma (por ejemplo, enviar un correo). */
  alConfirmar: (fn: () => void) => void;
}

type DependenciasDeSesion = Pick<Dependencias, "enAsociacion" | "esquemaPublico">;

/** Un token de sesión válido en forma: 32 bytes en base64url. Lo demás ni toca la base. */
const FORMA_DE_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export async function conSesion<T>(
  dependencias: DependenciasDeSesion,
  peticion: FastifyRequest,
  fn: (contexto: ContextoSesion) => Promise<T>,
): Promise<T> {
  const asociacion = peticion.asociacion;
  const token = peticion.cookies?.[nombreCookieSesion(dependencias.esquemaPublico)];
  if (!asociacion || !token || !FORMA_DE_TOKEN.test(token)) throw noAutenticado();

  const alConfirmar: Array<() => void> = [];
  const resultado = await dependencias.enAsociacion(asociacion.id, async (base) => {
    const sesion = await resolverSesion(base, hashDeToken(token));
    if (
      !sesion ||
      sesion.revocada ||
      // La caducidad guardada también cuenta, además de las medidas por inactividad.
      sesion.expiraEn.getTime() <= Date.now() ||
      sesion.estadoPersona !== "activa" ||
      // Con los roles ACTUALES: un miembro ascendido a administrador pierde su sesión larga.
      !sesionVigente(sesion, sesion.roles)
    ) {
      throw noAutenticado();
    }
    await tocarSesion(base, sesion.sesionId);
    return fn({
      base,
      asociacionId: asociacion.id,
      sesionId: sesion.sesionId,
      cuentaId: sesion.cuentaId,
      personaId: sesion.personaId,
      nombre: sesion.nombre,
      roles: sesion.roles,
      expiraEn: sesion.expiraEn,
      alConfirmar: (accion) => void alConfirmar.push(accion),
    });
  });
  // La transacción ya se confirmó: ahora sí, lo que dependía de ello.
  for (const accion of alConfirmar) accion();
  return resultado;
}

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface OpcionesRutaAutenticada {
  metodo: Metodo;
  url: string;
  schema?: FastifySchema;
}

/** Registra una ruta de categoría `autenticada` y envuelve su manejador en `conSesion`. */
export function rutaAutenticada(
  app: FastifyInstance,
  dependencias: DependenciasDeSesion,
  { metodo, url, schema }: OpcionesRutaAutenticada,
  manejador: (
    contexto: ContextoSesion,
    peticion: FastifyRequest,
    respuesta: FastifyReply,
  ) => Promise<unknown>,
): void {
  app.route({
    method: metodo,
    url,
    schema,
    config: { categoria: "autenticada", conSesion: true },
    // Sin cookie válida en forma, 401 antes de validar el cuerpo: quien no ha entrado
    // no recibe un 400 distinto según lo que mande. No toca la base.
    preValidation: async (peticion, respuesta) => {
      const token = peticion.cookies?.[nombreCookieSesion(dependencias.esquemaPublico)];
      if (peticion.asociacion && token && FORMA_DE_TOKEN.test(token)) return;
      const error = noAutenticado();
      return respuesta
        .clearCookie(
          nombreCookieSesion(dependencias.esquemaPublico),
          opcionesParaBorrar(dependencias.esquemaPublico),
        )
        .code(error.estado)
        .send(cuerpoError(error.codigo, error.message));
    },
    handler: async (peticion, respuesta) => {
      try {
        return await conSesion(dependencias, peticion, (contexto) =>
          manejador(contexto, peticion, respuesta),
        );
      } catch (error) {
        if (!(error instanceof RespuestaDeError)) throw error;
        // Sin sesión: se borra la cookie, que ya no sirve.
        if (error.estado === 401) {
          respuesta.clearCookie(
            nombreCookieSesion(dependencias.esquemaPublico),
            opcionesParaBorrar(dependencias.esquemaPublico),
          );
        }
        return respuesta
          .code(error.estado)
          .send(cuerpoError(error.codigo, error.message, error.campo));
      }
    },
  });
}
