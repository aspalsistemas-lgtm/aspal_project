/**
 * Guardián de código (plan del corte 2, guardián 5): el contexto de asociación
 * solo se fija en `base-de-datos.ts`, dentro de `conAsociacion`. Si otro archivo
 * pudiera hacer `set_config('app.asociacion_id', …)`, el aislamiento dependería
 * de que nadie se equivoque.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(import.meta.dirname);

/** Archivos de código de la aplicación (sin tests ni utilidades de prueba). */
function archivosDeCodigo(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory())
      return entrada.name === "pruebas" ? [] : archivosDeCodigo(ruta);
    return /\.ts$/.test(entrada.name) && !/\.test\.ts$/.test(entrada.name) ? [ruta] : [];
  });
}

/** El código sin comentarios: un comentario que lo explica no es una infracción. */
function sinComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const archivos = archivosDeCodigo(SRC).map((ruta) => ({
  ruta: relative(SRC, ruta).replaceAll("\\", "/"),
  codigo: sinComentarios(readFileSync(ruta, "utf8")),
}));

describe("guardián de código (CA-3)", () => {
  it("encuentra los archivos de código", () => {
    expect(archivos.map((a) => a.ruta)).toContain("base-de-datos.ts");
  });

  it("solo base-de-datos.ts fija el contexto de asociación", () => {
    const infractores = archivos
      .filter((a) =>
        /set_config|app\.asociacion_id|\bSET\s+(LOCAL\s+)?app\./i.test(a.codigo),
      )
      .map((a) => a.ruta);
    expect(infractores).toEqual(["base-de-datos.ts"]);
  });

  it("solo los archivos de infraestructura importan pg directamente", () => {
    // El resto recibe la base dentro de conAsociacion; los scripts de
    // administración (preparar, migrar, sembrar) no corren en el servidor.
    const permitidos = [
      "base-de-datos.ts",
      "migrar.ts",
      "preparar-base.ts",
      "sembrar.ts",
    ];
    const infractores = archivos
      .filter((a) => /from\s+["']pg["']/.test(a.codigo))
      .map((a) => a.ruta)
      .filter((ruta) => !permitidos.includes(ruta));
    expect(infractores).toEqual([]);
  });
});
