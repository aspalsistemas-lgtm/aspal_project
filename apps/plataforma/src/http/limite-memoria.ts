/**
 * Límite grueso por origen, **en memoria** (plan del corte 3, CA-11 y CA-12).
 *
 * Cuenta **cada** petición (correcta o no) de un origen y actúa **antes** de
 * resolver la asociación, así que un atacante con cuenta propia válida tampoco
 * puede hacer trabajar sin límite a la base ni al hash. Es una defensa por
 * proceso (mejor esfuerzo): con varias instancias, cada una cuenta la suya; el
 * límite fino y compartido vive en `limite_uso`.
 */

export interface ResultadoLimite {
  permitido: boolean;
  reintentarEnSegundos: number;
}

interface Ventana {
  inicio: number;
  cuenta: number;
}

/** Tope duro de claves: un atacante que rote orígenes no puede agotar la memoria. */
const MAXIMO_CLAVES = 50_000;

export class LimitadorMemoria {
  private readonly ventanas = new Map<string, Ventana>();
  private readonly max: number;
  private readonly ventanaMs: number;
  private readonly ahora: () => number;

  constructor(opciones: { max: number; ventanaMs: number; ahora?: () => number }) {
    this.max = opciones.max;
    this.ventanaMs = opciones.ventanaMs;
    this.ahora = opciones.ahora ?? Date.now;
  }

  consumir(clave: string): ResultadoLimite {
    const ahora = this.ahora();
    let ventana = this.ventanas.get(clave);
    if (!ventana || ahora - ventana.inicio >= this.ventanaMs) {
      if (!ventana && this.ventanas.size >= MAXIMO_CLAVES) this.hacerHueco(ahora);
      ventana = { inicio: ahora, cuenta: 0 };
      this.ventanas.set(clave, ventana);
    }
    ventana.cuenta += 1;
    if (ventana.cuenta <= this.max) return { permitido: true, reintentarEnSegundos: 0 };
    const restante = this.ventanaMs - (ahora - ventana.inicio);
    return {
      permitido: false,
      reintentarEnSegundos: Math.max(1, Math.ceil(restante / 1000)),
    };
  }

  /** Cantidad de claves guardadas (para los tests). */
  tamano(): number {
    return this.ventanas.size;
  }

  /** Descarta las ventanas vencidas y, si siguen faltando huecos, las más antiguas. */
  private hacerHueco(ahora: number): void {
    for (const [clave, ventana] of this.ventanas) {
      if (ahora - ventana.inicio >= this.ventanaMs) this.ventanas.delete(clave);
    }
    // Un Map conserva el orden de inserción: las primeras son las más antiguas.
    for (const clave of this.ventanas.keys()) {
      if (this.ventanas.size < MAXIMO_CLAVES) break;
      this.ventanas.delete(clave);
    }
  }
}
