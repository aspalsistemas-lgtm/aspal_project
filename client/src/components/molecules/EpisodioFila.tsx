import { AvisoMiembros } from "@/components/atoms/AvisoMiembros";
import { HEXAGONO_PUNTA, NUMERO_CONTORNO } from "@/lib/clases";
import { formatPublishedDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { TransformedPost } from "@shared/wordpress/types";
import { ArrowUpRight, Play } from "lucide-react";

/**
 * Un episodio en la lista de /podcast: número en contorno (desde sm), portada
 * en hexágono, «Episodio N», aviso de miembros, título, extracto, fecha y
 * «Escuchar». Toda la fila enlaza al episodio en la comunidad (pestaña nueva).
 *
 * `numero` lo calcula quien la usa sobre el TOTAL de la colección, no sobre lo
 * cargado (ver useListaPaginada): con una lista parcial saldría mal.
 */
export function EpisodioFila({
  episodio,
  numero,
}: {
  episodio: TransformedPost;
  numero: number;
}) {
  const fecha = formatPublishedDate(episodio.publishedAt, "d 'de' MMMM, yyyy");
  return (
    <a
      href={episodio.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl px-2 py-6 transition-colors hover:bg-fondo-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:grid-cols-[4.5rem_auto_1fr_auto] sm:gap-6 sm:px-4"
      aria-label={`Episodio ${numero}: ${episodio.title} (se abre en otra pestaña)`}
      data-testid={`link-podcast-${episodio.id}`}
    >
      <span
        className={cn(NUMERO_CONTORNO, "hidden text-5xl sm:block")}
        data-numero={String(numero).padStart(2, "0")}
        aria-hidden="true"
      />
      <span
        className={cn(
          "relative block h-20 w-[4.33rem] shrink-0 bg-secondary sm:h-24 sm:w-[5.2rem]",
          HEXAGONO_PUNTA,
        )}
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
            data-testid={`img-podcast-artwork-${episodio.id}`}
          />
        )}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className="text-[13px] font-semibold uppercase tracking-wider text-miel-texto"
            data-testid={`badge-episode-${episodio.id}`}
          >
            Episodio {numero}
          </span>
          {episodio.isGated && <AvisoMiembros />}
        </span>
        <span
          className="mt-1 block text-xl font-bold leading-snug text-foreground"
          data-testid={`text-podcast-title-${episodio.id}`}
        >
          {episodio.title}
        </span>
        {episodio.excerpt && (
          <span className="mt-1 line-clamp-2 text-base text-muted-foreground">
            {episodio.excerpt}
          </span>
        )}
        {fecha && (
          <time
            dateTime={episodio.publishedAt}
            className="mt-2 block text-sm text-muted-foreground"
            data-testid={`text-podcast-date-${episodio.id}`}
          >
            {fecha}
          </time>
        )}
      </span>
      <span className="col-span-2 inline-flex items-center gap-2 justify-self-start rounded-full border border-primary px-5 py-2 font-medium text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:col-span-1">
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
        Escuchar
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </a>
  );
}
