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
    // `npm run test:coverage`. Solo la lógica con tests propios (shared/, lib/,
    // server/): los componentes no tienen tests en entorno node y bajarían el
    // número sin decir nada útil.
    coverage: {
      provider: "v8",
      include: ["shared/**/*.ts", "client/src/lib/**/*.ts", "server/**/*.ts"],
      exclude: ["**/*.test.ts"],
      reporter: ["text-summary", "text"],
      // Medido el 2026-10-13 (87.65 · 93.86 · 95.18 · 87.65) y redondeado hacia
      // abajo: el número no puede bajar. Se sube cuando mejore, nunca al revés.
      thresholds: { statements: 87, branches: 93, functions: 95, lines: 87 },
    },
  },
});
