/**
 * Errores de negocio esperados de las rutas de acceso (plan del corte 3,
 * `docs/api/plataforma.md`). Extienden `RevertirTransaccion`: lanzados dentro de
 * `conAsociacion` revierten la transacción pero la conexión vuelve limpia al pool.
 */
import { RevertirTransaccion } from "../base-de-datos.js";
import { cuerpoError } from "../zod-fastify.js";

export class RespuestaDeError extends RevertirTransaccion {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    readonly campo?: string,
  ) {
    super(mensaje);
  }
}

/** Sin sesión válida: cookie ausente, desconocida, caducada, revocada o de otra asociación. */
export const noAutenticado = () =>
  new RespuestaDeError(401, "NO_AUTENTICADO", "Inicia sesión para continuar");

export const prohibido = (mensaje = "No tienes permiso para hacer esto") =>
  new RespuestaDeError(403, "PROHIBIDO", mensaje);

export const noEncontrado = (mensaje = "No existe") =>
  new RespuestaDeError(404, "RECURSO_NO_ENCONTRADO", mensaje);

export const conflicto = (codigo: string, mensaje: string) =>
  new RespuestaDeError(409, codigo, mensaje);

/** Token desconocido, caducado, usado, revocado o de otra asociación: siempre el mismo cuerpo. */
export const cuerpoEnlaceInvalido = () =>
  cuerpoError("ENLACE_INVALIDO", "El enlace no es válido o ya caducó");

/**
 * El SQLSTATE de un error de PostgreSQL, lo envuelva Drizzle o no (`error.cause.code`).
 * Sirve para tratar como respuesta de negocio una violación de clave única (`23505`), un
 * interbloqueo (`40P01`) o un `lock_timeout` (`55P03`).
 */
export function codigoPostgres(error: unknown): string | undefined {
  for (let actual: unknown = error, i = 0; actual && i < 4; i++) {
    const codigo = (actual as { code?: unknown }).code;
    if (typeof codigo === "string" && /^[0-9A-Z]{5}$/.test(codigo)) return codigo;
    actual = (actual as { cause?: unknown }).cause;
  }
  return undefined;
}
