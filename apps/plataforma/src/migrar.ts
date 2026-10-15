/**
 * Aplica las migraciones versionadas de `migraciones/` (Drizzle Kit, D4).
 *
 * Corren con `SET ROLE aspal_dueno` (plan del corte 2, §2): así todo objeto que
 * creen pertenece al dueño sin privilegios y no al administrador, que en local es
 * superusuario y se saltaría RLS. Requiere haber ejecutado antes `db:preparar`.
 *
 * Idempotente: Drizzle anota cada migración aplicada en
 * `drizzle.__drizzle_migrations` y no la repite.
 *
 * Ningún cambio de esquema se escribe sin la propuesta de la sección 6 de
 * `docs/database-design.md`.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { cargarConfiguracionAdmin } from "./configuracion.js";
import { ROL_DUENO } from "./preparar-base.js";

// Junto a src/ en desarrollo y junto a dist/ en el contenedor: en ambos casos,
// un nivel por encima de este archivo.
const CARPETA = resolve(import.meta.dirname, "..", "migraciones");

/** Un cliente propio y no el pool: el `SET ROLE` es de la sesión. */
export async function aplicarMigraciones(cliente: pg.Client): Promise<void> {
  await cliente.query(`SET ROLE ${ROL_DUENO}`);
  try {
    await migrate(drizzle(cliente), { migrationsFolder: CARPETA });
  } finally {
    await cliente.query("RESET ROLE");
  }
}

// Ejecutado como programa (no importado por un test).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { urlAdmin } = cargarConfiguracionAdmin(process.env);
  const cliente = new pg.Client({ connectionString: urlAdmin });
  await cliente.connect();
  try {
    await aplicarMigraciones(cliente);
    console.log("migraciones aplicadas");
  } finally {
    await cliente.end();
  }
}
