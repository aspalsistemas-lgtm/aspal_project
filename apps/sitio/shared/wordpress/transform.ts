import type { TransformedPost, WPPost } from "./types.js";

/** Palabras por minuto para la estimación de lectura. Rango habitual de
 *  lectura adulta en pantalla. */
const WORDS_PER_MINUTE = 200;

/** Longitud máxima del extracto de tarjeta. */
const EXCERPT_LENGTH = 200;

/** Entidades con nombre que WordPress usa en títulos y extractos. */
const ENTIDADES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

/**
 * Decodifica entidades HTML en una sola pasada: con nombre (`&ndash;`) y
 * numéricas (`&#8211;`, `&#x2013;`). WordPress escapa así la tipografía de los
 * títulos («Fines de Flujo &#8211; Parte 1» llegaba tal cual a la página).
 * Una sola pasada: `&amp;#8211;` queda como el texto `&#8211;`, no como «–».
 * Una entidad desconocida se deja como está.
 */
function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entidad, cuerpo: string) => {
    if (cuerpo[0] === "#") {
      const codigo =
        cuerpo[1] === "x" || cuerpo[1] === "X"
          ? parseInt(cuerpo.slice(2), 16)
          : parseInt(cuerpo.slice(1), 10);
      return Number.isFinite(codigo) && codigo > 0 && codigo <= 0x10ffff
        ? String.fromCodePoint(codigo)
        : entidad;
    }
    return ENTIDADES[cuerpo.toLowerCase()] ?? entidad;
  });
}

function stripHtml(html: string): string {
  return decodificarEntidades(html.replace(/<[^>]*>/g, "")).trim();
}

function extractFirstImage(content: string): string | null {
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
  return imgMatch ? imgMatch[1] : null;
}

/**
 * Detecta que WordPress ha servido el muro de MemberPress en lugar del
 * artículo.
 *
 * A una petición anónima, la REST API no devuelve el cuerpo de ningún post:
 * devuelve un stub con "You are unauthorized to view this page" y un
 * formulario de login. Sin esta comprobación ese HTML acabaría renderizado
 * dentro de `prose` —en inglés y con un login incrustado— y `readingMinutes`
 * mediría el mensaje de error en vez del artículo.
 */
export function isGatedContent(renderedContent: string): boolean {
  return /mepr-unauthorized-message|unauthorized to view this page/i.test(
    renderedContent,
  );
}

/**
 * Minutos de lectura sobre el texto YA limpio.
 *
 * Se calcula aquí una sola vez, no en el cliente: estimarlo sobre el HTML
 * crudo contaba cada `<img src="…" class="…" alt="…">` como ~6 palabras e
 * inflaba el dato de forma desigual. Al retirarse la insignia de categoría
 * este pasa a ser el metadato principal de la tarjeta, así que no puede ser
 * un dato falso.
 */
function estimateReadingMinutes(plainText: string): number {
  if (!plainText) {
    return 1;
  }

  const words = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/**
 * Extracto truncado. El sufijo solo se añade si de verdad hubo truncamiento:
 * antes se concatenaba siempre y un extracto vacío pintaba literalmente "..."
 * en la tarjeta.
 */
function buildExcerpt(rawExcerpt: string): string {
  const text = stripHtml(rawExcerpt);

  if (text.length <= EXCERPT_LENGTH) {
    return text;
  }

  return `${text.substring(0, EXCERPT_LENGTH).trimEnd()}…`;
}

/**
 * Fecha de publicación en UTC explícito.
 *
 * WordPress devuelve `date_gmt` sin sufijo de zona (`2026-08-05T10:30:00`),
 * y `new Date()` lo interpretaría como hora local del navegador: la fecha
 * mostrada podía diferir un día entre husos latinoamericanos. `date` a secas
 * es hora local del servidor de WordPress, aún peor.
 */
function toIsoUtc(post: WPPost): string {
  const gmt = post.date_gmt;

  if (!gmt) {
    return post.date;
  }

  return /(Z|[+-]\d{2}:?\d{2})$/.test(gmt) ? gmt : `${gmt}Z`;
}

/** Normaliza un post de WordPress: la imagen destacada cae al primer `<img>`
 *  del contenido cuando no hay `wp:featuredmedia`. */
export function transformPost(post: WPPost): TransformedPost {
  const featuredMedia = post._embedded?.["wp:featuredmedia"]?.[0];
  const author = post._embedded?.author?.[0];
  const categories = post._embedded?.["wp:term"]?.[0];

  let featuredImage = featuredMedia?.source_url || "";
  if (!featuredImage) {
    featuredImage = extractFirstImage(post.content.rendered) || "";
  }

  const gated = isGatedContent(post.content.rendered);

  return {
    id: post.id,
    title: stripHtml(post.title.rendered),
    slug: post.slug,
    excerpt: buildExcerpt(post.excerpt.rendered),
    content: post.content.rendered,
    featuredImage,
    category: categories?.[0]?.name || "General",
    categorySlugs: (categories ?? []).map((term) => term.slug),
    publishedAt: toIsoUtc(post),
    isGated: gated,
    // Con el contenido bloqueado el cálculo mediría el mensaje de MemberPress,
    // no el artículo: 0 es la señal de "no hay dato", y la UI oculta el hueco
    // en vez de mentir con "1 min".
    readingMinutes: gated ? 0 : estimateReadingMinutes(stripHtml(post.content.rendered)),
    author: author?.name || "ASPAL",
    link: post.link,
  };
}
