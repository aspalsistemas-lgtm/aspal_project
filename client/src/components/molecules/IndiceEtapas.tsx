import { ETAPAS } from "@/content/institucional/mapa-ruta";
import { useAnimarAlVer } from "@/hooks/use-animar-al-ver";
import { registrarEvento } from "@/lib/analitica";
import { HEXAGONO_PUNTA } from "@/lib/clases";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

/**
 * Las 7 etapas del Mapa de Ruta como paso a paso, en la home: insignia
 * hexagonal con icono y una línea que une las etapas (desde `xl`, cuando caben
 * en una fila); cada una lleva a su etapa en /mapa-de-ruta.
 *
 * La primera vez que entra en pantalla la línea se traza de la etapa 1 a la 7
 * y las insignias se activan en secuencia (useAnimarAlVer: solo transform,
 * nada en el prerender ni con «reducir movimiento»).
 */
export function IndiceEtapas() {
  const { ref, estado } = useAnimarAlVer<HTMLOListElement>();

  return (
    <ol
      ref={ref}
      className={cn(
        "group/ruta relative grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7",
        // Línea del camino, detrás de las insignias: solo cuando es una fila.
        // top-10 = p-2 del enlace (8 px) + media insignia (32 px). Se traza
        // desde la izquierda (origin-left) al entrar en pantalla.
        "xl:before:absolute xl:before:left-[7%] xl:before:right-[7%] xl:before:top-10 xl:before:h-0.5 xl:before:origin-left xl:before:bg-secondary xl:before:content-['']",
        "data-[anim=esperando]:before:scale-x-0 data-[anim=activa]:before:animate-trazo",
      )}
      data-anim={estado}
      data-testid="indice-etapas-home"
    >
      {ETAPAS.map((etapa, i) => {
        const Icono = etapa.icono;
        const primera = etapa.numero === 1;
        return (
          <li key={etapa.id} className="relative">
            <Link
              href={`/mapa-de-ruta#${etapa.id}`}
              className="group flex min-h-11 flex-col items-center rounded-2xl p-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() =>
                registrarEvento("click_mapa_ruta", {
                  origen: "home_etapa",
                  etapa: etapa.numero,
                })
              }
              data-testid={`etapa-home-${etapa.numero}`}
            >
              <span
                className={cn(
                  "flex h-16 w-14 items-center justify-center transition-colors",
                  "group-data-[anim=esperando]/ruta:scale-75 group-data-[anim=activa]/ruta:animate-insignia",
                  HEXAGONO_PUNTA,
                  primera
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-noche text-noche-foreground group-hover:bg-primary",
                )}
                style={{ animationDelay: `${150 + i * 180}ms` }}
                aria-hidden="true"
              >
                <Icono className="h-6 w-6" />
              </span>
              <span className="mt-3 text-sm font-semibold uppercase tracking-wider text-primary">
                Etapa {etapa.numero}
              </span>
              <span className="mt-1 hyphens-auto break-words text-base font-bold text-foreground">
                {etapa.nombre}
              </span>
              {primera && (
                <span className="mt-2 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Empieza aquí
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
