import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { construirApp } from "./app.js";
import { dependenciasDePrueba } from "./pruebas/dependencias.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function pedirSalud(comprobarBaseDeDatos: () => Promise<boolean>) {
  app = construirApp(dependenciasDePrueba({ comprobarBaseDeDatos }));
  return app.inject({ method: "GET", url: "/health" });
}

describe("GET /health (CA-2)", () => {
  it("responde 200 con el sobre único cuando la base contesta", async () => {
    const respuesta = await pedirSalud(async () => true);
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({
      success: true,
      data: { estado: "ok", baseDeDatos: "ok" },
    });
  });

  it("responde 503 NO_DISPONIBLE cuando la base no contesta", async () => {
    const respuesta = await pedirSalud(async () => false);
    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.json()).toEqual({
      success: false,
      error: { codigo: "NO_DISPONIBLE", mensaje: "La base de datos no responde" },
    });
  });

  it("responde 503 y no filtra el error si la comprobación lanza", async () => {
    const respuesta = await pedirSalud(async () => {
      throw new Error("password authentication failed for user aspal");
    });
    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.body).not.toContain("password");
  });
});

describe("rutas desconocidas", () => {
  it("responden 404 con el sobre único", async () => {
    app = construirApp(dependenciasDePrueba());
    const respuesta = await app.inject({ method: "GET", url: "/no-existe" });
    expect(respuesta.statusCode).toBe(404);
    expect(respuesta.json()).toEqual({
      success: false,
      error: { codigo: "RECURSO_NO_ENCONTRADO", mensaje: "La ruta no existe" },
    });
  });
});
