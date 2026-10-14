/**
 * Página Nosotros: copy literal del documento «Concepto NOSOTROS» (julio 2026),
 * bloques 1–4 y 6–10. El Bloque 5 son los pilares (`pilares.ts`).
 */
import type { EnlaceContenido } from "./pilares";

// PENDIENTE (D7): el documento dice 2024 (resaltado para confirmar) y la
// presentación al Consejo, 2016. Confirmar con el DG antes de publicar.
export const ANIO_FUNDACION = "2024";

export const HASHTAG = "#NingunDirectorDirigeSolo";

/** Bloque 1: Hero institucional. */
export const HERO_NOSOTROS = {
  tagline: "La red en español del sector asociativo de América Latina.",
  parrafo:
    "Somos ASPAL — Asociaciones Profesionales de Latinoamérica. La casa común donde se forman, conectan y crecen los líderes que construyen el sector asociativo de la región.",
};

/** Bloque 2: Quiénes somos. */
export const QUIENES_SOMOS: string[] = [
  `ASPAL es la primera organización en español dedicada a profesionalizar la gestión de asociaciones, sociedades, colegios y federaciones de toda América Latina. Nacimos en ${ANIO_FUNDACION} dentro del ecosistema de World Urban Parks y ANPR México, y en 2026 iniciamos nuestra etapa de consolidación como red regional independiente con miembros individuales y grupales en todo LATAM.`,
  "Trabajamos con cuatro palancas — Comunidad, Conocimiento, Tecnología y Datos — para que cada asociación de la región tenga las herramientas, las conexiones y la evidencia que necesita para cumplir su misión y crecer con propósito.",
  "Nuestra sede operativa está en Mérida, Yucatán (México), y desde ahí articulamos una red de líderes, invitados y aliados presentes en más de 15 países de Iberoamérica.",
];

/** Bloque 3: Nuestra esencia (copy oficial, no se edita). */
export const MISION =
  "Somos la red en español que profesionaliza la gestión asociativa en América Latina, brindando formación, comunidad, tecnología y datos para que cada asociación cumpla su misión con resultados sostenibles.";
export const VISION =
  "Para 2030, ningún director de asociación profesional en América Latina dirigirá solo: ASPAL será la casa común donde se forman, conectan y crecen los líderes que construyen el sector asociativo de la región.";

/** Bloque 4: Lo que defendemos. */
export const DEFENDEMOS: { titulo: string; texto: string }[] = [
  {
    titulo: "Nuestra causa",
    texto:
      "Creemos que las asociaciones profesionales transforman a las profesiones que representan y, con ellas, a los países que integran. Cuando el sector asociativo LATAM se profesionaliza, las profesiones de la región ganan estándares, voz pública y capacidad de incidir.",
  },
  {
    titulo: "Nuestra propuesta de valor",
    texto:
      "Conectamos a los líderes de asociaciones de América Latina con las mejores prácticas, la comunidad de pares y las herramientas tecnológicas que hoy solo eran accesibles en inglés y a precios estadounidenses.",
  },
  {
    titulo: "Nuestra promesa",
    texto:
      "Al unirte a ASPAL dejas de dirigir tu asociación solo. Encuentras un directorio de colegas, una biblioteca curada, una plataforma tecnológica lista para usar y datos reales del sector para decidir con evidencia.",
  },
  {
    titulo: "Nuestro compromiso",
    texto:
      "Trabajamos por y para el sector, no por encima de él. Nuestras decisiones se rigen por el Consejo Directivo, nuestros ingresos se reinvierten en el ecosistema y nuestra voz es la de nuestros miembros — no la de un patrocinador.",
  },
];

/** Bloque 6: Cómo aportamos al sector asociativo LATAM. */
export const APORTES: string[] = [
  "Formamos a directores, staff y voluntarios del sector asociativo de LATAM en gestión, gobernanza y transformación digital.",
  "Publicamos guías, artículos y podcast en español para acortar la curva de aprendizaje del sector.",
  "Facilitamos plataforma tecnológica lista para asociaciones que no tienen recursos internos de TI.",
  "Producimos datos, tendencias e investigaciones propias del sector asociativo latinoamericano.",
  "Conectamos a colegas de toda la región a través de foros, comunidades y el Encuentro Latinoamericano anual.",
  "Impulsamos alianzas con organizaciones referentes (ASAE, CSAE, ESAE, WUP) para llevar el mejor benchmark internacional a LATAM.",
  "Reconocemos y certificamos las buenas prácticas de gestión asociativa a través de nuestra Certificación Profesional (CGA).",
];

