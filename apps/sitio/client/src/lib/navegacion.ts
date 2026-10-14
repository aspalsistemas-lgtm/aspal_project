/**
 * Fuente única de verdad de la navegación del sitio y de las URLs de la
 * plataforma de comunidad.
 *
 * Existe por la misma razón que `shared/wordpress/`: la URL de registro estaba
 * escrita a mano en dos sitios (`Header.tsx`, hoy `CabeceraSitio.tsx`, y `HeroSection.tsx`), divergieron,
 * y la del Hero apuntaba a `asociacionesprofesionales.org` sin el subdominio
 * `comunidad.` — que sirve un documento vacío. Un solo módulo, dos consumidores.
 *
 * Un destino sin `href` es una sección que todavía no existe: se muestra en el
 * menú marcada como "Próximamente", nunca como enlace. Antes esos destinos
 * apuntaban a anclas (`#biblioteca`, `#cursos`…) que no existen en ninguna
 * página: el clic no hacía absolutamente nada.
 */

import { registrarEvento } from "./analitica";
import {
  Activity,
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  CircleHelp,
  Contact,
  FileSearch,
  Gift,
  Globe,
  GraduationCap,
  Handshake,
  Info,
  Landmark,
  Layers,
  Library,
  Mail,
  MapPin,
  Megaphone,
  MessagesSquare,
  Mic,
  Newspaper,
  Presentation,
  Quote,
  Route,
  Trophy,
  UserPlus,
  Users,
  UsersRound,
  Video,
  type LucideIcon,
} from "lucide-react";

export const COMUNIDAD = "https://comunidad.asociacionesprofesionales.org";

export const URL_REGISTRO = `${COMUNIDAD}/register/membresia-basica/`;
export const URL_LOGIN = `${COMUNIDAD}/login/`;

/**
 * Un destino concreto del menú. Sin `href` = sección aún no construida.
 *
 * El `icono` es decorativo: siempre acompaña a la etiqueta escrita, nunca la
 * sustituye, y va con `aria-hidden`. Se eligen siluetas distintas entre sí
 * —periódico, micrófono, birrete, libros, bocadillos, personas, calendario,
 * edificio, maletín— porque a 16px lo que distingue un icono de otro es la
 * forma, no el detalle.
 */
export interface DestinoNav {
  etiqueta: string;
  /** Una línea de contexto: el público no conoce el vocabulario interno. */
  descripcion: string;
  icono: LucideIcon;
  href?: string;
  externo?: boolean;
  testid: string;
}

/** Un grupo con título dentro de un mega-menú (Recursos: Aprende, Certifícate…). */
export interface GrupoNav {
  titulo: string;
  testid: string;
  destinos: DestinoNav[];
}

/**
 * Una entrada de primer nivel. Despliega `destinos` (lista simple) o `grupos`
 * (mega-menú), o es un enlace suelto con `href`. Sin nada de eso, es un rubro
 * que todavía no existe y se anuncia como «Próximamente».
 */
export interface EntradaNav {
  etiqueta: string;
  testid: string;
  icono: LucideIcon;
  href?: string;
  externo?: boolean;
  destinos?: DestinoNav[];
  grupos?: GrupoNav[];
}

/**
 * Arquitectura de la Etapa 1: la opción recomendada para la decisión D1 del
 * plan (Acerca de · Recursos · Eventos · Membresía · Comunidad, más el botón
 * Únete). Recursos es el catálogo completo; Eventos y Comunidad son atajos,
 * repetidos a propósito, a los grupos Participa y Conecta.
 *
 * Cada destino sin página se queda sin `href` («Próximamente») hasta el PR que
 * crea su ruta: el test de enlaces muertos lo exige.
 */
