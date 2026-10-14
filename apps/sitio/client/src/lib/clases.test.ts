import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BOTON_CONTORNO_NOCHE,
  BOTON_MIEL_NOCHE,
  H2_BANDA,
  HEXAGONO_PUNTA,
  NUMERO_CONTORNO,
  REJILLA_PILARES_PANAL,
} from "./clases";

const SRC = resolve(import.meta.dirname, "..");
function recorrer(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const f = join(dir, e);
    return statSync(f).isDirectory() ? recorrer(f) : [f];
  });
}
const tsx = recorrer(SRC).filter((f) => f.endsWith(".tsx"));

describe("clases compartidas", () => {
  it.each([
    ["H2_BANDA", H2_BANDA],
    ["BOTON_MIEL_NOCHE", BOTON_MIEL_NOCHE],
    ["BOTON_CONTORNO_NOCHE", BOTON_CONTORNO_NOCHE],
    ["HEXAGONO_PUNTA", HEXAGONO_PUNTA],
    ["NUMERO_CONTORNO", NUMERO_CONTORNO],
    ["REJILLA_PILARES_PANAL", REJILLA_PILARES_PANAL],
  ])("nadie copia %s en línea: se importa de lib/clases.ts", (_nombre, clases) => {
    const copias = tsx.filter((f) => readFileSync(f, "utf8").includes(`"${clases}"`));
    expect(copias).toEqual([]);
  });
});
