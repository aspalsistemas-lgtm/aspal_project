import { useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};
const enCliente = () => true;
const enServidor = () => false;

/**
 * ¿Estamos ya en el navegador?
 *
 * `false` en el prerender y también durante la hidratación (`main.tsx` usa
 * hydrateRoot cuando el HTML trae contenido), así que el primer render del
 * cliente coincide con el HTML prerenderizado; justo después React vuelve a
 * renderizar con `true`. En una navegación dentro de la SPA ya es `true` desde
 * el primer render.
 *
 * Para lo que solo tiene sentido en el cliente: estados de carga de consultas
 * que no corren en el servidor, datos del navegador. Sin setState en un efecto.
 */
export function useEnCliente(): boolean {
  return useSyncExternalStore(sinSuscripcion, enCliente, enServidor);
}
