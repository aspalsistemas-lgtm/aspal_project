/**
 * Aislamiento entre asociaciones contra PostgreSQL real (plan del corte 2,
 * «Verificación»). Es la prueba de que una asociación no puede ver ni tocar
 * los datos de otra.
 *
 * Usa dos tablas solo de prueba, `t` y su hija `t_hija` (FK compuesta), creadas
 * por `aspal_dueno` con `app.aplicar_aislamiento`: el mismo camino que seguirá
 * toda tabla real. Se borran al terminar; nunca van en una migración.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { sql } from "drizzle-orm";
import { conAsociacion, crearPool } from "./base-de-datos.js";
import { urlsDePrueba } from "./pruebas/preparar-integracion.js";
import { buscarProblemasDeAislamiento } from "./pruebas/guardianes.js";

const urls = urlsDePrueba();
const A = randomUUID(); // hace de ASPAL
const B = randomUUID(); // hace de la organización de prueba
const ID_FILA = { A: randomUUID(), B: randomUUID() };

let admin: pg.Pool;
let app: pg.Pool;

/** Ejecuta SQL como aspal_app dentro del contexto de una asociación. */
function enAsociacion<T = Record<string, unknown>>(
  asociacion: string,
  texto: string,
  valores: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return conAsociacion(app, asociacion, (base) =>
    (base.$client as pg.PoolClient).query<T>(texto, valores),
  );
}

/** Código SQLSTATE con que falla una promesa (o «ok» si no falla). */
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
  const dueno = await admin.connect();
  try {
    await dueno.query("SET ROLE aspal_dueno");
    await dueno.query(`
      CREATE TABLE public.t (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        asociacion_id uuid NOT NULL,
        clave text NOT NULL,
        valor text,
        UNIQUE (asociacion_id, id),
        UNIQUE (asociacion_id, clave)
      )`);
    await dueno.query(`
      CREATE TABLE public.t_hija (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        asociacion_id uuid NOT NULL,
        t_id uuid NOT NULL,
        UNIQUE (asociacion_id, id),
        FOREIGN KEY (asociacion_id, t_id) REFERENCES public.t (asociacion_id, id)
      )`);
    await dueno.query("SELECT app.aplicar_aislamiento('public.t')");
    await dueno.query("SELECT app.aplicar_aislamiento('public.t_hija')");
    await dueno.query(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON public.t, public.t_hija TO aspal_app",
    );
    await dueno.query("RESET ROLE");
    // Datos de partida, como superusuario (se salta RLS a propósito).
    await dueno.query(
      `INSERT INTO public.t (id, asociacion_id, clave, valor)
       VALUES ($1, $2, 'compartida', 'de A'), ($3, $4, 'compartida', 'de B')`,
      [ID_FILA.A, A, ID_FILA.B, B],
    );
  } finally {
    dueno.release();
  }
});

afterAll(async () => {
  await admin.query("DROP TABLE IF EXISTS public.t_hija, public.t");
  await Promise.all([admin.end(), app.end()]);
});

