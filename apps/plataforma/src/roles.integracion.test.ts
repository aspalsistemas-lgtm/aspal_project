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
});

describe("propiedad de los objetos (guardián 2)", () => {
  it("todo esquema, tabla, secuencia, vista y función de app, public y drizzle es de aspal_dueno", async () => {
    const { rows } = await admin.query(`
      SELECT 'esquema' AS tipo, nspname AS nombre, pg_get_userbyid(nspowner) AS dueno
        FROM pg_namespace WHERE nspname IN ('app', 'public', 'drizzle')
      UNION ALL
      SELECT 'relacion', n.nspname || '.' || c.relname, pg_get_userbyid(c.relowner)
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname IN ('app', 'public', 'drizzle')
      UNION ALL
      SELECT 'funcion', n.nspname || '.' || p.proname, pg_get_userbyid(p.proowner)
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname IN ('app', 'public', 'drizzle')`);
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
  it("es idempotente y corrige un atributo cambiado a mano", async () => {
    await admin.query("ALTER ROLE aspal_app BYPASSRLS");
    const cliente = new pg.Client({ connectionString: urls.admin });
    await cliente.connect();
    await prepararBase(cliente, decodeURIComponent(new URL(urls.app).password));
    await prepararBase(cliente, decodeURIComponent(new URL(urls.app).password));
    await cliente.end();
    const { rows } = await admin.query(
      "SELECT rolbypassrls FROM pg_roles WHERE rolname = 'aspal_app'",
    );
    expect(rows[0].rolbypassrls).toBe(false);
  });
});
