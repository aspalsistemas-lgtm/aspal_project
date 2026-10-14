import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

export type EstiloFotoHero = "hexagono" | "panal" | "sangrado";

/** GIF transparente de 1×1: lo que carga el <img> por debajo de lg. */
const VACIO =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

/** Hexágono de lados planos arriba y abajo: proporción ancho/alto = 2/√3. */
const HEX_PLANO = "[clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]";

/**
 * <picture> que solo descarga la foto desde lg (la columna visual del hero no
 * se ve por debajo). Desde lg es el elemento LCP: prioridad alta.
 * `fetchpriority` en minúsculas porque React 18 no reconoce fetchPriority.
 */
function Foto({
  src,
  alt,
  className,
  copia = false,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Otra capa de la misma foto (panal): decorativa, sin alt ni testid. */
  copia?: boolean;
}) {
  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={src} />
      <img
        src={VACIO}
        alt={copia ? "" : alt}
        width={1600}
        height={1200}
        decoding="async"
        {...{ fetchpriority: "high" }}
        className={cn("h-full w-full object-cover", className)}
        data-testid={copia ? undefined : "img-hero-foto"}
      />
    </picture>
  );
}

/** Hexágono con vértice arriba en (x, y), de radio r, para el SVG del panal. */
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

/**
 * Geometría del racimo «panal»: 5 celdas con vértice arriba en dos filas
 * (radio 100, separación de 5 entre celdas). Cuatro llevan foto y la de abajo a
 * la izquierda es miel sólida, como el isotipo.
 */
const RADIO_PANAL = 100;
const W_PANAL = RADIO_PANAL * 1.732;
const PANAL = {
  radio: RADIO_PANAL - 5,
  /** Centro de cada celda con foto y de dónde llega al ensamblarse. */
  celdasFoto: [
    { x: W_PANAL / 2, y: 0, dx: "-18px", dy: "-22px" },
    { x: W_PANAL * 1.5, y: 0, dx: "22px", dy: "-18px" },
    { x: W_PANAL, y: 150, dx: "0px", dy: "26px" },
    { x: W_PANAL * 2, y: 150, dx: "26px", dy: "18px" },
  ],
  celdaMiel: [0, 150] as const,
  minX: -W_PANAL / 2 - 4,
  minY: -104,
  ancho: W_PANAL * 3 + 8,
  alto: 358,
};

/** Rectángulo de la foto, en las mismas unidades que PANAL (ver comentario abajo). */
const ENCUADRE_PANAL = { x: -260, y: -225, ancho: 911, alto: 683 };

/** Una celda de PANAL como clip-path CSS, en % de la caja del racimo. */
function poligonoCelda(x: number, y: number): string {
  const vertices = puntos(x, y, PANAL.radio)
    .split(" ")
    .map((par) => {
      const [px, py] = par.split(",").map(Number);
      return `${(((px - PANAL.minX) / PANAL.ancho) * 100).toFixed(2)}% ${(((py - PANAL.minY) / PANAL.alto) * 100).toFixed(2)}%`;
    });
  return `polygon(${vertices.join(",")})`;
}

/** Rayas del isotipo sobre la celda miel. */
const RAYAS_MIEL = [
  [-38, 128, -8, 98],
  [-30, 168, 22, 116],
  [-2, 186, 38, 146],
] as const;

/**
 * Foto del hero tratada con el lenguaje de la marca (el hexágono del isotipo),
 * no como un rectángulo pegado encima.
 *
 * - `hexagono`: la foto en un gran hexágono, con un contorno miel desplazado
 *   detrás y una celda miel sólida que la muerde en la esquina.
 * - `panal`: la foto repartida en un racimo de celdas del panal separadas por
 *   el fondo, con una celda miel sólida (el isotipo, hecho foto). Al cargar,
 *   las celdas llegan a su sitio en cascada y se dibujan las rayas (~1,2 s,
 *   una vez; solo transform, apagado con «reducir movimiento»).
 * - `sangrado`: la foto llega al borde derecho de la pantalla con el borde
 *   izquierdo en zigzag hexagonal, fundida con el fondo noche.
 */
