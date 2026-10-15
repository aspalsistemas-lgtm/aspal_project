/**
 * Presupuestos de envío y limpieza del correo contra PostgreSQL real (plan del corte 3,
 * CA-24): cupos separados por tipo, atómicos y aislados por asociación.
 */
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { conAsociacion, crearPool } from "../base-de-datos.js";
import {
  borrarAsociacionesDePrueba,
  crearAsociacionDePrueba,
  crearDatosDeAcceso,
  type DatosDeAcceso,
} from "../pruebas/datos-acceso.js";
import { urlsDePrueba } from "../pruebas/preparar-integracion.js";
import { limpiarCorreo } from "./limpieza.js";
import {
  PRESUPUESTO_INVITACIONES,
  PRESUPUESTOS,
  reservarEnvio,
  reservarInvitacion,
  type TipoEnvio,
} from "./presupuestos.js";

const urls = urlsDePrueba();
const SECRETO = "secreto-de-prueba-con-mas-de-32-caracteres";
let admin: pg.Pool;
let app: pg.Pool;
let A: string;
let B: string;
let datosA: DatosDeAcceso;
let n = 0;

const origenNuevo = () => `10.20.${Math.floor(n / 250)}.${n++ % 250}`;
const correoNuevo = () => `dest${n++}@ejemplo.org`;

function envio(
  asociacion: string,
  tipo: TipoEnvio,
  destinatario: string,
  origen: string,
  presupuesto = PRESUPUESTOS[tipo],
) {
  return conAsociacion(app, asociacion, (base) =>
    reservarEnvio(base, SECRETO, { tipo, destinatario, origen }, presupuesto),
  );
}

const filasDeLimite = async (asociacion: string) =>
  (
    await admin.query(
      "SELECT count(*)::int AS n FROM public.limite_uso WHERE asociacion_id = $1",
      [asociacion],
    )
  ).rows[0].n as number;

beforeAll(async () => {
  admin = crearPool(urls.admin);
  app = crearPool(urls.app, { max: 8 });
  A = await crearAsociacionDePrueba(admin, "presup-a");
  B = await crearAsociacionDePrueba(admin, "presup-b");
  datosA = await crearDatosDeAcceso(admin, A, "ana@ejemplo.org");
});

afterAll(async () => {
  await borrarAsociacionesDePrueba(admin, [A, B]);
  await Promise.all([admin.end(), app.end()]);
});

