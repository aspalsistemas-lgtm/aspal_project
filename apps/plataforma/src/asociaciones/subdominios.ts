/**
 * Subdominios que nunca pueden ser de una asociación: los usa ya el dominio o los
 * usará la plataforma (D2). Fuente única: la usan la restricción CHECK de la
 * tabla `asociacion` (esquema.ts) y el análisis del `Host` (host.ts).
 */
export const SUBDOMINIOS_RESERVADOS = [
  "www",
  "app",
  "api",
  "admin",
  "comunidad",
  "correo",
  "mail",
  "soporte",
  "ayuda",
  "estado",
  "static",
  "assets",
  "cdn",
  "staging",
  "dev",
  // Corte 3: donde vivirían el acceso y el retorno de Google; una asociación no
  // puede reclamarlos.
  "auth",
  "login",
  "oauth",
  "sso",
  "id",
  "cuenta",
  "accounts",
  "signin",
] as const;

/** Una etiqueta DNS en minúsculas: letras, dígitos y guiones, sin guion en los extremos. */
export const FORMATO_SUBDOMINIO = "^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$";
