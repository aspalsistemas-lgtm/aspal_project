/**
 * Límites de uso (plan del corte 3, CA-10) contra PostgreSQL real: la reserva del
 * intento es atómica, no se esquiva con peticiones paralelas y cada asociación tiene
 * sus propios contadores.
 */
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { conAsociacion, crearPool } from "../base-de-datos.js";
import {
  borrarAsociacionesDePrueba,
  crearAsociacionDePrueba,
} from "../pruebas/datos-acceso.js";
import { urlsDePrueba } from "../pruebas/preparar-integracion.js";
import {
  POLITICA_CUENTA_ORIGEN,
  POLITICA_ORIGEN,
  limpiarLimites,
  liberarIntento,
  reiniciarLimite,
  reservarIntento,
  type PoliticaLimite,
} from "./limites.js";

const urls = urlsDePrueba();
let admin: pg.Pool;
let app: pg.Pool;
let A: string;
let B: string;

const POLITICA: PoliticaLimite = {
  limite: 5,
  ventanaSegundos: 900,
  esperasSegundos: [60, 300, 900, 3600],
};

const clave = () => randomBytes(32);

function reservar(asociacion: string, claveLimite: Buffer, politica = POLITICA) {
  return conAsociacion(app, asociacion, (base) =>
    reservarIntento(base, claveLimite, politica),
  );
}

async function fila(asociacion: string, claveLimite: Buffer) {
  const { rows } = await admin.query(
    "SELECT contador, bloqueado_hasta, ventana_desde FROM public.limite_uso WHERE asociacion_id = $1 AND clave = $2",
    [asociacion, claveLimite],
  );
  return rows[0] as
    { contador: number; bloqueado_hasta: Date | null; ventana_desde: Date } | undefined;
}

beforeAll(async () => {
  admin = crearPool(urls.admin);
  app = crearPool(urls.app, { max: 10 });
  A = await crearAsociacionDePrueba(admin, "limites-a");
  B = await crearAsociacionDePrueba(admin, "limites-b");
});

afterAll(async () => {
  await borrarAsociacionesDePrueba(admin, [A, B]);
  await Promise.all([admin.end(), app.end()]);
});

describe("políticas por defecto (§7)", () => {
  it("5 intentos por (correo, origen) y 20 por origen, en ventanas de 15 minutos", () => {
    expect(POLITICA_CUENTA_ORIGEN).toEqual({
      limite: 5,
      ventanaSegundos: 900,
      esperasSegundos: [60, 300, 900, 3600],
    });
    expect(POLITICA_ORIGEN).toEqual({
      limite: 20,
      ventanaSegundos: 900,
      esperasSegundos: [60, 300, 900, 3600],
    });
  });
});

