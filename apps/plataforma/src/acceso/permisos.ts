/**
 * Matriz rol × acción (plan del corte 3, CA-17). **Deniega por defecto**: una acción
 * que no figura aquí, o un rol que no la lista, no puede hacerla.
 *
 * Los permisos se evalúan con los roles leídos de la base en la misma petición
 * (`conSesion`), nunca con los de una cookie ni de una caché.
 */
import { esRol, type Rol } from "./rol.js";

const MATRIZ = {
  "perfil:ver_propio": ["administrador", "gestor", "representante", "miembro"],
  "personas:listar": ["administrador", "gestor"],
  "personas:ver_correo": ["administrador", "gestor"],
  "roles:asignar": ["administrador"],
  "personas:cambiar_estado": ["administrador"],
} as const satisfies Record<string, readonly Rol[]>;

export type Accion = keyof typeof MATRIZ;
export const ACCIONES = Object.keys(MATRIZ) as Accion[];

const PERMITIDOS = new Map<string, ReadonlySet<Rol>>(
  Object.entries(MATRIZ).map(([accion, roles]) => [accion, new Set<Rol>(roles)]),
);

export function puede(roles: readonly string[], accion: string): boolean {
  const permitidos = PERMITIDOS.get(accion);
  if (!permitidos) return false;
  return roles.some((rol) => esRol(rol) && permitidos.has(rol));
}
