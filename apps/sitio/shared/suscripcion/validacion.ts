/**
 * Validación única de la suscripción: la misma en el navegador (para avisar
 * antes de enviar) y en el servidor (que nunca confía en el navegador).
 */
import {
  CAMPO_TRAMPA,
  ORIGENES,
  PAISES,
  type ErroresSuscripcion,
  type OrigenSuscripcion,
  type ResultadoValidacion,
  type SuscripcionValida,
} from "./tipos.js";

/** Suficiente para descartar erratas evidentes; la verdad la da la doble confirmación. */
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const LARGO_MAXIMO = { nombre: 100, organizacion: 150, cargo: 100 } as const;

function texto(valor: unknown, maximo: number): string | undefined {
  if (typeof valor !== "string") return undefined;
  const limpio = valor
    // Los de control (tabulador, saltos…) separan palabras; los de dirección se quitan.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  return limpio ? limpio.slice(0, maximo) : undefined;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export function esTrampa(entrada: unknown): boolean {
  return esObjeto(entrada) && Boolean(texto(entrada[CAMPO_TRAMPA], 500));
}

export function validarSuscripcion(entrada: unknown): ResultadoValidacion {
  const e = esObjeto(entrada) ? entrada : {};
  const errores: ErroresSuscripcion = {};

  const origen = (ORIGENES as readonly unknown[]).includes(e.origen)
    ? (e.origen as OrigenSuscripcion)
    : undefined;
  if (!origen) errores.origen = "Origen no válido.";

  const correo = typeof e.correo === "string" ? e.correo.trim().toLowerCase() : "";
  if (!correo) errores.correo = "Escribe tu correo.";
  else if (correo.length > 254) errores.correo = "Ese correo no parece válido.";
  // eslint-disable-next-line no-control-regex
  else if (/[\x00-\x1f\x7f]/.test(correo))
    errores.correo = "Ese correo no parece válido.";
  else if (!CORREO.test(correo)) errores.correo = "Ese correo no parece válido.";

  const nombre = texto(e.nombre, LARGO_MAXIMO.nombre);
  const pais = texto(e.pais, 60);
  if (pais && !PAISES.includes(pais)) errores.pais = "Elige un país de la lista.";

  // /unete es el alta completa: ahí nombre y país son obligatorios.
  if (origen === "unete") {
    if (!nombre) errores.nombre = "Escribe tu nombre.";
    if (!pais) errores.pais = errores.pais ?? "Elige tu país.";
  }

  // La comparación estricta con el booleano también protege frente a envíos
  // entre sitios (un formulario HTML manda "true" como texto): no relajarla.
  if (e.consentimiento !== true) {
    errores.consentimiento = "Necesitamos tu autorización para escribirte.";
  }

  if (Object.keys(errores).length > 0 || !origen) return { ok: false, errores };

  const datos: SuscripcionValida = { correo, origen };
  if (nombre) datos.nombre = nombre;
  if (pais) datos.pais = pais;
  const organizacion = texto(e.organizacion, LARGO_MAXIMO.organizacion);
  if (organizacion) datos.organizacion = organizacion;
  const cargo = texto(e.cargo, LARGO_MAXIMO.cargo);
  if (cargo) datos.cargo = cargo;
  return { ok: true, datos };
}
