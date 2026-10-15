/**
 * Transporte SMTP con `nodemailer` (el único archivo que lo importa). Tiempos máximos
 * cortos: un servidor de correo colgado no retiene conexiones ni memoria.
 */
import { createTransport } from "nodemailer";
import type { ConfiguracionCorreo } from "../configuracion.js";
import type { Transporte } from "./servicio.js";

export function crearTransporteSmtp(
  configuracion: ConfiguracionCorreo,
  { exigirTls }: { exigirTls: boolean },
): Transporte {
  const transportador = createTransport({
    host: configuracion.host,
    port: configuracion.puerto,
    secure: configuracion.seguro,
    // En producción nunca se envía en claro, aunque el servidor no ofrezca STARTTLS.
    requireTLS: exigirTls && !configuracion.seguro,
    ...(configuracion.usuario && configuracion.clave
      ? { auth: { user: configuracion.usuario, pass: configuracion.clave } }
      : {}),
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10_000,
  });
  return async ({ de, para, asunto, texto }) => {
    await transportador.sendMail({ from: de, to: para, subject: asunto, text: texto });
  };
}

/** Correo desactivado (desarrollo sin SMTP): acepta y descarta. */
export const transporteDescartado: Transporte = async () => {};
