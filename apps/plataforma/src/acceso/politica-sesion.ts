/**
 * Cuánto dura una sesión (plan del corte 3, CA-8 y §7).
 *
 * - Miembro y representante: 8 h de inactividad y 7 días como máximo.
 * - Administrador y gestor: 2 h de inactividad y 12 h como máximo.
 *
 * Se evalúa con los roles **actuales** de la persona, no con los que tenía al entrar:
 * un miembro ascendido a administrador no conserva su sesión de 7 días.
 */
import { tienePrivilegios } from "./rol.js";

export interface DuracionesSesion {
  inactividadSegundos: number;
  absolutaSegundos: number;
}

const HORA = 3600;
const DIA = 24 * HORA;

const LARGA: DuracionesSesion = {
  inactividadSegundos: 8 * HORA,
  absolutaSegundos: 7 * DIA,
};
const CORTA: DuracionesSesion = {
  inactividadSegundos: 2 * HORA,
  absolutaSegundos: 12 * HORA,
};

/** Sesiones vivas por cuenta: al pasar de aquí, se revoca la más antigua. */
export const MAXIMO_SESIONES_POR_CUENTA = 10;

/** `ultimo_uso_en` se actualiza como máximo cada tanto: leer no escribe en cada petición. */
export const INTERVALO_ACTUALIZAR_USO_SEGUNDOS = 300;

export function duracionesPara(roles: readonly string[]): DuracionesSesion {
  return tienePrivilegios(roles) ? CORTA : LARGA;
}

/** Los tiempos transcurridos los mide la base de datos (un solo reloj). */
export interface MedidasSesion {
  /** Segundos desde el último uso. */
  inactivaSegundos: number;
  /** Segundos desde que se creó. */
  antiguedadSegundos: number;
}

export function sesionVigente(medidas: MedidasSesion, roles: readonly string[]): boolean {
  const { inactividadSegundos, absolutaSegundos } = duracionesPara(roles);
  return (
    medidas.inactivaSegundos <= inactividadSegundos &&
    medidas.antiguedadSegundos <= absolutaSegundos
  );
}
