import type { ErroresSuscripcion } from "@shared/suscripcion/tipos";

export type RespuestaEnvio =
  | { estado: "exito" }
  | { estado: "invalido"; errores: ErroresSuscripcion }
  | { estado: "error" };

/**
 * Envía la suscripción a `/api/suscripcion`. Nunca lanza: traduce cada
 * respuesta a un estado que el formulario sabe pintar. 503 (sin configurar) y
 * 502 (proveedor caído) son error, jamás éxito.
 */
export async function enviarSuscripcion(
  datos: Record<string, unknown>,
): Promise<RespuestaEnvio> {
  try {
    const respuesta = await fetch("/api/suscripcion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
      // Tiempo máximo: si el servidor no contesta, el formulario no se queda colgado.
      // Safari < 16 no tiene AbortSignal.timeout.
      signal:
        typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(10000)
          : undefined,
    });
    if (respuesta.ok) return { estado: "exito" };
    if (respuesta.status === 400) {
      const cuerpo = (await respuesta.json().catch(() => ({}))) as {
        errores?: ErroresSuscripcion;
      };
      return { estado: "invalido", errores: cuerpo.errores ?? {} };
    }
    return { estado: "error" };
  } catch {
    return { estado: "error" };
  }
}
