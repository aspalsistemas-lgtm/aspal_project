/**
 * Guardianes del catálogo de PostgreSQL (plan del corte 2, guardianes 1 y 3;
 * ampliados tras la auditoría, hallazgo 4).
 *
 * Recorren las tablas, vistas, políticas, funciones y restricciones reales de
 * **todos** los esquemas que no son del sistema y devuelven cada incumplimiento
 * del patrón de aislamiento como un texto. Un test exige que la lista esté vacía;
 * otro crea objetos defectuosos y exige que los detecte, para que el guardián no
 * pueda quedarse en verde sin mirar.
 */
import type pg from "pg";

/** Esquemas propios: todos menos los del sistema (pg_catalog, pg_toast, pg_temp…). */
export const FILTRO_ESQUEMAS_PROPIOS =
  "n.nspname <> 'information_schema' AND n.nspname NOT LIKE 'pg\\_%'";

/** Tablas que no son de una asociación (ámbito plataforma), con su esquema. */
export const TABLAS_DE_PLATAFORMA = ["public.asociacion", "drizzle.__drizzle_migrations"];

/** Funciones SECURITY DEFINER permitidas: cada una revisada a mano. */
export const FUNCIONES_DEFINER_PERMITIDAS = ["app.resolver_asociacion"];

/** Expresión canónica de la política `aislamiento` tal como la guarda PostgreSQL. */
export const EXPRESION_AISLAMIENTO =
  "(asociacion_id = ( SELECT app.asociacion_actual() AS asociacion_actual))";

/**
 * Políticas exactas de las tablas de plataforma. Una política nueva o cambiada
 * en `asociacion` (p. ej. una permisiva `USING (true)`) dejaría ver todas las
 * asociaciones: tiene que aparecer aquí, revisada, o el guardián falla.
 */
export const POLITICAS_DE_PLATAFORMA = [
  "public.asociacion · propia · permisiva · r · {aspal_app} · (id = ( SELECT app.asociacion_actual() AS asociacion_actual)) · -",
];

type Consultable = Pick<pg.ClientBase, "query">;

