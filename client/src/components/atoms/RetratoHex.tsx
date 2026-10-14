import type { Perfil } from "@/content/institucional/equipo";
import { HEXAGONO_PUNTA } from "@/lib/clases";
import { iniciales } from "@/lib/iniciales";
import { cn } from "@/lib/utils";

const TONOS = {
  noche: "bg-noche text-secondary",
  miel: "bg-secondary text-secondary-foreground",
  claro: "bg-accent text-accent-foreground",
} as const;

/**
 * Retrato de una persona en el hexágono del isotipo. Con `foto`, la foto
 * recortada; sin ella (los retratos aún no llegan, §6.4), sus iniciales. Al
 * llegar las fotos basta con rellenar `foto` en equipo.ts.
 *
 * El tamaño lo da `className` (ancho y tamaño de letra): el alto sale de la
 * proporción del hexágono.
 */
export function RetratoHex({
  perfil,
  tono = "noche",
  className,
}: {
  perfil: Perfil;
  /** Fondo sin foto: noche (iniciales miel), miel o claro (iniciales noche). */
  tono?: keyof typeof TONOS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex aspect-[0.866] items-center justify-center overflow-hidden font-extrabold",
        HEXAGONO_PUNTA,
        TONOS[tono],
        className,
      )}
    >
      {perfil.foto ? (
        <img
          src={perfil.foto}
          alt={`Retrato de ${perfil.nombre}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{iniciales(perfil.nombre)}</span>
      )}
    </span>
  );
}
