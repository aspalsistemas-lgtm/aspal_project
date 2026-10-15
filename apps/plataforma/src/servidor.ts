/**
 * Punto de entrada: valida la configuración, abre el pool y escucha. Solo
 * wiring; la aplicación se construye en `app.ts`.
 */
import { construirApp } from "./app.js";
import {
  comprobarBaseDeDatos,
  crearPool,
  verificarRolDeAplicacion,
} from "./base-de-datos.js";
import { cargarConfiguracion } from "./configuracion.js";

const configuracion = cargarConfiguracion(process.env);
const pool = crearPool(configuracion.urlBaseDeDatos);

// Antes de aceptar una sola petición: con un rol que se salta RLS, el
// aislamiento entre asociaciones no existiría.
try {
  await verificarRolDeAplicacion(pool);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await pool.end();
  process.exit(1);
}

const app = construirApp(
  { comprobarBaseDeDatos: () => comprobarBaseDeDatos(pool) },
  { logger: true },
);

// Cierre ordenado: el orquestador manda SIGTERM antes de matar el contenedor.
for (const senal of ["SIGINT", "SIGTERM"] as const) {
  process.once(senal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
}

await app.listen({ port: configuracion.puerto, host: "0.0.0.0" });
