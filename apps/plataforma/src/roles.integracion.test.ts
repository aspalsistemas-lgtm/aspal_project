/**
 * Roles, propiedad y privilegios (plan del corte 2, §1–§3 y guardianes 2, 4 y 6).
 *
 * Si alguno de estos tests falla, el aislamiento entre asociaciones puede ser
 * solo aparente: las políticas RLS existirían pero un rol con más privilegios
 * de la cuenta las saltaría.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { crearPool, verificarRolDeAplicacion } from "./base-de-datos.js";
import { prepararBase } from "./preparar-base.js";
import { urlsDePrueba } from "./pruebas/preparar-integracion.js";
import { FILTRO_ESQUEMAS_PROPIOS } from "./pruebas/guardianes.js";

const urls = urlsDePrueba();
let admin: pg.Pool;
let app: pg.Pool;

beforeAll(() => {
  admin = crearPool(urls.admin);
  app = crearPool(urls.app);
});

afterAll(async () => {
  await Promise.all([admin.end(), app.end()]);
});

describe("rol de la aplicación (CA-2)", () => {
  it("no es superusuario, no tiene BYPASSRLS, no hereda ni pertenece al dueño", async () => {
    const { rows } = await admin.query(`
      SELECT rolsuper, rolbypassrls, rolinherit, rolcreaterole, rolcreatedb,
             pg_has_role('aspal_app', 'aspal_dueno', 'MEMBER') AS miembro_del_dueno
        FROM pg_roles WHERE rolname = 'aspal_app'`);
    expect(rows[0]).toEqual({
      rolsuper: false,
      rolbypassrls: false,
      rolinherit: false,
      rolcreaterole: false,
      rolcreatedb: false,
      miembro_del_dueno: false,
    });
  });

  it("el dueño tampoco es superusuario ni tiene BYPASSRLS, y no puede iniciar sesión", async () => {
    const { rows } = await admin.query(
      "SELECT rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = 'aspal_dueno'",
    );
    expect(rows[0]).toEqual({ rolsuper: false, rolbypassrls: false, rolcanlogin: false });
  });

  it("no puede convertirse en el dueño con SET ROLE", async () => {
    await expect(app.query("SET ROLE aspal_dueno")).rejects.toMatchObject({
      code: "42501",
    });
  });

  it("no tiene valores por defecto de sesión (ningún contexto de asociación implícito)", async () => {
    const { rows } = await admin.query(`
      SELECT count(*)::int AS n FROM pg_db_role_setting s
        JOIN pg_roles r ON r.oid = s.setrole WHERE r.rolname = 'aspal_app'`);
    expect(rows[0].n).toBe(0);
    const conexion = await app.query(
      "SELECT current_setting('app.asociacion_id', true) AS valor",
    );
    expect(conexion.rows[0].valor).toBeNull();
  });
});

describe("comprobación de arranque (guardián 6)", () => {
  it("rechaza conectarse como superusuario", async () => {
    await expect(verificarRolDeAplicacion(admin)).rejects.toThrow(/superusuario/);
  });

  it("acepta el rol aspal_app", async () => {
    await expect(verificarRolDeAplicacion(app)).resolves.toBeUndefined();
  });

  describe("con roles desechables, cada motivo de rechazo por separado (auditoría 3)", () => {
    const CLAVE = "clave-de-prueba-larga";
    const roles: string[] = [];
    const pools: pg.Pool[] = [];

    /** Crea un rol de prueba con LOGIN y devuelve un pool conectado como él. */
    async function rolDePrueba(nombre: string, atributos = ""): Promise<pg.Pool> {
      roles.push(nombre);
      await admin.query(
        `CREATE ROLE ${nombre} LOGIN NOSUPERUSER NOINHERIT ${atributos} PASSWORD '${CLAVE}'`,
      );
      await admin.query(`GRANT CONNECT ON DATABASE aspal_prueba TO ${nombre}`);
      const url = new URL(urls.app);
      url.username = nombre;
      url.password = CLAVE;
      const pool = crearPool(url.toString());
      pools.push(pool);
      return pool;
    }

    afterAll(async () => {
      await Promise.all(pools.map((pool) => pool.end()));
      for (const rol of [...roles, "prueba_grupo"]) {
        await admin.query(`DROP OWNED BY ${rol} CASCADE`).catch(() => undefined);
        await admin.query(`DROP ROLE IF EXISTS ${rol}`);
      }
    });

    it("rechaza un rol limpio que no es el esperado", async () => {
      const pool = await rolDePrueba("prueba_limpio");
      await expect(verificarRolDeAplicacion(pool)).rejects.toThrow(/no es aspal_app/);
      await expect(
        verificarRolDeAplicacion(pool, "prueba_limpio"),
      ).resolves.toBeUndefined();
    });

    it("rechaza BYPASSRLS", async () => {
      const pool = await rolDePrueba("prueba_bypass", "BYPASSRLS");
      await expect(verificarRolDeAplicacion(pool, "prueba_bypass")).rejects.toThrow(
        /BYPASSRLS/,
      );
    });

    it("rechaza pertenecer al dueño o a cualquier otro rol, aun con NOINHERIT", async () => {
      const delDueno = await rolDePrueba("prueba_miembro_dueno");
      await admin.query("GRANT aspal_dueno TO prueba_miembro_dueno");
      await expect(
        verificarRolDeAplicacion(delDueno, "prueba_miembro_dueno"),
      ).rejects.toThrow(/pertenece/);
      await admin.query("CREATE ROLE prueba_grupo NOLOGIN");
      const deOtro = await rolDePrueba("prueba_miembro_otro");
      await admin.query("GRANT prueba_grupo TO prueba_miembro_otro");
      await expect(
        verificarRolDeAplicacion(deOtro, "prueba_miembro_otro"),
      ).rejects.toThrow(/pertenece/);
    });

    it("rechaza un rol dueño de objetos (se saltaría RLS no forzada)", async () => {
      const pool = await rolDePrueba("prueba_duena");
      await admin.query("CREATE SCHEMA prueba_de_duena AUTHORIZATION prueba_duena");
      await expect(verificarRolDeAplicacion(pool, "prueba_duena")).rejects.toThrow(
        /dueño/,
      );
      await admin.query("DROP SCHEMA prueba_de_duena");
    });

    it("rechaza una sesión que trae contexto de asociación por configuración", async () => {
      const pool = await rolDePrueba("prueba_con_contexto");
      await admin.query(
        "ALTER ROLE prueba_con_contexto SET app.asociacion_id = '00000000-0000-4000-8000-000000000000'",
      );
      await expect(verificarRolDeAplicacion(pool, "prueba_con_contexto")).rejects.toThrow(
        /contexto/,
      );
    });
  });
});

