/**
 * Aplica las migraciones versionadas de `migraciones/` (Drizzle Kit, D4).
 *
 * Idempotente: Drizzle anota cada migración aplicada en
 * `drizzle.__drizzle_migrations` y no la repite. Se ejecuta antes de arrancar el
 * servidor (`npm run db:migrar`, y en el contenedor al iniciar).
 *
 * Ningún cambio de esquema se escribe sin la propuesta de la sección 6 de
 * `docs/database-design.md`.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type pg from "pg";
import { cargarConfiguracion } from "./configuracion.js";
import { crearPool } from "./base-de-datos.js";

// Junto a src/ en desarrollo y junto a dist/ en el contenedor: en ambos casos,
// un nivel por encima de este archivo.
const CARPETA = resolve(import.meta.dirname, "..", "migraciones");

export async function aplicarMigraciones(pool: pg.Pool): Promise<void> {
  await migrate(drizzle(pool), { migrationsFolder: CARPETA });
}

// Ejecutado como programa (no importado por un test).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { urlBaseDeDatos } = cargarConfiguracion(process.env);
  const pool = crearPool(urlBaseDeDatos);
  try {
    await aplicarMigraciones(pool);
    console.log("migraciones aplicadas");
  } finally {
    await pool.end();
  }
}
