import { AvisoPestanaNueva } from "@/components/atoms/AvisoPestanaNueva";
import { Banda } from "@/components/templates/Banda";
import { Proximamente } from "@/components/atoms/Proximamente";
import type { EnlaceContenido, Pilar } from "@/content/institucional/pilares";
import { useAnimarAlVer } from "@/hooks/use-animar-al-ver";
import { registrarEvento } from "@/lib/analitica";
import { HEXAGONO_PUNTA, NUMERO_CONTORNO } from "@/lib/clases";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

/** Acceso a lo que ya existe del pilar, como píldora; sin `href`, «Próximamente». */
function EnlacePilar({ enlace, testid }: { enlace: EnlaceContenido; testid: string }) {
  const clases =
    "group inline-flex min-h-11 items-center gap-2 rounded-full border border-primary px-5 font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  if (!enlace.href) {
    return (
      <span
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-dashed border-border px-5 text-muted-foreground"
        data-testid={testid}
      >
        {enlace.etiqueta} <Proximamente />
      </span>
    );
  }
  if (enlace.externo) {
    return (
      <a
        href={enlace.href}
        target="_blank"
        rel="noopener noreferrer"
        className={clases}
        onClick={() =>
          registrarEvento("salida_plataforma", { destino: enlace.href!, origen: "pilar" })
        }
        data-testid={testid}
      >
        {enlace.etiqueta}
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        <AvisoPestanaNueva />
      </a>
    );
  }
  return (
    <Link href={enlace.href} className={clases} data-testid={testid}>
      {enlace.etiqueta}
      <ArrowRight
        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Un pilar como sección editorial de ¿Qué hacemos?, con su ancla (`id`, RF-08):
 * ilustración en un hexágono grande con el número en contorno, y el texto con
 * jerarquía (subtítulo como declaración, compromiso, «cómo se traduce» en su
 * recuadro y los accesos). Los pares van en banda suave con la ilustración a
 * la derecha, para que la página alterne.
 *
 * La ilustración desborda el hexágono por arriba y se asoma la primera vez que
 * entra en pantalla (useAnimarAlVer: solo transform).
 */
export function SeccionPilar({
  pilar,
  numero,
  siguiente,
}: {
  pilar: Pilar;
  /** Posición del pilar (1–4): el número en contorno y el lado de la ilustración. */
  numero: number;
  /** Pilar que sigue: añade el salto «Siguiente pilar». */
  siguiente?: Pilar;
}) {
  const { ref, estado } = useAnimarAlVer<HTMLDivElement>();
  const par = numero % 2 === 0;
  const dosCifras = String(numero).padStart(2, "0");

  return (
    <Banda id={pilar.id} tono={par ? "suave" : "blanco"} className="scroll-mt-32">
      <article
        className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16"
        data-testid={`pilar-${pilar.id}`}
      >
        <div
          ref={ref}
          className={cn(
            "relative mx-auto w-full max-w-xs lg:col-span-5 lg:max-w-sm",
            par && "lg:order-last",
          )}
          aria-hidden="true"
        >
          <span
            className={cn(
              NUMERO_CONTORNO,
              "absolute -top-6 z-10 text-8xl md:text-9xl",
              par ? "-left-2" : "-right-2",
            )}
            data-numero={dosCifras}
          />
          <div className="relative aspect-[0.866]">
            <span
              className={cn(
                "absolute inset-0",
                HEXAGONO_PUNTA,
                par ? "bg-background" : "bg-accent",
              )}
            />
            {/* Fuera del hexágono recortado: la ilustración lo desborda por arriba. */}
            <span
              className={cn(
                "absolute inset-x-0 bottom-[6%] flex h-[96%] origin-bottom justify-center",
                estado === "esperando" && "translate-y-6 scale-90",
                estado === "activa" && "animate-asoma",
              )}
            >
              <img
                src={pilar.ilustracion}
                alt=""
                width={480}
                height={520}
                loading="lazy"
                decoding="async"
                className="h-full w-auto"
                data-testid={`img-pilar-${pilar.id}`}
              />
            </span>
          </div>
        </div>

        <div className="lg:col-span-7">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-miel-texto">
            Pilar {dosCifras}
          </p>
          <h2 className="mt-2 text-4xl font-extrabold text-foreground md:text-5xl">
            {pilar.nombre}
          </h2>
          <p className="mt-3 border-l-4 border-secondary pl-4 text-2xl font-medium italic leading-snug text-foreground md:text-3xl">
            {pilar.subtitulo}
          </p>

          <dl className="mt-8 space-y-6">
            <div>
              <dt className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                Compromiso ASPAL
              </dt>
              <dd className="mt-2 text-xl leading-relaxed text-foreground">
                {pilar.compromiso}
              </dd>
            </div>
            <div
              className={cn(
                "rounded-2xl border border-border p-6",
                par ? "bg-background" : "bg-fondo-suave",
              )}
            >
              <dt className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cómo se traduce
              </dt>
              <dd className="mt-2 text-lg leading-relaxed text-foreground">
                {pilar.comoSeTraduce}
              </dd>
            </div>
          </dl>

          <ul className="mt-8 flex flex-wrap gap-3">
            {pilar.enlaces.map((enlace, i) => (
              <li key={enlace.etiqueta}>
                <EnlacePilar enlace={enlace} testid={`pilar-${pilar.id}-enlace-${i}`} />
              </li>
            ))}
          </ul>

          {siguiente && (
            <a
              href={`#${siguiente.id}`}
              className="group mt-10 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              data-testid={`pilar-${pilar.id}-siguiente`}
            >
              Siguiente pilar: {siguiente.nombre}
              <ArrowDown
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-1 group-focus-visible:translate-y-1"
                aria-hidden="true"
              />
            </a>
          )}
        </div>
      </article>
    </Banda>
  );
}
