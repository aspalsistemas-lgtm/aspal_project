import ilustracionVoz from "@assets/recurso-27-marketing.webp";
import { CifraAnimada } from "@/components/molecules/CifraAnimada";
import { Hashtag } from "@/components/atoms/Hashtag";
import { ManifiestoNumerado } from "@/components/molecules/ManifiestoNumerado";
import { MuroAliados } from "@/components/organisms/MuroAliados";
import { PilarCard } from "@/components/molecules/PilarCard";
import { RutaTimeline } from "@/components/organisms/RutaTimeline";
import { SubnavSeccion } from "@/components/molecules/SubnavSeccion";
import { Banda } from "@/components/templates/Banda";
import { PieSitio } from "@/components/organisms/PieSitio";
import { CabeceraSitio } from "@/components/organisms/CabeceraSitio";
import { HeroInstitucional } from "@/components/templates/HeroInstitucional";
import { PatronPanal } from "@/components/atoms/PatronPanal";
import { Proximamente } from "@/components/atoms/Proximamente";
import { Button } from "@/components/ui/button";
import { CIFRAS } from "@/content/institucional/inicio";
import {
  ALIADOS_FUNDADORES,
  APORTES,
  CATEGORIAS_ALIADOS_PENDIENTES,
  CTA_FINAL,
  DEFENDEMOS,
  HACEN_POSIBLE,
  HERO_NOSOTROS,
  MISION,
  QUIENES_SOMOS,
  RUTA,
  VISION,
} from "@/content/institucional/nosotros";
import { PILARES } from "@/content/institucional/pilares";
import { registrarEvento } from "@/lib/analitica";
import {
  BOTON_CONTORNO_NOCHE,
  BOTON_MIEL_NOCHE,
  H2_BANDA,
  HEXAGONO_PUNTA,
  NUMERO_CONTORNO,
  REJILLA_PILARES_PANAL,
} from "@/lib/clases";
import { CONTACTO } from "@/lib/marca";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Cpu,
  GraduationCap,
  Handshake,
  Landmark,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";

/**
 * Cifras de la home que cuentan la escala de ASPAL junto a «Quiénes somos»:
 * países, pilares y la meta 2030 (las 7 etapas son del Mapa de Ruta).
 */
const CIFRAS_QUIENES = CIFRAS.filter((_, i) => i !== 2);

/** Icono por aporte, en el orden de APORTES. */
const ICONOS_APORTES: LucideIcon[] = [
  GraduationCap,
  BookOpen,
  Cpu,
  BarChart3,
  Users,
  Handshake,
  Award,
];

/** Icono por tarjeta de «Quiénes hacen posible», en el orden de HACEN_POSIBLE. */
const ICONOS_GOBIERNO: LucideIcon[] = [Users, Landmark, Handshake];

/** Flecha que avanza al pasar el ratón por su `group` (la única micro-interacción). */
function Flecha({ className }: { className?: string }) {
  return (
    <ArrowRight
      className={cn(
        "transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1",
        className,
      )}
      aria-hidden="true"
    />
  );
}

/** Insignia hexagonal con icono (Cómo aportamos, Quiénes hacen posible). */
function Insignia({ icono: Icono, miel = false }: { icono: LucideIcon; miel?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-14 w-12 shrink-0 items-center justify-center",
        HEXAGONO_PUNTA,
        miel
          ? "bg-secondary text-secondary-foreground"
          : "bg-noche text-noche-foreground",
      )}
      aria-hidden="true"
    >
      <Icono className="h-5 w-5" />
    </span>
  );
}

/**
 * Nosotros (§6.2): los 10 bloques del Concepto NOSOTROS, en su orden, con el
 * lenguaje visual de la home (panal, números en contorno, entradas al ver).
 */
