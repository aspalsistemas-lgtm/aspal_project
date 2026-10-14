import { describe, expect, it } from "vitest";
import { formatPublishedDate } from "./date";

describe("formatPublishedDate", () => {
  it("formatea en español", () => {
    expect(formatPublishedDate("2026-08-05T08:30:00Z")).toMatch(/ago/i);
  });

  it("devuelve null en vez de lanzar con una fecha malformada", () => {
    // `format(new Date("basura"))` lanza RangeError, y en React eso tumbaba el
    // árbol entero: el sitio quedaba en pantalla en blanco.
    expect(formatPublishedDate("no-es-una-fecha")).toBeNull();
  });

  it("devuelve null con entrada vacía o ausente", () => {
    expect(formatPublishedDate("")).toBeNull();
    expect(formatPublishedDate(undefined)).toBeNull();
    expect(formatPublishedDate(null)).toBeNull();
  });

  it("acepta un patrón propio", () => {
    expect(formatPublishedDate("2026-08-05T08:30:00Z", "yyyy")).toBe("2026");
  });
});
