/**
 * Tipos de la suscripción al boletín. Puros: los importan el cliente (para
 * validar antes de enviar) y el servidor (para validar lo que llega).
 */

/** Desde dónde se suscribe la persona. Se guarda como etiqueta en Mailchimp. */
export const ORIGENES = ["unete", "home", "footer", "eventos"] as const;
export type OrigenSuscripcion = (typeof ORIGENES)[number];

/** Países del selector (§6.6 del plan): LATAM, España, Portugal y «Otro». */
export const PAISES: readonly string[] = [
  "Argentina",
  "Bolivia",
  "Brasil",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Ecuador",
  "El Salvador",
  "España",
  "Guatemala",
  "Honduras",
  "México",
  "Nicaragua",
  "Panamá",
  "Paraguay",
  "Perú",
  "Portugal",
  "Puerto Rico",
  "República Dominicana",
  "Uruguay",
  "Venezuela",
  "Otro",
];

/** Campo oculto que solo rellenan los bots. */
export const CAMPO_TRAMPA = "sitioWeb";

export type CampoSuscripcion =
  "correo" | "nombre" | "pais" | "organizacion" | "cargo" | "consentimiento" | "origen";

export type ErroresSuscripcion = Partial<Record<CampoSuscripcion, string>>;

export interface SuscripcionValida {
  correo: string;
  nombre?: string;
  pais?: string;
  organizacion?: string;
  cargo?: string;
  origen: OrigenSuscripcion;
}

export type ResultadoValidacion =
  { ok: true; datos: SuscripcionValida } | { ok: false; errores: ErroresSuscripcion };
