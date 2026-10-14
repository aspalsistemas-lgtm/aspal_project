import { ETAPAS } from "@/content/institucional/mapa-ruta";
import { HEXAGONO_PUNTA } from "@/lib/clases";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

/**
 * Número de la etapa que cruza la mitad de la pantalla (0 si ninguna). Sin
 * IntersectionObserver (prerender, navegadores antiguos) se queda en 0: la
 * barra funciona igual como índice, solo sin resaltar.
 */
function useEtapaActiva(): number {
  const [activa, setActiva] = useState(0);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setActiva(Number(entrada.target.id.replace("etapa-", "")));
          }
        }
      },
      // Una franja fina a media pantalla: activa la etapa que la cruza.
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const etapa of ETAPAS) {
      const el = document.getElementById(etapa.id);
      if (el) observador.observe(el);
    }
    return () => observador.disconnect();
  }, []);
  return activa;
}

/**
 * Barra fija bajo el header mientras se recorren las etapas de /mapa-de-ruta:
 * la etapa actual con su nombre (desde md) y los 7 hexágonos numerados, unidos
 * por una línea que se rellena hasta la etapa en que estás. La actual va en
 * miel y con `aria-current="step"`; las ya vistas, en noche.
 *
 * Es `sticky`: solo se fija dentro de su contenedor, así que va en el mismo
 * bloque que las SeccionEtapa, no antes del índice.
 */
export function NavEtapas() {
  const activa = useEtapaActiva();
  const actual = ETAPAS.find((etapa) => etapa.numero === activa);
  const progreso = activa > 1 ? (activa - 1) / (ETAPAS.length - 1) : 0;

  return (
    <nav
      aria-label="Progreso en el mapa"
      className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur"
      data-testid="nav-etapas"
    >
      <div className="container mx-auto flex max-w-7xl items-center gap-4 px-4 py-2 md:px-8">
        <p className="hidden min-w-0 flex-1 truncate text-sm md:block" aria-live="polite">
          {actual ? (
            <>
              <span className="font-semibold text-miel-texto">Etapa {actual.numero}</span>
              <span className="text-muted-foreground"> · </span>
              <span className="font-semibold text-foreground">{actual.nombre}</span>
            </>
          ) : (
            <span className="text-muted-foreground">
              Recorre el mapa de principio a fin
            </span>
          )}
        </p>
        <ol className="relative mx-auto flex items-center gap-2 sm:gap-4 md:mx-0">
          {/* Línea de fondo y su relleno hasta la etapa activa. */}
          <span
            className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 bg-border"
            aria-hidden="true"
          />
          <span
            className="absolute left-4 top-1/2 h-0.5 -translate-y-1/2 bg-secondary transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `calc((100% - 2rem) * ${progreso})` }}
            aria-hidden="true"
          />
          {ETAPAS.map((etapa) => {
            const estado =
              etapa.numero === activa
                ? "actual"
                : etapa.numero < activa
                  ? "hecha"
                  : "pendiente";
            return (
              <li key={etapa.id} className="relative">
                <a
                  href={`#${etapa.id}`}
                  aria-label={`Etapa ${etapa.numero}: ${etapa.nombre}`}
                  aria-current={estado === "actual" ? "step" : undefined}
                  className={cn(
                    "flex h-10 w-9 items-center justify-center text-sm font-bold transition-[background-color,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                    HEXAGONO_PUNTA,
                    estado === "actual" &&
                      "scale-110 bg-secondary text-secondary-foreground",
                    estado === "hecha" && "bg-noche text-noche-foreground",
                    estado === "pendiente" &&
                      "bg-accent text-accent-foreground hover:bg-secondary",
                  )}
                  data-testid={`nav-etapa-${etapa.numero}`}
                >
                  {etapa.numero}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
