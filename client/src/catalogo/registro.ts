/**
 * Catálogo de componentes: una entrada por archivo de `client/src/components/`.
 * Lo lee la página /componentes y, sobre todo, quien vaya a crear una vista:
 * antes de escribir un componente, busca aquí uno que ya lo resuelva
 * (`usarCuando`, `evitarPara`). `registro.test.ts` falla si un componente no
 * está registrado o si su `estado` no coincide con quién lo importa.
 */
import type { Categoria, EntradaCatalogo, Nivel } from "./tipos";

export const CATEGORIAS: readonly {
  id: Categoria;
  titulo: string;
  descripcion: string;
}[] = [
  {
    id: "layout",
    titulo: "Estructura de página",
    descripcion: "Lo que arma cualquier página: bandas, hero, cabecera, pie.",
  },
  {
    id: "institucional",
    titulo: "Institucional",
    descripcion:
      "Piezas de Nosotros, ¿Qué hacemos?, Equipo y Mapa de Ruta. Leen su copy de client/src/content/institucional.",
  },
  {
    id: "contenido",
    titulo: "Contenido de WordPress",
    descripcion: "Tarjetas y bloques que pintan artículos y episodios de /api/*.",
  },
  {
    id: "formularios",
    titulo: "Formularios",
    descripcion: "Captura de datos. Validan con la misma función que el servidor.",
  },
  {
    id: "ui",
    titulo: "Base (shadcn/ui)",
    descripcion:
      "Primitivas tematizadas con los tokens del sitio. Solo las que se usan; una nueva se añade con el CLI de shadcn.",
  },
  {
    id: "legado",
    titulo: "Legado de /plataforma",
    descripcion:
      "Secciones de la antigua home de producto. Solo viven en /plataforma: no las reutilices en páginas nuevas.",
  },
  {
    id: "infraestructura",
    titulo: "Infraestructura",
    descripcion:
      "Componentes sin interfaz propia que montan comportamiento global en App.tsx.",
  },
];

/** Etiqueta de cada nivel de Atomic Design, para la ficha de /componentes. */
export const ETIQUETA_NIVEL: Record<Nivel, string> = {
  atomo: "Átomo",
  molecula: "Molécula",
  organismo: "Organismo",
  plantilla: "Plantilla",
  infraestructura: "Infraestructura",
  legado: "Legado",
};

