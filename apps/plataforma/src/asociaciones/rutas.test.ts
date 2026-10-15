import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { construirApp, type Dependencias } from "../app.js";
import { dependenciasDePrueba } from "../pruebas/dependencias.js";

const ASPAL = { id: "0b9e7c1e-1111-4111-8111-111111111111", subdominio: "aspal" };
const FILA_ASPAL = {
  nombre: "ASPAL",
  subdominio: "aspal",
  zonaHoraria: "America/Merida",
};

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function construir(parciales: Partial<Dependencias>) {
  app = construirApp(dependenciasDePrueba(parciales));
  return app;
}

/** Simula conAsociacion: devuelve las filas que «vería» RLS y anota el id. */
function enAsociacionQueDevuelve(filas: unknown[], ids: string[] = []) {
  return (async (id: string) => {
    ids.push(id);
    return filas;
  }) as Dependencias["enAsociacion"];
}

describe("GET /asociaciones/actual (CA-7)", () => {
  it("con el Host de una asociación responde sus datos, sin el id interno", async () => {
    const ids: string[] = [];
    const resolverAsociacion = vi.fn(async (sub: string) =>
      sub === "aspal" ? ASPAL : null,
    );
    const respuesta = await construir({
      resolverAsociacion,
      enAsociacion: enAsociacionQueDevuelve([{ ...FILA_ASPAL, id: ASPAL.id }], ids),
    }).inject({
      method: "GET",
      url: "/asociaciones/actual",
      headers: { host: "aspal.localhost:5010" },
    });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({ success: true, data: FILA_ASPAL });
    expect(respuesta.body).not.toContain(ASPAL.id);
    expect(respuesta.headers["cache-control"]).toBe("private, no-store");
    expect(resolverAsociacion).toHaveBeenCalledWith("aspal");
    // El contexto de la lectura es el de la asociación resuelta del Host.
    expect(ids).toEqual([ASPAL.id]);
  });

  it.each([
    "localhost",
    "localhost:5010",
    "nada.localhost",
    "www.localhost",
    "a.b.localhost",
  ])("con Host %s responde 404 y no entra en ningún contexto", async (host) => {
    const ids: string[] = [];
    const respuesta = await construir({
      resolverAsociacion: async () => null,
      enAsociacion: enAsociacionQueDevuelve([FILA_ASPAL], ids),
    }).inject({ method: "GET", url: "/asociaciones/actual", headers: { host } });
    expect(respuesta.statusCode).toBe(404);
    expect(respuesta.json()).toEqual({
      success: false,
      error: {
        codigo: "RECURSO_NO_ENCONTRADO",
        mensaje: "No hay una asociación en esta dirección",
      },
    });
    expect(respuesta.headers["cache-control"]).toBe("private, no-store");
    expect(ids).toEqual([]);
  });

  it("ignora X-Forwarded-Host: no se puede pedir en nombre de otra asociación", async () => {
    const resolverAsociacion = vi.fn(async () => ASPAL);
    const respuesta = await construir({
      resolverAsociacion,
      enAsociacion: enAsociacionQueDevuelve([FILA_ASPAL]),
    }).inject({
      method: "GET",
      url: "/asociaciones/actual",
      headers: { host: "localhost", "x-forwarded-host": "aspal.localhost" },
    });
    expect(respuesta.statusCode).toBe(404);
    expect(resolverAsociacion).not.toHaveBeenCalled();
  });

  it("si RLS devolviera más de una asociación, responde 500 sin datos", async () => {
    const respuesta = await construir({
      resolverAsociacion: async () => ASPAL,
      enAsociacion: enAsociacionQueDevuelve([
        FILA_ASPAL,
        { ...FILA_ASPAL, nombre: "Otra" },
      ]),
    }).inject({
      method: "GET",
      url: "/asociaciones/actual",
      headers: { host: "aspal.localhost" },
    });
    expect(respuesta.statusCode).toBe(500);
    expect(respuesta.body).not.toContain("Otra");
  });
});

describe("/health no depende del subdominio", () => {
  it("no resuelve ninguna asociación", async () => {
    const resolverAsociacion = vi.fn(async () => ASPAL);
    const respuesta = await construir({ resolverAsociacion }).inject({
      method: "GET",
      url: "/health",
      headers: { host: "aspal.localhost" },
    });
    expect(respuesta.statusCode).toBe(200);
    expect(resolverAsociacion).not.toHaveBeenCalled();
  });
});
