import { describe, expect, it } from "vitest";
import { ASOCIACIONES_LOCALES, esBaseLocal, esZonaHorariaValida } from "./sembrar.js";

describe("semillas locales (CA-8)", () => {
  it("solo aceptan bases de esta máquina o del contenedor db", () => {
    expect(esBaseLocal("postgres://aspal:x@localhost:5433/aspal")).toBe(true);
    expect(esBaseLocal("postgres://aspal:x@127.0.0.1:5433/aspal")).toBe(true);
    expect(esBaseLocal("postgres://aspal:x@db:5432/aspal")).toBe(true);
    expect(esBaseLocal("postgres://aspal:x@aspal.cluster.rds.amazonaws.com/aspal")).toBe(
      false,
    );
    expect(esBaseLocal("postgres://aspal:x@localhost.evil.com/aspal")).toBe(false);
  });

  it("todas las zonas horarias son IANA válidas", () => {
    for (const { zonaHoraria } of ASOCIACIONES_LOCALES) {
      expect(esZonaHorariaValida(zonaHoraria), zonaHoraria).toBe(true);
    }
    expect(esZonaHorariaValida("Mérida/Yucatán")).toBe(false);
  });

  it("ASPAL y la organización de prueba, con subdominios distintos", () => {
    expect(ASOCIACIONES_LOCALES.map((a) => a.subdominio)).toEqual(["aspal", "prueba"]);
  });
});
