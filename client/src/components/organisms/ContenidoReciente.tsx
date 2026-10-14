import { FranjaPodcast } from "@/components/organisms/FranjaPodcast";
import { Banda } from "@/components/layout/Banda";
import { useEnCliente } from "@/hooks/use-en-cliente";
import { H2_BANDA, NUMERO_CONTORNO } from "@/lib/clases";
import { vistaReciente, type EstadoConsulta } from "@/lib/contenido-reciente";
import { cn } from "@/lib/utils";
import type { TransformedPost } from "@shared/wordpress/types";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

async function cargar(url: string): Promise<TransformedPost[]> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`Error al cargar ${url}: ${respuesta.status}`);
  return respuesta.json();
}

function estado(consulta: UseQueryResult<TransformedPost[]>): EstadoConsulta {
  return {
    pendiente: consulta.isPending,
    error: consulta.isError,
    cantidad: consulta.data?.length ?? 0,
  };
}

const REINTENTO = {
  retry: 2,
  retryDelay: (intento: number) => Math.min(1000 * 2 ** intento, 8000),
};

/** Anillo de foco de los enlaces de esta banda. */
const FOCO =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Flecha de enlace externo que se desplaza en diagonal al pasar el ratón. */
function FlechaExterna() {
  return (
    <ArrowUpRight
      className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      aria-hidden="true"
    />
  );
}

/**
 * El artículo más reciente como portada: imagen 16:9, titular grande y
 * extracto. Nombre accesible corto (sin el extracto), como en TarjetaArticulo.
 */
function ArticuloPortada({ post }: { post: TransformedPost }) {
  return (
    <a
      href={post.link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-background",
        FOCO,
      )}
      aria-label={`Artículo destacado: ${post.title} (se abre en otra pestaña)`}
      data-testid={`portada-post-${post.id}`}
    >
      <span className="block aspect-video overflow-hidden bg-muted">
        {post.featuredImage && (
          <img
            src={post.featuredImage}
            alt=""
            width={1600}
            height={900}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
      </span>
      <span className="flex flex-1 flex-col p-6 md:p-8">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-miel-texto">
          Artículo destacado
        </span>
        <h3 className="mt-2 text-3xl font-bold leading-tight text-foreground md:text-4xl">
          {post.title}
        </h3>
        {post.excerpt && (
          <span className="mt-3 line-clamp-3 text-lg text-muted-foreground">
            {post.excerpt}
          </span>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 font-medium text-primary">
          Leer artículo
          <FlechaExterna />
        </span>
      </span>
    </a>
  );
}

/** Uno de los artículos siguientes: número en contorno, miniatura y titular. */
function ArticuloLista({ post, numero }: { post: TransformedPost; numero: number }) {
  return (
    <a
      href={post.link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("group flex gap-5 rounded-2xl py-6", FOCO)}
      aria-label={`Artículo: ${post.title} (se abre en otra pestaña)`}
      data-testid={`lista-post-${post.id}`}
    >
      <span
        className={cn(NUMERO_CONTORNO, "w-16 shrink-0 text-5xl")}
        data-numero={String(numero).padStart(2, "0")}
        aria-hidden="true"
      />
      <span className="min-w-0">
        {post.featuredImage && (
          <img
            src={post.featuredImage}
            alt=""
            width={1600}
            height={900}
            loading="lazy"
            decoding="async"
            className="aspect-video w-full max-w-xs rounded-xl object-cover"
          />
        )}
        <h3 className="mt-3 text-xl font-bold leading-snug text-foreground">
          {post.title}
        </h3>
        {post.excerpt && (
          <span className="mt-1 line-clamp-2 text-muted-foreground">{post.excerpt}</span>
        )}
        <span className="mt-2 inline-flex items-center gap-1.5 font-medium text-primary">
          Leer
          <FlechaExterna />
        </span>
      </span>
    </a>
  );
}

/** Esqueleto con la forma de la portada, mientras cargan las consultas. */
function Esqueleto() {
  const bloque = "animate-pulse rounded-3xl bg-muted motion-reduce:animate-none";
  return (
    <div className="mt-8" aria-hidden="true">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className={cn(bloque, "h-[32rem] lg:col-span-7")} />
        <div className="space-y-6 lg:col-span-5">
          <div className={cn(bloque, "h-60")} />
          <div className={cn(bloque, "h-60")} />
        </div>
      </div>
      <div className={cn(bloque, "mt-6 h-40")} />
    </div>
  );
}

/**
 * Contenido reciente de la home (RF-13) como portada de revista: el artículo
 * más reciente en grande, los dos siguientes en lista numerada y el último
 * episodio del podcast como franja-reproductor. Sin fechas a la vista: están
 * en /blog y en cada artículo.
 *
 * Si la API falla, el bloque desaparece y el resto de la home sigue igual; si
 * falla solo una de las dos consultas, se pinta la parte que llegó.
 *
 * En el HTML prerenderizado (y para quien no ejecuta JavaScript) sale solo el
 * título con el enlace al blog: las consultas no corren en el servidor, y un
 * esqueleto ahí sería un «Cargando…» que nunca termina. El esqueleto aparece
 * al montar, cuando las consultas ya están en marcha.
 */
export function ContenidoReciente() {
  const montado = useEnCliente();

  const articulos = useQuery<TransformedPost[]>({
    queryKey: ["/api/posts", { per_page: 3 }],
    queryFn: () => cargar("/api/posts?per_page=3"),
    ...REINTENTO,
  });
  const episodios = useQuery<TransformedPost[]>({
    queryKey: ["/api/podcasts", { per_page: 1 }],
    queryFn: () => cargar("/api/podcasts?per_page=1"),
    ...REINTENTO,
  });

  const vista = vistaReciente(estado(articulos), estado(episodios));
  if (vista === "oculta") return null;

  const [principal, ...siguientes] = articulos.data ?? [];
  const episodio = episodios.data?.[0];

  return (
    <Banda tono="suave" id="contenido-reciente">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className={H2_BANDA}>Contenido reciente</h2>
        <Link
          href="/blog"
          className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline underline-offset-4"
          data-testid="link-home-blog"
        >
          Ver todo el blog
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {!montado ? null : vista === "cargando" ? (
        <>
          <p className="sr-only" role="status">
            Cargando contenido reciente…
          </p>
          <Esqueleto />
        </>
      ) : (
        <>
          {principal && (
            <div className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className={siguientes.length > 0 ? "lg:col-span-7" : "lg:col-span-12"}>
                <ArticuloPortada post={principal} />
              </div>
              {siguientes.length > 0 && (
                <ol className="lg:col-span-5" data-testid="lista-reciente">
                  {siguientes.map((post, i) => (
                    <li
                      key={post.id}
                      className="border-b border-border first:border-t lg:first:border-t-0 lg:[&:first-child>a]:pt-0"
                    >
                      <ArticuloLista post={post} numero={i + 1} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
          {episodio && (
            <div className={principal ? "mt-6" : "mt-8"}>
              <FranjaPodcast episodio={episodio} />
            </div>
          )}
        </>
      )}
    </Banda>
  );
}
