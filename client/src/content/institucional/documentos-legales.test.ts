import { describe, expect, it } from "vitest";
import { esRutaConocida } from "@/lib/rutas";
import {
  AVISO_PRIVACIDAD,
  CORREO,
  TERMINOS,
  partirCorreos,
  type DocumentoLegal,
} from "./documentos-legales";

const DOCUMENTOS: [string, DocumentoLegal][] = [
  ["aviso de privacidad", AVISO_PRIVACIDAD],
  ["términos", TERMINOS],
];

/** Todos los textos de un documento: párrafos y elementos de lista. */
function textos(documento: DocumentoLegal): string[] {
  return [documento.intro, ...documento.apartados.map((a) => a.bloques)]
    .flat()
    .flatMap((bloque) => (typeof bloque === "string" ? [bloque] : bloque.elementos));
}

describe.each(DOCUMENTOS)("documento legal: %s", (_nombre, documento) => {
  it("vive en una ruta del sitio (CA-1)", () => {
    expect(esRutaConocida(documento.ruta)).toBe(true);
  });

  it("no tiene apartados, párrafos ni listas vacíos (CA-6)", () => {
    expect(documento.apartados.length).toBeGreaterThan(0);
    for (const apartado of documento.apartados) {
      expect(apartado.titulo.trim(), apartado.titulo).not.toBe("");
      expect(apartado.bloques.length, apartado.titulo).toBeGreaterThan(0);
    }
    for (const texto of textos(documento)) expect(texto.trim()).not.toBe("");
  });

  it("no repite el título de un apartado (CA-6)", () => {
    const titulos = documento.apartados.map((a) => a.titulo);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it("todo correo que se enlaza es una dirección válida (CA-5, CA-6)", () => {
    const correos = textos(documento)
      .flatMap(partirCorreos)
      .filter((trozo) => trozo.esCorreo)
      .map((trozo) => trozo.texto);
    for (const correo of correos) {
      expect(correo).toMatch(/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i);
    }
  });
});

describe("partirCorreos", () => {
  it("separa los correos del texto que los rodea (CA-5)", () => {
    expect(partirCorreos("Escriba a hola@asociacionesprofesionales.org hoy.")).toEqual([
      { texto: "Escriba a ", esCorreo: false },
      { texto: "hola@asociacionesprofesionales.org", esCorreo: true },
      { texto: " hoy.", esCorreo: false },
    ]);
  });

  it("no enlaza un correo con tilde ni un trozo de él (CA-5)", () => {
    // El aviso de WordPress trae «vinculación@anpr.org.mx»: no es una
    // dirección válida y no debe convertirse en «n@anpr.org.mx».
    const trozos = partirCorreos("un correo a vinculación@anpr.org.mx describiendo");
    expect(trozos.filter((t) => t.esCorreo)).toEqual([]);
    expect(trozos.map((t) => t.texto).join("")).toBe(
      "un correo a vinculación@anpr.org.mx describiendo",
    );
  });

  it("devuelve el texto tal cual si no hay correos", () => {
    expect(partirCorreos("Sin correos.")).toEqual([
      { texto: "Sin correos.", esCorreo: false },
    ]);
    expect(CORREO.test("Sin correos.")).toBe(false);
  });
});

describe("aviso de privacidad", () => {
  it("copia el aviso de WordPress, del responsable a las cookies (CA-3)", () => {
    expect(AVISO_PRIVACIDAD.intro[0]).toMatch(
      /^MEMBRESÍAS Y ASOCIACIONES DE AMÉRICA LATINA/,
    );
    expect(AVISO_PRIVACIDAD.apartados.map((a) => a.titulo)).toEqual([
      "¿Para qué fines utilizaremos sus datos personales?",
      "¿Qué datos personales utilizaremos para estos fines?",
      "¿Con quién compartimos su información personal y para qué fines?",
      "Limitación en el Uso o Divulgación de los Datos Personales",
      "Derechos ARCO",
      "Procedimiento para ejercer sus Derechos ARCO",
      "Cambios al Aviso de Privacidad",
      "Departamento de Datos Personales",
      "Área Contable",
      "Área de Vinculación",
      "El uso de tecnologías de rastreo en nuestro portal de Internet",
    ]);
    expect(AVISO_PRIVACIDAD.actualizado).toBe("abril de 2024");
  });

  it("no incluye el reglamento de la comunidad (va en Términos)", () => {
    expect(textos(AVISO_PRIVACIDAD).join(" ")).not.toMatch(
      /Las Reglas|Código de Etiqueta/,
    );
  });
});

describe("términos", () => {
  it("copia el reglamento de la comunidad de WordPress (CA-3)", () => {
    expect(TERMINOS.apartados.map((a) => a.titulo)).toEqual([
      "Las Reglas",
      "Código de Etiqueta en los Grupos de Discusión",
      "Asuntos legales",
    ]);
  });

  it("no incluye el aviso de privacidad", () => {
    expect(textos(TERMINOS).join(" ")).not.toMatch(/Derechos ARCO|AVISO DE PRIVACIDAD/);
  });
});
