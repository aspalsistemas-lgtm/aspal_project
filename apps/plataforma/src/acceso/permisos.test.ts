import { describe, expect, it } from "vitest";
import { ACCIONES, puede } from "./permisos.js";
import { ROLES } from "./rol.js";

/** Tabla esperada, escrita a mano: no se deriva de la implementación. */
const ESPERADO: Record<string, readonly string[]> = {
  "perfil:ver_propio": ["administrador", "gestor", "representante", "miembro"],
  "personas:listar": ["administrador", "gestor"],
  "personas:ver_correo": ["administrador", "gestor"],
  "roles:asignar": ["administrador"],
  "personas:cambiar_estado": ["administrador"],
};

describe("matriz rol × acción (CA-17)", () => {
  it("cubre exactamente las acciones previstas", () => {
    expect([...ACCIONES].sort()).toEqual(Object.keys(ESPERADO).sort());
  });

  for (const accion of Object.keys(ESPERADO)) {
    for (const rol of ROLES) {
      const permitido = ESPERADO[accion]!.includes(rol);
      it(`${rol} ${permitido ? "puede" : "NO puede"} ${accion}`, () => {
        expect(puede([rol], accion)).toBe(permitido);
      });
    }
  }

  it("deniega por defecto: sin roles, roles desconocidos o acciones desconocidas", () => {
    expect(puede([], "perfil:ver_propio")).toBe(false);
    expect(puede(["superusuario"], "roles:asignar")).toBe(false);
    expect(puede(["administrador"], "borrar:todo")).toBe(false);
    expect(puede(["administrador"], "")).toBe(false);
    expect(puede(["administrador"], "toString")).toBe(false);
    expect(puede(["administrador"], "__proto__")).toBe(false);
  });

  it("con varios roles basta con que uno lo permita", () => {
    expect(puede(["miembro", "gestor"], "personas:listar")).toBe(true);
    expect(puede(["miembro", "representante"], "personas:listar")).toBe(false);
  });
});
