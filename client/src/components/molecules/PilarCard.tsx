import type { Pilar } from "@/content/institucional/pilares";
import { useAnimarAlVer } from "@/hooks/use-animar-al-ver";
import { HEXAGONO_PUNTA, NUMERO_CONTORNO } from "@/lib/clases";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

/**
 * Un pilar ASPAL en resumen (home, Nosotros): nombre, subtítulo, compromiso y
 * enlace a su sección de ¿Qué hacemos? (SeccionPilar). Toda la tarjeta es el
 * enlace.
 *
 * Con `ilustracion` (home), la ilustración de la marca sale de una insignia
 * hexagonal que rompe el borde superior de la tarjeta: el contenedor debe
 * dejarle 40 px por encima (`pt-10`, y `gap-y-16` si se apilan). Con `numero`,
 * el número del pilar en grande, en contorno miel y decorativo.
 */
export function PilarCard({
  pilar,
  ilustracion = false,
  numero,
}: {
  pilar: Pilar;
  /** Ilustración de la marca en una insignia hexagonal, en lugar del icono (home). */
  ilustracion?: boolean;
  /** Número del pilar (1–4), decorativo, arriba a la derecha. */
  numero?: number;
}) {
  const Icono = pilar.icono;
  // Entrada de la ilustración (solo con `ilustracion`: sin ref queda estática).
  const { ref: refInsignia, estado } = useAnimarAlVer<HTMLDivElement>();

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border border-border bg-background p-6 md:p-8",
        ilustracion && "pt-20 md:pt-20",
        // Toda la tarjeta lleva al detalle (el enlace se estira con
        // after:inset-0): objetivo táctil grande y un solo tabulador. El anillo
        // sale solo con teclado (has-[:focus-visible]) y, en alto contraste, como outline.
        "transition-colors hover:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 forced-colors:has-[:focus-visible]:outline forced-colors:has-[:focus-visible]:outline-2",
      )}
      data-testid={`pilar-${pilar.id}`}
    >
      {numero !== undefined && (
        <span
          className={cn(
            NUMERO_CONTORNO,
            "pointer-events-none absolute right-5 top-3 text-7xl",
          )}
          data-numero={String(numero).padStart(2, "0")}
          aria-hidden="true"
          data-testid={`numero-pilar-${pilar.id}`}
        />
      )}
      {ilustracion ? (
        <div
          ref={refInsignia}
          className="absolute -top-10 left-6 h-32 w-28 md:left-8"
          aria-hidden="true"
        >
          <span
            className={cn("absolute inset-x-0 bottom-0 h-28 bg-accent", HEXAGONO_PUNTA)}
          />
          {/* La ilustración se asoma desde la insignia la primera vez que entra
              en pantalla, en cascada según `numero`. Va en su propia capa: el
              <img> ya usa transform para centrarse. */}
          <span
            className={cn(
              "absolute inset-0 origin-bottom",
              estado === "esperando" && "translate-y-6 scale-90",
              estado === "activa" && "animate-asoma",
            )}
            style={{ animationDelay: `${((numero ?? 1) - 1) * 120}ms` }}
          >
            <img
              src={pilar.ilustracion}
              alt=""
              width={480}
              height={520}
              loading="lazy"
              decoding="async"
              className="absolute bottom-1 left-1/2 h-32 w-auto max-w-none -translate-x-1/2"
              data-testid={`img-pilar-${pilar.id}`}
            />
          </span>
        </div>
      ) : (
        <Icono className="h-8 w-8 text-primary" aria-hidden="true" />
      )}
      <h3 className="mt-4 text-2xl font-bold text-foreground">{pilar.nombre}</h3>
      <p className="mt-1 text-lg italic text-muted-foreground">{pilar.subtitulo}</p>
      <p className="mt-4 text-lg text-foreground">
        <strong className="font-semibold">Compromiso ASPAL:</strong> {pilar.compromiso}
      </p>
      <Link
        href={`/que-hacemos#${pilar.id}`}
        className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-4 font-medium text-primary underline underline-offset-4 outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
        aria-label={`${pilar.nombre}: cómo se traduce`}
        data-testid={`pilar-${pilar.id}-detalle`}
      >
        Cómo se traduce
        {/* La flecha avanza al pasar el ratón por la tarjeta o al enfocarla. */}
        <ArrowRight
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-has-[:focus-visible]:translate-x-1"
          aria-hidden="true"
        />
      </Link>
    </article>
  );
}
