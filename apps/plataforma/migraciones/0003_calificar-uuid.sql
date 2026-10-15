-- Auditoría del corte 2, hallazgo 7: el cast de asociacion_actual() se resolvía
-- con el search_path de quien la llama, porque la función se incrusta en la
-- consulta. Hoy era seguro (aspal_app no puede crear tipos), pero calificarlo
-- como pg_catalog.uuid no depende de eso. CREATE OR REPLACE conserva dueño y
-- permisos; el cuerpo es el único cambio.
CREATE OR REPLACE FUNCTION app.asociacion_actual() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$ SELECT NULLIF(pg_catalog.current_setting('app.asociacion_id', true), '')::pg_catalog.uuid $$;
