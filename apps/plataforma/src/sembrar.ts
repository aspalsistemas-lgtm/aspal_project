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
  } finally {
    await cliente.end();
  }
}
