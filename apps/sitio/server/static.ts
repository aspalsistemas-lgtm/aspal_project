import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { RUTAS_DINAMICAS } from "../client/src/lib/rutas";

/**
 * Sirve el build en producción con las mismas reglas que `vercel.json`:
 *
 * - `/` y cada ruta estática → su HTML prerenderizado (`blog.html` responde a `/blog`)
 * - rutas dinámicas (`/blog/:slug`) → `spa.html`, el shell que carga el cliente
 * - todo lo demás → `404.html` con **código 404**
 *
 * Antes cualquier dirección caía en `index.html` con 200: para un buscador, el
 * sitio tenía infinitas páginas iguales a la home.
 */
/**
 * Cabecera de caché para lo que tiene la versión en la URL: `/assets/*` lleva
 * el hash del contenido en el nombre (Vite) y `/fuentes/<familia>-v<n>/*` la
 * versión en la carpeta. Si el archivo cambia, cambia la URL, así que el
 * navegador puede guardarlo un año sin volver a preguntar. `vercel.json`
 * declara la misma (lo comprueba `vercel.test.ts`). Las páginas no: tienen que
 * revalidarse para que un despliegue se vea al instante.
 */
export const CACHE_INMUTABLE = "public, max-age=31536000, immutable";
const VERSIONADOS = /^(assets|fuentes)\//;

export function serveStatic(
  app: Express,
  distPath = path.resolve(import.meta.dirname, "public"),
) {
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Como `trailingSlash: false` en Vercel: `/blog/` redirige a `/blog`. Se
  // quitan también las barras iniciales, y las invertidas (los navegadores
  // tratan `/\` como `//`), y se pone una sola: `//evil.com/` daría
  // `Location: //evil.com` (relativa al protocolo: sale del dominio) y `//`
  // daría un `Location` vacío (bucle).
  app.use((req, res, next) => {
    if (req.path.length > 1 && req.path.endsWith("/")) {
      const consulta = req.url.slice(req.path.length);
      res.redirect(308, "/" + req.path.replace(/^[/\\]+|\/+$/g, "") + consulta);
      return;
    }
    next();
  });

  // Sin redirect: si no, /assets -> 301 /assets/ y la barra final -> 308 /assets, en bucle.
  app.use(
    express.static(distPath, {
      extensions: ["html"],
      redirect: false,
      setHeaders: (res, archivo) => {
        if (
          VERSIONADOS.test(path.relative(distPath, archivo).split(path.sep).join("/"))
        ) {
          res.setHeader("Cache-Control", CACHE_INMUTABLE);
        }
      },
    }),
  );

  for (const ruta of RUTAS_DINAMICAS) {
    app.get(ruta, (_req, res) => {
      res.sendFile(path.resolve(distPath, "spa.html"));
    });
  }

  app.use("*", (_req, res) => {
    res.status(404).sendFile(path.resolve(distPath, "404.html"));
  });
}
