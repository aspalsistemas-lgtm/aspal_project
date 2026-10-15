/**
 * Tabla `asociacion`, su resolución y la instantánea de privilegios (plan del
 * corte 2: CA-1, CA-2, CA-8 y guardián 4).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { conAsociacion, crearPool } from "./base-de-datos.js";
import { urlsDePrueba } from "./pruebas/preparar-integracion.js";
import { sembrar } from "./sembrar.js";

const urls = urlsDePrueba();
let admin: pg.Pool;
let app: pg.Pool;
const ids: Record<string, string> = {};

/** SQLSTATE de un INSERT de prueba como dueño, siempre revertido. */
async function codigoAlInsertar(
  valores: [string, string, string | null],
): Promise<string> {
  const cliente = await admin.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("SET LOCAL ROLE aspal_dueno");
    await cliente.query(
      "INSERT INTO public.asociacion (nombre, subdominio, zona_horaria) VALUES ($1, $2, $3)",
      valores,
    );
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
  app = crearPool(urls.app);
  const cliente = new pg.Client({ connectionString: urls.admin });
  await cliente.connect();
  await sembrar(cliente);
  await sembrar(cliente); // idempotente
  await cliente.end();
  const { rows } = await admin.query("SELECT id, subdominio FROM public.asociacion");
  for (const fila of rows) ids[fila.subdominio] = fila.id;
});

afterAll(async () => {
  await Promise.all([admin.end(), app.end()]);
});

describe("semillas (CA-8)", () => {
  it("crean ASPAL y la organización de prueba una sola vez", async () => {
    const { rows } = await admin.query(
      "SELECT subdominio, zona_horaria FROM public.asociacion ORDER BY subdominio",
    );
    expect(rows).toEqual([
      { subdominio: "aspal", zona_horaria: "America/Merida" },
      { subdominio: "prueba", zona_horaria: "America/Mexico_City" },
    ]);
  });
});

describe("restricciones de asociacion (CA-1)", () => {
  it("acepta una asociación válida", async () => {
    expect(
      await codigoAlInsertar(["Colegio de Prueba", "colegio-2", "America/Lima"]),
    ).toBe("ok");
  });

  it("rechaza un subdominio repetido (23505)", async () => {
    expect(await codigoAlInsertar(["Otra", "aspal", "America/Merida"])).toBe("23505");
  });

  it.each(["Aspal", "-aspal", "aspal-", "a_b", "a.b", "con espacio", "", "a".repeat(64)])(
    "rechaza el subdominio mal formado %j (23514)",
    async (subdominio) => {
      expect(
        await codigoAlInsertar(["Nombre válido", subdominio, "America/Merida"]),
      ).toBe("23514");
    },
  );

  it.each([
    "www",
    "app",
    "api",
    "admin",
    "comunidad",
    "staging",
    // Añadidos en el corte 3: lugares naturales para el acceso y el retorno de Google.
    "auth",
    "login",
    "oauth",
    "sso",
    "id",
    "cuenta",
    "accounts",
    "signin",
  ])("rechaza el subdominio reservado %s (23514)", async (subdominio) => {
    expect(await codigoAlInsertar(["Nombre válido", subdominio, "America/Merida"])).toBe(
      "23514",
    );
  });

  it("rechaza un nombre vacío o de un carácter (23514)", async () => {
    expect(await codigoAlInsertar(["   ", "vacio", "America/Merida"])).toBe("23514");
    expect(await codigoAlInsertar(["A", "corto", "America/Merida"])).toBe("23514");
  });

  it("exige zona horaria (23502)", async () => {
    expect(await codigoAlInsertar(["Sin zona", "sin-zona", null])).toBe("23502");
  });
});

describe("registro_abierto (plan del corte 3, CA-23)", () => {
  it("es una columna booleana obligatoria y desactivada por defecto", async () => {
    const { rows } = await admin.query(`
      SELECT data_type, is_nullable, column_default
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'asociacion'
         AND column_name = 'registro_abierto'`);
    expect(rows).toEqual([
      { data_type: "boolean", is_nullable: "NO", column_default: "false" },
    ]);
  });

  it("las asociaciones sembradas empiezan con el registro cerrado", async () => {
    const { rows } = await admin.query(
      "SELECT subdominio, registro_abierto FROM public.asociacion WHERE subdominio IN ('aspal', 'prueba') ORDER BY 1",
    );
    expect(rows).toEqual([
      { subdominio: "aspal", registro_abierto: false },
      { subdominio: "prueba", registro_abierto: false },
    ]);
  });

  it("la aplicación no puede cambiarlo (solo el operador, en el corte 4)", async () => {
    await expect(
      app.query("UPDATE public.asociacion SET registro_abierto = true"),
    ).rejects.toMatchObject({ code: "42501" });
  });
});

