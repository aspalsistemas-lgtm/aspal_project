import { PILARES } from "@/content/institucional/pilares";
import { HEXAGONO_PUNTA } from "@/lib/clases";
import { cn } from "@/lib/utils";
import { ArrowDown } from "lucide-react";

/**
 * Los 4 pilares de un vistazo, cada uno con un salto a su sección en la misma
 * página (`#id` de SeccionPilar). Va bajo el hero de ¿Qué hacemos?: en móvil
 * hace de índice, porque el racimo del hero no se pinta.
 */
export function IndicePilares() {
  return (
    <nav aria-label="Los 4 pilares" data-testid="indice-pilares">
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILARES.map((pilar, i) => {
          const Icono = pilar.icono;
          return (
            <li key={pilar.id}>
              <a
                href={`#${pilar.id}`}
                className="group flex h-full items-start gap-4 rounded-2xl border border-border bg-background p-5 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid={`indice-pilar-${pilar.id}`}
              >
                <span
                  className={cn(
                    "flex h-14 w-12 shrink-0 items-center justify-center bg-noche text-noche-foreground",
                    HEXAGONO_PUNTA,
                  )}
                  aria-hidden="true"
                >
                  <Icono className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-miel-texto">
                    Pilar {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-0.5 block text-xl font-bold text-foreground">
                    {pilar.nombre}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {pilar.subtitulo}
                  </span>
                </span>
                <ArrowDown
                  className="mt-1 h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-hover:translate-y-1 group-focus-visible:translate-y-1"
                  aria-hidden="true"
                />
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
