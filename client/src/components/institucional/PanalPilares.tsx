import { PatronPanal } from "@/components/atoms/PatronPanal";
import { PILARES } from "@/content/institucional/pilares";
import { HEXAGONO_PUNTA } from "@/lib/clases";
import { cn } from "@/lib/utils";

/**
 * Posición de cada celda en el racimo: un rombo de 4 celdas del panal. Cada
 * celda mide media anchura; el paso vertical es ¾ de celda.
 */
const CELDAS_RACIMO = [
  { left: "25%", top: "0%" },
  { left: "0%", top: "30%" },
  { left: "50%", top: "30%" },
  { left: "25%", top: "60%" },
];

/**
 * Los 4 pilares como un racimo del panal, cada celda con su ilustración, sobre
 * el patrón de la marca. Es la columna visual del hero de ¿Qué hacemos?.
 * Decorativo (`aria-hidden`).
 *
 * Las celdas se arman una tras otra al cargar (CSS, solo transform: el
 * prerender ya las trae en su sitio y «reducir movimiento» las deja quietas).
 */
export function PanalPilares() {
  return (
    // Ancho de 2 celdas; alto de 1 celda más 2 pasos de ¾: 1 : 1,443.
    <div
      className="relative mx-auto aspect-[0.693] w-full max-w-sm"
      aria-hidden="true"
      data-testid="panal-pilares"
    >
      <PatronPanal className="absolute inset-0 h-full w-full opacity-40" />
      {PILARES.map((pilar, i) => (
        <span
          key={pilar.id}
          className="absolute aspect-[0.866] w-1/2 p-1.5"
          style={CELDAS_RACIMO[i]}
        >
          <span
            className={cn(
              "flex h-full w-full items-end justify-center overflow-hidden",
              HEXAGONO_PUNTA,
              // La primera celda en miel, como la celda llena del isotipo.
              i === 0 ? "bg-secondary" : "bg-accent",
              "animate-insignia motion-reduce:animate-none",
            )}
            style={{ animationDelay: `${200 + i * 160}ms` }}
          >
            <img
              src={pilar.ilustracion}
              alt=""
              width={480}
              height={520}
              decoding="async"
              className="h-[82%] w-auto"
            />
          </span>
        </span>
      ))}
    </div>
  );
}
