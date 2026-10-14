/**
 * Metadatos de cada ruta: título, descripción, canonical, Open Graph y JSON-LD
 * (RF-10 del plan de la Etapa 1).
 *
 * Los consume el prerender (`scripts/prerender.mjs`, vía `entry-server.tsx`)
 * para escribir el `<head>` de cada HTML, y `CabeceraRuta` para mantener el
 * título al navegar sin recargar. `SEO` está indexado por `RutaEstatica`: una
 * ruta nueva en `rutas.ts` sin su entrada aquí no compila.
 *
 * Las descripciones reutilizan textos que el sitio ya publica; no se inventa
 * copy institucional.
 */

import {
  CONTACTO,
  NOMBRE_COMPLETO,
  NOMBRE_CORTO,
  NOMBRE_MARCA,
  REDES,
  TITULO_SITIO,
  URL_SITIO,
} from "./marca";
import { RUTAS_ESTATICAS, type RutaEstatica } from "./rutas";

export interface MetaRuta {
  titulo: string;
  descripcion: string;
  indexable: boolean;
}

export const SEO: Record<RutaEstatica, MetaRuta> = {
  "/": {
    titulo: TITULO_SITIO,
    descripcion:
      "La red en español del sector asociativo de América Latina: comunidad, conocimiento, tecnología y datos para asociaciones profesionales.",
    indexable: true,
  },
  "/blog": {
    titulo: "Blog · ASPAL",
    descripcion:
      "Recursos, guías y mejores prácticas para asociaciones profesionales de Latinoamérica.",
    indexable: true,
  },
  "/podcast": {
    titulo: "Conexión Profesional · Podcast de ASPAL",
    descripcion:
      "El podcast que explora y fortalece las redes en asociaciones profesionales.",
    indexable: true,
  },
  "/plataforma": {
    titulo: "Crea y gestiona tu comunidad en línea · ASPAL",
    descripcion:
      "Membresías, comunidad en línea, contenido, cursos, marketing y bolsa de trabajo para asociaciones profesionales.",
    indexable: true,
  },
  "/unete": {
    titulo: "Únete a la casa común · ASPAL",
    descripcion:
      "Únete a la red en español que profesionaliza el sector asociativo de América Latina: suscripción gratuita o membresía.",
    indexable: true,
  },
  "/eventos": {
    titulo: "Eventos · ASPAL",
    descripcion:
      "Calendario de eventos y webinars de ASPAL para el sector asociativo de América Latina. Muy pronto.",
    indexable: true,
  },
  "/nosotros": {
    titulo: "Nosotros · ASPAL",
    descripcion:
      "La red en español que profesionaliza la gestión asociativa de América Latina. Formación, comunidad, tecnología y datos para asociaciones profesionales LATAM.",
    indexable: true,
  },
  "/mapa-de-ruta": {
    titulo: "Mapa de Ruta para Organizaciones Profesionales · ASPAL",
    descripcion:
      "Guía práctica sobre las etapas de gestión de una asociación o sociedad profesional: 7 etapas y 23 pasos, de la gobernanza a la mejora continua.",
    indexable: true,
  },
  "/aviso-de-privacidad": {
    titulo: "Aviso de privacidad · ASPAL",
    descripcion:
      "Cómo trata ASPAL tus datos personales: finalidades, datos que recaba, transferencias y cómo ejercer tus derechos ARCO.",
    indexable: true,
  },
  "/terminos": {
    titulo: "Términos de uso · ASPAL",
    descripcion:
      "Reglamento de la comunidad ASPAL: reglas de participación, código de etiqueta en los grupos de discusión y asuntos legales.",
    indexable: true,
  },
  "/componentes": {
    titulo: "Componentes y estilos · ASPAL",
    descripcion:
      "Catálogo interno de componentes, colores y tipografía del sitio de ASPAL, para quien desarrolla y diseña.",
    indexable: false,
  },
  "/que-hacemos": {
    titulo: "¿Qué hacemos? · ASPAL",
    descripcion:
      "Comunidad, conocimiento, tecnología y datos: los cuatro pilares con los que ASPAL profesionaliza el sector asociativo de América Latina.",
    indexable: true,
  },
  "/nuestro-equipo": {
    titulo: "Nuestro equipo · ASPAL",
    descripcion:
      "La operación diaria de ASPAL está a cargo de un equipo compacto y experimentado, respaldado por el secretariado compartido con WUP y ANPR.",
    indexable: true,
  },
};

