import { describe, expect, it } from "vitest";
import { cargarConfiguracion, cargarConfiguracionAdmin } from "./configuracion.js";

const URL_VALIDA = "postgres://aspal_app:clave@localhost:5433/aspal";
const SECRETO = "secreto-de-prueba-con-mas-de-32-caracteres";
const BASE = {
  DATABASE_URL: URL_VALIDA,
  DOMINIO_BASE: "localhost",
  SECRETO_CLAVES: SECRETO,
};

describe("cargarConfiguracion (CA-1)", () => {
  it("lee la URL de la base, el dominio base y usa el puerto 3000 por defecto", () => {
    expect(cargarConfiguracion(BASE)).toEqual({
      urlBaseDeDatos: URL_VALIDA,
      dominioBase: "localhost",
      puerto: 3000,
      secretoClaves: SECRETO,
      trustProxy: 0,
      esquemaPublico: "https",
      puertoPublico: undefined,
      produccion: false,
    });
  });

  it("acepta un puerto numérico", () => {
    expect(cargarConfiguracion({ ...BASE, PORT: "5010" }).puerto).toBe(5010);
  });

  it("no arranca sin DATABASE_URL y dice qué falta", () => {
    expect(() =>
      cargarConfiguracion({ DOMINIO_BASE: "localhost", SECRETO_CLAVES: SECRETO }),
    ).toThrow(/DATABASE_URL/);
  });

  it("no arranca sin DOMINIO_BASE: sin él no se puede resolver la asociación", () => {
    expect(() =>
      cargarConfiguracion({ DATABASE_URL: URL_VALIDA, SECRETO_CLAVES: SECRETO }),
    ).toThrow(/DOMINIO_BASE/);
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

describe("configuración del acceso (plan del corte 3, CA-4, CA-12 y CA-10)", () => {
  it("exige SECRETO_CLAVES de al menos 32 caracteres y no lo repite en el error", () => {
    const { SECRETO_CLAVES: _quitado, ...sinSecreto } = BASE;
    expect(() => cargarConfiguracion(sinSecreto)).toThrow(/SECRETO_CLAVES/);
    try {
      cargarConfiguracion({ ...BASE, SECRETO_CLAVES: "corto-y-secreto" });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).toMatch(/SECRETO_CLAVES/);
      expect(String(error)).not.toContain("corto-y-secreto");
    }
  });

  describe("TRUST_PROXY", () => {
    it("por defecto no confía en ningún proxy", () => {
      expect(cargarConfiguracion(BASE).trustProxy).toBe(0);
      expect(cargarConfiguracion({ ...BASE, TRUST_PROXY: "0" }).trustProxy).toBe(0);
    });

    it.each(["1", "2", "10"])(
      "rechaza un número de saltos (%s): quien llegue directo podría falsificar la cabecera",
      (TRUST_PROXY) => {
        // Fastify falla cerrado con un número; contar saltos no valida al par inmediato.
        expect(() => cargarConfiguracion({ ...BASE, TRUST_PROXY })).toThrow(
          /TRUST_PROXY/,
        );
      },
    );

    it("acepta una lista de IP o CIDR del balanceador", () => {
      expect(
        cargarConfiguracion({ ...BASE, TRUST_PROXY: "10.0.0.0/8, 192.168.1.5" })
          .trustProxy,
      ).toEqual(["10.0.0.0/8", "192.168.1.5"]);
    });

    it.each(["true", "false", "*", "-1", "1.5", "todo", "10.0.0.0/8,loquesea", ""])(
      "rechaza %j: confiar a ciegas permitiría falsificar el origen",
      (TRUST_PROXY) => {
        expect(() => cargarConfiguracion({ ...BASE, TRUST_PROXY })).toThrow(
          /TRUST_PROXY/,
        );
      },
    );

    it("en producción es obligatorio declararlo (CA-12)", () => {
      expect(() => cargarConfiguracion({ ...BASE, NODE_ENV: "production" })).toThrow(
        /TRUST_PROXY/,
      );
      const produccion = cargarConfiguracion({
        ...BASE,
        NODE_ENV: "production",
        TRUST_PROXY: "0",
      });
      expect(produccion.produccion).toBe(true);
      expect(produccion.trustProxy).toBe(0);
    });
  });

  describe("ESQUEMA_PUBLICO y PUERTO_PUBLICO", () => {
    it("https por defecto", () => {
      expect(cargarConfiguracion(BASE).esquemaPublico).toBe("https");
    });

    it("http solo con un DOMINIO_BASE de desarrollo (.localhost), nunca en otro dominio", () => {
      // Con http la cookie pierde Secure y el prefijo __Host-: no puede llegar a producción.
      expect(
        cargarConfiguracion({ ...BASE, ESQUEMA_PUBLICO: "http" }).esquemaPublico,
      ).toBe("http");
      expect(
        cargarConfiguracion({
          ...BASE,
          DOMINIO_BASE: "dev.localhost",
          ESQUEMA_PUBLICO: "http",
        }).esquemaPublico,
      ).toBe("http");
      for (const DOMINIO_BASE of [
        "asociacionesprofesionales.org",
        "evillocalhost",
        "localhost.evil.com",
      ]) {
        expect(
          () => cargarConfiguracion({ ...BASE, DOMINIO_BASE, ESQUEMA_PUBLICO: "http" }),
          DOMINIO_BASE,
        ).toThrow(/ESQUEMA_PUBLICO/);
      }
    });

    it("rechaza un esquema que no es http ni https", () => {
      expect(() => cargarConfiguracion({ ...BASE, ESQUEMA_PUBLICO: "ftp" })).toThrow(
        /ESQUEMA_PUBLICO/,
      );
    });

    it("el puerto público es opcional y numérico (solo para el Origin en local)", () => {
      expect(cargarConfiguracion(BASE).puertoPublico).toBeUndefined();
      expect(cargarConfiguracion({ ...BASE, PUERTO_PUBLICO: "5010" }).puertoPublico).toBe(
        5010,
      );
      for (const PUERTO_PUBLICO of ["0", "70000", "abc"]) {
        expect(
          () => cargarConfiguracion({ ...BASE, PUERTO_PUBLICO }),
          PUERTO_PUBLICO,
        ).toThrow(/PUERTO_PUBLICO/);
      }
    });
  });
});