export function Nosotros() {
  const clasesEnlace =
    "group inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline underline-offset-4";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CabeceraSitio />
      <SubnavSeccion />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* 1. Hero: el panal del isotipo se arma al cargar */}
        <HeroInstitucional
          overline="Nosotros"
          titulo={HERO_NOSOTROS.tagline}
          visual={<PatronPanal animado />}
        >
          <p>{HERO_NOSOTROS.parrafo}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="secondary" className={BOTON_MIEL_NOCHE} asChild>
              <Link
                href="/unete"
                className="group"
                onClick={() => registrarEvento("click_unete", { origen: "nosotros" })}
                data-testid="button-nosotros-unete"
              >
                Únete a la comunidad
                <Flecha />
              </Link>
            </Button>
            <Button variant="outline" className={BOTON_CONTORNO_NOCHE} asChild>
              <a href="#lo-que-defendemos" data-testid="button-nosotros-propuesta">
                Conoce nuestra propuesta de valor
              </a>
            </Button>
          </div>
        </HeroInstitucional>

        {/* 2. Quiénes somos: entrada editorial y cifras que cuentan */}
        <Banda id="quienes-somos">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className={H2_BANDA}>Quiénes somos</h2>
              <p className="mt-6 text-xl font-medium leading-relaxed text-foreground md:text-2xl">
                {QUIENES_SOMOS[0]}
              </p>
              {QUIENES_SOMOS.slice(1).map((parrafo) => (
                <p
                  key={parrafo.slice(0, 20)}
                  className="mt-4 text-lg text-muted-foreground"
                >
                  {parrafo}
                </p>
              ))}
            </div>
            <dl
              className="grid content-start gap-8 sm:grid-cols-3 lg:col-span-4 lg:col-start-9 lg:grid-cols-1 lg:border-l lg:border-border lg:pl-10"
              data-testid="cifras-nosotros"
            >
              {CIFRAS_QUIENES.map((cifra) => (
                <div key={cifra.valor} className="flex flex-col">
                  <dt className="order-2 mt-1 text-lg text-muted-foreground">
                    {cifra.etiqueta}
                  </dt>
                  <dd className="order-1 text-5xl font-extrabold text-primary">
                    <CifraAnimada valor={cifra.valor} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Banda>

        {/* 3. Nuestra esencia: declaraciones en grande sobre noche */}
        <Banda id="esencia" tono="noche">
          <h2 className="text-3xl font-bold md:text-4xl">Nuestra esencia</h2>
          <div className="mt-10 grid gap-12 lg:grid-cols-2">
            <article>
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-secondary">
                Misión
              </h3>
              <p className="mt-4 text-xl font-medium leading-relaxed md:text-2xl">
                {MISION}
              </p>
            </article>
            <article className="relative">
              {/* «2030» como marca de agua, detrás del texto. */}
              <span
                className={cn(
                  NUMERO_CONTORNO,
                  "pointer-events-none absolute -bottom-6 right-0 text-[6rem] opacity-20 md:text-[10rem]",
                )}
                data-numero="2030"
                aria-hidden="true"
              />
              <h3 className="relative text-[13px] font-semibold uppercase tracking-wider text-secondary">
                Visión 2030
              </h3>
              <p className="relative mt-4 text-xl font-medium leading-relaxed md:text-2xl">
                {VISION}
              </p>
            </article>
          </div>
          <p
            className="mt-16 text-center text-3xl font-extrabold text-secondary md:text-5xl"
            data-testid="text-nosotros-hashtag"
          >
            <Hashtag />
          </p>
        </Banda>

        {/* 4. Lo que defendemos: manifiesto numerado y la voz del sector */}
        <Banda id="lo-que-defendemos" className="scroll-mt-32">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-32">
                <h2 className={H2_BANDA}>Lo que defendemos</h2>
                <div className="mt-8 hidden justify-center rounded-3xl bg-accent p-6 sm:flex">
                  <img
                    src={ilustracionVoz}
                    alt=""
                    width={960}
                    height={1102}
                    loading="lazy"
                    decoding="async"
                    className="h-56 w-auto md:h-64"
                    data-testid="img-nosotros-defendemos"
                  />
                </div>
              </div>
            </div>
            <div className="lg:col-span-8">
              <ManifiestoNumerado items={DEFENDEMOS} />
            </div>
          </div>
        </Banda>

        {/* 5. Los 4 Pilares, como en la home */}
        <Banda id="pilares" tono="suave">
          <h2 className={H2_BANDA}>Los 4 Pilares ASPAL</h2>
          <ul className={cn("mt-8", REJILLA_PILARES_PANAL)}>
            {PILARES.map((pilar, i) => (
              <li key={pilar.id}>
                <PilarCard pilar={pilar} ilustracion numero={i + 1} />
              </li>
            ))}
          </ul>
        </Banda>

        {/* 6. Cómo aportamos: el título ocupa la primera celda de la rejilla */}
        <Banda>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-end md:col-span-2 xl:col-span-1">
              <h2 className={H2_BANDA}>Cómo aportamos al sector asociativo LATAM</h2>
            </div>
            <ul className="contents">
              {APORTES.map((aporte, i) => (
                <li
                  key={aporte.slice(0, 20)}
                  className="flex flex-col rounded-2xl border border-border bg-background p-6"
                >
                  <Insignia icono={ICONOS_APORTES[i] ?? Award} />
                  <p className="mt-4 text-lg text-foreground">{aporte}</p>
                </li>
              ))}
            </ul>
          </div>
        </Banda>

        {/* 7. Ruta 2026–2030: camino que se traza */}
        <Banda id="ruta" tono="suave">
          <h2 className={H2_BANDA}>Ruta ASPAL 2026–2030</h2>
          <p className="mt-3 text-lg text-muted-foreground">Nuestras metas, año a año.</p>
          <div className="mt-10">
            <RutaTimeline hitos={RUTA} />
          </div>
        </Banda>

        {/* 8. Quiénes hacen posible ASPAL */}
        <Banda>
          <h2 className={H2_BANDA}>Quiénes hacen posible ASPAL</h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {HACEN_POSIBLE.map((tarjeta, i) => (
              <li key={tarjeta.titulo}>
                <article className="flex h-full flex-col rounded-2xl border border-border bg-background p-6 md:p-8">
                  <Insignia icono={ICONOS_GOBIERNO[i] ?? Users} miel />
                  <h3 className="mt-4 text-xl font-bold text-foreground">
                    {tarjeta.titulo}
                  </h3>
                  <p className="mt-3 text-base text-muted-foreground">{tarjeta.texto}</p>
                  <div className="mt-auto pt-4">
                    {tarjeta.enlace.href ? (
                      tarjeta.enlace.href.startsWith("/") ? (
                        <Link
                          href={tarjeta.enlace.href}
                          data-testid={`enlace-hacen-posible-${i}`}
                          className={clasesEnlace}
                        >
                          {tarjeta.enlace.etiqueta}
                          <Flecha className="h-4 w-4" />
                        </Link>
                      ) : (
                        <a
                          href={tarjeta.enlace.href}
                          data-testid={`enlace-hacen-posible-${i}`}
                          className={clasesEnlace}
                        >
                          {tarjeta.enlace.etiqueta}
                          <Flecha className="h-4 w-4" />
                        </a>
                      )
                    ) : (
                      <span className="inline-flex min-h-11 items-center gap-2 text-muted-foreground">
                        {tarjeta.enlace.etiqueta} <Proximamente />
                      </span>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </Banda>

        {/* 9. Aliados */}
        <Banda id="aliados" tono="suave" className="scroll-mt-32">
          <h2 className={H2_BANDA}>Aliados estratégicos</h2>
          <div className="mt-8">
            <MuroAliados
              fundadores={ALIADOS_FUNDADORES}
              pendientes={CATEGORIAS_ALIADOS_PENDIENTES}
            />
          </div>
        </Banda>

        {/* 10. Únete a la casa común: cierra con el panal con que abre */}
        <Banda tono="noche">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="text-3xl font-extrabold md:text-5xl">
                <Hashtag />
              </h2>
              {CTA_FINAL.map((parrafo) => (
                <p
                  key={parrafo.slice(0, 20)}
                  className="mt-4 max-w-2xl text-lg text-white/85"
                >
                  {parrafo}
                </p>
              ))}
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="secondary" className={BOTON_MIEL_NOCHE} asChild>
                  <Link
                    href="/unete"
                    className="group"
                    onClick={() => registrarEvento("click_unete", { origen: "nosotros" })}
                    data-testid="button-nosotros-membresias"
                  >
                    Explorar membresías
                    <Flecha />
                  </Link>
                </Button>
                <Button variant="outline" className={BOTON_CONTORNO_NOCHE} asChild>
                  <a href="#boletin" data-testid="button-nosotros-boletin">
                    Suscribirme al boletín
                  </a>
                </Button>
                {/* PENDIENTE (Etapa 0): /contacto. Mientras tanto, correo. */}
                <Button variant="outline" className={BOTON_CONTORNO_NOCHE} asChild>
                  <a
                    href={`mailto:${CONTACTO.correo}`}
                    data-testid="button-nosotros-contacto"
                  >
                    Contactar al equipo
                  </a>
                </Button>
              </div>
            </div>
            <div className="hidden lg:col-span-5 lg:block">
              <PatronPanal />
            </div>
          </div>
        </Banda>
      </main>
      <PieSitio />
    </div>
  );
}
