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

export { codigoPostgres } from "../errores-postgres.js";