describe("propiedad de los objetos (guardián 2)", () => {
  it("todo esquema, tabla, secuencia, vista y función de cualquier esquema propio es de aspal_dueno (auditoría 4)", async () => {
    const { rows } = await admin.query(`
      SELECT 'esquema' AS tipo, nspname AS nombre, pg_get_userbyid(nspowner) AS dueno
        FROM pg_namespace n WHERE ${FILTRO_ESQUEMAS_PROPIOS}
      UNION ALL
      SELECT 'relacion', n.nspname || '.' || c.relname, pg_get_userbyid(c.relowner)
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE ${FILTRO_ESQUEMAS_PROPIOS}
      UNION ALL
      SELECT 'funcion', n.nspname || '.' || p.proname, pg_get_userbyid(p.proowner)
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE ${FILTRO_ESQUEMAS_PROPIOS}`);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((fila) => fila.dueno !== "aspal_dueno")).toEqual([]);
  });
});

describe("privilegios de PUBLIC y de la aplicación (guardián 4)", () => {
  it("la aplicación no puede crear tablas temporales ni objetos en la base o en public", async () => {
    const { rows } = await admin.query(`
      SELECT has_database_privilege('aspal_app', current_database(), 'CONNECT') AS conectar,
             has_database_privilege('aspal_app', current_database(), 'TEMP') AS temporales,
             has_database_privilege('aspal_app', current_database(), 'CREATE') AS crear_esquemas,
             has_schema_privilege('aspal_app', 'public', 'USAGE') AS usar_public,
             has_schema_privilege('aspal_app', 'public', 'CREATE') AS crear_en_public`);
    expect(rows[0]).toEqual({
      conectar: true,
      temporales: false,
      crear_esquemas: false,
      usar_public: true,
      crear_en_public: false,
    });
  });

  it("no puede leer ni escribir el registro de migraciones", async () => {
    await expect(
      app.query("SELECT count(*) FROM drizzle.__drizzle_migrations"),
    ).rejects.toMatchObject({ code: "42501" });
  });
});

describe("prepararBase", () => {
  const clave = decodeURIComponent(new URL(urls.app).password);

  async function preparar(): Promise<void> {
    const cliente = new pg.Client({ connectionString: urls.admin });
    await cliente.connect();
    try {
      await prepararBase(cliente, clave);
    } finally {
      await cliente.end();
    }
  }

  it("es idempotente y corrige un atributo cambiado a mano", async () => {
    // CREATEDB y no BYPASSRLS: el rol es de todo el clúster (también lo usa la
    // base de desarrollo) y el finally lo restaura aunque el test falle (auditoría 9).
    try {
      await admin.query("ALTER ROLE aspal_app CREATEDB");
      await preparar();
      await preparar();
      const { rows } = await admin.query(
        "SELECT rolcreatedb FROM pg_roles WHERE rolname = 'aspal_app'",
      );
      expect(rows[0].rolcreatedb).toBe(false);
    } finally {
      await admin.query("ALTER ROLE aspal_app NOCREATEDB");
    }
  });

  it("le quita a la aplicación cualquier pertenencia a otro rol (auditoría 3)", async () => {
    await admin.query("CREATE ROLE prueba_grupo_preparar NOLOGIN");
    try {
      await admin.query("GRANT prueba_grupo_preparar TO aspal_app");
      await preparar();
      const { rows } = await admin.query(
        "SELECT count(*)::int AS n FROM pg_auth_members WHERE member = 'aspal_app'::regrole",
      );
      expect(rows[0].n).toBe(0);
    } finally {
      await admin.query("DROP ROLE prueba_grupo_preparar");
    }
  });

  it("borra un contexto fijado para la base o para todos los roles (auditoría 5)", async () => {
    const uuid = "00000000-0000-4000-8000-000000000000";
    try {
      await admin.query(`ALTER DATABASE aspal_prueba SET app.asociacion_id = '${uuid}'`);
      await admin.query(
        `ALTER ROLE ALL IN DATABASE aspal_prueba SET app.asociacion_id = '${uuid}'`,
      );
      await preparar();
      const { rows } = await admin.query(`
        SELECT count(*)::int AS n FROM pg_db_role_setting
         WHERE array_to_string(setconfig, ',') LIKE '%app.asociacion_id%'`);
      expect(rows[0].n).toBe(0);
    } finally {
      await admin.query("ALTER DATABASE aspal_prueba RESET app.asociacion_id");
      await admin.query(
        "ALTER ROLE ALL IN DATABASE aspal_prueba RESET app.asociacion_id",
      );
    }
  });
});
