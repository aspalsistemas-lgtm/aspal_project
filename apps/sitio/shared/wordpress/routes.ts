/**
 * Registro único de los endpoints `/api/*`.
 *
 * Lo montan tanto el servidor Express de desarrollo/self-hosted
 * (`server/index.ts`) como la función serverless de Vercel (`api/index.ts`).
 * Añadir un endpoint aquí lo publica en ambos entornos a la vez — que es
 * justo lo que antes había que recordar hacer por duplicado.
 *
 * Política de errores: un fallo de WordPress se traduce a 5xx. NO se degrada
 * a `[]`, porque el cliente necesita distinguir "no se pudo cargar" de "no
 * hay artículos" para mostrar un reintento en vez de un estado vacío falso.
 * Un 404 en `/api/posts/:slug` significa exactamente que el post no existe.
 *
 * Paginación: `/api/posts` y `/api/podcasts` aceptan `per_page` (1–100, el
 * máximo de WordPress) y `page` (desde 1). El cuerpo sigue siendo la lista; el
 * total de la colección va en la cabecera CABECERA_TOTAL, para numerar y saber
 * si quedan más sin cambiar la forma de la respuesta.
 */
import type { Express, Request, Response } from "express";
import { fetchPodcasts, fetchPostBySlug, fetchPosts } from "./client.js";
import { CABECERA_TOTAL } from "./types.js";

/** Entero de la query dentro de [min, max]; si no es un número, `porDefecto`. */
function enteroAcotado(valor: unknown, porDefecto: number, min: number, max: number) {
  const n = Number.parseInt(String(valor), 10);
  return Number.isNaN(n) ? porDefecto : Math.min(max, Math.max(min, n));
}

function paginacion(req: Request) {
  return {
    perPage: enteroAcotado(req.query.per_page, 6, 1, 100),
    page: enteroAcotado(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER),
  };
}

export function registerApiRoutes(app: Express): void {
  app.get("/api/posts", async (req: Request, res: Response) => {
    try {
      const { perPage, page } = paginacion(req);
      const { items, total } = await fetchPosts(perPage, page);
      res.setHeader(CABECERA_TOTAL, String(total));
      res.json(items);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/:slug", async (req: Request, res: Response) => {
    try {
      const post = await fetchPostBySlug(req.params.slug);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  app.get("/api/podcasts", async (req: Request, res: Response) => {
    try {
      const { perPage, page } = paginacion(req);
      const { items, total } = await fetchPodcasts(perPage, page);
      res.setHeader(CABECERA_TOTAL, String(total));
      res.json(items);
    } catch (error) {
      console.error("Error fetching podcasts:", error);
      res.status(500).json({ error: "Failed to fetch podcasts" });
    }
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });
}
