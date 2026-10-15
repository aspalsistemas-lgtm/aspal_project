/**
 * Semáforo de hashes (plan del corte 3, CA-11).
 *
 * scrypt con N=2¹⁷ gasta 128 MiB y un hilo de libuv por hash. Sin tope, unos pocos
 * logins simultáneos tumban la API entera (también `/health`). Este semáforo deja
 * pocos hashes en vuelo, acota la cola y, sobre todo, **limita las plazas en cola de
 * cada asociación**: un atacante contra la asociación X llena su propio cupo y no
 * deja sin servicio a los usuarios legítimos de la Y.
 *
 * Si no hay sitio, rechaza **sin hashear** (`ColaLlena`): el llamador responde `503`.
 */

export class ColaLlena extends Error {
  constructor() {
    super("La cola de hashes está llena");
    this.name = "ColaLlena";
  }
}

export interface OpcionesSemaforo {
  /** Hashes que pueden ejecutarse a la vez. */
  enVuelo: number;
  /** Tareas en espera, entre todas las asociaciones. */
  cola: number;
  /** Tareas en espera de una misma asociación. */
  colaPorAsociacion: number;
}

export const OPCIONES_SEMAFORO_POR_DEFECTO: OpcionesSemaforo = {
  enVuelo: 2,
  cola: 8,
  colaPorAsociacion: 2,
};

interface Espera {
  asociacionId: string;
  empezar: () => void;
}

export class SemaforoDeHashes {
  private enEjecucion = 0;
  private readonly cola: Espera[] = [];
  private readonly enEsperaPorAsociacion = new Map<string, number>();

  constructor(
    private readonly opciones: OpcionesSemaforo = OPCIONES_SEMAFORO_POR_DEFECTO,
  ) {}

  /** Ejecuta `tarea` cuando haya una plaza; si no hay sitio ni en la cola, lanza `ColaLlena`. */
  async ejecutar<T>(asociacionId: string, tarea: () => Promise<T>): Promise<T> {
    if (this.enEjecucion >= this.opciones.enVuelo) {
      await this.esperarPlaza(asociacionId);
    } else {
      this.enEjecucion += 1;
    }
    try {
      return await tarea();
    } finally {
      this.liberarPlaza();
    }
  }

  estado(): { enVuelo: number; enCola: number } {
    return { enVuelo: this.enEjecucion, enCola: this.cola.length };
  }

  private esperarPlaza(asociacionId: string): Promise<void> {
    const propias = this.enEsperaPorAsociacion.get(asociacionId) ?? 0;
    if (
      this.cola.length >= this.opciones.cola ||
      propias >= this.opciones.colaPorAsociacion
    ) {
      return Promise.reject(new ColaLlena());
    }
    this.enEsperaPorAsociacion.set(asociacionId, propias + 1);
    return new Promise<void>((resolver) => {
      // Cuando le toque, la plaza ya está contada a su nombre (la heredó de quien
      // terminó): solo se descuenta de la espera.
      this.cola.push({
        asociacionId,
        empezar: () => {
          const restantes = (this.enEsperaPorAsociacion.get(asociacionId) ?? 1) - 1;
          if (restantes <= 0) this.enEsperaPorAsociacion.delete(asociacionId);
          else this.enEsperaPorAsociacion.set(asociacionId, restantes);
          resolver();
        },
      });
    });
  }

  private liberarPlaza(): void {
    const siguiente = this.cola.shift();
    if (siguiente) {
      // La plaza pasa directamente al siguiente: `enEjecucion` no cambia.
      siguiente.empezar();
    } else {
      this.enEjecucion -= 1;
    }
  }
}
