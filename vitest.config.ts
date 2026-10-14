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
      // Mismo alias que vite.config.ts. Con vitest 3 los imports de imágenes
      // (`@assets/…webp`) se resolvían sin él; desde vitest 4 no.
      "@assets": path.resolve(import.meta.dirname, "client", "src", "assets"),
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
      // Sentencias · ramas · funciones · líneas, medidas y redondeadas hacia
      // abajo: el número no puede bajar; se sube cuando mejore.
      // Recalibrado el 2026-10-14 al pasar a vitest 5: su V8 cuenta solo líneas
      // ejecutables (475 frente a 1515 de vitest 3), así que el mismo código
      // sin cubrir (wiring de server/, queryClient.ts, utils.ts) pesa más. Mismos
      // 30 archivos y mismas líneas sin cubrir: 87.65 % → 84 % por la medida, no
      // por regresión. Medido: 85.57 · 89.24 · 85.36 · 84.
      thresholds: { statements: 85, branches: 89, functions: 85, lines: 84 },
    },
  },
});
