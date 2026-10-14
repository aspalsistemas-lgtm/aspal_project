import { TEXTO_EVENTOS } from "@/content/institucional/inicio";
import { FormSuscripcion } from "@/components/organisms/FormSuscripcion";
import { Banda } from "@/components/layout/Banda";
import Footer from "@/components/organisms/Footer";
import Header from "@/components/organisms/Header";
import { HeroInstitucional } from "@/components/layout/HeroInstitucional";

/**
 * Eventos, en modo «Próximamente» con captura (RF-09). Texto genérico: el
 * pre-anuncio del Encuentro CDMX 2027 espera la decisión 10 del DG.
 * PENDIENTE (Etapa 3): calendario de eventos y webinars.
 */
export default function Eventos() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        <HeroInstitucional overline="Próximamente" titulo="Eventos">
          <p>
            {TEXTO_EVENTOS} Déjanos tu correo y te avisamos en cuanto abramos
            inscripciones.
          </p>
        </HeroInstitucional>
        <Banda tono="suave">
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-background p-6 md:p-8">
            <h2 className="text-2xl font-semibold text-foreground">Avísame</h2>
            <div className="mt-6">
              <FormSuscripcion origen="eventos" variante="compacto" />
            </div>
          </div>
        </Banda>
      </main>
      <Footer conBoletin={false} />
    </div>
  );
}
