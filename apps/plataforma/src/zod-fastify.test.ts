import { Writable } from "node:stream";
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
      config: { categoria: "global" },
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

describe("registro de errores no controlados (auditoría del 3b, B1)", () => {
  it("no vuelca el mensaje ni la pila: la consulta de Drizzle trae correos y hashes", async () => {
    const lineas: string[] = [];
    const flujo = new Writable({
      write(trozo, _codificacion, listo) {
        lineas.push(String(trozo));
        listo();
      },
    });
    app = construirApp(dependenciasDePrueba(), { logger: { stream: flujo } });
    app.get("/rompe", { config: { categoria: "global" } }, async () => {
      const error = new Error(
        "Failed query: insert into cuenta_acceso params: ana@ejemplo.org,scrypt$16384$8$1$sal$clave",
      );
      throw Object.assign(error, { cause: { code: "40P01" } });
    });
    const respuesta = await app.inject({ method: "GET", url: "/rompe" });
    expect(respuesta.statusCode).toBe(500);
    const log = lineas.join("");
    expect(log).toContain("40P01");
    for (const secreto of [
      "ana@ejemplo.org",
      "scrypt$",
      "Failed query",
      "cuenta_acceso",
    ]) {
      expect(log, secreto).not.toContain(secreto);
    }
  });
});
