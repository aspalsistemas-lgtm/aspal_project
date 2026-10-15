/**
 * Conexión a PostgreSQL con `pg` (D4: Drizzle sobre node-postgres).
 *
 * El pool se crea una vez por proceso. Las consultas de negocio irán por
 * Drizzle; aquí solo vive lo que no es de ningún módulo: crear el pool y
 * comprobar que la base contesta.
 */
import pg from "pg";

/** Tiempo máximo para dar la base por viva: más que esto, se considera caída. */
export const TIEMPO_MAXIMO_COMPROBACION_MS = 2000;

export function crearPool(url: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: url,
    connectionTimeoutMillis: TIEMPO_MAXIMO_COMPROBACION_MS,
  });
  // Si la base cierra una conexión inactiva (reinicio, corte de red), el pool
  // emite «error». Sin oyente, Node mata el proceso; con él, el pool descarta esa
  // conexión, abre otra en la siguiente consulta y /health responde 503 mientras
  // tanto. Solo el mensaje: el error completo arrastra la configuración.
  pool.on("error", (error) => {
    console.error(`conexión con la base perdida: ${error.message}`);
  });
  return pool;
}

/**
 * Se niega a seguir si la aplicación se conecta con un rol que se saltaría el
 * aislamiento: superusuario, con BYPASSRLS o miembro del dueño de las tablas
 * (plan del corte 2, §3). Con cualquiera de esos, las políticas RLS existirían
 * pero no filtrarían nada. `servidor.ts` la llama antes de escuchar.
 */
export async function verificarRolDeAplicacion(pool: pg.Pool): Promise<void> {
  const { rows } = await pool.query<{
    rolsuper: boolean;
    rolbypassrls: boolean;
    miembro_del_dueno: boolean;
  }>(`
    SELECT r.rolsuper, r.rolbypassrls,
           CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aspal_dueno')
                THEN pg_has_role(current_user, 'aspal_dueno', 'MEMBER')
                ELSE false END AS miembro_del_dueno
      FROM pg_roles r
     WHERE r.rolname = current_user`);
  const rol = rows[0];
  const problemas = [
    rol?.rolsuper && "es superusuario",
    rol?.rolbypassrls && "tiene BYPASSRLS",
    rol?.miembro_del_dueno && "pertenece a aspal_dueno",
  ].filter(Boolean);
  if (!rol || problemas.length > 0) {
    throw new Error(
      `El rol de la base de datos de la aplicación se saltaría el aislamiento entre asociaciones (${problemas.join(", ") || "rol desconocido"}). Usa el rol aspal_app.`,
    );
  }
}

/** `SELECT 1` con tiempo máximo. Nunca lanza: devuelve si la base contestó. */
export async function comprobarBaseDeDatos(pool: pg.Pool): Promise<boolean> {
  let temporizador: NodeJS.Timeout | undefined;
  const limite = new Promise<false>((resolver) => {
    temporizador = setTimeout(() => resolver(false), TIEMPO_MAXIMO_COMPROBACION_MS);
  });
  const consulta = pool.query("SELECT 1").then(
    () => true,
    () => false,
  );
  try {
    return await Promise.race([consulta, limite]);
  } finally {
    clearTimeout(temporizador);
  }
}