export const NAVEGACION: EntradaNav[] = [
  {
    etiqueta: "Acerca de",
    testid: "menu-acerca-de",
    icono: Info,
    // PENDIENTE (Etapa 0): /contacto.
    destinos: [
      {
        etiqueta: "Nosotros",
        descripcion: "Quiénes somos y qué defendemos",
        icono: Building2,
        href: "/nosotros",
        testid: "link-nosotros",
      },
      {
        etiqueta: "¿Qué hacemos?",
        descripcion: "Los cuatro pilares de ASPAL",
        icono: Layers,
        href: "/que-hacemos",
        testid: "link-que-hacemos",
      },
      {
        etiqueta: "Nuestro equipo",
        descripcion: "Las personas detrás de ASPAL",
        icono: UsersRound,
        href: "/nuestro-equipo",
        testid: "link-equipo",
      },
      {
        etiqueta: "Contacto",
        descripcion: "Escríbenos o llámanos",
        icono: Mail,
        testid: "link-contacto",
      },
      {
        etiqueta: "Consejo Directivo",
        descripcion: "Quién gobierna ASPAL",
        icono: Landmark,
        testid: "link-consejo",
      },
      {
        etiqueta: "Aliados y patrocinadores",
        descripcion: "Organizaciones que nos respaldan",
        icono: Handshake,
        testid: "link-aliados",
      },
      {
        etiqueta: "Iniciativas LATAM y Agenda",
        descripcion: "Lo que impulsamos en la región",
        icono: Globe,
        testid: "link-iniciativas",
      },
      {
        etiqueta: "Sala de prensa",
        descripcion: "Noticias y materiales para medios",
        icono: Megaphone,
        testid: "link-prensa",
      },
      {
        etiqueta: "Mensaje del Director General",
        descripcion: "La visión de la dirección",
        icono: Quote,
        testid: "link-mensaje-dg",
      },
    ],
  },
  {
    etiqueta: "Recursos",
    testid: "menu-recursos",
    icono: Library,
    grupos: [
      {
        titulo: "Aprende",
        testid: "grupo-aprende",
        destinos: [
          {
            etiqueta: "Blog",
            descripcion: "Artículos y análisis del sector",
            icono: Newspaper,
            href: "/blog",
            testid: "link-blog",
          },
          {
            etiqueta: "Podcast Conexión Profesional",
            descripcion: "Conversaciones con el sector",
            icono: Mic,
            href: "/podcast",
            testid: "link-podcast",
          },
          {
            etiqueta: "Mapa de Ruta",
            descripcion: "El camino de una asociación en siete etapas",
            icono: Route,
            href: "/mapa-de-ruta",
            testid: "link-mapa-ruta",
          },
          {
            etiqueta: "Estudios e investigaciones",
            descripcion: "Datos del sector asociativo",
            icono: FileSearch,
            testid: "link-estudios",
          },
          {
            etiqueta: "Biblioteca digital",
            descripcion: "Documentos y recursos descargables",
            icono: Library,
            testid: "link-biblioteca",
          },
        ],
      },
      {
        titulo: "Certifícate",
        testid: "grupo-certificate",
        destinos: [
          {
            etiqueta: "Cursos en línea",
            descripcion: "Capacitación para tu equipo",
            icono: GraduationCap,
            href: `${COMUNIDAD}/cursos/`,
            externo: true,
            testid: "link-cursos",
          },
          {
            etiqueta: "Bootcamps de directivos",
            descripcion: "Formación intensiva para quien dirige",
            icono: Presentation,
            testid: "link-bootcamps",
          },
          {
            etiqueta: "Certificación CGA",
            descripcion: "Acreditación profesional del sector",
            icono: Award,
            testid: "link-cga",
          },
        ],
      },
      {
        titulo: "Participa",
        testid: "grupo-participa",
        destinos: [
          {
            etiqueta: "Calendario de eventos",
            descripcion: "Lo que viene en la agenda",
            icono: CalendarDays,
            testid: "link-calendario",
          },
          {
            etiqueta: "Webinars mensuales",
            descripcion: "Sesiones en vivo con expertos",
            icono: Video,
            testid: "link-webinars",
          },
          {
            etiqueta: "Encuentro CDMX 2027",
            descripcion: "El encuentro latinoamericano del sector",
            icono: MapPin,
            testid: "link-encuentro",
          },
          {
            etiqueta: "Premios ASPAL",
            descripcion: "Reconocimiento a las mejores prácticas",
            icono: Trophy,
            testid: "link-premios",
          },
        ],
      },
      {
        titulo: "Conecta",
        testid: "grupo-conecta",
        destinos: [
          {
            etiqueta: "Comunidad",
            descripcion: "El feed de la red ASPAL",
            icono: MessagesSquare,
            href: `${COMUNIDAD}/comunidad/`,
            externo: true,
            testid: "link-recursos-comunidad",
          },
          {
            etiqueta: "Directorio de miembros",
            descripcion: "Quién es quién en la red",
            icono: Users,
            href: `${COMUNIDAD}/miembros/`,
            externo: true,
            testid: "link-recursos-miembros",
          },
          {
            etiqueta: "Directorio de la industria",
            descripcion: "Proveedores y aliados del sector",
            icono: Building2,
            testid: "link-directorio-industria",
          },
          {
            etiqueta: "Bolsa de trabajo",
            descripcion: "Vacantes del sector asociativo",
            icono: Briefcase,
            testid: "link-bolsa",
          },
        ],
      },
    ],
  },
  {
    etiqueta: "Eventos",
    testid: "menu-eventos",
    icono: CalendarDays,
    href: "/eventos",
  },
  {
    etiqueta: "Membresía",
    testid: "menu-membresia",
    icono: BadgeCheck,
    destinos: [
      {
        etiqueta: "Membresía básica",
        descripcion: "Accede a la plataforma de comunidad",
        icono: BadgeCheck,
        href: URL_REGISTRO,
        externo: true,
        testid: "link-membresia-basica",
      },
      {
        etiqueta: "Únete gratis",
        descripcion: "Suscríbete sin costo",
        icono: UserPlus,
        href: "/unete",
        testid: "link-unete",
      },
      {
        etiqueta: "Niveles y precios",
        descripcion: "Compara las opciones de membresía",
        icono: Layers,
        testid: "link-niveles",
      },
      {
        etiqueta: "Beneficios",
        descripcion: "Lo que recibes como miembro",
        icono: Gift,
        testid: "link-beneficios",
      },
      {
        etiqueta: "Preguntas frecuentes",
        descripcion: "Resolvemos tus dudas",
        icono: CircleHelp,
        testid: "link-preguntas",
      },
    ],
  },
  {
    etiqueta: "Comunidad",
    testid: "menu-comunidad",
    icono: Users,
    destinos: [
      {
        etiqueta: "Actividad de la red",
        descripcion: "Lo último en la comunidad",
        icono: Activity,
        href: `${COMUNIDAD}/comunidad/`,
        externo: true,
        testid: "link-comunidad-actividad",
      },
      {
        etiqueta: "Grupos",
        descripcion: "Grupos de trabajo y de interés",
        icono: UsersRound,
        href: `${COMUNIDAD}/grupos/`,
        externo: true,
        testid: "link-comunidad-grupos",
      },
      {
        etiqueta: "Directorio de miembros",
        descripcion: "Quién es quién en la red",
        icono: Contact,
        href: `${COMUNIDAD}/miembros/`,
        externo: true,
        testid: "link-comunidad-miembros",
      },
      {
        etiqueta: "Foros por etapa del Mapa de Ruta",
        descripcion: "Conversación por etapa",
        icono: MessagesSquare,
        testid: "link-foros",
      },
    ],
  },
];