describe("la aplicación y la tabla asociacion (CA-2)", () => {
  it("sin contexto no ve ninguna asociación", async () => {
    const { rows } = await app.query("SELECT count(*)::int AS n FROM public.asociacion");
    expect(rows[0].n).toBe(0);
  });

  it("con el contexto de una asociación ve solo la suya", async () => {
    const vistas = await conAsociacion(app, ids.aspal!, async (base) => {
      const cliente = (base as unknown as { $client: pg.PoolClient }).$client;
      return (await cliente.query("SELECT subdominio FROM public.asociacion")).rows;
    });
    expect(vistas).toEqual([{ subdominio: "aspal" }]);
  });

  it.each([
    [
      "crear",
      "INSERT INTO public.asociacion (nombre, subdominio, zona_horaria) VALUES ('X', 'xx', 'UTC')",
    ],
    ["cambiar", "UPDATE public.asociacion SET nombre = 'pisada'"],
    ["borrar", "DELETE FROM public.asociacion"],
  ])("no puede %s asociaciones (42501)", async (_accion, sentencia) => {
    await expect(app.query(sentencia)).rejects.toMatchObject({ code: "42501" });
  });
});

describe("app.resolver_asociacion (CA-6)", () => {
  async function resolver(subdominio: string) {
    return (await app.query("SELECT * FROM app.resolver_asociacion($1)", [subdominio]))
      .rows;
  }

  it("resuelve un subdominio exacto a una sola asociación", async () => {
    expect(await resolver("prueba")).toEqual([
      {
        id: ids.prueba,
        nombre: "Organización de Prueba",
        subdominio: "prueba",
        zona_horaria: "America/Mexico_City",
      },
    ]);
  });

  it.each(["%", "_", "aspal%", "ASPAL", " aspal", "aspal ", "inexistente", ""])(
    "no resuelve %j: sin comodines ni variantes",
    async (subdominio) => {
      expect(await resolver(subdominio)).toEqual([]);
    },
  );
});

