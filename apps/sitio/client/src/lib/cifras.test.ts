import { describe, expect, it } from "vitest";
import { CIFRAS } from "@/content/institucional/inicio";
import { formatearCifra, partirCifra } from "./cifras";

describe("partirCifra", () => {
  it("separa prefijo, número y sufijo", () => {
    expect(partirCifra("15+")).toEqual({
      prefijo: "",
      numero: 15,
      sufijo: "+",
      miles: false,
    });
    expect(partirCifra("1,000")).toEqual({
      prefijo: "",
      numero: 1000,
      sufijo: "",
      miles: true,
    });
    expect(partirCifra("+30 %")).toEqual({
      prefijo: "+",
      numero: 30,
      sufijo: " %",
      miles: false,
    });
  });

  it("no anima lo que no es un único entero", () => {
    expect(partirCifra("2030-2035")).toBeNull();
    expect(partirCifra("1.5")).toBeNull();
    expect(partirCifra("sin cifra")).toBeNull();
  });

  it("al final de la cuenta vuelve exactamente al texto original", () => {
    for (const { valor } of CIFRAS) {
      const partes = partirCifra(valor);
      expect(partes, valor).not.toBeNull();
      expect(formatearCifra(partes!.numero, partes!)).toBe(valor);
    }
  });

  it("los números intermedios conservan el formato", () => {
    expect(formatearCifra(0, partirCifra("1,000")!)).toBe("0");
    expect(formatearCifra(1234, partirCifra("1,000")!)).toBe("1,234");
    expect(formatearCifra(7, partirCifra("15+")!)).toBe("7+");
  });
});
