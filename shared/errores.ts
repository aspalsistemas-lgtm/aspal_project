/**
 * Manejador de errores de Express, común a `server/index.ts` y `api/index.ts`.
 *
 * Antes cada consumidor tenía su copia: la del servidor de desarrollo relanzaba
 * el error después de responder (Express lo capturaba y destruía el socket sin
 * dejar rastro útil) y la de Vercel no registraba nada. Aquí se registra en
 * consola y se responde una sola vez.
 *
 * La respuesta conserva el contrato existente, `{ message }` con el status del
 * error o 500 (ver docs/api/endpoints.md). En la práctica solo se alcanza si
 * una excepción escapa de un handler: todos capturan las suyas.
 */
import type { NextFunction, Request, Response } from "express";

const MENSAJE_POR_DEFECTO = "Internal Server Error";

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
  res.status(status).json({ message: mensajeDe(error) });
}