describe.each([
  { propia: "A", ajena: "B" },
  { propia: "B", ajena: "A" },
] as const)(
  "con el contexto de $propia, sobre filas de $ajena (CA-4)",
  ({ propia, ajena }) => {
    const yo = propia === "A" ? A : B;
    const otra = ajena === "A" ? A : B;
    const filaAjena = ID_FILA[ajena];

    it("solo ve sus propias filas", async () => {
      const { rows } = await enAsociacion<{ asociacion_id: string }>(
        yo,
        "SELECT asociacion_id FROM t",
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((fila) => fila.asociacion_id === yo)).toBe(true);
    });

    it("no ve la fila ajena ni por id, ni por count, ni con FOR UPDATE", async () => {
      expect(
        (await enAsociacion(yo, "SELECT * FROM t WHERE id = $1", [filaAjena])).rowCount,
      ).toBe(0);
      const cuenta = await enAsociacion<{ n: number }>(
        yo,
        "SELECT count(*)::int AS n FROM t WHERE asociacion_id = $1",
        [otra],
      );
      expect(cuenta.rows[0]?.n).toBe(0);
      expect(
        (await enAsociacion(yo, "SELECT * FROM t WHERE id = $1 FOR UPDATE", [filaAjena]))
          .rowCount,
      ).toBe(0);
    });

    it("no cambia ni borra la fila ajena (0 filas afectadas)", async () => {
      expect(
        (
          await enAsociacion(yo, "UPDATE t SET valor = 'pisado' WHERE id = $1", [
            filaAjena,
          ])
        ).rowCount,
      ).toBe(0);
      expect(
        (await enAsociacion(yo, "DELETE FROM t WHERE id = $1", [filaAjena])).rowCount,
      ).toBe(0);
      const intacta = await admin.query("SELECT valor FROM t WHERE id = $1", [filaAjena]);
      expect(intacta.rows[0].valor).toBe(`de ${ajena}`);
    });

    it("no puede insertar a nombre de la otra asociación (42501)", async () => {
      expect(
        await codigo(
          enAsociacion(yo, "INSERT INTO t (asociacion_id, clave) VALUES ($1, $2)", [
            otra,
            `intrusa-${randomUUID()}`,
          ]),
        ),
      ).toBe("42501");
    });

    it("inserta en la suya, también sin indicar asociacion_id (lo pone el contexto)", async () => {
      const { rows } = await enAsociacion<{ asociacion_id: string }>(
        yo,
        "INSERT INTO t (clave) VALUES ($1) RETURNING asociacion_id",
        [`propia-${randomUUID()}`],
      );
      expect(rows[0]?.asociacion_id).toBe(yo);
    });

    it("no puede mover una fila propia a la otra asociación (42501)", async () => {
      const { rows } = await enAsociacion<{ id: string }>(
        yo,
        "INSERT INTO t (clave) VALUES ($1) RETURNING id",
        [`movible-${randomUUID()}`],
      );
      expect(
        await codigo(
          enAsociacion(yo, "UPDATE t SET asociacion_id = $1 WHERE id = $2", [
            otra,
            rows[0]?.id,
          ]),
        ),
      ).toBe("42501");
    });

    it("ON CONFLICT con una clave que existe en la otra no la toca: inserta la propia", async () => {
      // La clave única incluye asociacion_id: «compartida» existe en ambas sin chocar.
      const clave = `conflicto-${randomUUID()}`;
      await admin.query(
        "INSERT INTO t (asociacion_id, clave, valor) VALUES ($1, $2, 'ajena')",
        [otra, clave],
      );
      await enAsociacion(
        yo,
        "INSERT INTO t (clave, valor) VALUES ($1, 'propia') ON CONFLICT (asociacion_id, clave) DO UPDATE SET valor = 'pisada'",
        [clave],
      );
      const { rows } = await admin.query(
        "SELECT asociacion_id, valor FROM t WHERE clave = $1 ORDER BY valor",
        [clave],
      );
      expect(rows).toEqual([
        { asociacion_id: otra, valor: "ajena" },
        { asociacion_id: yo, valor: "propia" },
      ]);
    });

    it("MERGE no ve la fila ajena", async () => {
      const resultado = await enAsociacion(
        yo,
        "MERGE INTO t USING (SELECT $1::uuid AS id) s ON t.id = s.id WHEN MATCHED THEN UPDATE SET valor = 'merge'",
        [filaAjena],
      );
      expect(resultado.rowCount).toBe(0);
      const intacta = await admin.query("SELECT valor FROM t WHERE id = $1", [filaAjena]);
      expect(intacta.rows[0].valor).toBe(`de ${ajena}`);
    });

    it("una fila hija no puede apuntar a una fila de la otra asociación (23503)", async () => {
      expect(
        await codigo(
          enAsociacion(yo, "INSERT INTO t_hija (t_id) VALUES ($1)", [filaAjena]),
        ),
      ).toBe("23503");
    });
  },
);