describe("reservarIntento (CA-10)", () => {
  it("deja pasar hasta el límite y bloquea el siguiente, con el tiempo de espera", async () => {
    const k = clave();
    for (let i = 1; i <= 5; i++) {
      const r = await reservar(A, k);
      expect(r, `intento ${i}`).toMatchObject({ permitido: true, contador: i });
    }
    const sexto = await reservar(A, k);
    expect(sexto.permitido).toBe(false);
    expect(sexto.contador).toBe(6);
    expect(sexto.reintentarEnSegundos).toBeGreaterThan(55);
    expect(sexto.reintentarEnSegundos).toBeLessThanOrEqual(60);
  });

  it("mientras está bloqueado sigue rechazando y no alarga el bloqueo vigente", async () => {
    const k = clave();
    for (let i = 0; i < 6; i++) await reservar(A, k);
    const antes = (await fila(A, k))!.bloqueado_hasta!.getTime();
    const otro = await reservar(A, k);
    expect(otro.permitido).toBe(false);
    expect((await fila(A, k))!.bloqueado_hasta!.getTime()).toBe(antes);
  });

  it("la espera escala con cada exceso: 1 min, 5 min, 15 min y 1 h", async () => {
    const k = clave();
    for (let i = 0; i < 5; i++) await reservar(A, k);
    const esperas: number[] = [];
    for (let exceso = 1; exceso <= 5; exceso++) {
      const r = await reservar(A, k);
      expect(r.permitido).toBe(false);
      esperas.push(Math.round(r.reintentarEnSegundos / 60));
      // Se simula que la espera terminó, sin mover la ventana.
      await admin.query(
        "UPDATE public.limite_uso SET bloqueado_hasta = now() - interval '1 second' WHERE asociacion_id = $1 AND clave = $2",
        [A, k],
      );
    }
    expect(esperas).toEqual([1, 5, 15, 60, 60]);
  });

  it("al terminar la ventana (y sin bloqueo) el contador vuelve a empezar", async () => {
    const k = clave();
    for (let i = 0; i < 5; i++) await reservar(A, k);
    await admin.query(
      "UPDATE public.limite_uso SET ventana_desde = now() - interval '16 minutes' WHERE asociacion_id = $1 AND clave = $2",
      [A, k],
    );
    const r = await reservar(A, k);
    expect(r).toMatchObject({ permitido: true, contador: 1 });
  });

  it("un bloqueo vigente no se levanta aunque la ventana haya terminado", async () => {
    const k = clave();
    for (let i = 0; i < 6; i++) await reservar(A, k);
    await admin.query(
      "UPDATE public.limite_uso SET ventana_desde = now() - interval '1 hour' WHERE asociacion_id = $1 AND clave = $2",
      [A, k],
    );
    expect((await reservar(A, k)).permitido).toBe(false);
  });

  it("cada asociación tiene sus propios contadores: la misma clave en otra no se ve afectada", async () => {
    const k = clave();
    for (let i = 0; i < 6; i++) await reservar(A, k);
    expect((await reservar(A, k)).permitido).toBe(false);
    const enB = await reservar(B, k);
    expect(enB).toMatchObject({ permitido: true, contador: 1 });
    expect(await fila(A, k)).toBeDefined();
  });

  it("50 intentos SIMULTÁNEOS con la misma clave: exactamente 5 se permiten", async () => {
    const k = clave();
    const resultados = await Promise.all(
      Array.from({ length: 50 }, () => reservar(A, k)),
    );
    const permitidos = resultados.filter((r) => r.permitido).length;
    expect(permitidos).toBe(5);
    expect(resultados.filter((r) => !r.permitido)).toHaveLength(45);
    // El sexto fija el bloqueo; los demás lo encuentran y ya no cuentan (M2).
    expect((await fila(A, k))!.contador).toBe(6);
  });

  it("los reintentos durante un bloqueo no cuentan ni alargan la espera (M2)", async () => {
    const k = clave();
    for (let i = 0; i < 5; i++) await reservar(A, k);
    const primero = await reservar(A, k);
    expect(primero).toMatchObject({ permitido: false, reintentarEnSegundos: 60 });
    for (let i = 0; i < 10; i++) {
      const r = await reservar(A, k);
      expect(r.permitido).toBe(false);
      expect(r.reintentarEnSegundos).toBeLessThanOrEqual(60);
    }
    expect((await fila(A, k))!.contador).toBe(6);
  });

  it("liberarIntento descuenta uno y nunca baja de cero (M2)", async () => {
    const k = clave();
    await reservar(A, k);
    await reservar(A, k);
    await conAsociacion(app, A, (base) => liberarIntento(base, k));
    expect((await fila(A, k))!.contador).toBe(1);
    await conAsociacion(app, A, (base) => liberarIntento(base, k));
    await conAsociacion(app, A, (base) => liberarIntento(base, k));
    expect((await fila(A, k))!.contador).toBe(0);
  });

  it("si la reserva va dentro de una transacción que falla, se pierde: por eso el login reserva en la suya", async () => {
    const k = clave();
    await expect(
      conAsociacion(app, A, async (base) => {
        await reservarIntento(base, k, POLITICA);
        throw new Error("falla posterior");
      }),
    ).rejects.toThrow("falla posterior");
    // Documenta el riesgo, no una virtud: mezclada con lo demás, un fallo provocado a
    // propósito borraría el intento y daría intentos gratis. El login la hace en una
    // transacción corta y propia, que se confirma antes de verificar nada.
    expect(await fila(A, k)).toBeUndefined();
    const enSuTransaccion = await reservar(A, k);
    expect(enSuTransaccion.contador).toBe(1);
    expect((await fila(A, k))!.contador).toBe(1);
  });
});

