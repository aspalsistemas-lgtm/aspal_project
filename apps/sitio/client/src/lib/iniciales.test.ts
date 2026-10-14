import { describe, expect, it } from "vitest";
import { iniciales } from "./iniciales";

describe("iniciales", () => {
  it("toma la inicial de las dos primeras palabras", () => {
    expect(iniciales("Patricia Hernández de Anda")).toBe("PH");
    expect(iniciales("luis romahn")).toBe("LR");
  });

  it("tolera espacios de más y nombres de una palabra", () => {
    expect(iniciales("  Antonio   Góngora ")).toBe("AG");
    expect(iniciales("Ánimo")).toBe("Á");
  });
});