describe("sin contexto de asociación (CA-4)", () => {
  it("una conexión nueva no ve nada y no da error", async () => {
    const nueva = crearPool(urls.app, { max: 1 });
    const { rows } = await nueva.query("SELECT count(*)::int AS n FROM t");
    expect(rows[0].n).toBe(0);
    await nueva.end();
  });

  it("una conexión reutilizada (tras un contexto) tampoco ve nada ni da error", async () => {
    const unaSola = crearPool(urls.app, { max: 1 });
    await conAsociacion(unaSola, A, async () => undefined);
    const { rows } = await unaSola.query(
      "SELECT count(*)::int AS n, current_setting('app.asociacion_id', true) AS contexto FROM t",
    );
    expect(rows[0]).toEqual({ n: 0, contexto: "" });
    await unaSola.end();
  });

  it("no puede escribir: ni con asociacion_id explícito ni por defecto", async () => {
    expect(
      await codigo(
        app.query("INSERT INTO t (asociacion_id, clave) VALUES ($1, 'x')", [A]),
      ),
    ).toBe("42501");
    // Sin contexto, el valor por defecto es NULL: la política lo rechaza antes
    // de llegar a NOT NULL (medido: 42501, no 23502).
    expect(await codigo(app.query("INSERT INTO t (clave) VALUES ('x')"))).toBe("42501");
    expect((await app.query("UPDATE t SET valor = 'x'")).rowCount).toBe(0);
    expect((await app.query("DELETE FROM t")).rowCount).toBe(0);
  });

  it("un UUID que no es de ninguna asociación no ve nada", async () => {
    const { rows } = await enAsociacion<{ n: number }>(
      randomUUID(),
      "SELECT count(*)::int AS n FROM t",
    );
    expect(rows[0]?.n).toBe(0);
  });
});

describe("lo que la aplicación no puede hacer aunque lo intente (CA-2)", () => {
  it.each([
    ["TRUNCATE", "TRUNCATE t"],
    ["desactivar RLS", "ALTER TABLE t DISABLE ROW LEVEL SECURITY"],
    ["quitar RLS forzado", "ALTER TABLE t NO FORCE ROW LEVEL SECURITY"],
    ["borrar la política", "DROP POLICY aislamiento ON t"],
    ["crear otra política", "CREATE POLICY abierta ON t FOR SELECT USING (true)"],
    ["hacerse dueña", "SET ROLE aspal_dueno"],
    ["crear tablas", "CREATE TABLE public.mia (x int)"],
    ["crear tablas temporales", "CREATE TEMP TABLE mia (x int)"],
  ])("%s → sin permiso (42501)", async (_nombre, sentencia) => {
    expect(await codigo(app.query(sentencia))).toBe("42501");
  });
});

describe("testigos: la batería distingue un rol que se salta RLS", () => {
  it("el dueño también queda filtrado (FORCE ROW LEVEL SECURITY funciona)", async () => {
    const dueno = await admin.connect();
    try {
      await dueno.query("SET ROLE aspal_dueno");
      const sinContexto = await dueno.query("SELECT count(*)::int AS n FROM t");
      expect(sinContexto.rows[0].n).toBe(0);
      await dueno.query("BEGIN");
      await dueno.query("SELECT set_config('app.asociacion_id', $1, true)", [A]);
      const conA = await dueno.query<{ ajenas: number }>(
        "SELECT count(*) FILTER (WHERE asociacion_id <> $1)::int AS ajenas FROM t",
        [A],
      );
      expect(conA.rows[0]?.ajenas).toBe(0);
      await dueno.query("ROLLBACK");
    } finally {
      await dueno.query("RESET ROLE");
      dueno.release();
    }
  });

  it("el superusuario sí ve ambas asociaciones: si la app lo fuera, esto lo delataría", async () => {
    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(DISTINCT asociacion_id)::int AS n FROM t WHERE id = ANY ($1)",
      [[ID_FILA.A, ID_FILA.B]],
    );
    expect(rows[0]?.n).toBe(2);
  });
});

