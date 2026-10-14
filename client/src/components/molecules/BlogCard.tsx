import { AvisoMiembros } from "@/components/atoms/AvisoMiembros";
import { MetaArticulo } from "@/components/molecules/MetaArticulo";
import type { TransformedPost } from "@shared/wordpress/types";
import { ArrowUpRight } from "lucide-react";

interface BlogCardProps {
  post: TransformedPost;
  /** Etiqueta de tipo sobre el título («Blog», «Podcast»), para mezclar
   *  artículos y episodios con la misma tarjeta. */
  etiqueta?: string;
}

/**
 * Tarjeta de artículo (rejilla de /blog, «Sigue leyendo» de cada artículo):
 * imagen 16:9, aviso «Exclusivo para miembros» si está tras el muro, titular,
 * extracto, autor y fecha. Al pasar el ratón, la imagen se acerca y el borde
 * se marca; sin elevar la tarjeta.
 */
export default function BlogCard({ post, etiqueta }: BlogCardProps) {
  // NOTA: el plan pedía que la tarjeta navegara a `/blog/${post.slug}`. Está
  // aplazado a propósito: WordPress no sirve el cuerpo de ningún artículo a
  // una petición anónima (muro de MemberPress), así que la lectura interna
  // mostraría un formulario de login incrustado. Ver
  // docs/plans/2026-08-05-001-REVISION-PENDIENTE.md, punto 1.
  // Mientras siga enlazando fuera, el icono correcto es ArrowUpRight.
  return (
    <a
      href={post.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      // Sin esto el nombre accesible del enlace es la concatenación de imagen,
      // título, extracto y fecha: seis tarjetas producen seis párrafos en la
      // lista de enlaces de un lector de pantalla. La etiqueta visible
      // («Blog», «Podcast») va también en el nombre accesible.
      aria-label={`${etiqueta ? `${etiqueta}: ` : ""}${post.title} (se abre en una pestaña nueva)`}
      data-testid={`link-post-${post.id}`}
    >
      {/* Condicional: featuredImage puede venir vacío, y un <img src="">
          solicita la propia página y pinta el icono de rota. */}
      {post.featuredImage && (
        <span className="block aspect-video overflow-hidden bg-muted">
          <img
            src={post.featuredImage}
            // Decorativa: el título ya está en el aria-label del enlace.
            alt=""
            width={1600}
            height={900}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
            data-testid={`img-post-featured-${post.id}`}
          />
        </span>
      )}
      <span className="flex flex-1 flex-col p-6" data-testid={`card-post-${post.id}`}>
        {(etiqueta || post.isGated) && (
          <span className="mb-3 flex flex-wrap gap-2">
            {etiqueta && (
              <span
                className="inline-flex rounded-full bg-noche px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-noche-foreground"
                data-testid={`etiqueta-post-${post.id}`}
              >
                {etiqueta}
              </span>
            )}
            {post.isGated && <AvisoMiembros />}
          </span>
        )}
        <h3
          className="line-clamp-3 text-xl font-bold leading-snug text-foreground"
          data-testid={`text-post-title-${post.id}`}
        >
          {post.title}
        </h3>
        {post.excerpt && (
          <span
            className="mt-2 line-clamp-3 text-base text-muted-foreground"
            data-testid={`text-post-excerpt-${post.id}`}
          >
            {post.excerpt}
          </span>
        )}
        <span className="mt-auto flex items-end justify-between gap-4 pt-5">
          <MetaArticulo post={post} />
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
            Leer
            <ArrowUpRight
              className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </span>
      </span>
    </a>
  );
}
