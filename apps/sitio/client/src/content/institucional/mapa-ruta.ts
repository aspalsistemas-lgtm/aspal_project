/**
 * Mapa de Ruta para Organizaciones Profesionales (§6.5 del plan de la Etapa 1).
 *
 * Copy literal de la guía oficial de ASPAL (2024), publicada en la comunidad:
 * la versión de 16 páginas (…/uploads/2024/05/Mapa-de-Ruta-para-Organizaciones-
 * Profesionales-ASPAL.pdf) y la infografía de una página (…/uploads/2024/07/
 * mapa-de-ruta-organizaciones-profesionales-ASPAL.pdf), que es la que se
 * descarga. Solo se corrigieron erratas mecánicas; están listadas en el plan
 * del PR F (decisión F8). Lo usan /mapa-de-ruta y la franja de la home.
 */
import {
  Compass,
  Handshake,
  Landmark,
  Megaphone,
  Settings2,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface PasoMapa {
  /** Numeración continua de la guía, del 1 al 23. */
  numero: number;
  nombre: string;
  /** La línea corta de la tarjeta. */
  linea: string;
  /** Uno o dos párrafos del cuerpo de la guía. */
  descripcion: string[];
}

export interface EtapaMapa {
  numero: number;
  /** Ancla de /mapa-de-ruta: `etapa-N`. */
  id: string;
  nombre: string;
  /**
   * Icono de la etapa (insignias, flor del hero, índice). PENDIENTE: la guía
   * oficial tiene su propio icono en hexágono por etapa; cuando se extraigan
   * del PDF como SVG, sustituyen a estos.
   */
  icono: LucideIcon;
  /** Línea del índice de etapas de la guía. */
  resumen: string;
  pasos: PasoMapa[];
  /** Frase en negrita con que la guía cierra la etapa. */
  cierre: string;
}

export const MAPA_RUTA = {
  titulo: "Mapa de Ruta para Organizaciones Profesionales",
  subtitulo:
    "Guía práctica sobre las etapas de gestión de una asociación o sociedad profesional.",
  comoUsar:
    "Este mapa de ruta se divide en etapas, cada etapa se divide en pasos y cada paso es un área prioritaria para lograr una gestión integral de tu organización.",
  recorrer:
    "Para profundizar en cada una de las etapas puedes recorrer el mapa de principio a fin.",
  checkList:
    "Si eres Miembro Premium, también puedes consultar dentro de la Comunidad en Línea de ASPAL los check list correspondientes a cada etapa y pasos.",
  impulsa: {
    titulo: "Impulsa tu Organización con Nuestro Mapa de Ruta",
    texto:
      "Encuentra dentro de nuestra comunidad recursos y herramientas que te ayuden a llevar a tu organización al siguiente nivel.",
  },
  pdf: { href: "/mapa-de-ruta-aspal.pdf", peso: "280 KB" },
} as const;

export const ETAPAS: EtapaMapa[] = [
  {
    numero: 1,
    id: "etapa-1",
    icono: Landmark,
    nombre: "Gestión",
    resumen: "Liderazgo, estructura, misión / visión y gobernanza",
    pasos: [
      {
        numero: 1,
        nombre: "Yo Directora / Director",
        linea: "Rol, responsabilidades y desarrollo profesional",
        descripcion: [
          "El director de una asociación lidera y toma decisiones estratégicas, enfocándose en alinear los objetivos y la misión de la organización, además de su desarrollo personal y profesional.",
        ],
      },
      {
        numero: 2,
        nombre: "Mi Organización",
        linea: "Estructura, funcionamiento y alcances",
        descripcion: [
          "Una asociación es una entidad formada por personas con intereses comunes, organizando actividades y gestionando recursos eficientemente mediante una estructura definida.",
        ],
      },
      {
        numero: 3,
        nombre: "Misión y Visión",
        linea: "Definición, construcción e importancia",
        descripcion: [
          "Las declaraciones de misión y visión son cruciales, delineando el propósito y las aspiraciones futuras de la asociación y dirigiendo todas sus actividades y decisiones.",
        ],
      },
      {
        numero: 4,
        nombre: "Gobernanza",
        linea: "Estructura, roles y políticas clave",
        descripcion: [
          "La estructura de gobernanza incluye roles específicos y políticas clave para asegurar la transparencia y eficiencia de la asociación, respondiendo a las necesidades de sus miembros.",
        ],
      },
    ],
    cierre:
      "Estos componentes son esenciales para la fundación y/o gestión efectiva de una asociación, garantizando su estructura, liderazgo y guía.",
  },
  {
    numero: 2,
    id: "etapa-2",
    icono: Compass,
    nombre: "Estrategia y Planeación",
    resumen: "Planeación estratégica, plan y modelo de negocios y certificación",
    pasos: [
      {
        numero: 5,
        nombre: "Planeación Estratégica",
        linea: "Procesos y herramientas para la planeación",
        descripcion: [
          "Procesos y herramientas diseñados para establecer objetivos a largo plazo y determinar las mejores estrategias para alcanzarlos. Esta fase es crucial para alinear los recursos y esfuerzos de la asociación con su visión y metas futuras.",
        ],
      },
      {
        numero: 6,
        nombre: "Plan de Negocios",
        linea: "Objetivos, estrategias, mercado y finanzas",
        descripcion: [
          "Desarrollo y ejecución de la estrategia de la asociación; describe la estructura organizativa, estrategias de mercado y proyecciones financieras. Es una herramienta fundamental para dirigir el negocio y atraer recursos e inversión.",
        ],
      },
      {
        numero: 7,
        nombre: "Modelo de Negocios",
        linea: "Oferta actual y potencial de productos y servicios",
        descripcion: [
          "Consiste en el análisis y definición de la oferta actual de productos y servicios y la exploración de oportunidades para expandir o mejorar esta oferta. Este modelo ayuda a determinar cómo la asociación genera valor para sus miembros.",
        ],
      },
      {
        numero: 8,
        nombre: "Certificación",
        linea: "Reconocimiento sobre estándares y conocimientos específicos",
        descripcion: [
          "Este proceso valida las competencias y cumplimiento de estándares dentro de la industria, proporcionando reconocimiento formal. Las certificaciones pueden mejorar la credibilidad y abrir nuevas oportunidades comerciales.",
        ],
      },
    ],
    cierre:
      "Cada uno de estos elementos juega un papel fundamental en la consolidación de una estrategia cohesiva que guíe a la asociación hacia el logro de sus objetivos a largo plazo.",
  },
  {
    numero: 3,
    id: "etapa-3",
    icono: Settings2,
    nombre: "Operaciones y Administración",
    resumen: "Finanzas, recursos humanos, legal, riesgo, inclusión y diversidad",
    pasos: [
      {
        numero: 9,
        nombre: "Manejo Financiero",
        linea: "Gestión financiera, presupuestos y reportes",
        descripcion: [
          "Enfocado en los principios básicos de la gestión financiera, incluyendo la creación de presupuestos y la elaboración de reportes financieros. Esta área es esencial para asegurar la salud económica y la sostenibilidad de la organización.",
        ],
      },
      {
        numero: 10,
        nombre: "Recursos Humanos",
        linea: "Personal, cultura organizacional y liderazgo",
        descripcion: [
          "Se centra en la gestión efectiva del personal, el desarrollo de una cultura organizacional positiva y el fortalecimiento del liderazgo. Estos aspectos son clave para maximizar la productividad y el bienestar del equipo.",
        ],
      },
      {
        numero: 11,
        nombre: "Legal y Riesgo",
        linea: "Responsabilidad legal y manejo del riesgo",
        descripcion: [
          "Implica la comprensión y el manejo de las obligaciones legales de la asociación, así como la identificación y mitigación de riesgos potenciales. Es vital para proteger a la organización de posibles litigios y otras complicaciones legales.",
        ],
      },
      {
        numero: 12,
        nombre: "Inclusión y Diversidad",
        linea: "Implementación de políticas de inclusión y diversidad",
        descripcion: [
          "Es la implementación y promoción de políticas que fomenten un ambiente inclusivo y diverso. Estas políticas enriquecen la organización, mejoran la innovación y aseguran el respeto y la equidad entre todos los miembros y personal.",
        ],
      },
    ],
    cierre:
      "Cada uno de estos componentes contribuye al funcionamiento eficiente y ético de la organización, facilitando su operación diaria y asegurando su cumplimiento con normativas y expectativas sociales.",
  },
  {
    numero: 4,
    id: "etapa-4",
    icono: Megaphone,
    nombre: "Mkt, T.I. y Comunicación",
    resumen: "Marca, digitalización, publicidad, comunicación y relaciones públicas",
    pasos: [
      {
        numero: 13,
        nombre: "Branding e Imagen",
        linea: "Estrategias para el desarrollo y gestión de la marca",
        descripcion: [
          "Estrategias para crear y gestionar la identidad de marca de la organización. Esto incluye el desarrollo de una imagen coherente y atractiva que refleje los valores y objetivos de la asociación, vital para fortalecer la percepción y el reconocimiento en el mercado.",
        ],
      },
      {
        numero: 14,
        nombre: "Digitalización y T.I.",
        linea:
          "Integración de tecnologías digitales para la profesionalización y promoción",
        descripcion: [
          "Este elemento aborda la adopción de tecnologías digitales para mejorar los procesos internos y la interacción con los miembros. La digitalización facilita una gestión más eficiente y promueve la presencia de la organización en plataformas digitales, expandiendo su alcance y eficacia operativa.",
          "Entre las principales estrategias se encuentra el uso de comunidades en línea que brindan servicios automatizados a los miembros y la oportunidad de disfrutar de recursos exclusivos que ayudan a mejorar la capacitación y el networking. Las principales herramientas son los foros de discusión, biblioteca digital, directorio de miembros, creación de perfil profesional y cursos en línea.",
        ],
      },
      {
        numero: 15,
        nombre: "Mkt y Comunicación",
        linea: "Promoción, publicidad y relaciones públicas",
        descripcion: [
          "Uso de técnicas avanzadas de marketing y relaciones públicas para promover a la asociación, atraer nuevos miembros y mantener una comunicación efectiva con los stakeholders. Incluye desde campañas publicitarias hasta estrategias de comunicación en redes sociales y eventos, todo orientado a mejorar la visibilidad y el impacto de la organización.",
        ],
      },
    ],
    cierre:
      "Cada uno de estos aspectos es crucial para la proyección externa de la asociación, asegurando que su mensaje llegue de manera efectiva y atractiva a su público objetivo.",
  },
  {
    numero: 5,
    id: "etapa-5",
    icono: Users,
    nombre: "Membresía y Programas",
    resumen:
      "Prospección, crecimiento y retención. Programas educativos y bolsa de trabajo",
    pasos: [
      {
        numero: 16,
        nombre: "Membresía",
        linea: "Captación, crecimiento, retención y recuperación",
        descripcion: [
          "Se enfoca en definir qué constituye ser miembro de la organización y en desarrollar estrategias efectivas para atraer, comprometer, retener y recuperar miembros. Esto puede incluir tácticas de marketing dirigidas, beneficios exclusivos y programas de lealtad que incentiven la renovación y el compromiso continuo.",
        ],
      },
      {
        numero: 17,
        nombre: "Contenido y Educación",
        linea: "Programas educativos y de contenido",
        descripcion: [
          "Creación y administración de programas educativos y contenido relevante que aporte valor a los miembros. Estos programas pueden variar desde seminarios web y cursos en línea hasta conferencias y talleres, todos diseñados para mantener a los miembros informados, comprometidos y en constante aprendizaje.",
          "También incluye otro tipo de elementos de contenido como pueden ser los blogs, podcast, revistas especializadas y por supuesto el contenido ofertado a través de los eventos de la organización.",
        ],
      },
      {
        numero: 18,
        nombre: "Desarrollo Profesional",
        linea: "Centro profesional de carrera y bolsa de trabajo",
        descripcion: [
          "Se centra en ofrecer oportunidades para el crecimiento profesional continuo de la membresía a través de capacitaciones, certificaciones y otras formas de educación avanzada. El objetivo es apoyar la carrera de los miembros y proporcionarles las herramientas necesarias para avanzar en sus campos respectivos.",
          "Organizaciones modernas pueden ofrecer servicios de centro profesional de carrera a partir del establecimiento de una bolsa de trabajo en donde el ecosistema pueda interactuar a través de ofertas laborales y oportunidades de exponer la experiencia de los miembros a través de un perfil profesional y el currículum u hoja de vida.",
        ],
      },
    ],
    cierre:
      "Estos componentes son esenciales para mantener una base de miembros activa y comprometida, asegurando que la organización sigue siendo relevante y valiosa para sus integrantes.",
  },
  {
    numero: 6,
    id: "etapa-6",
    icono: Handshake,
    nombre: "Extensión y Política Pública",
    resumen: "Eventos, patrocinios, donativos, industria y política pública",
    pasos: [
      {
        numero: 19,
        nombre: "Eventos",
        linea: "Planificación y gestión de eventos de la asociación",
        descripcion: [
          "Este aspecto cubre la organización y manejo de eventos para la asociación, desde conferencias y reuniones hasta seminarios y funciones sociales. La planificación eficaz de eventos es fundamental para facilitar la red de contactos entre los miembros, promover la marca de la asociación y proporcionar valor añadido.",
        ],
      },
      {
        numero: 20,
        nombre: "Patrocinios y Donativos",
        linea: "Estrategias para la obtención de fondos y gestión de patrocinadores",
        descripcion: [
          "Involucra el desarrollo de estrategias para atraer financiación a través de patrocinios y donaciones. Esto incluye la identificación de potenciales patrocinadores o donantes, la gestión de relaciones con estos, y la creación de paquetes de patrocinio que ofrezcan beneficios mutuos.",
        ],
      },
      {
        numero: 21,
        nombre: "Relaciones con la Industria",
        linea: "Fomento de alianzas y colaboraciones con proveedores de la industria",
        descripcion: [
          "Se centra en construir y mantener alianzas estratégicas con proveedores y otras entidades relevantes dentro de la industria. Estas colaboraciones pueden ayudar a la asociación a obtener recursos, servicios y apoyo que potencien sus iniciativas y proyectos.",
        ],
      },
      {
        numero: 22,
        nombre: "Política Pública y Abogacía",
        linea: "Involucramiento en asuntos públicos y defensa de intereses",
        descripcion: [
          "Refiere a la participación activa de la asociación en la política pública y la defensa de intereses que afectan a su sector. Esto puede incluir cabildeo, participación en la formulación de políticas y campañas de sensibilización para influir en decisiones que impactan a los miembros y la industria en general.",
        ],
      },
    ],
    cierre:
      "Cada uno de estos componentes juega un papel crucial en la ampliación del alcance y la influencia de la asociación, asegurando que sus intereses y los de sus miembros sean representados y defendidos adecuadamente en un espectro más amplio de actividades y sectores.",
  },
  {
    numero: 7,
    id: "etapa-7",
    icono: TrendingUp,
    nombre: "Evaluación y Mejora Continua",
    resumen: "Evaluación a programas, procesos y estrategias de mejora continua",
    pasos: [
      {
        numero: 23,
        nombre: "Investigación y Evaluación",
        linea: "Métodos para la evaluación de programas y estrategias de mejora continua",
        descripcion: [
          "Este concepto se centra en el uso de métodos sistemáticos para evaluar la efectividad de los programas y estrategias de la asociación. La investigación y evaluación implican recoger y analizar datos para entender el impacto de las actividades realizadas y determinar áreas que requieren mejoras. Estos métodos pueden incluir encuestas, entrevistas, grupos focales y análisis de datos existentes.",
          "El propósito de este proceso es asegurar que la organización no solo mantiene sus estándares de calidad, sino que también busca oportunidades para optimizar sus operaciones y aumentar el valor que ofrece a sus miembros.",
          "La mejora continua se logra identificando los éxitos y fallos de las iniciativas actuales, adaptando las estrategias de acuerdo a los resultados obtenidos y desarrollando nuevas prácticas que respondan mejor a las necesidades y expectativas de los miembros y stakeholders.",
        ],
      },
    ],
    cierre:
      "La investigación y evaluación son esenciales para el crecimiento sostenido y la relevancia a largo plazo de la asociación, permitiéndole adaptarse y responder eficazmente a un entorno cambiante.",
  },
];
