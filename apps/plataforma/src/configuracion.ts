/**
 * Configuración de la plataforma, validada al arrancar.
 *
 * Si falta algo o no tiene forma válida, el proceso no arranca y el mensaje dice
 * qué variable revisar. Nunca repite el valor recibido: las URL llevan
 * contraseñas.
 *
 * Hay dos configuraciones separadas a propósito (plan del corte 2, §3): la de la
 * aplicación, que solo conoce la URL del rol `aspal_app`, y la de administración
 * (preparar la base, migrar, sembrar), que nunca se carga en el servidor.
 */
import { z } from "zod";

const URL_POSTGRES = z
  .string({ error: "falta" })
  .regex(/^postgres(ql)?:\/\//, { error: "debe ser una URL postgres://" });

/**
 * ¿Trae la URL el parámetro `options` (aunque venga codificado, `%6Fptions`)?
 * Con `options=-c app.asociacion_id=…` cada conexión nacería dentro de una
 * asociación (auditoría, hallazgo 5).
 */
function llevaOpciones(url: string): boolean {
  try {
    return [...new URL(url).searchParams.keys()].some(
      (clave) => clave.toLowerCase() === "options",
    );
  } catch {
    return true;
  }
}

const ESQUEMA_APLICACION = z.object({
  DATABASE_URL: URL_POSTGRES.refine((url) => !llevaOpciones(url), {
    error: "no puede llevar options= (fijaría un contexto por defecto)",
  }),
  // pg lee PGOPTIONS del entorno: el mismo riesgo que options= en la URL.
  PGOPTIONS: z.never({ error: "no se permite: fijaría opciones de sesión" }).optional(),
  // Solo el nombre del dominio: el subdominio de cada asociación cuelga de él.
  DOMINIO_BASE: z
    .string({ error: "falta" })
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/, {
      error: "debe ser un dominio en minúsculas, sin esquema, puerto ni ruta",
    }),
  PORT: z.coerce
    .number({ error: "debe ser un número" })
    .int({ error: "debe ser un entero" })
    .min(1, { error: "fuera de rango (1-65535)" })
    .max(65535, { error: "fuera de rango (1-65535)" })
    .default(3000),
});

const ESQUEMA_ADMIN = z.object({
  DATABASE_URL_ADMIN: URL_POSTGRES,
  // Solo la usa db:preparar, para dar LOGIN al rol de la aplicación.
  DATABASE_PASSWORD_APP: z
    .string()
    .min(12, { error: "debe tener al menos 12 caracteres" })
    .optional(),
});

export interface Configuracion {
  urlBaseDeDatos: string;
  dominioBase: string;
  puerto: number;
}

export interface ConfiguracionAdmin {
  urlAdmin: string;
  claveRolApp?: string;
}

type Entorno = Record<string, string | undefined>;

/** Mensaje con la variable y el problema, sin el valor recibido. */
function describirProblemas(error: z.ZodError): string {
  return error.issues
    .map((problema) => `${problema.path.join(".")}: ${problema.message}`)
    .join("; ");
}

export function cargarConfiguracion(entorno: Entorno): Configuracion {
  const resultado = ESQUEMA_APLICACION.safeParse(entorno);
  if (!resultado.success) {
    throw new Error(`Configuración inválida: ${describirProblemas(resultado.error)}`);
  }
  return {
    urlBaseDeDatos: resultado.data.DATABASE_URL,
    dominioBase: resultado.data.DOMINIO_BASE,
    puerto: resultado.data.PORT,
  };
}

export function cargarConfiguracionAdmin(entorno: Entorno): ConfiguracionAdmin {
  const resultado = ESQUEMA_ADMIN.safeParse(entorno);
  if (!resultado.success) {
    throw new Error(
      `Configuración de administración inválida: ${describirProblemas(resultado.error)}`,
    );
  }
  return {
    urlAdmin: resultado.data.DATABASE_URL_ADMIN,
    claveRolApp: resultado.data.DATABASE_PASSWORD_APP,
  };
}
