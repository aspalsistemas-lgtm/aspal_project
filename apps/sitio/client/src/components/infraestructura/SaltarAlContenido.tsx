/**
 * Primer elemento enfocable de cada página (RF-14): con Tab, salta el header y
 * el menú de cinco rubros. Invisible hasta recibir el foco. `#contenido` es el
 * `<main>` de cada página, con tabIndex={-1} para que reciba el foco.
 */
export function SaltarAlContenido() {
  return (
    <a
      href="#contenido"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      data-testid="link-saltar-contenido"
    >
      Saltar al contenido
    </a>
  );
}
