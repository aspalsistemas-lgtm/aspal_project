import ilustracionEventos from "@assets/ilustraciones/eventos-webinar.webp";
import { ContenidoReciente } from "@/components/organisms/ContenidoReciente";
import { FormSuscripcion } from "@/components/organisms/FormSuscripcion";
import { CifraAnimada } from "@/components/molecules/CifraAnimada";
import { IndiceEtapas } from "@/components/molecules/IndiceEtapas";
import { MuroAliados } from "@/components/organisms/MuroAliados";
import { PilarCard } from "@/components/molecules/PilarCard";
import { VocesRed } from "@/components/organisms/VocesRed";
import { Banda } from "@/components/layout/Banda";
import { PieSitio } from "@/components/organisms/PieSitio";
import { CabeceraSitio } from "@/components/organisms/CabeceraSitio";
import { HeroInstitucional } from "@/components/layout/HeroInstitucional";
import { Button } from "@/components/ui/button";
import { FotoHero, type EstiloFotoHero } from "@/components/atoms/FotoHero";
import { PatronPanal } from "@/components/atoms/PatronPanal";
import {
  CIFRAS,
  FOTO_HERO,
  TESTIMONIOS,
  TEXTO_EVENTOS,
} from "@/content/institucional/inicio";
import { MAPA_RUTA } from "@/content/institucional/mapa-ruta";
import {
  ALIADOS_FUNDADORES,
  CTA_FINAL,
  HASHTAG,
  HERO_NOSOTROS,
} from "@/content/institucional/nosotros";
import { PILARES } from "@/content/institucional/pilares";
import { registrarEvento } from "@/lib/analitica";
import {
  BOTON_CONTORNO_NOCHE,
  BOTON_MIEL_NOCHE,
  H2_BANDA,
  REJILLA_PILARES_PANAL,
} from "@/lib/clases";
import { NOMBRE_COMPLETO } from "@/lib/marca";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

/** Tratamiento de la foto del hero (ver FotoHero). */
const ESTILO_FOTO_HERO: EstiloFotoHero = "panal";

/**
 * Columna visual del hero: la foto real de un encuentro cuando exista
 * (`FOTO_HERO`), tratada con el hexágono de la marca, o solo el panal.
 */
function VisualHero() {
  if (!FOTO_HERO) return <PatronPanal />;
  return <FotoHero src={FOTO_HERO.src} alt={FOTO_HERO.alt} estilo={ESTILO_FOTO_HERO} />;
}

/**
 * Home institucional (§6.1). El contenido de producto que ocupaba la raíz vive
 * en /plataforma desde el PR A. Las ranuras de la fase 2 (foto del hero, voces
 * de la red) se llenan en content/institucional/inicio.ts.
 */
