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
