/**
 * Tests contra un PostgreSQL real (`npm run test:integracion`). La base de
 * pruebas la recrea `pruebas/preparar-integracion.ts`; sin las variables de
 * entorno fallan a propósito en vez de saltarse.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { comprobarBaseDeDatos, crearPool } from "./base-de-datos.js";
import { aplicarMigraciones } from "./migrar.js";
import { urlsDePrueba } from "./pruebas/preparar-integracion.js";

const urls = urlsDePrueba();
let admin: pg.Pool;

beforeAll(() => {
  admin = crearPool(urls.admin);
});

afterAll(async () => {
  await admin.end();
});

describe("comprobarBaseDeDatos (CA-2 del corte 1)", () => {
  it("devuelve true con la base levantada, conectando como aspal_app", async () => {
    const app = crearPool(urls.app);
    expect(await comprobarBaseDeDatos(app)).toBe(true);
    await app.end();
  });

  it("devuelve false, sin lanzar, si la base no existe en ese puerto", async () => {
    const caida = crearPool("postgres://aspal:aspal@127.0.0.1:1/aspal");
    const inicio = Date.now();
    expect(await comprobarBaseDeDatos(caida)).toBe(false);
    expect(Date.now() - inicio).toBeLessThan(3000);
    await caida.end();
  });

  it("sobrevive a que PostgreSQL cierre sus conexiones y se recupera", async () => {
    // Pasaba al detener la base: el pool emitía «error» por la conexión
    // inactiva, nadie lo escuchaba y Node mataba el proceso en vez de responder 503.
    const victima = crearPool(urls.app);
    expect(await comprobarBaseDeDatos(victima)).toBe(true);
    const errorDelPool = new Promise((resolver) => victima.once("error", resolver));
    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'aspal_app' AND datname = current_database()",
    );
    await errorDelPool;
    expect(await comprobarBaseDeDatos(victima)).toBe(true);
    await victima.end();
  });
});

describe("aplicarMigraciones (CA-3 del corte 1)", () => {
  it("las registra y es idempotente: aplicarlas otra vez no cambia nada", async () => {
    const contar = async () =>
      (await admin.query("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations"))
        .rows[0].n as number;
    const antes = await contar();
    expect(antes).toBeGreaterThanOrEqual(1);
    const cliente = new pg.Client({ connectionString: urls.admin });
    await cliente.connect();
    await aplicarMigraciones(cliente);
    await cliente.end();
    expect(await contar()).toBe(antes);
  });
});
