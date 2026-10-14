import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({
  fetchPosts: vi.fn(),
  fetchPostBySlug: vi.fn(),
  fetchPodcasts: vi.fn(),
}));

const { fetchPosts, fetchPostBySlug, fetchPodcasts } = await import("./client");
const { registerApiRoutes } = await import("./routes");

let servidor: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  registerApiRoutes(app);
  await new Promise<void>((listo) => {
    servidor = app.listen(0, listo);
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(() => servidor.close());

beforeEach(() => {
  vi.mocked(fetchPosts).mockReset();
  vi.mocked(fetchPostBySlug).mockReset();
  vi.mocked(fetchPodcasts).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function pedir(ruta: string) {
  const r = await fetch(`${base}${ruta}`);
  return { estado: r.status, cuerpo: await r.json() };
}

/**
 * Los textos de error de `/api/posts*` están en inglés y son parte del contrato
 * congelado (docs/api/endpoints.md, deuda técnica 2.2): ninguna pantalla los
 * muestra, el cliente se guía por el status, pero la API es pública y cambiarlos
 * rompería a quien compare la cadena. Estos tests los fijan a propósito.
 */
describe("contrato de errores de /api/posts*", () => {
  it("CA-1: si WordPress falla, /api/posts responde 500 con el texto congelado", async () => {
    vi.mocked(fetchPosts).mockRejectedValue(new Error("WordPress caído"));
    expect(await pedir("/api/posts")).toEqual({
      estado: 500,
      cuerpo: { error: "Failed to fetch posts" },
    });
  });

  it("CA-2: un slug inexistente responde 404 con el texto congelado", async () => {
    vi.mocked(fetchPostBySlug).mockResolvedValue(null);
    expect(await pedir("/api/posts/no-existe")).toEqual({
      estado: 404,
      cuerpo: { error: "Post not found" },
    });
  });

  it("CA-3: si WordPress falla, /api/posts/:slug responde 500 con el texto congelado", async () => {
    vi.mocked(fetchPostBySlug).mockRejectedValue(new Error("WordPress caído"));
    expect(await pedir("/api/posts/cualquiera")).toEqual({
      estado: 500,
      cuerpo: { error: "Failed to fetch post" },
    });
  });

  it("CA-3: si WordPress falla, /api/podcasts responde 500 con el texto congelado", async () => {
    vi.mocked(fetchPodcasts).mockRejectedValue(new Error("WordPress caído"));
    expect(await pedir("/api/podcasts")).toEqual({
      estado: 500,
      cuerpo: { error: "Failed to fetch podcasts" },
    });
  });

  it("un fallo de WordPress nunca se degrada a lista vacía (ADR-0002)", async () => {
    vi.mocked(fetchPosts).mockRejectedValue(new Error("WordPress caído"));
    const { estado, cuerpo } = await pedir("/api/posts");
    expect(estado).toBe(500);
    expect(Array.isArray(cuerpo)).toBe(false);
  });

  it("el error de WordPress se registra en consola y no llega a la respuesta", async () => {
    vi.mocked(fetchPosts).mockRejectedValue(new Error("secreto interno"));
    const { cuerpo } = await pedir("/api/posts");
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(cuerpo)).not.toContain("secreto interno");
  });
});
