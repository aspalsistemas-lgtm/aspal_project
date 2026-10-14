import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { ETIQUETA_NIVEL, REGISTRO } from "./registro";
import type { Categoria, Nivel } from "./tipos";

const RAIZ = resolve(import.meta.dirname, "..", "..", "..");
const SRC = join(RAIZ, "client", "src");
const posix = (ruta: string) => ruta.split(sep).join("/");

function recorrer(dir: string): string[] {
  return readdirSync(dir).flatMap((entrada) => {
    const ruta = join(dir, entrada);
    return statSync(ruta).isDirectory() ? recorrer(ruta) : [ruta];
  });
}

const todosLosComponentes = recorrer(join(SRC, "components"));

const enDisco = todosLosComponentes
  .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
  .map((f) => posix(relative(RAIZ, f)))
  .sort();

// El propio catálogo no cuenta como uso: si no, mantendría vivo lo que nadie
// más importa.
const fuentes = recorrer(SRC)
  .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f))
  .map((f) => ({ ruta: posix(relative(RAIZ, f)), texto: readFileSync(f, "utf8") }))
  .filter(
    (f) =>
      !f.ruta.startsWith("client/src/catalogo/") &&
      f.ruta !== "client/src/pages/componentes.tsx",
  );

/**
 * Quién importa el archivo: por alias `@/components/<carpeta>/<Nombre>` o
 * relativo. Límites del detector:
 * - Las rutas relativas profundas (`../components/…`, `../../layout/X`) no se
 *   detectan: el componente saldría «sin-uso» y el test fallaría en voz alta.
 *   Usa el alias `@/`.
 * - El uso no es transitivo: si A solo lo importa B y B no lo importa nadie,
 *   A cuenta como «en-uso».
 */
function importadores(archivo: string): string[] {
  const nombre = basename(archivo, ".tsx");
  const carpeta = basename(dirname(archivo));
  const patron = new RegExp(
    `["'](?:@/components/${carpeta}/${nombre}|\\.\\.?/(?:${carpeta}/)?${nombre})["']`,
  );
  return fuentes
    .filter((f) => f.ruta !== archivo && patron.test(f.texto))
    .map((f) => f.ruta);
}

/** Dominios que pueden vivir en cualquier carpeta de nivel atómico. */
const DOMINIOS: Categoria[] = ["layout", "institucional", "contenido", "formularios"];

/**
 * Atomic Design (design.md §1.2): la carpeta da el nivel y la categoría sigue
 * siendo el dominio con el que se navega /componentes (DA-3).
 */
const CATEGORIAS_POR_CARPETA: Record<string, Categoria[]> = {
  atoms: DOMINIOS,
  molecules: DOMINIOS,
  organisms: DOMINIOS,
  templates: DOMINIOS,
  infraestructura: ["infraestructura"],
  ui: ["ui"],
  sections: ["legado"],
};

/** Nivel que fija cada carpeta. `ui/` (shadcn) cuenta como átomos (DA-1). */
const NIVEL_POR_CARPETA: Record<string, Nivel[]> = {
  atoms: ["atomo"],
  molecules: ["molecula"],
  organisms: ["organismo"],
  templates: ["plantilla"],
  infraestructura: ["infraestructura"],
  ui: ["atomo"],
  sections: ["legado"],
};

/** Identificador que trae la línea `importar`: el default o el primero entre llaves. */
function identificadorImportado(importar: string): string | undefined {
  return (
    importar.match(/^import\s+([A-Za-z_$][\w$]*)\s+from/)?.[1] ??
    importar.match(/^import\s*\{\s*([A-Za-z_$][\w$]*)/)?.[1]
  );
}

function exportaIdentificador(texto: string, nombre: string): boolean {
  const n = nombre.replace(/\$/g, String.raw`\$`);
  const declaracion = new RegExp(
    String.raw`export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|class)\s+${n}\b`,
  );
  if (declaracion.test(texto)) return true;
  return [...texto.matchAll(/export\s*\{([^}]*)\}/g)].some((m) =>
    m[1]
      .split(",")
      .map((x) =>
        x
          .trim()
          .split(/\s+as\s+/)
          .pop(),
      )
      .includes(nombre),
  );
}

