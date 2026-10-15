-- Corte 3a (acceso), plan 2026-10-16-001, §5.3. Cinco tablas, todas de la asociación:
-- persona, cuenta_acceso, asignacion_rol, sesion y limite_uso. Las FK entre ellas
-- son compuestas (asociacion_id, …) y RESTRICT: una sesión no puede apuntar a una
-- cuenta de otra asociación aunque el código falle. Generado con Drizzle Kit
-- desde src/esquema.ts; el SQL propio está al final.
CREATE TABLE "asignacion_rol" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asociacion_id" uuid NOT NULL,
	"persona_id" uuid NOT NULL,
	"rol" text NOT NULL,
	"asignado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"asignado_por" uuid,
	"revocado_en" timestamp with time zone,
	"revocado_por" uuid,
	CONSTRAINT "asignacion_rol_rol_valido" CHECK ("asignacion_rol"."rol" IN ('administrador', 'gestor', 'representante', 'miembro'))
);
--> statement-breakpoint
CREATE TABLE "cuenta_acceso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asociacion_id" uuid NOT NULL,
	"persona_id" uuid NOT NULL,
	"correo" text NOT NULL,
	"correo_verificado_en" timestamp with time zone NOT NULL,
	"hash_contrasena" text,
	"credencial_version" integer DEFAULT 1 NOT NULL,
	"terminos_version" text,
	"terminos_aceptados_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cuenta_acceso_asociacion_id_unico" UNIQUE("asociacion_id","id"),
	CONSTRAINT "cuenta_acceso_persona_unica" UNIQUE("asociacion_id","persona_id"),
	CONSTRAINT "cuenta_acceso_correo_unico" UNIQUE("asociacion_id","correo"),
	CONSTRAINT "cuenta_acceso_correo_formato" CHECK ("cuenta_acceso"."correo" ~ '^[!-~]{3,254}$'
        AND "cuenta_acceso"."correo" = lower("cuenta_acceso"."correo")
        AND char_length("cuenta_acceso"."correo") - char_length(replace("cuenta_acceso"."correo", '@', '')) = 1
        AND strpos("cuenta_acceso"."correo", '@') > 1
        AND strpos("cuenta_acceso"."correo", '@') < char_length("cuenta_acceso"."correo")),
	CONSTRAINT "cuenta_acceso_version_positiva" CHECK ("cuenta_acceso"."credencial_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "limite_uso" (
	"asociacion_id" uuid NOT NULL,
	"clave" "bytea" NOT NULL,
	"contador" integer DEFAULT 0 NOT NULL,
	"ventana_desde" timestamp with time zone DEFAULT now() NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	CONSTRAINT "limite_uso_asociacion_id_clave_pk" PRIMARY KEY("asociacion_id","clave"),
	CONSTRAINT "limite_uso_contador_no_negativo" CHECK ("limite_uso"."contador" >= 0)
);
--> statement-breakpoint
CREATE TABLE "persona" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asociacion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"estado" text DEFAULT 'activa' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "persona_asociacion_id_unico" UNIQUE("asociacion_id","id"),
	CONSTRAINT "persona_nombre_longitud" CHECK (char_length(btrim("persona"."nombre")) BETWEEN 2 AND 120),
	CONSTRAINT "persona_estado_valido" CHECK ("persona"."estado" IN ('activa', 'suspendida', 'baja'))
);
--> statement-breakpoint
CREATE TABLE "sesion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asociacion_id" uuid NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"nivel_autenticacion" smallint DEFAULT 1 NOT NULL,
	"reautenticada_en" timestamp with time zone,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_uso_en" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"revocada_en" timestamp with time zone,
	CONSTRAINT "sesion_token_unico" UNIQUE("asociacion_id","token_hash"),
	CONSTRAINT "sesion_nivel_valido" CHECK ("sesion"."nivel_autenticacion" IN (1, 2))
);
--> statement-breakpoint
ALTER TABLE "asignacion_rol" ADD CONSTRAINT "asignacion_rol_asociacion_id_asociacion_id_fk" FOREIGN KEY ("asociacion_id") REFERENCES "public"."asociacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignacion_rol" ADD CONSTRAINT "asignacion_rol_persona_fk" FOREIGN KEY ("asociacion_id","persona_id") REFERENCES "public"."persona"("asociacion_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignacion_rol" ADD CONSTRAINT "asignacion_rol_asignado_por_fk" FOREIGN KEY ("asociacion_id","asignado_por") REFERENCES "public"."persona"("asociacion_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignacion_rol" ADD CONSTRAINT "asignacion_rol_revocado_por_fk" FOREIGN KEY ("asociacion_id","revocado_por") REFERENCES "public"."persona"("asociacion_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta_acceso" ADD CONSTRAINT "cuenta_acceso_asociacion_id_asociacion_id_fk" FOREIGN KEY ("asociacion_id") REFERENCES "public"."asociacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuenta_acceso" ADD CONSTRAINT "cuenta_acceso_persona_fk" FOREIGN KEY ("asociacion_id","persona_id") REFERENCES "public"."persona"("asociacion_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "limite_uso" ADD CONSTRAINT "limite_uso_asociacion_id_asociacion_id_fk" FOREIGN KEY ("asociacion_id") REFERENCES "public"."asociacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona" ADD CONSTRAINT "persona_asociacion_id_asociacion_id_fk" FOREIGN KEY ("asociacion_id") REFERENCES "public"."asociacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_asociacion_id_asociacion_id_fk" FOREIGN KEY ("asociacion_id") REFERENCES "public"."asociacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_cuenta_fk" FOREIGN KEY ("asociacion_id","cuenta_id") REFERENCES "public"."cuenta_acceso"("asociacion_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asignacion_rol_vigente" ON "asignacion_rol" USING btree ("asociacion_id","persona_id","rol") WHERE "asignacion_rol"."revocado_en" IS NULL;--> statement-breakpoint
CREATE INDEX "limite_uso_ventana_idx" ON "limite_uso" USING btree ("asociacion_id","ventana_desde");--> statement-breakpoint
CREATE INDEX "sesion_expira_idx" ON "sesion" USING btree ("asociacion_id","expira_en");--> statement-breakpoint
CREATE INDEX "sesion_cuenta_idx" ON "sesion" USING btree ("asociacion_id","cuenta_id");
--> statement-breakpoint
-- A partir de aquí, SQL propio (plan 2026-10-16-001, §5.4).
--
-- Aislamiento: RLS activada y forzada, política «aislamiento» RESTRICTIVE y
-- asociacion_id por defecto = el contexto, en las cinco tablas. No hay ninguna
-- tabla global de acceso.
SELECT app.aplicar_aislamiento('public.persona');
--> statement-breakpoint
SELECT app.aplicar_aislamiento('public.cuenta_acceso');
--> statement-breakpoint
SELECT app.aplicar_aislamiento('public.asignacion_rol');
--> statement-breakpoint
SELECT app.aplicar_aislamiento('public.sesion');
--> statement-breakpoint
SELECT app.aplicar_aislamiento('public.limite_uso');
--> statement-breakpoint
-- Privilegios mínimos de aspal_app, por columna donde corresponde. Nunca TRUNCATE,
-- TRIGGER ni REFERENCES. Las personas, cuentas y roles no se borran: se dan de baja
-- o se revocan. SELECT sobre token_hash y hash_contrasena no puede quitarse (hay que
-- filtrar y verificar con ellos): la defensa es de código (repositorio único).
GRANT SELECT, INSERT ON public.persona TO aspal_app;
--> statement-breakpoint
GRANT UPDATE (nombre, estado) ON public.persona TO aspal_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.cuenta_acceso TO aspal_app;
--> statement-breakpoint
-- El correo no se cambia en este corte: no se concede.
GRANT UPDATE (hash_contrasena, credencial_version, actualizado_en) ON public.cuenta_acceso TO aspal_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON public.asignacion_rol TO aspal_app;
--> statement-breakpoint
GRANT UPDATE (revocado_en, revocado_por) ON public.asignacion_rol TO aspal_app;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON public.sesion TO aspal_app;
--> statement-breakpoint
GRANT UPDATE (ultimo_uso_en, revocada_en, reautenticada_en) ON public.sesion TO aspal_app;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON public.limite_uso TO aspal_app;
--> statement-breakpoint
GRANT UPDATE (contador, ventana_desde, bloqueado_hasta) ON public.limite_uso TO aspal_app;
