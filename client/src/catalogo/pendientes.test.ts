import { readdirSync, readFileSync, statSync } from "node:fs";
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
 * 3.3, cerrado en la F4: los seis heredados en inglés ya tienen su nombre en
 * español (DA-5). No deben volver. Un nombre nuevo en inglés no se detecta
 * solo: lo vigila la revisión.
 */
const NOMBRES_RETIRADOS: Record<string, string> = {
  Header: "CabeceraSitio",
  Footer: "PieSitio",
  BlogCard: "TarjetaArticulo",
  ScrollToTop: "BotonVolverArriba",
  ErrorBoundary: "LimiteDeErrores",
  ScrollRestoration: "RestaurarDesplazamiento",
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

  it("CA-3: ningún componente vuelve a un nombre retirado en inglés (3.3)", () => {
    const reaparecidos = revisados.filter((f) => {
      const nombre =
        f
          .split("/")
          .pop()
          ?.replace(/\.tsx$/, "") ?? "";
      return nombre in NOMBRES_RETIRADOS;
    });
    expect(
      reaparecidos,
      `usa el nombre aprobado: ${JSON.stringify(NOMBRES_RETIRADOS)}`,
    ).toEqual([]);
  });
});