describe("instantánea de privilegios de aspal_app (guardián 4)", () => {
  // Todos los esquemas propios, no solo public/app/drizzle (auditoría 4).
  const ESQUEMAS_PROPIOS =
    "n.nspname <> 'information_schema' AND n.nspname NOT LIKE 'pg\\_%'";

  it("es exactamente la esperada: nada más que lo concedido a propósito", async () => {
    const { rows: tablas } = await admin.query(`
      SELECT n.nspname || '.' || c.relname AS objeto,
             CASE WHEN c.relkind = 'S' THEN
               array_remove(ARRAY[
                 CASE WHEN has_sequence_privilege('aspal_app', c.oid, 'USAGE') THEN 'USAGE' END,
                 CASE WHEN has_sequence_privilege('aspal_app', c.oid, 'SELECT') THEN 'SELECT' END,
                 CASE WHEN has_sequence_privilege('aspal_app', c.oid, 'UPDATE') THEN 'UPDATE' END
               ], NULL)
             ELSE
               array_remove(ARRAY[
                 CASE WHEN has_table_privilege('aspal_app', c.oid, 'SELECT') THEN 'SELECT' END,
                 CASE WHEN has_table_privilege('aspal_app', c.oid, 'INSERT') THEN 'INSERT' END,
                 CASE WHEN has_table_privilege('aspal_app', c.oid, 'UPDATE') THEN 'UPDATE' END,
                 CASE WHEN has_table_privilege('aspal_app', c.oid, 'DELETE') THEN 'DELETE' END,
                 CASE WHEN has_table_privilege('aspal_app', c.oid, 'TRUNCATE') THEN 'TRUNCATE' END,
                 CASE WHEN has_table_privilege('aspal_app', c.oid, 'REFERENCES') THEN 'REFERENCES' END,
                 CASE WHEN has_table_privilege('aspal_app', c.oid, 'TRIGGER') THEN 'TRIGGER' END
               ], NULL)
             END AS privilegios
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE ${ESQUEMAS_PROPIOS}
         AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
         AND c.relname NOT IN ('t', 't_hija')
       ORDER BY 1`);
    const { rows: funciones } = await admin.query(`
      SELECT n.nspname || '.' || p.proname AS objeto,
             has_function_privilege('aspal_app', p.oid, 'EXECUTE') AS ejecutar
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE ${ESQUEMAS_PROPIOS}
       ORDER BY 1`);
    const { rows: esquemas } = await admin.query(`
      SELECT n.nspname AS objeto,
             has_schema_privilege('aspal_app', n.oid, 'USAGE') AS usar,
             has_schema_privilege('aspal_app', n.oid, 'CREATE') AS crear
        FROM pg_namespace n WHERE ${ESQUEMAS_PROPIOS} ORDER BY 1`);

    // Columnas con UPDATE concedido (a nivel de columna, no de tabla): CA-21.
    const { rows: columnasActualizables } = await admin.query(`
      SELECT n.nspname || '.' || c.relname AS objeto,
             array_agg(a.attname::text ORDER BY a.attnum) AS columnas
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE ${ESQUEMAS_PROPIOS} AND c.relkind IN ('r', 'p')
         AND c.relname NOT IN ('t', 't_hija')
         AND a.attnum > 0 AND NOT a.attisdropped
         AND has_column_privilege('aspal_app', c.oid, a.attnum, 'UPDATE')
       GROUP BY 1 ORDER BY 1`);
    // Y las que alcanzan REFERENCES o TRIGGER: ninguna, nunca.
    const { rows: columnasPeligrosas } = await admin.query(`
      SELECT n.nspname || '.' || c.relname AS objeto, a.attname AS columna
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE ${ESQUEMAS_PROPIOS} AND c.relkind IN ('r', 'p')
         AND a.attnum > 0 AND NOT a.attisdropped
         AND has_column_privilege('aspal_app', c.oid, a.attnum, 'REFERENCES')`);

    expect(tablas).toEqual([
      { objeto: "drizzle.__drizzle_migrations", privilegios: [] },
      { objeto: "drizzle.__drizzle_migrations_id_seq", privilegios: [] },
      { objeto: "public.asignacion_rol", privilegios: ["SELECT", "INSERT"] },
      { objeto: "public.asociacion", privilegios: ["SELECT"] },
      { objeto: "public.cuenta_acceso", privilegios: ["SELECT", "INSERT"] },
      { objeto: "public.limite_uso", privilegios: ["SELECT", "INSERT", "DELETE"] },
      { objeto: "public.persona", privilegios: ["SELECT", "INSERT"] },
      { objeto: "public.sesion", privilegios: ["SELECT", "INSERT", "DELETE"] },
    ]);
    expect(columnasActualizables).toEqual([
      { objeto: "public.asignacion_rol", columnas: ["revocado_en", "revocado_por"] },
      {
        objeto: "public.cuenta_acceso",
        columnas: ["hash_contrasena", "credencial_version", "actualizado_en"],
      },
      {
        objeto: "public.limite_uso",
        columnas: ["contador", "ventana_desde", "bloqueado_hasta"],
      },
      { objeto: "public.persona", columnas: ["nombre", "estado"] },
      {
        objeto: "public.sesion",
        columnas: ["reautenticada_en", "ultimo_uso_en", "revocada_en"],
      },
    ]);
    expect(columnasPeligrosas).toEqual([]);
    expect(funciones).toEqual([
      { objeto: "app.aplicar_aislamiento", ejecutar: false },
      { objeto: "app.asociacion_actual", ejecutar: true },
      { objeto: "app.resolver_asociacion", ejecutar: true },
    ]);
    expect(esquemas).toEqual([
      { objeto: "app", usar: true, crear: false },
      { objeto: "drizzle", usar: false, crear: false },
      { objeto: "public", usar: true, crear: false },
    ]);
  });

  it("las funciones propias son exactamente las revisadas (cuerpo, volatilidad, definer)", async () => {
    // Un CREATE OR REPLACE o una sobrecarga nueva cambia esta lista: cualquier
    // cambio en estas funciones se revisa a mano y se actualiza aquí (auditoría 4).
    const { rows } = await admin.query(`
      SELECT n.nspname || '.' || p.proname
               || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS firma,
             p.provolatile AS volatilidad, p.prosecdef AS definer,
             coalesce(array_to_string(p.proconfig, ','), '-') AS configuracion,
             md5(p.prosrc) AS huella
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE ${ESQUEMAS_PROPIOS} ORDER BY 1`);
    expect(rows).toEqual([
      {
        firma: "app.aplicar_aislamiento(tabla regclass)",
        volatilidad: "v",
        definer: false,
        configuracion: "-",
        huella: "603e066800adedde217e26ddde9ff5dd",
      },
      {
        firma: "app.asociacion_actual()",
        volatilidad: "s",
        definer: false,
        configuracion: "-",
        huella: "b618939beb7c37eef08f23672afac600",
      },
      {
        firma: "app.resolver_asociacion(p_subdominio text)",
        volatilidad: "s",
        definer: true,
        configuracion: 'search_path=""',
        huella: "6d28df46115fa2d409cd9ce3524e6ff6",
      },
    ]);
  });
});
