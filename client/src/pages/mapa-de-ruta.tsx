import { IndiceMapa } from "@/components/molecules/IndiceMapa";
import { NavEtapas } from "@/components/molecules/NavEtapas";
import { PanalEtapas } from "@/components/institucional/PanalEtapas";
import { SeccionEtapa } from "@/components/institucional/SeccionEtapa";
import { AvisoPestanaNueva } from "@/components/atoms/AvisoPestanaNueva";
import { Banda } from "@/components/layout/Banda";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { HeroInstitucional } from "@/components/layout/HeroInstitucional";
import { PatronPanal } from "@/components/atoms/PatronPanal";
import { Button } from "@/components/ui/button";
import { ETAPAS, MAPA_RUTA } from "@/content/institucional/mapa-ruta";
import { registrarEvento } from "@/lib/analitica";
import { BOTON_CONTORNO_NOCHE, BOTON_MIEL_NOCHE, H2_BANDA } from "@/lib/clases";
import { COMUNIDAD } from "@/lib/navegacion";
import { ArrowRight, ArrowUpRight, Download } from "lucide-react";
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
 * Mapa de Ruta (§6.5): las 7 etapas de la guía oficial como un recorrido. La
 * flor del panal del hero y el índice dan la escala (pasos y etapas); la barra
 * fija sigue el avance por las etapas, y cada una traza su camino de pasos.
 * Los foros por etapa llegan en la Etapa 2 del plan.
 */
export default function MapaDeRuta() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* 1. Hero: el mapa como flor del panal */}
        <HeroInstitucional
          overline="Mapa de Ruta"
          titulo={MAPA_RUTA.titulo}
          visual={<PanalEtapas />}
        >
          <p>{MAPA_RUTA.subtitulo}</p>
          <p className="mt-4">{MAPA_RUTA.comoUsar}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="secondary" className={BOTON_MIEL_NOCHE} asChild>
              <a href="#etapa-1" className="group" data-testid="button-mapa-empezar">
                Empieza por la Etapa 1
                <Flecha />
              </a>
            </Button>
            <Button variant="outline" className={BOTON_CONTORNO_NOCHE} asChild>
              <a
                href={MAPA_RUTA.pdf.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  registrarEvento("click_mapa_ruta", { origen: "descarga_pdf" })
                }
                data-testid="button-mapa-pdf"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Descarga el mapa (PDF, {MAPA_RUTA.pdf.peso})
                <AvisoPestanaNueva />
              </a>
            </Button>
          </div>
        </HeroInstitucional>

        {/* 2. Índice: la escala del mapa de un vistazo */}
        <Banda>
          <h2 className={H2_BANDA}>Las {ETAPAS.length} etapas</h2>
          <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
            {MAPA_RUTA.recorrer}
          </p>
          <div className="mt-8">
            <IndiceMapa />
          </div>
        </Banda>

        {/* 3. El recorrido: la barra de progreso solo se fija sobre las etapas */}
        <div>
          <NavEtapas />
          {ETAPAS.map((etapa, i) => (
            <SeccionEtapa
              key={etapa.id}
              etapa={etapa}
              anterior={ETAPAS[i - 1]}
              siguiente={ETAPAS[i + 1]}
            />
          ))}
        </div>

        {/* 4. Cierre: llevar el mapa a la práctica en la comunidad */}
        <Banda tono="noche">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="text-3xl font-bold md:text-4xl">
                {MAPA_RUTA.impulsa.titulo}
              </h2>
              <p className="mt-4 text-lg text-white/85">{MAPA_RUTA.impulsa.texto}</p>
              <p className="mt-3 text-lg text-white/85">{MAPA_RUTA.checkList}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="secondary" className={BOTON_MIEL_NOCHE} asChild>
                  <Link
                    href="/unete"
                    className="group"
                    onClick={() =>
                      registrarEvento("click_unete", { origen: "mapa_ruta" })
                    }
                    data-testid="button-mapa-unete"
                  >
                    Únete a la comunidad
                    <Flecha />
                  </Link>
                </Button>
                <Button variant="outline" className={BOTON_CONTORNO_NOCHE} asChild>
                  <a
                    href={COMUNIDAD}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      registrarEvento("salida_plataforma", {
                        destino: COMUNIDAD,
                        origen: "mapa_ruta",
                      })
                    }
                    data-testid="button-mapa-comunidad"
                  >
                    Ir a la comunidad
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    <AvisoPestanaNueva />
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
      <Footer />
    </div>
  );
}
