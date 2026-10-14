import { describe, expect, it } from "vitest";
import { URL_SITIO } from "./marca";
import { RUTAS_ESTATICAS } from "./rutas";
import {
  SEO,
  SEO_404,
  escaparHtml,
  etiquetasHead,
  generarRobots,
  generarSitemap,
  metaDeRuta,
  urlCanonica,
} from "./seo";

describe("metadatos por ruta", () => {
  it("da a cada ruta estática un título propio con la marca", () => {
    const titulos = RUTAS_ESTATICAS.map((r) => SEO[r].titulo);
    for (const t of titulos) expect(t).toContain("ASPAL");
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it("da a cada ruta una descripción de 50 a 160 caracteres", () => {
    // Por debajo, Google la reescribe; por encima, la corta.
    for (const ruta of RUTAS_ESTATICAS) {
      const largo = SEO[ruta].descripcion.length;
      expect(largo, ruta).toBeGreaterThanOrEqual(50);
      expect(largo, ruta).toBeLessThanOrEqual(160);
    }
  });

  it("resuelve los metadatos solo de rutas estáticas", () => {
    expect(metaDeRuta("/blog")).toBe(SEO["/blog"]);
    expect(metaDeRuta("/blog/un-articulo")).toBeNull();
    expect(metaDeRuta("/no-existe")).toBeNull();
  });

  it("nunca indexa el 404", () => {
    expect(SEO_404.indexable).toBe(false);
  });
});

describe("escaparHtml", () => {
  it("escapa lo que rompería un atributo o una etiqueta", () => {
    expect(escaparHtml(`A & B "C" <D>`)).toBe("A &amp; B &quot;C&quot; &lt;D&gt;");
  });
});

describe("etiquetasHead", () => {
  it("apunta el canonical y og:url al dominio canónico", () => {
    const head = etiquetasHead("/blog");
    expect(head).toContain(`<link rel="canonical" href="${URL_SITIO}/blog" />`);
    expect(head).toContain(`<meta property="og:url" content="${URL_SITIO}/blog" />`);
    expect(urlCanonica("/")).toBe(`${URL_SITIO}/`);
  });

  it("incluye título, descripción e imagen Open Graph de 1200×630", () => {
    const head = etiquetasHead("/podcast");
    expect(head).toContain(`<title>${escaparHtml(SEO["/podcast"].titulo)}</title>`);
    expect(head).toContain('<meta name="description"');
    expect(head).toContain(
      `<meta property="og:image" content="${URL_SITIO}/og-aspal.png" />`,
    );
    expect(head).toContain('<meta property="og:image:width" content="1200" />');
    expect(head).toContain('<meta property="og:image:height" content="630" />');
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(head).not.toContain("noindex");
  });

  it("añade JSON-LD de Organization solo en la home", () => {
    const home = etiquetasHead("/");
    const json = home.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    )?.[1];
    expect(json).toBeDefined();
    const datos = JSON.parse(json!);
    expect(datos["@type"]).toBe("Organization");
    expect(datos.url).toBe(`${URL_SITIO}/`);
    expect(etiquetasHead("/blog")).not.toContain("application/ld+json");
  });

  it("no deja que el JSON-LD cierre su propio <script>", () => {
    const json = etiquetasHead("/").match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    )![1];
    expect(json).not.toMatch(/<\//);
  });

  it("marca el 404 como noindex y sin canonical", () => {
    const head = etiquetasHead(null);
    expect(head).toContain(`<title>${escaparHtml(SEO_404.titulo)}</title>`);
    expect(head).toContain('<meta name="robots" content="noindex" />');
    expect(head).not.toContain("canonical");
  });
});

describe("sitemap y robots", () => {
  it("lista cada ruta indexable con su URL canónica", () => {
    const sitemap = generarSitemap();
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    for (const ruta of RUTAS_ESTATICAS.filter((r) => SEO[r].indexable)) {
      expect(sitemap).toContain(`<loc>${urlCanonica(ruta)}</loc>`);
    }
    expect(sitemap).not.toContain("/api");
  });

  it("publica el sitemap y cierra /api/ a los rastreadores", () => {
    const robots = generarRobots();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain(`Sitemap: ${URL_SITIO}/sitemap.xml`);
  });
});

describe("catálogo interno", () => {
  it("publica /componentes sin indexar y fuera del sitemap", () => {
    expect(SEO["/componentes"].indexable).toBe(false);
    expect(generarSitemap()).not.toContain("/componentes");
    expect(etiquetasHead("/componentes")).toContain(
      '<meta name="robots" content="noindex" />',
    );
  });
});
