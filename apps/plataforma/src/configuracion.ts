/**
 * Configuración de la plataforma, validada al arrancar.
 *
 * Si falta algo o no tiene forma válida, el proceso no arranca y el mensaje dice
 * qué variable revisar. Nunca repite el valor recibido: `DATABASE_URL` lleva la
 * contraseña de la base.
 */
import { z } from "zod";

const ESQUEMA_ENTORNO = z.object({
  DATABASE_URL: z
    .string({ error: "falta" })
    .regex(/^postgres(ql)?:\/\//, { error: "debe ser una URL postgres://" }),
  PORT: z.coerce
    .number({ error: "debe ser un número" })
    .int({ error: "debe ser un entero" })
    .min(1, { error: "fuera de rango (1-65535)" })
    .max(65535, { error: "fuera de rango (1-65535)" })
    .default(3000),
});

export interface Configuracion {
  urlBaseDeDatos: string;
  puerto: number;
}

export function cargarConfiguracion(
  entorno: Record<string, string | undefined>,
): Configuracion {
  const resultado = ESQUEMA_ENTORNO.safeParse(entorno);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((problema) => `${problema.path.join(".")}: ${problema.message}`)
      .join("; ");
    throw new Error(`Configuración inválida: ${problemas}`);
  }
  return { urlBaseDeDatos: resultado.data.DATABASE_URL, puerto: resultado.data.PORT };
}
