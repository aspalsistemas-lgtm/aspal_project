import BlogCard from "@/components/content/BlogCard";
import { EpisodioFila } from "@/components/content/EpisodioFila";
import { FranjaPodcast } from "@/components/content/FranjaPodcast";
import { PortadaPodcast } from "@/components/content/PortadaPodcast";
import { VerMas } from "@/components/content/VerMas";
import { Hashtag } from "@/components/atoms/Hashtag";
import { AvisoPestanaNueva } from "@/components/atoms/AvisoPestanaNueva";
import { Banda } from "@/components/layout/Banda";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { HeroInstitucional } from "@/components/layout/HeroInstitucional";
import { PatronPanal } from "@/components/atoms/PatronPanal";
import { Button } from "@/components/ui/button";
import { CTA_FINAL } from "@/content/institucional/nosotros";
import { useEnCliente } from "@/hooks/use-en-cliente";
import { useListaPaginada } from "@/hooks/use-lista-paginada";
import { registrarEvento } from "@/lib/analitica";
import { BOTON_CONTORNO_NOCHE, BOTON_MIEL_NOCHE, H2_BANDA } from "@/lib/clases";
import { PODCAST_PLATAFORMAS } from "@/lib/marca";
import { cn } from "@/lib/utils";
import type { TransformedPost } from "@shared/wordpress/types";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Headphones } from "lucide-react";
import { Link } from "wouter";

/**
 * Episodios por página de «Ver más». El número de episodio se cuenta desde el
 * total real de la colección (cabecera de /api/podcasts), no desde lo
 * cargado: antes se pedían 6 de 8 y el último salía como «Episodio 6».
 */
const EPISODIOS_POR_PAGINA = 10;

// Un solo fetch fallido no puede quedar cacheado como "no hay contenido".
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

/** Esqueleto con la forma de la franja y la lista. */
function Esqueleto() {
  const bloque = "animate-pulse rounded-3xl bg-muted motion-reduce:animate-none";
  return (
    <div aria-hidden="true">
      <div className={cn(bloque, "h-40")} />
      <div className="mt-16 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn(bloque, "h-28 rounded-2xl")} />
        ))}
      </div>
    </div>
  );
}

/**
 * Podcast Conexión Profesional (pilar Conocimiento), con el lenguaje de la
 * home: el último episodio como reproductor, la lista numerada de todos con
 * «Ver más» de 10 en 10, los últimos artículos del blog y el cierre. Los
 * episodios se abren en la comunidad (tras el muro de MemberPress, como los
 * artículos).
 *
 * En el HTML prerenderizado salen el hero y el cierre: las consultas no corren
 * en el servidor, y un esqueleto ahí sería un «Cargando…» que nunca termina.
 */
