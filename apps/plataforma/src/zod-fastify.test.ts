import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { construirApp } from "./app.js";
import { dependenciasDePrueba } from "./pruebas/dependencias.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Una app con una ruta de prueba que valida la entrada y la salida con Zod. */
function appConRutaDePrueba(respuesta: unknown) {
  app = construirApp(dependenciasDePrueba());
  app.post(
    "/prueba",
    {
      schema: {
        body: z.object({ nombre: z.string().min(1), edad: z.number().int() }),
        response: {
          200: z.object({ success: z.literal(true), data: z.object({ id: z.number() }) }),
        },
      },
    },
    async () => respuesta,
  );
  return app;
}

describe("validación con Zod (CA-1)", () => {
  it("rechaza una entrada que no cumple el esquema con 400 VALIDACION_FALLIDA y el campo", async () => {
    const respuesta = await appConRutaDePrueba({ success: true, data: { id: 1 } }).inject(
      {
        method: "POST",
        url: "/prueba",
        payload: { nombre: "Ana", edad: "treinta" },
      },
    );
    expect(respuesta.statusCode).toBe(400);
    expect(respuesta.json()).toMatchObject({
      success: false,
      error: { codigo: "VALIDACION_FALLIDA", campo: "edad" },
    });
  });

  it("deja pasar una entrada válida", async () => {
    const respuesta = await appConRutaDePrueba({ success: true, data: { id: 1 } }).inject(
      {
        method: "POST",
        url: "/prueba",
        payload: { nombre: "Ana", edad: 30 },
      },
    );
    expect(respuesta.statusCode).toBe(200);
  });

  it("quita de la salida los campos que el esquema no declara", async () => {
    // Un campo interno que se cuela en el objeto devuelto no debe salir.
    const respuesta = await appConRutaDePrueba({
      success: true,
      data: { id: 1, contrasena: "no-debe-salir" },
    }).inject({ method: "POST", url: "/prueba", payload: { nombre: "Ana", edad: 30 } });
    expect(respuesta.json()).toEqual({ success: true, data: { id: 1 } });
  });

  it("responde 500 ERROR_INTERNO si la salida no cumple el esquema, sin detalles", async () => {
    const respuesta = await appConRutaDePrueba({
      success: true,
      data: { id: "uno" },
    }).inject({
      method: "POST",
      url: "/prueba",
      payload: { nombre: "Ana", edad: 30 },
    });
    expect(respuesta.statusCode).toBe(500);
    expect(respuesta.json()).toEqual({
      success: false,
      error: { codigo: "ERROR_INTERNO", mensaje: "Error interno" },
    });
  });
});
