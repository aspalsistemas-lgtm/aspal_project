import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RUTAS_DINAMICAS } from "../client/src/lib/rutas";
import { CACHE_INMUTABLE } from "./static";

interface Reescritura {
  source: string;
  destination: string;
}

interface Cabeceras {
  source: string;
  headers: { key: string; value: string }[];
}

// vercel.json vive en la raíz del monorepo: el proyecto de Vercel sigue con la
// raíz del repositorio como Root Directory (api/index.ts de la raíz explica por qué).
const RAIZ_REPO = resolve(import.meta.dirname, "..", "..", "..");

const config = JSON.parse(readFileSync(resolve(RAIZ_REPO, "vercel.json"), "utf8")) as {
  buildCommand?: string;
  outputDirectory?: string;
  cleanUrls?: boolean;
  trailingSlash?: boolean;
  rewrites: Reescritura[];
  headers?: Cabeceras[];
};

describe("vercel.json", () => {
  it("construye el sitio y publica su dist/public desde la raíz del monorepo", () => {
    expect(config.buildCommand).toBe("npm run build");
    expect(config.outputDirectory).toBe("apps/sitio/dist/public");
  });

  it("la función de la raíz reexporta la del sitio, sin lógica propia", async () => {
    // Vercel solo busca funciones en api/ de la raíz: si la puerta montara algo
    // por su cuenta, producción y el servidor de desarrollo divergirían.
    const puerta = readFileSync(resolve(RAIZ_REPO, "api", "index.ts"), "utf8");
    const codigo = puerta.replace(/\/\*\*[\s\S]*?\*\//, "").trim();
    expect(codigo).toBe('export { default } from "../apps/sitio/api/index.js";');
    const [{ default: deLaRaiz }, { default: delSitio }] = await Promise.all([
      import("../../../api/index"),
      import("../api/index"),
    ]);
    expect(deLaRaiz).toBe(delSitio);
  });

  it("no tiene un rewrite comodín que convierta todo en 200", () => {
    // Era `{ "source": "/(.*)", "destination": "/" }`: cualquier dirección
    // inexistente respondía 200 con la home (RF-11).
    const comodines = config.rewrites.filter(
      (r) => r.destination === "/" || r.destination === "/index.html",
    );
    expect(comodines).toEqual([]);
  });

  it("sirve las rutas estáticas sin extensión", () => {
    expect(config.cleanUrls).toBe(true);
  });

  it("redirige la barra final, igual que Express", () => {
    expect(config.trailingSlash).toBe(false);
  });

  it("manda cada ruta dinámica al shell", () => {
    for (const ruta of RUTAS_DINAMICAS) {
      expect(config.rewrites).toContainEqual({ source: ruta, destination: "/spa.html" });
    }
  });

  it("mantiene la API en la función serverless", () => {
    expect(config.rewrites).toContainEqual({ source: "/api/(.*)", destination: "/api" });
  });

  it("cachea un año lo versionado, con la misma cabecera que Express", () => {
    for (const source of ["/assets/(.*)", "/fuentes/(.*)"]) {
      expect(config.headers, source).toContainEqual({
        source,
        headers: [{ key: "Cache-Control", value: CACHE_INMUTABLE }],
      });
    }
  });
});
