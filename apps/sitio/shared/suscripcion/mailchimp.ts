/**
 * Alta en la audiencia de Mailchimp (decisión D8 del plan de la Etapa 1).
 *
 * MÓDULO SOLO-SERVIDOR: lee `process.env`. El cliente React no debe
 * importarlo; usa `/api/suscripcion`.
 *
 * No guarda nada: el dato vive solo en Mailchimp. El alta es un POST de solo
 * creación con `status: "pending"`: a quien es nuevo, Mailchimp le envía la
 * doble confirmación. Los existentes (suscritos, pendientes, dados de baja u
 * olvidados por RGPD) reciben la misma respuesta y no se modifican, así que
 * nadie puede reescribir los datos de otro miembro ni averiguar quién está
 * en la lista.
 *
 * La audiencia necesita tres campos de texto además de FNAME: PAIS, ORG y
 * CARGO (ver docs/architecture.md).
 */
import { createHash } from "node:crypto";
import type { SuscripcionValida } from "./tipos.js";

/** Cada llamada tiene 4 s (peor caso 8 s, dentro de los 10 s de Vercel). */
const TIEMPO_MAXIMO_MS = 4000;

export class SuscripcionNoConfigurada extends Error {
  constructor(motivo = "Faltan MAILCHIMP_API_KEY o MAILCHIMP_AUDIENCE_ID") {
    super(motivo);
    this.name = "SuscripcionNoConfigurada";
  }
}

export class ErrorProveedor extends Error {
  constructor(
    public estado: number,
    operacion: string,
  ) {
    // Sin datos personales en el mensaje: acaba en los logs.
    super(`Mailchimp respondió ${estado} al ${operacion}`);
    this.name = "ErrorProveedor";
  }
}

function configuracion() {
  const clave = process.env.MAILCHIMP_API_KEY;
  const audiencia = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!clave || !audiencia) throw new SuscripcionNoConfigurada();
  // La clave termina en el centro de datos de la cuenta: "…-us21".
  const centro = clave.split("-")[1];
  if (!centro)
    throw new SuscripcionNoConfigurada(
      "La clave de Mailchimp no indica su centro de datos",
    );
  return {
    base: `https://${centro}.api.mailchimp.com/3.0/lists/${audiencia}`,
    cabeceras: {
      Authorization: `Basic ${Buffer.from(`aspal:${clave}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
  };
}

/** Mailchimp identifica al miembro por el MD5 de su correo en minúsculas. */
export function hashSuscriptor(correo: string): string {
  return createHash("md5").update(correo.toLowerCase()).digest("hex");
}

function camposFusion(datos: SuscripcionValida): Record<string, string> {
  const campos: Record<string, string> = {};
  if (datos.nombre) campos.FNAME = datos.nombre;
  if (datos.pais) campos.PAIS = datos.pais;
  if (datos.organizacion) campos.ORG = datos.organizacion;
  if (datos.cargo) campos.CARGO = datos.cargo;
  return campos;
}

/** Llama a Mailchimp con timeout y traduce los fallos de red a `ErrorProveedor`. */
async function llamar(
  url: string,
  init: RequestInit,
  operacion: string,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ErrorProveedor(504, operacion);
    }
    if (error instanceof TypeError) {
      throw new ErrorProveedor(502, operacion);
    }
    throw error;
  }
}

/** Títulos con los que Mailchimp rechaza un alta de alguien que ya consta. */
const YA_REGISTRADO = ["Member Exists", "Forgotten Email Not Subscribed"];

async function tituloDelError(respuesta: Response): Promise<string | undefined> {
  try {
    const cuerpo = (await respuesta.json()) as { title?: unknown };
    return typeof cuerpo.title === "string" ? cuerpo.title : undefined;
  } catch {
    return undefined;
  }
}

export async function suscribir(datos: SuscripcionValida): Promise<void> {
  const { base, cabeceras } = configuracion();

  const alta = await llamar(
    `${base}/members`,
    {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify({
        email_address: datos.correo,
        status: "pending",
        merge_fields: camposFusion(datos),
      }),
    },
    "registrar el miembro",
  );

  if (!alta.ok) {
    const titulo = alta.status === 400 ? await tituloDelError(alta) : undefined;
    if (titulo && YA_REGISTRADO.includes(titulo)) return;
    await alta.body?.cancel().catch(() => {});
    throw new ErrorProveedor(alta.status, "registrar el miembro");
  }

  // El alta ya ocurrió: si el etiquetado falla, no se le devuelve un error a
  // quien se suscribió (reintentar toparía con "Member Exists").
  try {
    const etiqueta = await llamar(
      `${base}/members/${hashSuscriptor(datos.correo)}/tags`,
      {
        method: "POST",
        headers: cabeceras,
        body: JSON.stringify({
          tags: [{ name: `origen:${datos.origen}`, status: "active" }],
        }),
      },
      "etiquetar el miembro",
    );
    if (!etiqueta.ok) {
      await etiqueta.body?.cancel().catch(() => {});
      console.error(`Suscripción: no se pudo etiquetar (estado ${etiqueta.status})`);
    }
  } catch (error) {
    console.error(
      "Suscripción: no se pudo etiquetar:",
      error instanceof ErrorProveedor ? `estado ${error.estado}` : "desconocido",
    );
  }
}
