import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "client", "src", "assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Navegadores soportados, fijados a mano (plan 2026-10-14-001, DV-3): es el
    // antiguo «modules» de Vite 5. Vite 7 sube su valor por defecto a Safari 16
    // y Chrome 107, y el público del sitio tiene sesgo de edad alto.
    target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