export default function Inicio() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CabeceraSitio />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* 1. Hero */}
        <HeroInstitucional
          overline={NOMBRE_COMPLETO}
          titulo={HERO_NOSOTROS.tagline}
          visual={<VisualHero />}
        >
          <p>{HERO_NOSOTROS.parrafo}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="secondary" className={BOTON_MIEL_NOCHE} asChild>
              <Link
                href="/mapa-de-ruta"
                className="group"
                onClick={() =>
                  registrarEvento("click_mapa_ruta", { origen: "home_hero" })
                }
                data-testid="button-home-mapa"
              >
                Empieza por el Mapa de Ruta
                <ArrowRight
                  className="transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <Button variant="outline" className={BOTON_CONTORNO_NOCHE} asChild>
              <Link
                href="/unete"
                onClick={() => registrarEvento("click_unete", { origen: "home" })}
                data-testid="button-home-unete"
              >
                Únete a la comunidad
              </Link>
            </Button>
          </div>
        </HeroInstitucional>

        {/* 2. Cifras verificables */}
        <Banda>
          <h2 className="sr-only">ASPAL en cifras</h2>
          <dl className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border">
            {CIFRAS.map((cifra) => (
              <div
                key={cifra.valor}
                className="flex flex-col lg:px-8 lg:first:pl-0 lg:last:pr-0"
                data-testid={`cifra-${cifra.valor}`}
              >
                <dt className="order-2 mt-2 text-lg text-muted-foreground">
                  {cifra.etiqueta}
                </dt>
                {/* Icono y «Meta 2030» dentro del dd: un <dl> solo admite dt/dd. */}
                <dd className="order-1">
                  <div className="flex items-center gap-3" aria-hidden="true">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                      <cifra.icono className="h-6 w-6 text-primary" />
                    </span>
                    {cifra.meta && (
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
                        Meta 2030
                      </span>
                    )}
                  </div>
                  <span className="mt-4 block text-5xl font-extrabold text-primary">
                    <CifraAnimada valor={cifra.valor} />
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </Banda>

        {/* 3. Los 4 pilares */}
        <Banda tono="suave">
          <h2 className={H2_BANDA}>Los 4 Pilares ASPAL</h2>
          {/* Panal escalonado: las insignias sobresalen 40 px por arriba (pt-10,
              gap-y-16) y desde lg las tarjetas pares bajan medio paso, como las
              celdas de un panal (lg:pb-12 reserva ese medio paso). */}
          <div className={`mt-8 ${REJILLA_PILARES_PANAL}`}>
            {PILARES.map((pilar, i) => (
              <PilarCard key={pilar.id} pilar={pilar} ilustracion numero={i + 1} />
            ))}
          </div>
        </Banda>

        {/* 4. Mapa de Ruta destacado */}
        <Banda>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-primary">
            Mapa de Ruta
          </p>
          <h2 className={`mt-2 ${H2_BANDA}`}>{MAPA_RUTA.titulo}</h2>
          <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
            {MAPA_RUTA.subtitulo}
          </p>
          <div className="mt-8">
            <IndiceEtapas />
          </div>
          <Button className="mt-8 min-h-11 px-6" asChild>
            <Link
              href="/mapa-de-ruta"
              onClick={() =>
                registrarEvento("click_mapa_ruta", { origen: "home_franja" })
              }
              data-testid="button-home-mapa-franja"
            >
              Explora el Mapa de Ruta
            </Link>
          </Button>
        </Banda>

        {/* Voces de la red: ranura de la fase 2, no se pinta sin testimonios */}
        <VocesRed testimonios={TESTIMONIOS} />

        {/* 5. Contenido reciente (se oculta si la API falla) */}
        <ContenidoReciente />

        {/* 6. Próximo gran evento: D10 sin aprobar, alternativa de la §6.1 */}
        <Banda>
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="flex justify-center rounded-2xl bg-accent p-6 lg:col-span-5">
              <img
                src={ilustracionEventos}
                alt=""
                width={480}
                height={546}
                loading="lazy"
                decoding="async"
                className="h-56 w-auto md:h-72"
                data-testid="img-home-eventos"
              />
            </div>
            <div className="lg:col-span-7">
              <h2 className={H2_BANDA}>Próximos eventos</h2>
              <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                {TEXTO_EVENTOS}
              </p>
              {/* Botón, no formulario: la home ya tiene el del boletín en la banda
                  final (§6.1) y dos formularios iguales a unas pantallas de
                  distancia piden lo mismo dos veces. */}
              <Button variant="outline" className="mt-6 min-h-11 px-6" asChild>
                <Link href="/eventos" data-testid="button-home-eventos">
                  Avísame cuando abran inscripciones
                </Link>
              </Button>
            </div>
          </div>
        </Banda>

        {/* 7. Aliados fundadores */}
        <Banda tono="suave">
          <h2 className={`mb-8 ${H2_BANDA}`}>Aliados fundadores</h2>
          <MuroAliados fundadores={ALIADOS_FUNDADORES} />
        </Banda>

        {/* 8. Únete a la casa común */}
        <Banda tono="noche">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-[13px] font-semibold tracking-wider text-secondary">
                {HASHTAG}
              </p>
              <h2 className="mt-2 text-3xl font-bold md:text-4xl">
                Únete a la casa común
              </h2>
              {CTA_FINAL.map((parrafo, i) => (
                // Contenido estático: el orden no cambia.
                <p key={i} className="mt-4 text-lg text-white/85">
                  {parrafo}
                </p>
              ))}
              <Link
                href="/unete"
                className="mt-6 inline-flex min-h-11 items-center font-medium text-secondary underline underline-offset-4"
                onClick={() => registrarEvento("click_unete", { origen: "home_final" })}
                data-testid="link-home-unete-final"
              >
                Ver todas las formas de unirte
              </Link>
            </div>
            <div>
              <FormSuscripcion origen="home" variante="compacto" tono="noche" />
            </div>
          </div>
        </Banda>
      </main>
      <PieSitio conBoletin={false} />
    </div>
  );
}
