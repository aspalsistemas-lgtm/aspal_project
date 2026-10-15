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
import { ROL_APP } from "./roles.js";

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
 * aislamiento (plan del corte 2, §3; auditoría, hallazgos 3 y 5). Exige:
 *
 * - que sea exactamente el rol esperado (`aspal_app`);
 * - que no sea superusuario ni tenga BYPASSRLS;
 * - que no pertenezca a **ningún** rol: aun con NOINHERIT, la pertenencia
 *   permite `SET ROLE` a uno con más privilegios;
 * - que no sea dueño de ningún objeto: el dueño se salta RLS si no está forzada;
 * - que la sesión no traiga contexto de asociación por configuración.
 *
 * `servidor.ts` la llama antes de escuchar.
 */
export async function verificarRolDeAplicacion(
  pool: pg.Pool,
  rolEsperado: string = ROL_APP,
): Promise<void> {
  const { rows } = await pool.query<{
    rol: string;
    rolsuper: boolean;
    rolbypassrls: boolean;
    pertenece: boolean;
    es_duena: boolean;
    contexto: string | null;
  }>(`
    SELECT current_user AS rol, r.rolsuper, r.rolbypassrls,
           EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member = r.oid) AS pertenece,
           EXISTS (SELECT 1 FROM pg_class c WHERE c.relowner = r.oid)
             OR EXISTS (SELECT 1 FROM pg_proc p WHERE p.proowner = r.oid)
             OR EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspowner = r.oid) AS es_duena,
           current_setting('app.asociacion_id', true) AS contexto
      FROM pg_roles r
     WHERE r.rolname = current_user`);
  const rol = rows[0];
  const problemas = rol
    ? [
        rol.rol !== rolEsperado && `no es ${rolEsperado}`,
        rol.rolsuper && "es superusuario",
        rol.rolbypassrls && "tiene BYPASSRLS",
        rol.pertenece && "pertenece a otros roles",
        rol.es_duena && "es dueño de objetos",
        rol.contexto && "trae un contexto de asociación de sesión",
      ].filter(Boolean)
    : ["rol desconocido"];
  if (problemas.length > 0) {
    throw new Error(
      `El rol de la base de datos de la aplicación se saltaría el aislamiento entre asociaciones (${problemas.join(", ")}). Usa el rol ${rolEsperado}.`,
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
 * Sentencias que el código de un módulo no puede ejecutar dentro de
 * `conAsociacion`: las que abren, cierran o parten la transacción, cambian el
 * contexto o el rol, o alteran el estado de la sesión que heredaría la
 * siguiente petición (auditoría del corte 2, hallazgos 2 y 10).
 */
const SENTENCIAS_PROHIBIDAS =
  /^\s*(begin|start|commit|end|rollback|abort|savepoint|release|prepare|set|reset|discard|listen|unlisten|notify)\b|\bset_config\b/i;

/**
 * El cliente que ve el código de un módulo: el de la transacción, vigilado.
 *
 * - Rechaza cualquier consulta en cuanto `fn` termina. Sin esto, una consulta
 *   lanzada tarde (una rama de `Promise.all`, un `void base.insert(…)`) podía
 *   ejecutarse sobre la conexión ya devuelta al pool y tomada por otra
 *   asociación, y escribir a su nombre (auditoría, hallazgo 1, reproducido).
 * - Rechaza las sentencias de `SENTENCIAS_PROHIBIDAS`.
 * - No deja devolver ni cerrar la conexión: eso lo hace solo `conAsociacion`.
 */
function clienteVigilado(
  cliente: pg.PoolClient,
  estaCerrada: () => boolean,
): pg.PoolClient {
  return new Proxy(cliente, {
    get(objetivo, propiedad) {
      if (propiedad === "query") {
        return (consulta: unknown, ...resto: unknown[]) => {
          if (estaCerrada()) {
            return Promise.reject(
              new Error("conAsociacion ya está cerrada: consulta rechazada"),
            );
          }
          const texto =
            typeof consulta === "string"
              ? consulta
              : ((consulta as { text?: string } | null)?.text ?? "");
          if (SENTENCIAS_PROHIBIDAS.test(texto)) {
            return Promise.reject(
              new Error("Sentencia no permitida dentro de conAsociacion"),
            );
          }
          return (objetivo.query as (...argumentos: unknown[]) => unknown).call(
            objetivo,
            consulta,
            ...resto,
          );
        };
      }
      if (propiedad === "release" || propiedad === "end" || propiedad === "connect") {
        return () => {
          throw new Error(`Operación no permitida dentro de conAsociacion: ${propiedad}`);
        };
      }
      const valor: unknown = Reflect.get(objetivo, propiedad, objetivo);
      return typeof valor === "function" ? valor.bind(objetivo) : valor;
    },
  });
}

/**
 * Ejecuta `fn` en una transacción cuyo contexto de RLS es `asociacionId`: toda
 * consulta que haga `fn` con la base que recibe ve y escribe **solo** filas de
 * esa asociación (plan del corte 2, §4).
 *
 * - Antes de empezar comprueba que la conexión no trae un contexto de sesión
 *   (por configuración o por un `SET` previo); si lo trae, la destruye.
 * - El contexto se fija con `set_config(…, true)`, local a la transacción y con el
 *   valor como parámetro enlazado (nunca interpolado). Al terminar, la conexión
 *   vuelve al pool sin contexto.
 * - `fn` recibe un cliente vigilado (`clienteVigilado`): ninguna consulta suya
 *   puede ejecutarse después de que termine, ni tocar la transacción o la sesión.
 * - Si `fn` falla, la conexión se destruye siempre, aunque el ROLLBACK funcione.
 * - No se puede anidar: un segundo contexto dentro del primero sería ambiguo.
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
    let cerrada = false;
    let destruir: Error | undefined;
    // Mientras está prestada, el pool no escucha los errores de la conexión: si
    // PostgreSQL la corta a mitad, el «error» sin oyente tumbaría el proceso.
    const alPerderLaConexion = (error: Error) => {
      destruir ??= error;
      console.error(`conexión perdida dentro de conAsociacion: ${error.message}`);
    };
    cliente.on("error", alPerderLaConexion);
    try {
      const { rows } = await cliente.query<{ contexto: string | null }>(
        "SELECT current_setting('app.asociacion_id', true) AS contexto",
      );
      if (rows[0]?.contexto) {
        destruir = new Error(
          "La conexión llegó con un contexto de asociación: descartada",
        );
        throw destruir;
      }
      await cliente.query("BEGIN");
      await cliente.query("SELECT set_config('app.asociacion_id', $1, true)", [id]);
      let resultado: T;
      try {
        resultado = await fn(drizzle(clienteVigilado(cliente, () => cerrada)));
      } finally {
        // Desde aquí, nada de lo que lanzó fn puede llegar a la base.
        cerrada = true;
      }
      await cliente.query("COMMIT");
      return resultado;
    } catch (error) {
      destruir ??= error instanceof Error ? error : new Error(String(error));
      try {
        await cliente.query("ROLLBACK");
      } catch {
        // La conexión no responde: se destruye igualmente.
      }
      throw error;
    } finally {
      cerrada = true;
      cliente.removeListener("error", alPerderLaConexion);
      // Con error, la conexión no vuelve al pool: se destruye.
      cliente.release(destruir);
    }
  });
}
