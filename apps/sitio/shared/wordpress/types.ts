/**
 * Tipos compartidos entre el cliente, el servidor Express y la función
 * serverless de Vercel. Esta es la única definición de la forma de un post:
 * no la redeclares en componentes ni en handlers.
 */

/** Respuesta cruda de la WordPress REST API (`/wp/v2/posts?_embed`). */
export interface WPPost {
  id: number;
  /** Hora local del servidor de WordPress, sin zona. Usar `date_gmt`. */
  date: string;
  /** Hora UTC, pero sin sufijo `Z`: hay que añadirlo antes de parsear. */
  date_gmt?: string;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  link: string;
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url: string;
      alt_text: string;
    }>;
    author?: Array<{
      name: string;
      avatar_urls?: { [key: string]: string };
    }>;
    "wp:term"?: Array<
      Array<{
        id: number;
        name: string;
        slug: string;
      }>
    >;
  };
}

/** Forma normalizada que sirven los endpoints `/api/*` y consume el cliente. */
export interface TransformedPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  category: string;
  /** Slugs de todas las categorías del post. Permite detectar un episodio de
   *  podcast sin depender de que `category` (solo la primera) coincida. */
  categorySlugs: string[];
  /** ISO 8601 con zona explícita. Ver `toIsoUtc` en `transform.ts`. */
  publishedAt: string;
  /** `true` si WordPress sirvió el muro de MemberPress en vez del artículo.
   *  Ver `isGatedContent` en `transform.ts`. */
  isGated: boolean;
  /** Minutos de lectura calculados en el servidor sobre el texto limpio.
   *  `0` significa "no hay dato fiable" (contenido bloqueado): no lo pintes. */
  readingMinutes: number;
  author: string;
  link: string;
}

/**
 * Cabecera con que `/api/posts` y `/api/podcasts` devuelven el total de la
 * colección paginada (el cuerpo sigue siendo la lista de la página pedida).
 * Vive aquí, en el módulo puro, porque la leen servidor y cliente.
 */
export const CABECERA_TOTAL = "X-Total-Count";
