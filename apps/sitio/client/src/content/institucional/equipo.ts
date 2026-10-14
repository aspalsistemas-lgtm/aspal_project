/**
 * Nuestro equipo (Concepto NOSOTROS, Bloque 8, tarjeta 1). Copy literal.
 *
 * PENDIENTE (semana 0): retratos con el mismo fondo y luz, perfiles de
 * LinkedIn y bios finales de 60–80 palabras (§6.4). Sin foto, la tarjeta
 * muestra la silueta con el isotipo.
 */
export const INTRO_EQUIPO =
  "La operación diaria de ASPAL está a cargo de un equipo compacto y experimentado, respaldado por el secretariado compartido con WUP y ANPR (15 personas en total).";

export interface Perfil {
  nombre: string;
  cargo: string;
  bio: string;
  foto?: string;
  linkedin?: string;
}

export const PERFILES: Perfil[] = [
  {
    nombre: "Luis Romahn",
    cargo: "Director General y Fundador",
    bio: "CEO de World Urban Parks, autor de Construyendo Mi Parque (2018), Salzburg Fellow 2021, WUP Emerging Leaders Award 2021.",
  },
  {
    nombre: "Patricia Hernández de Anda",
    cargo: "Coordinadora General",
    bio: "22+ años de trayectoria en el sector social, gobierno y asociaciones civiles en México y España.",
  },
  {
    nombre: "Antonio Góngora",
    cargo: "Coordinador de Tecnología",
    bio: "Responsable de la plataforma SaaS y de la infraestructura digital de ASPAL, WUP y ANPR.",
  },
];
