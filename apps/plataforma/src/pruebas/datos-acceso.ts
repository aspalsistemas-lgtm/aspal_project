/**
 * Datos de prueba de las tablas de acceso (plan del corte 3). Se insertan como el
 * administrador (superusuario local, que se salta RLS) con `asociacion_id`
 * explícito: es la forma de preparar una asociación **ajena** a la de la prueba y
 * comprobar después que la aplicación no la ve.
 */
import { randomUUID } from "node:crypto";
import type pg from "pg";

export interface DatosDeAcceso {
  asociacionId: string;
  personaId: string;
  cuentaId: string;
  rolId: string;
  sesionId: string;
  correo: string;
  tokenHash: Buffer;
  claveLimite: Buffer;
}

/** Crea una asociación de prueba (con un subdominio único) y devuelve su `id`. */
export async function crearAsociacionDePrueba(
  admin: pg.Pool,
  subdominio: string,
): Promise<string> {
  const id = randomUUID();
  await admin.query(
    `INSERT INTO public.asociacion (id, nombre, subdominio, zona_horaria)
     VALUES ($1, $2, $3, 'UTC')`,
    [id, `Asociación ${subdominio}`, subdominio],
  );
  return id;
}

/** Una persona con su cuenta, un rol de administrador, una sesión y un contador. */
export async function crearDatosDeAcceso(
  admin: pg.Pool,
  asociacionId: string,
  correo: string,
): Promise<DatosDeAcceso> {
  const datos: DatosDeAcceso = {
    asociacionId,
    personaId: randomUUID(),
    cuentaId: randomUUID(),
    rolId: randomUUID(),
    sesionId: randomUUID(),
    correo,
    tokenHash: Buffer.from(randomUUID().replaceAll("-", ""), "hex"),
    claveLimite: Buffer.from(randomUUID().replaceAll("-", ""), "hex"),
  };
  await admin.query(
    "INSERT INTO public.persona (id, asociacion_id, nombre) VALUES ($1, $2, 'Persona de prueba')",
    [datos.personaId, asociacionId],
  );
  await admin.query(
    `INSERT INTO public.cuenta_acceso
       (id, asociacion_id, persona_id, correo, correo_verificado_en, hash_contrasena)
     VALUES ($1, $2, $3, $4, now(), 'hash-de-prueba')`,
    [datos.cuentaId, asociacionId, datos.personaId, correo],
  );
  await admin.query(
    `INSERT INTO public.asignacion_rol (id, asociacion_id, persona_id, rol, asignado_por)
     VALUES ($1, $2, $3, 'administrador', $3)`,
    [datos.rolId, asociacionId, datos.personaId],
  );
  await admin.query(
    `INSERT INTO public.sesion (id, asociacion_id, cuenta_id, token_hash, expira_en)
     VALUES ($1, $2, $3, $4, now() + interval '1 day')`,
    [datos.sesionId, asociacionId, datos.cuentaId, datos.tokenHash],
  );
  await admin.query(
    "INSERT INTO public.limite_uso (asociacion_id, clave, contador) VALUES ($1, $2, 1)",
    [asociacionId, datos.claveLimite],
  );
  return datos;
}

/** Borra todo lo de las asociaciones dadas, hijos primero (todo es RESTRICT). */
export async function borrarAsociacionesDePrueba(
  admin: pg.Pool,
  asociaciones: string[],
): Promise<void> {
  for (const tabla of [
    "sesion",
    "limite_uso",
    "asignacion_rol",
    "cuenta_acceso",
    "persona",
  ]) {
    await admin.query(`DELETE FROM public.${tabla} WHERE asociacion_id = ANY ($1)`, [
      asociaciones,
    ]);
  }
  await admin.query("DELETE FROM public.asociacion WHERE id = ANY ($1)", [asociaciones]);
}
