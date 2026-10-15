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
import { isIP } from "node:net";
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

/** ¿Es un dominio de desarrollo (`localhost` o `*.localhost`)? */
function esDominioLocal(dominio: string): boolean {
  return dominio === "localhost" || dominio.endsWith(".localhost");
}

/**
 * `TRUST_PROXY`: `0` (ningún proxy) o la lista exacta de IP/CIDR del balanceador.
 * Nunca `true` ni un número de saltos: contar saltos no valida al par inmediato, y
 * quien llegara directo podría falsificar `X-Forwarded-For` y esquivar el límite por
 * origen (auditoría del corte 3, A4). Fastify, de hecho, falla cerrado con un número.
 */
function esIpOCidr(texto: string): boolean {
  const [direccion = "", prefijo, resto] = texto.split("/");
  if (resto !== undefined) return false;
  const version = isIP(direccion);
  if (version === 0) return false;
  if (prefijo === undefined) return true;
  if (!/^\d{1,3}$/.test(prefijo)) return false;
  return Number(prefijo) <= (version === 4 ? 32 : 128);
}

function interpretarTrustProxy(valor: string): 0 | string[] | undefined {
  if (valor === "0") return 0;
  const lista = valor.split(",").map((elemento) => elemento.trim());
  return lista.every(esIpOCidr) ? lista : undefined;
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
  // Secreto del servidor para las claves HMAC de los límites de uso: sin él, una
  // base robada permitiría reconstruir qué correos y orígenes se limitaron.
  SECRETO_CLAVES: z
    .string({ error: "falta" })
    .min(32, { error: "debe tener al menos 32 caracteres" }),
  TRUST_PROXY: z.string().optional(),
  ESQUEMA_PUBLICO: z
    .enum(["http", "https"], { error: "debe ser http o https" })
    .default("https"),
  // Solo para que el Origin esperado coincida en local (http://aspal.localhost:5010).
  PUERTO_PUBLICO: z.coerce
    .number({ error: "debe ser un número" })
    .int({ error: "debe ser un entero" })
    .min(1, { error: "fuera de rango (1-65535)" })
    .max(65535, { error: "fuera de rango (1-65535)" })
    .optional(),
  NODE_ENV: z.string().optional(),
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
  secretoClaves: string;
  /** `0` (ningún proxy) o las IP/CIDR exactas del balanceador. */
  trustProxy: 0 | string[];
  esquemaPublico: "http" | "https";
  puertoPublico: number | undefined;
  produccion: boolean;
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
  const datos = resultado.data;
  const problemas: string[] = [];

  // Con http la cookie pierde Secure y el prefijo __Host-: solo en desarrollo.
  if (datos.ESQUEMA_PUBLICO === "http" && !esDominioLocal(datos.DOMINIO_BASE)) {
    problemas.push(
      "ESQUEMA_PUBLICO: http solo se permite con un DOMINIO_BASE .localhost",
    );
  }

  const produccion = datos.NODE_ENV === "production";
  let trustProxy: 0 | string[] = 0;
  if (datos.TRUST_PROXY !== undefined) {
    const interpretado = interpretarTrustProxy(datos.TRUST_PROXY);
    if (interpretado === undefined) {
      problemas.push(
        "TRUST_PROXY: debe ser 0 o la lista de IP/CIDR del balanceador (nunca true ni un número de saltos)",
      );
    } else {
      trustProxy = interpretado;
    }
  } else if (produccion) {
    // Sin declararlo, detrás de un balanceador todos los clientes comparten origen.
    problemas.push(
      "TRUST_PROXY: es obligatorio declararlo en producción (0 si no hay proxy)",
    );
  }

  if (problemas.length > 0) {
    throw new Error(`Configuración inválida: ${problemas.join("; ")}`);
  }

  return {
    urlBaseDeDatos: datos.DATABASE_URL,
    dominioBase: datos.DOMINIO_BASE,
    puerto: datos.PORT,
    secretoClaves: datos.SECRETO_CLAVES,
    trustProxy,
    esquemaPublico: datos.ESQUEMA_PUBLICO,
    puertoPublico: datos.PUERTO_PUBLICO,
    produccion,
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
