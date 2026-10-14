import type { ReactNode } from "react";

/** Papel del componente. La carpeta de `client/src/components/` lo acota (ver el test). */
export type Categoria =
  | "layout"
  | "institucional"
  | "contenido"
  | "formularios"
  | "ui"
  | "legado"
  | "infraestructura";

/**
 * Nivel de Atomic Design (design.md §1.2). Independiente de la categoría, que
 * es el dominio. Las carpetas atómicas lo fijan (ver el test); `ui/` cuenta
 * como átomo y `sections/` es legado que no se migra.
 */
export type Nivel =
  "atomo" | "molecula" | "organismo" | "plantilla" | "infraestructura" | "legado";

/** `sin-uso`: nadie lo importa. El test obliga a marcarlo; lo normal es borrarlo. */
export type Estado = "en-uso" | "sin-uso";

/**
 * Cómo se ve en /componentes. `demo`: con controles. `en-esta-pagina`: ya está
 * alrededor (cabecera, pie…). `sin-vista`: no pinta nada propio o solo tiene
 * sentido en su página (legado de /plataforma, infraestructura).
 */
export type Vista = "demo" | "en-esta-pagina" | "sin-vista";

export interface EntradaCatalogo {
  /** kebab-case; ancla de su ficha en /componentes. */
  id: string;
  nombre: string;
  /** Ruta desde la raíz del repo, con `/`. */
  archivo: string;
  /** La línea de import tal cual se escribe. */
  importar: string;
  categoria: Categoria;
  nivel: Nivel;
  descripcion: string;
  usarCuando: string;
  evitarPara?: string;
  /** Firma resumida de las props. */
  props: string;
  estado: Estado;
  vista: Vista;
}

export type Control =
  | {
      tipo: "opciones";
      clave: string;
      etiqueta: string;
      opciones: readonly string[];
      inicial: string;
    }
  | { tipo: "texto"; clave: string; etiqueta: string; inicial: string }
  | { tipo: "interruptor"; clave: string; etiqueta: string; inicial: boolean };

export type Valores = Record<string, string | boolean>;

export type Fondo = "blanco" | "suave" | "noche";

export interface Demo {
  controles?: readonly Control[];
  /** Fondo del marco. Función si depende de un control (p. ej. tono noche). */
  fondo?: Fondo | ((valores: Valores) => Fondo);
  /** Aviso bajo la demo (efectos desactivados, datos de la API real…). */
  nota?: string;
  render: (valores: Valores) => ReactNode;
  /** Código que reproduce la demo con los valores actuales. */
  codigo: (valores: Valores) => string;
}
