/**
 * El SQLSTATE de un error de PostgreSQL, lo envuelva Drizzle o no (`error.cause.code`).
 * Sirve para tratar como respuesta de negocio una violación de clave única (`23505`), un
 * interbloqueo (`40P01`) o un `lock_timeout` (`55P03`).
 */
export function codigoPostgres(error: unknown): string | undefined {
  for (let actual: unknown = error, i = 0; actual && i < 4; i++) {
    const codigo = (actual as { code?: unknown }).code;
    if (typeof codigo === "string" && /^[0-9A-Z]{5}$/.test(codigo)) return codigo;
    actual = (actual as { cause?: unknown }).cause;
  }
  return undefined;
}
