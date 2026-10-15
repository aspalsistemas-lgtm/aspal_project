/**
 * Plantillas de correo (plan del corte 3, CA-22). **Sin campos libres de quien
 * solicita**: solo el nombre de la asociación (dato propio, no del solicitante), un
 * enlace que construye el servidor y texto fijo. Así el correo no sirve para mandar
 * mensajes a una víctima ni para suplantar a la asociación.
 */
import type { MensajeCorreo } from "./servicio.js";

export interface DatosPlantilla {
  /** Nombre de la asociación. */
  asociacion: string;
  para: string;
}

/** El nombre va en el asunto: sin saltos de línea ni espacios raros. */
function nombreSeguro(nombre: string): string {
  return nombre.replace(/\s+/g, " ").trim().slice(0, 120);
}

function mensaje(
  { asociacion, para }: DatosPlantilla,
  asunto: string,
  cuerpo: string,
): MensajeCorreo {
  const nombre = nombreSeguro(asociacion);
  return {
    para,
    asunto: `${asunto} · ${nombre}`,
    texto: `${cuerpo}\n\n${nombre}\n`,
  };
}

export function plantillaRegistro(datos: DatosPlantilla, enlace: string): MensajeCorreo {
  return mensaje(
    datos,
    "Confirma tu correo",
    [
      "Recibimos una solicitud para crear una cuenta con este correo.",
      "Para continuar, abre este enlace (vale 24 horas y se usa una sola vez):",
      enlace,
      "Si no fuiste tú, ignora este mensaje: no se crea ninguna cuenta.",
    ].join("\n\n"),
  );
}

export function plantillaCuentaExistente(
  datos: DatosPlantilla,
  enlaceRecuperacion: string,
): MensajeCorreo {
  return mensaje(
    datos,
    "Ya tienes una cuenta",
    [
      "Alguien intentó crear una cuenta con este correo, pero ya existe una.",
      "Si olvidaste tu contraseña, puedes restablecerla aquí:",
      enlaceRecuperacion,
      "Si no fuiste tú, ignora este mensaje.",
    ].join("\n\n"),
  );
}

export function plantillaRecuperacion(
  datos: DatosPlantilla,
  enlace: string,
): MensajeCorreo {
  return mensaje(
    datos,
    "Restablece tu contraseña",
    [
      "Recibimos una solicitud para restablecer la contraseña de tu cuenta.",
      "Abre este enlace (vale 1 hora y se usa una sola vez):",
      enlace,
      "Si no fuiste tú, ignora este mensaje: tu contraseña no cambia.",
    ].join("\n\n"),
  );
}

export function plantillaContrasenaCambiada(datos: DatosPlantilla): MensajeCorreo {
  return mensaje(
    datos,
    "Tu contraseña cambió",
    [
      "La contraseña de tu cuenta se acaba de cambiar y se cerraron todas tus sesiones.",
      "Si no fuiste tú, restablécela de inmediato desde la opción «Olvidé mi contraseña».",
    ].join("\n\n"),
  );
}

export function plantillaInvitacion(
  datos: DatosPlantilla,
  enlace: string,
): MensajeCorreo {
  return mensaje(
    datos,
    "Te invitaron a unirte",
    [
      "Un administrador te invitó a crear tu cuenta.",
      "Acepta la invitación con este enlace (vale 7 días y se usa una sola vez):",
      enlace,
      "Si no esperabas esta invitación, ignora este mensaje.",
    ].join("\n\n"),
  );
}
