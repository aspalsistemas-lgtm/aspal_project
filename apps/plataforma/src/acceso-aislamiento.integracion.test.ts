/**
 * Aislamiento y privilegios de las tablas de acceso (plan del corte 3, CA-2 y
 * CA-21), como `aspal_app` y en los dos sentidos: lo de una asociación no se ve,
 * no se escribe a su nombre y no se toca; y la aplicación solo puede lo que cada
 * tabla le concede, por columna.
 */
import { randomUUID } from "node:crypto";
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
const asociaciones: Record<"A" | "B", string> = { A: "", B: "" };
const datos = {} as Record<"A" | "B", DatosDeAcceso>;

/** SQL como aspal_app dentro del contexto de una asociación. */
function enAsociacion<T extends pg.QueryResultRow = Record<string, unknown>>(
  asociacion: string,
  texto: string,
  valores: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return conAsociacion(app, asociacion, (base) =>
    (base as unknown as { $client: pg.PoolClient }).$client.query<T>(texto, valores),
  );
}

async function codigo(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
    return "ok";
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
}

beforeAll(async () => {
  admin = crearPool(urls.admin);
  app = crearPool(urls.app);
  asociaciones.A = await crearAsociacionDePrueba(admin, "aisl-a");
  asociaciones.B = await crearAsociacionDePrueba(admin, "aisl-b");
  datos.A = await crearDatosDeAcceso(admin, asociaciones.A, "ana@ejemplo.org");
  datos.B = await crearDatosDeAcceso(admin, asociaciones.B, "beto@ejemplo.org");
});

afterAll(async () => {
  await borrarAsociacionesDePrueba(admin, [asociaciones.A, asociaciones.B]);
  await Promise.all([admin.end(), app.end()]);
});

interface Tabla {
  nombre: string;
  /** SQL que inserta una fila con `asociacion_id` explícito ($1) y lo necesario de la ajena. */
  insertar: (ajena: DatosDeAcceso) => [string, unknown[]];
  /** UPDATE permitido sobre las columnas concedidas, que debe afectar 0 filas ajenas. */
  actualizar: string;
  /** Columnas que `aspal_app` NO puede cambiar. */
  prohibidas: string[];
  /** ¿Puede `aspal_app` borrar filas? (Las personas, cuentas y roles no se borran.) */
  puedeBorrar: boolean;
}

const TABLAS: Tabla[] = [
  {
    nombre: "persona",
    insertar: () => [
      "INSERT INTO public.persona (asociacion_id, nombre) VALUES ($1, 'Intrusa')",
      [],
    ],
    actualizar: "UPDATE public.persona SET nombre = 'Pisada'",
    prohibidas: ["asociacion_id", "id", "creado_en"],
    puedeBorrar: false,
  },
  {
    nombre: "cuenta_acceso",
    insertar: (ajena) => [
      `INSERT INTO public.cuenta_acceso (asociacion_id, persona_id, correo, correo_verificado_en)
       VALUES ($1, $2, 'intrusa@ejemplo.org', now())`,
      [ajena.personaId],
    ],
    actualizar:
      "UPDATE public.cuenta_acceso SET credencial_version = credencial_version + 1",
    prohibidas: [
      "asociacion_id",
      "id",
      "persona_id",
      "correo",
      "correo_verificado_en",
      "terminos_version",
      "terminos_aceptados_en",
      "creado_en",
    ],
    puedeBorrar: false,
  },
  {
    nombre: "asignacion_rol",
    insertar: (ajena) => [
      "INSERT INTO public.asignacion_rol (asociacion_id, persona_id, rol) VALUES ($1, $2, 'miembro')",
      [ajena.personaId],
    ],
    actualizar: "UPDATE public.asignacion_rol SET revocado_en = now()",
    prohibidas: [
      "asociacion_id",
      "id",
      "persona_id",
      "rol",
      "asignado_en",
      "asignado_por",
    ],
    puedeBorrar: false,
  },
  {
    nombre: "sesion",
    insertar: (ajena) => [
      `INSERT INTO public.sesion (asociacion_id, cuenta_id, token_hash, expira_en)
       VALUES ($1, $2, '\\xabcdef01'::bytea, now() + interval '1 hour')`,
      [ajena.cuentaId],
    ],
    actualizar: "UPDATE public.sesion SET revocada_en = now()",
    prohibidas: [
      "asociacion_id",
      "id",
      "cuenta_id",
      "token_hash",
      "expira_en",
      "creada_en",
    ],
    puedeBorrar: true,
  },
  {
    nombre: "limite_uso",
    insertar: () => [
      "INSERT INTO public.limite_uso (asociacion_id, clave, contador) VALUES ($1, '\\x0a0b0c'::bytea, 1)",
      [],
    ],
    actualizar: "UPDATE public.limite_uso SET contador = contador + 1",
    prohibidas: ["asociacion_id", "clave"],
    puedeBorrar: true,
  },
];

