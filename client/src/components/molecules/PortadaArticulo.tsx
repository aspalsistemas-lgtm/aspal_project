import { AvisoMiembros } from "@/components/atoms/AvisoMiembros";
import { MetaArticulo } from "@/components/molecules/MetaArticulo";
import { cn } from "@/lib/utils";
import type { TransformedPost } from "@shared/wordpress/types";
import { ArrowUpRight } from "lucide-react";

/**
 * El artículo destacado de /blog, en grande: imagen a la izquierda (arriba en
 * móvil) y titular, extracto, autor y fecha a la derecha. Enlaza fuera, como
 * BlogCard (muro de MemberPress). Nombre accesible corto, sin el extracto.
 */
export function PortadaArticulo({ post }: { post: TransformedPost }) {
  return (
    <a
      href={post.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid overflow-hidden rounded-3xl border border-border bg-background transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:grid-cols-12"
      aria-label={`Artículo destacado: ${post.title} (se abre en otra pestaña)`}
      data-testid={`portada-blog-${post.id}`}
    >
      <span className="block aspect-video overflow-hidden bg-muted lg:col-span-7 lg:aspect-auto">
        {post.featuredImage && (
          <img
            src={post.featuredImage}
            alt=""
            width={1600}
            height={900}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
            data-testid="img-featured-article"
          />
        )}
      </span>
      <span className="flex flex-col p-6 md:p-10 lg:col-span-5">
        <span className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-semibold uppercase tracking-wider text-miel-texto">
            Artículo destacado
          </span>
          {post.isGated && <AvisoMiembros />}
        </span>
        <h2
          className="mt-3 text-3xl font-extrabold leading-tight text-foreground md:text-4xl"
          data-testid="text-featured-title"
        >
          {post.title}
        </h2>
        {post.excerpt && (
          <span
            className="mt-4 line-clamp-4 text-lg text-muted-foreground"
            data-testid="text-featured-excerpt"
          >
            {post.excerpt}
          </span>
        )}
        <MetaArticulo post={post} className="mt-6" />
        <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-lg font-semibold text-primary">
          Leer artículo
          <ArrowUpRight
            className={cn(
              "h-5 w-5 transition-transform duration-200",
              "group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
            )}
            aria-hidden="true"
          />
        </span>
      </span>
    </a>
  );
}
