import { describe, expect, it } from "vitest";
import { LimitadorMemoria } from "./limite-memoria.js";

describe("LimitadorMemoria (límite grueso por origen, CA-11 y CA-12)", () => {
  function crear(max: number, ventanaMs = 60_000) {
    let ahora = 1_000_000;
    const limitador = new LimitadorMemoria({ max, ventanaMs, ahora: () => ahora });
    return { limitador, avanzar: (ms: number) => (ahora += ms) };
  }

  it("deja pasar hasta el máximo y rechaza la siguiente, contando cada petición", () => {
    const { limitador } = crear(3);
    expect(limitador.consumir("a").permitido).toBe(true);
    expect(limitador.consumir("a").permitido).toBe(true);
    expect(limitador.consumir("a").permitido).toBe(true);
    const cuarta = limitador.consumir("a");
    expect(cuarta.permitido).toBe(false);
    expect(cuarta.reintentarEnSegundos).toBeGreaterThan(0);
  });

  it("cada clave tiene su propio cupo", () => {
    const { limitador } = crear(1);
    expect(limitador.consumir("a").permitido).toBe(true);
    expect(limitador.consumir("a").permitido).toBe(false);
    expect(limitador.consumir("b").permitido).toBe(true);
  });

  it("al terminar la ventana el cupo se renueva", () => {
    const { limitador, avanzar } = crear(1, 60_000);
    expect(limitador.consumir("a").permitido).toBe(true);
    expect(limitador.consumir("a").permitido).toBe(false);
    avanzar(60_001);
    expect(limitador.consumir("a").permitido).toBe(true);
  });

  it("indica cuántos segundos faltan para poder reintentar", () => {
    const { limitador, avanzar } = crear(1, 60_000);
    limitador.consumir("a");
    avanzar(10_000);
    expect(limitador.consumir("a").reintentarEnSegundos).toBe(50);
  });

  it("no crece sin límite: descarta las claves vencidas al llenarse", () => {
    const { limitador, avanzar } = crear(1, 1_000);
    for (let i = 0; i < 50_000; i++) limitador.consumir(`origen-${i}`);
    expect(limitador.tamano()).toBe(50_000);
    avanzar(2_000);
    limitador.consumir("nuevo");
    // Al llegar al tope se descartan todas las ventanas vencidas.
    expect(limitador.tamano()).toBe(1);
  });

  it("aun con claves sin vencer, el tamaño tiene un tope duro", () => {
    const { limitador } = crear(1, 3_600_000);
    for (let i = 0; i < 60_000; i++) limitador.consumir(`origen-${i}`);
    expect(limitador.tamano()).toBeLessThanOrEqual(50_000);
  });
});
