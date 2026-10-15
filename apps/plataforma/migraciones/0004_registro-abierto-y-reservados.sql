-- Corte 3 (acceso), plan 2026-10-16-001, §5.3 y §5.4.
-- 1) registro_abierto: cada asociación decide si cualquiera puede registrarse como
--    miembro. Cerrado por defecto; solo lo cambia el operador (corte 4).
-- 2) Subdominios reservados ampliados con los lugares naturales del acceso y del
--    retorno de Google, para que una asociación no pueda reclamarlos.
ALTER TABLE "asociacion" DROP CONSTRAINT "asociacion_subdominio_no_reservado";--> statement-breakpoint
ALTER TABLE "asociacion" ADD COLUMN "registro_abierto" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "asociacion" ADD CONSTRAINT "asociacion_subdominio_no_reservado" CHECK ("asociacion"."subdominio" NOT IN ('www', 'app', 'api', 'admin', 'comunidad', 'correo', 'mail', 'soporte', 'ayuda', 'estado', 'static', 'assets', 'cdn', 'staging', 'dev', 'auth', 'login', 'oauth', 'sso', 'id', 'cuenta', 'accounts', 'signin'));
