import { CabeceraSitio } from "@/components/organisms/CabeceraSitio";
import { DocumentoLegal } from "@/components/organisms/DocumentoLegal";
import { PieSitio } from "@/components/organisms/PieSitio";
import { Banda } from "@/components/templates/Banda";
import { HeroInstitucional } from "@/components/templates/HeroInstitucional";
import { TERMINOS } from "@/content/institucional/documentos-legales";

/** Términos de uso: el reglamento de la comunidad de WordPress, en una página propia. */
export function Terminos() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CabeceraSitio />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        <HeroInstitucional overline="Legal" titulo={TERMINOS.titulo}>
          <p>Reglamento de la comunidad y código de etiqueta.</p>
        </HeroInstitucional>
        <Banda>
          <DocumentoLegal documento={TERMINOS} />
        </Banda>
      </main>
      <PieSitio />
    </div>
  );
}