export async function buscarProblemasDeAislamiento(base: Consultable): Promise<string[]> {
  const problemas: string[] = [];

  // 1. Toda tabla (y partición) de un esquema propio que no sea de plataforma:
  //    asociacion_id uuid NOT NULL, RLS activado y forzado, la política canónica
  //    RESTRICTIVE y una FK de asociacion_id a public.asociacion(id).
  const { rows: tablas } = await base.query<{
    tabla: string;
    rls: boolean;
    forzado: boolean;
    tipo_columna: string | null;
    no_nula: boolean | null;
    fk_a_asociacion: boolean;
  }>(
    `SELECT n.nspname || '.' || c.relname AS tabla,
            c.relrowsecurity AS rls, c.relforcerowsecurity AS forzado,
            format_type(a.atttypid, a.atttypmod) AS tipo_columna, a.attnotnull AS no_nula,
            EXISTS (
              SELECT 1 FROM pg_constraint k
               WHERE k.conrelid = c.oid AND k.contype = 'f'
                 AND k.confrelid = 'public.asociacion'::regclass
                 AND k.conkey = ARRAY[a.attnum]
            ) AS fk_a_asociacion
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_attribute a
         ON a.attrelid = c.oid AND a.attname = 'asociacion_id' AND NOT a.attisdropped
      WHERE ${FILTRO_ESQUEMAS_PROPIOS} AND c.relkind IN ('r', 'p')
        AND NOT (n.nspname || '.' || c.relname = ANY ($1))`,
    [TABLAS_DE_PLATAFORMA],
  );
  for (const t of tablas) {
    if (t.tipo_columna !== "uuid" || !t.no_nula) {
      problemas.push(`${t.tabla}: falta asociacion_id uuid NOT NULL`);
    } else if (!t.fk_a_asociacion) {
      problemas.push(`${t.tabla}: asociacion_id sin FK a public.asociacion(id)`);
    }
    if (!t.rls) problemas.push(`${t.tabla}: RLS no activado`);
    if (!t.forzado) problemas.push(`${t.tabla}: RLS no forzado`);
  }

  const { rows: politicas } = await base.query<{
    tabla: string;
    nombre: string;
    permisiva: boolean;
    comando: string;
    roles: string;
    usando: string | null;
    comprueba: string | null;
  }>(
    `SELECT n.nspname || '.' || c.relname AS tabla, p.polname AS nombre,
            p.polpermissive AS permisiva, p.polcmd::text AS comando,
            CASE WHEN p.polroles = '{0}' THEN '{PUBLIC}'
                 ELSE (SELECT '{' || string_agg(r.rolname, ',' ORDER BY r.rolname) || '}'
                         FROM pg_roles r WHERE r.oid = ANY (p.polroles)) END AS roles,
            pg_get_expr(p.polqual, p.polrelid) AS usando,
            pg_get_expr(p.polwithcheck, p.polrelid) AS comprueba
       FROM pg_policy p
       JOIN pg_class c ON c.oid = p.polrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE ${FILTRO_ESQUEMAS_PROPIOS}`,
  );
  for (const t of tablas) {
    const politica = politicas.find(
      (p) => p.tabla === t.tabla && p.nombre === "aislamiento",
    );
    if (!politica) {
      problemas.push(`${t.tabla}: falta la política aislamiento`);
      continue;
    }
    if (politica.permisiva) problemas.push(`${t.tabla}: aislamiento no es RESTRICTIVE`);
    if (politica.comando !== "*") {
      problemas.push(`${t.tabla}: aislamiento no cubre todos los comandos`);
    }
    if (politica.roles !== "{PUBLIC}")
      problemas.push(`${t.tabla}: aislamiento no aplica a PUBLIC`);
    if (
      politica.usando !== EXPRESION_AISLAMIENTO ||
      politica.comprueba !== EXPRESION_AISLAMIENTO
    ) {
      problemas.push(`${t.tabla}: aislamiento no tiene la expresión canónica`);
    }
  }

  // 2. Tablas de plataforma: RLS activado y exactamente sus políticas revisadas.
  const { rows: plataforma } = await base.query<{ tabla: string; rls: boolean }>(
    `SELECT n.nspname || '.' || c.relname AS tabla, c.relrowsecurity AS rls
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname || '.' || c.relname = ANY ($1)`,
    [TABLAS_DE_PLATAFORMA],
  );
  for (const t of plataforma) {
    if (t.tabla === "public.asociacion" && !t.rls)
      problemas.push(`${t.tabla}: RLS no activado`);
  }
  const politicasDePlataforma = politicas
    .filter((p) => TABLAS_DE_PLATAFORMA.includes(p.tabla))
    .map(
      (p) =>
        `${p.tabla} · ${p.nombre} · ${p.permisiva ? "permisiva" : "restrictiva"} · ${p.comando} · ${p.roles} · ${p.usando ?? "-"} · ${p.comprueba ?? "-"}`,
    )
    .sort();
  for (const politica of politicasDePlataforma) {
    if (!POLITICAS_DE_PLATAFORMA.includes(politica)) {
      problemas.push(`política de plataforma no revisada: ${politica}`);
    }
  }
  for (const esperada of POLITICAS_DE_PLATAFORMA) {
    if (!politicasDePlataforma.includes(esperada)) {
      problemas.push(`falta la política de plataforma: ${esperada}`);
    }
  }

  // 3. Vistas: solo con security_invoker (si no, se ejecutan con los privilegios
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
      WHERE ${FILTRO_ESQUEMAS_PROPIOS} AND c.relkind IN ('v', 'm')`,
  );
  for (const v of vistas) {
    if (v.tipo === "m") problemas.push(`${v.nombre}: vista materializada (sin RLS)`);
    else if (!v.invocador) problemas.push(`${v.nombre}: vista sin security_invoker`);
  }

  // 4. SECURITY DEFINER: solo las de la lista y siempre con search_path fijo.
  const { rows: definers } = await base.query<{
    nombre: string;
    config: string[] | null;
  }>(
    `SELECT n.nspname || '.' || p.proname AS nombre, p.proconfig AS config
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE ${FILTRO_ESQUEMAS_PROPIOS} AND p.prosecdef`,
  );
  for (const f of definers) {
    if (!FUNCIONES_DEFINER_PERMITIDAS.includes(f.nombre)) {
      problemas.push(`${f.nombre}: SECURITY DEFINER no permitida`);
    }
    if (!f.config?.some((c) => c.startsWith("search_path="))) {
      problemas.push(`${f.nombre}: SECURITY DEFINER sin search_path fijo`);
    }
  }

  // 5. Claves de las tablas de asociación. Una clave única o de exclusión global
  //    delata si un dato existe en otra asociación; por eso todas incluyen
  //    asociacion_id, salvo una PK que sea exactamente (id). Una FK debe emparejar
  //    asociacion_id con el asociacion_id de la tabla referenciada (o ser la FK
  //    a public.asociacion(id)); si no, puede apuntar a filas de otra asociación.
  const { rows: claves } = await base.query<{
    tabla: string;
    restriccion: string;
    tipo: string;
    columnas: string[];
    incluye: boolean;
    emparejada: boolean;
  }>(
    `SELECT n.nspname || '.' || c.relname AS tabla, k.conname AS restriccion,
            k.contype::text AS tipo,
            ARRAY(SELECT attname FROM pg_attribute
                   WHERE attrelid = c.oid AND attnum = ANY (k.conkey) ORDER BY attnum)::text[]
              AS columnas,
            a.attnum = ANY (k.conkey) AS incluye,
            CASE WHEN k.contype <> 'f' THEN true
                 WHEN k.confrelid = 'public.asociacion'::regclass
                   THEN k.conkey = ARRAY[a.attnum]
                 ELSE coalesce((
                   SELECT ra.attname = 'asociacion_id'
                     FROM generate_subscripts(k.conkey, 1) AS i
                     JOIN pg_attribute ra
                       ON ra.attrelid = k.confrelid AND ra.attnum = k.confkey[i]
                    WHERE k.conkey[i] = a.attnum), false)
            END AS emparejada
       FROM pg_constraint k
       JOIN pg_class c ON c.oid = k.conrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'asociacion_id'
      WHERE ${FILTRO_ESQUEMAS_PROPIOS} AND k.contype IN ('p', 'u', 'f', 'x')
        AND NOT (n.nspname || '.' || c.relname = ANY ($1))`,
    [TABLAS_DE_PLATAFORMA],
  );
  for (const k of claves) {
    const pkSoloId = k.tipo === "p" && k.columnas.length === 1 && k.columnas[0] === "id";
    if (!k.incluye && !pkSoloId) {
      problemas.push(`${k.tabla}: ${k.restriccion} no incluye asociacion_id`);
    } else if (!k.emparejada) {
      problemas.push(
        `${k.tabla}: ${k.restriccion} no empareja asociacion_id con la tabla referenciada`,
      );
    }
  }
  const { rows: indices } = await base.query<{ tabla: string; indice: string }>(
    `SELECT n.nspname || '.' || c.relname AS tabla, i.relname AS indice
       FROM pg_index x
       JOIN pg_class c ON c.oid = x.indrelid
       JOIN pg_class i ON i.oid = x.indexrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'asociacion_id'
      WHERE ${FILTRO_ESQUEMAS_PROPIOS} AND x.indisunique AND NOT x.indisprimary
        AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conindid = x.indexrelid)
        AND NOT (n.nspname || '.' || c.relname = ANY ($1))
        AND NOT (a.attnum = ANY (x.indkey::int2[]))`,
    [TABLAS_DE_PLATAFORMA],
  );
  for (const i of indices) {
    problemas.push(`${i.tabla}: ${i.indice} no incluye asociacion_id`);
  }

  return [...new Set(problemas)].sort();
}
