import { describe, expect, it } from "vitest";
import { indiceSiguiente } from "./teclado";

describe("indiceSiguiente", () => {
  it("avanza con flecha abajo o derecha y retrocede con arriba o izquierda", () => {
    expect(indiceSiguiente(0, 5, "ArrowDown")).toBe(1);
    expect(indiceSiguiente(0, 5, "ArrowRight")).toBe(1);
    expect(indiceSiguiente(3, 5, "ArrowUp")).toBe(2);
    expect(indiceSiguiente(3, 5, "ArrowLeft")).toBe(2);
  });

  it("da la vuelta en los extremos", () => {
    expect(indiceSiguiente(4, 5, "ArrowDown")).toBe(0);
    expect(indiceSiguiente(0, 5, "ArrowUp")).toBe(4);
  });

  it("salta a los extremos con Inicio y Fin", () => {
    expect(indiceSiguiente(2, 5, "Home")).toBe(0);
    expect(indiceSiguiente(2, 5, "End")).toBe(4);
  });

  it("entra por el primero si el foco aún no está en la lista", () => {
    expect(indiceSiguiente(-1, 5, "ArrowDown")).toBe(0);
    expect(indiceSiguiente(-1, 5, "ArrowUp")).toBe(0);
  });

  it("ignora otras teclas y listas vacías", () => {
    expect(indiceSiguiente(1, 5, "Tab")).toBeNull();
    expect(indiceSiguiente(1, 5, "a")).toBeNull();
    expect(indiceSiguiente(-1, 0, "ArrowDown")).toBeNull();
  });
});
