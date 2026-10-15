/**
 * Tokens de correo de una cuenta existente (recuperar contraseña) y utilidades comunes
 * de los flujos por correo (plan del corte 3, CA-24 y CA-25). Parte del repositorio
 * único de acceso: solo `acceso/` nombra `token_hash`.
 *
 * - De cada token solo se guarda su SHA-256 (`hashDeToken`).
 * - Hasta 3 vigentes por cuenta: pedir otro no invalida los anteriores.
 * - Consumir es **una sola sentencia** (`UPDATE … RETURNING`): dos confirmaciones
 *   simultáneas con el mismo token no pueden ganar las dos.
 */
import { sql } from "drizzle-orm";
import type { BaseDeAsociacion } from "../base-de-datos.js";
import { generarToken, hashDeToken } from "./sesiones.js";

export const MAXIMO_VIGENTES = 3;
export const VIGENCIA_RECUPERACION_SEGUNDOS = 3600;

/** Un token es de 32 bytes en base64url: 43 caracteres. Lo demás ni toca la base. */
const FORMA_DE_TOKEN = /^[A-Za-z0-9_-]{43}$/;
export const esTokenBienFormado = (token: string): boolean => FORMA_DE_TOKEN.test(token);

/** El nombre de la asociación del contexto (para las plantillas). */
export async function nombreDeAsociacion(base: BaseDeAsociacion): Promise<string> {
  const { rows } = await base.execute<{ nombre: string }>(
    sql`SELECT nombre FROM public.asociacion`,
  );
  return rows[0]?.nombre ?? "";
}

export interface CuentaParaRecuperar {
  cuentaId: string;
}

/** La cuenta con ese correo cuya persona está **activa**; si no, `null`. */
export async function cuentaActivaPorCorreo(
  base: BaseDeAsociacion,
  correo: string,
): Promise<CuentaParaRecuperar | null> {
  const { rows } = await base.execute<{ cuenta_id: string }>(sql`
    SELECT c.id AS cuenta_id
      FROM public.cuenta_acceso c
      JOIN public.persona p ON p.asociacion_id = c.asociacion_id AND p.id = c.persona_id
     WHERE c.correo = ${correo} AND p.estado = 'activa'`);
  return rows[0] ? { cuentaId: rows[0].cuenta_id } : null;
}

/**
 * Crea un token de recuperación para la cuenta. Con ya 3 vigentes no crea otro (tiene
 * enlaces válidos en su buzón) y devuelve `null`.
 */
export async function crearTokenRecuperacion(
  base: BaseDeAsociacion,
  cuentaId: string,
): Promise<string | null> {
  const { rows } = await base.execute<{ n: number }>(sql`
    SELECT count(*)::int AS n FROM public.token_correo
     WHERE cuenta_id = ${cuentaId} AND tipo = 'recuperar_contrasena'
       AND usado_en IS NULL AND expira_en > now()`);
  if (Number(rows[0]?.n ?? 0) >= MAXIMO_VIGENTES) return null;
  const { token, hash } = generarToken();
  await base.execute(sql`
    INSERT INTO public.token_correo (cuenta_id, tipo, token_hash, expira_en)
    VALUES (${cuentaId}, 'recuperar_contrasena', ${hash},
            now() + make_interval(secs => ${VIGENCIA_RECUPERACION_SEGUNDOS}))`);
  return token;
}

export interface TokenRecuperacionValido {
  cuentaId: string;
  correo: string;
}

/**
 * ¿Es un token vigente de una cuenta cuya persona sigue activa? Solo lee: sirve para
 * validar **antes** de hashear la contraseña (un token inventado cuesta cero scrypt).
 */
export async function comprobarTokenRecuperacion(
  base: BaseDeAsociacion,
  token: string,
): Promise<TokenRecuperacionValido | null> {
  if (!esTokenBienFormado(token)) return null;
  const { rows } = await base.execute<{ cuenta_id: string; correo: string }>(sql`
    SELECT c.id AS cuenta_id, c.correo
      FROM public.token_correo t
      JOIN public.cuenta_acceso c ON c.asociacion_id = t.asociacion_id AND c.id = t.cuenta_id
      JOIN public.persona p ON p.asociacion_id = c.asociacion_id AND p.id = c.persona_id
     WHERE t.token_hash = ${hashDeToken(token)} AND t.tipo = 'recuperar_contrasena'
       AND t.usado_en IS NULL AND t.expira_en > now() AND p.estado = 'activa'`);
  return rows[0] ? { cuentaId: rows[0].cuenta_id, correo: rows[0].correo } : null;
}

/**
 * **Reclama** el token de una sola vez, antes de hashear nada: de las confirmaciones
 * simultáneas con el mismo token gana exactamente una (una sentencia `UPDATE …
 * RETURNING`) y las demás reciben `null` sin gastar scrypt. Devuelve la cuenta y su
 * correo, o `null` si ya no vale (usado, caducado, desconocido, persona no activa).
 * Si después no se puede completar el cambio, `liberarTokenRecuperacion` lo devuelve.
 */
export async function reclamarTokenRecuperacion(
  base: BaseDeAsociacion,
  token: string,
): Promise<TokenRecuperacionValido | null> {
  if (!esTokenBienFormado(token)) return null;
  const { rows } = await base.execute<{ cuenta_id: string; correo: string }>(sql`
    WITH reclamado AS (
      UPDATE public.token_correo t SET usado_en = now()
        FROM public.cuenta_acceso c, public.persona p
       WHERE t.token_hash = ${hashDeToken(token)} AND t.tipo = 'recuperar_contrasena'
         AND t.usado_en IS NULL AND t.expira_en > now()
         AND c.asociacion_id = t.asociacion_id AND c.id = t.cuenta_id
         AND p.asociacion_id = c.asociacion_id AND p.id = c.persona_id
         AND p.estado = 'activa'
      RETURNING t.cuenta_id
    )
    SELECT c.id AS cuenta_id, c.correo
      FROM reclamado JOIN public.cuenta_acceso c ON c.id = reclamado.cuenta_id`);
  return rows[0] ? { cuentaId: rows[0].cuenta_id, correo: rows[0].correo } : null;
}

/** Devuelve un token reclamado cuyo cambio no llegó a hacerse (cola de hashes llena). */
export async function liberarTokenRecuperacion(
  base: BaseDeAsociacion,
  token: string,
): Promise<void> {
  await base.execute(sql`
    UPDATE public.token_correo SET usado_en = NULL
     WHERE token_hash = ${hashDeToken(token)} AND tipo = 'recuperar_contrasena'`);
}

/** Cambiar la contraseña invalida los demás enlaces pendientes de esa cuenta. */
export async function invalidarTokensDeRecuperacion(
  base: BaseDeAsociacion,
  cuentaId: string,
): Promise<void> {
  await base.execute(sql`
    UPDATE public.token_correo SET usado_en = now()
     WHERE cuenta_id = ${cuentaId} AND tipo = 'recuperar_contrasena' AND usado_en IS NULL`);
}
