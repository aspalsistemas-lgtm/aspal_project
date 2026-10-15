/**
 * Guardián de código (plan del corte 2, guardián 5): el contexto de asociación
 * solo se fija en `base-de-datos.ts`, dentro de `conAsociacion`. Si otro archivo
 * pudiera hacer `set_config('app.asociacion_id', …)`, el aislamiento dependería
 * de que nadie se equivoque.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(import.meta.dirname);

/** Archivos de código de la aplicación (sin tests ni utilidades de prueba). */
function archivosDeCodigo(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory())
      return entrada.name === "pruebas" ? [] : archivosDeCodigo(ruta);
    return /\.ts$/.test(entrada.name) && !/\.test\.ts$/.test(entrada.name) ? [ruta] : [];
  });
}

/** El código sin comentarios: un comentario que lo explica no es una infracción. */
function sinComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const archivos = archivosDeCodigo(SRC).map((ruta) => ({
  ruta: relative(SRC, ruta).replaceAll("\\", "/"),
  codigo: sinComentarios(readFileSync(ruta, "utf8")),
}));

describe("guardián de código (CA-3)", () => {
  it("encuentra los archivos de código", () => {
    expect(archivos.map((a) => a.ruta)).toContain("base-de-datos.ts");
  });

  it("solo base-de-datos.ts fija el contexto de asociación", () => {
    const infractores = archivos
      .filter((a) => /set_config|\bSET\s+(LOCAL\s+|SESSION\s+)?"?app\./i.test(a.codigo))
      .map((a) => a.ruta);
    expect(infractores).toEqual(["base-de-datos.ts"]);
  });

  it("app.asociacion_id solo aparece donde se fija y donde se borra", () => {
    // preparar-base.ts lo nombra únicamente para RESET (auditoría 5).
    const infractores = archivos
      .filter((a) => /app\.asociacion_id/.test(a.codigo))
      .map((a) => a.ruta)
      .filter((ruta) => !["base-de-datos.ts", "preparar-base.ts"].includes(ruta));
    expect(infractores).toEqual([]);
  });

  it("nadie usa sql.raw ni el cliente crudo ($client) fuera de base-de-datos.ts (auditoría 2)", () => {
    // sql.raw salta los parámetros enlazados (inyección = acceso entre
    // asociaciones); $client salta el cliente vigilado de conAsociacion.
    const infractores = archivos
      .filter((a) => /\bsql\.raw\s*\(|\$client\b/.test(a.codigo))
      .map((a) => a.ruta)
      // esquema.ts: sql.raw solo con constantes del código para los CHECK de la
      // tabla (Drizzle Kit los vuelca a la migración); nunca con datos de entrada.
      .filter((ruta) => !["base-de-datos.ts", "esquema.ts"].includes(ruta));
    expect(infractores).toEqual([]);
  });

  it("los enlaces no se construyen con request.hostname ni request.protocol (CA-12)", () => {
    // Con trustProxy activo leerían X-Forwarded-Host/Proto, que pone quien quiera.
    // Los enlaces salen de DOMINIO_BASE, ESQUEMA_PUBLICO y el subdominio ya resuelto.
    const infractores = archivos
      .filter((a) => /\b(peticion|request|req)\.(hostname|protocol)\b/.test(a.codigo))
      .map((a) => a.ruta);
    expect(infractores).toEqual([]);
  });

  it("nadie lee X-Forwarded-Host: la asociación sale solo del Host", () => {
    const infractores = archivos
      .filter((a) => /x-forwarded-host/i.test(a.codigo))
      .map((a) => a.ruta);
    expect(infractores).toEqual([]);
  });

  it("ningún archivo importa un programa (en el bundle se ejecutaría también)", () => {
    // Pasó con migrar.ts → preparar-base.ts: dist/migrar.js ejecutaba también
    // la preparación de la base.
    const programas = archivos
      .filter((a) => /process\.argv\[1\]/.test(a.codigo))
      .map((a) => a.ruta.replace(/\.ts$/, ".js").split("/").pop()!);
    const infractores = archivos.filter((a) =>
      programas.some((programa) =>
        new RegExp(`from\\s+["'][./]+[^"']*${programa.replace(".", "\\.")}["']`).test(
          a.codigo,
        ),
      ),
    );
    expect(programas).toEqual(
      expect.arrayContaining(["migrar.js", "preparar-base.js", "sembrar.js"]),
    );
    expect(infractores.map((a) => a.ruta)).toEqual([]);
  });

  it("solo los archivos de infraestructura importan pg directamente", () => {
    // El resto recibe la base dentro de conAsociacion; los scripts de
    // administración (preparar, migrar, sembrar) no corren en el servidor.
    const permitidos = [
      "base-de-datos.ts",
      "migrar.ts",
      "preparar-base.ts",
      "sembrar.ts",
    ];
    const infractores = archivos
      .filter((a) => /from\s+["']pg["']/.test(a.codigo))
      .map((a) => a.ruta)
      .filter((ruta) => !permitidos.includes(ruta));
    expect(infractores).toEqual([]);
  });

  describe("acceso (corte 3)", () => {
    const HASH = /\b(hash_contrasena|hashContrasena|token_hash|tokenHash)\b/;
    const LLAMADA = /\b(?:enAsociacion|conAsociacion)\(\s*([^,]+?)\s*,/g;
    const CAMPO_SECRETO_EN_ESQUEMA =
      /\b(hash\w*|token\w*|cuentaId|sesionId|personaId|credencial\w*)\s*:\s*z\./i;

    it("sus detectores detectan una infracción de muestra (sin falsos verdes)", () => {
      expect(HASH.test("SELECT token_hash FROM x")).toBe(true);
      expect(HASH.test("const { hashContrasena } = fila")).toBe(true);
      expect([..."enAsociacion(peticion.body.id, fn)".matchAll(LLAMADA)][0]?.[1]).toBe(
        "peticion.body.id",
      );
      expect(
        [..."enAsociacion((peticion.body as X).id, fn)".matchAll(LLAMADA)][0]?.[1],
      ).toBe("(peticion.body as X).id");
      expect(CAMPO_SECRETO_EN_ESQUEMA.test("z.object({ tokenHash: z.string() })")).toBe(
        true,
      );
      expect(CAMPO_SECRETO_EN_ESQUEMA.test("z.object({ nombre: z.string() })")).toBe(
        false,
      );
    });

    it("solo el módulo acceso/ (y el esquema y las semillas) nombra hashes y tokens guardados", () => {
      const infractores = archivos
        .filter((a) => HASH.test(a.codigo))
        .map((a) => a.ruta)
        .filter(
          (ruta) =>
            !ruta.startsWith("acceso/") && !["esquema.ts", "sembrar.ts"].includes(ruta),
        );
      expect(infractores).toEqual([]);
    });

    it("el id con que se entra en una asociación sale de peticion.asociacion, nunca de la entrada", () => {
      const llamadas = archivos
        .filter((a) => !["base-de-datos.ts", "servidor.ts", "app.ts"].includes(a.ruta))
        .flatMap((a) =>
          [...a.codigo.matchAll(LLAMADA)].map((m) => ({
            ruta: a.ruta,
            argumento: m[1]!,
            codigo: a.codigo,
          })),
        );
      expect(llamadas.length).toBeGreaterThan(0);
      for (const { ruta, argumento, codigo } of llamadas) {
        const directo = /^peticion\.asociacion!?\.id$/.test(argumento);
        // Una variable solo vale si el archivo la toma de peticion.asociacion.
        const variable =
          /^(asociacionId|asociacion\.id)$/.test(argumento) &&
          /=\s*peticion\.asociacion\b/.test(codigo);
        expect(directo || variable, `${ruta}: enAsociacion(${argumento}, …)`).toBe(true);
      }
    });

    it("los esquemas de las rutas no declaran hashes, tokens ni ids de cuenta o sesión", () => {
      const infractores = archivos
        .filter((a) => /(^|\/)rutas[^/]*\.ts$/.test(a.ruta))
        .filter((a) => CAMPO_SECRETO_EN_ESQUEMA.test(a.codigo))
        .map((a) => a.ruta);
      expect(infractores).toEqual([]);
    });
  });
});
