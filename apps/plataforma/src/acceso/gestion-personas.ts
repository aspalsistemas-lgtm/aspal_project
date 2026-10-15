/**
 * Cambios de roles y de estado de una persona (plan del corte 3, CA-18 y CA-19).
 *
 * Todo ocurre dentro de la transacción de la petición (`conSesion`) y empieza por un
 * **bloqueo por asociación**: dos administradores que se quiten el rol, o se suspendan,
 * a la vez se serializan. Después del bloqueo se vuelve a leer todo (quién actúa, quién
 * es el objetivo, cuántos administradores hay): lo leído antes pudo cambiar mientras se
 * esperaba. Así siempre queda al menos un administrador activo.
 */
import { sql } from "drizzle-orm";
import type { BaseDeAsociacion } from "../base-de-datos.js";
import { RespuestaDeError, noEncontrado, prohibido } from "./errores.js";
import { revocarInvitacionesDe } from "./invitaciones.js";
import { ROLES, esRol, type Rol } from "./rol.js";
import {
  revocarCredenciales,
  revocarSesionesDePersona,
  type EstadoPersona,
} from "./sesiones.js";

export const NOMBRE_ANONIMIZADO = "Persona dada de baja";

export interface Actor {
  personaId: string;
}

const cambioPropio = () =>
  new RespuestaDeError(
    403,
    "CAMBIO_PROPIO_NO_PERMITIDO",
    "No puedes cambiar tus propios roles ni tu propio estado",
  );
const ultimoAdministrador = () =>
  new RespuestaDeError(
    409,
    "ULTIMO_ADMINISTRADOR",
    "La asociación debe conservar al menos un administrador activo",
  );
const personaNoActiva = (mensaje: string) =>
  new RespuestaDeError(409, "PERSONA_NO_ACTIVA", mensaje);

