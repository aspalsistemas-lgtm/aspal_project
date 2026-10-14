import { formatPublishedDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { TransformedPost } from "@shared/wordpress/types";

/**
 * Autor y fecha de un artículo, en una línea. Si falta uno de los dos, sale
 * el otro solo; una fecha malformada no se pinta (formatPublishedDate).
 */
export function MetaArticulo({
  post,
  className,
}: {
  post: TransformedPost;
  className?: string;
}) {
  const fecha = formatPublishedDate(post.publishedAt);
  return (
    <span
      className={cn(
        "flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground",
        className,
      )}
    >
      {post.author && <span className="font-medium text-foreground">{post.author}</span>}
      {post.author && fecha && <span aria-hidden="true">·</span>}
      {fecha && (
        <time dateTime={post.publishedAt} data-testid={`text-post-date-${post.id}`}>
          {fecha}
        </time>
      )}
    </span>
  );
}
