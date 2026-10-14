import { Banda } from "@/components/layout/Banda";
import { ETAPAS, type EtapaMapa as Etapa } from "@/content/institucional/mapa-ruta";
import { useAnimarAlVer } from "@/hooks/use-animar-al-ver";
import { HEXAGONO_PUNTA, NUMERO_CONTORNO } from "@/lib/clases";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";

const CLASES_VECINA =
  "group inline-flex min-h-11 items-center gap-2 rounded-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Una etapa del Mapa de Ruta como sección, con su ancla (`#etapa-N`):
 *
 * - A la izquierda, fija al hacer scroll desde lg, la etapa en grande: número
 *   en contorno, insignia con su icono (miel en la 1), nombre y resumen.
 * - A la derecha, sus pasos como un camino vertical de hexágonos numerados
 *   (la numeración continua de la guía); la línea se traza y los hexágonos se
 *   activan la primera vez que entra en pantalla (useAnimarAlVer: solo
 *   transform). Después, la frase de cierre de la guía y los enlaces a la
 *   etapa anterior y a la siguiente.
 *
 * Las pares van en banda suave. Ya es una Banda: no la envuelvas.
 */
export function SeccionEtapa({
  etapa,
  anterior,
  siguiente,
}: {
  etapa: Etapa;
  anterior?: Etapa;
  siguiente?: Etapa;
}) {
  const { ref, estado } = useAnimarAlVer<HTMLOListElement>();
  const Icono = etapa.icono;
  const par = etapa.numero % 2 === 0;

  return (
    // scroll-mt-28: el header (64 px) y la barra de NavEtapas, que quedan encima.
    <Banda id={etapa.id} tono={par ? "suave" : "blanco"} className="scroll-mt-28">
      <article
        aria-labelledby={`${etapa.id}-titulo`}
        className="grid gap-10 lg:grid-cols-12 lg:gap-16"
        data-testid={`seccion-${etapa.id}`}
      >
        <header className="lg:col-span-4">
          <div className="lg:sticky lg:top-40">
            <div className="relative">
              <span
                className={cn(
                  NUMERO_CONTORNO,
                  "absolute -top-4 right-0 text-8xl lg:text-9xl",
                )}
                data-numero={String(etapa.numero).padStart(2, "0")}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "relative flex h-16 w-14 items-center justify-center",
                  HEXAGONO_PUNTA,
                  etapa.numero === 1
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-noche text-noche-foreground",
                )}
                aria-hidden="true"
              >
                <Icono className="h-6 w-6" />
              </span>
            </div>
            <p className="mt-6 text-[13px] font-semibold uppercase tracking-wider text-miel-texto">
              Etapa {etapa.numero} de {ETAPAS.length}
            </p>
            {/* Un punto menos desde lg: en la columna estrecha, «Administración»
                no cabe a 48 px y se partía a media palabra. */}
            <h2
              id={`${etapa.id}-titulo`}
              className="mt-2 text-4xl font-extrabold text-foreground md:text-5xl lg:text-4xl"
            >
              {etapa.nombre}
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">{etapa.resumen}</p>
          </div>
        </header>

        <div className="lg:col-span-8">
          <ol ref={ref} data-anim={estado} className="group/pasos relative">
            {/* Camino: la línea que une los pasos, detrás de los hexágonos. */}
            <span
              className="absolute bottom-8 left-6 top-8 w-0.5 origin-top bg-secondary group-data-[anim=esperando]/pasos:scale-y-0 group-data-[anim=activa]/pasos:animate-trazo-y"
              aria-hidden="true"
            />
            {etapa.pasos.map((paso, i) => (
              <li
                key={paso.numero}
                className="relative grid grid-cols-[3rem_1fr] gap-5 pb-10 last:pb-0 md:gap-8"
                data-testid={`paso-${paso.numero}`}
              >
                <span
                  className={cn(
                    "flex h-14 w-12 items-center justify-center bg-noche text-lg font-extrabold text-secondary",
                    HEXAGONO_PUNTA,
                    "group-data-[anim=esperando]/pasos:scale-75 group-data-[anim=activa]/pasos:animate-insignia",
                  )}
                  style={{ animationDelay: `${150 + i * 180}ms` }}
                  aria-hidden="true"
                >
                  {paso.numero}
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm font-semibold uppercase tracking-wider text-miel-texto">
                    Paso {paso.numero}
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-foreground">
                    {paso.nombre}
                  </h3>
                  <p className="mt-1 text-lg italic text-muted-foreground">
                    {paso.linea}
                  </p>
                  {paso.descripcion.map((parrafo, j) => (
                    // Contenido estático: el orden no cambia.
                    <p key={j} className="mt-3 text-base leading-relaxed text-foreground">
                      {parrafo}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ol>

          <p
            className={cn(
              "mt-10 rounded-2xl border-l-4 border-secondary p-6 text-lg font-semibold text-foreground",
              par ? "bg-background" : "bg-fondo-suave",
            )}
          >
            {etapa.cierre}
          </p>

          <nav
            aria-label={`Etapas vecinas de ${etapa.nombre}`}
            className="mt-8 flex flex-wrap justify-between gap-4"
          >
            {anterior ? (
              <a
                href={`#${anterior.id}`}
                className={CLASES_VECINA}
                data-testid={`${etapa.id}-anterior`}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Etapa {anterior.numero}: {anterior.nombre}
              </a>
            ) : (
              <span />
            )}
            {siguiente && (
              <a
                href={`#${siguiente.id}`}
                className={CLASES_VECINA}
                data-testid={`${etapa.id}-siguiente`}
              >
                Etapa {siguiente.numero}: {siguiente.nombre}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1"
                  aria-hidden="true"
                />
              </a>
            )}
          </nav>
        </div>
      </article>
    </Banda>
  );
}
