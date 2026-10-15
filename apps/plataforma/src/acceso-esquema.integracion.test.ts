/**
 * Restricciones de las tablas de acceso (plan del corte 3, CA-1 y CA-2): lo que
 * PostgreSQL garantiza aunque el código falle. Todo se inserta como el
 * administrador con `asociacion_id` explícito.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { crearPool } from "./base-de-datos.js";
import {
  borrarAsociacionesDePrueba,
  crearAsociacionDePrueba,
  crearDatosDeAcceso,
  type DatosDeAcceso,
} from "./pruebas/datos-acceso.js";
import { urlsDePrueba } from "./pruebas/preparar-integracion.js";

const urls = urlsDePrueba();
let admin: pg.Pool;
let A: string;
let B: string;
let datosA: DatosDeAcceso;
let datosB: DatosDeAcceso;

/** SQLSTATE con que falla una sentencia (o «ok»), siempre revertida. */
async function codigo(texto: string, valores: unknown[] = []): Promise<string> {
  const cliente = await admin.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query(texto, valores);
    return "ok";
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  } finally {
    await cliente.query("ROLLBACK");
    cliente.release();
  }
}

beforeAll(async () => {
  admin = crearPool(urls.admin);
  A = await crearAsociacionDePrueba(admin, "acceso-a");
  B = await crearAsociacionDePrueba(admin, "acceso-b");
  datosA = await crearDatosDeAcceso(admin, A, "ana@ejemplo.org");
  datosB = await crearDatosDeAcceso(admin, B, "beto@ejemplo.org");
});

afterAll(async () => {
  await borrarAsociacionesDePrueba(admin, [A, B]);
  await admin.end();
});

const NUEVA_PERSONA =
  "INSERT INTO public.persona (asociacion_id, nombre, estado) VALUES ($1, $2, $3)";

describe("persona (CA-1)", () => {
  it("acepta una persona válida y empieza activa", async () => {
    expect(await codigo(NUEVA_PERSONA, [A, "Ana Pérez", "activa"])).toBe("ok");
    const { rows } = await admin.query(
      "SELECT estado FROM public.persona WHERE id = $1",
      [datosA.personaId],
    );
    expect(rows[0].estado).toBe("activa");
  });

  it.each(["activa", "suspendida", "baja"])("admite el estado %s", async (estado) => {
    expect(await codigo(NUEVA_PERSONA, [A, "Ana Pérez", estado])).toBe("ok");
  });

  it.each(["", "ACTIVA", "bloqueada", "eliminada"])(
    "rechaza el estado %j (23514)",
    async (estado) => {
      expect(await codigo(NUEVA_PERSONA, [A, "Ana Pérez", estado])).toBe("23514");
    },
  );

  it.each(["", "   ", "A"])("rechaza el nombre %j (23514)", async (nombre) => {
    expect(await codigo(NUEVA_PERSONA, [A, nombre, "activa"])).toBe("23514");
  });

  it("rechaza un nombre de más de 120 caracteres (23514)", async () => {
    expect(await codigo(NUEVA_PERSONA, [A, "a".repeat(121), "activa"])).toBe("23514");
  });

  it("no admite una asociación inexistente (23503)", async () => {
    expect(await codigo(NUEVA_PERSONA, [randomUUID(), "Ana Pérez", "activa"])).toBe(
      "23503",
    );
  });
});

