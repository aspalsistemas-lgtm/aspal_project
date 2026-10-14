/**
 * Identidad de ASPAL en un solo lugar: nombre visible, contacto y redes.
 *
 * El nombre es la decisión D5 del plan de la Etapa 1, todavía abierta. Aquí va
 * la recomendación; si cambia, se edita `NOMBRE_COMPLETO` y el `<title>` de
 * `client/index.html` (el test de este módulo avisa si se queda atrás).
 */

import { Facebook, Instagram, Linkedin, Twitter, type LucideIcon } from "lucide-react";

export const NOMBRE_CORTO = "ASPAL";
export const NOMBRE_COMPLETO = "Asociaciones Profesionales de Latinoamérica";
export const NOMBRE_MARCA = `${NOMBRE_CORTO} — ${NOMBRE_COMPLETO}`;
// Es el `<title>` por defecto del sitio.
export const TITULO_SITIO = `${NOMBRE_CORTO} · ${NOMBRE_COMPLETO}`;

/**
 * Dominio canónico. El apex (sin www) responde 307 hacia aquí, así que
 * canonical, Open Graph y sitemap apuntan a este y no a una redirección.
 */
export const URL_SITIO = "https://www.asociacionesprofesionales.org";

/**
 * Aviso de privacidad: se reutiliza la política de la comunidad en WordPress
 * (decisión del 2026-10-14, plan de la Etapa 0 §9). PENDIENTE del responsable:
 * no menciona el boletín ni Mailchimp, Google ni Stripe; hay que completarla.
 */
export const URL_AVISO_PRIVACIDAD =
  "https://comunidad.asociacionesprofesionales.org/politica-privacidad/";

export const CONTACTO = {
  correo: "vinculacion@asociacionesprofesionales.org",
  telefono: "+52 999 163 4080",
  ciudad: "Mérida, Yucatán",
} as const;

export interface RedSocial {
  nombre: string;
  icono: LucideIcon;
  href: string;
  testid: string;
}

// PENDIENTE: YouTube (plan de la Etapa 1, §6.7). Falta la URL oficial del
// canal y no se inventa.
export const REDES: RedSocial[] = [
  {
    nombre: "Facebook",
    icono: Facebook,
    href: "https://www.facebook.com/asociacionesprofesionales",
    testid: "button-social-facebook",
  },
  {
    nombre: "X",
    icono: Twitter,
    href: "https://x.com/ASPALATAM",
    testid: "button-social-twitter",
  },
  {
    nombre: "LinkedIn",
    icono: Linkedin,
    // Sin `?viewAsMember=true`: ese parámetro se cuela al copiar la URL desde
    // una sesión iniciada y no pinta nada en un enlace público.
    href: "https://www.linkedin.com/company/asociaciones-profesionales-aspal/",
    testid: "button-social-linkedin",
  },
  {
    nombre: "Instagram",
    icono: Instagram,
    href: "https://www.instagram.com/aspalatam/",
    testid: "button-social-instagram",
  },
];

/** Dónde escuchar el podcast Conexión Profesional (hero de /podcast). */
export const PODCAST_PLATAFORMAS = [
  {
    nombre: "Apple Podcasts",
    href: "https://podcasts.apple.com/mx/podcast/conexi%C3%B3n-profesional/id1739853485",
    testid: "button-apple-podcasts",
  },
  {
    nombre: "Spotify",
    href: "https://open.spotify.com/show/38oaCe96wmhex6FPGwluxu",
    testid: "button-spotify",
  },
] as const;
