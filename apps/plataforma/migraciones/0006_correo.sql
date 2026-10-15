-- Corte 3b (correo), plan 2026-10-16-001, §5.3. Tres tablas, todas de la asociación:
-- registro_pendiente, token_correo e invitacion. Generado con Drizzle Kit desde
-- src/esquema.ts; el SQL propio está al final.
CREATE TABLE "invitacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asociacion_id" uuid NOT NULL,
	"correo" text NOT NULL,
	"rol" text NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"invitada_por" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"aceptada_en" timestamp with time zone,
	"revocada_en" timestamp with time zone,
	CONSTRAINT "invitacion_token_unico" UNIQUE("asociacion_id","token_hash"),
	CONSTRAINT "invitacion_correo_formato" CHECK ("invitacion"."correo" ~ '^[!-~]{3,254}$'
    AND "invitacion"."correo" = lower("invitacion"."correo")
    AND char_length("invitacion"."correo") - char_length(replace("invitacion"."correo", '@', '')) = 1
    AND strpos("invitacion"."correo", '@') > 1
    AND strpos("invitacion"."correo", '@') < char_length("invitacion"."correo")),
	CONSTRAINT "invitacion_rol_valido" CHECK ("invitacion"."rol" IN ('administrador', 'gestor', 'representante', 'miembro')),
	CONSTRAINT "invitacion_vigencia" CHECK ("invitacion"."expira_en" > "invitacion"."creado_en")
);
--> statement-breakpoint
CREATE TABLE "registro_pendiente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asociacion_id" uuid NOT NULL,
	"correo" text NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"usado_en" timestamp with time zone,
	CONSTRAINT "registro_pendiente_token_unico" UNIQUE("asociacion_id","token_hash"),
	CONSTRAINT "registro_pendiente_correo_formato" CHECK ("registro_pendiente"."correo" ~ '^[!-~]{3,254}$'
    AND "registro_pendiente"."correo" = lower("registro_pendiente"."correo")
    AND char_length("registro_pendiente"."correo") - char_length(replace("registro_pendiente"."correo", '@', '')) = 1
    AND strpos("registro_pendiente"."correo", '@') > 1
    AND strpos("registro_pendiente"."correo", '@') < char_length("registro_pendiente"."correo")),
	CONSTRAINT "registro_pendiente_vigencia" CHECK ("registro_pendiente"."expira_en" > "registro_pendiente"."creado_en")
);
--> statement-breakpoint
CREATE TABLE "token_correo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asociacion_id" uuid NOT NULL,
	"cuenta_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"usado_en" timestamp with time zone,
	CONSTRAINT "token_correo_token_unico" UNIQUE("asociacion_id","token_hash"),
	CONSTRAINT "token_correo_tipo_valido" CHECK ("token_correo"."tipo" IN ('recuperar_contrasena')),
	CONSTRAINT "token_correo_vigencia" CHECK ("token_correo"."expira_en" > "token_correo"."creado_en")
);
--> statement-breakpoint
ALTER TABLE "invitacion" ADD CONSTRAINT "invitacion_asociacion_id_asociacion_id_fk" FOREIGN KEY ("asociacion_id") REFERENCES "public"."asociacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitacion" ADD CONSTRAINT "invitacion_invitada_por_fk" FOREIGN KEY ("asociacion_id","invitada_por") REFERENCES "public"."persona"("asociacion_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_pendiente" ADD CONSTRAINT "registro_pendiente_asociacion_id_asociacion_id_fk" FOREIGN KEY ("asociacion_id") REFERENCES "public"."asociacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_correo" ADD CONSTRAINT "token_correo_asociacion_id_asociacion_id_fk" FOREIGN KEY ("asociacion_id") REFERENCES "public"."asociacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_correo" ADD CONSTRAINT "token_correo_cuenta_fk" FOREIGN KEY ("asociacion_id","cuenta_id") REFERENCES "public"."cuenta_acceso"("asociacion_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitacion_pendiente" ON "invitacion" USING btree ("asociacion_id","correo","rol") WHERE "invitacion"."aceptada_en" IS NULL AND "invitacion"."revocada_en" IS NULL;--> statement-breakpoint
CREATE INDEX "invitacion_invitadora_idx" ON "invitacion" USING btree ("asociacion_id","invitada_por");--> statement-breakpoint
CREATE INDEX "invitacion_expira_idx" ON "invitacion" USING btree ("asociacion_id","expira_en");--> statement-breakpoint
CREATE INDEX "registro_pendiente_correo_idx" ON "registro_pendiente" USING btree ("asociacion_id","correo");--> statement-breakpoint
CREATE INDEX "registro_pendiente_expira_idx" ON "registro_pendiente" USING btree ("asociacion_id","expira_en");--> statement-breakpoint
CREATE INDEX "token_correo_cuenta_idx" ON "token_correo" USING btree ("asociacion_id","cuenta_id");--> statement-breakpoint
CREATE INDEX "token_correo_expira_idx" ON "token_correo" USING btree ("asociacion_id","expira_en");

--> statement-breakpoint
-- A partir de aquí, SQL propio (plan 2026-10-16-001, §5.4).
--
-- Aislamiento: RLS activada y forzada, política «aislamiento» RESTRICTIVE y
-- asociacion_id por defecto = el contexto, en las tres tablas.
SELECT app.aplicar_aislamiento('public.registro_pendiente');
--> statement-breakpoint
SELECT app.aplicar_aislamiento('public.token_correo');
--> statement-breakpoint
SELECT app.aplicar_aislamiento('public.invitacion');
--> statement-breakpoint
-- Privilegios mínimos de aspal_app, por columna donde corresponde. Nunca TRUNCATE,
-- TRIGGER ni REFERENCES. Un token se marca como usado (o una invitación como aceptada
-- o revocada); el correo, el hash y el rol no se cambian jamás. DELETE solo para la
-- limpieza de lo caducado. SELECT sobre token_hash no puede quitarse (hay que
-- buscar por él): la defensa es de código (repositorio único en acceso/).
GRANT SELECT, INSERT, DELETE ON public.registro_pendiente TO aspal_app;
--> statement-breakpoint
GRANT UPDATE (usado_en) ON public.registro_pendiente TO aspal_app;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON public.token_correo TO aspal_app;
--> statement-breakpoint
GRANT UPDATE (usado_en) ON public.token_correo TO aspal_app;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON public.invitacion TO aspal_app;
--> statement-breakpoint
GRANT UPDATE (aceptada_en, revocada_en) ON public.invitacion TO aspal_app;