describe("cuenta_acceso (CA-1)", () => {
  const NUEVA_CUENTA = `INSERT INTO public.cuenta_acceso
    (asociacion_id, persona_id, correo, correo_verificado_en) VALUES ($1, $2, $3, now())`;

  /** Una persona nueva de la asociación, para que cada caso tenga la suya. */
  async function personaNueva(asociacion: string): Promise<string> {
    const id = randomUUID();
    await admin.query(
      "INSERT INTO public.persona (id, asociacion_id, nombre) VALUES ($1, $2, 'Otra persona')",
      [id, asociacion],
    );
    return id;
  }

  it("el correo es único dentro de la asociación (23505)", async () => {
    const persona = await personaNueva(A);
    expect(await codigo(NUEVA_CUENTA, [A, persona, datosA.correo])).toBe("23505");
  });

  it("el MISMO correo en otra asociación es otra cuenta, y se admite (cuentas independientes)", async () => {
    const persona = await personaNueva(B);
    expect(await codigo(NUEVA_CUENTA, [B, persona, datosA.correo])).toBe("ok");
  });

  it.each([
    ["con mayúsculas", "Ana@Ejemplo.org"],
    ["sin arroba", "ana.ejemplo.org"],
    ["con dos arrobas", "a@b@ejemplo.org"],
    ["con espacio", "ana perez@ejemplo.org"],
    ["con salto de línea", "ana@ejemplo.org\n"],
    ["no ASCII", "ñandú@ejemplo.org"],
    ["de dos caracteres", "a@"],
    ["vacío", ""],
  ])("rechaza un correo %s (23514)", async (_nombre, correo) => {
    const persona = await personaNueva(A);
    expect(await codigo(NUEVA_CUENTA, [A, persona, correo])).toBe("23514");
  });

  it("rechaza un correo de más de 254 caracteres (23514)", async () => {
    const persona = await personaNueva(A);
    const largo = `${"a".repeat(250)}@b.co`;
    expect(await codigo(NUEVA_CUENTA, [A, persona, largo])).toBe("23514");
  });

  it("una persona tiene una sola cuenta (23505)", async () => {
    expect(await codigo(NUEVA_CUENTA, [A, datosA.personaId, "otro@ejemplo.org"])).toBe(
      "23505",
    );
  });

  it("no admite una persona de OTRA asociación: FK compuesta (23503)", async () => {
    // La persona de B existe, pero la cuenta dice ser de A: la base lo impide.
    const deB = await personaNueva(B);
    expect(await codigo(NUEVA_CUENTA, [A, deB, "intruso@ejemplo.org"])).toBe("23503");
  });

  it("el correo verificado es obligatorio: no existen cuentas sin verificar (23502)", async () => {
    const persona = await personaNueva(A);
    expect(
      await codigo(
        "INSERT INTO public.cuenta_acceso (asociacion_id, persona_id, correo) VALUES ($1, $2, $3)",
        [A, persona, "sin-verificar@ejemplo.org"],
      ),
    ).toBe("23502");
  });

  it("la versión de credencial empieza en 1 y la contraseña puede faltar (alta por Google o enlace)", async () => {
    const { rows } = await admin.query(
      "SELECT credencial_version, hash_contrasena FROM public.cuenta_acceso WHERE id = $1",
      [datosA.cuentaId],
    );
    expect(rows[0].credencial_version).toBe(1);
    const persona = await personaNueva(A);
    await admin.query(
      `INSERT INTO public.cuenta_acceso (id, asociacion_id, persona_id, correo, correo_verificado_en)
       VALUES ($1, $2, $3, 'sin-clave@ejemplo.org', now())`,
      [randomUUID(), A, persona],
    );
    const sinClave = await admin.query(
      "SELECT hash_contrasena FROM public.cuenta_acceso WHERE correo = 'sin-clave@ejemplo.org'",
    );
    expect(sinClave.rows[0].hash_contrasena).toBeNull();
  });
});

describe("asignacion_rol (CA-1 y CA-15)", () => {
  const NUEVO_ROL = `INSERT INTO public.asignacion_rol (asociacion_id, persona_id, rol, asignado_por)
    VALUES ($1, $2, $3, $4)`;

  it("solo admite los cuatro roles (23514)", async () => {
    for (const rol of ["administrador", "gestor", "representante", "miembro"]) {
      // El administrador ya está asignado: se prueba con la persona de B más abajo.
      expect(["ok", "23505"]).toContain(
        await codigo(NUEVO_ROL, [A, datosA.personaId, rol, datosA.personaId]),
      );
    }
    for (const rol of ["", "Administrador", "operador", "soporte", "propietario"]) {
      expect(
        await codigo(NUEVO_ROL, [A, datosA.personaId, rol, datosA.personaId]),
        rol,
      ).toBe("23514");
    }
  });

  it("no puede haber dos asignaciones vigentes del mismo rol (23505)", async () => {
    expect(
      await codigo(NUEVO_ROL, [A, datosA.personaId, "administrador", datosA.personaId]),
    ).toBe("23505");
  });

  it("tras revocar un rol se puede volver a asignar (el índice único es parcial)", async () => {
    const cliente = await admin.connect();
    try {
      await cliente.query("BEGIN");
      await cliente.query(
        "UPDATE public.asignacion_rol SET revocado_en = now(), revocado_por = $2 WHERE id = $1",
        [datosA.rolId, datosA.personaId],
      );
      await cliente.query(NUEVO_ROL, [
        A,
        datosA.personaId,
        "administrador",
        datosA.personaId,
      ]);
      const { rows } = await cliente.query(
        "SELECT count(*)::int AS n FROM public.asignacion_rol WHERE persona_id = $1 AND rol = 'administrador'",
        [datosA.personaId],
      );
      expect(rows[0].n).toBe(2);
    } finally {
      await cliente.query("ROLLBACK");
      cliente.release();
    }
  });

  it("la persona, quien asigna y quien revoca deben ser de la MISMA asociación (23503)", async () => {
    // Persona de B con un rol «de A».
    expect(
      await codigo(NUEVO_ROL, [A, datosB.personaId, "miembro", datosA.personaId]),
    ).toBe("23503");
    // Asignado por alguien de B.
    expect(
      await codigo(NUEVO_ROL, [A, datosA.personaId, "miembro", datosB.personaId]),
    ).toBe("23503");
    // Revocado por alguien de B.
    expect(
      await codigo(
        "UPDATE public.asignacion_rol SET revocado_en = now(), revocado_por = $2 WHERE id = $1",
        [datosA.rolId, datosB.personaId],
      ),
    ).toBe("23503");
  });

  it("asignado_por puede faltar: lo asignó la plataforma (semilla, operador)", async () => {
    expect(await codigo(NUEVO_ROL, [A, datosA.personaId, "miembro", null])).toBe("ok");
  });
});

