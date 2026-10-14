import { TarjetaArticulo } from "@/components/molecules/TarjetaArticulo";
import { FranjaPodcast } from "@/components/organisms/FranjaPodcast";
import { VerMas } from "@/components/molecules/VerMas";
import { PortadaArticulo } from "@/components/molecules/PortadaArticulo";
import { IlustracionPilar } from "@/components/atoms/IlustracionPilar";
import { Banda } from "@/components/templates/Banda";
import { PieSitio } from "@/components/organisms/PieSitio";
import { CabeceraSitio } from "@/components/organisms/CabeceraSitio";
import { HeroInstitucional } from "@/components/templates/HeroInstitucional";
import { PatronPanal } from "@/components/atoms/PatronPanal";
import { Button } from "@/components/ui/button";
import { PILARES } from "@/content/institucional/pilares";
import { useEnCliente } from "@/hooks/use-en-cliente";
import { useListaPaginada } from "@/hooks/use-lista-paginada";
import { registrarEvento } from "@/lib/analitica";
import { BOTON_CONTORNO_NOCHE, BOTON_MIEL_NOCHE, H2_BANDA } from "@/lib/clases";
import { cn } from "@/lib/utils";
import type { TransformedPost } from "@shared/wordpress/types";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

/** Artículos por página de «Ver más»: el destacado y 9 en la rejilla, tres
 *  filas completas en la primera vista. Antes se pedían 7 fijos, que hoy son
 *  todos: el octavo habría desaparecido en silencio. */
const POSTS_PER_PAGE = 10;

/** El blog es el pilar Conocimiento: su ilustración, subtítulo y compromiso. */
const CONOCIMIENTO = PILARES.find((p) => p.id === "conocimiento")!;

// Un solo fetch fallido no puede significar "no hay artículos": con
// `retry: false` global, el fallo quedaba cacheado toda la sesión.
const REINTENTO = {
  retry: 2,
  retryDelay: (intento: number) => Math.min(1000 * 2 ** intento, 8000),
};

async function cargar(url: string): Promise<TransformedPost[]> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`Error al cargar ${url}: ${respuesta.status}`);
  return respuesta.json();
}

/** Flecha que avanza al pasar el ratón por su `group`. */
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

/** Esqueleto con la forma de la portada y la rejilla. */
function Esqueleto() {
  const bloque = "animate-pulse rounded-3xl bg-muted motion-reduce:animate-none";
  return (
    <div aria-hidden="true" data-testid="skeleton-posts">
      <div className={cn(bloque, "h-[26rem]")} />
      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn(bloque, "h-96 rounded-2xl")} />
        ))}
      </div>
    </div>
  );
}

/**
 * Blog (pilar Conocimiento), con el lenguaje de la home: el artículo más
 * reciente como portada, el resto en rejilla, el último episodio del podcast y
 * el cierre con el compromiso del pilar. Los artículos se abren en la
 * comunidad (el cuerpo está tras el muro de MemberPress; ver TarjetaArticulo).
 *
 * En el HTML prerenderizado salen el hero y el cierre: las consultas no corren
 * en el servidor, y un esqueleto ahí sería un «Cargando…» que nunca termina.
 * El esqueleto aparece al montar, con las consultas ya en marcha.
 */
