import { describe, expect, it } from "vitest";
import { nombreCookieSesion, opcionesCookieSesion } from "./cookie.js";

describe("cookie de sesión (CA-4)", () => {
  it("con https: prefijo __Host-, Secure, HttpOnly, SameSite=Lax y Path=/", () => {
    expect(nombreCookieSesion("https")).toBe("__Host-aspal_sesion");
    const opciones = opcionesCookieSesion("https", new Date(Date.now() + 3_600_000));
    expect(opciones).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("sin Domain: un subdominio hermano no puede ni leerla ni plantarla", () => {
    for (const esquema of ["https", "http"] as const) {
      const opciones = opcionesCookieSesion(esquema, new Date(Date.now() + 1000));
      expect("domain" in opciones).toBe(false);
    }
  });

  it("con http (solo en local): sin prefijo ni Secure, pero igual HttpOnly y Lax", () => {
    expect(nombreCookieSesion("http")).toBe("aspal_sesion");
    const opciones = opcionesCookieSesion("http", new Date(Date.now() + 1000));
    expect(opciones).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  });

  it("la cookie caduca cuando caduca la sesión (maxAge en segundos)", () => {
    const opciones = opcionesCookieSesion("https", new Date(Date.now() + 90_000));
    expect(opciones.maxAge).toBeGreaterThan(85);
    expect(opciones.maxAge).toBeLessThanOrEqual(90);
  });

  it("una sesión ya caducada no produce un maxAge negativo", () => {
    expect(opcionesCookieSesion("https", new Date(Date.now() - 10_000)).maxAge).toBe(0);
  });
});
