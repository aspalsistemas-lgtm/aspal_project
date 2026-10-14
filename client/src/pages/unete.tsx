import { FormSuscripcion } from "@/components/organisms/FormSuscripcion";
import { AvisoPestanaNueva } from "@/components/atoms/AvisoPestanaNueva";
import { Banda } from "@/components/templates/Banda";
import { PieSitio } from "@/components/organisms/PieSitio";
import { CabeceraSitio } from "@/components/organisms/CabeceraSitio";
import { HeroInstitucional } from "@/components/templates/HeroInstitucional";
import { Button } from "@/components/ui/button";
import { registrarEvento } from "@/lib/analitica";
import { H2_BANDA } from "@/lib/clases";
import { URL_REGISTRO } from "@/lib/navegacion";
import { ArrowUpRight, BadgeCheck, Mail } from "lucide-react";

/**
 * Únete (§6.6 del plan de la Etapa 1): dos caminos lado a lado, suscriptor
 * gratuito (formulario propio) y membresía básica (plataforma de comunidad).
 * El copy de la cabecera y de «Qué recibes» sale literal del Concepto NOSOTROS
 * (Bloques 10 y 4).
 */
export default function Unete() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CabeceraSitio />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        <HeroInstitucional
          overline="#NingunDirectorDirigeSolo"
          overlineNormal
          titulo="Únete a la casa común"
        >
          <p>
            Si diriges o formas parte del equipo de una asociación, sociedad, colegio o
            federación profesional en América Latina, esta es tu casa.
          </p>
        </HeroInstitucional>

        <Banda tono="suave">
          <div className="grid gap-8 lg:grid-cols-5">
            <div
              className="rounded-2xl border border-border bg-background p-6 md:p-8 lg:col-span-3"
              data-testid="card-unete-gratis"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
                <h2 className="text-2xl font-semibold text-foreground">
                  Suscriptor gratuito
                </h2>
              </div>
              <p className="mt-2 text-lg text-muted-foreground">
                Sin costo. Recibe el boletín de ASPAL en tu correo.
              </p>
              <div className="mt-6">
                <FormSuscripcion origen="unete" variante="completo" />
              </div>
            </div>

            <div
              className="flex flex-col rounded-2xl border border-border bg-background p-6 md:p-8 lg:col-span-2"
              data-testid="card-unete-membresia"
            >
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-6 w-6 text-primary" aria-hidden="true" />
                <h2 className="text-2xl font-semibold text-foreground">
                  Membresía básica
                </h2>
              </div>
              <p className="mt-2 text-lg text-muted-foreground">
                Accede a la plataforma de comunidad de ASPAL.
              </p>
              {/* PENDIENTE (Etapa 3): niveles profesional y grupal con precios. */}
              <p className="mt-4 text-base text-muted-foreground">
                Próximamente: membresías profesional y grupal.
              </p>
              <Button
                variant="outline"
                className="mt-auto min-h-11 self-start px-6"
                asChild
              >
                <a
                  href={URL_REGISTRO}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    registrarEvento("salida_plataforma", {
                      destino: URL_REGISTRO,
                      origen: "unete",
                    })
                  }
                  data-testid="button-unete-membresia"
                >
                  Ir a la membresía básica
                  <ArrowUpRight aria-hidden="true" />
                  <AvisoPestanaNueva />
                </a>
              </Button>
            </div>
          </div>
        </Banda>

        <Banda>
          <h2 className={H2_BANDA}>Qué recibes al unirte</h2>
          <p
            className="mt-4 max-w-3xl text-lg text-muted-foreground"
            data-testid="text-unete-promesa"
          >
            Al unirte a ASPAL dejas de dirigir tu asociación solo. Encuentras un
            directorio de colegas, una biblioteca curada, una plataforma tecnológica lista
            para usar y datos reales del sector para decidir con evidencia.
          </p>
          {/* PENDIENTE: 3 preguntas frecuentes (§6.6). No están en el Concepto
              NOSOTROS; las redacta la Coordinación. */}
        </Banda>
      </main>
      <PieSitio conBoletin={false} />
    </div>
  );
}
