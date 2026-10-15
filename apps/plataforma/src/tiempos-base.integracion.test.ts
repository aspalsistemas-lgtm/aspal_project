/**
 * Tiempos máximos de la base de datos (plan del corte 3, CA-18).
 *
 * Sin ellos, un `pg_advisory_xact_lock` o un `FOR UPDATE` colgado retiene una
 * conexión del pool y bloquea todos los cambios de roles de una asociación (el
 * cliente vigilado de `conAsociacion` no deja fijarlos dentro de la transacción,
 * así que tienen que venir ya puestos al abrir la conexión).
 */
import { afterAll, describe, expect, it } from "vitest";
import pg from "pg";
import {
  TIEMPOS_POR_DEFECTO,
  crearPool,
  verificarRolDeAplicacion,
} from "./base-de-datos.js";
import { urlsDePrueba } from "./pruebas/preparar-integracion.js";

const urls = urlsDePrueba();
const pools: pg.Pool[] = [];

function pool(url: string, opciones?: Parameters<typeof crearPool>[1]): pg.Pool {
  const nuevo = crearPool(url, opciones);
  nuevo.on("error", () => undefined);
  pools.push(nuevo);
  return nuevo;
}

afterAll(async () => {
  await Promise.all(pools.map((p) => p.end().catch(() => undefined)));
});

/** SQLSTATE con que falla una promesa (o «ok»). */
async function codigo(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
    return "ok";
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
}

describe("crearPool fija los tres tiempos al abrir la conexión (CA-18)", () => {
  it("con los valores por defecto del plan: 5 s, 3 s y 10 s", async () => {
    expect(TIEMPOS_POR_DEFECTO).toEqual({
      sentenciaMs: 5000,
      bloqueoMs: 3000,
      ociosaEnTransaccionMs: 10_000,
    });
    const { rows } = await pool(urls.app).query(`
      SELECT current_setting('statement_timeout') AS sentencia,
             current_setting('lock_timeout') AS bloqueo,
             current_setting('idle_in_transaction_session_timeout') AS ociosa`);
    expect(rows[0]).toEqual({ sentencia: "5s", bloqueo: "3s", ociosa: "10s" });
  });

  it("también en las transacciones de conAsociacion, que no pueden fijarlos ellas mismas", async () => {
    const cliente = await pool(urls.app).connect();
    try {
      await cliente.query("BEGIN");
      const { rows } = await cliente.query(
        "SELECT current_setting('lock_timeout') AS bloqueo",
      );
      expect(rows[0].bloqueo).toBe("3s");
      await cliente.query("ROLLBACK");
    } finally {
      cliente.release();
    }
  });
});

describe("los tiempos cortan de verdad lo que se cuelga (CA-18)", () => {
  it("una sentencia que tarda más que statement_timeout se cancela (57014)", async () => {
    const lento = pool(urls.app, { tiempos: { sentenciaMs: 300 } });
    const inicio = Date.now();
    expect(await codigo(lento.query("SELECT pg_sleep(3)"))).toBe("57014");
    expect(Date.now() - inicio).toBeLessThan(2000);
  });

  it("un bloqueo que no se concede falla rápido (55P03) y no retiene la conexión", async () => {
    // Una transacción retiene el bloqueo consultivo; la otra no puede esperar para siempre.
    const dueno = await pool(urls.app).connect();
    await dueno.query("BEGIN");
    await dueno.query("SELECT pg_advisory_xact_lock(424242)");
    const espera = pool(urls.app, { tiempos: { bloqueoMs: 300 } });
    const cliente = await espera.connect();
    try {
      await cliente.query("BEGIN");
      const inicio = Date.now();
      expect(await codigo(cliente.query("SELECT pg_advisory_xact_lock(424242)"))).toBe(
        "55P03",
      );
      expect(Date.now() - inicio).toBeLessThan(2000);
    } finally {
      await cliente.query("ROLLBACK").catch(() => undefined);
      cliente.release();
      await dueno.query("ROLLBACK");
      dueno.release();
    }
  });

  it("una transacción abandonada sin cerrar se termina sola (idle in transaction)", async () => {
    const corto = pool(urls.app, { tiempos: { ociosaEnTransaccionMs: 300 } });
    const cliente = await corto.connect();
    cliente.on("error", () => undefined);
    await cliente.query("BEGIN");
    await cliente.query("SELECT 1");
    await new Promise((resolver) => setTimeout(resolver, 1200));
    // PostgreSQL ya cerró la sesión: la siguiente consulta no puede continuar.
    expect(await codigo(cliente.query("SELECT 1"))).not.toBe("ok");
    cliente.release(true);
  });
});

describe("verificarRolDeAplicacion comprueba los tiempos al arrancar (CA-18)", () => {
  it("acepta el pool de crearPool", async () => {
    await expect(verificarRolDeAplicacion(pool(urls.app))).resolves.toBeUndefined();
  });

  it.each([
    ["statement_timeout", "statement_timeout"],
    ["lock_timeout", "lock_timeout"],
    ["idle_in_transaction_session_timeout", "idle_in_transaction_session_timeout"],
  ])("rechaza un pool sin %s", async (_nombre, parametro) => {
    // Un pool creado a mano, sin pasar por crearPool, con solo dos de los tres.
    const todos = {
      statement_timeout: 5000,
      lock_timeout: 3000,
      idle_in_transaction_session_timeout: 10_000,
    };
    const { [parametro as keyof typeof todos]: _quitado, ...faltando } = todos;
    const incompleto = new pg.Pool({ connectionString: urls.app, ...faltando });
    incompleto.on("error", () => undefined);
    pools.push(incompleto);
    await expect(verificarRolDeAplicacion(incompleto)).rejects.toThrow(
      new RegExp(parametro),
    );
  });
});
