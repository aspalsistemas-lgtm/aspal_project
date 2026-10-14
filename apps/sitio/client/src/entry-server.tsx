/**
 * Entrada del build de prerender (`vite build --ssr`). Solo corre en el build,
 * nunca en el navegador: `scripts/prerender.mjs` la importa ya empaquetada desde
 * `dist/ssr/` y escribe un HTML por ruta.
 *
 * `ssrPath` hace que wouter resuelva la ruta sin `window.location`. El resto de
 * la app ya es seguro en el servidor: todo acceso a `window` y `document` vive
 * en efectos o manejadores.
 */
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import App from "./App";

export { RUTAS_ESTATICAS } from "./lib/rutas";
export { etiquetasHead, generarRobots, generarSitemap } from "./lib/seo";

export function renderizar(ruta: string): string {
  return renderToString(
    <Router ssrPath={ruta}>
      <App />
    </Router>,
  );
}
