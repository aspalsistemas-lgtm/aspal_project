import { HEXAGONO_PUNTA } from "@/lib/clases";
import { cn } from "@/lib/utils";
import type { TransformedPost } from "@shared/wordpress/types";
import { Headphones, Play } from "lucide-react";

/**
 * Alturas de la onda (0–100). Fijas, no aleatorias: el prerender y el cliente
 * pintan lo mismo. Es un dibujo, no la forma real del audio.
 */
const ONDA = [
  30, 55, 80, 45, 95, 60, 35, 70, 100, 50, 25, 65, 90, 40, 75, 55, 30, 85, 60, 45, 95, 35,
  70, 50, 80, 40, 60, 90, 30, 55,
];

function Onda() {
  return (
    <svg
      viewBox={`0 0 ${ONDA.length * 8} 40`}
      preserveAspectRatio="none"
      className="mt-4 h-10 w-full max-w-xl"
      aria-hidden="true"
      focusable="false"
    >
      {ONDA.map((altura, i) => (
        <rect
          key={i}
          x={i * 8 + 1}
          y={20 - (altura / 100) * 18}
          width="4"
          height={(altura / 100) * 36}
          rx="2"
          className="fill-secondary"
        />
      ))}
    </svg>
  );
}

/**
 * Un episodio del podcast como franja noche con aspecto de reproductor:
 * portada en hexágono, onda de audio en miel y «Escuchar». Toda la franja es
 * un enlace al episodio en WordPress (pestaña nueva); no reproduce audio aquí.
 */
export function FranjaPodcast({ episodio }: { episodio: TransformedPost }) {
  return (
    <a
      href={episodio.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid items-center gap-6 rounded-3xl bg-noche p-6 text-noche-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:grid-cols-[auto_1fr_auto] md:p-8"
      aria-label={`Podcast: ${episodio.title}. Escuchar (se abre en otra pestaña)`}
      data-testid={`franja-podcast-${episodio.id}`}
    >
      <span
        className={cn("relative block h-28 w-24 shrink-0 bg-secondary", HEXAGONO_PUNTA)}
        aria-hidden="true"
      >
        {episodio.featuredImage && (
          <img
            src={episodio.featuredImage}
            alt=""
            width={1600}
            height={900}
            loading="lazy"
            decoding="async"
            className={cn(
              "absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] object-cover",
              HEXAGONO_PUNTA,
            )}
          />
        )}
      </span>
      <span className="min-w-0">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-secondary">
          <Headphones className="h-4 w-4" aria-hidden="true" /> Podcast · Último episodio
        </span>
        <span className="mt-2 block text-2xl font-bold md:text-3xl">
          {episodio.title}
        </span>
        <Onda />
      </span>
      <span className="inline-flex min-h-11 items-center gap-2 justify-self-start rounded-full bg-secondary px-6 py-3 font-semibold text-secondary-foreground transition-colors group-hover:bg-secondary/90 md:justify-self-end">
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
        Escuchar
      </span>
    </a>
  );
}