describe("conAsociacion y el pool (CA-3)", () => {
  it("si la función lanza, revierte y la conexión vuelve sin transacción ni contexto", async () => {
    const unaSola = crearPool(urls.app, { max: 1 });
    const clave = `revertida-${randomUUID()}`;
    await expect(
      conAsociacion(unaSola, A, async (base) => {
        await base.execute(sql`INSERT INTO t (clave) VALUES (${clave})`);
        throw new Error("falla a propósito");
      }),
    ).rejects.toThrow("falla a propósito");
    const { rows } = await unaSola.query(`
      SELECT xact_start = query_start AS transaccion_nueva,
             current_setting('app.asociacion_id', true) AS contexto
        FROM pg_stat_activity WHERE pid = pg_backend_pid()`);
    expect(rows[0]).toEqual({ transaccion_nueva: true, contexto: "" });
    const revertida = await admin.query(
      "SELECT count(*)::int AS n FROM t WHERE clave = $1",
      [clave],
    );
    expect(revertida.rows[0].n).toBe(0);
    await unaSola.end();
  });

  it("si la conexión muere a mitad, la descarta y la siguiente funciona", async () => {
    const unaSola = crearPool(urls.app, { max: 1 });
    unaSola.on("error", () => undefined);
    await expect(
      conAsociacion(unaSola, A, async (base) => {
        await base.execute(sql`SELECT pg_terminate_backend(pg_backend_pid())`);
      }),
    ).rejects.toBeDefined();
    const siguiente = await conAsociacion(unaSola, B, (base) =>
      base.execute<{ actual: string }>(sql`SELECT app.asociacion_actual() AS actual`),
    );
    expect(siguiente.rows[0]?.actual).toBe(B);
    await unaSola.end();
  });

  it("no se puede anidar", async () => {
    await expect(
      conAsociacion(app, A, () => conAsociacion(app, B, async () => "anidada")),
    ).rejects.toThrow(/anidar/);
  });

  it("rechaza un identificador que no es UUID antes de tocar la base", async () => {
    await expect(conAsociacion(app, "1 OR 1=1", async () => undefined)).rejects.toThrow();
  });

  it("200 transacciones concurrentes intercaladas nunca mezclan asociaciones", async () => {
    const dos = crearPool(urls.app, { max: 2 });
    const resultados = await Promise.all(
      Array.from({ length: 200 }, (_, i) => {
        const yo = i % 2 === 0 ? A : B;
        return conAsociacion(dos, yo, async (base) => {
          await base.execute(sql`SELECT pg_sleep(${Math.random() * 0.005})`);
          const { rows } = await base.execute<{ actual: string; ajenas: number }>(
            sql`SELECT app.asociacion_actual() AS actual,
                       count(*) FILTER (WHERE asociacion_id <> ${yo})::int AS ajenas
                  FROM t`,
          );
          return { yo, ...rows[0] };
        });
      }),
    );
    expect(resultados.filter((r) => r.actual !== r.yo || r.ajenas !== 0)).toEqual([]);
    await dos.end();
  });
});

describe("guardián del catálogo (guardianes 1 y 3)", () => {
  it("la base real, con las tablas de prueba, cumple el patrón", async () => {
    expect(await buscarProblemasDeAislamiento(admin)).toEqual([]);
  });

  it("detecta tablas y objetos que lo incumplen", async () => {
    const cliente = await admin.connect();
    try {
      await cliente.query("BEGIN");
      await cliente.query("SET LOCAL ROLE aspal_dueno");
      await cliente.query("CREATE TABLE public.sin_columna (x int)");
      await cliente.query("CREATE TABLE public.sin_rls (asociacion_id uuid NOT NULL)");
      await cliente.query(
        "CREATE TABLE public.clave_global (asociacion_id uuid NOT NULL, correo text UNIQUE)",
      );
      await cliente.query("SELECT app.aplicar_aislamiento('public.clave_global')");
      await cliente.query(
        "CREATE TABLE public.politica_permisiva (asociacion_id uuid NOT NULL)",
      );
      await cliente.query(`
        ALTER TABLE public.politica_permisiva ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.politica_permisiva FORCE ROW LEVEL SECURITY;
        CREATE POLICY aislamiento ON public.politica_permisiva FOR ALL USING (true)`);
      await cliente.query("CREATE VIEW public.vista_dueno AS SELECT * FROM public.t");
      await cliente.query(
        "CREATE MATERIALIZED VIEW public.copia AS SELECT * FROM public.t",
      );
      await cliente.query(
        "CREATE FUNCTION app.puerta_trasera() RETURNS int LANGUAGE sql SECURITY DEFINER AS 'SELECT 1'",
      );
      const problemas = await buscarProblemasDeAislamiento(cliente);
      expect(problemas).toEqual(
        expect.arrayContaining([
          "sin_columna: falta asociacion_id uuid NOT NULL",
          "sin_columna: RLS no activado",
          "sin_columna: falta la política aislamiento",
          "sin_rls: RLS no activado",
          "sin_rls: RLS no forzado",
          "sin_rls: falta la política aislamiento",
          "clave_global: clave_global_correo_key no incluye asociacion_id",
          "politica_permisiva: aislamiento no es RESTRICTIVE",
          "politica_permisiva: aislamiento no tiene la expresión canónica",
          "public.vista_dueno: vista sin security_invoker",
          "public.copia: vista materializada (sin RLS)",
          "app.puerta_trasera: SECURITY DEFINER no permitida",
          "app.puerta_trasera: SECURITY DEFINER sin search_path fijo",
        ]),
      );
    } finally {
      await cliente.query("ROLLBACK");
      cliente.release();
    }
  });
});
