/**
 * Tablas de correo (plan del corte 3, 3b: CA-23, CA-24, CA-26 y CA-21): lo que
 * PostgreSQL garantiza aunque el código falle, y su aislamiento entre asociaciones
 * como `aspal_app`, en los dos sentidos.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { conAsociacion, crearPool } from "./base-de-datos.js";
import {
  borrarAsociacionesDePrueba,
  crearAsociacionDePrueba,
  crearDatosDeAcceso,
  type DatosDeAcceso,
} from "./pruebas/datos-acceso.js";
import { urlsDePrueba } from "./pruebas/preparar-integracion.js";

const urls = urlsDePrueba();
let admin: pg.Pool;
let app: pg.Pool;
let A: string;
let B: string;
let datosA: DatosDeAcceso;
let datosB: DatosDeAcceso;

const token = () => randomBytes(32);

/** SQLSTATE con que falla una sentencia como administrador (o «ok»), siempre revertida. */
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

/** SQL como aspal_app dentro del contexto de una asociación. */
function como<T extends pg.QueryResultRow = Record<string, unknown>>(
  asociacion: string,
  texto: string,
  valores: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return conAsociacion(app, asociacion, (base) =>
    (base as unknown as { $client: pg.PoolClient }).$client.query<T>(texto, valores),
  );
}

async function codigoDe(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
    return "ok";
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
}

const REGISTRO =
  "INSERT INTO public.registro_pendiente (asociacion_id, correo, token_hash, expira_en) VALUES ($1, $2, $3, now() + interval '1 day')";
const TOKEN =
  "INSERT INTO public.token_correo (asociacion_id, cuenta_id, tipo, token_hash, expira_en) VALUES ($1, $2, $3, $4, now() + interval '1 hour')";
const INVITACION =
  "INSERT INTO public.invitacion (asociacion_id, correo, rol, token_hash, invitada_por, expira_en) VALUES ($1, $2, $3, $4, $5, now() + interval '7 days')";

beforeAll(async () => {
  admin = crearPool(urls.admin);
  app = crearPool(urls.app);
  A = await crearAsociacionDePrueba(admin, "correo-a");
  B = await crearAsociacionDePrueba(admin, "correo-b");
  datosA = await crearDatosDeAcceso(admin, A, "ana@ejemplo.org");
  datosB = await crearDatosDeAcceso(admin, B, "beto@ejemplo.org");
});

afterAll(async () => {
  await borrarAsociacionesDePrueba(admin, [A, B]);
  await Promise.all([admin.end(), app.end()]);
});

describe("registro_pendiente (CA-23)", () => {
  it("acepta un pendiente válido", async () => {
    expect(await codigo(REGISTRO, [A, "nuevo@ejemplo.org", token()])).toBe("ok");
  });

  it.each([
    ["con mayúsculas", "Nuevo@Ejemplo.org"],
    ["con espacios", "nuevo @ejemplo.org"],
    ["sin arroba", "nuevoejemplo.org"],
    ["con dos arrobas", "a@b@ejemplo.org"],
    ["no ASCII", "ñandú@ejemplo.org"],
    ["demasiado corto", "a@"],
  ])("rechaza un correo %s (23514)", async (_nombre, correo) => {
    expect(await codigo(REGISTRO, [A, correo, token()])).toBe("23514");
  });

  it("rechaza una caducidad anterior a la creación (23514)", async () => {
    expect(
      await codigo(
        "INSERT INTO public.registro_pendiente (asociacion_id, correo, token_hash, expira_en) VALUES ($1, 'x@ejemplo.org', $2, now() - interval '1 minute')",
        [A, token()],
      ),
    ).toBe("23514");
  });

  it("el token es único por asociación, no global", async () => {
    const repetido = token();
    await admin.query(REGISTRO, [A, "uno@ejemplo.org", repetido]);
    expect(await codigo(REGISTRO, [A, "dos@ejemplo.org", repetido])).toBe("23505");
    expect(await codigo(REGISTRO, [B, "dos@ejemplo.org", repetido])).toBe("ok");
  });

  it("admite varios pendientes del mismo correo (hasta 3 lo decide el código)", async () => {
    for (let i = 0; i < 4; i++) {
      await admin.query(REGISTRO, [A, "varios@ejemplo.org", token()]);
    }
    const { rows } = await admin.query(
      "SELECT count(*)::int AS n FROM public.registro_pendiente WHERE asociacion_id = $1 AND correo = 'varios@ejemplo.org'",
      [A],
    );
    expect(rows[0].n).toBe(4);
  });
});

