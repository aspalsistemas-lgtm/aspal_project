/**
 * Semillas de desarrollo (plan del corte 2, §6): ASPAL y la organización de
 * prueba, las dos asociaciones del test de cruce. No son migraciones: nunca
 * deben llegar a una base que no sea local, y el programa se niega si la URL no
 * apunta a esta máquina o al contenedor `db`.
 *
 * Idempotente: `ON CONFLICT (subdominio) DO NOTHING`.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import pg from "pg";
import {
  crearServicioContrasenas,
  validarContrasena,
  type ServicioContrasenas,
} from "./acceso/contrasenas.js";
import { cargarConfiguracionAdmin } from "./configuracion.js";
import { ROL_DUENO } from "./roles.js";

export const ASOCIACIONES_LOCALES = [
  { nombre: "ASPAL", subdominio: "aspal", zonaHoraria: "America/Merida" },
  {
    nombre: "Organización de Prueba",
    subdominio: "prueba",
    zonaHoraria: "America/Mexico_City",
  },
] as const;

/**
 * Usuarios de desarrollo (plan del corte 3, CA-20). El MISMO correo existe en ASPAL y en
 * la organización de prueba: son dos cuentas independientes, con la misma contraseña
 * local. `solo-prueba@…` existe únicamente en la organización de prueba.
 */
export const USUARIOS_LOCALES = [
  {
    subdominio: "aspal",
    correo: "admin@ejemplo.org",
    nombre: "Administrador ASPAL",
    rol: "administrador",
  },
  {
    subdominio: "aspal",
    correo: "miembro@ejemplo.org",
    nombre: "Miembro ASPAL",
    rol: "miembro",
  },
  {
    subdominio: "prueba",
    correo: "admin@ejemplo.org",
    nombre: "Administrador Prueba",
    rol: "administrador",
  },
  {
    subdominio: "prueba",
    correo: "miembro@ejemplo.org",
    nombre: "Miembro Prueba",
    rol: "miembro",
  },
  {
    subdominio: "prueba",
    correo: "solo-prueba@ejemplo.org",
    nombre: "Solo Prueba",
    rol: "administrador",
  },
] as const;

const HOSTS_LOCALES = ["localhost", "127.0.0.1", "::1", "[::1]", "db"];

/** ¿La URL apunta a una base de esta máquina o del compose local? */
export function esBaseLocal(url: string): boolean {
  return HOSTS_LOCALES.includes(new URL(url).hostname);
}

/** ¿Es un nombre de zona horaria IANA que el motor de Intl reconoce? */
export function esZonaHorariaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat("es", { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

export async function sembrar(cliente: pg.Client): Promise<void> {
  for (const asociacion of ASOCIACIONES_LOCALES) {
    if (!esZonaHorariaValida(asociacion.zonaHoraria)) {
      throw new Error(`Zona horaria inválida: ${asociacion.zonaHoraria}`);
    }
  }
  await cliente.query(`SET ROLE ${ROL_DUENO}`);
  try {
    for (const { nombre, subdominio, zonaHoraria } of ASOCIACIONES_LOCALES) {
      await cliente.query(
        `INSERT INTO public.asociacion (nombre, subdominio, zona_horaria)
         VALUES ($1, $2, $3) ON CONFLICT (subdominio) DO NOTHING`,
        [nombre, subdominio, zonaHoraria],
      );
    }
  } finally {
    await cliente.query("RESET ROLE");
  }
}

/**
 * Crea los usuarios de desarrollo. Inserta como el administrador de la base (superusuario
 * local: se salta RLS) con `asociacion_id` explícito, solo en bases locales. Idempotente:
 * una cuenta que ya existe no se toca, ni siquiera su contraseña.
 */
export async function sembrarUsuarios(
  cliente: pg.Client,
  contrasena: string,
  servicio: ServicioContrasenas = crearServicioContrasenas(),
): Promise<number> {
  for (const { correo } of USUARIOS_LOCALES) {
    const motivo = validarContrasena(contrasena, correo);
    if (motivo) throw new Error(`SEMILLA_CLAVE no es admisible (${motivo})`);
  }
  let creados = 0;
  for (const usuario of USUARIOS_LOCALES) {
    const { rows } = await cliente.query<{ id: string }>(
      "SELECT id FROM public.asociacion WHERE subdominio = $1",
      [usuario.subdominio],
    );
    const asociacionId = rows[0]?.id;
    if (!asociacionId)
      throw new Error(`Falta la asociación ${usuario.subdominio}: siembra primero`);
    const existe = await cliente.query(
      "SELECT 1 FROM public.cuenta_acceso WHERE asociacion_id = $1 AND correo = $2",
      [asociacionId, usuario.correo],
    );
    if (existe.rowCount) continue;
    const hash = await servicio.hashear(contrasena, asociacionId);
    await cliente.query("BEGIN");
    try {
      const persona = await cliente.query<{ id: string }>(
        "INSERT INTO public.persona (asociacion_id, nombre) VALUES ($1, $2) RETURNING id",
        [asociacionId, usuario.nombre],
      );
      const personaId = persona.rows[0]!.id;
      await cliente.query(
        `INSERT INTO public.cuenta_acceso
           (asociacion_id, persona_id, correo, correo_verificado_en, hash_contrasena)
         VALUES ($1, $2, $3, now(), $4)`,
        [asociacionId, personaId, usuario.correo, hash],
      );
      await cliente.query(
        "INSERT INTO public.asignacion_rol (asociacion_id, persona_id, rol) VALUES ($1, $2, $3)",
        [asociacionId, personaId, usuario.rol],
      );
      await cliente.query("COMMIT");
      creados++;
    } catch (error) {
      await cliente.query("ROLLBACK");
      throw error;
    }
  }
  return creados;
}

// Ejecutado como programa (no importado por un test).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { urlAdmin } = cargarConfiguracionAdmin(process.env);
  if (!esBaseLocal(urlAdmin)) {
    throw new Error("db:sembrar solo corre contra una base local (localhost o db)");
  }
  const cliente = new pg.Client({ connectionString: urlAdmin });
  await cliente.connect();
  try {
    await sembrar(cliente);
    console.log(
      `semillas al día: ${ASOCIACIONES_LOCALES.map((a) => a.subdominio).join(", ")}`,
    );
    const clave = process.env.SEMILLA_CLAVE;
    if (clave) {
      const creados = await sembrarUsuarios(cliente, clave);
      console.log(`usuarios de desarrollo: ${creados} creados`);
    } else {
      console.log("sin SEMILLA_CLAVE: no se crean usuarios (mínimo 12 caracteres)");
    }
  } finally {
    await cliente.end();
  }
}
