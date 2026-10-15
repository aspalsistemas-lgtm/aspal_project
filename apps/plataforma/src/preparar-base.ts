/**
 * Prepara la base de datos para el aislamiento entre asociaciones (plan del
 * corte 2, §1). Corre como administrador, **antes** de migrar, y es idempotente:
 * se puede ejecutar en cada despliegue.
 *
 * Crea y fija los atributos de dos roles:
 *
 * - `aspal_dueno` (NOLOGIN): dueño de los esquemas y de todos los objetos. Las
 *   migraciones corren con `SET ROLE aspal_dueno`. No es superusuario, así que
 *   FORCE ROW LEVEL SECURITY le aplica y una vista o función suya no se salta RLS.
 * - `aspal_app` (LOGIN): la aplicación. Sin superusuario, sin BYPASSRLS, sin
 *   heredar privilegios y sin pertenecer a `aspal_dueno`.
 *
 * Y quita a PUBLIC los privilegios por defecto sobre la base y el esquema
 * `public`. Los roles van aquí y no en una migración porque son de todo el
 * clúster y porque el migrador de la nube puede no poder crearlos.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import pg from "pg";
import { cargarConfiguracionAdmin } from "./configuracion.js";

export const ROL_DUENO = "aspal_dueno";
export const ROL_APP = "aspal_app";

export async function prepararBase(
  cliente: pg.Client,
  claveRolApp: string,
): Promise<void> {
  await cliente.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROL_DUENO}') THEN
        CREATE ROLE ${ROL_DUENO};
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROL_APP}') THEN
        CREATE ROLE ${ROL_APP};
      END IF;
    END $$`);

  // Los atributos se fijan en cada ejecución: si alguien los cambió a mano, se
  // corrigen aquí y no se quedan así en silencio.
  await cliente.query(
    `ALTER ROLE ${ROL_DUENO} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT`,
  );
  // ALTER ROLE no admite parámetros enlazados: la contraseña va escapada.
  await cliente.query(
    `ALTER ROLE ${ROL_APP} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT PASSWORD ${cliente.escapeLiteral(claveRolApp)}`,
  );
  // Ningún valor por defecto de sesión: un `app.asociacion_id` fijado aquí haría
  // que «sin contexto» significara «dentro de una asociación».
  await cliente.query(`ALTER ROLE ${ROL_APP} RESET ALL`);
  await cliente.query(`
    DO $$ BEGIN
      EXECUTE format('ALTER ROLE ${ROL_APP} IN DATABASE %I RESET ALL', current_database());
      IF pg_has_role('${ROL_APP}', '${ROL_DUENO}', 'MEMBER') THEN
        REVOKE ${ROL_DUENO} FROM ${ROL_APP};
      END IF;
      -- Un administrador que no es superusuario (el maestro de la nube) necesita
      -- poder hacer SET ROLE ${ROL_DUENO} para migrar.
      IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
        EXECUTE format('GRANT ${ROL_DUENO} TO %I', current_user);
      END IF;

      EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database());
      EXECUTE format('GRANT CONNECT ON DATABASE %I TO ${ROL_APP}', current_database());
      EXECUTE format('GRANT CONNECT, CREATE ON DATABASE %I TO ${ROL_DUENO}', current_database());
    END $$`);

  await cliente.query(`ALTER SCHEMA public OWNER TO ${ROL_DUENO}`);
  await cliente.query(`REVOKE ALL ON SCHEMA public FROM PUBLIC`);
  await cliente.query(`GRANT USAGE ON SCHEMA public TO ${ROL_APP}`);

  // El registro de migraciones de Drizzle pudo crearse antes de existir el dueño
  // (corte 1): se le traspasa para que todo pertenezca a ${ROL_DUENO}.
  await cliente.query(`
    DO $$ DECLARE tabla record; BEGIN
      IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'drizzle') THEN
        ALTER SCHEMA drizzle OWNER TO ${ROL_DUENO};
        FOR tabla IN SELECT tablename FROM pg_tables WHERE schemaname = 'drizzle' LOOP
          EXECUTE format('ALTER TABLE drizzle.%I OWNER TO ${ROL_DUENO}', tabla.tablename);
        END LOOP;
      END IF;
    END $$`);
}

// Ejecutado como programa (no importado por un test).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { urlAdmin, claveRolApp } = cargarConfiguracionAdmin(process.env);
  if (!claveRolApp) {
    throw new Error(
      "Configuración de administración inválida: DATABASE_PASSWORD_APP: falta",
    );
  }
  const cliente = new pg.Client({ connectionString: urlAdmin });
  await cliente.connect();
  try {
    await prepararBase(cliente, claveRolApp);
    console.log("base preparada: roles y privilegios al día");
  } finally {
    await cliente.end();
  }
}
