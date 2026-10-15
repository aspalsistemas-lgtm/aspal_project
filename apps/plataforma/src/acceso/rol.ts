/**
 * Los roles de una persona dentro de su asociación (plan del corte 3, §5.3).
 *
 * Cuatro roles fijos; la matriz rol × acción vive en `permisos.ts`. Las tablas de rol y
 * permiso llegarán con los roles configurables (D7, cambio registrado en el plan).
 */
export const ROLES = ["administrador", "gestor", "representante", "miembro"] as const;
export type Rol = (typeof ROLES)[number];

/** Los de gestión: sesión más corta y, antes de producción, doble factor. */
export const ROLES_PRIVILEGIADOS: readonly Rol[] = ["administrador", "gestor"];

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && (ROLES as readonly string[]).includes(valor);
}

export function tienePrivilegios(roles: readonly string[]): boolean {
  return roles.some((rol) => (ROLES_PRIVILEGIADOS as readonly string[]).includes(rol));
}
