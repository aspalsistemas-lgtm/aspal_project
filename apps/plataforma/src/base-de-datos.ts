/**
 * Conexión a PostgreSQL con `pg` (D4: Drizzle sobre node-postgres).
 *
 * El pool se crea una vez por proceso. Aquí vive lo que no es de ningún módulo:
 * crear el pool, comprobar que la base contesta y que el rol es el correcto, y
 * **la única puerta a los datos de una asociación: `conAsociacion`**.
 *
 * Es el único archivo que puede fijar el contexto de asociación (`set_config`
 * de `app.asociacion_id`); un test (guardián de código) lo impide en el resto.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { z } from "zod";

/** Tiempo máximo para dar la base por viva: más que esto, se considera caída. */
export const TIEMPO_MAXIMO_COMPROBACION_MS = 2000;

export function crearPool(url: string, opciones: { max?: number } = {}): pg.Pool {
  const pool = new pg.Pool({
    connectionString: url,
    connectionTimeoutMillis: TIEMPO_MAXIMO_COMPROBACION_MS,
    max: opciones.max,
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

/** La asociación de una petición, ya resuelta. El `id` nunca sale en una respuesta. */
export interface AsociacionResuelta {
  id: string;
  subdominio: string;
}

/**
 * Del subdominio a la asociación, sin contexto: la única consulta permitida
 * fuera de `conAsociacion`, y solo a través de `app.resolver_asociacion`
 * (igualdad exacta, una fila como mucho). Con su `id` se entra después en
 * `conAsociacion`.
 */
export async function resolverAsociacion(
  pool: pg.Pool,
  subdominio: string,
): Promise<AsociacionResuelta | null> {
  const { rows } = await pool.query<AsociacionResuelta>(
    "SELECT id, subdominio FROM app.resolver_asociacion($1)",
    [subdominio],
  );
  return rows[0] ?? null;
}

/** Lo que recibe el código de un módulo dentro de `conAsociacion`: Drizzle sobre la transacción. */
export type BaseDeAsociacion = NodePgDatabase;

const ID_ASOCIACION = z.uuid();
const dentroDeConAsociacion = new AsyncLocalStorage<true>();

/**
 * Ejecuta `fn` en una transacción cuyo contexto de RLS es `asociacionId`: toda
 * consulta que haga `fn` con la base que recibe ve y escribe **solo** filas de
 * esa asociación (plan del corte 2, §4).
 *
 * - El contexto se fija con `set_config(…, true)`, local a la transacción y con el
 *   valor como parámetro enlazado (nunca interpolado). Al terminar, la conexión
 *   vuelve al pool sin contexto.
 * - Si la transacción no se cierra limpia (ni COMMIT ni ROLLBACK), la conexión se
 *   destruye en vez de devolverse: otra petición no puede heredarla abierta.
 * - No se puede anidar: un segundo contexto dentro del primero sería ambiguo.
 * - `fn` debe usar solo la base que recibe; una consulta por otra vía no tiene
 *   contexto y no verá nada.
 */
export async function conAsociacion<T>(
  pool: pg.Pool,
  asociacionId: string,
  fn: (base: BaseDeAsociacion) => Promise<T>,
): Promise<T> {
  if (dentroDeConAsociacion.getStore()) {
    throw new Error("conAsociacion no se puede anidar");
  }
  const id = ID_ASOCIACION.parse(asociacionId);
  return dentroDeConAsociacion.run(true, async () => {
    const cliente = await pool.connect();
    let cerradaLimpia = false;
    try {
      await cliente.query("BEGIN");
      await cliente.query("SELECT set_config('app.asociacion_id', $1, true)", [id]);
      const resultado = await fn(drizzle(cliente));
      await cliente.query("COMMIT");
      cerradaLimpia = true;
      return resultado;
    } catch (error) {
      try {
        await cliente.query("ROLLBACK");
        cerradaLimpia = true;
      } catch {
        // La conexión no responde: se destruye en el finally.
      }
      throw error;
    } finally {
      cliente.release(
        cerradaLimpia
          ? undefined
          : new Error("transacción sin cerrar: conexión descartada"),
      );
    }
  });
}
