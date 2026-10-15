/**
 * Repositorio de cuentas y sesiones (plan del corte 3). **Es el único módulo que toca
 * `hash_contrasena` y `token_hash`**: un guardián de código lo exige, y ningún esquema
 * de salida puede llevarlos. Todo recibe la `base` de `conAsociacion`: no existe otra
 * forma de llegar a estas tablas, y RLS hace el resto.
 *
 * - Los tokens de sesión son 32 bytes aleatorios; **solo se guarda su SHA-256**.
 * - `crearSesion` revalida la versión de credencial y el estado de la persona **en la
 *   misma sentencia** que inserta (el login hashea fuera de toda transacción, así que
 *   entre leer la cuenta y crear la sesión puede cambiar la contraseña).
 * - Todo parámetro va enlazado (`sql` de Drizzle): nada de SQL en bruto.
 */
import { createHash, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import type { BaseDeAsociacion } from "../base-de-datos.js";
import {
  INTERVALO_ACTUALIZAR_USO_SEGUNDOS,
  MAXIMO_SESIONES_POR_CUENTA,
  duracionesPara,
} from "./politica-sesion.js";
import { esRol, type Rol } from "./rol.js";

export type EstadoPersona = "activa" | "suspendida" | "baja";

/** Lo que el login necesita de una cuenta para decidir y, si procede, crear la sesión. */
export interface CuentaParaAcceso {
  cuentaId: string;
  personaId: string;
  hashContrasena: string | null;
  credencialVersion: number;
  estadoPersona: EstadoPersona;
  nombre: string;
  roles: Rol[];
}

export interface SesionResuelta {
  sesionId: string;
  cuentaId: string;
  personaId: string;
  nombre: string;
  estadoPersona: EstadoPersona;
  roles: Rol[];
  revocada: boolean;
  /** Segundos desde el último uso y desde que nació, según el reloj de la base. */
  inactivaSegundos: number;
  antiguedadSegundos: number;
  expiraEn: Date;
}

/** Un token de sesión nuevo y su hash. El token solo se entrega al cliente; en la base va el hash. */
export function generarToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashDeToken(token) };
}

export function hashDeToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

function soloRoles(valores: unknown): Rol[] {
  return Array.isArray(valores) ? valores.filter(esRol) : [];
}

type FilaCuenta = {
  cuenta_id: string;
  persona_id: string;
  hash_contrasena: string | null;
  credencial_version: number;
  estado: EstadoPersona;
  nombre: string;
  roles: string[] | null;
};

/**
 * La cuenta con ese correo **en esta asociación** (el mismo correo en otra es otra
 * cuenta y no se ve), con su persona y sus roles vigentes. No filtra por estado: el
 * login hace el mismo trabajo, y responde igual, con una persona suspendida.
 */
export async function buscarCuentaParaAcceso(
  base: BaseDeAsociacion,
  correo: string,
): Promise<CuentaParaAcceso | null> {
  const { rows } = await base.execute<FilaCuenta>(sql`
    SELECT c.id AS cuenta_id, c.persona_id, c.hash_contrasena, c.credencial_version,
           p.estado, p.nombre,
           (SELECT array_agg(r.rol ORDER BY r.rol)
              FROM public.asignacion_rol r
             WHERE r.persona_id = p.id AND r.revocado_en IS NULL) AS roles
      FROM public.cuenta_acceso c
      JOIN public.persona p ON p.asociacion_id = c.asociacion_id AND p.id = c.persona_id
     WHERE c.correo = ${correo}`);
  const fila = rows[0];
  if (!fila) return null;
  return {
    cuentaId: fila.cuenta_id,
    personaId: fila.persona_id,
    hashContrasena: fila.hash_contrasena,
    credencialVersion: Number(fila.credencial_version),
    estadoPersona: fila.estado,
    nombre: fila.nombre,
    roles: soloRoles(fila.roles),
  };
}

export interface NuevaSesion {
  cuentaId: string;
  /** La versión de credencial que se leyó antes de verificar la contraseña. */
  credencialVersion: number;
  tokenHash: Buffer;
  /** Roles actuales: fijan la caducidad absoluta. */
  roles: readonly string[];
}

