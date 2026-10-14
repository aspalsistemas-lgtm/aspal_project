/**
 * Textos propios de la home (§6.1). Hero, pilares, aliados y cierre reutilizan
 * los de `nosotros.ts` y `pilares.ts`; aquí solo va lo que no existe en otro
 * sitio.
 */
import { Globe2, LayoutGrid, Route, Target, type LucideIcon } from "lucide-react";
import { ETAPAS } from "./mapa-ruta";
import { PILARES } from "./pilares";

export interface Cifra {
  valor: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Una meta, no un hecho: se rotula «Meta 2030» para que no se lea como logro. */
  meta?: boolean;
}

const PASOS = ETAPAS.reduce((total, etapa) => total + etapa.pasos.length, 0);

/**
 * Solo cifras que el sitio respalda: los 15+ países salen de Nosotros (Quiénes
 * somos); pilares, etapas y pasos se cuentan; los 1,000 líderes son la meta
 * 2030 de la Ruta y se rotulan como meta.
 * PENDIENTE (CG): la §6.1 pedía «22 organizaciones analizadas», pero ningún
 * documento del repo da esa cifra. Entra cuando la CG diga de dónde sale.
 */
export const CIFRAS: Cifra[] = [
  {
    valor: "15+",
    etiqueta: "países con líderes, invitados y aliados de la red",
    icono: Globe2,
  },
  {
    valor: String(PILARES.length),
    etiqueta: "pilares: Comunidad, Conocimiento, Tecnología y Datos",
    icono: LayoutGrid,
  },
  {
    valor: String(ETAPAS.length),
    etiqueta: `etapas y ${PASOS} pasos en el Mapa de Ruta`,
    icono: Route,
  },
  {
    valor: "1,000",
    etiqueta: "líderes formados: nuestra meta al 2030",
    icono: Target,
    meta: true,
  },
];

/**
 * RANURA (fase 2 de la edición de la home): foto real de un encuentro para el
 * hero. WebP de 1600×1200, horizontal, en `client/public/fotos/`. Mientras sea
 * `null`, el hero muestra el patrón de panal de la marca.
 * Ejemplo: `{ src: "/fotos/encuentro-2026.webp", alt: "Directivos de asociaciones en el Encuentro 2026, en Mérida" }`
 */
// PENDIENTE: imagen provisional generada con IA, no es de un evento de ASPAL
// (por eso el alt describe la escena sin nombrar ningún encuentro). Sustituir
// por una foto real del primer encuentro o webinar presencial.
export const FOTO_HERO: { src: string; alt: string } | null = {
  src: "/fotos/hero-encuentro.webp",
  alt: "Directivos de asociaciones conversando alrededor de una mesa en un taller de trabajo",
};

export interface Testimonio {
  cita: string;
  nombre: string;
  cargo: string;
  organizacion: string;
  pais: string;
  /** Retrato 1:1 de 400 px en `client/public/fotos/`. Sin foto, iniciales. */
  foto?: string;
}

/**
 * RANURA (fase 2): «Voces de la red», tres testimonios reales de directivos de
 * la red (cita de menos de 30 palabras). Con la lista vacía, la sección no se
 * pinta. No se inventan: los aporta la Coordinación.
 */
export const TESTIMONIOS: Testimonio[] = [];

/**
 * Eventos «Próximamente». Lo comparten /eventos y la home.
 * PENDIENTE (D10): pre-anuncio del Encuentro Latinoamericano CDMX 2027.
 */
export const TEXTO_EVENTOS =
  "Estamos preparando el calendario de eventos y los webinars mensuales de ASPAL.";
