/**
 * El camino completo contra PostgreSQL real: Host → resolver_asociacion →
 * conAsociacion → lectura filtrada por RLS (plan del corte 2, CA-6 y CA-7).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import { construirApp } from "./app.js";
import {
  comprobarBaseDeDatos,
  conAsociacion,
  crearPool,
  resolverAsociacion,
} from "./base-de-datos.js";
import { urlsDePrueba } from "./pruebas/preparar-integracion.js";
import { sembrar } from "./sembrar.js";

const urls = urlsDePrueba();
let pool: pg.Pool;
let app: FastifyInstance;

beforeAll(async () => {
  const cliente = new pg.Client({ connectionString: urls.admin });
  await cliente.connect();
  await sembrar(cliente);
  await cliente.end();
  // Pool pequeño a propósito: fuerza a reutilizar conexiones entre peticiones.
  pool = crearPool(urls.app, { max: 2 });
  app = construirApp({
    comprobarBaseDeDatos: () => comprobarBaseDeDatos(pool),
    dominioBase: "localhost",
    resolverAsociacion: (subdominio) => resolverAsociacion(pool, subdominio),
    enAsociacion: (id, fn) => conAsociacion(pool, id, fn),
  });
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

function pedir(host: string) {
  return app.inject({ method: "GET", url: "/asociaciones/actual", headers: { host } });
}

describe("GET /asociaciones/actual con la base real (CA-7)", () => {
  it("aspal.localhost responde ASPAL", async () => {
    const respuesta = await pedir("aspal.localhost:5010");
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data).toEqual({
      nombre: "ASPAL",
      subdominio: "aspal",
      zonaHoraria: "America/Merida",
    });
  });

  it("prueba.localhost responde la organización de prueba", async () => {
    const respuesta = await pedir("prueba.localhost");
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data.subdominio).toBe("prueba");
  });

  it.each(["localhost", "nada.localhost", "www.localhost", "aspal.evillocalhost"])(
    "%s responde 404",
    async (host) => {
      expect((await pedir(host)).statusCode).toBe(404);
    },
  );
});

describe("concurrencia (CA-3)", () => {
  it("200 peticiones intercaladas aspal/prueba: cada una recibe solo la suya", async () => {
    const respuestas = await Promise.all(
      Array.from({ length: 200 }, (_, i) => {
        const subdominio = i % 2 === 0 ? "aspal" : "prueba";
        return pedir(`${subdominio}.localhost`).then((respuesta) => ({
          subdominio,
          estado: respuesta.statusCode,
          recibido: respuesta.json().data?.subdominio,
        }));
      }),
    );
    expect(
      respuestas.filter((r) => r.estado !== 200 || r.recibido !== r.subdominio),
    ).toEqual([]);
  });
});
