import { readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTACTO,
  NOMBRE_COMPLETO,
  NOMBRE_MARCA,
  REDES,
  TITULO_SITIO,
  URL_AVISO_PRIVACIDAD,
  URL_SITIO,
  URL_TERMINOS,
} from "./marca";
import { esRutaConocida } from "./rutas";

const indexHtml = readFileSync(
  resolve(import.meta.dirname, "..", "..", "index.html"),
  "utf8",
);

describe("marca", () => {
  it("usa el dominio canónico con www y sin barra final", () => {
    // El apex responde 307 hacia www: canonical y sitemap deben apuntar al
    // destino final, no a una redirección.
    expect(URL_SITIO).toBe("https://www.asociacionesprofesionales.org");
  });

  it("el aviso de privacidad y los términos son páginas del sitio (CA-4)", () => {
    // Decisión del 2026-10-14: el texto de WordPress se copia a páginas propias.
    expect(URL_AVISO_PRIVACIDAD).toBe("/aviso-de-privacidad");
    expect(URL_TERMINOS).toBe("/terminos");
    expect(esRutaConocida(URL_AVISO_PRIVACIDAD)).toBe(true);
    expect(esRutaConocida(URL_TERMINOS)).toBe(true);
  });

  it("el título de index.html es igual a TITULO_SITIO", () => {
    // Llegó a haber tres nombres distintos en el título, el pie y los
    // documentos. index.html no puede importar TypeScript: este test es lo que
    // impide que vuelva a divergir.
    const titulo = indexHtml.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
    expect(titulo.trim()).toBe(TITULO_SITIO);
  });

  it("ningún archivo de client/src repite un nombre antiguo de la marca", () => {
    const raiz = resolve(import.meta.dirname, "..");
    const archivos = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const ruta = join(dir, e.name);
        return e.isDirectory() ? archivos(ruta) : [ruta];
      });
    const obsoletos = [
      "Asociación de Profesionales de Asociaciones",
      "Asociaciones y Sociedades Profesionales",
    ];
    const infractores = archivos(raiz)
      .filter((f) => /\.tsx?$/.test(f))
      .filter((f) => basename(f) !== "marca.ts" && !/\.test\.ts$/.test(f))
      .filter((f) => {
        const texto = readFileSync(f, "utf8");
        return obsoletos.some((o) => texto.includes(o));
      });
    expect(infractores).toEqual([]);
  });

  it("compone el nombre visible a partir de sus partes", () => {
    expect(NOMBRE_MARCA).toBe(`ASPAL — ${NOMBRE_COMPLETO}`);
  });

  it("enlaza todas las redes por https y sin repetir data-testid", () => {
    for (const red of REDES) expect(red.href, red.nombre).toMatch(/^https:\/\//);
    const ids = REDES.map((r) => r.testid);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tiene un correo y un teléfono accionables", () => {
    expect(CONTACTO.correo).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/);
    expect(CONTACTO.telefono.replace(/\s/g, "")).toMatch(/^\+\d{10,13}$/);
  });
});
