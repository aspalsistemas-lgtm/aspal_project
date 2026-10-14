import { AvisoMiembros } from "@/components/atoms/AvisoMiembros";
import BlogCard from "@/components/molecules/BlogCard";
import { EpisodioFila } from "@/components/molecules/EpisodioFila";
import { ContenidoReciente } from "@/components/content/ContenidoReciente";
import { FranjaPodcast } from "@/components/content/FranjaPodcast";
import { MetaArticulo } from "@/components/molecules/MetaArticulo";
import { PortadaPodcast } from "@/components/molecules/PortadaPodcast";
import { VerMas } from "@/components/molecules/VerMas";
import { PortadaArticulo } from "@/components/molecules/PortadaArticulo";
import { FormSuscripcion } from "@/components/forms/FormSuscripcion";
import { CifraAnimada } from "@/components/molecules/CifraAnimada";
import { Hashtag } from "@/components/atoms/Hashtag";
import { ManifiestoNumerado } from "@/components/molecules/ManifiestoNumerado";
import { IlustracionPilar } from "@/components/atoms/IlustracionPilar";
import { IndiceEtapas } from "@/components/molecules/IndiceEtapas";
import { IndiceMapa } from "@/components/molecules/IndiceMapa";
import { IndicePilares } from "@/components/molecules/IndicePilares";
import { MuroAliados } from "@/components/institucional/MuroAliados";
import { NavEtapas } from "@/components/molecules/NavEtapas";
import { PanalEtapas } from "@/components/institucional/PanalEtapas";
import { PanalPilares } from "@/components/institucional/PanalPilares";
import { PerfilCard } from "@/components/molecules/PerfilCard";
import { PilarCard } from "@/components/molecules/PilarCard";
import { RacimoEquipo } from "@/components/molecules/RacimoEquipo";
import { RetratoHex } from "@/components/atoms/RetratoHex";
import { RutaTimeline } from "@/components/institucional/RutaTimeline";
import { SeccionEtapa } from "@/components/institucional/SeccionEtapa";
import { SeccionPilar } from "@/components/institucional/SeccionPilar";
import { SubnavSeccion } from "@/components/molecules/SubnavSeccion";
import { VocesRed } from "@/components/institucional/VocesRed";
import { Banda } from "@/components/layout/Banda";
import { FotoHero, type EstiloFotoHero } from "@/components/atoms/FotoHero";
import { HeroInstitucional } from "@/components/layout/HeroInstitucional";
import { PatronPanal } from "@/components/atoms/PatronPanal";
import { Proximamente } from "@/components/atoms/Proximamente";
import { PERFILES } from "@/content/institucional/equipo";
import type { Testimonio } from "@/content/institucional/inicio";
import { ETAPAS } from "@/content/institucional/mapa-ruta";
import {
  ALIADOS_FUNDADORES,
  CATEGORIAS_ALIADOS_PENDIENTES,
  DEFENDEMOS,
  RUTA,
} from "@/content/institucional/nosotros";
import { PILARES } from "@/content/institucional/pilares";
import type { TransformedPost } from "@shared/wordpress/types";
import type { IdDemoPropio } from "./registro";
import type { Demo, Fondo } from "./tipos";

/** Post de ejemplo para las tarjetas de contenido (no es un artículo real). */
const POST_EJEMPLO: TransformedPost = {
  id: 1,
  title: "Artículo de ejemplo del catálogo",
  slug: "ejemplo",
  excerpt:
    "Extracto de ejemplo para ver cómo corta la tarjeta un texto de dos o tres líneas en el listado.",
  content: "",
  featuredImage: "/og-aspal.png",
  category: "Blog",
  categorySlugs: ["blog"],
  publishedAt: "2026-09-01T12:00:00Z",
  isGated: false,
  readingMinutes: 5,
  author: "ASPAL",
  link: "https://comunidad.asociacionesprofesionales.org/",
};