export default function PodcastPage() {
  const montado = useEnCliente();

  const episodios = useListaPaginada("/api/podcasts", EPISODIOS_POR_PAGINA);
  const articulos = useQuery<TransformedPost[]>({
    queryKey: ["/api/posts", { per_page: 3 }],
    queryFn: () => cargar("/api/posts?per_page=3"),
    ...REINTENTO,
  });

  const lista = episodios.items;
  const [ultimo] = lista;
  const posts = articulos.data ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* 1. Hero: el podcast y dónde escucharlo */}
        <HeroInstitucional
          overline="Podcast · Pilar Conocimiento"
          titulo="Conexión Profesional"
          visual={<PortadaPodcast />}
        >
          <p data-testid="text-hero-subtitle">
            El podcast que explora y fortalece las redes en asociaciones profesionales.
            Descubre en cada episodio estrategias innovadoras e historias que inspiran
            éxito y sostenibilidad en el mundo profesional.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {PODCAST_PLATAFORMAS.map((plataforma, i) => (
              <Button
                key={plataforma.nombre}
                variant={i === 0 ? "secondary" : "outline"}
                className={i === 0 ? BOTON_MIEL_NOCHE : BOTON_CONTORNO_NOCHE}
                asChild
              >
                <a
                  href={plataforma.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    registrarEvento("salida_plataforma", {
                      destino: plataforma.href,
                      origen: "podcast",
                    })
                  }
                  data-testid={plataforma.testid}
                >
                  <Headphones className="h-4 w-4" aria-hidden="true" />
                  Escúchalo en {plataforma.nombre}
                  <AvisoPestanaNueva />
                </a>
              </Button>
            ))}
          </div>
        </HeroInstitucional>

        {/* 2. Episodios: el último como reproductor y la lista numerada */}
        <Banda id="episodios">
          {!montado ? null : episodios.isPending ? (
            <>
              <p className="sr-only" role="status">
                Cargando episodios…
              </p>
              <Esqueleto />
            </>
          ) : episodios.isError ? (
            <div className="py-12 text-center" data-testid="state-podcasts-error">
              <p className="text-lg font-semibold text-foreground">
                No hemos podido cargar los episodios
              </p>
              <p className="mt-2 text-muted-foreground">
                Puede ser un problema temporal de conexión.
              </p>
              <Button
                className="mt-6 min-h-11 px-6"
                onClick={() => episodios.reintentar()}
                disabled={episodios.isFetching}
                data-testid="button-retry-podcasts"
              >
                {episodios.isFetching ? "Reintentando…" : "Reintentar"}
              </Button>
            </div>
          ) : lista.length === 0 ? (
            <p
              className="py-12 text-center text-lg text-muted-foreground"
              data-testid="text-no-podcasts"
            >
              No hay episodios disponibles en este momento.
            </p>
          ) : (
            <>
              {ultimo && <FranjaPodcast episodio={ultimo} />}
              <div className="mt-16 flex flex-wrap items-end justify-between gap-4">
                <h2 className={H2_BANDA} data-testid="text-episodes-title">
                  Todos los episodios
                </h2>
                <p className="text-lg text-muted-foreground">
                  {episodios.total} {episodios.total === 1 ? "episodio" : "episodios"}
                </p>
              </div>
              <ol className="mt-6 divide-y divide-border border-y border-border">
                {lista.map((episodio, i) => (
                  <li key={episodio.id}>
                    {/* Numerado desde el total de la colección, no de lo cargado. */}
                    <EpisodioFila episodio={episodio} numero={episodios.total - i} />
                  </li>
                ))}
              </ol>
              <VerMas
                mostrados={lista.length}
                total={episodios.total}
                nombre="episodios"
                hayMas={episodios.hayMas}
                cargando={episodios.cargandoMas}
                error={episodios.errorAlCargarMas}
                onCargarMas={() => episodios.cargarMas()}
                testid="button-podcast-ver-mas"
              />
            </>
          )}
        </Banda>

        {/* 3. El pilar también se lee: últimos artículos (si llegan) */}
        {montado && posts.length > 0 && (
          <Banda tono="suave">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className={H2_BANDA}>También en el blog</h2>
              <Link
                href="/blog"
                className="group inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline underline-offset-4"
                data-testid="link-podcast-blog"
              >
                Todos los artículos
                <Flecha className="h-4 w-4" />
              </Link>
            </div>
            <ul className="mt-8 grid gap-6 md:grid-cols-3">
              {posts.map((post) => (
                <li key={post.id}>
                  <BlogCard post={post} />
                </li>
              ))}
            </ul>
          </Banda>
        )}

        {/* 4. Cierre: la red detrás de cada conversación */}
        <Banda tono="noche">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="text-3xl font-extrabold text-secondary md:text-5xl">
                <Hashtag />
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-white/85">{CTA_FINAL[1]}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="secondary" className={BOTON_MIEL_NOCHE} asChild>
                  <Link
                    href="/unete"
                    className="group"
                    onClick={() => registrarEvento("click_unete", { origen: "podcast" })}
                    data-testid="button-podcast-unete"
                  >
                    Únete a la comunidad
                    <Flecha />
                  </Link>
                </Button>
                <Button variant="outline" className={BOTON_CONTORNO_NOCHE} asChild>
                  <Link
                    href="/que-hacemos#conocimiento"
                    data-testid="button-podcast-pilar"
                  >
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
      <Footer />
    </div>
  );
}
