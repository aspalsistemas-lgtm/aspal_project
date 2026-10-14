import { PatronPanal } from "@/components/atoms/PatronPanal";
import { ETAPAS } from "@/content/institucional/mapa-ruta";
import { HEXAGONO_PUNTA } from "@/lib/clases";
import { cn } from "@/lib/utils";

/**
 * Posición de cada etapa en la flor del panal (7 celdas de un tercio de
 * ancho): las 6 primeras en anillo, en el sentido de las agujas del reloj
 * desde arriba a la izquierda, y la 7 (Evaluación y Mejora Continua) en el
 * centro, porque vuelve sobre todas.
 */
const CELDAS_FLOR = [
  { left: "16.67%", top: "0%" },
  { left: "50%", top: "0%" },
  { left: "66.67%", top: "30%" },
  { left: "50%", top: "60%" },
  { left: "16.67%", top: "60%" },
  { left: "0%", top: "30%" },
  { left: "33.33%", top: "30%" },
];

/**
 * El Mapa de Ruta como flor del panal: una celda por etapa con su icono, sobre
 * el patrón de la marca; la 1 en miel, como punto de partida. Es la columna
 * visual del hero de /mapa-de-ruta y cada celda salta a su etapa (#etapa-N).
 *
 * Las celdas se arman una tras otra al cargar (CSS, solo transform: el
 * prerender ya las trae en su sitio y «reducir movimiento» las deja quietas).
 */
export function PanalEtapas() {
  return (
    // Ancho de 3 celdas; alto de 1 celda más 2 pasos de ¾: 1 : 0,962.
    <nav
      aria-label="Las etapas del mapa"
      className="relative mx-auto aspect-[1.04] w-full max-w-md"
      data-testid="panal-etapas"
    >
      <PatronPanal className="absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)] opacity-30" />
      <ol>
        {ETAPAS.map((etapa, i) => {
          const Icono = etapa.icono;
          const primera = etapa.numero === 1;
          return (
            <li
              key={etapa.id}
              className="absolute aspect-[0.866] w-1/3 animate-insignia p-1 motion-reduce:animate-none"
              style={{ ...CELDAS_FLOR[i], animationDelay: `${200 + i * 120}ms` }}
            >
              <a
                href={`#${etapa.id}`}
                aria-label={`Etapa ${etapa.numero}: ${etapa.nombre}`}
                title={etapa.nombre}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none",
                  HEXAGONO_PUNTA,
                  primera
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-secondary focus-visible:bg-secondary",
                )}
                data-testid={`flor-etapa-${etapa.numero}`}
              >
                <Icono className="h-6 w-6" aria-hidden="true" />
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  aria-hidden="true"
                >
                  Etapa {etapa.numero}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
