import { beforeEach, describe, expect, it, vi } from "vitest";

async function cargar() {
  return import("./historial");
}

beforeEach(() => {
  vi.resetModules();
});

describe("historial", () => {
  it("en la primera carga no hay ruta anterior", async () => {
    const { registrarRuta, rutaAnterior } = await cargar();
    registrarRuta("/x");
    expect(rutaAnterior("/x")).toBeNull();
  });

  it("recuerda la ruta interna de la que se viene", async () => {
    const { registrarRuta, rutaAnterior } = await cargar();
    registrarRuta("/blog");
    registrarRuta("/x");
    expect(rutaAnterior("/x")).toBe("/blog");
  });

  it("no da anterior si la ruta actual no es la pedida", async () => {
    const { registrarRuta, rutaAnterior } = await cargar();
    registrarRuta("/blog");
    registrarRuta("/x");
    expect(rutaAnterior("/otra")).toBeNull();
  });

  it("registrar dos veces la misma ruta no pisa la anterior", async () => {
    const { registrarRuta, rutaAnterior } = await cargar();
    registrarRuta("/blog");
    registrarRuta("/x");
    registrarRuta("/x");
    expect(rutaAnterior("/x")).toBe("/blog");
  });
});