describe("reiniciarLimite", () => {
  it("borra solo la clave dada", async () => {
    const k1 = clave();
    const k2 = clave();
    await reservar(A, k1);
    await reservar(A, k2);
    await conAsociacion(app, A, (base) => reiniciarLimite(base, k1));
    expect(await fila(A, k1)).toBeUndefined();
    expect(await fila(A, k2)).toBeDefined();
  });

  it("no toca la misma clave de otra asociación", async () => {
    const k = clave();
    await reservar(A, k);
    await reservar(B, k);
    await conAsociacion(app, A, (base) => reiniciarLimite(base, k));
    expect(await fila(A, k)).toBeUndefined();
    expect(await fila(B, k)).toBeDefined();
  });
});

describe("limpiarLimites: en lotes y con tope (CA-10)", () => {
  async function filasDe(asociacion: string): Promise<number> {
    const { rows } = await admin.query(
      "SELECT count(*)::int AS n FROM public.limite_uso WHERE asociacion_id = $1",
      [asociacion],
    );
    return rows[0].n;
  }

  async function sembrarViejas(asociacion: string, cantidad: number) {
    await admin.query(
      `INSERT INTO public.limite_uso (asociacion_id, clave, contador, ventana_desde)
       SELECT $1, uuid_send(gen_random_uuid()), 1, now() - interval '3 days' FROM generate_series(1, $2)`,
      [asociacion, cantidad],
    );
  }

  it("borra las vencidas por lotes: cada llamada, como mucho un lote", async () => {
    await admin.query("DELETE FROM public.limite_uso WHERE asociacion_id = $1", [B]);
    await sembrarViejas(B, 25);
    const vigente = clave();
    await reservar(B, vigente);
    const lote = 10;
    const borradas: number[] = [];
    for (let i = 0; i < 4; i++) {
      borradas.push(
        await conAsociacion(app, B, (base) =>
          limpiarLimites(base, { lote, tope: 10_000 }),
        ),
      );
    }
    expect(borradas).toEqual([10, 10, 5, 0]);
    // La vigente sigue ahí.
    expect(await fila(B, vigente)).toBeDefined();
    expect(await filasDe(B)).toBe(1);
  });

  it("no borra lo que está bloqueado, aunque su ventana sea antigua", async () => {
    const k = clave();
    for (let i = 0; i < 6; i++) await reservar(B, k);
    await admin.query(
      "UPDATE public.limite_uso SET ventana_desde = now() - interval '3 days' WHERE asociacion_id = $1 AND clave = $2",
      [B, k],
    );
    await conAsociacion(app, B, (base) =>
      limpiarLimites(base, { lote: 100, tope: 10_000 }),
    );
    expect(await fila(B, k)).toBeDefined();
  });

  it("aplica un tope por asociación: descarta las más antiguas por encima de él", async () => {
    await admin.query("DELETE FROM public.limite_uso WHERE asociacion_id = $1", [B]);
    // 30 filas recientes (ninguna vencida): solo el tope las puede quitar.
    await admin.query(
      `INSERT INTO public.limite_uso (asociacion_id, clave, contador, ventana_desde)
       SELECT $1, uuid_send(gen_random_uuid()), 1, now() - (g || ' seconds')::interval
         FROM generate_series(1, 30) AS g`,
      [B],
    );
    const borradas = await conAsociacion(app, B, (base) =>
      limpiarLimites(base, { lote: 100, tope: 20 }),
    );
    expect(borradas).toBe(10);
    expect(await filasDe(B)).toBe(20);
  });

  it("solo actúa sobre la asociación del contexto", async () => {
    await admin.query("DELETE FROM public.limite_uso WHERE asociacion_id = ANY ($1)", [
      [A, B],
    ]);
    await sembrarViejas(A, 5);
    await sembrarViejas(B, 5);
    await conAsociacion(app, A, (base) =>
      limpiarLimites(base, { lote: 100, tope: 10_000 }),
    );
    expect(await filasDe(A)).toBe(0);
    expect(await filasDe(B)).toBe(5);
  });
});
