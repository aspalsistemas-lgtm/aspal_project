import { describe, expect, it } from "vitest";
import { vistaReciente, type EstadoConsulta } from "./contenido-reciente";

const pendiente: EstadoConsulta = { pendiente: true, error: false, cantidad: 0 };
const fallo: EstadoConsulta = { pendiente: false, error: true, cantidad: 0 };
const vacia: EstadoConsulta = { pendiente: false, error: false, cantidad: 0 };
const conDatos: EstadoConsulta = { pendiente: false, error: false, cantidad: 3 };

describe("vistaReciente (RF-13)", () => {
  it("muestra el esqueleto mientras alguna consulta sigue pendiente", () => {
    expect(vistaReciente(pendiente, pendiente)).toBe("cargando");
    expect(vistaReciente(conDatos, pendiente)).toBe("cargando");
  });

  it("oculta el bloque si todas fallan", () => {
    expect(vistaReciente(fallo, fallo)).toBe("oculta");
  });

  it("oculta el bloque si no hay nada que mostrar, haya fallo o no", () => {
    expect(vistaReciente(vacia, vacia)).toBe("oculta");
    expect(vistaReciente(vacia, fallo)).toBe("oculta");
  });

  it("muestra lo que sí llegó aunque la otra consulta falle", () => {
    expect(vistaReciente(conDatos, fallo)).toBe("lista");
    expect(vistaReciente(fallo, { ...conDatos, cantidad: 1 })).toBe("lista");
  });
});