/**
 * Crea la sesión **solo si** la cuenta sigue en la versión de credencial leída y su
 * persona sigue activa: una única sentencia `INSERT … SELECT … WHERE`. Con 0 filas
 * (contraseña cambiada, persona suspendida, cuenta de otra asociación) devuelve null.
 * Después revoca las sesiones que pasen del tope por cuenta (la más antigua primero).
 */
export async function crearSesion(
  base: BaseDeAsociacion,
  { cuentaId, credencialVersion, tokenHash, roles }: NuevaSesion,
): Promise<{ sesionId: string; expiraEn: Date } | null> {
  const { absolutaSegundos } = duracionesPara(roles);
  const { rows } = await base.execute<{ id: string; expira_en: Date }>(sql`
    INSERT INTO public.sesion (cuenta_id, token_hash, nivel_autenticacion, expira_en)
    SELECT c.id, ${tokenHash}, 1, now() + make_interval(secs => ${absolutaSegundos})
      FROM public.cuenta_acceso c
      JOIN public.persona p ON p.asociacion_id = c.asociacion_id AND p.id = c.persona_id
     WHERE c.id = ${cuentaId}
       AND c.credencial_version = ${credencialVersion}
       AND p.estado = 'activa'
    -- Bloqueos: sin ellos este SELECT no ve un cambio de credenciales o de estado aún
    -- sin confirmar y la sesión nacería después de la revocación (auditoría, M1). Con
    -- ellos espera, reevalúa el WHERE y devuelve 0 filas. Sobre la cuenta, además,
    -- serializa los logins de una misma cuenta para que el tope de sesiones sea exacto.
    FOR NO KEY UPDATE OF c FOR SHARE OF p
    RETURNING id, expira_en`);
  const fila = rows[0];
  if (!fila) return null;
  await base.execute(sql`
    UPDATE public.sesion SET revocada_en = now()
     WHERE id IN (
       SELECT id FROM public.sesion
        WHERE cuenta_id = ${cuentaId} AND revocada_en IS NULL AND expira_en > now()
        ORDER BY creada_en DESC, id
        OFFSET ${MAXIMO_SESIONES_POR_CUENTA})`);
  return { sesionId: fila.id, expiraEn: new Date(fila.expira_en) };
}

type FilaSesion = {
  sesion_id: string;
  cuenta_id: string;
  persona_id: string;
  nombre: string;
  estado: EstadoPersona;
  revocada: boolean;
  inactiva_segundos: number;
  antiguedad_segundos: number;
  expira_en: Date;
  roles: string[] | null;
};

/**
 * La sesión de ese token **en esta asociación**: una sesión de otra no existe aquí
 * (RLS). Devuelve también lo necesario para decidir si sigue vigente, con los roles
 * actuales; la decisión la toma quien llama (`sesionVigente`).
 */
export async function resolverSesion(
  base: BaseDeAsociacion,
  tokenHash: Buffer,
): Promise<SesionResuelta | null> {
  const { rows } = await base.execute<FilaSesion>(sql`
    SELECT s.id AS sesion_id, s.cuenta_id, p.id AS persona_id, p.nombre, p.estado,
           (s.revocada_en IS NOT NULL) AS revocada,
           extract(epoch FROM (now() - s.ultimo_uso_en))::float8 AS inactiva_segundos,
           extract(epoch FROM (now() - s.creada_en))::float8 AS antiguedad_segundos,
           s.expira_en,
           (SELECT array_agg(r.rol ORDER BY r.rol)
              FROM public.asignacion_rol r
             WHERE r.persona_id = p.id AND r.revocado_en IS NULL) AS roles
      FROM public.sesion s
      JOIN public.cuenta_acceso c ON c.asociacion_id = s.asociacion_id AND c.id = s.cuenta_id
      JOIN public.persona p ON p.asociacion_id = c.asociacion_id AND p.id = c.persona_id
     WHERE s.token_hash = ${tokenHash}`);
  const fila = rows[0];
  if (!fila) return null;
  return {
    sesionId: fila.sesion_id,
    cuentaId: fila.cuenta_id,
    personaId: fila.persona_id,
    nombre: fila.nombre,
    estadoPersona: fila.estado,
    roles: soloRoles(fila.roles),
    revocada: fila.revocada,
    inactivaSegundos: Number(fila.inactiva_segundos),
    antiguedadSegundos: Number(fila.antiguedad_segundos),
    expiraEn: new Date(fila.expira_en),
  };
}

