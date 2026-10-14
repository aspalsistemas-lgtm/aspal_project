import { PatronPanal } from "@/components/atoms/PatronPanal";
import type { Pilar } from "@/content/institucional/pilares";
import { HEXAGONO_PUNTA } from "@/lib/clases";
import { cn } from "@/lib/utils";

/**
 * La ilustración de un pilar asomando desde su hexágono, sobre el panal de la
 * marca: la columna visual del hero de una página que pertenece a un pilar
 * (el blog es Conocimiento). Decorativa (`aria-hidden`).
 *
 * Se asoma al cargar (CSS, solo transform: el prerender ya la trae en su
 * sitio y «reducir movimiento» la deja quieta).
 */
export function IlustracionPilar({ pilar }: { pilar: Pilar }) {
  return (
    <div
      className="relative mx-auto w-full max-w-xs"
      aria-hidden="true"
      data-testid={`ilustracion-pilar-${pilar.id}`}
    >
      <PatronPanal className="absolute -inset-12 h-[calc(100%+6rem)] w-[calc(100%+6rem)] opacity-40" />
      <div className="relative aspect-[0.866]">
        <span className={cn("absolute inset-0 bg-accent", HEXAGONO_PUNTA)} />
        {/* Fuera del hexágono recortado: la ilustración lo desborda por arriba. */}
        <span className="absolute inset-x-0 bottom-[6%] flex h-[96%] origin-bottom animate-asoma justify-center motion-reduce:animate-none">
          <img
            src={pilar.ilustracion}
            alt=""
            width={480}
            height={520}
            decoding="async"
            className="h-full w-auto"
          />
        </span>
      </div>
    </div>
  );
}
