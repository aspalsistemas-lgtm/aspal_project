import { describe, expect, it } from "vitest";
import { construirEnlace } from "./enlaces.js";
import {
  plantillaContrasenaCambiada,
  plantillaCuentaExistente,
  plantillaInvitacion,
  plantillaRecuperacion,
  plantillaRegistro,
} from "./plantillas.js";

const DATOS = { asociacion: "ASPAL", para: "ana@ejemplo.org" };
const ENLACE = "https://aspal.ejemplo.org/registro#abc";

describe("plantillas (CA-22): texto fijo, sin campos libres", () => {
  it("cada plantilla lleva la asociación, el enlace y nada de quien solicita", () => {
    const todas = [
      plantillaRegistro(DATOS, ENLACE),
      plantillaCuentaExistente(DATOS, ENLACE),
      plantillaRecuperacion(DATOS, ENLACE),
      plantillaInvitacion(DATOS, ENLACE),
    ];
    for (const m of todas) {
      expect(m.para).toBe("ana@ejemplo.org");
      expect(m.asunto).toContain("ASPAL");
      expect(m.texto).toContain(ENLACE);
      // El correo del destinatario no se repite en el cuerpo.
      expect(m.texto).not.toContain("ana@ejemplo.org");
    }
    expect(plantillaContrasenaCambiada(DATOS).texto).toContain("contraseña");
  });

  it("el nombre de la asociación no puede inyectar cabeceras en el asunto", () => {
    const m = plantillaRegistro(
      { asociacion: "ASPAL\r\nBcc: v@x.org", para: "a@x.org" },
      ENLACE,
    );
    expect(m.asunto).not.toMatch(/[\r\n]/);
  });
});

describe("construirEnlace (CA-12)", () => {
  const base = {
    esquemaPublico: "https",
    dominioBase: "aspal.org",
    puertoPublico: undefined,
  } as const;

  it("usa el subdominio, la ruta y el token en el fragmento", () => {
    expect(construirEnlace(base, "colegio", "/registro", "tok")).toBe(
      "https://colegio.aspal.org/registro#tok",
    );
  });

  it("en local añade el puerto público", () => {
    expect(
      construirEnlace(
        { esquemaPublico: "http", dominioBase: "localhost", puertoPublico: 5010 },
        "prueba",
        "/invitacion",
        "t",
      ),
    ).toBe("http://prueba.localhost:5010/invitacion#t");
  });

  it("sin token no lleva fragmento", () => {
    expect(construirEnlace(base, "colegio", "/recuperar-contrasena")).toBe(
      "https://colegio.aspal.org/recuperar-contrasena",
    );
  });
});
