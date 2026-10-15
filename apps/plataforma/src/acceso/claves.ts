/**
 * Claves de los límites de uso y normalización de correos y orígenes (plan del
 * corte 3, CA-10 y CA-12).
 *
 * - Las claves de `limite_uso` son un HMAC con el secreto del servidor: una base
 *   robada no permite reconstruir qué correos u orígenes se limitaron, y dos tipos
 *   de clave nunca se confunden.
 * - Se derivan del **correo enviado en la petición**, jamás del `id` de una cuenta:
 *   si dependieran de que la cuenta exista, un retraso o un `429` delataría qué
 *   correos tienen cuenta.
 */
import { createHmac } from "node:crypto";
import { esDireccionSegura } from "../correo/direccion.js";
import { isIPv4, isIPv6 } from "node:net";

/** Quita espacios, pasa a minúsculas y aplica NFKC. La cuenta guarda este valor exacto. */
export function normalizarCorreo(correo: string): string {
  return correo.normalize("NFKC").trim().toLowerCase();
}

/**
 * ¿Cumple lo que exige el `CHECK` de la base? ASCII imprimible sin espacios, de 3 a
 * 254 caracteres, minúsculas, con una sola `@` y algo a cada lado. Los correos con
 * caracteres no ASCII entran en su forma punycode.
 */
export function esCorreoValido(correo: string): boolean {
  if (!/^[\x21-\x7e]{3,254}$/.test(correo)) return false;
  if (correo !== correo.toLowerCase()) return false;
  return esDireccionSegura(correo);
}

const DOMINIOS_GMAIL = new Set(["gmail.com", "googlemail.com"]);
/** Gmail y Googlemail son el mismo buzón. */
const DOMINIO_CANONICO: Record<string, string> = { "googlemail.com": "gmail.com" };

/**
 * El correo tal como cuenta para los **límites** (no para la cuenta): sin `+etiqueta`
 * y, en Gmail, sin puntos. Con `ana+1@…`, `ana+2@…` se llenaría el buzón de una
 * víctima esquivando «1 por hora por destinatario» (auditoría del corte 3, A8).
 */
export function correoParaLimite(correo: string): string {
  const normalizado = normalizarCorreo(correo);
  const arroba = normalizado.lastIndexOf("@");
  if (arroba < 0) return normalizado;
  let usuario = normalizado.slice(0, arroba);
  const dominioOriginal = normalizado.slice(arroba + 1);
  const dominio = DOMINIO_CANONICO[dominioOriginal] ?? dominioOriginal;
  const mas = usuario.indexOf("+");
  if (mas >= 0) usuario = usuario.slice(0, mas);
  if (DOMINIOS_GMAIL.has(dominioOriginal)) usuario = usuario.replaceAll(".", "");
  return `${usuario}@${dominio}`;
}

/** Expande una IPv6 a sus ocho grupos de hasta cuatro dígitos hexadecimales. */
function expandirIPv6(ip: string): string[] {
  const [cabeza = "", cola] = ip.split("::");
  const inicio = cabeza === "" ? [] : cabeza.split(":");
  const final = cola === undefined || cola === "" ? [] : cola.split(":");
  const relleno = cola === undefined ? 0 : 8 - inicio.length - final.length;
  return [...inicio, ...Array<string>(Math.max(relleno, 0)).fill("0"), ...final].map(
    (grupo) => grupo.replace(/^0+(?=.)/, ""),
  );
}

/**
 * El origen de una petición como clave de límite: la IPv4 tal cual y, en IPv6, el
 * prefijo de 64 bits (rotar la parte baja de la dirección no esquiva el límite).
 * Una IPv4 mapeada en IPv6 cuenta como la IPv4.
 */
export function claveDeOrigen(ip: string): string {
  const minuscula = ip.trim().toLowerCase();
  if (isIPv4(minuscula)) return minuscula;
  const mapeada = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(minuscula);
  if (mapeada && isIPv4(mapeada[1]!)) return mapeada[1]!;
  if (isIPv6(minuscula)) {
    const grupos = expandirIPv6(minuscula);
    return `${grupos.slice(0, 4).join(":")}::/64`;
  }
  return "desconocido";
}

/**
 * HMAC-SHA256 con el secreto del servidor. `tipo` separa los usos (cuenta+origen,
 * origen, destinatario…); las partes van separadas por un carácter que no puede
 * aparecer en ellas, para que `("a","bc")` y `("ab","c")` den claves distintas.
 */
export function claveHmac(secreto: string, tipo: string, ...partes: string[]): Buffer {
  return createHmac("sha256", secreto)
    .update([tipo, ...partes].join("\u0000"))
    .digest();
}
