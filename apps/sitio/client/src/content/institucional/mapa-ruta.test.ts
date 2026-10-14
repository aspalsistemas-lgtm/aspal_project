import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ETAPAS, MAPA_RUTA } from "./mapa-ruta";

const pasos = ETAPAS.flatMap((etapa) => etapa.pasos);

describe("Mapa de Ruta", () => {
  it("tiene las 7 etapas en orden, cada una con su ancla etapa-N", () => {
    expect(ETAPAS.map((e) => e.numero)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(ETAPAS.map((e) => e.id)).toEqual(ETAPAS.map((e) => `etapa-${e.numero}`));
  });

  it("numera los 23 pasos en orden, sin huecos ni repetidos", () => {
    expect(pasos.map((p) => p.numero)).toEqual(
      Array.from({ length: 23 }, (_, i) => i + 1),
    );
  });

  it("reparte los pasos por etapa como la guía: 4, 4, 4, 3, 3, 4 y 1", () => {
    expect(ETAPAS.map((e) => e.pasos.length)).toEqual([4, 4, 4, 3, 3, 4, 1]);
  });

  it("no deja textos vacíos, dobles espacios ni marcas de markdown", () => {
    const textos = [
      ...Object.values(MAPA_RUTA).flatMap((v) =>
        typeof v === "string" ? [v] : Object.values(v),
      ),
      ...ETAPAS.flatMap((e) => [e.nombre, e.resumen, e.cierre]),
      ...pasos.flatMap((p) => [p.nombre, p.linea, ...p.descripcion]),
    ];
    for (const texto of textos) {
      expect(texto.trim(), texto).not.toBe("");
      expect(texto, texto).not.toMatch(/\s{2}|\*|_/);
    }
  });

  it("cierra con punto cada párrafo y cada cierre de etapa", () => {
    for (const etapa of ETAPAS) expect(etapa.cierre, etapa.id).toMatch(/\.$/);
    for (const paso of pasos) {
      for (const parrafo of paso.descripcion) expect(parrafo, paso.nombre).toMatch(/\.$/);
    }
  });

  it("sirve el PDF desde el propio dominio", () => {
    const archivo = path.resolve(
      import.meta.dirname,
      "../../../public",
      MAPA_RUTA.pdf.href.slice(1),
    );
    expect(existsSync(archivo)).toBe(true);
    expect(statSync(archivo).size).toBeLessThan(400 * 1024);
  });
});
