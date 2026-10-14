import { describe, expect, it } from "vitest";
import { HASHTAG } from "@/content/institucional/nosotros";
import { partirHashtag } from "./hashtag";

describe("partirHashtag", () => {
  it("corta antes de cada mayúscula", () => {
    expect(partirHashtag("#NingunDirectorDirigeSolo")).toEqual([
      "#Ningun",
      "Director",
      "Dirige",
      "Solo",
    ]);
  });

  it("respeta las mayúsculas acentuadas y lo que no tiene cortes", () => {
    expect(partirHashtag("#CasaÚnica")).toEqual(["#Casa", "Única"]);
    expect(partirHashtag("#aspal")).toEqual(["#aspal"]);
  });

  it("unir las partes devuelve el hashtag tal cual", () => {
    expect(partirHashtag(HASHTAG).join("")).toBe(HASHTAG);
  });
});
