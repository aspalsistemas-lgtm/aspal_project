import type { Hito } from "@/content/institucional/nosotros";
import { useAnimarAlVer } from "@/hooks/use-animar-al-ver";
import { HEXAGONO_PUNTA } from "@/lib/clases";
import { cn } from "@/lib/utils";
import {
  Award,
  Flag,
  Globe2,
  GraduationCap,
  Rocket,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Icono por hito, en el orden de RUTA (relanzamiento, encuentro, presencia
 * regional, certificación, consolidación, visión cumplida). Si la ruta crece,
 * los que falten llevan la bandera.
 */
const ICONOS: LucideIcon[] = [Rocket, Users, Globe2, Award, GraduationCap, Flag];

/**
 * Ruta ASPAL 2026–2030 (Bloque 7, RF-07) como camino, con el mismo lenguaje
 * que el paso a paso del Mapa de Ruta en la home: insignia hexagonal por hito
 * y una línea que los une cuando caben en una fila (xl). Todo el texto está a
 * la vista (antes, cada meta se escondía tras un clic).
 *
 * El hito en curso y la meta final van en miel; el en curso lleva además
 * «Estamos aquí» escrito, para que el estado no dependa del color.
 *
 * La primera vez que entra en pantalla, la línea se traza y las insignias se
 * activan en orden (useAnimarAlVer: solo transform; nada en el prerender ni
 * con «reducir movimiento»).
 */
export function RutaTimeline({ hitos }: { hitos: Hito[] }) {
  const { ref, estado } = useAnimarAlVer<HTMLOListElement>();
  return (
    <ol
      ref={ref}
      data-anim={estado}
      className={cn(
        "group/ruta relative grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:gap-5",
        // Línea del camino, detrás de las insignias: top-8 = media insignia.
        "xl:before:absolute xl:before:left-[8%] xl:before:right-[8%] xl:before:top-8 xl:before:h-0.5 xl:before:origin-left xl:before:bg-secondary xl:before:content-['']",
        "data-[anim=esperando]:before:scale-x-0 data-[anim=activa]:before:animate-trazo",
      )}
      data-testid="ruta-timeline"
    >
      {hitos.map((hito, i) => {
        const Icono = ICONOS[i] ?? Flag;
        const enCurso = hito.estado === "en-curso";
        const destacado = enCurso || i === hitos.length - 1;
        return (
          <li
            key={hito.anio}
            className="relative flex flex-col xl:items-center xl:text-center"
            data-testid={`hito-${i}`}
          >
            <span
              className={cn(
                "flex h-16 w-14 items-center justify-center",
                HEXAGONO_PUNTA,
                destacado
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-noche text-noche-foreground",
                "group-data-[anim=esperando]/ruta:scale-75 group-data-[anim=activa]/ruta:animate-insignia",
              )}
              style={{ animationDelay: `${150 + i * 200}ms` }}
              aria-hidden="true"
            >
              <Icono className="h-6 w-6" />
            </span>
            <span className="mt-4 text-sm font-semibold uppercase tracking-wider text-miel-texto">
              {hito.anio}
            </span>
            <h3 className="mt-1 text-lg font-bold leading-tight text-foreground">
              {hito.nombre}
            </h3>
            <p className="mt-2 text-base text-muted-foreground">{hito.descripcion}</p>
            {enCurso && (
              <span className="mt-3 self-start rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground xl:self-center">
                Estamos aquí
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