describe("sesion (CA-1 y CA-6)", () => {
  const NUEVA_SESION = `INSERT INTO public.sesion
    (asociacion_id, cuenta_id, token_hash, expira_en, nivel_autenticacion)
    VALUES ($1, $2, $3, now() + interval '1 hour', $4)`;

  it("la cuenta debe ser de la misma asociación: una sesión no cruza (23503)", async () => {
    expect(
      await codigo(NUEVA_SESION, [A, datosB.cuentaId, Buffer.from("a1b2", "hex"), 1]),
    ).toBe("23503");
  });

  it("el token es único dentro de la asociación (23505)", async () => {
    expect(await codigo(NUEVA_SESION, [A, datosA.cuentaId, datosA.tokenHash, 1])).toBe(
      "23505",
    );
  });

  it("el mismo hash en otra asociación no choca (los espacios son independientes)", async () => {
    expect(await codigo(NUEVA_SESION, [B, datosB.cuentaId, datosA.tokenHash, 1])).toBe(
      "ok",
    );
  });

  it.each([0, 3, -1])(
    "el nivel de autenticación %i no es válido (23514)",
    async (nivel) => {
      expect(
        await codigo(NUEVA_SESION, [
          A,
          datosA.cuentaId,
          Buffer.from("c3d4", "hex"),
          nivel,
        ]),
      ).toBe("23514");
    },
  );

  it("empieza sin reautenticación ni revocación", async () => {
    const { rows } = await admin.query(
      "SELECT nivel_autenticacion, reautenticada_en, revocada_en FROM public.sesion WHERE id = $1",
      [datosA.sesionId],
    );
    expect(rows[0]).toEqual({
      nivel_autenticacion: 1,
      reautenticada_en: null,
      revocada_en: null,
    });
  });
});

describe("limite_uso (CA-10)", () => {
  it("la clave es única por asociación (23505), y la misma clave en otra no choca", async () => {
    const insertar =
      "INSERT INTO public.limite_uso (asociacion_id, clave, contador) VALUES ($1, $2, 1)";
    expect(await codigo(insertar, [A, datosA.claveLimite])).toBe("23505");
    expect(await codigo(insertar, [B, datosA.claveLimite])).toBe("ok");
  });

  it("el contador no puede ser negativo (23514)", async () => {
    expect(
      await codigo(
        "INSERT INTO public.limite_uso (asociacion_id, clave, contador) VALUES ($1, $2, -1)",
        [A, Buffer.from("e5f6", "hex")],
      ),
    ).toBe("23514");
  });
});

describe("integridad entre asociaciones (CA-2)", () => {
  it("ninguna asociación con datos puede borrarse (ON DELETE RESTRICT: 23503)", async () => {
    expect(await codigo("DELETE FROM public.asociacion WHERE id = $1", [A])).toBe(
      "23503",
    );
  });

  it("una persona con cuenta no puede borrarse (23503): se da de baja", async () => {
    expect(
      await codigo("DELETE FROM public.persona WHERE id = $1", [datosA.personaId]),
    ).toBe("23503");
  });
});
