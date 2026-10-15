/**
 * RevertirTransaccion (plan del corte 3, auditoría del 3a): un error de negocio
 * esperado (403, 404, 409…) revierte la transacción pero devuelve la conexión
 * limpia al pool. Si cada uno la destruyera, quien provocara 404 sin parar haría
 * rotar las conexiones y agotaría al servidor.
 */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { sql } from "drizzle-orm";
import { RevertirTransaccion, conAsociacion, crearPool } from "./base-de-datos.js";
import { urlsDePrueba } from "./pruebas/preparar-integracion.js";

const urls = urlsDePrueba();
const pools: pg.Pool[] = [];
const ASOCIACION = randomUUID();

function unaSola(): pg.Pool {
  const pool = crearPool(urls.app, { max: 1 });
  pool.on("error", () => undefined);
  pools.push(pool);
  return pool;
}

async function pid(pool: pg.Pool): Promise<number> {
  return (await pool.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
}

afterAll(async () => {
  await Promise.all(pools.map((pool) => pool.end().catch(() => undefined)));
});

class NoEncontrada extends RevertirTransaccion {}

describe("RevertirTransaccion", () => {
  it("revierte lo escrito y relanza el error, pero REUTILIZA la conexión", async () => {
    const pool = unaSola();
    const antes = await pid(pool);
    await expect(
      conAsociacion(pool, ASOCIACION, async (base) => {
        await base.execute(sql`SELECT 1`);
        throw new NoEncontrada("no existe");
      }),
    ).rejects.toBeInstanceOf(NoEncontrada);
    expect(await pid(pool)).toBe(antes);
  });

  it("la conexión reutilizada llega limpia: sin transacción abierta ni contexto", async () => {
    const pool = unaSola();
    await expect(
      conAsociacion(pool, ASOCIACION, async () => {
        throw new RevertirTransaccion("denegado");
      }),
    ).rejects.toThrow("denegado");
    const { rows } = await pool.query(`
      SELECT xact_start = query_start AS sin_transaccion,
             current_setting('app.asociacion_id', true) AS contexto
        FROM pg_stat_activity WHERE pid = pg_backend_pid()`);
    expect(rows[0]).toEqual({ sin_transaccion: true, contexto: "" });
  });

  it("un error desconocido SIGUE destruyendo la conexión (red de seguridad)", async () => {
    const pool = unaSola();
    const antes = await pid(pool);
    await expect(
      conAsociacion(pool, ASOCIACION, async () => {
        throw new Error("algo que nadie esperaba");
      }),
    ).rejects.toThrow("algo que nadie esperaba");
    expect(await pid(pool)).not.toBe(antes);
  });

  it("un error de base de datos también destruye la conexión", async () => {
    const pool = unaSola();
    const antes = await pid(pool);
    await expect(
      conAsociacion(pool, ASOCIACION, async (base) => {
        await base.execute(sql`SELECT * FROM tabla_que_no_existe`);
      }),
    ).rejects.toBeDefined();
    expect(await pid(pool)).not.toBe(antes);
  });

  it("una consulta tardía tras un error de negocio sigue rechazada (el cliente vigilado)", async () => {
    const pool = unaSola();
    let tardia: Promise<unknown> | undefined;
    await expect(
      conAsociacion(pool, ASOCIACION, async (base) => {
        tardia = (async () => {
          await new Promise((resolver) => setTimeout(resolver, 50));
          return base.execute(sql`SELECT 1`);
        })();
        throw new RevertirTransaccion("denegado");
      }),
    ).rejects.toThrow("denegado");
    const motivo = await Promise.resolve(tardia).then(
      () => "no falló",
      (error: Error) =>
        `${error.message} | ${(error as { cause?: Error }).cause?.message ?? ""}`,
    );
    expect(motivo).toMatch(/cerrada/);
  });
});