/** Bloque 7: Ruta ASPAL 2026–2030. */
export interface Hito {
  anio: string;
  nombre: string;
  descripcion: string;
  estado: "en-curso" | "futuro";
}

export const RUTA: Hito[] = [
  {
    anio: "2026",
    nombre: "Relanzamiento",
    descripcion:
      "Nueva plataforma web, Podcast Temporada 1 (16 episodios), primeros ingresos por alianza Parksys, comunidad activa con 300 suscriptores.",
    estado: "en-curso",
  },
  {
    anio: "Q1 2027",
    nombre: "Primer Encuentro Latinoamericano",
    descripcion:
      "Congreso CDMX con 150 directores de asociación en sala. Primer estudio comparativo del sector.",
    estado: "futuro",
  },
  {
    anio: "Dic 2027",
    nombre: "Presencia regional",
    descripcion:
      "ASPAL con miembros activos en 10 países de América Latina. Primeros 3 clientes de plataforma SaaS.",
    estado: "futuro",
  },
  {
    anio: "Q4 2028",
    nombre: "Certificación",
    descripcion:
      "Lanzamiento de la Certificación Profesional ASPAL (CGA — Certificación en Gestión Asociativa).",
    estado: "futuro",
  },
  {
    anio: "2029",
    nombre: "Consolidación",
    descripcion:
      "500 líderes formados por la Academia ASPAL. 50 asociaciones-miembro grupales.",
    estado: "futuro",
  },
  {
    anio: "2030",
    nombre: "Visión cumplida",
    descripcion:
      "1,000 líderes formados · presencia en los 20 países de LATAM · comunidad activa de pares en español.",
    estado: "futuro",
  },
];

/** Bloque 8: Quiénes hacen posible ASPAL. */
export interface TarjetaGobierno {
  titulo: string;
  texto: string;
  enlace: EnlaceContenido;
}

export const HACEN_POSIBLE: TarjetaGobierno[] = [
  {
    titulo: "Equipo Ejecutivo",
    texto:
      "La operación diaria de ASPAL está a cargo de un equipo compacto y experimentado, respaldado por el secretariado compartido con WUP y ANPR (15 personas en total).",
    enlace: { etiqueta: "Conoce al equipo", href: "/nuestro-equipo" },
  },
  {
    titulo: "Consejo Directivo",
    texto:
      "El gobierno estratégico de ASPAL recae en su Consejo Directivo, integrado por líderes del sector asociativo de la región. Orienta la visión de largo plazo, aprueba las decisiones estratégicas y protege la misión frente a intereses particulares.",
    // PENDIENTE (Etapa 2): integrantes con foto, cargo, organización y ciudad.
    enlace: { etiqueta: "Integrantes" },
  },
  {
    titulo: "Aliados Estratégicos",
    texto:
      "ASPAL nace y crece dentro de un ecosistema de organizaciones aliadas. Su respaldo institucional y su comunidad son parte del capital fundacional de ASPAL.",
    enlace: { etiqueta: "Ver aliados", href: "#aliados" },
  },
];

/** Bloque 9: Aliados estratégicos. En la Etapa 1 solo los fundadores. */
export interface Aliado {
  nombre: string;
  descripcion: string;
  /** Clave del logo en MuroAliados. Sin logo, se muestra el nombre. */
  logo?: "wup" | "anpr" | "parksys";
}

export const ALIADOS_FUNDADORES: Aliado[] = [
  {
    nombre: "World Urban Parks",
    descripcion:
      "Red global de más de 15 países que ampara el trabajo institucional de ASPAL.",
    logo: "wup",
  },
  {
    nombre: "ANPR México",
    descripcion:
      "Organización hermana, referente del secretariado compartido y de la operación tecnológica.",
    logo: "anpr",
  },
  {
    nombre: "Parksys",
    descripcion:
      "Plataforma tecnológica aliada, generadora de ingresos para ASPAL desde julio 2026.",
    logo: "parksys",
  },
];

/** Categorías del muro que se anuncian «conforme se firmen convenios» (§6.2). */
export const CATEGORIAS_ALIADOS_PENDIENTES: string[] = [
  "Aliados regionales",
  "Aliados internacionales",
  "Patrocinadores y sponsors",
];

/** Bloque 10: Únete a la casa común. */
export const CTA_FINAL: string[] = [
  "Si diriges o formas parte del equipo de una asociación, sociedad, colegio o federación profesional en América Latina, esta es tu casa.",
  "Únete a la comunidad ASPAL: la red en español que profesionaliza el sector asociativo LATAM.",
];
