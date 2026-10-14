import { Hashtag } from "@/components/atoms/Hashtag";
import { IndicePilares } from "@/components/molecules/IndicePilares";
import { PanalPilares } from "@/components/organisms/PanalPilares";
import { SeccionPilar } from "@/components/organisms/SeccionPilar";
import { SubnavSeccion } from "@/components/molecules/SubnavSeccion";
import { Banda } from "@/components/layout/Banda";
import Footer from "@/components/organisms/Footer";
import Header from "@/components/organisms/Header";
import { HeroInstitucional } from "@/components/layout/HeroInstitucional";
import { PatronPanal } from "@/components/atoms/PatronPanal";
import { Button } from "@/components/ui/button";
import { MAPA_RUTA } from "@/content/institucional/mapa-ruta";
import { CTA_FINAL, QUIENES_SOMOS } from "@/content/institucional/nosotros";
import { PILARES } from "@/content/institucional/pilares";
import { registrarEvento } from "@/lib/analitica";
import { BOTON_CONTORNO_NOCHE, BOTON_MIEL_NOCHE, H2_BANDA } from "@/lib/clases";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

/** Flecha que avanza al pasar el ratón por su `group`. */
function Flecha() {
  return (
    <ArrowRight
      className="transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1"
      aria-hidden="true"
    />
  );
}

/**
 * ¿Qué hacemos? (§6.3): los 4 pilares, cada uno con su ancla (RF-08), con el
 * lenguaje de la home y Nosotros (panal, números en contorno, entradas al
 * ver). La intro es el segundo párrafo de «Quiénes somos» (las cuatro palancas).
 * PENDIENTE: banda de descarga del Dossier ASPAL 2026 (oculta hasta que exista
 * el PDF; RF-06, evento download_dossier).
 */
export default function QueHacemos() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SubnavSeccion />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* 1. Hero: los 4 pilares como un racimo del panal */}
        <HeroInstitucional
          overline="¿Qué hacemos?"
          titulo="Los 4 Pilares ASPAL"
          visual={<PanalPilares />}
        >
          <p>{QUIENES_SOMOS[1]}</p>
        </HeroInstitucional>

        {/* 2. Índice: los pilares de un vistazo y el salto a cada uno */}
        <Banda className="py-10 md:py-14">
          <IndicePilares />
        </Banda>

        {/* 3–6. Un pilar por sección; la ilustración alterna de lado */}
        {PILARES.map((pilar, i) => (
          <SeccionPilar
            key={pilar.id}
            pilar={pilar}
            numero={i + 1}
            siguiente={PILARES[i + 1]}
          />
        ))}

        {/* 7. Puente al Mapa de Ruta: dónde se aplican los pilares */}
        <Banda>
          <div className="flex flex-col gap-6 rounded-3xl bg-accent p-8 md:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-miel-texto">
                Mapa de Ruta
              </p>
              <h2 className={cn("mt-2", H2_BANDA)}>{MAPA_RUTA.titulo}</h2>
              <p className="mt-3 text-lg text-muted-foreground">{MAPA_RUTA.subtitulo}</p>
            </div>
            <Button className="min-h-11 shrink-0 px-6" asChild>
              <Link
                href="/mapa-de-ruta"
                className="group"
                onClick={() =>
                  registrarEvento("click_mapa_ruta", { origen: "que_hacemos" })
                }
                data-testid="button-que-hacemos-mapa"
              >
                Explora el Mapa de Ruta
                <Flecha />
              </Link>
            </Button>
          </div>
        </Banda>

        {/* 8. Únete a la casa común: cierra con el panal, como Nosotros */}
        <Banda tono="noche">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="text-3xl font-extrabold text-secondary md:text-5xl">
                <Hashtag />
              </h2>
              <p className="mt-3 text-2xl font-bold md:text-3xl">Únete a la casa común</p>
              <p className="mt-4 max-w-2xl text-lg text-white/85">{CTA_FINAL[1]}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="secondary" className={BOTON_MIEL_NOCHE} asChild>
                  <Link
                    href="/unete"
                    className="group"
                    onClick={() =>
                      registrarEvento("click_unete", { origen: "que_hacemos" })
                    }
                    data-testid="button-que-hacemos-unete"
                  >
                    Únete a la comunidad
                    <Flecha />
                  </Link>
                </Button>
                <Button variant="outline" className={BOTON_CONTORNO_NOCHE} asChild>
                  <Link href="/nosotros" data-testid="button-que-hacemos-nosotros">
                    Conoce quiénes somos
                  </Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:col-span-5 lg:block">
              <PatronPanal />
            </div>
          </div>
        </Banda>
      </main>
      <Footer />
    </div>
  );
}
