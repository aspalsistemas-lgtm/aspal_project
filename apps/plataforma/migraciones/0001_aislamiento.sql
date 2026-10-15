-- Aislamiento entre asociaciones (Etapa 1, corte 2; plan 2026-10-15-001, §2).
-- Corre como aspal_dueno (migrar.ts hace SET ROLE). Ninguna tabla todavía: solo
-- el mecanismo que toda tabla de una asociación aplicará en su migración con
--   SELECT app.aplicar_aislamiento('public.<tabla>');

CREATE SCHEMA app;
--> statement-breakpoint
REVOKE ALL ON SCHEMA app FROM PUBLIC;
--> statement-breakpoint
-- PUBLIC tiene EXECUTE sobre toda función nueva por defecto: se le quita para
-- que cada permiso de la aplicación sea un GRANT explícito.
ALTER DEFAULT PRIVILEGES FOR ROLE aspal_dueno REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
--> statement-breakpoint
-- La asociación de la transacción en curso, o NULL si no hay contexto.
-- NULLIF: tras un set_config local, la sesión conserva el parámetro con valor ''
-- y ''::uuid fallaría; NULL hace que «sin contexto» sea «ninguna fila».
-- STABLE (nunca IMMUTABLE): un plan preparado no puede congelar el valor de una
-- asociación y reutilizarlo con otra. Sin SET search_path para que se pueda
-- incrustar en la consulta; por eso todo va calificado.
CREATE FUNCTION app.asociacion_actual() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$ SELECT NULLIF(pg_catalog.current_setting('app.asociacion_id', true), '')::uuid $$;
--> statement-breakpoint
-- Aplica el patrón obligatorio a una tabla de asociación:
--   · RLS activado y forzado (también para su dueño);
--   · asociacion_id por defecto = la asociación del contexto;
--   · «aislamiento», RESTRICTIVE: ninguna política permisiva futura puede ampliar
--     el acceso más allá de la propia asociación;
--   · «base», la permisiva mínima que RLS necesita para dejar pasar algo.
CREATE FUNCTION app.aplicar_aislamiento(tabla regclass) RETURNS void
  LANGUAGE plpgsql
  AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tabla);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tabla);
  EXECUTE format('ALTER TABLE %s ALTER COLUMN asociacion_id SET DEFAULT app.asociacion_actual()', tabla);
  EXECUTE format(
    'CREATE POLICY aislamiento ON %s AS RESTRICTIVE FOR ALL TO PUBLIC '
    'USING (asociacion_id = (SELECT app.asociacion_actual())) '
    'WITH CHECK (asociacion_id = (SELECT app.asociacion_actual()))', tabla);
  EXECUTE format(
    'CREATE POLICY base ON %s AS PERMISSIVE FOR ALL TO PUBLIC USING (true) WITH CHECK (true)',
    tabla);
END
$$;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
--> statement-breakpoint
-- La aplicación evalúa las políticas con sus propios privilegios: necesita usar
-- el esquema y ejecutar asociacion_actual(). Nada más.
GRANT USAGE ON SCHEMA app TO aspal_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.asociacion_actual() TO aspal_app;
