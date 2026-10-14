import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorProveedor,
  SuscripcionNoConfigurada,
  hashSuscriptor,
  suscribir,
} from "./mailchimp";

const fetchMock = vi.fn();
const datos = {
  correo: "ana@ejemplo.org",
  nombre: "Ana López",
  pais: "México",
  organizacion: "Colegio de Arquitectos",
  cargo: "Directora",
  origen: "unete" as const,
};

function respuesta(status = 200, title?: string) {
  return {
    ok: status < 400,
    status,
    json: async () => (title ? { title } : {}),
  } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("MAILCHIMP_API_KEY", "abc123-us21");
  vi.stubEnv("MAILCHIMP_AUDIENCE_ID", "lista01");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("hashSuscriptor", () => {
  it("es el MD5 del correo en minúsculas, como pide Mailchimp", () => {
    expect(hashSuscriptor("Ana@Ejemplo.org")).toBe(hashSuscriptor("ana@ejemplo.org"));
    expect(hashSuscriptor("ana@ejemplo.org")).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("suscribir", () => {
  it("crea el miembro con POST y doble confirmación, y lo etiqueta por origen", async () => {
    fetchMock.mockResolvedValue(respuesta(200));
    await suscribir(datos);

    const hash = hashSuscriptor(datos.correo);
    const [urlMiembro, miembro] = fetchMock.mock.calls[0];
    expect(urlMiembro).toBe("https://us21.api.mailchimp.com/3.0/lists/lista01/members");
    expect(miembro.method).toBe("POST");
    expect(JSON.parse(miembro.body)).toEqual({
      email_address: "ana@ejemplo.org",
      status: "pending",
      merge_fields: {
        FNAME: "Ana López",
        PAIS: "México",
        ORG: "Colegio de Arquitectos",
        CARGO: "Directora",
      },
    });
    expect(miembro.headers.Authorization).toMatch(/^Basic /);
    const decoded = Buffer.from(
      miembro.headers.Authorization.replace(/^Basic /, ""),
      "base64",
    ).toString("utf-8");
    expect(decoded).toBe("aspal:abc123-us21");

    const [urlEtiquetas, etiquetas] = fetchMock.mock.calls[1];
    expect(urlEtiquetas).toBe(
      `https://us21.api.mailchimp.com/3.0/lists/lista01/members/${hash}/tags`,
    );
    expect(JSON.parse(etiquetas.body)).toEqual({
      tags: [{ name: "origen:unete", status: "active" }],
    });

    // Ambas llamadas llevan timeout
    expect(miembro.signal).toBeInstanceOf(AbortSignal);
    expect(etiquetas.signal).toBeInstanceOf(AbortSignal);
  });

  it.each(["Member Exists", "Forgotten Email Not Subscribed"])(
    "«%s» resuelve igual, sin etiquetar ni modificar al miembro",
    async (titulo) => {
      fetchMock.mockResolvedValueOnce(respuesta(400, titulo));
      await expect(suscribir(datos)).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    },
  );

  it("otro 400 se propaga como ErrorProveedor", async () => {
    fetchMock.mockResolvedValueOnce(respuesta(400, "Invalid Resource"));
    const error = await suscribir(datos).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorProveedor);
    expect(error.estado).toBe(400);
    expect(error.message).not.toContain("ana@ejemplo.org");
  });

  it("un 400 con cuerpo ilegible se propaga como ErrorProveedor", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => {
        throw new SyntaxError("json");
      },
    } as unknown as Response);
    await expect(suscribir(datos)).rejects.toBeInstanceOf(ErrorProveedor);
  });

  it("no manda campos vacíos", async () => {
    fetchMock.mockResolvedValue(respuesta());
    await suscribir({ correo: "ana@ejemplo.org", origen: "footer" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).merge_fields).toEqual({});
  });

  it("sin claves configuradas lanza SuscripcionNoConfigurada y no llama a nadie", async () => {
    vi.stubEnv("MAILCHIMP_API_KEY", "");
    await expect(suscribir(datos)).rejects.toBeInstanceOf(SuscripcionNoConfigurada);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("una clave sin centro de datos cuenta como no configurada", async () => {
    vi.stubEnv("MAILCHIMP_API_KEY", "abc123");
    await expect(suscribir(datos)).rejects.toBeInstanceOf(SuscripcionNoConfigurada);
  });

  it("si falla el etiquetado no lanza: el alta ya ocurrió, y no registra el correo", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(respuesta(201)).mockResolvedValueOnce(respuesta(500));
    await expect(suscribir(datos)).resolves.toBeUndefined();
    expect(JSON.stringify(consola.mock.calls)).not.toContain("ana@ejemplo.org");
    consola.mockRestore();
  });

  it("falta MAILCHIMP_AUDIENCE_ID (con clave presente) lanza SuscripcionNoConfigurada y no llama a fetch", async () => {
    vi.stubEnv("MAILCHIMP_AUDIENCE_ID", "");
    await expect(suscribir(datos)).rejects.toBeInstanceOf(SuscripcionNoConfigurada);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetch rechaza con TypeError convierte a ErrorProveedor con estado 502", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const error = await suscribir(datos).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorProveedor);
    expect(error.estado).toBe(502);
    expect(error.message).not.toContain("ana@ejemplo.org");
  });

  it("fetch rechaza con TimeoutError convierte a ErrorProveedor con estado 504", async () => {
    const timeoutError = new DOMException("Timeout", "TimeoutError");
    fetchMock.mockRejectedValue(timeoutError);
    const error = await suscribir(datos).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorProveedor);
    expect(error.estado).toBe(504);
    expect(error.message).not.toContain("ana@ejemplo.org");
  });
});
