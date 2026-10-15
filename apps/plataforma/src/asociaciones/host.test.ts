import { describe, expect, it } from "vitest";
import { subdominioDesdeHost } from "./host.js";

const BASE = "localhost";

describe("subdominioDesdeHost (CA-6)", () => {
  it.each([
    ["aspal.localhost", "aspal"],
    ["aspal.localhost:5010", "aspal"],
    ["ASPAL.LocalHost", "aspal"],
    ["aspal.localhost.", "aspal"],
    ["aspal.localhost.:5010", "aspal"],
    ["colegio-2.localhost", "colegio-2"],
  ])("%s → %s", (host, esperado) => {
    expect(subdominioDesdeHost(host, BASE)).toBe(esperado);
  });

  it.each([
    [undefined, "sin Host"],
    ["", "Host vacío"],
    ["localhost", "sin subdominio"],
    ["localhost:5010", "sin subdominio, con puerto"],
    [".localhost", "subdominio vacío"],
    ["aspal.evillocalhost", "el dominio base no es un sufijo de etiqueta completa"],
    ["aspallocalhost", "sin punto"],
    ["a.b.localhost", "más de un nivel"],
    ["aspal.localhost.evil.com", "otro dominio"],
    ["www.localhost", "reservado"],
    ["app.localhost", "reservado"],
    ["-aspal.localhost", "guion inicial"],
    ["as_pal.localhost", "carácter no válido"],
    ["aspal .localhost", "espacio"],
    ["127.0.0.1", "una IP"],
    ["[::1]:5010", "una IPv6"],
    [`${"a".repeat(64)}.localhost`, "etiqueta de más de 63 caracteres"],
  ])("%j no resuelve (%s)", (host, _motivo) => {
    expect(subdominioDesdeHost(host, BASE)).toBeNull();
  });

  it("funciona con un dominio base de varios niveles", () => {
    const base = "asociacionesprofesionales.org";
    expect(subdominioDesdeHost("aspal.asociacionesprofesionales.org", base)).toBe(
      "aspal",
    );
    expect(subdominioDesdeHost("asociacionesprofesionales.org", base)).toBeNull();
    expect(subdominioDesdeHost("aspal.otrasprofesionales.org", base)).toBeNull();
    expect(subdominioDesdeHost("aspal.org", base)).toBeNull();
  });
});
