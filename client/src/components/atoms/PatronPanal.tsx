import { cn } from "@/lib/utils";
import { useId } from "react";

/** Hexágono con vértice arriba, centrado en (x, y), de radio r. */
function puntos(x: number, y: number, r: number): string {
  const c = r * 0.866;
  return [
    [x, y - r],
    [x + c, y - r / 2],
    [x + c, y + r / 2],
    [x, y + r],
    [x - c, y + r / 2],
    [x - c, y - r / 2],
  ]
    .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
    .join(" ");
}

const R = 38;
const PASO_X = R * 1.732;
const PASO_Y = R * 1.5;
const FILAS = 7;
const COLUMNAS = 6;

/** Celdas del panal. Las de `DESTACADAS` forman el racimo del isotipo. */
const CELDAS = Array.from({ length: FILAS * COLUMNAS }, (_, i) => {
  const fila = Math.floor(i / COLUMNAS);
  const columna = i % COLUMNAS;
  return {
    clave: `${fila}-${columna}`,
    x: 40 + columna * PASO_X + (fila % 2 ? PASO_X / 2 : 0),
    y: 40 + fila * PASO_Y,
  };
});

/** Racimo de cuatro celdas, como el isotipo: dos llenas en miel y dos en contorno. */
const LLENAS = new Set(["2-2", "3-2"]);
const CONTORNO_FUERTE = new Set(["2-3", "3-3", "4-2"]);
/** Orden de llegada de las celdas del racimo con `animado`. */
const ORDEN_RACIMO = ["2-2", "3-2", "2-3", "3-3", "4-2"];

/**
 * Patrón de panal de la marca (el isotipo, repetido). Decorativo: `aria-hidden`.
 * Pensado para fondos noche; en el hero de la home ocupa la columna visual
 * mientras no haya foto (`FOTO_HERO` en content/institucional/inicio.ts).
 *
 * Con `animado`, las celdas del racimo se arman una tras otra al cargar (solo
 * transform, CSS: el prerender ya las trae en su sitio y «reducir movimiento»
 * las deja quietas). Una vez por página: en el hero, no en la banda final.
 */
export function PatronPanal({
  className,
  animado = false,
}: {
  className?: string;
  animado?: boolean;
}) {
  // Ids únicos por instancia: dos patrones en la misma página compartirían la
  // máscara. Sin «:», que dentro de url(#…) no todos los navegadores aceptan.
  const id = useId().replace(/:/g, "");
  const ancho = 40 * 2 + COLUMNAS * PASO_X;
  const alto = 40 * 2 + (FILAS - 1) * PASO_Y;
  return (
    <svg
      viewBox={`0 0 ${ancho.toFixed(0)} ${alto.toFixed(0)}`}
      className={cn("h-auto w-full", className)}
      aria-hidden="true"
      focusable="false"
      data-testid="patron-panal"
    >
      <defs>
        {/* Se desvanece hacia los bordes para no competir con el texto. */}
        <radialGradient id={`${id}-desvanecido`} cx="50%" cy="48%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="70%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-mascara`}>
          <rect width="100%" height="100%" fill={`url(#${id}-desvanecido)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}-mascara)`} strokeWidth="2" strokeLinejoin="round">
        {CELDAS.map(({ clave, x, y }) => {
          const orden = animado ? ORDEN_RACIMO.indexOf(clave) : -1;
          return (
            <polygon
              key={clave}
              points={puntos(x, y, R - 3)}
              className={cn(
                LLENAS.has(clave)
                  ? "fill-secondary stroke-secondary"
                  : CONTORNO_FUERTE.has(clave)
                    ? "fill-none stroke-secondary/80"
                    : "fill-none stroke-secondary/20",
                orden >= 0 && "animate-insignia motion-reduce:animate-none",
              )}
              style={
                orden >= 0
                  ? {
                      // Cada celda crece desde su propio centro.
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      animationDelay: `${200 + orden * 140}ms`,
                    }
                  : undefined
              }
            />
          );
        })}
      </g>
    </svg>
  );
}
