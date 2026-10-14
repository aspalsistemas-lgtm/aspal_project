import { CabeceraSitio } from "@/components/organisms/CabeceraSitio";
import { DocumentoLegal } from "@/components/organisms/DocumentoLegal";
import { PieSitio } from "@/components/organisms/PieSitio";
import { Banda } from "@/components/templates/Banda";
import { HeroInstitucional } from "@/components/templates/HeroInstitucional";
import { AVISO_PRIVACIDAD } from "@/content/institucional/documentos-legales";

/** Aviso de privacidad: el de la comunidad en WordPress, en una página propia. */
export function AvisoDePrivacidad() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CabeceraSitio />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        <HeroInstitucional overline="Legal" titulo={AVISO_PRIVACIDAD.titulo}>
          <p data-testid="text-legal-actualizado">
            Última actualización: {AVISO_PRIVACIDAD.actualizado}
          </p>
        </HeroInstitucional>
        <Banda>
          <DocumentoLegal documento={AVISO_PRIVACIDAD} />
        </Banda>
      </main>
      <PieSitio />
    </div>
  );
}
