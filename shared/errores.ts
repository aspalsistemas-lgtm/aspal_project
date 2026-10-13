/**
 * Manejador de errores de Express, común a `server/index.ts` y `api/index.ts`.
 *
 * Antes cada consumidor tenía su copia: la del servidor de desarrollo relanzaba
 * el error después de responder (Express lo capturaba y destruía el socket sin
 * dejar rastro útil) y la de Vercel no registraba nada. Aquí se registra en
 * consola y se responde una sola vez.
 *
 * Dos contratos de respuesta, según el error:
 * - `ErrorDeAplicacion` (endpoints nuevos): el sobre único
 *   `{ success: false, error: { codigo, mensaje, campo? } }`.
 * - Cualquier otro error (endpoints existentes): el contrato congelado,
 *   `{ message }` con el status del error o 500 (ver docs/api/endpoints.md).
 * En la práctica solo se alcanza si una excepción escapa de un handler: los
 * existentes capturan las suyas.
 */
import type { NextFunction, Request, Response } from "express";

const MENSAJE_POR_DEFECTO = "Internal Server Error";

/**
 * Error esperado de un endpoint nuevo. Se lanza (o se pasa a `next`) y el
 * manejador lo traduce al sobre único. `mensaje` llega tal cual al cliente:
 * en español y sin detalles internos.
 */
export class ErrorDeAplicacion extends Error {
  readonly codigo: string;
  readonly status: number;
  readonly campo?: string;

  constructor(codigo: string, status: number, mensaje: string, campo?: string) {
    super(mensaje);
    this.name = "ErrorDeAplicacion";
    this.codigo = codigo;
    this.status = status;
    this.campo = campo;
  }
}

interface ErrorHttp {
  status?: unknown;
  statusCode?: unknown;
  message?: unknown;
}

function esObjeto(valor: unknown): valor is ErrorHttp {
  return typeof valor === "object" && valor !== null;
}

/** `status` o `statusCode` si es un código HTTP válido; si no, 500. */
function statusDe(error: unknown): number {
  if (!esObjeto(error)) return 500;
  const candidato = error.status ?? error.statusCode;
  return typeof candidato === "number" && candidato >= 400 && candidato <= 599
    ? candidato
    : 500;
}

function mensajeDe(error: unknown): string {
  return esObjeto(error) && typeof error.message === "string" && error.message
    ? error.message
    : MENSAJE_POR_DEFECTO;
}

export function manejadorDeErrores(
  error: unknown,
  req: Request,
  res: Response,
  // Express identifica un manejador de errores por su aridad: los cuatro
  // parámetros tienen que estar aunque `next` no se use.
  _next: NextFunction,
): void {
  const status = statusDe(error);
  // El error completo (con pila) va al log; a la respuesta solo el mensaje.
  console.error(`${req.method} ${req.originalUrl} → ${status}:`, error);
  if (error instanceof ErrorDeAplicacion) {
    res.status(status).json({
      success: false,
      error: {
        codigo: error.codigo,
        mensaje: error.message,
        ...(error.campo !== undefined && { campo: error.campo }),
      },
    });
    return;
  }
  res.status(status).json({ message: mensajeDe(error) });
}
