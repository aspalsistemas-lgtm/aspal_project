import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const raiz = document.getElementById("root")!;

// Las rutas estáticas y el 404 llegan prerenderizadas (scripts/prerender.mjs):
// se hidratan, así React reutiliza el HTML que ya está en pantalla en vez de
// tirarlo y volver a pintarlo. `spa.html` (artículos del blog) llega con el
// #root vacío: ahí no hay nada que hidratar y se monta desde cero.
if (raiz.firstElementChild) {
  hydrateRoot(raiz, <App />, {
    // Si el cliente no genera el mismo HTML que el prerender, React descarta
    // ese tramo y lo pinta de nuevo: la página sigue bien, pero se pierde la
    // ventaja de hidratar. Se avisa en la consola para poder encontrarlo.
    onRecoverableError: (error) => console.error("[hidratación]", error),
  });
} else {
  createRoot(raiz).render(<App />);
}
