import { defineConfig } from "drizzle-kit";

// Drizzle Kit (D4): genera las migraciones a partir de src/esquema.ts. Solo
// `generate`; se aplican con src/migrar.ts, nunca con `push` contra una base real.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/esquema.ts",
  out: "./migraciones",
});