describe("token_correo (CA-25)", () => {
  it("acepta un token de recuperación de una cuenta de la misma asociación", async () => {
    expect(
      await codigo(TOKEN, [A, datosA.cuentaId, "recuperar_contrasena", token()]),
    ).toBe("ok");
  });

  it("rechaza una cuenta de otra asociación (23503)", async () => {
    expect(
      await codigo(TOKEN, [A, datosB.cuentaId, "recuperar_contrasena", token()]),
    ).toBe("23503");
  });

  it.each(["enlace_acceso", "otro", ""])("rechaza el tipo %j (23514)", async (tipo) => {
    expect(await codigo(TOKEN, [A, datosA.cuentaId, tipo, token()])).toBe("23514");
  });

  it("el token es único por asociación", async () => {
    const repetido = token();
    await admin.query(TOKEN, [A, datosA.cuentaId, "recuperar_contrasena", repetido]);
    expect(
      await codigo(TOKEN, [A, datosA.cuentaId, "recuperar_contrasena", repetido]),
    ).toBe("23505");
  });
});

describe("invitacion (CA-26)", () => {
  it("acepta una invitación válida de una persona de la misma asociación", async () => {
    expect(
      await codigo(INVITACION, [
        A,
        "inv@ejemplo.org",
        "miembro",
        token(),
        datosA.personaId,
      ]),
    ).toBe("ok");
  });

  it("rechaza quien invita de otra asociación (23503)", async () => {
    expect(
      await codigo(INVITACION, [
        A,
        "inv@ejemplo.org",
        "miembro",
        token(),
        datosB.personaId,
      ]),
    ).toBe("23503");
  });

  it.each(["superusuario", "", "ADMINISTRADOR"])(
    "rechaza el rol %j (23514)",
    async (rol) => {
      expect(
        await codigo(INVITACION, [A, "inv@ejemplo.org", rol, token(), datosA.personaId]),
      ).toBe("23514");
    },
  );

  it("rechaza un correo mal formado (23514)", async () => {
    expect(
      await codigo(INVITACION, [A, "Mal Correo", "miembro", token(), datosA.personaId]),
    ).toBe("23514");
  });

  it("una sola pendiente por (correo, rol); otro rol u otra asociación sí; revocada deja repetir", async () => {
    await admin.query(INVITACION, [
      A,
      "dup@ejemplo.org",
      "gestor",
      token(),
      datosA.personaId,
    ]);
    expect(
      await codigo(INVITACION, [
        A,
        "dup@ejemplo.org",
        "gestor",
        token(),
        datosA.personaId,
      ]),
    ).toBe("23505");
    expect(
      await codigo(INVITACION, [
        A,
        "dup@ejemplo.org",
        "miembro",
        token(),
        datosA.personaId,
      ]),
    ).toBe("ok");
    expect(
      await codigo(INVITACION, [
        B,
        "dup@ejemplo.org",
        "gestor",
        token(),
        datosB.personaId,
      ]),
    ).toBe("ok");
    await admin.query(
      "UPDATE public.invitacion SET revocada_en = now() WHERE asociacion_id = $1 AND correo = 'dup@ejemplo.org' AND rol = 'gestor'",
      [A],
    );
    expect(
      await codigo(INVITACION, [
        A,
        "dup@ejemplo.org",
        "gestor",
        token(),
        datosA.personaId,
      ]),
    ).toBe("ok");
  });
});

interface Tabla {
  nombre: string;
  insertar: (asociacion: string, d: DatosDeAcceso) => Promise<void>;
  /** Columna que la aplicación sí puede actualizar. */
  actualizable: string;
  /** Columnas que no puede tocar nunca. */
  prohibidas: string[];
}

