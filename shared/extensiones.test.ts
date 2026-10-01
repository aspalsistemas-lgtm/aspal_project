import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Vercel no empaqueta la función serverless: transpila `api/` y `shared/`
 * archivo a archivo y Node ESM exige la extensión en los imports relativos.
 * Un `from "./types"` pasa tsc, Vitest y el build, y rompe solo en
 * producción con ERR_MODULE_NOT_FOUND. Este test es la única puerta.
 *
 * Los `*.test.ts` quedan fuera: los ejecuta Vitest, nunca Vercel, y hoy
 * importan sin extensión. `server/` y `client/` se empaquetan (esbuild, Vite)
 * y tampoco la necesitan.
 */
const RAIZ = resolve(import.meta.dirname, "..");
const DIRECTORIOS = ["shared", "api"];

function recorrer(dir: string): string[] {
  return readdirSync(dir).flatMap((entrada) => {
    const ruta = join(dir, entrada);
    return statSync(ruta).isDirectory() ? recorrer(ruta) : [ruta];
  });
}

const archivos = DIRECTORIOS.flatMap((d) => recorrer(join(RAIZ, d))).filter(
  (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
);

/** Especificadores relativos de `import … from "…"`, `export … from "…"` e `import("…")`. */
const ESPECIFICADOR = /(?:from\s*|import\s*\()\s*["'](\.\.?\/[^"']+)["']/g;

interface Hallazgo {
  archivo: string;
  linea: number;
  especificador: string;
  motivo: string;
}

function revisar(archivo: string): Hallazgo[] {
  const texto = readFileSync(archivo, "utf8");
  const relativo = relative(RAIZ, archivo).split(sep).join("/");
  const hallazgos: Hallazgo[] = [];
  for (const m of texto.matchAll(ESPECIFICADOR)) {
    const especificador = m[1];
    const linea = texto.slice(0, m.index).split("\n").length;
    if (!especificador.endsWith(".js")) {
      hallazgos.push({ archivo: relativo, linea, especificador, motivo: "sin .js" });
      continue;
    }
    const destino = resolve(dirname(archivo), especificador.replace(/\.js$/, ".ts"));
    if (!existsSync(destino)) {
      hallazgos.push({
        archivo: relativo,
        linea,
        especificador,
        motivo: "no existe el .ts al que apunta",
      });
    }
  }
  return hallazgos;
}

describe("imports relativos de shared/ y api/", () => {
  it("hay archivos que revisar", () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it("todos llevan extensión .js y apuntan a un .ts que existe", () => {
    const hallazgos = archivos.flatMap(revisar);
    const detalle = hallazgos
      .map((h) => `${h.archivo}:${h.linea}  "${h.especificador}"  (${h.motivo})`)
      .join("\n");
    expect(hallazgos, `\n${detalle}\n`).toEqual([]);
  });
});
