import { describe, expect, it } from "vitest";
import { ColaLlena, SemaforoDeHashes } from "./semaforo.js";

/** Una tarea que no termina hasta que se la libera: para controlar la concurrencia. */
function tareaControlable() {
  let liberar!: () => void;
  const terminada = new Promise<void>((resolver) => (liberar = resolver));
  let empezo = false;
  return {
    liberar,
    empezo: () => empezo,
    ejecutar: async () => {
      empezo = true;
      await terminada;
      return "listo";
    },
  };
}

const esperar = () => new Promise((resolver) => setTimeout(resolver, 5));

describe("SemaforoDeHashes (CA-11)", () => {
  it("nunca ejecuta más tareas a la vez que las plazas en vuelo", async () => {
    const semaforo = new SemaforoDeHashes({
      enVuelo: 2,
      cola: 10,
      colaPorAsociacion: 10,
    });
    let simultaneas = 0;
    let maximo = 0;
    const tarea = async () => {
      simultaneas += 1;
      maximo = Math.max(maximo, simultaneas);
      await esperar();
      simultaneas -= 1;
    };
    await Promise.all(Array.from({ length: 8 }, () => semaforo.ejecutar("a", tarea)));
    expect(maximo).toBe(2);
  });

  it("las tareas en cola empiezan cuando se libera una plaza, por orden de llegada", async () => {
    const semaforo = new SemaforoDeHashes({ enVuelo: 1, cola: 5, colaPorAsociacion: 5 });
    const orden: number[] = [];
    const primera = tareaControlable();
    const p1 = semaforo.ejecutar("a", async () => {
      orden.push(1);
      return primera.ejecutar();
    });
    const p2 = semaforo.ejecutar("a", async () => orden.push(2));
    const p3 = semaforo.ejecutar("a", async () => orden.push(3));
    await esperar();
    expect(orden).toEqual([1]);
    primera.liberar();
    await Promise.all([p1, p2, p3]);
    expect(orden).toEqual([1, 2, 3]);
  });

  it("si la cola total está llena, rechaza al instante sin ejecutar", async () => {
    const semaforo = new SemaforoDeHashes({ enVuelo: 1, cola: 2, colaPorAsociacion: 10 });
    const bloqueada = tareaControlable();
    const enVuelo = semaforo.ejecutar("a", bloqueada.ejecutar);
    const enCola1 = semaforo.ejecutar("b", async () => 1);
    const enCola2 = semaforo.ejecutar("c", async () => 2);
    const rechazada = tareaControlable();
    await expect(semaforo.ejecutar("d", rechazada.ejecutar)).rejects.toBeInstanceOf(
      ColaLlena,
    );
    expect(rechazada.empezo()).toBe(false);
    bloqueada.liberar();
    await Promise.all([enVuelo, enCola1, enCola2]);
  });

  it("una asociación no puede llenar la cola: tiene un tope de plazas en espera", async () => {
    const semaforo = new SemaforoDeHashes({ enVuelo: 1, cola: 8, colaPorAsociacion: 2 });
    const bloqueada = tareaControlable();
    const enVuelo = semaforo.ejecutar("x", bloqueada.ejecutar);
    const x1 = semaforo.ejecutar("x", async () => "x1");
    const x2 = semaforo.ejecutar("x", async () => "x2");
    // La tercera plaza en espera de «x» se rechaza aunque la cola general tenga sitio.
    await expect(semaforo.ejecutar("x", async () => "x3")).rejects.toBeInstanceOf(
      ColaLlena,
    );
    // Otra asociación sí encuentra sitio: un atacante en X no deja sin servicio a la Y.
    const y1 = semaforo.ejecutar("y", async () => "y1");
    bloqueada.liberar();
    expect(await Promise.all([x1, x2, y1])).toEqual(["x1", "x2", "y1"]);
    await enVuelo;
  });

  it("al liberarse las plazas, la asociación vuelve a poder encolar", async () => {
    const semaforo = new SemaforoDeHashes({ enVuelo: 1, cola: 4, colaPorAsociacion: 1 });
    const bloqueada = tareaControlable();
    const enVuelo = semaforo.ejecutar("x", bloqueada.ejecutar);
    const espera = semaforo.ejecutar("x", async () => "a");
    await expect(semaforo.ejecutar("x", async () => "b")).rejects.toBeInstanceOf(
      ColaLlena,
    );
    bloqueada.liberar();
    await Promise.all([enVuelo, espera]);
    await expect(semaforo.ejecutar("x", async () => "c")).resolves.toBe("c");
  });

  it("si una tarea falla, libera su plaza y propaga el error", async () => {
    const semaforo = new SemaforoDeHashes({ enVuelo: 1, cola: 2, colaPorAsociacion: 2 });
    await expect(
      semaforo.ejecutar("a", async () => {
        throw new Error("falla");
      }),
    ).rejects.toThrow("falla");
    await expect(semaforo.ejecutar("a", async () => "sigue")).resolves.toBe("sigue");
  });

  it("si una tarea en cola falla, la siguiente sigue su curso", async () => {
    const semaforo = new SemaforoDeHashes({ enVuelo: 1, cola: 4, colaPorAsociacion: 4 });
    const bloqueada = tareaControlable();
    const p1 = semaforo.ejecutar("a", bloqueada.ejecutar);
    const p2 = semaforo.ejecutar("a", async () => {
      throw new Error("falla en cola");
    });
    const p3 = semaforo.ejecutar("a", async () => "ok");
    bloqueada.liberar();
    await p1;
    await expect(p2).rejects.toThrow("falla en cola");
    await expect(p3).resolves.toBe("ok");
  });

  it("informa de cuántas hay en vuelo y en cola (para las pruebas y las alertas)", async () => {
    const semaforo = new SemaforoDeHashes({ enVuelo: 1, cola: 4, colaPorAsociacion: 4 });
    const bloqueada = tareaControlable();
    const p1 = semaforo.ejecutar("a", bloqueada.ejecutar);
    const p2 = semaforo.ejecutar("a", async () => 1);
    await esperar();
    expect(semaforo.estado()).toEqual({ enVuelo: 1, enCola: 1 });
    bloqueada.liberar();
    await Promise.all([p1, p2]);
    expect(semaforo.estado()).toEqual({ enVuelo: 0, enCola: 0 });
  });
});