describe.each(TABLAS)("$nombre: aislamiento entre asociaciones (CA-2)", (tabla) => {
  describe.each([
    { propia: "A", ajena: "B" },
    { propia: "B", ajena: "A" },
  ] as const)(
    "con el contexto de $propia, sobre filas de $ajena",
    ({ propia, ajena }) => {
      const yo = () => asociaciones[propia];
      const otra = () => asociaciones[ajena];

      it("solo ve las suyas", async () => {
        const { rows } = await enAsociacion<{ asociacion_id: string }>(
          yo(),
          `SELECT asociacion_id FROM public.${tabla.nombre}`,
        );
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((fila) => fila.asociacion_id === yo())).toBe(true);
      });

      it("no ve ninguna de la otra", async () => {
        const { rows } = await enAsociacion<{ n: number }>(
          yo(),
          `SELECT count(*)::int AS n FROM public.${tabla.nombre} WHERE asociacion_id = $1`,
          [otra()],
        );
        expect(rows[0]?.n).toBe(0);
      });

      it("no puede insertar a nombre de la otra (42501)", async () => {
        const [sql, extra] = tabla.insertar(datos[ajena]);
        expect(await codigo(enAsociacion(yo(), sql, [otra(), ...extra]))).toBe("42501");
      });

      it("no cambia ninguna fila de la otra (0 afectadas)", async () => {
        const antes = await admin.query(
          `SELECT count(*)::int AS n FROM public.${tabla.nombre} WHERE asociacion_id = $1`,
          [otra()],
        );
        const resultado = await enAsociacion(
          yo(),
          `${tabla.actualizar} WHERE asociacion_id = $1`,
          [otra()],
        );
        expect(resultado.rowCount).toBe(0);
        expect(antes.rows[0].n).toBeGreaterThan(0);
      });

      if (tabla.puedeBorrar) {
        it("no borra ninguna fila de la otra (0 afectadas)", async () => {
          const resultado = await enAsociacion(
            yo(),
            `DELETE FROM public.${tabla.nombre} WHERE asociacion_id = $1`,
            [otra()],
          );
          expect(resultado.rowCount).toBe(0);
        });
      }
    },
  );

  it("sin contexto no ve nada y no escribe nada", async () => {
    const { rows } = await app.query(
      `SELECT count(*)::int AS n FROM public.${tabla.nombre}`,
    );
    expect(rows[0].n).toBe(0);
    const [sql, extra] = tabla.insertar(datos.A);
    expect(await codigo(app.query(sql, [asociaciones.A, ...extra]))).toBe("42501");
  });
});

describe.each(TABLAS)("$nombre: privilegios por columna (CA-21)", (tabla) => {
  it("TRUNCATE y borrar el esquema están fuera de su alcance (42501)", async () => {
    expect(await codigo(app.query(`TRUNCATE public.${tabla.nombre}`))).toBe("42501");
  });

  it.each(tabla.prohibidas)("no puede cambiar la columna %s (42501)", async (columna) => {
    // Se prueba dentro de un contexto, para que la política no oculte el motivo.
    const valor = columna.endsWith("_en")
      ? "now()"
      : columna === "token_hash" || columna === "clave"
        ? "'\\x00'::bytea"
        : "NULL";
    expect(
      await codigo(
        enAsociacion(
          asociaciones.A,
          `UPDATE public.${tabla.nombre} SET ${columna} = ${valor}`,
        ),
      ),
    ).toBe("42501");
  });

  if (!tabla.puedeBorrar) {
    it("no puede borrar filas: se dan de baja (42501)", async () => {
      expect(
        await codigo(enAsociacion(asociaciones.A, `DELETE FROM public.${tabla.nombre}`)),
      ).toBe("42501");
    });
  }

  it("puede cambiar las columnas de estado que se le concedieron", async () => {
    const resultado = await enAsociacion(
      asociaciones.A,
      `${tabla.actualizar} WHERE false`,
    );
    expect(resultado.rowCount).toBe(0);
  });
});

describe("al insertar sin indicar asociacion_id, lo pone el contexto (CA-2)", () => {
  it("persona y limite_uso quedan en la asociación del contexto", async () => {
    const persona = await enAsociacion<{ asociacion_id: string }>(
      asociaciones.A,
      "INSERT INTO public.persona (nombre) VALUES ('Por defecto') RETURNING asociacion_id",
    );
    expect(persona.rows[0]?.asociacion_id).toBe(asociaciones.A);
    const limite = await enAsociacion<{ asociacion_id: string }>(
      asociaciones.B,
      "INSERT INTO public.limite_uso (clave, contador) VALUES ($1, 1) RETURNING asociacion_id",
      [Buffer.from(randomUUID().replaceAll("-", ""), "hex")],
    );
    expect(limite.rows[0]?.asociacion_id).toBe(asociaciones.B);
  });

  it("sin contexto, el valor por defecto es NULL y la política lo rechaza", async () => {
    expect(
      await codigo(
        app.query("INSERT INTO public.persona (nombre) VALUES ('Sin contexto')"),
      ),
    ).toBe("42501");
  });
});