describe("reservarEnvio (CA-24)", () => {
  it("un destinatario recibe 1 correo de registro por hora; otro destinatario sí", async () => {
    const origen = origenNuevo();
    const destino = correoNuevo();
    expect(await envio(A, "registro", destino, origen)).toBe(true);
    expect(await envio(A, "registro", destino, origen)).toBe(false);
    expect(await envio(A, "registro", correoNuevo(), origen)).toBe(true);
  });

  it("el destinatario cuenta igual con alias de Gmail y +etiqueta", async () => {
    const origen = origenNuevo();
    expect(await envio(A, "registro", "ana.lopez@gmail.com", origen)).toBe(true);
    expect(await envio(A, "registro", "analopez+x@gmail.com", origen)).toBe(false);
    expect(await envio(A, "registro", "ANA.LOPEZ@gmail.com", origen)).toBe(false);
  });

  it("un origen puede pedir 10 por hora; el undécimo, aunque sea otro correo, no", async () => {
    const origen = origenNuevo();
    for (let i = 0; i < 10; i++) {
      expect(await envio(A, "registro", correoNuevo(), origen), `envío ${i + 1}`).toBe(
        true,
      );
    }
    expect(await envio(A, "registro", correoNuevo(), origen)).toBe(false);
    // Otro origen no se ve afectado.
    expect(await envio(A, "registro", correoNuevo(), origenNuevo())).toBe(true);
  });

  it("el tope diario de la asociación frena a todos los orígenes", async () => {
    const pequeno = {
      ...PRESUPUESTOS.registro,
      dia: { ...PRESUPUESTOS.registro.dia, limite: 3 },
    };
    // Asociación propia para que el contador diario no se mezcle con otros tests.
    const D = await crearAsociacionDePrueba(admin, "presup-dia");
    try {
      const resultados = [];
      for (let i = 0; i < 5; i++) {
        resultados.push(
          await envio(D, "registro", correoNuevo(), origenNuevo(), pequeno),
        );
      }
      expect(resultados).toEqual([true, true, true, false, false]);
    } finally {
      await borrarAsociacionesDePrueba(admin, [D]);
    }
  });

  it("los presupuestos son independientes por tipo: agotar registro no afecta a recuperación", async () => {
    const origen = origenNuevo();
    const destino = correoNuevo();
    expect(await envio(A, "registro", destino, origen)).toBe(true);
    expect(await envio(A, "registro", destino, origen)).toBe(false);
    expect(await envio(A, "recuperacion", destino, origen)).toBe(true);
    expect(await envio(A, "aviso", destino, origen)).toBe(true);
  });

  it("recuperación admite 3 por hora al mismo destinatario", async () => {
    const origen = origenNuevo();
    const destino = correoNuevo();
    const resultados = [];
    for (let i = 0; i < 5; i++)
      resultados.push(await envio(A, "recuperacion", destino, origen));
    expect(resultados).toEqual([true, true, true, false, false]);
  });

  it("agotar el cupo en una asociación no afecta a la otra", async () => {
    const origen = origenNuevo();
    const destino = correoNuevo();
    expect(await envio(A, "registro", destino, origen)).toBe(true);
    expect(await envio(A, "registro", destino, origen)).toBe(false);
    expect(await envio(B, "registro", destino, origen)).toBe(true);
  });

  it("50 solicitudes simultáneas al mismo destinatario permiten exactamente 1 envío", async () => {
    const destino = correoNuevo();
    const resultados = await Promise.all(
      Array.from({ length: 50 }, () => envio(A, "registro", destino, origenNuevo())),
    );
    expect(resultados.filter(Boolean)).toHaveLength(1);
  });

  it("un origen bloqueado no crea filas nuevas por cada correo", async () => {
    const origen = origenNuevo();
    for (let i = 0; i < 11; i++) await envio(A, "registro", correoNuevo(), origen);
    const antes = await filasDeLimite(A);
    for (let i = 0; i < 20; i++) {
      expect(await envio(A, "registro", correoNuevo(), origen)).toBe(false);
    }
    expect(await filasDeLimite(A)).toBe(antes);
  });
});

describe("reservarInvitacion (CA-26)", () => {
  const invitar = (
    asociacion: string,
    persona: string,
    presupuesto = PRESUPUESTO_INVITACIONES,
  ) =>
    conAsociacion(app, asociacion, (base) =>
      reservarInvitacion(base, SECRETO, persona, presupuesto),
    );

  it("20 invitaciones al día por administrador; la 21 espera", async () => {
    const persona = datosA.personaId;
    for (let i = 0; i < 20; i++) {
      expect((await invitar(A, persona)).permitido, `invitación ${i + 1}`).toBe(true);
    }
    const veintiuna = await invitar(A, persona);
    expect(veintiuna.permitido).toBe(false);
    expect(veintiuna.reintentarEnSegundos).toBeGreaterThan(0);
    // Otro administrador (otro id) no se ve afectado.
    expect((await invitar(A, "00000000-0000-4000-8000-000000000001")).permitido).toBe(
      true,
    );
  });
});

