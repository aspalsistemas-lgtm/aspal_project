/**
 * Bandeja de correo para los tests: un servicio de correo real (con su cola) cuyo
 * transporte guarda los mensajes en memoria en vez de enviarlos.
 */
import {
  crearServicioCorreo,
  type MensajeCorreo,
  type OpcionesServicioCorreo,
  type ServicioCorreo,
} from "../correo/servicio.js";

export interface BandejaDePrueba {
  servicio: ServicioCorreo;
  mensajes: MensajeCorreo[];
}

export function crearBandejaDePrueba(
  opciones: Partial<OpcionesServicioCorreo> = {},
): BandejaDePrueba {
  const mensajes: MensajeCorreo[] = [];
  const servicio = crearServicioCorreo({
    transporte: async ({ para, asunto, texto }) => {
      mensajes.push({ para, asunto, texto });
    },
    remitente: "no-responder@prueba.localhost",
    ...opciones,
  });
  return { servicio, mensajes };
}

/** El token de un enlace de la forma `…#token` dentro del texto de un correo. */
export function tokenDelCorreo(mensaje: MensajeCorreo): string {
  const coincidencia = /#([A-Za-z0-9_-]{43})\b/.exec(mensaje.texto);
  if (!coincidencia) throw new Error("el correo no lleva un enlace con token");
  return coincidencia[1]!;
}
