import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Tests contra PostgreSQL real. En la CI las variables vienen del job; en local,
// de local.env (credenciales solo locales).
if (!process.env.DATABASE_URL_PRUEBA_ADMIN && existsSync("local.env")) {
  process.loadEnvFile("local.env");
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integracion.test.ts"],
    // Recrea la base de pruebas desde cero, la prepara y la migra: cada pasada
    // demuestra también que el arranque desde una base vacía funciona.
    globalSetup: ["src/pruebas/preparar-integracion.ts"],
    // En serie: comparten base y algunos tests cortan conexiones.
    fileParallelism: false,
  },
});