/** Un bloqueo por asociación, liberado al terminar la transacción. */
export async function bloquearGestion(base: BaseDeAsociacion): Promise<void> {
  await base.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended('roles:' || app.asociacion_actual()::text, 0))`,
  );
}

async function rolesVigentes(base: BaseDeAsociacion, personaId: string): Promise<Rol[]> {
  const { rows } = await base.execute<{ rol: string }>(sql`
    SELECT rol FROM public.asignacion_rol
     WHERE persona_id = ${personaId} AND revocado_en IS NULL
     ORDER BY rol`);
  return rows.map((fila) => fila.rol).filter(esRol);
}

async function estadoDe(
  base: BaseDeAsociacion,
  personaId: string,
): Promise<EstadoPersona | null> {
  const { rows } = await base.execute<{ estado: EstadoPersona }>(sql`
    SELECT estado FROM public.persona WHERE id = ${personaId}`);
  return rows[0]?.estado ?? null;
}

async function administradoresActivos(base: BaseDeAsociacion): Promise<number> {
  const { rows } = await base.execute<{ n: number }>(sql`
    SELECT count(*)::int AS n
      FROM public.asignacion_rol r
      JOIN public.persona p ON p.asociacion_id = r.asociacion_id AND p.id = r.persona_id
     WHERE r.rol = 'administrador' AND r.revocado_en IS NULL AND p.estado = 'activa'`);
  return Number(rows[0]?.n ?? 0);
}

/** ¿Es la persona un administrador activo ahora mismo? (leer tras tomar el bloqueo). */
export async function esAdministradorActivo(
  base: BaseDeAsociacion,
  personaId: string,
): Promise<boolean> {
  const estado = await estadoDe(base, personaId);
  const roles = await rolesVigentes(base, personaId);
  return estado === "activa" && roles.includes("administrador");
}

/**
 * Tras el bloqueo: quien actúa sigue siendo un administrador activo. Su sesión se
 * resolvió antes de esperar el bloqueo y pudo perder el rol mientras tanto.
 */
async function exigirActorAdministrador(
  base: BaseDeAsociacion,
  actor: Actor,
): Promise<void> {
  const estado = await estadoDe(base, actor.personaId);
  const roles = await rolesVigentes(base, actor.personaId);
  if (estado !== "activa" || !roles.includes("administrador")) throw prohibido();
}

export async function cambiarRoles(
  base: BaseDeAsociacion,
  actor: Actor,
  personaId: string,
  nuevos: readonly Rol[],
): Promise<Rol[]> {
  if (personaId === actor.personaId) throw cambioPropio();
  await bloquearGestion(base);
  await exigirActorAdministrador(base, actor);

  // Una persona de otra asociación no existe aquí (RLS): 404, nunca 403.
  const estado = await estadoDe(base, personaId);
  if (!estado) throw noEncontrado("La persona no existe");
  if (estado !== "activa") {
    throw personaNoActiva("Solo se asignan roles a personas activas");
  }

  const actuales = await rolesVigentes(base, personaId);
  const conjunto = new Set(nuevos);
  const retirados = actuales.filter((rol) => !conjunto.has(rol));
  const agregados = ROLES.filter((rol) => conjunto.has(rol) && !actuales.includes(rol));
  if (retirados.length === 0 && agregados.length === 0) return [...actuales];

  if (retirados.includes("administrador") && (await administradoresActivos(base)) <= 1) {
    throw ultimoAdministrador();
  }
  for (const rol of retirados) {
    await base.execute(sql`
      UPDATE public.asignacion_rol SET revocado_en = now(), revocado_por = ${actor.personaId}
       WHERE persona_id = ${personaId} AND rol = ${rol} AND revocado_en IS NULL`);
  }
  for (const rol of agregados) {
    await base.execute(sql`
      INSERT INTO public.asignacion_rol (persona_id, rol, asignado_por)
      VALUES (${personaId}, ${rol}, ${actor.personaId})`);
  }
  // Quien deja de ser administrador pierde sus invitaciones pendientes.
  if (retirados.includes("administrador")) await revocarInvitacionesDe(base, personaId);
  // Vuelve a entrar y recibe sus roles nuevos (y la duración de sesión que les toca).
  await revocarSesionesDePersona(base, personaId);
  return rolesVigentes(base, personaId);
}

export async function cambiarEstado(
  base: BaseDeAsociacion,
  actor: Actor,
  personaId: string,
  nuevo: EstadoPersona,
): Promise<EstadoPersona> {
  if (personaId === actor.personaId) throw cambioPropio();
  await bloquearGestion(base);
  await exigirActorAdministrador(base, actor);

  const actual = await estadoDe(base, personaId);
  if (!actual) throw noEncontrado("La persona no existe");
  if (actual === nuevo) return actual;
  // En este corte la baja es definitiva.
  if (actual === "baja") throw personaNoActiva("La persona está dada de baja");

  const roles = await rolesVigentes(base, personaId);
  if (
    actual === "activa" &&
    roles.includes("administrador") &&
    (await administradoresActivos(base)) <= 1
  ) {
    throw ultimoAdministrador();
  }

  if (nuevo === "baja") {
    await base.execute(sql`
      UPDATE public.persona SET estado = 'baja', nombre = ${NOMBRE_ANONIMIZADO}
       WHERE id = ${personaId}`);
    await base.execute(sql`
      UPDATE public.asignacion_rol SET revocado_en = now(), revocado_por = ${actor.personaId}
       WHERE persona_id = ${personaId} AND revocado_en IS NULL`);
  } else {
    await base.execute(
      sql`UPDATE public.persona SET estado = ${nuevo} WHERE id = ${personaId}`,
    );
  }

  if (nuevo !== "activa") {
    await revocarInvitacionesDe(base, personaId);
    // Sube la versión de credencial (un login en curso no podrá abrir sesión) y cierra
    // todas las sesiones, en esta misma transacción.
    const { rows } = await base.execute<{ id: string }>(sql`
      SELECT id FROM public.cuenta_acceso WHERE persona_id = ${personaId}`);
    for (const cuenta of rows) await revocarCredenciales(base, cuenta.id);
  }
  return nuevo;
}