export function FotoHero({
  src,
  alt,
  estilo = "hexagono",
}: {
  src: string;
  alt: string;
  estilo?: EstiloFotoHero;
}) {
  if (estilo === "panal") {
    const P = PANAL;
    const pct = (valor: number) => `${(valor * 100).toFixed(3)}%`;
    // Encuadre a mano para esta foto: ampliada ~2,1× para que la distancia
    // entre las dos caras principales sea la de dos celdas y cada cara quede
    // centrada en una celda de arriba. Una foto nueva exige reajustar
    // ENCUADRE_PANAL.
    const encuadre = {
      left: pct((ENCUADRE_PANAL.x - P.minX) / P.ancho),
      top: pct((ENCUADRE_PANAL.y - P.minY) / P.alto),
      width: pct(ENCUADRE_PANAL.ancho / P.ancho),
      height: pct(ENCUADRE_PANAL.alto / P.alto),
    };
    return (
      <div
        className="relative w-full"
        style={{ aspectRatio: `${P.ancho} / ${P.alto}` }}
        data-testid="foto-hero-panal"
      >
        {/* Celda miel con las rayas del isotipo. */}
        <svg
          viewBox={`${P.minX} ${P.minY} ${P.ancho} ${P.alto}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
          focusable="false"
        >
          <g
            className="animate-celda-miel motion-reduce:animate-none"
            style={{ transformOrigin: `${P.celdaMiel[0]}px ${P.celdaMiel[1]}px` }}
          >
            <polygon
              points={puntos(P.celdaMiel[0], P.celdaMiel[1], P.radio)}
              className="fill-secondary"
            />
            <g className="stroke-noche" strokeWidth="14" strokeLinecap="round">
              {RAYAS_MIEL.map(([x1, y1, x2, y2], i) => (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  strokeDasharray="80"
                  className="animate-raya motion-reduce:animate-none"
                  style={{ animationDelay: `${800 + i * 120}ms` }}
                />
              ))}
            </g>
          </g>
        </svg>

        {/* Una capa por celda, cada una con su clip-path, para que lleguen por
            separado. Es la misma foto (una sola descarga, y ninguna por debajo
            de lg gracias al <picture>); solo la primera lleva el alt. */}
        {P.celdasFoto.map(({ x, y, dx, dy }, i) => (
          <div
            key={`${x}-${y}`}
            className="absolute inset-0 animate-ensamble motion-reduce:animate-none"
            style={
              {
                clipPath: poligonoCelda(x, y),
                "--dx": dx,
                "--dy": dy,
                animationDelay: `${i * 90}ms`,
              } as CSSProperties
            }
          >
            <div className="absolute" style={encuadre}>
              <Foto src={src} alt={alt} copia={i > 0} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (estilo === "sangrado") {
    return (
      // Sale del contenedor hasta el borde derecho de la ventana: el contenedor
      // mide como mucho 80rem y tiene 2rem de padding a cada lado.
      <div className="relative lg:-mr-8 xl:mr-[calc((100vw-80rem)/-2-2rem)]">
        <div className="aspect-[4/3] w-full [clip-path:polygon(12%_0,100%_0,100%_100%,12%_100%,0_87.5%,12%_75%,0_62.5%,12%_50%,0_37.5%,12%_25%,0_12.5%)]">
          <Foto src={src} alt={alt} />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-noche/70 via-transparent to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  // hexagono
  return (
    <div className="relative mx-auto w-full max-w-[560px] p-6">
      {/* Contorno miel desplazado, detrás de la foto. */}
      <svg
        viewBox="0 0 115.47 100"
        className="absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)] translate-x-5 -translate-y-5"
        aria-hidden="true"
        focusable="false"
      >
        <polygon
          points="28.87,0 86.6,0 115.47,50 86.6,100 28.87,100 0,50"
          className="fill-none stroke-secondary"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className={cn("relative aspect-[1.1547] w-full overflow-hidden", HEX_PLANO)}>
        <Foto src={src} alt={alt} />
      </div>
      {/* Celda miel sólida que muerde la esquina inferior izquierda. */}
      <span
        className={cn(
          "absolute bottom-2 left-0 aspect-[1.1547] w-[22%] bg-secondary shadow-lg",
          HEX_PLANO,
        )}
        aria-hidden="true"
      />
      {/* Celda en contorno, pequeña, arriba a la izquierda. */}
      <svg
        viewBox="0 0 115.47 100"
        className="absolute left-4 top-2 w-[11%]"
        aria-hidden="true"
        focusable="false"
      >
        <polygon
          points="28.87,0 86.6,0 115.47,50 86.6,100 28.87,100 0,50"
          className="fill-none stroke-secondary/60"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