/** Anota el uso, como mucho cada 5 minutos: leer no debe escribir en cada petición. */
export async function tocarSesion(
  base: BaseDeAsociacion,
  sesionId: string,
): Promise<void> {
  await base.execute(sql`
    UPDATE public.sesion SET ultimo_uso_en = now()
     WHERE id = ${sesionId}
       AND ultimo_uso_en < now() - make_interval(secs => ${INTERVALO_ACTUALIZAR_USO_SEGUNDOS})`);
}

export async function revocarSesion(
  base: BaseDeAsociacion,
  sesionId: string,
): Promise<void> {
  await base.execute(sql`
    UPDATE public.sesion SET revocada_en = now()
     WHERE id = ${sesionId} AND revocada_en IS NULL`);
}

/** Revoca todas las sesiones vivas de una persona. Devuelve cuántas. */
export async function revocarSesionesDePersona(
  base: BaseDeAsociacion,
  personaId: string,
): Promise<number> {
  const resultado = await base.execute(sql`
    UPDATE public.sesion SET revocada_en = now()
     WHERE revocada_en IS NULL
       AND cuenta_id IN (SELECT id FROM public.cuenta_acceso WHERE persona_id = ${personaId})`);
  return resultado.rowCount ?? 0;
}

/**
 * Cambiar la contraseña, suspender o dar de baja (CA-6): sube la versión de credencial
 * (el login en curso ya no podrá crear su sesión), cambia la contraseña si se da una
 * (`null` la quita; `undefined` la conserva) y revoca todas las sesiones de la cuenta,
 * todo en la **misma transacción**.
 */
export async function revocarCredenciales(
  base: BaseDeAsociacion,
  cuentaId: string,
  nuevoHash?: string | null,
): Promise<void> {
  if (nuevoHash === undefined) {
    await base.execute(sql`
      UPDATE public.cuenta_acceso
         SET credencial_version = credencial_version + 1, actualizado_en = now()
       WHERE id = ${cuentaId}`);
  } else {
    await base.execute(sql`
      UPDATE public.cuenta_acceso
         SET credencial_version = credencial_version + 1, hash_contrasena = ${nuevoHash},
             actualizado_en = now()
       WHERE id = ${cuentaId}`);
  }
  await base.execute(sql`
    UPDATE public.sesion SET revocada_en = now()
     WHERE cuenta_id = ${cuentaId} AND revocada_en IS NULL`);
}

/**
 * Sube el coste del hash tras una entrada correcta. **Comparar y cambiar**: solo si el
 * hash sigue siendo el que se leyó, para no pisar una contraseña recién elegida. No es
 * un cambio de credencial: no sube la versión ni cierra sesiones.
 */
export async function rehashearContrasena(
  base: BaseDeAsociacion,
  cuentaId: string,
  hashViejo: string,
  hashNuevo: string,
): Promise<boolean> {
  const resultado = await base.execute(sql`
    UPDATE public.cuenta_acceso SET hash_contrasena = ${hashNuevo}, actualizado_en = now()
     WHERE id = ${cuentaId} AND hash_contrasena = ${hashViejo}`);
  return (resultado.rowCount ?? 0) > 0;
}

/** Limpieza oportunista en lotes: sesiones caducadas o revocadas hace más de un día. */
export async function limpiarSesiones(
  base: BaseDeAsociacion,
  lote: number,
): Promise<number> {
  const resultado = await base.execute(sql`
    DELETE FROM public.sesion
     WHERE ctid IN (
       SELECT ctid FROM public.sesion
        WHERE expira_en < now() - interval '1 day'
           OR revocada_en < now() - interval '1 day'
        LIMIT ${lote}
        FOR UPDATE SKIP LOCKED)`);
  return resultado.rowCount ?? 0;
}
