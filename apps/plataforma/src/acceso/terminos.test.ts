import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HUELLA_TEXTO_LEGAL, TERMINOS_VERSION } from "./terminos.js";

const FUENTE = resolve(
  import.meta.dirname,
  "../../../sitio/client/src/content/institucional/documentos-legales.ts",
);

/** Huella del texto legal del sitio: desde `export const TERMINOS`, con espacios normalizados. */
function huellaDelTextoLegal(): string {
  const fuente = readFileSync(FUENTE, "utf8");
  const desde = fuente.indexOf("export const TERMINOS");
  if (desde < 0) throw new Error("no se encontró TERMINOS en documentos-legales.ts");
  const normalizado = fuente.slice(desde).replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalizado).digest("hex");
}

describe("versión de los términos que se aceptan al registrarse", () => {
  it("la versión tiene la forma AAAA-MM", () => {
    expect(TERMINOS_VERSION).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it("el texto legal del sitio no cambió sin revisar la versión", () => {
    // Si falla: el texto de /terminos o /aviso-de-privacidad cambió. Revisa si hay una
    // versión nueva (actualiza TERMINOS_VERSION) y copia aquí la huella nueva
    // (HUELLA_TEXTO_LEGAL en terminos.ts).
    expect(huellaDelTextoLegal()).toBe(HUELLA_TEXTO_LEGAL);
  });
});
