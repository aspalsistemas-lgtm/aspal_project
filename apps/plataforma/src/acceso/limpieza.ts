/**
 * Limpieza oportunista de las tablas de acceso (plan del corte 3, §5.4).
 *
 * Corre dentro del contexto de **una** asociación y en lotes acotados, nunca en cada
 * petición: no hay un trabajo que lea todas las asociaciones (haría falta un rol propio).
 * Los correos de registros pendientes e invitaciones son datos personales de gente sin
 * cuenta: caducan y se borran. `FOR UPDATE SKIP LOCKED` evita interbloqueos con quien
 * está usando esas mismas filas.
 */
import { sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import type { Dependencias } from "../app.js";
import type { BaseDeAsociacion } from "../base-de-datos.js";
import { LIMPIEZA_POR_DEFECTO, limpiarLimites } from "./limites.js";
import { limpiarSesiones } from "./sesiones.js";

/**
 * Borra, como mucho `lote` filas por tabla: registros pendientes y tokens de correo
 * caducados o usados hace más de un día, e invitaciones caducadas, aceptadas o
 * revocadas hace más de siete. Devuelve cuántas filas borró en total.
 */
export async function limpiarCorreo(
  base: BaseDeAsociacion,
  lote: number,
): Promise<number> {
  const registros = await base.execute(sql`
    DELETE FROM public.registro_pendiente
     WHERE ctid IN (
       SELECT ctid FROM public.registro_pendiente
        WHERE expira_en < now() - interval '1 day'
           OR usado_en < now() - interval '1 day'
        LIMIT ${lote}
        FOR UPDATE SKIP LOCKED)`);
  const tokens = await base.execute(sql`
    DELETE FROM public.token_correo
     WHERE ctid IN (
       SELECT ctid FROM public.token_correo
        WHERE expira_en < now() - interval '1 day'
           OR usado_en < now() - interval '1 day'
        LIMIT ${lote}
        FOR UPDATE SKIP LOCKED)`);
  const invitaciones = await base.execute(sql`
    DELETE FROM public.invitacion
     WHERE ctid IN (
       SELECT ctid FROM public.invitacion
        WHERE expira_en < now() - interval '7 days'
           OR aceptada_en < now() - interval '7 days'
           OR revocada_en < now() - interval '7 days'
        LIMIT ${lote}
        FOR UPDATE SKIP LOCKED)`);
  return (
    (registros.rowCount ?? 0) + (tokens.rowCount ?? 0) + (invitaciones.rowCount ?? 0)
  );
}

/** Todo lo que se limpia oportunistamente, en un solo paso (una transacción corta). */
export async function limpiarTodo(base: BaseDeAsociacion): Promise<void> {
  await limpiarLimites(base, LIMPIEZA_POR_DEFECTO);
  await limpiarSesiones(base, LIMPIEZA_POR_DEFECTO.lote);
  await limpiarCorreo(base, LIMPIEZA_POR_DEFECTO.lote);
}

const PROBABILIDAD_POR_DEFECTO = 0.02;

/**
 * Con poca probabilidad, limpia las tablas de acceso de la asociación. Se llama con
 * **cualquier** intento (no solo los correctos): quien nunca acierta es justo quien las
 * llena. Un fallo aquí nunca estropea la petición.
 */
export async function limpiezaOportunista(
  dependencias: Pick<Dependencias, "enAsociacion" | "probabilidadLimpieza">,
  peticion: FastifyRequest,
): Promise<void> {
  if (Math.random() >= (dependencias.probabilidadLimpieza ?? PROBABILIDAD_POR_DEFECTO)) {
    return;
  }
  await dependencias
    .enAsociacion(peticion.asociacion!.id, limpiarTodo)
    .catch(() => peticion.log.warn("la limpieza oportunista falló"));
}