export const SEO_404: MetaRuta = {
  titulo: "Página no encontrada · ASPAL",
  descripcion: "La página que buscas no existe o ha cambiado de dirección.",
  indexable: false,
};

const IMAGEN_OG = { ruta: "/og-aspal.png", ancho: 1200, alto: 630 } as const;

/** Metadatos de una ruta estática; `null` para rutas dinámicas o inexistentes. */
export function metaDeRuta(ruta: string): MetaRuta | null {
  return (RUTAS_ESTATICAS as readonly string[]).includes(ruta)
    ? SEO[ruta as RutaEstatica]
    : null;
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function urlCanonica(ruta: RutaEstatica): string {
  return ruta === "/" ? `${URL_SITIO}/` : `${URL_SITIO}${ruta}`;
}

function jsonLdOrganizacion(): string {
  const [localidad, region] = CONTACTO.ciudad.split(", ");
  const datos = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: NOMBRE_COMPLETO,
    alternateName: NOMBRE_CORTO,
    url: `${URL_SITIO}/`,
    logo: `${URL_SITIO}/favicon.png`,
    email: CONTACTO.correo,
    telephone: CONTACTO.telefono.replace(/\s/g, ""),
    address: {
      "@type": "PostalAddress",
      addressLocality: localidad,
      addressRegion: region,
      addressCountry: "MX",
    },
    sameAs: REDES.map((red) => red.href),
  };
  // `<` escapado: ningún valor puede cerrar el <script> que lo contiene.
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}

/**
 * Bloque completo de `<head>` para una ruta (título incluido). `null` es el 404:
 * sin canonical y con noindex. El prerender lo inserta en lugar del `<title>` y
 * la descripción por defecto de `index.html`.
 */
export function etiquetasHead(ruta: RutaEstatica | null): string {
  const meta = ruta === null ? SEO_404 : SEO[ruta];
  const e = escaparHtml;
  const lineas = [
    `<title>${e(meta.titulo)}</title>`,
    `<meta name="description" content="${e(meta.descripcion)}" />`,
  ];

  if (!meta.indexable) lineas.push('<meta name="robots" content="noindex" />');

  if (ruta !== null) {
    const url = urlCanonica(ruta);
    lineas.push(
      `<link rel="canonical" href="${url}" />`,
      '<meta property="og:type" content="website" />',
      `<meta property="og:site_name" content="${e(NOMBRE_MARCA)}" />`,
      '<meta property="og:locale" content="es_MX" />',
      `<meta property="og:title" content="${e(meta.titulo)}" />`,
      `<meta property="og:description" content="${e(meta.descripcion)}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:image" content="${URL_SITIO}${IMAGEN_OG.ruta}" />`,
      `<meta property="og:image:width" content="${IMAGEN_OG.ancho}" />`,
      `<meta property="og:image:height" content="${IMAGEN_OG.alto}" />`,
      '<meta name="twitter:card" content="summary_large_image" />',
    );
  }

  if (ruta === "/") {
    lineas.push(`<script type="application/ld+json">${jsonLdOrganizacion()}</script>`);
  }

  return lineas.map((linea) => `    ${linea}`).join("\n");
}

export function generarSitemap(): string {
  const urls = RUTAS_ESTATICAS.filter((ruta) => SEO[ruta].indexable)
    .map((ruta) => `  <url><loc>${urlCanonica(ruta)}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function generarRobots(): string {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${URL_SITIO}/sitemap.xml\n`;
}
