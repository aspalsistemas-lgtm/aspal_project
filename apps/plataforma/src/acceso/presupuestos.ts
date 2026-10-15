/**
 * Presupuestos de envío de correo (plan del corte 3, CA-24).
 *
 * Cada tipo de correo tiene **sus propios** contadores (registro, recuperación, aviso,
 * invitación): agotar uno nunca impide los demás. Hay tres cupos por tipo —por
 * destinatario (correo normalizado), por origen y diario de la asociación— y, para las
 * invitaciones, uno por administrador. Reutilizan `limite_uso` y su reserva atómica.
 *
 * Una solicitud nueva **no invalida** los enlaces ya enviados: el presupuesto solo
 * frena el *envío* (evita que alguien llene el buzón de una víctima o gaste el cupo
 * de la asociación sin dejar a la víctima sin su enlace vigente).
 *
 * Orden fijo origen → destinatario → día, y se corta en el primero que bloquea: un
 * origen ya bloqueado no crea filas por cada correo nuevo.
 */
import type { BaseDeAsociacion } from "../base-de-datos.js";
import { claveHmac, correoParaLimite } from "./claves.js";
import {
  reservarIntento,
  type PoliticaLimite,
  type ResultadoReserva,
} from "./limites.js";

export type TipoEnvio = "registro" | "recuperacion" | "aviso";

const HORA = 3600;
const DIA = 86_400;

/** Un cupo de `limite` envíos por ventana; al pasarse, espera una ventana entera. */
const cupo = (limite: number, ventanaSegundos: number): PoliticaLimite => ({
  limite,
  ventanaSegundos,
  esperasSegundos: [ventanaSegundos],
});

export interface PresupuestoDeTipo {
  destinatario: PoliticaLimite;
  origen: PoliticaLimite;
  dia: PoliticaLimite;
}

export const PRESUPUESTOS: Record<TipoEnvio, PresupuestoDeTipo> = {
  // 1 por hora por destinatario, 10 por hora por origen, 500 al día por asociación.
  registro: { destinatario: cupo(1, HORA), origen: cupo(10, HORA), dia: cupo(500, DIA) },
  // Quien olvidó la contraseña puede reintentar (el correo pudo perderse).
  recuperacion: {
    destinatario: cupo(3, HORA),
    origen: cupo(10, HORA),
    dia: cupo(500, DIA),
  },
  // Avisos (cuenta ya existente, contraseña cambiada): los más baratos de abusar.
  aviso: { destinatario: cupo(1, HORA), origen: cupo(10, HORA), dia: cupo(500, DIA) },
};

/** Invitaciones: 20 al día por administrador y 500 al día por asociación. */
export const PRESUPUESTO_INVITACIONES = {
  administrador: cupo(20, DIA),
  dia: cupo(500, DIA),
};

export interface DatosEnvio {
  tipo: TipoEnvio;
  /** Correo al que se enviaría (cualquier forma: se normaliza para el cupo). */
  destinatario: string;
  /** Origen de la petición, ya reducido por `claveDeOrigen`. */
  origen: string;
}

/**
 * Cuenta el envío y dice si puede hacerse. Debe llamarse en una transacción corta y
 * propia, confirmada antes de enviar: dentro de una transacción que luego falla se
 * perdería el conteo.
 */
export async function reservarEnvio(
  base: BaseDeAsociacion,
  secreto: string,
  { tipo, destinatario, origen }: DatosEnvio,
  presupuesto: PresupuestoDeTipo = PRESUPUESTOS[tipo],
): Promise<boolean> {
  const porOrigen = await reservarIntento(
    base,
    claveHmac(secreto, `envio:${tipo}:origen`, origen),
    presupuesto.origen,
  );
  if (!porOrigen.permitido) return false;
  const porDestinatario = await reservarIntento(
    base,
    claveHmac(secreto, `envio:${tipo}:destinatario`, correoParaLimite(destinatario)),
    presupuesto.destinatario,
  );
  if (!porDestinatario.permitido) return false;
  const porDia = await reservarIntento(
    base,
    claveHmac(secreto, `envio:${tipo}:dia`, "asociacion"),
    presupuesto.dia,
  );
  return porDia.permitido;
}

/**
 * Cupo diario de invitaciones de un administrador (y el de la asociación). Devuelve la
 * espera para que la ruta responda `429` con `Retry-After`.
 */
export async function reservarInvitacion(
  base: BaseDeAsociacion,
  secreto: string,
  personaInvitadora: string,
  presupuesto = PRESUPUESTO_INVITACIONES,
): Promise<ResultadoReserva> {
  const propio = await reservarIntento(
    base,
    claveHmac(secreto, "envio:invitacion:administrador", personaInvitadora),
    presupuesto.administrador,
  );
  if (!propio.permitido) return propio;
  return reservarIntento(
    base,
    claveHmac(secreto, "envio:invitacion:dia", "asociacion"),
    presupuesto.dia,
  );
}
