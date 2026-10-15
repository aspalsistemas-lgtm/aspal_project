CREATE TABLE "asociacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"subdominio" text NOT NULL,
	"zona_horaria" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asociacion_subdominio_unico" UNIQUE("subdominio"),
	CONSTRAINT "asociacion_nombre_longitud" CHECK (char_length(btrim("asociacion"."nombre")) BETWEEN 2 AND 120),
	CONSTRAINT "asociacion_subdominio_formato" CHECK ("asociacion"."subdominio" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
	CONSTRAINT "asociacion_subdominio_no_reservado" CHECK ("asociacion"."subdominio" NOT IN ('www', 'app', 'api', 'admin', 'comunidad', 'correo', 'mail', 'soporte', 'ayuda', 'estado', 'static', 'assets', 'cdn', 'staging', 'dev'))
);
--> statement-breakpoint
-- A partir de aquí, SQL propio (plan del corte 2, §2). La tabla es de ámbito
-- plataforma: RLS activado SIN forzar, para que su dueño (y por tanto
-- resolver_asociacion, que corre como él) vea todas las filas, y la aplicación
-- solo la propia.
ALTER TABLE "asociacion" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY propia ON public.asociacion FOR SELECT TO aspal_app
  USING (id = (SELECT app.asociacion_actual()));
--> statement-breakpoint
-- La única forma de pasar de un subdominio a una asociación sin contexto:
-- igualdad exacta, una fila como mucho, sin comodines. SECURITY DEFINER con
-- search_path vacío: nada de la sesión puede cambiar a qué tabla apunta.
CREATE FUNCTION app.resolver_asociacion(p_subdominio text)
  RETURNS TABLE (id uuid, nombre text, subdominio text, zona_horaria text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
  AS $$
    SELECT a.id, a.nombre, a.subdominio, a.zona_horaria
      FROM public.asociacion a
     WHERE a.subdominio = p_subdominio
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.resolver_asociacion(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.resolver_asociacion(text) TO aspal_app;
--> statement-breakpoint
-- Filtrado por la política «propia»: sin contexto, cero filas.
GRANT SELECT ON public.asociacion TO aspal_app;
