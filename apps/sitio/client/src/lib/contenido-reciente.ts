/**
 * Qué muestra el bloque de contenido reciente de la home (RF-13). Si la API
 * falla, el bloque se oculta sin afectar al resto; mientras carga, esqueleto.
 * Pura, para poder probarla sin DOM (Vitest corre en `node`).
 */
export interface EstadoConsulta {
  pendiente: boolean;
  error: boolean;
  cantidad: number;
}

export type VistaReciente = "cargando" | "oculta" | "lista";

export function vistaReciente(...consultas: EstadoConsulta[]): VistaReciente {
  if (consultas.some((c) => c.pendiente)) return "cargando";
  return consultas.some((c) => !c.error && c.cantidad > 0) ? "lista" : "oculta";
}