export default function Blog() {
  const montado = useEnCliente();

  const articulos = useListaPaginada("/api/posts", POSTS_PER_PAGE);
  const episodios = useQuery<TransformedPost[]>({
    queryKey: ["/api/podcasts", { per_page: 1 }],
    queryFn: () => cargar("/api/podcasts?per_page=1"),
    ...REINTENTO,
  });

  const posts = articulos.items;
  // El destacado solo tiene sentido si queda algo debajo. Con un único
  // artículo, se lo comía el destacado y la rejilla decía "no hay artículos":
  // la página se contradecía a sí misma.
  const destacado = posts.length >= 2 ? posts[0] : undefined;
  const resto = destacado ? posts.slice(1) : posts;
  const episodio = episodios.data?.[0];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CabeceraSitio />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* 1. Hero: el blog es el pilar Conocimiento */}
        <HeroInstitucional
          overline="Blog · Pilar Conocimiento"
          titulo="Artículos de Conocimiento"
          visual={<IlustracionPilar pilar={CONOCIMIENTO} />}
        >
          <p>{CONOCIMIENTO.subtitulo}</p>
          <p className="mt-2">
            Recursos, guías y mejores prácticas para asociaciones profesionales.
          </p>
        </HeroInstitucional>

        {/* 2. Artículos: portada y rejilla (o carga, error, vacío) */}
        <Banda id="articulos">
          {!montado ? null : articulos.isPending ? (
            <>
              <p className="sr-only" role="status">
                Cargando artículos…
              </p>
              <Esqueleto />
            </>
          ) : articulos.isError ? (
            /* Tercer estado, distinto del vacío: antes un WordPress caído
               mostraba "No hay artículos en esta categoría". */
            <div className="py-12 text-center" data-testid="state-posts-error">
              <p className="text-lg font-semibold text-foreground">
                No hemos podido cargar los artículos
              </p>
              <p className="mt-2 text-muted-foreground">
                Puede ser un problema temporal de conexión.
              </p>
              <Button
                className="mt-6 min-h-11 px-6"
                onClick={() => articulos.reintentar()}
                disabled={articulos.isFetching}
                data-testid="button-retry-posts"
              >
                {articulos.isFetching ? "Reintentando…" : "Reintentar"}
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <p
              className="py-12 text-center text-lg text-muted-foreground"
              data-testid="text-no-posts"
            >
              Todavía no hay artículos publicados. Vuelve pronto.
            </p>
          ) : (
            <>
              {destacado && <PortadaArticulo post={destacado} />}
              {resto.length > 0 && (
                <>
                  <h2
                    className={cn(H2_BANDA, destacado && "mt-16")}
                    data-testid="text-grid-title"
                  >
                    {destacado ? "Más artículos" : "Artículos"}
                  </h2>
                  <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {resto.map((post) => (
                      <li key={post.id}>
                        <TarjetaArticulo post={post} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <VerMas
                mostrados={posts.length}
                total={articulos.total}
                nombre="artículos"
                hayMas={articulos.hayMas}
                cargando={articulos.cargandoMas}
                error={articulos.errorAlCargarMas}
                onCargarMas={() => articulos.cargarMas()}
                testid="button-blog-ver-mas"
              />
            </>
          )}
        </Banda>

        {/* 3. El pilar también se escucha: último episodio (si llega) */}
        {montado && episodio && (
          <Banda tono="suave">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className={H2_BANDA}>También en podcast</h2>
              <Link
                href="/podcast"
                className="group inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline underline-offset-4"
                data-testid="link-blog-podcast"
              >
                Todos los episodios
                <Flecha className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8">
              <FranjaPodcast episodio={episodio} />
            </div>
          </Banda>
        )}

        {/* 4. Cierre: el compromiso del pilar y la puerta de entrada */}
        <Banda tono="noche">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-secondary">
                Compromiso ASPAL
              </p>
              <h2 className="mt-2 text-3xl font-bold md:text-4xl">
                {CONOCIMIENTO.compromiso}
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-white/85">
                {CONOCIMIENTO.comoSeTraduce}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="secondary" className={BOTON_MIEL_NOCHE} asChild>
                  <Link
                    href="/unete"
                    className="group"
                    onClick={() => registrarEvento("click_unete", { origen: "blog" })}
                    data-testid="button-blog-unete"
                  >
                    Únete a la comunidad
                    <Flecha />
                  </Link>
                </Button>
                <Button variant="outline" className={BOTON_CONTORNO_NOCHE} asChild>
                  <Link href="/que-hacemos#conocimiento" data-testid="button-blog-pilar">
                    Conoce el pilar Conocimiento
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
      <PieSitio />
    </div>
  );
}
