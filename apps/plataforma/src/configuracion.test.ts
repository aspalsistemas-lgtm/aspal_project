import { describe, expect, it } from "vitest";
import { cargarConfiguracion, cargarConfiguracionAdmin } from "./configuracion.js";

const URL_VALIDA = "postgres://aspal_app:clave@localhost:5433/aspal";
const BASE = { DATABASE_URL: URL_VALIDA, DOMINIO_BASE: "localhost" };

describe("cargarConfiguracion (CA-1)", () => {
  it("lee la URL de la base, el dominio base y usa el puerto 3000 por defecto", () => {
    expect(cargarConfiguracion(BASE)).toEqual({
      urlBaseDeDatos: URL_VALIDA,
      dominioBase: "localhost",
      puerto: 3000,
    });
  });

  it("acepta un puerto numérico", () => {
    expect(cargarConfiguracion({ ...BASE, PORT: "5010" }).puerto).toBe(5010);
  });

  it("no arranca sin DATABASE_URL y dice qué falta", () => {
    expect(() => cargarConfiguracion({ DOMINIO_BASE: "localhost" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("no arranca sin DOMINIO_BASE: sin él no se puede resolver la asociación", () => {
    expect(() => cargarConfiguracion({ DATABASE_URL: URL_VALIDA })).toThrow(
      /DOMINIO_BASE/,
    );
  });

  it("rechaza un DOMINIO_BASE con esquema, puerto, ruta o mayúsculas", () => {
    for (const DOMINIO_BASE of [
      "https://localhost",
      "localhost:5010",
      "localhost/",
      "Localhost",
      ".localhost",
    ]) {
      expect(() => cargarConfiguracion({ ...BASE, DOMINIO_BASE }), DOMINIO_BASE).toThrow(
        /DOMINIO_BASE/,
      );
    }
  });

  it("rechaza una URL que no es de PostgreSQL", () => {
    expect(() => cargarConfiguracion({ ...BASE, DATABASE_URL: "mysql://x@y/z" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rechaza una URL con options=: podría traer un contexto de asociación por defecto", () => {
    // Con `options=-c app.asociacion_id=…` cada conexión nacería dentro de una
    // asociación y «sin contexto» dejaría de significar «nada visible».
    const conOpciones = `${URL_VALIDA}?options=-c%20app.asociacion_id%3Dx`;
    expect(() => cargarConfiguracion({ ...BASE, DATABASE_URL: conOpciones })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rechaza options= aunque venga codificado (auditoría 5)", () => {
    const codificada = `${URL_VALIDA}?%6Fptions=-c%20app.asociacion_id%3Dx`;
    expect(() => cargarConfiguracion({ ...BASE, DATABASE_URL: codificada })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rechaza PGOPTIONS en el entorno: pg la aplicaría a cada conexión (auditoría 5)", () => {
    expect(() =>
      cargarConfiguracion({ ...BASE, PGOPTIONS: "-c app.asociacion_id=x" }),
    ).toThrow(/PGOPTIONS/);
  });

  it("rechaza un puerto fuera de rango o no numérico", () => {
    for (const PORT of ["0", "70000", "abc", "30.5"]) {
      expect(() => cargarConfiguracion({ ...BASE, PORT }), PORT).toThrow(/PORT/);
    }
  });

  it("no lee la URL de administrador aunque esté en el entorno", () => {
    // El proceso de la aplicación nunca debe tener las credenciales del migrador.
    const configuracion = cargarConfiguracion({
      ...BASE,
      DATABASE_URL_ADMIN: "postgres://aspal:secreta@localhost/aspal",
    });
    expect(JSON.stringify(configuracion)).not.toContain("secreta");
  });

  it("no incluye la URL de la base en el mensaje de error", () => {
    // La URL lleva la contraseña: un log de arranque fallido no debe filtrarla.
    try {
      cargarConfiguracion({ ...BASE, DATABASE_URL: "mysql://usuario:secreta@host/db" });
    } catch (error) {
      expect(String(error)).not.toContain("secreta");
    }
  });
});

describe("cargarConfiguracionAdmin", () => {
  it("lee la URL de administrador y la contraseña del rol de la aplicación", () => {
    expect(
      cargarConfiguracionAdmin({
        DATABASE_URL_ADMIN: "postgres://aspal:x@localhost:5433/aspal",
        DATABASE_PASSWORD_APP: "clave-local-larga",
      }),
    ).toEqual({
      urlAdmin: "postgres://aspal:x@localhost:5433/aspal",
      claveRolApp: "clave-local-larga",
    });
  });

  it("exige la URL y no repite su valor en el error", () => {
    expect(() => cargarConfiguracionAdmin({})).toThrow(/DATABASE_URL_ADMIN/);
    try {
      cargarConfiguracionAdmin({ DATABASE_URL_ADMIN: "mysql://a:secreta@h/d" });
    } catch (error) {
      expect(String(error)).toMatch(/DATABASE_URL_ADMIN/);
      expect(String(error)).not.toContain("secreta");
    }
  });

  it("la contraseña del rol es opcional (migrar no la usa), pero no puede ser corta", () => {
    const url = "postgres://aspal:x@localhost:5433/aspal";
    expect(
      cargarConfiguracionAdmin({ DATABASE_URL_ADMIN: url }).claveRolApp,
    ).toBeUndefined();
    expect(() =>
      cargarConfiguracionAdmin({
        DATABASE_URL_ADMIN: url,
        DATABASE_PASSWORD_APP: "corta",
      }),
    ).toThrow(/DATABASE_PASSWORD_APP/);
  });
});
