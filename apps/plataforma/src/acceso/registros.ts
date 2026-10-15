/**
 * Registros pendientes de confirmar el correo (registro abierto; plan del corte 3,
 * CA-23 y CA-24). Parte del repositorio único de acceso.
 *
 * Un registro pendiente **no es una cuenta**: no hay persona ni contraseña hasta que el
 * dueño del buzón confirma. De cada token solo se guarda su SHA-256; hasta 3 vigentes
 * por correo (pedir otro no invalida los anteriores); reclamar es una sentencia atómica.
 */
import { sql } from "drizzle-orm";
import type { BaseDeAsociacion } from "../base-de-datos.js";
import { generarToken, hashDeToken } from "./sesiones.js";
import { MAXIMO_VIGENTES, esTokenBienFormado } from "./tokens-correo.js";

export const VIGENCIA_REGISTRO_SEGUNDOS = 86_400;

/** ¿Admite la asociación que cualquiera se registre como miembro? */
export async function registroAbierto(base: BaseDeAsociacion): Promise<boolean> {
  const { rows } = await base.execute<{ registro_abierto: boolean }>(
    sql`SELECT registro_abierto FROM public.asociacion`,
  );
  return rows[0]?.registro_abierto === true;
}

/**
 * Guarda un registro pendiente y devuelve su token. Con ya 3 vigentes para ese correo no
 * crea otro (tiene enlaces válidos en su buzón) y devuelve `null`.
 */
export async function crearRegistroPendiente(
  base: BaseDeAsociacion,
  correo: string,
): Promise<string | null> {
  const { rows } = await base.execute<{ n: number }>(sql`
    SELECT count(*)::int AS n FROM public.registro_pendiente
     WHERE correo = ${correo} AND usado_en IS NULL AND expira_en > now()`);
  if (Number(rows[0]?.n ?? 0) >= MAXIMO_VIGENTES) return null;
  const { token, hash } = generarToken();
  await base.execute(sql`
    INSERT INTO public.registro_pendiente (correo, token_hash, expira_en)
    VALUES (${correo}, ${hash}, now() + make_interval(secs => ${VIGENCIA_REGISTRO_SEGUNDOS}))`);
  return token;
}

/**
 * ¿Es un token vigente de una asociación que sigue con el registro abierto? Solo lee:
 * sirve para validar antes de hashear (un token inventado cuesta cero scrypt).
 */
export async function comprobarRegistro(
  base: BaseDeAsociacion,
  token: string,
): Promise<{ correo: string } | null> {
  if (!esTokenBienFormado(token)) return null;
  const { rows } = await base.execute<{ correo: string }>(sql`
    SELECT r.correo
      FROM public.registro_pendiente r
      JOIN public.asociacion a ON a.id = r.asociacion_id
     WHERE r.token_hash = ${hashDeToken(token)} AND r.usado_en IS NULL
       AND r.expira_en > now() AND a.registro_abierto`);
  return rows[0] ? { correo: rows[0].correo } : null;
}

/**
 * **Reclama** el token de una sola vez, antes de hashear: de las confirmaciones
 * simultáneas con el mismo token gana exactamente una y las demás reciben `null` sin
 * gastar scrypt. Si después no puede completarse el alta, `liberarRegistro` lo devuelve.
 */
export async function reclamarRegistro(
  base: BaseDeAsociacion,
  token: string,
): Promise<{ correo: string } | null> {
  if (!esTokenBienFormado(token)) return null;
  const { rows } = await base.execute<{ correo: string }>(sql`
    UPDATE public.registro_pendiente r SET usado_en = now()
      FROM public.asociacion a
     WHERE r.token_hash = ${hashDeToken(token)} AND r.usado_en IS NULL
       AND r.expira_en > now() AND a.id = r.asociacion_id AND a.registro_abierto
    RETURNING r.correo`);
  return rows[0] ? { correo: rows[0].correo } : null;
}

export async function liberarRegistro(
  base: BaseDeAsociacion,
  token: string,
): Promise<void> {
  await base.execute(sql`
    UPDATE public.registro_pendiente SET usado_en = NULL
     WHERE token_hash = ${hashDeToken(token)}`);
}

/** Al crearse la cuenta, todos los pendientes de ese correo dejan de valer. */
export async function invalidarRegistrosDeCorreo(
  base: BaseDeAsociacion,
  correo: string,
): Promise<void> {
  await base.execute(sql`
    UPDATE public.registro_pendiente SET usado_en = now()
     WHERE correo = ${correo} AND usado_en IS NULL`);
}
