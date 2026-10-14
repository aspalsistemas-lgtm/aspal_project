/**
 * Fundamentos para /componentes. Las clases van escritas enteras para que
 * Tailwind las genere. Fuente: docs/design-guidelines.md.
 */
export const COLORES = [
  {
    token: "primary",
    nombre: "Pizarra",
    muestra: "bg-primary",
    uso: "Títulos, botones de contorno, bandas institucionales",
  },
  {
    token: "secondary",
    nombre: "Miel",
    muestra: "bg-secondary",
    uso: "Botón primario (Únete), acentos. Nunca como texto sobre blanco",
  },
  {
    token: "brand-noche",
    nombre: "Noche",
    muestra: "bg-noche",
    uso: "Hero, banda final, franja del pie",
  },
  {
    token: "miel-texto",
    nombre: "Miel texto",
    muestra: "bg-miel-texto",
    uso: "Overlines y etiquetas sobre claro",
  },
  {
    token: "fondo-suave",
    nombre: "Fondo suave",
    muestra: "bg-fondo-suave",
    uso: "Bandas alternas",
  },
  { token: "accent", nombre: "Acento", muestra: "bg-accent", uso: "Tarjetas destacadas" },
  {
    token: "muted-foreground",
    nombre: "Texto secundario",
    muestra: "bg-muted-foreground",
    uso: "Descripciones, metadatos",
  },
  { token: "background", nombre: "Fondo", muestra: "bg-background", uso: "Fondo base" },
] as const;

export const TIPOGRAFIA = [
  { nivel: "H1", clases: "text-5xl lg:text-6xl font-bold", muestra: "La red en español" },
  {
    nivel: "H2",
    clases: "text-3xl md:text-4xl font-bold",
    muestra: "Los 4 Pilares ASPAL",
  },
  { nivel: "H3", clases: "text-2xl font-semibold", muestra: "Comunidad" },
  {
    nivel: "Cuerpo",
    clases: "text-lg",
    muestra: "Profesionalizamos la gestión asociativa en América Latina.",
  },
  {
    nivel: "Overline",
    clases: "text-[13px] font-semibold uppercase tracking-wider text-miel-texto",
    muestra: "Mapa de Ruta",
  },
] as const;
