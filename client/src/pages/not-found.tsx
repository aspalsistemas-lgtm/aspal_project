import iconoAspal from "@assets/Aspal-Icono_1763675356866.webp";
import { AvisoPestanaNueva } from "@/components/atoms/AvisoPestanaNueva";
import { PieSitio } from "@/components/organisms/PieSitio";
import { CabeceraSitio } from "@/components/organisms/CabeceraSitio";
import { Button } from "@/components/ui/button";
import { registrarEvento } from "@/lib/analitica";
import { rutaAnterior } from "@/lib/historial";
import { URL_LOGIN, type DestinoNav } from "@/lib/navegacion";
import { URL_SITIO } from "@/lib/marca";
import { SEO_404 } from "@/lib/seo";
import { destinosSugeridos, enlaceReporte, sugerirRuta } from "@/lib/sugerencias";
import { ArrowRight, ArrowUpRight, Home, LogIn, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

/** Un destino real del menú, como salida del 404. */
function DestinoSugerido({ destino }: { destino: DestinoNav }) {
  const Icono = destino.icono;
  const clases =
    "hover-elevate flex min-h-11 gap-3 rounded-2xl border border-border p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const contenido = (
    <>
      <Icono className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          {destino.etiqueta}
          {destino.externo && (
            <>
              <ArrowUpRight
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <AvisoPestanaNueva />
            </>
          )}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {destino.descripcion}
        </span>
      </span>
    </>
  );

  return (
    <li>
      {destino.externo ? (
        <a
          href={destino.href}
          target="_blank"
          rel="noopener noreferrer"
          className={clases}
          data-testid={`404-${destino.testid}`}
        >
          {contenido}
        </a>
      ) : (
        <Link
          href={destino.href!}
          className={clases}
          data-testid={`404-${destino.testid}`}
        >
          {contenido}
        </Link>
      )}
    </li>
  );
}

/**
 * 404 del sitio, pensado para quien se perdió y no para el servidor.
 *
 * Responde a las tres preguntas de quien llega aquí: qué pasó (lenguaje llano,
 * sin culpas), cómo lo arreglo (la ruta que probablemente quería, en un clic) y
 * a dónde voy ahora (salidas reales del menú, más iniciar sesión, porque mucha
 * gente llega desde enlaces viejos de la plataforma de comunidad). Y facilita
 * avisar del enlace roto con un correo ya escrito.
 *
 * El mismo componente produce el `404.html` prerenderizado, que es uno solo
 * para todas las direcciones inexistentes. Por eso la ruta pedida y lo que
 * depende de ella (sugerencia, correo) se pintan solo en el navegador: en el
 * servidor mostrarían una dirección que nadie pidió.
 */
export function NotFound() {
  const [ruta] = useLocation();
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const [referente, setReferente] = useState<string | null>(null);

  useEffect(() => {
    // Dentro de la SPA `document.referrer` sigue siendo el origen externo
    // inicial: si venimos de otra página del sitio, esa es el origen real.
    const interna = rutaAnterior(ruta);
    const origen = interna ? `${URL_SITIO}${interna}` : document.referrer;
    setReferente(origen);
    document.title = SEO_404.titulo;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", SEO_404.descripcion);
    // Como en los artículos: el lector de pantalla anuncia dónde está.
    tituloRef.current?.focus();
    registrarEvento("error_404", { ruta, referente: origen || "directo" });
  }, [ruta]);

  const enNavegador = referente !== null;
  const sugerencia = enNavegador ? sugerirRuta(ruta) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CabeceraSitio />

      <main
        id="contenido"
        tabIndex={-1}
        className="flex-1 px-4 py-16 md:px-8 md:py-24 focus:outline-none"
      >
        <div className="mx-auto max-w-3xl">
          <img
            src={iconoAspal}
            alt=""
            aria-hidden="true"
            width={512}
            height={641}
            className="h-14 w-auto"
          />

          <p className="mt-6 text-[13px] font-semibold uppercase tracking-wider text-miel-texto">
            Error 404
          </p>
          <h1
            ref={tituloRef}
            tabIndex={-1}
            className="mt-2 text-4xl font-bold text-foreground outline-none md:text-5xl"
            data-testid="text-404-title"
          >
            No encontramos esta página
          </h1>
          <p
            className="mt-4 max-w-2xl text-lg text-muted-foreground"
            data-testid="text-404-message"
          >
            Puede que el enlace esté roto, que la página haya cambiado de dirección o que
            la dirección tenga un error de escritura.
          </p>

          {enNavegador && (
            <p
              className="mt-4 text-base text-muted-foreground"
              data-testid="text-404-ruta"
            >
              Dirección solicitada:{" "}
              <code className="break-all rounded bg-muted px-1.5 py-0.5 text-sm text-foreground">
                {ruta}
              </code>
            </p>
          )}

          {sugerencia && (
            <div
              className="mt-8 rounded-2xl border border-border bg-accent p-5"
              data-testid="card-404-sugerencia"
            >
              <p className="text-lg text-foreground">
                ¿Quisiste decir{" "}
                <code className="break-all font-semibold">{sugerencia}</code>?
              </p>
              <Button
                variant="secondary"
                className="mt-4 min-h-11 px-6"
                asChild
                data-testid="button-404-sugerencia"
              >
                <Link href={sugerencia}>
                  Ir a esa página
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button
              variant={sugerencia ? "outline" : "secondary"}
              className="min-h-11 px-6"
              asChild
              data-testid="button-404-home"
            >
              <Link href="/">
                <Home aria-hidden="true" />
                Ir al inicio
              </Link>
            </Button>
            <a
              href={URL_LOGIN}
              className="inline-flex min-h-11 items-center gap-2 text-base font-medium text-primary underline underline-offset-4"
              data-testid="link-404-login"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              ¿Buscabas tu cuenta? Inicia sesión
            </a>
          </div>

          <section className="mt-14" aria-labelledby="titulo-404-destinos">
            <h2
              id="titulo-404-destinos"
              className="text-2xl font-semibold text-foreground"
            >
              Quizá te interese
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {destinosSugeridos().map((destino) => (
                <DestinoSugerido key={destino.testid} destino={destino} />
              ))}
            </ul>
          </section>

          {enNavegador && (
            <p className="mt-12 border-t border-border pt-6 text-base text-muted-foreground">
              ¿Llegaste aquí desde un enlace de ASPAL?{" "}
              <a
                href={enlaceReporte(ruta, referente)}
                className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline underline-offset-4"
                data-testid="link-404-reportar"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Avísanos y lo corregimos
              </a>
            </p>
          )}
        </div>
      </main>

      <PieSitio />
    </div>
  );
}
