import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Los colores salen de los tokens de `index.css` (`bg-primary`, `text-noche`…),
 * nunca de un hex escrito a mano en una clase (`bg-[#243240]`): un hex directo
 * no sigue a la paleta si cambia y se salta el test de contraste (client/CLAUDE.md §8,
 * deuda técnica 4.1).
 */
const raiz = resolve(import.meta.dirname, "..");
const HEX_EN_CLASE = /\[#[0-9a-fA-F]{3,8}\]/;

const archivos = readdirSync(raiz, { recursive: true, encoding: "utf8" })
  .filter((ruta) => /\.tsx?$/.test(ruta) && !/\.test\.tsx?$/.test(ruta))
  .map((ruta) => ruta.replaceAll("\\", "/"));

describe("colores de las clases", () => {
  it("se encontraron archivos que revisar", () => {
    expect(archivos.length).toBeGreaterThan(50);
  });

  it("CA-1: ningún archivo usa un hex arbitrario como color de clase", () => {
    const infractores = archivos.filter((ruta) =>
      HEX_EN_CLASE.test(readFileSync(resolve(raiz, ruta), "utf8")),
    );
    expect(infractores).toEqual([]);
  });
});
