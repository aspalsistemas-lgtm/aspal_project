import { describe, expect, it } from "vitest";
import {
  INTERVALO_ACTUALIZAR_USO_SEGUNDOS,
  MAXIMO_SESIONES_POR_CUENTA,
  duracionesPara,
  sesionVigente,
} from "./politica-sesion.js";
import { ROLES, esRol, tienePrivilegios } from "./rol.js";

const HORA = 3600;
const DIA = 24 * HORA;

describe("duraciones de la sesión (CA-8, §7 del plan)", () => {
  it("miembro y representante: 8 h de inactividad y 7 días como máximo", () => {
    for (const roles of [
      ["miembro"],
      ["representante"],
      ["miembro", "representante"],
      [],
    ]) {
      expect(duracionesPara(roles), JSON.stringify(roles)).toEqual({
        inactividadSegundos: 8 * HORA,
        absolutaSegundos: 7 * DIA,
      });
    }
  });

  it("administrador y gestor: 2 h de inactividad y 12 h como máximo", () => {
    for (const roles of [
      ["administrador"],
      ["gestor"],
      ["miembro", "gestor"],
      ["administrador", "miembro"],
    ]) {
      expect(duracionesPara(roles), JSON.stringify(roles)).toEqual({
        inactividadSegundos: 2 * HORA,
        absolutaSegundos: 12 * HORA,
      });
    }
  });

  it("basta UN rol privilegiado para que valga la política corta", () => {
    expect(duracionesPara(["miembro", "representante", "gestor"]).absolutaSegundos).toBe(
      12 * HORA,
    );
  });

  it("tiene un tope de 10 sesiones vivas por cuenta y actualiza el uso cada 5 minutos", () => {
    expect(MAXIMO_SESIONES_POR_CUENTA).toBe(10);
    expect(INTERVALO_ACTUALIZAR_USO_SEGUNDOS).toBe(300);
  });
});

describe("sesionVigente: se evalúa con los roles ACTUALES (CA-8)", () => {
  it("vigente si no pasó ni la inactividad ni la duración máxima", () => {
    expect(
      sesionVigente({ inactivaSegundos: HORA, antiguedadSegundos: 5 * HORA }, [
        "miembro",
      ]),
    ).toBe(true);
  });

  it("caduca por inactividad", () => {
    expect(
      sesionVigente({ inactivaSegundos: 8 * HORA + 1, antiguedadSegundos: 9 * HORA }, [
        "miembro",
      ]),
    ).toBe(false);
  });

  it("caduca por antigüedad aunque se use sin parar", () => {
    expect(
      sesionVigente({ inactivaSegundos: 0, antiguedadSegundos: 7 * DIA + 1 }, [
        "miembro",
      ]),
    ).toBe(false);
  });

  it("justo en el límite todavía vale", () => {
    expect(
      sesionVigente({ inactivaSegundos: 8 * HORA, antiguedadSegundos: 7 * DIA }, [
        "miembro",
      ]),
    ).toBe(true);
  });

  it("un miembro ascendido a administrador NO conserva su sesión larga", () => {
    // Nació cuando duraba 7 días; ahora es administrador y rige la política corta.
    const medidas = { inactivaSegundos: 3 * HORA, antiguedadSegundos: 30 * HORA };
    expect(sesionVigente(medidas, ["miembro"])).toBe(true);
    expect(sesionVigente(medidas, ["miembro", "administrador"])).toBe(false);
  });

  it("una sesión de administrador de 3 h sin uso ya no vale; la de 1 h sí", () => {
    expect(
      sesionVigente({ inactivaSegundos: 3 * HORA, antiguedadSegundos: 4 * HORA }, [
        "administrador",
      ]),
    ).toBe(false);
    expect(
      sesionVigente({ inactivaSegundos: HORA, antiguedadSegundos: 4 * HORA }, [
        "administrador",
      ]),
    ).toBe(true);
  });
});

describe("roles", () => {
  it("son exactamente cuatro", () => {
    expect(ROLES).toEqual(["administrador", "gestor", "representante", "miembro"]);
  });

  it("esRol solo acepta los cuatro", () => {
    for (const rol of ROLES) expect(esRol(rol)).toBe(true);
    for (const raro of ["Administrador", "operador", "soporte", "", null, undefined, 1]) {
      expect(esRol(raro)).toBe(false);
    }
  });

  it("solo administrador y gestor son privilegiados", () => {
    expect(tienePrivilegios(["administrador"])).toBe(true);
    expect(tienePrivilegios(["miembro", "gestor"])).toBe(true);
    expect(tienePrivilegios(["miembro", "representante"])).toBe(false);
    expect(tienePrivilegios([])).toBe(false);
  });
});
