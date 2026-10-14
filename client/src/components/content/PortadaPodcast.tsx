import { PatronPanal } from "@/components/atoms/PatronPanal";
import { HEXAGONO_PUNTA } from "@/lib/clases";
import { cn } from "@/lib/utils";
import { Headphones } from "lucide-react";

/** Alturas fijas de la onda (0–100): prerender y cliente pintan lo mismo. */
const ONDA = [40, 70, 55, 90, 35, 75, 100, 50, 80, 45, 65, 30, 85, 60, 40];

/**
 * El podcast como celda miel del panal: auriculares y una onda, sobre el
 * patrón de la marca. Es la columna visual del hero de /podcast. Decorativa
 * (`aria-hidden`); se arma al cargar (CSS, solo transform).
 */
export function PortadaPodcast() {
  return (
    <div
      className="relative mx-auto w-full max-w-xs"
      aria-hidden="true"
      data-testid="portada-podcast"
    >
      <PatronPanal className="absolute -inset-12 h-[calc(100%+6rem)] w-[calc(100%+6rem)] opacity-40" />
      <div
        className={cn(
          "relative flex aspect-[0.866] animate-insignia flex-col items-center justify-center gap-6 bg-secondary text-secondary-foreground motion-reduce:animate-none",
          HEXAGONO_PUNTA,
        )}
      >
        <Headphones className="h-20 w-20" strokeWidth={1.5} />
        <svg
          viewBox={`0 0 ${ONDA.length * 10} 40`}
          className="h-10 w-1/2"
          focusable="false"
        >
          {ONDA.map((altura, i) => (
            <rect
              key={i}
              x={i * 10 + 2}
              y={20 - (altura / 100) * 18}
              width="5"
              height={(altura / 100) * 36}
              rx="2.5"
              className="fill-noche"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
