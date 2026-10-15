/**
 * Guardianes del catálogo de PostgreSQL (plan del corte 2, guardianes 1 y 3).
 *
 * Recorren las tablas, vistas, políticas, funciones y restricciones reales y
 * devuelven cada incumplimiento del patrón de aislamiento como un texto. Un test
 * exige que la lista esté vacía; otro crea objetos defectuosos y exige que los
 * detecte, para que el guardián no pueda quedarse en verde sin mirar.
 */
import type pg from "pg";

/** Tablas de `public` que no son de una asociación (ámbito plataforma). */
export const TABLAS_DE_PLATAFORMA = ["asociacion"];

/** Funciones SECURITY DEFINER permitidas: cada una revisada a mano. */
export const FUNCIONES_DEFINER_PERMITIDAS = ["app.resolver_asociacion"];

/** Expresión canónica de la política `aislamiento` tal como la guarda PostgreSQL. */
export const EXPRESION_AISLAMIENTO =
  "(asociacion_id = ( SELECT app.asociacion_actual() AS asociacion_actual))";

type Consultable = Pick<pg.ClientBase, "query">;

export async function buscarProblemasDeAislamiento(base: Consultable): Promise<string[]> {
  const problemas: string[] = [];

  // 1. Toda tabla de public (y toda partición) que no sea de plataforma: columna
  //    asociacion_id uuid NOT NULL, RLS activado y forzado, y la política
  //    canónica RESTRICTIVE para todos los comandos y para PUBLIC.
  const { rows: tablas } = await base.query<{
    tabla: string;
    rls: boolean;
    forzado: boolean;
    tipo_columna: string | null;
    no_nula: boolean | null;
  }>(
    `SELECT c.relname AS tabla, c.relrowsecurity AS rls, c.relforcerowsecurity AS forzado,
            format_type(a.atttypid, a.atttypmod) AS tipo_columna, a.attnotnull AS no_nula
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_attribute a
         ON a.attrelid = c.oid AND a.attname = 'asociacion_id' AND NOT a.attisdropped
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        AND NOT (c.relname = ANY ($1))`,
    [TABLAS_DE_PLATAFORMA],
  );
  for (const t of tablas) {
    if (t.tipo_columna !== "uuid" || !t.no_nula) {
      problemas.push(`${t.tabla}: falta asociacion_id uuid NOT NULL`);
    }
    if (!t.rls) problemas.push(`${t.tabla}: RLS no activado`);
    if (!t.forzado) problemas.push(`${t.tabla}: RLS no forzado`);
  }

  const { rows: politicas } = await base.query<{
    tabla: string;
    permisiva: boolean;
    comando: string;
    roles: string;
    usando: string | null;
    comprueba: string | null;
  }>(
    `SELECT c.relname AS tabla, p.polpermissive AS permisiva, p.polcmd::text AS comando,
            p.polroles::text AS roles,
            pg_get_expr(p.polqual, p.polrelid) AS usando,
            pg_get_expr(p.polwithcheck, p.polrelid) AS comprueba
       FROM pg_policy p
       JOIN pg_class c ON c.oid = p.polrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND p.polname = 'aislamiento'`,
  );
  for (const t of tablas) {
    const politica = politicas.find((p) => p.tabla === t.tabla);
    if (!politica) {
      problemas.push(`${t.tabla}: falta la política aislamiento`);
      continue;
    }
    if (politica.permisiva) problemas.push(`${t.tabla}: aislamiento no es RESTRICTIVE`);
    if (politica.comando !== "*")
      problemas.push(`${t.tabla}: aislamiento no cubre todos los comandos`);
    if (politica.roles !== "{0}")
      problemas.push(`${t.tabla}: aislamiento no aplica a PUBLIC`);
    if (
      politica.usando !== EXPRESION_AISLAMIENTO ||
      politica.comprueba !== EXPRESION_AISLAMIENTO
    ) {
      problemas.push(`${t.tabla}: aislamiento no tiene la expresión canónica`);
    }
  }

  // 2. Vistas: solo con security_invoker (si no, se ejecutan con los privilegios
  //    de su dueño). Vistas materializadas: ninguna (no tienen RLS).
  const { rows: vistas } = await base.query<{
    nombre: string;
    tipo: string;
    invocador: boolean;
  }>(
    `SELECT n.nspname || '.' || c.relname AS nombre, c.relkind::text AS tipo,
            coalesce('security_invoker=true' = ANY (c.reloptions)
                  OR 'security_invoker=on' = ANY (c.reloptions), false) AS invocador
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname IN ('public', 'app') AND c.relkind IN ('v', 'm')`,
  );
  for (const v of vistas) {
    if (v.tipo === "m") problemas.push(`${v.nombre}: vista materializada (sin RLS)`);
    else if (!v.invocador) problemas.push(`${v.nombre}: vista sin security_invoker`);
  }

  // 3. SECURITY DEFINER: solo las de la lista y siempre con search_path fijo.
  const { rows: definers } = await base.query<{
    nombre: string;
    config: string[] | null;
  }>(
    `SELECT n.nspname || '.' || p.proname AS nombre, p.proconfig AS config
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('public', 'app') AND p.prosecdef`,
  );
  for (const f of definers) {
    if (!FUNCIONES_DEFINER_PERMITIDAS.includes(f.nombre)) {
      problemas.push(`${f.nombre}: SECURITY DEFINER no permitida`);
    }
    if (!f.config?.some((c) => c.startsWith("search_path="))) {
      problemas.push(`${f.nombre}: SECURITY DEFINER sin search_path fijo`);
    }
  }

  // 4. Claves de las tablas de asociación: todo UNIQUE y toda FK incluyen
  //    asociacion_id. Una clave global delata si un dato existe en otra
  //    asociación; una FK simple deja apuntar a filas de otra.
  const { rows: claves } = await base.query<{ tabla: string; restriccion: string }>(
    `SELECT c.relname AS tabla, k.conname AS restriccion
       FROM pg_constraint k
       JOIN pg_class c ON c.oid = k.conrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'asociacion_id'
      WHERE n.nspname = 'public' AND k.contype IN ('u', 'f')
        AND NOT (c.relname = ANY ($1))
        AND NOT (a.attnum = ANY (k.conkey))
     UNION ALL
     SELECT c.relname, i.relname
       FROM pg_index x
       JOIN pg_class c ON c.oid = x.indrelid
       JOIN pg_class i ON i.oid = x.indexrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'asociacion_id'
      WHERE n.nspname = 'public' AND x.indisunique AND NOT x.indisprimary
        AND NOT (c.relname = ANY ($1))
        AND NOT (a.attnum = ANY (x.indkey::int2[]))`,
    [TABLAS_DE_PLATAFORMA],
  );
  for (const k of claves) {
    problemas.push(`${k.tabla}: ${k.restriccion} no incluye asociacion_id`);
  }

  return [...new Set(problemas)].sort();
}
