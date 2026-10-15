/**
 * Dependencias falsas para los tests unitarios de la aplicación: sin red ni base.
 * Cada test sustituye solo la que le importa.
 */
import type { Dependencias } from "../app.js";

export function dependenciasDePrueba(
  parciales: Partial<Dependencias> = {},
): Dependencias {
  return {
    comprobarBaseDeDatos: async () => true,
    dominioBase: "localhost",
    resolverAsociacion: async () => null,
    enAsociacion: async () => {
      throw new Error("enAsociacion no configurada en este test");
    },
    ...parciales,
  };
}
