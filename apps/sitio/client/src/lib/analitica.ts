/**
 * Eventos de analítica del sitio (RF-12 del plan de la Etapa 1).
 *
 * Solo empuja a `window.dataLayer`. El contenedor de GTM llega en la Etapa 0 y
 * lo recoge desde ahí; mientras no exista, los eventos se acumulan sin efecto.
 * La lista de eventos es cerrada a propósito: un nombre mal escrito no compila,
 * en lugar de aparecer en GA4 como un evento fantasma.
 */

export type EventoAnalitica =
  | "click_unete"
  | "signup_suscriptor"
  | "download_dossier"
  | "click_mapa_ruta"
  | "click_menu"
  | "salida_plataforma"
  | "error_404";

export type DatosEvento = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function registrarEvento(evento: EventoAnalitica, datos: DatosEvento = {}): void {
  // Sin `window` (tests en node, prerender) no hay nada que medir.
  if (typeof window === "undefined") return;
  // /componentes es un catálogo interno: sus clics (demos, cabecera y pie de la
  // página) ensuciarían GA4 como si vinieran de la home.
  if (window.location?.pathname === "/componentes") return;
  window.dataLayer ??= [];
  window.dataLayer.push({ ...datos, event: evento });
}
