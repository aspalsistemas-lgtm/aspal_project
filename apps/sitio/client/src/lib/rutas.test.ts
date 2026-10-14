import { describe, expect, it } from "vitest";
import { RUTAS_ESTATICAS, esRutaConocida, rutaCanonica } from "./rutas";

describe("esRutaConocida", () => {
  it("conoce cada ruta estática", () => {
    for (const ruta of RUTAS_ESTATICAS) {
      expect(esRutaConocida(ruta), ruta).toBe(true);
    }
    expect(esRutaConocida("/mapa-de-ruta")).toBe(true);
  });

  it("acepta un artículo del blog por su slug", () => {
    expect(esRutaConocida("/blog/el-poder-del-podcasting")).toBe(true);
  });

  it("rechaza una ruta que todavía no existe", () => {
    expect(esRutaConocida("/inexistente")).toBe(false);
  });

  it("ignora el ancla y la consulta", () => {
    // Los pilares se enlazan como /que-hacemos#tecnologia: existe si existe la página.
    expect(esRutaConocida("/podcast#ultimo")).toBe(true);
    expect(esRutaConocida("/blog?pagina=2")).toBe(true);
  });

  it("no confunde prefijos, barras finales ni segmentos de más", () => {
    expect(esRutaConocida("/blogosfera")).toBe(false);
    expect(esRutaConocida("/blog/")).toBe(false);
    expect(esRutaConocida("/blog/a/b")).toBe(false);
  });

  it("no da por interna una URL externa ni una vacía", () => {
    expect(esRutaConocida("https://comunidad.asociacionesprofesionales.org/")).toBe(
      false,
    );
    expect(esRutaConocida("")).toBe(false);
  });
});

describe("rutaCanonica", () => {
  it("devuelve la forma en minúsculas de una ruta estática", () => {
    expect(rutaCanonica("/Blog")).toBe("/blog");
    expect(rutaCanonica("/PODCAST")).toBe("/podcast");
  });

  it("devuelve null si ya es canónica o no es estática", () => {
    expect(rutaCanonica("/blog")).toBeNull();
    expect(rutaCanonica("/Blog/Mi-Articulo")).toBeNull();
    expect(rutaCanonica("/Inexistente")).toBeNull();
  });
});
