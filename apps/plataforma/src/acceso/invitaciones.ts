/**
 * Invitaciones de un administrador (plan del corte 3, CA-26). Parte del repositorio
 * único de acceso: solo `acceso/` nombra `token_hash`.
 *
 * - De cada token solo se guarda su SHA-256; vale 7 días y se usa una sola vez.
 * - Una pendiente por (correo, rol): lo arbitra el índice único parcial, y las
 *   caducadas se retiran antes de invitar de nuevo.
 * - **Aceptar revalida al invitador en ese momento**: sigue siendo administrador
 *   activo, dentro de la misma sentencia que reclama el token. Perder el rol o el
 *   estado invalida también las pendientes (`revocarInvitacionesDe`).
 * - Reclamar es una sentencia atómica y se hace antes de hashear (como el registro).
 */
import { sql } from "drizzle-orm";
import type { BaseDeAsociacion } from "../base-de-datos.js";
import type { Rol } from "./rol.js";
import { esRol } from "./rol.js";
import { generarToken, hashDeToken } from "./sesiones.js";
import { esTokenBienFormado } from "./tokens-correo.js";

export const VIGENCIA_INVITACION_SEGUNDOS = 604_800;

/** ¿Es el invitador un administrador activo? (subconsulta reutilizada). */
const INVITADOR_ADMINISTRADOR_ACTIVO = sql`EXISTS (
  SELECT 1 FROM public.persona p
    JOIN public.asignacion_rol r
      ON r.asociacion_id = p.asociacion_id AND r.persona_id = p.id
   WHERE p.id = i.invitada_por AND p.estado = 'activa'
     AND r.rol = 'administrador' AND r.revocado_en IS NULL)`;

export interface InvitacionCreada {
  id: string;
  token: string;
  expiraEn: Date;
}

/**
 * Crea la invitación. Devuelve `null` si ya hay una pendiente (vigente) para ese correo
 * y rol. Antes retira las caducadas del mismo (correo, rol), que ocuparían el índice.
 */
export async function crearInvitacion(
  base: BaseDeAsociacion,
  datos: { correo: string; rol: Rol; invitadaPor: string },
): Promise<InvitacionCreada | null> {
  await base.execute(sql`
    UPDATE public.invitacion SET revocada_en = now()
     WHERE correo = ${datos.correo} AND rol = ${datos.rol}
       AND aceptada_en IS NULL AND revocada_en IS NULL AND expira_en <= now()`);
  const { token, hash } = generarToken();
  const { rows } = await base.execute<{ id: string; expira_en: Date }>(sql`
    INSERT INTO public.invitacion (correo, rol, token_hash, invitada_por, expira_en)
    VALUES (${datos.correo}, ${datos.rol}, ${hash}, ${datos.invitadaPor},
            now() + make_interval(secs => ${VIGENCIA_INVITACION_SEGUNDOS}))
    ON CONFLICT (asociacion_id, correo, rol)
      WHERE aceptada_en IS NULL AND revocada_en IS NULL
    DO NOTHING
    RETURNING id, expira_en`);
  const fila = rows[0];
  return fila ? { id: fila.id, token, expiraEn: new Date(fila.expira_en) } : null;
}

export interface InvitacionPendiente {
  id: string;
  correo: string;
  rol: Rol;
  expiraEn: Date;
}

export async function listarInvitacionesPendientes(
  base: BaseDeAsociacion,
): Promise<InvitacionPendiente[]> {
  const { rows } = await base.execute<{
    id: string;
    correo: string;
    rol: string;
    expira_en: Date;
  }>(sql`
    SELECT id, correo, rol, expira_en FROM public.invitacion
     WHERE aceptada_en IS NULL AND revocada_en IS NULL AND expira_en > now()
     ORDER BY creado_en DESC, id`);
  return rows
    .filter((fila) => esRol(fila.rol))
    .map((fila) => ({
      id: fila.id,
      correo: fila.correo,
      rol: fila.rol as Rol,
      expiraEn: new Date(fila.expira_en),
    }));
}

/** Revoca una invitación pendiente. `false` si no existe, es ajena o ya no está pendiente. */
export async function revocarInvitacion(
  base: BaseDeAsociacion,
  invitacionId: string,
): Promise<boolean> {
  const { rows } = await base.execute(sql`
    UPDATE public.invitacion SET revocada_en = now()
     WHERE id = ${invitacionId} AND aceptada_en IS NULL AND revocada_en IS NULL
       AND expira_en > now()
    RETURNING id`);
  return rows.length > 0;
}

/** Quien pierde el rol de administrador, o deja de estar activo, pierde sus invitaciones. */
export async function revocarInvitacionesDe(
  base: BaseDeAsociacion,
  personaId: string,
): Promise<void> {
  await base.execute(sql`
    UPDATE public.invitacion SET revocada_en = now()
     WHERE invitada_por = ${personaId} AND aceptada_en IS NULL AND revocada_en IS NULL`);
}

export interface InvitacionValida {
  correo: string;
  rol: Rol;
  invitadaPor: string;
}

/** ¿Es un token vigente de una invitación cuyo invitador sigue siendo administrador? Solo lee. */
export async function comprobarInvitacion(
  base: BaseDeAsociacion,
  token: string,
): Promise<InvitacionValida | null> {
  if (!esTokenBienFormado(token)) return null;
  const { rows } = await base.execute<{
    correo: string;
    rol: string;
    invitada_por: string;
  }>(sql`
    SELECT i.correo, i.rol, i.invitada_por FROM public.invitacion i
     WHERE i.token_hash = ${hashDeToken(token)} AND i.aceptada_en IS NULL
       AND i.revocada_en IS NULL AND i.expira_en > now()
       AND ${INVITADOR_ADMINISTRADOR_ACTIVO}`);
  const fila = rows[0];
  if (!fila || !esRol(fila.rol)) return null;
  return { correo: fila.correo, rol: fila.rol, invitadaPor: fila.invitada_por };
}

/**
 * **Reclama** la invitación de una sola vez, antes de hashear, revalidando al invitador
 * en la misma sentencia. De varias aceptaciones simultáneas gana exactamente una.
 */
export async function reclamarInvitacion(
  base: BaseDeAsociacion,
  token: string,
): Promise<InvitacionValida | null> {
  if (!esTokenBienFormado(token)) return null;
  const { rows } = await base.execute<{
    correo: string;
    rol: string;
    invitada_por: string;
  }>(sql`
    UPDATE public.invitacion i SET aceptada_en = now()
     WHERE i.token_hash = ${hashDeToken(token)} AND i.aceptada_en IS NULL
       AND i.revocada_en IS NULL AND i.expira_en > now()
       AND ${INVITADOR_ADMINISTRADOR_ACTIVO}
    RETURNING i.correo, i.rol, i.invitada_por`);
  const fila = rows[0];
  if (!fila || !esRol(fila.rol)) return null;
  return { correo: fila.correo, rol: fila.rol, invitadaPor: fila.invitada_por };
}

export async function liberarInvitacion(
  base: BaseDeAsociacion,
  token: string,
): Promise<void> {
  await base.execute(sql`
    UPDATE public.invitacion SET aceptada_en = NULL
     WHERE token_hash = ${hashDeToken(token)}`);
}
