/**
 * Dependencias falsas para los tests unitarios de la aplicación: sin red ni base.
 * Cada test sustituye solo la que le importa. Los límites son holgados para que no
 * interfieran con los tests que no hablan de ellos.
 */
import { crearServicioContrasenas } from "../acceso/contrasenas.js";
import type { Dependencias } from "../app.js";

export function dependenciasDePrueba(
  parciales: Partial<Dependencias> = {},
): Dependencias {
  return {
    comprobarBaseDeDatos: async () => true,
    dominioBase: "localhost",
    esquemaPublico: "http",
    puertoPublico: undefined,
    trustProxy: 0,
    limiteGrueso: { publica: 100_000, autenticada: 100_000, ventanaMs: 60_000 },
    secretoClaves: "secreto-de-prueba-con-mas-de-32-caracteres",
    // Parámetros baratos: las pruebas no necesitan el coste de producción.
    contrasenas: crearServicioContrasenas({ parametros: { N: 2 ** 14, r: 8, p: 1 } }),
    probabilidadLimpieza: 0,
    resolverAsociacion: async () => null,
    enAsociacion: async () => {
      throw new Error("enAsociacion no configurada en este test");
    },
    ...parciales,
  };
}
