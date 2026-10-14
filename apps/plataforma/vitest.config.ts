import { defineConfig } from "vitest/config";

// Tests unitarios: sin red ni base de datos. Los que necesitan PostgreSQL real
// son `*.integracion.test.ts` y corren con vitest.integracion.config.ts.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integracion.test.ts"],
  },
});
