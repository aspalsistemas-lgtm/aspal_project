/**
 * Alta de una persona con cuenta de correo ya verificado y apertura de su primera
 * sesión (registro abierto e invitaciones; plan del corte 3, CA-23 y CA-26).
 *
 * **No existen cuentas sin verificar**: el correo se verifica antes (el token llegó a
 * su buzón), así que quien se registra con el correo de otro nunca llega a fijar una
 * contraseña. Parte del repositorio único de acceso.
 */
import { sql } from "drizzle-orm";
import type { FastifyReply } from "fastify";
import { z } from "zod";
import type { BaseDeAsociacion } from "../base-de-datos.js";
import { nombreCookieSesion, opcionesCookieSesion, type Esquema } from "./cookie.js";
import type { Rol } from "./rol.js";
import { crearSesion, generarToken } from "./sesiones.js";
import { TERMINOS_VERSION } from "./terminos.js";

/** Nombre de la persona: 2 a 120 caracteres sin controles ni marcas invisibles. */
export const ESQUEMA_NOMBRE = z
  .string()
  .trim()
  .min(2, { error: "El nombre debe tener al menos 2 caracteres" })
  .max(120, { error: "El nombre admite hasta 120 caracteres" })
  .refine((nombre) => !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(nombre), {
    error: "El nombre contiene caracteres no permitidos",
  });

export interface AltaVerificada {
  nombre: string;
  /** Ya normalizado (`normalizarCorreo`) y de formato válido. */
  correo: string;
  hashContrasena: string;
  rol: Rol;
  /** Quién concedió el rol: la persona que invitó; `null` en el registro abierto. */
  asignadoPor: string | null;
}

/** Persona, cuenta (correo verificado, términos aceptados) y rol, en la transacción actual. */
export async function crearCuentaVerificada(
  base: BaseDeAsociacion,
  alta: AltaVerificada,
): Promise<{ personaId: string; cuentaId: string }> {
  const persona = await base.execute<{ id: string }>(
    sql`INSERT INTO public.persona (nombre) VALUES (${alta.nombre}) RETURNING id`,
  );
  const personaId = persona.rows[0]!.id;
  const cuenta = await base.execute<{ id: string }>(sql`
    INSERT INTO public.cuenta_acceso
      (persona_id, correo, correo_verificado_en, hash_contrasena,
       terminos_version, terminos_aceptados_en)
    VALUES (${personaId}, ${alta.correo}, now(), ${alta.hashContrasena},
            ${TERMINOS_VERSION}, now())
    RETURNING id`);
  await base.execute(sql`
    INSERT INTO public.asignacion_rol (persona_id, rol, asignado_por)
    VALUES (${personaId}, ${alta.rol}, ${alta.asignadoPor})`);
  return { personaId, cuentaId: cuenta.rows[0]!.id };
}

/** ¿Hay ya una cuenta con ese correo en la asociación (de cualquier estado)? */
export async function existeCuentaConCorreo(
  base: BaseDeAsociacion,
  correo: string,
): Promise<boolean> {
  const { rows } = await base.execute(
    sql`SELECT 1 FROM public.cuenta_acceso WHERE correo = ${correo}`,
  );
  return rows.length > 0;
}

export interface SesionAbierta {
  token: string;
  expiraEn: Date;
}

/** La primera sesión de una cuenta recién creada (versión de credencial 1). */
export async function abrirPrimeraSesion(
  base: BaseDeAsociacion,
  cuentaId: string,
  rol: Rol,
): Promise<SesionAbierta | null> {
  const { token, hash } = generarToken();
  const creada = await crearSesion(base, {
    cuentaId,
    credencialVersion: 1,
    tokenHash: hash,
    roles: [rol],
  });
  return creada ? { token, expiraEn: creada.expiraEn } : null;
}

export function fijarCookieDeSesion(
  respuesta: FastifyReply,
  esquema: Esquema,
  { token, expiraEn }: SesionAbierta,
): void {
  respuesta.setCookie(
    nombreCookieSesion(esquema),
    token,
    opcionesCookieSesion(esquema, expiraEn),
  );
}
