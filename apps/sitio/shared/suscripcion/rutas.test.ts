import express from "express";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./mailchimp", async (original) => ({
  ...(await original<typeof import("./mailchimp")>()),
  suscribir: vi.fn(),
}));

const { suscribir, SuscripcionNoConfigurada, ErrorProveedor } =
  await import("./mailchimp");
const { registrarRutasSuscripcion } = await import("./rutas");

let servidor: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  registrarRutasSuscripcion(app);
  await new Promise<void>((listo) => {
    servidor = app.listen(0, listo);
  });
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(() => servidor.close());

beforeEach(() => {
  vi.mocked(suscribir).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function enviar(cuerpo: unknown) {
  const r = await fetch(`${base}/api/suscripcion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  return { estado: r.status, cuerpo: await r.json() };
}

const valida = { correo: "ana@ejemplo.org", consentimiento: true, origen: "footer" };

describe("POST /api/suscripcion", () => {
  it("da de alta y responde ok", async () => {
    vi.mocked(suscribir).mockResolvedValue();
    expect(await enviar(valida)).toEqual({ estado: 200, cuerpo: { ok: true } });
    expect(suscribir).toHaveBeenCalledWith({
      correo: "ana@ejemplo.org",
      origen: "footer",
    });
  });

  it("devuelve los errores de validación sin llamar al proveedor", async () => {
    const r = await enviar({ ...valida, correo: "no-es-correo" });
    expect(r.estado).toBe(400);
    expect(r.cuerpo.errores.correo).toBeTruthy();
    expect(suscribir).not.toHaveBeenCalled();
  });

  it("a un bot le responde lo mismo que a una persona y no lo registra", async () => {
    const r = await enviar({ ...valida, sitioWeb: "https://spam.example" });
    expect(r).toEqual({ estado: 200, cuerpo: { ok: true } });
    expect(suscribir).not.toHaveBeenCalled();
  });

  it("exige JSON: un formulario HTML entre sitios recibe 415 y no llega al proveedor", async () => {
    const r = await fetch(`${base}/api/suscripcion`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "correo=ana%40ejemplo.org&consentimiento=true&origen=footer",
    });
    expect(r.status).toBe(415);
    expect(await r.json()).toEqual({ ok: false, error: "tipo_no_admitido" });
    expect(suscribir).not.toHaveBeenCalled();
  });

  it("sin configuración responde 503, nunca un éxito falso", async () => {
    vi.mocked(suscribir).mockRejectedValue(new SuscripcionNoConfigurada());
    expect(await enviar(valida)).toEqual({
      estado: 503,
      cuerpo: { ok: false, error: "no_configurada" },
    });
  });

  it("un fallo del proveedor sale como 502 sin datos personales en el log", async () => {
    vi.mocked(suscribir).mockRejectedValue(
      new ErrorProveedor(500, "registrar el miembro"),
    );
    expect(await enviar(valida)).toEqual({
      estado: 502,
      cuerpo: { ok: false, error: "proveedor" },
    });
    const logs = vi.mocked(console.error).mock.calls.flat().map(String).join(" ");
    expect(logs).not.toContain("ana@ejemplo.org");
  });
});

describe("montaje", () => {
  it("lo registran tanto el servidor como la función de Vercel", () => {
    // api/ y server/ divergieron una vez; por eso existe shared/. Este test
    // impide que el formulario funcione en local y falle en producción.
    const raiz = resolve(import.meta.dirname, "..", "..");
    for (const archivo of ["server/index.ts", "api/index.ts"]) {
      const codigo = readFileSync(resolve(raiz, archivo), "utf8");
      expect(codigo, archivo).toContain("registrarRutasSuscripcion(app)");
    }
  });
});