/** Entradas que forman columna en el pie, en orden (§6.7 del plan). */
export const ENTRADAS_PIE: readonly string[] = [
  "menu-acerca-de",
  "menu-recursos",
  "menu-eventos",
  "menu-membresia",
];

/** Todos los destinos de una entrada, con grupos aplanados, en orden de pintado. */
export function destinosDe(entrada: EntradaNav): DestinoNav[] {
  return entrada.grupos
    ? entrada.grupos.flatMap((grupo) => grupo.destinos)
    : (entrada.destinos ?? []);
}

/** Las listas que se pintan juntas: cada grupo, o la lista simple. */
export function listasDe(entrada: EntradaNav): DestinoNav[][] {
  if (entrada.grupos) return entrada.grupos.map((grupo) => grupo.destinos);
  return entrada.destinos ? [entrada.destinos] : [];
}

export function esDesplegable(entrada: EntradaNav): boolean {
  return destinosDe(entrada).length > 0;
}

/**
 * En el pie solo van destinos vivos: el catálogo completo es del menú. Una
 * entrada sin ninguno pero con `href` propio aparece como un único enlace.
 */
export function destinosPie(entrada: EntradaNav): DestinoNav[] {
  const vivos = destinosDe(entrada).filter((destino) => Boolean(destino.href));
  if (vivos.length > 0 || !entrada.href) return vivos;
  // Sin destinos vivos pero con página propia (Eventos): la columna enlaza a ella.
  return [
    {
      etiqueta: entrada.etiqueta,
      descripcion: entrada.etiqueta,
      icono: entrada.icono,
      href: entrada.href,
      externo: entrada.externo,
      testid: `${entrada.testid}-enlace`,
    },
  ];
}

/**
 * Analítica de un clic en un destino (RF-12): siempre `click_menu`, y además
 * `salida_plataforma` si el destino sale del dominio.
 */
export function registrarClicDestino(
  destino: DestinoNav,
  origen: "menu" | "menu_movil" | "footer",
): void {
  if (!destino.href) return;
  registrarEvento("click_menu", {
    destino: destino.href,
    etiqueta: destino.etiqueta,
    origen,
  });
  if (destino.externo) {
    registrarEvento("salida_plataforma", { destino: destino.href, origen });
  }
}

/**
 * ¿Esta ruta interna es la que se está viendo?
 *
 * `/blog` sigue activa dentro de `/blog/:slug`: el usuario está leyendo un
 * artículo y el menú debe seguir señalando de dónde viene. La comparación es
 * por segmento completo, para que `/blog` no se active en un futuro
 * `/blogosfera`.
 *
 * Los destinos externos y los que aún no existen nunca están activos.
 */
export function esRutaActiva(href: string | undefined, ruta: string): boolean {
  if (!href || href.startsWith("http")) return false;
  if (href === "/") return ruta === "/";
  return ruta === href || ruta.startsWith(`${href}/`);
}

/** Un rubro se marca activo si lo está su propio enlace o cualquiera de sus destinos. */
export function esEntradaActiva(entrada: EntradaNav, ruta: string): boolean {
  return (
    esRutaActiva(entrada.href, ruta) ||
    destinosDe(entrada).some((destino) => esRutaActiva(destino.href, ruta))
  );
}
