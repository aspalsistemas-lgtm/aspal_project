import { defineConfig } from "vitest/config";

// Tests contra PostgreSQL real (DATABASE_URL_PRUEBA). En serie: comparten base.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integracion.test.ts"],
    fileParallelism: false,
  },
});