describe("limpiarCorreo", () => {
  const hash = () => randomBytes(32);

  it("borra lo caducado o usado hace tiempo y conserva lo vigente", async () => {
    const C = await crearAsociacionDePrueba(admin, "presup-limpieza");
    const datos = await crearDatosDeAcceso(admin, C, "lim@ejemplo.org");
    try {
      const insertarRegistro = (correo: string, expira: string, usado: string | null) =>
        admin.query(
          `INSERT INTO public.registro_pendiente (asociacion_id, correo, token_hash, creado_en, expira_en, usado_en)
           VALUES ($1, $2, $3, now() - interval '10 days', ${expira}, ${usado ?? "NULL"})`,
          [C, correo, hash()],
        );
      await insertarRegistro("vigente@ejemplo.org", "now() + interval '1 day'", null);
      await insertarRegistro("caducado@ejemplo.org", "now() - interval '2 days'", null);
      await insertarRegistro(
        "usado@ejemplo.org",
        "now() + interval '1 day'",
        "now() - interval '2 days'",
      );
      await admin.query(
        `INSERT INTO public.token_correo (asociacion_id, cuenta_id, tipo, token_hash, creado_en, expira_en)
         VALUES ($1, $2, 'recuperar_contrasena', $3, now() - interval '3 days', now() - interval '2 days'),
                ($1, $2, 'recuperar_contrasena', $4, now(), now() + interval '1 hour')`,
        [C, datos.cuentaId, hash(), hash()],
      );
      await admin.query(
        `INSERT INTO public.invitacion (asociacion_id, correo, rol, token_hash, invitada_por, creado_en, expira_en, revocada_en)
         VALUES ($1, 'vieja@ejemplo.org', 'miembro', $2, $4, now() - interval '30 days', now() - interval '23 days', NULL),
                ($1, 'vigente@ejemplo.org', 'miembro', $3, $4, now(), now() + interval '7 days', NULL)`,
        [C, hash(), hash(), datos.personaId],
      );

      const borradas = await conAsociacion(app, C, (base) => limpiarCorreo(base, 100));
      expect(borradas).toBe(4);
      const restantes = async (tabla: string) =>
        (
          await admin.query(
            `SELECT count(*)::int AS n FROM public.${tabla} WHERE asociacion_id = $1`,
            [C],
          )
        ).rows[0].n;
      expect(await restantes("registro_pendiente")).toBe(1);
      expect(await restantes("token_correo")).toBe(1);
      expect(await restantes("invitacion")).toBe(1);
    } finally {
      await borrarAsociacionesDePrueba(admin, [C]);
    }
  });

  it("respeta el tamaño del lote por tabla", async () => {
    const C = await crearAsociacionDePrueba(admin, "presup-lote");
    try {
      for (let i = 0; i < 7; i++) {
        await admin.query(
          `INSERT INTO public.registro_pendiente (asociacion_id, correo, token_hash, creado_en, expira_en)
           VALUES ($1, $2, $3, now() - interval '10 days', now() - interval '5 days')`,
          [C, `lote${i}@ejemplo.org`, hash()],
        );
      }
      expect(await conAsociacion(app, C, (base) => limpiarCorreo(base, 3))).toBe(3);
      expect(await conAsociacion(app, C, (base) => limpiarCorreo(base, 3))).toBe(3);
      expect(await conAsociacion(app, C, (base) => limpiarCorreo(base, 3))).toBe(1);
    } finally {
      await borrarAsociacionesDePrueba(admin, [C]);
    }
  });

  it("no toca las filas de otra asociación", async () => {
    const C = await crearAsociacionDePrueba(admin, "presup-aislada");
    try {
      await admin.query(
        `INSERT INTO public.registro_pendiente (asociacion_id, correo, token_hash, creado_en, expira_en)
         VALUES ($1, 'ajeno@ejemplo.org', $2, now() - interval '10 days', now() - interval '5 days')`,
        [A, hash()],
      );
      expect(await conAsociacion(app, C, (base) => limpiarCorreo(base, 100))).toBe(0);
      const { rows } = await admin.query(
        "SELECT count(*)::int AS n FROM public.registro_pendiente WHERE asociacion_id = $1 AND correo = 'ajeno@ejemplo.org'",
        [A],
      );
      expect(rows[0].n).toBe(1);
    } finally {
      await borrarAsociacionesDePrueba(admin, [C]);
    }
  });
});
