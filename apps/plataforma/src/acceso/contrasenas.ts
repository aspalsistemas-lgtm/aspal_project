/**
 * Contraseñas (plan del corte 3, CA-3, CA-11 y CA-13).
 *
 * - **scrypt** de `node:crypto` (OWASP: N=2¹⁷, r=8, p=1), con sal de 16 bytes y los
 *   parámetros dentro del hash, para poder subirlos sin romper los viejos.
 * - **`maxmem` explícito**: con N=2¹⁷ cada hash gasta 128 MiB y Node, por defecto, solo
 *   admite 32 MiB (la primera llamada lanzaría).
 * - **Un único scrypt en todas las ramas** de `verificar`: cuenta inexistente, sin
 *   contraseña, hash ilegible o contraseña errónea hacen el mismo trabajo, así que ni
 *   el tiempo ni el número de operaciones delatan qué cuentas existen.
 * - **Cotas al leer un hash**: lo que sale de la base no se fía; unos parámetros
 *   desmesurados se tratan como un hash ilegible, nunca se derivan.
 * - **Semáforo** (`semaforo.ts`): el hash gasta memoria y un hilo de libuv; se limitan
 *   los hashes en vuelo y las plazas en cola de cada asociación.
 * - NFKC antes de hashear y de verificar, y comparación en tiempo constante.
 *
 * **Nunca se llama desde dentro de una transacción** (retendría una conexión del pool
 * mientras dura el hash): quien llama lee, cierra, hashea y revalida.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { OPCIONES_SEMAFORO_POR_DEFECTO, SemaforoDeHashes } from "./semaforo.js";

export interface ParametrosScrypt {
  N: number;
  r: number;
  p: number;
}

export const PARAMETROS_SCRYPT: ParametrosScrypt = { N: 2 ** 17, r: 8, p: 1 };

const LONGITUD_SAL = 16;
const LONGITUD_CLAVE = 64;

/** Cotas de lo que se acepta leer de un hash guardado. */
const COTAS = {
  N: { min: 2 ** 14, max: 2 ** 20 },
  r: { min: 1, max: 16 },
  p: { min: 1, max: 4 },
  sal: { min: 16, max: 64 },
  clave: { min: 32, max: 128 },
  /** 128·N·r bytes: ni un hash guardado puede pedir más memoria que esto. */
  memoriaMaxima: 256 * 1024 * 1024,
};

/** Más largas que esto no se derivan con la contraseña: la capa HTTP ya las rechaza (≤200). */
const LONGITUD_MAXIMA_DERIVADA = 1024;

/** Quien llama al derivador real; los tests lo sustituyen para contar y medir. */
export type Derivar = (
  contrasena: string,
  sal: Buffer,
  longitud: number,
  parametros: ParametrosScrypt,
) => Promise<Buffer>;

