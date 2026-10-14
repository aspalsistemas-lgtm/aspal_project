import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { CabeceraSitio } from "@/components/organisms/CabeceraSitio";
import { PieSitio } from "@/components/organisms/PieSitio";
import { TarjetaArticulo } from "@/components/molecules/TarjetaArticulo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Lock } from "lucide-react";
import { formatPublishedDate } from "@/lib/date";
import { TITULO_SITIO } from "@/lib/marca";
import type { TransformedPost } from "@shared/wordpress/types";

/** URL de alta de socio. Misma que usa CabeceraSitio; los UTM permiten medir
 *  cuánta captación aporta el cierre del artículo, que es la prioridad 1. */
const MEMBERSHIP_URL =
  "https://comunidad.asociacionesprofesionales.org/register/membresia-basica/";

function membershipUrl(slug: string): string {
  const url = new URL(MEMBERSHIP_URL);
  url.searchParams.set("utm_source", "aspal-web");
  url.searchParams.set("utm_medium", "blog");
  url.searchParams.set("utm_campaign", "cierre-articulo");
  url.searchParams.set("utm_content", slug);
  return url.toString();
}

/** Error que conserva el código HTTP, para poder distinguir "no existe" (404)
 *  de "no se pudo cargar" (5xx / red). Antes ambos decían "el artículo que
 *  buscas no existe": le decíamos al usuario que no existe algo que sí existe. */
class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

const RELATED_LIMIT = 3;