describe("registro del catálogo", () => {
  it("solo hay .tsx y .test.tsx en client/src/components", () => {
    const intrusos = todosLosComponentes
      .filter((f) => !f.endsWith(".tsx"))
      .map((f) => posix(relative(RAIZ, f)));
    expect(
      intrusos,
      "los componentes van en .tsx; un helper va en client/src/lib/ o client/src/hooks/",
    ).toEqual([]);
  });

  it("tiene una entrada por cada componente de client/src/components, y nada más", () => {
    expect(REGISTRO.map((e) => e.archivo).sort()).toEqual(enDisco);
  });

  it("usa ids únicos en kebab-case", () => {
    const ids = REGISTRO.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("clasifica cada componente según su carpeta", () => {
    for (const e of REGISTRO) {
      const carpeta = basename(dirname(e.archivo));
      expect(
        CATEGORIAS_POR_CARPETA,
        "carpeta nueva: añádela a CATEGORIAS_POR_CARPETA y al tipo Categoria",
      ).toHaveProperty(carpeta);
      expect(CATEGORIAS_POR_CARPETA[carpeta], e.archivo).toContain(e.categoria);
    }
  });

  it("CA-1: declara un nivel atómico válido en cada entrada", () => {
    for (const e of REGISTRO) {
      expect(Object.keys(ETIQUETA_NIVEL), e.archivo).toContain(e.nivel);
    }
  });

  it("CA-2: el nivel de cada componente coincide con su carpeta", () => {
    for (const e of REGISTRO) {
      const carpeta = basename(dirname(e.archivo));
      expect(
        NIVEL_POR_CARPETA,
        "carpeta nueva: añádela a NIVEL_POR_CARPETA y a CATEGORIAS_POR_CARPETA",
      ).toHaveProperty(carpeta);
      expect(NIVEL_POR_CARPETA[carpeta], e.archivo).toContain(e.nivel);
    }
  });

  it("marca en uso lo que alguien importa y sin uso lo que no", () => {
    for (const e of REGISTRO) {
      const usado = importadores(e.archivo).length > 0;
      expect(
        e.estado,
        `${e.nombre}: ${usado ? "tiene importadores" : "nadie lo importa"}`,
      ).toBe(usado ? "en-uso" : "sin-uso");
    }
  });

  it("da una línea de import que apunta a su archivo", () => {
    for (const e of REGISTRO) {
      const modulo = `@/components/${basename(dirname(e.archivo))}/${basename(e.archivo, ".tsx")}`;
      expect(e.importar, e.nombre).toContain(`"${modulo}"`);
    }
  });

  it("el nombre que importa cada línea existe como export del archivo", () => {
    for (const e of REGISTRO) {
      // Toast se lanza desde el hook (`toast` en @/hooks/use-toast); el archivo
      // del componente solo exporta las piezas que pinta el Toaster.
      if (e.id === "toast") continue;
      const nombre = identificadorImportado(e.importar);
      expect(nombre, `${e.nombre}: no se entiende su línea importar`).toBeDefined();
      const texto = readFileSync(join(RAIZ, e.archivo), "utf8");
      expect(
        exportaIdentificador(texto, nombre!),
        `${e.nombre}: ${e.archivo} no exporta «${nombre}»`,
      ).toBe(true);
    }
  });

  it("no deja textos vacíos", () => {
    for (const e of REGISTRO) {
      for (const texto of [e.nombre, e.descripcion, e.usarCuando, e.props]) {
        expect(texto.trim(), e.id).not.toBe("");
      }
    }
  });
});
