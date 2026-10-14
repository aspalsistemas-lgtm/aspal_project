/**
 * Tests contra un PostgreSQL real (`npm run test:integracion`). Necesitan
 * DATABASE_URL_PRUEBA apuntando a una base desechable: en local, la del
 * contenedor (`npm run db:levantar`); en la CI, el servicio de postgres. Sin
 * ella fallan a propósito en vez de saltarse: un test que no corre no prueba
 * nada.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { comprobarBaseDeDatos, crearPool } from "./base-de-datos.js";
import { aplicarMigraciones } from "./migrar.js";

const url = process.env.DATABASE_URL_PRUEBA;
if (!url) {
  throw new Error("Falta DATABASE_URL_PRUEBA: levanta la base con npm run db:levantar");
}

let pool: pg.Pool;

beforeAll(async () => {
  pool = crearPool(url);
  // Base vacía: se borra lo que dejara una pasada anterior.
  await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
});

afterAll(async () => {
  await pool.end();
});

describe("comprobarBaseDeDatos (CA-2)", () => {
  it("devuelve true con la base levantada", async () => {
    expect(await comprobarBaseDeDatos(pool)).toBe(true);
  });

  it("devuelve false, sin lanzar, si la base no existe en ese puerto", async () => {
    const caida = crearPool("postgres://aspal:aspal@127.0.0.1:1/aspal");
    const inicio = Date.now();
    expect(await comprobarBaseDeDatos(caida)).toBe(false);
    expect(Date.now() - inicio).toBeLessThan(3000);
    await caida.end();
  });
});

describe("caída de la base (CA-2)", () => {
  it("sobrevive a que PostgreSQL cierre sus conexiones y se recupera", async () => {
    // Pasaba al detener la base: el pool emitía «error» por la conexión
    // inactiva, nadie lo escuchaba y Node mataba el proceso en vez de responder 503.
    const victima = crearPool(url!);
    expect(await comprobarBaseDeDatos(victima)).toBe(true);
    const errorDelPool = new Promise((resolver) => victima.once("error", resolver));
    await pool.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND datname = current_database() AND application_name = ''",
    );
    await errorDelPool;
    expect(await comprobarBaseDeDatos(victima)).toBe(true);
    await victima.end();
  });
});

describe("aplicarMigraciones (CA-3)", () => {
  it("aplica las migraciones sobre una base vacía y las registra", async () => {
    await aplicarMigraciones(pool);
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
    );
    expect(rows[0].n).toBeGreaterThanOrEqual(1);
  });

  it("es idempotente: aplicarlas otra vez no cambia nada", async () => {
    const antes = await pool.query(
      "SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
    );
    await aplicarMigraciones(pool);
    const despues = await pool.query(
      "SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
    );
    expect(despues.rows[0].n).toBe(antes.rows[0].n);
  });
});