const scryptAsincrono = promisify(scrypt) as (
  contrasena: string,
  sal: Buffer,
  longitud: number,
  opciones: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

export const derivarScrypt: Derivar = (contrasena, sal, longitud, { N, r, p }) =>
  // El doble de lo que necesita (128·N·r): margen para p y para el propio Node.
  scryptAsincrono(contrasena, sal, longitud, { N, r, p, maxmem: 2 * 128 * N * r });

interface HashLeido {
  parametros: ParametrosScrypt;
  sal: Buffer;
  clave: Buffer;
}

function enRango(valor: number, { min, max }: { min: number; max: number }): boolean {
  return Number.isInteger(valor) && valor >= min && valor <= max;
}

/** Lee `scrypt$N$r$p$sal$clave`; devuelve null ante cualquier cosa fuera de cotas. */
function leerHash(texto: string | null | undefined): HashLeido | null {
  if (!texto) return null;
  const partes = texto.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return null;
  const [, n, r, p, sal64, clave64] = partes as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (![n, r, p].every((numero) => /^\d{1,10}$/.test(numero))) return null;
  const parametros = { N: Number(n), r: Number(r), p: Number(p) };
  if (!enRango(parametros.N, COTAS.N) || (parametros.N & (parametros.N - 1)) !== 0)
    return null;
  if (!enRango(parametros.r, COTAS.r) || !enRango(parametros.p, COTAS.p)) return null;
  if (128 * parametros.N * parametros.r > COTAS.memoriaMaxima) return null;
  const sal = Buffer.from(sal64, "base64url");
  const clave = Buffer.from(clave64, "base64url");
  // Reconstruir exige base64url estricto: nada de caracteres de relleno ni basura.
  if (sal.toString("base64url") !== sal64 || clave.toString("base64url") !== clave64)
    return null;
  if (!enRango(sal.length, COTAS.sal) || !enRango(clave.length, COTAS.clave)) return null;
  return { parametros, sal, clave };
}

function formatearHash(
  { N, r, p }: ParametrosScrypt,
  sal: Buffer,
  clave: Buffer,
): string {
  return `scrypt$${N}$${r}$${p}$${sal.toString("base64url")}$${clave.toString("base64url")}`;
}

export interface OpcionesServicioContrasenas {
  parametros?: ParametrosScrypt;
  derivar?: Derivar;
  semaforo?: SemaforoDeHashes;
}

export interface ServicioContrasenas {
  /** Hashea con los parámetros vigentes. Puede lanzar `ColaLlena`. */
  hashear(contrasena: string, asociacionId: string): Promise<string>;
  /**
   * ¿Es esta la contraseña del hash guardado? **Siempre un único scrypt**, exista o no
   * el hash: con `null` o un hash ilegible se compara contra un objetivo simulado con
   * los parámetros vigentes. Puede lanzar `ColaLlena`.
   */
  verificar(
    contrasena: string,
    hashGuardado: string | null | undefined,
    asociacionId: string,
  ): Promise<boolean>;
  /** ¿Se guardó con parámetros más débiles que los vigentes (o ilegible)? */
  necesitaRehash(hashGuardado: string): boolean;
}

export function crearServicioContrasenas(
  opciones: OpcionesServicioContrasenas = {},
): ServicioContrasenas {
  const parametros = opciones.parametros ?? PARAMETROS_SCRYPT;
  const derivar = opciones.derivar ?? derivarScrypt;
  const semaforo =
    opciones.semaforo ?? new SemaforoDeHashes(OPCIONES_SEMAFORO_POR_DEFECTO);

  return {
    async hashear(contrasena, asociacionId) {
      const sal = randomBytes(LONGITUD_SAL);
      const clave = await semaforo.ejecutar(asociacionId, () =>
        derivar(contrasena.normalize("NFKC"), sal, LONGITUD_CLAVE, parametros),
      );
      return formatearHash(parametros, sal, clave);
    },

    async verificar(contrasena, hashGuardado, asociacionId) {
      const leido = leerHash(hashGuardado);
      // Sin hash válido, un objetivo simulado con el mismo coste que uno real.
      const objetivo: HashLeido = leido ?? {
        parametros,
        sal: randomBytes(LONGITUD_SAL),
        clave: randomBytes(LONGITUD_CLAVE),
      };
      const normalizada = contrasena.normalize("NFKC");
      // Una contraseña desmesurada no se deriva con su contenido (DoS por tamaño):
      // se hace el mismo trabajo con una entrada fija y se rechaza.
      const demasiadoLarga = normalizada.length > LONGITUD_MAXIMA_DERIVADA;
      const candidata = await semaforo.ejecutar(asociacionId, () =>
        derivar(
          demasiadoLarga ? "" : normalizada,
          objetivo.sal,
          objetivo.clave.length,
          objetivo.parametros,
        ),
      );
      const coincide =
        candidata.length === objetivo.clave.length &&
        timingSafeEqual(candidata, objetivo.clave);
      return leido !== null && !demasiadoLarga && coincide;
    },

    necesitaRehash(hashGuardado) {
      const leido = leerHash(hashGuardado);
      if (!leido) return true;
      return (
        leido.parametros.N < parametros.N ||
        leido.parametros.r < parametros.r ||
        leido.parametros.p < parametros.p
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Política de contraseñas (CA-13)
// ---------------------------------------------------------------------------

export type MotivoContrasena = "corta" | "larga" | "igual_al_correo" | "comun";

export const LONGITUD_MINIMA = 12;
export const LONGITUD_MAXIMA = 200;

/** Lista corta, solo para cortar lo más obvio. Una lista larga o HIBP, tras producción. */
const COMUNES = new Set([
  "123456789012",
  "1234567890123",
  "12345678901234",
  "111111111111",
  "000000000000",
  "aaaaaaaaaaaa",
  "abcdefghijkl",
  "1q2w3e4r5t6y",
  "qwertyuiop12",
  "qwertyuiop123",
  "qwertyuiopasdf",
  "asdfghjkl123",
  "password1234",
  "password12345",
  "password123456",
  "passw0rd1234",
  "contrasena123",
  "contrasena1234",
  "contrasena12345",
  "administrador",
  "administrador1",
  "administrador123",
  "iloveyou1234",
  "welcome12345",
  "letmein12345",
  "changeme1234",
  "bienvenido123",
  "asociacion123",
  "aspal1234567",
  "mexico123456",
]);

/** Devuelve el motivo del rechazo, o `null` si la contraseña es admisible. */
export function validarContrasena(
  contrasena: string,
  correo: string,
): MotivoContrasena | null {
  const normalizada = contrasena.normalize("NFKC");
  const longitud = [...normalizada].length;
  if (longitud < LONGITUD_MINIMA) return "corta";
  if (longitud > LONGITUD_MAXIMA) return "larga";
  const minuscula = normalizada.trim().toLowerCase();
  if (minuscula === correo.normalize("NFKC").trim().toLowerCase())
    return "igual_al_correo";
  if (COMUNES.has(minuscula)) return "comun";
  return null;
}
