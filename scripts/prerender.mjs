#!/usr/bin/env node
/**
 * Prerender de las rutas estáticas (RF-10 y RF-11 del plan de la Etapa 1).
 *
 * Corre después de los dos builds de Vite: toma `dist/public/index.html` como
 * plantilla y escribe un HTML por ruta con su `<head>` propio y el cuerpo ya
 * renderizado, además de `404.html`, `spa.html`, `sitemap.xml` y `robots.txt`.
 *
 * Es también una puerta: aborta el build si una ruta sale sin `<h1>` o si el
 * 404 compartido muestra una dirección concreta.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const RAIZ = resolve(import.meta.dirname, "..");
const PUBLICO = join(RAIZ, "dist", "public");
const ENTRADA = join(RAIZ, "dist", "ssr", "entry-server.js");

const { renderizar, RUTAS_ESTATICAS, etiquetasHead, generarSitemap, generarRobots } =
  await import(pathToFileURL(ENTRADA).href);

const plantilla = await readFile(join(PUBLICO, "index.html"), "utf8");

const TITULO = /[ \t]*<title>[\s\S]*?<\/title>\s*/;
const DESCRIPCION = /[ \t]*<meta\s+name="description"[\s\S]*?\/?>\s*/;
const RAIZ_APP = '<div id="root"></div>';

if (!TITULO.test(plantilla)) throw new Error("prerender: la plantilla no tiene <title>");
if (!DESCRIPCION.test(plantilla)) {
  throw new Error('prerender: la plantilla no tiene <meta name="description">');
}
if (!plantilla.includes(RAIZ_APP)) {
  throw new Error(`prerender: la plantilla no tiene ${RAIZ_APP}`);
}

/**
 * Sustituciones con función, no con cadena: el HTML renderizado puede contener
 * `$&` o `$1`, que `String.replace` interpretaría como patrones.
 */
function componer(ruta, cuerpo) {
  const nombre = ruta ?? "404";
  if (!cuerpo.includes("<h1")) throw new Error(`prerender: ${nombre} no tiene <h1>`);
  // Contenido a opacidad 0 en el HTML: sin JavaScript (buscadores, JS
  // bloqueado, antes de hidratar) no se ve. framer-motion lo escribe como
  // style="opacity:0…" al renderizar `initial`. 0.5 sí vale; 0 no.
  if (/opacity:\s*0(?![.\d])/.test(cuerpo)) {
    throw new Error(
      `prerender: ${nombre} tiene contenido a opacity:0 (animación de entrada)`,
    );
  }
  // RF-14: el enlace «Saltar al contenido» apunta a #contenido en todas las rutas.
  if (cuerpo.match(/id="contenido"/g)?.length !== 1) {
    throw new Error(`prerender: ${nombre} no tiene exactamente un <main id="contenido">`);
  }
  return plantilla
    .replace(TITULO, () => "")
    .replace(DESCRIPCION, () => "")
    .replace("</head>", () => `${etiquetasHead(ruta)}\n  </head>`)
    .replace(RAIZ_APP, () => `<div id="root">${cuerpo}</div>`);
}

async function escribir(archivo, contenido) {
  const destino = join(PUBLICO, archivo);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, contenido);
}

// El shell sin prerender: lo sirven las rutas dinámicas (/blog/:slug). Se
// guarda antes de sobrescribir index.html con la home prerenderizada.
await escribir("spa.html", plantilla);

for (const ruta of RUTAS_ESTATICAS) {
  const archivo = ruta === "/" ? "index.html" : `${ruta.slice(1)}.html`;
  await escribir(archivo, componer(ruta, renderizar(ruta)));
}

// Cualquier ruta que no esté en rutas.ts renderiza PaginaNoEncontrada.
const cuerpo404 = renderizar("/404");
const marcasPorRuta = [
  'data-testid="text-404-ruta"',
  'data-testid="card-404-sugerencia"',
  'data-testid="link-404-reportar"',
];
if (marcasPorRuta.some((marca) => cuerpo404.includes(marca))) {
  throw new Error("prerender: el 404 compartido no puede mostrar una dirección concreta");
}
await escribir("404.html", componer(null, cuerpo404));

await escribir("sitemap.xml", generarSitemap());
await escribir("robots.txt", generarRobots());

console.log(
  `prerender: ${RUTAS_ESTATICAS.length} rutas, 404.html, spa.html, sitemap.xml y robots.txt`,
);
