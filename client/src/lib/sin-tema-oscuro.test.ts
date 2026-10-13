import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * El sitio es solo de modo claro y no tiene selector de tema (deuda técnica 4.5,
 * decisión del 2026-10-13). Nada debe reintroducirlo por descuido: una variante
 * `dark:` es peligrosa porque, sin `darkMode` configurado, Tailwind usa por
 * defecto `prefers-color-scheme` y se activaría sola en quien tenga el sistema
 * en oscuro.
 */
const raiz = resolve(import.meta.dirname, "..");
const proyecto = resolve(raiz, "..", "..");
const leer = (ruta: string) => readFileSync(resolve(proyecto, ruta), "utf8");

const fuentes = readdirSync(raiz, { recursive: true, encoding: "utf8" })
  .filter((ruta) => /\.(tsx?|css)$/.test(ruta) && !/\.test\.tsx?$/.test(ruta))
  .map((ruta) => ruta.replaceAll("\\", "/"));

describe("sin tema oscuro", () => {
  it("se encontraron archivos que revisar", () => {
    expect(fuentes.length).toBeGreaterThan(50);
  });

  it("CA-1: ningún archivo usa la variante `dark:` de Tailwind", () => {
    const infractores = fuentes.filter((ruta) =>
      /(^|[\s"'`])dark:/.test(readFileSync(resolve(raiz, ruta), "utf8")),
    );
    expect(infractores).toEqual([]);
  });

  it("CA-2: index.css no tiene bloque `.dark`", () => {
    expect(leer("client/src/index.css")).not.toMatch(/^\s*\.dark\b/m);
  });

  it("CA-3: tailwind.config.ts no configura `darkMode`", () => {
    expect(leer("tailwind.config.ts")).not.toMatch(/darkMode/);
  });
});
