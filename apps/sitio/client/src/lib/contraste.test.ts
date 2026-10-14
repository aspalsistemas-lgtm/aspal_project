import { describe, expect, it } from "vitest";
import { contraste, hslDeTexto } from "./contraste";

describe("contraste", () => {
  it("lee el formato de los tokens de index.css", () => {
    expect(hslDeTexto("206 53% 14%")).toEqual([206, 53, 14]);
    expect(hslDeTexto(" 41 75% 31% ")).toEqual([41, 75, 31]);
    expect(hslDeTexto("#ffffff")).toBeNull();
  });

  it("da 21:1 entre negro y blanco y 1:1 entre iguales", () => {
    expect(contraste([0, 0, 0], [0, 0, 100])).toBeCloseTo(21, 1);
    expect(contraste([206, 53, 14], [206, 53, 14])).toBeCloseTo(1, 5);
  });
});
