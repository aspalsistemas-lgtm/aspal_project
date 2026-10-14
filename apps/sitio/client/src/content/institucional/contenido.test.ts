import { describe, expect, it } from "vitest";
import { INTRO_EQUIPO, PERFILES } from "./equipo";
import * as nosotros from "./nosotros";
import { esRutaConocida } from "@/lib/rutas";
import { PILARES } from "./pilares";
import { ETAPAS, MAPA_RUTA } from "./mapa-ruta";
import { CIFRAS, FOTO_HERO, TESTIMONIOS, TEXTO_EVENTOS } from "./inicio";

/** Todas las cadenas de un valor, recorriendo objetos y arrays (no funciones ni iconos). */
function cadenas(valor: unknown): string[] {
  if (typeof valor === "string") return [valor];
  if (Array.isArray(valor)) return valor.flatMap(cadenas);
  if (
    valor &&
    typeof valor === "object" &&
    !("$$typeof" in valor) &&
    !("render" in valor)
  ) {
    return Object.values(valor).flatMap(cadenas);
  }
  return [];
}

const todo = [
  ...cadenas(PILARES),
  ...cadenas(nosotros),
  ...cadenas(PERFILES),
  INTRO_EQUIPO,
  ...cadenas(ETAPAS),
  ...cadenas(MAPA_RUTA),
  ...cadenas(CIFRAS),
  TEXTO_EVENTOS,
];

describe("contenido institucional", () => {
  it("da a la home cuatro cifras que el sitio respalda", () => {
    expect(CIFRAS.map((c) => c.valor)).toEqual(["15+", "4", "7", "1,000"]);
    expect(CIFRAS[2].etiqueta).toContain("23 pasos");
    expect(CIFRAS[3].etiqueta).toMatch(/meta/i);
    // Solo la meta 2030 se rotula como meta: el resto son hechos.
    expect(CIFRAS.filter((c) => c.meta).map((c) => c.valor)).toEqual(["1,000"]);
  });

  it("valida las ranuras de la home cuando se llenen (foto del hero, testimonios)", () => {
    if (FOTO_HERO) {
      expect(FOTO_HERO.src).toMatch(/^\/fotos\/.+\.webp$/);
      expect(FOTO_HERO.alt.trim().length).toBeGreaterThan(10);
    }
    for (const t of TESTIMONIOS) {
      for (const campo of [t.cita, t.nombre, t.cargo, t.organizacion, t.pais]) {
        expect(campo.trim(), t.nombre).not.toBe("");
      }
      expect(t.cita.split(/\s+/).length, t.nombre).toBeLessThanOrEqual(30);
      if (t.foto) expect(t.foto, t.nombre).toMatch(/^\/fotos\/.+\.webp$/);
    }
    expect(new Set(TESTIMONIOS.map((t) => t.nombre)).size).toBe(TESTIMONIOS.length);
  });

  it("no tiene textos vacíos ni marcadores de relleno", () => {
    expect(todo.filter((t) => !t.trim())).toEqual([]);
    expect(todo.filter((t) => /\bTBD\b|lorem|^\[|\]$/i.test(t))).toEqual([]);
  });

  it("tiene los cuatro pilares con ids de ancla únicos", () => {
    const ids = PILARES.map((p) => p.id);
    expect(ids).toEqual(["comunidad", "conocimiento", "tecnologia", "datos"]);
    for (const id of ids) expect(id).toMatch(/^[a-z]+$/);
  });

  it("enlaza solo rutas internas que existen, y externos por https", () => {
    const enlaces = [
      ...PILARES.flatMap((p) => p.enlaces),
      ...nosotros.HACEN_POSIBLE.map((t) => t.enlace),
    ];
    for (const e of enlaces) {
      if (!e.href) continue;
      if (e.externo) expect(e.href, e.etiqueta).toMatch(/^https:\/\//);
      else if (!e.href.startsWith("#")) expect(esRutaConocida(e.href), e.href).toBe(true);
    }
  });

  it("respeta la estructura del Concepto NOSOTROS", () => {
    expect(nosotros.QUIENES_SOMOS).toHaveLength(3);
    expect(nosotros.DEFENDEMOS.map((d) => d.titulo)).toEqual([
      "Nuestra causa",
      "Nuestra propuesta de valor",
      "Nuestra promesa",
      "Nuestro compromiso",
    ]);
    expect(nosotros.APORTES).toHaveLength(7);
    expect(nosotros.RUTA.map((h) => h.anio)).toEqual([
      "2026",
      "Q1 2027",
      "Dic 2027",
      "Q4 2028",
      "2029",
      "2030",
    ]);
    expect(nosotros.HACEN_POSIBLE).toHaveLength(3);
    expect(PERFILES.map((p) => p.nombre)).toEqual([
      "Luis Romahn",
      "Patricia Hernández de Anda",
      "Antonio Góngora",
    ]);
  });

  it("usa el año de fundación en un solo lugar", () => {
    expect(nosotros.QUIENES_SOMOS[0]).toContain(`Nacimos en ${nosotros.ANIO_FUNDACION}`);
  });

  it("escribe el hashtag tal como lo trae el documento", () => {
    expect(nosotros.HASHTAG).toBe("#NingunDirectorDirigeSolo");
  });
});
