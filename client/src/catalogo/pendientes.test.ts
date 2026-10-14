import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Listas que la migración a Atomic Design debe vaciar
 * (docs/plans/2026-10-13-001-refactor-atomic-design-plan.md, CA-6). Cada fase
 * que corrige un caso lo quita de su lista: el test falla tanto si aparece uno
 * nuevo como si se corrige uno sin quitarlo. Quedan fuera `ui/` (generado por
 * shadcn) y `sections/` (legado que no se migra, DA-2).
 */
const RAIZ = resolve(import.meta.dirname, "..", "..", "..");
const SRC = join(RAIZ, "client", "src");
const posix = (ruta: string) => ruta.split(sep).join("/");

function recorrer(dir: string): string[] {
  return readdirSync(dir).flatMap((entrada) => {
    const ruta = join(dir, entrada);
    return statSync(ruta).isDirectory() ? recorrer(ruta) : [ruta];
  });
}

const revisados = [...recorrer(join(SRC, "components")), ...recorrer(join(SRC, "pages"))]
  .map((f) => posix(relative(RAIZ, f)))
  .filter(
    (f) =>
      f.endsWith(".tsx") &&
      !f.startsWith("client/src/components/ui/") &&
      !f.startsWith("client/src/components/sections/"),
  );

/** 4.2: `export default` pendientes de pasar a `export function` nombrada. */
const EXPORT_DEFAULT_PENDIENTES = [
  "client/src/components/layout/Footer.tsx",
  "client/src/components/layout/Header.tsx",
  "client/src/pages/blog-post.tsx",
  "client/src/pages/blog.tsx",
  "client/src/pages/componentes.tsx",
  "client/src/pages/eventos.tsx",
  "client/src/pages/inicio.tsx",
  "client/src/pages/mapa-de-ruta.tsx",
  "client/src/pages/nosotros.tsx",
  "client/src/pages/not-found.tsx",
  "client/src/pages/nuestro-equipo.tsx",
  "client/src/pages/plataforma.tsx",
  "client/src/pages/podcast.tsx",
  "client/src/pages/que-hacemos.tsx",
  "client/src/pages/unete.tsx",
];

/**
 * 3.3: componentes heredados con nombre en inglés y su nombre aprobado (DA-5).
 * Un nombre nuevo en inglés no se detecta solo: lo vigila la revisión.
 */
const NOMBRES_EN_INGLES_PENDIENTES: Record<string, string> = {
  "client/src/components/layout/Header.tsx": "CabeceraSitio",
  "client/src/components/layout/Footer.tsx": "PieSitio",
  "client/src/components/layout/ErrorBoundary.tsx": "LimiteDeErrores",
  "client/src/components/layout/ScrollRestoration.tsx": "RestaurarDesplazamiento",
};

describe("pendientes de la migración a Atomic Design", () => {
  it("se encontraron archivos que revisar", () => {
    expect(revisados.length).toBeGreaterThan(50);
  });

  it("CA-3: solo quedan los `export default` de la lista (4.2)", () => {
    const conDefault = revisados
      .filter((f) => /^export default /m.test(readFileSync(join(RAIZ, f), "utf8")))
      .sort();
    expect(conDefault).toEqual([...EXPORT_DEFAULT_PENDIENTES].sort());
  });

  it("CA-3: cada nombre en inglés de la lista sigue sin renombrar (3.3)", () => {
    for (const archivo of Object.keys(NOMBRES_EN_INGLES_PENDIENTES)) {
      expect(
        existsSync(join(RAIZ, archivo)),
        `${archivo} ya no existe: quítalo de NOMBRES_EN_INGLES_PENDIENTES`,
      ).toBe(true);
    }
  });
});
