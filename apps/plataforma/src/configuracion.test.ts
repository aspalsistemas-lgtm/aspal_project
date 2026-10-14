import { describe, expect, it } from "vitest";
import { cargarConfiguracion } from "./configuracion.js";

const URL_VALIDA = "postgres://aspal:aspal@localhost:5433/aspal";

describe("cargarConfiguracion (CA-1)", () => {
  it("lee la URL de la base y usa el puerto 3000 por defecto", () => {
    expect(cargarConfiguracion({ DATABASE_URL: URL_VALIDA })).toEqual({
      urlBaseDeDatos: URL_VALIDA,
      puerto: 3000,
    });
  });

  it("acepta un puerto numérico", () => {
    expect(cargarConfiguracion({ DATABASE_URL: URL_VALIDA, PORT: "5010" }).puerto).toBe(
      5010,
    );
  });

  it("no arranca sin DATABASE_URL y dice qué falta", () => {
    expect(() => cargarConfiguracion({})).toThrow(/DATABASE_URL/);
  });

  it("rechaza una URL que no es de PostgreSQL", () => {
    expect(() => cargarConfiguracion({ DATABASE_URL: "mysql://x@y/z" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rechaza un puerto fuera de rango o no numérico", () => {
    for (const PORT of ["0", "70000", "abc", "30.5"]) {
      expect(() => cargarConfiguracion({ DATABASE_URL: URL_VALIDA, PORT }), PORT).toThrow(
        /PORT/,
      );
    }
  });

  it("no incluye la URL de la base en el mensaje de error", () => {
    // La URL lleva la contraseña: un log de arranque fallido no debe filtrarla.
    try {
      cargarConfiguracion({ DATABASE_URL: "mysql://usuario:secreta@host/db" });
    } catch (error) {
      expect(String(error)).not.toContain("secreta");
    }
  });
});
