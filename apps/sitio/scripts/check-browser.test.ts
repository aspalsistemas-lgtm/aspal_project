import { describe, expect, it } from "vitest";
// @ts-expect-error — script .mjs sin declaraciones de tipos
import {
  codigoDeSalida,
  nombreDeCaptura,
  parsearArgumentos,
  resumir,
} from "./check-browser.mjs";

/**
 * Las partes puras de `npm run check:browser`. Abrir Chrome de verdad se verifica
 * a mano contra el servidor de desarrollo; aquí solo lo que no necesita navegador.
 */
describe("parsearArgumentos", () => {
  it("CA-1: sin argumentos usa el servidor local y 1280×800", () => {
    expect(parsearArgumentos([])).toEqual({
      url: "http://localhost:5001/",
      ancho: 1280,
      alto: 800,
      salida: undefined,
      completa: false,
    });
  });

  it("CA-1: la URL es el primer argumento sin guiones", () => {
    expect(parsearArgumentos(["http://localhost:5001/blog"]).url).toBe(
      "http://localhost:5001/blog",
    );
  });

  it("CA-1: acepta tamaño, salida y captura completa", () => {
    expect(
      parsearArgumentos(["--ancho=375", "--alto=700", "--salida=a/b.png", "--completa"]),
    ).toMatchObject({ ancho: 375, alto: 700, salida: "a/b.png", completa: true });
  });

  it.each(["--ancho=abc", "--ancho=10", "--alto=99999", "--ancho="])(
    "CA-1: rechaza el tamaño inválido %s",
    (arg) => {
      expect(() => parsearArgumentos([arg])).toThrow(/entero entre 200 y 4000/);
    },
  );

  it("rechaza una opción desconocida en vez de ignorarla", () => {
    expect(() => parsearArgumentos(["--anchoo=300"])).toThrow(/opción desconocida/i);
  });
});

describe("nombreDeCaptura", () => {
  it("CA-2: guarda en capturas/ con host, ruta y tamaño", () => {
    expect(nombreDeCaptura("http://localhost:5001/blog/mi-post?x=1", 1280, 800)).toBe(
      "capturas/localhost-5001-blog-mi-post-1280x800.png",
    );
  });

  it("CA-2: la portada se llama «inicio»", () => {
    expect(nombreDeCaptura("http://localhost:5001/", 375, 800)).toBe(
      "capturas/localhost-5001-inicio-375x800.png",
    );
  });

  it("CA-2: una URL sin host (data:) cae a un nombre genérico", () => {
    expect(nombreDeCaptura("data:text/html,<p>x</p>", 1280, 800)).toBe(
      "capturas/pagina-1280x800.png",
    );
  });

  it("CA-2: es determinista: la misma URL da el mismo nombre", () => {
    const u = "https://aspal.example/nosotros";
    expect(nombreDeCaptura(u, 1280, 800)).toBe(nombreDeCaptura(u, 1280, 800));
  });
});

describe("resumir y codigoDeSalida", () => {
  const errores = [
    {
      tipo: "console.error",
      texto: "Algo falló",
      ubicacion: "http://localhost:5001/x.js:3",
    },
    { tipo: "excepción", texto: "TypeError: x is undefined" },
  ];

  it("CA-3: sin errores, lo dice y sale con 0", () => {
    expect(resumir([])).toMatch(/sin errores/i);
    expect(codigoDeSalida([])).toBe(0);
  });

  it("CA-3: con errores, lista cada uno con su tipo y sale con 1", () => {
    const texto = resumir(errores);
    expect(texto).toContain("2 errores");
    expect(texto).toContain("[console.error] Algo falló");
    expect(texto).toContain("x.js:3");
    expect(texto).toContain("[excepción] TypeError: x is undefined");
    expect(codigoDeSalida(errores)).toBe(1);
  });

  it("CA-3: usa el singular con un solo error", () => {
    expect(resumir([errores[0]])).toContain("1 error ");
  });
});
