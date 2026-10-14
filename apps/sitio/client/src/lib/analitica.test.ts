import { afterEach, describe, expect, it, vi } from "vitest";
import { registrarEvento } from "./analitica";

afterEach(() => vi.unstubAllGlobals());

describe("registrarEvento", () => {
  it("empuja el evento con sus datos a dataLayer", () => {
    const ventana: { dataLayer?: unknown[] } = {};
    vi.stubGlobal("window", ventana);
    registrarEvento("click_unete", { origen: "header" });
    expect(ventana.dataLayer).toEqual([{ event: "click_unete", origen: "header" }]);
  });

  it("respeta lo que ya había en dataLayer", () => {
    const ventana = { dataLayer: [{ event: "gtm.js" }] as unknown[] };
    vi.stubGlobal("window", ventana);
    registrarEvento("download_dossier");
    expect(ventana.dataLayer).toEqual([
      { event: "gtm.js" },
      { event: "download_dossier" },
    ]);
  });

  it("una clave `event` en los datos no sobrescribe el nombre del evento", () => {
    const ventana: { dataLayer?: unknown[] } = {};
    vi.stubGlobal("window", ventana);
    registrarEvento("click_unete", { event: "otro", origen: "header" });
    expect(ventana.dataLayer).toEqual([{ event: "click_unete", origen: "header" }]);
  });

  it("no registra nada en /componentes (catálogo interno)", () => {
    const ventana: { dataLayer?: unknown[]; location: { pathname: string } } = {
      location: { pathname: "/componentes" },
    };
    vi.stubGlobal("window", ventana);
    registrarEvento("click_unete", { origen: "header" });
    expect(ventana.dataLayer).toBeUndefined();
  });

  it("sí registra en otras rutas con location", () => {
    const ventana: { dataLayer?: unknown[]; location: { pathname: string } } = {
      location: { pathname: "/" },
    };
    vi.stubGlobal("window", ventana);
    registrarEvento("click_unete");
    expect(ventana.dataLayer).toEqual([{ event: "click_unete" }]);
  });

  it("no falla sin window (tests y prerender)", () => {
    expect(() => registrarEvento("click_menu", { destino: "/blog" })).not.toThrow();
  });
});
