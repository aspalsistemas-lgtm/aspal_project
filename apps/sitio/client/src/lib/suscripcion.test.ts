import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enviarSuscripcion } from "./suscripcion";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const respuesta = (status: number, cuerpo: unknown) =>
  ({ ok: status < 400, status, json: async () => cuerpo }) as Response;

describe("enviarSuscripcion", () => {
  it("envía JSON a /api/suscripcion y reporta éxito", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { ok: true }));
    expect(await enviarSuscripcion({ correo: "a@b.co" })).toEqual({ estado: "exito" });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/suscripcion");
    expect(opciones.method).toBe("POST");
    expect(JSON.parse(opciones.body)).toEqual({ correo: "a@b.co" });
  });

  it("devuelve los errores de campo del servidor", async () => {
    fetchMock.mockResolvedValue(
      respuesta(400, { ok: false, errores: { correo: "Mal" } }),
    );
    expect(await enviarSuscripcion({})).toEqual({
      estado: "invalido",
      errores: { correo: "Mal" },
    });
  });

  it("trata 503 y 502 como error, nunca como éxito", async () => {
    for (const status of [502, 503, 500]) {
      fetchMock.mockResolvedValueOnce(respuesta(status, { ok: false }));
      expect(await enviarSuscripcion({}), String(status)).toEqual({ estado: "error" });
    }
  });

  it("sobrevive a la red caída y a un cuerpo que no es JSON", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await enviarSuscripcion({})).toEqual({ estado: "error" });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => {
        throw new SyntaxError("x");
      },
    } as unknown as Response);
    expect(await enviarSuscripcion({})).toEqual({ estado: "invalido", errores: {} });
  });

  it("lleva un tiempo máximo y trata su vencimiento como error", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"));
    expect(await enviarSuscripcion({})).toEqual({ estado: "error" });
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