export function ArticuloBlog() {
  const params = useParams();
  const slug = params.slug as string;
  const [, navigate] = useLocation();
  const titleRef = useRef<HTMLHeadingElement>(null);

  const {
    data: post,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<TransformedPost, HttpError>({
    queryKey: ["/api/posts", slug],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
      if (!response.ok) {
        throw new HttpError(response.status);
      }
      return response.json();
    },
    enabled: !!slug,
    // Sin reintento, un fallo puntual de red quedaba cacheado toda la sesión
    // por el staleTime: Infinity global. Un 404 sí es definitivo.
    retry: (attempt, err) => err?.status !== 404 && attempt < 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  // "Sigue leyendo", no "artículos relacionados": tras retirar el filtro no
  // queda ninguna señal de relación, son simplemente los más recientes.
  // Comparte caché con la rejilla de /blog. La key lleva objeto, así que
  // necesita queryFn propio: el queryFn por defecto hace queryKey.join("/")
  // y pediría /api/posts/[object Object].
  const { data: recentPosts } = useQuery<TransformedPost[]>({
    queryKey: ["/api/posts", { per_page: 7 }],
    queryFn: async () => {
      const response = await fetch("/api/posts?per_page=7");
      if (!response.ok) throw new Error("No se pudieron cargar los artículos");
      return response.json();
    },
    enabled: !!post,
  });

  const isPodcast = post?.categorySlugs.includes("podcast") ?? false;

  // fetchPostBySlug no filtra por categoría, así que excluir los podcasts de
  // /api/posts no los excluye de /api/posts/:slug. Sin esto un episodio se
  // renderizaría como artículo, con CTA de socios y con su reproductor
  // desbordando en móvil.
  useEffect(() => {
    if (isPodcast) {
      navigate("/podcast", { replace: true });
    }
  }, [isPodcast, navigate]);

  // El foco caía a <body>: un usuario de teclado volvía a recorrer todo el
  // CabeceraSitio en cada navegación y un lector de pantalla no anunciaba nada.
  useEffect(() => {
    if (post && titleRef.current) {
      titleRef.current.focus();
    }
  }, [post]);

  useEffect(() => {
    if (post) {
      document.title = `${post.title} · Blog de ASPAL`;
    }
    return () => {
      document.title = TITULO_SITIO;
    };
  }, [post]);

  if (isLoading || isPodcast) {
    return (
      <div className="min-h-screen bg-background">
        <CabeceraSitio />
        <main id="contenido" tabIndex={-1} className="focus:outline-none">
          <div className="container mx-auto px-4 md:px-8 py-16">
            <div className="max-w-[65ch] mx-auto space-y-8" aria-busy="true">
              <div className="h-8 w-32 bg-muted animate-pulse motion-reduce:animate-none motion-reduce:animate-none rounded" />
              <div className="h-12 bg-muted animate-pulse motion-reduce:animate-none motion-reduce:animate-none rounded" />
              <div className="h-12 w-3/4 bg-muted animate-pulse motion-reduce:animate-none motion-reduce:animate-none rounded" />
              <div className="h-64 bg-muted animate-pulse motion-reduce:animate-none motion-reduce:animate-none rounded-2xl" />
              <div className="space-y-4">
                <div className="h-4 bg-muted animate-pulse motion-reduce:animate-none motion-reduce:animate-none rounded w-full" />
                <div className="h-4 bg-muted animate-pulse motion-reduce:animate-none motion-reduce:animate-none rounded w-5/6" />
                <div className="h-4 bg-muted animate-pulse motion-reduce:animate-none motion-reduce:animate-none rounded w-4/6" />
              </div>
            </div>
          </div>
        </main>
        <PieSitio />
      </div>
    );
  }

  // 404 real frente a fallo de carga: mensajes y salidas distintas.
  if (error || !post) {
    const notFound = error?.status === 404;

    return (
      <div className="min-h-screen bg-background">
        <CabeceraSitio />
        <main id="contenido" tabIndex={-1} className="focus:outline-none">
          <div className="container mx-auto px-4 md:px-8 py-16">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <h1
                className="text-3xl md:text-4xl font-bold text-foreground"
                data-testid="text-error-title"
              >
                {notFound
                  ? "Artículo no encontrado"
                  : "No hemos podido cargar el artículo"}
              </h1>
              <p className="text-muted-foreground" data-testid="text-error-message">
                {notFound
                  ? "El artículo que buscas no existe o ha sido eliminado."
                  : "Puede ser un problema temporal de conexión. Inténtalo de nuevo."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {!notFound && (
                  <Button
                    className="min-h-[44px] px-6"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    data-testid="button-retry-post"
                  >
                    {isFetching ? "Reintentando…" : "Reintentar"}
                  </Button>
                )}
                <Button
                  variant={notFound ? "default" : "outline"}
                  className="min-h-[44px] px-6"
                  asChild
                  data-testid="button-back-to-blog"
                >
                  <Link href="/blog">
                    <ArrowLeft className="mr-2 w-4 h-4" aria-hidden="true" />
                    Volver al blog
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
        <PieSitio />
      </div>
    );
  }

  const publishedLabel = formatPublishedDate(post.publishedAt, "d 'de' MMMM, yyyy");
  const relatedPosts = (recentPosts ?? [])
    .filter((candidate) => candidate.slug !== post.slug)
    .slice(0, RELATED_LIMIT);

  return (
    <div className="min-h-screen bg-background">
      <CabeceraSitio />
      <main id="contenido" tabIndex={-1} className="focus:outline-none">
        <article className="py-12 md:py-20" data-testid="article-post">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-[65ch] mx-auto">
              <Button
                variant="ghost"
                className="mb-8 min-h-[44px] px-4"
                asChild
                data-testid="button-back"
              >
                <Link href="/blog">
                  <ArrowLeft className="mr-2 w-4 h-4" aria-hidden="true" />
                  Volver al blog
                </Link>
              </Button>

              <header className="space-y-6 mb-12">
                {/* La insignia de categoría se retira: decía "Blog" siempre. */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {publishedLabel && (
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" aria-hidden="true" />
                      <time dateTime={post.publishedAt} data-testid="text-date">
                        {publishedLabel}
                      </time>
                    </span>
                  )}
                  {post.readingMinutes > 0 && (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" aria-hidden="true" />
                      {post.readingMinutes} min lectura
                    </span>
                  )}
                </div>

                {/* Tope de tamaño en móvil: text-6xl sin límite llenaba la
                  pantalla entera antes del primer párrafo. */}
                <h1
                  ref={titleRef}
                  tabIndex={-1}
                  className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight focus:outline-none"
                  data-testid="text-title"
                >
                  {post.title}
                </h1>

                {post.excerpt && (
                  <p
                    className="text-lg md:text-xl text-muted-foreground"
                    data-testid="text-excerpt"
                  >
                    {post.excerpt}
                  </p>
                )}
              </header>

              {post.featuredImage && (
                <div className="mb-12 rounded-2xl overflow-hidden shadow-lg">
                  <img
                    src={post.featuredImage}
                    alt=""
                    className="w-full h-auto"
                    data-testid="img-featured"
                  />
                </div>
              )}

              {post.isGated ? (
                /* WordPress no ha servido el artículo, sino el muro de
                 MemberPress. Volcarlo en `prose` mostraría un mensaje en
                 inglés y un formulario de login incrustado. */
                <div
                  className="rounded-2xl border border-border bg-muted/30 p-8 md:p-10 text-center"
                  data-testid="state-post-gated"
                >
                  <Lock
                    className="w-8 h-8 mx-auto text-muted-foreground"
                    aria-hidden="true"
                  />
                  <h2 className="mt-4 text-xl md:text-2xl font-bold">
                    Este artículo es para personas asociadas
                  </h2>
                  <p className="mt-3 text-muted-foreground">
                    Accede con tu cuenta para leerlo completo, o asóciate para entrar a
                    todos los recursos de ASPAL.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <Button
                      size="lg"
                      className="min-h-[44px] bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      asChild
                      data-testid="button-gated-join"
                    >
                      <a
                        href={membershipUrl(post.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Asociarme
                      </a>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="min-h-[44px]"
                      asChild
                      data-testid="button-gated-login"
                    >
                      <a href={post.link} target="_blank" rel="noopener noreferrer">
                        Ya soy socio, iniciar sesión
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Reglas de desbordamiento: sin ellas, una tabla, un <pre> o un
                 iframe del contenido de WordPress provocan scroll horizontal
                 de la página entera en móvil. */
                <div
                  className="prose prose-lg max-w-none
                  prose-headings:text-foreground prose-p:text-foreground
                  prose-strong:text-foreground prose-a:text-primary
                  hover:prose-a:text-primary/80
                  prose-img:rounded-xl prose-img:mx-auto
                  prose-pre:overflow-x-auto
                  [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto
                  [&_iframe]:w-full [&_iframe]:max-w-full [&_iframe]:aspect-video [&_iframe]:h-auto"
                  data-testid="content-body"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              )}
            </div>

            {relatedPosts.length > 0 && (
              <section className="max-w-6xl mx-auto mt-20" data-testid="section-related">
                <h2 className="text-2xl md:text-3xl font-bold mb-8">Sigue leyendo</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {relatedPosts.map((related) => (
                    <TarjetaArticulo key={related.id} post={related} />
                  ))}
                </div>
              </section>
            )}

            {/* Ley de pico-final: el CTA de captación es el último elemento de
              la página. Poner "sigue leyendo" debajo lo enterraría. */}
            <div className="max-w-[65ch] mx-auto mt-20 pt-12 border-t border-border">
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 md:p-12 text-center">
                <h2
                  className="text-2xl md:text-3xl font-bold mb-4"
                  data-testid="text-cta-title"
                >
                  Súmate a la comunidad de ASPAL
                </h2>
                <p
                  className="text-muted-foreground mb-8"
                  data-testid="text-cta-description"
                >
                  Conecta con profesionales de asociaciones de toda Latinoamérica y accede
                  a formación, recursos y eventos exclusivos.
                </p>
                <Button
                  size="lg"
                  className="min-h-[44px] px-8 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  asChild
                  data-testid="button-cta"
                >
                  <a
                    href={membershipUrl(post.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Asociarme a ASPAL
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </article>
      </main>
      <PieSitio />
    </div>
  );
}
