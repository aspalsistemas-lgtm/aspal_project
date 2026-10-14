/**
 * Cliente de la WordPress REST API.
 *
 * MÓDULO SOLO-SERVIDOR: lee `process.env` y lo consumen `server/index.ts` y
 * `api/index.ts`. El cliente React no debe importarlo — para tipos usa
 * `shared/wordpress/types`, para datos los endpoints `/api/*`.
 *
 * Las funciones PROPAGAN los fallos de WordPress en vez de degradar a
 * vacío/null. `routes.ts` los traduce a 5xx para que el cliente pueda
 * distinguir "WordPress está caído" de "no hay artículos publicados": con la
 * política anterior ambos llegaban como el mismo array vacío.
 */
import { transformPost } from "./transform.js";
import type { TransformedPost, WPPost } from "./types.js";

const WP_API_BASE =
  process.env.WP_API_BASE ??
  "https://comunidad.asociacionesprofesionales.org/wp-json/wp/v2";

/** Slug de la categoría cuyos posts se sirven por `/api/podcasts` y se
 *  excluyen de `/api/posts`. */
const PODCAST_CATEGORY_SLUG = "podcast";

async function fetchJson(url: string): Promise<unknown> {
  return (await fetchJsonConTotal(url)).cuerpo;
}

/**
 * Como `fetchJson`, más el total de resultados de la colección
 * (`X-WP-Total`). Sin la cabecera, `null`: quien llama decide.
 */
async function fetchJsonConTotal(
  url: string,
): Promise<{ cuerpo: unknown; total: number | null }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status} en ${url}`);
  }

  const total = Number.parseInt(response.headers?.get("X-WP-Total") ?? "", 10);
  return { cuerpo: await response.json(), total: Number.isNaN(total) ? null : total };
}

/**
 * Una página de una colección: sus elementos y el total de la colección
 * entera, para numerar (episodio N) y saber si quedan más («Ver más»).
 */
export interface PaginaWP {
  items: TransformedPost[];
  total: number;
}

/** Una página de `/posts`; sin `X-WP-Total`, el total es lo que llegó. */
async function fetchPagina(params: URLSearchParams): Promise<PaginaWP> {
  const { cuerpo, total } = await fetchJsonConTotal(`${WP_API_BASE}/posts?${params}`);
  const items = (cuerpo as WPPost[]).map(transformPost);
  return { items, total: total ?? items.length };
}

/**
 * Resuelve el id de la categoría "podcast" por su slug.
 *
 * Deliberadamente NO se codifica el id a mano: sería una segunda fuente de
 * verdad y, si la categoría se recreara en WordPress con otro id, los podcasts
 * reaparecerían en la rejilla del blog en silencio.
 *
 * Devuelve `null` si la categoría no existe — que no es un error: significa
 * que no hay nada que excluir ni que servir.
 */
export async function resolvePodcastCategoryId(): Promise<number | null> {
  const categories = (await fetchJson(
    `${WP_API_BASE}/categories?slug=${PODCAST_CATEGORY_SLUG}`,
  )) as Array<{ id: number }>;

  if (categories.length === 0) {
    console.warn(`Categoría "${PODCAST_CATEGORY_SLUG}" no encontrada en WordPress`);
    return null;
  }

  return categories[0].id;
}

/** Artículos del blog, por páginas (`page` empieza en 1). Excluye los
 *  episodios de podcast, que tienen su propia página en `/podcast`. */
export async function fetchPosts(
  perPage: number = 6,
  page: number = 1,
): Promise<PaginaWP> {
  const podcastCategoryId = await resolvePodcastCategoryId();

  const params = new URLSearchParams({
    _embed: "1",
    per_page: String(perPage),
    page: String(page),
  });

  if (podcastCategoryId !== null) {
    params.set("categories_exclude", String(podcastCategoryId));
  }

  return fetchPagina(params);
}

/** Un artículo por slug. `null` significa "no existe", no "falló la carga":
 *  los fallos se propagan como excepción. */
export async function fetchPostBySlug(slug: string): Promise<TransformedPost | null> {
  const params = new URLSearchParams({ _embed: "1", slug });

  const posts = (await fetchJson(`${WP_API_BASE}/posts?${params}`)) as WPPost[];

  if (posts.length === 0) {
    return null;
  }

  return transformPost(posts[0]);
}

/** Episodios de podcast, por páginas (`page` empieza en 1). */
export async function fetchPodcasts(
  perPage: number = 6,
  page: number = 1,
): Promise<PaginaWP> {
  const podcastCategoryId = await resolvePodcastCategoryId();

  if (podcastCategoryId === null) {
    return { items: [], total: 0 };
  }

  const params = new URLSearchParams({
    _embed: "1",
    per_page: String(perPage),
    page: String(page),
    categories: String(podcastCategoryId),
  });

  return fetchPagina(params);
}
