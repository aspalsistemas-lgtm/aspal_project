import logo from "@assets/aspal-logo-fondo-claro.webp";
import { FormSuscripcion } from "@/components/organisms/FormSuscripcion";
import { AvisoPestanaNueva } from "@/components/atoms/AvisoPestanaNueva";
import { Proximamente } from "@/components/atoms/Proximamente";
import { Button } from "@/components/ui/button";
import { registrarEvento } from "@/lib/analitica";
import { CONTACTO, NOMBRE_MARCA, REDES, URL_AVISO_PRIVACIDAD } from "@/lib/marca";
import {
  ENTRADAS_PIE,
  NAVEGACION,
  destinosPie,
  registrarClicDestino,
  type DestinoNav,
  type EntradaNav,
} from "@/lib/navegacion";
import {
  ArrowUpRight,
  Mail,
  MapPin,
  Phone,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";

/** Un dato de contacto que se puede accionar: escribir, llamar o ubicar. */
function Contacto({
  icono: Icono,
  href,
  children,
  testid,
}: {
  icono: LucideIcon;
  href?: string;
  children: React.ReactNode;
  testid: string;
}) {
  const contenido = (
    <>
      <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="[overflow-wrap:anywhere]">{children}</span>
    </>
  );
  const clases = "flex min-h-11 items-start gap-2 py-2 text-sm text-muted-foreground";

  return (
    <li>
      {href ? (
        <a
          href={href}
          className={`${clases} transition-colors hover:text-primary`}
          data-testid={testid}
        >
          {contenido}
        </a>
      ) : (
        <div className={clases} data-testid={testid}>
          {contenido}
        </div>
      )}
    </li>
  );
}

/** Un destino vivo del pie. */
function DestinoPie({ destino }: { destino: DestinoNav }) {
  const clases =
    "flex min-h-11 items-center gap-1.5 py-2 text-sm text-muted-foreground transition-colors hover:text-primary";
  const alPulsar = () => registrarClicDestino(destino, "footer");

  return (
    <li>
      {destino.externo ? (
        <a
          href={destino.href}
          target="_blank"
          rel="noopener noreferrer"
          className={clases}
          onClick={alPulsar}
          data-testid={`footer-${destino.testid}`}
        >
          {destino.etiqueta}
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <AvisoPestanaNueva />
        </a>
      ) : (
        <Link
          href={destino.href!}
          className={clases}
          onClick={alPulsar}
          data-testid={`footer-${destino.testid}`}
        >
          {destino.etiqueta}
        </Link>
      )}
    </li>
  );
}

/**
 * Una columna del pie: los destinos vivos del rubro. Si todavía no tiene
 * ninguno se enlaza a su propia página si la tiene (Eventos ya enlaza a
 * /eventos); si tampoco (Acerca de, hasta el PR E2), se anuncia una sola vez
 * como «Próximamente» en lugar de listar el catálogo pendiente: el pie
 * resume, el catálogo completo es del menú.
 */
function ColumnaPie({ entrada }: { entrada: EntradaNav }) {
  const destinos = destinosPie(entrada);
  return (
    <div>
      <h3
        className="font-semibold text-foreground"
        data-testid={`footer-${entrada.testid}`}
      >
        {entrada.etiqueta}
      </h3>
      {destinos.length > 0 ? (
        <ul className="mt-2">
          {destinos.map((destino) => (
            <DestinoPie key={destino.testid} destino={destino} />
          ))}
        </ul>
      ) : (
        <p className="mt-3">
          <Proximamente />
        </p>
      )}
    </div>
  );
}

/**
 * Pie institucional (§6.7 del plan de la Etapa 1): marca, cuatro columnas de
 * navegación, contacto, y una franja noche con la barra legal.
 *
 * Sin framer-motion: el pie entraba con `whileInView` y opacidad 0, así que en
 * el HTML prerenderizado (y para quien no ejecuta JavaScript) era invisible.
 *
 * `conBoletin`: las páginas que ya traen su propio formulario de suscripción
 * lo desactivan para no repetir el mismo formulario justo encima del pie.
 */
export function PieSitio({ conBoletin = true }: { conBoletin?: boolean }) {
  const columnas = ENTRADAS_PIE.map((id) =>
    NAVEGACION.find((e) => e.testid === id),
  ).filter((entrada): entrada is EntradaNav => entrada !== undefined);

  return (
    <footer className="border-t border-border bg-fondo-suave" data-testid="footer">
      <h2 className="sr-only">Pie de página</h2>

      <div className="container mx-auto px-4 py-16 md:px-8">
        {conBoletin && (
          <div
            id="boletin"
            className="mb-12 grid scroll-mt-32 gap-6 border-b border-border pb-12 lg:grid-cols-2 lg:items-end"
          >
            <div>
              <h3
                className="text-xl font-semibold text-foreground"
                data-testid="text-footer-boletin"
              >
                Recibe el boletín de ASPAL
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Novedades del sector asociativo de América Latina, en tu correo.
              </p>
            </div>
            <FormSuscripcion origen="footer" variante="compacto" />
          </div>
        )}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Marca */}
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-1">
            <img
              src={logo}
              alt={NOMBRE_MARCA}
              width={420}
              height={120}
              loading="lazy"
              className="h-8 w-auto"
              data-testid="img-footer-logo"
            />
            <p
              className="mt-4 text-sm text-muted-foreground"
              data-testid="text-footer-descripcion"
            >
              La red en español del sector asociativo de América Latina.
            </p>
            <div className="mt-4 flex flex-wrap gap-1">
              {REDES.map((red) => (
                <Button
                  key={red.testid}
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11"
                  asChild
                  data-testid={red.testid}
                >
                  <a
                    href={red.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`ASPAL en ${red.nombre} (se abre en otra pestaña)`}
                  >
                    <red.icono className="h-5 w-5" aria-hidden="true" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {columnas.map((entrada) => (
            <ColumnaPie key={entrada.testid} entrada={entrada} />
          ))}

          {/* Contacto */}
          <div>
            <h3
              className="font-semibold text-foreground"
              data-testid="text-footer-contact-title"
            >
              Contacto
            </h3>
            <ul className="mt-2">
              <Contacto
                icono={Mail}
                href={`mailto:${CONTACTO.correo}`}
                testid="text-contact-email"
              >
                {CONTACTO.correo}
              </Contacto>
              <Contacto
                icono={Phone}
                href={`tel:${CONTACTO.telefono.replace(/\s/g, "")}`}
                testid="text-contact-phone"
              >
                {CONTACTO.telefono}
              </Contacto>
              <Contacto icono={MapPin} testid="text-contact-address">
                {CONTACTO.ciudad}
              </Contacto>
            </ul>
            {/* El pie es el final del recorrido: quien llega hasta aquí merece
                encontrar la conversión sin volver arriba. */}
            <Button variant="secondary" className="mt-4 min-h-11 w-full" asChild>
              <Link
                href="/unete"
                onClick={() => registrarEvento("click_unete", { origen: "footer" })}
                data-testid="button-footer-registro"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Únete a ASPAL
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Franja noche: el azul del logotipo cierra la página (§4 del plan). */}
      <div className="bg-noche text-noche-foreground">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-6 text-sm md:flex-row md:flex-wrap md:items-center md:justify-between md:px-8">
          <p data-testid="text-copyright">
            © {new Date().getFullYear()} {NOMBRE_MARCA}
          </p>
          {/* PENDIENTE (Etapa 0): /terminos. */}
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <li className="flex items-center gap-2" data-testid="footer-aviso-privacidad">
              <a
                href={URL_AVISO_PRIVACIDAD}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1 rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-noche"
                data-testid="link-footer-aviso-privacidad"
              >
                Aviso de privacidad
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <AvisoPestanaNueva />
              </a>
            </li>
            <li className="flex items-center gap-2" data-testid="footer-terminos">
              Términos <Proximamente />
            </li>
          </ul>
          <p data-testid="text-footer-respaldo">
            Con el respaldo de World Urban Parks y ANPR México
          </p>
        </div>
      </div>
    </footer>
  );
}
