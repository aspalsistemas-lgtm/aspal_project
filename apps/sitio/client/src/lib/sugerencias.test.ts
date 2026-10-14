import { describe, expect, it } from "vitest";
import { CONTACTO, URL_SITIO } from "./marca";
import { destinosSugeridos, enlaceReporte, sugerirRuta } from "./sugerencias";

describe("sugerirRuta", () => {
  it("corrige mayúsculas y barras finales", () => {
    expect(sugerirRuta("/Blog")).toBe("/blog");
    expect(sugerirRuta("/blog/")).toBe("/blog");
    expect(sugerirRuta("/PODCAST//")).toBe("/podcast");
  });

  it("corrige un artículo con mayúsculas o barra final", () => {
    expect(sugerirRuta("/Blog/Mi-Articulo/")).toBe("/blog/mi-articulo");
  });

  it("quita extensiones de sitios anteriores", () => {
    expect(sugerirRuta("/blog.html")).toBe("/blog");
    expect(sugerirRuta("/podcast/index.php")).toBe("/podcast");
  });

  it("perdona erratas de hasta dos letras", () => {
    expect(sugerirRuta("/blogs")).toBe("/blog");
    expect(sugerirRuta("/bog")).toBe("/blog");
    expect(sugerirRuta("/podcats")).toBe("/podcast");
    expect(sugerirRuta("/plataformas")).toBe("/plataforma");
  });

  it("conserva el resto de la dirección si con la corrección existe", () => {
    expect(sugerirRuta("/blogs/mi-articulo")).toBe("/blog/mi-articulo");
  });

  it("ignora tildes, consulta y ancla", () => {
    expect(sugerirRuta("/pódcast?origen=correo#inicio")).toBe("/podcast");
  });

  it("no inventa cuando nada se parece", () => {
    expect(sugerirRuta("/inexistente")).toBeNull();
    expect(sugerirRuta("/wp-admin")).toBeNull();
    expect(sugerirRuta("/b")).toBeNull();
  });

  it("nunca sugiere la raíz", () => {
    expect(sugerirRuta("/index.html")).toBeNull();
    expect(sugerirRuta("//")).toBeNull();
  });

  it("aguanta una dirección mal codificada", () => {
    expect(() => sugerirRuta("/%E0%A4%A")).not.toThrow();
  });
});

describe("destinosSugeridos", () => {
  it("ofrece solo destinos que llevan a algún sitio, sin repetir", () => {
    const destinos = destinosSugeridos();
    expect(destinos.length).toBeGreaterThan(0);
    expect(destinos.every((d) => Boolean(d.href))).toBe(true);
    const ids = destinos.map((d) => d.testid);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no ofrece dos veces la misma URL", () => {
    const hrefs = destinosSugeridos().map((d) => d.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("enlaceReporte", () => {
  it("prepara un correo a ASPAL con la dirección rota y la de origen", () => {
    const enlace = enlaceReporte("/nosotros", "https://ejemplo.com/boletin");
    expect(enlace.startsWith(`mailto:${CONTACTO.correo}?subject=`)).toBe(true);
    const cuerpo = decodeURIComponent(enlace.split("&body=")[1]);
    expect(cuerpo).toContain(`${URL_SITIO}/nosotros`);
    expect(cuerpo).toContain("https://ejemplo.com/boletin");
  });

  it("dice que no se sabe el origen cuando no lo hay", () => {
    const cuerpo = decodeURIComponent(enlaceReporte("/x", "").split("&body=")[1]);
    expect(cuerpo).toContain("Venía de: no lo sé");
  });
});