/** Testimonios de ejemplo para la demo de VocesRed (rotulados como tales). */
const TESTIMONIOS_EJEMPLO: Testimonio[] = [
  {
    cita: "Texto de ejemplo del catálogo: aquí va una cita real de menos de 30 palabras de un directivo de la red.",
    nombre: "Nombre Apellido",
    cargo: "Dirección ejecutiva",
    organizacion: "Asociación de ejemplo",
    pais: "México",
  },
  {
    cita: "Segunda cita de ejemplo, para ver cómo se reparte la rejilla con dos o tres testimonios.",
    nombre: "Otra Persona",
    cargo: "Presidencia",
    organizacion: "Colegio de ejemplo",
    pais: "Colombia",
  },
];

const texto = (v: string | boolean) => String(v);

/** Atributo JSX con el valor escapado: una comilla en el texto no rompe el código. */
const atributo = (nombre: string, valor: string | boolean) =>
  `${nombre}={${JSON.stringify(texto(valor))}}`;

export const DEMOS_PROPIOS: Record<IdDemoPropio, Demo> = {
  banda: {
    controles: [
      {
        tipo: "opciones",
        clave: "tono",
        etiqueta: "tono",
        opciones: ["blanco", "suave", "noche"],
        inicial: "suave",
      },
    ],
    render: (v) => (
      <Banda tono={texto(v.tono) as "blanco" | "suave" | "noche"}>
        <p className="text-lg">Contenido de una banda con tono «{texto(v.tono)}».</p>
      </Banda>
    ),
    codigo: (v) => `<Banda tono="${texto(v.tono)}">\n  …\n</Banda>`,
  },
  "hero-institucional": {
    controles: [
      { tipo: "texto", clave: "overline", etiqueta: "overline", inicial: "Nosotros" },
      {
        tipo: "texto",
        clave: "titulo",
        etiqueta: "titulo",
        inicial: "La red en español del sector asociativo de América Latina.",
      },
      {
        tipo: "interruptor",
        clave: "overlineNormal",
        etiqueta: "overlineNormal (sin mayúsculas)",
        inicial: false,
      },
      {
        tipo: "interruptor",
        clave: "visual",
        etiqueta: "visual (panal a la derecha, desde lg)",
        inicial: false,
      },
    ],
    nota: "Pinta el <h1> de la página: úsalo una sola vez. La columna visual solo aparece desde 1024 px.",
    render: (v) => (
      <HeroInstitucional
        overline={texto(v.overline)}
        overlineNormal={Boolean(v.overlineNormal)}
        titulo={texto(v.titulo)}
        visual={v.visual ? <PatronPanal /> : undefined}
      >
        <p>Párrafo de apoyo del hero.</p>
      </HeroInstitucional>
    ),
    codigo: (v) =>
      `<HeroInstitucional ${atributo("overline", v.overline)}${v.overlineNormal ? " overlineNormal" : ""} ${atributo("titulo", v.titulo)}${v.visual ? " visual={<PatronPanal />}" : ""}>\n  <p>…</p>\n</HeroInstitucional>`,
  },
  "patron-panal": {
    controles: [
      { tipo: "interruptor", clave: "animado", etiqueta: "animado", inicial: false },
    ],
    fondo: "noche",
    nota: "Decorativo (aria-hidden). Con «animado», el racimo se arma al montar: activa y desactiva el interruptor para verlo de nuevo.",
    render: (v) => (
      <div className="mx-auto max-w-md">
        <PatronPanal key={String(v.animado)} animado={Boolean(v.animado)} />
      </div>
    ),
    codigo: (v) => `<PatronPanal${v.animado ? " animado" : ""} />`,
  },
  "foto-hero": {
    controles: [
      {
        tipo: "opciones",
        clave: "estilo",
        etiqueta: "estilo",
        opciones: ["hexagono", "panal", "sangrado"],
        inicial: "hexagono",
      },
    ],
    fondo: "noche",
    nota: "Solo se ve desde 1024 px (la columna visual del hero). «sangrado» sale del marco a propósito: en el hero llega al borde de la ventana.",
    render: (v) => (
      <div className="mx-auto max-w-xl">
        <FotoHero
          src="/fotos/hero-encuentro.webp"
          alt="Foto de ejemplo del catálogo"
          estilo={texto(v.estilo) as EstiloFotoHero}
        />
      </div>
    ),
    codigo: (v) =>
      `<FotoHero src={FOTO_HERO.src} alt={FOTO_HERO.alt} estilo="${texto(v.estilo)}" />`,
  },
  proximamente: {
    render: () => (
      <p className="flex flex-wrap items-center gap-2 text-lg">
        Estudios e investigaciones <Proximamente />
      </p>
    ),
    codigo: () =>
      `<p className="flex flex-wrap items-center gap-2 text-lg">
  Estudios e investigaciones <Proximamente />
</p>`,
  },
  "pilar-card": {
    controles: [
      {
        tipo: "opciones",
        clave: "pilar",
        etiqueta: "pilar",
        opciones: PILARES.map((p) => p.id),
        inicial: "comunidad",
      },
      {
        tipo: "interruptor",
        clave: "ilustracion",
        etiqueta: "ilustracion",
        inicial: true,
      },
      {
        tipo: "interruptor",
        clave: "numero",
        etiqueta: "numero",
        inicial: true,
      },
    ],
    render: (v) => {
      const i = Math.max(
        0,
        PILARES.findIndex((p) => p.id === v.pilar),
      );
      return (
        // pt-10: el hueco que necesita la insignia que sobresale.
        <div className="max-w-sm pt-10">
          <PilarCard
            pilar={PILARES[i]}
            ilustracion={Boolean(v.ilustracion)}
            numero={v.numero ? i + 1 : undefined}
          />
        </div>
      );
    },
    codigo: (v) =>
      `<PilarCard pilar={PILARES.find((p) => p.id === ${JSON.stringify(texto(v.pilar))})!}${v.ilustracion ? " ilustracion" : ""}${v.numero ? ` numero={${Math.max(1, PILARES.findIndex((p) => p.id === v.pilar) + 1)}}` : ""} />`,
  },
  "seccion-pilar": {
    controles: [
      {
        tipo: "opciones",
        clave: "pilar",
        etiqueta: "pilar",
        opciones: PILARES.map((p) => p.id),
        inicial: "comunidad",
      },
    ],
    nota: "Es una Banda completa: el tono y el lado de la ilustración dependen de `numero` (pares en suave, ilustración a la derecha).",
    render: (v) => {
      const i = Math.max(
        0,
        PILARES.findIndex((p) => p.id === v.pilar),
      );
      return (
        <SeccionPilar pilar={PILARES[i]} numero={i + 1} siguiente={PILARES[i + 1]} />
      );
    },
    codigo: (v) => {
      const i = Math.max(
        0,
        PILARES.findIndex((p) => p.id === v.pilar),
      );
      return `<SeccionPilar pilar={PILARES[${i}]} numero={${i + 1}}${i + 1 < PILARES.length ? ` siguiente={PILARES[${i + 1}]}` : ""} />`;
    },
  },
  "indice-pilares": {
    render: () => <IndicePilares />,
    codigo: () => `<IndicePilares />`,
  },
  "panal-pilares": {
    fondo: "noche",
    nota: "Decorativo (aria-hidden). En el hero solo se pinta desde 1024 px.",
    render: () => (
      <div className="mx-auto max-w-sm">
        <PanalPilares />
      </div>
    ),
    codigo: () => `<PanalPilares />`,
  },
  "manifiesto-numerado": {
    render: () => <ManifiestoNumerado items={DEFENDEMOS} />,
    codigo: () => `<ManifiestoNumerado items={DEFENDEMOS} />`,
  },
  hashtag: {
    fondo: "noche",
    nota: "Estrecha la ventana: salta entre palabras en vez de desbordar.",
    render: () => (
      <p className="text-3xl font-extrabold text-secondary md:text-5xl">
        <Hashtag />
      </p>
    ),
    codigo: () =>
      `<p className="text-3xl font-extrabold md:text-5xl">\n  <Hashtag />\n</p>`,
  },
  "ruta-timeline": {
    render: () => <RutaTimeline hitos={RUTA} />,
    codigo: () => `<RutaTimeline hitos={RUTA} />`,
  },
  "perfil-card": {
    controles: [
      {
        tipo: "opciones",
        clave: "perfil",
        etiqueta: "perfil",
        opciones: PERFILES.map((p) => p.nombre),
        inicial: PERFILES[0].nombre,
      },
      { tipo: "interruptor", clave: "destacado", etiqueta: "destacado", inicial: false },
    ],
    nota: "Sin foto, el retrato muestra las iniciales: los retratos aún no llegan.",
    render: (v) => (
      <div className={v.destacado ? undefined : "max-w-xl"}>
        <PerfilCard
          perfil={PERFILES.find((p) => p.nombre === v.perfil) ?? PERFILES[0]}
          destacado={Boolean(v.destacado)}
        />
      </div>
    ),
    codigo: (v) =>
      `<PerfilCard perfil={PERFILES.find((p) => p.nombre === ${JSON.stringify(texto(v.perfil))})!}${v.destacado ? " destacado" : ""} />`,
  },
  "retrato-hex": {
    controles: [
      {
        tipo: "opciones",
        clave: "tono",
        etiqueta: "tono",
        opciones: ["noche", "miel", "claro"],
        inicial: "noche",
      },
    ],
    render: (v) => (
      <RetratoHex
        perfil={PERFILES[1]}
        tono={texto(v.tono) as "noche" | "miel" | "claro"}
        className="w-28 text-3xl"
      />
    ),
    codigo: (v) =>
      `<RetratoHex perfil={perfil}${v.tono === "noche" ? "" : ` tono="${texto(v.tono)}"`} className="w-28 text-3xl" />`,
  },
  "racimo-equipo": {
    fondo: "noche",
    nota: "Decorativo (aria-hidden). En el hero solo se pinta desde 1024 px.",
    render: () => (
      <div className="mx-auto max-w-sm p-8">
        <RacimoEquipo perfiles={PERFILES} />
      </div>
    ),
    codigo: () => `<RacimoEquipo perfiles={PERFILES} />`,
  },
  "muro-aliados": {
    controles: [
      {
        tipo: "interruptor",
        clave: "pendientes",
        etiqueta: "con categorías pendientes",
        inicial: true,
      },
    ],
    fondo: "suave",
    render: (v) => (
      <MuroAliados
        fundadores={ALIADOS_FUNDADORES}
        pendientes={v.pendientes ? CATEGORIAS_ALIADOS_PENDIENTES : undefined}
      />
    ),
    codigo: (v) =>
      `<MuroAliados fundadores={ALIADOS_FUNDADORES}${v.pendientes ? " pendientes={CATEGORIAS_ALIADOS_PENDIENTES}" : ""} />`,
  },
  "subnav-seccion": {
    nota: "Sticky bajo la cabecera. Solo se pinta con dos o más destinos de Acerca de y marca la ruta activa.",
    render: () => <SubnavSeccion />,
    codigo: () => `<Header />\n<SubnavSeccion />`,
  },
  "indice-etapas": {
    render: () => <IndiceEtapas />,
    codigo: () => `<IndiceEtapas />`,
  },
  "seccion-etapa": {
    controles: [
      {
        tipo: "opciones",
        clave: "etapa",
        etiqueta: "etapa",
        opciones: ETAPAS.map((e) => String(e.numero)),
        inicial: "1",
      },
    ],
    nota: "Es una Banda completa: las pares van en suave. La columna de la etapa se fija al hacer scroll desde 1024 px.",
    render: (v) => {
      const i = Number(v.etapa) - 1;
      return (
        <SeccionEtapa
          etapa={ETAPAS[i]}
          anterior={ETAPAS[i - 1]}
          siguiente={ETAPAS[i + 1]}
        />
      );
    },
    codigo: (v) => {
      const i = Number(v.etapa) - 1;
      // Sin `anterior` en la primera etapa ni `siguiente` en la última.
      const anterior = i > 0 ? ` anterior={ETAPAS[${i - 1}]}` : "";
      const siguiente = i < ETAPAS.length - 1 ? ` siguiente={ETAPAS[${i + 1}]}` : "";
      return `<SeccionEtapa etapa={ETAPAS[${i}]}${anterior}${siguiente} />`;
    },
  },
  "indice-mapa": {
    render: () => <IndiceMapa />,
    codigo: () => `<IndiceMapa />`,
  },
  "nav-etapas": {
    nota: "Aquí no hay etapas en la página: ninguna se resalta. En /mapa-de-ruta se fija bajo la cabecera y sigue la etapa a media pantalla.",
    render: () => <NavEtapas />,
    codigo: () => `<div>
  <NavEtapas />
  {/* SeccionEtapa × 7 */}
</div>`,
  },
  "panal-etapas": {
    fondo: "noche",
    nota: "En el hero solo se pinta desde 1024 px. Cada celda salta a su etapa (#etapa-N).",
    render: () => (
      <div className="mx-auto max-w-md p-6">
        <PanalEtapas />
      </div>
    ),
    codigo: () => `<PanalEtapas />`,
  },
  "franja-podcast": {
    nota: "Episodio de ejemplo (no es real). En la home recibe el último de /api/podcasts.",
    render: () => (
      <FranjaPodcast
        episodio={{ ...POST_EJEMPLO, title: "Episodio de ejemplo del catálogo" }}
      />
    ),
    codigo: () => `<FranjaPodcast episodio={episodio} />`,
  },
  "portada-articulo": {
    controles: [
      {
        tipo: "interruptor",
        clave: "miembros",
        etiqueta: "exclusivo para miembros",
        inicial: true,
      },
    ],
    nota: "Datos de ejemplo. En /blog es el artículo más reciente de /api/posts.",
    render: (v) => (
      <PortadaArticulo post={{ ...POST_EJEMPLO, isGated: Boolean(v.miembros) }} />
    ),
    codigo: () => `<PortadaArticulo post={posts[0]} />`,
  },
  "meta-articulo": {
    render: () => <MetaArticulo post={POST_EJEMPLO} />,
    codigo: () => `<MetaArticulo post={post} />`,
  },
  "aviso-miembros": {
    render: () => <AvisoMiembros />,
    codigo: () => `{post.isGated && <AvisoMiembros />}`,
  },
  "ilustracion-pilar": {
    controles: [
      {
        tipo: "opciones",
        clave: "pilar",
        etiqueta: "pilar",
        opciones: PILARES.map((p) => p.id),
        inicial: "conocimiento",
      },
    ],
    fondo: "noche",
    nota: "Decorativa (aria-hidden). En el hero solo se pinta desde 1024 px.",
    render: (v) => (
      <div className="mx-auto max-w-xs py-12">
        <IlustracionPilar
          key={texto(v.pilar)}
          pilar={PILARES.find((p) => p.id === v.pilar) ?? PILARES[0]}
        />
      </div>
    ),
    codigo: (v) =>
      `<IlustracionPilar pilar={PILARES.find((p) => p.id === ${JSON.stringify(texto(v.pilar))})!} />`,
  },
  "blog-card": {
    controles: [
      {
        tipo: "interruptor",
        clave: "imagen",
        etiqueta: "con imagen destacada",
        inicial: true,
      },
      {
        tipo: "opciones",
        clave: "tipo",
        etiqueta: "etiqueta",
        opciones: ["—", "Blog", "Podcast"],
        inicial: "Blog",
      },
    ],
    fondo: "suave",
    nota: "Datos de ejemplo. En la app, el post llega de /api/posts.",
    render: (v) => (
      <div className="max-w-sm">
        <BlogCard
          post={{
            ...POST_EJEMPLO,
            featuredImage: v.imagen ? POST_EJEMPLO.featuredImage : "",
          }}
          etiqueta={v.tipo === "—" ? undefined : texto(v.tipo)}
        />
      </div>
    ),
    codigo: (v) =>
      `<BlogCard post={post}${v.tipo === "—" ? "" : ` ${atributo("etiqueta", v.tipo)}`} />`,
  },
  "episodio-fila": {
    controles: [
      {
        tipo: "interruptor",
        clave: "miembros",
        etiqueta: "exclusivo para miembros",
        inicial: true,
      },
    ],
    nota: "Datos de ejemplo. En /podcast llega de /api/podcasts y se numera sobre el total.",
    render: (v) => (
      <ol className="divide-y divide-border border-y border-border">
        <li>
          <EpisodioFila
            episodio={{ ...POST_EJEMPLO, isGated: Boolean(v.miembros) }}
            numero={8}
          />
        </li>
      </ol>
    ),
    codigo: () => `<EpisodioFila episodio={episodio} numero={total - i} />`,
  },
  "portada-podcast": {
    fondo: "noche",
    nota: "Decorativa (aria-hidden). En el hero solo se pinta desde 1024 px.",
    render: () => (
      <div className="mx-auto max-w-xs py-12">
        <PortadaPodcast />
      </div>
    ),
    codigo: () => `<PortadaPodcast />`,
  },
  "ver-mas": {
    controles: [
      { tipo: "interruptor", clave: "hayMas", etiqueta: "hayMas", inicial: true },
      { tipo: "interruptor", clave: "cargando", etiqueta: "cargando", inicial: false },
      { tipo: "interruptor", clave: "error", etiqueta: "error", inicial: false },
    ],
    nota: "Sin datos: los estados se fuerzan con los controles. En la app los da useListaPaginada.",
    render: (v) => (
      <VerMas
        mostrados={10}
        total={23}
        nombre="episodios"
        hayMas={Boolean(v.hayMas)}
        cargando={Boolean(v.cargando)}
        error={Boolean(v.error)}
        onCargarMas={() => {}}
        testid="demo-ver-mas"
      />
    ),
    codigo: () =>
      `<VerMas\n  mostrados={lista.items.length}\n  total={lista.total}\n  nombre="episodios"\n  hayMas={lista.hayMas}\n  cargando={lista.cargandoMas}\n  error={lista.errorAlCargarMas}\n  onCargarMas={() => lista.cargarMas()}\n  testid="button-ver-mas"\n/>`,
  },
  "contenido-reciente": {
    nota: "Usa la API real (/api/posts y /api/podcasts). Si falla, el bloque desaparece: es el comportamiento esperado.",
    render: () => <ContenidoReciente />,
    codigo: () => `<ContenidoReciente />`,
  },
  "cifra-animada": {
    controles: [
      {
        tipo: "opciones",
        clave: "valor",
        etiqueta: "valor",
        opciones: ["1,000", "15+", "7"],
        inicial: "1,000",
      },
    ],
    nota: "Cuenta una sola vez, al entrar en pantalla. Para verla de nuevo, recarga la página con el demo a la vista (o cambia el valor).",
    render: (v) => (
      <span className="text-5xl font-extrabold text-primary">
        <CifraAnimada key={texto(v.valor)} valor={texto(v.valor)} />
      </span>
    ),
    codigo: (v) =>
      `<span className="text-5xl font-extrabold text-primary">\n  <CifraAnimada valor="${texto(v.valor)}" />\n</span>`,
  },
  "voces-red": {
    nota: "Testimonios de ejemplo del catálogo (no son reales). En la home, con TESTIMONIOS vacío la sección no se pinta.",
    render: () => <VocesRed testimonios={TESTIMONIOS_EJEMPLO} />,
    codigo: () => `<VocesRed testimonios={TESTIMONIOS} />`,
  },
  "form-suscripcion": {
    controles: [
      {
        tipo: "opciones",
        clave: "variante",
        etiqueta: "variante",
        opciones: ["compacto", "completo"],
        inicial: "compacto",
      },
      {
        tipo: "opciones",
        clave: "tono",
        etiqueta: "tono",
        opciones: ["claro", "noche"],
        inicial: "claro",
      },
    ],
    fondo: (v): Fondo => (v.tono === "noche" ? "noche" : "blanco"),
    nota: "En el catálogo el envío está desactivado: no se da de alta ningún correo.",
    render: (v) => (
      // Bloquea el submit en captura: el onSubmit del formulario nunca llega a
      // correr, así que no hay POST a /api/suscripcion desde el catálogo.
      <div
        className="max-w-xl"
        onSubmitCapture={(evento) => {
          evento.preventDefault();
          evento.stopPropagation();
        }}
      >
        <FormSuscripcion
          origen="home"
          variante={texto(v.variante) as "compacto" | "completo"}
          tono={texto(v.tono) as "claro" | "noche"}
        />
      </div>
    ),
    codigo: (v) =>
      `<FormSuscripcion origen="…" variante="${texto(v.variante)}"${v.tono === "noche" ? ' tono="noche"' : ""} />`,
  },
};
