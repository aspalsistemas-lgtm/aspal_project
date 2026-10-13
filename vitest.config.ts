import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Tests de la lógica pura de `shared/wordpress/`, que es donde el plan
 * detectó los fallos de datos (tiempo de lectura inflado, extracto con "..."
 * fantasma, fecha sin zona, podcasts en la rejilla).
 *
 * Entorno `node`: sin tests de componentes; `server/` se prueba levantando Express en un puerto libre. Ver la lista de
 * revisión, punto 5, para lo que sigue siendo verificación manual.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "shared/**/*.test.ts",
      "client/src/**/*.test.ts",
      "server/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
  },
});
