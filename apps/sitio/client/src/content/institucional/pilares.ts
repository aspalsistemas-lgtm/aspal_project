/**
 * Los 4 Pilares ASPAL (Concepto NOSOTROS, Bloque 5). Copy literal: no se
 * reescribe aquí. Lo usan /nosotros (resumen) y /que-hacemos (detalle); el id
 * es el ancla de /que-hacemos (RF-08).
 */
import pilarComunidad from "@assets/ilustraciones/pilar-comunidad.webp";
import pilarConocimiento from "@assets/ilustraciones/pilar-conocimiento.webp";
import pilarDatos from "@assets/ilustraciones/pilar-datos.webp";
import pilarTecnologia from "@assets/ilustraciones/pilar-tecnologia.webp";
import { COMUNIDAD } from "@/lib/navegacion";
import { BarChart3, BookOpen, Cpu, Users, type LucideIcon } from "lucide-react";

export type IdPilar = "comunidad" | "conocimiento" | "tecnologia" | "datos";

/** Enlace de contenido. Sin `href`, la sección aún no existe («Próximamente»). */
export interface EnlaceContenido {
  etiqueta: string;
  href?: string;
  externo?: boolean;
}

export interface Pilar {
  id: IdPilar;
  nombre: string;
  subtitulo: string;
  compromiso: string;
  comoSeTraduce: string;
  icono: LucideIcon;
  /**
   * Ilustración de la marca (familia miel y noche), versión ligera de 480 × 520
   * derivada de `recurso-*.webp`. Datos usa la lupa sobre perfiles: análisis y
   * comparación. Decorativa: se pinta siempre con alt="".
   */
  ilustracion: string;
  enlaces: EnlaceContenido[];
}

export const PILARES: Pilar[] = [
  {
    id: "comunidad",
    nombre: "Comunidad",
    subtitulo: "Ningún director dirige solo.",
    compromiso:
      "Conectamos a los directivos y equipos de asociaciones de toda LATAM en una red viva de pares.",
    comoSeTraduce:
      "Foros por etapa del Mapa de Ruta, directorio de miembros, red de mentoring, Encuentro Latinoamericano CDMX 2027.",
    icono: Users,
    ilustracion: pilarComunidad,
    enlaces: [
      { etiqueta: "Comunidad ASPAL", href: `${COMUNIDAD}/comunidad/`, externo: true },
      {
        etiqueta: "Directorio de miembros",
        href: `${COMUNIDAD}/miembros/`,
        externo: true,
      },
    ],
  },
  {
    id: "conocimiento",
    nombre: "Conocimiento",
    subtitulo: "El saber acumulado del sector, curado y en español.",
    compromiso:
      "Te damos acceso a las mejores prácticas globales y regionales de gestión asociativa.",
    comoSeTraduce:
      "Podcast Conexión Profesional, Blog, Webinars mensuales, Biblioteca curada, Academia ASPAL y cursos certificados.",
    icono: BookOpen,
    ilustracion: pilarConocimiento,
    enlaces: [
      { etiqueta: "Blog", href: "/blog" },
      { etiqueta: "Podcast Conexión Profesional", href: "/podcast" },
      { etiqueta: "Cursos en línea", href: `${COMUNIDAD}/cursos/`, externo: true },
    ],
  },
  {
    id: "tecnologia",
    nombre: "Tecnología",
    subtitulo: "Años de prueba y error, resueltos.",
    compromiso:
      "Te ofrecemos la plataforma SaaS especializada para asociaciones, ya operativa en WUP y ANPR.",
    comoSeTraduce:
      "Gestión de membresías, pasarela de pagos, email marketing, comunidad en línea, analítica — todo listo para operar.",
    icono: Cpu,
    ilustracion: pilarTecnologia,
    enlaces: [{ etiqueta: "Conoce la plataforma", href: "/plataforma" }],
  },
  {
    id: "datos",
    nombre: "Datos",
    subtitulo: "Decisiones con evidencia, no con intuición.",
    compromiso: "Generamos los benchmarks reales del sector asociativo latinoamericano.",
    comoSeTraduce:
      "Estudio Comparativo anual, Reporte del Estado del Sector LATAM, encuestas de retención y tendencias regionales.",
    icono: BarChart3,
    ilustracion: pilarDatos,
    // PENDIENTE (Etapa 3): el Estudio Comparativo tiene su página.
    enlaces: [{ etiqueta: "Estudio Comparativo" }],
  },
];