const TABLAS: Tabla[] = [
  {
    nombre: "registro_pendiente",
    insertar: async (asociacion) => {
      await admin.query(REGISTRO, [
        asociacion,
        `${randomUUID().slice(0, 8)}@ejemplo.org`,
        token(),
      ]);
    },
    actualizable: "usado_en = now()",
    prohibidas: [
      "token_hash = '\\x00'",
      "correo = 'otro@ejemplo.org'",
      "expira_en = now()",
    ],
  },
  {
    nombre: "token_correo",
    insertar: async (asociacion, d) => {
      await admin.query(TOKEN, [asociacion, d.cuentaId, "recuperar_contrasena", token()]);
    },
    actualizable: "usado_en = now()",
    prohibidas: [
      "token_hash = '\\x00'",
      "cuenta_id = gen_random_uuid()",
      "expira_en = now()",
    ],
  },
  {
    nombre: "invitacion",
    insertar: async (asociacion, d) => {
      await admin.query(INVITACION, [
        asociacion,
        `${randomUUID().slice(0, 8)}@ejemplo.org`,
        "miembro",
        token(),
        d.personaId,
      ]);
    },
    actualizable: "revocada_en = now()",
    prohibidas: [
      "rol = 'administrador'",
      "token_hash = '\\x00'",
      "correo = 'otro@ejemplo.org'",
    ],
  },
];

describe.each(TABLAS)("aislamiento y privilegios de $nombre (CA-21)", (tabla) => {
  const cuenta = async (asociacion: string) =>
    (
      await como<{ n: number }>(
        asociacion,
        `SELECT count(*)::int AS n FROM public.${tabla.nombre}`,
      )
    ).rows[0]!.n;

  beforeAll(async () => {
    await tabla.insertar(A, datosA);
    await tabla.insertar(B, datosB);
  });

  it("cada asociación ve solo lo suyo, en los dos sentidos", async () => {
    for (const [propia, ajena] of [
      [A, B],
      [B, A],
    ] as const) {
      expect(await cuenta(propia)).toBeGreaterThan(0);
      const { rows } = await como<{ n: number }>(
        propia,
        `SELECT count(*)::int AS n FROM public.${tabla.nombre} WHERE asociacion_id = $1`,
        [ajena],
      );
      expect(rows[0]!.n).toBe(0);
    }
  });

  it("sin contexto no ve nada", async () => {
    const cliente = await app.connect();
    try {
      const { rows } = await cliente.query(
        `SELECT count(*)::int AS n FROM public.${tabla.nombre}`,
      );
      expect(rows[0].n).toBe(0);
    } finally {
      cliente.release();
    }
  });

  it("no puede cambiar ni borrar filas de la otra asociación (0 afectadas)", async () => {
    const antes = await admin.query(
      `SELECT count(*)::int AS n FROM public.${tabla.nombre} WHERE asociacion_id = $1`,
      [B],
    );
    const actualizadas = await como(
      A,
      `UPDATE public.${tabla.nombre} SET ${tabla.actualizable} WHERE asociacion_id = $1`,
      [B],
    );
    const borradas = await como(
      A,
      `DELETE FROM public.${tabla.nombre} WHERE asociacion_id = $1`,
      [B],
    );
    expect(actualizadas.rowCount).toBe(0);
    expect(borradas.rowCount).toBe(0);
    const despues = await admin.query(
      `SELECT count(*)::int AS n FROM public.${tabla.nombre} WHERE asociacion_id = $1`,
      [B],
    );
    expect(despues.rows[0].n).toBe(antes.rows[0].n);
  });

  it("puede marcar lo suyo y solo eso: las demás columnas están vedadas (42501)", async () => {
    const hecho = await como(
      A,
      `UPDATE public.${tabla.nombre} SET ${tabla.actualizable}`,
    );
    expect(hecho.rowCount).toBeGreaterThan(0);
    for (const cambio of tabla.prohibidas) {
      expect(
        await codigoDe(como(A, `UPDATE public.${tabla.nombre} SET ${cambio}`)),
        cambio,
      ).toBe("42501");
    }
  });

  it("no inserta a nombre de la otra asociación (42501)", async () => {
    const texto = {
      registro_pendiente: REGISTRO,
      token_correo: TOKEN,
      invitacion: INVITACION,
    }[tabla.nombre as "registro_pendiente"];
    const valores =
      tabla.nombre === "registro_pendiente"
        ? [B, "intruso@ejemplo.org", token()]
        : tabla.nombre === "token_correo"
          ? [B, datosB.cuentaId, "recuperar_contrasena", token()]
          : [B, "intruso@ejemplo.org", "miembro", token(), datosB.personaId];
    expect(await codigoDe(como(A, texto, valores))).toBe("42501");
  });

  it("TRUNCATE está fuera de su alcance (42501)", async () => {
    expect(await codigoDe(como(A, `TRUNCATE public.${tabla.nombre}`))).toBe("42501");
  });
});