export const REGISTRO = [
  // ── Estructura de página ───────────────────────────────────────────────
  {
    id: "banda",
    nombre: "Banda",
    archivo: "client/src/components/layout/Banda.tsx",
    importar: 'import { Banda } from "@/components/layout/Banda";',
    categoria: "layout",
    nivel: "plantilla",
    descripcion:
      "Franja horizontal a todo el ancho con el contenedor y el espaciado del sitio (py-16 md:py-24, max-w-7xl).",
    usarCuando: "Cada bloque de una página. Alterna tonos: blanco → suave → noche.",
    evitarPara:
      "Tarjetas o cajas dentro de una banda: para eso, un div con rounded-2xl border.",
    props:
      'tono?: "blanco" | "suave" | "noche"; id?: string; className?: string; children',
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "hero-institucional",
    nombre: "HeroInstitucional",
    archivo: "client/src/components/layout/HeroInstitucional.tsx",
    importar:
      'import { HeroInstitucional } from "@/components/layout/HeroInstitucional";',
    categoria: "layout",
    nivel: "plantilla",
    descripcion:
      "Banda noche con overline miel y el único <h1> de la página. Con `visual`, añade una columna a la derecha desde lg (foto o PatronPanal); en móvil no se pinta. Sin animaciones: se prerenderiza.",
    usarCuando:
      "La cabecera de cualquier página institucional nueva. `visual` para la home o páginas que necesiten ancla visual.",
    evitarPara: "Más de una vez por página (pinta el <h1>).",
    props:
      "overline: string; overlineNormal?: boolean; titulo: string; visual?: ReactNode; children?",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "proximamente",
    nombre: "Proximamente",
    archivo: "client/src/components/atoms/Proximamente.tsx",
    importar: 'import { Proximamente } from "@/components/atoms/Proximamente";',
    categoria: "layout",
    nivel: "atomo",
    descripcion: "Etiqueta «Próximamente» para un destino que aún no existe.",
    usarCuando: "Junto a un enlace o sección sin página todavía (menú, pilares, pie).",
    props: "className?: string",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "patron-panal",
    nombre: "PatronPanal",
    archivo: "client/src/components/atoms/PatronPanal.tsx",
    importar: 'import { PatronPanal } from "@/components/atoms/PatronPanal";',
    categoria: "layout",
    nivel: "atomo",
    descripcion:
      "Panal de hexágonos de la marca (el isotipo repetido), con un racimo destacado en miel y bordes que se desvanecen. SVG decorativo (aria-hidden). Con `animado`, el racimo se arma celda a celda al cargar (una vez por página: en el hero).",
    usarCuando:
      "Fondos noche que necesitan ancla visual sin foto: la columna `visual` del hero, detrás de una foto, bandas de cierre.",
    evitarPara:
      "Fondos claros (está pensado en miel sobre noche) o como relleno de todas las bandas: pierde fuerza.",
    props: "className?: string; animado?: boolean",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "foto-hero",
    nombre: "FotoHero",
    archivo: "client/src/components/atoms/FotoHero.tsx",
    importar: 'import { FotoHero } from "@/components/atoms/FotoHero";',
    categoria: "layout",
    nivel: "atomo",
    descripcion:
      "Foto del hero tratada con el hexágono de la marca: «hexagono» (recorte hexagonal con contorno miel desplazado y celda miel), «panal» (la foto repartida en celdas del isotipo, que se ensamblan en cascada al cargar) o «sangrado» (hasta el borde derecho con zigzag hexagonal). Solo descarga la foto desde lg.",
    usarCuando:
      "La columna `visual` de HeroInstitucional cuando hay foto (FOTO_HERO en content/institucional/inicio.ts).",
    evitarPara:
      "«panal» con una foto sin reencuadrar: su encuadre (ENCUADRE_PANAL) está ajustado a mano para la foto actual.",
    props: 'src: string; alt: string; estilo?: "hexagono" | "panal" | "sangrado"',
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "aviso-pestana-nueva",
    nombre: "AvisoPestanaNueva",
    archivo: "client/src/components/atoms/AvisoPestanaNueva.tsx",
    importar: 'import { AvisoPestanaNueva } from "@/components/atoms/AvisoPestanaNueva";',
    categoria: "layout",
    nivel: "atomo",
    descripcion:
      "Texto solo para lectores de pantalla: « (se abre en otra pestaña)». El espacio inicial va dentro del span.",
    usarCuando: 'Dentro de todo enlace con target="_blank", junto al icono ↗.',
    props: "sin props",
    estado: "en-uso",
    vista: "sin-vista",
  },
  {
    id: "header",
    nombre: "Header",
    archivo: "client/src/components/layout/Header.tsx",
    importar: 'import Header from "@/components/layout/Header";',
    categoria: "layout",
    nivel: "organismo",
    descripcion:
      "Cabecera con los cinco rubros (mega-menú desde 1280 px), panel móvil modal y botón Únete. Lee client/src/lib/navegacion.ts.",
    usarCuando:
      "Primera pieza de toda página. Para cambiar el menú, edita navegacion.ts, no este componente.",
    props: "sin props",
    estado: "en-uso",
    vista: "en-esta-pagina",
  },
  {
    id: "footer",
    nombre: "Footer",
    archivo: "client/src/components/layout/Footer.tsx",
    importar: 'import Footer from "@/components/layout/Footer";',
    categoria: "layout",
    nivel: "organismo",
    descripcion:
      "Pie institucional: boletín, cuatro columnas de navegación, contacto y franja legal.",
    usarCuando:
      "Última pieza de toda página. conBoletin={false} si la página ya tiene su propio formulario de boletín.",
    props: "conBoletin?: boolean",
    estado: "en-uso",
    vista: "en-esta-pagina",
  },
  {
    id: "saltar-al-contenido",
    nombre: "SaltarAlContenido",
    archivo: "client/src/components/layout/SaltarAlContenido.tsx",
    importar:
      'import { SaltarAlContenido } from "@/components/layout/SaltarAlContenido";',
    categoria: "infraestructura",
    nivel: "infraestructura",
    descripcion:
      'Primer enlace de cada página (visible al tabular): salta al <main id="contenido">.',
    usarCuando:
      'Ya está en App.tsx. Toda página nueva necesita su <main id="contenido" tabIndex={-1}> (el build lo exige).',
    props: "sin props",
    estado: "en-uso",
    vista: "en-esta-pagina",
  },
  {
    id: "scroll-to-top",
    nombre: "ScrollToTop",
    archivo: "client/src/components/layout/ScrollToTop.tsx",
    importar: 'import { ScrollToTop } from "@/components/layout/ScrollToTop";',
    categoria: "layout",
    nivel: "molecula",
    descripcion: "Botón flotante «volver arriba» que aparece tras 300 px de scroll.",
    usarCuando: "Ya está en App.tsx; no se añade por página.",
    props: "sin props",
    estado: "en-uso",
    vista: "en-esta-pagina",
  },
  {
    id: "cabecera-ruta",
    nombre: "CabeceraRuta",
    archivo: "client/src/components/layout/CabeceraRuta.tsx",
    importar: 'import { CabeceraRuta } from "@/components/layout/CabeceraRuta";',
    categoria: "infraestructura",
    nivel: "infraestructura",
    descripcion:
      "Mantiene título y descripción al navegar sin recargar y canonicaliza mayúsculas en la URL.",
    usarCuando:
      "Ya está en App.tsx. El título de una página nueva va en SEO de client/src/lib/seo.ts.",
    props: "sin props",
    estado: "en-uso",
    vista: "sin-vista",
  },
  {
    id: "scroll-restoration",
    nombre: "ScrollRestoration",
    archivo: "client/src/components/layout/ScrollRestoration.tsx",
    importar:
      'import { ScrollRestoration } from "@/components/layout/ScrollRestoration";',
    categoria: "infraestructura",
    nivel: "infraestructura",
    descripcion:
      "Restaura el scroll con Atrás/Adelante y lleva a las anclas (#etapa-3, #tecnologia) al entrar o recargar.",
    usarCuando: "Ya está en App.tsx. Las anclas nuevas solo necesitan id y scroll-mt-32.",
    props: "sin props",
    estado: "en-uso",
    vista: "sin-vista",
  },
  {
    id: "error-boundary",
    nombre: "ErrorBoundary",
    archivo: "client/src/components/layout/ErrorBoundary.tsx",
    importar: 'import { ErrorBoundary } from "@/components/layout/ErrorBoundary";',
    categoria: "infraestructura",
    nivel: "infraestructura",
    descripcion:
      "Captura errores de render y muestra una salida (recargar o ir al inicio) en vez de una pantalla en blanco.",
    usarCuando: "Ya envuelve el Router en App.tsx.",
    props: "children",
    estado: "en-uso",
    vista: "sin-vista",
  },

  // ── Institucional ──────────────────────────────────────────────────────
  {
    id: "pilar-card",
    nombre: "PilarCard",
    archivo: "client/src/components/institucional/PilarCard.tsx",
    importar: 'import { PilarCard } from "@/components/institucional/PilarCard";',
    categoria: "institucional",
    nivel: "molecula",
    descripcion:
      "Tarjeta de uno de los 4 pilares en resumen (h3): nombre, subtítulo y compromiso; toda la tarjeta lleva a su sección de ¿Qué hacemos? y su flecha avanza al pasar el ratón. Con `ilustracion`, la ilustración de la marca sale de una insignia hexagonal que rompe el borde superior y se asoma al entrar en pantalla (el contenedor le deja 40 px: pt-10); con `numero`, el número en grande en contorno miel.",
    usarCuando:
      "Resumir los pilares en otra página (home, Nosotros). Datos en content/institucional/pilares.ts.",
    evitarPara: "El detalle de un pilar en ¿Qué hacemos?: para eso, SeccionPilar.",
    props: "pilar: Pilar; ilustracion?: boolean; numero?: number",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "ilustracion-pilar",
    nombre: "IlustracionPilar",
    archivo: "client/src/components/atoms/IlustracionPilar.tsx",
    importar: 'import { IlustracionPilar } from "@/components/atoms/IlustracionPilar";',
    categoria: "institucional",
    nivel: "atomo",
    descripcion:
      "La ilustración de un pilar asomando desde su hexágono sobre el panal de la marca. Se asoma al cargar. Decorativa.",
    usarCuando:
      "Columna visual del hero de una página que pertenece a un pilar (el blog es Conocimiento).",
    evitarPara: "¿Qué hacemos?: allí cada pilar ya tiene su SeccionPilar.",
    props: "pilar: Pilar",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "seccion-pilar",
    nombre: "SeccionPilar",
    archivo: "client/src/components/institucional/SeccionPilar.tsx",
    importar: 'import { SeccionPilar } from "@/components/institucional/SeccionPilar";',
    categoria: "institucional",
    nivel: "organismo",
    descripcion:
      "Un pilar como sección editorial, con su ancla: ilustración en un hexágono grande que desborda por arriba y se asoma al entrar en pantalla, número en contorno miel, subtítulo como declaración, compromiso, «cómo se traduce» en recuadro y los accesos como píldoras («Próximamente» si aún no existen). Los pares van en banda suave con la ilustración a la derecha.",
    usarCuando:
      "El detalle de cada pilar en ¿Qué hacemos?. Ya es una Banda: no la envuelvas.",
    evitarPara: "Resumir los pilares en otra página: para eso, PilarCard.",
    props: "pilar: Pilar; numero: number; siguiente?: Pilar",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "indice-pilares",
    nombre: "IndicePilares",
    archivo: "client/src/components/institucional/IndicePilares.tsx",
    importar: 'import { IndicePilares } from "@/components/institucional/IndicePilares";',
    categoria: "institucional",
    nivel: "molecula",
    descripcion:
      "Los 4 pilares de un vistazo (insignia con icono, «Pilar 01», nombre y subtítulo), cada uno con un salto a su SeccionPilar en la misma página.",
    usarCuando: "Bajo el hero de ¿Qué hacemos?: índice de la página, también en móvil.",
    evitarPara:
      "Enlazar a los pilares desde otra página: PilarCard ya lleva a /que-hacemos#id.",
    props: "sin props (lee PILARES)",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "panal-pilares",
    nombre: "PanalPilares",
    archivo: "client/src/components/institucional/PanalPilares.tsx",
    importar: 'import { PanalPilares } from "@/components/institucional/PanalPilares";',
    categoria: "institucional",
    nivel: "organismo",
    descripcion:
      "Los 4 pilares como un racimo de 4 celdas del panal, cada una con su ilustración, sobre PatronPanal. Las celdas se arman una tras otra al cargar. Decorativo.",
    usarCuando:
      "Columna visual del hero de ¿Qué hacemos? (`visual` de HeroInstitucional).",
    evitarPara: "Fondos sin relación con los pilares: para eso, PatronPanal.",
    props: "sin props (lee PILARES)",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "ruta-timeline",
    nombre: "RutaTimeline",
    archivo: "client/src/components/institucional/RutaTimeline.tsx",
    importar: 'import { RutaTimeline } from "@/components/institucional/RutaTimeline";',
    categoria: "institucional",
    nivel: "organismo",
    descripcion:
      "Ruta por años como camino: insignia hexagonal con icono por hito, línea que los une desde xl (se traza al entrar en pantalla), todo el texto a la vista y «Estamos aquí» en el hito en curso.",
    usarCuando: "Metas o hitos en el tiempo (Ruta ASPAL 2026–2030).",
    evitarPara:
      "Pasos de un proceso que llevan a otra página: para eso, IndiceEtapas (home).",
    props: "hitos: Hito[]",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "perfil-card",
    nombre: "PerfilCard",
    archivo: "client/src/components/institucional/PerfilCard.tsx",
    importar: 'import { PerfilCard } from "@/components/institucional/PerfilCard";',
    categoria: "institucional",
    nivel: "molecula",
    descripcion:
      "Perfil de una persona con su retrato en el hexágono del isotipo (foto o, sin ella, iniciales): nombre (h3), cargo, bio y LinkedIn. En fila por defecto; `destacado`, tarjeta ancha con el retrato grande en miel y la bio como declaración.",
    usarCuando:
      "Equipo, Consejo, ponentes. `destacado` para una sola persona al frente (la Dirección General).",
    props: "perfil: Perfil; destacado?: boolean",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "retrato-hex",
    nombre: "RetratoHex",
    archivo: "client/src/components/atoms/RetratoHex.tsx",
    importar: 'import { RetratoHex } from "@/components/atoms/RetratoHex";',
    categoria: "institucional",
    nivel: "atomo",
    descripcion:
      "Retrato de una persona en el hexágono del isotipo: la foto recortada o, sin foto, sus iniciales sobre noche, miel o claro. El tamaño lo dan el ancho y la letra de className.",
    usarCuando:
      "Cara de una persona del equipo o del Consejo (PerfilCard, RacimoEquipo).",
    evitarPara: "Testimonios de la red: VocesRed ya trae su retrato redondo de 1:1.",
    props: 'perfil: Perfil; tono?: "noche" | "miel" | "claro"; className?: string',
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "racimo-equipo",
    nombre: "RacimoEquipo",
    archivo: "client/src/components/institucional/RacimoEquipo.tsx",
    importar: 'import { RacimoEquipo } from "@/components/institucional/RacimoEquipo";',
    categoria: "institucional",
    nivel: "molecula",
    descripcion:
      "El equipo como racimo de 3 celdas del panal (RetratoHex) sobre PatronPanal: la primera persona en miel, las demás en claro. Se arma al cargar. Decorativo.",
    usarCuando:
      "Columna visual del hero de Nuestro equipo (`visual` de HeroInstitucional).",
    evitarPara: "Listar al equipo: los perfiles van en PerfilCard.",
    props: "perfiles: Perfil[] (usa los 3 primeros)",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "muro-aliados",
    nombre: "MuroAliados",
    archivo: "client/src/components/institucional/MuroAliados.tsx",
    importar: 'import { MuroAliados } from "@/components/institucional/MuroAliados";',
    categoria: "institucional",
    nivel: "organismo",
    descripcion:
      "Rejilla estática de aliados con logo y descripción, y categorías pendientes opcionales.",
    usarCuando: "Aliados o patrocinadores. Sin carrusel automático (accesibilidad).",
    props: "fundadores: Aliado[]; pendientes?: string[]",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "subnav-seccion",
    nombre: "SubnavSeccion",
    archivo: "client/src/components/institucional/SubnavSeccion.tsx",
    importar: 'import { SubnavSeccion } from "@/components/institucional/SubnavSeccion";',
    categoria: "institucional",
    nivel: "molecula",
    descripcion:
      "Subnavegación fija bajo la cabecera con las páginas de «Acerca de», marcando la activa.",
    usarCuando: "Páginas de Acerca de. Sus destinos salen de navegacion.ts.",
    props: "sin props",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "indice-etapas",
    nombre: "IndiceEtapas",
    archivo: "client/src/components/institucional/IndiceEtapas.tsx",
    importar: 'import { IndiceEtapas } from "@/components/institucional/IndiceEtapas";',
    categoria: "institucional",
    nivel: "molecula",
    descripcion:
      "Las 7 etapas del Mapa de Ruta como paso a paso: insignia hexagonal con icono, línea que las une desde xl y «Empieza aquí» en la 1; cada una enlaza a /mapa-de-ruta#etapa-N. Al entrar en pantalla la línea se traza y las insignias se activan en secuencia.",
    usarCuando: "Llevar al Mapa de Ruta desde otra página (home).",
    evitarPara: "El índice de la propia /mapa-de-ruta: para eso, IndiceMapa.",
    props: "sin props (lee ETAPAS)",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "indice-mapa",
    nombre: "IndiceMapa",
    archivo: "client/src/components/institucional/IndiceMapa.tsx",
    importar: 'import { IndiceMapa } from "@/components/institucional/IndiceMapa";',
    categoria: "institucional",
    nivel: "molecula",
    descripcion:
      "Índice de /mapa-de-ruta: una celda miel con las cifras (pasos y etapas, contados de los datos) y la descarga del PDF, y una tarjeta por etapa con icono, resumen y rango de pasos que salta a su sección.",
    usarCuando: "Bajo el hero de /mapa-de-ruta.",
    evitarPara: "Enlazar al mapa desde otra página: para eso, IndiceEtapas.",
    props: "sin props (lee ETAPAS y MAPA_RUTA)",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "seccion-etapa",
    nombre: "SeccionEtapa",
    archivo: "client/src/components/institucional/SeccionEtapa.tsx",
    importar: 'import { SeccionEtapa } from "@/components/institucional/SeccionEtapa";',
    categoria: "institucional",
    nivel: "organismo",
    descripcion:
      "Una etapa del Mapa de Ruta como sección con ancla: a la izquierda (fija desde lg) número en contorno, insignia, nombre y resumen; a la derecha los pasos como camino vertical de hexágonos numerados que se traza al entrar en pantalla, la frase de cierre y los enlaces a la etapa anterior y la siguiente.",
    usarCuando:
      "Cada etapa en /mapa-de-ruta, después de NavEtapas. Ya es una Banda: no la envuelvas.",
    props: "etapa: EtapaMapa; anterior?: EtapaMapa; siguiente?: EtapaMapa",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "nav-etapas",
    nombre: "NavEtapas",
    archivo: "client/src/components/institucional/NavEtapas.tsx",
    importar: 'import { NavEtapas } from "@/components/institucional/NavEtapas";',
    categoria: "institucional",
    nivel: "molecula",
    descripcion:
      'Barra fija de progreso por las etapas: la actual con su nombre (desde md) y 7 hexágonos numerados unidos por una línea que se rellena hasta donde vas; la actual en miel con aria-current="step", las vistas en noche. Sigue la etapa que cruza la mitad de la pantalla.',
    usarCuando:
      "En /mapa-de-ruta, en el mismo contenedor que las SeccionEtapa: es sticky y solo se fija dentro de él.",
    evitarPara: "Navegación entre páginas: para eso, SubnavSeccion.",
    props: "sin props (lee ETAPAS y observa #etapa-N)",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "panal-etapas",
    nombre: "PanalEtapas",
    archivo: "client/src/components/institucional/PanalEtapas.tsx",
    importar: 'import { PanalEtapas } from "@/components/institucional/PanalEtapas";',
    categoria: "institucional",
    nivel: "organismo",
    descripcion:
      "El Mapa de Ruta como flor de 7 celdas del panal sobre PatronPanal: las etapas 1–6 en anillo y la 7 (mejora continua) en el centro, la 1 en miel. Se arma al cargar y cada celda salta a su etapa.",
    usarCuando:
      "Columna visual del hero de /mapa-de-ruta (`visual` de HeroInstitucional).",
    evitarPara: "Fuera de /mapa-de-ruta: sus enlaces son anclas de esa página.",
    props: "sin props (lee ETAPAS)",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "cifra-animada",
    nombre: "CifraAnimada",
    archivo: "client/src/components/institucional/CifraAnimada.tsx",
    importar: 'import { CifraAnimada } from "@/components/institucional/CifraAnimada";',
    categoria: "institucional",
    nivel: "molecula",
    descripcion:
      "Cifra («15+», «1,000») que cuenta desde 0 hasta su valor la primera vez que entra en pantalla. Prerender y «reducir movimiento»: el valor final tal cual; el lector de pantalla solo lee el final.",
    usarCuando:
      "Cifras destacadas de una banda (CIFRAS de la home). Solo el número: el tamaño y el color los pone quien la envuelve.",
    evitarPara:
      "Cifras que no son un único entero (rangos, decimales: se muestran sin animar) o datos que el usuario compara al leer (tablas).",
    props: "valor: string; duracion?: number",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "manifiesto-numerado",
    nombre: "ManifiestoNumerado",
    archivo: "client/src/components/institucional/ManifiestoNumerado.tsx",
    importar:
      'import { ManifiestoNumerado } from "@/components/institucional/ManifiestoNumerado";',
    categoria: "institucional",
    nivel: "molecula",
    descripcion:
      "Enunciados de valores o compromisos como manifiesto: lista numerada (01, 02… en contorno miel) con título y texto, separados por una línea.",
    usarCuando: "Lo que defendemos, principios, compromisos: pocos enunciados con texto.",
    evitarPara: "Listas largas o de una línea: ahí basta una lista simple.",
    props: "items: { titulo: string; texto: string }[]",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "hashtag",
    nombre: "Hashtag",
    archivo: "client/src/components/atoms/Hashtag.tsx",
    importar: 'import { Hashtag } from "@/components/atoms/Hashtag";',
    categoria: "institucional",
    nivel: "atomo",
    descripcion:
      "El hashtag de la marca con <wbr> entre sus palabras: en una línea si cabe y, si no, salta entre palabras en vez de desbordar. Solo el texto.",
    usarCuando:
      "El hashtag a tamaño de titular (Nosotros). A 13 px (overlines) cabe siempre y basta {HASHTAG}.",
    props: "texto?: string (por defecto HASHTAG)",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "voces-red",
    nombre: "VocesRed",
    archivo: "client/src/components/institucional/VocesRed.tsx",
    importar: 'import { VocesRed } from "@/components/institucional/VocesRed";',
    categoria: "institucional",
    nivel: "organismo",
    descripcion:
      "Banda noche de testimonios: cita, retrato 1:1 (o iniciales en hexágono), nombre, cargo, organización y país. Con la lista vacía no se pinta.",
    usarCuando:
      "Prueba social con personas reales. Los datos van en TESTIMONIOS de content/institucional/inicio.ts.",
    evitarPara: "Citas inventadas o sin permiso de la persona.",
    props: "testimonios: Testimonio[]",
    estado: "en-uso",
    vista: "demo",
  },

  // ── Contenido de WordPress ─────────────────────────────────────────────
  {
    id: "franja-podcast",
    nombre: "FranjaPodcast",
    archivo: "client/src/components/content/FranjaPodcast.tsx",
    importar: 'import { FranjaPodcast } from "@/components/content/FranjaPodcast";',
    categoria: "contenido",
    nivel: "organismo",
    descripcion:
      "Un episodio como franja noche con aspecto de reproductor: portada en hexágono, onda de audio en miel (dibujo fijo) y «Escuchar». Toda la franja enlaza al episodio en WordPress, en otra pestaña.",
    usarCuando:
      "Destacar un episodio concreto (el último, uno recomendado) dentro de una banda.",
    evitarPara:
      "Listados de episodios (EpisodioFila) o reproducir audio en la página: no tiene reproductor.",
    props: "episodio: TransformedPost",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "portada-articulo",
    nombre: "PortadaArticulo",
    archivo: "client/src/components/content/PortadaArticulo.tsx",
    importar: 'import { PortadaArticulo } from "@/components/content/PortadaArticulo";',
    categoria: "contenido",
    nivel: "molecula",
    descripcion:
      "El artículo destacado en grande y horizontal: imagen a la izquierda (arriba en móvil), «Artículo destacado», aviso de miembros, titular (h2), extracto, autor y fecha. Enlaza fuera.",
    usarCuando: "El primer artículo de /blog, encima de la rejilla de BlogCard.",
    evitarPara: "La home: su portada de revista es vertical y vive en ContenidoReciente.",
    props: "post: TransformedPost",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "meta-articulo",
    nombre: "MetaArticulo",
    archivo: "client/src/components/content/MetaArticulo.tsx",
    importar: 'import { MetaArticulo } from "@/components/content/MetaArticulo";',
    categoria: "contenido",
    nivel: "molecula",
    descripcion:
      "Autor y fecha de un artículo en una línea; si falta uno, sale el otro solo, y una fecha malformada no se pinta.",
    usarCuando: "Pie de BlogCard y PortadaArticulo; cualquier lista de artículos.",
    props: "post: TransformedPost; className?: string",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "aviso-miembros",
    nombre: "AvisoMiembros",
    archivo: "client/src/components/atoms/AvisoMiembros.tsx",
    importar: 'import { AvisoMiembros } from "@/components/atoms/AvisoMiembros";',
    categoria: "contenido",
    nivel: "atomo",
    descripcion:
      "Píldora «Exclusivo para miembros» con candado: avisa antes del clic de que el cuerpo está tras el muro de la comunidad.",
    usarCuando: "Tarjetas de contenido con `isGated`.",
    evitarPara: "Funciones aún no disponibles: para eso, Proximamente.",
    props: "sin props",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "blog-card",
    nombre: "BlogCard",
    archivo: "client/src/components/content/BlogCard.tsx",
    importar: 'import BlogCard from "@/components/content/BlogCard";',
    categoria: "contenido",
    nivel: "molecula",
    descripcion:
      "Tarjeta de artículo: imagen 16:9 (si la hay), etiqueta opcional («Blog», «Podcast»), «Exclusivo para miembros» si está tras el muro, titular, extracto, autor y fecha. Al pasar el ratón la imagen se acerca y el borde se marca. Enlaza fuera (muro de MemberPress, D9).",
    usarCuando:
      "Listar artículos de /api/posts (rejilla de /blog, «Sigue leyendo»), o mezclar artículos y episodios con `etiqueta`.",
    evitarPara:
      "El artículo destacado de /blog (PortadaArticulo) y la lista de /podcast (EpisodioFila).",
    props: "post: TransformedPost; etiqueta?: string",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "episodio-fila",
    nombre: "EpisodioFila",
    archivo: "client/src/components/content/EpisodioFila.tsx",
    importar: 'import { EpisodioFila } from "@/components/content/EpisodioFila";',
    categoria: "contenido",
    nivel: "molecula",
    descripcion:
      "Un episodio en lista: número en contorno (desde sm), portada en hexágono, «Episodio N», aviso de miembros, título, extracto, fecha y «Escuchar». Toda la fila enlaza fuera.",
    usarCuando:
      "La lista de /podcast, dentro de un <ol> con divide-y. `numero` sobre el total de la colección (useListaPaginada), no sobre lo cargado.",
    evitarPara: "Destacar el último episodio: para eso, FranjaPodcast.",
    props: "episodio: TransformedPost; numero: number",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "portada-podcast",
    nombre: "PortadaPodcast",
    archivo: "client/src/components/content/PortadaPodcast.tsx",
    importar: 'import { PortadaPodcast } from "@/components/content/PortadaPodcast";',
    categoria: "contenido",
    nivel: "molecula",
    descripcion:
      "El podcast como celda miel del panal: auriculares y onda sobre PatronPanal. Se arma al cargar. Decorativa.",
    usarCuando: "Columna visual del hero de /podcast (`visual` de HeroInstitucional).",
    props: "sin props",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "ver-mas",
    nombre: "VerMas",
    archivo: "client/src/components/content/VerMas.tsx",
    importar: 'import { VerMas } from "@/components/content/VerMas";',
    categoria: "contenido",
    nivel: "molecula",
    descripcion:
      "Pie de una lista paginada: «Mostrando X de Y» (aria-live) y el botón que trae la página siguiente; «Cargando…» mientras llega y «Reintentar» si falla. Sin más páginas, solo el recuento.",
    usarCuando:
      "Debajo de una lista de useListaPaginada (/blog, /podcast). El total es el de la colección.",
    evitarPara: "Paginación numerada ni scroll infinito: aquí se carga a petición.",
    props:
      "mostrados, total: number; nombre: string; hayMas, cargando, error: boolean; onCargarMas: () => void; testid: string",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "contenido-reciente",
    nombre: "ContenidoReciente",
    archivo: "client/src/components/content/ContenidoReciente.tsx",
    importar:
      'import { ContenidoReciente } from "@/components/content/ContenidoReciente";',
    categoria: "contenido",
    nivel: "organismo",
    descripcion:
      "Banda de la home como portada de revista: el artículo más reciente en grande, los dos siguientes en lista numerada y el último episodio en FranjaPodcast. Sin fechas a la vista. Si la API falla, desaparece (RF-13); si falla una sola consulta, pinta la otra.",
    usarCuando: "Traer contenido reciente a una página institucional.",
    props: "sin props",
    estado: "en-uso",
    vista: "demo",
  },

  // ── Formularios ────────────────────────────────────────────────────────
  {
    id: "form-suscripcion",
    nombre: "FormSuscripcion",
    archivo: "client/src/components/forms/FormSuscripcion.tsx",
    importar: 'import { FormSuscripcion } from "@/components/forms/FormSuscripcion";',
    categoria: "formularios",
    nivel: "organismo",
    descripcion:
      "Alta al boletín: valida con la misma función que el servidor, envía a /api/suscripcion y explica la doble confirmación.",
    usarCuando: "Cualquier captura de correo. origen etiqueta la alta en Mailchimp.",
    evitarPara: "Formularios que no sean de boletín.",
    props:
      'origen: "unete" | "home" | "footer" | "eventos"; variante: "completo" | "compacto"; tono?: "claro" | "noche"',
    estado: "en-uso",
    vista: "demo",
  },

  // ── Base (shadcn/ui) ───────────────────────────────────────────────────
  {
    id: "button",
    nombre: "Button",
    archivo: "client/src/components/ui/button.tsx",
    importar: 'import { Button } from "@/components/ui/button";',
    categoria: "ui",
    nivel: "atomo",
    descripcion:
      'Botón base. Primario: variant="secondary" (miel). Secundario: outline. Sobre noche: clases de client/src/lib/clases.ts.',
    usarCuando: "Toda acción. Con asChild para envolver un Link o un <a>.",
    evitarPara: "Enlaces de texto dentro de un párrafo.",
    props:
      'variant?: "default" | "secondary" | "outline" | "ghost" | "destructive"; size?: "default" | "sm" | "lg" | "icon"; asChild?: boolean',
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "card",
    nombre: "Card",
    archivo: "client/src/components/ui/card.tsx",
    importar:
      'import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";',
    categoria: "ui",
    nivel: "atomo",
    descripcion:
      "Contenedor con borde y fondo de tarjeta, con partes Header/Title/Description/Content/Footer.",
    usarCuando:
      "Tarjetas de contenido de WordPress. En páginas institucionales se usa un div rounded-2xl border (ver PilarCard).",
    props: "className?; children (componer con CardHeader, CardContent…)",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "input",
    nombre: "Input",
    archivo: "client/src/components/ui/input.tsx",
    importar: 'import { Input } from "@/components/ui/input";',
    categoria: "ui",
    nivel: "atomo",
    descripcion: "Campo de texto tematizado.",
    usarCuando: "Dentro de un formulario, siempre con <label> asociado.",
    props: "props de <input>",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "collapsible",
    nombre: "Collapsible",
    archivo: "client/src/components/ui/collapsible.tsx",
    importar:
      'import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";',
    categoria: "ui",
    nivel: "atomo",
    descripcion: "Bloque que se abre y cierra (acordeones del panel móvil).",
    usarCuando:
      "Grupos desplegables controlados. Para texto estático que se despliega, <details> nativo.",
    props: "open?; onOpenChange?; children",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "tooltip",
    nombre: "Tooltip",
    archivo: "client/src/components/ui/tooltip.tsx",
    importar:
      'import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";',
    categoria: "ui",
    nivel: "atomo",
    descripcion: "Ayuda breve al pasar o enfocar. TooltipProvider ya está en App.tsx.",
    usarCuando:
      "Hoy solo se usa TooltipProvider (App.tsx); Tooltip queda disponible para aclarar un icono. Nunca para información imprescindible (no llega en móvil).",
    props: "Tooltip > TooltipTrigger asChild + TooltipContent",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "toast",
    nombre: "Toast",
    archivo: "client/src/components/ui/toast.tsx",
    // Se lanza desde el hook; el componente de "@/components/ui/toast" lo pinta el Toaster.
    importar:
      'import { toast } from "@/hooks/use-toast"; // pinta: "@/components/ui/toast"',
    categoria: "ui",
    nivel: "atomo",
    descripcion:
      "Aviso temporal en esquina. Se lanza con toast({ title, description }) desde @/hooks/use-toast.",
    usarCuando: "Confirmaciones breves que no requieren acción.",
    evitarPara: "Errores de formulario: van junto al campo (ver FormSuscripcion).",
    props: "toast({ title, description, variant })",
    estado: "en-uso",
    vista: "demo",
  },
  {
    id: "toaster",
    nombre: "Toaster",
    archivo: "client/src/components/ui/toaster.tsx",
    importar: 'import { Toaster } from "@/components/ui/toaster";',
    categoria: "ui",
    nivel: "atomo",
    descripcion: "Contenedor donde aparecen los toasts.",
    usarCuando: "Ya está en App.tsx.",
    props: "sin props",
    estado: "en-uso",
    vista: "en-esta-pagina",
  },
  {
    id: "navigation-menu",
    nombre: "NavigationMenu",
    archivo: "client/src/components/ui/navigation-menu.tsx",
    importar:
      'import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";',
    categoria: "ui",
    nivel: "atomo",
    descripcion: "Primitiva del mega-menú de escritorio (Radix).",
    usarCuando: "Solo la usa Header. axe marca su focus proxy: es interno de Radix.",
    props: "ver Radix NavigationMenu",
    estado: "en-uso",
    vista: "en-esta-pagina",
  },

  // ── Legado de /plataforma ──────────────────────────────────────────────
  ...(
    [
      [
        "hero-section",
        "HeroSection",
        "HeroSection",
        "default",
        "Hero de producto con captura del panel.",
        "sin props",
      ],
      [
        "problem-section",
        "ProblemSection",
        "ProblemSection",
        "default",
        "Bloque problema/solución con ilustración (y MembershipProblemSection).",
        "question: string; solution: string; description: string; benefits: string[]; image: string; imageAlt: string; anchoImagen?: number; altoImagen?: number; reverse?: boolean",
      ],
      [
        "features-grid",
        "FeaturesGrid",
        "FeaturesGrid",
        "default",
        "Rejilla de funcionalidades de producto.",
        "title: string; subtitle: string; features: { icon; title; description }[]; columns?: 2 | 3 | 4",
      ],
      [
        "feature-card",
        "FeatureCard",
        "FeatureCard",
        "default",
        "Tarjeta de una funcionalidad (la usa FeaturesGrid).",
        "icon: LucideIcon; title: string; description: string; index?: number",
      ],
      [
        "logo-carousel",
        "LogoCarousel",
        "LogoCarousel",
        "default",
        "Carrusel de logos de clientes.",
        "sin props",
      ],
      [
        "cta-section",
        "CTASection",
        "CTASection",
        "default",
        "Llamada final a registrarse en la plataforma.",
        "sin props",
      ],
      [
        "community-graphics",
        "CommunityGraphics",
        "HexagonNetwork",
        "named",
        "Gráficos decorativos SVG (HexagonNetwork, DecorativeBlob…).",
        'className?: string (HexagonNetwork y demás); DecorativeBlob: className?; variant?: "primary" | "secondary"',
      ],
    ] as const
  ).map(([id, archivo, nombre, exportacion, descripcion, props]) => ({
    id,
    nombre: archivo,
    archivo: `client/src/components/sections/${archivo}.tsx`,
    importar:
      exportacion === "default"
        ? `import ${nombre} from "@/components/sections/${archivo}";`
        : `import { ${nombre} } from "@/components/sections/${archivo}";`,
    categoria: "legado" as const,
    nivel: "legado" as const,
    descripcion,
    usarCuando: "Solo en /plataforma, hasta su reubicación en la Etapa 3.",
    evitarPara:
      "Páginas nuevas: usa Banda, HeroInstitucional y los componentes institucionales.",
    props,
    estado: "en-uso" as const,
    vista: "sin-vista" as const,
  })),
] as const satisfies readonly EntradaCatalogo[];

type Entrada = (typeof REGISTRO)[number];
export type IdComponente = Entrada["id"];
export type IdDemoPropio = Exclude<
  Extract<Entrada, { vista: "demo" }>,
  { categoria: "ui" }
>["id"];
export type IdDemoUi = Extract<Entrada, { vista: "demo"; categoria: "ui" }>["id"];
